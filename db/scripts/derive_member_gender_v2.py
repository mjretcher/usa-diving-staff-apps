"""Derive gender for members the Junior-Circuit-only name match could not resolve.

The Webpoint export carries no gender field. The original derivation matched member
names against core.event_results (Junior Circuit only) and stored unambiguous
matches in membership.member_gender. This pass widens the evidence to every
results source that carries a name and a gender:

  core.event_results        every sanctioned DiveMeets result in the crawl, all years
  core.result_phases        the full DiveMeets phase crawl (all meets, all years)
  core.dive_sheets          dive-sheet rows (name + event gender)
  scoresandmore.event_results x meet_events   Dive Live results, event gender

Rules, same as the original pass: a member is resolved only if every source vote
for their normalised name agrees on one gender. Any conflict, or no vote, stays
unresolved. Mixed/synchro events cast no vote. Names are read here under the
owner connection because the browser role cannot read them; ONLY member_id,
gender, source and a counts-only summary are written.

Env: DATABASE_URL. Run by .github/workflows/derive-member-gender.yml.
"""
import json, os, re, sys, unicodedata
from collections import defaultdict
import psycopg2

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")
SOURCE = "name-match:all-results-v2"
SUFFIXES = {"jr", "sr", "ii", "iii", "iv"}


def norm(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("(ex.)", " ").replace("(ex)", " ")
    s = re.sub(r"[\u2018\u2019'`\-]", "", s)
    s = re.sub(r"[^a-z\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def key_from_parts(first, last):
    f, l = norm(first), norm(last)
    if not f or not l:
        return None
    f = f.split(" ")[0]
    lt = [t for t in l.split(" ") if t not in SUFFIXES]
    if not lt:
        return None
    return f + "|" + lt[-1]


def key_from_full(name):
    n = norm(name)
    toks = [t for t in n.split(" ") if t not in SUFFIXES]
    if len(toks) < 2:
        return None
    return toks[0] + "|" + toks[-1]


def g2(v):
    v = (v or "").strip().lower()
    if v in ("boys", "male", "men", "m", "b"):
        return "Boys"
    if v in ("girls", "female", "women", "w", "g", "f"):
        return "Girls"
    return None  # Mixed / unknown -> no vote


def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # --- unresolved eligible competition athletes, 2024-2026 ---
    cur.execute("""
        select distinct m.member_id, m.first_name, m.last_name
        from membership.members m
        left join membership.member_gender mg on mg.member_id = m.member_id
        where mg.member_id is null
          and m.membership_type in ('Competition Athlete (17U)','Competition Athlete (AQUA Age 18+)')
          and m.birth_date is not null
          and (m.membership_year - extract(year from m.birth_date)) <= 18
          and m.membership_year between 2024 and 2026
    """)
    members = cur.fetchall()
    print(f"unresolved eligible members: {len(members)}")

    # --- votes per normalised name key, per source ---
    votes = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))  # key -> source -> gender -> n

    cur.execute("select diver_first, diver_last, gender from core.event_results where diver_first is not null and diver_last is not null and gender is not null and not coalesce(is_synchro,false)")
    for f, l, g in cur:
        k, gg = key_from_parts(f, l), g2(g)
        if k and gg: votes[k]["core.event_results"][gg] += 1

    cur.execute("select diver_name, gender from core.result_phases where diver_name is not null and gender is not null and not coalesce(is_synchronized,false) and diver2_name is null")
    for n, g in cur:
        k, gg = key_from_full(n), g2(g)
        if k and gg: votes[k]["core.result_phases"][gg] += 1

    cur.execute("select distinct diver_name, gender from core.dive_sheets where diver_name is not null and gender is not null")
    for n, g in cur:
        k, gg = key_from_full(n), g2(g)
        if k and gg: votes[k]["core.dive_sheets"][gg] += 1

    cur.execute("""select r.diver_name, e.gender from scoresandmore.event_results r
                   join scoresandmore.meet_events e on e.event_id = r.event_id
                   where r.diver_name is not null and e.gender is not null and lower(coalesce(e.synchro,'')) not in ('true','t','1','yes','y','synchro')""")
    for n, g in cur:
        k, gg = key_from_full(n), g2(g)
        if k and gg: votes[k]["scoresandmore"][gg] += 1

    print(f"name keys with votes: {len(votes)}")

    resolved, conflicts, no_vote = [], 0, 0
    by_source_help = defaultdict(int)
    for member_id, first, last in members:
        k = key_from_parts(first, last)
        if not k or k not in votes:
            no_vote += 1
            continue
        genders = defaultdict(int); srcs = set()
        for src, gv in votes[k].items():
            for g, n in gv.items():
                genders[g] += n; srcs.add(src)
        if len(genders) != 1:
            conflicts += 1
            continue
        g = next(iter(genders))
        resolved.append((member_id, g, SOURCE))
        for s in srcs: by_source_help[s] += 1

    if resolved:
        cur.executemany(
            "insert into membership.member_gender (member_id, gender, source) values (%s, %s, %s) on conflict (member_id) do nothing",
            resolved)
        conn.commit()

    # --- counts-only summary ---
    cur.execute("""
        select m.membership_year,
               count(distinct m.member_id) as eligible,
               count(distinct m.member_id) filter (where mg.member_id is null) as unresolved,
               count(distinct m.member_id) filter (where mg.source = %s) as resolved_by_v2
        from membership.members m
        left join membership.member_gender mg on mg.member_id = m.member_id
        where m.membership_type in ('Competition Athlete (17U)','Competition Athlete (AQUA Age 18+)')
          and m.birth_date is not null
          and (m.membership_year - extract(year from m.birth_date)) <= 18
          and m.membership_year between 2024 and 2026
        group by 1 order by 1
    """, (SOURCE,))
    after = [{"year": y, "eligible": e, "unresolved": u, "resolvedByThisPass": r} for y, e, u, r in cur]
    summary = {
        "run": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "source": SOURCE,
        "candidates": len(members),
        "resolved": len(resolved),
        "conflictingVotes": conflicts,
        "noResultsUnderThatName": no_vote,
        "resolvedGenderSplit": {g: sum(1 for _, gg, _ in resolved if gg == g) for g in ("Boys", "Girls")},
        "sourcesThatContributed": dict(by_source_help),
        "byYearAfter": after,
        "note": "Only unambiguous matches are stored: every result source that has the name must agree on one gender. Names never leave the runner; only member_id, gender and this summary are written.",
    }
    os.makedirs("membership-analytics", exist_ok=True)
    with open("membership-analytics/gender-derivation-summary.json", "w") as f:
        json.dump(summary, f, indent=1)
    print(json.dumps(summary, indent=1))
    conn.close()


if __name__ == "__main__":
    main()
