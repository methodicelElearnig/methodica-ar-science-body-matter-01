# Live verification — pointer drag (mouse + touch) on all eight drag screens, 2026-11-03

Package `../../deployments/2026-11-03b` (commit `a662a86`). Arabic twin of
`methodica-science-body-matter-01` `3e1e258`. Why: MOE tester's note of 03.11.26 with a screen
recording — drag questions do not work on tablets (native HTML5 drag never fires from touch).
Uploaded by Vadim on 03.11.26; checked from the CDN the same day.

## CDN upload

All 18 files are **byte-identical** to the package: `Content-Length` of a cache-busted HEAD equals the
package size, and a cache-busted download compared with `cmp` differs in no byte.

| File | Bytes |
|---|---|
| `unit-js/30-pointer-dnd.js` (new path) | 6,984 |
| `-01/index.html` / `script.js` / `styles.css` | 99,158 / 136,509 / 137,521 |
| `-02/index.html` / `script.js` / `styles.css` | 81,137 / 124,977 / 123,706 |
| `-03/index.html` / `script.js` / `styles.css` | 60,695 / 116,692 / 54,199 |
| `-04/index.html` | 14,321 |
| `-05/index.html` / `script.js` / `styles.css` | 59,717 / 92,957 / 59,694 |
| `-06/index.html` / `script.js` / `styles.css` | 39,129 / 84,485 / 43,275 |
| `-07/index.html` | 36,983 |

## Live pages (CDN, `https://lomdot.education.gov.il/metodica/720/ar/science/body-matter/01/…`)

Every converted part loads `../unit-js/30-pointer-dnd.js?v=20261103`, `script.js?v=20261103b` and
`styles.css?v=20261103b`; `createPointerDnd` is a function on every page; no console errors on any part.

Each screen was driven in the built-in browser with synthetic `PointerEvent`s (`pointerType: 'touch'`,
`isPrimary`, one `pointerId` per gesture) dispatched on the live DOM, then the model / DOM was read back:

| Part | Screen | Bank → target | Target → target | Occupied target | Target → bank | Cancel | Release outside | Tap |
|---|---|---|---|---|---|---|---|---|
| 01 | `ddq13` (s13) | ✓ | ✓ | n/a | ✓ | ✓ unchanged | ✓ unchanged | ✓ returns to bank |
| 01 | `dqx20` (s20) | ✓ | ✓ | ✓ occupant evicted | ✓ | ✓ unchanged | ✓ back to bank | — |
| 02 | `ddq27` (s27) | ✓ (also one real mouse drag) | ✓ (flipped card stays flipped, ghost shows its back) | n/a | ✓ | ✓ unchanged | — | ✓ flips in place, also inside a zone |
| 02 | `dqx28` (s28) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| 03 | `s8b` (s8) | ✓ | ✓ | n/a | ✓ | ✓ | ✓ | ✓ returns to bank |
| 05 | `dqx5` (s5) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| 05 | `oddq` (s7) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| 06 | `dqx4` (s4) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |

On every gesture: no ghost before the 6px slop, the ghost carries the screen's card class plus
`.pointer-drag-ghost`, the hovered target has `.drag-over`, no ghost is left in the DOM after release,
and the check button stays disabled (no answer was submitted, so no `answered` statement was sent).

## Not checked here

- A physical tablet (iPad Safari, Android Chrome): page pan / zoom while dragging, the long-press image
  sheet, finger ergonomics of the 6px slop. The synthetic events exercise the same code path, not the
  browser's touch gesture arbitration.
- Merge into `main` after the tablet pass (this repo works on `main`).
