import re
import bisect

HEB = re.compile('[֐-׿]')
VOID = {'br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'col', 'area', 'base', 'wbr', 'track', 'embed'}
INLINE = {'b', 'strong', 'i', 'em', 'u', 'span', 'sub', 'sup', 'small', 'mark', 'br', 'a', 'bdi', 'bdo', 'abbr', 'font', 's'}
SKIP = {'script', 'style'}
TEXT_ATTRS_SKIP = {'class', 'id', 'href', 'src', 'style', 'onclick', 'data-zoom-src', 'srcset', 'type', 'name',
                   'for', 'role', 'dir', 'lang', 'rel', 'charset', 'content', 'viewport'}

# tag: <(/?)name attrs (/?)>   -- attributes: name[=value] with quoted or bare values
TAG_RE = re.compile(
    r'<(/?)([A-Za-z][A-Za-z0-9:-]*)'
    r'((?:\s+[^\s=>/"\']+(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?)*)'
    r'\s*(/?)>', re.S)
ATTR_RE = re.compile(r'([^\s=>/"\']+)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+)))?', re.S)


class Node:
    __slots__ = ('tag', 'attrs', 'start', 'start_end', 'end_start', 'end', 'children', 'parent', 'line', 'text', 'kind')

    def __init__(self, tag, attrs, start, start_end, line, parent, kind='el'):
        self.tag = tag
        self.attrs = attrs
        self.start = start
        self.start_end = start_end
        self.end_start = None
        self.end = None
        self.children = []
        self.parent = parent
        self.line = line
        self.text = None
        self.kind = kind


class TreeBuilder:
    def __init__(self, src):
        self.src = src
        self.lineoff = [0]
        for m in re.finditer('\n', src):
            self.lineoff.append(m.end())
        self.root = Node('#root', {}, 0, 0, 1, None)
        self.cur = self.root

    def lineof(self, off):
        return bisect.bisect_right(self.lineoff, off)

    def text(self, s, e):
        if e > s:
            n = Node('#text', {}, s, e, self.lineof(s), self.cur, 'text')
            n.text = self.src[s:e]
            n.end = e
            self.cur.children.append(n)

    def run(self):
        src = self.src
        i = 0
        n = len(src)
        while i < n:
            j = src.find('<', i)
            if j < 0:
                self.text(i, n)
                break
            if j > i:
                self.text(i, j)
            if src.startswith('<!--', j):
                k = src.find('-->', j + 4)
                i = n if k < 0 else k + 3
                continue
            if src.startswith('<!', j):
                k = src.find('>', j)
                i = n if k < 0 else k + 1
                continue
            m = TAG_RE.match(src, j)
            if not m:
                self.text(j, j + 1)
                i = j + 1
                continue
            closing, tag, attrs_s, selfc = m.group(1), m.group(2).lower(), m.group(3), m.group(4)
            if closing:
                c = self.cur
                while c is not None and c.tag != tag:
                    c = c.parent
                if c is not None and c is not self.root:
                    c.end_start = j
                    c.end = m.end()
                    self.cur = c.parent
                i = m.end()
                continue
            attrs = {}
            for am in ATTR_RE.finditer(attrs_s):
                if am.group(2) is not None:
                    v = am.group(2)
                elif am.group(3) is not None:
                    v = am.group(3)
                else:
                    v = am.group(4) or ''
                attrs[am.group(1).lower()] = v
            node = Node(tag, attrs, j, m.end(), self.lineof(j), self.cur)
            self.cur.children.append(node)
            if tag in VOID or selfc:
                node.end_start = node.end = m.end()
                i = m.end()
            elif tag in SKIP:
                k = re.compile('</' + tag + r'\s*>', re.I).search(src, m.end())
                node.end_start = k.start() if k else n
                node.end = k.end() if k else n
                i = node.end
            else:
                self.cur = node
                i = m.end()


def parse(src):
    tb = TreeBuilder(src)
    tb.run()

    def fix(nd):
        if nd.end is None:
            nd.end_start = nd.end = len(src)
        for c in nd.children:
            fix(c)
    fix(tb.root)
    return tb


def descendants(n):
    for c in n.children:
        yield c
        if c.kind == 'el':
            yield from descendants(c)
