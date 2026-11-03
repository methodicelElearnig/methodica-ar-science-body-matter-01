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
    1: { done: s1Done, popup: 's1-popup' },
    2: { done: s2Done, popup: 's2-popup' },
    3: { done: s3Done, popup: 's3-popup' },
    4: { done: s4Done, popup: 's4-popup' },
    5: { done: s5Done, popup: 's5-popup' },
    7: { done: s7Done, popup: 's7-popup' },
    8: { done: s8bDone, popup: 's8b-popup' }
  };
  const entry = map[n];
  if (!entry || !entry.done) return;
  scqFbResetPosition(entry.popup);
  document.getElementById(entry.popup).classList.add('visible');
}

function resetScreenState(n) {
  if (n === 0) resetScreenState0();
  if (n === 1) resetScreenState1();
  if (n === 2) resetScreenState2();
  if (n === 3) resetScreenState3();
  if (n === 4) resetScreenState4();
  if (n === 5) resetScreenState5();
  if (n === 6) resetScreenState6();
  if (n === 7) resetScreenState7();
  if (n === 8) resetScreenState8();
  /* כל מסך محتوى נוסף יקבל כאן ענף resetScreenStateN() משלו */
}

/* מסך 1 — דמות בווידאו אמיתי "מרימה משקולות קלות" (green-avatar-
   lifting-light-weights.mp4/turquoise-avatar-lifting-light-eights.mp4,
   סופקו בפועל), אותו חוזה resolveCharBubbleVideo כמו בשאר הפרויקט. */
const S0_AVATAR_ASSETS = {
  'character-1': '../unit-assets/video/green-avatar-lifting-light-weights.mp4',
  'character-2': '../unit-assets/video/turquoise-avatar-lifting-light-eights.mp4'
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
   9/s8, לא גלובלי) ממקם את כל מלבן-היד מתחת לקצה התחתון של הפיל
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
   סרגל התקדמות (qnav), 5 שאלות (מסכים 2-6, s1-s5). הועתק ממנגנון
   stationProgress2/updateQuestionNav2 של סיין 1 (סמנטית זהה) — כאן
   בלי סיומת "2" כי אין מנגנון-ישן מתחרה בסיין הזה (כל מסך = שקע
   אחד, בלי שקעים משותפים כמו מסכים 23-24 בסיין 1).
   ========================================================= */
const SLOT_OF = { s1: 1, s2: 2, s3: 3, s4: 4, s5: 5 };
let stationProgress = { 1: null, 2: null, 3: null, 4: null, 5: null };

function updateQuestionNav(prefix) {
  const currentSlot = SLOT_OF[prefix];
  for (let i = 1; i <= 5; i++) {
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
  for (let i = 1; i <= 4; i++) {
    const line = document.getElementById(prefix + '-qnav-line-' + i);
    if (!line) continue;
    line.className = 'qnav-line';
    if (stationProgress[i] !== null) line.classList.add('line-done');
  }
}

/* =========================================================
   מסך 2 (s1) — שאלה 1 מתוך 5: MultipleChoiceQuestion מלווה בתמונה.
   **תוקן (2026-08-06)**: state machine הוחלף מ-בחירה-בלעדית ל-Set-based
   toggle, זהה 1:1 לתבנית שכבר קיימת ב-#s2 באותו הסיין (720-templates
   skill → MultipleChoiceQuestion.md) — resetState/Toggle/Check/Hint.
   תוכן לפי שקף 45. **תוקן (2026-09-28, בקשה מפורשת: "התשובות הנכונות
   הן הקשיות, הצבע")** — correctSet עודכן ל-ב'+ד', ומיישב את הסתירה
   שדוגלה ב-2026-08-06 מול טקסט המשוב למטה (שכבר תיאר ב'+ד' כנכונות).
   ========================================================= */
/* תוקן (2026-10-01, לפי Critical-requirement-lomda-building.md §29/§9,
   הוחלט עם הלקוח ב-29.09.2026): שלוש תוצאות אפשריות, לא שתיים — "נכון"
   / "נכון חלקית" (נבחרה לפחות אפשרות נכונה אחת, אך לא בדיוק הקבוצה
   הנכונה — המשוב חייב לציין זאת במפורש) / "שגוי" (אף אפשרות נכונה לא
   נבחרה). נכון-חלקית נראה חזותית בדיוק כמו שגוי — רק הכותרת משתנה.
   בניסיון האחרון, הכותרת מקבלת גם את הסיומת "התשובה הנכונה מוצגת."
   דרך fbCorrectShown. */
const S1 = {
  correctSet: new Set(['b', 'd']),
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'الصلابة واللون هما <b>خصائص</b> للبلاستيك الذي يصنع منه الهاتف.\nالهاتف نفسه هو الجسم، لأنه شيء محدد يمكن رؤيته أو حمله أو الإشارة إليه.\nوالبلاستيك هو المادة.'
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
      body: 'الصلابة واللون هما <b>خصائص</b> للبلاستيك الذي يصنع منه الهاتف.\nالهاتف نفسه هو الجسم، لأنه شيء محدد يمكن رؤيته أو حمله أو الإشارة إليه.\nوالبلاستيك هو المادة.'
    },
    wrong2Partial: {
      title: fbCorrectShown('الإجابة صحيحة جزئيًا.'),
      body: 'الصلابة واللون هما <b>خصائص</b> للبلاستيك الذي يصنع منه الهاتف.\nالهاتف نفسه هو الجسم، لأنه شيء محدد يمكن رؤيته أو حمله أو الإشارة إليه.\nوالبلاستيك هو المادة.'
    }
  }
};

let s1Selected = new Set();
let s1Attempts = 0;
let s1Done = false;
let s1Phase = 'before';
let s1AnswerSnapshot = null; // id -> 'correct' | 'wrong' | null, captured right after the final failed attempt
let s1ShowingCorrect = false; // true = board currently shows the §9 reveal (correct answers)
let s1Attempt1Submission = null; // Set captured at the moment attempt 1 is submitted wrong

function s1OptEl(id) {
  return document.querySelector('#s1 .scq-opt[data-id="' + id + '"]');
}

function s1SetsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function s1Toggle(id) {
  if (s1Done) return;
  const wasWrong1 = (s1Phase === 'wrong1');
  const el = s1OptEl(id);
  if (s1Selected.has(id)) {
    s1Selected.delete(id);
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    s1Selected.add(id);
    el.classList.add('selected');
    el.setAttribute('aria-checked', 'true');
  }
  s1Phase = 'selected';
  if (wasWrong1) {
    /* תוקן (2026-10-01, בקשה מפורשת): אין למחוק את מה שהלומד כבר סימן
       בניסיון הראשון — רק מסירים את חיווי הנכון/שגוי, ומשחזרים את
       מחלקת 'selected' לכל מה שעדיין נמצא ב-s1Selected בפועל (לא רק
       לאפשרות שזה עתה נלחצה). */
    document.getElementById('s1-popup').classList.remove('visible');
    document.querySelectorAll('#s1 .scq-opt').forEach(function (o) {
      o.classList.remove('wrong', 'correct');
      o.classList.toggle('selected', s1Selected.has(o.dataset.id));
    });
  }
  const checkBtn = document.getElementById('s1-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  /* תוקן (2026-10-01, בקשה מפורשת): כפתור "צדקתי?" אחרי ניסיון ראשון
     שגוי נדלק רק אם הבחירה הנוכחית שונה ממה שהוגש בניסיון הראשון. */
  const unchangedFromAttempt1 = s1Attempt1Submission && s1SetsEqual(s1Selected, s1Attempt1Submission);
  checkBtn.disabled = s1Selected.size === 0 || unchangedFromAttempt1;
  checkBtn.onclick = s1Check;
}

function s1ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s1-popup');
  const data = S1.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s1-popup');
  box.classList.add('visible');
}

function s1SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s1-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('s1-hint').hidden = true;
}

function s1LockOptions() {
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s1UnlockOptions() {
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s1Toggle(el.dataset.id); };
  });
}

function s1Continue() {
  goTo(2);
}

function s1Check() {
  if (s1Selected.size === 0 || s1Done) return;
  s1Attempts++;
  /* xAPI: multi choice — the selected options' visible texts (the helper orders them by metadata). */
  const s1IsCorrect = s1SetsEqual(s1Selected, S1.correctSet);
  xapiAnswered('001', 'q1', s1IsCorrect, s1IsCorrect || s1Attempts >= S1.maxAttempts,
    { choices: Array.from(s1Selected).map(function (id) { return xapiAnswerText(s1OptEl(id)); }) });

  if (s1IsCorrect) {
    s1Selected.forEach(function (id) {
      s1OptEl(id).classList.add('correct');
      s1OptEl(id).classList.remove('selected');
    });
    s1Phase = 'correct';
    s1Done = true;
    s1Attempt1Submission = null;   // Retry gate cleared on the final outcome (rule 9)
    s1LockOptions();
    s1ShowFeedback('correct', true);
    s1SetBarDone('متابعة', s1Continue);
    stationProgress[1] = 'success';
    updateQuestionNav('s1');
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  /* תוקן (2026-09-28, בקשה מפורשת): חיווי פר-פריט על ניסיון כושל — כל
     בחירה שהיא בפועל נכונה (חלק מ-correctSet) מסומנת 'correct' (ירוק),
     וכל בחירה שגויה (מסיח) מסומנת 'wrong' (אדום). קודם כל הבחירות
     סומנו 'wrong' גורף, גם אם חלקן היו נכונות כשלעצמן — הוחלף כי זה
     בלבל: תשובה נכונה לא אמורה להיראות כמו טעות. */
  const isPartial = Array.from(s1Selected).some(function (id) { return S1.correctSet.has(id); });
  s1Selected.forEach(function (id) {
    s1OptEl(id).classList.add(S1.correctSet.has(id) ? 'correct' : 'wrong');
    s1OptEl(id).classList.remove('selected');
  });

  if (s1Attempts < S1.maxAttempts) {
    s1Phase = 'wrong1';
    s1Attempt1Submission = new Set(s1Selected);
    s1ShowFeedback(isPartial ? 'wrong1Partial' : 'wrong1Full', false);
    const checkBtn = document.getElementById('s1-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s1Check;
    const hintBtn = document.getElementById('s1-hint');
    hintBtn.hidden = false;
    try { flushResumeSave(); } catch (e) {}
  } else {
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה הנכונה
       (בלי מצב-ביניים), עם כפתור טוגל "מעבר לתשובה שלי" ⇄ "מעבר לתשובה
       הנכונה". ה-snapshot נלקח כאן, לפני שהחשיפה דורסת את הסימון
       שכבר הוצג ברגע ההגשה. **תוקן (2026-10-01, בקשה מפורשת):** תצוגת
       "התשובה הנכונה" מסמנת רק את הנכונות עצמן — מנקים wrong מכל
       האפשרויות (כולל מסיחים שהלומד בחר) לפני שמסמנים את ה-correctSet. */
    s1AnswerSnapshot = {};
    document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
      const id = el.dataset.id;
      s1AnswerSnapshot[id] = s1Selected.has(id) ? (S1.correctSet.has(id) ? 'correct' : 'wrong') : null;
    });
    document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
      el.classList.remove('correct', 'wrong');
      if (S1.correctSet.has(el.dataset.id)) el.classList.add('correct');
    });
    s1ShowingCorrect = true;
    s1Phase = 'wrong-final';
    s1Done = true;
    s1Attempt1Submission = null;   // Retry gate cleared on the final outcome (rule 9)
    s1LockOptions();
    s1ShowFeedback(isPartial ? 'wrong2Partial' : 'wrong2Full', false);
    s1SetBarDone('متابعة', s1Continue);
    const revealBtn = document.getElementById('s1-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
    stationProgress[1] = 'fail';
    updateQuestionNav('s1');
    try { flushResumeSave(); } catch (e) {}
  }
}

function s1ToggleReveal() {
  if (!s1Done || s1Phase !== 'wrong-final') return;
  const revealBtn = document.getElementById('s1-reveal-btn');
  if (s1ShowingCorrect) {
    document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
      el.classList.remove('correct', 'wrong');
      const cls = s1AnswerSnapshot[el.dataset.id];
      if (cls) el.classList.add(cls);
    });
    s1ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
      el.classList.remove('correct', 'wrong');
      if (S1.correctSet.has(el.dataset.id)) el.classList.add('correct');
    });
    s1ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function s1OpenHint() {
  if (s1Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q1');
  document.getElementById('s1-hint-overlay').hidden = false;
}

function s1CloseHint() {
  document.getElementById('s1-hint-overlay').hidden = true;
}

function resetScreenState1() {
  updateQuestionNav('s1');
  if (s1Done || s1Attempts > 0 || s1Selected.size > 0) {
    /* תוקן (2026-10-01, §9): שחזור מצב כפתור "מעבר לתשובה שלי/הנכונה"
       בחזרה למסך שכבר ננעל בניסיון-אחרון-שגוי. */
    const revealBtn = document.getElementById('s1-reveal-btn');
    if (revealBtn) {
      if (s1Phase === 'wrong-final' && s1AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = s1ShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return; // resume-state guard
  }
  s1Selected = new Set();
  s1Attempts = 0;
  s1Phase = 'before';
  s1AnswerSnapshot = null;
  s1ShowingCorrect = false;
  s1Attempt1Submission = null;
  s1UnlockOptions();
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s1-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s1-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s1Check;
  const hintBtn = document.getElementById('s1-hint');
  hintBtn.hidden = true;
  document.getElementById('s1-hint-overlay').hidden = true;
  const revealBtn = document.getElementById('s1-reveal-btn');
  if (revealBtn) revealBtn.hidden = true;
}

scqFbMakeDraggable('s1-popup');

/* =========================================================
   מסך 3 (s2) — שאלה 2 מתוך 5: MultipleChoiceQuestion מלווה בתמונה.
   אותו מנגנון Set-based בדיוק שכבר נבנה בסיין 1 (מסך 26) — Set במקום
   id יחיד, toggle, gate על size>=1, בדיקת שוויון-קבוצות. כפתור רמז
   פעיל מההתחלה (לא hidden, לא מוסתר עד תשובה שגויה) — לפי בקשת ההפקה.
   ========================================================= */
/* תוקן (2026-10-01, לפי Critical-requirement-lomda-building.md §29/§9,
   הוחלט עם הלקוח ב-29.09.2026): שלוש תוצאות אפשריות, לא שתיים — ראו
   ההערה המקבילה ב-S1 לפירוט מלא. */
const S2 = {
  correctSet: new Set(['a', 'b', 'c']),
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'الإجابة صحيحة!',
      body: 'الشفافية والصلابة والموصلية الكهربائية هي خصائص المواد.\n\nالكتلة والحجم هما خاصيتان للجسم.'
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
      body: 'الشفافية والصلابة والموصلية الكهربائية هي خصائص المواد.\n\nالكتلة والحجم هما خاصيتان للجسم.'
    },
    wrong2Partial: {
      title: fbCorrectShown('الإجابة صحيحة جزئيًا.'),
      body: 'الشفافية والصلابة والموصلية الكهربائية هي خصائص المواد.\n\nالكتلة والحجم هما خاصيتان للجسم.'
    }
  }
};

let s2Selected = new Set();
let s2Attempts = 0;
let s2Done = false;
let s2Phase = 'before';
let s2AnswerSnapshot = null; // id -> 'correct' | 'wrong' | null, captured right after the final failed attempt
let s2ShowingCorrect = false; // true = board currently shows the §9 reveal (correct answers)
let s2Attempt1Submission = null; // Set captured at the moment attempt 1 is submitted wrong

function s2OptEl(id) {
  return document.querySelector('#s2 .scq-opt[data-id="' + id + '"]');
}

function s2SetsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function s2Toggle(id) {
  if (s2Done) return;
  const wasWrong1 = (s2Phase === 'wrong1');
  const el = s2OptEl(id);
  if (s2Selected.has(id)) {
    s2Selected.delete(id);
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    s2Selected.add(id);
    el.classList.add('selected');
    el.setAttribute('aria-checked', 'true');
  }
  s2Phase = 'selected';
  if (wasWrong1) {
    /* תוקן (2026-10-01, בקשה מפורשת): אין למחוק את מה שהלומד כבר סימן
       בניסיון הראשון — רק מסירים את חיווי הנכון/שגוי, ומשחזרים את
       מחלקת 'selected' לכל מה שעדיין נמצא ב-s2Selected בפועל. */
    document.getElementById('s2-popup').classList.remove('visible');
    document.querySelectorAll('#s2 .scq-opt').forEach(function (o) {
      o.classList.remove('wrong', 'correct');
      o.classList.toggle('selected', s2Selected.has(o.dataset.id));
    });
  }
  const checkBtn = document.getElementById('s2-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  /* תוקן (2026-10-01, בקשה מפורשת): כפתור "צדקתי?" אחרי ניסיון ראשון
     שגוי נדלק רק אם הבחירה הנוכחית שונה ממה שהוגש בניסיון הראשון. */
  const unchangedFromAttempt1 = s2Attempt1Submission && s2SetsEqual(s2Selected, s2Attempt1Submission);
  checkBtn.disabled = s2Selected.size === 0 || unchangedFromAttempt1;
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
    el.onclick = function () { s2Toggle(el.dataset.id); };
  });
}

function s2Continue() {
  goTo(3);
}

function s2Check() {
  if (s2Selected.size === 0 || s2Done) return;
  s2Attempts++;
  /* xAPI: multi choice — the selected options' visible texts (the helper orders them by metadata). */
  const s2IsCorrect = s2SetsEqual(s2Selected, S2.correctSet);
  xapiAnswered('002', 'q1', s2IsCorrect, s2IsCorrect || s2Attempts >= S2.maxAttempts,
    { choices: Array.from(s2Selected).map(function (id) { return xapiAnswerText(s2OptEl(id)); }) });

  if (s2IsCorrect) {
    s2Selected.forEach(function (id) {
      s2OptEl(id).classList.add('correct');
      s2OptEl(id).classList.remove('selected');
    });
    s2Phase = 'correct';
    s2Done = true;
    s2Attempt1Submission = null;   // Retry gate cleared on the final outcome (rule 9)
    s2LockOptions();
    s2ShowFeedback('correct', true);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[2] = 'success';
    updateQuestionNav('s2');
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  /* תוקן (2026-09-28): אותו תיקון בדיוק כמו s1 — חיווי פר-פריט על ניסיון
     כושל (ירוק לבחירה נכונה, אדום למסיח), במקום 'wrong' גורף על כל
     הבחירות. */
  const isPartial = Array.from(s2Selected).some(function (id) { return S2.correctSet.has(id); });
  s2Selected.forEach(function (id) {
    s2OptEl(id).classList.add(S2.correctSet.has(id) ? 'correct' : 'wrong');
    s2OptEl(id).classList.remove('selected');
  });

  if (s2Attempts < S2.maxAttempts) {
    s2Phase = 'wrong1';
    s2Attempt1Submission = new Set(s2Selected);
    s2ShowFeedback(isPartial ? 'wrong1Partial' : 'wrong1Full', false);
    const checkBtn = document.getElementById('s2-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s2Check;
    try { flushResumeSave(); } catch (e) {}
  } else {
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה הנכונה
       (בלי מצב-ביניים), עם כפתור טוגל "מעבר לתשובה שלי" ⇄ "מעבר לתשובה
       הנכונה". ה-snapshot נלקח כאן, לפני שהחשיפה דורסת את הסימון
       שכבר הוצג ברגע ההגשה. **תוקן (2026-10-01, בקשה מפורשת):** תצוגת
       "התשובה הנכונה" מסמנת רק את הנכונות עצמן — מנקים wrong מכל
       האפשרויות (כולל מסיחים שהלומד בחר) לפני שמסמנים את ה-correctSet. */
    s2AnswerSnapshot = {};
    document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
      const id = el.dataset.id;
      s2AnswerSnapshot[id] = s2Selected.has(id) ? (S2.correctSet.has(id) ? 'correct' : 'wrong') : null;
    });
    document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
      el.classList.remove('correct', 'wrong');
      if (S2.correctSet.has(el.dataset.id)) el.classList.add('correct');
    });
    s2ShowingCorrect = true;
    s2Phase = 'wrong-final';
    s2Done = true;
    s2Attempt1Submission = null;   // Retry gate cleared on the final outcome (rule 9)
    s2LockOptions();
    s2ShowFeedback(isPartial ? 'wrong2Partial' : 'wrong2Full', false);
    s2SetBarDone('متابعة', s2Continue);
    const revealBtn = document.getElementById('s2-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
    stationProgress[2] = 'fail';
    updateQuestionNav('s2');
    try { flushResumeSave(); } catch (e) {}
  }
}

function s2ToggleReveal() {
  if (!s2Done || s2Phase !== 'wrong-final') return;
  const revealBtn = document.getElementById('s2-reveal-btn');
  if (s2ShowingCorrect) {
    document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
      el.classList.remove('correct', 'wrong');
      const cls = s2AnswerSnapshot[el.dataset.id];
      if (cls) el.classList.add(cls);
    });
    s2ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
      el.classList.remove('correct', 'wrong');
      if (S2.correctSet.has(el.dataset.id)) el.classList.add('correct');
    });
    s2ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function s2OpenHint() {
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('002', 'q1');
  document.getElementById('s2-hint-overlay').hidden = false;
}

function s2CloseHint() {
  document.getElementById('s2-hint-overlay').hidden = true;
}

function s2OpenTermInfo() {
  document.getElementById('s2-term-hint-overlay').hidden = false;
}

function s2CloseTermInfo() {
  document.getElementById('s2-term-hint-overlay').hidden = true;
}

function resetScreenState2() {
  updateQuestionNav('s2');
  if (s2Done || s2Attempts > 0 || s2Selected.size > 0) {
    /* תוקן (2026-10-01, §9): שחזור מצב כפתור "מעבר לתשובה שלי/הנכונה"
       בחזרה למסך שכבר ננעל בניסיון-אחרון-שגוי. */
    const revealBtn = document.getElementById('s2-reveal-btn');
    if (revealBtn) {
      if (s2Phase === 'wrong-final' && s2AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = s2ShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return; // resume-state guard
  }
  s2Selected = new Set();
  s2Attempts = 0;
  s2Phase = 'before';
  s2AnswerSnapshot = null;
  s2ShowingCorrect = false;
  s2Attempt1Submission = null;
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
  document.getElementById('s2-hint-overlay').hidden = true;
  document.getElementById('s2-term-hint-overlay').hidden = true;
  const revealBtn = document.getElementById('s2-reveal-btn');
  if (revealBtn) revealBtn.hidden = true;
}

scqFbMakeDraggable('s2-popup');

/* =========================================================
   מסך 4 (s3) — שאלה 3 מתוך 5: SingleChoiceQuestion מלווה בטבלה. בלי
   כפתור רמז כלל (לפי בקשה מפורשת) — אין hintBtn/hint-overlay למסך
   הזה בכלל. תוכן לפי שקף 47.
   ========================================================= */
const S3 = {
  correctId: 'b',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز.',
      body: 'نجحتم في تحديد معطى في الجدول بشكل صحيح.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'وفقًا للجدول، يمكن أن نفهم أن قوس سماعات الرأس مصنوع من البلاستيك.'
    }
  }
};

let s3Selected = null;
let s3Attempts = 0;
let s3Done = false;
let s3Phase = 'before';
let s3LastWrong = null; // Retry gate (guide §8.8 rule 9): the option id submitted on a non-final wrong attempt

function s3OptEl(id) {
  return document.querySelector('#s3 .scq-opt[data-id="' + id + '"]');
}

function s3Select(id) {
  if (s3Done) return;
  const wasWrong1 = (s3Phase === 'wrong1');
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s3OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s3Selected = id;
  s3Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s3-popup').classList.remove('visible');
  }
  const checkBtn = document.getElementById('s3-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = (s3Selected === s3LastWrong); // Retry gate (rule 9)
  checkBtn.onclick = s3Check;
}

function s3ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s3-popup');
  const data = S3.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s3-popup');
  box.classList.add('visible');
}

function s3SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s3-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function s3LockOptions() {
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s3UnlockOptions() {
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s3Select(el.dataset.id); };
  });
}

function s3Continue() {
  goTo(4);
}

function s3Check() {
  if (!s3Selected || s3Done) return;
  s3Attempts++;
  const optEl = s3OptEl(s3Selected);
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('003', 'q1', s3Selected === S3.correctId,
    s3Selected === S3.correctId || s3Attempts >= S3.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s3Selected === S3.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s3Phase = 'correct';
    s3Done = true;
    s3LockOptions();
    s3ShowFeedback('correct', true);
    s3SetBarDone('متابعة', s3Continue);
    stationProgress[3] = 'success';
    updateQuestionNav('s3');
    s3LastWrong = null;
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s3Attempts < S3.maxAttempts) {
    s3Phase = 'wrong1';
    s3LastWrong = s3Selected;
    s3ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s3-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s3Check;
    try { flushResumeSave(); } catch (e) {}
  } else {
    s3OptEl(S3.correctId).classList.add('correct');
    s3Phase = 'wrong-final';
    s3Done = true;
    s3LastWrong = null;
    s3LockOptions();
    s3ShowFeedback('wrong2', false);
    s3SetBarDone('متابعة', s3Continue);
    stationProgress[3] = 'fail';
    updateQuestionNav('s3');
    try { flushResumeSave(); } catch (e) {}
  }
}

function resetScreenState3() {
  updateQuestionNav('s3');
  if (s3Done || s3Attempts > 0 || s3Selected) return; // resume-state guard
  s3Selected = null;
  s3Attempts = 0;
  s3Phase = 'before';
  s3LastWrong = null;
  s3UnlockOptions();
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s3-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s3-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s3Check;
}

scqFbMakeDraggable('s3-popup');

/* =========================================================
   מסך 5 (s4) — שאלה 4 מתוך 5: DropdownQuestion (2 תפריטים נפתחים).
   כפתור רמז פעיל תמיד. תוכן לפי שקף 48.
   ========================================================= */
const S4_OPTIONS = {
  1: ['خصائص', 'وظيفة', 'لون'],
  2: ['اسم', 'وظيفة', 'خصائص']
};
const S4_CORRECT = { 1: 'خصائص', 2: 'وظيفة' };
/* xAPI result.response (2026-10-21, תקלת monday): 004/q1 הוא performance — לכל תפריט
   stepId משלו במטא-דאטה ("תפריט 1", "תפריט 2", לפי הסדר), כי בכל תפריט אפשרויות
   שונות. התשובה: 'תפריט 1[.]<בחירה>[,]תפריט 2[.]<בחירה>' — הערכים בסדר התפריטים. */
/* תוקן (2026-10-01, בקשה מפורשת, לפי Critical-requirement-lomda-building.md
   §5.2): בשאלת השלמת פסקה עם יותר מתפריט/אינפוט אחד — אם הלומד ענה
   נכון על חלק מהתפריטים (לא כולם), המשוב חייב לומר "תשובה נכונה
   חלקית", לא רק "לא נכונה" גורף. */
const S4_FEEDBACK = {
  correct: {
    title: 'صحيح!',
    body: 'اختيار المادة هو قرار يستند، من بين أمور أخرى، إلى خصائصها.\n\nعلى سبيل المثال، وسادة الأذن تحتاج إلى مادة ناعمة، والقوس يحتاج إلى مادة مرنة ومتينة، والتوصيل الداخلي يحتاج إلى مادة موصلة للكهرباء.'
  },
  wrong1Full: {
    title: 'الإجابة غير صحيحة.',
    body: 'هل نحاول مرة أخرى؟'
  },
  wrong1Partial: {
    title: 'الإجابة صحيحة جزئيًا.',
    body: 'هل نحاول مرة أخرى؟'
  },
  wrong2: {
    title: fbCorrectShown('الإجابة غير صحيحة.'),
    body: 'اختيار المادة هو قرار يستند، من بين أمور أخرى، إلى خصائصها.\n\nعلى سبيل المثال، وسادة الأذن تحتاج إلى مادة ناعمة، والقوس يحتاج إلى مادة مرنة ومتينة، والتوصيل الداخلي يحتاج إلى مادة موصلة للكهرباء.'
  },
  wrong2Partial: {
    title: fbCorrectShown('الإجابة صحيحة جزئيًا.'),
    body: 'اختيار المادة هو قرار يستند، من بين أمور أخرى، إلى خصائصها.\n\nعلى سبيل المثال، وسادة الأذن تحتاج إلى مادة ناعمة، والقوس يحتاج إلى مادة مرنة ومتينة، والتوصيل الداخلي يحتاج إلى مادة موصلة للكهرباء.'
  }
};

let s4Answers = { 1: null, 2: null };
let s4Attempts = 0;
let s4Done = false;
let s4AnswerSnapshot = null;
let s4ShowingCorrect = false; // true = board currently shows the §9 reveal (correct answers)
let s4LastWrong = null; // Retry gate (guide §8.8 rule 9): s4Sig() of the non-final wrong submission

function s4BlankEl(n) {
  return document.getElementById('s4-blank-' + n);
}

/* Signature of the current answer, compared against s4LastWrong (rule 9: 'id=value|…'). */
function s4Sig() {
  return [1, 2].map(function (n) { return n + '=' + (s4Answers[n] || ''); }).join('|');
}

function s4RenderMenu(n) {
  const blank = s4BlankEl(n);
  const menu = blank.querySelector('.dpq-menu');
  menu.innerHTML = '';
  S4_OPTIONS[n].forEach(function (opt) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dpq-option';
    btn.textContent = opt;
    btn.onclick = function (e) { e.stopPropagation(); s4Select(n, opt); };
    menu.appendChild(btn);
  });
}

function s4Toggle(n) {
  if (s4Done) return;
  /* תוקן (2026-08-05): First-attempt retry feedback dismissal —
     720-templates skill (_global-components.md → "Feedback popup
     system") — "opening or changing a dropdown" הוא trigger מפורש. */
  const blank = s4BlankEl(n);
  /* נעילת סעיף שנענה נכון (2026-10-01, Critical-requirement §5.3): אחרי
     בדיקה, סעיף ירוק לא נפתח ולא ניתן לשינוי עד סוף השאלה. */
  if (blank.classList.contains('correct')) return;
  if (s4Attempts > 0) document.getElementById('s4-popup').classList.remove('visible');
  const wasOpen = blank.classList.contains('open');
  document.querySelectorAll('#s4 .dpq-blank').forEach(function (b) { b.classList.remove('open'); });
  if (!wasOpen) blank.classList.add('open');
}

function s4Select(n, value) {
  if (s4Done) return;
  const blank = s4BlankEl(n);
  if (blank.classList.contains('correct')) return; // סעיף נכון ננעל (§5.3)
  s4Answers[n] = value;
  blank.classList.remove('open');
  /* Rule 10 (guide §8.8, QA D-15): a changed, unsubmitted value carries no mark — the ✗ of the
     rejected attempt belonged to the previous value (a correct blank never gets here: locked above). */
  blank.classList.remove('incorrect');
  blank.querySelector('.dpq-trigger-icon').src = '../unit-assets/img/icon-dropdown-chevron.svg';
  blank.querySelector('.dpq-trigger-text').textContent = value;
  document.getElementById('s4-popup').classList.remove('visible');
  s4UpdateCheckBtn();
}

function s4UpdateCheckBtn() {
  const btn = document.getElementById('s4-check');
  if (btn && !s4Done) btn.disabled = !(s4Answers[1] && s4Answers[2]) || s4Sig() === s4LastWrong; // Retry gate (rule 9)
}

document.addEventListener('click', function (e) {
  if (e.target.closest('.dpq-blank')) return;
  document.querySelectorAll('.dpq-blank').forEach(function (b) { b.classList.remove('open'); });
});

function s4ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s4-popup');
  const data = S4_FEEDBACK[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s4-popup');
  box.classList.add('visible');
}

function s4SetBarDone(label, handler) {
  const btn = document.getElementById('s4-check');
  btn.textContent = label;
  btn.disabled = false;
  btn.onclick = handler;
}

function s4LockBlanks() {
  document.querySelectorAll('#s4 .dpq-blank').forEach(function (b) {
    b.classList.add('disabled');
    b.classList.remove('open');
  });
}

function s4Continue() {
  goTo(5);
}

function s4Check() {
  if (s4Done || !s4Answers[1] || !s4Answers[2]) return;
  s4Attempts++;

  let allCorrect = true;
  [1, 2].forEach(function (n) {
    const blank = s4BlankEl(n);
    const ok = s4Answers[n] === S4_CORRECT[n];
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add(ok ? 'correct' : 'incorrect');
    blank.classList.toggle('disabled', ok); // §5.3: סעיף נכון ננעל
    blank.querySelector('.dpq-trigger-icon').src = ok
      ? '../unit-assets/img/icon-dropdown-correct.svg'
      : '../unit-assets/img/icon-dropdown-incorrect.svg';
    if (!ok) allCorrect = false;
  });

  /* xAPI: performance — one step per dropdown, in dropdown order; after the blank loop, before any branch. */
  xapiAnswered('004', 'q1', allCorrect, allCorrect || s4Attempts >= 2,
    { steps: [1, 2].map(function (n) { return s4Answers[n] || ''; }) });

  if (allCorrect) {
    s4Done = true;
    s4LastWrong = null;
    s4LockBlanks();
    s4ShowFeedback('correct', true);
    s4SetBarDone('متابعة', s4Continue);
    stationProgress[4] = 'success';
    updateQuestionNav('s4');
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  const s4IsPartial = [1, 2].some(function (n) { return s4Answers[n] === S4_CORRECT[n]; });

  if (s4Attempts < 2) {
    s4LastWrong = s4Sig();
    s4ShowFeedback(s4IsPartial ? 'wrong1Partial' : 'wrong1Full', false);
    document.getElementById('s4-check').disabled = true;
    try { flushResumeSave(); } catch (e) {}
  } else {
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה הנכונה
       (בלי מצב-ביניים), עם משוב מלא וכפתור טוגל "מעבר לתשובה שלי" ⇄
       "מעבר לתשובה הנכונה". ה-snapshot נלקח לפני שהחשיפה דורסת את הבחירה. */
    s4AnswerSnapshot = { 1: s4Answers[1], 2: s4Answers[2] };
    s4Done = true;
    s4LastWrong = null;
    s4LockBlanks();
    s4ApplyCorrect();
    s4ShowingCorrect = true;
    s4ShowFeedback(s4IsPartial ? 'wrong2Partial' : 'wrong2', false);
    s4SetBarDone('متابعة', s4Continue);
    stationProgress[4] = 'fail';
    updateQuestionNav('s4');
    const revealBtn = document.getElementById('s4-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
    try { flushResumeSave(); } catch (e) {}
  }
}

function s4ApplyCorrect() {
  [1, 2].forEach(function (n) {
    const blank = s4BlankEl(n);
    blank.querySelector('.dpq-trigger-text').textContent = S4_CORRECT[n];
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add('correct');
    blank.querySelector('.dpq-trigger-icon').src = '../unit-assets/img/icon-dropdown-correct.svg';
  });
}

function s4ToggleReveal() {
  if (!s4Done || !s4AnswerSnapshot) return;
  const revealBtn = document.getElementById('s4-reveal-btn');
  if (s4ShowingCorrect) {
    [1, 2].forEach(function (n) {
      const blank = s4BlankEl(n);
      blank.querySelector('.dpq-trigger-text').textContent = s4AnswerSnapshot[n];
      const ok = S4_CORRECT[n] === s4AnswerSnapshot[n];
      blank.classList.remove('correct', 'incorrect');
      blank.classList.add(ok ? 'correct' : 'incorrect');
      blank.querySelector('.dpq-trigger-icon').src = ok
        ? '../unit-assets/img/icon-dropdown-correct.svg'
        : '../unit-assets/img/icon-dropdown-incorrect.svg';
    });
    s4ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    s4ApplyCorrect();
    s4ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function s4OpenHint() {
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('004', 'q1');
  document.getElementById('s4-hint-overlay').hidden = false;
}

function s4CloseHint() {
  document.getElementById('s4-hint-overlay').hidden = true;
}

function resetScreenState4() {
  updateQuestionNav('s4');
  s4RenderMenu(1);
  s4RenderMenu(2);
  if (s4Done || s4Attempts > 0 || s4Answers[1] || s4Answers[2]) {
    /* תוקן (2026-10-01, §9): שחזור מצב כפתור "מעבר לתשובה שלי/הנכונה"
       בחזרה למסך שהושלם. */
    const revealBtn = document.getElementById('s4-reveal-btn');
    if (revealBtn) {
      if (s4Done && s4AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = s4ShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return; // resume-state guard
  }
  s4Answers = { 1: null, 2: null };
  s4Attempts = 0;
  s4AnswerSnapshot = null;
  s4ShowingCorrect = false;
  s4LastWrong = null;
  [1, 2].forEach(function (n) {
    const blank = s4BlankEl(n);
    blank.classList.remove('open', 'correct', 'incorrect', 'disabled');
    blank.querySelector('.dpq-trigger-text').textContent = '';
    blank.querySelector('.dpq-trigger-icon').src = '../unit-assets/img/icon-dropdown-chevron.svg';
  });
  document.getElementById('s4-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s4-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s4Check;
  document.getElementById('s4-hint-overlay').hidden = true;
  const revealBtn = document.getElementById('s4-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
}

scqFbMakeDraggable('s4-popup');

/* =========================================================
   מסך 6 (s5) — שאלה 5 מתוך 5: בחירת תמונה (radiogroup של כרטיסי-
   תמונה). state machine זהה בעקרונו ל-SCQ (Select/Check/Hint), רק
   על .s5-card במקום .scq-opt. כפתור רמז פעיל תמיד. תוכן לפי שקף 49.
   ========================================================= */
const S5 = {
  correctId: 'plastic',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'البلاستيك ينتج في عملية صناعية، ولذلك هو مادة مُصنعة.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'البلاستيك ينتج في عملية صناعية، ولذلك هو مادة مُصنعة.'
    }
  }
};

let s5Selected = null;
let s5Attempts = 0;
let s5Done = false;
let s5Phase = 'before';
let s5LastWrong = null; // Retry gate (guide §8.8 rule 9)

function s5CardEl(id) {
  return document.querySelector('#s5 .s5-card[data-id="' + id + '"]');
}

function s5Select(id) {
  if (s5Done) return;
  const wasWrong1 = (s5Phase === 'wrong1');
  document.querySelectorAll('#s5 .s5-card').forEach(function (el) {
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s5CardEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s5Selected = id;
  s5Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s5-popup').classList.remove('visible');
    document.querySelectorAll('#s5 .s5-card').forEach(function (el) { el.classList.remove('wrong'); });
  }
  const checkBtn = document.getElementById('s5-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = (s5Selected === s5LastWrong); // Retry gate (rule 9)
  checkBtn.onclick = s5Check;
}

function s5ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s5-popup');
  const data = S5.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s5-popup');
  box.classList.add('visible');
}

function s5SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s5-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function s5LockCards() {
  document.querySelectorAll('#s5 .s5-card').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s5UnlockCards() {
  document.querySelectorAll('#s5 .s5-card').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s5Select(el.dataset.id); };
  });
}

function s5Continue() {
  goTo(6);
}

function s5Check() {
  if (!s5Selected || s5Done) return;
  s5Attempts++;
  const cardEl = s5CardEl(s5Selected);
  /* xAPI: single choice over image cards — the selected card's img alt (= metadata answer text). */
  const s5CardImg = cardEl ? cardEl.querySelector('img') : null;
  xapiAnswered('005', 'q1', s5Selected === S5.correctId,
    s5Selected === S5.correctId || s5Attempts >= S5.maxAttempts,
    { choices: [s5CardImg ? (s5CardImg.getAttribute('alt') || '') : ''] });

  if (s5Selected === S5.correctId) {
    cardEl.classList.add('correct');
    cardEl.classList.remove('selected');
    s5Phase = 'correct';
    s5Done = true;
    s5LockCards();
    s5ShowFeedback('correct', true);
    s5SetBarDone('متابعة', s5Continue);
    stationProgress[5] = 'success';
    updateQuestionNav('s5');
    s5LastWrong = null;
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  cardEl.classList.add('wrong');
  cardEl.classList.remove('selected');

  if (s5Attempts < S5.maxAttempts) {
    s5Phase = 'wrong1';
    s5LastWrong = s5Selected;
    s5ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s5-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s5Check;
    try { flushResumeSave(); } catch (e) {}
  } else {
    s5CardEl(S5.correctId).classList.add('correct');
    s5Phase = 'wrong-final';
    s5Done = true;
    s5LastWrong = null;
    s5LockCards();
    s5ShowFeedback('wrong2', false);
    s5SetBarDone('متابعة', s5Continue);
    stationProgress[5] = 'fail';
    updateQuestionNav('s5');
    try { flushResumeSave(); } catch (e) {}
  }
}

function s5OpenHint() {
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('005', 'q1');
  document.getElementById('s5-hint-overlay').hidden = false;
}

function s5CloseHint() {
  document.getElementById('s5-hint-overlay').hidden = true;
}

function resetScreenState5() {
  updateQuestionNav('s5');
  if (s5Done || s5Attempts > 0 || s5Selected) return; // resume-state guard
  s5Selected = null;
  s5Attempts = 0;
  s5Phase = 'before';
  s5LastWrong = null;
  s5UnlockCards();
  document.querySelectorAll('#s5 .s5-card').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s5-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s5-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s5Check;
  document.getElementById('s5-hint-overlay').hidden = true;
}

scqFbMakeDraggable('s5-popup');

/* מסך 7 — דמות בווידאו אמיתי "מרימה אגודל" (green-avatar-ok-finger.mp4/
   turquoise-avatar-ok-finger.mp4, סופקו בפועל), אותו חוזה
   resolveCharBubbleVideo. */
const S6_AVATAR_ASSETS = {
  'character-1': 'assets/videos/green-avatar-ok-finger.mp4',
  'character-2': 'assets/videos/turquoise-avatar-ok-finger.mp4'
};

function resetScreenState6() {
  resolveCharBubbleVideo('s6-avatar-video', S6_AVATAR_ASSETS);
}

/* =========================================================
   סרגל התקדמות **שני, נפרד** — 2 שקעים (מסכים 8-9, s7-s8). זו סדרה
   חדשה ("שאלה 1/2 מתוך 2"), לא המשך סדרת 5 השאלות (מסכים 2-6,
   stationProgress/updateQuestionNav) — לכן מנגנון עצמאי, לא שיתוף
   שקעים עם הישן.
   ========================================================= */
const SLOT_OF_SETB = { s7: 1, s8: 2 };
let stationProgressSetB = { 1: null, 2: null };

function updateQuestionNavSetB(prefix) {
  const currentSlot = SLOT_OF_SETB[prefix];
  for (let i = 1; i <= 2; i++) {
    const icon = document.getElementById(prefix + '-qnav-icon-' + i);
    const label = document.getElementById(prefix + '-qnav-label-' + i);
    if (!icon) continue;
    icon.className = 'qnav-icon';
    if (label) label.className = 'qnav-label';
    if (stationProgressSetB[i] === 'success') {
      icon.classList.add('qnav-success');
      if (label) label.classList.add('qnav-label-active');
    } else if (stationProgressSetB[i] === 'fail') {
      icon.classList.add('qnav-fail');
      if (label) label.classList.add('qnav-label-active');
    } else if (i === currentSlot) {
      icon.classList.add('qnav-current');
      if (label) label.classList.add('qnav-label-active');
    } else {
      icon.classList.add('qnav-future');
    }
  }
  const line = document.getElementById(prefix + '-qnav-line-1');
  if (line) {
    line.className = 'qnav-line';
    if (stationProgressSetB[1] !== null) line.classList.add('line-done');
  }
}

/* =========================================================
   מסך 8 (s7) — שאלה 1 מתוך 2: SingleChoiceQuestion מלווה בתמונה
   (placeholder). בלי כפתור רמז כלל (לפי בקשה מפורשת). תוכן לפי שקף 51.
   ========================================================= */
const S7 = {
  correctId: 'c',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'صحيح!',
      body: 'الشكل المستدير أو الأملس لا يكفي وحده لتحديد ما إذا كان الجسم مُصنعًا، لأن العمليات الطبيعية يمكن أن تصقل الأجسام وتدوّرها أيضًا.\nلتحديد ما إذا كان الجسم قد خضع للتصنيع، يجب البحث عن <b>أدلة إضافية</b> مثل علامات القطع، الصقل، النقش، الوصل بين الأجزاء، أو شكل يبدو مكيّفًا لاستخدام معيّن.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'الشكل المستدير أو الأملس لا يكفي وحده لتحديد ما إذا كان الجسم مُصنعًا، لأن العمليات الطبيعية يمكن أن تصقل الأجسام وتدوّرها أيضًا.\nلتحديد ما إذا كان الجسم قد خضع للتصنيع، يجب البحث عن <b>أدلة إضافية</b> مثل علامات القطع، الصقل، النقش، الوصل بين الأجزاء، أو شكل يبدو مكيّفًا لاستخدام معيّن.'
    }
  }
};

let s7Selected = null;
let s7Attempts = 0;
let s7Done = false;
let s7Phase = 'before';
let s7LastWrong = null; // Retry gate (guide §8.8 rule 9)

function s7OptEl(id) {
  return document.querySelector('#s7 .scq-opt[data-id="' + id + '"]');
}

function s7Select(id) {
  if (s7Done) return;
  const wasWrong1 = (s7Phase === 'wrong1');
  document.querySelectorAll('#s7 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s7OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s7Selected = id;
  s7Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s7-popup').classList.remove('visible');
  }
  const checkBtn = document.getElementById('s7-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = (s7Selected === s7LastWrong); // Retry gate (rule 9)
  checkBtn.onclick = s7Check;
}

function s7ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s7-popup');
  const data = S7.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s7-popup');
  box.classList.add('visible');
}

function s7SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s7-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function s7LockOptions() {
  document.querySelectorAll('#s7 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s7UnlockOptions() {
  document.querySelectorAll('#s7 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s7Select(el.dataset.id); };
  });
}

function s7Continue() {
  goTo(8);
}

function s7Check() {
  if (!s7Selected || s7Done) return;
  s7Attempts++;
  const optEl = s7OptEl(s7Selected);
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('006', 'q1', s7Selected === S7.correctId,
    s7Selected === S7.correctId || s7Attempts >= S7.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s7Selected === S7.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s7Phase = 'correct';
    s7Done = true;
    s7LockOptions();
    s7ShowFeedback('correct', true);
    s7SetBarDone('متابعة', s7Continue);
    stationProgressSetB[1] = 'success';
    updateQuestionNavSetB('s7');
    s7LastWrong = null;
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s7Attempts < S7.maxAttempts) {
    s7Phase = 'wrong1';
    s7LastWrong = s7Selected;
    s7ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s7-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s7Check;
    try { flushResumeSave(); } catch (e) {}
  } else {
    s7OptEl(S7.correctId).classList.add('correct');
    s7Phase = 'wrong-final';
    s7Done = true;
    s7LastWrong = null;
    s7LockOptions();
    s7ShowFeedback('wrong2', false);
    s7SetBarDone('متابعة', s7Continue);
    stationProgressSetB[1] = 'fail';
    updateQuestionNavSetB('s7');
    try { flushResumeSave(); } catch (e) {}
  }
}

function resetScreenState7() {
  updateQuestionNavSetB('s7');
  if (s7Done || s7Attempts > 0 || s7Selected) return; // resume-state guard
  s7Selected = null;
  s7Attempts = 0;
  s7Phase = 'before';
  s7LastWrong = null;
  s7UnlockOptions();
  document.querySelectorAll('#s7 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s7-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s7-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s7Check;
}

scqFbMakeDraggable('s7-popup');

/* =========================================================
   מסך 9 (s8) — שאלה 2 מתוך 2: גרירה למיון ל-2 קבוצות. state machine
   זהה 1:1 למסך 14 (ddq13) בסיין 1 (appendChild-based, בדיקת-נכונות
   ברמת-אזור-שלם, לחיצה-מחזירה-למגש) — ראו הערה מלאה ב-index.html
   למה זה (לא dqx19/מחסן-מילים) המנגנון הנכון לתוכן שקף 52.
   ========================================================= */
const S8B_ITEM_IDS = ['s8b-mass', 's8b-volume', 's8b-color', 's8b-flex'];
/* xAPI result.response: zone element id → visible zone label (= metadata 007/q1 answers.target). */
const S8B_ZONE_LABELS = {
  's8b-zone-body': 'خصائص الجسم',
  's8b-zone-material': 'خصائص المادة'
};

const S8B_TEXTS = {
  correct: {
    title: 'ممتاز!',
    body: 'الكتلة والحجم هما خاصيتان للجسم: الكتلة تصف كمية المادة في الجسم، والحجم يصف المكان الذي يشغله الجسم في الفراغ. لذلك، هما <b>مختلفتان</b> بين علبة صغيرة وعلبة كبيرة.\n\nاللون والليونة هما خاصيتان لمادة البلاستيك، ولذلك هما <b>متطابقتان</b> في العلبتين.'
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
    body: 'الكتلة والحجم هما خاصيتان للجسم: الكتلة تصف كمية المادة في الجسم، والحجم يصف المكان الذي يشغله الجسم في الفراغ. لذلك، هما <b>مختلفتان</b> بين علبة صغيرة وعلبة كبيرة.\n\nاللون والليونة هما خاصيتان لمادة البلاستيك، ولذلك هما <b>متطابقتان</b> في العلبتين.'
  },
  wrongFinal: {
    title: fbCorrectShown('الإجابة غير صحيحة.'),
    body: 'الكتلة والحجم هما خاصيتان للجسم: الكتلة تصف كمية المادة في الجسم، والحجم يصف المكان الذي يشغله الجسم في الفراغ. لذلك، هما <b>مختلفتان</b> بين علبة صغيرة وعلبة كبيرة.\n\nاللون والليونة هما خاصيتان لمادة البلاستيك، ولذلك هما <b>متطابقتان</b> في العلبتين.'
  }
};

let s8bDone = false;
let s8bAttempts = 0;
let s8bAnswerSnapshot = null;
let s8bShowingCorrect = false; // true = board currently shows the §9 reveal (correct answers)
let s8bLastWrong = null; // Retry gate (guide §8.8 rule 9): s8bSig() of the non-final wrong submission
/* The dealt bank order (shuffled once at load, see shuffleContainerChildren). Persisted by the
   resume layer (guide §8.9 "a shuffled board"): a restore re-appends the items in THIS order, never
   re-shuffles. Filled right after the shuffle at the bottom of the file. */
let s8bOrder = S8B_ITEM_IDS.slice();

/* Signature of the current board, compared against s8bLastWrong (rule 9: zone label per item). */
function s8bSig() {
  return S8B_ITEM_IDS.map(function (id) {
    const el = document.getElementById(id);
    const pid = el && el.parentElement ? el.parentElement.id : '';
    return id.replace(/^s8b-/, '') + '=' + (S8B_ZONE_LABELS[pid] || '—');
  }).join(' | ');
}

function s8bAllPlaced() {
  const bank = document.getElementById('s8b-source-bank');
  if (!bank) return false;
  return S8B_ITEM_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 's8b-source-bank';
  });
}

function s8bUpdateCheckBtn() {
  const btn = document.getElementById('s8b-check');
  if (btn && !s8bDone) btn.disabled = !s8bAllPlaced() || s8bSig() === s8bLastWrong; // Retry gate (rule 9)
}

function s8bClearZoneStates() {
  ['body', 'material'].forEach(function (z) {
    const zone = document.getElementById('s8b-zone-' + z);
    if (zone) zone.classList.remove('drag-over');
  });
  S8B_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('correct', 'wrong');
  });
}

/* תוקן (2026-08-04): "הונח, טרם נבדק" (.filled) — מצב שלישי נבדל בין
   "במגש" ל"נבדק", לפי SELF-QA.md קטגוריה 3. מחושב-מחדש מהמיקום בפועל
   בכל שינוי (גרירה/החזרה), לא מנוהל אינקרementally per-event. */
function s8bRefreshItemStates() {
  const bank = document.getElementById('s8b-source-bank');
  S8B_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    const inZone = el.parentElement && el.parentElement !== bank;
    el.classList.toggle('filled', !!inZone && !s8bDone);
  });
}

/* הנחת פריט באזור או החזרתו למאגר (zoneKey=null). משותף ל-onDrop/onTap של גרירת
   ה-Pointer (../unit-js/30-pointer-dnd.js, תוקן 2026-11-03 — MOE "גרירה לא עובדת בטאבלט");
   RevealCorrect/RestoreMine/applyResumeDom ממשיכים עם appendChild משלהם. */
function s8bPlaceItem(itemId, zoneKey) {
  if (s8bDone) return;
  const itemEl = document.getElementById(itemId);
  const dest = document.getElementById(zoneKey ? 's8b-zone-' + zoneKey : 's8b-source-bank');
  if (!itemEl || !dest) return;
  if (itemEl.parentElement !== dest) dest.appendChild(itemEl);
  s8bUpdateCheckBtn();
  s8bClearZoneStates();
  s8bRefreshItemStates();
}

/* גרירת Pointer Events (עכבר + מגע). המאזינים יושבים על הפריטים עצמם, ולכן שורדים
   appendChild (הטלה, חשיפה, resume, reset). הקשה קצרה על פריט מוצב = החזרה למאגר
   (ההתנהגות הישנה של s8bItemClick). */
const s8bDnd = createPointerDnd({
  canDrag: function () { return !s8bDone; },
  onPick: function () {                         /* הלחיצה הפכה לגרירה (מעבר ל-6px) */
    gestureHintHide('s8-drag');               /* נעלם ברגע שהלומד מתחיל לגרור */
    /* First-attempt retry feedback dismissal — 720-templates "Feedback popup system". */
    if (s8bAttempts > 0) document.getElementById('s8b-popup').classList.remove('visible');
  },
  onGhost: function (ghost) { ghost.classList.remove('correct', 'wrong', 'filled'); },
  onTap: function (dragId) {
    const el = document.getElementById(dragId);
    if (el && el.parentElement && el.parentElement.id !== 's8b-source-bank') s8bPlaceItem(dragId, null);
  },
  onDrop: function (dragId, targetId) { s8bPlaceItem(dragId, targetId === 'bank' ? null : targetId); }
  /* אין onCancel: ה-helper מסיר את הרוח ואת .dragging; הפריט נשאר היכן שהיה */
});
S8B_ITEM_IDS.forEach(function (id) { s8bDnd.attachSource(document.getElementById(id), id); });
s8bDnd.attachTarget(document.getElementById('s8b-zone-body'), 'body');
s8bDnd.attachTarget(document.getElementById('s8b-zone-material'), 'material');
s8bDnd.attachTarget(document.getElementById('s8b-source-bank'), 'bank');

function s8bShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s8b-popup');
  const data = S8B_TEXTS[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* resume (guide §8.4a): a repaint must not move a popup the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s8b-popup');
  box.classList.add('visible');
}

function s8bCheck() {
  if (s8bDone) return;
  if (!s8bAllPlaced()) return;
  s8bAttempts++;

  /* תוקן (2026-08-04): משוב per-card (לא per-zone) — לפי SELF-QA.md
     קטגוריה 3, אותו תיקון בדיוק כמו ddq13Check()/ddq26Check() בסיין 1. */
  let allCorrect = true;
  let s8bAnyCorrect = false;
  ['body', 'material'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('s8b-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.s8b-drag-item');
    items.forEach(function (item) {
      const ok = item.dataset.correct === zoneId;
      item.classList.remove('filled');
      item.classList.toggle('correct', ok);
      item.classList.toggle('wrong', !ok);
      if (!ok) allCorrect = false; else s8bAnyCorrect = true;
    });
  });

  /* xAPI: after the zone loop (allCorrect is final only there). Pair = item word → label of the zone
     the item sits in ('' if still in the bank). */
  xapiAnswered('007', 'q1', allCorrect, allCorrect || s8bAttempts >= 2,
    { pairs: S8B_ITEM_IDS.map(function (id) {
      const el = document.getElementById(id);
      const parentId = el && el.parentElement ? el.parentElement.id : '';
      return { source: xapiAnswerText(el ? el.querySelector('.s8b-item-word') : null),
               target: S8B_ZONE_LABELS[parentId] || '' };
    }) });

  const btn = document.getElementById('s8b-check');
  if (allCorrect) {
    s8bDone = true;
    s8bLastWrong = null;
    s8bShowFeedback('correct', true);
    btn.textContent = 'متابعة';
    btn.disabled = false;
    btn.onclick = s8bContinue;
    stationProgressSetB[2] = 'success';
    updateQuestionNavSetB('s8');
    try { flushResumeSave(); } catch (e) {}
  } else if (s8bAttempts < 2) {
    s8bLastWrong = s8bSig();
    s8bShowFeedback(s8bAnyCorrect ? 'wrong1Partial' : 'wrong1', false);
    btn.disabled = true;
    try { flushResumeSave(); } catch (e) {}
  } else {
    s8bDone = true;
    s8bLastWrong = null;
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה הנכונה
       (בלי מצב-ביניים), עם משוב מלא וכפתור טוגל "מעבר לתשובה שלי" ⇄
       "מעבר לתשובה הנכונה". ה-snapshot נלקח לפני שהחשיפה מזיזה פריטים. */
    s8bAnswerSnapshot = {};
    S8B_ITEM_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      s8bAnswerSnapshot[id] = el.parentElement ? el.parentElement.id : 's8b-source-bank';
    });
    s8bApplyCorrect();
    s8bShowingCorrect = true;
    s8bShowFeedback(s8bAnyCorrect ? 'wrongFinalPartial' : 'wrongFinal', false);
    btn.textContent = 'متابعة';
    btn.disabled = false;
    btn.onclick = s8bContinue;
    stationProgressSetB[2] = 'fail';
    updateQuestionNavSetB('s8');
    const revealBtn = document.getElementById('s8b-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
    try { flushResumeSave(); } catch (e) {}
  }
}

function s8bApplyCorrect() {
  S8B_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    const zone = document.getElementById('s8b-zone-' + el.dataset.correct);
    if (zone) zone.appendChild(el);
    el.classList.remove('wrong', 'filled');
    el.classList.add('correct');
  });
}

function s8bToggleReveal() {
  if (!s8bDone || !s8bAnswerSnapshot) return;
  const revealBtn = document.getElementById('s8b-reveal-btn');
  if (s8bShowingCorrect) {
    S8B_ITEM_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      const parent = document.getElementById(s8bAnswerSnapshot[id]);
      if (parent) parent.appendChild(el);
    });
    ['body', 'material'].forEach(function (zoneId) {
      const zoneEl = document.getElementById('s8b-zone-' + zoneId);
      zoneEl.querySelectorAll('.s8b-drag-item').forEach(function (item) {
        const ok = item.dataset.correct === zoneId;
        item.classList.remove('filled');
        item.classList.toggle('correct', ok);
        item.classList.toggle('wrong', !ok);
      });
    });
    s8bShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    s8bApplyCorrect();
    s8bShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function s8bContinue() {
  /* 2026-10-19: the platform routes — report completed and stop (guide §8.12). */
  partFinish(document.getElementById('s8b-check'));
}

function resetScreenState8() {
  updateQuestionNavSetB('s8');
  const btn = document.getElementById('s8b-check');
  if (s8bDone) {
    btn.textContent = 'متابعة';
    btn.disabled = false;
    btn.onclick = s8bContinue;
    const revealBtn = document.getElementById('s8b-reveal-btn');
    if (revealBtn) {
      if (s8bAnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = s8bShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return;
  }
  if (s8bAttempts > 0 || S8B_ITEM_IDS.some(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 's8b-source-bank';
  })) { s8bRefreshItemStates(); return; }

  s8bAttempts = 0;
  s8bAnswerSnapshot = null;
  s8bShowingCorrect = false;
  s8bLastWrong = null;
  {
    const revealBtn = document.getElementById('s8b-reveal-btn');
    if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  const bank = document.getElementById('s8b-source-bank');
  S8B_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el && el.parentElement !== bank) {
      el.parentElement.removeChild(el);
      bank.appendChild(el);
    }
  });
  s8bClearZoneStates();
  document.getElementById('s8b-popup').classList.remove('visible');
  btn.textContent = 'هل إجابتي صحيحة؟';
  btn.disabled = true;
  btn.onclick = s8bCheck;
  gestureHintShow('s8-drag', 'drag', document.getElementById(S8B_ITEM_IDS[0]), 'below');
}

scqFbMakeDraggable('s8b-popup');

/* תוקן (2026-08-05): ערבוב-מסיחים — s8b מעולם לא עורבב (פריטי DOM
   סטטיים בסדר-הצהרה קבוע). ראו scene1/script.js לפירוט המלא. */
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
shuffleContainerChildren('s8b-source-bank');
/* Remember the dealt order (resume: never re-shuffle a restored board, guide §8.9). */
s8bOrder = Array.prototype.map.call(document.querySelectorAll('#s8b-source-bank .s8b-drag-item'), function (el) { return el.id; });

/* אתחול */
scaleApp();
resetScreenState(0);
/* ניווט חוצה-סינים (בקשה מפורשת): הגעה דרך "חזרה" מסיין 3 (`?start=last`)
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
  2: ['002', 1],
  3: ['003', 1],
  4: ['004', 1],
  5: ['005', 1],
  6: ['006', 1],
  7: ['006', 2],
  8: ['007', 1]
};

var XAPI_COMP_SLUG = 'methodica-ar-science-body-matter-01-03';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1, '004': 1, '005': 1, '006': 1, '007': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-ar-science-body-matter-01-03.json';
var XAPI_END_BTN = 's8b-check';                               /* the part's last button (D-8, restoreEndedButton) */

/* תוצאת הרכיב ל-completed (§6.4 — המכנה הוא מה שהלומד הובטח). */
function xapiPartResult() {
  /* מסך s0 מבטיח 5 שאלות וסף של 4 מתוך 5 (stationProgress); סט ב' (2 שאלות) נכנס לציון אך לא לשער
     (§6.4 — המכנה רחב מקבוצת השער, מתועד כאן). */
  var okA = [1, 2, 3, 4, 5].filter(function (k) { return stationProgress[k] === 'success'; }).length;
  var okB = [1, 2].filter(function (k) { return stationProgressSetB[k] === 'success'; }).length;
  return { success: okA >= 4, score: { scaled: (okA + okB) / 7 } };
}

/* הלחיצה האחרונה של הסין: מדווח completed ועוצר. Kata מסירה את הרכיב ומנתבת (§6.5, §8.12).
   אין window.close, אין alert, אין ניווט — ההמשך לסין הבא חי רק תחת DEV_NAV (סיור מקומי). */
function partFinish(btn) {
  try { xapiEndComponent(xapiPartResult(), btn || document.getElementById(XAPI_END_BTN)); } catch (e) { console.error('[xAPI] partFinish', e); }
  try { flushResumeSave(); } catch (e) {}
  if (DEV_NAV) window.location.href = '../methodica-ar-science-body-matter-01-04/index.html' + window.location.search;
}


/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-10-19): currentScreen, XAPI_Q_RESULTS ומפות ההתקדמות.
   שלב ב' (2026-10-19): משתני התשובה של כל מסך (payload.screens.<prefix>) + ציירים לפי סוג
   אינטראקציה (§8.8 — כללים 1–12): paintMcq (s1, s2), paintScq (s3, s5 כרטיסי-תמונה, s7),
   paintDropdown (s4), paintDragZones (s8b). הציירים מציירים רק את כתיבות ה-DOM של ענפי
   ה-check, לא משנים מצב, אידמפוטנטיים, ולעולם לא זורקים (try/catch לכל צייר).
   שער ה-Retry (כלל 9) נשמר כ-`lw`; סימוני ניסיון-שגוי מצוירים רק כל עוד התשובה הנוכחית שווה
   להגשה (כלל 10). אין בסין הזה שערי התקדמות (וידאו/טיימר) — כל "המשך" חופשי. */

/* ── helpers ── */
function resumeSetToArr(set) { return set ? Array.from(set) : []; }
function resumeArrToSet(arr) { return new Set(Array.isArray(arr) ? arr : []); }
function resumeMcqSig(set) { return set && set.size ? Array.from(set).sort().join('|') : null; }
function resumeSetReveal(prefix, show, showingCorrect) {
  const revealBtn = document.getElementById(prefix + '-reveal-btn');
  if (!revealBtn) return;
  revealBtn.hidden = !show;
  /* hidden → the live default label (what resetScreenState leaves), shown → the toggle's label */
  revealBtn.textContent = (show && !showingCorrect) ? 'الانتقال إلى الإجابة الصحيحة' : 'الانتقال إلى إجابتي';
}

/* ── painter: multi choice (s1, s2) — mirrors sNToggle / sNCheck / sNToggleReveal ── */
function paintMcq(cfg) {
  try {
    const sel = cfg.selected(), done = cfg.done(), attempts = cfg.attempts(), phase = cfg.phase();
    const lw = cfg.lastWrong();
    const correctSet = cfg.S.correctSet;
    const checkBtn = document.getElementById(cfg.prefix + '-check');
    const popup = document.getElementById(cfg.prefix + '-popup');
    const opts = document.querySelectorAll('#' + cfg.prefix + ' .scq-opt');
    if (!done && !attempts && sel.size === 0) return;   // clean: nothing picked (rule 4)
    const isPartial = Array.from(sel).some(function (id) { return correctSet.has(id); });
    if (!done) {
      cfg.unlock();
      const same = !!(attempts > 0 && lw && cfg.setsEqual(sel, lw));   // rule 10
      opts.forEach(function (el) {
        const id = el.dataset.id;
        el.classList.remove('selected', 'correct', 'wrong');
        if (sel.has(id)) el.classList.add(same ? (correctSet.has(id) ? 'correct' : 'wrong') : 'selected');
        el.setAttribute('aria-checked', sel.has(id) ? 'true' : 'false');
      });
      if (same) cfg.showFeedback(isPartial ? 'wrong1Partial' : 'wrong1Full', false);
      else popup.classList.remove('visible');
      checkBtn.textContent = 'هل إجابتي صحيحة؟';
      checkBtn.disabled = sel.size === 0 || same;   // the live predicate (rule 2) + Retry gate (rule 9)
      checkBtn.onclick = cfg.check;
      if (cfg.hintAfterWrong) { const h = document.getElementById(cfg.prefix + '-hint'); if (h) h.hidden = !(attempts > 0); }
      resumeSetReveal(cfg.prefix, false, false);
      return;
    }
    cfg.lock();
    const snap = cfg.snapshot(), showing = cfg.showingCorrect();
    const finalWrong = phase === 'wrong-final' && !!snap;
    opts.forEach(function (el) {
      const id = el.dataset.id;
      el.classList.remove('selected', 'correct', 'wrong');
      if (!finalWrong) { if (sel.has(id)) el.classList.add(correctSet.has(id) ? 'correct' : 'wrong'); }
      else if (showing) { if (correctSet.has(id)) el.classList.add('correct'); }
      else if (snap[id]) el.classList.add(snap[id]);
      el.setAttribute('aria-checked', sel.has(id) ? 'true' : 'false');
    });
    if (phase === 'correct') cfg.showFeedback('correct', true);
    else cfg.showFeedback(isPartial ? 'wrong2Partial' : 'wrong2Full', false);
    cfg.setBarDone('متابعة', cfg.cont);
    resumeSetReveal(cfg.prefix, finalWrong, showing);
  } catch (e) { console.error('[resume] paint ' + cfg.prefix, e); }
}

/* ── painter: single choice (s3, s7) and image cards (s5) — mirrors sNSelect / sNCheck ── */
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

/* ── painter: custom dropdowns (s4) — mirrors s4Select / s4Check / s4ToggleReveal ── */
function paintDropdown(cfg) {
  try {
    const ans = cfg.answers(), done = cfg.done(), attempts = cfg.attempts(), lw = cfg.lastWrong();
    const filled = cfg.blanks.every(function (n) { return !!ans[n]; });
    if (!done && !attempts && !cfg.blanks.some(function (n) { return !!ans[n]; })) return;   // clean
    const btn = document.getElementById(cfg.prefix + '-check');
    const popup = document.getElementById(cfg.prefix + '-popup');
    const setBlank = function (n, label, state) {   // state: null (unmarked) | true | false
      const blank = cfg.blankEl(n);
      if (!blank) return;
      blank.classList.remove('open', 'correct', 'incorrect');
      blank.querySelector('.dpq-trigger-text').textContent = label || '';
      const icon = blank.querySelector('.dpq-trigger-icon');
      if (state === null) { blank.classList.remove('disabled'); icon.src = '../unit-assets/img/icon-dropdown-chevron.svg'; return; }
      blank.classList.add(state ? 'correct' : 'incorrect');
      blank.classList.toggle('disabled', state);   // §5.3: a correct blank stays locked
      icon.src = state ? '../unit-assets/img/icon-dropdown-correct.svg' : '../unit-assets/img/icon-dropdown-incorrect.svg';
    };
    const partialOf = function (a) { return cfg.blanks.some(function (n) { return a[n] === cfg.correct[n]; }); };
    if (!done) {
      const submitted = {};
      if (lw) lw.split('|').forEach(function (p) { const i = p.indexOf('='); if (i > 0) submitted[p.slice(0, i)] = p.slice(i + 1); });
      cfg.blanks.forEach(function (n) {
        const v = ans[n] || null;
        const keep = attempts > 0 && !!lw && submitted[String(n)] === (v || '');   // rule 10: mark only the submitted value
        setBlank(n, v, keep && v ? (v === cfg.correct[n]) : null);
      });
      const same = attempts > 0 && !!lw && cfg.sig() === lw;
      if (same) cfg.showFeedback(partialOf(ans) ? 'wrong1Partial' : 'wrong1Full', false);
      else popup.classList.remove('visible');
      btn.textContent = 'هل إجابتي صحيحة؟';
      btn.onclick = cfg.check;
      btn.disabled = !filled || same;   // the live predicate (s4UpdateCheckBtn) incl. the Retry gate
      resumeSetReveal(cfg.prefix, false, false);
      return;
    }
    const snap = cfg.snapshot(), showing = cfg.showingCorrect();
    if (!snap) {
      cfg.blanks.forEach(function (n) { setBlank(n, ans[n], ans[n] ? true : null); });
      cfg.showFeedback('correct', true);
    } else if (showing) {
      cfg.applyCorrect();   // DOM only: the solution's labels + green marks
      cfg.showFeedback(partialOf(snap) ? 'wrong2Partial' : 'wrong2', false);
    } else {
      cfg.blanks.forEach(function (n) { setBlank(n, snap[n], snap[n] === cfg.correct[n]); });
      cfg.showFeedback(partialOf(snap) ? 'wrong2Partial' : 'wrong2', false);
    }
    cfg.lockBlanks();
    cfg.setBarDone('متابعة', cfg.cont);
    resumeSetReveal(cfg.prefix, !!snap, showing);
  } catch (e) { console.error('[resume] paint ' + cfg.prefix, e); }
}

/* ── painter: drag-to-zone (s8b; DOM parentage is the model) — mirrors s8bDrop / s8bCheck / s8bToggleReveal ── */
function paintDragZones(cfg) {
  try {
    const done = cfg.done(), attempts = cfg.attempts(), lw = cfg.lastWrong();
    const bank = document.getElementById(cfg.bankId);
    const btn = document.getElementById(cfg.prefix + '-check');
    const popup = document.getElementById(cfg.prefix + '-popup');
    const inZone = function (id) { const el = document.getElementById(id); return !!(el && el.parentElement && el.parentElement !== bank); };
    if (!done && !attempts && !cfg.itemIds.some(inZone)) return;   // clean: nothing placed (rules 4/5)
    const markZones = function () {
      cfg.zones.forEach(function (z) {
        const zoneEl = document.getElementById(cfg.prefix + '-zone-' + z);
        if (!zoneEl) return;
        zoneEl.querySelectorAll(cfg.itemSel).forEach(function (item) {
          const ok = item.dataset.correct === z;
          item.classList.remove('filled');
          item.classList.toggle('correct', ok);
          item.classList.toggle('wrong', !ok);
        });
      });
    };
    const anyCorrectNow = function () {
      return cfg.itemIds.some(function (id) { const el = document.getElementById(id); return !!(el && el.parentElement && el.parentElement.id === cfg.prefix + '-zone-' + el.dataset.correct); });
    };
    if (!done) {
      cfg.clearZoneStates();
      cfg.refreshItemStates();
      const same = attempts > 0 && !!lw && cfg.sig() === lw;   // rule 10
      if (same) { markZones(); cfg.showFeedback(anyCorrectNow() ? 'wrong1Partial' : 'wrong1', false); }
      else popup.classList.remove('visible');
      btn.textContent = 'هل إجابتي صحيحة؟';
      btn.onclick = cfg.check;
      btn.disabled = !cfg.allPlaced() || same;   // the live predicate (s8bUpdateCheckBtn) incl. the Retry gate
      resumeSetReveal(cfg.prefix, false, false);
      return;
    }
    const snap = cfg.snapshot(), showing = cfg.showingCorrect();
    if (snap && showing) cfg.applyCorrect();
    else {
      if (snap) cfg.itemIds.forEach(function (id) {
        const el = document.getElementById(id), parent = document.getElementById(snap[id]);
        if (el && parent && el.parentElement !== parent) parent.appendChild(el);
      });
      markZones();
    }
    cfg.refreshItemStates();
    const partial = snap ? cfg.itemIds.some(function (id) { const el = document.getElementById(id); return !!el && snap[id] === cfg.prefix + '-zone-' + el.dataset.correct; }) : false;
    cfg.showFeedback(!snap ? 'correct' : (partial ? 'wrongFinalPartial' : 'wrongFinal'), !snap);
    btn.textContent = 'متابعة';
    btn.disabled = false;
    btn.onclick = cfg.cont;
    resumeSetReveal(cfg.prefix, !!snap, showing);
  } catch (e) { console.error('[resume] paint ' + cfg.prefix, e); }
}

/* ── per-screen configs (rule 7: the painter takes its config as a parameter) ── */
function resumeCfgS1() {
  return { prefix: 's1', S: S1, selected: function () { return s1Selected; }, attempts: function () { return s1Attempts; },
    done: function () { return s1Done; }, phase: function () { return s1Phase; }, lastWrong: function () { return s1Attempt1Submission; },
    snapshot: function () { return s1AnswerSnapshot; }, showingCorrect: function () { return s1ShowingCorrect; }, setsEqual: s1SetsEqual,
    lock: s1LockOptions, unlock: s1UnlockOptions, showFeedback: s1ShowFeedback, setBarDone: s1SetBarDone, check: s1Check, cont: s1Continue, hintAfterWrong: true };
}
function resumeCfgS2() {
  return { prefix: 's2', S: S2, selected: function () { return s2Selected; }, attempts: function () { return s2Attempts; },
    done: function () { return s2Done; }, phase: function () { return s2Phase; }, lastWrong: function () { return s2Attempt1Submission; },
    snapshot: function () { return s2AnswerSnapshot; }, showingCorrect: function () { return s2ShowingCorrect; }, setsEqual: s2SetsEqual,
    lock: s2LockOptions, unlock: s2UnlockOptions, showFeedback: s2ShowFeedback, setBarDone: s2SetBarDone, check: s2Check, cont: s2Continue, hintAfterWrong: false };
}
function resumeCfgS3() {
  return { prefix: 's3', S: S3, optSel: '.scq-opt', optEl: s3OptEl, selected: function () { return s3Selected; }, attempts: function () { return s3Attempts; },
    done: function () { return s3Done; }, phase: function () { return s3Phase; }, lastWrong: function () { return s3LastWrong; },
    lock: s3LockOptions, unlock: s3UnlockOptions, showFeedback: s3ShowFeedback, setBarDone: s3SetBarDone, check: s3Check, cont: s3Continue, hintAfterWrong: false };
}
function resumeCfgS4() {
  return { prefix: 's4', blanks: [1, 2], correct: S4_CORRECT, blankEl: s4BlankEl, answers: function () { return s4Answers; }, attempts: function () { return s4Attempts; },
    done: function () { return s4Done; }, lastWrong: function () { return s4LastWrong; }, sig: s4Sig,
    snapshot: function () { return s4AnswerSnapshot; }, showingCorrect: function () { return s4ShowingCorrect; },
    applyCorrect: s4ApplyCorrect, lockBlanks: s4LockBlanks, showFeedback: s4ShowFeedback, setBarDone: s4SetBarDone, check: s4Check, cont: s4Continue };
}
function resumeCfgS5() {
  return { prefix: 's5', S: S5, optSel: '.s5-card', optEl: s5CardEl, selected: function () { return s5Selected; }, attempts: function () { return s5Attempts; },
    done: function () { return s5Done; }, phase: function () { return s5Phase; }, lastWrong: function () { return s5LastWrong; },
    lock: s5LockCards, unlock: s5UnlockCards, showFeedback: s5ShowFeedback, setBarDone: s5SetBarDone, check: s5Check, cont: s5Continue, hintAfterWrong: false };
}
function resumeCfgS7() {
  return { prefix: 's7', S: S7, optSel: '.scq-opt', optEl: s7OptEl, selected: function () { return s7Selected; }, attempts: function () { return s7Attempts; },
    done: function () { return s7Done; }, phase: function () { return s7Phase; }, lastWrong: function () { return s7LastWrong; },
    lock: s7LockOptions, unlock: s7UnlockOptions, showFeedback: s7ShowFeedback, setBarDone: s7SetBarDone, check: s7Check, cont: s7Continue, hintAfterWrong: false };
}
function resumeCfgS8b() {
  return { prefix: 's8b', bankId: 's8b-source-bank', itemIds: S8B_ITEM_IDS, itemSel: '.s8b-drag-item', zones: ['body', 'material'],
    attempts: function () { return s8bAttempts; }, done: function () { return s8bDone; }, lastWrong: function () { return s8bLastWrong; }, sig: s8bSig,
    snapshot: function () { return s8bAnswerSnapshot; }, showingCorrect: function () { return s8bShowingCorrect; },
    clearZoneStates: s8bClearZoneStates, refreshItemStates: s8bRefreshItemStates, allPlaced: s8bAllPlaced, applyCorrect: s8bApplyCorrect,
    showFeedback: s8bShowFeedback, check: s8bCheck, cont: s8bContinue };
}

/* ── the four hooks ── */
function capturePartPayload() {
  const s8bPos = {};
  S8B_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    s8bPos[id] = (el && el.parentElement && el.parentElement.id) || 's8b-source-bank';
  });
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    stationProgress: Object.assign({}, stationProgress),
    stationProgressSetB: Object.assign({}, stationProgressSetB),
    screens: {
      s1:  { sel: resumeSetToArr(s1Selected), att: s1Attempts, done: s1Done, phase: s1Phase, snap: s1AnswerSnapshot, sc: s1ShowingCorrect, lw: resumeMcqSig(s1Attempt1Submission) },
      s2:  { sel: resumeSetToArr(s2Selected), att: s2Attempts, done: s2Done, phase: s2Phase, snap: s2AnswerSnapshot, sc: s2ShowingCorrect, lw: resumeMcqSig(s2Attempt1Submission) },
      s3:  { sel: s3Selected, att: s3Attempts, done: s3Done, phase: s3Phase, lw: s3LastWrong },
      s4:  { ans: Object.assign({}, s4Answers), att: s4Attempts, done: s4Done, snap: s4AnswerSnapshot, sc: s4ShowingCorrect, lw: s4LastWrong },
      s5:  { sel: s5Selected, att: s5Attempts, done: s5Done, phase: s5Phase, lw: s5LastWrong },
      s7:  { sel: s7Selected, att: s7Attempts, done: s7Done, phase: s7Phase, lw: s7LastWrong },
      s8b: { pos: s8bPos, order: s8bOrder.slice(), att: s8bAttempts, done: s8bDone, snap: s8bAnswerSnapshot, sc: s8bShowingCorrect, lw: s8bLastWrong }
    }
  };
}

function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults) Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  if (st.stationProgress) Object.keys(st.stationProgress).forEach(function (k) { stationProgress[k] = st.stationProgress[k]; });
  if (st.stationProgressSetB) Object.keys(st.stationProgressSetB).forEach(function (k) { stationProgressSetB[k] = st.stationProgressSetB[k]; });
  const sc = st.screens;
  if (!sc || typeof sc !== 'object') return;   // stage-A document: nothing more to restore
  let q;
  if ((q = sc.s1)) {
    s1Selected = resumeArrToSet(q.sel); s1Attempts = q.att || 0; s1Done = !!q.done; s1Phase = q.phase || 'before';
    s1AnswerSnapshot = q.snap || null; s1ShowingCorrect = !!q.sc; s1Attempt1Submission = q.lw ? new Set(String(q.lw).split('|')) : null;
  }
  if ((q = sc.s2)) {
    s2Selected = resumeArrToSet(q.sel); s2Attempts = q.att || 0; s2Done = !!q.done; s2Phase = q.phase || 'before';
    s2AnswerSnapshot = q.snap || null; s2ShowingCorrect = !!q.sc; s2Attempt1Submission = q.lw ? new Set(String(q.lw).split('|')) : null;
  }
  if ((q = sc.s3)) { s3Selected = q.sel || null; s3Attempts = q.att || 0; s3Done = !!q.done; s3Phase = q.phase || 'before'; s3LastWrong = q.lw || null; }
  if ((q = sc.s4)) {
    s4Answers = { 1: (q.ans && q.ans[1]) || null, 2: (q.ans && q.ans[2]) || null };
    s4Attempts = q.att || 0; s4Done = !!q.done; s4AnswerSnapshot = q.snap || null; s4ShowingCorrect = !!q.sc; s4LastWrong = q.lw || null;
  }
  if ((q = sc.s5)) { s5Selected = q.sel || null; s5Attempts = q.att || 0; s5Done = !!q.done; s5Phase = q.phase || 'before'; s5LastWrong = q.lw || null; }
  if ((q = sc.s7)) { s7Selected = q.sel || null; s7Attempts = q.att || 0; s7Done = !!q.done; s7Phase = q.phase || 'before'; s7LastWrong = q.lw || null; }
  if ((q = sc.s8b)) {
    s8bAttempts = q.att || 0; s8bDone = !!q.done; s8bAnswerSnapshot = q.snap || null; s8bShowingCorrect = !!q.sc; s8bLastWrong = q.lw || null;
    if (Array.isArray(q.order) && q.order.length === S8B_ITEM_IDS.length &&
        S8B_ITEM_IDS.every(function (id) { return q.order.indexOf(id) >= 0; })) s8bOrder = q.order.slice();
  }
}

/* What lives only in the DOM: the s4 dropdown labels (§8.9 "the dropdown one") and the s8b board —
   items re-appended into their saved zone, in the dealt order (never re-shuffled). */
function applyResumeDom(st) {
  if (!st || !st.screens || typeof st.screens !== 'object') return;
  const sc = st.screens;
  if (sc.s4 && sc.s4.ans) {
    [1, 2].forEach(function (n) {
      const blank = s4BlankEl(n);
      const t = blank && blank.querySelector('.dpq-trigger-text');
      if (t && typeof sc.s4.ans[n] === 'string') t.textContent = sc.s4.ans[n];
    });
  }
  if (sc.s8b && sc.s8b.pos) {
    const bank = document.getElementById('s8b-source-bank');
    s8bOrder.forEach(function (id) {
      const el = document.getElementById(id);
      const parent = document.getElementById(sc.s8b.pos[id]) || bank;
      if (el && parent) parent.appendChild(el);   // appendChild moves the node; order follows s8bOrder
    });
  }
}

/* One branch per interactive screen (rule 11). Screens 0 and 6 are avatar transitions with no state. */
function restoreScreenUI(n) {
  try {
    if (n === 1) paintMcq(resumeCfgS1());
    else if (n === 2) paintMcq(resumeCfgS2());
    else if (n === 3) paintScq(resumeCfgS3());
    else if (n === 4) paintDropdown(resumeCfgS4());
    else if (n === 5) paintScq(resumeCfgS5());
    else if (n === 7) paintScq(resumeCfgS7());
    else if (n === 8) paintDragZones(resumeCfgS8b());
  } catch (e) { console.error('[resume] restoreScreenUI ' + n, e); }
}
