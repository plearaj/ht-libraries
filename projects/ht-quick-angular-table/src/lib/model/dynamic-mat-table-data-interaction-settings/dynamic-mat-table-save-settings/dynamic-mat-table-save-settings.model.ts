import {SaveDataFnElement, SaveDataFnElements} from "./save-data-fn.model";
import {DynamicMatTableButton} from "../../dynamic-mat-table-button.model";

export class DynamicMatTableSaveOptions {
  readonly saveMethod: 'pass-data' | 'function';
  readonly saveDataFn?: SaveDataFnElement | SaveDataFnElements;
  constructor(
    readonly notifySaveBy: 'subscription' | 'event',
    saveData: 'pass-data' | SaveDataFnElement | SaveDataFnElements,
    readonly saveButton?: DynamicMatTableButton
  ) {
    this.notifySaveBy = notifySaveBy;
    if (typeof saveData === 'string') {
      this.saveMethod = 'pass-data';
    } else {
      this.saveMethod = 'function';
      this.saveDataFn = saveData;
    }
    this.saveButton = saveButton;
  }
}

export class DynamicMatTableSaveSettings {
  readonly notifySaveBy: 'subscription' | 'event' = 'event';
  readonly saveMethod: 'pass-data' | 'function' = 'pass-data';
  readonly saveDataFn?: SaveDataFnElement | SaveDataFnElements;
  readonly saveButton: DynamicMatTableButton = new DynamicMatTableButton('Save');
  constructor(allowSave: false)
  constructor(allowSave: true, saveSettings: DynamicMatTableSaveOptions)
  constructor(readonly allowSave: boolean, saveSettings?: DynamicMatTableSaveOptions) {
    this.allowSave = allowSave;
    if (saveSettings) {
      this.notifySaveBy = saveSettings.notifySaveBy;
      this.saveMethod = saveSettings.saveMethod;
      this.saveDataFn = saveSettings.saveDataFn;
      if (saveSettings.saveButton) this.saveButton = saveSettings.saveButton;
    }
  }
}
