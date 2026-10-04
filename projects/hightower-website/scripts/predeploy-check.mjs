// Run before `firebase deploy` (see `deploy:website`): fails if launch placeholders are still in the
// site config or production environment, or if content references an image missing from public/.
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function placeholderProblems(site) {
  const problems = [];
  if (site.siteUrl.includes('example.com')) problems.push(`site.siteUrl is still a placeholder (${site.siteUrl})`);
  if (site.email.includes('example.com')) problems.push(`site.email is still a placeholder (${site.email})`);
  return problems;
}

export function environmentProblems(environmentText) {
  return environmentText.includes('REPLACE_WITH_')
    ? ['src/environments/environment.prod.ts still contains REPLACE_WITH_ placeholders']
    : [];
}

/** Site-relative asset paths referenced by content, de-duplicated. */
export function referencedAssets(site, projects) {
  const paths = [
    site.defaultOgImage,
    site.hero.poster.src,
    ...site.hero.videoSources.map((v) => v.src),
    ...projects.flatMap((p) => p.images.map((i) => i.src)),
  ];
  return [...new Set(paths.filter((p) => p.startsWith('/')))];
}

export function missingAssets(paths, existing) {
  return paths.filter((p) => !existing.has(p));
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function predeployCheck({ publicDir, site, projects, environmentText }) {
  const assets = referencedAssets(site, projects);
  const existing = new Set();
  for (const asset of assets) if (await exists(join(publicDir, asset))) existing.add(asset);
  return [
    ...placeholderProblems(site),
    ...environmentProblems(environmentText),
    ...missingAssets(assets, existing).map((p) => `public/${p.slice(1)} is referenced by content but missing`),
  ];
}

async function main() {
  const [{ site }, { projects }] = await Promise.all([import('../content/site.mts'), import('../content/projects.mts')]);
  const environmentText = await readFile(new URL('../src/environments/environment.prod.ts', import.meta.url), 'utf8');
  const publicDir = fileURLToPath(new URL('../public', import.meta.url));
  const problems = await predeployCheck({ publicDir, site, projects, environmentText });
  if (problems.length) {
    console.error(`predeploy-check: ${problems.length} problem(s) to fix before deploying:`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log('predeploy-check: ok');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
