# Implementation Plan: ht-camera-upload

**Branch**: `001-camera-upload` | **Date**: 2026-02-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-camera-upload/spec.md`

## Summary

Implement `ht-camera-upload` as a standalone Angular 21 library that provides a reusable
`HtCameraUpload` component and two complementary services — `HtCameraUploadService`
(browser/web fallback via `input[capture]`) and `HtCapacitorCameraService` (native iOS/Android
via `@capacitor/camera`) — for image capture, preview, and host-supplied remote upload.
The library already has substantial service logic; this plan completes the component,
adds the observable upload pipeline, hardens Constitution compliance, and writes
a quickstart for consumers.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode), Angular 21
**Primary Dependencies**: `@capacitor/camera` ^7.0.2, `@capacitor/filesystem` ^7.1.4 (both bundled)
**Storage**: N/A — image data held in memory; persistence delegated to host app or Capacitor Filesystem
**Testing**: Jasmine 5 / Karma 6 (`ng test ht-camera-upload`)
**Target Platform**: iOS / Android (via Capacitor native runtime) + modern desktop & mobile browsers
**Project Type**: Angular library — single package in `projects/ht-camera-upload/`
**Performance Goals**: Preview renders within 1 s of camera confirmation; within 1 s of file selection
**Constraints**: Single-image per interaction; no backend prescribed; Capacitor and Angular peer-free for consumers
**Scale/Scope**: Reusable across many consuming Ionic Angular apps; single library package

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Detail |
|-----------|--------|--------|
| I. Library-First | ✅ PASS | Feature lives in `projects/ht-camera-upload/`; independently buildable |
| II. Modern Angular Patterns | ⚠️ VIOLATION | `HtCameraUpload` component missing `ChangeDetectionStrategy.OnPush`; uses `@Component` without `OnPush`. Both services have `constructor()` with console.log — no DI violation (no deps injected) but new code must use `inject()` for any future deps. New component must use `input()`/`output()` functions, `OnPush`, and native control flow. |
| III. Minimal & Stable Public API | ✅ PASS | `ng-package.json` correctly lists `allowedNonPeerDependencies` for `@capacitor/camera` and `@capacitor/filesystem`. Public API is stable; new additions go to `public-api.ts` exports. |
| IV. Build & Test Gate | ✅ PASS (gate) | Must run `ng build ht-camera-upload` and `ng test ht-camera-upload` after each implementation task. |
| V. DRY / YAGNI / KISS | ⚠️ REVIEW | Two services (`HtCameraUploadService` browser, `HtCapacitorCameraService` native) have overlapping `takePhoto` names — this is intentional design (platform split), not duplication. `allowMultiple` in `CameraUploadOptions` conflicts with spec (single-image); must not be exercised by the component (existing code stays; no new multi-image features). |

**Violations to fix before implementation is complete:**
1. `HtCameraUpload` component MUST be upgraded to `ChangeDetectionStrategy.OnPush`
2. `HtCameraUpload` component MUST use `input()`/`output()` signal-based API (not decorators)
3. Any new injectable services MUST use `inject()` — no constructor parameters

**Post-Design Constitution Re-check:** See bottom of this file after Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/001-camera-upload/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── component-api.ts # Component input/output contract definitions
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created here)
```

### Source Code (repository root)

```text
projects/ht-camera-upload/
├── ng-package.json
├── package.json
├── src/
│   ├── public-api.ts
│   └── lib/
│       ├── ht-camera-upload.ts              # Component (stub → full implementation)
│       ├── ht-camera-upload.service.ts      # Browser image capture + processing
│       ├── ht-capacitor-camera.service.ts   # Native Capacitor camera (iOS/Android)
│       ├── ht-camera-upload.spec.ts         # Component unit tests
│       └── types.ts                         # Shared interfaces (CapturedImage, UploadConfig, UploadResult)
```

**Structure Decision**: Single Angular library package. No backend. No additional projects.
Existing three source files retained; `types.ts` added to centralise shared interfaces
and avoid duplicating type definitions across the two services (DRY).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Two services (browser + Capacitor) | Capacitor Camera API is native-only; browser requires `input[capture]` — fundamentally different APIs | Merging into one service would require complex platform-detection branching inside a single class, violating KISS. Keeping them separate with clear names is simpler and more testable. |

## Post-Design Constitution Re-check

After Phase 1 design:

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Library-First | ✅ PASS | Single library, no new packages added |
| II. Modern Angular Patterns | ✅ PASS (after fix) | Component gets `OnPush`, `input()`/`output()`, native `@if`/`@for` in template |
| III. Minimal & Stable Public API | ✅ PASS | `types.ts` exports added to `public-api.ts`; existing signatures unchanged |
| IV. Build & Test Gate | ✅ GATE | Enforced per task |
| V. DRY / YAGNI / KISS | ✅ PASS | Two-service design justified above; `allowMultiple` not surfaced in component |
