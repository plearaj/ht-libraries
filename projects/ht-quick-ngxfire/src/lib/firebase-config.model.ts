import { FirebaseOptions } from "@angular/fire/app";

export interface AuthOptions {
  email?: boolean;
  google?: boolean;
  facebook?: boolean;
  twitter?: boolean;
  github?: boolean;
  microsoft?: boolean;
  apple?: boolean;
  preferRedirect?: boolean;
}

export interface FirebaseConfig {
  authOptions: AuthOptions; // Updated to use a specific type
  firebaseOptions: FirebaseOptions;
  firestore: boolean;
  database: boolean;
  functions: boolean;
  storage: boolean;
}
