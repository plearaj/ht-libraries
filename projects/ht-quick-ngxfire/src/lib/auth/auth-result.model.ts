import { User } from '@angular/fire/auth';

export interface AuthResult {
  success: boolean;
  user: User | null;
  error?: { code: string; message: string };
  /** true when created via createAccount(); derived from UserCredential.additionalUserInfo.isNewUser for SSO */
  isNewUser?: boolean;
}
