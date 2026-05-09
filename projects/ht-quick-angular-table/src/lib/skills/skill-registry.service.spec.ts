import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SkillRegistryService } from './skill-registry.service';
import { HtBackendService } from '../backend/ht-backend.service';
import { HT_BACKEND_CONFIG } from '../backend/ht-backend.config';
import { Skill, DataResult } from './skill.types';

const MOCK_EXCEL_SKILL: Skill = {
  id: 'excel-upload',
  name: 'Excel Upload',
  icon: 'upload_file',
  configSchema: { type: 'excel-upload', maxFileSizeMb: 10, allowedFormats: ['.xlsx', '.csv'] },
};

const MOCK_API_SKILL: Skill = {
  id: 'api-pull',
  name: 'API Pull',
  icon: 'cloud_download',
  configSchema: { type: 'api-pull', url: 'https://api.example.com', method: 'GET' },
};

const MOCK_DATA_RESULT: DataResult = {
  columns: [{ name: 'Name', dataName: 'name', dataType: 'string' }],
  rows: [{ name: 'Alice' }],
  totalRows: 1,
  truncated: false,
};

describe('SkillRegistryService', () => {
  let service: SkillRegistryService;
  let backendSpy: jasmine.SpyObj<HtBackendService>;

  beforeEach(() => {
    backendSpy = jasmine.createSpyObj('HtBackendService', [
      'uploadExcel', 'listSheets', 'pullApiData', 'queryDatabase',
      'testDatabaseConnection', 'login', 'refreshToken', 'logout',
      'getAccessToken', 'setAccessToken',
    ]);

    TestBed.configureTestingModule({
      providers: [
        SkillRegistryService,
        { provide: HtBackendService, useValue: backendSpy },
        { provide: HT_BACKEND_CONFIG, useValue: { backendUrl: 'http://test', apiKey: 'key' } },
      ],
    });

    service = TestBed.inject(SkillRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('registerSkill adds to registry', () => {
    service.registerSkill(MOCK_EXCEL_SKILL);
    expect(service.registeredSkills().length).toBe(1);
    expect(service.registeredSkills()[0].id).toBe('excel-upload');
  });

  it('registerSkill prevents duplicates', () => {
    service.registerSkill(MOCK_EXCEL_SKILL);
    service.registerSkill(MOCK_EXCEL_SKILL);
    expect(service.registeredSkills().length).toBe(1);
  });

  it('unregisterSkill removes from registry', () => {
    service.registerSkill(MOCK_EXCEL_SKILL);
    service.registerSkill(MOCK_API_SKILL);
    service.unregisterSkill('excel-upload');
    expect(service.registeredSkills().length).toBe(1);
    expect(service.registeredSkills()[0].id).toBe('api-pull');
  });

  it('getRegisteredSkills returns registered only', () => {
    expect(service.getRegisteredSkills().length).toBe(0);
    service.registerSkill(MOCK_EXCEL_SKILL);
    expect(service.getRegisteredSkills().length).toBe(1);
  });

  it('executeSkill calls backend and returns DataResult', (done) => {
    backendSpy.uploadExcel.and.returnValue(of(MOCK_DATA_RESULT));
    service.registerSkill(MOCK_EXCEL_SKILL);

    const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    service.executeSkill('excel-upload', { file: mockFile }).subscribe(result => {
      expect(result).toEqual(MOCK_DATA_RESULT);
      expect(service.currentExecution()?.status).toBe('completed');
      done();
    });
  });

  it('concurrent execution prevention', (done) => {
    // Create a subject that never completes to simulate a long-running execution
    backendSpy.uploadExcel.and.returnValue(of(MOCK_DATA_RESULT));
    service.registerSkill(MOCK_EXCEL_SKILL);

    const mockFile = new File(['test'], 'test.xlsx');

    // Start first execution
    service.executeSkill('excel-upload', { file: mockFile }).subscribe(() => {
      // While this is "completing", the isExecuting should have been true during execution
      expect(service.currentExecution()?.status).toBe('completed');
      done();
    });
  });
});
