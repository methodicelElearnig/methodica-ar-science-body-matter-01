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
  /* כל מסך محتوى נוסף יקבל כאן ענף resetScreenStateN() משלו */
}

/* מסך 1 — דמות בווידאו אמיתי "מטפסת על הר, לקראת הפסגה" (green-avatar-
   climbing-mountain.mp4/turquoise-avatar-climbing-mountain.mp4, סופקו
   בפועל), אותו חוזה resolveCharBubbleVideo כמו בשאר הפרויקט. */
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
/* xAPI result.response: blank number → its visible .dpq-words stem (= metadata 001/q2 answers.source,
   byte for byte). The selected values are already the metadata answers.target strings. */
const S2_STEM_LABELS = {
  1: 'سطح المدرسة هو',
  2: 'البلاستيك الذي ستصنع منه الطبقة هو',
  3: 'الموصلية الحرارية المنخفضة هي'
};
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
let s2LastWrong = null; // Retry gate (guide §8.8 rule 9): signature of the last non-final wrong attempt, persisted as `lw`

/* Retry-gate signature — `1=value|2=value|3=value` (blank order, the selected text; '' when empty). */
function s2Sig() {
  return [1, 2, 3].map(function (n) { return n + '=' + (s2Answers[n] || ''); }).join('|');
}

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
  if (btn && !s2Done) btn.disabled = !(s2Answers[1] && s2Answers[2] && s2Answers[3]) || s2Sig() === s2LastWrong; // Retry gate
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
  /* A repaint (resume / goTo painter) re-displays an existing feedback — never move a box the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s2-popup');
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
      ? '../unit-assets/img/icon-dropdown-correct.svg'
      : '../unit-assets/img/icon-dropdown-incorrect.svg';
    if (!ok) allCorrect = false;
  });

  /* xAPI: matching — one pair per blank (stem → selected text); after the blank loop, before any branch. */
  xapiAnswered('001', 'q2', allCorrect, allCorrect || s2Attempts >= 2,
    { pairs: [1, 2, 3].map(function (n) { return { source: S2_STEM_LABELS[n], target: s2Answers[n] || '' }; }) });

  if (allCorrect) {
    s2Done = true;
    s2LastWrong = null;
    s2LockBlanks();
    s2ShowFeedback('correct', true);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[2] = 'success';
    updateQuestionNav('s2');
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  if (s2Attempts < 2) {
    s2LastWrong = s2Sig(); // Retry gate (rule 9)
    s2ShowResult('wrong1', s2OkCount);
    document.getElementById('s2-check').disabled = true;
    document.getElementById('s2-hint').hidden = false;
  } else {
    [1, 2, 3].forEach(function (n) {
      const blank = s2BlankEl(n);
      blank.classList.remove('correct', 'incorrect');
      blank.classList.add(S2_CORRECT[n] === s2Answers[n] ? 'correct' : 'incorrect');
    });
    s2Done = true;
    s2LastWrong = null;
    s2LockBlanks();
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה
       הנכונה, המשוב המלא נפתח מיד, והכפתור "מעבר לתשובה שלי" משחזר
       את תשובת הלומד (snapshot). */
    s2AnswerSnapshot = { 1: s2Answers[1], 2: s2Answers[2], 3: s2Answers[3] };
    s2ApplyCorrect();
    s2ShowingCorrect = true;
    s2ShowResult('wrong2', s2OkCount);
    s2SetBarDone('متابعة', s2Continue);
    stationProgress[2] = 'fail';
    updateQuestionNav('s2');
    const revealBtn = document.getElementById('s2-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  try { flushResumeSave(); } catch (e) {}
}

/* The wrong-attempt feedback by the partial-credit rule (§9): the title depends on how many blanks were
   right in THAT attempt. Shared by s2Check and the resume painter (paintDropdown), so a repaint shows
   exactly the title the learner saw. */
function s2ShowResult(kind, okCount) {
  if (kind === 'wrong1') {
    S2_FEEDBACK.wrong1 = okCount > 0
      ? { title: 'الإجابة صحيحة جزئيًا.', body: 'هل نحاول مرة أخرى؟' }
      : { title: 'الإجابة غير صحيحة.', body: 'هل نحاول مرة أخرى؟' };
    s2ShowFeedback('wrong1', false);
  } else if (kind === 'wrong2') {
    S2_FEEDBACK.wrong2.title = fbCorrectShown(okCount > 0 ? 'الإجابة صحيحة جزئيًا.' : 'الإجابة غير صحيحة.');
    s2ShowFeedback('wrong2', false);
  } else {
    s2ShowFeedback('correct', true);
  }
}

function s2ApplyCorrect() {
  [1, 2, 3].forEach(function (n) {
    const blank = s2BlankEl(n);
    blank.querySelector('.dpq-trigger-text').textContent = S2_CORRECT[n];
    blank.classList.remove('correct', 'incorrect');
    blank.classList.add('correct');
    blank.querySelector('.dpq-trigger-icon').src = '../unit-assets/img/icon-dropdown-correct.svg';
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
      ? '../unit-assets/img/icon-dropdown-correct.svg'
      : '../unit-assets/img/icon-dropdown-incorrect.svg';
  });
}

/* §9: המשוב لا משתנה בזמן הטוגל — רק ערכי הלוח ותווית הכפתור. */
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
  try { flushResumeSave(); } catch (e) {} // §8.10: which of the two views is on screen is state
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
  s2LastWrong = null;
  [1, 2, 3].forEach(function (n) {
    const blank = s2BlankEl(n);
    blank.classList.remove('open', 'correct', 'incorrect', 'disabled');
    blank.querySelector('.dpq-trigger-text').textContent = '';
    blank.querySelector('.dpq-trigger-icon').src = '../unit-assets/img/icon-dropdown-chevron.svg';
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

/* Escape סוגר הצצת-تلميح פתוחה של מסך 3 — מוסכמת הפרויקט */
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
let s3LastWrong = null; // Retry gate (guide §8.8 rule 9): the option id of the last non-final wrong attempt, persisted as `lw`
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
  checkBtn.disabled = (id === s3LastWrong); // Retry gate: the same wrong answer cannot be resubmitted
  checkBtn.onclick = s3Check;
}

function s3ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s3-popup');
  const data = S3.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  /* A repaint (resume / goTo painter) re-displays an existing feedback — never move a box the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('s3-popup');
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
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('001', 'q3', s3Selected === S3.correctId,
    s3Selected === S3.correctId || s3Attempts >= S3.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s3Selected === S3.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s3Phase = 'correct';
    s3Done = true;
    s3LastWrong = null;
    s3LockOptions();
    s3ShowFeedback('correct', true);
    s3SetBarDone('متابعة', s3Continue);
    stationProgress[3] = 'success';
    updateQuestionNav('s3');
    try { flushResumeSave(); } catch (e) {}
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s3Attempts < S3.maxAttempts) {
    s3Phase = 'wrong1';
    s3LastWrong = s3Selected; // Retry gate (rule 9)
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
    s3LastWrong = null;
    s3LockOptions();
    s3ShowFeedback('wrong2', false);
    s3SetBarDone('متابعة', s3Continue);
    stationProgress[3] = 'fail';
    updateQuestionNav('s3');
  }
  try { flushResumeSave(); } catch (e) {}
}

function s3OpenHint() {
  if (s3Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q3');
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
  const hintBtn = document.getElementById('s3-hint');
  hintBtn.hidden = true;
  document.getElementById('s3-hint-overlay').hidden = true;
}

scqFbMakeDraggable('s3-popup');

/* Escape סוגר הצצת-تلميح פתוחה של מסך 4 — מוסכמת הפרויקט */
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
/* xAPI result.response: slot id → the visible stem the metadata names for it (= metadata 001/q4
   answers.target, byte for byte); DQX4_LABELS are the answers.source words. */
const DQX4_SLOT_LABELS = {
  'dqx4-target-1': 'المادة المناسبة لتغطية السطح هي',
  'dqx4-target-2': '(موصلية حرارية منخفضة وانعكاس ضوء عال)',
  'dqx4-target-3': '(مقاومة عالية للماء)',
  'dqx4-target-4': '(قابلية كسر منخفضة)'
};

let dqx4Placement = {};
DQX4_DRAG_IDS.forEach(function (id) { dqx4Placement[id] = 'source'; });
let dqx4DragActive = null;
let dqx4DropHandled = false;
let dqx4Checked = false;
let dqx4Attempts = 0;
let dqx4Done = false;
let dqx4AnswerSnapshot = null;
let dqx4ShowingCorrect = false; // true = הלוח מציג כרגע את התשובה הנכונה (§9)
let dqx4LastWrong = null; // Retry gate (guide §8.8 rule 9): board signature of the last non-final wrong attempt, persisted as `lw`
let s4AnimPlayed = false;

let dqx4Order = DQX4_DRAG_IDS.slice();
(function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
})(dqx4Order);

/* Retry-gate signature — `1=label | 2=label | …` (slot order, the label of the card in it, '—' when empty).
   Compares by label, exactly as the grading does. */
function dqx4Sig() {
  return DQX4_TARGET_IDS.map(function (tId) {
    let placed = null;
    DQX4_DRAG_IDS.forEach(function (d) { if (dqx4Placement[d] === tId) placed = d; });
    return tId.replace(/^.*-target-/, '') + '=' + (placed ? DQX4_LABELS[placed] : '—');
  }).join(' | ');
}

/* How many slots hold the right card — for the partial-credit titles (§9). */
function dqx4CountOk(placement) {
  return DQX4_TARGET_IDS.filter(function (tId) { return placement[DQX4_CORRECT_MAP[tId]] === tId; }).length;
}

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
  if (btn && !dqx4Done) btn.disabled = !allFilled || dqx4Sig() === dqx4LastWrong; // Retry gate (rule 9)
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
  /* A repaint (resume / goTo painter) re-displays an existing feedback — never move a box the learner dragged. */
  if (!(typeof resumeIsPainting === 'function' && resumeIsPainting())) scqFbResetPosition('dqx4-popup');
  box.classList.add('visible');
}

/* The three outcomes' feedback (§9 partial-credit titles). Shared by dqx4Check and the resume painter
   (paintDragSlots), so a repaint shows exactly the title the learner saw. */
function dqx4ShowResult(kind, okCount) {
  if (kind === 'correct') {
    dqx4ShowFeedback('ممتاز!', 'أكملتم بنجاح ادّعاءً علميًا\nمبنيًا على المعطيات.', 'correct');
  } else if (kind === 'wrong1') {
    dqx4ShowFeedback(okCount > 0 ? 'الإجابة صحيحة جزئيًا.' : 'الإجابة غير صحيحة.', 'هل نحاول مرة أخرى؟', 'wrong');
  } else {
    dqx4ShowFeedback(fbCorrectShown(okCount > 0 ? 'الإجابة صحيحة جزئيًا.' : 'الإجابة غير صحيحة.'), 'لا بأس، هذه فرصة للتعلم.', 'wrong');
  }
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
  /* The verdict goes through setUnitResult (document + cache, D-12); then the component's completed
     with success = passed, score = 3-of-4 promised on screen (§6.4). The button stays disabled. */
  try {
    if (typeof setUnitResult === 'function') setUnitResult(MOED_A_RESULT_KEY, passed ? 'true' : 'false');
    else localStorage.setItem(MOED_A_RESULT_KEY, passed ? 'true' : 'false');
  } catch (e) { /* localStorage חסום — נמשיך בלי שמירה */ }
  partFinish(document.getElementById('dqx4-check'));
  /* תוקן (2026-09-28): מסך 6 (s5, מסך מעבר חגיגי למסלול-הצלחה בלבד)
     הוסר — עבר/נכשל מנווטים כעת יחד ישירות לסיין 6, ההבחנה נשמרת רק
     דרך MOED_A_RESULT_KEY ב-localStorage. */
  /* תוקן: זהו המסך האחרון — כפתור "انتهيت!" נשאר במקום ולא מנווט לשום יעד. */
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

  /* xAPI: after the slot loop (allCorrect final). Pair = word → stem of the slot it sits in ('' if in the bank). */
  xapiAnswered('001', 'q4', allCorrect, allCorrect || dqx4Attempts >= 2,
    { pairs: DQX4_DRAG_IDS.map(function (dId) {
      return { source: DQX4_LABELS[dId], target: DQX4_SLOT_LABELS[dqx4Placement[dId]] || '' };
    }) });

  const btn = document.getElementById('dqx4-check');
  if (allCorrect) {
    dqx4Done = true;
    dqx4LastWrong = null;
    dqx4ShowResult('correct', dqx4OkCount);
    stationProgress[4] = 'success';
    updateQuestionNav('s4');
    if (btn) { btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = resolveMoedAResult; }
  } else if (dqx4Attempts < 2) {
    dqx4LastWrong = dqx4Sig(); // Retry gate (rule 9) — before the render that derives the button
    dqx4ShowResult('wrong1', dqx4OkCount);
    dqx4Checked = false;
    dqx4Render();
    if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
  } else {
    dqx4Done = true;
    dqx4LastWrong = null;
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי חושף מיד את התשובה
       הנכונה, המשוב המלא נפתח מיד, והכפתור "מעבר לתשובה שלי" משחזר
       את תשובת הלומד (snapshot). */
    dqx4AnswerSnapshot = Object.assign({}, dqx4Placement);
    dqx4ApplyCorrect();
    dqx4ShowingCorrect = true;
    dqx4ShowResult('wrong2', dqx4OkCount);
    stationProgress[4] = 'fail';
    updateQuestionNav('s4');
    if (btn) { btn.textContent = 'انتهيت!'; btn.disabled = false; btn.onclick = resolveMoedAResult; }
    const revealBtn = document.getElementById('dqx4-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  try { flushResumeSave(); } catch (e) {}
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

/* §9: המשוב لا משתנה בזמן הטוגל — רק ערכי הלוח ותווית הכפתור. */
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
  try { flushResumeSave(); } catch (e) {} // §8.10: which of the two views is on screen is state
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
  if (hasProgress) { dqx4Render(); return; } /* התקדמות קיימת — لا מאפסים */
  dqx4Checked = false;
  dqx4Attempts = 0;
  dqx4AnswerSnapshot = null;
  dqx4ShowingCorrect = false;
  dqx4LastWrong = null;
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
/* Dev walkthrough only (guide §8.12): the platform launches each component on its own. */
if (typeof DEV_NAV !== 'undefined' && DEV_NAV &&
    new URLSearchParams(window.location.search).get('start') === 'last') {
  goTo(TOTAL_SCREENS - 1);
}


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

var XAPI_COMP_SLUG = 'methodica-ar-science-body-matter-01-06';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-ar-science-body-matter-01-06.json';
var XAPI_END_BTN = 'dqx4-check';                               /* the part's last button (D-8, restoreEndedButton) */

/* תוצאת הרכיב ל-completed (§6.4 — המכנה הוא מה שהלומד הובטח). */
function xapiPartResult() {
  /* מועד א: 4 תחנות, הסף שמוצג ללומד הוא 3 מתוך 4 (resolveMoedAResult). המכנה = מה שהובטח. */
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
   אינטראקציה (§8.8): paintScq (s1, s3), paintDropdown (s2), paintDragSlots (dqx4). הציירים מקבלים את
   הקונפיגורציה כפרמטר (rule 7), לעולם לא מאפסים מצב (rule 5), מציירים גם בחירות ממתינות (rule 4),
   גוזרים את הכפתור מהפרדיקט החי כולל שער ה-Retry (`lw`, rule 9), מציירים סימוני-טעות רק כל עוד
   התשובה הנוכחית היא זו שהוגשה (rule 10), ולעולם לא זורקים (try/catch → console.error('[resume] paint …')).

   ── טבלת המצב ──
   s1   : selected, attempts, done, phase, lw                                   (single choice)
   s2   : answers{1,2,3}, attempts, done, snapshot, showingCorrect, lw          (dropdowns; labels = DOM, applyResumeDom)
   s3   : selected, attempts, done, phase, lw                                   (single choice)
   dqx4 : placement, order (הערבוב — לא מערבבים מחדש), checked, attempts, done, snapshot, showingCorrect, lw
   מסך 0 — מעבר בלי מצב. אין שערי וידאו/זמן בסין הזה. */

function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    stationProgress: Object.assign({}, stationProgress),
    screens: {
      s1: { selected: s1Selected, attempts: s1Attempts, done: s1Done, phase: s1Phase, lw: s1LastWrong },
      s2: { answers: Object.assign({}, s2Answers), attempts: s2Attempts, done: s2Done,
            snapshot: s2AnswerSnapshot ? Object.assign({}, s2AnswerSnapshot) : null,
            showingCorrect: s2ShowingCorrect, lw: s2LastWrong },
      s3: { selected: s3Selected, attempts: s3Attempts, done: s3Done, phase: s3Phase, lw: s3LastWrong },
      dqx4: { placement: Object.assign({}, dqx4Placement), order: dqx4Order.slice(), checked: dqx4Checked,
              attempts: dqx4Attempts, done: dqx4Done,
              snapshot: dqx4AnswerSnapshot ? Object.assign({}, dqx4AnswerSnapshot) : null,
              showingCorrect: dqx4ShowingCorrect, lw: dqx4LastWrong }
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
    for (n = 1; n <= 3; n++) s2Answers[n] = (q.answers && typeof q.answers[n] === 'string') ? q.answers[n] : null;
    s2Attempts = q.attempts | 0;
    s2Done = !!q.done;
    s2AnswerSnapshot = (q.snapshot && typeof q.snapshot === 'object')
      ? { 1: q.snapshot[1] || null, 2: q.snapshot[2] || null, 3: q.snapshot[3] || null } : null;
    s2ShowingCorrect = !!q.showingCorrect;
    s2LastWrong = (typeof q.lw === 'string') ? q.lw
      : ((s2Attempts > 0 && !s2Done) ? s2Sig() : null);   // old-doc fallback (rule 9)
  }
  if (sc.s3) {
    q = sc.s3;
    s3Selected = (typeof q.selected === 'string') ? q.selected : null;
    s3Attempts = q.attempts | 0;
    s3Done = !!q.done;
    s3Phase = (typeof q.phase === 'string') ? q.phase : 'before';
    s3LastWrong = (typeof q.lw === 'string') ? q.lw : null;
  }
  if (sc.dqx4) {
    q = sc.dqx4;
    DQX4_DRAG_IDS.forEach(function (id) {
      var v = q.placement ? q.placement[id] : null;
      dqx4Placement[id] = (v === 'source' || DQX4_TARGET_IDS.indexOf(v) !== -1) ? v : 'source';
    });
    /* The dealt order is state (§8.9): a re-shuffle on restore would move the bank under the learner. */
    if (Array.isArray(q.order) && q.order.length === DQX4_DRAG_IDS.length &&
        q.order.every(function (id) { return DQX4_DRAG_IDS.indexOf(id) !== -1; }) &&
        q.order.filter(function (id, i, a) { return a.indexOf(id) === i; }).length === DQX4_DRAG_IDS.length) {
      dqx4Order = q.order.slice();
    }
    dqx4Checked = !!q.checked;
    dqx4Attempts = q.attempts | 0;
    dqx4Done = !!q.done;
    dqx4AnswerSnapshot = null;
    if (q.snapshot && typeof q.snapshot === 'object') {
      dqx4AnswerSnapshot = {};
      DQX4_DRAG_IDS.forEach(function (id) {
        var v = q.snapshot[id];
        dqx4AnswerSnapshot[id] = (v === 'source' || DQX4_TARGET_IDS.indexOf(v) !== -1) ? v : 'source';
      });
    }
    dqx4ShowingCorrect = !!q.showingCorrect;
    dqx4LastWrong = (typeof q.lw === 'string') ? q.lw
      : ((dqx4Attempts > 0 && !dqx4Done) ? dqx4Sig() : null);   // old-doc fallback (rule 9)
  }
}

/* What lives only in the DOM (§8.9): the custom dropdowns' visible labels (written only by click handlers)
   and the drag board (DOM is rebuilt from the model by dqx4Render). Each block is guarded on its own —
   no early return before the dropdown block. */
function applyResumeDom(st) {
  if (!st || !st.screens || typeof st.screens !== 'object') return;
  if (st.screens.s2) {
    try { s2PaintLabels(s2DisplayedValues()); } catch (e) { console.error('[resume] dom s2', e); }
  }
  if (st.screens.dqx4) {
    try { dqx4Render(); } catch (e) { console.error('[resume] dom dqx4', e); }
  }
}

/* The values the learner sees on the s2 board: the solution while the reveal toggle shows it,
   the learner's own answer (snapshot) after a final wrong attempt, the live answers otherwise (§8.10). */
function s2DisplayedValues() {
  if (s2Done && s2AnswerSnapshot) return s2ShowingCorrect ? S2_CORRECT : s2AnswerSnapshot;
  return s2Answers;
}
function s2PaintLabels(values) {
  [1, 2, 3].forEach(function (n) {
    var blank = s2BlankEl(n);
    var label = blank && blank.querySelector('.dpq-trigger-text');
    if (label) label.textContent = values[n] || '';
  });
}

/* One branch per screen (rule 11); every painter takes its config as a parameter (rule 7). The configs
   are built here, lazily — a module-level const would be in its TDZ for the DEV_NAV goTo above. */
function restoreScreenUI(n) {
  if (n === 1) paintScq(s1PaintCfg());
  else if (n === 2) paintDropdown(s2PaintCfg());
  else if (n === 3) paintScq(s3PaintCfg());
  else if (n === 4) paintDragSlots(dqx4PaintCfg());
}

function s1PaintCfg() {
  return {
    prefix: 's1', correctId: S1.correctId,
    get: function () { return { selected: s1Selected, attempts: s1Attempts, done: s1Done, phase: s1Phase, lw: s1LastWrong }; },
    optEl: s1OptEl, lock: s1LockOptions, unlock: s1UnlockOptions, showFeedback: s1ShowFeedback,
    check: s1Check, doneLabel: 'متابعة', doneHandler: s1Continue
  };
}
function s3PaintCfg() {
  return {
    prefix: 's3', correctId: S3.correctId,
    get: function () { return { selected: s3Selected, attempts: s3Attempts, done: s3Done, phase: s3Phase, lw: s3LastWrong }; },
    optEl: s3OptEl, lock: s3LockOptions, unlock: s3UnlockOptions, showFeedback: s3ShowFeedback,
    check: s3Check, doneLabel: 'متابعة', doneHandler: s3Continue
  };
}
function s2PaintCfg() {
  return {
    prefix: 's2', blanks: [1, 2, 3], correct: S2_CORRECT,
    get: function () { return { answers: s2Answers, attempts: s2Attempts, done: s2Done, snapshot: s2AnswerSnapshot, showingCorrect: s2ShowingCorrect, lw: s2LastWrong }; },
    blankEl: s2BlankEl, sig: s2Sig, displayed: s2DisplayedValues, showResult: s2ShowResult,
    check: s2Check, doneLabel: 'متابعة', doneHandler: s2Continue
  };
}
function dqx4PaintCfg() {
  return {
    prefix: 'dqx4', targets: DQX4_TARGET_IDS, drags: DQX4_DRAG_IDS, labels: DQX4_LABELS, correctMap: DQX4_CORRECT_MAP,
    get: function () { return { placement: dqx4Placement, attempts: dqx4Attempts, done: dqx4Done, snapshot: dqx4AnswerSnapshot, showingCorrect: dqx4ShowingCorrect, lw: dqx4LastWrong }; },
    sig: dqx4Sig, countOk: dqx4CountOk, render: dqx4Render, showResult: dqx4ShowResult,
    check: dqx4Check, doneLabel: 'انتهيت!', doneHandler: resolveMoedAResult
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

/* ── painter: drag words to slots ──
   The board itself is drawn by the live render (cards, ghosts, locks, `filled`, the button through the live
   predicate incl. the Retry gate). Here: the slot marks of the submitted attempt (rule 10), the feedback,
   the done button and the reveal toggle (§8.10). */
function paintDragSlots(cfg) {
  try {
    var st = cfg.get();
    var placedAny = cfg.drags.some(function (d) { return st.placement[d] !== 'source'; });
    if (!st.done && !placedAny && !(st.attempts > 0)) return;
    var btn = document.getElementById(cfg.prefix + '-check');
    var popup = document.getElementById(cfg.prefix + '-popup');
    var reveal = document.getElementById(cfg.prefix + '-reveal-btn');
    var finalWrong = st.done && !!st.snapshot;
    var submitted = {};
    if (!st.done && st.lw) st.lw.split(' | ').forEach(function (p) { var i = p.indexOf('='); if (i > 0) submitted[p.slice(0, i)] = p.slice(i + 1); });
    cfg.targets.forEach(function (tId) {
      var zone = document.getElementById(tId);
      if (!zone) return;
      zone.classList.remove('correct', 'incorrect', 'drag-hover', 'drag-origin');
      var placedId = null;
      cfg.drags.forEach(function (d) { if (st.placement[d] === tId) placedId = d; });
      var ok = placedId === cfg.correctMap[tId];
      if (st.done) {
        zone.classList.add((finalWrong && st.showingCorrect) ? 'correct' : (ok ? 'correct' : 'incorrect'));
        return;
      }
      var label = placedId ? cfg.labels[placedId] : '—';
      if (st.attempts > 0 && st.lw && submitted[tId.replace(/^.*-target-/, '')] === label) zone.classList.add(ok ? 'correct' : 'incorrect');
    });
    cfg.render();   // after the marks: `filled` is only added to unmarked slots, as in live play
    if (st.done) {
      if (finalWrong) cfg.showResult('wrong2', cfg.countOk(st.snapshot));
      else cfg.showResult('correct', cfg.countOk(st.placement));
      if (btn) { btn.textContent = cfg.doneLabel; btn.disabled = false; btn.onclick = cfg.doneHandler; }
      if (reveal) { reveal.hidden = !finalWrong; if (finalWrong) reveal.textContent = st.showingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة'; }
      return;
    }
    var onWrong = st.attempts > 0 && !!st.lw && cfg.sig() === st.lw;
    if (onWrong) cfg.showResult('wrong1', cfg.countOk(st.placement));
    else if (popup) popup.classList.remove('visible');
    if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.onclick = cfg.check; }   // disabled: set by cfg.render() through the live predicate
    if (reveal) reveal.hidden = true;
  } catch (e) { console.error('[resume] paint ' + cfg.prefix, e); }
}
