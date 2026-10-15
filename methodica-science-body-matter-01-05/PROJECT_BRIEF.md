# PROJECT_BRIEF.md — לומדת "יעד 11" (720 | מדעים | סיין 4)

## לקוח והקשר
תכנית 720, מדעים — המשך ישיר לאותו הקשר לקוח/תכנית כמו `מדעים יעד 2`/`מדעים
יעד 3` וכמו סיין 1 (`methodica-science-body-matter-01-01`) של אותה יחידה.
שם התיקייה: `methodica-science-body-matter-01-05` — סיין 5 מתוך **7
סינים** מתוכננים ליחידה. תשתית טכנית מלאה הועתקה 1:1 מסיין 1 (מאומתת שם
ב-Playwright) — לא הומצאה מחדש, לפי הכלל "לחפש במקור לפני שממציאים".

**נושא הלימוד:** זהה לסיין 1 — גוף וחומר (זיהוי חומר גוף, ניסוח הגדרות
לגוף/לחומר, מיון 12 תכונות), לפי `יעד 11 גוף חומר ותוכנות_260726_להפקה.pptx`
(משותף לכל 6 הסינים).

## מטרת הפרויקט
זהה לחלוטין לסיין 1: המרת עיצוב Figma/תסריט ללומדה אינטראקטיבית עובדת
ב-HTML5 + CSS3 + JavaScript טהור, בנאמנות ויזואלית גבוהה, בעברית, RTL מלא.
ראו `ARCHITECTURE.md` של הסיין הזה + `../methodica-science-body-matter-01-01/ARCHITECTURE.md`
לתיעוד המלא של המנוע/הרכיבים הגלובליים והחלטות התשתית (לא חוזר כאן כדי לא
לשכפל תיעוד).

## היקף השלב הנוכחי
כל 9 מסכי הסיין נבנו לפי `פרומפט בניית מסכים של סיין 4.docx`
(`TOTAL_SCREENS = 9`): מסך מעבר, יישומון אינטראקטיבי מוטמע ("מעבדת
הבקבוקים") המשולב ב-4 מסכי תוכן, רצף 4-שאלות עם סרגל התקדמות (SCQ×2,
גרירת-השלמת-משפטים, SCQ+טבלה, ותבנית "שאלת התאמה" חדשה), ומסך הוטספוטים
מסכם. ראו `ARCHITECTURE.md` למפת המסכים המלאה ולפירוט הסטיות המתועדות
מהמקורות המצוטטים.

## מה הועתק מסיין 1 (זהה 1:1, לא הותאם)
- Canvas + scaling (`#app` 1280×710, `scaleApp()`).
- מנוע ניווט (`goTo`/`resetScreenState`/`TOTAL_SCREENS`) + Dev postMessage
  bridge (`index_dev.html`, כולל `closeAllPopupsAndHints()` לפני כל החלפת
  מסך) + ניווט מקלדת (Ctrl+←/→).
- 11 טוקני הנושא (`--subject-100`…`--subject-900`, `--subject-alpha-100/200`,
  Science theme).
- פונטים (`assistant-hebrew.woff2`/`assistant-latin.woff2`, עותק מקומי
  ב-`assets/fonts/` — כל סין הוא חבילה עצמאית).
- כפתורים גלובליים: `.btn-continue`/`.btn-back`/`.btn-hint`.
- פס פעולה תחתון RTL אמיתי (סדר DOM, בלי `direction:ltr`).
- `.flag-btn`, `.img-zoom-btn`/`#img-zoom-modal`, `.scq-fb-*` (פופ-אפ משוב),
  `.scq-hint-*` (CSS) — CSS+JS מוכנים, טרם מחוברים לתוכן.
- `resolveCharBubbleImg`/`resolveCharBubbleVideo` — פונקציות עזר גנריות
  ל-Companion character system.
- מפתח `localStorage` מתויג ללומדה: `CHARACTER_STORAGE_KEY =
  'body-matter-01_selectedCharacter'` — **אותו מפתח בדיוק** כמו כל סין אחר
  ביחידה הזו (מתויג לרמת הלומדה, לא לרמת הסיין), כדי שבחירת דמות תעבור בין
  הסינים.

## דרישות מחייבות (זהות לכל 720 לומדות)
זהות לסיין 1 (ראו שם) — שבעת הסקילים לכל מסך/סיין (720-templates, figma-lomda-builder, 720-design-guidelines, animation-system, responsiveness, lomda-qa-publish, skill-maintainer, כל אחד בשלבו), HTML5+CSS3+JS טהור, קנבס
1280×710, RTL אמיתי, assets מקומיים לכל סין, בדיקת Playwright לכל מסך.

## מבנה קבצים (זהה לסיין 1)
```
├── PROJECT_BRIEF.md
├── ARCHITECTURE.md
├── index.html
├── index_dev.html
├── styles.css
├── script.js
└── assets/
    ├── fonts/    (assistant-hebrew.woff2, assistant-latin.woff2)
    ├── images/   (btn-flag-default.png, btn-flag-hover.png)
    └── videos/
```

## סטטוס
`TOTAL_SCREENS = 9` — כל מסכי הסיין נבנו ועברו בדיקות סטטיות (תחביר JS,
איזון תגיות HTML, איזון CSS). לא בוצעה הרצת דפדפן/Playwright בפועל על
מסכי התוכן — מומלץ לפני מסירה/QA.
