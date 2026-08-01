# Seed generator — crawl becomes the source of the seeds

Plan #2: the DiveMeets crawl generates `db/seeds/*.csv`, so the existing
`neon-seed-criteria.yml` pipeline runs unchanged and every app picks the crawl
data up through `core.*` with no new plumbing.

## Run it

```
DATABASE_URL="$NEON_DATABASE_URL" python3 db/scripts/seedgen/generate_seeds.py --out db/seeds
```

Talks to Neon over the HTTP `/sql` endpoint rather than the postgres wire
protocol, so it runs the same way in CI and in a sandbox. `--only 11522,12068`
restricts to specific meets for differential testing; `--limit-meets N` takes
the N most recent.

## It never regresses

The crawl has not finished dive sheets everywhere — NCAA sheets are ~47 of 380
— while the old pipeline already captured some of them. Meet 11522 (2025 NCAA
Div I Women's) is the worked example: `sheets_done = false` in the crawl but
1,083 dive rows in the seed. A wholesale replace would delete them and
downgrade 191 phase rows to "Result-only".

So the generator merges. Any dive sheet the crawl has not reached is kept from
the seed, the phase arithmetic that depends on it is restored, and every seed
row whose key the generator does not produce — including all `WA-*` World
Aquatics rows, which have no DiveMeets source — is carried through untouched.

## Verification

Run these before trusting output. Each compares against the existing seed,
which is what the live apps read today.

| script | what it proves | result |
|---|---|---|
| `verify_classify.py` | title -> gender/discipline/age_group/event_level/round_stage/is_synchronized | round_stage 100%, is_synchronized 100%, discipline 99.91%, gender 99.67%, event_level 99.63% (residual = the approved normalisation only) |
| `verify_pools_full.py` | regeneration does not move Standards Studio pool membership | **juniorAB 0 flips, ncaa 0 flips**; seniorUsa +445, all one-directional and synchro-only |
| `verify_phase.py` | phase score reconstruction from dives | count / dd_sum / from_dives / mode all 100% of 5,393 rows |
| `ncaa5cat.py` | the 8 NCAA women's springboard 5-category columns | 100% of 239 adjusted rows, exact note text included |
| `verify_generated.py` | end-to-end row diff of generator output vs seed | only expected columns differ |

Meet classifier: `competition_family` 523/523, `ncaa_division` 523/523,
`competition_group` 522/523 (the one residual is the intentional
normalisation of meet 6995).

## Deliberate differences from the current seed

1. **Senior synchro is normalised to `Senior/Open`.** The stored value is
   inconsistent — "Synchronized Women 3m (Final)" is `Other` in meet 5337 and
   `Senior/Open` in meet 11547, both USA Diving Nationals — so there was no
   value to reproduce, only one to choose. Signed off by Mike 2026-08-01.
   Moves `seniorUsa` by +445 rows of 6,656; nothing leaves the pool.
2. **`event_round` carries the full event title.** The seed stores bare round
   labels ("Final") on newer rows; the crawl has "Group A Girls 3m (16-18)
   (Final)". Verified identical on all 118,868 legacy rows.
3. **Failed dives are no longer dropped.** The old pipeline silently discarded
   zero-scored dives; the crawl keeps them. Correct — a balked dive is a real
   dive and its DD belongs in list-DD analytics — but it raises
   `phase_dive_count` and `phase_dd_sum` on affected rows, which feeds
   `analytics.field_list_dd` and `analytics.field_group_exec`.
4. **`source_system` becomes `divemeets_crawl`** instead of `usa_YYYY.db`.

## Two bugs the differential caught that would have broken the load

- DiveMeets stores exhibition entries as the literal string `Exhibition` in
  `place`. `core.result_phases.place` is numeric, so a raw passthrough fails
  the COPY. `clean_place()` blanks non-numeric values, matching the seed.
- The crawl leaves `team_name` empty where the old pipeline wrote
  `Unattached`. `clean_team()` restores that.

## Not done yet

- `core_event_results.csv` is NOT regenerated. Its Junior Circuit
  classification — `stage`, `event_key`, `is_junior_circuit`, `region`,
  `zone`, `ewc_meet` — has not been reverse-engineered or tested, and 631 of
  its 46,715 rows have no crawl counterpart, so it needs the same
  merge-and-verify treatment before anything touches it.
- No workflow is wired up and the generator has not been run at full scale.
  Running it rewrites the canonical dataset behind every app, so that should
  be a deliberate, reviewed step.
