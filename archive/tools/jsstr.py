import re, sys

HEB = re.compile('[֐-׿]')
BS = chr(92)


def tokenize(src):
    """Return (kind, start, end, raw) for strings/templates/regex/comments."""
    i = 0
    n = len(src)
    out = []
    while i < n:
        c = src[i]
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            j = src.find('\n', i)
            j = n if j < 0 else j
            out.append(('comment', i, j, src[i:j]))
            i = j
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            j = src.find('*/', i + 2)
            j = n if j < 0 else j + 2
            out.append(('comment', i, j, src[i:j]))
            i = j
            continue
        if c in ('"', "'"):
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == BS:
                    j += 1
                j += 1
            out.append(('str', i, j + 1, src[i:j + 1]))
            i = j + 1
            continue
        if c == '`':
            j = i + 1
            while j < n and src[j] != '`':
                if src[j] == BS:
                    j += 1
                j += 1
            out.append(('tpl', i, j + 1, src[i:j + 1]))
            i = j + 1
            continue
        if c == '/':
            k = i - 1
            while k >= 0 and src[k] in ' \t':
                k -= 1
            if k < 0 or src[k] in '(,=:[!&|?{};':
                j = i + 1
                incl = False
                while j < n and src[j] != '\n':
                    if src[j] == BS:
                        j += 2
                        continue
                    if src[j] == '[':
                        incl = True
                    elif src[j] == ']':
                        incl = False
                    elif src[j] == '/' and not incl:
                        break
                    j += 1
                if j < n and src[j] == '/':
                    out.append(('regex', i, j + 1, src[i:j + 1]))
                    i = j + 1
                    continue
        i += 1
    return out


if __name__ == '__main__':
    f = sys.argv[1]
    src = open(f, encoding='utf-8').read()
    for k, s, e, raw in tokenize(src):
        if k in ('str', 'tpl', 'regex') and HEB.search(raw):
            line = src.count('\n', 0, s) + 1
            print(line, k, raw[:170].replace('\n', '\\n'))
