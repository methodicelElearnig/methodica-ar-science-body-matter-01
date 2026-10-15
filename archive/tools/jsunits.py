import re
import bisect
from jsstr import tokenize, HEB

GAP_OK = re.compile(r'^\s*\+\s*(?:[A-Za-z_$][\w$.\[\]() ]*?\s*\+\s*)?$', re.S)
GAP_STR = re.compile(r'^\s*\+\s*$', re.S)
IDENT = re.compile(r'[A-Za-z_$][\w$]*')


def line_offsets(src):
    lo = [0]
    for m in re.finditer('\n', src):
        lo.append(m.end())
    return lo


def collect_js(src, base_line=1, base_off=0):
    """Return list of dicts for string chains containing Hebrew (outside comments).
    Each: line, start, end, raw (as joined with {placeholders}), parts, kind, has_placeholder, tokens"""
    toks = tokenize(src)
    lo = line_offsets(src)
    lits = [t for t in toks if t[0] in ('str', 'tpl')]
    regs = [t for t in toks if t[0] == 'regex' and HEB.search(t[3])]
    chains = []
    i = 0
    while i < len(lits):
        group = [lits[i]]
        names = []
        j = i
        while j + 1 < len(lits):
            gap = src[lits[j][2]:lits[j + 1][1]]
            if GAP_STR.match(gap):
                names.append(None)
            elif GAP_OK.match(gap) and '\n' not in gap.strip():
                expr = gap.strip().strip('+').strip()
                idents = IDENT.findall(expr)
                names.append(idents[-1] if idents else 'value')
            else:
                break
            group.append(lits[j + 1])
            j += 1
        i = j + 1
        text = ''
        for k, (kind, s, e, raw) in enumerate(group):
            inner = raw[1:-1]
            if kind == 'tpl':
                inner = re.sub(r'\$\{([^}]*)\}', lambda m: '{' + (IDENT.findall(m.group(1)) or ['value'])[-1] + '}', inner)
            text += inner
            if k < len(names):
                if names[k]:
                    text += '{' + names[k] + '}'
        if not HEB.search(text):
            continue
        s0 = group[0][1]
        chains.append(dict(start=s0, end=group[-1][2], raw=text,
                           line=base_line + bisect.bisect_right(lo, s0) - 1,
                           nparts=len(group), placeholders=[n for n in names if n],
                           tpl=any(g[0] == 'tpl' for g in group)))
    return chains, regs, lo
