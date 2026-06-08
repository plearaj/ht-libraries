# ht-libraries Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-18

## Active Technologies
- TypeScript 5.6 / Angular 21 (002-quick-angular-table)
- None (stateless library; caller owns data) (002-quick-angular-table)
- TypeScript 5.9 (strict mode), Angular 21 + `@angular/fire` ^21.0.0 (bundled) (001-quick-ngxfire)
- TypeScript 5.9 (strict mode), Angular 21 + `@capacitor/camera` ^7.0.2, `@capacitor/filesystem` ^7.1.4 (both bundled) (001-camera-upload)
- TypeScript 5.6 / Angular 21 (frontend), Python 3.11+ (backend) (003-agent-data-skills)
- PostgreSQL, MySQL, SQLite (via SQLAlchemy async drivers: asyncpg, aiomysql, aiosqlite) (003-agent-data-skills)
- TypeScript 5.9 (strict mode), Angular 21 + `@angular/fire` ^21.0.0 (bundled, peer-coexisting), RxJS ~7.8.0 (004-ngxfire-sim-mode)
- In-memory Maps (per-page-session); no persistent browser storage (FR-014) (004-ngxfire-sim-mode)

## Project Structure

```text
src/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.9 (strict mode), Angular 21: Follow standard conventions

## Recent Changes
- 004-ngxfire-sim-mode: Added TypeScript 5.9 (strict mode), Angular 21 + `@angular/fire` ^21.0.0 (bundled, peer-coexisting), RxJS ~7.8.0
- 003-agent-data-skills: Added TypeScript 5.6 / Angular 21 (frontend), Python 3.11+ (backend)
- 001-quick-ngxfire: Added TypeScript 5.9 (strict mode), Angular 21 + `@angular/fire` ^21.0.0


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
