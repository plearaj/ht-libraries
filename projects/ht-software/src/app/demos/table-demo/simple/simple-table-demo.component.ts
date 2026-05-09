import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  HtQuickAngularTableComponent,
  HtQuickAngularTableService,
  TableSettings,
  DynamicMatTableFilter,
  DynamicMatTableFilterOptions,
  DynamicMatTablePaginator,
  DynamicMatTableSelection,
  DynamicMatTableActionSettings,
  DynamicMatTableDataInteractionSettings,
  DynamicMatTableDataAddSettings,
  DynamicMatTableDeleteSettings,
  DynamicMatTableSaveSettings,
  ColumnDataType,
} from 'ht-quick-angular-table';
import type { DynamicBasicColumn } from 'ht-quick-angular-table';
import { CodeSnippetComponent } from '../../../shared/code-snippet.component';
import { SAMPLE_PRODUCTS } from '../shared/sample-data';

@Component({
  selector: 'app-simple-table-demo',
  standalone: true,
  imports: [RouterLink, HtQuickAngularTableComponent, CodeSnippetComponent, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './simple-table-demo.component.html',
  styleUrl: './simple-table-demo.component.scss',
})
export class SimpleTableDemoComponent implements OnInit {
  private readonly tableService = inject(HtQuickAngularTableService);

  ngOnInit(): void {
    const columns: DynamicBasicColumn[] = [
      { columnHeader: 'Name',     columnDataName: 'name',     columnDataType: ColumnDataType.String, sortable: true,  filterable: true,  editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'Category', columnDataName: 'category', columnDataType: ColumnDataType.String, sortable: true,  filterable: true,  editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'Price',    columnDataName: 'price',    columnDataType: ColumnDataType.Number, sortable: true,  filterable: false, editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'Quantity', columnDataName: 'quantity', columnDataType: ColumnDataType.Number, sortable: true,  filterable: false, editable: false, allowMassUpdate: false, isLink: false },
    ];

    const settings = new TableSettings(
      columns,
      new DynamicMatTableFilter(true, new DynamicMatTableFilterOptions('simple')),
      new DynamicMatTablePaginator(true, { pageSize: 5, pageSizeOptions: [5, 10] }),
      new DynamicMatTableSelection(false),
      new DynamicMatTableActionSettings(false),
      'simpleProducts',
      new DynamicMatTableDataInteractionSettings(
        new DynamicMatTableDataAddSettings(false),
        new DynamicMatTableDeleteSettings(false),
        new DynamicMatTableSaveSettings(false),
      ),
      false,
      'No products found.',
    );

    this.tableService.setTableSettings(settings);
    this.tableService.setTableData(SAMPLE_PRODUCTS);
  }

  readonly exampleCode = `import {
  HtQuickAngularTableComponent,
  HtQuickAngularTableService,
  TableSettings,
  DynamicMatTableFilter,
  DynamicMatTableFilterOptions,
  DynamicMatTablePaginator,
  DynamicMatTableSelection,
  DynamicMatTableActionSettings,
  DynamicMatTableDataInteractionSettings,
  DynamicMatTableDataAddSettings,
  DynamicMatTableDeleteSettings,
  DynamicMatTableSaveSettings,
  ColumnDataType,
} from 'ht-quick-angular-table';

@Component({
  selector: 'app-my-table',
  standalone: true,
  imports: [HtQuickAngularTableComponent],
  template: '<ht-quick-angular-table></ht-quick-angular-table>',
})
export class MyTableComponent implements OnInit {
  private readonly tableService = inject(HtQuickAngularTableService);

  ngOnInit(): void {
    const columns = [
      { columnHeader: 'Name',     columnDataName: 'name',     columnDataType: ColumnDataType.String, sortable: true,  filterable: true,  editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'Category', columnDataName: 'category', columnDataType: ColumnDataType.String, sortable: true,  filterable: true,  editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'Price',    columnDataName: 'price',    columnDataType: ColumnDataType.Number, sortable: true,  filterable: false, editable: false, allowMassUpdate: false, isLink: false },
      { columnHeader: 'Quantity', columnDataName: 'quantity', columnDataType: ColumnDataType.Number, sortable: true,  filterable: false, editable: false, allowMassUpdate: false, isLink: false },
    ];

    const settings = new TableSettings(
      columns,
      new DynamicMatTableFilter(true, new DynamicMatTableFilterOptions('simple')),
      new DynamicMatTablePaginator(true, { pageSize: 5, pageSizeOptions: [5, 10] }),
      new DynamicMatTableSelection(false),
      new DynamicMatTableActionSettings(false),
      'simpleProducts',
      new DynamicMatTableDataInteractionSettings(
        new DynamicMatTableDataAddSettings(false),
        new DynamicMatTableDeleteSettings(false),
        new DynamicMatTableSaveSettings(false),
      ),
      false,
      'No products found.',
    );

    this.tableService.setTableSettings(settings);
    this.tableService.setTableData(myProductArray);
  }
}`;
}
