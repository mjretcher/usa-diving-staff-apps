#!/usr/bin/env python3
"""
Load core.result_phases and core.dive_sheets directly from the DiveMeets crawl.

WHY NOT CSV SEEDS
-----------------
Plan #2 was "the crawl generates db/seeds/*.csv". At full scale that produces a
425 MB criteria_dives.csv and a 121 MB criteria_phases.csv. GitHub rejects any
file over 100 MB, so the CSV-through-git transport cannot carry the crawl.

The round trip was never necessary anyway: the crawl data already lives in the
same Neon database as core.*. This loads it across directly, applying the
identical classification logic that generate_seeds.py uses and that the
verify_*.py scripts prove against the existing seed.

MERGE SEMANTICS -- NEVER REGRESS
--------------------------------
The crawl has not finished dive sheets everywhere. Meet 11522 has
sheets_done=false but 1,083 dive rows in the CSV seed. So:

  1. crawl-derived rows are loaded first
  2. any CSV seed row whose key the crawl did not produce is loaded after it
     -- this covers all WA-* World Aquatics rows and every legacy dive sheet
     the crawl has not reached
  3. a phase row that fell back to "Result-only" because the crawl lacks its
     dive sheet has its arithmetic restored from the seed row

The CSV seeds stay exactly as they are and are never rewritten. They are the
legacy + World Aquatics archive; the crawl supplies everything else.

Usage:
  DATABASE_URL=... python3 load_core.py [--dry-run] [--only 123,456]
"""
import argparse, csv, collections, io, os, sys
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import classify, meetclass, erclass
from ncaa5cat import five_cat, dive_category, _num
from generate_seeds import (PHASE_COLS, DIVE_COLS, Neon, dec, clean_place,
                            clean_team, phase_key, dive_sheet_key, TOL)

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
SEED_DIR = os.path.join(REPO, "db", "seeds")

# Columns declared NOT NULL in core.*. The crawl has 120 result rows with no
# sheet_key at all (a placement with no dive sheet). Writing those as SQL NULL
# fails the constraint, and would also defeat the unique index on
# (meet_id, event_id, result_set_id, diver_id, sheet_key), since NULLs never
# compare equal and so never deduplicate. They are written as empty strings.
# That means COPY cannot use the default CSV convention of "empty field means
# NULL", so an explicit \N marker is used instead.
NOT_NULL_TEXT = {"meet_id", "event_id", "result_set_id", "sheet_key", "diver_id"}
COPY_NULL = "\\N"


def fmt_row(cols, row):
    out = []
    for c, v in zip(cols, row):
        v = "" if v is None else str(v)
        out.append(v if (v != "" or c in NOT_NULL_TEXT) else COPY_NULL)
    return out


ER_COLS = ["meet_id_dm", "diver_id_dm", "team_id_dm", "meet_name", "event_name", "round",
           "diver_first", "diver_last", "team_name", "team_code", "place", "score", "year",
           "stage", "event_level", "age_group", "gender", "discipline", "event_key",
           "is_synchro", "is_junior_circuit", "region", "zone", "ewc_meet", "source_file"]

# core.event_results has no natural unique key -- 11 duplicate groups already
# exist on (meet, diver, event_name, round) -- so the merge keeps existing rows
# by that key rather than by meet. Merging at meet granularity would drop the
# 631 rows the crawl has no counterpart for, most of them Camp, Winter-Nationals
# and Senior-Nationals results the old pipeline captured and DiveMeets no longer
# serves.
ER_KEY = ("meet_id_dm", "diver_id_dm", "event_name", "round")


def er_key(get):
    """Merge key with event_name whitespace collapsed. 1,320 legacy rows carry
    a doubled space ("1m  J.O") that the crawl does not; comparing them raw
    made every one of those rows look absent from the crawl, so it would have
    been kept alongside its regenerated twin -- 1,320 duplicates."""
    return (str(get("meet_id_dm") or ""), str(get("diver_id_dm") or ""),
            " ".join(str(get("event_name") or "").split()),
            str(get("round") or ""))

# The table currently starts at 2021. The crawl reaches back to 2013, which
# would silently widen every report that does not filter by year, so history
# before this is opt-in via --er-from-year.
ER_DEFAULT_FROM_YEAR = 2021


# core.* column order, which differs from the CSV column order.
CORE_PHASE_COLS = PHASE_COLS
CORE_DIVE_COLS = DIVE_COLS


def record(url, key, payload):
    """Persist status/errors to app_meta.config -- the sandbox cannot read
    GitHub Actions logs, so this is how a failed run reports what happened."""
    try:
        import psycopg2
        c = psycopg2.connect(url)
        cur = c.cursor()
        cur.execute("""INSERT INTO app_meta.config (key, value) VALUES (%s, %s)
                       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""",
                    (key, payload[:60000]))
        c.commit(); cur.close(); c.close()
    except Exception as e:
        print(f"could not record {key}: {e}", flush=True)


def build(db, only=None, dive_sink=None, limit=0):
    where = "WHERE results_done AND meet_name IS NOT NULL AND start_date IS NOT NULL"
    meets = db.query(f"""SELECT meet_id, meet_name, sanction, start_date
                         FROM divemeets.meets {where}
                         ORDER BY start_date DESC, meet_id DESC""")
    if only:
        meets = [m for m in meets if str(m["meet_id"]) in only]
    if limit:
        meets = meets[:limit]
    print(f"meets: {len(meets)}", flush=True)

    tags = {str(t["meet_id"]): t["tag"]
            for t in db.query("SELECT meet_id, tag FROM divemeets.crawl_targets")}

    # Fetch in batches of meets rather than one meet at a time. Per-meet
    # fetching meant ~6,100 sequential HTTP round trips and a 55 minute run,
    # which matters because Neon compute is billed on wake time, not work done.
    BATCH = 60
    batches = [meets[i:i + BATCH] for i in range(0, len(meets), BATCH)]

    phase_rows = []
    dive_writer = csv.writer(dive_sink) if dive_sink else None
    dive_count = 0
    gen_sheets = set()
    i = 0
    for bn, batch in enumerate(batches, 1):
        ids = ",".join("'" + str(m["meet_id"]) + "'" for m in batch)
        ev_all, res_all, sd_all = {}, {}, {}
        for e in db.query(f"SELECT meet_id, event_id, round, title FROM divemeets.events "
                          f"WHERE meet_id IN ({ids})"):
            ev_all.setdefault(str(e["meet_id"]), {})[(str(e["event_id"]), str(e["round"]))] = e["title"] or ""
        for r in db.query(f"""SELECT meet_id, event_id, round, place, diver_name, profile_id,
                                     team_name, team_id, score, sheet_key
                              FROM divemeets.results WHERE meet_id IN ({ids})"""):
            res_all.setdefault(str(r["meet_id"]), []).append(r)
        for d in db.query(f"""SELECT meet_id, event_id, round, profile_id, sheet_key, dive_order,
                                     dive_number, height, description, net_score, dd, score,
                                     round_place, opt_vol
                              FROM divemeets.sheet_dives WHERE meet_id IN ({ids})
                              ORDER BY meet_id, event_id, round, sheet_key, dive_order"""):
            sd_all.setdefault(str(d["meet_id"]), collections.defaultdict(list))[
                (str(d["event_id"]), str(d["round"]), str(d["sheet_key"]))].append(d)

        for m in batch:
            i += 1
            mid = str(m["meet_id"])
            name = meetclass.normalize_name(m["meet_name"])
            sanc = m["sanction"] or ""
            fam = meetclass.competition_family(mid, name, sanc)
            grp = meetclass.competition_group(mid, name, sanc)
            div = meetclass.ncaa_division(mid, name, sanc, tags.get(mid))
            year = str(m["start_date"])[:4]

            titles = ev_all.get(mid, {})
            results = res_all.get(mid, [])
            sheets = sd_all.get(mid, {})

            # A sheet_key can be shared by two result rows (synchro partners), so
            # keep one representative row per sheet for the dive-row loop below.
            res_by_sheet = {}
            for r in results:
                eid, rnd = str(r["event_id"]), str(r["round"])
                title = titles.get((eid, rnd), "")
                sk = "" if r["sheet_key"] is None else str(r["sheet_key"])
                gender, disc = classify.gender(title), classify.discipline(title)
                stage = classify.round_stage(rnd)
                lvl = classify.event_level(title, grp, name, fam)
                age, sync = classify.age_group(title), classify.is_synchronized(title)

                res_by_sheet.setdefault((eid, rnd, sk), r)
                dv = sheets.get((eid, rnd, sk), [])
                dives = [dict(dive_number=d["dive_number"], dd=dec(d["dd"]), score=dec(d["score"]))
                         for d in dv]
                posted = dec(r["score"])
                if not dives:
                    p_from, p_cnt, p_dd = posted, "", ""
                    delta, cumul, mode = Decimal(0), "false", "Result-only (archive scrape)"
                else:
                    p_cnt = len(dives)
                    p_dd = sum((d["dd"] for d in dives if d["dd"] is not None), Decimal(0))
                    p_from = sum((d["score"] for d in dives if d["score"] is not None), Decimal(0))
                    if posted is None:
                        delta, cumul, mode = "", "", "Phase score from dives only"
                    elif abs(posted - p_from) <= TOL:
                        delta, cumul, mode = posted - p_from, "false", "Posted score equals phase score"
                    else:
                        delta, cumul, mode = posted - p_from, "true", "Posted score differs from phase score"

                fc = five_cat(dives, fam, gender, disc)
                phase_rows.append([
                    mid, eid, rnd, sk,
                    "" if r["profile_id"] is None else str(r["profile_id"]),
                    r["diver_name"] or "", clean_team(r["team_name"]),
                    "" if r["team_id"] is None else str(r["team_id"]),
                    "", clean_place(r["place"]), _num(posted),
                    _num(p_from) if p_from is not None else "", p_cnt,
                    _num(p_dd) if p_dd != "" else "", _num(delta) if delta != "" else "",
                    cumul, mode, name, year, fam, grp, div, gender, disc, lvl, age, title, stage,
                    "true" if sync else "false", "divemeets_crawl",
                    _num(fc["raw6"]) if fc["raw6"] != "" else "",
                    _num(fc["score"]) if fc["score"] != "" else "",
                    _num(fc["dd_sum"]) if fc["dd_sum"] != "" else "",
                    fc["repeated"], fc["dropped_number"],
                    _num(fc["dropped_score"]) if fc["dropped_score"] not in ("", None) else "",
                    fc["status"], fc["note"],
                ])
            # Dive rows are emitted per SHEET, not per result row. Synchro partners
            # share one sheet_key -- 27 such sheets across the crawl -- so emitting
            # inside the results loop wrote every dive twice and violated
            # idx_ds_natural on (meet_id, event_id, result_set_id, diver_id,
            # sheet_key, dive_order).
            for (s_eid, s_rnd, s_sk), dv in sheets.items():
                rr = res_by_sheet.get((s_eid, s_rnd, s_sk))
                s_title = titles.get((s_eid, s_rnd), "")
                s_gender, s_disc = classify.gender(s_title), classify.discipline(s_title)
                s_stage = classify.round_stage(s_rnd)
                s_dives = [dict(dive_number=d["dive_number"], dd=dec(d["dd"]), score=dec(d["score"]))
                           for d in dv]
                s_fc = five_cat(s_dives, fam, s_gender, s_disc)
                for d in dv:
                    code, label = dive_category(d["dive_number"])
                    key = id(next((x for x in s_dives if x["dive_number"] == d["dive_number"]), None))
                    incl = s_fc["inclusion"].get(key, "not_applicable") if s_fc["inclusion"] else "not_applicable"
                    note = {"dropped": "Dropped from derived NCAA 5-category score because it is the "
                                       "lower-scoring dive of the repeated category.",
                            "included": "Included in derived NCAA 5-category score."}.get(incl, "")
                    gen_sheets.add((mid, s_eid, s_rnd, "" if d["sheet_key"] is None else str(d["sheet_key"])))
                    dive_count += 1
                    dive_writer.writerow(fmt_row(DIVE_COLS, [
                        mid, s_eid, s_rnd,
                        "" if d["profile_id"] is None else str(d["profile_id"]),
                        "" if d["sheet_key"] is None else str(d["sheet_key"]),
                        d["dive_order"], d["dive_number"] or "", d["height"] or "",
                        d["description"] or "", _num(dec(d["dd"])), _num(dec(d["score"])),
                        _num(dec(d["net_score"])),
                        "" if d["round_place"] is None else str(d["round_place"]),
                        d["opt_vol"] or "", "", "",
                        (rr["diver_name"] if rr else "") or "",
                        clean_team(rr["team_name"] if rr else ""), s_title,
                        s_gender, s_disc, s_stage, fam, grp, div, year, code, label, incl, note,
                    ]))

        print(f"  batch {bn}/{len(batches)}  meets={i}/{len(meets)} "
              f"phases={len(phase_rows)} dives={dive_count}", flush=True)
    return phase_rows, dive_count, gen_sheets


def split_name(full):
    """DiveMeets stores one name field. Verified against 105,394 joined rows:
    the legacy split is on the FIRST space. Stored values carry stray trailing
    spaces on 662 rows; these are stripped."""
    parts = (full or "").strip().split(" ", 1)
    return parts[0].strip(), (parts[1].strip() if len(parts) > 1 else "")


def build_event_results(db, from_year, team_codes, only=None):
    """Regenerate core.event_results rows from the crawl for every meet whose
    name maps to a recognised stage."""
    meets = db.query("""SELECT meet_id, meet_name, sanction, start_date
                        FROM divemeets.meets
                        WHERE results_done AND meet_name IS NOT NULL AND start_date IS NOT NULL
                        ORDER BY start_date DESC, meet_id DESC""")
    picked = []
    for m in meets:
        mid = str(m["meet_id"])
        if only and mid not in only:
            continue
        if int(str(m["start_date"])[:4]) < from_year:
            continue
        st = erclass.stage(m["meet_name"])
        if st:
            picked.append((m, st))
    print(f"event_results: {len(picked)} meets with a recognised stage "
          f"from {from_year}", flush=True)

    rows = []
    BATCH = 60
    for i in range(0, len(picked), BATCH):
        chunk = picked[i:i + BATCH]
        ids = ",".join("'" + str(m["meet_id"]) + "'" for m, _ in chunk)
        titles, results = {}, {}
        for e in db.query(f"SELECT meet_id, event_id, round, title FROM divemeets.events "
                          f"WHERE meet_id IN ({ids})"):
            titles.setdefault(str(e["meet_id"]), {})[(str(e["event_id"]), str(e["round"]))] = e["title"] or ""
        for r in db.query(f"""SELECT meet_id, event_id, round, place, diver_name, profile_id,
                                     team_name, team_id, score
                              FROM divemeets.results WHERE meet_id IN ({ids})"""):
            results.setdefault(str(r["meet_id"]), []).append(r)

        for m, st in chunk:
            mid = str(m["meet_id"])
            mname = meetclass.normalize_name(m["meet_name"])
            year = str(m["start_date"])[:4]
            lvl = erclass.event_level(st)
            reg, zn, ewc = erclass.region(mname), erclass.zone(mname), erclass.ewc_meet(mname)
            jc = erclass.is_junior_circuit(st)
            for r in results.get(mid, []):
                title = titles.get(mid, {}).get((str(r["event_id"]), str(r["round"])), "")
                nm = erclass.event_name(title)
                if not nm:
                    continue
                ag = erclass.age_group(nm, st)
                gd = erclass.gender(nm)
                di = erclass.discipline(nm)
                first, last = split_name(r["diver_name"])
                tid = "" if r["team_id"] is None else str(r["team_id"])
                rows.append([
                    mid, "" if r["profile_id"] is None else str(r["profile_id"]), tid,
                    mname, nm, erclass.round_label(r["round"], title),
                    first, last, r["team_name"] or "", team_codes.get(tid, ""),
                    clean_place(r["place"]), _num(dec(r["score"])), year,
                    st, lvl, ag or "", gd or "", di or "",
                    erclass.event_key(ag, gd, di) or "",
                    "true" if erclass.is_synchro(nm) else "false",
                    "true" if jc else "false",
                    "" if reg is None else str(reg), zn or "", ewc or "",
                    "divemeets_crawl",
                ])
    return rows


def load_seed_csv(name):
    p = os.path.join(SEED_DIR, name)
    if not os.path.exists(p):
        return []
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def merge(phase_rows, gen_sheets):
    seed_phases, seed_dives = load_seed_csv("criteria_phases.csv"), load_seed_csv("criteria_dives.csv")
    gen_pkeys = {phase_key(dict(zip(PHASE_COLS, r))) for r in phase_rows}

    kept_dives = [[r.get(c, "") for c in DIVE_COLS] for r in seed_dives
                  if dive_sheet_key(r) not in gen_sheets]
    rescued = {dive_sheet_key(r) for r in seed_dives if dive_sheet_key(r) not in gen_sheets}
    seed_by_key = {phase_key(r): r for r in seed_phases}

    restored = 0
    for row in phase_rows:
        d = dict(zip(PHASE_COLS, row))
        if d["score_analysis_mode"] != "Result-only (archive scrape)":
            continue
        if (d["meet_id"], d["event_id"], d["result_set_id"], d["sheet_key"]) not in rescued:
            continue
        old = seed_by_key.get(phase_key(d))
        if not old or old.get("score_analysis_mode") == "Result-only (archive scrape)":
            continue
        for c in (["phase_score_from_dives", "phase_dive_count", "phase_dd_sum",
                   "score_delta_posted_minus_phase", "score_is_cumulative", "score_analysis_mode"]
                  + [c for c in PHASE_COLS if c.startswith("ncaa_women")]):
            row[PHASE_COLS.index(c)] = old.get(c, "")
        restored += 1

    kept_phases = [[r.get(c, "") for c in PHASE_COLS] for r in seed_phases
                   if phase_key(r) not in gen_pkeys]
    print(f"phases: {len(phase_rows)} crawl + {len(kept_phases)} kept ({restored} restored)")
    print(f"dives:  kept {len(kept_dives)} from seed "
          f"({len(rescued)} sheets the crawl has not reached)")
    return phase_rows + kept_phases, kept_dives


def copy_into(conn, table, cols, rows=None, path=None, truncate=True):
    """Does NOT commit -- main() commits once after both tables are written."""
    cur = conn.cursor()
    if truncate:
        cur.execute(f"TRUNCATE {table} RESTART IDENTITY")
    sql = (f"COPY {table} ({','.join(cols)}) FROM STDIN "
           f"WITH (FORMAT csv, NULL '{COPY_NULL}')")
    if path:
        with open(path, "r", encoding="utf-8") as f:
            cur.copy_expert(sql, f)
    else:
        buf = io.StringIO()
        w = csv.writer(buf)
        for r in rows:
            w.writerow(fmt_row(cols, r))
        buf.seek(0)
        cur.copy_expert(sql, buf)
    cur.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default="")
    ap.add_argument("--limit-meets", type=int, default=0)
    ap.add_argument("--er-from-year", type=int, default=ER_DEFAULT_FROM_YEAR,
                    help="earliest year to regenerate into core.event_results")
    ap.add_argument("--skip-event-results", action="store_true")
    args = ap.parse_args()
    only = {x.strip() for x in args.only.split(",") if x.strip()} or None

    url = os.environ["DATABASE_URL"]
    dive_path = "/tmp/core_dives.csv"
    with open(dive_path, "w", newline="", encoding="utf-8") as sink:
        phase_rows, dive_count, gen_sheets = build(Neon(url), only, sink, args.limit_meets)
    phases, kept_dives = merge(phase_rows, gen_sheets)
    print(f"dives: {dive_count} crawl streamed to disk")

    # ---- core.event_results ------------------------------------------------
    er_rows, er_all = [], []
    if not args.skip_event_results:
        dbq = Neon(url)
        existing = dbq.query("""SELECT meet_id_dm, diver_id_dm, team_id_dm, meet_name,
                                       event_name, round, diver_first, diver_last, team_name,
                                       team_code, place, score, year, stage, event_level,
                                       age_group, gender, discipline, event_key, is_synchro,
                                       is_junior_circuit, region, zone, ewc_meet, source_file
                                FROM core.event_results""")
        # DiveMeets' own team abbreviation is not derivable from the team name
        # (Triad Diving Academy -> TRIA but Atlantic Coast Diving Jax -> ACDJ),
        # and the crawl does not carry it, so it is preserved by lookup and left
        # blank for teams first seen in the crawl.
        team_codes = {}
        for r in existing:
            if r["team_id_dm"] and r["team_code"]:
                team_codes.setdefault(str(r["team_id_dm"]), r["team_code"])
        er_rows = build_event_results(dbq, args.er_from_year, team_codes, only)
        gen_keys = {er_key(lambda c, r=r: r[ER_COLS.index(c)]) for r in er_rows}
        kept = [[("" if r[c] is None else str(r[c])) for c in ER_COLS] for r in existing
                if er_key(lambda c, r=r: r[c]) not in gen_keys]
        er_all = er_rows + kept
        # This table legitimately contains a few duplicate natural keys (11
        # groups today), so duplicates are reported rather than rejected -- but
        # a jump here means the merge key stopped matching and rows are being
        # kept alongside their regenerated twins.
        dup = collections.Counter(er_key(lambda c, r=r: r[ER_COLS.index(c)]) for r in er_all)
        ndup = sum(v - 1 for v in dup.values() if v > 1)
        print(f"event_results: {len(er_rows)} crawl + {len(kept)} kept "
              f"of {len(existing)} existing; duplicate natural keys: {ndup}")

    if args.dry_run:
        print("dry run -- nothing written")
        return
    import psycopg2
    conn = psycopg2.connect(url)
    copy_into(conn, "core.result_phases", CORE_PHASE_COLS, rows=phases)
    copy_into(conn, "core.dive_sheets", CORE_DIVE_COLS, path=dive_path)
    copy_into(conn, "core.dive_sheets", CORE_DIVE_COLS, rows=kept_dives, truncate=False)
    if er_all:
        copy_into(conn, "core.event_results", ER_COLS, rows=er_all)
    # One commit for both tables: a failure on dives can no longer leave core
    # with new phases and stale dive sheets, which is what run 3 produced.
    conn.commit()
    cur = conn.cursor()
    for t in ("core.result_phases", "core.dive_sheets", "core.event_results"):
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"{t}: {cur.fetchone()[0]} rows")
    # The analytics rebuild drops and recreates its tables, taking their ACLs
    # with them, so the browser role has to be re-granted. Same guard as
    # build_analytics.py.
    cur.execute("""DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='usad_app') THEN
        GRANT USAGE ON SCHEMA core TO usad_app;
        GRANT SELECT ON ALL TABLES IN SCHEMA core TO usad_app;
      END IF; END $$""")
    conn.commit()
    conn.close()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback
        tb = traceback.format_exc()
        print(tb, flush=True)
        record(os.environ.get("DATABASE_URL", ""), "core_load_last_error", tb)
        raise
