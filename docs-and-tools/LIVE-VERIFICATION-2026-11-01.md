# Live verification — first Arabic package with reporting and resume, 2026-11-01

Package `../../deployments/2026-11-01` (commit `5cdfed4`), uploaded to
`https://lomdot.education.gov.il/metodica/720/ar/science/body-matter/01/`.

## CDN upload

All 135 package files fetched from the CDN and compared by byte size with the package: **0 mismatches**
(the CDN answers 200 with an empty body for missing paths, so size is the test).

## KATA

The seven Arabic components (31 items) sit inside the Hebrew unit `methodica-science-body-matter-01`
(created 2026-11-01, `send-metadata-2026-11-01-create.log`). All seven are **`draft`**; the Hebrew
components are `published`.

Launch links: `Tools/full-kata-link/New-KataLaunchLinks.ps1 -InputFile components-methodica-ar-science-body-matter-01.txt
-StudentId VADIM-AR-BM01 -ResetState` — 7 of 7 OK.

## Live run (in-app browser, real CDN library `720active/common/xapi-720-k.js`)

| Part | Checked |
|---|---|
| 01 | Metadata `…/methodica-ar-science-body-matter-01-01/` (11 items); state 404 on first launch (new attempt), statements 200; character chosen and saved (204); screen 11 YouTube embed `youtube-nocookie.com/embed/CASpdvCI9eQ` |
| 02–06 | Each loads its own Arabic metadata; statements 200; state load OK; character from part 01 (`character-1`) adopted; no failed requests other than the expected first-launch state 404 |
| 03 | Screen 4 (item 004, performance): dropdowns "خصائص" / "وظيفة" → `answered.last`, response `القائمة 1[.]خصائص[,]القائمة 2[.]وظيفة`, success true — identical to KATA's `correctXapiResponsesPattern`; state saved 204 |
| 07 | Screen 1: hint → `requested.1`; wrong answer → `answered`, response `مسحوق أ`, success false, questionId `…/methodica-ar-science-body-matter-01-07-001/q1`; statements 200, state 204. **Reload of the same launch link: state load 200, screen 1 restored with the selection, the wrong-answer feedback and the retry gate (check disabled).** |

## Not checked here

- A full walk of every screen, and the part finish (`completed` on the component).
- 01-02 item 004 drag in Chrome and Edge.
- The report modal was not submitted (it posts to the shared Google Form).
- Publishing the Arabic components in KATA (`draft` → `published`).
