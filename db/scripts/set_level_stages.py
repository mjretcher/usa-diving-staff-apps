#!/usr/bin/env python3
"""
Set which real stage each level of a saved Boundary Studio proposal counts as
(levels[i].stage: Regionals | Zones | EWC | Nationals) -- the same field the
Structure tab's "Counts as" control writes. Changes nothing else in the record.

Env: DATABASE_URL, SCENARIO_ID, STAGES (comma-separated, one per level, blank =
leave automatic). Refuses a stage count that does not match the level count, an
unknown stage, and a frozen proposal (freezing is the committee's record).
Prints the levels before and after.
"""
import json, os, sys
import psycopg2

ALLOWED = {'Regionals', 'Zones', 'EWC', 'Nationals', ''}
sid = os.environ['SCENARIO_ID'].strip()
stages = [s.strip() for s in os.environ['STAGES'].split(',')]
bad = [s for s in stages if s not in ALLOWED]
if bad:
    sys.exit(f'Unknown stage(s): {bad}; allowed {sorted(ALLOWED - {""})}')

conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute('SELECT name, data FROM membership.boundary_scenarios WHERE id = %s FOR UPDATE', (sid,))
row = cur.fetchone()
if not row:
    sys.exit(f'No proposal {sid}')
name, data = row
data = data if isinstance(data, dict) else json.loads(data)
levels = data.get('levels') or []
if len(levels) != len(stages):
    sys.exit(f'{name}: {len(levels)} levels but {len(stages)} stages given')
if data.get('frozen'):
    sys.exit(f'{name} is frozen; set stages on a copy instead')
print('before:', json.dumps([{k: l.get(k) for k in ('name', 'stage')} for l in levels]))
for lvl, st in zip(levels, stages):
    if st:
        lvl['stage'] = st
    else:
        lvl.pop('stage', None)
cur.execute('UPDATE membership.boundary_scenarios SET data = %s WHERE id = %s', (json.dumps(data), sid))
conn.commit()
print('after: ', json.dumps([{k: l.get(k) for k in ('name', 'stage')} for l in levels]))
print(f'{name} ({sid}) updated')
