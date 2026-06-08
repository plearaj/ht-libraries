# Quickstart: Try `ht-quick-ngxfire` with Zero Firebase Setup

**Audience**: Angular app developers evaluating `ht-quick-ngxfire`, building a demo, or writing tests against the library — with no Firebase project required.
**Time**: ~5 minutes from `ng new` to "signed in, wrote a doc, read it back" (SC-001).

---

## TL;DR

Don't pass `firebaseOptions`. Everything simulates.

```ts
import { provideHtQuickNgxFire } from 'ht-quick-ngxfire';

bootstrapApplication(AppComponent, {
  providers: [
    provideHtQuickNgxFire({
      authOptions: { email: true, google: true },
      firestore: true,
      storage: true,
      database: false,
      functions: false,
      // firebaseOptions omitted — simulator activates for every enabled service
    }),
  ],
});
```

Drop `<ht-login>` into a template, sign in as anything, write Firestore docs, upload Storage blobs. No Firebase project. No network calls. Page reload resets everything.

---

## 1. Install

```bash
npm install ht-quick-ngxfire
```

(`@angular/fire` is bundled — no separate install required.)

## 2. Configure with no `firebaseOptions`

In `app.config.ts` (or wherever you bootstrap):

```ts
import { ApplicationConfig } from '@angular/core';
import { provideHtQuickNgxFire } from 'ht-quick-ngxfire';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHtQuickNgxFire({
      authOptions: { email: true, google: true },
      firestore: true,
      storage: true,
      database: false,
      functions: false,
    }),
  ],
};
```

You'll see one console warning at startup:

```
[ht-quick-ngxfire] Simulation mode active. Simulated services: auth, firestore, storage.
Set firebaseOptions to point at a real Firebase project to disable.
```

## 3. Drop in `<ht-login>`

```ts
import { Component } from '@angular/core';
import { HtLoginComponent } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-login-page',
  imports: [HtLoginComponent],
  template: `<ht-login (authResult)="onAuth($event)" />`,
})
export class LoginPageComponent {
  onAuth(result: { success: boolean }) {
    console.log('signed in:', result);
  }
}
```

You'll see the email/password form and a Google button. A small **"Simulation mode"** badge renders inside the component (FR-019).

Sign in with anything — `demo@example.com` / `whatever`. The promise resolves on the next microtask with a synthesized `User`. Sign in twice with the same email and you'll get the same `uid` (deterministic; FR-009 / R8).

> Want a polished demo and don't want the badge? Set `[showSimulationBadge]="false"`.

## 4. Read and write Firestore

```ts
import { Component, inject, OnInit } from '@angular/core';
import { HtFirestoreService } from 'ht-quick-ngxfire';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-notes',
  imports: [AsyncPipe],
  template: `
    @for (note of notes$ | async; track note.id) {
      <div>{{ note.body }}</div>
    }
  `,
})
export class NotesComponent implements OnInit {
  private firestore = inject(HtFirestoreService);
  notes$ = this.firestore.getCollectionData<{ id: string; body: string }>('notes');

  async ngOnInit() {
    await this.firestore.addDoc('notes', { body: 'Hello, simulator!' });
  }
}
```

Snapshot listeners fan out across the app — write from any component, every subscriber sees the update.

## 5. Upload a file

```ts
import { Component, inject } from '@angular/core';
import { HtStorageService } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-uploader',
  template: `<input type="file" (change)="onPick($event)" />`,
})
export class UploaderComponent {
  private storage = inject(HtStorageService);

  async onPick(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await this.storage.upload(`uploads/${file.name}`, file);
    const url = await this.storage.getDownloadURL(`uploads/${file.name}`);
    console.log('blob URL:', url);
    // The URL is a real blob URL; <img [src]="url"> works.
  }
}
```

Page reload = upload gone. That's by design (FR-014).

## 6. Render your own "demo mode" UI

```ts
import { Component, inject } from '@angular/core';
import { SimulationStatusService } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-shell',
  template: `
    @if (status.isAnySimulated) {
      <div class="banner">Demo mode — data resets on reload.</div>
    }
  `,
})
export class ShellComponent {
  status = inject(SimulationStatusService);
}
```

Read individual services with `status.get('firestore')` — returns `'real' | 'simulated' | 'disabled'`.

For hybrid setups, iterate the full per-service map to render a status pill for each one (FR-007):

```ts
import { Component, computed, inject } from '@angular/core';
import { SimulationStatusService, ServiceName, ServiceMode } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-status-pills',
  template: `
    @for (entry of entries(); track entry[0]) {
      <span class="pill pill--{{ entry[1] }}">{{ entry[0] }}: {{ entry[1] }}</span>
    }
  `,
})
export class StatusPillsComponent {
  private status = inject(SimulationStatusService);
  entries = computed<[ServiceName, ServiceMode][]>(() =>
    Array.from(this.status.services.entries()),
  );
}
```

> **Note on RTDB and Functions**: Auth, Firestore, and Storage have `Ht*Service` wrappers (`HtAuthService`, `HtFirestoreService`, `HtStorageService`) that transparently route to either real `@angular/fire` tokens or the simulator backend based on per-service activation. RTDB and Functions do **not** have wrapper services in this library — consumers using real RTDB/Functions today inject `@angular/fire/database` / `@angular/fire/functions` tokens directly, and consumers using the simulator inject `SimDatabaseBackend` / `SimFunctionsBackend` directly. The `SimulationStatusService` reports the activation decision for all five services uniformly, but the access pattern differs: three services route through Ht*Service wrappers, two are accessed via the Sim backend symbol when simulated.

---

## Common patterns

### Run simulation in CI / tests / Storybook (production builds)

In a production build, missing required `firebaseOptions` fields throw at bootstrap by default. Opt in with `simulation: 'force'`:

```ts
provideHtQuickNgxFire({
  authOptions: { email: true },
  firestore: true,
  storage: true,
  database: false,
  functions: false,
  simulation: 'force',
});
```

### Belt-and-braces: "this app must never simulate"

```ts
provideHtQuickNgxFire({
  authOptions: { email: true, google: true },
  firebaseOptions: { /* real config, perhaps from env */ },
  firestore: true,
  storage: true,
  database: false,
  functions: false,
  simulation: 'forbid',  // throws on any missing field, dev or prod
});
```

### Hybrid: real Storage, simulated Firestore (per-service activation)

Pass a `firebaseOptions` that satisfies Storage but is missing what Firestore needs:

```ts
provideHtQuickNgxFire({
  authOptions: { email: true },
  firebaseOptions: {
    apiKey: 'AIza...',
    storageBucket: 'my-app.appspot.com',
    // projectId intentionally omitted
  },
  firestore: true,   // → simulates (in dev)
  storage: true,     // → real
  database: false,
  functions: false,
});
```

The startup warning will name Firestore as simulated and Storage as real.

### Seed demo data for a stakeholder demo

The `Sim*Backend` classes are publicly injectable. Seed in your app initializer:

```ts
import { inject, APP_INITIALIZER } from '@angular/core';
import { SimFirestoreBackend, SimulationStatusService } from 'ht-quick-ngxfire';

{
  provide: APP_INITIALIZER,
  useFactory: () => {
    const status = inject(SimulationStatusService);
    if (status.get('firestore') !== 'simulated') return () => Promise.resolve();
    const sim = inject(SimFirestoreBackend);
    return async () => {
      await sim.setDoc('users/demo', { name: 'Demo User', role: 'admin' });
      await sim.setDoc('notes/welcome', { body: 'Welcome to the demo!' });
    };
  },
  multi: true,
}
```

### Stub a Cloud Function for a demo

```ts
import { inject } from '@angular/core';
import { SimFunctionsBackend } from 'ht-quick-ngxfire';

const fns = inject(SimFunctionsBackend);
fns.registerStub('summariseDoc', async ({ docId }) => {
  return { summary: `Pretend summary of ${docId}.` };
});
```

Unregistered callables resolve with `{ data: null }` and warn once per name per session.

---

## What the simulator does NOT do

- **Persist anything** across page reloads — by design (FR-014).
- **Emulate transaction contention.** `runTransaction` runs the callback once atomically; you'll see a one-time runtime warning the first time you commit a transaction in a session, telling you to validate transaction-bound code against real Firestore (FR-010a).
- **Network calls.** None. Ever. If you see one originating from `ht-quick-ngxfire`, it's a bug.
- **Multi-tab sync.** Each tab has its own simulator state.
- **Compatibility with the official Firebase Local Emulator Suite.** If you want emulator parity, point `firebaseOptions` at the emulator host and skip simulation mode entirely.

---

## Verification checklist (mirrors Success Criteria)

- [ ] **SC-001** — From a clean machine, `ng new` → install lib → sign in → write doc → read doc, all in under 5 minutes with zero Firebase setup.
- [ ] **SC-002** — Every method on `HtAuthService`, `HtFirestoreService`, `HtStorageService`, `HtAuthAdminService`, `HtAuthUserSyncService` runs without throwing in simulation mode.
- [ ] **SC-003** — `ng build --configuration production` with no `firebaseOptions` and `simulation: 'auto'` (default) fails at bootstrap with a clear, actionable error.
- [ ] **SC-004** — Existing apps that pass complete `firebaseOptions` see no behavior change after upgrading.
- [ ] **SC-005** — `ng build ht-quick-ngxfire` and `ng test ht-quick-ngxfire` both pass.
- [ ] **SC-006** — A test environment with network blocking sees zero outbound requests originating from the library while simulating.
- [ ] **SC-007** — Reload the page; simulated state is gone.
- [ ] **SC-008** — Hybrid setup (Storage real, Firestore simulated) boots cleanly; status map and warning reflect the split.
