#!/usr/bin/env python3
"""
ScoresAndMore (Dive Live / AAU Diving) scraper -> Neon `scoresandmore` schema.

Modes (env MODE):
  meet     Scrape one meet completely: events list, per-event diver results,
           team points, coach points. Env MEET_ID required. Idempotent:
           re-running replaces that meet's rows.
  catalog  Scrape the meets catalog (q_meets). Optional env CRITERIA, e.g.
             "q_meets"."start_date" >= '2025-08-01'
           Defaults to all meets up to today. Upserts scoresandmore.meets.

Every row also stores the complete parsed source row as JSONB (`data`) so no
information is ever lost even if column extraction assumptions drift.

Env: DATABASE_URL, MODE, MEET_ID, CRITERIA (optional), SLEEP_S (default 0.3)
Used via .github/workflows/scoresandmore-scrape.yml (workflow_dispatch).
"""
import json
import os
import re
import sys
import time
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sm_zoho import view, parse_int, parse_num, parse_date

DB_URL = os.environ.get("DATABASE_URL")
MODE = os.environ.get("MODE", "meet").strip()
MEET_ID = os.environ.get("MEET_ID", "").strip()
CRITERIA = os.environ.get("CRITERIA", "").strip()
SLEEP_S = float(os.environ.get("SLEEP_S", "0.3"))

if not DB_URL:
    sys.exit("DATABASE_URL not set")


def db():
    import psycopg2
    return psycopg2.connect(DB_URL)


def find_col(header, *needles, exclude=()):
    """Find the first header whose lowercased name contains all needles and
    none of the excludes. Returns the header string or None."""
    for h in header:
        hl = (h or "").lower()
        if all(n in hl for n in needles) and not any(x in hl for x in exclude):
            return h
    return None


# --------------------------------------------------------------------- meet
def scrape_meet(meet_id):
    ev_view, ev_table = view("meet_events")
    res_view, res_table = view("event_results")
    tp_view, tp_table = view("team_points")
    cp_view, cp_table = view("coach_points")

    crit_events = f'"{ev_table}"."meet_id"={meet_id}'
    events, ev_header = ev_view.rows(crit_events)
    print(f"meet {meet_id}: {len(events)} event rows | header: {ev_header}")

    c_title = find_col(ev_header, "event", "title")
    c_date = find_col(ev_header, "event", "date")
    c_session = find_col(ev_header, "session")
    c_rounds = find_col(ev_header, "round")
    c_dives = find_col(ev_header, "dives")
    c_gender = find_col(ev_header, "gender")
    c_novice = find_col(ev_header, "novice")
    c_synchro = find_col(ev_header, "synchro")
    c_meetname = find_col(ev_header, "meet", "name")
    c_resurl = find_col(ev_header, "result")  # "Event results" link column

    ev_rows = []
    for r in events:
        url = r.get(c_resurl) if c_resurl else None
        m = re.search(r"event_id=(\d+)", url or "")
        event_id = int(m.group(1)) if m else None
        if event_id is None:
            print(f"  WARNING: no event_id in row: {json.dumps(r)[:200]}")
            continue
        ev_rows.append((
            event_id, int(meet_id), r.get(c_meetname),
            parse_date(r.get(c_date)), r.get(c_session), r.get(c_title),
            parse_int(r.get(c_rounds)), parse_int(r.get(c_dives)),
            r.get(c_gender), r.get(c_novice), r.get(c_synchro),
            url, json.dumps(r)))

    # Per-event diver results
    all_res = []
    for i, (event_id, *_rest) in enumerate(ev_rows, 1):
        crit = f'"{res_table}"."event_id"={event_id}'
        rows, res_header = res_view.rows(crit)
        if i == 1:
            print(f"event results header: {res_header}")
            rc_place = find_col(res_header, "place")
            rc_diver = find_col(res_header, "diver")
            rc_grad = find_col(res_header, "grad")
            rc_team = find_col(res_header, "team", exclude=("point",))
            rc_total = find_col(res_header, "total", exclude=("vol", "opt"))
            rc_vols = find_col(res_header, "vol")
            rc_opts = find_col(res_header, "opt")
            rc_tpts = find_col(res_header, "team", "point")
            rc_pdf = find_col(res_header, "pdf")
            rc_sheet = find_col(res_header, "sheet")
        for r in rows:
            sheet_url = r.get(rc_sheet)
            dm = re.search(r"/DiveList/(\d+)-(\d+)", sheet_url or "")
            diver_id = int(dm.group(1)) if dm else None
            sheet_id = int(dm.group(2)) if dm else None
            all_res.append((
                int(meet_id), event_id, r.get(rc_place), r.get(rc_diver),
                r.get(rc_grad), r.get(rc_team), parse_num(r.get(rc_total)),
                parse_num(r.get(rc_vols)), parse_num(r.get(rc_opts)),
                parse_num(r.get(rc_tpts)), diver_id, sheet_id,
                r.get(rc_pdf), sheet_url, json.dumps(r)))
        if i % 20 == 0 or i == len(ev_rows):
            print(f"  results: {i}/{len(ev_rows)} events, {len(all_res)} diver rows so far")
        time.sleep(SLEEP_S)

    # Team & coach points
    tp_rows, tp_header = tp_view.rows(f'"{tp_table}"."meet_id"={meet_id}')
    print(f"team points: {len(tp_rows)} rows | header: {tp_header}")
    t_team = find_col(tp_header, "team", exclude=("point",)) or find_col(tp_header, "team")
    t_pts = find_col(tp_header, "point")
    tp_ins = [(int(meet_id), r.get(t_team), parse_num(r.get(t_pts)), json.dumps(r))
              for r in tp_rows]

    cp_rows, cp_header = cp_view.rows(f'"{cp_table}"."meet_id"={meet_id}')
    print(f"coach points: {len(cp_rows)} rows | header: {cp_header}")
    ccoach = find_col(cp_header, "coach")
    cteam = find_col(cp_header, "team", exclude=("point",))
    cpts = find_col(cp_header, "point")
    cp_ins = [(int(meet_id), r.get(ccoach), r.get(cteam),
               parse_num(r.get(cpts)), json.dumps(r)) for r in cp_rows]

    ev_view.close(); res_view.close(); tp_view.close(); cp_view.close()

    # Single transaction: replace this meet's data
    conn = db(); cur = conn.cursor()
    cur.execute("DELETE FROM scoresandmore.event_results WHERE meet_id=%s", (meet_id,))
    cur.execute("DELETE FROM scoresandmore.meet_events WHERE meet_id=%s", (meet_id,))
    cur.execute("DELETE FROM scoresandmore.team_points WHERE meet_id=%s", (meet_id,))
    cur.execute("DELETE FROM scoresandmore.coach_points WHERE meet_id=%s", (meet_id,))
    cur.executemany(
        """INSERT INTO scoresandmore.meet_events
           (event_id, meet_id, meet_name, event_date, session, event_title,
            rounds, num_dives, gender, novice, synchro, results_url, data)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", ev_rows)
    cur.executemany(
        """INSERT INTO scoresandmore.event_results
           (meet_id, event_id, place, diver_name, grad_year, team_name, total,
            vols_total, opts_total, team_points, diver_id, sheet_id, pdf_url,
            sheet_url, data)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", all_res)
    cur.executemany(
        """INSERT INTO scoresandmore.team_points (meet_id, team_name, points, data)
           VALUES (%s,%s,%s,%s)""", tp_ins)
    cur.executemany(
        """INSERT INTO scoresandmore.coach_points (meet_id, coach_name, team_name, points, data)
           VALUES (%s,%s,%s,%s,%s)""", cp_ins)
    conn.commit()

    cur.execute("""SELECT count(*), count(DISTINCT diver_id), count(DISTINCT diver_name)
                   FROM scoresandmore.event_results WHERE meet_id=%s""", (meet_id,))
    n, ndid, ndname = cur.fetchone()
    cur.close(); conn.close()
    print(f"DONE meet {meet_id}: {len(ev_rows)} events, {n} result rows, "
          f"{ndid} distinct diver_ids, {ndname} distinct diver names, "
          f"{len(tp_ins)} team-point rows, {len(cp_ins)} coach-point rows")


# ------------------------------------------------------------------ catalog
def scrape_catalog():
    m_view, m_table = view("meets")
    crit = CRITERIA or f'"{m_table}"."start_date" <= \'{date.today().isoformat()}\''
    rows, header = m_view.rows(crit)
    m_view.close()
    print(f"catalog: {len(rows)} meets | header: {header}")

    c_name = find_col(header, "meet", "name") or find_col(header, "name")
    c_start = find_col(header, "start")
    c_end = find_col(header, "end")
    url_cols = [h for h in header if any(
        isinstance(r.get(h), str) and "meet_id=" in r[h] for r in rows[:25])]

    ins = []
    for r in rows:
        meet_id = None
        for h in url_cols or header:
            m = re.search(r"meet_id=(\d+)", str(r.get(h) or ""))
            if m:
                meet_id = int(m.group(1)); break
        if meet_id is None:
            print(f"  WARNING: no meet_id found in row: {json.dumps(r)[:200]}")
            continue
        ins.append((meet_id, r.get(c_name), parse_date(r.get(c_start)),
                    parse_date(r.get(c_end)), json.dumps(r)))

    conn = db(); cur = conn.cursor()
    cur.executemany(
        """INSERT INTO scoresandmore.meets (meet_id, meet_name, start_date, end_date, data)
           VALUES (%s,%s,%s,%s,%s)
           ON CONFLICT (meet_id) DO UPDATE SET
             meet_name=EXCLUDED.meet_name, start_date=EXCLUDED.start_date,
             end_date=EXCLUDED.end_date, data=EXCLUDED.data, scraped_at=now()""",
        ins)
    conn.commit(); cur.close(); conn.close()
    print(f"DONE catalog: upserted {len(ins)} meets")


if __name__ == "__main__":
    if MODE == "meet":
        if not MEET_ID.isdigit():
            sys.exit("MEET_ID must be a number for MODE=meet")
        scrape_meet(MEET_ID)
    elif MODE == "catalog":
        scrape_catalog()
    else:
        sys.exit(f"unknown MODE {MODE!r}")
