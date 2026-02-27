---

description: "Task list for ht-camera-upload implementation"
---

# Tasks: ht-camera-upload

**Input**: Design documents from `/specs/001-camera-upload/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Not explicitly requested in spec — test tasks omitted. `ng test` runs are included as build-gate checkpoints.

**Organization**: Tasks grouped by user story (P1 → P4) to enable independent delivery of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths included in every description

## Path Conventions

Angular library: `projects/ht-camera-upload/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create shared type definitions that all other phases depend on.

- [x] T001 Create shared interfaces in `projects/ht-camera-upload/src/lib/types.ts` — define `CapturedImage`, `UploadProgress`, `UploadResult<T>`, `UploadHandler<T>`, `UploadConfig<T>` exactly as specified in `specs/001-camera-upload/data-model.md`
- [x] T002 Update `projects/ht-camera-upload/src/public-api.ts` to export all types from `./lib/types` and remove the now-redundant individual re-exports of `CameraUploadOptions`, `FileUploadResult`, `CapacitorPhotoOptions`, `CapacitorPhotoResult` (these interfaces will be replaced by `CapturedImage` and the upload types)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refactor both services to return `CapturedImage` (the canonical type) and add the `upload<T>()` method. All user story phases depend on this.

**⚠️ CRITICAL**: No component work can begin until this phase is complete.

- [x] T003 [P] Refactor `projects/ht-camera-upload/src/lib/ht-camera-upload.service.ts` to conform to `IHtCameraUploadService` contract in `specs/001-camera-upload/contracts/component-api.ts`: update `takePhoto()` return type to `Observable<CapturedImage>`, rename `uploadImages()` to `selectImage()` returning `Observable<CapturedImage>` (single image), add `upload<T>(image: CapturedImage, config: UploadConfig<T>): Observable<UploadProgress | UploadResult<T>>` method that delegates to the consumer-supplied `config.handler`
- [x] T004 [P] Refactor `projects/ht-camera-upload/src/lib/ht-capacitor-camera.service.ts` to conform to `IHtCapacitorCameraService` contract: update `takePhoto()`, `pickFromGallery()`, and `promptCameraOrGallery()` return types to `Observable<CapturedImage>`, update `formatPhotoResult()` to return `CapturedImage`, add `upload<T>(image: CapturedImage, config: UploadConfig<T>): Observable<UploadProgress | UploadResult<T>>` method
- [x] T005 Run `ng build ht-camera-upload` — verify zero compilation errors after service refactoring before proceeding to component work

**Checkpoint**: Both services compile and return `CapturedImage` — component phases can now begin.

---

## Phase 3: User Story 1 — Camera Capture and Preview (Priority: P1) 🎯 MVP

**Goal**: A developer places `<ht-camera-upload>` in an Ionic Angular template; on a native device, tapping it opens the native camera; on a browser, it opens `input[capture]`; in both cases a preview appears within 1 second.

**Independent Test**: Add `<ht-camera-upload>` to a test app template with no `uploadConfig`; tap the trigger; confirm the native/browser camera opens and a preview thumbnail renders after capture.

### Implementation for User Story 1

- [x] T006 [US1] Implement `HtCameraUpload` component class in `projects/ht-camera-upload/src/lib/ht-camera-upload.ts` — replace the stub with: `ChangeDetectionStrategy.OnPush`, `standalone: true`, inject both services via `inject(HtCameraUploadService)` and `inject(HtCapacitorCameraService)`, declare `input()` signals for `options` (`CameraUploadOptions`, default `{}`), `uploadConfig` (`UploadConfig<unknown> | undefined`, default `undefined`), and `triggerLabel` (`string`, default `'Add Photo'`); declare `signal()` for `isNative` (checks `window.Capacitor?.isNativePlatform()`), `cameraAvailable` (initially `true`, updated in ngOnInit), `currentImage` (`CapturedImage | null`, initially `null`), and `uploadState` (`'idle' | 'uploading' | 'complete' | 'error'`, initially `'idle'`)
- [x] T007 [US1] Add camera capture handler method to `HtCameraUpload` in `projects/ht-camera-upload/src/lib/ht-camera-upload.ts` — method `captureFromCamera()`: if `isNative()`, calls `capacitorService.promptCameraOrGallery(this.options())` else calls `browserService.takePhoto(this.options())`; subscribes, sets `currentImage` signal, emits `imageCaptured` output; on error emits `uploadError` output
- [x] T008 [US1] Implement `HtCameraUpload` component template in `projects/ht-camera-upload/src/lib/ht-camera-upload.ts` — trigger button labelled by `triggerLabel()` calling `captureFromCamera()`; `@if (currentImage())` section showing `<img [src]="currentImage()!.dataUrl" alt="Preview">`; declare `output()` emitters for `imageCaptured`, `uploadProgress`, `uploadComplete`, `uploadError`
- [x] T009 [P] [US1] Add `HtCameraUpload` component to exports in `projects/ht-camera-upload/src/public-api.ts`
- [x] T010 [US1] Run `ng build ht-camera-upload` — verify zero errors; this is the US1 MVP checkpoint

**Checkpoint**: `<ht-camera-upload>` renders, opens camera on trigger, shows preview. Independently functional.

---

## Phase 4: User Story 2 — File System Selection (Priority: P2)

**Goal**: A user who prefers a file picker (or is on a desktop browser) can tap the upload trigger, select a file, and see a preview.

**Independent Test**: In a desktop browser, the component shows a file picker option; selecting a valid image displays a preview within 1 second.

### Implementation for User Story 2

- [x] T011 [US2] Add file picker support to `HtCameraUpload` in `projects/ht-camera-upload/src/lib/ht-camera-upload.ts` — add method `selectFromFiles()`: if `isNative()`, calls `capacitorService.pickFromGallery(this.options())` else calls `browserService.selectImage(this.options())`; same subscribe/signal/emit pattern as camera handler; update template to show a second option button "Choose File" calling `selectFromFiles()`
- [x] T012 [US2] Run `ng build ht-camera-upload` — verify zero errors; US2 checkpoint

**Checkpoint**: US1 (camera) and US2 (file picker) both independently functional.

---

## Phase 5: User Story 3 — Upload Pipeline (Priority: P3)

**Goal**: After capture, when `uploadConfig` is supplied by the host app, an "Upload" button appears; clicking it sends the image through the host's handler and the component emits progress and completion events.

**Independent Test**: Supply `uploadConfig` with a mock handler that returns `of({ type: 'complete', ref: 'test-url' })`; after capture, click Upload; confirm `uploadComplete` emits with `ref: 'test-url'`.

### Implementation for User Story 3

- [x] T013 [US3] Wire upload pipeline in `HtCameraUpload` in `projects/ht-camera-upload/src/lib/ht-camera-upload.ts` — add `uploadImage()` method: validate `currentImage()` against `uploadConfig().maxSizeBytes` and `allowedTypes` (emit `uploadError` and return if invalid); set `uploadState('uploading')`; call `upload()` on the active service (Capacitor or browser) with `currentImage()!` and `uploadConfig()!`; subscribe: on `UploadProgress` event emit `uploadProgress` output; on `UploadResult` event emit `uploadComplete` output and set `uploadState('complete')`; on error emit `uploadError` and set `uploadState('error')`; update template to show "Upload" button `@if (currentImage() && uploadConfig())` calling `uploadImage()`; show upload state feedback `@if (uploadState() === 'uploading')`
- [x] T014 [US3] Run `ng build ht-camera-upload` — verify zero errors; US3 checkpoint

**Checkpoint**: US1, US2, US3 all independently functional. Full capture-to-upload journey works.

---

## Phase 6: User Story 4 — Graceful Camera Fallback (Priority: P4)

**Goal**: On desktop browsers or when camera permission is denied, the camera option is absent or disabled; the file picker continues to work; no broken UI is shown.

**Independent Test**: In a browser with no camera, the component renders with only the file option; the camera option is absent; the file picker functions normally.

### Implementation for User Story 4

- [x] T015 [US4] Implement `cameraAvailable` detection in `HtCameraUpload` in `projects/ht-camera-upload/src/lib/ht-camera-upload.ts` — in `ngOnInit`: on browser path, set `cameraAvailable` signal from `browserService.isCameraSupported()`; on native path, call `capacitorService.checkPermissions()` and set `cameraAvailable` to `permissions.camera === true`; implement `implements OnInit`
- [x] T016 [US4] Update `HtCameraUpload` template — wrap camera trigger button in `@if (cameraAvailable())`; add `@if (!cameraAvailable())` block showing `<p>Camera unavailable — please select a file instead.</p>` or similar message; file picker button always visible regardless of `cameraAvailable()`
- [x] T017 [US4] Handle cancellation in both service paths in `projects/ht-camera-upload/src/lib/ht-camera-upload.ts` — in `captureFromCamera()` and `selectFromFiles()` error callbacks: detect cancellation errors (Capacitor throws `'User cancelled photos app'`, browser file input never fires on cancel — guard with `null` file check); on cancellation reset `uploadState` to `'idle'` and do NOT emit `uploadError`
- [x] T018 [US4] Handle unsupported file type in `HtCameraUpload` — after `imageCaptured` is received, validate `mimeType` against `['image/jpeg', 'image/png', 'image/webp', 'image/gif']`; if invalid: emit `uploadError` with message `'Unsupported file type: {mimeType}'`, do NOT update `currentImage` signal, do NOT show preview
- [x] T019 [US4] Run `ng build ht-camera-upload` and `ng test ht-camera-upload` — verify both pass; this is the full library validation checkpoint

**Checkpoint**: All four user stories independently functional. Library ready for quickstart validation.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, lint, and validation before the library is publishable.

- [x] T020 [P] Remove `console.log` statements from `projects/ht-camera-upload/src/lib/ht-camera-upload.service.ts` (constructor logs and any added during development)
- [x] T021 [P] Remove `console.log` statements from `projects/ht-camera-upload/src/lib/ht-capacitor-camera.service.ts` (constructor logs and any added during development)
- [x] T022 Verify `projects/ht-camera-upload/ng-package.json` — confirm `allowedNonPeerDependencies` lists `@capacitor/camera` only (removed `@capacitor/filesystem` — no longer used after refactoring)
- [ ] T023 Run full quickstart validation per `specs/001-camera-upload/quickstart.md` steps 1–11 — check each item in the validation checklist at the bottom of quickstart.md
- [ ] T024 Run `npm run lint` and `npm run format` from workspace root; fix any issues in `projects/ht-camera-upload/` — N/A: no lint target configured (ESLint not installed in workspace)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001 must exist before T003/T004)
- **US1 (Phase 3)**: Depends on Phase 2 complete (T005 build must pass)
- **US2 (Phase 4)**: Depends on US1 complete (T010 build must pass)
- **US3 (Phase 5)**: Depends on US1 + US2 complete
- **US4 (Phase 6)**: Depends on US1 + US2 + US3 complete (or can be done alongside US3 — see note below)
- **Polish (Phase 7)**: Depends on US4 complete (T019 must pass)

> **Note**: US4 graceful fallback logic lives entirely inside the component. If US3 upload is deprioritised, US4 can proceed after US2 — the `cameraAvailable` signal and template guard are independent of the upload pipeline.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational — no story dependencies
- **US2 (P2)**: Starts after US1 (file picker uses same component; extending existing template)
- **US3 (P3)**: Starts after US2 — upload button requires `currentImage` signal which US1/US2 set
- **US4 (P4)**: Starts after US1 — `cameraAvailable` and cancellation extend the capture handlers

### Within Each Phase

- Setup → Foundational → US1 → US2 → US3 → US4 → Polish
- T003 and T004 are parallel (different service files)
- T009 is parallel with T006–T008 (different file: public-api.ts)
- T020 and T021 are parallel (different service files)

### Parallel Opportunities

```
Phase 2 (both at once):
  Task: "Refactor ht-camera-upload.service.ts to return CapturedImage + add upload()"  → T003
  Task: "Refactor ht-capacitor-camera.service.ts to return CapturedImage + add upload()"  → T004

Phase 3 (T009 runs alongside T006-T008):
  T006 → T007 → T008 (sequential, same file)
  T009 (parallel with T006-T008, different file)

Phase 7 (both at once):
  Task: "Remove console.log from ht-camera-upload.service.ts"  → T020
  Task: "Remove console.log from ht-capacitor-camera.service.ts"  → T021
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T005)
3. Complete Phase 3: US1 — Camera Capture and Preview (T006–T010)
4. **STOP and VALIDATE**: `<ht-camera-upload>` renders, camera opens, preview appears
5. Ship or demo if ready — file picker, upload, and fallback can follow

### Incremental Delivery

1. Phase 1 + Phase 2 → Services compile with `CapturedImage`
2. Phase 3 → Camera capture + preview (MVP)
3. Phase 4 → File picker (extends MVP)
4. Phase 5 → Upload pipeline (complete feature)
5. Phase 6 → Graceful fallback (production hardening)
6. Phase 7 → Polish (publishable)

---

## Notes

- `[P]` tasks = different files, no dependencies on each other
- `[USN]` label maps each task to its user story for traceability
- All 4 user stories are independently testable per their phase checkpoints
- No test tasks generated (not requested in spec) — `ng test` runs are build-gate checkpoints
- Constitution compliance: `ChangeDetectionStrategy.OnPush`, `inject()`, `input()`/`output()`, `@if`/`@for` are all REQUIRED in the component (T006/T008)
- Do NOT surface `allowMultiple` in the component — it exists in the service interface for backwards compat only
