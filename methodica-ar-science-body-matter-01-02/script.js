'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 8; // יעודכן עם כל מסך محتوى שנוסף
let currentScreen = 0;
/* נשמר אוטומטית ב-goTo() (לפני שמתקדם) — מאפשר לכל מסך התכנסות
   (מסך 12, s11, שמגיעים אליו משני נתיבים שונים) לחזור לנקודת המוצא
   הנכונה ("חזרה") בלי תלות באיזה נתיב הביא אליו בפועל. */
let previousScreen = 0;

/* Companion character system (720-templates skill: _global-components.md).
   מפתח localStorage מתויג ("namespaced") לפי הלומדה הזו בלבד, כדי שלא
   יתאפשר שיתוף/דריסה עם לומדה אחרת שנטענת מאותו origin — מוסכמה מומלצת
   שטרם מומשה בפרויקטים קודמים (mass-measure-02/03 השתמשו במפתח גנרי
   משותף 'lomda_selectedCharacter'), מיושמת כאן מההתחלה. */
/* Must equal UI_CHARACTER_KEY in ../unit-js/40-resume.js (QA D-6: one key per unit, never the
   bare 'lomda_selectedCharacter'). The document is the truth, localStorage only the synchronous
   cache (guide §8.1); the read goes through the getter, typeof-guarded (§8.7). */
const CHARACTER_STORAGE_KEY = 'methodica_ar_science_body_matter_01_selectedCharacter';

let savedCharacter = null;
try {
  savedCharacter = (typeof getUnitCharacter === 'function')
    ? getUnitCharacter()
    : localStorage.getItem(CHARACTER_STORAGE_KEY);
} catch (e) { /* localStorage חסום (opaque origin/פרטיות) — נמשיך בלי שמירה */ }
/* ברירת-מחדל לדמות המלווה (2026-10-29, כלל 720 לכל הסינים חוץ מהראשון):
   סין שנפתח בלי בחירה מסין 01 — דפדפן אחר, localStorage שנוקה, מצב פרטי,
   ?resetState או פתיחה ישירה של פריט — הציג ריבוע אפור במקום הדמות.
   עכשיו הדמות הראשונה (הירוקה) מוצגת עד שמגיעה בחירה אמיתית: המסמך או
   localStorage גוברים עליה (adoptUnitCharacter), והיא עצמה לא נכתבת לשום
   מקום — בחירה שתיעשה אחר-כך בסין 01 תגיע לכאן כרגיל. */
const DEFAULT_CHARACTER = 'character-1';
window.lomdaState = {
  selectedCharacter: savedCharacter || DEFAULT_CHARACTER
};

/* Fill-scale (SELF-QA §8): בסיס הקנבס 1280×710, ואחרי חישוב הסקאלה #app
   נמתח כך שימלא בדיוק את ה-viewport (בלי פסים מתים). הקבועים מוצהרים
   כאן פעם אחת; כל קוד שצריך את גודל הקנבס האמיתי קורא ל-getCanvasSize(). */
const CANVAS_W = 1280;
const CANVAS_H = 710;

function getCanvasSize() {
  const app = document.getElementById('app');
  return { width: app.offsetWidth, height: app.offsetHeight };
}

function scaleApp() {
  const app = document.getElementById('app');
  const scale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
  app.style.width = (window.innerWidth / scale) + 'px';
  app.style.height = (window.innerHeight / scale) + 'px';
  app.style.transform = 'scale(' + scale + ')';
  app.style.left = '0px';
  app.style.top = '0px';
}
window.addEventListener('resize', scaleApp);

/* goTo() סוגר כל פופ-אפ משוב/הצצת-רמז פתוחים לפני החלפת המסך —
   720-templates skill (_global-components.md → "Feedback popup system" →
   "Behavioral rules"). מבוסס על מוסכמת שמות: כל פופ-אפ משוב מקבל id
   שמסתיים ב-"-popup" (נסגר כמו שהמנגנון הפרטני שלו סוגר — הסרת class
   "visible", לא הוספת "hidden": תיבות משוב לעולם לא מסתמכות על ה-HTML
   attribute hidden, אז הוספת class נפרד הייתה "נדבקת" ומונעת פתיחה חוזרת
   דרך המנגנון הפרטני — אומת בפועל ותוקן במסך 2), כל hint overlay מקבל id
   שמסתיים ב-"-hint-overlay" (נסגר ע"י הגדרת ה-hidden property הנייטיבי,
   אותו מנגנון בדיוק ש-scqOpenHint/scqCloseHint משתמשים בו). */
function closeAllPopupsAndHints() {
  document.querySelectorAll('[id$="-popup"]').forEach(function (el) {
    el.classList.remove('visible');
  });
  document.querySelectorAll('[id$="-hint-overlay"]').forEach(function (el) {
    el.hidden = true;
  });
  /* מחוות מונפשות (Gesture Hints) מצורפות ל-#app עצמו (לא לתוך .screen),
     כדי שיוכלו למקם את עצמן מעל אלמנט-מטרה במסך הפעיל — לכן, בניגוד
     לפופ-אפים/hint-overlay שחיים בתוך המסך שלהם, הן חייבות ניקוי מפורש
     כאן בכל מעבר מסך. אם לא נוקו (הלומד עבר מסך בלי לבצע את הפעולה
     הנכונה), הן היו נשארות דבוקות ל-#app ו"דוממות" מעל כל מסך הבא. */
  document.querySelectorAll('.gesture-hint').forEach(function (el) {
    if (el.parentElement) el.parentElement.removeChild(el);
  });
}

function goTo(n, viaBack) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  closeAllPopupsAndHints();
  document.querySelectorAll('.screen').forEach(function (el) {
    el.classList.remove('active');
  });
  const target = document.querySelector('.screen[data-screen="' + n + '"]');
  if (!target) return;
  previousScreen = currentScreen;
  currentScreen = n;
  resetScreenState(n);
  target.classList.add('active');
  /* תוקן (2026-08-05): "Reopening feedback on return to a resolved
     screen" — 720-templates skill (_global-components.md → "Feedback
     popup system"). חזרה דרך כפתור "חזרה" (viaBack=true) למסך שאלה
     שכבר הושלם ({prefix}Done) פותחת מחדש את תיבת המשוב שלו (אותה
     תוצאה, מיקום ברירת-מחדל) — לא מריצים מחדש בדיקה/ולידציה, רק
     חושפים שוב את התוכן שכבר קיים ב-DOM (הוא לא נמחק, רק הוסתר). */
  if (viaBack) reopenFeedbackIfResolved(n);
  /* 720 platform layer (guide §6.7 / §8.3 / §8.4a): repaint an answered screen on EVERY navigation,
     open/close the catalogue item, arm the debounced state save. All typeof-guarded and swallowed —
     a reporting failure can never stop the learner. */
  try { if (typeof repaintScreen === 'function') repaintScreen(n); } catch (e) {}
  try { if (typeof xapiOnScreen === 'function') xapiOnScreen(n); } catch (e) {}
  try { if (typeof scheduleResumeSave === 'function') scheduleResumeSave(); } catch (e) {}
}

function reopenFeedbackIfResolved(n) {
  const map = {
    2: { done: s23Done, popup: 's23-popup' },
    3: { done: s24Done, popup: 's24-popup' },
    4: { done: s25Done, popup: 's25-popup' },
    5: { done: s26Done, popup: 's26-popup' },
    6: { done: ddq27Done, popup: 'ddq27-popup' },
    7: { done: dqx28Done, popup: 'dqx28-popup' }
  };
  const entry = map[n];
  if (!entry || !entry.done) return;
  scqFbResetPosition(entry.popup);
  document.getElementById(entry.popup).classList.add('visible');
}

function resetScreenState(n) {
  if (n === 0) resetScreenState21();
  if (n === 1) resetScreenState22();
  if (n === 2) resetScreenState23();
  if (n === 3) resetScreenState24();
  if (n === 4) resetScreenState25();
  if (n === 5) resetScreenState26();
  if (n === 6) resetScreenState27();
  if (n === 7) resetScreenState28();
  /* מסכים 6/11/12 (s6/s11/s12, "תכונות"/מסך התכנסות/כרטיסי גוף מעובד)
     הם תוכן סטטי לגמרי (בלי אינטראקציה שדורשת resume-state) — אין
     להם ענף. מסך 17 (s16, טבלת השוואה + תמונות) סטטי לגמרי מאותה
     סיבה. מסך 8 (s7) קיבל ענף משלו (למטה) ברגע שנוספה דמות-בווידאו
     שצריך לרענן לפי הבחירה העדכנית.
     מסך 18 (s17, תרשים זרימה) יצא מ-placeholder — יש לו כעת ענף
     resetScreenState17() אמיתי (ראו הבלוק למטה, לפני מסך 19/s18).
     מסך 22 (s21) קיבל ענף משלו (למטה) ברגע שהדמות עברה מ-placeholder
     ריק לווידאו אמיתי — צריך לרענן אותו כמו כל מסך עם resolveCharBubbleVideo. */
}


/* =========================================================
   מסך 22 (s21) — מסך מעבר לפני תרגול סטנדרטי. דמות בווידאו אמיתי
   "מרימה משקולות קלות" (green-avatar-lifting-light-weights.mp4/
   turquoise-avatar-lifting-light-eights.mp4, סופקו בפועל) — אותו
   חוזה בדיוק כמו מסך 2/9/10/18 (resolveCharBubbleVideo).
   ========================================================= */
const TS21_AVATAR_ASSETS = {
  'character-1': '../unit-assets/video/green-avatar-lifting-light-weights.mp4',
  'character-2': '../unit-assets/video/turquoise-avatar-lifting-light-eights.mp4'
};

function resetScreenState21() {
  resolveCharBubbleVideo('s21-avatar-video', TS21_AVATAR_ASSETS);
}


/* =========================================================
   פונקציות עזר גלובליות — Companion character system
   (720-templates skill: _global-components.md). מוכנות לשימוש ברגע
   שיבנה מסך ראשון עם דמות מלווה (לא בשימוש עדיין בתשתית הריקה).
   ========================================================= */
function resolveCharBubbleImg(imgId, assetMap) {
  const img = document.getElementById(imgId);
  if (!img) return;
  const char = window.lomdaState.selectedCharacter;
  const src = (char && assetMap[char]) ? assetMap[char] : '';
  /* תוקן (2026-08-05): לא הוגדר src="" כשאין עדיין דמות נבחרת (למשל
     ניווט ישיר דרך כלי ה-DEV, לפני מסך הבחירה) — src="" גורם לדפדפן
     לנסות לטעון מחדש את ה-URL של המסמך עצמו כתמונה ונכשל, מציג אייקון
     "תמונה שבורה" בפועל. עכשיו, בהיעדר דמות, מסירים את attribute-ה-src
     לגמרי (לא קובעים ערך ריק) — תואם את ההתנהגות הבטוחה יותר שכבר
     קיימת ב-resolveCharBubbleVideo. */
  if (src) { img.src = src; } else { img.removeAttribute('src'); }
}

/* מקבילה ל-resolveCharBubbleImg עבור <video> — וידאו לא "נטען"/מתחיל
   לנגן רק מהצבת src כמו <img>, צריך גם .load() ו-.play() במפורש. */
function resolveCharBubbleVideo(videoId, assetMap) {
  const video = document.getElementById(videoId);
  if (!video) return;
  const char = window.lomdaState.selectedCharacter;
  const src = (char && assetMap[char]) ? assetMap[char] : '';
  if (!src || video.getAttribute('data-src') === src) return;
  video.setAttribute('data-src', src);
  video.src = src;
  video.load();
  video.play().catch(function () {});
}

/* =========================================================
   Gesture Hints (עדכון מעצבת בפיגמה — node 2915:35184/35189/35185,
   ראו SELF-QA.md §7 למפרט המלא). יד סטטית + שתי טבעות-אדווה פועמות,
   מוצג פעם אחת בכל מסך רלוונטי (לא רק בפעם הראשונה בכל הלומדה, לפי
   בקשה מפורשת), נעלם רק כשהלומד מתחיל לבצע את הפעולה בעצמו.
   `key` הוא מזהה-ייחודי-למסך (למשל "s4-flip") — Set במקום זיכרון
   session, כמו כל שאר משתני resume-state בקובץ הזה (מתאפס בטעינה
   חוזרת של העמוד, לא persist ב-localStorage — "לא לחזור על עצמה
   כשחוזרים למסך שהושלם" מתקיים כי resetScreenStateN כבר לא קורא לה
   פעם שנייה, ראו s4Done/dqx13Done וכו' guards). ========================================================= */
const gestureHintShown = new Set();

function gestureHintShow(key, type, targetEl, vAnchor) {
  if (!targetEl || gestureHintShown.has(key)) return null;
  gestureHintShown.add(key);
  const app = document.getElementById('app');
  const suffix = (type === 'drag') ? '-drag' : '';
  const hint = document.createElement('div');
  hint.className = 'gesture-hint gesture-hint--' + type;
  hint.dataset.gestureKey = key;
  hint.innerHTML =
    '<img class="gesture-hint-ring-big" src="../unit-assets/img/gesture-ring-big' + suffix + '.svg" alt="">' +
    '<img class="gesture-hint-ring-small" src="../unit-assets/img/gesture-ring-small' + suffix + '.svg" alt="">' +
    '<img class="gesture-hint-hand" src="../unit-assets/img/gesture-hand.svg" alt="">';
  app.appendChild(hint);
  /* תוקן: resetScreenStateN() (שממנו נקראת הפונקציה הזו) רץ *לפני*
     ש-goTo() מוסיף את class="active" למסך — getBoundingClientRect()
     על יעד שעדיין display:none מחזיר הכל 0. ה-requestAnimationFrame
     דוחה את המיקום לפריים הבא, אחרי שהמסך כבר פעיל בפועל. */
  requestAnimationFrame(function () {
    gestureHintReposition(hint, targetEl, vAnchor);
    hint.classList.add('visible');
  });
  return hint;
}

/* ממקם את מרכז-היד בדיוק על מרכז target — ממיר קואורדינטות-מסך
   (getBoundingClientRect, לאחר scaleApp()) בחזרה למרחב הפנימי הלא-
   מוגדל של #app (1280×710), כדי שה-CSS (שממוקם ב-px "אמיתיים" של
   #app) יתאים גם כשהחלון בגודל שרירותי. */
function gestureHintReposition(hint, targetEl, vAnchor) {
  const app = document.getElementById('app');
  const appRect = app.getBoundingClientRect();
  const scale = appRect.width / app.offsetWidth;
  const targetRect = targetEl.getBoundingClientRect();
  const cx = (targetRect.left + targetRect.width / 2 - appRect.left) / scale;
  let cy = (targetRect.top + targetRect.height / 2 - appRect.top) / scale;
  /* תוקן (2026-09-15, בקשה מפורשת: "היד מופיעה במקום שמסתיר את
     הטקסט של אלמנט הגרירה, צריך להזיז אותה טיפה שתצביע על האלמנט
     בתנאי שלא מסתיר את הטקסט"), **תוקן שוב (2026-09-15, אחרי שהלקוח
     ציין שהמיקום עדיין לא תקין וצירף רפרנס-פיגמה, node 2915:35185
     "Cursor Drag")**: הניסיון הקודם ('top', מזיז את המרכז לקצה
     העליון) עדיין נכשל עבור פילים קצרים/ממורכזים (למשל "גוף" —
     2 אותיות בלבד, שהטקסט הממורכז-אופקית שלהן נופל בדיוק מתחת
     ליד גם אחרי ההזזה, כי גובה-היד (33px) גדול משמעותית מגובה-הפיל
     (~42-46px)). **בדיקה ישירה של גרפיקת gesture-hand.svg (אומתה
     בייט-לבייט זהה לאסט הרשמי בפיגמה) גילתה שהאצבע-המצביעה פונה
     **כלפי מעלה**, לא מטה** — כלומר החוזה הנכון הוא "היד נוגעת ביעד
     *מלמטה*", לא "מלמעלה" כפי שהונח קודם. vAnchor:'below' (מועבר רק
     ממסכים ספציפיים שהתבקשו, לא גלובלי) ממקם את כל מלבן-היד (33px)
     **מתחת** לקצה התחתון של הפיל לגמרי (בלי שום חפיפה, לא רק "פחות
     חפיפה") — קצה-הטבעת (החלק העליון של המלבן, שם יושבת קצה-האצבע,
     ראו הערת CSS ליד .gesture-hint-ring-*) נוגע כמעט בקצה התחתון של
     הפיל ומצביע כלפיו, וכל שאר גוף-היד תלוי במרחב הריק שמתחת — אפס
     סיכון לכיסוי טקסט, בלי תלות באורך המילה. אומת ויזואלית + מדידת
     getBoundingClientRect בפועל (לא רק צילום מסך). */
  if (vAnchor === 'below') {
    cy += (targetRect.height / scale) / 2 + 20.5;
  }
  hint.style.left = (cx - 14) + 'px';
  hint.style.top = (cy - 16.5) + 'px';
}

function gestureHintHide(key) {
  const hint = document.querySelector('.gesture-hint[data-gesture-key="' + key + '"]');
  if (!hint) return;
  hint.classList.remove('visible');
  setTimeout(function () {
    if (hint.parentElement) hint.parentElement.removeChild(hint);
  }, 200);
}

/* ---------- Dev postMessage bridge (index_dev.html free nav) ---------- */
window.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'DEV_GOTO') goTo(e.data.screen);
});
window.addEventListener('load', function () {
  if (window.parent === window) return; // not embedded in index_dev.html
  const screenCount = document.querySelectorAll('.screen').length;
  window.parent.postMessage({ type: 'DEV_READY', total: screenCount }, '*');
});

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'ArrowLeft') goTo(currentScreen + 1);
  if (e.ctrlKey && e.key === 'ArrowRight') goTo(currentScreen - 1);
});

/* =========================================================
   פופ-אפ משוב גריר — לפי "Feedback popup system" (720-templates skill).
   פונקציות גנריות, מוכנות לשימוש — כל מסך שאלה עתידי קורא
   scqFbMakeDraggable('<box-id>') באתחול שלו.
   ========================================================= */

function scqFbResetPosition(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;
  /* resume: every *ShowFeedback resets the position; a repaint (restoreScreenUI via repaintScreen /
     applyExecutionState) re-shows an EXISTING feedback and must not move a popup the learner dragged. */
  if (typeof resumeIsPainting === 'function' && resumeIsPainting()) return;
  box.style.left = '';
  box.style.top = '';
  box.style.bottom = '';
}

/* תוקן (2026-10-01, לפי Critical-requirement-lomda-building.md §9, הוחלט
   עם הלקוח ב-29.09.2026): כותרת המשוב של ניסיון אחרון שגוי חייבת
   להסתיים ב"התשובה הנכונה מוצגת." — מסיר רווח/":"/","/";" מסיים, מוסיף
   "." אם אין כבר סימן-סיום, ואז מצרף את המשפט. */
function fbCorrectShown(title) {
  let t = title.replace(/[\s:,;]+$/, '');
  if (!/[.!?]$/.test(t)) t += '.';
  return t + ' الإجابة الصحيحة معروضة.';
}

function scqFbMakeDraggable(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;

  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  box.addEventListener('mousedown', function (e) {
    if (e.target.closest('.scq-fb-reveal-btn')) return;
    const parent = box.offsetParent || box.parentElement;
    const boxRect = box.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    startLeft = boxRect.left - parentRect.left;
    startTop = boxRect.top - parentRect.top;
    box.style.left = startLeft + 'px';
    box.style.top = startTop + 'px';
    box.style.bottom = 'auto';
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    box.classList.add('is-dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    const parent = box.offsetParent || box.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const maxLeft = Math.max(0, parentRect.width - box.offsetWidth);
    const maxTop = Math.max(0, parentRect.height - box.offsetHeight);
    let left = startLeft + (e.clientX - startX);
    let top = startTop + (e.clientY - startY);
    left = Math.min(Math.max(0, left), maxLeft);
    top = Math.min(Math.max(0, top), maxTop);
    box.style.left = left + 'px';
    box.style.top = top + 'px';
  });

  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    box.classList.remove('is-dragging');
  });
}

/* =========================================================
   הגדלת תמונה (img-zoom) — רכיב גלובלי יחיד
   ========================================================= */

function imgZoomOpen(trigger) {
  const modal = document.getElementById('img-zoom-modal');
  const stage = modal && modal.querySelector('.img-zoom-modal__stage');
  const frame = trigger.parentElement;
  if (!modal || !stage || !frame) return;
  const clone = frame.cloneNode(true);
  const btnInClone = clone.querySelector('.img-zoom-btn');
  if (btnInClone) btnInClone.remove();
  stage.innerHTML = '';
  stage.appendChild(clone);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function imgZoomClose() {
  const modal = document.getElementById('img-zoom-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  const stage = modal.querySelector('.img-zoom-modal__stage');
  if (stage) stage.innerHTML = '';
}

document.addEventListener('click', function (e) {
  const trigger = e.target.closest('[data-zoom-src]');
  if (trigger) { imgZoomOpen(trigger); return; }
  const closeTarget = e.target.closest('[data-zoom-close="true"]');
  if (!closeTarget) return;
  if (closeTarget.id === 'img-zoom-modal' && e.target.closest('.img-zoom-modal__panel')) return;
  imgZoomClose();
});

document.addEventListener('keydown', function (e) {
  const modal = document.getElementById('img-zoom-modal');
  if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) imgZoomClose();
});


/* =========================================================
   מסך 23 (s22) — הוטספוטים (3 חומרים, שקף 35). ראו הערה מלאה ב-
   styles.css (`.hs23-*`) ו-index.html למקור/סטיות. "המשך" מושבת עד
   שחולף טיימר קצר (הנחיית הפקה: "כפתור המשך נדלק לאחר מספר שניות
   כדי להבטיח קריאה") — 3000ms, ערך סביר ("מספר שניות") בהיעדר מספר
   מדויק בתסריט. resume-state: אם כבר חלף הטיימר בביקור קודם, לא
   ממתינים שוב בכל חזרה למסך (s22Done נשאר true).
   ========================================================= */
const S22_MATERIALS = {
  foam: {
    title: 'إسفنج الذاكرة',
    body: 'مادة طري ومرِنة تنضغط عند الضغط عليها، وتعود ببطء إلى شكلها الأصلي.'
  },
  mesh: {
    title: 'قماش شبكي من البوليستر',
    body: 'قماش اصطناعي خفيف يحتوي على ثقوب صغيرة تسمح بمرور الهواء.'
  },
  silicone: {
    title: 'سيليكون',
    body: 'مادة ناعمة ومتينة ومقاومة للماء.'
  }
};

let s22ContinueTimer = null;
let s22Done = false;

function s22OpenHotspot(key) {
  gestureHintHide('s22-click'); /* נעלם ברגע שהלומד לוחץ על נקודה חמה */
  const data = S22_MATERIALS[key];
  document.getElementById('s22-hint-title-text').textContent = data.title;
  document.getElementById('s22-hint-body-text').innerHTML = data.body.replace(/\n/g, '<br>');
  document.getElementById('s22-hint-overlay').hidden = false;
}

function s22CloseHotspot() {
  document.getElementById('s22-hint-overlay').hidden = true;
}

function s22EnableContinue() {
  s22Done = true;
  document.getElementById('s22-continue').disabled = false;
  try { flushResumeSave(); } catch (e) {}   /* resume: the gate is earned — a variable, flushed synchronously (rule 11) */
}

function resetScreenState22() {
  const btn = document.getElementById('s22-continue');
  if (s22Done) { btn.disabled = false; return; }
  btn.disabled = true;
  if (s22ContinueTimer) clearTimeout(s22ContinueTimer);
  s22ContinueTimer = setTimeout(s22EnableContinue, 3000);
  /* מחווה מונפשת (Gesture Hints, SELF-QA.md §7) — קליק, מעל הנקודה
     החמה הראשונה, פעם אחת במסך הזה. */
  gestureHintShow('s22-click', 'click', document.querySelector('.hs23-hotspot'));
}

/* =========================================================
   סרגל התקדמות (qnav) חדש — משותף למסכים 23-28 (s23-s28, שאלות 1-5;
   שאלה 1 יש לה 2 סעיפים א/ב, ששניהם חולקים שקע qnav אחד). **לא**
   שימוש חוזר ב-stationProgress/updateQuestionNav הישן (שorted קשיח
   ל-2 שאלות בלבד, q19/q20) — נבנה כאן פונקציה כללית חדשה שמקבלת את
   השקע (slot) הרלוונטי לכל מסך מתוך מפה מפורשת, כי שני מסכים (s23/
   s24) חולקים אותו שקע (1) ולכן "מצא את הראשון שעדיין null" (השיטה
   הישנה) לא היה עובד — אחרי שנשאלה 1 (סעיף א) נענתה, s24 (סעיף ב)
   עדיין שייך לשקע 1, לא 2.
   ========================================================= */
const S2324_SLOT_OF = { s23: 1, s24: 1, s25: 2, s26: 3, s27: 4, s28: 5 };
let stationProgress2 = { 1: null, 2: null, 3: null, 4: null, 5: null };

function updateQuestionNav2(prefix) {
  const currentSlot = S2324_SLOT_OF[prefix];
  for (let i = 1; i <= 5; i++) {
    const icon = document.getElementById(prefix + '-qnav-icon-' + i);
    const label = document.getElementById(prefix + '-qnav-label-' + i);
    if (!icon) continue;
    icon.className = 'qnav-icon';
    if (label) label.className = 'qnav-label';
    if (stationProgress2[i] === 'success') {
      icon.classList.add('qnav-success');
      if (label) label.classList.add('qnav-label-active');
    } else if (stationProgress2[i] === 'fail') {
      icon.classList.add('qnav-fail');
      if (label) label.classList.add('qnav-label-active');
    } else if (i === currentSlot) {
      icon.classList.add('qnav-current');
      if (label) label.classList.add('qnav-label-active');
    } else {
      icon.classList.add('qnav-future');
    }
  }
  for (let i = 1; i <= 4; i++) {
    const line = document.getElementById(prefix + '-qnav-line-' + i);
    if (!line) continue;
    line.className = 'qnav-line';
    if (stationProgress2[i] !== null) line.classList.add('line-done');
  }
}

/* =========================================================
   מסך 24 (s23) — שאלה 1 סעיף א' מתוך 5: SingleChoiceQuestion מלווה
   בטבלה (במקום תמונה). state machine זהה 1:1 לזה של s19/s8 (המקור
   ביעד 3) — resetState/Select/Check/Hint. תוכן לפי שקף 36 בתסריט.
   ========================================================= */
const S23 = {
  correctId: 'a',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'المرونة هي الخاصية المهمة وفقًا للمتطلبات في السؤال.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'المرونة هي الخاصية المهمة وفقًا للمتطلبات في السؤال.'
    }
  }
};

let s23Selected = null;
let s23Attempts = 0;
let s23Done = false;
let s23Phase = 'before';
/* Retry gate (guide §8.8 rule 9): the option id submitted on the non-final wrong attempt, persisted as `lw`. */
let s23LastWrong = null;

function s23OptEl(id) {
  return document.querySelector('#s23 .scq-opt[data-id="' + id + '"]');
}

function s23Select(id) {
  if (s23Done) return;
  const wasWrong1 = (s23Phase === 'wrong1');
  document.querySelectorAll('#s23 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s23OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s23Selected = id;
  s23Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s23-popup').classList.remove('visible');
  }
  const checkBtn = document.getElementById('s23-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = (id === s23LastWrong);   /* Retry gate (rule 9) */
  checkBtn.onclick = s23Check;
}

function s23ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s23-popup');
  const data = S23.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s23-popup');
  box.classList.add('visible');
}

function s23SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s23-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('s23-hint').hidden = true;
}

function s23LockOptions() {
  document.querySelectorAll('#s23 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s23UnlockOptions() {
  document.querySelectorAll('#s23 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s23Select(el.dataset.id); };
  });
}

function s23Continue() {
  goTo(3);
}

function s23Check() {
  if (!s23Selected || s23Done) return;
  s23Attempts++;
  const optEl = s23OptEl(s23Selected);
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('001', 'q1', s23Selected === S23.correctId,
    s23Selected === S23.correctId || s23Attempts >= S23.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s23Selected === S23.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s23Phase = 'correct';
    s23Done = true;
    s23LastWrong = null;
    s23LockOptions();
    s23ShowFeedback('correct', true);
    s23SetBarDone('متابعة', s23Continue);
    stationProgress2[1] = 'success';
    updateQuestionNav2('s23');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s23Attempts < S23.maxAttempts) {
    s23Phase = 'wrong1';
    s23LastWrong = s23Selected;   /* Retry gate (rule 9) */
    s23ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s23-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s23Check;
    const hintBtn = document.getElementById('s23-hint');
    hintBtn.hidden = false;
  } else {
    s23OptEl(S23.correctId).classList.add('correct');
    s23Phase = 'wrong-final';
    s23Done = true;
    s23LastWrong = null;
    s23LockOptions();
    s23ShowFeedback('wrong2', false);
    s23SetBarDone('متابعة', s23Continue);
    stationProgress2[1] = 'fail';
    updateQuestionNav2('s23');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) — one flush, after everything */
}

function s23OpenHint() {
  if (s23Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q1');
  document.getElementById('s23-hint-overlay').hidden = false;
}

function s23CloseHint() {
  document.getElementById('s23-hint-overlay').hidden = true;
}

function resetScreenState23() {
  updateQuestionNav2('s23');
  if (s23Done || s23Attempts > 0 || s23Selected) return; // resume-state guard
  s23Selected = null;
  s23Attempts = 0;
  s23Phase = 'before';
  s23LastWrong = null;
  s23UnlockOptions();
  document.querySelectorAll('#s23 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s23-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s23-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s23Check;
  const hintBtn = document.getElementById('s23-hint');
  hintBtn.hidden = true;
  document.getElementById('s23-hint-overlay').hidden = true;
}

scqFbMakeDraggable('s23-popup');

/* =========================================================
   מסך 25 (s24) — שאלה 1 סעיף ב' מתוך 5. שכפול מכני 1:1 של מסך 24
   (s23→s24), לפי בקשה מפורשת ("תשכפל את המסך הקודם"). תוכן לפי שקף
   37 בתסריט.
   ========================================================= */
const S24 = {
  correctId: 'b',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'استخدمتم المعطيات في الجدول لاختيار مادة وفقًا للحاجة.\nهكذا يساعد الجدول على المقارنة بين المواد واتخاذ قرار مستند إلى معلومات، وليس الاختيار بناءً على الشعور فقط.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'استخدمتم المعطيات في الجدول لاختيار مادة وفقًا للحاجة.\nهكذا يساعد الجدول على المقارنة بين المواد واتخاذ قرار مستند إلى معلومات، وليس الاختيار بناءً على الشعور فقط.'
    }
  }
};

let s24Selected = null;
let s24Attempts = 0;
let s24Done = false;
let s24Phase = 'before';
/* Retry gate (guide §8.8 rule 9): the option id submitted on the non-final wrong attempt, persisted as `lw`. */
let s24LastWrong = null;

function s24OptEl(id) {
  return document.querySelector('#s24 .scq-opt[data-id="' + id + '"]');
}

function s24Select(id) {
  if (s24Done) return;
  const wasWrong1 = (s24Phase === 'wrong1');
  document.querySelectorAll('#s24 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s24OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s24Selected = id;
  s24Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s24-popup').classList.remove('visible');
  }
  const checkBtn = document.getElementById('s24-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = (id === s24LastWrong);   /* Retry gate (rule 9) */
  checkBtn.onclick = s24Check;
}

function s24ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s24-popup');
  const data = S24.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s24-popup');
  box.classList.add('visible');
}

function s24SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s24-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('s24-hint').hidden = true;
}

function s24LockOptions() {
  document.querySelectorAll('#s24 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s24UnlockOptions() {
  document.querySelectorAll('#s24 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s24Select(el.dataset.id); };
  });
}

function s24Continue() {
  goTo(4);
}

function s24Check() {
  if (!s24Selected || s24Done) return;
  s24Attempts++;
  const optEl = s24OptEl(s24Selected);
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('001', 'q2', s24Selected === S24.correctId,
    s24Selected === S24.correctId || s24Attempts >= S24.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s24Selected === S24.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s24Phase = 'correct';
    s24Done = true;
    s24LastWrong = null;
    s24LockOptions();
    s24ShowFeedback('correct', true);
    s24SetBarDone('متابعة', s24Continue);
    stationProgress2[1] = 'success';
    updateQuestionNav2('s24');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s24Attempts < S24.maxAttempts) {
    s24Phase = 'wrong1';
    s24LastWrong = s24Selected;   /* Retry gate (rule 9) */
    s24ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s24-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s24Check;
    const hintBtn = document.getElementById('s24-hint');
    hintBtn.hidden = false;
  } else {
    s24OptEl(S24.correctId).classList.add('correct');
    s24Phase = 'wrong-final';
    s24Done = true;
    s24LastWrong = null;
    s24LockOptions();
    s24ShowFeedback('wrong2', false);
    s24SetBarDone('متابعة', s24Continue);
    stationProgress2[1] = 'fail';
    updateQuestionNav2('s24');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) — one flush, after everything */
}

function s24OpenHint() {
  if (s24Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q2');
  document.getElementById('s24-hint-overlay').hidden = false;
}

function s24CloseHint() {
  document.getElementById('s24-hint-overlay').hidden = true;
}

function resetScreenState24() {
  updateQuestionNav2('s24');
  if (s24Done || s24Attempts > 0 || s24Selected) return; // resume-state guard
  s24Selected = null;
  s24Attempts = 0;
  s24Phase = 'before';
  s24LastWrong = null;
  s24UnlockOptions();
  document.querySelectorAll('#s24 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s24-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s24-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s24Check;
  const hintBtn = document.getElementById('s24-hint');
  hintBtn.hidden = true;
  document.getElementById('s24-hint-overlay').hidden = true;
}

scqFbMakeDraggable('s24-popup');

/* =========================================================
   מסך 26 (s25) — שאלה 2 מתוך 5: SingleChoiceQuestion מלווה בתמונה.
   שוכפל ממסך 20 (`id="s19"`) בפרויקט הזה עצמו (לפי בקשה מפורשת
   "אפשר לשכפל את מסך 20 מכאן") — state machine זהה 1:1. תוכן לפי
   שקף 38 בתסריט.
   ========================================================= */
const S25 = {
  correctId: 'a',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'السلكان مصنوعان من النحاس، ولذلك خصائص المادة الخاصة بهما متطابقة.\nما يمكن أن يتغير هو خاصية تتعلق بالجسم نفسه — في هذه الحالة، حجم الجسم.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'السلكان مصنوعان من النحاس، ولذلك خصائص المادة الخاصة بهما متطابقة.\nما يمكن أن يتغير هو خاصية تتعلق بالجسم نفسه — في هذه الحالة، حجم الجسم.'
    }
  }
};

let s25Selected = null;
let s25Attempts = 0;
let s25Done = false;
let s25Phase = 'before';
/* Retry gate (guide §8.8 rule 9): the option id submitted on the non-final wrong attempt, persisted as `lw`. */
let s25LastWrong = null;

function s25OptEl(id) {
  return document.querySelector('#s25 .scq-opt[data-id="' + id + '"]');
}

function s25Select(id) {
  if (s25Done) return;
  const wasWrong1 = (s25Phase === 'wrong1');
  document.querySelectorAll('#s25 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s25OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s25Selected = id;
  s25Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s25-popup').classList.remove('visible');
  }
  const checkBtn = document.getElementById('s25-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = (id === s25LastWrong);   /* Retry gate (rule 9) */
  checkBtn.onclick = s25Check;
}

function s25ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s25-popup');
  const data = S25.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s25-popup');
  box.classList.add('visible');
}

function s25SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s25-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('s25-hint').hidden = true;
}

function s25LockOptions() {
  document.querySelectorAll('#s25 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s25UnlockOptions() {
  document.querySelectorAll('#s25 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s25Select(el.dataset.id); };
  });
}

function s25Continue() {
  goTo(5);
}

function s25Check() {
  if (!s25Selected || s25Done) return;
  s25Attempts++;
  const optEl = s25OptEl(s25Selected);
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('002', 'q1', s25Selected === S25.correctId,
    s25Selected === S25.correctId || s25Attempts >= S25.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s25Selected === S25.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s25Phase = 'correct';
    s25Done = true;
    s25LastWrong = null;
    s25LockOptions();
    s25ShowFeedback('correct', true);
    s25SetBarDone('متابعة', s25Continue);
    stationProgress2[2] = 'success';
    updateQuestionNav2('s25');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s25Attempts < S25.maxAttempts) {
    s25Phase = 'wrong1';
    s25LastWrong = s25Selected;   /* Retry gate (rule 9) */
    s25ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s25-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s25Check;
    const hintBtn = document.getElementById('s25-hint');
    hintBtn.hidden = false;
  } else {
    s25OptEl(S25.correctId).classList.add('correct');
    s25Phase = 'wrong-final';
    s25Done = true;
    s25LastWrong = null;
    s25LockOptions();
    s25ShowFeedback('wrong2', false);
    s25SetBarDone('متابعة', s25Continue);
    stationProgress2[2] = 'fail';
    updateQuestionNav2('s25');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) — one flush, after everything */
}

function s25OpenHint() {
  if (s25Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('002', 'q1');
  document.getElementById('s25-hint-overlay').hidden = false;
}

function s25CloseHint() {
  document.getElementById('s25-hint-overlay').hidden = true;
}

function resetScreenState25() {
  updateQuestionNav2('s25');
  if (s25Done || s25Attempts > 0 || s25Selected) return; // resume-state guard
  s25Selected = null;
  s25Attempts = 0;
  s25Phase = 'before';
  s25LastWrong = null;
  s25UnlockOptions();
  document.querySelectorAll('#s25 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s25-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s25-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s25Check;
  const hintBtn = document.getElementById('s25-hint');
  hintBtn.hidden = true;
  document.getElementById('s25-hint-overlay').hidden = true;
}

scqFbMakeDraggable('s25-popup');

/* =========================================================
   מסך 27 (s26) — שאלה 3 מתוך 5: MultipleChoiceQuestion (בחירה מרובה)
   מלווה בטבלה. לפי 720-templates skill (references/
   MultipleChoiceQuestion.md) — טקסט-בלבד, אותו מראה כמו .scq-opt,
   רק Set במקום id יחיד + toggle במקום בחירה בלעדית. gate על
   size>=1 (לא על מספר-נכון-מדויק). בדיקת שוויון-קבוצות (setsEqual).
   כלל-חשיפה: ניסיון ראשון שגוי מסמן רק את הנבחר-השגוי; ניסיון אחרון
   שגוי חושף את כל הקבוצה הנכונה (ירוק) + מסמן נבחר-שגוי (אדום).
   תוכן לפי שקף 39 בתסריט.
   ========================================================= */
/* תוקן (2026-10-01, לפי Critical-requirement-lomda-building.md §29/§9,
   הוחלט עם הלקוח ב-29.09.2026): שלוש תוצאות אפשריות, לא שתיים —
   "נכון" / "נכון חלקית" (נבחרה לפחות אפשרות נכונה אחת, אך לא בדיוק
   הקבוצה הנכונה — המשוב חייב לציין זאת במפורש) / "שגוי" (אף אפשרות
   נכונה לא נבחרה). נכון-חלקית נראה חזותית בדיוק כמו שגוי — רק הכותרת
   משתנה. בניסיון האחרון, הכותרת מקבלת גם את הסיומת "התשובה הנכונה
   מוצגת." דרך fbCorrectShown. */
const S26 = {
  correctSet: new Set(['a', 'b']),
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز.',
      body: 'من الجدول يمكن الاستنتاج أن للجسمين خصائص مادة متطابقة، لكن كتلتهما مختلفة.'
    },
    wrong1Full: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong1Partial: {
      title: 'الإجابة صحيحة جزئيًا.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2Full: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'من الجدول يمكن الاستنتاج أن للجسمين خصائص مادة متطابقة، لكن كتلتهما مختلفة.'
    },
    wrong2Partial: {
      title: fbCorrectShown('الإجابة صحيحة جزئيًا.'),
      body: 'من الجدول يمكن الاستنتاج أن للجسمين خصائص مادة متطابقة، لكن كتلتهما مختلفة.'
    }
  }
};

let s26Selected = new Set();
let s26Attempts = 0;
let s26Done = false;
let s26Phase = 'before';
let s26AnswerSnapshot = null; // id -> 'correct' | 'wrong' | null, captured right after the final failed attempt
let s26ShowingCorrect = false; // true = board currently shows the §9 reveal (correct answers)
let s26Attempt1Submission = null; // Set captured at the moment attempt 1 is submitted wrong

function s26OptEl(id) {
  return document.querySelector('#s26 .scq-opt[data-id="' + id + '"]');
}

function s26SetsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function s26Toggle(id) {
  if (s26Done) return;
  const wasWrong1 = (s26Phase === 'wrong1');
  const el = s26OptEl(id);
  if (s26Selected.has(id)) {
    s26Selected.delete(id);
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    s26Selected.add(id);
    el.classList.add('selected');
    el.setAttribute('aria-checked', 'true');
  }
  s26Phase = 'selected';
  if (wasWrong1) {
    /* תוקן (2026-10-01, בקשה מפורשת): אין למחוק את מה שהלומד כבר סימן
       בניסיון הראשון — רק מסירים את חיווי הנכון/שגוי (הניסיון החדש
       עדיין לא נבדק), ומשחזרים את מחלקת 'selected' לכל מה שעדיין
       נמצא ב-s26Selected בפועל (לא רק לאפשרות שזה עתה נלחצה). קודם כל
       האפשרויות שהיו מסומנות ירוק/אדום נשארו בלי שום חיווי ויזואלי עד
       שנלחצו ידנית מחדש, מה שנראה כאילו הבחירה נמחקה. */
    document.getElementById('s26-popup').classList.remove('visible');
    document.querySelectorAll('#s26 .scq-opt').forEach(function (o) {
      o.classList.remove('wrong', 'correct');
      o.classList.toggle('selected', s26Selected.has(o.dataset.id));
    });
  }
  const checkBtn = document.getElementById('s26-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  /* תוקן (2026-10-01, בקשה מפורשת): כפתור "צדקתי?" אחרי ניסיון ראשון
     שגוי נדלק רק אם הבחירה הנוכחית שונה ממה שהוגש בניסיון הראשון —
     לא מספיק שיש בחירה כלשהי, חייב להיות שינוי אמיתי. */
  const unchangedFromAttempt1 = s26Attempt1Submission && s26SetsEqual(s26Selected, s26Attempt1Submission);
  checkBtn.disabled = s26Selected.size === 0 || unchangedFromAttempt1;
  checkBtn.onclick = s26Check;
}

function s26ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s26-popup');
  const data = S26.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s26-popup');
  box.classList.add('visible');
}

function s26SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s26-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('s26-hint').hidden = true;
}

function s26LockOptions() {
  document.querySelectorAll('#s26 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s26UnlockOptions() {
  document.querySelectorAll('#s26 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s26Toggle(el.dataset.id); };
  });
}

function s26Continue() {
  goTo(6);
}

function s26Check() {
  if (s26Selected.size === 0 || s26Done) return;
  s26Attempts++;
  /* xAPI: multi choice — the selected options' visible texts (the helper orders them by metadata). */
  const s26IsCorrect = s26SetsEqual(s26Selected, S26.correctSet);
  xapiAnswered('003', 'q1', s26IsCorrect, s26IsCorrect || s26Attempts >= S26.maxAttempts,
    { choices: Array.from(s26Selected).map(function (id) { return xapiAnswerText(s26OptEl(id)); }) });

  if (s26IsCorrect) {
    s26Selected.forEach(function (id) {
      s26OptEl(id).classList.add('correct');
      s26OptEl(id).classList.remove('selected');
    });
    s26Phase = 'correct';
    s26Done = true;
    s26Attempt1Submission = null;   /* Retry gate cleared on correct (rule 9) */
    s26LockOptions();
    s26ShowFeedback('correct', true);
    s26SetBarDone('متابعة', s26Continue);
    stationProgress2[3] = 'success';
    updateQuestionNav2('s26');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }

  /* תוקן (2026-09-28): אותו תיקון בדיוק כמו s1/s2 (סיין 2) — חיווי
     פר-פריט על ניסיון כושל (ירוק לבחירה נכונה, אדום למסיח), במקום
     'wrong' גורף על כל הבחירות. הגרסה הקודמת סימנה 'wrong' על כל מה
     שנבחר, כולל בחירות נכונות כשלעצמן (למשל b), וכשהניסיון האחרון
     נכשל הקוד הוסיף גם 'correct' על גביו בלי להסיר את 'wrong' —
     שתי המחלקות על אותו אלמנט, וה-CSS (`.scq-opt.wrong` מוגדר אחרי
     `.scq-opt.correct`) הציג אדום במקום ירוק. הגישה הפר-פריט מונעת את
     ההתנגשות מהשורש: פריט נכון תמיד מסומן 'correct' ולעולם לא 'wrong'. */
  const isPartial = Array.from(s26Selected).some(function (id) { return S26.correctSet.has(id); });
  s26Selected.forEach(function (id) {
    s26OptEl(id).classList.add(S26.correctSet.has(id) ? 'correct' : 'wrong');
    s26OptEl(id).classList.remove('selected');
  });

  if (s26Attempts < S26.maxAttempts) {
    s26Phase = 'wrong1';
    s26Attempt1Submission = new Set(s26Selected);
    s26ShowFeedback(isPartial ? 'wrong1Partial' : 'wrong1Full', false);
    const checkBtn = document.getElementById('s26-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s26Check;
    const hintBtn = document.getElementById('s26-hint');
    hintBtn.hidden = false;
  } else {
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה הנכונה
       (בלי מצב-ביניים), עם כפתור טוגל "מעבר לתשובה שלי" ⇄ "מעבר לתשובה
       הנכונה". ה-snapshot נלקח כאן, לפני שהחשיפה דורסת את הסימון
       שכבר הוצג ברגע ההגשה (כל id: 'correct'/'wrong' לפי מה שבאמת
       נבחר, או null אם לא נבחר כלל). **תוקן (2026-10-01, בקשה מפורשת):
       תצוגת "התשובה הנכונה" מסמנת רק את הנכונות עצמן — מנקים wrong מכל
       האפשרויות (כולל המסיחים שהלומד בחר) לפני שמסמנים את ה-correctSet,
       ולא משאירים אדום על גביה. */
    s26AnswerSnapshot = {};
    document.querySelectorAll('#s26 .scq-opt').forEach(function (el) {
      const id = el.dataset.id;
      s26AnswerSnapshot[id] = s26Selected.has(id) ? (S26.correctSet.has(id) ? 'correct' : 'wrong') : null;
    });
    document.querySelectorAll('#s26 .scq-opt').forEach(function (el) {
      el.classList.remove('correct', 'wrong');
      if (S26.correctSet.has(el.dataset.id)) el.classList.add('correct');
    });
    s26ShowingCorrect = true;
    s26Phase = 'wrong-final';
    s26Done = true;
    s26Attempt1Submission = null;   /* Retry gate cleared on the final attempt (rule 9) */
    s26LockOptions();
    s26ShowFeedback(isPartial ? 'wrong2Partial' : 'wrong2Full', false);
    s26SetBarDone('متابعة', s26Continue);
    const revealBtn = document.getElementById('s26-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
    stationProgress2[3] = 'fail';
    updateQuestionNav2('s26');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) — one flush, after everything */
}

function s26ToggleReveal() {
  if (!s26Done || s26Phase !== 'wrong-final') return;
  const revealBtn = document.getElementById('s26-reveal-btn');
  if (s26ShowingCorrect) {
    document.querySelectorAll('#s26 .scq-opt').forEach(function (el) {
      el.classList.remove('correct', 'wrong');
      const cls = s26AnswerSnapshot[el.dataset.id];
      if (cls) el.classList.add(cls);
    });
    s26ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    document.querySelectorAll('#s26 .scq-opt').forEach(function (el) {
      el.classList.remove('correct', 'wrong');
      if (S26.correctSet.has(el.dataset.id)) el.classList.add('correct');
    });
    s26ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function s26OpenHint() {
  if (s26Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('003', 'q1');
  document.getElementById('s26-hint-overlay').hidden = false;
}

function s26CloseHint() {
  document.getElementById('s26-hint-overlay').hidden = true;
}

function resetScreenState26() {
  updateQuestionNav2('s26');
  if (s26Done || s26Attempts > 0 || s26Selected.size > 0) {
    /* תוקן (2026-10-01, §9): שחזור מצב כפתור "מעבר לתשובה שלי/הנכונה"
       בחזרה למסך שכבר ננעל בניסיון-אחרון-שגוי — אותו דפוס שימוש
       כמו שאר מסכי הטוגל בפרויקט. */
    const revealBtn = document.getElementById('s26-reveal-btn');
    if (revealBtn) {
      if (s26Phase === 'wrong-final' && s26AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = s26ShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return; // resume-state guard
  }
  s26Selected = new Set();
  s26Attempts = 0;
  s26Phase = 'before';
  s26AnswerSnapshot = null;
  s26ShowingCorrect = false;
  s26Attempt1Submission = null;
  s26UnlockOptions();
  document.querySelectorAll('#s26 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s26-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s26-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s26Check;
  const hintBtn = document.getElementById('s26-hint');
  hintBtn.hidden = true;
  document.getElementById('s26-hint-overlay').hidden = true;
  const revealBtn = document.getElementById('s26-reveal-btn');
  if (revealBtn) revealBtn.hidden = true;
}

scqFbMakeDraggable('s26-popup');

/* =========================================================
   מסך 28 (s27) — שאלה 4 מתוך 5: גרירה (מיון ל-2 קבוצות) + היפוך
   קלפים. מנגנון הגרירה שוכפל במקור 1:1 ממסך 14 (ddq13*→ddq27*);
   תוקן (2026-11-03, MOE "שאלות גרירה לא עובדות בטאבלט"): הגרירה הטבעית
   (HTML5 DnD) הוחלפה ב-createPointerDnd מ-../unit-js/30-pointer-dnd.js
   (Pointer Events — עכבר ומגע): הקשה קצרה = ddq27Flip, תזוזה > 6px =
   גרירה עם רוח-DOM; ההנחה/ההחזרה למאגר ב-ddq27PlaceItem. היפוך
   (ddq27Flip) חד-כיווני, לפי ברירת המחדל של FlipCardsReveal — לא
   נדרש כדי לסמן/לבדוק תשובה (הבדיקה היא ברמת-אזור, בדיוק כמו מסך
   14), רק כדי לקרוא את הראיות בגב הקלף.
   ========================================================= */
const DDQ27_ITEM_IDS = ['ddq27-flint', 'ddq27-bone', 'ddq27-pottery', 'ddq27-copper'];
/* xAPI result.response: zone element id → visible zone label (= metadata 004/q1 answers.target). */
const DDQ27_ZONE_LABELS = {
  'ddq27-zone-insufficient': 'لا توجد أدلة كافية لتحديد أن القطعة الأثرية مُصنعة (من صُنع الإنسان).',
  'ddq27-zone-sufficient': 'توجد أدلة كافية لتحديد أن القطعة الأثرية مُصنعة (من صُنع الإنسان).'
};

const DDQ27_TEXTS = {
  correct: {
    title: 'ممتاز!',
    body: 'علامات متكررة ومتسقة، سمك ثابت، ثقوب في موقع دقيق وانحناء مماثل للأجزاء تشير إلى تصميم مقصود من قبل الإنسان.\n\nفي المقابل، تجويف في الحجر أو أخاديد غير متسقة يمكن أن تتشكل أيضًا في عمليات طبيعية. لذلك، في حجر الصوان وشظية العظم لا توجد أدلة كافية لتحديد بشكل قاطع أن الجسم خضع للمعالجة.'
  },
  wrong1: {
    title: 'الإجابة غير صحيحة.',
    body: 'هل نحاول مرة أخرى؟'
  },
  wrong1Partial: {
    title: 'الإجابة صحيحة جزئيًا.',
    body: 'هل نحاول مرة أخرى؟'
  },
  wrongFinalPartial: {
    title: fbCorrectShown('الإجابة صحيحة جزئيًا.'),
    body: 'علامات متكررة ومتسقة، سمك ثابت، ثقوب في موقع دقيق وانحناء مماثل للأجزاء تشير إلى تصميم مقصود من قبل الإنسان.\n\nفي المقابل، تجويف في الحجر أو أخاديد غير متسقة يمكن أن تتشكل أيضًا في عمليات طبيعية. لذلك، في حجر الصوان وشظية العظم لا توجد أدلة كافية لتحديد بشكل قاطع أن الجسم خضع للمعالجة.'
  },
  wrongFinal: {
    title: fbCorrectShown('الإجابة غير صحيحة.'),
    body: 'علامات متكررة ومتسقة، سمك ثابت، ثقوب في موقع دقيق وانحناء مماثل للأجزاء تشير إلى تصميم مقصود من قبل الإنسان.\n\nفي المقابل، تجويف في الحجر أو أخاديد غير متسقة يمكن أن تتشكل أيضًا في عمليات طبيعية. لذلك، في حجر الصوان وشظية العظم لا توجد أدلة كافية لتحديد بشكل قاطع أن الجسم خضع للمعالجة.'
  }
};

let ddq27Done = false;
let ddq27Attempts = 0;
let ddq27AnswerSnapshot = null;
let ddq27Revealed = false;
/* Retry gate (guide §8.8 rule 9): board signature of the non-final wrong attempt, persisted as `lw`. */
let ddq27LastWrong = null;
/* The dealt bank order (shuffled once at load, see shuffleContainerChildren) — persisted, never re-dealt on
   restore (§8.9 "a shuffled board"). Filled right after the shuffle at the end of this file. */
let ddq27BankOrder = DDQ27_ITEM_IDS.slice();

/* item → zone key ('—' while in the bank), one entry per item; compares by item, which is by label. */
function ddq27Sig() {
  return DDQ27_ITEM_IDS.map(function (id) {
    const el = document.getElementById(id);
    const p = el && el.parentElement ? el.parentElement.id : '';
    return id.replace('ddq27-', '') + '=' + (p.indexOf('ddq27-zone-') === 0 ? p.replace('ddq27-zone-', '') : '—');
  }).join(' | ');
}

function ddq27AllPlaced() {
  const bank = document.getElementById('ddq27-source-bank');
  if (!bank) return false;
  return DDQ27_ITEM_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 'ddq27-source-bank';
  });
}

function ddq27UpdateCheckBtn() {
  const btn = document.getElementById('ddq27-check');
  if (btn && !ddq27Done) btn.disabled = !ddq27AllPlaced() || ddq27Sig() === ddq27LastWrong;   /* Retry gate (rule 9) */
}

function ddq27ClearZoneStates() {
  ['insufficient', 'sufficient'].forEach(function (z) {
    const zone = document.getElementById('ddq27-zone-' + z);
    if (zone) zone.classList.remove('drag-over');
  });
  DDQ27_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('correct', 'wrong');
  });
}

function ddq27Flip(itemId) {
  if (ddq27Done) return;
  const el = document.getElementById(itemId);
  if (!el) return;
  /* is-animating: בזמן האנימציה שני הצדדים קיימים ב-3D; במנוחה (ddq27Settle)
     רק הצד המוצג נשאר — ראו ההערה הארוכה למטה. */
  el.classList.add('is-animating');
  if (el.classList.contains('is-flipped')) {
    /* חזרה לצד הממצא: יוצאים ממצב is-settled בלי אנימציה (ה-rotateY(180)
       חוזר תחת ddq27-no-anim — אותו מראה בדיוק), ורק אז מנפישים חזרה. */
    el.classList.add('ddq27-no-anim');
    el.classList.remove('is-settled');
    void el.offsetWidth;
    el.classList.remove('ddq27-no-anim');
    el.classList.remove('is-flipped');
  } else {
    el.classList.add('is-flipped');
  }
}

/* תוקן (2026-10-29, monday — "עדיין לא תוקן ... הכיתוב עדיין מופיע והוא בכתב
   מראה"). האבחנה האמיתית, אחרי שני ניסיונות שטיפלו רק בכרטיס ההפוך:
   צייר תמונת-הגרירה של Chromium (ו-Edge) מתעלם מ-backface-visibility.
   בכרטיס שלא הופך בכלל — צד-הממצא מוצג, צד-הראיות מאחוריו עם
   rotateY(180deg) ו-backface-visibility:hidden — הוא מצייר גם את
   צד-הראיות, משוטח למראה (scaleX(-1)) ומעל צד-הממצא: הריבוע הכחול
   בכתב-מראה שהבודקת רואה, גם כשגוררים ממצא שמעולם לא נהפך (נמדד
   ב-Edge 155 על האתר החי: הכרטיס הנגרר ללא is-flipped, והרוח מראה).
   הפתרון: במנוחה קיים רק הצד המוצג —
     • על צד-הממצא (לא הפוך, לא באמצע אנימציה): צד-הראיות visibility:hidden,
       כך שלצייר אין מה לשטח.
     • על צד-הראיות (is-settled): הסיבוב יורד, צד-הממצא מוסתר וצד-הראיות
       מוצג ישר, בלי טרנספורמציה.
   שני הצדדים קיימים ב-3D רק בזמן האנימציה (is-animating, 0.55s), ואז
   transitionend/transitioncancel → ddq27Settle. כרטיסים משוחזרים (resume)
   מיושבים ישירות. מאז 2026-11-03 אין תצוגת-גרירה נפרדת: רוח-הגרירה הוא
   עותק DOM (30-pointer-dnd.js), ו-onGhost מייצב אותו על הצד המוצג. */
function ddq27Settle(item) {
  item.classList.remove('is-animating');
  item.classList.toggle('is-settled', item.classList.contains('is-flipped'));
}
['transitionend', 'transitioncancel'].forEach(function (type) {
  document.addEventListener(type, function (e) {
    if (e.propertyName !== 'transform') return;
    const inner = e.target;
    if (!inner || !inner.classList || !inner.classList.contains('ddq27-card-inner')) return;
    const item = inner.closest('.ddq27-drag-item');
    if (item) ddq27Settle(item);
  });
});

/* הנחת פריט באזור ('insufficient' | 'sufficient') או החזרתו למאגר (null).
   משותף ל-onDrop של גרירת ה-Pointer; ddq27RevealCorrect/RestoreMine/applyResumeDom
   ממשיכים עם appendChild משלהם. */
function ddq27PlaceItem(itemId, zoneKey) {
  if (ddq27Done) return;
  const itemEl = document.getElementById(itemId);
  const dest = document.getElementById(zoneKey ? 'ddq27-zone-' + zoneKey : 'ddq27-source-bank');
  if (!itemEl || !dest) return;
  if (itemEl.parentElement !== dest) dest.appendChild(itemEl);
  /* appendChild מבטל transition רץ (אין transitionend) — מייצבים כמו applyResumeDom */
  if (itemEl.classList.contains('is-animating')) ddq27Settle(itemEl);
  ddq27UpdateCheckBtn();
  ddq27ClearZoneStates();
}

/* גרירת Pointer Events (עכבר + מגע) — ראו ../unit-js/30-pointer-dnd.js. המאזינים
   יושבים על הקלפים עצמם, ולכן שורדים appendChild (הטלה, חשיפה, resume, reset). */
const ddq27Dnd = createPointerDnd({
  canDrag: function () { return !ddq27Done; },
  onPick: function () {                        /* הלחיצה הפכה לגרירה (מעבר ל-6px) */
    gestureHintHide('s27-drag');               /* נעלם ברגע שהלומד מתחיל לגרור */
    /* First-attempt retry feedback dismissal — ראו ddq13DragStart לפירוט המלא. */
    if (ddq27Attempts > 0) document.getElementById('ddq27-popup').classList.remove('visible');
  },
  onGhost: function (ghost) {                  /* העותק חי מחוץ ל-#app: מקפיאים אותו על הצד המוצג */
    ghost.classList.remove('is-animating', 'ddq27-no-anim', 'correct', 'wrong');
    if (ghost.classList.contains('is-flipped')) ghost.classList.add('is-settled');
  },
  onTap: function (dragId) { ddq27Flip(dragId); },   /* במאגר או באזור: היפוך במקום */
  onDrop: function (dragId, targetId) { ddq27PlaceItem(dragId, targetId === 'bank' ? null : targetId); }
  /* אין onCancel: ה-helper מסיר את הרוח ואת .dragging; הקלף נשאר היכן שהיה */
});
DDQ27_ITEM_IDS.forEach(function (id) { ddq27Dnd.attachSource(document.getElementById(id), id); });
ddq27Dnd.attachTarget(document.getElementById('ddq27-zone-insufficient'), 'insufficient');
ddq27Dnd.attachTarget(document.getElementById('ddq27-zone-sufficient'), 'sufficient');
ddq27Dnd.attachTarget(document.getElementById('ddq27-source-bank'), 'bank');

function ddq27ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('ddq27-popup');
  const data = DDQ27_TEXTS[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('ddq27-popup');
  box.classList.add('visible');
}

function ddq27SetBarDone(label, handler) {
  const btn = document.getElementById('ddq27-check');
  btn.textContent = label;
  btn.disabled = false;
  btn.onclick = handler;
  document.getElementById('s27-hint').hidden = true;
}

function ddq27Continue() {
  goTo(7);
}

function ddq27Check() {
  if (ddq27Done) return;
  if (!ddq27AllPlaced()) return;
  ddq27Attempts++;

  /* תוקן (2026-08-04): משוב per-card (לא per-zone) — לפי SELF-QA.md
     קטגוריה 4, אותו תיקון בדיוק כמו ddq13Check(). */
  let allCorrect = true;
  let anyCorrect = false;
  ['insufficient', 'sufficient'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('ddq27-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.ddq27-drag-item');
    items.forEach(function (item) {
      const ok = item.dataset.correct === zoneId;
      item.classList.toggle('correct', ok);
      item.classList.toggle('wrong', !ok);
      if (ok) anyCorrect = true;
      if (!ok) allCorrect = false;
    });
  });

  /* xAPI: after the zone loop (allCorrect is final only there). Pair = item label → label of the zone
     the item sits in ('' if still in the bank). */
  xapiAnswered('004', 'q1', allCorrect, allCorrect || ddq27Attempts >= 2,
    { pairs: DDQ27_ITEM_IDS.map(function (id) {
      const el = document.getElementById(id);
      const parentId = el && el.parentElement ? el.parentElement.id : '';
      return { source: xapiAnswerText(el ? el.querySelector('.ddq27-item-label') : null),
               target: DDQ27_ZONE_LABELS[parentId] || '' };
    }) });

  if (allCorrect) {
    ddq27Done = true;
    ddq27LastWrong = null;
    ddq27ShowFeedback('correct', true);
    ddq27SetBarDone('متابعة', ddq27Continue);
    stationProgress2[4] = 'success';
    updateQuestionNav2('s27');
  } else if (ddq27Attempts < 2) {
    ddq27LastWrong = ddq27Sig();   /* Retry gate (rule 9) */
    ddq27ShowFeedback(anyCorrect ? 'wrong1Partial' : 'wrong1', false);
    document.getElementById('ddq27-check').disabled = true;
    document.getElementById('s27-hint').hidden = false;
  } else {
    ddq27Done = true;
    ddq27LastWrong = null;
    /* תוקן (2026-10-01, §9): ראו ddq13Check — חשיפה מיידית + טוגל. */
    ddq27AnswerSnapshot = {};
    DDQ27_ITEM_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      ddq27AnswerSnapshot[id] = el.parentElement ? el.parentElement.id : 'ddq27-source-bank';
    });
    /* §9: חשיפה מיידית של התשובה הנכונה + משוב סופי מלא */
    ddq27RevealCorrect();
    ddq27Revealed = true;
    ddq27ShowFeedback(anyCorrect ? 'wrongFinalPartial' : 'wrongFinal', false);
    ddq27SetBarDone('متابعة', ddq27Continue);
    stationProgress2[4] = 'fail';
    updateQuestionNav2('s27');
    const revealBtn = document.getElementById('ddq27-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) — one flush, after everything */
}

/* תוקן (2026-10-01, §9): הצגת התשובה הנכונה על הלוח — מניחה כל פריט
   באזור הנכון שלו ומסמנת הכול 'correct' (בלי wrong). */
function ddq27RevealCorrect() {
  DDQ27_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    const zone = document.getElementById('ddq27-zone-' + el.dataset.correct);
    if (zone) zone.appendChild(el);
    el.classList.remove('wrong');
    el.classList.add('correct');
  });
}

/* שחזור "התשובה שלי" מה-snapshot, עם סימון correct/wrong לכל פריט. */
function ddq27RestoreMine() {
  DDQ27_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    const parent = document.getElementById(ddq27AnswerSnapshot[id]);
    if (parent) parent.appendChild(el);
  });
  ['insufficient', 'sufficient'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('ddq27-zone-' + zoneId);
    zoneEl.querySelectorAll('.ddq27-drag-item').forEach(function (item) {
      const ok = item.dataset.correct === zoneId;
      item.classList.toggle('correct', ok);
      item.classList.toggle('wrong', !ok);
    });
  });
}

/* טוגל §9: "מעבר לתשובה שלי" ⇄ "מעבר לתשובה הנכונה". המשוב נשאר פתוח
   ולא משתנה. */
function ddq27ToggleReveal() {
  if (!ddq27Done || !ddq27AnswerSnapshot) return;
  const revealBtn = document.getElementById('ddq27-reveal-btn');
  if (ddq27Revealed) {
    ddq27RestoreMine();
    ddq27Revealed = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    ddq27RevealCorrect();
    ddq27Revealed = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function s27OpenHint() {
  if (ddq27Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('004', 'q1');
  document.getElementById('s27-hint-overlay').hidden = false;
}

function s27CloseHint() {
  document.getElementById('s27-hint-overlay').hidden = true;
}

function resetScreenState27() {
  updateQuestionNav2('s27');
  const btn = document.getElementById('ddq27-check');
  if (ddq27Done) {
    btn.textContent = 'متابعة';
    btn.disabled = false;
    btn.onclick = ddq27Continue;
    const revealBtn = document.getElementById('ddq27-reveal-btn');
    if (revealBtn) {
      if (ddq27AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = ddq27Revealed ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return;
  }
  if (ddq27Attempts > 0 || DDQ27_ITEM_IDS.some(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 'ddq27-source-bank';
  })) return;

  ddq27Attempts = 0;
  ddq27AnswerSnapshot = null;
  ddq27Revealed = false;
  ddq27LastWrong = null;
  {
    const revealBtn = document.getElementById('ddq27-reveal-btn');
    if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  const bank = document.getElementById('ddq27-source-bank');
  DDQ27_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el && el.parentElement !== bank) {
      el.parentElement.removeChild(el);
      bank.appendChild(el);
    }
  });
  ddq27ClearZoneStates();
  document.getElementById('ddq27-popup').classList.remove('visible');
  document.getElementById('s27-hint').hidden = true;
  document.getElementById('s27-hint-overlay').hidden = true;
  btn.textContent = 'هل إجابتي صحيحة؟';
  btn.disabled = true;
  btn.onclick = ddq27Check;
  /* מחווה מונפשת (Gesture Hints, SELF-QA.md §7) — גרירה, מעל הפריט
     הראשון במאגר, פעם אחת במסך הזה. */
  gestureHintShow('s27-drag', 'drag', document.getElementById(DDQ27_ITEM_IDS[0]));
}

scqFbMakeDraggable('ddq27-popup');

/* =========================================================
   מסך 29 (s28) — שאלה 5 מתוך 5: גרירה לתוך טבלה (7 יעדים, אחד לכל
   תכונה). state machine זהה 1:1 למסך 21 (dqx20* → dqx28* כאן) —
   Placement model + Render מחדש. תוכן/מיפוי-נכונות לפי שקף 42
   בתסריט. אין כפתור רמז (לפי בקשה מפורשת "ללא כפתור רמז").
   ========================================================= */
const DQX28_LABELS = {
  'dqx28-drag-observe': 'مشاهدة',
  'dqx28-drag-lightobserve': 'مشاهدة أمام الضوء',
  'dqx28-drag-scratch': 'فحص الخدش المضبوط',
  'dqx28-drag-shine': 'ملاحظة ما إذا كان سطح المادة يعكس الضوء ويبدو لامعًا',
  'dqx28-drag-bend': 'ثني خفيف',
  'dqx28-drag-touch': 'لمس حذر',
  'dqx28-drag-magnet': 'تقريب المغناطيس'
};
const DQX28_CORRECT_MAP = {
  'dqx28-target-color': 'dqx28-drag-observe',
  'dqx28-target-transparency': 'dqx28-drag-lightobserve',
  'dqx28-target-hardness': 'dqx28-drag-scratch',
  'dqx28-target-shine': 'dqx28-drag-shine',
  'dqx28-target-flex': 'dqx28-drag-bend',
  'dqx28-target-texture': 'dqx28-drag-touch',
  'dqx28-target-magnetism': 'dqx28-drag-magnet'
};
const DQX28_DRAG_IDS = Object.keys(DQX28_LABELS);
const DQX28_TARGET_IDS = Object.keys(DQX28_CORRECT_MAP);
/* xAPI result.response: slot id → the visible property label of its table row (= metadata 005/q1
   answers.target, byte for byte); DQX28_LABELS are the answers.source method texts. */
const DQX28_SLOT_LABELS = {
  'dqx28-target-color': 'لون',
  'dqx28-target-transparency': 'شفافية',
  'dqx28-target-hardness': 'صلابة',
  'dqx28-target-shine': 'لمعان',
  'dqx28-target-flex': 'ليونة',
  'dqx28-target-texture': 'ملمس',
  'dqx28-target-magnetism': 'مغناطيسية'
};
const DQX28_SHARED_EXPLANATION =
  'جدول كهذا يساعد على المقارنة بين المواد، وطرح أسئلة علمية دقيقة، وبناء القرارات على المشاهدات والفحوصات وليس على الإحساس الشخصي فقط.';

let dqx28Placement = {};
DQX28_DRAG_IDS.forEach(function (id) { dqx28Placement[id] = 'source'; });
let dqx28DragActive = null;
let dqx28DropHandled = false;
let dqx28Checked = false;
let dqx28Attempts = 0;
let dqx28Done = false;
let dqx28AnswerSnapshot = null;
let dqx28Revealed = false;
/* Retry gate (guide §8.8 rule 9): board signature of the non-final wrong attempt, persisted as `lw`. */
let dqx28LastWrong = null;

/* slot → placed label ('—' when empty), compares by label (rule 9). */
function dqx28Sig() {
  return DQX28_TARGET_IDS.map(function (tId) {
    let placed = null;
    DQX28_DRAG_IDS.forEach(function (d) { if (dqx28Placement[d] === tId) placed = d; });
    return tId.replace(/^.*-target-/, '') + '=' + (placed ? DQX28_LABELS[placed] : '—');
  }).join(' | ');
}

/* תוקן (2026-08-05): ערבוב-מסיחים — הדוקס ("שאלות הגרירה") דורש שסדר
   הפריטים במחסן-המילים יהיה תמיד מעורבב, לא סדר-הצהרה קבוע. אותו
   דפוס בדיוק כמו dqx20Order. */
let dqx28Order = DQX28_DRAG_IDS.slice();
(function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
})(dqx28Order);

function dqx28Render() {
  dqx28Order.forEach(function (dragId) {
    const slot = document.getElementById('slot-' + dragId);
    if (!slot) return;
    /* תוקן (2026-08-05): ערבוב-מסיחים אמיתי — ראו dqx20Render לפירוט. */
    if (slot.parentElement) slot.parentElement.appendChild(slot);
    slot.innerHTML = '';
    if (dqx28Placement[dragId] === 'source') {
      const card = document.createElement('div');
      card.className = 'dqx-drag-card';
      card.id = dragId;
      card.textContent = DQX28_LABELS[dragId];
      if (!dqx28Checked) {
        card.draggable = true;
        card.ondragstart = function (e) { dqx28DragStart(e, dragId); };
        card.ondragend = dqx28DragEnd;
      } else {
        card.classList.add('locked');
      }
      slot.appendChild(card);
    }
  });

  DQX28_TARGET_IDS.forEach(function (targetId) {
    const zone = document.getElementById(targetId);
    if (!zone) return;
    zone.classList.remove('filled', 'drag-origin');
    zone.innerHTML = '';
    let placedId = null;
    DQX28_DRAG_IDS.forEach(function (dId) { if (dqx28Placement[dId] === targetId) placedId = dId; });
    if (placedId) {
      if (!dqx28Checked) zone.classList.add('filled');
      /* תוקן (SELF-QA.md §3, "badge on wrong physical side"): אייקון
         ראשון ב-DOM, מילה שנייה — בתוך .dqx-drop (direction:rtl) זה
         ממקם את האייקון פיזית בקצה הימני, בדיוק כמו dqx20Render
         (מסך 20, אותו רכיב בדיוק). היה הפוך כאן (מילה לפני אייקון),
         מה שהניח את התג בצד השמאלי השגוי. .dqx-drop-icon עצמו
         display:none כברירת מחדל, אז אין בעיה ליצור אותו תמיד. */
      const iconEl = document.createElement('span');
      iconEl.className = 'dqx-drop-icon';
      const wordEl = document.createElement('span');
      wordEl.className = 'dqx-drop-word';
      wordEl.textContent = DQX28_LABELS[placedId];
      if (!dqx28Checked) {
        wordEl.draggable = true;
        wordEl.ondragstart = function (e) { dqx28PlacedDragStart(e, placedId); };
        wordEl.ondragend = dqx28DragEnd;
      }
      zone.appendChild(iconEl);
      zone.appendChild(wordEl);
    }
  });

  const allFilled = DQX28_TARGET_IDS.every(function (tId) {
    return DQX28_DRAG_IDS.some(function (dId) { return dqx28Placement[dId] === tId; });
  });
  const btn = document.getElementById('dqx28-check');
  if (btn && !dqx28Done) btn.disabled = !allFilled || dqx28Sig() === dqx28LastWrong;   /* Retry gate (rule 9) */
}

/* תצוגת-גרירה: "גלולה" אמיתית (רקע לבן, גבול כחול, טקסט במרכז). בלי זה
   הדפדפן מצלם רק את ה-<span> של המילה (בגרירה מתוך תיבה) או עותק שקוף של
   כרטיס הבנק. refEl = האלמנט שממנו נגזרים הגודל/הסקאלה (הכרטיס או תיבת
   היעד), cls = מחלקת הגלולה. */
function dragPillPreview(event, refEl, label, cls) {
  if (!event.dataTransfer || !event.dataTransfer.setDragImage || !refEl) return;
  const rect = refEl.getBoundingClientRect();
  const scale = refEl.offsetWidth ? rect.width / refEl.offsetWidth : 1;
  const pill = document.createElement('div');
  pill.className = cls + ' drag-pill-preview';
  pill.textContent = label;
  pill.style.width = refEl.offsetWidth + 'px';
  pill.style.height = refEl.offsetHeight + 'px';
  pill.style.transform = 'scale(' + scale + ')';
  document.body.appendChild(pill);
  event.dataTransfer.setDragImage(
    pill,
    Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
    Math.min(Math.max(event.clientY - rect.top, 0), rect.height)
  );
  setTimeout(function () { pill.remove(); }, 0);
}

function dqx28DragStart(event, dragId) {
  if (dqx28Checked) { event.preventDefault(); return; }
  gestureHintHide('s28-drag'); /* נעלם ברגע שהלומד מתחיל לגרור */
  /* תוקן (2026-08-05): First-attempt retry feedback dismissal — ראו
     ddq13DragStart לפירוט המלא. */
  if (dqx28Attempts > 0) document.getElementById('dqx28-popup').classList.remove('visible');
  dqx28DragActive = dragId;
  dqx28DropHandled = false;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', dragId);
  dragPillPreview(event, event.currentTarget || event.target, DQX28_LABELS[dragId], 'dqx-drag-card');
}

function dqx28PlacedDragStart(event, dragId) {
  if (dqx28Checked) { event.preventDefault(); return; }
  if (dqx28Attempts > 0) document.getElementById('dqx28-popup').classList.remove('visible');
  dqx28DragActive = dragId;
  dqx28DropHandled = false;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', dragId);
  const wordEl = event.currentTarget || event.target;
  const oldZone = document.getElementById(dqx28Placement[dragId]);
  dragPillPreview(event, oldZone || wordEl, DQX28_LABELS[dragId], 'dqx-drag-card');
  /* תוקן (2026-10-04): אין עוד dqx28Render() סינכרוני כאן — הוא ניתק את
     המילה הנגררת מה-DOM באמצע הגרירה (dragend לא הופעל). ה-DOM נשאר
     יציב עד drop/dragend; התיבה רק "מתרוקנת" חזותית (.drag-origin). */
  if (oldZone) oldZone.classList.remove('correct', 'incorrect', 'filled');
  setTimeout(function () {
    if (dqx28DragActive === dragId && oldZone) oldZone.classList.add('drag-origin');
  }, 0);
}

function dqx28DragEnd() {
  if (!dqx28DropHandled && dqx28DragActive) {
    dqx28Placement[dqx28DragActive] = 'source';
  }
  dqx28Render();
  dqx28DragActive = null;
  dqx28DropHandled = false;
}

function dqx28DragOver(event, targetId) {
  if (dqx28Checked) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const zone = document.getElementById(targetId);
  if (zone) zone.classList.add('drag-hover');
}

function dqx28DragEnter(event, targetId) {
  event.preventDefault();
  const zone = document.getElementById(targetId);
  if (zone) zone.classList.add('drag-hover');
}

function dqx28DragLeave(event, targetId) {
  const zone = document.getElementById(targetId);
  if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('drag-hover');
}

function dqx28Drop(event, targetId) {
  event.preventDefault();
  const zone = document.getElementById(targetId);
  if (zone) zone.classList.remove('drag-hover', 'correct', 'incorrect');
  if (dqx28Checked || !dqx28DragActive) return;
  dqx28DropHandled = true;
  DQX28_DRAG_IDS.forEach(function (dId) {
    if (dqx28Placement[dId] === targetId && dId !== dqx28DragActive) dqx28Placement[dId] = 'source';
  });
  dqx28Placement[dqx28DragActive] = targetId;
  dqx28DragActive = null;
  dqx28Render();
}

function dqx28DropToBank(event) {
  event.preventDefault();
  if (dqx28Checked || !dqx28DragActive) return;
  dqx28DropHandled = true;
  dqx28Placement[dqx28DragActive] = 'source';
  dqx28DragActive = null;
  dqx28Render();
}

function dqx28ShowFeedback(title, body, kind) {
  const box = document.getElementById('dqx28-popup');
  box.querySelector('.scq-fb-title-text').textContent = title;
  box.querySelector('.scq-fb-body').innerHTML = body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(kind === 'correct' ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('dqx28-popup');
  box.classList.add('visible');
}

/* ניווט חוצה-סינים (בקשה מפורשת): מסך 29 הוא המסך האחרון בסיין 1 —
   "המשך" אחרי מענה נכון עובר לסיין 3 (מסך ראשון), לא goTo(TOTAL_SCREENS)
   (no-op placeholder). זרימה טבעית 1→2→3→4→5, אותה מוסכמת ניווט
   חוצה-פרויקטים שכבר קיימת ל-resolveMoedAResult בסיין 5. */
function dqx28GoToNextScene() {
  /* 2026-10-19: the platform routes — report completed and stop (guide §8.12). */
  partFinish(document.getElementById('dqx28-check'));
}

function dqx28Check() {
  if (dqx28Done) { dqx28GoToNextScene(); return; }
  const allFilled = DQX28_TARGET_IDS.every(function (tId) {
    return DQX28_DRAG_IDS.some(function (dId) { return dqx28Placement[dId] === tId; });
  });
  if (!allFilled) return;
  dqx28Checked = true;
  dqx28Attempts++;

  let allCorrect = true;
  let anyCorrect = false;
  DQX28_TARGET_IDS.forEach(function (tId) {
    const validId = DQX28_CORRECT_MAP[tId];
    let placedId = null;
    DQX28_DRAG_IDS.forEach(function (dId) { if (dqx28Placement[dId] === tId) placedId = dId; });
    const ok = placedId === validId;
    if (ok) anyCorrect = true;
    if (!ok) allCorrect = false;
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add(ok ? 'correct' : 'incorrect'); }
  });
  dqx28Render();

  /* xAPI: after the slot loop (allCorrect final). Pair = method → row label of the slot it sits in ('' if in the bank). */
  xapiAnswered('005', 'q1', allCorrect, allCorrect || dqx28Attempts >= 2,
    { pairs: DQX28_DRAG_IDS.map(function (dId) {
      return { source: DQX28_LABELS[dId], target: DQX28_SLOT_LABELS[dqx28Placement[dId]] || '' };
    }) });

  const btn = document.getElementById('dqx28-check');
  if (allCorrect) {
    dqx28Done = true;
    dqx28LastWrong = null;
    dqx28ShowFeedback('ممتاز!', DQX28_SHARED_EXPLANATION, 'correct');
    stationProgress2[5] = 'success';
    updateQuestionNav2('s28');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
  } else if (dqx28Attempts < 2) {
    dqx28LastWrong = dqx28Sig();   /* Retry gate (rule 9) — before the render that reads it */
    if (anyCorrect) dqx28ShowFeedback('الإجابة صحيحة جزئيًا.', 'هل نحاول مرة أخرى؟', 'wrong');
    else dqx28ShowFeedback('الإجابة غير صحيحة.', 'هل نحاول مرة أخرى؟', 'wrong');
    dqx28Checked = false;
    dqx28Render();
    if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
  } else {
    dqx28Done = true;
    dqx28LastWrong = null;
    /* תוקן (2026-10-01, §9): ראו dqx20Check — חשיפה מיידית + טוגל. */
    dqx28AnswerSnapshot = Object.assign({}, dqx28Placement);
    dqx28RevealCorrect();
    dqx28Revealed = true;
    dqx28ShowFeedback(fbCorrectShown(anyCorrect ? 'الإجابة صحيحة جزئيًا.' : 'الإجابة غير صحيحة. لا بأس، نتعلّم أيضًا من الأخطاء!'), DQX28_SHARED_EXPLANATION, 'wrong');
    stationProgress2[5] = 'fail';
    updateQuestionNav2('s28');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    const revealBtn = document.getElementById('dqx28-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) — one flush, after everything */
}

/* תוקן (2026-10-01, §9): הצגת התשובה הנכונה על הלוח. */
function dqx28RevealCorrect() {
  DQX28_TARGET_IDS.forEach(function (tId) { dqx28Placement[DQX28_CORRECT_MAP[tId]] = tId; });
  const usedIds = DQX28_TARGET_IDS.map(function (tId) { return DQX28_CORRECT_MAP[tId]; });
  DQX28_DRAG_IDS.forEach(function (id) { if (usedIds.indexOf(id) === -1) dqx28Placement[id] = 'source'; });
  dqx28Render();
  DQX28_TARGET_IDS.forEach(function (tId) {
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add('correct'); }
  });
}

/* שחזור "התשובה שלי" מה-snapshot, עם סימון correct/incorrect לכל יעד. */
function dqx28RestoreMine() {
  DQX28_DRAG_IDS.forEach(function (id) { dqx28Placement[id] = dqx28AnswerSnapshot[id]; });
  dqx28Render();
  DQX28_TARGET_IDS.forEach(function (tId) {
    const validId = DQX28_CORRECT_MAP[tId];
    let placedId = null;
    DQX28_DRAG_IDS.forEach(function (dId) { if (dqx28Placement[dId] === tId) placedId = dId; });
    const ok = placedId === validId;
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add(ok ? 'correct' : 'incorrect'); }
  });
}

/* טוגל §9: "מעבר לתשובה שלי" ⇄ "מעבר לתשובה הנכונה". המשוב נשאר פתוח
   ולא משתנה. */
function dqx28ToggleReveal() {
  if (!dqx28Done || !dqx28AnswerSnapshot) return;
  const revealBtn = document.getElementById('dqx28-reveal-btn');
  if (dqx28Revealed) {
    dqx28RestoreMine();
    dqx28Revealed = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    dqx28RevealCorrect();
    dqx28Revealed = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function resetScreenState28() {
  updateQuestionNav2('s28');
  if (dqx28Done) {
    const btn = document.getElementById('dqx28-check');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    const revealBtn = document.getElementById('dqx28-reveal-btn');
    if (revealBtn) {
      if (dqx28AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = dqx28Revealed ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return;
  }
  if (dqx28Attempts > 0 || DQX28_DRAG_IDS.some(function (id) { return dqx28Placement[id] !== 'source'; })) {
    dqx28Render();
    return;
  }
  dqx28DragActive = null;
  dqx28Checked = false;
  dqx28AnswerSnapshot = null;
  dqx28Revealed = false;
  dqx28LastWrong = null;
  document.getElementById('dqx28-popup').classList.remove('visible');
  dqx28Render();
  const btn = document.getElementById('dqx28-check');
  if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
  const revealBtn = document.getElementById('dqx28-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  /* מחווה מונפשת (Gesture Hints, SELF-QA.md §7) — גרירה, מעל הפריט
     הראשון במאגר, פעם אחת במסך הזה. */
  gestureHintShow('s28-drag', 'drag', document.getElementById(DQX28_DRAG_IDS[0]), 'below');
}

/* תוקן (בקשה מפורשת של הלקוח): "לכל התכונות מימין צריך להוסיף אייקון
   של סימן שאלה שלחיצה עליו פותחת בועית עם הגדרה" — בועית דינמית אחת
   משותפת לכל 7 התכונות (אותו דפוס בדיוק כמו s22OpenHotspot/
   S22_MATERIALS למעלה), לא 7 overlay-ים נפרדים. מפתחות התאמה לסיומת
   ה-id של יעדי הגרירה (dqx28-target-<key>) לנוחות, אין קשר פונקציונלי
   ביניהם. טקסט ההגדרות סופק מילה-במילה ע"י הלקוח. */
const DQX28_TERMS = {
  color: { title: 'لون', body: 'درجة اللون التي تظهر بها المادة للعين.' },
  transparency: { title: 'شفافية', body: 'الدرجة التي تسمح بها المادة للضوء بالمرور عبرها.' },
  hardness: { title: 'صلابة', body: 'مقاومة المادة للخدش أو الحفر.' },
  flex: { title: 'ليونة', body: 'القدرة على تغيير شكل المادة عند تطبيق قوة، والعودة إلى شكلها الأصلي عند إزالة القوة.' },
  shine: { title: 'لمعان', body: 'الدرجة التي يعكس بها سطح المادة الضوء ويبدو لامعًا.' },
  magnetism: { title: 'مغناطيسية', body: 'القدرة على الانجذاب إلى المغناطيس.' },
  texture: { title: 'ملمس', body: 'خصائص سطح المادة، على سبيل المثال: أملس أو خشن.' }
};

function dqx28OpenTermInfo(key) {
  const data = DQX28_TERMS[key];
  if (!data) return;
  document.getElementById('dqx28-term-hint-title-text').textContent = data.title;
  document.getElementById('dqx28-term-hint-body-text').innerHTML = data.body.replace(/\n/g, '<br>');
  document.getElementById('dqx28-term-hint-overlay').hidden = false;
}

function dqx28CloseTermInfo() {
  document.getElementById('dqx28-term-hint-overlay').hidden = true;
}

function s27OpenTermInfo() {
  document.getElementById('s27-term-hint-overlay').hidden = false;
}

function s27CloseTermInfo() {
  document.getElementById('s27-term-hint-overlay').hidden = true;
}

function s26OpenTermInfo() {
  document.getElementById('s26-term-hint-overlay').hidden = false;
}

function s26CloseTermInfo() {
  document.getElementById('s26-term-hint-overlay').hidden = true;
}

scqFbMakeDraggable('dqx28-popup');


/* תוקן (2026-08-05): ערבוב-מסיחים — ddq13/ddq27 (בניגוד למשפחת dqx)
   מעולם לא עורבבו: הפריטים הם DOM nodes סטטיים במחסן-המקור, בסדר-
   ההצהרה הקבוע ב-HTML. מערבבים את סדר-הילדים של מחסן-המקור פעם אחת
   באתחול (לפני שהלומד מגיע למסך, אין עדיין state לאבד). */
function shuffleContainerChildren(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const children = Array.from(container.children);
  for (let i = children.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = children[i]; children[i] = children[j]; children[j] = tmp;
  }
  children.forEach(function (child) { container.appendChild(child); });
}
shuffleContainerChildren('ddq27-source-bank');
/* resume: remember the dealt order (persisted; applyResumeVars overrides it with the saved deal). */
(function () {
  const bank = document.getElementById('ddq27-source-bank');
  if (bank) ddq27BankOrder = Array.from(bank.children).map(function (c) { return c.id; }).filter(function (id) { return DDQ27_ITEM_IDS.indexOf(id) !== -1; });
})();

/* אתחול */
scaleApp();
resetScreenState(0);
/* ניווט חוצה-סינים (בקשה מפורשת): "חזרה" מסיין 3 מגיע לכאן עם
   `?start=last` ומצפה למסך האחרון, לא למסך הראשון. */
/* Dev walkthrough only (guide §8.12): the platform launches each component on its own. */
if (typeof DEV_NAV !== 'undefined' && DEV_NAV &&
    new URLSearchParams(window.location.search).get('start') === 'last') {
  goTo(TOTAL_SCREENS - 1);
}


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד, נקראים בזמן call על ידי ../unit-js/ (guide §6.1). SCREEN_TO_SUBCONTENT מחזיק
   בדיוק TOTAL_SCREENS מפתחות (8) — מפתח חסר = מסך שלא מדווח, בשקט; _test/verify-report.js
   אוכף זאת. Value[0] = סיומת הפריט (מחרוזת 3 ספרות), value[1] = עמוד-בפריט (תיעוד בלבד),
   null = מסך בלי פריט בקטלוג. מסכי מעבר/נרטיב ממופים לפריט שהם שייכים לו (D-2: כל פריט בקטלוג
   מקבל מסך; שני המסלולים של סין 01 — קריאה s4 / סרטון s10 — שייכים לפריט 002). מקור:
   docs-and-tools/METADATA-AUDIT.md §2. */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],
  1: ['001', 2],
  2: ['001', 3],
  3: ['001', 4],
  4: ['002', 1],
  5: ['003', 1],
  6: ['004', 1],
  7: ['005', 1]
};

var XAPI_COMP_SLUG = 'methodica-ar-science-body-matter-01-02';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1, '004': 1, '005': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-ar-science-body-matter-01-02.json';
var XAPI_END_BTN = 'dqx28-check';                               /* the part's last button (D-8, restoreEndedButton) */

/* תוצאת הרכיב ל-completed (§6.4 — המכנה הוא מה שהלומד הובטח). */
function xapiPartResult() {
  /* מסך s21 מבטיח 5 أسئلة וסף של 4 מתוך 5 (stationProgress2: 5 תחנות; s23+s24 חולקות תחנה). */
  var ok = [1, 2, 3, 4, 5].filter(function (k) { return stationProgress2[k] === 'success'; }).length;
  return { success: ok >= 4, score: { scaled: ok / 5 } };
}

/* הלחיצה האחרונה של הסין: מדווח completed ועוצר. Kata מסירה את הרכיב ומנתבת (§6.5, §8.12).
   אין window.close, אין alert, אין ניווט — ההמשך לסין הבא חי רק תחת DEV_NAV (סיור מקומי). */
function partFinish(btn) {
  try { xapiEndComponent(xapiPartResult(), btn || document.getElementById(XAPI_END_BTN)); } catch (e) { console.error('[xAPI] partFinish', e); }
  try { flushResumeSave(); } catch (e) {}
  if (DEV_NAV) window.location.href = '../methodica-ar-science-body-matter-01-03/index.html' + window.location.search;
}


/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-10-19): מצב ניקוד/ניתוב בלבד — currentScreen, XAPI_Q_RESULTS ומפות ההתקדמות.
   שלב ב' (2026-10-19): משתני התשובה של כל מסך + ציירים לפי סוג אינטראקציה (§8.8 כללים 1–12).

   payload.screens — תת-אובייקט אחד לכל מסך אינטראקטיבי, לפי ה-prefix שלו:
     s22   { done }                                             שער הטיימר של ההוטספוטים (כלל 11)
     s23 / s24 / s25 { selected, attempts, done, phase, lw }    בחירה יחידה
     s26   { selected[], attempts, done, phase, snap, showingCorrect, a1[], lw }   בחירה מרובה (§8.10)
     ddq27 { done, attempts, snap, revealed, lw, parents, order, flipped[] }       גרירה לאזורים + היפוך — ההורה ב-DOM הוא המודל (§8.9)
     dqx28 { placement, order, checked, attempts, done, snap, revealed, lw }       גרירה לטבלה (הערבוב נשמר, §8.9)
   `lw` = חתימת הניסיון השגוי הלא-אחרון (Retry gate, כלל 9). בחירות ממתינות (לא הוגשו) נשמרות גם הן (כלל 4). */

/* ── עזרים לציירים (rs* — لا מתנגשים עם ../unit-js) ── */
function rsById(id) { return document.getElementById(id); }

function rsParseSig(sig) {
  var m = {};
  if (typeof sig !== 'string' || !sig) return m;
  sig.split(' | ').forEach(function (p) {
    var i = p.indexOf('=');
    if (i > 0) m[p.slice(0, i)] = p.slice(i + 1);
  });
  return m;
}

/* כפתור הטוגל של §9 — מוסתר, או גלוי עם התווית לפי מה שמוצג כרגע. */
function rsSetReveal(id, visible, showingCorrect) {
  var b = rsById(id);
  if (!b) return;
  b.hidden = !visible;
  if (visible) b.textContent = showingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
}

/* צייר לעולם لا זורק (כלל 7): כל جسم-צייר רץ דרך העטיפה הזאת. */
function rsPaint(prefix, painter, cfg) {
  try { painter(cfg); }
  catch (e) { console.error('[resume] paint ' + prefix, e); }
}

function rsCopy(o) { return (o && typeof o === 'object') ? JSON.parse(JSON.stringify(o)) : null; }

/* ── בחירה יחידה (SingleChoiceQuestion) — cfg.state() → {selected, attempts, done, phase, lw} ── */
function paintScq(cfg) {
  if (cfg.nav) cfg.nav();
  var s = cfg.state();
  if (!s.selected && !s.attempts && !s.done) return;       /* מסך נקי: כלום لا נבחר */
  var checkBtn = rsById(cfg.prefix + '-check');
  var hintBtn = rsById(cfg.prefix + '-hint');
  var popup = rsById(cfg.prefix + '-popup');
  var correctId = cfg.q.correctId;
  document.querySelectorAll('#' + cfg.prefix + ' .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', el.dataset.id === s.selected ? 'true' : 'false');
  });
  var sel = s.selected ? cfg.optEl(s.selected) : null;
  if (s.done) {
    if (s.phase === 'wrong-final' || (s.selected && s.selected !== correctId)) {
      if (sel) sel.classList.add('wrong');
      var c = cfg.optEl(correctId);
      if (c) c.classList.add('correct');
      cfg.lock();
      cfg.showFeedback('wrong2', false);
    } else {
      if (sel) sel.classList.add('correct');              /* כלל 8: גם הענף הנכון מצייר */
      cfg.lock();
      cfg.showFeedback('correct', true);
    }
    cfg.setBarDone('متابعة', cfg.cont);                      /* מסתיר גם את כפתור הרמז */
    return;
  }
  cfg.unlock();
  if (hintBtn) hintBtn.hidden = !s.attempts;
  if (checkBtn) { checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.onclick = cfg.check; }
  if (s.attempts && s.lw && s.phase === 'wrong1' && s.selected === s.lw) {
    /* כלל 10: סימון הטעות רק כל עוד התשובה היא זו שהוגשה */
    if (sel) sel.classList.add('wrong');
    cfg.showFeedback('wrong1', false);
    if (checkBtn) checkBtn.disabled = true;
    return;
  }
  if (popup) popup.classList.remove('visible');
  if (sel) sel.classList.add('selected');
  if (checkBtn) checkBtn.disabled = !s.selected || s.selected === s.lw;   /* כלל 2 + Retry gate (כלל 9) */
}

/* ── גרירה לאזורים (DragAndDrop, ההורה ב-DOM הוא המודל) —
   cfg.state() → {done, attempts, snap, revealed, lw}; applyResumeDom כבר החזיר את הפריטים לאזורים. */
function paintDragZones(cfg) {
  if (cfg.nav) cfg.nav();
  var s = cfg.state();
  var zonePrefix = cfg.prefix + '-zone-';
  var items = cfg.itemIds.map(rsById);
  function parentOf(el) { return el && el.parentElement ? el.parentElement.id : ''; }
  function inZone(el) { return parentOf(el).indexOf(zonePrefix) === 0; }
  var anyPlaced = items.some(inZone);
  if (!anyPlaced && !s.attempts && !s.done) return;        /* מסך נקי: כלום لا הונח */
  var btn = rsById(cfg.prefix + '-check');
  var hint = cfg.hintId ? rsById(cfg.hintId) : null;
  if (s.done) {
    if (s.snap) {
      if (s.revealed) cfg.revealCorrect(); else cfg.restoreMine();
      var anyC = cfg.itemIds.some(function (id) {
        var el = rsById(id);
        return !!el && s.snap[id] === zonePrefix + el.dataset.correct;
      });
      cfg.showFeedback(anyC ? 'wrongFinalPartial' : 'wrongFinal', false);
      rsSetReveal(cfg.prefix + '-reveal-btn', true, !!s.revealed);
    } else {
      items.forEach(function (el) {                        /* כלל 8: הענף הנכון מצייר את הסימונים */
        if (!el) return;
        el.classList.remove('correct', 'wrong');
        if (inZone(el)) el.classList.add(el.dataset.correct === parentOf(el).replace(zonePrefix, '') ? 'correct' : 'wrong');
      });
      cfg.showFeedback('correct', true);
      rsSetReveal(cfg.prefix + '-reveal-btn', false);
    }
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; btn.onclick = cfg.cont; }
    if (hint) hint.hidden = true;
    return;
  }
  rsSetReveal(cfg.prefix + '-reveal-btn', false);
  if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.onclick = cfg.check; }
  if (hint) hint.hidden = !s.attempts;
  var boardIsSubmitted = !!(s.attempts && s.lw && cfg.sig() === s.lw);
  var anyCorrectNow = false;
  items.forEach(function (el) {
    if (!el) return;
    el.classList.remove('correct', 'wrong');
    if (!inZone(el)) return;
    var zoneKey = parentOf(el).replace(zonePrefix, '');
    var ok = el.dataset.correct === zoneKey;
    if (ok) anyCorrectNow = true;
    /* כלל 10 + הקוד החי: ClearZoneStates מוחק את כל הסימונים בכל הנחה, ולכן הסימונים חוזרים רק
       כל עוד הלוח כולו שווה לזה שהוגש (לא פר-פריט) */
    if (!s.attempts || !s.lw || !boardIsSubmitted) return;
    el.classList.add(ok ? 'correct' : 'wrong');
  });
  if (boardIsSubmitted) {
    cfg.showFeedback(anyCorrectNow ? 'wrong1Partial' : 'wrong1', false);
    if (btn) btn.disabled = true;
    return;
  }
  if (btn) btn.disabled = !items.every(inZone) || cfg.sig() === s.lw;   /* כלל 2 + Retry gate */
}

/* ── גרירת מילים למשבצות (makeDragQuestion-style, מודל placement + render) —
   cfg.state() → {placement, checked, attempts, done, snap, revealed, lw} */
function paintDragSlots(cfg) {
  if (cfg.nav) cfg.nav();
  var s = cfg.state();
  var anyPlaced = cfg.dragIds.some(function (d) { return s.placement[d] !== 'source'; });
  if (!anyPlaced && !s.attempts && !s.done) return;        /* מסך נקי: כלום لا הונח */
  var btn = rsById(cfg.prefix + '-check');
  var hint = cfg.hintId ? rsById(cfg.hintId) : null;
  function placedIn(map, tId) { var p = null; cfg.dragIds.forEach(function (d) { if (map[d] === tId) p = d; }); return p; }
  cfg.render();                                            /* הלוח מהמודל: כרטיסי רוח, משבצות, סדר הבנק, כפתור הבדיקה */
  if (s.done) {
    cfg.targetIds.forEach(function (tId) {
      var z = rsById(tId);
      if (!z) return;
      z.classList.remove('correct', 'incorrect', 'filled');
      var ok = placedIn(s.placement, tId) === cfg.correctMap[tId];
      z.classList.add((!s.snap || s.revealed || ok) ? 'correct' : 'incorrect');
    });
    if (s.snap) {
      var anyC = cfg.targetIds.some(function (tId) { return placedIn(s.snap, tId) === cfg.correctMap[tId]; });
      cfg.showFeedback(fbCorrectShown(anyC ? cfg.texts.finalPartial : cfg.texts.finalFull), cfg.explanation, 'wrong');
      rsSetReveal(cfg.prefix + '-reveal-btn', true, !!s.revealed);
    } else {
      cfg.showFeedback(cfg.texts.correct, cfg.explanation, 'correct');
      rsSetReveal(cfg.prefix + '-reveal-btn', false);
    }
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    if (hint) hint.hidden = true;
    return;
  }
  rsSetReveal(cfg.prefix + '-reveal-btn', false);
  if (btn) btn.textContent = 'هل إجابتي صحيحة؟';
  if (hint) hint.hidden = !s.attempts;
  var sub = rsParseSig(s.lw);
  var anyCorrectNow = false;
  cfg.targetIds.forEach(function (tId) {
    var z = rsById(tId);
    if (!z) return;
    z.classList.remove('correct', 'incorrect');
    var p = placedIn(s.placement, tId);
    var ok = !!p && p === cfg.correctMap[tId];
    if (ok) anyCorrectNow = true;
    z.classList.toggle('filled', !!p && !s.checked);
    /* כלל 10: משבצת שומרת את הסימון רק כל עוד היא מחזיקה את המילה שהוגשה בה */
    if (!s.attempts || !s.lw || sub[tId.replace(/^.*-target-/, '')] !== (p ? cfg.labels[p] : '—')) return;
    if (!cfg.filledWithMarks) z.classList.remove('filled');   /* dqx20Render skips `filled` on a marked slot; dqx28Render keeps it */
    z.classList.add(ok ? 'correct' : 'incorrect');
  });
  /* כפתור הבדיקה: render() כבר הפעיל את הפרדיקט החי כולל ال-Retry gate */
  if (s.attempts && s.lw && cfg.sig() === s.lw) {
    cfg.showFeedback(anyCorrectNow ? cfg.texts.wrong1Partial : cfg.texts.wrong1Full, 'هل نحاول مرة أخرى؟', 'wrong');
    if (btn) btn.disabled = true;
  }
}


/* ── בחירה מרובה (MultipleChoiceQuestion) — cfg.state() → {selected: Set, attempts, done, phase, snap, showingCorrect, a1: Set|null}
   ה-Retry gate כאן הוא s*Attempt1Submission (קיים בקוד החי); נשמר כ-`a1` וכ-`lw` (ids ממוינים). */
function paintMcq(cfg) {
  if (cfg.nav) cfg.nav();
  var s = cfg.state();
  if (!s.selected.size && !s.attempts && !s.done) return;  /* מסך נקי: כלום لا סומן */
  var checkBtn = rsById(cfg.prefix + '-check');
  var hintBtn = rsById(cfg.prefix + '-hint');
  var popup = rsById(cfg.prefix + '-popup');
  var opts = document.querySelectorAll('#' + cfg.prefix + ' .scq-opt');
  opts.forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', s.selected.has(el.dataset.id) ? 'true' : 'false');
  });
  if (s.done) {
    if (s.phase === 'wrong-final' && s.snap) {
      /* §8.10: snap = התשובה של הלומד; showingCorrect = מה מוצג כרגע */
      opts.forEach(function (el) {
        if (s.showingCorrect) { if (cfg.q.correctSet.has(el.dataset.id)) el.classList.add('correct'); }
        else { var cls = s.snap[el.dataset.id]; if (cls === 'correct' || cls === 'wrong') el.classList.add(cls); }
      });
      var partial = Object.keys(s.snap).some(function (id) { return s.snap[id] === 'correct'; });
      cfg.showFeedback(partial ? 'wrong2Partial' : 'wrong2Full', false);
      rsSetReveal(cfg.prefix + '-reveal-btn', true, !!s.showingCorrect);
    } else {
      s.selected.forEach(function (id) { var el = cfg.optEl(id); if (el) el.classList.add('correct'); });   /* כלל 8 */
      cfg.showFeedback('correct', true);
      rsSetReveal(cfg.prefix + '-reveal-btn', false);
    }
    cfg.lock();
    cfg.setBarDone('متابعة', cfg.cont);
    return;
  }
  rsSetReveal(cfg.prefix + '-reveal-btn', false);
  cfg.unlock();
  if (hintBtn) hintBtn.hidden = !s.attempts;
  if (checkBtn) { checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.onclick = cfg.check; }
  var unchanged = !!(s.a1 && cfg.setsEqual(s.selected, s.a1));
  if (s.attempts && s.phase === 'wrong1' && unchanged) {
    /* כלל 10: סימוני הניסיון רק כל עוד הבחירה היא זו שהוגשה */
    s.selected.forEach(function (id) { var el = cfg.optEl(id); if (el) el.classList.add(cfg.q.correctSet.has(id) ? 'correct' : 'wrong'); });
    var partial1 = Array.from(s.selected).some(function (id) { return cfg.q.correctSet.has(id); });
    cfg.showFeedback(partial1 ? 'wrong1Partial' : 'wrong1Full', false);
    if (checkBtn) checkBtn.disabled = true;
    return;
  }
  if (popup) popup.classList.remove('visible');
  s.selected.forEach(function (id) { var el = cfg.optEl(id); if (el) el.classList.add('selected'); });
  if (checkBtn) checkBtn.disabled = s.selected.size === 0 || unchanged;   /* כלל 2 + Retry gate (הפרדיקט של s26Toggle) */
}

/* ── הקונפיגורציות — נבנות בזמן הקריאה (لا const ברמת הקובץ: goTo של DEV_NAV רץ לפני סוף הקובץ) ── */
function rsCfgScq(prefix, q, fns) {
  return {
    prefix: prefix, q: q, state: fns.state, optEl: fns.optEl, lock: fns.lock, unlock: fns.unlock,
    showFeedback: fns.showFeedback, setBarDone: fns.setBarDone, cont: fns.cont, check: fns.check,
    nav: function () { updateQuestionNav2(prefix); }
  };
}
function rsCfgS23() {
  return rsCfgScq('s23', S23, { state: function () { return { selected: s23Selected, attempts: s23Attempts, done: s23Done, phase: s23Phase, lw: s23LastWrong }; },
    optEl: s23OptEl, lock: s23LockOptions, unlock: s23UnlockOptions, showFeedback: s23ShowFeedback, setBarDone: s23SetBarDone, cont: s23Continue, check: s23Check });
}
function rsCfgS24() {
  return rsCfgScq('s24', S24, { state: function () { return { selected: s24Selected, attempts: s24Attempts, done: s24Done, phase: s24Phase, lw: s24LastWrong }; },
    optEl: s24OptEl, lock: s24LockOptions, unlock: s24UnlockOptions, showFeedback: s24ShowFeedback, setBarDone: s24SetBarDone, cont: s24Continue, check: s24Check });
}
function rsCfgS25() {
  return rsCfgScq('s25', S25, { state: function () { return { selected: s25Selected, attempts: s25Attempts, done: s25Done, phase: s25Phase, lw: s25LastWrong }; },
    optEl: s25OptEl, lock: s25LockOptions, unlock: s25UnlockOptions, showFeedback: s25ShowFeedback, setBarDone: s25SetBarDone, cont: s25Continue, check: s25Check });
}
function rsCfgS26() {
  return {
    prefix: 's26', q: S26,
    state: function () { return { selected: s26Selected, attempts: s26Attempts, done: s26Done, phase: s26Phase, snap: s26AnswerSnapshot, showingCorrect: s26ShowingCorrect, a1: s26Attempt1Submission }; },
    optEl: s26OptEl, setsEqual: s26SetsEqual, lock: s26LockOptions, unlock: s26UnlockOptions, showFeedback: s26ShowFeedback,
    setBarDone: s26SetBarDone, cont: s26Continue, check: s26Check, nav: function () { updateQuestionNav2('s26'); }
  };
}
function rsCfgDdq27() {
  return {
    prefix: 'ddq27', itemIds: DDQ27_ITEM_IDS,
    state: function () { return { done: ddq27Done, attempts: ddq27Attempts, snap: ddq27AnswerSnapshot, revealed: ddq27Revealed, lw: ddq27LastWrong }; },
    sig: ddq27Sig, showFeedback: ddq27ShowFeedback, revealCorrect: ddq27RevealCorrect, restoreMine: ddq27RestoreMine,
    cont: ddq27Continue, check: ddq27Check, hintId: 's27-hint', nav: function () { updateQuestionNav2('s27'); }
  };
}
function rsCfgDqx28() {
  return {
    prefix: 'dqx28', labels: DQX28_LABELS, correctMap: DQX28_CORRECT_MAP, dragIds: DQX28_DRAG_IDS, targetIds: DQX28_TARGET_IDS,
    state: function () { return { placement: dqx28Placement, checked: dqx28Checked, attempts: dqx28Attempts, done: dqx28Done, snap: dqx28AnswerSnapshot, revealed: dqx28Revealed, lw: dqx28LastWrong }; },
    sig: dqx28Sig, render: dqx28Render, showFeedback: dqx28ShowFeedback, explanation: DQX28_SHARED_EXPLANATION,
    texts: { correct: 'ممتاز!', wrong1Full: 'الإجابة غير صحيحة.', wrong1Partial: 'الإجابة صحيحة جزئيًا.',
             finalFull: 'الإجابة غير صحيحة. لا بأس، نتعلّم أيضًا من الأخطاء!', finalPartial: 'الإجابة صحيحة جزئيًا.' },
    filledWithMarks: true,   /* dqx28Render adds `filled` to every placed slot, marked or not */
    hintId: null, nav: function () { updateQuestionNav2('s28'); }
  };
}

/* ── 1. capture ── */
function rsScqSlice(selected, attempts, done, phase, lw) {
  return { selected: selected, attempts: attempts, done: done, phase: phase, lw: lw };
}
function capturePartPayload() {
  var ddq27Parents = {}, ddq27Flipped = [];
  DDQ27_ITEM_IDS.forEach(function (id) {
    var el = rsById(id);
    ddq27Parents[id] = el && el.parentElement ? el.parentElement.id : 'ddq27-source-bank';
    if (el && el.classList.contains('is-flipped')) ddq27Flipped.push(id);
  });
  var a1 = s26Attempt1Submission ? Array.from(s26Attempt1Submission) : null;
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    stationProgress2: Object.assign({}, stationProgress2),
    screens: {
      s22: { done: s22Done },
      s23: rsScqSlice(s23Selected, s23Attempts, s23Done, s23Phase, s23LastWrong),
      s24: rsScqSlice(s24Selected, s24Attempts, s24Done, s24Phase, s24LastWrong),
      s25: rsScqSlice(s25Selected, s25Attempts, s25Done, s25Phase, s25LastWrong),
      s26: { selected: Array.from(s26Selected), attempts: s26Attempts, done: s26Done, phase: s26Phase,
             snap: rsCopy(s26AnswerSnapshot), showingCorrect: s26ShowingCorrect, a1: a1,
             lw: a1 ? a1.slice().sort().join(',') : null },
      ddq27: { done: ddq27Done, attempts: ddq27Attempts, snap: rsCopy(ddq27AnswerSnapshot), revealed: ddq27Revealed,
               lw: ddq27LastWrong, parents: ddq27Parents, order: ddq27BankOrder.slice(), flipped: ddq27Flipped },
      dqx28: { placement: Object.assign({}, dqx28Placement), order: dqx28Order.slice(), checked: dqx28Checked,
               attempts: dqx28Attempts, done: dqx28Done, snap: rsCopy(dqx28AnswerSnapshot), revealed: dqx28Revealed, lw: dqx28LastWrong }
    }
  };
}

/* ── 2. variables (never the DOM). Safe with a stage-A / partial payload. ── */
function rsSameMembers(arr, ids) {
  return Array.isArray(arr) && arr.length === ids.length && ids.every(function (id) { return arr.indexOf(id) !== -1; });
}
function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults) Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  if (st.stationProgress2) Object.keys(st.stationProgress2).forEach(function (k) { stationProgress2[k] = st.stationProgress2[k]; });
  var sc = st.screens;
  if (!sc || typeof sc !== 'object') return;
  var v;
  if ((v = sc.s22)) s22Done = !!v.done;
  if ((v = sc.s23)) {
    s23Selected = typeof v.selected === 'string' ? v.selected : null; s23Attempts = v.attempts | 0; s23Done = !!v.done;
    s23Phase = typeof v.phase === 'string' ? v.phase : 'before'; s23LastWrong = typeof v.lw === 'string' ? v.lw : null;
  }
  if ((v = sc.s24)) {
    s24Selected = typeof v.selected === 'string' ? v.selected : null; s24Attempts = v.attempts | 0; s24Done = !!v.done;
    s24Phase = typeof v.phase === 'string' ? v.phase : 'before'; s24LastWrong = typeof v.lw === 'string' ? v.lw : null;
  }
  if ((v = sc.s25)) {
    s25Selected = typeof v.selected === 'string' ? v.selected : null; s25Attempts = v.attempts | 0; s25Done = !!v.done;
    s25Phase = typeof v.phase === 'string' ? v.phase : 'before'; s25LastWrong = typeof v.lw === 'string' ? v.lw : null;
  }
  if ((v = sc.s26)) {
    s26Selected = new Set(Array.isArray(v.selected) ? v.selected.filter(function (x) { return typeof x === 'string'; }) : []);
    s26Attempts = v.attempts | 0;
    s26Done = !!v.done;
    s26Phase = typeof v.phase === 'string' ? v.phase : 'before';
    s26AnswerSnapshot = rsCopy(v.snap);
    s26ShowingCorrect = !!v.showingCorrect;
    var a1 = Array.isArray(v.a1) ? v.a1 : (typeof v.lw === 'string' && v.lw ? v.lw.split(',') : null);
    s26Attempt1Submission = a1 ? new Set(a1.filter(function (x) { return typeof x === 'string'; })) : null;
  }
  if ((v = sc.ddq27)) {
    ddq27Done = !!v.done;
    ddq27Attempts = v.attempts | 0;
    ddq27AnswerSnapshot = rsCopy(v.snap);
    ddq27Revealed = !!v.revealed;
    ddq27LastWrong = typeof v.lw === 'string' ? v.lw : null;
    if (rsSameMembers(v.order, DDQ27_ITEM_IDS)) ddq27BankOrder = v.order.slice();   /* never re-deal (§8.9) */
  }
  if ((v = sc.dqx28)) {
    DQX28_DRAG_IDS.forEach(function (id) {
      var p = v.placement ? v.placement[id] : null;
      dqx28Placement[id] = (p === 'source' || DQX28_TARGET_IDS.indexOf(p) !== -1) ? p : 'source';
    });
    if (rsSameMembers(v.order, DQX28_DRAG_IDS)) dqx28Order = v.order.slice();   /* never re-deal (§8.9) */
    dqx28Checked = !!v.checked;
    dqx28Attempts = v.attempts | 0;
    dqx28Done = !!v.done;
    dqx28AnswerSnapshot = rsCopy(v.snap);
    dqx28Revealed = !!v.revealed;
    dqx28LastWrong = typeof v.lw === 'string' ? v.lw : ((dqx28Attempts > 0 && !dqx28Done) ? dqx28Sig() : null);   /* old-doc fallback (rule 9) */
  }
}

/* ── 3. what lives only in the DOM (runs AFTER goTo; the painter re-derives the buttons, rule 11) ── */
function applyResumeDom(st) {
  if (!st || !st.screens || typeof st.screens !== 'object') return;
  var sc = st.screens;
  /* ddq27 — DOM parentage is the model: re-append each item into its saved container, in the dealt order;
     the flipped cards are a class written only by the click handler (ddq27Flip). */
  if (sc.ddq27 && sc.ddq27.parents && typeof sc.ddq27.parents === 'object') {
    var bank = rsById('ddq27-source-bank');
    var order = ddq27BankOrder.slice();
    DDQ27_ITEM_IDS.forEach(function (id) { if (order.indexOf(id) === -1) order.push(id); });
    var flipped = Array.isArray(sc.ddq27.flipped) ? sc.ddq27.flipped : [];
    order.forEach(function (id) {
      var el = rsById(id);
      if (!el) return;
      var pid = sc.ddq27.parents[id];
      var p = (typeof pid === 'string' && (pid === 'ddq27-source-bank' || pid.indexOf('ddq27-zone-') === 0)) ? rsById(pid) : null;
      if (!p) p = bank;
      if (p) p.appendChild(el);
      el.classList.toggle('is-flipped', flipped.indexOf(id) !== -1);
      /* משוחזר — ישר למצב המיושב (אין אנימציה שתסיים אותו, המסך אולי עוד
         לא מוצג ו-transitionend לא יגיע). */
      ddq27Settle(el);
    });
  }
  /* dqx28 — rendered from the restored model by dqx28Render (the painter calls it); nothing DOM-only here. */
}

/* ── 4. painter dispatch — one branch per interactive / gated screen (rule 11) ── */
function restoreScreenUI(n) {
  switch (n) {
    case 1: rsPaint('s22', function () { if (s22Done) resetScreenState22(); }); break;   /* שער הטיימר — סנכרון אידמפוטנטי כשהושג */
    case 2: rsPaint('s23', paintScq, rsCfgS23()); break;
    case 3: rsPaint('s24', paintScq, rsCfgS24()); break;
    case 4: rsPaint('s25', paintScq, rsCfgS25()); break;
    case 5: rsPaint('s26', paintMcq, rsCfgS26()); break;
    case 6: rsPaint('ddq27', paintDragZones, rsCfgDdq27()); break;
    case 7: rsPaint('dqx28', paintDragSlots, rsCfgDqx28()); break;
    default: break;   /* 0 (s21) — מסך מעבר, אין מצב */
  }
}
