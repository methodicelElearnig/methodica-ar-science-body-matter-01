# Live verification — `selected` / learning-type on the part-01 choice, 2026-11-02

Package `../../deployments/2026-11-02` (commit `1314dec`; the fix is `8be9ed7`). Arabic twin of
`methodica-science-body-matter-01` (live 02.11.26), which answered the monday.com issue of 28.10.26: the
choice between video and reading sent no `selected`. Guide:
`Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md` §6.3a.

## CDN upload

All 9 files are **byte-identical** to the package (cache-busted downloads compared with `cmp`):

| File | Bytes |
|---|---|
| `unit-js/20-xapi.js` | 40,527 |
| `-01/script.js` | 139,447 |
| `-01/index.html` | 101,182 |
| `-02/index.html` | 83,413 |
| `-03/index.html` | 61,629 |
| `-04/index.html` | 14,256 |
| `-05/index.html` | 61,382 |
| `-06/index.html` | 40,187 |
| `-07/index.html` | 36,918 |

The live metadata `metadata/methodica-ar-science-body-matter-01-01.json` (20,267 bytes) is unchanged and
identical to the package: 003 `video`, 004 `text` — the values the statement's `response` copies.
The 27 CSS/SVG files that differ from the package in line endings only (DEPLOY.md) were not re-uploaded.

## Live part 01 (CDN page, `sendStatement720` captured in the page — nothing sent to Kata)

`https://lomdot.education.gov.il/metodica/720/ar/science/body-matter/01/methodica-ar-science-body-matter-01-01/index.html`

- Loads `../unit-js/20-xapi.js?v=20261102` and `script.js?v=20261102`; `xapiSelectedLearningType` and
  `XAPI_LEARNING_PATHS` (`video` → 003 `video`, `read` → 004 `text`) are present.
- s3: two card clicks → **no** `selected`.
- "اخترتُ" on video → s10 and **one** statement: verb `selected`, objectType `onlinelesson` (the library
  uses the component id), `{ category: 'learning-type' }`, `result.response` = **`video`**.
- Back to s3, "اخترتُ" again → nothing (picks ledger).
- Toggle to reading → s4 and **one** `selected`, `response` = **`text`**.
- Toggle back to video → s10 and nothing (already reported).
- Item statements unchanged: 002 on s3, 003 on s10, 004 on s4.

## Not checked here

- The statement as stored in Kata — a platform launch (`?slxapi=`) is needed; the platform team checks it
  after our notice (`Documentation/MOE/NOTE-TO-PLATFORM-selected-learning-type-2026-11-02.md`).
- How the platform / bot reads `response` = `mediaFormat` (agreed deviation from v2.7's `contentType`).
