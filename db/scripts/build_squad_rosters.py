#!/usr/bin/env python3
"""
Capture the published squad rosters and measure what they actually entered.

WHY
    Several prequalification pathways are roster decisions, not placements, so
    they cannot be derived from results. They are published by name on the USA
    Diving site, though, and once we hold the names we can do something better
    than count them: match them against the per-diver entrant list and measure
    how many events each actually entered.

    That matters because these pathways grant eligibility in ALL events. The
    number of athlete-event places they produce is therefore behavioural, not
    rule-determined — a squad of 35 does not mean 35 entries, nor 35 x 6. Only
    the entrant list can say.

SOURCES (rosters retrieved 2026-08-04, names only)
    Tier 3 Junior High Performance Squad
        https://www.usadiving.org/tier-3-juniors
    2026 USA Diving National Team
        https://www.usadiving.org/news/2026/february/18/usa-diving-announces-national-team
        Selected on 2025 Winter Nationals: top 4 in each individual Olympic
        event, plus Olympic synchro winners and teams within 3% of the winner.

Only names are stored. Hometown and club are published alongside but are not
needed here and are left out.

Env: DATABASE_URL (Neon). Writes membership-analytics/squad-rosters.json
"""
import json
import os
import re
import sys
import datetime
import unicodedata

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "membership-analytics", "squad-rosters.json")

TIER3_JUNIOR = [
    "Olivia Astrologes", "Ivor Brown", "Alden Charette", "Avery Cowan",
    "Leyton Dean", "Quinn Fidanza", "Callie Fox", "Cristiano Garcia",
    "Nathaniel Grannis", "Molly Gray", "Ella Guo", "Emma Guo",
    "Sophia Hoffman", "Noah Horwitz", "Kayla Jensen", "Lindy Johnson",
    "Ava Jolley", "Gianna Kenrick", "Evan Kerim", "Thibault Lede",
    "Victoria Li", "Noah Lieberman", "Mason Mankey", "Jacob Mannarino",
    "Hannah McLaughlin", "Jackson Monus", "Sophia Narbut", "Colby Novick",
    "Katie Parker", "Juliet Radich", "Rydan Russell", "Raine Rutter",
    "Mik Schwickert", "Gage Sprintz", "Evelyn Wang",
]

NATIONAL_TEAM = [
    "Drew Bennett", "Bayleigh Cranford", "Max Flory", "Josh Hedberg",
    "Quinn Henninger", "Kyndal Knight", "Anna Kwong", "Sophie McAfee",
    "ElliReese Niday", "Margo O'Meara", "Ella Roselli", "Jack Ryan",
    "Jordan Rzepka", "Luke Sitz", "Josh Sollenberger", "Carson Tyler",
    "Sophie Verzyl",
]

# 2024 U.S. Olympic Diving Team, Paris. Ten named at selection, plus Brandon
# Loschiavo added by World Aquatics reallocation the day before the Games.
# Per-event mapping recorded because the criterion reads "in their OLY events";
# note the individual Olympic events are 3m and 10m only — 1m is not an
# Olympic event — so a synchro-only Olympian may take nothing from this
# pathway on the individual side. That reading is an interpretation and is
# flagged rather than assumed; the measured entries below sidestep it.
OLYMPIC_2024 = [
    "Sarah Bacon", "Andrew Capobianco", "Kassidy Cook", "Tyler Downs",
    "Greg Duncan", "Alison Gibson", "Jessica Parratto", "Delaney Schnell",
    "Carson Tyler", "Daryn Wright", "Brandon Loschiavo",
]

# Tier 1 High Performance Squad, from the still-live tier-1 page. The page
# carries NO year label, so the vintage is unverified: it is presumed to be the
# final (2024-25) squad, since the National Team replaced Tier 1/2/3 Senior in
# February 2026. Treated as indicative, not authoritative.
TIER1_HPS = [
    "Sarah Bacon", "Grayson Campbell", "Andrew Capobianco", "Kassidy Cook",
    "Tyler Downs", "Joshua Hedberg", "Quinn Henninger", "Hailey Hernandez",
    "Krysta Palmer", "Jack Ryan", "Delaney Schnell", "Carson Tyler",
    "Sophie Verzyl", "Daryn Wright",
]

# NOT captured, deliberately:
#   Tier 2 HPS  — the tier-2 page now returns 404. A cached search snippet
#                 showed five names but was truncated mid-list. A partial
#                 roster is worse than none here: it would look authoritative
#                 and undercount the pathway.
#   Tier 3 Senior HPS — no published roster found.

SQUADS = [
    {"key": "tier3_junior", "label": "2025-26 Tier III Junior High Performance Squad",
     "names": TIER3_JUNIOR, "meets": ["12923"],
     "source": "https://www.usadiving.org/tier-3-juniors"},
    # The Junior squad is prequalified to Junior Nationals AND eligible in all
    # events at the Senior Championships, so it has to be measured twice.
    {"key": "tier3_junior_senior",
     "label": "2025-26 Tier III Junior HPS — at the Senior Championships",
     "names": TIER3_JUNIOR, "meets": ["12924", "12925"],
     "source": "https://www.usadiving.org/tier-3-juniors"},
    {"key": "olympic_2024", "label": "2024 U.S. Olympic Team (Paris)",
     "names": OLYMPIC_2024, "meets": ["12924", "12925"],
     "source": "https://www.nbcolympics.com/news/diving-101-us-olympic-roster-and-athlete-news",
     "caveat": "Per-event eligibility reading is an interpretation; entries are measured."},
    {"key": "tier1_hps", "label": "Tier 1 High Performance Squad (vintage unverified)",
     "names": TIER1_HPS, "meets": ["12924", "12925"],
     "source": "https://www.usadiving.org/tier-1",
     "caveat": "Page carries no year label. Presumed the final 2024-25 squad. "
               "Overlaps the National Team; the criterion covers only those NOT "
               "named to it, and additionally requires having competed at 2025 "
               "Nationals or Winter Nationals."},
    {"key": "national_team", "label": "2026 USA Diving National Team",
     "names": NATIONAL_TEAM, "meets": ["12924", "12925"],
     "source": "https://www.usadiving.org/news/2026/february/18/usa-diving-announces-national-team"},
]


def norm(s):
    """Fold to a comparable key. Handles 'Last, First' as well as 'First Last',
    strips accents, punctuation and middle initials."""
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    if "," in s:
        last, _, first = s.partition(",")
        s = f"{first.strip()} {last.strip()}"
    s = re.sub(r"[^a-z ]", "", s)
    parts = [p for p in s.split() if len(p) > 1]
    if len(parts) >= 2:
        parts = [parts[0], parts[-1]]      # first + last, drop middles
    return " ".join(parts)


def loose(key):
    """Surname plus first initial. Catches nicknames — Josh/Joshua,
    Mik/Mikolas — which an exact match misses and would otherwise report as
    'did not enter'. Only ever used when it resolves to exactly one candidate:
    this roster contains both Ella Guo and Emma Guo, who share a loose key."""
    parts = key.split()
    if len(parts) < 2:
        return None
    return f"{parts[-1]} {parts[0][0]}"


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    all_meets = sorted({m for s in SQUADS for m in s["meets"]})
    cur.execute("""
        SELECT meet_id_dm, diver_name, count(*)::int
        FROM junior_results.meet_entrants
        WHERE meet_id_dm = ANY(%s)
        GROUP BY 1,2""", (all_meets,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    by_meet, loose_meet = {}, {}
    for meet, name, n in rows:
        k = norm(name)
        by_meet.setdefault(meet, {})[k] = {"raw": name, "entries": int(n)}
        lk = loose(k)
        if lk:
            loose_meet.setdefault(meet, {}).setdefault(lk, []).append(k)
    for m in all_meets:
        got = by_meet.get(m, {})
        sample = [v["raw"] for v in list(got.values())[:3]]
        print(f"entrants for meet {m}: {len(got)} divers; sample names {sample}")
        if not got:
            print(f"  NOTE: no entrant rows for {m} — matching cannot run for it")

    out_squads = []
    for sq in SQUADS:
        matched, unmatched, entries = [], [], 0
        # Loose keys that more than one ROSTER member shares are unusable too.
        roster_loose = {}
        for n2 in sq["names"]:
            lk = loose(norm(n2))
            if lk:
                roster_loose.setdefault(lk, []).append(n2)
        fuzzy = []
        for name in sq["names"]:
            k = norm(name)
            hit, how = None, "exact"
            for m in sq["meets"]:
                h = by_meet.get(m, {}).get(k)
                if h:
                    hit = h
                    break
            if not hit:
                lk = loose(k)
                if lk and len(roster_loose.get(lk, [])) == 1:
                    for m in sq["meets"]:
                        cands = loose_meet.get(m, {}).get(lk, [])
                        if len(cands) == 1:
                            hit = by_meet[m][cands[0]]
                            how = "surname+initial"
                            break
            if hit:
                matched.append({"name": name, "entries": hit["entries"], "match": how})
                entries += hit["entries"]
                if how != "exact":
                    fuzzy.append(f"{name} -> {hit['raw']}")
            else:
                unmatched.append(name)
        rate = (len(matched) / len(sq["names"]) * 100) if sq["names"] else 0
        per = (entries / len(matched)) if matched else 0
        print(f"\n{sq['label']}")
        print(f"  roster {len(sq['names'])} | entered {len(matched)} ({rate:.0f}%) "
              f"| {entries} entries | {per:.2f} events each")
        if fuzzy:
            print(f"  matched on surname+initial: {fuzzy}")
        if unmatched:
            print(f"  did not enter (or name did not match): {unmatched}")
        out_squads.append({
            "key": sq["key"], "label": sq["label"], "source": sq["source"],
            "meets": sq["meets"], "roster": len(sq["names"]),
            "entered": len(matched), "match_rate_pct": round(rate, 1),
            "entries": entries, "events_per_athlete": round(per, 2),
            "caveat": sq.get("caveat"),
            "not_entered": unmatched,
            "fuzzy_matches": fuzzy,
            # A low match rate means the name matching is failing, not that the
            # squad stayed home. Surfaced so it cannot be mistaken for a finding.
            "reliable": rate >= 50,
        })

    out = {
        "generated": datetime.datetime.now(datetime.timezone.utc)
                             .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "retrieved": "2026-08-04",
        "note": "Squad pathways grant eligibility in ALL events, so the places "
                "they produce are behavioural, not rule-determined. Entries are "
                "measured against junior_results.meet_entrants, not assumed.",
        "squads": out_squads,
    }
    with open(TARGET, "w") as fh:
        json.dump(out, fh, indent=2)
    print(f"\nwrote {TARGET}")


if __name__ == "__main__":
    main()
