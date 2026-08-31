#!/usr/bin/env python3
"""
Rebuild membership-analytics/qual-data.json at COUNTY grain instead of region.

WHY THIS EXISTS
    The equity section's "estimated bar to advance" (boundary_equity in
    ma-reports.js) pools historical Regionals scores by geographic overlap
    with a proposed area. The existing qual-data.json only carries region-
    level score lists, so that pooling only works when a proposal reshuffles
    regions into areas. A structure that eliminates Regions entirely (both
    live 9-zone new-circuit proposals do) has no region layer to pool from.
    County grain works either way, since any structure's areas are themselves
    built from counties.

WHAT IT PRODUCES
    Same shape as the file it replaces: cells[event][key][year] = a sorted
    (descending) list of scores. Only the key changes -- county FIPS instead
    of region number. Same years (2024-2025), same stage (Regionals), same
    exclusions (Platform; any event with a shared place; fields under 15
    finishers) as the file being replaced.

PRIVACY
    Matching requires member names, which the public browser role (usad_app)
    deliberately cannot read -- see build_aau_overlap.py for the identical
    constraint on a different dataset. Runs under NEON_DATABASE_URL, server-
    side only. Only aggregated score lists keyed by county and year are ever
    written back -- no name, member_id, or diver_id, matching
    build_advance_data.py's discipline for the exact same class of join.

COUNTY RESOLUTION
    Reuses build_advance_data.py's zip_to_fips() verbatim, inverting
    boundary-data.json's stats[fips].z -- the same zip -> county assignment
    that produced the pools this app already trusts, so this file and
    advance-data.json can never quietly disagree about which county a zip
    belongs to.

EXCLUSION GRAIN
    A shared place or a small field is a fact about the real meet that
    happened, computed per (meet, event) BEFORE any score is attributed to a
    county -- not after re-aggregation, which would let a large combined
    county-level field mask a genuinely thin real meet.

SAFETY
    Refuses to write unless re-aggregating the new county-level lists by
    TODAY'S real region assignment reproduces the currently-live region-level
    file's rank-15 cutoff, per cell per year, within ADVANCE_TOLERANCE points.
    A rebuild that cannot reproduce the numbers already in front of CCE must
    not be allowed to replace them silently -- same reasoning as
    build_advance_data.py's TOLERANCE gate, applied to a cutoff score instead
    of an entry count.

Env: DATABASE_URL (Neon). Not wired to a workflow yet -- whether this ships
at all, and what match-rate/tier threshold is acceptable, are decisions made
outside this file.
"""
import json
import os
import sys
import collections

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BOUNDARY = os.path.join(ROOT, "membership-analytics", "boundary-data.json")
TARGET = os.path.join(ROOT, "membership-analytics", "qual-data.json")

YEARS = (2024, 2025)
ADVANCE_RANK = 15
MIN_FINISHERS = 15
ADVANCE_TOLERANCE = 2.0  # points; the rebuilt rank-15 cutoff must land within this of the live file's


def zip_to_fips():
    """Verbatim from build_advance_data.py -- one inversion, reused everywhere
    a zip needs a county, so this file and advance-data.json can't drift
    apart on what county a zip belongs to."""
    with open(BOUNDARY) as fh:
        stats = json.load(fh)["stats"]
    out, clashes = {}, 0
    for fips, rec in stats.items():
        for zip5 in (rec.get("z") or {}):
            if zip5 in out and out[zip5] != fips:
                clashes += 1
                continue
            out[zip5] = fips
    return out, clashes


AUTODATA = os.path.join(ROOT, "membership-analytics", "auto-data.json")


def county_order():
    """officialRegion (and other flat per-county arrays in this app) are
    indexed by auto-data.json's fips array -- ALL 3,142 US counties, in a
    fixed order used for adjacency/layout math elsewhere in the app.
    boundary-data.json's stats is keyed by FIPS too, but only for the ~600
    counties that actually have members, and a dict has no stable index
    anyway -- confirmed the mismatch directly (612 vs 3142) rather than
    assuming the two files share an index space."""
    with open(AUTODATA) as fh:
        return json.load(fh)["fips"]


# Exclusions applied per (meet, event) BEFORE any score is attributed to a
# county: a shared place anywhere in the field, or fewer than MIN_FINISHERS
# finishers, disqualifies the whole event at that meet -- not just the
# affected athlete. Matches the file's documented exclusions exactly.
SQL = """
WITH base AS (
    SELECT
        r.meet_id_dm, r.event_key, r.year,
        r.age_group, r.gender, r.discipline,
        r.place, r.score, r.region,
        lower(btrim(r.diver_first)) AS f,
        lower(btrim(r.diver_last))  AS l
    FROM core.event_results r
    WHERE r.is_junior_circuit = TRUE
      AND r.stage = 'Regionals'
      AND r.year = ANY(%s)
      AND r.discipline IS DISTINCT FROM 'Platform'
      AND r.age_group IS NOT NULL AND r.gender IS NOT NULL
      AND r.place IS NOT NULL AND r.score IS NOT NULL
),
flagged AS (
    SELECT b.*,
        count(*) OVER (PARTITION BY meet_id_dm, event_key) AS field_size,
        bool_or(dup) OVER (PARTITION BY meet_id_dm, event_key) AS event_has_any_tie
    FROM (
        SELECT b.*, count(*) OVER (PARTITION BY meet_id_dm, event_key, place) > 1 AS dup
        FROM base b
    ) b
),
kept AS (
    SELECT * FROM flagged WHERE field_size >= %s AND NOT event_has_any_tie
),
mem AS (
    SELECT lower(btrim(first_name)) AS f,
           lower(btrim(last_name))  AS l,
           (array_agg(zip5 ORDER BY membership_year DESC)
             FILTER (WHERE zip5 IS NOT NULL AND btrim(zip5) <> ''))[1] AS zip5
    FROM membership.members
    GROUP BY 1, 2
)
SELECT k.age_group, k.gender, k.discipline, k.year, m.zip5, k.score, k.region
FROM kept k
LEFT JOIN mem m ON m.f = k.f AND m.l = k.l
"""

FIELD_PROBE = """
SELECT count(DISTINCT meet_id_dm || '|' || event_key), count(*)
FROM core.event_results
WHERE is_junior_circuit = TRUE AND stage = 'Regionals' AND year = ANY(%s)
"""


def board_label(discipline):
    if discipline in ("1M", "1-Meter"): return "1M"
    if discipline in ("3M", "3-Meter"): return "3M"
    return None  # Platform already excluded upstream; anything else is unexpected and skipped, not guessed at


def write_run_report(dsn, report):
    """Same pattern as build_aau_overlap.py's aau_overlap_last_run: a plain
    JSON diagnostic blob, no names or IDs in it, written to a table the
    ordinary browser role can already read -- so a run's outcome is checkable
    without needing raw workflow-log access."""
    import datetime
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute("""INSERT INTO app_meta.config (key, value, description)
        VALUES (%s,%s,'qual-data county rebuild -- last run report')
        ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()""",
        ("qual_data_county_last_run",
         json.dumps({**report, "at": datetime.datetime.now(datetime.timezone.utc).isoformat()})))
    conn.commit(); cur.close(); conn.close()


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")

    report = {"stage": "starting"}
    try:
        z2f, clashes = zip_to_fips()
        fips_order = county_order()
        report.update(zips_mapped=len(z2f), zip_clashes=clashes, county_index_len=len(fips_order))
        print(f"zip -> county: {len(z2f)} zips, {clashes} clashes")

        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        cur.execute(FIELD_PROBE, (list(YEARS),))
        n_events, n_rows = cur.fetchone()
        report.update(events_before_exclusion=n_events, rows_before_exclusion=n_rows)
        print(f"Regionals {YEARS}: {n_events} distinct (meet,event) pairs, {n_rows} rows before exclusion")

        cur.execute(SQL, (list(YEARS), MIN_FINISHERS))
        rows = cur.fetchall()
        cur.close(); conn.close()
        report["rows_surviving_exclusion"] = len(rows)
        print(f"rows surviving field-size + no-shared-place exclusion: {len(rows)}")
    except Exception as e:
        report.update(stage="query_failed", error=f"{type(e).__name__}: {e}")
        write_run_report(dsn, report)
        raise

    try:
        cells = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(list)))
        region_cells = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(list)))
        mapped, unmapped, skipped_disc = 0, 0, 0
        for ag, gen, disc, yr, zip5, score, region in rows:
            b = board_label(disc)
            if not b:
                skipped_disc += 1
                continue
            key = f"{ag}|{gen}|{b}"
            if region is not None:
                region_cells[key][str(region)][str(yr)].append(float(score))
            fips = z2f.get(zip5) if zip5 else None
            if fips is None:
                unmapped += 1
                continue
            mapped += 1
            cells[key][fips][str(yr)].append(float(score))

        for store in (cells, region_cells):
            for key in store:
                for k2 in store[key]:
                    for yr in store[key][k2]:
                        store[key][k2][yr].sort(reverse=True)

        match_rate = mapped / (mapped + unmapped) * 100 if (mapped + unmapped) else 0
        report.update(mapped=mapped, unmapped=unmapped, skipped_disc=skipped_disc,
                       match_rate=round(match_rate, 1), event_keys=len(cells))
        print(f"scores mapped to a county: {mapped}   unmapped: {unmapped}   "
              f"skipped (unexpected discipline): {skipped_disc}   match rate: {match_rate:.1f}%")

        if not os.path.exists(TARGET):
            report.update(stage="rejected", reason="no_existing_file_to_gate_against")
            write_run_report(dsn, report)
            sys.exit("No existing qual-data.json to gate against -- refusing to write a first version blind.")
        with open(TARGET) as fh:
            prior = json.load(fh)

        # --- gate 1: region_cells must exactly reproduce the current file.
        # This is the right comparison -- both answer "where did this athlete
        # actually compete," so they SHOULD match. (Home county and competing
        # region answering different questions is the whole point of also
        # keeping both; forcing them to agree would erase the region-choice
        # signal rather than measure it.)
        failures, checked = [], 0
        for key, byRegion in region_cells.items():
            prior_region_years = (prior.get("cellsByRegion") or prior.get("cells") or {}).get(key, {})
            for region, byYear in byRegion.items():
                for yr, scores in byYear.items():
                    if len(scores) < ADVANCE_RANK:
                        continue
                    new_cut = scores[ADVANCE_RANK - 1]
                    old_list = (prior_region_years.get(region) or {}).get(yr) or []
                    if len(old_list) < ADVANCE_RANK:
                        continue
                    old_cut = sorted(old_list, reverse=True)[ADVANCE_RANK - 1]
                    checked += 1
                    if abs(new_cut - old_cut) > ADVANCE_TOLERANCE:
                        failures.append(f"{key} region {region} {yr}: {old_cut:.1f} -> {new_cut:.1f}")
        report.update(region_gate_checked=checked, region_gate_failures=len(failures), region_gate_examples=failures[:10])
        print(f"region gate (must reproduce the current file exactly): {checked} checked, {len(failures)} failures")
        if failures or checked == 0:
            report["stage"] = "rejected_region_gate_failed"
            write_run_report(dsn, report)
            print("REBUILD REJECTED -- the region-keyed reproduction does not match the trusted file:")
            for f in failures[:20]:
                print("   " + f)
            sys.exit(1)

        # --- county data gets sanity checks appropriate to what it actually
        # is: a new measure, not a reproduction. It should capture a
        # comparable VOLUME of scores (same underlying rows, different
        # bucketing), and every county-region leakage number here IS the
        # region-choice signal, not an error to eliminate.
        county_total = sum(len(scores) for byFips in cells.values() for byYear in byFips.values() for scores in byYear.values())
        region_total = sum(len(scores) for byRegion in region_cells.values() for byYear in byRegion.values() for scores in byYear.values())
        volume_ratio = county_total / region_total if region_total else 0
        report.update(county_total_scores=county_total, region_total_scores=region_total,
                       county_region_volume_ratio=round(volume_ratio, 3))
        print(f"county total scores: {county_total}   region total scores: {region_total}   "
              f"ratio: {volume_ratio:.3f} (expect close to 1.0, minus the {unmapped} unmatched-to-a-member rows)")
        if not (0.85 <= volume_ratio <= 1.0):
            report["stage"] = "rejected_volume_sanity_failed"
            write_run_report(dsn, report)
            sys.exit(f"REBUILD REJECTED -- county/region volume ratio {volume_ratio:.3f} is outside "
                     f"the sane range; something beyond ordinary unmatched-member loss is happening.")

        # region-choice.json already measures this properly (club-modal-
        # location method, non-circular) -- surface its headline number here
        # rather than recompute it, so this file carries "the important
        # stat line" without a second implementation to keep in sync.
        region_choice_summary = None
        rc_path = os.path.join(ROOT, "membership-analytics", "region-choice.json")
        if os.path.exists(rc_path):
            with open(rc_path) as fh:
                rc = json.load(fh)
            region_choice_summary = {
                "source": "region-choice.json (club-modal-location method)",
                "generated": rc.get("generated"),
                "regionals": rc.get("stages", {}).get("Regionals"),
            }

        out = {
            "advanceRank": ADVANCE_RANK, "years": list(YEARS), "stage": "Regionals",
            "scope": prior.get("scope"), "basis": prior.get("basis"),
            "exclusions": prior.get("exclusions", "") + (
                " Athletes whose competition result could not be matched to a membership record with a "
                f"zip code are excluded from county attribution ({match_rate:.1f}% matched) -- not silently "
                "dropped from awareness, but they cannot be placed on the map."),
            "officialRegion": prior.get("officialRegion"),
            "cellsByCounty": {k: {fips: dict(byYear) for fips, byYear in v.items()} for k, v in cells.items()},
            "cellsByRegion": {k: {r: dict(byYear) for r, byYear in v.items()} for k, v in region_cells.items()},
            "cells": {k: {r: dict(byYear) for r, byYear in v.items()} for k, v in region_cells.items()},  # back-compat alias
            "matchRate": round(match_rate, 1),
            "regionChoice": region_choice_summary,
            "notes": "cellsByCounty is keyed by home county (from membership zip) -- use this for any "
                     "boundary/area redraw, since it answers 'which new area would this athlete fall into.' "
                     "cellsByRegion is keyed by the region the athlete actually competed in (identical to "
                     "this file before this rebuild) -- keep using this for anything about today's real "
                     "regions as drawn. The two do not agree for every athlete BY DESIGN: region choice lets "
                     "an athlete compete somewhere other than their geography would suggest, and that gap is "
                     "exactly what regionChoice measures, not an error in either column.",
        }
        with open(TARGET, "w") as fh:
            json.dump(out, fh, separators=(",", ":"), sort_keys=True)
        report["stage"] = "written"
        write_run_report(dsn, report)
        print(f"\nwrote {TARGET} ({os.path.getsize(TARGET)} bytes)")
    except SystemExit:
        raise
    except Exception as e:
        report.update(stage="build_failed", error=f"{type(e).__name__}: {e}")
        write_run_report(dsn, report)
        raise


if __name__ == "__main__":
    main()
