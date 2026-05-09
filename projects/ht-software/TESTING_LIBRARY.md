# Testing ht-quick-ngxfire Library

## Setup Complete ✓

Your `ht-software` app is now configured to use the `ht-quick-ngxfire` library locally.

## Configuration

The library has been added to `app.config.ts` with a sample Firebase configuration.

### Update Firebase Config

1. Open `projects/ht-software/src/app/app.config.ts`
2. Replace the placeholder values with your actual Firebase project credentials:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## Using the Firestore Service

The `HtFirestoreService` is already imported in `app.component.ts` as an example.

### Example Usage:

```typescript
import { HtFirestoreService } from 'ht-quick-ngxfire';

export class MyComponent {
  firestoreService = new HtFirestoreService();
  
  constructor() {
    // Get collection data
    this.firestoreService.getCollectionData<MyType>('my-collection')
      .subscribe(data => {
        console.log('Data:', data);
      });
    
    // Add a document
    this.firestoreService.addDoc('my-collection', { name: 'Test' });
    
    // Update a document
    this.firestoreService.updateDoc('my-collection/doc-id', { name: 'Updated' });
    
    // Delete a document
    this.firestoreService.deleteDoc('my-collection/doc-id');
  }
}
```

## Running the App

```bash
# Make sure libraries are built
ng build ht-quick-ngxfire
ng build ht-quick-angular-table

# Serve the app
ng serve ht-software
```

## Benefits of Your Library Setup

✅ **No AngularFire installation needed** - Consuming apps don't need to install `@angular/fire`
✅ **Angular 21 compatible** - Uses modern inject() methodology
✅ **Zoneless ready** - Works perfectly with Angular 21's zoneless mode
✅ **Type-safe** - Full TypeScript support

## Next Steps

1. Update Firebase config with your credentials
2. Create a Firestore collection in your Firebase console
3. Uncomment the example code in `app.component.ts`
4. Run `ng serve ht-software` to test
