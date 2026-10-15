import json, re, os, sys, csv, collections
from xml.sax.saxutils import escape

OUT = sys.argv[1]
MOD = "methodica-science-body-matter-01"
KNOWN = ['TwoOptionSelection', 'SingleChoiceQuestion', 'MultipleChoiceQuestion', 'FlipCardsReveal', 'DragAndDropQuestion',
         'ValueInputQuestion', 'DropdownQuestion', 'MemoryGame', 'HookOpenQuestion', 'ImageHotspotQuestion', 'AccordionText',
         'TransitionScreen', 'FullImageWithTextOverlay', 'GuidedMathPracticeScreen', 'VideoWatchAndContinue']
d = json.load(open(os.path.join(OUT, 'raw.json'), encoding='utf-8'))
U = d['units']
S = {(s['part'], s['screen']): s for s in d['screens']}

for s in S.values():
    if not s['type']:
        for k in KNOWN:
            if k in s['title']:
                s['type'] = k
                break

screen_id = lambda p, sc: f"01-{p}-{sc:02d}"
U.sort(key=lambda u: u['id'])


def esc(t):
    return escape(t)


# ---------- XLIFF ----------
lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">',
         f'  <file original="{MOD}" source-language="he" datatype="html">',
         '    <body>']
for u in U:
    sc = S[(u['part'], u['screen'])]
    lines.append(f'      <trans-unit id="{u["id"]}" xml:space="preserve">')
    lines.append(f'        <source xml:lang="he">{esc(u["text"])}</source>')
    lines.append('        <target></target>')
    lines.append(f'        <note from="screen-id">{u["screen_id"]}</note>')
    if sc['title']:
        lines.append(f'        <note from="screen-title">{esc(sc["title"])}</note>')
    if sc['type']:
        lines.append(f'        <note from="screen-type">{sc["type"]}</note>')
    if u['role']:
        lines.append(f'        <note from="element-role">{u["role"]}</note>')
    lines.append(f'        <note from="source-location">{esc(u["file"])}:{u["line"]}</note>')
    if u['note']:
        lines.append(f'        <note from="developer-note">{esc("; ".join(u["note"]))}</note>')
    for m in u['manual']:
        lines.append(f'        <note from="manual-review">{esc(m)}</note>')
    lines.append('      </trans-unit>')
lines += ['    </body>', '  </file>', '</xliff>', '']
xlf_path = os.path.join(OUT, f'{MOD}-he.xlf')
with open(xlf_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(lines))

# ---------- manifest ----------
per_screen = collections.defaultdict(list)
for u in U:
    per_screen[(u['part'], u['screen'])].append(u)
rows = []
for (p, sc), s in sorted(S.items()):
    ur = per_screen.get((p, sc), [])
    flags = []
    if s['manual']:
        flags += [m for m in s['manual'] if m != 'has unit-level manual-review flags']
    nflag = sum(1 for u in ur if u['manual'])
    if nflag:
        flags.append(f'{nflag} unit(s) with manual-review notes')
    rows.append([screen_id(p, sc), s['title'], s['type'], s['file'], s['selector'], '; '.join(flags),
                 s['flow'] if s['flow'] is not None else '', len(ur)])
with open(os.path.join(OUT, 'translation-screen-manifest.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['screen_id', 'screen_title', 'screen_type', 'source_file', 'container_or_selector', 'manual_review', 'flow_order', 'unit_count'])
    w.writerows(rows)

json.dump(dict(rows=rows), open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('xlf', len(U), 'units;', len(rows), 'screens')
