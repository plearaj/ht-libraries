import {DynamicMatTableButton, Icon} from "./dynamic-mat-table-button.model";
export type SingleIconFn = (element: any) => Icon;
export type MenuIconFn = (element: any) => DynamicMatTableButton[];
export type VariableActionFn = (element: any) => DynamicMatTableSingleAction | DynamicMatTableMenuAction | 'edit' | 'link' | 'dialog' | 'none';

export class DynamicMatTableSingleAction {
  constructor(
    readonly actionType: 'single' | 'icon-link',
    readonly icon: Icon | SingleIconFn,
  ) {
    this.icon = icon;
    this.actionType = actionType;
  }
}

export class DynamicMatTableMenuAction {
  constructor(
    readonly icon: Icon[] | MenuIconFn,
    readonly menuIconColor: 'default' | 'primary' | 'accent' | 'warn' | 'emphasis' | 'error' | 'success' | 'info' = "default") {
    this.icon = icon;
    this.menuIconColor = menuIconColor;
  }
}

export class DynamicMatTableActionOptions {
  readonly actionType: 'single' | 'menu' | 'edit' | 'variable' | 'link' | 'icon-link' | 'dialog' | 'delete';
  readonly position: number;
  readonly icon?: Icon | SingleIconFn | Icon[] | MenuIconFn;
  readonly actionHeader: string;
  readonly routeSegments: string[] = [];
  readonly variableActionFn?: (element: any) => DynamicMatTableSingleAction | DynamicMatTableMenuAction | 'edit' | 'link' | 'dialog' | 'none';
  readonly menuIconColor: 'default' | 'primary' | 'accent' | 'warn' | 'emphasis' | 'error' | 'success' | 'info' = 'default';
  constructor(
    actionOption: DynamicMatTableSingleAction | DynamicMatTableMenuAction | VariableActionFn | 'edit' | 'link' | 'dialog' | 'delete',
    position: number,
    actionHeader: string = 'Action'
  ) {
    this.actionHeader = actionHeader;
    this.position = position;
    if (actionOption instanceof DynamicMatTableMenuAction || actionOption instanceof DynamicMatTableSingleAction) {
      this.icon = actionOption.icon;
    }
    if (actionOption instanceof DynamicMatTableMenuAction) {
      this.actionType = 'menu';
      this.menuIconColor = actionOption.menuIconColor;
    } else if (actionOption instanceof DynamicMatTableSingleAction) {
      this.actionType = actionOption.actionType;
    } else if (typeof actionOption === 'function') {
      this.actionType = 'variable';
      this.variableActionFn = actionOption;
    } else {
      this.actionType = actionOption;
    }
  }
}
export class DynamicMatTableActionSettings {
  constructor(showActionColumn: false)
  constructor(showActionColumn: true, actionOptions: DynamicMatTableActionOptions)
  constructor(readonly showActionColumn: boolean, readonly actionOptions?: DynamicMatTableActionOptions) {
    this.showActionColumn = showActionColumn;
    this.actionOptions = actionOptions;
  }
}
