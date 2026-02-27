# Using ht-quick-ngxfire in External Apps

Your libraries have been configured for local testing outside this workspace.

## Quick Setup (Already Done ✅)

The libraries have been linked globally:
- `ht-quick-ngxfire` 
- `ht-quick-angular-table`

## Using in Your External App

### 1. Navigate to your external app directory
```bash
cd C:\path\to\your\external\app
```

### 2. Link the library to your app
```bash
npm link ht-quick-ngxfire
```

Or for the table library:
```bash
npm link ht-quick-angular-table
```

### 3. Configure your app

Add to your `app.config.ts`:
```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHtQuickNgxFire } from 'ht-quick-ngxfire';
import { routes } from './app.routes';

const firebaseConfig = {
  firebaseOptions: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  },
  authOptions: {
    email: true,
    google: false
  },
  firestore: true,
  database: false,
  functions: false,
  storage: false
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHtQuickNgxFire(firebaseConfig)
  ]
};
```

### 4. Use the Firestore service

```typescript
import { Component } from '@angular/core';
import { HtFirestoreService } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-root',
  template: `<h1>My App</h1>`
})
export class AppComponent {
  firestoreService = new HtFirestoreService();
  
  constructor() {
    // Get collection data
    this.firestoreService.getCollectionData<any>('users')
      .subscribe(users => console.log(users));
  }
}
```

## Making Changes to the Library

When you update the library code:

1. **Rebuild the library:**
   ```bash
   cd C:\Users\ajple\Programming Projects\ht-libraries
   ng build ht-quick-ngxfire
   ```

2. **Changes are automatically reflected** in linked apps (no need to re-link)

3. **Restart your dev server** in the external app to see changes

## Unlinking (When Done Testing)

In your external app:
```bash
npm unlink ht-quick-ngxfire
npm install
```

## Publishing to NPM (When Ready)

### 1. Update version in package.json
```bash
cd C:\Users\ajple\Programming Projects\ht-libraries\projects\ht-quick-ngxfire
# Edit package.json version
```

### 2. Build the library
```bash
ng build ht-quick-ngxfire
```

### 3. Publish
```bash
cd dist\ht-quick-ngxfire
npm publish
```

### 4. Install in apps normally
```bash
npm install ht-quick-ngxfire
```

## Key Benefits

✅ **No AngularFire installation** - Apps don't need `@angular/fire` as a dependency
✅ **Angular 21 compatible** - Uses modern inject() methodology
✅ **Zoneless ready** - Works with Angular 21's zoneless mode
✅ **TypeScript support** - Full type safety
✅ **Local testing** - Test changes immediately with npm link

## Available Services & Methods

### HtFirestoreService
- `getCollectionData<T>(path)` - Observable of collection data
- `addDoc(path, data)` - Add document
- `updateDoc(docPath, data)` - Update document
- `setDoc(docPath, data)` - Set document (overwrites)
- `deleteDoc(docPath)` - Delete document
- `writeBatch(operations)` - Batch operations
- `getCountFromServer(query)` - Get count
- `createCollectionRef(path, converter?)` - Create collection reference
- `getDocData(path, converter?, passId?)` - Get document as Observable

## Troubleshooting

### "Cannot find module 'ht-quick-ngxfire'"
- Make sure you ran `npm link ht-quick-ngxfire` in your external app
- Verify the library is built: `ls C:\Users\ajple\Programming Projects\ht-libraries\dist\ht-quick-ngxfire`

### Changes not appearing
- Rebuild the library: `ng build ht-quick-ngxfire`
- Restart your dev server in the external app

### Peer dependency warnings
- The library bundles AngularFire, so these can be ignored
- Your app only needs Angular 21+ installed
