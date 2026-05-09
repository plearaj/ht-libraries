import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HtTableBuilderService } from './ht-table-builder.service';
import { HtBackendService } from '../backend/ht-backend.service';
import { HT_BACKEND_CONFIG } from '../backend/ht-backend.config';

const VALID_TABLE_RESPONSE = {
  tableSettings: {
    tableName: 'employeeTable',
    noRecordMessage: 'No employees found.',
    columns: [
      {
        columnHeader: 'Name',
        columnDataName: 'name',
        columnDataType: 'string',
        sortable: true,
        filterable: true,
      },
      {
        columnHeader: 'Age',
        columnDataName: 'age',
        columnDataType: 'number',
        sortable: true,
        filterable: false,
      },
    ],
    filter: { showFilter: true, filterType: 'simple' },
    paginator: { showPagination: true, pageSize: 10, pageSizeOptions: [5, 10, 25] },
  },
  clarification: undefined,
};

const CLARIFICATION_RESPONSE = {
  tableSettings: undefined,
  clarification: 'Could you clarify what columns you need?',
};

describe('HtTableBuilderService', () => {
  let service: HtTableBuilderService;
  let backendSpy: jasmine.SpyObj<HtBackendService>;

  beforeEach(() => {
    backendSpy = jasmine.createSpyObj('HtBackendService', [
      'describeTable',
      'refineTable',
      'login',
      'refreshToken',
      'logout',
      'getAccessToken',
      'setAccessToken',
    ]);

    TestBed.configureTestingModule({
      providers: [
        HtTableBuilderService,
        { provide: HtBackendService, useValue: backendSpy },
        { provide: HT_BACKEND_CONFIG, useValue: { backendUrl: 'http://test', apiKey: 'test-key' } },
      ],
    });

    service = TestBed.inject(HtTableBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('describe()', () => {
    it('should call backendService.describeTable and return tableSettings when backend returns valid JSON', async () => {
      backendSpy.describeTable.and.returnValue(of(VALID_TABLE_RESPONSE));

      const result = await service.describe('Create an employee table with name and age');

      expect(backendSpy.describeTable).toHaveBeenCalled();
      expect(result.tableSettings).toBeTruthy();
      expect(result.clarification).toBeUndefined();
    });

    it('should return clarification when backend returns a question', async () => {
      backendSpy.describeTable.and.returnValue(of(CLARIFICATION_RESPONSE));

      const result = await service.describe('I need a table');

      expect(result.tableSettings).toBeUndefined();
      expect(result.clarification).toBe('Could you clarify what columns you need?');
    });

    it('should throw error for empty message', async () => {
      await expectAsync(service.describe('')).toBeRejectedWithError(
        /User message must not be empty/,
      );
    });

    it('should throw error for message exceeding 2000 chars', async () => {
      const longMessage = 'x'.repeat(2001);
      await expectAsync(service.describe(longMessage)).toBeRejectedWithError(
        /exceeds maximum length/,
      );
    });
  });

  describe('refine()', () => {
    it('should call backendService.refineTable with serialized current config', async () => {
      backendSpy.refineTable.and.returnValue(of(VALID_TABLE_RESPONSE));

      // Create a minimal mock TableSettings to pass to refine
      const mockSettings = {
        tableName: 'test',
        noRecordMessage: 'None',
        tableColumns: [],
        showFilter: false,
        filterType: 'simple',
        showPagination: false,
        paginatorSettings: null,
      } as any;

      const result = await service.refine('Add an email column', mockSettings);

      expect(backendSpy.refineTable).toHaveBeenCalled();
      expect(result.tableSettings).toBeTruthy();
    });
  });

  describe('reset()', () => {
    it('should clear session history', async () => {
      backendSpy.describeTable.and.returnValue(of(VALID_TABLE_RESPONSE));
      await service.describe('Create a table');

      expect(service.sessionHistory().length).toBeGreaterThan(0);

      service.reset();

      expect(service.sessionHistory().length).toBe(0);
    });
  });
});
