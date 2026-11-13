#!/usr/bin/env python3
"""Rebuild the current season's county member counts in
membership-analytics/boundary-data.json from membership.members, so Boundary
Studio's map follows every membership import.

The file was built by hand until 2026-11-12. The counting rule below was found by
testing candidates against it (db/scripts/boundary_membership_probe.py): it
reproduces the 2024 and 2025 seasons exactly, county by county and zip by zip.

  m   distinct members living in the county (a member with two membership rows
      counts once, in the county of their first row by membership type)
  a   distinct members holding an athlete membership (6 types)
  c   distinct members holding a coach membership (3 types)
  cl  clubs named on the membership rows of people living in the county
  z   members per zip code; index 0 = 2025, 1 = 2026, 2 = 2024

What it does each run:
  1. GATE. Recounts 2024 and 2025 with this code and compares with the file. If
     either season no longer reproduces exactly it writes NOTHING and exits 1.
     Completed seasons are never rewritten.
  2. Recounts 2026. A zip the map has not seen before is placed in its county
     from boundary-studio/clubs-zip.json (zip -> county); a zip that file does not
     know stays unmapped, as before. No county is guessed.
  3. Records totals and the import time in meta.y26, which the app reads for the
     2026 total and the "as of" date.

Env: DATABASE_URL (owner connection; only aggregates leave). FORCE=1 rebuilds
even when no import has landed since the last build.
Workflow: build-boundary-membership.yml. Log: db/audits/boundary_membership_build.txt
"""
import os, sys, json, datetime, collections
import psycopg2

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
PATH = os.path.join(HERE, "membership-analytics", "boundary-data.json")
CZ_PATH = os.path.join(HERE, "boundary-studio", "clubs-zip.json")
ATH = {'Athlete (17U)', 'Athlete (AQUA Age 18+)', 'Competition Athlete (17U)', 'Competition Athlete (AQUA Age 18+)',
       'Introductory Athlete 17U', 'Introductory Athlete AQUA Age 18+'}
COA = {'Competition Coach', 'Coach', 'Lifetime Coach'}
ZI = {"y25": 0, "y26": 1, "y24": 2}
LIVE = ("y26", 2026)
FROZEN = (("y24", 2024), ("y25", 2025))


def count(rows, z2c):
    """rows: (member_id, membership_type, zip5, club) ordered by member_id, membership_type."""
    m = collections.Counter(); zc = collections.Counter()
    ida = collections.defaultdict(set); idc = collections.defaultdict(set); cl = collections.defaultdict(set)
    seen = set(); unmapped_rows = 0; unmapped_members = set(); mapped_members = set()
    for mid, mt, z, club in rows:
        f = z2c.get(z)
        if f is None:
            unmapped_rows += 1; unmapped_members.add(mid); continue
        mapped_members.add(mid)
        if mt in ATH: ida[f].add(mid)
        if mt in COA: idc[f].add(mid)
        if club: cl[f].add(club)
        if mid in seen: continue
        seen.add(mid); m[f] += 1; zc[z] += 1
    return {"m": m, "a": {f: len(v) for f, v in ida.items()}, "c": {f: len(v) for f, v in idc.items()}, "cl": cl, "z": zc,
            "unmapped_rows": unmapped_rows, "unmapped_members": len(unmapped_members - mapped_members), "mapped": len(seen)}


def main():
    B = json.load(open(PATH, encoding="utf-8"))
    st = B["stats"]; clubs = B["clubs"]; meta = B.setdefault("meta", {})
    conn = psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True); cur = conn.cursor()

    cur.execute("SELECT max(loaded_at), count(*), count(DISTINCT member_id) FROM membership.members WHERE membership_year=%s", (LIVE[1],))
    loaded_at, n_rows, n_members = cur.fetchone()
    loaded_iso = loaded_at.astimezone(datetime.timezone.utc).isoformat(timespec="seconds") if loaded_at else None
    prev = (meta.get(LIVE[0]) or {})
    print(f"{LIVE[1]} in the database: {n_rows} rows, {n_members} members, last import {loaded_iso}")
    print(f"map file was last built from: {prev.get('loaded_at') or 'a hand build (Sept 2026)'}")
    if prev.get("loaded_at") == loaded_iso and prev.get("rows") == n_rows and os.environ.get("FORCE") != "1":
        print("No import since the last build. Nothing to do."); return 0

    def rows_for(year):
        cur.execute("SELECT member_id, membership_type, left(zip5,5), club FROM membership.members WHERE membership_year=%s ORDER BY member_id, membership_type", (year,))
        return cur.fetchall()

    # 1. Gate: the rule must still reproduce the completed seasons exactly.
    # Zips a build has added since the file was made by hand are left out of the
    # gate: the completed seasons were counted without them, and they stay that way.
    added_before = set(meta.get("added_zips", []))
    z2c_all = {z: f for f, r in st.items() for z in r["z"]}
    z2c = {z: f for z, f in z2c_all.items() if z not in added_before}
    ok = True
    for yk, yr in FROZEN:
        C = count(rows_for(yr), z2c)
        fs = set(f for f in st if yk in st[f]) | set(C["m"])
        g = lambda f, k: (st[f][yk][k] if f in st and yk in st[f] else 0)
        bad_m = sum(1 for f in fs if C["m"].get(f, 0) != g(f, "m"))
        bad_a = sum(1 for f in fs if C["a"].get(f, 0) != g(f, "a"))
        bad_c = sum(1 for f in fs if C["c"].get(f, 0) != g(f, "c"))
        bad_cl = sum(1 for f in fs if C["cl"].get(f, set()) != ({clubs[i] for i in st[f][yk]["cl"]} if f in st and yk in st[f] else set()))
        bad_z = sum(1 for z, f in z2c.items() if C["z"].get(z, 0) != st[f]["z"][z][ZI[yk]])
        good = not (bad_m or bad_a or bad_c or bad_cl or bad_z)
        ok = ok and good
        print(f"gate {yr}: counties differing m {bad_m}, athletes {bad_a}, coaches {bad_c}, clubs {bad_cl}; zips differing {bad_z} -> {'reproduces exactly' if good else 'DOES NOT REPRODUCE'}")
    if not ok:
        print("\nNOT WRITTEN. The counting rule no longer reproduces a completed season, so the 2026 rebuild is not trusted. The map keeps its previous numbers.")
        return 1

    # 2. Live season. Place zips the map has not seen, where a county is known.
    R = rows_for(LIVE[1])
    z2c = z2c_all
    new_zips = []
    cz = (json.load(open(CZ_PATH, encoding="utf-8")).get("zips") or {})
    county_ok = {c["f"] for c in B["counties"]}
    added_zips = 0
    for _, _, z, _ in R:
        if not z or z in z2c: continue
        rec = cz.get(z)
        f = rec[3] if rec and len(rec) > 3 else None
        if not f or f not in county_ok: continue
        if f not in st: st[f] = {"y25": {"m": 0, "a": 0, "c": 0, "cl": []}, "y26": {"m": 0, "a": 0, "c": 0, "cl": []}, "z": {}}
        st[f]["z"][z] = [0, 0, 0]; z2c[z] = f; added_zips += 1; new_zips.append(z)
    C = count(R, z2c)
    before = {k: sum(r["y26"][k] for r in st.values() if "y26" in r) for k in ("m", "a", "c")}
    club_ix = {name: i for i, name in enumerate(clubs)}
    new_clubs = []
    for f, r in st.items():
        names = sorted(C["cl"].get(f, set()))
        for nm in names:
            if nm not in club_ix:
                club_ix[nm] = len(clubs); clubs.append(nm); new_clubs.append(nm)
        r["y26"] = {"m": C["m"].get(f, 0), "a": C["a"].get(f, 0), "c": C["c"].get(f, 0), "cl": [club_ix[nm] for nm in names]}
        for z in r["z"]:
            r["z"][z][ZI["y26"]] = C["z"].get(z, 0)
    after = {k: sum(r["y26"][k] for r in st.values()) for k in ("m", "a", "c")}
    # Home county of each club: where the most of its 2026 members live (ties to
    # the lower county code). The map uses it to place a club that is not on the
    # Webpoint club roster. Counts only; no member rows.
    per = collections.defaultdict(lambda: collections.defaultdict(set))
    for mid, _, z, club in R:
        f = z2c.get(z)
        if club and f: per[club][f].add(mid)
    B["clubHome"] = {str(club_ix[nm]): sorted(d.items(), key=lambda kv: (-len(kv[1]), kv[0]))[0][0]
                     for nm, d in per.items() if nm in club_ix}
    meta["added_zips"] = sorted(added_before | set(new_zips))
    meta["y26"] = {"built": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                   "source": "membership.members, membership_year=2026 (db/scripts/build_boundary_membership.py)",
                   "loaded_at": loaded_iso, "rows": n_rows, "members_total": n_members,
                   "members_mapped": C["mapped"], "members_unmappable": C["unmapped_members"],
                   "zips_added_this_build": added_zips}
    open(PATH, "w", encoding="utf-8").write(json.dumps(B, separators=(",", ":")))
    print(f"\n2026 rebuilt. Members on the map {before['m']} -> {after['m']}; athletes {before['a']} -> {after['a']}; coaches {before['c']} -> {after['c']}.")
    print(f"Members in the database {n_members}; placed in a county {C['mapped']}; not mappable {C['unmapped_members']} (foreign address or a zip with no known county).")
    print(f"Zip codes added to the map this build: {added_zips}. New clubs: {len(new_clubs)}{(' (' + ', '.join(new_clubs[:12]) + (' …' if len(new_clubs) > 12 else '') + ')') if new_clubs else ''}.")
    print(f"Club home counties written: {len(B['clubHome'])}.")
    print(f"Counties with members in 2026: {sum(1 for r in st.values() if r['y26']['m'] > 0)}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
