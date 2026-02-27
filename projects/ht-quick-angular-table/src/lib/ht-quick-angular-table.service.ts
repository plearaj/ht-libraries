import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {SelectionModel} from "@angular/cdk/collections";
import {TableSettings} from "./model/table-settings.model";

@Injectable({
  providedIn: 'root'
})
export class HtQuickAngularTableService {
  private tableSettingsSubject = new BehaviorSubject<TableSettings | null>(null);
  tableSetting$ = this.tableSettingsSubject.asObservable();
  private dataSourceSubject = new BehaviorSubject<any[] | null>(null);
  dataSource$ = this.dataSourceSubject.asObservable();
  private rowSelectedSubject = new BehaviorSubject<SelectionModel<any>>(new SelectionModel<any>());
  rowSelected$ = this.rowSelectedSubject.asObservable();

  setTableData(data: any[]) {
    this.dataSourceSubject.next(data);
  }

  setTableSettings(tableSettings: TableSettings) {
    this.tableSettingsSubject.next(tableSettings);
  }

  _rowSelected(selection: SelectionModel<any>) {
    this.rowSelectedSubject.next(selection);
  }
}
