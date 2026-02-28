import { Injectable, inject, signal } from '@angular/core';
import { HT_AI_PROVIDER } from '../ai/ai-provider.token';
import { createAiAdapter } from '../ai/ai-adapter.factory';
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

const SYSTEM_PROMPT = `You are a table configuration assistant. Generate Angular Material table configurations as JSON.

When the user describes a table, respond with ONLY a valid JSON object matching this schema (no markdown, no explanation):
{
  "tableName": "string (camelCase identifier)",
  "noRecordMessage": "string (message shown when table is empty)",
  "columns": [
    {
      "columnHeader": "string (display label)",
      "columnDataName": "string (camelCase property key matching data objects)",
      "columnDataType": "string | number | date | dateString | boolean",
      "sortable": true | false,
      "filterable": true | false
    }
  ],
  "filter": { "showFilter": true | false, "filterType": "simple | column" },
  "paginator": { "showPagination": true | false, "pageSize": number, "pageSizeOptions": [number, ...] }
}

Rules:
- columnDataType must be exactly one of: "string", "number", "date", "dateString", "boolean"
- If you need clarification before generating the JSON, respond with a plain question (no JSON)
- Never include action, selection, or drag columns in the columns array
- pageSizeOptions must include pageSize as one of the values`;

@Injectable({ providedIn: 'root' })
export class HtTableBuilderService {
  private readonly aiProviderConfig = inject(HT_AI_PROVIDER, { optional: true });

  private readonly _sessionHistory = signal<BuilderMessage[]>([]);
  readonly sessionHistory = this._sessionHistory.asReadonly();

  reset(): void {
    this._sessionHistory.set([]);
  }

  async describe(userMessage: string): Promise<BuilderResult> {
    if (!this.aiProviderConfig) {
      throw new Error('[ht-quick-angular-table] HtTableBuilderService requires HT_AI_PROVIDER. Call provideHtAi() in your app providers.');
    }
    this._sessionHistory.update(h => [...h, { role: 'user', content: userMessage }]);
    return this._callWithRetry();
  }

  async refine(userMessage: string, current: TableSettings): Promise<BuilderResult> {
    if (!this.aiProviderConfig) {
      throw new Error('[ht-quick-angular-table] HtTableBuilderService requires HT_AI_PROVIDER. Call provideHtAi() in your app providers.');
    }
    const summary = this._serializeTableSettings(current);
    const contextMessage = `Current table configuration:\n${JSON.stringify(summary, null, 2)}\n\nUser refinement request: ${userMessage}`;
    this._sessionHistory.update(h => [...h, { role: 'user', content: contextMessage }]);
    return this._callWithRetry();
  }

  private async _callWithRetry(): Promise<BuilderResult> {
    const adapter = createAiAdapter(this.aiProviderConfig!);
    const fullPrompt = this._buildPrompt();
    let lastResponse = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      lastResponse = await adapter.generate(fullPrompt);
      const tableSettings = this._tryParseResponse(lastResponse);
      if (tableSettings !== null) {
        this._sessionHistory.update(h => [...h, { role: 'assistant', content: lastResponse }]);
        return { tableSettings };
      }
      // Only retry if the response looks like attempted JSON (to avoid wasting retries on questions)
      if (!lastResponse.trim().startsWith('{') && !lastResponse.includes('```')) break;
    }
    this._sessionHistory.update(h => [...h, { role: 'assistant', content: lastResponse }]);
    return { clarification: lastResponse };
  }

  private _buildPrompt(): string {
    const history = this._sessionHistory();
    const historyText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    return `${SYSTEM_PROMPT}\n\n${historyText}`;
  }

  private _tryParseResponse(response: string): TableSettings | null {
    const codeBlock = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = (codeBlock ? codeBlock[1] : response).trim();
    try {
      const json = JSON.parse(jsonStr) as BuilderTableJson;
      return this._buildTableSettings(json);
    } catch {
      return null;
    }
  }

  private _buildTableSettings(json: BuilderTableJson): TableSettings {
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
