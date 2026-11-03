#!/usr/bin/env python3
"""check-metadata.py — validate metadata/*.json against the unit's UI.

Run from anywhere:   python -I -X utf8 docs-and-tools/check-metadata.py

What it checks (see METADATA-AUDIT.md for the rules R1–R8):

  R7  hygiene — every answers / source / target string is NFC, trimmed,
      single-spaced, free of the xAPI separators "[,]" "[.]" "[:]";
      correctAnswers ⊆ answers byte-for-byte; sources / targets / answers unique;
      questionType is one of the Kata enum values.
  R8  census — the graded check functions found in each part's script.js
      (function <x>Check() that is wired to a screen's "צדקתי?" button) must
      correspond 1:1 to the questions declared in metadata/, through the
      SCREEN_MAP table below (which is also the table in METADATA-AUDIT.md).
  UI  cross-check — for every graded screen, the option / drag / dropdown texts
      and the correct answer read from index.html + script.js must equal the
      metadata answers byte-for-byte (R2–R5), including DOM order for choice.

Exit code 0 when clean, 1 when any ERROR was printed. Only metadata/, the
parts' index.html and script.js are read; nothing is written.
"""
import io
import json
import os
import re
import sys
import unicodedata

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
META = os.path.join(ROOT, 'metadata')
UNIT = 'methodica-ar-science-body-matter-01'
IRI_BASE = 'https://lomdot.education.gov.il/metodica/720/ar/science/body-matter/01/'
KATA_TYPES = {'fill-in', 'true-false', 'choice', 'numeric', 'sequencing',
              'matching', 'performance', 'other'}
EXPECTED_GRADED = 30

# ---------------------------------------------------------------------------
# SCREEN_MAP — one row per screen of every part (the mapping table of
# METADATA-AUDIT.md). Fields:
#   part, data-screen index (0-based), screen id, item suffix (or None),
#   qKey (or None), questionType (or None), graded (bool), check function (or None)
# ---------------------------------------------------------------------------
SCREEN_MAP = [
    # part 01 — בואו נלמד משהו חדש
    ('01', 0, 's0', '001', None, None, False, None),           # בחירת דמות מלווה
    ('01', 1, 's1', '001', 'q1', 'other', False, 'oaqCheck'),  # שאלה פתוחה לא מוערכת (R6) — declared since 2026-10-27, never 'answered'
    ('01', 2, 's2', '001', None, None, False, None),           # מסך מעבר: נושא היחידה
    # split 2026-10-27 (QA/2026-10-26): 002 choice, 003 video, 004 reading, 005 its question, 006 conclusion;
    # the old 003-007 moved to 007-011
    ('01', 3, 's3', '002', None, None, False, None),           # בחירת מסלול: סרטון / קריאה
    ('01', 4, 's4', '004', None, None, False, None),           # גוף — גזע עץ וכיסא
    ('01', 5, 's5', '004', None, None, False, None),           # גוף אחד — חומרים רבים
    ('01', 6, 's6', '004', None, None, False, None),           # תכונות גוף / תכונות חומר
    ('01', 7, 's7', '004', None, None, False, None),           # חיתוך חוט נחושת
    ('01', 8, 's8', '005', 'q1', 'matching', True, 's8Check'), # 2 תפריטים: השתנו / לא השתנו
    ('01', 9, 's9', '006', None, None, False, None),           # המסקנה
    ('01', 10, 's10', '003', None, None, False, None),         # סרטון (נתיב הצפייה)
    ('01', 11, 's11', '007', None, None, False, None),         # מסך מעבר: אותו חומר — מה שונה?
    ('01', 12, 's12', '007', None, None, False, None),         # גוף מעובד / שאינו מעובד
    ('01', 13, 's13', '007', 'q1', 'matching', True, 'ddq13Check'),  # גרירה ל-2 קבוצות
    ('01', 14, 's14', '008', None, None, False, None),         # סיכום מושגים
    ('01', 15, 's15', '009', None, None, False, None),         # מסך מעבר: טבלאות ותרשימים
    ('01', 16, 's16', '009', None, None, False, None),         # טבלת השוואה
    ('01', 17, 's17', '009', None, None, False, None),         # תרשים זרימה
    ('01', 18, 's18', '010', None, None, False, None),         # מסך מעבר: שאלות חימום
    ('01', 19, 's19', '010', 'q1', 'choice', True, 's19Check'),
    ('01', 20, 's20', '011', 'q1', 'matching', True, 'dqx20Check'),
    # part 02 — זמן תרגול (data-screen 0–7, ids s21–s28)
    ('02', 0, 's21', '001', None, None, False, None),          # מסך מעבר: סיימנו את שלב הלימוד
    ('02', 1, 's22', '001', None, None, False, None),          # היכרות עם 3 החומרים
    ('02', 2, 's23', '001', 'q1', 'choice', True, 's23Check'),
    ('02', 3, 's24', '001', 'q2', 'choice', True, 's24Check'),
    ('02', 4, 's25', '002', 'q1', 'choice', True, 's25Check'),
    ('02', 5, 's26', '003', 'q1', 'choice', True, 's26Check'),
    ('02', 6, 's27', '004', 'q1', 'matching', True, 'ddq27Check'),
    ('02', 7, 's28', '005', 'q1', 'matching', True, 'dqx28Check'),
    # part 03 — זמן תרגול 2
    ('03', 0, 's0', '001', None, None, False, None),           # מסך מעבר: אין כמו תרגול
    ('03', 1, 's1', '001', 'q1', 'choice', True, 's1Check'),
    ('03', 2, 's2', '002', 'q1', 'choice', True, 's2Check'),
    ('03', 3, 's3', '003', 'q1', 'choice', True, 's3Check'),
    ('03', 4, 's4', '004', 'q1', 'performance', True, 's4Check'),  # 2 תפריטים, אפשרויות שונות
    ('03', 5, 's5', '005', 'q1', 'choice', True, 's5Check'),    # כרטיסי תמונה
    ('03', 6, 's6', '006', None, None, False, None),           # מסך מעבר: יופי של עבודה
    ('03', 7, 's7', '006', 'q1', 'choice', True, 's7Check'),
    ('03', 8, 's8', '007', 'q1', 'matching', True, 's8bCheck'),  # גרירה ל-2 קבוצות
    # part 04 — משימה בכיתה
    ('04', 0, 's0', '001', None, None, False, None),           # מסך מעבר
    ('04', 1, 's1', '001', None, None, False, None),           # משימת כיתה (ללא שאלה)
    # part 05 — בואו נאתגר את עצמנו
    ('05', 0, 's0', '001', None, None, False, None),           # מסך מעבר: 4 שאלות מתקדמות
    ('05', 1, 's1', '001', None, None, False, None),           # מעבדת הבקבוקים — משימה 1
    ('05', 2, 's2', '001', 'q1', 'choice', True, 's2Check'),
    ('05', 3, 's3', '002', None, None, False, None),           # מעבדת הבקבוקים — משימה 2
    ('05', 4, 's4', '002', 'q1', 'choice', True, 's4Check'),
    ('05', 5, 's5', '002', 'q2', 'matching', True, 'dqx5Check'),
    ('05', 6, 's6', '003', 'q1', 'choice', True, 's6Check'),
    ('05', 7, 's7', '004', 'q1', 'matching', True, 'oddqCheck'),
    ('05', 8, 's8', '005', None, None, False, None),           # הידעת? נעל הריצה
    # part 06 — שאלת שיא, מועד א
    ('06', 0, 's0', '001', None, None, False, None),           # מסך מעבר
    ('06', 1, 's1', '001', 'q1', 'choice', True, 's1Check'),
    ('06', 2, 's2', '001', 'q2', 'matching', True, 's2Check'),  # 3 תפריטים
    ('06', 3, 's3', '001', 'q3', 'choice', True, 's3Check'),
    ('06', 4, 's4', '001', 'q4', 'matching', True, 'dqx4Check'),
    # part 07 — שאלת שיא, מועד ב
    ('07', 0, 's0', '001', None, None, False, None),           # מסך מעבר
    ('07', 1, 's1', '001', 'q1', 'choice', True, 's1Check'),
    ('07', 2, 's2', '001', 'q2', 'choice', True, 's2Check'),
    ('07', 3, 's3', '001', 'q3', 'matching', True, 's3Check'),  # 3 תפריטים
    ('07', 4, 's4', '001', 'q4', 'choice', True, 's4Check'),
]

errors = []
warnings = []


def err(msg):
    errors.append(msg)
    print('ERROR   ' + msg)


def warn(msg):
    warnings.append(msg)
    print('WARN    ' + msg)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def strip_tags(s):
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = (s.replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<')
          .replace('&gt;', '>').replace('&nbsp;', ' ').replace('&#39;', "'"))
    return re.sub(r'\s+', ' ', s).strip()


def js_string(s):
    """Decode a JS single/double-quoted string literal (no escapes beyond \\' \\" \\n)."""
    q = s[0]
    body = s[1:-1]
    return body.replace('\\' + q, q).replace('\\n', '\n').replace('\\\\', '\\')


JS_STR = r"""(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")"""


def js_obj_of_strings(js, name):
    """const NAME = { 'k': 'v', ... };  ->  ordered list of (k, v)."""
    m = re.search(r'const\s+' + re.escape(name) + r'\s*=\s*\{(.*?)\};', js, re.S)
    if not m:
        return None
    pairs = re.findall(r'(' + JS_STR + r'|[\w-]+)\s*:\s*(' + JS_STR + r')', m.group(1))
    out = []
    for k, v in pairs:
        k = js_string(k) if k[0] in '\'"' else k
        out.append((k, js_string(v)))
    return out


def js_obj_of_lists(js, name):
    """const NAME = { 1: ['a','b'], 2: [...] };  ->  {key: [..]}"""
    m = re.search(r'const\s+' + re.escape(name) + r'\s*=\s*\{(.*?)\};', js, re.S)
    if not m:
        return None
    out = {}
    for k, body in re.findall(r'([\w-]+)\s*:\s*\[(.*?)\]', m.group(1), re.S):
        out[k] = [js_string(x) for x in re.findall(JS_STR, body)]
    return out


def js_correct_id(js, name):
    m = re.search(r'const\s+' + re.escape(name) + r'\s*=\s*\{\s*correctId:\s*(' + JS_STR + ')', js)
    return js_string(m.group(1)) if m else None


def js_correct_set(js, name):
    m = re.search(r'const\s+' + re.escape(name) + r'\s*=\s*\{\s*correctSet:\s*new Set\(\[(.*?)\]\)', js, re.S)
    return [js_string(x) for x in re.findall(JS_STR, m.group(1))] if m else None


def screens_of(html):
    html = re.sub(r'<!--.*?-->', '', html, flags=re.S)
    out = {}
    for m in re.finditer(r'<section class="screen[^"]*" data-screen="(\d+)" id="(\w+)">(.*?)</section>', html, re.S):
        idx, sid, body = int(m.group(1)), m.group(2), m.group(3)
        body = re.sub(r'<svg.*?</svg>', '', body, flags=re.S)
        out[sid] = (idx, body)
    return out


# ---------------------------------------------------------------------------
# UI extraction per screen -> {'kind', 'answers', 'correct'} in metadata shape
# ---------------------------------------------------------------------------
def ui_choice(body, js, const):
    opts = []
    for m in re.finditer(r'<div class="scq-opt"[^>]*data-id="([^"]+)"[^>]*>(.*?)</div>\s*', body, re.S):
        t = re.search(r'<span class="scq-opt-text[^"]*">(.*?)</span>', m.group(2), re.S)
        opts.append((m.group(1), strip_tags(t.group(1))))
    if not opts:  # image cards (03 s5): answer text = img alt
        for m in re.finditer(r'<div class="s5-card"[^>]*data-id="([^"]+)"[^>]*>.*?<img[^>]*alt="([^"]*)"', body, re.S):
            opts.append((m.group(1), m.group(2)))
    ids = dict(opts)
    cid = js_correct_id(js, const)
    cset = js_correct_set(js, const)
    if cid is not None:
        correct = [ids[cid]]
    elif cset is not None:
        correct = [ids[i] for i, _ in opts if i in cset]
    else:
        return None
    return {'answers': [t for _, t in opts], 'correct': correct}


def ui_drag_category(body, prefix):
    """ddq13 / ddq27 / s8b: draggable label + data-correct -> zone label."""
    items = []
    for m in re.finditer(r'<div class="' + prefix + r'-drag-item" id="[^"]+" (?:draggable="true" )?data-correct="([^"]+)"(.*?)(?=<div class="' + prefix + r'-drag-item"|<div class="' + prefix + r'-zones-row")', body, re.S):
        lab = re.search(r'class="' + prefix + r'-item-(?:label|word)">(.*?)</(?:p|span)>', m.group(2), re.S)
        items.append((strip_tags(lab.group(1)), m.group(1)))
    zones = []
    for m in re.finditer(r'<div class="' + prefix + r'-zone" id="' + prefix + r'-zone-([^"]+)".*?<p class="' + prefix + r'-zone-label">(.*?)</p>', body, re.S):
        zones.append((m.group(1), strip_tags(m.group(2))))
    zl = dict(zones)
    return {'source': [t for t, _ in items], 'target': [z for _, z in zones],
            'pairs': [(t, zl[c]) for t, c in items]}


def ui_drag_slots(body, js, up):
    """dqx20 / dqx28 / dqx5 / oddq / dqx4: word labels + CORRECT_MAP; the slot
    stems are verified as visible on-screen text (the stems themselves are a
    documented choice in METADATA-AUDIT.md, not machine-extractable)."""
    labels = js_obj_of_strings(js, up + '_LABELS')
    cmap = dict(js_obj_of_strings(js, up + '_CORRECT_MAP'))
    lab = dict(labels)
    # slots in DOM order (the order answers.target must follow), not CORRECT_MAP key order
    slot_ids = re.findall(r'id="(' + up.lower() + r'-target-[^"]+)"', body)
    pairs = [(lab[cmap[t]], t) for t in slot_ids]  # (word, slot-id) in DOM order
    text = strip_tags(body)
    return {'source': [v for _, v in labels], 'pairs': pairs, 'text': text}


def ui_dropdown_dpq(body, js, sN):
    """DropdownQuestion (dpq-*): S<N>_OPTIONS + S<N>_CORRECT; stems = dpq-words before each blank."""
    opts = js_obj_of_lists(js, sN + '_OPTIONS')
    corr = dict(js_obj_of_strings(js, sN + '_CORRECT'))
    stems = []
    for m in re.finditer(r'<div class="dpq-blank" id="[^"]+" data-blank="(\d+)">', body):
        before = body[:m.start()]
        words = re.findall(r'<span class="dpq-words">(.*?)</span>', before, re.S)
        # stem = the dpq-words of this blank's own sentence, concatenated
        sent_start = before.rfind('<div class="dpq-sentence">')
        words = re.findall(r'<span class="dpq-words">(.*?)</span>', before[sent_start:], re.S)
        stems.append((m.group(1), ''.join(strip_tags(w) + (' ' if not strip_tags(w).endswith(('ה', 'ל')) or len(strip_tags(w)) > 1 else '') for w in words).strip()))
    union = []
    for k in sorted(opts, key=int):
        for o in opts[k]:
            if o not in union:
                union.append(o)
    return {'source': [s for _, s in stems], 'target': union,
            'pairs': [(s, corr[k]) for k, s in stems], 'text': strip_tags(body)}


def ui_dropdown_dd(body, js):
    """01 s8: dd-row label + dd-opt list; S8_CORRECT keyed by row id."""
    rows = []
    for m in re.finditer(r'<div class="dd-row">\s*<span class="dd-label">(.*?)</span>\s*<div class="dd-wrap" id="s8-dd-(\w+)">(.*?)</ul>', body, re.S):
        opts = [strip_tags(o) for o in re.findall(r'<li class="dd-opt"[^>]*>(.*?)</li>', m.group(3), re.S)]
        rows.append((strip_tags(m.group(1)), m.group(2), opts))
    corr = dict(js_obj_of_strings(js, 'S8_CORRECT'))
    union = []
    for _, _, o in rows:
        for x in o:
            if x not in union:
                union.append(x)
    return {'source': [r for r, _, _ in rows], 'target': union,
            'pairs': [(r, corr[k]) for r, k, _ in rows]}


# ---------------------------------------------------------------------------
# R7 hygiene
# ---------------------------------------------------------------------------
def check_string(where, s):
    if not isinstance(s, str):
        err(f'{where}: not a string: {s!r}'); return
    if unicodedata.normalize('NFC', s) != s:
        err(f'{where}: not NFC: {s!r}')
    if s != s.strip():
        err(f'{where}: not trimmed: {s!r}')
    if '  ' in s or '\t' in s or '\n' in s or '\r' in s or ' ' in s:
        err(f'{where}: not single-spaced: {s!r}')
    for sep in ('[,]', '[.]', '[:]'):
        if sep in s:
            err(f'{where}: contains xAPI separator {sep}: {s!r}')
    if s == '':
        err(f'{where}: empty string')


def check_unique(where, lst):
    seen = set()
    for s in lst:
        if s in seen:
            err(f'{where}: duplicate {s!r}')
        seen.add(s)


def check_question(where, q):
    qt = q.get('questionType')
    if qt not in KATA_TYPES:
        err(f'{where}: questionType {qt!r} not in Kata enum'); return
    if qt == 'performance':
        # Kata shape (agreed 2026-10-20, monday issue on 03-004): several inputs / dropdowns with
        # different option lists → performance, answers null, one {stepId, response} per input.
        ca = q.get('correctAnswers') or []
        if q.get('answers') is not None:
            err(f'{where}: performance answers must be null')
        if len(ca) < 2:
            err(f'{where}: performance needs 2+ steps in correctAnswers')
        for i, p in enumerate(ca):
            if not isinstance(p, dict) or set(p) != {'stepId', 'response'}:
                err(f'{where}.correctAnswers[{i}]: must be {{stepId,response}}'); continue
            check_string(f'{where}.correctAnswers[{i}].stepId', p['stepId'])
            check_string(f'{where}.correctAnswers[{i}].response', p['response'])
        check_unique(f'{where}.correctAnswers.stepId', [p.get('stepId') for p in ca if isinstance(p, dict)])
    elif qt == 'matching':
        a = q.get('answers')
        if not isinstance(a, dict) or set(a) != {'source', 'target'}:
            err(f'{where}: matching answers must be {{source,target}}'); return
        for k in ('source', 'target'):
            for s in a[k]:
                check_string(f'{where}.answers.{k}', s)
            check_unique(f'{where}.answers.{k}', a[k])
        ca = q.get('correctAnswers', [])
        for i, p in enumerate(ca):
            if not isinstance(p, dict) or set(p) != {'source', 'target'}:
                err(f'{where}.correctAnswers[{i}]: must be {{source,target}}'); continue
            for k in ('source', 'target'):
                check_string(f'{where}.correctAnswers[{i}].{k}', p[k])
                if p[k] not in a[k]:
                    err(f'{where}.correctAnswers[{i}].{k} {p[k]!r} not in answers.{k}')
        check_unique(f'{where}.correctAnswers.source', [p.get('source') for p in ca if isinstance(p, dict)])
        if len(ca) != len(a['source']):
            err(f'{where}: {len(ca)} correct pairs for {len(a["source"])} sources')
    elif qt in ('choice', 'true-false', 'sequencing'):
        a = q.get('answers')
        if not isinstance(a, list):
            err(f'{where}: answers must be a list'); return
        for s in a:
            check_string(f'{where}.answers', s)
        check_unique(f'{where}.answers', a)
        ca = q.get('correctAnswers', [])
        for s in ca:
            check_string(f'{where}.correctAnswers', s)
            if s not in a:
                err(f'{where}.correctAnswers {s!r} not in answers')
        check_unique(f'{where}.correctAnswers', ca)
        if not ca:
            err(f'{where}: no correctAnswers')
    else:
        for s in q.get('answers', []) if isinstance(q.get('answers'), list) else []:
            check_string(f'{where}.answers', s)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main():
    parts = sorted(p for p in os.listdir(META) if re.fullmatch(UNIT + r'-\d\d\.json', p))
    meta = {}
    for fn in parts:
        d = json.loads(read(os.path.join(META, fn)))
        part = fn[-7:-5]
        meta[part] = d
        if d['id'] != IRI_BASE + UNIT + '-' + part + '/':
            err(f'{fn}: component id {d["id"]!r} is not {IRI_BASE + UNIT + "-" + part + "/"!r}')
        for ref in d.get('recommendedAfterFail', []):
            if not re.fullmatch(re.escape(IRI_BASE + UNIT) + r'-\d\d/', ref):
                err(f'{fn}: recommendedAfterFail {ref!r} is not a full component IRI of this unit')
            elif not os.path.exists(os.path.join(META, ref.rstrip('/').rsplit('/', 1)[-1] + '.json')):
                err(f'{fn}: recommendedAfterFail {ref!r} names a component without a metadata file')

    # R7 + question index
    questions = {}  # (part, item, qKey) -> question
    for part, d in meta.items():
        for item in d['subContent']:
            suffix = item['id'].rstrip('/').rsplit('-', 1)[-1]
            for q in item.get('questions', []):
                qkey = q['questionId'].rstrip('/').rsplit('/', 1)[-1]
                exp = item['id'] + qkey
                if q['questionId'] != exp:
                    err(f'{part}-{suffix}/{qkey}: questionId {q["questionId"]!r} != {exp!r}')
                check_question(f'{part}-{suffix}/{qkey}', q)
                questions[(part, suffix, qkey)] = q

    # R8 census against SCREEN_MAP and the UI
    ui_graded = 0
    for part in meta:
        pdir = os.path.join(ROOT, UNIT + '-' + part)
        html = read(os.path.join(pdir, 'index.html'))
        js = read(os.path.join(pdir, 'script.js'))
        scr = screens_of(html)
        rows = [r for r in SCREEN_MAP if r[0] == part]
        if [(r[1], r[2]) for r in rows] != sorted((i, s) for s, (i, _) in scr.items()):
            err(f'part {part}: SCREEN_MAP screens {[(r[1], r[2]) for r in rows]} != index.html {sorted((i, s) for s, (i, _) in scr.items())}')
        items_in_meta = {it['id'].rstrip('/').rsplit('-', 1)[-1] for it in meta[part]['subContent']}
        # every check function wired to a צדקתי? button in the HTML must be a graded row
        wired = {}
        for sid, (idx, body) in scr.items():
            for fn in re.findall(r'onclick="(\w+Check)\(\)"', body):
                if fn == 'oaqCheck':
                    continue
                wired[fn] = sid
        mapped = {r[7]: r[2] for r in rows if r[6]}
        for fn, sid in wired.items():
            if fn not in mapped:
                err(f'part {part}: {fn}() on screen {sid} is wired in the UI but not a graded row in SCREEN_MAP')
            elif mapped[fn] != sid:
                err(f'part {part}: {fn}() is on screen {sid} in the UI, {mapped[fn]} in SCREEN_MAP')
        for fn in mapped:
            if fn not in wired:
                err(f'part {part}: SCREEN_MAP names {fn}() but no screen wires it')
            if not re.search(r'^function ' + fn + r'\(\)', js, re.M):
                err(f'part {part}: function {fn}() not defined in script.js')
        for r in rows:
            _, idx, sid, item, qkey, qtype, graded, fn = r
            if item is not None and item not in items_in_meta:
                err(f'part {part} screen {sid}: item {item} not in metadata')
            if not graded:
                continue
            ui_graded += 1
            q = questions.get((part, item, qkey))
            if q is None:
                err(f'part {part} screen {sid}: graded by {fn}() but metadata has no question {item}/{qkey}'); continue
            if q['questionType'] != qtype:
                err(f'part {part} screen {sid}: metadata type {q["questionType"]!r} != SCREEN_MAP {qtype!r}')
            cross_check(part, sid, scr[sid][1], js, q, fn)
    # every metadata question must be a graded screen — except an ungraded open ('other') question that a
    # SCREEN_MAP row declares with graded=False (01 s1 since 2026-10-27): it is in the catalogue for the
    # bot's context and is never reported as 'answered'
    mapped_q = {(r[0], r[3], r[4]) for r in SCREEN_MAP if r[6]}
    ungraded_q = {(r[0], r[3], r[4]) for r in SCREEN_MAP if not r[6] and r[4]}
    for key in ungraded_q:
        q = questions.get(key)
        if q is None:
            err(f'SCREEN_MAP declares ungraded question {key} but metadata has none')
        elif q['questionType'] != 'other' or q.get('correctAnswers'):
            err(f'ungraded question {key} must be questionType other with no correctAnswers')
    for key in questions:
        if key not in mapped_q and key not in ungraded_q:
            err(f'metadata question {key} is not mapped to any graded screen')

    n_meta = len([k for k in questions if k not in ungraded_q])
    print()
    print('CENSUS  graded screens (UI, SCREEN_MAP): %d   declared questions (metadata): %d   expected: %d'
          % (ui_graded, n_meta, EXPECTED_GRADED))
    for part in meta:
        g = [r for r in SCREEN_MAP if r[0] == part and r[6]]
        m = [k for k in questions if k[0] == part and k not in ungraded_q]
        print('        part %s: %d graded screens [%s]  /  %d metadata questions' % (
            part, len(g), ', '.join(r[2] + ':' + r[7] for r in g), len(m)))
    if ui_graded != EXPECTED_GRADED or n_meta != EXPECTED_GRADED:
        err('census mismatch')
    print()
    print('RESULT  %d error(s), %d warning(s)' % (len(errors), len(warnings)))
    return 1 if errors else 0


def cross_check(part, sid, body, js, q, fn):
    where = f'part {part} {sid}'
    qt = q['questionType']
    if qt == 'choice':
        const = 'S' + sid[1:] if sid[0] == 's' else None
        ui = ui_choice(body, js, const)
        if ui is None:
            err(f'{where}: could not read choice options / {const}'); return
        if ui['answers'] != q['answers']:
            err(f'{where}: answers differ\n   UI   {ui["answers"]}\n   META {q["answers"]}')
        if ui['correct'] != q['correctAnswers']:
            err(f'{where}: correctAnswers differ\n   UI   {ui["correct"]}\n   META {q["correctAnswers"]}')
        return
    if qt == 'performance':                  # dpq dropdowns, one step per blank (03 s4)
        ui = ui_dropdown_dpq(body, js, 'S' + sid[1:])
        ui_correct = [t for _, t in ui['pairs']]
        meta_correct = [p['response'] for p in q['correctAnswers']]
        if ui_correct != meta_correct:
            err(f'{where}: correct value per dropdown differs\n   UI   {ui_correct}\n   META {meta_correct}')
        return
    # matching
    a, ca = q['answers'], [(p['source'], p['target']) for p in q['correctAnswers']]
    m = re.match(r'(ddq\d+|s8b)', fn)
    if m:                                    # drag-to-category
        ui = ui_drag_category(body, m.group(1))
        cmp_matching(where, ui, a, ca)
        return
    m = re.match(r'(dqx\d+|oddq)', fn)
    if m:                                    # drag-word-into-slot
        ui = ui_drag_slots(body, js, m.group(1).upper())
        if ui['source'] != a['source']:
            err(f'{where}: source words differ\n   UI   {ui["source"]}\n   META {a["source"]}')
        # answers.target lists the slots in DOM (slot) order; map each slot to the
        # metadata's correct word and compare with CORRECT_MAP in the same order.
        meta_by_slot = [[s for s, t in ca if t == tgt] for tgt in a['target']]
        meta_by_slot = [x[0] if len(x) == 1 else None for x in meta_by_slot]
        ui_by_slot = [w for w, _ in ui['pairs']]
        if ui_by_slot != meta_by_slot:
            err(f'{where}: correct word per slot differs\n   UI   {ui_by_slot}\n   META {meta_by_slot}')
        for t in a['target']:
            if t not in ui['text']:
                err(f'{where}: target stem {t!r} is not visible on the screen')
        return
    if fn == 's8Check' and part == '01':     # dd-row dropdowns
        ui = ui_dropdown_dd(body, js)
        cmp_matching(where, ui, a, ca)
        return
    ui = ui_dropdown_dpq(body, js, 'S' + sid[1:])   # dpq dropdowns (03 s4, 06 s2, 07 s3)
    cmp_matching(where, ui, a, ca)
    for s in a['source']:
        if s not in ui['text']:
            err(f'{where}: source stem {s!r} is not visible on the screen')


def cmp_matching(where, ui, a, ca):
    """R2/R3: source = row/blank stems or drag labels in DOM order; target = zone
    labels in DOM order, or the union of the dropdown lists in first-appearance
    order; correct pairs in source order."""
    if ui['source'] != a['source']:
        err(f'{where}: sources differ\n   UI   {ui["source"]}\n   META {a["source"]}')
    if ui['target'] != a['target']:
        err(f'{where}: targets differ (order matters: DOM / union order)\n   UI   {ui["target"]}\n   META {a["target"]}')
    if ui['pairs'] != ca:
        err(f'{where}: correct pairs differ\n   UI   {ui["pairs"]}\n   META {ca}')


if __name__ == '__main__':
    sys.exit(main())
