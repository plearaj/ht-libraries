// Runs after `ng build hightower-website`: asserts every expected page was prerendered,
// copies the not-found page to 404.html, and writes sitemap.xml and robots.txt.
import { access, copyFile, readFile, writeFile } from 'node:fs/promises';
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

/** Product-kind projects have no portfolio page; firebase.json must 301 them to /products/<productSlug>. */
export function missingRedirects(projects, redirects) {
  return projects
    .filter((p) => p.kind === 'product')
    .filter(
      (p) =>
        !redirects.some(
          (r) => r.source === `/portfolio/${p.slug}` && r.destination === `/products/${p.productSlug}` && r.type === 301,
        ),
    )
    .map((p) => `/portfolio/${p.slug}`);
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

export async function postbuild({ browserDir, site, projects, products, redirects }) {
  const routes = expectedRoutes(projects, products);

  const unredirected = missingRedirects(projects, redirects);
  if (unredirected.length) {
    throw new Error(`postbuild: firebase.json is missing 301 redirects for: ${unredirected.join(', ')}`);
  }

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
  const firebaseJson = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));
  const redirects = firebaseJson.hosting.redirects ?? [];
  const routes = await postbuild({ browserDir, site, projects, products, redirects });
  console.log(`postbuild: verified ${routes.length} pages; wrote 404.html, sitemap.xml, robots.txt`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
