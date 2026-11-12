#!/usr/bin/env python3
"""Read-only. Before automating the rebuild of membership-analytics/boundary-data.json
(the county member counts behind Boundary Studio's map), find the counting rule that
reproduces the file as it stands. The file was built by hand; this tests candidate
rules for each season against it and prints mismatch counts only (no member rows).
Output committed to db/audits/boundary_membership_probe.txt."""
import os, json, collections, psycopg2
conn = psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True); cur = conn.cursor()
B = json.load(open("membership-analytics/boundary-data.json"))
st = B["stats"]; clubs = B["clubs"]
z2c = {z: f for f, r in st.items() for z in r["z"]}
ZI = {"y25": 0, "y26": 1, "y24": 2}
ATH = {'Athlete (17U)','Athlete (AQUA Age 18+)','Competition Athlete (17U)','Competition Athlete (AQUA Age 18+)','Introductory Athlete 17U','Introductory Athlete AQUA Age 18+'}
COA = {'Competition Coach','Coach','Lifetime Coach'}
cur.execute("SELECT membership_year, count(*), count(DISTINCT member_id), max(loaded_at), count(*) FILTER (WHERE zip5 IS NULL OR zip5='') FROM membership.members GROUP BY 1 ORDER BY 1")
print("year | rows | distinct members | last loaded | rows with no zip"); [print(" | ".join(str(v) for v in r)) for r in cur.fetchall()]
cur.execute("SELECT membership_year, member_status, count(*) FROM membership.members GROUP BY 1,2 ORDER BY 1,3 DESC")
print("\nyear | member_status | rows"); [print(" | ".join(str(v) for v in r)) for r in cur.fetchall()]
cur.execute("SELECT membership_year, member_id, membership_type, left(zip5,5), club FROM membership.members")
rows = cur.fetchall()
for yk, yr in (("y24", 2024), ("y25", 2025), ("y26", 2026)):
    R = [r for r in rows if r[0] == yr]
    print(f"\n=== {yr}: {len(R)} rows; file total m = {sum(r[yk]['m'] for r in st.values() if yk in r)}, a = {sum(r[yk]['a'] for r in st.values() if yk in r)}, c = {sum(r[yk]['c'] for r in st.values() if yk in r)}")
    for name, dedup in (("rows", False), ("distinct member (first row)", True)):
        m = collections.Counter(); a = collections.Counter(); c = collections.Counter(); cl = collections.defaultdict(set); zc = collections.Counter(); seen = set(); unm = 0
        ida = collections.defaultdict(set); idc = collections.defaultdict(set)
        for _, mid, mt, z, club in R:
            f = z2c.get(z)
            if f is None: unm += 1; continue
            if mt in ATH: ida[f].add(mid)
            if mt in COA: idc[f].add(mid)
            if club: cl[f].add(club)
            if dedup:
                if mid in seen: continue
                seen.add(mid)
            m[f] += 1; zc[z] += 1
            if mt in ATH: a[f] += 1
            if mt in COA: c[f] += 1
        fs = [f for f in st if yk in st[f]]
        allf = set(fs) | set(m)
        g = lambda f, k: (st[f][yk][k] if f in st and yk in st[f] else 0)
        mm = sum(1 for f in allf if m[f] != g(f, 'm')); ma = sum(1 for f in allf if a[f] != g(f, 'a')); mc = sum(1 for f in allf if c[f] != g(f, 'c'))
        mda = sum(1 for f in allf if len(ida[f]) != g(f, 'a')); mdc = sum(1 for f in allf if len(idc[f]) != g(f, 'c'))
        mcl = sum(1 for f in allf if len(cl[f]) != (len(st[f][yk]['cl']) if f in st and yk in st[f] else 0))
        mclset = sum(1 for f in fs if cl[f] != {clubs[i] for i in st[f][yk]['cl']})
        zi = ZI[yk]; mz = sum(1 for z, f in z2c.items() if zc[z] != st[f]['z'][z][zi])
        print(f"  rule '{name}': total m {sum(m.values())} a {sum(a.values())} c {sum(c.values())} unmappable {unm} | counties differing: m {mm}, a {ma}, c {mc}, a(distinct ids) {mda}, c(distinct ids) {mdc}, club count {mcl}, club set {mclset} of {len(allf)} | zips differing {mz} of {len(z2c)}")
cur.execute("SELECT count(DISTINCT left(zip5,5)) FROM membership.members WHERE membership_year=2026 AND zip5 IS NOT NULL")
z26 = cur.fetchone()[0]
cur.execute("SELECT left(zip5,5), count(*) FROM membership.members WHERE membership_year=2026 AND zip5 IS NOT NULL GROUP BY 1")
new = [(z, n) for z, n in cur.fetchall() if z not in z2c]
print(f"\n2026 zips in the database: {z26}; not in the map's zip list: {len(new)} zips, {sum(n for _, n in new)} rows")
try:
    CZ = json.load(open("boundary-studio/clubs-zip.json"))
    print("clubs-zip.json keys:", list(CZ.keys())[:8])
    zz = CZ.get("zips") or CZ.get("z") or {}
    print("clubs-zip zips:", len(zz), "| sample:", str(list(zz.items())[:2])[:200])
    print("of the new 2026 zips, covered by clubs-zip.json:", sum(1 for z, _ in new if z in zz), "rows", sum(n for z, n in new if z in zz))
except Exception as e: print("clubs-zip.json:", e)
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='membership' AND table_name='ingest_log'"); print("\ningest_log cols:", [r[0] for r in cur.fetchall()])
cur.execute("SELECT count(*), max(loaded_at) FROM membership.ingest_log"); print("ingest_log:", cur.fetchone())
