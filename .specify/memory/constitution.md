<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — Principle V materially expanded to formally articulate
  DRY, YAGNI, and KISS as named, individually described rules. YAGNI was
  previously a single keyword; DRY and KISS were absent entirely.
Modified principles:
  - V. Simplicity & Focused Changes → V. DRY, YAGNI & KISS (renamed + expanded)
Added sections: none
Removed sections: none
Templates checked:
  - ✅ .specify/templates/plan-template.md — Constitution Check gate is a runtime
       placeholder; no template edits required
  - ✅ .specify/templates/spec-template.md — No constitution references; aligned
  - ✅ .specify/templates/tasks-template.md — Task structure unchanged; aligned
Deferred TODOs: none
-->

# ht-libraries Constitution

## Core Principles

### I. Library-First Architecture

Every feature MUST be delivered as a standalone Angular library inside `projects/`.
Libraries MUST be:

- **Self-contained**: independently buildable with `ng build <lib>`
- **Independently testable**: `ng test <lib>` MUST run without depending on other libraries
- **Purposeful**: a clear, single responsibility — no organizational-only or catch-all libraries
- **Properly exported**: all public symbols MUST be declared in `public-api.ts`

No feature may be added to the workspace root or to `ht-software` as a permanent home.
`ht-software` exists exclusively as an integration/demo app for the libraries.

**Rationale**: The repo is a library workspace, not an application. All value produced
here is consumed by external Angular apps. Every addition must justify itself as a
publishable, reusable unit.

### II. Modern Angular Patterns (NON-NEGOTIABLE)

All library code MUST follow Angular 21 modern patterns without exception:

- Use `inject()` in services and standalone functions — constructor injection is FORBIDDEN
- Use `signal()`, `computed()`, and `input()`/`output()` functions — decorator-based
  `@Input`/`@Output` MUST NOT appear in new code
- Apply `ChangeDetectionStrategy.OnPush` to every component
- Use native control flow (`@if`, `@for`, `@switch`) in templates — structural directives
  (`*ngIf`, `*ngFor`) MUST NOT be added in new code
- Use `runInInjectionContext` when calling AngularFire helpers outside constructors
- Avoid `any`; use specific types or `unknown`; TypeScript strict mode MUST be satisfied

**Rationale**: Consistency with Angular 21 idioms ensures libraries are zoneless-ready,
tree-shakeable, and forward-compatible with the Angular roadmap.

### III. Minimal & Stable Public API

- Public APIs MUST NOT be changed without an explicit user request and a written migration note
- New functionality MUST be added as new services/components — not by modifying existing
  method signatures
- `allowedNonPeerDependencies` in `ng-package.json` MUST be kept accurate whenever a
  bundled dependency is added or removed
- Each library MUST bundle its heavy dependencies (e.g., `@angular/fire`, `@capacitor/*`,
  `@angular/material`) so consumers require no additional installs

**Rationale**: These libraries are consumed by external apps. Breaking changes impose
migration costs on all consumers. Stability is a first-class concern.

### IV. Build & Test Gate

Every change MUST pass all of the following gates before being considered complete:

1. `ng build <affected-lib>` — build MUST succeed with zero errors
2. `ng test <affected-lib>` — all existing tests MUST pass
3. Test changes MUST be scoped to modified behavior only — no unrelated test rewrites
4. `npm run lint` and `npm run format` MUST pass before any PR is opened

**Rationale**: A library that does not build is broken for all consumers. Tests protect
the public contract of each library and prevent regressions.

### V. DRY, YAGNI & KISS

**DRY — Don't Repeat Yourself**:
- Logic, configuration, and type definitions MUST NOT be duplicated across files or libraries
- When the same behaviour is needed in more than one place, it MUST be extracted into a
  shared, named abstraction before the second usage is added
- Copy-pasted code blocks are a signal that a service, utility, or base class is missing

**YAGNI — You Aren't Gonna Need It**:
- Code MUST only be written for requirements that exist today — never for hypothetical
  future use cases
- Speculative abstractions, generics added "just in case", optional parameters with no
  current caller, and configuration flags with a single value are FORBIDDEN
- If a requirement does not yet exist, the code for it MUST NOT exist

**KISS — Keep It Simple, Stupid**:
- Changes MUST be minimal and tightly scoped to the requested task
- The simplest solution that satisfies the requirement MUST be chosen; added complexity
  MUST be explicitly justified
- Root causes MUST be fixed — treating symptoms is FORBIDDEN
- Functions MUST remain small and single-responsibility

**Rationale**: A library workspace accumulates complexity quickly across multiple packages.
DRY prevents diverging logic across libs; YAGNI prevents speculative bloat; KISS ensures
every PR remains easy to review, understand, and revert.

## Angular Coding Standards

The following standards are REQUIRED across all `projects/*` source code:

- **Imports**: Use relative imports within a library; avoid cross-library imports that
  create hidden coupling between packages
- **Async**: Prefer Observables (RxJS) for Firebase/AngularFire operations; use
  `signal()`-based state for component-local reactive state
- **Firestore patterns**: Store roles and permissions as fields on `users/{uid}` — not
  as subcollections — unless a compelling reason is explicitly documented
- **Sensitive files**: `angular.json`, `ng-package.json`, and `tsconfig.*` MUST NOT be
  edited without explicit justification; changes to these require user confirmation
- **Feature placement**: New features MUST be placed in `projects/<pkg>/src/lib/` —
  never in the workspace root or in shared utility folders

## Development Workflow

The following workflow is NON-NEGOTIABLE for all changes:

1. **Before editing**: Search for related code across `projects/**`; update all usages
   when renaming or changing behavior
2. **After editing**: Run `ng build <project>` and `ng test <project>`; fix any failures
   before considering the task done
3. **Commits**: Focused and atomic; follow the format —
   `feat(<lib>): description` / `fix(<lib>): reason` / `chore: description`
4. **PRs**: MUST include purpose, what changed, how to test, and migration notes when
   any public API is modified
5. **Publishing**: Build from `dist/<pkg>`; confirm `package.json` and `ng-package.json`
   are correct; prefer single-package publish per PR

## Governance

This constitution supersedes all other development practices within this repository.
When a conflict arises between a team habit, external framework recommendation, or
PR-author preference and a principle above, the constitution governs.

**Amendment procedure**:
- Amendments MUST document: (a) reason for change, (b) which principles are affected,
  (c) migration plan for any in-flight work
- `CONSTITUTION_VERSION` MUST be bumped per semantic versioning:
  MAJOR for principle removals/redefinitions, MINOR for additions, PATCH for clarifications
- `LAST_AMENDED_DATE` MUST be updated on every change
- Amendments MUST be propagated to `.specify/templates/` if they affect planning or
  task generation

**Compliance review**: Each PR description MUST confirm the Constitution Check passes.
The `/speckit.plan` command enforces this gate before implementation planning proceeds.

**Guidance reference**: See `PROJECT_CONTEXT.md` for runtime development guidance and
quick-reference commands.

**Version**: 1.1.0 | **Ratified**: 2026-02-17 | **Last Amended**: 2026-02-17
