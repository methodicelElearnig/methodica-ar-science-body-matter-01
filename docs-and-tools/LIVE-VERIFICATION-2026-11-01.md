# Live verification — first Arabic package with reporting and resume, 2026-11-01

Package `../../deployments/2026-11-01` (commit `5cdfed4`), uploaded to
`https://lomdot.education.gov.il/metodica/720/ar/science/body-matter/01/`.

## CDN upload

All 135 package files fetched from the CDN and compared by byte size with the package: **0 mismatches**
(the CDN answers 200 with an empty body for missing paths, so size is the test).

## KATA

The seven Arabic components (31 items) sit inside the Hebrew unit `methodica-science-body-matter-01`
(created 2026-11-01, `send-metadata-2026-11-01-create.log`). Created as `draft`; after the live run
below they were **published** with `send-metadata.ps1 -Publish` (`publish-components-2026-11-01.log`:
published=7, read-back-not-published=0). A separate GET of the unit afterwards: 14 components, all
`published` (7 Hebrew, 7 Arabic), unit status `ready`.

Launch links: `Tools/full-kata-link/New-KataLaunchLinks.ps1 -InputFile components-methodica-ar-science-body-matter-01.txt
-StudentId VADIM-AR-BM01 -ResetState` — 7 of 7 OK.

## Live run (in-app browser, real CDN library `720active/common/xapi-720-k.js`)

| Part | Checked |
|---|---|
| 01 | Metadata `…/methodica-ar-science-body-matter-01-01/` (11 items); state 404 on first launch (new attempt), statements 200; character chosen and saved (204); screen 11 YouTube embed `youtube-nocookie.com/embed/CASpdvCI9eQ` |
| 02–06 | Each loads its own Arabic metadata; statements 200; state load OK; character from part 01 (`character-1`) adopted; no failed requests other than the expected first-launch state 404 |
| 03 | Screen 4 (item 004, performance): dropdowns "خصائص" / "وظيفة" → `answered.last`, response `القائمة 1[.]خصائص[,]القائمة 2[.]وظيفة`, success true — identical to KATA's `correctXapiResponsesPattern`; state saved 204 |
| 07 | Screen 1: hint → `requested.1`; wrong answer → `answered`, response `مسحوق أ`, success false, questionId `…/methodica-ar-science-body-matter-01-07-001/q1`; statements 200, state 204. **Reload of the same launch link: state load 200, screen 1 restored with the selection, the wrong-answer feedback and the retry gate (check disabled).** |

## Full click-through, all seven parts finished

Fresh launch links for a new student, `New-KataLaunchLinks.ps1 … -StudentId VADIM-AR-BM01-FULL -ResetState`
(7 of 7 OK). Every screen of every part was walked in the in-app browser against the live CDN and
KATA, each part through to its finish; requests were logged in the page.

| Part | Items | Checked on the way | Component `completed` |
|---|---|---|---|
| 01 | 001–011 (003 skipped: "read myself" path) | character chosen (`character-2`); 005 dropdowns; 007 drag wrong → partial feedback → corrected; 011 drag | success true, score 1 |
| 02 | 001–005 | character from 01 adopted; 001/q2 wrong → hint (`requested`) → correct; 003 multi-select wrong → correct; 004 flipped-card drag, card text not mirrored | success true, score 1 |
| 03 | 001–007 | 002 hint; 004 dropdowns wrong (`القائمة 1[.]لون…`, false) → correct; 006–007 bonus questions | success true, score 1 |
| 04 | 001 | classroom task | success true (no score) |
| 05 | 001–005 | bottles-lab applet: Arabic, `lang="ar"`, no Hebrew, glass + drop test works; 004 response `عيّنة أ[.]نافذة شفافة…`; 005 four sneaker hotspots | success true, score 1 |
| 06 | 001 (q1–q4) | q4 response = metadata targets, byte for byte | success true, score 1 |
| 07 | 001 (q1–q4) | all answers per metadata; **reload after the finish: state 200, last screen restored with feedback, finish disabled** | success true, score 1 |

Every statement returned 200 and every state save 204; the only non-2xx was the expected state 404 on
each part's first launch. Every `answered` response was in Arabic, matching the metadata strings.

Note: with the Browser pane hidden, the 05 applet iframes (`loading="lazy"`) stay `about:blank`;
forced to load, the applet works. This is the hidden pane, not the package.

## Not checked here

- 01-02 item 004 drag in Chrome and Edge with a real mouse (Vadim checks it).
- The report modal was not submitted (it posts to the shared Google Form).
- The video path of 01 (screens 3/10) beyond the embed id.
