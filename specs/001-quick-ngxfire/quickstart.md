# Quickstart: ht-quick-ngxfire

## Installation

```bash
# From workspace root
ng build ht-quick-ngxfire

# In consuming app
npm install dist/ht-quick-ngxfire
```

## Configuration

```typescript
// app.config.ts
import { provideHtQuickNgxFire } from 'ht-quick-ngxfire';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHtQuickNgxFire({
      firebaseOptions: {
        apiKey: '...',
        authDomain: '...',
        projectId: '...',
        storageBucket: '...',
        messagingSenderId: '...',
        appId: '...',
      },
      authOptions: {
        google: true,
        github: true,
        email: true,
      },
      firestore: true,
      database: false,
      functions: false,
      storage: true,
    }),
  ],
};
```

## Login Component

```typescript
// login.component.ts
import { Component } from '@angular/core';
import { HtLoginComponent, AuthResult } from 'ht-quick-ngxfire';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [HtLoginComponent],
  template: `
    <ht-login
      [authOptions]="authOptions"
      (authResult)="onAuth($event)"
    />
  `,
})
export class LoginComponent {
  authOptions = { google: true, github: true, email: true };

  constructor(private router: Router) {}

  onAuth(result: AuthResult) {
    if (result.success) {
      this.router.navigate(['/dashboard']);
    }
  }
}
```

## Route Guards

```typescript
// app.routes.ts
import { htAuthRedirectGuard, htRoleGuard, htAdminGuard } from 'ht-quick-ngxfire';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [htAuthRedirectGuard],
    data: { redirectTo: '/login' },
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [htAdminGuard],
  },
  {
    path: 'moderator',
    component: ModeratorComponent,
    canActivate: [htRoleGuard],
    data: { roles: ['admin', 'moderator'], redirectTo: '/unauthorized' },
  },
];
```

## Firestore Service

```typescript
import { inject } from '@angular/core';
import { HtFirestoreService } from 'ht-quick-ngxfire';

const firestore = inject(HtFirestoreService);

// Read collection
const users$ = firestore.getCollectionData<User>('users');

// Add document
const docRef = await firestore.addDoc('users', { name: 'Alice', email: 'alice@example.com' });

// Update document
await firestore.updateDoc('users/abc123', { displayName: 'Alice Smith' });

// Query
import { where } from '@angular/fire/firestore';
const q = firestore.createQuery('users', where('role', '==', 'admin'));
const admins$ = firestore.getCollectionData<User>(q);
```

## Storage Service

```typescript
import { inject } from '@angular/core';
import { HtStorageService } from 'ht-quick-ngxfire';

const storage = inject(HtStorageService);

// Upload file with progress
const url = await storage.uploadWithProgress(
  'uploads/photo.jpg',
  file,
  undefined,
  (progress) => console.log(`${progress}%`)
);

// Get download URL
const url$ = storage.getDownloadURL('uploads/photo.jpg');

// Delete file
await storage.deleteFile('uploads/photo.jpg');
```

## Auth Service (Programmatic)

```typescript
import { inject } from '@angular/core';
import { HtAuthService } from 'ht-quick-ngxfire';

const auth = inject(HtAuthService);

// Current user as signal
const user = auth.currentUser; // Signal<User | null>

// Sign in with Google
await auth.signInWithProvider('google.com');

// Sign in with email
await auth.signInWithEmail('alice@example.com', 'password123');

// Sign out
await auth.signOut();
```
