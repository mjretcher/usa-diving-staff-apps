#!/usr/bin/env python3
"""
omega_ingest.py — load international dive sheets from OMEGA Timing PDFs.

Discovery: Wikipedia's "Diving at the <year> World Aquatics Championships"
articles cite the official OMEGA results PDF for every event. That is a far
more reliable index than guessing filename codes, and it is public.

Safety: every parsed dive is checked against independently recomputed OMEGA
arithmetic (drop two high, two low, sum the middle three, x DD). Rows that do
not reconcile are never loaded. A file whose pass rate falls below MIN_PASS is
rejected whole, on the assumption that PDF text extraction drifted rather than
that the sport changed.

Env:
  DATABASE_URL   required
  WIKI_PAGES     comma-separated Wikipedia titles
  DRY_RUN        "1" (default) parses and reports without writing
  MIN_PASS       minimum arithmetic pass rate to accept a file (default 0.95)
"""
import io
import os
import re
import sys
import time
import urllib.parse
import urllib.request

import psycopg2
import psycopg2.extras

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from omega_parse import parse, parse_header, check_arithmetic
from nations import resolve as resolve_nation
from dive_taxonomy import classify as classify_dive

UA = "Mozilla/5.0 (compatible; USADivingAnalytics/1.0)"
OMEGA_RX = re.compile(r"https?://(?:www\.)?omegatiming\.com/File/([0-9A-F]{20,40})\.pdf", re.I)
# Wikipedia cites exact Wayback snapshots for many of these. A known-good
# snapshot URL beats one we construct, so capture and prefer them.
ARCHIVE_RX = re.compile(
    r"(https?://web\.archive\.org/web/(\d{14})/https?://(?:www\.)?omegatiming\.com/File/"
    r"([0-9A-F]{20,40})\.pdf)", re.I)
DRY_RUN = os.environ.get("DRY_RUN", "1") != "0"
MIN_PASS = float(os.environ.get("MIN_PASS", "0.95"))


def log(m):
    print(m, flush=True)


TIMEOUT = int(os.environ.get("HTTP_TIMEOUT", "20"))
MAX_FILES = int(os.environ.get("MAX_FILES", "0")) or None
BUDGET_S = int(os.environ.get("BUDGET_S", "900"))
_started = time.time()


def _fetch(url, timeout):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def get(url, tries=2):
    for i in range(tries):
        try:
            return _fetch(url, TIMEOUT)
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(1.5)


def _looks_pdf(blob):
    return bool(blob) and blob[:5] == b"%PDF-"


def get_pdf(url, snapshots=(), year=None):
    """
    omegatiming.com stalls on datacenter IPs. Try it, then the exact Wayback
    snapshots Wikipedia cites, then a constructed one. Anything that is not
    actually a PDF is treated as a miss rather than parsed as garbage.
    """
    attempts = [(url, "omega")]
    for ts in snapshots:
        attempts.append((f"https://web.archive.org/web/{ts}id_/{url}", f"wb:{ts[:8]}"))
    attempts.append((f"https://web.archive.org/web/{year or 2019}id_/{url}", "wb:guess"))
    last = None
    for target, tag in attempts:
        archive = "web.archive" in target
        for attempt in range(3 if archive else 1):
            try:
                blob = _fetch(target, (TIMEOUT * 3) if archive else TIMEOUT)
                if _looks_pdf(blob):
                    return blob, tag
                last = ValueError("not a PDF (%d bytes)" % len(blob))
                break
            except Exception as e:
                last = e
                if archive and attempt < 2:
                    time.sleep(3 * (attempt + 1))
    raise last or ValueError("no source succeeded")


def discover(page):
    """Wikipedia article -> ordered unique OMEGA PDF urls."""
    url = ("https://en.wikipedia.org/w/index.php?action=raw&title="
           + urllib.parse.quote(page.replace(" ", "_")))
    html = get(url).decode("utf-8", "replace")
    snaps = {}
    for m in ARCHIVE_RX.finditer(html):
        snaps.setdefault(m.group(3).upper(), []).append(m.group(2))
    seen, out = set(), []
    for m in OMEGA_RX.finditer(html):
        code = m.group(1).upper()
        if code in seen:
            continue
        seen.add(code)
        out.append(("https://www.omegatiming.com/File/%s.pdf" % code,
                    code, sorted(snaps.get(code, []))))
    return out


def pdf_text(blob):
    import pdfplumber
    with pdfplumber.open(io.BytesIO(blob)) as pdf:
        return "\n".join((p.extract_text() or "") for p in pdf.pages)


def live_cursor(state):
    """Return a usable cursor, reconnecting if Neon dropped the socket."""
    try:
        state["cur"].execute("SELECT 1")
        return state["cur"]
    except Exception:
        try:
            state["conn"].close()
        except Exception:
            pass
        log("      (reconnecting to Neon)")
        state["conn"] = psycopg2.connect(os.environ["DATABASE_URL"])
        state["conn"].autocommit = False
        state["cur"] = state["conn"].cursor()
        return state["cur"]


def ingest_one(url, code, snapshots, state, stats, year_hint=None):
    try:
        blob, src = get_pdf(url, snapshots, year_hint)
        text = pdf_text(blob)
    except Exception as e:
        log(f"    FETCH FAILED {code}: {type(e).__name__}: {e}")
        stats["fetch_fail"] += 1
        return

    head = parse_header(text)
    rows, skipped = parse(text)
    if not rows:
        log(f"    [{src}] {code}: no dive rows parsed ({len(skipped)} lines skipped) — skipping")
        stats["no_rows"] += 1
        return

    if head.get("is_synchro"):
        log(f"    [{'skip':8}] {code}  synchro — individual analysis only")
        stats["synchro_skipped"] += 1
        return

    ok_rows, bad = [], 0
    for r in rows:
        good, _ = check_arithmetic(r)
        if good:
            ok_rows.append(r)
        elif good is False:
            bad += 1
    rate = len(ok_rows) / len(rows)
    label = (f"{head.get('meet_year')} {head.get('gender')} {head.get('discipline')} "
             f"{head.get('round_stage')}")
    if head.get("is_synchro"):
        label += " SYNCHRO"

    log(f"    [{src:8}] {code}  {label:34} rows={len(rows):4} ok={len(ok_rows):4} "
        f"bad={bad:3} pass={rate:.1%}")

    if rate < MIN_PASS:
        log(f"      REJECTED — arithmetic pass rate below {MIN_PASS:.0%}")
        stats["rejected"] += 1
        return
    if not (head.get("gender") and head.get("discipline") and head.get("round_stage")):
        log("      REJECTED — incomplete meet identity")
        stats["rejected"] += 1
        return

    meet_id = f"OM-{head['meet_year']}-{code[:14]}"
    event_id = f"{code[14:18]}"
    # core.dive_sheets.result_set_id is NOT NULL; one OMEGA document is exactly
    # one result set, so the document code is a natural stable key.
    result_set_id = f"OM-{code[:18]}"
    payload = []
    for i, r in enumerate(ok_rows):
        nat, _ = resolve_nation(r["nat"])
        slug = re.sub(r"[^A-Za-z0-9]", "", r["diver_name"] or "")[:24]
        tax = classify_dive(r["dive_number"])
        diver_id = f"OM-{code[:14]}-{slug}"
        sheet_key = f"{result_set_id}-{slug}"
        payload.append((
            meet_id, head["meet_year"], "World Aquatics", event_id, result_set_id,
            head.get("event_title") or label, head["gender"], head["discipline"],
            head["round_stage"], i + 1, r["dive_number"], None, None,
            r["dd"], r["score"], " ".join(str(j) for j in r["judges"]),
            r["running_total_points"],
            int(r["overall_rank"]) if (r["overall_rank"] or "").isdigit() else None,
            diver_id, sheet_key, r["diver_name"], r["nat"], nat,
            tax["code"], tax["bucket"], tax["group_code"], tax["group_label"],
        ))
    stats["rows"] += len(payload)
    stats["files"] += 1
    if DRY_RUN:
        return
    cur = live_cursor(state)
    # Idempotent: one OMEGA document is one result set, so clear it first.
    cur.execute("DELETE FROM core.dive_sheets WHERE result_set_id = %s", (result_set_id,))
    psycopg2.extras.execute_values(cur, """
        INSERT INTO core.dive_sheets
          (meet_id, meet_year, competition_family, event_id, result_set_id, event_name, gender,
           discipline, round_stage, dive_order, dive_number, height, description,
           dd, score, judges_scores, running_total_points, round_place,
           diver_id, sheet_key, diver_name, team_name, nation_code,
           dive_code_norm, dive_bucket, dive_group_code, dive_group_label)
        VALUES %s""", payload)
    state["conn"].commit()


def main():
    pages = [p.strip() for p in os.environ.get("WIKI_PAGES", "").split(",") if p.strip()]
    if not pages:
        sys.exit("WIKI_PAGES not set")
    log(f"OMEGA ingest — {len(pages)} page(s), DRY_RUN={DRY_RUN}, MIN_PASS={MIN_PASS:.0%}\n")

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    state = {"conn": conn, "cur": conn.cursor()}
    stats = dict(files=0, rows=0, rejected=0, fetch_fail=0, no_rows=0, synchro_skipped=0)

    for page in pages:
        log(f"  {page}")
        try:
            urls = discover(page)
        except Exception as e:
            log(f"    DISCOVERY FAILED: {e}")
            continue
        ym = re.search(r"(19|20)\d{2}", page)
        year_hint = ym.group(0) if ym else None
        log(f"    {len(urls)} OMEGA pdf(s) cited (year hint {year_hint})")
        if MAX_FILES:
            urls = urls[:MAX_FILES]
            log(f"    limited to first {len(urls)}")
        for url, code, snapshots in urls:
            if time.time() - _started > BUDGET_S:
                log("    TIME BUDGET REACHED — stopping early")
                stats["budget_stop"] = stats.get("budget_stop", 0) + 1
                break
            ingest_one(url, code, snapshots, state, stats, year_hint)
            time.sleep(0.3)


    log("\nSummary: " + ", ".join(f"{k}={v}" for k, v in stats.items()))
    if DRY_RUN:
        log("DRY RUN — nothing written. Set DRY_RUN=0 to load.")
    try:
        state["cur"].close(); state["conn"].close()
    except Exception:
        pass


if __name__ == "__main__":
    main()
