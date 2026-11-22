// Stamps a build id into every page that carries the "Update now" bar and
// writes version.json at the site root. Run at publish time only (the GitHub
// Pages workflow and the Vercel build both call it); the stamped files are
// never committed. In the repo every page keeps data-build="dev", which is
// what switches the bar off in local development.
//
//   node tools/stamp-build.mjs            stamp in place and write version.json
//   node tools/stamp-build.mjs --check    print the ids, change nothing
//
// A page's id is a fingerprint of the code it runs: the .html, .js and .css in
// its own folder, the shared/ folder, and any other local script or stylesheet
// it links. Data files (.json, anything under data/) are left out on purpose,
// so the hourly data refreshes do not put the bar in front of everyone. The
// landing page's id covers every tool, so a tab left open on the landing page
// hears about any release.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'db', 'data', 'api', 'claude', 'tools', '.vercel']);
const CODE = /\.(html|js|mjs|css)$/i;
const TAG = /<script\b[^>]*\bsrc="[^"]*usad-update\.js[^"]*"[^>]*>/i;

const rel = (p) => relative(ROOT, p).split(sep).join('/');

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p, out); }
    else if (CODE.test(name)) out.push(p);
  }
  return out;
}

// Local scripts and stylesheets a page links, wherever they live.
function linked(htmlPath, html) {
  const out = [];
  const re = /<(?:script\b[^>]*\bsrc|link\b[^>]*\bhref)="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1].split(/[?#]/)[0];
    if (/^(?:[a-z]+:)?\/\//i.test(url) || !/\.(js|mjs|css)$/i.test(url)) continue;
    const p = resolve(dirname(htmlPath), url);
    if (!p.startsWith(ROOT + sep) || !existsSync(p)) continue;
    if (rel(p).startsWith('data/')) continue;
    out.push(p);
  }
  return out;
}

function fingerprint(files) {
  const h = createHash('sha256');
  for (const f of [...new Set(files)].sort()) { h.update(rel(f)); h.update('\0'); h.update(readFileSync(f)); h.update('\0'); }
  return h.digest('hex').slice(0, 12);
}

const shared = walk(join(ROOT, 'shared'));
const pages = walk(ROOT).filter((p) => p.endsWith('.html') && TAG.test(readFileSync(p, 'utf8')));
if (!pages.length) { console.error('stamp-build: no page includes usad-update.js'); process.exit(1); }

// Group pages by app key (the data-app on the tag).
const apps = {};
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  const tag = html.match(TAG)[0];
  const key = (tag.match(/\bdata-app="([^"]+)"/) || [])[1];
  if (!key) { console.error('stamp-build: ' + rel(p) + ' has no data-app on its usad-update.js tag'); process.exit(1); }
  if (!/\bdata-build="[^"]*"/.test(tag)) { console.error('stamp-build: ' + rel(p) + ' has no data-build on its usad-update.js tag'); process.exit(1); }
  const top = rel(p).includes('/') ? rel(p).split('/')[0] : '';
  const expect = top || 'landing';
  if (key !== expect) { console.error('stamp-build: ' + rel(p) + ' says data-app="' + key + '", expected "' + expect + '"'); process.exit(1); }
  (apps[key] = apps[key] || { pages: [], files: [...shared] }).pages.push(p);
  apps[key].files.push(p, ...linked(p, html));
  if (top) apps[key].files.push(...walk(join(ROOT, top)));
}

// Ids are worked out from the files as committed, before anything is stamped.
const ids = {};
for (const key of Object.keys(apps).sort()) if (key !== 'landing') ids[key] = fingerprint(apps[key].files);
if (apps.landing) {
  const h = createHash('sha256');
  h.update(fingerprint(apps.landing.files));
  for (const key of Object.keys(ids).sort()) h.update(key + ':' + ids[key] + '\n');
  ids.landing = h.digest('hex').slice(0, 12);
}

const commit = (process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 12);
const version = { build: ids.landing || '', commit, apps: ids };

if (CHECK) { console.log(JSON.stringify(version, null, 2)); process.exit(0); }

for (const key of Object.keys(apps)) {
  for (const p of apps[key].pages) {
    const html = readFileSync(p, 'utf8');
    const out = html.replace(TAG, (t) => t.replace(/\bdata-build="[^"]*"/, 'data-build="' + ids[key] + '"'));
    writeFileSync(p, out);
    console.log('stamped ' + rel(p) + '  ' + key + '  ' + ids[key]);
  }
}
writeFileSync(join(ROOT, 'version.json'), JSON.stringify(version) + '\n');
console.log('version.json written', JSON.stringify(version));
