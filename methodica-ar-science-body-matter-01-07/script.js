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
  /* כל מסך محتوى נוסף יקבל כאן ענף resetScreenStateN() משלו */
}

/* מסך 1 — דמות בווידאו אמיתי "מטפסת על הר, לקראת הפסגה" (green-avatar-
   climbing-mountain.mp4/turquoise-avatar-climbing-mountain.mp4, סופקו
   בפועל — אותו נכס בדיוק כמו מסך 1 בסיין 5), אותו חוזה
   resolveCharBubbleVideo כמו בשאר הפרויקט. */
const S0_AVATAR_ASSETS = {
  'character-1': '../unit-assets/video/green-avatar-climbing-mountain.mp4',
  'character-2': '../unit-assets/video/turquoise-avatar-climbing-mountain.mp4'
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

function gestureHintShow(key, type, targetEl) {
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
let s1LastWrong = null; // Retry gate (guide §8.8 rule 9): the option id of the last non-final wrong attempt, persisted as `lw`

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
  checkBtn.disabled = (id === s1LastWrong); // Retry gate: the same wrong answer cannot be resubmitted
  checkBtn.onclick = s1Check;
}

function s1ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s1-popup');
  const data = S1.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* A repaint (resume / goTo painter) re-displays an existing feedback — never move a box the learner dragged. */
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
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('001', 'q1', s1Selected === S1.correctId,
    s1Selected === S1.correctId || s1Attempts >= S1.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s1Selected === S1.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s1Phase = 'correct';
    s1Done = true;
    s1LastWrong = null;
    s1LockOptions();
    s1ShowFeedback('correct', true);
    s1SetBarDone('متابعة', s1Continue);
    stationProgress[1] = 'success';
    updateQuestionNav('s1');
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s1Attempts < S1.maxAttempts) {
    s1Phase = 'wrong1';
    s1LastWrong = s1Selected; // Retry gate (rule 9)
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
    s1LastWrong = null;
    s1LockOptions();
    s1ShowFeedback('wrong2', false);
    s1SetBarDone('متابعة', s1Continue);
    stationProgress[1] = 'fail';
    updateQuestionNav('s1');
  }
  try { flushResumeSave(); } catch (e) {}
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
  if (s1Done || s1Attempts > 0 || s1Selected) return; // resume-state guard
  s1Selected = null;
  s1Attempts = 0;
  s1Phase = 'before';
  s1LastWrong = null;
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

/* Escape סוגר הצצת-تلميح פתוחה של מסך 2 — מוסכמת הפרויקט */
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
let s2LastWrong = null; // Retry gate (guide §8.8 rule 9): the option id of the last non-final wrong attempt, persisted as `lw`

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
  checkBtn.disabled = (id === s2LastWrong); // Retry gate: the same wrong answer cannot be resubmitted
  checkBtn.onclick = s2Check;
}

function s2ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s2-popup');
  const data = S2.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* A repaint (resume / goTo painter) re-displays an existing feedback — never move a box the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s2-popup');
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
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('001', 'q2', s2Selected === S2.correctId,
    s2Selected === S2.correctId || s2Attempts >= S2.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s2Selected === S2.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s2Phase = 'correct';
    s2Done = true;
    s2LastWrong = null;
    s2LockOptions();
    s2ShowFeedback('correct', true);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[2] = 'success';
    updateQuestionNav('s2');
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s2Attempts < S2.maxAttempts) {
    s2Phase = 'wrong1';
    s2LastWrong = s2Selected; // Retry gate (rule 9)
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
    s2LastWrong = null;
    s2LockOptions();
    s2ShowFeedback('wrong2', false);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[2] = 'fail';
    updateQuestionNav('s2');
  }
  try { flushResumeSave(); } catch (e) {}
}

function s2OpenHint() {
  if (s2Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q2');
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
  const hintBtn = document.getElementById('s2-hint');
  hintBtn.hidden = true;
  document.getElementById('s2-hint-overlay').hidden = true;
}

scqFbMakeDraggable('s2-popup');

/* Escape סוגר הצצת-تلميح פתוחה של מסך 3 — מוסכמת הפרויקט */
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
/* xAPI result.response: blank number → its visible .dpq-words stem (= metadata 001/q3 answers.source,
   byte for byte). The selected values are already the metadata answers.target strings. */
const S3_STEM_LABELS = {
  1: 'خلط المسحوق بالماء',
  2: 'تقريب المغناطيس من المسحوق',
  3: 'فحص ما إذا كان المزيج صافيًا أم عكرًا'
};
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
let s3LastWrong = null; // Retry gate (guide §8.8 rule 9): signature of the last non-final wrong attempt, persisted as `lw`

/* Retry-gate signature — `1=value|2=value|3=value` (blank order, the selected text; '' when empty). */
function s3Sig() {
  return [1, 2, 3].map(function (n) { return n + '=' + (s3Answers[n] || ''); }).join('|');
}

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
  if (btn && !s3Done) btn.disabled = !(s3Answers[1] && s3Answers[2] && s3Answers[3]) || s3Sig() === s3LastWrong; // Retry gate
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
  /* A repaint (resume / goTo painter) re-displays an existing feedback — never move a box the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s3-popup');
  box.classList.add('visible');
}

/* The three outcomes' feedback (§9 partial-credit keys). Shared by s3Check and the resume painter
   (paintDropdown), so a repaint shows exactly the title the learner saw. */
function s3ShowResult(kind, okCount) {
  if (kind === 'correct') s3ShowFeedback('correct', true);
  else if (kind === 'wrong1') s3ShowFeedback(okCount > 0 ? 'wrong1partial' : 'wrong1', false);
  else s3ShowFeedback(okCount > 0 ? 'wrong2partial' : 'wrong2', false);
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
      ? '../unit-assets/img/icon-dropdown-correct.svg'
      : '../unit-assets/img/icon-dropdown-incorrect.svg';
    if (!ok) allCorrect = false;
  });

  /* xAPI: matching — one pair per blank (stem → selected text); after the blank loop, before any branch. */
  xapiAnswered('001', 'q3', allCorrect, allCorrect || s3Attempts >= 2,
    { pairs: [1, 2, 3].map(function (n) { return { source: S3_STEM_LABELS[n], target: s3Answers[n] || '' }; }) });

  if (allCorrect) {
    s3Done = true;
    s3LastWrong = null;
    s3LockBlanks();
    s3ShowResult('correct', 3);
    s3SetBarDone('متابعة', s3Continue);
    stationProgress[3] = 'success';
    updateQuestionNav('s3');
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  const s3CorrectCount = [1, 2, 3].filter(function (n) { return s3Answers[n] === S3_CORRECT[n]; }).length;
  if (s3Attempts < 2) {
    s3LastWrong = s3Sig(); // Retry gate (rule 9)
    s3ShowResult('wrong1', s3CorrectCount);
    document.getElementById('s3-check').disabled = true;
  } else {
    [1, 2, 3].forEach(function (n) {
      const blank = s3BlankEl(n);
      blank.classList.remove('correct', 'incorrect');
      blank.classList.add(S3_CORRECT[n] === s3Answers[n] ? 'correct' : 'incorrect');
    });
    s3Done = true;
    s3LastWrong = null;
    s3LockBlanks();
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה
       הנכונה, המשוב המלא נפתח מיד, והכפתור "מעבר לתשובה שלי" משחזר
       את תשובת הלומד (snapshot). */
    s3AnswerSnapshot = { 1: s3Answers[1], 2: s3Answers[2], 3: s3Answers[3] };
    s3ApplyCorrect();
    s3ShowingCorrect = true;
    s3ShowResult('wrong2', s3CorrectCount);
    s3SetBarDone('متابعة', s3Continue);
    stationProgress[3] = 'fail';
    updateQuestionNav('s3');
    const revealBtn = document.getElementById('s3-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  try { flushResumeSave(); } catch (e) {}
}

function s3ApplyCorrect() {
  [1, 2, 3].forEach(function (n) {
    const blank = s3BlankEl(n);
    blank.querySelector('.dpq-trigger-text').textContent = S3_CORRECT[n];
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add('correct');
    blank.querySelector('.dpq-trigger-icon').src = '../unit-assets/img/icon-dropdown-correct.svg';
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
      ? '../unit-assets/img/icon-dropdown-correct.svg'
      : '../unit-assets/img/icon-dropdown-incorrect.svg';
  });
}

/* §9: המשוב لا משתנה בזמן הטוגל — רק ערכי הלוח ותווית הכפתור. */
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
  try { flushResumeSave(); } catch (e) {} // §8.10: which of the two views is on screen is state
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
  s3LastWrong = null;
  [1, 2, 3].forEach(function (n) {
    const blank = s3BlankEl(n);
    blank.classList.remove('open', 'correct', 'incorrect', 'disabled');
    blank.querySelector('.dpq-trigger-text').textContent = '';
    blank.querySelector('.dpq-trigger-icon').src = '../unit-assets/img/icon-dropdown-chevron.svg';
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
let s4LastWrong = null; // Retry gate (guide §8.8 rule 9): the option id of the last non-final wrong attempt, persisted as `lw`

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
  checkBtn.disabled = (id === s4LastWrong); // Retry gate: the same wrong answer cannot be resubmitted
  checkBtn.onclick = s4Check;
}

function s4ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s4-popup');
  const data = S4.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* A repaint (resume / goTo painter) re-displays an existing feedback — never move a box the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s4-popup');
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
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('001', 'q4', s4Selected === S4.correctId,
    s4Selected === S4.correctId || s4Attempts >= S4.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s4Selected === S4.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s4Phase = 'correct';
    s4Done = true;
    s4LastWrong = null;
    s4LockOptions();
    s4ShowFeedback('correct', true);
    stationProgress[4] = 'success';
    updateQuestionNav('s4');
    const btn = document.getElementById('s4-check');
    btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = s4Finish;
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s4Attempts < S4.maxAttempts) {
    s4Phase = 'wrong1';
    s4LastWrong = s4Selected; // Retry gate (rule 9)
    s4ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s4-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s4Check;
  } else {
    s4OptEl(S4.correctId).classList.add('correct');
    s4Phase = 'wrong-final';
    s4Done = true;
    s4LastWrong = null;
    s4LockOptions();
    s4ShowFeedback('wrong2', false);
    stationProgress[4] = 'fail';
    updateQuestionNav('s4');
    const btn = document.getElementById('s4-check');
    btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = s4Finish;
  }
  try { flushResumeSave(); } catch (e) {}
}

/* The part's last click (s4Check done branches, resetScreenState4 and the resume painter share it). */
function s4Finish() {
  partFinish(document.getElementById('s4-check'));
}

function resetScreenState4() {
  updateQuestionNav('s4');
  if (s4Done) {
    const btn = document.getElementById('s4-check');
    if (btn) { btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = s4Finish; }
    return;
  }
  if (s4Attempts > 0 || s4Selected) return; // resume-state guard
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

/* אתחול */
scaleApp();
resetScreenState(0);


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד, נקראים בזמן call על ידי ../unit-js/ (guide §6.1). SCREEN_TO_SUBCONTENT מחזיק
   בדיוק TOTAL_SCREENS מפתחות (5) — מפתח חסר = מסך שלא מדווח, בשקט; _test/verify-report.js
   אוכף זאת. Value[0] = סיומת הפריט (מחרוזת 3 ספרות), value[1] = עמוד-בפריט (תיעוד בלבד),
   null = מסך בלי פריט בקטלוג. מסכי מעבר/נרטיב ממופים לפריט שהם שייכים לו (D-2: כל פריט בקטלוג
   מקבל מסך; שני המסלולים של סין 01 — קריאה s4 / סרטון s10 — שייכים לפריט 002). מקור:
   docs-and-tools/METADATA-AUDIT.md §2. */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],
  1: ['001', 2],
  2: ['001', 3],
  3: ['001', 4],
  4: ['001', 5]
};

var XAPI_COMP_SLUG = 'methodica-ar-science-body-matter-01-07';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-ar-science-body-matter-01-07.json';
var XAPI_END_BTN = 's4-check';                               /* the part's last button (D-8, restoreEndedButton) */

/* תוצאת הרכיב ל-completed (§6.4 — המכנה הוא מה שהלומד הובטח). */
function xapiPartResult() {
  /* מועד ב: אותן 4 תחנות ואותו סף (3 מתוך 4) כמו במועד א. */
  var ok = [1, 2, 3, 4].filter(function (k) { return stationProgress[k] === 'success'; }).length;
  return { success: ok >= 3, score: { scaled: ok / 4 } };
}

/* הלחיצה האחרונה של הסין: מדווח completed ועוצר. Kata מסירה את הרכיב ומנתבת (§6.5, §8.12).
   אין window.close, אין alert, אין ניווט — ההמשך לסין הבא חי רק תחת DEV_NAV (סיור מקומי). */
function partFinish(btn) {
  try { xapiEndComponent(xapiPartResult(), btn || document.getElementById(XAPI_END_BTN)); } catch (e) { console.error('[xAPI] partFinish', e); }
  try { flushResumeSave(); } catch (e) {}
}


/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-10-19): currentScreen, XAPI_Q_RESULTS ומפות ההתקדמות.
   שלב ב' (2026-10-19): משתני התשובה של כל מסך (`screens`, מפתח = קידומת המסך) + צייר אחד לכל סוג
   אינטראקציה (§8.8): paintScq (s1, s2, s4), paintDropdown (s3). הציירים מקבלים את הקונפיגורציה
   כפרמטר (rule 7), לעולם לא מאפסים מצב (rule 5), מציירים גם בחירות ממתינות (rule 4), גוזרים את
   הכפתור מהפרדיקט החי כולל שער ה-Retry (`lw`, rule 9), מציירים סימוני-טעות רק כל עוד התשובה
   הנוכחית היא זו שהוגשה (rule 10), ולעולם לא זורקים (try/catch → console.error('[resume] paint …')).

   ── טבלת המצב ──
   s1 : selected, attempts, done, phase, lw                                   (single choice)
   s2 : selected, attempts, done, phase, lw                                   (single choice)
   s3 : answers{1,2,3}, attempts, done, snapshot, showingCorrect, lw          (dropdowns; labels = DOM, applyResumeDom)
   s4 : selected, attempts, done, phase, lw                                   (single choice; the finale — 'انتهيت!' → partFinish)
   מסך 0 — מעבר בלי מצב. אין שערי וידאו/זמן בסין הזה. */

function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    stationProgress: Object.assign({}, stationProgress),
    screens: {
      s1: { selected: s1Selected, attempts: s1Attempts, done: s1Done, phase: s1Phase, lw: s1LastWrong },
      s2: { selected: s2Selected, attempts: s2Attempts, done: s2Done, phase: s2Phase, lw: s2LastWrong },
      s3: { answers: Object.assign({}, s3Answers), attempts: s3Attempts, done: s3Done,
            snapshot: s3AnswerSnapshot ? Object.assign({}, s3AnswerSnapshot) : null,
            showingCorrect: s3ShowingCorrect, lw: s3LastWrong },
      s4: { selected: s4Selected, attempts: s4Attempts, done: s4Done, phase: s4Phase, lw: s4LastWrong }
    }
  };
}

/* Safe with a partial / older payload: without `screens` only stage A applies. Never touches the DOM. */
function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults) Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  if (st.stationProgress) Object.keys(st.stationProgress).forEach(function (k) { stationProgress[k] = st.stationProgress[k]; });
  var sc = st.screens;
  if (!sc || typeof sc !== 'object') return;
  var q, n;
  if (sc.s1) {
    q = sc.s1;
    s1Selected = (typeof q.selected === 'string') ? q.selected : null;
    s1Attempts = q.attempts | 0;
    s1Done = !!q.done;
    s1Phase = (typeof q.phase === 'string') ? q.phase : 'before';
    s1LastWrong = (typeof q.lw === 'string') ? q.lw : null;
  }
  if (sc.s2) {
    q = sc.s2;
    s2Selected = (typeof q.selected === 'string') ? q.selected : null;
    s2Attempts = q.attempts | 0;
    s2Done = !!q.done;
    s2Phase = (typeof q.phase === 'string') ? q.phase : 'before';
    s2LastWrong = (typeof q.lw === 'string') ? q.lw : null;
  }
  if (sc.s3) {
    q = sc.s3;
    for (n = 1; n <= 3; n++) s3Answers[n] = (q.answers && typeof q.answers[n] === 'string') ? q.answers[n] : null;
    s3Attempts = q.attempts | 0;
    s3Done = !!q.done;
    s3AnswerSnapshot = (q.snapshot && typeof q.snapshot === 'object')
      ? { 1: q.snapshot[1] || null, 2: q.snapshot[2] || null, 3: q.snapshot[3] || null } : null;
    s3ShowingCorrect = !!q.showingCorrect;
    s3LastWrong = (typeof q.lw === 'string') ? q.lw
      : ((s3Attempts > 0 && !s3Done) ? s3Sig() : null);   // old-doc fallback (rule 9)
  }
  if (sc.s4) {
    q = sc.s4;
    s4Selected = (typeof q.selected === 'string') ? q.selected : null;
    s4Attempts = q.attempts | 0;
    s4Done = !!q.done;
    s4Phase = (typeof q.phase === 'string') ? q.phase : 'before';
    s4LastWrong = (typeof q.lw === 'string') ? q.lw : null;
  }
}

/* What lives only in the DOM (§8.9): the custom dropdowns' visible labels (written only by click handlers). */
function applyResumeDom(st) {
  if (!st || !st.screens || typeof st.screens !== 'object') return;
  if (st.screens.s3) {
    try { s3PaintLabels(s3DisplayedValues()); } catch (e) { console.error('[resume] dom s3', e); }
  }
}

/* The values the learner sees on the s3 board: the solution while the reveal toggle shows it,
   the learner's own answer (snapshot) after a final wrong attempt, the live answers otherwise (§8.10). */
function s3DisplayedValues() {
  if (s3Done && s3AnswerSnapshot) return s3ShowingCorrect ? S3_CORRECT : s3AnswerSnapshot;
  return s3Answers;
}
function s3PaintLabels(values) {
  [1, 2, 3].forEach(function (n) {
    var blank = s3BlankEl(n);
    var label = blank && blank.querySelector('.dpq-trigger-text');
    if (label) label.textContent = values[n] || '';
  });
}

/* One branch per screen (rule 11); every painter takes its config as a parameter (rule 7). The configs
   are built lazily — a module-level const would be in its TDZ for an early goTo. */
function restoreScreenUI(n) {
  if (n === 1) paintScq(s1PaintCfg());
  else if (n === 2) paintScq(s2PaintCfg());
  else if (n === 3) paintDropdown(s3PaintCfg());
  else if (n === 4) paintScq(s4PaintCfg());
}

function s1PaintCfg() {
  return {
    prefix: 's1', correctId: S1.correctId,
    get: function () { return { selected: s1Selected, attempts: s1Attempts, done: s1Done, phase: s1Phase, lw: s1LastWrong }; },
    optEl: s1OptEl, lock: s1LockOptions, unlock: s1UnlockOptions, showFeedback: s1ShowFeedback,
    check: s1Check, doneLabel: 'متابعة', doneHandler: s1Continue
  };
}
function s2PaintCfg() {
  return {
    prefix: 's2', correctId: S2.correctId,
    get: function () { return { selected: s2Selected, attempts: s2Attempts, done: s2Done, phase: s2Phase, lw: s2LastWrong }; },
    optEl: s2OptEl, lock: s2LockOptions, unlock: s2UnlockOptions, showFeedback: s2ShowFeedback,
    check: s2Check, doneLabel: 'متابعة', doneHandler: s2Continue
  };
}
function s4PaintCfg() {
  return {
    prefix: 's4', correctId: S4.correctId,
    get: function () { return { selected: s4Selected, attempts: s4Attempts, done: s4Done, phase: s4Phase, lw: s4LastWrong }; },
    optEl: s4OptEl, lock: s4LockOptions, unlock: s4UnlockOptions, showFeedback: s4ShowFeedback,
    check: s4Check, doneLabel: 'انتهيت!', doneHandler: s4Finish
  };
}
function s3PaintCfg() {
  return {
    prefix: 's3', blanks: [1, 2, 3], correct: S3_CORRECT,
    get: function () { return { answers: s3Answers, attempts: s3Attempts, done: s3Done, snapshot: s3AnswerSnapshot, showingCorrect: s3ShowingCorrect, lw: s3LastWrong }; },
    blankEl: s3BlankEl, sig: s3Sig, displayed: s3DisplayedValues, showResult: s3ShowResult,
    check: s3Check, doneLabel: 'متابعة', doneHandler: s3Continue
  };
}

/* ── painter: single choice ──
   Mirrors the DOM writes of sNSelect / sNCheck only. Clean-screen guard = nothing picked (never attempts===0). */
function paintScq(cfg) {
  try {
    var st = cfg.get();
    if (!st.done && !st.selected) return;
    var opts = document.querySelectorAll('#' + cfg.prefix + ' .scq-opt');
    var btn = document.getElementById(cfg.prefix + '-check');
    var hint = document.getElementById(cfg.prefix + '-hint');
    var popup = document.getElementById(cfg.prefix + '-popup');
    var sel = st.selected ? cfg.optEl(st.selected) : null;
    opts.forEach(function (el) { el.classList.remove('selected', 'wrong', 'correct'); el.setAttribute('aria-checked', 'false'); });
    if (st.done) {
      var isCorrect = (st.selected === cfg.correctId);          // from the recorded selection (rule 1)
      if (sel) { sel.classList.add(isCorrect ? 'correct' : 'wrong'); sel.setAttribute('aria-checked', 'true'); }
      if (!isCorrect) { var c = cfg.optEl(cfg.correctId); if (c) c.classList.add('correct'); }
      cfg.lock();
      cfg.showFeedback(isCorrect ? 'correct' : 'wrong2', isCorrect);   // rule 8: the all-correct branch too
      if (btn) { btn.textContent = cfg.doneLabel; btn.disabled = false; btn.onclick = cfg.doneHandler; }
      if (hint) hint.hidden = true;
      return;
    }
    /* not solved: pending pick or a rejected first attempt */
    cfg.unlock();   // resetScreenStateN skips the unlock when a selection exists — after a reload the inline onclick is still there, but a locked DOM never is
    var onWrong = st.phase === 'wrong1' && !!st.lw && st.selected === st.lw;   // rule 10
    if (sel) { sel.classList.add(onWrong ? 'wrong' : 'selected'); sel.setAttribute('aria-checked', 'true'); }
    if (onWrong) cfg.showFeedback('wrong1', false);
    else if (popup) popup.classList.remove('visible');
    if (btn) {
      btn.textContent = 'هل إجابتي صحيحة؟';
      btn.onclick = cfg.check;
      btn.disabled = !st.selected || st.selected === st.lw;   // the live predicate incl. the Retry gate (rules 2, 9)
    }
    if (hint) hint.hidden = !(st.attempts > 0);
  } catch (e) { console.error('[resume] paint ' + cfg.prefix, e); }
}

/* ── painter: custom dropdowns ──
   Mirrors sNSelect (labels), sNCheck (marks, lock, feedback, button), ApplyCorrect/ApplySnapshot (the reveal toggle, §8.10). */
function paintDropdown(cfg) {
  try {
    var st = cfg.get();
    var any = cfg.blanks.some(function (n) { return !!st.answers[n]; });
    if (!st.done && !any) return;
    var btn = document.getElementById(cfg.prefix + '-check');
    var hint = document.getElementById(cfg.prefix + '-hint');
    var popup = document.getElementById(cfg.prefix + '-popup');
    var reveal = document.getElementById(cfg.prefix + '-reveal-btn');
    var finalWrong = st.done && !!st.snapshot;
    var shown = cfg.displayed();
    var submitted = {};
    if (!st.done && st.lw) st.lw.split('|').forEach(function (p) { var i = p.indexOf('='); if (i > 0) submitted[p.slice(0, i)] = p.slice(i + 1); });
    var okCount = 0, allFilled = true;
    cfg.blanks.forEach(function (n) {
      var blank = cfg.blankEl(n);
      if (!blank) return;
      var val = shown[n] || '';
      var label = blank.querySelector('.dpq-trigger-text');
      var icon = blank.querySelector('.dpq-trigger-icon');
      if (label) label.textContent = val;
      if (!st.answers[n]) allFilled = false;
      blank.classList.remove('open', 'correct', 'incorrect', 'disabled');
      var mark = null;
      if (st.done) mark = (val === cfg.correct[n]) ? 'correct' : 'incorrect';
      else if (st.attempts > 0 && st.lw && submitted[String(n)] === (st.answers[n] || '')) {   // rule 10: only the submitted answer keeps its mark
        mark = (st.answers[n] === cfg.correct[n]) ? 'correct' : 'incorrect';
      }
      if (mark === 'correct') okCount++;
      if (mark) {
        blank.classList.add(mark);
        if (icon) icon.src = mark === 'correct' ? '../unit-assets/img/icon-dropdown-correct.svg' : '../unit-assets/img/icon-dropdown-incorrect.svg';
        if (mark === 'correct') blank.classList.add('disabled');   // §5.3: a right blank is locked
      } else if (icon) icon.src = '../unit-assets/img/icon-dropdown-chevron.svg';
      if (st.done) blank.classList.add('disabled');
    });
    if (st.done) {
      if (finalWrong) {
        var snapOk = cfg.blanks.filter(function (n) { return st.snapshot[n] === cfg.correct[n]; }).length;
        cfg.showResult('wrong2', snapOk);
      } else cfg.showResult('correct', okCount);
      if (btn) { btn.textContent = cfg.doneLabel; btn.disabled = false; btn.onclick = cfg.doneHandler; }
      if (hint) hint.hidden = true;
      if (reveal) { reveal.hidden = !finalWrong; if (finalWrong) reveal.textContent = st.showingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة'; }
      return;
    }
    var onWrong = st.attempts > 0 && !!st.lw && cfg.sig() === st.lw;
    if (onWrong) cfg.showResult('wrong1', okCount);
    else if (popup) popup.classList.remove('visible');
    if (btn) {
      btn.textContent = 'هل إجابتي صحيحة؟';
      btn.onclick = cfg.check;
      btn.disabled = !allFilled || cfg.sig() === st.lw;   // the live predicate incl. the Retry gate (rules 2, 9)
    }
    if (hint) hint.hidden = !(st.attempts > 0);
    if (reveal) reveal.hidden = true;
  } catch (e) { console.error('[resume] paint ' + cfg.prefix, e); }
}
