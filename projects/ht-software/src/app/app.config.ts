import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHtQuickNgxFire } from 'ht-quick-ngxfire';
import { HtBackendService, provideHtBackend } from 'ht-quick-angular-table';

import { routes } from './app.routes';
import { MockHtBackendService } from './demos/table-demo/shared/mock-ht-backend.service';

const firebaseConfig = {
  firebaseOptions: {
    apiKey: "AIzaSyC0OQVUcdFDtnB6wpDHGVsqD4PopMrXr-k",
    authDomain: "appointment-booking-prototype.firebaseapp.com",
    projectId: "appointment-booking-prototype",
    storageBucket: "appointment-booking-prototype.firebasestorage.app",
    messagingSenderId: "344403377339",
    appId: "1:344403377339:web:34fd76d1e2f1d45a507d9e"
  },
  authOptions: {
    email: true,
    google: true,
    facebook: true,
    twitter: true,
    github: true,
    microsoft: true,
    apple: true,
  },
  firestore: true,
  database: false,
  functions: false,
  storage: true
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHtQuickNgxFire(firebaseConfig),
    ...provideHtBackend({ backendUrl: 'http://mock', apiKey: 'mock' }),
    { provide: HtBackendService, useClass: MockHtBackendService },
  ]
};
