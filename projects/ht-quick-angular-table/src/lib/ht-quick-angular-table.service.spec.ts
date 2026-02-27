import { TestBed } from '@angular/core/testing';

import { HtQuickAngularTableService } from './ht-quick-angular-table.service';

describe('HtQuickAngularTableService', () => {
  let service: HtQuickAngularTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HtQuickAngularTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
