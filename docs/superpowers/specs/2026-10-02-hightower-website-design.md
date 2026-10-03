# Hightower Software Technologies Website — Design

**Date:** 2026-10-02 (revised 2026-10-03 after adversarial review)
**Status:** Draft for review
**Mockup:** https://claude.ai/artifact/RcExDHcUTBAN9nkuxjRn49 (Home, Red Sea lab page, Contact)

## 1. Goal

A public business site for Hightower Software Technologies. v1 is simple. It presents:

- **Services:** custom development and consulting.
- **Portfolio**, with three kinds of work:
  - **Lab:** Project Red Sea.
  - **Products:** Logos, which Red Sea produced.
  - **Client apps:** Kree House of Beauty and Lala's Anime World.
- **Products and libraries:** Logos, plus the three Angular libraries in this workspace.
- **A contact form.**

The content model must grow to hold more projects and products without code changes beyond adding content entries. It must also allow a later move to editing content in the Firebase console.

### Non-goals (v1)

- Admin UI or CMS.
- Blog.
- Authentication for visitors.
- Analytics beyond what Firebase Hosting provides.
- Email notification of contact submissions (possible later as a Cloud Function).
- Per-visitor rate limiting.
- Bespoke per-project showcase components. A `showcase` field and registry are added only when the first showcase exists.

## 2. Architecture

| Concern | Decision |
|---|---|
| Location | New application `projects/hightower-website` in this workspace. `ht-software` stays the library test bed. |
| Framework | Angular 21: standalone components, `ChangeDetectionStrategy.OnPush`, signals, `inject()`, `input()`/`output()`, `@if`/`@for`, SCSS. |
| UI kit | Angular Material with a custom theme matching the brand tokens (§6). Used for form fields, buttons, the mobile nav drawer and progress indicators. |
| Rendering | `@angular/ssr` with `outputMode: 'static'` on the `@angular/build:application` builder. Every route is prerendered to HTML at build time and then hydrates in the browser. Detail routes get their prerender params from the content repository (`getPrerenderParams`). |
| Hosting | Firebase Hosting on a **new dedicated Firebase project** that the owner creates. Site-specific Firebase CLI files (`firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`) live in `projects/hightower-website/`. The repo-root `firebase.json` is a web SDK config for `agentic-development-78f7e`, not a CLI config, and is left untouched. |
| Firebase access | **Only the contact form talks to Firebase, and only in the browser.** `ContactService` dynamically imports the modular Firebase SDK (`firebase/app`, `firebase/app-check`, `firebase/firestore`; `firebase` 11.x is already installed) on first submit. No Firebase providers are registered in `app.config.ts`, so nothing initializes during prerender. `ht-quick-ngxfire` is **not** used: its providers initialize Firebase eagerly at bootstrap and it has no App Check support. |
| Firebase config | The web app config and the reCAPTCHA v3 site key live in `src/environments/environment.ts` (dev, pointing at the emulator) and `environment.prod.ts` (prod), swapped with `fileReplacements`. These values are public by design. |
| Markdown | Long descriptions are markdown, converted to HTML **at build time** by a small Node script (`scripts/build-content.mjs`, using `marked`) that writes a generated `content.generated.ts`. `marked` never ships to the browser. The script adds `rel="noopener noreferrer"` and `target="_blank"` to external links. HTML is bound with `[innerHTML]` and Angular's default sanitizer. Markdown is owner-authored; if content later moves to Firestore, the same build-time conversion applies. |
| Fonts | Self-hosted WOFF2 files (Cinzel, Jost, Cormorant Garamond italic, IBM Plex Mono), subset to Latin, with `font-display: swap`. No Google Fonts requests. |

### 2.1 Dependencies and workspace setup

All installs run at the **workspace root only**, never inside a `projects/*` folder.

- `ng generate application hightower-website --style=scss --ssr` (or `ng add @angular/ssr --project hightower-website` after generating). Then set `outputMode: 'static'` in `angular.json`.
- `npm i marked` (dev dependency, because it is only used by the build script).
- `npm i -D firebase-tools @firebase/rules-unit-testing` for the emulator and rules tests.
- `@angular/material` is already installed. `firebase` 11.10.0 is already installed.
- The `test` target uses `@angular/build:karma` with Jasmine, like `ht-camera-upload`. It does **not** use the Vitest `unit-test` builder that Angular 21 generates by default.

## 3. Content model

### 3.1 Models (all plain, serializable data)

```ts
type ProjectKind = 'lab' | 'product' | 'client';
type Status = 'live' | 'in-progress' | 'concept';

interface Link  { label: string; url: string; }
interface Image { src: string; alt: string; }

interface Project {
  slug: string;
  kind: ProjectKind;
  name: string;
  tagline: string;
  summary: string;           // one line, for cards
  descriptionHtml: string;   // generated from markdown at build time
  client?: string;           // client name, for kind === 'client'
  status: Status;
  tech: string[];
  links: Link[];
  images: Image[];           // images[0] is the card/hero image
  featured: boolean;         // shown on Home
  producedBy?: string;       // product → slug of the lab project that produced it
  productSlug?: string;      // kind === 'product' → its canonical page under /products
}

interface Product {          // installable/usable offerings (libraries, apps)
  slug: string;
  kind: 'library' | 'app';
  name: string;
  summary: string;
  descriptionHtml: string;   // generated from markdown at build time
  install?: string;          // only set once the package is published to npm
  repoUrl?: string;
  npmUrl?: string;           // only set once published
  docsUrl?: string;
  producedBy?: string;       // slug of the lab project that produced it
  status: Status;
}

interface Service {
  slug: string;              // also used as the contact-form topic value
  name: string;
  summary: string;
  descriptionHtml: string;
  icon: string;              // Material Symbols name
  order: number;
}

interface SiteConfig {
  companyName: string;
  siteUrl: string;           // absolute origin, e.g. "https://hightowersoftware.tech", no trailing slash
  tagline: string;           // "Expert software development & consulting"
  email: string;
  location: string;          // "[CITY, STATE]"
  socials: Link[];
  defaultOgImage: string;    // site-relative path, used when a page has no image
  responseTime: string;      // "[RESPONSE TIME]"
  footerVerse?: { text: string; reference: string };  // Proverbs 18:10
}
```

Source content is authored as TypeScript files with a `description` markdown string. The build script reads them and emits the same objects with `descriptionHtml` in place of `description`. Components only ever see the generated types above.

**Lab → product relationship.** A product records the lab that produced it in `producedBy`. The repository derives the reverse: `producedBy(labSlug)` returns every product whose `producedBy` matches. The Red Sea page lists what it produced; the Logos page shows "Produced in Project Red Sea".

**Logos has one canonical page: `/products/logos`.** Logos also appears in the portfolio as a `Project` (kind `product`, `productSlug: 'logos'`) so it shows under "From the lab" and on the portfolio page. Its card links straight to `/products/logos`. `/portfolio/:slug` is not prerendered for product-kind projects, and if one is visited the resolver redirects to the product page. So there's no duplicate page.

### 3.2 Repository

```ts
abstract class ContentRepository {
  abstract site(): Observable<SiteConfig>;
  abstract projects(filter?: { kind?: ProjectKind; featured?: boolean }): Observable<Project[]>;
  abstract projectBySlug(slug: string): Observable<Project | undefined>;
  abstract services(): Observable<Service[]>;
  abstract products(filter?: { kind?: 'library' | 'app' }): Observable<Product[]>;
  abstract productBySlug(slug: string): Observable<Product | undefined>;
  abstract producedBy(labSlug: string): Observable<Product[]>;
}
```

- The interface is async from day one, so swapping the source later doesn't change any component.
- **Pages get their data from route resolvers**, bound to component inputs with `withComponentInputBinding()`. Components do not subscribe to the repository with `toSignal`. Resolvers hold navigation, and therefore prerender, until the data arrives. That keeps the prerendered HTML complete once the source is asynchronous.
- **v1:** `StaticContentRepository` returns the generated content with `of(...)`. It is provided in `app.config.ts`.
- **Later (not v1):** a Firestore-backed source read by the build script, so content can be edited in the Firebase console and the site rebuilt. The browser never reads content from Firestore.

### 3.3 v1 seed content

All copy marked `[...]` is a placeholder the owner fills in before launch.

| Collection | Entries |
|---|---|
| Projects | `red-sea` (lab, featured) · `logos` (product, `productSlug: 'logos'`, featured) · `kree-house-of-beauty` (client, featured) · `lalas-anime-world` (client, featured) |
| Products | `logos` (app, `producedBy: 'red-sea'`) · `ht-quick-angular-table` · `ht-quick-ngxfire` · `ht-camera-upload` (libraries; descriptions taken from each library's README; `repoUrl` only, with no `install`/`npmUrl` until they are published) |
| Services | `custom-development` · `consulting` · `[third service]` |

## 4. Routes and components

| Route | Component | Notes |
|---|---|---|
| `/` | `HomePage` | Hero, services, "From the lab" (Red Sea → Logos), client work, libraries, CTA band |
| `/services` | `ServicesPage` | All services on one page |
| `/portfolio` | `PortfolioPage` | Grouped by kind: Lab, Products, Client work |
| `/portfolio/:slug` | `ProjectDetailPage` | Lab and client projects only. Markdown body, tech/links sidebar. A lab page has a "Produced in the lab" section that lists `producedBy(slug)` products plus an "In the lab now" placeholder card. |
| `/products` | `ProductsPage` | Apps and libraries |
| `/products/:slug` | `ProductDetailPage` | Markdown body, install snippet (if set), repo/npm/docs links, and "Produced in …" when `producedBy` is set |
| `/about` | `AboutPage` | Company story (placeholder copy) |
| `/contact` | `ContactPage` | Form (§5). Reads an optional `?topic=` query param to preselect the topic. |
| `/not-found` | `NotFoundPage` | Prerendered and copied to `404.html` (§4.1) |
| `**` | `NotFoundPage` | Client-side catch-all |

- Every page is lazy-loaded with `loadComponent`.
- "Start a project" buttons link to `/contact`. Service cards link to `/contact?topic=<service-slug>`.

### 4.1 Prerendering, 404 and URLs

- **`app.routes.server.ts`:**
  - All static routes and `/not-found` use `RenderMode.Prerender`.
  - `portfolio/:slug` uses `RenderMode.Prerender` with `getPrerenderParams` returning lab and client project slugs.
  - `products/:slug` uses `RenderMode.Prerender` with `getPrerenderParams` returning every product slug.
  - `**` uses `RenderMode.Client`.
- **Unknown slugs in the browser:** the detail resolver calls `router.navigate(['/not-found'], { skipLocationChange: true })` and returns `EMPTY`, so the address bar keeps the bad URL and the 404 page renders in place.
- **Hard 404s:** a post-build step copies `projects/hightower-website/dist/browser/not-found/index.html` to `.../browser/404.html`. Firebase Hosting serves that, with HTTP 404, for any path that has no file.
- **`firebase.json` hosting config:**
  - `"public": "dist/browser"`. The app's `outputPath` in `angular.json` is set to `projects/hightower-website/dist` (gitignored), so the public folder sits inside the Firebase project directory.
  - `"trailingSlash": false`
  - `"cleanUrls": true`
  - **No rewrites.** An SPA `** → /index.html` rewrite would stop `404.html` from ever being served.
  - Long cache headers for hashed JS/CSS and fonts; `no-cache` for HTML.
- **Canonical URLs** are `siteUrl` plus the path with no trailing slash (`/` for home), which matches what Hosting serves with `trailingSlash: false`.

### 4.2 Shared components and services

- **`SiteHeader`:** the wordmark plus the gold four-point star mark, nav links, and the "Start a project" button. Below 768px it collapses to a Material sidenav drawer.
- **`SiteFooter`:** wordmark, verse, location and links.
- **`ProjectCard`:** handles all three kinds, with tag colors gold for LAB, violet for PRODUCT and blue for CLIENT. Product-kind cards link to `/products/<productSlug>`.
- **`ProductCard`.**
- **`SectionHeading`:** eyebrow, title, and the gold rule-star-rule divider.
- **`HtmlContentComponent`:** takes the generated `descriptionHtml` as an `input()` and binds it through `[innerHTML]`, with typographic styles for the rendered markdown.
- **`CodeSnippetComponent`:** copied from ht-software, for install commands.
- **`SeoService`:** sets the title, meta description, OpenGraph and Twitter card tags (title, description, absolute image URL, absolute url), and the canonical link, from route data or the resolved content. `/not-found` gets `noindex`.
- **`sitemap.xml` and `robots.txt`:** generated by the post-build step from the same route list the prerender check uses. `robots.txt` points at the sitemap.

## 5. Contact form

### 5.1 Flow

- **Form:** typed reactive form.

  | Field | Rule |
  |---|---|
  | `name` | required, 1–100 characters, not whitespace-only |
  | `email` | required, valid email, ≤254 characters |
  | `company` | optional, ≤100 characters |
  | `topic` | required. One of the service slugs (`custom-development`, `consulting`, and the third service's slug), or `product` or `other`. |
  | `message` | required, 10–5000 characters |
  | `hp_field_x` | honeypot (see below) |

- **Honeypot:**
  - It uses a non-semantic name and id so browsers and password managers don't autofill it.
  - It has `autocomplete="off"`, `tabindex="-1"` and `aria-hidden="true"`, and it is positioned off-screen (not `display: none`).
  - If it has a value, `submit()` resolves as if it succeeded and writes nothing.
  - It is a light filter against naive form-filling bots only. App Check and the rules are the real protection.
- **Submit:**
  - `ContactService.submit()` runs only in the browser. On first call it dynamically imports the Firebase SDK and initializes the app, App Check, and Firestore once, caching the instance.
  - It trims string fields, then adds one document to `contactSubmissions` with the fields above (minus the honeypot; `company` omitted when empty) plus `createdAt: serverTimestamp()`.
  - The write is raced against a **15-second timeout**. On timeout or any error, the form shows the error state.
  - If `navigator.onLine` is false, it fails immediately with an offline message.
- **Prerender:** the contact page prerenders as a static form. Nothing Firebase-related loads until the visitor submits.

### 5.2 Protection

- **App Check with reCAPTCHA v3**, initialized with `initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true })` before Firestore is first used. It runs only in the browser, inside the lazy initialization above.
  - **Enforcement is a Firebase console toggle, not a rule.** The owner turns on App Check enforcement for Firestore after confirming valid tokens arrive (§8).
  - Local development uses the Firestore emulator and an App Check debug token.
  - reCAPTCHA v3 raises the cost of abuse, but it doesn't stop determined headless-browser bots. A billing budget alert is the backstop.
- **Firestore rules:** default deny, plus:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /contactSubmissions/{id} {
      allow create: if request.resource.data.keys().hasOnly(['name','email','company','topic','message','createdAt'])
        && request.resource.data.keys().hasAll(['name','email','topic','message','createdAt'])
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 1 && request.resource.data.name.size() <= 100
        && request.resource.data.name.matches('.*\\S.*')
        && request.resource.data.email is string && request.resource.data.email.size() <= 254
        && request.resource.data.email.matches('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')
        && (!('company' in request.resource.data)
            || (request.resource.data.company is string && request.resource.data.company.size() <= 100))
        && request.resource.data.topic in ['custom-development','consulting','[third-service-slug]','product','other']
        && request.resource.data.message is string
        && request.resource.data.message.size() >= 10 && request.resource.data.message.size() <= 5000
        && request.resource.data.createdAt == request.time;
      allow read, update, delete: if false;
    }
  }
}
```

- The topic list in the rules must match the service slugs plus `product` and `other`. A content-integrity test (§7) checks that.
- The owner reads submissions in the Firebase console.

### 5.3 States

| State | What the visitor sees |
|---|---|
| Idle | The form. |
| Submitting | Button disabled, with a spinner. |
| Success | The form is replaced by a thank-you message that includes the response time. |
| Error | Inline message with the email address as a fallback. A different message is shown when offline. Input is kept so the visitor can retry. |

Field errors show after a field loses focus or on submit, and are linked to their inputs with `aria-describedby`. The status message region uses `aria-live="polite"`.

## 6. Visual design

Brand tokens are taken from the owner's brand images and defined as CSS custom properties.

| Token | Value |
|---|---|
| night (page background) | `#0A1226` |
| deep (alternate bands, footer) | `#070D1C` |
| surface (cards) | `#121C36` |
| line | `#2A3760` |
| ivory (text) | `#EFEBE1` |
| muted | `#A9B1C7` |
| gold (accent) | `#E3B054` |
| pale gold | `#E9D8A6` |
| product violet | border `#A98BF0`, text `#BFA8F5` |
| client blue | border `#7FA8D9`, text `#A8C6EA` |

- **Type** (self-hosted, §2):
  - Cinzel for the wordmark and headings.
  - Jost for body text and spaced-caps labels.
  - Cormorant Garamond italic for the footer verse.
  - IBM Plex Mono for code.
  - The heading and body fonts are preloaded.
- **Hero:** full-bleed tower illustration with `object-position: center 22%`, so the text baked into the image is cropped out. Headline and buttons sit over the sky on the right.
- **Assets:**
  - `hightower-hero.webp`.
  - The Logos image. A text-free, watermark-free version is preferred before launch.
  - `og-default.png` (1200×630) as the default social share image.
- **Layout:**
  - Fluid layouts using flex-wrap and auto-fit grids, with no horizontal scroll at 360px.
  - Visible focus states on everything interactive.
  - Text contrast at WCAG AA or better.
  - A skip-to-content link.

## 7. Testing

The app's `test` target uses `@angular/build:karma` with Jasmine (`ng test hightower-website`).

- **Unit tests:**
  - **`StaticContentRepository`:** filters, slug lookup, and `producedBy` matching.
  - **Content integrity:** fails if any of these are found:
    - a duplicate slug within a collection;
    - a `producedBy` or `productSlug` pointing at a missing entry;
    - an image with empty `alt`;
    - a product-kind project without `productSlug`;
    - a mismatch between the contact topic list and the service slugs plus `product`/`other`.
  - **Build script:** markdown converts to HTML, and external links get `rel`/`target`.
  - **`ContactPage`:** validation (including whitespace-only name), `?topic=` preselection, and every state change, with a mocked `ContactService`.
  - **`ContactService`:** the honeypot short-circuit, trimming, omitting empty `company`, the timeout, and the offline path. The Firebase SDK is mocked behind a small injectable adapter, so tests never import it.
  - **`SeoService`:** title, meta, OpenGraph and canonical tags, with absolute URLs and no trailing slash.
  - **Detail resolvers:** an unknown slug navigates to `/not-found` with `skipLocationChange`; a product-kind project slug redirects to `/products/<productSlug>`.
- **Rules tests:** `@firebase/rules-unit-testing` against the Firestore emulator (`firebase-tools`, needs Java), in their own npm script (`npm run test:rules`) so `ng test` stays emulator-free.
  - A valid create succeeds, with and without `company`.
  - Each of these is denied: a read; an update; a delete; an extra field; a missing required field; an oversized field; a whitespace-only name; a bad email; a bad topic; a client-set `createdAt`.
- **Post-build check** (`scripts/postbuild.mjs`, run after `ng build hightower-website`):
  - It asserts that an `index.html` exists for every static route and every prerendered slug.
  - It asserts that no `/portfolio/<product-kind-slug>` page was emitted.
  - It copies `not-found/index.html` to `404.html`.
  - It writes `sitemap.xml` and `robots.txt`.
- **Manual checks before launch:**
  - Lighthouse at 90 or above in all categories on Home and one detail page.
  - Keyboard-only navigation.
  - A 360px-width pass.
  - A real contact submission in production, with App Check enforced.

### 7.1 Build and deploy

```
npm run build:website   # build-content → ng build hightower-website → postbuild
npm run deploy:website  # firebase deploy --only hosting,firestore:rules (from projects/hightower-website)
```

The site doesn't depend on any workspace library, so no library has to be built first.

## 8. Setup the owner does

- Create the Firebase project.
- Register a web app and provide its config for `environment.prod.ts`.
- Enable Firestore (production mode).
- Register App Check with a reCAPTCHA v3 site key. After the first successful submissions show as verified, **turn on App Check enforcement for Firestore** in the console.
- Set a billing budget alert on the project.
- Connect the custom domain to Hosting, and provide `siteUrl`.

## 9. Open content items (before launch, not blocking build)

- Copy:
  - Red Sea tagline, description and image.
  - Logos description and status.
  - Kree House of Beauty and Lala's Anime World: descriptions, screenshots, status and links.
  - Third service, including its slug.
  - About page copy.
- Contact details:
  - Response-time promise.
  - Contact email.
  - City/state.
  - Social links.
- Domain (`siteUrl`).
- Default social share image.
- Whether and when the libraries are published to npm (enables install snippets).
- Confirm whether the Proverbs 18:10 footer verse stays.
