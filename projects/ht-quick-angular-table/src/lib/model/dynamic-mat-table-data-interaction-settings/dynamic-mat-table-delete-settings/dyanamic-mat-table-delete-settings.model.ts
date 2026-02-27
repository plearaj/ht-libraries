import {DynamicMatTableButton} from "../../dynamic-mat-table-button.model";

export class DynamicMatTableDataDeleteOptions {

  constructor(
    readonly notifyOfDeleteBy: 'subscription' | 'event',
    readonly deleteButton?: DynamicMatTableButton
  ) {
    this.notifyOfDeleteBy = notifyOfDeleteBy;
    this.deleteButton = deleteButton;
  }
}
export class DynamicMatTableDeleteSettings {
  readonly notifyOfDeleteBy: 'subscription' | 'event' = 'event';
  readonly deleteButton: DynamicMatTableButton = new DynamicMatTableButton('Delete');
  constructor(allowDeleteData: false)
  constructor(allowDeleteData: true, deleteDataOptions: DynamicMatTableDataDeleteOptions)
  constructor(readonly allowDeleteData: boolean, deleteDataOptions?: DynamicMatTableDataDeleteOptions) {
    this.allowDeleteData = allowDeleteData;
    if (deleteDataOptions) {
      this.notifyOfDeleteBy = deleteDataOptions.notifyOfDeleteBy;
      if (deleteDataOptions.deleteButton) this.deleteButton = deleteDataOptions.deleteButton;
    }
  }
}
