# PROJECT_BRIEF.md — לומדת "יעד 11" (720 | מדעים | סיין 5)

## לקוח והקשר
תכנית 720, מדעים — המשך ישיר לאותו הקשר לקוח/תכנית כמו `מדעים יעד 2`/`מדעים
יעד 3` וכמו סיין 1 (`methodica-science-body-matter-01-01`) של אותה יחידה.
שם התיקייה: `methodica-science-body-matter-01-06` — סיין 6 מתוך **7
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
כל 5 מסכי הסיין נבנו לפי `פרומפט בניית מסכים של סיין 5.docx`
(`TOTAL_SCREENS = 5`): "שאלת שיא מועד א" — מסך מעבר פתיחה, 4 סעיפים
(SCQ+טבלה, DropdownQuestion 3-בלוקים+תמונה, SCQ+טבלה עם הנפשת-כניסה,
גרירת-השלמת-טענה 4-יעדים עם הנפשת-כניסה). שער-הציון ("לפחות 3 מתוך 4
נכון") נבדק בסוף הסעיף האחרון ומנתב חוצה-סיינים לסיין 6 — **בשני
המסלולים גם יחד** (עבר/נכשל). **תוקן (2026-09-28, בקשה מפורשת):**
מסך המעבר החגיגי השישי (שהוצג רק למי שעבר) הוסר לגמרי; שני המסלולים
מגיעים כעת לאותו יעד. ראו `ARCHITECTURE.md` למפת המסכים המלאה ולפירוט
מנגנון שער-הציון.

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
`TOTAL_SCREENS = 5` — כל מסכי הסיין נבנו ונבדקו קצה-לקצה ב-Playwright
(כולל שני מסלולי שער-הציון בפועל — עבר/נכשל, שניהם מנתבים כיום לסיין 6).
לא נבדק מחדש ב-Playwright אחרי הסרת מסך המעבר החגיגי (2026-09-28).
