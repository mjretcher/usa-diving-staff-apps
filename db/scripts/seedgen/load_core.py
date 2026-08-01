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
import classify, meetclass
from ncaa5cat import five_cat, dive_category, _num
from generate_seeds import (PHASE_COLS, DIVE_COLS, Neon, dec, clean_place,
                            clean_team, phase_key, dive_sheet_key, TOL)

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
SEED_DIR = os.path.join(REPO, "db", "seeds")

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


def build(db, only=None, dive_sink=None):
    where = "WHERE results_done AND meet_name IS NOT NULL AND start_date IS NOT NULL"
    meets = db.query(f"""SELECT meet_id, meet_name, sanction, start_date
                         FROM divemeets.meets {where}
                         ORDER BY start_date DESC, meet_id DESC""")
    if only:
        meets = [m for m in meets if str(m["meet_id"]) in only]
    print(f"meets: {len(meets)}", flush=True)

    phase_rows = []
    dive_writer = csv.writer(dive_sink) if dive_sink else None
    dive_count = 0
    gen_sheets = set()
    for i, m in enumerate(meets, 1):
        mid = str(m["meet_id"])
        name = meetclass.normalize_name(m["meet_name"])
        sanc = m["sanction"] or ""
        fam = meetclass.competition_family(mid, name, sanc)
        grp = meetclass.competition_group(mid, name, sanc)
        div = meetclass.ncaa_division(mid, name, sanc)
        year = str(m["start_date"])[:4]

        titles = {(str(e["event_id"]), str(e["round"])): (e["title"] or "")
                  for e in db.query(
                      "SELECT event_id, round, title FROM divemeets.events WHERE meet_id=$1", (mid,))}
        results = db.query("""SELECT event_id, round, place, diver_name, profile_id, team_name,
                                     team_id, score, sheet_key
                              FROM divemeets.results WHERE meet_id=$1""", (mid,))
        sheets = collections.defaultdict(list)
        for d in db.query("""SELECT event_id, round, profile_id, sheet_key, dive_order, dive_number,
                                    height, description, net_score, dd, score, round_place, opt_vol
                             FROM divemeets.sheet_dives WHERE meet_id=$1
                             ORDER BY event_id, round, sheet_key, dive_order""", (mid,)):
            sheets[(str(d["event_id"]), str(d["round"]), str(d["sheet_key"]))].append(d)

        for r in results:
            eid, rnd = str(r["event_id"]), str(r["round"])
            title = titles.get((eid, rnd), "")
            sk = "" if r["sheet_key"] is None else str(r["sheet_key"])
            gender, disc = classify.gender(title), classify.discipline(title)
            stage = classify.round_stage(rnd)
            lvl = classify.event_level(title, grp, name, fam)
            age, sync = classify.age_group(title), classify.is_synchronized(title)

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
            for d in dv:
                code, label = dive_category(d["dive_number"])
                key = id(next((x for x in dives if x["dive_number"] == d["dive_number"]), None))
                incl = fc["inclusion"].get(key, "not_applicable") if fc["inclusion"] else "not_applicable"
                note = {"dropped": "Dropped from derived NCAA 5-category score because it is the "
                                   "lower-scoring dive of the repeated category.",
                        "included": "Included in derived NCAA 5-category score."}.get(incl, "")
                gen_sheets.add((mid, eid, rnd, "" if d["sheet_key"] is None else str(d["sheet_key"])))
                dive_count += 1
                dive_writer.writerow([
                    mid, eid, rnd,
                    "" if d["profile_id"] is None else str(d["profile_id"]),
                    "" if d["sheet_key"] is None else str(d["sheet_key"]),
                    d["dive_order"], d["dive_number"] or "", d["height"] or "",
                    d["description"] or "", _num(dec(d["dd"])), _num(dec(d["score"])),
                    _num(dec(d["net_score"])),
                    "" if d["round_place"] is None else str(d["round_place"]),
                    d["opt_vol"] or "", "", "", r["diver_name"] or "",
                    clean_team(r["team_name"]), title, gender, disc, stage,
                    fam, grp, div, year, code, label, incl, note,
                ])
        if i % 200 == 0:
            print(f"  {i}/{len(meets)} phases={len(phase_rows)} dives={dive_count}", flush=True)
    return phase_rows, dive_count, gen_sheets


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
    cur = conn.cursor()
    if truncate:
        cur.execute(f"TRUNCATE {table} RESTART IDENTITY")
    sql = f"COPY {table} ({','.join(cols)}) FROM STDIN WITH (FORMAT csv, NULL '')"
    if path:
        with open(path, "r", encoding="utf-8") as f:
            cur.copy_expert(sql, f)
    else:
        buf = io.StringIO()
        w = csv.writer(buf)
        for r in rows:
            w.writerow(["" if v is None else v for v in r])
        buf.seek(0)
        cur.copy_expert(sql, buf)
    conn.commit()
    cur.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    only = {x.strip() for x in args.only.split(",") if x.strip()} or None

    url = os.environ["DATABASE_URL"]
    dive_path = "/tmp/core_dives.csv"
    with open(dive_path, "w", newline="", encoding="utf-8") as sink:
        phase_rows, dive_count, gen_sheets = build(Neon(url), only, sink)
    phases, kept_dives = merge(phase_rows, gen_sheets)
    print(f"dives: {dive_count} crawl streamed to disk")

    if args.dry_run:
        print("dry run -- nothing written")
        return
    import psycopg2
    conn = psycopg2.connect(url)
    copy_into(conn, "core.result_phases", CORE_PHASE_COLS, rows=phases)
    copy_into(conn, "core.dive_sheets", CORE_DIVE_COLS, path=dive_path)
    copy_into(conn, "core.dive_sheets", CORE_DIVE_COLS, rows=kept_dives, truncate=False)
    cur = conn.cursor()
    for t in ("core.result_phases", "core.dive_sheets"):
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
