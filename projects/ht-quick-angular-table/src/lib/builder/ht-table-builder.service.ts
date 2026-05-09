import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HtBackendService } from '../backend/ht-backend.service';
import { TableSettings } from '../model/table-settings.model';
import { DynamicMatTableFilter, DynamicMatTableFilterOptions } from '../model/dynamic-mat-table-filter.model';
import { DynamicMatTablePaginator } from '../model/paginator-settings.model';
import { DynamicMatTableSelection } from '../model/dynamic-mat-table-selection.model';
import { DynamicMatTableActionSettings } from '../model/dynamic-mat-table-action-settings.model';
import { DynamicMatTableDataInteractionSettings } from '../model/dynamic-mat-table-data-interaction-settings/dynamic-mat-table-data-interaction-settings.model';
import { DynamicMatTableDataAddSettings } from '../model/dynamic-mat-table-data-interaction-settings/dynamic-mat-table-add-settings/dynamic-mat-table-add-settings.model';
import { DynamicMatTableDeleteSettings } from '../model/dynamic-mat-table-data-interaction-settings/dynamic-mat-table-delete-settings/dyanamic-mat-table-delete-settings.model';
import { DynamicMatTableSaveSettings } from '../model/dynamic-mat-table-data-interaction-settings/dynamic-mat-table-save-settings/dynamic-mat-table-save-settings.model';
import { BuilderMessage, BuilderResult } from './builder.types';

interface BuilderTableJson {
  tableName?: string;
  noRecordMessage?: string;
  columns: Array<{
    columnHeader: string;
    columnDataName: string;
    columnDataType: string;
    sortable: boolean;
    filterable: boolean;
  }>;
  filter: { showFilter: boolean; filterType?: 'simple' | 'column' };
  paginator: { showPagination: boolean; pageSize?: number; pageSizeOptions?: number[] };
}

const MAX_USER_MESSAGE_LENGTH = 2000;
const MAX_COLUMNS = 50;
const MAX_TABLE_NAME_LENGTH = 128;
const MAX_HEADER_LENGTH = 256;
const ALLOWED_COLUMN_TYPES = new Set(['string', 'number', 'date', 'dateString', 'boolean']);
const ALLOWED_FILTER_TYPES = new Set(['simple', 'column']);

@Injectable({ providedIn: 'root' })
export class HtTableBuilderService {
  private readonly backendService = inject(HtBackendService);

  private readonly _sessionHistory = signal<BuilderMessage[]>([]);
  readonly sessionHistory = this._sessionHistory.asReadonly();

  reset(): void {
    this._sessionHistory.set([]);
  }

  async describe(userMessage: string): Promise<BuilderResult> {
    const sanitized = this._sanitizeUserInput(userMessage);
    this._sessionHistory.update(h => [...h, { role: 'user', content: sanitized }]);
    const response = await firstValueFrom(
      this.backendService.describeTable(sanitized, this._sessionHistory()),
    );
    return this._processBackendResponse(response);
  }

  async refine(userMessage: string, current: TableSettings): Promise<BuilderResult> {
    const sanitized = this._sanitizeUserInput(userMessage);
    const summary = this._serializeTableSettings(current);
    this._sessionHistory.update(h => [...h, { role: 'user', content: sanitized }]);
    const response = await firstValueFrom(
      this.backendService.refineTable(sanitized, summary as Record<string, unknown>, this._sessionHistory()),
    );
    return this._processBackendResponse(response);
  }

  private _processBackendResponse(response: { tableSettings?: Record<string, unknown>; clarification?: string }): BuilderResult {
    if (response.tableSettings) {
      const jsonStr = JSON.stringify(response.tableSettings);
      this._sessionHistory.update(h => [...h, { role: 'assistant', content: jsonStr }]);
      const tableSettings = this._tryParseResponse(jsonStr);
      if (tableSettings !== null) {
        return { tableSettings };
      }
    }
    const clarification = response.clarification ?? 'Unable to parse table configuration from backend response.';
    this._sessionHistory.update(h => [...h, { role: 'assistant', content: clarification }]);
    return { clarification };
  }

  private _sanitizeUserInput(message: string): string {
    if (typeof message !== 'string') {
      throw new Error('[ht-quick-angular-table] User message must be a string.');
    }
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      throw new Error('[ht-quick-angular-table] User message must not be empty.');
    }
    if (trimmed.length > MAX_USER_MESSAGE_LENGTH) {
      throw new Error(`[ht-quick-angular-table] User message exceeds maximum length of ${MAX_USER_MESSAGE_LENGTH} characters.`);
    }
    return trimmed;
  }

  private _tryParseResponse(response: string): TableSettings | null {
    const codeBlock = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = (codeBlock ? codeBlock[1] : response).trim();
    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
      const json = parsed as BuilderTableJson;
      return this._buildTableSettings(json);
    } catch {
      return null;
    }
  }

  private _validateBuilderJson(json: BuilderTableJson): void {
    if (!Array.isArray(json.columns) || json.columns.length === 0) {
      throw new Error('AI response must include at least one column.');
    }
    if (json.columns.length > MAX_COLUMNS) {
      throw new Error(`AI response contains ${json.columns.length} columns (max ${MAX_COLUMNS}).`);
    }
    if (json.tableName && json.tableName.length > MAX_TABLE_NAME_LENGTH) {
      throw new Error('AI response tableName exceeds maximum length.');
    }
    for (const col of json.columns) {
      if (!ALLOWED_COLUMN_TYPES.has(col.columnDataType)) {
        throw new Error(`Invalid columnDataType '${col.columnDataType}'. Allowed: ${[...ALLOWED_COLUMN_TYPES].join(', ')}`);
      }
      if (typeof col.columnHeader !== 'string' || col.columnHeader.length > MAX_HEADER_LENGTH) {
        throw new Error(`Column header must be a string of max ${MAX_HEADER_LENGTH} chars.`);
      }
      if (typeof col.columnDataName !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col.columnDataName)) {
        throw new Error(`Column data name '${col.columnDataName}' must be alphanumeric/underscore and start with a letter or underscore.`);
      }
    }
    if (json.filter && json.filter.filterType && !ALLOWED_FILTER_TYPES.has(json.filter.filterType)) {
      throw new Error(`Invalid filterType '${json.filter.filterType}'.`);
    }
    if (json.paginator) {
      if (json.paginator.pageSize !== undefined && (json.paginator.pageSize < 1 || json.paginator.pageSize > 1000)) {
        throw new Error('pageSize must be between 1 and 1000.');
      }
      if (json.paginator.pageSizeOptions && json.paginator.pageSizeOptions.length > 10) {
        throw new Error('pageSizeOptions must have at most 10 entries.');
      }
    }
  }

  private _buildTableSettings(json: BuilderTableJson): TableSettings {
    this._validateBuilderJson(json);

    const columns = json.columns.map(col => ({
      columnHeader: col.columnHeader,
      columnDataName: col.columnDataName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      columnDataType: col.columnDataType as any,
      sortable: col.sortable,
      filterable: col.filterable,
      editable: false as const,
      allowMassUpdate: false,
      isLink: false as const,
    }));

    const filterSettings = json.filter.showFilter
      ? new DynamicMatTableFilter(true, new DynamicMatTableFilterOptions(json.filter.filterType ?? 'simple'))
      : new DynamicMatTableFilter(false);

    const paginatorSettings = json.paginator.showPagination
      ? new DynamicMatTablePaginator(true, {
          pageSize: json.paginator.pageSize ?? 10,
          pageSizeOptions: json.paginator.pageSizeOptions ?? [5, 10, 25],
        })
      : new DynamicMatTablePaginator(false);

    return new TableSettings(
      columns,
      filterSettings,
      paginatorSettings,
      new DynamicMatTableSelection(false),
      new DynamicMatTableActionSettings(false),
      json.tableName ?? 'table',
      new DynamicMatTableDataInteractionSettings(
        new DynamicMatTableDataAddSettings(false),
        new DynamicMatTableDeleteSettings(false),
        new DynamicMatTableSaveSettings(false),
      ),
      false,
      json.noRecordMessage ?? 'No records found.',
    );
  }

  private _serializeTableSettings(settings: TableSettings): object {
    return {
      tableName: settings.tableName,
      noRecordMessage: settings.noRecordMessage,
      columns: settings.tableColumns
        .filter(c => !['select', 'drag', 'action'].includes(c.columnDataType()))
        .map(c => ({
          columnHeader: c.columnHeader(),
          columnDataName: c.columnDataName(),
          columnDataType: c.columnDataType(),
          sortable: c.sortable,
          filterable: c.filterable(),
        })),
      filter: { showFilter: settings.showFilter, filterType: settings.filterType },
      paginator: {
        showPagination: settings.showPagination,
        pageSize: settings.paginatorSettings?.pageSize() ?? 10,
        pageSizeOptions: settings.paginatorSettings?.pageSizeOptions() ?? [5, 10, 25],
      },
    };
  }
}
