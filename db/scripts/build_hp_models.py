#!/usr/bin/env python3
"""
build_hp_models.py -- the three High Performance models, rebuilt nightly into
the `hp_models` schema from core.dive_sheets / core.result_phases.

  Model 3  Scoring environment    hp_models.panel_environment, meet_environment,
                                  cohort_reference
  Model 4  Domestic -> World      hp_models.world_conversion_pairs, world_conversion_fit,
                                  world_cuts, world_standard_equiv
  Model 5  Age progression        hp_models.age_window, athlete_season_ppd, age_bands

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
  (season, group) observation gives a birth-year interval; the intersection
  across seasons is the window. Contradictory windows (age-ups, mis-entered
  groups) are kept with consistent = false and excluded from bands. Age =
  season - midpoint of the window; width is stored so the uncertainty shows.
  Metric: points per OPTIONAL dive = 3 x DD x exec, averaged over the
  athlete's optional dives in that season and board (voluntary dives carry an
  assigned DD and would understate difficulty). Bands = percentiles of all
  athlete-seasons with window width <= 2 and 6+ optional dives, per gender x
  board x age, published only where n >= 40.
------------------------------------------------------------------------------
"""
import os, sys, io, json, time, re
import numpy as np, pandas as pd
import scipy.sparse as sp, scipy.sparse.csgraph as cg

METHOD_VERSION = "hp-models-2026-11-08.1"
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
    d = read_sql(conn, "SELECT canonical_id, wa_id FROM analytics.athlete_directory WHERE wa_id IS NOT NULL AND match_method = 'name_token_exact'")
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
                               WHERE a.match_method = 'name_token_exact' AND a.nat = 'USA' AND r.competition_family = 'World Aquatics' AND NOT COALESCE(r.is_synchronized, false)""")
        dom = read_sql(conn, """SELECT a.canonical_id AS dm_id, r.meet_id, r.meet_year, r.meet_name, r.competition_group, r.event_round, r.round_stage, r.gender, r.discipline,
                                       r.place, r.posted_score, r.phase_score_from_dives, r.phase_dd_sum, r.phase_dive_count, r.score_is_cumulative
                                FROM analytics.athlete_directory a JOIN core.result_phases r ON r.diver_id = a.canonical_id
                                WHERE a.match_method = 'name_token_exact' AND a.nat = 'USA' AND r.competition_family = 'USA Diving'
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
    cur.execute("""DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usad_app') THEN
                     GRANT USAGE ON SCHEMA hp_models TO usad_app; GRANT SELECT ON ALL TABLES IN SCHEMA hp_models TO usad_app; END IF; END $$;""")
    cur.execute("""INSERT INTO app_meta.config (key, value) VALUES ('hp_models_last_run', %s)
                   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""", (json.dumps({"at": pd.Timestamp.utcnow().isoformat(), "ok": True, "method_version": METHOD_VERSION}),))
    conn.commit(); log("committed; usad_app SELECT granted on hp_models")

def method_rows(stats3, fit4):
    doc = __doc__
    def section(tag):
        m = re.search(rf"MODEL {tag} --(.*?)(?=\nMODEL|\n-{{10,}}\s*$|\Z)", doc, re.S); return m.group(0).strip() if m else ""
    return pd.DataFrame([
        {"model": "scoring_environment", "title": "Scoring environment (Model 3)", "method": section("3"), "stats": json.dumps(stats3)},
        {"model": "world_conversion", "title": "Domestic season to World Aquatics (Model 4)", "method": section("4"), "stats": json.dumps(fit4)},
        {"model": "age_progression", "title": "Age progression (Model 5)", "method": section("5"), "stats": "{}"},
    ])

def main():
    conn = None if DEV_PARQUET else connect()
    df = load_dives(conn); log(f"loaded {len(df):,} individual dives")
    links = load_links(conn)
    pan, meet, cohort, stats3 = model3(df, links)
    pairs, fit4, cuts, eq = model4(conn, pan)
    win, seasons, bands = model5(df)
    tables = {"panel_environment": pan, "meet_environment": meet, "cohort_reference": cohort,
              "world_conversion_pairs": pairs, "world_conversion_fit": pd.DataFrame([fit4]) if fit4 else pd.DataFrame(columns=["n"]),
              "world_cuts": cuts, "world_standard_equiv": eq, "age_window": win, "athlete_season_ppd": seasons, "age_bands": bands,
              "method": method_rows(stats3, fit4)}
    if DEV_PARQUET:
        out = os.environ.get("HP_MODELS_DEV_OUT", "/tmp/hp_models_out"); os.makedirs(out, exist_ok=True)
        for k, v in tables.items(): v.to_csv(os.path.join(out, k + ".csv"), index=False)
        log(f"dev run: wrote CSVs to {out}"); return
    write_tables(conn, tables)

if __name__ == "__main__":
    if not CONN and not DEV_PARQUET: sys.exit("NEON_DATABASE_URL not set")
    main()
