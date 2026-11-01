#!/usr/bin/env node
/* =====================================================================
   methodica-ar-science-body-matter-01 — asset contract (guide §15.2 / §15.4 step 6)
   Adapted from methodica-math-proportion-01 _test/verify-assets.js for the
   science layout (each part keeps its own assets/, styles.css and script.js;
   only byte-identical files live in unit-assets/).

   Static, no dependencies:   node _test/verify-assets.js
   Exit code 1 on any failure.

   1. every src/href/poster in every part's index.html, index_dev.html and the
      applet's index.html resolves, CASE-EXACT (fs.existsSync is case-insensitive
      on Windows; the CDN is not)
   2. every CSS url() — in *.css and in <style> blocks — resolves from the
      STYLESHEET's (document's) own folder
   3. every asset path written in a part's script.js (and later unit-js/) resolves
      from that part; the two runtime-built families are expanded
   4. ?v= on every code reference (styles.css, script.js, the applet iframe,
      unit-js/*, unit-css/*), one value per file across all parts
   5. nothing hoisted grew back: no part file is byte-identical to a unit-assets/
      file, and no two parts hold byte-identical assets
   6. every path under the parts and unit-assets/ is ASCII, lower-case, space-free
   7. no reference names a folder (the MOE CDN serves a folder URL as 0 bytes)
   8. every file in unit-assets/ is referenced by at least one part; every file in a
      part's assets/ is referenced by its own part
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const UNIT = 'methodica-ar-science-body-matter-01';
const PARTS = [1, 2, 3, 4, 5, 6, 7].map(n => `${UNIT}-0${n}`);
const APPLET = `${UNIT}-05/applet-bottles-lab`;

/* Runtime-built names. script.js (every part) writes
   'assets/images/gesture-ring-big' + suffix + '.svg' with suffix '' | '-drag' (hoisted);
   the applet writes "images/" + key + ".png" for the keys of BOTTLE_PX. */
const FAMILIES = {
  "../unit-assets/img/gesture-ring-big' + suffix + '.svg": ['', '-drag'].map(s => `../unit-assets/img/gesture-ring-big${s}.svg`),
  "../unit-assets/img/gesture-ring-small' + suffix + '.svg": ['', '-drag'].map(s => `../unit-assets/img/gesture-ring-small${s}.svg`),
};
const APPLET_KEYS = ['glass_clean', 'glass_water', 'plastic_clean', 'plastic_water', 'plastic_scratched', 'metal_clean'];

let fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log('  FAIL ' + msg); } }
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const isDir = p => exists(p) && fs.statSync(path.join(ROOT, p)).isDirectory();

/* case-exact: every segment must appear verbatim in its parent's listing */
function resolveExact(rel) {
  const segs = path.normalize(rel).split(path.sep).filter(Boolean);
  if (segs[0] === '..') return false;             // escaped the unit root
  let dir = ROOT;
  for (const s of segs) {
    let names;
    try { names = fs.readdirSync(dir); } catch (e) { return false; }
    if (!names.includes(s)) return false;
    dir = path.join(dir, s);
  }
  return true;
}
const local = u => !/^(https?:|data:|#|mailto:|javascript:|about:|blob:)/.test(u) && u.trim() !== '';
const strip = u => u.split('#')[0].split('?')[0];
const fromDir = (dir, u) => path.posix.normalize(`${dir}/${strip(u)}`);
const walk = (d, out = []) => {
  for (const n of fs.readdirSync(path.join(ROOT, d))) {
    if (n === '.git' || n === 'node_modules' || n === '_test' || n === 'docs-and-tools' || n === 'metadata') continue;
    const p = d ? `${d}/${n}` : n;
    if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const ASSET_EXT = /\.(png|jpe?g|gif|svg|mp4|webm|woff2?)$/i;
const CODE_EXT = /\.(js|css)(\?|$)/;   // documents (index.html, the applet) are not cache-busted; code is
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');

const versions = {};          // basename → Set of ?v= values
const referenced = new Set(); // every resolved local asset path (unit-relative, posix)
function noteRef(resolved) { referenced.add(resolved); }
function checkCodeVersion(where, u) {
  if (!CODE_EXT.test(u)) return;
  const v = (u.match(/[?&]v=([^&#]+)/) || [])[1];
  ok(!!v, `${where}: no ?v= on ${u}`);
  const key = path.posix.basename(strip(u));
  (versions[key] = versions[key] || new Set()).add(v || '(none)');
}

/* 1 + 4 + 7 — HTML references */
console.log('HTML references');
const htmlFiles = [];
for (const part of PARTS) for (const f of ['index.html', 'index_dev.html']) if (exists(`${part}/${f}`)) htmlFiles.push(`${part}/${f}`);
htmlFiles.push(`${APPLET}/index.html`);
for (const html of htmlFiles) {
  const dir = path.posix.dirname(html);
  const src = read(html).replace(/<!--[\s\S]*?-->/g, '');   // prose in comments is not a reference
  for (const m of src.matchAll(/\b(?:src|href|poster|xlink:href)\s*=\s*"([^"]+)"/g)) {
    const u = m[1];
    if (!local(u)) continue;
    ok(!/\/(\?|#|$)/.test(u), `${html} → ${u} names a folder, not a file`);
    const r = fromDir(dir, u);
    ok(resolveExact(r), `${html} → ${u}`);
    noteRef(r);
    checkCodeVersion(html, u);
  }
  /* <style> blocks resolve like the document */
  for (const s of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const m of s[1].matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
      if (!local(m[2])) continue;
      const r = fromDir(dir, m[2]);
      ok(resolveExact(r), `${html} <style> → ${m[2]}`); noteRef(r);
    }
  }
}

/* 2 — CSS url() from the stylesheet's own folder */
console.log('CSS url()');
for (const css of walk('').filter(p => p.endsWith('.css'))) {
  const dir = path.posix.dirname(css);
  for (const m of read(css).matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    if (!local(m[2])) continue;
    const r = fromDir(dir, m[2]);
    ok(resolveExact(r), `${css} → ${m[2]}`); noteRef(r);
  }
}

/* 3 — asset paths written in JS resolve from the document that loads the script */
console.log('JS asset paths');
const ASSET_RE = /(?:\.\.\/)*(?:unit-assets|assets|images|videos)\/[A-Za-z0-9_.\/'+ -]*?\.(?:png|jpe?g|gif|svg|mp4|webm|woff2?)/g;
let jsRefs = 0;
const jsSources = [];
for (const part of PARTS) jsSources.push([part, `${part}/script.js`]);
if (isDir('unit-js')) for (const f of fs.readdirSync(path.join(ROOT, 'unit-js'))) if (f.endsWith('.js')) for (const part of PARTS) jsSources.push([part, `unit-js/${f}`]);
jsSources.push([APPLET, `${APPLET}/index.html`]);
for (const [dir, file] of jsSources) {
  const src = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const u of src.match(ASSET_RE) || []) {
    jsRefs++;
    let list = FAMILIES[u];
    if (!list && u.includes("' +")) { ok(false, `${file} → ${u}: an unknown runtime-built name`); continue; }
    if (!list) list = [u];
    if (file.startsWith('unit-js/')) ok(u.startsWith('../unit-assets/'), `${file} → ${u}: shared code may only reference ../unit-assets/`);
    for (const one of list) { const r = fromDir(dir, one); ok(resolveExact(r), `${file} → ${one} (from ${dir})`); noteRef(r); }
  }
  if (file.startsWith(APPLET)) for (const k of APPLET_KEYS) { const r = `${APPLET}/images/${k}.png`; ok(resolveExact(r), `applet runtime image ${k}.png`); noteRef(r); }
}
ok(jsRefs >= 40, `reference floor: ${jsRefs} asset paths found in JS (expected ≥ 40)`);

/* 4 — one ?v= per code file across all parts */
console.log('?v= consistency');
for (const [name, vs] of Object.entries(versions)) ok(vs.size === 1, `one ?v= for ${name} across all parts (found: ${[...vs].join(', ')})`);

/* 5 — nothing hoisted grew back, no cross-part duplicates */
console.log('no stale copies');
const allFiles = walk('');
const hoistedHashes = new Map();
if (isDir('unit-assets')) for (const f of allFiles.filter(p => p.startsWith('unit-assets/'))) hoistedHashes.set(md5(f), f);
const partAssetHashes = new Map();
for (const f of allFiles.filter(p => PARTS.some(part => p.startsWith(part + '/')) && ASSET_EXT.test(p))) {
  const h = md5(f);
  ok(!hoistedHashes.has(h), `${f} is byte-identical to ${hoistedHashes.get(h)} — a hoisted file grew back`);
  const prev = partAssetHashes.get(h);
  ok(!prev || prev.split('/')[0] === f.split('/')[0], `${f} is byte-identical to ${prev} — hoist it to unit-assets/`);
  if (!prev) partAssetHashes.set(h, f);
}

/* 6 — path hygiene (ASCII, lower-case, no spaces) */
console.log('path hygiene');
for (const f of allFiles) {
  if (!(PARTS.some(part => f.startsWith(part + '/')) || f.startsWith('unit-'))) continue;
  ok(/^[\x21-\x7e]+$/.test(f) && !/[A-Z]/.test(f) && !f.includes(' ') && !f.includes("'"), `${f}: path must be ASCII, lower-case, no spaces`);
}

/* 8 — orphans: every asset is referenced */
console.log('orphans');
for (const f of allFiles.filter(p => ASSET_EXT.test(p) && (p.startsWith('unit-assets/') || PARTS.some(part => p.startsWith(part + '/'))))) {
  ok(referenced.has(f), `${f} is referenced by nothing`);
}

console.log(`\n${checks - fails}/${checks} checks passed` + (fails ? ` — ${fails} FAILED` : ''));
process.exit(fails ? 1 : 0);
