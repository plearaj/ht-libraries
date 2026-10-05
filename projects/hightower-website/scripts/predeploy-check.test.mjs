import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { environmentProblems, missingAssets, placeholderProblems, predeployCheck, referencedAssets } from './predeploy-check.mjs';

const SITE = {
  siteUrl: 'https://hightower.dev',
  email: 'hi@hightower.dev',
  defaultOgImage: '/images/og.png',
  hero: { poster: { src: '/images/hero.webp' }, videoSources: [{ src: '/media/hero.mp4' }] },
};
const PROJECTS = [{ images: [{ src: '/images/a.webp' }, { src: '/images/og.png' }] }, { images: [] }];

test('placeholderProblems flags example.com in siteUrl and email', () => {
  assert.deepEqual(placeholderProblems(SITE), []);
  assert.equal(placeholderProblems({ ...SITE, siteUrl: 'https://example.com' }).length, 1);
  assert.equal(placeholderProblems({ siteUrl: 'https://example.com', email: 'a@example.com' }).length, 2);
});

test('environmentProblems flags REPLACE_WITH_ markers', () => {
  assert.deepEqual(environmentProblems("apiKey: 'abc'"), []);
  assert.equal(environmentProblems("apiKey: 'REPLACE_WITH_KEY'").length, 1);
});

test('referencedAssets collects og, hero poster, video and project images without duplicates', () => {
  assert.deepEqual(referencedAssets(SITE, PROJECTS), [
    '/images/og.png', '/images/hero.webp', '/media/hero.mp4', '/images/a.webp',
  ]);
});

test('missingAssets returns paths absent from the existing set', () => {
  assert.deepEqual(missingAssets(['/a', '/b'], new Set(['/a'])), ['/b']);
});

test('predeployCheck lists every problem, and is empty when all is well', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'predeploy-'));
  await mkdir(join(dir, 'images'));
  await mkdir(join(dir, 'media'));
  for (const f of ['images/og.png', 'images/hero.webp', 'media/hero.mp4', 'images/a.webp']) await writeFile(join(dir, f), 'x');
  assert.deepEqual(await predeployCheck({ publicDir: dir, site: SITE, projects: PROJECTS, environmentText: '' }), []);

  const problems = await predeployCheck({
    publicDir: join(dir, 'images'),
    site: { ...SITE, email: 'a@example.com' },
    projects: PROJECTS,
    environmentText: 'REPLACE_WITH_X',
  });
  assert.equal(problems.length, 2 + 4);
});
