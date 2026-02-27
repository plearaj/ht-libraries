import {SelectionModel} from "@angular/cdk/collections";
import {FormControl, FormGroup} from "@angular/forms";
import {Component} from "@angular/core";
import {ComponentType} from "@angular/cdk/portal";
import {MatDialogConfig} from "@angular/material/dialog";
import {MatSort} from "@angular/material/sort";
import {MatTableDataSource} from "@angular/material/table";
import {TableSettings} from "./table-settings.model";
import {Signal, WritableSignal} from "@angular/core";
import {Icon} from "./dynamic-mat-table-button.model";

export interface DynamicTable {
  datasource: MatTableDataSource<any>;
  tableSettings?: TableSettings;
  preserveState: boolean;
}
export interface Dialog {
  component: Component;//ComponentType<unknown>;
  config?: MatDialogConfig;
  icon?: Icon;
  afterClosedFn?: (data: any) => {[key: string]: any}[];
  dataFn?: (element: any) => any;
}

export interface TableState {
  viewSort: MatSort;
  viewFilter: Map<string, { dataType: string, filterValue: string }>;
  viewPage: number;
  viewPageSize: number;
}
