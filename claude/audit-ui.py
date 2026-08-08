#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Run the checks instead of reading the file.

The toast sweep found instances an eyeball pass had missed, so this widens the
same method to every user-visible string and every hardcoded colour in the app.
Reports only; fixes are applied deliberately afterwards.
"""
import io, re, glob, sys
from collections import defaultdict

FILES = sorted(glob.glob('schedule-builder/*.js')) + sorted(glob.glob('schedule-builder/*.html'))
CSS = 'schedule-builder/sb-app.css'
SRC = {p: io.open(p, encoding='utf-8').read() for p in FILES}
CSSTXT = io.open(CSS, encoding='utf-8').read()

# Punctuation that is doing a word's job vs. legitimate typography.
ALLOWED = set('\u2014\u2013\u2019\u201c\u201d\u2026\u00b7\u00d7\u2212\u2192\u2013\u00a0\u00ba\u00b0')
def glyphs(t):
    return sorted({c for c in t if ord(c) > 0x2100 and c not in ALLOWED})

def report(title, rows, cap=14):
    print('\n' + '=' * 74)
    print(title + '   [' + str(len(rows)) + ']')
    print('=' * 74)
    for r in rows[:cap]:
        print('  ' + r)
    if len(rows) > cap:
        print('  ... and %d more' % (len(rows) - cap))
    return len(rows)

total = 0

# ── 1. Decorative glyphs in ANY user-visible string, not just toasts ──────
hits = []
for p, s in SRC.items():
    # button/chip label text, headings, and short quoted UI strings
    for m in re.finditer(r'>([^<>{}$]{2,70})</(button|h1|h2|h3|span|strong|label|option|th|td)>', s):
        g = glyphs(m.group(1))
        if g:
            hits.append('%-22s %-3s %s' % (p.split('/')[-1], ''.join(g), m.group(1).strip()[:44]))
    for m in re.finditer(r'(?:title|aria-label|placeholder)="([^"]{2,80})"', s):
        g = glyphs(m.group(1))
        if g:
            hits.append('%-22s %-3s attr: %s' % (p.split('/')[-1], ''.join(g), m.group(1)[:40]))
total += report('1. DECORATIVE GLYPHS IN USER-VISIBLE TEXT', hits)

# ── 2. Interactive controls with no accessible name ───────────────────────
hits = []
for p, s in SRC.items():
    for m in re.finditer(r'<button(?![^>]*aria-label)([^>]*)>(.{0,60}?)</button>', s, re.S):
        attrs, inner = m.group(1), m.group(2)
        # strip template expressions and tags to see what a screen reader gets
        # A ${...} label IS a label at runtime — stripping it and calling the
        # button nameless was the audit's own bug, not the app's.
        if '${' in inner:
            continue
        txt = re.sub(r'<[^>]*>|&[a-z]+;|&#\d+;', '', inner).strip()
        if len(txt) >= 2:
            continue                      # has real text, fine
        has_title = 'title=' in attrs
        cls = (re.search(r'class="([^"]*)"', attrs) or [None, '?'])[1]
        hits.append('%-22s %-26s %s' % (p.split('/')[-1], cls[:26],
                                        'title only' if has_title else 'NO NAME AT ALL'))
seen = defaultdict(int)
for h in hits: seen[h] += 1
hits = ['%s  x%d' % (k, v) if v > 1 else k for k, v in sorted(seen.items())]
hard = [h for h in hits if 'NO NAME AT ALL' in h]
soft = [h for h in hits if 'title only' in h]
total += report('2a. CONTROLS A SCREEN READER GETS NOTHING FROM', hard)
report('2b. controls named only by title (weak, but named)', soft)

# ── 3. Hardcoded colours that fail WCAG AA against their own background ───
def lum(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)
def cr(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + .05) / (min(la, lb) + .05)

DARK = re.compile(r'^(bar-|pr-|lv-badge|ans-p|bcs-p)')
SURFACES = {'#FFFFFF': 'white', '#F7F8FB': 'surf2', '#F0F2F6': 'surf3'}
# Verified by hand against the rendered app, so a future run does not cry wolf.
# Every one of these sits on navy or is a deck-theme override; re-check if the
# container changes. An audit nobody trusts is an audit nobody runs.
CLEARED = {
    'review': 'bar-status pill, .bar is navy (9.4:1)',
    'ready': 'bar-status pill on navy',
    'published': 'bar-status pill on navy',
    'good': 'health-chip is .bb in the navy bar (9.7:1)',
    'ok': 'health-chip on navy',
    'bad': 'health-chip on navy',
    'along-chip': 'deck-theme override; light theme uses #0A6E8C',
    'ts-along-flag': 'deck-theme override; light theme uses #0A6E8C',
    'along-warn': 'deck-theme override; light theme uses #B45309',
    'partial': 'lock-chip, deck-theme override',
    'bcs-pft': 'print footer sits on white, not navy — 6.29:1',
    'pe-dash': 'dead CSS, no markup references it',
}
hits = []
for m in re.finditer(r'\.([a-z0-9-]+)\{([^}]*)\}', CSSTXT):
    cls, body = m.group(1), m.group(2)
    col = re.search(r'(?<!-)color:(#[0-9A-Fa-f]{6})', body)
    size = re.search(r'font-size:([\d.]+)px', body)
    if not col: continue
    fg = col.group(1)
    bgm = re.search(r'background:(#[0-9A-Fa-f]{6})', body)
    if bgm:
        bg = bgm.group(1)
    elif DARK.search(cls) or re.search(r'rgba\(255,255,255', body):
        bg = '#171F69'                    # navy container: .bar, projector rows
    else:
        bg = '#FFFFFF'
    sz = float(size.group(1)) if size else 13.0
    need = 3.0 if sz >= 18 else 4.5
    r = cr(fg, bg)
    if r < need and cls not in CLEARED:
        hits.append('.%-22s %-8s on %-8s %5.2f  (needs %.1f at %gpx)'
                    % (cls, fg, bg, r, need, sz))
total += report('3. HARDCODED TEXT COLOURS BELOW WCAG AA', hits)

# ── 4. Red on blue — the one brand rule with no exceptions ────────────────
hits = []
NAVY = ['#171F69', 'var(--navy)']
RED = ['#E31937', 'var(--red)']
for m in re.finditer(r'\.([a-z0-9-]+)[^{]*\{([^}]*)\}', CSSTXT):
    body = m.group(2)
    fg = re.search(r'(?<!-)color:\s*(#[0-9A-Fa-f]{6}|var\(--[a-z]+\))', body)
    bg = re.search(r'background:\s*(#[0-9A-Fa-f]{6}|var\(--[a-z]+\))', body)
    if not (fg and bg): continue
    f, b = fg.group(1), bg.group(1)
    if (f in RED and b in NAVY) or (f in NAVY and b in RED):
        hits.append('.%s  %s on %s' % (m.group(1), f, b))
total += report('4. RED ON BLUE (ADA rule, no exceptions)', hits)

# ── 5. Same action, different words ───────────────────────────────────────
toasts = defaultdict(list)
for p, s in SRC.items():
    for m in re.finditer(r"toast\('([^']{3,60})'", s):
        t = m.group(1)
        key = re.sub(r'[^a-z ]', '', t.lower())
        key = ' '.join(sorted(w for w in key.split() if len(w) > 3))
        toasts[key].append((p.split('/')[-1], t))
hits = []
for k, v in toasts.items():
    words = {t for _, t in v}
    if len(words) > 1:
        hits.append(' | '.join(sorted(words))[:96])
total += report('5. ONE ACTION, MORE THAN ONE WORDING', hits)

print('\n' + '=' * 74)
print('TOTAL FINDINGS: %d' % total)
print('=' * 74)
