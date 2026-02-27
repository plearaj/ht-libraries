# Quickstart: ht-quick-angular-table v2

**Branch**: `002-quick-angular-table` | **Date**: 2026-02-27

---

## Prerequisites

- Angular 21 app
- No separate `@angular/material` install required — it is bundled in `ht-quick-angular-table`

---

## Step 1: Install

```bash
npm install ht-quick-angular-table
```

---

## Step 2: Register Providers (app.config.ts)

### Core table only (no AI features)

```typescript
import { provideHtQuickAngularTable } from 'ht-quick-angular-table';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHtQuickAngularTable()
  ]
};
```

### With AI features (Gemini built-in provider)

```typescript
import { provideHtQuickAngularTable, provideHtAi } from 'ht-quick-angular-table';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHtQuickAngularTable(),
    provideHtAi({ provider: 'gemini', apiKey: environment.geminiApiKey })
  ]
};
```

### With AI features (Claude built-in provider)

```typescript
provideHtAi({ provider: 'claude', apiKey: environment.claudeApiKey })
```

### With AI features (BYOM — custom adapter)

```typescript
import { AiModelAdapter } from 'ht-quick-angular-table';

class MyProxyAdapter implements AiModelAdapter {
  async generate(prompt: string): Promise<string> {
    const res = await fetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
      headers: { 'Content-Type': 'application/json' }
    });
    return (await res.json()).text as string;
  }
}

provideHtAi({ provider: 'custom', adapter: new MyProxyAdapter() })
```

---

## Step 3: Render a Table (User Story 1 — P1 MVP)

### In your component

```typescript
import { Component, inject, OnInit } from '@angular/core';
import {
  HtQuickAngularTableComponent,
  HtQuickAngularTableService,
  TableSettings,
  DynamicMatTableFilter,
  DynamicMatTablePaginator,
  DynamicMatTableSelection,
  DynamicMatTableActionSettings,
  DynamicMatTableDataInteractionSettings,
  DynamicMatTableDataAddSettings,
  DynamicMatTableDeleteSettings,
  DynamicMatTableSaveSettings
} from 'ht-quick-angular-table';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [HtQuickAngularTableComponent],
  template: `<ht-quick-angular-table />`
})
export class InventoryComponent implements OnInit {
  private tableService = inject(HtQuickAngularTableService);

  ngOnInit() {
    const settings = new TableSettings(
      [
        { columnHeader: 'Item',     columnDataName: 'name',     columnDataType: 'string',  sortable: true, filterable: true, editable: false, allowMassUpdate: false, isLink: false },
        { columnHeader: 'Quantity', columnDataName: 'quantity', columnDataType: 'number',  sortable: true, filterable: true, editable: false, allowMassUpdate: false, isLink: false },
        { columnHeader: 'Category', columnDataName: 'category', columnDataType: 'string',  sortable: true, filterable: true, editable: false, allowMassUpdate: false, isLink: false },
        { columnHeader: 'Last Order', columnDataName: 'lastOrder', columnDataType: 'date', sortable: true, filterable: false, editable: false, allowMassUpdate: false, isLink: false }
      ],
      new DynamicMatTableFilter(true, { filterType: 'simple', filterOnDataChange: false, keepFilters: false }),
      new DynamicMatTablePaginator(true, { pageSize: 10, pageSizeOptions: [5, 10, 25] }),
      new DynamicMatTableSelection(false),
      new DynamicMatTableActionSettings(false),
      'inventory-table',
      new DynamicMatTableDataInteractionSettings(
        new DynamicMatTableDataAddSettings(false),
        new DynamicMatTableDeleteSettings(false),
        new DynamicMatTableSaveSettings(false)
      ),
      false,
      'No inventory items found'
    );

    this.tableService.setTableSettings(settings);
    this.tableService.setTableData([
      { name: 'Widget A', quantity: 5,  category: 'Widgets', lastOrder: new Date('2026-01-15') },
      { name: 'Gadget B', quantity: 42, category: 'Gadgets', lastOrder: new Date('2026-02-01') },
      { name: 'Doohickey C', quantity: 3, category: 'Misc', lastOrder: new Date('2026-01-30') }
    ]);
  }
}
```

**Validation**: Table renders with sort arrows, a filter input, and pagination. Clicking column
headers sorts rows. Typing in the filter narrows results.

---

## Step 4: Add Charts and Insights (User Story 2 — P2)

```typescript
import {
  HtTableChartComponent,
  HtTableInsightsComponent,
  ChartConfig,
  InsightsConfig
} from 'ht-quick-angular-table';
import { signal } from '@angular/core';

@Component({
  standalone: true,
  imports: [HtQuickAngularTableComponent, HtTableChartComponent, HtTableInsightsComponent],
  template: `
    <ht-quick-angular-table />
    <ht-table-chart [config]="chartConfig" [data]="tableData()" />
    <ht-table-insights [config]="insightsConfig" [data]="tableData()" />
  `
})
export class InventoryDashboardComponent {
  tableData = signal([
    { name: 'Widget A', quantity: 5,  category: 'Widgets' },
    { name: 'Gadget B', quantity: 42, category: 'Gadgets' }
  ]);

  chartConfig: ChartConfig = {
    type: 'bar',
    xColumn: 'category',
    yColumns: ['quantity'],
    label: 'Stock by Category'
  };

  insightsConfig: InsightsConfig = {
    statisticColumns: ['quantity'],
    enableAiSummary: true   // requires provideHtAi() in app.config.ts
  };
}
```

**Validation**: Bar chart renders with correct bars per category. Insights panel shows
count/sum/avg/min/max for `quantity`. AI summary paragraph appears below statistics.

---

## Step 5: Generate a Table Config via Natural Language (User Story 3 — P3)

```typescript
import { HtTableBuilderService } from 'ht-quick-angular-table';
import { inject } from '@angular/core';

export class ConfigBuilderDemoComponent {
  private builder = inject(HtTableBuilderService);

  async generateConfig() {
    const result = await this.builder.describe(
      'I need a table showing product name, unit price, stock quantity, and supplier — ' +
      'sortable by price, 20 rows per page, with Edit and Delete actions on each row'
    );

    if (result.clarification) {
      // Agent needs more info — show result.clarification to the user and call describe() again
      console.log('Agent asks:', result.clarification);
      return;
    }

    // result.tableSettings is a ready-to-use TableSettings instance
    this.tableService.setTableSettings(result.tableSettings as TableSettings);
  }

  async refineConfig(currentSettings: TableSettings) {
    const result = await this.builder.refine('add a status column with badge styling', currentSettings);
    this.tableService.setTableSettings(result.tableSettings as TableSettings);
  }
}
```

**Validation**: The returned `result.tableSettings`, when passed to `setTableSettings`, renders
the described table without manual edits.

---

## Step 6: Set Up Autonomous Agent Actions (User Story 4 — P4)

```typescript
import {
  HtTableAgentService,
  AgentConfig,
  AgentAction,
  AgentTrigger
} from 'ht-quick-angular-table';
import { inject, signal } from '@angular/core';

interface InventoryItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export class InventoryAgentComponent {
  private agent = inject(HtTableAgentService<InventoryItem>);
  inventoryData = signal<InventoryItem[]>([...]);

  ngOnInit() {
    const actions: AgentAction<InventoryItem>[] = [
      {
        name: 'fetch-best-price',
        handler: async ({ row }) => {
          // Call your supplier API
          const price = await mySupplierApi.getBestPrice(row!.name);
          return { price, supplier: price.supplier };
        }
      },
      {
        name: 'place-order',
        handler: async ({ row, previousResult }) => {
          const { price, supplier } = previousResult as { price: number; supplier: string };
          return await mySupplierApi.placeOrder({ item: row!.name, supplier, qty: 10 });
        }
      }
    ];

    const triggers: AgentTrigger<InventoryItem>[] = [
      {
        scope: 'row',
        condition: (row) => row.quantity < 10,
        actionName: 'fetch-best-price',
        next: {
          condition: (result: any) => result.price <= 50,
          actionName: 'place-order'
        }
      },
      {
        scope: 'table',
        condition: (rows) => rows.reduce((sum, r) => sum + r.quantity, 0) < 50,
        actionName: 'fetch-best-price'
      }
    ];

    this.agent.configure({
      actions,
      triggers,
      runMode: 'scheduled',
      scheduleIntervalMs: 60 * 60 * 1000, // every hour
      timeoutMs: 30_000
    });

    this.agent.connectDataSource(() => this.inventoryData());

    // Subscribe to events
    this.agent.actionCompleted.subscribe(event => console.log('Done:', event));
    this.agent.actionFailed.subscribe(event => console.error('Failed:', event));
    this.agent.runCompleted.subscribe(result => console.log('Run complete:', result));
  }

  // Manual trigger (for on-demand mode)
  runNow() { this.agent.run(); }
}
```

**Validation checklist (from spec)**:

- [ ] Items with `quantity < 10`: `fetch-best-price` invoked; `actionCompleted` emitted
- [ ] If returned price ≤ 50: `place-order` invoked; second `actionCompleted` emitted
- [ ] Items with `quantity >= 10`: no actions invoked for those rows
- [ ] Table-level trigger: fires when total quantity < 50; invokes `fetch-best-price` once
- [ ] Scheduled runs fire every hour; `stop()` cancels the schedule
- [ ] Handler timeout (mock): `actionFailed` emitted with reason `'timeout'`
- [ ] Concurrent `run()` call: second call no-op; `warning` event emitted

---

## Validation Checklist (Full Library)

- [ ] **Step 3**: Table renders with sort, filter, pagination, empty-state message
- [ ] **Step 3**: Invalid `TableSettings` (no columns) throws descriptive error at init
- [ ] **Step 4**: Bar chart renders and updates within 500 ms of data change
- [ ] **Step 4**: Insights panel shows statistics; AI summary appears when `enableAiSummary: true`
- [ ] **Step 4**: `enableAiSummary: true` without `provideHtAi()` shows error message (no crash)
- [ ] **Step 5**: Builder returns valid config for 10-column table within 10 seconds
- [ ] **Step 5**: `refine()` applies only the described change
- [ ] **Step 6**: Agent `actionCompleted` / `actionFailed` / `runCompleted` all emit correctly
- [ ] **Step 6**: Second `run()` during active run emits `warning` and is ignored
- [ ] **`ng build ht-quick-angular-table`**: zero errors
- [ ] **`ng test ht-quick-angular-table`**: all tests pass
