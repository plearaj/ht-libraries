import { Component, computed, inject, OnDestroy, OnInit, AfterViewInit, output, signal, Signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatToolbar } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SelectionModel } from '@angular/cdk/collections';
import { TableSettings } from './model/table-settings.model';
import { DynamicMatTableColumn } from './model/dynamic-mat-table-columns/dynamic-mat-table-column.model';
import { PaginatorSettings } from './model/paginator-settings.model';
import { HtQuickAngularTableService } from './ht-quick-angular-table.service';
import { Router, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Icon, ButtonColor } from './model/dynamic-mat-table-button.model';
import { HtSkillMenuComponent } from './skills/skill-menu.component';

@Component({
  selector: 'ht-quick-angular-table',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatTableModule, MatButtonModule, MatCheckboxModule, MatToolbar, MatSort, MatPaginator, DatePipe, MatIconModule, HtSkillMenuComponent],
  templateUrl: './ht-quick-angular-table.component.html',
  styleUrl: './ht-quick-angular-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HtQuickAngularTableComponent implements OnInit, AfterViewInit, OnDestroy {
  // Injected dependencies using Angular 21 inject()
  private tableService = inject(HtQuickAngularTableService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  //TableSettings Variables:
  tableSettingsSubscription!: Subscription;
  tableSettings!: TableSettings;
  tableSettingsLoaded = signal<boolean>(false);
  //Table Data Variables:
  dataSubscription!: Subscription;
  datasource = signal<MatTableDataSource<any>>(new MatTableDataSource<any>());
  tableDataLoaded = signal<boolean>(false);
  //Filter Variables:
  showSimpleFilter = signal<boolean>(false);
  simpleFilterControl = new FormControl<string>('');
  showColumnFilter = signal<boolean>(false);
  filterFormGroup!: FormGroup;
  filterColumns = signal<string[]>([]);
  //Table Column Settings:
  displayedColumns = signal<DynamicMatTableColumn[]>([]);
  columns = signal<string[]>([]);
  //Sort Variables:
  sort = viewChild<MatSort>(MatSort);
  //Paginator Setting Variables
  showPaginator = signal<boolean>(false);
  paginator = viewChild<MatPaginator>(MatPaginator);
  paginatorSettings!: PaginatorSettings;
  length = computed<number>(() => {
    return this.datasource().data.length;
  })
  pageSizeOptions!: Signal<number[]>;
  //Selection Model Variables:
  selection = new SelectionModel<any>(true, []);
  rowSelected = output<SelectionModel<any>>();
  rowAction = output<{ action: string; row: any }>();
  lastChecked!: number;
  //Drag and Drop Variables:
  disableDragAndDrop = true;
  tableFormArray = new FormArray([]);
  tableFormGroup = new FormGroup({
    tableFormArray: this.tableFormArray
  });

  ngAfterViewInit() {
    const sort = this.sort();
    if (sort) {
      this.datasource().sort = sort;
    }
    const paginator = this.paginator();
    if (paginator) {
      this.datasource().paginator = paginator;
    }
  }

  ngOnInit() {
    this.tableSettingsSubscription = this.tableService.tableSetting$.subscribe(tableSettings => {
      if (tableSettings) {
        this.tableSettings = tableSettings;
        this.tableSettingsLoaded.set(true);
        //Set Columns:
        this.displayedColumns.set(tableSettings.tableColumns);
        this.columns.set(tableSettings.tableColumns.map(column => column.columnDataName()))

        //Sets Filter Settings:
        if (tableSettings.showFilter) {
          if (tableSettings.filterType === 'simple') {
            //Listen for changes to simple filter if simple filter is set to true:
            this.simpleFiltration();
            this.showSimpleFilter.set(true);
            this.showColumnFilter.set(false);
          } else {
            this.filterFormGroup = tableSettings.filterFormGroup;
            this.showSimpleFilter.set(false);
            this.showColumnFilter.set(true);
          }
        }

        //Sets Paginator Settings:
        if (tableSettings.paginatorSettings) {
          this.showPaginator.set(true);
          this.paginatorSettings = tableSettings.paginatorSettings;
          this.pageSizeOptions = computed<number[]>(() => {
            let pageSizeOptions: number[] = [];
            if (this.paginatorSettings) {
              pageSizeOptions = this.paginatorSettings.pageSizeOptions() as number[];
              if (this.paginatorSettings.allowMaxLength) {
                pageSizeOptions.push(this.datasource().data.length)
              }
            }
            return pageSizeOptions;
          });
        } else {
          this.showPaginator.set(false);
        }

      } else {
        this.tableSettingsLoaded.set(false);
      }
    });
    this.dataSubscription = this.tableService.dataSource$.subscribe(data => {
      if (data) {
        this.tableDataLoaded.set(true);
        this.datasource.update(datasource => {
          datasource.data = data;
          return datasource;
        })
      } else {
        this.tableDataLoaded.set(false);
      }
    });
  }

  simpleFiltration() {
    this.simpleFilterControl.valueChanges.subscribe(simpleFilter => {
      if (simpleFilter) {
        this.datasource().filter = simpleFilter.trim().toLowerCase()
      }
    });
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.datasource().data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.datasource().data.forEach(row => this.selection.deselect(row));
    } else {
      this.datasource().data.forEach(row => this.selection.select(row));
    }
    this.rowSelected.emit(this.selection);
    this.tableService._rowSelected(this.selection);
    return this.datasource;
  }

  selectRowsBetween(start: number, end: number) {
    this.datasource().data.forEach((datum, index) => {
      if (index > start && index < end) {
        this.selection.select(datum);
      }
    });
  }

  checkSelection(start: number, end: number) {
    const selectionData = this.datasource().data.slice(start, end +1);
    const isAllSelected = selectionData.every(row => {
      return this.selection.isSelected(row);
    });
    const sort = this.sort();
    if (sort) {
      this.datasource().sortData(this.datasource().data, sort);
    }
    if (isAllSelected) {
      this.datasource().data.forEach((data, index) => {
        if (index >= start && index <= end) {
          this.selection.deselect(data);
        }
      });
    } else {
      this.selectRowsBetween(start, end);
    }
  }

  clickHandler(event: any, index: number) {
    if (!this.lastChecked) {
      this.lastChecked = index;
      return;
    }
    if (event.shiftKey) {
      const start = index;
      const end = this.lastChecked;
      if (start > end) {
        this.checkSelection(end, start);
      } else {
        this.checkSelection(start, end)
      }
    }
    this.lastChecked = index;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getCellType(column: DynamicMatTableColumn, element: any) {
    let cellType = 'simple';
    if (column.columnDataType() === 'action') {
      cellType = 'action'
    } else if (column.columnDataType() === '') {

    }
    return signal<string>(cellType);
  }
  getObjectDisplayValue(column: DynamicMatTableColumn, element: any) {
    return signal(column.objectValueToDisplay(element));
  }

  getLink(column: DynamicMatTableColumn, element: any) {
    return signal(column.url(element));
  }

  addData() {
    let newDataItem: any
    if (this.tableSettings.addDataMethod === 'table' || this.tableSettings.addDataMethod === 'function') {
      if (this.tableSettings.newDataItem && typeof this.tableSettings.newDataItem === 'function') {
        newDataItem = this.tableSettings.newDataItem();
      } else {
        newDataItem = this.tableSettings.newDataItem;
      }
      this.datasource.update((datasource) => {
        datasource.data.push(newDataItem);
        return datasource;
      });
    } else if (this.tableSettings.addDataMethod === 'routing') {
      this.router.navigate(this.tableSettings.addRoute, {relativeTo: this.route});
    } else {

    }
  }

  getActionButtons(): { icon: Icon; actionType: string }[] {
    const options = this.tableSettings.actionOptions;
    if (!options) return [];
    if (options.actionType === 'menu' && Array.isArray(options.icon)) {
      return (options.icon as Icon[]).map(icon => ({ icon, actionType: options.actionType }));
    }
    if (options.icon && !Array.isArray(options.icon) && typeof options.icon !== 'function' && 'name' in options.icon) {
      return [{ icon: options.icon as Icon, actionType: options.actionType }];
    }
    const defaults: Record<string, Icon> = {
      edit: { name: 'edit', color: ButtonColor.Default },
      delete: { name: 'delete', color: ButtonColor.Warn },
      link: { name: 'open_in_new', color: ButtonColor.Default },
      dialog: { name: 'open_in_new', color: ButtonColor.Default },
    };
    const icon = defaults[options.actionType];
    return icon ? [{ icon, actionType: options.actionType }] : [];
  }

  onRowAction(action: string, row: any) {
    this.rowAction.emit({ action, row });
  }

  ngOnDestroy() {
    if (this.tableSettingsSubscription) this.tableSettingsSubscription.unsubscribe();
    if (this.dataSubscription) this.dataSubscription.unsubscribe();
  }
}
