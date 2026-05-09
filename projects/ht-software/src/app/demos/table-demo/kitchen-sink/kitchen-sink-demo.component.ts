import {
  Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, Injector,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import {
  HtQuickAngularTableComponent,
  HtQuickAngularTableService,
  HtTableChartComponent,
  HtTableInsightsComponent,
  HtTableAgentComponent,
  HtSkillMenuComponent,
  HtExcelInputComponent,
  HtApiInputComponent,
  HtDatabaseInputComponent,
  HtTableBuilderService,
  HtTableAgentService,
  SkillRegistryService,
  TableSettings,
  DynamicMatTableFilter,
  DynamicMatTableFilterOptions,
  DynamicMatTablePaginator,
  DynamicMatTableSelection,
  DynamicMatTableActionSettings,
  DynamicMatTableActionOptions,
  DynamicMatTableMenuAction,
  DynamicMatTableDataInteractionSettings,
  DynamicMatTableDataAddSettings,
  DynamicMatTableDataAddOptions,
  DynamicMatTableAddByNewItem,
  DynamicMatTableDeleteSettings,
  DynamicMatTableDataDeleteOptions,
  DynamicMatTableSaveSettings,
  DynamicMatTableSaveOptions,
  SaveDataFnElements,
  NewDataItemFnAnon,
  DynamicMatTableButton,
  ButtonColor,
  ColumnDataType,
} from 'ht-quick-angular-table';
import type {
  DynamicBasicColumn, DynamicObjectColumn, DynamicHyperlinkColumn, Icon,
  ChartConfig, InsightsConfig, Skill, AgentConfig, AgentRunResult, AgentBackendRunResponse,
  ExcelUploadConfig, ApiPullConfig, DatabaseConfig,
} from 'ht-quick-angular-table';
import { CodeSnippetComponent } from '../../../shared/code-snippet.component';
import { SAMPLE_PRODUCTS, Product } from '../shared/sample-data';

type AgentLogEntry = { type: 'success' | 'error'; message: string };

@Component({
  selector: 'app-kitchen-sink-demo',
  standalone: true,
  imports: [
    RouterLink, FormsModule,
    HtQuickAngularTableComponent, HtTableChartComponent, HtTableInsightsComponent,
    HtTableAgentComponent, HtSkillMenuComponent, HtExcelInputComponent,
    HtApiInputComponent, HtDatabaseInputComponent,
    CodeSnippetComponent,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatChipsModule, MatSelectModule, MatTabsModule, MatDividerModule, MatSnackBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kitchen-sink-demo.component.html',
  styleUrl: './kitchen-sink-demo.component.scss',
})
export class KitchenSinkDemoComponent implements OnInit, OnDestroy {
  private readonly tableService = inject(HtQuickAngularTableService);
  private readonly skillRegistry = inject(SkillRegistryService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly injector = inject(Injector);
  private builderService: HtTableBuilderService | null = null;
  private agentService: HtTableAgentService<Product> | null = null;

  readonly selectionModel = new SelectionModel<Product>(true, []);
  readonly products = signal<Product[]>([...SAMPLE_PRODUCTS]);
  private currentSettings: TableSettings | null = null;

  // ----- Chart state -----
  readonly barChart: ChartConfig = { type: 'bar',  xColumn: 'name', yColumns: ['quantity'],       label: 'Stock by product' };
  readonly lineChart: ChartConfig = { type: 'line', xColumn: 'name', yColumns: ['price'],          label: 'Price by product' };
  readonly pieChart: ChartConfig = { type: 'pie',  xColumn: 'category', yColumns: ['quantity'],   label: 'Stock by category (pie)' };

  // ----- Insights state -----
  readonly insightsConfig: InsightsConfig = {
    statisticColumns: ['price', 'quantity'],
    enableAiSummary: true,
  };

  // ----- Skills state -----
  readonly selectedSkill = signal<Skill | null>(null);
  readonly skillResultMessage = signal<string>('');

  // ----- Builder state -----
  builderPrompt = '';
  readonly builderLoading = signal(false);
  readonly builderError = signal('');
  readonly builderResultJson = signal('');
  refinePrompt = '';

  // ----- Agent state -----
  readonly agentRunning = signal(false);
  readonly agentResult = signal<AgentRunResult | null>(null);
  readonly agentLog = signal<AgentLogEntry[]>([]);
  readonly agentRunMode = signal<'on-demand' | 'scheduled'>('on-demand');
  readonly backendAgentError = signal('');

  ngOnInit(): void {
    this._setupTable();
    this._registerSkills();
    this._initBackendServices();
    this._setupAgent();
  }

  ngOnDestroy(): void {
    this.agentService?.stop();
  }

  // ---------------------------------------------------------------------------
  // Table setup — exercises: all renderable column types, selection, actions,
  // add / delete / save, simple filter, paginator with pageSizeOptions.
  // ---------------------------------------------------------------------------

  private _setupTable(): void {
    const basicCols: DynamicBasicColumn[] = [
      { columnHeader: 'Name',         columnDataName: 'name',        columnDataType: ColumnDataType.String,     sortable: true,  filterable: true,  editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'Category',     columnDataName: 'category',    columnDataType: ColumnDataType.String,     sortable: true,  filterable: true,  editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'Price ($)',    columnDataName: 'price',       columnDataType: ColumnDataType.Number,     sortable: true,  filterable: false, editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'Quantity',     columnDataName: 'quantity',    columnDataType: ColumnDataType.Number,     sortable: true,  filterable: false, editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'In Stock',     columnDataName: 'inStock',     columnDataType: ColumnDataType.Boolean,    sortable: false, filterable: false, editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'Last Updated', columnDataName: 'lastUpdated', columnDataType: ColumnDataType.DateString, sortable: true,  filterable: false, editable: false, allowMassUpdate: false, isLink: false },
    ];

    const supplierCol: DynamicObjectColumn = {
      columnHeader: 'Supplier',
      columnDataName: 'supplier',
      columnDataType: ColumnDataType.Object,
      sortable: false,
      filterable: false,
      editable: false,
      allowMassUpdate: false,
      isLink: false,
      objectValueToDisplay: (row: Product) => `${row.supplier.firstName} ${row.supplier.lastName} (${row.supplier.company})`,
    };

    const docsCol: DynamicHyperlinkColumn = {
      columnHeader: 'Docs',
      columnDataName: 'docUrl',
      columnDataType: ColumnDataType.Hyperlink,
      sortable: false,
      filterable: false,
      editable: false,
      allowMassUpdate: false,
      isLink: true,
      url: (row: Product) => `https://example.com/docs/${row.docUrl}`,
    };

    const columns = [...basicCols, supplierCol, docsCol];

    const editIcon: Icon = { name: 'edit',   color: ButtonColor.Primary };
    const deleteIcon: Icon = { name: 'delete', color: ButtonColor.Warn };
    const menuAction = new DynamicMatTableMenuAction([editIcon, deleteIcon], 'primary');
    const actionOptions = new DynamicMatTableActionOptions(menuAction, columns.length, 'Actions');
    const actionSettings = new DynamicMatTableActionSettings(true, actionOptions);

    const addFn = new NewDataItemFnAnon(() => ({
      id: Math.max(...this.products().map((p) => p.id), 0) + 1,
      name: `New Product ${this.products().length + 1}`,
      category: 'Uncategorized',
      price: 0,
      quantity: 0,
      inStock: false,
      lastUpdated: new Date().toISOString().slice(0, 10),
      supplier: { firstName: 'TBD', lastName: 'TBD', company: 'TBD' },
      docUrl: 'new-product',
      description: 'New product row added from the kitchen sink demo.',
    }));
    const addOptions = new DynamicMatTableDataAddOptions(
      'event',
      new DynamicMatTableAddByNewItem('function', addFn),
      new DynamicMatTableButton('Add row', ButtonColor.Primary),
    );

    const deleteOptions = new DynamicMatTableDataDeleteOptions(
      'event',
      new DynamicMatTableButton('Delete selected', ButtonColor.Warn),
    );

    const saveOptions = new DynamicMatTableSaveOptions(
      'subscription',
      new SaveDataFnElements((rows: unknown[]) => {
        this.snackBar.open(`Saved ${rows.length} row(s) (mock).`, 'OK', { duration: 2000 });
        return { success: true, saved: rows.length };
      }),
      new DynamicMatTableButton('Save', ButtonColor.Primary),
    );

    const settings = new TableSettings(
      columns,
      new DynamicMatTableFilter(true, new DynamicMatTableFilterOptions('simple')),
      new DynamicMatTablePaginator(true, { pageSize: 5, pageSizeOptions: [5, 10, 25] }),
      new DynamicMatTableSelection(true, this.selectionModel),
      actionSettings,
      'kitchenSinkProducts',
      new DynamicMatTableDataInteractionSettings(
        new DynamicMatTableDataAddSettings(true, addOptions),
        new DynamicMatTableDeleteSettings(true, deleteOptions),
        new DynamicMatTableSaveSettings(true, saveOptions),
      ),
      false,
      'No products found.',
    );

    this.currentSettings = settings;
    this.tableService.setTableSettings(settings);
    this.tableService.setTableData(this.products());

    this.tableService.rowSelected$.subscribe((sel) => {
      this.snackBar.open(`Selection: ${sel.selected.length} row(s) selected`, 'OK', { duration: 1000 });
    });
  }

  // ---------------------------------------------------------------------------
  // Skills — register the 3 built-in data-ingestion skills. The menu is
  // already shown inside the table, but this page renders the selected skill's
  // input component below so you can interact with each one.
  // ---------------------------------------------------------------------------

  private _registerSkills(): void {
    const excel: Skill = {
      id: 'excel-upload', name: 'Excel Upload', icon: 'upload_file',
      configSchema: { type: 'excel-upload', maxFileSizeMb: 25, allowedFormats: ['.xlsx', '.xls', '.csv'] } as ExcelUploadConfig,
    };
    const api: Skill = {
      id: 'api-pull', name: 'API Pull', icon: 'cloud_download',
      configSchema: { type: 'api-pull', url: '', method: 'GET' } as ApiPullConfig,
    };
    const database: Skill = {
      id: 'database', name: 'Database Query', icon: 'storage',
      configSchema: { type: 'database', dbType: 'postgresql', connectionString: '', query: '', rowLimit: 1000, timeoutSeconds: 30 } as DatabaseConfig,
    };
    this.skillRegistry.registerSkill(excel);
    this.skillRegistry.registerSkill(api);
    this.skillRegistry.registerSkill(database);
  }

  onSkillSelected(skill: Skill): void {
    this.selectedSkill.set(skill);
    this.skillResultMessage.set('');
  }

  onExcelFileSelected(file: File): void {
    this.skillResultMessage.set(`Mock parse of "${file.name}" returned 4 rows across 5 columns.`);
  }
  onApiConfigSubmitted(config: ApiPullConfig): void {
    this.skillResultMessage.set(`Mock ${config.method} ${config.url} returned 4 rows.`);
  }
  onDatabaseConfigSubmitted(config: DatabaseConfig): void {
    this.skillResultMessage.set(`Mock ${config.dbType} query returned 4 rows (limit ${config.rowLimit}).`);
  }

  // ---------------------------------------------------------------------------
  // Builder — describe + refine flows. Backend is mocked.
  // ---------------------------------------------------------------------------

  private _initBackendServices(): void {
    this.builderService = this.injector.get(HtTableBuilderService, null);
    this.agentService = this.injector.get(HtTableAgentService, null) as HtTableAgentService<Product> | null;
  }

  async runBuilder(): Promise<void> {
    if (!this.builderPrompt.trim() || !this.builderService) return;
    this.builderLoading.set(true);
    this.builderError.set('');
    this.builderResultJson.set('');
    try {
      const result = await this.builderService.describe(this.builderPrompt);
      if (result.tableSettings) {
        this.builderResultJson.set(JSON.stringify(this._serializeSettings(result.tableSettings), null, 2));
      } else if (result.clarification) {
        this.builderResultJson.set(result.clarification);
      }
    } catch (err) {
      this.builderError.set(err instanceof Error ? err.message : 'Builder failed');
    } finally {
      this.builderLoading.set(false);
    }
  }

  async refineBuilder(): Promise<void> {
    if (!this.refinePrompt.trim() || !this.builderService || !this.currentSettings) return;
    this.builderLoading.set(true);
    this.builderError.set('');
    try {
      const result = await this.builderService.refine(this.refinePrompt, this.currentSettings);
      if (result.tableSettings) {
        this.builderResultJson.set(JSON.stringify(this._serializeSettings(result.tableSettings), null, 2));
      } else if (result.clarification) {
        this.builderResultJson.set(result.clarification);
      }
    } catch (err) {
      this.builderError.set(err instanceof Error ? err.message : 'Refine failed');
    } finally {
      this.builderLoading.set(false);
    }
  }

  private _serializeSettings(s: TableSettings): unknown {
    return {
      tableName: s.tableName,
      columns: s.tableColumns.map((c) => ({ header: c.columnHeader(), name: c.columnDataName(), type: c.columnDataType() })),
      filter: { showFilter: s.showFilter, filterType: s.filterType },
      paginator: { showPagination: s.showPagination, pageSize: s.paginatorSettings?.pageSize() },
    };
  }

  // ---------------------------------------------------------------------------
  // Agent — on-demand and scheduled modes against local product data.
  // ---------------------------------------------------------------------------

  private _setupAgent(): void {
    if (!this.agentService) return;
    const config: AgentConfig<Product> = {
      actions: [
        { name: 'flagOutOfStock',  handler: async ({ row }) => ({ flagged: row!.name, reason: 'Out of stock' }) },
        { name: 'logRestockAlert', handler: async ({ row }) => ({ alert: `Restock ${row!.name} (${row!.category})` }) },
        { name: 'reportTotal',     handler: async ({ rows }) => ({ total: rows.reduce((a: number, r: Product) => a + r.quantity, 0) }) },
      ],
      triggers: [
        { actionName: 'flagOutOfStock', scope: 'row', condition: (row: Product) => row.quantity === 0,
          next: { actionName: 'logRestockAlert', condition: () => true } },
        { actionName: 'reportTotal',    scope: 'table', condition: (rows: Product[]) => rows.length > 0 },
      ],
      runMode: 'on-demand',
      timeoutMs: 5000,
    };

    this.agentService.configure(config);
    this.agentService.connectDataSource(() => this.products());

    this.agentService.actionCompleted$.subscribe((e) => {
      this.agentLog.update((log) => [...log, { type: 'success', message: `[${e.actionName}] ${JSON.stringify(e.result)}` }]);
    });
    this.agentService.actionFailed$.subscribe((e) => {
      this.agentLog.update((log) => [...log, { type: 'error', message: `[${e.actionName}] ${e.reason}` }]);
    });
  }

  async runAgent(): Promise<void> {
    if (!this.agentService) return;
    this.agentRunning.set(true);
    this.agentLog.set([]);
    this.agentResult.set(null);
    try {
      this.agentResult.set(await this.agentService.run());
    } finally {
      this.agentRunning.set(false);
    }
  }

  toggleScheduledAgent(): void {
    if (!this.agentService) return;
    if (this.agentRunMode() === 'on-demand') {
      this.agentService.configure({
        actions: [{ name: 'reportTotal', handler: async ({ rows }) => ({ total: rows.length }) }],
        triggers: [{ actionName: 'reportTotal', scope: 'table', condition: () => true }],
        runMode: 'scheduled',
        scheduleIntervalMs: 3000,
      });
      this.agentService.connectDataSource(() => this.products());
      this.agentRunMode.set('scheduled');
      this.snackBar.open('Scheduled agent started (runs every 3s)', 'OK', { duration: 2000 });
    } else {
      this.agentService.stop();
      this._setupAgent();
      this.agentRunMode.set('on-demand');
      this.snackBar.open('Scheduled agent stopped', 'OK', { duration: 2000 });
    }
  }

  onBackendAgentCompleted(_response: AgentBackendRunResponse): void { this.backendAgentError.set(''); }
  onBackendAgentFailed(err: string): void { this.backendAgentError.set(err); }

  // ---------------------------------------------------------------------------
  // Code snippets for the page — kept brief (one per section).
  // ---------------------------------------------------------------------------

  readonly tableCode = `// Multi-type columns + selection + actions + add/delete/save
const columns = [...basicCols, supplierObjectCol, docsHyperlinkCol];
const menuAction = new DynamicMatTableMenuAction(
  [{ name: 'edit', color: ButtonColor.Primary }, { name: 'delete', color: ButtonColor.Warn }],
  'primary',
);
const settings = new TableSettings(
  columns,
  new DynamicMatTableFilter(true, new DynamicMatTableFilterOptions('simple')),
  new DynamicMatTablePaginator(true, { pageSize: 5, pageSizeOptions: [5, 10, 25] }),
  new DynamicMatTableSelection(true, new SelectionModel(true, [])),
  new DynamicMatTableActionSettings(true, new DynamicMatTableActionOptions(menuAction, columns.length, 'Actions')),
  'kitchenSinkProducts',
  new DynamicMatTableDataInteractionSettings(
    new DynamicMatTableDataAddSettings(true, addOptions),
    new DynamicMatTableDeleteSettings(true, deleteOptions),
    new DynamicMatTableSaveSettings(true, saveOptions),
  ),
  false,
  'No products found.',
);
tableService.setTableSettings(settings);
tableService.setTableData(products);`;

  readonly chartCode = `<ht-table-chart [config]="{ type: 'bar',  xColumn: 'name', yColumns: ['quantity'] }" [data]="products" />
<ht-table-chart [config]="{ type: 'line', xColumn: 'name', yColumns: ['price']    }" [data]="products" />
<ht-table-chart [config]="{ type: 'pie',  xColumn: 'category', yColumns: ['quantity'] }" [data]="products" />`;

  readonly insightsCode = `// Computes count/sum/avg/min/max for numeric columns.
// With enableAiSummary, ht-backend is called for a narrative summary.
<ht-table-insights
  [config]="{ statisticColumns: ['price', 'quantity'], enableAiSummary: true }"
  [data]="products" />`;

  readonly skillsCode = `// Register the built-in skills once. The <ht-skill-menu> dropdown appears
// inside the table toolbar. This page also renders the selected skill's
// input component standalone.
skillRegistry.registerSkill({ id: 'excel-upload', name: 'Excel Upload', icon: 'upload_file',
  configSchema: { type: 'excel-upload', maxFileSizeMb: 25, allowedFormats: ['.xlsx', '.xls', '.csv'] } });
skillRegistry.registerSkill({ id: 'api-pull',    name: 'API Pull',    icon: 'cloud_download',
  configSchema: { type: 'api-pull',    url: '', method: 'GET' } });
skillRegistry.registerSkill({ id: 'database',    name: 'Database Query', icon: 'storage',
  configSchema: { type: 'database', dbType: 'postgresql', connectionString: '', query: '', rowLimit: 1000, timeoutSeconds: 30 } });`;

  readonly builderCode = `// 1. describe() - generate TableSettings from natural language
const result = await builder.describe('A table of employees with name, department, salary, and hire date');

// 2. refine() - iterate on an existing config
const refined = await builder.refine('Add an email column', existingSettings);`;

  readonly agentCode = `// on-demand agent with row + table triggers
agentService.configure({
  actions: [
    { name: 'flagOutOfStock',  handler: async ({ row })  => ({ flagged: row.name }) },
    { name: 'logRestockAlert', handler: async ({ row })  => ({ alert: row.name }) },
    { name: 'reportTotal',     handler: async ({ rows }) => ({ total: rows.length }) },
  ],
  triggers: [
    { actionName: 'flagOutOfStock', scope: 'row',   condition: r => r.quantity === 0,
      next: { actionName: 'logRestockAlert', condition: () => true } },
    { actionName: 'reportTotal',    scope: 'table', condition: r => r.length > 0 },
  ],
  runMode: 'on-demand',
});
agentService.connectDataSource(() => products());
await agentService.run();

// scheduled mode - runs every N ms
agentService.configure({ ..., runMode: 'scheduled', scheduleIntervalMs: 3000 });`;

  readonly backendAgentCode = `<ht-table-agent
  placeholder="Describe a task for the AI agent..."
  (taskCompleted)="onComplete($event)"
  (taskFailed)="onError($event)" />`;
}
