# Hightower Software Technologies Website — Design

**Date:** 2026-10-02
**Status:** Draft for review
**Mockup:** https://claude.ai/artifact/RcExDHcUTBAN9nkuxjRn49 (Home, Red Sea lab page, Contact)

## 1. Goal

A public business site for Hightower Software Technologies. v1 is simple. It presents:

- **Services:** custom development and consulting.
- **Portfolio**, with three kinds of work:
  - **Lab:** Project Red Sea.
  - **Products:** Logos, which Red Sea produced.
  - **Client apps:** Kree House of Beauty and Lala's Anime World.
- **Products and libraries:** Logos, plus the three open-source Angular libraries in this workspace.
- **A contact form.**

The content model must grow to hold more projects and products without code changes beyond adding content entries. It must also allow a later move to editing content in the Firebase console.

### Non-goals (v1)

- Admin UI or CMS.
- Blog.
- Authentication for visitors.
- Analytics beyond what Firebase Hosting provides.
- Email notification of contact submissions (possible later as a Cloud Function).
- Per-visitor rate limiting.

## 2. Architecture

| Concern | Decision |
|---|---|
| Location | New application `projects/hightower-website` in this workspace. `ht-software` stays the library test bed. |
| Framework | Angular 21: standalone components, `ChangeDetectionStrategy.OnPush`, signals, `inject()`, `input()`/`output()`, `@if`/`@for`, SCSS. |
| UI kit | Angular Material with a custom theme matching the brand tokens (§6). Used for form fields, buttons, the mobile nav drawer and progress indicators. |
| Rendering | `@angular/ssr` with `outputMode: 'static'`. Every route is prerendered to HTML at build time and then hydrates in the browser. Detail routes get their prerender params from the content repository (`getPrerenderParams`). |
| Hosting | Firebase Hosting on a **new dedicated Firebase project** that the owner creates. The site gets its own hosting target in `firebase.json`, separate from the existing `agentic-development-78f7e` config. |
| Firebase access | Through `ht-quick-ngxfire`, used in the browser only. Nothing touches Firebase during prerender. |
| Markdown | Long descriptions are markdown, rendered with `marked` at prerender time. All markdown is authored by the owner, so no sanitizer beyond Angular's default `[innerHTML]` sanitization is needed. |

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
  description: string;       // markdown
  client?: string;           // client name, for kind === 'client'
  status: Status;
  tech: string[];
  links: Link[];
  images: Image[];           // images[0] is the card/hero image
  featured: boolean;         // shown on Home
  producedBy?: string;       // product → slug of the lab project that produced it
  showcase?: string;         // key into SHOWCASE_REGISTRY (escape hatch)
}

interface Product {          // installable/usable offerings (libraries, apps)
  slug: string;
  kind: 'library' | 'app';
  name: string;
  summary: string;
  description: string;       // markdown
  install?: string;          // e.g. "npm i ht-quick-angular-table"
  repoUrl?: string;
  npmUrl?: string;
  docsUrl?: string;
  projectSlug?: string;      // link to the matching portfolio Project (e.g. Logos)
  status: Status;
}

interface Service {
  slug: string;
  name: string;
  summary: string;
  description: string;       // markdown
  icon: string;              // Material Symbols name
  order: number;
}

interface SiteConfig {
  companyName: string;
  tagline: string;           // "Expert software development & consulting"
  email: string;
  location: string;          // "[CITY, STATE]"
  socials: Link[];
  footerVerse?: { text: string; reference: string };  // Proverbs 18:10
}
```

**Lab → product relationship.** A product project stores the lab that produced it in `producedBy`. The repository works out the reverse direction: `productsOf(labSlug)` returns every project whose `producedBy` matches. So the Red Sea page lists what it produced, and the Logos page shows "Produced in Project Red Sea".

### 3.2 Repository

```ts
abstract class ContentRepository {
  abstract site(): Observable<SiteConfig>;
  abstract projects(filter?: { kind?: ProjectKind; featured?: boolean }): Observable<Project[]>;
  abstract projectBySlug(slug: string): Observable<Project | undefined>;
  abstract productsOf(labSlug: string): Observable<Project[]>;
  abstract services(): Observable<Service[]>;
  abstract products(): Observable<Product[]>;
  abstract productBySlug(slug: string): Observable<Product | undefined>;
}
```

- The interface is async from day one, so swapping the source later doesn't change any component. Components read it with `toSignal` (or route resolvers).
- **v1:** `StaticContentRepository` reads typed TypeScript content files under `src/app/content/`, one file per collection. It is provided in `app.config.ts`.
- **Later (not v1):** a `FirestoreContentRepository` that reads Firestore at build time for prerendering, so content can be edited in the Firebase console. A redeploy or publish trigger refreshes the site. The models are already serializable, so this is a provider swap.

### 3.3 Showcase escape hatch

`SHOWCASE_REGISTRY: Record<string, () => Promise<Type<unknown>>>` maps a key to a lazily imported, bespoke component. The project detail page renders the standard markdown layout, then:

- If `project.showcase` is set, it loads that component with `@defer` or `NgComponentOutlet` after a dynamic import.
- If the component fails to load, the page keeps the standard layout and logs to the console.

### 3.4 v1 seed content

All copy marked `[...]` is a placeholder the owner fills in before launch.

| Collection | Entries |
|---|---|
| Projects | `red-sea` (lab, featured) · `logos` (product, `producedBy: 'red-sea'`, featured) · `kree-house-of-beauty` (client, featured) · `lalas-anime-world` (client, featured) |
| Products | `logos` (app, `projectSlug: 'logos'`) · `ht-quick-angular-table` · `ht-quick-ngxfire` · `ht-camera-upload` (libraries; descriptions taken from each library's README) |
| Services | `custom-development` · `consulting` · `[third service]` |

## 4. Routes and components

| Route | Component | Notes |
|---|---|---|
| `/` | `HomePage` | Hero, services, "From the lab" (Red Sea → Logos), client work, open libraries, CTA band |
| `/services` | `ServicesPage` | All services on one page |
| `/portfolio` | `PortfolioPage` | Grouped by kind: Lab, Products, Client work |
| `/portfolio/:slug` | `ProjectDetailPage` | Markdown body, tech/links sidebar. A lab shows "Produced in the lab"; a product shows "Produced in …". Optional showcase. |
| `/products` | `ProductsPage` | Apps and libraries |
| `/products/:slug` | `ProductDetailPage` | Markdown body, install snippet, repo/npm/docs links |
| `/about` | `AboutPage` | Company story (placeholder copy) |
| `/contact` | `ContactPage` | Form (§5) |
| `/not-found` | `NotFoundPage` | Prerendered; resolvers redirect unknown slugs here. Firebase Hosting serves it as `404.html`. |
| `**` | `NotFoundPage` | Client-side catch-all |

- Every page is lazy-loaded with `loadComponent`.
- Detail routes use a resolver. If the slug is unknown, the resolver redirects to the 404 page (`router.parseUrl('/not-found')`), and `/not-found` is itself prerendered.
- **Shared components:**
  - **`SiteHeader`:** the wordmark plus the gold four-point star mark, nav links and the "Start a project" button. Below 768px it collapses to a Material sidenav drawer.
  - **`SiteFooter`:** wordmark, verse, location and links.
  - **`ProjectCard`:** handles all three kinds, with tag colors gold for LAB, violet for PRODUCT and blue for CLIENT.
  - **`ProductCard`.**
  - **`SectionHeading`:** eyebrow, title, and the gold rule-star-rule divider.
  - **`MarkdownComponent`:** takes `input()` markdown, renders it with `marked`, and binds the result through `[innerHTML]`.
  - **`CodeSnippetComponent`:** copied from ht-software, for install commands.
- **`SeoService`:** sets the title, meta description, OpenGraph tags (title, description, image, url) and the canonical link per route, from route data or the resolved content.

## 5. Contact form

### 5.1 Flow

- **Form:** typed reactive form.

  | Field | Rule |
  |---|---|
  | `name` | required, 1–100 characters |
  | `email` | required, valid email, ≤254 characters |
  | `company` | optional, ≤100 characters |
  | `topic` | required, one of `custom-build`, `consulting`, `product`, `other` |
  | `message` | required, 10–5000 characters |
  | `website` | hidden honeypot |

- **Submit:**
  - `ContactService.submit()` adds one document to `contactSubmissions` through ht-quick-ngxfire.
  - The document holds the fields above (minus the honeypot) plus `createdAt: serverTimestamp()`.
  - If the honeypot has a value, the method resolves successfully without writing anything.
- **Browser only:** Firebase and App Check start only in the browser, using `afterNextRender` or an `isPlatformBrowser` guard. The prerendered contact page is static until it hydrates.

### 5.2 Protection

- **App Check with reCAPTCHA v3**, enforced on Firestore. Local development uses an App Check debug token.
- **Firestore rules:** default deny, plus:

```
match /contactSubmissions/{id} {
  allow create: if request.resource.data.keys().hasOnly(['name','email','company','topic','message','createdAt'])
    && request.resource.data.keys().hasAll(['name','email','topic','message','createdAt'])
    && request.resource.data.name is string && request.resource.data.name.size() >= 1 && request.resource.data.name.size() <= 100
    && request.resource.data.email is string && request.resource.data.email.size() <= 254
    && request.resource.data.email.matches('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')
    && (!('company' in request.resource.data) || (request.resource.data.company is string && request.resource.data.company.size() <= 100))
    && request.resource.data.topic in ['custom-build','consulting','product','other']
    && request.resource.data.message is string && request.resource.data.message.size() >= 10 && request.resource.data.message.size() <= 5000
    && request.resource.data.createdAt == request.time;
  allow read, update, delete: if false;
}
```

- The owner reads submissions in the Firebase console.

### 5.3 States

| State | What the visitor sees |
|---|---|
| Idle | The form. |
| Submitting | Button disabled, with a spinner. |
| Success | The form is replaced by a thank-you message. |
| Error | Inline message with the email address as a fallback. Input is kept so the visitor can retry. |

Field errors show after a field loses focus or on submit, and are linked to their inputs with `aria-describedby`.

## 6. Visual design

Brand tokens are taken from the owner's brand images and defined as SCSS/CSS custom properties.

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

- **Type:**
  - Cinzel for the wordmark and headings.
  - Jost for body text and spaced-caps labels.
  - Cormorant Garamond italic for the footer verse.
  - IBM Plex Mono for code.
  - All self-hosted, or Google Fonts with `display=swap`.
- **Hero:** full-bleed tower illustration with `object-position: center 22%`, so the text baked into the image is cropped out. Headline and buttons sit over the sky on the right.
- **Assets:**
  - `hightower-hero.webp`.
  - The Logos image. A text-free, watermark-free version is preferred before launch.
- **Layout:**
  - Fluid layouts using flex-wrap and auto-fit grids, with no horizontal scroll at 360px.
  - Visible focus states on everything interactive.
  - Text contrast at WCAG AA or better.

## 7. Testing

The workspace runner is Karma + Jasmine (`ng test`).

- **Unit tests:**
  - **`StaticContentRepository`:** filters, slug lookup, and `productsOf` matching `producedBy`.
  - **Content integrity:** fails if any of these are found:
    - a duplicate slug within a collection;
    - a `producedBy` or `projectSlug` pointing at a missing entry;
    - an image with empty `alt`;
    - a `showcase` key missing from `SHOWCASE_REGISTRY`.
  - **`ContactPage`:** validation and every state change, with a mocked `ContactService`.
  - **`ContactService`:** the honeypot short-circuit.
  - **`SeoService`:** title, meta, OpenGraph and canonical tags.
  - **Detail resolvers:** an unknown slug redirects to `/not-found`.
- **Rules tests:** `@firebase/rules-unit-testing` against the Firestore emulator, in their own npm script so `ng test` stays emulator-free.
  - A valid create succeeds.
  - Each of these is denied: a read; an extra field; an oversized field; a bad topic; a client-set `createdAt`.
- **Prerender check:** a script run after `ng build` asserts that an `index.html` exists for every static route and every content slug.
- **Manual checks before launch:**
  - Lighthouse at 90 or above in all categories on Home and one detail page.
  - Keyboard-only navigation.
  - A 360px-width pass.

## 8. Setup the owner does

- Create the Firebase project.
- Register a web app and provide its config.
- Enable Firestore.
- Register App Check with a reCAPTCHA v3 site key.
- Connect the custom domain to Hosting.

## 9. Open content items (before launch, not blocking build)

- Copy:
  - Red Sea tagline, description and image.
  - Logos description and status.
  - Kree House of Beauty and Lala's Anime World: descriptions, screenshots, status and links.
  - Third service.
  - About page copy.
- Contact details:
  - Response-time promise.
  - Contact email.
  - City/state.
  - Social links.
- Confirm whether the Proverbs 18:10 footer verse stays.
