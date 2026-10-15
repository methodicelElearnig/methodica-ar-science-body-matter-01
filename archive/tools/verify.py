"""Independent verification of the exported XLIFF against the source files (reads only the XLIFF + sources)."""
import re, os, sys, json, collections
import xml.etree.ElementTree as ET
from jsstr import tokenize

ROOT = "C:/Users/user/OneDrive - methodic.co.il/קבצי עבודה/720 Science/יעד 11/methodica-science-body-matter-01"
OUT = sys.argv[1]
MOD = "methodica-science-body-matter-01"
HEB = re.compile('[\u0590-\u05ff]')
NS = {'x': 'urn:oasis:names:tc:xliff:document:1.2'}
XMLNS = '{http://www.w3.org/XML/1998/namespace}'

res = {}
tree = ET.parse(os.path.join(OUT, f'{MOD}-he.xlf'))      # raises if not well-formed
res['xml_well_formed'] = True
units = tree.getroot().findall('.//x:trans-unit', NS)
res['unit_count'] = len(units)


def rd(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8', newline='') as f:
        return f.read()


ids = [u.get('id') for u in units]
res['ids_unique'] = len(ids) == len(set(ids))
res['id_shape_ok'] = all(re.fullmatch(r'01-\d{2}-\d{2}-\d{3}', i) for i in ids)
res['all_targets_empty'] = all(((u.find('x:target', NS).text or '') == '' and len(u.find('x:target', NS)) == 0) for u in units)


def note(u, frm):
    return [n.text or '' for n in u.findall('x:note', NS) if n.get('from') == frm]


res['every_unit_has_screen_id'] = all(len(note(u, 'screen-id')) == 1 for u in units)
res['id_prefix_matches_screen_id'] = all(u.get('id').rsplit('-', 1)[0] == note(u, 'screen-id')[0] for u in units)

# manifest cross-check
import csv
with open(os.path.join(OUT, 'translation-screen-manifest.csv'), encoding='utf-8-sig', newline='') as f:
    man = list(csv.DictReader(f))
man_ids = {r['screen_id'] for r in man}
unit_screens = {note(u, 'screen-id')[0] for u in units}
res['screens_in_units_not_in_manifest'] = sorted(unit_screens - man_ids)
res['screens_in_manifest_without_units'] = sorted(man_ids - unit_screens)
res['manifest_screen_count'] = len(man_ids)

# ---------- sweep 1 ----------
def collapse(w):
    a = re.sub(r'\s*\n\s*', ' ', w)
    b = re.sub(r'\s*(<br\s*/?>)\s*', r'\1', a)
    return a, b


PH = re.compile(r'\{[A-Za-z][\w:\-]*\}')
cls = collections.Counter()
exceptions = []
bad_loc = []
placeholder_total = 0
placeholder_ok = True
cache = {}
for u in units:
    uid = u.get('id')
    text = u.find('x:source', NS).text or ''
    loc = note(u, 'source-location')[0]
    rel, ln = loc.rsplit(':', 1)
    ln = int(ln)
    if rel not in cache:
        if not os.path.exists(os.path.join(ROOT, rel)):
            bad_loc.append((uid, loc, 'file missing'))
            continue
        cache[rel] = rd(rel).split('\n')
    L = cache[rel]
    if not (1 <= ln <= len(L)):
        bad_loc.append((uid, loc, 'line out of range'))
        continue
    if text in L[ln - 1]:
        cls['literal-on-line'] += 1
        continue
    win = '\n'.join(L[ln - 1: ln + 60])
    a, b = collapse(win)
    if text in a or text in b:
        cls['multi-line-join'] += 1
        exceptions.append((uid, 'multi-line-join', loc, ''))
        continue
    parts = [p for p in PH.split(text)]
    phs = PH.findall(text)
    if phs:
        placeholder_total += len(phs)
        # all non-placeholder segments must appear in order inside the window
        win2 = a if True else b
        pos = 0
        ok = True
        for seg in parts:
            if not seg:
                continue
            seg_n = seg
            i = win2.find(seg_n, pos)
            if i < 0:
                i = b.find(seg_n, 0)
                if i < 0:
                    ok = False
                    break
                pos = 0
                win2 = b
                continue
            pos = i + len(seg_n)
        if ok:
            cls['placeholder'] += 1
            exceptions.append((uid, 'placeholder', loc, ' '.join(phs)))
            continue
    cls['MISMATCH'] += 1
    exceptions.append((uid, 'MISMATCH', loc, text[:80]))
res['sweep1_classes'] = dict(cls)
res['sweep1_exceptions'] = exceptions
res['bad_source_locations'] = bad_loc

# ---------- sweep 2 ----------
def norm_ws(t):
    return re.sub(r'\s+', ' ', t).strip()


# combined unit text per file
by_file = collections.defaultdict(list)
for u in units:
    rel = note(u, 'source-location')[0].rsplit(':', 1)[0]
    by_file[rel].append(u.find('x:source', NS).text or '')


loc_units = collections.defaultdict(list)
for u in units:
    r, l = note(u, 'source-location')[0].rsplit(':', 1)
    t = u.find('x:source', NS).text or ''
    loc_units[r].append((int(l), norm_ws(t), norm_ws(re.sub(r'<[^>]+>', ' ', PH.sub(' ', t)))))


def covered_at(rel, ln, frag, back, fwd=0):
    f = norm_ws(frag)
    for (l, t, tt) in loc_units.get(rel, []):
        if ln - back <= l <= ln + fwd and (f in t or f in tt):
            return True
    return False


def combined(rel_list):
    out = []
    for r in rel_list:
        for t in by_file.get(r, []):
            out.append(norm_ws(re.sub(r'<[^>]+>', ' ', PH.sub(' ', t))))
            out.append(norm_ws(t))
    return '\n'.join(out)


files = []
for p in ['01', '02', '03', '04', '05', '06', '07']:
    files.append((f'{MOD}-{p}/index.html', 'html', [f'{MOD}-{p}/index.html', f'{MOD}-{p}/script.js']))
    files.append((f'{MOD}-{p}/script.js', 'js', [f'{MOD}-{p}/script.js', f'{MOD}-{p}/index.html']))
applet = f'{MOD}-05/יישומון יעד 11 מעבדת הבקבוקים/index.html'
files.append((applet, 'html', [applet]))

sweep2 = dict(fragments=0, covered=0, comment=0, deliberate=[], misses=[], comments_by_file={})
HANDLER_OR_PATH = re.compile(r'^(on\w+|data-zoom-src|src|href)$')
for rel, kind, comb in files:
    src = rd(rel)
    comb_txt = combined(comb)
    ncom = 0
    if kind == 'html':
        # comments
        for m in re.finditer(r'<!--.*?-->', src, re.S):
            if HEB.search(m.group(0)):
                ncom += 1
        s2 = re.sub(r'<!--.*?-->', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), src, flags=re.S)
        # scripts handled as JS
        scripts = list(re.finditer(r'<script\b[^>]*>(.*?)</script>', s2, re.S | re.I))
        s3 = s2
        for m in scripts:
            s3 = s3[:m.start()] + re.sub(r'[^\n]', ' ', s3[m.start():m.end()]) + s3[m.end():]
        s3 = re.sub(r'<style\b[^>]*>.*?</style>', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), s3, flags=re.S | re.I)
        # attributes
        for m in re.finditer(r'<[A-Za-z][^<>]*>', s3, re.S):
            for am in re.finditer(r'([\w:-]+)\s*=\s*"([^"]*)"', m.group(0)):
                k, v = am.group(1), am.group(2)
                if HEB.search(v):
                    sweep2['fragments'] += 1
                    ln = s3.count('\n', 0, m.start()) + 1
                    if HANDLER_OR_PATH.match(k):
                        sweep2['deliberate'].append((rel, ln, f'{k}="{v[:60]}"', 'event-handler argument / asset path (code, not display text)'))
                    elif covered_at(rel, ln, v, back=0, fwd=6):
                        sweep2['covered'] += 1
                    else:
                        sweep2['misses'].append((rel, ln, f'{k}="{v[:60]}"'))
        # text nodes
        for tm in re.finditer(r'>([^<>]+)(?=<)', s3):
            frag = tm.group(1)
            if HEB.search(frag):
                sweep2['fragments'] += 1
                lead = len(frag) - len(frag.lstrip())
                ln = s3.count('\n', 0, tm.start(1) + lead) + 1
                if covered_at(rel, ln, frag, back=30):
                    sweep2['covered'] += 1
                else:
                    sweep2['misses'].append((rel, ln, 'text:' + norm_ws(frag)[:80]))
        js_blocks = [(m.group(1), s2.count('\n', 0, m.start(1)) + 1) for m in scripts]
    else:
        js_blocks = [(src, 1)]
    for body, base in js_blocks:
        if not HEB.search(body):
            continue
        toks = tokenize(body)
        mask = bytearray(len(body))
        for k, a, b, raw in toks:
            if k == 'comment':
                if HEB.search(raw):
                    ncom += 1
            if k in ('comment', 'str', 'tpl', 'regex'):
                for i in range(a, b):
                    mask[i] = 1
        for k, a, b, raw in toks:
            if k in ('str', 'tpl') and HEB.search(raw):
                sweep2['fragments'] += 1
                inner = raw[1:-1]
                inner = re.sub(r'\$\{[^}]*\}', ' ', inner)
                ln = base + body.count('\n', 0, a)
                if covered_at(rel, ln, inner, back=10):
                    sweep2['covered'] += 1
                else:
                    sweep2['misses'].append((rel, ln, 'js:' + inner[:80]))
            elif k == 'regex' and HEB.search(raw):
                sweep2['fragments'] += 1
                sweep2['deliberate'].append((rel, base + body.count('\n', 0, a), raw[:60], 'regular expression'))
        resid = ''.join(body[i] if not mask[i] else ' ' for i in range(len(body)))
        for m in re.finditer(r'[\u0590-\u05ff]+', resid):
            sweep2['fragments'] += 1
            sweep2['misses'].append((rel, base + body.count('\n', 0, m.start()), 'js-code:' + m.group(0)))
    sweep2['comments_by_file'][rel] = ncom
    sweep2['comment'] += ncom
res['sweep2'] = sweep2

# git status unchanged is checked by the caller
json.dump(res, open(os.path.join(OUT, 'verification.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print({k: v for k, v in res.items() if k not in ('sweep1_exceptions', 'sweep2')})
print('sweep1', res['sweep1_classes'], 'exceptions', len(exceptions))
print('sweep2 fragments', sweep2['fragments'], 'covered', sweep2['covered'], 'comments', sweep2['comment'], 'deliberate', len(sweep2['deliberate']), 'misses', len(sweep2['misses']))
for m in sweep2['misses'][:80]:
    print('MISS', m)
