'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 8; // יעודכן עם כל מסך תוכן שנוסף
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
   Turquoise-avatar-lifting-light-eights.mp4, סופקו בפועל) — אותו
   חוזה בדיוק כמו מסך 2/9/10/18 (resolveCharBubbleVideo).
   ========================================================= */
const TS21_AVATAR_ASSETS = {
  'character-1': 'assets/videos/green-avatar-lifting-light-weights.mp4',
  'character-2': 'assets/videos/Turquoise-avatar-lifting-light-eights.mp4'
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
    '<img class="gesture-hint-ring-big" src="assets/images/gesture-ring-big' + suffix + '.svg" alt="">' +
    '<img class="gesture-hint-ring-small" src="assets/images/gesture-ring-small' + suffix + '.svg" alt="">' +
    '<img class="gesture-hint-hand" src="assets/images/gesture-hand.svg" alt="">';
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
  checkBtn.disabled = false;
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

  if (s23Selected === S23.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s23Phase = 'correct';
    s23Done = true;
    s23LockOptions();
    s23ShowFeedback('correct', true);
    s23SetBarDone('متابعة', s23Continue);
    stationProgress2[1] = 'success';
    updateQuestionNav2('s23');
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s23Attempts < S23.maxAttempts) {
    s23Phase = 'wrong1';
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
    s23LockOptions();
    s23ShowFeedback('wrong2', false);
    s23SetBarDone('متابعة', s23Continue);
    stationProgress2[1] = 'fail';
    updateQuestionNav2('s23');
  }
}

function s23OpenHint() {
  if (s23Done) return;
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
  checkBtn.disabled = false;
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

  if (s24Selected === S24.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s24Phase = 'correct';
    s24Done = true;
    s24LockOptions();
    s24ShowFeedback('correct', true);
    s24SetBarDone('متابعة', s24Continue);
    stationProgress2[1] = 'success';
    updateQuestionNav2('s24');
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s24Attempts < S24.maxAttempts) {
    s24Phase = 'wrong1';
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
    s24LockOptions();
    s24ShowFeedback('wrong2', false);
    s24SetBarDone('متابعة', s24Continue);
    stationProgress2[1] = 'fail';
    updateQuestionNav2('s24');
  }
}

function s24OpenHint() {
  if (s24Done) return;
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
  checkBtn.disabled = false;
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

  if (s25Selected === S25.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s25Phase = 'correct';
    s25Done = true;
    s25LockOptions();
    s25ShowFeedback('correct', true);
    s25SetBarDone('متابعة', s25Continue);
    stationProgress2[2] = 'success';
    updateQuestionNav2('s25');
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s25Attempts < S25.maxAttempts) {
    s25Phase = 'wrong1';
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
    s25LockOptions();
    s25ShowFeedback('wrong2', false);
    s25SetBarDone('متابعة', s25Continue);
    stationProgress2[2] = 'fail';
    updateQuestionNav2('s25');
  }
}

function s25OpenHint() {
  if (s25Done) return;
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

  if (s26SetsEqual(s26Selected, S26.correctSet)) {
    s26Selected.forEach(function (id) {
      s26OptEl(id).classList.add('correct');
      s26OptEl(id).classList.remove('selected');
    });
    s26Phase = 'correct';
    s26Done = true;
    s26LockOptions();
    s26ShowFeedback('correct', true);
    s26SetBarDone('متابعة', s26Continue);
    stationProgress2[3] = 'success';
    updateQuestionNav2('s26');
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
    s26LockOptions();
    s26ShowFeedback(isPartial ? 'wrong2Partial' : 'wrong2Full', false);
    s26SetBarDone('متابعة', s26Continue);
    const revealBtn = document.getElementById('s26-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
    stationProgress2[3] = 'fail';
    updateQuestionNav2('s26');
  }
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
   קלפים. מנגנון הגרירה שוכפל 1:1 ממסך 14 (ddq13*→ddq27*). היפוך
   (ddq27Flip) חד-כיווני, לפי ברירת המחדל של FlipCardsReveal — לא
   נדרש כדי לסמן/לבדוק תשובה (הבדיקה היא ברמת-אזור, בדיוק כמו מסך
   14), רק כדי לקרוא את הראיות בגב הקלף.
   ========================================================= */
const DDQ27_ITEM_IDS = ['ddq27-flint', 'ddq27-bone', 'ddq27-pottery', 'ddq27-copper'];

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
let ddq27DragId = null;
let ddq27AnswerSnapshot = null;
let ddq27Revealed = false;

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
  if (btn && !ddq27Done) btn.disabled = !ddq27AllPlaced();
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
  if (el) el.classList.toggle('is-flipped');
}

function ddq27DragStart(event, itemId) {
  if (ddq27Done) { event.preventDefault(); return; }
  gestureHintHide('s27-drag'); /* נעלם ברגע שהלומד מתחיל לגרור */
  /* תוקן (2026-08-05): First-attempt retry feedback dismissal — ראו
     ddq13DragStart לפירוט המלא. */
  if (ddq27Attempts > 0) document.getElementById('ddq27-popup').classList.remove('visible');
  ddq27DragId = itemId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', itemId);
  setTimeout(function () {
    const el = document.getElementById(itemId);
    if (el) el.classList.add('is-dragging');
  }, 0);
}

function ddq27DragEnd(itemId) {
  const el = document.getElementById(itemId);
  if (el) el.classList.remove('is-dragging');
  ddq27DragId = null;
}

function ddq27DragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function ddq27DragEnter(event, zoneId) {
  event.preventDefault();
  const zone = document.getElementById(zoneId);
  if (zone) zone.classList.add('drag-over');
}

function ddq27DragLeave(event, zoneId) {
  const zone = document.getElementById(zoneId);
  if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('drag-over');
}

function ddq27Drop(event, targetZone) {
  event.preventDefault();
  if (ddq27Done) return;
  const itemId = event.dataTransfer.getData('text/plain') || ddq27DragId;
  if (!itemId) return;
  const zoneEl = document.getElementById('ddq27-zone-' + targetZone);
  const itemEl = document.getElementById(itemId);
  if (zoneEl && itemEl) {
    zoneEl.classList.remove('drag-over');
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    zoneEl.appendChild(itemEl);
  }
  ddq27UpdateCheckBtn();
  ddq27ClearZoneStates();
}

function ddq27DropToSource(event) {
  event.preventDefault();
  if (ddq27Done) return;
  const itemId = event.dataTransfer.getData('text/plain') || ddq27DragId;
  if (!itemId) return;
  const bank = document.getElementById('ddq27-source-bank');
  const itemEl = document.getElementById(itemId);
  if (itemEl && bank && itemEl.parentElement !== bank) {
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    bank.appendChild(itemEl);
  }
  ddq27UpdateCheckBtn();
  ddq27ClearZoneStates();
}

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

  if (allCorrect) {
    ddq27Done = true;
    ddq27ShowFeedback('correct', true);
    ddq27SetBarDone('متابعة', ddq27Continue);
    stationProgress2[4] = 'success';
    updateQuestionNav2('s27');
  } else if (ddq27Attempts < 2) {
    ddq27ShowFeedback(anyCorrect ? 'wrong1Partial' : 'wrong1', false);
    document.getElementById('ddq27-check').disabled = true;
    document.getElementById('s27-hint').hidden = false;
  } else {
    ddq27Done = true;
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
  ddq27DragId = null;
  ddq27AnswerSnapshot = null;
  ddq27Revealed = false;
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
  if (btn && !dqx28Done) btn.disabled = !allFilled;
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
  window.location.href = '../methodica-science-body-matter-01-03/index.html';
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

  const btn = document.getElementById('dqx28-check');
  if (allCorrect) {
    dqx28Done = true;
    dqx28ShowFeedback('ممتاز!', DQX28_SHARED_EXPLANATION, 'correct');
    stationProgress2[5] = 'success';
    updateQuestionNav2('s28');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
  } else if (dqx28Attempts < 2) {
    if (anyCorrect) dqx28ShowFeedback('الإجابة صحيحة جزئيًا.', 'هل نحاول مرة أخرى؟', 'wrong');
    else dqx28ShowFeedback('الإجابة غير صحيحة.', 'هل نحاول مرة أخرى؟', 'wrong');
    dqx28Checked = false;
    dqx28Render();
    if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
  } else {
    dqx28Done = true;
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

/* אתחול */
scaleApp();
resetScreenState(0);
/* ניווט חוצה-סינים (בקשה מפורשת): "חזרה" מסיין 3 מגיע לכאן עם
   `?start=last` ומצפה למסך האחרון, לא למסך הראשון. */
if (new URLSearchParams(window.location.search).get('start') === 'last') {
  goTo(TOTAL_SCREENS - 1);
}
