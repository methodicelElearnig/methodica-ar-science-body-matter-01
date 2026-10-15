# ARCHITECTURE.md — לומדת "יעד 11" | סיין 3

## הערה מתודולוגית — מקור האמת בפרויקט הזה
זהה לעיקרון שנקבע ב-`../methodica-science-body-matter-01-01/ARCHITECTURE.md`:
מסמך זה מתעד את **הקוד בפועל** בתיקייה הזו, לא תיאור תיאורטי.

## מצב נוכחי
`TOTAL_SCREENS = 1`, מסך placeholder יחיד (`data-screen="0"`, `id="s0"`).
תשתית טכנית בלבד — הועתקה 1:1 מסיין 1 (מאומתת שם, ראו שם לפירוט מלא
ולרציונל של כל החלטת תשתית — לא חוזר כאן כדי לא לשכפל תיעוד).

## Canvas ומנוע
זהה לחלוטין לסיין 1 (הקוד הועתק verbatim מ-`script.js`/`styles.css`/
`index.html`/`index_dev.html` שם):
- קנבס עבודה יחיד: **1280 × 710px**, `scaleApp()`.
- ניווט מסכים: `goTo(n)` / `resetScreenState(n)` / `TOTAL_SCREENS = 1`,
  כולל `closeAllPopupsAndHints()` (סוגר כל `[id$="-popup"]`/
  `[id$="-hint-overlay"]`) לפני כל החלפת מסך.
- Dev postMessage bridge ל-`index_dev.html` (title בלבד שונה: "סיין 3").
- 11 טוקני נושא (Science theme) — זהה לסיין 1 (אותה יחידה, אותו נושא).

## Companion character system — מפתח משותף לכל הסינים ביחידה
`CHARACTER_STORAGE_KEY = 'body-matter-01_selectedCharacter'` — **אותו מפתח
בדיוק** כמו סיין 1 וכל סין אחר ביחידה הזו (מתויג לרמת הלומדה כולה, לא
לרמת הסיין הבודד), כדי שבחירת דמות (אם/כשתיבנה, מסך TwoOptionSelection
כלשהו) תעבור בין כל 6 הסינים. `window.lomdaState.selectedCharacter` נקרא
ממנו באתחול (`null` כרגע — אין עדיין מסך בחירה בנוי באף סין).

## רכיבים גלובליים — הועתקו 1:1 מסיין 1
כל הרכיבים הבאים קיימים בקוד בדיוק כפי שאומתו ונבדקו בסיין 1 — לא שונו:
`.flag-btn`, `.img-zoom-btn`/`#img-zoom-modal`, פופ-אפ משוב גריר (`.scq-fb-*`
+ `scqFbResetPosition`/`scqFbClose`/`scqFbMakeDraggable`), פופ-אפ רמז
(`.scq-hint-*`, CSS בלבד), `.btn-continue`/`.btn-back`/`.btn-hint`, פס פעולה
תחתון RTL אמיתי, `resolveCharBubbleImg`/`resolveCharBubbleVideo`.
**מוסכמת ID (מחייבת לתוכן עתידי):** כל תיבת משוב עתידית → `<prefix>-popup`;
כל הצצת-רמז → `<prefix>-hint-overlay` (ראו סיין 1 → "החלטות תשתית" #3).

## מסך 0 (מסך 1) — TransitionScreen (`data-screen="0"`, `id="s0"`)
מסך ה-placeholder הוחלף (2026-08-03) בתוכן אמיתי — ראו "סדר בנייה" למטה.

## מבנה נכסים — עצמאות מלאה לכל סין
`assets/fonts,images,videos` בתוך תיקיית הסיין עצמה, מועתקים פיזית מסיין 1
(לא cross-folder) — זהה למוסכמה שאומתה שם.

## נבדק בפועל
Playwright headless: `index.html` נטען, מסך placeholder מוצג, `scaleApp()`
מפעיל `transform`, `.flag-btn` hover מחליף אייקון+label, `#img-zoom-modal`
קיים ומוסתר, `goTo(1)` הוא no-op בטוח, אפס שגיאות JS. `index_dev.html` נטען,
`DEV_READY` עם `total:1`.

## סדר בנייה — עד כה
1. תשתית טכנית מלאה — הועתקה 1:1 מסיין 1 שהושלם, לפי המוסכמה המחייבת
   "כל סין הוא חבילה עצמאית". ✅
2. `PROJECT_BRIEF.md` / `ARCHITECTURE.md` — נוצרו עם התשתית. ✅
3. מסכים 1-2 נבנו (2026-08-03) לפי "פרומפט בניית מסכים של סיין 3.docx" +
   תסריט ההפקה (שקפים 54-55). `TOTAL_SCREENS = 2`.
   - **מסך 1** — TransitionScreen (סיום תרגול → פתיחה למשימת כיתה),
     שוכפל ממסך 18 סיין 1 (משפחת `.transition-*`, הועתקה גלובלית
     ל-styles.css של הסיין הזה). 3 קטעי-טקסט בלבד (sub/TITLE/sub,
     בלי קיקר נוסף). כפתור המשך גנרי ("המשך", לא תווית מותאמת — לא
     נמצאה תיבת-טקסט ייעודית לכך בשקף 54). דמות: placeholder ריק
     (גיף "דמות עם שרשרת הוואי, רוקדת" — לא סופק).
   - **מסך 2** — משימת כיתה, שוכפל ממסך 2 (data-screen="1", id="s1")
     בסיין 3 **יעד 3** (methodica-science-mass-measure-03-03) — עמודה
     בודדת ממורכזת (`.s2-content`/`.s2-title`/`.s2-body`/`.s2-group`/
     `.s2-steps`). **2 סטיות מפורשות מהמקור:** (1) `.s2-content` עם
     left/right סימטרי (40/40, לא left:340 כמו במקור) ו-`.s2-title`
     בלי קיזוז `right:150px` מפצה — במקור המרווח הגדול פינה מקום
     לדמות+בועת-דיבור, ולתוכן שלנו (שקף 55) אין טקסט-בועה כלל, אז
     גם אין דמות; (2) `.s2-steps` קיבל `gap:8px` (לא היה במקור) כי
     פריטי-הרשימה שלנו הם משפטים ארוכים/צפופים, לא שורה קצרה. תוכן:
     4 סעיפים ממוספרים בפועל בתסריט עצמו (1-4) — נבנו כרשימת `.s2-steps`
     אחת (לא 3 קבוצות נפרדות כמו במקור), כל `<li>` עם הובלה מודגשת
     ממוזגת inline (`<b>`) + המשך רגיל. כפתור המשך מותאם ("חזרתי.
     אפשר להמשיך", `.s2-btn-continue-wide`) — תואם כמעט מילה-במילה גם
     למקור וגם לטקסט הכפתור בשקף 55 עצמו.
   אומת סטטית בלבד (אין כלי דפדפן זמין בסביבה זו): `node --check`,
   איזון תגיות HTML/braces CSS (כולל `<ol>`/`<li>`), בדיקת id-ים
   כפולים. ✅

## בדיקת `responsiveness` (סקיל)
זהה לסיין 1 (`../methodica-science-body-matter-01-01/ARCHITECTURE.md` →
"בדיקת responsiveness") — קוד זהה verbatim: `fixed-centered`, Level 1,
Runtime pass נקי במטריצת viewport מלאה. **אותו ממצא-לעתיד חל גם כאן:**
`scqFbMakeDraggable` (dormant, אין עדיין תיבת משוב בפועל) — חוסר-עקביות
פוטנציאלי במרחב קואורדינטות בין `getBoundingClientRect` ל-`style.left`/
`offsetWidth`; לבדוק ב-viewport לא-1:1 ברגע שתיבת משוב ראשונה תיבנה בסיין
הזה.

## תיקון מנוע — `closeAllPopupsAndHints()` (2026-07-27)
`script.js` בסיין הזה עודכן עם תיקון שהתגלה תוך כדי בניית מסך 2 בסיין 1:
הפונקציה הישנה הוסיפה class גנרי `"hidden"` הן לתיבות משוב (סגורות/
נפתחות בפועל דרך class `"visible"`) והן להצצות-רמז (סגורות/נפתחות דרך
ה-`hidden` property הנייטיבי) — קונפליקט `!important` שמנע פתיחה חוזרת
אחרי הניווט הראשון. תוקן לפעולה הפוכה נכונה per סוג רכיב. היה דורמנטי
כאן (טרם נבנה מסך תוכן שמפעיל פופ-אפ/רמז) — פירוט מלא + קוד:
`../methodica-science-body-matter-01-01/ARCHITECTURE.md` → "מסך 2" →
"באג תשתית שהתגלה ותוקן".
