#!/usr/bin/env python3
"""
dive_taxonomy.py — canonical dive-number classifier for USA Diving apps.

Grounded in the 2026 USA Diving Technical Rulebook, Article 105.1:
  (a) a dive number is 3 or 4 numerals followed by a single letter
  (b) digit 1 = group: 1 Front, 2 Back, 3 Reverse, 4 Inward, 5 Twist, 6 Armstand
  (c) somersault digit = number of half somersaults (1 = 1/2, 3 = 1 1/2 ...);
      above 4 1/2 somersaults two digits are used (e.g. 1011C = forward 5 1/2)
  (d) groups 1-4: digit 2 = flying action (1) or none (0)
  (e) armstand: digit 2 = direction, 1 Front, 2 Back, 3 Reverse   <-- no 0
  (f) twisting: digit 2 = direction of takeoff, per (b)
  (g) twisting + armstand: final digit (if present) = half twists
  (h) letter = position: A straight, B pike, C tuck, D free

Skills (NOT rulebook dives) come from the Skills Bank, Art. 401.4 and
Art. 503.15(d), all assigned DD 1.0, plus the Group D platform lineup
allowance in Art. 302.2(a)(3) which permits 001/002 in ANY position.

Every code resolves to exactly one bucket. Nothing is ever silently dropped.
"""
import re

# ---------------------------------------------------------------- groups
GROUPS = {
    "1":  ("1",  "Forward"),
    "2":  ("2",  "Back"),
    "3":  ("3",  "Reverse"),
    "4":  ("4",  "Inward"),
    "51": ("51", "Forward twisting"),
    "52": ("52", "Back twisting"),
    "53": ("53", "Reverse twisting"),
    "54": ("54", "Inward twisting"),
    "61": ("61", "Armstand forward"),
    "62": ("62", "Armstand back"),
    "63": ("63", "Armstand reverse"),
}
SKILL      = ("SKILL", "Skill")
PARSE_ERR  = ("PARSE", "Unparseable (multi-dive string)")
UNKNOWN    = ("UNK",   "Unclassified")

# Skills Bank codes that ARE structurally valid dives (Art. 401.4 platform
# entries). Kept in their real dive group, but flagged so a Future Champions
# view can treat them as skills.
SKILL_BANK_VALID_DIVES = {"611A", "6111A", "621A", "6211A"}

# Explicit skill numerals (letter-agnostic).
SKILL_STEMS = {
    "001", "002", "003",   # entry lineups (Art. 302.2(a)(3): any position)
    "100", "200",          # forward / back jumps (Art. 401.4)
    "600", "620",          # armstand lineups (620A per Art. 503.15(d))
    "5101", "5102", "5104", "5201", "5203", "5205", "5301", "5303",  # twisting jumps
}

POS = {"A": "Straight", "B": "Pike", "C": "Tuck", "D": "Free"}

RX_G14  = re.compile(r"^([1-4])([01])(\d{1,2})([ABCD])$")   # 105B, 1011C
RX_G5   = re.compile(r"^5([1-4])(\d)(\d)([ABCD])$")          # 5152B
RX_G6   = re.compile(r"^6([1-3])(\d)(\d?)([ABCD])$")         # 612B, 6243D


def normalize(raw):
    """Uppercase, strip whitespace/periods, repair O-for-zero typos."""
    if raw is None:
        return ""
    s = str(raw).strip().upper().replace(" ", "").replace(".", "")
    # Leading letter O typed for zero (e.g. OO1B -> 001B)
    s = re.sub(r"^O+", lambda m: "0" * len(m.group(0)), s)
    # Over-padded zeros (0001D -> 001D) but never collapse a real code
    if re.match(r"^0{3,}\d[ABCD]$", s):
        s = "00" + s[-2:]
    return s


def is_wellformed(s):
    return bool(RX_G14.match(s) or RX_G5.match(s) or RX_G6.match(s))


def is_token(s):
    """A single classifiable unit: a rulebook dive OR a Skills Bank code."""
    if is_wellformed(s):
        return True
    if re.match(r"^00\d[ABCD]$", s):
        return True
    stem = s[:-1] if s and s[-1] in POS else s
    return stem in SKILL_STEMS and len(s) == len(stem) + 1


def looks_concatenated(s):
    """
    Scraper artifacts glue 2+ codes together (105B103B, 001A001B, 002A200C,
    103B101B103B101B). Detected by full segmentation: the string splits
    cleanly into two or more valid dive/skill tokens with nothing left over.
    """
    if len(s) < 8:
        return False
    n = len(s)
    # reach[i] = True when s[:i] segments into >=1 whole tokens
    reach = [False] * (n + 1)
    reach[0] = True
    parts = [0] * (n + 1)
    for i in range(1, n + 1):
        for j in range(max(0, i - 6), i):
            if reach[j] and is_token(s[j:i]):
                reach[i] = True
                parts[i] = max(parts[i], parts[j] + 1)
    return reach[n] and parts[n] >= 2


def classify(raw):
    """
    Returns dict:
      code        normalized dive number
      bucket      'dive' | 'skill' | 'parse_error' | 'unclassified'
      group_code  '1'..'4','51'..'54','61'..'63' | 'SKILL' | 'PARSE' | 'UNK'
      group_label human-readable
      position    Straight/Pike/Tuck/Free or None
      somersaults number of half somersaults (dives only)
      twists      number of half twists (groups 5/6 only)
      flying      True/False (groups 1-4)
      skill_bank  True when listed in the Art. 401.4 / 503.15(d) Skills Bank
    """
    s = normalize(raw)
    out = {"code": s, "bucket": "unclassified", "group_code": UNKNOWN[0],
           "group_label": UNKNOWN[1], "position": None, "somersaults": None,
           "twists": None, "flying": None, "skill_bank": False}
    if not s:
        return out

    out["position"] = POS.get(s[-1])

    # 1. concatenation artifacts first — they can contain valid substrings
    if looks_concatenated(s):
        out.update(bucket="parse_error", group_code=PARSE_ERR[0], group_label=PARSE_ERR[1])
        return out

    stem = s[:-1] if s and s[-1] in POS else s

    # 2. explicit Skills Bank / lineup stems
    if stem in SKILL_STEMS:
        out.update(bucket="skill", group_code=SKILL[0], group_label=SKILL[1], skill_bank=True)
        return out

    # 3. rulebook dives
    m = RX_G14.match(s)
    if m:
        g, fly, som, pos = m.groups()
        if int(som) == 0:                       # no somersault = a jump, not a dive
            out.update(bucket="skill", group_code=SKILL[0], group_label=SKILL[1])
            return out
        code, label = GROUPS[g]
        out.update(bucket="dive", group_code=code, group_label=label,
                   somersaults=int(som), flying=fly == "1")
        return out

    m = RX_G5.match(s)
    if m:
        direction, som, tw, pos = m.groups()
        if int(som) == 0:                       # twisting jump (5101 etc.)
            out.update(bucket="skill", group_code=SKILL[0], group_label=SKILL[1])
            return out
        code, label = GROUPS["5" + direction]
        out.update(bucket="dive", group_code=code, group_label=label,
                   somersaults=int(som), twists=int(tw))
        return out

    m = RX_G6.match(s)
    if m:
        direction, som, tw, pos = m.groups()
        if int(som) == 0:
            out.update(bucket="skill", group_code=SKILL[0], group_label=SKILL[1])
            return out
        code, label = GROUPS["6" + direction]
        out.update(bucket="dive", group_code=code, group_label=label,
                   somersaults=int(som), twists=int(tw) if tw else 0,
                   skill_bank=s in SKILL_BANK_VALID_DIVES)
        return out

    # 4. groups 5/6 with a malformed direction digit but zero somersaults.
    #    Art. 105.1(e)/(f) require direction 1-4 (twist) or 1-3 (armstand), so
    #    these are miskeyed — but a zero somersault digit still makes it a jump.
    if re.match(r"^[56]\d0\d?[ABCD]$", s):
        out.update(bucket="skill", group_code=SKILL[0], group_label=SKILL[1])
        return out

    # 5. leftover 00x-style lineups with unusual letters
    if re.match(r"^00\d[ABCD]?$", s):
        out.update(bucket="skill", group_code=SKILL[0], group_label=SKILL[1], skill_bank=True)
        return out

    return out


def group_of(raw):
    return classify(raw)["group_code"]
