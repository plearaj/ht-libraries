import {SelectionModel} from "@angular/cdk/collections";

export class DynamicMatTableSelection {
  constructor(showSelection: false)
  constructor(showSelection: true, selectionModel: SelectionModel<any>)
  constructor(readonly showSelection: boolean, readonly selectionModel?: SelectionModel<any>) {
    this.showSelection = showSelection;
    if (showSelection) {
      this.selectionModel = selectionModel;
    }
  }
}
