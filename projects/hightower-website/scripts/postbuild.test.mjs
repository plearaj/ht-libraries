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
