import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection, signal } from '@angular/core';
import { of } from 'rxjs';

import { HtCameraUpload } from './ht-camera-upload';
import { HtCameraUploadService } from './ht-camera-upload.service';
import { HtCapacitorCameraService } from './ht-capacitor-camera.service';

const mockBrowserService = {
  isCameraSupported: signal(true),
  takePhoto: jasmine.createSpy('takePhoto').and.returnValue(of()),
  selectImage: jasmine.createSpy('selectImage').and.returnValue(of()),
  upload: jasmine.createSpy('upload').and.returnValue(of()),
  dataUrlToFile: jasmine.createSpy('dataUrlToFile')
};

const mockCapacitorService = {
  isNativePlatform: signal(false),
  takePhoto: jasmine.createSpy('takePhoto').and.returnValue(of()),
  pickFromGallery: jasmine.createSpy('pickFromGallery').and.returnValue(of()),
  promptCameraOrGallery: jasmine.createSpy('promptCameraOrGallery').and.returnValue(of()),
  requestPermissions: jasmine.createSpy('requestPermissions').and.returnValue(
    Promise.resolve({ camera: true, photos: true })
  ),
  checkPermissions: jasmine.createSpy('checkPermissions').and.returnValue(
    Promise.resolve({ camera: true, photos: true })
  ),
  upload: jasmine.createSpy('upload').and.returnValue(of())
};

describe('HtCameraUpload', () => {
  let component: HtCameraUpload;
  let fixture: ComponentFixture<HtCameraUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HtCameraUpload],
      providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        { provide: HtCameraUploadService, useValue: mockBrowserService },
        { provide: HtCapacitorCameraService, useValue: mockCapacitorService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HtCameraUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default triggerLabel to "Add Photo"', () => {
    expect(component.triggerLabel()).toBe('Add Photo');
  });

  it('should initialise uploadState as idle', () => {
    expect(component.uploadState()).toBe('idle');
  });

  it('should initialise currentImage as null', () => {
    expect(component.currentImage()).toBeNull();
  });
});
