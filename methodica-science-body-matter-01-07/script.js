'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 5; // תוקן (2026-09-28): 6→5, הוסר מסך-הסגירה האחרון (s5) — הסיין (והיחידה) מסתיימים ישירות אחרי מסך 5
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
    4: { done: s4Done, popup: 's4-popup' }
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
  /* כל מסך תוכן נוסף יקבל כאן ענף resetScreenStateN() משלו */
}

/* מסך 1 — דמות בווידאו אמיתי "מטפסת על הר, לקראת הפסגה" (green-avatar-
   climbing-mountain.mp4/Turquoise-avatar-climbing-mountain.mp4, סופקו
   בפועל — אותו נכס בדיוק כמו מסך 1 בסיין 5), אותו חוזה
   resolveCharBubbleVideo כמו בשאר הפרויקט. */
const S0_AVATAR_ASSETS = {
  'character-1': 'assets/videos/green-avatar-climbing-mountain.mp4',
  'character-2': 'assets/videos/Turquoise-avatar-climbing-mountain.mp4'
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

function gestureHintShow(key, type, targetEl) {
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
    gestureHintReposition(hint, targetEl);
    hint.classList.add('visible');
  });
  return hint;
}

function gestureHintReposition(hint, targetEl) {
  const app = document.getElementById('app');
  const appRect = app.getBoundingClientRect();
  const scale = appRect.width / app.offsetWidth;
  const targetRect = targetEl.getBoundingClientRect();
  const cx = (targetRect.left + targetRect.width / 2 - appRect.left) / scale;
  const cy = (targetRect.top + targetRect.height / 2 - appRect.top) / scale;
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
   סרגל התקדמות — "שאלת שיא" אחת עם 4 סעיפים (א/ב/ג/ד, מסכים 2-5 /
   s1-s4). כל שקע = תוצאת סעיף אחד. שער-ציון (score≥3) בוטל
   (2026-09-15) — stationProgress משמש כיום רק לסימוני ה-qnav.
   ========================================================= */
const SLOT_OF = { s1: 1, s2: 2, s3: 3, s4: 4 };
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
   מסך 2 (s1) — שאלת שיא מועד ב, סעיף א': SingleChoiceQuestion מלווה
   בתמונה. כפתור רמז מוסתר עד ניסיון ראשון שגוי. תוכן לפי שקף 74.
   ========================================================= */
/* תוקן (2026-09-15, בקשה מפורשת: "לתקן במשובים את הבולדים ושבירת
   השורות לפי התסריט שקף 75") — נבדק run-level ישירות מול ה-pptx (לא
   ניחוש): רק "אבקת גיר היא היחידה שאינה מתמוססת במים" בבולד בתוך
   המשפט (לא כל המשפט); שבירת-שורה בודדת (לא כפולה) בין שני המשפטים —
   כך בדיוק בשקף (שתי פסקאות רצופות, בלי פסקה ריקה ביניהן, בשונה
   מהתבנית ששימשה בסיין 4/שקף 63). */
const S1 = {
  correctId: 'c',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'من بين المواد الثلاث (الملح والسكر والطباشير)، <b>مسحوق الطباشير هو الوحيد الذي لا يذوب في الماء</b> ويكوّن محلولًا عكرًا.\nبما أن المسحوقين أ وب ذابا تمامًا وكوّنا محاليل صافية، يمكن التأكيد بيقين أن المسحوق ج هو الطباشير!'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'من بين المواد الثلاث (الملح والسكر والطباشير)، <b>مسحوق الطباشير هو الوحيد الذي لا يذوب في الماء</b> ويكوّن محلولًا عكرًا.\nبما أن المسحوقين أ وب ذابا تمامًا وكوّنا محاليل صافية، يمكن التأكيد بيقين أن المسحوق ج هو الطباشير!'
    }
  }
};

let s1Selected = null;
let s1Attempts = 0;
let s1Done = false;
let s1Phase = 'before';

function s1OptEl(id) {
  return document.querySelector('#s1 .scq-opt[data-id="' + id + '"]');
}

function s1Select(id) {
  if (s1Done) return;
  const wasWrong1 = (s1Phase === 'wrong1');
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s1OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s1Selected = id;
  s1Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s1-popup').classList.remove('visible');
  }
  const checkBtn = document.getElementById('s1-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = false;
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
    el.onclick = function () { s1Select(el.dataset.id); };
  });
}

function s1Continue() {
  goTo(2);
}

function s1Check() {
  if (!s1Selected || s1Done) return;
  s1Attempts++;
  const optEl = s1OptEl(s1Selected);

  if (s1Selected === S1.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s1Phase = 'correct';
    s1Done = true;
    s1LockOptions();
    s1ShowFeedback('correct', true);
    s1SetBarDone('متابعة', s1Continue);
    stationProgress[1] = 'success';
    updateQuestionNav('s1');
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s1Attempts < S1.maxAttempts) {
    s1Phase = 'wrong1';
    s1ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s1-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s1Check;
    document.getElementById('s1-hint').hidden = false;
  } else {
    s1OptEl(S1.correctId).classList.add('correct');
    s1Phase = 'wrong-final';
    s1Done = true;
    s1LockOptions();
    s1ShowFeedback('wrong2', false);
    s1SetBarDone('متابعة', s1Continue);
    stationProgress[1] = 'fail';
    updateQuestionNav('s1');
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
  if (s1Done || s1Attempts > 0 || s1Selected) return; // resume-state guard
  s1Selected = null;
  s1Attempts = 0;
  s1Phase = 'before';
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
}

scqFbMakeDraggable('s1-popup');

/* Escape סוגר הצצת-רמז פתוחה של מסך 2 — מוסכמת הפרויקט */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  const s1Overlay = document.getElementById('s1-hint-overlay');
  if (s1Overlay && !s1Overlay.hidden) s1CloseHint();
});

/* =========================================================
   מסך 3 (s2) — שאלת שיא מועד ב, סעיף ב': שכפול מכני של S1/s1*
   (מסך 2). תוכן לפי שקף 76 (סדר-אפשרויות מתוקן — ראו הערה
   ב-index.html).
   תוקן (2026-09-15, בקשה מפורשת: "לוודא שיש בולדים ושבירת שורות לפי
   התסריט שקפים 76-78") — נבדק run-level ישירות מול ה-pptx: המשפט
   האחרון ("כדי לקבוע...") הוא בבולד **מלא** (לא חלקי כמו בשאר
   המסכים) בשקף עצמו, בפסקה נפרדת עם שורה ריקה לפניו (שבירת-השורה
   הכפולה כבר הייתה נכונה). גם הוסרה נקודה מיותרת אחרי "למגנט" שלא
   קיימת במקור (הפסקה שם מסתיימת בלי נקודה). */
const S2 = {
  correctId: 'c',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'مواد مختلفة يمكن أن تشترك في خصائص متطابقة.\nفي هذه الحالة، أحد المسحوقين هو ملح والآخر سكر، ومع ذلك يشتركان في الخاصيتين نفسيهما: يذوبان في الماء، ولا ينجذبان إلى المغناطيس\n\n<b>لتحديد ماهية كل مادة بشكل قاطع، يجب إجراء فحص إضافي.</b>'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'مواد مختلفة يمكن أن تشترك في خصائص متطابقة.\nفي هذه الحالة، أحد المسحوقين هو ملح والآخر سكر، ومع ذلك يشتركان في الخاصيتين نفسيهما: يذوبان في الماء، ولا ينجذبان إلى المغناطيس\n\n<b>لتحديد ماهية كل مادة بشكل قاطع، يجب إجراء فحص إضافي.</b>'
    }
  }
};

let s2Selected = null;
let s2Attempts = 0;
let s2Done = false;
let s2Phase = 'before';

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
  checkBtn.disabled = false;
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
  document.getElementById('s2-hint').hidden = true;
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

  if (s2Selected === S2.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s2Phase = 'correct';
    s2Done = true;
    s2LockOptions();
    s2ShowFeedback('correct', true);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[2] = 'success';
    updateQuestionNav('s2');
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s2Attempts < S2.maxAttempts) {
    s2Phase = 'wrong1';
    s2ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s2-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s2Check;
    document.getElementById('s2-hint').hidden = false;
  } else {
    s2OptEl(S2.correctId).classList.add('correct');
    s2Phase = 'wrong-final';
    s2Done = true;
    s2LockOptions();
    s2ShowFeedback('wrong2', false);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[2] = 'fail';
    updateQuestionNav('s2');
  }
}

function s2OpenHint() {
  if (s2Done) return;
  document.getElementById('s2-hint-overlay').hidden = false;
}

function s2CloseHint() {
  document.getElementById('s2-hint-overlay').hidden = true;
}

function resetScreenState2() {
  updateQuestionNav('s2');
  if (s2Done || s2Attempts > 0 || s2Selected) return; // resume-state guard
  s2Selected = null;
  s2Attempts = 0;
  s2Phase = 'before';
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
  const hintBtn = document.getElementById('s2-hint');
  hintBtn.hidden = true;
  document.getElementById('s2-hint-overlay').hidden = true;
}

scqFbMakeDraggable('s2-popup');

/* Escape סוגר הצצת-רמז פתוחה של מסך 3 — מוסכמת הפרויקט */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  const s2Overlay = document.getElementById('s2-hint-overlay');
  if (s2Overlay && !s2Overlay.hidden) s2CloseHint();
});

/* =========================================================
   מסך 4 (s3) — שאלת שיא מועד ב, סעיף ג': DropdownQuestion (3 בלוקים,
   כל אחד ליד ביטוי-בדיקה קצר עצמאי, לא משפט זורם אחד). בלי כפתור
   רמז כלל (הערת הפקה מפורשת "ללא רמז" בשקף 77). תוכן לפי שקף 77.
   תוקן (2026-09-15, בקשה מפורשת: "לוודא שיש בולדים ושבירת שורות לפי
   התסריט שקפים 76-78") — נבדק run-level ישירות מול ה-pptx: בכל אחד
   משלושת המשפטים רק המונח עצמו ("מסיסות"/"מגנטיות"/"תצפית על מראה
   התמיסה") בבולד, לא כל המשפט; שבירת-שורה כפולה בין שלושת המשפטים
   כבר הייתה נכונה. */
const S3_OPTIONS = {
  1: ['مغناطيسية', 'مشاهدة مظهر المحلول بعد الخلط', 'قابلية الذوبان في الماء'],
  2: ['مشاهدة مظهر المحلول بعد الخلط', 'قابلية الذوبان في الماء', 'مغناطيسية'],
  3: ['مغناطيسية', 'قابلية الذوبان في الماء', 'مشاهدة مظهر المحلول بعد الخلط']
};
const S3_CORRECT = { 1: 'قابلية الذوبان في الماء', 2: 'مغناطيسية', 3: 'مشاهدة مظهر المحلول بعد الخلط' };
const S3_FEEDBACK = {
  correct: {
    title: 'ممتاز!',
    body: 'عند خلط مسحوق بالماء - نفحص <b>قابلية الذوبان</b>.\n\nعند تقريب مغناطيس – نفحص <b>المغناطيسية</b>.\n\nعند النظر إلى ما إذا كان السائل صافيًا أو عكرًا - فهذه <b>مشاهدة لمظهر المحلول</b>.'
  },
  wrong1: {
    title: 'الإجابة غير صحيحة.',
    body: 'هل نحاول مرة أخرى؟'
  },
  /* §9 כלל חלקי: לפחות סעיף אחד נכון ולא כולם */
  wrong1partial: {
    title: 'الإجابة صحيحة جزئيًا.',
    body: 'هل نحاول مرة أخرى؟'
  },
  wrong2partial: {
    title: fbCorrectShown('الإجابة صحيحة جزئيًا.'),
    body: 'عند خلط مسحوق بالماء - نفحص <b>قابلية الذوبان</b>.\n\nعند تقريب مغناطيس – نفحص <b>المغناطيسية</b>.\n\nعند النظر إلى ما إذا كان السائل صافيًا أو عكرًا - فهذه <b>مشاهدة لمظهر المحلول</b>.'
  },
  wrong2: {
    title: fbCorrectShown('الإجابة غير صحيحة.'),
    body: 'عند خلط مسحوق بالماء - نفحص <b>قابلية الذوبان</b>.\n\nعند تقريب مغناطيس – نفحص <b>المغناطيسية</b>.\n\nعند النظر إلى ما إذا كان السائل صافيًا أو عكرًا - فهذه <b>مشاهدة لمظهر المحلول</b>.'
  }
};

let s3Answers = { 1: null, 2: null, 3: null };
let s3Attempts = 0;
let s3Done = false;
let s3AnswerSnapshot = null;
let s3ShowingCorrect = false; // true = הלוח מציג כרגע את התשובה הנכונה (§9)

function s3BlankEl(n) {
  return document.getElementById('s3-blank-' + n);
}

function s3RenderMenu(n) {
  const blank = s3BlankEl(n);
  const menu = blank.querySelector('.dpq-menu');
  menu.innerHTML = '';
  S3_OPTIONS[n].forEach(function (opt) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dpq-option';
    btn.textContent = opt;
    btn.onclick = function (e) { e.stopPropagation(); s3Select(n, opt); };
    menu.appendChild(btn);
  });
}

function s3Toggle(n) {
  if (s3Done) return;
  /* תוקן (2026-08-05): First-attempt retry feedback dismissal —
     720-templates skill (_global-components.md → "Feedback popup
     system") — "opening or changing a dropdown" הוא trigger מפורש. */
  const blank = s3BlankEl(n);
  /* נעילת סעיף שנענה נכון (2026-10-01, Critical-requirement §5.3): אחרי
     בדיקה, סעיף ירוק לא נפתח ולא ניתן לשינוי עד סוף השאלה. */
  if (blank.classList.contains('correct')) return;
  if (s3Attempts > 0) document.getElementById('s3-popup').classList.remove('visible');
  const wasOpen = blank.classList.contains('open');
  document.querySelectorAll('#s3 .dpq-blank').forEach(function (b) { b.classList.remove('open'); });
  if (!wasOpen) blank.classList.add('open');
}

function s3Select(n, value) {
  if (s3Done) return;
  const blank = s3BlankEl(n);
  if (blank.classList.contains('correct')) return; // סעיף נכון ננעל (§5.3)
  s3Answers[n] = value;
  blank.classList.remove('open');
  blank.querySelector('.dpq-trigger-text').textContent = value;
  document.getElementById('s3-popup').classList.remove('visible');
  s3UpdateCheckBtn();
}

function s3UpdateCheckBtn() {
  const btn = document.getElementById('s3-check');
  if (btn && !s3Done) btn.disabled = !(s3Answers[1] && s3Answers[2] && s3Answers[3]);
}

document.addEventListener('click', function (e) {
  if (e.target.closest('.dpq-blank')) return;
  document.querySelectorAll('.dpq-blank').forEach(function (b) { b.classList.remove('open'); });
});

function s3ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s3-popup');
  const data = S3_FEEDBACK[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s3-popup');
  box.classList.add('visible');
}

function s3SetBarDone(label, handler) {
  const btn = document.getElementById('s3-check');
  btn.textContent = label;
  btn.disabled = false;
  btn.onclick = handler;
}

function s3LockBlanks() {
  document.querySelectorAll('#s3 .dpq-blank').forEach(function (b) {
    b.classList.add('disabled');
    b.classList.remove('open');
  });
}

function s3Continue() {
  goTo(4);
}

function s3Check() {
  if (s3Done || !s3Answers[1] || !s3Answers[2] || !s3Answers[3]) return;
  s3Attempts++;

  let allCorrect = true;
  [1, 2, 3].forEach(function (n) {
    const blank = s3BlankEl(n);
    const ok = s3Answers[n] === S3_CORRECT[n];
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add(ok ? 'correct' : 'incorrect');
    blank.classList.toggle('disabled', ok); // §5.3: סעיף נכון ננעל
    blank.querySelector('.dpq-trigger-icon').src = ok
      ? 'assets/images/icon-dropdown-correct.svg'
      : 'assets/images/icon-dropdown-incorrect.svg';
    if (!ok) allCorrect = false;
  });

  if (allCorrect) {
    s3Done = true;
    s3LockBlanks();
    s3ShowFeedback('correct', true);
    s3SetBarDone('متابعة', s3Continue);
    stationProgress[3] = 'success';
    updateQuestionNav('s3');
    return;
  }

  const s3CorrectCount = [1, 2, 3].filter(function (n) { return s3Answers[n] === S3_CORRECT[n]; }).length;
  const s3Partial = s3CorrectCount > 0;
  if (s3Attempts < 2) {
    s3ShowFeedback(s3Partial ? 'wrong1partial' : 'wrong1', false);
    document.getElementById('s3-check').disabled = true;
  } else {
    [1, 2, 3].forEach(function (n) {
      const blank = s3BlankEl(n);
      blank.classList.remove('correct', 'incorrect');
      blank.classList.add(S3_CORRECT[n] === s3Answers[n] ? 'correct' : 'incorrect');
    });
    s3Done = true;
    s3LockBlanks();
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה
       הנכונה, המשוב המלא נפתח מיד, והכפתור "מעבר לתשובה שלי" משחזר
       את תשובת הלומד (snapshot). */
    s3AnswerSnapshot = { 1: s3Answers[1], 2: s3Answers[2], 3: s3Answers[3] };
    s3ApplyCorrect();
    s3ShowingCorrect = true;
    s3ShowFeedback(s3Partial ? 'wrong2partial' : 'wrong2', false);
    s3SetBarDone('متابعة', s3Continue);
    stationProgress[3] = 'fail';
    updateQuestionNav('s3');
    const revealBtn = document.getElementById('s3-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
}

function s3ApplyCorrect() {
  [1, 2, 3].forEach(function (n) {
    const blank = s3BlankEl(n);
    blank.querySelector('.dpq-trigger-text').textContent = S3_CORRECT[n];
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add('correct');
    blank.querySelector('.dpq-trigger-icon').src = 'assets/images/icon-dropdown-correct.svg';
  });
}

function s3ApplySnapshot() {
  [1, 2, 3].forEach(function (n) {
    const blank = s3BlankEl(n);
    blank.querySelector('.dpq-trigger-text').textContent = s3AnswerSnapshot[n];
    const ok = S3_CORRECT[n] === s3AnswerSnapshot[n];
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add(ok ? 'correct' : 'incorrect');
    blank.querySelector('.dpq-trigger-icon').src = ok
      ? 'assets/images/icon-dropdown-correct.svg'
      : 'assets/images/icon-dropdown-incorrect.svg';
  });
}

/* §9: המשוב לא משתנה בזמן הטוגל — רק ערכי הלוח ותווית הכפתור. */
function s3ToggleReveal() {
  const revealBtn = document.getElementById('s3-reveal-btn');
  if (s3ShowingCorrect) {
    s3ApplySnapshot();
    s3ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    s3ApplyCorrect();
    s3ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function resetScreenState3() {
  updateQuestionNav('s3');
  s3RenderMenu(1);
  s3RenderMenu(2);
  s3RenderMenu(3);
  if (s3Done || s3Attempts > 0 || s3Answers[1] || s3Answers[2] || s3Answers[3]) {
    /* תוקן (2026-10-01, §9): שחזור מצב כפתור "מעבר לתשובה שלי/הנכונה"
       בחזרה למסך שהושלם — הנחיות-כפתור-התשובה-הנכונה.md. */
    const revealBtn = document.getElementById('s3-reveal-btn');
    if (revealBtn) {
      if (s3Done && s3AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = s3ShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return; // resume-state guard
  }
  s3Answers = { 1: null, 2: null, 3: null };
  s3Attempts = 0;
  s3AnswerSnapshot = null;
  s3ShowingCorrect = false;
  [1, 2, 3].forEach(function (n) {
    const blank = s3BlankEl(n);
    blank.classList.remove('open', 'correct', 'incorrect', 'disabled');
    blank.querySelector('.dpq-trigger-text').textContent = '';
    blank.querySelector('.dpq-trigger-icon').src = 'assets/images/icon-dropdown-chevron.svg';
  });
  document.getElementById('s3-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s3-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s3Check;
  const revealBtn = document.getElementById('s3-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
}

scqFbMakeDraggable('s3-popup');

/* =========================================================
   סיום שאלת השיא (מועד ב), נבדק בסיום הסעיף האחרון (ד').
   תוקן (2026-09-28, בקשה מפורשת): מסך 6 (s5, מסך-הסגירה שנותר) הוסר
   גם הוא — זהו הסיין האחרון בין 6 הסינים של היחידה, ואין סיין הבא
   להפנות אליו. במקום ניווט, כפתור "המשך" הופך ל-"סיימתי" — inert,
   בלי יעד-ניווט, בדיוק כפי שכבר נהוג בכפתורי-סיום אחרים בפרויקט הזה.
   ========================================================= */

/* =========================================================
   מסך 5 (s4) — שאלת שיא מועד ב, סעיף ד': שכפול מכני של S1/s1*
   (מסך 2). בלי כפתור רמז כלל. תוכן לפי שקף 77 — משוב "מצוין!"/
   "התשובה לא נכונה." (הסופי) הם כותרת-בלבד, בלי גוף-טקסט, כפי
   שסופק בפועל בשקף (לא הומצא טקסט הסבר).
   ========================================================= */
const S4 = {
  correctId: 'c',
  maxAttempts: 2,
  feedback: {
    correct: { title: 'كل الاحترام!', body: 'أكملت ادّعاءً علميًّا بشكل صحيح.' },
    wrong1: { title: 'الإجابة غير صحيحة.', body: 'هل نحاول مرة أخرى؟' },
    wrong2: { title: fbCorrectShown('الإجابة غير صحيحة.'), body: 'إكمال ادّعاء علمي وفقًا للمعطيات هو مهارة مهمة، يستحسن التدرب عليها.' }
  }
};

let s4Selected = null;
let s4Attempts = 0;
let s4Done = false;
let s4Phase = 'before';

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
  checkBtn.disabled = false;
  checkBtn.onclick = s4Check;
}

function s4ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s4-popup');
  const data = S4.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s4-popup');
  box.classList.add('visible');
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

function s4Check() {
  if (s4Done) return;
  if (!s4Selected) return;
  s4Attempts++;
  const optEl = s4OptEl(s4Selected);

  if (s4Selected === S4.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s4Phase = 'correct';
    s4Done = true;
    s4LockOptions();
    s4ShowFeedback('correct', true);
    stationProgress[4] = 'success';
    updateQuestionNav('s4');
    const btn = document.getElementById('s4-check');
    btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = null;
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s4Attempts < S4.maxAttempts) {
    s4Phase = 'wrong1';
    s4ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s4-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s4Check;
  } else {
    s4OptEl(S4.correctId).classList.add('correct');
    s4Phase = 'wrong-final';
    s4Done = true;
    s4LockOptions();
    s4ShowFeedback('wrong2', false);
    stationProgress[4] = 'fail';
    updateQuestionNav('s4');
    const btn = document.getElementById('s4-check');
    btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = null;
  }
}

function resetScreenState4() {
  updateQuestionNav('s4');
  if (s4Done) {
    const btn = document.getElementById('s4-check');
    if (btn) { btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = null; }
    return;
  }
  if (s4Attempts > 0 || s4Selected) return; // resume-state guard
  s4Selected = null;
  s4Attempts = 0;
  s4Phase = 'before';
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

/* אתחול */
scaleApp();
resetScreenState(0);
