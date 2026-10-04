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
