/* Structural + headless verification for methodica-ar-science-body-matter-01 — the reporting /
   issue-reporting / resume layer and the invariants it depends on.

   Every assertion corresponds to a failure that is SILENT at runtime: the lomda keeps working, the
   learner notices nothing, and the data is wrong or missing. Procedure:
   2026/Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md (§6.8, §10.2) and the
   response-layer rules of 2026-10-19 (unit-js/20-xapi.js header; harness checks H1–H15).

   Written for this unit (science layout: one script.js per part, local assets + unit-assets/).

   RUN (jsdom must live OUTSIDE this OneDrive tree):
     mkdir -p /tmp/lomda-test && cd /tmp/lomda-test && npm install jsdom
     NODE_PATH=/tmp/lomda-test/node_modules node _test/verify-report.js
   Without jsdom the static groups still run and the runtime group reports SKIPPED.
   Optional argument: a built package to check instead of the repo (the runtime group then
   reads the stub from the repo, which a package rightly does not carry). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE = process.argv[2] || path.join(__dirname, '..');
const REPO = path.join(__dirname, '..');
const UNIT_SLUG = 'methodica-ar-science-body-matter-01';
const COMPONENTS = ['01', '02', '03', '04', '05', '06', '07'];
const PREFIX = 'https://lomdot.education.gov.il/metodica/720/ar/science/body-matter/01/';
const SHARED = ['10-identity', '20-xapi', '25-report', '30-pointer-dnd', '40-resume', '50-loader', '90-boot'];
const HOOKS = ['capturePartPayload', 'applyResumeVars', 'applyResumeDom', 'restoreScreenUI'];

const compSlug = (c) => UNIT_SLUG + '-' + c;
const compDir = (c) => path.join(BASE, compSlug(c));
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p).replace(/^﻿/, ''));
const partJs = (c) => read(path.join(compDir(c), 'script.js'));
const indexHtml = (c) => read(path.join(compDir(c), 'index.html'));
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, skipped = 0;
const failures = [];
function ok(scope, name, cond, detail) {
  if (cond) { pass++; return; }
  failures.push('  [' + scope + '] ' + name + (detail ? '\n      -> ' + detail : ''));
}
function section(t) { console.log('\n' + t); }

function fnBody(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) return null;
  let depth = 0, i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}
/* the per-part config block, evaluated as data (needs XAPI_ID_PREFIX) */
function partConfig(c) {
  const js = partJs(c);
  const ctx = { XAPI_ID_PREFIX: PREFIX };
  const block = js.slice(js.indexOf('var SCREEN_TO_SUBCONTENT'));
  const end = block.indexOf('function xapiPartResult');
  vm.runInNewContext(block.slice(0, end), ctx);
  return ctx;
}
const SEP_RE = /\[,\]|\[\.\]|\[:\]/;
/* an ungraded open question: in the catalogue for the bot's context, never reported as 'answered' */
const isUngradedQ = (q) => q.questionType === 'other' && !(q.correctAnswers || []).length;

/* ══════════════════ 1. catalogue identity ══════════════════ */
section('1. catalogue identity');
const unitMeta = readJson(path.join(BASE, 'metadata', UNIT_SLUG + '_unit.json'));
ok('identity', 'unit metadata id is the bare unit slug', unitMeta.id === UNIT_SLUG, unitMeta.id);
const identity = read(path.join(BASE, 'unit-js', '10-identity.js'));
ok('identity', 'XAPI_ID_PREFIX matches the catalogue prefix', identity.includes("var XAPI_ID_PREFIX = '" + PREFIX + "';"));
ok('identity', 'XAPI_UNIT_ID is the bare unit slug', identity.includes("window.XAPI_UNIT_ID = '" + UNIT_SLUG + "';"));
ok('identity', 'RESUME_ENABLED is true', /var RESUME_ENABLED = true;/.test(identity));
const resumeJs = read(path.join(BASE, 'unit-js', '40-resume.js'));
const charKey = (/var UI_CHARACTER_KEY = '([^']+)'/.exec(resumeJs) || [])[1];
ok('identity', 'UI_CHARACTER_KEY is namespaced per unit (D-6)', charKey === 'methodica_ar_science_body_matter_01_selectedCharacter', charKey);
ok('identity', 'NAV_EDGE_KEY carries the unit slug', resumeJs.includes("'lomda_nav_edges::" + UNIT_SLUG + "'"));
ok('identity', 'RESULT_KEYS lists the part-06 verdict key', /var RESULT_KEYS = \[\s*'body-matter-01_moedAPassed'\s*\]/.test(resumeJs));
const loader = read(path.join(BASE, 'unit-js', '50-loader.js'));
const lib = (/\(RESUME_ENABLED \? 'xapi-720-(\w)\.js' : 'xapi-720-(\w)\.js'\)/.exec(loader) || []);
const gate = (/xapi-720-\[([a-z]+)\]\\\.js/.exec(loader) || [])[1] || '';
ok('loader', 'library letter is k with resume (i without)', lib[1] === 'k' && lib[2] === 'i', lib.join('/'));
ok('loader', 'the loaded letters are inside the XAPI_USING_G gate', gate.includes('k') && gate.includes('i'), gate);
ok('loader', 'the stub carries a gated letter', /xapi-720-[ghijk]\.js$/.test('_test/xapi-720-k.js'));

const META = {};
for (const c of COMPONENTS) {
  META[c] = readJson(path.join(BASE, 'metadata', compSlug(c) + '.json'));
  ok(c, 'component metadata id = prefix + slug + /', META[c].id === PREFIX + compSlug(c) + '/', META[c].id);
  ok(c, 'component learningUnitId = unit slug', META[c].learningUnitId === UNIT_SLUG, META[c].learningUnitId);
  for (const it of META[c].subContent || []) {
    ok(c, 'item id under the component: ' + it.id, it.id.startsWith(META[c].id + compSlug(c) + '-') && it.id.endsWith('/'));
    for (const q of it.questions || []) {
      ok(c, 'question id = item id + qN: ' + q.questionId, /\/q\d+$/.test(q.questionId) && q.questionId.startsWith(it.id));
      ok(c, 'questionType in the Kata enum: ' + q.questionId,
         ['fill-in', 'true-false', 'choice', 'numeric', 'sequencing', 'matching', 'performance', 'other'].includes(q.questionType), q.questionType);
      /* H5 — delimiter-free, trimmed answer strings; correctAnswers ⊆ answers */
      const pool = Array.isArray(q.answers) ? q.answers : [].concat((q.answers && q.answers.source) || [], (q.answers && q.answers.target) || []);
      for (const s of pool) ok(c, 'answer text clean: ' + s, typeof s === 'string' && !SEP_RE.test(s) && s === s.trim() && !/\s{2}/.test(s));
      if (q.questionType === 'choice') for (const ca of q.correctAnswers || []) ok(c, 'correctAnswer ∈ answers: ' + ca, q.answers.includes(ca));
      if (q.questionType === 'matching') for (const ca of q.correctAnswers || []) ok(c, 'correct pair ∈ source×target: ' + ca.source, q.answers.source.includes(ca.source) && q.answers.target.includes(ca.target));
      if (q.questionType === 'performance') ok(c, 'performance has ≥ 2 steps (steps[] or correctAnswers[].stepId)',
         (q.steps || (q.correctAnswers || []).filter((s) => s && s.stepId != null)).length >= 2);
      if (q.questionType === 'other') ok(c, 'other carries no answers', !(q.answers && q.answers.length));
    }
  }
}

/* ══════════════════ 2. per-part wiring ══════════════════ */
section('2. per-part page wiring');
const versions = {};
const tailOrder = [];
for (const c of COMPONENTS) {
  const html = indexHtml(c), js = partJs(c), jsc = stripComments(js);
  const htmlc = html.replace(/<!--[\s\S]*?-->/g, '');
  /* script tags: shared first, script.js, 90-boot last; one ?v= per file across parts */
  const tags = [...htmlc.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((u) => !/^https?:/.test(u));
  const names = tags.map((u) => path.posix.basename(u.split('?')[0]));
  const expect = SHARED.slice(0, -1).map((n) => n + '.js').concat(['script.js', '90-boot.js']);
  ok(c, 'platform script tags in order, 90-boot last', JSON.stringify(names) === JSON.stringify(expect), names.join(' '));
  for (const u of tags) {
    const v = (/[?&]v=([^&#]+)/.exec(u) || [])[1];
    ok(c, '?v= on ' + u, !!v);
    const n = path.posix.basename(u.split('?')[0]);
    (versions[n] = versions[n] || new Set()).add(v || '(none)');
  }
  const css = (/<link rel="stylesheet" href="styles\.css\?v=([^"]+)">/.exec(htmlc) || [])[1];
  ok(c, 'styles.css?v=', !!css); (versions['styles.css'] = versions['styles.css'] || new Set()).add(css || '(none)');
  ok(c, '25-report.css linked', /<link rel="stylesheet" href="\.\.\/unit-css\/25-report\.css\?v=[^"]+">/.test(htmlc));
  ok(c, 'boot cover before #app', htmlc.indexOf('id="boot-cover"') > 0 && htmlc.indexOf('id="boot-cover"') < htmlc.indexOf('<div id="app">'));
  for (const id of ['report-modal', 'report-thanks-modal', 'report-confirm-modal']) ok(c, 'dialog #' + id, htmlc.includes('id="' + id + '"'));
  ok(c, 'flag button #report-btn.flag-btn, wired by delegation (no onclick)', /<button id="report-btn" class="flag-btn" type="button"[^>]*>/.test(htmlc) && !/id="report-btn"[^>]*onclick/.test(htmlc));
  /* the platform owns routing (§8.12) */
  const hops = [...jsc.matchAll(/window\.location\.(?:href|replace|assign)[^\n]*/g)].map((m) => m[0]);
  for (const h of hops) ok(c, 'cross-part hop only under DEV_NAV: ' + h.slice(0, 60), /DEV_NAV/.test(jsc.slice(Math.max(0, jsc.indexOf(h) - 120), jsc.indexOf(h))) || /window\.location\.search/.test(h) === false && false);
  ok(c, 'no inline cross-part hop in index.html', !/onclick="window\.location/.test(htmlc));
  ok(c, 'no window.close / alert / CLOSE_LEARNING_MODULE', !/window\.close|window\.open\(|CLOSE_LEARNING_MODULE|\balert\(|top\.close|parent\.close/.test(jsc));
  ok(c, '?start=last guarded by DEV_NAV', !/get\('start'\) === 'last'/.test(jsc) || /DEV_NAV &&[\s\S]{0,80}get\('start'\) === 'last'/.test(jsc));
  /* goTo tail */
  const gt = fnBody(jsc, 'goTo') || '';
  const iAct = gt.indexOf("classList.add('active')"), iX = gt.indexOf('xapiOnScreen(n)'), iR = gt.indexOf('repaintScreen(n)'), iS = gt.indexOf('scheduleResumeSave()');
  ok(c, 'goTo: repaintScreen / xapiOnScreen / scheduleResumeSave after .active', iAct > 0 && iR > iAct && iX > iR && iS > iX);
  ok(c, 'goTo: resetScreenState before .active (avatar rule)', gt.indexOf('resetScreenState(n)') < iAct);
  /* character */
  ok(c, 'CHARACTER_STORAGE_KEY === UI_CHARACTER_KEY', jsc.includes("const CHARACTER_STORAGE_KEY = '" + charKey + "';"));
  ok(c, 'character read through getUnitCharacter (typeof-guarded)', /typeof getUnitCharacter === 'function'/.test(jsc));
  ok(c, 'no bare lomda_selectedCharacter key', !/'lomda_selectedCharacter'/.test(jsc));
  /* hooks + config */
  for (const h of HOOKS) ok(c, 'hook ' + h + ' declared once', (jsc.match(new RegExp('^function ' + h + '\\(', 'gm')) || []).length === 1);
  for (const n of ['xapiPartResult', 'partFinish']) ok(c, n + ' declared once', (jsc.match(new RegExp('^function ' + n + '\\(', 'gm')) || []).length === 1);
  let cfg = null;
  try { cfg = partConfig(c); } catch (e) { ok(c, 'config block evaluates', false, String(e)); }
  if (cfg) {
    ok(c, 'XAPI_COMP_SLUG = folder (lowercase)', cfg.XAPI_COMP_SLUG === compSlug(c));
    ok(c, 'XAPI_COMP_ID = metadata id', cfg.XAPI_COMP_ID === META[c].id, cfg.XAPI_COMP_ID);
    ok(c, 'XAPI_METADATA_FILE points at this part\'s json', cfg.XAPI_METADATA_FILE === '../metadata/' + compSlug(c) + '.json' && fs.existsSync(path.join(BASE, 'metadata', compSlug(c) + '.json')));
    ok(c, 'XAPI_END_BTN exists in index.html', !!cfg.XAPI_END_BTN && htmlc.includes('id="' + cfg.XAPI_END_BTN + '"'), cfg.XAPI_END_BTN);
    /* the map covers exactly the DOM's screens; both-way coverage with the catalogue (D-2) */
    const dom = [...htmlc.matchAll(/<section class="screen[^"]*" data-screen="(\d+)"/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
    const keys = Object.keys(cfg.SCREEN_TO_SUBCONTENT).map(Number).sort((a, b) => a - b);
    ok(c, 'SCREEN_TO_SUBCONTENT keys === DOM data-screen set', JSON.stringify(keys) === JSON.stringify(dom), keys.join(',') + ' vs ' + dom.join(','));
    const total = Number((/const TOTAL_SCREENS = (\d+)/.exec(js) || [])[1]);
    ok(c, 'TOTAL_SCREENS === number of screens', total === dom.length, total + ' vs ' + dom.length);
    const items = new Set((META[c].subContent || []).map((it) => it.id.replace(/\/$/, '').slice(-3)));
    const mapped = new Set(Object.values(cfg.SCREEN_TO_SUBCONTENT).filter(Boolean).map((v) => v[0]));
    for (const s of mapped) ok(c, 'mapped item exists in the catalogue: ' + s, items.has(s));
    for (const s of items) ok(c, 'catalogue item has a screen (D-2): ' + s, mapped.has(s));
    for (const v of Object.values(cfg.SCREEN_TO_SUBCONTENT).filter(Boolean)) ok(c, 'suffix is a 3-char string: ' + v[0], typeof v[0] === 'string' && /^\d{3}$/.test(v[0]));
    /* eval items ⇔ items with a declared GRADED question. An ungraded open question (questionType 'other',
       no correctAnswers — 01/001 since 2026-10-27) is in the catalogue for the bot's context only. */
    const withQ = new Set((META[c].subContent || []).filter((it) => (it.questions || []).some((q) => !isUngradedQ(q))).map((it) => it.id.replace(/\/$/, '').slice(-3)));
    ok(c, 'XAPI_EVAL_ITEMS === items with declared questions', JSON.stringify([...withQ].sort()) === JSON.stringify(Object.keys(cfg.XAPI_EVAL_ITEMS).sort()),
       [...withQ].join(',') + ' vs ' + Object.keys(cfg.XAPI_EVAL_ITEMS).join(','));
  }
  /* ═══ response layer, static (H1–H3, H7) ═══ */
  const declared = new Set();
  for (const it of META[c].subContent || []) for (const q of it.questions || []) if (!isUngradedQ(q)) declared.add(it.id.replace(/\/$/, '').slice(-3) + '/' + q.questionId.split('/').pop());
  const calls = [...jsc.matchAll(/xapiAnswered\(\s*'(\d{3})'\s*,\s*'(q\d+)'\s*,/g)];
  const called = calls.map((m) => m[1] + '/' + m[2]);
  for (const m of calls) {
    /* the 5th argument: the first object literal after the isLast expression (call sites span lines) */
    const rest = jsc.slice(m.index + m[0].length, m.index + m[0].length + 700);
    const spec = /^[^{]*?\{\s*(choices|pairs|steps|values|value|order|text)\s*:/.exec(rest);
    ok(c, 'H1 spec object at xapiAnswered ' + m[1] + '/' + m[2], !!spec, rest.slice(-80));
    const q = (META[c].subContent || []).flatMap((it) => (it.questions || []).map((qq) => ({ it: it.id.replace(/\/$/, '').slice(-3), k: qq.questionId.split('/').pop(), t: qq.questionType }))).find((x) => x.it === m[1] && x.k === m[2]);
    if (spec && q) {
      const want = { choice: 'choices', matching: 'pairs', performance: 'steps', other: 'text' }[q.t] || null;
      ok(c, 'H2 spec shape matches questionType at ' + m[1] + '/' + m[2], !want || spec[1] === want, spec[1] + ' for ' + q.t);
    }
  }
  const dup = called.filter((k, i) => called.indexOf(k) !== i);
  ok(c, 'H3 each declared question has exactly one call site', JSON.stringify([...declared].sort()) === JSON.stringify([...new Set(called)].sort()) && !dup.length,
     'declared=' + [...declared].join(' ') + '  called=' + called.join(' '));
  ok(c, 'H7 retired builders absent', !/xapiZoneAnswer\(|xapiFieldsAnswer\(|xapiMultiAnswer\(/.test(jsc));
  for (const m of jsc.matchAll(/xapiRequestedHint\('(\d{3})',\s*'(q\d+)'\)/g)) ok(c, 'hint site names a declared question: ' + m[1] + '/' + m[2], declared.has(m[1] + '/' + m[2]));
  const hintFns = [...jsc.matchAll(/^function (\w*OpenHint)\(/gm)].map((m) => m[1]);
  for (const f of hintFns) {
    const b = fnBody(jsc, f) || '';
    const iH = b.indexOf('xapiRequestedHint('), iReveal = b.indexOf('hidden = false');
    ok(c, f + ' reports the hint after the guards and before the reveal', iH > 0 && (iReveal < 0 || iH < iReveal), 'hint@' + iH + ' reveal@' + iReveal);
  }
  for (const m of jsc.matchAll(/^function (\w*CloseHint)\(/gm)) ok(c, m[1] + ' reports nothing', !(fnBody(jsc, m[1]) || '').includes('xapiRequestedHint'));
  /* identifiers declared in both layers (§3.3) */
  const sharedNames = new Set();
  for (const s of SHARED) for (const m of stripComments(read(path.join(BASE, 'unit-js', s + '.js'))).matchAll(/^(?:function|var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) sharedNames.add(m[1]);
  for (const m of jsc.matchAll(/^(?:function|var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (HOOKS.includes(m[1])) continue;
    ok(c, 'no identifier declared in both layers: ' + m[1], !sharedNames.has(m[1]));
  }
  ok(c, 'no capitalised unit slug', !/Methodica-Science-Body-Matter/i.test(jsc.replace(/methodica-science-body-matter/g, '')) );
}
for (const [n, vs] of Object.entries(versions)) ok('versions', 'one ?v= for ' + n + ' across parts', vs.size === 1, [...vs].join(','));

/* ══════════════════ 3. shared layer ══════════════════ */
section('3. shared layer');
const xapi = read(path.join(BASE, 'unit-js', '20-xapi.js'));
for (const n of ['xapiQMeta', 'xapiResponse', 'xapiChoiceResponse', 'xapiMatchingResponse', 'xapiPerformanceResponse', 'xapiAnswered', 'xapiRequestedHint', 'xapiEndComponent', '_xapiCloseItem', 'xapiSeedAnsweredFromResume', 'restoreEndedButton', 'xapiYouTubeState'])
  ok('shared', n + ' declared once in 20-xapi.js', (xapi.match(new RegExp('^function ' + n + '\\(', 'gm')) || []).length === 1);
ok('shared', 'xapiAnswered writes XAPI_Q_RESULTS first, outside the try', /function xapiAnswered\([^)]*\) \{\n  XAPI_Q_RESULTS\[item \+ '\/' \+ qKey\] = !!correct;\n/.test(xapi));
ok('shared', 'retired builders not defined', !/function xapi(Zone|Fields|Multi)Answer\(/.test(xapi));
ok('shared', 'definition-only files have no top-level side effects (except 90-boot)',
   SHARED.slice(0, -1).every((s) => !/^\(function|^[a-zA-Z_$][\w$]*\(.*\);\s*$/m.test(stripComments(read(path.join(BASE, 'unit-js', s + '.js'))).replace(/^(?:var|let|const|function)[\s\S]*?\n(?=\S)/gm, ''))));
ok('shared', '90-boot calls bootXAPI last', /initReportModal\(\);[\s\S]*bootXAPI\(\);\n\}\)\(\);/.test(read(path.join(BASE, 'unit-js', '90-boot.js'))));

/* ══════════════════ 4. runtime (jsdom) ══════════════════ */
section('4. runtime (jsdom)');
let JSDOM = null;
try { ({ JSDOM } = require('jsdom')); } catch (e) { skipped++; console.log('  skipped: jsdom not on NODE_PATH'); }

function loadPart(c, query) {
  const html = indexHtml(c);
  const stripped = html.replace(/<script src="([^"]+)"><\/script>/g, '<!--script:$1-->').replace(/<script>[\s\S]*?<\/script>/, '');
  const dom = new JSDOM(stripped, { runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'http://localhost:5555/' + UNIT_SLUG + '/' + compSlug(c) + '/index.html' + (query || '') });
  const w = dom.window;
  for (const m of ['play', 'pause', 'load']) w.HTMLMediaElement.prototype[m] = function () { return m === 'play' ? Promise.resolve() : undefined; };
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
  w.YT = { PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 }, Player: function () { this.playVideo = () => {}; this.pauseVideo = () => {}; this.getCurrentTime = () => 0; } };
  const errors = [];
  w.console.error = (...a) => errors.push(a.map(String).join(' '));
  w.addEventListener('error', (e) => errors.push('page error: ' + (e.error && e.error.stack || e.message)));
  /* the real script tags, in document order, from disk; CDN loads are never fetched */
  for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
    const u = m[1];
    if (/^https?:/.test(u)) continue;
    const file = path.join(compDir(c), u.split('?')[0]);
    /* a classic <script> element, not eval: 'use strict' files must still declare globals, and
       top-level let/const must land in the global lexical scope (read them with w.eval('name')). */
    const s = w.document.createElement('script'); s.textContent = read(file) + '\n//# sourceURL=' + u;
    try { w.document.body.appendChild(s); } catch (e) { errors.push(u + ': ' + (e && e.stack || e)); }
  }
  return { dom, w, errors };
}

if (JSDOM) for (const c of COMPONENTS) {
  const cfg = partConfig(c);
  /* 4a — regression gate: no library, nothing sent, nothing throws, every screen walks */
  let r = loadPart(c);
  let w = r.w;
  const screens = [...w.document.querySelectorAll('section.screen[data-screen]')].map((s) => Number(s.dataset.screen));
  ok(c, 'gate: no console.error / page error on load', r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  ok(c, 'gate: sendStatement720 is undefined without the library', typeof w.sendStatement720 === 'undefined');
  for (const n of screens) { try { w.goTo(n); } catch (e) { ok(c, 'gate: goTo(' + n + ') throws', false, String(e)); } }
  ok(c, 'gate: exactly one .active after the walk', w.document.querySelectorAll('section.screen.active').length === 1);
  ok(c, 'gate: no console.error during the walk', r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  ok(c, 'gate: xapiOnScreen / xapiAnswered are silent no-ops', (() => { try { w.xapiOnScreen(0); w.xapiAnswered('001', 'q1', true, true, { text: 'x' }); return true; } catch (e) { return false; } })());

  /* 4b — statement flow with an inline recorder standing in for the library */
  r = loadPart(c); w = r.w;
  const sent = [];
  w.METADATA = META[c];
  w.XAPI_USING_G = true;
  w.xapiItemAnswered = {};
  w.xapiCompletedObjects = {};
  w.sendStatement720 = function (verb, type, result, ctx) {
    sent.push({ verb, type, result: result || null, ctx: ctx || null });
    if (verb.split('.')[0] === 'answered' && ctx && ctx.parentId) w.xapiItemAnswered[ctx.parentId] = true;
  };
  let doc = null;
  w.loadState720 = () => doc;
  w.saveState720 = (id, o) => { doc = JSON.parse(JSON.stringify(o)); return true; };
  w.saveState720Debounced = (id, o) => { doc = JSON.parse(JSON.stringify(o)); };
  w.readUnitState(); w._resumeReady = true;
  w.xapiOnScreen(w.eval('currentScreen'));
  const expectedItems = []; let last = null;
  for (const n of screens) { const it = cfg.SCREEN_TO_SUBCONTENT[n] ? cfg.SCREEN_TO_SUBCONTENT[n][0] : null; if (it !== last) { expectedItems.push(it); last = it; } }
  for (const n of screens.slice(1)) w.goTo(n);
  const inits = sent.filter((s) => s.verb === 'initialized' && s.ctx && s.ctx.objectId).map((s) => s.ctx.objectId.replace(/\/$/, '').slice(-3));
  ok(c, 'flow: one item initialized per item change on the forward walk', JSON.stringify(inits) === JSON.stringify(expectedItems.filter(Boolean)), inits.join(',') + ' vs ' + expectedItems.filter(Boolean).join(','));
  const closes = sent.filter((s) => s.verb === 'completed' && s.ctx && s.ctx.objectId).map((s) => s.ctx.objectId.replace(/\/$/, '').slice(-3));
  const evalItems = Object.keys(cfg.XAPI_EVAL_ITEMS);
  ok(c, 'flow: unanswered evaluated items are never closed (B-1), ungraded ones are', closes.every((it) => !evalItems.includes(it)) &&
     expectedItems.filter(Boolean).slice(0, -1).filter((it) => !evalItems.includes(it)).every((it) => closes.includes(it)), closes.join(','));
  ok(c, 'flow: initialized carries isEvaluationItem for graded items', sent.filter((s) => s.verb === 'initialized' && s.ctx && s.ctx.objectId).every((s) => s.ctx.isEvaluationItem === evalItems.includes(s.ctx.objectId.replace(/\/$/, '').slice(-3))));
  /* the last click: one component completed, explicit success, button disabled, no navigation */
  const hrefBefore = w.location.href;
  const btn = w.document.getElementById(cfg.XAPI_END_BTN);
  ok(c, 'flow: XAPI_END_BTN present', !!btn);
  const before = sent.length;
  w.partFinish(btn); w.partFinish(btn);
  const comps = sent.slice(before).filter((s) => s.verb === 'completed' && !(s.ctx && s.ctx.objectId));
  ok(c, 'flow: exactly one component completed for two finish clicks', comps.length === 1, comps.length);
  ok(c, 'flow: component completed carries an explicit boolean success', comps[0] && typeof comps[0].result.success === 'boolean');
  ok(c, 'flow: finish button disabled, aria-disabled', btn && btn.disabled && btn.getAttribute('aria-disabled') === 'true');
  ok(c, 'flow: no navigation on finish', w.location.href === hrefBefore);
  ok(c, 'flow: ledger persisted the component completed', doc && doc.done && doc.done[compSlug(c)] === true);
  ok(c, 'flow: no console.error', r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  /* restoreEndedButton after a reload with the ledger */
  const r2 = loadPart(c); const w2 = r2.w;
  w2.METADATA = META[c]; w2.XAPI_USING_G = true; w2.loadState720 = () => doc; w2.saveState720 = () => true; w2.saveState720Debounced = () => {};
  w2.sendStatement720 = () => {};
  w2.readUnitState(); w2._resumeReady = true;
  w2.goTo(screens[screens.length - 1]);
  const btn2 = w2.document.getElementById(cfg.XAPI_END_BTN);
  ok(c, 'D-8: finished button stays disabled after a reload with the ledger', btn2 && btn2.disabled);

  /* 4b' — the s3 learning-path choice (monday.com 28.10.26, guide §6.3a): 'selected', category
     learning-type, object = the component, response = the chosen path item's catalogue mediaFormat;
     once per distinct path, on the confirmed choice and the toggles; silent while a restore paints. */
  if (c === '01') {
    const paths = r.w.eval('XAPI_LEARNING_PATHS');
    const sub = Object.fromEntries((META[c].subContent || []).map((s) => [s.id.replace(/\/$/, '').slice(-3), s]));
    ok(c, 'XAPI_LEARNING_PATHS: every path item exists and its mediaFormat equals the catalogue',
       Object.keys(paths).length === 2 && Object.values(paths).every((p) => sub[p.item] && sub[p.item].mediaFormat === p.mediaFormat), JSON.stringify(paths));
    const map = cfg.SCREEN_TO_SUBCONTENT;
    ok(c, 'XAPI_LEARNING_PATHS: each path item is the item its first screen reports (video s10, read s4)',
       map[10] && map[10][0] === paths.video.item && map[4] && map[4][0] === paths.read.item);
    const r6 = loadPart(c); const w6 = r6.w; const sel = [];
    w6.METADATA = META[c]; w6.XAPI_USING_G = true; let doc6 = null;
    w6.loadState720 = () => doc6; w6.saveState720 = (id, o) => { doc6 = JSON.parse(JSON.stringify(o)); return true; };
    w6.saveState720Debounced = (id, o) => { doc6 = JSON.parse(JSON.stringify(o)); };
    w6.sendStatement720 = function (verb, type, result, ctx) { if (verb === 'selected') sel.push({ type, result, ctx }); };
    w6.readUnitState(); w6._resumeReady = true;
    const card = (v) => w6.document.querySelector('#s3 .option-card[data-value="' + v + '"]');
    w6.goTo(3); w6.s3SelectPath(card('read')); w6.s3SelectPath(card('video'));
    const onClick = sel.length;
    w6.advanceFromS3(); const first = sel.slice(); const landed = w6.eval('currentScreen');
    w6.goTo(3); w6.s3SelectPath(card('video')); w6.advanceFromS3(); const repick = sel.length;
    w6.rvGoToRead(); const toRead = sel.slice(1); const readScreen = w6.eval('currentScreen');
    w6.rvGoToVideo(); const back = sel.length;
    w6._unitState = w6.emptyUnitState(); sel.length = 0;
    w6._restoring = true; w6.goTo(3); w6.advanceFromS3(); w6._restoring = false; const restoring = sel.length;
    const one = (l, f) => l.length === 1 && l[0].type === 'onlinelesson' && l[0].ctx && l[0].ctx.category === 'learning-type'
      && !l[0].ctx.objectId && !l[0].ctx.questionId && l[0].result && l[0].result.response === f;
    ok(c, 'choice: a card click sends nothing (only the confirmed choice reports)', onClick === 0, String(onClick));
    ok(c, 'choice: the s3 continue on video sends one selected — learning-type, component object, response "' + paths.video.mediaFormat + '"',
       one(first, paths.video.mediaFormat) && landed === 10, JSON.stringify(first) + ' landed ' + landed);
    ok(c, 'choice: re-picking the same path sends nothing', repick === 1, String(repick));
    ok(c, 'choice: switching to reading from the toggle sends one selected, response "' + paths.read.mediaFormat + '"',
       one(toRead, paths.read.mediaFormat) && readScreen === 4, JSON.stringify(toRead));
    ok(c, 'choice: switching back to an already-reported path sends nothing', back === 2, String(back));
    ok(c, 'choice: nothing is sent while a restore paints', restoring === 0, String(restoring));
    ok(c, 'choice: no console.error', r6.errors.length === 0, r6.errors.slice(0, 2).join(' | '));
  }

  /* 4c — response builders round-trip the catalogue (H9/H10): the correct answer formats to the canonical string */
  r = loadPart(c); w = r.w; w.METADATA = META[c]; w.XAPI_USING_G = true;
  for (const it of META[c].subContent || []) {
    const suf = it.id.replace(/\/$/, '').slice(-3);
    for (const q of it.questions || []) {
      const k = q.questionId.split('/').pop();
      const m = w.xapiQMeta(suf, k);
      ok(c, 'xapiQMeta resolves ' + suf + '/' + k, m.questionId === q.questionId && m.parentId === it.id && m.questionType === q.questionType);
      if (q.questionType === 'choice') {
        const resp = w.xapiResponse(suf, k, { choices: q.correctAnswers.slice().reverse() }).response;
        const canon = q.answers.filter((a) => q.correctAnswers.includes(a)).join('[,]');
        ok(c, 'H10 choice canonical (answers order, any click order) ' + suf + '/' + k, resp === canon, resp + ' vs ' + canon);
        ok(c, 'H12 no DOM-id syntax in response ' + suf + '/' + k, !/=|\s\|\s/.test(resp));
      } else if (q.questionType === 'matching') {
        const resp = w.xapiResponse(suf, k, { pairs: q.correctAnswers.slice().reverse() }).response;
        const canon = q.answers.source.map((s) => s + '[.]' + (q.correctAnswers.find((p) => p.source === s) || {}).target).join('[,]');
        ok(c, 'H10 matching canonical (source order) ' + suf + '/' + k, resp === canon, resp + ' vs ' + canon);
        const partial = w.xapiResponse(suf, k, { pairs: [] }).response;
        ok(c, 'H9 matching with nothing placed yields S[.] per source ' + suf + '/' + k, partial === q.answers.source.map((s) => s + '[.]').join('[,]'));
        const _warn = w.console.warn; w.console.warn = () => {};   // the guard warns by design
        const rev = w.xapiResponse(suf, k, { pairs: [{ source: q.correctAnswers[0].target, target: q.correctAnswers[0].source }] }).response;
        w.console.warn = _warn;
        ok(c, 'direction guard swaps a reversed pair ' + suf + '/' + k, rev.includes(q.correctAnswers[0].source + '[.]' + q.correctAnswers[0].target));
      } else if (q.questionType === 'performance') {
        const resp = w.xapiResponse(suf, k, { steps: m.steps.map((s) => s.correctAnswer) }).response;
        const canon = m.steps.map((s) => s.name + '[.]' + s.correctAnswer).join('[,]');
        ok(c, 'H10 performance canonical ' + suf + '/' + k, resp === canon, resp + ' vs ' + canon);
      }
    }
  }
  const warned = []; w.console.warn = (...a) => warned.push(a.join(' '));
  const h13 = (META[c].subContent || []).find((it) => (it.questions || []).some((q) => q.questionType === 'choice'));
  if (h13) w.xapiResponse(h13.id.replace(/\/$/, '').slice(-3), h13.questions.find((q) => q.questionType === 'choice').questionId.split('/').pop(), { choices: ['לא קיים'] });
  ok(c, 'H13 an unresolvable UI text warns', warned.some((s) => s.includes('not in metadata')) || !h13);

  /* 4d — resume stage A round trip */
  r = loadPart(c); w = r.w;
  w.goTo(screens[Math.min(1, screens.length - 1)]);
  w.XAPI_Q_RESULTS['001/q1'] = true;
  const payload = JSON.parse(JSON.stringify(w.capturePartPayload()));
  ok(c, 'resume: payload carries currentScreen and qResults', payload.currentScreen === screens[Math.min(1, screens.length - 1)] && payload.qResults['001/q1'] === true);
  const r3 = loadPart(c); const w3 = r3.w;
  w3.applyResumeVars(payload); w3.goTo(payload.currentScreen); w3.applyResumeVars(payload);
  ok(c, 'resume: capture → fresh page → restore → capture is identical', JSON.stringify(w3.capturePartPayload()) === JSON.stringify(payload));
  ok(c, 'resume: no console.error', r3.errors.length === 0, r3.errors.slice(0, 2).join(' | '));

  /* 4e — painter-never-throws sweep (guide §8.8 rule 7): force every question into the answered state,
     restore into a fresh page, walk every screen with the painter running on each goTo. */
  const r4 = loadPart(c); const w4 = r4.w;
  const snap = JSON.parse(JSON.stringify(w4.capturePartPayload()));
  (function force(o) {
    Object.keys(o).forEach(function (k) {
      if (k === 'done') o[k] = true;
      else if (k === 'phase') o[k] = 'correct';
      else if (o[k] && typeof o[k] === 'object') force(o[k]);
    });
  }(snap));
  w4._resumeReady = true;
  try { w4.applyResumeVars(snap); w4.applyResumeDom(snap); } catch (e) { ok(c, 'sweep: applyResume* throws', false, String(e)); }
  for (const n of screens) { try { w4.goTo(n); w4.restoreScreenUI(n); } catch (e) { ok(c, 'sweep: goTo/restoreScreenUI(' + n + ') throws', false, String(e)); } }
  ok(c, 'sweep: no [resume] / [paint] console.error with every question forced done', !r4.errors.some((e) => /\[resume\]|paint/.test(e)), r4.errors.filter((e) => /\[resume\]|paint/.test(e)).slice(0, 3).join(' | '));
  ok(c, 'sweep: no other console.error', r4.errors.length === 0, r4.errors.slice(0, 2).join(' | '));
  /* and the same sweep on a pristine payload — the painter runs on every navigation (§8.4a) */
  const r5 = loadPart(c); const w5 = r5.w; w5._resumeReady = true;
  for (const n of screens) { try { w5.goTo(n); } catch (e) { ok(c, 'sweep(clean): goTo(' + n + ') throws', false, String(e)); } }
  ok(c, 'sweep(clean): no console.error', r5.errors.length === 0, r5.errors.slice(0, 2).join(' | '));
}

/* ══════════════════ 5. score contract (MOE QA runbook §4 "ציון ומעבר") ══════════════════
   2026-11-09, fixes 1/2/5 of the 08.11 sheet. For a part that promises K of N on its first screen:
   success and score.scaled come from one count of the N threshold questions only (the harder set
   never enters), success ⇔ scaled ≥ K/N, and below K the part ends at the gate — one completed
   success:false, the button disabled, the harder screens never reached — also after a reload.
   threshold / challenge: the progress maps and their keys; gate: the last threshold screen. */
const SCORE_CONTRACT = {
  '03': { K: 4, N: 5, threshold: ['stationProgress', [1, 2, 3, 4, 5]], challenge: ['stationProgressSetB', [1, 2]],
          gate: { screen: 5, btn: 's5-check', cont: 's5Continue', done: 's5Done', next: 6 } }
};
section('5. score contract');
function scSet(w, sc, correct, challengeOk) {
  const [tm, tk] = sc.threshold, [cm, ck] = sc.challenge;
  tk.forEach((k, i) => w.eval(tm + '[' + JSON.stringify(k) + '] = ' + JSON.stringify(i < correct ? 'success' : 'fail')));
  ck.forEach((k) => w.eval(cm + '[' + JSON.stringify(k) + '] = ' + JSON.stringify(challengeOk ? 'success' : 'fail')));
}
function scRecorder(w, c) {
  const sent = []; let doc = null;
  w.METADATA = META[c]; w.XAPI_USING_G = true; w.xapiItemAnswered = {}; w.xapiCompletedObjects = {};
  w.sendStatement720 = (verb, type, result, ctx) => sent.push({ verb, result: result || null, ctx: ctx || null });
  w.loadState720 = () => doc;
  w.saveState720 = (id, o) => { doc = JSON.parse(JSON.stringify(o)); return true; };
  w.saveState720Debounced = (id, o) => { doc = JSON.parse(JSON.stringify(o)); };
  w.readUnitState(); w._resumeReady = true;
  return { sent, doc: () => doc, comps: () => sent.filter((s) => s.verb === 'completed' && !(s.ctx && s.ctx.objectId)) };
}
if (JSDOM) for (const c of Object.keys(SCORE_CONTRACT)) {
  const sc = SCORE_CONTRACT[c];
  const r = loadPart(c); const w = r.w;
  for (let k = 0; k <= sc.N; k++) for (const chal of [false, true]) {
    scSet(w, sc, k, chal);
    const res = w.xapiPartResult();
    const tag = k + '/' + sc.N + (chal ? ' + harder all right' : ' + harder all wrong');
    ok(c, 'result ' + tag + ': success = correct ≥ ' + sc.K, res.success === (k >= sc.K), JSON.stringify(res));
    ok(c, 'result ' + tag + ': scaled = correct / ' + sc.N + ' (harder set not counted)', Math.abs(res.score.scaled - k / sc.N) < 1e-9, JSON.stringify(res));
    ok(c, 'result ' + tag + ': success ⇔ scaled ≥ K/N', res.success === (res.score.scaled >= sc.K / sc.N - 1e-9));
  }
  /* the gate, K−1 and K (runbook §4: one round with Y−1 correct, one with Y) */
  for (const k of [sc.K - 1, sc.K]) {
    const rg = loadPart(c); const wg = rg.w; const rec = scRecorder(wg, c);
    scSet(wg, sc, k, false); wg.eval(sc.gate.done + ' = true'); wg.goTo(sc.gate.screen);
    const btn = wg.document.getElementById(sc.gate.btn);
    wg[sc.gate.cont](); wg[sc.gate.cont]();
    const comps = rec.comps(); const at = wg.eval('currentScreen');
    if (k < sc.K) {
      ok(c, 'gate ' + k + '/' + sc.N + ': exactly one completed for two clicks', comps.length === 1, String(comps.length));
      ok(c, 'gate ' + k + '/' + sc.N + ': completed success:false, scaled ' + (k / sc.N), comps[0] && comps[0].result.success === false && Math.abs(comps[0].result.score.scaled - k / sc.N) < 1e-9, JSON.stringify(comps[0] && comps[0].result));
      ok(c, 'gate ' + k + '/' + sc.N + ': stays on the gate screen, harder screens not shown', at === sc.gate.screen, String(at));
      ok(c, 'gate ' + k + '/' + sc.N + ': button disabled, aria-disabled', btn && btn.disabled && btn.getAttribute('aria-disabled') === 'true');
      /* reload with the ledger and the saved progress: the gate still holds, nothing is sent again */
      const payload = JSON.parse(JSON.stringify(wg.capturePartPayload()));
      const rr = loadPart(c); const wr = rr.w; const saved = rec.doc();
      const rec2 = scRecorder(wr, c); wr.loadState720 = () => saved; wr.readUnitState();
      wr.applyResumeVars(payload); wr.goTo(sc.gate.screen);
      const btnR = wr.document.getElementById(sc.gate.btn);
      ok(c, 'gate resume: button disabled after a reload with the ledger', btnR && btnR.disabled, btnR && btnR.textContent);
      wr[sc.gate.cont]();
      ok(c, 'gate resume: no second completed, still on the gate screen', rec2.comps().length === 0 && wr.eval('currentScreen') === sc.gate.screen);
      ok(c, 'gate resume: no console.error', rr.errors.length === 0, rr.errors.slice(0, 2).join(' | '));
    } else {
      ok(c, 'gate ' + k + '/' + sc.N + ': no completed, continues to screen ' + sc.gate.next, comps.length === 0 && at === sc.gate.next, comps.length + ' @' + at);
    }
    ok(c, 'gate ' + k + '/' + sc.N + ': no console.error', rg.errors.length === 0, rg.errors.slice(0, 2).join(' | '));
  }
}

/* ═══════════════════════════════ summary ═══════════════════════════════ */
console.log('\n' + pass + ' passed, ' + failures.length + ' failed' + (skipped ? ', ' + skipped + ' skipped' : ''));
if (failures.length) { console.log('\nFAILURES'); for (const f of failures) console.log(f); process.exit(1); }
/* jsdom windows keep timers alive (gesture hints, avatar bubbles) — exit explicitly. */
process.exit(0);
