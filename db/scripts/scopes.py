#!/usr/bin/env python3
"""
scopes.py — the one definition of competitive scope.

Why this exists
---------------
The scope CASE expression was copy-pasted into seven SQL statements across
build_analytics.py and build_meet_layer.py, and mirrored an eighth time in
JavaScript in ae-field.js. Eight copies of one rule is not a rule, it is eight
rules that happen to agree today.

They also hid a real error. Everything under competition_family='World
Aquatics' was bucketed as 'world', which put the World Championships and the
American Cup in the same reference population. Men's platform podium averages,
6-dive, from core.result_phases:

    World Cup 2025 Super Final    538.0
    World Cup 2026 Super Final    529.3
    World Cup 2026                525.0
    World Championships 2025      520.7
    World Cup 2025                496.9
    2026 American Cup             459.2
    2025 American Cup             387.9

A 150-point spread inside one scope. Blending them pulls the "world podium"
bar down by roughly 30 points, so every athlete measured against it looked
closer to a world podium than they are. Nothing was arithmetically wrong; the
population was.

The split
---------
  world      championship-level: World Championships, Olympic Games, and the
             World Cup series including its Super Final
  world-inv  everything else World Aquatics sanctions — American Cup today,
             Grand Prix legs as they land

Unrecognised World Aquatics meets default to world-inv, NOT world. Under-
inclusion is visible: a thin championship band trips the sample-size guard and
shows as thin. Contamination is invisible and silently moves the bar. When a
new championship appears, add it to CHAMPIONSHIP_PATTERNS.
"""

# Matched case-insensitively against the meet name. Deliberately narrow.
CHAMPIONSHIP_PATTERNS = [
    "%World Aquatics Championships%",
    "%World Championships%",
    "%Olympic%",
    "%World Cup%",
]


def meet_scope_ddl():
    """Rebuild analytics.meet_scope: one row per meet, carrying its world tier.

    core.dive_sheets holds meet_id but no meet_name, so the tier cannot be
    derived inline there. This table is the shared lookup both families of
    query resolve against, which is also what makes the rule editable in one
    place rather than seven.
    """
    likes = " OR ".join("n.meet_name ILIKE '%s'" % p for p in CHAMPIONSHIP_PATTERNS)
    return [
        "DROP TABLE IF EXISTS analytics.meet_scope",
        """CREATE TABLE analytics.meet_scope AS
           WITH n AS (
             SELECT meet_id,
                    MAX(meet_name) AS meet_name,
                    MAX(competition_family) AS competition_family
             FROM core.result_phases
             WHERE meet_id IS NOT NULL
             GROUP BY meet_id)
           SELECT n.meet_id, n.meet_name, n.competition_family,
                  CASE WHEN n.competition_family <> 'World Aquatics' THEN NULL
                       WHEN %s THEN 'world'
                       ELSE 'world-inv' END AS world_tier
           FROM n""" % likes,
        "CREATE INDEX idx_meetscope ON analytics.meet_scope (meet_id)",
        "CREATE INDEX idx_meetscope_tier ON analytics.meet_scope (world_tier)",
    ]


# Dropped into every scope CASE ahead of the plain World Aquatics arm. A small
# IN-list against an indexed 2k-row table, so it costs nothing and needs no
# join added to the surrounding query.
WORLD_INV_ARM = ("WHEN competition_family='World Aquatics' "
                 "AND meet_id IN (SELECT meet_id FROM analytics.meet_scope "
                 "WHERE world_tier='world-inv') THEN 'world-inv'\n            ")


def ensure(sql):
    """Build analytics.meet_scope. Safe to call from any script, any order."""
    for stmt in meet_scope_ddl():
        sql(stmt)
