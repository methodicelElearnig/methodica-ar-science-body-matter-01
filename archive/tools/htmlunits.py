import re
from htmlx import *

WS = re.compile(r'\s*\n\s*')
BRSP = re.compile(r'\s*(<br\s*/?>)\s*', re.I)


def normalize(raw):
    s = raw.strip()
    s = WS.sub(' ', s)
    s = BRSP.sub(r'\1', s) if '\n' in raw.strip() else s
    return s


def is_inline_pure(n):
    """element qualifies as an inline run member: inline tag, no svg/img/block descendants"""
    if n.kind == 'text':
        return True
    if n.tag not in INLINE:
        return False
    st = n.attrs.get('style', '')
    if n.tag == 'span' and re.search(r'(?:^|;|\s)(?:left|top|right|bottom|position)\s*:', st):
        return False   # absolutely positioned label: its own unit
    for c in n.children:
        if c.kind == 'el':
            if not is_inline_pure(c):
                return False
    return True


def collect(src):
    tb = parse(src)
    units = []   # dicts

    def screen_of(n):
        c = n
        while c is not None:
            if c.kind == 'el' and c.tag == 'section' and 'data-screen' in c.attrs:
                return c.attrs['data-screen'], c
            c = c.parent
        return None, None

    def ancestors_ids(n):
        out = []
        c = n
        while c is not None:
            if c.kind == 'el' and c.attrs.get('id'):
                out.append(c.attrs['id'])
            c = c.parent
        return out

    def add(kind, line, raw, node, attr=None, start=None, end=None):
        units.append(dict(kind=kind, line=line, raw=raw, placeholders=[], text=normalize(raw) if kind == 'text' else raw,
                          node=node, attr=attr, start=start, end=end))

    def vis_text(n):
        if n.kind == 'text':
            return re.sub(r'\s+', '', n.text)
        return ''.join(vis_text(c) for c in n.children)

    def trim(run):
        while run and run[0].kind == 'text' and not run[0].text.strip():
            run = run[1:]
        while run and run[-1].kind == 'text' and not run[-1].text.strip():
            run = run[:-1]
        # drop empty inline elements (no visible text) at the edges
        while run and run[0].kind == 'el' and not vis_text(run[0]) and run[0].tag != 'br':
            run = run[1:]
            while run and run[0].kind == 'text' and not run[0].text.strip():
                run = run[1:]
        while run and run[-1].kind == 'el' and not vis_text(run[-1]) and run[-1].tag != 'br':
            run = run[:-1]
            while run and run[-1].kind == 'text' and not run[-1].text.strip():
                run = run[:-1]
        return run

    def flush(run, parent):
        run = trim(run)
        if not run:
            return
        # a lone <span> wrapping the whole run is just a container: unwrap it
        els = [x for x in run if x.kind == 'el' and vis_text(x)]
        texts = [x for x in run if x.kind == 'text' and x.text.strip()]
        if len(els) == 1 and not texts and els[0].tag == 'span':
            walk_inner(els[0])
            return
        st = run[0].start
        en = run[-1].end
        raw = src[st:en]
        pieces = []
        placeholders = []
        for x in run:
            if x.kind == 'el' and not vis_text(x) and x.tag == 'span' and (x.attrs.get('id') or any(k.startswith('on') for k in x.attrs)):
                ph = '{dropzone:%s}' % x.attrs.get('id', 'unnamed')
                placeholders.append(ph)
                pieces.append(ph)
            else:
                pieces.append(src[x.start:x.end])
        composed = ''.join(pieces)
        if HEB.search(re.sub(r'<[^>]+>', '', raw)):
            lead = len(raw) - len(raw.lstrip())
            line = tb.lineof(st + lead)
            add('text', line, composed, parent, start=st, end=en)
            units[-1]['placeholders'] = placeholders
            units[-1]['raw'] = raw

    def attr_units(n):
        for k, v in n.attrs.items():
            if v and k not in TEXT_ATTRS_SKIP and HEB.search(v):
                # attribute value line: search in start tag text
                tag_src = src[n.start:n.start_end]
                m = re.search(re.escape(k) + r'\s*=\s*["\']', tag_src)
                off = n.start + (m.start() if m else 0)
                add('attr', tb.lineof(off), v, n, attr=k, start=off)

    def walk_inner(el):
        walk(el)

    def walk(el):
        if el.tag in SKIP:
            return
        run = []
        for c in el.children:
            if c.kind == 'text':
                run.append(c)
                continue
            if c.tag in INLINE and is_inline_pure(c):
                run.append(c)
                # attrs of inline members
                for d in [c] + [x for x in descendants(c) if x.kind == 'el']:
                    attr_units(d)
                continue
            flush(run, el)
            run = []
            attr_units(c)
            walk(c)
        flush(run, el)

    # <title>
    walk(tb.root)
    return tb, units


def classify_container(n):
    """return tuple (screen_attr, screen_node, in_any_section)"""
    c = n
    while c is not None:
        if c.kind == 'el' and c.tag == 'section' and 'data-screen' in c.attrs:
            return c.attrs['data-screen'], c
        c = c.parent
    return None, None
