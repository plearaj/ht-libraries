# Hightower Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship-ready the Hightower Software Technologies business site as a fully prerendered Angular 21 app (`projects/hightower-website`) with a hero video, content-driven portfolio/products/services, and a Firestore-backed contact form.

**Architecture:**
- **Rendering and data:** every route is prerendered at build time (`@angular/ssr`, `outputMode: 'static'`) and hydrates in the browser. Pages get their data from route resolvers over an abstract `ContentRepository`. In v1 that repository serves content generated at build time from authored TypeScript and markdown files.
- **Firebase:** only `ContactService` touches Firebase. It lazy-loads the modular SDK in the browser on the first submit, with App Check (reCAPTCHA v3).
- **Hosting:** Firebase Hosting serves the static output. A post-build step adds `404.html`, `sitemap.xml` and `robots.txt`.

**Tech Stack:** Angular 21.2 (standalone, zoneless, signals, OnPush), Angular Material 21, `@angular/ssr`, `marked` (build time only), Firebase JS SDK 11 (`firebase/app`, `firebase/app-check`, `firebase/firestore`), Karma + Jasmine, `node:test`, `@firebase/rules-unit-testing` 4.x, `firebase-tools`.

**Spec:** `docs/superpowers/specs/2026-10-02-hightower-website-design.md`

## Global Constraints

- Angular 21 conventions: standalone components, `changeDetection: ChangeDetectionStrategy.OnPush`, `inject()` (no constructor DI), `input()`/`output()`, signals, `@if`/`@for`/`@switch`, SCSS. Component selector prefix is `hs`.
- File naming follows the Angular 21 style guide: `site-header.ts` with class `SiteHeader` (no `.component` suffix).
- **Run `npm install` only at the worktree root** (`C:\Users\ajple\Programming_Projects\ht-libraries\.claude\worktrees\hightower-software-website-13f49c`). Never run it inside any `projects/*` folder; that causes NG0402/NG0203.
- **Never `git add projects/`** wholesale (Windows path-length issue). Always add explicit paths, as each task's commit step shows.
- `ht-quick-ngxfire` is **not** used by the site. No Firebase providers go in `app.config.ts`.
- Nothing Firebase-related may run during prerender.
- Brand tokens are exact: night `#0A1226`, deep `#070D1C`, surface `#121C36`, line `#2A3760`, ivory `#EFEBE1`, muted `#A9B1C7`, gold `#E3B054`, pale gold `#E9D8A6`, product violet border `#A98BF0` / text `#BFA8F5`, client blue border `#7FA8D9` / text `#A8C6EA`.
- Fonts are self-hosted WOFF2 (Cinzel 600/700, Jost 400/500/600, Cormorant Garamond 500 italic, IBM Plex Mono 400), Latin subset, `font-display: swap`. No Google Fonts requests.
- Contact field limits are exact:
  - name: 1–100 characters, not whitespace-only;
  - email: ≤254 characters, matching `^[^@\s]+@[^@\s]+\.[^@\s]+$`;
  - company: ≤100 characters, optional;
  - message: 10–5000 characters;
  - topic: a service slug, `product` or `other`.
- The contact submit timeout is 15 seconds.
- Hosting: `trailingSlash: false`, `cleanUrls: true`, **no rewrites**. Each product-kind project gets a 301 `redirects` entry from `/portfolio/<slug>` to `/products/<productSlug>` in `firebase.json` (only Logos today).
- Layout works at 360px with no horizontal scroll, has visible focus states, and meets WCAG AA contrast.
- Copy in `[BRACKETS]` is intentional placeholder site copy that the owner replaces before launch (spec §9). It is not a plan gap.
- Commit messages end with: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Deliberate differences from the spec

Where this plan and the spec disagree, follow the plan. Each difference is intentional:

- **No `Service.icon`** (spec §3.1). No page design renders a service icon, so the field and its Material Symbols font are dropped (YAGNI). Add it back with the font if a design needs it.
- **Rules tests run as `npm run test:website:rules`**, not `npm run test:rules` (spec §7). Every site script is namespaced `*:website` so it can't collide with the libraries' scripts.
- **Local dev skips App Check** instead of using a debug token (spec §5.2). Dev writes go to the Firestore emulator under `demo-hightower`, which doesn't enforce App Check, so a debug token adds setup without testing anything. Production still initializes App Check before Firestore.
- **Detail resolvers return a `RedirectCommand`** (with `skipLocationChange` for not-found) instead of `router.navigate(...)` plus `EMPTY` (spec §4.1). Same visible behaviour, but the redirect happens inside the navigation, with no cancelled navigation and no flash.
- **Product-kind portfolio URLs also get a Hosting 301** (`/portfolio/logos` → `/products/logos` in `firebase.json`). The spec's resolver redirect only runs after the page loads; a direct hit would otherwise return the 404 page with a 404 status.
- **The topic/service sync check lives in `build-content.mjs`** (Task 15), not the content-integrity unit test (spec §5.2, §7). It needs to read `firestore.rules` from disk, which Karma tests can't do; running it in the content build also fails earlier.
- **`.firebaserc` is not committed** (spec §2 lists it among the project's files). The repo's `.gitignore` already ignores it, so the owner creates it at launch with `firebase use --add`.

---

## File Structure

```
projects/hightower-website/
  firebase.json                     Hosting + Firestore CLI config (Task 15)
  .firebaserc                       Firebase project alias (gitignored; owner creates it at launch)
  firestore.rules                   contactSubmissions create-only rules (Task 15)
  firestore.indexes.json            empty indexes (Task 15)
  tsconfig.app.json / tsconfig.spec.json
  content/                          AUTHORED content (pure-data .mts, run by Node 24 directly)
    source-types.mts                *Source types = model minus descriptionHtml plus description (markdown)
    site.mts  projects.mts  products.mts  services.mts
  scripts/
    build-content.mjs (+ .test.mjs) content/*.mts → src/app/content/content.generated.ts (+ rules topic check)
    postbuild.mjs (+ .test.mjs)     prerender assertions, 404.html, sitemap.xml, robots.txt
  rules-tests/firestore.rules.test.mjs
  public/  favicon.svg  fonts/*.woff2  images/  media/
  src/
    index.html  main.ts  main.server.ts  styles.scss
    styles/_tokens.scss _fonts.scss _theme.scss _base.scss
    environments/environment.model.ts environment.ts environment.prod.ts
    app/
      app.ts app.spec.ts app.config.ts app.config.server.ts app.routes.ts app.routes.server.ts
      content/  models.ts labels.ts content-repository.ts static-content-repository.ts(+spec)
                content-integrity.spec.ts content.generated.ts (GENERATED, gitignored)
                testing/content-fixtures.ts
      routing/  content-resolvers.ts (+spec)
      seo/      seo.service.ts (+spec)
      layout/   nav-links.ts shell/ site-header/ site-footer/
      shared/   section-heading/ project-card/ product-card/ html-content/ code-snippet/ cta-band/ hero-video/
      contact/  contact.models.ts contact-validators.ts submission-writer.ts firebase-submission-writer.ts contact.service.ts (+specs)
      pages/    home/ services/ portfolio/ products/ about/ contact/ not-found/ project-detail/ product-detail/
```

---

### Task 1: Scaffold the app and toolchain

**Files:**
- Modify: `package.json` (dependencies), `angular.json` (new project), `.gitignore`
- Create: `projects/hightower-website/tsconfig.app.json`, `projects/hightower-website/tsconfig.spec.json`, `projects/hightower-website/public/favicon.svg`, `projects/hightower-website/src/index.html`, `projects/hightower-website/src/main.ts`, `projects/hightower-website/src/main.server.ts`, `projects/hightower-website/src/styles.scss`, `projects/hightower-website/src/app/app.ts`, `projects/hightower-website/src/app/app.config.ts`, `projects/hightower-website/src/app/app.config.server.ts`, `projects/hightower-website/src/app/app.routes.ts`, `projects/hightower-website/src/app/app.routes.server.ts`, `projects/hightower-website/src/app/pages/home/home-page.ts`
- Test: `projects/hightower-website/src/app/app.spec.ts`

**Interfaces:**
- Produces: the `App` root component (selector `hs-root`); `appConfig: ApplicationConfig`; `routes: Routes`; `serverRoutes: ServerRoute[]`; the build target `hightower-website`, with output in `projects/hightower-website/dist/browser`.

- [ ] **Step 1: Install root dependencies (worktree root only)**

The worktree has no `node_modules` of its own, so install first. Then add the SSR packages, pinned to the installed Angular versions so the peer ranges match.

Run (Bash, from the worktree root):
```bash
npm install
npm i @angular/ssr@$(node -p "require('@angular/build/package.json').version") @angular/platform-server@$(node -p "require('@angular/core/package.json').version") firebase@^11.10.0
```
Expected: exits 0. `package.json` now lists `@angular/ssr`, `@angular/platform-server` and `firebase` under `dependencies`.

- [ ] **Step 2: Ignore build output and generated content**

Append to `.gitignore`:
```
# hightower-website
/projects/hightower-website/dist
/projects/hightower-website/src/app/content/content.generated.ts
```

- [ ] **Step 3: Add the project to `angular.json`**

Insert this entry into `"projects"`, after `"ht-camera-upload"`:
```json
"hightower-website": {
  "projectType": "application",
  "schematics": {
    "@schematics/angular:component": { "style": "scss", "changeDetection": "OnPush" }
  },
  "root": "projects/hightower-website",
  "sourceRoot": "projects/hightower-website/src",
  "prefix": "hs",
  "architect": {
    "build": {
      "builder": "@angular/build:application",
      "options": {
        "outputPath": "projects/hightower-website/dist",
        "index": "projects/hightower-website/src/index.html",
        "browser": "projects/hightower-website/src/main.ts",
        "server": "projects/hightower-website/src/main.server.ts",
        "outputMode": "static",
        "tsConfig": "projects/hightower-website/tsconfig.app.json",
        "inlineStyleLanguage": "scss",
        "assets": [{ "glob": "**/*", "input": "projects/hightower-website/public" }],
        "styles": ["projects/hightower-website/src/styles.scss"]
      },
      "configurations": {
        "production": {
          "budgets": [
            { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
            { "type": "anyComponentStyle", "maximumWarning": "6kB", "maximumError": "12kB" }
          ],
          "outputHashing": "all"
        },
        "development": {
          "optimization": false,
          "extractLicenses": false,
          "sourceMap": true
        }
      },
      "defaultConfiguration": "production"
    },
    "serve": {
      "builder": "@angular/build:dev-server",
      "configurations": {
        "production": { "buildTarget": "hightower-website:build:production" },
        "development": { "buildTarget": "hightower-website:build:development" }
      },
      "defaultConfiguration": "development"
    },
    "test": {
      "builder": "@angular/build:karma",
      "options": {
        "tsConfig": "projects/hightower-website/tsconfig.spec.json",
        "inlineStyleLanguage": "scss",
        "assets": [{ "glob": "**/*", "input": "projects/hightower-website/public" }],
        "styles": ["projects/hightower-website/src/styles.scss"]
      }
    }
  }
}
```
There's no `polyfills` entry because the app is zoneless (the Angular 21 default).

- [ ] **Step 4: Create the tsconfigs**

`projects/hightower-website/tsconfig.app.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../out-tsc/hightower-website",
    "types": []
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts"]
}
```

`projects/hightower-website/tsconfig.spec.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../out-tsc/hightower-website-spec",
    "types": ["jasmine"]
  },
  "include": ["src/**/*.d.ts", "src/**/*.spec.ts"]
}
```

- [ ] **Step 5: Write the failing smoke test**

`projects/hightower-website/src/app/app.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('creates the root component with a router outlet', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx ng test hightower-website --watch=false --browsers=ChromeHeadless`
Expected: FAIL. The compile error is "Cannot find module './app'".

- [ ] **Step 7: Create the app source files**

`projects/hightower-website/src/app/app.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'hs-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
```

`projects/hightower-website/src/app/pages/home/home-page.ts` (temporary; Task 10 replaces it):
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'hs-home-page',
  template: '<h1>Hightower Software Technologies</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
```

`projects/hightower-website/src/app/app.routes.ts`:
```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
  },
];
```

`projects/hightower-website/src/app/app.config.ts`:
```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideClientHydration(withEventReplay()),
  ],
};
```

`projects/hightower-website/src/app/app.routes.server.ts` (temporary; Task 12 replaces it):
```ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Prerender }];
```

`projects/hightower-website/src/app/app.config.server.ts`:
```ts
import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

`projects/hightower-website/src/main.ts`:
```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
```

`projects/hightower-website/src/main.server.ts`:
```ts
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);

export default bootstrap;
```

`projects/hightower-website/src/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Hightower Software Technologies</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0A1226">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
</head>
<body>
  <hs-root></hs-root>
</body>
</html>
```

`projects/hightower-website/src/styles.scss` (Task 4 fills it in):
```scss
html, body { margin: 0; background: #0A1226; color: #EFEBE1; }
```

`projects/hightower-website/public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#0A1226"/><path d="M12 2C12.8 8.4 15.6 11.2 22 12C15.6 12.8 12.8 15.6 12 22C11.2 15.6 8.4 12.8 2 12C8.4 11.2 11.2 8.4 12 2Z" fill="#E3B054"/></svg>
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx ng test hightower-website --watch=false --browsers=ChromeHeadless`
Expected: PASS (1 spec, 0 failures).

- [ ] **Step 9: Verify the static prerender build**

Run: `npx ng build hightower-website`
Expected:
- The build succeeds and its output lists `Prerendered 1 static route`.
- `grep -c "Hightower Software Technologies</h1>" projects/hightower-website/dist/browser/index.html` prints `1`.

- [ ] **Step 10: Commit**

```bash
git add package.json angular.json .gitignore projects/hightower-website/tsconfig.app.json projects/hightower-website/tsconfig.spec.json projects/hightower-website/public/favicon.svg projects/hightower-website/src/index.html projects/hightower-website/src/main.ts projects/hightower-website/src/main.server.ts projects/hightower-website/src/styles.scss projects/hightower-website/src/app/app.ts projects/hightower-website/src/app/app.spec.ts projects/hightower-website/src/app/app.config.ts projects/hightower-website/src/app/app.config.server.ts projects/hightower-website/src/app/app.routes.ts projects/hightower-website/src/app/app.routes.server.ts projects/hightower-website/src/app/pages/home/home-page.ts
git commit -m "feat(website): scaffold prerendered hightower-website app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Content models, authored content and the build-content script

**Files:**
- Create: `projects/hightower-website/src/app/content/models.ts`, `projects/hightower-website/content/source-types.mts`, `projects/hightower-website/content/site.mts`, `projects/hightower-website/content/projects.mts`, `projects/hightower-website/content/products.mts`, `projects/hightower-website/content/services.mts`, `projects/hightower-website/scripts/build-content.mjs`
- Modify: `package.json` (devDependency `marked`, scripts)
- Test: `projects/hightower-website/scripts/build-content.test.mjs`

**Interfaces:**
- Produces (in `src/app/content/models.ts`): `ProjectKind`, `Status`, `Link`, `Image`, `VideoSource`, `HeroConfig`, `Project`, `Product`, `ProductKind`, `Service`, `SiteConfig`.
- Produces (generated `src/app/content/content.generated.ts`): `SITE: SiteConfig`, `PROJECTS: Project[]`, `PRODUCTS: Product[]`, `SERVICES: Service[]`.
- Produces (in `scripts/build-content.mjs`): `renderMarkdown(md: string): string`, `withHtml(entries)`, `toModule({ site, projects, products, services }): string`.
- Produces npm scripts: `content:website`, `test:website`, `test:website:scripts`.

- [ ] **Step 1: Install marked (worktree root)**

Run: `npm i -D marked`
Expected: `marked` (v18.x) appears in `devDependencies`.

- [ ] **Step 2: Write the models**

`projects/hightower-website/src/app/content/models.ts`:
```ts
export type ProjectKind = 'lab' | 'product' | 'client';
export type ProductKind = 'library' | 'app';
export type Status = 'live' | 'in-progress' | 'concept';

export interface Link {
  label: string;
  url: string;
}

export interface Image {
  src: string;
  alt: string;
}

export interface VideoSource {
  src: string;
  type: string; // e.g. 'video/webm', 'video/mp4'
}

export interface HeroConfig {
  headline: string;
  lead: string;
  poster: Image;
  videoSources: VideoSource[]; // empty → poster only
}

export interface Project {
  slug: string;
  kind: ProjectKind;
  name: string;
  tagline: string;
  summary: string; // one line, for cards
  descriptionHtml: string; // generated from markdown at build time
  client?: string; // client name, for kind === 'client'
  status: Status;
  tech: string[];
  links: Link[];
  images: Image[]; // images[0] is the card/hero image
  featured: boolean; // shown on Home
  productSlug?: string; // kind === 'product' → its canonical page under /products
}

export interface Product {
  slug: string;
  kind: ProductKind;
  name: string;
  summary: string;
  descriptionHtml: string;
  install?: string; // only set once the package is published to npm
  repoUrl?: string;
  npmUrl?: string; // only set once published
  docsUrl?: string;
  producedBy?: string; // slug of the lab project that produced it
  status: Status;
}

export interface Service {
  slug: string; // also used as the contact-form topic value
  name: string;
  summary: string;
  descriptionHtml: string;
  order: number;
}

export interface SiteConfig {
  companyName: string;
  siteUrl: string; // absolute origin, no trailing slash
  tagline: string;
  email: string;
  location: string;
  socials: Link[];
  defaultOgImage: string; // site-relative path
  responseTime: string;
  footerVerse?: { text: string; reference: string };
  hero: HeroConfig;
}
```

- [ ] **Step 3: Write the authored content**

`projects/hightower-website/content/source-types.mts`:
```ts
import type { Product, Project, Service } from '../src/app/content/models';

/** Authored form of a model: markdown `description` in place of generated `descriptionHtml`. */
export type WithMarkdown<T extends { descriptionHtml: string }> = Omit<T, 'descriptionHtml'> & {
  description: string;
};

export type ProjectSource = WithMarkdown<Project>;
export type ProductSource = WithMarkdown<Product>;
export type ServiceSource = WithMarkdown<Service>;
```

`projects/hightower-website/content/site.mts`:
```ts
import type { SiteConfig } from '../src/app/content/models';

export const site: SiteConfig = {
  companyName: 'Hightower Software Technologies',
  siteUrl: 'https://example.com', // [DOMAIN]: replace before launch (spec §9)
  tagline: 'Expert software development & consulting',
  email: 'hello@example.com', // [EMAIL ADDRESS]
  location: '[CITY, STATE]',
  responseTime: '[RESPONSE TIME]',
  socials: [
    { label: 'GitHub', url: 'https://github.com/plearaj' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/' }, // [LINKEDIN URL]
  ],
  defaultOgImage: '/images/og-default.png',
  footerVerse: {
    text: 'The name of the LORD is a strong tower: the righteous runneth into it, and is safe.',
    reference: 'Proverbs 18:10',
  },
  hero: {
    headline: 'Software built on solid ground.',
    lead: 'We design and develop custom applications for clients, run Project Red Sea as our research lab, and ship the products and open libraries that come out of it.',
    poster: {
      src: '/images/hightower-hero.webp',
      alt: 'Illustration of a tall stone tower rising into a starry night sky',
    },
    videoSources: [
      // Add when the owner supplies the video (spec §6):
      // { src: '/media/hero.webm', type: 'video/webm' },
      // { src: '/media/hero.mp4', type: 'video/mp4' },
    ],
  },
};
```

`projects/hightower-website/content/projects.mts`:
```ts
import type { ProjectSource } from './source-types';

export const projects: ProjectSource[] = [
  {
    slug: 'red-sea',
    kind: 'lab',
    name: 'Project Red Sea',
    tagline: '[Tagline: what the lab is for, in one sentence.]',
    summary: '[One-line description of what Red Sea explores.]',
    description: `
## [Section heading]

[Paragraph: what Red Sea is, the problems it explores, and how experiments graduate into products.]

[Paragraph: how you work in the lab: tools, approach, cadence.]

### [Subheading]

- [Point]
- [Point]
- [Point]
`,
    status: 'in-progress',
    tech: ['[Tech]', '[Tech]', '[Tech]'],
    links: [],
    images: [],
    featured: true,
  },
  {
    slug: 'logos',
    kind: 'product',
    name: 'Logos',
    tagline: 'The pattern of reason',
    summary: '[One-line description of what Logos does and who it is for.]',
    description: '[Logos description: the canonical page is /products/logos.]',
    status: 'in-progress', // [STATUS]
    tech: [],
    links: [],
    images: [{ src: '/images/logos.webp', alt: 'Golden-veined mountains beneath a spiral galaxy' }],
    featured: true,
    productSlug: 'logos',
  },
  {
    slug: 'kree-house-of-beauty',
    kind: 'client',
    name: 'Kree House of Beauty',
    tagline: '[Tagline]',
    summary: '[One-line description: what the app does for the business and its customers.]',
    description: '[Project write-up: the problem, what was built, and the outcome.]',
    client: 'Kree House of Beauty',
    status: 'live', // [STATUS]
    tech: [],
    links: [],
    images: [],
    featured: true,
  },
  {
    slug: 'lalas-anime-world',
    kind: 'client',
    name: "Lala's Anime World",
    tagline: '[Tagline]',
    summary: '[One-line description: what the app does for the business and its customers.]',
    description: '[Project write-up: the problem, what was built, and the outcome.]',
    client: "Lala's Anime World",
    status: 'live', // [STATUS]
    tech: [],
    links: [],
    images: [],
    featured: true,
  },
];
```

`projects/hightower-website/content/products.mts`:
```ts
import type { ProductSource } from './source-types';

const REPO = 'https://github.com/plearaj/ht-libraries'; // confirm the repo is public before launch

export const products: ProductSource[] = [
  {
    slug: 'logos',
    kind: 'app',
    name: 'Logos',
    summary: '[One-line description of what Logos does and who it is for.]',
    description: `
## [What Logos is]

[Paragraph describing Logos.]
`,
    producedBy: 'red-sea',
    status: 'in-progress', // [STATUS]
  },
  {
    slug: 'ht-quick-angular-table',
    kind: 'library',
    name: 'ht-quick-angular-table',
    summary:
      'A declarative Angular Material data table — filtering, pagination, selection, inline editing and drag-and-drop from one settings object, with an optional AI layer.',
    description: `
Declarative Angular Material data table driven by a single \`TableSettings\` instance plus a stream of rows. Add filtering, pagination, selection, action columns, inline add/save/delete, and drag-and-drop without writing a custom table component.

An optional Python backend unlocks data-ingestion skills (Excel, API, SQL), an AI table builder, chart and insights widgets, and an agent that runs actions over your rows.
`,
    repoUrl: `${REPO}/tree/main/projects/ht-quick-angular-table`,
    status: 'in-progress',
  },
  {
    slug: 'ht-quick-ngxfire',
    kind: 'library',
    name: 'ht-quick-ngxfire',
    summary:
      'Firebase auth, Firestore and Storage for Angular as signals and guards — with a simulation mode that runs with zero Firebase config.',
    description: `
Opinionated Angular 21 wrapper around \`@angular/fire\`: signal-based auth, a thin Firestore wrapper, a Storage wrapper, a drop-in login component, route guards for auth and roles, and a simulation mode that lets the same code run with zero Firebase config in development.
`,
    repoUrl: `${REPO}/tree/main/projects/ht-quick-ngxfire`,
    status: 'in-progress',
  },
  {
    slug: 'ht-camera-upload',
    kind: 'library',
    name: 'ht-camera-upload',
    summary:
      'One component for capturing images from browser camera, native Capacitor camera, file picker or gallery — handed to your own uploader.',
    description: `
Capture an image from the browser camera, the native Capacitor camera, a file picker or the photo gallery, and hand it to an uploader you supply. Every source is normalized to one \`CapturedImage\` shape, with optional resize and compression on the browser path.
`,
    repoUrl: `${REPO}/tree/main/projects/ht-camera-upload`,
    status: 'in-progress',
  },
];
```

`projects/hightower-website/content/services.mts`:
```ts
import type { ServiceSource } from './source-types';

// The third service is added once the owner supplies it (spec §9). Adding a service
// also requires adding its slug to the topic list in firestore.rules. build-content enforces this.
export const services: ServiceSource[] = [
  {
    slug: 'custom-development',
    name: 'Custom Development',
    summary:
      'Web and mobile applications built end to end — from first sketch to production — on Angular, Firebase and Capacitor.',
    description: `
[Paragraph: how a custom build works, from discovery to launch and support.]

- [What you get]
- [What you get]
- [What you get]
`,
    order: 1,
  },
  {
    slug: 'consulting',
    name: 'Consulting',
    summary:
      'Architecture reviews, modernization plans and hands-on guidance for teams that need a senior engineer in the room.',
    description: `
[Paragraph: how consulting engagements work.]

- [Engagement type]
- [Engagement type]
`,
    order: 2,
  },
];
```

- [ ] **Step 4: Write the failing script tests**

`projects/hightower-website/scripts/build-content.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, withHtml, toModule } from './build-content.mjs';

test('renderMarkdown converts markdown to HTML', () => {
  assert.equal(renderMarkdown('## Hello\n\nWorld'), '<h2>Hello</h2>\n<p>World</p>\n');
});

test('renderMarkdown opens external links in a new tab with noopener', () => {
  assert.equal(
    renderMarkdown('[Repo](https://github.com/x)'),
    '<p><a href="https://github.com/x" target="_blank" rel="noopener noreferrer">Repo</a></p>\n',
  );
});

test('renderMarkdown leaves internal links alone', () => {
  assert.equal(renderMarkdown('[Contact](/contact)'), '<p><a href="/contact">Contact</a></p>\n');
});

test('withHtml replaces description with descriptionHtml', () => {
  const [entry] = withHtml([{ slug: 'a', description: 'Hi' }]);
  assert.deepEqual(entry, { slug: 'a', descriptionHtml: '<p>Hi</p>\n' });
});

test('toModule emits typed exports with no raw markdown', () => {
  const source = toModule({
    site: { companyName: 'X' },
    projects: [{ slug: 'p', description: 'P' }],
    products: [{ slug: 'q', description: 'Q' }],
    services: [{ slug: 's', description: 'S' }],
  });
  assert.match(source, /^\/\/ GENERATED/);
  assert.match(source, /import type \{ Product, Project, Service, SiteConfig \} from '\.\/models';/);
  assert.match(source, /export const SITE: SiteConfig = /);
  assert.match(source, /export const PROJECTS: Project\[\] = /);
  assert.match(source, /export const PRODUCTS: Product\[\] = /);
  assert.match(source, /export const SERVICES: Service\[\] = /);
  assert.doesNotMatch(source, /"description":/);
});
```

- [ ] **Step 5: Add npm scripts and run the tests to verify they fail**

Add to `package.json` `"scripts"`:
```json
"content:website": "node projects/hightower-website/scripts/build-content.mjs",
"test:website": "npm run content:website && ng test hightower-website --watch=false --browsers=ChromeHeadless",
"test:website:scripts": "node --test \"projects/hightower-website/scripts/*.test.mjs\""
```
Run: `npm run test:website:scripts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `build-content.mjs`.

- [ ] **Step 6: Write the build script**

`projects/hightower-website/scripts/build-content.mjs`:
```js
// Converts authored content (content/*.mts) into src/app/content/content.generated.ts.
// Node 24 strips TypeScript types natively, so the .mts sources are imported directly.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Marked } from 'marked';

const marked = new Marked({ gfm: true });

export function renderMarkdown(markdown) {
  const html = marked.parse(markdown.trim(), { async: false });
  return html.replace(
    /<a href="(https?:\/\/[^"]*)"/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer"',
  );
}

export function withHtml(entries) {
  return entries.map(({ description, ...rest }) => ({
    ...rest,
    descriptionHtml: renderMarkdown(description),
  }));
}

export function toModule({ site, projects, products, services }) {
  const json = (value) => JSON.stringify(value, null, 2);
  return [
    '// GENERATED by projects/hightower-website/scripts/build-content.mjs. Do not edit.',
    "import type { Product, Project, Service, SiteConfig } from './models';",
    '',
    `export const SITE: SiteConfig = ${json(site)};`,
    '',
    `export const PROJECTS: Project[] = ${json(withHtml(projects))};`,
    '',
    `export const PRODUCTS: Product[] = ${json(withHtml(products))};`,
    '',
    `export const SERVICES: Service[] = ${json(withHtml(services))};`,
    '',
  ].join('\n');
}

async function main() {
  const [{ site }, { projects }, { products }, { services }] = await Promise.all([
    import('../content/site.mts'),
    import('../content/projects.mts'),
    import('../content/products.mts'),
    import('../content/services.mts'),
  ]);
  const out = fileURLToPath(new URL('../src/app/content/content.generated.ts', import.meta.url));
  await writeFile(out, toModule({ site, projects, products, services }));
  console.log(`build-content: wrote ${out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 7: Run the tests to verify they pass, then generate content**

Run: `npm run test:website:scripts`
Expected: PASS (5 tests).

Run: `npm run content:website`
Expected: prints `build-content: wrote …content.generated.ts`. The file exists, starts with `// GENERATED` and contains `"slug": "red-sea"`.

- [ ] **Step 8: Commit**

```bash
git add package.json projects/hightower-website/src/app/content/models.ts projects/hightower-website/content/source-types.mts projects/hightower-website/content/site.mts projects/hightower-website/content/projects.mts projects/hightower-website/content/products.mts projects/hightower-website/content/services.mts projects/hightower-website/scripts/build-content.mjs projects/hightower-website/scripts/build-content.test.mjs
git commit -m "feat(website): content models, seed content and build-time markdown

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Content repository, fixtures and content-integrity tests

**Files:**
- Create: `projects/hightower-website/src/app/content/content-repository.ts`, `projects/hightower-website/src/app/content/static-content-repository.ts`, `projects/hightower-website/src/app/content/labels.ts`, `projects/hightower-website/src/app/content/testing/content-fixtures.ts`
- Modify: `projects/hightower-website/src/app/app.config.ts`
- Test: `projects/hightower-website/src/app/content/static-content-repository.spec.ts`, `projects/hightower-website/src/app/content/content-integrity.spec.ts`

**Interfaces:**
- Consumes: the models and the generated `SITE`/`PROJECTS`/`PRODUCTS`/`SERVICES` (Task 2).
- Produces:
  - `abstract class ContentRepository` with:
    - `site(): Observable<SiteConfig>`
    - `projects(filter?: ProjectFilter): Observable<Project[]>`
    - `projectBySlug(slug: string): Observable<Project | undefined>`
    - `services(): Observable<Service[]>` (sorted by `order`)
    - `products(filter?: ProductFilter): Observable<Product[]>`
    - `productBySlug(slug: string): Observable<Product | undefined>`
    - `producedBy(labSlug: string): Observable<Product[]>`
  - `ProjectFilter = { kind?: ProjectKind; featured?: boolean }`, `ProductFilter = { kind?: ProductKind }`.
  - `ContentData`, `CONTENT_DATA: InjectionToken<ContentData>`, `StaticContentRepository`.
  - From `labels.ts`: `STATUS_LABEL`, `PROJECT_KIND_LABEL`, `PRODUCT_KIND_LABEL`, `projectLink(p: Project): string`.
  - From `testing/content-fixtures.ts`: `FIXTURE_SITE`, `FIXTURE_PROJECTS`, `FIXTURE_PRODUCTS`, `FIXTURE_SERVICES`, `provideFixtureContent(): Provider[]`.

- [ ] **Step 1: Write the fixtures**

`projects/hightower-website/src/app/content/testing/content-fixtures.ts`:
```ts
import { Provider } from '@angular/core';
import { ContentRepository } from '../content-repository';
import { Product, Project, Service, SiteConfig } from '../models';
import { CONTENT_DATA, StaticContentRepository } from '../static-content-repository';

export const FIXTURE_SITE: SiteConfig = {
  companyName: 'Test Co',
  siteUrl: 'https://test.example',
  tagline: 'Testing things',
  email: 'hi@test.example',
  location: 'Testville, TS',
  socials: [{ label: 'GitHub', url: 'https://github.com/test' }],
  defaultOgImage: '/images/og-default.png',
  responseTime: 'two business days',
  footerVerse: { text: 'A verse.', reference: 'Book 1:1' },
  hero: {
    headline: 'Hero headline',
    lead: 'Hero lead.',
    poster: { src: '/images/poster.webp', alt: 'Poster alt' },
    videoSources: [],
  },
};

const base = { tagline: 'Tagline', summary: 'Summary', descriptionHtml: '<p>Body</p>', tech: [], links: [], images: [] };

export const FIXTURE_PROJECTS: Project[] = [
  { ...base, slug: 'lab-one', kind: 'lab', name: 'Lab One', status: 'in-progress', featured: true },
  { ...base, slug: 'prod-one', kind: 'product', name: 'Prod One', status: 'live', featured: true, productSlug: 'prod-one' },
  { ...base, slug: 'client-one', kind: 'client', name: 'Client One', client: 'Client One Inc', status: 'live', featured: true },
  { ...base, slug: 'client-two', kind: 'client', name: 'Client Two', status: 'concept', featured: false },
];

export const FIXTURE_PRODUCTS: Product[] = [
  { slug: 'prod-one', kind: 'app', name: 'Prod One', summary: 'An app', descriptionHtml: '<p>App</p>', producedBy: 'lab-one', status: 'live' },
  { slug: 'lib-one', kind: 'library', name: 'lib-one', summary: 'A library', descriptionHtml: '<p>Lib</p>', install: 'npm i lib-one', repoUrl: 'https://github.com/test/lib-one', status: 'live' },
];

export const FIXTURE_SERVICES: Service[] = [
  { slug: 'consulting', name: 'Consulting', summary: 'Advice', descriptionHtml: '<p>C</p>', order: 2 },
  { slug: 'custom-development', name: 'Custom Development', summary: 'Builds', descriptionHtml: '<p>D</p>', order: 1 },
];

export function provideFixtureContent(): Provider[] {
  return [
    {
      provide: CONTENT_DATA,
      useValue: { site: FIXTURE_SITE, projects: FIXTURE_PROJECTS, products: FIXTURE_PRODUCTS, services: FIXTURE_SERVICES },
    },
    { provide: ContentRepository, useClass: StaticContentRepository },
  ];
}
```

- [ ] **Step 2: Write the failing repository spec**

`projects/hightower-website/src/app/content/static-content-repository.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ContentRepository } from './content-repository';
import { provideFixtureContent } from './testing/content-fixtures';

describe('StaticContentRepository', () => {
  let repo: ContentRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFixtureContent() });
    repo = TestBed.inject(ContentRepository);
  });

  it('returns the site config', async () => {
    expect((await firstValueFrom(repo.site())).companyName).toBe('Test Co');
  });

  it('returns all projects when unfiltered', async () => {
    expect((await firstValueFrom(repo.projects())).length).toBe(4);
  });

  it('filters projects by kind', async () => {
    const clients = await firstValueFrom(repo.projects({ kind: 'client' }));
    expect(clients.map((p) => p.slug)).toEqual(['client-one', 'client-two']);
  });

  it('filters projects by featured', async () => {
    const featured = await firstValueFrom(repo.projects({ featured: true }));
    expect(featured.map((p) => p.slug)).toEqual(['lab-one', 'prod-one', 'client-one']);
  });

  it('finds a project by slug, or undefined', async () => {
    expect((await firstValueFrom(repo.projectBySlug('lab-one')))?.name).toBe('Lab One');
    expect(await firstValueFrom(repo.projectBySlug('nope'))).toBeUndefined();
  });

  it('sorts services by order', async () => {
    const services = await firstValueFrom(repo.services());
    expect(services.map((s) => s.slug)).toEqual(['custom-development', 'consulting']);
  });

  it('filters products by kind and finds by slug', async () => {
    expect((await firstValueFrom(repo.products({ kind: 'library' }))).map((p) => p.slug)).toEqual(['lib-one']);
    expect((await firstValueFrom(repo.productBySlug('prod-one')))?.kind).toBe('app');
    expect(await firstValueFrom(repo.productBySlug('nope'))).toBeUndefined();
  });

  it('lists products produced by a lab', async () => {
    expect((await firstValueFrom(repo.producedBy('lab-one'))).map((p) => p.slug)).toEqual(['prod-one']);
    expect(await firstValueFrom(repo.producedBy('client-one'))).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run test:website -- --include="**/static-content-repository.spec.ts"`
Expected: FAIL. The compile error is "Cannot find module './content-repository'".

- [ ] **Step 4: Implement the repository and labels**

`projects/hightower-website/src/app/content/content-repository.ts`:
```ts
import { Observable } from 'rxjs';
import { Product, ProductKind, Project, ProjectKind, Service, SiteConfig } from './models';

export interface ProjectFilter {
  kind?: ProjectKind;
  featured?: boolean;
}

export interface ProductFilter {
  kind?: ProductKind;
}

/** Async from day one so the content source can change without touching components. */
export abstract class ContentRepository {
  abstract site(): Observable<SiteConfig>;
  abstract projects(filter?: ProjectFilter): Observable<Project[]>;
  abstract projectBySlug(slug: string): Observable<Project | undefined>;
  abstract services(): Observable<Service[]>;
  abstract products(filter?: ProductFilter): Observable<Product[]>;
  abstract productBySlug(slug: string): Observable<Product | undefined>;
  abstract producedBy(labSlug: string): Observable<Product[]>;
}
```

`projects/hightower-website/src/app/content/static-content-repository.ts`:
```ts
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PRODUCTS, PROJECTS, SERVICES, SITE } from './content.generated';
import { ContentRepository, ProductFilter, ProjectFilter } from './content-repository';
import { Product, Project, Service, SiteConfig } from './models';

export interface ContentData {
  site: SiteConfig;
  projects: Project[];
  products: Product[];
  services: Service[];
}

export const CONTENT_DATA = new InjectionToken<ContentData>('CONTENT_DATA', {
  providedIn: 'root',
  factory: () => ({ site: SITE, projects: PROJECTS, products: PRODUCTS, services: SERVICES }),
});

@Injectable()
export class StaticContentRepository extends ContentRepository {
  private readonly data = inject(CONTENT_DATA);

  override site(): Observable<SiteConfig> {
    return of(this.data.site);
  }

  override projects(filter: ProjectFilter = {}): Observable<Project[]> {
    return of(
      this.data.projects.filter(
        (p) =>
          (filter.kind === undefined || p.kind === filter.kind) &&
          (filter.featured === undefined || p.featured === filter.featured),
      ),
    );
  }

  override projectBySlug(slug: string): Observable<Project | undefined> {
    return of(this.data.projects.find((p) => p.slug === slug));
  }

  override services(): Observable<Service[]> {
    return of([...this.data.services].sort((a, b) => a.order - b.order));
  }

  override products(filter: ProductFilter = {}): Observable<Product[]> {
    return of(this.data.products.filter((p) => filter.kind === undefined || p.kind === filter.kind));
  }

  override productBySlug(slug: string): Observable<Product | undefined> {
    return of(this.data.products.find((p) => p.slug === slug));
  }

  override producedBy(labSlug: string): Observable<Product[]> {
    return of(this.data.products.filter((p) => p.producedBy === labSlug));
  }
}
```

`projects/hightower-website/src/app/content/labels.ts`:
```ts
import { ProductKind, Project, ProjectKind, Status } from './models';

export const STATUS_LABEL: Record<Status, string> = {
  live: 'Live',
  'in-progress': 'In progress',
  concept: 'Concept',
};

export const PROJECT_KIND_LABEL: Record<ProjectKind, string> = {
  lab: 'Lab',
  product: 'Product',
  client: 'Client',
};

export const PRODUCT_KIND_LABEL: Record<ProductKind, string> = {
  app: 'App',
  library: 'Library',
};

/** Product-kind projects have one canonical page under /products. */
export function projectLink(project: Project): string {
  return project.kind === 'product' && project.productSlug
    ? `/products/${project.productSlug}`
    : `/portfolio/${project.slug}`;
}
```

Add the provider to `projects/hightower-website/src/app/app.config.ts`. Add these imports:
```ts
import { ContentRepository } from './content/content-repository';
import { StaticContentRepository } from './content/static-content-repository';
```
and append to `providers`:
```ts
    { provide: ContentRepository, useClass: StaticContentRepository },
```

- [ ] **Step 5: Run the repository spec to verify it passes**

Run: `npm run test:website -- --include="**/static-content-repository.spec.ts"`
Expected: PASS (8 specs).

- [ ] **Step 6: Write the content-integrity spec (runs against the real generated content)**

`projects/hightower-website/src/app/content/content-integrity.spec.ts`:
```ts
import { PRODUCTS, PROJECTS, SERVICES, SITE } from './content.generated';
import { Image } from './models';

function duplicates(slugs: string[]): string[] {
  return slugs.filter((slug, i) => slugs.indexOf(slug) !== i);
}

describe('content integrity', () => {
  it('has unique slugs within each collection', () => {
    expect(duplicates(PROJECTS.map((p) => p.slug))).toEqual([]);
    expect(duplicates(PRODUCTS.map((p) => p.slug))).toEqual([]);
    expect(duplicates(SERVICES.map((s) => s.slug))).toEqual([]);
  });

  it('points every producedBy at an existing lab project', () => {
    const labs = PROJECTS.filter((p) => p.kind === 'lab').map((p) => p.slug);
    const broken = PRODUCTS.filter((p) => p.producedBy && !labs.includes(p.producedBy)).map((p) => p.slug);
    expect(broken).toEqual([]);
  });

  it('gives every product-kind project a productSlug that exists', () => {
    const productSlugs = PRODUCTS.map((p) => p.slug);
    const broken = PROJECTS.filter(
      (p) => p.kind === 'product' && (!p.productSlug || !productSlugs.includes(p.productSlug)),
    ).map((p) => p.slug);
    expect(broken).toEqual([]);
  });

  it('gives every image alt text', () => {
    const images: Image[] = [SITE.hero.poster, ...PROJECTS.flatMap((p) => p.images)];
    expect(images.filter((img) => img.alt.trim() === '').map((img) => img.src)).toEqual([]);
  });

  it('uses an absolute siteUrl with no trailing slash', () => {
    expect(SITE.siteUrl).toMatch(/^https:\/\/[^/]+$/);
  });
});
```

- [ ] **Step 7: Run the full suite**

Run: `npm run test:website`
Expected: PASS. That's 14 specs: 1 app, 8 repository and 5 integrity.

- [ ] **Step 8: Commit**

```bash
git add projects/hightower-website/src/app/content/content-repository.ts projects/hightower-website/src/app/content/static-content-repository.ts projects/hightower-website/src/app/content/static-content-repository.spec.ts projects/hightower-website/src/app/content/labels.ts projects/hightower-website/src/app/content/testing/content-fixtures.ts projects/hightower-website/src/app/content/content-integrity.spec.ts projects/hightower-website/src/app/app.config.ts
git commit -m "feat(website): content repository with integrity checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Brand styling (fonts, tokens, Material theme, base styles)

**Files:**
- Create: `projects/hightower-website/public/fonts/*.woff2` (7 files), `projects/hightower-website/src/styles/_tokens.scss`, `projects/hightower-website/src/styles/_fonts.scss`, `projects/hightower-website/src/styles/_theme.scss`, `projects/hightower-website/src/styles/_base.scss`
- Modify: `projects/hightower-website/src/styles.scss`, `projects/hightower-website/src/index.html`

**Interfaces:**
- Produces CSS custom properties: `--hs-night`, `--hs-deep`, `--hs-surface`, `--hs-line`, `--hs-line-strong`, `--hs-ivory`, `--hs-muted`, `--hs-soft`, `--hs-gold`, `--hs-gold-hover`, `--hs-gold-pale`, `--hs-violet`, `--hs-violet-text`, `--hs-blue`, `--hs-blue-text`, `--hs-font-display`, `--hs-font-body`, `--hs-font-verse`, `--hs-font-mono`, `--hs-max`, `--hs-gutter`.
- Produces global utility classes:
  - Layout: `.hs-container`, `.hs-band`, `.hs-band--deep`, `.hs-band--surface`, `.hs-grid`.
  - Text: `.hs-eyebrow`, `.hs-meta`, `.hs-lead`.
  - Buttons and links: `.hs-btn`, `.hs-btn--ghost`, `.hs-link-arrow`.
  - Tags: `.hs-tag`, `.hs-tag--lab`, `.hs-tag--product`, `.hs-tag--client`, `.hs-tag--library`.
  - Helpers: `.hs-placeholder`, `.visually-hidden`, `.skip-link`.

- [ ] **Step 1: Copy the self-hosted font files**

Run (Bash, worktree root):
```bash
npm i --no-save @fontsource/cinzel @fontsource/jost @fontsource/cormorant-garamond @fontsource/ibm-plex-mono
mkdir -p projects/hightower-website/public/fonts
cp node_modules/@fontsource/cinzel/files/cinzel-latin-600-normal.woff2 node_modules/@fontsource/cinzel/files/cinzel-latin-700-normal.woff2 node_modules/@fontsource/jost/files/jost-latin-400-normal.woff2 node_modules/@fontsource/jost/files/jost-latin-500-normal.woff2 node_modules/@fontsource/jost/files/jost-latin-600-normal.woff2 node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2 node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2 projects/hightower-website/public/fonts/
ls projects/hightower-website/public/fonts
```
Expected: 7 `.woff2` files are listed. `--no-save` keeps the font packages out of `package.json`. All four families are SIL OFL, which permits self-hosting.

- [ ] **Step 2: Write the style partials**

`projects/hightower-website/src/styles/_tokens.scss`:
```scss
:root {
  --hs-night: #0A1226;
  --hs-deep: #070D1C;
  --hs-surface: #121C36;
  --hs-line: #2A3760;
  --hs-line-strong: #4A5781;
  --hs-ivory: #EFEBE1;
  --hs-muted: #A9B1C7;
  --hs-soft: #D3D8E4;
  --hs-gold: #E3B054;
  --hs-gold-hover: #F3CD85;
  --hs-gold-pale: #E9D8A6;
  --hs-violet: #A98BF0;
  --hs-violet-text: #BFA8F5;
  --hs-blue: #7FA8D9;
  --hs-blue-text: #A8C6EA;

  --hs-font-display: 'Cinzel', 'Trajan Pro', Georgia, serif;
  --hs-font-body: 'Jost', 'Avenir Next', 'Segoe UI', sans-serif;
  --hs-font-verse: 'Cormorant Garamond', Georgia, serif;
  --hs-font-mono: 'IBM Plex Mono', Consolas, monospace;

  --hs-max: 1240px;
  --hs-gutter: clamp(16px, 4vw, 40px);
}
```

`projects/hightower-website/src/styles/_fonts.scss`:
```scss
@mixin face($family, $file, $weight, $style: normal) {
  @font-face {
    font-family: $family;
    src: url('/fonts/#{$file}.woff2') format('woff2');
    font-weight: $weight;
    font-style: $style;
    font-display: swap;
  }
}

@include face('Cinzel', 'cinzel-latin-600-normal', 600);
@include face('Cinzel', 'cinzel-latin-700-normal', 700);
@include face('Jost', 'jost-latin-400-normal', 400);
@include face('Jost', 'jost-latin-500-normal', 500);
@include face('Jost', 'jost-latin-600-normal', 600);
@include face('Cormorant Garamond', 'cormorant-garamond-latin-500-italic', 500, italic);
@include face('IBM Plex Mono', 'ibm-plex-mono-latin-400-normal', 400);
```

`projects/hightower-website/src/styles/_theme.scss`:
```scss
@use '@angular/material' as mat;

html {
  color-scheme: dark;
  @include mat.theme((
    color: (primary: mat.$yellow-palette, tertiary: mat.$violet-palette, theme-type: dark),
    typography: (plain-family: Jost, brand-family: Cinzel),
    density: 0,
  ));

  // Brand overrides of Material system tokens (declared after the include so they win).
  --mat-sys-primary: #E3B054;
  --mat-sys-on-primary: #0A1226;
  --mat-sys-surface: #0A1226;
  --mat-sys-on-surface: #EFEBE1;
  --mat-sys-on-surface-variant: #A9B1C7;
  --mat-sys-outline: #4A5781;
  --mat-sys-outline-variant: #2A3760;
  --mat-sys-surface-container-lowest: #070D1C;
  --mat-sys-surface-container-low: #0D1530;
  --mat-sys-surface-container: #121C36;
  --mat-sys-surface-container-high: #16203D;
  --mat-sys-surface-container-highest: #1A2647;
  --mat-sys-error: #FFB4AB;
  --mat-sys-corner-extra-small: 0;
  --mat-sys-corner-small: 0;
  --mat-sys-corner-medium: 0;
}
```

`projects/hightower-website/src/styles/_base.scss`:
```scss
*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  background: var(--hs-night);
  color: var(--hs-ivory);
  font-family: var(--hs-font-body);
}

body { font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased; }

img, video { max-width: 100%; display: block; }

a { color: var(--hs-gold); }
a:hover { color: var(--hs-gold-hover); }

:focus-visible { outline: 2px solid var(--hs-gold); outline-offset: 3px; }

h1, h2, h3 {
  margin: 0;
  font-family: var(--hs-font-display);
  font-weight: 600;
  line-height: 1.15;
  text-wrap: balance;
}

p { margin: 0; }

.hs-container { max-width: var(--hs-max); margin: 0 auto; padding-inline: var(--hs-gutter); }

.hs-band { padding-block: clamp(64px, 9vw, 112px); }
.hs-band--deep { background: var(--hs-deep); border-top: 1px solid #1C2748; }
.hs-band--surface { background: var(--hs-surface); border-top: 1px solid var(--hs-line); }

.hs-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
}

.hs-eyebrow {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--hs-gold);
}

.hs-meta {
  font-family: var(--hs-font-body);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--hs-muted);
}

.hs-lead { font-size: clamp(18px, 2vw, 21px); line-height: 1.6; color: var(--hs-soft); max-width: 680px; }

.hs-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 12px 24px;
  border: 0;
  background: var(--hs-gold);
  color: var(--hs-night);
  font: inherit;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-decoration: none;
  cursor: pointer;

  &:hover { background: var(--hs-gold-hover); color: var(--hs-night); }
  &:disabled { opacity: 0.6; cursor: progress; }
}

.hs-btn--ghost {
  background: transparent;
  color: var(--hs-ivory);
  box-shadow: inset 0 0 0 1px var(--hs-ivory);

  &:hover { background: transparent; color: var(--hs-gold); box-shadow: inset 0 0 0 1px var(--hs-gold); }
}

.hs-link-arrow { font-weight: 600; letter-spacing: 0.04em; text-decoration: none; }

.hs-tag {
  display: inline-block;
  padding: 6px 10px;
  border: 1px solid currentColor;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.hs-tag--lab { color: var(--hs-gold); }
.hs-tag--product { color: var(--hs-violet-text); border-color: var(--hs-violet); }
.hs-tag--client { color: var(--hs-blue-text); border-color: var(--hs-blue); }
.hs-tag--library { color: var(--hs-muted); border-color: var(--hs-line-strong); }

.hs-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--hs-surface);
  border: 1px solid var(--hs-line);
  color: var(--hs-muted);
  font-size: 14px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-align: center;
  padding: 16px;
}

.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.skip-link {
  position: absolute;
  left: 16px;
  top: -100px;
  z-index: 1000;
  padding: 12px 16px;
  background: var(--hs-gold);
  color: var(--hs-night);
  font-weight: 600;

  &:focus { top: 16px; color: var(--hs-night); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Wire the partials together and preload the two critical fonts**

Replace `projects/hightower-website/src/styles.scss` with:
```scss
@use 'styles/tokens';
@use 'styles/fonts';
@use 'styles/theme';
@use 'styles/base';
```

In `projects/hightower-website/src/index.html`, add after the favicon `<link>`:
```html
  <link rel="preload" href="/fonts/cinzel-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/jost-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
```

- [ ] **Step 4: Verify the build and tests**

Run: `npm run content:website && npx ng build hightower-website`
Expected: the build succeeds with no Sass errors. `ls projects/hightower-website/dist/browser/fonts` lists 7 files.

Run: `npm run test:website`
Expected: PASS (14 specs).

- [ ] **Step 5: Commit**

```bash
git add projects/hightower-website/public/fonts projects/hightower-website/src/styles projects/hightower-website/src/styles.scss projects/hightower-website/src/index.html
git commit -m "feat(website): brand tokens, self-hosted fonts and Material theme

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Site shell (header, footer, mobile drawer, site resolver)

**Files:**
- Create: `projects/hightower-website/src/app/layout/nav-links.ts`, `projects/hightower-website/src/app/layout/site-header/site-header.ts`, `.../site-header/site-header.html`, `.../site-header/site-header.scss`, `projects/hightower-website/src/app/layout/site-footer/site-footer.ts`, `.../site-footer/site-footer.html`, `.../site-footer/site-footer.scss`, `projects/hightower-website/src/app/layout/shell/shell.ts`, `.../shell/shell.html`, `.../shell/shell.scss`, `projects/hightower-website/src/app/routing/content-resolvers.ts`
- Modify: `projects/hightower-website/src/app/app.routes.ts`
- Test: `projects/hightower-website/src/app/layout/site-header/site-header.spec.ts`, `projects/hightower-website/src/app/layout/site-footer/site-footer.spec.ts`

**Interfaces:**
- Consumes: `ContentRepository`, `SiteConfig`, `FIXTURE_SITE`.
- Produces:
  - `NAV_LINKS: readonly NavLink[]` (`{ label, path }`).
  - `SiteHeader`, with `companyName = input.required<string>()` and `menuOpen = output<void>()`.
  - `SiteFooter`, with `site = input.required<SiteConfig>()`.
  - `Shell`, with `site = input.required<SiteConfig>()`. It is the parent route component.
  - `siteResolver: ResolveFn<SiteConfig>` in `routing/content-resolvers.ts`.
  - Every child route inherits the `site` input through `paramsInheritanceStrategy: 'always'`.

- [ ] **Step 1: Write the failing header and footer specs**

`projects/hightower-website/src/app/layout/site-header/site-header.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [SiteHeader], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.componentRef.setInput('companyName', 'Test Co');
    await fixture.whenStable();
    return fixture;
  }

  it('shows the wordmark linking home', async () => {
    const el: HTMLElement = (await setup()).nativeElement;
    const home = el.querySelector<HTMLAnchorElement>('a.wordmark');
    expect(home?.textContent).toContain('Test Co');
    expect(home?.getAttribute('href')).toBe('/');
  });

  it('renders the main nav links and the Start a project button', async () => {
    const el: HTMLElement = (await setup()).nativeElement;
    const labels = Array.from(el.querySelectorAll('nav[aria-label="Main"] a')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Portfolio', 'Services', 'Products', 'About', 'Start a project']);
  });

  it('emits menuOpen when the menu button is clicked', async () => {
    const fixture = await setup();
    let opened = false;
    fixture.componentInstance.menuOpen.subscribe(() => (opened = true));
    fixture.nativeElement.querySelector('button.menu-button').click();
    expect(opened).toBeTrue();
  });
});
```

`projects/hightower-website/src/app/layout/site-footer/site-footer.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FIXTURE_SITE } from '../../content/testing/content-fixtures';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('shows the verse, location and social links', async () => {
    await TestBed.configureTestingModule({ imports: [SiteFooter], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.componentRef.setInput('site', FIXTURE_SITE);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('blockquote')?.textContent).toContain('A verse.');
    expect(el.textContent).toContain('Book 1:1');
    expect(el.textContent).toContain('Testville, TS');
    expect(el.querySelector<HTMLAnchorElement>('a[href="https://github.com/test"]')?.textContent).toContain('GitHub');
  });

  it('omits the verse when none is configured', async () => {
    await TestBed.configureTestingModule({ imports: [SiteFooter], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.componentRef.setInput('site', { ...FIXTURE_SITE, footerVerse: undefined });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('blockquote')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website -- --include="**/layout/**/*.spec.ts"`
Expected: FAIL with "Cannot find module './site-header'" and "Cannot find module './site-footer'".

- [ ] **Step 3: Implement the nav links, header and footer**

`projects/hightower-website/src/app/layout/nav-links.ts`:
```ts
export interface NavLink {
  label: string;
  path: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: 'Portfolio', path: '/portfolio' },
  { label: 'Services', path: '/services' },
  { label: 'Products', path: '/products' },
  { label: 'About', path: '/about' },
];
```

`projects/hightower-website/src/app/layout/site-header/site-header.ts`:
```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_LINKS } from '../nav-links';

@Component({
  selector: 'hs-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  readonly companyName = input.required<string>();
  readonly menuOpen = output<void>();
  protected readonly links = NAV_LINKS;
}
```

`projects/hightower-website/src/app/layout/site-header/site-header.html`:
```html
<header class="header">
  <div class="hs-container header__inner">
    <a class="wordmark" routerLink="/">
      <span class="wordmark__text">{{ companyName() }}</span>
      <svg class="wordmark__star" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" />
      </svg>
    </a>
    <nav class="nav" aria-label="Main">
      @for (link of links; track link.path) {
        <a class="nav__link" [routerLink]="link.path" routerLinkActive="is-active" ariaCurrentWhenActive="page">{{ link.label }}</a>
      }
      <a class="hs-btn nav__cta" routerLink="/contact">Start a project</a>
    </nav>
    <button type="button" class="menu-button" aria-label="Open menu" (click)="menuOpen.emit()">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" fill="none" />
      </svg>
    </button>
  </div>
</header>
```

`projects/hightower-website/src/app/layout/site-header/site-header.scss`:
```scss
.header { background: var(--hs-night); border-bottom: 1px solid var(--hs-line); }

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 72px;
}

.wordmark {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--hs-ivory);
  text-decoration: none;
  min-width: 0;
}

.wordmark__text {
  font-family: var(--hs-font-display);
  font-weight: 600;
  font-size: clamp(13px, 3.4vw, 18px);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.wordmark__star { flex: none; fill: var(--hs-gold); }

.nav { display: none; align-items: center; gap: 2px; }

.nav__link {
  padding: 12px 14px;
  color: #CFD5E3;
  font-size: 15px;
  letter-spacing: 0.04em;
  text-decoration: none;

  &:hover { color: var(--hs-ivory); }
  &.is-active { color: var(--hs-ivory); box-shadow: inset 0 -2px 0 var(--hs-gold); }
}

.nav__cta { margin-left: 10px; font-size: 15px; }

.menu-button {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--hs-line);
  background: transparent;
  color: var(--hs-ivory);
  cursor: pointer;
}

@media (min-width: 900px) {
  .nav { display: flex; }
  .menu-button { display: none; }
}
```

`projects/hightower-website/src/app/layout/site-footer/site-footer.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfig } from '../../content/models';
import { NAV_LINKS } from '../nav-links';

@Component({
  selector: 'hs-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  readonly site = input.required<SiteConfig>();
  protected readonly links = [...NAV_LINKS, { label: 'Contact', path: '/contact' }];
  protected readonly year = new Date().getFullYear();
}
```

`projects/hightower-website/src/app/layout/site-footer/site-footer.html`:
```html
<footer class="footer">
  @if (site().footerVerse; as verse) {
    <div class="hs-container footer__verse">
      <blockquote>
        <p>{{ verse.text }}</p>
        <cite class="hs-meta">{{ verse.reference }}</cite>
      </blockquote>
    </div>
  }
  <div class="hs-container footer__row">
    <span class="footer__wordmark">{{ site().companyName }}</span>
    <nav class="footer__links" aria-label="Footer">
      @for (link of links; track link.path) {
        <a [routerLink]="link.path">{{ link.label }}</a>
      }
      @for (social of site().socials; track social.url) {
        <a [href]="social.url" target="_blank" rel="noopener noreferrer">{{ social.label }}</a>
      }
    </nav>
    <span class="footer__legal">© {{ year }} · {{ site().location }}</span>
  </div>
</footer>
```

`projects/hightower-website/src/app/layout/site-footer/site-footer.scss`:
```scss
.footer { background: var(--hs-deep); color: var(--hs-muted); border-top: 1px solid #1C2748; font-size: 14px; }

.footer__verse { padding-block: 56px 24px; text-align: center; }

blockquote { margin: 0 auto; max-width: 640px; display: flex; flex-direction: column; gap: 12px; }

blockquote p {
  font-family: var(--hs-font-verse);
  font-style: italic;
  font-weight: 500;
  font-size: clamp(20px, 2.6vw, 26px);
  line-height: 1.4;
  color: var(--hs-gold-pale);
}

cite { font-style: normal; }

.footer__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px 32px;
  padding-block: 32px 40px;
}

.footer__wordmark {
  font-family: var(--hs-font-display);
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hs-ivory);
}

.footer__links { display: flex; flex-wrap: wrap; gap: 4px 20px; }

.footer__links a {
  color: var(--hs-muted);
  text-decoration: none;
  padding-block: 8px;

  &:hover { color: var(--hs-ivory); }
}
```

- [ ] **Step 4: Run the layout specs to verify they pass**

Run: `npm run test:website -- --include="**/layout/**/*.spec.ts"`
Expected: PASS (5 specs).

- [ ] **Step 5: Implement the site resolver and the shell, and put routes under the shell**

`projects/hightower-website/src/app/routing/content-resolvers.ts`:
```ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { take } from 'rxjs';
import { ContentRepository } from '../content/content-repository';
import { SiteConfig } from '../content/models';

export const siteResolver: ResolveFn<SiteConfig> = () => inject(ContentRepository).site().pipe(take(1));
```

`projects/hightower-website/src/app/layout/shell/shell.ts`:
```ts
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SiteConfig } from '../../content/models';
import { NAV_LINKS } from '../nav-links';
import { SiteFooter } from '../site-footer/site-footer';
import { SiteHeader } from '../site-header/site-header';

@Component({
  selector: 'hs-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, SiteHeader, SiteFooter],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  readonly site = input.required<SiteConfig>();
  protected readonly links = NAV_LINKS;
  private readonly drawer = viewChild.required(MatSidenav);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => void this.drawer().close());
  }

  /** Plain href="#main" would resolve against <base href="/"> and navigate home. */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
```

`projects/hightower-website/src/app/layout/shell/shell.html`:
```html
<a class="skip-link" href="#main" (click)="skipToMain($event)">Skip to content</a>
<mat-sidenav-container class="shell">
  <mat-sidenav #drawer mode="over" position="end" class="drawer">
    <nav class="drawer__nav" aria-label="Mobile">
      @for (link of links; track link.path) {
        <a [routerLink]="link.path" routerLinkActive="is-active" ariaCurrentWhenActive="page">{{ link.label }}</a>
      }
      <a class="hs-btn" routerLink="/contact">Start a project</a>
    </nav>
  </mat-sidenav>
  <mat-sidenav-content>
    <hs-site-header [companyName]="site().companyName" (menuOpen)="drawer.open()" />
    <main id="main" #main tabindex="-1"><router-outlet /></main>
    <hs-site-footer [site]="site()" />
  </mat-sidenav-content>
</mat-sidenav-container>
```

`projects/hightower-website/src/app/layout/shell/shell.scss`:
```scss
.shell { min-height: 100vh; background: var(--hs-night); }

main:focus { outline: none; }

.drawer { width: min(320px, 85vw); background: var(--hs-surface); border-left: 1px solid var(--hs-line); }

.drawer__nav { display: flex; flex-direction: column; gap: 4px; padding: 24px; }

.drawer__nav a:not(.hs-btn) {
  padding: 14px 8px;
  color: var(--hs-ivory);
  font-size: 18px;
  text-decoration: none;
  border-bottom: 1px solid var(--hs-line);

  &.is-active { color: var(--hs-gold); }
}

.drawer__nav .hs-btn { margin-top: 16px; }
```

Replace `projects/hightower-website/src/app/app.routes.ts` with:
```ts
import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
import { siteResolver } from './routing/content-resolvers';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    resolve: { site: siteResolver },
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
      },
    ],
  },
];
```

- [ ] **Step 6: Verify the build and suite**

Run: `npm run test:website`
Expected: PASS (19 specs).

Run: `npx ng build hightower-website`
Expected: success. `projects/hightower-website/dist/browser/index.html` contains `Skip to content` and `Proverbs 18:10`.

- [ ] **Step 7: Commit**

```bash
git add projects/hightower-website/src/app/layout projects/hightower-website/src/app/routing/content-resolvers.ts projects/hightower-website/src/app/app.routes.ts
git commit -m "feat(website): site shell with header, footer and mobile drawer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Shared presentational components

**Files:**
- Create (each as `.ts` + `.html` + `.scss` in its own folder under `projects/hightower-website/src/app/shared/`): `section-heading/section-heading`, `project-card/project-card`, `product-card/product-card`, `code-snippet/code-snippet`, `cta-band/cta-band`
- Create: `shared/html-content/html-content.ts`, `shared/html-content/html-content.scss` (inline template, no `.html`)
- Test: `projects/hightower-website/src/app/shared/shared-components.spec.ts`

**Interfaces:**
- Consumes: `Project`, `Product`, `STATUS_LABEL`, `PROJECT_KIND_LABEL`, `PRODUCT_KIND_LABEL`, `projectLink` (Task 3).
- Produces:
  - `SectionHeading` (`hs-section-heading`): `eyebrow = input.required<string>()`, `heading = input.required<string>()`, `level = input<1 | 2>(2)`.
  - `ProjectCard` (`hs-project-card`): `project = input.required<Project>()`.
  - `ProductCard` (`hs-product-card`): `product = input.required<Product>()`.
  - `HtmlContent` (`hs-html-content`): `html = input.required<string>()`.
  - `CodeSnippet` (`hs-code-snippet`): `code = input.required<string>()`, `language = input('bash')`.
  - `CtaBand` (`hs-cta-band`): `heading = input.required<string>()`.

- [ ] **Step 1: Write the failing spec**

`projects/hightower-website/src/app/shared/shared-components.spec.ts`:
```ts
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FIXTURE_PRODUCTS, FIXTURE_PROJECTS } from '../content/testing/content-fixtures';
import { CodeSnippet } from './code-snippet/code-snippet';
import { CtaBand } from './cta-band/cta-band';
import { HtmlContent } from './html-content/html-content';
import { ProductCard } from './product-card/product-card';
import { ProjectCard } from './project-card/project-card';
import { SectionHeading } from './section-heading/section-heading';

async function render<T>(component: Type<T>, inputs: Record<string, unknown>) {
  await TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(component);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('shared components', () => {
  it('SectionHeading renders an h2 by default and an h1 at level 1', async () => {
    const h2 = await render(SectionHeading, { eyebrow: 'What we do', heading: 'Services' });
    expect(h2.querySelector('h2')?.textContent).toBe('Services');
    expect(h2.textContent).toContain('What we do');
    TestBed.resetTestingModule();
    const h1 = await render(SectionHeading, { eyebrow: 'E', heading: 'Title', level: 1 });
    expect(h1.querySelector('h1')?.textContent).toBe('Title');
  });

  it('ProjectCard links a lab to its portfolio page with a LAB tag', async () => {
    const el = await render(ProjectCard, { project: FIXTURE_PROJECTS[0] });
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/portfolio/lab-one');
    expect(el.querySelector('.hs-tag')?.textContent?.trim()).toBe('Lab');
    expect(el.textContent).toContain('Inside the lab');
  });

  it('ProjectCard links a product-kind project to its product page', async () => {
    const el = await render(ProjectCard, { project: FIXTURE_PROJECTS[1] });
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/products/prod-one');
    expect(el.querySelector('.hs-tag')?.classList).toContain('hs-tag--product');
  });

  it('ProjectCard shows a placeholder when there is no image', async () => {
    const el = await render(ProjectCard, { project: FIXTURE_PROJECTS[2] });
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.hs-placeholder')).not.toBeNull();
  });

  it('ProductCard shows the install command only when set', async () => {
    const lib = await render(ProductCard, { product: FIXTURE_PRODUCTS[1] });
    expect(lib.querySelector('code')?.textContent).toBe('npm i lib-one');
    expect(lib.querySelector('a')?.getAttribute('href')).toBe('/products/lib-one');
    TestBed.resetTestingModule();
    const app = await render(ProductCard, { product: FIXTURE_PRODUCTS[0] });
    expect(app.querySelector('code')).toBeNull();
  });

  it('HtmlContent renders the generated HTML', async () => {
    const el = await render(HtmlContent, { html: '<h2>Hi</h2><p>There</p>' });
    expect(el.querySelector('.prose h2')?.textContent).toBe('Hi');
  });

  it('CodeSnippet shows the code and copies it', async () => {
    const write = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    const el = await render(CodeSnippet, { code: 'npm i x' });
    expect(el.querySelector('pre')?.textContent).toBe('npm i x');
    el.querySelector<HTMLButtonElement>('button')!.click();
    expect(write).toHaveBeenCalledWith('npm i x');
  });

  it('CtaBand links to contact', async () => {
    const el = await render(CtaBand, { heading: 'Build with us?' });
    expect(el.querySelector('h2')?.textContent).toBe('Build with us?');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/contact');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website -- --include="**/shared-components.spec.ts"`
Expected: FAIL with "Cannot find module './code-snippet/code-snippet'" and the matching errors for the other components.

- [ ] **Step 3: Implement SectionHeading**

`shared/section-heading/section-heading.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'hs-section-heading',
  templateUrl: './section-heading.html',
  styleUrl: './section-heading.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeading {
  readonly eyebrow = input.required<string>();
  readonly heading = input.required<string>();
  readonly level = input<1 | 2>(2);
}
```

`shared/section-heading/section-heading.html`:
```html
<p class="hs-eyebrow">{{ eyebrow() }}</p>
@if (level() === 1) {
  <h1 class="heading heading--page">{{ heading() }}</h1>
} @else {
  <h2 class="heading">{{ heading() }}</h2>
}
<div class="divider" aria-hidden="true">
  <span class="divider__rule"></span>
  <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" /></svg>
  <span class="divider__rule"></span>
</div>
```

`shared/section-heading/section-heading.scss`:
```scss
:host { display: flex; flex-direction: column; gap: 14px; margin-bottom: 40px; }
.heading { font-size: clamp(28px, 4vw, 38px); }
.heading--page { font-size: clamp(36px, 6vw, 56px); line-height: 1.08; }
.divider { display: flex; align-items: center; gap: 10px; width: 120px; }
.divider__rule { flex: 1; height: 1px; background: var(--hs-gold); opacity: 0.6; }
.divider svg { fill: var(--hs-gold); flex: none; }
```

- [ ] **Step 4: Implement ProjectCard**

`shared/project-card/project-card.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROJECT_KIND_LABEL, STATUS_LABEL, projectLink } from '../../content/labels';
import { Project, ProjectKind } from '../../content/models';

const CTA: Record<ProjectKind, string> = {
  lab: 'Inside the lab',
  product: 'View product',
  client: 'View project',
};

@Component({
  selector: 'hs-project-card',
  imports: [RouterLink],
  templateUrl: './project-card.html',
  styleUrl: './project-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCard {
  readonly project = input.required<Project>();
  protected readonly link = computed(() => projectLink(this.project()));
  protected readonly kindLabel = computed(() => PROJECT_KIND_LABEL[this.project().kind]);
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.project().status]);
  protected readonly cta = computed(() => CTA[this.project().kind]);
}
```

`shared/project-card/project-card.html`:
```html
<a class="card" [attr.data-kind]="project().kind" [routerLink]="link()">
  @if (project().images[0]; as image) {
    <img class="card__image" [src]="image.src" [alt]="image.alt" loading="lazy" width="1280" height="560">
  } @else {
    <div class="card__image hs-placeholder" aria-hidden="true">{{ project().name }}</div>
  }
  <div class="card__body">
    <div class="card__meta">
      <span class="hs-tag" [class]="'hs-tag--' + project().kind">{{ kindLabel() }}</span>
      <span class="hs-meta">{{ statusLabel() }}</span>
    </div>
    <h3 class="card__name">{{ project().name }}</h3>
    @if (project().kind === 'product') {
      <p class="hs-meta card__tagline">{{ project().tagline }}</p>
    }
    <p class="card__summary">{{ project().summary }}</p>
    <span class="hs-link-arrow card__cta">{{ cta() }} <span aria-hidden="true">→</span></span>
  </div>
</a>
```

`shared/project-card/project-card.scss`:
```scss
:host { display: block; height: 100%; }

.card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--hs-surface);
  border: 1px solid var(--hs-line);
  color: var(--hs-ivory);
  text-decoration: none;
  transition: border-color 150ms ease;

  &:hover { color: var(--hs-ivory); border-color: var(--hs-gold); }
  &[data-kind='product'] { background: #0D1430; border-color: #3B3470; }
  &[data-kind='product']:hover { border-color: var(--hs-violet); }
  &[data-kind='client']:hover { border-color: var(--hs-blue); }
}

.card__image { width: 100%; aspect-ratio: 16 / 7; object-fit: cover; object-position: center 30%; }

.card__body { display: flex; flex-direction: column; gap: 12px; padding: 28px 32px 32px; flex: 1; }

.card__meta { display: flex; justify-content: space-between; align-items: center; gap: 12px; }

.card__name { font-size: clamp(24px, 3vw, 30px); letter-spacing: 0.04em; }

.card__summary { color: var(--hs-muted); line-height: 1.6; }

.card__cta { margin-top: auto; color: var(--hs-gold); }
.card[data-kind='product'] .card__cta { color: var(--hs-violet-text); }
.card[data-kind='client'] .card__cta { color: var(--hs-blue-text); }
```

- [ ] **Step 5: Implement ProductCard**

`shared/product-card/product-card.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUCT_KIND_LABEL, STATUS_LABEL } from '../../content/labels';
import { Product } from '../../content/models';

@Component({
  selector: 'hs-product-card',
  imports: [RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  readonly product = input.required<Product>();
  protected readonly kindLabel = computed(() => PRODUCT_KIND_LABEL[this.product().kind]);
  protected readonly tagClass = computed(() => (this.product().kind === 'app' ? 'hs-tag--product' : 'hs-tag--library'));
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.product().status]);
}
```

`shared/product-card/product-card.html`:
```html
<a class="card" [routerLink]="['/products', product().slug]">
  <div class="card__meta">
    <span class="hs-tag" [class]="tagClass()">{{ kindLabel() }}</span>
    <span class="hs-meta">{{ statusLabel() }}</span>
  </div>
  <h3 class="card__name" [class.card__name--mono]="product().kind === 'library'">{{ product().name }}</h3>
  <p class="card__summary">{{ product().summary }}</p>
  @if (product().install; as install) {
    <code class="card__install">{{ install }}</code>
  }
  <span class="hs-link-arrow card__cta">Details <span aria-hidden="true">→</span></span>
</a>
```

`shared/product-card/product-card.scss`:
```scss
:host { display: block; height: 100%; }

.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 28px;
  background: var(--hs-surface);
  border: 1px solid var(--hs-line);
  color: var(--hs-ivory);
  text-decoration: none;
  transition: border-color 150ms ease;

  &:hover { color: var(--hs-ivory); border-color: var(--hs-gold); }
}

.card__meta { display: flex; justify-content: space-between; align-items: center; gap: 12px; }

.card__name { font-size: 22px; letter-spacing: 0.03em; overflow-wrap: anywhere; }
.card__name--mono { font-family: var(--hs-font-mono); font-weight: 400; font-size: 19px; letter-spacing: 0; }

.card__summary { color: var(--hs-muted); line-height: 1.6; }

.card__install {
  font-family: var(--hs-font-mono);
  font-size: 13px;
  padding: 10px 12px;
  background: var(--hs-deep);
  border: 1px solid var(--hs-line);
  color: var(--hs-gold-pale);
  overflow-wrap: anywhere;
}

.card__cta { margin-top: auto; color: var(--hs-gold); }
```

- [ ] **Step 6: Implement HtmlContent, CodeSnippet and CtaBand**

`shared/html-content/html-content.ts`:
```ts
import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/** Renders build-time-generated markdown HTML. Angular's default [innerHTML] sanitizer applies. */
@Component({
  selector: 'hs-html-content',
  template: '<div class="prose" [innerHTML]="html()"></div>',
  styleUrl: './html-content.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HtmlContent {
  readonly html = input.required<string>();
}
```

`shared/html-content/html-content.scss`:
```scss
hs-html-content { display: block; }

hs-html-content .prose {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 740px;
  font-size: 18px;
  line-height: 1.75;
  color: var(--hs-soft);

  h2 { font-size: clamp(24px, 3vw, 32px); color: var(--hs-ivory); margin-top: 8px; }
  h3 { font-size: 22px; color: var(--hs-ivory); margin-top: 8px; }
  ul, ol { margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; }
  code { font-family: var(--hs-font-mono); font-size: 0.88em; color: var(--hs-gold-pale); }
  pre { margin: 0; padding: 16px; background: var(--hs-deep); border: 1px solid var(--hs-line); overflow-x: auto; }
  blockquote { margin: 0; padding-left: 20px; border-left: 2px solid var(--hs-gold); }
}
```

`shared/code-snippet/code-snippet.ts` (adapted from `projects/ht-software/src/app/shared/code-snippet.component.ts`):
```ts
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'hs-code-snippet',
  templateUrl: './code-snippet.html',
  styleUrl: './code-snippet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeSnippet {
  readonly code = input.required<string>();
  readonly language = input('bash');
  protected readonly copied = signal(false);

  protected copy(): void {
    navigator.clipboard?.writeText(this.code()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
```

`shared/code-snippet/code-snippet.html`:
```html
<div class="snippet">
  <div class="snippet__header">
    <span class="snippet__lang">{{ language() }}</span>
    <button type="button" class="snippet__copy" (click)="copy()">{{ copied() ? 'Copied' : 'Copy' }}</button>
  </div>
  <pre><code>{{ code() }}</code></pre>
</div>
```

`shared/code-snippet/code-snippet.scss`:
```scss
.snippet { border: 1px solid var(--hs-line); background: var(--hs-deep); }
.snippet__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 6px 6px 14px;
  border-bottom: 1px solid var(--hs-line);
}
.snippet__lang { font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--hs-muted); }
.snippet__copy {
  min-height: 36px;
  padding: 6px 14px;
  border: 1px solid var(--hs-line-strong);
  background: transparent;
  color: var(--hs-ivory);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  &:hover { border-color: var(--hs-gold); }
}
pre { margin: 0; padding: 16px; overflow-x: auto; }
code { font-family: var(--hs-font-mono); font-size: 14px; color: var(--hs-gold-pale); white-space: pre; }
```

`shared/cta-band/cta-band.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'hs-cta-band',
  imports: [RouterLink],
  templateUrl: './cta-band.html',
  styleUrl: './cta-band.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtaBand {
  readonly heading = input.required<string>();
}
```

`shared/cta-band/cta-band.html`:
```html
<section class="band">
  <div class="hs-container band__inner">
    <h2 class="band__heading">{{ heading() }}</h2>
    <a class="hs-btn" routerLink="/contact">Start a project</a>
  </div>
</section>
```

`shared/cta-band/cta-band.scss`:
```scss
.band { background: var(--hs-surface); border-top: 1px solid var(--hs-line); }
.band__inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  padding-block: clamp(56px, 7vw, 80px);
}
.band__heading { font-size: clamp(26px, 3.6vw, 36px); max-width: 680px; }
```

- [ ] **Step 7: Run the spec to verify it passes**

Run: `npm run test:website -- --include="**/shared-components.spec.ts"`
Expected: PASS (8 specs).

- [ ] **Step 8: Commit**

```bash
git add projects/hightower-website/src/app/shared
git commit -m "feat(website): shared cards, headings, HTML content and CTA band

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: SeoService

**Files:**
- Create: `projects/hightower-website/src/app/seo/seo.service.ts`
- Test: `projects/hightower-website/src/app/seo/seo.service.spec.ts`

**Interfaces:**
- Consumes: `SiteConfig`, `FIXTURE_SITE`.
- Produces:
  - `interface PageSeo { title: string; description: string; path: string; image?: string; noindex?: boolean }`
  - `SeoService.apply(page: PageSeo, site: SiteConfig): void`
  - `absoluteUrl(siteUrl: string, path: string): string`

- [ ] **Step 1: Write the failing spec**

`projects/hightower-website/src/app/seo/seo.service.spec.ts`:
```ts
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { FIXTURE_SITE } from '../content/testing/content-fixtures';
import { SeoService, absoluteUrl } from './seo.service';

describe('absoluteUrl', () => {
  it('joins the site origin and path with no trailing slash', () => {
    expect(absoluteUrl('https://a.dev', '/about')).toBe('https://a.dev/about');
    expect(absoluteUrl('https://a.dev/', '/about/')).toBe('https://a.dev/about');
    expect(absoluteUrl('https://a.dev', '/')).toBe('https://a.dev/');
  });

  it('leaves absolute URLs alone', () => {
    expect(absoluteUrl('https://a.dev', 'https://cdn.dev/x.png')).toBe('https://cdn.dev/x.png');
  });
});

describe('SeoService', () => {
  let seo: SeoService;
  let meta: Meta;
  let doc: Document;

  beforeEach(() => {
    seo = TestBed.inject(SeoService);
    meta = TestBed.inject(Meta);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => doc.head.querySelector('link[rel="canonical"]')?.remove());

  it('sets title, description, OpenGraph and canonical for an inner page', () => {
    seo.apply({ title: 'About', description: 'Who we are.', path: '/about' }, FIXTURE_SITE);

    expect(TestBed.inject(Title).getTitle()).toBe('About | Test Co');
    expect(meta.getTag('name="description"')?.content).toBe('Who we are.');
    expect(meta.getTag('property="og:title"')?.content).toBe('About | Test Co');
    expect(meta.getTag('property="og:url"')?.content).toBe('https://test.example/about');
    expect(meta.getTag('property="og:image"')?.content).toBe('https://test.example/images/og-default.png');
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://test.example/about');
  });

  it('puts the company name first on the home page and uses a page image when given', () => {
    seo.apply({ title: 'Testing things', description: 'D', path: '/', image: '/images/x.webp' }, FIXTURE_SITE);
    expect(TestBed.inject(Title).getTitle()).toBe('Test Co | Testing things');
    expect(meta.getTag('property="og:image"')?.content).toBe('https://test.example/images/x.webp');
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://test.example/');
  });

  it('adds noindex only when asked and removes it afterwards', () => {
    seo.apply({ title: 'Not found', description: 'D', path: '/not-found', noindex: true }, FIXTURE_SITE);
    expect(meta.getTag('name="robots"')?.content).toBe('noindex');
    seo.apply({ title: 'About', description: 'D', path: '/about' }, FIXTURE_SITE);
    expect(meta.getTag('name="robots"')).toBeNull();
  });

  it('reuses a single canonical link element', () => {
    seo.apply({ title: 'A', description: 'D', path: '/a' }, FIXTURE_SITE);
    seo.apply({ title: 'B', description: 'D', path: '/b' }, FIXTURE_SITE);
    expect(doc.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website -- --include="**/seo.service.spec.ts"`
Expected: FAIL with "Cannot find module './seo.service'".

- [ ] **Step 3: Implement**

`projects/hightower-website/src/app/seo/seo.service.ts`:
```ts
import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SiteConfig } from '../content/models';

export interface PageSeo {
  title: string;
  description: string;
  path: string; // site-relative, e.g. '/about'
  image?: string; // site-relative or absolute
  noindex?: boolean;
}

export function absoluteUrl(siteUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const origin = siteUrl.replace(/\/+$/, '');
  const trimmed = path.replace(/\/+$/, '');
  if (trimmed === '') return `${origin}/`;
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  apply(page: PageSeo, site: SiteConfig): void {
    const fullTitle =
      page.path === '/' ? `${site.companyName} | ${page.title}` : `${page.title} | ${site.companyName}`;
    const url = absoluteUrl(site.siteUrl, page.path);
    const image = absoluteUrl(site.siteUrl, page.image ?? site.defaultOgImage);

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.setProperty('og:type', 'website');
    this.setProperty('og:site_name', site.companyName);
    this.setProperty('og:title', fullTitle);
    this.setProperty('og:description', page.description);
    this.setProperty('og:url', url);
    this.setProperty('og:image', image);
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    if (page.noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
    } else {
      this.meta.removeTag('name="robots"');
    }
    this.setCanonical(url);
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property="${property}"`);
  }

  private setCanonical(href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:website -- --include="**/seo.service.spec.ts"`
Expected: PASS (6 specs).

- [ ] **Step 5: Commit**

```bash
git add projects/hightower-website/src/app/seo
git commit -m "feat(website): SeoService for titles, OpenGraph and canonical URLs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Hero video component

**Files:**
- Create: `projects/hightower-website/src/app/shared/hero-video/hero-video.ts`, `.../hero-video/hero-video.html`, `.../hero-video/hero-video.scss`
- Test: `projects/hightower-website/src/app/shared/hero-video/hero-video.spec.ts`

**Interfaces:**
- Consumes: `Image`, `VideoSource` (Task 2).
- Produces:
  - `HeroVideo` (`hs-hero-video`): `poster = input.required<Image>()`, `sources = input<VideoSource[]>([])`. It projects hero copy through `<ng-content />`.
  - `shouldAutoplay(win: Window): boolean`.
  - `AUTOPLAY_ALLOWED: InjectionToken<() => boolean>`.

- [ ] **Step 1: Write the failing spec**

`projects/hightower-website/src/app/shared/hero-video/hero-video.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { AUTOPLAY_ALLOWED, HeroVideo, shouldAutoplay } from './hero-video';

const POSTER = { src: '/images/poster.webp', alt: 'Tower' };
const SOURCES = [
  { src: '/media/hero.webm', type: 'video/webm' },
  { src: '/media/hero.mp4', type: 'video/mp4' },
];

function fakeWindow(reducedMotion: boolean, saveData?: boolean): Window {
  return {
    matchMedia: () => ({ matches: reducedMotion }),
    navigator: { connection: saveData === undefined ? undefined : { saveData } },
  } as unknown as Window;
}

describe('shouldAutoplay', () => {
  it('allows autoplay by default', () => expect(shouldAutoplay(fakeWindow(false))).toBeTrue());
  it('blocks autoplay for reduced motion', () => expect(shouldAutoplay(fakeWindow(true))).toBeFalse());
  it('blocks autoplay with Save-Data on', () => expect(shouldAutoplay(fakeWindow(false, true))).toBeFalse());
});

describe('HeroVideo', () => {
  async function setup(sources: typeof SOURCES | [], autoplay: boolean) {
    await TestBed.configureTestingModule({
      imports: [HeroVideo],
      providers: [{ provide: AUTOPLAY_ALLOWED, useValue: () => autoplay }],
    }).compileComponents();
    const fixture = TestBed.createComponent(HeroVideo);
    fixture.componentRef.setInput('poster', POSTER);
    fixture.componentRef.setInput('sources', sources);
    await fixture.whenStable();
    return fixture;
  }

  function stubMedia(playResult: () => Promise<void> = () => Promise.resolve()) {
    const play = spyOn(HTMLMediaElement.prototype, 'play').and.callFake(function (this: HTMLMediaElement) {
      return playResult().then(() => {
        this.dispatchEvent(new Event('play'));
      });
    });
    const pause = spyOn(HTMLMediaElement.prototype, 'pause').and.callFake(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event('pause'));
    });
    return { play, pause };
  }

  const toggleLabel = (el: HTMLElement) => el.querySelector('button')?.getAttribute('aria-label');

  it('renders only the poster image when there are no sources', async () => {
    const el: HTMLElement = (await setup([], true)).nativeElement;
    expect(el.querySelector('video')).toBeNull();
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('Tower');
    expect(el.querySelector('button')).toBeNull();
  });

  it('renders a muted, looping, inline video without the autoplay attribute', async () => {
    stubMedia();
    const el: HTMLElement = (await setup(SOURCES, false)).nativeElement;
    const video = el.querySelector('video')!;
    expect(video.hasAttribute('muted')).toBeTrue();
    expect(video.muted).toBeTrue();
    expect(video.hasAttribute('loop')).toBeTrue();
    expect(video.hasAttribute('playsinline')).toBeTrue();
    expect(video.hasAttribute('autoplay')).toBeFalse();
    expect(video.getAttribute('poster')).toBe('/images/poster.webp');
    expect(Array.from(video.querySelectorAll('source')).map((s) => s.getAttribute('type'))).toEqual(['video/webm', 'video/mp4']);
  });

  it('autoplays after render when allowed', async () => {
    const { play } = stubMedia();
    const fixture = await setup(SOURCES, true);
    await fixture.whenStable();
    expect(play).toHaveBeenCalled();
    expect(toggleLabel(fixture.nativeElement)).toBe('Pause background video');
  });

  it('does not autoplay when not allowed and offers a play button', async () => {
    const { play } = stubMedia();
    const fixture = await setup(SOURCES, false);
    expect(play).not.toHaveBeenCalled();
    expect(toggleLabel(fixture.nativeElement)).toBe('Play background video');
  });

  it('toggles between play and pause', async () => {
    stubMedia();
    const fixture = await setup(SOURCES, false);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    button.click();
    await fixture.whenStable();
    expect(toggleLabel(fixture.nativeElement)).toBe('Pause background video');

    button.click();
    await fixture.whenStable();
    expect(toggleLabel(fixture.nativeElement)).toBe('Play background video');
  });

  it('keeps the play button when the browser rejects play()', async () => {
    stubMedia(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));
    const fixture = await setup(SOURCES, true);
    await fixture.whenStable();
    expect(toggleLabel(fixture.nativeElement)).toBe('Play background video');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website -- --include="**/hero-video.spec.ts"`
Expected: FAIL with "Cannot find module './hero-video'".

- [ ] **Step 3: Implement**

`shared/hero-video/hero-video.ts`:
```ts
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  InjectionToken,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Image, VideoSource } from '../../content/models';

export function shouldAutoplay(win: Window): boolean {
  const reducedMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const nav = win.navigator as Navigator & { connection?: { saveData?: boolean } };
  const saveData = nav.connection?.saveData ?? false;
  return !reducedMotion && !saveData;
}

/** Overridable in tests; only ever called in the browser (inside afterNextRender). */
export const AUTOPLAY_ALLOWED = new InjectionToken<() => boolean>('AUTOPLAY_ALLOWED', {
  providedIn: 'root',
  factory: () => () => typeof window !== 'undefined' && shouldAutoplay(window),
});

@Component({
  selector: 'hs-hero-video',
  templateUrl: './hero-video.html',
  styleUrl: './hero-video.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroVideo {
  readonly poster = input.required<Image>();
  readonly sources = input<VideoSource[]>([]);

  protected readonly playing = signal(false);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly autoplayAllowed = inject(AUTOPLAY_ALLOWED);

  constructor() {
    afterNextRender(() => {
      const video = this.video()?.nativeElement;
      if (!video) return;
      // The muted attribute alone doesn't set the muted property on script-created elements.
      video.muted = true;
      if (this.autoplayAllowed()) void this.play();
    });
  }

  protected toggle(): void {
    if (this.playing()) {
      this.video()?.nativeElement.pause();
    } else {
      void this.play();
    }
  }

  private async play(): Promise<void> {
    const video = this.video()?.nativeElement;
    if (!video) return;
    video.muted = true;
    try {
      await video.play();
    } catch {
      this.playing.set(false); // blocked or failed: poster stays, play button offered
    }
  }
}
```

`shared/hero-video/hero-video.html`:
```html
@if (sources().length > 0) {
  <video
    #video
    class="hero__media"
    muted
    loop
    playsinline
    preload="metadata"
    aria-hidden="true"
    [attr.poster]="poster().src"
    (play)="playing.set(true)"
    (pause)="playing.set(false)">
    @for (source of sources(); track source.src) {
      <source [src]="source.src" [type]="source.type">
    }
  </video>
} @else {
  <img class="hero__media" [src]="poster().src" [alt]="poster().alt" fetchpriority="high">
}
<div class="hero__scrim" aria-hidden="true"></div>
<div class="hero__content"><ng-content /></div>
@if (sources().length > 0) {
  <button
    type="button"
    class="hero__toggle"
    [attr.aria-label]="playing() ? 'Pause background video' : 'Play background video'"
    (click)="toggle()">
    @if (playing()) {
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
    } @else {
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
    }
  </button>
}
```

`shared/hero-video/hero-video.scss`:
```scss
:host {
  position: relative;
  display: block;
  min-height: min(88vh, 860px);
  overflow: hidden;
  background: radial-gradient(ellipse at 70% 20%, #1C2A55 0%, var(--hs-night) 70%);
}

.hero__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 22%;
}

.hero__scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(7, 13, 28, 0.2) 0%, rgba(7, 13, 28, 0.55) 45%, rgba(7, 13, 28, 0.85) 100%),
    linear-gradient(0deg, rgba(10, 18, 38, 0.95) 0%, rgba(10, 18, 38, 0) 45%);
}

.hero__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  min-height: inherit;
}

.hero__toggle {
  position: absolute;
  z-index: 2;
  right: var(--hs-gutter);
  bottom: 24px;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid rgba(239, 235, 225, 0.6);
  border-radius: 50%;
  background: rgba(7, 13, 28, 0.6);
  color: var(--hs-ivory);
  cursor: pointer;

  svg { fill: currentColor; }
  &:hover { border-color: var(--hs-gold); color: var(--hs-gold); }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:website -- --include="**/hero-video.spec.ts"`
Expected: PASS (9 specs).

- [ ] **Step 5: Commit**

```bash
git add projects/hightower-website/src/app/shared/hero-video
git commit -m "feat(website): accessible hero video with poster fallback and pause control

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Page resolvers

**Files:**
- Modify: `projects/hightower-website/src/app/routing/content-resolvers.ts`
- Test: `projects/hightower-website/src/app/routing/content-resolvers.spec.ts`

**Interfaces:**
- Consumes: `ContentRepository`, the fixtures and `siteResolver` (Task 5).
- Produces:
  - `HomeData { services: Service[]; featured: Project[]; libraries: Product[] }`
  - `ProjectDetail { project: Project; produced: Product[] }`
  - `ProductDetail { product: Product; lab: Project | undefined }`
  - `homeResolver: ResolveFn<HomeData>`
  - `servicesResolver: ResolveFn<Service[]>`
  - `projectsResolver: ResolveFn<Project[]>`
  - `productsResolver: ResolveFn<Product[]>`
  - `projectDetailResolver: ResolveFn<ProjectDetail>`. It redirects unknown slugs to `/not-found` with `skipLocationChange: true`, and product-kind slugs to `/products/<productSlug>`.
  - `productDetailResolver: ResolveFn<ProductDetail>`. It redirects unknown slugs to `/not-found` with `skipLocationChange: true`.

- [ ] **Step 1: Write the failing spec**

`projects/hightower-website/src/app/routing/content-resolvers.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom, isObservable, of } from 'rxjs';
import { provideFixtureContent } from '../content/testing/content-fixtures';
import {
  ProductDetail,
  ProjectDetail,
  homeResolver,
  productDetailResolver,
  projectDetailResolver,
} from './content-resolvers';

function route(slug?: string): ActivatedRouteSnapshot {
  return { paramMap: convertToParamMap(slug ? { slug } : {}) } as ActivatedRouteSnapshot;
}

async function run<T>(fn: () => unknown): Promise<T | RedirectCommand> {
  const result = TestBed.runInInjectionContext(fn);
  return firstValueFrom(isObservable(result) ? (result as Observable<T>) : of(result as T));
}

describe('content resolvers', () => {
  const state = {} as RouterStateSnapshot;

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideFixtureContent()] }));

  it('homeResolver gathers services, featured projects and libraries', async () => {
    const home = (await run(() => homeResolver(route(), state))) as { services: { slug: string }[]; featured: { slug: string }[]; libraries: { slug: string }[] };
    expect(home.services.map((s) => s.slug)).toEqual(['custom-development', 'consulting']);
    expect(home.featured.map((p) => p.slug)).toEqual(['lab-one', 'prod-one', 'client-one']);
    expect(home.libraries.map((p) => p.slug)).toEqual(['lib-one']);
  });

  it('projectDetailResolver returns a lab with what it produced', async () => {
    const detail = (await run<ProjectDetail>(() => projectDetailResolver(route('lab-one'), state))) as ProjectDetail;
    expect(detail.project.slug).toBe('lab-one');
    expect(detail.produced.map((p) => p.slug)).toEqual(['prod-one']);
  });

  it('projectDetailResolver returns a client project with nothing produced', async () => {
    const detail = (await run<ProjectDetail>(() => projectDetailResolver(route('client-one'), state))) as ProjectDetail;
    expect(detail.project.slug).toBe('client-one');
    expect(detail.produced).toEqual([]);
  });

  it('projectDetailResolver redirects unknown slugs to /not-found without changing the URL', async () => {
    const result = await run(() => projectDetailResolver(route('nope'), state));
    expect(result).toBeInstanceOf(RedirectCommand);
    const command = result as RedirectCommand;
    expect(TestBed.inject(Router).serializeUrl(command.redirectTo)).toBe('/not-found');
    expect(command.navigationBehaviorOptions?.skipLocationChange).toBeTrue();
  });

  it('projectDetailResolver redirects product-kind projects to their product page', async () => {
    const result = await run(() => projectDetailResolver(route('prod-one'), state));
    expect(result).toBeInstanceOf(RedirectCommand);
    expect(TestBed.inject(Router).serializeUrl((result as RedirectCommand).redirectTo)).toBe('/products/prod-one');
  });

  it('productDetailResolver returns the product and the lab that produced it', async () => {
    const detail = (await run<ProductDetail>(() => productDetailResolver(route('prod-one'), state))) as ProductDetail;
    expect(detail.product.slug).toBe('prod-one');
    expect(detail.lab?.slug).toBe('lab-one');
  });

  it('productDetailResolver returns no lab for a library', async () => {
    const detail = (await run<ProductDetail>(() => productDetailResolver(route('lib-one'), state))) as ProductDetail;
    expect(detail.lab).toBeUndefined();
  });

  it('productDetailResolver redirects unknown slugs to /not-found without changing the URL', async () => {
    const result = (await run(() => productDetailResolver(route('nope'), state))) as RedirectCommand;
    expect(TestBed.inject(Router).serializeUrl(result.redirectTo)).toBe('/not-found');
    expect(result.navigationBehaviorOptions?.skipLocationChange).toBeTrue();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website -- --include="**/content-resolvers.spec.ts"`
Expected: FAIL with "Module has no exported member 'homeResolver'" and the matching errors for the other new exports.

- [ ] **Step 3: Implement**

Replace `projects/hightower-website/src/app/routing/content-resolvers.ts` with:
```ts
import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { Observable, forkJoin, map, of, switchMap, take } from 'rxjs';
import { ContentRepository } from '../content/content-repository';
import { Product, Project, Service, SiteConfig } from '../content/models';

export interface HomeData {
  services: Service[];
  featured: Project[];
  libraries: Product[];
}

export interface ProjectDetail {
  project: Project;
  produced: Product[];
}

export interface ProductDetail {
  product: Product;
  lab: Project | undefined;
}

function notFound(router: Router): RedirectCommand {
  return new RedirectCommand(router.parseUrl('/not-found'), { skipLocationChange: true });
}

export const siteResolver: ResolveFn<SiteConfig> = () => inject(ContentRepository).site().pipe(take(1));

export const homeResolver: ResolveFn<HomeData> = () => {
  const repo = inject(ContentRepository);
  return forkJoin({
    services: repo.services().pipe(take(1)),
    featured: repo.projects({ featured: true }).pipe(take(1)),
    libraries: repo.products({ kind: 'library' }).pipe(take(1)),
  });
};

export const servicesResolver: ResolveFn<Service[]> = () => inject(ContentRepository).services().pipe(take(1));

export const projectsResolver: ResolveFn<Project[]> = () => inject(ContentRepository).projects().pipe(take(1));

export const productsResolver: ResolveFn<Product[]> = () => inject(ContentRepository).products().pipe(take(1));

export const projectDetailResolver: ResolveFn<ProjectDetail> = (route) => {
  const repo = inject(ContentRepository);
  const router = inject(Router);
  return repo.projectBySlug(route.paramMap.get('slug') ?? '').pipe(
    take(1),
    switchMap((project): Observable<ProjectDetail | RedirectCommand> => {
      if (!project) return of(notFound(router));
      if (project.kind === 'product') {
        return of(
          project.productSlug
            ? new RedirectCommand(router.parseUrl(`/products/${project.productSlug}`))
            : notFound(router),
        );
      }
      if (project.kind !== 'lab') return of({ project, produced: [] });
      return repo.producedBy(project.slug).pipe(take(1), map((produced) => ({ project, produced })));
    }),
  );
};

export const productDetailResolver: ResolveFn<ProductDetail> = (route) => {
  const repo = inject(ContentRepository);
  const router = inject(Router);
  return repo.productBySlug(route.paramMap.get('slug') ?? '').pipe(
    take(1),
    switchMap((product): Observable<ProductDetail | RedirectCommand> => {
      if (!product) return of(notFound(router));
      if (!product.producedBy) return of({ product, lab: undefined });
      return repo.projectBySlug(product.producedBy).pipe(take(1), map((lab) => ({ product, lab })));
    }),
  );
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:website -- --include="**/content-resolvers.spec.ts"`
Expected: PASS (8 specs).

- [ ] **Step 5: Commit**

```bash
git add projects/hightower-website/src/app/routing
git commit -m "feat(website): page resolvers with not-found and product redirects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Home page

**Files:**
- Modify (replace): `projects/hightower-website/src/app/pages/home/home-page.ts`
- Create: `projects/hightower-website/src/app/pages/home/home-page.html`, `projects/hightower-website/src/app/pages/home/home-page.scss`
- Modify: `projects/hightower-website/src/app/app.routes.ts`
- Test: `projects/hightower-website/src/app/pages/home/home-page.spec.ts`

**Interfaces:**
- Consumes: `HeroVideo`, `SectionHeading`, `ProjectCard`, `ProductCard`, `CtaBand`, `SeoService`, `HomeData`, `homeResolver`, `SiteConfig`.
- Produces: `HomePage`, with inputs `site = input.required<SiteConfig>()` and `home = input.required<HomeData>()`.

- [ ] **Step 1: Write the failing spec**

`projects/hightower-website/src/app/pages/home/home-page.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  FIXTURE_PRODUCTS,
  FIXTURE_PROJECTS,
  FIXTURE_SERVICES,
  FIXTURE_SITE,
} from '../../content/testing/content-fixtures';
import { AUTOPLAY_ALLOWED } from '../../shared/hero-video/hero-video';
import { HomePage } from './home-page';

describe('HomePage', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), { provide: AUTOPLAY_ALLOWED, useValue: () => false }],
    }).compileComponents();
    const fixture = TestBed.createComponent(HomePage);
    fixture.componentRef.setInput('site', FIXTURE_SITE);
    fixture.componentRef.setInput('home', {
      services: [FIXTURE_SERVICES[1], FIXTURE_SERVICES[0]],
      featured: FIXTURE_PROJECTS.filter((p) => p.featured),
      libraries: FIXTURE_PRODUCTS.filter((p) => p.kind === 'library'),
    });
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the hero headline as the page h1 with CTAs', async () => {
    const el = await setup();
    expect(el.querySelector('h1')?.textContent).toBe('Hero headline');
    expect(el.querySelector('hs-hero-video a[href="/contact"]')).not.toBeNull();
    expect(el.querySelector('hs-hero-video a[href="/portfolio"]')).not.toBeNull();
  });

  it('lists services with contact links preselecting the topic', async () => {
    const el = await setup();
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.services a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/contact?topic=custom-development', '/contact?topic=consulting']);
  });

  it('shows the lab, its products, client work and libraries', async () => {
    const el = await setup();
    expect(el.querySelector('.lab a[href="/portfolio/lab-one"]')).not.toBeNull();
    expect(el.querySelector('.lab a[href="/products/prod-one"]')).not.toBeNull();
    expect(el.querySelector('.clients a[href="/portfolio/client-one"]')).not.toBeNull();
    expect(el.querySelector('.libraries a[href="/products/lib-one"]')).not.toBeNull();
  });

  it('sets the home page title', async () => {
    await setup();
    expect(TestBed.inject(Title).getTitle()).toBe('Test Co | Testing things');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website -- --include="**/home-page.spec.ts"`
Expected: FAIL. `NG0303: Can't set value of the 'site' input on 'HomePage'` (or the TS error "Property 'site' does not exist").

- [ ] **Step 3: Implement**

`projects/hightower-website/src/app/pages/home/home-page.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfig } from '../../content/models';
import { HomeData } from '../../routing/content-resolvers';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { HeroVideo } from '../../shared/hero-video/hero-video';
import { ProductCard } from '../../shared/product-card/product-card';
import { ProjectCard } from '../../shared/project-card/project-card';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'hs-home-page',
  imports: [RouterLink, HeroVideo, SectionHeading, ProjectCard, ProductCard, CtaBand],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly site = input.required<SiteConfig>();
  readonly home = input.required<HomeData>();

  protected readonly lab = computed(() => this.home().featured.find((p) => p.kind === 'lab'));
  protected readonly labProducts = computed(() => this.home().featured.filter((p) => p.kind === 'product'));
  protected readonly clients = computed(() => this.home().featured.filter((p) => p.kind === 'client'));
  protected readonly labHeading = computed(() => {
    const lab = this.lab();
    const product = this.labProducts()[0];
    if (!lab) return 'From the lab';
    return product
      ? `${lab.name} is where we experiment. ${product.name} is what it produced.`
      : `${lab.name} is where we experiment.`;
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const site = this.site();
      seo.apply({ title: site.tagline, description: site.hero.lead, path: '/' }, site);
    });
  }
}
```

`projects/hightower-website/src/app/pages/home/home-page.html`:
```html
<hs-hero-video [poster]="site().hero.poster" [sources]="site().hero.videoSources">
  <div class="hs-container hero">
    <div class="hero__copy">
      <p class="hs-eyebrow">{{ site().tagline }}</p>
      <h1 class="hero__title">{{ site().hero.headline }}</h1>
      <p class="hs-lead">{{ site().hero.lead }}</p>
      <div class="hero__actions">
        <a class="hs-btn" routerLink="/contact">Start a project</a>
        <a class="hs-btn hs-btn--ghost" routerLink="/portfolio">See the work</a>
      </div>
    </div>
  </div>
</hs-hero-video>

<section class="hs-band">
  <div class="hs-container">
    <hs-section-heading eyebrow="What we do" heading="Services" />
    <div class="hs-grid services">
      @for (service of home().services; track service.slug) {
        <article class="service">
          <h3 class="service__name">{{ service.name }}</h3>
          <p class="service__summary">{{ service.summary }}</p>
          <a class="hs-link-arrow" routerLink="/contact" [queryParams]="{ topic: service.slug }">
            Talk to us about this <span aria-hidden="true">→</span>
          </a>
        </article>
      }
    </div>
  </div>
</section>

@if (lab(); as lab) {
  <section class="hs-band hs-band--deep">
    <div class="hs-container">
      <hs-section-heading eyebrow="From the lab" [heading]="labHeading()" />
      <div class="lab">
        <hs-project-card class="lab__lab" [project]="lab" />
        @for (product of labProducts(); track product.slug) {
          <hs-project-card class="lab__product" [project]="product" />
        }
      </div>
    </div>
  </section>
}

@if (clients().length > 0) {
  <section class="hs-band">
    <div class="hs-container">
      <hs-section-heading eyebrow="Client work" heading="Apps built for the people who run them." />
      <div class="hs-grid clients">
        @for (project of clients(); track project.slug) {
          <hs-project-card [project]="project" />
        }
      </div>
      <a class="hs-link-arrow more" routerLink="/portfolio">Full portfolio <span aria-hidden="true">→</span></a>
    </div>
  </section>
}

@if (home().libraries.length > 0) {
  <section class="hs-band hs-band--deep">
    <div class="hs-container">
      <hs-section-heading eyebrow="Open libraries" heading="Tools we use, shared" />
      <div class="hs-grid libraries">
        @for (product of home().libraries; track product.slug) {
          <hs-product-card [product]="product" />
        }
      </div>
      <a class="hs-link-arrow more" routerLink="/products">All products <span aria-hidden="true">→</span></a>
    </div>
  </section>
}

<hs-cta-band heading="Have something that needs building?" />
```

`projects/hightower-website/src/app/pages/home/home-page.scss`:
```scss
.hero { width: 100%; padding-block: 96px; display: flex; }

.hero__copy {
  margin-left: auto;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.hero__title { font-size: clamp(40px, 7vw, 76px); font-weight: 700; line-height: 1.04; }

.hero__actions { display: flex; flex-wrap: wrap; gap: 14px; padding-top: 8px; }

.service {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 32px;
  background: var(--hs-surface);
  border: 1px solid var(--hs-line);
  border-top: 1px solid var(--hs-gold);
}

.service__name { font-size: 24px; }
.service__summary { color: var(--hs-muted); flex: 1; }

.lab {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr));
  align-items: stretch;
}

.more { display: inline-block; margin-top: 32px; }
```

In `projects/hightower-website/src/app/app.routes.ts`, change the home child route to add its resolver. Add `homeResolver` to the `./routing/content-resolvers` import:
```ts
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
        resolve: { home: homeResolver },
      },
```

- [ ] **Step 4: Run to verify it passes, then build**

Run: `npm run test:website -- --include="**/home-page.spec.ts"`
Expected: PASS (4 specs).

Run: `npx ng build hightower-website`
Expected: success. `dist/browser/index.html` contains `Software built on solid ground.` and `Kree House of Beauty`.

- [ ] **Step 5: Commit**

```bash
git add projects/hightower-website/src/app/pages/home projects/hightower-website/src/app/app.routes.ts
git commit -m "feat(website): home page with hero video, lab, client work and libraries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Services, Portfolio, Products and About pages

**Files:**
- Create (each as `.ts` + `.html` + `.scss`): `projects/hightower-website/src/app/pages/services/services-page`, `.../pages/portfolio/portfolio-page`, `.../pages/products/products-page`, `.../pages/about/about-page`
- Modify: `projects/hightower-website/src/app/app.routes.ts`
- Test: `projects/hightower-website/src/app/pages/list-pages.spec.ts`

**Interfaces:**
- Consumes: `SectionHeading`, `ProjectCard`, `ProductCard`, `HtmlContent`, `CtaBand`, `SeoService`, `servicesResolver`, `projectsResolver`, `productsResolver`.
- Produces:
  - `ServicesPage` (`site`, `services: Service[]`)
  - `PortfolioPage` (`site`, `projects: Project[]`)
  - `ProductsPage` (`site`, `products: Product[]`)
  - `AboutPage` (`site`)

- [ ] **Step 1: Write the failing spec**

`projects/hightower-website/src/app/pages/list-pages.spec.ts`:
```ts
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  FIXTURE_PRODUCTS,
  FIXTURE_PROJECTS,
  FIXTURE_SERVICES,
  FIXTURE_SITE,
} from '../content/testing/content-fixtures';
import { AboutPage } from './about/about-page';
import { PortfolioPage } from './portfolio/portfolio-page';
import { ProductsPage } from './products/products-page';
import { ServicesPage } from './services/services-page';

async function render<T>(component: Type<T>, inputs: Record<string, unknown>) {
  await TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(component);
  fixture.componentRef.setInput('site', FIXTURE_SITE);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('list pages', () => {
  it('ServicesPage renders each service with its description and a topic link', async () => {
    const el = await render(ServicesPage, { services: [FIXTURE_SERVICES[1], FIXTURE_SERVICES[0]] });
    expect(el.querySelector('h1')?.textContent).toBe('Services');
    expect(Array.from(el.querySelectorAll('article h2')).map((h) => h.textContent)).toEqual(['Custom Development', 'Consulting']);
    expect(el.querySelector('article .prose')?.innerHTML).toContain('<p>D</p>');
    expect(el.querySelector('a[href="/contact?topic=consulting"]')).not.toBeNull();
    expect(TestBed.inject(Title).getTitle()).toBe('Services | Test Co');
  });

  it('PortfolioPage groups projects by kind in lab, product, client order', async () => {
    const el = await render(PortfolioPage, { projects: FIXTURE_PROJECTS });
    expect(Array.from(el.querySelectorAll('.group__heading')).map((h) => h.textContent)).toEqual(['The lab', 'Products', 'Client work']);
    expect(el.querySelectorAll('hs-project-card').length).toBe(4);
  });

  it('ProductsPage groups apps and libraries', async () => {
    const el = await render(ProductsPage, { products: FIXTURE_PRODUCTS });
    expect(Array.from(el.querySelectorAll('.group__heading')).map((h) => h.textContent)).toEqual(['Apps', 'Libraries']);
    expect(el.querySelectorAll('hs-product-card').length).toBe(2);
  });

  it('AboutPage renders an h1 and sets the title', async () => {
    const el = await render(AboutPage, {});
    expect(el.querySelector('h1')?.textContent).toBe('About Test Co');
    expect(TestBed.inject(Title).getTitle()).toBe('About | Test Co');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website -- --include="**/list-pages.spec.ts"`
Expected: FAIL with "Cannot find module './about/about-page'" and the matching errors for the other pages.

- [ ] **Step 3: Implement ServicesPage**

`pages/services/services-page.ts`:
```ts
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Service, SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { HtmlContent } from '../../shared/html-content/html-content';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'hs-services-page',
  imports: [RouterLink, SectionHeading, HtmlContent, CtaBand],
  templateUrl: './services-page.html',
  styleUrl: './services-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesPage {
  readonly site = input.required<SiteConfig>();
  readonly services = input.required<Service[]>();

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        {
          title: 'Services',
          description: this.services().map((s) => s.name).join(', ') + ` from ${this.site().companyName}.`,
          path: '/services',
        },
        this.site(),
      ),
    );
  }
}
```

`pages/services/services-page.html`:
```html
<section class="hs-band">
  <div class="hs-container">
    <hs-section-heading eyebrow="What we do" heading="Services" [level]="1" />
    <div class="services">
      @for (service of services(); track service.slug) {
        <article class="service" [id]="service.slug">
          <h2 class="service__name">{{ service.name }}</h2>
          <p class="hs-lead">{{ service.summary }}</p>
          <hs-html-content [html]="service.descriptionHtml" />
          <a class="hs-btn service__cta" routerLink="/contact" [queryParams]="{ topic: service.slug }">Ask about {{ service.name }}</a>
        </article>
      }
    </div>
  </div>
</section>
<hs-cta-band heading="Not sure which fits? Tell us what you're building." />
```

`pages/services/services-page.scss`:
```scss
.services { display: flex; flex-direction: column; gap: 32px; }
.service {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: clamp(24px, 4vw, 48px);
  background: var(--hs-surface);
  border: 1px solid var(--hs-line);
  border-top: 1px solid var(--hs-gold);
  scroll-margin-top: 24px;
}
.service__name { font-size: clamp(26px, 3.4vw, 34px); }
.service__cta { align-self: flex-start; }
```

- [ ] **Step 4: Implement PortfolioPage**

`pages/portfolio/portfolio-page.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Project, ProjectKind, SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { ProjectCard } from '../../shared/project-card/project-card';
import { SectionHeading } from '../../shared/section-heading/section-heading';

const GROUPS: { kind: ProjectKind; heading: string }[] = [
  { kind: 'lab', heading: 'The lab' },
  { kind: 'product', heading: 'Products' },
  { kind: 'client', heading: 'Client work' },
];

@Component({
  selector: 'hs-portfolio-page',
  imports: [SectionHeading, ProjectCard, CtaBand],
  templateUrl: './portfolio-page.html',
  styleUrl: './portfolio-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPage {
  readonly site = input.required<SiteConfig>();
  readonly projects = input.required<Project[]>();

  protected readonly groups = computed(() =>
    GROUPS.map((g) => ({ ...g, projects: this.projects().filter((p) => p.kind === g.kind) })).filter(
      (g) => g.projects.length > 0,
    ),
  );

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        {
          title: 'Portfolio',
          description: `Lab experiments, products and client apps from ${this.site().companyName}.`,
          path: '/portfolio',
        },
        this.site(),
      ),
    );
  }
}
```

`pages/portfolio/portfolio-page.html`:
```html
<div class="hs-container page-head">
  <hs-section-heading eyebrow="Our work" heading="Portfolio" [level]="1" />
</div>
@for (group of groups(); track group.kind) {
  <section class="group">
    <div class="hs-container">
      <h2 class="group__heading">{{ group.heading }}</h2>
      <div class="hs-grid">
        @for (project of group.projects; track project.slug) {
          <hs-project-card [project]="project" />
        }
      </div>
    </div>
  </section>
}
<hs-cta-band heading="Want something like this built for you?" />
```

`pages/portfolio/portfolio-page.scss`:
```scss
.page-head { padding-top: clamp(56px, 8vw, 96px); }
.group { padding-bottom: clamp(56px, 8vw, 88px); }
.group__heading { font-size: clamp(22px, 3vw, 28px); margin-bottom: 24px; }
```

- [ ] **Step 5: Implement ProductsPage and AboutPage**

`pages/products/products-page.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Product, SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { ProductCard } from '../../shared/product-card/product-card';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'hs-products-page',
  imports: [SectionHeading, ProductCard, CtaBand],
  templateUrl: './products-page.html',
  styleUrl: './products-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage {
  readonly site = input.required<SiteConfig>();
  readonly products = input.required<Product[]>();

  protected readonly groups = computed(() =>
    [
      { heading: 'Apps', products: this.products().filter((p) => p.kind === 'app') },
      { heading: 'Libraries', products: this.products().filter((p) => p.kind === 'library') },
    ].filter((g) => g.products.length > 0),
  );

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        {
          title: 'Products',
          description: `Apps and open Angular libraries from ${this.site().companyName}.`,
          path: '/products',
        },
        this.site(),
      ),
    );
  }
}
```

`pages/products/products-page.html`:
```html
<div class="hs-container page-head">
  <hs-section-heading eyebrow="What we ship" heading="Products" [level]="1" />
</div>
@for (group of groups(); track group.heading) {
  <section class="group">
    <div class="hs-container">
      <h2 class="group__heading">{{ group.heading }}</h2>
      <div class="hs-grid">
        @for (product of group.products; track product.slug) {
          <hs-product-card [product]="product" />
        }
      </div>
    </div>
  </section>
}
<hs-cta-band heading="Need something built on these?" />
```

`pages/products/products-page.scss`:
```scss
.page-head { padding-top: clamp(56px, 8vw, 96px); }
.group { padding-bottom: clamp(56px, 8vw, 88px); }
.group__heading { font-size: clamp(22px, 3vw, 28px); margin-bottom: 24px; }
```

`pages/about/about-page.ts`:
```ts
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'hs-about-page',
  imports: [SectionHeading, CtaBand],
  templateUrl: './about-page.html',
  styleUrl: './about-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {
  readonly site = input.required<SiteConfig>();

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        {
          title: 'About',
          description: `The story behind ${this.site().companyName}.`,
          path: '/about',
        },
        this.site(),
      ),
    );
  }
}
```

`pages/about/about-page.html`:
```html
<section class="hs-band">
  <div class="hs-container about">
    <hs-section-heading eyebrow="About" [heading]="'About ' + site().companyName" [level]="1" />
    <div class="about__body">
      <p class="hs-lead">[Company story: why Hightower exists and who it serves.]</p>
      <p>[Paragraph: background and experience.]</p>
      <p>[Paragraph: how we work with clients.]</p>
    </div>
  </div>
</section>
<hs-cta-band heading="Have something that needs building?" />
```

`pages/about/about-page.scss`:
```scss
.about__body { display: flex; flex-direction: column; gap: 20px; max-width: 740px; font-size: 18px; line-height: 1.75; color: var(--hs-soft); }
```

- [ ] **Step 6: Add the routes**

In `projects/hightower-website/src/app/app.routes.ts`, add `servicesResolver`, `projectsResolver` and `productsResolver` to the resolver import. Then add these children after the home route:
```ts
      {
        path: 'services',
        loadComponent: () => import('./pages/services/services-page').then((m) => m.ServicesPage),
        resolve: { services: servicesResolver },
      },
      {
        path: 'portfolio',
        loadComponent: () => import('./pages/portfolio/portfolio-page').then((m) => m.PortfolioPage),
        resolve: { projects: projectsResolver },
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products/products-page').then((m) => m.ProductsPage),
        resolve: { products: productsResolver },
      },
      {
        path: 'about',
        loadComponent: () => import('./pages/about/about-page').then((m) => m.AboutPage),
      },
```

- [ ] **Step 7: Run tests and build**

Run: `npm run test:website`
Expected: all specs PASS.

Run: `npx ng build hightower-website`
Expected: success. `dist/browser/services/index.html`, `portfolio/index.html`, `products/index.html` and `about/index.html` exist.

- [ ] **Step 8: Commit**

```bash
git add projects/hightower-website/src/app/pages/services projects/hightower-website/src/app/pages/portfolio projects/hightower-website/src/app/pages/products projects/hightower-website/src/app/pages/about projects/hightower-website/src/app/pages/list-pages.spec.ts projects/hightower-website/src/app/app.routes.ts
git commit -m "feat(website): services, portfolio, products and about pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Detail pages, not-found page and server routes

**Files:**
- Create (each as `.ts` + `.html` + `.scss`): `projects/hightower-website/src/app/pages/project-detail/project-detail-page`, `.../pages/product-detail/product-detail-page`, `.../pages/not-found/not-found-page`
- Modify: `projects/hightower-website/src/app/app.routes.ts`, and replace `projects/hightower-website/src/app/app.routes.server.ts`
- Test: `projects/hightower-website/src/app/pages/detail-pages.spec.ts`

**Interfaces:**
- Consumes: `ProjectDetail`, `ProductDetail`, `projectDetailResolver`, `productDetailResolver`, `HtmlContent`, `ProductCard`, `CodeSnippet`, `CtaBand`, `SectionHeading`, `SeoService`, the labels and `ContentRepository`.
- Produces:
  - `ProjectDetailPage` (`site`, `detail: ProjectDetail`)
  - `ProductDetailPage` (`site`, `detail: ProductDetail`)
  - `NotFoundPage` (`site`)
  - The final `serverRoutes`.

- [ ] **Step 1: Write the failing spec**

`projects/hightower-website/src/app/pages/detail-pages.spec.ts`:
```ts
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { FIXTURE_PRODUCTS, FIXTURE_PROJECTS, FIXTURE_SITE } from '../content/testing/content-fixtures';
import { NotFoundPage } from './not-found/not-found-page';
import { ProductDetailPage } from './product-detail/product-detail-page';
import { ProjectDetailPage } from './project-detail/project-detail-page';

async function render<T>(component: Type<T>, inputs: Record<string, unknown>) {
  await TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(component);
  fixture.componentRef.setInput('site', FIXTURE_SITE);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('detail pages', () => {
  it('ProjectDetailPage shows a lab with breadcrumb, body and produced products', async () => {
    const lab = { ...FIXTURE_PROJECTS[0], tech: ['Angular'], links: [{ label: 'Demo', url: 'https://demo.dev' }] };
    const el = await render(ProjectDetailPage, { detail: { project: lab, produced: [FIXTURE_PRODUCTS[0]] } });
    expect(el.querySelector('h1')?.textContent).toBe('Lab One');
    expect(el.querySelector('nav[aria-label="Breadcrumb"] a')?.getAttribute('href')).toBe('/portfolio');
    expect(el.querySelector('.prose')?.innerHTML).toContain('<p>Body</p>');
    expect(el.textContent).toContain('Angular');
    expect(el.querySelector<HTMLAnchorElement>('a[href="https://demo.dev"]')?.rel).toBe('noopener noreferrer');
    expect(el.querySelector('.produced hs-product-card')).not.toBeNull();
    expect(el.textContent).toContain('In the lab now');
    expect(TestBed.inject(Title).getTitle()).toBe('Lab One | Test Co');
  });

  it('ProjectDetailPage hides the produced section for client projects and shows the client', async () => {
    const el = await render(ProjectDetailPage, { detail: { project: FIXTURE_PROJECTS[2], produced: [] } });
    expect(el.querySelector('.produced')).toBeNull();
    expect(el.textContent).toContain('Client One Inc');
  });

  it('ProductDetailPage shows install, repo link and produced-by lab', async () => {
    const el = await render(ProductDetailPage, { detail: { product: FIXTURE_PRODUCTS[1], lab: undefined } });
    expect(el.querySelector('h1')?.textContent).toBe('lib-one');
    expect(el.querySelector('hs-code-snippet pre')?.textContent).toBe('npm i lib-one');
    expect(el.querySelector('a[href="https://github.com/test/lib-one"]')).not.toBeNull();
    TestBed.resetTestingModule();
    const app = await render(ProductDetailPage, { detail: { product: FIXTURE_PRODUCTS[0], lab: FIXTURE_PROJECTS[0] } });
    expect(app.querySelector('hs-code-snippet')).toBeNull();
    expect(app.querySelector('a[href="/portfolio/lab-one"]')?.textContent).toContain('Lab One');
  });

  it('NotFoundPage links home and is noindex', async () => {
    const el = await render(NotFoundPage, {});
    expect(el.querySelector('h1')?.textContent).toBe('Page not found');
    expect(el.querySelector('a[href="/"]')).not.toBeNull();
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website -- --include="**/detail-pages.spec.ts"`
Expected: FAIL with "Cannot find module './not-found/not-found-page'" and the matching errors for the other pages.

- [ ] **Step 3: Implement ProjectDetailPage**

`pages/project-detail/project-detail-page.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROJECT_KIND_LABEL, STATUS_LABEL } from '../../content/labels';
import { SiteConfig } from '../../content/models';
import { ProjectDetail } from '../../routing/content-resolvers';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { HtmlContent } from '../../shared/html-content/html-content';
import { ProductCard } from '../../shared/product-card/product-card';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'hs-project-detail-page',
  imports: [RouterLink, HtmlContent, ProductCard, SectionHeading, CtaBand],
  templateUrl: './project-detail-page.html',
  styleUrl: './project-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailPage {
  readonly site = input.required<SiteConfig>();
  readonly detail = input.required<ProjectDetail>();

  protected readonly project = computed(() => this.detail().project);
  protected readonly kindLabel = computed(() => PROJECT_KIND_LABEL[this.project().kind]);
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.project().status]);

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const project = this.project();
      seo.apply(
        {
          title: project.name,
          description: project.summary,
          path: `/portfolio/${project.slug}`,
          image: project.images[0]?.src,
        },
        this.site(),
      );
    });
  }
}
```

`pages/project-detail/project-detail-page.html`:
```html
<section class="hs-container head">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a routerLink="/portfolio">Portfolio</a>
    <span aria-hidden="true">/</span>
    <span aria-current="page">{{ project().name }}</span>
  </nav>
  <div class="head__meta">
    <span class="hs-tag" [class]="'hs-tag--' + project().kind">{{ kindLabel() }}</span>
    <span class="hs-meta">Status · {{ statusLabel() }}</span>
    @if (project().client; as client) {
      <span class="hs-meta">Client · {{ client }}</span>
    }
  </div>
  <h1 class="head__title">{{ project().name }}</h1>
  <p class="hs-lead">{{ project().tagline }}</p>
</section>

<div class="hs-container">
  @if (project().images[0]; as image) {
    <img class="hero-image" [src]="image.src" [alt]="image.alt" width="1600" height="700" fetchpriority="high">
  } @else {
    <div class="hero-image hs-placeholder" aria-hidden="true">{{ project().name }}</div>
  }
</div>

<section class="hs-container body">
  <hs-html-content class="body__main" [html]="project().descriptionHtml" />
  <aside class="body__aside">
    @if (project().tech.length > 0) {
      <div class="aside-block">
        <h2 class="hs-meta">Tech</h2>
        <ul class="chips">
          @for (tech of project().tech; track tech) {
            <li>{{ tech }}</li>
          }
        </ul>
      </div>
    }
    @if (project().links.length > 0) {
      <div class="aside-block">
        <h2 class="hs-meta">Links</h2>
        <ul class="links">
          @for (link of project().links; track link.url) {
            <li><a [href]="link.url" target="_blank" rel="noopener noreferrer">{{ link.label }} <span aria-hidden="true">↗</span></a></li>
          }
        </ul>
      </div>
    }
  </aside>
</section>

@if (project().kind === 'lab') {
  <section class="hs-band hs-band--deep produced">
    <div class="hs-container">
      <hs-section-heading eyebrow="Produced in the lab" [heading]="'What came out of ' + project().name" />
      <div class="hs-grid">
        @for (product of detail().produced; track product.slug) {
          <hs-product-card [product]="product" />
        }
        <div class="lab-next">
          <p class="hs-meta">In the lab now</p>
          <p>The next experiment hasn't shipped yet.</p>
        </div>
      </div>
    </div>
  </section>
}

<hs-cta-band heading="Want something like this built for you?" />
```

`pages/project-detail/project-detail-page.scss`:
```scss
.head { display: flex; flex-direction: column; gap: 22px; padding-block: clamp(40px, 6vw, 56px) clamp(40px, 6vw, 64px); }

.breadcrumb { display: flex; flex-wrap: wrap; gap: 10px; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--hs-muted); }
.breadcrumb a { color: #CFD5E3; text-decoration: none; }
.breadcrumb a:hover { color: var(--hs-gold); }

.head__meta { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
.head__title { font-size: clamp(40px, 8vw, 80px); font-weight: 700; line-height: 1; letter-spacing: 0.02em; }

.hero-image { width: 100%; aspect-ratio: 16 / 7; object-fit: cover; border: 1px solid var(--hs-line); }

.body {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(40px, 6vw, 72px);
  align-items: flex-start;
  padding-block: clamp(56px, 8vw, 88px);
}
.body__main { flex: 2 1 520px; min-width: 0; }
.body__aside {
  flex: 1 1 260px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--hs-gold);
}
.aside-block { display: flex; flex-direction: column; gap: 12px; }

.chips, .links { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.chips li { font-family: var(--hs-font-mono); font-size: 13px; border: 1px solid var(--hs-line); padding: 6px 10px; }
.links { flex-direction: column; }
.links a { font-weight: 500; }

.lab-next {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  min-height: 220px;
  padding: 36px;
  border: 1.5px dashed #3A4670;
  color: #CFD5E3;
  font-size: 18px;
}
```

- [ ] **Step 4: Implement ProductDetailPage**

`pages/product-detail/product-detail-page.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUCT_KIND_LABEL, STATUS_LABEL } from '../../content/labels';
import { SiteConfig } from '../../content/models';
import { ProductDetail } from '../../routing/content-resolvers';
import { SeoService } from '../../seo/seo.service';
import { CodeSnippet } from '../../shared/code-snippet/code-snippet';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { HtmlContent } from '../../shared/html-content/html-content';

@Component({
  selector: 'hs-product-detail-page',
  imports: [RouterLink, HtmlContent, CodeSnippet, CtaBand],
  templateUrl: './product-detail-page.html',
  styleUrl: './product-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPage {
  readonly site = input.required<SiteConfig>();
  readonly detail = input.required<ProductDetail>();

  protected readonly product = computed(() => this.detail().product);
  protected readonly kindLabel = computed(() => PRODUCT_KIND_LABEL[this.product().kind]);
  protected readonly tagClass = computed(() => (this.product().kind === 'app' ? 'hs-tag--product' : 'hs-tag--library'));
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.product().status]);
  protected readonly links = computed(() => {
    const p = this.product();
    return [
      p.repoUrl ? { label: 'Source code', url: p.repoUrl } : null,
      p.npmUrl ? { label: 'npm package', url: p.npmUrl } : null,
      p.docsUrl ? { label: 'Documentation', url: p.docsUrl } : null,
    ].filter((l): l is { label: string; url: string } => l !== null);
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const product = this.product();
      seo.apply(
        { title: product.name, description: product.summary, path: `/products/${product.slug}` },
        this.site(),
      );
    });
  }
}
```

`pages/product-detail/product-detail-page.html`:
```html
<section class="hs-container head">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a routerLink="/products">Products</a>
    <span aria-hidden="true">/</span>
    <span aria-current="page">{{ product().name }}</span>
  </nav>
  <div class="head__meta">
    <span class="hs-tag" [class]="tagClass()">{{ kindLabel() }}</span>
    <span class="hs-meta">Status · {{ statusLabel() }}</span>
  </div>
  <h1 class="head__title" [class.head__title--mono]="product().kind === 'library'">{{ product().name }}</h1>
  <p class="hs-lead">{{ product().summary }}</p>
  @if (detail().lab; as lab) {
    <p class="produced-by">Produced in <a [routerLink]="['/portfolio', lab.slug]">{{ lab.name }}</a></p>
  }
</section>

<section class="hs-container body">
  <hs-html-content class="body__main" [html]="product().descriptionHtml" />
  <aside class="body__aside">
    @if (product().install; as install) {
      <div class="aside-block">
        <h2 class="hs-meta">Install</h2>
        <hs-code-snippet [code]="install" />
      </div>
    }
    @if (links().length > 0) {
      <div class="aside-block">
        <h2 class="hs-meta">Links</h2>
        <ul class="links">
          @for (link of links(); track link.url) {
            <li><a [href]="link.url" target="_blank" rel="noopener noreferrer">{{ link.label }} <span aria-hidden="true">↗</span></a></li>
          }
        </ul>
      </div>
    }
  </aside>
</section>

<hs-cta-band heading="Need something built on this?" />
```

`pages/product-detail/product-detail-page.scss`:
```scss
.head { display: flex; flex-direction: column; gap: 22px; padding-block: clamp(40px, 6vw, 56px) 0; }

.breadcrumb { display: flex; flex-wrap: wrap; gap: 10px; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--hs-muted); }
.breadcrumb a { color: #CFD5E3; text-decoration: none; }
.breadcrumb a:hover { color: var(--hs-gold); }

.head__meta { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
.head__title { font-size: clamp(36px, 7vw, 72px); font-weight: 700; line-height: 1.02; overflow-wrap: anywhere; }
.head__title--mono { font-family: var(--hs-font-mono); font-weight: 400; font-size: clamp(28px, 5vw, 52px); }

.produced-by { color: var(--hs-muted); }

.body {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(40px, 6vw, 72px);
  align-items: flex-start;
  padding-block: clamp(48px, 7vw, 80px);
}
.body__main { flex: 2 1 520px; min-width: 0; }
.body__aside {
  flex: 1 1 280px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--hs-gold);
}
.aside-block { display: flex; flex-direction: column; gap: 12px; }
.links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.links a { font-weight: 500; }
```

- [ ] **Step 5: Implement NotFoundPage**

`pages/not-found/not-found-page.ts`:
```ts
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';

@Component({
  selector: 'hs-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  readonly site = input.required<SiteConfig>();

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        { title: 'Page not found', description: 'This page does not exist.', path: '/not-found', noindex: true },
        this.site(),
      ),
    );
  }
}
```

`pages/not-found/not-found-page.html`:
```html
<section class="hs-container not-found">
  <p class="hs-eyebrow">404</p>
  <h1>Page not found</h1>
  <p class="hs-lead">The page you're looking for has moved or never existed.</p>
  <div class="actions">
    <a class="hs-btn" routerLink="/">Back to home</a>
    <a class="hs-btn hs-btn--ghost" routerLink="/portfolio">See the work</a>
  </div>
</section>
```

`pages/not-found/not-found-page.scss`:
```scss
.not-found { display: flex; flex-direction: column; gap: 22px; padding-block: clamp(80px, 14vw, 160px); }
h1 { font-size: clamp(36px, 6vw, 56px); }
.actions { display: flex; flex-wrap: wrap; gap: 14px; }
```

- [ ] **Step 6: Add the routes and final server routes**

In `projects/hightower-website/src/app/app.routes.ts`, add `projectDetailResolver` and `productDetailResolver` to the resolver import. Add these children after the `products` route:
```ts
      {
        path: 'portfolio/:slug',
        loadComponent: () =>
          import('./pages/project-detail/project-detail-page').then((m) => m.ProjectDetailPage),
        resolve: { detail: projectDetailResolver },
      },
      {
        path: 'products/:slug',
        loadComponent: () =>
          import('./pages/product-detail/product-detail-page').then((m) => m.ProductDetailPage),
        resolve: { detail: productDetailResolver },
      },
```
Then add these as the **last** children, after `about` (Task 14 inserts `contact` before `not-found`):
```ts
      {
        path: 'not-found',
        loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
      },
      {
        path: '**',
        loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
      },
```

Replace `projects/hightower-website/src/app/app.routes.server.ts` with:
```ts
import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { firstValueFrom } from 'rxjs';
import { ContentRepository } from './content/content-repository';

/** Every static route is prerendered. Keep in sync with STATIC_ROUTES in scripts/postbuild.mjs. */
const STATIC_PATHS = ['', 'services', 'portfolio', 'products', 'about', 'not-found'];

export const serverRoutes: ServerRoute[] = [
  ...STATIC_PATHS.map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
  {
    path: 'portfolio/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const projects = await firstValueFrom(inject(ContentRepository).projects());
      // Product-kind projects have their canonical page under /products.
      return projects.filter((p) => p.kind !== 'product').map((p) => ({ slug: p.slug }));
    },
  },
  {
    path: 'products/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const products = await firstValueFrom(inject(ContentRepository).products());
      return products.map((p) => ({ slug: p.slug }));
    },
  },
  { path: '**', renderMode: RenderMode.Client },
];
```
`contact` is deliberately absent. @angular/ssr fails the build when a server route has no matching client route, so Task 14 adds `contact` here in the same step that adds its client route.

- [ ] **Step 7: Run tests and build**

Run: `npm run test:website`
Expected: all specs PASS.

Run: `npx ng build hightower-website`
Expected:
- `ls projects/hightower-website/dist/browser/portfolio` lists `index.html`, `red-sea/`, `kree-house-of-beauty/` and `lalas-anime-world/`. It does **not** list `logos/`.
- `ls projects/hightower-website/dist/browser/products` lists `logos/`, `ht-quick-angular-table/`, `ht-quick-ngxfire/` and `ht-camera-upload/`.
- `dist/browser/not-found/index.html` exists and contains `noindex`.

- [ ] **Step 8: Commit**

```bash
git add projects/hightower-website/src/app/pages/project-detail projects/hightower-website/src/app/pages/product-detail projects/hightower-website/src/app/pages/not-found projects/hightower-website/src/app/pages/detail-pages.spec.ts projects/hightower-website/src/app/app.routes.ts projects/hightower-website/src/app/app.routes.server.ts
git commit -m "feat(website): project, product and not-found pages with prerender params

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Contact service, submission writer and environments

**Files:**
- Create: `projects/hightower-website/src/environments/environment.model.ts`, `projects/hightower-website/src/environments/environment.ts`, `projects/hightower-website/src/environments/environment.prod.ts`, `projects/hightower-website/src/app/contact/contact.models.ts`, `projects/hightower-website/src/app/contact/submission-writer.ts`, `projects/hightower-website/src/app/contact/firebase-submission-writer.ts`, `projects/hightower-website/src/app/contact/contact.service.ts`
- Modify: `angular.json` (production `fileReplacements`), `projects/hightower-website/src/app/app.config.ts`
- Test: `projects/hightower-website/src/app/contact/contact.service.spec.ts`

**Interfaces:**
- Consumes: `Service`.
- Produces:
  - `ContactFormValue { name; email; company; topic; message; honeypot }` (all strings).
  - `ContactSubmission { name; email; company?; topic; message }`.
  - `SubmitResult = 'sent' | 'offline' | 'failed'`.
  - `toSubmission(v: ContactFormValue): ContactSubmission`.
  - `contactTopics(services: Service[]): { value: string; label: string }[]`.
  - `abstract class SubmissionWriter { abstract write(data: ContactSubmission): Promise<void> }` and `FirebaseSubmissionWriter`.
  - `ContactService.submit(v: ContactFormValue): Promise<SubmitResult>` and `CONTACT_TIMEOUT_MS = 15000`.
  - `environment: Environment`.

- [ ] **Step 1: Write the failing spec**

`projects/hightower-website/src/app/contact/contact.service.spec.ts`:
```ts
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FIXTURE_SERVICES } from '../content/testing/content-fixtures';
import { ContactFormValue, contactTopics, toSubmission } from './contact.models';
import { CONTACT_TIMEOUT_MS, ContactService } from './contact.service';
import { SubmissionWriter } from './submission-writer';

const VALUE: ContactFormValue = {
  name: '  Ada Lovelace ',
  email: ' ada@example.com ',
  company: '   ',
  topic: 'consulting',
  message: '  I would like to talk about a project.  ',
  honeypot: '',
};

describe('toSubmission', () => {
  it('trims fields and omits an empty company', () => {
    expect(toSubmission(VALUE)).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      topic: 'consulting',
      message: 'I would like to talk about a project.',
    });
  });

  it('keeps a non-empty company', () => {
    expect(toSubmission({ ...VALUE, company: ' Engines ' }).company).toBe('Engines');
  });
});

describe('contactTopics', () => {
  it('lists the given services in order, then product and other', () => {
    expect(contactTopics([FIXTURE_SERVICES[1], FIXTURE_SERVICES[0]])).toEqual([
      { value: 'custom-development', label: 'Custom Development' },
      { value: 'consulting', label: 'Consulting' },
      { value: 'product', label: 'A product or library' },
      { value: 'other', label: 'Something else' },
    ]);
  });
});

describe('ContactService', () => {
  let write: jasmine.Spy<(data: unknown) => Promise<void>>;

  function setup(platform = 'browser') {
    write = jasmine.createSpy('write').and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        { provide: SubmissionWriter, useValue: { write } },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    return TestBed.inject(ContactService);
  }

  afterEach(() => jasmine.clock().uninstall());

  it('writes the trimmed submission and reports sent', async () => {
    const service = setup();
    expect(await service.submit(VALUE)).toBe('sent');
    expect(write).toHaveBeenCalledOnceWith(toSubmission(VALUE));
  });

  it('silently succeeds without writing when the honeypot is filled', async () => {
    const service = setup();
    expect(await service.submit({ ...VALUE, honeypot: 'http://spam' })).toBe('sent');
    expect(write).not.toHaveBeenCalled();
  });

  it('reports offline without writing when the browser is offline', async () => {
    const service = setup();
    spyOnProperty(navigator, 'onLine').and.returnValue(false);
    expect(await service.submit(VALUE)).toBe('offline');
    expect(write).not.toHaveBeenCalled();
  });

  it('reports failed when the write rejects', async () => {
    const service = setup();
    write.and.rejectWith(new Error('permission-denied'));
    expect(await service.submit(VALUE)).toBe('failed');
  });

  it('reports failed when the write takes longer than the timeout', async () => {
    const service = setup();
    jasmine.clock().install();
    write.and.returnValue(new Promise<void>(() => undefined));
    const result = service.submit(VALUE);
    jasmine.clock().tick(CONTACT_TIMEOUT_MS);
    expect(await result).toBe('failed');
    expect(CONTACT_TIMEOUT_MS).toBe(15000);
  });

  it('never writes on the server', async () => {
    const service = setup('server');
    expect(await service.submit(VALUE)).toBe('failed');
    expect(write).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website -- --include="**/contact.service.spec.ts"`
Expected: FAIL with "Cannot find module './contact.models'".

- [ ] **Step 3: Implement models, writer abstraction and service**

`projects/hightower-website/src/app/contact/contact.models.ts`:
```ts
import { Service } from '../content/models';

export interface ContactFormValue {
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
  honeypot: string;
}

/** Exactly the fields firestore.rules allows (createdAt is added by the writer). */
export interface ContactSubmission {
  name: string;
  email: string;
  company?: string;
  topic: string;
  message: string;
}

export type SubmitResult = 'sent' | 'offline' | 'failed';

export function toSubmission(value: ContactFormValue): ContactSubmission {
  const company = value.company.trim();
  return {
    name: value.name.trim(),
    email: value.email.trim(),
    ...(company ? { company } : {}),
    topic: value.topic,
    message: value.message.trim(),
  };
}

/** Service slugs, then product and other. Must match the topic list in firestore.rules. */
export function contactTopics(services: Service[]): { value: string; label: string }[] {
  return [
    ...services.map((s) => ({ value: s.slug, label: s.name })),
    { value: 'product', label: 'A product or library' },
    { value: 'other', label: 'Something else' },
  ];
}
```

`projects/hightower-website/src/app/contact/submission-writer.ts`:
```ts
import { ContactSubmission } from './contact.models';

/** Adapter around the Firebase SDK so the service and page are testable without it. */
export abstract class SubmissionWriter {
  abstract write(data: ContactSubmission): Promise<void>;
}
```

`projects/hightower-website/src/app/contact/contact.service.ts`:
```ts
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ContactFormValue, SubmitResult, toSubmission } from './contact.models';
import { SubmissionWriter } from './submission-writer';

export const CONTACT_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly writer = inject(SubmissionWriter);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async submit(value: ContactFormValue): Promise<SubmitResult> {
    if (!this.isBrowser) return 'failed';
    if (value.honeypot.trim() !== '') return 'sent'; // bot: pretend success, write nothing
    if (navigator.onLine === false) return 'offline';
    try {
      await withTimeout(this.writer.write(toSubmission(value)), CONTACT_TIMEOUT_MS);
      return 'sent';
    } catch {
      return 'failed';
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:website -- --include="**/contact.service.spec.ts"`
Expected: PASS (9 specs).

- [ ] **Step 5: Add environments and the Firebase writer**

`projects/hightower-website/src/environments/environment.model.ts`:
```ts
export interface Environment {
  production: boolean;
  /** Development talks to the local Firestore emulator and skips App Check. */
  useEmulator: boolean;
  firebase: { apiKey: string; authDomain: string; projectId: string; appId: string };
  recaptchaSiteKey: string;
}
```

`projects/hightower-website/src/environments/environment.ts`:
```ts
import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  useEmulator: true,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-hightower.firebaseapp.com',
    projectId: 'demo-hightower',
    appId: '1:000000000000:web:demo',
  },
  recaptchaSiteKey: '',
};
```

`projects/hightower-website/src/environments/environment.prod.ts` (the owner fills these in during spec §8 setup; these values are public by design):
```ts
import { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  useEmulator: false,
  firebase: {
    apiKey: 'REPLACE_WITH_WEB_API_KEY',
    authDomain: 'REPLACE_WITH_PROJECT_ID.firebaseapp.com',
    projectId: 'REPLACE_WITH_PROJECT_ID',
    appId: 'REPLACE_WITH_WEB_APP_ID',
  },
  recaptchaSiteKey: 'REPLACE_WITH_RECAPTCHA_V3_SITE_KEY',
};
```

`projects/hightower-website/src/app/contact/firebase-submission-writer.ts`:
```ts
import { Injectable } from '@angular/core';
import type { Firestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { ContactSubmission } from './contact.models';
import { SubmissionWriter } from './submission-writer';

type FirestoreModule = typeof import('firebase/firestore');

/**
 * Loads the Firebase SDK lazily on the first write. Never runs during prerender because
 * ContactService only calls it in the browser.
 */
@Injectable()
export class FirebaseSubmissionWriter extends SubmissionWriter {
  private ready?: Promise<{ db: Firestore; fs: FirestoreModule }>;

  override async write(data: ContactSubmission): Promise<void> {
    const { db, fs } = await this.init();
    await fs.addDoc(fs.collection(db, 'contactSubmissions'), { ...data, createdAt: fs.serverTimestamp() });
  }

  private init(): Promise<{ db: Firestore; fs: FirestoreModule }> {
    this.ready ??= (async () => {
      const [{ getApps, initializeApp }, fs] = await Promise.all([
        import('firebase/app'),
        import('firebase/firestore'),
      ]);
      const app = getApps()[0] ?? initializeApp(environment.firebase);
      if (environment.useEmulator) {
        const db = fs.getFirestore(app);
        fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
        return { db, fs };
      }
      // App Check must be initialized before the first Firestore request.
      const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(environment.recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      return { db: fs.getFirestore(app), fs };
    })();
    return this.ready;
  }
}
```

In `angular.json`, under `projects.hightower-website.architect.build.configurations.production`, add:
```json
"fileReplacements": [
  {
    "replace": "projects/hightower-website/src/environments/environment.ts",
    "with": "projects/hightower-website/src/environments/environment.prod.ts"
  }
]
```

In `projects/hightower-website/src/app/app.config.ts`, add these imports:
```ts
import { FirebaseSubmissionWriter } from './contact/firebase-submission-writer';
import { SubmissionWriter } from './contact/submission-writer';
```
and append to `providers`:
```ts
    { provide: SubmissionWriter, useClass: FirebaseSubmissionWriter },
```

- [ ] **Step 6: Verify the build keeps Firebase out of the initial bundle**

Run: `npx ng build hightower-website`
Expected:
- The build succeeds.
- The "Initial chunk files" table contains no chunk that is mostly Firebase. Firebase appears only under "Lazy chunk files".
- The prerender has no errors. Firebase never initializes on the server because nothing calls `write()` there.

- [ ] **Step 7: Commit**

```bash
git add angular.json projects/hightower-website/src/environments projects/hightower-website/src/app/contact projects/hightower-website/src/app/app.config.ts
git commit -m "feat(website): contact service with lazy Firebase writer and App Check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Contact page

**Files:**
- Create: `projects/hightower-website/src/app/contact/contact-validators.ts`, `projects/hightower-website/src/app/pages/contact/contact-page.ts`, `.../contact/contact-page.html`, `.../contact/contact-page.scss`
- Modify: `projects/hightower-website/src/app/app.routes.ts`, `projects/hightower-website/src/app/app.routes.server.ts`
- Test: `projects/hightower-website/src/app/pages/contact/contact-page.spec.ts`

**Interfaces:**
- Consumes: `ContactService`, `contactTopics`, `ContactFormValue`, `SubmitResult`, `servicesResolver`, `SeoService`, `SiteConfig`, `Service`.
- Produces:
  - `ContactPage`, with inputs `site`, `services: Service[]` and `topic = input<string | undefined>()` (from the query param). It exposes `form` and `submit(): Promise<void>` publicly.
  - From `contact-validators.ts`: `notBlank`, `trimmedMinLength(n)`, `EMAIL_PATTERN`.

- [ ] **Step 1: Write the failing spec**

`projects/hightower-website/src/app/pages/contact/contact-page.spec.ts`:
```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactService } from '../../contact/contact.service';
import { SubmitResult } from '../../contact/contact.models';
import { FIXTURE_SERVICES, FIXTURE_SITE } from '../../content/testing/content-fixtures';
import { ContactPage } from './contact-page';

const VALID = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: '',
  topic: 'consulting',
  message: 'I would like to talk about a project.',
  honeypot: '',
};

describe('ContactPage', () => {
  let submit: jasmine.Spy<(v: unknown) => Promise<SubmitResult>>;

  async function setup(topic?: string): Promise<ComponentFixture<ContactPage>> {
    submit = jasmine.createSpy('submit').and.resolveTo('sent');
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [provideRouter([]), { provide: ContactService, useValue: { submit } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ContactPage);
    fixture.componentRef.setInput('site', FIXTURE_SITE);
    fixture.componentRef.setInput('services', [FIXTURE_SERVICES[1], FIXTURE_SERVICES[0]]);
    if (topic !== undefined) fixture.componentRef.setInput('topic', topic);
    await fixture.whenStable();
    return fixture;
  }

  const el = (f: ComponentFixture<ContactPage>) => f.nativeElement as HTMLElement;

  it('preselects the topic from the query param', async () => {
    const f = await setup('consulting');
    expect(f.componentInstance.form.controls.topic.value).toBe('consulting');
  });

  it('falls back to the first service for a missing or unknown topic', async () => {
    const f = await setup('pizza');
    expect(f.componentInstance.form.controls.topic.value).toBe('custom-development');
  });

  it('follows a ?topic= change while the component is reused', async () => {
    const f = await setup('consulting');
    f.componentRef.setInput('topic', 'other');
    await f.whenStable();
    expect(f.componentInstance.form.controls.topic.value).toBe('other');
  });

  it('keeps the visitor\'s own topic choice when ?topic= changes', async () => {
    const f = await setup('consulting');
    f.componentInstance.form.controls.topic.setValue('product');
    f.componentInstance.form.controls.topic.markAsDirty();
    f.componentRef.setInput('topic', 'other');
    await f.whenStable();
    expect(f.componentInstance.form.controls.topic.value).toBe('product');
  });

  it('lists the service topics plus product and other', async () => {
    const labels = Array.from(el(await setup()).querySelectorAll('mat-radio-button')).map((r) => r.textContent?.trim());
    expect(labels).toEqual(['Custom Development', 'Consulting', 'A product or library', 'Something else']);
  });

  it('shows errors and does not submit an empty form', async () => {
    const f = await setup();
    await f.componentInstance.submit();
    f.detectChanges(); // touched state isn't a signal the template reads, so zoneless CD needs a nudge
    await f.whenStable();
    expect(submit).not.toHaveBeenCalled();
    expect(el(f).textContent).toContain('Please enter your name.');
    expect(el(f).textContent).toContain('Please enter your email address.');
  });

  it('rejects a whitespace-only name and an email without a dot in the domain', async () => {
    const f = await setup();
    f.componentInstance.form.setValue({ ...VALID, name: '   ', email: 'ada@example' });
    expect(f.componentInstance.form.controls.name.hasError('blank')).toBeTrue();
    expect(f.componentInstance.form.controls.email.hasError('pattern')).toBeTrue();
  });

  it('rejects a message under 10 characters after trimming', async () => {
    const f = await setup();
    f.componentInstance.form.controls.message.setValue('   short   ');
    expect(f.componentInstance.form.controls.message.hasError('minLengthTrimmed')).toBeTrue();
  });

  it('submits and replaces the form with a thank-you', async () => {
    const f = await setup();
    f.componentInstance.form.setValue(VALID);
    await f.componentInstance.submit();
    await f.whenStable();
    expect(submit).toHaveBeenCalledOnceWith(VALID);
    expect(el(f).querySelector('form')).toBeNull();
    expect(el(f).textContent).toContain('Thank you');
    expect(el(f).textContent).toContain('two business days');
  });

  it('keeps input and shows the email fallback on failure', async () => {
    const f = await setup();
    submit.and.resolveTo('failed');
    f.componentInstance.form.setValue(VALID);
    await f.componentInstance.submit();
    await f.whenStable();
    expect(el(f).querySelector('form')).not.toBeNull();
    expect(f.componentInstance.form.controls.message.value).toBe(VALID.message);
    expect(el(f).querySelector('[role="status"]')?.textContent).toContain('hi@test.example');
  });

  it('shows an offline message', async () => {
    const f = await setup();
    submit.and.resolveTo('offline');
    f.componentInstance.form.setValue(VALID);
    await f.componentInstance.submit();
    await f.whenStable();
    expect(el(f).querySelector('[role="status"]')?.textContent).toContain('offline');
  });

  it('disables the button while submitting', async () => {
    const f = await setup();
    let finish!: (r: SubmitResult) => void;
    submit.and.returnValue(new Promise<SubmitResult>((resolve) => (finish = resolve)));
    f.componentInstance.form.setValue(VALID);
    const pending = f.componentInstance.submit();
    await f.whenStable();
    expect(el(f).querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBeTrue();
    finish('sent');
    await pending;
  });

  it('renders the honeypot off-screen, out of tab order and hidden from assistive tech', async () => {
    const hp = el(await setup()).querySelector<HTMLInputElement>('#hp_field_x')!;
    expect(hp.tabIndex).toBe(-1);
    expect(hp.getAttribute('autocomplete')).toBe('off');
    expect(hp.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website -- --include="**/contact-page.spec.ts"`
Expected: FAIL with "Cannot find module './contact-page'".

- [ ] **Step 3: Implement the validators**

`projects/hightower-website/src/app/contact/contact-validators.ts`:
```ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Must match the regex in firestore.rules. */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Non-empty but whitespace-only. Empty values are left to Validators.required. */
export const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
};

export function trimmedMinLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string' || value.length === 0) return null;
    const length = value.trim().length;
    return length < min ? { minLengthTrimmed: { requiredLength: min, actualLength: length } } : null;
  };
}
```

- [ ] **Step 4: Implement the page**

`pages/contact/contact-page.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { EMAIL_PATTERN, notBlank, trimmedMinLength } from '../../contact/contact-validators';
import { SubmitResult, contactTopics } from '../../contact/contact.models';
import { ContactService } from '../../contact/contact.service';
import { Service, SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';

type FormState = 'idle' | 'submitting' | SubmitResult;
type Field = 'name' | 'email' | 'company' | 'message';

const MESSAGES: Record<Field, Record<string, string>> = {
  name: { required: 'Please enter your name.', blank: 'Please enter your name.', maxlength: 'Name must be 100 characters or fewer.' },
  email: {
    required: 'Please enter your email address.',
    pattern: 'Please enter a valid email address.',
    maxlength: 'Email must be 254 characters or fewer.',
  },
  company: { maxlength: 'Company must be 100 characters or fewer.' },
  message: {
    required: 'Please tell us a little about your project.',
    minLengthTrimmed: 'Please write at least 10 characters.',
    maxlength: 'Message must be 5000 characters or fewer.',
  },
};

@Component({
  selector: 'hs-contact-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatRadioModule, MatProgressSpinnerModule],
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage {
  readonly site = input.required<SiteConfig>();
  readonly services = input.required<Service[]>();
  readonly topic = input<string | undefined>(); // ?topic= query param

  private readonly contact = inject(ContactService);
  protected readonly state = signal<FormState>('idle');
  protected readonly topics = computed(() => contactTopics(this.services()));

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank, Validators.maxLength(100)] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(254)],
    }),
    company: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    topic: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, trimmedMinLength(10), Validators.maxLength(5000)],
    }),
    honeypot: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        {
          title: 'Contact',
          description: `Tell ${this.site().companyName} what you're building.`,
          path: '/contact',
        },
        this.site(),
      ),
    );
    // Re-runs when ?topic= changes while the router reuses this component
    // (e.g. a CTA link clicked from /contact). Never overrides a visitor's choice.
    effect(() => {
      const values = this.topics().map((t) => t.value);
      const requested = this.topic();
      const control = this.form.controls.topic;
      if (control.dirty) return;
      control.setValue(requested && values.includes(requested) ? requested : values[0]);
    });
  }

  protected errorFor(field: Field): string {
    const errors = this.form.controls[field].errors;
    if (!errors) return '';
    const key = Object.keys(errors).find((k) => MESSAGES[field][k]);
    return key ? MESSAGES[field][key] : '';
  }

  async submit(): Promise<void> {
    if (this.state() === 'submitting') return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.state.set('submitting');
    this.state.set(await this.contact.submit(this.form.getRawValue()));
  }
}
```

`pages/contact/contact-page.html`:
```html
<section class="hs-container contact">
  <div class="intro">
    <p class="hs-eyebrow">Contact</p>
    <h1 class="intro__title">Tell us what you're building.</h1>
    <p class="hs-lead">
      A few sentences is plenty — what it is, who it's for, and roughly when you need it.
      Expect a reply within {{ site().responseTime }}.
    </p>
    <dl class="details">
      <div class="details__row">
        <dt class="hs-meta">Email</dt>
        <dd><a [href]="'mailto:' + site().email">{{ site().email }}</a></dd>
      </div>
      <div class="details__row">
        <dt class="hs-meta">Elsewhere</dt>
        <dd class="details__socials">
          @for (social of site().socials; track social.url) {
            <a [href]="social.url" target="_blank" rel="noopener noreferrer">{{ social.label }}</a>
          }
        </dd>
      </div>
    </dl>
  </div>

  <div class="panel">
    @if (state() === 'sent') {
      <div class="thanks">
        <h2>Thank you.</h2>
        <p>Your message is on its way. Expect a reply within {{ site().responseTime }}.</p>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" autocomplete="name" maxlength="100" required>
            <mat-error>{{ errorFor('name') }}</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" maxlength="254" required>
            <mat-error>{{ errorFor('email') }}</mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Company (optional)</mat-label>
          <input matInput formControlName="company" autocomplete="organization" maxlength="100">
          <mat-error>{{ errorFor('company') }}</mat-error>
        </mat-form-field>

        <div class="topics">
          <span id="topic-label" class="topics__label">I'm interested in</span>
          <mat-radio-group formControlName="topic" aria-labelledby="topic-label" class="topics__group">
            @for (topic of topics(); track topic.value) {
              <mat-radio-button [value]="topic.value">{{ topic.label }}</mat-radio-button>
            }
          </mat-radio-group>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Message</mat-label>
          <textarea matInput formControlName="message" rows="6" maxlength="5000" required></textarea>
          <mat-error>{{ errorFor('message') }}</mat-error>
        </mat-form-field>

        <div class="hp" aria-hidden="true">
          <label for="hp_field_x">Leave this field empty</label>
          <input id="hp_field_x" name="hp_field_x" type="text" tabindex="-1" autocomplete="off" formControlName="honeypot">
        </div>

        <div class="footer">
          <span class="footer__note">Protected by reCAPTCHA. Your message is only used to reply to you.</span>
          <button type="submit" class="hs-btn" [disabled]="state() === 'submitting'">
            @if (state() === 'submitting') {
              <mat-progress-spinner mode="indeterminate" diameter="18" aria-hidden="true" />
              Sending…
            } @else {
              Send message
            }
          </button>
        </div>
      </form>
    }
    <div role="status" aria-live="polite" class="status">
      @switch (state()) {
        @case ('failed') {
          <p class="status__error">
            Something went wrong sending your message. Please try again, or email
            <a [href]="'mailto:' + site().email">{{ site().email }}</a>.
          </p>
        }
        @case ('offline') {
          <p class="status__error">
            You appear to be offline. Check your connection and try again, or email
            <a [href]="'mailto:' + site().email">{{ site().email }}</a>.
          </p>
        }
      }
    </div>
  </div>
</section>
```

`pages/contact/contact-page.scss`:
```scss
.contact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr));
  gap: clamp(48px, 7vw, 80px);
  align-items: start;
  padding-block: clamp(64px, 10vw, 104px) clamp(80px, 12vw, 128px);
}

.intro { display: flex; flex-direction: column; gap: 26px; }
.intro__title { font-size: clamp(36px, 6vw, 54px); line-height: 1.08; }

.details { margin: 0; display: flex; flex-direction: column; gap: 16px; padding-top: 26px; border-top: 1px solid var(--hs-line); }
.details__row { display: flex; flex-wrap: wrap; gap: 16px; align-items: baseline; }
.details__row dt { width: 110px; }
.details__row dd { margin: 0; font-size: 17px; font-weight: 500; }
.details__socials { display: flex; gap: 20px; }

.panel {
  padding: clamp(24px, 4vw, 40px);
  background: var(--hs-surface);
  border: 1px solid var(--hs-line);
  border-top: 1px solid var(--hs-gold);
}

form { display: flex; flex-direction: column; gap: 8px; }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: 0 20px; }
mat-form-field { width: 100%; }

.topics { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.topics__label { font-size: 14px; font-weight: 500; letter-spacing: 0.04em; }
.topics__group { display: flex; flex-wrap: wrap; gap: 4px 12px; }

.hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }

.footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; padding-top: 4px; }
.footer__note { font-size: 13px; color: var(--hs-muted); max-width: 300px; }

.thanks { display: flex; flex-direction: column; gap: 14px; }
.thanks h2 { font-size: 32px; }

.status:empty { display: none; }
.status__error { margin-top: 20px; padding: 14px 16px; border: 1px solid #FFB4AB; color: #FFDAD6; }
```

Add the route in `projects/hightower-website/src/app/app.routes.ts`. Put it after `about` and before `not-found`, and make sure `servicesResolver` is imported:
```ts
      {
        path: 'contact',
        loadComponent: () => import('./pages/contact/contact-page').then((m) => m.ContactPage),
        resolve: { services: servicesResolver },
      },
```

In `projects/hightower-website/src/app/app.routes.server.ts`, add `'contact'` to `STATIC_PATHS` before `'not-found'`:
```ts
const STATIC_PATHS = ['', 'services', 'portfolio', 'products', 'about', 'contact', 'not-found'];
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test:website`
Expected: all specs PASS.

Run: `npx ng build hightower-website`
Expected: success. `dist/browser/contact/index.html` contains `Tell us what you're building.`

- [ ] **Step 6: Commit**

```bash
git add projects/hightower-website/src/app/contact/contact-validators.ts projects/hightower-website/src/app/pages/contact projects/hightower-website/src/app/app.routes.ts projects/hightower-website/src/app/app.routes.server.ts
git commit -m "feat(website): contact page with validation, honeypot and send states

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Firebase config, Firestore rules, rules tests and the topic-sync check

**Files:**
- Create: `projects/hightower-website/firebase.json`, `projects/hightower-website/firestore.rules`, `projects/hightower-website/firestore.indexes.json`, `projects/hightower-website/rules-tests/firestore.rules.test.mjs`
- Modify: `projects/hightower-website/scripts/build-content.mjs`, `projects/hightower-website/scripts/build-content.test.mjs`, `package.json`

**Interfaces:**
- Consumes: the `services` content (Task 2) and `contactTopics` semantics (Task 13).
- Produces:
  - Exports in `build-content.mjs`: `rulesTopics(rulesText): string[]`, `expectedTopics(services): string[]`, `assertTopicsMatch(rulesText, services): void`.
  - The npm script `test:website:rules`.

- [ ] **Step 1: Install the emulator tooling (worktree root)**

Run: `npm i -D firebase-tools @firebase/rules-unit-testing@^4`
Expected: both land in `devDependencies`. Version 4.x has `firebase@^11` as a peer, which matches the installed `firebase`.

- [ ] **Step 2: Write the Firebase config files**

`projects/hightower-website/firebase.json`:
```json
{
  "hosting": {
    "public": "dist/browser",
    "cleanUrls": true,
    "trailingSlash": false,
    "ignore": ["firebase.json", "**/.*"],
    "redirects": [
      { "source": "/portfolio/logos", "destination": "/products/logos", "type": 301 }
    ],
    "headers": [
      { "source": "**", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "**/*.@(js|css)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
      { "source": "fonts/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=2592000" }] },
      { "source": "@(images|media)/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=604800" }] }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}
```

Do **not** create `.firebaserc`. The root `.gitignore` ignores it (`.firebaserc`, line 58), and every emulator command in this plan passes `--project demo-hightower` explicitly. The owner links the real project at launch with `firebase use --add` (see the Launch checklist).

`projects/hightower-website/firestore.indexes.json`:
```json
{ "indexes": [], "fieldOverrides": [] }
```

`projects/hightower-website/firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /contactSubmissions/{id} {
      // Topic list must equal the service slugs + 'product' + 'other' (checked by build-content).
      allow create: if request.resource.data.keys().hasOnly(['name','email','company','topic','message','createdAt'])
        && request.resource.data.keys().hasAll(['name','email','topic','message','createdAt'])
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 1 && request.resource.data.name.size() <= 100
        && request.resource.data.name.matches('.*\\S.*')
        && request.resource.data.email is string && request.resource.data.email.size() <= 254
        && request.resource.data.email.matches('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')
        && (!('company' in request.resource.data)
            || (request.resource.data.company is string && request.resource.data.company.size() <= 100))
        && request.resource.data.topic in ['custom-development','consulting','product','other']
        && request.resource.data.message is string
        && request.resource.data.message.size() >= 10 && request.resource.data.message.size() <= 5000
        && request.resource.data.createdAt == request.time;
      allow read, update, delete: if false;
    }
  }
}
```

- [ ] **Step 3: Write the failing rules tests**

`projects/hightower-website/rules-tests/firestore.rules.test.mjs`:
```js
import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hightower',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const db = () => env.unauthenticatedContext().firestore();
const submissions = () => collection(db(), 'contactSubmissions');
const valid = (overrides = {}) => ({
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  topic: 'consulting',
  message: 'I would like to talk about a project.',
  createdAt: serverTimestamp(),
  ...overrides,
});

async function seed() {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'contactSubmissions/existing'), { ...valid(), createdAt: Timestamp.now() }),
  );
  return doc(db(), 'contactSubmissions/existing');
}

test('allows a valid submission', () => assertSucceeds(addDoc(submissions(), valid())));

test('allows a valid submission without company', () => {
  const { company, ...rest } = valid();
  return assertSucceeds(addDoc(submissions(), rest));
});

test('denies reads', async () => assertFails(getDoc(await seed())));
test('denies updates', async () => assertFails(updateDoc(await seed(), { name: 'Changed' })));
test('denies deletes', async () => assertFails(deleteDoc(await seed())));

test('denies an extra field', () => assertFails(addDoc(submissions(), valid({ admin: true }))));

test('denies a missing required field', () => {
  const { message, ...rest } = valid();
  return assertFails(addDoc(submissions(), rest));
});

test('denies an oversized name', () => assertFails(addDoc(submissions(), valid({ name: 'x'.repeat(101) }))));
test('denies an oversized message', () => assertFails(addDoc(submissions(), valid({ message: 'x'.repeat(5001) }))));
test('denies a too-short message', () => assertFails(addDoc(submissions(), valid({ message: 'short' }))));
test('denies a whitespace-only name', () => assertFails(addDoc(submissions(), valid({ name: '   ' }))));
test('denies a bad email', () => assertFails(addDoc(submissions(), valid({ email: 'not-an-email' }))));
test('denies an unknown topic', () => assertFails(addDoc(submissions(), valid({ topic: 'pizza' }))));
test('denies a client-set createdAt', () => assertFails(addDoc(submissions(), valid({ createdAt: Timestamp.now() }))));
test('denies a non-string company', () => assertFails(addDoc(submissions(), valid({ company: 42 }))));
```

Add to `package.json` `"scripts"`:
```json
"test:website:rules": "cd projects/hightower-website && firebase emulators:exec --only firestore --project demo-hightower \"node --test rules-tests/firestore.rules.test.mjs\""
```

- [ ] **Step 4: Run the rules tests**

Run: `npm run test:website:rules`
Expected: PASS (15 tests). If any test fails, the rules in Step 2 are wrong. Fix the rules, never the tests, because the tests encode spec §5.2. The emulator needs Java; Java 21 is installed.

- [ ] **Step 5: Write the failing topic-sync tests**

Append to `projects/hightower-website/scripts/build-content.test.mjs`. First extend the import line at the top of the file to:
```js
import { assertTopicsMatch, expectedTopics, renderMarkdown, rulesTopics, toModule, withHtml } from './build-content.mjs';
```
Then append:
```js
const RULES = "&& request.resource.data.topic in ['custom-development','consulting','product','other']";
const SERVICES = [{ slug: 'consulting', order: 2 }, { slug: 'custom-development', order: 1 }];

test('rulesTopics extracts the topic list from firestore.rules', () => {
  assert.deepEqual(rulesTopics(RULES), ['custom-development', 'consulting', 'product', 'other']);
});

test('rulesTopics throws when the list is missing', () => {
  assert.throws(() => rulesTopics('allow create: if true;'), /could not find the topic list/);
});

test('expectedTopics is service slugs plus product and other', () => {
  assert.deepEqual(expectedTopics(SERVICES), ['consulting', 'custom-development', 'product', 'other']);
});

test('assertTopicsMatch passes when the sets match in any order', () => {
  assert.doesNotThrow(() => assertTopicsMatch(RULES, SERVICES));
});

test('assertTopicsMatch fails when a service is missing from the rules', () => {
  assert.throws(
    () => assertTopicsMatch(RULES, [...SERVICES, { slug: 'training', order: 3 }]),
    /firestore\.rules topics .* do not match/,
  );
});
```

Run: `npm run test:website:scripts`
Expected: FAIL with "does not provide an export named 'assertTopicsMatch'".

- [ ] **Step 6: Implement the topic-sync check**

In `projects/hightower-website/scripts/build-content.mjs`, change the import line to:
```js
import { readFile, writeFile } from 'node:fs/promises';
```
Add these exports above `async function main()`:
```js
export function rulesTopics(rulesText) {
  const match = rulesText.match(/data\.topic in \[([^\]]*)\]/);
  if (!match) throw new Error('build-content: could not find the topic list in firestore.rules');
  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/^'|'$/g, ''))
    .filter(Boolean);
}

export function expectedTopics(services) {
  return [...services.map((s) => s.slug), 'product', 'other'];
}

export function assertTopicsMatch(rulesText, services) {
  const actual = [...rulesTopics(rulesText)].sort();
  const expected = [...expectedTopics(services)].sort();
  if (actual.join(',') !== expected.join(',')) {
    throw new Error(
      `build-content: firestore.rules topics [${actual.join(', ')}] do not match services + product/other [${expected.join(', ')}]`,
    );
  }
}
```
In `main()`, after the `Promise.all` that imports the content, add:
```js
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  assertTopicsMatch(rules, services);
```

- [ ] **Step 7: Run all script tests and content generation**

Run: `npm run test:website:scripts`
Expected: PASS (10 tests).

Run: `npm run content:website`
Expected: succeeds. The rules topics match the two seeded services plus `product` and `other`.

- [ ] **Step 8: Commit**

```bash
git add package.json projects/hightower-website/firebase.json projects/hightower-website/firestore.rules projects/hightower-website/firestore.indexes.json projects/hightower-website/rules-tests/firestore.rules.test.mjs projects/hightower-website/scripts/build-content.mjs projects/hightower-website/scripts/build-content.test.mjs
git commit -m "feat(website): Firebase hosting config, create-only Firestore rules and rules tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Post-build step, build/deploy scripts and hosting verification

**Files:**
- Create: `projects/hightower-website/scripts/postbuild.mjs`
- Modify: `package.json`
- Test: `projects/hightower-website/scripts/postbuild.test.mjs`

**Interfaces:**
- Consumes: `content/site.mts`, `content/projects.mts`, `content/products.mts`, and the build output in `projects/hightower-website/dist/browser`.
- Produces:
  - Exports: `STATIC_ROUTES`, `expectedRoutes(projects, products)`, `forbiddenRoutes(projects)`, `routeFile(route)`, `sitemapXml(siteUrl, routes)`, `robotsTxt(siteUrl)`, `postbuild({ browserDir, site, projects, products })`.
  - npm scripts: `start:website`, `build:website`, `deploy:website`.

- [ ] **Step 1: Write the failing tests**

`projects/hightower-website/scripts/postbuild.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { expectedRoutes, forbiddenRoutes, postbuild, robotsTxt, routeFile, sitemapXml } from './postbuild.mjs';

const PROJECTS = [
  { slug: 'red-sea', kind: 'lab' },
  { slug: 'logos', kind: 'product' },
  { slug: 'kree', kind: 'client' },
];
const PRODUCTS = [{ slug: 'logos' }, { slug: 'lib' }];
const SITE = { siteUrl: 'https://a.dev' };

test('expectedRoutes lists static routes, non-product projects and all products', () => {
  assert.deepEqual(expectedRoutes(PROJECTS, PRODUCTS), [
    '/', '/services', '/portfolio', '/products', '/about', '/contact', '/not-found',
    '/portfolio/red-sea', '/portfolio/kree', '/products/logos', '/products/lib',
  ]);
});

test('forbiddenRoutes lists portfolio pages for product-kind projects', () => {
  assert.deepEqual(forbiddenRoutes(PROJECTS), ['/portfolio/logos']);
});

test('routeFile maps routes to prerendered files', () => {
  assert.equal(routeFile('/'), 'index.html');
  assert.equal(routeFile('/portfolio/red-sea'), 'portfolio/red-sea/index.html');
});

test('sitemapXml excludes /not-found and uses absolute URLs', () => {
  const xml = sitemapXml('https://a.dev/', ['/', '/about', '/not-found']);
  assert.match(xml, /<loc>https:\/\/a\.dev\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/a\.dev\/about<\/loc>/);
  assert.doesNotMatch(xml, /not-found/);
});

test('robotsTxt points at the sitemap', () => {
  assert.equal(robotsTxt('https://a.dev'), 'User-agent: *\nAllow: /\n\nSitemap: https://a.dev/sitemap.xml\n');
});

async function fakeDist(routes) {
  const dir = await mkdtemp(join(tmpdir(), 'hs-postbuild-'));
  for (const route of routes) {
    const file = join(dir, routeFile(route));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `<html>${route}</html>`);
  }
  return dir;
}

test('postbuild writes 404.html, sitemap.xml and robots.txt', async () => {
  const dir = await fakeDist(expectedRoutes(PROJECTS, PRODUCTS));
  await postbuild({ browserDir: dir, site: SITE, projects: PROJECTS, products: PRODUCTS });
  assert.equal(await readFile(join(dir, '404.html'), 'utf8'), '<html>/not-found</html>');
  assert.match(await readFile(join(dir, 'sitemap.xml'), 'utf8'), /products\/lib/);
  await access(join(dir, 'robots.txt'));
});

test('postbuild fails when a page is missing', async () => {
  const dir = await fakeDist(['/']);
  await assert.rejects(
    postbuild({ browserDir: dir, site: SITE, projects: PROJECTS, products: PRODUCTS }),
    /missing prerendered pages: \/services/,
  );
});

test('postbuild fails when a product-kind project got a portfolio page', async () => {
  const dir = await fakeDist([...expectedRoutes(PROJECTS, PRODUCTS), '/portfolio/logos']);
  await assert.rejects(
    postbuild({ browserDir: dir, site: SITE, projects: PROJECTS, products: PRODUCTS }),
    /must not have portfolio pages: \/portfolio\/logos/,
  );
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:website:scripts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `postbuild.mjs`.

- [ ] **Step 3: Implement**

`projects/hightower-website/scripts/postbuild.mjs`:
```js
// Runs after `ng build hightower-website`: asserts every expected page was prerendered,
// copies the not-found page to 404.html, and writes sitemap.xml and robots.txt.
import { access, copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Keep in sync with STATIC_PATHS in src/app/app.routes.server.ts. */
export const STATIC_ROUTES = ['/', '/services', '/portfolio', '/products', '/about', '/contact', '/not-found'];

export function expectedRoutes(projects, products) {
  return [
    ...STATIC_ROUTES,
    ...projects.filter((p) => p.kind !== 'product').map((p) => `/portfolio/${p.slug}`),
    ...products.map((p) => `/products/${p.slug}`),
  ];
}

export function forbiddenRoutes(projects) {
  return projects.filter((p) => p.kind === 'product').map((p) => `/portfolio/${p.slug}`);
}

export function routeFile(route) {
  return route === '/' ? 'index.html' : `${route.slice(1)}/index.html`;
}

export function sitemapXml(siteUrl, routes) {
  const origin = siteUrl.replace(/\/+$/, '');
  const urls = routes
    .filter((r) => r !== '/not-found')
    .map((r) => `  <url><loc>${origin}${r}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(siteUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.replace(/\/+$/, '')}/sitemap.xml\n`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function postbuild({ browserDir, site, projects, products }) {
  const routes = expectedRoutes(projects, products);

  const missing = [];
  for (const route of routes) if (!(await exists(join(browserDir, routeFile(route))))) missing.push(route);
  if (missing.length) throw new Error(`postbuild: missing prerendered pages: ${missing.join(', ')}`);

  const unexpected = [];
  for (const route of forbiddenRoutes(projects)) if (await exists(join(browserDir, routeFile(route)))) unexpected.push(route);
  if (unexpected.length) {
    throw new Error(`postbuild: product projects must not have portfolio pages: ${unexpected.join(', ')}`);
  }

  await copyFile(join(browserDir, routeFile('/not-found')), join(browserDir, '404.html'));
  await writeFile(join(browserDir, 'sitemap.xml'), sitemapXml(site.siteUrl, routes));
  await writeFile(join(browserDir, 'robots.txt'), robotsTxt(site.siteUrl));
  return routes;
}

async function main() {
  const [{ site }, { projects }, { products }] = await Promise.all([
    import('../content/site.mts'),
    import('../content/projects.mts'),
    import('../content/products.mts'),
  ]);
  const browserDir = fileURLToPath(new URL('../dist/browser', import.meta.url));
  const routes = await postbuild({ browserDir, site, projects, products });
  console.log(`postbuild: verified ${routes.length} pages; wrote 404.html, sitemap.xml, robots.txt`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:website:scripts`
Expected: PASS (18 tests).

- [ ] **Step 5: Add the build and deploy scripts, and run the full build**

Add to `package.json` `"scripts"`:
```json
"start:website": "npm run content:website && ng serve hightower-website",
"build:website": "npm run content:website && ng build hightower-website && node projects/hightower-website/scripts/postbuild.mjs",
"deploy:website": "npm run build:website && cd projects/hightower-website && firebase deploy --only hosting,firestore:rules"
```

Run: `npm run build:website`
Expected: it ends with `postbuild: verified 14 pages; wrote 404.html, sitemap.xml, robots.txt`. That's 7 static routes (including `/not-found`), 3 portfolio pages and 4 product pages. `projects/hightower-website/dist/browser/404.html` exists.

- [ ] **Step 6: Verify hosting behaviour in the Hosting emulator**

Start it in the background (Bash):
```bash
cd projects/hightower-website && npx firebase emulators:start --only hosting --project demo-hightower
```
Then, in a separate shell at the worktree root (the last command lists files relative to it), check:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5000/about
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://127.0.0.1:5000/about/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5000/portfolio/red-sea
curl -s -w "\n%{http_code}\n" http://127.0.0.1:5000/portfolio/bogus | tail -1
curl -s http://127.0.0.1:5000/portfolio/bogus | grep -c "Page not found"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://127.0.0.1:5000/portfolio/logos
curl -sI http://127.0.0.1:5000/about | grep -i cache-control
curl -sI http://127.0.0.1:5000/$(ls projects/hightower-website/dist/browser | grep -m1 '^main-.*\.js$') | grep -i cache-control
```
Expected, in order:
1. `200`
2. `301 http://127.0.0.1:5000/about`
3. `200`
4. `404`
5. `1`
6. `301 http://127.0.0.1:5000/products/logos`
7. `cache-control: no-cache`
8. `cache-control: public, max-age=31536000, immutable`

If 7 or 8 show the other value, swap the order of the `**` header block and the asset header blocks in `firebase.json` and re-check. Stop the emulator when done.

- [ ] **Step 7: Manual pre-launch checks (record results in the PR description)**

- `npm run start:website`, then open http://localhost:4200:
  - At 360px width there's no horizontal scroll on Home, Portfolio, a detail page and Contact.
  - Keyboard-only: the skip link works, the drawer opens and closes, and the contact form can be completed.
- With `firebase emulators:start --only firestore --project demo-hightower` running in `projects/hightower-website`, submit the contact form in `ng serve`. A `contactSubmissions` doc appears in the emulator.
- Lighthouse (production build served by the Hosting emulator) on `/` and `/portfolio/red-sea`: 90+ in all categories.
- Add hero video files once supplied (spec §6): place `hero.webm` and `hero.mp4` in `public/media/`, uncomment the two `videoSources` lines in `content/site.mts`, and rebuild. The video then autoplays muted, loops, and the pause button works.

- [ ] **Step 8: Commit**

```bash
git add package.json projects/hightower-website/scripts/postbuild.mjs projects/hightower-website/scripts/postbuild.test.mjs
git commit -m "feat(website): post-build 404/sitemap/robots and build/deploy scripts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Launch checklist (owner, spec §8–§9; not code tasks)

- Create the Firebase project.
  - In `projects/hightower-website`, run `npx firebase use --add`, pick the project and alias it `default`. This writes the gitignored `.firebaserc` that `deploy:website` relies on.
  - Put the web app config and reCAPTCHA v3 site key in `environment.prod.ts`.
- Enable Firestore (production mode).
- Register App Check (reCAPTCHA v3). After the first verified submission, **turn on App Check enforcement for Firestore**.
- Set a billing budget alert.
- If a new product-kind project is added, add its `/portfolio/<slug>` → `/products/<productSlug>` 301 to `redirects` in `projects/hightower-website/firebase.json`.
- Connect the custom domain, and set `siteUrl` in `content/site.mts`.
- Supply the copy and assets:
  - `[...]` placeholders;
  - `hightower-hero.webp`, `logos.webp` and `og-default.png` in `public/images/`;
  - the hero video;
  - the third service (also add its slug to `firestore.rules`).
- Deploy: `npm run deploy:website`.
