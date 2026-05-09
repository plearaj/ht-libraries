# FirebaseUI Auth Integration

Your library now includes **FirebaseUI Auth** with full modular API compatibility!

## ✅ What's Included

- **HtAuthUIService** - Service for programmatic FirebaseUI control
- **HtAuthUIComponent** - Standalone component for easy integration
- **Modular API** - Uses modern Firebase modular imports
- **Angular 21 Compatible** - Uses inject() methodology

## Installation in Your App

The library bundles FirebaseUI, but you need to include the CSS in your app.

### 1. Add FirebaseUI CSS to your `angular.json`:

```json
{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "options": {
            "styles": [
              "src/styles.scss",
              "node_modules/firebaseui/dist/firebaseui.css"
            ]
          }
        }
      }
    }
  }
}
```

Or import in your global `styles.scss`:
```scss
@import 'firebaseui/dist/firebaseui.css';
```

## Usage Examples

### Option 1: Using the Component (Easiest)

```typescript
import { Component } from '@angular/core';
import { HtAuthUIComponent, FirebaseUIConfig } from 'ht-quick-ngxfire';
import * as firebaseui from 'firebaseui';

@Component({
  selector: 'app-login',
  imports: [HtAuthUIComponent],
  template: `
    <div class="login-container">
      <h1>Sign In</h1>
      <ht-auth-ui [config]="uiConfig"></ht-auth-ui>
    </div>
  `
})
export class LoginComponent {
  uiConfig: FirebaseUIConfig = {
    signInOptions: [
      'google.com',
      'facebook.com',
      'password'
    ],
    signInSuccessUrl: '/dashboard',
    tosUrl: '/terms',
    privacyPolicyUrl: '/privacy',
    callbacks: {
      signInSuccessWithAuthResult: (authResult, redirectUrl) => {
        console.log('User signed in:', authResult.user);
        return true; // Redirect
      }
    }
  };
}
```

### Option 2: Using the Service (More Control)

```typescript
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { HtAuthUIService } from 'ht-quick-ngxfire';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <h1>Sign In</h1>
      <div id="firebaseui-auth-container"></div>
    </div>
  `
})
export class LoginComponent implements OnInit, OnDestroy {
  private authUIService = inject(HtAuthUIService);
  private router = inject(Router);

  ngOnInit() {
    this.authUIService.startUI('#firebaseui-auth-container', {
      signInOptions: ['google.com', 'password'],
      callbacks: {
        signInSuccessWithAuthResult: (authResult) => {
          console.log('User:', authResult.user);
          this.router.navigate(['/dashboard']);
          return false; // Manual redirect
        }
      }
    });
  }

  ngOnDestroy() {
    this.authUIService.reset();
  }
}
```

### Option 3: Using AuthOptions from Config

```typescript
import { Component, inject } from '@angular/core';
import { HtAuthUIService } from 'ht-quick-ngxfire';
import { AUTH_OPTIONS } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-login',
  template: `<div id="auth-container"></div>`
})
export class LoginComponent {
  private authUIService = inject(HtAuthUIService);
  private authOptions = inject(AUTH_OPTIONS);

  ngOnInit() {
    // Get sign-in options from your app.config.ts settings
    const signInOptions = this.authUIService.getSignInOptionsFromConfig(this.authOptions);
    
    this.authUIService.startUI('#auth-container', {
      signInOptions,
      signInSuccessUrl: '/dashboard'
    });
  }
}
```

## Monitoring Auth State

```typescript
import { Component, signal, inject, OnInit } from '@angular/core';
import { HtAuthUIService } from 'ht-quick-ngxfire';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  template: `
    @if (user()) {
      <div>Welcome, {{ user()?.displayName }}</div>
      <button (click)="signOut()">Sign Out</button>
    } @else {
      <app-login></app-login>
    }
  `
})
export class AppComponent implements OnInit {
  private authUIService = inject(HtAuthUIService);
  user = signal<User | null>(null);

  ngOnInit() {
    this.authUIService.user$.subscribe(user => {
      this.user.set(user);
    });
  }

  async signOut() {
    await this.authUIService.signOut();
  }
}
```

## Available Sign-In Methods

```typescript
const signInOptions = [
  'google.com',              // Google
  'facebook.com',            // Facebook  
  'twitter.com',             // Twitter
  'github.com',              // GitHub
  'password',                // Email/Password
  'phone',                   // Phone
  'apple.com',               // Apple
  'microsoft.com',           // Microsoft
  'yahoo.com',               // Yahoo
  // ... and more
];
```

## Advanced Configuration

```typescript
const config: FirebaseUIConfig = {
  signInOptions: [
    {
      provider: 'google.com',
      scopes: ['https://www.googleapis.com/auth/contacts.readonly'],
      customParameters: {
        prompt: 'select_account'
      }
    },
    {
      provider: 'password',
      requireDisplayName: true,
      signInMethod: 'password'
    }
  ],
  signInSuccessUrl: '/dashboard',
  tosUrl: '/terms',
  privacyPolicyUrl: '/privacy',
  credentialHelper: 'googleyolo', // or 'none'
  autoUpgradeAnonymousUsers: true,
  callbacks: {
    signInSuccessWithAuthResult: (authResult, redirectUrl) => {
      // Custom logic after sign-in
      return true;
    },
    signInFailure: async (error) => {
      // Handle errors
      console.error(error);
    },
    uiShown: () => {
      // UI is rendered
    }
  }
};
```

## Service Methods

### HtAuthUIService

- `startUI(element, config)` - Start FirebaseUI widget
- `getUI()` - Get FirebaseUI instance
- `reset()` - Reset the widget
- `delete()` - Delete the instance
- `isPendingRedirect()` - Check if redirect is pending
- `user$` - Observable of current user
- `currentUser` - Get current user synchronously
- `signOut()` - Sign out the user
- `getSignInOptionsFromConfig(authOptions)` - Convert AuthOptions to sign-in options

## Styling

FirebaseUI comes with default styling. You can customize it:

```scss
// In your styles.scss
.firebaseui-container {
  max-width: 400px;
  margin: 0 auto;
}

.firebaseui-card-content {
  padding: 24px;
}

.firebaseui-button {
  border-radius: 8px;
}
```

## Compatibility

✅ **Modular API** - Uses modern Firebase imports
✅ **Angular 21** - inject() methodology  
✅ **Zoneless** - Compatible with zoneless mode
✅ **Standalone** - Fully standalone components
✅ **TypeScript** - Full type safety

## Notes

- FirebaseUI is bundled with the library - consuming apps don't need to install it
- The CSS must be included in your app (not bundled)
- Works seamlessly with the rest of your ht-quick-ngxfire services
- Uses the same Auth instance configured in your app.config.ts
