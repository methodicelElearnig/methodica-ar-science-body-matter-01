# Translation export report — methodica-science-body-matter-01

Generated 2026-10-13 from `translation-export-prompt-template-v2.md`. Source language `he` (RTL). All `<target>` elements are empty. No production file was modified.

## 1. Scope and decisions

- **Module root:** `…/720 Science/יעד 11/methodica-science-body-matter-01` · **Target number:** `01` · **Parts requested:** none were listed, so the part list was derived from the folder structure.
- **Parts found (7):** `01`, `02`, `03`, `04`, `05`, `06`, `07` — each is `{module}-{NN}/` with `index.html`, `script.js`, `styles.css`, `index_dev.html`, `assets/`. This repo uses a flat layout (`script.js`, not `js/main.js`), so `script.js` plus inline `<script>` blocks were the JS scanned.
- **Module-root launcher:** the repo root contains **no `index.html`** (only the 7 part folders, a `.pptx` and local `.md` files), so pseudo-part `00` / screen `99` is **empty**. Nothing was invented for it. If an LMS-entry page is added later it will need its own `01-00-99-*` units.
- **Prior export:** none found (no `.xlf` in the repo, git history, or `720 Transilation`). This is a first export, so the refresh workflow (§7 of the prompt) and the ID-change mapping table do not apply.
- **Screen numbering:** the project's own `data-screen="N"` was used, unchanged. Every part is contiguous `0..N` and sequential in the file, so flow order = `data-screen` order (also in the manifest `flow_order` column). **Note for part 02:** its `data-screen` values `0–7` sit on DOM ids `#s21…#s28` (a late-appended range). The XLIFF id uses `data-screen` (e.g. `01-02-03` = `#s24`); the manifest `container_or_selector` column gives the DOM id.
- **Pseudo-screens:** `99` = a part's shared chrome (page `<title>`, flag button, image-zoom dialog, part-wide hint/info popups not tied to one screen, shared JS strings). `98` (part 05 only) = the embedded **bottle-lab applet** (`יישומון יעד 11 מעבדת הבקבוקים/index.html`, loaded in iframes on screens 1–5 and in the zoom overlay). Its learner-visible Hebrew would otherwise have been missed. `98` is an exporter choice — please confirm it.
- **Popups/overlays outside a `.screen`:** attributed to a screen when their DOM id starts with that screen's prefix (`s2-…`, `dqx28-…`), otherwise `99`.
- **Storage conventions:** HTML inline markup (`<b>`, `<br/>`, `<span …>`) is kept as escaped literal text in `<source>`. JS string literals are stored exactly as written between the quotes, **including JS escapes** (`\n` = line break, `\'` = quote) — translators must keep them. Multi-line HTML elements are joined onto one line (see §9). `xml:space="preserve"` is set on every unit (some JS sources start with a space). No `target-language` attribute is set because none was specified.
- **Placeholders (one form used throughout):** `{dropzone:ID}` = an empty drag-and-drop target `<span>` with event handlers inside a sentence (7 units); `{name}` = a runtime-concatenated JS value (1 unit: `{m}`). Keep the braces; position matters. No tooltip-word markup exists in this lomda, so `{tooltip:…}` is unused.

## 2. Totals

- Screens (manifest rows, incl. pseudo-screens): **67**
- Translation units: **1588**

| Part | Screens | Units |
|---|---:|---:|
| 01 | 22 | 299 |
| 02 | 9 | 337 |
| 03 | 10 | 302 |
| 04 | 3 | 20 |
| 05 | 11 | 266 |
| 06 | 6 | 216 |
| 07 | 6 | 148 |

### Units by source file

| File | Units |
|---|---:|
| `methodica-science-body-matter-01-01/index.html` | 216 |
| `methodica-science-body-matter-01-01/script.js` | 83 |
| `methodica-science-body-matter-01-02/index.html` | 217 |
| `methodica-science-body-matter-01-02/script.js` | 120 |
| `methodica-science-body-matter-01-03/index.html` | 181 |
| `methodica-science-body-matter-01-03/script.js` | 121 |
| `methodica-science-body-matter-01-04/index.html` | 20 |
| `methodica-science-body-matter-01-05/index.html` | 153 |
| `methodica-science-body-matter-01-05/script.js` | 86 |
| `methodica-science-body-matter-01-05/יישומון יעד 11 מעבדת הבקבוקים/index.html` | 27 |
| `methodica-science-body-matter-01-06/index.html` | 137 |
| `methodica-science-body-matter-01-06/script.js` | 79 |
| `methodica-science-body-matter-01-07/index.html` | 82 |
| `methodica-science-body-matter-01-07/script.js` | 66 |

### Units by source kind

- `html-text`: 822
- `html-attr`: 198
- `js`: 568

### Units by screen

| Screen id | Type | Title | Units |
|---|---|---|---:|
| 01-01-00 | TwoOptionSelection | בחירת דמות מלווה (TwoOptionSelection) | 5 |
| 01-01-01 | HookOpenQuestion | שאלה פתוחה עם שדה כתיבה חופשי | 16 |
| 01-01-02 | TransitionScreen | מסך מעבר (TransitionScreen) | 5 |
| 01-01-03 | TwoOptionSelection | בחירת מסלול למידה: וידאו/קריאה (TwoOptionSelection) | 9 |
| 01-01-04 | FlipCardsReveal | קלפים מתהפכים (FlipCardsReveal) | 13 |
| 01-01-05 |  | "גוף אחד - חומרים רבים" (Text Content Layout + כרטיסים) | 14 |
| 01-01-06 |  | "תכונות" (2 כרטיסי מידע) | 8 |
| 01-01-07 | FlipCardsReveal | הקדמה לניסוי חוט הנחושת | 12 |
| 01-01-08 | DropdownQuestion | שאלת תפריט נפתח (Dropdown), חוט נחושת | 33 |
| 01-01-09 | TransitionScreen | מסך מעבר: מסקנה (TransitionScreen) | 5 |
| 01-01-10 | VideoWatchAndContinue | צפייה בסרטון (VideoIntro) | 11 |
| 01-01-11 | VideoWatchAndContinue | התכנסות נתיבים: "אותו חומר - מה בכל זאת שונה?" | 4 |
| 01-01-12 |  | גוף מעובד או גוף שאינו מעובד? | 8 |
| 01-01-13 | DragAndDropQuestion | שאלת גרירה: גוף מעובד/לא מעובד (DragAndDropQuestion) | 35 |
| 01-01-14 |  | סיכום מושגים | 4 |
| 01-01-15 | TransitionScreen | מסך מעבר: טבלאות ותרשימי זרימה | 4 |
| 01-01-16 |  | טבלת השוואה: 2 חוטי נחושת (2026-08-03) | 18 |
| 01-01-17 |  | מסך 18 (s17) — תרשים זרימה: גוף/חומר/תכונה | 16 |
| 01-01-18 | TransitionScreen | מסך מעבר "חימום" לפני שתי שאלות התרגול | 5 |
| 01-01-19 | SingleChoiceQuestion | שאלה רב-ברירה מלווה בתמונה (שאלה 1/2) | 29 |
| 01-01-20 | DragAndDropQuestion | שאלת גרירה טקסטואלית מלווה בתמונה (שאלה 2/2) | 38 |
| 01-01-99 |  | Global / shared chrome (title, flag button, report & zoom modals, shared JS strings) | 7 |
| 01-02-00 | TransitionScreen | מסך מעבר לפני תרגול סטנדרטי (5 שאלות) | 5 |
| 01-02-01 |  | מסך הוטספוטים (3 חומרים, שקף 35) | 18 |
| 01-02-02 | SingleChoiceQuestion | שאלה 1 סעיף א' מתוך 5 (בחירה יחידה + טבלה) | 45 |
| 01-02-03 | SingleChoiceQuestion | שאלה 1 סעיף ב' מתוך 5 (בחירה יחידה + טבלה) | 44 |
| 01-02-04 | SingleChoiceQuestion | שאלה 2 מתוך 5 (בחירה יחידה + תמונה) | 35 |
| 01-02-05 | MultipleChoiceQuestion | שאלה 3 מתוך 5 (בחירה מרובה + טבלה) | 58 |
| 01-02-06 | DragAndDropQuestion | שאלה 4 מתוך 5 (גרירה + היפוך קלפים, שקפים 40-41) | 56 |
| 01-02-07 | DragAndDropQuestion | שאלה 5 מתוך 5 (גרירה לתוך טבלה, שקף 42) | 69 |
| 01-02-99 |  | Global / shared chrome (title, flag button, report & zoom modals, shared JS strings) | 7 |
| 01-03-00 | TransitionScreen | מסך מעבר לפני תרגול (6 שאלות), שקף 44 | 5 |
| 01-03-01 | MultipleChoiceQuestion | שאלה 1 מתוך 5 (בחירה מרובה + תמונה, שקף 45) | 43 |
| 01-03-02 | MultipleChoiceQuestion | שאלה 2 מתוך 5 (בחירה מרובה + תמונה, שקף 46) | 49 |
| 01-03-03 | SingleChoiceQuestion | שאלה 3 מתוך 5 (בחירה יחידה + טבלה, שקף 47) | 37 |
| 01-03-04 | DropdownQuestion | שאלה 4 מתוך 5 (תפריט נפתח, שקף 48) | 46 |
| 01-03-05 | SingleChoiceQuestion | שאלה 5 מתוך 5 (בחירת תמונה, שקף 49) | 33 |
| 01-03-06 | TransitionScreen | מסך מעבר: דמות + בועית (סיום התרגול הבסיסי, שקף 50) | 6 |
| 01-03-07 | SingleChoiceQuestion | שאלה 1 מתוך 2 (בחירה יחידה + תמונה, שקף 51) | 25 |
| 01-03-08 |  | שאלה 2 מתוך 2 (גרירה למיון + טבלה, שקף 52) | 51 |
| 01-03-99 |  | Global / shared chrome (title, flag button, report & zoom modals, shared JS strings) | 7 |
| 01-04-00 | TransitionScreen | מסך מעבר: סיום תרגול, פתיחה למשימת כיתה (שקף 54) | 5 |
| 01-04-01 |  | משימת כיתה (שקף 55) | 9 |
| 01-04-99 |  | Global / shared chrome (title, flag button, report & zoom modals, shared JS strings) | 6 |
| 01-05-00 | TransitionScreen | מסך מעבר לפני תרגול מתקדם (4 שאלות), שקף 57 | 5 |
| 01-05-01 |  | מעבדת הבקבוקים: משימה מלווה ביישומון (שקף 58) | 14 |
| 01-05-02 | SingleChoiceQuestion | שאלה 1 מתוך 4 (בחירה יחידה + יישומון, שקף 59) | 24 |
| 01-05-03 |  | מעבדת הבקבוקים: קולקציית משרד (שקף 60) | 14 |
| 01-05-04 | SingleChoiceQuestion | שאלה 2 סעיף א' מתוך 4 (בחירה יחידה + יישומון, שקף 61) | 24 |
| 01-05-05 | DragAndDropQuestion | שאלה 2 סעיף ב' מתוך 4 (גרירת השלמת משפטים + יישומון, שקף 62) | 34 |
| 01-05-06 | SingleChoiceQuestion | שאלה 3 מתוך 4 (בחירה יחידה + טבלה, שקף 63) | 49 |
| 01-05-07 | DragAndDropQuestion | שאלה 4 מתוך 4 (שאלת התאמה, שקף 64) | 38 |
| 01-05-08 |  | הוטספוטים (4 חומרים בנעל ריצה, שקף 65) | 23 |
| 01-05-98 | Applet (embedded iframe) | יישומון מעבדת הבקבוקים (מוטמע ב-iframe במסכים 1-5 של חלק 05) | 27 |
| 01-05-99 |  | Global / shared chrome (title, flag button, report & zoom modals, shared JS strings) | 14 |
| 01-06-00 | TransitionScreen | מסך מעבר לפני שאלת השיא (שקף 67) | 6 |
| 01-06-01 | SingleChoiceQuestion | שאלת שיא מועד א, סעיף א' (בחירה יחידה + טבלה, שקף 68) | 50 |
| 01-06-02 | DropdownQuestion | שאלת שיא מועד א, סעיף ב' (תפריט נפתח + תמונה, שקף 69) | 52 |
| 01-06-03 | SingleChoiceQuestion | שאלת שיא מועד א, סעיף ג' (בחירה יחידה + טבלה, שקף 70) | 48 |
| 01-06-04 | DragAndDropQuestion | שאלת שיא מועד א, סעיף ד' (גרירת השלמת טענה + טבלה, שקף 71) | 53 |
| 01-06-99 |  | Global / shared chrome (title, flag button, report & zoom modals, shared JS strings) | 7 |
| 01-07-00 | TransitionScreen | מסך מעבר לפני שאלת השיא מועד ב (שקף 73) | 6 |
| 01-07-01 | SingleChoiceQuestion | שאלת שיא מועד ב, סעיף א' (בחירה יחידה + תמונה, שקף 74) | 31 |
| 01-07-02 | SingleChoiceQuestion | שאלת שיא מועד ב, סעיף ב' (בחירה יחידה + תמונה, שקף 75) | 31 |
| 01-07-03 | DropdownQuestion | שאלת שיא מועד ב, סעיף ג' (תפריט נפתח 3-בלוקים + תמונה, שקף 76) | 45 |
| 01-07-04 | SingleChoiceQuestion | שאלת שיא מועד ב, סעיף ד' (בחירה יחידה + תמונה, שקף 77) | 28 |
| 01-07-99 |  | Global / shared chrome (title, flag button, report & zoom modals, shared JS strings) | 7 |

## 3. Consolidated duplicates

**None consolidated** — every occurrence has its own unit, per §6 (contextual clarity over dedup). Heavy verbatim repetition is expected: 

| Text | Occurrences |
|---|---:|
| צדקתי? | 102 |
| המשך | 87 |
| מעבר לתשובה שלי | 71 |
| חזרה | 52 |
| התשובה לא נכונה. | 47 |
| שננסה שוב? | 42 |
| רמז | 36 |
| התשובה נכונה חלקית. | 30 |
| מעבר לתשובה הנכונה | 30 |
| גבוהה | 27 |
| מצוין! | 22 |
| שאלה 2 | 22 |

Where a unit duplicates another on the same line by design (`data-zoom-alt` and the image `alt` carry the same text; the flag button has the same text in `aria-label`, `title` and its visible label), both are kept as separate units and the `developer-note` says so.

## 4. Excluded (with reason)

| Category | Count | Reason |
|---|---:|---|
| HTML `onclick` with Hebrew argument | 4 | code; the argument is **logic-coupled** (see §7) |
| Bare numeric cells / axis values / row indices | 11 | no linguistic content (§5 exclusion rule). Note: decimal separators in table cells like `0.22` may need localisation by the translator/layout owner |
| `data-zoom-src` / `src` / `href` values containing Hebrew | 54 | asset file names (paths), not display text |
| Source-code comments containing Hebrew | 531 | comments quoting producer PPT notes/design history (HTML + JS) |
| Decorative `alt=""` images | 85 | decorative (`aria-hidden`/empty alt) — per part: 01: 33, 02: 12, 03: 12, 04: 2, 05: 6, 06: 11, 07: 9 |
| `console.*` diagnostics | 0 | none exist in this lomda |
| xAPI/analytics-only strings | 0 | none exist: no xAPI/SCORM/`sendBeacon`/`fetch` code in any part (traced by grep) |
| `index_dev.html` (7 files), `wireframe.html`, `images-brief.md`, `spec.md`, `ARCHITECTURE.md`, `PROJECT_BRIEF.md`, `Critical-requirement-lomda-building.md`, `styles.css` | — | authoring/dev material, not rendered to learners |
| `metadata/*.json` | — | no `metadata/` folder exists in this repo; nothing to localise |

Hebrew comment counts per file: `01/index.html`: 45; `01/script.js`: 95; `02/index.html`: 15; `02/script.js`: 63; `03/index.html`: 17; `03/script.js`: 55; `04/index.html`: 4; `04/script.js`: 17; `05/index.html`: 16; `05/script.js`: 55; `06/index.html`: 11; `06/script.js`: 53; `07/index.html`: 10; `07/script.js`: 36; `05/יישומון יעד 11 מעבדת הבקבוקים/index.html`: 39

Individually logged (small categories):

- `methodica-science-body-matter-01-01/index.html:627` — `onclick=s8DdSelect('guf','השתנו')`
- `methodica-science-body-matter-01-01/index.html:628` — `onclick=s8DdSelect('guf','לא השתנו')`
- `methodica-science-body-matter-01-01/index.html:640` — `onclick=s8DdSelect('homer','השתנו')`
- `methodica-science-body-matter-01-01/index.html:641` — `onclick=s8DdSelect('homer','לא השתנו')`
- `methodica-science-body-matter-01-01/index.html:1103` — `10`
- `methodica-science-body-matter-01-01/index.html:1104` — `50`
- `methodica-science-body-matter-01-02/index.html:495` — `2.0`
- `methodica-science-body-matter-01-02/index.html:495` — `8.0`
- `methodica-science-body-matter-01-02/index.html:496` — `0.22`
- `methodica-science-body-matter-01-02/index.html:496` — `0.90`
- `methodica-science-body-matter-01-03/index.html:724` — `40`
- `methodica-science-body-matter-01-03/index.html:725` — `120`
- `methodica-science-body-matter-01-05/index.html:615` — `1`
- `methodica-science-body-matter-01-05/index.html:624` — `2`
- `methodica-science-body-matter-01-05/index.html:633` — `3`

## 5. Out of scope (still needs translating by someone)

- **YouTube video** on part 01 screen 10 (`#s10-yt-player`, loaded through the YouTube IFrame API) — its caption/subtitle tracks live in YouTube, not in these files. The avatar `.mp4` loops (muted, `autoplay loop muted`) have no caption tracks.
- **Text baked into images** (`assets/images/*.png|svg`, e.g. the "שלוש אבקות" panel, tables and diagrams used as pictures). Hebrew inside raster images cannot be exported here and will need localised image variants. Not inspected pixel-by-pixel.
- The `.pptx` production script in the repo root is a source document, not part of the rendered lomda.

## 6. Manual-review items

### logic-coupled: value inside const S<n>_OPTIONS is compared by text (===) with the option the learner selected;… — 24 unit(s)

`01-03-04-020`, `01-03-04-021`, `01-03-04-022`, `01-03-04-023`, `01-03-04-024`, `01-03-04-025`, `01-06-02-020`, `01-06-02-021`, `01-06-02-022`, `01-06-02-023`, `01-06-02-024`, `01-06-02-025`, `01-06-02-026`, `01-06-02-027`, `01-06-02-028`, `01-07-03-015`, `01-07-03-016`, `01-07-03-017`, `01-07-03-018`, `01-07-03-019`, `01-07-03-020`, `01-07-03-021`, `01-07-03-022`, `01-07-03-023`

### logic-coupled: value inside const S<n>_CORRECT is compared by text (===) with the option the learner selected;… — 10 unit(s)

`01-01-08-014`, `01-01-08-015`, `01-03-04-026`, `01-03-04-027`, `01-06-02-029`, `01-06-02-030`, `01-06-02-031`, `01-07-03-024`, `01-07-03-025`, `01-07-03-026`

### logic-coupled: this visible text is also passed as an onclick argument and compared with a JS const; translate… — 8 unit(s)

`01-01-08-003`, `01-01-08-003`, `01-01-08-004`, `01-01-08-004`, `01-01-08-006`, `01-01-08-006`, `01-01-08-007`, `01-01-08-007`

### suffix concatenated at runtime to a (translated) feedback title; punctuation logic in fbCorrectShown() (trims … — 6 unit(s)

`01-01-99-007`, `01-02-99-007`, `01-03-99-007`, `01-05-99-014`, `01-06-99-007`, `01-07-99-007`

### looks like default placeholder text of a popup whose real title/body is written by JS at runtime; verify it is… — 6 unit(s)

`01-02-01-010`, `01-02-01-011`, `01-02-07-027`, `01-02-07-028`, `01-05-08-013`, `01-05-08-014`

### inserted at runtime into the sentence "נבחר בקבוק מ{m}. הבדיקות זמינות." via {m}; translate so the combined se… — 3 unit(s)

`01-05-98-015`, `01-05-98-016`, `01-05-98-017`

### very short sentence fragment glued to a dropdown blank (e.g. a prefix letter); the sentence may need restructu… — 1 unit(s)

`01-03-04-008`

### contains runtime placeholder(s); word order matters — 1 unit(s)

`01-05-98-018`

### runtime placeholder {m} is filled with one of the material names (the three JS units that precede it, e.g. "הז… — 1 unit(s)

`01-05-98-018`

Also flagged at screen level in the manifest: screen id `01-05-98` (embedded applet numbering).

## 7. Logic-coupled strings (correctness depends on displayed text)

720 templates normally key off `data-id` / DOM ids, so answer options can be translated freely. **Checked for exceptions — these exist:**

- **Dropdown "text-compare" questions** — the selected option text is compared with `===` against a JS constant: `S8_CORRECT` (part 01, screen 8), `S4_CORRECT`/`S4_OPTIONS` (part 03, screen 4), `S2_CORRECT`/`S2_OPTIONS` (part 06, screen 2), `S3_CORRECT`/`S3_OPTIONS` (part 07, screen 3). The option labels and the correct-answer constants **must be translated identically** (same target string in every occurrence).
- **Part 01 screen 8 additionally** passes the Hebrew option text as an `onclick` argument (`s8DdSelect('guf','השתנו')`, 4 occurrences, excluded in §4). That argument must also equal the translated constant. The visible `<li>` text units and the JS values are flagged `manual-review`. **A merge tool must also rewrite the `onclick` arguments** (or the dropdown will never match).
- **Not coupled (verified):** `DQX*_LABELS`, `ODDQ_LABELS`, `*_CORRECT_MAP` in the drag-and-drop screens are keyed by element id; correctness is decided by id, so those labels translate freely.
- **`fbCorrectShown()`** (one unit per part, screen 99): appends the unit " התשובה הנכונה מוצגת." to a feedback title at runtime after trimming trailing `space : , ;` and adding "." if no end punctuation exists. Translate the suffix so that it reads naturally after a translated sentence ending in `.`; the punctuation logic is Hebrew/Latin-punctuation specific. Part 05 also has three titles with the full sentence written out (`התשובה לא נכונה. התשובה הנכונה מוצגת.`).
- No literal Hebrew comparisons (`=== '…'`, `case '…'`, `.includes('…')`) exist in any `script.js` (grep-verified).

## 8. Likely content issues observed (flagged, not fixed)

- Part 02: `01-02-07-027/028` and `01-02-01-010/011` (+ part 05 `01-05-08-013/014`) — placeholder text "כותרת"/"תוכן" in popup markup; real content is injected by JS. Harmless if always overwritten; confirm.
- Part 03 `01-03-04-008`: the single letter "ה" is a sentence fragment glued in front of a dropdown blank; the sentence may need restructuring.
- Part 05 applet (`01-05-98-018`, `-015…-017`): material names are concatenated into a sentence with the Hebrew prefix "מ" — grammar will not survive a word-for-word translation.
- The DOM ids `#s21…#s28` in part 02 do not match the screen order (`data-screen` 0–7) — not an error, but easy to confuse.

## 9. Normalised (non byte-matching) strings

Sweep 1: **1548** of 1588 units match their source line byte-for-byte; **32** are multi-line HTML elements joined onto one line (indentation and newlines dropped, `<br>` kept, whitespace around `<br>` removed); **8** contain a placeholder; **0** mismatches.

| Unit | Class | Location | Detail |
|---|---|---|---|
| `01-01-01-001` | multi-line-join | `methodica-science-body-matter-01-01/index.html:115` |  |
| `01-01-02-002` | multi-line-join | `methodica-science-body-matter-01-01/index.html:185` |  |
| `01-01-04-005` | multi-line-join | `methodica-science-body-matter-01-01/index.html:299` |  |
| `01-01-04-008` | multi-line-join | `methodica-science-body-matter-01-01/index.html:320` |  |
| `01-01-06-002` | multi-line-join | `methodica-science-body-matter-01-01/index.html:464` |  |
| `01-01-06-003` | multi-line-join | `methodica-science-body-matter-01-01/index.html:475` |  |
| `01-01-09-002` | multi-line-join | `methodica-science-body-matter-01-01/index.html:693` |  |
| `01-01-12-003` | multi-line-join | `methodica-science-body-matter-01-01/index.html:842` |  |
| `01-01-12-005` | multi-line-join | `methodica-science-body-matter-01-01/index.html:851` |  |
| `01-01-12-006` | multi-line-join | `methodica-science-body-matter-01-01/index.html:860` |  |
| `01-01-13-001` | multi-line-join | `methodica-science-body-matter-01-01/index.html:900` |  |
| `01-01-14-002` | multi-line-join | `methodica-science-body-matter-01-01/index.html:1007` |  |
| `01-01-15-001` | multi-line-join | `methodica-science-body-matter-01-01/index.html:1042` |  |
| `01-01-17-001` | multi-line-join | `methodica-science-body-matter-01-01/index.html:1153` |  |
| `01-01-20-004` | placeholder | `methodica-science-body-matter-01-01/index.html:1392` | {dropzone:dqx20-target-1} |
| `01-01-20-005` | placeholder | `methodica-science-body-matter-01-01/index.html:1399` | {dropzone:dqx20-target-2} |
| `01-01-20-006` | placeholder | `methodica-science-body-matter-01-01/index.html:1406` | {dropzone:dqx20-target-3} |
| `01-02-02-007` | multi-line-join | `methodica-science-body-matter-01-02/index.html:145` |  |
| `01-02-03-006` | multi-line-join | `methodica-science-body-matter-01-02/index.html:253` |  |
| `01-02-04-006` | multi-line-join | `methodica-science-body-matter-01-02/index.html:360` |  |
| `01-02-05-006` | multi-line-join | `methodica-science-body-matter-01-02/index.html:461` |  |
| `01-02-07-006` | multi-line-join | `methodica-science-body-matter-01-02/index.html:737` |  |
| `01-05-01-006` | multi-line-join | `methodica-science-body-matter-01-05/index.html:96` |  |
| `01-05-01-010` | multi-line-join | `methodica-science-body-matter-01-05/index.html:103` |  |
| `01-05-02-005` | multi-line-join | `methodica-science-body-matter-01-05/index.html:166` |  |
| `01-05-03-010` | multi-line-join | `methodica-science-body-matter-01-05/index.html:255` |  |
| `01-05-04-005` | multi-line-join | `methodica-science-body-matter-01-05/index.html:313` |  |
| `01-05-05-006` | placeholder | `methodica-science-body-matter-01-05/index.html:398` | {dropzone:dqx5-target-1} {dropzone:dqx5-target-2} |
| `01-05-05-007` | placeholder | `methodica-science-body-matter-01-05/index.html:413` | {dropzone:dqx5-target-3} |
| `01-05-06-006` | multi-line-join | `methodica-science-body-matter-01-05/index.html:495` |  |
| `01-05-07-005` | multi-line-join | `methodica-science-body-matter-01-05/index.html:600` |  |
| `01-05-07-010` | multi-line-join | `methodica-science-body-matter-01-05/index.html:615` |  |
| `01-05-07-011` | multi-line-join | `methodica-science-body-matter-01-05/index.html:624` |  |
| `01-05-07-012` | multi-line-join | `methodica-science-body-matter-01-05/index.html:633` |  |
| `01-05-98-018` | placeholder | `methodica-science-body-matter-01-05/יישומון יעד 11 מעבדת הבקבוקים/index.html:425` | {m} |
| `01-06-03-005` | multi-line-join | `methodica-science-body-matter-01-06/index.html:293` |  |
| `01-06-04-005` | multi-line-join | `methodica-science-body-matter-01-06/index.html:399` |  |
| `01-06-04-006` | placeholder | `methodica-science-body-matter-01-06/index.html:404` | {dropzone:dqx4-target-1} |
| `01-06-04-007` | placeholder | `methodica-science-body-matter-01-06/index.html:411` | {dropzone:dqx4-target-2} {dropzone:dqx4-target-3} {dropzone:dqx4-target-4} |
| `01-07-01-005` | multi-line-join | `methodica-science-body-matter-01-07/index.html:78` |  |

## 10. Malformed or ambiguous structures

- None malformed. Ambiguities: the applet (`98`) numbering, the empty module root, and part 02 DOM ids (above).
- Screen attribution of JS strings is by the nearest preceding screen reference (`sN`, `dqxN`, …). Five JS strings in part 05's `oddq*` block (`updateQuestionNav('s7')`) sit far from the screen reference; they were checked by hand and belong to screen 7. Strings outside any screen are on `99`.
- Screen types are inferred from DOM roles/classes or from the template name written in the author's comment above each `<section>`; where neither is reliable the `screen-type` is left blank (not guessed).

## 11. Chrome checklist (per part, outside every `.screen`)

| Part | `<title>` | flag button (aria-label / title / label) | image-zoom dialog + close | popup not tied to one screen |
|---|---|---|---|---|
| 01 | yes | 3 units | yes | none |
| 02 | yes | 3 units | yes | none |
| 03 | yes | 3 units | yes | none |
| 04 | yes | 3 units | yes | none |
| 05 | yes | 3 units | yes | yes |
| 06 | yes | 3 units | yes | none |
| 07 | yes | 3 units | yes | none |

Not present anywhere in this lomda: a report-a-problem modal (the flag button has no JS handler — no `report` code in any `script.js`), a confirm-close modal, resume prompts. Progress-nav labels (`סעיף א'`, `שאלה 1`, …) are per-screen units with role `navigation-label`.

## 12. Validation results

- XML well-formed: **True** · unique ids: **True** · id shape `01-NN-NN-NNN`: **True**
- Every unit has exactly one `screen-id` note, and it equals the id prefix: **True**
- Manifest screens: **67**; screens in units but not in manifest: []; manifest screens without units: []
- All `<target>` empty: **True**
- `source-location` points at a real file and in-range line for every unit: **True**
- **Sweep 1 (every unit vs. its source line):** literal-on-line = 1548, multi-line-join = 32, placeholder = 8 (of 1588).
- **Sweep 2 (Hebrew in source not covered by a unit):** 1765 Hebrew-bearing fragments inspected (HTML text nodes, attribute values, JS string literals, residual code outside strings/comments). Covered by a unit at the same location: **1707**. Deliberate exclusions: **58** (event-handler arguments and asset paths). Fragments inside **comments**: counted separately (**531** comment blocks, not fragments). **Uncovered (genuine misses): 0**.
  The sweep was tested by deleting 3 units from a copy of the XLIFF: it reported all of them as misses.
- The sweep matches by **location** (a unit must exist near the fragment's line and contain it), so a new button whose label already exists elsewhere is still detected.

## 13. How to refresh

The generator scripts are in `tools/` next to this report (Python). Re-run `build.py`, `out.py`, `verify.py`, `report.py`. Per §7 of the prompt: diff the text-bearing files from the commit this export was made against (record: repo HEAD `ce23891`), re-check every unit, recompute `source-location` lines, and watch for renumbered `data-screen`s. Nothing is translated yet, so renumbering is cheap; once translations exist, flag any ID change before renumbering.

## 14. Environment notes

- Python 3 was available and used (the template assumes PowerShell). Files were read/written as UTF-8; the XLIFF is UTF-8 **without** BOM, the manifest CSV is UTF-8 **with** BOM (so Excel shows Hebrew correctly).
- The output folder is **outside the git repo** (OneDrive-synced). It is not versioned: copy it into git or another backup — a translator's returned work in this folder could otherwise be lost without trace.
- git working tree before/after: clean before (HEAD ce23891, nothing uncommitted) and clean after — output was written outside the repo
