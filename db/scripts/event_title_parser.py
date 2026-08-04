#!/usr/bin/env python3
"""
Parse DiveMeets event titles into age group, gender and discipline.

WHY A LOOKUP AND NOT A COPY
    342,404 result rows sit unclassified, but they only span 27,842 distinct
    event titles. Classifying the titles and joining at query time is a twelfth
    of the work and leaves one source of truth. It also keeps this out of
    core.event_results, which the qualification pipeline reads: dropping
    parser-classified invitational rows into the table that decides who
    advances is how existing numbers change without anyone noticing.

CONFIDENCE
    A row is only promoted when gender AND discipline parse. Age group is
    allowed to be absent, because for senior events its absence is correct
    rather than a failure. Anything else is left unclassified and counted, so
    the coverage report shows what was skipped instead of quietly dropping it.
"""
import re

# 16-18 -> A, 14-15 -> B, 12-13 -> C, 11 and under -> D. Matches the circuit's
# own age-group definitions so invitational scores are comparable with
# championship scores for the same group.
AGE_PATTERNS = [
    (r'\b16\s*[-–]\s*18\b',                          'Group A'),
    (r'\b14\s*[-–]\s*15\b',                          'Group B'),
    (r'\b12\s*[-–]\s*13\b',                          'Group C'),
    (r'\b11\s*(?:&|and)\s*under\b',                  'Group D'),
    (r'\b11\s*&\s*u\b',                              'Group D'),
    (r'\b(?:10|9)\s*[-–]\s*(?:11|10)\b',             'Group D'),
    (r'\bgroup\s*a\b',                               'Group A'),
    (r'\bgroup\s*b\b',                               'Group B'),
    (r'\bgroup\s*c\b',                               'Group C'),
    (r'\bgroup\s*d\b',                               'Group D'),
    (r'\bsenior\b',                                  'Senior'),
    (r'\bmasters\b',                                 'Masters'),
    (r'\bcollegiate\b|\bncaa\b',                     'Collegiate'),
]

GENDER_PATTERNS = [
    (r'\bgirls?\b',   'Girls'),
    (r'\bboys?\b',    'Boys'),
    (r'\bwom[ae]n\b', 'Women'),
    (r'\bmen\b',      'Men'),
    (r'\bmixed\b',    'Mixed'),
]

# 5m, 7.5m and 10m are all platform; the circuit records them as one
# discipline, so anything else would not compare.
BOARD_PATTERNS = [
    (r'\bplatform\b|\b10\s*m\b|\b7\.5\s*m\b|\b5\s*m\b', 'Platform'),
    (r'\b1\s*m(?:tr|eter)?\b',                          '1M'),
    (r'\b3\s*m(?:tr|eter)?\b',                          '3M'),
]

ROUND_PATTERNS = [
    (r'\bprelim|\bquarterfinal',  'Prelim'),
    (r'\bsemi',                   'Semifinal'),
    (r'\bfinal\b|\bfinals\b',     'Final'),
    (r'\bconsol',                 'Consolation'),
]

SYNCHRO = re.compile(r'\bsynchro|\bsync\b', re.I)


def parse_title(title):
    """-> dict. parsed_ok is True only when gender and discipline are both found."""
    if not title:
        return {'age_group': None, 'gender': None, 'discipline': None,
                'round_label': None, 'is_synchro': False, 'parsed_ok': False}
    t = ' ' + str(title).lower().replace('\u2013', '-') + ' '

    def first(patterns):
        for rx, val in patterns:
            if re.search(rx, t):
                return val
        return None

    # Order matters: check gender before board, because "women" contains no
    # board token but "1m" can appear inside a meet name fragment.
    gender = first(GENDER_PATTERNS)
    board = first(BOARD_PATTERNS)
    age = first(AGE_PATTERNS)
    rnd = first(ROUND_PATTERNS)
    syn = bool(SYNCHRO.search(t))

    # Junior brackets use Boys/Girls; senior and collegiate use Men/Women.
    # A title reading "16-18 Women" is contradictory, so trust the bracket.
    if age in ('Group A', 'Group B', 'Group C', 'Group D'):
        if gender == 'Women':
            gender = 'Girls'
        elif gender == 'Men':
            gender = 'Boys'

    return {'age_group': age, 'gender': gender, 'discipline': board,
            'round_label': rnd, 'is_synchro': syn,
            'parsed_ok': bool(gender and board)}


CASES = [
    # (title, expected age, gender, discipline, synchro)
    ('14-15 Girls 1m J.O (Final)',            'Group B', 'Girls', '1M',       False),
    ('12-13 Boys 3m J.O (Final)',             'Group C', 'Boys',  '3M',       False),
    ('11 & Under Girls 1m J.O (Final)',       'Group D', 'Girls', '1M',       False),
    ('16-18 Girls Platform J.O (Final)',      'Group A', 'Girls', 'Platform', False),
    ('16-18 Boys 1m J.O (Final)',             'Group A', 'Boys',  '1M',       False),
    ('Senior Women 3m (Final)',               'Senior',  'Women', '3M',       False),
    ('Senior Men 3m (Prelim/Quarterfinal)',   'Senior',  'Men',   '3M',       False),
    ('Senior Women 10m (Final)',              'Senior',  'Women', 'Platform', False),
    ('Group A Boys 3m (Final)',               'Group A', 'Boys',  '3M',       False),
    ('11 and Under Boys 3m',                  'Group D', 'Boys',  '3M',       False),
    ('Mixed Synchro Platform (Final)',        None,      'Mixed', 'Platform', True),
    ('Senior Men 3m Synchro (Final)',         'Senior',  'Men',   '3M',       True),
    ('14-15 Girls 7.5m Platform',             'Group B', 'Girls', 'Platform', False),
    ('12-13 Girls 5m (Final)',                'Group C', 'Girls', 'Platform', False),
    # A junior bracket with senior gender wording: trust the bracket.
    ('16-18 Women 1m',                        'Group A', 'Girls', '1M',       False),
    # Should NOT parse: no board named.
    ('Awards Ceremony',                        None,     None,    None,       False),
    ('Coaches Meeting',                        None,     None,    None,       False),
]


def selftest():
    bad = 0
    print(f"{'title':42} {'age':10} {'gender':7} {'disc':9} sync  ok")
    for title, eage, egen, edis, esyn in CASES:
        r = parse_title(title)
        good = (r['age_group'] == eage and r['gender'] == egen
                and r['discipline'] == edis and r['is_synchro'] == esyn)
        if not good:
            bad += 1
        print(f"{title[:42]:42} {str(r['age_group']):10} {str(r['gender']):7} "
              f"{str(r['discipline']):9} {str(r['is_synchro']):5} "
              f"{'ok' if good else 'MISMATCH expected ' + str((eage, egen, edis, esyn))}")
    print(f"\n{len(CASES)-bad}/{len(CASES)} cases pass")
    return bad == 0


if __name__ == '__main__':
    import sys
    sys.exit(0 if selftest() else 1)
