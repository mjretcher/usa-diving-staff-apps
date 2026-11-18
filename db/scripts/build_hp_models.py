#!/usr/bin/env python3
"""
build_hp_models.py -- the three High Performance models, rebuilt nightly into
the `hp_models` schema from core.dive_sheets / core.result_phases.

  Model 3  Scoring environment    hp_models.panel_environment, meet_environment,
                                  cohort_reference
  Model 4  Domestic -> World      hp_models.world_conversion_pairs, world_conversion_fit,
                                  world_cuts, world_standard_equiv
  Model 5  Age progression        hp_models.age_window, athlete_season_ppd, age_bands
  Model 6  Simulated totals        hp_models.sim_athlete (per athlete x board, Senior USA pool)

Every table carries method_version and built_at. The method is written to
hp_models.method (one row per model) in plain English so the apps can show it
next to the numbers. Selection-integrity rule: everything here is reproducible
from the versioned core tables with the code in this file; nothing is tuned by
hand.

Execution per dive = score / (3 x DD). Five-judge (drop 1+1) and seven-judge
(drop 2+2) panels both reduce to the middle three judges x DD, so this is the
mean execution award of the counted judges. Synchro rows are excluded from
everything (different scoring).

------------------------------------------------------------------------------
MODEL 3 -- scoring environment (what a meet's panel did to scores)
  exec(dive) = alpha(athlete, dive code, board, season) + pi(panel) + noise
  panel  = meet x event x round (one judging panel).
  alpha  = exact fixed effect; it is only identified when the athlete performed
           the same dive on 2+ panels in the season, so only those dives
           ("connected") inform pi. Panels link into components (season x
           cohort: e.g. women's 3m 2025). pi is centred within its component,
           so severity means "vs the typical panel judging this cohort that
           season". Shrinkage K_P = 20 dives toward 0. Alternating least
           squares to convergence (max |delta pi| < 1e-4).
  The model cannot separate strict judging from everyone diving worse under
  the same conditions; the effect is the meet's scoring environment, which is
  exactly the quantity needed to restate a score from one meet at another.
  Reliability (split-half correlation of pi, panels with 60+ dives): ~0.77.

MODEL 4 -- domestic season -> World Aquatics
  Pairs: US athletes linked DiveMeets <-> World Aquatics by exact name token
  match (analytics.athlete_directory.match_method = 'name_token_exact'), with a
  domestic senior season (event_level Senior/Senior-Open, USA Diving) and a
  World Aquatics PRELIMINARY in the same season. Domestic = season mean of
  non-cumulative scores; World = prelim score (mean if several events).
  Fit: ordinary least squares wa = a + b x domestic, plus the ratio wa/domestic.
  World cuts: 12th (final) and 18th (semi) prelim scores per WA event, from
  World Championships and World Cup stops (Super Finals and the American Cup
  are excluded: knockout format / weaker field).
  Standard equivalents: median cut12 across events / ratio; low/high use the
  ratio +/- one sd. This is the 50% line, not a guarantee.

MODEL 5 -- age progression
  Age window per athlete from junior group history: Group A = 16-18, B =
  14-15, C = 12-13, D = 8-11 (AQUA age: season year minus birth year). Each
  season's YOUNGEST group entered gives a birth-year interval (an athlete may
  dive up into an older group, never down, so the youngest group is the one
  that bounds age); the intersection across seasons is the window.
  Contradictory windows (mis-entered groups, other age rules) are kept with
  consistent = false and excluded from bands. Age =
  season - midpoint of the window; width is stored so the uncertainty shows.
  Metric: points per OPTIONAL dive = 3 x DD x exec, averaged over the
  athlete's optional dives in that season and board (voluntary dives carry an
  assigned DD and would understate difficulty). Bands = percentiles of all
  athlete-seasons with window width <= 2 and 6+ optional dives, per gender x
  board x age, published only where n >= 40.

MODEL 6 -- simulated totals (how often an athlete clears a standard)
  Pool: athletes with an individual result at a US senior championship meet in
  the last two seasons, per gender x board. List: the athlete's most recent
  round in the senior format (women 5 / men 6 optional dives, distinct dive
  codes); if none, built from their best optional dive per dive group by
  expected points (men may use a group twice).
  Each dive's execution is drawn from the athlete's own championship-adjusted
  record for that dive (Model 3 restatement, 2024+), with probability
  n/(n+4), otherwise from the field's record for the dive code on that board
  (or the whole board when the code is rare). A shared per-competition "day"
  draw, N(0, sd) with sd estimated from round-mean residuals beyond
  independence, is added to every dive. Total = sum of 3 x DD x execution.
  10,000 competitions per athlete; stored as 99 quantiles so any standard's
  probability can be read later. Calibration on women's 3m: simulated median
  vs actual round mean r = 0.94, +3 pts bias, 85% of rounds inside the 10-90
  band. Published standards (Winter Nationals 2025-26) and the Model 4 World
  equivalents are evaluated and stored alongside.

MODEL 7 -- synchro conversion (what two individual records project to as a pair)
  A synchro award is the mean of five judges' marks after drops: one
  execution mark per diver and three synchronisation marks, so
  dive score = 3 x DD x (eA + eB + 3 x S) / 5.
  Step A, shape (World Aquatics, every synchro dive with a full 11-judge
  panel): the synchronisation mark is regressed on the two divers' execution
  marks on that dive, S = a + b x mean(eA, eB) + c x |eA - eB|. The official
  formula is recomputed from the panel and must reproduce the posted score.
  Step B, carry-over (World Aquatics athletes with both an individual and a
  synchro record on the board that season): execution in synchro optionals is
  regressed on the athlete's individual execution, e_syn = c0 + c1 x e_ind.
  Step C, domestic level (USA Diving pairs whose result names BOTH partners):
  A and B are applied to each partner's season record on the board (Model 3
  championship-adjusted execution; required dives use the athlete's voluntary
  or DD <= 2.0 dives, optionals their optional dives) and compared with the
  pair's actual synchro awards. The mean difference per level and dive type
  is stored as an offset; the spread of pair-level differences is the stated
  uncertainty. Pairs are the unit, never dives, when the spread is reported.
  A projected list uses required dives at DD 2.0 and optionals at the mean of
  the two partners' median individual optional DD, which is where real pairs
  land (difference 0.02, sd 0.09 on the checked pairs).
  Until the crawl captured partner names (2026 championships) no domestic
  pair could be checked, so the domestic sample is small and is printed with
  every projection. Advisory only: it ranks candidate pairs on what their
  individual records support; it does not know how two athletes time together.

MODEL 8 -- junior pipeline (what athletes like this one went on to do)
  For a junior aged 12-17 this season, the comparables are every earlier
  athlete-season of the same sex, board and age whose points per optional dive
  sat within 0.4 band-widths of theirs (band-width = the age's 10th-90th
  percentile spread scaled to one sd), and whose age-20 season is already in
  the past, so the outcome is known. Where fewer than 25 sit that close (the
  very best juniors have few peers) the nearest 25 are used, up to 1.0
  band-widths away; beyond that there is no forecast. comparables_gap records
  how far the athlete sits above the average comparable: when it is large the
  comparables are weaker than the athlete and the shares are a floor.
  Outcome window: the seasons at ages 18, 19 and 20. Facts counted on the
  comparables, never modelled:
    still competing   any season of 6+ optional dives on the board in the window
    scored the standard   at least one round in the window, at a national-level
                      meet, whose optional dives average the published Winter
                      Nationals standard per optional dive (women 47/52/50,
                      men 53/60/55 on 1m/3m/platform; the same per-dive value
                      the criteria use for every list length). National-level
                      = USA Diving senior championships and their qualifiers,
                      Junior Nationals, and NCAA conference, zone and national
                      championships. A full optional list is required (women
                      5, men 6; one fewer at Junior Nationals).
    season level      best season average in the window (10th/50th/90th
                      percentile among those still competing), and the share
                      whose season average itself reached the standard
  Shares are of ALL comparables: an athlete who stopped counts as not
  reaching it. "Scored the standard" follows the shape of the eligibility
  rule but not its exact meet list, which changes each year, so it is not a
  statement that the athlete would be eligible.
  Cohort totals are the sum of the individual shares (expected count), with
  sd = sqrt(sum p(1-p)).
  Which comparables: Junior Nationals results are not on file for 2015-2017
  and the 2020 championship season was cancelled, so an outcome window is
  only used when it starts in 2021 or later and every national meet in it is
  on file. A window that includes 2020 is never used.
  Backtest: the same method run as of 2019, 2020 and 2021 using only
  comparables whose outcome was known by then, scored against what those
  juniors actually did by age 20. It has to use the earlier, thinner windows
  (from 2015), so "scored the standard" is under-counted there by the
  missing meets; "still competing" and the season level do not depend on
  which meets are on file and are the fair test of the method. Stored in
  pipeline_backtest and printed beside the forecast.
------------------------------------------------------------------------------
"""
import os, sys, io, json, time, re
import numpy as np, pandas as pd
import scipy.sparse as sp, scipy.sparse.csgraph as cg

METHOD_VERSION = "hp-models-2026-11-18.2"
CONN = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL") or ""
DEV_PARQUET = os.environ.get("HP_MODELS_DEV_PARQUET")  # local testing without a database
K_P = 20.0
AGE = {"A": (16, 18), "B": (14, 15), "C": (12, 13), "D": (8, 11)}
SENIOR_GROUPS = ("USA Diving Nationals", "USA Diving Nationals Qualifier", "USA Diving Winter Nationals",
                 "USA Diving Winter Nationals Qualifier", "USA Diving Olympic Trials", "USA Diving Olympic Trials Qualifier")
T0 = time.time()
def log(*a): print(f"[{time.time()-T0:6.1f}s]", *a, flush=True)

# ── database ──────────────────────────────────────────────────────────────
def connect():
    import psycopg2
    return psycopg2.connect(CONN)

def read_sql(conn, query):
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return pd.read_sql_query(query, conn)

def load_dives(conn):
    if DEV_PARQUET:
        df = pd.read_parquet(DEV_PARQUET)
    else:
        df = read_sql(conn, """
            SELECT id, meet_id, meet_year, diver_id, diver_name, gender, discipline, competition_family,
                   competition_group, event_name, round_stage, dive_number, dd, score, optional_voluntary
            FROM core.dive_sheets
            WHERE score IS NOT NULL AND dd IS NOT NULL AND dd > 0""")
    df["dd"] = pd.to_numeric(df["dd"]); df["score"] = pd.to_numeric(df["score"])
    df["exec"] = df["score"] / (3 * df["dd"])
    syn = df["event_name"].str.contains("synchro", case=False, na=False) | df["discipline"].str.contains("Synchro", case=False, na=False) | df["dive_number"].astype(str).str.len().gt(6)
    df = df[~syn & df["exec"].between(0, 10)].copy()
    df["dive"] = df["dive_number"].astype(str).str.upper().str.strip()
    df["panel"] = df["meet_id"].astype(str) + "|" + df["event_name"].fillna("") + "|" + df["round_stage"].fillna("")
    return df

def load_links(conn):
    if DEV_PARQUET and os.path.exists(os.path.join(os.path.dirname(DEV_PARQUET), "links.json")):
        rows = json.load(open(os.path.join(os.path.dirname(DEV_PARQUET), "links.json")))["rows"]
        return {r[1]: str(r[0]) for r in rows}
    d = read_sql(conn, "SELECT canonical_id, wa_id FROM analytics.athlete_directory WHERE wa_id IS NOT NULL AND match_method IN ('name_token_exact', 'reviewed_alias')")
    return {r.wa_id: str(r.canonical_id) for r in d.itertuples()}

# ── model 3 ───────────────────────────────────────────────────────────────
def model3(df, links):
    df = df.copy()
    df["athlete"] = df["diver_id"].astype(str).map(lambda x: links.get(x, x))
    df["ad"] = df["athlete"] + "|" + df["dive"] + "|" + df["discipline"].fillna("") + "|" + df["meet_year"].astype(str)
    npan = df.groupby("ad")["panel"].nunique()
    con = df[df["ad"].map(npan) >= 2].copy()
    log(f"model3: {len(con):,} connected dives of {len(df):,}; panels {con['panel'].nunique():,}")
    pidx = {p: i for i, p in enumerate(con["panel"].unique())}; aidx = {a: i for i, a in enumerate(con["ad"].unique())}
    M = sp.coo_matrix((np.ones(len(con)), (con["panel"].map(pidx).values, con["ad"].map(aidx).values)), shape=(len(pidx), len(aidx))).tocsr(); M.data[:] = 1
    _, lab = cg.connected_components(M @ M.T, directed=False)
    comp = pd.Series(lab, index=list(pidx.keys()))
    pi = pd.Series(0.0, index=con["panel"].unique())
    for it in range(80):
        alpha = (con["exec"] - con["panel"].map(pi)).groupby(con["ad"]).transform("mean")
        g = (con["exec"] - alpha).groupby(con["panel"]); pi_new = g.sum() / (g.count() + K_P)
        n = g.count(); pc = comp[pi_new.index]
        pi_new = pi_new - pc.map((pi_new * n).groupby(pc).sum() / n.groupby(pc).sum())
        delta = (pi_new - pi).abs().max(); pi = pi_new
        if delta < 1e-4: break
    log(f"model3: converged in {it+1} iterations (max delta {delta:.2e})")
    resid = con["exec"] - alpha - con["panel"].map(pi)
    pan = con.groupby("panel").agg(meet_id=("meet_id", "first"), meet_year=("meet_year", "first"), competition_family=("competition_family", "first"),
                                   competition_group=("competition_group", "first"), event_name=("event_name", "first"), round_stage=("round_stage", "first"),
                                   gender=("gender", "first"), discipline=("discipline", "first"), n_connected=("exec", "size"), raw_exec_mean=("exec", "mean"))
    pan["component_id"] = comp[pan.index].values
    pan["severity"] = pi[pan.index].values
    pan["n_all"] = df.groupby("panel").size().reindex(pan.index).fillna(0).astype(int).values
    pan["severity_pts_6dive_dd3"] = pan["severity"] * 3 * 3.0 * 6
    pan["reliable"] = pan["n_connected"] >= 60
    # split-half reliability, reported in method
    rng = np.random.default_rng(1); mask = rng.random(len(con)) < 0.5
    def fitsub(d):
        p = pd.Series(0.0, index=d["panel"].unique())
        for _ in range(60):
            a = (d["exec"] - d["panel"].map(p)).groupby(d["ad"]).transform("mean")
            g2 = (d["exec"] - a).groupby(d["panel"]); pn = g2.sum() / (g2.count() + K_P); n2 = g2.count(); pc2 = comp[pn.index]
            pn = pn - pc2.map((pn * n2).groupby(pc2).sum() / n2.groupby(pc2).sum())
            done = (pn - p).abs().max() < 1e-4; p = pn
            if done: break
        return p
    pa, pb = fitsub(con[mask]), fitsub(con[~mask])
    both = pd.concat([pa.rename("a"), pb.rename("b")], axis=1).dropna(); big = pan.loc[both.index, "n_connected"] >= 60
    rel_all = float(both["a"].corr(both["b"])); rel_big = float(both[big]["a"].corr(both[big]["b"]))
    log(f"model3: split-half reliability all {rel_all:.3f}, n>=60 {rel_big:.3f} ({int(big.sum())} panels)")
    # meet level
    meet = pan.groupby("meet_id").apply(lambda g: pd.Series({"meet_year": g["meet_year"].iloc[0], "competition_family": g["competition_family"].iloc[0],
            "competition_group": g["competition_group"].iloc[0], "n_connected": int(g["n_connected"].sum()), "n_panels": len(g),
            "severity": float(np.average(g["severity"], weights=g["n_connected"]))})).reset_index()
    meet["severity_pts_6dive_dd3"] = meet["severity"] * 54
    # cohort reference: US senior championship level and World Aquatics level per component
    def ref(g, m):
        s = g[m]; return float(np.average(s["severity"], weights=s["n_connected"])) if len(s) else np.nan
    champ = pan["competition_group"].isin(SENIOR_GROUPS); wa = pan["competition_family"].eq("World Aquatics"); jn = pan["competition_group"].eq("USA Diving Junior Nationals")
    cohort = pan.assign(_c=champ, _w=wa, _j=jn).groupby("component_id").apply(lambda g: pd.Series({
        "meet_year": g["meet_year"].iloc[0], "n_panels": len(g), "n_connected": int(g["n_connected"].sum()),
        "genders": ",".join(sorted(g["gender"].dropna().unique())), "disciplines": ",".join(sorted(g["discipline"].dropna().unique())),
        "champ_severity": ref(g, g["_c"]), "champ_panels": int(g["_c"].sum()),
        "junior_nationals_severity": ref(g, g["_j"]), "junior_nationals_panels": int(g["_j"].sum()),
        "wa_severity": ref(g, g["_w"]), "wa_panels": int(g["_w"].sum())})).reset_index()
    stats = {"connected_dives": int(len(con)), "all_dives": int(len(df)), "panels": int(len(pan)), "components": int(comp.nunique()),
             "resid_sd": float(resid.std()), "split_half_all": rel_all, "split_half_n60": rel_big, "iterations": int(it + 1)}
    return pan.reset_index().rename(columns={"panel": "panel_key"}), meet, cohort, stats

# ── model 4 ───────────────────────────────────────────────────────────────
def model4(conn, pan):
    if DEV_PARQUET:
        base = os.path.dirname(DEV_PARQUET)
        def load(f):
            d = json.load(open(os.path.join(base, f))); return pd.DataFrame(d["rows"], columns=[x["name"] for x in d["fields"]])
        wa, dom, waall = load("wa_us.json"), load("dom_us.json"), load("wa_all.json")
    else:
        wa = read_sql(conn, """SELECT a.canonical_id AS dm_id, a.wa_id, a.display_name, r.meet_year, r.meet_name, r.event_round, r.round_stage, r.gender, r.discipline,
                                      r.place, r.posted_score, r.phase_dd_sum, r.phase_dive_count, r.score_is_cumulative
                               FROM analytics.athlete_directory a JOIN core.result_phases r ON r.diver_id = a.wa_id
                               WHERE a.match_method IN ('name_token_exact', 'reviewed_alias') AND a.nat = 'USA' AND r.competition_family = 'World Aquatics' AND NOT COALESCE(r.is_synchronized, false)""")
        dom = read_sql(conn, """SELECT a.canonical_id AS dm_id, r.meet_id, r.meet_year, r.meet_name, r.competition_group, r.event_round, r.round_stage, r.gender, r.discipline,
                                       r.place, r.posted_score, r.phase_score_from_dives, r.phase_dd_sum, r.phase_dive_count, r.score_is_cumulative
                                FROM analytics.athlete_directory a JOIN core.result_phases r ON r.diver_id = a.canonical_id
                                WHERE a.match_method IN ('name_token_exact', 'reviewed_alias') AND a.nat = 'USA' AND r.competition_family = 'USA Diving'
                                  AND NOT COALESCE(r.is_synchronized, false) AND r.event_level IN ('Senior', 'Senior/Open')""")
        waall = read_sql(conn, """SELECT meet_year, meet_name, event_round, round_stage, gender, discipline, place, posted_score, phase_dive_count, nat
                                  FROM core.result_phases WHERE competition_family = 'World Aquatics' AND NOT COALESCE(is_synchronized, false)""")
    for c in ("posted_score", "phase_dd_sum", "place"): wa[c] = pd.to_numeric(wa[c]); dom[c] = pd.to_numeric(dom[c])
    dom["phase_score_from_dives"] = pd.to_numeric(dom["phase_score_from_dives"])
    waall["posted_score"] = pd.to_numeric(waall["posted_score"]); waall["place"] = pd.to_numeric(waall["place"])
    dom["score"] = np.where(dom["score_is_cumulative"].astype(bool), dom["phase_score_from_dives"], dom["posted_score"])
    wp = wa[wa["round_stage"] == "Prelim"].groupby(["dm_id", "meet_year", "gender", "discipline"]).agg(wa_prelim=("posted_score", "mean"), wa_n=("posted_score", "size"), name=("display_name", "first")).reset_index()
    db = dom.dropna(subset=["score"]).groupby(["dm_id", "meet_year", "gender", "discipline"]).agg(dom_mean=("score", "mean"), dom_best=("score", "max"), dom_n=("score", "size")).reset_index()
    pairs = wp.merge(db, on=["dm_id", "meet_year", "gender", "discipline"])
    pairs["ratio"] = pairs["wa_prelim"] / pairs["dom_mean"]
    fit = {}
    if len(pairs) >= 8:
        from scipy import stats as st
        r = st.linregress(pairs["dom_mean"], pairs["wa_prelim"]); pred = r.intercept + r.slope * pairs["dom_mean"]
        fit = {"n": int(len(pairs)), "intercept": float(r.intercept), "slope": float(r.slope), "r": float(r.rvalue),
               "rmse": float(np.sqrt(((pairs["wa_prelim"] - pred) ** 2).mean())), "ratio_mean": float(pairs["ratio"].mean()), "ratio_sd": float(pairs["ratio"].std()),
               "seasons": ",".join(str(y) for y in sorted(pairs["meet_year"].unique()))}
    log(f"model4: {len(pairs)} pairs; fit {json.dumps({k: (round(v,3) if isinstance(v,float) else v) for k,v in fit.items()})}")
    pre = waall[waall["round_stage"] == "Prelim"].copy()
    cuts = pre.groupby(["meet_year", "meet_name", "gender", "discipline"]).apply(lambda g: pd.Series({
        "n_prelim": len(g), "cut12": g.nlargest(12, "posted_score")["posted_score"].min() if len(g) >= 12 else np.nan,
        "cut18": g.nlargest(18, "posted_score")["posted_score"].min() if len(g) >= 18 else np.nan, "win": g["posted_score"].max()})).reset_index()
    cuts["reference_event"] = cuts["meet_name"].str.contains("Championships|World Cup 20", regex=True) & ~cuts["meet_name"].str.contains("Super Final|American Cup", regex=True)
    eq = []
    if fit:
        ref = cuts[cuts["reference_event"]]
        for (g, d), x in ref.groupby(["gender", "discipline"]):
            c12 = float(x["cut12"].median()); c18 = float(x["cut18"].median()) if x["cut18"].notna().any() else np.nan
            rm, rs = fit["ratio_mean"], fit["ratio_sd"]
            eq.append({"gender": g, "discipline": d, "n_events": int(len(x)), "cut12_median": c12, "cut18_median": c18,
                       "domestic_equiv_final": c12 / rm, "domestic_equiv_final_low": c12 / (rm + rs), "domestic_equiv_final_high": c12 / (rm - rs),
                       "domestic_equiv_semi": (c18 / rm) if not np.isnan(c18) else np.nan})
    return pairs, fit, cuts, pd.DataFrame(eq)

# ── model 5 ───────────────────────────────────────────────────────────────
def model5(df):
    en = df["event_name"].fillna("")
    grp = np.select([en.str.contains(r"Group\s*A|\b16\s*-\s*18\b", regex=True), en.str.contains(r"Group\s*B|\b14\s*-\s*15\b", regex=True),
                     en.str.contains(r"Group\s*C|\b12\s*-\s*13\b", regex=True),
                     en.str.contains(r"Group\s*D|\b11\s*(?:&|and)\s*under\b|\b10\s*-\s*11\b|\b9\s*(?:&|and)\s*under\b", regex=True)], ["A", "B", "C", "D"], None)
    d = df.assign(grp=grp)
    obs = d.dropna(subset=["grp"]).groupby(["diver_id", "meet_year", "grp"]).size().reset_index()[["diver_id", "meet_year", "grp"]]
    # An athlete may dive up into an older group but never down into a younger
    # one, so within a season the youngest group entered is the one that bounds
    # their age. Using every group entered made each dive-up season contradict
    # itself (Group B and Group A in one year share no birth year) and dropped
    # those athletes, who are disproportionately the strongest juniors.
    obs["rank"] = obs["grp"].map({"D": 0, "C": 1, "B": 2, "A": 3})
    n_all = len(obs)
    obs = obs.sort_values("rank").drop_duplicates(["diver_id", "meet_year"], keep="first").drop(columns=["rank"])
    log(f"model5: {n_all - len(obs):,} dive-up season entries set aside (youngest group per season kept)")
    obs["lo"] = obs["meet_year"] - obs["grp"].map(lambda g: AGE[g][1]); obs["hi"] = obs["meet_year"] - obs["grp"].map(lambda g: AGE[g][0])
    win = obs.groupby("diver_id").agg(birth_lo=("lo", "max"), birth_hi=("hi", "min"), n_seasons=("meet_year", "nunique"), first_season=("meet_year", "min"), last_season=("meet_year", "max")).reset_index()
    win["consistent"] = win["birth_lo"] <= win["birth_hi"]
    win["width"] = np.where(win["consistent"], win["birth_hi"] - win["birth_lo"] + 1, np.nan)
    win["birth_mid"] = np.where(win["consistent"], ((win["birth_lo"] + win["birth_hi"]) / 2).round(), np.nan)
    log(f"model5: {len(win):,} athletes with junior group history; consistent {int(win['consistent'].sum()):,}")
    ok = win[win["consistent"]].set_index("diver_id")
    d = d.join(ok[["birth_mid", "width"]], on="diver_id")
    d["age"] = d["meet_year"] - d["birth_mid"]
    opt = d[d["age"].notna() & d["optional_voluntary"].eq("O")]
    m = opt.groupby(["diver_id", "meet_year", "gender", "discipline"]).agg(diver_name=("diver_name", "first"), age=("age", "first"), width=("width", "first"),
            n_opt_dives=("exec", "size"), exec_mean=("exec", "mean"), dd_mean=("dd", "mean")).reset_index()
    m = m[(m["n_opt_dives"] >= 6) & m["age"].between(8, 30)]
    m["ppd"] = 3 * m["dd_mean"] * m["exec_mean"]
    pop = m[m["width"] <= 2]
    q = lambda p: (lambda s: s.quantile(p))
    bands = pop.groupby(["gender", "discipline", "age"]).agg(n=("ppd", "size"), p10=("ppd", q(.10)), p25=("ppd", q(.25)), p50=("ppd", "median"), p75=("ppd", q(.75)),
            p90=("ppd", q(.90)), p97=("ppd", q(.97)), exec_p50=("exec_mean", "median"), dd_p50=("dd_mean", "median")).reset_index()
    bands = bands[bands["n"] >= 40]
    # percentile of each athlete-season within its gender x board x age population
    m = m.merge(pop.groupby(["gender", "discipline", "age"])["ppd"].apply(lambda s: np.sort(s.values)).rename("_pop").reset_index(), on=["gender", "discipline", "age"], how="left")
    def pct(row):
        arr = row["_pop"]
        if not isinstance(arr, np.ndarray) or len(arr) < 40: return np.nan
        return float(np.searchsorted(arr, row["ppd"], side="right") / len(arr) * 100)
    m["pct_in_age"] = m.apply(pct, axis=1); m = m.drop(columns=["_pop"])
    log(f"model5: {len(m):,} athlete-seasons; {len(bands)} band rows")
    return win, m, bands

# ── model 6 ───────────────────────────────────────────────────────────────
WINTER_STD = {("Female","1m"): 235, ("Female","3m"): 260, ("Female","Platform"): 250, ("Male","1m"): 318, ("Male","3m"): 360, ("Male","Platform"): 330}
TARGET_N = {"Female": 5, "Male": 6}
K_OWN = 4.0; NSIM = 10000; SEASONS_BACK = 2
def model6(df, pan, cohort, conn, eq):
    rng = np.random.default_rng(7)
    pan_i = pan.set_index("panel_key")
    ref = cohort.set_index("component_id")["champ_severity"]
    d = df.join(pan_i[["severity", "component_id"]], on="panel")
    d["champ_ref"] = d["component_id"].map(ref)
    d["adj"] = (d["exec"] - (d["severity"] - d["champ_ref"]).fillna(0)).clip(0, 10)
    maxyear = int(d["meet_year"].max())
    d = d[(d["meet_year"] >= maxyear - SEASONS_BACK) & (d["competition_family"] != "World Aquatics")]
    # pool: senior championship competitors in the last two seasons
    if DEV_PARQUET:
        import json as _j; base = os.path.dirname(DEV_PARQUET)
        ss = _j.load(open(os.path.join(base, "ss_rows.json"))); cols = [x["name"] for x in ss["fields"]]
        pool = pd.DataFrame(ss["rows"], columns=cols); pool["gender"] = "Female"; pool["discipline"] = "1m"
        # dev file is women's 1m only; widen with everyone who dived a senior-format round
        pool = None
    else:
        pool = read_sql(conn, f"""SELECT DISTINCT diver_id::text AS diver_id, gender, discipline FROM core.result_phases
                                  WHERE competition_family = 'USA Diving' AND competition_group IN {SENIOR_GROUPS}
                                    AND NOT COALESCE(is_synchronized, false) AND meet_year >= {maxyear - SEASONS_BACK}""")
    eqmap = {(r["gender"], r["discipline"]): float(r["domestic_equiv_final"]) for _, r in eq.iterrows()} if len(eq) else {}
    out = []
    for (g, b), sub in d.groupby(["gender", "discipline"]):
        if (g, b) not in WINTER_STD: continue
        n_target = TARGET_N[g]
        field = {dv: grp["adj"].values for dv, grp in sub.groupby("dive") if len(grp) >= 30}
        field_all = sub["adj"].values
        res = sub["adj"] - sub.groupby(["diver_id", "dive"])["adj"].transform("mean")
        rm = res.groupby([sub["diver_id"], sub["meet_id"], sub["event_name"], sub["round_stage"]]).agg(["mean", "count"]); rm = rm[rm["count"] >= 5]
        day_sd = float(np.sqrt(max(0.0, rm["mean"].var() - (res.std() ** 2 / rm["count"]).mean()))) if len(rm) > 20 else 0.25
        if pool is not None:
            ids = set(pool[(pool["gender"] == g) & (pool["discipline"] == b)]["diver_id"].astype(str))
        else:
            ids = set(sub["diver_id"].astype(str).unique())
        sub = sub[sub["diver_id"].astype(str).isin(ids)]
        for aid, ga in sub.groupby(sub["diver_id"].astype(str)):
            rounds = [(k, r) for k, r in ga.groupby(["meet_year", "meet_id", "event_name", "round_stage"])
                      if len(r) == n_target and (r["optional_voluntary"] == "O").all() and r["dive"].nunique() == n_target]
            if rounds:
                k, r = max(rounds, key=lambda kr: (kr[0][0], str(kr[0][1]))); lst = r[["dive", "dd"]].drop_duplicates("dive"); src = "latest senior-format list"; lst_meet = str(k[1]); lst_year = int(k[0])
            else:
                opt = ga[ga["optional_voluntary"] == "O"].copy()
                if opt.empty: continue
                opt["grp"] = opt["dive"].map(lambda x: "5" if str(x).startswith("5") else str(x)[:1])
                ex = opt.groupby(["grp", "dive"]).agg(dd=("dd", "max"), m=("adj", "mean")).reset_index(); ex["pts"] = 3 * ex["dd"] * ex["m"]
                ex = ex.sort_values("pts", ascending=False); per_group = 1 if g == "Female" else 2
                ex["rank_in_grp"] = ex.groupby("grp").cumcount(); pick = ex[ex["rank_in_grp"] < per_group].head(n_target)
                if len(pick) < n_target: continue
                lst = pick[["dive", "dd"]]; src = "built from best optional per dive group"; lst_meet = None; lst_year = None
            own = {dv: x["adj"].values for dv, x in ga.groupby("dive")}
            draws = np.zeros(NSIM); day = rng.normal(0, day_sd, NSIM); detail = []
            for dv, dd in zip(lst["dive"], lst["dd"].astype(float)):
                o = own.get(dv, np.array([])); n = len(o); prior = field.get(dv, field_all)
                use_own = rng.random(NSIM) < (n / (n + K_OWN))
                e = np.where(use_own, rng.choice(o, NSIM) if n else 0.0, rng.choice(prior, NSIM))
                e = np.clip(e + day, 0, 10); draws += 3 * dd * e
                detail.append({"dive": dv, "dd": round(float(dd), 1), "n": int(n), "own_mean": (round(float(o.mean()), 2) if n else None), "prior_mean": round(float(prior.mean()), 2), "under4": (round(float((o < 4).mean()), 2) if n else None)})
            qs = np.percentile(draws, np.arange(1, 100))
            std = WINTER_STD[(g, b)]; weq = eqmap.get((g, b))
            out.append({"diver_id": aid, "diver_name": ga["diver_name"].iloc[0], "gender": g, "discipline": b, "season_max": maxyear, "n_obs": int(len(ga)),
                        "list_source": src, "list_meet_id": lst_meet, "list_year": lst_year, "list_dd": round(float(lst["dd"].astype(float).sum()), 1), "list_json": json.dumps(detail),
                        "sim_p10": float(qs[9]), "sim_p50": float(qs[49]), "sim_p90": float(qs[89]), "quantiles_json": json.dumps([round(float(x), 1) for x in qs]),
                        "published_standard": std, "p_clear_standard": float((draws >= std).mean()),
                        "world_equiv": weq, "p_clear_world_equiv": (float((draws >= weq).mean()) if weq else None), "day_sd": round(day_sd, 3)})
        log(f"model6: {g} {b}: {sum(1 for o in out if o['gender']==g and o['discipline']==b)} athletes simulated (day sd {day_sd:.3f})")
    return pd.DataFrame(out)

# ── model 7 ───────────────────────────────────────────────────────────────
SYN_KEYS = ("E1", "E2", "E3", "E4", "E5", "E6", "S1", "S2", "S3", "S4", "S5")
SYN_MIN_DIVES = 3            # individual dives of a type needed before that type is used on its own
SYN_SEASONS_BACK = 1         # athlete table: this season and the one before
def _name_key(v): return " ".join(sorted(str(v).lower().replace("-", " ").split()))

def load_synchro(conn):
    wa = read_sql(conn, """SELECT diver_name, meet_id, meet_year, gender, discipline, dd, score, judges_scores
                           FROM core.dive_sheets WHERE competition_family = 'World Aquatics' AND discipline ILIKE 'Synchro%%'
                             AND judges_scores IS NOT NULL AND score IS NOT NULL AND dd > 0""".replace("%%", "%"))
    wa_ind = read_sql(conn, """SELECT diver_name, meet_year, discipline, dd, score FROM core.dive_sheets
                               WHERE competition_family = 'World Aquatics' AND discipline IN ('3m', 'Platform') AND score IS NOT NULL AND dd > 0""")
    us_ph = read_sql(conn, """SELECT meet_id, meet_year, gender, discipline, event_level, diver_id::text AS diver_id, diver_name,
                                     diver2_id::text AS diver2_id, diver2_name, sheet_key::text AS sheet_key
                              FROM core.result_phases
                              WHERE is_synchronized AND competition_family = 'USA Diving' AND diver2_id IS NOT NULL
                                AND event_level IN ('Junior', 'Senior/Open')""")
    us_dv = read_sql(conn, """SELECT meet_id, diver_id::text AS diver_id, discipline, sheet_key::text AS sheet_key, dd, score
                              FROM core.dive_sheets
                              WHERE competition_family = 'USA Diving' AND discipline ILIKE 'Synchro%%' AND score IS NOT NULL AND dd > 0
                                AND meet_id IN (SELECT DISTINCT meet_id FROM core.result_phases WHERE is_synchronized AND diver2_id IS NOT NULL)""".replace("%%", "%"))
    teams = read_sql(conn, """SELECT DISTINCT ON (diver_id) diver_id::text AS diver_id, team_name FROM core.dive_sheets
                              WHERE team_name IS NOT NULL AND team_name <> '' ORDER BY diver_id, meet_year DESC, id DESC""")
    return wa, wa_ind, us_ph, us_dv, teams

def syn_pair_award(ia, ib, fit):
    """Projected mean synchro award for one dive type from two individual execution means. Mirrored in matchup-lab/main.js."""
    ea = fit["c0"] + fit["c1"] * ia; eb = fit["c0"] + fit["c1"] * ib
    s = fit["a"] + fit["b"] * (ea + eb) / 2 + fit["c"] * abs(ea - eb)
    return (ea + eb + 3 * s) / 5

def model7(df, pan, cohort, syn):
    wa, wa_ind, us_ph, us_dv, teams = syn
    # ── A: shape, from World Aquatics panels ──
    P = [dict((k, float(v)) for k, v in re.findall(r"([ES]\d+):\s*([\d.]+)", j)) if isinstance(j, str) else {} for j in wa["judges_scores"]]
    full = np.array([all(k in p for k in SYN_KEYS) for p in P])
    x = wa[full].copy(); P = [p for p, k in zip(P, full) if k]
    x["dd"] = pd.to_numeric(x["dd"]); x["score"] = pd.to_numeric(x["score"])
    x["eA"] = [np.mean([p["E1"], p["E2"], p["E3"]]) for p in P]; x["eB"] = [np.mean([p["E4"], p["E5"], p["E6"]]) for p in P]
    x["S"] = [np.mean([p[k] for k in SYN_KEYS[6:]]) for p in P]
    calc = np.array([(sorted([p["E1"], p["E2"], p["E3"]])[1] + sorted([p["E4"], p["E5"], p["E6"]])[1] + sum(sorted([p[k] for k in SYN_KEYS[6:]])[1:4])) * 0.6 for p in P]) * x["dd"].values
    reproduces = float((np.abs(calc - x["score"].values) < 0.06).mean())
    x["m"] = (x["eA"] + x["eB"]) / 2; x["gap"] = (x["eA"] - x["eB"]).abs()
    X = np.column_stack([np.ones(len(x)), x["m"], x["gap"]]); y = x["S"].values
    a, b, c = np.linalg.lstsq(X, y, rcond=None)[0]; pred = X @ np.array([a, b, c])
    r2_a = float(1 - ((y - pred) ** 2).sum() / ((y - y.mean()) ** 2).sum())
    log(f"model7 A: {len(x):,} World Aquatics synchro dives with full panels; formula reproduces {reproduces:.1%}; S = {a:.3f} + {b:.3f} mean {c:+.3f} gap (R2 {r2_a:.2f})")
    # ── B: carry-over, individual -> synchro execution ──
    wi = wa_ind.copy(); wi["exec"] = pd.to_numeric(wi["score"]) / (3 * pd.to_numeric(wi["dd"])); wi = wi[wi["exec"].between(0, 10)]
    wi["k"] = wi["diver_name"].map(_name_key)
    ie = wi.groupby(["k", "discipline", "meet_year"])["exec"].agg(["mean", "size"]).reset_index().rename(columns={"discipline": "board", "mean": "i", "size": "n_i"})
    xo = x[x["dd"] > 2.05].copy(); xo["board"] = xo["discipline"].str.replace("Synchronized ", "", regex=False)
    nm = xo["diver_name"].str.split(" / ", expand=True)
    long = pd.concat([xo.assign(k=nm[0].map(_name_key), e=xo["eA"]), xo.assign(k=nm[1].map(_name_key), e=xo["eB"])])
    se = long.groupby(["k", "board", "meet_year"])["e"].agg(["mean", "size"]).reset_index().rename(columns={"mean": "e_syn", "size": "n_s"})
    cb = se.merge(ie, on=["k", "board", "meet_year"]); cb = cb[(cb["n_i"] >= 5) & (cb["n_s"] >= 3)]
    c1, c0 = np.polyfit(cb["i"], cb["e_syn"], 1); r_b = float(np.corrcoef(cb["i"], cb["e_syn"])[0, 1])
    log(f"model7 B: {len(cb)} athlete-seasons with both records; e_syn = {c0:.2f} + {c1:.2f} e_ind (r {r_b:.2f})")
    fit = {"a": float(a), "b": float(b), "c": float(c), "c0": float(c0), "c1": float(c1)}
    # ── individual season records by dive type, on the championship-panel basis ──
    d = df.join(pan.set_index("panel_key")[["severity", "component_id"]], on="panel")
    d["champ_ref"] = d["component_id"].map(cohort.set_index("component_id")["champ_severity"])
    d["adj"] = (d["exec"] - (d["severity"] - d["champ_ref"]).fillna(0)).clip(0, 10)
    d = d[d["discipline"].isin(["1m", "3m", "Platform"]) & (d["competition_family"] != "World Aquatics")].copy()
    d["diver_id"] = d["diver_id"].astype(str)
    en = d["event_name"].fillna("")
    d["grp"] = np.select([en.str.contains(r"Group\s*A|\b16\s*-\s*18\b", regex=True), en.str.contains(r"Group\s*B|\b14\s*-\s*15\b", regex=True),
                          en.str.contains(r"Group\s*C|\b12\s*-\s*13\b", regex=True),
                          en.str.contains(r"Group\s*D|\b11\s*(?:&|and)\s*under\b|\b10\s*-\s*11\b|\b9\s*(?:&|and)\s*under\b", regex=True)], [3, 2, 1, 0], -1)
    keys = ["diver_id", "meet_year", "gender", "discipline"]
    def agg(mask, tag):
        g = d[mask].groupby(keys)["adj"].agg(["mean", "size"]).rename(columns={"mean": f"m_{tag}", "size": f"n_{tag}"}); return g
    ov = d["optional_voluntary"].fillna("")
    base = d.groupby(keys).agg(diver_name=("diver_name", "first"), m_all=("adj", "mean"), n_all=("adj", "size"), sd_all=("adj", "std"),
                               jr_share=("grp", lambda s: float((s >= 0).mean()))).join([agg(ov == "V", "v"), agg(ov == "O", "o"), agg(d["dd"] <= 2.05, "easy"), agg(d["dd"] > 2.05, "hard")])
    grp_min = d[d["grp"] >= 0].groupby(keys)["grp"].min().rename("grp_min")
    dd_opt = d[(ov == "O") | ((ov == "") & (d["dd"] > 2.05))].groupby(keys)["dd"].median().rename("dd_opt")
    base = base.join([grp_min, dd_opt]).reset_index()
    for cnt in ("n_v", "n_o", "n_easy", "n_hard"): base[cnt] = base[cnt].fillna(0).astype(int)
    use_v = base["n_v"] >= SYN_MIN_DIVES; use_easy = ~use_v & (base["n_easy"] >= SYN_MIN_DIVES)
    base["exec_req"] = np.where(use_v, base["m_v"], np.where(use_easy, base["m_easy"], base["m_all"]))
    base["n_req"] = np.where(use_v, base["n_v"], np.where(use_easy, base["n_easy"], base["n_all"]))
    base["req_basis"] = np.where(use_v, "voluntary dives", np.where(use_easy, "dives at DD 2.0 or under", "all dives"))
    use_o = base["n_o"] >= SYN_MIN_DIVES; use_hard = ~use_o & (base["n_v"] + base["n_o"] == 0) & (base["n_hard"] >= SYN_MIN_DIVES)
    base["exec_opt"] = np.where(use_o, base["m_o"], np.where(use_hard, base["m_hard"], base["m_all"]))
    base["n_opt"] = np.where(use_o, base["n_o"], np.where(use_hard, base["n_hard"], base["n_all"]))
    base["level"] = np.where(base["jr_share"] >= 0.5, "Junior", "Senior")
    base["junior_group"] = base["grp_min"].map({3: "A", 2: "B", 1: "C", 0: "D"})
    rec = base.set_index(["diver_id", "meet_year", "discipline"])
    rec = rec[~rec.index.duplicated(keep="first")]
    # ── C: domestic level, from US pairs whose result names both partners ──
    ph = us_ph.copy(); ph["board"] = ph["discipline"].str.replace("Synchronized ", "", regex=False)
    ph = ph[ph["board"].isin(["1m", "3m", "Platform"])].drop_duplicates(["meet_id", "diver_id", "diver2_id", "discipline"])
    dv = us_dv.copy(); dv["dd"] = pd.to_numeric(dv["dd"]); dv["award"] = pd.to_numeric(dv["score"]) / (3 * dv["dd"]); dv = dv[dv["award"].between(0, 10)]
    n_partners = ph.groupby(["meet_id", "diver_id", "discipline"])["diver2_id"].nunique()
    rows = []
    for p in ph.itertuples():
        sd_ = dv[(dv["meet_id"] == p.meet_id) & (dv["diver_id"] == p.diver_id) & (dv["discipline"] == p.discipline)]
        if p.sheet_key and (sd_["sheet_key"] == p.sheet_key).any(): sd_ = sd_[sd_["sheet_key"] == p.sheet_key]
        elif n_partners.get((p.meet_id, p.diver_id, p.discipline), 1) > 1: continue      # cannot tell which partner these dives belong to
        if len(sd_) < 3: continue
        try: ra = rec.loc[(p.diver_id, int(p.meet_year), p.board)]; rb = rec.loc[(p.diver2_id, int(p.meet_year), p.board)]
        except KeyError: continue
        level = "Junior" if p.event_level == "Junior" else "Senior"
        for typ, sub in (("required", sd_[sd_["dd"] <= 2.05]), ("optional", sd_[sd_["dd"] > 2.05])):
            if sub.empty: continue
            col = "exec_req" if typ == "required" else "exec_opt"
            rows.append({"meet_id": p.meet_id, "meet_year": int(p.meet_year), "level": level, "gender": p.gender, "discipline": p.board, "dive_type": typ,
                         "diver_id": p.diver_id, "diver_name": p.diver_name, "partner_id": p.diver2_id, "partner_name": p.diver2_name,
                         "exec_a": float(ra[col]), "exec_b": float(rb[col]), "n_syn_dives": int(len(sub)), "dd_sum": float(sub["dd"].sum()),
                         "award_actual": float(sub["award"].mean()), "award_unadjusted": float(syn_pair_award(ra[col], rb[col], fit))})
    val = pd.DataFrame(rows)
    offs = []
    if len(val):
        val["diff"] = val["award_actual"] - val["award_unadjusted"]
        for (lv, typ), g in val.groupby(["level", "dive_type"]):
            offs.append({"level": lv, "dive_type": typ, "award_offset": float(g["diff"].mean()), "n_pairs": int(len(g)), "n_dives": int(g["n_syn_dives"].sum())})
        off = pd.DataFrame(offs); val = val.merge(off[["level", "dive_type", "award_offset"]], on=["level", "dive_type"])
        val["award_projected"] = val["award_unadjusted"] + val["award_offset"]
        # pair-level check on the whole list: actual vs projected points
        val["pts_actual"] = 3 * val["dd_sum"] * val["award_actual"]; val["pts_projected"] = 3 * val["dd_sum"] * val["award_projected"]
        pair = val.groupby(["meet_id", "level", "diver_id", "partner_id"]).agg(pts_actual=("pts_actual", "sum"), pts_projected=("pts_projected", "sum"), dd=("dd_sum", "sum")).reset_index()
        pair["award_diff"] = (pair["pts_actual"] - pair["pts_projected"]) / (3 * pair["dd"])
        for lv, g in pair.groupby("level"):
            log(f"model7 C: {lv}: {len(g)} pairs; award spread after offset sd {g['award_diff'].std():.2f}; total r {np.corrcoef(g['pts_actual'], g['pts_projected'])[0,1]:.2f}; mean abs error {(g['pts_actual']-g['pts_projected']).abs().mean():.1f} pts")
        pair["abs_pts"] = (pair["pts_actual"] - pair["pts_projected"]).abs()
        spread = pair.groupby("level").agg(pair_award_sd=("award_diff", "std"), n_pairs_total=("award_diff", "size"), mean_abs_error_pts=("abs_pts", "mean")).reset_index()
        off = off.merge(spread, on="level")
    else:
        off = pd.DataFrame(columns=["level", "dive_type", "award_offset", "n_pairs", "n_dives", "pair_award_sd", "n_pairs_total", "mean_abs_error_pts"])
        log("model7 C: no US pair names both partners; offsets empty")
    fit_row = dict(fit, n_wa_dives=int(len(x)), formula_reproduces=reproduces, r2_sync=r2_a, resid_sd_sync=float((y - pred).std()),
                   n_carry=int(len(cb)), r_carry=r_b, wa_exec_p05=float(x["m"].quantile(.05)), wa_exec_p95=float(x["m"].quantile(.95)))
    # ── athlete table: latest season on each board, this season or last ──
    maxyear = int(d["meet_year"].max())
    ath = base[(base["meet_year"] >= maxyear - SYN_SEASONS_BACK) & (base["n_all"] >= 5)].sort_values("meet_year").drop_duplicates(["diver_id", "gender", "discipline"], keep="last")
    ath = ath.merge(teams, on="diver_id", how="left")
    ath = ath[["diver_id", "diver_name", "team_name", "gender", "discipline", "meet_year", "level", "junior_group", "exec_req", "n_req", "req_basis", "exec_opt", "n_opt", "sd_all", "n_all", "dd_opt"]].rename(columns={"meet_year": "season", "sd_all": "exec_sd"})
    log(f"model7: {len(ath):,} athlete-board records for pairing ({(ath['level']=='Junior').sum():,} junior)")
    return pd.DataFrame([fit_row]), off, val, ath, fit_row

# ── model 8 ───────────────────────────────────────────────────────────────
PIPE_AGES = (12, 17); PIPE_WINDOW = (18, 20); PIPE_Z = 0.4; PIPE_Z_MAX = 1.0; PIPE_MIN_COMPARABLES = 25
# Junior Nationals results are missing for 2015-2017 and 2020 was cancelled, so the first outcome window with every
# national meet on file starts in 2021. The forecast draws comparables only from those windows. The backtest has to
# reach further back to have anything to score, and says so.
PIPE_FIRST_WINDOW_YEAR = int(os.environ.get("PIPE_FIRST_WINDOW_YEAR", "2021"))
PIPE_BACKTEST_FIRST_YEAR = 2015
PIPE_VOID_YEARS = tuple(int(v) for v in os.environ.get("PIPE_VOID_YEARS", "2020").split(",") if v)
PER_OPT_STD = {("Female", "1m"): 47, ("Female", "3m"): 52, ("Female", "Platform"): 50, ("Male", "1m"): 53, ("Male", "3m"): 60, ("Male", "Platform"): 55}
N_OPT = {"Female": 5, "Male": 6}
def national_hits(df):
    """Athlete-board-seasons with at least one national-level round whose optional dives average the standard per dive."""
    # College data from 2026 on also holds dual meets and invitationals; only championship-season meets count, as in every earlier year.
    ncaa = (df["competition_family"] == "NCAA") & df["competition_group"].fillna("").str.contains(r"championship|zone", case=False, regex=True)
    nat = ncaa | ((df["competition_family"] == "USA Diving") & df["competition_group"].isin(SENIOR_GROUPS + ("USA Diving Junior Nationals",)))
    o = df[nat & df["optional_voluntary"].eq("O") & df["discipline"].isin(["1m", "3m", "Platform"]) & df["gender"].isin(["Female", "Male"])]
    r = o.groupby(["diver_id", "gender", "discipline", "meet_year", "meet_id", "event_name", "round_stage", "competition_group"], dropna=False)["score"].agg(["mean", "size"]).reset_index()
    need = r["gender"].map(N_OPT) - (r["competition_group"] == "USA Diving Junior Nationals").astype(int)
    std = pd.Series([PER_OPT_STD.get(k) for k in zip(r["gender"], r["discipline"])], index=r.index, dtype=float)
    h = r[(r["size"] >= need) & (r["mean"] >= std)]
    h = h.assign(diver_id=h["diver_id"].astype(str))[["diver_id", "gender", "discipline", "meet_year"]].drop_duplicates()
    log(f"model8: {len(r):,} national-level rounds with a full optional list; {len(h):,} athlete-board-seasons scored the standard")
    return h

def model8(seasons, bands, eq, hits):
    s = seasons[(seasons["width"] <= 2)].merge(bands[["gender", "discipline", "age", "p10", "p50", "p90"]], on=["gender", "discipline", "age"], how="inner")
    s = s[(s["p90"] - s["p10"]) > 0].copy()
    s["z"] = (s["ppd"] - s["p50"]) / ((s["p90"] - s["p10"]) / 2.563)
    s["diver_id"] = s["diver_id"].astype(str)
    maxyear = int(s["meet_year"].max()); gk = ["gender", "discipline"]
    win = s[s["age"].between(*PIPE_WINDOW)].groupby(["diver_id"] + gk)["ppd"].max().rename("best")
    # birth year per athlete-board from any season row, then hits that fall at ages 18-20
    birth = s.assign(birth=s["meet_year"] - s["age"]).groupby(["diver_id"] + gk)["birth"].first()
    hh = hits.join(birth, on=["diver_id"] + gk, how="inner"); hh = hh[(hh["meet_year"] - hh["birth"]).between(*PIPE_WINDOW)]
    hit = hh.groupby(["diver_id"] + gk).size().gt(0).rename("hit")
    jr = s[s["age"].between(*PIPE_AGES)].join(win, on=["diver_id"] + gk).join(hit, on=["diver_id"] + gk)
    jr["hit"] = jr["hit"].fillna(False).astype(bool)
    jr["known_year"] = jr["meet_year"] + (PIPE_WINDOW[1] - jr["age"])          # season in which this athlete turns 20
    weq = {(r["gender"], r["discipline"]): float(r["domestic_equiv_final"]) / N_OPT[r["gender"]] for _, r in eq.iterrows()} if len(eq) else {}
    span = PIPE_WINDOW[1] - PIPE_WINDOW[0]
    # 2020: no USA Diving national meets and the NCAA zone and national championships were cancelled, so an
    # outcome window that includes it under-counts what those athletes could do. Such windows are not used.
    jr["void"] = False
    for vy in PIPE_VOID_YEARS: jr["void"] |= (jr["known_year"] - span <= vy) & (vy <= jr["known_year"])
    def run(asof, targets, first_window_year):
        pool = jr[(jr["known_year"] <= asof) & (jr["known_year"] - span >= first_window_year) & ~jr["void"]]
        out = []
        for (g, b, a), tg in targets.groupby(gk + ["age"]):
            pg = pool[(pool["gender"] == g) & (pool["discipline"] == b) & (pool["age"] == a)]
            if len(pg) < PIPE_MIN_COMPARABLES: continue
            pz = pg["z"].values; pb = pg["best"].values; ph = pg["hit"].values; std = PER_OPT_STD.get((g, b)); w = weq.get((g, b))
            for t in tg.itertuples():
                dz = np.abs(pz - t.z); width = PIPE_Z; m = dz <= width; n = int(m.sum())
                if n < PIPE_MIN_COMPARABLES:
                    # the best juniors have few peers this close: take the nearest 25, as long as they are not too far off
                    width = float(np.sort(dz)[PIPE_MIN_COMPARABLES - 1])
                    if width > PIPE_Z_MAX: continue
                    m = dz <= width; n = int(m.sum())
                best = pb[m]; kept = best[~np.isnan(best)]
                q = np.percentile(kept, [10, 50, 90]) if len(kept) >= 5 else [np.nan] * 3
                out.append({"diver_id": t.diver_id, "diver_name": t.diver_name, "gender": g, "discipline": b, "season": int(t.meet_year), "age": float(a), "age_width": float(t.width),
                            "ppd": float(t.ppd), "pct_in_age": (float(t.pct_in_age) if pd.notna(t.pct_in_age) else None), "n_opt_dives": int(t.n_opt_dives),
                            "n_comparables": n, "match_width": round(width, 2), "comparables_gap": round(float(t.z - pz[m].mean()), 2), "share_competing": float(len(kept) / n), "best_p10": float(q[0]), "best_p50": float(q[1]), "best_p90": float(q[2]),
                            "standard_per_dive": std, "share_scored_standard": float(ph[m].sum() / n),
                            "share_at_standard": float((kept >= std).sum() / n) if std else None,
                            "world_per_dive": w, "share_at_world": (float((kept >= w).sum() / n) if w else None),
                            "reach_year_from": int(t.meet_year + PIPE_WINDOW[0] - a), "reach_year_to": int(t.meet_year + PIPE_WINDOW[1] - a)})
        return pd.DataFrame(out)
    cur = jr[jr["meet_year"] == maxyear]
    fc = run(maxyear, cur, PIPE_FIRST_WINDOW_YEAR)
    log(f"model8: {len(fc):,} junior forecasts for {maxyear} ({len(cur):,} juniors aged {PIPE_AGES[0]}-{PIPE_AGES[1]} with a known age window)")
    cohort = (fc.assign(birth_year=(fc["season"] - fc["age"]).astype(int), var=fc["share_scored_standard"] * (1 - fc["share_scored_standard"]))
                .groupby(gk + ["birth_year", "age", "reach_year_from", "reach_year_to"]).agg(n_juniors=("diver_id", "size"), expected_scored_standard=("share_scored_standard", "sum"),
                     var=("var", "sum"), expected_competing=("share_competing", "sum"), expected_at_standard=("share_at_standard", "sum")).reset_index()) if len(fc) else pd.DataFrame()
    if len(cohort): cohort["sd_scored_standard"] = np.sqrt(cohort["var"]); cohort = cohort.drop(columns=["var"])
    # backtest: forecast as of earlier seasons from what was known then, score against what happened
    bt = []
    for y0 in (2019, 2020, 2021):
        tg = jr[(jr["meet_year"] == y0) & (jr["known_year"] <= maxyear) & ~jr["void"]]
        f = run(y0, tg, PIPE_BACKTEST_FIRST_YEAR)
        if f.empty: continue
        act = tg.set_index(["diver_id"] + gk + ["age"])
        act = act[~act.index.duplicated(keep="first")]
        idx = list(zip(f["diver_id"], f["gender"], f["discipline"], f["age"]))
        f["best_actual"] = act["best"].reindex(idx).values; f["scored_actual"] = act["hit"].reindex(idx).fillna(False).astype(int).values
        f["competing_actual"] = f["best_actual"].notna().astype(int); f["level_actual"] = (f["best_actual"] >= f["standard_per_dive"]).astype(int); f["asof"] = y0
        bt.append(f)
    agg = dict(n=("diver_id", "size"), expected_scored_standard=("share_scored_standard", "sum"), actual_scored_standard=("scored_actual", "sum"),
               expected_competing=("share_competing", "sum"), actual_competing=("competing_actual", "sum"),
               expected_at_standard=("share_at_standard", "sum"), actual_at_standard=("level_actual", "sum"))
    if bt:
        B = pd.concat(bt)
        back = B.groupby(["asof"] + gk).agg(**agg).reset_index(); back["kind"] = "event"
        B["bin"] = pd.cut(B["share_scored_standard"], [-0.001, 0.05, 0.10, 0.20, 0.35, 0.50, 0.70, 1.0], labels=["0-5%", "5-10%", "10-20%", "20-35%", "35-50%", "50-70%", "70%+"])
        cal = B.groupby("bin", observed=True).agg(**agg).reset_index(); cal["kind"] = "calibration"; cal["bin"] = cal["bin"].astype(str)
        back = pd.concat([back, cal], ignore_index=True)
        tot_e, tot_a = float(B["share_scored_standard"].sum()), int(B["scored_actual"].sum())
        stats = {"backtest_n": int(len(B)), "expected_scored_standard": round(tot_e, 1), "actual_scored_standard": tot_a,
                 "expected_competing": round(float(B["share_competing"].sum()), 1), "actual_competing": int(B["competing_actual"].sum()),
                 "expected_at_standard": round(float(B["share_at_standard"].sum()), 1), "actual_at_standard": int(B["level_actual"].sum()),
                 "asof_seasons": sorted(int(v) for v in B["asof"].unique()), "forecast_first_window_year": PIPE_FIRST_WINDOW_YEAR, "backtest_first_window_year": PIPE_BACKTEST_FIRST_YEAR}
        log(f"model8 backtest: {len(B):,} junior forecasts as of 2019-2021; scored the standard expected {tot_e:.1f} vs actual {tot_a}; still competing expected {stats['expected_competing']} vs actual {stats['actual_competing']}")
    else:
        back = pd.DataFrame(columns=["asof", "gender", "discipline", "n", "expected_scored_standard", "actual_scored_standard", "expected_competing", "actual_competing", "expected_at_standard", "actual_at_standard", "kind", "bin"]); stats = {}
    return fc, cohort, back, stats

# ── write ─────────────────────────────────────────────────────────────────
def write_tables(conn, tables):
    cur = conn.cursor()
    cur.execute("CREATE SCHEMA IF NOT EXISTS hp_models")
    for name, frame in tables.items():
        frame = frame.copy()
        frame["method_version"] = METHOD_VERSION
        cols = []
        from pandas.api import types as pt
        for c in frame.columns:
            dt = frame[c].dtype
            if c.endswith("_id") or c in ("dm_id", "diver_id", "meet_id"):
                t = "text"; frame[c] = frame[c].astype(object).where(frame[c].notna(), None).map(lambda v: None if v is None else str(v))
            elif pt.is_bool_dtype(dt): t = "boolean"
            elif pt.is_integer_dtype(dt): t = "bigint"
            elif pt.is_float_dtype(dt): t = "double precision"
            else: t = "text"
            cols.append(f'"{c}" {t}')
        cur.execute(f"DROP TABLE IF EXISTS hp_models.{name}_new")
        cur.execute(f"CREATE TABLE hp_models.{name}_new ({', '.join(cols)}, built_at timestamptz NOT NULL DEFAULT now())")
        buf = io.StringIO(); frame.to_csv(buf, index=False, header=False, na_rep="\\N"); buf.seek(0)
        cur.copy_expert(f"COPY hp_models.{name}_new ({', '.join(chr(34)+c+chr(34) for c in frame.columns)}) FROM STDIN WITH (FORMAT csv, NULL '\\N')", buf)
        cur.execute(f"DROP TABLE IF EXISTS hp_models.{name}"); cur.execute(f"ALTER TABLE hp_models.{name}_new RENAME TO {name}")
        log(f"wrote hp_models.{name}: {len(frame):,} rows")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hpm_panel_key ON hp_models.panel_environment(panel_key)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hpm_panel_meet ON hp_models.panel_environment(meet_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hpm_asp_diver ON hp_models.athlete_season_ppd(diver_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hpm_bands ON hp_models.age_bands(gender, discipline, age)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hpm_sim ON hp_models.sim_athlete(gender, discipline)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hpm_syn_ath ON hp_models.synchro_athlete(gender, discipline)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hpm_pipe ON hp_models.pipeline_forecast(gender, discipline)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hpm_pipe_diver ON hp_models.pipeline_forecast(diver_id)")
    cur.execute("""DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usad_app') THEN
                     GRANT USAGE ON SCHEMA hp_models TO usad_app; GRANT SELECT ON ALL TABLES IN SCHEMA hp_models TO usad_app; END IF; END $$;""")
    cur.execute("""INSERT INTO app_meta.config (key, value) VALUES ('hp_models_last_run', %s)
                   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""", (json.dumps({"at": pd.Timestamp.utcnow().isoformat(), "ok": True, "method_version": METHOD_VERSION}),))
    conn.commit(); log("committed; usad_app SELECT granted on hp_models")

def method_rows(stats3, fit4, stats7=None, stats8=None):
    doc = __doc__
    def section(tag):
        m = re.search(rf"MODEL {tag} --(.*?)(?=\nMODEL|\n-{{10,}}\s*$|\Z)", doc, re.S); return m.group(0).strip() if m else ""
    return pd.DataFrame([
        {"model": "scoring_environment", "title": "Scoring environment (Model 3)", "method": section("3"), "stats": json.dumps(stats3)},
        {"model": "world_conversion", "title": "Domestic season to World Aquatics (Model 4)", "method": section("4"), "stats": json.dumps(fit4)},
        {"model": "age_progression", "title": "Age progression (Model 5)", "method": section("5"), "stats": "{}"},
        {"model": "simulated_totals", "title": "Simulated totals (Model 6)", "method": section("6"), "stats": "{}"},
        {"model": "synchro_conversion", "title": "Synchro conversion (Model 7)", "method": section("7"), "stats": json.dumps(stats7 or {})},
        {"model": "junior_pipeline", "title": "Junior pipeline (Model 8)", "method": section("8"), "stats": json.dumps(stats8 or {})},
    ])

def main():
    conn = None if DEV_PARQUET else connect()
    df = load_dives(conn); log(f"loaded {len(df):,} individual dives")
    links = load_links(conn)
    pan, meet, cohort, stats3 = model3(df, links)
    pairs, fit4, cuts, eq = model4(conn, pan)
    win, seasons, bands = model5(df)
    sim = model6(df, pan, cohort, conn, eq)
    syn_fit, syn_off, syn_val, syn_ath, stats7 = model7(df, pan, cohort, load_synchro(conn))
    pipe_fc, pipe_cohort, pipe_back, stats8 = model8(seasons, bands, eq, national_hits(df))
    tables = {"pipeline_forecast": pipe_fc, "pipeline_cohort": pipe_cohort, "pipeline_backtest": pipe_back,
              "synchro_fit": syn_fit, "synchro_offsets": syn_off, "synchro_validation": syn_val, "synchro_athlete": syn_ath,
              "sim_athlete": sim,"panel_environment": pan, "meet_environment": meet, "cohort_reference": cohort,
              "world_conversion_pairs": pairs, "world_conversion_fit": pd.DataFrame([fit4]) if fit4 else pd.DataFrame(columns=["n"]),
              "world_cuts": cuts, "world_standard_equiv": eq, "age_window": win, "athlete_season_ppd": seasons, "age_bands": bands,
              "method": method_rows(stats3, fit4, stats7, stats8)}
    if DEV_PARQUET:
        out = os.environ.get("HP_MODELS_DEV_OUT", "/tmp/hp_models_out"); os.makedirs(out, exist_ok=True)
        for k, v in tables.items(): v.to_csv(os.path.join(out, k + ".csv"), index=False)
        log(f"dev run: wrote CSVs to {out}"); return
    write_tables(conn, tables)

if __name__ == "__main__":
    if not CONN and not DEV_PARQUET: sys.exit("NEON_DATABASE_URL not set")
    main()
