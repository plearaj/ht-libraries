import {FormControl, FormGroup} from "@angular/forms";
import {Dialog} from "../dynamic-mat-table.model";
import {Signal, signal, WritableSignal} from "@angular/core";
import {
  DynamicActionColumn, DynamicDragColumn,
  DynamicSelectionColumn,
  TableColumn
} from "./private-dynamic-mat-table-column.model";

export enum ColumnDataType {
  String = 'string',
  Date = 'date',
  DateRange = 'dateRange',
  DateString = 'dateString',
  Number = 'number',
  Boolean = 'boolean',
  Hyperlink = 'hyperlink',
  RouterLink = 'routerLink',
  RouterLinkCell = 'routerLinkCell',
  Dialog = 'dialog',
  DialogCell = 'dialogCell',
  DialogIcon = 'dialogIcon',
  Object = 'object',
  Action = 'action',
  Select = 'select',
  Drag = 'drag'
}

export type IDynamicMatTableColumn = DynamicBasicColumn | DynamicHyperlinkColumn | DynamicEditableColumn | DynamicObjectColumn | DynamicRouterLinkColumn | DynamicDialogColumn;

export interface DynamicBasicColumn extends TableColumn {
  columnDataType: ColumnDataType.String | ColumnDataType.Date | ColumnDataType.DateRange | ColumnDataType.DateString | ColumnDataType.Number | ColumnDataType.Boolean;
  editable: false;
  allowMassUpdate: boolean;
  isLink: false;
}
export interface DynamicEditableColumn extends TableColumn {
  columnDataType: ColumnDataType.String | ColumnDataType.Date | ColumnDataType.DateRange | ColumnDataType.DateString | ColumnDataType.Number | ColumnDataType.Boolean;
  editable: true;
  allowMassUpdate: boolean;
  formField: any;
  isLink: false;
}

export interface DynamicHyperlinkColumn extends TableColumn {
  columnDataType: ColumnDataType.Hyperlink;
  editable: false,
  allowMassUpdate: false;
  isLink: true,
  url: (element: any) => string;
}

export interface DynamicRouterLinkColumn extends TableColumn {
  columnDataType: ColumnDataType.RouterLink | ColumnDataType.RouterLinkCell;
  editable: false;
  allowMassUpdate: false;
  isLink: true;
  url: (element: any) => string[];
}

export interface DynamicDialogColumn extends TableColumn {
  columnDataType: ColumnDataType.Dialog | ColumnDataType.DialogCell | ColumnDataType.DialogIcon;
  editable: false,
  allowMassUpdate: false;
  isLink: false;
  dialog: Dialog;
}

export interface DynamicObjectColumn extends TableColumn {
  columnDataType: ColumnDataType.Object;
  editable: false,
  allowMassUpdate: false;
  isLink: false;
  objectValueToDisplay: (element: any) => any;
}
export class DynamicMatTableColumn {
  readonly columnHeader: WritableSignal<string>;
  readonly columnDataName: WritableSignal<string>;
  readonly columnDataType: WritableSignal<string>;
  readonly sortable: boolean;
  readonly filterable: WritableSignal<boolean>;
  readonly filterName: WritableSignal<string>;
  // readonly filterFormControl?: FormControl | FormGroup;
  readonly editable: WritableSignal<boolean>;
  readonly formField: any;
  readonly isLink: WritableSignal<boolean>;
  readonly formGroup?: FormGroup;
  readonly colClass?: WritableSignal<Record<string, boolean>>;
  readonly cellClass?: (element: any) => string;
  readonly url: ((element: any) => string) | ((element: any) => string[]) = () => '';
  readonly dialog?: Dialog;
  readonly allowMassUpdate: boolean;
  objectValueToDisplay: (element: any) => any = () => '';


  constructor(column: IDynamicMatTableColumn | DynamicActionColumn | DynamicSelectionColumn | DynamicDragColumn) {
    this.columnHeader = signal(column.columnHeader);
    this.columnDataName = signal(column.columnDataName);
    this.columnDataType = signal(column.columnDataType);
    this.sortable = column.sortable;
    this.filterable = signal(column.filterable);
    this.filterName = signal(column.columnHeader + 'Filter');
    // if (column.filterable && column.filterFormControl) {
    //   this.filterFormControl = column.filterFormControl;
    // }
    this.editable = signal(column.editable);
    if (column.editable) {
      //Create FromField
    }
    this.isLink = signal(column.isLink);
    this.allowMassUpdate = column.allowMassUpdate;
    if (column.colClass) this.colClass = signal(column.colClass);
    if (column.cellClass) this.cellClass = column.cellClass;
    if (this.instanceOfDynamicHyperlinkColumn(column) || this.instanceOfDynamicRouterLinkColumn(column)) {
      this.url = column.url;
    } else if (this.instanceOfDynamicDialogColumn(column)) {
      this.dialog = column.dialog;
    } else if (this.instanceOfDynamicObjectColumn(column)) {
      this.objectValueToDisplay = column.objectValueToDisplay;
    }
  }

  private instanceOfDynamicHyperlinkColumn(column: any): column is DynamicHyperlinkColumn {
    return column.columnDataType === 'hyperlink';
  }

  private instanceOfDynamicDialogColumn(column: any): column is DynamicDialogColumn {
    return column.columnDataType === 'dialog' || column.columnDataType === 'dialogCell' || column.columnDataType === 'dialogIcon';
  }

  private instanceOfDynamicObjectColumn(column: any): column is DynamicObjectColumn {
    return column.columnDataType === 'object';
  }

  private instanceOfDynamicRouterLinkColumn(column: any): column is DynamicRouterLinkColumn {
    return column.columnDataType === 'routerLink' || column.columnDataType ===  'routerLinkCell';
  }
}
