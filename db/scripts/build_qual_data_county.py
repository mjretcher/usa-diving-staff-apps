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
        direct_region_cells = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(list)))
        mapped, unmapped, skipped_disc = 0, 0, 0
        region_agree, region_disagree = 0, 0
        for ag, gen, disc, yr, zip5, score, region in rows:
            b = board_label(disc)
            if not b:
                skipped_disc += 1
                continue
            key = f"{ag}|{gen}|{b}"
            if region is not None:
                direct_region_cells[key][str(region)][str(yr)].append(float(score))
            fips = z2f.get(zip5) if zip5 else None
            if fips is None:
                unmapped += 1
                continue
            mapped += 1
            cells[key][fips][str(yr)].append(float(score))

        for key in cells:
            for fips in cells[key]:
                for yr in cells[key][fips]:
                    cells[key][fips][yr].sort(reverse=True)
        for key in direct_region_cells:
            for region in direct_region_cells[key]:
                for yr in direct_region_cells[key][region]:
                    direct_region_cells[key][region][yr].sort(reverse=True)

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
        prior_official = prior.get("officialRegion") or []
        fips_to_region = {fips: prior_official[i] for i, fips in enumerate(fips_order) if i < len(prior_official)}

        failures, checked = [], 0
        for key, byFips in cells.items():
            byRegionYear = collections.defaultdict(lambda: collections.defaultdict(list))
            for fips, byYear in byFips.items():
                r = fips_to_region.get(fips)
                if r is None:
                    continue
                for yr, scores in byYear.items():
                    byRegionYear[str(r)][yr].extend(scores)
            prior_region_years = (prior.get("cells") or {}).get(key, {})
            for region, byYear in byRegionYear.items():
                for yr, scores in byYear.items():
                    scores_sorted = sorted(scores, reverse=True)
                    if len(scores_sorted) < ADVANCE_RANK:
                        continue
                    new_cut = scores_sorted[ADVANCE_RANK - 1]
                    old_list = (prior_region_years.get(region) or {}).get(yr) or []
                    if len(old_list) < ADVANCE_RANK:
                        continue
                    old_cut = sorted(old_list, reverse=True)[ADVANCE_RANK - 1]
                    checked += 1
                    if abs(new_cut - old_cut) > ADVANCE_TOLERANCE:
                        failures.append(f"{key} region {region} {yr}: {old_cut:.1f} -> {new_cut:.1f}")

        # Diagnostic-only: the SAME gate, but bucketed by the region already
        # recorded on the result, bypassing zip/county entirely. If this
        # passes cleanly while the county-derived one above doesn't, the gap
        # is specifically "home county differs from historically-competed
        # region" -- a real, useful finding -- not a bug in the exclusion
        # logic shared by both.
        dr_failures, dr_checked = [], 0
        for key, byRegion in direct_region_cells.items():
            prior_region_years = (prior.get("cells") or {}).get(key, {})
            for region, byYear in byRegion.items():
                for yr, scores in byYear.items():
                    if len(scores) < ADVANCE_RANK:
                        continue
                    new_cut = scores[ADVANCE_RANK - 1]  # already sorted desc above
                    old_list = (prior_region_years.get(region) or {}).get(yr) or []
                    if len(old_list) < ADVANCE_RANK:
                        continue
                    old_cut = sorted(old_list, reverse=True)[ADVANCE_RANK - 1]
                    dr_checked += 1
                    if abs(new_cut - old_cut) > ADVANCE_TOLERANCE:
                        dr_failures.append(f"{key} region {region} {yr}: {old_cut:.1f} -> {new_cut:.1f}")
        report.update(direct_region_gate_checked=dr_checked, direct_region_gate_failures=len(dr_failures),
                       direct_region_gate_examples=dr_failures[:10])
        print(f"[diagnostic] direct-region gate (bypasses zip/county): "
              f"{dr_checked} checked, {len(dr_failures)} failures")

        report.update(gate_checked=checked, gate_failures=len(failures), gate_examples=failures[:10])
        print(f"\nregression gate: checked {checked} (cell, region, year) rank-15 cutoffs against the live file")
        if failures:
            print("REBUILD REJECTED -- would not reproduce the trusted region-level cutoffs:")
            for f in failures[:20]:
                print("   " + f)
            report["stage"] = "rejected_gate_failed"
            write_run_report(dsn, report)
            sys.exit(1)
        if checked == 0:
            report.update(stage="rejected", reason="gate_found_nothing_to_compare")
            write_run_report(dsn, report)
            sys.exit("REBUILD REJECTED -- the gate found nothing to compare, which means something is "
                     "wrong with the join or the region mapping, not that the rebuild is trustworthy.")
        print(f"gate passed: all {checked} comparable cutoffs matched within {ADVANCE_TOLERANCE} points.")

        out = {
            "advanceRank": ADVANCE_RANK, "years": list(YEARS), "stage": "Regionals",
            "scope": prior.get("scope"), "basis": prior.get("basis"),
            "exclusions": prior.get("exclusions", "") + (
                " Athletes whose competition result could not be matched to a membership record with a "
                f"zip code are excluded from county attribution ({match_rate:.1f}% matched) -- not silently "
                "dropped from awareness, but they cannot be placed on the map."),
            "keyedBy": "county FIPS (was region number in the prior version of this file)",
            "matchRate": round(match_rate, 1), "officialRegion": prior_official,
            "cells": {k: {fips: dict(byYear) for fips, byYear in v.items()} for k, v in cells.items()},
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
