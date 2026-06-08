import { inject, Injectable } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { HtFirestoreService } from '../firestore/ht-quick-firestore.service';
import { HtAuthService } from './ht-auth.service';
import { SimulationStatusService } from '../simulation/simulation-status.service';

/**
 * Service to automatically sync authenticated users to Firestore.
 *
 * Sim-aware (FR-017): in simulation mode, listens to `HtAuthService.user$`
 * (which is backed by `SimAuthBackend`) instead of the real `Auth` token.
 * All Firestore reads/writes flow through `HtFirestoreService` and therefore
 * land in `SimFirestoreBackend` automatically (R10).
 */
@Injectable({
  providedIn: 'root'
})
export class HtAuthUserSyncService {
  private status = inject(SimulationStatusService);
  private isSim = this.status.get('auth') === 'simulated';
  private auth = inject(Auth, { optional: true });
  private htAuth = inject(HtAuthService);
  private firestoreService = inject(HtFirestoreService);

  constructor() {
    this.startUserSync();
  }

  /**
   * Listen to auth-state changes (real or simulated) and sync to Firestore.
   */
  private startUserSync(): void {
    if (this.isSim || !this.auth) {
      // Sim mode (or no real Auth): subscribe to HtAuthService.user$.
      this.htAuth.user$.subscribe((user) => {
        if (user) void this.syncUserToFirestore(user);
      });
      return;
    }
    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        await this.syncUserToFirestore(user);
      }
    });
  }

  /**
   * Sync user data to Firestore. Creates or updates the user document.
   */
  async syncUserToFirestore(user: User): Promise<void> {
    const userDocPath = `users/${user.uid}`;

    const userDoc = await firstValueFrom(this.firestoreService.getDocData(userDocPath));

    const userData: Record<string, unknown> = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      lastLogin: new Date(),
      updatedAt: new Date()
    };

    if (!userDoc) {
      await this.firestoreService.setDoc(userDocPath, {
        ...userData,
        role: 'user',
        permissions: ['read:posts', 'create:posts', 'edit:own:posts'],
        createdAt: new Date()
      });
    } else {
      await this.firestoreService.updateDoc(userDocPath, userData);
    }
  }

  /**
   * Manually trigger user sync for the current user.
   */
  async syncCurrentUser(): Promise<void> {
    const user = this.isSim
      ? this.htAuth.currentUser()
      : (this.auth?.currentUser ?? null);
    if (user) {
      await this.syncUserToFirestore(user as User);
    }
  }
}
