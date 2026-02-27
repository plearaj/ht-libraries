# Project Context — ht-libraries

Purpose
- A single source of truth describing repo structure, conventions, common commands, and how I (the assistant) should make changes to this repository.

When to update this file
- Whenever workflow, project layout, build steps, or release process changes.

Repo layout (high-level)
- angular.json — workspace config
- projects/
  - ht-quick-ngxfire — Firebase + auth/storage libs
  - ht-quick-angular-table — table UI lib
  - ht-camera-upload — camera/upload library (+ Capacitor service)
  - ht-software — example/test app
- dist/ — built package outputs (ignored by git)

Primary goals for edits/PRs
- Keep changes minimal and focused to the requested task
- Fix root cause, not symptoms
- Preserve public APIs unless asked to change them
- Add/adjust tests and docs when behavior changes

Coding & Angular conventions (Angular v21)
- Use `inject()` in services and functions instead of constructor injection.
- Prefer standalone components and signals (`signal()`, `computed()`).
- Use `input()` / `output()` functions for component inputs/outputs (not decorators).
- Use `ChangeDetectionStrategy.OnPush` for components.
- Prefer native control flow (`@if`, `@for`) in templates.
- Use `runInInjectionContext` when calling AngularFire helpers outside constructors.
- Avoid `any`; prefer specific types or `unknown` when necessary.
- Keep functions small and single-responsibility.

Build / Dev commands
- Build a single library once:
```bash
ng build ht-quick-ngxfire
ng build ht-quick-angular-table
ng build ht-camera-upload
```
- Start watch builds for development (one per terminal):
```bash
ng build ht-quick-ngxfire --watch
ng build ht-quick-angular-table --watch
ng build ht-camera-upload --watch
```
- Build all libraries:
```bash
ng build
```

Npm linking (local testing with external apps)
- From each `dist/<pkg>` directory run:
```bash
cd dist/ht-quick-ngxfire && npm link
cd dist/ht-quick-angular-table && npm link
cd dist/ht-camera-upload && npm link
```
- In the external app project:
```bash
npm link ht-quick-ngxfire
npm link ht-quick-angular-table
npm link ht-camera-upload
```

Bundled vs peer deps
- Libraries intentionally bundle certain external packages so consumers don't need to install them. Keep `allowedNonPeerDependencies` updated in `ng-package.json` for each lib when adding bundled dependencies (example: `@capacitor/*`, `@angular/fire`, `@angular/material`).

Firestore & Firebase patterns
- Use `runInInjectionContext` when calling AngularFire `docData`, `collectionData`, etc. from service methods.
- Store role & permissions as fields on `users/{uid}` (not subcollection) unless there is a strong reason to change.

Testing
- Unit tests: `ng test <project>`
- Run app tests in `ht-software` for integration checks
- Keep test changes scoped to modified behavior

Linting & formatting
- Run `npm run lint` (if available) and `npm run format` before creating PRs. Use existing repo formatting rules.

Committing & PR process
- Keep commits focused and atomic
- Use descriptive commit messages: "feat(lib): describe change" / "fix(auth): reason" / "chore: docs"
- Open a PR with: purpose, what changed, how to test, and any migration notes

Releasing
- Build libs and publish from `dist/<pkg>` directories. Confirm `package.json` and `ng-package.json` are correct. Prefer single-package publish per PR.

Files to avoid editing lightly
- `angular.json` — only change for workspace-level updates
- `ng-package.json` — change only to add allowedNonPeerDependencies or entry points
- `tsconfig.*` files — change only for required compiler updates

Where to add new features
- Prefer adding new functionality as separate services/components inside the target package under `projects/<pkg>/src/lib`.
- Add public exports to `projects/<pkg>/src/public-api.ts`.

Developer notes for the assistant
- If task is multi-step, always create a todo plan using the repo TODO tool and update it as you go.
- Before editing, search for related code across `projects/**` and update usages.
- After edits run the relevant `ng build <project>`; if tests exist, run `ng test <project>`.
- When changing public APIs, add a short migration note in `PROJECT_CONTEXT.md` and in PR description.

Contact & ownership
- Repository owner: local developer (you). For ambiguous business rules ask before assuming.

Quick reference commands
```bash
# build single lib
ng build ht-quick-ngxfire
# watch build
ng build ht-quick-ngxfire --watch
# link built package
cd dist/ht-quick-ngxfire && npm link
# in external app
npm link ht-quick-ngxfire
```

---
Update this file when workflows or package layout change.
