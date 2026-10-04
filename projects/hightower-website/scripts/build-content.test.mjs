import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertTopicsMatch, expectedTopics, renderMarkdown, rulesTopics, toModule, withHtml } from './build-content.mjs';

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
