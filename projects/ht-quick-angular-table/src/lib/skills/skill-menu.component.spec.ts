import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HtSkillMenuComponent } from './skill-menu.component';
import { SkillRegistryService } from './skill-registry.service';
import { HtBackendService } from '../backend/ht-backend.service';
import { HT_BACKEND_CONFIG } from '../backend/ht-backend.config';

describe('HtSkillMenuComponent', () => {
  let component: HtSkillMenuComponent;
  let fixture: ComponentFixture<HtSkillMenuComponent>;
  let registry: SkillRegistryService;

  beforeEach(async () => {
    const backendSpy = jasmine.createSpyObj('HtBackendService', [
      'uploadExcel', 'listSheets', 'pullApiData', 'queryDatabase',
      'testDatabaseConnection', 'login', 'refreshToken', 'logout',
      'getAccessToken', 'setAccessToken',
    ]);

    await TestBed.configureTestingModule({
      imports: [HtSkillMenuComponent],
      providers: [
        provideNoopAnimations(),
        { provide: HtBackendService, useValue: backendSpy },
        { provide: HT_BACKEND_CONFIG, useValue: { backendUrl: 'http://test', apiKey: 'key' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HtSkillMenuComponent);
    component = fixture.componentInstance;
    registry = TestBed.inject(SkillRegistryService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders registered skills', () => {
    registry.registerSkill({
      id: 'excel-upload',
      name: 'Excel Upload',
      icon: 'upload_file',
      configSchema: { type: 'excel-upload', maxFileSizeMb: 10, allowedFormats: ['.xlsx'] },
    });
    fixture.detectChanges();
    // The menu button should be present
    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Data Source');
  });
});
