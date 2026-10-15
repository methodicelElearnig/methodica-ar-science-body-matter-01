import re, os, sys, json, collections
from xml.sax.saxutils import escape
from htmlx import parse, descendants, HEB
from htmlunits import collect, classify_container
from jsunits import collect_js

ROOT = "C:/Users/user/OneDrive - methodic.co.il/קבצי עבודה/720 Science/יעד 11/methodica-science-body-matter-01"
MOD = "methodica-science-body-matter-01"
TARGET = "01"
OUT = sys.argv[1]
PARTS = ['01', '02', '03', '04', '05', '06', '07']
APPLET_DIR = "יישומון יעד 11 מעבדת הבקבוקים"
SCREEN_PAT = re.compile(r'(?<![A-Za-z0-9_])(?:s|S|dqx|DQX|ddq|DDQ|oddq|ODDQ)(\d+)(?![0-9])')
LOGIC_CTX = re.compile(r'\b[A-Z][A-Z0-9_]*(?:CORRECT|OPTIONS|LABELS|MAP|ANSWER|ANSWERS)\b')


def rd(path):
    with open(path, encoding='utf-8', newline='') as f:
        return f.read()


def rel(path):
    return os.path.relpath(path, ROOT).replace('\\', '/')


units = []          # all units
coupled_args = []   # (part, hebrew arg passed through an HTML handler)
screens = {}        # (part, screen) -> dict
excluded = []       # (file, line, text, reason)
part_flow = {}


def reg_screen(part, sc, **kw):
    d = screens.setdefault((part, sc), dict(part=part, screen=sc, title='', type='', file='', selector='', flow=None, manual=set()))
    for k, v in kw.items():
        if v not in (None, '') and not d.get(k):
            d[k] = v
    return d


def screen_title_from_comment(src, sec_start):
    pre = src[:sec_start].rstrip()
    if not pre.endswith('-->'):
        return ''
    c0 = pre.rfind('<!--')
    com = pre[c0 + 4:-3]
    first = com.strip().split('\n')[0]
    first = re.sub(r'^=+\s*', '', first)
    first = re.sub(r'\s*=+\s*$', '', first)
    m = re.match(r'מסך\s*\d+\s*[—–-]\s*(.*)$', first)
    return (m.group(1) if m else first).strip()


def detect_type(sec):
    from collections import Counter
    pref = Counter()
    roles = Counter()
    for d in descendants(sec):
        if d.kind != 'el':
            continue
        for k in d.attrs.get('class', '').split():
            pref[k.split('-')[0]] += 1
        if 'role' in d.attrs:
            roles[d.attrs['role']] += 1
    if any(k.startswith(('dqx', 'ddq', 'oddq', 'dqt')) for k in pref):
        return 'DragAndDropQuestion'
    if pref.get('dpq') or roles.get('listbox'):
        return 'DropdownQuestion'
    if roles.get('checkbox'):
        return 'MultipleChoiceQuestion'
    if roles.get('radio') and pref.get('scq'):
        return 'SingleChoiceQuestion'
    if pref.get('flip'):
        return 'FlipCardsReveal'
    if pref.get('hoq'):
        return 'HookOpenQuestion'
    if pref.get('vid'):
        return 'VideoWatchAndContinue'
    if pref.get('transition') or pref.get('trans'):
        return 'TransitionScreen'
    return ''


def role_html(u):
    node = u['node']
    if u['kind'] == 'attr':
        return 'accessibility-label'
    c = node
    classes = []
    ids = []
    tags = []
    while c is not None and c.kind == 'el':
        classes += c.attrs.get('class', '').split()
        tags.append(c.tag)
        if c.attrs.get('id'):
            ids.append(c.attrs['id'])
        c = c.parent
    cls = ' '.join(classes)
    t0 = node.tag
    if t0 == 'title':
        return 'other'
    if t0 == 'button' or 'btn' in cls.split()[0:3] or any(x.startswith('btn-') for x in classes[:3]) or 'flag-btn-label' in classes[:2]:
        return 'button-label'
    if 'qnav-label' in classes[:2]:
        return 'navigation-label'
    if any(x in ('scq-opt-text', 'dpq-words') or x.startswith('scq-opt') for x in classes[:3]):
        return 'answer-option'
    if t0 in ('h1', 'h2', 'h3') or 'transition-title' in classes[:2]:
        return 'main-heading'
    if any('hint' in i for i in ids):
        return 'hint-text'
    if 'transition-sub' in classes[:2]:
        return 'subheading'
    if 'scq-qbody' in classes[:2] or 'scq-qtext' in classes[:2]:
        return 'body-text'
    return None


def js_context(src, start):
    pre = src[max(0, start - 160):start]
    pre1 = re.sub(r'\s+', ' ', pre)
    return pre1


def js_enclosing_key(src, start):
    seg = src[max(0, start - 1500):start]
    ms = list(re.finditer(r'(\w+)\s*:\s*\{', seg))
    return ms[-1].group(1) if ms else None


def role_js(src, ch):
    pre = js_context(src, ch['start'])
    raw = ch['raw']
    if re.search(r'(?:textContent|innerText)\s*=\s*(?:[\w.\[\]]+\s*\?\s*)?$', pre) and len(raw) < 40 and not re.search(r'\b(title|body)\b', pre[-8:]):
        return 'button-label' if raw.strip() in ('צדקתי?', 'המשך', 'סיימתי!', 'מעבר לתשובה שלי', 'מעבר לתשובה הנכונה', 'להמשיך?') else None
    if raw.strip() in ('צדקתי?', 'המשך', 'סיימתי!', 'מעבר לתשובה שלי', 'מעבר לתשובה הנכונה', 'להמשיך?') and 'textContent' in pre[-120:]:
        return 'button-label'
    if re.search(r'SetBarDone\($', pre):
        return 'button-label'
    if re.search(r'\balt:\s*$', pre):
        return 'accessibility-label'
    m = re.search(r'\b(title|body)\s*:\s*(?:fbCorrectShown\()?$', pre)
    if m:
        key = js_enclosing_key(src, ch['start']) or ''
        if key.startswith('correct'):
            return 'correct-feedback'
        if key.startswith(('wrong', 'partial')):
            return 'incorrect-feedback'
        return None
    if re.search(r'ShowFeedback\($', pre) or re.search(r'ShowFeedback\(\s*\'[^\']*\',\s*$', pre):
        return None
    return None


def prefix_map(part, html_src_tb):
    m = {}
    for d in descendants(html_src_tb.root):
        if d.kind == 'el' and d.tag == 'section' and 'data-screen' in d.attrs and d.attrs.get('id'):
            m[d.attrs['id']] = int(d.attrs['data-screen'])
    return m


def screen_for_html(node, idmap):
    sc, sec = classify_container(node)
    if sc is not None:
        return int(sc)
    c = node
    while c is not None:
        if c.kind == 'el' and c.attrs.get('id'):
            m = re.match(r'^(?:s|dqx|ddq|oddq)(\d+)-', c.attrs['id'])
            if m and ('s' + m.group(1)) in idmap:
                return idmap['s' + m.group(1)]
        c = c.parent
    return 99


from jsstr import tokenize as _tok


def find_coupled(js):
    """const S<n>_CORRECT / S<n>_OPTIONS declarations whose values are compared by text somewhere in the file"""
    out = []
    toks = [(a, b) for (k, a, b, r) in _tok(js) if k in ('str', 'tpl', 'comment', 'regex')]
    mask = bytearray(len(js))
    for a, b in toks:
        for i in range(a, b):
            mask[i] = 1
    for m in re.finditer(r'const\s+(S\d+)_(CORRECT|OPTIONS)\s*=', js):
        pref = m.group(1)
        cmp_ = re.search(r'(===|!==)\s*' + pref + r'_CORRECT\b|\b' + pref + r'_CORRECT\[[^\]]*\]\s*(===|!==)', js)
        if not cmp_:
            continue
        i = m.end()
        depth = 0
        while i < len(js):
            if not mask[i]:
                c = js[i]
                if c in '{[(':
                    depth += 1
                elif c in '}])':
                    depth -= 1
                elif c == ';' and depth <= 0:
                    break
            i += 1
        out.append((m.group(1) + '_' + m.group(2), m.start(), i))
    return out


def process_part(part):
    pdir = f"{ROOT}/{MOD}-{part}"
    fhtml = f"{pdir}/index.html"
    fjs = f"{pdir}/script.js"
    hs = rd(fhtml)
    tb, hunits = collect(hs)
    idmap = prefix_map(part, tb)
    valid = {int(k[1:]): v for k, v in idmap.items() if re.match(r's\d+$', k)}
    pnum = part
    flow = 0
    for d in descendants(tb.root):
        if d.kind == 'el' and d.tag == 'section' and 'data-screen' in d.attrs:
            sc = int(d.attrs['data-screen'])
            r = reg_screen(pnum, sc, title=screen_title_from_comment(hs, d.start), type=detect_type(d),
                           file=f"{MOD}-{part}/index.html", selector=f"#{d.attrs.get('id')}")
            r['flow'] = flow
            flow += 1
            r['sid'] = d.attrs.get('id')
    for u in hunits:
        sc = screen_for_html(u['node'], idmap)
        role = role_html(u)
        note = []
        mr = []
        if u['node'].tag == 'title':
            note.append('document <title> (outside every .screen)')
        if u.get('placeholders'):
            note.append('placeholder(s) ' + ', '.join(u['placeholders']) + ': an empty drop-target <span> with drag/drop handlers was abstracted; keep the braces and place them where the blank belongs in the sentence')
        _c = u['node']
        _in_dpq = False
        while _c is not None and _c.kind == 'el':
            if 'dpq-sentence' in _c.attrs.get('class', '').split():
                _in_dpq = True
                break
            _c = _c.parent
        if _in_dpq and u['kind'] == 'text':
            note.append('fragment of a sentence interrupted by dropdown blank(s) (dpq-sentence); read it together with the neighbouring units of the same sentence')
            if len(re.sub(r'<[^>]+>', '', u['text']).strip()) <= 3:
                mr.append('very short sentence fragment glued to a dropdown blank (e.g. a prefix letter); the sentence may need restructuring in the target language')
        if u['text'] in ('כותרת', 'תוכן') and u['node'].tag == 'p':
            mr.append('looks like default placeholder text of a popup whose real title/body is written by JS at runtime; verify it is ever visible')
        if u['kind'] == 'attr':
            note.append(f"HTML attribute {u['attr']}")
            if u['attr'] == 'data-zoom-alt':
                note.append('same text as the alt of the image in the same screen')
            if u['attr'] in ('data-value',):
                mr.append('logic-coupled: attribute used in answer comparison')
        elif u['node'].tag != 'title' and u['text'] != u['raw']:
            pass
        units.append(dict(part=pnum, screen=sc, file=f"{MOD}-{part}/index.html", line=u['line'], text=u['text'],
                          raw=u['raw'], src_kind='html-' + u['kind'], role=role, note=note, manual=mr,
                          order=(0, u['start'] if u['start'] is not None else 0)))
    # event-handler attributes with Hebrew arguments (not translated, but logic-coupled)
    for d in descendants(tb.root):
        if d.kind == 'el':
            for k, v in d.attrs.items():
                if k.startswith('on') and HEB.search(v):
                    args = re.findall(r"'([^']*[\u0590-\u05ff][^']*)'", v)
                    excluded.append((f"{MOD}-{part}/index.html", d.line, k + '=' + v,
                                     'event-handler attribute (code); its Hebrew argument is logic-coupled: must equal the matching JS constant and the visible option text'))
                    for a in args:
                        coupled_args.append((pnum, a))
    # inline scripts in index.html
    for d in descendants(tb.root):
        if d.kind == 'el' and d.tag == 'script':
            body = hs[d.start_end:d.end_start]
            if HEB.search(body):
                chains, regs, lo = collect_js(body, base_line=tb.lineof(d.start_end))
                for ch in chains:
                    sc = 99
                    units.append(dict(part=pnum, screen=sc, file=f"{MOD}-{part}/index.html", line=ch['line'], text=ch['raw'], raw=ch['raw'],
                                      src_kind='js', role=None, note=['string literal in inline <script>'], manual=[], order=(1, d.start_end + ch['start'])))
    # script.js
    js = rd(fjs)
    chains, regs, lo = collect_js(js)
    coupled_decls = find_coupled(js)
    for r in regs:
        excluded.append((f"{MOD}-{part}/script.js", js.count('\n', 0, r[1]) + 1, r[3], 'regular expression with Hebrew (matching logic, not displayed)'))
    for ch in chains:
        pre = js[:ch['start']]
        hit = None
        tail = pre[-6000:]
        for mm in reversed(list(SCREEN_PAT.finditer(tail))):
            n = int(mm.group(1))
            if n in valid:
                hit = (n, len(tail) - mm.start())
                break
        note = ['string literal in script.js']
        mr = []
        fn = re.search(r'function\s+(\w+)\s*\([^)]*\)\s*\{[^{}]*$', pre[-400:])
        in_fbshown = bool(fn and fn.group(1) == 'fbCorrectShown') or 'fbCorrectShown(title)' in pre[-300:]
        if in_fbshown:
            sc = 99
            mr.append('suffix concatenated at runtime to a (translated) feedback title; punctuation logic in fbCorrectShown() (trims trailing space/:/,/; and adds "." if no end punctuation)')
        elif hit:
            sc = valid[hit[0]]
            near = js[max(0, ch['start'] - 600):ch['start'] + 300]
            if hit[1] > 1500 and not re.search(r'\boddq\w*', near):
                mr.append(f'screen attribution by nearest screen reference is {hit[1]} chars away - verify')
        else:
            sc = 99
            mr.append('screen could not be determined')
        for (nm, ds, de) in coupled_decls:
            if ds <= ch['start'] < de:
                mr.append('logic-coupled: value inside const %s is compared by text (===) with the option the learner selected; translate consistently with the matching dropdown/answer-option text' % nm)
        if ch['placeholders']:
            note.append('runtime concatenation; placeholders: ' + ', '.join('{%s}' % p for p in ch['placeholders']))
            mr.append('contains runtime placeholder(s); word order matters')
        if ch['tpl']:
            mr.append('template literal; ${...} converted to {name} placeholder')
        if '\\n' in ch['raw']:
            note.append('JS escape \\n = line break; keep it')
        if "\\'" in ch['raw'] or '\\"' in ch['raw']:
            note.append("JS escaped quote kept as written in source")
        units.append(dict(part=pnum, screen=sc, file=f"{MOD}-{part}/script.js", line=ch['line'], text=ch['raw'], raw=ch['raw'],
                          src_kind='js', role=role_js(js, ch), note=note, manual=mr, order=(1, ch['start'])))


def process_applet():
    part = '05'
    f = f"{ROOT}/{MOD}-05/{APPLET_DIR}/index.html"
    hs = rd(f)
    tb, hunits = collect(hs)
    rpath = f"{MOD}-05/{APPLET_DIR}/index.html"
    reg_screen(part, 98, title='יישומון מעבדת הבקבוקים (מוטמע ב-iframe במסכים 1-5 של חלק 05)', type='Applet (embedded iframe)',
               file=rpath, selector='iframe → ' + APPLET_DIR + '/index.html')
    screens[(part, 98)]['manual'].add('embedded applet — screen id 98 chosen by the exporter; confirm numbering')
    for u in hunits:
        units.append(dict(part=part, screen=98, file=rpath, line=u['line'], text=u['text'], raw=u['raw'],
                          src_kind='html-' + u['kind'], role=('accessibility-label' if u['kind'] == 'attr' else None),
                          note=(['document <title> of the applet'] if u['node'].tag == 'title' else []) + ([f"HTML attribute {u['attr']}"] if u['kind'] == 'attr' else []),
                          manual=[], order=(0, u['start'] or 0)))
    for d in descendants(tb.root):
        if d.kind == 'el' and d.tag == 'script':
            body = hs[d.start_end:d.end_start]
            if HEB.search(body):
                chains, regs, lo = collect_js(body, base_line=tb.lineof(d.start_end))
                for r in regs:
                    excluded.append((rpath, 0, r[3], 'regular expression with Hebrew'))
                for ch in chains:
                    mr = []
                    note = ['string literal in the applet inline <script>']
                    if ch['placeholders']:
                        note.append('runtime concatenation; placeholders: ' + ', '.join('{%s}' % p for p in ch['placeholders']))
                        mr.append('contains runtime placeholder(s); word order matters')
                    if ch['tpl']:
                        mr.append('template literal; ${...} converted to {name} placeholder')
                    units.append(dict(part=part, screen=98, file=rpath, line=ch['line'], text=ch['raw'], raw=ch['raw'], src_kind='js',
                                      role=None, note=note, manual=mr, order=(1, d.start_end + ch['start'])))


for p in PARTS:
    process_part(p)
process_applet()

for (pp, a) in coupled_args:
    for u in units:
        if u['part'] == pp and u['src_kind'] == 'html-text' and u['text'] == a:
            u['manual'].append('logic-coupled: this visible text is also passed as an onclick argument and compared with a JS const; translate consistently with the JS values')
            u['note'].append('same text appears in an HTML onclick argument (excluded, see report)')
            u['coupled_arg'] = True

mu = [u for u in units if u['part'] == '05' and u['screen'] == 98 and '{m}' in u['text']]
for u in mu:
    u['manual'].append('runtime placeholder {m} is filled with one of the material names (the three JS units that precede it, e.g. "הזכוכית"), glued after the Hebrew prefix "מ"; grammar/word order will differ in other languages')
    for v in units:
        if v['part'] == '05' and v['screen'] == 98 and v['text'] in ('הזכוכית', 'הפלסטיק השקוף', 'המתכת') and v['src_kind'] == 'js':
            v['manual'].append('inserted at runtime into the sentence "' + u['text'] + '" via {m}; translate so the combined sentence stays grammatical')

# bare numeric-only text cells (excluded, logged)
for p_ in PARTS:
    _src = rd(f"{ROOT}/{MOD}-{p_}/index.html")
    _src = re.sub(r'<!--.*?-->', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), _src, flags=re.S)
    _src = re.sub(r'<(script|style|svg)\b.*?</\1>', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), _src, flags=re.S | re.I)
    for m in re.finditer(r'>([^<>]+)(?=<)', _src):
        t = m.group(1).strip()
        if t and not HEB.search(t) and re.search(r'[A-Za-z0-9]', t):
            excluded.append((f"{MOD}-{p_}/index.html", _src.count('\n', 0, m.start()) + 1, t,
                             'bare numeric value with no linguistic content (table cell / axis value / row index)'))

# decorative alt="" counts per part (log only)
alt_empty = {}
for p_ in PARTS:
    _s = rd(f"{ROOT}/{MOD}-{p_}/index.html")
    alt_empty[p_] = len(re.findall(r'\balt\s*=\s*""', _s))

# chrome screens (99) per part
for u in units:
    if u['screen'] == 99:
        reg_screen(u['part'], 99, title='Global / shared chrome (title, flag button, report & zoom modals, shared JS strings)',
                   type='', file=f"{MOD}-{u['part']}/index.html + script.js", selector='outside .screen / shared JS')

# ids
byscreen = collections.defaultdict(list)
for u in units:
    byscreen[(u['part'], u['screen'])].append(u)
for k, lst in byscreen.items():
    lst.sort(key=lambda x: x['order'])
    for i, u in enumerate(lst, 1):
        u['id'] = f"{TARGET}-{k[0]}-{k[1]:02d}-{i:03d}"
        u['screen_id'] = f"{TARGET}-{k[0]}-{k[1]:02d}"
        reg = screens.get(k)
        if u['manual']:
            reg['manual'].update(u['manual'][:0])
            reg['manual'].add('has unit-level manual-review flags')

json.dump(dict(units=[{k: v for k, v in u.items() if k != 'node'} for u in units],
               screens=[{**{k: v for k, v in s.items() if k != 'manual'}, 'manual': sorted(s['manual'])} for s in screens.values()],
               excluded=excluded, alt_empty=alt_empty), open(os.path.join(OUT, 'raw.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(units), 'units;', len(screens), 'screens')
