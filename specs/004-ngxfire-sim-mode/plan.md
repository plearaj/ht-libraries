# Implementation Plan: ht-quick-ngxfire Simulation Mode

**Branch**: `004-ngxfire-sim-mode` | **Date**: 2026-05-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-ngxfire-sim-mode/spec.md`

## Summary

When a consumer calls `provideHtQuickNgxFire(...)` without supplying the Firebase web config (or with one missing the fields a particular service needs), the library transparently runs each under-configured service against an in-memory simulator instead of failing at app bootstrap. Activation is decided **per service** at provider-evaluation time using a frozen required-field map (FR-001a) and a tri-state `simulation: 'auto' | 'force' | 'forbid'` policy on `FirebaseConfig` (FR-005). Hybrid apps — some services real, others simulated — are first-class.

**Technical approach**: Replace each `Ht*Service` (Auth, Firestore, Storage, Auth-Admin, Auth-User-Sync) with a *sim-aware* implementation that switches its underlying source between the real `@angular/fire` instance (`Auth`, `Firestore`, `Storage`) and a paired in-memory simulator (`SimAuthBackend`, `SimFirestoreBackend`, `SimStorageBackend`, `SimDatabaseBackend`, `SimFunctionsBackend`) at construction. The provider function decides which mode each service runs in; the consumer-visible API is unchanged. This avoids forking the `@angular/fire` SDK contract and limits the simulator surface to the existing `Ht*Service` public methods.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode), Angular 21
**Primary Dependencies**: `@angular/fire` ^21.0.0 (bundled, peer-coexisting), RxJS ~7.8.0
**Storage**: In-memory Maps (per-page-session); no persistent browser storage (FR-014)
**Testing**: `ng test ht-quick-ngxfire` (Karma + Jasmine, the library's existing harness)
**Target Platform**: Modern browsers (Angular library; no Node-specific APIs)
**Project Type**: Single Angular library (`projects/ht-quick-ngxfire`)
**Performance Goals**: Simulator operations resolve on the next microtask (FR-008 / Edge Cases). No throughput targets — simulator is for dev/demo/test only.
**Constraints**: Zero outbound network calls when simulating (FR-003); ephemeral state per page session (FR-014); coexists with `@angular/fire` ^21.0.0 without forking (Constraints); existing public API stays non-breaking (FR-015); `ng build ht-quick-ngxfire` and the existing test suite stay green (SC-005)
**Scale/Scope**: Dev / demo / test workloads — small in-memory datasets, single tab, single Angular app. Multi-tab / multi-app simulation is out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution version evaluated: **1.1.0**.

| Principle | Status | Evidence |
|---|---|---|
| **I. Library-First Architecture** | ✅ PASS | Feature lives entirely inside `projects/ht-quick-ngxfire`. No new workspace project; no code added to root or `ht-software`. |
| **II. Modern Angular Patterns (NON-NEGOTIABLE)** | ✅ PASS | Sim-aware services keep `inject()`-only construction; `<ht-login>` keeps `OnPush` + `input()`/`output()`; `runInInjectionContext` continues to wrap AngularFire helpers in real-mode paths; no `any` is introduced (existing strict-mode constraints carry over verbatim). |
| **III. Minimal & Stable Public API** | ✅ PASS | `firebaseOptions` becomes optional (additive). `simulation: 'auto' \| 'force' \| 'forbid'` is a new optional field with a default that preserves current behavior. New `[showSimulationBadge]` input on `<ht-login>` defaults to `true` (zero-config) but is optional. All existing exports keep their signatures. `allowedNonPeerDependencies` is unchanged — no new bundled deps. Migration note will document the additive shape. |
| **IV. Build & Test Gate** | ✅ PASS | `ng build ht-quick-ngxfire` and `ng test ht-quick-ngxfire` are part of the success criteria (SC-005). Test additions are scoped to new sim-aware paths and the new activation decision. |
| **V. DRY, YAGNI & KISS** | ✅ PASS | **DRY**: the per-service required-field map (FR-001a) lives in one constant — referenced by both the activation decision and the production-mode error message. **YAGNI**: no fixture-loading API, no inspector panel, no persistence — every speculative simulator feature stayed in Out of Scope. **KISS**: simulate at the `Ht*Service` level (smaller surface) rather than at the SDK level (would require shadowing `@angular/fire` internals); the activation decision is one synchronous function over a small frozen map. |

**Result**: All gates pass. No Complexity Tracking entry required. Re-check scheduled after Phase 1 design.

### Post-Design Re-check (after Phase 1 artifacts)

Re-evaluated against `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`:

| Principle | Status | Post-design evidence |
|---|---|---|
| **I. Library-First** | ✅ PASS | All Phase 1 source-code paths live under `projects/ht-quick-ngxfire/src/lib/`. The new `simulation/` subtree is one cohesive unit inside the library, not a cross-project utility. |
| **II. Modern Angular Patterns** | ✅ PASS | Every Sim*Backend is `@Injectable({ providedIn: 'root' })` and uses `inject()` (data-model E7–E11). `<ht-login>` keeps `OnPush`, uses `input()` for `showSimulationBadge` (R7). Pure `decideActivation` (R6) takes the `isDevMode` boolean as a parameter — no Angular runtime coupling, easier zoneless story. No `any` in any contract. |
| **III. Minimal & Stable Public API** | ✅ PASS | Net-new public exports: `SimulationStatusService`, `SimulationPolicy`, the five `Sim*Backend` interfaces (publicly injectable for demo seeding per quickstart). Existing signatures unchanged; `firebaseOptions?` is additive; `simulation?` defaults to `'auto'` preserving prior behavior. `REQUIRED_FIELDS_BY_SERVICE` is intentionally **not** in `public-api.ts` (internal). `allowedNonPeerDependencies` remains untouched. |
| **IV. Build & Test Gate** | ✅ PASS | Pure `decideActivation` is the highest-leverage unit test target — covers FR-001/FR-001a/FR-005 with no Angular runtime. Backend classes are plain TS — directly unit-testable. SC-005 anchors `ng build` + `ng test` as success criteria. |
| **V. DRY, YAGNI & KISS** | ✅ PASS | **DRY** confirmed by R9 and data-model E5: `REQUIRED_FIELDS_BY_SERVICE` is the single source of truth for both the activation decision and the production-mode error message. **YAGNI** confirmed by Out-of-Scope and R3: no chained Functions matchers, no fixture API, no inspector. **KISS** confirmed by R1 (service-level simulation, not SDK-level) and R6 (pure decision function). The new `simulation/` subtree adds ~12 source files but each has one job. |

**Result**: All gates still pass after design. No new Complexity Tracking entries. Plan is ready for `/speckit.tasks`.

## Project Structure

### Documentation (this feature)

```text
specs/004-ngxfire-sim-mode/
├── plan.md              # This file
├── research.md          # Phase 0 — resolves the two clarify-deferred decisions
├── data-model.md        # Phase 1 — entities (activation decision, status map, simulator backends)
├── quickstart.md        # Phase 1 — consumer-facing "try it in 5 minutes" guide
├── contracts/           # Phase 1 — TypeScript interfaces (config additions, status surface, backend contracts)
│   ├── config.contract.ts
│   ├── status.contract.ts
│   └── backends.contract.ts
└── checklists/
    └── requirements.md  # Already present (from /speckit.specify + /speckit.clarify)
```

### Source Code (repository root)

This feature touches only `projects/ht-quick-ngxfire`. No new top-level directories.

```text
projects/ht-quick-ngxfire/
└── src/
    ├── public-api.ts                                     # add: simulation status surface export
    └── lib/
        ├── ht-quick-ngxfire.providers.ts                 # MODIFY: per-service activation decision
        ├── firebase-config.model.ts                      # MODIFY: add simulation policy + make firebaseOptions optional
        ├── ht-quick-ngxfire.error.ts                     # (unchanged — reused for activation errors)
        ├── auth/
        │   ├── ht-auth.service.ts                        # MODIFY: sim-aware backend switch
        │   ├── ht-login.component.ts                     # MODIFY: add showSimulationBadge input + badge render
        │   ├── ht-auth-admin.service.ts                  # MODIFY: sim-aware (operates on shared sim Firestore)
        │   ├── ht-auth-user-sync.service.ts              # MODIFY: sim-aware (uses sim Auth + sim Firestore)
        │   └── ht-auth-redirect.guard.ts                 # (no change — already reads HtAuthService)
        ├── firestore/
        │   └── ht-quick-firestore.service.ts             # MODIFY: sim-aware backend switch
        ├── storage/
        │   └── ht-storage.service.ts                     # MODIFY: sim-aware backend switch
        └── simulation/                                    # NEW
            ├── simulation.types.ts                        # SimulationMode, SimulationStatus, RequiredFields map
            ├── activation.ts                              # decideActivation() — pure function
            ├── simulation-status.service.ts               # injectable read-only status surface (FR-007)
            ├── auth/
            │   └── sim-auth.backend.ts                    # in-memory Auth state, deterministic uid, async sign-in
            ├── firestore/
            │   └── sim-firestore.backend.ts               # in-memory document store + query engine + snapshot bus
            ├── storage/
            │   └── sim-storage.backend.ts                 # in-memory blob store + blob-URL provider
            ├── database/
            │   └── sim-database.backend.ts                # in-memory RTDB tree + listener bus
            └── functions/
                └── sim-functions.backend.ts               # default + per-callable stub registry
```

**Structure Decision**: All work happens inside the existing `ht-quick-ngxfire` library (Constitution I). The new `simulation/` subtree groups the simulator backends and pure activation-decision logic so it can be tree-shaken when a consumer ships a build with `simulation: 'forbid'` and a complete `firebaseOptions`. Existing `Ht*Service` files are modified in-place to add a sim-aware backend switch — they remain the single public entry point for each service domain (DRY).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. No entries required.
