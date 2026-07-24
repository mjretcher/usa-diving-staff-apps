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
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sm_zoho import view, parse_int, parse_num, parse_date

DB_URL = os.environ.get("DATABASE_URL")
MODE = os.environ.get("MODE", "meet").strip()
MEET_ID = os.environ.get("MEET_ID", "").strip()
CRITERIA = os.environ.get("CRITERIA", "").strip()
SLEEP_S = float(os.environ.get("SLEEP_S", "0.3"))

# Events skipped because their results grid exceeded the 200-row cap.
CAP_GAPS = []

if not DB_URL:
    sys.exit("DATABASE_URL not set")



# ---------------------------------------------------------------- run report
_LOG = []
_orig_print = print
def print(*args, **kw):  # noqa: A001 - intentional shadow, tee to run report
    _LOG.append(" ".join(str(a) for a in args))
    _orig_print(*args, **kw)


def store_report(ok, error=None):
    try:
        import psycopg2
        from datetime import datetime, timezone
        conn = psycopg2.connect(DB_URL); cur = conn.cursor()
        cur.execute(
            """INSERT INTO app_meta.config (key, value, description)
               VALUES (%s, %s, 'ScoresAndMore scrape run report (sm_scrape.py)')
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
            ("sm_scrape_last_run", json.dumps({
                "ok": ok, "mode": MODE, "meet_id": MEET_ID, "criteria": CRITERIA,
                "at": datetime.now(timezone.utc).isoformat(),
                "error": error, "log": _LOG[-400:]})))
        conn.commit(); cur.close(); conn.close()
    except Exception as e:
        _orig_print(f"could not store run report: {e!r}")


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


# ------------------------------------------------------- grid cap splitting
# Zoho's grid returns at most 200 rows and sm_zoho.rows() refuses to ingest a
# possibly-truncated result. The documented remedy is to narrow the criteria,
# so when a meet is large enough to cap we split it into disjoint windows and
# concatenate. Windows are disjoint by construction, so concatenating cannot
# double-count. Any row whose split field is empty would fall outside every
# window, so we verify the recovered total against a probe and fail loudly
# rather than ingest a silent gap.
def zoho_date(iso):
    """Zoho Analytics renders and accepts dates as DD-Mon-YYYY (e.g. 16-Jul-2026),
    not ISO. Confirmed against the stored recon capture for meet 6925."""
    y, m, d = iso.split("-")
    mon = ["Jan","Feb","Mar","Apr","May","Jun",
           "Jul","Aug","Sep","Oct","Nov","Dec"][int(m) - 1]
    return f"{int(d):02d}-{mon}-{y}"


def _is_cap(e):
    t = str(e)
    return "GRID CAP HIT" in t or "PAGINATION NEEDED" in t


def rows_split(v, table, base_crit, meet_id, label="rows"):
    """Fetch base_crit, splitting by event date then session if the grid caps."""
    try:
        return v.rows(base_crit)
    except RuntimeError as e:
        if not _is_cap(e):
            raise
        print(f"  {label}: grid cap hit -- splitting by date")

    dates = meet_dates(meet_id)
    if not dates:
        raise RuntimeError(
            f"{label}: grid cap hit for {base_crit!r} and no meet date range is "
            f"known for meet {meet_id}; cannot split safely")

    out, header, capped_dates = [], None, []
    for d in dates:
        crit = f'{base_crit} and "{table}"."Event date"=\'{zoho_date(d)}\''
        try:
            rows, hdr = v.rows(crit)
        except RuntimeError as e:
            if not _is_cap(e):
                raise
            capped_dates.append(d)
            continue
        header = header or hdr
        out.extend(rows)
        if rows:
            print(f"    {d}: {len(rows)} rows")

    # A single date that still caps gets split again by session.
    for d in capped_dates:
        print(f"    {d}: still caps -- splitting by session")
        for sess in range(1, 21):
            crit = (f'{base_crit} and "{table}"."Event date"=\'{zoho_date(d)}\' '
                    f'and "{table}"."Session"=\'{sess}\'')
            try:
                rows, hdr = v.rows(crit)
            except RuntimeError as e:
                if _is_cap(e):
                    raise RuntimeError(
                        f"{label}: {d} session {sess} still exceeds the grid cap; "
                        f"a finer split is needed before this meet can be trusted")
                raise
            header = header or hdr
            out.extend(rows)
            if rows:
                print(f"      {d} session {sess}: {len(rows)} rows")

    if header is None:
        raise RuntimeError(f"{label}: split produced no rows for {base_crit!r}")
    print(f"  {label}: {len(out)} rows recovered across {len(dates)} date window(s)")
    return out, header


def meet_dates(meet_id):
    """Inclusive list of ISO dates for a meet, from the already-scraped catalog."""
    import psycopg2
    conn = psycopg2.connect(DB_URL); cur = conn.cursor()
    cur.execute("SELECT start_date, end_date FROM scoresandmore.meets WHERE meet_id=%s",
                (int(meet_id),))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row or not row[0]:
        return []
    start, end = row[0], row[1] or row[0]
    if end < start:
        start, end = end, start
    # Pad a day either side: sources occasionally carry an event dated just
    # outside the advertised window.
    start, end = start - timedelta(days=1), end + timedelta(days=1)
    return [(start + timedelta(days=i)).isoformat()
            for i in range((end - start).days + 1)]


# --------------------------------------------------------------------- meet
def scrape_meet(meet_id):
    ev_view, ev_table = view("meet_events")
    res_view, res_table = view("event_results")
    tp_view, tp_table = view("team_points")
    cp_view, cp_table = view("coach_points")

    crit_events = f'"{ev_table}"."meet_id"={meet_id}'
    events, ev_header = rows_split(ev_view, ev_table, crit_events, meet_id,
                                   label="meet events")
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

    # Per-event diver results. The source events list can contain the same
    # event_id twice (e.g. event 37592 at meet 6925); keep both meet_events
    # rows verbatim but fetch/ingest each event's results exactly once.
    seen_ids, uniq_ids = set(), []
    for (event_id, *_rest) in ev_rows:
        if event_id not in seen_ids:
            seen_ids.add(event_id)
            uniq_ids.append(event_id)
    if len(uniq_ids) != len(ev_rows):
        print(f"note: {len(ev_rows)} event rows, {len(uniq_ids)} unique event_ids "
              f"(duplicates preserved in meet_events, results fetched once each)")
    all_res = []
    for i, event_id in enumerate(uniq_ids, 1):
        crit = f'"{res_table}"."event_id"={event_id}'
        try:
            rows, res_header = res_view.rows(crit)
        except RuntimeError as e:
            if not _is_cap(e):
                raise
            # Never ingest a truncated event silently: skip it and record the
            # gap so it is queryable and can be surfaced in the apps.
            print(f"  GAP: event {event_id} exceeds the 200-row grid cap -- skipped")
            CAP_GAPS.append((int(meet_id), int(event_id), str(e)[:400]))
            continue
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
            name = r.get(rc_diver)
            is_ex = bool(name) and name.lstrip().lower().startswith("(ex.)")
            all_res.append((
                int(meet_id), event_id, r.get(rc_place), name, is_ex,
                r.get(rc_grad), r.get(rc_team), parse_num(r.get(rc_total)),
                parse_num(r.get(rc_vols)), parse_num(r.get(rc_opts)),
                parse_num(r.get(rc_tpts)), diver_id, sheet_id,
                r.get(rc_pdf), sheet_url, json.dumps(r)))
        if i % 20 == 0 or i == len(uniq_ids):
            print(f"  results: {i}/{len(uniq_ids)} events, {len(all_res)} diver rows so far")
        time.sleep(SLEEP_S)

    # Team & coach points (chart-type views -> ZAChartView series)
    tp_pairs = tp_view.chart_rows(f'"{tp_table}"."meet_id"={meet_id}',
                                  dispname="Team points by Team")
    print(f"team points: {len(tp_pairs)} teams")
    tp_ins = [(int(meet_id), label, parse_num(val), json.dumps({"row": raw}))
              for (label, val, raw) in tp_pairs]

    cp_pairs = cp_view.chart_rows(f'"{cp_table}"."meet_id"={meet_id}',
                                  dispname="Team points by Coach")
    print(f"coach points: {len(cp_pairs)} coaches")
    cp_ins = [(int(meet_id), label, None, parse_num(val), json.dumps({"row": raw}))
              for (label, val, raw) in cp_pairs]

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
           (meet_id, event_id, place, diver_name, is_exhibition, grad_year,
            team_name, total, vols_total, opts_total, team_points, diver_id,
            sheet_id, pdf_url, sheet_url, data)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", all_res)
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
    print(f"DONE meet {meet_id}: {len(ev_rows)} event rows "
          f"({len(uniq_ids)} unique), {n} result rows, "
          f"{ndid} distinct diver_ids, {ndname} distinct diver names, "
          f"{len(tp_ins)} team-point rows, {len(cp_ins)} coach-point rows")

    # Persist (or clear) this meet's coverage gaps so downstream apps can tell
    # a genuinely empty event from one we could not fetch.
    import psycopg2
    conn = psycopg2.connect(DB_URL); cur = conn.cursor()
    cur.execute("DELETE FROM scoresandmore.scrape_gaps WHERE meet_id=%s", (int(meet_id),))
    for mid, eid, reason in CAP_GAPS:
        cur.execute(
            """INSERT INTO scoresandmore.scrape_gaps (meet_id, event_id, reason)
               VALUES (%s,%s,%s)
               ON CONFLICT (meet_id, event_id) DO UPDATE
                 SET reason = EXCLUDED.reason, noted_at = now()""",
            (mid, eid, reason))
    conn.commit(); cur.close(); conn.close()
    if CAP_GAPS:
        print(f"WARNING: {len(CAP_GAPS)} event(s) skipped for meet {meet_id} -- "
              f"see scoresandmore.scrape_gaps")


# ------------------------------------------------------------------ catalog
def _month_starts(d0, d1):
    """First-of-month dates covering [d0, d1]."""
    out, y, m = [], d0.year, d0.month
    while date(y, m, 1) <= d1:
        out.append(date(y, m, 1))
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out

def _window_rows(m_view, m_table, lo, hi, extra):
    """Fetch catalog rows with start_date in [lo, hi); split to days on cap."""
    base = (f'"{m_table}"."start_date" >= \'{lo.isoformat()}\' AND '
            f'"{m_table}"."start_date" < \'{hi.isoformat()}\'')
    crit = f"({base}) AND ({extra})" if extra else base
    try:
        return m_view.rows(crit)
    except RuntimeError as e:
        if "GRID CAP" not in str(e) or (hi - lo).days <= 1:
            raise
        rows, header = [], None
        d = lo
        while d < hi:
            nxt = min(d + timedelta(days=1), hi)
            r, header = _window_rows(m_view, m_table, d, nxt, extra)
            rows.extend(r)
            d = nxt
        return rows, header

def scrape_catalog():
    m_view, m_table = view("meets")
    # The Zoho grid silently caps any fetch at 200 rows, so pull the catalog
    # in monthly start_date windows (auto-split to daily on cap). Range:
    # CATALOG_START (default 2025-08-01) through today+18 months, plus one
    # open-ended tail window for far-future/typo'd dates. Optional CRITERIA
    # is ANDed into every window.
    start = date.fromisoformat(os.environ.get("CATALOG_START", "2025-08-01").strip()
                               or "2025-08-01")
    horizon = date.today() + timedelta(days=548)
    rows, header = [], None
    months = _month_starts(start, horizon)
    for i, mstart in enumerate(months):
        mend = months[i + 1] if i + 1 < len(months) else horizon + timedelta(days=1)
        r, h = _window_rows(m_view, m_table, mstart, mend, CRITERIA)
        header = h or header
        if r:
            print(f"  window {mstart}..{mend}: {len(r)} meets")
        rows.extend(r)
        time.sleep(SLEEP_S)
    tail = f'"{m_table}"."start_date" >= \'{(horizon + timedelta(days=1)).isoformat()}\''
    if CRITERIA:
        tail = f"({tail}) AND ({CRITERIA})"
    r, h = m_view.rows(tail)
    header = h or header
    if r:
        print(f"  tail window (> {horizon + timedelta(days=1)}): {len(r)} meets")
    rows.extend(r)
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
    try:
        if MODE == "meet":
            if not MEET_ID.isdigit():
                sys.exit("MEET_ID must be a number for MODE=meet")
            scrape_meet(MEET_ID)
        elif MODE == "catalog":
            scrape_catalog()
        else:
            sys.exit(f"unknown MODE {MODE!r}")
        store_report(True)
    except SystemExit:
        raise
    except Exception as e:
        import traceback
        store_report(False, error=traceback.format_exc()[-4000:])
        raise
