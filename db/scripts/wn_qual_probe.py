#!/usr/bin/env python3
"""Read-only check that the Schedule Builder "Qualifying scores check" query runs
against the live results tables, with per-event COUNTS only (no athlete rows).
Mirrors qcLoad()/qcAnalyse() in schedule-builder/sb-format.js for the 2026 Winter
Nationals standards. Output committed to db/audits."""
import os, collections, psycopg2
conn = psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True); cur = conn.cursor()
STD = {('Women','1m'):(235,282,47),('Women','3m'):(260,312,52),('Women','Platform'):(250,250,50),
       ('Men','1m'):(318,318,53),('Men','3m'):(360,360,60),('Men','Platform'):(330,330,55)}
SQL = """SELECT diver_id,diver_name,team_name,nat,gender,discipline,meet_name,meet_year,competition_family,competition_group,round_stage,phase_dive_count,phase_score_from_dives,posted_score,score_is_cumulative
    FROM core.result_phases
    WHERE meet_year IN (2025,2026) AND COALESCE(is_synchronized,false)=false
      AND gender IN ('Female','Male') AND discipline IN ('1m','3m','Platform')
      AND GREATEST(COALESCE(phase_score_from_dives,0),COALESCE(posted_score,0))>=%s
      AND ((competition_group IN ('USA Diving Nationals','USA Diving Nationals Qualifier','USA Diving Winter Nationals','USA Diving Winter Nationals Qualifier') AND event_level='Senior')
        OR (competition_family='World Aquatics' AND nat IN ('USA','United States'))
        OR (competition_family='NCAA' AND ncaa_division='Division I' AND (competition_group ILIKE '%%zone%%' OR competition_group ILIKE '%%championship%%')))"""
cur.execute(SQL, (235,)); rows = cur.fetchall()
print("rows read:", len(rows))
best = {}
routes_seen = collections.Counter()
for (did,name,team,nat,g,d,meet,yr,fam,grp,rnd,n,phase,posted,cum) in rows:
    G = 'Women' if g == 'Female' else 'Men'
    usa, ncaa, opt = STD[(G, d)]
    if fam == 'World Aquatics': rk, is_ncaa = 'wa', False
    elif fam == 'NCAA':
        is_ncaa = True
        rk = 'zone' if 'zone' in (grp or '').lower() else ('ncaa' if (grp or '') == 'NCAA Division I Championships' else 'conf')
    else: rk, is_ncaa = 'usa', False
    thr = ncaa if is_ncaa else usa
    expect = round(thr / opt)
    own = float(phase) if phase is not None else (None if cum else (float(posted) if posted is not None else None))
    status = None
    if own is not None and own >= thr and n is not None and n == expect: status = 'ok'
    elif own is not None and own >= thr: status = 'look'
    elif own is None and posted is not None and float(posted) >= thr: status = 'look'
    if not status: continue
    routes_seen[(rk, status)] += 1
    k = (G, d, did or name)
    cur_ = best.get(k)
    if not cur_: best[k] = {'status': status, 'routes': {rk}}
    else:
        cur_['routes'].add(rk)
        if status == 'ok': cur_['status'] = 'ok' if (cur_['status'] == 'ok' or True) else cur_['status']
print("\nqualifying rows by route and status:")
for k, v in sorted(routes_seen.items()): print("  ", k, v)
print("\nathletes per event (one per athlete):")
print("event | meets the score | conference only | needs a look")
for ev in STD:
    items = [v for (G, d, _), v in best.items() if (G, d) == ev]
    # status 'ok' may have come only from conference rows; recompute strictly below
    print(ev[0], ev[1], "|", sum(1 for v in items if v['status']=='ok' and v['routes']!={'conf'}), "|", sum(1 for v in items if v['status']=='ok' and v['routes']=={'conf'}), "|", sum(1 for v in items if v['status']=='look'))
cur.execute("SELECT max(imported_at)::date, count(DISTINCT meet_id) FROM core.result_phases WHERE meet_year=2026"); print("\n2026 results loaded through:", cur.fetchone())
cur.execute("""SELECT competition_group, count(*) FILTER (WHERE phase_dive_count IS NULL) AS no_dive_count, count(*) AS rows FROM core.result_phases
  WHERE meet_year IN (2025,2026) AND competition_group IN ('USA Diving Nationals','USA Diving Nationals Qualifier','USA Diving Winter Nationals','USA Diving Winter Nationals Qualifier') AND event_level='Senior' AND COALESCE(is_synchronized,false)=false GROUP BY 1 ORDER BY 1""")
print("\nrows without a dive count, USA Diving senior meets:"); [print("  ", r) for r in cur.fetchall()]
