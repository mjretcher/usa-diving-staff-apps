#!/usr/bin/env python3
"""
One-off data fix for the Boundary Studio libraries, requested by Mike 2026-11-22.

  1. The library map "Mike v.2 11-12" (membership.boundary_maps id
     mp-mwec3kq8-8rkp) still carries an E / W / C third level. The proposal
     that uses it, "CCE 2027" (membership.boundary_scenarios id
     bs-mvo2c1ou-uno3b), is Regions > Zones > Junior Nationals. The map's
     levels are set to the proposal's, but only if the map's regions and
     county assignment are still identical to the proposal's.
  2. The pathway library (membership.pathways) holds two entries named
     "CCE 2027" with identical contents. The older one is removed, but only if
     the two are still identical.

Safe to re-run: it changes nothing once both are done. Each write lands only
if the row has not been saved by someone else between the read and the write.

Env: DATABASE_URL. Prints what it found and did (committed to db/audits).
"""
import json, os, sys
import psycopg2

MAP_ID, SCEN_ID = "mp-mwec3kq8-8rkp", "bs-mvo2c1ou-uno3b"
PW_KEEP, PW_DROP = "pw-mws5mt4a-owb6", "pw-mwrymdaz-q87n"

def js(v):
    return json.loads(v) if isinstance(v, str) else v

def shape(levels):
    return " > ".join(f"{l.get('name')} ({len(l.get('groups') or [])})" if i else str(l.get("name")) for i, l in enumerate(levels or []))

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

# ---- 1. the library map ----------------------------------------------------
print("1. Library map", MAP_ID)
cur.execute("SELECT name, data, updated_at FROM membership.boundary_maps WHERE id=%s", (MAP_ID,))
m = cur.fetchone()
cur.execute("SELECT name, data, updated_at FROM membership.boundary_scenarios WHERE id=%s", (SCEN_ID,))
s = cur.fetchone()
if not m or not s:
    print("   map or proposal not found; nothing changed.", "map:", bool(m), "proposal:", bool(s))
else:
    mname, mdata, mupd = m[0], js(m[1]), m[2]
    sname, sdata, supd = s[0], js(s[1]), s[2]
    print(f"   map: {mname!r}, saved {mupd}")
    print(f"   proposal: {sname!r}, saved {supd}")
    print("   map levels (before):     ", shape(mdata.get("levels")))
    print("   proposal levels:         ", shape(sdata.get("levels")))
    same_regions = json.dumps(mdata.get("regions"), sort_keys=True) == json.dumps(sdata.get("regions"), sort_keys=True)
    same_assign = (mdata.get("assign") or {}) == (sdata.get("assign") or {})
    print(f"   regions identical: {same_regions} | county assignment identical: {same_assign} ({len(mdata.get('assign') or {})} counties)")
    if json.dumps(mdata.get("levels"), sort_keys=True) == json.dumps(sdata.get("levels"), sort_keys=True):
        print("   levels already match; nothing changed.")
    elif not (same_regions and same_assign):
        print("   the map no longer matches the proposal's map; NOT changed.")
    else:
        mdata["levels"] = sdata.get("levels")
        if sdata.get("finalName"):
            mdata["finalName"] = sdata["finalName"]
        cur.execute("UPDATE membership.boundary_maps SET data=%s::jsonb, updated_at=now() WHERE id=%s AND updated_at=%s",
                    (json.dumps(mdata), MAP_ID, mupd))
        if cur.rowcount == 1:
            conn.commit()
            print("   map levels (after):      ", shape(mdata.get("levels")))
            print("   UPDATED. Regions, counties and the zone grouping are unchanged.")
        else:
            conn.rollback()
            print("   the map was saved by someone else in the meantime; NOT changed. Run again.")

# ---- 2. the duplicate pathway ----------------------------------------------
print("2. Pathway library")
cur.execute("SELECT id, name, levels, data, updated_at FROM membership.pathways WHERE id IN (%s,%s)", (PW_KEEP, PW_DROP))
rows = {r[0]: r for r in cur.fetchall()}
for pid in (PW_KEEP, PW_DROP):
    r = rows.get(pid)
    print(f"   {pid}:", f"{r[1]!r}, {r[2]} levels, saved {r[4]}" if r else "not there")
if PW_DROP not in rows:
    print("   the older copy is already gone; nothing changed.")
elif PW_KEEP not in rows:
    print("   the newer copy is missing, so the older one is kept; nothing changed.")
elif json.dumps(js(rows[PW_KEEP][3]), sort_keys=True) != json.dumps(js(rows[PW_DROP][3]), sort_keys=True) or rows[PW_KEEP][1] != rows[PW_DROP][1]:
    print("   the two are no longer identical; NOT changed.")
else:
    cur.execute("DELETE FROM membership.pathways WHERE id=%s AND updated_at=%s", (PW_DROP, rows[PW_DROP][4]))
    if cur.rowcount == 1:
        conn.commit(); print(f"   identical contents. DELETED the older copy {PW_DROP}; kept {PW_KEEP}.")
    else:
        conn.rollback(); print("   the older copy changed in the meantime; NOT changed. Run again.")
cur.execute("SELECT id, name, levels, to_char(updated_at,'YYYY-MM-DD HH24:MI') FROM membership.pathways ORDER BY updated_at DESC")
print("   pathway library now:", cur.fetchall())
cur.close(); conn.close()
