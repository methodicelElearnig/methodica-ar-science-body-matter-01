'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 9; // יעודכן עם כל מסך תוכן שנוסף
let currentScreen = 0;

/* Companion character system (720-templates skill: _global-components.md).
   מפתח localStorage מתויג ("namespaced") לפי הלומדה הזו בלבד, כדי שלא
   יתאפשר שיתוף/דריסה עם לומדה אחרת שנטענת מאותו origin — מוסכמה מומלצת
   שטרם מומשה בפרויקטים קודמים (mass-measure-02/03 השתמשו במפתח גנרי
   משותף 'lomda_selectedCharacter'), מיושמת כאן מההתחלה. */
const CHARACTER_STORAGE_KEY = 'body-matter-01_selectedCharacter';

let savedCharacter = null;
try {
  savedCharacter = localStorage.getItem(CHARACTER_STORAGE_KEY);
} catch (e) { /* localStorage חסום (opaque origin/פרטיות) — נמשיך בלי שמירה */ }
window.lomdaState = {
  selectedCharacter: savedCharacter || null
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
  /* כל מסך תוכן נוסף יקבל כאן ענף resetScreenStateN() משלו */
}

/* מסך 1 — דמות בווידאו אמיתי "מרימה משקולות קלות" (green-avatar-
   lifting-light-weights.mp4/Turquoise-avatar-lifting-light-eights.mp4,
   סופקו בפועל), אותו חוזה resolveCharBubbleVideo כמו בשאר הפרויקט. */
const S0_AVATAR_ASSETS = {
  'character-1': 'assets/videos/green-avatar-lifting-light-weights.mp4',
  'character-2': 'assets/videos/Turquoise-avatar-lifting-light-eights.mp4'
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
   מ-methodica-science-body-matter-01-01/script.js. */
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
    '<img class="gesture-hint-ring-big" src="assets/images/gesture-ring-big' + suffix + '.svg" alt="">' +
    '<img class="gesture-hint-ring-small" src="assets/images/gesture-ring-small' + suffix + '.svg" alt="">' +
    '<img class="gesture-hint-hand" src="assets/images/gesture-hand.svg" alt="">';
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
  scqFbResetPosition('s1-popup');
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

  if (s1SetsEqual(s1Selected, S1.correctSet)) {
    s1Selected.forEach(function (id) {
      s1OptEl(id).classList.add('correct');
      s1OptEl(id).classList.remove('selected');
    });
    s1Phase = 'correct';
    s1Done = true;
    s1LockOptions();
    s1ShowFeedback('correct', true);
    s1SetBarDone('متابعة', s1Continue);
    stationProgress[1] = 'success';
    updateQuestionNav('s1');
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
    s1LockOptions();
    s1ShowFeedback(isPartial ? 'wrong2Partial' : 'wrong2Full', false);
    s1SetBarDone('متابعة', s1Continue);
    const revealBtn = document.getElementById('s1-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
    stationProgress[1] = 'fail';
    updateQuestionNav('s1');
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
  scqFbResetPosition('s2-popup');
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

  if (s2SetsEqual(s2Selected, S2.correctSet)) {
    s2Selected.forEach(function (id) {
      s2OptEl(id).classList.add('correct');
      s2OptEl(id).classList.remove('selected');
    });
    s2Phase = 'correct';
    s2Done = true;
    s2LockOptions();
    s2ShowFeedback('correct', true);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[2] = 'success';
    updateQuestionNav('s2');
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
    s2LockOptions();
    s2ShowFeedback(isPartial ? 'wrong2Partial' : 'wrong2Full', false);
    s2SetBarDone('متابعة', s2Continue);
    const revealBtn = document.getElementById('s2-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
    stationProgress[2] = 'fail';
    updateQuestionNav('s2');
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
  checkBtn.disabled = false;
  checkBtn.onclick = s3Check;
}

function s3ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s3-popup');
  const data = S3.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s3-popup');
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
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s3Attempts < S3.maxAttempts) {
    s3Phase = 'wrong1';
    s3ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s3-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s3Check;
  } else {
    s3OptEl(S3.correctId).classList.add('correct');
    s3Phase = 'wrong-final';
    s3Done = true;
    s3LockOptions();
    s3ShowFeedback('wrong2', false);
    s3SetBarDone('متابعة', s3Continue);
    stationProgress[3] = 'fail';
    updateQuestionNav('s3');
  }
}

function resetScreenState3() {
  updateQuestionNav('s3');
  if (s3Done || s3Attempts > 0 || s3Selected) return; // resume-state guard
  s3Selected = null;
  s3Attempts = 0;
  s3Phase = 'before';
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

function s4BlankEl(n) {
  return document.getElementById('s4-blank-' + n);
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
  blank.querySelector('.dpq-trigger-text').textContent = value;
  document.getElementById('s4-popup').classList.remove('visible');
  s4UpdateCheckBtn();
}

function s4UpdateCheckBtn() {
  const btn = document.getElementById('s4-check');
  if (btn && !s4Done) btn.disabled = !(s4Answers[1] && s4Answers[2]);
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
  scqFbResetPosition('s4-popup');
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
      ? 'assets/images/icon-dropdown-correct.svg'
      : 'assets/images/icon-dropdown-incorrect.svg';
    if (!ok) allCorrect = false;
  });

  if (allCorrect) {
    s4Done = true;
    s4LockBlanks();
    s4ShowFeedback('correct', true);
    s4SetBarDone('متابعة', s4Continue);
    stationProgress[4] = 'success';
    updateQuestionNav('s4');
    return;
  }

  const s4IsPartial = [1, 2].some(function (n) { return s4Answers[n] === S4_CORRECT[n]; });

  if (s4Attempts < 2) {
    s4ShowFeedback(s4IsPartial ? 'wrong1Partial' : 'wrong1Full', false);
    document.getElementById('s4-check').disabled = true;
  } else {
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה הנכונה
       (בלי מצב-ביניים), עם משוב מלא וכפתור טוגל "מעבר לתשובה שלי" ⇄
       "מעבר לתשובה הנכונה". ה-snapshot נלקח לפני שהחשיפה דורסת את הבחירה. */
    s4AnswerSnapshot = { 1: s4Answers[1], 2: s4Answers[2] };
    s4Done = true;
    s4LockBlanks();
    s4ApplyCorrect();
    s4ShowingCorrect = true;
    s4ShowFeedback(s4IsPartial ? 'wrong2Partial' : 'wrong2', false);
    s4SetBarDone('متابعة', s4Continue);
    stationProgress[4] = 'fail';
    updateQuestionNav('s4');
    const revealBtn = document.getElementById('s4-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
}

function s4ApplyCorrect() {
  [1, 2].forEach(function (n) {
    const blank = s4BlankEl(n);
    blank.querySelector('.dpq-trigger-text').textContent = S4_CORRECT[n];
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add('correct');
    blank.querySelector('.dpq-trigger-icon').src = 'assets/images/icon-dropdown-correct.svg';
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
        ? 'assets/images/icon-dropdown-correct.svg'
        : 'assets/images/icon-dropdown-incorrect.svg';
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
  [1, 2].forEach(function (n) {
    const blank = s4BlankEl(n);
    blank.classList.remove('open', 'correct', 'incorrect', 'disabled');
    blank.querySelector('.dpq-trigger-text').textContent = '';
    blank.querySelector('.dpq-trigger-icon').src = 'assets/images/icon-dropdown-chevron.svg';
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
      body: 'البلاستيك ينتج في عملية صناعية، ولذلك هو مادة مُعالَجة.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'البلاستيك ينتج في عملية صناعية، ولذلك هو مادة مُعالَجة.'
    }
  }
};

let s5Selected = null;
let s5Attempts = 0;
let s5Done = false;
let s5Phase = 'before';

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
  checkBtn.disabled = false;
  checkBtn.onclick = s5Check;
}

function s5ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s5-popup');
  const data = S5.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s5-popup');
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
    return;
  }

  cardEl.classList.add('wrong');
  cardEl.classList.remove('selected');

  if (s5Attempts < S5.maxAttempts) {
    s5Phase = 'wrong1';
    s5ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s5-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s5Check;
  } else {
    s5CardEl(S5.correctId).classList.add('correct');
    s5Phase = 'wrong-final';
    s5Done = true;
    s5LockCards();
    s5ShowFeedback('wrong2', false);
    s5SetBarDone('متابعة', s5Continue);
    stationProgress[5] = 'fail';
    updateQuestionNav('s5');
  }
}

function s5OpenHint() {
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
   Turquoise-avatar-ok-finger.mp4, סופקו בפועל), אותו חוזה
   resolveCharBubbleVideo. */
const S6_AVATAR_ASSETS = {
  'character-1': 'assets/videos/green-avatar-ok-finger.mp4',
  'character-2': 'assets/videos/Turquoise-avatar-ok-finger.mp4'
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
      body: 'الشكل المستدير أو الأملس لا يكفي وحده لتحديد ما إذا كان الجسم مُعالَجًا، لأن العمليات الطبيعية يمكن أن تصقل الأجسام وتدوّرها أيضًا.\nلتحديد ما إذا كان الجسم قد خضع للمعالجة، يجب البحث عن <b>أدلة إضافية</b> مثل علامات القطع، الصقل، النقش، الوصل بين الأجزاء، أو شكل يبدو مكيّفًا لاستخدام معيّن.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'الشكل المستدير أو الأملس لا يكفي وحده لتحديد ما إذا كان الجسم مُعالَجًا، لأن العمليات الطبيعية يمكن أن تصقل الأجسام وتدوّرها أيضًا.\nلتحديد ما إذا كان الجسم قد خضع للمعالجة، يجب البحث عن <b>أدلة إضافية</b> مثل علامات القطع، الصقل، النقش، الوصل بين الأجزاء، أو شكل يبدو مكيّفًا لاستخدام معيّن.'
    }
  }
};

let s7Selected = null;
let s7Attempts = 0;
let s7Done = false;
let s7Phase = 'before';

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
  checkBtn.disabled = false;
  checkBtn.onclick = s7Check;
}

function s7ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s7-popup');
  const data = S7.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s7-popup');
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
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s7Attempts < S7.maxAttempts) {
    s7Phase = 'wrong1';
    s7ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s7-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s7Check;
  } else {
    s7OptEl(S7.correctId).classList.add('correct');
    s7Phase = 'wrong-final';
    s7Done = true;
    s7LockOptions();
    s7ShowFeedback('wrong2', false);
    s7SetBarDone('متابعة', s7Continue);
    stationProgressSetB[1] = 'fail';
    updateQuestionNavSetB('s7');
  }
}

function resetScreenState7() {
  updateQuestionNavSetB('s7');
  if (s7Done || s7Attempts > 0 || s7Selected) return; // resume-state guard
  s7Selected = null;
  s7Attempts = 0;
  s7Phase = 'before';
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
let s8bDragId = null;
let s8bAnswerSnapshot = null;
let s8bShowingCorrect = false; // true = board currently shows the §9 reveal (correct answers)

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
  if (btn && !s8bDone) btn.disabled = !s8bAllPlaced();
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

function s8bDragStart(event, itemId) {
  if (s8bDone) { event.preventDefault(); return; }
  gestureHintHide('s8-drag'); /* נעלם ברגע שהלומד מתחיל לגרור */
  /* תוקן (2026-08-05): First-attempt retry feedback dismissal —
     720-templates skill (_global-components.md → "Feedback popup
     system"). התחלת גרירה חדשה מסלקת את משוב-הניסיון-הלא-אחרון. */
  if (s8bAttempts > 0) document.getElementById('s8b-popup').classList.remove('visible');
  s8bDragId = itemId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', itemId);
  setTimeout(function () {
    const el = document.getElementById(itemId);
    if (el) el.classList.add('is-dragging');
  }, 0);
}

function s8bDragEnd(itemId) {
  const el = document.getElementById(itemId);
  if (el) el.classList.remove('is-dragging');
  s8bDragId = null;
}

function s8bDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function s8bDragEnter(event, zoneId) {
  event.preventDefault();
  const zone = document.getElementById(zoneId);
  if (zone) zone.classList.add('drag-over');
}

function s8bDragLeave(event, zoneId) {
  const zone = document.getElementById(zoneId);
  if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('drag-over');
}

function s8bDrop(event, targetZone) {
  event.preventDefault();
  if (s8bDone) return;
  const itemId = event.dataTransfer.getData('text/plain') || s8bDragId;
  if (!itemId) return;
  const zoneEl = document.getElementById('s8b-zone-' + targetZone);
  const itemEl = document.getElementById(itemId);
  if (zoneEl && itemEl) {
    zoneEl.classList.remove('drag-over');
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    zoneEl.appendChild(itemEl);
  }
  s8bUpdateCheckBtn();
  s8bClearZoneStates();
  s8bRefreshItemStates();
}

function s8bDropToSource(event) {
  event.preventDefault();
  if (s8bDone) return;
  const itemId = event.dataTransfer.getData('text/plain') || s8bDragId;
  if (!itemId) return;
  const bank = document.getElementById('s8b-source-bank');
  const itemEl = document.getElementById(itemId);
  if (itemEl && bank && itemEl.parentElement !== bank) {
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    bank.appendChild(itemEl);
  }
  s8bUpdateCheckBtn();
  s8bClearZoneStates();
  s8bRefreshItemStates();
}

function s8bItemClick(itemId) {
  if (s8bDone) return;
  const el = document.getElementById(itemId);
  const bank = document.getElementById('s8b-source-bank');
  if (!el || !bank || el.parentElement === bank) return;
  el.parentElement.removeChild(el);
  bank.appendChild(el);
  s8bClearZoneStates();
  s8bUpdateCheckBtn();
  s8bRefreshItemStates();
}

function s8bShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s8b-popup');
  const data = S8B_TEXTS[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s8b-popup');
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

  const btn = document.getElementById('s8b-check');
  if (allCorrect) {
    s8bDone = true;
    s8bShowFeedback('correct', true);
    btn.textContent = 'متابعة';
    btn.disabled = false;
    btn.onclick = s8bContinue;
    stationProgressSetB[2] = 'success';
    updateQuestionNavSetB('s8');
  } else if (s8bAttempts < 2) {
    s8bShowFeedback(s8bAnyCorrect ? 'wrong1Partial' : 'wrong1', false);
    btn.disabled = true;
  } else {
    s8bDone = true;
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
  window.location.href = '../methodica-science-body-matter-01-04/index.html';
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
  s8bDragId = null;
  s8bAnswerSnapshot = null;
  s8bShowingCorrect = false;
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

/* אתחול */
scaleApp();
resetScreenState(0);
/* ניווט חוצה-סינים (בקשה מפורשת): הגעה דרך "חזרה" מסיין 3 (`?start=last`)
   נכנסת ישירות למסך האחרון כאן, לא למסך הראשון. */
if (new URLSearchParams(window.location.search).get('start') === 'last') {
  goTo(TOTAL_SCREENS - 1);
}
