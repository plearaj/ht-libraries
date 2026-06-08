# Phase 0 Research: ht-quick-ngxfire Simulation Mode

**Branch**: `004-ngxfire-sim-mode`
**Date**: 2026-05-09
**Inputs**: [spec.md](./spec.md), [plan.md](./plan.md)

This document resolves every NEEDS CLARIFICATION carried forward from `/speckit.clarify` plus the one architectural fork raised during planning. Each section follows the standard Decision / Rationale / Alternatives Considered shape.

---

## R1. Where in the stack does the simulator hook in?

**Decision**: Simulate at the `Ht*Service` level. Each existing `Ht*Service` (`HtAuthService`, `HtFirestoreService`, `HtStorageService`, `HtAuthAdminService`, `HtAuthUserSyncService`) is modified in-place to construct against either the real `@angular/fire` injection token (`Auth`, `Firestore`, `Storage`) **or** a paired in-memory backend (`SimAuthBackend`, `SimFirestoreBackend`, `SimStorageBackend`). The choice is made once, at construction, by reading the `SimulationStatusService` populated by `provideHtQuickNgxFire`. Cloud Functions and Realtime Database don't currently have a wrapping `Ht*Service`, so their simulator backends are exposed via two thin new injectable services that match the surface consumers would expect.

**Rationale**:
- The real Firebase SDK surface (`Auth`, `Firestore`, `Storage` instance objects + dozens of free functions like `signInWithEmailAndPassword`, `addDoc`, `runTransaction`, `getDownloadURL`) is **vast and version-coupled**. Producing in-memory objects that quack identically to the SDK's internals would force this library to track Firebase SDK versions byte-for-byte, breaking every minor `@angular/fire` upgrade.
- Every consumer-visible code path runs through the `Ht*Service` API. The spec (FR-002) explicitly bounds simulation coverage to *"the consumer-facing API"*. Simulating one layer up matches the contract exactly.
- Keeps the simulator surface to ~30 methods (the public `Ht*Service` API) instead of hundreds.
- The simulator `*.backend.ts` files become independently unit-testable plain TypeScript — no Angular DI, no zone, no AngularFire mocks.
- The `Ht*Service` change is a one-line constructor branch (`this.backend = inject(SimulationStatusService).get('firestore') === 'simulated' ? inject(SimFirestoreBackend) : new RealFirestoreBackend(inject(Firestore), inject(Injector))`). The rest of each service body becomes `this.backend.<method>(...)` — straightforward.
- Tree-shakeable: a build with `simulation: 'forbid'` plus complete `firebaseOptions` can drop the entire `simulation/` subtree.

**Alternatives considered**:
- **Simulate at the SDK level (provide fake `Auth` / `Firestore` instances).** Rejected — would require shadowing every modular SDK function (`signInWithEmailAndPassword`, `collection`, `doc`, `addDoc`, `runTransaction`, `getDownloadURL`, ~50+ symbols) and would break on every `@angular/fire` minor. The stated "supports the full surface area of each corresponding `Ht*Service`" explicitly does not require this.
- **Subclass each `Ht*Service` with a `Sim*Service` and conditionally provide one or the other.** Rejected — would force consumers to inject by abstract token (or risk the wrong concrete class being picked up by name) and would either duplicate validation logic across two classes (DRY violation) or produce a confusing inheritance hierarchy. Constructor-time backend switch keeps the public class identity stable and centralises validation.
- **Use `@angular/fire`'s emulator support (`connectAuthEmulator`, `connectFirestoreEmulator`).** Rejected — emulators are a separate process the consumer runs locally; the spec explicitly excludes "compatibility with the official Firebase Local Emulator Suite" and the value proposition is *zero external setup*.

---

## R2. Exact TypeScript shape of the `simulation` policy field

**Decision**: A **string literal union** typed as `SimulationPolicy = 'auto' | 'force' | 'forbid'`, with an optional `simulation` field on `FirebaseConfig` defaulting to `'auto'`.

```ts
export type SimulationPolicy = 'auto' | 'force' | 'forbid';

export interface FirebaseConfig {
  authOptions: AuthOptions;
  firebaseOptions?: FirebaseOptions;        // now optional (FR-015)
  firestore: boolean;
  database: boolean;
  functions: boolean;
  storage: boolean;
  simulation?: SimulationPolicy;            // default 'auto'
}
```

**Rationale**:
- String literals are the de-facto Angular/TypeScript idiom for tri-state config (matches the existing `preferRedirect?: boolean` pattern's spirit — small, additive, no new exported runtime symbol).
- Tree-shakeable: literals carry zero runtime weight; an enum would emit a runtime object even when unused.
- Discoverable in the IDE — autocomplete shows `'auto' | 'force' | 'forbid'` when the consumer types `simulation: '`.
- Aligns with `Constitution V (KISS)`: the simplest TS shape that expresses the three behaviors. Enums and symbols add ceremony without buying anything.
- Easy migration if a future state is added: extending the union is non-breaking; extending an enum at non-trailing indices is breaking.

**Alternatives considered**:
- **`enum SimulationPolicy { Auto, Force, Forbid }`.** Rejected — emits a runtime object even when unused, can't be set inline as a literal in the consumer's call (forces an import of the enum), worse autocomplete UX (`SimulationPolicy.Auto` vs `'auto'`).
- **`SimulationPolicy = SimulationAuto | SimulationForce | SimulationForbid` (symbols / branded types).** Rejected — overkill for a config field; nothing in the codebase needs nominal typing here.
- **Boolean `simulation?: boolean`** (the original spec working name). Rejected during `/speckit.clarify` Q3 — can't express the `'forbid'` case.
- **Object form `simulation?: { allowInProd?: boolean; required?: boolean }`.** Rejected — strictly worse ergonomics for the same expressive power, and easier to combine flags into invalid states.

---

## R3. Default response shape for the simulated Cloud Functions stub

**Decision**: Default response is a resolved `Promise<{ data: null }>` — matching the shape `httpsCallable` returns from `@angular/fire/functions` (a `HttpsCallableResult<T>` with a `data` property, where `data` defaults to `null`). Consumers may register a per-callable stub via `SimFunctionsBackend.registerStub(name, handler)` where `handler` is `(payload: unknown) => unknown | Promise<unknown>`.

```ts
export interface SimFunctionsBackend {
  registerStub(name: string, handler: (payload: unknown) => unknown | Promise<unknown>): void;
  clearStubs(): void;                        // for test isolation
}
```

When the consumer calls a callable that has **no registered stub**, the simulator resolves with `{ data: null }` and emits one runtime debug warning per unregistered name per session (so the consumer knows which callables to register if they care).

**Rationale**:
- `{ data: null }` is the **shape**, not the value — code that does `result.data?.foo` won't blow up; code that asserts a specific shape will fail loudly, which is the right default for an unregistered stub.
- A `Promise`-resolving shape (vs. `() => null`) matches `httpsCallable`'s real signature, so consumer code that does `await functions.httpsCallable('foo')(payload)` keeps working.
- The `registerStub` + `clearStubs` pair is the smallest API that supports both demo seeding and per-test isolation.
- The one-warning-per-name-per-session bound is the same pattern FR-010a uses for transactions — keeps the dev console quiet but informative.
- Aligns with `Constitution V (YAGNI)`: no chained matchers, no payload assertions, no recording — those would be speculative test-framework features.

**Alternatives considered**:
- **Throw `not implemented` for any unregistered callable.** Rejected — too aggressive for the "I just want CRUD demoing" P1 scenario; would force every consumer to register stubs even when they're not testing Functions paths.
- **Return `undefined`.** Rejected — doesn't match the `HttpsCallableResult` shape; consumers reading `result.data` would get a TypeError on the property access.
- **Return the input payload echoed back.** Rejected — reads as "magic" behavior that masks missing stubs; the explicit `{ data: null }` is more honest.

---

## R4. How is "auth enabled" detected for the per-service activation decision?

**Decision**: Auth is considered enabled when the supplied `authOptions` has at least one of `email | google | facebook | twitter | github | microsoft | apple` set to `true`. If none are enabled, the activation decision treats Auth as `disabled` and skips both real-Firebase Auth init and the SimAuth backend.

**Rationale**:
- Matches the existing convention in `ht-quick-ngxfire.providers.ts` where `provideAuth(...)` is currently registered unconditionally regardless of `authOptions` content. This change tightens that to "register only when at least one provider is requested" — a quiet improvement that aligns with FR-013's per-service philosophy.
- The spec's FR-001 says "auth — driven by `authOptions` having any provider enabled" — this codifies the rule precisely.
- Avoids a confusing case where Auth simulates with no providers but `<ht-login>` renders an empty form (already handled by FR-AUTH-15 in `001-quick-ngxfire`, which says the component renders an empty state when no providers are enabled — preserved here).

**Alternatives considered**:
- **Always treat auth as enabled.** Rejected — would ship an unused `Auth` instance into the injector for consumers who only want Firestore.
- **Add an explicit `auth: true` flag to `FirebaseConfig`.** Rejected — `authOptions` already carries that signal; adding a redundant flag invites the two to disagree.

---

## R5. How does the simulator activate when `firebaseOptions` is supplied but a single field is the empty string?

**Decision**: A field is considered "present" only if it is a non-empty string after trimming. `apiKey: ''` is treated identically to `apiKey: undefined` — both cause the per-service check to count `apiKey` as missing. This is already in FR-001a; documenting it here so the activation function has a single test-anchored rule.

**Rationale**:
- The most common partial-config bug is an unsubstituted environment variable (`apiKey: process.env.API_KEY` resolves to `''` if the var isn't set). Treating `''` as "missing" catches that bug at bootstrap rather than at first auth call.
- Matches the spirit of FR-005's prod-safety guarantee — the developer almost certainly meant for the field to be set.

**Alternatives considered**:
- **Treat `''` as present.** Rejected — silently "configures" the SDK with garbage; would let the bug propagate.
- **Throw on `''` regardless of policy.** Rejected — the policy field already handles forbid/force; this should defer to the same single decision path.

---

## R6. How is `isDevMode()` called from a pure activation function?

**Decision**: `decideActivation(...)` accepts the dev-mode boolean as a parameter rather than calling `isDevMode()` itself. The provider function (`provideHtQuickNgxFire`) reads `isDevMode()` once and passes the result in. This keeps `decideActivation` a **pure synchronous function** suitable for unit testing without any Angular runtime.

```ts
export function decideActivation(input: {
  config: FirebaseConfig;
  isDevMode: boolean;
}): ActivationDecision { ... }
```

**Rationale**:
- Pure functions are the lowest-friction unit-test targets — no Angular TestBed, no spies on `@angular/core` exports.
- `isDevMode()` is a one-call-per-app-init concept anyway; threading the boolean through is trivial.
- Aligns with `Constitution V (KISS)`: one synchronous function, one input, one output.

**Alternatives considered**:
- **Call `isDevMode()` inside the function.** Rejected — couples the activation logic to the Angular runtime and forces every test to either run inside a TestBed or monkey-patch `isDevMode`.
- **Inject a `DEV_MODE` token.** Rejected — over-engineered for a one-shot boolean.

---

## R7. How does the `<ht-login>` simulation badge know simulation is active?

**Decision**: `<ht-login>` injects `SimulationStatusService` and reads its `auth` slot (`'real' | 'simulated' | 'disabled'`). The badge renders only when the slot equals `'simulated'` AND the new `[showSimulationBadge]` input (default `true`) is truthy. This keeps the component free of any direct knowledge of `provideHtQuickNgxFire`'s decision algorithm.

**Rationale**:
- Same status surface that consumers use for their own demo-mode UI (FR-007) — DRY.
- Component-side render is pure template logic (`@if (status.auth === 'simulated' && showSimulationBadge()) { ... }`) — no async, no zone shenanigans.
- When auth is real (hybrid app), the badge stays hidden regardless of input value, satisfying FR-019's last sentence.

**Alternatives considered**:
- **Pass simulation status as an `@Input` from the consumer.** Rejected — pushes plumbing onto the consumer and risks the input going stale.
- **Read directly from a global `window.__HT_SIM__` symbol.** Rejected — leaks implementation; can't be tested cleanly.

---

## R8. How are simulator snapshot listeners' "next-microtask" semantics implemented?

**Decision**: Use `queueMicrotask(...)` for asynchronous resolution of sign-in promises and `Promise.resolve().then(...)` for snapshot-listener fan-out. RxJS `BehaviorSubject` (or plain `Subject` with replay) backs each listener bus and emits synchronously inside the microtask callback. No `setTimeout`, no Zone-only tricks.

**Rationale**:
- Matches the spec's explicit "next microtask, not synchronously" language for sign-in (Edge Cases / FR-008) — observable loading state without dragging in `setTimeout`'s scheduling jitter.
- `queueMicrotask` is supported in every modern browser; no polyfill needed for the library's target platform.
- Existing `Ht*Service` callers expect `Promise`s and RxJS `Observable`s — same shapes are produced by the simulator without new wrappers.

**Alternatives considered**:
- **Synchronous resolution.** Rejected by the spec (loading state must be observable).
- **`setTimeout(..., 0)`.** Rejected — slower and clock-coupled; tests using `fakeAsync` already handle microtasks via `flushMicrotasks()`.
- **Zone.js direct interaction.** Rejected — Constitution II asks for zoneless-ready code; sticking to standard async primitives keeps the simulator zoneless-compatible.

---

## R9. How does the activation decision compose its startup warning under hybrid configurations?

**Decision**: `decideActivation` returns an `ActivationDecision` containing a per-service map (`auth | firestore | database | functions | storage` → `'real' | 'simulated' | 'disabled'`) plus an optional `warning` payload (`{ simulated: ServiceName[], real: ServiceName[], missingFields: Record<ServiceName, string[]> }`). `provideHtQuickNgxFire` consumes that and emits a single `console.warn` whose body is rendered from the payload — exactly once per app init (guarded by a static module-level `Set<string>` keyed by app instance id, so two `provideHtQuickNgxFire` calls in the same page session don't double-warn).

**Rationale**:
- One source of truth for the warning text — the activation decision builds the data, the provider renders it. DRY.
- Test-friendly — the decision object is plain data; the provider's rendering can be spied on independently.
- The deduplication key uses the resolved decision shape, so two identical re-inits collapse to one warning while two genuinely different inits would produce two distinct warnings (rare but possible in test harnesses).

**Alternatives considered**:
- **Build the warning string inside `decideActivation`.** Rejected — couples pure logic to console formatting and forces tests to assert on string contents.
- **No deduplication.** Rejected — FR-004 explicitly requires "MUST NOT spam the warning" across repeat initializations.

---

## R10. Where do `HtAuthAdminService` and `HtAuthUserSyncService` get their backing Firestore in simulation?

**Decision**: Both services already inject `HtFirestoreService` (or `Firestore` directly) for their role/profile reads. In simulation mode, they read from the **same `SimFirestoreBackend` instance** that `HtFirestoreService` is reading from — guaranteed by registering `SimFirestoreBackend` as `providedIn: 'root'` (singleton). This satisfies FR-017 ("end-to-end demonstrable") without any service-specific simulator code.

**Rationale**:
- Singleton sim backend = automatic cross-service data consistency; a write by `HtAuthUserSyncService` is immediately visible to a `HtFirestoreService` query the next component runs.
- Zero new code in `HtAuthAdminService` / `HtAuthUserSyncService` — they keep injecting their existing dependencies; the dependency just happens to be running on the simulator backend.
- DRY — one Firestore simulator instance per app, used everywhere.

**Alternatives considered**:
- **Per-service simulator instance.** Rejected — would mean `HtAuthUserSyncService.syncOnLogin()` writes a role document the role guard can't read. Defeats the demo purpose.
- **Explicit `SimFirestoreBackend` injection in each consumer.** Rejected — every consumer would need conditional code; the singleton + sim-aware `HtFirestoreService` keeps consumers ignorant.

---

## Resolution Summary

| Open item from `/speckit.clarify` or planning | Resolved in |
|---|---|
| Exact TS shape of `simulation` field | R2 — `SimulationPolicy = 'auto' \| 'force' \| 'forbid'` (string-literal union) |
| Default Functions stub response shape | R3 — `Promise<{ data: null }>` with `registerStub` + `clearStubs` registry |
| Architecture: simulate at SDK or service level | R1 — service level; simulator backends live under `simulation/` |
| `authOptions` → "auth enabled" rule | R4 — any provider flag truthy |
| Empty-string field handling | R5 — treated as missing |
| `isDevMode()` invocation point | R6 — provider reads, decision function is pure |
| Badge wiring | R7 — `<ht-login>` reads `SimulationStatusService` |
| Async / microtask semantics | R8 — `queueMicrotask` + RxJS subjects |
| Hybrid warning composition | R9 — pure decision builds payload, provider renders + dedupes |
| Cross-service Firestore consistency | R10 — singleton `SimFirestoreBackend` |

No NEEDS CLARIFICATION markers remain. Ready for Phase 1.
