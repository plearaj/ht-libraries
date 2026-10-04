import { Injectable } from '@angular/core';
import type { Firestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { ContactSubmission } from './contact.models';
import { SubmissionWriter } from './submission-writer';

type FirestoreModule = typeof import('firebase/firestore');

/**
 * Loads the Firebase SDK lazily on the first write. Never runs during prerender because
 * ContactService only calls it in the browser.
 */
@Injectable()
export class FirebaseSubmissionWriter extends SubmissionWriter {
  private ready?: Promise<{ db: Firestore; fs: FirestoreModule }>;

  override async write(data: ContactSubmission): Promise<void> {
    const { db, fs } = await this.init();
    await fs.addDoc(fs.collection(db, 'contactSubmissions'), { ...data, createdAt: fs.serverTimestamp() });
  }

  private init(): Promise<{ db: Firestore; fs: FirestoreModule }> {
    this.ready ??= (async () => {
      const [{ getApps, initializeApp }, fs] = await Promise.all([
        import('firebase/app'),
        import('firebase/firestore'),
      ]);
      const app = getApps()[0] ?? initializeApp(environment.firebase);
      if (environment.useEmulator) {
        const db = fs.getFirestore(app);
        fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
        return { db, fs };
      }
      // App Check must be initialized before the first Firestore request.
      const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(environment.recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      return { db: fs.getFirestore(app), fs };
    })();
    return this.ready;
  }
}
