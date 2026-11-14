/* No write before the restore, and the leave save through xapi-720-l.js
   (Documentation/reporting-and-resume/BOOT-AND-RESUME-HARDENING-2026-11-03.md §2.1–2.3, §2.6, §2.10;
   KNOWN-ISSUE-drain-overwrites-payload.md). Ported 2026-11-14 from methodica-science-mass-liquid-02 (from methodica-science-volume-solid-01
   _test/write-guard.js , mass-measure-03 acc2990) to this unit's layout.

   a–j  behaviour: a document saved on screen 2 → a character pick and navigation before Phase B write
        nothing; the drain writes the document as read; the restore lands on 2; the debounced document
        (held by reference) is still on 2; markSent before Phase B marks in memory only; a failed read
        (not a 404) closes every write until a read succeeds; a 404 is a fresh document.
   k–l  source shape of 40-resume.js / 50-loader.js.
   m–p  every part: the cover net raises __resumeInFlight itself (and only with a registration), the
        preload equals the loader's letter, preconnect to Kata, every raster image off the landing
        screen is lazy, no hidden autoplay clip carries an inline src.
   s–t  the leave save: its shape, and flushResumeSaveOnLeave through saveState720OnLeave on -l and
        through saveState720 on -k (without the function — the rollback path).
   The first check of each group fails on the code before 2026-11-14 (pass the previous package as baseDir).
     NODE_PATH=/tmp/lomda-test/node_modules node _test/write-guard.js [baseDir]
*/
'use strict';
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || path.join(__dirname, '..');
const UNIT_SLUG = 'methodica-ar-science-body-matter-01';
const PARTS = ['01', '02', '03', '04', '05', '06', '07'];
const CDN = 'https://lomdot.education.gov.il/metodica/720active/common/';

let JSDOM = null, VirtualConsole = null;
try { ({ JSDOM, VirtualConsole } = require('jsdom')); } catch (e) { console.log('SKIPPED - jsdom not resolvable.'); process.exit(0); }

const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p).replace(/^﻿/, ''));
let pass = 0;
const failures = [];
function ok(scope, name, cond, detail) {
  if (cond) { pass++; return; }
  failures.push('  [' + scope + '] ' + name + (detail ? '\n      -> ' + detail : ''));
}

/* boot one part without 50-loader / 90-boot, with an in-memory state store behind loadState720 /
   saveState720 / saveState720Debounced (the debounced stub keeps the document by reference, as the
   library does) */
function boot(c) {
  const dir = path.join(BASE, UNIT_SLUG + '-' + c);
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/Not implemented/.test(e.message)) errors.push(e.message); });
  const dom = new JSDOM(read(path.join(dir, 'index.html')), {
    url: 'http://localhost:8777/' + UNIT_SLUG + '-' + c + '/index.html',
    runScripts: 'dangerously',
    virtualConsole: vc,
    beforeParse(w) {
      w.fetch = () => new Promise(() => {});
      w.HTMLMediaElement.prototype.play = () => Promise.resolve();
      w.HTMLMediaElement.prototype.load = () => {};
      w.requestAnimationFrame = (cb) => { cb(0); return 0; };
      w.cancelAnimationFrame = () => {};
      w.Element.prototype.animate = function () { return { finished: Promise.resolve(), cancel() {}, finish() {}, pause() {}, play() {}, addEventListener() {}, onfinish: null, currentTime: 0 }; };
      w.Element.prototype.getAnimations = () => [];
      w.YT = { PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 }, Player: function () { this.playVideo = () => {}; this.pauseVideo = () => {}; this.getCurrentTime = () => 0; } };
      const zeroRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() { return this; } });
      w.Range.prototype.getBoundingClientRect = zeroRect;
      w.Range.prototype.getClientRects = () => Object.assign([], { item: () => null });
    },
  });
  const w = dom.window;
  const inject = (code) => { const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s); };
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
  w.matchMedia = w.matchMedia || function (q) { return { media: q, matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent() { return false; } }; };
  for (const f of ['10-identity', '20-xapi', '25-report', '30-pointer-dnd', '40-resume']) inject(read(path.join(BASE, 'unit-js', f + '.js')));
  inject(read(path.join(dir, 'script.js')));
  const meta = readJson(path.join(BASE, 'metadata', UNIT_SLUG + '-' + c + '.json'));
  w.__store = null;
  w.__lr = { op: 'load', status: 404, ok: true, reason: 'absent' };
  w.loadState720 = function () {
    const d = w.__store ? JSON.parse(JSON.stringify(w.__store)) : null;
    w.__lr = d ? { op: 'load', status: 200, ok: true, reason: 'ok' } : { op: 'load', status: 404, ok: true, reason: 'absent' };
    return d;
  };
  w.saveState720 = function (id, doc) { w.__store = JSON.parse(JSON.stringify(doc)); return true; };
  w.saveState720Debounced = function (id, doc) { w.__debouncedDoc = doc; };
  w.stateLastResult720 = function () { return w.__lr; };
  inject('window.METADATA = ' + JSON.stringify(meta) + '; window.XAPI_USING_G = true; window.sendStatement720 = function () {};');
  const val = (expr) => { inject('window.__V = (function(){ try { return (' + expr + '); } catch (e) { return "__THREW__" + e.message; } })();'); return w.__V; };
  return { w, run: inject, val, errors, slug: UNIT_SLUG + '-' + c,
           seed: (d) => { w.__store = JSON.parse(JSON.stringify(d)); },
           stored: () => w.__store,
           close: () => setTimeout(() => w.close(), 0) };
}
const SEED = (slug) => ({ v: 5, component: slug, payload: { currentScreen: 2 }, done: {}, doneItems: {},
                          ui: { character: 'character-1' }, results: {} });
const screenOf = (d) => (d && d.payload ? d.payload.currentScreen : null);

/* ── a–d: the drain ── */
let b = boot('01');
b.seed(SEED(b.slug));
b.run("readUnitState(); setUnitCharacter('character-2'); goTo(1);");
ok('write-guard', 'a: a card pick + navigation before stage B writes nothing',
  screenOf(b.stored()) === 2 && b.val('_pendingProfile && _pendingProfile.character') === 'character-2', JSON.stringify(b.stored()));
b.run('_resumeReady = true; drainPendingUnitState();');
ok('write-guard', 'b: the drain persists the document AS READ: saved payload intact, character updated',
  screenOf(b.stored()) === 2 && b.stored().ui.character === 'character-2' && b.stored().component === b.slug, JSON.stringify(b.stored()));
b.run('applyExecutionState(_unitState.payload);');
ok('write-guard', 'c: the restore lands on the saved screen after the drain', b.val('currentScreen') === 2, 'currentScreen=' + b.val('currentScreen'));
ok('write-guard', 'd: the debounced document (held by reference) still carries the saved payload',
  screenOf(b.w.__debouncedDoc) === 2, JSON.stringify(b.w.__debouncedDoc && b.w.__debouncedDoc.payload));
b.close();

/* ── e–f: markSent ── */
b = boot('01');
b.seed(SEED(b.slug));
b.run('readUnitState(); goTo(1); markSent("doneItems", "x");');
ok('write-guard', 'e: markSent before stage B marks in memory but writes nothing',
  screenOf(b.stored()) === 2 && !(b.stored().doneItems || {}).x && b.val('_unitState.doneItems.x') === true, JSON.stringify(b.stored()));
b.run('_resumeReady = true; flushResumeSave();');
ok('write-guard', 'f: the key marked in memory rides the next save', b.stored().doneItems.x === true, JSON.stringify(b.stored()));
b.close();

/* ── g–j: a failed read ── */
b = boot('01');
b.seed(SEED(b.slug));
const realLoad = b.w.loadState720;
b.w.loadState720 = function () { b.w.__lr = { op: 'load', status: 500, ok: false, reason: 'rejected' }; return null; };
b.run('readUnitState();');
ok('write-guard', 'g: a read that fails (not a 404) is flagged, not taken as a fresh document',
  b.val('_resumeReadFailed') === true && b.val('_unitState.payload') === null);
b.run('_resumeReady = true; window.__p = persistUnitState(_unitState); flushResumeSave(); flushResumeSaveOnLeave(); markSent("done", "y"); goTo(1); scheduleResumeSave();');
ok('write-guard', 'h: after a failed read every write is refused and the stored document is untouched',
  b.w.__p === false && screenOf(b.stored()) === 2 && b.stored().done.y === undefined && b.w.__debouncedDoc === undefined, JSON.stringify(b.stored()));
b.w.loadState720 = realLoad;
b.run('readUnitState();');
ok('write-guard', 'i: a read that succeeds afterwards clears the flag and restores the payload',
  b.val('_resumeReadFailed') === false && b.val('_unitState.payload.currentScreen') === 2);
b.w.__store = null;
b.run('readUnitState();');
ok('write-guard', 'j: a 404 ("nothing saved yet") is NOT a failed read',
  b.val('_resumeReadFailed') === false && b.val('_unitState.payload') === null);
b.close();

/* ── k–l, s: source shape ── */
const r40 = read(path.join(BASE, 'unit-js', '40-resume.js'));
const r50 = read(path.join(BASE, 'unit-js', '50-loader.js'));
const body = (src, fn) => ((src.split('function ' + fn + '(')[1] || '').split(/\nfunction /)[0]);
ok('shape', 'k: the drain persists _unitState, never a capture',
  /persistUnitState\(_unitState\)/.test(body(r40, 'drainPendingUnitState')) && !/captureUnitState\(/.test(body(r40, 'drainPendingUnitState')));
ok('shape', 'k: markSent persists only once _resumeReady', /if \(!_resumeReady\) return;[^\n]*\n\s*try \{ persistUnitState\(captureUnitState\(\)\)/.test(body(r40, 'markSent')));
ok('shape', 'k: persistUnitState refuses after a failed read', /^[^{]*\{(\s*var ok = false;)?(\s*\/\*[\s\S]*?\*\/)?\s*if \(_resumeReadFailed\) \{[\s\S]{0,160}return false;/.test(body(r40, 'persistUnitState')));
ok('shape', 'k: scheduleResumeSave / flushResumeSave bail after a failed read',
  /_resumeReadFailed\) return;/.test(body(r40, 'scheduleResumeSave')) && /_resumeReadFailed\) return;/.test(body(r40, 'flushResumeSave')));
ok('shape', 'l: stage A keeps the cover on a failed read', /if \(!_payload && !_resumeReadFailed\) dropBootCover\(\);/.test(r50));
ok('shape', 'l: stage B retries the read once', /if \(_resumeReadFailed\) \{\s*_saved = readUnitState\(\);/.test(r50));
ok('shape', 'l: the stage-B catch keeps a failed session closed', /_resumeReady = !_resumeReadFailed;/.test(r50));
ok('shape', 'l: a screen reached during the window is saved', /if \(!_resumed && currentScreen !== 0\) \{ try \{ scheduleResumeSave\(\); \}/.test(r50));
const letter = (r50.match(/RESUME_ENABLED \? 'xapi-720-([a-z])\.js'/) || [])[1];
ok('shape', 's: the loader loads xapi-720-l.js and the regex lists l', letter === 'l' && /XAPI_USING_G = \/xapi-720-\[ghijkl\]\\\.js\//.test(r50), 'letter ' + letter);
const leaving = body(r40, 'flushResumeSaveLeaving');
ok('shape', 's: the leave flush has the write guards and typeof-guards saveState720OnLeave',
  /_resumeReadFailed\) return;/.test(leaving) && /typeof window\.saveState720OnLeave === 'function'/.test(leaving));
ok('shape', 's: the leave handler goes through flushResumeSaveLeaving', /flushResumeSaveLeaving\(\);/.test(body(r40, 'flushResumeSaveOnLeave')));

/* ── t: the leave save, behavioural ── */
for (const lib of ['l', 'k']) {
  b = boot('01');
  b.seed(SEED(b.slug));
  b.w.__leave = [];
  if (lib === 'l') b.w.saveState720OnLeave = function (id, doc) { b.w.__leave.push(screenOf(doc)); return b.w.saveState720(id, doc); };
  b.run('readUnitState(); _resumeReady = true; applyExecutionState(_unitState.payload); goTo(3); flushResumeSaveOnLeave();');
  ok('leave', 't -' + lib + ': the leave write carries the new screen', screenOf(b.stored()) === 3, JSON.stringify(b.stored() && b.stored().payload));
  if (lib === 'l') ok('leave', 't -l: it goes through saveState720OnLeave', b.w.__leave.length === 1 && b.w.__leave[0] === 3, JSON.stringify(b.w.__leave));
  ok('leave', 't -' + lib + ': no page error', b.errors.length === 0, b.errors.slice(0, 2).join(' | '));
  b.close();
}

/* ── m–p: every part's markup ── */
for (const c of PARTS) {
  const html = read(path.join(BASE, UNIT_SLUG + '-' + c, 'index.html'));
  const inl = (html.match(/<script>[\s\S]*?<\/script>/g) || []).filter((s) => /boot-cover/.test(s));
  ok(c, 'm: exactly one inline script handles boot-cover', inl.length === 1, String(inl.length));
  const net = inl[0] || '';
  ok(c, 'm: the net raises __resumeInFlight itself on a registration', /if \(\/\[\?&\]registration=\/\.test\(location\.search\)\) window\.__resumeInFlight = true;/.test(net));
  ok(c, 'm: the net keeps 800 ms and the 6000 ceiling', /setTimeout\(tick, 800\)/.test(net) && /< 6000/.test(net));
  for (const q of ['?slxapi=1&registration=abc', '']) {
    const d = new JSDOM(html, { url: 'http://localhost:8777/' + UNIT_SLUG + '-' + c + '/index.html' + q, runScripts: 'dangerously' });
    const on = d.window.__resumeInFlight === true;
    ok(c, 'n: __resumeInFlight ' + (q ? 'raised with' : 'not raised without') + ' a registration', q ? on : !on);
    d.window.close();
  }
  const pre = [...html.matchAll(/<link rel="preload" as="script"[^>]*>/g)].map((m) => m[0]);
  ok(c, 'o: two script preloads, the exact loader URLs, letter ' + letter + ', no crossorigin / ?',
    pre.length === 2 && pre[0].includes('href="' + CDN + 'xapiwrapper.min.js"') && pre[1].includes('href="' + CDN + 'xapi-720-' + letter + '.js"') &&
    !pre.some((p) => /crossorigin|\.js\?/.test(p)), pre.join(' '));
  ok(c, 'o: preconnect to Kata', /<link rel="preconnect" href="https:\/\/kata\.cet\.ac\.il">/.test(html));
  const m0 = html.search(/<section class="screen active"/);
  const end0 = m0 < 0 ? -1 : m0 + 10 + html.slice(m0 + 10).search(/<section\b/);
  let bad = [];
  /* the small SVG icons stay eager (§2.3): they sit in buttons that are hidden until needed, and a lazy
     image inside a hidden element only starts loading when it appears */
  for (const m of html.matchAll(/<img\b[^>]*src="assets\/[^>]*>/g)) {
    const inLanding = m.index >= m0 && m.index < end0;
    const svg = /src="[^"]*\.svg(\?[^"]*)?"/.test(m[0]);
    if ((inLanding || svg) === /loading="lazy"/.test(m[0])) bad.push(m[0].slice(0, 80));
  }
  ok(c, 'p: every raster assets/ image off the landing screen is lazy; none on it, no SVG icon', bad.length === 0, bad.slice(0, 2).join(' | '));
  /* C4: a hidden <video autoplay> with an inline src is fetched in full at load; off the landing screen
     the clip waits in data-src until goTo() opens its screen (30-nav.js) */
  const vbad = [];
  for (const m of html.matchAll(/<video\b[^>]*>/g)) {
    const inLanding = m.index >= m0 && m.index < end0;
    if (!inLanding && /\sautoplay\b/.test(m[0]) && /\ssrc="/.test(m[0])) vbad.push(m[0].slice(0, 80));
  }
  ok(c, 'p: no hidden autoplay <video> off the landing screen carries an inline src', vbad.length === 0, vbad.slice(0, 2).join(' | '));
}

console.log('\nwrite-guard: ' + pass + ' passed, ' + failures.length + ' failed');
if (failures.length) { console.log(failures.join('\n')); process.exitCode = 1; }
