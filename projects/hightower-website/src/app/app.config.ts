import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { routes } from './app.routes';
import { ContentRepository } from './content/content-repository';
import { StaticContentRepository } from './content/static-content-repository';
import { FirebaseSubmissionWriter } from './contact/firebase-submission-writer';
import { SubmissionWriter } from './contact/submission-writer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideClientHydration(withEventReplay()),
    { provide: ContentRepository, useClass: StaticContentRepository },
    { provide: SubmissionWriter, useClass: FirebaseSubmissionWriter },
  ],
};
