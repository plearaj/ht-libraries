export type NewDataItem = any;
export class NewDataItemFnAnon {
  constructor(readonly newDataItem: () => any) {
    this.newDataItem = newDataItem;
  }
}

export class NewDataItemFnParams {
  constructor(readonly newDataItem: (params: any) => any | void) {
    this.newDataItem = newDataItem;
  }
}

export class NewDataItemFnElement {
  constructor(readonly newDataItem: (element: any) => any) {
    this.newDataItem = newDataItem;
  }
}
