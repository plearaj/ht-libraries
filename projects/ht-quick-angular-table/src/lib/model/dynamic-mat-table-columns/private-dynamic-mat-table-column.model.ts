export interface TableColumn {
  columnHeader: string;
  columnDataName: string;
  sortable: boolean;
  filterable: boolean;
  colClass?: Record<string, boolean>;
  cellClass?: (element: any) => string;
}
export interface DynamicActionColumn extends TableColumn {
  columnDataType: 'action';
  editable: false,
  allowMassUpdate: false;
  isLink: false,
}

export interface DynamicSelectionColumn extends TableColumn {
  columnDataType: 'select';
  editable: false,
  allowMassUpdate: false;
  isLink: false,
}

export interface DynamicDragColumn extends TableColumn {
  columnDataType: 'drag';
  editable: false,
  allowMassUpdate: false;
  isLink: false,
}
