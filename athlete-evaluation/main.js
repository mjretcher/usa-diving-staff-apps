const DATA = window.DIVE_APP_DATA || { meta: {}, results: [], dives: [] };
const DATA_INDEX = window.DIVE_APP_DATA_INDEX || null;
const YEAR_DATA = window.DIVE_YEAR_DATA || (window.DIVE_YEAR_DATA = {});
const loadedYearSet = new Set();

const GROUPS = [
  { code: "1", name: "Front" },
  { code: "2", name: "Back" },
  { code: "3", name: "Reverse" },
  { code: "4", name: "Inward" },
  { code: "5", name: "Twister" },
  { code: "6", name: "Armstand" },
];

const GROUP_BY_CODE = Object.fromEntries(GROUPS.map((group) => [group.code, group]));
const COLORS = {
  blue: "#171f69",
  red: "#e31937",
  gray: "#5f6062",
  sky: "#8fc3ea",
  cyan: "#009ac7",
  green: "#087456",
  gold: "#a76200",
};

const state = {
  filteredRows: [],
  benchmarkRows: [],
  selectedAthleteName: "",
  mixedCandidates: [],
  whatIfProfiles: [],
  pendingWhatIfPicks: null,
  selectedPointIndex: null,
  ddLookup: null,
  ddOptionsByBoard: {},
  individualWhatIfPicks: [],
  synchroPairWhatIfPicks: [],
  meetPickerQuery: "",
  eventPickerQuery: "",
  yearPickerQuery: "",
  topRowsSort: { key: "score", direction: "desc" },
  analysis: null,
  voluntaryWatchlist: [],
  voluntaryReportRows: [],
};

const els = {
  yearFilter: document.getElementById("yearFilter"),
  scopePreset: document.getElementById("scopePreset"),
  eventLevelFilter: document.getElementById("eventLevelFilter"),
  ageGroupFilter: document.getElementById("ageGroupFilter"),
  meetFilter: document.getElementById("meetFilter"),
  eventFilter: document.getElementById("eventFilter"),
  eventSearch: document.getElementById("eventSearch"),
  athleteSearch: document.getElementById("athleteSearch"),
  athleteOptions: document.getElementById("athleteOptions"),
  genderFilter: document.getElementById("genderFilter"),
  boardFilter: document.getElementById("boardFilter"),
  groupFilter: document.getElementById("groupFilter"),
  placementCutoff: document.getElementById("placementCutoff"),
  comparisonPopulation: document.getElementById("comparisonPopulation"),
  heatmapDimension: document.getElementById("heatmapDimension"),
  heatmapMetric: document.getElementById("heatmapMetric"),
  mixedLimit: document.getElementById("mixedLimit"),
  whatIfFemale3: document.getElementById("whatIfFemale3"),
  whatIfMale3: document.getElementById("whatIfMale3"),
  whatIfFemale10: document.getElementById("whatIfFemale10"),
  whatIfMale10: document.getElementById("whatIfMale10"),
  individualAthleteSearch: document.getElementById("individualAthleteSearch"),
  individualAthleteOptions: document.getElementById("individualAthleteOptions"),
  individualAthleteSelect: document.getElementById("individualAthleteSelect"),
  individualBoardSelect: document.getElementById("individualBoardSelect"),
  individualListSize: document.getElementById("individualListSize"),
  individualBenchmarkScope: document.getElementById("individualBenchmarkScope"),
  synchroPairGender: document.getElementById("synchroPairGender"),
  synchroPairBoard: document.getElementById("synchroPairBoard"),
  synchroPairEventType: document.getElementById("synchroPairEventType"),
  synchroPairDiver1: document.getElementById("synchroPairDiver1"),
  synchroPairDiver2: document.getElementById("synchroPairDiver2"),
  synchroPairListSize: document.getElementById("synchroPairListSize"),
  synchroPairBenchmarkScope: document.getElementById("synchroPairBenchmarkScope"),
  compareYearA: document.getElementById("compareYearA"),
  compareMeetA: document.getElementById("compareMeetA"),
  compareEventA: document.getElementById("compareEventA"),
  compareGenderA: document.getElementById("compareGenderA"),
  compareBoardA: document.getElementById("compareBoardA"),
  compareYearB: document.getElementById("compareYearB"),
  compareMeetB: document.getElementById("compareMeetB"),
  compareEventB: document.getElementById("compareEventB"),
  compareGenderB: document.getElementById("compareGenderB"),
  compareBoardB: document.getElementById("compareBoardB"),
  volReportGender: document.getElementById("volReportGender"),
  volReportBoard: document.getElementById("volReportBoard"),
  volReportSource: document.getElementById("volReportSource"),
  volReportNameSearch: document.getElementById("volReportNameSearch"),
  volReportNameOptions: document.getElementById("volReportNameOptions"),
};


const AnalysisEngine = {
  build(filteredRows, benchmarkRows) {
    const rows = filteredRows || [];
    const benchmark = benchmarkRows && benchmarkRows.length ? benchmarkRows : rows;
    const groups = visualGroups(rows.concat(benchmark));
    const summary = this.summary(rows, benchmark);
    const groupInsights = this.groupInsights(rows, benchmark, groups);
    const athletes = this.athleteDrivers(rows);
    const eventBenchmarks = this.eventBenchmarks(rows);
    return {
      rows,
      benchmark,
      groups,
      summary,
      groupInsights,
      athletes,
      eventBenchmarks,
      weakGroups: groupInsights.slice().sort((a, b) => a.priorityScore - b.priorityScore),
      strongGroups: groupInsights.slice().sort((a, b) => b.avgScore - a.avgScore),
    };
  },
  summary(rows, benchmark) {
    const dives = collectDives(rows);
    const benchmarkDives = collectDives(benchmark);
    const avgScore = mean(rows.map((row) => row.__score));
    const avgDd = mean(rows.map((row) => row.__dd));
    const benchmarkScore = mean(benchmark.map((row) => row.__score));
    const benchmarkDd = mean(benchmark.map((row) => row.__dd));
    return {
      resultCount: rows.length,
      diveCount: dives.length,
      avgScore,
      avgDd,
      benchmarkScore,
      benchmarkDd,
      scoreGap: diffValues(avgScore, benchmarkScore),
      ddGap: diffValues(avgDd, benchmarkDd),
      diveScore: mean(dives.map((dive) => dive.__score)),
      benchmarkDiveScore: mean(benchmarkDives.map((dive) => dive.__score)),
      consistency: stdev(dives.map((dive) => dive.__score)),
      benchmarkConsistency: stdev(benchmarkDives.map((dive) => dive.__score)),
    };
  },
  groupInsights(rows, benchmark, groups) {
    const primaryStats = groupStats(rows, groups);
    const benchmarkStats = Object.fromEntries(groupStats(benchmark, groups).map((stat) => [stat.code, stat]));
    return primaryStats.map((stat) => {
      const bench = benchmarkStats[stat.code] || {};
      const scoreGap = diffValues(stat.avgScore, bench.avgScore);
      const ddGap = diffValues(stat.avgDd, bench.avgDd);
      const consistencyGap = diffValues(stat.consistency, bench.consistency);
      const thinDataPenalty = stat.count < 5 ? 4 : stat.count < 10 ? 2 : 0;
      const riskScore = (isFiniteNumber(scoreGap) ? Math.max(0, -scoreGap) : 0) +
        (isFiniteNumber(ddGap) ? Math.max(0, -ddGap) * 5 : 0) +
        (isFiniteNumber(stat.consistency) ? stat.consistency * 0.25 : 0) +
        thinDataPenalty;
      const priorityScore = 100 - riskScore * 8;
      return {
        ...stat,
        benchmarkScore: bench.avgScore,
        benchmarkDd: bench.avgDd,
        benchmarkConsistency: bench.consistency,
        scoreGap,
        ddGap,
        consistencyGap,
        riskScore,
        priorityScore,
        focusReason: this.focusReason(stat, scoreGap, ddGap),
      };
    });
  },
  focusReason(stat, scoreGap, ddGap) {
    const reasons = [];
    if (isFiniteNumber(scoreGap) && scoreGap < -1) reasons.push(`score is ${formatNumber(Math.abs(scoreGap), 1)} below benchmark`);
    if (isFiniteNumber(ddGap) && ddGap < -0.1) reasons.push(`DD is ${formatNumber(Math.abs(ddGap), 2)} below benchmark`);
    if (isFiniteNumber(stat.consistency) && stat.consistency > 8) reasons.push(`wide score spread (SD ${formatNumber(stat.consistency, 1)})`);
    if (stat.count < 5) reasons.push(`thin sample (${formatInt(stat.count)} dives)`);
    return reasons.join('; ') || 'stable relative to benchmark';
  },
  athleteDrivers(rows) {
    const byAthlete = groupBy(rows, (row) => row.__athlete);
    return [...byAthlete.entries()].map(([athlete, athleteRows]) => ({
      athlete,
      rows: athleteRows.length,
      avgScore: mean(athleteRows.map((row) => row.__score)),
      avgDd: mean(athleteRows.map((row) => row.__dd)),
      diveCount: collectDives(athleteRows).length,
      consistency: stdev(collectDives(athleteRows).map((dive) => dive.__score)),
    })).sort((a, b) => b.avgScore - a.avgScore || b.avgDd - a.avgDd).slice(0, 8);
  },
  eventBenchmarks(rows) {
    const byEvent = groupBy(rows, (row) => row.__event);
    return [...byEvent.entries()].map(([event, eventRows]) => ({
      event,
      rows: eventRows.length,
      avgScore: mean(eventRows.map((row) => row.__score)),
      avgDd: mean(eventRows.map((row) => row.__dd)),
    })).sort((a, b) => b.avgScore - a.avgScore).slice(0, 8);
  },
};

async function init() {
  await prepareInitialData();
  normalizeData();
  fillFilters();
  loadVoluntaryWatchlist();
  updateVoluntaryNameOptions();
  renderVoluntaryWatchlist();
  bindEvents();
  bindVoluntaryWorkbookEvents();
  bindEvidenceCompareDropdowns();
  render();
}

async function prepareInitialData() {
  if (!DATA_INDEX) return;
  const years = availableYears();
  const initialYears = defaultYearScope(years);
  await ensureYearDataLoaded(initialYears);
  composeLoadedData();
}

function availableYears() {
  if (DATA_INDEX?.years) return Object.keys(DATA_INDEX.years).filter(Boolean).sort((a, b) => Number(b) - Number(a));
  return unique(DATA.results.map((row) => row.__year || deriveYear(row.meet_year || row.event_date || row.start_date || row.end_date || row.meet_name))).filter(Boolean).sort((a, b) => Number(b) - Number(a));
}

async function ensureSelectedYearDataLoaded() {
  if (!DATA_INDEX) return false;
  const selectedYears = selectedYearValues();
  const yearsToLoad = selectedYears.length ? selectedYears : availableYears();
  const changed = await ensureYearDataLoaded(yearsToLoad);
  if (changed) {
    composeLoadedData();
    state.whatIfProfiles = [];
    state.mixedCandidates = [];
    normalizeData();
  }
  return changed;
}

async function ensureYearDataLoaded(years) {
  if (!DATA_INDEX) return false;
  const needed = years.map(String).filter((year) => DATA_INDEX.years[year] && !loadedYearSet.has(year));
  if (!needed.length) return false;
  setDataLoadStatus(`Loading ${needed.join(", ")} history...`);
  for (const year of needed) {
    await loadYearScript(year);
    loadedYearSet.add(year);
  }
  setDataLoadStatus(`Loaded ${[...loadedYearSet].sort().join(", ")}`);
  return true;
}

function loadYearScript(year) {
  return new Promise((resolve, reject) => {
    if (YEAR_DATA[year]) return resolve();
    const file = DATA_INDEX.years[year]?.file;
    if (!file) return resolve();
    const script = document.createElement("script");
    script.src = `./${file}?v=history-${year}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load ${file}`));
    document.head.appendChild(script);
  });
}

function composeLoadedData() {
  if (!DATA_INDEX) return;
  const years = [...loadedYearSet].sort((a, b) => Number(b) - Number(a));
  DATA.results = years.flatMap((year) => YEAR_DATA[year]?.results || []);
  DATA.dives = years.flatMap((year) => YEAR_DATA[year]?.dives || []);
  DATA.meta = { ...(DATA_INDEX.meta || {}), loadedYears: years, rows: DATA.results.length, diveRows: DATA.dives.length };
}

function setDataLoadStatus(message) {
  const el = document.getElementById("scopeSummary");
  if (el) el.textContent = message;
}

function normalizeData() {
  DATA.results = (DATA.results || []).map((row, index) => {
    const normalized = {
      ...row,
      __index: index,
      __key: resultKey(row),
      __meet: clean(row.meet_name) || "Unknown meet",
      __event: eventLabel(row),
      __athlete: clean(row.diver_name) || "Unknown athlete",
      __gender: clean(row.gender) || "Unknown",
      __eventLevel: clean(row.event_level || row.level || row.division) || "Unknown",
      __ageGroup: clean(row.age_group || row.age || row.division) || "Unknown",
      __board: normalizeBoard(row.discipline || row.event_name),
      __place: number(row.place),
      __score: scoreValue(row),
      __dd: ddTotalValue(row),
      __date: clean(row.event_date || row.start_date || row.end_date || row.meet_year),
      __year: deriveYear(row.meet_year || row.event_date || row.start_date || row.end_date || row.meet_name),
      __isSync: truthy(row.is_synchronized),
      __nat: clean(row.nat || row.country || row.federation || row.country_code || row.nationality),
    };
    return normalized;
  });

  const resultInfoByKey = new Map(DATA.results.map((row) => [row.__key, {
    nat: row.__nat,
    isSync: row.__isSync,
    teamName: row.team_name,
    meet: row.__meet,
    event: row.__event,
    athlete: row.__athlete,
    gender: row.__gender,
    board: row.__board,
    year: row.__year,
    place: row.__place,
  }]));

  DATA.dives = (DATA.dives || []).map((row, index) => {
    const canonicalCode = canonicalDiveCode(row.dive_number);
    const code = diveGroupCode(canonicalCode || row.dive_number);
    const matchedResult = resultInfoByKey.get(resultKey(row)) || {};
    const board = normalizeBoard(row.height || row.discipline || row.event_name || matchedResult.board);
    return {
      ...row,
      __index: index,
      __key: resultKey(row),
      __meet: clean(row.meet_name) || matchedResult.meet || "Unknown meet",
      __event: eventLabel(row) || matchedResult.event || "Unknown event",
      __athlete: clean(row.diver_name) || matchedResult.athlete || "Unknown athlete",
      __gender: clean(row.gender) || matchedResult.gender || "Unknown",
      __eventLevel: clean(row.event_level || matchedResult.eventLevel) || "Unknown",
      __ageGroup: clean(row.age_group || matchedResult.ageGroup) || "Unknown",
      __board: board,
      __heightLevel: normalizeHeightLevel(row.height || row.discipline || row.event_name || matchedResult.board),
      __diveCode: canonicalCode,
      __diveCodes: extractDiveCodes(row.dive_number),
      __year: deriveYear(row.meet_year || row.event_date || row.start_date || row.end_date || row.meet_name || matchedResult.year),
      __group: code,
      __groupName: GROUP_BY_CODE[code]?.name || "Unknown",
      __score: number(row.score ?? row.net_score),
      __netScore: number(row.net_score),
      __dd: normalizeDdValue(row.dd),
      __order: number(row.dive_order),
      __place: firstNumber(row.event_place, row.round_place, matchedResult.place),
      __optional: optionalLabel(row.optional_voluntary),
      __isSync: truthy(row.is_synchronized) || Boolean(matchedResult.isSync) || lower(`${row.discipline || ""} ${row.event_name || ""}`).includes("synch"),
      __nat: clean(row.nat || row.country || row.federation || row.country_code || row.nationality || matchedResult.nat),
    };
  });

  state.ddLookup = buildDdLookup();

  const divesByKey = new Map();
  DATA.dives.forEach((dive) => {
    if (!divesByKey.has(dive.__key)) divesByKey.set(dive.__key, []);
    divesByKey.get(dive.__key).push(dive);
  });

  DATA.results.forEach((row) => {
    row.__dives = divesByKey.get(row.__key) || [];
    if (!isFiniteNumber(row.__dd) && row.__dives.length) row.__dd = sum(row.__dives.map((dive) => dive.__dd));
    row.__avgDiveScore = mean(row.__dives.map((dive) => dive.__score));
    row.__consistency = stdev(row.__dives.map((dive) => dive.__score));
  });

  setText("summaryMeets", `${formatInt(unique(DATA.results.map((row) => row.__meet)).length)} meets`);
  setText("summaryEvents", `${formatInt(unique(DATA.results.map((row) => row.__event)).length)} events`);
  setText("summaryAthletes", `${formatInt(unique(DATA.results.map((row) => row.__athlete)).length)} athletes`);
  setText("summaryDives", `${formatInt(DATA.dives.length)} dives`);
}

function fillFilters() {
  fillYearOptions(true);
  fillSelect(els.genderFilter, unique(DATA.results.map((row) => row.__gender)).sort(), "All genders");
  if (els.eventLevelFilter) fillSelect(els.eventLevelFilter, unique(DATA.results.map((row) => row.__eventLevel)).sort(), "All levels");
  if (els.ageGroupFilter) fillSelect(els.ageGroupFilter, unique(DATA.results.map((row) => row.__ageGroup)).sort(), "All age groups");
  fillMeetOptions();
  fillEventOptions();
  updateAthleteOptions();
  fillCompareControls();
  populateSynchroPairControls(false);
  updateVoluntaryNameOptions();
}

function fillYearOptions(defaultRecent = false) {
  const years = availableYears();
  fillSelect(els.yearFilter, years, "All years");
  if (defaultRecent) {
    const recent = defaultYearScope(years);
    Array.from(els.yearFilter.options).forEach((option) => {
      option.selected = recent.length ? recent.includes(String(option.value)) : option.value === "all";
    });
    const allOption = Array.from(els.yearFilter.options).find((option) => option.value === "all");
    if (allOption && recent.length) allOption.selected = false;
  }
  renderMultiPicker("year");
}

function defaultYearScope(years) {
  const set = new Set(years.map(String));
  const preferred = ["2026", "2025"].filter((year) => set.has(year));
  if (preferred.length) return preferred;
  return years.slice(0, 2).map(String);
}

function updateAthleteOptions() {
  const rows = applyCurrentContext(DATA.results, { ignoreAthlete: true, ignoreGroup: true });
  const athleteNames = unique(rows.map((row) => row.__athlete)).sort();
  const limitedNames = athleteNames.slice(0, 900);
  const overflow = athleteNames.length > limitedNames.length ? `<!-- ${athleteNames.length - limitedNames.length} additional names available through filters -->` : "";
  if (els.athleteOptions) {
    els.athleteOptions.innerHTML = limitedNames.map((name) => `<option value="${escapeAttr(name)}"></option>`).join("") + overflow;
  }
  if (els.individualAthleteOptions) {
    els.individualAthleteOptions.innerHTML = limitedNames.map((name) => `<option value="${escapeAttr(name)}"></option>`).join("") + overflow;
  }
  if (els.individualAthleteSelect) {
    const current = els.individualAthleteSelect.value;
    fillSelect(els.individualAthleteSelect, athleteNames, "Select athlete");
    if (current && athleteNames.includes(current)) els.individualAthleteSelect.value = current;
  }
  const athleteHelp = document.getElementById("athleteScopeHelp");
  if (athleteHelp) {
    athleteHelp.textContent = `${formatInt(athleteNames.length)} athletes in the active scope. Narrow years, level, age group, meet, or event before typing if the list is too broad.`;
  }
  updateVoluntaryNameOptions();
}


function fillMeetOptions() {
  const selected = new Set(selectedMeetValues());
  const meets = unique(DATA.results
    .filter((row) => passesScopeFilters(row, { ignoreMeet: true, ignoreEvent: true, ignoreAthlete: true, ignoreGroup: true, ignoreBoard: true }))
    .map((row) => row.__meet))
    .sort((a, b) => a.localeCompare(b));
  fillSelect(els.meetFilter, meets, "All meets");
  Array.from(els.meetFilter.options).forEach((option) => {
    option.selected = selected.size ? selected.has(option.value) : option.value === "all";
  });
  renderMultiPicker("meet");
}

function fillEventOptions() {
  const selected = new Set(selectedEventValues());
  const events = unique(DATA.results
    .filter((row) => passesScopeFilters(row, { ignoreEvent: true, ignoreAthlete: true, ignoreGroup: true }))
    .map((row) => row.__event))
    .sort((a, b) => a.localeCompare(b));
  fillSelect(els.eventFilter, events, "All applicable events");
  Array.from(els.eventFilter.options).forEach((option) => {
    option.selected = selected.size ? selected.has(option.value) : option.value === "all";
  });
  renderMultiPicker("event");
}


function pickerConfig(kind) {
  if (kind === "year") return { kind, select: els.yearFilter, containerId: "yearPicker", queryKey: "yearPickerQuery", searchId: "yearPickerSearch", noun: "year" };
  if (kind === "meet") return { kind, select: els.meetFilter, containerId: "meetPicker", queryKey: "meetPickerQuery", searchId: "meetPickerSearch", noun: "meet" };
  return { kind, select: els.eventFilter, containerId: "eventPicker", queryKey: "eventPickerQuery", searchId: "eventPickerSearch", noun: "event" };
}

function renderMultiPicker(kind) {
  const cfg = pickerConfig(kind);
  const container = document.getElementById(cfg.containerId);
  if (!container || !cfg.select) return;
  const query = state[cfg.queryKey] || "";
  const allOptions = Array.from(cfg.select.options).filter((option) => option.value !== "all");
  const selected = allOptions.filter((option) => option.selected).map((option) => option.value);
  const visible = allOptions.filter((option) => !query || lower(option.textContent).includes(lower(query)));
  const selectedSummary = selected.length ? `${formatInt(selected.length)} selected` : `All ${cfg.noun}s`;
  const list = visible.length ? visible.map((option) => `
    <label class="multi-picker-option">
      <input type="checkbox" data-picker-kind="${cfg.kind}" value="${escapeAttr(option.value)}" ${option.selected ? "checked" : ""} />
      <span>${escapeHtml(option.textContent || option.value)}</span>
    </label>`).join("") : `<div class="multi-picker-empty">No matching ${escapeHtml(cfg.noun)}s.</div>`;
  const yearActions = cfg.kind === "year" ? `
      <button type="button" data-picker-action="recentYears" data-picker-kind="${cfg.kind}">Recent focus</button>
      <button type="button" data-picker-action="quadYears" data-picker-kind="${cfg.kind}">2024-2026</button>` : "";
  container.innerHTML = `
    <div class="multi-picker-header">
      <input id="${cfg.searchId}" type="search" data-picker-search="${cfg.kind}" placeholder="Search ${escapeAttr(cfg.noun)}s" value="${escapeAttr(query)}" />
    </div>
    <div class="multi-picker-actions">
      <button type="button" data-picker-action="all" data-picker-kind="${cfg.kind}">Use all</button>
      ${yearActions}
      <button type="button" data-picker-action="selectVisible" data-picker-kind="${cfg.kind}">Select visible</button>
      <button type="button" data-picker-action="clear" data-picker-kind="${cfg.kind}">Clear</button>
    </div>
    <div class="multi-picker-summary">${escapeHtml(selectedSummary)}</div>
    <div class="multi-picker-list">${list}</div>`;
}

function bindMultiPickerEvents() {
  ["year", "meet", "event"].forEach((kind) => {
    const cfg = pickerConfig(kind);
    const container = document.getElementById(cfg.containerId);
    if (!container) return;
    container.addEventListener("input", (event) => {
      const input = event.target.closest("[data-picker-search]");
      if (!input) return;
      state[cfg.queryKey] = input.value;
      renderMultiPicker(kind);
      const refreshed = document.getElementById(cfg.searchId);
      if (refreshed) {
        refreshed.focus();
        refreshed.setSelectionRange(refreshed.value.length, refreshed.value.length);
      }
    });
    container.addEventListener("change", async (event) => {
      const checkbox = event.target.closest("input[type='checkbox'][data-picker-kind]");
      if (!checkbox) return;
      await setPickerOption(kind, checkbox.value, checkbox.checked);
    });
    container.addEventListener("click", async (event) => {
      const action = event.target.closest("button[data-picker-action]");
      if (!action) return;
      await applyPickerAction(kind, action.dataset.pickerAction);
    });
  });
}

async function setPickerOption(kind, value, checked) {
  const cfg = pickerConfig(kind);
  const option = Array.from(cfg.select.options).find((item) => item.value === value);
  if (option) option.selected = checked;
  const selectedSpecific = Array.from(cfg.select.options).filter((item) => item.value !== "all" && item.selected);
  const allOption = Array.from(cfg.select.options).find((item) => item.value === "all");
  if (allOption) allOption.selected = selectedSpecific.length === 0;
  if (kind === "year") {
    await ensureSelectedYearDataLoaded();
    fillMeetOptions();
    fillEventOptions();
    updateAthleteOptions();
  }
  if (kind === "meet") {
    fillEventOptions();
    updateAthleteOptions();
  }
  if (kind === "event") updateAthleteOptions();
  renderMultiPicker(kind);
  render();
}

async function applyPickerAction(kind, action) {
  const cfg = pickerConfig(kind);
  const options = Array.from(cfg.select.options);
  const specific = options.filter((option) => option.value !== "all");
  const allOption = options.find((option) => option.value === "all");
  if (action === "selectVisible") {
    const query = lower(state[cfg.queryKey] || "");
    specific.forEach((option) => {
      if (!query || lower(option.textContent).includes(query)) option.selected = true;
    });
    if (allOption) allOption.selected = false;
  } else if (action === "recentYears") {
    const recent = defaultYearScope(specific.map((option) => option.value));
    specific.forEach((option) => { option.selected = recent.includes(String(option.value)); });
    if (allOption) allOption.selected = false;
  } else if (action === "quadYears") {
    const quad = new Set(["2024", "2025", "2026"]);
    specific.forEach((option) => { option.selected = quad.has(String(option.value)); });
    if (allOption) allOption.selected = false;
  } else {
    specific.forEach((option) => { option.selected = false; });
    if (allOption) allOption.selected = true;
  }
  if (kind === "year") {
    await ensureSelectedYearDataLoaded();
    fillMeetOptions();
    fillEventOptions();
    updateAthleteOptions();
  }
  if (kind === "meet") {
    fillEventOptions();
    updateAthleteOptions();
  }
  if (kind === "event") updateAthleteOptions();
  renderMultiPicker(kind);
  render();
}

function bindEvents() {
  bindMultiPickerEvents();
  els.yearFilter.addEventListener("change", async () => {
    await ensureSelectedYearDataLoaded();
    fillMeetOptions();
    fillEventOptions();
    updateAthleteOptions();
    renderMultiPicker("year");
    render();
  });

  els.meetFilter.addEventListener("change", () => {
    // Treat the All option as a reset. If users select specific meets, the dashboard uses only those meets.
    const selectedSpecific = selectedMeetValues();
    if (!selectedSpecific.length) {
      Array.from(els.meetFilter.options).forEach((option) => {
        option.selected = option.value === "all";
      });
    } else {
      const allOption = Array.from(els.meetFilter.options).find((option) => option.value === "all");
      if (allOption) allOption.selected = false;
    }
    fillEventOptions();
    updateAthleteOptions();
    render();
  });

  els.eventFilter.addEventListener("change", () => {
    const selectedSpecific = selectedEventValues();
    if (!selectedSpecific.length) {
      Array.from(els.eventFilter.options).forEach((option) => {
        option.selected = option.value === "all";
      });
    } else {
      const allOption = Array.from(els.eventFilter.options).find((option) => option.value === "all");
      if (allOption) allOption.selected = false;
    }
    updateAthleteOptions();
    render();
  });

  [els.scopePreset, els.eventLevelFilter, els.ageGroupFilter, els.genderFilter, els.boardFilter].forEach((element) => {
    if (!element) return;
    element.addEventListener("change", () => {
      fillMeetOptions();
      fillEventOptions();
      updateAthleteOptions();
      render();
    });
  });

  Object.values(els).forEach((element) => {
    if (!element || ["athleteOptions", "mixedLimit", "yearFilter", "meetFilter", "eventFilter", "scopePreset", "eventLevelFilter", "ageGroupFilter", "genderFilter", "boardFilter", "whatIfFemale3", "whatIfMale3", "whatIfFemale10", "whatIfMale10", "individualAthleteSearch", "individualAthleteOptions", "individualAthleteSelect", "individualBoardSelect", "individualListSize", "individualBenchmarkScope", "synchroPairGender", "synchroPairBoard", "synchroPairEventType", "synchroPairDiver1", "synchroPairDiver2", "synchroPairListSize", "synchroPairBenchmarkScope"].includes(element.id)) return;
    element.addEventListener(element.tagName === "INPUT" ? "input" : "change", render);
  });

  document.getElementById("buildMixedTeams").addEventListener("click", () => {
    state.mixedCandidates = buildMixedTeamCandidates();
    renderMixedTeamBuilder();
    populateWhatIfControls();
  });

  [els.whatIfFemale3, els.whatIfMale3, els.whatIfFemale10, els.whatIfMale10].forEach((element) => {
    if (!element) return;
    element.addEventListener("change", renderWhatIfBuilder);
  });
  const autoFillButton = document.getElementById("autoFillWhatIf");
  if (autoFillButton) autoFillButton.addEventListener("click", () => loadWhatIfCandidate(0));
  const buildIndividualButton = document.getElementById("buildIndividualList");
  if (buildIndividualButton) buildIndividualButton.addEventListener("click", renderIndividualListBuilder);
  if (els.individualAthleteSearch) {
    els.individualAthleteSearch.addEventListener("input", () => {
      filterIndividualAthleteDropdown();
    });
    els.individualAthleteSearch.addEventListener("change", () => {
      syncIndividualAthleteSelectFromSearch();
      state.individualWhatIfPicks = [];
      renderIndividualListBuilder();
    });
  }
  [els.individualAthleteSelect, els.individualBoardSelect, els.individualListSize, els.individualBenchmarkScope].forEach((element) => {
    if (!element) return;
    element.addEventListener("change", () => {
      if (element === els.individualAthleteSelect && els.individualAthleteSearch) {
        els.individualAthleteSearch.value = element.value === "all" ? "" : element.value;
      }
      state.individualWhatIfPicks = [];
      renderIndividualListBuilder();
    });
  });

  [els.synchroPairGender, els.synchroPairBoard, els.synchroPairEventType].forEach((element) => {
    if (!element) return;
    element.addEventListener("change", () => {
      state.synchroPairWhatIfPicks = [];
      populateSynchroPairControls(true);
      renderSynchroPairBuilder();
    });
  });
  [els.synchroPairDiver1, els.synchroPairDiver2, els.synchroPairListSize, els.synchroPairBenchmarkScope].forEach((element) => {
    if (!element) return;
    element.addEventListener("change", () => {
      state.synchroPairWhatIfPicks = [];
      renderSynchroPairBuilder();
    });
  });
  const buildSynchroButton = document.getElementById("buildSynchroPair");
  if (buildSynchroButton) buildSynchroButton.addEventListener("click", () => {
    state.synchroPairWhatIfPicks = [];
    renderSynchroPairBuilder();
  });

  const athleteProfile = document.getElementById("athleteProfile");
  if (athleteProfile) athleteProfile.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-profile-action]");
    if (!button) return;
    handleProfileAction(button.dataset.profileAction, button.dataset);
  });

  const runEvidenceComparison = document.getElementById("runEvidenceComparison");
  if (runEvidenceComparison) runEvidenceComparison.addEventListener("click", async () => {
    await runEvidenceComparisonWorkflow();
  });

  ["scatterChart", "bubbleChart"].forEach((id) => {
    const container = document.getElementById(id);
    if (!container) return;
    container.addEventListener("click", (event) => {
      const point = event.target.closest("[data-row-index]");
      if (!point) return;
      state.selectedPointIndex = Number(point.dataset.rowIndex);
      renderDrilldownDetail(state.selectedPointIndex);
    });
    container.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const point = event.target.closest("[data-row-index]");
      if (!point) return;
      event.preventDefault();
      state.selectedPointIndex = Number(point.dataset.rowIndex);
      renderDrilldownDetail(state.selectedPointIndex);
    });
  });

  document.getElementById("topRowsTable").addEventListener("click", (event) => {
    const th = event.target.closest("th[data-sort]");
    if (!th) return;
    const key = th.dataset.sort;
    if (state.topRowsSort.key === key) {
      state.topRowsSort.direction = state.topRowsSort.direction === "asc" ? "desc" : "asc";
    } else {
      state.topRowsSort = { key, direction: "desc" };
    }
    renderTopRowsTable();
  });

  document.getElementById("mixedTeamTable").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-candidate-index]");
    if (!button) return;
    loadWhatIfCandidate(Number(button.dataset.candidateIndex));
  });



  [els.volReportGender, els.volReportBoard, els.volReportSource].forEach((element) => {
    if (!element) return;
    element.addEventListener("change", () => {
      updateVoluntaryNameOptions();
      if (state.voluntaryReportRows.length) renderVoluntaryReport();
    });
  });
  const addVolName = document.getElementById("addVolReportName");
  if (addVolName) addVolName.addEventListener("click", addVoluntaryWatchlistName);
  const useCurrentVolName = document.getElementById("addCurrentAthleteVolReport");
  if (useCurrentVolName) useCurrentVolName.addEventListener("click", () => {
    const athlete = state.selectedAthleteName || clean(els.athleteSearch?.value);
    if (athlete) addVoluntaryNameToWatchlist(athlete);
  });
  const buildVolReport = document.getElementById("buildVolReport");
  if (buildVolReport) buildVolReport.addEventListener("click", renderVoluntaryReport);
  const exportVolReport = document.getElementById("exportVolReport");
  if (exportVolReport) exportVolReport.addEventListener("click", exportVoluntaryScoreReport);
  const volWatchlist = document.getElementById("volReportWatchlist");
  if (volWatchlist) volWatchlist.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-vol-remove]");
    if (!button) return;
    removeVoluntaryWatchlistName(button.dataset.volRemove);
  });

  const exportMap = {
    exportFiltered: exportFilteredData,
    exportAthlete: exportAthleteReport,
    exportEvent: exportEventReport,
    exportDd: exportDdComparisonReport,
    exportWeakness: exportWeaknessReport,
    exportMixed: exportMixedTeamReport,
    exportVoluntary: exportVoluntaryScoreReport,
  };
  Object.entries(exportMap).forEach(([id, fn]) => document.getElementById(id).addEventListener("click", fn));
}

function render() {
  state.filteredRows = getFilteredRows();
  state.selectedAthleteName = selectedAthleteName(state.filteredRows);
  state.benchmarkRows = getBenchmarkRows(state.filteredRows);
  state.analysis = AnalysisEngine.build(state.filteredRows, state.benchmarkRows);
  updateScopeSummary();
  updateAthleteOptions();

  renderKpis();
  renderDecisionSummary();
  renderPriorityMatrix();
  renderRadar();
  renderComparisonCards();
  renderHeatmap();
  renderScatter();
  renderBubbleChart();
  renderDrilldownDetail(state.selectedPointIndex);
  renderGroupBars();
  renderBoxPlot();
  renderProgression();
  renderEventProfiles();
  renderAthleteProfile();
  renderDiveSheet();
  renderTopRowsTable();
  renderIndividualListBuilder();
  renderMixedTeamBuilder();
  renderVoluntaryWatchlist();
}


function getFilteredRows() {
  return DATA.results.filter((row) => passesScopeFilters(row));
}

function passesScopeFilters(row, options = {}) {
  const selectedYears = selectedYearValues();
  const selectedYearSet = new Set(selectedYears);
  const selectedMeets = selectedMeetValues();
  const selectedMeetSet = new Set(selectedMeets);
  const selectedEvents = selectedEventValues();
  const selectedEventSet = new Set(selectedEvents);
  const athlete = lower(els.athleteSearch?.value || "");
  const gender = els.genderFilter?.value || "all";
  const board = els.boardFilter?.value || "all";
  const group = els.groupFilter?.value || "all";
  const level = els.eventLevelFilter?.value || "all";
  const ageGroup = els.ageGroupFilter?.value || "all";
  const preset = els.scopePreset?.value || "recent";

  if (!options.ignoreYear && selectedYears.length && !selectedYearSet.has(String(row.__year))) return false;
  if (!options.ignoreMeet && selectedMeets.length && !selectedMeetSet.has(row.__meet)) return false;
  if (!options.ignoreEvent && selectedEvents.length && !selectedEventSet.has(row.__event)) return false;
  if (!options.ignoreAthlete && athlete && !lower(row.__athlete).includes(athlete)) return false;
  if (!options.ignoreGender && gender !== "all" && row.__gender !== gender) return false;
  if (!options.ignoreBoard && board !== "all" && row.__board !== board) return false;
  if (!options.ignoreLevel && level !== "all" && row.__eventLevel !== level) return false;
  if (!options.ignoreAgeGroup && ageGroup !== "all" && row.__ageGroup !== ageGroup) return false;
  if (!options.ignorePreset && preset !== "all" && !passesPreset(row, preset)) return false;
  if (!options.ignoreGroup && group !== "all" && !row.__dives.some((dive) => dive.__group === group)) return false;
  return true;
}

function passesPreset(row, preset) {
  const level = lower(row.__eventLevel);
  const event = lower(row.__event);
  const group = lower(row.competition_group || row.competition_family || row.__meet || "");
  if (preset === "senior") return level.includes("senior") || event.includes("senior");
  if (preset === "junior") return level.includes("junior") || event.includes("junior") || /11|12|13|14|15|16|17|18|under/.test(lower(row.__ageGroup));
  if (preset === "national") return group.includes("national") || event.includes("national") || group.includes("trials") || event.includes("trials");
  if (preset === "hpd") {
    const isSenior = level.includes("senior") || event.includes("senior");
    const isInternationalStyle = event.includes("synch") || event.includes("platform") || event.includes("3m") || event.includes("1m");
    return isSenior || isInternationalStyle && !level.includes("future champions");
  }
  return true;
}

function getBenchmarkRows(filteredRows) {
  const population = els.comparisonPopulation.value;
  const cutoff = Math.max(1, Math.floor(number(els.placementCutoff.value) || 12));
  const meet = els.meetFilter.value;
  const selectedEvents = selectedEventValues();
  const selectedEventSet = new Set(selectedEvents);
  const gender = els.genderFilter.value;
  const athleteName = state.selectedAthleteName || selectedAthleteName(filteredRows);

  if (population === "finalists") return filteredRows.filter((row) => isFiniteNumber(row.__place) && row.__place <= cutoff);
  if (population === "medalists") return filteredRows.filter((row) => isFiniteNumber(row.__place) && row.__place <= 3);
  if (population === "athlete" && athleteName) return applyCurrentContext(DATA.results, { ignoreAthlete: true }).filter((row) => row.__athlete === athleteName);
  if (population === "meet") {
    const selectedMeets = selectedMeetValues();
    const selectedMeetSet = new Set(selectedMeets);
    if (selectedMeets.length) return DATA.results.filter((row) => selectedMeetSet.has(row.__meet));
  }
  if (population === "event" && selectedEvents.length) return applyCurrentContext(DATA.results).filter((row) => selectedEventSet.has(row.__event));
  if (population === "gender" && gender !== "all") return applyCurrentContext(DATA.results, { ignoreGender: true }).filter((row) => row.__gender === gender);
  return filteredRows;
}

function updateScopeSummary() {
  const el = document.getElementById("scopeSummary");
  if (!el) return;
  const years = selectedYearValues();
  const meets = selectedMeetValues();
  const events = selectedEventValues();
  const level = els.eventLevelFilter?.value || "all";
  const age = els.ageGroupFilter?.value || "all";
  const preset = els.scopePreset?.value || "all";
  const bits = [
    years.length ? `${years.length} year${years.length === 1 ? "" : "s"}` : "all years",
    meets.length ? `${meets.length} meet${meets.length === 1 ? "" : "s"}` : "all meets",
    events.length ? `${events.length} event${events.length === 1 ? "" : "s"}` : "all events",
    level !== "all" ? level : null,
    age !== "all" ? age : null,
    preset !== "all" ? `${preset.toUpperCase()} focus` : null,
  ].filter(Boolean);
  el.textContent = bits.join(" / ");
}

function renderKpis() {
  const model = state.analysis || AnalysisEngine.build(state.filteredRows, state.benchmarkRows);
  const summary = model.summary;
  const cutoff = Math.max(1, Math.floor(number(els.placementCutoff.value) || 12));
  setText("kpiResults", formatInt(summary.resultCount));
  setText("kpiResultContext", `${formatInt(summary.diveCount)} filtered dives`);
  setText("kpiScore", formatNumber(summary.avgScore, 1));
  setText("kpiDd", formatNumber(summary.avgDd, 2));
  setText("kpiGap", signed(summary.scoreGap, 1));
  setText("kpiGapLabel", `vs ${comparisonLabel()} / cutoff ${cutoff}`);
}

function renderDecisionSummary() {
  const container = document.getElementById("decisionSummary");
  if (!container) return;
  const model = state.analysis || AnalysisEngine.build(state.filteredRows, state.benchmarkRows);
  setText("decisionContext", `${formatInt(model.summary.resultCount)} results / ${formatInt(model.summary.diveCount)} dives`);
  if (!model.summary.resultCount) {
    container.innerHTML = emptyState("No data available for the selected filters.");
    return;
  }
  const weak = model.weakGroups.find((item) => item.count > 0);
  const strong = model.strongGroups.find((item) => item.count > 0);
  const ddDeficit = model.groupInsights.filter((item) => item.count > 0 && isFiniteNumber(item.ddGap)).sort((a, b) => a.ddGap - b.ddGap)[0];
  const spread = model.groupInsights.filter((item) => item.count > 0 && isFiniteNumber(item.consistency)).sort((a, b) => b.consistency - a.consistency)[0];
  const driver = model.athletes[0];
  container.innerHTML = `
    <div class="decision-card priority-red">
      <span>Primary weakness</span>
      <strong>${escapeHtml(weak?.name || "Not enough group data")}</strong>
      <em>${escapeHtml(weak?.focusReason || "Select a more specific field to identify a priority.")}</em>
    </div>
    <div class="decision-card priority-blue">
      <span>Primary strength</span>
      <strong>${escapeHtml(strong?.name || "Not enough group data")}</strong>
      <em>${strong ? `Avg score ${formatNumber(strong.avgScore, 1)}; DD ${formatNumber(strong.avgDd, 2)}` : "No strength signal yet."}</em>
    </div>
    <div class="decision-card priority-gold">
      <span>DD benchmark gap</span>
      <strong>${escapeHtml(ddDeficit?.name || "No DD gap")}</strong>
      <em>${ddDeficit ? `DD gap ${signed(ddDeficit.ddGap, 2)} vs ${comparisonLabel()}` : "No comparison DD gap available."}</em>
    </div>
    <div class="decision-card priority-gray">
      <span>Consistency watch</span>
      <strong>${escapeHtml(spread?.name || "No spread signal")}</strong>
      <em>${spread ? `Score SD ${formatNumber(spread.consistency, 1)} across ${formatInt(spread.count)} dives` : "No consistency signal yet."}</em>
    </div>
    <div class="decision-card priority-green">
      <span>Top current driver</span>
      <strong>${escapeHtml(driver?.athlete || "No athlete driver")}</strong>
      <em>${driver ? `Avg score ${formatNumber(driver.avgScore, 1)}; avg DD ${formatNumber(driver.avgDd, 2)}` : "Choose an event/gender/meet context."}</em>
    </div>`;
}

function renderPriorityMatrix() {
  const container = document.getElementById("priorityMatrix");
  if (!container) return;
  const model = state.analysis || AnalysisEngine.build(state.filteredRows, state.benchmarkRows);
  const rows = model.groupInsights.filter((item) => item.count > 0);
  if (!rows.length) {
    container.innerHTML = emptyState("No dive-group data available for the selected filters.");
    return;
  }
  const sorted = rows.slice().sort((a, b) => a.priorityScore - b.priorityScore);
  const maxRisk = Math.max(1, ...sorted.map((item) => item.riskScore || 0));
  container.innerHTML = sorted.map((item, index) => {
    const riskWidth = Math.max(3, normalize(item.riskScore || 0, 0, maxRisk) * 100);
    const badge = index === 0 ? "Highest priority" : index < 3 ? "Monitor" : "Stable";
    return `<div class="priority-row">
      <div class="priority-title"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(badge)}</span></div>
      <div class="priority-bars">
        <div><span>Score gap ${signed(item.scoreGap, 1)}</span><i style="width:${riskWidth}%"></i></div>
        <div><span>DD gap ${signed(item.ddGap, 2)}</span><i class="dd" style="width:${Math.max(3, normalize(Math.max(0, -(item.ddGap || 0)), 0, 0.75) * 100)}%"></i></div>
      </div>
      <p>${escapeHtml(item.focusReason)}</p>
    </div>`;
  }).join("");
}


function renderRadar() {
  const radarEl = document.getElementById("radarChart");
  const contextEl = document.getElementById("radarContext");
  if (!radarEl || !contextEl) return;
  const athleteName = state.selectedAthleteName;
  const athleteRows = athleteName ? DATA.results.filter((row) => row.__athlete === athleteName) : [];
  const primaryRows = athleteRows.length ? applyCurrentContext(athleteRows) : state.filteredRows;
  const primaryLabel = athleteRows.length ? athleteName : "Filtered field";
  const benchmarkLabel = comparisonLabel();
  const groups = visualGroups(primaryRows.concat(state.benchmarkRows));
  const primaryStats = groupStats(primaryRows, groups);
  const benchmarkStats = groupStats(state.benchmarkRows, groups);
  const maxValue = Math.max(1, ...primaryStats.map((stat) => stat.avgScore || 0), ...benchmarkStats.map((stat) => stat.avgScore || 0));

  const axisNote = groups.some((group) => group.code === "6") ? "platform axes include Armstand" : "1M/3M axes exclude Armstand";
  setText("radarContext", `${primaryLabel} vs ${benchmarkLabel}; ${axisNote}`);
  radarEl.innerHTML = radarSvg([
    { label: primaryLabel, color: COLORS.red, values: primaryStats.map((stat) => stat.avgScore || 0) },
    { label: benchmarkLabel, color: COLORS.cyan, values: benchmarkStats.map((stat) => stat.avgScore || 0) },
  ], maxValue, groups);
}

function radarSvg(series, maxValue, groups = GROUPS) {
  if (!series.some((item) => item.values.some(isFiniteNumber))) return emptyState("No dive group score data for the current filters.");
  const size = 390;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 138;
  const levels = [0.25, 0.5, 0.75, 1];
  const axes = groups.map((group, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / groups.length;
    return { group, angle, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
  const rings = levels
    .map((level) => {
      const points = axes.map((axis) => `${cx + Math.cos(axis.angle) * radius * level},${cy + Math.sin(axis.angle) * radius * level}`).join(" ");
      return `<polygon points="${points}" fill="none" stroke="#d9deea" stroke-width="1" />`;
    })
    .join("");
  const axisLines = axes
    .map((axis) => `<line x1="${cx}" y1="${cy}" x2="${axis.x}" y2="${axis.y}" stroke="#d9deea" stroke-width="1" />`)
    .join("");
  const labels = axes
    .map((axis) => {
      const lx = cx + Math.cos(axis.angle) * (radius + 34);
      const ly = cy + Math.sin(axis.angle) * (radius + 24);
      return `<text x="${lx}" y="${ly}" class="axis-label" text-anchor="middle">${axis.group.name}</text>`;
    })
    .join("");
  const polygons = series
    .map((item) => {
      const points = item.values
        .map((value, index) => {
          const pct = clamp((value || 0) / maxValue, 0, 1);
          const axis = axes[index];
          return `${cx + Math.cos(axis.angle) * radius * pct},${cy + Math.sin(axis.angle) * radius * pct}`;
        })
        .join(" ");
      const dots = item.values
        .map((value, index) => {
          const pct = clamp((value || 0) / maxValue, 0, 1);
          const axis = axes[index];
          const x = cx + Math.cos(axis.angle) * radius * pct;
          const y = cy + Math.sin(axis.angle) * radius * pct;
          return `<circle cx="${x}" cy="${y}" r="4" fill="${item.color}"><title>${escapeHtml(item.label)} ${groups[index].name}: ${formatNumber(value, 1)}</title></circle>`;
        })
        .join("");
      return `<polygon points="${points}" fill="${hexToRgba(item.color, 0.18)}" stroke="${item.color}" stroke-width="3" />${dots}`;
    })
    .join("");
  const legend = `<div class="legend">${series
    .map((item) => `<span><i class="legend-dot" style="background:${item.color}"></i>${escapeHtml(trim(item.label, 34))}</span>`)
    .join("")}</div>`;
  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Radar chart">${rings}${axisLines}${polygons}${labels}</svg>${legend}`;
}

function renderComparisonCards() {
  const athleteName = state.selectedAthleteName;
  const athleteRows = athleteName ? DATA.results.filter((row) => row.__athlete === athleteName) : [];
  const eventRows = currentEventRows();
  const cutoff = Math.max(1, Math.floor(number(els.placementCutoff.value) || 12));
  const finalistRows = eventRows.filter((row) => isFiniteNumber(row.__place) && row.__place <= cutoff);
  const medalRows = eventRows.filter((row) => isFiniteNumber(row.__place) && row.__place <= 3);
  const cards = [
    metricCard("Selected athlete score", mean(athleteRows.map((row) => row.__score)), "Avg result score"),
    metricCard("Event average", mean(eventRows.map((row) => row.__score)), "Avg result score"),
    metricCard("Finalist DD", mean(finalistRows.map((row) => row.__dd)), `Top ${cutoff} avg DD`),
    metricCard("Medalist DD", mean(medalRows.map((row) => row.__dd)), "Top 3 avg DD"),
    metricCard("Athlete DD gap", diffValues(mean(athleteRows.map((row) => row.__dd)), mean(finalistRows.map((row) => row.__dd))), "Vs finalist field", true),
  ];
  document.getElementById("comparisonCards").innerHTML = cards.join("");
}

function metricCard(label, value, detail, signedValue = false) {
  const display = signedValue ? signed(value, 2) : formatNumber(value, 2);
  return `<div class="comparison-card"><span>${escapeHtml(label)}</span><strong>${display}</strong><em>${escapeHtml(detail)}</em></div>`;
}

function renderHeatmap() {
  const rows = state.filteredRows;
  const groupFilter = els.groupFilter.value;
  const groups = groupFilter === "all" ? GROUPS : GROUPS.filter((group) => group.code === groupFilter);
  const dimension = els.heatmapDimension.value;
  const metric = els.heatmapMetric.value;
  const benchmarkStats = Object.fromEntries(groupStats(state.benchmarkRows).map((stat) => [stat.code, stat]));
  const map = new Map();

  rows.forEach((row) => {
    const label = heatmapRowLabel(row, dimension);
    if (!map.has(label)) map.set(label, new Map());
    const rowMap = map.get(label);
    row.__dives.forEach((dive) => {
      if (!GROUP_BY_CODE[dive.__group]) return;
      if (groupFilter !== "all" && dive.__group !== groupFilter) return;
      if (!rowMap.has(dive.__group)) rowMap.set(dive.__group, []);
      rowMap.get(dive.__group).push(dive);
    });
  });

  const rowsOut = [...map.entries()]
    .map(([label, groupMap]) => {
      const count = [...groupMap.values()].reduce((total, list) => total + list.length, 0);
      const score = mean([...groupMap.values()].flat().map((dive) => dive.__score));
      return { label, groupMap, count, score };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0) || b.count - a.count)
    .slice(0, 18);

  if (!rowsOut.length) {
    document.getElementById("heatmap").innerHTML = emptyState("No dive-level heatmap data for this filter.");
    return;
  }

  const values = [];
  const cells = rowsOut.map((row) => {
    const groupCells = groups.map((group) => {
      const dives = row.groupMap.get(group.code) || [];
      const result = heatMetric(metric, dives, benchmarkStats[group.code]);
      if (isFiniteNumber(result.intensityValue)) values.push(result.intensityValue);
      return { group, result };
    });
    return { row, groupCells };
  });
  const extent = minMax(values);
  const header = `<div class="heatmap-corner">${escapeHtml(heatmapMetricLabel(metric))}</div>${groups
    .map((group) => `<div class="heatmap-col">${escapeHtml(group.name)}</div>`)
    .join("")}`;
  const body = cells
    .map(({ row, groupCells }) => {
      const rowHeader = `<div class="heatmap-row" title="${escapeAttr(row.label)}">${escapeHtml(trim(row.label, 34))}</div>`;
      const rowCells = groupCells
        .map(({ group, result }) => {
          if (!result.hasData) return `<div class="heatmap-cell empty">-</div>`;
          const heat = normalize(result.intensityValue, extent.min, extent.max);
          const negativeClass = metric === "gap" && result.raw < 0 ? " negative" : "";
          const title = `${row.label} / ${group.name}: ${result.label}`;
          return `<div class="heatmap-cell${negativeClass}" style="--heat:${heat.toFixed(3)}" title="${escapeAttr(title)}">${escapeHtml(result.label)}</div>`;
        })
        .join("");
      return rowHeader + rowCells;
    })
    .join("");

  setText("heatmapContext", `${formatInt(rowsOut.length)} rows by ${dimension}`);
  document.getElementById("heatmap").innerHTML = `<div class="heatmap-grid" style="grid-template-columns:minmax(180px,1.2fr) repeat(${groups.length},minmax(112px,1fr));">${header}${body}</div>`;
}

function renderScatter() {
  const points = state.filteredRows
    .filter((row) => isFiniteNumber(row.__dd) && isFiniteNumber(row.__score))
    .slice(0, 900)
    .map((row) => ({ x: row.__dd, y: row.__score, row }));
  document.getElementById("scatterChart").innerHTML = scatterSvg(points, {
    xLabel: "DD total",
    yLabel: "Result score",
    trend: true,
  });
}

function renderBubbleChart() {
  const points = state.filteredRows
    .filter((row) => isFiniteNumber(row.__dd) && isFiniteNumber(row.__score))
    .slice(0, 700)
    .map((row) => {
      const consistency = isFiniteNumber(row.__consistency) ? row.__consistency : 12;
      const placement = isFiniteNumber(row.__place) ? row.__place : 24;
      return {
        x: row.__dd,
        y: row.__score,
        r: clamp(18 - placement * 0.38 + Math.max(0, 8 - consistency) * 0.35, 4, 18),
        color: placement <= 3 ? COLORS.red : placement <= 12 ? COLORS.cyan : COLORS.gray,
        row,
        consistency,
      };
    });
  document.getElementById("bubbleChart").innerHTML = bubbleSvg(points, {
    xLabel: "DD total",
    yLabel: "Result score",
  });
}

function scatterSvg(points, options) {
  if (!points.length) return emptyState("No score/DD points for this filter.");
  const box = chartBox(points);
  const line = options.trend ? regressionLine(points, box) : "";
  const pointMarkup = points
    .map((point) => {
      const x = scale(point.x, box.xMin, box.xMax, 56, box.width - 24);
      const y = scale(point.y, box.yMin, box.yMax, box.height - 42, 24);
      const color = point.row.__gender === "Female" ? COLORS.cyan : point.row.__gender === "Male" ? COLORS.blue : COLORS.red;
      return `<circle class="drill-point" tabindex="0" data-row-index="${point.row.__index}" cx="${x}" cy="${y}" r="5" fill="${color}" opacity="0.74"><title>${escapeHtml(pointTitle(point.row))}</title></circle>`;
    })
    .join("");
  return chartSvgFrame(box, pointMarkup + line, options);
}

function bubbleSvg(points, options) {
  if (!points.length) return emptyState("No bubble data for this filter.");
  const box = chartBox(points);
  const pointMarkup = points
    .map((point) => {
      const x = scale(point.x, box.xMin, box.xMax, 56, box.width - 24);
      const y = scale(point.y, box.yMin, box.yMax, box.height - 42, 24);
      return `<circle class="drill-point" tabindex="0" data-row-index="${point.row.__index}" cx="${x}" cy="${y}" r="${point.r}" fill="${point.color}" opacity="0.60" stroke="#fff" stroke-width="1.3"><title>${escapeHtml(pointTitle(point.row))}; consistency SD ${formatNumber(point.consistency, 1)}</title></circle>`;
    })
    .join("");
  const legend = `<div class="legend"><span><i class="legend-dot" style="background:${COLORS.red}"></i>Medalist</span><span><i class="legend-dot" style="background:${COLORS.cyan}"></i>Cutoff field</span><span><i class="legend-dot" style="background:${COLORS.gray}"></i>Full field</span></div>`;
  return chartSvgFrame(box, pointMarkup, options) + legend;
}

function chartSvgFrame(box, content, options) {
  const xTicks = ticks(box.xMin, box.xMax, 5);
  const yTicks = ticks(box.yMin, box.yMax, 5);
  const grid = [
    ...xTicks.map((tick) => {
      const x = scale(tick, box.xMin, box.xMax, 56, box.width - 24);
      return `<line x1="${x}" y1="24" x2="${x}" y2="${box.height - 42}" stroke="#e6ebf3" /><text x="${x}" y="${box.height - 18}" class="axis-label" text-anchor="middle">${formatNumber(tick, 1)}</text>`;
    }),
    ...yTicks.map((tick) => {
      const y = scale(tick, box.yMin, box.yMax, box.height - 42, 24);
      return `<line x1="56" y1="${y}" x2="${box.width - 24}" y2="${y}" stroke="#e6ebf3" /><text x="48" y="${y + 4}" class="axis-label" text-anchor="end">${formatNumber(tick, 0)}</text>`;
    }),
  ].join("");
  return `<svg viewBox="0 0 ${box.width} ${box.height}" role="img" aria-label="${escapeAttr(options.yLabel)} by ${escapeAttr(options.xLabel)}">
    ${grid}
    <line x1="56" y1="${box.height - 42}" x2="${box.width - 24}" y2="${box.height - 42}" stroke="#9aa5b8" />
    <line x1="56" y1="24" x2="56" y2="${box.height - 42}" stroke="#9aa5b8" />
    ${content}
    <text x="${box.width / 2}" y="${box.height - 2}" class="axis-label" text-anchor="middle">${escapeHtml(options.xLabel)}</text>
    <text x="13" y="${box.height / 2}" class="axis-label" text-anchor="middle" transform="rotate(-90 13 ${box.height / 2})">${escapeHtml(options.yLabel)}</text>
  </svg>`;
}

function renderGroupBars() {
  const groups = visualGroups(state.filteredRows);
  const stats = groupStats(state.filteredRows, groups);
  const maxScore = Math.max(1, ...stats.map((stat) => stat.avgScore || 0));
  const maxDd = Math.max(1, ...stats.map((stat) => stat.avgDd || 0));
  const width = 620;
  const height = 300;
  const left = 96;
  const rowH = 36;
  const rows = stats
    .map((stat, index) => {
      const y = 28 + index * rowH;
      const scoreW = scale(stat.avgScore || 0, 0, maxScore, 0, 330);
      const ddW = scale(stat.avgDd || 0, 0, maxDd, 0, 180);
      return `<text x="12" y="${y + 16}" class="axis-label">${stat.name}</text>
        <rect x="${left}" y="${y}" width="${scoreW}" height="12" rx="3" fill="${COLORS.blue}" />
        <rect x="${left}" y="${y + 16}" width="${ddW}" height="10" rx="3" fill="${COLORS.cyan}" />
        <text x="${left + scoreW + 8}" y="${y + 10}" class="axis-label">${formatNumber(stat.avgScore, 1)}</text>
        <text x="${left + ddW + 8}" y="${y + 25}" class="axis-label">DD ${formatNumber(stat.avgDd, 2)}</text>`;
    })
    .join("");
  const legend = `<div class="legend"><span><i class="legend-dot" style="background:${COLORS.blue}"></i>Avg score</span><span><i class="legend-dot" style="background:${COLORS.cyan}"></i>Avg DD</span></div>`;
  document.getElementById("groupBars").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Average score and DD by dive group">${rows}</svg>${legend}`;
}

function renderBoxPlot() {
  const dives = collectDives(state.filteredRows);
  const groups = visualGroups(state.filteredRows);
  const width = 660;
  const rowH = 46;
  const height = 48 + groups.length * rowH;
  const scores = dives.map((dive) => dive.__score).filter(isFiniteNumber);
  if (!scores.length) {
    document.getElementById("boxPlot").innerHTML = emptyState("No dive scores for distribution plot.");
    return;
  }
  const extent = minMax(scores);
  const plot = groups.map((group, index) => {
    const values = dives.filter((dive) => dive.__group === group.code).map((dive) => dive.__score).filter(isFiniteNumber);
    const y = 28 + index * rowH;
    if (values.length < 2) {
      return `<text x="12" y="${y + 16}" class="axis-label">${group.name}</text><text x="150" y="${y + 16}" class="axis-label">insufficient data</text>`;
    }
    const q = quartiles(values);
    const xMin = scale(q.min, extent.min, extent.max, 150, width - 44);
    const xQ1 = scale(q.q1, extent.min, extent.max, 150, width - 44);
    const xMed = scale(q.median, extent.min, extent.max, 150, width - 44);
    const xQ3 = scale(q.q3, extent.min, extent.max, 150, width - 44);
    const xMax = scale(q.max, extent.min, extent.max, 150, width - 44);
    const pointDots = values.slice(0, 180).map((value, pointIndex) => {
      const x = scale(value, extent.min, extent.max, 150, width - 44);
      const jitter = ((pointIndex * 17) % 19) - 9;
      const py = y + 11 + jitter * 0.72;
      return `<circle cx="${x}" cy="${py}" r="2.4" fill="${COLORS.blue}" opacity="0.25"><title>${group.name}: score ${formatNumber(value, 1)}</title></circle>`;
    }).join("");
    return `<text x="12" y="${y + 16}" class="axis-label">${group.name}</text>
      <line x1="${xMin}" y1="${y + 10}" x2="${xMax}" y2="${y + 10}" stroke="${COLORS.gray}" stroke-width="2" />
      <rect x="${xQ1}" y="${y}" width="${Math.max(2, xQ3 - xQ1)}" height="22" rx="4" fill="${hexToRgba(COLORS.sky, 0.76)}" stroke="${COLORS.blue}" />
      <line x1="${xMed}" y1="${y - 3}" x2="${xMed}" y2="${y + 25}" stroke="${COLORS.red}" stroke-width="3" />
      ${pointDots}
      <text x="${width - 36}" y="${y + 15}" class="axis-label" text-anchor="end">n=${values.length} med ${formatNumber(q.median, 1)}</text>`;
  }).join("");
  const axis = ticks(extent.min, extent.max, 5).map((tick) => {
    const x = scale(tick, extent.min, extent.max, 150, width - 44);
    return `<line x1="${x}" y1="12" x2="${x}" y2="${height - 18}" stroke="#edf1f7" /><text x="${x}" y="${height - 2}" class="axis-label" text-anchor="middle">${formatNumber(tick, 0)}</text>`;
  }).join("");
  const legend = `<div class="legend"><span><i class="legend-dot" style="background:${COLORS.red}"></i>Median</span><span><i class="legend-dot" style="background:${COLORS.sky}"></i>IQR</span><span><i class="legend-dot" style="background:${COLORS.blue}"></i>Individual dives</span></div>`;
  document.getElementById("boxPlot").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Score distribution by dive group with box plot and individual points">${axis}${plot}</svg>${legend}`;
}

function renderProgression() {
  const athleteName = state.selectedAthleteName;
  const baseRows = athleteName ? DATA.results.filter((row) => row.__athlete === athleteName) : state.filteredRows;
  const grouped = groupBy(baseRows.filter((row) => isFiniteNumber(row.__score)), (row) => row.__meet);
  const points = [...grouped.entries()]
    .map(([meet, rows]) => ({
      label: meet,
      date: rows.map((row) => row.__date).filter(Boolean).sort()[0] || meet,
      score: mean(rows.map((row) => row.__score)),
      dd: mean(rows.map((row) => row.__dd)),
      count: rows.length,
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-18);

  if (points.length < 2) {
    document.getElementById("progressionChart").innerHTML = emptyState("Select an athlete or broader event field with at least two meets.");
    return;
  }
  const width = 620;
  const height = 300;
  const yExtent = minMax(points.map((point) => point.score));
  const path = points
    .map((point, index) => {
      const x = scale(index, 0, points.length - 1, 46, width - 24);
      const y = scale(point.score, yExtent.min, yExtent.max, height - 52, 24);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const dots = points
    .map((point, index) => {
      const x = scale(index, 0, points.length - 1, 46, width - 24);
      const y = scale(point.score, yExtent.min, yExtent.max, height - 52, 24);
      return `<circle cx="${x}" cy="${y}" r="5" fill="${COLORS.red}"><title>${escapeHtml(point.label)}: score ${formatNumber(point.score, 1)}, DD ${formatNumber(point.dd, 2)}, rows ${point.count}</title></circle>`;
    })
    .join("");
  const labels = points
    .filter((_, index) => index === 0 || index === points.length - 1 || index % 4 === 0)
    .map((point, index, list) => {
      const realIndex = points.indexOf(point);
      const x = scale(realIndex, 0, points.length - 1, 46, width - 24);
      return `<text x="${x}" y="${height - 20}" class="axis-label" text-anchor="${index === 0 ? "start" : index === list.length - 1 ? "end" : "middle"}">${escapeHtml(trim(point.label.replace(/^20\d\d\s*/, ""), 18))}</text>`;
    })
    .join("");
  document.getElementById("progressionChart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Meet progression">
    <line x1="46" y1="${height - 52}" x2="${width - 24}" y2="${height - 52}" stroke="#d9deea" />
    <path d="${path}" fill="none" stroke="${COLORS.blue}" stroke-width="4" />
    ${dots}${labels}
  </svg>`;
}

function renderEventProfiles() {
  const stats = groupStats(state.filteredRows).filter((stat) => stat.count > 0);
  if (!stats.length) {
    document.getElementById("eventProfileCards").innerHTML = emptyState("No event profile data.");
    return;
  }
  const strongest = stats.slice().sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))[0];
  const weakest = stats.slice().sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0))[0];
  const ddLeader = stats.slice().sort((a, b) => (b.avgDd || 0) - (a.avgDd || 0))[0];
  const consistent = stats.slice().filter((stat) => isFiniteNumber(stat.sdScore)).sort((a, b) => a.sdScore - b.sdScore)[0];
  const cards = [
    profileCard("Strongest group", strongest.name, `Avg score ${formatNumber(strongest.avgScore, 1)} from ${formatInt(strongest.count)} dives`),
    profileCard("Weakest group", weakest.name, `Avg score ${formatNumber(weakest.avgScore, 1)} from ${formatInt(weakest.count)} dives`),
    profileCard("Highest DD group", ddLeader.name, `Avg DD ${formatNumber(ddLeader.avgDd, 2)}`),
    profileCard("Most consistent", consistent?.name || "Not available", consistent ? `Score SD ${formatNumber(consistent.sdScore, 1)}` : "Insufficient dive scores"),
  ];
  document.getElementById("eventProfileCards").innerHTML = cards.join("");
}

function renderAthleteProfile() {
  const athleteName = state.selectedAthleteName;
  const rows = athleteName ? DATA.results.filter((row) => row.__athlete === athleteName) : [];
  const container = document.getElementById("athleteProfile");
  if (!container) return;
  if (!athleteName || !rows.length) {
    container.innerHTML = emptyState("Search an athlete to open the diver profile dashboard.");
    return;
  }

  const dives = collectDivesForRows(rows);
  const stats = groupStatsForRows(rows).filter((stat) => stat.count > 0);
  const strongest = stats.slice().sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))[0];
  const weakest = stats.slice().sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0))[0];
  const bestEvent = bestAthleteEvent(rows);
  const primaryEvents = athletePrimaryEvents(rows).slice(0, 4);
  const bestDive = dives.filter((dive) => isFiniteNumber(dive.__score)).sort((a, b) => b.__score - a.__score)[0];
  const bestTotal = rows.filter((row) => isFiniteNumber(row.__score)).sort((a, b) => b.__score - a.__score)[0];
  const recent = athleteRecentSignal(rows);
  const avgScore = mean(rows.map((row) => row.__score));
  const avgDd = mean(rows.map((row) => row.__dd));
  const consistency = stdev(dives.map((dive) => dive.__score).filter(isFiniteNumber));
  const gender = mode(rows.map((row) => row.__gender)) || "Unknown";

  const performanceCards = [
    athleteCard("Athlete", athleteName, `${gender}; ${formatInt(rows.length)} result rows / ${formatInt(dives.length)} dives`),
    athleteCard("Primary events", primaryEvents.map((item) => `${boardLabel(item.board)} ${item.gender || ''}`.trim()).join(" / ") || "Unknown", primaryEvents.map((item) => `${item.count} rows`).join("; ")),
    athleteCard("Best event", bestEvent?.label || "Unknown", bestEvent ? `Avg score ${formatNumber(bestEvent.avgScore, 1)}; avg DD ${formatNumber(bestEvent.avgDd, 2)}` : "No result score data"),
    athleteCard("Average score", formatNumber(avgScore, 1), "Average result score in loaded data"),
    athleteCard("Average DD", formatNumber(avgDd, 2), "Average DD total in loaded data"),
    athleteCard("Consistency", isFiniteNumber(consistency) ? `SD ${formatNumber(consistency, 1)}` : "No signal", "Dive-score spread; lower is steadier"),
    athleteCard("Strongest group", strongest?.name || "Unknown", strongest ? `Avg dive score ${formatNumber(strongest.avgScore, 1)} from ${formatInt(strongest.count)} dives` : "No group data"),
    athleteCard("Weakest group", weakest?.name || "Unknown", weakest ? `Avg dive score ${formatNumber(weakest.avgScore, 1)} from ${formatInt(weakest.count)} dives` : "No group data"),
    athleteCard("Best single dive", bestDive ? `${bestDive.__diveCode || canonicalDiveCode(bestDive.dive_number)} (${bestDive.__groupName})` : "Unknown", bestDive ? `${formatNumber(bestDive.__score, 1)} pts; ${trim(bestDive.__meet, 28)} / ${trim(bestDive.__event, 34)}` : "No dive scores"),
    athleteCard("Best total score", bestTotal ? formatNumber(bestTotal.__score, 1) : "Unknown", bestTotal ? `${trim(bestTotal.__meet, 34)} / ${trim(bestTotal.__event, 42)}` : "No result scores"),
    athleteCard("Recent signal", recent.label, recent.detail),
  ];

  container.innerHTML = `
    <section class="athlete-profile-section athlete-performance-card">
      <div class="athlete-section-heading">
        <h4>Performance snapshot</h4>
        <p class="help-text">Fast read on event identity, strengths, weaknesses, DD profile, and recent trend from the currently loaded year scope.</p>
      </div>
      <div class="athlete-card-grid">${performanceCards.join("")}</div>
    </section>
    <section class="athlete-profile-section">
      <div class="athlete-section-heading">
        <h4>Best dive inventory</h4>
        <p class="help-text">Best competed dives by category. These rows should feed the individual strongest-list builder, same-gender synchro builder, and Mixed Team what-if workspace.</p>
      </div>
      <div class="table-wrap compact-table">${athleteBestDiveInventoryHtml(rows)}</div>
    </section>
    <section class="athlete-profile-section">
      <div class="athlete-section-heading">
        <h4>Benchmark gap by event</h4>
        <p class="help-text">Shows what the athlete is missing relative to the top 3 or closest available field benchmark in the same gender/board/event context.</p>
      </div>
      <div class="table-wrap compact-table">${athleteBenchmarkGapHtml(rows)}</div>
    </section>
    <section class="athlete-profile-section profile-actions-panel">
      <div class="athlete-section-heading">
        <h4>What-if launch panel</h4>
        <p class="help-text">Jump from the profile directly into the builders without retyping the athlete name.</p>
      </div>
      <div class="profile-action-row">
        <button type="button" data-profile-action="build5" data-athlete="${escapeAttr(athleteName)}">Build 5-dive list</button>
        <button type="button" data-profile-action="build6" data-athlete="${escapeAttr(athleteName)}">Build 6-dive list</button>
        <button type="button" data-profile-action="buildAuto" data-athlete="${escapeAttr(athleteName)}">Build auto list</button>
        <button type="button" data-profile-action="loadSynchro" data-athlete="${escapeAttr(athleteName)}">Load optional synchro compatibility</button>
      </div>
      <div id="athleteCompatibilitySnapshot" class="compatibility-snapshot"></div>
    </section>`;
}

function renderDiveSheet() {
  const athleteName = state.selectedAthleteName;
  const rows = athleteName ? applyCurrentContext(DATA.results.filter((row) => row.__athlete === athleteName)) : [];
  const dives = collectDives(rows).slice().sort((a, b) => String(a.__meet).localeCompare(String(b.__meet)) || String(a.__event).localeCompare(String(b.__event)) || (a.__order || 0) - (b.__order || 0));
  if (!athleteName || !dives.length) {
    document.getElementById("diveSheetTable").innerHTML = emptyState("No selected athlete dive sheet rows in the current context.");
    return;
  }
  const headers = ["Meet", "Event", "Board", "Group", "Dive", "DD", "Score", "Optional/voluntary"];
  const body = dives.slice(0, 220).map((dive) => `<tr>
    <td>${escapeHtml(trim(dive.__meet, 34))}</td>
    <td>${escapeHtml(trim(dive.__event, 34))}</td>
    <td>${boardLabel(dive.__board)}</td>
    <td>${escapeHtml(dive.__groupName)}</td>
    <td>${escapeHtml(dive.__diveCode || canonicalDiveCode(dive.dive_number))}</td>
    <td>${formatNumber(dive.__dd, 2)}</td>
    <td>${formatNumber(dive.__score, 1)}</td>
    <td>${escapeHtml(dive.__optional)}</td>
  </tr>`).join("");
  document.getElementById("diveSheetTable").innerHTML = tableHtml(headers, body);
}

function renderTopRowsTable() {
  const rows = state.filteredRows.slice();
  const sort = state.topRowsSort;
  rows.sort((a, b) => compareForSort(a, b, sort.key) * (sort.direction === "asc" ? 1 : -1));
  const body = rows.slice(0, 160).map((row) => `<tr>
    <td>${escapeHtml(row.__athlete)}</td>
    <td>${escapeHtml(trim(row.__meet, 32))}</td>
    <td>${escapeHtml(trim(row.__event, 36))}</td>
    <td>${escapeHtml(row.__gender)}</td>
    <td>${boardLabel(row.__board)}</td>
    <td>${formatPlace(row.__place)}</td>
    <td>${formatNumber(row.__score, 1)}</td>
    <td>${formatNumber(row.__dd, 2)}</td>
    <td>${formatNumber(row.__consistency, 1)}</td>
  </tr>`).join("");
  const headers = [
    ["Athlete", "athlete"],
    ["Meet", "meet"],
    ["Event", "event"],
    ["Gender", "gender"],
    ["Board", "board"],
    ["Place", "place"],
    ["Score", "score"],
    ["DD", "dd"],
    ["Consistency", "consistency"],
  ];
  const thead = `<thead><tr>${headers.map(([label, key]) => `<th class="sortable" data-sort="${key}">${label}${sort.key === key ? (sort.direction === "asc" ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead>`;
  document.getElementById("topRowsTable").innerHTML = `<table>${thead}<tbody>${body || `<tr><td colspan="9">No rows.</td></tr>`}</tbody></table>`;
}

function renderMixedTeamBuilder() {
  const candidates = state.mixedCandidates;
  if (!candidates.length) {
    document.getElementById("mixedTeamSummary").innerHTML = `<div class="mixed-card"><span>Status</span><strong>Ready</strong><em>Click Build candidates to generate USA-only mixed team projections. Non-USA federation indicators are excluded; unclear federation data is flagged.</em></div>`;
    document.getElementById("mixedTeamTable").innerHTML = "";
    return;
  }
  const fullCoverage = candidates.filter((candidate) => candidate.groupCoverage === 6).length;
  const avgProjected = mean(candidates.map((candidate) => candidate.averageScore));
  const avgDd = mean(candidates.map((candidate) => candidate.averageDd));
  document.getElementById("mixedTeamSummary").innerHTML = [
    profileCard("Candidates", formatInt(candidates.length), "Ranked projections"),
    profileCard("Full group coverage", formatInt(fullCoverage), "Six different groups"),
    profileCard("Projected score", formatNumber(avgProjected, 1), "Average of candidate averages"),
    profileCard("Projected DD", formatNumber(avgDd, 2), "Average of candidate averages"),
    profileCard("Evidence confidence", formatNumber(mean(candidates.map((candidate) => candidate.evidenceConfidence)), 1), "100 = strongest evidence"),
  ].join("");
  const body = candidates.map((candidate, index) => `<tr>
    <td><strong>${index + 1}</strong><br><button class="small-button load-candidate" type="button" data-candidate-index="${index}">Load</button></td>
    <td>${escapeHtml(candidate.teamLabel)}</td>
    <td>${candidate.groupCoverage}/6</td>
    <td>${formatNumber(candidate.averageScore, 1)}</td>
    <td>${formatNumber(candidate.averageDd, 2)}</td>
    <td>${signed(candidate.ddGap, 2)}</td>
    <td>${formatNumber(candidate.strength3m, 1)}</td>
    <td>${formatNumber(candidate.strength10m, 1)}</td>
    <td>${formatNumber(candidate.balance, 1)}</td>
    <td>${formatNumber(candidate.evidenceConfidence, 1)}</td>
    <td>${escapeHtml(candidate.evidenceSummary)}</td>
    <td>${escapeHtml(candidate.riskFlags.join("; ") || "No major data flags")}</td>
    <td>${escapeHtml(candidate.planSummary)}</td>
  </tr>`).join("");
  const headers = ["Rank / load", "Team", "Groups", "Avg score", "Avg DD", "DD gap", "3m strength", "10m strength", "Balance", "Evidence", "Evidence summary", "Risk flags", "Round plan"];
  document.getElementById("mixedTeamTable").innerHTML = tableHtml(headers, body);
}


function ensureWhatIfProfiles() {
  if (!state.whatIfProfiles.length) state.whatIfProfiles = buildMixedProfiles();
  return state.whatIfProfiles;
}

function populateWhatIfControls(preserve = true) {
  if (!els.whatIfFemale3 || !els.whatIfMale3 || !els.whatIfFemale10 || !els.whatIfMale10) return;
  const profiles = ensureWhatIfProfiles();
  fillProfileSelect(els.whatIfFemale3, topProfiles(profiles, "Female", "3m", 80), "Select female 3M", preserve);
  fillProfileSelect(els.whatIfMale3, topProfiles(profiles, "Male", "3m", 80), "Select male 3M", preserve);
  fillProfileSelect(els.whatIfFemale10, topProfiles(profiles, "Female", "platform", 80), "Select female platform", preserve);
  fillProfileSelect(els.whatIfMale10, topProfiles(profiles, "Male", "platform", 80), "Select male platform", preserve);
  renderWhatIfBuilder();
}

function fillProfileSelect(select, profiles, label, preserve) {
  const current = preserve ? select.value : "";
  select.innerHTML = `<option value="all">${escapeHtml(label)}</option>${profiles.map((profile) => `<option value="${escapeAttr(profile.key)}">${escapeHtml(profile.name)} (${profile.gender})</option>`).join("")}`;
  if (current && profiles.some((profile) => profile.key === current)) select.value = current;
  else if (profiles[0]) select.value = profiles[0].key;
}

function profileByKey(key) {
  return ensureWhatIfProfiles().find((profile) => profile.key === key) || null;
}

function renderWhatIfBuilder() {
  const grid = document.getElementById("whatIfDiveGrid");
  const summary = document.getElementById("whatIfSummary");
  if (!grid || !summary || !els.whatIfFemale3) return;
  const f3 = profileByKey(els.whatIfFemale3.value);
  const m3 = profileByKey(els.whatIfMale3.value);
  const f10 = profileByKey(els.whatIfFemale10.value);
  const m10 = profileByKey(els.whatIfMale10.value);
  if (!f3 || !m3 || !f10 || !m10) {
    grid.innerHTML = emptyState("Select the four Mixed Team roles to start a what-if lineup.");
    summary.innerHTML = "";
    return;
  }
  const syncEvidenceMap = buildSyncEvidenceMap();
  const slots = [
    { round: "R1", role: "Female individual", participant: f3.name, board: "3m", candidates: individualCandidates(f3, "3m") },
    { round: "R2", role: "Male individual", participant: m3.name, board: "3m", candidates: individualCandidates(m3, "3m") },
    { round: "R3", role: "Mixed synchronized", participant: `${f3.name} / ${m3.name}`, board: "3m", candidates: syncCandidates(f3, m3, "3m", syncEvidenceMap) },
    { round: "R4", role: "Female individual", participant: f10.name, board: "platform", candidates: individualCandidates(f10, "platform") },
    { round: "R5", role: "Male individual", participant: m10.name, board: "platform", candidates: individualCandidates(m10, "platform") },
    { round: "R6", role: "Mixed synchronized", participant: `${f10.name} / ${m10.name}`, board: "platform", candidates: syncCandidates(f10, m10, "platform", syncEvidenceMap) },
  ];
  const pending = state.pendingWhatIfPicks;
  const picks = [];
  const rows = slots.map((slot, index) => {
    const prior = document.getElementById(`whatIfDive${index}`)?.value;
    let selectedKey = prior || "";
    if (pending?.[index]) {
      const pendingPick = pending[index];
      const match = slot.candidates.find((candidate) => candidate.dive === pendingPick.dive && candidate.group === pendingPick.group && candidate.evidenceCategory === pendingPick.evidenceCategory);
      if (match) selectedKey = match.key || `candidate_${slot.candidates.indexOf(match)}`;
    }
    const normalizedCandidates = slot.candidates.map((candidate, candidateIndex) => ({ ...candidate, key: candidate.key || `candidate_${candidateIndex}` }));
    const pick = normalizedCandidates.find((candidate) => candidate.key === selectedKey) || normalizedCandidates[0] || { role: slot.role, athlete: slot.participant, board: slot.board, dive: "", group: null, groupName: "", dd: null, score: null, evidenceCategory: "Missing", evidenceScore: 0, missing: true, key: "missing" };
    picks.push({ ...pick, round: slot.round, role: slot.role, participant: slot.participant, board: slot.board });
    const options = normalizedCandidates.length
      ? optionGroupsByCategory(normalizedCandidates, pick.key, (candidate) => `${candidate.dive || "unknown"} | Score ${formatNumber(candidate.score, 1)} | DD ${formatNumber(candidate.dd, 2)} | ${candidate.evidenceCategory || "Evidence"}`)
      : `<option value="missing">No historical option found</option>`;
    return `<tr>
      <td>${escapeHtml(slot.round)}</td>
      <td>${escapeHtml(slot.role)}</td>
      <td>${escapeHtml(slot.participant)}</td>
      <td>${escapeHtml(boardLabel(slot.board))}</td>
      <td><select id="whatIfDive${index}" data-whatif-dive="${index}">${options}</select></td>
      <td>${escapeHtml(pick.groupName || "-")}</td>
      <td>${formatNumber(pick.score, 1)}</td>
      <td>${formatNumber(pick.dd, 2)}</td>
      <td>${escapeHtml(pick.evidenceCategory || "-")}</td>
    </tr>`;
  }).join("");
  state.pendingWhatIfPicks = null;
  const score = scoreManualPlan(picks);
  grid.innerHTML = mixedWorkspaceGuideHtml(picks, score) + tableHtml(["Round", "Role", "Athlete(s)", "Board", "Dive what-if", "Group", "Score", "DD", "Evidence"], rows);
  grid.querySelectorAll("select[data-whatif-dive]").forEach((select) => select.addEventListener("change", renderWhatIfBuilder));
  summary.innerHTML = [
    profileCard("Projected score", formatNumber(score.totalScore, 1), `Avg ${formatNumber(score.averageScore, 1)} per dive`),
    profileCard("Projected DD", formatNumber(score.totalDd, 2), `Avg ${formatNumber(score.averageDd, 2)} per dive`),
    profileCard("Group coverage", `${score.groupCoverage}/6`, score.groupCoverage === 6 ? "Six different groups covered" : "Duplicate/missing group risk"),
    profileCard("Evidence confidence", formatNumber(score.evidenceConfidence, 1), score.evidenceSummary || "No evidence summary"),
    profileCard("Risk flags", formatInt(score.riskFlags.length), score.riskFlags.join("; ") || "No major data flags"),
  ].join("");
}

function scoreManualPlan(picks) {
  const scores = picks.map((pick) => pick.score).filter(isFiniteNumber);
  const dds = picks.map((pick) => pick.dd).filter(isFiniteNumber);
  const groups = picks.map((pick) => pick.group).filter(Boolean);
  const groupCoverage = new Set(groups).size;
  const riskFlags = [];
  if (groupCoverage < 6) riskFlags.push(`Only ${groupCoverage} unique groups covered`);
  if (picks.some((pick) => pick.missing || !pick.dive)) riskFlags.push("One or more lineup slots lacks a data-backed dive");
  if (picks.some((pick) => pick.role === "Mixed synchronized" && pick.evidenceCategory === "Voluntary assumption")) riskFlags.push("Synchro slot includes voluntary assumption");
  if (picks.some((pick) => pick.role === "Mixed synchronized" && pick.evidenceCategory === "Individual evidence only")) riskFlags.push("Synchro slot uses individual evidence only");
  return {
    totalScore: sum(scores),
    averageScore: mean(scores),
    totalDd: sum(dds),
    averageDd: mean(dds),
    groupCoverage,
    evidenceConfidence: mean(picks.map((pick) => pick.evidenceScore).filter(isFiniteNumber)) || 0,
    evidenceSummary: evidenceCategorySummary(picks),
    riskFlags,
  };
}



function mixedWorkspaceGuideHtml(picks, score) {
  const individualCount = picks.filter((pick) => lower(pick.role).includes("individual") && pick.dive).length;
  const syncCount = picks.filter((pick) => lower(pick.role).includes("synchronized") && pick.dive).length;
  const evidence = evidenceCategorySummary(picks) || "No evidence selected yet";
  return `<div class="workspace-guide">
    <div><span>1. Roles</span><strong>${formatInt(individualCount)} individual / ${formatInt(syncCount)} synchro slots</strong><em>Round assignments show exactly who is diving or pairing.</em></div>
    <div><span>2. Rules</span><strong>${score.groupCoverage}/6 groups</strong><em>${score.groupCoverage === 6 ? "Six-group coverage satisfied." : "Adjust dives to reach six unique groups."}</em></div>
    <div><span>3. Evidence</span><strong>${formatNumber(score.evidenceConfidence, 1)}</strong><em>${escapeHtml(evidence)}</em></div>
    <div><span>4. What-if impact</span><strong>${formatNumber(score.totalScore, 1)}</strong><em>Projected score updates as dives change.</em></div>
  </div>`;
}

function loadWhatIfCandidate(index) {
  if (!state.mixedCandidates.length) state.mixedCandidates = buildMixedTeamCandidates();
  const candidate = state.mixedCandidates[index];
  if (!candidate) return;
  populateWhatIfControls(true);
  if (candidate.slotProfileKeys) {
    els.whatIfFemale3.value = candidate.slotProfileKeys.f3;
    els.whatIfMale3.value = candidate.slotProfileKeys.m3;
    els.whatIfFemale10.value = candidate.slotProfileKeys.f10;
    els.whatIfMale10.value = candidate.slotProfileKeys.m10;
  }
  state.pendingWhatIfPicks = candidate.picks;
  renderWhatIfBuilder();
}



function allAthleteNames() {
  return unique(DATA.results.map((row) => row.__athlete)).sort((a, b) => a.localeCompare(b));
}

function resolveIndividualAthleteName() {
  const typed = clean(els.individualAthleteSearch?.value);
  const selected = clean(els.individualAthleteSelect?.value);
  const names = allAthleteNames();
  if (typed) {
    const exact = names.find((name) => lower(name) === lower(typed));
    if (exact) {
      if (els.individualAthleteSelect) els.individualAthleteSelect.value = exact;
      return exact;
    }
    const contains = names.find((name) => lower(name).includes(lower(typed)));
    if (contains) return contains;
  }
  return selected && selected !== "all" ? selected : "";
}

function filterIndividualAthleteDropdown() {
  if (!els.individualAthleteSelect) return;
  const query = lower(els.individualAthleteSearch?.value);
  const current = els.individualAthleteSelect.value;
  let names = allAthleteNames();
  if (query) names = names.filter((name) => lower(name).includes(query));
  fillSelect(els.individualAthleteSelect, names, query ? "Matching athletes" : "Select athlete");
  if (names.includes(current)) els.individualAthleteSelect.value = current;
}

function syncIndividualAthleteSelectFromSearch() {
  if (!els.individualAthleteSelect || !els.individualAthleteSearch) return;
  const typed = clean(els.individualAthleteSearch.value);
  const names = allAthleteNames();
  const exact = names.find((name) => lower(name) === lower(typed));
  if (exact) {
    filterIndividualAthleteDropdown();
    els.individualAthleteSelect.value = exact;
  }
}

function renderIndividualListBuilder() {
  const summary = document.getElementById("individualListSummary");
  const table = document.getElementById("individualListTable");
  const whatIf = document.getElementById("individualWhatIfArea");
  if (!summary || !table || !els.individualAthleteSelect) return;
  let athleteName = resolveIndividualAthleteName();
  if ((!athleteName || athleteName === "all") && state.selectedAthleteName) {
    athleteName = state.selectedAthleteName;
    if (Array.from(els.individualAthleteSelect.options).some((option) => option.value === athleteName)) els.individualAthleteSelect.value = athleteName;
    if (els.individualAthleteSearch) els.individualAthleteSearch.value = athleteName;
  }
  if (!athleteName || athleteName === "all") {
    summary.innerHTML = "";
    const radarPanel = document.getElementById("individualStrengthRadar");
    if (radarPanel) radarPanel.innerHTML = "";
    table.innerHTML = emptyState("Select an athlete to build a strongest-dive list from all available results.");
    if (whatIf) whatIf.innerHTML = "";
    return;
  }
  const board = els.individualBoardSelect.value;
  refreshIndividualListSizeOptions(athleteName, board, true);
  const output = buildIndividualDiveList(athleteName, board, els.individualListSize.value, els.individualBenchmarkScope.value);
  if (!output.picks.length) {
    summary.innerHTML = profileCard("Athlete", athleteName, `No ${boardLabel(board)} dive-level data found.`);
    const radarPanel = document.getElementById("individualStrengthRadar");
    if (radarPanel) radarPanel.innerHTML = "";
    table.innerHTML = emptyState("No usable dive sheet rows for this athlete and board/platform.");
    if (whatIf) whatIf.innerHTML = "";
    return;
  }
  summary.innerHTML = [
    profileCard("Projected list score", formatNumber(output.projectedScore, 1), `From ${formatInt(output.picks.length)} selected dives`),
    profileCard("Projected list DD", formatNumber(output.projectedDd, 2), `DD gap ${signed(output.projectedDd - output.benchmarkDd, 2)} vs benchmark`),
    profileCard("Benchmark score", formatNumber(output.benchmarkScore, 1), output.benchmarkLabel),
    profileCard("Score gap", signed(output.projectedScore - output.benchmarkScore, 1), "Projected list score minus benchmark total"),
    profileCard("List rule", output.ruleLabel, output.ruleDetail),
  ].join("");
  const radarPanel = document.getElementById("individualStrengthRadar");
  if (radarPanel) radarPanel.innerHTML = individualStrengthRadarHtml(output, athleteName, board);
  const rows = output.picks.map((pick, index) => `<tr>
    <td>${index + 1}</td>
    <td>${escapeHtml(pick.groupName)}</td>
    <td>${escapeHtml(pick.dive)}</td>
    <td>${formatNumber(pick.avgScore, 1)}</td>
    <td>${formatNumber(pick.avgDd, 2)}</td>
    <td>${formatInt(pick.count)}</td>
    <td>${formatNumber(pick.bestScore, 1)}</td>
    <td>${formatNumber(pick.sdScore, 1)}</td>
    <td>${escapeHtml(trim(pick.bestContext, 72))}</td>
    <td>${escapeHtml(pick.reason)}</td>
  </tr>`).join("");
  table.innerHTML = tableHtml(["Slot", "Category", "Dive", "Avg score", "Avg DD", "Times seen", "Best score", "Consistency", "Best context", "Selection note"], rows);
  renderIndividualWhatIf(output);
}


function individualStrengthRadarHtml(output, athleteName, board) {
  const groups = board === "platform" ? GROUPS : GROUPS.filter((group) => group.code !== "6");
  const athleteValues = groups.map((group) => {
    const groupCandidates = output.candidates.filter((candidate) => candidate.group === group.code && isFiniteNumber(candidate.avgScore));
    return mean(groupCandidates.map((candidate) => candidate.avgScore)) || 0;
  });
  const benchmarkPerDive = output.benchmarkScore / Math.max(1, output.listSize);
  const benchmarkValues = groups.map(() => benchmarkPerDive || 0);
  const maxValue = Math.max(1, ...athleteValues, ...benchmarkValues);
  const axisNote = board === "platform" ? "Platform includes Armstand when data exists." : "Springboard excludes Armstand.";
  const groupRows = groups.map((group, index) => {
    const selectedDives = output.picks.filter((pick) => pick.group === group.code);
    const fallback = output.candidates
      .filter((candidate) => candidate.group === group.code)
      .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))[0];
    const diveText = selectedDives.length
      ? selectedDives.map((pick) => pick.dive).join(", ")
      : (fallback?.dive ? `${fallback.dive} available` : "No selected dive");
    const projectedPoints = sum(selectedDives.map((pick) => pick.avgScore));
    const pointText = selectedDives.length ? formatNumber(projectedPoints, 1) : "-";
    return `<tr>
      <td>${escapeHtml(group.name)}</td>
      <td>${escapeHtml(diveText)}</td>
      <td class="radar-athlete-value">${formatNumber(athleteValues[index], 1)}</td>
      <td class="radar-athlete-value">${pointText}</td>
      <td class="radar-benchmark-value">${formatNumber(benchmarkValues[index], 1)}</td>
    </tr>`;
  }).join("");
  const table = `<div class="radar-data-table-wrap"><table class="radar-data-table">
    <thead><tr><th>Group</th><th>Dive numbers</th><th>Athlete avg</th><th>List pts</th><th>Benchmark</th></tr></thead>
    <tbody>${groupRows}</tbody>
  </table></div>`;
  return `<div class="individual-radar-card compact-strength-radar">
    <div class="individual-radar-heading">
      <h4>${escapeHtml(athleteName)} strength radar: ${escapeHtml(boardLabel(board))}</h4>
      <p class="help-text">Average score by dive group against the selected benchmark per-dive equivalent. ${escapeHtml(axisNote)}</p>
      <div class="radar-legend" aria-label="Strength radar legend">
        <span class="legend-item"><i class="swatch" style="background:${COLORS.red}"></i>${escapeHtml(athleteName)} athlete average</span>
        <span class="legend-item"><i class="swatch" style="background:${COLORS.cyan}"></i>${escapeHtml(output.benchmarkLabel)} benchmark</span>
        <span class="legend-item"><i class="swatch" style="background:${COLORS.blue}"></i>Table values show selected dive numbers and projected list points</span>
      </div>
    </div>
    <div class="individual-radar-layout">
      <div class="chart-frame individual-radar-chart">${radarSvg([
        { label: athleteName, color: COLORS.red, values: athleteValues },
        { label: output.benchmarkLabel, color: COLORS.cyan, values: benchmarkValues },
      ], maxValue, groups)}</div>
      ${table}
    </div>
  </div>`;
}

function refreshIndividualListSizeOptions(athleteName, board, preserve) {
  if (!els.individualListSize) return;
  const athleteRows = DATA.results.filter((row) => row.__athlete === athleteName);
  const gender = mode(athleteRows.map((row) => row.__gender)) || "Unknown";
  const current = preserve ? els.individualListSize.value : "auto";
  const options = individualListSizeOptions(gender, board);
  els.individualListSize.innerHTML = options.map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`).join("");
  if (options.some((option) => option.value === current)) els.individualListSize.value = current;
  else els.individualListSize.value = options[0]?.value || "auto";
}

function individualListSizeOptions(gender, board) {
  if (gender === "Male") return [{ value: "auto", label: "Auto: 6 dives" }, { value: "6", label: "6 dives" }];
  if (gender === "Female" && board === "platform") return [{ value: "auto", label: "Auto: 5 dives" }, { value: "5", label: "5 dives" }];
  if (gender === "Female") return [{ value: "auto", label: "Auto: 5 dives" }, { value: "5", label: "5 dives" }, { value: "6", label: "6 dives" }];
  return [{ value: "auto", label: "Auto" }, { value: "5", label: "5 dives" }, { value: "6", label: "6 dives" }];
}

function determineIndividualListSize(gender, board, requestedSize) {
  if (gender === "Male") return { size: 6, label: "Men's individual event standard", detail: "All men's individual events use 6 dives in this builder." };
  if (gender === "Female" && board === "platform") return { size: 5, label: "Women's platform", detail: "Female platform list is fixed at 5 dives." };
  if (gender === "Female" && (board === "1m" || board === "3m")) {
    const selected = requestedSize === "6" ? 6 : 5;
    return { size: selected, label: `Women's springboard ${selected}-dive view`, detail: "Female springboard can be modeled as either a 5- or 6-dive list." };
  }
  const fallback = requestedSize === "6" ? 6 : 5;
  return { size: fallback, label: `${fallback}-dive view`, detail: "Used because gender/event rules were not fully identified." };
}

function renderIndividualWhatIf(output) {
  const container = document.getElementById("individualWhatIfArea");
  if (!container) return;
  const candidates = output.candidates;
  if (!candidates.length) {
    container.innerHTML = "";
    return;
  }
  const prior = [];
  for (let i = 0; i < output.listSize; i += 1) {
    const existing = document.getElementById(`individualWhatIfDive${i}`)?.value;
    if (existing) prior[i] = existing;
  }
  const picks = [];
  const rows = Array.from({ length: output.listSize }, (_, index) => {
    const defaultKey = output.picks[index]?.key || candidates[index]?.key || "";
    const selectedKey = prior[index] && candidates.some((candidate) => candidate.key === prior[index]) ? prior[index] : defaultKey;
    const pick = candidates.find((candidate) => candidate.key === selectedKey) || candidates[0];
    picks.push(pick);
    const options = optionGroupsByCategory(candidates, pick.key, (candidate) => `${candidate.dive} | avg ${formatNumber(candidate.avgScore, 1)} | DD ${formatNumber(candidate.avgDd, 2)} | ${trim(candidate.bestContext, 58)}`);
    return `<tr>
      <td>${index + 1}</td>
      <td><select id="individualWhatIfDive${index}" data-individual-whatif="${index}">${options}</select></td>
      <td>${escapeHtml(pick.groupName)}</td>
      <td>${formatNumber(pick.avgScore, 1)}</td>
      <td>${formatNumber(pick.avgDd, 2)}</td>
      <td>${formatInt(pick.count)}</td>
      <td>${escapeHtml(trim(pick.bestContext, 64))}</td>
    </tr>`;
  }).join("");
  const score = scoreIndividualWhatIf(picks, output);
  container.innerHTML = `
    <section class="whatif-panel inner-whatif">
      <header class="subheader">
        <div>
          <p class="eyebrow">Manual what-if</p>
          <h4>Replace any competed dive and see the list impact</h4>
        </div>
        <span class="panel-chip">${escapeHtml(output.ruleLabel)}</span>
      </header>
      <div class="workspace-guide individual-workspace-guide">
        <div><span>Recommended list</span><strong>${formatNumber(output.projectedScore, 1)}</strong><em>Original model projection; DD ${formatNumber(output.projectedDd, 2)}</em></div>
        <div><span>Manual what-if</span><strong>${formatNumber(score.projectedScore, 1)}</strong><em>Score gap ${signed(score.projectedScore - output.projectedScore, 1)} vs recommendation</em></div>
        <div><span>Benchmark</span><strong>${formatNumber(output.benchmarkScore, 1)}</strong><em>${escapeHtml(output.benchmarkLabel || "Comparison group")}; DD ${formatNumber(output.benchmarkDd, 2)}</em></div>
        <div><span>Risk check</span><strong>${formatInt(score.riskFlags.length)}</strong><em>${escapeHtml(score.riskFlags.join("; ") || "No major data flags")}</em></div>
      </div>
      <div class="mixed-summary">
        ${profileCard("What-if score", formatNumber(score.projectedScore, 1), `Gap ${signed(score.projectedScore - output.benchmarkScore, 1)} vs benchmark`)}
        ${profileCard("What-if DD", formatNumber(score.projectedDd, 2), `DD gap ${signed(score.projectedDd - output.benchmarkDd, 2)}`)}
        ${profileCard("Group coverage", `${score.groupCoverage}/${output.visualGroupCount}`, score.groupWarning || "Category coverage is balanced")}
        ${profileCard("Risk flags", formatInt(score.riskFlags.length), score.riskFlags.join("; ") || "No major data flags")}
      </div>
      <div id="individualWhatIfChart" class="mini-bars">${individualWhatIfChart(picks, output)}</div>
      <div class="table-wrap">${tableHtml(["Slot", "Dive what-if", "Group", "Avg score", "Avg DD", "Seen", "Best context"], rows)}</div>
    </section>`;
  container.querySelectorAll("select[data-individual-whatif]").forEach((select) => select.addEventListener("change", renderIndividualListBuilder));
}

function scoreIndividualWhatIf(picks, output) {
  const projectedScore = sum(picks.map((pick) => pick.avgScore));
  const projectedDd = sum(picks.map((pick) => pick.avgDd));
  const groups = picks.map((pick) => pick.group).filter(Boolean);
  const groupCoverage = new Set(groups).size;
  const riskFlags = [];
  const duplicateGroups = groups.length - groupCoverage;
  if (duplicateGroups > 0) riskFlags.push(`${duplicateGroups} duplicate dive-group slot${duplicateGroups > 1 ? "s" : ""}`);
  if (picks.some((pick) => pick.count < 2)) riskFlags.push("One or more dives has thin historical evidence");
  if (picks.some((pick) => !isFiniteNumber(pick.avgScore))) riskFlags.push("One or more selected dives lacks score data");
  const expectedCoverage = Math.min(output.listSize, output.visualGroupCount);
  const groupWarning = groupCoverage < expectedCoverage ? `Only ${groupCoverage} unique groups represented` : "";
  if (groupWarning) riskFlags.push(groupWarning);
  return { projectedScore, projectedDd, groupCoverage, groupWarning, riskFlags };
}

function individualWhatIfChart(picks, output) {
  const values = picks.map((pick, index) => ({ label: `D${index + 1}`, value: pick.avgScore || 0, dd: pick.avgDd || 0, group: pick.groupName || "" }));
  const max = Math.max(1, ...values.map((item) => item.value), output.benchmarkScore / Math.max(1, output.listSize));
  const bars = values.map((item) => {
    const width = normalize(item.value, 0, max) * 100;
    return `<div class="whatif-bar-row"><span>${escapeHtml(item.label)}</span><div class="whatif-bar-track"><i style="width:${width}%"></i></div><strong>${formatNumber(item.value, 1)}</strong><em>${escapeHtml(item.group)}; DD ${formatNumber(item.dd, 2)}</em></div>`;
  }).join("");
  const benchmarkPerDive = output.benchmarkScore / Math.max(1, output.listSize);
  return `<div class="whatif-chart-note">Benchmark per-dive equivalent: ${formatNumber(benchmarkPerDive, 1)}</div>${bars}`;
}

function buildIndividualDiveList(athleteName, board, requestedSize, benchmarkScope) {
  const athleteRows = DATA.results.filter((row) => row.__athlete === athleteName);
  const gender = mode(athleteRows.map((row) => row.__gender)) || "Unknown";
  const ageGroup = mode(athleteRows.map((row) => clean(row.age_group || row.division || row.event_level)));
  const sizeInfo = determineIndividualListSize(gender, board, requestedSize);
  const listSize = sizeInfo.size;
  const groups = (board === "platform" ? GROUPS : GROUPS.filter((group) => group.code !== "6"));
  const diveStats = buildAthleteDiveStats(athleteName, board).sort((a, b) => b.rank - a.rank);
  const byGroup = groupBy(diveStats, (stat) => stat.group);
  let groupPicks = groups.map((group) => (byGroup.get(group.code) || []).sort((a, b) => b.rank - a.rank)[0]).filter(Boolean);
  groupPicks = groupPicks.sort((a, b) => b.rank - a.rank).slice(0, Math.min(listSize, groupPicks.length));
  const usedKeys = new Set(groupPicks.map((pick) => pick.key));
  const extras = diveStats.filter((stat) => !usedKeys.has(stat.key));
  const picks = [...groupPicks];
  while (picks.length < listSize && extras.length) {
    const extra = extras.shift();
    extra.reason = "Additional strongest available dive after category coverage";
    picks.push(extra);
  }
  picks.forEach((pick) => {
    if (!pick.reason) pick.reason = "Best historical dive in this category";
  });
  const benchmark = individualBenchmark({ athleteName, gender, ageGroup, board, benchmarkScope, listSize });
  const projectedScore = sum(picks.map((pick) => pick.avgScore));
  const projectedDd = sum(picks.map((pick) => pick.avgDd));
  const strongest = picks.slice().sort((a, b) => b.avgScore - a.avgScore)[0];
  return {
    picks,
    candidates: diveStats,
    listSize,
    visualGroupCount: groups.length,
    projectedScore,
    projectedDd,
    benchmarkScore: benchmark.score,
    benchmarkDd: benchmark.dd,
    benchmarkLabel: benchmark.label,
    ruleLabel: sizeInfo.label,
    ruleDetail: sizeInfo.detail,
    strongestGroup: strongest?.groupName,
    strongestDetail: strongest ? `${strongest.dive}; avg score ${formatNumber(strongest.avgScore, 1)}` : "",
  };
}


function boardToDefaultHeight(board) {
  if (board === "1m") return "1m";
  if (board === "3m") return "3m";
  if (board === "platform") return "10m";
  return "unknown";
}

function ddLookupKey(board, heightLevel, diveCode) {
  const normalizedBoard = board || "unknown";
  const normalizedHeight = heightLevel && heightLevel !== "unknown" ? heightLevel : boardToDefaultHeight(normalizedBoard);
  return `${normalizedBoard}||${normalizedHeight}||${canonicalDiveCode(diveCode)}`;
}

function buildDdLookup() {
  const grouped = new Map();
  const addObserved = (board, heightLevel, diveCode, dd) => {
    const code = canonicalDiveCode(diveCode);
    const value = normalizeDdValue(dd);
    if (!code || !isFiniteNumber(value)) return;
    const key = ddLookupKey(board, heightLevel, code);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(value);
  };

  DATA.dives.forEach((dive) => {
    const code = canonicalDiveCode(dive.__diveCode || dive.dive_number);
    addObserved(dive.__board, dive.__heightLevel, code, dive.__dd);
    // Synchronized exports sometimes concatenate paired dive codes. Use only the canonical displayed code here;
    // paired/alternate codes can have a team DD that is not valid for an individual-code lookup.
  });

  const lookup = new Map();
  const official = (typeof window !== "undefined" && window.OFFICIAL_DD_TABLE) ? window.OFFICIAL_DD_TABLE : {};
  Object.entries(official).forEach(([key, value]) => {
    const parsed = normalizeDdValue(value);
    if (isFiniteNumber(parsed)) lookup.set(key, parsed);
  });

  grouped.forEach((values, key) => {
    // The official rulebook table wins. Observed DiveMeets values supplement missing rows only.
    if (lookup.has(key)) return;
    const rounded = values.map((value) => Math.round(value * 1000) / 1000);
    lookup.set(key, mostCommonNumber(rounded));
  });
  state.ddOptionsByBoard = buildDdOptionsByBoard(lookup);
  return lookup;
}

function mostCommonNumber(values) {
  const counts = new Map();
  values.filter(isFiniteNumber).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  let best = null;
  counts.forEach((count, value) => {
    if (!best || count > best.count || (count === best.count && value < best.value)) best = { value, count };
  });
  return best ? best.value : mean(values);
}

function buildDdOptionsByBoard(lookup) {
  const byBoard = { "1m": [], "3m": [], platform: [] };
  lookup.forEach((dd, key) => {
    const [board, heightLevel, diveCode] = key.split("||");
    if (!byBoard[board]) return;
    byBoard[board].push({
      key,
      board,
      heightLevel,
      dive: diveCode,
      baseDive: baseDiveNumber(diveCode),
      position: divePosition(diveCode),
      group: diveGroupCode(diveCode),
      groupName: GROUP_BY_CODE[diveGroupCode(diveCode)]?.name || "Unknown",
      dd,
    });
  });
  Object.keys(byBoard).forEach((board) => {
    byBoard[board] = byBoard[board]
      .sort((a, b) => Number(a.baseDive) - Number(b.baseDive) || a.position.localeCompare(b.position) || a.heightLevel.localeCompare(b.heightLevel));
  });
  return byBoard;
}

function lookupOfficialDd(diveCode, board, heightLevel) {
  if (!state.ddLookup) return null;
  const code = canonicalDiveCode(diveCode);
  if (!code) return null;
  const preferredHeight = heightLevel && heightLevel !== "unknown" ? heightLevel : boardToDefaultHeight(board);
  const direct = state.ddLookup.get(ddLookupKey(board, preferredHeight, code));
  if (isFiniteNumber(direct)) return direct;
  const defaulted = state.ddLookup.get(ddLookupKey(board, boardToDefaultHeight(board), code));
  if (isFiniteNumber(defaulted)) return defaulted;
  const prefix = `${board}||`;
  for (const [key, value] of state.ddLookup.entries()) {
    if (key.startsWith(prefix) && key.endsWith(`||${code}`) && isFiniteNumber(value)) return value;
  }
  return null;
}

function ddTableCandidatesForBoard(board) {
  return state.ddOptionsByBoard?.[board] || [];
}

function buildAthleteDiveStats(athleteName, board) {
  const rows = DATA.dives.filter((dive) => dive.__athlete === athleteName && dive.__board === board && isFiniteNumber(dive.__score) && clean(dive.__diveCode || dive.dive_number));
  const grouped = groupBy(rows, (dive) => {
    const code = canonicalDiveCode(dive.__diveCode || dive.dive_number);
    return `${diveGroupCode(code)}||${baseDiveNumber(code)}||${divePosition(code)}||${code}`;
  });
  return [...grouped.entries()].map(([key, dives]) => {
    const scores = dives.map((dive) => dive.__score).filter(isFiniteNumber);
    const bestDive = dives.slice().sort((a, b) => contextQuality(b) - contextQuality(a) || b.__score - a.__score || lookupOfficialDd(canonicalDiveCode(b.__diveCode || b.dive_number), board, b.__heightLevel) - lookupOfficialDd(canonicalDiveCode(a.__diveCode || a.dive_number), board, a.__heightLevel))[0];
    const topScoreDive = dives.slice().sort((a, b) => b.__score - a.__score || contextQuality(b) - contextQuality(a))[0];
    const contextDive = topScoreDive || bestDive;
    const code = canonicalDiveCode(bestDive.__diveCode || bestDive.dive_number);
    const officialDd = lookupOfficialDd(code, board, bestDive.__heightLevel);
    const observedDds = dives.map((dive) => lookupOfficialDd(code, board, dive.__heightLevel) ?? dive.__dd).filter(isFiniteNumber);
    const avgScore = mean(scores);
    const avgDd = officialDd ?? mean(observedDds);
    const sdScore = stdev(scores);
    return {
      key,
      group: diveGroupCode(code),
      groupName: GROUP_BY_CODE[diveGroupCode(code)]?.name || "Unknown",
      dive: code,
      baseDive: baseDiveNumber(code),
      position: divePosition(code),
      avgScore,
      avgDd,
      officialDd: avgDd,
      sdScore,
      count: dives.length,
      bestScore: Math.max(...scores),
      bestContext: diveContext(contextDive),
      heightLevel: bestDive.__heightLevel || boardToDefaultHeight(board),
      rank: (avgScore ?? 0) * 10 + (avgDd ?? 0) * 9 + Math.min(dives.length, 5) * 2 - (sdScore ?? 0) * 1.5 + contextQuality(contextDive),
    };
  });
}

function diveContext(dive) {
  if (!dive) return "No context";
  const meet = clean(dive.__meet) && dive.__meet !== "Unknown meet" ? dive.__meet : clean(dive.meet_name) || `Meet ${clean(dive.meet_id) || "unknown"}`;
  const event = clean(dive.__event) && dive.__event !== "Unknown event" ? dive.__event : clean(dive.event_name) || `Event ${clean(dive.event_id) || "unknown"}`;
  const round = clean(dive.round_stage || dive.event_round);
  const pieces = [meet, event, round].filter(Boolean);
  return pieces.join(" / ");
}

function contextQuality(dive) {
  if (!dive) return 0;
  let score = 0;
  if (clean(dive.__meet) && dive.__meet !== "Unknown meet") score += 5;
  if (clean(dive.__event) && dive.__event !== "Unknown event") score += 4;
  if (clean(dive.round_stage || dive.event_round)) score += 1;
  return score;
}

function individualBenchmark({ athleteName, gender, ageGroup, board, benchmarkScope, listSize }) {
  const sameBoardGender = DATA.results.filter((row) => row.__board === board && row.__gender === gender && (!ageGroup || clean(row.age_group || row.division || row.event_level) === ageGroup));
  const athleteBoardRows = DATA.results.filter((row) => row.__athlete === athleteName && row.__board === board);
  let rows = sameBoardGender.filter((row) => isFiniteNumber(row.__score));
  let label = `Full field, ${gender}, ${boardLabel(board)}${ageGroup ? `, ${ageGroup}` : ""}`;
  if (benchmarkScope === "top3") {
    rows = rows.filter((row) => isFiniteNumber(row.__place) && row.__place <= 3);
    label = `Average top 3, ${gender}, ${boardLabel(board)}${ageGroup ? `, ${ageGroup}` : ""}`;
  } else if (benchmarkScope === "athlete_events") {
    rows = athleteBoardRows;
    label = "Athlete average across competed events";
  }
  if (!rows.length) rows = athleteBoardRows.length ? athleteBoardRows : sameBoardGender;
  const score = mean(rows.map((row) => row.__score)) || 0;
  const dd = mean(rows.map((row) => row.__dd)) || 0;
  return {
    score,
    dd,
    perDiveScore: listSize ? score / listSize : null,
    perDiveDd: listSize ? dd / listSize : null,
    label,
  };
}

function buildMixedTeamCandidates() {
  const limit = Math.max(5, Math.min(60, Math.floor(number(els.mixedLimit.value) || 20)));
  const profiles = buildMixedProfiles();
  const female3 = topProfiles(profiles, "Female", "3m", 7);
  const female10 = topProfiles(profiles, "Female", "platform", 7);
  const male3 = topProfiles(profiles, "Male", "3m", 7);
  const male10 = topProfiles(profiles, "Male", "platform", 7);
  const benchmark = mixedTeamBenchmark();
  const syncEvidenceMap = buildSyncEvidenceMap();
  const candidates = [];
  const seen = new Set();

  female3.forEach((f3) => {
    female10.forEach((f10) => {
      male3.forEach((m3) => {
        male10.forEach((m10) => {
          const teamProfiles = uniqueProfiles([f3, f10, m3, m10]);
          if (teamProfiles.length < 2 || teamProfiles.length > 4) return;
          if (!teamProfiles.some((profile) => profile.gender === "Female") || !teamProfiles.some((profile) => profile.gender === "Male")) return;
          const signature = teamProfiles.map((profile) => profile.key).sort().join("||") + `::${f3.key}|${f10.key}|${m3.key}|${m10.key}`;
          if (seen.has(signature)) return;
          seen.add(signature);
          const candidate = buildCandidatePlan({ f3, f10, m3, m10 }, benchmark, syncEvidenceMap);
          if (candidate.groupCoverage >= 4) candidates.push(candidate);
        });
      });
    });
  });

  return candidates
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, limit);
}

function buildMixedProfiles() {
  const profileMap = new Map();
  const allowedDives = DATA.dives.filter((dive) => {
    if (!["Female", "Male"].includes(dive.__gender)) return false;
    if (dive.__isSync || isTeamDiverName(dive.__athlete)) return false;
    if (!includeUsEligibleAthlete(dive)) return false;
    if (!["3m", "platform"].includes(dive.__board)) return false;
    if (!isFiniteNumber(dive.__score) || !isFiniteNumber(dive.__dd)) return false;
    if (!GROUP_BY_CODE[dive.__group]) return false;
    return true;
  });

  allowedDives.forEach((dive) => {
    const key = `${dive.__gender}::${dive.__athlete}`;
    if (!profileMap.has(key)) {
      profileMap.set(key, {
        key,
        name: dive.__athlete,
        gender: dive.__gender,
        teamNames: new Set(),
        boards: { "3m": [], platform: [] },
        bestByBoardGroup: { "3m": new Map(), platform: new Map() },
        bestByBoardDive: { "3m": new Map(), platform: new Map() },
      });
    }
    const profile = profileMap.get(key);
    profile.teamNames.add(clean(dive.team_name));
    profile.boards[dive.__board].push(dive);
    setBest(profile.bestByBoardGroup[dive.__board], dive.__group, dive, (existing, next) => diveRank(next) > diveRank(existing));
    setBest(profile.bestByBoardDive[dive.__board], dive.__diveCode || canonicalDiveCode(dive.dive_number), dive, (existing, next) => diveRank(next) > diveRank(existing));
  });

  return [...profileMap.values()].map((profile) => {
    profile.boardScore = {
      "3m": profileStrength(profile, "3m"),
      platform: profileStrength(profile, "platform"),
    };
    profile.boardCount = {
      "3m": profile.boards["3m"].length,
      platform: profile.boards.platform.length,
    };
    return profile;
  });
}

function buildCandidatePlan(slots, benchmark, syncEvidenceMap) {
  const planSlots = [
    { round: "R1", role: "Female individual", board: "3m", type: "individual", profile: slots.f3 },
    { round: "R2", role: "Male individual", board: "3m", type: "individual", profile: slots.m3 },
    { round: "R3", role: "Mixed synchronized", board: "3m", type: "sync", female: slots.f3, male: slots.m3 },
    { round: "R4", role: "Female individual", board: "platform", type: "individual", profile: slots.f10 },
    { round: "R5", role: "Male individual", board: "platform", type: "individual", profile: slots.m10 },
    { round: "R6", role: "Mixed synchronized", board: "platform", type: "sync", female: slots.f10, male: slots.m10 },
  ].map((slot) => ({ ...slot, candidates: slot.type === "sync" ? syncCandidates(slot.female, slot.male, slot.board, syncEvidenceMap) : individualCandidates(slot.profile, slot.board) }));

  const beams = beamSelectPlan(planSlots);
  const best = beams[0];
  const picks = best.picks;
  const teamProfiles = uniqueProfiles([slots.f3, slots.f10, slots.m3, slots.m10]);
  const riskFlags = [];
  const groupCoverage = new Set(picks.map((pick) => pick.group).filter(Boolean)).size;
  if (groupCoverage < 6) riskFlags.push(`Only ${groupCoverage} unique groups covered`);
  planSlots.forEach((slot) => {
    if (!slot.candidates.length) riskFlags.push(`No ${boardLabel(slot.board)} ${slot.role.toLowerCase()} history`);
    if (slot.type === "sync" && !slot.candidates.length) riskFlags.push(`No matching ${boardLabel(slot.board)} mixed synchro dive numbers`);
  });
  teamProfiles.forEach((profile) => {
    if (profile.boardCount["3m"] < 4) riskFlags.push(`${profile.name}: thin 3m data`);
    if (profile.boardCount.platform < 4) riskFlags.push(`${profile.name}: thin platform data`);
  });
  const syncPicks = picks.filter((pick) => pick.role === "Mixed synchronized");
  if (syncPicks.some((pick) => pick.evidenceCategory === "Individual evidence only")) riskFlags.push("Some synchronized rounds use individual evidence only");
  if (syncPicks.some((pick) => pick.evidenceCategory === "Voluntary assumption")) riskFlags.push("Some synchronized rounds use voluntary assumption");
  if (syncPicks.some((pick) => pick.missing)) riskFlags.push("A synchronized slot is missing usable evidence");

  const scores = picks.map((pick) => pick.score).filter(isFiniteNumber);
  const dds = picks.map((pick) => pick.dd).filter(isFiniteNumber);
  const strength3m = mean(picks.filter((pick) => pick.board === "3m").map((pick) => pick.score));
  const strength10m = mean(picks.filter((pick) => pick.board === "platform").map((pick) => pick.score));
  const femaleScore = mean(picks.filter((pick) => pick.gender === "Female" || pick.role?.includes("Female")).map((pick) => pick.score));
  const maleScore = mean(picks.filter((pick) => pick.gender === "Male" || pick.role?.includes("Male")).map((pick) => pick.score));
  const balance = 100 - Math.abs((femaleScore || 0) - (maleScore || 0));
  const totalDd = sum(dds);
  const averageDd = mean(dds);
  const ddGap = totalDd - benchmark.avgDd;
  const averageScore = mean(scores);
  const consistencyPenalty = stdev(scores) || 0;
  const evidenceConfidence = mean(picks.map((pick) => pick.evidenceScore).filter(isFiniteNumber)) || 0;
  const evidenceSummary = evidenceCategorySummary(picks);
  const riskPenalty = riskFlags.length * 28;
  const rankScore =
    groupCoverage * 1200 +
    averageScore * 5 +
    averageDd * 75 +
    strength3m * 1.2 +
    strength10m * 1.2 +
    balance * 2 +
    evidenceConfidence * 10 +
    ddGap * 18 -
    consistencyPenalty * 7 -
    riskPenalty;

  return {
    teamLabel: teamProfiles.map((profile) => profile.name).join(" / "),
    divers: teamProfiles.map((profile) => profile.name),
    groupCoverage,
    averageScore,
    averageDd,
    totalDd,
    ddGap,
    consistency: consistencyPenalty,
    strength3m,
    strength10m,
    balance,
    evidenceConfidence,
    evidenceSummary,
    riskFlags: riskFlags.slice(0, 6),
    picks,
    planSummary: picks.map((pick) => `${pick.round} ${boardLabel(pick.board)} ${pick.dive || "missing"} ${pick.groupName || ""} [${pick.evidenceCategory || "missing"}]`).join(" | "),
    slotProfileKeys: { f3: slots.f3.key, m3: slots.m3.key, f10: slots.f10.key, m10: slots.m10.key },
    slotProfileNames: { f3: slots.f3.name, m3: slots.m3.name, f10: slots.f10.name, m10: slots.m10.name },
    rankScore,
  };
}

function individualCandidates(profile, board) {
  return [...profile.bestByBoardGroup[board].values()]
    .map((dive) => ({
      round: "",
      role: `${profile.gender} individual`,
      gender: profile.gender,
      athlete: profile.name,
      board,
      dive: dive.__diveCode || canonicalDiveCode(dive.dive_number),
      group: dive.__group,
      groupName: dive.__groupName,
      dd: dive.__dd,
      score: dive.__score,
      projectedSync: false,
      evidenceCategory: "Verified evidence",
      evidenceScore: 100,
    }))
    .sort((a, b) => diveRank(b) - diveRank(a))
    .slice(0, 8);
}

function syncCandidates(female, male, board, syncEvidenceMap) {
  const candidates = [];
  const seen = new Set();
  female.bestByBoardDive[board].forEach((femaleDive, diveNumber) => {
    const maleDive = male.bestByBoardDive[board].get(diveNumber);
    if (!maleDive) return;
    const group = femaleDive.__group || maleDive.__group;
    const evidence = syncEvidenceMap.get(pairDiveKey(female.name, male.name, board, diveNumber));
    const evidenceCategory = evidence ? "Synchro evidence" : "Individual evidence only";
    const evidenceScore = evidence ? 100 : 82;
    candidates.push({
      role: "Mixed synchronized",
      gender: "Mixed",
      athlete: `${female.name} / ${male.name}`,
      board,
      dive: diveNumber,
      group,
      groupName: GROUP_BY_CODE[group]?.name || "Unknown",
      dd: evidence?.dd ?? mean([femaleDive.__dd, maleDive.__dd]),
      score: evidence?.score ?? mean([femaleDive.__score, maleDive.__score]),
      projectedSync: !evidence,
      evidenceCategory,
      evidenceScore,
      evidenceNote: evidence ? "Same mixed synchro pair has competed this dive" : "Both athletes have competed the same dive individually on this board/platform",
    });
    seen.add(diveNumber);
  });

  // Voluntary/assigned-DD dives are feasible for most qualified athletes, but remain lower-confidence than verified evidence.
  voluntarySyncAssumptions(female, male, board, seen).forEach((candidate) => candidates.push(candidate));

  return candidates
    .sort((a, b) => b.evidenceScore - a.evidenceScore || diveRank(b) - diveRank(a))
    .slice(0, 10);
}

function beamSelectPlan(slots) {
  let beams = [{ used: new Set(), picks: [], coverage: 0, score: 0, dd: 0, evidenceScore: 0 }];
  slots.forEach((slot) => {
    const candidates = slot.candidates.length ? slot.candidates : [{ board: slot.board, role: slot.role, score: null, dd: null, group: null, groupName: "", dive: "", missing: true }];
    const next = [];
    beams.forEach((beam) => {
      candidates.slice(0, 8).forEach((candidate) => {
        const used = new Set(beam.used);
        const addsGroup = candidate.group && !used.has(candidate.group);
        if (candidate.group) used.add(candidate.group);
        const pick = { ...candidate, round: slot.round, role: slot.role, board: slot.board };
        next.push({
          used,
          picks: [...beam.picks, pick],
          coverage: used.size,
          score: beam.score + (candidate.score || 0),
          dd: beam.dd + (candidate.dd || 0),
          duplicatePenalty: (beam.duplicatePenalty || 0) + (candidate.group && !addsGroup ? 1 : 0),
          evidenceScore: beam.evidenceScore + (candidate.evidenceScore || 0),
        });
      });
    });
    beams = next
      .sort((a, b) => b.coverage - a.coverage || b.evidenceScore - a.evidenceScore || b.score - a.score || b.dd - a.dd || (a.duplicatePenalty || 0) - (b.duplicatePenalty || 0))
      .slice(0, 22);
  });
  return beams;
}

function topProfiles(profiles, gender, board, limit) {
  return profiles
    .filter((profile) => profile.gender === gender && profile.boardCount[board] >= 3)
    .sort((a, b) => b.boardScore[board] - a.boardScore[board])
    .slice(0, limit);
}

function mixedTeamBenchmark() {
  const rows = DATA.results.filter((row) => lower(row.__event).includes("mixed 3m") && lower(row.__event).includes("10m") && lower(row.__event).includes("team"));
  return {
    avgScore: mean(rows.map((row) => row.__score)) || 0,
    avgDd: mean(rows.map((row) => row.__dd)) || 0,
    rows,
  };
}



function populateSynchroPairControls(preserve = true) {
  if (!els.synchroPairGender || !els.synchroPairBoard || !els.synchroPairDiver1 || !els.synchroPairDiver2) return;
  const gender = els.synchroPairGender.value || "Female";
  const board = els.synchroPairBoard.value || "3m";
  const current1 = preserve ? els.synchroPairDiver1.value : "";
  const current2 = preserve ? els.synchroPairDiver2.value : "";
  const names = synchroPairAthleteNames(gender, board);
  const options = names.map((name) => `<option value="${escapeAttr(name)}"></option>`).join("");
  const list1 = document.getElementById("synchroPairDiver1Options");
  const list2 = document.getElementById("synchroPairDiver2Options");
  if (list1) list1.innerHTML = options;
  if (list2) list2.innerHTML = options;
  if (preserve && current1 && names.includes(current1)) els.synchroPairDiver1.value = current1;
  else els.synchroPairDiver1.value = names[0] || "";
  if (preserve && current2 && names.includes(current2) && current2 !== els.synchroPairDiver1.value) els.synchroPairDiver2.value = current2;
  else els.synchroPairDiver2.value = names.find((name) => name !== els.synchroPairDiver1.value) || "";
  refreshSynchroPairListSizeOptions(gender, els.synchroPairEventType?.value || "senior");
}

function synchroPairAthleteNames(gender, board) {
  const names = unique(DATA.dives
    .filter((dive) => dive.__gender === gender && dive.__board === board && !dive.__isSync && !isTeamDiverName(dive.__athlete) && includeUsEligibleAthlete(dive) && isFiniteNumber(dive.__score) && isFiniteNumber(dive.__dd))
    .map((dive) => dive.__athlete))
    .sort((a, b) => a.localeCompare(b));
  return names;
}

function synchroRuleConfig(gender, eventType, board) {
  const type = eventType || "senior";
  if (type === "junior_ab") {
    return {
      key: type,
      label: `Junior A/B ${gender} ${boardLabel(board)} synchro`,
      listSize: 5,
      minGroups: 4,
      voluntaryRounds: 2,
      optionalRounds: 3,
      ruleText: "5 dives; first 2 assigned DD 2.0; final 3 without DD limit; at least 4 groups.",
    };
  }
  if (type === "junior_13u") {
    return {
      key: type,
      label: `Junior 13U ${gender} ${boardLabel(board)} synchro`,
      listSize: 5,
      minGroups: 3,
      voluntaryRounds: 2,
      optionalRounds: 3,
      ruleText: "5 dives; first 2 assigned DD 2.0; final 3 without DD limit; at least 3 groups.",
    };
  }
  if (gender === "Male") {
    return {
      key: type,
      label: `Senior Men ${boardLabel(board)} synchro`,
      listSize: 6,
      minGroups: 5,
      voluntaryRounds: 2,
      optionalRounds: 4,
      ruleText: "6 dives; first 2 assigned DD 2.0; final 4 without DD limit; 5 groups required.",
    };
  }
  return {
    key: type,
    label: `Senior Women ${boardLabel(board)} synchro`,
    listSize: 5,
    minGroups: 5,
    voluntaryRounds: 2,
    optionalRounds: 3,
    ruleText: "5 dives; first 2 assigned DD 2.0; final 3 without DD limit; 5 groups required.",
  };
}

function synchroRoundSlots(rule) {
  return Array.from({ length: rule.listSize }, (_, index) => {
    const voluntary = index < rule.voluntaryRounds;
    return {
      index,
      round: index + 1,
      type: voluntary ? "Voluntary / assigned DD" : "Optional / without limit",
      assignedDd: voluntary ? 2.0 : null,
    };
  });
}

function refreshSynchroPairListSizeOptions(gender, eventType) {
  if (!els.synchroPairListSize) return;
  const board = els.synchroPairBoard?.value || "3m";
  const rule = synchroRuleConfig(gender, eventType, board);
  els.synchroPairListSize.innerHTML = `<option value="auto">${escapeHtml(rule.label)}: ${rule.listSize} dives</option>`;
  els.synchroPairListSize.value = "auto";
}

function renderSynchroPairBuilder() {
  const summary = document.getElementById("synchroPairSummary");
  const table = document.getElementById("synchroPairTable");
  const chart = document.getElementById("synchroPairChart");
  if (!summary || !table || !els.synchroPairDiver1 || !els.synchroPairDiver2) return;
  const gender = els.synchroPairGender.value || "Female";
  const board = els.synchroPairBoard.value || "3m";
  const eventType = els.synchroPairEventType?.value || "senior";
  const diver1 = clean(els.synchroPairDiver1.value);
  const diver2 = clean(els.synchroPairDiver2.value);
  const names = synchroPairAthleteNames(gender, board);
  const diver1Ok = names.includes(diver1);
  const diver2Ok = names.includes(diver2);
  if (!diver1 || !diver2 || diver1 === diver2 || !diver1Ok || !diver2Ok) {
    summary.innerHTML = "";
    const message = !diver1Ok || !diver2Ok
      ? "Type and select two different same-gender divers from the available athlete list."
      : "Select two different same-gender divers to build a rule-aware synchro list.";
    table.innerHTML = emptyState(message);
    if (chart) chart.innerHTML = "";
    return;
  }
  const output = buildSynchroPairAnalysis({ gender, board, eventType, diver1, diver2, requestedSize: els.synchroPairListSize.value, benchmarkScope: els.synchroPairBenchmarkScope.value });
  if (!output.candidates.length) {
    summary.innerHTML = profileCard("Pair", `${diver1} / ${diver2}`, `${output.rule.label}; no historical dive data found on this board/platform.`);
    table.innerHTML = emptyState("No individual dive data was found for either diver in this board/platform context.");
    if (chart) chart.innerHTML = "";
    return;
  }
  const picks = renderSynchroPairWhatIf(output);
  const score = scoreSynchroPairWhatIf(picks, output);
  summary.innerHTML = [
    profileCard("Rule set", output.rule.label, output.rule.ruleText),
    profileCard("Projected synchro score", formatNumber(score.projectedScore, 1), `Gap ${signed(score.projectedScore - output.benchmarkScore, 1)} vs benchmark`),
    profileCard("Projected DD", formatNumber(score.projectedDd, 2), `DD gap ${signed(score.projectedDd - output.benchmarkDd, 2)}`),
    profileCard("Group coverage", `${formatInt(score.groupCoverage)} / ${formatInt(output.rule.minGroups)}`, score.groupCoverage >= output.rule.minGroups ? "Meets selected rule model" : "Does not meet selected rule model"),
    profileCard("Exact matches", formatInt(score.exactCount), `${formatInt(score.positionMismatchCount)} position-mismatch slots; ${formatInt(score.missingSideCount)} no-data sides`),
    profileCard("Risk flags", formatInt(score.riskFlags.length), score.riskFlags.join("; ") || "No major data flags"),
  ].join("");
  if (chart) chart.innerHTML = synchroPairChart(picks, output);
}

function renderSynchroPairWhatIf(output) {
  const table = document.getElementById("synchroPairTable");
  const prior = [];
  for (let i = 0; i < output.listSize; i += 1) {
    const existing = document.getElementById(`synchroPairDive${i}`)?.value;
    if (existing) prior[i] = existing;
  }
  const slots = synchroRoundSlots(output.rule);
  const picks = [];
  const rows = slots.map((slot, index) => {
    const slotCandidates = candidatesForSynchroSlot(output.candidates, slot);
    const candidatePool = slotCandidates.length ? slotCandidates : output.candidates;
    const defaultKey = output.picks[index]?.key || candidatePool[index]?.key || candidatePool[0]?.key || "";
    const selectedKey = prior[index] && candidatePool.some((candidate) => candidate.key === prior[index]) ? prior[index] : defaultKey;
    const pick = candidatePool.find((candidate) => candidate.key === selectedKey) || candidatePool[0];
    const scoredPick = applySynchroSlotRule(pick, slot);
    picks.push(scoredPick);
    const options = optionGroupsByCategory(candidatePool, pick.key, (candidate) => {
      const candidateInSlot = applySynchroSlotRule(candidate, slot);
      const ddText = slot.assignedDd ? `formula DD ${formatNumber(candidateInSlot.formulaDd, 2)} / assigned ${formatNumber(candidateInSlot.effectiveDd, 1)}` : `DD ${formatNumber(candidateInSlot.effectiveDd, 2)}`;
      return `${candidate.label} | ${candidateInSlot.evidenceCategory} | ${ddText}`;
    });
    return `<tr>
      <td>${slot.round}</td>
      <td>${escapeHtml(slot.type)}</td>
      <td><select id="synchroPairDive${index}" data-synchro-pair-dive="${index}">${options}</select></td>
      <td>${escapeHtml(scoredPick.groupName)}</td>
      <td>${formatNumber(scoredPick.effectiveScore, 1)}</td>
      <td>${formatNumber(scoredPick.effectiveDd, 2)}</td>
      <td>${escapeHtml(scoredPick.diver1Summary)}</td>
      <td>${escapeHtml(scoredPick.diver2Summary)}</td>
      <td>${escapeHtml(scoredPick.evidenceCategory)}</td>
      <td>${escapeHtml(scoredPick.note)}</td>
    </tr>`;
  }).join("");
  const interimScore = scoreSynchroPairWhatIf(picks, output);
  table.innerHTML = synchroWorkspaceGuideHtml(output, picks, interimScore) + tableHtml(["Round", "Round type", "Dive what-if", "Group", "Projected score", "DD", output.diver1, output.diver2, "Evidence", "Rule/data note"], rows);
  table.querySelectorAll("select[data-synchro-pair-dive]").forEach((select) => select.addEventListener("change", renderSynchroPairBuilder));
  return picks;
}



function synchroWorkspaceGuideHtml(output, picks, score) {
  const voluntaryCount = picks.filter((pick) => lower(pick.slotType || "").includes("voluntary")).length;
  const optionalCount = picks.filter((pick) => lower(pick.slotType || "").includes("optional")).length;
  return `<div class="workspace-guide synchro-workspace-guide">
    <div><span>1. Rule set</span><strong>${escapeHtml(output.rule.label)}</strong><em>${escapeHtml(output.rule.ruleText)}</em></div>
    <div><span>2. Round mix</span><strong>${formatInt(voluntaryCount)} voluntary / ${formatInt(optionalCount)} optional</strong><em>Voluntary rounds enforce formula DD not greater than 2.0.</em></div>
    <div><span>3. Pair evidence</span><strong>${formatInt(score.exactCount)} exact</strong><em>${formatInt(score.missingSideCount)} no-data sides; ${formatInt(score.positionMismatchCount)} position mismatches.</em></div>
    <div><span>4. Benchmark</span><strong>${formatNumber(output.benchmarkScore, 1)}</strong><em>${escapeHtml(output.benchmarkLabel || "Closest available benchmark")}; DD ${formatNumber(output.benchmarkDd, 2)}</em></div>
  </div>`;
}

function buildSynchroPairAnalysis({ gender, board, eventType, diver1, diver2, requestedSize, benchmarkScope }) {
  const rule = synchroRuleConfig(gender, eventType, board);
  const listSize = rule.listSize;
  const stats1 = buildAthleteDiveStats(diver1, board);
  const stats2 = buildAthleteDiveStats(diver2, board);
  const candidates = buildSynchroPairCandidates(stats1, stats2, board);
  const picks = selectSynchroPairDefaults(candidates, rule);
  const benchmark = synchroPairBenchmark({ gender, board, benchmarkScope, listSize });
  return { candidates, picks, listSize, gender, board, diver1, diver2, rule, benchmarkScore: benchmark.score, benchmarkDd: benchmark.dd, benchmarkLabel: benchmark.label };
}

function buildSynchroPairCandidates(stats1, stats2, board) {
  const byDive1 = new Map(stats1.map((stat) => [stat.dive, stat]));
  const byDive2 = new Map(stats2.map((stat) => [stat.dive, stat]));
  const byBase1 = groupBy(stats1, (stat) => stat.baseDive);
  const byBase2 = groupBy(stats2, (stat) => stat.baseDive);
  const candidateMap = new Map();
  const addCandidate = (candidate) => {
    if (!candidate || !candidate.dive) return;
    if (!candidateMap.has(candidate.key)) candidateMap.set(candidate.key, candidate);
  };

  const allExactDives = unique([
    ...stats1.map((stat) => stat.dive),
    ...stats2.map((stat) => stat.dive),
    ...ddTableCandidatesForBoard(board).map((entry) => entry.dive),
  ]).sort((a, b) => Number(baseDiveNumber(a)) - Number(baseDiveNumber(b)) || divePosition(a).localeCompare(divePosition(b)));

  allExactDives.forEach((dive) => {
    const stat1 = byDive1.get(dive) || null;
    const stat2 = byDive2.get(dive) || null;
    if (stat1 || stat2) {
      addCandidate(synchroCandidateFromStats(stat1, stat2, stat1 && stat2 ? "Exact same dive and position" : "One diver data only", stat1 && stat2 ? 100 : 45, board, dive));
    } else {
      const tableEntry = ddTableCandidatesForBoard(board).find((entry) => entry.dive === dive);
      addCandidate(synchroCandidateFromTable(tableEntry, board));
    }
  });

  byBase1.forEach((group1, base) => {
    (byBase2.get(base) || []).forEach((stat2) => {
      group1.forEach((stat1) => {
        if (stat1.dive === stat2.dive) return;
        const key = `position_mismatch||${stat1.dive}||${stat2.dive}`;
        if (!candidateMap.has(key)) addCandidate(synchroCandidateFromStats(stat1, stat2, "Same dive number, different position", 62, board));
      });
    });
  });

  return [...candidateMap.values()].sort((a, b) => b.evidenceScore - a.evidenceScore || b.rank - a.rank || a.label.localeCompare(b.label));
}

function synchroCandidateFromStats(stat1, stat2, evidenceCategory, evidenceScore, board, forcedDiveCode) {
  const sourceStat = stat1 || stat2;
  const displayDive = canonicalDiveCode(forcedDiveCode || (stat1 && stat2 && stat1.dive === stat2.dive ? stat1.dive : sourceStat.dive));
  const samePosition = Boolean(stat1 && stat2 && stat1.dive === stat2.dive);
  const missingSide = !stat1 || !stat2;
  const positionMismatch = Boolean(stat1 && stat2 && stat1.baseDive === stat2.baseDive && stat1.dive !== stat2.dive);
  const label = samePosition || missingSide ? displayDive : `${stat1.dive} / ${stat2.dive}`;
  const projectedScore = mean([stat1?.avgScore, stat2?.avgScore].filter(isFiniteNumber));
  const projectedDd = lookupOfficialDd(displayDive, board, sourceStat?.heightLevel) ?? mean([stat1?.avgDd, stat2?.avgDd].filter(isFiniteNumber));
  let note = "Meets same dive/same position evidence standard.";
  if (positionMismatch) note = "Rule warning: same base dive but different position; synchro rules require same dive number and position.";
  if (missingSide) note = `${stat1 ? "Diver 2" : "Diver 1"} has no individual data present for this exact dive.`;
  return {
    key: positionMismatch ? `position_mismatch||${stat1.dive}||${stat2.dive}` : `shared_dive||${displayDive}`,
    label,
    dive: displayDive,
    diver1Dive: stat1?.dive || displayDive,
    diver2Dive: stat2?.dive || displayDive,
    baseDive: baseDiveNumber(displayDive),
    group: diveGroupCode(displayDive),
    groupName: GROUP_BY_CODE[diveGroupCode(displayDive)]?.name || sourceStat.groupName || "Unknown",
    projectedScore,
    projectedDd,
    formulaDd: projectedDd,
    evidenceCategory,
    evidenceScore,
    exact: samePosition,
    missingSide,
    missingSideCount: missingSide ? 1 : 0,
    positionMismatch,
    diver1Summary: stat1 ? `${stat1.dive}: avg ${formatNumber(stat1.avgScore, 1)}, DD ${formatNumber(stat1.avgDd, 2)}, n=${formatInt(stat1.count)}` : "No data present",
    diver2Summary: stat2 ? `${stat2.dive}: avg ${formatNumber(stat2.avgScore, 1)}, DD ${formatNumber(stat2.avgDd, 2)}, n=${formatInt(stat2.count)}` : "No data present",
    context: [stat1?.bestContext, stat2?.bestContext].filter(Boolean).join(" || ") || "No context",
    note,
    rank: (projectedScore || 0) * 10 + (projectedDd || 0) * 8 + evidenceScore + Math.min((stat1?.count || 0) + (stat2?.count || 0), 8),
  };
}

function synchroCandidateFromTable(entry, board) {
  if (!entry) return null;
  const dd = lookupOfficialDd(entry.dive, board, entry.heightLevel) ?? entry.dd;
  return {
    key: `table_only||${entry.dive}`,
    label: entry.dive,
    dive: entry.dive,
    diver1Dive: entry.dive,
    diver2Dive: entry.dive,
    baseDive: entry.baseDive,
    group: entry.group,
    groupName: entry.groupName,
    projectedScore: null,
    projectedDd: dd,
    formulaDd: dd,
    evidenceCategory: "No individual data present",
    evidenceScore: 15,
    exact: false,
    missingSide: true,
    missingSideCount: 2,
    positionMismatch: false,
    diver1Summary: "No data present",
    diver2Summary: "No data present",
    context: "DD table only",
    note: "Official/observed DD lookup available, but neither diver has individual data present for this dive.",
    rank: (dd || 0) * 8,
  };
}

function candidateAllowedForSynchroSlot(candidate, slot) {
  if (!candidate) return false;
  const formulaDd = isFiniteNumber(candidate.formulaDd) ? candidate.formulaDd : candidate.projectedDd;
  if (slot.assignedDd && (!isFiniteNumber(formulaDd) || formulaDd > 2.0001)) return false;
  return true;
}

function candidatesForSynchroSlot(candidates, slot) {
  return candidates.filter((candidate) => candidateAllowedForSynchroSlot(candidate, slot));
}

function applySynchroSlotRule(candidate, slot) {
  const formulaDd = isFiniteNumber(candidate.formulaDd) ? candidate.formulaDd : candidate.projectedDd;
  const effectiveDd = slot.assignedDd ?? formulaDd;
  const violatesVoluntaryDd = Boolean(slot.assignedDd && (!isFiniteNumber(formulaDd) || formulaDd > 2.0001));
  const evidenceCategory = slot.assignedDd && candidate.missingSide
    ? "Voluntary assumption / no-data side"
    : slot.assignedDd
      ? `${candidate.evidenceCategory}; assigned DD`
      : candidate.evidenceCategory;
  let note = candidate.note;
  if (violatesVoluntaryDd) note = `${note} Rule warning: voluntary/assigned-DD rounds are limited to dives with DD not greater than 2.0.`;
  return {
    ...candidate,
    slotRound: slot.round,
    slotType: slot.type,
    effectiveScore: candidate.projectedScore,
    effectiveDd,
    formulaDd,
    violatesVoluntaryDd,
    evidenceCategory,
    note,
  };
}

function selectSynchroPairDefaults(candidates, ruleOrListSize) {
  const rule = typeof ruleOrListSize === "number" ? { listSize: ruleOrListSize, minGroups: Math.min(5, ruleOrListSize), voluntaryRounds: 2 } : ruleOrListSize;
  const slots = synchroRoundSlots(rule);
  const picks = [];
  const usedGroups = new Set();
  const usedBaseDives = new Set();
  slots.forEach((slot) => {
    const slotCandidates = candidatesForSynchroSlot(candidates, slot);
    const sorted = slotCandidates.slice().sort((a, b) => {
      const aNewGroup = a.group && !usedGroups.has(a.group) ? 1 : 0;
      const bNewGroup = b.group && !usedGroups.has(b.group) ? 1 : 0;
      const aNewDive = a.baseDive && !usedBaseDives.has(a.baseDive) ? 1 : 0;
      const bNewDive = b.baseDive && !usedBaseDives.has(b.baseDive) ? 1 : 0;
      return bNewDive - aNewDive || bNewGroup - aNewGroup || b.evidenceScore - a.evidenceScore || b.rank - a.rank;
    });
    const pick = sorted.find((candidate) => !usedBaseDives.has(candidate.baseDive) && (usedGroups.size >= rule.minGroups || !usedGroups.has(candidate.group)))
      || sorted.find((candidate) => !usedBaseDives.has(candidate.baseDive))
      || sorted[0];
    if (pick) {
      picks.push(pick);
      if (pick.group) usedGroups.add(pick.group);
      if (pick.baseDive) usedBaseDives.add(pick.baseDive);
    }
  });
  return picks;
}

function scoreSynchroPairWhatIf(picks, output) {
  const projectedScore = sum(picks.map((pick) => pick.effectiveScore));
  const projectedDd = sum(picks.map((pick) => pick.effectiveDd));
  const exactCount = picks.filter((pick) => pick.exact).length;
  const positionMismatchCount = picks.filter((pick) => pick.positionMismatch).length;
  const missingSideCount = sum(picks.map((pick) => pick.missingSideCount || 0));
  const groups = picks.map((pick) => pick.group).filter(Boolean);
  const groupCoverage = new Set(groups).size;
  const baseDives = picks.map((pick) => pick.baseDive).filter(Boolean);
  const repeatedDiveNumbers = baseDives.length - new Set(baseDives).size;
  const riskFlags = [];
  const voluntaryDdViolations = picks.filter((pick) => pick.violatesVoluntaryDd).length;
  if (positionMismatchCount) riskFlags.push(`${positionMismatchCount} position-mismatch slot${positionMismatchCount > 1 ? "s" : ""} violate or require correction for same-position synchro rules`);
  if (voluntaryDdViolations) riskFlags.push(`${voluntaryDdViolations} voluntary slot${voluntaryDdViolations > 1 ? "s" : ""} exceed the 2.0 DD limit`);
  if (missingSideCount) riskFlags.push(`${missingSideCount} athlete-side data gap${missingSideCount > 1 ? "s" : ""}: no data present`);
  if (groupCoverage < output.rule.minGroups) riskFlags.push(`Group coverage below rule model: ${groupCoverage}/${output.rule.minGroups}`);
  if (repeatedDiveNumbers) riskFlags.push("Repeated dive number selected");
  if (exactCount < Math.min(2, output.listSize)) riskFlags.push("Limited exact same-position overlap");
  return { projectedScore, projectedDd, exactCount, positionMismatchCount, missingSideCount, groupCoverage, repeatedDiveNumbers, riskFlags };
}

function synchroPairBenchmark({ gender, board, benchmarkScope, listSize }) {
  let rows = DATA.results.filter((row) => row.__gender === gender && row.__board === board && row.__isSync && !lower(row.__event).includes("mixed") && isFiniteNumber(row.__score));
  let label = `Synchronized field average, ${gender}, ${boardLabel(board)}`;
  if (benchmarkScope === "top3") {
    rows = rows.filter((row) => isFiniteNumber(row.__place) && row.__place <= 3);
    label = `Average top 3 synchro, ${gender}, ${boardLabel(board)}`;
  }
  if (!rows.length) {
    rows = DATA.results.filter((row) => row.__gender === gender && row.__board === board && isFiniteNumber(row.__score) && (!isFiniteNumber(row.__place) || row.__place <= 3));
    label = `Fallback individual top results, ${gender}, ${boardLabel(board)}`;
  }
  return { score: mean(rows.map((row) => row.__score)) || 0, dd: mean(rows.map((row) => row.__dd)) || 0, label };
}

function synchroPairChart(picks, output) {
  if (!picks.length) return "";
  const max = Math.max(1, ...picks.map((pick) => pick.effectiveScore || 0), output.benchmarkScore / Math.max(1, output.listSize));
  const bars = picks.map((pick, index) => {
    const width = normalize(pick.effectiveScore || 0, 0, max) * 100;
    return `<div class="whatif-bar-row"><span>R${index + 1}</span><div class="whatif-bar-track"><i style="width:${width}%"></i></div><strong>${formatNumber(pick.effectiveScore, 1)}</strong><em>${escapeHtml(pick.label)}; ${escapeHtml(pick.groupName)}; ${escapeHtml(pick.slotType || "")}</em></div>`;
  }).join("");
  return `<div class="whatif-chart-note">${escapeHtml(output.rule.ruleText)} Benchmark per-dive equivalent: ${formatNumber(output.benchmarkScore / Math.max(1, output.listSize), 1)}</div>${bars}`;
}



function loadVoluntaryWatchlist() {
  try {
    const saved = JSON.parse(localStorage.getItem("usadiving.voluntaryWatchlist") || "[]");
    if (Array.isArray(saved)) state.voluntaryWatchlist = unique(saved.map(clean).filter(Boolean)).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    state.voluntaryWatchlist = [];
  }
}

function saveVoluntaryWatchlist() {
  try {
    localStorage.setItem("usadiving.voluntaryWatchlist", JSON.stringify(state.voluntaryWatchlist || []));
  } catch (error) {
    // Local storage can be disabled in some locked-down environments. The in-session watchlist still works.
  }
}

function addVoluntaryWatchlistName() {
  const name = clean(els.volReportNameSearch?.value);
  if (!name) return;
  addVoluntaryNameToWatchlist(name);
  if (els.volReportNameSearch) els.volReportNameSearch.value = "";
}

function addVoluntaryNameToWatchlist(name) {
  const cleaned = clean(name);
  if (!cleaned) return;
  const existing = new Set((state.voluntaryWatchlist || []).map((item) => canonicalAthleteName(item)));
  if (!existing.has(canonicalAthleteName(cleaned))) state.voluntaryWatchlist = [...(state.voluntaryWatchlist || []), cleaned].sort((a, b) => a.localeCompare(b));
  saveVoluntaryWatchlist();
  renderVoluntaryWatchlist();
  updateVoluntaryNameOptions();
  if (state.voluntaryReportRows.length) renderVoluntaryReport();
}

function removeVoluntaryWatchlistName(name) {
  const target = canonicalAthleteName(name);
  state.voluntaryWatchlist = (state.voluntaryWatchlist || []).filter((item) => canonicalAthleteName(item) !== target);
  saveVoluntaryWatchlist();
  renderVoluntaryWatchlist();
  updateVoluntaryNameOptions();
  if (state.voluntaryReportRows.length) renderVoluntaryReport();
}

function renderVoluntaryWatchlist() {
  const container = document.getElementById("volReportWatchlist");
  if (!container) return;
  const names = state.voluntaryWatchlist || [];
  if (!names.length) {
    container.innerHTML = `<span class="help-text">No saved athletes or teams yet. Add names to narrow the report, or build with the active filters to see all matching voluntary data.</span>`;
    return;
  }
  container.innerHTML = names.map((name) => `<span class="watch-chip">${escapeHtml(name)} <button type="button" aria-label="Remove ${escapeAttr(name)}" data-vol-remove="${escapeAttr(name)}">×</button></span>`).join("") + `<button type="button" class="secondary clear-watchlist" data-vol-remove="__ALL__">Clear all</button>`;
  const clear = container.querySelector('[data-vol-remove="__ALL__"]');
  if (clear) clear.addEventListener("click", () => {
    state.voluntaryWatchlist = [];
    saveVoluntaryWatchlist();
    renderVoluntaryWatchlist();
    if (state.voluntaryReportRows.length) renderVoluntaryReport();
  }, { once: true });
}

function updateVoluntaryNameOptions() {
  if (!els.volReportNameOptions) return;
  const names = voluntaryReportNameCandidates();
  const limited = names.slice(0, 1200);
  els.volReportNameOptions.innerHTML = limited.map((name) => `<option value="${escapeAttr(name)}"></option>`).join("");
}

function voluntaryReportNameCandidates() {
  const settings = voluntaryReportSettings();
  const names = new Set();
  DATA.dives.forEach((dive) => {
    if (!passesVoluntaryReportScope(dive, settings, { ignoreSource: true })) return;
    if (!isLikelyVoluntaryDive(dive)) return;
    if (dive.__isSync) {
      names.add(dive.__athlete);
      splitTeamDiverNames(dive.__athlete).forEach((name) => names.add(name));
    } else {
      names.add(dive.__athlete);
    }
  });
  return [...names].map(clean).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function voluntaryReportSettings() {
  return {
    gender: els.volReportGender?.value || "all",
    board: els.volReportBoard?.value || "all",
    source: els.volReportSource?.value || "both",
    watchlist: state.voluntaryWatchlist || [],
  };
}

function passesVoluntaryReportScope(dive, settings = voluntaryReportSettings(), options = {}) {
  const selectedYears = selectedYearValues();
  if (selectedYears.length && !selectedYears.includes(String(dive.__year))) return false;
  const selectedMeets = selectedMeetValues();
  if (selectedMeets.length && !selectedMeets.includes(dive.__meet)) return false;
  const selectedEvents = selectedEventValues();
  if (selectedEvents.length && !selectedEvents.includes(dive.__event)) return false;
  const level = els.eventLevelFilter?.value || "all";
  if (level !== "all" && dive.__eventLevel !== level) return false;
  const ageGroup = els.ageGroupFilter?.value || "all";
  if (ageGroup !== "all" && dive.__ageGroup !== ageGroup) return false;
  const preset = els.scopePreset?.value || "all";
  if (preset !== "all") {
    const fauxRow = { __eventLevel: dive.__eventLevel, __event: dive.__event, competition_group: dive.competition_group, competition_family: dive.competition_family, __meet: dive.__meet, __ageGroup: dive.__ageGroup };
    if (!passesPreset(fauxRow, preset)) return false;
  }
  if (settings.gender !== "all" && dive.__gender !== settings.gender) return false;
  if (settings.board !== "all" && dive.__board !== settings.board) return false;
  if (!options.ignoreSource) {
    if (settings.source === "synchro" && !dive.__isSync) return false;
    if (settings.source === "individual" && dive.__isSync) return false;
  }
  if (settings.watchlist.length && !settings.watchlist.some((name) => voluntaryNameMatchesDive(dive, name))) return false;
  return true;
}

function voluntaryNameMatchesDive(dive, name) {
  const target = canonicalAthleteName(name);
  if (!target) return false;
  const direct = canonicalAthleteName(dive.__athlete) === target;
  if (direct) return true;
  const split = splitTeamDiverNames(dive.__athlete).map(canonicalAthleteName);
  if (split.includes(target)) return true;
  if (clean(name).includes("/")) {
    const targetParts = splitTeamDiverNames(name).map(canonicalAthleteName).sort().join("||");
    const diveParts = split.slice().sort().join("||");
    if (targetParts && targetParts === diveParts) return true;
  }
  return false;
}

function renderVoluntaryReport() {
  const summary = document.getElementById("volReportSummary");
  const table = document.getElementById("volReportTable");
  if (!summary || !table) return;
  const output = buildVoluntaryScoreReport();
  state.voluntaryReportRows = output.exportRows;
  if (!output.exportRows.length) {
    summary.innerHTML = "";
    table.innerHTML = emptyState("No voluntary / assigned-DD rows matched the loaded years, active filters, and saved athlete/team list. Add years, clear the watchlist, or broaden meet/event filters.");
    return;
  }
  summary.innerHTML = [
    profileCard("Report rows", formatInt(output.exportRows.length), `${formatInt(output.syncRows.length)} synchro comparison rows; ${formatInt(output.individualRows.length)} individual inventory rows`),
    profileCard("Saved focus", formatInt((state.voluntaryWatchlist || []).length), (state.voluntaryWatchlist || []).length ? "Using athlete/team watchlist" : "Using active dashboard filters"),
    profileCard("Best synchro vol", output.bestSync ? formatNumber(output.bestSync["Synchro Best Score"], 1) : "n/a", output.bestSync ? `${output.bestSync["Athlete / Team"]}; ${output.bestSync["Dive"]}` : "No synchro voluntary rows"),
    profileCard("Best individual vol", output.bestIndividual ? formatNumber(output.bestIndividual["Individual Best Score"], 1) : "n/a", output.bestIndividual ? `${output.bestIndividual["Athlete / Team"]}; ${output.bestIndividual["Dive"]}` : "No individual voluntary rows"),
    profileCard("Data flags", formatInt(output.flagCount), "No data present / pair-name gaps / no individual match"),
  ].join("");
  table.innerHTML = voluntaryReportPreviewHtml(output.exportRows);
}

function buildVoluntaryScoreReport() {
  const settings = voluntaryReportSettings();
  const scopedDives = DATA.dives.filter((dive) => passesVoluntaryReportScope(dive, settings) && isLikelyVoluntaryDive(dive) && (dive.__diveCode || canonicalDiveCode(dive.dive_number)));
  const syncRows = settings.source === "individual" ? [] : buildSynchroVoluntaryComparisonRows(scopedDives.filter((dive) => dive.__isSync), settings);
  const individualRows = settings.source === "synchro" ? [] : buildIndividualVoluntaryInventoryRows(scopedDives.filter((dive) => !dive.__isSync), settings);
  const exportRows = [...syncRows, ...individualRows];
  const bestSync = syncRows.filter((row) => isFiniteNumber(number(row["Synchro Best Score"]))).sort((a, b) => number(b["Synchro Best Score"]) - number(a["Synchro Best Score"]))[0];
  const bestIndividual = individualRows.filter((row) => isFiniteNumber(number(row["Individual Best Score"]))).sort((a, b) => number(b["Individual Best Score"]) - number(a["Individual Best Score"]))[0];
  const flagCount = exportRows.filter((row) => lower(row["Data Note"] || "").includes("no data") || lower(row["Data Note"] || "").includes("missing") || lower(row["Data Note"] || "").includes("not available")).length;
  return { exportRows, syncRows, individualRows, bestSync, bestIndividual, flagCount };
}

function buildSynchroVoluntaryComparisonRows(syncDives, settings) {
  const grouped = groupBy(syncDives, (dive) => [dive.__gender, dive.__board, normalizePairName(dive.__athlete), dive.__diveCode || canonicalDiveCode(dive.dive_number)].join("||"));
  const rows = [];
  const allSyncVols = DATA.dives.filter((dive) => dive.__isSync && isLikelyVoluntaryDive(dive));
  [...grouped.entries()].forEach(([key, dives]) => {
    const best = dives.slice().sort((a, b) => diveRank(b) - diveRank(a))[0];
    const diveCode = best.__diveCode || canonicalDiveCode(best.dive_number);
    const pairName = normalizePairName(best.__athlete);
    const names = splitTeamDiverNames(pairName);
    const first = names[0] || "";
    const second = names[1] || "";
    const indiv1 = first ? individualDiveEvidence(first, best.__board, diveCode, settings) : noIndividualEvidence();
    const indiv2 = second ? individualDiveEvidence(second, best.__board, diveCode, settings) : noIndividualEvidence();
    const top3 = mean(allSyncVols.filter((dive) => dive.__gender === best.__gender && dive.__board === best.__board && (dive.__diveCode || canonicalDiveCode(dive.dive_number)) === diveCode && isFiniteNumber(dive.__place) && dive.__place <= 3).map((dive) => dive.__score));
    const notes = [];
    if (names.length < 2) notes.push("Pair partner not available in this source row");
    if (!indiv1.count && first) notes.push(`${first}: no individual voluntary data present for this dive`);
    if (!indiv2.count && second) notes.push(`${second}: no individual voluntary data present for this dive`);
    const syncAvg = mean(dives.map((dive) => dive.__score));
    const syncDd = mean(dives.map((dive) => dive.__dd));
    rows.push({
      "Report Section": "Synchro voluntary comparison",
      "Athlete / Team": pairName,
      "Diver 1": first || "n/a",
      "Diver 2": second || "n/a",
      "Gender": best.__gender,
      "Board / Platform": boardLabel(best.__board),
      "Dive": diveCode,
      "Dive Group": best.__groupName,
      "DD": formatNumber(syncDd, 2),
      "Synchro Attempts": dives.length,
      "Synchro Avg Score": formatNumber(syncAvg, 1),
      "Synchro Best Score": formatNumber(best.__score, 1),
      "Synchro Best Net": formatNumber(scoreNet(best.__score, best.__dd), 1),
      "Synchro Best Context": voluntaryContext(best),
      "Top 3 Same-Dive Avg": formatNumber(top3, 1),
      "Diver 1 Individual Attempts": indiv1.count || "No data present",
      "Diver 1 Individual Avg": formatNumber(indiv1.avg, 1),
      "Diver 1 Individual Best": formatNumber(indiv1.bestScore, 1),
      "Diver 1 Individual Net": formatNumber(indiv1.bestNet, 1),
      "Diver 1 Individual Context": indiv1.context || "No data present",
      "Diver 2 Individual Attempts": indiv2.count || "No data present",
      "Diver 2 Individual Avg": formatNumber(indiv2.avg, 1),
      "Diver 2 Individual Best": formatNumber(indiv2.bestScore, 1),
      "Diver 2 Individual Net": formatNumber(indiv2.bestNet, 1),
      "Diver 2 Individual Context": indiv2.context || "No data present",
      "Evidence Level": names.length >= 2 && indiv1.count && indiv2.count ? "Synchro + both individual evidence" : names.length >= 2 ? "Synchro evidence; incomplete individual evidence" : "Synchro evidence; pair name incomplete",
      "Data Note": notes.join("; ") || "Matched voluntary/assigned-DD synchro row and individual comparison where available",
    });
  });
  return rows.sort((a, b) => String(a["Board / Platform"]).localeCompare(String(b["Board / Platform"])) || String(a["Athlete / Team"]).localeCompare(String(b["Athlete / Team"])) || String(a["Dive"]).localeCompare(String(b["Dive"])));
}

function buildIndividualVoluntaryInventoryRows(individualDives, settings) {
  const grouped = groupBy(individualDives, (dive) => [dive.__gender, dive.__board, dive.__athlete, dive.__diveCode || canonicalDiveCode(dive.dive_number)].join("||"));
  const allIndividualVols = DATA.dives.filter((dive) => !dive.__isSync && isLikelyVoluntaryDive(dive));
  return [...grouped.values()].map((dives) => {
    const best = dives.slice().sort((a, b) => diveRank(b) - diveRank(a))[0];
    const diveCode = best.__diveCode || canonicalDiveCode(best.dive_number);
    const avg = mean(dives.map((dive) => dive.__score));
    const avgNet = mean(dives.map((dive) => scoreNet(dive.__score, dive.__dd)));
    const top3 = mean(allIndividualVols.filter((dive) => dive.__gender === best.__gender && dive.__board === best.__board && (dive.__diveCode || canonicalDiveCode(dive.dive_number)) === diveCode && isFiniteNumber(dive.__place) && dive.__place <= 3).map((dive) => dive.__score));
    return {
      "Report Section": "Individual voluntary inventory",
      "Athlete / Team": best.__athlete,
      "Diver 1": best.__athlete,
      "Diver 2": "n/a",
      "Gender": best.__gender,
      "Board / Platform": boardLabel(best.__board),
      "Dive": diveCode,
      "Dive Group": best.__groupName,
      "DD": formatNumber(mean(dives.map((dive) => dive.__dd)), 2),
      "Individual Attempts": dives.length,
      "Individual Avg Score": formatNumber(avg, 1),
      "Individual Best Score": formatNumber(best.__score, 1),
      "Individual Best Net": formatNumber(scoreNet(best.__score, best.__dd), 1),
      "Individual Avg Net": formatNumber(avgNet, 1),
      "Individual Best Context": voluntaryContext(best),
      "Top 3 Same-Dive Avg": formatNumber(top3, 1),
      "Evidence Level": "Individual voluntary evidence",
      "Data Note": "Historical individual voluntary / assigned-DD dive evidence",
    };
  }).sort((a, b) => String(a["Athlete / Team"]).localeCompare(String(b["Athlete / Team"])) || String(a["Dive"]).localeCompare(String(b["Dive"])));
}

function normalizePairName(name) {
  return clean(name).replace(/\s*\/\s*/g, " / ");
}

function individualDiveEvidence(name, board, diveCode, settings) {
  const exactName = canonicalAthleteName(name);
  const voluntaryRows = DATA.dives.filter((dive) => !dive.__isSync && dive.__board === board && (dive.__diveCode || canonicalDiveCode(dive.dive_number)) === diveCode && canonicalAthleteName(dive.__athlete) === exactName && passesVoluntaryReportScope(dive, { ...settings, gender: "all", source: "individual", watchlist: [] }) && isLikelyVoluntaryDive(dive));
  const fallbackRows = voluntaryRows.length ? voluntaryRows : DATA.dives.filter((dive) => !dive.__isSync && dive.__board === board && (dive.__diveCode || canonicalDiveCode(dive.dive_number)) === diveCode && canonicalAthleteName(dive.__athlete) === exactName && passesVoluntaryReportScope(dive, { ...settings, gender: "all", source: "individual", watchlist: [] }));
  if (!fallbackRows.length) return noIndividualEvidence();
  const best = fallbackRows.slice().sort((a, b) => diveRank(b) - diveRank(a))[0];
  return {
    count: fallbackRows.length,
    avg: mean(fallbackRows.map((dive) => dive.__score)),
    bestScore: best.__score,
    bestNet: scoreNet(best.__score, best.__dd),
    context: voluntaryContext(best) + (voluntaryRows.length ? "" : " (same dive; not marked voluntary)"),
  };
}

function noIndividualEvidence() {
  return { count: 0, avg: null, bestScore: null, bestNet: null, context: "" };
}

function voluntaryContext(dive) {
  if (!dive) return "";
  const bits = [dive.__meet, dive.__event, dive.__year, dive.__place ? `Place ${formatPlace(dive.__place)}` : null].filter(Boolean);
  return bits.join(" | ");
}

function scoreNet(score, dd) {
  if (!isFiniteNumber(score) || !isFiniteNumber(dd) || !dd) return null;
  return score / dd;
}

function voluntaryReportPreviewHtml(rows) {
  const visible = rows.slice(0, 80);
  const headers = ["Report Section", "Athlete / Team", "Gender", "Board / Platform", "Dive", "Dive Group", "DD", "Synchro Avg Score", "Synchro Best Score", "Individual Avg Score", "Individual Best Score", "Top 3 Same-Dive Avg", "Evidence Level", "Data Note"];
  const body = visible.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`).join("")}</tr>`).join("");
  const extra = rows.length > visible.length ? `<p class="help-text">Showing first ${formatInt(visible.length)} rows. Export CSV for the full ${formatInt(rows.length)}-row report.</p>` : "";
  return extra + tableHtml(headers, body);
}

function exportVoluntaryScoreReport() {
  const built = buildVoluntaryScoreReport();
  state.voluntaryReportRows = built.exportRows;
  const fileBits = ["voluntary_score_report", selectedYearValues().join("-") || "loaded_years", (els.volReportBoard?.value || "all")].filter(Boolean).join("_").replace(/[^a-z0-9_-]+/gi, "_");
  downloadCsv(`${fileBits}.csv`, built.exportRows);
}

function exportFilteredData() {
  const rows = state.filteredRows.map((row) => ({
    athlete: row.__athlete,
    gender: row.__gender,
    meet: row.__meet,
    event: row.__event,
    board_platform: boardLabel(row.__board),
    place: row.__place,
    score: row.__score,
    dd_total: row.__dd,
    consistency_sd: row.__consistency,
    dive_count: row.__dives.length,
    synchronized: row.__isSync,
  }));
  downloadCsv("hp_filtered_data.csv", rows);
}

function exportAthleteReport() {
  const athleteName = state.selectedAthleteName;
  if (!athleteName) return setExportStatus("Search an athlete before exporting an athlete report.");
  const rows = DATA.results.filter((row) => row.__athlete === athleteName);
  const resultRows = rows.map((row) => ({
    report_section: "result",
    athlete: row.__athlete,
    meet: row.__meet,
    event: row.__event,
    gender: row.__gender,
    board_platform: boardLabel(row.__board),
    place: row.__place,
    score: row.__score,
    dd_total: row.__dd,
    consistency_sd: row.__consistency,
    strongest_group: "",
    weakest_group: "",
  }));
  const groupRows = groupStats(rows).map((stat) => ({
    report_section: "group",
    athlete: athleteName,
    meet: "",
    event: "",
    gender: "",
    board_platform: "",
    place: "",
    score: stat.avgScore,
    dd_total: stat.avgDd,
    consistency_sd: stat.sdScore,
    strongest_group: stat.name,
    weakest_group: "",
  }));
  downloadCsv(`hp_athlete_report_${slug(athleteName)}.csv`, [...resultRows, ...groupRows]);
}

function exportEventReport() {
  const rows = state.filteredRows;
  const groupRows = groupStats(rows).map((stat) => ({
    event_scope: currentEventScopeLabel(),
    dive_group: stat.name,
    dive_count: stat.count,
    avg_score: stat.avgScore,
    avg_dd: stat.avgDd,
    score_sd: stat.sdScore,
    comparison_population: comparisonLabel(),
  }));
  downloadCsv("hp_event_report.csv", groupRows);
}

function exportDdComparisonReport() {
  const athleteName = state.selectedAthleteName;
  const athleteRows = athleteName ? DATA.results.filter((row) => row.__athlete === athleteName) : [];
  const eventRows = currentEventRows();
  const cutoff = Math.max(1, Math.floor(number(els.placementCutoff.value) || 12));
  const finalists = eventRows.filter((row) => isFiniteNumber(row.__place) && row.__place <= cutoff);
  const medalists = eventRows.filter((row) => isFiniteNumber(row.__place) && row.__place <= 3);
  const rows = GROUPS.map((group) => {
    const athleteDd = groupStats(athleteRows).find((stat) => stat.code === group.code)?.avgDd;
    const fieldDd = groupStats(eventRows).find((stat) => stat.code === group.code)?.avgDd;
    const finalistDd = groupStats(finalists).find((stat) => stat.code === group.code)?.avgDd;
    const medalistDd = groupStats(medalists).find((stat) => stat.code === group.code)?.avgDd;
    return {
      dive_group: group.name,
      selected_athlete: athleteName || "",
      athlete_avg_dd: athleteDd,
      field_avg_dd: fieldDd,
      finalist_avg_dd: finalistDd,
      medalist_avg_dd: medalistDd,
      athlete_gap_vs_field: diffValues(athleteDd, fieldDd),
      athlete_gap_vs_finalist: diffValues(athleteDd, finalistDd),
      athlete_gap_vs_medalist: diffValues(athleteDd, medalistDd),
    };
  });
  downloadCsv("hp_dd_comparison_report.csv", rows);
}

function exportWeaknessReport() {
  const benchmarkByGroup = Object.fromEntries(groupStats(state.benchmarkRows).map((stat) => [stat.code, stat]));
  const rows = groupStats(state.filteredRows).map((stat) => ({
    dive_group: stat.name,
    dive_count: stat.count,
    avg_score: stat.avgScore,
    avg_dd: stat.avgDd,
    consistency_sd: stat.sdScore,
    benchmark_avg_score: benchmarkByGroup[stat.code]?.avgScore,
    score_gap_vs_benchmark: diffValues(stat.avgScore, benchmarkByGroup[stat.code]?.avgScore),
    benchmark_population: comparisonLabel(),
  }));
  downloadCsv("hp_dive_group_weakness_report.csv", rows);
}

function exportMixedTeamReport() {
  if (!state.mixedCandidates.length) state.mixedCandidates = buildMixedTeamCandidates();
  const rows = state.mixedCandidates.map((candidate, index) => ({
    rank: index + 1,
    team: candidate.teamLabel,
    divers: candidate.divers.join(" / "),
    group_coverage: candidate.groupCoverage,
    average_score: candidate.averageScore,
    average_dd: candidate.averageDd,
    total_dd: candidate.totalDd,
    dd_gap_vs_mixed_team_benchmark: candidate.ddGap,
    consistency_sd: candidate.consistency,
    strength_3m: candidate.strength3m,
    strength_10m_platform: candidate.strength10m,
    male_female_balance: candidate.balance,
    evidence_confidence: candidate.evidenceConfidence,
    evidence_summary: candidate.evidenceSummary,
    risk_flags: candidate.riskFlags.join("; "),
    round_plan: candidate.planSummary,
    note: "Candidate analysis only, not official selection.",
  }));
  downloadCsv("hp_mixed_team_candidate_report.csv", rows);
}

function currentEventRows() {
  const selectedEvents = selectedEventValues();
  const scopedRows = applyCurrentContext(DATA.results);
  if (selectedEvents.length) {
    const selectedEventSet = new Set(selectedEvents);
    return scopedRows.filter((row) => selectedEventSet.has(row.__event));
  }
  if (state.filteredRows.length) {
    const topEvent = mode(state.filteredRows.map((row) => row.__event));
    return scopedRows.filter((row) => row.__event === topEvent);
  }
  return state.filteredRows;
}

function currentEventScopeLabel() {
  const selectedEvents = selectedEventValues();
  if (selectedEvents.length === 1) return selectedEvents[0];
  if (selectedEvents.length > 1) return `${selectedEvents.length} selected events`;
  return mode(state.filteredRows.map((row) => row.__event)) || "Filtered field";
}

function selectedAthleteName(rows) {
  const query = clean(els.athleteSearch.value);
  if (query) {
    const exact = DATA.results.find((row) => lower(row.__athlete) === lower(query));
    if (exact) return exact.__athlete;
    const contains = DATA.results.find((row) => lower(row.__athlete).includes(lower(query)));
    if (contains) return contains.__athlete;
    return "";
  }
  return "";
}

function applyCurrentContext(rows, options = {}) {
  return rows.filter((row) => passesScopeFilters(row, { ignoreAthlete: true, ignoreGroup: true, ...options }));
}

function selectedYearValues() {
  if (!els.yearFilter) return [];
  return Array.from(els.yearFilter.selectedOptions || [])
    .map((option) => option.value)
    .filter((value) => value && value !== "all");
}

function selectedMeetValues() {
  if (!els.meetFilter) return [];
  return Array.from(els.meetFilter.selectedOptions || [])
    .map((option) => option.value)
    .filter((value) => value && value !== "all");
}

function selectedEventValues() {
  if (!els.eventFilter) return [];
  return Array.from(els.eventFilter.selectedOptions || [])
    .map((option) => option.value)
    .filter((value) => value && value !== "all");
}

function collectDives(rows) {
  const group = els.groupFilter.value;
  return rows.flatMap((row) => row.__dives || []).filter((dive) => group === "all" || dive.__group === group);
}

function groupStats(rows, groups = GROUPS) {
  const dives = collectDives(rows);
  return groups.map((group) => {
    const groupDives = dives.filter((dive) => dive.__group === group.code);
    const scores = groupDives.map((dive) => dive.__score).filter(isFiniteNumber);
    const dds = groupDives.map((dive) => dive.__dd).filter(isFiniteNumber);
    return {
      code: group.code,
      name: group.name,
      count: groupDives.length,
      avgScore: mean(scores),
      avgDd: mean(dds),
      sdScore: stdev(scores),
      dives: groupDives,
    };
  });
}

function heatMetric(metric, dives, benchmark) {
  if (!dives.length) return { hasData: false, label: "-", raw: null, intensityValue: null };
  const scores = dives.map((dive) => dive.__score).filter(isFiniteNumber);
  const dds = dives.map((dive) => dive.__dd).filter(isFiniteNumber);
  if (metric === "dd") {
    const value = mean(dds);
    return { hasData: true, label: formatNumber(value, 2), raw: value, intensityValue: value };
  }
  if (metric === "gap") {
    const value = mean(scores) - benchmark?.avgScore;
    return { hasData: true, label: signed(value, 1), raw: value, intensityValue: value };
  }
  if (metric === "consistency") {
    const value = stdev(scores);
    return { hasData: true, label: `SD ${formatNumber(value, 1)}`, raw: value, intensityValue: isFiniteNumber(value) ? -value : null };
  }
  if (metric === "count") {
    const value = dives.length;
    return { hasData: true, label: formatInt(value), raw: value, intensityValue: value };
  }
  const value = mean(scores);
  return { hasData: true, label: formatNumber(value, 1), raw: value, intensityValue: value };
}

function heatmapMetricLabel(metric) {
  return {
    score: "Avg score",
    dd: "Avg DD",
    gap: "Gap",
    consistency: "Consistency",
    count: "Count",
  }[metric] || "Metric";
}

function heatmapRowLabel(row, dimension) {
  if (dimension === "event") return row.__event;
  if (dimension === "meet") return row.__meet;
  if (dimension === "gender") return row.__gender;
  return row.__athlete;
}

function compareForSort(a, b, key) {
  const values = {
    athlete: [a.__athlete, b.__athlete],
    meet: [a.__meet, b.__meet],
    event: [a.__event, b.__event],
    gender: [a.__gender, b.__gender],
    board: [a.__board, b.__board],
    place: [a.__place, b.__place],
    score: [a.__score, b.__score],
    dd: [a.__dd, b.__dd],
    consistency: [a.__consistency, b.__consistency],
  }[key] || [a.__score, b.__score];
  if (typeof values[0] === "string" || typeof values[1] === "string") return String(values[0]).localeCompare(String(values[1]));
  return (values[0] ?? -Infinity) - (values[1] ?? -Infinity);
}


function collectDivesForRows(rows) {
  return (rows || []).flatMap((row) => row.__dives || []);
}

function groupStatsForRows(rows, groups = GROUPS) {
  const dives = collectDivesForRows(rows);
  return groups.map((group) => {
    const groupDives = dives.filter((dive) => dive.__group === group.code);
    const scores = groupDives.map((dive) => dive.__score).filter(isFiniteNumber);
    const dds = groupDives.map((dive) => dive.__dd).filter(isFiniteNumber);
    return {
      code: group.code,
      name: group.name,
      count: groupDives.length,
      avgScore: mean(scores),
      avgDd: mean(dds),
      sdScore: stdev(scores),
      dives: groupDives,
    };
  });
}

function bestAthleteEvent(rows) {
  const grouped = groupBy(rows.filter((row) => isFiniteNumber(row.__score)), (row) => `${row.__board}||${row.__gender}||${row.__event}`);
  return [...grouped.entries()].map(([key, eventRows]) => {
    const [board, gender, event] = key.split('||');
    return {
      label: `${gender} ${boardLabel(board)} - ${event}`,
      board,
      gender,
      event,
      count: eventRows.length,
      avgScore: mean(eventRows.map((row) => row.__score)),
      avgDd: mean(eventRows.map((row) => row.__dd)),
    };
  }).sort((a, b) => b.avgScore - a.avgScore || b.avgDd - a.avgDd)[0] || null;
}

function athletePrimaryEvents(rows) {
  const grouped = groupBy(rows, (row) => `${row.__board}||${row.__gender}`);
  return [...grouped.entries()].map(([key, eventRows]) => {
    const [board, gender] = key.split('||');
    return { board, gender, count: eventRows.length };
  }).sort((a, b) => b.count - a.count);
}

function athleteRecentSignal(rows) {
  const validRows = rows.filter((row) => isFiniteNumber(row.__score));
  if (validRows.length < 2) return { label: "Limited data", detail: "Need at least two scored results." };
  const sorted = validRows.slice().sort((a, b) => String(a.__date || a.__year || a.__meet).localeCompare(String(b.__date || b.__year || b.__meet)));
  const latestYear = sorted[sorted.length - 1].__year;
  const recentRows = sorted.filter((row) => row.__year === latestYear);
  const previousRows = sorted.filter((row) => row.__year !== latestYear);
  if (!previousRows.length) return { label: `${latestYear} only`, detail: `Avg score ${formatNumber(mean(recentRows.map((row) => row.__score)), 1)} in loaded data.` };
  const recentAvg = mean(recentRows.map((row) => row.__score));
  const previousAvg = mean(previousRows.map((row) => row.__score));
  const gap = recentAvg - previousAvg;
  return {
    label: isFiniteNumber(gap) ? signed(gap, 1) : "No trend",
    detail: `${latestYear} avg ${formatNumber(recentAvg, 1)} vs prior loaded avg ${formatNumber(previousAvg, 1)}`,
  };
}

function athleteBestDiveInventoryHtml(rows) {
  const dives = collectDivesForRows(rows).filter((dive) => dive.__diveCode || dive.dive_number);
  if (!dives.length) return emptyState("No dive-level inventory available for this athlete in the loaded data.");
  const overallScore = mean(dives.map((dive) => dive.__score).filter(isFiniteNumber));
  const byDive = groupBy(dives, (dive) => `${dive.__group || 'unknown'}||${dive.__diveCode || canonicalDiveCode(dive.dive_number)}`);
  const inventory = [...byDive.entries()].map(([key, diveRows]) => {
    const [group, diveCode] = key.split('||');
    const scores = diveRows.map((dive) => dive.__score).filter(isFiniteNumber);
    const dds = diveRows.map((dive) => dive.__dd).filter(isFiniteNumber);
    const best = diveRows.slice().sort((a, b) => (b.__score || -Infinity) - (a.__score || -Infinity))[0];
    const avgScore = mean(scores);
    const avgDd = mean(dds);
    const sd = stdev(scores);
    let tier = "Limited data";
    if (diveRows.length >= 2 && isFiniteNumber(avgScore) && avgScore >= overallScore) tier = "Proven strong";
    if (diveRows.length >= 2 && isFiniteNumber(avgDd) && avgDd >= mean(dds) && isFiniteNumber(sd) && sd > 6) tier = "High DD / inconsistent";
    if (diveRows.length >= 3 && isFiniteNumber(sd) && sd <= 4 && isFiniteNumber(avgScore) && avgScore >= overallScore) tier = "Consistent strength";
    return {
      group,
      groupName: GROUP_BY_CODE[group]?.name || "Unknown",
      diveCode,
      count: diveRows.length,
      avgScore,
      avgDd,
      bestScore: best?.__score,
      bestContext: best ? `${best.__meet} / ${best.__event}` : "Unknown context",
      sd,
      tier,
    };
  }).sort((a, b) => a.group.localeCompare(b.group) || (b.avgScore || 0) - (a.avgScore || 0));
  const bestByGroup = [];
  GROUPS.forEach((group) => {
    inventory.filter((item) => item.group === group.code).slice(0, 4).forEach((item) => bestByGroup.push(item));
  });
  const rowsHtml = bestByGroup.map((item) => `<tr>
    <td>${escapeHtml(item.groupName)}</td>
    <td><strong>${escapeHtml(item.diveCode)}</strong></td>
    <td>${formatNumber(item.avgScore, 1)}</td>
    <td>${formatNumber(item.bestScore, 1)}</td>
    <td>${formatNumber(item.avgDd, 2)}</td>
    <td>${formatInt(item.count)}</td>
    <td>${isFiniteNumber(item.sd) ? `SD ${formatNumber(item.sd, 1)}` : '-'}</td>
    <td>${escapeHtml(item.tier)}</td>
    <td>${escapeHtml(trim(item.bestContext, 74))}</td>
  </tr>`).join("");
  return tableHtml(["Group", "Dive", "Avg score", "Best score", "Avg DD", "Times", "Spread", "Signal", "Best context"], rowsHtml);
}

function athleteBenchmarkGapHtml(rows) {
  const events = groupBy(rows.filter((row) => isFiniteNumber(row.__score)), (row) => `${row.__year || 'unknown'}||${row.__board}||${row.__gender}||${row.__event}`);
  if (!events.size) return emptyState("No scored event rows available for benchmark comparison.");
  const eventModels = [...events.entries()].map(([key, athleteRows]) => {
    const [year, board, gender, event] = key.split('||');
    const peers = DATA.results.filter((row) => row.__year == year && row.__board === board && row.__gender === gender && row.__event === event && row.__athlete !== athleteRows[0].__athlete);
    const top3 = topResultRows(peers, 3);
    const benchmark = top3.length ? top3 : peers;
    const athleteAvg = mean(athleteRows.map((row) => row.__score));
    const athleteDd = mean(athleteRows.map((row) => row.__dd));
    const benchmarkAvg = mean(benchmark.map((row) => row.__score));
    const benchmarkDd = mean(benchmark.map((row) => row.__dd));
    const athleteDiveScore = mean(collectDivesForRows(athleteRows).map((dive) => dive.__score).filter(isFiniteNumber));
    const benchmarkDiveScore = mean(collectDivesForRows(benchmark).map((dive) => dive.__score).filter(isFiniteNumber));
    return {
      year,
      board,
      gender,
      event,
      rows: athleteRows.length,
      athleteAvg,
      athleteDd,
      benchmarkAvg,
      benchmarkDd,
      scoreGap: athleteAvg - benchmarkAvg,
      ddGap: athleteDd - benchmarkDd,
      diveScoreGap: athleteDiveScore - benchmarkDiveScore,
      benchmarkLabel: top3.length ? "Top 3" : "Field",
    };
  }).filter((item) => isFiniteNumber(item.athleteAvg)).sort((a, b) => String(b.year).localeCompare(String(a.year)) || Math.abs(a.scoreGap || 0) - Math.abs(b.scoreGap || 0)).slice(0, 12);
  const rowsHtml = eventModels.map((item) => `<tr>
    <td>${escapeHtml(item.year)}</td>
    <td>${escapeHtml(item.gender)}</td>
    <td>${boardLabel(item.board)}</td>
    <td>${escapeHtml(trim(item.event, 42))}</td>
    <td>${formatNumber(item.athleteAvg, 1)}</td>
    <td>${formatNumber(item.benchmarkAvg, 1)} <span class="muted">${escapeHtml(item.benchmarkLabel)}</span></td>
    <td class="${(item.scoreGap || 0) >= 0 ? 'positive-text' : 'negative-text'}">${signed(item.scoreGap, 1)}</td>
    <td class="${(item.ddGap || 0) >= 0 ? 'positive-text' : 'negative-text'}">${signed(item.ddGap, 2)}</td>
    <td class="${(item.diveScoreGap || 0) >= 0 ? 'positive-text' : 'negative-text'}">${signed(item.diveScoreGap, 1)}</td>
  </tr>`).join("");
  return tableHtml(["Year", "Gender", "Board", "Event", "Athlete score", "Benchmark", "Score gap", "DD gap", "Dive-score gap"], rowsHtml);
}

function topResultRows(rows, limit = 3) {
  return rows.slice().filter((row) => isFiniteNumber(row.__score)).sort((a, b) => {
    if (isFiniteNumber(a.__place) && isFiniteNumber(b.__place)) return a.__place - b.__place;
    return b.__score - a.__score;
  }).slice(0, limit);
}

function handleProfileAction(action, data) {
  const athlete = data.athlete || state.selectedAthleteName;
  if (!athlete) return;
  if (action === "loadSynchro") {
    renderAthleteCompatibilitySnapshot(athlete);
    return;
  }
  if (action === "prepareSynchroPair") {
    const partner = data.partner || "";
    const athleteRows = DATA.results.filter((row) => row.__athlete === athlete);
    const gender = mode(athleteRows.map((row) => row.__gender)) || els.synchroPairGender?.value || "Female";
    if (els.synchroPairGender) els.synchroPairGender.value = gender;
    populateSynchroPairControls(true);
    if (els.synchroPairDiver1) els.synchroPairDiver1.value = athlete;
    if (els.synchroPairDiver2) els.synchroPairDiver2.value = partner;
    state.synchroPairWhatIfPicks = [];
    renderSynchroPairBuilder();
    document.querySelector(".synchro-pair-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (els.individualAthleteSearch) els.individualAthleteSearch.value = athlete;
  filterIndividualAthleteDropdown();
  if (els.individualAthleteSelect && Array.from(els.individualAthleteSelect.options).some((option) => option.value === athlete)) els.individualAthleteSelect.value = athlete;
  if (els.individualListSize) {
    if (action === "build5") els.individualListSize.value = "5";
    else if (action === "build6") els.individualListSize.value = "6";
    else els.individualListSize.value = "auto";
  }
  state.individualWhatIfPicks = [];
  renderIndividualListBuilder();
  document.querySelector(".individual-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAthleteCompatibilitySnapshot(athleteName) {
  const container = document.getElementById("athleteCompatibilitySnapshot");
  if (!container) return;
  const rows = DATA.results.filter((row) => row.__athlete === athleteName);
  const gender = mode(rows.map((row) => row.__gender));
  if (!gender) {
    container.innerHTML = emptyState("No gender signal found for synchro compatibility.");
    return;
  }
  const athleteDives = athleteDiveSet(rows);
  const candidates = unique(DATA.results.filter((row) => row.__gender === gender && row.__athlete !== athleteName).map((row) => row.__athlete));
  const ranked = candidates.map((candidate) => {
    const candidateRows = DATA.results.filter((row) => row.__athlete === candidate);
    const candidateDives = athleteDiveSet(candidateRows);
    const exact = intersectionCount(athleteDives.exact, candidateDives.exact);
    const sameNumber = intersectionCount(athleteDives.numberOnly, candidateDives.numberOnly);
    const threeM = intersectionCount(athleteDives.byBoard["3m"], candidateDives.byBoard["3m"]);
    const platform = intersectionCount(athleteDives.byBoard.platform, candidateDives.byBoard.platform);
    return { candidate, exact, sameNumber, threeM, platform, score: exact * 3 + sameNumber + threeM + platform };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
  if (!ranked.length) {
    container.innerHTML = emptyState("No same-gender overlap found in the loaded data. Load additional years or narrow by board/event if needed.");
    return;
  }
  const body = ranked.map((item) => `<tr>
    <td>${escapeHtml(item.candidate)}</td>
    <td>${formatInt(item.exact)}</td>
    <td>${formatInt(item.sameNumber)}</td>
    <td>${formatInt(item.threeM)}</td>
    <td>${formatInt(item.platform)}</td>
    <td><button type="button" data-profile-action="prepareSynchroPair" data-athlete="${escapeAttr(athleteName)}" data-partner="${escapeAttr(item.candidate)}">Use pair</button></td>
  </tr>`).join("");
  container.innerHTML = `<div class="athlete-section-heading"><h4>Optional synchro compatibility snapshot</h4><p class="help-text">Loaded on demand so the diver profile stays clean. Exact overlap means same dive number and position; same-number overlap flags human-review options where positions may differ.</p></div>${tableHtml(["Potential partner", "Exact overlaps", "Same number", "3M exact", "Platform exact", "Action"], body)}`;
}

function athleteDiveSet(rows) {
  const dives = collectDivesForRows(rows);
  const exact = new Set();
  const numberOnly = new Set();
  const byBoard = { "3m": new Set(), platform: new Set(), "1m": new Set(), unknown: new Set() };
  dives.forEach((dive) => {
    const code = dive.__diveCode || canonicalDiveCode(dive.dive_number);
    if (!code) return;
    const number = code.replace(/[A-D]$/i, "");
    exact.add(code);
    numberOnly.add(number);
    if (!byBoard[dive.__board]) byBoard[dive.__board] = new Set();
    byBoard[dive.__board].add(code);
  });
  return { exact, numberOnly, byBoard };
}

function intersectionCount(a, b) {
  if (!a || !b) return 0;
  let count = 0;
  a.forEach((value) => { if (b.has(value)) count += 1; });
  return count;
}

function fillCompareControls() {
  if (!els.compareYearA || !els.compareYearB) return;
  const years = availableYears();
  const yearOptions = `<option value="all">All loaded years</option>${years.map((year) => `<option value="${escapeAttr(year)}">${escapeHtml(year)}</option>`).join("")}`;
  const currentA = els.compareYearA.value || "2023";
  const currentB = els.compareYearB.value || "2025";
  els.compareYearA.innerHTML = yearOptions;
  els.compareYearB.innerHTML = yearOptions;
  els.compareYearA.value = years.includes(currentA) ? currentA : (years.includes("2023") ? "2023" : years[1] || years[0] || "all");
  els.compareYearB.value = years.includes(currentB) ? currentB : (years.includes("2025") ? "2025" : years[0] || "all");
  const genders = unique(DATA.results.map((row) => row.__gender)).sort();
  [els.compareGenderA, els.compareGenderB].forEach((select) => {
    if (!select) return;
    const current = select.value;
    fillSelect(select, genders, "All genders");
    if (current && Array.from(select.options).some((option) => option.value === current)) select.value = current;
  });
}

async function runEvidenceComparisonWorkflow() {
  const status = document.getElementById("comparisonLoadStatus");
  const years = [els.compareYearA?.value, els.compareYearB?.value].filter((value) => value && value !== "all");
  if (status) status.textContent = years.length ? `Loading ${years.join(" and ")} data...` : "Using loaded years...";
  if (DATA_INDEX && years.length) {
    const changed = await ensureYearDataLoaded(years);
    if (changed) {
      composeLoadedData();
      normalizeData();
      fillMeetOptions();
      fillEventOptions();
      updateAthleteOptions();
      fillCompareControls();
      render();
    }
  }
  renderEvidenceComparison();
  if (status) status.textContent = "Comparison updated.";
}

function renderEvidenceComparison() {
  const output = document.getElementById("comparisonOutput");
  if (!output) return;
  const a = comparisonModel(getCompareCriteria("A"));
  const b = comparisonModel(getCompareCriteria("B"));
  if (!a.rows.length || !b.rows.length) {
    output.innerHTML = `<div class="compare-empty">${!a.rows.length ? "Comparison A has no rows. " : ""}${!b.rows.length ? "Comparison B has no rows. " : ""}Adjust year, meet/event contains text, gender, or board/platform and run again.</div>`;
    return;
  }
  const verdict = comparisonVerdict(a, b);
  output.innerHTML = `
    <div class="compare-verdict ${verdict.className}">
      <span>Claim test</span>
      <strong>${escapeHtml(verdict.label)}</strong>
      <em>${escapeHtml(verdict.detail)}</em>
    </div>
    <div class="compare-summary-grid">
      ${comparisonCardHtml("A", a)}
      ${comparisonCardHtml("B", b)}
      ${comparisonDeltaCardHtml(a, b)}
    </div>
    <div class="compare-evidence-grid">
      <div>${comparisonEvidenceHtml("Evidence that supports improvement", verdict.supporting)}</div>
      <div>${comparisonEvidenceHtml("Evidence that disputes or qualifies improvement", verdict.disputing)}</div>
    </div>
    <div class="table-wrap compact-table">${comparisonGroupTableHtml(a, b)}</div>`;
}

function getCompareCriteria(side) {
  return {
    side,
    year: els[`compareYear${side}`]?.value || "all",
    meetText: clean(els[`compareMeet${side}`]?.value),
    eventText: clean(els[`compareEvent${side}`]?.value),
    gender: els[`compareGender${side}`]?.value || "all",
    board: els[`compareBoard${side}`]?.value || "all",
  };
}

function comparisonRows(criteria) {
  const meetTokens = splitTokens(criteria.meetText);
  const eventTokens = splitTokens(criteria.eventText);
  return DATA.results.filter((row) => {
    if (criteria.year !== "all" && String(row.__year) !== String(criteria.year)) return false;
    if (criteria.gender !== "all" && row.__gender !== criteria.gender) return false;
    if (criteria.board !== "all" && row.__board !== criteria.board) return false;
    if (meetTokens.length && !meetTokens.some((token) => lower(row.__meet).includes(token))) return false;
    if (eventTokens.length && !eventTokens.some((token) => lower(row.__event).includes(token))) return false;
    return true;
  });
}

function comparisonModel(criteria) {
  const rows = comparisonRows(criteria);
  const dives = collectDivesForRows(rows);
  const scoredRows = rows.filter((row) => isFiniteNumber(row.__score));
  const top3 = topResultRows(scoredRows, 3);
  const groups = groupStatsForRows(rows).filter((stat) => stat.count > 0);
  return {
    criteria,
    rows,
    dives,
    rowCount: rows.length,
    athleteCount: unique(rows.map((row) => row.__athlete)).length,
    eventCount: unique(rows.map((row) => row.__event)).length,
    avgScore: mean(scoredRows.map((row) => row.__score)),
    top3Score: mean(top3.map((row) => row.__score)),
    avgDd: mean(scoredRows.map((row) => row.__dd)),
    top3Dd: mean(top3.map((row) => row.__dd)),
    avgDiveScore: mean(dives.map((dive) => dive.__score).filter(isFiniteNumber)),
    avgDiveDd: mean(dives.map((dive) => dive.__dd).filter(isFiniteNumber)),
    consistency: stdev(dives.map((dive) => dive.__score).filter(isFiniteNumber)),
    groups,
  };
}

function comparisonVerdict(a, b) {
  const checks = [
    { label: "top 3 score", value: b.top3Score - a.top3Score, good: 1 },
    { label: "field score", value: b.avgScore - a.avgScore, good: 1 },
    { label: "DD", value: b.avgDd - a.avgDd, good: 0.05 },
    { label: "dive-score average", value: b.avgDiveScore - a.avgDiveScore, good: 0.5 },
    { label: "consistency", value: a.consistency - b.consistency, good: 0.5 },
  ].filter((check) => isFiniteNumber(check.value));
  const supporting = checks.filter((check) => check.value >= check.good).map((check) => `${check.label}: ${signed(check.value, check.label === "DD" ? 2 : 1)}`);
  const disputing = checks.filter((check) => check.value <= -check.good).map((check) => `${check.label}: ${signed(check.value, check.label === "DD" ? 2 : 1)}`);
  let label = "Mixed / inconclusive";
  let className = "mixed";
  if (supporting.length >= 3 && disputing.length === 0) { label = "Improvement supported"; className = "supported"; }
  else if (disputing.length >= 2 && supporting.length === 0) { label = "Improvement disputed"; className = "disputed"; }
  else if (supporting.length > disputing.length) { label = "Improvement partially supported"; className = "supported"; }
  else if (disputing.length > supporting.length) { label = "Improvement mostly disputed"; className = "disputed"; }
  return {
    label,
    className,
    detail: `${compareLabel(a.criteria)} vs ${compareLabel(b.criteria)}. ${formatInt(a.rowCount)} rows in A; ${formatInt(b.rowCount)} rows in B.`,
    supporting,
    disputing: disputing.length ? disputing : ["No major disputing metric found in the selected comparison."],
  };
}

function comparisonCardHtml(label, model) {
  return `<div class="compare-card"><span>Comparison ${label}</span><strong>${escapeHtml(compareLabel(model.criteria))}</strong><em>${formatInt(model.rowCount)} rows / ${formatInt(model.athleteCount)} athletes / ${formatInt(model.eventCount)} events</em>
    <div class="compare-mini-metrics"><b>Top 3</b>${formatNumber(model.top3Score, 1)}<b>Avg score</b>${formatNumber(model.avgScore, 1)}<b>Avg DD</b>${formatNumber(model.avgDd, 2)}<b>Dive avg</b>${formatNumber(model.avgDiveScore, 1)}</div></div>`;
}

function comparisonDeltaCardHtml(a, b) {
  return `<div class="compare-card delta"><span>Difference B - A</span><strong>${signed(b.top3Score - a.top3Score, 1)} top 3 score</strong><em>${signed(b.avgDd - a.avgDd, 2)} DD; ${signed(b.avgDiveScore - a.avgDiveScore, 1)} average dive score; ${signed(a.consistency - b.consistency, 1)} consistency improvement</em></div>`;
}

function comparisonEvidenceHtml(title, items) {
  return `<div class="compare-evidence"><h4>${escapeHtml(title)}</h4><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
}

function comparisonGroupTableHtml(a, b) {
  const byA = Object.fromEntries(a.groups.map((item) => [item.code, item]));
  const byB = Object.fromEntries(b.groups.map((item) => [item.code, item]));
  const body = GROUPS.map((group) => {
    const ga = byA[group.code] || {};
    const gb = byB[group.code] || {};
    return `<tr>
      <td>${escapeHtml(group.name)}</td>
      <td>${formatNumber(ga.avgScore, 1)}</td>
      <td>${formatNumber(gb.avgScore, 1)}</td>
      <td class="${((gb.avgScore || 0) - (ga.avgScore || 0)) >= 0 ? 'positive-text' : 'negative-text'}">${signed((gb.avgScore || 0) - (ga.avgScore || 0), 1)}</td>
      <td>${formatNumber(ga.avgDd, 2)}</td>
      <td>${formatNumber(gb.avgDd, 2)}</td>
      <td class="${((gb.avgDd || 0) - (ga.avgDd || 0)) >= 0 ? 'positive-text' : 'negative-text'}">${signed((gb.avgDd || 0) - (ga.avgDd || 0), 2)}</td>
      <td>${formatInt(ga.count || 0)} / ${formatInt(gb.count || 0)}</td>
    </tr>`;
  }).join("");
  return tableHtml(["Group", "A score", "B score", "Score diff", "A DD", "B DD", "DD diff", "Dive count A/B"], body);
}

function compareLabel(criteria) {
  const bits = [criteria.year !== "all" ? criteria.year : "Loaded years", criteria.meetText || "all meets", criteria.eventText || "all events", criteria.gender !== "all" ? criteria.gender : "all genders", criteria.board !== "all" ? boardLabel(criteria.board) : "all boards"];
  return bits.filter(Boolean).join(" / ");
}

function splitTokens(text) {
  return clean(text).split(/[,;|]+/).map((part) => lower(part.trim())).filter(Boolean);
}

function profileCard(label, value, detail) {
  return `<div class="profile-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><em>${escapeHtml(detail || "")}</em></div>`;
}

function athleteCard(label, value, detail) {
  return `<div class="athlete-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><em>${escapeHtml(detail || "")}</em></div>`;
}

function tableHtml(headers, body) {
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}">No rows.</td></tr>`}</tbody></table>`;
}

function optionGroupsByCategory(candidates, selectedKey, labelFn, keyFn = (candidate) => candidate.key) {
  const grouped = new Map();
  candidates.forEach((candidate) => {
    const code = candidate.group || diveGroupCode(candidate.dive) || "unknown";
    const label = GROUP_BY_CODE[code]?.name || candidate.groupName || "Other / Unknown";
    if (!grouped.has(code)) grouped.set(code, { label, items: [] });
    grouped.get(code).items.push(candidate);
  });
  const orderedCodes = [...GROUPS.map((group) => group.code), "unknown"];
  return orderedCodes
    .filter((code) => grouped.has(code))
    .map((code) => {
      const group = grouped.get(code);
      const items = group.items
        .slice()
        .sort((a, b) => String(a.dive || a.label || "").localeCompare(String(b.dive || b.label || "")))
        .map((candidate) => {
          const key = keyFn(candidate);
          return `<option value="${escapeAttr(key)}" ${key === selectedKey ? "selected" : ""}>${escapeHtml(labelFn(candidate))}</option>`;
        })
        .join("");
      return `<optgroup label="${escapeAttr(group.label)}">${items}</optgroup>`;
    })
    .join("");
}

function fillSelect(select, values, allLabel) {
  select.innerHTML = `<option value="all">${escapeHtml(allLabel)}</option>${values
    .filter(Boolean)
    .map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`)
    .join("")}`;
}

function eventLabel(row) {
  return clean(row.event_name) || [row.event_level, row.gender, row.discipline, row.event_round || row.round_stage].map(clean).filter(Boolean).join(" ");
}

function scoreValue(row) {
  return firstNumber(row.phase_score_from_dives, row.score_for_phase_analysis, row.posted_score, row.score);
}

function ddTotalValue(row) {
  return firstNumber(row.phase_dd_sum, row.ncaa_women_springboard_5cat_dd_sum);
}

function resultKey(row) {
  return [row.meet_id, row.event_id, row.result_set_id, row.diver_id, row.sheet_key].map((value) => clean(value)).join("::");
}

function normalizeBoard(value) {
  const text = lower(value);
  if (text.includes("1m")) return "1m";
  if (text.includes("3m")) return "3m";
  if (text.includes("10m") || text.includes("platform")) return "platform";
  if (text.includes("5m") || text.includes("7.5m")) return "platform";
  return "unknown";
}

function boardLabel(board) {
  return { "1m": "1M", "3m": "3M", platform: "10M / Platform", unknown: "Unknown" }[board] || board;
}

function extractDiveCodes(value) {
  const text = clean(value).toUpperCase().replace(/\s+/g, "");
  const matches = text.match(/\d{3,4}[A-D]/g) || [];
  const uniqueCodes = [];
  matches.forEach((code) => {
    if (!uniqueCodes.includes(code)) uniqueCodes.push(code);
  });
  if (uniqueCodes.length) return uniqueCodes;
  const fallback = text.match(/\d{3,4}/);
  return fallback ? [fallback[0]] : [];
}

function canonicalDiveCode(value) {
  const codes = extractDiveCodes(value);
  if (!codes.length) return clean(value).toUpperCase().replace(/[^0-9A-D]/g, "");
  return codes[0];
}

function diveGroupCode(diveNumber) {
  const code = canonicalDiveCode(diveNumber);
  const match = code.match(/^(\d)/);
  return match && GROUP_BY_CODE[match[1]] ? match[1] : "";
}

function baseDiveNumber(diveNumber) {
  return canonicalDiveCode(diveNumber).replace(/[A-D]$/, "");
}

function divePosition(diveNumber) {
  const match = canonicalDiveCode(diveNumber).match(/([A-D])$/);
  return match ? match[1] : "";
}

function normalizeDdValue(value) {
  const parsed = number(value);
  if (!isFiniteNumber(parsed)) return null;
  const roundedOne = Math.round(parsed * 10) / 10;
  // Some synchronized source rows concatenate paired dives and produce values such as 2.002 or 3.403.
  // Keep DD lookup and rule checks stable by treating tiny thousandth noise as display/parse noise.
  if (Math.abs(parsed - roundedOne) <= 0.006) return roundedOne;
  return parsed;
}

function normalizeHeightLevel(value) {
  const text = lower(value).replace(/\s+/g, "");
  if (text.includes("7.5m") || text.includes("7½m") || text.includes("7 1/2m")) return "7.5m";
  if (text.includes("10m")) return "10m";
  if (text.includes("5m")) return "5m";
  if (text.includes("3m")) return "3m";
  if (text.includes("1m")) return "1m";
  return "unknown";
}

function optionalLabel(value) {
  const text = clean(value).toUpperCase();
  if (text === "O") return "Optional";
  if (text === "V") return "Voluntary";
  if (text === "S") return "Synchronized";
  if (text) return text;
  return "Unknown";
}

function visualGroups(rows) {
  const board = els.boardFilter.value;
  if (board === "1m" || board === "3m") return GROUPS.filter((group) => group.code !== "6");
  if (board === "platform") return GROUPS;
  const relevantRows = rows && rows.length ? rows : state.filteredRows;
  const hasPlatform = relevantRows.some((row) => row.__board === "platform" || row.__dives?.some((dive) => dive.__board === "platform"));
  return hasPlatform ? GROUPS : GROUPS.filter((group) => group.code !== "6");
}

function renderDrilldownDetail(rowIndex) {
  const container = document.getElementById("pointDetail");
  if (!container) return;
  const row = DATA.results.find((item) => item.__index === rowIndex);
  if (!row) {
    setText("drilldownContext", "Click a point");
    container.innerHTML = emptyState("Click any bubble or trend-scatter point to open athlete, event, DD, score, and dive-sheet context.");
    return;
  }
  const cutoff = Math.max(1, Math.floor(number(els.placementCutoff.value) || 12));
  const fieldRows = state.filteredRows.length ? state.filteredRows : currentEventRows();
  const finalistRows = fieldRows.filter((item) => isFiniteNumber(item.__place) && item.__place <= cutoff);
  const fieldAvg = mean(fieldRows.map((item) => item.__score));
  const finalistAvg = mean(finalistRows.map((item) => item.__score));
  const diveRows = row.__dives || [];
  const strongestDive = diveRows.filter((dive) => isFiniteNumber(dive.__score)).sort((a, b) => b.__score - a.__score)[0];
  setText("drilldownContext", `${row.__athlete} | ${formatNumber(row.__score, 1)} score | DD ${formatNumber(row.__dd, 2)}`);
  const cards = [
    detailCard("Athlete", row.__athlete, `${row.__gender}; ${boardLabel(row.__board)}`),
    detailCard("Meet", row.__meet, row.__year || ""),
    detailCard("Event", row.__event, `Place ${formatPlace(row.__place)}`),
    detailCard("Score", formatNumber(row.__score, 1), `Field gap ${signed(row.__score - fieldAvg, 1)}; finalist gap ${signed(row.__score - finalistAvg, 1)}`),
    detailCard("DD", formatNumber(row.__dd, 2), `Average dive score ${formatNumber(row.__avgDiveScore, 1)}`),
    detailCard("Highest dive", strongestDive ? (strongestDive.__diveCode || canonicalDiveCode(strongestDive.dive_number)) : "n/a", strongestDive ? `${strongestDive.__groupName}; ${formatNumber(strongestDive.__score, 1)}` : "No dive sheet")
  ].join("");
  const diveTable = diveRows.length ? tableHtml(["Order", "Dive", "Group", "DD", "Score", "Vol/Opt"], diveRows.slice().sort((a, b) => (a.__order || 0) - (b.__order || 0)).map((dive) => `<tr><td>${formatInt(dive.__order)}</td><td>${escapeHtml(dive.__diveCode || canonicalDiveCode(dive.dive_number))}</td><td>${escapeHtml(dive.__groupName)}</td><td>${formatNumber(dive.__dd, 2)}</td><td>${formatNumber(dive.__score, 1)}</td><td>${escapeHtml(dive.__optional)}</td></tr>`).join("")) : emptyState("No dive sheet context for this point.");
  container.innerHTML = `<div class="drilldown-cards">${cards}</div><div class="table-wrap mini-table">${diveTable}</div>`;
}

function detailCard(label, value, detail) {
  return `<div class="detail-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><em>${escapeHtml(detail || "")}</em></div>`;
}

function includeUsEligibleAthlete(row) {
  const nat = normalizeFederation(row.__nat || row.nat || row.country || row.federation || row.country_code || row.nationality);
  const team = normalizeFederation(row.team_name || row.__teamName);
  const athlete = clean(row.__athlete || row.diver_name);
  if (nat) return isUsFederation(nat);
  if (hasForeignFederationMarker(team)) return false;
  if (hasForeignFederationMarker(athlete)) return false;
  return true;
}

function normalizeFederation(value) {
  return clean(value).replace(/\./g, "").trim().toUpperCase();
}

function isUsFederation(value) {
  const text = normalizeFederation(value);
  return ["USA", "US", "U S A", "UNITED STATES", "UNITED STATES OF AMERICA", "USA DIVING", "UNITED STATES DIVING"].includes(text);
}

function hasForeignFederationMarker(value) {
  const text = normalizeFederation(value);
  if (!text) return false;
  const foreignCodes = new Set(["ARM","AUS","AUT","BRA","BUL","CAN","CHI","CHN","COL","CRO","CUB","CZE","DEN","DOM","EGY","ESP","FRA","GBR","GEO","GER","GRE","HKG","INA","IND","IRI","IRL","ITA","JPN","KAZ","KOR","LTU","MAC","MAS","MEX","NAB","NED","NOR","NZL","PER","PHI","POL","PRK","ROU","RSA","RUS","SGP","SRB","SUI","SWE","THA","UKR","VEN"]);
  const foreignNames = ["CHINA", "CHINESE", "CANADA", "AUSTRALIA", "GREAT BRITAIN", "JAPAN", "MEXICO", "ITALY", "GERMANY", "FRANCE", "BRAZIL", "SPAIN", "KOREA", "NETHERLANDS", "SWEDEN"];
  if (foreignCodes.has(text)) return true;
  if (/\b[A-Z]{3}\b/.test(text)) {
    const matches = text.match(/\b[A-Z]{3}\b/g) || [];
    if (matches.some((code) => foreignCodes.has(code))) return true;
  }
  return foreignNames.some((name) => text.includes(name));
}

function isTeamDiverName(name) {
  return clean(name).includes(" / ");
}

function splitTeamDiverNames(name) {
  return clean(name).split("/").map((part) => clean(part)).filter(Boolean);
}

function canonicalAthleteName(name) {
  const cleaned = clean(name).replace(/[^a-zA-Z\s'-]/g, " ").replace(/\s+/g, " ").trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length >= 2 && parts[0] === parts[0].toUpperCase() && parts.slice(1).some((part) => part !== part.toUpperCase())) {
    return [...parts.slice(1), parts[0]].join(" ").toUpperCase();
  }
  return parts.join(" ").toUpperCase();
}

function pairDiveKey(nameA, nameB, board, diveNumber) {
  const names = [canonicalAthleteName(nameA), canonicalAthleteName(nameB)].sort();
  return `${names[0]}||${names[1]}||${board}||${clean(diveNumber).toUpperCase()}`;
}

function buildSyncEvidenceMap() {
  const map = new Map();
  DATA.dives.forEach((dive) => {
    if (!dive.__isSync) return;
    if (!includeUsEligibleAthlete(dive)) return;
    const names = splitTeamDiverNames(dive.__athlete);
    if (names.length !== 2) return;
    if (!lower(`${dive.__event} ${dive.discipline || ""}`).includes("mixed")) return;
    const key = pairDiveKey(names[0], names[1], dive.__board, dive.__diveCode || canonicalDiveCode(dive.dive_number));
    setBest(map, key, {
      dive: dive.__diveCode || canonicalDiveCode(dive.dive_number),
      dd: dive.__dd,
      score: dive.__score,
      group: dive.__group,
      groupName: dive.__groupName,
      meet: dive.__meet,
      event: dive.__event,
    }, (existing, next) => diveRank(next) > diveRank(existing));
  });
  return map;
}

function voluntarySyncAssumptions(female, male, board, seen) {
  const output = [];
  const available = new Map();
  [female, male].forEach((profile) => {
    profile.bestByBoardDive[board].forEach((dive, diveNumber) => {
      if (!isLikelyVoluntaryDive(dive)) return;
      if (!available.has(diveNumber)) available.set(diveNumber, { diveNumber, femaleDive: null, maleDive: null });
      available.get(diveNumber)[profile.gender === "Female" ? "femaleDive" : "maleDive"] = dive;
    });
  });
  available.forEach((entry, diveNumber) => {
    if (seen.has(diveNumber)) return;
    const evidenceDives = [entry.femaleDive, entry.maleDive].filter(Boolean);
    if (!evidenceDives.length) return;
    const group = (entry.femaleDive || entry.maleDive).__group;
    const scoreValues = evidenceDives.map((dive) => dive.__score).filter(isFiniteNumber);
    const fallback = mean([female.boardScore[board], male.boardScore[board]]) * 0.76;
    output.push({
      role: "Mixed synchronized",
      gender: "Mixed",
      athlete: `${female.name} / ${male.name}`,
      board,
      dive: diveNumber,
      group,
      groupName: GROUP_BY_CODE[group]?.name || "Unknown",
      dd: mean(evidenceDives.map((dive) => dive.__dd)) ?? 2.0,
      score: mean(scoreValues) ?? fallback,
      projectedSync: true,
      evidenceCategory: "Voluntary assumption",
      evidenceScore: evidenceDives.length === 2 ? 60 : 45,
      evidenceNote: evidenceDives.length === 2 ? "Both athletes have voluntary/assigned-DD evidence" : "One athlete has voluntary evidence; second athlete treated as feasible assumption",
    });
  });
  return output;
}

function isLikelyVoluntaryDive(dive) {
  if (!dive) return false;
  if (["Voluntary", "Assigned", "Required"].some((label) => lower(dive.__optional).includes(lower(label)))) return true;
  return isFiniteNumber(dive.__dd) && dive.__dd <= 2.0;
}

function evidenceCategorySummary(picks) {
  const counts = groupBy(picks, (pick) => pick.evidenceCategory || (pick.missing ? "Missing" : "Unknown"));
  return [...counts.entries()].map(([label, rows]) => `${label}: ${rows.length}`).join("; ");
}

function profileStrength(profile, board) {
  const top = [...profile.bestByBoardGroup[board].values()].map((dive) => diveRank(dive));
  return mean(top) || 0;
}

function diveRank(dive) {
  return (dive.__score ?? dive.score ?? 0) + (dive.__dd ?? dive.dd ?? 0) * 8;
}

function setBest(map, key, value, isBetter) {
  if (!key) return;
  const existing = map.get(key);
  if (!existing || isBetter(existing, value)) map.set(key, value);
}

function uniqueProfiles(profiles) {
  const map = new Map();
  profiles.filter(Boolean).forEach((profile) => map.set(profile.key, profile));
  return [...map.values()];
}

function pointTitle(row) {
  return `${row.__athlete}; ${row.__meet}; ${row.__event}; score ${formatNumber(row.__score, 1)}; DD ${formatNumber(row.__dd, 2)}; place ${formatPlace(row.__place)}`;
}

function comparisonLabel() {
  return {
    full: "Full field",
    finalists: "Finalists",
    medalists: "Medalists",
    athlete: "Selected athlete",
    meet: "Selected meet",
    event: "Selected event",
    gender: "Selected gender",
  }[els.comparisonPopulation.value] || "Comparison";
}

function chartBox(points) {
  const xExtent = minMax(points.map((point) => point.x));
  const yExtent = minMax(points.map((point) => point.y));
  const xPad = Math.max(0.5, (xExtent.max - xExtent.min) * 0.08);
  const yPad = Math.max(5, (yExtent.max - yExtent.min) * 0.08);
  return {
    width: 660,
    height: 360,
    xMin: xExtent.min - xPad,
    xMax: xExtent.max + xPad,
    yMin: yExtent.min - yPad,
    yMax: yExtent.max + yPad,
  };
}

function regressionLine(points, box) {
  if (points.length < 3) return "";
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const xMean = mean(xs);
  const yMean = mean(ys);
  const numerator = sum(points.map((point) => (point.x - xMean) * (point.y - yMean)));
  const denominator = sum(points.map((point) => Math.pow(point.x - xMean, 2)));
  if (!denominator) return "";
  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;
  const x1 = box.xMin;
  const x2 = box.xMax;
  const y1 = slope * x1 + intercept;
  const y2 = slope * x2 + intercept;
  return `<line x1="${scale(x1, box.xMin, box.xMax, 56, box.width - 24)}" y1="${scale(y1, box.yMin, box.yMax, box.height - 42, 24)}" x2="${scale(x2, box.xMin, box.xMax, 56, box.width - 24)}" y2="${scale(y2, box.yMin, box.yMax, box.height - 42, 24)}" stroke="${COLORS.red}" stroke-width="3" stroke-dasharray="8 6" />`;
}

function downloadCsv(filename, rows) {
  if (!rows.length) return setExportStatus("No rows to export for the current selection.");
  const headers = unique(rows.flatMap((row) => Object.keys(row)));
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setExportStatus(`Exported ${filename}`);
}

function setExportStatus(message) {
  setText("exportStatus", message);
}

function csvCell(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function deriveYear(value) {
  const text = clean(value);
  const match = text.match(/(20\d{2}|19\d{2})/);
  return match ? match[1] : "Unknown";
}

function clean(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return String(value).trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function truthy(value) {
  if (value === true) return true;
  const text = lower(value);
  return ["true", "1", "yes", "y"].includes(text);
}

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(...values) {
  for (const value of values) {
    const parsed = number(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function mean(values) {
  const cleanValues = values.filter(isFiniteNumber);
  if (!cleanValues.length) return null;
  return sum(cleanValues) / cleanValues.length;
}

function sum(values) {
  return values.filter(isFiniteNumber).reduce((total, value) => total + value, 0);
}

function stdev(values) {
  const cleanValues = values.filter(isFiniteNumber);
  if (cleanValues.length < 2) return null;
  const avg = mean(cleanValues);
  return Math.sqrt(mean(cleanValues.map((value) => Math.pow(value - avg, 2))));
}

function quartiles(values) {
  const sorted = values.filter(isFiniteNumber).sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    q3: percentile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * p;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  if (lowerIndex === upperIndex) return sorted[lowerIndex];
  return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * (index - lowerIndex);
}

function minMax(values) {
  const cleanValues = values.filter(isFiniteNumber);
  if (!cleanValues.length) return { min: 0, max: 1 };
  const min = Math.min(...cleanValues);
  const max = Math.max(...cleanValues);
  return min === max ? { min: min - 1, max: max + 1 } : { min, max };
}

function normalize(value, min, max) {
  if (!isFiniteNumber(value) || max === min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scale(value, inMin, inMax, outMin, outMax) {
  if (!isFiniteNumber(value) || inMax === inMin) return (outMin + outMax) / 2;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function ticks(min, max, count) {
  const step = (max - min) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))];
}

function groupBy(values, keyFn) {
  const map = new Map();
  values.forEach((value) => {
    const key = keyFn(value);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  });
  return map;
}

function mode(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function formatNumber(value, digits = 1) {
  const parsed = typeof value === "number" ? value : number(value);
  if (!isFiniteNumber(parsed)) return "-";
  return Number(parsed).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatInt(value) {
  if (!isFiniteNumber(Number(value))) return "0";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function signed(value, digits = 1) {
  const parsed = typeof value === "number" ? value : number(value);
  if (!isFiniteNumber(parsed)) return "-";
  const formatted = formatNumber(Math.abs(parsed), digits);
  return parsed > 0 ? `+${formatted}` : parsed < 0 ? `-${formatted}` : formatted;
}

function diffValues(a, b) {
  return isFiniteNumber(a) && isFiniteNumber(b) ? a - b : null;
}

function formatPlace(value) {
  return isFiniteNumber(value) ? formatInt(value) : "-";
}

function trim(value, length) {
  const text = clean(value);
  return text.length > length ? `${text.slice(0, Math.max(0, length - 1))}...` : text;
}

function slug(value) {
  return lower(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "report";
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


// -----------------------------------------------------------------------------
// HPD voluntary evidence workbook + dependent comparison dropdown update
// -----------------------------------------------------------------------------
const VOL_EVENT_TYPES = {
  women_3m: { key: "women_3m", label: "Women 3M", gender: "Female", board: "3m" },
  women_10m: { key: "women_10m", label: "Women 10M", gender: "Female", board: "platform" },
  men_3m: { key: "men_3m", label: "Men 3M", gender: "Male", board: "3m" },
  men_10m: { key: "men_10m", label: "Men 10M", gender: "Male", board: "platform" },
};

function bindVoluntaryWorkbookEvents() {
  const ids = ["volReportYearScope", "volReportMode", "volReportDiver1Search", "volReportDiver2Search", "volReportPairSearch", "volReportDiveCodes"];
  ids.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener(id === "volReportDiver1Search" || id === "volReportDiver2Search" || id === "volReportPairSearch" || id === "volReportDiveCodes" ? "input" : "change", () => {
      updateVoluntaryNameOptions();
    });
  });
  document.querySelectorAll(".vol-event-type").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (state.voluntaryWorkbook) renderVoluntaryReport();
    });
  });
  const xlsxButton = document.getElementById("exportVolReportXlsx");
  if (xlsxButton) xlsxButton.addEventListener("click", exportVoluntaryEvidenceWorkbookXlsx);
}

function bindEvidenceCompareDropdowns() {
  ["A", "B"].forEach((side) => {
    ["Year", "Meet", "Event", "Gender", "Board"].forEach((field) => {
      const element = document.getElementById(`compare${field}${side}`);
      if (!element) return;
      element.addEventListener("change", async () => {
        if (field === "Year") {
          const year = element.value;
          if (DATA_INDEX && year && year !== "all") {
            const status = document.getElementById("comparisonLoadStatus");
            if (status) status.textContent = `Loading ${year} comparison options...`;
            const changed = await ensureYearDataLoaded([year]);
            if (changed) {
              composeLoadedData();
              normalizeData();
              updateAthleteOptions();
              updateVoluntaryNameOptions();
            }
            if (status) status.textContent = "Comparison options updated.";
          }
        }
        updateCompareSideOptions(side, true);
      });
    });
  });
}

function fillCompareControls() {
  if (!els.compareYearA || !els.compareYearB) return;
  const years = availableYears();
  const yearOptions = `<option value="all">All loaded years</option>${years.map((year) => `<option value="${escapeAttr(year)}">${escapeHtml(year)}</option>`).join("")}`;
  const loadedYears = DATA.meta?.loadedYears || [];
  const defaults = loadedYears.length ? loadedYears.slice().sort((a, b) => Number(a) - Number(b)) : years.slice().reverse();
  const currentA = els.compareYearA.value || defaults[0] || "all";
  const currentB = els.compareYearB.value || defaults[defaults.length - 1] || defaults[0] || "all";
  els.compareYearA.innerHTML = yearOptions;
  els.compareYearB.innerHTML = yearOptions;
  els.compareYearA.value = years.includes(String(currentA)) ? String(currentA) : (defaults[0] || years[0] || "all");
  els.compareYearB.value = years.includes(String(currentB)) ? String(currentB) : (defaults[defaults.length - 1] || years[0] || "all");
  const genders = unique(DATA.results.map((row) => row.__gender)).sort();
  [els.compareGenderA, els.compareGenderB].forEach((select) => {
    if (!select) return;
    const current = select.value;
    fillSelect(select, genders, "All genders");
    if (current && Array.from(select.options).some((option) => option.value === current)) select.value = current;
  });
  updateCompareSideOptions("A", true);
  updateCompareSideOptions("B", true);
}

function updateCompareSideOptions(side, preserve = true) {
  const yearSelect = els[`compareYear${side}`];
  const meetSelect = els[`compareMeet${side}`];
  const eventSelect = els[`compareEvent${side}`];
  const genderSelect = els[`compareGender${side}`];
  const boardSelect = els[`compareBoard${side}`];
  if (!yearSelect || !meetSelect || !eventSelect) return;
  const currentMeet = preserve ? meetSelect.value : "all";
  const currentEvent = preserve ? eventSelect.value : "all";
  const year = yearSelect.value || "all";
  const gender = genderSelect?.value || "all";
  const board = boardSelect?.value || "all";
  const rowsForMeets = DATA.results.filter((row) => {
    if (year !== "all" && String(row.__year) !== String(year)) return false;
    if (gender !== "all" && row.__gender !== gender) return false;
    if (board !== "all" && row.__board !== board) return false;
    return true;
  });
  const meets = unique(rowsForMeets.map((row) => row.__meet)).sort((a, b) => a.localeCompare(b));
  fillSelect(meetSelect, meets, "All meets");
  if (currentMeet && Array.from(meetSelect.options).some((option) => option.value === currentMeet)) meetSelect.value = currentMeet;
  const selectedMeet = meetSelect.value || "all";
  const rowsForEvents = rowsForMeets.filter((row) => selectedMeet === "all" || row.__meet === selectedMeet);
  const events = unique(rowsForEvents.map((row) => row.__event)).sort((a, b) => a.localeCompare(b));
  fillSelect(eventSelect, events, "All events");
  if (currentEvent && Array.from(eventSelect.options).some((option) => option.value === currentEvent)) eventSelect.value = currentEvent;
}

function getCompareCriteria(side) {
  return {
    side,
    year: els[`compareYear${side}`]?.value || "all",
    meetText: "",
    eventText: "",
    meet: els[`compareMeet${side}`]?.value || "all",
    event: els[`compareEvent${side}`]?.value || "all",
    gender: els[`compareGender${side}`]?.value || "all",
    board: els[`compareBoard${side}`]?.value || "all",
  };
}

function comparisonRows(criteria) {
  return DATA.results.filter((row) => {
    if (criteria.year !== "all" && String(row.__year) !== String(criteria.year)) return false;
    if (criteria.gender !== "all" && row.__gender !== criteria.gender) return false;
    if (criteria.board !== "all" && row.__board !== criteria.board) return false;
    if (criteria.meet && criteria.meet !== "all" && row.__meet !== criteria.meet) return false;
    if (criteria.event && criteria.event !== "all" && row.__event !== criteria.event) return false;
    return true;
  });
}

function compareLabel(criteria) {
  const bits = [criteria.year !== "all" ? criteria.year : "Loaded years", criteria.meet && criteria.meet !== "all" ? criteria.meet : "all meets", criteria.event && criteria.event !== "all" ? criteria.event : "all events", criteria.gender !== "all" ? criteria.gender : "all genders", criteria.board !== "all" ? boardLabel(criteria.board) : "all boards"];
  return bits.filter(Boolean).join(" / ");
}

function voluntaryReportSettings() {
  const selectedEventTypes = Array.from(document.querySelectorAll(".vol-event-type:checked")).map((item) => item.value).filter((key) => VOL_EVENT_TYPES[key]);
  return {
    eventTypes: selectedEventTypes.length ? selectedEventTypes : Object.keys(VOL_EVENT_TYPES),
    yearScope: document.getElementById("volReportYearScope")?.value || "loaded",
    mode: document.getElementById("volReportMode")?.value || "manual_pair",
    diver1: clean(document.getElementById("volReportDiver1Search")?.value),
    diver2: clean(document.getElementById("volReportDiver2Search")?.value),
    pairName: clean(document.getElementById("volReportPairSearch")?.value),
    diveCodes: splitDiveCodeInput(document.getElementById("volReportDiveCodes")?.value),
    watchlist: state.voluntaryWatchlist || [],
  };
}

function splitDiveCodeInput(value) {
  return unique(clean(value).toUpperCase().split(/[\s,;|]+/).map(canonicalDiveCode).filter(Boolean));
}

function voluntaryReportYearValues(settings) {
  const available = availableYears().map(String);
  if (settings.yearScope === "all") return available;
  if (settings.yearScope === "recent") return ["2026", "2025", "2024"].filter((year) => available.includes(year));
  const loaded = DATA.meta?.loadedYears?.map(String) || [];
  return loaded.length ? loaded : selectedYearValues();
}

async function ensureVoluntaryReportDataLoaded(settings) {
  if (!DATA_INDEX) return;
  const years = voluntaryReportYearValues(settings);
  const changed = await ensureYearDataLoaded(years);
  if (changed) {
    composeLoadedData();
    normalizeData();
    updateAthleteOptions();
    updateVoluntaryNameOptions();
    fillCompareControls();
  }
}

function updateVoluntaryNameOptions() {
  const options = document.getElementById("volReportNameOptions");
  if (!options) return;
  const names = new Set();
  DATA.results.forEach((row) => {
    if (row.__athlete) names.add(row.__athlete);
  });
  DATA.dives.forEach((dive) => {
    if (dive.__athlete) names.add(dive.__athlete);
    splitTeamDiverNames(dive.__athlete).forEach((name) => names.add(name));
  });
  const sorted = [...names].filter(Boolean).sort((a, b) => a.localeCompare(b)).slice(0, 2000);
  options.innerHTML = sorted.map((name) => `<option value="${escapeAttr(name)}"></option>`).join("");
}

function samePerson(a, b) {
  if (!clean(a) || !clean(b)) return false;
  return canonicalAthleteName(a) === canonicalAthleteName(b) || nameTokenKey(a) === nameTokenKey(b);
}

function nameTokenKey(name) {
  return clean(name).replace(/[^a-zA-Z\s'-]/g, " ").split(/\s+/).filter(Boolean).map((token) => token.toUpperCase()).sort().join("|");
}

async function renderVoluntaryReport() {
  const summary = document.getElementById("volReportSummary");
  const table = document.getElementById("volReportTable");
  const settings = voluntaryReportSettings();
  if (summary) summary.innerHTML = `<div class="summary-card"><span>Building report</span><strong>Loading selected history</strong><em>This report ignores main dashboard presets.</em></div>`;
  await ensureVoluntaryReportDataLoaded(settings);
  const workbook = buildVoluntaryEvidenceWorkbook(settings);
  state.voluntaryWorkbook = workbook;
  state.voluntaryReportRows = workbook.flatRows;
  renderVoluntaryWorkbookPreview(workbook);
  if (summary) {
    const rows = workbook.flatRows.length;
    const exactPairRows = workbook.flatRows.filter((row) => row.evidence_level === "Pair evidence").length;
    const noData = workbook.flatRows.filter((row) => /No data/i.test(row.data_notes || "")).length;
    summary.innerHTML = `
      <div class="summary-card"><span>Workbook tabs</span><strong>${formatInt(workbook.sheets.length)}</strong><em>${workbook.sheets.map((sheet) => sheet.name).join(", ")}</em></div>
      <div class="summary-card"><span>Evidence rows</span><strong>${formatInt(rows)}</strong><em>Readable table rows prepared for CSV/XLSX</em></div>
      <div class="summary-card"><span>Pair evidence rows</span><strong>${formatInt(exactPairRows)}</strong><em>Exact synchro pair voluntary scores</em></div>
      <div class="summary-card"><span>No-data flags</span><strong>${formatInt(noData)}</strong><em>Shown as no data present, not estimated</em></div>`;
  }
  return workbook;
}

function voluntaryReportSubjects(settings) {
  const pairFromSearch = settings.pairName && splitTeamDiverNames(settings.pairName).length >= 2 ? splitTeamDiverNames(settings.pairName).slice(0, 2) : [];
  if (settings.mode === "watchlist") {
    return (settings.watchlist || []).map((name) => ({ type: "individual", label: name, diver1: name, diver2: "" }));
  }
  if (settings.mode === "individual") {
    const name = settings.diver1 || settings.watchlist[0] || "";
    return name ? [{ type: "individual", label: name, diver1: name, diver2: "" }] : [];
  }
  const diver1 = pairFromSearch[0] || settings.diver1;
  const diver2 = pairFromSearch[1] || settings.diver2;
  if (diver1 && diver2) return [{ type: settings.mode === "actual_pair" ? "actual_pair" : "manual_pair", label: `${diver1} / ${diver2}`, diver1, diver2 }];
  if (diver1) return [{ type: "individual", label: diver1, diver1, diver2: "" }];
  return [];
}

function buildVoluntaryEvidenceWorkbook(settings = voluntaryReportSettings()) {
  const subjects = voluntaryReportSubjects(settings);
  const years = voluntaryReportYearValues(settings);
  const sheets = settings.eventTypes.map((key) => buildVoluntaryEventSheet(VOL_EVENT_TYPES[key], subjects, settings, years));
  const flatRows = sheets.flatMap((sheet) => sheet.flatRows);
  return { settings, years, sheets, flatRows, builtAt: new Date().toISOString() };
}

function buildVoluntaryEventSheet(config, subjects, settings, years) {
  const rows = [];
  const flatRows = [];
  rows.push([config.label, "Voluntary Evidence Workbook", "", "", "", ""]);
  rows.push(["Year scope", years.join(", "), "Mode", settings.mode, "Built", new Date().toLocaleString()]);
  rows.push([]);
  if (!subjects.length) {
    rows.push(["No athlete or pair selected", "Type Diver 1 and optionally Diver 2, or use the saved watchlist."]);
    return { name: config.label, rows, html: emptyState("No athlete or pair selected."), flatRows };
  }
  const htmlBlocks = [];
  subjects.forEach((subject) => {
    const diveCodes = settings.diveCodes.length ? settings.diveCodes : autoVoluntaryDiveCodes(subject, config, years);
    const normalizedCodes = diveCodes.length ? diveCodes : commonFieldVoluntaryCodes(config, years).slice(0, 3);
    const block = buildVoluntarySubjectBlock(subject, config, normalizedCodes, years);
    rows.push([subject.label, ...normalizedCodes, "Total", "Overall Score", "Place", "Evidence"]);
    block.syncRows.forEach((item) => {
      rows.push([item.context, ...normalizedCodes.map((code) => item.diveScores[code] ?? ""), item.total || "", item.overallScore || "", item.place || "", item.evidenceLevel]);
      flatRows.push(...voluntaryFlatRowsForSync(item, subject, config, normalizedCodes));
    });
    if (!block.syncRows.length) {
      rows.push(["No exact pair synchro data present", ...normalizedCodes.map(() => ""), "", "", "", subject.type === "individual" ? "Individual-only report" : "No pair evidence"]);
      flatRows.push({ event_tab: config.label, report_subject: subject.label, section: "synchro_voluntary", athlete_or_pair: subject.label, data_notes: subject.type === "individual" ? "Individual-only report; no synchro pair requested." : "No exact pair synchro data present." });
    }
    rows.push([]);
    rows.push(["Individual evidence", "Dive", "Best score", "Average score", "Times", "Best context", "Net", "Evidence level", "Notes"]);
    block.individualRows.forEach((item) => {
      rows.push([item.diver, item.diveCode, item.bestScore || item.status, item.avgScore || "", item.count || "", item.bestContext || "", item.net || "", item.evidenceLevel, item.notes]);
      flatRows.push(voluntaryFlatRowForIndividual(item, subject, config));
    });
    rows.push([]);
    htmlBlocks.push(voluntarySubjectBlockHtml(subject, config, normalizedCodes, block));
  });
  return { name: config.label, rows, flatRows, html: htmlBlocks.join("") };
}

function autoVoluntaryDiveCodes(subject, config, years) {
  const candidates = new Map();
  const add = (code, weight) => {
    code = canonicalDiveCode(code);
    if (!code) return;
    candidates.set(code, (candidates.get(code) || 0) + weight);
  };
  const relevantSync = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && isLikelyVoluntaryDive(dive));
  relevantSync.forEach((dive) => {
    const names = splitTeamDiverNames(dive.__athlete);
    if (subject.type !== "individual" && names.some((name) => samePerson(name, subject.diver1)) && names.some((name) => samePerson(name, subject.diver2))) add(dive.__diveCode, 20);
    if (subject.type !== "individual" && (names.some((name) => samePerson(name, subject.diver1)) || names.some((name) => samePerson(name, subject.diver2)))) add(dive.__diveCode, 8);
  });
  DATA.dives.forEach((dive) => {
    if (!voluntaryDiveEventMatch(dive, config, years) || dive.__isSync || !isLikelyVoluntaryDive(dive)) return;
    if (samePerson(dive.__athlete, subject.diver1)) add(dive.__diveCode, 10);
    if (subject.diver2 && samePerson(dive.__athlete, subject.diver2)) add(dive.__diveCode, 10);
  });
  if (!candidates.size) commonFieldVoluntaryCodes(config, years).forEach((code) => add(code, 1));
  return [...candidates.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code]) => code).slice(0, 4);
}

function commonFieldVoluntaryCodes(config, years) {
  const counts = new Map();
  DATA.dives.forEach((dive) => {
    if (!voluntaryDiveEventMatch(dive, config, years) || !isLikelyVoluntaryDive(dive)) return;
    const code = dive.__diveCode || canonicalDiveCode(dive.dive_number);
    if (code) counts.set(code, (counts.get(code) || 0) + 1);
  });
  const ddCandidates = ddTableCandidatesForBoard(config.board).filter((item) => item.dd <= 2.0 && (config.board !== "platform" || item.heightLevel === "10m"));
  ddCandidates.forEach((item) => counts.set(item.dive, counts.get(item.dive) || 0.1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code]) => code);
}

function voluntaryDiveEventMatch(dive, config, years) {
  if (!dive) return false;
  if (years.length && !years.includes(String(dive.__year))) return false;
  if (dive.__gender !== config.gender) return false;
  if (dive.__board !== config.board) return false;
  return Boolean(dive.__diveCode || canonicalDiveCode(dive.dive_number));
}

function buildVoluntarySubjectBlock(subject, config, diveCodes, years) {
  const syncRows = subject.type === "individual" ? [] : buildSubjectSyncRows(subject, config, diveCodes, years);
  const individualRows = [];
  [subject.diver1, subject.diver2].filter(Boolean).forEach((diver) => {
    diveCodes.forEach((code) => individualRows.push(individualEvidenceForDive(diver, code, config, years, subject)));
  });
  return { syncRows, individualRows };
}

function buildSubjectSyncRows(subject, config, diveCodes, years) {
  const rows = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && isLikelyVoluntaryDive(dive) && diveCodes.includes(dive.__diveCode)).filter((dive) => {
    const names = splitTeamDiverNames(dive.__athlete);
    return names.some((name) => samePerson(name, subject.diver1)) && names.some((name) => samePerson(name, subject.diver2));
  });
  const bySession = groupBy(rows, (dive) => `${dive.__year}||${dive.__meet}||${dive.__event}||${dive.round_stage || dive.event_round || ""}||${dive.__key}`);
  return [...bySession.entries()].map(([key, dives]) => {
    const diveScores = {};
    diveCodes.forEach((code) => {
      const match = dives.filter((dive) => dive.__diveCode === code).sort((a, b) => (b.__score || 0) - (a.__score || 0))[0];
      if (match) diveScores[code] = match.__score;
    });
    const sample = dives[0] || {};
    const result = DATA.results.find((row) => row.__key === sample.__key);
    return {
      context: [sample.__year, sample.__meet, sample.round_stage || sample.event_round || sample.__event].filter(Boolean).join(" - "),
      meet: sample.__meet,
      event: sample.__event,
      year: sample.__year,
      scores: dives.map((dive) => dive.__score).filter(isFiniteNumber),
      diveScores,
      total: sum(Object.values(diveScores).filter(isFiniteNumber)),
      overallScore: result?.__score,
      place: result?.__place,
      evidenceLevel: "Pair evidence",
    };
  }).sort((a, b) => String(a.year).localeCompare(String(b.year)) || a.context.localeCompare(b.context));
}

function individualEvidenceForDive(diver, code, config, years, subject) {
  const individual = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && !dive.__isSync && samePerson(dive.__athlete, diver) && dive.__diveCode === code);
  const syncOther = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && dive.__diveCode === code && splitTeamDiverNames(dive.__athlete).some((name) => samePerson(name, diver)));
  const all = individual.length ? individual : syncOther;
  if (!all.length) {
    return { diver, diveCode: code, status: "No data present", avgScore: null, bestScore: null, count: 0, bestContext: "", net: null, evidenceLevel: "No data present", notes: "No matching individual or synchro-with-other-partner evidence found in selected history." };
  }
  const best = all.slice().sort((a, b) => (b.__score || 0) - (a.__score || 0))[0];
  const dd = lookupOfficialDd(code, config.board, config.board === "platform" ? "10m" : config.board) || best.__dd;
  const evidenceLevel = individual.length ? "Individual evidence" : "Synchro with other partner";
  return {
    diver,
    diveCode: code,
    status: "",
    avgScore: mean(all.map((dive) => dive.__score)),
    bestScore: best.__score,
    count: all.length,
    bestContext: [best.__year, best.__meet, best.__event, best.round_stage || best.event_round].filter(Boolean).join(" - "),
    net: isFiniteNumber(best.__score) && isFiniteNumber(dd) && dd ? best.__score / dd : null,
    evidenceLevel,
    notes: individual.length ? `${individual.length} individual record(s)` : `${syncOther.length} synchro-with-other-partner record(s)`
  };
}

function voluntaryFlatRowsForSync(item, subject, config, diveCodes) {
  return diveCodes.map((code) => ({
    event_tab: config.label,
    report_subject: subject.label,
    section: "synchro_voluntary",
    athlete_or_pair: subject.label,
    diver_1: subject.diver1,
    diver_2: subject.diver2,
    board_platform: boardLabel(config.board),
    dive: code,
    dd: lookupOfficialDd(code, config.board, config.board === "platform" ? "10m" : config.board),
    score: item.diveScores[code] ?? "No data present",
    total_voluntary_score: item.total,
    overall_score: item.overallScore,
    place: item.place,
    best_context: item.context,
    evidence_level: item.diveScores[code] ? item.evidenceLevel : "No data present",
    data_notes: item.diveScores[code] ? "Exact pair synchro voluntary evidence." : "No data present for this dive in this session.",
  }));
}

function voluntaryFlatRowForIndividual(item, subject, config) {
  return {
    event_tab: config.label,
    report_subject: subject.label,
    section: "individual_evidence",
    athlete_or_pair: item.diver,
    diver_1: subject.diver1,
    diver_2: subject.diver2,
    board_platform: boardLabel(config.board),
    dive: item.diveCode,
    dd: lookupOfficialDd(item.diveCode, config.board, config.board === "platform" ? "10m" : config.board),
    best_score: item.bestScore || item.status,
    average_score: item.avgScore,
    times_competed: item.count,
    net_score: item.net,
    best_context: item.bestContext,
    evidence_level: item.evidenceLevel,
    data_notes: item.notes,
  };
}

function voluntarySubjectBlockHtml(subject, config, diveCodes, block) {
  const syncHeader = ["Meet / session", ...diveCodes, "Total", "Overall", "Place", "Evidence"];
  const syncBody = block.syncRows.length ? block.syncRows.map((row) => `<tr><td>${escapeHtml(row.context)}</td>${diveCodes.map((code) => `<td>${formatNumber(row.diveScores[code], 1)}</td>`).join("")}<td>${formatNumber(row.total, 1)}</td><td>${formatNumber(row.overallScore, 1)}</td><td>${formatPlace(row.place)}</td><td>${escapeHtml(row.evidenceLevel)}</td></tr>`).join("") : `<tr><td>No exact pair synchro data present</td>${diveCodes.map(() => "<td>No data present</td>").join("")}<td></td><td></td><td></td><td>${subject.type === "individual" ? "Individual-only" : "No pair evidence"}</td></tr>`;
  const indBody = block.individualRows.map((row) => `<tr><td>${escapeHtml(row.diver)}</td><td>${escapeHtml(row.diveCode)}</td><td>${row.status ? escapeHtml(row.status) : formatNumber(row.bestScore, 1)}</td><td>${formatNumber(row.avgScore, 1)}</td><td>${formatInt(row.count)}</td><td>${escapeHtml(row.bestContext || "")}</td><td>${formatNumber(row.net, 1)}</td><td>${escapeHtml(row.evidenceLevel)}</td><td>${escapeHtml(row.notes || "")}</td></tr>`).join("");
  return `<section class="vol-workbook-block">
    <header><div><p class="eyebrow">${escapeHtml(config.label)}</p><h4>${escapeHtml(subject.label)}</h4></div><span class="panel-chip">${escapeHtml(subject.type.replace(/_/g, " "))}</span></header>
    <div class="table-wrap workbook-table">${tableHtml(syncHeader, syncBody)}</div>
    <div class="table-wrap workbook-table compact-table">${tableHtml(["Individual", "Dive", "Best score", "Average", "Times", "Best context", "Net", "Evidence", "Notes"], indBody)}</div>
  </section>`;
}

function renderVoluntaryWorkbookPreview(workbook) {
  const table = document.getElementById("volReportTable");
  if (!table) return;
  if (!workbook.sheets.length) {
    table.innerHTML = emptyState("No event tabs selected.");
    return;
  }
  table.innerHTML = workbook.sheets.map((sheet) => `<details class="vol-workbook-sheet" open><summary>${escapeHtml(sheet.name)} <span>${formatInt(sheet.flatRows.length)} evidence rows</span></summary>${sheet.html}</details>`).join("");
}

function exportVoluntaryScoreReport() {
  const workbook = state.voluntaryWorkbook || buildVoluntaryEvidenceWorkbook();
  if (!workbook.flatRows.length) return setExportStatus("No voluntary evidence rows to export. Build the in-app workbook first or select athletes/pairs.");
  downloadCsv("hpd_voluntary_evidence_report.csv", workbook.flatRows);
}

async function exportVoluntaryEvidenceWorkbookXlsx() {
  const workbook = state.voluntaryWorkbook || await renderVoluntaryReport();
  if (!workbook || !workbook.sheets || !workbook.sheets.length) return setExportStatus("No workbook sheets to export.");
  const sheets = workbook.sheets.map((sheet) => ({ name: sheet.name, rows: sheet.rows }));
  const blob = createXlsxBlob(sheets);
  downloadBlob("hpd_voluntary_evidence_workbook.xlsx", blob);
  setExportStatus("Exported hpd_voluntary_evidence_workbook.xlsx");
}

function createXlsxBlob(sheets) {
  const safeSheets = sheets.map((sheet, index) => ({
    name: sanitizeSheetName(sheet.name || `Sheet ${index + 1}`),
    rows: sheet.rows && sheet.rows.length ? sheet.rows : [["No data"]],
  }));
  const files = {};
  files["[Content_Types].xml"] = xlsxContentTypes(safeSheets.length);
  files["_rels/.rels"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  files["xl/workbook.xml"] = xlsxWorkbookXml(safeSheets);
  files["xl/_rels/workbook.xml.rels"] = xlsxWorkbookRels(safeSheets.length);
  files["xl/styles.xml"] = xlsxStylesXml();
  safeSheets.forEach((sheet, idx) => { files[`xl/worksheets/sheet${idx + 1}.xml`] = xlsxWorksheetXml(sheet.rows); });
  return new Blob([zipStoreFiles(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function sanitizeSheetName(name) {
  return clean(name).replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Sheet";
}

function xlsxContentTypes(count) {
  const sheets = Array.from({ length: count }, (_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets}</Types>`;
}

function xlsxWorkbookXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, i) => `<sheet name="${xmlAttr(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
}

function xlsxWorkbookRels(count) {
  const rels = Array.from({ length: count }, (_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}<Relationship Id="rId${count + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function xlsxStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF171F69"/><sz val="12"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF171F69"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9E2EC"/></left><right style="thin"><color rgb="FFD9E2EC"/></right><top style="thin"><color rgb="FFD9E2EC"/></top><bottom style="thin"><color rgb="FFD9E2EC"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

function xlsxWorksheetXml(rows) {
  const maxCols = Math.max(1, ...rows.map((row) => row.length));
  const cols = Array.from({ length: maxCols }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${i === 0 ? 28 : i < 8 ? 18 : 14}" customWidth="1"/>`).join("");
  const sheetData = rows.map((row, rIdx) => `<row r="${rIdx + 1}">${row.map((value, cIdx) => xlsxCell(value, rIdx, cIdx)).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${sheetData}</sheetData></worksheet>`;
}

function xlsxCell(value, rIdx, cIdx) {
  const ref = `${columnName(cIdx + 1)}${rIdx + 1}`;
  const isHeader = rIdx === 0 || (Array.isArray(value) && false);
  const style = rIdx === 0 ? 1 : (cIdx === 0 && value && typeof value === "string" && !String(value).match(/^\d/)) ? 2 : 0;
  if (value === null || value === undefined || value === "") return `<c r="${ref}" s="${style}"/>`;
  if (typeof value === "number" && isFinite(value)) return `<c r="${ref}" s="${style || 3}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t>${xmlText(String(value))}</t></is></c>`;
}

function columnName(n) {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function xmlText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function xmlAttr(value) {
  return xmlText(value).replace(/"/g, "&quot;");
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function zipStoreFiles(files) {
  const encoder = new TextEncoder();
  const entries = [];
  let offset = 0;
  const localParts = [];
  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = typeof content === "string" ? encoder.encode(content) : content;
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    localParts.push(local, data);
    entries.push({ nameBytes, data, crc, offset });
    offset += local.length + data.length;
  });
  const centralParts = [];
  let centralSize = 0;
  entries.forEach((entry) => {
    const central = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(central.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.data.length, true);
    view.setUint32(24, entry.data.length, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.offset, true);
    central.set(entry.nameBytes, 46);
    centralParts.push(central);
    centralSize += central.length;
  });
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let pos = 0;
  [...localParts, ...centralParts, end].forEach((part) => { out.set(part, pos); pos += part.length; });
  return out;
}

function crc32(data) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = Array.from({ length: 256 }, (_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
      return c >>> 0;
    });
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

// Start the app only after all constants and functions are defined.
init().catch((error) => {
  console.error(error);
  const target = document.getElementById("decisionSummary") || document.body;
  target.innerHTML = `<div class="empty-state">Unable to load the selected data: ${escapeHtml(error.message || error)}</div>`;
});

// -----------------------------------------------------------------------------
// Gold standard HPD voluntary evidence builder update
// Accuracy-first matching, compact UI, source drilldown, and workbook preview/export parity.
// -----------------------------------------------------------------------------
function splitTeamDiverNames(name) {
  return clean(name)
    .replace(/\s*&\s*/g, " / ")
    .replace(/\s+and\s+/gi, " / ")
    .split("/")
    .map((part) => clean(part).replace(/\b(USA|UNITED STATES|CHN|CHINA|GBR|CAN|MEX|AUS|JPN|KOR|ITA|GER|FRA|ESP|BRA|UKR|ROC)\b/gi, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function canonicalAthleteName(name) {
  const cleaned = clean(name).replace(/\([^)]*\)/g, " ").replace(/[^a-zA-Z\s'-]/g, " ").replace(/\s+/g, " ").trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length >= 2 && parts[0] === parts[0].toUpperCase() && parts.slice(1).some((part) => part !== part.toUpperCase())) {
    return [...parts.slice(1), parts[0]].join(" ").toUpperCase();
  }
  return parts.join(" ").toUpperCase();
}

function personNamePartsForKeys(name) {
  const cleaned = clean(name).replace(/\([^)]*\)/g, " ").replace(/[^a-zA-Z\s'-]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.split(" ").filter(Boolean).filter((part) => !/^(USA|UNITED|STATES|CHN|CHINA|GBR|CAN|MEX|AUS|JPN|KOR)$/i.test(part));
}

function personNameKeys(name) {
  const parts = personNamePartsForKeys(name);
  const keys = new Set();
  if (!parts.length) return keys;
  const addOrdered = (ordered) => {
    const cleanParts = ordered.map((part) => part.toUpperCase()).filter(Boolean);
    if (!cleanParts.length) return;
    keys.add(`FULL:${cleanParts.join(" ")}`);
    keys.add(`TOKENS:${cleanParts.slice().sort().join("|")}`);
    const first = cleanParts[0];
    const last = cleanParts[cleanParts.length - 1];
    if (first && last && last.length >= 2) keys.add(`LAST_INIT:${last}|${first[0]}`);
    if (cleanParts.length >= 3) {
      const lastTwo = cleanParts.slice(-2).join(" ");
      keys.add(`LAST_INIT:${lastTwo}|${first[0]}`);
    }
  };
  addOrdered(parts);
  if (parts.length === 2 && parts[0].length > 1 && parts[1].length > 1) addOrdered([parts[1], parts[0]]);
  const canonical = canonicalAthleteName(name);
  if (canonical) {
    keys.add(`CANON:${canonical}`);
    const canonicalParts = canonical.split(" ").filter(Boolean);
    addOrdered(canonicalParts);
  }
  return keys;
}

function samePerson(a, b) {
  if (!clean(a) || !clean(b)) return false;
  const aKeys = personNameKeys(a);
  const bKeys = personNameKeys(b);
  for (const key of aKeys) {
    if (bKeys.has(key)) return true;
  }
  return false;
}

function samePairName(pairName, diver1, diver2) {
  const names = splitTeamDiverNames(pairName);
  if (names.length < 2) return false;
  return names.some((name) => samePerson(name, diver1)) && names.some((name) => samePerson(name, diver2));
}

function displayNameFromData(input) {
  const query = clean(input);
  if (!query) return "";
  const candidates = [];
  DATA.results.forEach((row) => {
    splitTeamDiverNames(row.__athlete).forEach((name) => { if (samePerson(name, query)) candidates.push(name); });
    if (samePerson(row.__athlete, query)) candidates.push(row.__athlete);
  });
  DATA.dives.forEach((dive) => {
    splitTeamDiverNames(dive.__athlete).forEach((name) => { if (samePerson(name, query)) candidates.push(name); });
    if (samePerson(dive.__athlete, query)) candidates.push(dive.__athlete);
  });
  const cleaned = unique(candidates.map((name) => clean(name)).filter(Boolean));
  if (!cleaned.length) return query;
  return cleaned.sort((a, b) => scoreDisplayName(b, query) - scoreDisplayName(a, query) || a.localeCompare(b))[0];
}

function scoreDisplayName(name, query) {
  let score = 0;
  if (clean(name).includes("/")) score -= 4;
  if (canonicalAthleteName(name) === canonicalAthleteName(query)) score += 10;
  if (name === name.toUpperCase()) score -= 2;
  const parts = personNamePartsForKeys(name);
  if (parts.length === 2) score += 3;
  if (/[a-z]/.test(name)) score += 2;
  return score;
}

function isLikelyVoluntaryDive(dive) {
  if (!dive) return false;
  const label = lower(dive.__optional || dive.optional_voluntary || "");
  if (["voluntary", "assigned", "required", "v"].some((term) => label === term || label.includes(term))) return true;
  if (dive.__isSync && isFiniteNumber(dive.__order) && dive.__order <= 2) return true;
  return isFiniteNumber(dive.__dd) && dive.__dd <= 2.0001;
}

function voluntaryReportSubjects(settings) {
  const pairFromSearch = settings.pairName && splitTeamDiverNames(settings.pairName).length >= 2 ? splitTeamDiverNames(settings.pairName).slice(0, 2) : [];
  const mkSubject = (type, diver1, diver2 = "") => {
    const d1 = displayNameFromData(diver1) || diver1;
    const d2 = displayNameFromData(diver2) || diver2;
    return { type, label: d2 ? `${d1} / ${d2}` : d1, diver1: d1, diver2: d2 };
  };
  if (settings.mode === "watchlist") {
    return (settings.watchlist || []).map((name) => mkSubject("individual", name));
  }
  if (settings.mode === "individual") {
    const name = settings.diver1 || settings.watchlist[0] || "";
    return name ? [mkSubject("individual", name)] : [];
  }
  const diver1 = pairFromSearch[0] || settings.diver1;
  const diver2 = pairFromSearch[1] || settings.diver2;
  if (diver1 && diver2) return [mkSubject(settings.mode === "actual_pair" ? "actual_pair" : "manual_pair", diver1, diver2)];
  if (diver1) return [mkSubject("individual", diver1)];
  return [];
}

function registerVoluntarySource(detail) {
  if (!state.voluntaryEvidenceSources) state.voluntaryEvidenceSources = new Map();
  state.voluntaryEvidenceSourceCounter = (state.voluntaryEvidenceSourceCounter || 0) + 1;
  const id = `volsrc_${state.voluntaryEvidenceSourceCounter}`;
  state.voluntaryEvidenceSources.set(id, detail || {});
  return id;
}

function sourceDetailFromDive(dive, extra = {}) {
  if (!dive) return { ...extra, note: extra.note || "No data present" };
  return {
    athlete: dive.__athlete,
    meet: dive.__meet,
    year: dive.__year,
    event: dive.__event,
    round: dive.round_stage || dive.event_round || dive.__optional || "",
    dive: dive.__diveCode || canonicalDiveCode(dive.dive_number),
    group: dive.__groupName,
    dd: dive.__dd,
    score: dive.__score,
    net: scoreNet(dive.__score, dive.__dd),
    place: dive.__place,
    board: boardLabel(dive.__board),
    source: dive.source_system || dive.competition_family || "Dive data",
    ...extra,
  };
}

function sourceButton(value, detail, label = null) {
  if (!isFiniteNumber(value)) return escapeHtml(label || value || "No data present");
  const id = registerVoluntarySource(detail);
  return `<button type="button" class="score-evidence-btn" data-vol-source="${escapeAttr(id)}">${escapeHtml(label || formatNumber(value, 1))}</button>`;
}

function renderVoluntaryReportMatchQuality(workbook) {
  const panel = document.getElementById("volReportEvidenceQuality");
  if (!panel) return;
  if (!workbook || !workbook.flatRows) {
    panel.innerHTML = "";
    return;
  }
  const rows = workbook.flatRows || [];
  const pairRows = rows.filter((row) => row.evidence_level === "Pair evidence").length;
  const individualRows = rows.filter((row) => String(row.section).includes("individual")).length;
  const noData = rows.filter((row) => /No data present/i.test(row.data_notes || row.score || row.best_score || "")).length;
  const mergedNames = workbook.matchSummary?.mergedNameForms || 0;
  const exactSources = rows.filter((row) => row.source_meet || row.best_context).length;
  const details = (workbook.matchSummary?.notes || []).slice(0, 8).map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  panel.innerHTML = `
    <div class="evidence-quality-grid">
      <div class="evidence-quality-card"><span>Pair evidence</span><strong>${formatInt(pairRows)}</strong><em>Exact pair voluntary cells found</em></div>
      <div class="evidence-quality-card"><span>Individual evidence</span><strong>${formatInt(individualRows)}</strong><em>Best/average source rows attached</em></div>
      <div class="evidence-quality-card"><span>Auto-merged names</span><strong>${formatInt(mergedNames)}</strong><em>Name variants are combined automatically</em></div>
      <div class="evidence-quality-card"><span>Source drilldowns</span><strong>${formatInt(exactSources)}</strong><em>Clickable scores show their source</em></div>
      <div class="evidence-quality-card"><span>No-data cells</span><strong>${formatInt(noData)}</strong><em>Only where no evidence exists in loaded history</em></div>
    </div>
    <details class="match-review-details"><summary>Matching coverage details</summary><ul>${details || "<li>Names are matched by exact form, reversed World Aquatics form, and first-initial/last-name variants.</li>"}</ul></details>`;
}

function renderVoluntaryReport() {
  const summary = document.getElementById("volReportSummary");
  const table = document.getElementById("volReportTable");
  const settings = voluntaryReportSettings();
  if (summary) summary.innerHTML = `<div class="summary-card"><span>Building report</span><strong>Loading selected history</strong><em>This report searches independently from the main dashboard.</em></div>`;
  const promise = (async () => {
    await ensureVoluntaryReportDataLoaded(settings);
    state.voluntaryEvidenceSources = new Map();
    state.voluntaryEvidenceSourceCounter = 0;
    const workbook = buildVoluntaryEvidenceWorkbook(settings);
    state.voluntaryWorkbook = workbook;
    state.voluntaryReportRows = workbook.flatRows;
    renderVoluntaryWorkbookPreview(workbook);
    renderVoluntaryReportMatchQuality(workbook);
    if (summary) {
      const rows = workbook.flatRows.length;
      const exactPairRows = workbook.flatRows.filter((row) => row.evidence_level === "Pair evidence").length;
      const noData = workbook.flatRows.filter((row) => /No data/i.test(row.data_notes || "") || row.score === "No data present" || row.best_score === "No data present").length;
      summary.innerHTML = `
        <div class="summary-card"><span>Workbook tabs</span><strong>${formatInt(workbook.sheets.length)}</strong><em>${workbook.sheets.map((sheet) => sheet.name).join(", ")}</em></div>
        <div class="summary-card"><span>Evidence rows</span><strong>${formatInt(rows)}</strong><em>Same data shown in-app and exported</em></div>
        <div class="summary-card"><span>Pair evidence rows</span><strong>${formatInt(exactPairRows)}</strong><em>Exact synchro pair voluntary scores</em></div>
        <div class="summary-card"><span>No-data cells</span><strong>${formatInt(noData)}</strong><em>No guessing; data missing only after matching pass</em></div>`;
    }
    return workbook;
  })();
  return promise;
}

function buildVoluntaryEvidenceWorkbook(settings = voluntaryReportSettings()) {
  const subjects = voluntaryReportSubjects(settings);
  const years = voluntaryReportYearValues(settings);
  const matchSummary = buildVoluntaryMatchSummary(subjects, settings, years);
  const sheets = settings.eventTypes.map((key) => buildVoluntaryEventSheet(VOL_EVENT_TYPES[key], subjects, settings, years, matchSummary));
  const flatRows = sheets.flatMap((sheet) => sheet.flatRows);
  return { settings, years, sheets, flatRows, matchSummary, builtAt: new Date().toISOString() };
}

function buildVoluntaryMatchSummary(subjects, settings, years) {
  const notes = [];
  const nameForms = new Map();
  subjects.forEach((subject) => {
    [subject.diver1, subject.diver2].filter(Boolean).forEach((name) => {
      const forms = collectNameForms(name, years);
      nameForms.set(name, forms);
      if (forms.length > 1) notes.push(`${name}: combined ${forms.length} name form${forms.length === 1 ? "" : "s"} (${forms.slice(0, 4).join("; ")}${forms.length > 4 ? "; ..." : ""}).`);
    });
  });
  if (!notes.length && subjects.length) notes.push("Selected athlete names were matched without needing visible alias correction.");
  if (!subjects.length) notes.push("No athlete or pair selected yet. Type names and build the workbook to run matching.");
  return { mergedNameForms: [...nameForms.values()].reduce((acc, forms) => acc + Math.max(0, forms.length - 1), 0), nameForms, notes };
}

function collectNameForms(name, years) {
  const forms = new Set();
  const consider = (candidate, rowYear) => {
    if (years.length && rowYear && !years.includes(String(rowYear))) return;
    if (samePerson(candidate, name)) forms.add(clean(candidate));
  };
  DATA.results.forEach((row) => {
    consider(row.__athlete, row.__year);
    splitTeamDiverNames(row.__athlete).forEach((part) => consider(part, row.__year));
  });
  DATA.dives.forEach((dive) => {
    consider(dive.__athlete, dive.__year);
    splitTeamDiverNames(dive.__athlete).forEach((part) => consider(part, dive.__year));
  });
  return [...forms].filter(Boolean).sort((a, b) => scoreDisplayName(b, name) - scoreDisplayName(a, name) || a.localeCompare(b));
}

function buildVoluntaryEventSheet(config, subjects, settings, years, matchSummary = null) {
  const rows = [];
  const flatRows = [];
  rows.push([config.label, "Voluntary Evidence Workbook", "", "", "", ""]);
  rows.push(["Year scope", years.join(", "), "Mode", settings.mode, "Built", new Date().toLocaleString()]);
  rows.push(["Matching", "Name forms are combined automatically using exact, reversed, and first-initial/last-name matching."]);
  rows.push([]);
  if (!subjects.length) {
    rows.push(["No athlete or pair selected", "Type Diver 1 and optionally Diver 2, or use the saved watchlist."]);
    return { name: config.label, rows, html: emptyState("No athlete or pair selected."), flatRows };
  }
  const htmlBlocks = [];
  subjects.forEach((subject) => {
    const diveCodes = settings.diveCodes.length ? settings.diveCodes : autoVoluntaryDiveCodes(subject, config, years);
    const normalizedCodes = diveCodes.length ? diveCodes : commonFieldVoluntaryCodes(config, years).slice(0, 3);
    const block = buildVoluntarySubjectBlock(subject, config, normalizedCodes, years);
    rows.push([subject.label, ...normalizedCodes, "Total", "Overall Score", "Place", "Evidence"]);
    block.syncRows.forEach((item) => {
      rows.push([item.context, ...normalizedCodes.map((code) => item.diveScores[code] ?? "No data present"), item.total || "", item.overallScore || "", item.place || "", item.evidenceLevel]);
      flatRows.push(...voluntaryFlatRowsForSync(item, subject, config, normalizedCodes));
    });
    if (!block.syncRows.length) {
      rows.push(["No exact pair synchro data present", ...normalizedCodes.map(() => "No data present"), "", "", "", subject.type === "individual" ? "Individual-only report" : "No pair evidence"]);
      flatRows.push({ event_tab: config.label, report_subject: subject.label, section: "synchro_voluntary", athlete_or_pair: subject.label, diver_1: subject.diver1, diver_2: subject.diver2, data_notes: subject.type === "individual" ? "Individual-only report; no synchro pair requested." : "No exact pair synchro voluntary rows found after automatic name matching." });
    }
    rows.push([]);
    rows.push(["Individual evidence", "Dive", "Best score", "Average score", "Times", "Best context", "Net", "Evidence level", "Notes"]);
    block.individualRows.forEach((item) => {
      rows.push([item.diver, item.diveCode, isFiniteNumber(item.bestScore) ? item.bestScore : item.status, item.avgScore || "", item.count || "", item.bestContext || "", item.net || "", item.evidenceLevel, item.notes]);
      flatRows.push(voluntaryFlatRowForIndividual(item, subject, config));
    });
    rows.push([]);
    htmlBlocks.push(voluntarySubjectBlockHtml(subject, config, normalizedCodes, block));
  });
  return { name: config.label, rows, flatRows, html: htmlBlocks.join("") };
}

function autoVoluntaryDiveCodes(subject, config, years) {
  const candidates = new Map();
  const add = (code, weight) => {
    code = canonicalDiveCode(code);
    if (!code) return;
    candidates.set(code, (candidates.get(code) || 0) + weight);
  };
  const relevantSync = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && isLikelyVoluntaryDive(dive));
  relevantSync.forEach((dive) => {
    const names = splitTeamDiverNames(dive.__athlete);
    if (subject.type !== "individual" && names.some((name) => samePerson(name, subject.diver1)) && names.some((name) => samePerson(name, subject.diver2))) add(dive.__diveCode, 50);
    else if (subject.type !== "individual" && (names.some((name) => samePerson(name, subject.diver1)) || names.some((name) => samePerson(name, subject.diver2)))) add(dive.__diveCode, 12);
    if (subject.type === "individual" && names.some((name) => samePerson(name, subject.diver1))) add(dive.__diveCode, 10);
  });
  const relevantIndividual = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && !dive.__isSync && isLikelyVoluntaryDive(dive));
  relevantIndividual.forEach((dive) => {
    if (samePerson(dive.__athlete, subject.diver1)) add(dive.__diveCode, 20);
    if (subject.diver2 && samePerson(dive.__athlete, subject.diver2)) add(dive.__diveCode, 20);
  });
  return [...candidates.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code]) => code).slice(0, 6);
}

function buildSubjectSyncRows(subject, config, diveCodes, years) {
  const rows = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && isLikelyVoluntaryDive(dive) && diveCodes.includes(dive.__diveCode)).filter((dive) => {
    return subject.type !== "individual" && samePairName(dive.__athlete, subject.diver1, subject.diver2);
  });
  const bySession = groupBy(rows, (dive) => `${dive.__key || ""}||${dive.__year || ""}||${dive.__meet || ""}||${dive.__event || ""}||${dive.round_stage || dive.event_round || ""}`);
  return [...bySession.entries()].map(([key, dives]) => {
    const diveScores = {};
    const sourceByDive = {};
    diveCodes.forEach((code) => {
      const match = dives.filter((dive) => dive.__diveCode === code).sort((a, b) => (b.__score || 0) - (a.__score || 0))[0];
      if (match) {
        diveScores[code] = match.__score;
        sourceByDive[code] = sourceDetailFromDive(match, { evidence: "Exact pair voluntary evidence", pair: subject.label });
      }
    });
    const sample = dives[0] || {};
    const result = DATA.results.find((row) => row.__key === sample.__key) || DATA.results.find((row) => row.__isSync && row.__year === sample.__year && row.__board === sample.__board && samePairName(row.__athlete, subject.diver1, subject.diver2) && (!sample.__event || row.__event === sample.__event));
    return {
      context: [sample.__year, sample.__meet, sample.round_stage || sample.event_round || sample.__event].filter(Boolean).join(" - "),
      meet: sample.__meet,
      event: sample.__event,
      year: sample.__year,
      scores: dives.map((dive) => dive.__score).filter(isFiniteNumber),
      diveScores,
      sourceByDive,
      total: sum(Object.values(diveScores).filter(isFiniteNumber)),
      overallScore: result?.__score,
      place: result?.__place,
      evidenceLevel: "Pair evidence",
      result,
    };
  }).sort((a, b) => String(a.year).localeCompare(String(b.year)) || a.context.localeCompare(b.context));
}

function individualEvidenceForDive(diver, code, config, years, subject) {
  const individual = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && !dive.__isSync && samePerson(dive.__athlete, diver) && dive.__diveCode === code);
  const syncOther = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && dive.__diveCode === code && splitTeamDiverNames(dive.__athlete).some((name) => samePerson(name, diver)) && !(subject?.diver2 && samePairName(dive.__athlete, subject.diver1, subject.diver2)));
  const all = individual.length ? individual : syncOther;
  if (!all.length) {
    return { diver, diveCode: code, status: "No data present", avgScore: null, bestScore: null, count: 0, bestContext: "", net: null, evidenceLevel: "No data present", notes: "No matching individual or synchro-with-other-partner evidence found in selected history.", source: null };
  }
  const best = all.slice().sort((a, b) => (b.__score || 0) - (a.__score || 0))[0];
  const dd = lookupOfficialDd(code, config.board, config.board === "platform" ? "10m" : config.board) || best.__dd;
  const evidenceLevel = individual.length ? "Individual evidence" : "Synchro with other partner";
  return {
    diver,
    diveCode: code,
    status: "",
    avgScore: mean(all.map((dive) => dive.__score)),
    bestScore: best.__score,
    count: all.length,
    bestContext: [best.__year, best.__meet, best.__event, best.round_stage || best.event_round].filter(Boolean).join(" - "),
    net: isFiniteNumber(best.__score) && isFiniteNumber(dd) && dd ? best.__score / dd : null,
    evidenceLevel,
    notes: individual.length ? `${individual.length} individual record(s), merged across name variants` : `${syncOther.length} synchro-with-other-partner record(s), merged across name variants`,
    source: sourceDetailFromDive(best, { evidence: evidenceLevel, selectedDiver: diver, matchedName: best.__athlete }),
  };
}

function voluntaryFlatRowsForSync(item, subject, config, diveCodes) {
  return diveCodes.map((code) => {
    const detail = item.sourceByDive?.[code] || {};
    return {
      event_tab: config.label,
      report_subject: subject.label,
      section: "synchro_voluntary",
      athlete_or_pair: subject.label,
      diver_1: subject.diver1,
      diver_2: subject.diver2,
      board_platform: boardLabel(config.board),
      dive: code,
      dd: lookupOfficialDd(code, config.board, config.board === "platform" ? "10m" : config.board),
      score: item.diveScores[code] ?? "No data present",
      total_voluntary_score: item.total,
      overall_score: item.overallScore,
      place: item.place,
      best_context: item.context,
      source_meet: detail.meet,
      source_event: detail.event,
      source_year: detail.year,
      source_round: detail.round,
      evidence_level: item.diveScores[code] !== undefined ? item.evidenceLevel : "No data present",
      data_notes: item.diveScores[code] !== undefined ? "Exact pair synchro voluntary evidence. Click the score in the app to inspect source." : "No data present for this dive in this session.",
    };
  });
}

function voluntaryFlatRowForIndividual(item, subject, config) {
  return {
    event_tab: config.label,
    report_subject: subject.label,
    section: "individual_evidence",
    athlete_or_pair: item.diver,
    diver_1: subject.diver1,
    diver_2: subject.diver2,
    board_platform: boardLabel(config.board),
    dive: item.diveCode,
    dd: lookupOfficialDd(item.diveCode, config.board, config.board === "platform" ? "10m" : config.board),
    best_score: isFiniteNumber(item.bestScore) ? item.bestScore : item.status,
    average_score: item.avgScore,
    times_competed: item.count,
    net_score: item.net,
    best_context: item.bestContext,
    source_meet: item.source?.meet,
    source_event: item.source?.event,
    source_year: item.source?.year,
    source_round: item.source?.round,
    evidence_level: item.evidenceLevel,
    data_notes: item.notes,
  };
}

function voluntarySubjectBlockHtml(subject, config, diveCodes, block) {
  const syncHeader = ["Meet / session", ...diveCodes, "Total", "Overall", "Place", "Evidence"];
  const syncBody = block.syncRows.length ? block.syncRows.map((row) => `<tr><td>${escapeHtml(row.context)}</td>${diveCodes.map((code) => `<td>${row.diveScores[code] !== undefined ? sourceButton(row.diveScores[code], row.sourceByDive?.[code], formatNumber(row.diveScores[code], 1)) : "No data present"}</td>`).join("")}<td>${formatNumber(row.total, 1)}</td><td>${formatNumber(row.overallScore, 1)}</td><td>${formatPlace(row.place)}</td><td>${escapeHtml(row.evidenceLevel)}</td></tr>`).join("") : `<tr><td>No exact pair synchro data present</td>${diveCodes.map(() => "<td>No data present</td>").join("")}<td></td><td></td><td></td><td>${subject.type === "individual" ? "Individual-only" : "No pair evidence"}</td></tr>`;
  const indBody = block.individualRows.map((row) => `<tr><td>${escapeHtml(row.diver)}</td><td>${escapeHtml(row.diveCode)}</td><td>${row.status ? escapeHtml(row.status) : sourceButton(row.bestScore, row.source, formatNumber(row.bestScore, 1))}</td><td>${formatNumber(row.avgScore, 1)}</td><td>${formatInt(row.count)}</td><td>${escapeHtml(row.bestContext || "")}</td><td>${formatNumber(row.net, 1)}</td><td>${escapeHtml(row.evidenceLevel)}</td><td>${escapeHtml(row.notes || "")}</td></tr>`).join("");
  return `<section class="vol-workbook-block">
    <header><div><p class="eyebrow">${escapeHtml(config.label)}</p><h4>${escapeHtml(subject.label)}</h4></div><span class="panel-chip">${escapeHtml(subject.type.replace(/_/g, " "))}</span></header>
    <div class="table-wrap workbook-table">${tableHtml(syncHeader, syncBody)}</div>
    <div class="table-wrap workbook-table compact-table">${tableHtml(["Individual", "Dive", "Best score", "Average", "Times", "Best context", "Net", "Evidence", "Notes"], indBody)}</div>
  </section>`;
}

function renderVoluntaryWorkbookPreview(workbook) {
  const table = document.getElementById("volReportTable");
  const detail = document.getElementById("volReportSourceDetail");
  if (detail) detail.innerHTML = "";
  if (!table) return;
  if (!workbook.sheets.length) {
    table.innerHTML = emptyState("No event tabs selected.");
    return;
  }
  table.innerHTML = workbook.sheets.map((sheet) => `<details class="vol-workbook-sheet" open><summary>${escapeHtml(sheet.name)} <span>${formatInt(sheet.flatRows.length)} evidence rows</span></summary>${sheet.html}</details>`).join("");
  table.querySelectorAll("[data-vol-source]").forEach((button) => {
    button.addEventListener("click", () => showVoluntarySourceDetail(button.dataset.volSource));
  });
}

function showVoluntarySourceDetail(id) {
  const panel = document.getElementById("volReportSourceDetail");
  if (!panel) return;
  const detail = state.voluntaryEvidenceSources?.get(id);
  if (!detail) {
    panel.innerHTML = "";
    return;
  }
  const fields = [
    ["Evidence", detail.evidence], ["Athlete / pair", detail.athlete || detail.pair], ["Selected diver", detail.selectedDiver], ["Matched name", detail.matchedName], ["Meet", detail.meet], ["Year", detail.year], ["Event", detail.event], ["Round", detail.round], ["Board", detail.board], ["Dive", detail.dive], ["Group", detail.group], ["DD", formatNumber(detail.dd, 2)], ["Score", formatNumber(detail.score, 1)], ["Net", formatNumber(detail.net, 1)], ["Place", formatPlace(detail.place)], ["Source", detail.source]
  ].filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "-");
  panel.innerHTML = `<h4>Source evidence</h4><div class="source-detail-grid">${fields.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>`;
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function xlsxWorksheetXml(rows) {
  const maxCols = Math.max(1, ...rows.map((row) => row.length));
  const cols = Array.from({ length: maxCols }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${i === 0 ? 34 : i < 8 ? 18 : 15}" customWidth="1"/>`).join("");
  const sheetData = rows.map((row, rIdx) => `<row r="${rIdx + 1}">${row.map((value, cIdx) => xlsxCell(value, rIdx, cIdx)).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${sheetData}</sheetData><autoFilter ref="A4:${columnName(maxCols)}${Math.max(4, rows.length)}"/></worksheet>`;
}

function exportVoluntaryScoreReport() {
  const buildOrUse = state.voluntaryWorkbook ? Promise.resolve(state.voluntaryWorkbook) : renderVoluntaryReport();
  Promise.resolve(buildOrUse).then((workbook) => {
    if (!workbook.flatRows.length) return setExportStatus("No voluntary evidence rows to export. Build the in-app workbook first or select athletes/pairs.");
    downloadCsv("hpd_voluntary_evidence_report.csv", workbook.flatRows);
    setExportStatus("Exported hpd_voluntary_evidence_report.csv");
  });
}

async function exportVoluntaryEvidenceWorkbookXlsx() {
  const workbook = state.voluntaryWorkbook || await renderVoluntaryReport();
  if (!workbook || !workbook.sheets || !workbook.sheets.length) return setExportStatus("No workbook sheets to export.");
  const sheets = workbook.sheets.map((sheet) => ({ name: sheet.name, rows: sheet.rows }));
  const blob = createXlsxBlob(sheets);
  downloadBlob("hpd_voluntary_evidence_workbook.xlsx", blob);
  setExportStatus("Exported hpd_voluntary_evidence_workbook.xlsx");
}

// Include single-side synchronized source rows for manual pairs when DiveMeets supplies a synchro sheet under only one athlete name.
function buildSubjectSyncRows(subject, config, diveCodes, years) {
  if (subject.type === "individual") return [];
  const allRows = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && isLikelyVoluntaryDive(dive) && diveCodes.includes(dive.__diveCode));
  const selectedRows = allRows.map((dive) => {
    const names = splitTeamDiverNames(dive.__athlete);
    const exactPair = names.length >= 2 && names.some((name) => samePerson(name, subject.diver1)) && names.some((name) => samePerson(name, subject.diver2));
    const side1 = names.some((name) => samePerson(name, subject.diver1)) || samePerson(dive.__athlete, subject.diver1);
    const side2 = names.some((name) => samePerson(name, subject.diver2)) || samePerson(dive.__athlete, subject.diver2);
    const singleSide = names.length < 2 && (side1 || side2);
    if (!exactPair && !singleSide) return null;
    return {
      dive,
      evidenceLevel: exactPair ? "Pair evidence" : "Single-side synchro evidence",
      sourceSide: exactPair ? subject.label : (side1 ? subject.diver1 : subject.diver2),
      sourceNote: exactPair ? "Exact pair name found in source." : "Synchronized row found for one selected diver; partner was not included in the source row.",
    };
  }).filter(Boolean);
  const bySession = groupBy(selectedRows, (item) => {
    const dive = item.dive;
    const sourceKey = item.evidenceLevel === "Pair evidence" ? "PAIR" : `SINGLE:${canonicalAthleteName(item.sourceSide)}`;
    return `${sourceKey}||${dive.__key || ""}||${dive.__year || ""}||${dive.__meet || ""}||${dive.__event || ""}||${dive.round_stage || dive.event_round || ""}`;
  });
  return [...bySession.entries()].map(([key, items]) => {
    const dives = items.map((item) => item.dive);
    const sampleItem = items[0] || {};
    const sample = sampleItem.dive || {};
    const diveScores = {};
    const sourceByDive = {};
    diveCodes.forEach((code) => {
      const matchItem = items.filter((item) => item.dive.__diveCode === code).sort((a, b) => (b.dive.__score || 0) - (a.dive.__score || 0))[0];
      if (matchItem) {
        diveScores[code] = matchItem.dive.__score;
        sourceByDive[code] = sourceDetailFromDive(matchItem.dive, { evidence: matchItem.evidenceLevel, pair: subject.label, sourceSide: matchItem.sourceSide, note: matchItem.sourceNote });
      }
    });
    const result = DATA.results.find((row) => row.__key === sample.__key) || DATA.results.find((row) => row.__isSync && row.__year === sample.__year && row.__board === sample.__board && (samePairName(row.__athlete, subject.diver1, subject.diver2) || samePerson(row.__athlete, sampleItem.sourceSide)) && (!sample.__event || row.__event === sample.__event));
    const evidenceLevel = items.some((item) => item.evidenceLevel === "Pair evidence") ? "Pair evidence" : "Single-side synchro evidence";
    const sideNote = evidenceLevel === "Pair evidence" ? "" : ` (${sampleItem.sourceSide}; partner not shown in source row)`;
    return {
      context: [sample.__year, sample.__meet, sample.round_stage || sample.event_round || sample.__event].filter(Boolean).join(" - ") + sideNote,
      meet: sample.__meet,
      event: sample.__event,
      year: sample.__year,
      scores: dives.map((dive) => dive.__score).filter(isFiniteNumber),
      diveScores,
      sourceByDive,
      total: sum(Object.values(diveScores).filter(isFiniteNumber)),
      overallScore: result?.__score,
      place: result?.__place,
      evidenceLevel,
      result,
    };
  }).sort((a, b) => String(a.year).localeCompare(String(b.year)) || a.context.localeCompare(b.context));
}


// -----------------------------------------------------------------------------
// Gold-standard athlete identity + voluntary evidence matching refinements
// - One visible person per likely athlete, even when source data has LAST First,
//   FIRST LAST, initials, all-caps, or synchro-team variants.
// - Voluntary workbook matching is intentionally broad for analytics: if the
//   selected names resolve to the same athlete identity within the gender/event
//   context, the app combines those rows automatically instead of asking HPD to
//   pick a variant.
// -----------------------------------------------------------------------------
function hpdFederationWords() {
  return new Set(["USA","UNITED","STATES","UNITEDSTATES","UNITED STATES","CHN","CHINA","CHINESE","GBR","GREAT","BRITAIN","GREATBRITAIN","CAN","CANADA","MEX","MEXICO","AUS","AUSTRALIA","JPN","JAPAN","KOR","KOREA","ITA","ITALY","GER","GERMANY","FRA","FRANCE","ESP","SPAIN","BRA","BRAZIL","UKR","ROC","RUS","ARM","NED","NOR","SWE","DEN","POL","HUN","ROU","NZL","COL","PER","CUB","DOM","VEN","CHI","HKG","MAC","TPE"]);
}

function normalizePersonRaw(name) {
  return clean(name)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(USA|United States|CHN|China|Chinese|GBR|Great Britain|CAN|Canada|MEX|Mexico|AUS|Australia|JPN|Japan|KOR|Korea|ITA|Italy|GER|Germany|FRA|France|ESP|Spain|BRA|Brazil|UKR|ARM|NED|SWE|DEN|POL|ROC|RUS)\b/gi, " ")
    .replace(/[._]+/g, " ")
    .replace(/[^a-zA-Z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTeamDiverNames(name) {
  const text = clean(name)
    .replace(/\s+&\s+/g, " / ")
    .replace(/\s+and\s+/gi, " / ")
    .replace(/\s+\+\s+/g, " / ");
  return text.split("/")
    .map((part) => normalizePersonRaw(part))
    .filter(Boolean)
    .filter((part) => personNamePartsForKeys(part).length >= 1);
}

function personNamePartsForKeys(name) {
  const cleaned = normalizePersonRaw(name);
  const blocked = hpdFederationWords();
  return cleaned.split(/\s+/).filter(Boolean).filter((part) => !blocked.has(part.toUpperCase()));
}

function titlePersonName(name) {
  const parts = personNamePartsForKeys(name);
  if (!parts.length) return clean(name);
  const ordered = orderPersonParts(parts);
  return ordered.map((part) => {
    const p = part.replace(/'/g, "'");
    if (p.length === 1) return p.toUpperCase();
    return p.split("-").map((chunk) => chunk ? chunk[0].toUpperCase() + chunk.slice(1).toLowerCase() : chunk).join("-");
  }).join(" ");
}

function orderPersonParts(parts) {
  const cleanParts = parts.filter(Boolean);
  if (cleanParts.length >= 2) {
    const first = cleanParts[0];
    const second = cleanParts[1];
    // World Aquatics often stores athletes as LAST First. Convert to First LAST.
    if (first === first.toUpperCase() && first.length > 1 && /[a-z]/.test(cleanParts.slice(1).join(" "))) {
      return [...cleanParts.slice(1), first];
    }
  }
  return cleanParts;
}

function canonicalAthleteName(name) {
  return orderPersonParts(personNamePartsForKeys(name)).join(" ").toUpperCase();
}

function personMergeKey(name) {
  const ordered = orderPersonParts(personNamePartsForKeys(name)).map((part) => part.toUpperCase());
  if (!ordered.length) return "";
  if (ordered.length === 1) return `SINGLE:${ordered[0]}`;
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const middle = ordered.length > 2 ? ordered.slice(1, -1).map((part) => part[0]).join("") : "";
  // This intentionally merges Q Henninger / Quentin Henninger and RYAN Jack / Jack Ryan.
  return `PERSON:${last}|${first[0]}${middle ? `|${middle}` : ""}`;
}

function nameTokenKey(name) {
  return personNamePartsForKeys(name).map((token) => token.toUpperCase()).sort().join("|");
}

function personNameKeys(name) {
  const parts = personNamePartsForKeys(name);
  const keys = new Set();
  if (!parts.length) return keys;
  const ordered = orderPersonParts(parts).map((part) => part.toUpperCase());
  const raw = parts.map((part) => part.toUpperCase());
  const addOrdered = (list) => {
    const cleanList = list.filter(Boolean);
    if (!cleanList.length) return;
    keys.add(`FULL:${cleanList.join(" ")}`);
    keys.add(`TOKENS:${cleanList.slice().sort().join("|")}`);
    const first = cleanList[0];
    const last = cleanList[cleanList.length - 1];
    if (first && last && last.length >= 2) keys.add(`LAST_INIT:${last}|${first[0]}`);
    if (cleanList.length >= 3) keys.add(`LAST_INIT:${cleanList.slice(-2).join(" ")}|${first[0]}`);
  };
  addOrdered(ordered);
  addOrdered(raw);
  keys.add(`MERGE:${personMergeKey(name)}`);
  keys.add(`CANON:${canonicalAthleteName(name)}`);
  return keys;
}

function samePerson(a, b) {
  if (!clean(a) || !clean(b)) return false;
  const ma = personMergeKey(a);
  const mb = personMergeKey(b);
  if (ma && mb && ma === mb) return true;
  const aKeys = personNameKeys(a);
  const bKeys = personNameKeys(b);
  for (const key of aKeys) if (bKeys.has(key)) return true;
  return false;
}

function samePairName(pairName, diver1, diver2) {
  const names = splitTeamDiverNames(pairName);
  if (names.length < 2) return false;
  return names.some((name) => samePerson(name, diver1)) && names.some((name) => samePerson(name, diver2));
}

function athleteAliasRegistry() {
  const map = new Map();
  const add = (raw, row = {}) => {
    const parts = splitTeamDiverNames(raw);
    const candidates = parts.length ? parts : [raw];
    candidates.forEach((candidate) => {
      const key = personMergeKey(candidate);
      if (!key || key.startsWith("SINGLE:")) return;
      if (!map.has(key)) map.set(key, { key, display: titlePersonName(candidate), aliases: new Set(), rows: 0, genders: new Set(), ageGroups: new Set(), boards: new Set() });
      const entry = map.get(key);
      const cleanCandidate = clean(candidate);
      if (cleanCandidate) entry.aliases.add(cleanCandidate);
      entry.rows += 1;
      if (row.__gender || row.gender) entry.genders.add(clean(row.__gender || row.gender));
      if (row.__ageGroup || row.age_group) entry.ageGroups.add(clean(row.__ageGroup || row.age_group));
      if (row.__board || row.discipline) entry.boards.add(clean(row.__board || row.discipline));
      if (scoreDisplayName(candidate, entry.display) > scoreDisplayName(entry.display, candidate)) entry.display = titlePersonName(candidate);
    });
  };
  DATA.results.forEach((row) => add(row.__athlete || row.diver_name, row));
  DATA.dives.forEach((dive) => add(dive.__athlete || dive.diver_name, dive));
  return map;
}

function displayNameFromData(input) {
  const query = clean(input);
  if (!query) return "";
  const qKey = personMergeKey(query);
  const registry = athleteAliasRegistry();
  if (qKey && registry.has(qKey)) return registry.get(qKey).display;
  const matches = [...registry.values()].filter((entry) => samePerson(entry.display, query) || [...entry.aliases].some((alias) => samePerson(alias, query)));
  if (matches.length) return matches.sort((a, b) => scoreDisplayName(b.display, query) - scoreDisplayName(a.display, query) || b.rows - a.rows)[0].display;
  return titlePersonName(query) || query;
}

function scoreDisplayName(name, query) {
  let score = 0;
  const display = clean(name);
  if (!display) return -100;
  if (display.includes("/")) score -= 10;
  if (canonicalAthleteName(display) === canonicalAthleteName(query)) score += 15;
  if (personMergeKey(display) && personMergeKey(display) === personMergeKey(query)) score += 12;
  if (display === display.toUpperCase()) score -= 4;
  if (/[a-z]/.test(display)) score += 3;
  const parts = personNamePartsForKeys(display);
  if (parts.length === 2) score += 4;
  if (parts[0] && parts[0].length === 1) score -= 2;
  return score;
}

function updateVoluntaryNameOptions() {
  const options = document.getElementById("volReportNameOptions");
  if (!options) return;
  const registry = [...athleteAliasRegistry().values()]
    .filter((entry) => entry.display && !entry.display.includes("/"))
    .sort((a, b) => a.display.localeCompare(b.display));
  options.innerHTML = registry.slice(0, 1500).map((entry) => `<option value="${escapeAttr(entry.display)}"></option>`).join("");
}

function bindVoluntaryWorkbookEvents() {
  const ids = ["volReportYearScope", "volReportMode", "volReportDiver1Search", "volReportDiver2Search", "volReportPairSearch", "volReportDiveCodes"];
  ids.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    const eventName = id === "volReportDiver1Search" || id === "volReportDiver2Search" || id === "volReportPairSearch" || id === "volReportDiveCodes" ? "input" : "change";
    element.addEventListener(eventName, () => {
      updateVoluntaryNameOptions();
      if (id === "volReportDiver1Search" || id === "volReportDiver2Search" || id === "volReportPairSearch") renderVoluntaryTypeahead(element);
    });
    if (id === "volReportDiver1Search" || id === "volReportDiver2Search" || id === "volReportPairSearch") {
      ensureVoluntaryTypeahead(element);
      element.addEventListener("focus", () => renderVoluntaryTypeahead(element));
      element.addEventListener("blur", () => window.setTimeout(() => hideVoluntaryTypeahead(element), 180));
    }
  });
  document.querySelectorAll(".vol-event-type").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (state.voluntaryWorkbook) renderVoluntaryReport();
    });
  });
  const xlsxButton = document.getElementById("exportVolReportXlsx");
  if (xlsxButton) xlsxButton.addEventListener("click", exportVoluntaryEvidenceWorkbookXlsx);
}

function ensureVoluntaryTypeahead(input) {
  if (!input || document.getElementById(`${input.id}Suggestions`)) return;
  const box = document.createElement("div");
  box.id = `${input.id}Suggestions`;
  box.className = "vol-name-suggestions";
  input.insertAdjacentElement ? input.insertAdjacentElement("afterend", box) : input.parentNode?.insertBefore(box, input.nextSibling);
}

function voluntaryTypeaheadMatches(query) {
  const q = clean(query);
  const registry = [...athleteAliasRegistry().values()].filter((entry) => entry.display);
  if (!q) return registry.sort((a, b) => b.rows - a.rows || a.display.localeCompare(b.display)).slice(0, 10);
  const qLower = lower(q);
  const qKey = personMergeKey(q);
  return registry.map((entry) => {
    let score = 0;
    const dLower = lower(entry.display);
    if (dLower === qLower) score += 100;
    if (qKey && qKey === entry.key) score += 90;
    if (dLower.includes(qLower)) score += 30;
    for (const alias of entry.aliases) {
      const aLower = lower(alias);
      if (aLower === qLower) score += 90;
      if (aLower.includes(qLower)) score += 20;
      if (samePerson(alias, q)) score += 50;
    }
    return { entry, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || b.entry.rows - a.entry.rows || a.entry.display.localeCompare(b.entry.display)).map((item) => item.entry).slice(0, 10);
}

function renderVoluntaryTypeahead(input) {
  const box = document.getElementById(`${input.id}Suggestions`);
  if (!box) return;
  const matches = voluntaryTypeaheadMatches(input.value);
  if (!matches.length) {
    box.innerHTML = `<div class="vol-name-empty">No matching athlete found in loaded history.</div>`;
    box.style.display = "block";
    return;
  }
  box.innerHTML = matches.map((entry) => {
    const aliasCount = Math.max(0, entry.aliases.size - 1);
    const meta = [`${formatInt(entry.rows)} rows`, aliasCount ? `${formatInt(aliasCount)} merged form${aliasCount === 1 ? "" : "s"}` : "single display name"].join(" · ");
    return `<button type="button" class="vol-name-option" data-vol-name="${escapeAttr(entry.display)}"><strong>${escapeHtml(entry.display)}</strong><span>${escapeHtml(meta)}</span></button>`;
  }).join("");
  box.style.display = "block";
  box.querySelectorAll("[data-vol-name]").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      input.value = button.dataset.volName || "";
      hideVoluntaryTypeahead(input);
      updateVoluntaryNameOptions();
    });
  });
}

function hideVoluntaryTypeahead(input) {
  const box = document.getElementById(`${input.id}Suggestions`);
  if (box) box.style.display = "none";
}

function voluntaryReportSubjects(settings) {
  const pairFromSearch = settings.pairName && splitTeamDiverNames(settings.pairName).length >= 2 ? splitTeamDiverNames(settings.pairName).slice(0, 2) : [];
  const mkSubject = (type, diver1, diver2 = "") => {
    const d1 = displayNameFromData(diver1) || diver1;
    const d2 = displayNameFromData(diver2) || diver2;
    return { type, label: d2 ? `${d1} / ${d2}` : d1, diver1: d1, diver2: d2 };
  };
  if (settings.mode === "watchlist") return (settings.watchlist || []).map((name) => mkSubject("individual", name));
  if (settings.mode === "individual") {
    const name = settings.diver1 || settings.watchlist[0] || "";
    return name ? [mkSubject("individual", name)] : [];
  }
  const diver1 = pairFromSearch[0] || settings.diver1;
  const diver2 = pairFromSearch[1] || settings.diver2;
  if (diver1 && diver2) return [mkSubject(settings.mode === "actual_pair" ? "actual_pair" : "manual_pair", diver1, diver2)];
  if (diver1) return [mkSubject("individual", diver1)];
  return [];
}

function autoVoluntaryDiveCodes(subject, config, years) {
  const candidates = new Map();
  const add = (code, weight) => {
    code = canonicalDiveCode(code);
    if (!code) return;
    const dd = lookupOfficialDd(code, config.board, config.board === "platform" ? "10m" : config.board);
    if (isFiniteNumber(dd) && dd > 2.0001) return;
    candidates.set(code, (candidates.get(code) || 0) + weight);
  };
  const relevantSync = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && isLikelyVoluntaryDive(dive));
  relevantSync.forEach((dive) => {
    const names = splitTeamDiverNames(dive.__athlete);
    const has1 = names.some((name) => samePerson(name, subject.diver1)) || samePerson(dive.__athlete, subject.diver1);
    const has2 = subject.diver2 && (names.some((name) => samePerson(name, subject.diver2)) || samePerson(dive.__athlete, subject.diver2));
    if (subject.type !== "individual" && has1 && has2) add(dive.__diveCode, 60);
    else if (subject.type !== "individual" && (has1 || has2)) add(dive.__diveCode, 20);
    else if (subject.type === "individual" && has1) add(dive.__diveCode, 20);
  });
  const relevantIndividual = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && !dive.__isSync && isLikelyVoluntaryDive(dive));
  relevantIndividual.forEach((dive) => {
    if (samePerson(dive.__athlete, subject.diver1)) add(dive.__diveCode, 16);
    if (subject.diver2 && samePerson(dive.__athlete, subject.diver2)) add(dive.__diveCode, 16);
  });
  const output = [...candidates.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code]) => code).slice(0, 6);
  if (output.length) return output;
  return commonFieldVoluntaryCodes(config, years).slice(0, 4);
}

function buildSubjectSyncRows(subject, config, diveCodes, years) {
  if (subject.type === "individual") return [];
  const allRows = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && isLikelyVoluntaryDive(dive) && diveCodes.includes(dive.__diveCode));
  const selectedRows = allRows.map((dive) => {
    const names = splitTeamDiverNames(dive.__athlete);
    const exactPair = names.length >= 2 && names.some((name) => samePerson(name, subject.diver1)) && names.some((name) => samePerson(name, subject.diver2));
    const side1 = names.some((name) => samePerson(name, subject.diver1)) || samePerson(dive.__athlete, subject.diver1);
    const side2 = names.some((name) => samePerson(name, subject.diver2)) || samePerson(dive.__athlete, subject.diver2);
    const singleSide = names.length < 2 && (side1 || side2);
    const multiSide = names.length > 2 && (side1 || side2);
    if (!exactPair && !singleSide && !multiSide) return null;
    let evidenceLevel = "Pair evidence";
    let sourceSide = subject.label;
    let sourceNote = "Exact pair name found in source.";
    if (!exactPair) {
      evidenceLevel = multiSide ? "Team event evidence" : "Single-side synchro evidence";
      sourceSide = side1 ? subject.diver1 : subject.diver2;
      sourceNote = multiSide ? "Team/mixed event source contains one or both selected divers." : "Synchronized row found for one selected diver; source did not include both names.";
    }
    return { dive, evidenceLevel, sourceSide, sourceNote };
  }).filter(Boolean);
  const bySession = groupBy(selectedRows, (item) => {
    const dive = item.dive;
    const sourceKey = item.evidenceLevel === "Pair evidence" ? "PAIR" : `SINGLE:${personMergeKey(item.sourceSide || dive.__athlete)}`;
    return `${sourceKey}||${dive.__key || ""}||${dive.__year || ""}||${dive.__meet || ""}||${dive.__event || ""}||${dive.round_stage || dive.event_round || ""}`;
  });
  return [...bySession.entries()].map(([key, items]) => {
    const dives = items.map((item) => item.dive);
    const sampleItem = items[0] || {};
    const sample = sampleItem.dive || {};
    const diveScores = {};
    const sourceByDive = {};
    diveCodes.forEach((code) => {
      const matchItem = items.filter((item) => item.dive.__diveCode === code).sort((a, b) => (b.dive.__score || 0) - (a.dive.__score || 0))[0];
      if (matchItem) {
        diveScores[code] = matchItem.dive.__score;
        sourceByDive[code] = sourceDetailFromDive(matchItem.dive, { evidence: matchItem.evidenceLevel, pair: subject.label, sourceSide: matchItem.sourceSide, note: matchItem.sourceNote });
      }
    });
    const result = DATA.results.find((row) => row.__key === sample.__key) || DATA.results.find((row) => row.__isSync && row.__year === sample.__year && row.__board === sample.__board && (samePairName(row.__athlete, subject.diver1, subject.diver2) || samePerson(row.__athlete, sampleItem.sourceSide)) && (!sample.__event || row.__event === sample.__event));
    const evidenceLevel = items.some((item) => item.evidenceLevel === "Pair evidence") ? "Pair evidence" : (items.some((item) => item.evidenceLevel === "Team event evidence") ? "Team event evidence" : "Single-side synchro evidence");
    const sideNote = evidenceLevel === "Pair evidence" ? "" : ` (${sampleItem.sourceSide}; ${evidenceLevel === "Team event evidence" ? "team event source" : "partner not shown in source row"})`;
    return {
      context: [sample.__year, sample.__meet, sample.round_stage || sample.event_round || sample.__event].filter(Boolean).join(" - ") + sideNote,
      meet: sample.__meet,
      event: sample.__event,
      year: sample.__year,
      scores: dives.map((dive) => dive.__score).filter(isFiniteNumber),
      diveScores,
      sourceByDive,
      total: sum(Object.values(diveScores).filter(isFiniteNumber)),
      overallScore: result?.__score,
      place: result?.__place,
      evidenceLevel,
      result,
    };
  }).sort((a, b) => String(a.year).localeCompare(String(b.year)) || a.context.localeCompare(b.context));
}

function individualEvidenceForDive(diver, code, config, years, subject) {
  const officialDd = lookupOfficialDd(code, config.board, config.board === "platform" ? "10m" : config.board);
  const individual = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && !dive.__isSync && samePerson(dive.__athlete, diver) && dive.__diveCode === code);
  const syncOther = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && dive.__diveCode === code && (splitTeamDiverNames(dive.__athlete).some((name) => samePerson(name, diver)) || samePerson(dive.__athlete, diver)) && !(subject?.diver2 && samePairName(dive.__athlete, subject.diver1, subject.diver2)));
  const all = individual.length ? individual : syncOther;
  if (!all.length) return { diver, diveCode: code, status: "No data present", avgScore: null, bestScore: null, count: 0, bestContext: "", net: null, evidenceLevel: "No data present", notes: "No matching individual or synchro-with-other-partner evidence found in selected history after automatic name merging.", source: null };
  const best = all.slice().sort((a, b) => (b.__score || 0) - (a.__score || 0))[0];
  const dd = officialDd || best.__dd;
  const evidenceLevel = individual.length ? "Individual evidence" : "Synchro with other partner";
  return {
    diver: displayNameFromData(diver) || diver,
    diveCode: code,
    status: "",
    avgScore: mean(all.map((dive) => dive.__score)),
    bestScore: best.__score,
    count: all.length,
    bestContext: [best.__year, best.__meet, best.__event, best.round_stage || best.event_round].filter(Boolean).join(" - "),
    net: isFiniteNumber(best.__score) && isFiniteNumber(dd) && dd ? best.__score / dd : null,
    evidenceLevel,
    notes: individual.length ? `${individual.length} individual record(s), merged across name variants` : `${syncOther.length} synchro-with-other-partner record(s), merged across name variants`,
    source: sourceDetailFromDive(best, { evidence: evidenceLevel, selectedDiver: diver, matchedName: best.__athlete }),
  };
}

function buildVoluntaryMatchSummary(subjects, settings, years) {
  const notes = [];
  const nameForms = new Map();
  subjects.forEach((subject) => {
    [subject.diver1, subject.diver2].filter(Boolean).forEach((name) => {
      const forms = collectNameForms(name, years);
      nameForms.set(name, forms);
      if (forms.length > 1) notes.push(`${name}: automatically combined ${forms.length} source name forms. The dropdown now shows one athlete name instead of each variant.`);
    });
  });
  notes.push("Name matching combines first/last reversals, all-caps World Aquatics naming, first-initial variants, and domestic DiveMeets formats when the athlete identity is analytically the same.");
  if (!subjects.length) notes.push("No athlete or pair selected yet. Type names and build the workbook to run matching.");
  return { mergedNameForms: [...nameForms.values()].reduce((acc, forms) => acc + Math.max(0, forms.length - 1), 0), nameForms, notes };
}

function renderVoluntaryReportMatchQuality(workbook) {
  const panel = document.getElementById("volReportEvidenceQuality");
  if (!panel) return;
  if (!workbook || !workbook.flatRows) { panel.innerHTML = ""; return; }
  const rows = workbook.flatRows || [];
  const pairRows = rows.filter((row) => row.evidence_level === "Pair evidence").length;
  const singleRows = rows.filter((row) => /Single-side|Team event/.test(row.evidence_level || "")).length;
  const individualRows = rows.filter((row) => String(row.section).includes("individual")).length;
  const noData = rows.filter((row) => /No data present/i.test(row.data_notes || row.score || row.best_score || "")).length;
  const mergedNames = workbook.matchSummary?.mergedNameForms || 0;
  const exactSources = rows.filter((row) => row.source_meet || row.best_context).length;
  const details = (workbook.matchSummary?.notes || []).slice(0, 10).map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  panel.innerHTML = `
    <div class="evidence-quality-grid">
      <div class="evidence-quality-card"><span>Pair evidence</span><strong>${formatInt(pairRows)}</strong><em>Exact pair voluntary cells found</em></div>
      <div class="evidence-quality-card"><span>Single-side/team evidence</span><strong>${formatInt(singleRows)}</strong><em>Rows kept when source omits full partner names</em></div>
      <div class="evidence-quality-card"><span>Individual evidence</span><strong>${formatInt(individualRows)}</strong><em>Best/average source rows attached</em></div>
      <div class="evidence-quality-card"><span>Auto-merged names</span><strong>${formatInt(mergedNames)}</strong><em>Hidden aliases combined behind one display name</em></div>
      <div class="evidence-quality-card"><span>Source drilldowns</span><strong>${formatInt(exactSources)}</strong><em>Clickable scores show their source</em></div>
      <div class="evidence-quality-card"><span>No-data cells</span><strong>${formatInt(noData)}</strong><em>Only where no evidence exists in loaded history</em></div>
    </div>
    <details class="match-review-details"><summary>Matching coverage details</summary><ul>${details}</ul></details>`;
}


// -----------------------------------------------------------------------------
// Performance cache for athlete identity matching. The voluntary workbook calls
// samePerson thousands of times; these caches keep the broader matching rules
// fast enough for the full 2021-2026 history.
// -----------------------------------------------------------------------------
function hpdIdentityCache() {
  if (!window.__hpdIdentityCache) window.__hpdIdentityCache = { parts: new Map(), canonical: new Map(), merge: new Map(), token: new Map(), keys: new Map(), registrySignature: "", registry: null };
  return window.__hpdIdentityCache;
}

function personNamePartsForKeys(name) {
  const raw = clean(name);
  const cache = hpdIdentityCache();
  if (cache.parts.has(raw)) return cache.parts.get(raw);
  const cleaned = normalizePersonRaw(raw);
  const blocked = hpdFederationWords();
  const parts = cleaned.split(/\s+/).filter(Boolean).filter((part) => !blocked.has(part.toUpperCase()));
  cache.parts.set(raw, parts);
  return parts;
}

function canonicalAthleteName(name) {
  const raw = clean(name);
  const cache = hpdIdentityCache();
  if (cache.canonical.has(raw)) return cache.canonical.get(raw);
  const out = orderPersonParts(personNamePartsForKeys(raw)).join(" ").toUpperCase();
  cache.canonical.set(raw, out);
  return out;
}

function personMergeKey(name) {
  const raw = clean(name);
  const cache = hpdIdentityCache();
  if (cache.merge.has(raw)) return cache.merge.get(raw);
  const ordered = orderPersonParts(personNamePartsForKeys(raw)).map((part) => part.toUpperCase());
  let out = "";
  if (!ordered.length) out = "";
  else if (ordered.length === 1) out = `SINGLE:${ordered[0]}`;
  else {
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const middle = ordered.length > 2 ? ordered.slice(1, -1).map((part) => part[0]).join("") : "";
    out = `PERSON:${last}|${first[0]}${middle ? `|${middle}` : ""}`;
  }
  cache.merge.set(raw, out);
  return out;
}

function nameTokenKey(name) {
  const raw = clean(name);
  const cache = hpdIdentityCache();
  if (cache.token.has(raw)) return cache.token.get(raw);
  const out = personNamePartsForKeys(raw).map((token) => token.toUpperCase()).sort().join("|");
  cache.token.set(raw, out);
  return out;
}

function personNameKeys(name) {
  const raw = clean(name);
  const cache = hpdIdentityCache();
  if (cache.keys.has(raw)) return cache.keys.get(raw);
  const parts = personNamePartsForKeys(raw);
  const keys = new Set();
  if (parts.length) {
    const ordered = orderPersonParts(parts).map((part) => part.toUpperCase());
    const rawParts = parts.map((part) => part.toUpperCase());
    const addOrdered = (list) => {
      const cleanList = list.filter(Boolean);
      if (!cleanList.length) return;
      keys.add(`FULL:${cleanList.join(" ")}`);
      keys.add(`TOKENS:${cleanList.slice().sort().join("|")}`);
      const first = cleanList[0];
      const last = cleanList[cleanList.length - 1];
      if (first && last && last.length >= 2) keys.add(`LAST_INIT:${last}|${first[0]}`);
      if (cleanList.length >= 3) keys.add(`LAST_INIT:${cleanList.slice(-2).join(" ")}|${first[0]}`);
    };
    addOrdered(ordered);
    addOrdered(rawParts);
    keys.add(`MERGE:${personMergeKey(raw)}`);
    keys.add(`CANON:${canonicalAthleteName(raw)}`);
  }
  cache.keys.set(raw, keys);
  return keys;
}

function samePerson(a, b) {
  const ca = clean(a), cb = clean(b);
  if (!ca || !cb) return false;
  const ma = personMergeKey(ca), mb = personMergeKey(cb);
  if (ma && mb && ma === mb) return true;
  const aKeys = personNameKeys(ca), bKeys = personNameKeys(cb);
  for (const key of aKeys) if (bKeys.has(key)) return true;
  return false;
}

function athleteAliasRegistry() {
  const cache = hpdIdentityCache();
  const signature = `${DATA.results.length}|${DATA.dives.length}|${(DATA.meta?.loadedYears || []).join(',')}`;
  if (cache.registry && cache.registrySignature === signature) return cache.registry;
  const map = new Map();
  const add = (raw, row = {}) => {
    const parts = splitTeamDiverNames(raw);
    const candidates = parts.length ? parts : [raw];
    candidates.forEach((candidate) => {
      const key = personMergeKey(candidate);
      if (!key || key.startsWith("SINGLE:")) return;
      if (!map.has(key)) map.set(key, { key, display: titlePersonName(candidate), aliases: new Set(), rows: 0, genders: new Set(), ageGroups: new Set(), boards: new Set() });
      const entry = map.get(key);
      const cleanCandidate = clean(candidate);
      if (cleanCandidate) entry.aliases.add(cleanCandidate);
      entry.rows += 1;
      if (row.__gender || row.gender) entry.genders.add(clean(row.__gender || row.gender));
      if (row.__ageGroup || row.age_group) entry.ageGroups.add(clean(row.__ageGroup || row.age_group));
      if (row.__board || row.discipline) entry.boards.add(clean(row.__board || row.discipline));
      if (scoreDisplayName(candidate, entry.display) > scoreDisplayName(entry.display, candidate)) entry.display = titlePersonName(candidate);
    });
  };
  DATA.results.forEach((row) => add(row.__athlete || row.diver_name, row));
  DATA.dives.forEach((dive) => add(dive.__athlete || dive.diver_name, dive));
  cache.registry = map;
  cache.registrySignature = signature;
  return map;
}


// -----------------------------------------------------------------------------
// Final usability guardrails for the voluntary builder: use the custom name
// picker instead of browser datalist drop-downs, and let auto-detected voluntary
// dive sets include assigned-DD synchro dives that source data marks as voluntary
// even when formula DD is above 2.0. This matches HPD's hand-built workbook view.
// -----------------------------------------------------------------------------
function bindVoluntaryWorkbookEvents() {
  const ids = ["volReportYearScope", "volReportMode", "volReportDiver1Search", "volReportDiver2Search", "volReportPairSearch", "volReportDiveCodes"];
  ids.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    const isNameInput = id === "volReportDiver1Search" || id === "volReportDiver2Search" || id === "volReportPairSearch";
    if (isNameInput && element.removeAttribute) element.removeAttribute("list");
    const eventName = isNameInput || id === "volReportDiveCodes" ? "input" : "change";
    element.addEventListener(eventName, () => {
      updateVoluntaryNameOptions();
      if (isNameInput) renderVoluntaryTypeahead(element);
    });
    if (isNameInput) {
      ensureVoluntaryTypeahead(element);
      element.addEventListener("focus", () => renderVoluntaryTypeahead(element));
      element.addEventListener("blur", () => window.setTimeout(() => hideVoluntaryTypeahead(element), 180));
    }
  });
  document.querySelectorAll(".vol-event-type").forEach((checkbox) => {
    checkbox.addEventListener("change", () => { if (state.voluntaryWorkbook) renderVoluntaryReport(); });
  });
  const xlsxButton = document.getElementById("exportVolReportXlsx");
  if (xlsxButton) xlsxButton.addEventListener("click", exportVoluntaryEvidenceWorkbookXlsx);
}

function autoVoluntaryDiveCodes(subject, config, years) {
  const candidates = new Map();
  const add = (code, weight) => {
    code = canonicalDiveCode(code);
    if (!code) return;
    candidates.set(code, (candidates.get(code) || 0) + weight);
  };
  const relevantSync = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && isLikelyVoluntaryDive(dive));
  relevantSync.forEach((dive) => {
    const names = splitTeamDiverNames(dive.__athlete);
    const has1 = names.some((name) => samePerson(name, subject.diver1)) || samePerson(dive.__athlete, subject.diver1);
    const has2 = subject.diver2 && (names.some((name) => samePerson(name, subject.diver2)) || samePerson(dive.__athlete, subject.diver2));
    if (subject.type !== "individual" && has1 && has2) add(dive.__diveCode, 80);
    else if (subject.type !== "individual" && (has1 || has2)) add(dive.__diveCode, 20);
    else if (subject.type === "individual" && has1) add(dive.__diveCode, 20);
  });
  const relevantIndividual = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && !dive.__isSync && isLikelyVoluntaryDive(dive));
  relevantIndividual.forEach((dive) => {
    if (samePerson(dive.__athlete, subject.diver1)) add(dive.__diveCode, 12);
    if (subject.diver2 && samePerson(dive.__athlete, subject.diver2)) add(dive.__diveCode, 12);
  });
  const output = [...candidates.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code]) => code).slice(0, 6);
  if (output.length) return output;
  return commonFieldVoluntaryCodes(config, years).slice(0, 4);
}

function updateVoluntaryNameOptions() {
  // Browser datalists become noisy with 2021-2026 history; the custom typeahead
  // is the authoritative selector and shows one merged display name per athlete.
  const options = document.getElementById("volReportNameOptions");
  if (options) options.innerHTML = "";
}

// -----------------------------------------------------------------------------
// Voluntary evidence drilldown fix: score clicks now open the exact source row
// inline without re-filtering, and source-side synchro rows are displayed as
// usable evidence instead of appearing to lead to a no-data session.
// -----------------------------------------------------------------------------
function hpdVolSessionKey(dive) {
  return [dive.__year || "", dive.__meet || "", dive.__event || "", dive.round_stage || dive.event_round || "", dive.__key || dive.sheet_key || ""].join("||");
}

function hpdVolLooseSessionKey(dive) {
  return [dive.__year || "", dive.__meet || "", dive.__event || "", dive.round_stage || dive.event_round || ""].join("||");
}

function hpdVolSourceSide(dive, subject) {
  const names = splitTeamDiverNames(dive.__athlete);
  const side1 = names.some((name) => samePerson(name, subject.diver1)) || samePerson(dive.__athlete, subject.diver1);
  const side2 = subject.diver2 && (names.some((name) => samePerson(name, subject.diver2)) || samePerson(dive.__athlete, subject.diver2));
  if (side1 && side2) return subject.label;
  if (side1) return subject.diver1;
  if (side2) return subject.diver2;
  return dive.__athlete || "Source row";
}

function hpdVolEvidenceSummaryForCode(items, code, subject) {
  const codeItems = items.filter((item) => item.dive.__diveCode === code);
  const hasExact = codeItems.some((item) => item.evidenceLevel === "Pair evidence");
  const sides = unique(codeItems.map((item) => item.sourceSide).filter(Boolean));
  if (hasExact) return "Exact pair score found in the source row.";
  if (sides.length >= 2) return `Both selected divers have same-session source rows for ${code}; displayed as linked partner evidence.`;
  if (sides.length === 1) return `${sides[0]} has a source row for ${code}; selected partner is not shown in that source row.`;
  return "No source row for this dive in this session.";
}

function hpdVolDetailRowsFromItems(items) {
  return items.map((item) => sourceDetailFromDive(item.dive, {
    evidence: item.evidenceLevel,
    sourceSide: item.sourceSide,
    note: item.sourceNote,
  }));
}

function buildSubjectSyncRows(subject, config, diveCodes, years) {
  if (subject.type === "individual") return [];
  const allRows = DATA.dives
    .filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && isLikelyVoluntaryDive(dive) && diveCodes.includes(dive.__diveCode));

  const selectedRows = allRows.map((dive) => {
    const names = splitTeamDiverNames(dive.__athlete);
    const side1 = names.some((name) => samePerson(name, subject.diver1)) || samePerson(dive.__athlete, subject.diver1);
    const side2 = subject.diver2 && (names.some((name) => samePerson(name, subject.diver2)) || samePerson(dive.__athlete, subject.diver2));
    const exactPair = names.length >= 2 && side1 && side2;
    const sourceSide = exactPair ? subject.label : (side1 ? subject.diver1 : side2 ? subject.diver2 : "");
    if (!exactPair && !sourceSide) return null;
    let evidenceLevel = exactPair ? "Pair evidence" : "Single-side synchro evidence";
    let sourceNote = exactPair ? "Exact selected pair appears in the source row." : "Score is retained because the source row contains one selected diver; the selected partner is not shown on that source row.";
    return { dive, evidenceLevel, sourceSide, sourceNote, exactPair };
  }).filter(Boolean);

  const grouped = groupBy(selectedRows, (item) => {
    const dive = item.dive;
    // Exact pair rows get their own true-source session. Single-side rows are grouped
    // by meet/event/round so HPD sees the usable source evidence in one place.
    return item.exactPair ? `PAIR||${hpdVolSessionKey(dive)}` : `SOURCE_SIDE||${hpdVolLooseSessionKey(dive)}`;
  });

  return [...grouped.values()].map((items) => {
    const dives = items.map((item) => item.dive);
    const sampleItem = items[0] || {};
    const sample = sampleItem.dive || {};
    const hasExactPair = items.some((item) => item.evidenceLevel === "Pair evidence");
    const sourceSides = unique(items.map((item) => item.sourceSide).filter(Boolean));
    const evidenceLevel = hasExactPair ? "Pair evidence" : (sourceSides.length >= 2 ? "Linked source-side evidence" : "Single-side synchro evidence");
    const evidenceSuffix = hasExactPair ? "" : ` (${sourceSides.join(" + ") || "source side"}; selected pair not fully named in source row)`;

    const diveScores = {};
    const sourceByDive = {};
    diveCodes.forEach((code) => {
      const codeItems = items.filter((item) => item.dive.__diveCode === code);
      const exact = codeItems.filter((item) => item.evidenceLevel === "Pair evidence").sort((a, b) => (b.dive.__score || 0) - (a.dive.__score || 0))[0];
      const matchItem = exact || codeItems.sort((a, b) => (b.dive.__score || 0) - (a.dive.__score || 0))[0];
      if (matchItem) {
        diveScores[code] = matchItem.dive.__score;
        sourceByDive[code] = sourceDetailFromDive(matchItem.dive, {
          evidence: exact ? "Pair evidence" : (sourceSides.length >= 2 ? "Linked source-side evidence" : "Single-side synchro evidence"),
          pair: subject.label,
          selectedDiver1: subject.diver1,
          selectedDiver2: subject.diver2,
          sourceSide: matchItem.sourceSide,
          note: hpdVolEvidenceSummaryForCode(items, code, subject),
          sessionRows: hpdVolDetailRowsFromItems(items.filter((item) => item.dive.__diveCode === code)),
          sessionAllRows: hpdVolDetailRowsFromItems(items),
        });
      }
    });

    const result = DATA.results.find((row) => row.__key === sample.__key) || DATA.results.find((row) => {
      if (!row.__isSync || row.__year !== sample.__year || row.__board !== sample.__board) return false;
      if (sample.__event && row.__event !== sample.__event) return false;
      return samePairName(row.__athlete, subject.diver1, subject.diver2) || sourceSides.some((side) => samePerson(row.__athlete, side));
    });

    return {
      context: [sample.__year, sample.__meet, sample.round_stage || sample.event_round || sample.__event].filter(Boolean).join(" - ") + evidenceSuffix,
      meet: sample.__meet,
      event: sample.__event,
      year: sample.__year,
      scores: dives.map((dive) => dive.__score).filter(isFiniteNumber),
      diveScores,
      sourceByDive,
      total: sum(Object.values(diveScores).filter(isFiniteNumber)),
      overallScore: result?.__score,
      place: result?.__place,
      evidenceLevel,
      result,
    };
  }).sort((a, b) => String(a.year).localeCompare(String(b.year)) || a.context.localeCompare(b.context));
}

function sourceButton(value, detail, label = null) {
  if (!isFiniteNumber(value)) return escapeHtml(label || value || "No data present");
  const id = registerVoluntarySource(detail);
  return `<button type="button" class="score-evidence-btn" data-vol-source="${escapeAttr(id)}" title="Open exact source evidence">${escapeHtml(label || formatNumber(value, 1))}</button>`;
}

function renderVoluntaryWorkbookPreview(workbook) {
  const table = document.getElementById("volReportTable");
  const detail = document.getElementById("volReportSourceDetail");
  if (detail) detail.innerHTML = "";
  document.querySelectorAll(".inline-source-detail-row").forEach((row) => row.remove());
  if (!table) return;
  if (!workbook.sheets.length) {
    table.innerHTML = emptyState("No event tabs selected.");
    return;
  }
  table.innerHTML = workbook.sheets.map((sheet) => `<details class="vol-workbook-sheet" open><summary>${escapeHtml(sheet.name)} <span>${formatInt(sheet.flatRows.length)} evidence rows</span></summary>${sheet.html}</details>`).join("");
  table.querySelectorAll("[data-vol-source]").forEach((button) => {
    button.addEventListener("click", () => showVoluntarySourceDetail(button.dataset.volSource, button));
  });
}

function hpdVolSourceDetailHtml(detail) {
  const fields = [
    ["Evidence", detail.evidence], ["Report pair", detail.pair], ["Source athlete/team", detail.athlete], ["Source side", detail.sourceSide],
    ["Selected Diver 1", detail.selectedDiver1], ["Selected Diver 2", detail.selectedDiver2], ["Selected diver", detail.selectedDiver], ["Matched name", detail.matchedName],
    ["Meet", detail.meet], ["Year", detail.year], ["Event", detail.event], ["Round", detail.round], ["Board", detail.board], ["Dive", detail.dive],
    ["Group", detail.group], ["DD", formatNumber(detail.dd, 2)], ["Score", formatNumber(detail.score, 1)], ["Net", formatNumber(detail.net, 1)],
    ["Place", formatPlace(detail.place)], ["Source", detail.source]
  ].filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "-");
  const note = detail.note ? `<div class="source-note"><strong>Evidence note:</strong> ${escapeHtml(detail.note)}</div>` : "";
  const related = Array.isArray(detail.sessionRows) && detail.sessionRows.length ? `
    <div class="source-related"><h5>Rows behind this score</h5>
      <table><thead><tr><th>Source athlete/team</th><th>Evidence</th><th>Meet</th><th>Round</th><th>Dive</th><th>Score</th><th>Place</th></tr></thead><tbody>
        ${detail.sessionRows.map((row) => `<tr><td>${escapeHtml(row.athlete || row.pair || "")}</td><td>${escapeHtml(row.evidence || "")}</td><td>${escapeHtml(row.meet || "")}</td><td>${escapeHtml(row.round || "")}</td><td>${escapeHtml(row.dive || "")}</td><td>${formatNumber(row.score, 1)}</td><td>${formatPlace(row.place)}</td></tr>`).join("")}
      </tbody></table>
    </div>` : "";
  return `<h4>Source evidence for clicked score</h4>${note}<div class="source-detail-grid">${fields.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>${related}`;
}

function showVoluntarySourceDetail(id, anchor = null) {
  const detail = state.voluntaryEvidenceSources?.get(id);
  if (!detail) return;
  const html = hpdVolSourceDetailHtml(detail);
  const panel = document.getElementById("volReportSourceDetail");
  if (panel) panel.innerHTML = html;

  document.querySelectorAll(".inline-source-detail-row").forEach((row) => row.remove());
  if (anchor) {
    const tr = anchor.closest("tr");
    const table = anchor.closest("table");
    if (tr && table) {
      const columns = tr.children.length || 1;
      const inline = document.createElement("tr");
      inline.className = "inline-source-detail-row";
      inline.innerHTML = `<td colspan="${columns}"><div class="source-detail-panel inline-source-detail">${html}</div></td>`;
      tr.insertAdjacentElement("afterend", inline);
      inline.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
}


// -----------------------------------------------------------------------------
// HPD voluntary evidence builder patch - 2026-05-28
// Purpose: preserve human partner evaluation while improving evidence retrieval.
// 01/02/03 dive numbers are a soft search hint only. They do not confirm a
// voluntary. Confirmed evidence comes from source labels or round/session context.
// The workbook also keeps near-position matches visible because positions can be
// changed during partner evaluation.
// -----------------------------------------------------------------------------
function hpdDiveEndsWith010203(diveOrCode) {
  const code = typeof diveOrCode === "string" ? canonicalDiveCode(diveOrCode) : (diveOrCode?.__diveCode || canonicalDiveCode(diveOrCode?.dive_number));
  const base = baseDiveNumber(code || "");
  return /0[1-3]$/.test(base);
}

function hpdVoluntaryLabelInfo(dive) {
  const label = lower([dive?.__optional, dive?.optional_voluntary, dive?.round_stage, dive?.event_round, dive?.event_name, dive?.__event].filter(Boolean).join(" "));
  return {
    label,
    hasConfirmedLabel: /\b(voluntary|assigned|required|compulsory|junior voluntary|synchro voluntary)\b/.test(label) || label === "v",
    hasOptionalLabel: /\boptional\b/.test(label),
  };
}

function hpdVoluntaryEvidenceTier(dive) {
  if (!dive) return { tier: "No data present", priority: 0, confirmed: false, possible: false, note: "No source row found." };
  const info = hpdVoluntaryLabelInfo(dive);
  if (info.hasConfirmedLabel) return { tier: "Confirmed voluntary / source-labeled", priority: 100, confirmed: true, possible: false, note: "Source label indicates voluntary/assigned/required evidence." };
  if (dive.__isSync && isFiniteNumber(dive.__order) && dive.__order <= 2) return { tier: "Confirmed first-two-round synchro evidence", priority: 95, confirmed: true, possible: false, note: "Dive appears in one of the first two synchro rounds." };
  if (dive.__isSync && hpdDiveEndsWith010203(dive)) return { tier: "Possible voluntary candidate", priority: 58, confirmed: false, possible: true, note: "01/02/03 pattern is a soft search hint only; verify against event context." };
  if (!dive.__isSync && hpdDiveEndsWith010203(dive)) return { tier: "Possible voluntary candidate", priority: 52, confirmed: false, possible: true, note: "01/02/03 pattern is a soft search hint only; verify against event context." };
  if (isFiniteNumber(dive.__dd) && dive.__dd <= 2.0001 && !info.hasOptionalLabel) return { tier: "Possible voluntary candidate", priority: 45, confirmed: false, possible: true, note: "Low DD supports review, but it is not a hard voluntary rule." };
  return { tier: "Other relevant dive history", priority: 10, confirmed: false, possible: false, note: "Same board/event dive history; not treated as voluntary evidence by default." };
}

function isLikelyVoluntaryDive(dive) {
  const tier = hpdVoluntaryEvidenceTier(dive);
  return Boolean(tier.confirmed || tier.possible);
}

function hpdVoluntaryRowsForPerson(diver, code, config, years, options = {}) {
  const targetCode = canonicalDiveCode(code);
  const targetBase = baseDiveNumber(targetCode);
  const includeNear = Boolean(options.includeNear);
  const includeOther = Boolean(options.includeOther);
  return DATA.dives.filter((dive) => {
    if (!voluntaryDiveEventMatch(dive, config, years)) return false;
    const diveCode = dive.__diveCode || canonicalDiveCode(dive.dive_number);
    if (!diveCode) return false;
    const exact = diveCode === targetCode;
    const near = includeNear && targetBase && baseDiveNumber(diveCode) === targetBase && diveCode !== targetCode;
    if (!exact && !near && !includeOther) return false;
    if (!exact && !near && includeOther && hpdVoluntaryEvidenceTier(dive).priority <= 10) return false;
    if (!dive.__isSync) return samePerson(dive.__athlete, diver);
    return splitTeamDiverNames(dive.__athlete).some((name) => samePerson(name, diver)) || samePerson(dive.__athlete, diver);
  });
}

function hpdBestVoluntaryEvidenceRow(rows) {
  return rows.slice().sort((a, b) => {
    const ta = hpdVoluntaryEvidenceTier(a);
    const tb = hpdVoluntaryEvidenceTier(b);
    return tb.priority - ta.priority || (b.__score || 0) - (a.__score || 0) || String(b.__year || "").localeCompare(String(a.__year || ""));
  })[0];
}

function hpdIndividualEvidenceObject(diver, requestedCode, actualCode, rows, config, labelPrefix, subject) {
  if (!rows.length) return null;
  const best = hpdBestVoluntaryEvidenceRow(rows);
  const officialDd = lookupOfficialDd(actualCode, config.board, config.board === "platform" ? "10m" : config.board) || best.__dd;
  const individualCount = rows.filter((row) => !row.__isSync).length;
  const syncCount = rows.filter((row) => row.__isSync).length;
  const tier = hpdVoluntaryEvidenceTier(best);
  const evidenceLevel = labelPrefix ? `${labelPrefix}: ${tier.tier}` : tier.tier;
  const noteBits = [];
  if (individualCount) noteBits.push(`${individualCount} individual row${individualCount === 1 ? "" : "s"}`);
  if (syncCount) noteBits.push(`${syncCount} synchro row${syncCount === 1 ? "" : "s"}${subject?.diver2 ? ", including other-partner or source-side evidence where applicable" : ""}`);
  noteBits.push(tier.note);
  if (requestedCode && requestedCode !== actualCode) noteBits.push(`Near match for ${requestedCode}; same base dive, different position.`);
  return {
    diver: displayNameFromData(diver) || diver,
    diveCode: requestedCode && requestedCode !== actualCode ? `${actualCode} (near ${requestedCode})` : actualCode,
    requestedDiveCode: requestedCode,
    actualDiveCode: actualCode,
    status: "",
    avgScore: mean(rows.map((dive) => dive.__score)),
    bestScore: best.__score,
    count: rows.length,
    bestContext: [best.__year, best.__meet, best.__event, best.round_stage || best.event_round].filter(Boolean).join(" - "),
    net: isFiniteNumber(best.__score) && isFiniteNumber(officialDd) && officialDd ? best.__score / officialDd : null,
    evidenceLevel,
    notes: noteBits.join("; "),
    source: sourceDetailFromDive(best, { evidence: evidenceLevel, selectedDiver: diver, matchedName: best.__athlete, requestedDive: requestedCode, actualDive: actualCode, voluntaryTier: tier.tier, voluntaryNote: tier.note }),
  };
}

function individualEvidenceForDive(diver, code, config, years, subject) {
  const exactRows = hpdVoluntaryRowsForPerson(diver, code, config, years, { includeNear: false });
  if (exactRows.length) return hpdIndividualEvidenceObject(diver, code, canonicalDiveCode(code), exactRows, config, "Exact evidence", subject);
  const nearRows = hpdVoluntaryRowsForPerson(diver, code, config, years, { includeNear: true })
    .filter((dive) => (dive.__diveCode || canonicalDiveCode(dive.dive_number)) !== canonicalDiveCode(code));
  if (nearRows.length) {
    const best = hpdBestVoluntaryEvidenceRow(nearRows);
    return hpdIndividualEvidenceObject(diver, code, best.__diveCode || canonicalDiveCode(best.dive_number), nearRows.filter((row) => (row.__diveCode || canonicalDiveCode(row.dive_number)) === (best.__diveCode || canonicalDiveCode(best.dive_number))), config, "Near match", subject);
  }
  return { diver: displayNameFromData(diver) || diver, diveCode: code, requestedDiveCode: code, actualDiveCode: code, status: "No data present", avgScore: null, bestScore: null, count: 0, bestContext: "", net: null, evidenceLevel: "No data present", notes: "No matching individual, near-position, or synchro-with-other-partner evidence found in selected history after automatic name merging.", source: null };
}

function hpdAdditionalNearMatchRowsForDiver(diver, diveCodes, config, years, subject) {
  const existing = new Set(diveCodes.map(canonicalDiveCode));
  const targetBases = new Set(diveCodes.map((code) => baseDiveNumber(code)).filter(Boolean));
  const byActualCode = new Map();
  targetBases.forEach((base) => {
    DATA.dives.forEach((dive) => {
      if (!voluntaryDiveEventMatch(dive, config, years)) return;
      const actual = dive.__diveCode || canonicalDiveCode(dive.dive_number);
      if (!actual || existing.has(actual) || baseDiveNumber(actual) !== base) return;
      if (!isLikelyVoluntaryDive(dive)) return;
      const belongs = !dive.__isSync ? samePerson(dive.__athlete, diver) : (splitTeamDiverNames(dive.__athlete).some((name) => samePerson(name, diver)) || samePerson(dive.__athlete, diver));
      if (!belongs) return;
      if (!byActualCode.has(actual)) byActualCode.set(actual, []);
      byActualCode.get(actual).push(dive);
    });
  });
  return [...byActualCode.entries()].slice(0, 8).map(([actual, rows]) => hpdIndividualEvidenceObject(diver, "Near match", actual, rows, config, "Additional near match", subject)).filter(Boolean);
}

function buildVoluntarySubjectBlock(subject, config, diveCodes, years) {
  const syncRows = subject.type === "individual" ? [] : buildSubjectSyncRows(subject, config, diveCodes, years);
  const individualRows = [];
  [subject.diver1, subject.diver2].filter(Boolean).forEach((diver) => {
    diveCodes.forEach((code) => individualRows.push(individualEvidenceForDive(diver, code, config, years, subject)));
    individualRows.push(...hpdAdditionalNearMatchRowsForDiver(diver, diveCodes, config, years, subject));
  });
  return { syncRows, individualRows };
}

function autoVoluntaryDiveCodes(subject, config, years) {
  const candidates = new Map();
  const add = (code, weight) => {
    code = canonicalDiveCode(code);
    if (!code) return;
    candidates.set(code, (candidates.get(code) || 0) + weight);
  };
  const addRowsForSubject = (dive, baseWeight) => {
    const tier = hpdVoluntaryEvidenceTier(dive);
    if (!tier.confirmed && !tier.possible) return;
    const code = dive.__diveCode || canonicalDiveCode(dive.dive_number);
    if (!code) return;
    const tierWeight = tier.confirmed ? baseWeight : Math.max(2, Math.round(baseWeight * 0.35));
    const names = splitTeamDiverNames(dive.__athlete);
    const has1 = names.some((name) => samePerson(name, subject.diver1)) || samePerson(dive.__athlete, subject.diver1);
    const has2 = subject.diver2 && (names.some((name) => samePerson(name, subject.diver2)) || samePerson(dive.__athlete, subject.diver2));
    if (subject.type !== "individual" && has1 && has2) add(code, tierWeight + 60);
    else if (subject.type !== "individual" && (has1 || has2)) add(code, Math.max(2, Math.round(tierWeight * 0.5)));
    else if (subject.type === "individual" && has1) add(code, tierWeight);
  };
  DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync).forEach((dive) => addRowsForSubject(dive, 45));
  DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && !dive.__isSync).forEach((dive) => addRowsForSubject(dive, 22));
  const output = [...candidates.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code]) => code).slice(0, 6);
  if (output.length) return output;
  return commonFieldVoluntaryCodes(config, years).slice(0, 4);
}

function buildSubjectSyncRows(subject, config, diveCodes, years) {
  if (subject.type === "individual") return [];
  const allRows = DATA.dives.filter((dive) => voluntaryDiveEventMatch(dive, config, years) && dive.__isSync && isLikelyVoluntaryDive(dive) && diveCodes.includes(dive.__diveCode));
  const selectedRows = allRows.map((dive) => {
    const names = splitTeamDiverNames(dive.__athlete);
    const side1 = names.some((name) => samePerson(name, subject.diver1)) || samePerson(dive.__athlete, subject.diver1);
    const side2 = subject.diver2 && (names.some((name) => samePerson(name, subject.diver2)) || samePerson(dive.__athlete, subject.diver2));
    const exactPair = names.length >= 2 && side1 && side2;
    const sourceSide = exactPair ? subject.label : (side1 ? subject.diver1 : side2 ? subject.diver2 : "");
    if (!exactPair && !sourceSide) return null;
    const tier = hpdVoluntaryEvidenceTier(dive);
    const evidenceLevel = exactPair ? `Pair evidence - ${tier.tier}` : `Single-side synchro evidence - ${tier.tier}`;
    const sourceNote = exactPair ? `Exact selected pair appears in the source row. ${tier.note}` : `Source row contains one selected diver; the selected partner is not shown on that source row. ${tier.note}`;
    return { dive, evidenceLevel, sourceSide, sourceNote, exactPair, tier };
  }).filter(Boolean);
  const grouped = groupBy(selectedRows, (item) => {
    const dive = item.dive;
    return item.exactPair ? `PAIR||${hpdVolSessionKey(dive)}` : `SOURCE_SIDE||${hpdVolLooseSessionKey(dive)}`;
  });
  return [...grouped.values()].map((items) => {
    const dives = items.map((item) => item.dive);
    const sampleItem = items[0] || {};
    const sample = sampleItem.dive || {};
    const hasExactPair = items.some((item) => item.exactPair);
    const sourceSides = unique(items.map((item) => item.sourceSide).filter(Boolean));
    const allConfirmed = items.every((item) => item.tier?.confirmed);
    const hasPossible = items.some((item) => item.tier?.possible);
    const evidenceLevel = hasExactPair
      ? (allConfirmed ? "Pair evidence - confirmed" : "Pair evidence - includes possible candidates")
      : (sourceSides.length >= 2 ? "Linked source-side evidence" : "Single-side synchro evidence") + (hasPossible ? " - includes possible candidates" : " - confirmed");
    const evidenceSuffix = hasExactPair ? "" : ` (${sourceSides.join(" + ") || "source side"}; selected pair not fully named in source row)`;
    const diveScores = {};
    const sourceByDive = {};
    diveCodes.forEach((code) => {
      const codeItems = items.filter((item) => item.dive.__diveCode === code);
      const exact = codeItems.filter((item) => item.exactPair).sort((a, b) => (b.dive.__score || 0) - (a.dive.__score || 0))[0];
      const matchItem = exact || codeItems.sort((a, b) => (hpdVoluntaryEvidenceTier(b.dive).priority - hpdVoluntaryEvidenceTier(a.dive).priority) || (b.dive.__score || 0) - (a.dive.__score || 0))[0];
      if (matchItem) {
        const tier = hpdVoluntaryEvidenceTier(matchItem.dive);
        diveScores[code] = matchItem.dive.__score;
        sourceByDive[code] = sourceDetailFromDive(matchItem.dive, {
          evidence: matchItem.evidenceLevel,
          pair: subject.label,
          selectedDiver1: subject.diver1,
          selectedDiver2: subject.diver2,
          sourceSide: matchItem.sourceSide,
          voluntaryTier: tier.tier,
          voluntaryNote: tier.note,
          note: hpdVolEvidenceSummaryForCode(items, code, subject),
          sessionRows: hpdVolDetailRowsFromItems(items.filter((item) => item.dive.__diveCode === code)),
          sessionAllRows: hpdVolDetailRowsFromItems(items),
        });
      }
    });
    const result = DATA.results.find((row) => row.__key === sample.__key) || DATA.results.find((row) => {
      if (!row.__isSync || row.__year !== sample.__year || row.__board !== sample.__board) return false;
      if (sample.__event && row.__event !== sample.__event) return false;
      return samePairName(row.__athlete, subject.diver1, subject.diver2) || sourceSides.some((side) => samePerson(row.__athlete, side));
    });
    return {
      context: [sample.__year, sample.__meet, sample.round_stage || sample.event_round || sample.__event].filter(Boolean).join(" - ") + evidenceSuffix,
      meet: sample.__meet,
      event: sample.__event,
      year: sample.__year,
      scores: dives.map((dive) => dive.__score).filter(isFiniteNumber),
      diveScores,
      sourceByDive,
      total: sum(Object.values(diveScores).filter(isFiniteNumber)),
      overallScore: result?.__score,
      place: result?.__place,
      evidenceLevel,
      result,
    };
  }).sort((a, b) => String(a.year).localeCompare(String(b.year)) || a.context.localeCompare(b.context));
}

function voluntaryFlatRowsForSync(item, subject, config, diveCodes) {
  return diveCodes.map((code) => {
    const detail = item.sourceByDive?.[code] || {};
    return {
      event_tab: config.label,
      report_subject: subject.label,
      section: "synchro_voluntary_or_candidate",
      athlete_or_pair: subject.label,
      diver_1: subject.diver1,
      diver_2: subject.diver2,
      board_platform: boardLabel(config.board),
      dive: code,
      dd: lookupOfficialDd(code, config.board, config.board === "platform" ? "10m" : config.board),
      score: item.diveScores[code] ?? "No data present",
      total_voluntary_score: item.total,
      overall_score: item.overallScore,
      place: item.place,
      best_context: item.context,
      source_meet: detail.meet,
      source_event: detail.event,
      source_year: detail.year,
      source_round: detail.round,
      evidence_level: item.diveScores[code] !== undefined ? item.evidenceLevel : "No data present",
      data_notes: item.diveScores[code] !== undefined ? (detail.voluntaryNote || "Source evidence retained for manual review. 01/02/03 is not used as a hard rule.") : "No data present for this dive in this session.",
    };
  });
}

function voluntaryFlatRowForIndividual(item, subject, config) {
  const actualCode = item.actualDiveCode || canonicalDiveCode(String(item.diveCode || "").replace(/\(.*\)/, ""));
  return {
    event_tab: config.label,
    report_subject: subject.label,
    section: "individual_or_near_match_evidence",
    athlete_or_pair: item.diver,
    diver_1: subject.diver1,
    diver_2: subject.diver2,
    board_platform: boardLabel(config.board),
    dive: item.diveCode,
    requested_dive: item.requestedDiveCode,
    actual_dive: actualCode,
    dd: lookupOfficialDd(actualCode, config.board, config.board === "platform" ? "10m" : config.board),
    best_score: isFiniteNumber(item.bestScore) ? item.bestScore : item.status,
    average_score: item.avgScore,
    times_competed: item.count,
    net_score: item.net,
    best_context: item.bestContext,
    source_meet: item.source?.meet,
    source_event: item.source?.event,
    source_year: item.source?.year,
    source_round: item.source?.round,
    evidence_level: item.evidenceLevel,
    data_notes: item.notes,
  };
}

function hpdVolEvidenceSummaryForCode(items, code, subject) {
  const codeItems = items.filter((item) => item.dive.__diveCode === code);
  const hasExact = codeItems.some((item) => item.exactPair || item.evidenceLevel === "Pair evidence");
  const sides = unique(codeItems.map((item) => item.sourceSide).filter(Boolean));
  const possible = codeItems.some((item) => hpdVoluntaryEvidenceTier(item.dive).possible);
  const suffix = possible ? " This is shown as a possible candidate, not a confirmed voluntary." : "";
  if (hasExact) return `Exact pair score found in the source row.${suffix}`;
  if (sides.length >= 2) return `Both selected divers have same-session source rows for ${code}; displayed as linked partner evidence.${suffix}`;
  if (sides.length === 1) return `${sides[0]} has a source row for ${code}; selected partner is not shown in that source row.${suffix}`;
  return "No source row for this dive in this session.";
}

function hpdVolSourceDetailHtml(detail) {
  const fields = [
    ["Evidence", detail.evidence], ["Evidence tier", detail.voluntaryTier], ["Report pair", detail.pair], ["Source athlete/team", detail.athlete], ["Source side", detail.sourceSide],
    ["Selected Diver 1", detail.selectedDiver1], ["Selected Diver 2", detail.selectedDiver2], ["Selected diver", detail.selectedDiver], ["Matched name", detail.matchedName],
    ["Requested dive", detail.requestedDive], ["Actual dive", detail.actualDive], ["Meet", detail.meet], ["Year", detail.year], ["Event", detail.event], ["Round", detail.round], ["Board", detail.board], ["Dive", detail.dive],
    ["Group", detail.group], ["DD", formatNumber(detail.dd, 2)], ["Score", formatNumber(detail.score, 1)], ["Net", formatNumber(detail.net, 1)],
    ["Place", formatPlace(detail.place)], ["Source", detail.source]
  ].filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "-");
  const notes = [detail.note, detail.voluntaryNote].filter(Boolean).map((note) => `<div class="source-note"><strong>Evidence note:</strong> ${escapeHtml(note)}</div>`).join("");
  const related = Array.isArray(detail.sessionRows) && detail.sessionRows.length ? `
    <div class="source-related"><h5>Rows behind this score</h5>
      <table><thead><tr><th>Source athlete/team</th><th>Evidence</th><th>Meet</th><th>Round</th><th>Dive</th><th>Score</th><th>Place</th></tr></thead><tbody>
        ${detail.sessionRows.map((row) => `<tr><td>${escapeHtml(row.athlete || row.pair || "")}</td><td>${escapeHtml(row.evidence || "")}</td><td>${escapeHtml(row.meet || "")}</td><td>${escapeHtml(row.round || "")}</td><td>${escapeHtml(row.dive || "")}</td><td>${formatNumber(row.score, 1)}</td><td>${formatPlace(row.place)}</td></tr>`).join("")}
      </tbody></table>
    </div>` : "";
  return `<h4>Source evidence for clicked score</h4>${notes}<div class="source-detail-grid">${fields.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>${related}`;
}

function voluntarySubjectBlockHtml(subject, config, diveCodes, block) {
  const syncHeader = ["Meet / session", ...diveCodes, "Total", "Overall", "Place", "Evidence"];
  const syncBody = block.syncRows.length ? block.syncRows.map((row) => `<tr><td>${escapeHtml(row.context)}</td>${diveCodes.map((code) => `<td>${row.diveScores[code] !== undefined ? sourceButton(row.diveScores[code], row.sourceByDive?.[code], formatNumber(row.diveScores[code], 1)) : "No data present"}</td>`).join("")}<td>${formatNumber(row.total, 1)}</td><td>${formatNumber(row.overallScore, 1)}</td><td>${formatPlace(row.place)}</td><td>${escapeHtml(row.evidenceLevel)}</td></tr>`).join("") : `<tr><td>No exact pair synchro data present</td>${diveCodes.map(() => "<td>No data present</td>").join("")}<td></td><td></td><td></td><td>${subject.type === "individual" ? "Individual-only" : "No pair evidence"}</td></tr>`;
  const indBody = block.individualRows.map((row) => `<tr><td>${escapeHtml(row.diver)}</td><td>${escapeHtml(row.diveCode)}</td><td>${row.status ? escapeHtml(row.status) : sourceButton(row.bestScore, row.source, formatNumber(row.bestScore, 1))}</td><td>${formatNumber(row.avgScore, 1)}</td><td>${formatInt(row.count)}</td><td>${escapeHtml(row.bestContext || "")}</td><td>${formatNumber(row.net, 1)}</td><td>${escapeHtml(row.evidenceLevel)}</td><td>${escapeHtml(row.notes || "")}</td></tr>`).join("");
  return `<section class="vol-workbook-block">
    <header><div><p class="eyebrow">${escapeHtml(config.label)}</p><h4>${escapeHtml(subject.label)}</h4></div><span class="panel-chip">${escapeHtml(subject.type.replace(/_/g, " "))}</span></header>
    <div class="candidate-legend"><span>Confirmed evidence comes from source labels or first-two-round synchro context.</span><span>Possible candidates include soft indicators such as 01/02/03 patterns or low DD and require human verification.</span><span>Near matches show same base dive with different position.</span></div>
    <div class="table-wrap workbook-table">${tableHtml(syncHeader, syncBody)}</div>
    <div class="table-wrap workbook-table compact-table">${tableHtml(["Individual", "Dive", "Best score", "Average", "Times", "Best context", "Net", "Evidence", "Notes"], indBody)}</div>
  </section>`;
}

function renderVoluntaryReportMatchQuality(workbook) {
  const panel = document.getElementById("volReportEvidenceQuality");
  if (!panel) return;
  if (!workbook || !workbook.flatRows) { panel.innerHTML = ""; return; }
  const rows = workbook.flatRows || [];
  const confirmedRows = rows.filter((row) => /confirmed|source-labeled|first-two-round/i.test(row.evidence_level || "")).length;
  const possibleRows = rows.filter((row) => /possible candidate|soft search hint|low DD/i.test(`${row.evidence_level || ""} ${row.data_notes || ""}`)).length;
  const nearRows = rows.filter((row) => /near match/i.test(`${row.evidence_level || ""} ${row.dive || ""} ${row.data_notes || ""}`)).length;
  const pairRows = rows.filter((row) => /Pair evidence/i.test(row.evidence_level || "")).length;
  const individualRows = rows.filter((row) => String(row.section).includes("individual")).length;
  const noData = rows.filter((row) => /No data present/i.test(row.data_notes || row.score || row.best_score || "")).length;
  const mergedNames = workbook.matchSummary?.mergedNameForms || 0;
  const exactSources = rows.filter((row) => row.source_meet || row.best_context).length;
  const details = (workbook.matchSummary?.notes || []).slice(0, 10).map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  panel.innerHTML = `
    <div class="evidence-quality-grid">
      <div class="evidence-quality-card"><span>Confirmed evidence</span><strong>${formatInt(confirmedRows)}</strong><em>Label or first-two-round context</em></div>
      <div class="evidence-quality-card"><span>Possible candidates</span><strong>${formatInt(possibleRows)}</strong><em>Soft indicators; verify manually</em></div>
      <div class="evidence-quality-card"><span>Near matches</span><strong>${formatInt(nearRows)}</strong><em>Same base dive, different position</em></div>
      <div class="evidence-quality-card"><span>Pair evidence</span><strong>${formatInt(pairRows)}</strong><em>Selected pair/source-side synchro rows</em></div>
      <div class="evidence-quality-card"><span>Individual evidence</span><strong>${formatInt(individualRows)}</strong><em>Individual and other-partner rows</em></div>
      <div class="evidence-quality-card"><span>Auto-merged names</span><strong>${formatInt(mergedNames)}</strong><em>Hidden aliases combined behind one display name</em></div>
      <div class="evidence-quality-card"><span>Source drilldowns</span><strong>${formatInt(exactSources)}</strong><em>Clickable scores show their source</em></div>
      <div class="evidence-quality-card"><span>No-data cells</span><strong>${formatInt(noData)}</strong><em>Only where no evidence exists in loaded history</em></div>
    </div>
    <details class="match-review-details"><summary>Matching coverage details</summary><ul>${details}</ul></details>`;
}

// Summary wording override for the soft-candidate voluntary evidence model.
function renderVoluntaryReport() {
  const summary = document.getElementById("volReportSummary");
  const settings = voluntaryReportSettings();
  if (summary) summary.innerHTML = `<div class="summary-card"><span>Building report</span><strong>Loading selected history</strong><em>This report searches independently from the main dashboard.</em></div>`;
  const promise = (async () => {
    await ensureVoluntaryReportDataLoaded(settings);
    state.voluntaryEvidenceSources = new Map();
    state.voluntaryEvidenceSourceCounter = 0;
    const workbook = buildVoluntaryEvidenceWorkbook(settings);
    state.voluntaryWorkbook = workbook;
    state.voluntaryReportRows = workbook.flatRows;
    renderVoluntaryWorkbookPreview(workbook);
    renderVoluntaryReportMatchQuality(workbook);
    if (summary) {
      const rows = workbook.flatRows.length;
      const pairRows = workbook.flatRows.filter((row) => /Pair evidence/i.test(row.evidence_level || "")).length;
      const possibleRows = workbook.flatRows.filter((row) => /possible candidate|soft candidate|soft search hint|low DD/i.test(`${row.evidence_level || ""} ${row.data_notes || ""}`)).length;
      const nearRows = workbook.flatRows.filter((row) => /near match/i.test(`${row.evidence_level || ""} ${row.dive || ""} ${row.data_notes || ""}`)).length;
      const noData = workbook.flatRows.filter((row) => /No data/i.test(row.data_notes || "") || row.score === "No data present" || row.best_score === "No data present").length;
      summary.innerHTML = `
        <div class="summary-card"><span>Workbook tabs</span><strong>${formatInt(workbook.sheets.length)}</strong><em>${workbook.sheets.map((sheet) => sheet.name).join(", ")}</em></div>
        <div class="summary-card"><span>Evidence rows</span><strong>${formatInt(rows)}</strong><em>Same data shown in-app and exported</em></div>
        <div class="summary-card"><span>Pair evidence rows</span><strong>${formatInt(pairRows)}</strong><em>Selected pair/source-side synchro evidence</em></div>
        <div class="summary-card"><span>Possible candidates</span><strong>${formatInt(possibleRows)}</strong><em>Soft signals, not hard voluntary rules</em></div>
        <div class="summary-card"><span>Near matches</span><strong>${formatInt(nearRows)}</strong><em>Same base dive, different position</em></div>
        <div class="summary-card"><span>No-data cells</span><strong>${formatInt(noData)}</strong><em>No guessing; data missing only after matching pass</em></div>`;
    }
    return workbook;
  })();
  return promise;
}
