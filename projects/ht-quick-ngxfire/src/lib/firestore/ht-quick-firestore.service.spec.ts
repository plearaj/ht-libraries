import { TestBed } from '@angular/core/testing';
import { HtFirestoreService } from './ht-quick-firestore.service';
import { Firestore } from '@angular/fire/firestore';
import { HtQuickNgxFireError } from '../ht-quick-ngxfire.error';

describe('HtFirestoreService', () => {
  let service: HtFirestoreService;

  beforeEach(() => {
    // Provide a minimal Firestore mock — error-path tests throw before using it
    const mockFirestore = {};

    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: mockFirestore },
      ]
    });
    service = TestBed.inject(HtFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('error handling', () => {
    it('should throw HtQuickNgxFireError for empty path in createCollectionRef', () => {
      expect(() => service.createCollectionRef('')).toThrow(new HtQuickNgxFireError('Path cannot be empty', 'invalid-path'));
    });

    it('should throw HtQuickNgxFireError for empty path in getCollectionRef', () => {
      expect(() => service.getCollectionRef('')).toThrow(new HtQuickNgxFireError('Path cannot be empty', 'invalid-path'));
    });

    it('should throw HtQuickNgxFireError for empty path in createDocRef', () => {
      expect(() => service.createDocRef('', 'test')).toThrow(new HtQuickNgxFireError('Path cannot be empty', 'invalid-path'));
    });

    it('should throw HtQuickNgxFireError for empty path in createQuery', () => {
      expect(() => service.createQuery('')).toThrow(new HtQuickNgxFireError('Path cannot be empty', 'invalid-path'));
    });

    it('should throw HtQuickNgxFireError for empty path in getCollectionData', () => {
      expect(() => service.getCollectionData('')).toThrow(new HtQuickNgxFireError('Path cannot be empty', 'invalid-path'));
    });

    it('should throw HtQuickNgxFireError for empty path in addDoc', () => {
      expect(() => service.addDoc('', {})).toThrow(new HtQuickNgxFireError('Path cannot be empty', 'invalid-path'));
    });

    it('should throw HtQuickNgxFireError for empty path in getCountFromServer', async () => {
      await expectAsync(service.getCountFromServer('')).toBeRejectedWith(new HtQuickNgxFireError('Path cannot be empty', 'invalid-path'));
    });
  });
});
