import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders, APP_INITIALIZER } from "@angular/core";
import { FirebaseOptions, initializeApp, provideFirebaseApp } from "@angular/fire/app";
import { FirebaseConfig } from "./firebase-config.model";
import { provideAuth, getAuth } from "@angular/fire/auth";
import { provideFirestore, getFirestore } from "@angular/fire/firestore";
import { provideDatabase, getDatabase } from "@angular/fire/database";
import { provideFunctions, getFunctions } from "@angular/fire/functions";
import { provideStorage, getStorage } from "@angular/fire/storage";
import { HtAuthUserSyncService } from "./auth/ht-auth-user-sync.service";

export const FIREBASE_CONFIG = new InjectionToken<FirebaseOptions>("firebaseConfig");
export const AUTH_OPTIONS = new InjectionToken<FirebaseConfig["authOptions"]>("authOptions");

export const provideHtQuickNgxFire = (config: FirebaseConfig): EnvironmentProviders => {
  const providers: EnvironmentProviders[] = [
    provideFirebaseApp(() => initializeApp(config.firebaseOptions)),
    provideAuth(() => getAuth()),
    makeEnvironmentProviders([
      { provide: AUTH_OPTIONS, useValue: config.authOptions },
      {
        provide: APP_INITIALIZER,
        useFactory: (_userSyncService: HtAuthUserSyncService) => () => Promise.resolve(),
        deps: [HtAuthUserSyncService],
        multi: true
      }
    ])
  ];

  if (config.firestore) {
    providers.push(provideFirestore(() => getFirestore()));
  }
  if (config.database) {
    providers.push(provideDatabase(() => getDatabase()));
  }
  if (config.functions) {
    providers.push(provideFunctions(() => getFunctions()));
  }
  if (config.storage) {
    providers.push(provideStorage(() => getStorage()));
  }

  return makeEnvironmentProviders(providers);
};
