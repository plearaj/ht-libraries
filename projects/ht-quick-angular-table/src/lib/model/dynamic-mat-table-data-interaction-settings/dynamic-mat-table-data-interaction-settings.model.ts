import {DynamicMatTableDataAddSettings} from "./dynamic-mat-table-add-settings/dynamic-mat-table-add-settings.model";
import {
  DynamicMatTableDeleteSettings
} from "./dynamic-mat-table-delete-settings/dyanamic-mat-table-delete-settings.model";
import {
  DynamicMatTableSaveSettings
} from "./dynamic-mat-table-save-settings/dynamic-mat-table-save-settings.model";

export class DynamicMatTableDataInteractionSettings {
  constructor(
    readonly addSettings: DynamicMatTableDataAddSettings,
    readonly deleteSettings: DynamicMatTableDeleteSettings,
    readonly saveSettings: DynamicMatTableSaveSettings
  ) {
  }
}
