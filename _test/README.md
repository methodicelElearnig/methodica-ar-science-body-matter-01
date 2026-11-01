# `_test/` — methodica-ar-science-body-matter-01

Dev-only. Never shipped (`docs-and-tools/package-allowlist.ps1` keeps it out of every package).

## Files

| File | What |
|---|---|
| `verify-assets.js` | Asset contract (guide §15): case-exact resolution of every HTML/CSS/JS reference, `?v=` on every code reference (one value per file across parts), no hoisted file grown back, ASCII/lower-case paths, no folder URLs, no orphan asset. Static, no dependencies. |
| `verify-report.js` | The reporting / issue-report / resume layer: catalogue identity, per-part wiring (script order, boot cover, dialogs, `SCREEN_TO_SUBCONTENT` ↔ DOM ↔ catalogue, `XAPI_EVAL_ITEMS`, no cross-part hop, no `window.close`), the **response-layer checks H1–H13** (spec objects at every `xapiAnswered`, one call site per declared question, canonical `response` strings round-tripped from the catalogue), and a jsdom runtime group (regression gate without the library, statement flow with an inline recorder, D-8 ended button, resume stage-A round trip). |
| `xapi-720-k.js` | Local stand-in for the CDN library, loaded only via `?xapiLib=../_test/xapi-720-k.js` on `localhost` (the loader honours it nowhere else). Records statements (`__stmts()`, `__dupes()`), holds the state document in `sessionStorage` (`__state()`, `__reset()`, `__failWrites()`). From methodica-math-ratio-01. |

## Run

jsdom (~26 MB) must live **outside** this OneDrive-synced tree:

```bash
mkdir -p /tmp/lomda-test && cd /tmp/lomda-test && npm install jsdom
```

Then, from the unit root:

```bash
node _test/verify-assets.js
```

```bash
NODE_PATH=/tmp/lomda-test/node_modules node _test/verify-report.js
```

Without jsdom the static groups still run and the runtime group is skipped. A built package can be
checked instead of the repo: `node _test/verify-report.js ../../deployments/<date>`.

The metadata itself is checked by `python -I -X utf8 docs-and-tools/check-metadata.py` (rules
R1–R8 of `docs-and-tools/METADATA-AUDIT.md`, rebuilds every answer text from the DOM).

## Local stub walk

Serve the **parent** folder (the CDN serves the unit under a subpath, and `../unit-assets/…` must
resolve from one) and open a part with the stub and a fake registration:

```
http://localhost:5555/methodica-ar-science-body-matter-01/methodica-ar-science-body-matter-01-01/index.html?xapiLib=../_test/xapi-720-k.js&registration=DEADBEEF-QA&resetState
```

`?dev=1` (without `registration`) opens the cross-part hops for a walkthrough; `?resetState` wipes
the document. In the console: `__stmts()`, `__dupes()`, `__state()`.

## Negative tests

Every assertion added here was broken on purpose once and seen to fail (guide §10.4): a wrong
path, a differing `?v=`, a case change, a re-grown copy (`verify-assets.js`); a swapped
source/target at a call site, a renamed option, a re-typed question (`verify-report.js` H2/H9/H13).
