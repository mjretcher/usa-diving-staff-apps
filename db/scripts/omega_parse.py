#!/usr/bin/env python3
"""
omega_parse.py — parse OMEGA Timing "Detailed Results" diving PDFs.

Omega is the official timekeeper for World Aquatics championships and the
Olympics. Their detailed-results PDFs carry more than DiveMeets publishes:
dive number, DD, every individual judge score, dive points, running total,
and an IOC nation code.

Row shapes handled:
  first dive of a diver     "1 XIE Siyi CHN 5154B 3.4 8.0 ... 81.60 =4 81.60 =4 6.80"
  subsequent dives          "5353B 3.3 8.5 ... 84.15 3 165.75 3 11.90"
  name wrapped over lines   "8 PACHECO MARRUFO" / "Rommel" / "MEX 5154B 3.4 ..."
  final dive of the leader  has no "points behind" trailing value

Judge panels are 7 at world level but 5 or 6 appear at smaller meets, so the
judge count is inferred rather than assumed. Nothing is guessed: a line that
does not match a known shape is returned in `skipped` for review.
"""
import re

DIVE_RX = re.compile(r"^(\d{3,4}[ABCD])$", re.I)
NAT_RX = re.compile(r"^[A-Z]{3}$")
NUM_RX = re.compile(r"^\d+(?:\.\d+)?$")
RANK_RX = re.compile(r"^=?\d+$")

# Lines that are page furniture, not data.
NOISE = re.compile(
    r"^(Rank|Name|NAT|Dive|No\.|DD|Judge|Points|Behind|Overall|Total|Event\s|Final|"
    r"Preliminary|Semifinal|Detailed Results|Official Timekeeping|Report Created|"
    r"Note:|Legend:|=\s|Page\s|\d{1,2}\s+\w{3}\s+\d{4})", re.I)


def _split_tail(tokens, n_judges):
    """
    tokens after DD: n_judges scores, dive points, dive rank, then optionally
    total points, overall rank, points behind.
    """
    if len(tokens) < n_judges + 2:
        return None
    judges = [float(t) for t in tokens[:n_judges]]
    rest = tokens[n_judges:]
    out = {
        "judges": judges,
        "dive_points": float(rest[0]),
        "dive_rank": rest[1].lstrip("="),
        "total_points": float(rest[2]) if len(rest) > 2 and NUM_RX.match(rest[2]) else None,
        "overall_rank": rest[3].lstrip("=") if len(rest) > 3 else None,
        "points_behind": float(rest[4]) if len(rest) > 4 and NUM_RX.match(rest[4]) else None,
    }
    return out


def _judge_count(tokens):
    """Judge scores are 0-10 in 0.5 steps and come before dive points (>10 usually).
    Count the leading run of plausible judge awards."""
    n = 0
    for t in tokens:
        if not NUM_RX.match(t):
            break
        v = float(t)
        if v > 10 or (v * 2) % 1 != 0:
            break
        n += 1
    # Panels are 3, 5, 6 or 7. A low dive-points value can itself look like a
    # judge award, so an over-count falls back to the largest legal panel.
    if n in (3, 5, 6, 7):
        return n
    if n > 7:
        return 7
    if n == 4:
        return 3
    return 0


def parse(text):
    """Returns (rows, skipped). Each row is one dive."""
    rows, skipped = [], []
    cur = {"rank": None, "name": None, "nat": None}
    pending_name = []

    for raw in text.splitlines():
        line = raw.strip()
        if not line or NOISE.match(line):
            continue
        tok = line.split()

        # --- new diver: "<rank> <NAME...> <NAT> <dive> <dd> ..."
        # A surname can be all-caps (XIE, LAUGHER), so the nation is only the
        # three-letter token that is immediately followed by a dive number.
        nat_at = next((i for i, t in enumerate(tok)
                       if NAT_RX.match(t) and i + 1 < len(tok) and DIVE_RX.match(tok[i + 1])),
                      None)
        starts_rank = RANK_RX.match(tok[0]) is not None

        if nat_at is not None and len(tok) > nat_at + 2:
            if starts_rank and nat_at > 0:
                cur = {"rank": tok[0].lstrip("="),
                       "name": " ".join(tok[1:nat_at]),
                       "nat": tok[nat_at]}
                pending_name = []
            else:
                # NAT line following a wrapped name
                cur = {"rank": cur.get("rank"),
                       "name": " ".join(pending_name) if pending_name else cur.get("name"),
                       "nat": tok[0]}
                pending_name = []
            body = tok[nat_at + 1:]
        elif DIVE_RX.match(tok[0]):
            body = tok                                  # continuation dive
        elif starts_rank and len(tok) > 1 and not any(NUM_RX.match(t) for t in tok[1:]):
            pending_name = tok[1:]                      # "8 PACHECO MARRUFO"
            cur["rank"] = tok[0].lstrip("=")
            continue
        elif not starts_rank and all(not NUM_RX.match(t) for t in tok):
            pending_name += tok                         # "Rommel"
            continue
        else:
            skipped.append(line)
            continue

        if len(body) < 3 or not DIVE_RX.match(body[0]):
            skipped.append(line)
            continue
        dive_number, dd_tok, tail = body[0], body[1], body[2:]
        if not NUM_RX.match(dd_tok):
            skipped.append(line)
            continue

        nj = _judge_count(tail)
        parsed = _split_tail(tail, nj) if nj else None
        if not parsed:
            skipped.append(line)
            continue

        rows.append({
            "rank": cur["rank"], "diver_name": cur["name"], "nat": cur["nat"],
            "dive_number": dive_number.upper(), "dd": float(dd_tok),
            "judges": parsed["judges"], "n_judges": nj,
            "score": parsed["dive_points"], "dive_rank": parsed["dive_rank"],
            "running_total_points": parsed["total_points"],
            "overall_rank": parsed["overall_rank"],
            "points_behind": parsed["points_behind"],
        })
    return rows, skipped


def check_arithmetic(row, tol=0.051):
    """
    Omega drops the high and low judge awards then multiplies by DD.
    7 judges: drop 2 high + 2 low, sum 3, x DD.  5 judges: drop 1 each, sum 3.
    Returns (ok, expected) so a bad parse cannot pass silently.
    """
    j = sorted(row["judges"])
    n = len(j)
    if n == 7:
        keep = j[2:5]
    elif n in (5, 6):
        keep = j[1:-1][:3] if n == 5 else j[2:-2]
    elif n == 3:
        keep = j
    else:
        return None, None
    expected = round(sum(keep) * row["dd"], 2)
    return abs(expected - row["score"]) <= tol, expected
