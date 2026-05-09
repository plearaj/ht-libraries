import { inject, Injectable } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { HtFirestoreService } from '../firestore/ht-quick-firestore.service';

/**
 * Service to automatically sync authenticated users to Firestore
 */
@Injectable({
  providedIn: 'root'
})
export class HtAuthUserSyncService {
  private auth = inject(Auth);
  private firestoreService = inject(HtFirestoreService);

  constructor() {
    this.startUserSync();
  }

  /**
   * Start listening to auth state changes and sync users to Firestore
   */
  private startUserSync(): void {
    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        await this.syncUserToFirestore(user);
      }
    });
  }

  /**
   * Sync user data to Firestore.
   * Creates or updates the user document.
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
   * Manually trigger user sync for the current user
   */
  async syncCurrentUser(): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await this.syncUserToFirestore(user);
    }
  }
}
