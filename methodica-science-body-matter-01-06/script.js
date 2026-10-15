'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 5; // תוקן (2026-09-28): 6→5, הוסר מסך המעבר החגיגי (s5) — שני מסלולי שער-הציון מנווטים כעת ישירות לסיין 6
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
    4: { done: dqx4Done, popup: 'dqx4-popup' }
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
   בפועל), אותו חוזה resolveCharBubbleVideo כמו בשאר הפרויקט. */
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
   s1-s4). כל שקע = תוצאת סעיף אחד — נחוץ לשער-ההתקדמות "לפחות 3 מתוך
   4 נכון" (ראו resolveMoedAResult למטה).
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
   מסך 2 (s1) — שאלת שיא מועד א, סעיף א': SingleChoiceQuestion מלווה
   בטבלה. כפתור רמז מוסתר עד ניסיון ראשון שגוי. תוכן לפי שקף 68.
   ========================================================= */
const S1 = {
  correctId: 'a',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'الجمع بين خصائص الطبقة البلاستيكية – انعكاس الضوء العالي والموصلية الحرارية المنخفضة،\nسيساعد في الحفاظ على برودة الصفوف ويقلّل بشكل كبير الحاجة إلى استخدام مكثّف لأجهزة التكييف - حل ذكي، اقتصادي وأخضر!'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'الجمع بين خصائص الطبقة البلاستيكية – انعكاس الضوء العالي والموصلية الحرارية المنخفضة،\nسيساعد في الحفاظ على برودة الصفوف ويقلّل بشكل كبير الحاجة إلى استخدام مكثّف لأجهزة التكييف - حل ذكي، اقتصادي وأخضر!'
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
   מסך 3 (s2) — שאלת שיא מועד א, סעיף ב': DropdownQuestion (3 תפריטים
   נפתחים, הורחב מ-2 בסיין 2 מסך 5). כפתור רמז מוסתר עד ניסיון ראשון
   שגוי. תוכן לפי שקף 69 (סדר סמנטי מתוקן — ראו הערה ב-index.html).
   ========================================================= */
/* תוקן (2026-08-09), לפי בקשה מפורשת: שלוש הרשימות היו זהות
   ("גוף","חומר","תכונה" באותו סדר בכל השלושה), כך שהתשובה הנכונה
   ישבה תמיד באותו מיקום כמו מספר הפער (1-1, 2-2, 3-3) — ניחוש טריוויאלי
   בלי לקרוא בכלל. כל רשימה מעורבבת כעת בסדר שונה, כשהתשובה הנכונה
   אף פעם לא במיקום התואם למספרה. */
const S2_OPTIONS = {
  1: ['مادة', 'جسم', 'خاصية'],
  2: ['مادة', 'خاصية', 'جسم'],
  3: ['خاصية', 'جسم', 'مادة']
};
const S2_CORRECT = { 1: 'جسم', 2: 'مادة', 3: 'خاصية' };
const S2_FEEDBACK = {
  correct: {
    title: 'ممتاز!',
    body: 'تمييز ممتاز بين الجسم والمادة والخاصية!'
  },
  wrong1: {
    title: 'الإجابة غير صحيحة.',
    body: 'هل نحاول مرة أخرى؟'
  },
  wrong2: {
    title: fbCorrectShown('الإجابة غير صحيحة.'),
    body: '<b>الجسم</b> هو سطح المدرسة.\n<b>المادة</b> هي البلاستيك.\n<b>الخاصية</b> هي الموصلية الحرارية المنخفضة (صفة المادة التي تمنع الصفوف من ارتفاع حرارتها).'
  }
};

let s2Answers = { 1: null, 2: null, 3: null };
let s2Attempts = 0;
let s2Done = false;
let s2AnswerSnapshot = null;
let s2ShowingCorrect = false; // true = הלוח מציג כרגע את התשובה הנכונה (§9)

function s2BlankEl(n) {
  return document.getElementById('s2-blank-' + n);
}

function s2RenderMenu(n) {
  const blank = s2BlankEl(n);
  const menu = blank.querySelector('.dpq-menu');
  menu.innerHTML = '';
  S2_OPTIONS[n].forEach(function (opt) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dpq-option';
    btn.textContent = opt;
    btn.onclick = function (e) { e.stopPropagation(); s2Select(n, opt); };
    menu.appendChild(btn);
  });
}

function s2Toggle(n) {
  if (s2Done) return;
  /* תוקן (2026-08-05): First-attempt retry feedback dismissal —
     720-templates skill (_global-components.md → "Feedback popup
     system") — "opening or changing a dropdown" הוא trigger מפורש. */
  const blank = s2BlankEl(n);
  /* נעילת סעיף שנענה נכון (2026-10-01, Critical-requirement §5.3): אחרי
     בדיקה, סעיף ירוק לא נפתח ולא ניתן לשינוי עד סוף השאלה. */
  if (blank.classList.contains('correct')) return;
  if (s2Attempts > 0) document.getElementById('s2-popup').classList.remove('visible');
  const wasOpen = blank.classList.contains('open');
  document.querySelectorAll('#s2 .dpq-blank').forEach(function (b) { b.classList.remove('open'); });
  if (!wasOpen) blank.classList.add('open');
}

function s2Select(n, value) {
  if (s2Done) return;
  const blank = s2BlankEl(n);
  if (blank.classList.contains('correct')) return; // סעיף נכון ננעל (§5.3)
  s2Answers[n] = value;
  blank.classList.remove('open');
  blank.querySelector('.dpq-trigger-text').textContent = value;
  document.getElementById('s2-popup').classList.remove('visible');
  s2UpdateCheckBtn();
}

function s2UpdateCheckBtn() {
  const btn = document.getElementById('s2-check');
  if (btn && !s2Done) btn.disabled = !(s2Answers[1] && s2Answers[2] && s2Answers[3]);
}

document.addEventListener('click', function (e) {
  if (e.target.closest('.dpq-blank')) return;
  document.querySelectorAll('.dpq-blank').forEach(function (b) { b.classList.remove('open'); });
});

function s2ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s2-popup');
  const data = S2_FEEDBACK[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s2-popup');
  box.classList.add('visible');
}

function s2SetBarDone(label, handler) {
  const btn = document.getElementById('s2-check');
  btn.textContent = label;
  btn.disabled = false;
  btn.onclick = handler;
  document.getElementById('s2-hint').hidden = true;
}

function s2LockBlanks() {
  document.querySelectorAll('#s2 .dpq-blank').forEach(function (b) {
    b.classList.add('disabled');
    b.classList.remove('open');
  });
}

function s2Continue() {
  goTo(3);
}

function s2Check() {
  if (s2Done || !s2Answers[1] || !s2Answers[2] || !s2Answers[3]) return;
  s2Attempts++;

  let allCorrect = true;
  let s2OkCount = 0;
  [1, 2, 3].forEach(function (n) {
    const blank = s2BlankEl(n);
    const ok = s2Answers[n] === S2_CORRECT[n];
    if (ok) s2OkCount++;
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add(ok ? 'correct' : 'incorrect');
    blank.classList.toggle('disabled', ok); // §5.3: סעיף נכון ננעל
    blank.querySelector('.dpq-trigger-icon').src = ok
      ? 'assets/images/icon-dropdown-correct.svg'
      : 'assets/images/icon-dropdown-incorrect.svg';
    if (!ok) allCorrect = false;
  });

  if (allCorrect) {
    s2Done = true;
    s2LockBlanks();
    s2ShowFeedback('correct', true);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[2] = 'success';
    updateQuestionNav('s2');
    return;
  }

  if (s2Attempts < 2) {
    /* §9 כלל חלקי: ניסיון ראשון חלקית נכון → "התשובה נכונה חלקית." / "שננסה שוב?" */
    if (s2OkCount > 0) {
      S2_FEEDBACK.wrong1 = { title: 'الإجابة صحيحة جزئيًا.', body: 'هل نحاول مرة أخرى؟' };
    } else {
      S2_FEEDBACK.wrong1 = { title: 'الإجابة غير صحيحة.', body: 'هل نحاول مرة أخرى؟' };
    }
    s2ShowFeedback('wrong1', false);
    document.getElementById('s2-check').disabled = true;
    document.getElementById('s2-hint').hidden = false;
  } else {
    [1, 2, 3].forEach(function (n) {
      const blank = s2BlankEl(n);
      blank.classList.remove('correct', 'incorrect');
      blank.classList.add(S2_CORRECT[n] === s2Answers[n] ? 'correct' : 'incorrect');
    });
    s2Done = true;
    s2LockBlanks();
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה
       הנכונה, המשוב המלא נפתח מיד, והכפתור "מעבר לתשובה שלי" משחזר
       את תשובת הלומד (snapshot). */
    s2AnswerSnapshot = { 1: s2Answers[1], 2: s2Answers[2], 3: s2Answers[3] };
    s2ApplyCorrect();
    s2ShowingCorrect = true;
    S2_FEEDBACK.wrong2.title = fbCorrectShown(s2OkCount > 0 ? 'الإجابة صحيحة جزئيًا.' : 'الإجابة غير صحيحة.');
    s2ShowFeedback('wrong2', false);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[2] = 'fail';
    updateQuestionNav('s2');
    const revealBtn = document.getElementById('s2-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
}

function s2ApplyCorrect() {
  [1, 2, 3].forEach(function (n) {
    const blank = s2BlankEl(n);
    blank.querySelector('.dpq-trigger-text').textContent = S2_CORRECT[n];
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add('correct');
    blank.querySelector('.dpq-trigger-icon').src = 'assets/images/icon-dropdown-correct.svg';
  });
}

function s2ApplySnapshot() {
  [1, 2, 3].forEach(function (n) {
    const blank = s2BlankEl(n);
    blank.querySelector('.dpq-trigger-text').textContent = s2AnswerSnapshot[n];
    const ok = S2_CORRECT[n] === s2AnswerSnapshot[n];
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add(ok ? 'correct' : 'incorrect');
    blank.querySelector('.dpq-trigger-icon').src = ok
      ? 'assets/images/icon-dropdown-correct.svg'
      : 'assets/images/icon-dropdown-incorrect.svg';
  });
}

/* §9: המשוב לא משתנה בזמן הטוגל — רק ערכי הלוח ותווית הכפתור. */
function s2ToggleReveal() {
  const revealBtn = document.getElementById('s2-reveal-btn');
  if (s2ShowingCorrect) {
    s2ApplySnapshot();
    s2ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    s2ApplyCorrect();
    s2ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
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
  s2RenderMenu(1);
  s2RenderMenu(2);
  s2RenderMenu(3);
  if (s2Done || s2Attempts > 0 || s2Answers[1] || s2Answers[2] || s2Answers[3]) {
    /* תוקן (2026-10-01, §9): שחזור מצב כפתור "מעבר לתשובה שלי/הנכונה"
       בחזרה למסך שהושלם — הנחיות-כפתור-התשובה-הנכונה.md. */
    const revealBtn = document.getElementById('s2-reveal-btn');
    if (revealBtn) {
      if (s2Done && s2AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = s2ShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return; // resume-state guard
  }
  s2Answers = { 1: null, 2: null, 3: null };
  s2Attempts = 0;
  s2AnswerSnapshot = null;
  s2ShowingCorrect = false;
  [1, 2, 3].forEach(function (n) {
    const blank = s2BlankEl(n);
    blank.classList.remove('open', 'correct', 'incorrect', 'disabled');
    blank.querySelector('.dpq-trigger-text').textContent = '';
    blank.querySelector('.dpq-trigger-icon').src = 'assets/images/icon-dropdown-chevron.svg';
  });
  document.getElementById('s2-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s2-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s2Check;
  const hintBtn = document.getElementById('s2-hint');
  hintBtn.hidden = true;
  document.getElementById('s2-hint-overlay').hidden = true;
  const revealBtn = document.getElementById('s2-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
}

scqFbMakeDraggable('s2-popup');

/* Escape סוגר הצצת-רמז פתוחה של מסך 3 — מוסכמת הפרויקט */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  const s2Overlay = document.getElementById('s2-hint-overlay');
  if (s2Overlay && !s2Overlay.hidden) s2CloseHint();
});

/* =========================================================
   מסך 4 (s3) — שאלת שיא מועד א, סעיף ג': SingleChoiceQuestion מלווה
   בטבלה. שכפול מכני של S1/s1* (מסך 2). הנפשת-כניסה עדינה (`.s5-anim`,
   מופעלת פעם אחת בלבד — לא ב-resume). תוכן לפי שקף 70.
   ========================================================= */
const S3 = {
  correctId: 'c',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'ممتاز!',
      body: 'اختار يوني مادة تلبّي متطلبين فقط – مقاومة الماء وقابلية كسر منخفضة.\n<b>لقد تجاهل المتطلب المتعلق بمادة تمنع ارتفاع الحرارة أيضًا.</b>'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'اختار يوني مادة تلبّي متطلبين فقط – مقاومة الماء وقابلية كسر منخفضة.\n<b>لقد تجاهل المتطلب المتعلق بمادة تمنع ارتفاع الحرارة أيضًا.</b>'
    }
  }
};

let s3Selected = null;
let s3Attempts = 0;
let s3Done = false;
let s3Phase = 'before';
let s3AnimPlayed = false;

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
  document.getElementById('s3-hint').hidden = true;
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
    document.getElementById('s3-hint').hidden = false;
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

function s3OpenHint() {
  if (s3Done) return;
  document.getElementById('s3-hint-overlay').hidden = false;
}

function s3CloseHint() {
  document.getElementById('s3-hint-overlay').hidden = true;
}

function resetScreenState3() {
  updateQuestionNav('s3');
  if (!s3AnimPlayed) {
    s3AnimPlayed = true;
    const s3El = document.getElementById('s3');
    s3El.classList.add('s5-anim');
    /* מוסר אחרי שההנפשה מסתיימת (500ms + 300ms stagger = 800ms, +
       שוליים) — כדי ש-display:none↔block (מעבר מסכים חוזר) לא יפעיל
       את ההנפשה מחדש בביקור הבא (ראו הערה מלאה ב-styles.css). */
    setTimeout(function () { s3El.classList.remove('s5-anim'); }, 900);
  }
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
  const hintBtn = document.getElementById('s3-hint');
  hintBtn.hidden = true;
  document.getElementById('s3-hint-overlay').hidden = true;
}

scqFbMakeDraggable('s3-popup');

/* Escape סוגר הצצת-רמז פתוחה של מסך 4 — מוסכמת הפרויקט */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  const s3Overlay = document.getElementById('s3-hint-overlay');
  if (s3Overlay && !s3Overlay.hidden) s3CloseHint();
});

/* =========================================================
   מסך 5 (s4) — שאלת שיא מועד א, סעיף ד': גרירת השלמת-טענה מדעית
   (4 פערים, לא 3 — הורחב מ-dqx5 בסיין 4). state machine זהה (placement
   עוקב draggable→'source'|targetId). בלי כפתור רמז כלל (הערת הפקה
   מפורשת "ללא רמז" בשקף 71). הנפשת-כניסה עדינה (כמו מסך 4). תוכן
   לפי שקף 71.
   ========================================================= */
const DQX4_LABELS = {
  'dqx4-drag-plastic': 'طبقة بلاستيكية بيضاء',
  'dqx4-drag-heat': 'سيقلّل ارتفاع الحرارة',
  'dqx4-drag-water': 'سيكون مقاومًا للمطر',
  'dqx4-drag-break': 'لن يتفتت بسهولة'
};
const DQX4_CORRECT_MAP = {
  'dqx4-target-1': 'dqx4-drag-plastic',
  'dqx4-target-2': 'dqx4-drag-heat',
  'dqx4-target-3': 'dqx4-drag-water',
  'dqx4-target-4': 'dqx4-drag-break'
};
const DQX4_DRAG_IDS = Object.keys(DQX4_LABELS);
const DQX4_TARGET_IDS = Object.keys(DQX4_CORRECT_MAP);

let dqx4Placement = {};
DQX4_DRAG_IDS.forEach(function (id) { dqx4Placement[id] = 'source'; });
let dqx4DragActive = null;
let dqx4DropHandled = false;
let dqx4Checked = false;
let dqx4Attempts = 0;
let dqx4Done = false;
let dqx4AnswerSnapshot = null;
let dqx4ShowingCorrect = false; // true = הלוח מציג כרגע את התשובה הנכונה (§9)
let s4AnimPlayed = false;

let dqx4Order = DQX4_DRAG_IDS.slice();
(function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
})(dqx4Order);

function dqx4Render() {
  dqx4Order.forEach(function (dragId) {
    const slot = document.getElementById('slot-' + dragId);
    if (!slot) return;
    /* תוקן (2026-08-05): ערבוב-מסיחים אמיתי — dqx4Order מעורבב היה
       ללא השפעה חזותית (כל dragId תמיד מתמלא ל-slot הקבוע שלו-עצמו).
       מזיזים את ה-slot עצמו לסוף ה-container בכל איטרציה. */
    if (slot.parentElement) slot.parentElement.appendChild(slot);
    slot.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'dqx-drag-card';
    card.id = dragId;
    if (dqx4Placement[dragId] === 'source') {
      card.textContent = DQX4_LABELS[dragId];
      if (!dqx4Checked) {
        card.draggable = true;
        card.ondragstart = function (e) { dqx4DragStart(e, dragId); };
        card.ondragend = dqx4DragEnd;
      } else {
        card.classList.add('locked');
      }
    } else {
      card.classList.add('ghost');
      card.textContent = DQX4_LABELS[dragId];
    }
    slot.appendChild(card);
  });

  DQX4_TARGET_IDS.forEach(function (targetId) {
    const zone = document.getElementById(targetId);
    if (!zone) return;
    let placedId = null;
    DQX4_DRAG_IDS.forEach(function (dId) { if (dqx4Placement[dId] === targetId) placedId = dId; });
    zone.innerHTML = '';
    zone.classList.remove('filled', 'drag-origin');
    if (placedId) {
      /* תוקן (2026-08-04): guard נוסף — אחרי ניסיון שגוי ראשון,
         dqx4Check() מאפס Checked=false ומפעיל Render() שוב כדי לאפשר
         גרירה חוזרת; בלי ה-guard, 'filled' היה חוזר יחד עם 'incorrect'
         שנשאר על התא (Render לא מסיר correct/incorrect), והטקסט היה
         נראה בסגנון "הונח" (22px/#222) במקום "שגוי" (24px/#303030). */
      if (!dqx4Checked && !zone.classList.contains('correct') && !zone.classList.contains('incorrect')) zone.classList.add('filled');
      const iconEl = document.createElement('span');
      iconEl.className = 'dqx-drop-icon';
      const wordEl = document.createElement('span');
      wordEl.className = 'dqx-drop-word';
      wordEl.textContent = DQX4_LABELS[placedId];
      if (!dqx4Checked) {
        wordEl.draggable = true;
        wordEl.style.cursor = 'grab';
        wordEl.ondragstart = function (e) { dqx4PlacedDragStart(e, placedId); };
        wordEl.ondragend = dqx4DragEnd;
      }
      zone.appendChild(iconEl);
      zone.appendChild(wordEl);
    }
  });

  const allFilled = DQX4_TARGET_IDS.every(function (tId) {
    return DQX4_DRAG_IDS.some(function (dId) { return dqx4Placement[dId] === tId; });
  });
  const btn = document.getElementById('dqx4-check');
  if (btn && !dqx4Done) btn.disabled = !allFilled;
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

function dqx4DragStart(event, dragId) {
  if (dqx4Checked) { event.preventDefault(); return; }
  gestureHintHide('s4-drag'); /* נעלם ברגע שהלומד מתחיל לגרור */
  /* תוקן (2026-08-05): First-attempt retry feedback dismissal — ראו
     ddq13DragStart בסיין 1 לפירוט המלא. */
  if (dqx4Attempts > 0) document.getElementById('dqx4-popup').classList.remove('visible');
  dqx4DragActive = dragId;
  dqx4DropHandled = false;
  event.dataTransfer.setData('text/plain', dragId);
  event.dataTransfer.effectAllowed = 'move';
  dragPillPreview(event, event.currentTarget || event.target, DQX4_LABELS[dragId], 'dqx-drag-card');
  setTimeout(function () {
    const card = document.getElementById(dragId);
    if (card) card.classList.add('dragging');
  }, 0);
}

function dqx4PlacedDragStart(event, dragId) {
  if (dqx4Checked) { event.preventDefault(); return; }
  if (dqx4Attempts > 0) document.getElementById('dqx4-popup').classList.remove('visible');
  dqx4DragActive = dragId;
  dqx4DropHandled = false;
  event.dataTransfer.setData('text/plain', dragId);
  event.dataTransfer.effectAllowed = 'move';
  const wordEl = event.currentTarget || event.target;
  const oldZone = document.getElementById(dqx4Placement[dragId]);
  dragPillPreview(event, oldZone || wordEl, DQX4_LABELS[dragId], 'dqx-drag-card');
  /* תוקן (2026-10-04): אין עוד dqx4Render() סינכרוני כאן — הוא ניתק את
     המילה הנגררת מה-DOM באמצע הגרירה, ולכן dragend לא הופעל, והכרטיס
     שבבנק נתקע בשקיפות אחרי החזרה. ה-DOM נשאר יציב עד drop/dragend;
     התיבה רק "מתרוקנת" חזותית (.drag-origin) והכרטיס בבנק נשאר ghost. */
  if (oldZone) oldZone.classList.remove('correct', 'incorrect', 'filled');
  setTimeout(function () {
    if (dqx4DragActive === dragId && oldZone) oldZone.classList.add('drag-origin');
  }, 0);
}

function dqx4DragEnd() {
  if (!dqx4DropHandled && dqx4DragActive) {
    dqx4Placement[dqx4DragActive] = 'source';
  }
  dqx4Render();
  dqx4DragActive = null;
  dqx4DropHandled = false;
  document.querySelectorAll('#s4 .drag-hover').forEach(function (z) { z.classList.remove('drag-hover'); });
}

function dqx4DragOver(event, targetId) {
  if (dqx4Checked) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const zone = document.getElementById(targetId);
  if (zone) zone.classList.add('drag-hover');
}

function dqx4DragEnter(event, targetId) {
  event.preventDefault();
  const zone = document.getElementById(targetId);
  if (zone) zone.classList.add('drag-hover');
}

function dqx4DragLeave(event, targetId) {
  const zone = document.getElementById(targetId);
  if (zone) zone.classList.remove('drag-hover');
}

function dqx4Drop(event, targetId) {
  event.preventDefault();
  const zone = document.getElementById(targetId);
  if (zone) zone.classList.remove('drag-hover', 'correct', 'incorrect');
  if (dqx4Checked || !dqx4DragActive) return;
  dqx4DropHandled = true;
  DQX4_DRAG_IDS.forEach(function (dId) {
    if (dqx4Placement[dId] === targetId && dId !== dqx4DragActive) dqx4Placement[dId] = 'source';
  });
  dqx4Placement[dqx4DragActive] = targetId;
  dqx4DragActive = null;
  dqx4Render();
}

function dqx4DropToBank(event) {
  event.preventDefault();
  if (dqx4Checked || !dqx4DragActive) return;
  dqx4DropHandled = true;
  dqx4Placement[dqx4DragActive] = 'source';
  dqx4DragActive = null;
  dqx4Render();
}

function dqx4ShowFeedback(title, body, kind) {
  const box = document.getElementById('dqx4-popup');
  box.querySelector('.scq-fb-title-text').textContent = title;
  box.querySelector('.scq-fb-body').innerHTML = body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(kind === 'correct' ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('dqx4-popup');
  box.classList.add('visible');
}

/* =========================================================
   שער-ההתקדמות של שאלת השיא (מועד א): "לפחות 3 מתוך 4 סעיפים נכון".
   נבדק רק כאן, בסיום הסעיף האחרון (ד'). אם עברו את השער — ממשיכים
   למסך 6 (מסך מעבר חגיגי, in-page). אם לא — ניווט בין-סייני ישיר
   (window.location.href, לא goTo()) לסיין 6 (מועד ב), **לפי בקשה
   מפורשת של המשתמשת ותוך שימוש במוסכמה הקיימת מפרויקטי המקור** (יעד 2/3,
   methodica-science-mass-measure-0X): `window.location.href =
   '../<תיקיית-הסיין>/index.html'`, לא goTo(). דגל משותף
   (localStorage, מתויג ללומדה כולה — אותה מוסכמה כמו
   CHARACTER_STORAGE_KEY) נשמר לפני הניווט, כדי שסיין 6 (כשייבנה)
   יוכל לדעת אם המשתמש הגיע כי עבר או כי נכשל במועד א (למשל, כדי
   להחליט אם "מועד ב" הוא חובה-לחזרה או תוכן-בונוס).
   ========================================================= */
const MOED_A_RESULT_KEY = 'body-matter-01_moedAPassed';

function resolveMoedAResult() {
  const score = [1, 2, 3, 4].filter(function (i) { return stationProgress[i] === 'success'; }).length;
  const passed = score >= 3;
  try { localStorage.setItem(MOED_A_RESULT_KEY, passed ? 'true' : 'false'); } catch (e) { /* localStorage חסום — נמשיך בלי שמירה */ }
  /* תוקן (2026-09-28): מסך 6 (s5, מסך מעבר חגיגי למסלול-הצלחה בלבד)
     הוסר — עבר/נכשל מנווטים כעת יחד ישירות לסיין 6, ההבחנה נשמרת רק
     דרך MOED_A_RESULT_KEY ב-localStorage. */
  /* תוקן: זהו המסך האחרון — כפתור "סיימתי!" נשאר במקום ולא מנווט לשום יעד. */
}

function dqx4Check() {
  if (dqx4Done) { resolveMoedAResult(); return; }
  const allFilled = DQX4_TARGET_IDS.every(function (tId) {
    return DQX4_DRAG_IDS.some(function (dId) { return dqx4Placement[dId] === tId; });
  });
  if (!allFilled) return;
  dqx4Checked = true;
  dqx4Attempts++;

  let allCorrect = true;
  let dqx4OkCount = 0;
  DQX4_TARGET_IDS.forEach(function (tId) {
    const validId = DQX4_CORRECT_MAP[tId];
    let placedId = null;
    DQX4_DRAG_IDS.forEach(function (dId) { if (dqx4Placement[dId] === tId) placedId = dId; });
    const ok = placedId === validId;
    if (!ok) allCorrect = false; else dqx4OkCount++;
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add(ok ? 'correct' : 'incorrect'); }
  });
  dqx4Render();

  const btn = document.getElementById('dqx4-check');
  if (allCorrect) {
    dqx4Done = true;
    dqx4ShowFeedback('ممتاز!', 'أكملتم بنجاح ادّعاءً علميًا\nمبنيًا على المعطيات.', 'correct');
    stationProgress[4] = 'success';
    updateQuestionNav('s4');
    if (btn) { btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = resolveMoedAResult; }
  } else if (dqx4Attempts < 2) {
    dqx4ShowFeedback(dqx4OkCount > 0 ? 'الإجابة صحيحة جزئيًا.' : 'الإجابة غير صحيحة.', 'هل نحاول مرة أخرى؟', 'wrong');
    dqx4Checked = false;
    dqx4Render();
    if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
  } else {
    dqx4Done = true;
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה
       הנכונה, המשוב המלא נפתח מיד, והכפתור "מעבר לתשובה שלי" משחזר
       את תשובת הלומד (snapshot). */
    dqx4AnswerSnapshot = Object.assign({}, dqx4Placement);
    dqx4ApplyCorrect();
    dqx4ShowingCorrect = true;
    dqx4ShowFeedback(fbCorrectShown(dqx4OkCount > 0 ? 'الإجابة صحيحة جزئيًا.' : 'الإجابة غير صحيحة.'), 'لا بأس، هذه فرصة للتعلم.', 'wrong');
    stationProgress[4] = 'fail';
    updateQuestionNav('s4');
    if (btn) { btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = resolveMoedAResult; }
    const revealBtn = document.getElementById('dqx4-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
}

function dqx4ApplyCorrect() {
  DQX4_TARGET_IDS.forEach(function (tId) { dqx4Placement[DQX4_CORRECT_MAP[tId]] = tId; });
  const usedIds = DQX4_TARGET_IDS.map(function (tId) { return DQX4_CORRECT_MAP[tId]; });
  DQX4_DRAG_IDS.forEach(function (id) { if (usedIds.indexOf(id) === -1) dqx4Placement[id] = 'source'; });
  dqx4Render();
  DQX4_TARGET_IDS.forEach(function (tId) {
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add('correct'); }
  });
}

function dqx4ApplySnapshot() {
  DQX4_DRAG_IDS.forEach(function (id) { dqx4Placement[id] = dqx4AnswerSnapshot[id]; });
  dqx4Render();
  DQX4_TARGET_IDS.forEach(function (tId) {
    const validId = DQX4_CORRECT_MAP[tId];
    let placedId = null;
    DQX4_DRAG_IDS.forEach(function (dId) { if (dqx4Placement[dId] === tId) placedId = dId; });
    const ok = placedId === validId;
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add(ok ? 'correct' : 'incorrect'); }
  });
}

/* §9: המשוב לא משתנה בזמן הטוגל — רק ערכי הלוח ותווית הכפתור. */
function dqx4ToggleReveal() {
  const revealBtn = document.getElementById('dqx4-reveal-btn');
  if (dqx4ShowingCorrect) {
    dqx4ApplySnapshot();
    dqx4ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    dqx4ApplyCorrect();
    dqx4ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function resetScreenState4() {
  updateQuestionNav('s4');
  if (!s4AnimPlayed) {
    s4AnimPlayed = true;
    const s4El = document.getElementById('s4');
    s4El.classList.add('s5-anim');
    setTimeout(function () { s4El.classList.remove('s5-anim'); }, 900);
  }
  if (dqx4Done) {
    const btn = document.getElementById('dqx4-check');
    if (btn) { btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = resolveMoedAResult; }
    dqx4Render();
    const revealBtn = document.getElementById('dqx4-reveal-btn');
    if (revealBtn) {
      if (dqx4AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = dqx4ShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return;
  }
  const hasProgress = dqx4Attempts > 0 || Object.keys(dqx4Placement).some(function (id) { return dqx4Placement[id] !== 'source'; });
  if (hasProgress) { dqx4Render(); return; } /* התקדמות קיימת — לא מאפסים */
  dqx4Checked = false;
  dqx4Attempts = 0;
  dqx4AnswerSnapshot = null;
  dqx4ShowingCorrect = false;
  DQX4_DRAG_IDS.forEach(function (id) { dqx4Placement[id] = 'source'; });
  DQX4_TARGET_IDS.forEach(function (tId) {
    const zone = document.getElementById(tId);
    if (zone) zone.classList.remove('correct', 'incorrect', 'filled', 'drag-hover');
  });
  document.getElementById('dqx4-popup').classList.remove('visible');
  const btn = document.getElementById('dqx4-check');
  if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; btn.onclick = dqx4Check; }
  const revealBtn = document.getElementById('dqx4-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  dqx4Render();
  /* מחווה מונפשת (Gesture Hints, SELF-QA.md §7) — גרירה, מעל הפריט
     הראשון במאגר (dqx4Order[0], לפי הסדר-בפועל שבו dqx4Render מציג
     את הפריטים), פעם אחת במסך הזה. */
  gestureHintShow('s4-drag', 'drag', document.getElementById(dqx4Order[0]));
}

scqFbMakeDraggable('dqx4-popup');

/* אתחול */
scaleApp();
resetScreenState(0);
/* ניווט חוצה-סינים (בקשה מפורשת): הגעה דרך "חזרה" מסיין 6 אינה
   קיימת (סיין 6 הוא ענף-מותנה של מועד ב, לא חלק מהזרימה 1↔2↔3↔4↔5) —
   אבל "חזרה" מסיין 4 עדיין נכנס ישירות למסך האחרון כאן. */
if (new URLSearchParams(window.location.search).get('start') === 'last') {
  goTo(TOTAL_SCREENS - 1);
}
