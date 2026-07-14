#!/usr/bin/env python3
"""
Scrape every individual dive (with the Voluntary/Optional flag DiveMeets itself
assigns) for the 2026 USA Diving Junior World Championships Trials (meet 12838,
Groups A & B only, both genders, 1m/3m/Platform) into core.dive_sheets — the
SAME table already populated for 2025 Junior Nationals (meet 11609), so the
Trials data plugs into whatever already reads that table.

Source of truth per diver/event/round:
  https://new.divemeets.com/EventResults/{meet}/{event}/{round}
    -> lists every diver + a DiveSheetResults link carrying their sheet hash
  https://new.divemeets.com/DiveSheetResults/{meet}/{event}/{round}/{profile}/{hash}
    -> the actual dive-by-dive sheet: dive#, code, height, description, net
       score, DD, score, round place, and an "Opt Vol" flag (V or O) DiveMeets
       assigns per dive. This IS the voluntary/optional split — we don't need
       to reconstruct it from a rulebook dive-count table.

Rounds confirmed empirically (2026-07-14 recon, 4 samples across 3 events /
both genders): round "1" = Prelim/Quarterfinal (mixed V+O), round "9" = Final
(Optionals only, same mechanic as Junior Nationals — NOT a second V+O mix as
originally assumed; see session notes).

Idempotent: core.dive_sheets has a unique index on
(meet_id,event_id,result_set_id,diver_id,sheet_key,dive_order), so reruns
upsert safely and a failed/interrupted run can just be re-dispatched.

Env: DATABASE_URL. Optional: TRIALS_EVENT_FILTER (comma-separated event ids,
for a partial/resume run), TRIALS_ROUND_FILTER ("1", "9", or "1,9" default).

Run by .github/workflows/trials-dive-sheets.yml (workflow_dispatch).
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

MEET_ID = "12838"
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")

ROUND_FILTER = [r.strip() for r in os.environ.get("TRIALS_ROUND_FILTER", "1,9").split(",") if r.strip()]
_ev_filter_raw = os.environ.get("TRIALS_EVENT_FILTER", "").strip()
EVENT_FILTER = set(e.strip() for e in _ev_filter_raw.split(",") if e.strip()) if _ev_filter_raw else None

# Group A / Group B individual events at meet 12838 (confirmed via MeetInfo recon
# 2026-07-14). Synchro events (1441/1442/1271/1272) intentionally excluded —
# out of scope per HP Director's request (individual events, Groups A/B only).
EVENTS = [
    {"event_id": "1420", "age_group": "Group A", "gender": "Male",   "discipline": "1m",       "bracket": "16-18"},
    {"event_id": "1430", "age_group": "Group A", "gender": "Male",   "discipline": "3m",       "bracket": "16-18"},
    {"event_id": "1440", "age_group": "Group A", "gender": "Male",   "discipline": "Platform",  "bracket": "16-18"},
    {"event_id": "1250", "age_group": "Group A", "gender": "Female", "discipline": "1m",       "bracket": "16-18"},
    {"event_id": "1260", "age_group": "Group A", "gender": "Female", "discipline": "3m",       "bracket": "16-18"},
    {"event_id": "1270", "age_group": "Group A", "gender": "Female", "discipline": "Platform",  "bracket": "16-18"},
    {"event_id": "1390", "age_group": "Group B", "gender": "Male",   "discipline": "1m",       "bracket": "14-15"},
    {"event_id": "1400", "age_group": "Group B", "gender": "Male",   "discipline": "3m",       "bracket": "14-15"},
    {"event_id": "1410", "age_group": "Group B", "gender": "Male",   "discipline": "Platform",  "bracket": "14-15"},
    {"event_id": "1220", "age_group": "Group B", "gender": "Female", "discipline": "1m",       "bracket": "14-15"},
    {"event_id": "1230", "age_group": "Group B", "gender": "Female", "discipline": "3m",       "bracket": "14-15"},
    {"event_id": "1240", "age_group": "Group B", "gender": "Female", "discipline": "Platform",  "bracket": "14-15"},
]
ROUND_LABEL = {"1": "Prelim", "9": "Final"}
ROUND_EVENTNAME_SUFFIX = {"1": "(Prelim / Quarterfinal)", "9": "(Final)"}
GENDER_WORD = {"Male": "Boys", "Female": "Girls"}

CATEGORY_LABEL = {
    "1": "1 Forward", "2": "2 Back", "3": "3 Reverse",
    "4": "4 Inward", "5": "5 Twister", "6": "6 Armstand",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def fetch(url, referer=None, attempts=3):
    headers = dict(HEADERS)
    if referer:
        headers["Referer"] = referer
    last_err = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code == 403 and i < attempts - 1:
                time.sleep(6 + i * 4)
                continue
            raise
        except Exception as e:
            last_err = e
            if i < attempts - 1:
                time.sleep(4)
                continue
            raise
    raise last_err

PROFILE_RX = re.compile(r'/Profile/(\d+)"[^>]*>([^<]+)</a>')
TEAM_RX = re.compile(r'/TeamProfile/(\d+)"[^>]*>([^<]+)</a>')
SHEET_LINK_RX_TMPL = r'DiveSheetResults/{meet}/{event}/{rnd}/(\d+)/(\d+)'
ROW_MARKER = '<div class="row rowback border">'

def parse_event_results(html, meet, event, rnd):
    """Return list of {profile_id, name, team, sheet_key} for every diver in this round.
    EventResults rows are self-contained blocks (name link, team link, place, then the
    DiveSheetResults-linked score) — split on the row marker and extract each field from
    its own chunk rather than window-searching, which silently matched zero names against
    the DiveSheets entrant-list markup (different page, "name -- team" joined on one line;
    EventResults keeps them in separate divs)."""
    sheet_rx = re.compile(SHEET_LINK_RX_TMPL.format(meet=re.escape(meet), event=re.escape(event), rnd=re.escape(rnd)))
    out, seen = [], set()
    for chunk in html.split(ROW_MARKER)[1:]:
        sm = sheet_rx.search(chunk)
        if not sm:
            continue
        pid, key = sm.group(1), sm.group(2)
        if pid in seen:
            continue
        seen.add(pid)
        pm = PROFILE_RX.search(chunk)
        tm = TEAM_RX.search(chunk)
        name = " ".join(pm.group(2).replace("&amp;", "&").split()) if pm else ""
        team = " ".join(tm.group(2).replace("&amp;", "&").split()) if tm else ""
        out.append({"profile_id": pid, "sheet_key": key, "name": name, "team": team})
    return out

def parse_dive_sheet(html):
    """Return list of dive-row dicts from a DiveSheetResults page (empty list if unparseable)."""
    chunks = html.split('<div class="row rowback border">')
    rows = []
    for chunk in chunks[1:]:
        fs = re.findall(r'class="fullsize">(.*?)</div>', chunk, re.S)
        if len(fs) != 9:
            continue  # totals row (fewer/other fields) or trailing junk — stop collecting dives
        clean = [re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', x)).strip() for x in fs]
        try:
            dive_order = int(clean[0])
        except ValueError:
            continue
        try:
            rows.append({
                "dive_order": dive_order,
                "dive_number": clean[1],
                "height": clean[2],
                "description": clean[3],
                "net_score": float(clean[4]) if clean[4] else None,
                "dd": float(clean[5]) if clean[5] else None,
                "score": float(clean[6]) if clean[6] else None,
                "round_place": float(clean[7]) if clean[7] else None,
                "opt_vol": clean[8].strip()[:1].upper() or None,
            })
        except (ValueError, IndexError):
            continue
    return rows

def write_diag(payload):
    try:
        import psycopg2
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO app_meta.config (key, value, description)
               VALUES ('trials_divesheets_last_run', %s, 'Last Trials dive-sheet scrape outcome')
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
            (json.dumps(payload)[:8000],))
        conn.commit(); cur.close(); conn.close()
    except Exception as e:
        print(f"  (diagnostic write failed: {e})", file=sys.stderr)

def main():
    import psycopg2
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    total_dives = 0
    total_divers = 0
    event_failures = []
    diver_failures = []
    events_done = 0

    for ev in EVENTS:
        if EVENT_FILTER and ev["event_id"] not in EVENT_FILTER:
            continue
        for rnd in ROUND_FILTER:
            event_name = f"{ev['age_group']} {GENDER_WORD[ev['gender']]} {ev['discipline']} ({ev['bracket']}) {ROUND_EVENTNAME_SUFFIX[rnd]}"
            er_url = f"https://new.divemeets.com/EventResults/{MEET_ID}/{ev['event_id']}/{rnd}"
            print(f"== {event_name} ({er_url})")
            try:
                er_html = fetch(er_url, referer=f"https://new.divemeets.com/MeetResults/{MEET_ID}")
            except Exception as e:
                event_failures.append({"event": ev["event_id"], "round": rnd, "error": str(e)[:200]})
                print(f"   FAILED to fetch EventResults: {e}")
                continue
            time.sleep(1.2)

            divers = parse_event_results(er_html, MEET_ID, ev["event_id"], rnd)
            print(f"   {len(divers)} divers found")
            if not divers:
                event_failures.append({"event": ev["event_id"], "round": rnd, "error": "0 divers parsed"})
                continue

            for dv in divers:
                sheet_url = (f"https://new.divemeets.com/DiveSheetResults/{MEET_ID}/{ev['event_id']}/"
                             f"{rnd}/{dv['profile_id']}/{dv['sheet_key']}")
                try:
                    sheet_html = fetch(sheet_url, referer=er_url)
                except Exception as e:
                    diver_failures.append({"event": ev["event_id"], "round": rnd,
                                            "profile_id": dv["profile_id"], "error": str(e)[:150]})
                    time.sleep(1.5)
                    continue

                dive_rows = parse_dive_sheet(sheet_html)
                if not dive_rows:
                    diver_failures.append({"event": ev["event_id"], "round": rnd,
                                            "profile_id": dv["profile_id"], "error": "0 dives parsed"})
                    time.sleep(1.5)
                    continue

                for d in dive_rows:
                    cat_code = d["dive_number"][:1] if d["dive_number"] and d["dive_number"][0].isdigit() else None
                    cur.execute(
                        """INSERT INTO core.dive_sheets
                             (meet_id,event_id,result_set_id,diver_id,sheet_key,dive_order,dive_number,
                              height,description,dd,score,net_score,round_place,optional_voluntary,
                              judges_scores,running_total_points,diver_name,team_name,event_name,
                              gender,discipline,round_stage,competition_family,competition_group,
                              ncaa_division,meet_year,dive_category_code,dive_category_label)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                                   NULL,NULL,%s,%s,%s,%s,%s,%s,%s,%s,NULL,%s,%s,%s)
                           ON CONFLICT (meet_id,event_id,result_set_id,diver_id,sheet_key,dive_order)
                           DO UPDATE SET
                             dive_number=EXCLUDED.dive_number, height=EXCLUDED.height,
                             description=EXCLUDED.description, dd=EXCLUDED.dd, score=EXCLUDED.score,
                             net_score=EXCLUDED.net_score, round_place=EXCLUDED.round_place,
                             optional_voluntary=EXCLUDED.optional_voluntary,
                             diver_name=EXCLUDED.diver_name, team_name=EXCLUDED.team_name,
                             event_name=EXCLUDED.event_name, gender=EXCLUDED.gender,
                             discipline=EXCLUDED.discipline, round_stage=EXCLUDED.round_stage,
                             dive_category_code=EXCLUDED.dive_category_code,
                             dive_category_label=EXCLUDED.dive_category_label""",
                        (MEET_ID, ev["event_id"], rnd, dv["profile_id"], dv["sheet_key"],
                         d["dive_order"], d["dive_number"], d["height"], d["description"],
                         d["dd"], d["score"], d["net_score"], d["round_place"], d["opt_vol"],
                         dv["name"], dv["team"], event_name,
                         ev["gender"], ev["discipline"], ROUND_LABEL[rnd],
                         "USA Diving", "USA Diving Junior World Championships Trials",
                         2026, cat_code, CATEGORY_LABEL.get(cat_code)))
                conn.commit()
                total_dives += len(dive_rows)
                total_divers += 1
                time.sleep(1.5)  # politeness between dive-sheet fetches

            events_done += 1
            print(f"   done: {total_divers} divers / {total_dives} dives so far")

    cur.close(); conn.close()
    diag = {
        "ok": not event_failures and len(diver_failures) < total_divers * 0.1 if total_divers else False,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "events_done": events_done, "total_divers": total_divers, "total_dives": total_dives,
        "event_failures": event_failures[:10], "diver_failure_count": len(diver_failures),
        "diver_failures_sample": diver_failures[:10],
        "round_filter": ROUND_FILTER, "event_filter": sorted(EVENT_FILTER) if EVENT_FILTER else "all",
    }
    write_diag(diag)
    print(json.dumps(diag, indent=2))

if __name__ == "__main__":
    main()
