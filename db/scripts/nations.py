#!/usr/bin/env python3
"""
nations.py — canonical nation resolution for USA Diving apps.

core.dive_sheets carries team_name from several sources with different
conventions: 2025 World Aquatics rows use IOC three-letter codes, 2026 rows
use full English names, and USA Diving rows carry club names. Nation-level
analysis silently splits every country in half until these are reconciled.

resolve() returns an IOC code, or None when the value is a club rather than
a nation. Unknown values are never guessed — they surface for review.
"""
import re

# IOC code -> canonical English name. Covers every value seen in the data
# plus the rest of the diving world so future ingests land cleanly.
IOC = {
    "ARG": "Argentina", "ARM": "Armenia", "AUS": "Australia", "AUT": "Austria",
    "AZE": "Azerbaijan", "BLR": "Belarus", "BEL": "Belgium", "BRA": "Brazil",
    "BUL": "Bulgaria", "CAN": "Canada", "CHI": "Chile", "CHN": "China",
    "COL": "Colombia", "CRC": "Costa Rica", "CRO": "Croatia", "CUB": "Cuba",
    "CYP": "Cyprus", "CZE": "Czechia", "DEN": "Denmark", "DOM": "Dominican Republic",
    "ECU": "Ecuador", "EGY": "Egypt", "ESA": "El Salvador", "EST": "Estonia",
    "FIN": "Finland", "FRA": "France", "GEO": "Georgia", "GER": "Germany",
    "GBR": "Great Britain", "GRE": "Greece", "GUA": "Guatemala", "HAI": "Haiti",
    "HKG": "Hong Kong, China", "HUN": "Hungary", "INA": "Indonesia", "IND": "India",
    "IRI": "Iran", "IRL": "Ireland", "ISR": "Israel", "ITA": "Italy",
    "JAM": "Jamaica", "JPN": "Japan", "KAZ": "Kazakhstan", "KOR": "Republic of Korea",
    "LAT": "Latvia", "LTU": "Lithuania", "LUX": "Luxembourg", "MAC": "Macau, China",
    "MAS": "Malaysia", "MEX": "Mexico", "MDA": "Moldova", "MGL": "Mongolia",
    "NED": "Netherlands", "NZL": "New Zealand", "PRK": "DPR Korea", "NOR": "Norway",
    "PAN": "Panama", "PER": "Peru", "PHI": "Philippines", "POL": "Poland",
    "POR": "Portugal", "PUR": "Puerto Rico", "QAT": "Qatar", "ROU": "Romania",
    "RUS": "Russia", "RSA": "South Africa", "SGP": "Singapore", "SVK": "Slovakia",
    "SLO": "Slovenia", "ESP": "Spain", "SWE": "Sweden", "SUI": "Switzerland",
    "TPE": "Chinese Taipei", "THA": "Thailand", "TUR": "Turkey", "UKR": "Ukraine",
    "USA": "United States", "UZB": "Uzbekistan", "VEN": "Venezuela", "VIE": "Vietnam",
    "ZIM": "Zimbabwe", "SRB": "Serbia", "NAM": "Namibia", "KSA": "Saudi Arabia",
    "UAE": "United Arab Emirates", "AND": "Andorra", "ISL": "Iceland",
}

# Full names and historical / alternate spellings -> IOC code.
ALIAS = {
    "united states": "USA", "united states of america": "USA", "usa": "USA",
    "great britain": "GBR", "united kingdom": "GBR", "britain": "GBR",
    "republic of korea": "KOR", "south korea": "KOR", "korea": "KOR",
    "dpr korea": "PRK", "north korea": "PRK", "korea dpr": "PRK",
    "chinese taipei": "TPE", "taiwan": "TPE",
    "hong kong, china": "HKG", "hong kong": "HKG",
    "macau, china": "MAC", "macao": "MAC", "macau": "MAC",
    "people's republic of china": "CHN", "china": "CHN",
    "czech republic": "CZE", "czechia": "CZE",
    "russian federation": "RUS", "russia": "RUS",
    "islamic republic of iran": "IRI", "iran": "IRI",
    "south africa": "RSA", "netherlands": "NED", "holland": "NED",
    "new zealand": "NZL", "switzerland": "SUI", "germany": "GER",
    "türkiye": "TUR", "turkiye": "TUR", "turkey": "TUR",
    "viet nam": "VIE", "vietnam": "VIE",
    "moldova": "MDA", "republic of moldova": "MDA",
}
for code, name in IOC.items():
    ALIAS.setdefault(name.lower(), code)

# Values that look like nations but are not, or that we refuse to guess.
UNRESOLVED_NOTE = {
    "NAB": "not an IOC code; 408 dives across 38 divers, 2025-26 — needs review",
}


def resolve(raw):
    """team_name -> (ioc_code | None, reason)."""
    if raw is None:
        return None, "null"
    s = str(raw).strip()
    if not s:
        return None, "empty"
    up = s.upper()
    if up in UNRESOLVED_NOTE:
        return None, "unresolved:" + UNRESOLVED_NOTE[up]
    if len(s) == 3 and up in IOC:
        return up, "ioc"
    low = re.sub(r"\s+", " ", s.lower())
    if low in ALIAS:
        return ALIAS[low], "alias"
    if len(s) == 3 and up.isalpha():
        return None, "unknown-3letter"
    return None, "club-or-unknown"


def canonical_name(code):
    return IOC.get(code)
