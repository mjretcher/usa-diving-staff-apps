#!/usr/bin/env python3
"""
Fetch live entry counts for a DiveMeets meet and upsert them into
junior_results.meet_entries in Neon.

Source of truth: https://new.divemeets.com/MeetInfo/{meet_id}

Two naming conventions are supported, verified against real captured pages:
  Junior Circuit:  "Group A Girls 1m (16-18) (Prelim/Quarterfinal)"
  Senior/Qualifier/Nationals/Winter Nationals: "Senior Men 3m (Prelim/Quarterfinal)"
    (no "Group X" prefix, Men/Women instead of Boys/Girls, no age bracket)
Synchro events are excluded from both conventions (individual-entry planning
only, by policy).

Round handling: most meets link entry counts from the Prelim/Quarterfinal
round only (Finals fields aren't set yet). Some meets (e.g. a single-round
Qualifier) carry their only real signups on a "Final"-labeled round instead
— verified against meet 12924, which has zero Prelim/Quarterfinal links at
all. For the Senior/Qualifier/Nationals convention, Final is accepted as a
fallback ONLY when no Prelim/Quarterfinal round exists for that same
level+gender+discipline combo. For Junior events, Final is never accepted
— Junior Finals use their own distinct (smaller, post-cut) event id and
must never be mistaken for a live signup count.

Parsing strategy: anchor on each DiveSheets link in the RAW html (dedup by
event id), then de-tag the preceding window and match the event name in
plain text — the site interleaves <br/> and spans inside names, so any
regex that runs against raw html for the name is one markup tweak away
from silently matching nothing.

Diagnostics: success or failure, a summary is upserted into
app_meta.config under key 'divemeets_sync_last_run' so the outcome is
inspectable straight from Neon (Actions log downloads are not always
reachable). On failure the table junior_results.meet_entries is NOT touched.

Run by .github/workflows/divemeets-entries.yml (manual dispatch + daily cron).
Env: DATABASE_URL (Neon), MEET_ID (default 12923).
"""
import json
import os
import re
import sys
import urllib.request
import urllib.error

MEET_ID = os.environ.get("MEET_ID", "12923").strip()
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")

URL = f"https://new.divemeets.com/MeetInfo/{MEET_ID}"
APPARATUS = {"1m": "1-Meter", "3m": "3-Meter", "platform": "Platform"}
ROUND_RANK = {"Prelim/Quarterfinal": 0, "Semifinal": 1, "Final": 2}

def write_diag(payload):
    """Best-effort diagnostic upsert into app_meta.config (never raises)."""
    try:
        import psycopg2
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO app_meta.config (key, value, description)
               VALUES ('divemeets_sync_last_run', %s, 'Last DiveMeets entries sync outcome')
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
            (json.dumps(payload)[:8000],))
        conn.commit(); cur.close(); conn.close()
    except Exception as e:
        print(f"  (diagnostic write failed: {e})", file=sys.stderr)

def fetch(url, referer=None):
    headers = {
        # Recon-verified header set: the DiveSheets pages 403 the previous
        # custom-suffixed UA / minimal headers, but accept this browser-grade
        # set (proven by the successful recon capture of the same page type).
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")

DETAG = re.compile(r'<[^>]+>')
NAME_RX_JUNIOR = re.compile(
    r'Group\s+([A-D])(/[A-D])?\s*(Synchro[\w.]*)?\s*(Boys|Girls)?\s*'
    r'(1m|3m|Platform)\b[^()]*\(([^)]*)\)\s*\((Prelim/Quarterfinal|Semifinal|Final)\)',
    re.I)
NAME_RX_SENIOR = re.compile(
    r'\b(Senior|Synchronized)?\s*(Men|Women)\s+'
    r'(1m|3m|Platform)\b\s*(?:Championship|Champ\.?)?\s*(?:\(\d+\s*Dives?\))?\s*'
    r'(CONSOL\.?)?\s*\((Prelim/Quarterfinal|Semifinal|Final)\)',
    re.I)

def parse(html):
    """Return (rows, diag). One row per level+gender+discipline combo, using
    whichever round is the appropriate signup-count source for that combo."""
    link_rx = re.compile(r'DiveSheets/%s/(\d+)/(\d+)' % re.escape(MEET_ID))
    candidates, unparsed, seen_links = [], [], set()
    for m in link_rx.finditer(html):
        event_id, round_num = m.group(1), m.group(2)
        if event_id in seen_links:
            continue  # page repeats each link (count + "N entries") — dedupe
        seen_links.add(event_id)
        # De-tag the preceding window; the LAST event name in it is this row's.
        window = DETAG.sub(' ', html[max(0, m.start() - 2500):m.start()])
        window = window.replace('&amp;', '&')
        after = html[m.end():m.end() + 250]
        cnt_m = re.search(r'>\s*(\d+)\s*(?:entries)?\s*<', after)
        entries = int(cnt_m.group(1)) if cnt_m else 0

        names = list(NAME_RX_JUNIOR.finditer(window))
        if names:
            n = names[-1]
            grp, combo, synchro, gender, app, bracket, round_raw = n.groups()
            if synchro or combo or not gender:
                unparsed.append(event_id)
                continue
            if round_raw != "Prelim/Quarterfinal":
                continue  # Junior Finals use a separate (smaller) event id — never trust them here
            key = ("junior", f"Group {grp.upper()}", gender.title(), APPARATUS[app.lower()])
            candidates.append((key, event_id, round_num, round_raw, bracket, entries))
            continue

        names2 = list(NAME_RX_SENIOR.finditer(window))
        if names2:
            n = names2[-1]
            level_raw, gender, app, consol, round_raw = n.groups()
            if consol or (level_raw or "").strip().lower() == "synchronized":
                continue  # excluded: consolation bracket / synchro (policy)
            level = (level_raw or "Senior").strip() or "Senior"
            key = ("senior", level, gender.title(), APPARATUS[app.lower()])
            candidates.append((key, event_id, round_num, round_raw, None, entries))
            continue

        unparsed.append(event_id)

    # Reduce to one row per level+gender+discipline, preferring the
    # lowest-ranked round (Prelim/Quarterfinal beats Semifinal beats Final).
    # Falling back to Final only fires when a meet has no earlier round for
    # that combo at all (e.g. a single-round Qualifier).
    best = {}
    for key, event_id, round_num, round_raw, bracket, entries in candidates:
        rank = ROUND_RANK.get(round_raw, 9)
        if key not in best or rank < best[key][0]:
            best[key] = (rank, event_id, round_num, round_raw, bracket, entries)

    rows = []
    for (conv, level, gender, disc), (rank, event_id, round_num, round_raw, bracket, entries) in best.items():
        name = f"{level} {gender} {disc}" + (f" ({bracket.strip()})" if bracket else "") + f" ({round_raw})"
        rows.append({
            "event_id_dm": event_id, "event_name": name, "age_group": level,
            "gender": gender, "discipline": disc, "round": "Prelim",
            "round_num": round_num, "entries": entries,
        })
    diag = {"meet_id": MEET_ID, "links_found": len(seen_links),
            "distinct_events": len(seen_links), "rows_parsed": len(rows),
            "unparsed_event_ids": unparsed[:10]}
    return rows, diag

def main():
    print(f"Fetching {URL}")
    try:
        html = fetch(URL)
    except urllib.error.HTTPError as e:
        write_diag({"ok": False, "stage": "fetch", "http_status": e.code, "meet_id": MEET_ID})
        sys.exit(f"HTTP {e.code} fetching MeetInfo page")
    except Exception as e:
        write_diag({"ok": False, "stage": "fetch", "error": str(e)[:400], "meet_id": MEET_ID})
        sys.exit(f"Fetch failed: {e}")

    rows, diag = parse(html)
    if not rows:
        diag.update({"ok": False, "stage": "parse", "html_len": len(html),
                     "sample": DETAG.sub(' ', html[:1200])[:600]})
        write_diag(diag)
        sys.exit("No event rows parsed — DiveMeets page structure may have changed. NOT touching the table.")

    print(f"Parsed {len(rows)} individual prelim events:")
    for r in rows:
        print(f"  {r['age_group']} {r['gender']} {r['discipline']} ({r['round']}): {r['entries']} entries [ev {r['event_id_dm']}]")

    import psycopg2
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    for r in rows:
        cur.execute(
            """INSERT INTO junior_results.meet_entries
                 (meet_id_dm,event_id_dm,event_name,age_group,gender,discipline,round,entries,fetched_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,now())
               ON CONFLICT (meet_id_dm,event_id_dm) DO UPDATE SET
                 event_name=EXCLUDED.event_name, age_group=EXCLUDED.age_group,
                 gender=EXCLUDED.gender, discipline=EXCLUDED.discipline,
                 round=EXCLUDED.round, entries=EXCLUDED.entries, fetched_at=now()""",
            (MEET_ID, r["event_id_dm"], r["event_name"], r["age_group"],
             r["gender"], r["discipline"], r["round"], r["entries"]))
    conn.commit()

    # ── Per-diver entrants from each event's DiveSheets page ────────────
    # Structure (verified against a captured real page 2026-07-10):
    #   <h5><a href=".../Profile/{id}">Name</a> -- <a href=".../TeamProfile/{tid}">Team</a></h5>
    # Fail-soft per event: a failed page fetch/parse records a diagnostic and
    # leaves that event's existing entrant rows untouched. Successful events
    # are replaced wholesale (delete+insert) so scratches disappear correctly.
    import time
    entrant_rx = re.compile(
        r'/Profile/(\d+)"[^>]*>([^<]+)</a>\s*--\s*<a[^>]*?/TeamProfile/(\d+)"[^>]*>([^<]+)</a>')
    ent_total = 0
    ent_events_ok = 0
    ent_failures = []
    ent_mismatches = []
    for r in rows:
        # Use the actual round this row's entries came from — not every meet
        # links its live count from round 1 (e.g. a single-round Qualifier
        # only has round 9 / "Final").
        ev_url = f"https://new.divemeets.com/DiveSheets/{MEET_ID}/{r['event_id_dm']}/{r['round_num']}"
        ev_html = None
        for attempt in (1, 2):
            try:
                ev_html = fetch(ev_url, referer=URL)
                break
            except urllib.error.HTTPError as e:
                if e.code == 403 and attempt == 1:
                    time.sleep(6)  # back off once — burst rate limiting
                    continue
                ent_failures.append({"event": r["event_id_dm"], "error": f"HTTP {e.code}"})
                break
            except Exception as e:
                ent_failures.append({"event": r["event_id_dm"], "error": str(e)[:120]})
                break
        if ev_html is None:
            continue
        found = entrant_rx.findall(ev_html)
        entrants = []
        seen_ids = set()
        for pid, name, tid, team in found:
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            clean = " ".join(name.replace("&amp;", "&").split())
            entrants.append({
                "pid": pid, "name": clean,
                "tid": tid, "team": " ".join(team.replace("&amp;", "&").split()),
                "key": "nm:" + clean.lower(),
            })
        if not entrants and r["entries"] > 0:
            # Page fetched but nothing parsed while the count says entrants exist:
            # treat as parse failure — do NOT wipe this event's rows.
            ent_failures.append({"event": r["event_id_dm"], "error": "0 parsed vs count " + str(r["entries"])})
            continue
        # Cross-validation: registrations move live, so allow small drift but record it.
        if abs(len(entrants) - r["entries"]) > 2:
            ent_mismatches.append({"event": r["event_id_dm"], "count": r["entries"], "names": len(entrants)})
        cur.execute("DELETE FROM junior_results.meet_entrants WHERE meet_id_dm=%s AND event_id_dm=%s",
                    (MEET_ID, r["event_id_dm"]))
        for e in entrants:
            cur.execute(
                """INSERT INTO junior_results.meet_entrants
                     (meet_id_dm,event_id_dm,dm_profile_id,diver_name,team_id_dm,team,diver_key,
                      age_group,gender,discipline,fetched_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now())
                   ON CONFLICT (meet_id_dm,event_id_dm,dm_profile_id) DO UPDATE SET
                     diver_name=EXCLUDED.diver_name, team_id_dm=EXCLUDED.team_id_dm,
                     team=EXCLUDED.team, diver_key=EXCLUDED.diver_key,
                     age_group=EXCLUDED.age_group, gender=EXCLUDED.gender,
                     discipline=EXCLUDED.discipline, fetched_at=now()""",
                (MEET_ID, r["event_id_dm"], e["pid"], e["name"], e["tid"], e["team"], e["key"],
                 r["age_group"], r["gender"], r["discipline"]))
        conn.commit()  # per-event commit: one bad event can't roll back the good ones
        ent_total += len(entrants)
        ent_events_ok += 1
        print(f"  entrants: {r['age_group']} {r['gender']} {r['discipline']}: {len(entrants)}")
        time.sleep(2.0)  # politeness between page fetches — 0.6s burst triggered 403s

    cur.close(); conn.close()
    diag.update({"ok": True, "total_entries": sum(r["entries"] for r in rows),
                 "entrants_total": ent_total, "entrant_events_ok": ent_events_ok,
                 "entrant_failures": ent_failures[:8], "entrant_count_mismatches": ent_mismatches[:8]})
    write_diag(diag)
    print(f"Upserted {len(rows)} rows into junior_results.meet_entries (meet {MEET_ID}).")
    print(f"Entrants: {ent_total} across {ent_events_ok}/{len(rows)} events; failures={len(ent_failures)}")

if __name__ == "__main__":
    main()

def main():
    print(f"Fetching {URL}")
    try:
        html = fetch(URL)
    except urllib.error.HTTPError as e:
        write_diag({"ok": False, "stage": "fetch", "http_status": e.code, "meet_id": MEET_ID})
        sys.exit(f"HTTP {e.code} fetching MeetInfo page")
    except Exception as e:
        write_diag({"ok": False, "stage": "fetch", "error": str(e)[:400], "meet_id": MEET_ID})
        sys.exit(f"Fetch failed: {e}")

    rows, diag = parse(html)
    if not rows:
        diag.update({"ok": False, "stage": "parse", "html_len": len(html),
                     "sample": DETAG.sub(' ', html[:1200])[:600]})
        write_diag(diag)
        sys.exit("No event rows parsed — DiveMeets page structure may have changed. NOT touching the table.")

    print(f"Parsed {len(rows)} individual prelim events:")
    for r in rows:
        print(f"  {r['age_group']} {r['gender']} {r['discipline']} ({r['round']}): {r['entries']} entries [ev {r['event_id_dm']}]")

    import psycopg2
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    for r in rows:
        cur.execute(
            """INSERT INTO junior_results.meet_entries
                 (meet_id_dm,event_id_dm,event_name,age_group,gender,discipline,round,entries,fetched_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,now())
               ON CONFLICT (meet_id_dm,event_id_dm) DO UPDATE SET
                 event_name=EXCLUDED.event_name, age_group=EXCLUDED.age_group,
                 gender=EXCLUDED.gender, discipline=EXCLUDED.discipline,
                 round=EXCLUDED.round, entries=EXCLUDED.entries, fetched_at=now()""",
            (MEET_ID, r["event_id_dm"], r["event_name"], r["age_group"],
             r["gender"], r["discipline"], r["round"], r["entries"]))
    conn.commit()

    # ── Per-diver entrants from each event's DiveSheets page ────────────
    # Structure (verified against a captured real page 2026-07-10):
    #   <h5><a href=".../Profile/{id}">Name</a> -- <a href=".../TeamProfile/{tid}">Team</a></h5>
    # Fail-soft per event: a failed page fetch/parse records a diagnostic and
    # leaves that event's existing entrant rows untouched. Successful events
    # are replaced wholesale (delete+insert) so scratches disappear correctly.
    import time
    entrant_rx = re.compile(
        r'/Profile/(\d+)"[^>]*>([^<]+)</a>\s*--\s*<a[^>]*?/TeamProfile/(\d+)"[^>]*>([^<]+)</a>')
    ent_total = 0
    ent_events_ok = 0
    ent_failures = []
    ent_mismatches = []
    for r in rows:
        ev_url = f"https://new.divemeets.com/DiveSheets/{MEET_ID}/{r['event_id_dm']}/1"
        ev_html = None
        for attempt in (1, 2):
            try:
                ev_html = fetch(ev_url, referer=URL)
                break
            except urllib.error.HTTPError as e:
                if e.code == 403 and attempt == 1:
                    time.sleep(6)  # back off once — burst rate limiting
                    continue
                ent_failures.append({"event": r["event_id_dm"], "error": f"HTTP {e.code}"})
                break
            except Exception as e:
                ent_failures.append({"event": r["event_id_dm"], "error": str(e)[:120]})
                break
        if ev_html is None:
            continue
        found = entrant_rx.findall(ev_html)
        entrants = []
        seen_ids = set()
        for pid, name, tid, team in found:
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            clean = " ".join(name.replace("&amp;", "&").split())
            entrants.append({
                "pid": pid, "name": clean,
                "tid": tid, "team": " ".join(team.replace("&amp;", "&").split()),
                "key": "nm:" + clean.lower(),
            })
        if not entrants and r["entries"] > 0:
            # Page fetched but nothing parsed while the count says entrants exist:
            # treat as parse failure — do NOT wipe this event's rows.
            ent_failures.append({"event": r["event_id_dm"], "error": "0 parsed vs count " + str(r["entries"])})
            continue
        # Cross-validation: registrations move live, so allow small drift but record it.
        if abs(len(entrants) - r["entries"]) > 2:
            ent_mismatches.append({"event": r["event_id_dm"], "count": r["entries"], "names": len(entrants)})
        cur.execute("DELETE FROM junior_results.meet_entrants WHERE meet_id_dm=%s AND event_id_dm=%s",
                    (MEET_ID, r["event_id_dm"]))
        for e in entrants:
            cur.execute(
                """INSERT INTO junior_results.meet_entrants
                     (meet_id_dm,event_id_dm,dm_profile_id,diver_name,team_id_dm,team,diver_key,
                      age_group,gender,discipline,fetched_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now())
                   ON CONFLICT (meet_id_dm,event_id_dm,dm_profile_id) DO UPDATE SET
                     diver_name=EXCLUDED.diver_name, team_id_dm=EXCLUDED.team_id_dm,
                     team=EXCLUDED.team, diver_key=EXCLUDED.diver_key,
                     age_group=EXCLUDED.age_group, gender=EXCLUDED.gender,
                     discipline=EXCLUDED.discipline, fetched_at=now()""",
                (MEET_ID, r["event_id_dm"], e["pid"], e["name"], e["tid"], e["team"], e["key"],
                 r["age_group"], r["gender"], r["discipline"]))
        conn.commit()  # per-event commit: one bad event can't roll back the good ones
        ent_total += len(entrants)
        ent_events_ok += 1
        print(f"  entrants: {r['age_group']} {r['gender']} {r['discipline']}: {len(entrants)}")
        time.sleep(2.0)  # politeness between page fetches — 0.6s burst triggered 403s

    cur.close(); conn.close()
    diag.update({"ok": True, "total_entries": sum(r["entries"] for r in rows),
                 "entrants_total": ent_total, "entrant_events_ok": ent_events_ok,
                 "entrant_failures": ent_failures[:8], "entrant_count_mismatches": ent_mismatches[:8]})
    write_diag(diag)
    print(f"Upserted {len(rows)} rows into junior_results.meet_entries (meet {MEET_ID}).")
    print(f"Entrants: {ent_total} across {ent_events_ok}/{len(rows)} events; failures={len(ent_failures)}")

if __name__ == "__main__":
    main()
