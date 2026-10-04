export interface Environment {
  production: boolean;
  /** Development talks to the local Firestore emulator and skips App Check. */
  useEmulator: boolean;
  firebase: { apiKey: string; authDomain: string; projectId: string; appId: string };
  recaptchaSiteKey: string;
}
