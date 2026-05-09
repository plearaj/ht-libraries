# Data Model: ht-quick-ngxfire

## Entities

### AuthOptions (Configuration — updated)

| Field | Type | Default | Description |
|---|---|---|---|
| `email` | `boolean?` | `undefined` | Enable email/password auth |
| `google` | `boolean?` | `undefined` | Enable Google SSO |
| `facebook` | `boolean?` | `undefined` | Enable Facebook SSO |
| `twitter` | `boolean?` | `undefined` | Enable Twitter/X SSO |
| `github` | `boolean?` | `undefined` | Enable GitHub SSO |
| `microsoft` | `boolean?` | `undefined` | Enable Microsoft SSO |
| `apple` | `boolean?` | `undefined` | Enable Apple SSO |
| `preferRedirect` | `boolean?` | `false` | Use redirect flow instead of popup for SSO |

### FirebaseConfig (Configuration — unchanged structure)

| Field | Type | Required | Description |
|---|---|---|---|
| `authOptions` | `AuthOptions` | Yes | Auth provider configuration |
| `firebaseOptions` | `FirebaseOptions` | Yes | Firebase project config |
| `firestore` | `boolean` | Yes | Enable Firestore provider |
| `database` | `boolean` | Yes | Enable Realtime Database provider |
| `functions` | `boolean` | Yes | Enable Cloud Functions provider |
| `storage` | `boolean` | Yes | Enable Cloud Storage provider |

### AuthResult (New — component output)

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | Whether authentication succeeded |
| `user` | `User \| null` | Firebase Auth User object |
| `error` | `{ code: string; message: string }?` | Error details on failure |
| `isNewUser` | `boolean?` | True if user was just created |

### UserRole (Firestore — unchanged)

| Field | Type | Description |
|---|---|---|
| `role` | `string` | Role name (e.g., 'admin', 'user', 'moderator') |
| `permissions` | `string[]?` | Permission strings |
| `createdAt` | `Date?` | Role assignment timestamp |
| `updatedAt` | `Date?` | Last modification timestamp |

### UserProfile (Firestore — unchanged except `metadata` type)

| Field | Type | Description |
|---|---|---|
| `uid` | `string` | Firebase Auth UID |
| `email` | `string \| null` | Email address |
| `displayName` | `string \| null` | Display name |
| `photoURL` | `string \| null` | Profile photo URL |
| `role` | `UserRole?` | Assigned role |
| `disabled` | `boolean?` | Account disabled flag |
| `createdAt` | `Date?` | Account creation timestamp |
| `lastLogin` | `Date?` | Last login timestamp |
| `metadata` | `Record<string, unknown>?` | Arbitrary metadata (changed from `any` to `unknown`) |

### FireStoreBatchOperation (Firestore — unchanged)

| Field | Type | Description |
|---|---|---|
| `operation` | `'set' \| 'update' \| 'delete'` | Batch operation type |
| `docRef` | `DocumentReference` | Target document |
| `data` | `Record<string, unknown>?` | Document data (not for delete) |

## Firestore Collections

### `users/{uid}` (unchanged)

Stores synced user profiles with roles and permissions. Fields map to `UserProfile` + inline role/permissions fields:

```
users/{uid}
├── uid: string
├── email: string | null
├── displayName: string | null
├── photoURL: string | null
├── emailVerified: boolean
├── role: string
├── permissions: string[]
├── disabled?: boolean
├── createdAt: Timestamp
├── lastLogin: Timestamp
├── updatedAt: Timestamp
├── invited?: boolean
└── metadata?: map
```

**Note**: Per constitution, roles and permissions are stored as fields on `users/{uid}` — not as subcollections.
