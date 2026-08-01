# Seed generator — verified foundation

Goal (plan #2): make the DiveMeets crawl the source of the `db/seeds/*.csv`
files, so the existing seed pipeline keeps running unchanged and every app
picks the crawl data up through `core.*` without new plumbing.

## Status

Built and proven:

- `classify.py` — derives `gender`, `discipline`, `age_group`, `event_level`,
  `round_stage`, `is_synchronized` from a DiveMeets event title plus meet
  context. Every rule was reverse-engineered from the existing seeds; none is
  guessed.
- `verify_classify.py` — differential test against 122,733 seed rows that have
  a matching crawl event. Current agreement: `round_stage` 100%,
  `is_synchronized` 100%, `discipline` 99.91%, `gender` 99.67%.
- `verify_pools.py` — the safety-critical test. Transcribes the three
  `POOLS[*].match()` predicates from `criteria-simulator/main.js` and checks
  whether regenerating the seed would change which rows Standards Studio
  admits to a pool. **`juniorAB` and `ncaa` are exactly invariant (0 flips).**
- `pull.py` — mirrors Neon tables into local SQLite for offline analysis.

## Facts established (all verified, not assumed)

- `event_round` == `divemeets.events.title` — exact on all 118,868 legacy rows.
- `result_set_id` == the crawl `round`. Round 1 -> Prelim, 5-8 -> Semifinal,
  9-11 -> Final. No other round numbers occur.
- `meet_name` == `divemeets.meets.meet_name` after whitespace normalisation
  (520/523 exact; 3 differ only by a doubled space).
- `meet_year` == year of `start_date`, 100%.
- `competition_group` == a canonical championship label for 35 meets, else the
  meet name.
- `core.dive_sheets` = seed CSV (31,957) + Trials scraper (2,686) = 34,643.
- `core.result_phases` = seed only. `core.event_results` = seed (46,715) +
  supplement (2,920) = 49,635.
- Only 631 of 46,715 `core_event_results` rows have no crawl counterpart
  (1.35%) — so that file must be regenerate-and-MERGE, never replace.

## Open decision before generation can run

`event_level` is not reproducible for senior synchro events. The identical
title "Synchronized Women 3m (Final)" is recorded as `Other` in meet 5337 and
`Senior/Open` in meet 11547 — both are "USA Diving Nationals". The current
value is an artifact of which scrape era produced the row, so no parser can
reproduce it and any regeneration necessarily normalises it. That moves
`seniorUsa` pool membership by a net 32 rows of 6,656 (0.5%), all synchro.

Not yet built: the phase-score reconstruction columns, the eight
`ncaa_women_springboard_*` 5-category columns, `dive_category_code/label`,
`ncaa_5cat_inclusion_status`, and the generator + workflow themselves.
