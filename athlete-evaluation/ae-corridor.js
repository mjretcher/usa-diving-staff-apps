/* ============================================================
   ae-corridor.js — Medal Track. Empirical answer to the talent-ID
   question: "what were future senior finalists and internationals
   scoring at Junior Nationals?" Bands come from official Junior
   Nationals FINAL totals (2021+) of every athlete who later reached
   a US senior-championships final (blue band) or competed at a
   World Aquatics senior event (red band). Overlay any athlete to
   see where they sit on the track. Cohort n<3 renders dots only;
   n<5 renders faded — small samples never masquerade as bands.
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr } = window.AE;
  const C = window.AECharts;
  const GROUPS = ['Group D', 'Group C', 'Group B', 'Group A']; // progression order
  const st = { gender: 'Male', board: '3m' };
  const f1 = (v) => v == null ? '—' : Number(v).toFixed(1);

  async function render(root) {
    root.innerHTML = `<div class="ae-card"><div class="ae-empty">Loading medal track…</div></div>`;
    let bands = [], marks = [], own = [];
    try {
      [bands, marks] = await Promise.all([
        window.AE.corridor(st.gender, st.board),
        window.AE.corridorMarks(st.gender, st.board),
      ]);
    } catch (e) {
      root.innerHTML = `<div class="ae-card"><div class="ae-empty" style="color:var(--brand-red)">Could not load corridor: ${esc(e.message)}</div></div>`;
      return;
    }

    const b = window.AE.state.bundle;
    const dmId = b && b.ident.dm_id;
    const athleteGender = b && (b.phases.find((p) => p.gender === 'Male' || p.gender === 'Female') || {}).gender;
    if (b && dmId && athleteGender === st.gender) {
      try { own = await window.AE.juniorMarks(dmId); } catch (e) { own = []; }
    }
    const ownForBoard = own.filter((m) => m.discipline === st.board);

    const groups = GROUPS.map((g) => {
      const senior = bands.find((x) => x.tier === 'senior' && x.age_group === g) || null;
      const intl = bands.find((x) => x.tier === 'intl' && x.age_group === g) || null;
      const dots = marks.filter((m) => m.age_group === g).map((m) => ({ y: m.best_score, name: m.display_name, year: m.best_year, tier: m.tier }));
      const mine = ownForBoard.find((m) => m.age_group === g);
      const athlete = mine ? {
        y: mine.final_best != null ? mine.final_best : mine.any_best,
        hollow: mine.final_best == null,
        label: `${b.ident.display_name} — ${g}: ${(mine.final_best != null ? mine.final_best : mine.any_best).toFixed(1)}${mine.final_best == null ? ' (no Nationals final yet — best round shown)' : ''} (${mine.last_year})`,
      } : null;
      return { label: g.replace('Group ', 'Group '), senior: senior && { n: senior.n_athletes, p10: senior.p10, p25: senior.p25, p50: senior.p50, p75: senior.p75, p90: senior.p90 },
               intl: intl && { n: intl.n_athletes, p10: intl.p10, p25: intl.p25, p50: intl.p50, p75: intl.p75, p90: intl.p90 }, dots, athlete };
    });

    const caveatGroups = st.gender === 'Female' ? 'Group A, Group C, and Group D' : 'Group A and Group D';
    const narr = narrative(groups, b, ownForBoard);

    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>Medal Track — where future seniors were as juniors</h3>
          <p class="ae-soft">Official Junior Nationals final totals (2021 on) of every athlete who went on to reach a US senior-championships final (blue band) or dive a World Aquatics senior event (red band). Box = middle half, thick line = typical, whisker = 10th–90th. Dots are the actual athletes — hover for names. ${b ? '' : 'Select an athlete above to plot them on the track.'}</p></div>
          <div class="ae-controls">
            <button class="ae-pill ${st.gender === 'Male' ? 'active' : ''}" onclick="AECorridor.set('gender','Male')">Boys</button>
            <button class="ae-pill ${st.gender === 'Female' ? 'active' : ''}" onclick="AECorridor.set('gender','Female')">Girls</button>
            <span class="ae-ctrl-gap"></span>
            <button class="ae-pill ${st.board === '3m' ? 'active' : ''}" onclick="AECorridor.set('board','3m')">3m</button>
            <button class="ae-pill ${st.board === 'Platform' ? 'active' : ''}" onclick="AECorridor.set('board','Platform')">Platform</button>
            <button class="ae-pill ${st.board === '1m' ? 'active' : ''}" onclick="AECorridor.set('board','1m')">1m</button>
          </div>
        </div>
        ${C.corridorBands(groups, { w: 900, h: 360 })}
        <div class="ae-legend">
          <span><i style="background:#8FC3EA"></i>Reached a US senior final</span>
          <span><i style="background:#FBD9DE;border:1.5px solid #E31937"></i>Went international (World Aquatics)</span>
          ${b && ownForBoard.length ? `<span><i style="background:#C9A227;border-radius:50%"></i>${esc(b.ident.display_name)}</span>` : ''}
        </div>
        ${narr ? `<div class="ae-narrate">${esc(narr)}</div>` : ''}
        <p class="ae-soft ae-footnote">Bands with fewer than 5 athletes are faded; fewer than 3 show as dots only. Heads-up on eras: junior dive counts changed on Jan 1, 2024 for ${caveatGroups} — totals before and after that line reflect different list lengths (Group B is unchanged across all years). ${st.gender === 'Female' ? '' : 'Group C boys are also unchanged. '}Athletes' careers span 2021–2026; the corridor grows as the scraper back-fills more seasons.</p>
      </div>`;
  }

  function narrative(groups, b, ownForBoard) {
    if (!b || !ownForBoard.length) return '';
    // most recent group with a mark
    const withMark = groups.filter((g) => g.athlete);
    if (!withMark.length) return '';
    const g = withMark[withMark.length - 1];
    const y = g.athlete.y;
    const ref = g.intl && g.intl.n >= 3 ? { b: g.intl, name: 'the international band' } : g.senior && g.senior.n >= 3 ? { b: g.senior, name: 'the senior-finalist band' } : null;
    if (!ref) return '';
    const first = b.ident.display_name.split(' ')[0];
    if (y >= ref.b.p75) return `${first}'s ${g.label} best (${f1(y)}) sits in the top quarter of ${ref.name} — squarely on the medal track.`;
    if (y >= ref.b.p50) return `${first}'s ${g.label} best (${f1(y)}) is above the typical mark for ${ref.name} — on track.`;
    if (y >= ref.b.p25) return `${first}'s ${g.label} best (${f1(y)}) lands inside ${ref.name}, below its midline — on the track, with ground to make up.`;
    if (y >= ref.b.p10) return `${first}'s ${g.label} best (${f1(y)}) is at the lower edge of ${ref.name} — athletes have climbed from here, but the trajectory needs to steepen.`;
    return `${first}'s ${g.label} best (${f1(y)}) is below ${ref.name} at the same stage — the gap is real, and so is the time to close it.`;
  }

  window.AECorridor = {
    render,
    set(k, v) { st[k] = v; window.AEApp.rerender(); },
    st,
  };
})();
