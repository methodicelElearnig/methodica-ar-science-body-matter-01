'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 21; // יעודכן עם כל מסך محتوى שנוסף
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
  /* Leaving the video screen pauses the player: a real pause, closes the open 'played' (§6.9.2). */
  if (currentScreen === 10 && n !== 10 && s10Player && typeof s10Player.pauseVideo === 'function') {
    try { s10Player.pauseVideo(); } catch (e) {}
  }
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
    13: { done: ddq13Done, popup: 'ddq13-popup' },
    19: { done: s19Done, popup: 's19-popup' },
    20: { done: dqx20Done, popup: 'dqx20-popup' }
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
  if (n === 7) resetScreenState7();
  if (n === 8) resetScreenState8();
  if (n === 9) resetScreenState9();
  if (n === 10) resetScreenState10();
  if (n === 13) resetScreenState13();
  if (n === 15) resetScreenState15();
  if (n === 16) resetScreenState16();
  if (n === 17) resetScreenState17();
  if (n === 18) resetScreenState18();
  if (n === 19) resetScreenState19();
  if (n === 20) resetScreenState20();
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
   מסך 8 (s7) — דמות בווידאו אמיתי "חותכת" (green-avatar-cutter.mp4/
   turquoise-avatar-cutter.mp4, סופקו בפועל), ממוקמת שמאל-תחתון מעל
   הפס התחתון (ראו styles.css). מוצגת תמיד (visible ב-HTML), בלי
   גייטינג — למסך הזה אין אינטראקציית-בדיקה. */
const S7_AVATAR_ASSETS = {
  'character-1': 'assets/videos/green-avatar-cutter.mp4',
  'character-2': 'assets/videos/turquoise-avatar-cutter.mp4'
};

function resetScreenState7() {
  resolveCharBubbleVideo('s7-char-video', S7_AVATAR_ASSETS);
}

/* =========================================================
   מסך 1 — בחירת דמות מלווה (TwoOptionSelection). שוכפל ממסך 1 של
   Methodica-science-mass-measure-02-01 (יעד 2, "-linked") — לוגיקה
   זהה 1:1 (720-templates skill → TwoOptionSelection.md), עם ID לוגי
   character-1/character-2 (לא green/orange) ומפתח localStorage מתויג
   ללומדה (CHARACTER_STORAGE_KEY, ראו למעלה) במקום מפתח גנרי משותף.
   ========================================================= */

function resetScreenState0() {
  /* תמיד מסנכרן את ה-UI מ-window.lomdaState.selectedCharacter (לא "פעם
     אחת בלבד") — כך שחזרה למסך הזה אחרי בחירה משקפת נכון את המצב,
     לפי חוזה ה-Companion character system. */
  const chosen = window.lomdaState.selectedCharacter;
  document.querySelectorAll('#s0 .option-card').forEach(function (c) {
    const isChosen = c.dataset.value === chosen;
    c.classList.toggle('selected', isChosen);
    c.setAttribute('aria-checked', isChosen ? 'true' : 'false');
  });
  const btn = document.getElementById('s0-continue');
  if (btn) btn.disabled = !chosen;
}

function selectOption(cardEl) {
  document.querySelectorAll('#s0 .option-card').forEach(function (c) {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  cardEl.classList.add('selected');
  cardEl.setAttribute('aria-checked', 'true');
  window.lomdaState.selectedCharacter = cardEl.dataset.value;
  /* try/catch: localStorage חסום ב-SecurityError בפתיחה מ-file:// בחלק
     מהדפדפנים/opaque origins — שמירת ההעדפה בין הסינים היא nice-to-have,
     אין להפיל את מסך הבחירה אם היא נכשלת */
  /* The document is the truth (guide §8.1): setUnitCharacter writes memory + cache + Kata document,
     queued until the state layer is ready. Fallback keeps the old cache-only write. */
  try {
    if (typeof setUnitCharacter === 'function') setUnitCharacter(cardEl.dataset.value);
    else localStorage.setItem(CHARACTER_STORAGE_KEY, cardEl.dataset.value);
  } catch (e) {}
  const btn = document.getElementById('s0-continue');
  if (btn) btn.disabled = false;
}

function handleCardKey(event, cardEl) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectOption(cardEl);
  }
}

function advanceFromS0() {
  if (!window.lomdaState.selectedCharacter) return;
  goTo(1);
}

/* =========================================================
   מסך 2 — שאלה פתוחה עם שדה כתיבה חופשי (HookOpenQuestion, לפי Figma
   "720 - UI Templates" node 730:10392/10434/10484 — ראו הערה מלאה
   ב-index.html/ARCHITECTURE.md). **תוקן (2026-07-27):** שני הכפתורים
   כבר לא מסונכרנים ישירות — יש רצף דו-שלבי מפורש: הזנת טקסט מדליקה
   רק את הכפתור המקומי ("צדקתי?"); לחיצה עליו מאשרת את התשובה (בלי
   משוב אמיתי — ניסיון אחד) **ומדליקה** את הכפתור הגלובלי ("המשך");
   רק לחיצה על "המשך" מתקדמת בפועל למסך הבא. `oaqAnsweredState`
   (מפתח=prefix) הוא ה-resume-state: חזרה למסך אחרי אישור משאירה את
   "המשך" דלוק בלי לאפס. ========================================= */

const oaqAnsweredState = {}; // prefix -> boolean (true = locked in, one attempt used)

function oaqOnInput(prefix) {
  const field = document.getElementById(prefix + '-answer');
  const hasText = field && field.value.trim().length > 0;
  const btnLocal = document.getElementById(prefix + '-check-local');
  if (btnLocal) btnLocal.disabled = !hasText;
}

/* **תוקן (2026-07-28):** חשיפת הדמות+בועית (`.hoq-character-row`) הועברה
   לכאן — לפי בקשה מפורשת: "גם כאן וגם במסך 2 הדמות והבועית צריכות
   להופיע רק אחרי שלוחצים על צדקתי?" (נאמר על מסך 9, s8, אבל חל גם
   רטרואקטיבית על מסך 2, s1 — שני המסכים חולקים את הפונקציה הזו).
   ברירת המחדל ב-CSS היא display:none; class="visible" חושף.
   תוקן (2026-09-28, בקשה מפורשת: "לא צריך משוב בכלל לשאלה הזאת,
   וניסיון מענה אחד בלבד") — הוסרו לגמרי בדיקת-הנכונות, תיבת המשוב
   הירוקה/אדומה ומעקב-הניסיונות (OAQ_REQUIRED_WORDS/OAQ_MAX_ATTEMPTS/
   oaqIsCorrect/oaqShowFeedback, שהתווספו ב-2026-09-15) — חוזר לעיצוב
   המקורי: לחיצה על "צדקתי?" נועלת את התשובה מיד (ניסיון יחיד, בלי
   קשר לתוכן) ומדליקה את "המשך". */
function oaqCheck(prefix) {
  if (oaqAnsweredState[prefix]) return; // כבר "נעול"
  const field = document.getElementById(prefix + '-answer');
  if (!field || field.value.trim().length === 0) return;
  const row = document.querySelector('#' + prefix + ' .hoq-character-row');
  if (row) row.classList.add('visible');

  oaqAnsweredState[prefix] = true;
  field.disabled = true;
  const btnLocal = document.getElementById(prefix + '-check-local');
  if (btnLocal) btnLocal.disabled = true;
  const btn = document.getElementById(prefix + '-check');
  if (btn) btn.disabled = false;
  try { flushResumeSave(); } catch (e) {}   /* resume: the answer is committed (guide §8.8 / D-13) */
}

function oaqContinue(prefix) {
  if (!oaqAnsweredState[prefix]) return;
  goTo(currentScreen + 1);
}

/* דמות מלווה + בועית (Companion character system) — וידאו לופ מושתק,
   נבחר לפי window.lomdaState.selectedCharacter (נקבע במסך 1). */
const S1_CHAR_VIDEO_ASSETS = {
  'character-1': 'assets/videos/green-avatar-putting-on-glasses.mp4',
  'character-2': 'assets/videos/turquoise-avatar-putting-on-glasses.mp4'
};

/* resume-state: הטקסט עצמו נשאר ב-DOM (goTo לא הורס תוכן, רק מחליף
   .active) — כאן מסנכרנים מחדש את מצב הכפתור המקומי מהטקסט הקיים
   בפועל, ואת מצב הכפתור הגלובלי מ-oaqAnsweredState (לא מאופס בחזרה
   למסך), ומרעננים את וידאו הדמות (תמיד מהבחירה העדכנית). */
function resetScreenState1() {
  if (oaqAnsweredState['s1']) {
    const btnLocal = document.getElementById('s1-check-local');
    if (btnLocal) btnLocal.disabled = true;
  } else {
    oaqOnInput('s1');
  }
  const btn = document.getElementById('s1-check');
  if (btn) btn.disabled = !oaqAnsweredState['s1'];
  resolveCharBubbleVideo('s1-char-video', S1_CHAR_VIDEO_ASSETS);
}

/* =========================================================
   מסך 9 (s8) — שאלת תפריט נפתח (Dropdown), 2 שורות: "תכונות הגוף"/
   "תכונות החומר", מלווה בתמונה. **הוחלף (בקשה מפורשת) מ-HookOpenQuestion
   לשאלת dropdown** — התמונה המלווה נשארה. רכיב ה-dropdown עצמו הובא
   מ"מסך 8" (data-screen="7", id="s7") של Methodica-science-mass
   -measure-02-02 (יעד 2, סיין 2). תוכן: חיתוך משנה תכונות-גוף
   (אורך/מסה) אבל לא תכונות-חומר — לכן נכון(תכונות הגוף)="השתנו",
   נכון(תכונות החומר)="לא השתנו". **בלי כפתור רמז** (בקשה מפורשת),
   כמו ddq13 (מסך 14) באותו פרויקט. מנגנון הבדיקה/משוב שוכפל מ-S19
   (SingleChoiceQuestion) — 2 ניסיונות, פופ-אפ משוב משותף — עם סימון
   נכון/שגוי per-row (לא רק per-screen), כמו ddq13Check. ראו הערה
   מלאה ב-index.html/styles.css.
   ========================================================= */
const S8_ROWS = ['guf', 'homer'];
const S8_CORRECT = { guf: 'تغيرت', homer: 'لم تتغير' };
const S8_MAX_ATTEMPTS = 2;
/* xAPI result.response: the visible row stems (= metadata 002/q1 answers.source, byte for byte).
   The dropdown values themselves are already the metadata answers.target strings. */
const S8_STEM_LABELS = { guf: 'خصائص الجسم', homer: 'خصائص المادة' };
/* תוקן (2026-10-01, בקשה מפורשת, לפי Critical-requirement-lomda-building.md
   §5.2): בשאלת השלמת פסקה עם יותר מתפריט/אינפוט אחד — אם הלומד ענה
   נכון על חלק מהשורות (לא כולן), המשוב חייב לומר "התשובה נכונה חלקית",
   לא רק "לא נכונה" גורף. */
const S8_FEEDBACK = {
  correct: {
    title: 'صحيح!',
    body: 'بعد قطع السلك، تغيرت خصائص الجسم (السلك). على سبيل المثال، قلّ طوله وكتلته.\nمن ناحية أخرى، لم تتغير خصائص المادة (النحاس).'
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
    body: 'بعد قطع السلك، تغيرت خصائص الجسم (السلك). على سبيل المثال، قلّ طوله وكتلته.\nمن ناحية أخرى، لم تتغير خصائص المادة (النحاس).'
  },
  wrong2Partial: {
    title: fbCorrectShown('الإجابة صحيحة جزئيًا.'),
    body: 'بعد قطع السلك، تغيرت خصائص الجسم (السلك). على سبيل المثال، قلّ طوله وكتلته.\nمن ناحية أخرى، لم تتغير خصائص المادة (النحاس).'
  }
};

let s8Values = { guf: '', homer: '' };
let s8Attempts = 0;
let s8Done = false;
let s8Phase = 'before';
let s8AnswerSnapshot = null; // rowId -> {value, correct}, captured before the §9 reveal
let s8ShowingCorrect = false;
/* Retry gate (guide §8.8 rule 9, QA D-14): the signature of the answer submitted on the non-final
   wrong attempt; "هل إجابتي صحيحة؟" stays disabled while the current answer equals it. Persisted as `lw`. */
let s8LastWrong = null;

function s8Sig() {
  return S8_ROWS.map(function (id) { return id + '=' + (s8Values[id] || ''); }).join(' | ');
}

function s8DdClose(rowId) {
  document.getElementById('s8-dd-' + rowId + '-btn').setAttribute('aria-expanded', 'false');
  document.getElementById('s8-dd-' + rowId + '-opts').hidden = true;
}

function s8DdCloseAll() {
  S8_ROWS.forEach(s8DdClose);
}

function s8DdToggle(rowId) {
  if (s8Done) return;
  const btn = document.getElementById('s8-dd-' + rowId + '-btn');
  const opts = document.getElementById('s8-dd-' + rowId + '-opts');
  const isOpen = btn.getAttribute('aria-expanded') === 'true';
  s8DdCloseAll();
  btn.setAttribute('aria-expanded', String(!isOpen));
  opts.hidden = isOpen;
}

function s8DdSelect(rowId, val) {
  if (s8Done) return;
  /* נעילת סעיף שנענה נכון (2026-10-01, Critical-requirement §5.3). */
  if (document.getElementById('s8-dd-' + rowId + '-btn').classList.contains('correct')) return;
  const popup = document.getElementById('s8-popup');
  const wasWrong1 = popup.classList.contains('visible');
  s8Values[rowId] = val;
  document.getElementById('s8-dd-' + rowId + '-val').textContent = val;
  s8DdClose(rowId);
  document.getElementById('s8-dd-' + rowId + '-btn').classList.remove('wrong', 'correct');
  if (wasWrong1) popup.classList.remove('visible');
  const allSelected = S8_ROWS.every(function (id) { return s8Values[id] !== ''; });
  const checkBtn = document.getElementById('s8-check');
  checkBtn.disabled = !allSelected || s8Sig() === s8LastWrong;   /* Retry gate (rule 9) */
  checkBtn.onclick = s8Check;
}

// סוגר תפריט פתוח בלחיצה מחוץ ל-wrap שלו, כמו כל dropdown רגיל.
document.addEventListener('click', function (e) {
  S8_ROWS.forEach(function (rowId) {
    const wrap = document.getElementById('s8-dd-' + rowId);
    if (wrap && !wrap.contains(e.target)) s8DdClose(rowId);
  });
});

function s8ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s8-popup');
  const data = S8_FEEDBACK[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s8-popup');
  box.classList.add('visible');
}

function s8SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s8-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function s8LockDropdowns() {
  S8_ROWS.forEach(function (rowId) {
    document.getElementById('s8-dd-' + rowId + '-btn').disabled = true;
  });
}

function s8MarkDropdowns() {
  S8_ROWS.forEach(function (rowId) {
    const btn = document.getElementById('s8-dd-' + rowId + '-btn');
    btn.classList.toggle('correct', s8Values[rowId] === S8_CORRECT[rowId]);
    btn.classList.toggle('wrong', s8Values[rowId] !== S8_CORRECT[rowId]);
    btn.disabled = s8Values[rowId] === S8_CORRECT[rowId]; // §5.3: סעיף נכון ננעל
  });
}

function s8Continue() {
  goTo(9);
}

function s8Check() {
  if (s8Done) return;
  const allSelected = S8_ROWS.every(function (id) { return s8Values[id] !== ''; });
  if (!allSelected) return;
  s8Attempts++;
  const allCorrect = S8_ROWS.every(function (id) { return s8Values[id] === S8_CORRECT[id]; });
  /* xAPI: matching — one pair per blank (stem → selected text); after the attempt counter, before any branch. */
  xapiAnswered('005', 'q1', allCorrect, allCorrect || s8Attempts >= S8_MAX_ATTEMPTS,
    { pairs: S8_ROWS.map(function (id) { return { source: S8_STEM_LABELS[id], target: s8Values[id] || '' }; }) });

  if (allCorrect) {
    s8Done = true;
    s8LastWrong = null;
    s8MarkDropdowns();
    s8LockDropdowns();
    s8ShowFeedback('correct', true);
    s8SetBarDone('متابعة', s8Continue);
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }

  s8MarkDropdowns();
  const s8IsPartial = S8_ROWS.some(function (id) { return s8Values[id] === S8_CORRECT[id]; });

  if (s8Attempts < S8_MAX_ATTEMPTS) {
    s8LastWrong = s8Sig();   /* Retry gate (rule 9) */
    s8ShowFeedback(s8IsPartial ? 'wrong1Partial' : 'wrong1Full', false);
    document.getElementById('s8-check').disabled = true;
  } else {
    s8LastWrong = null;
    /* §9: ניסיון אחרון שגוי — snapshot של תשובת הלומד, ואז חשיפה מיידית של
       התשובה הנכונה בשני התפריטים, עם כפתור טוגל. */
    s8AnswerSnapshot = {};
    S8_ROWS.forEach(function (id) {
      s8AnswerSnapshot[id] = { value: s8Values[id], correct: s8Values[id] === S8_CORRECT[id] };
    });
    s8Done = true;
    s8Phase = 'wrong-final';
    s8RenderBoard(true);
    s8ShowFeedback(s8IsPartial ? 'wrong2Partial' : 'wrong2Full', false);
    s8SetBarDone('متابعة', s8Continue);
    const revealBtn = document.getElementById('s8-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) — one flush, after everything */
}

/* מצייר את הלוח: showCorrect=true → התשובות הנכונות; false → תשובת הלומד
   מה-snapshot עם correct/wrong per-row. התפריטים נשארים נעולים בשני המצבים. */
function s8RenderBoard(showCorrect) {
  S8_ROWS.forEach(function (rowId) {
    const btn = document.getElementById('s8-dd-' + rowId + '-btn');
    const snap = s8AnswerSnapshot[rowId];
    document.getElementById('s8-dd-' + rowId + '-val').textContent = showCorrect ? S8_CORRECT[rowId] : snap.value;
    btn.classList.remove('correct', 'wrong');
    btn.classList.add(showCorrect || snap.correct ? 'correct' : 'wrong');
    btn.disabled = true;
  });
  s8DdCloseAll();
  s8ShowingCorrect = showCorrect;
}

function s8ToggleReveal() {
  if (!s8Done || s8Phase !== 'wrong-final' || !s8AnswerSnapshot) return;
  const revealBtn = document.getElementById('s8-reveal-btn');
  s8RenderBoard(!s8ShowingCorrect);
  if (revealBtn) revealBtn.textContent = s8ShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
}

function resetScreenState8() {
  if (s8Done || s8Attempts > 0 || S8_ROWS.some(function (id) { return s8Values[id] !== ''; })) {
    // resume-state: שאלה שהתחילה لا נמחקת בחזרה למסך; מסנכרנים רק את כפתור החשיפה
    const rb = document.getElementById('s8-reveal-btn');
    if (rb) {
      if (s8Phase === 'wrong-final' && s8AnswerSnapshot) {
        rb.hidden = false;
        rb.textContent = s8ShowingCorrect ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        rb.hidden = true;
      }
    }
    return;
  }
  s8Values = { guf: '', homer: '' };
  s8Attempts = 0;
  s8Phase = 'before';
  s8AnswerSnapshot = null;
  s8ShowingCorrect = false;
  s8LastWrong = null;
  const rb0 = document.getElementById('s8-reveal-btn');
  if (rb0) rb0.hidden = true;
  S8_ROWS.forEach(function (rowId) {
    document.getElementById('s8-dd-' + rowId + '-val').textContent = '';
    const btn = document.getElementById('s8-dd-' + rowId + '-btn');
    btn.classList.remove('wrong', 'correct');
    btn.disabled = false;
  });
  s8DdCloseAll();
  document.getElementById('s8-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s8-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s8Check;
}

/* =========================================================
   מסך 10 — מסך מעבר: מסקנה (TransitionScreen). דמות מלווה בווידאו
   (לא תמונה סטטית כמו מסך 3) — reuse ישיר של S1_CHAR_VIDEO_ASSETS
   (אותם קבצי וידאו "מרכיבה משקפיים" שכבר בשימוש במסך 2).
   ========================================================= */
function resetScreenState9() {
  resolveCharBubbleVideo('s9-avatar-video', S1_CHAR_VIDEO_ASSETS);
}

/* לופ תמונות מתחלף — 7 תמונות "חפץ עשוי מהחומר הלא נכון" (לפי בקשת
   הלקוח), מתחלפות כל 3 שניות בלולאה אינסופית. רץ ברקע מרגע טעינת הדף
   (לא רק כשמסך 2 פעיל — קל בהרבה, בלי חוב-מצב, ולא מזיק כי הוא נוגע
   רק ב-#scq-img שממילא חי בתוך #s1). כפתור הזום (imgZoomOpen ב-script.js)
   משכפל את ה-DOM החי של המסגרת, כך שהוא תמיד מגדיל בדיוק את התמונה
   המוצגת כרגע — אין צורך לתאם עם data-zoom-src בנפרד, אבל מעדכנים אותו
   בכל זאת (עקביות/נגישות). הלופ (setInterval) ממשיך לרוץ ברצף גם כשה
   -modal פתוח, כי אף קוד לא עוצר אותו — התמונה בתוך ה-modal היא clone
   קפוא מרגע הפתיחה (לא live), כנדרש ("התמונה המוצגת כרגע" מתקבעת
   בלחיצה; הרקע הקטן ממשיך להתחלף מתחתיו). */
const S1_IMAGES = [
  { src: 'assets/images/hook-cartoon-chair.png', alt: 'كرسي مصنوع من الكرتون' },
  { src: 'assets/images/hook-fabric-house.png', alt: 'بيت بسقف مصنوع من قماش' },
  { src: 'assets/images/hook-glass-wheel.png', alt: 'دراجة بعجلات مصنوعة من الزجاج' },
  { src: 'assets/images/hook-paper-umbrella.png', alt: 'مظلة مصنوعة من ورق الجرائد' },
  { src: 'assets/images/hook-parachute.png', alt: 'مظلة هبوط مصنوعة من معدن' },
  { src: 'assets/images/hook-sponge-hook.png', alt: 'مطرقة برأس مصنوع من الإسفنج' },
  { src: 'assets/images/hook-stoon-boat.png', alt: 'قارب مصنوع من الحجر' }
];
let s1ImageIndex = 0;

function s1SetImage(index) {
  const img = document.getElementById('scq-img');
  const zoomBtn = document.querySelector('#s1 .img-zoom-btn');
  if (!img) return;
  const item = S1_IMAGES[index];
  img.src = item.src;
  img.alt = item.alt;
  if (zoomBtn) {
    zoomBtn.setAttribute('data-zoom-src', item.src);
    zoomBtn.setAttribute('data-zoom-alt', item.alt);
  }
}

function s1StartImageLoop() {
  s1SetImage(s1ImageIndex);
  setInterval(function () {
    s1ImageIndex = (s1ImageIndex + 1) % S1_IMAGES.length;
    s1SetImage(s1ImageIndex);
  }, 3000);
}

/* =========================================================
   מסך 3 — מסך מעבר (TransitionScreen), שוכפל ממסך 6 (id="s5") של
   Methodica-science-mass-measure-02-01. **תוקן (2026-07-28):** דמות
   בווידאו אמיתי ("מגדלת זכוכית, מסתכלת לצופה") — סופק בפועל, מחליף
   את ה-placeholder הסטטי הקודם.
   ========================================================= */
const TS2_AVATAR_ASSETS = {
  'character-1': 'assets/videos/green-avatar-magnifier.mp4',
  'character-2': 'assets/videos/turquoise-avatar-magnifier.mp4'
};

function resetScreenState2() {
  resolveCharBubbleVideo('s2-avatar-video', TS2_AVATAR_ASSETS);
}

/* =========================================================
   מסך 17 (s16) — טבלת השוואה: 2 חוטי נחושת. חשיפה הדרגתית (3 רמות:
   טקסט הקדמה/טבלה/תמונות), לפי בקשה מפורשת של הלקוח (שקף 21 בתסריט:
   "התוכן עולה בהדרגה"). **אותה טכניקה בדיוק כמו resetScreenState17
   למטה** — [data-tw17-level] + cf-visible/cf-animate-in/cfFloatIn
   הגלובליים (reuse ישיר, לא שוכפלו) — ראו הערה מלאה ב-index.html/
   styles.css. resume-state זהה: אחרי שהרצף רץ פעם אחת (s16Done), חזרה
   למסך מציגה הכול מיידית בלי להריץ טיימרים מחדש. */
let s16Done = false;
let s16Timers = [];

function resetScreenState16() {
  s16Timers.forEach(clearTimeout);
  s16Timers = [];

  const screen = document.getElementById('s16');
  const continueBtn = document.getElementById('s16-continue');
  if (!screen || !continueBtn) return;

  if (s16Done) {
    screen.querySelectorAll('[data-tw17-level]').forEach(function (el) {
      el.classList.add('cf-visible');
      el.classList.remove('cf-animate-in');
    });
    continueBtn.disabled = false;
    return;
  }

  screen.querySelectorAll('[data-tw17-level]').forEach(function (el) {
    el.classList.remove('cf-visible', 'cf-animate-in');
  });
  continueBtn.disabled = true;

  const STEP_MS = 700;
  const START_MS = 300;
  const ANIM_MS = 350;
  const LEVELS = 3;
  for (let level = 1; level <= LEVELS; level++) {
    const revealAt = START_MS + (level - 1) * STEP_MS;
    const t1 = setTimeout(function () {
      const levelEls = screen.querySelectorAll('[data-tw17-level="' + level + '"]');
      levelEls.forEach(function (el) {
        el.classList.add('cf-visible', 'cf-animate-in');
      });
      const t2 = setTimeout(function () {
        levelEls.forEach(function (el) { el.classList.remove('cf-animate-in'); });
      }, ANIM_MS);
      s16Timers.push(t2);

      if (level === LEVELS) {
        s16Done = true;
        continueBtn.disabled = false;
        try { flushResumeSave(); } catch (e) {}   /* resume: the gate is earned (rule 11) */
      }
    }, revealAt);
    s16Timers.push(t1);
  }
}

/* =========================================================
   מסך 18 (s17) — תרשים זרימה: גוף/חומר/תכונה. הבנייה בהדרגה **(עודכן,
   בקשה מפורשת של הלקוח): 10 צעדים דקים, לא 4 רמות גסות** — הרצף
   המקורי חשף את שני הענפים (כן+לא) של כל שאלה יחד עם שתי התוצאות
   שלהם בבת אחת, מה שהלקוח דיווח שקשה לקרוא. הרצף החדש עוקב אחר ענף
   "כן" עד לתוצאה שלו, ואז חושף את ענף "לא" יחד עם השאלה/תוצאה שהוא
   מוביל אליה, בכל שכבה (ראו מיפוי data-cf-level 1-10 ב-index.html):
   1=שאלה1, 2=כן+חץ(1), 3=גוף, 4=לא+חץ(1)+שאלה2, 5=כן+חץ(2), 6=חומר,
   7=לא+חץ(2)+שאלה3, 8=כן+חץ(3), 9=תכונה, 10=לא+חץ(3)+בדוק שוב.
   **קצב הואט במפורש** (STEP_MS 700→1200) לפי בקשה מפורשת ("קצב איטי
   של קריאה"). זו אנימציה פונקציונלית ייעודית שהמסך הזה מפעיל בעצמו —
   לא שייכת ל-animation-system הגנרי. כפתור "המשך" נעול עד שכל 10
   הצעדים עלו, לפי הנחיית ההפקה בשקף 22 ("כפתור המשך נדלק לאחר שכל
   התוכן עולה"). resume-state: אחרי שהרצף רץ פעם אחת (s17Done), חזרה
   למסך מציגה את התרשים המלא מיידית, בלי להריץ את הטיימרים מחדש —
   התוכן לא נמחק בין מסכים, ראו s17Timers.clearTimeout כהגנה מפני
   הרצה כפולה אם goTo(17) נקרא כמה פעמים ברצף. */
let s17Done = false;
let s17Timers = [];
const S17_STEPS = 10;

function resetScreenState17() {
  s17Timers.forEach(clearTimeout);
  s17Timers = [];

  const canvas = document.getElementById('s17-canvas');
  const continueBtn = document.getElementById('s17-continue');
  if (!canvas || !continueBtn) return;

  if (s17Done) {
    /* settled state only — never add .cf-animate-in here, or a
       display:none/block cycle (leaving/returning to this screen)
       would replay the float-in every time. */
    canvas.querySelectorAll('[data-cf-level]').forEach(function (el) {
      el.classList.add('cf-visible');
      el.classList.remove('cf-animate-in');
    });
    continueBtn.disabled = false;
    return;
  }

  canvas.querySelectorAll('[data-cf-level]').forEach(function (el) {
    el.classList.remove('cf-visible', 'cf-animate-in');
  });
  continueBtn.disabled = true;

  const STEP_MS = 1200;
  const START_MS = 500;
  const ANIM_MS = 350;
  for (let level = 1; level <= S17_STEPS; level++) {
    const revealAt = START_MS + (level - 1) * STEP_MS;
    const t1 = setTimeout(function () {
      const levelEls = canvas.querySelectorAll('[data-cf-level="' + level + '"]');
      levelEls.forEach(function (el) {
        el.classList.add('cf-visible', 'cf-animate-in');
      });
      const t2 = setTimeout(function () {
        levelEls.forEach(function (el) { el.classList.remove('cf-animate-in'); });
      }, ANIM_MS);
      s17Timers.push(t2);

      if (level === S17_STEPS) {
        s17Done = true;
        continueBtn.disabled = false;
        try { flushResumeSave(); } catch (e) {}   /* resume: the gate is earned (rule 11) */
      }
    }, revealAt);
    s17Timers.push(t1);
  }
}

/* =========================================================
   מסך 19 — מסך מעבר "חימום" (TransitionScreen). דמות בווידאו אמיתי
   "מתחממת" (green-avatar-warming-up.mp4/Turquoise-avatar-warming
   -up.mp4, סופקו בפועל) — אותו חוזה בדיוק כמו מסך 2/9/10
   (resolveCharBubbleVideo).
   ========================================================= */
const TS18_AVATAR_ASSETS = {
  'character-1': 'assets/videos/green-avatar-warming-up.mp4',
  'character-2': 'assets/videos/turquoise-avatar-warming-up.mp4'
};

function resetScreenState18() {
  resolveCharBubbleVideo('s18-avatar-video', TS18_AVATAR_ASSETS);
}

/* =========================================================
   מסך 4 — בחירת מסלול למידה: וידאו/קריאה (TwoOptionSelection), וריאנט
   של מסך 5 (id="s4") של methodica-science-mass-measure-03-01 (יעד 3,
   סיין 1). כל כרטיס מציג את הדמות שנבחרה במסך 1, בפוזה המתאימה
   (צופה בסרטון / קוראת) — לא תמונות קבועות כמו במקור.
   ========================================================= */
const S3_VIDEO_IMG_ASSETS = {
  'character-1': 'assets/images/green-avatar-watching-video.png',
  'character-2': 'assets/images/turquoise-avatar-watching-video.png'
};
const S3_READ_IMG_ASSETS = {
  'character-1': 'assets/images/green-avatar-reading-book.png',
  'character-2': 'assets/images/turquoise-avatar-read.png'
};

let s3SelectedPath = null; // 'video' | 'read'

function resetScreenState3() {
  resolveCharBubbleImg('s3-video-img', S3_VIDEO_IMG_ASSETS);
  resolveCharBubbleImg('s3-read-img', S3_READ_IMG_ASSETS);
  document.querySelectorAll('#s3 .option-card').forEach(function (c) {
    const isChosen = c.dataset.value === s3SelectedPath;
    c.classList.toggle('selected', isChosen);
    c.setAttribute('aria-checked', isChosen ? 'true' : 'false');
  });
  const btn = document.getElementById('s3-continue');
  if (btn) btn.disabled = !s3SelectedPath;
}

function s3SelectPath(cardEl) {
  s3SelectedPath = cardEl.dataset.value;
  resetScreenState3();
  try { flushResumeSave(); } catch (e) {}   /* resume: the path choice routes the part — flush synchronously */
}

function handleS3CardKey(event, cardEl) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    s3SelectPath(cardEl);
  }
}

/* ניתוב: "read" → מסך 5 (goTo(4), קריאה עצמית — קלפים מתהפכים).
   "video" → מסך 11 (goTo(10), צפייה בסרטון) — **תוקן (2026-07-28,
   לפי הדוקס):** מסך הוידאו מגיע ישירות ממסך 4, לא דרך מסכים 7-10
   (שהם תוכן נתיב-הקריאה בלבד — "תכונות", חוט נחושת, מסקנה). */
function advanceFromS3() {
  xapiSelectedLearningType(s3SelectedPath);   // the confirmed choice (the s3 continue button), not the card click
  if (s3SelectedPath === 'read') goTo(4);
  else if (s3SelectedPath === 'video') goTo(10);
}

/* =========================================================
   מסך 5 — קלפים מתהפכים (FlipCardsReveal), שוכפל ממסך 3 (id="s2") של
   Methodica-science-mass-measure-02-01. כפתור "המשך" נדלק רק אחרי
   הפיכת שני הקלפים; resume-state: חזרה למסך אחרי סיום משאירה את שני
   הקלפים הפוכים וה"המשך" דלוק (לא ניסיון חדש) — לפי מוסכמת הפרויקט.
   ========================================================= */
let s4Card1Flipped = false; // flip-card-chair
let s4Card2Flipped = false; // flip-card-wood
let s4Done = false;

function s4FlipCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.toggle('flipped');
  gestureHintHide('s4-flip'); /* נעלם ברגע שהלומד מבצע את הפעולה עצמה — קליק על כרטיס כלשהו */
  if (cardId === 'flip-card-chair') s4Card1Flipped = true;
  if (cardId === 'flip-card-wood') s4Card2Flipped = true;
  if (s4Card1Flipped && s4Card2Flipped) {
    document.getElementById('s4-continue').disabled = false;
    try { flushResumeSave(); } catch (e) {}   /* resume: the gate is earned (rule 11) */
  }
}

function s4CardKey(event, cardId) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    s4FlipCard(cardId);
  }
}

function s4Continue() {
  s4Done = true;
  goTo(5);
}

function resetScreenState4() {
  const c1 = document.getElementById('flip-card-chair');
  const c2 = document.getElementById('flip-card-wood');
  const btn = document.getElementById('s4-continue');
  if (s4Done) {
    s4Card1Flipped = true;
    s4Card2Flipped = true;
    c1.classList.add('flipped');
    c2.classList.add('flipped');
    btn.disabled = false;
    return;
  }
  s4Card1Flipped = false;
  s4Card2Flipped = false;
  c1.classList.remove('flipped');
  c2.classList.remove('flipped');
  btn.disabled = true;
  /* מחווה מונפשת (Gesture Hints, SELF-QA.md §7) — קליק, מעל הכרטיס
     הראשון, פעם אחת במסך הזה (לא מוצגת חוזר אם המסך כבר הושלם —
     ה-return המוקדם ב-s4Done למעלה דואג לזה). */
  gestureHintShow('s4-flip', 'click', c1);
}

/* =========================================================
   מעבר וידאו/קריאה (reading↔video toggle) — לפי Figma node 408:4542.
   קיים במסכים 5-8 (תוכן נתיב-קריאה: קלפים/כיסאות/2 placeholder) ו-11
   (מסך וידאו, שם "וידאו" הוא הצד הנבחר). **תוקן (2026-07-28):** מסכים
   9-10 (חוט נחושת, מסקנה) **אינם** כוללים את הטוגל — הם HookOpenQuestion/
   TransitionScreen לפי הפיגמה, תבניות שאין בהן טוגל (רק "content Flip
   Cards" node 408:4542 כולל אותו). ראו הערה מלאה ב-styles.css
   (".rv-toggle") וב-index.html.
   ========================================================= */
/* **תוקן (2026-07-28, לפי הדוקס):** קופץ ישירות למסך 11 (הוידאו עצמו)
   — לא למסך 10 (שהוא תוכן נתיב-קריאה אמיתי כעת, לא placeholder-כניסה
   לוידאו כמו שהונח בטעות קודם). */
function rvGoToVideo() {
  xapiSelectedLearningType('video');   // switching path from the toggle is a choice too
  goTo(10);
}

/* חוזר תמיד למסך 5 (הראשון במסלול הקריאה) — אין עדיין "המסך האחרון
   שביקרתי בו" נשמר; אם יידרש בעתיד resume למקום המדויק, להוסיף כאן. */
function rvGoToRead() {
  xapiSelectedLearningType('read');    // switching path from the toggle is a choice too
  goTo(4);
}

/* =========================================================
   מסך 11 — צפייה בסרטון (VideoIntro), לפי Figma node 408:4889/408:8541.
   **תוקן (2026-07-28): הוזז ממסך 10 למסך 11** (data-screen 9→10,
   id/prefix s9→s10) לפי בקשה מפורשת — במיקומו הקודם יש עכשיו
   placeholder ריק (בלי סטייט, כמו מסכים 7-9).
   **עודכן (בקשה מפורשת): סרטון אמיתי סופק** —
   https://youtu.be/CASpdvCI9eQ ("אבחנה בין גוף וחומר", משרד החינוך).
   YouTube לא חושף קובץ להטמעה ישירה ב-<video src>, אז ה-placeholder
   הוחלף ב-YouTube IFrame Player API: `#s10-yt-player` (index.html) הוא
   ה-div שה-API הופך בפועל ל-<iframe> חי. `onYouTubeIframeAPIReady`
   הוא callback גלובלי שה-API-script (index.html, לפני script.js)
   קורא לו אוטומטית ברגע שהוא נטען — אם המשתמש/ת לוחצ/ת play לפני
   שזה קרה, s10PendingPlay דוחה את יצירת הפלייר לרגע שה-API מוכן,
   כדי לא לקרוא ל-YT.Player לפני שהוא קיים. */
let s10Watched = false;
let s10Player = null;
let s10PendingPlay = false;

function onYouTubeIframeAPIReady() {
  if (s10PendingPlay) {
    s10PendingPlay = false;
    s10CreatePlayer();
  }
}

/* ── QA D-1 (guide §6.9.1, KNOWN-ISSUE-youtube-forigin-token-leak.md) ──
   When YT.Player is pointed at a bare <div> the IFrame API builds the iframe src itself and appends
   `forigin` from location.href — on a Kata launch that href carries the Bearer token. So the iframe
   is built HERE (youtube-nocookie, enablejsapi, origin = location.origin — never href) and the player
   is attached to the finished element with no videoId / host / playerVars. The placeholder's id stays
   on the iframe so #s10-yt-player CSS still applies. Reference: mass-measure-03-01 script.js:377–420. */
const S10_VIDEO_ID = 'CASpdvCI9eQ';
const S10_XAPI_ITEM = '003';  /* the catalogue item of screen 11 (s10) — played/paused object (SCREEN_TO_SUBCONTENT[10]) */
function ytEmbedSrc(videoId) {
  const p = ['enablejsapi=1', 'rel=0', 'modestbranding=1', 'playsinline=1'];
  if (/^https?:$/.test(window.location.protocol))                    // file:// → "null" → error 153
    p.push('origin=' + encodeURIComponent(window.location.origin));
  return 'https://www.youtube-nocookie.com/embed/' + videoId + '?' + p.join('&');
}
function ytMountIframe(id, videoId, title, w, h) {
  const el = document.getElementById(id);
  if (!el) return null;
  if (el.tagName === 'IFRAME') return el;                            // idempotent
  const f = document.createElement('iframe');
  f.id = id; f.title = title; f.src = ytEmbedSrc(videoId); f.width = w; f.height = h;
  f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture'); f.allowFullscreen = true;
  el.parentNode.replaceChild(f, el); return f;                        // keep the id: CSS targets it
}
function s10CreatePlayer() {
  const frame = ytMountIframe('s10-yt-player', S10_VIDEO_ID, 'التمييز بين الجسم والمادة', 646, 363);
  if (!frame) return;
  s10Player = new YT.Player(frame, {
    events: {
      onReady: function (e) { e.target.playVideo(); },
      onStateChange: function (e) {
        /* played/paused per guide §6.9.2 — one flag per player, the ITEM as object. */
        try { if (typeof xapiYouTubeState === 'function') xapiYouTubeState(e, S10_XAPI_ITEM); } catch (_) {}
        if (e.data === YT.PlayerState.ENDED) s10MarkWatched();
      }
    }
  });
}

function resetScreenState10() {
  const btn = document.getElementById('s10-continue');
  const playBtn = document.getElementById('s10-play-btn');
  if (s10Watched) {
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    if (playBtn) playBtn.classList.add('hidden-after-play');
  } else {
    if (btn) { btn.disabled = true; btn.textContent = 'للمتابعة؟'; }
    if (playBtn) playBtn.classList.remove('hidden-after-play');
  }
}

function s10MarkWatched() {
  s10Watched = true;
  const btn = document.getElementById('s10-continue');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
  try { flushResumeSave(); } catch (e) {}   /* resume: the watch gate is a variable, flushed when earned (rule 11) */
}

function s10PlayVideo() {
  const playBtn = document.getElementById('s10-play-btn');
  if (playBtn) playBtn.classList.add('hidden-after-play');
  if (s10Player) {
    s10Player.playVideo();
  } else if (window.YT && window.YT.Player) {
    s10CreatePlayer();
  } else {
    s10PendingPlay = true; // ال-API script עדיין لا נטען — ייווצר אוטומטית ב-onYouTubeIframeAPIReady
  }
}

/* תוקן (2026-07-28): נתיב הוידאו מגיע למסך ההתכנסות (12, data-screen=11)
   — לא עוד placeholder goTo(TOTAL_SCREENS). */
function s10Continue() {
  if (!s10Watched) return;
  goTo(11);
}

/* =========================================================
   מסך 14 (s13) — שאלת גרירה: גוף מעובד/לא מעובד.
   **נבנה מחדש (2026-08-03), שוכפל 1:1 ממסך 5 (`data-screen="4"`,
   `id="s4"`, "ברוטו/נטו/טרה") של Methodica-science-mass-measure-02-01**
   — לפי בקשה מפורשת. אותו מנגנון בדיוק (s5DragStart/DragEnd/DragOver/
   DragEnter/DragLeave/Drop/DropToSource/ItemClick/Check/resetScreenState4
   שם → ddq13* כאן): כל פריט הוא ה-DOM node החי היחיד שלו (תמונה+שם),
   מוזז בפועל בין מגש המקור לאזור-יעד (appendChild/removeChild, לא
   re-render ממודל נתונים); לחיצה על פריט ממוקם מחזירה אותו למגש
   (`ddq13ItemClick`, לא רק גרירה); בדיקת-נכונות **ברמת אזור שלם**
   (כל הפריטים באזור חייבים data-correct===zoneId כדי שהאזור יסומן
   ירוק) — בדיוק כמו המקור, בלי תגית per-item. 2 ניסיונות, בלי כפתור
   רמז. כפתור הטוגל "מעבר לתשובה שלי/הנכונה" (§9)
   נוסף בניסיון האחרון השגוי.
   ========================================================= */
const DDQ13_ITEM_IDS = ['ddq13-gold', 'ddq13-pebble', 'ddq13-box', 'ddq13-bowl'];
/* xAPI result.response: zone element id → visible zone label (= metadata 003/q1 answers.target). */
const DDQ13_ZONE_LABELS = {
  'ddq13-zone-unprocessed': 'أجسام طبيعية',
  'ddq13-zone-processed': 'أجسام مُصَنَّعة'
};

const DDQ13_TEXTS = {
  correct: {
    title: 'ممتاز!',
    body: 'لتحديد ما إذا كان الجسم مُصَنَّعًا أم لا، نفحص ما إذا كان الإنسان <b>قد غيّره بشكل مقصود </b>لإنتاج منتج أو لتكييفه للاستخدام.'
  },
  wrong1: {
    /* ניסיון ראשון שגוי לגמרי: משוב קצר אחיד (בקשה מפורשת, 2026-10-03) —
       כמו בכל שאר סוגי השאלות; לא הסבר-משותף (זה רק בניסיון האחרון). */
    title: 'الإجابة غير صحيحة.',
    body: 'هل نحاول مرة أخرى؟'
  },
  wrong1Partial: {
    title: 'الإجابة صحيحة جزئيًا.',
    body: 'هل نحاول مرة أخرى؟'
  },
  wrongFinalPartial: {
    title: fbCorrectShown('الإجابة صحيحة جزئيًا.'),
    body: 'لتحديد ما إذا كان الجسم مُصَنَّعًا أم لا، نفحص ما إذا كان الإنسان <b>قد غيّره بشكل مقصود </b>لإنتاج منتج أو لتكييفه للاستخدام.'
  },
  wrongFinal: {
    /* הסבר משותף לתשובה נכונה/שגויה-סופית — לפי מוסכמת התבנית
       (_question-template-defaults.md → "Feedback: shared explanation") */
    title: fbCorrectShown('الإجابة غير صحيحة.'),
    body: 'لتحديد ما إذا كان الجسم مُصَنَّعًا أم لا، نفحص ما إذا كان الإنسان <b>قد غيّره بشكل مقصود </b>لإنتاج منتج أو لتكييفه للاستخدام.'
  }
};

let ddq13Done = false;
let ddq13Attempts = 0;
let ddq13AnswerSnapshot = null;
let ddq13Revealed = false;
/* Retry gate (guide §8.8 rule 9): board signature of the non-final wrong attempt, persisted as `lw`. */
let ddq13LastWrong = null;
/* The dealt bank order (shuffled once at load, see shuffleContainerChildren) — persisted, never re-dealt on
   restore (§8.9 "a shuffled board"). Filled right after the shuffle at the end of this file. */
let ddq13BankOrder = DDQ13_ITEM_IDS.slice();

/* item → zone key ('—' while in the bank), one entry per item; compares by item, which is by label. */
function ddq13Sig() {
  return DDQ13_ITEM_IDS.map(function (id) {
    const el = document.getElementById(id);
    const p = el && el.parentElement ? el.parentElement.id : '';
    return id.replace('ddq13-', '') + '=' + (p.indexOf('ddq13-zone-') === 0 ? p.replace('ddq13-zone-', '') : '—');
  }).join(' | ');
}

function ddq13AllPlaced() {
  const bank = document.getElementById('ddq13-source-bank');
  if (!bank) return false;
  return DDQ13_ITEM_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 'ddq13-source-bank';
  });
}

function ddq13UpdateCheckBtn() {
  const btn = document.getElementById('ddq13-check');
  if (btn && !ddq13Done) btn.disabled = !ddq13AllPlaced() || ddq13Sig() === ddq13LastWrong;   /* Retry gate (rule 9) */
}

function ddq13ClearZoneStates() {
  ['unprocessed', 'processed'].forEach(function (z) {
    const zone = document.getElementById('ddq13-zone-' + z);
    if (zone) zone.classList.remove('drag-over');
  });
  DDQ13_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('correct', 'wrong');
  });
}

/* הנחת פריט באזור או החזרתו למאגר (zoneKey=null). משותף ל-onDrop/onTap של גרירת
   ה-Pointer (../unit-js/30-pointer-dnd.js, תוקן 2026-11-03 — MOE "גרירה לא עובדת בטאבלט");
   RevealCorrect/RestoreMine/applyResumeDom ממשיכים עם appendChild משלהם. */
function ddq13PlaceItem(itemId, zoneKey) {
  if (ddq13Done) return;
  const itemEl = document.getElementById(itemId);
  const dest = document.getElementById(zoneKey ? 'ddq13-zone-' + zoneKey : 'ddq13-source-bank');
  if (!itemEl || !dest) return;
  if (itemEl.parentElement !== dest) dest.appendChild(itemEl);
  ddq13UpdateCheckBtn();
  ddq13ClearZoneStates();
}

/* גרירת Pointer Events (עכבר + מגע). המאזינים יושבים על הפריטים עצמם, ולכן שורדים
   appendChild (הטלה, חשיפה, resume, reset). הקשה קצרה על פריט מוצב = החזרה למאגר
   (ההתנהגות הישנה של ddq13ItemClick). */
const ddq13Dnd = createPointerDnd({
  canDrag: function () { return !ddq13Done; },
  onPick: function () {                         /* הלחיצה הפכה לגרירה (מעבר ל-6px) */
    gestureHintHide('s13-drag');               /* נעלם ברגע שהלומד מתחיל לגרור */
    /* First-attempt retry feedback dismissal — 720-templates "Feedback popup system". */
    if (ddq13Attempts > 0) document.getElementById('ddq13-popup').classList.remove('visible');
  },
  onGhost: function (ghost) { ghost.classList.remove('correct', 'wrong', 'filled'); },
  onTap: function (dragId) {
    const el = document.getElementById(dragId);
    if (el && el.parentElement && el.parentElement.id !== 'ddq13-source-bank') ddq13PlaceItem(dragId, null);
  },
  onDrop: function (dragId, targetId) { ddq13PlaceItem(dragId, targetId === 'bank' ? null : targetId); }
  /* אין onCancel: ה-helper מסיר את הרוח ואת .dragging; הפריט נשאר היכן שהיה */
});
DDQ13_ITEM_IDS.forEach(function (id) { ddq13Dnd.attachSource(document.getElementById(id), id); });
ddq13Dnd.attachTarget(document.getElementById('ddq13-zone-unprocessed'), 'unprocessed');
ddq13Dnd.attachTarget(document.getElementById('ddq13-zone-processed'), 'processed');
ddq13Dnd.attachTarget(document.getElementById('ddq13-source-bank'), 'bank');

function ddq13ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('ddq13-popup');
  const data = DDQ13_TEXTS[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('ddq13-popup');
  box.classList.add('visible');
}

function ddq13Check() {
  if (ddq13Done) return;
  if (!ddq13AllPlaced()) return;
  ddq13Attempts++;

  /* תוקן (2026-08-04): משוב per-card (לא per-zone) — לפי SELF-QA.md
     קטגוריה 4. כל פריט מסומן נכון/שגוי לפי data-correct של עצמו מול
     האזור שהוא בפועל נמצא בו; "עבר את התרגיל" עדיין דורש שכל הפריטים
     יהיו נכונים (ללא שינוי בהיגיון ה-pass/fail עצמו). */
  let allCorrect = true;
  let anyCorrect = false;
  ['unprocessed', 'processed'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('ddq13-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.ddq13-drag-item');
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
  xapiAnswered('007', 'q1', allCorrect, allCorrect || ddq13Attempts >= 2,
    { pairs: DDQ13_ITEM_IDS.map(function (id) {
      const el = document.getElementById(id);
      const parentId = el && el.parentElement ? el.parentElement.id : '';
      return { source: xapiAnswerText(el ? el.querySelector('.ddq13-item-label') : null),
               target: DDQ13_ZONE_LABELS[parentId] || '' };
    }) });

  const btn = document.getElementById('ddq13-check');
  if (allCorrect) {
    ddq13Done = true;
    ddq13LastWrong = null;
    ddq13ShowFeedback('correct', true);
    btn.textContent = 'متابعة';
    btn.disabled = false;
    btn.onclick = ddq13Continue;
  } else if (ddq13Attempts < 2) {
    ddq13LastWrong = ddq13Sig();   /* Retry gate (rule 9) */
    ddq13ShowFeedback(anyCorrect ? 'wrong1Partial' : 'wrong1', false);
    btn.disabled = true;
  } else {
    ddq13Done = true;
    ddq13LastWrong = null;
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי — snapshot של תשובת הלומד,
       חשיפה מיידית של התשובה הנכונה, משוב סופי מלא וכפתור טוגל
       "الانتقال إلى إجابتي" ⇄ "الانتقال إلى الإجابة الصحيحة". */
    ddq13AnswerSnapshot = {};
    DDQ13_ITEM_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      ddq13AnswerSnapshot[id] = el.parentElement ? el.parentElement.id : 'ddq13-source-bank';
    });
    /* §9: חשיפה מיידית של התשובה הנכונה + משוב סופי מלא */
    ddq13RevealCorrect();
    ddq13Revealed = true;
    ddq13ShowFeedback(anyCorrect ? 'wrongFinalPartial' : 'wrongFinal', false);
    btn.textContent = 'متابعة';
    btn.disabled = false;
    btn.onclick = ddq13Continue;
    const revealBtn = document.getElementById('ddq13-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) — one flush, after everything */
}

/* תוקן (2026-10-01, §9): הצגת התשובה הנכונה על הלוח — מניחה כל פריט
   באזור הנכון שלו ומסמנת הכול 'correct' (בלי wrong). */
function ddq13RevealCorrect() {
  DDQ13_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    const zone = document.getElementById('ddq13-zone-' + el.dataset.correct);
    if (zone) zone.appendChild(el);
    el.classList.remove('wrong');
    el.classList.add('correct');
  });
}

/* שחזור "התשובה שלי" מה-snapshot, עם סימון correct/wrong לכל פריט. */
function ddq13RestoreMine() {
  DDQ13_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    const parent = document.getElementById(ddq13AnswerSnapshot[id]);
    if (parent) parent.appendChild(el);
  });
  ['unprocessed', 'processed'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('ddq13-zone-' + zoneId);
    zoneEl.querySelectorAll('.ddq13-drag-item').forEach(function (item) {
      const ok = item.dataset.correct === zoneId;
      item.classList.toggle('correct', ok);
      item.classList.toggle('wrong', !ok);
    });
  });
}

/* טוגל §9: "מעבר לתשובה שלי" ⇄ "מעבר לתשובה הנכונה". המשוב נשאר פתוח
   ולא משתנה. */
function ddq13ToggleReveal() {
  if (!ddq13Done || !ddq13AnswerSnapshot) return;
  const revealBtn = document.getElementById('ddq13-reveal-btn');
  if (ddq13Revealed) {
    ddq13RestoreMine();
    ddq13Revealed = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    ddq13RevealCorrect();
    ddq13Revealed = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function ddq13Continue() {
  goTo(14);
}

function resetScreenState13() {
  const btn = document.getElementById('ddq13-check');
  if (ddq13Done) {
    /* resume-state: המסך פשוט משאיר את המצב הקיים ב-DOM (goTo לא הורס
       תוכן) — אין צורך "לשחזר" מיקומי-פריטים, רק את כפתור "המשך" +
       מצב כפתור "מעבר לתשובה שלי/הנכונה" (§9). */
    btn.textContent = 'متابعة';
    btn.disabled = false;
    btn.onclick = ddq13Continue;
    const revealBtn = document.getElementById('ddq13-reveal-btn');
    if (revealBtn) {
      if (ddq13AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = ddq13Revealed ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return;
  }
  /* resume-state: ניסיון שבוצע או פריטים שהוצבו כבר (אפילו בלי הגשה)
     לא נמחקים בחזרה למסך */
  if (ddq13Attempts > 0 || DDQ13_ITEM_IDS.some(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 'ddq13-source-bank';
  })) return;

  ddq13Attempts = 0;
  ddq13AnswerSnapshot = null;
  ddq13Revealed = false;
  ddq13LastWrong = null;
  {
    const revealBtn = document.getElementById('ddq13-reveal-btn');
    if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  const bank = document.getElementById('ddq13-source-bank');
  DDQ13_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el && el.parentElement !== bank) {
      el.parentElement.removeChild(el);
      bank.appendChild(el);
    }
  });
  ddq13ClearZoneStates();
  document.getElementById('ddq13-popup').classList.remove('visible');
  btn.textContent = 'هل إجابتي صحيحة؟';
  btn.disabled = true;
  btn.onclick = ddq13Check;
  /* מחווה מונפשת (Gesture Hints, SELF-QA.md §7) — גרירה, מעל הפריט
     הראשון במאגר, פעם אחת במסך הזה. */
  gestureHintShow('s13-drag', 'drag', document.getElementById(DDQ13_ITEM_IDS[0]));
}

/* אתחול חד-פעמי (לא בכל resetScreenState13, כדי לא לצבור מאזיני
   mousedown כפולים) — לפי מוסכמת "Feedback popup system" */
scqFbMakeDraggable('ddq13-popup');

/* =========================================================
   מסך 16 (s15) — מסך מעבר: טבלאות ותרשימי זרימה (TransitionScreen).
   שוכפל ממסך 10 (s9) — אותו asset map לדמות (S1_CHAR_VIDEO_ASSETS,
   אותם קבצי "מרכיבה משקפיים" שכבר בשימוש במסכים 2/10, לפי הערת
   ההפקה בשקף 20: "גיף של הדמות שנבחרה מרכיבה משקפיים").
   ========================================================= */
function resetScreenState15() {
  resolveCharBubbleVideo('s15-avatar-video', S1_CHAR_VIDEO_ASSETS);
}

/* =========================================================
   סרגל התקדמות (qnav) — משותף למסכים 19-20 (s19/s20, שאלות 1-2).
   הועתק ממסך 16 (data-screen=15) של Methodica-science-mass-measure
   -02-01 (יעד 2, "-linked") — שם משותף ל-5 שאלות (מסכים 16-20 שם);
   כאן מותאם ל-**2 שאלות בלבד**, לפי בקשת הדוקס ("סרגל התקדמות של
   שתי שאלות"). stationProgress עוקב אחרי success/fail per שאלה;
   updateQuestionNav(prefix) מעדכן את העותק (id-ים ייחודיים) של המסך
   שקורא לה.
   ========================================================= */
let stationProgress = { q19: null, q20: null };

function updateQuestionNav(prefix) {
  const qs = [stationProgress.q19, stationProgress.q20];
  const currentIdx = qs.indexOf(null);
  for (let i = 0; i < 2; i++) {
    const icon = document.getElementById(prefix + '-qnav-icon-' + (i + 1));
    const label = document.getElementById(prefix + '-qnav-label-' + (i + 1));
    if (!icon) continue;
    icon.className = 'qnav-icon';
    if (label) label.className = 'qnav-label';
    if (qs[i] === 'success') {
      icon.classList.add('qnav-success');
      if (label) label.classList.add('qnav-label-active');
    } else if (qs[i] === 'fail') {
      icon.classList.add('qnav-fail');
      if (label) label.classList.add('qnav-label-active');
    } else if (i === currentIdx) {
      icon.classList.add('qnav-current');
      if (label) label.classList.add('qnav-label-active');
    } else {
      icon.classList.add('qnav-future');
    }
  }
  const line = document.getElementById(prefix + '-qnav-line-1');
  if (line) {
    line.className = 'qnav-line';
    if (qs[0] !== null) line.classList.add('line-done');
  }
}

/* =========================================================
   מסך 20 (s19) — שאלה 1/2: SingleChoiceQuestion מלווה בתמונה. שוכפל
   מ"מסך 16" (data-screen=15) של Methodica-science-mass-measure-02-01
   (יעד 2, "-linked") — state machine זהה 1:1 (resetState/Select/Check/
   Hint), רק שמות מותאמים ל-s19 (לפי מוסכמת הפרויקט הזה: prefix=data
   -screen number, לא המספר העברי). תוכן לפי שקפים 24-28 בתסריט
   (run-level מדויק). "נכון!" מוצג כתשובה-נכונה בלבד; ניסיון-אחרון
   -שגוי מקבל כותרת "התשובה אינה נכונה." (לא "נכון!" כמו ששקף 28
   בפועל מציג — פער-העתקה של המפיק בין שני שקפי-מצב, מתועד; ההסבר
   המשותף (body) בין נכון/שגוי-סופי נשמר במדויק, לפי המוסכמה
   ב-_question-template-defaults.md → "Feedback: shared explanation").
   ========================================================= */
const S19 = {
  correctId: 'a',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'صحيح!',
      body: 'قوس سماعات الرأس هو <b>جسم</b>، لأنه شيء يشغل حيّزًا من الفراغ.\n\nالبلاستيك مادة، والليونة والموصلية الكهربائية خصائص للمواد.'
    },
    wrong1: {
      title: 'الإجابة غير صحيحة.',
      body: 'هل نحاول مرة أخرى؟'
    },
    wrong2: {
      title: fbCorrectShown('الإجابة غير صحيحة.'),
      body: 'قوس سماعات الرأس هو <b>جسم</b>، لأنه شيء يشغل حيّزًا من الفراغ.\n\nالبلاستيك مادة، والليونة والموصلية الكهربائية خصائص للمواد.'
    }
  }
};

let s19Selected = null;
let s19Attempts = 0;
let s19Done = false;
let s19Phase = 'before';
/* Retry gate (guide §8.8 rule 9): the option id submitted on the non-final wrong attempt, persisted as `lw`. */
let s19LastWrong = null;

function s19OptEl(id) {
  return document.querySelector('#s19 .scq-opt[data-id="' + id + '"]');
}

function s19Select(id) {
  if (s19Done) return;
  const wasWrong1 = (s19Phase === 'wrong1');
  document.querySelectorAll('#s19 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = s19OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  s19Selected = id;
  s19Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('s19-popup').classList.remove('visible');
  }
  const checkBtn = document.getElementById('s19-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = (id === s19LastWrong);   /* Retry gate (rule 9): the same wrong answer cannot be resubmitted */
  checkBtn.onclick = s19Check;
}

function s19ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s19-popup');
  const data = S19.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s19-popup');
  box.classList.add('visible');
}

function s19SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s19-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('s19-hint').hidden = true;
}

function s19LockOptions() {
  document.querySelectorAll('#s19 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s19UnlockOptions() {
  document.querySelectorAll('#s19 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { s19Select(el.dataset.id); };
  });
}

function s19Continue() {
  goTo(20);
}

function s19Check() {
  if (!s19Selected || s19Done) return;
  s19Attempts++;
  const optEl = s19OptEl(s19Selected);
  /* xAPI: single choice — the selected option's visible text. */
  xapiAnswered('010', 'q1', s19Selected === S19.correctId,
    s19Selected === S19.correctId || s19Attempts >= S19.maxAttempts, { choices: [xapiAnswerText(optEl)] });

  if (s19Selected === S19.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    s19Phase = 'correct';
    s19Done = true;
    s19LastWrong = null;
    s19LockOptions();
    s19ShowFeedback('correct', true);
    s19SetBarDone('متابعة', s19Continue);
    stationProgress.q19 = 'success';
    updateQuestionNav('s19');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (s19Attempts < S19.maxAttempts) {
    s19Phase = 'wrong1';
    s19LastWrong = s19Selected;   /* Retry gate (rule 9) */
    s19ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('s19-check');
    checkBtn.textContent = 'هل إجابتي صحيحة؟';
    checkBtn.disabled = true;
    checkBtn.onclick = s19Check;
    const hintBtn = document.getElementById('s19-hint');
    hintBtn.hidden = false;
  } else {
    s19OptEl(S19.correctId).classList.add('correct');
    s19Phase = 'wrong-final';
    s19Done = true;
    s19LastWrong = null;
    s19LockOptions();
    s19ShowFeedback('wrong2', false);
    s19SetBarDone('متابعة', s19Continue);
    stationProgress.q19 = 'fail';
    updateQuestionNav('s19');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) — one flush, after everything */
}

function s19OpenHint() {
  if (s19Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('010', 'q1');
  document.getElementById('s19-hint-overlay').hidden = false;
}

function s19CloseHint() {
  document.getElementById('s19-hint-overlay').hidden = true;
}

function resetScreenState19() {
  updateQuestionNav('s19');
  if (s19Done || s19Attempts > 0 || s19Selected) return; // resume-state: שאלה שהתחילה لا נמחקת בחזרה למסך
  s19Selected = null;
  s19Attempts = 0;
  s19Phase = 'before';
  s19LastWrong = null;
  s19UnlockOptions();
  document.querySelectorAll('#s19 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s19-popup').classList.remove('visible');
  const checkBtn = document.getElementById('s19-check');
  checkBtn.textContent = 'هل إجابتي صحيحة؟';
  checkBtn.disabled = true;
  checkBtn.onclick = s19Check;
  const hintBtn = document.getElementById('s19-hint');
  hintBtn.hidden = true;
  document.getElementById('s19-hint-overlay').hidden = true;
}

/* =========================================================
   מסך 21 (s20) — שאלה 2/2: שאלת גרירה טקסטואלית (השלמת משפטים ממחסן
   מילים). שוכפל ממסך 3 סיין 5 יעד 2 (Methodica-science-mass-measure
   -02-05, makeDragQuestion factory) — state machine זהה (placement
   עוקב draggable→'source'|targetId, appendChild מזיז DOM node חי
   בפועל, לא re-render ממודל). עיצוב תיבת התשובה (`.dqx-*`) מותאם לפי
   Figma node 196:3401/196:3393, ראו הערה מלאה ב-styles.css. 3 מילים
   בדיוק ל-3 מקומות (בלי מסיחים), מעורבבות פעם אחת בטעינה
   (Fisher-Yates, לפי בקשה מפורשת "תערבב את התשובות").
   ========================================================= */
const DQX20_LABELS = {
  'dqx20-drag-guf': 'جسم',
  'dqx20-drag-homer': 'مادة',
  'dqx20-drag-tehuna': 'خاصية'
};
const DQX20_CORRECT_MAP = {
  'dqx20-target-1': 'dqx20-drag-guf',
  'dqx20-target-2': 'dqx20-drag-homer',
  'dqx20-target-3': 'dqx20-drag-tehuna'
};
const DQX20_DRAG_IDS = Object.keys(DQX20_LABELS);
const DQX20_TARGET_IDS = Object.keys(DQX20_CORRECT_MAP);
/* xAPI result.response: slot id → the visible sentence stem before the slot (= metadata 007/q1
   answers.target, byte for byte); DQX20_LABELS are the answers.source words. */
const DQX20_SLOT_LABELS = {
  'dqx20-target-1': 'السماعات هي',
  'dqx20-target-2': 'البلاستيك الذي يصنع منه جسم السماعة هو',
  'dqx20-target-3': 'ليونة القوس هي'
};
const DQX20_SHARED_EXPLANATION =
  'السماعات هي <b>جسم،</b>\nالبلاستيك هو <b>مادة</b>،\n<b>والليونة</b> هي خاصية للمادة.\n\nهذا التمييز يساعد في تنظيم وتصنيف المعلومات عن الأجسام والمواد.';

let dqx20Placement = {};
DQX20_DRAG_IDS.forEach(function (id) { dqx20Placement[id] = 'source'; });
let dqx20Checked = false;
let dqx20Attempts = 0;
let dqx20Done = false;
let dqx20AnswerSnapshot = null;
let dqx20Revealed = false;
/* Retry gate (guide §8.8 rule 9): board signature of the non-final wrong attempt, persisted as `lw`. */
let dqx20LastWrong = null;

/* גרירת Pointer Events (עכבר + מגע) — ../unit-js/30-pointer-dnd.js (תוקן 2026-11-03, MOE
   "גרירה לא עובדת בטאבלט"). dqx20Render בונה את כרטיסי הבנק והמילים המוצבות מחדש בכל
   רינדור ומצמיד כל אחד מהם (attachSource); התיבות והבנק מוצמדים פעם אחת כאן.
   dqx20Placement נשאר המודל היחיד; הטלה מחוץ ליעד = חזרה לבנק (כמו dragend בלי drop). */
const dqx20Dnd = createPointerDnd({
  canDrag: function () { return !dqx20Checked && !dqx20Done; },
  onPick: function (dragId, src) {                      /* הלחיצה הפכה לגרירה (מעבר ל-6px) */
    gestureHintHide('s20-drag');                       /* נעלם ברגע שהלומד מתחיל לגרור */
    if (dqx20Attempts > 0) document.getElementById('dqx20-popup').classList.remove('visible');
    if (src.classList.contains('dqx-drop-word')) {     /* מילה מוצבת: התיבה "מתרוקנת" חזותית עד ההטלה */
      const oldZone = document.getElementById(dqx20Placement[dragId]);
      if (oldZone) { oldZone.classList.remove('correct', 'incorrect', 'filled'); oldZone.classList.add('drag-origin'); }
    }
  },
  onGhost: function (ghost, src) {                      /* רוח אחיד: גלולת dqx-drag-card, גם כשגוררים מילה מוצבת */
    const dragId = src.dataset.pdragId;
    if (src.classList.contains('dqx-drop-word')) {
      const ref = document.getElementById(dragId) || document.getElementById(dqx20Placement[dragId]);
      ghost.className = 'dqx-drag-card pointer-drag-ghost';
      ghost.textContent = DQX20_LABELS[dragId];
      if (ref) { ghost.style.width = ref.offsetWidth + 'px'; ghost.style.height = ref.offsetHeight + 'px'; }
    }
  },
  onDrop: function (dragId, targetId) {
    if (targetId === 'bank') {
      dqx20Placement[dragId] = 'source';
    } else {
      const zone = document.getElementById(targetId);
      if (zone) zone.classList.remove('correct', 'incorrect');
      DQX20_DRAG_IDS.forEach(function (dId) { if (dqx20Placement[dId] === targetId && dId !== dragId) dqx20Placement[dId] = 'source'; });
      dqx20Placement[dragId] = targetId;
    }
    dqx20Render();
  },
  onCancel: function (dragId) {                         /* הטלה מחוץ ליעד: כמו dragend בלי drop — חזרה לבנק */
    dqx20Placement[dragId] = 'source';
    dqx20Render();
  }
});
DQX20_TARGET_IDS.forEach(function (tId) { dqx20Dnd.attachTarget(document.getElementById(tId), tId); });
dqx20Dnd.attachTarget(document.getElementById('dqx20-word-bank'), 'bank');

/* slot → placed label ('—' when empty), compares by label (rule 9). */
function dqx20Sig() {
  return DQX20_TARGET_IDS.map(function (tId) {
    let placed = null;
    DQX20_DRAG_IDS.forEach(function (d) { if (dqx20Placement[d] === tId) placed = d; });
    return tId.replace(/^.*-target-/, '') + '=' + (placed ? DQX20_LABELS[placed] : '—');
  }).join(' | ');
}

let dqx20Order = DQX20_DRAG_IDS.slice();
(function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
})(dqx20Order);

function dqx20Render() {
  dqx20Order.forEach(function (dragId) {
    const slot = document.getElementById('slot-' + dragId);
    if (!slot) return;
    /* תוקן (2026-08-05): ערבוב-מסיחים אמיתי — dqx20Order מעורבב, אבל
       כל dragId היה תמיד מתמלא לתוך ה-slot הקבוע שלו-עצמו (לפי id),
       כך שסדר-הלולאה לא השפיע בפועל על הסדר החזותי (אומת: 5 טעינות
       חוזרות הראו סדר-DOM זהה לחלוטין). התיקון: מזיזים את ה-slot עצמו
       לסוף ה-container בכל איטרציה — כך סדר-ה-DOM בפועל עוקב אחרי
       dqx20Order המעורבב. */
    if (slot.parentElement) slot.parentElement.appendChild(slot);
    slot.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'dqx-drag-card';
    card.id = dragId;
    if (dqx20Placement[dragId] === 'source') {
      card.textContent = DQX20_LABELS[dragId];
      if (!dqx20Checked) {
        dqx20Dnd.attachSource(card, dragId);   /* Pointer DnD (30-pointer-dnd.js) */
      } else {
        card.classList.add('locked');
      }
    } else {
      card.classList.add('ghost');
      card.textContent = DQX20_LABELS[dragId];
    }
    slot.appendChild(card);
  });

  DQX20_TARGET_IDS.forEach(function (targetId) {
    const zone = document.getElementById(targetId);
    if (!zone) return;
    let placedId = null;
    DQX20_DRAG_IDS.forEach(function (dId) { if (dqx20Placement[dId] === targetId) placedId = dId; });
    zone.innerHTML = '';
    zone.classList.remove('filled', 'drag-origin');
    if (placedId) {
      /* 'filled' משמש רק למצב "הונח, טרם נבדק" (גבול כחול) — לאחר
         בדיקה, correct/incorrect לבד קובעים את הגבול (ירוק/אדום),
         לא נשען על סדר-קדימות ב-CSS בין שתי מחלקות באותה ספציפיות */
      /* תוקן (2026-08-04): guard נוסף — אחרי ניסיון שגוי ראשון,
         dqx20Check() מאפס Checked=false ומפעיל Render() שוב כדי לאפשר
         גרירה חוזרת; בלי ה-guard, 'filled' היה חוזר יחד עם 'incorrect'
         שנשאר על התא (Render לא מסיר correct/incorrect), והטקסט היה
         נראה בסגנון "הונח" (22px/#222) במקום "שגוי" (24px/#303030). */
      if (!dqx20Checked && !zone.classList.contains('correct') && !zone.classList.contains('incorrect')) zone.classList.add('filled');
      const iconEl = document.createElement('span');
      iconEl.className = 'dqx-drop-icon';
      const wordEl = document.createElement('span');
      wordEl.className = 'dqx-drop-word';
      wordEl.textContent = DQX20_LABELS[placedId];
      if (!dqx20Checked) {
        wordEl.style.cursor = 'grab';
        dqx20Dnd.attachSource(wordEl, placedId);   /* מילה מוצבת נגררת חזרה / לתיבה אחרת */
      }
      /* אייקון ראשון ב-DOM, מילה שנייה — בתוך .dqx-drop (direction:rtl)
         זה ממקם את האייקון פיזית בקצה הימני של התיבה (לפי בקשה מפורשת
         "אייקון X/V בצד ימני בתוך הטבלה"), לא צמוד למילה כמו במסך המקור */
      zone.appendChild(iconEl);
      zone.appendChild(wordEl);
    }
  });

  const allFilled = DQX20_TARGET_IDS.every(function (tId) {
    return DQX20_DRAG_IDS.some(function (dId) { return dqx20Placement[dId] === tId; });
  });
  const btn = document.getElementById('dqx20-check');
  if (btn && !dqx20Done) btn.disabled = !allFilled || dqx20Sig() === dqx20LastWrong;   /* Retry gate (rule 9) */
}



function dqx20ShowFeedback(title, body, kind) {
  const box = document.getElementById('dqx20-popup');
  box.querySelector('.scq-fb-title-text').textContent = title;
  box.querySelector('.scq-fb-body').innerHTML = body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(kind === 'correct' ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('dqx20-popup');
  box.classList.add('visible');
}

/* ניווט חוצה-סינים (בקשה מפורשת של הלקוח): מסך 21 (s20) הוא המסך האחרון
   בסיין 1 — "המשך" אחרי מענה עובר לסיין 2 (מסך ראשון). */
function dqx20GoToNextScene() {
  /* 2026-10-19: the platform routes — report completed and stop (guide §8.12). */
  partFinish(document.getElementById('dqx20-check'));
}

function dqx20Check() {
  if (dqx20Done) { dqx20GoToNextScene(); return; }
  const allFilled = DQX20_TARGET_IDS.every(function (tId) {
    return DQX20_DRAG_IDS.some(function (dId) { return dqx20Placement[dId] === tId; });
  });
  if (!allFilled) return;
  dqx20Checked = true;
  dqx20Attempts++;

  let allCorrect = true;
  let anyCorrect = false;
  DQX20_TARGET_IDS.forEach(function (tId) {
    const validId = DQX20_CORRECT_MAP[tId];
    let placedId = null;
    DQX20_DRAG_IDS.forEach(function (dId) { if (dqx20Placement[dId] === tId) placedId = dId; });
    const ok = placedId === validId;
    if (ok) anyCorrect = true;
    if (!ok) allCorrect = false;
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add(ok ? 'correct' : 'incorrect'); }
  });
  dqx20Render();

  /* xAPI: after the slot loop (allCorrect final). Pair = word → stem of the slot it sits in ('' if in the bank). */
  xapiAnswered('011', 'q1', allCorrect, allCorrect || dqx20Attempts >= 2,
    { pairs: DQX20_DRAG_IDS.map(function (dId) {
      return { source: DQX20_LABELS[dId], target: DQX20_SLOT_LABELS[dqx20Placement[dId]] || '' };
    }) });

  const btn = document.getElementById('dqx20-check');
  const hintBtn = document.getElementById('dqx20-hint');
  if (allCorrect) {
    dqx20Done = true;
    dqx20LastWrong = null;
    dqx20ShowFeedback('ممتاز!', DQX20_SHARED_EXPLANATION, 'correct');
    stationProgress.q20 = 'success';
    updateQuestionNav('s20');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    if (hintBtn) hintBtn.hidden = true;
  } else if (dqx20Attempts < 2) {
    dqx20LastWrong = dqx20Sig();   /* Retry gate (rule 9) — before the render that reads it */
    dqx20ShowFeedback(anyCorrect ? 'الإجابة صحيحة جزئيًا.' : 'الإجابة غير صحيحة.', 'هل نحاول مرة أخرى؟', 'wrong');
    dqx20Checked = false;
    dqx20Render();
    if (hintBtn) hintBtn.hidden = false;
    if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
  } else {
    dqx20Done = true;
    dqx20LastWrong = null;
    /* תוקן (2026-10-01, §9): ניסיון אחרון שגוי — snapshot, חשיפה מיידית של
       התשובה הנכונה, משוב סופי מלא וכפתור טוגל "מעבר לתשובה שלי". */
    dqx20AnswerSnapshot = Object.assign({}, dqx20Placement);
    dqx20RevealCorrect();
    dqx20Revealed = true;
    dqx20ShowFeedback(fbCorrectShown(anyCorrect ? 'الإجابة صحيحة جزئيًا.' : 'الإجابة غير صحيحة.'), DQX20_SHARED_EXPLANATION, 'wrong');
    stationProgress.q20 = 'fail';
    updateQuestionNav('s20');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    if (hintBtn) hintBtn.hidden = true;
    const revealBtn = document.getElementById('dqx20-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) — one flush, after everything */
}

/* תוקן (2026-10-01, §9): הצגת התשובה הנכונה על הלוח. */
function dqx20RevealCorrect() {
  DQX20_TARGET_IDS.forEach(function (tId) { dqx20Placement[DQX20_CORRECT_MAP[tId]] = tId; });
  const usedIds = DQX20_TARGET_IDS.map(function (tId) { return DQX20_CORRECT_MAP[tId]; });
  DQX20_DRAG_IDS.forEach(function (id) { if (usedIds.indexOf(id) === -1) dqx20Placement[id] = 'source'; });
  dqx20Render();
  DQX20_TARGET_IDS.forEach(function (tId) {
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add('correct'); }
  });
}

/* שחזור "התשובה שלי" מה-snapshot, עם סימון correct/incorrect לכל יעד. */
function dqx20RestoreMine() {
  DQX20_DRAG_IDS.forEach(function (id) { dqx20Placement[id] = dqx20AnswerSnapshot[id]; });
  dqx20Render();
  DQX20_TARGET_IDS.forEach(function (tId) {
    const validId = DQX20_CORRECT_MAP[tId];
    let placedId = null;
    DQX20_DRAG_IDS.forEach(function (dId) { if (dqx20Placement[dId] === tId) placedId = dId; });
    const ok = placedId === validId;
    const zone = document.getElementById(tId);
    if (zone) { zone.classList.remove('correct', 'incorrect'); zone.classList.add(ok ? 'correct' : 'incorrect'); }
  });
}

/* טוגל §9: "מעבר לתשובה שלי" ⇄ "מעבר לתשובה הנכונה". המשוב נשאר פתוח
   ולא משתנה. */
function dqx20ToggleReveal() {
  if (!dqx20Done || !dqx20AnswerSnapshot) return;
  const revealBtn = document.getElementById('dqx20-reveal-btn');
  if (dqx20Revealed) {
    dqx20RestoreMine();
    dqx20Revealed = false;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى الإجابة الصحيحة';
  } else {
    dqx20RevealCorrect();
    dqx20Revealed = true;
    if (revealBtn) revealBtn.textContent = 'الانتقال إلى إجابتي';
  }
}

function dqx20OpenHint() {
  if (dqx20Done) return;
  /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('011', 'q1');
  document.getElementById('dqx20-hint-overlay').hidden = false;
}

function dqx20CloseHint() {
  document.getElementById('dqx20-hint-overlay').hidden = true;
}

function resetScreenState20() {
  updateQuestionNav('s20');
  if (dqx20Done) {
    const btn = document.getElementById('dqx20-check');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    document.getElementById('dqx20-hint').hidden = true;
    dqx20Render();
    /* תוקן (2026-08-05): שחזור מצב כפתור "מעבר לתשובה שלי/הנכונה"
       בחזרה למסך שהושלם — הנחיות-כפתור-התשובה-הנכונה.md. */
    const revealBtn = document.getElementById('dqx20-reveal-btn');
    if (revealBtn) {
      if (dqx20AnswerSnapshot) {
        revealBtn.hidden = false;
        revealBtn.textContent = dqx20Revealed ? 'الانتقال إلى إجابتي' : 'الانتقال إلى الإجابة الصحيحة';
      } else {
        revealBtn.hidden = true;
      }
    }
    return;
  }
  const hasProgress = dqx20Attempts > 0 || Object.keys(dqx20Placement).some(function (id) { return dqx20Placement[id] !== 'source'; });
  if (hasProgress) { dqx20Render(); return; } /* התקדמות קיימת — لا מאפסים */
  dqx20Checked = false;
  dqx20Attempts = 0;
  dqx20AnswerSnapshot = null;
  dqx20Revealed = false;
  dqx20LastWrong = null;
  DQX20_DRAG_IDS.forEach(function (id) { dqx20Placement[id] = 'source'; });
  DQX20_TARGET_IDS.forEach(function (tId) {
    const zone = document.getElementById(tId);
    if (zone) zone.classList.remove('correct', 'incorrect', 'filled', 'drag-hover');
  });
  document.getElementById('dqx20-popup').classList.remove('visible');
  const hintBtn = document.getElementById('dqx20-hint');
  if (hintBtn) hintBtn.hidden = true;
  document.getElementById('dqx20-hint-overlay').hidden = true;
  const btn = document.getElementById('dqx20-check');
  if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
  const revealBtn = document.getElementById('dqx20-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'الانتقال إلى إجابتي'; }
  dqx20Render();
  /* מחווה מונפשת (Gesture Hints, SELF-QA.md §7) — גרירה, מעל הפריט
     הראשון במאגר, פעם אחת במסך הזה. */
  gestureHintShow('s20-drag', 'drag', document.getElementById(DQX20_DRAG_IDS[0]), 'below');
}

/* אתחול חד-פעמי — הפיכת שתי תיבות המשוב החדשות לגרירות, לפי מוסכמת
   "Feedback popup system" (לא בתוך resetScreenState, כדי לא לצבור
   מאזיני mousedown כפולים בכל חזרה למסך) */
scqFbMakeDraggable('s19-popup');
scqFbMakeDraggable('dqx20-popup');

/* Escape סוגר כל הצצת-רמז פתוחה — מוסכמת הפרויקט (תואם ל-scq-hint
   -overlay/closeAllPopupsAndHints, כאן רק ל-Escape במפורש) */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  const s19Overlay = document.getElementById('s19-hint-overlay');
  if (s19Overlay && !s19Overlay.hidden) s19CloseHint();
  const dqx20Overlay = document.getElementById('dqx20-hint-overlay');
  if (dqx20Overlay && !dqx20Overlay.hidden) dqx20CloseHint();
});


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
shuffleContainerChildren('ddq13-source-bank');
/* resume: remember the dealt order (persisted; applyResumeVars overrides it with the saved deal). */
(function () {
  const bank = document.getElementById('ddq13-source-bank');
  if (bank) ddq13BankOrder = Array.from(bank.children).map(function (c) { return c.id; }).filter(function (id) { return DDQ13_ITEM_IDS.indexOf(id) !== -1; });
})();

/* אתחול */
scaleApp();
resetScreenState(0);
s1StartImageLoop();
/* ניווט חוצה-סינים (בקשה מפורשת): סיין 1 הוא הראשון ביחידה (אין
   כפתור "חזרה" יוצא ממנו), אבל הוא כן יעד נכנס — "חזרה" מסיין 2
   מגיע לכאן עם `?start=last` ומצפה למסך האחרון, לא למסך הראשון. */
/* Dev walkthrough only (guide §8.12): the platform launches each component on its own. */
if (typeof DEV_NAV !== 'undefined' && DEV_NAV &&
    new URLSearchParams(window.location.search).get('start') === 'last') {
  goTo(TOTAL_SCREENS - 1);
}


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד, נקראים בזמן call על ידי ../unit-js/ (guide §6.1). SCREEN_TO_SUBCONTENT מחזיק
   בדיוק TOTAL_SCREENS מפתחות (21) — מפתח חסר = מסך שלא מדווח, בשקט; _test/verify-report.js
   אוכף זאת. Value[0] = סיומת הפריט (מחרוזת 3 ספרות), value[1] = עמוד-בפריט (תיעוד בלבד),
   null = מסך בלי פריט בקטלוג. מסכי מעבר/נרטיב ממופים לפריט שהם שייכים לו (D-2: כל פריט בקטלוג
   מקבל מסך; שני המסלולים של סין 01 — קריאה s4 / סרטון s10 — שייכים לפריט 002). מקור:
   docs-and-tools/METADATA-AUDIT.md §2. */
/* Split 2026-10-27 (QA/2026-10-26): until then 002 held the choice and both paths, and the bot answered
   about the path the learner had not chosen. Now 002 is the choice, the reading path is 004 (s4-s7),
   its copper-wire question 005 (s8) and conclusion 006 (s9), the video path 003 (s10); both paths meet
   at s11. The old 003-007 moved to 007-011. */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],
  1: ['001', 2],
  2: ['001', 3],
  3: ['002', 1],      // path choice
  4: ['004', 1],      // reading path
  5: ['004', 2],
  6: ['004', 3],
  7: ['004', 4],
  8: ['005', 1],      // reading path — copper-wire question
  9: ['006', 1],      // reading path — conclusion
  10: ['003', 1],     // video path
  11: ['007', 1],
  12: ['007', 2],
  13: ['007', 3],
  14: ['008', 1],
  15: ['009', 1],
  16: ['009', 2],
  17: ['009', 3],
  18: ['010', 1],
  19: ['010', 2],
  20: ['011', 1]
};

var XAPI_COMP_SLUG = 'methodica-ar-science-body-matter-01-01';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '005': 1, '007': 1, '010': 1, '011': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
/* The s3 learning-path choice ('selected', learning-type — unit-js/20-xapi.js xapiSelectedLearningType):
   s3SelectedPath -> the path's first item and its catalogue mediaFormat (the statement's response). */
var XAPI_LEARNING_PATHS = { video: { item: '003', mediaFormat: 'video' }, read: { item: '004', mediaFormat: 'text' } };
var XAPI_METADATA_FILE = '../metadata/methodica-ar-science-body-matter-01-01.json';
var XAPI_END_BTN = 'dqx20-check';                               /* the part's last button (D-8, restoreEndedButton) */

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
  if (DEV_NAV) window.location.href = '../methodica-ar-science-body-matter-01-02/index.html' + window.location.search;
}


/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-10-19): מצב ניקוד/ניתוב בלבד — currentScreen, XAPI_Q_RESULTS ומפות ההתקדמות.
   שלב ב' (2026-10-19): משתני התשובה של כל מסך + ציירים לפי סוג אינטראקציה (§8.8 כללים 1–12).

   payload.screens — תת-אובייקט אחד לכל מסך אינטראקטיבי, לפי ה-prefix שלו:
     s1    { text, answered }                                   שאלה פתוחה (הטקסט חי רק ב-DOM)
     s3    { path }                                             בחירת מסלול (וידאו/קריאה)
     s4    { c1, c2, done }                                     קלפים מתהפכים (שער "המשך")
     s8    { values, attempts, done, phase, snap, showingCorrect, lw }   תפריטים נפתחים (§8.9 "the dropdown one", §8.10)
     s10   { watched }                                          שער צפייה ב-YouTube (כלל 11)
     ddq13 { done, attempts, snap, revealed, lw, parents, order }         גרירה לאזורים — ההורה ב-DOM הוא המודל (§8.9)
     s16   { done }  s17 { done }                               חשיפה מתוזמנת (שער "המשך", כלל 11)
     s19   { selected, attempts, done, phase, lw }              בחירה יחידה
     dqx20 { placement, order, checked, attempts, done, snap, revealed, lw }  גרירת מילים למשבצות (הערבוב נשמר, §8.9)
   `lw` = חתימת הניסיון השגוי הלא-אחרון (Retry gate, כלל 9). בחירות ממתינות (לא הוגשו) נשמרות גם הן (כלל 4).
   הדמות (s0) היא מצב ברמת היחידה (setUnitCharacter / getUnitCharacter ב-40-resume.js) — לא כאן. */

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

/* ── שאלה פתוחה (HookOpenQuestion) — מראה רק את כתיבות ال-DOM של oaqOnInput/oaqCheck ── */
function paintOpenText(cfg) {
  var field = rsById(cfg.prefix + '-answer');
  var row = document.querySelector('#' + cfg.prefix + ' .hoq-character-row');
  var local = rsById(cfg.prefix + '-check-local');
  var btn = rsById(cfg.prefix + '-check');
  var answered = !!oaqAnsweredState[cfg.prefix];
  var hasText = !!(field && field.value.trim().length > 0);
  if (!answered && !hasText) return;                       /* מסך נקי: כלום لا הוקלד */
  if (row) row.classList.toggle('visible', answered);
  if (field) field.disabled = answered;
  if (local) local.disabled = answered || !hasText;
  if (btn) btn.disabled = !answered;
}

/* ── קלפים מתהפכים (FlipCardsReveal) — שער "متابعة" (כלל 11) ── */
function paintFlipCards(cfg) {
  var s = cfg.state();
  if (!s.c1 && !s.c2 && !s.done) return;                   /* מסך נקי */
  var f1 = s.done || s.c1, f2 = s.done || s.c2;
  var c1 = rsById(cfg.ids[0]), c2 = rsById(cfg.ids[1]);
  if (c1) c1.classList.toggle('flipped', !!f1);
  if (c2) c2.classList.toggle('flipped', !!f2);
  if (f1 || f2) gestureHintHide(cfg.hintKey);
  var btn = rsById(cfg.btnId);
  if (btn) btn.disabled = !(f1 && f2);
}

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

/* ── תפריטים נפתחים מותאמים (DropdownQuestion) — התווית הנראית היא היטל של מפת הערכים (§8.9) ──
   cfg.state() → {values, attempts, done, phase, snap, showingCorrect, lw} */
function paintDropdown(cfg) {
  var s = cfg.state();
  var anyValue = cfg.rows.some(function (id) { return !!s.values[id]; });
  if (!anyValue && !s.attempts && !s.done) return;         /* מסך נקי: כלום لا נבחר */
  var btn = rsById(cfg.prefix + '-check');
  cfg.rows.forEach(function (id) {
    var v = rsById(cfg.prefix + '-dd-' + id + '-val');
    if (v) v.textContent = s.values[id] || '';
    var b = rsById(cfg.prefix + '-dd-' + id + '-btn');
    if (b) { b.classList.remove('correct', 'wrong'); b.disabled = false; }
  });
  if (s.done) {
    if (s.phase === 'wrong-final' && s.snap) {
      /* §8.10: שלושה דברים — הערכים המוצגים, התשובה של הלומד (snap) ומה מוצג כרגע */
      cfg.renderBoard(!!s.showingCorrect);
      var partial = cfg.rows.some(function (id) { return !!(s.snap[id] && s.snap[id].correct); });
      cfg.showFeedback(partial ? 'wrong2Partial' : 'wrong2Full', false);
      rsSetReveal(cfg.prefix + '-reveal-btn', true, !!s.showingCorrect);
    } else {
      cfg.mark();
      cfg.lock();
      cfg.showFeedback('correct', true);
      rsSetReveal(cfg.prefix + '-reveal-btn', false);
    }
    cfg.setBarDone('متابعة', cfg.cont);
    return;
  }
  rsSetReveal(cfg.prefix + '-reveal-btn', false);
  if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.onclick = cfg.check; }
  var allSelected = cfg.rows.every(function (id) { return !!s.values[id]; });
  if (s.attempts && s.lw) {
    var sub = rsParseSig(s.lw);
    cfg.rows.forEach(function (id) {
      var b = rsById(cfg.prefix + '-dd-' + id + '-btn');
      if (!b) return;
      if (sub[id] === cfg.correct[id]) { b.classList.add('correct'); b.disabled = true; }   /* §5.3: שורה נכונה נעולה */
      else if (sub[id] === (s.values[id] || '')) b.classList.add('wrong');                  /* כלל 10 */
    });
    if (cfg.sig() === s.lw) {
      var partial1 = cfg.rows.some(function (id) { return s.values[id] === cfg.correct[id]; });
      cfg.showFeedback(partial1 ? 'wrong1Partial' : 'wrong1Full', false);
      if (btn) btn.disabled = true;
      return;
    }
  }
  if (btn) btn.disabled = !allSelected || cfg.sig() === s.lw;   /* כלל 2 + Retry gate */
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

/* ── הקונפיגורציות — נבנות בזמן הקריאה (لا const ברמת הקובץ: goTo של DEV_NAV רץ לפני סוף הקובץ) ── */
function rsCfgS8() {
  return {
    prefix: 's8', rows: S8_ROWS, correct: S8_CORRECT,
    state: function () { return { values: s8Values, attempts: s8Attempts, done: s8Done, phase: s8Phase, snap: s8AnswerSnapshot, showingCorrect: s8ShowingCorrect, lw: s8LastWrong }; },
    sig: s8Sig, showFeedback: s8ShowFeedback, setBarDone: s8SetBarDone, cont: s8Continue, check: s8Check,
    renderBoard: s8RenderBoard, mark: s8MarkDropdowns, lock: s8LockDropdowns
  };
}
function rsCfgDdq13() {
  return {
    prefix: 'ddq13', itemIds: DDQ13_ITEM_IDS,
    state: function () { return { done: ddq13Done, attempts: ddq13Attempts, snap: ddq13AnswerSnapshot, revealed: ddq13Revealed, lw: ddq13LastWrong }; },
    sig: ddq13Sig, showFeedback: ddq13ShowFeedback, revealCorrect: ddq13RevealCorrect, restoreMine: ddq13RestoreMine,
    cont: ddq13Continue, check: ddq13Check, hintId: null, nav: null
  };
}
function rsCfgS19() {
  return {
    prefix: 's19', q: S19,
    state: function () { return { selected: s19Selected, attempts: s19Attempts, done: s19Done, phase: s19Phase, lw: s19LastWrong }; },
    optEl: s19OptEl, lock: s19LockOptions, unlock: s19UnlockOptions, showFeedback: s19ShowFeedback,
    setBarDone: s19SetBarDone, cont: s19Continue, check: s19Check, nav: function () { updateQuestionNav('s19'); }
  };
}
function rsCfgDqx20() {
  return {
    prefix: 'dqx20', labels: DQX20_LABELS, correctMap: DQX20_CORRECT_MAP, dragIds: DQX20_DRAG_IDS, targetIds: DQX20_TARGET_IDS,
    state: function () { return { placement: dqx20Placement, checked: dqx20Checked, attempts: dqx20Attempts, done: dqx20Done, snap: dqx20AnswerSnapshot, revealed: dqx20Revealed, lw: dqx20LastWrong }; },
    sig: dqx20Sig, render: dqx20Render, showFeedback: dqx20ShowFeedback, explanation: DQX20_SHARED_EXPLANATION,
    texts: { correct: 'ممتاز!', wrong1Full: 'الإجابة غير صحيحة.', wrong1Partial: 'الإجابة صحيحة جزئيًا.', finalFull: 'الإجابة غير صحيحة.', finalPartial: 'الإجابة صحيحة جزئيًا.' },
    hintId: 'dqx20-hint', nav: function () { updateQuestionNav('s20'); }
  };
}

/* Item split (2026-10-27): state saved before it carries the old suffixes — qResults and the hints
   ledger ('<item>/<qKey>'), doneItems ('<slug>#<item>'). Old 002 was the choice + both paths: its
   question (s8) is now 005, and its 'completed' marks the learner's path items as well (002 stays — the
   choice was passed). Old 003-007 → 007-011. Runs once; `ids` marks a payload as already current. */
var RS_ITEM_IDS = 2;
var RS_ITEM_RENUMBER = { '003': '007', '004': '008', '005': '009', '006': '010', '007': '011' };
function _rsRenumberKeys(map, re, ren) {
  if (!map) return map;
  var out = {};
  Object.keys(map).forEach(function (k) {
    out[k.replace(re, function (all, pre, item, post) { return pre + (ren[item] || item) + post; })] = map[k];
  });
  return out;
}
function _rsRenumberItems(st) {
  if (st.ids === RS_ITEM_IDS) return;
  var qRen = Object.assign({ '002': '005' }, RS_ITEM_RENUMBER);
  st.qResults = _rsRenumberKeys(st.qResults, /^()(\d{3})(\/.*)$/, qRen);
  if (typeof _unitState !== 'undefined' && _unitState) {
    _unitState.hints = _rsRenumberKeys(_unitState.hints, /^()(\d{3})(\/.*)$/, qRen);
    var d = _rsRenumberKeys(_unitState.doneItems, /^(.*#)(\d{3})()$/, RS_ITEM_RENUMBER);
    var path = st.screens && st.screens.s3 && st.screens.s3.path;
    if (d && d[itemLedgerKey('002')]) {
      (path === 'video' ? ['003'] : ['004', '005', '006']).forEach(function (it) { d[itemLedgerKey(it)] = d[itemLedgerKey('002')]; });
    }
    if (d) _unitState.doneItems = d;
  }
  st.ids = RS_ITEM_IDS;
}

/* ── 1. capture ── */
function capturePartPayload() {
  var s1Field = rsById('s1-answer');
  var ddq13Parents = {};
  DDQ13_ITEM_IDS.forEach(function (id) {
    var el = rsById(id);
    ddq13Parents[id] = el && el.parentElement ? el.parentElement.id : 'ddq13-source-bank';
  });
  return {
    ids: RS_ITEM_IDS,
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    stationProgress: Object.assign({}, stationProgress),
    screens: {
      s1: { text: s1Field ? s1Field.value : '', answered: !!oaqAnsweredState['s1'] },
      s3: { path: s3SelectedPath },
      s4: { c1: s4Card1Flipped, c2: s4Card2Flipped, done: s4Done },
      s8: { values: Object.assign({}, s8Values), attempts: s8Attempts, done: s8Done, phase: s8Phase,
            snap: rsCopy(s8AnswerSnapshot), showingCorrect: s8ShowingCorrect, lw: s8LastWrong },
      s10: { watched: s10Watched },
      ddq13: { done: ddq13Done, attempts: ddq13Attempts, snap: rsCopy(ddq13AnswerSnapshot), revealed: ddq13Revealed,
               lw: ddq13LastWrong, parents: ddq13Parents, order: ddq13BankOrder.slice() },
      s16: { done: s16Done },
      s17: { done: s17Done },
      s19: { selected: s19Selected, attempts: s19Attempts, done: s19Done, phase: s19Phase, lw: s19LastWrong },
      dqx20: { placement: Object.assign({}, dqx20Placement), order: dqx20Order.slice(), checked: dqx20Checked,
               attempts: dqx20Attempts, done: dqx20Done, snap: rsCopy(dqx20AnswerSnapshot), revealed: dqx20Revealed, lw: dqx20LastWrong }
    }
  };
}

/* ── 2. variables (never the DOM). Safe with a stage-A / partial payload. ── */
function rsSameMembers(arr, ids) {
  return Array.isArray(arr) && arr.length === ids.length && ids.every(function (id) { return arr.indexOf(id) !== -1; });
}
function applyResumeVars(st) {
  if (!st) return;
  _rsRenumberItems(st);
  if (st.qResults) Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  if (st.stationProgress) Object.keys(st.stationProgress).forEach(function (k) { stationProgress[k] = st.stationProgress[k]; });
  var sc = st.screens;
  if (!sc || typeof sc !== 'object') return;
  var v;
  if ((v = sc.s1)) oaqAnsweredState['s1'] = !!v.answered;
  if ((v = sc.s3)) s3SelectedPath = (v.path === 'video' || v.path === 'read') ? v.path : null;
  if ((v = sc.s4)) { s4Card1Flipped = !!v.c1; s4Card2Flipped = !!v.c2; s4Done = !!v.done; }
  if ((v = sc.s8)) {
    s8Values = { guf: '', homer: '' };
    S8_ROWS.forEach(function (id) { if (v.values && typeof v.values[id] === 'string') s8Values[id] = v.values[id]; });
    s8Attempts = v.attempts | 0;
    s8Done = !!v.done;
    s8Phase = typeof v.phase === 'string' ? v.phase : 'before';
    s8AnswerSnapshot = rsCopy(v.snap);
    s8ShowingCorrect = !!v.showingCorrect;
    s8LastWrong = typeof v.lw === 'string' ? v.lw : null;
  }
  if ((v = sc.s10)) s10Watched = !!v.watched;
  if ((v = sc.ddq13)) {
    ddq13Done = !!v.done;
    ddq13Attempts = v.attempts | 0;
    ddq13AnswerSnapshot = rsCopy(v.snap);
    ddq13Revealed = !!v.revealed;
    ddq13LastWrong = typeof v.lw === 'string' ? v.lw : null;
    if (rsSameMembers(v.order, DDQ13_ITEM_IDS)) ddq13BankOrder = v.order.slice();
  }
  if ((v = sc.s16)) s16Done = !!v.done;
  if ((v = sc.s17)) s17Done = !!v.done;
  if ((v = sc.s19)) {
    s19Selected = typeof v.selected === 'string' ? v.selected : null;
    s19Attempts = v.attempts | 0;
    s19Done = !!v.done;
    s19Phase = typeof v.phase === 'string' ? v.phase : 'before';
    s19LastWrong = typeof v.lw === 'string' ? v.lw : null;
  }
  if ((v = sc.dqx20)) {
    DQX20_DRAG_IDS.forEach(function (id) {
      var p = v.placement ? v.placement[id] : null;
      dqx20Placement[id] = (p === 'source' || DQX20_TARGET_IDS.indexOf(p) !== -1) ? p : 'source';
    });
    if (rsSameMembers(v.order, DQX20_DRAG_IDS)) dqx20Order = v.order.slice();   /* never re-deal (§8.9) */
    dqx20Checked = !!v.checked;
    dqx20Attempts = v.attempts | 0;
    dqx20Done = !!v.done;
    dqx20AnswerSnapshot = rsCopy(v.snap);
    dqx20Revealed = !!v.revealed;
    dqx20LastWrong = typeof v.lw === 'string' ? v.lw : ((dqx20Attempts > 0 && !dqx20Done) ? dqx20Sig() : null);   /* old-doc fallback (rule 9) */
  }
}

/* ── 3. what lives only in the DOM (runs AFTER goTo; the painter re-derives the buttons, rule 11) ── */
function applyResumeDom(st) {
  if (!st || !st.screens || typeof st.screens !== 'object') return;
  var sc = st.screens;
  /* s1 — the textarea text */
  if (sc.s1 && typeof sc.s1.text === 'string') {
    var f = rsById('s1-answer');
    if (f) f.value = sc.s1.text;
  }
  /* s8 — custom-dropdown labels (§8.9 "the dropdown one"); the §9 reveal view is re-derived by the painter */
  if (sc.s8 && sc.s8.values && typeof sc.s8.values === 'object') {
    S8_ROWS.forEach(function (id) {
      var el = rsById('s8-dd-' + id + '-val');
      if (el && typeof sc.s8.values[id] === 'string') el.textContent = sc.s8.values[id];
    });
  }
  /* ddq13 — DOM parentage is the model: re-append each item into its saved container, in the dealt order */
  if (sc.ddq13 && sc.ddq13.parents && typeof sc.ddq13.parents === 'object') {
    var bank = rsById('ddq13-source-bank');
    var order = ddq13BankOrder.slice();
    DDQ13_ITEM_IDS.forEach(function (id) { if (order.indexOf(id) === -1) order.push(id); });
    order.forEach(function (id) {
      var el = rsById(id);
      if (!el) return;
      var pid = sc.ddq13.parents[id];
      var p = (typeof pid === 'string' && (pid === 'ddq13-source-bank' || pid.indexOf('ddq13-zone-') === 0)) ? rsById(pid) : null;
      if (!p) p = bank;
      if (p) p.appendChild(el);
    });
  }
}

/* ── 4. painter dispatch — one branch per interactive / gated screen (rule 11) ── */
function restoreScreenUI(n) {
  switch (n) {
    case 0:  rsPaint('s0', resetScreenState0); break;                                   /* הדמות — ציור אידמפוטנטי קיים */
    case 1:  rsPaint('s1', paintOpenText, { prefix: 's1' }); break;
    case 3:  rsPaint('s3', resetScreenState3); break;                                   /* בחירת מסלול — ציור אידמפוטנטי קיים */
    case 4:  rsPaint('s4', paintFlipCards, { ids: ['flip-card-chair', 'flip-card-wood'], btnId: 's4-continue', hintKey: 's4-flip',
               state: function () { return { c1: s4Card1Flipped, c2: s4Card2Flipped, done: s4Done }; } }); break;
    case 8:  rsPaint('s8', paintDropdown, rsCfgS8()); break;
    case 10: rsPaint('s10', resetScreenState10); break;                                 /* שער הצפייה — סנכרון אידמפוטנטי (כלל 11) */
    case 13: rsPaint('ddq13', paintDragZones, rsCfgDdq13()); break;
    case 16: rsPaint('s16', function () { if (s16Done) resetScreenState16(); }); break;  /* חשיפה מתוזמנת שהושלמה */
    case 17: rsPaint('s17', function () { if (s17Done) resetScreenState17(); }); break;
    case 19: rsPaint('s19', paintScq, rsCfgS19()); break;
    case 20: rsPaint('dqx20', paintDragSlots, rsCfgDqx20()); break;
    default: break;
  }
}
