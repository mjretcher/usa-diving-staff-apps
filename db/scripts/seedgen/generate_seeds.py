#!/usr/bin/env python3
"""
Regenerate db/seeds/criteria_phases.csv and db/seeds/criteria_dives.csv from
the DiveMeets crawl (divemeets.meets / events / results / sheet_dives).

Plan #2: the crawl becomes the seed generator, so the existing neon-seed
pipeline runs unchanged and every app picks up the new data through core.*
without new plumbing.

Rows whose meet_id is NOT a DiveMeets numeric id -- the WA-* World Aquatics
rows -- have no crawl source and are carried through from the current seed
verbatim. The generator never invents them and never drops them.

Every derivation used here is verified against the existing seed by the
verify_*.py scripts in this directory. Run them before trusting the output.

Usage:
  DATABASE_URL=... python3 generate_seeds.py --out db/seeds [--limit-meets N]
"""
import argparse, csv, os, sys, collections
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import classify, meetclass
from ncaa5cat import five_cat, dive_category, _num

import json, re, urllib.request


class Neon:
    """Neon HTTP /sql client. Used instead of the postgres wire protocol so the
    generator runs identically in CI and in a sandbox that only allows HTTPS.
    The POST URL must be the DIRECT compute host (no -pooler); the
    Neon-Connection-String header may be either."""

    def __init__(self, conn_str):
        self.conn = conn_str
        host = re.search(r"@([^/:]+)", conn_str).group(1).replace("-pooler", "")
        self.url = f"https://{host}/sql"

    def query(self, sql, params=()):
        body = json.dumps({"query": sql, "params": [None if p is None else str(p) for p in params]}).encode()
        req = urllib.request.Request(self.url, data=body, headers={
            "Neon-Connection-String": self.conn,
            "Neon-Raw-Text-Output": "true",
            "Neon-Array-Mode": "false",
            "Content-Type": "application/json",
        })
        with urllib.request.urlopen(req, timeout=300) as r:
            d = json.loads(r.read())
        if "rows" not in d:
            raise RuntimeError(f"Neon error: {d.get('message')}")
        return d["rows"]

    def query_keyset(self, select_sql, key="id", page=8000):
        """Read a large table in pages, keyed on a unique ascending column.

        Neon's HTTP SQL endpoint answers 507 Insufficient Storage when one
        response exceeds its size limit, and because this client runs in
        object mode every row repeats all of its column names. That is how the
        nightly core load began failing on 2026-08-04: a single unpaginated
        read of core.event_results (47,775 rows x 24 columns) went over the
        limit. It fails harder as the table grows, so it is paginated rather
        than merely made smaller.

        Keyset rather than OFFSET: OFFSET rescans from the top on every page
        and can skip or repeat rows if anything writes mid-read. select_sql
        must contain a WHERE clause ending in a position where 'AND ...' is
        valid, or none at all.
        """
        joiner = " AND " if re.search(r"\bWHERE\b", select_sql, re.I) else " WHERE "
        out, last = [], None
        while True:
            sql = select_sql
            if last is not None:
                sql += f"{joiner}{key} > {int(last)}"
            sql += f" ORDER BY {key} LIMIT {page}"
            chunk = self.query(sql)
            out.extend(chunk)
            if len(chunk) < page:
                return out
            last = chunk[-1][key]

PHASE_COLS = ["meet_id", "event_id", "result_set_id", "sheet_key", "diver_id", "diver_name",
              "team_name", "team_id", "nat", "place", "posted_score", "phase_score_from_dives",
              "phase_dive_count", "phase_dd_sum", "score_delta_posted_minus_phase",
              "score_is_cumulative", "score_analysis_mode", "meet_name", "meet_year",
              "competition_family", "competition_group", "ncaa_division", "gender",
              "discipline", "event_level", "age_group", "event_round", "round_stage",
              "is_synchronized", "source_system",
              "ncaa_women_springboard_raw_6_dive_score", "ncaa_women_springboard_5cat_score",
              "ncaa_women_springboard_5cat_dd_sum", "ncaa_women_springboard_repeated_category",
              "ncaa_women_springboard_dropped_dive_number",
              "ncaa_women_springboard_dropped_dive_score",
              "ncaa_women_springboard_adjustment_status",
              "ncaa_women_springboard_adjustment_note"]

DIVE_COLS = ["meet_id", "event_id", "result_set_id", "diver_id", "sheet_key", "dive_order",
             "dive_number", "height", "description", "dd", "score", "net_score", "round_place",
             "optional_voluntary", "judges_scores", "running_total_points", "diver_name",
             "team_name", "event_name", "gender", "discipline", "round_stage",
             "competition_family", "competition_group", "ncaa_division", "meet_year",
             "dive_category_code", "dive_category_label", "ncaa_5cat_inclusion_status",
             "ncaa_5cat_inclusion_note"]

TOL = Decimal("0.005")


def clean_place(v):
    """DiveMeets records exhibition entries as the literal string 'Exhibition'
    in the place column. core.result_phases.place is numeric, so a raw
    passthrough would fail the COPY. The seed stores these as blank, which also
    keeps them out of any place-based ranking."""
    v = "" if v is None else str(v).strip()
    return v if v.isdigit() else ""


def clean_team(v):
    """The old pipeline wrote 'Unattached' where DiveMeets carries no team."""
    v = (v or "").strip()
    return v or "Unattached"


def dec(v):
    if v is None or v == "":
        return None
    try:
        return Decimal(str(v))
    except Exception:
        return None


def load_seed(path):
    """Read the current seed so the generator can merge rather than replace."""
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def phase_key(r):
    return (r["meet_id"], r["event_id"], r["result_set_id"], r["sheet_key"], r["diver_id"])


def dive_sheet_key(r):
    return (r["meet_id"], r["event_id"], r["result_set_id"], r["sheet_key"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="db/seeds")
    ap.add_argument("--limit-meets", type=int, default=0)
    ap.add_argument("--only", default="", help="comma-separated meet ids, for differential testing")
    args = ap.parse_args()

    db = Neon(os.environ["DATABASE_URL"])

    meets = db.query("""SELECT meet_id, meet_name, sanction, start_date
                   FROM divemeets.meets
                   WHERE results_done AND meet_name IS NOT NULL AND start_date IS NOT NULL
                   ORDER BY start_date DESC, meet_id DESC""")
    if args.only:
        want = {x.strip() for x in args.only.split(",") if x.strip()}
        meets = [m for m in meets if str(m["meet_id"]) in want]
    if args.limit_meets:
        meets = meets[:args.limit_meets]
    print(f"meets to generate: {len(meets)}", flush=True)

    phase_rows, dive_rows = [], []

    for i, m in enumerate(meets, 1):
        mid = str(m["meet_id"])
        name = meetclass.normalize_name(m["meet_name"])
        sanc = m["sanction"] or ""
        fam = meetclass.competition_family(mid, name, sanc)
        grp = meetclass.competition_group(mid, name, sanc)
        div = meetclass.ncaa_division(mid, name, sanc)
        year = str(m["start_date"])[:4]

        titles = {(str(e["event_id"]), str(e["round"])): (e["title"] or "")
                  for e in db.query("SELECT event_id, round, title FROM divemeets.events WHERE meet_id=$1", (mid,))}

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
            gender = classify.gender(title)
            disc = classify.discipline(title)
            stage = classify.round_stage(rnd)
            lvl = classify.event_level(title, grp, name, fam)
            age = classify.age_group(title)
            sync = classify.is_synchronized(title)

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
                else:
                    delta = posted - p_from
                    if abs(delta) <= TOL:
                        cumul, mode = "false", "Posted score equals phase score"
                    else:
                        cumul, mode = "true", "Posted score differs from phase score"

            fc = five_cat(dives, fam, gender, disc)

            phase_rows.append([
                mid, eid, rnd, sk,
                "" if r["profile_id"] is None else str(r["profile_id"]),
                r["diver_name"] or "", clean_team(r["team_name"]),
                "" if r["team_id"] is None else str(r["team_id"]),
                "", clean_place(r["place"]),
                _num(posted), _num(p_from) if p_from is not None else "",
                p_cnt, _num(p_dd) if p_dd != "" else "",
                _num(delta) if delta != "" else "", cumul, mode,
                name, year, fam, grp, div, gender, disc, lvl, age, title, stage,
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
                        "included": "Included in derived NCAA 5-category score.",
                        }.get(incl, "")
                dive_rows.append([
                    mid, eid, rnd,
                    "" if d["profile_id"] is None else str(d["profile_id"]),
                    "" if d["sheet_key"] is None else str(d["sheet_key"]),
                    d["dive_order"], d["dive_number"] or "", d["height"] or "",
                    d["description"] or "", _num(dec(d["dd"])), _num(dec(d["score"])),
                    _num(dec(d["net_score"])),
                    "" if d["round_place"] is None else str(d["round_place"]),
                    d["opt_vol"] or "", "", "",
                    r["diver_name"] or "", clean_team(r["team_name"]), title,
                    gender, disc, stage, fam, grp, div, year, code, label, incl, note,
                ])

        if i % 100 == 0:
            print(f"  {i}/{len(meets)} meets  phases={len(phase_rows)} dives={len(dive_rows)}", flush=True)

    # ---------------------------------------------------------------- merge
    # NEVER REGRESS. The crawl has not finished dive sheets for every meet
    # (NCAA sheets in particular are still draining), while the old pipeline
    # already captured some of them. A wholesale replace would silently delete
    # those dive rows and downgrade the phase rows that depend on them, so
    # anywhere the crawl has no dive sheets and the seed does, the seed wins.
    os.makedirs(args.out, exist_ok=True)
    dive_path = os.path.join(args.out, "criteria_dives.csv")
    phase_path = os.path.join(args.out, "criteria_phases.csv")
    seed_dives = load_seed(dive_path)
    seed_phases = load_seed(phase_path)

    gen_dive_sheets = {dive_sheet_key(dict(zip(DIVE_COLS, r))) for r in dive_rows}
    gen_phase_keys = {phase_key(dict(zip(PHASE_COLS, r))) for r in phase_rows}
    seed_dive_sheets = {dive_sheet_key(r) for r in seed_dives}

    kept_dives = [[r.get(c, "") for c in DIVE_COLS] for r in seed_dives
                  if dive_sheet_key(r) not in gen_dive_sheets]
    rescued_sheets = {dive_sheet_key(r) for r in seed_dives
                      if dive_sheet_key(r) not in gen_dive_sheets and r["meet_id"].isdigit()}

    # A generated phase row whose dive sheet only exists in the seed must keep
    # the seed's phase arithmetic instead of the Result-only fallback.
    seed_phase_by_key = {phase_key(r): r for r in seed_phases}
    restored = 0
    for row in phase_rows:
        d = dict(zip(PHASE_COLS, row))
        if d["score_analysis_mode"] != "Result-only (archive scrape)":
            continue
        if (d["meet_id"], d["event_id"], d["result_set_id"], d["sheet_key"]) not in rescued_sheets:
            continue
        old = seed_phase_by_key.get(phase_key(d))
        if not old or old.get("score_analysis_mode") == "Result-only (archive scrape)":
            continue
        for c in ["phase_score_from_dives", "phase_dive_count", "phase_dd_sum",
                  "score_delta_posted_minus_phase", "score_is_cumulative",
                  "score_analysis_mode"] + [c for c in PHASE_COLS if c.startswith("ncaa_women")]:
            row[PHASE_COLS.index(c)] = old.get(c, "")
        restored += 1

    kept_phases = [[r.get(c, "") for c in PHASE_COLS] for r in seed_phases
                   if phase_key(r) not in gen_phase_keys]

    print(f"criteria_dives.csv:  {len(dive_rows)} generated + {len(kept_dives)} kept from seed "
          f"({len(rescued_sheets)} sheets the crawl has not reached yet)")
    print(f"criteria_phases.csv: {len(phase_rows)} generated + {len(kept_phases)} kept from seed; "
          f"{restored} phase rows restored from seed dive sheets")

    for path, cols, rows, kept in [(phase_path, PHASE_COLS, phase_rows, kept_phases),
                                   (dive_path, DIVE_COLS, dive_rows, kept_dives)]:
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
            w.writerow(cols)
            w.writerows(rows)
            w.writerows(kept)


if __name__ == "__main__":
    main()
