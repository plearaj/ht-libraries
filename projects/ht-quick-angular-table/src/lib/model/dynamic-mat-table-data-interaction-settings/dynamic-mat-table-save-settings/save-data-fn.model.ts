export class SaveDataFnElement {
  constructor(readonly saveDataFn: (elements: any) => any | void) {
    this.saveDataFn = saveDataFn;
  }
}

export class SaveDataFnElements {
  constructor(readonly saveDataFn: (elements: any[]) => any | void) {
    this.saveDataFn = saveDataFn;
  }
}
