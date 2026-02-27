// filepath: /c:/Users/ajple/Programming Projects/ht-libraries/projects/ht-quick-angular-table/src/lib/ht-quick-angular-table.providers.ts
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { HtQuickAngularTableService } from './ht-quick-angular-table.service';
import { HtQuickAngularTableComponent } from './ht-quick-angular-table.component';

export const provideHtQuickAngularTable = (): EnvironmentProviders => {
  return makeEnvironmentProviders([
    HtQuickAngularTableService,
    HtQuickAngularTableComponent
  ]);
};
