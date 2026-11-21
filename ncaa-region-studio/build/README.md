# NCAA Diving Region Studio

A map tool for the NCAA Division I diving zone realignment discussion. It is
not a USA Diving staff app and is not linked from the staff landing page. It
lives in this repo so it can use the same hosting and database.

Page: `ncaa-region-studio/index.html` (one self-contained file).
Saved maps: Neon table `ncaa.region_maps`, created in `db/schema.sql`.

## Rebuild the page

    cd ncaa-region-studio/build
    python3 build_page.py

That writes `../index.html` from `template.html` plus `data.json`,
`presets.json`, `hosts.json` and `states-albers-10m.json`. Edit the template,
never `index.html`.

## What the inputs are

- `data.json`: one row per school. Divers at zone meets by season 2015 to 2026
  (women, men, and each of the six events), zone prelim scores 2022 to 2026,
  state, city-level coordinates, conference and 2026-27 program status. It
  holds no athlete names.
  `top16` lists, for the 2025 and 2026 NCAA Championships, the school of each
  top-16 prelim finisher per event. Qualifying spots are 5 women's or 4 men's
  per region per event plus one per top-16 finisher. For the current zones the
  result matches the NCAA's published 2026 and 2027 tables in every cell; keep
  that check when adding a season.
- `presets.json`: the built-in maps. Two only: the current zones, and the final
  NCAA region proposal received 2026-11-21 (key `july`; same boundaries as the
  July 2026 draft). Eastern Michigan carries status `leaving` in `data.json`
  (diving in 2026-27, none after); Virginia is `nodive`. Both are named in the
  note at the top of the page with a button to leave them out.
- `hosts.json`: the 29 sites that hosted a zone meet, 2015 to 2027.
- `states-albers-10m.json`: US state shapes from us-atlas 3.0.1.

## Rebuild data.json from source

Scripts are in `source/`. They need `zone_results.csv`, which is not committed.
Pull it from Neon with:

    select extract(year from m.start_date)::int yr,
           substring(m.meet_name from 'ZONE ([A-E])') zone,
           r.meet_id, r.event_id, r.round, e.title, e.entries, r.place,
           r.diver_name, r.profile_id, r.team_name, r.team_id, r.score
    from divemeets.results r
    join divemeets.meets m using (meet_id)
    join divemeets.crawl_targets t using (meet_id)
    join divemeets.events e on e.meet_id = r.meet_id and e.event_id = r.event_id and e.round = r.round
    where t.tag = 'ncaa_zone'
    order by 1, 2, r.event_id, r.round, r.id

Then, in `source/`: `python3 build_data.py` (writes `../data.json`).

- `schools.py`: school table keyed by DiveMeets team id.
- `coaches_status.json`: institution, zone, conference and the no-diving flag
  from the 2026-27 Division I diving coaches list. Coach names and email
  addresses are deliberately left out.
- `coaches_match.py`: matches that list to the school table.
- `hosts.py`, `presets.py`, `optimize_adj.py`: host sites, built-in maps and
  state adjacency.

## Counting rules

A diver counts once per meet and gender if they have a result in any
preliminary of the six individual events. Team events and scratches are not
counted. A school belongs to the region of its state unless a map moves that
one school. Distances are straight lines between a school's city and the host.
