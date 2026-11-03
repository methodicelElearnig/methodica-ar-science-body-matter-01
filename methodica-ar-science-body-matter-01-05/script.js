'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 9; // יעודכן עם כל מסך محتوى שנוסף
let currentScreen = 0;

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
   דרך המנגנון הפרטני — אומת בפועל ותוקן במסך 2 בסיין 1), כל hint overlay
   מקבל id שמסתיים ב-"-hint-overlay" (נסגר ע"י הגדרת ה-hidden property
   הנייטיבי, אותו מנגנון בדיוק ש-scqOpenHint/scqCloseHint משתמשים בו). */
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
  currentScreen = n;
  resetScreenState(n);
  target.classList.add('active');
  /* תוקן (2026-08-05): "Reopening feedback on return to a resolved
     screen" — ראו scene1/script.js לפירוט המלא. */
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
    2: { done: s2Done, popup: 's2-popup' },
    4: { done: s4Done, popup: 's4-popup' },
    5: { done: dqx5Done, popup: 'dqx5-popup' },
    6: { done: s6Done, popup: 's6-popup' },
    7: { done: oddqDone, popup: 'oddq-popup' }
  };
  const entry = map[n];
  if (!entry || !entry.done) return;
  scqFbResetPosition(entry.popup);
  document.getElementById(entry.popup).classList.add('visible');
}

function resetScreenState(n) {
  if (n === 0) resetScreenState0();
  if (n === 1) updateQuestionNav('s1'); /* הקדמה לשאלה 1 */
  if (n === 2) resetScreenState2();
  if (n === 3) updateQuestionNav('s3'); /* הקדמה לשאלה 2 */
  if (n === 4) resetScreenState4();
  if (n === 5) resetScreenState5();
  if (n === 6) resetScreenState6();
  if (n === 7) resetScreenState7();
  if (n === 8) resetScreenState8();
  /* כל מסך محتوى נוסף יקבל כאן ענף resetScreenStateN() משלו */
}

/* מסך 1 — דמות בווידאו אמיתי "מרימה משקולת כבדה מאוד" (green-avatar-
   heavy-weight.mp4/turquoise-avatar-heavy-weights.mp4, סופקו בפועל),
   אותו חוזה resolveCharBubbleVideo כמו בשאר הפרויקט. */
const S0_AVATAR_ASSETS = {
  'character-1': 'assets/videos/green-avatar-heavy-weight.mp4',
  'character-2': 'assets/videos/turquoise-avatar-heavy-weights.mp4'
};

function resetScreenState0() {
  resolveCharBubbleVideo('s0-avatar-video', S0_AVATAR_ASSETS);
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
  /* תוקן (2026-08-05): לא הוגדר src="" כשאין עדיין דמות נבחרת — src=""
     גורם לדפדפן לנסות לטעון מחדש את URL המסמך עצמו כתמונה ונכשל,
     ומציג אייקון "תמונה שבורה". מסירים את ה-attribute כשאין src. */
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
   Gesture Hints (עדכון מעצבת בפיגמה, node 2915:35184/35189/35185
   "Cursor Scroll/Click/Drag", ראו SELF-QA.md §7 לפירוט המלא/מקור-
   האמת). מנוע גנרי, מזוהה לפי key חד-ערכי-למסך — show נכשל בשקט אם
   ה-key הזה כבר הוצג פעם (Set בזיכרון, לא persisted — מתאפס בטעינה
   חוזרת, כמו כל דגל "הושלם" אחר בפרויקט), reposition ממיר קואורדינטות
   מסך-אמיתי לחלל הפנימי הלא-מוגדל של #app (חלוקה ב-scale החי), hide
   מסיר בהדרגה (transition) ואז מוחק את האלמנט מה-DOM. הועתק 1:1
   מ-methodica-ar-science-body-matter-01-01/script.js. */
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
  requestAnimationFrame(function () {
    gestureHintReposition(hint, targetEl, vAnchor);
    hint.classList.add('visible');
  });
  return hint;
}

/* תוקן (2026-09-15, בקשה מפורשת: "היד מופיעה במקום שמסתיר את הטקסט
   של אלמנט הגרירה, צריך להזיז אותה טיפה שתצביע על האלמנט בתנאי
   שלא מסתיר את הטקסט"), **תוקן שוב (2026-09-15, אחרי שהלקוח ציין
   שהמיקום עדיין לא תקין וצירף רפרנס-פיגמה, node 2915:35185
   "Cursor Drag")**: הניסיון הקודם ('top') עדיין נכשל עבור פילים
   קצרים/ממורכזים, כי גובה-היד (33px) גדול מגובה-הפיל (~46px).
   בדיקה ישירה של gesture-hand.svg (זהה בייט-לבייט לאסט הרשמי
   בפיגמה) גילתה שהאצבע-המצביעה פונה **כלפי מעלה**, לא מטה — היד
   צריכה לגעת ביעד *מלמטה*, לא מלמעלה. vAnchor:'below' (רק ממסך
   6/s5, לא גלובלי) ממקם את כל מלבן-היד מתחת לקצה התחתון של הפיל
   לגמרי, בלי שום חפיפה — קצה-האצבע (חלק עליון של המלבן) נוגע כמעט
   בקצה התחתון של הפיל ומצביע כלפיו. אומת ויזואלית + מדידת
   getBoundingClientRect בפועל. */
function gestureHintReposition(hint, targetEl, vAnchor) {
  const app = document.getElementById('app');
  const appRect = app.getBoundingClientRect();
  const scale = appRect.width / app.offsetWidth;
  const targetRect = targetEl.getBoundingClientRect();
  const cx = (targetRect.left + targetRect.width / 2 - appRect.left) / scale;
  let cy = (targetRect.top + targetRect.height / 2 - appRect.top) / scale;
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
   הגדלת יישומון (applet-zoom) — רכיב גלובלי יחיד, לפי בקשה מפורשת
   של הלקוח: "היישומון קטן מאוד וקשה להשתמש בו" (מסכים 2-6, s1-s5).
   מודל-יחיד-משותף (לא clone-DOM כמו img-zoom): כל 5 המופעים מטמיעים
   בדיוק אותו קובץ סטטי, אז אין "תוכן חי משתנה" להעתיק — המודל עצמו
   מכיל iframe קבוע משלו, שמוצג/מוסתר בלבד. מאזיני click/keydown
   נפרדים (לא reuse של אלה של img-zoom) כדי לא להסתבך עם הבדיקה
   הספציפית-ל-ID שכבר קיימת שם — data-attribute שונה
   (data-applet-zoom-close) מונע כל התנגשות. */
function appletZoomOpen() {
  const modal = document.getElementById('applet-zoom-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function appletZoomClose() {
  const modal = document.getElementById('applet-zoom-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

document.addEventListener('click', function (e) {
  const closeTarget = e.target.closest('[data-applet-zoom-close="true"]');
  if (!closeTarget) return;
  if (closeTarget.id === 'applet-zoom-modal' && e.target.closest('.applet-zoom-modal__panel')) return;
  appletZoomClose();
});

document.addEventListener('keydown', function (e) {
  const modal = document.getElementById('applet-zoom-modal');
  if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) appletZoomClose();
});

/* =========================================================
   סרגל התקדמות — 4 שקעים (מסכים 3,5,6,7,8 / s2,s4,s5,s6,s7). מסכים
   5-6 (s4/s5) חולקים שקע 2 (סעיפים א/ב של שאלה 2), כמו מסכים 23-24
   בסיין 1.
   ========================================================= */
const SLOT_OF = { s1: 1, s2: 1, s3: 2, s4: 2, s5: 2, s6: 3, s7: 4 };
let stationProgress = { 1: null, 2: null, 3: null, 4: null };

function updateQuestionNav(prefix) {
  const currentSlot = SLOT_OF[prefix];
  for (let i = 1; i <= 4; i++) {
    const icon = document.getElementById(prefix + '-qnav-icon-' + i);
    const label = document.getElementById(prefix + '-qnav-label-' + i);
    if (!icon) continue;
    icon.className = 'qnav-icon';
    if (label) label.className = 'qnav-label';
    if (stationProgress[i] === 'success') {
      icon.classList.add('qnav-success');
      if (label) label.classList.add('qnav-label-active');
    } else if (stationProgress[i] === 'fail') {
      icon.classList.add('qnav-fail');
      if (label) label.classList.add('qnav-label-active');
    } else if (i === currentSlot) {
      icon.classList.add('qnav-current');
      if (label) label.classList.add('qnav-label-active');
    } else {
      icon.classList.add('qnav-future');
    }
  }
  for (let i = 1; i <= 3; i++) {
    const line = document.getElementById(prefix + '-qnav-line-' + i);
    if (!line) continue;
    line.className = 'qnav-line';
    if (stationProgress[i] !== null) line.classList.add('line-done');
  }
}

/* =========================================================
   מסך 3 (s2) — שאלה 1 מתוך 4: SingleChoiceQuestion מלווה ביישומון.
   בלי כפתור רמז כלל (לפי בקשה מפורשת). תוכן לפי שקף 59.
   ========================================================= */
const S2 = {
  correctId: 'b',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'البلاستيك الشفاف هو المادة التي تلبّي المتطلبات الثلاثة: قابلية كسر منخفضة، وشفافية عالية، وصلابة عالية.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: 'الإجابة غير صحيحة. الإجابة الصحيحة معروضة.',
      body: 'البلاستيك الشفاف هو المادة التي تلبّي المتطلبات الثلاثة: قابلية كسر منخفضة، وشفافية عالية، وصلابة عالية.'
    }
  }
};

let s2Selected = null;
let s2Attempts = 0;
let s2Done = false;
let s2Phase = 'before';
let s2LastWrong = null; // Retry gate (guide §8.8 rule 9): the option id submitted on a non-final wrong attempt

function s2OptEl(id) {
  return document.querySelector('#s2 .scq-opt[data-id="' + id + '"]');
}

function s2Select(id) {
  if (s2Done) return;
  const wasWrong1 = (s2Phase === 'wrong1');
  document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s2OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s2Selected = id;
  s2Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s2-popup').classList.remove('visible');
  }
  const checkBtn = document.getElementById('s2-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = (s2Selected === s2LastWrong); // Retry gate (rule 9)
  checkBtn.onclick = s2Check;
}

function s2ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s2-popup');
  const data = S2.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s2-popup');
  box.classList.add('visible');
}

function s2SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s2-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function s2LockOptions() {
  document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s2UnlockOptions() {
  document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s2Select(el.dataset.id); };
  });
}

function s2Continue() {
  goTo(3);
}

function s2Check() {
  if (!s2Selected || s2Done) return;
  s2Attempts++;
  const optEl = s2OptEl(s2Selected);
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('001', 'q1', s2Selected === S2.correctId,
    s2Selected === S2.correctId || s2Attempts >= S2.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s2Selected === S2.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s2Phase = 'correct';
    s2Done = true;
    s2LockOptions();
    s2ShowFeedback('correct', true);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[1] = 'success';
    updateQuestionNav('s2');
    s2LastWrong = null;
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s2Attempts < S2.maxAttempts) {
    s2Phase = 'wrong1';
    s2LastWrong = s2Selected;
    s2ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s2-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s2Check;
    try { flushResumeSave(); } catch (e) {}
  } else {
    s2OptEl(S2.correctId).classList.add('correct');
    s2Phase = 'wrong-final';
    s2Done = true;
    s2LastWrong = null;
    s2LockOptions();
    s2ShowFeedback('wrong2', false);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[1] = 'fail';
    updateQuestionNav('s2');
    try { flushResumeSave(); } catch (e) {}
  }
}

function resetScreenState2() {
  updateQuestionNav('s2');
  if (s2Done || s2Attempts > 0 || s2Selected) return; // resume-state guard
  s2Selected = null;
  s2Attempts = 0;
  s2Phase = 'before';
  s2LastWrong = null;
  s2UnlockOptions();
  document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s2-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s2-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s2Check;
}

scqFbMakeDraggable('s2-popup');

/* =========================================================
   מסך 5 (s4) — שאלה 2 סעיף א' מתוך 4: SingleChoiceQuestion מלווה
   ביישומון. שכפול מכני מלא של S2/s2* (מסך 3). בלי כפתור רמז כלל
   (לפי בקשה מפורשת). תוכן לפי שקף 61. שקע 2 (משותף עם s5, סעיף ב').
   ========================================================= */
const S4 = {
  correctId: 'c',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'المعدن هو المادة التي تلبّي المتطلبات الثلاثة: قابلية كسر منخفضة، وشفافية منخفضة، وصلابة دون متطلبات خاصة.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: 'الإجابة غير صحيحة. الإجابة الصحيحة معروضة.',
      body: 'المعدن هو المادة التي تلبّي المتطلبات الثلاثة: قابلية كسر منخفضة، وشفافية منخفضة، وصلابة دون متطلبات خاصة.'
    }
  }
};

let s4Selected = null;
let s4Attempts = 0;
let s4Done = false;
let s4Phase = 'before';
let s4LastWrong = null; // Retry gate (guide §8.8 rule 9): the option id submitted on a non-final wrong attempt

function s4OptEl(id) {
  return document.querySelector('#s4 .scq-opt[data-id="' + id + '"]');
}

function s4Select(id) {
  if (s4Done) return;
  const wasWrong1 = (s4Phase === 'wrong1');
  document.querySelectorAll('#s4 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s4OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s4Selected = id;
  s4Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s4-popup').classList.remove('visible');
  }
  const checkBtn = document.getElementById('s4-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = (s4Selected === s4LastWrong); // Retry gate (rule 9)
  checkBtn.onclick = s4Check;
}

function s4ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s4-popup');
  const data = S4.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s4-popup');
  box.classList.add('visible');
}

function s4SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s4-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function s4LockOptions() {
  document.querySelectorAll('#s4 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s4UnlockOptions() {
  document.querySelectorAll('#s4 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s4Select(el.dataset.id); };
  });
}

function s4Continue() {
  goTo(5);
}

function s4Check() {
  if (!s4Selected || s4Done) return;
  s4Attempts++;
  const optEl = s4OptEl(s4Selected);
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('002', 'q1', s4Selected === S4.correctId,
    s4Selected === S4.correctId || s4Attempts >= S4.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s4Selected === S4.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s4Phase = 'correct';
    s4Done = true;
    s4LockOptions();
    s4ShowFeedback('correct', true);
    s4SetBarDone('متابعة', s4Continue);
    stationProgress[2] = 'success';
    updateQuestionNav('s4');
    s4LastWrong = null;
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s4Attempts < S4.maxAttempts) {
    s4Phase = 'wrong1';
    s4LastWrong = s4Selected;
    s4ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s4-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s4Check;
    try { flushResumeSave(); } catch (e) {}
  } else {
    s4OptEl(S4.correctId).classList.add('correct');
    s4Phase = 'wrong-final';
    s4Done = true;
    s4LastWrong = null;
    s4LockOptions();
    s4ShowFeedback('wrong2', false);
    s4SetBarDone('متابعة', s4Continue);
    stationProgress[2] = 'fail';
    updateQuestionNav('s4');
    try { flushResumeSave(); } catch (e) {}
  }
}

function resetScreenState4() {
  updateQuestionNav('s4');
  if (s4Done || s4Attempts > 0 || s4Selected) return; // resume-state guard
  s4Selected = null;
  s4Attempts = 0;
  s4Phase = 'before';
  s4LastWrong = null;
  s4UnlockOptions();
  document.querySelectorAll('#s4 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s4-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s4-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s4Check;
}

scqFbMakeDraggable('s4-popup');

/* =========================================================
   מסך 6 (s5) — שאלה 2 סעיף ב' מתוך 4: שאלת גרירה טקסטואלית (השלמת
   טענה מדעית ממחסן מילים). שוכפל ממנגנון dqx19/dqx27 בסיין 1
   (makeDragQuestion factory) — state machine זהה (placement עוקב
   draggable→'source'|targetId). בלי כפתור רמז כלל (לפי בקשה
   מפורשת). 3 מילים בדיוק ל-3 מקומות (בלי מסיחים), מעורבבות פעם אחת
   בטעינה (Fisher-Yates). שקע qnav 2 (משותף עם s4) — מעדכן את אותו
   שקע כמו s22/s23 בסיין 1 (כל סעיף כותב את התוצאה שלו, האחרון גובר).
   ========================================================= */
const DQX5_LABELS = {
  'dqx5-drag-shvirut': 'قابلية الكسر',
  'dqx5-drag-namucha': 'منخفضة',
  'dqx5-drag-metal': 'معدن'
};
const DQX5_CORRECT_MAP = {
  'dqx5-target-1': 'dqx5-drag-shvirut',
  'dqx5-target-2': 'dqx5-drag-namucha',
  'dqx5-target-3': 'dqx5-drag-metal'
};
const DQX5_DRAG_IDS = Object.keys(DQX5_LABELS);
const DQX5_TARGET_IDS = Object.keys(DQX5_CORRECT_MAP);
/* xAPI result.response: slot id → the sentence stem before the slot as the metadata names it
   (= metadata 002/q2 answers.target, byte for byte); DQX5_LABELS are the answers.source words. */
const DQX5_SLOT_LABELS = {
  'dqx5-target-1': 'الخاصية الوحيدة المهمة للقنينة هي',
  'dqx5-target-2': 'على مستوى',
  'dqx5-target-3': 'الأنسب لإنتاج قنينة المكتب هو'
};

let dqx5Placement = {};
DQX5_DRAG_IDS.forEach(function (id) { dqx5Placement[id] = 'source'; });
let dqx5Checked = false;
let dqx5Attempts = 0;
let dqx5Done = false;
let dqx5AnswerSnapshot = null;
let dqx5ShowingCorrect = false; // true = board currently shows the §9 reveal (correct answers)
let dqx5LastWrong = null; // Retry gate (guide §8.8 rule 9): dqx5Sig() of the non-final wrong submission

/* גרירת Pointer Events (עכבר + מגע) — ../unit-js/30-pointer-dnd.js (תוקן 2026-11-03, MOE
   "גרירה לא עובדת בטאבלט"). dqx5Render בונה את כרטיסי הבנק והמילים המוצבות מחדש בכל
   רינדור ומצמיד כל אחד מהם (attachSource); התיבות והבנק מוצמדים פעם אחת כאן.
   dqx5Placement נשאר המודל היחיד; הטלה מחוץ ליעד = חזרה לבנק (כמו dragend בלי drop). */
const dqx5Dnd = createPointerDnd({
  canDrag: function () { return !dqx5Checked && !dqx5Done; },
  onPick: function (dragId, src) {                      /* הלחיצה הפכה לגרירה (מעבר ל-6px) */
    gestureHintHide('s5-drag');                       /* נעלם ברגע שהלומד מתחיל לגרור */
    if (dqx5Attempts > 0) document.getElementById('dqx5-popup').classList.remove('visible');
    if (src.classList.contains('dqx-drop-word')) {     /* מילה מוצבת: התיבה "מתרוקנת" חזותית עד ההטלה */
      const oldZone = document.getElementById(dqx5Placement[dragId]);
      if (oldZone) { oldZone.classList.remove('correct', 'incorrect', 'filled'); oldZone.classList.add('drag-origin'); }
    }
  },
  onGhost: function (ghost, src) {                      /* רוח אחיד: גלולת dqx-drag-card, גם כשגוררים מילה מוצבת */
    const dragId = src.dataset.pdragId;
    if (src.classList.contains('dqx-drop-word')) {
      const ref = document.getElementById(dragId) || document.getElementById(dqx5Placement[dragId]);
      ghost.className = 'dqx-drag-card pointer-drag-ghost';
      ghost.textContent = DQX5_LABELS[dragId];
      if (ref) { ghost.style.width = ref.offsetWidth + 'px'; ghost.style.height = ref.offsetHeight + 'px'; }
    }
  },
  onDrop: function (dragId, targetId) {
    if (targetId === 'bank') {
      dqx5Placement[dragId] = 'source';
    } else {
      const zone = document.getElementById(targetId);
      if (zone) zone.classList.remove('correct', 'incorrect');
      DQX5_DRAG_IDS.forEach(function (dId) { if (dqx5Placement[dId] === targetId && dId !== dragId) dqx5Placement[dId] = 'source'; });
      dqx5Placement[dragId] = targetId;
    }
    dqx5Render();
  },
  onCancel: function (dragId) {                         /* הטלה מחוץ ליעד: כמו dragend בלי drop — חזרה לבנק */
    dqx5Placement[dragId] = 'source';
    dqx5Render();
  }
});
DQX5_TARGET_IDS.forEach(function (tId) { dqx5Dnd.attachTarget(document.getElementById(tId), tId); });
dqx5Dnd.attachTarget(document.getElementById('dqx5-word-bank'), 'bank');

/* The feedback texts, hoisted so the resume painter shows exactly what dqx5Check showed. */
const DQX5_FB = {
  correct: { title: 'ممتاز!', body: 'لقد أكملت الادّعاء العلمي بشكل صحيح.' },
  wrong1: { title: 'الإجابة غير صحيحة.', body: 'هل نحاول مرة أخرى؟' },
  wrong1Partial: { title: 'الإجابة صحيحة جزئيًا.', body: 'هل نحاول مرة أخرى؟' },
  wrongFinal: { title: fbCorrectShown('الإجابة غير صحيحة.'), body: 'لا بأس، نتعلم أيضًا من الأخطاء.' },
  wrongFinalPartial: { title: fbCorrectShown('الإجابة صحيحة جزئيًا.'), body: 'لا بأس، نتعلم أيضًا من الأخطاء.' }
};

/* Signature of the current board, compared against dqx5LastWrong (rule 9: slot=label, by label). */
function dqx5Sig() {
  return DQX5_TARGET_IDS.map(function (tId) {
    let placed = null;
    DQX5_DRAG_IDS.forEach(function (dId) { if (dqx5Placement[dId] === tId) placed = dId; });
    return tId.replace(/^.*-target-/, '') + '=' + (placed ? DQX5_LABELS[placed] : '—');
  }).join(' | ');
}

let dqx5Order = DQX5_DRAG_IDS.slice();
(function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
})(dqx5Order);

function dqx5Render() {
  dqx5Order.forEach(function (dragId) {
    const slot = document.getElementById('slot-' + dragId);
    if (!slot) return;
    /* תוקן (2026-08-05): ערבוב-מסיחים אמיתי — dqx5Order מעורבב היה
       ללא השפעה חזותית (כל dragId תמיד מתמלא ל-slot הקבוע שלו-עצמו).
       מזיזים את ה-slot עצמו לסוף ה-container בכל איטרציה. */
    if (slot.parentElement) slot.parentElement.appendChild(slot);
    slot.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'dqx-drag-card';
    card.id = dragId;
    if (dqx5Placement[dragId] === 'source') {
      card.textContent = DQX5_LABELS[dragId];
      if (!dqx5Checked) {
        dqx5Dnd.attachSource(card, dragId);   /* Pointer DnD (30-pointer-dnd.js) */
      } else {
        card.classList.add('locked');
      }
    } else {
      card.classList.add('ghost');
      card.textContent = DQX5_LABELS[dragId];
    }
    slot.appendChild(card);
  });

  DQX5_TARGET_IDS.forEach(function (targetId) {
    const zone = document.getElementById(targetId);
    if (!zone) return;
    let placedId = null;
    DQX5_DRAG_IDS.forEach(function (dId) { if (dqx5Placement[dId] === targetId) placedId = dId; });
    zone.innerHTML = '';
    zone.classList.remove('filled', 'drag-origin');
    if (placedId) {
      /* תוקן (2026-08-04): guard נוסף — אחרי ניסיון שגוי ראשון,
         dqx5Check() מאפס Checked=false ומפעיל Render() שוב כדי לאפשר
         גרירה חוזרת; בלי ה-guard, 'filled' היה חוזר יחד עם 'incorrect'
         שנשאר על התא (Render לא מסיר correct/incorrect), והטקסט היה
         נראה בסגנון "הונח" (22px/#222) במקום "שגוי" (24px/#303030). */
      if (!dqx5Checked && !zone.classList.contains('correct') && !zone.classList.contains('incorrect')) zone.classList.add('filled');
      const iconEl = document.createElement('span');
      iconEl.className = 'dqx-drop-icon';
      const wordEl = document.createElement('span');
      wordEl.className = 'dqx-drop-word';
      wordEl.textContent = DQX5_LABELS[placedId];
      if (!dqx5Checked) {
        wordEl.style.cursor = 'grab';
        dqx5Dnd.attachSource(wordEl, placedId);   /* מילה מוצבת נגררת חזרה / לתיבה אחרת */
      }
      zone.appendChild(iconEl);
      zone.appendChild(wordEl);
    }
  });

  const allFilled = DQX5_TARGET_IDS.every(function (tId) {
    return DQX5_DRAG_IDS.some(function (dId) { return dqx5Placement[dId] === tId; });
  });
  const btn = document.getElementById('dqx5-check');
  if (btn && !dqx5Done) btn.disabled = !allFilled || dqx5Sig() === dqx5LastWrong; // Retry gate (rule 9)
}



function dqx5ShowFeedback(title, body, kind) {
  const box = document.getElementById('dqx5-popup');
  box.querySelector('.scq-fb-title-text').textContent = title;
  box.querySelector('.scq-fb-body').innerHTML = body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(kind === 'correct' ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('dqx5-popup');
  box.classList.add('visible');
}

function dqx5Check() {
  if (dqx5Done) { goTo(6); return; }
  const allFilled = DQX5_TARGET_IDS.every(function (tId) {
    return DQX5_DRAG_IDS.some(function (dId) { return dqx5Placement[dId] === tId; });
  });
  if (!allFilled) return;
  dqx5Checked = true;
  dqx5Attempts++;

  let allCorrect = true;
  let dqx5CorrectCount = 0;
  DQX5_TARGET_IDS.forEach(function (tId) {
    const validId = DQX5_CORRECT_MAP[tId];
    let placedId = null;
    DQX5_DRAG_IDS.forEach(function (dId) { if (dqx5Placement[dId] === tId) placedId = dId; });
    const ok = placedId === validId;
    if (!ok) allCorrect = false; else dqx5CorrectCount++;
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add(ok ? 'correct' : 'incorrect'); }
  });
  const dqx5Partial = dqx5CorrectCount > 0 && !allCorrect;
  dqx5Render();

  /* xAPI: after the slot loop (allCorrect final). Pair = word → stem of the slot it sits in ('' if in the bank). */
  xapiAnswered('002', 'q2', allCorrect, allCorrect || dqx5Attempts >= 2,
    { pairs: DQX5_DRAG_IDS.map(function (dId) {
      return { source: DQX5_LABELS[dId], target: DQX5_SLOT_LABELS[dqx5Placement[dId]] || '' };
    }) });

  const btn = document.getElementById('dqx5-check');
  if (allCorrect) {
    dqx5Done = true;
    dqx5LastWrong = null;
    dqx5ShowFeedback(DQX5_FB.correct.title, DQX5_FB.correct.body, 'correct');
    stationProgress[2] = 'success';
    updateQuestionNav('s5');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    try { flushResumeSave(); } catch (e) {}
  } else if (dqx5Attempts < 2) {
    dqx5LastWrong = dqx5Sig();
    dqx5ShowFeedback(dqx5Partial ? DQX5_FB.wrong1Partial.title : DQX5_FB.wrong1.title, DQX5_FB.wrong1.body, 'wrong');
    dqx5Checked = false;
    dqx5Render();
    if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
    try { flushResumeSave(); } catch (e) {}
  } else {
    dqx5Done = true;
    dqx5LastWrong = null;
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה הנכונה
       (בלי מצב-ביניים), עם משוב מלא וכפתור טוגל "מעבר לתשובה שלי" ⇄
       "מעבר לתשובה הנכונה". ה-snapshot נלקח לפני שהחשיפה דורסת את ההנחה. */
    dqx5AnswerSnapshot = Object.assign({}, dqx5Placement);
    dqx5ApplyCorrect();
    dqx5ShowingCorrect = true;
    dqx5ShowFeedback((dqx5Partial ? DQX5_FB.wrongFinalPartial : DQX5_FB.wrongFinal).title, DQX5_FB.wrongFinal.body, 'wrong');
    stationProgress[2] = 'fail';
    updateQuestionNav('s5');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    const revealBtn = document.getElementById('dqx5-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
    try { flushResumeSave(); } catch (e) {}
  }
}

function dqx5ApplyCorrect() {
  DQX5_TARGET_IDS.forEach(function (tId) { dqx5Placement[DQX5_CORRECT_MAP[tId]] = tId; });
  const usedIds = DQX5_TARGET_IDS.map(function (tId) { return DQX5_CORRECT_MAP[tId]; });
  DQX5_DRAG_IDS.forEach(function (id) { if (usedIds.indexOf(id) === -1) dqx5Placement[id] = 'source'; });
  dqx5Render();
  DQX5_TARGET_IDS.forEach(function (tId) {
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add('correct'); }
  });
}

function dqx5ToggleReveal() {
  if (!dqx5Done || !dqx5AnswerSnapshot) return;
  const revealBtn = document.getElementById('dqx5-reveal-btn');
  if (dqx5ShowingCorrect) {
    DQX5_DRAG_IDS.forEach(function (id) { dqx5Placement[id] = dqx5AnswerSnapshot[id]; });
    dqx5Render();
    DQX5_TARGET_IDS.forEach(function (tId) {
      const validId = DQX5_CORRECT_MAP[tId];
      let placedId = null;
      DQX5_DRAG_IDS.forEach(function (dId) { if (dqx5Placement[dId] === tId) placedId = dId; });
      const ok = placedId === validId;
      const zone = document.getElementById(tId);
      if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add(ok ? 'correct' : 'incorrect'); }
    });
    dqx5ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    dqx5ApplyCorrect();
    dqx5ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function resetScreenState5() {
  updateQuestionNav('s5');
  if (dqx5Done) {
    const btn = document.getElementById('dqx5-check');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    dqx5Render();
    const revealBtn = document.getElementById('dqx5-reveal-btn');
    if (revealBtn) {
      if (dqx5AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = dqx5ShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return;
  }
  const hasProgress = dqx5Attempts > 0 || Object.keys(dqx5Placement).some(function (id) { return dqx5Placement[id] !== 'source'; });
  if (hasProgress) { dqx5Render(); return; } /* התקדמות קיימת — لا מאפסים */
  dqx5Checked = false;
  dqx5Attempts = 0;
  dqx5AnswerSnapshot = null;
  dqx5ShowingCorrect = false;
  dqx5LastWrong = null;
  DQX5_DRAG_IDS.forEach(function (id) { dqx5Placement[id] = 'source'; });
  DQX5_TARGET_IDS.forEach(function (tId) {
    const zone = document.getElementById(tId);
    if (zone) zone.classList.remove('correct', 'incorrect', 'filled', 'drag-hover', 'drag-over');
  });
  document.getElementById('dqx5-popup').classList.remove('visible');
  const btn = document.getElementById('dqx5-check');
  if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
  const revealBtn = document.getElementById('dqx5-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  dqx5Render();
  /* מחווה מונפשת (Gesture Hints, SELF-QA.md §7) — גרירה, מעל הפריט
     הראשון במאגר, פעם אחת במסך הזה. */
  gestureHintShow('s5-drag', 'drag', document.getElementById(DQX5_DRAG_IDS[0]), 'below');
}

scqFbMakeDraggable('dqx5-popup');

/* =========================================================
   מסך 7 (s6) — שאלה 3 מתוך 4: SingleChoiceQuestion מלווה בטבלה.
   שכפול מכני של S2/s2* (מסך 3), עם 4 אפשרויות במקום 3 וכפתור רמז
   (ראו הערה ב-index.html למה נוסף רמז בשונה מהמקור המשוכפל).
   ========================================================= */
/* תוקן (בקשה מפורשת: "בולד ושבירת שורות בדיוק כמו בתסריט שקף 63") —
   נבדק run-level ישירות מול ה-pptx (לא ניחוש): "עמידות גבוהה במים"
   ו"שבירות נמוכה" בבולד בתוך המשפט (לא כל המשפט), עם שורה ריקה לפני
   הפסקה השנייה. הבדל דק שנשמר במכוון: הגרסה הנכונה (shape 12
   ב-pptx) מסתיימת בנקודה, הגרסה הסופית-שגויה (shape 14) לא — כך
   בדיוק במקור, לא תוקן כטעות-הקלדה. */
const S6 = {
  correctId: 'b',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'البلاستيك الصلب هو الأنسب وفقًا للمعطيات، لأنه يجمع بين <b>مقاومة عالية للماء</b> و <b>قابلية كسر منخفضة</b>.\n\nهذا مثال على اتخاذ قرار هندسي قائم على المعطيات، وليس اختيارًا بحسب المظهر أو الإحساس.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: 'الإجابة غير صحيحة. الإجابة الصحيحة معروضة.',
      body: 'البلاستيك الصلب هو الأنسب وفقًا للمعطيات، لأنه يجمع بين <b>مقاومة عالية للماء</b> و <b>قابلية كسر منخفضة</b>.\n\nهذا مثال على اتخاذ قرار هندسي قائم على المعطيات، وليس اختيارًا بحسب المظهر أو الإحساس.'
    }
  }
};

let s6Selected = null;
let s6Attempts = 0;
let s6Done = false;
let s6Phase = 'before';
let s6LastWrong = null; // Retry gate (guide §8.8 rule 9): the option id submitted on a non-final wrong attempt

function s6OptEl(id) {
  return document.querySelector('#s6 .scq-opt[data-id="' + id + '"]');
}

function s6Select(id) {
  if (s6Done) return;
  const wasWrong1 = (s6Phase === 'wrong1');
  document.querySelectorAll('#s6 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s6OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s6Selected = id;
  s6Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s6-popup').classList.remove('visible');
  }
  const checkBtn = document.getElementById('s6-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = (s6Selected === s6LastWrong); // Retry gate (rule 9)
  checkBtn.onclick = s6Check;
}

function s6ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s6-popup');
  const data = S6.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s6-popup');
  box.classList.add('visible');
}

function s6SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s6-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('s6-hint').hidden = true;
}

function s6LockOptions() {
  document.querySelectorAll('#s6 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s6UnlockOptions() {
  document.querySelectorAll('#s6 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s6Select(el.dataset.id); };
  });
}

function s6Continue() {
  goTo(7);
}

function s6Check() {
  if (!s6Selected || s6Done) return;
  s6Attempts++;
  const optEl = s6OptEl(s6Selected);
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('003', 'q1', s6Selected === S6.correctId,
    s6Selected === S6.correctId || s6Attempts >= S6.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s6Selected === S6.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s6Phase = 'correct';
    s6Done = true;
    s6LockOptions();
    s6ShowFeedback('correct', true);
    s6SetBarDone('متابعة', s6Continue);
    stationProgress[3] = 'success';
    updateQuestionNav('s6');
    s6LastWrong = null;
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s6Attempts < S6.maxAttempts) {
    s6Phase = 'wrong1';
    s6LastWrong = s6Selected;
    s6ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s6-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s6Check;
    document.getElementById('s6-hint').hidden = false;
    try { flushResumeSave(); } catch (e) {}
  } else {
    s6OptEl(S6.correctId).classList.add('correct');
    s6Phase = 'wrong-final';
    s6Done = true;
    s6LastWrong = null;
    s6LockOptions();
    s6ShowFeedback('wrong2', false);
    s6SetBarDone('متابعة', s6Continue);
    stationProgress[3] = 'fail';
    updateQuestionNav('s6');
    try { flushResumeSave(); } catch (e) {}
  }
}

function s6OpenHint() {
  if (s6Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('003', 'q1');
  document.getElementById('s6-hint-overlay').hidden = false;
}

function s6CloseHint() {
  document.getElementById('s6-hint-overlay').hidden = true;
}

function resetScreenState6() {
  updateQuestionNav('s6');
  if (s6Done || s6Attempts > 0 || s6Selected) return; // resume-state guard
  s6Selected = null;
  s6Attempts = 0;
  s6Phase = 'before';
  s6LastWrong = null;
  s6UnlockOptions();
  document.querySelectorAll('#s6 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s6-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s6-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s6Check;
  const hintBtn = document.getElementById('s6-hint');
  hintBtn.hidden = true;
  document.getElementById('s6-hint-overlay').hidden = true;
}

scqFbMakeDraggable('s6-popup');

/* Escape סוגר הצצת-تلميح פתוחה של מסך 7 — מוסכמת הפרויקט */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  const s6Overlay = document.getElementById('s6-hint-overlay');
  if (s6Overlay && !s6Overlay.hidden) s6CloseHint();
});

/* =========================================================
   מסך 8 (s7) — שאלה 4 מתוך 4: OrderedDragAndDropQuestion (שאלת
   התאמה). state machine זהה למשפחת dqx (placement עוקב
   draggable→'source'|targetId), 3 תוויות בדיוק ל-3 יעדים (בלי
   מסיחים), מעורבבות פעם אחת בטעינה (Fisher-Yates). ראו הערה מלאה
   ב-index.html/styles.css על מבנה התוכן ומדיניות המשוב.
   ========================================================= */
const ODDQ_LABELS = {
  'oddq-drag-a': "عيّنة أ",
  'oddq-drag-b': "عيّنة ب",
  'oddq-drag-c': "عيّنة ج"
};
/* תוקן (בקשה מפורשת: "לשנות את סדר המסיחים 1 ו-2") — תוויות היעד
   בשורות 1/2 הוחלפו (target-1 עכשיו "מתכת מגנטית", target-2 עכשיו
   "חלון שקוף"; target-3 "חומר מסיס במים" לא נגע) — המיפוי-לתשובה-
   נכונה עודכן בהתאם כדי שהבדיקה תישאר נכונה: target-1↔דגימה ב'
   (מגנטית/מוליכה), target-2↔דגימה א' (שקופה), target-3↔דגימה ג'
   (מסיסה במים) ללא שינוי. */
const ODDQ_CORRECT_MAP = {
  'oddq-target-1': 'oddq-drag-b',
  'oddq-target-2': 'oddq-drag-a',
  'oddq-target-3': 'oddq-drag-c'
};
const ODDQ_DRAG_IDS = Object.keys(ODDQ_LABELS);
const ODDQ_TARGET_IDS = Object.keys(ODDQ_CORRECT_MAP);
/* xAPI result.response: target id → its visible .oddq-target-label (= metadata 004/q1 answers.target);
   ODDQ_LABELS are the answers.source sample names (ASCII apostrophe, as in the metadata). */
const ODDQ_TARGET_LABELS = {
  'oddq-target-1': 'معدن مغناطيسي',
  'oddq-target-2': 'نافذة شفافة',
  'oddq-target-3': 'مادة قابلة للذوبان في الماء'
};

let oddqPlacement = {};
ODDQ_DRAG_IDS.forEach(function (id) { oddqPlacement[id] = 'source'; });
let oddqChecked = false;
let oddqAttempts = 0;
let oddqDone = false;
let oddqAnswerSnapshot = null;
let oddqShowingCorrect = false; // true = board currently shows the §9 reveal (correct answers)
let oddqLastWrong = null; // Retry gate (guide §8.8 rule 9): oddqSig() of the non-final wrong submission

/* גרירת Pointer Events (עכבר + מגע) — ../unit-js/30-pointer-dnd.js (תוקן 2026-11-03, MOE
   "גרירה לא עובדת בטאבלט"). oddqRender בונה את הכרטיסים/המילים מחדש בכל רינדור ומצמיד כל
   אחד מהם (attachSource); האזורים והמאגר מוצמדים פעם אחת כאן. oddqPlacement נשאר המודל היחיד. */
const oddqDnd = createPointerDnd({
  canDrag: function () { return !oddqChecked && !oddqDone; },
  onPick: function (dragId, src) {                      /* הלחיצה הפכה לגרירה (מעבר ל-6px) */
    gestureHintHide('s7-drag');                         /* נעלם ברגע שהלומד מתחיל לגרור */
    if (oddqAttempts > 0) document.getElementById('oddq-popup').classList.remove('visible');
    if (src.classList.contains('oddq-zone-word')) {     /* מילה מוצבת: התיבה "מתרוקנת" חזותית עד ההטלה */
      const oldZone = document.getElementById(oddqPlacement[dragId]);
      if (oldZone) { oldZone.classList.remove('correct', 'incorrect', 'filled'); oldZone.classList.add('drag-origin'); }
    }
  },
  onGhost: function (ghost, src) {                      /* רוח אחיד: גלולת oddq-card, גם כשגוררים מילה מוצבת */
    const dragId = src.dataset.pdragId;
    if (src.classList.contains('oddq-zone-word')) {
      const ref = document.getElementById(dragId) || document.getElementById(oddqPlacement[dragId]);
      ghost.className = 'oddq-card pointer-drag-ghost';
      ghost.textContent = ODDQ_LABELS[dragId];
      if (ref) { ghost.style.width = ref.offsetWidth + 'px'; ghost.style.height = ref.offsetHeight + 'px'; }
    }
  },
  onDrop: function (dragId, targetId) {
    if (targetId === 'bank') {
      oddqPlacement[dragId] = 'source';
    } else {
      const zone = document.getElementById(targetId);
      if (zone) zone.classList.remove('correct', 'incorrect');
      ODDQ_DRAG_IDS.forEach(function (dId) { if (oddqPlacement[dId] === targetId && dId !== dragId) oddqPlacement[dId] = 'source'; });
      oddqPlacement[dragId] = targetId;
    }
    oddqRender();
  },
  onCancel: function (dragId) {                         /* הטלה מחוץ ליעד: כמו dragend בלי drop — חזרה למאגר */
    oddqPlacement[dragId] = 'source';
    oddqRender();
  }
});
ODDQ_TARGET_IDS.forEach(function (tId) { oddqDnd.attachTarget(document.getElementById(tId), tId); });
oddqDnd.attachTarget(document.getElementById('oddq-pool'), 'bank');

/* The feedback texts, hoisted so the resume painter shows exactly what oddqCheck showed. */
const ODDQ_FB = {
  correct: { title: 'ممتاز!', body: 'نجحتم في تحديد العينات الثلاث بحسب خصائص مادتها.\n\nمثل العلماء أو العالمات، استخدمتم معطيات الفحوصات لاستخلاص الاستنتاجات ومطابقة كل مادة مع الاستخدام أو التعريف المناسب لها.' },
  wrong1: { title: 'الإجابة غير صحيحة.', body: 'هل نحاول مرة أخرى؟' },
  wrong1Partial: { title: 'الإجابة صحيحة جزئيًا.', body: 'هل نحاول مرة أخرى؟' },
  wrongFinal: { title: fbCorrectShown('تقريبًا نجحت.'), body: '<b>لا بأس، نتعلم أيضًا من الأخطاء.</b>\n\nتساعدنا معطيات الفحوصات على استخلاص الاستنتاجات ومطابقة كل مادة مع الاستخدام أو التعريف المناسب لها.' },
  wrongFinalPartial: { title: fbCorrectShown('الإجابة صحيحة جزئيًا.'), body: '<b>لا بأس، نتعلم أيضًا من الأخطاء.</b>\n\nتساعدنا معطيات الفحوصات على استخلاص الاستنتاجات ومطابقة كل مادة مع الاستخدام أو التعريف المناسب لها.' }
};

/* Signature of the current board, compared against oddqLastWrong (rule 9: target=label, by label). */
function oddqSig() {
  return ODDQ_TARGET_IDS.map(function (tId) {
    let placed = null;
    ODDQ_DRAG_IDS.forEach(function (dId) { if (oddqPlacement[dId] === tId) placed = dId; });
    return tId.replace(/^.*-target-/, '') + '=' + (placed ? ODDQ_LABELS[placed] : '—');
  }).join(' | ');
}

let oddqOrder = ODDQ_DRAG_IDS.slice();
(function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
})(oddqOrder);

function oddqRender() {
  oddqOrder.forEach(function (dragId) {
    const slot = document.getElementById('slot-' + dragId);
    if (!slot) return;
    /* תוקן (2026-08-05): ערבוב-מסיחים אמיתי — ראו dqx5Render לפירוט. */
    if (slot.parentElement) slot.parentElement.appendChild(slot);
    slot.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'oddq-card';
    card.id = dragId;
    if (oddqPlacement[dragId] === 'source') {
      card.textContent = ODDQ_LABELS[dragId];
      if (!oddqChecked) {
        oddqDnd.attachSource(card, dragId);   /* Pointer DnD (30-pointer-dnd.js) */
      } else {
        card.classList.add('locked');
      }
    } else {
      card.classList.add('ghost');
      card.textContent = ODDQ_LABELS[dragId];
    }
    slot.appendChild(card);
  });

  ODDQ_TARGET_IDS.forEach(function (targetId) {
    const zone = document.getElementById(targetId);
    if (!zone) return;
    let placedId = null;
    ODDQ_DRAG_IDS.forEach(function (dId) { if (oddqPlacement[dId] === targetId) placedId = dId; });
    zone.innerHTML = '';
    zone.classList.remove('filled', 'drag-origin');
    if (placedId) {
      /* תוקן (2026-08-04): guard נוסף — אותו באג בדיוק שתוקן ב-dqx19/
         dqx5/dqx4: אחרי ניסיון שגוי ראשון, oddqCheck() מאפס Checked=false
         ומפעיל Render() שוב כדי לאפשר גרירה חוזרת; בלי ה-guard, 'filled'
         היה חוזר יחד עם 'incorrect' שנשאר על התא. */
      if (!oddqChecked && !zone.classList.contains('correct') && !zone.classList.contains('incorrect')) zone.classList.add('filled');
      const iconEl = document.createElement('span');
      iconEl.className = 'oddq-zone-icon';
      const wordEl = document.createElement('span');
      wordEl.className = 'oddq-zone-word';
      wordEl.textContent = ODDQ_LABELS[placedId];
      if (!oddqChecked) {
        wordEl.style.cursor = 'grab';
        oddqDnd.attachSource(wordEl, placedId);   /* מילה מוצבת נגררת חזרה / לתיבה אחרת */
      }
      zone.appendChild(iconEl);
      zone.appendChild(wordEl);
    }
  });

  const allFilled = ODDQ_TARGET_IDS.every(function (tId) {
    return ODDQ_DRAG_IDS.some(function (dId) { return oddqPlacement[dId] === tId; });
  });
  const btn = document.getElementById('oddq-check');
  if (btn && !oddqDone) btn.disabled = !allFilled || oddqSig() === oddqLastWrong; // Retry gate (rule 9)
}


function oddqShowFeedback(title, body, kind) {
  const box = document.getElementById('oddq-popup');
  box.querySelector('.scq-fb-title-text').textContent = title;
  box.querySelector('.scq-fb-body').innerHTML = body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(kind === 'correct' ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('oddq-popup');
  box.classList.add('visible');
}

function oddqCheck() {
  if (oddqDone) { goTo(8); return; }
  const allFilled = ODDQ_TARGET_IDS.every(function (tId) {
    return ODDQ_DRAG_IDS.some(function (dId) { return oddqPlacement[dId] === tId; });
  });
  if (!allFilled) return;
  oddqChecked = true;
  oddqAttempts++;

  let allCorrect = true;
  let oddqCorrectCount = 0;
  ODDQ_TARGET_IDS.forEach(function (tId) {
    const validId = ODDQ_CORRECT_MAP[tId];
    let placedId = null;
    ODDQ_DRAG_IDS.forEach(function (dId) { if (oddqPlacement[dId] === tId) placedId = dId; });
    const ok = placedId === validId;
    if (!ok) allCorrect = false; else oddqCorrectCount++;
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add(ok ? 'correct' : 'incorrect'); }
  });
  const oddqPartial = oddqCorrectCount > 0 && !allCorrect;
  oddqRender();

  /* xAPI: after the target loop (allCorrect final). Pair = sample → label of the target it sits in ('' if in the bank). */
  xapiAnswered('004', 'q1', allCorrect, allCorrect || oddqAttempts >= 2,
    { pairs: ODDQ_DRAG_IDS.map(function (dId) {
      return { source: ODDQ_LABELS[dId], target: ODDQ_TARGET_LABELS[oddqPlacement[dId]] || '' };
    }) });

  const btn = document.getElementById('oddq-check');
  const hintBtn = document.getElementById('oddq-hint');
  if (allCorrect) {
    oddqDone = true;
    oddqLastWrong = null;
    oddqShowFeedback(ODDQ_FB.correct.title, ODDQ_FB.correct.body, 'correct');
    stationProgress[4] = 'success';
    updateQuestionNav('s7');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    if (hintBtn) hintBtn.hidden = true;
    try { flushResumeSave(); } catch (e) {}
  } else if (oddqAttempts < 2) {
    oddqLastWrong = oddqSig();
    oddqShowFeedback(oddqPartial ? ODDQ_FB.wrong1Partial.title : ODDQ_FB.wrong1.title, ODDQ_FB.wrong1.body, 'wrong');
    oddqChecked = false;
    oddqRender();
    if (hintBtn) hintBtn.hidden = false;
    if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
    try { flushResumeSave(); } catch (e) {}
  } else {
    oddqDone = true;
    oddqLastWrong = null;
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה הנכונה
       (בלי מצב-ביניים), עם משוב מלא וכפתור טוגל "מעבר לתשובה שלי" ⇄
       "מעבר לתשובה הנכונה". ה-snapshot נלקח לפני שהחשיפה דורסת את ההנחה. */
    oddqAnswerSnapshot = Object.assign({}, oddqPlacement);
    oddqApplyCorrect();
    oddqShowingCorrect = true;
    oddqShowFeedback((oddqPartial ? ODDQ_FB.wrongFinalPartial : ODDQ_FB.wrongFinal).title, ODDQ_FB.wrongFinal.body, 'wrong');
    stationProgress[4] = 'fail';
    updateQuestionNav('s7');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    if (hintBtn) hintBtn.hidden = true;
    const revealBtn = document.getElementById('oddq-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
    try { flushResumeSave(); } catch (e) {}
  }
}

function oddqApplyCorrect() {
  ODDQ_TARGET_IDS.forEach(function (tId) { oddqPlacement[ODDQ_CORRECT_MAP[tId]] = tId; });
  const usedIds = ODDQ_TARGET_IDS.map(function (tId) { return ODDQ_CORRECT_MAP[tId]; });
  ODDQ_DRAG_IDS.forEach(function (id) { if (usedIds.indexOf(id) === -1) oddqPlacement[id] = 'source'; });
  oddqRender();
  ODDQ_TARGET_IDS.forEach(function (tId) {
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add('correct'); }
  });
}

function oddqToggleReveal() {
  if (!oddqDone || !oddqAnswerSnapshot) return;
  const revealBtn = document.getElementById('oddq-reveal-btn');
  if (oddqShowingCorrect) {
    ODDQ_DRAG_IDS.forEach(function (id) { oddqPlacement[id] = oddqAnswerSnapshot[id]; });
    oddqRender();
    ODDQ_TARGET_IDS.forEach(function (tId) {
      const validId = ODDQ_CORRECT_MAP[tId];
      let placedId = null;
      ODDQ_DRAG_IDS.forEach(function (dId) { if (oddqPlacement[dId] === tId) placedId = dId; });
      const ok = placedId === validId;
      const zone = document.getElementById(tId);
      if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add(ok ? 'correct' : 'incorrect'); }
    });
    oddqShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    oddqApplyCorrect();
    oddqShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function oddqOpenHint() {
  if (oddqDone) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('004', 'q1');
  document.getElementById('oddq-hint-overlay').hidden = false;
}

function oddqCloseHint() {
  document.getElementById('oddq-hint-overlay').hidden = true;
}

function resetScreenState7() {
  updateQuestionNav('s7');
  if (oddqDone) {
    const btn = document.getElementById('oddq-check');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    document.getElementById('oddq-hint').hidden = true;
    oddqRender();
    const revealBtn = document.getElementById('oddq-reveal-btn');
    if (revealBtn) {
      if (oddqAnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = oddqShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return;
  }
  const hasProgress = oddqAttempts > 0 || Object.keys(oddqPlacement).some(function (id) { return oddqPlacement[id] !== 'source'; });
  if (hasProgress) { oddqRender(); return; } /* התקדמות קיימת — لا מאפסים */
  oddqChecked = false;
  oddqAttempts = 0;
  oddqAnswerSnapshot = null;
  oddqShowingCorrect = false;
  oddqLastWrong = null;
  ODDQ_DRAG_IDS.forEach(function (id) { oddqPlacement[id] = 'source'; });
  ODDQ_TARGET_IDS.forEach(function (tId) {
    const zone = document.getElementById(tId);
    if (zone) zone.classList.remove('correct', 'incorrect', 'filled', 'drag-hover', 'drag-over');
  });
  document.getElementById('oddq-popup').classList.remove('visible');
  const hintBtn = document.getElementById('oddq-hint');
  if (hintBtn) hintBtn.hidden = true;
  document.getElementById('oddq-hint-overlay').hidden = true;
  const btn = document.getElementById('oddq-check');
  if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
  const revealBtn = document.getElementById('oddq-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  oddqRender();
  /* מחווה מונפשת (Gesture Hints, SELF-QA.md §7) — גרירה, מעל הפריט
     הראשון במאגר, פעם אחת במסך הזה. */
  gestureHintShow('s7-drag', 'drag', document.getElementById(ODDQ_DRAG_IDS[0]));
}

scqFbMakeDraggable('oddq-popup');

/* Escape סוגר הצצת-تلميح פתוחה של מסך 8 — מוסכמת הפרויקט */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  const oddqOverlay = document.getElementById('oddq-hint-overlay');
  if (oddqOverlay && !oddqOverlay.hidden) oddqCloseHint();
});

/* =========================================================
   מסך 9 (s8) — הוטספוטים (4 חומרים בנעל ריצה, שקף 65). ראו הערה
   מלאה ב-styles.css (`.hs9-*`) ו-index.html למקור/סטיות. בלי qnav,
   בלי בדיקת נכון/שגוי, בלי טיימר-השהיה (בשונה ממסך 22 בסיין 1).
   ========================================================= */
const S8_MATERIALS = {
  mesh: {
    title: 'قماش شبكي قابل للتنفس',
    body: 'قماش خفيف ومسامي يلف القدم دون أن يثقل عليها.'
  },
  foam: {
    title: 'رغوة مرنة',
    body: 'رغوة خفيفة ومرنة، مصممة لتخفيف الصدمة عند الهبوط وإعادة الطاقة أثناء الجري.'
  },
  aircushion: {
    title: 'وسائد هوائية',
    body: 'وسادتا هواء للتوسيد وامتصاص الصدمات.'
  },
  carbon: {
    title: 'لوحة كربون',
    body: 'لوحة من ألياف الكربون - مادة خفيفة وقوية وصلبة تساعد على توفير إحساس ثابت ودفع للأمام.'
  }
};

function s8OpenHotspot(key) {
  gestureHintHide('s8-click'); /* נעלם ברגע שהלומד לוחץ על נקודה חמה */
  const data = S8_MATERIALS[key];
  document.getElementById('s8-hint-title-text').textContent = data.title;
  document.getElementById('s8-hint-body-text').innerHTML = data.body.replace(/\n/g, '<br>');
  document.getElementById('s8-hint-overlay').hidden = false;
}

function s8CloseHotspot() {
  document.getElementById('s8-hint-overlay').hidden = true;
}

/* אין state מתמשך למסך זה (בלי טיימר-השהיה, בלי ניסיון/תשובה) — כל
   כניסה למסך היא "fresh-init" לצורך המחווה המונפשת; gestureHintShow
   עצמו דואג שהיא לא תוצג פעם שנייה (Set לפי key). */
function resetScreenState8() {
  /* מחווה מונפשת (Gesture Hints, SELF-QA.md §7) — קליק, מעל הנקודה
     החמה הראשונה, פעם אחת במסך הזה. */
  gestureHintShow('s8-click', 'click', document.querySelector('.hs9-hotspot'));
}

/* Escape סוגר את פופ-אפ המידע של מסך 9 — מוסכמת הפרויקט */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  const s8Overlay = document.getElementById('s8-hint-overlay');
  if (s8Overlay && !s8Overlay.hidden) s8CloseHotspot();
});

/* אתחול */
scaleApp();
resetScreenState(0);
/* ניווט חוצה-סינים (בקשה מפורשת): הגעה דרך "חזרה" מסיין 5 (`?start=last`)
   נכנסת ישירות למסך האחרון כאן, לא למסך הראשון. */
/* Dev walkthrough only (guide §8.12): the platform launches each component on its own. */
if (typeof DEV_NAV !== 'undefined' && DEV_NAV &&
    new URLSearchParams(window.location.search).get('start') === 'last') {
  goTo(TOTAL_SCREENS - 1);
}


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד, נקראים בזמן call על ידי ../unit-js/ (guide §6.1). SCREEN_TO_SUBCONTENT מחזיק
   בדיוק TOTAL_SCREENS מפתחות (9) — מפתח חסר = מסך שלא מדווח, בשקט; _test/verify-report.js
   אוכף זאת. Value[0] = סיומת הפריט (מחרוזת 3 ספרות), value[1] = עמוד-בפריט (תיעוד בלבד),
   null = מסך בלי פריט בקטלוג. מסכי מעבר/נרטיב ממופים לפריט שהם שייכים לו (D-2: כל פריט בקטלוג
   מקבל מסך; שני המסלולים של סין 01 — קריאה s4 / סרטון s10 — שייכים לפריט 002). מקור:
   docs-and-tools/METADATA-AUDIT.md §2. */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],
  1: ['001', 2],
  2: ['001', 3],
  3: ['002', 1],
  4: ['002', 2],
  5: ['002', 3],
  6: ['003', 1],
  7: ['004', 1],
  8: ['005', 1]
};

var XAPI_COMP_SLUG = 'methodica-ar-science-body-matter-01-05';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1, '004': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-ar-science-body-matter-01-05.json';
var XAPI_END_BTN = 's8-finish';                               /* the part's last button (D-8, restoreEndedButton) */

/* תוצאת הרכיב ל-completed (§6.4 — המכנה הוא מה שהלומד הובטח). */
function xapiPartResult() {
  /* ברירת מחדל: כל השאלות המדורגות של הסין (XAPI_Q_RESULTS), success מ-60% (MOE v2.7 דוגמה);
     סין בלי שאלות מדורגות מדווח success:true בלי score (§6.4 — אין להמציא מספר). */
  var keys = Object.keys(XAPI_Q_RESULTS);
  if (!keys.length) return { success: true };
  var ok = keys.filter(function (k) { return XAPI_Q_RESULTS[k]; }).length;
  var scaled = ok / keys.length;
  return { success: scaled >= 0.6, score: { scaled: scaled } };
}

/* הלחיצה האחרונה של הסין: מדווח completed ועוצר. Kata מסירה את הרכיב ומנתבת (§6.5, §8.12).
   אין window.close, אין alert, אין ניווט — ההמשך לסין הבא חי רק תחת DEV_NAV (סיור מקומי). */
function partFinish(btn) {
  try { xapiEndComponent(xapiPartResult(), btn || document.getElementById(XAPI_END_BTN)); } catch (e) { console.error('[xAPI] partFinish', e); }
  try { flushResumeSave(); } catch (e) {}
  if (DEV_NAV) window.location.href = '../methodica-ar-science-body-matter-01-06/index.html' + window.location.search;
}


/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-10-19): currentScreen, XAPI_Q_RESULTS ומפת ההתקדמות.
   שלב ב' (2026-10-19): משתני התשובה של כל מסך (payload.screens.<prefix>) + ציירים לפי סוג
   אינטראקציה (§8.8 — כללים 1–12): paintScq (s2, s4, s6), paintDragSlots (dqx5, oddq — מודל
   placement + סדר הערבוב, שנשמר ולעולם לא מוגרל מחדש). הציירים מציירים רק את כתיבות ה-DOM
   של ענפי ה-check, לא משנים מצב, אידמפוטנטיים, ולעולם לא זורקים (try/catch לכל צייר).
   שער ה-Retry (כלל 9) נשמר כ-`lw`; סימוני ניסיון-שגוי מצוירים רק כל עוד התשובה הנוכחית שווה
   להגשה (כלל 10). אין בסין הזה שערי התקדמות: מסכי היישומון (s1, s3) ומסך הנקודות החמות (s8)
   משחררים "המשך" מיד, ולכן אין להם מצב לשמור ואין להם ענף ב-restoreScreenUI (כלל 11). */

/* ── helpers ── */
function resumeSetReveal(prefix, show, showingCorrect) {
  const revealBtn = document.getElementById(prefix + '-reveal-btn');
  if (!revealBtn) return;
  revealBtn.hidden = !show;
  /* hidden → the live default label (what resetScreenState leaves), shown → the toggle's label */
  revealBtn.textContent = (show && !showingCorrect) ? 'الانتقال إلى الإجابة الصحيحة' : 'الانتقال إلى إجابتي';
}

/* ── painter: single choice (s2, s4, s6) — mirrors sNSelect / sNCheck ── */
function paintScq(cfg) {
  try {
    const sel = cfg.selected(), done = cfg.done(), attempts = cfg.attempts(), phase = cfg.phase();
    const lw = cfg.lastWrong();
    const checkBtn = document.getElementById(cfg.prefix + '-check');
    const popup = document.getElementById(cfg.prefix + '-popup');
    const opts = document.querySelectorAll('#' + cfg.prefix + ' ' + cfg.optSel);
    if (!done && !attempts && !sel) return;   // clean (rule 4)
    const selEl = sel ? cfg.optEl(sel) : null;
    opts.forEach(function (el) { el.classList.remove('selected', 'wrong', 'correct'); el.setAttribute('aria-checked', 'false'); });
    if (!done) {
      cfg.unlock();
      const same = !!(attempts > 0 && lw && sel === lw);   // rule 10
      if (selEl) { selEl.classList.add(same ? 'wrong' : 'selected'); selEl.setAttribute('aria-checked', 'true'); }
      if (same) cfg.showFeedback('wrong1', false); else popup.classList.remove('visible');
      checkBtn.textContent = 'هل إجابتي صحيحة؟';
      checkBtn.disabled = !sel || sel === lw;   // live predicate + Retry gate
      checkBtn.onclick = cfg.check;
      if (cfg.hintAfterWrong) { const h = document.getElementById(cfg.prefix + '-hint'); if (h) h.hidden = !(attempts > 0); }
      return;
    }
    cfg.lock();
    if (selEl) { selEl.classList.add(sel === cfg.S.correctId ? 'correct' : 'wrong'); selEl.setAttribute('aria-checked', 'true'); }
    if (phase !== 'correct') {
      const okEl = cfg.optEl(cfg.S.correctId);
      if (okEl) okEl.classList.add('correct');
      cfg.showFeedback('wrong2', false);
    } else cfg.showFeedback('correct', true);
    cfg.setBarDone('متابعة', cfg.cont);
  } catch (e) { console.error('[resume] paint ' + cfg.prefix, e); }
}

/* ── painter: drag-word-to-slot (dqx5, oddq) — mirrors Render / Check / ToggleReveal ── */
function paintDragSlots(cfg) {
  try {
    const pl = cfg.placement(), done = cfg.done(), attempts = cfg.attempts(), lw = cfg.lastWrong();
    const anyPlaced = cfg.dragIds.some(function (id) { return pl[id] && pl[id] !== 'source'; });
    if (!done && !attempts && !anyPlaced) return;   // clean: nothing placed (rules 4/5)
    const btn = document.getElementById(cfg.prefix + '-check');
    const popup = document.getElementById(cfg.prefix + '-popup');
    const hintBtn = cfg.hintAfterWrong ? document.getElementById(cfg.prefix + '-hint') : null;
    const placedIn = function (tId) { let p = null; cfg.dragIds.forEach(function (d) { if (pl[d] === tId) p = d; }); return p; };
    const zoneOf = function (tId) { return document.getElementById(tId); };
    const clearMarks = function () { cfg.targetIds.forEach(function (t) { const z = zoneOf(t); if (z) z.classList.remove('correct', 'incorrect'); }); };
    const mark = function (tId, p) { const z = zoneOf(tId); if (!z) return; z.classList.remove('filled'); z.classList.add(p === cfg.correctMap[tId] ? 'correct' : 'incorrect'); };
    const partialOf = function (placement) {
      let okCount = 0;
      cfg.targetIds.forEach(function (t) { let p = null; cfg.dragIds.forEach(function (d) { if (placement[d] === t) p = d; }); if (p === cfg.correctMap[t]) okCount++; });
      return okCount > 0 && okCount < cfg.targetIds.length;
    };
    if (!done) {
      clearMarks();
      cfg.render();   // bank + slots from the model; re-derives the button incl. the Retry gate (rule 2/9)
      const submitted = {};
      if (lw) lw.split(' | ').forEach(function (s) { const i = s.indexOf('='); if (i > 0) submitted[s.slice(0, i)] = s.slice(i + 1); });
      cfg.targetIds.forEach(function (t) {   // rule 10: a slot keeps its mark only while it still holds the submitted word
        const p = placedIn(t);
        if (attempts > 0 && lw && p && submitted[t.replace(/^.*-target-/, '')] === cfg.labels[p]) mark(t, p);
      });
      const same = attempts > 0 && !!lw && cfg.sig() === lw;
      if (same) cfg.showFeedback(partialOf(pl) ? cfg.FB.wrong1Partial.title : cfg.FB.wrong1.title, cfg.FB.wrong1.body, 'wrong');
      else popup.classList.remove('visible');
      if (btn) btn.textContent = 'هل إجابتي صحيحة؟';
      if (hintBtn) hintBtn.hidden = !(attempts > 0);
      resumeSetReveal(cfg.prefix, false, false);
      return;
    }
    clearMarks();
    cfg.render();   // Checked is true on a finished board: the cards come back locked
    cfg.targetIds.forEach(function (t) { mark(t, placedIn(t)); });   // the displayed board: the solution, or the snapshot
    const snap = cfg.snapshot(), showing = cfg.showingCorrect();
    if (!snap) cfg.showFeedback(cfg.FB.correct.title, cfg.FB.correct.body, 'correct');
    else cfg.showFeedback(partialOf(snap) ? cfg.FB.wrongFinalPartial.title : cfg.FB.wrongFinal.title, cfg.FB.wrongFinal.body, 'wrong');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    if (hintBtn) hintBtn.hidden = true;
    resumeSetReveal(cfg.prefix, !!snap, showing);
  } catch (e) { console.error('[resume] paint ' + cfg.prefix, e); }
}

/* ── per-screen configs (rule 7: the painter takes its config as a parameter) ── */
function resumeCfgS2() {
  return { prefix: 's2', S: S2, optSel: '.scq-opt', optEl: s2OptEl, selected: function () { return s2Selected; }, attempts: function () { return s2Attempts; },
    done: function () { return s2Done; }, phase: function () { return s2Phase; }, lastWrong: function () { return s2LastWrong; },
    lock: s2LockOptions, unlock: s2UnlockOptions, showFeedback: s2ShowFeedback, setBarDone: s2SetBarDone, check: s2Check, cont: s2Continue, hintAfterWrong: false };
}
function resumeCfgS4() {
  return { prefix: 's4', S: S4, optSel: '.scq-opt', optEl: s4OptEl, selected: function () { return s4Selected; }, attempts: function () { return s4Attempts; },
    done: function () { return s4Done; }, phase: function () { return s4Phase; }, lastWrong: function () { return s4LastWrong; },
    lock: s4LockOptions, unlock: s4UnlockOptions, showFeedback: s4ShowFeedback, setBarDone: s4SetBarDone, check: s4Check, cont: s4Continue, hintAfterWrong: false };
}
function resumeCfgS6() {
  return { prefix: 's6', S: S6, optSel: '.scq-opt', optEl: s6OptEl, selected: function () { return s6Selected; }, attempts: function () { return s6Attempts; },
    done: function () { return s6Done; }, phase: function () { return s6Phase; }, lastWrong: function () { return s6LastWrong; },
    lock: s6LockOptions, unlock: s6UnlockOptions, showFeedback: s6ShowFeedback, setBarDone: s6SetBarDone, check: s6Check, cont: s6Continue, hintAfterWrong: true };
}
function resumeCfgDqx5() {
  return { prefix: 'dqx5', dragIds: DQX5_DRAG_IDS, targetIds: DQX5_TARGET_IDS, labels: DQX5_LABELS, correctMap: DQX5_CORRECT_MAP, FB: DQX5_FB,
    placement: function () { return dqx5Placement; }, attempts: function () { return dqx5Attempts; }, done: function () { return dqx5Done; },
    lastWrong: function () { return dqx5LastWrong; }, snapshot: function () { return dqx5AnswerSnapshot; }, showingCorrect: function () { return dqx5ShowingCorrect; },
    sig: dqx5Sig, render: dqx5Render, showFeedback: dqx5ShowFeedback, hintAfterWrong: false };
}
function resumeCfgOddq() {
  return { prefix: 'oddq', dragIds: ODDQ_DRAG_IDS, targetIds: ODDQ_TARGET_IDS, labels: ODDQ_LABELS, correctMap: ODDQ_CORRECT_MAP, FB: ODDQ_FB,
    placement: function () { return oddqPlacement; }, attempts: function () { return oddqAttempts; }, done: function () { return oddqDone; },
    lastWrong: function () { return oddqLastWrong; }, snapshot: function () { return oddqAnswerSnapshot; }, showingCorrect: function () { return oddqShowingCorrect; },
    sig: oddqSig, render: oddqRender, showFeedback: oddqShowFeedback, hintAfterWrong: true };
}

/* ── the four hooks ── */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    stationProgress: Object.assign({}, stationProgress),
    screens: {
      s2:   { sel: s2Selected, att: s2Attempts, done: s2Done, phase: s2Phase, lw: s2LastWrong },
      s4:   { sel: s4Selected, att: s4Attempts, done: s4Done, phase: s4Phase, lw: s4LastWrong },
      dqx5: { pl: Object.assign({}, dqx5Placement), order: dqx5Order.slice(), chk: dqx5Checked, att: dqx5Attempts, done: dqx5Done,
              snap: dqx5AnswerSnapshot ? Object.assign({}, dqx5AnswerSnapshot) : null, sc: dqx5ShowingCorrect, lw: dqx5LastWrong },
      s6:   { sel: s6Selected, att: s6Attempts, done: s6Done, phase: s6Phase, lw: s6LastWrong },
      oddq: { pl: Object.assign({}, oddqPlacement), order: oddqOrder.slice(), chk: oddqChecked, att: oddqAttempts, done: oddqDone,
              snap: oddqAnswerSnapshot ? Object.assign({}, oddqAnswerSnapshot) : null, sc: oddqShowingCorrect, lw: oddqLastWrong }
    }
  };
}

/* A saved placement map is adopted only when every value is 'source' or a known slot. */
function resumePlacementFrom(saved, dragIds, targetIds) {
  const out = {};
  dragIds.forEach(function (id) {
    const v = saved && saved[id];
    out[id] = (v && targetIds.indexOf(v) >= 0) ? v : 'source';
  });
  return out;
}
function resumeOrderFrom(saved, dragIds) {
  if (!Array.isArray(saved) || saved.length !== dragIds.length) return null;
  if (!dragIds.every(function (id) { return saved.indexOf(id) >= 0; })) return null;
  return saved.slice();
}

function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults) Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  if (st.stationProgress) Object.keys(st.stationProgress).forEach(function (k) { stationProgress[k] = st.stationProgress[k]; });
  const sc = st.screens;
  if (!sc || typeof sc !== 'object') return;   // stage-A document: nothing more to restore
  let q, o;
  if ((q = sc.s2)) { s2Selected = q.sel || null; s2Attempts = q.att || 0; s2Done = !!q.done; s2Phase = q.phase || 'before'; s2LastWrong = q.lw || null; }
  if ((q = sc.s4)) { s4Selected = q.sel || null; s4Attempts = q.att || 0; s4Done = !!q.done; s4Phase = q.phase || 'before'; s4LastWrong = q.lw || null; }
  if ((q = sc.s6)) { s6Selected = q.sel || null; s6Attempts = q.att || 0; s6Done = !!q.done; s6Phase = q.phase || 'before'; s6LastWrong = q.lw || null; }
  if ((q = sc.dqx5)) {
    dqx5Placement = resumePlacementFrom(q.pl, DQX5_DRAG_IDS, DQX5_TARGET_IDS);
    if ((o = resumeOrderFrom(q.order, DQX5_DRAG_IDS))) dqx5Order = o;   // never re-shuffle a restored board (§8.9)
    dqx5Checked = !!q.chk; dqx5Attempts = q.att || 0; dqx5Done = !!q.done;
    dqx5AnswerSnapshot = q.snap ? resumePlacementFrom(q.snap, DQX5_DRAG_IDS, DQX5_TARGET_IDS) : null;
    dqx5ShowingCorrect = !!q.sc; dqx5LastWrong = q.lw || null;
  }
  if ((q = sc.oddq)) {
    oddqPlacement = resumePlacementFrom(q.pl, ODDQ_DRAG_IDS, ODDQ_TARGET_IDS);
    if ((o = resumeOrderFrom(q.order, ODDQ_DRAG_IDS))) oddqOrder = o;
    oddqChecked = !!q.chk; oddqAttempts = q.att || 0; oddqDone = !!q.done;
    oddqAnswerSnapshot = q.snap ? resumePlacementFrom(q.snap, ODDQ_DRAG_IDS, ODDQ_TARGET_IDS) : null;
    oddqShowingCorrect = !!q.sc; oddqLastWrong = q.lw || null;
  }
}

/* Nothing in this part lives only in the DOM: the two drag boards are rendered from their placement
   model (dqx5Render / oddqRender, called by resetScreenState and by the painter), the single-choice
   screens from their variables. Kept as the stage-B hook so the shared layer's call order holds. */
function applyResumeDom(st) {
  if (!st || !st.screens) return;
}

/* One branch per interactive screen (rule 11). 0 (avatar), 1/3 (applet, free continue) and 8
   (hotspots, free finish) carry no state. */
function restoreScreenUI(n) {
  try {
    if (n === 2) paintScq(resumeCfgS2());
    else if (n === 4) paintScq(resumeCfgS4());
    else if (n === 5) paintDragSlots(resumeCfgDqx5());
    else if (n === 6) paintScq(resumeCfgS6());
    else if (n === 7) paintDragSlots(resumeCfgOddq());
  } catch (e) { console.error('[resume] restoreScreenUI ' + n, e); }
}
