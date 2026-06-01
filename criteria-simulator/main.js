const DATA = window.DIVE_APP_DATA || { results: [], dives: [], meta: {} };

const COLORS = {
  blue: "#171f69",
  red: "#e31937",
  gray: "#5f6062",
  lightBlue: "#8fc3ea",
  cyan: "#009ac7",
  green: "#087a5b",
  orange: "#a76200",
};

const CRITERIA_NOTES = {
  winterEligibility:
    "Winter Nationals eligibility model: athletes qualify by meeting event score standards at approved source meets. DD is required to compete at Winter Nationals, but the score may be earned without meeting DD.",
  winterQualifier:
    "Winter Qualifier advancement model: 1m and 3m use top 3 OR score standard; platform uses top 5 OR score standard. This model defaults to the Winter Nationals Qualifier source.",
  nationalQualifier:
    "USA Nationals qualifier model: top 12 finishers in the qualifier event advance to USA Diving National Championships. This model defaults to the Nationals Qualifier source.",
  custom:
    "Custom model: adjust exact meet names, round, placement cutoff, score threshold, DD threshold, and DD handling to test a policy scenario.",
};

const WINTER_SCORE_STANDARDS = {
  Female: {
    usa: { "1m": 235, "3m": 260, Platform: 250 },
    ncaa: { "1m": 282, "3m": 312, Platform: 250 },
  },
  Male: {
    usa: { "1m": 318, "3m": 360, Platform: 330 },
    ncaa: { "1m": 318, "3m": 360, Platform: 330 },
  },
};

const WINTER_DD_MINIMUMS = {
  Female: { "1m": 11.9, "3m": 13.7, Platform: 13.3 },
  Male: { "1m": 15.9, "3m": 17.2, Platform: 17.1 },
};

const NATIONAL_DD_MINIMUMS = {
  Female: { "1m": 11.4, "3m": 13.2, Platform: 13.2 },
  Male: { "1m": 15.4, "3m": 16.8, Platform: 16.3 },
};

const SCENARIO_STORAGE_KEY = "usad.criteriaSimulator.scenarios.v1";
const SCENARIO_SCHEMA_VERSION = 1;
const CERTIFICATION_NOTES_STORAGE_KEY = "usad.criteriaSimulator.certificationNotes.v1";

const OFFICIAL_DIVE_GROUPS = {
  "1": "Forward",
  "2": "Back",
  "3": "Reverse",
  "4": "Inward",
  "5": "Twister",
  "6": "Armstand",
};


const state = {
  lastPreset: "winterEligibility",
  thresholdEdited: false,
  ddThresholdEdited: false,
  activeScenarioId: null,
  scenarios: [],
  explanationRows: new Map(),
  activeExplanationKey: null,
  currentExplanation: null,
  diveLookup: { exact: new Map(), base: new Map() },
  staffMode: false,
  advancedVisible: false,
  linkScenarioLoaded: false,
  lastValidation: null,
  heatmapSelection: null,
  optimizerPreview: null,
  optimizerGrid: [],
  optimizerReady: false,
  certificationBundle: null,
  certificationNotes: {},
  certificationDetailsOpen: false,
  certificationActiveSection: "criteriaMet",
  guidedReviewOpen: false,
  guidedStep: 0,
  athleteSearchQuery: "",
  athleteSearchScope: "current",
  athleteSearchRows: new Map(),
  currentFiltered: [],
  currentEvaluated: [],
  currentQualified: [],
  currentBubble: [],
};

const ids = [
  "criteriaPreset",
  "genderFilter",
  "disciplineFilter",
  "roundFilter",
  "scoreMode",
  "athleteScope",
  "scoreThreshold",
  "ddThreshold",
  "topN",
  "ruleMode",
  "ddMode",
];

const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

const scenarioIds = [
  "scenarioSelect",
  "scenarioName",
  "scenarioStatus",
  "scenarioCreate",
  "scenarioSave",
  "scenarioDuplicate",
  "scenarioRename",
  "scenarioLoad",
  "scenarioDelete",
  "scenarioExport",
  "scenarioImport",
  "scenarioResetPreset",
  "scenarioImportFile",
];

const scenarioElements = Object.fromEntries(
  scenarioIds.map((id) => [id, document.getElementById(id)])
);

function officialDiveGroupCode(diveNumber) {
  const text = String(diveNumber || "").trim().toUpperCase();
  const match = text.match(/^(\d)/);
  if (!match) return null;
  const code = match[1];
  return OFFICIAL_DIVE_GROUPS[code] ? code : null;
}

function officialDiveGroupLabel(code) {
  const key = String(code || "").trim();
  return OFFICIAL_DIVE_GROUPS[key] ? `${key} ${OFFICIAL_DIVE_GROUPS[key]}` : "";
}

function officialDiveGroupName(code) {
  const key = String(code || "").trim();
  return OFFICIAL_DIVE_GROUPS[key] || "Other";
}

function cleanDiveDescription(dive) {
  const description = String(dive?.description || "").trim();
  const diveNumber = String(dive?.dive_number || "").trim();
  if (!description || description.toUpperCase() === diveNumber.toUpperCase()) return "";
  return description;
}

init();

function init() {
  DATA.results = DATA.results.map((row, index) => ({
    ...row,
    __row_index: index,
    posted_score: number(row.posted_score),
    phase_score_from_dives: number(row.phase_score_from_dives),
    phase_dive_count: number(row.phase_dive_count),
    phase_dd_sum: number(row.phase_dd_sum),
    ncaa_women_springboard_raw_6_dive_score: number(row.ncaa_women_springboard_raw_6_dive_score),
    ncaa_women_springboard_5cat_score: number(row.ncaa_women_springboard_5cat_score),
    ncaa_women_springboard_5cat_dd_sum: number(row.ncaa_women_springboard_5cat_dd_sum),
    ncaa_women_springboard_dropped_dive_score: number(row.ncaa_women_springboard_dropped_dive_score),
    place: number(row.place),
    meet_year: number(row.meet_year),
  }));

  DATA.dives = (DATA.dives || []).map((row) => {
    const canonicalGroupCode = officialDiveGroupCode(row.dive_number) || String(row.dive_category_code || "").trim() || null;
    const canonicalGroupLabel = officialDiveGroupLabel(canonicalGroupCode) || row.dive_category_label || "Unknown group";
    return {
      ...row,
      dive_order: number(row.dive_order),
      dd: number(row.dd),
      score: number(row.score),
      net_score: number(row.net_score),
      round_place: number(row.round_place),
      running_total_points: number(row.running_total_points),
      meet_year: number(row.meet_year),
      dive_category_code: canonicalGroupCode,
      dive_category_label: canonicalGroupLabel,
      official_group_code: canonicalGroupCode,
      official_group_label: canonicalGroupLabel,
    };
  });
  state.diveLookup = buildDiveLookups(DATA.dives);

  setText("summaryMeets", `${unique(DATA.results.map((row) => row.meet_id)).length} meets`);
  setText("summaryResults", `${formatInt(DATA.results.length)} results`);
  setText("summaryAthletes", `${formatInt(unique(DATA.results.map(athleteKey)).length)} athletes`);

  fillSelect(elements.genderFilter, unique(DATA.results.map((row) => row.gender)).filter(Boolean), "Female");
  fillSelect(elements.disciplineFilter, unique(DATA.results.map((row) => row.discipline)).filter(Boolean), "Platform");
  renderMeetFilters();
  applyPresetDefaults(true);
  initScenarioManager();
  initStaffModeAndSharing();
  initScenarioSnapshot();
  initGuidedCriteriaReview();
  initAthleteSearch();
  initStaffReviewExports();
  initValidationDashboard();
  initOptimizerAndCertification();
  applyScenarioFromHash();
  initRuleExplanationPanel();

  ids.forEach((id) => {
    elements[id].addEventListener("change", () => {
      if (id === "criteriaPreset") {
        applyPresetDefaults(false);
      } else if (id === "genderFilter" || id === "disciplineFilter") {
        applyEventDefaults();
      } else if (id === "scoreThreshold") {
        state.thresholdEdited = true;
      } else if (id === "ddThreshold") {
        state.ddThresholdEdited = true;
        autoEnableDdFilter();
      }
      render();
    });
  });
  elements.scoreThreshold.addEventListener("input", () => {
    state.thresholdEdited = true;
    render();
  });
  elements.ddThreshold.addEventListener("input", () => {
    state.ddThresholdEdited = true;
    autoEnableDdFilter();
    render();
  });

  document.getElementById("meetFilters").addEventListener("change", render);
  document.getElementById("heatmapMetric")?.addEventListener("change", render);
  document.getElementById("qualificationFrontier")?.addEventListener("click", handleVisualizationExplanationClick);
  document.getElementById("qualificationFrontier")?.addEventListener("keydown", handleVisualizationExplanationKeydown);
  document.getElementById("eventStrengthHeatmap")?.addEventListener("click", handleHeatmapClick);
  document.getElementById("eventStrengthHeatmap")?.addEventListener("keydown", handleHeatmapKeydown);
  document.getElementById("exactMeetSelectAll")?.addEventListener("click", () => {
    setMeetIds(allMeetIds());
    render();
  });
  document.getElementById("exactMeetClearAll")?.addEventListener("click", () => {
    setMeetIds([]);
    render();
  });
  render();
}

function renderMeetFilters() {
  const container = document.getElementById("meetFilters");
  const meets = unique(DATA.results.map((row) => row.meet_id))
    .map((meetId) => DATA.results.find((row) => row.meet_id === meetId))
    .filter(Boolean)
    .sort(compareMeetFilterRows);
  const groups = [
    { key: "junior", label: "Junior Events" },
    { key: "usa", label: "USA Events" },
    { key: "aqua", label: "Aqua Events" },
  ];

  container.innerHTML = groups
    .map(
      (group) => {
        const rows = meets.filter((row) => meetFilterGroup(row) === group.key);
        if (!rows.length) return "";
        return `
          <div class="meet-filter-group">
            <div class="meet-filter-heading">${escapeHtml(group.label)}</div>
            ${rows.map(renderMeetFilterItem).join("")}
          </div>
        `;
      }
    )
    .join("");
}

function renderMeetFilterItem(row) {
  return `
    <label class="check-item">
      <input type="checkbox" value="${escapeAttr(row.meet_id)}" checked />
      <span>${escapeHtml(meetLabel(row))}</span>
    </label>
  `;
}

function meetFilterGroup(row) {
  const family = String(row.competition_family || "").toLowerCase();
  const group = String(row.competition_group || "").toLowerCase();
  const name = String(row.meet_name || "").toLowerCase();
  if (family.includes("world aquatics") || name.includes("american cup")) return "aqua";
  if (group.includes("junior") || name.includes("junior")) return "junior";
  return "usa";
}

function compareMeetFilterRows(a, b) {
  return safeNumber(b.meet_year) - safeNumber(a.meet_year) || meetLabel(a).localeCompare(meetLabel(b));
}

function initScenarioManager() {
  state.scenarios = loadScenarioStore();
  renderScenarioList();

  scenarioElements.scenarioSelect.addEventListener("change", () => {
    const scenario = scenarioById(scenarioElements.scenarioSelect.value);
    scenarioElements.scenarioName.value = scenario?.name || "";
    if (scenario) loadScenario(scenario.id);
  });
  scenarioElements.scenarioCreate.addEventListener("click", createScenarioFromCurrent);
  scenarioElements.scenarioSave.addEventListener("click", saveActiveScenario);
  scenarioElements.scenarioDuplicate.addEventListener("click", duplicateActiveScenario);
  scenarioElements.scenarioRename.addEventListener("click", renameActiveScenario);
  scenarioElements.scenarioLoad.addEventListener("click", () => loadScenario(scenarioElements.scenarioSelect.value));
  scenarioElements.scenarioDelete.addEventListener("click", deleteActiveScenario);
  scenarioElements.scenarioExport.addEventListener("click", exportActiveScenario);
  scenarioElements.scenarioImport.addEventListener("click", () => scenarioElements.scenarioImportFile.click());
  scenarioElements.scenarioImportFile.addEventListener("change", importScenarioFile);
  scenarioElements.scenarioResetPreset.addEventListener("click", resetToPresetDefaults);

  if (state.activeScenarioId && scenarioById(state.activeScenarioId)) {
    loadScenario(state.activeScenarioId, { skipPersist: true });
  }
}

function loadScenarioStore() {
  try {
    const raw = window.localStorage?.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) return [];
    const payload = JSON.parse(raw);
    const imported = normalizeImportedScenarios(payload);
    state.activeScenarioId = typeof payload?.activeScenarioId === "string" ? payload.activeScenarioId : null;
    return imported;
  } catch (error) {
    setScenarioStatus("Saved scenarios could not be read. The app is using defaults.", "error");
    return [];
  }
}

function persistScenarios() {
  try {
    window.localStorage?.setItem(
      SCENARIO_STORAGE_KEY,
      JSON.stringify({
        version: SCENARIO_SCHEMA_VERSION,
        activeScenarioId: state.activeScenarioId,
        scenarios: state.scenarios,
      })
    );
  } catch (error) {
    setScenarioStatus("Scenarios could not be saved in this browser.", "error");
  }
}

function renderScenarioList() {
  if (!state.scenarios.length) {
    scenarioElements.scenarioSelect.innerHTML = `<option value="">No saved scenarios</option>`;
    scenarioElements.scenarioName.value = "";
  } else {
    scenarioElements.scenarioSelect.innerHTML = state.scenarios
      .map((scenario) => `<option value="${escapeAttr(scenario.id)}">${escapeHtml(scenario.name)}</option>`)
      .join("");
    if (state.activeScenarioId && scenarioById(state.activeScenarioId)) {
      scenarioElements.scenarioSelect.value = state.activeScenarioId;
      scenarioElements.scenarioName.value = scenarioById(state.activeScenarioId).name;
    } else {
      scenarioElements.scenarioSelect.value = state.scenarios[0].id;
      scenarioElements.scenarioName.value = state.scenarios[0].name;
    }
  }
  updateScenarioButtons();
  updateScenarioStatus();
}

function updateScenarioButtons() {
  const hasActive = Boolean(state.activeScenarioId && scenarioById(state.activeScenarioId));
  const hasSaved = state.scenarios.length > 0;
  scenarioElements.scenarioSave.disabled = !hasActive;
  scenarioElements.scenarioDuplicate.disabled = !hasActive;
  scenarioElements.scenarioRename.disabled = !hasActive;
  scenarioElements.scenarioDelete.disabled = !hasActive;
  scenarioElements.scenarioLoad.disabled = !hasSaved;
}

function createScenarioFromCurrent() {
  const name = uniqueScenarioName(scenarioElements.scenarioName.value.trim() || "Criteria Scenario");
  const scenario = buildScenario(name, captureControls());
  state.scenarios.push(scenario);
  state.activeScenarioId = scenario.id;
  persistScenarios();
  renderScenarioList();
  setScenarioStatus(`Saved scenario: ${scenario.name}`, "saved");
  render();
}

function saveActiveScenario() {
  const scenario = scenarioById(state.activeScenarioId);
  if (!scenario) {
    setScenarioStatus("Create a scenario before saving updates.", "error");
    return;
  }
  const name = scenarioElements.scenarioName.value.trim();
  if (name) scenario.name = name;
  scenario.controls = captureControls();
  scenario.updatedAt = new Date().toISOString();
  persistScenarios();
  renderScenarioList();
  setScenarioStatus(`Saved scenario: ${scenario.name}`, "saved");
  render();
}

function duplicateActiveScenario() {
  const scenario = scenarioById(state.activeScenarioId);
  if (!scenario) {
    setScenarioStatus("Load or create a scenario before duplicating.", "error");
    return;
  }
  const copyName = uniqueScenarioName(`${scenario.name} Copy`);
  const copy = buildScenario(copyName, captureControls());
  state.scenarios.push(copy);
  state.activeScenarioId = copy.id;
  persistScenarios();
  renderScenarioList();
  setScenarioStatus(`Created duplicate: ${copy.name}`, "saved");
  render();
}

function renameActiveScenario() {
  const scenario = scenarioById(state.activeScenarioId);
  const name = scenarioElements.scenarioName.value.trim();
  if (!scenario) {
    setScenarioStatus("Load or create a scenario before renaming.", "error");
    return;
  }
  if (!name) {
    setScenarioStatus("Enter a scenario name before renaming.", "error");
    return;
  }
  scenario.name = name;
  scenario.updatedAt = new Date().toISOString();
  persistScenarios();
  renderScenarioList();
  updateScenarioStatus();
}

function loadScenario(id, options = {}) {
  const scenario = scenarioById(id);
  if (!scenario) {
    setScenarioStatus("Choose a saved scenario to load.", "error");
    return;
  }
  applyControls(scenario.controls);
  state.activeScenarioId = scenario.id;
  scenarioElements.scenarioName.value = scenario.name;
  if (!options.skipPersist) persistScenarios();
  renderScenarioList();
  render();
}

function deleteActiveScenario() {
  const scenario = scenarioById(state.activeScenarioId);
  if (!scenario) {
    setScenarioStatus("No active scenario to delete.", "error");
    return;
  }
  if (window.confirm && !window.confirm(`Delete "${scenario.name}"?`)) return;
  state.scenarios = state.scenarios.filter((item) => item.id !== scenario.id);
  state.activeScenarioId = null;
  persistScenarios();
  renderScenarioList();
  setScenarioStatus(`Deleted scenario: ${scenario.name}`, "");
  render();
}

function exportActiveScenario() {
  const scenario =
    scenarioById(state.activeScenarioId) ||
    buildScenario(scenarioElements.scenarioName.value.trim() || "Unsaved Criteria Scenario", captureControls());
  const exportPayload = {
    version: SCENARIO_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    scenario,
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(scenario.name)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setScenarioStatus(`Exported scenario: ${scenario.name}`, "saved");
}

function importScenarioFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => importScenarioJson(String(reader.result || ""));
  reader.onerror = () => setScenarioStatus("Scenario JSON could not be read.", "error");
  reader.readAsText(file);
}

function importScenarioJson(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    setScenarioStatus("Imported JSON is malformed.", "error");
    return;
  }
  const imported = normalizeImportedScenarios(payload, { imported: true });
  if (!imported.length) {
    setScenarioStatus("Imported JSON does not contain a usable scenario.", "error");
    return;
  }
  const now = new Date().toISOString();
  const cleaned = imported.map((scenario) => ({
    ...scenario,
    id: createScenarioId(),
    name: uniqueScenarioName(scenario.name || "Imported Scenario"),
    createdAt: now,
    updatedAt: now,
  }));
  state.scenarios.push(...cleaned);
  state.activeScenarioId = cleaned[cleaned.length - 1].id;
  persistScenarios();
  renderScenarioList();
  loadScenario(state.activeScenarioId);
  setScenarioStatus(`Imported ${cleaned.length} scenario${cleaned.length === 1 ? "" : "s"}.`, "saved");
}

function resetToPresetDefaults() {
  applyPresetDefaults(false);
  setMeetIds(allMeetIds());
  state.thresholdEdited = false;
  state.ddThresholdEdited = false;
  render();
}

function captureControls() {
  return {
    criteriaPreset: elements.criteriaPreset.value,
    genderFilter: elements.genderFilter.value,
    disciplineFilter: elements.disciplineFilter.value,
    roundFilter: elements.roundFilter.value,
    scoreMode: elements.scoreMode.value,
    athleteScope: elements.athleteScope.value,
    scoreThreshold: elements.scoreThreshold.value,
    ddThreshold: elements.ddThreshold.value,
    topN: elements.topN.value,
    ruleMode: elements.ruleMode.value,
    ddMode: elements.ddMode.value,
    selectedMeetIds: [...selectedMeetIds()].sort(),
    thresholdEdited: Boolean(state.thresholdEdited),
    ddThresholdEdited: Boolean(state.ddThresholdEdited),
  };
}

function applyControls(rawControls) {
  const controls = normalizeControls(rawControls);
  setSelectValue(elements.criteriaPreset, controls.criteriaPreset);
  setSelectValue(elements.genderFilter, controls.genderFilter);
  setSelectValue(elements.disciplineFilter, controls.disciplineFilter);
  setSelectValue(elements.roundFilter, controls.roundFilter);
  setSelectValue(elements.scoreMode, controls.scoreMode);
  setSelectValue(elements.athleteScope, controls.athleteScope);
  elements.scoreThreshold.value = controls.scoreThreshold ?? "";
  elements.ddThreshold.value = controls.ddThreshold ?? "";
  elements.topN.value = controls.topN ?? "";
  setSelectValue(elements.ruleMode, controls.ruleMode);
  setSelectValue(elements.ddMode, controls.ddMode);
  state.thresholdEdited = Boolean(controls.thresholdEdited);
  state.ddThresholdEdited = Boolean(controls.ddThresholdEdited);
  setMeetIds(controls.selectedMeetIds);
}

function normalizeImportedScenarios(payload, options = {}) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.scenarios)) {
    return payload.scenarios.map((scenario, index) => normalizeScenario(scenario, `Imported Scenario ${index + 1}`));
  }
  if (payload.scenario) {
    return [normalizeScenario(payload.scenario, "Imported Scenario")];
  }
  if (payload.controls || payload.criteriaPreset) {
    return [normalizeScenario(payload, options.imported ? "Imported Scenario" : "Criteria Scenario")];
  }
  return [];
}

function normalizeScenario(rawScenario, fallbackName) {
  const controlsSource = rawScenario?.controls || rawScenario || {};
  const now = new Date().toISOString();
  return {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    id: typeof rawScenario?.id === "string" ? rawScenario.id : createScenarioId(),
    name: String(rawScenario?.name || fallbackName || "Criteria Scenario").trim(),
    controls: normalizeControls(controlsSource),
    createdAt: rawScenario?.createdAt || now,
    updatedAt: rawScenario?.updatedAt || now,
  };
}

function normalizeControls(rawControls = {}) {
  const fallback = {
    criteriaPreset: elements.criteriaPreset.value,
    genderFilter: elements.genderFilter.value,
    disciplineFilter: elements.disciplineFilter.value,
    roundFilter: elements.roundFilter.value,
    scoreMode: elements.scoreMode.value,
    athleteScope: elements.athleteScope.value,
    scoreThreshold: elements.scoreThreshold.value,
    ddThreshold: elements.ddThreshold.value,
    topN: elements.topN.value,
    ruleMode: elements.ruleMode.value,
    ddMode: elements.ddMode.value,
    selectedMeetIds: allMeetIds(),
    thresholdEdited: state.thresholdEdited,
    ddThresholdEdited: state.ddThresholdEdited,
  };
  return {
    criteriaPreset: selectValueOrFallback(elements.criteriaPreset, rawControls.criteriaPreset, fallback.criteriaPreset),
    genderFilter: selectValueOrFallback(elements.genderFilter, rawControls.genderFilter, fallback.genderFilter),
    disciplineFilter: selectValueOrFallback(elements.disciplineFilter, rawControls.disciplineFilter, fallback.disciplineFilter),
    roundFilter: selectValueOrFallback(elements.roundFilter, rawControls.roundFilter, fallback.roundFilter),
    scoreMode: selectValueOrFallback(elements.scoreMode, rawControls.scoreMode, fallback.scoreMode),
    athleteScope: selectValueOrFallback(elements.athleteScope, rawControls.athleteScope, fallback.athleteScope),
    scoreThreshold: rawControls.scoreThreshold ?? fallback.scoreThreshold,
    ddThreshold: rawControls.ddThreshold ?? fallback.ddThreshold,
    topN: rawControls.topN ?? fallback.topN,
    ruleMode: selectValueOrFallback(elements.ruleMode, rawControls.ruleMode, fallback.ruleMode),
    ddMode: selectValueOrFallback(elements.ddMode, rawControls.ddMode, fallback.ddMode),
    selectedMeetIds: normalizeFilterValues(
      rawControls.selectedMeetIds || rawControls.selectedMeetFilters || rawControls.meetIds || meetIdsFromLegacySources(rawControls.selectedSources || rawControls.sources) || fallback.selectedMeetIds,
      allMeetIds()
    ),
    thresholdEdited: rawControls.thresholdEdited ?? inferThresholdEdited(rawControls),
    ddThresholdEdited: rawControls.ddThresholdEdited ?? inferDdThresholdEdited(rawControls),
  };
}

function buildScenario(name, controls) {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    id: createScenarioId(),
    name,
    controls,
    createdAt: now,
    updatedAt: now,
  };
}

function updateScenarioStatus() {
  const scenario = scenarioById(state.activeScenarioId);
  updateScenarioButtons();
  if (!scenario) {
    setScenarioStatus("No saved scenario loaded.", "");
    return;
  }
  const isDirty = stableControls(captureControls()) !== stableControls(scenario.controls);
  setScenarioStatus(
    isDirty ? `Unsaved changes to ${scenario.name}` : `Saved: ${scenario.name}`,
    isDirty ? "dirty" : "saved"
  );
}

function setScenarioStatus(message, statusClass) {
  scenarioElements.scenarioStatus.textContent = message;
  scenarioElements.scenarioStatus.className = `scenario-status${statusClass ? ` ${statusClass}` : ""}`;
}

function applyPresetDefaults(initial) {
  const preset = elements.criteriaPreset.value;
  state.lastPreset = preset;

  if (preset === "winterEligibility") {
    elements.ruleMode.value = "scoreOnly";
    elements.roundFilter.value = "any";
    elements.scoreMode.value = "phaseOrStandalone";
    elements.ddMode.value = "ignore";
    setMeetIds(meetIdsForSources([
      "USA Diving / USA Diving Nationals",
      "USA Diving / USA Diving Nationals Qualifier",
      "USA Diving / USA Diving Junior Nationals",
      "USA Diving / USA Diving Olympic Trials",
      "USA Diving / USA Diving Olympic Trials Qualifier",
      "USA Diving / USA Diving Winter Nationals",
      "USA Diving / USA Diving Winter Nationals Qualifier",
      "NCAA / NCAA Division I Championships / Division I",
      "World Aquatics / World Aquatics Championships",
      "World Aquatics / World Aquatics Recognized Event",
      "World Aquatics / World Aquatics World Cup",
    ]));
  } else if (preset === "winterQualifier") {
    elements.ruleMode.value = "topNOrScore";
    elements.roundFilter.value = "Final";
    elements.scoreMode.value = "phaseOrStandalone";
    elements.ddMode.value = "ignore";
    setMeetIds(meetIdsForSources(["USA Diving / USA Diving Winter Nationals Qualifier"]));
  } else if (preset === "nationalQualifier") {
    elements.ruleMode.value = "topNOnly";
    elements.roundFilter.value = "Final";
    elements.scoreMode.value = "posted";
    elements.ddMode.value = "ignore";
    setMeetIds(meetIdsForSources(["USA Diving / USA Diving Nationals Qualifier"]));
  } else if (preset === "custom" && initial) {
    setMeetIds(allMeetIds());
  }

  applyEventDefaults();
}

function applyEventDefaults() {
  const preset = elements.criteriaPreset.value;
  const gender = elements.genderFilter.value;
  const discipline = elements.disciplineFilter.value;

  if (preset === "nationalQualifier") {
    elements.topN.value = 12;
    elements.scoreThreshold.value = "";
    elements.ddThreshold.value = defaultDdMinimumForSelection(gender, discipline, preset) || "";
    state.thresholdEdited = false;
    state.ddThresholdEdited = false;
    return;
  }

  if (preset === "winterQualifier") {
    elements.topN.value = discipline === "Platform" ? 5 : 3;
    elements.scoreThreshold.value = winterThresholdForSelection(gender, discipline, "usa") || "";
    elements.ddThreshold.value = defaultDdMinimumForSelection(gender, discipline, preset) || "";
    state.thresholdEdited = false;
    state.ddThresholdEdited = false;
    return;
  }

  if (preset === "winterEligibility") {
    elements.topN.value = 0;
    elements.scoreMode.value = shouldDefaultToNcaaWomenFiveCategoryMode()
      ? "ncaaWomen5Category"
      : "phaseOrStandalone";
    elements.scoreThreshold.value = winterThresholdForSelection(gender, discipline, "usa") || "";
    elements.ddThreshold.value = defaultDdMinimumForSelection(gender, discipline, preset) || "";
    state.thresholdEdited = false;
    state.ddThresholdEdited = false;
  }
}

function shouldDefaultToNcaaWomenFiveCategoryMode() {
  return (
    elements.criteriaPreset.value === "winterEligibility" &&
    elements.genderFilter.value === "Female" &&
    (elements.disciplineFilter.value === "1m" || elements.disciplineFilter.value === "3m") &&
    selectedMeetRows().some((row) => String(sourceKey(row)).startsWith("NCAA /"))
  );
}


function initAthleteSearch() {
  const input = document.getElementById("athleteSearchInput");
  const scope = document.getElementById("athleteSearchScope");
  const clear = document.getElementById("athleteSearchClear");
  const results = document.getElementById("athleteSearchResults");
  if (!input || !scope || !clear || !results) return;

  input.addEventListener("input", () => {
    state.athleteSearchQuery = input.value;
    renderAthleteSearch(state.currentFiltered, state.currentEvaluated, state.currentQualified, state.currentBubble);
  });
  scope.addEventListener("change", () => {
    state.athleteSearchScope = scope.value;
    renderAthleteSearch(state.currentFiltered, state.currentEvaluated, state.currentQualified, state.currentBubble);
  });
  clear.addEventListener("click", () => {
    input.value = "";
    state.athleteSearchQuery = "";
    renderAthleteSearch(state.currentFiltered, state.currentEvaluated, state.currentQualified, state.currentBubble);
    input.focus();
  });
  results.addEventListener("click", handleAthleteSearchClick);
  results.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const button = event.target.closest("button[data-search-open], button[data-search-load]");
    if (!button) return;
    event.preventDefault();
    button.click();
  });
}

function renderAthleteSearch(filtered, evaluated, qualified, bubble) {
  const container = document.getElementById("athleteSearchResults");
  if (!container) return;
  const input = document.getElementById("athleteSearchInput");
  const scope = document.getElementById("athleteSearchScope");
  const query = normalizeSearchText(input?.value || state.athleteSearchQuery || "");
  const scopeValue = scope?.value || state.athleteSearchScope || "current";
  state.athleteSearchRows = new Map();

  if (query.length < 2) {
    container.innerHTML = `<div class="athlete-search-empty">Type at least 2 characters to search ${scopeValue === "all" ? "all loaded results" : "the current scenario"}.</div>`;
    return;
  }

  const qualifiedKeys = new Set((qualified || []).map((row) => chartRowKey(row)));
  const bubbleKeys = new Set((bubble || []).map((row) => chartRowKey(row)));
  let matches = [];

  if (scopeValue === "all") {
    matches = DATA.results
      .filter((row) => athleteSearchText(row).includes(query))
      .slice(0, 40)
      .map((row) => ({ row, evaluated: null, mode: "all" }));
  } else {
    matches = (evaluated || [])
      .filter((row) => athleteSearchText(row).includes(query))
      .slice(0, 40)
      .map((row) => ({ row, evaluated: row, mode: "current" }));
  }

  if (!matches.length) {
    const allSuggestion = scopeValue === "current" ? ` <button type="button" class="link-button" data-search-switch-all>Search all loaded results</button>` : "";
    container.innerHTML = `<div class="athlete-search-empty">No matches found.${allSuggestion}</div>`;
    container.querySelector("[data-search-switch-all]")?.addEventListener("click", () => {
      if (scope) scope.value = "all";
      state.athleteSearchScope = "all";
      renderAthleteSearch(filtered, evaluated, qualified, bubble);
    });
    return;
  }

  const rowsMarkup = matches
    .map(({ row, mode }) => {
      const key = searchRowKey(row);
      state.athleteSearchRows.set(key, row);
      const status = mode === "current" ? athleteSearchStatus(row, qualifiedKeys, bubbleKeys) : "Load context";
      const score = mode === "current" ? displayScoreValue(row.analysis_score) : displayScoreValue(row.phase_score_from_dives || row.posted_score);
      const action = mode === "current"
        ? `<button type="button" data-search-open="${escapeAttr(key)}">Open audit</button>`
        : `<button type="button" data-search-load="${escapeAttr(key)}">Load context</button>`;
      return `
        <article class="athlete-search-card ${mode === "current" ? "current" : "all"}">
          <div class="athlete-search-card-main">
            <strong>${escapeHtml(row.diver_name || "Unnamed athlete")}</strong>
            <span>${escapeHtml(teamNationalityLabel(row))}</span>
            <em>${escapeHtml(meetLabel(row))}</em>
            <small>${escapeHtml(eventDescription(row))} • ${escapeHtml(row.round_stage || "Round not listed")} • ${escapeHtml(score)}</small>
          </div>
          <div class="athlete-search-card-actions">
            <span class="athlete-search-status">${escapeHtml(status)}</span>
            ${action}
          </div>
        </article>`;
    })
    .join("");

  const scopeNote = scopeValue === "all"
    ? "All-results search can load the athlete's event, round, and exact meet into the current scenario before opening the audit."
    : `Showing matches from ${formatInt(filtered?.length || 0)} currently included result rows.`;
  container.innerHTML = `<div class="athlete-search-count">${formatInt(matches.length)} match${matches.length === 1 ? "" : "es"}. ${escapeHtml(scopeNote)}</div>${rowsMarkup}`;
}

function athleteSearchText(row) {
  return normalizeSearchText([
    row.diver_name,
    row.team_name,
    row.nat,
    row.meet_name,
    row.competition_family,
    row.competition_group,
    row.ncaa_division,
    row.event_name,
    row.event_level,
    row.age_group,
    row.gender,
    row.discipline,
    row.round_stage,
  ].filter(Boolean).join(" "));
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchRowKey(row) {
  return String(row.__row_index ?? [row.meet_id, row.event_id, row.result_set_id, row.diver_id, row.round_stage, row.place].map(keyPart).join("::"));
}

function athleteSearchStatus(row, qualifiedKeys, bubbleKeys) {
  const key = chartRowKey(row);
  if (row.qualified || qualifiedKeys.has(key)) return "Criteria met";
  if (bubbleKeys.has(key)) return "Bubble";
  if (needsDataVerification(row)) return "Data note";
  return "In current scenario";
}

function handleAthleteSearchClick(event) {
  const openButton = event.target.closest("button[data-search-open]");
  if (openButton) {
    const row = state.athleteSearchRows.get(openButton.dataset.searchOpen);
    if (!row) return;
    const key = registerExplanationRow(row, "search");
    openRuleExplanation(key);
    return;
  }
  const loadButton = event.target.closest("button[data-search-load]");
  if (loadButton) {
    const row = state.athleteSearchRows.get(loadButton.dataset.searchLoad);
    if (!row) return;
    loadSearchResultContext(row);
  }
}

function loadSearchResultContext(row) {
  if (row.gender && elements.genderFilter.value !== row.gender) elements.genderFilter.value = row.gender;
  if (row.discipline && elements.disciplineFilter.value !== row.discipline) elements.disciplineFilter.value = row.discipline;
  applyEventDefaults();
  if (row.round_stage && [...elements.roundFilter.options].some((option) => option.value === row.round_stage)) {
    elements.roundFilter.value = row.round_stage;
  }
  const meetIds = selectedMeetIds();
  if (row.meet_id != null) meetIds.add(String(row.meet_id));
  setMeetIds([...meetIds]);
  const input = document.getElementById("athleteSearchInput");
  const scope = document.getElementById("athleteSearchScope");
  if (scope) scope.value = "current";
  state.athleteSearchScope = "current";
  render();
  const evaluated = evaluateRow(row);
  const key = registerExplanationRow(evaluated, "search-loaded");
  openRuleExplanation(key);
  if (input) input.focus({ preventScroll: true });
}

function render() {
  const filtered = filteredRows();
  const comparisonRows = filteredRows({ ignoreRound: true });
  const evaluated = filtered.map((row) => evaluateRow(row));
  const qualified = bestQualifiedRows(evaluated);
  const bubble = bubbleRows(evaluated, qualified);
  const ddKnownCount = filtered.filter((row) => isFiniteNumber(row.phase_dd_sum)).length;
  state.currentFiltered = filtered;
  state.currentEvaluated = evaluated;
  state.currentQualified = qualified;
  state.currentBubble = bubble;
  state.explanationRows = new Map();

  setText("criteriaNote", CRITERIA_NOTES[elements.criteriaPreset.value]);
  setText("formatNote", formatNotes(comparisonRows));
  setText("kpiQualified", formatInt(qualified.length));
  setText("kpiBubble", formatInt(bubble.length));
  setText("kpiRows", formatInt(filtered.length));
  setText("kpiDdKnown", filtered.length ? `${Math.round((ddKnownCount / filtered.length) * 100)}%` : "0%");
  setText("qualifiedSubtitle", `Best qualifying result per athlete from ${formatInt(filtered.length)} included result rows.`);

  renderQualifiedTable(qualified);
  renderBubbleTable(bubble);
  renderQualificationFrontier(evaluated, qualified, bubble);
  renderEventStrengthHeatmap(evaluated, qualified, bubble);
  renderSourceImpact(qualified);
  renderValidationDashboard(filtered, evaluated, qualified, bubble);
  renderGuidedCriteriaReview(filtered, evaluated, qualified, bubble);
  renderAthleteSearch(filtered, evaluated, qualified, bubble);
  updateScenarioSnapshot(filtered, qualified, bubble, state.lastValidation);
  renderCriteriaOptimizer(filtered, evaluated, qualified, bubble);
  renderCertificationCenter(evaluated, qualified, bubble);
  renderModeVisibility();
  refreshOpenExplanation();
  updateScenarioStatus();
}

function filteredRows(options = {}) {
  const gender = elements.genderFilter.value;
  const discipline = elements.disciplineFilter.value;
  const round = elements.roundFilter.value;
  const checkedMeets = selectedMeetIds();

  return DATA.results.filter((row) => {
    if (row.gender !== gender) return false;
    if (row.discipline !== discipline) return false;
    if (!options.ignoreRound && round !== "any" && row.round_stage !== round) return false;
    if (!checkedMeets.has(String(row.meet_id))) return false;
    if (!athleteScopePass(row)) return false;
    return true;
  });
}

function evaluateRow(row, simulatedThreshold, simulatedDdThreshold, simulatedDdMode) {
  const threshold = thresholdForRow(row, simulatedThreshold);
  const topN = number(elements.topN.value);
  const score = scoreValue(row);
  const scoreBasis = scoreBasisLabel(row);
  const rawScorePass = isFiniteNumber(threshold) && isFiniteNumber(score) && score >= threshold;
  const topPass = isFiniteNumber(topN) && topN > 0 && isFiniteNumber(row.place) && row.place <= topN;
  const ddPass = ddIsSatisfied(row, simulatedDdThreshold, simulatedDdMode);
  const rule = elements.ruleMode.value;
  const ruleAllowsScore = rule === "scoreOnly" || rule === "topNOrScore";
  const ruleAllowsTopN = rule === "topNOnly" || rule === "topNOrScore";

  let rulePass = false;
  if (rule === "scoreOnly") rulePass = rawScorePass;
  if (rule === "topNOnly") rulePass = topPass;
  if (rule === "topNOrScore") rulePass = topPass || rawScorePass;

  const explanation = buildRuleExplanation(row, {
    threshold,
    topN,
    score,
    scoreBasis,
    rawScorePass,
    topPass,
    ddPass,
    rule,
    ruleAllowsScore,
    ruleAllowsTopN,
    rulePass,
  });

  return {
    ...row,
    analysis_score: score,
    threshold_used: threshold,
    score_basis: scoreBasis,
    dd_total_used: ddPass.total,
    dd_minimum_used: ddPass.minimum,
    dd_status: ddStatusLabel(ddPass),
    qualified: rulePass && ddPass.pass,
    reason: explanation.reason,
    threshold_gap: isFiniteNumber(threshold) && isFiniteNumber(score) ? threshold - score : null,
    explanation,
  };
}

function autoEnableDdFilter() {
  if (isFiniteNumber(number(elements.ddThreshold.value)) && elements.ddMode.value === "ignore") {
    elements.ddMode.value = "knownOnly";
  }
}

function ddIsSatisfied(row, simulatedMinimum, simulatedMode) {
  const mode = simulatedMode || elements.ddMode.value;
  const minimum = isFiniteNumber(simulatedMinimum) ? simulatedMinimum : ddMinimum();
  const total = row.phase_dd_sum;

  if (mode === "ignore") {
    return { pass: true, reason: "", mode, minimum, total, status: "ignored" };
  }
  if (!isFiniteNumber(minimum)) {
    return { pass: true, reason: "", mode, minimum, total, status: "notApplicable" };
  }
  if (!isFiniteNumber(row.phase_dd_sum)) {
    return mode === "requireKnown"
      ? { pass: false, reason: "DD unknown", mode, minimum, total, status: "unknownFail" }
      : { pass: true, reason: "DD unknown", mode, minimum, total, status: "unknownPass" };
  }
  return row.phase_dd_sum >= minimum
    ? { pass: true, reason: "", mode, minimum, total, status: "pass" }
    : { pass: false, reason: `DD < ${formatScore(minimum)}`, mode, minimum, total, status: "fail" };
}

function bestQualifiedRows(rows) {
  const byAthlete = new Map();
  rows
    .filter((row) => row.qualified)
    .forEach((row) => {
      const key = athleteKey(row);
      const current = byAthlete.get(key);
      if (!current || compareRows(row, current) > 0) {
        byAthlete.set(key, row);
      }
    });
  return [...byAthlete.values()].sort((a, b) => compareRows(b, a)).slice(0, 250);
}

function bubbleRows(rows, qualified) {
  const qualifiedKeys = new Set(qualified.map(athleteKey));
  const byAthlete = new Map();
  rows
    .filter((row) => !qualifiedKeys.has(athleteKey(row)))
    .filter((row) => isFiniteNumber(row.threshold_gap) && row.threshold_gap > 0)
    .forEach((row) => {
      const key = athleteKey(row);
      const current = byAthlete.get(key);
      if (!current || row.threshold_gap < current.threshold_gap) {
        byAthlete.set(key, row);
      }
    });
  return [...byAthlete.values()].sort((a, b) => a.threshold_gap - b.threshold_gap).slice(0, 40);
}

function renderQualifiedTable(rows) {
  const target = document.getElementById("qualifiedRows");
  target.innerHTML = rows.length
    ? rows
        .slice(0, 80)
        .map((row) => {
          const key = registerExplanationRow(row, "qualified");
          return `
            <tr class="clickable-row ${rowMatchesHeatmap(row) ? 'heatmap-match' : ''}" data-explanation-key="${escapeAttr(key)}" tabindex="0" title="Open rule explanation">
              <td>${escapeHtml(row.diver_name)}</td>
              <td>${escapeHtml(row.team_name || row.nat || "")}</td>
              <td>${escapeHtml(meetLabel(row))}</td>
              <td>${escapeHtml(row.round_stage || "")}</td>
              <td>${formatPlace(row.place)}</td>
              <td>${formatScore(row.analysis_score)}</td>
              <td>${formatScore(row.threshold_used)}</td>
              <td>${escapeHtml(row.score_basis)}</td>
              ${ddCells(row)}
              ${ncaaAdjustmentCells(row)}
              <td class="reason">${escapeHtml(row.reason)}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="17">No athletes qualify under this scenario.</td></tr>`;
}

function renderBubbleTable(rows) {
  const target = document.getElementById("bubbleRows");
  target.innerHTML = rows.length
    ? rows
        .map((row) => {
          const key = registerExplanationRow(row, "bubble");
          return `
            <tr class="clickable-row ${rowMatchesHeatmap(row) ? 'heatmap-match' : ''}" data-explanation-key="${escapeAttr(key)}" tabindex="0" title="Open rule explanation">
              <td>${escapeHtml(row.diver_name)}</td>
              <td>${escapeHtml(row.team_name || row.nat || "")}</td>
              <td>${escapeHtml(meetLabel(row))}</td>
              <td>${escapeHtml(row.round_stage || "")}</td>
              <td>${formatScore(row.analysis_score)}</td>
              <td>${formatScore(row.threshold_used)}</td>
              <td class="gap">${formatScore(row.threshold_gap)}</td>
              ${ddCells(row)}
              ${ncaaAdjustmentCells(row)}
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="15">No below-threshold athletes in the selected result set.</td></tr>`;
}

function ddCells(row) {
  return `
    <td>${displayScoreValue(row.dd_total_used)}</td>
    <td>${displayScoreValue(row.dd_minimum_used, "No min")}</td>
    <td>${ddStatusBadge(row.dd_status)}</td>
  `;
}

function ncaaAdjustmentCells(row) {
  return `
    <td>${adjustmentScoreLabel(row.ncaa_women_springboard_raw_6_dive_score)}</td>
    <td>${adjustmentScoreLabel(row.ncaa_women_springboard_5cat_score)}</td>
    <td>${escapeHtml(droppedDiveLabel(row))}</td>
    <td>${escapeHtml(adjustmentValue(row.ncaa_women_springboard_repeated_category))}</td>
    <td>${adjustmentStatusBadge(row.ncaa_women_springboard_adjustment_status)}</td>
  `;
}

function renderQualificationFrontier(rows, qualified, bubble) {
  const container = document.getElementById("qualificationFrontier");
  if (!container) return;

  const scoreThreshold = number(elements.scoreThreshold.value);
  const ddThreshold = ddMinimum();
  const scoredRows = rows.filter((row) => isFiniteNumber(row.analysis_score));
  const ddValues = scoredRows.map((row) => row.dd_total_used).filter(isFiniteNumber);

  if (!scoredRows.length) {
    container.innerHTML = `<div class="empty-state">No score data for this scenario.</div>`;
    return;
  }

  const width = 880;
  const height = 430;
  const pad = { top: 28, right: 28, bottom: 72, left: 70 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const scoreValues = scoredRows.map((row) => row.analysis_score).filter(isFiniteNumber);
  if (isFiniteNumber(scoreThreshold)) scoreValues.push(scoreThreshold);
  if (isFiniteNumber(ddThreshold)) ddValues.push(ddThreshold);

  const xExtent = paddedExtent(scoreValues, disciplineStep() * 0.6 || 8);
  const yExtent = paddedExtent(ddValues.length ? ddValues : [0, 1], 0.45);
  const missingDdY = yExtent.min;
  const bubbleKeys = new Set(bubble.map((row) => chartRowKey(row)));
  const qualifiedKeys = new Set(qualified.map((row) => chartRowKey(row)));

  const xScale = (value) => pad.left + ((value - xExtent.min) / (xExtent.max - xExtent.min || 1)) * innerWidth;
  const yScale = (value) => pad.top + innerHeight - ((value - yExtent.min) / (yExtent.max - yExtent.min || 1)) * innerHeight;

  const xTicks = chartTicks(xExtent.min, xExtent.max, 5);
  const yTicks = chartTicks(yExtent.min, yExtent.max, 5);

  const grid = [
    ...xTicks.map((tick) => `<line x1="${xScale(tick)}" y1="${pad.top}" x2="${xScale(tick)}" y2="${pad.top + innerHeight}" class="frontier-grid-line" />`),
    ...yTicks.map((tick) => `<line x1="${pad.left}" y1="${yScale(tick)}" x2="${pad.left + innerWidth}" y2="${yScale(tick)}" class="frontier-grid-line" />`),
  ].join("");

  const axisLabels = [
    ...xTicks.map((tick) => `<text x="${xScale(tick)}" y="${height - 38}" text-anchor="middle" class="axis-label">${formatChartNumber(tick)}</text>`),
    ...yTicks.map((tick) => `<text x="${pad.left - 12}" y="${yScale(tick) + 4}" text-anchor="end" class="axis-label">${formatChartNumber(tick)}</text>`),
  ].join("");

  const thresholdLines = [
    isFiniteNumber(scoreThreshold)
      ? `<line x1="${xScale(scoreThreshold)}" y1="${pad.top}" x2="${xScale(scoreThreshold)}" y2="${pad.top + innerHeight}" class="frontier-threshold-line score-line" />
         <text x="${xScale(scoreThreshold) + 8}" y="${pad.top + 16}" class="frontier-threshold-label">Score ${formatScore(scoreThreshold)}</text>`
      : "",
    isFiniteNumber(ddThreshold)
      ? `<line x1="${pad.left}" y1="${yScale(ddThreshold)}" x2="${pad.left + innerWidth}" y2="${yScale(ddThreshold)}" class="frontier-threshold-line dd-line" />
         <text x="${pad.left + 8}" y="${yScale(ddThreshold) - 8}" class="frontier-threshold-label">DD ${formatScore(ddThreshold)}</text>`
      : "",
  ].join("");

  const zones = buildFrontierZones(scoreThreshold, ddThreshold, xScale, yScale, xExtent, yExtent, pad, innerWidth, innerHeight);
  const pointRows = downsampleFrontierRows(scoredRows, 1400);
  const points = pointRows
    .map((row) => {
      const key = registerExplanationRow(row, "frontier");
      const hasDd = isFiniteNumber(row.dd_total_used);
      const x = xScale(row.analysis_score);
      const y = yScale(hasDd ? row.dd_total_used : missingDdY);
      const isQualified = row.qualified || qualifiedKeys.has(chartRowKey(row));
      const isBubble = bubbleKeys.has(chartRowKey(row));
      const isAdjusted = usesNcaaWomenFiveCategoryScore(row);
      const classes = [
        "frontier-point",
        isQualified ? "qualified" : "not-qualified",
        isBubble ? "bubble" : "",
        hasDd ? "dd-known" : "dd-missing",
        isAdjusted ? "ncaa-adjusted" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const label = [
        row.diver_name,
        meetLabel(row),
        row.round_stage,
        `Score: ${formatScore(row.analysis_score)} (${row.score_basis})`,
        `DD: ${displayScoreValue(row.dd_total_used, "Unknown")}`,
        row.reason,
      ]
        .filter(Boolean)
        .join(" | ");
      if (isAdjusted) {
        const size = isBubble ? 8 : isQualified ? 7 : 5;
        const transform = `translate(${x} ${y}) rotate(45)`;
        return `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="1" class="${classes}" data-explanation-key="${escapeAttr(key)}" tabindex="0" transform="${transform}"><title>${escapeHtml(label)}</title></rect>`;
      }
      const radius = isBubble ? 5.4 : isQualified ? 4.8 : 3.7;
      return `<circle cx="${x}" cy="${y}" r="${radius}" class="${classes}" data-explanation-key="${escapeAttr(key)}" tabindex="0"><title>${escapeHtml(label)}</title></circle>`;
    })
    .join("");

  const hiddenCount = scoredRows.length - pointRows.length;
  const missingCount = scoredRows.filter((row) => !isFiniteNumber(row.dd_total_used)).length;
  const qualifiedCount = qualified.length;
  const bubbleCount = bubble.length;
  container.innerHTML = `
    <div class="frontier-summary-strip">
      <span><strong>${formatInt(scoredRows.length)}</strong> plotted results</span>
      <span><strong>${formatInt(qualifiedCount)}</strong> qualified</span>
      <span><strong>${formatInt(bubbleCount)}</strong> bubble</span>
      <span><strong>${formatInt(missingCount)}</strong> missing DD</span>
      ${hiddenCount > 0 ? `<span><strong>${formatInt(hiddenCount)}</strong> lower-priority dots sampled out for speed</span>` : ""}
    </div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Qualification Frontier score and DD scatterplot">
      ${zones}
      ${grid}
      <line x1="${pad.left}" y1="${pad.top + innerHeight}" x2="${pad.left + innerWidth}" y2="${pad.top + innerHeight}" class="frontier-axis" />
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + innerHeight}" class="frontier-axis" />
      ${axisLabels}
      <text x="${pad.left + innerWidth / 2}" y="${height - 10}" text-anchor="middle" class="frontier-axis-title">Active score used by criteria logic</text>
      <text x="16" y="${pad.top + innerHeight / 2}" transform="rotate(-90 16 ${pad.top + innerHeight / 2})" text-anchor="middle" class="frontier-axis-title">DD total</text>
      ${thresholdLines}
      ${points}
    </svg>
    <div class="frontier-legend">
      <span><i class="legend-dot qualified"></i>Qualified</span>
      <span><i class="legend-dot bubble"></i>Bubble</span>
      <span><i class="legend-dot missing"></i>Missing DD</span>
      <span><i class="legend-diamond"></i>NCAA derived 5-category</span>
      <span class="frontier-help">Click any dot to open the athlete audit.</span>
    </div>
  `;
}

function renderEventStrengthHeatmap(rows, qualified, bubble) {
  const container = document.getElementById("eventStrengthHeatmap");
  if (!container) return;
  const metric = document.getElementById("heatmapMetric")?.value || "qualifiedCount";
  const bubbleKeys = new Set(bubble.map((row) => chartRowKey(row)));
  const qualifiedKeys = new Set(qualified.map((row) => chartRowKey(row)));
  const grouped = new Map();

  rows.forEach((row) => {
    const rowLabel = heatmapRowLabel(row);
    const colLabel = heatmapColumnLabel(row);
    const key = `${rowLabel}|||${colLabel}`;
    if (!grouped.has(key)) grouped.set(key, { rowLabel, colLabel, rows: [] });
    grouped.get(key).rows.push(row);
  });

  if (!grouped.size) {
    container.innerHTML = `<div class="empty-state">No heatmap data for this scenario.</div>`;
    setTextIfPresent("heatmapSelectionNote", "");
    return;
  }

  const cells = [...grouped.values()].map((cell) => {
    const value = heatmapMetricValue(metric, cell.rows, qualifiedKeys, bubbleKeys);
    return { ...cell, value };
  });

  const rowLabels = unique(cells.map((cell) => cell.rowLabel)).sort((a, b) => roundOrderFromLabel(a) - roundOrderFromLabel(b) || a.localeCompare(b));
  const colLabels = unique(cells.map((cell) => cell.colLabel)).sort((a, b) => a.localeCompare(b));
  const maxValue = Math.max(1, ...cells.map((cell) => safeNumber(cell.value, 0)));
  const cellMap = new Map(cells.map((cell) => [`${cell.rowLabel}|||${cell.colLabel}`, cell]));
  const selected = state.heatmapSelection;

  const header = `<div class="heatmap-corner">${escapeHtml(heatmapMetricLabel(metric))}</div>${colLabels
    .map((label) => `<div class="heatmap-col-label" title="${escapeAttr(label)}">${escapeHtml(trim(label, 22))}</div>`)
    .join("")}`;
  const body = rowLabels
    .map((rowLabel) => {
      const rowCells = colLabels
        .map((colLabel) => {
          const cell = cellMap.get(`${rowLabel}|||${colLabel}`);
          if (!cell || !isFiniteNumber(cell.value)) {
            return `<button type="button" class="heatmap-cell empty" disabled aria-label="No data"></button>`;
          }
          const intensity = Math.max(0.08, Math.min(1, cell.value / maxValue));
          const isSelected = selected && selected.rowLabel === rowLabel && selected.colLabel === colLabel;
          const tooltip = `${rowLabel} / ${colLabel}: ${heatmapValueLabel(metric, cell.value)} from ${formatInt(cell.rows.length)} rows`;
          return `<button type="button" class="heatmap-cell ${isSelected ? "selected" : ""}" style="--heat: ${intensity.toFixed(3)}" data-row-label="${escapeAttr(rowLabel)}" data-col-label="${escapeAttr(colLabel)}" title="${escapeAttr(tooltip)}">
            <span>${escapeHtml(heatmapValueLabel(metric, cell.value))}</span>
          </button>`;
        })
        .join("");
      return `<div class="heatmap-row-label" title="${escapeAttr(rowLabel)}">${escapeHtml(trim(rowLabel, 24))}</div>${rowCells}`;
    })
    .join("");

  container.innerHTML = `
    <div class="heatmap-grid" style="grid-template-columns: minmax(145px, 0.95fr) repeat(${colLabels.length}, minmax(92px, 1fr));">
      ${header}
      ${body}
    </div>
    <div class="heatmap-legend">
      <span>Lower</span><span class="heatmap-gradient"></span><span>Higher</span>
    </div>
  `;
  renderHeatmapSelectionNote();
}

function renderHeatmapSelectionNote() {
  const note = document.getElementById("heatmapSelectionNote");
  if (!note) return;
  if (!state.heatmapSelection) {
    note.textContent = "Click a cell to highlight matching qualified and bubble rows.";
    return;
  }
  note.textContent = `Highlighted: ${state.heatmapSelection.rowLabel} / ${state.heatmapSelection.colLabel}. Click the same cell again to clear.`;
}

function buildFrontierZones(scoreThreshold, ddThreshold, xScale, yScale, xExtent, yExtent, pad, innerWidth, innerHeight) {
  if (!isFiniteNumber(scoreThreshold) && !isFiniteNumber(ddThreshold)) return "";
  const xCut = isFiniteNumber(scoreThreshold) ? xScale(scoreThreshold) : pad.left + innerWidth;
  const yCut = isFiniteNumber(ddThreshold) ? yScale(ddThreshold) : pad.top + innerHeight;
  const leftW = Math.max(0, xCut - pad.left);
  const rightW = Math.max(0, pad.left + innerWidth - xCut);
  const topH = Math.max(0, yCut - pad.top);
  const bottomH = Math.max(0, pad.top + innerHeight - yCut);
  const zones = [];
  if (rightW && topH) zones.push(`<rect x="${xCut}" y="${pad.top}" width="${rightW}" height="${topH}" class="frontier-zone frontier-zone-pass" />`);
  if (rightW && bottomH) zones.push(`<rect x="${xCut}" y="${yCut}" width="${rightW}" height="${bottomH}" class="frontier-zone frontier-zone-score" />`);
  if (leftW && topH) zones.push(`<rect x="${pad.left}" y="${pad.top}" width="${leftW}" height="${topH}" class="frontier-zone frontier-zone-dd" />`);
  if (leftW && bottomH) zones.push(`<rect x="${pad.left}" y="${yCut}" width="${leftW}" height="${bottomH}" class="frontier-zone frontier-zone-miss" />`);
  return zones.join("");
}

function downsampleFrontierRows(rows, limit) {
  if (rows.length <= limit) return rows;
  const qualified = rows.filter((row) => row.qualified);
  const bubbleLike = rows.filter((row) => isFiniteNumber(row.threshold_gap) && row.threshold_gap > 0).sort((a, b) => a.threshold_gap - b.threshold_gap).slice(0, Math.floor(limit * 0.35));
  const prioritizedKeys = new Set([...qualified, ...bubbleLike].map(chartRowKey));
  const prioritized = rows.filter((row) => prioritizedKeys.has(chartRowKey(row))).slice(0, Math.floor(limit * 0.65));
  const remainingLimit = Math.max(0, limit - prioritized.length);
  const others = rows.filter((row) => !prioritizedKeys.has(chartRowKey(row)));
  const step = Math.max(1, Math.ceil(others.length / Math.max(1, remainingLimit)));
  return [...prioritized, ...others.filter((_, index) => index % step === 0).slice(0, remainingLimit)];
}

function chartTicks(min, max, count) {
  if (!isFiniteNumber(min) || !isFiniteNumber(max) || min === max) return [min || 0];
  const ticks = [];
  for (let index = 0; index < count; index += 1) {
    ticks.push(min + ((max - min) * index) / (count - 1));
  }
  return ticks;
}

function paddedExtent(values, fallbackPad) {
  const filtered = values.filter(isFiniteNumber);
  if (!filtered.length) return { min: 0, max: 1 };
  let min = Math.min(...filtered);
  let max = Math.max(...filtered);
  if (min === max) {
    min -= fallbackPad || 1;
    max += fallbackPad || 1;
  } else {
    const pad = Math.max((max - min) * 0.08, fallbackPad || 0);
    min -= pad;
    max += pad;
  }
  return { min, max };
}

function chartRowKey(row) {
  return [row.meet_id, row.event_id, row.result_set_id, row.diver_id || athleteKey(row), row.round_stage, row.place, row.analysis_score ?? row.posted_score]
    .map((value) => String(value ?? ""))
    .join("::");
}

function heatmapRowLabel(row) {
  const round = row.round_stage || "Unknown round";
  const level = row.event_level && row.event_level !== "Senior" ? ` ${row.event_level}` : "";
  return `${round}${level}`.trim();
}

function heatmapColumnLabel(row) {
  return trim(meetLabel(row) || sourceKey(row) || "Unknown meet", 42);
}

function heatmapMetricLabel(metric) {
  const labels = {
    qualifiedCount: "Qualified",
    bubbleCount: "Bubble",
    averageScore: "Avg score",
    medianScore: "Median score",
    averageDd: "Avg DD",
    missingDdCount: "Missing DD",
    ncaaAdjustedCount: "NCAA adjusted",
  };
  return labels[metric] || metric;
}

function heatmapMetricValue(metric, rows, qualifiedKeys, bubbleKeys) {
  if (metric === "qualifiedCount") return rows.filter((row) => row.qualified || qualifiedKeys.has(chartRowKey(row))).length;
  if (metric === "bubbleCount") return rows.filter((row) => bubbleKeys.has(chartRowKey(row))).length;
  if (metric === "averageScore") return mean(rows.map((row) => row.analysis_score));
  if (metric === "medianScore") return median(rows.map((row) => row.analysis_score).filter(isFiniteNumber));
  if (metric === "averageDd") return mean(rows.map((row) => row.dd_total_used));
  if (metric === "missingDdCount") return rows.filter((row) => !isFiniteNumber(row.dd_total_used)).length;
  if (metric === "ncaaAdjustedCount") return rows.filter((row) => usesNcaaWomenFiveCategoryScore(row)).length;
  return rows.length;
}

function heatmapValueLabel(metric, value) {
  if (!isFiniteNumber(value)) return "";
  if (metric === "averageScore" || metric === "medianScore" || metric === "averageDd") return formatScore(value);
  return formatInt(Math.round(value));
}

function roundOrderFromLabel(label) {
  const text = String(label || "");
  if (text.includes("Prelim")) return 1;
  if (text.includes("Semifinal")) return 2;
  if (text.includes("Final")) return 3;
  if (text.includes("Head-To-Head")) return 4;
  return 9;
}

function handleVisualizationExplanationClick(event) {
  const target = event.target.closest("[data-explanation-key]");
  if (!target) return;
  openRuleExplanation(target.dataset.explanationKey);
}

function handleVisualizationExplanationKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target.closest("[data-explanation-key]");
  if (!target) return;
  event.preventDefault();
  openRuleExplanation(target.dataset.explanationKey);
}

function handleHeatmapClick(event) {
  const cell = event.target.closest(".heatmap-cell[data-row-label]");
  if (!cell) return;
  toggleHeatmapSelection(cell.dataset.rowLabel, cell.dataset.colLabel);
}

function handleHeatmapKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const cell = event.target.closest(".heatmap-cell[data-row-label]");
  if (!cell) return;
  event.preventDefault();
  toggleHeatmapSelection(cell.dataset.rowLabel, cell.dataset.colLabel);
}

function toggleHeatmapSelection(rowLabel, colLabel) {
  if (state.heatmapSelection && state.heatmapSelection.rowLabel === rowLabel && state.heatmapSelection.colLabel === colLabel) {
    state.heatmapSelection = null;
  } else {
    state.heatmapSelection = { rowLabel, colLabel };
  }
  render();
}

function rowMatchesHeatmap(row) {
  return state.heatmapSelection && heatmapRowLabel(row) === state.heatmapSelection.rowLabel && heatmapColumnLabel(row) === state.heatmapSelection.colLabel;
}

function renderSourceImpact(qualified) {
  const grouped = groupBy(qualified, (row) => sourceKey(row));
  const points = [...grouped.entries()]
    .map(([label, values]) => ({ label: compactSource(label), value: values.length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  document.getElementById("sourceImpact").innerHTML = points.length
    ? horizontalBarChart(points)
    : `<div class="empty-state">No qualifying source impact yet.</div>`;
}

function renderRoundComparison(rows) {
  const groups = new Map();
  rows
    .filter((row) => row.round_stage)
    .forEach((row) => {
      const key = [athleteKey(row), row.meet_id, row.event_id, row.gender, row.discipline].join("|");
      if (!groups.has(key)) {
        groups.set(key, {
          name: row.diver_name,
          team: teamLabel(row),
          meet: meetLabel(row),
          prelim: null,
          semi: null,
          final: null,
        });
      }
      const group = groups.get(key);
      if (row.round_stage === "Prelim") group.prelim = betterRoundRow(group.prelim, row);
      if (row.round_stage === "Semifinal") group.semi = betterRoundRow(group.semi, row);
      if (row.round_stage === "Final") group.final = betterRoundRow(group.final, row);
    });

  const comparisons = [...groups.values()]
    .filter((group) => group.prelim || group.semi || group.final)
    .filter((group) => [group.prelim, group.semi, group.final].filter(Boolean).length >= 2)
    .map((group) => {
      const prelimScore = group.prelim?.posted_score ?? null;
      const finalPosted = group.final?.posted_score ?? null;
      return {
        ...group,
        prelimScore,
        semiScore: group.semi?.posted_score ?? null,
        finalPosted,
        finalPhase: group.final?.phase_score_from_dives ?? null,
        finalDelta: isFiniteNumber(prelimScore) && isFiniteNumber(finalPosted) ? finalPosted - prelimScore : null,
        representative: evaluateRow(group.final || group.semi || group.prelim),
      };
    })
    .sort((a, b) => compareScores(b.finalPosted, a.finalPosted) || compareScores(b.prelimScore, a.prelimScore))
    .slice(0, 80);

  document.getElementById("roundComparisonRows").innerHTML = comparisons.length
    ? comparisons
        .map((row) => {
          const key = registerExplanationRow(row.representative, "comparison");
          return `
            <tr class="clickable-row ${rowMatchesHeatmap(row) ? 'heatmap-match' : ''}" data-explanation-key="${escapeAttr(key)}" tabindex="0" title="Open rule explanation">
              <td>${escapeHtml(row.name)}</td>
              <td>${escapeHtml(row.team)}</td>
              <td>${escapeHtml(row.meet)}</td>
              <td>${formatScore(row.prelimScore)}</td>
              <td>${formatScore(row.semiScore)}</td>
              <td>${formatScore(row.finalPosted)}</td>
              <td>${formatScore(row.finalPhase)}</td>
              <td>${formatSignedScore(row.finalDelta)}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="8">No matching prelim/final progression rows in this scenario.</td></tr>`;
}

function initRuleExplanationPanel() {
  ["qualifiedRows", "bubbleRows"].forEach((id) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.addEventListener("click", handleExplanationClick);
    target.addEventListener("keydown", handleExplanationKeydown);
  });

  document.getElementById("ruleExplanationClose").addEventListener("click", closeRuleExplanation);
  document.getElementById("rulePanelOverlay").addEventListener("click", closeRuleExplanation);
  document.getElementById("ruleExplanationCopy").addEventListener("click", copyCurrentExplanation);
  document.getElementById("ruleExplanationCopyProfile")?.addEventListener("click", copyCurrentAthleteProfile);
  document.getElementById("ruleExplanationCopyDives")?.addEventListener("click", copyCurrentDiveSheet);
  document.getElementById("ruleExplanationBody")?.addEventListener("click", handleDiveDnaTileClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.activeExplanationKey) closeRuleExplanation();
  });
}

function handleExplanationClick(event) {
  const row = event.target.closest("tr[data-explanation-key]");
  if (!row) return;
  openRuleExplanation(row.dataset.explanationKey);
}

function handleExplanationKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = event.target.closest("tr[data-explanation-key]");
  if (!row) return;
  event.preventDefault();
  openRuleExplanation(row.dataset.explanationKey);
}

function handleDiveDnaTileClick(event) {
  const tile = event.target.closest("[data-dive-tile-index]");
  if (!tile) return;
  const target = document.getElementById("ruleExplanationBody");
  if (!target) return;
  const index = tile.dataset.diveTileIndex;
  target.querySelectorAll(".dive-dna-tile.active, .dive-table tr.active-dive-row").forEach((el) => el.classList.remove("active", "active-dive-row"));
  tile.classList.add("active");
  const row = [...target.querySelectorAll(".dive-table tr[data-dive-index]")].find((candidate) => candidate.dataset.diveIndex === index);
  if (row) {
    row.classList.add("active-dive-row");
    row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function openRuleExplanation(key) {
  const row = state.explanationRows.get(key);
  if (!row) return;

  state.activeExplanationKey = key;
  state.currentExplanation = row.explanation || evaluateRow(row).explanation;
  renderRuleExplanation(state.currentExplanation);
  setCopyStatus("");

  const panel = document.getElementById("ruleExplanationPanel");
  document.getElementById("rulePanelOverlay").classList.add("open");
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("rule-panel-open");
  document.getElementById("ruleExplanationClose").focus({ preventScroll: true });
}

function closeRuleExplanation() {
  state.activeExplanationKey = null;
  state.currentExplanation = null;
  document.getElementById("rulePanelOverlay").classList.remove("open");
  const panel = document.getElementById("ruleExplanationPanel");
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("rule-panel-open");
  setCopyStatus("");
}

function refreshOpenExplanation() {
  if (!state.activeExplanationKey) return;
  const row = state.explanationRows.get(state.activeExplanationKey);
  if (!row) {
    closeRuleExplanation();
    return;
  }
  state.currentExplanation = row.explanation || evaluateRow(row).explanation;
  renderRuleExplanation(state.currentExplanation);
}

function copyCurrentExplanation() {
  if (!state.currentExplanation) return;
  copyText(buildExplanationText(state.currentExplanation))
    .then(() => setCopyStatus("Explanation copied"))
    .catch(() => setCopyStatus("Copy failed"));
}

function copyCurrentAthleteProfile() {
  const explanation = state.currentExplanation;
  if (!explanation) return;
  copyText(buildAthleteProfileText(explanation))
    .then(() => setCopyStatus("Athlete profile copied"))
    .catch(() => setCopyStatus("Copy failed"));
}

function buildAthleteProfileText(explanation) {
  const lines = [
    "Athlete Profile",
    `Athlete\t${explanation.athleteName}`,
    `Team / nationality\t${explanation.teamNationality}`,
    `Meet\t${explanation.meet}`,
    `Event\t${explanation.event}`,
    `Round\t${explanation.round}`,
    `Place\t${explanation.place}`,
    `Outcome\t${explanation.qualified ? "Qualified" : "Outside criteria"}`,
    `Score used\t${explanation.scoreUsedLabel}`,
    `Score basis\t${explanation.scoreBasis}`,
    `Score threshold\t${explanation.scoreThresholdLabel}`,
    `Score gap\t${explanation.scoreGapLabel}`,
    `DD total\t${explanation.ddTotalLabel}`,
    `DD threshold\t${explanation.ddMinimumLabel}`,
    `DD status\t${explanation.ddStatus}`,
    `Reason\t${explanation.exactReason}`,
  ];
  if (explanation.diveAudit?.isNcaaWomenSpringboard) {
    lines.push(
      `Raw NCAA 6-dive score\t${explanation.ncaaRawSixScoreLabel}`,
      `Derived NCAA 5-category score\t${explanation.ncaaFiveCategoryScoreLabel}`,
      `Repeated category\t${explanation.ncaaRepeatedCategory}`,
      `Dropped dive\t${explanation.ncaaDroppedDive}`,
      `NCAA adjustment\t${explanation.ncaaAdjustmentStatus}`
    );
  }
  return lines.join("\n");
}

function copyCurrentDiveSheet() {
  if (!state.currentExplanation) return;
  copyText(buildDiveSheetText(state.currentExplanation.diveAudit))
    .then(() => setCopyStatus("Dive sheet copied"))
    .catch(() => setCopyStatus("Copy failed"));
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
  }
  return fallbackCopyText(text);
}

function fallbackCopyText(text) {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    copied ? resolve() : reject(new Error("Copy command failed"));
  });
}

function setCopyStatus(message) {
  document.getElementById("ruleExplanationCopyStatus").textContent = message;
}

function registerExplanationRow(row, context) {
  const evaluatedRow = row.explanation ? row : evaluateRow(row);
  const key = buildExplanationKey(evaluatedRow, context);
  state.explanationRows.set(key, evaluatedRow);
  return key;
}

function buildExplanationKey(row, context) {
  return [
    context,
    row.meet_id,
    row.event_id,
    row.result_set_id,
    row.diver_id || athleteKey(row),
    row.round_stage,
    row.place,
    row.analysis_score ?? row.posted_score,
  ]
    .map((value) => String(value ?? ""))
    .join("::");
}

function buildRuleExplanation(row, details) {
  const qualified = details.rulePass && details.ddPass.pass;
  const scoreGap =
    isFiniteNumber(details.score) && isFiniteNumber(details.threshold)
      ? details.score - details.threshold
      : null;
  const scoreCheck = scoreCheckText(details.score, details.threshold, details.rawScorePass);
  const topNCheck = topNCheckText(details.topN, row.place, details.topPass);
  const ddCheck = ddCheckText(details.ddPass);
  const reason = tableReasonFromChecks(details, qualified);
  const exactReason = buildExactReason(details, qualified, scoreCheck, topNCheck, ddCheck);

  return {
    athleteName: displayValue(row.diver_name),
    teamNationality: teamNationalityLabel(row),
    nationality: normalizedNat(row) || "Not published",
    meet: displayValue(meetLabel(row)),
    event: eventDescription(row),
    round: displayValue(row.round_stage || row.event_round),
    place: isFiniteNumber(row.place) ? formatPlace(row.place) : "Not available",
    scoreUsed: details.score,
    scoreUsedLabel: displayScoreValue(details.score),
    scoreBasis: displayValue(details.scoreBasis),
    scoreBasisMode: scoreModeLabel(elements.scoreMode.value),
    scoreThreshold: details.threshold,
    scoreThresholdLabel: displayScoreValue(details.threshold),
    scoreGap,
    scoreGapLabel: formatGapForExplanation(scoreGap),
    scorePass: details.rawScorePass,
    scoreCheck,
    topN: details.topN,
    topNLabel: isFiniteNumber(details.topN) && details.topN > 0 ? `Top ${formatPlace(details.topN)}` : "Not active",
    topNPass: details.topPass,
    topNCheck,
    topNResult: topNCheck,
    ddMinimum: details.ddPass.minimum,
    ddMinimumLabel: displayScoreValue(details.ddPass.minimum),
    ddTotal: details.ddPass.total,
    ddTotalLabel: displayScoreValue(details.ddPass.total),
    ddStatus: ddStatusLabel(details.ddPass),
    ddPass: details.ddPass.pass,
    ddCheck,
    ddMode: ddModeLabel(details.ddPass.mode),
    sourceGroup: displayValue(sourceKey(row)),
    criteriaModel: criteriaPresetLabel(),
    criteriaPlainLanguage: criteriaPlainLanguage(),
    ruleMode: ruleModeLabel(details.rule),
    qualifyingPath: qualifyingPathText(details, qualified),
    rulePass: details.rulePass,
    qualified,
    reason,
    exactReason,
    postedScoreLabel: displayScoreValue(row.posted_score),
    phaseScoreLabel: displayScoreValue(row.phase_score_from_dives),
    phaseDiveCount: isFiniteNumber(row.phase_dive_count) ? formatInt(row.phase_dive_count) : "Not available",
    scoreIsCumulative: Boolean(row.score_is_cumulative),
    scoreAnalysisMode: displayValue(row.score_analysis_mode),
    scoreDetail: scoreDetailText(row, details.scoreBasis),
    isNcaaWomenSpringboard: isNcaaWomenSpringboardRow(row),
    ncaaAdjustmentStatus: adjustmentStatusText(row.ncaa_women_springboard_adjustment_status),
    ncaaAdjustmentNote: adjustmentNote(row),
    ncaaRawSixScoreLabel: adjustmentScoreLabel(row.ncaa_women_springboard_raw_6_dive_score, "Not applicable"),
    ncaaFiveCategoryScoreLabel: adjustmentScoreLabel(row.ncaa_women_springboard_5cat_score, "Not available"),
    ncaaFiveCategoryDdLabel: adjustmentScoreLabel(row.ncaa_women_springboard_5cat_dd_sum, "Not available"),
    ncaaRepeatedCategory: adjustmentValue(row.ncaa_women_springboard_repeated_category, "Not applicable"),
    ncaaDroppedDive: droppedDiveLabel(row, "Not applicable"),
    ncaaDerivedScoreUsed: usesNcaaWomenFiveCategoryScore(row),
    diveAudit: buildDiveAudit(row, details),
    checks: [
      {
        label: "Score standard",
        status: details.ruleAllowsScore ? (details.rawScorePass ? "pass" : "fail") : "neutral",
        text: scoreCheck,
      },
      {
        label: "placement cutoff rule",
        status: details.ruleAllowsTopN ? (details.topPass ? "pass" : "fail") : "neutral",
        text: topNCheck,
      },
      {
        label: "DD check",
        status: ddCheckStatus(details.ddPass),
        text: ddCheck,
      },
      ...(isNcaaWomenSpringboardRow(row) ? [{
        label: "NCAA women's 5-category adjustment",
        status: adjustmentCheckStatus(row),
        text: adjustmentNote(row),
      }] : []),
    ],
  };
}

function tableReasonFromChecks(details, qualified) {
  const reasons = [];
  if (details.ruleAllowsTopN && details.topPass) reasons.push(`Top ${details.topN}`);
  if (details.ruleAllowsScore && details.rawScorePass) reasons.push(`Score >= ${formatScore(details.threshold)}`);
  if (!details.ddPass.pass) reasons.push(details.ddPass.reason);
  if (qualified && reasons.length === 0) reasons.push("Qualified");
  return reasons.join(" + ") || "Did not qualify";
}

function buildExactReason(details, qualified, scoreCheck, topNCheck, ddCheck) {
  if (qualified) {
    const primary = qualifiedReasonText(details, scoreCheck, topNCheck);
    const dd = ddQualificationText(details.ddPass);
    return `Qualified: ${[primary, dd].filter(Boolean).map(ensurePeriod).join(" ")}`;
  }

  const missing = [];
  if (!details.rulePass) missing.push(failedRuleText(details, scoreCheck, topNCheck));
  if (!details.ddPass.pass) missing.push(ddCheck);
  return `Did not qualify: ${missing.filter(Boolean).map(ensurePeriod).join(" ")}`;
}

function qualifiedReasonText(details, scoreCheck, topNCheck) {
  if (details.rule === "scoreOnly") return scoreCheck;
  if (details.rule === "topNOnly") return topNCheck;
  if (details.topPass && details.rawScorePass) {
    return `placement cutoff and score standard both passed (${topNCheck}; ${scoreCheck})`;
  }
  if (details.topPass) return `placement cutoff rule passed (${topNCheck})`;
  if (details.rawScorePass) return `Score standard passed (${scoreCheck})`;
  return "The selected rule passed";
}

function failedRuleText(details, scoreCheck, topNCheck) {
  if (details.rule === "scoreOnly") return scoreCheck;
  if (details.rule === "topNOnly") return topNCheck;
  return `Neither available path passed (${topNCheck}; ${scoreCheck})`;
}

function ddQualificationText(ddResult) {
  if (ddResult.status === "ignored") return "DD was ignored for this run";
  if (ddResult.status === "notApplicable") return "No DD minimum is configured for this selected model";
  if (ddResult.status === "unknownPass") return "DD was unknown and accepted because this run only enforces DD when known";
  if (ddResult.status === "pass") return ddCheckText(ddResult);
  return "";
}

function scoreCheckText(score, threshold, pass) {
  if (!isFiniteNumber(threshold)) return "No score threshold is set.";
  if (!isFiniteNumber(score)) return "Score used is not available for this score basis.";
  const gap = score - threshold;
  if (gap === 0) return `Score ${formatScore(score)} exactly matches the ${formatScore(threshold)} threshold.`;
  const direction = pass ? "above" : "below";
  return `Score ${formatScore(score)} is ${formatScore(Math.abs(gap))} ${direction} the ${formatScore(threshold)} threshold.`;
}

function topNCheckText(topN, place, pass) {
  if (!isFiniteNumber(topN) || topN <= 0) return "placement cutoff rule is not active.";
  if (!isFiniteNumber(place)) return `Top ${formatPlace(topN)} cannot be evaluated because place is not available.`;
  return pass
    ? `Place ${formatPlace(place)} is inside Top ${formatPlace(topN)}.`
    : `Place ${formatPlace(place)} is outside Top ${formatPlace(topN)}.`;
}

function ddCheckText(ddResult) {
  if (ddResult.status === "ignored") return "DD is ignored for this run.";
  if (ddResult.status === "notApplicable") return "No DD minimum is configured for this selected model.";
  if (ddResult.status === "unknownFail") return "DD total is unknown, and this run requires known DD.";
  if (ddResult.status === "unknownPass") return "DD total is unknown; this run only enforces DD when known.";
  if (ddResult.status === "pass") {
    return `DD total ${formatScore(ddResult.total)} meets the ${formatScore(ddResult.minimum)} minimum.`;
  }
  if (ddResult.status === "fail") {
    return `DD total ${formatScore(ddResult.total)} is below the ${formatScore(ddResult.minimum)} minimum.`;
  }
  return "DD status is unknown.";
}

function ddStatusLabel(ddResult) {
  if (ddResult.status === "ignored") return "Ignored";
  if (ddResult.status === "notApplicable") return "No minimum configured";
  if (ddResult.status === "unknownFail") return "Unknown - fail";
  if (ddResult.status === "unknownPass") return "Unknown - accepted";
  if (ddResult.status === "pass") return "Pass";
  if (ddResult.status === "fail") return "Fail";
  return "Unknown";
}

function ddCheckStatus(ddResult) {
  if (ddResult.status === "fail" || ddResult.status === "unknownFail") return "fail";
  if (ddResult.status === "unknownPass") return "warn";
  if (ddResult.status === "ignored" || ddResult.status === "notApplicable") return "neutral";
  return ddResult.pass ? "pass" : "fail";
}

function qualifyingPathText(details, qualified) {
  const ddSuffix = details.ddPass.status === "ignored" ? "" : " + DD check";
  if (!qualified) return `Not qualified under ${ruleModeLabel(details.rule)}${ddSuffix}`;
  if (details.rule === "scoreOnly") return `Score only${ddSuffix}`;
  if (details.rule === "topNOnly") return `placement cutoff only${ddSuffix}`;
  if (details.topPass && details.rawScorePass) return `placement cutoff OR score: both passed${ddSuffix}`;
  if (details.topPass) return `placement cutoff OR score: placement cutoff passed${ddSuffix}`;
  if (details.rawScorePass) return `placement cutoff OR score: score passed${ddSuffix}`;
  return `placement cutoff OR score${ddSuffix}`;
}

function criteriaPlainLanguage() {
  const preset = CRITERIA_NOTES[elements.criteriaPreset.value] || "";
  const rule = ruleModePlainLanguage(elements.ruleMode.value);
  const score = scoreModePlainLanguage(elements.scoreMode.value);
  const dd = ddModePlainLanguage(elements.ddMode.value);
  return [preset, rule, score, dd].filter(Boolean).join(" ");
}

function ruleModePlainLanguage(mode) {
  if (mode === "scoreOnly") return "This run qualifies a row only when the selected score meets or exceeds the score threshold.";
  if (mode === "topNOnly") return "This run qualifies a row only when the athlete's place is inside the selected Placement cutoff.";
  if (mode === "topNOrScore") return "This run qualifies a row when either the athlete's place is inside Placement cutoff or the selected score meets the score threshold.";
  return "";
}

function scoreModePlainLanguage(mode) {
  if (mode === "ncaaWomen5Category") {
    return "Score basis uses the derived NCAA Division I women's 1m/3m 5-category score when it is available; all other rows fall back to the non-cumulative score basis.";
  }
  if (mode === "phaseOrStandalone") {
    return "Score basis is non-cumulative: use the dive-sheet phase score when available, otherwise use the posted score only when it appears to be a standalone round score.";
  }
  if (mode === "phasePreferred") return "Score basis uses the dive-sheet phase score when available and falls back to posted score.";
  if (mode === "posted") return "Score basis uses the posted score, even if that posted score is cumulative.";
  return "";
}

function ddModePlainLanguage(mode) {
  if (mode === "ignore") return "DD is not part of the pass/fail decision for this run.";
  if (mode === "knownOnly") return "DD is enforced only when the row has a known DD total.";
  if (mode === "requireKnown") return "DD must be known and must meet the selected DD minimum.";
  return "";
}

function scoreDetailText(row, basis) {
  const details = [`Selected score basis: ${scoreModeLabel(elements.scoreMode.value)}.`];
  if (basis === "Derived NCAA 5-category") {
    details.push(
      `Using derived NCAA 5-category score ${displayScoreValue(row.ncaa_women_springboard_5cat_score)} from raw 6-dive score ${displayScoreValue(row.ncaa_women_springboard_raw_6_dive_score)}.`
    );
    details.push(adjustmentNote(row));
  } else if (basis === "Phase") {
    details.push(`Using dive-sheet phase score ${displayScoreValue(row.phase_score_from_dives)}.`);
  } else if (basis === "Posted") {
    details.push(`Using posted score ${displayScoreValue(row.posted_score)}.`);
  } else if (basis.includes("NCAA 5-cat unavailable")) {
    details.push(adjustmentNote(row));
  } else if (basis === "Needs sheet") {
    details.push("No usable non-cumulative score is available for this row.");
  }
  if (row.score_is_cumulative) {
    details.push(`Posted score appears cumulative; posted-minus-phase delta is ${displayScoreValue(row.score_delta_posted_minus_phase)}.`);
  }
  if (isFiniteNumber(row.phase_dive_count)) {
    details.push(`Dive count in this phase: ${formatInt(row.phase_dive_count)}.`);
  }
  if (row.score_analysis_mode) details.push(String(row.score_analysis_mode));
  return details.join(" ");
}

function renderRuleExplanation(explanation) {
  const outcomeClass = explanation.qualified ? "pass" : "fail";
  document.getElementById("ruleExplanationBody").innerHTML = `
    <section class="rule-decision ${outcomeClass}">
      <span>${explanation.qualified ? "Qualified" : "Did not qualify"}</span>
      <p>${escapeHtml(explanation.exactReason)}</p>
    </section>

    ${renderAthleteProfileCard(explanation)}
    ${renderDiveDna(explanation.diveAudit)}

    <section class="rule-section">
      <h3>Athlete Result</h3>
      <dl class="explain-grid">
        ${explanationField("Athlete", explanation.athleteName)}
        ${explanationField("Team / nationality", explanation.teamNationality)}
        ${explanationField("Meet", explanation.meet)}
        ${explanationField("Event", explanation.event)}
        ${explanationField("Round", explanation.round)}
        ${explanationField("Place", explanation.place)}
        ${explanationField("Source group", explanation.sourceGroup)}
      </dl>
    </section>

    <section class="rule-section">
      <h3>Criteria Model</h3>
      <p>${escapeHtml(explanation.criteriaPlainLanguage)}</p>
      <dl class="explain-grid compact">
        ${explanationField("Model", explanation.criteriaModel)}
        ${explanationField("Rule mode", explanation.ruleMode)}
        ${explanationField("Qualified by", explanation.qualifyingPath)}
      </dl>
    </section>

    <section class="rule-section">
      <h3>Score And DD</h3>
      <dl class="explain-grid">
        ${explanationField("Score used", explanation.scoreUsedLabel)}
        ${explanationField("Score basis used", `${explanation.scoreBasis} (${explanation.scoreBasisMode})`)}
        ${explanationField("Score threshold", explanation.scoreThresholdLabel)}
        ${explanationField("Score gap", explanation.scoreGapLabel)}
        ${explanationField("placement cutoff result", explanation.topNResult)}
        ${explanationField("DD minimum", explanation.ddMinimumLabel)}
        ${explanationField("DD total", explanation.ddTotalLabel)}
        ${explanationField("DD status", explanation.ddStatus)}
      </dl>
      <p class="score-detail">${escapeHtml(explanation.scoreDetail)}</p>
    </section>

    ${renderDiveAudit(explanation.diveAudit)}

    ${explanation.isNcaaWomenSpringboard ? `
      <section class="rule-section">
        <h3>NCAA Women's Springboard Adjustment</h3>
        <dl class="explain-grid">
          ${explanationField("Adjustment status", explanation.ncaaAdjustmentStatus)}
          ${explanationField("Raw NCAA 6-dive score", explanation.ncaaRawSixScoreLabel)}
          ${explanationField("Derived 5-category score", explanation.ncaaFiveCategoryScoreLabel)}
          ${explanationField("Derived 5-category DD", explanation.ncaaFiveCategoryDdLabel)}
          ${explanationField("Repeated official group", explanation.ncaaRepeatedCategory)}
          ${explanationField("Dropped dive", explanation.ncaaDroppedDive)}
        </dl>
        <p class="score-detail">${escapeHtml(explanation.ncaaAdjustmentNote)}</p>
      </section>
    ` : ""}

    <section class="rule-section">
      <h3>Rule Checks</h3>
      <div class="rule-checks">
        ${explanation.checks.map(checkMarkup).join("")}
      </div>
    </section>
  `;
}


function buildDiveLookups(dives) {
  const exact = new Map();
  const base = new Map();
  dives.forEach((dive) => {
    const exactKey = resultExactKey(dive);
    const baseKey = resultBaseKeyForDive(dive);
    if (!exact.has(exactKey)) exact.set(exactKey, []);
    exact.get(exactKey).push(dive);
    if (!base.has(baseKey)) base.set(baseKey, new Set());
    base.get(baseKey).add(exactKey);
  });
  exact.forEach((rows) => rows.sort(compareDiveOrder));
  return { exact, base };
}

function keyPart(value) {
  return String(value ?? "").trim();
}

function resultExactKey(row) {
  return [row.meet_id, row.event_id, row.result_set_id, row.diver_id, row.sheet_key].map(keyPart).join("::");
}

function resultBaseKeyForDive(row) {
  return [row.meet_id, row.event_id, row.result_set_id, row.diver_id].map(keyPart).join("::");
}

function compareDiveOrder(a, b) {
  const orderDelta = safeNumber(a.dive_order, 9999) - safeNumber(b.dive_order, 9999);
  if (orderDelta !== 0) return orderDelta;
  return keyPart(a.dive_number).localeCompare(keyPart(b.dive_number));
}

function getDiveRowsForResult(row) {
  const exactKey = resultExactKey(row);
  if (row.sheet_key && state.diveLookup.exact.has(exactKey)) {
    return {
      status: "matched",
      note: "Matched dive sheet by meet, event, result set, athlete, and sheet key.",
      rows: [...state.diveLookup.exact.get(exactKey)],
    };
  }

  const baseKey = resultBaseKeyForDive(row);
  const possibleKeys = [...(state.diveLookup.base.get(baseKey) || [])];
  if (possibleKeys.length === 1) {
    return {
      status: "matched",
      note: "Matched dive sheet by meet, event, result set, and athlete.",
      rows: [...(state.diveLookup.exact.get(possibleKeys[0]) || [])],
    };
  }
  if (possibleKeys.length > 1) {
    return {
      status: "ambiguous",
      note: "Dive sheet data exists, but it could not be confidently matched to this result.",
      rows: [],
    };
  }
  if (state.diveLookup.exact.has(exactKey)) {
    return {
      status: "matched",
      note: "Matched dive sheet by exact row key.",
      rows: [...state.diveLookup.exact.get(exactKey)],
    };
  }
  return {
    status: "missing",
    note: "No dive sheet is available for this result.",
    rows: [],
  };
}

function buildDiveAudit(row, details) {
  const match = getDiveRowsForResult(row);
  const rows = match.rows.map((dive) => ({
    ...dive,
    activeInclusion: activeDiveInclusion(row, dive),
  }));
  const scores = rows.map((dive) => dive.score).filter(isFiniteNumber);
  const dds = rows.map((dive) => dive.dd).filter(isFiniteNumber);
  const countedRows = rows.filter((dive) => (dive.activeInclusion?.status || "included") !== "dropped");
  const countedScores = countedRows.map((dive) => dive.score).filter(isFiniteNumber);
  const countedDds = countedRows.map((dive) => dive.dd).filter(isFiniteNumber);
  const runningTotals = rows.map((dive) => dive.running_total_points).filter(isFiniteNumber);
  const highest = rows.filter((dive) => isFiniteNumber(dive.score)).sort((a, b) => b.score - a.score)[0] || null;
  const lowest = rows.filter((dive) => isFiniteNumber(dive.score)).sort((a, b) => a.score - b.score)[0] || null;
  const finalRunningTotal = runningTotals.length ? runningTotals[runningTotals.length - 1] : null;
  const rawResultScore = row.ncaa_women_springboard_raw_6_dive_score ?? row.phase_score_from_dives ?? row.posted_score;
  const meetContextParts = [meetLabel(row), eventDescription(row), row.round_stage || row.event_round].filter(Boolean);

  return {
    status: match.status,
    note: match.note,
    rows,
    meetName: displayValue(meetLabel(row), "Meet not available"),
    eventName: displayValue(eventDescription(row), "Event not available"),
    roundName: displayValue(row.round_stage || row.event_round, "Round not available"),
    sourceName: displayValue(row.competition_group || row.competition_family || sourceKey(row), "Source not available"),
    meetYear: displayValue(row.meet_year, "Year not available"),
    meetContextLabel: meetContextParts.map((part) => displayValue(part)).filter(Boolean).join(" • "),
    resultScopeNote: "Dive DNA totals are calculated only from the selected meet/result shown here. They are not combined across an athlete's other meets.",
    rawResultScore,
    activeScore: details?.score ?? scoreValue(row),
    scoreBasis: details?.scoreBasis ?? scoreBasisLabel(row),
    totalScore: scores.length ? scores.reduce((sum, value) => sum + value, 0) : null,
    totalDd: dds.length ? dds.reduce((sum, value) => sum + value, 0) : null,
    averageDd: dds.length ? dds.reduce((sum, value) => sum + value, 0) / dds.length : null,
    countedScoreTotal: countedScores.length ? countedScores.reduce((sum, value) => sum + value, 0) : null,
    countedDdTotal: countedDds.length ? countedDds.reduce((sum, value) => sum + value, 0) : null,
    countedDiveCount: countedRows.length,
    finalRunningTotal,
    highestDive: highest,
    lowestDive: lowest,
    diveCount: rows.length,
    isNcaaWomenSpringboard: isNcaaWomenSpringboardRow(row),
    ncaaDerivedScoreUsed: usesNcaaWomenFiveCategoryScore(row),
    ncaaAdjustmentStatus: adjustmentStatusText(row.ncaa_women_springboard_adjustment_status),
    ncaaAdjustmentNote: adjustmentNote(row),
    rawNcaaSixScore: row.ncaa_women_springboard_raw_6_dive_score,
    derivedNcaaFiveScore: row.ncaa_women_springboard_5cat_score,
    derivedNcaaFiveDd: row.ncaa_women_springboard_5cat_dd_sum,
    repeatedCategory: adjustmentValue(row.ncaa_women_springboard_repeated_category, "Not applicable"),
    droppedDive: droppedDiveLabel(row, "Not applicable"),
  };
}

function activeDiveInclusion(row, dive) {
  if (usesNcaaWomenFiveCategoryScore(row)) {
    const status = dive.ncaa_5cat_inclusion_status || inferredNcaaDiveInclusion(row, dive);
    if (status === "dropped") {
      return {
        status: "dropped",
        label: "No - dropped",
        note: dive.ncaa_5cat_inclusion_note || "Dropped from derived NCAA 5-category score.",
      };
    }
    if (status === "included") {
      return {
        status: "included",
        label: "Yes - included",
        note: dive.ncaa_5cat_inclusion_note || "Included in derived NCAA 5-category score.",
      };
    }
    return {
      status: "unknown",
      label: "Unknown",
      note: "NCAA 5-category inclusion could not be determined for this dive.",
    };
  }
  return {
    status: "included",
    label: "Yes",
    note: "Included in the displayed result score when the dive sheet is available.",
  };
}

function inferredNcaaDiveInclusion(row, dive) {
  const droppedNumber = keyPart(row.ncaa_women_springboard_dropped_dive_number);
  if (!droppedNumber) return "unknown";
  if (keyPart(dive.dive_number) !== droppedNumber) return "included";
  const droppedScore = row.ncaa_women_springboard_dropped_dive_score;
  if (!isFiniteNumber(droppedScore) || !isFiniteNumber(dive.score)) return "dropped";
  return Math.abs(dive.score - droppedScore) < 0.001 ? "dropped" : "included";
}

function renderAthleteProfileCard(explanation) {
  const statusClass = explanation.qualified ? "qualified" : "not-qualified";
  const topMetrics = [
    ["Score used", explanation.scoreUsedLabel],
    ["Score basis", explanation.scoreBasis],
    ["Threshold", explanation.scoreThresholdLabel],
    ["Score gap", explanation.scoreGapLabel],
    ["DD total", explanation.ddTotalLabel],
    ["DD threshold", explanation.ddMinimumLabel],
  ];
  const ncaaLine = explanation.ncaaDerivedScoreUsed
    ? `<div class="profile-ncaa-line">Derived NCAA 5-category score is active. Raw 6-dive score: ${escapeHtml(explanation.ncaaRawSixScoreLabel)}.</div>`
    : "";
  return `
    <section class="athlete-profile-card ${statusClass}">
      <div class="athlete-profile-main">
        <div>
          <p class="profile-kicker">Athlete profile</p>
          <h3>${escapeHtml(explanation.athleteName)}</h3>
          <p>${escapeHtml([explanation.teamNationality, explanation.meet].filter(Boolean).join(" • "))}</p>
          <p>${escapeHtml([explanation.event, explanation.round, explanation.place].filter(Boolean).join(" • "))}</p>
        </div>
        <div class="profile-outcome-pill ${statusClass}">${escapeHtml(explanation.qualified ? "Qualified" : "Outside criteria")}</div>
      </div>
      <div class="athlete-profile-metrics">
        ${topMetrics.map(([label, value]) => `
          <div class="profile-metric">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(displayValue(value))}</strong>
          </div>
        `).join("")}
      </div>
      ${ncaaLine}
      <p class="profile-reason">${escapeHtml(explanation.exactReason)}</p>
    </section>
  `;
}

function renderDiveDna(diveAudit) {
  if (!diveAudit || diveAudit.status !== "matched" || !diveAudit.rows.length) return "";
  const rows = diveAudit.rows;
  const categories = buildDiveDnaCategories(rows);
  const countedText = diveAudit.diveCount ? `${formatInt(diveAudit.countedDiveCount)} of ${formatInt(diveAudit.diveCount)}` : "Not available";
  const summary = [
    ["Meet result score", displayScoreValue(diveAudit.rawResultScore)],
    ["Active score", displayScoreValue(diveAudit.activeScore)],
    ["All-dives DD", displayScoreValue(diveAudit.totalDd)],
    ["Counted DD", displayScoreValue(diveAudit.countedDdTotal)],
    ["Dives counted", countedText],
    ["Best dive", diveSummaryLabel(diveAudit.highestDive)],
  ];
  return `
    <section class="rule-section dive-dna-section">
      <div class="section-title-row">
        <h3>Dive DNA</h3>
        <span>Selected meet result only</span>
      </div>
      <div class="dive-dna-context">
        <div>
          <span>Meet</span>
          <strong>${escapeHtml(diveAudit.meetName)}</strong>
        </div>
        <div>
          <span>Event / round</span>
          <strong>${escapeHtml([diveAudit.eventName, diveAudit.roundName].filter(Boolean).join(" • "))}</strong>
        </div>
        <div>
          <span>Source / year</span>
          <strong>${escapeHtml([diveAudit.sourceName, diveAudit.meetYear].filter(Boolean).join(" • "))}</strong>
        </div>
        <div>
          <span>Score basis</span>
          <strong>${escapeHtml(diveAudit.scoreBasis)}</strong>
        </div>
      </div>
      <p class="dive-dna-scope-note">${escapeHtml(diveAudit.resultScopeNote)}</p>
      <div class="dive-dna-summary">
        ${summary.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(displayValue(value))}</strong></div>`).join("")}
      </div>
      ${diveAudit.isNcaaWomenSpringboard ? `
        <div class="dive-dna-ncaa-note">
          NCAA women's springboard: all 6 dives for this meet result are shown. The derived 5-category score keeps one dive per official group and marks the dropped repeated-group dive. Twisting dives beginning with 5 are Group 5 Twister, even when the dive description starts with Forward, Back, Reverse, or Inward.
        </div>
      ` : ""}
      <div class="dive-dna-grid">
        ${categories.map((category) => renderDiveDnaCategory(category)).join("")}
      </div>
    </section>
  `;
}

function buildDiveDnaCategories(rows) {
  const order = ["1", "2", "3", "4", "5", "6", "other"];
  const map = new Map(order.map((code) => [code, []]));
  rows.forEach((dive, index) => {
    const code = officialDiveGroupCode(dive.dive_number) || String(dive.official_group_code || dive.dive_category_code || "other").trim() || "other";
    const key = map.has(code) ? code : "other";
    map.get(key).push({ dive, index });
  });
  return [...map.entries()]
    .filter(([, dives]) => dives.length)
    .map(([code, dives]) => ({ code, label: code === "other" ? "Other" : officialDiveGroupName(code), dives }));
}

function renderDiveDnaCategory(category) {
  return `
    <div class="dive-dna-category">
      <div class="dive-dna-category-title">${escapeHtml(category.label)}</div>
      <div class="dive-dna-tiles">
        ${category.dives.map(({ dive, index }) => renderDiveDnaTile(dive, index)).join("")}
      </div>
    </div>
  `;
}

function renderDiveDnaTile(dive, index) {
  const inclusion = dive.activeInclusion || { status: "included", label: "Included", note: "" };
  const scorePerDd = isFiniteNumber(dive.score) && isFiniteNumber(dive.dd) && dive.dd > 0 ? dive.score / dive.dd : null;
  return `
    <button type="button" class="dive-dna-tile ${escapeAttr(inclusion.status)}" data-dive-tile-index="${escapeAttr(index)}" title="Highlight this dive in the table">
      <span class="tile-status">${escapeHtml(inclusion.status === "dropped" ? "Dropped" : inclusion.status === "unknown" ? "Review" : "Counted")}</span>
      <strong>${escapeHtml(displayValue(dive.dive_number, "Dive"))}</strong>
      <span class="tile-group-label">${escapeHtml(displayValue(dive.official_group_label || dive.dive_category_label, "Official group unknown"))}</span>
      ${cleanDiveDescription(dive) ? `<span class="tile-description">${escapeHtml(cleanDiveDescription(dive))}</span>` : ""}
      <div class="tile-metrics">
        <em>DD ${escapeHtml(formatScore(dive.dd))}</em>
        <em>Score ${escapeHtml(formatScore(dive.score))}</em>
        <em>Net ${escapeHtml(formatScore(dive.net_score))}</em>
        ${scorePerDd ? `<em>Pts/DD ${escapeHtml(formatScore(scorePerDd))}</em>` : ""}
      </div>
    </button>
  `;
}

function renderDiveAudit(diveAudit) {
  if (!diveAudit) return "";
  const noRows = diveAudit.status !== "matched" || !diveAudit.rows.length;
  return `
    <section class="rule-section dive-audit-section">
      <h3>Dive Sheet</h3>
      <dl class="explain-grid dive-summary-grid">
        ${explanationField("Meet", diveAudit.meetName)}
        ${explanationField("Event", diveAudit.eventName)}
        ${explanationField("Round", diveAudit.roundName)}
        ${explanationField("Raw result score", displayScoreValue(diveAudit.rawResultScore))}
        ${explanationField("Active score used", displayScoreValue(diveAudit.activeScore))}
        ${explanationField("Score basis", diveAudit.scoreBasis)}
        ${explanationField("Number of dives", diveAudit.diveCount ? formatInt(diveAudit.diveCount) : "Not available")}
        ${explanationField("Dives counted in active score", diveAudit.diveCount ? `${formatInt(diveAudit.countedDiveCount)} of ${formatInt(diveAudit.diveCount)}` : "Not available")}
        ${explanationField("All-dives score total", displayScoreValue(diveAudit.totalScore))}
        ${explanationField("Counted-dives score total", displayScoreValue(diveAudit.countedScoreTotal))}
        ${explanationField("All-dives DD", displayScoreValue(diveAudit.totalDd))}
        ${explanationField("Counted-dives DD", displayScoreValue(diveAudit.countedDdTotal))}
        ${explanationField("Final running total", displayScoreValue(diveAudit.finalRunningTotal))}
        ${explanationField("Average DD", displayScoreValue(diveAudit.averageDd))}
        ${explanationField("Highest-scoring dive", diveSummaryLabel(diveAudit.highestDive))}
        ${explanationField("Lowest-scoring dive", diveSummaryLabel(diveAudit.lowestDive))}
      </dl>
      ${diveAudit.isNcaaWomenSpringboard ? renderNcaaDiveAuditSummary(diveAudit) : ""}
      ${noRows ? `<p class="dive-warning">${escapeHtml(diveAudit.note)}</p>` : renderDiveTable(diveAudit.rows)}
    </section>
  `;
}

function renderNcaaDiveAuditSummary(diveAudit) {
  return `
    <div class="ncaa-dive-summary">
      <strong>NCAA women springboard score treatment</strong>
      <p>${escapeHtml(diveAudit.ncaaAdjustmentNote)}</p>
      <dl class="explain-grid compact">
        ${explanationField("Raw NCAA 6-dive", displayScoreValue(diveAudit.rawNcaaSixScore, "Not applicable"))}
        ${explanationField("Derived 5-category", displayScoreValue(diveAudit.derivedNcaaFiveScore, "Not available"))}
        ${explanationField("Derived DD", displayScoreValue(diveAudit.derivedNcaaFiveDd, "Not available"))}
        ${explanationField("Repeated category", diveAudit.repeatedCategory)}
        ${explanationField("Dropped dive", diveAudit.droppedDive)}
        ${explanationField("Adjustment status", diveAudit.ncaaAdjustmentStatus)}
      </dl>
    </div>
  `;
}

function renderDiveTable(rows) {
  return `
    <div class="dive-table-wrap">
      <table class="dive-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Dive</th>
            <th>Official group</th>
            <th>Height</th>
            <th>Description</th>
            <th>DD</th>
            <th>Score</th>
            <th>Net score</th>
            <th>Running total</th>
            <th>Judge scores</th>
            <th>Included?</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((dive, index) => renderDiveRow(dive, index)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderDiveRow(dive, index = 0) {
  const inclusion = dive.activeInclusion || { status: "included", label: "Yes", note: "" };
  return `
    <tr class="${inclusion.status === "dropped" ? "dropped-dive-row" : ""}" data-dive-index="${escapeAttr(index)}">
      <td>${formatPlace(dive.dive_order)}</td>
      <td>${escapeHtml(displayValue(dive.dive_number, ""))}</td>
      <td>${escapeHtml(displayValue(dive.official_group_label || dive.dive_category_label, ""))}</td>
      <td>${escapeHtml(displayValue(dive.height, ""))}</td>
      <td>${escapeHtml(displayValue(dive.description, ""))}</td>
      <td>${formatScore(dive.dd)}</td>
      <td>${formatScore(dive.score)}</td>
      <td>${formatScore(dive.net_score)}</td>
      <td>${formatScore(dive.running_total_points)}</td>
      <td class="judge-scores">${escapeHtml(displayValue(dive.judges_scores, ""))}</td>
      <td>${inclusionBadge(inclusion)}</td>
      <td>${escapeHtml(inclusion.note)}</td>
    </tr>
  `;
}

function inclusionBadge(inclusion) {
  return `<span class="inclusion-badge ${escapeAttr(inclusion.status)}">${escapeHtml(inclusion.label)}</span>`;
}

function diveSummaryLabel(dive) {
  if (!dive) return "Not available";
  const parts = [displayValue(dive.dive_number, "Dive"), displayScoreValue(dive.score)];
  return parts.filter(Boolean).join(" - ");
}

function buildDiveSheetText(diveAudit) {
  if (!diveAudit) return "Dive sheet: Not available";
  const lines = [
    "Dive Sheet",
    `Match status\t${diveAudit.status}`,
    `Match note\t${diveAudit.note}`,
    `Meet\t${diveAudit.meetName}`,
    `Event\t${diveAudit.eventName}`,
    `Round\t${diveAudit.roundName}`,
    `Source/year\t${[diveAudit.sourceName, diveAudit.meetYear].filter(Boolean).join(" • ")}`,
    `Scope\t${diveAudit.resultScopeNote}`,
    `Raw result score\t${displayScoreValue(diveAudit.rawResultScore)}`,
    `Active score used\t${displayScoreValue(diveAudit.activeScore)}`,
    `Score basis\t${diveAudit.scoreBasis}`,
    `Number of dives\t${diveAudit.diveCount || 0}`,
    `Dives counted in active score\t${diveAudit.diveCount ? `${formatInt(diveAudit.countedDiveCount)} of ${formatInt(diveAudit.diveCount)}` : "Not available"}`,
    `All-dives score total\t${displayScoreValue(diveAudit.totalScore)}`,
    `Counted-dives score total\t${displayScoreValue(diveAudit.countedScoreTotal)}`,
    `All-dives DD\t${displayScoreValue(diveAudit.totalDd)}`,
    `Counted-dives DD\t${displayScoreValue(diveAudit.countedDdTotal)}`,
    `Final running total\t${displayScoreValue(diveAudit.finalRunningTotal)}`,
    `Average DD\t${displayScoreValue(diveAudit.averageDd)}`,
  ];

  if (diveAudit.isNcaaWomenSpringboard) {
    lines.push(
      `Raw NCAA 6-dive score\t${displayScoreValue(diveAudit.rawNcaaSixScore, "Not applicable")}`,
      `Derived NCAA 5-category score\t${displayScoreValue(diveAudit.derivedNcaaFiveScore, "Not available")}`,
      `Derived NCAA 5-category DD\t${displayScoreValue(diveAudit.derivedNcaaFiveDd, "Not available")}`,
      `Repeated category\t${diveAudit.repeatedCategory}`,
      `Dropped dive\t${diveAudit.droppedDive}`,
      `Adjustment status\t${diveAudit.ncaaAdjustmentStatus}`,
      `Adjustment note\t${diveAudit.ncaaAdjustmentNote}`
    );
  }

  if (!diveAudit.rows.length) return lines.join("\n");

  lines.push(
    "",
    [
      "Order",
      "Dive",
      "Category",
      "Height",
      "Description",
      "DD",
      "Score",
      "Net score",
      "Running total",
      "Judge scores",
      "Included in active score?",
      "Note",
    ].join("\t")
  );
  diveAudit.rows.forEach((dive) => {
    const inclusion = dive.activeInclusion || { label: "Yes", note: "" };
    lines.push(
      [
        formatPlace(dive.dive_order),
        displayValue(dive.dive_number, ""),
        displayValue(dive.official_group_label || dive.dive_category_label, ""),
        displayValue(dive.height, ""),
        displayValue(dive.description, ""),
        formatScore(dive.dd),
        formatScore(dive.score),
        formatScore(dive.net_score),
        formatScore(dive.running_total_points),
        displayValue(dive.judges_scores, ""),
        inclusion.label,
        inclusion.note,
      ].join("\t")
    );
  });
  return lines.join("\n");
}

function explanationField(label, value) {
  return `
    <div class="explain-item">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(displayValue(value))}</dd>
    </div>
  `;
}

function checkMarkup(check) {
  return `
    <article class="rule-check ${escapeAttr(check.status)}">
      <strong>${escapeHtml(check.label)}</strong>
      <span>${escapeHtml(checkStatusLabel(check.status))}</span>
      <p>${escapeHtml(check.text)}</p>
    </article>
  `;
}

function checkStatusLabel(status) {
  if (status === "pass") return "Pass";
  if (status === "fail") return "Fail";
  if (status === "warn") return "Unknown";
  return "Not active";
}

function buildExplanationText(explanation) {
  const lines = [
    "Rule Explanation",
    `Outcome: ${explanation.qualified ? "Qualified" : "Did not qualify"}`,
    `Exact reason: ${explanation.exactReason}`,
    "",
    `Athlete: ${explanation.athleteName}`,
    `Team / nationality: ${explanation.teamNationality}`,
    `Meet: ${explanation.meet}`,
    `Event: ${explanation.event}`,
    `Round: ${explanation.round}`,
    `Place: ${explanation.place}`,
    `Source group: ${explanation.sourceGroup}`,
    "",
    `Criteria model: ${explanation.criteriaModel}`,
    `Rule mode: ${explanation.ruleMode}`,
    `Qualified by: ${explanation.qualifyingPath}`,
    `Plain-language model: ${explanation.criteriaPlainLanguage}`,
    "",
    `Score used: ${explanation.scoreUsedLabel}`,
    `Score basis used: ${explanation.scoreBasis} (${explanation.scoreBasisMode})`,
    `Score threshold: ${explanation.scoreThresholdLabel}`,
    `Score gap: ${explanation.scoreGapLabel}`,
    `Score check: ${explanation.scoreCheck}`,
    `placement cutoff rule result: ${explanation.topNResult}`,
    "",
    `DD threshold: ${explanation.ddMinimumLabel}`,
    `DD total: ${explanation.ddTotalLabel}`,
    `DD status: ${explanation.ddStatus}`,
    `DD check: ${explanation.ddCheck}`,
  ];

  if (explanation.isNcaaWomenSpringboard) {
    lines.push(
      "",
      `NCAA women's springboard adjustment status: ${explanation.ncaaAdjustmentStatus}`,
      `Raw NCAA 6-dive score: ${explanation.ncaaRawSixScoreLabel}`,
      `Derived NCAA 5-category score: ${explanation.ncaaFiveCategoryScoreLabel}`,
      `Derived NCAA 5-category DD: ${explanation.ncaaFiveCategoryDdLabel}`,
      `Repeated official group: ${explanation.ncaaRepeatedCategory}`,
      `Dropped dive: ${explanation.ncaaDroppedDive}`,
      `Adjustment note: ${explanation.ncaaAdjustmentNote}`
    );
  }

  lines.push(
    "",
    buildDiveSheetText(explanation.diveAudit),
    "",
    `Score detail: ${explanation.scoreDetail}`
  );
  return lines.join("\n");
}

function initStaffModeAndSharing() {
  state.staffMode = false;
  document.getElementById("advancedSettingsToggle")?.addEventListener("click", () => {
    state.advancedVisible = !state.advancedVisible;
    renderModeVisibility();
  });
  document.getElementById("copyScenarioLink")?.addEventListener("click", copyScenarioLink);
  document.getElementById("clearScenarioLink")?.addEventListener("click", clearScenarioHash);
}

function initScenarioSnapshot() {
  document.getElementById("snapshotJumpControls")?.addEventListener("click", () => scrollToAppSection(".control-panel"));
  document.getElementById("snapshotJumpOptimizer")?.addEventListener("click", () => {
    state.advancedVisible = true;
    renderModeVisibility();
    scrollToAppSection(".optimizer-panel");
  });
  document.getElementById("snapshotJumpCertification")?.addEventListener("click", () => scrollToAppSection(".certification-panel"));
  document.getElementById("snapshotCopySummary")?.addEventListener("click", copyScenarioSnapshotSummary);
}


const GUIDED_STEPS = [
  "Purpose",
  "Meets",
  "Score basis",
  "Thresholds",
  "Impact",
  "Certification",
];

function initGuidedCriteriaReview() {
  document.getElementById("guidedReviewStart")?.addEventListener("click", () => {
    state.guidedReviewOpen = true;
    render();
    scrollToAppSection("#guidedReviewShell");
  });
  document.getElementById("guidedReviewCollapse")?.addEventListener("click", () => {
    state.guidedReviewOpen = false;
    renderGuidedCriteriaReviewFromCurrent();
  });
  document.getElementById("guidedReviewBack")?.addEventListener("click", () => {
    state.guidedStep = Math.max(0, state.guidedStep - 1);
    renderGuidedCriteriaReviewFromCurrent();
  });
  document.getElementById("guidedReviewNext")?.addEventListener("click", () => {
    state.guidedStep = Math.min(GUIDED_STEPS.length - 1, state.guidedStep + 1);
    renderGuidedCriteriaReviewFromCurrent();
  });
  document.getElementById("guidedReviewSteps")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-guided-step]");
    if (!button) return;
    state.guidedStep = clamp(number(button.dataset.guidedStep), 0, GUIDED_STEPS.length - 1);
    renderGuidedCriteriaReviewFromCurrent();
  });
  document.getElementById("guidedReviewBody")?.addEventListener("click", handleGuidedReviewClick);
  document.getElementById("guidedReviewBody")?.addEventListener("change", handleGuidedReviewChange);
}

function renderGuidedCriteriaReviewFromCurrent() {
  const bundle = currentScenarioBundle();
  renderGuidedCriteriaReview(bundle.filtered, bundle.evaluated, bundle.qualified, bundle.bubble);
}

function renderGuidedCriteriaReview(filtered, evaluated, qualified, bubble) {
  const panel = document.getElementById("guidedReviewPanel");
  const body = document.getElementById("guidedReviewBody");
  const steps = document.getElementById("guidedReviewSteps");
  const start = document.getElementById("guidedReviewStart");
  const collapse = document.getElementById("guidedReviewCollapse");
  if (!panel || !body || !steps) return;

  panel.hidden = !state.guidedReviewOpen;
  if (start) start.textContent = state.guidedReviewOpen ? "Restart Guided Review" : "Start Guided Criteria Review";
  if (collapse) collapse.hidden = !state.guidedReviewOpen;
  if (!state.guidedReviewOpen) return;

  const step = clamp(state.guidedStep, 0, GUIDED_STEPS.length - 1);
  state.guidedStep = step;
  steps.innerHTML = GUIDED_STEPS.map((label, index) => `
    <button type="button" class="guided-step ${index === step ? "active" : ""} ${index < step ? "complete" : ""}" data-guided-step="${index}">
      <span>${index + 1}</span>${escapeHtml(label)}
    </button>
  `).join("");

  const validation = state.lastValidation || buildValidationDashboard(filtered, evaluated, qualified, bubble);
  const guide = { filtered, evaluated, qualified, bubble, validation };
  body.innerHTML = renderGuidedStep(step, guide);
  const back = document.getElementById("guidedReviewBack");
  const next = document.getElementById("guidedReviewNext");
  if (back) back.disabled = step === 0;
  if (next) next.textContent = step === GUIDED_STEPS.length - 1 ? "Review complete" : "Next";
  if (next) next.disabled = step === GUIDED_STEPS.length - 1;
}

function renderGuidedStep(step, guide) {
  if (step === 0) return renderGuidedPurposeStep(guide);
  if (step === 1) return renderGuidedMeetsStep(guide);
  if (step === 2) return renderGuidedScoreBasisStep(guide);
  if (step === 3) return renderGuidedThresholdStep(guide);
  if (step === 4) return renderGuidedImpactStep(guide);
  return renderGuidedCertificationStep(guide);
}

function renderGuidedPurposeStep(guide) {
  const cards = [
    ["winterEligibility", "Winter Nationals eligibility", "Score-standard eligibility review using approved result sources."],
    ["winterQualifier", "Winter Qualifier advancement", "placement cutoff OR score model for Winter Qualifier pathway review."],
    ["nationalQualifier", "USA Nationals qualifier top 12", "Top-12 qualifier review for National Championships advancement."],
    ["custom", "Custom model", "Use the current controls to test a custom policy scenario."],
  ];
  return `
    <div class="guided-step-header">
      <p class="eyebrow">Step 1</p>
      <h3>What criteria model are we reviewing?</h3>
      <p>Choose the plain-language purpose. This updates the existing controls; athletes still qualify only through criteria logic.</p>
    </div>
    <div class="guided-card-grid">
      ${cards.map(([value, title, detail]) => `
        <button type="button" class="guided-choice-card ${elements.criteriaPreset.value === value ? "selected" : ""}" data-guide-preset="${escapeAttr(value)}">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(detail)}</span>
        </button>
      `).join("")}
    </div>
    ${guidedMiniStats(guide)}
  `;
}

function renderGuidedMeetsStep(guide) {
  const labels = selectedMeetLabels();
  const sample = labels.slice(0, 8);
  const extra = Math.max(0, labels.length - sample.length);
  const families = groupCount(guide.filtered, (row) => row.competition_family || sourceKey(row) || "Unknown");
  return `
    <div class="guided-step-header">
      <p class="eyebrow">Step 2</p>
      <h3>Which exact meets count?</h3>
      <p>The app is currently using <b>${formatInt(labels.length)}</b> exact meet name${labels.length === 1 ? "" : "s"}. Use the left-side Exact Meet Name checklist for fine control.</p>
    </div>
    <div class="guided-summary-grid">
      <article><span>Exact meets selected</span><strong>${formatInt(labels.length)}</strong></article>
      <article><span>Included result rows</span><strong>${formatInt(guide.filtered.length)}</strong></article>
      <article><span>Source families</span><strong>${formatInt(families.length)}</strong></article>
    </div>
    <div class="guided-meet-list">
      ${sample.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
      ${extra ? `<span>+ ${formatInt(extra)} more</span>` : ""}
    </div>
    <div class="guided-action-row">
      <button type="button" data-guide-action="jumpMeetFilters">Edit exact meet checklist</button>
      <button type="button" class="secondary-button" data-guide-action="selectAllMeets">Select all meets</button>
      <button type="button" class="secondary-button" data-guide-action="clearAllMeets">Clear all meets</button>
    </div>
    <div class="guided-source-pills">
      ${families.slice(0, 6).map((item) => `<span><b>${escapeHtml(item.label)}</b>${formatInt(item.count)}</span>`).join("")}
    </div>
  `;
}

function renderGuidedScoreBasisStep(guide) {
  const modes = [...elements.scoreMode.options].map((option) => [option.value, option.textContent]);
  return `
    <div class="guided-step-header">
      <p class="eyebrow">Step 3</p>
      <h3>What score should the model use?</h3>
      <p>Pick the scoring basis staff should evaluate. NCAA women’s springboard adjustments remain labeled and audited separately.</p>
    </div>
    <div class="guided-card-grid score-basis-cards">
      ${modes.map(([value, label]) => `
        <button type="button" class="guided-choice-card ${elements.scoreMode.value === value ? "selected" : ""}" data-guide-score-mode="${escapeAttr(value)}">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(scoreModeGuideText(value))}</span>
        </button>
      `).join("")}
    </div>
    <div class="guided-callout">
      <strong>Current score basis:</strong> ${escapeHtml(selectedOptionText(elements.scoreMode))}
    </div>
  `;
}

function renderGuidedThresholdStep(guide) {
  return `
    <div class="guided-step-header">
      <p class="eyebrow">Step 4</p>
      <h3>Set the criteria thresholds.</h3>
      <p>These inputs mirror the current controls. Applying them re-runs the criteria model; it does not manually change any athlete status.</p>
    </div>
    <div class="guided-threshold-grid">
      <label>Score threshold<input id="guidedScoreThreshold" type="number" step="0.05" value="${escapeAttr(elements.scoreThreshold.value)}" /></label>
      <label>DD threshold<input id="guidedDdThreshold" type="number" step="0.01" value="${escapeAttr(elements.ddThreshold.value)}" /></label>
      <label>DD check<select id="guidedDdMode">${["ignore","knownOnly","requireKnown"].map((value)=>`<option value="${value}" ${elements.ddMode.value === value ? "selected" : ""}>${escapeHtml(ddModeGuideLabel(value))}</option>`).join("")}</select></label>
    </div>
    <div class="guided-action-row">
      <button type="button" data-guide-action="applyGuidedThresholds">Apply thresholds</button>
      <button type="button" class="secondary-button" data-guide-action="useDefaultThresholds">Use model defaults</button>
      <button type="button" class="secondary-button" data-guide-action="ignoreDd">Ignore DD for this run</button>
      <button type="button" class="secondary-button" data-guide-action="enforceDd">Enforce DD when known</button>
    </div>
    ${guidedMiniStats(guide)}
  `;
}

function renderGuidedImpactStep(guide) {
  const avgScore = average(guide.qualified.map((row) => row.analysis_score));
  const avgDd = average(guide.qualified.map((row) => row.dd_total_used));
  const adjusted = guide.evaluated.filter(usesNcaaWomenFiveCategoryScore).length;
  const notes = guide.validation?.issues?.length || 0;
  const byReason = groupCount(guide.qualified, (row) => row.reason || "Criteria met").slice(0, 5);
  return `
    <div class="guided-step-header">
      <p class="eyebrow">Step 5</p>
      <h3>Review the impact before certification.</h3>
      <p>This is the executive view of the current criteria setup.</p>
    </div>
    <div class="guided-summary-grid large">
      <article><span>Criteria met</span><strong>${formatInt(guide.qualified.length)}</strong></article>
      <article><span>Bubble / near miss</span><strong>${formatInt(guide.bubble.length)}</strong></article>
      <article><span>Avg qualifying score</span><strong>${displayScoreValue(avgScore)}</strong></article>
      <article><span>Avg DD</span><strong>${displayScoreValue(avgDd)}</strong></article>
      <article><span>NCAA adjusted rows</span><strong>${formatInt(adjusted)}</strong></article>
      <article><span>Data notes</span><strong>${formatInt(notes)}</strong></article>
    </div>
    <div class="guided-impact-list">
      <h4>Why athletes are meeting criteria</h4>
      ${byReason.length ? byReason.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${formatInt(item.count)}</strong></div>`).join("") : `<p class="muted">No criteria-met athletes in the current scenario.</p>`}
    </div>
    <div class="guided-action-row">
      <button type="button" data-guide-action="openFrontier">Open Qualification Frontier</button>
      <button type="button" class="secondary-button" data-guide-action="openHeatmap">Open Event Strength Heatmap</button>
      <button type="button" class="secondary-button" data-guide-action="runOptimizer">Run optimizer</button>
    </div>
  `;
}

function renderGuidedCertificationStep(guide) {
  const verification = buildCertificationBundle(guide.evaluated, guide.qualified, guide.bubble).needsVerification.length;
  return `
    <div class="guided-step-header">
      <p class="eyebrow">Step 6</p>
      <h3>Generate the certification packet.</h3>
      <p>The packet is criteria-derived. Review notes are audit-only and do not affect results.</p>
    </div>
    <div class="guided-summary-grid large">
      <article><span>Criteria met</span><strong>${formatInt(guide.qualified.length)}</strong></article>
      <article><span>Bubble / near miss</span><strong>${formatInt(guide.bubble.length)}</strong></article>
      <article><span>Needs data verification</span><strong>${formatInt(verification)}</strong></article>
      <article><span>Exact meets</span><strong>${formatInt(selectedMeetIds().size)}</strong></article>
    </div>
    <div class="guided-certification-card">
      <strong>Ready for certification review</strong>
      <p>Open the Criteria Certification Center to view the full criteria-derived packet, add audit-only review notes, or export a memo.</p>
      <div class="guided-action-row">
        <button type="button" data-guide-action="openCertification">Open certification details</button>
        <button type="button" class="secondary-button" data-guide-action="exportCertificationMemo">Export certification memo</button>
        <button type="button" class="secondary-button" data-guide-action="copyCertificationSummary">Copy certification summary</button>
      </div>
    </div>
  `;
}

function guidedMiniStats(guide) {
  return `
    <div class="guided-mini-stats">
      <span><b>${formatInt(guide.filtered.length)}</b> included rows</span>
      <span><b>${formatInt(guide.qualified.length)}</b> criteria met</span>
      <span><b>${formatInt(guide.bubble.length)}</b> bubble</span>
    </div>
  `;
}

function handleGuidedReviewClick(event) {
  const preset = event.target.closest("[data-guide-preset]");
  if (preset) {
    elements.criteriaPreset.value = preset.dataset.guidePreset;
    applyPresetDefaults(false);
    render();
    return;
  }
  const scoreMode = event.target.closest("[data-guide-score-mode]");
  if (scoreMode) {
    elements.scoreMode.value = scoreMode.dataset.guideScoreMode;
    render();
    return;
  }
  const action = event.target.closest("[data-guide-action]");
  if (!action) return;
  handleGuidedAction(action.dataset.guideAction);
}

function handleGuidedReviewChange(event) {
  const target = event.target;
  if (!["guidedScoreThreshold", "guidedDdThreshold", "guidedDdMode"].includes(target.id)) return;
  // Wait for Apply so staff can review the inputs before changing the live model.
}

function handleGuidedAction(action) {
  if (action === "jumpMeetFilters") {
    scrollToAppSection("#meetFilters");
    return;
  }
  if (action === "selectAllMeets") {
    setMeetIds(allMeetIds());
    render();
    return;
  }
  if (action === "clearAllMeets") {
    setMeetIds([]);
    render();
    return;
  }
  if (action === "applyGuidedThresholds") {
    const score = document.getElementById("guidedScoreThreshold")?.value ?? "";
    const dd = document.getElementById("guidedDdThreshold")?.value ?? "";
    const ddMode = document.getElementById("guidedDdMode")?.value || elements.ddMode.value;
    elements.scoreThreshold.value = score;
    elements.ddThreshold.value = dd;
    elements.ddMode.value = ddMode;
    state.thresholdEdited = true;
    state.ddThresholdEdited = true;
    autoEnableDdFilter();
    render();
    return;
  }
  if (action === "useDefaultThresholds") {
    state.thresholdEdited = false;
    state.ddThresholdEdited = false;
    applyEventDefaults();
    render();
    return;
  }
  if (action === "ignoreDd") {
    elements.ddMode.value = "ignore";
    render();
    return;
  }
  if (action === "enforceDd") {
    elements.ddMode.value = "knownOnly";
    render();
    return;
  }
  if (action === "openFrontier") {
    state.advancedVisible = true;
    renderModeVisibility();
    scrollToAppSection(".frontier-panel");
    return;
  }
  if (action === "openHeatmap") {
    state.advancedVisible = true;
    renderModeVisibility();
    scrollToAppSection(".heatmap-panel");
    return;
  }
  if (action === "runOptimizer") {
    state.advancedVisible = true;
    state.optimizerReady = true;
    render();
    scrollToAppSection(".optimizer-panel");
    return;
  }
  if (action === "openCertification") {
    state.certificationDetailsOpen = true;
    renderCertificationCenterFromCurrent();
    scrollToAppSection(".certification-panel");
    return;
  }
  if (action === "exportCertificationMemo") {
    exportCertificationMemoHtml();
    return;
  }
  if (action === "copyCertificationSummary") {
    copyCertificationSummary();
  }
}

function scoreModeGuideText(value) {
  if (value === "ncaaWomen5Category") return "Recommended when NCAA women's springboard rows need a labeled 5-category comparison score.";
  if (value === "phaseOrStandalone") return "Uses the best non-cumulative score available for the selected result.";
  if (value === "posted") return "Uses the official posted result score as stored in the source data.";
  if (value === "phasePreferred") return "Uses phase score when available, then falls back to posted score.";
  return "Uses the selected score basis.";
}

function ddModeGuideLabel(value) {
  if (value === "ignore") return "Ignore DD for this run";
  if (value === "knownOnly") return "Enforce when known";
  if (value === "requireKnown") return "Require known DD";
  return value;
}

function groupCount(rows, labelFn) {
  const map = new Map();
  rows.forEach((row) => {
    const label = String(labelFn(row) || "Unknown").trim() || "Unknown";
    map.set(label, (map.get(label) || 0) + 1);
  });
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function average(values) {
  const nums = values.filter(isFiniteNumber);
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
}

function clamp(value, min, max) {
  const numeric = isFiniteNumber(value) ? value : min;
  return Math.max(min, Math.min(max, numeric));
}

function scrollToAppSection(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateScenarioSnapshot(filtered, qualified, bubble, validation) {
  const scenario = currentScenarioState();
  const presetLabel = selectedOptionText(elements.criteriaPreset);
  const scoreBasis = selectedOptionText(elements.scoreMode);
  const dataNoteCount = validation?.issues?.length || 0;
  setTextIfPresent("snapshotScenarioName", scenario.scenarioName || "Unsaved scenario");
  setTextIfPresent("snapshotCriteriaPreset", compactSnapshotText(presetLabel, 28));
  setTextIfPresent("snapshotScoreThreshold", displayScoreValue(number(elements.scoreThreshold.value), "None"));
  setTextIfPresent("snapshotDdThreshold", elements.ddMode.value === "ignore" ? "Off" : displayScoreValue(number(elements.ddThreshold.value), "None"));
  setTextIfPresent("snapshotTopN", number(elements.topN.value) ? formatInt(number(elements.topN.value)) : "Off");
  setTextIfPresent("snapshotScoreBasis", compactSnapshotText(scoreBasis, 32));
  setTextIfPresent("snapshotMeetCount", formatInt(selectedMeetIds().size));
  setTextIfPresent("snapshotCriteriaMet", formatInt(qualified.length));
  setTextIfPresent("snapshotBubble", formatInt(bubble.length));
  setTextIfPresent("snapshotDataNotes", formatInt(dataNoteCount));
}

function compactSnapshotText(value, maxLength = 30) {
  const text = String(value || "—").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function copyScenarioSnapshotSummary() {
  const scenario = currentScenarioState();
  const bundle = currentScenarioBundle();
  const validation = state.lastValidation || buildValidationDashboard(bundle.filtered, bundle.evaluated, bundle.qualified, bundle.bubble);
  const lines = [
    "USA Diving Criteria Simulator - Scenario Snapshot",
    `Scenario: ${scenario.scenarioName || "Unsaved scenario"}`,
    `Criteria model: ${selectedOptionText(elements.criteriaPreset)}`,
    `Gender: ${selectedOptionText(elements.genderFilter)}`,
    `Event: ${selectedOptionText(elements.disciplineFilter)}`,
    `Round: ${selectedOptionText(elements.roundFilter)}`,
    `Score threshold: ${displayScoreValue(number(elements.scoreThreshold.value), "None")}`,
    `DD threshold: ${elements.ddMode.value === "ignore" ? "Off" : displayScoreValue(number(elements.ddThreshold.value), "None")}`,
    `DD check: ${selectedOptionText(elements.ddMode)}`,
    `Placement cutoff: ${number(elements.topN.value) ? formatInt(number(elements.topN.value)) : "Off"}`,
    `Score basis: ${selectedOptionText(elements.scoreMode)}`,
    `Exact meets selected: ${formatInt(selectedMeetIds().size)}`,
    `Included result rows: ${formatInt(bundle.filtered.length)}`,
    `Criteria met: ${formatInt(bundle.qualified.length)}`,
    `Bubble: ${formatInt(bundle.bubble.length)}`,
    `Data quality notes: ${formatInt(validation.issues.length)}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];
  copyText(lines.join("\n"))
    .then(() => {
      setTextIfPresent("snapshotCopyStatus", "Copied");
      window.setTimeout(() => setTextIfPresent("snapshotCopyStatus", ""), 2500);
    })
    .catch(() => setTextIfPresent("snapshotCopyStatus", "Copy failed"));
}

function initStaffReviewExports() {
  document.getElementById("exportQualifiedCsv")?.addEventListener("click", exportQualifiedAthletesCsv);
  document.getElementById("exportBubbleCsv")?.addEventListener("click", exportBubbleAthletesCsv);
  document.getElementById("exportScenarioCsv")?.addEventListener("click", exportScenarioSettingsCsv);
  document.getElementById("exportDiveSheetCsv")?.addEventListener("click", exportSelectedDiveSheetCsv);
  document.getElementById("exportStaffHtml")?.addEventListener("click", exportStaffReviewHtml);
}

function initValidationDashboard() {
  document.getElementById("validationFilter")?.addEventListener("change", () => {
    if (state.lastValidation) renderValidationTable(state.lastValidation.issues);
  });
  document.getElementById("copyValidationSummary")?.addEventListener("click", copyValidationSummary);
  document.getElementById("exportValidationCsv")?.addEventListener("click", exportValidationCsv);
}

function renderModeVisibility() {
  document.body.classList.toggle("staff-mode", state.staffMode);
  document.body.classList.toggle("staff-advanced-open", state.advancedVisible);
  const advancedButton = document.getElementById("advancedSettingsToggle");
  if (advancedButton) {
    advancedButton.textContent = state.advancedVisible ? "Hide advanced settings" : "Show advanced settings";
  }
}

function currentScenarioState() {
  return {
    scenarioName: scenarioById(state.activeScenarioId)?.name || scenarioElements.scenarioName?.value || "Unsaved scenario",
    ...captureControls(),
  };
}

function currentScenarioBundle() {
  const filtered = filteredRows();
  const evaluated = filtered.map((row) => evaluateRow(row));
  const qualified = bestQualifiedRows(evaluated);
  const bubble = bubbleRows(evaluated, qualified);
  return { filtered, evaluated, qualified, bubble };
}

function scenarioFileStem(kind) {
  const scenario = currentScenarioState();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return `criteria-simulator-${kind}-${safeFileName(scenario.scenarioName)}-${stamp}`;
}

function setExportStatus(message, statusClass = "saved") {
  const target = document.getElementById("exportStatus");
  if (!target) return;
  target.textContent = message;
  target.className = `scenario-status${statusClass ? ` ${statusClass}` : ""}`;
}

function setSharingStatus(message, statusClass = "saved") {
  const target = document.getElementById("sharingStatus");
  if (!target) return;
  target.textContent = message;
  target.className = `scenario-status${statusClass ? ` ${statusClass}` : ""}`;
}

function setValidationStatus(message) {
  const target = document.getElementById("validationStatus");
  if (target) target.textContent = message;
}

function setTextIfPresent(id, value) {
  const target = document.getElementById(id);
  if (target) target.textContent = value;
}

function exportQualifiedAthletesCsv() {
  const { qualified } = currentScenarioBundle();
  const csv = toCsv(qualified, qualifiedExportColumns());
  downloadTextFile(`${scenarioFileStem("qualified")}.csv`, csv, "text/csv;charset=utf-8");
  setExportStatus(`Exported ${formatInt(qualified.length)} qualified athlete row(s).`);
}

function exportBubbleAthletesCsv() {
  const { bubble } = currentScenarioBundle();
  const csv = toCsv(bubble, bubbleExportColumns());
  downloadTextFile(`${scenarioFileStem("bubble")}.csv`, csv, "text/csv;charset=utf-8");
  setExportStatus(`Exported ${formatInt(bubble.length)} bubble athlete row(s).`);
}

function exportScenarioSettingsCsv() {
  const { filtered, qualified, bubble } = currentScenarioBundle();
  const scenario = currentScenarioState();
  const row = {
    scenario_name: scenario.scenarioName,
    criteria_preset: selectedOptionText(elements.criteriaPreset),
    gender_filter: selectedOptionText(elements.genderFilter),
    discipline_filter: selectedOptionText(elements.disciplineFilter),
    round_filter: selectedOptionText(elements.roundFilter),
    score_mode: selectedOptionText(elements.scoreMode),
    athlete_scope: selectedOptionText(elements.athleteScope),
    score_threshold: elements.scoreThreshold.value,
    dd_threshold: elements.ddThreshold.value,
    dd_mode: selectedOptionText(elements.ddMode),
    top_n: elements.topN.value,
    rule_mode: selectedOptionText(elements.ruleMode),
    selected_exact_meets: selectedMeetLabels().join(" | "),
    result_row_count: filtered.length,
    qualified_count: qualified.length,
    bubble_count: bubble.length,
    generated_at: new Date().toISOString(),
  };
  const columns = Object.keys(row).map((key) => ({ header: key, value: (item) => item[key] }));
  downloadTextFile(`${scenarioFileStem("scenario-settings")}.csv`, toCsv([row], columns), "text/csv;charset=utf-8");
  setExportStatus("Exported scenario settings CSV.");
}

function exportSelectedDiveSheetCsv() {
  if (!state.currentExplanation?.diveAudit) {
    setExportStatus("Open an athlete audit before exporting a dive sheet.", "error");
    return;
  }
  const explanation = state.currentExplanation;
  const rows = explanation.diveAudit.rows || [];
  if (!rows.length) {
    setExportStatus("The selected athlete audit has no matched dive sheet.", "error");
    return;
  }
  const csvRows = rows.map((dive) => ({ explanation, dive, inclusion: dive.activeInclusion || {} }));
  const columns = [
    { header: "athlete_name", value: (row) => row.explanation.athleteName },
    { header: "meet_name", value: (row) => row.explanation.meet },
    { header: "event_name", value: (row) => row.explanation.event },
    { header: "round_stage", value: (row) => row.explanation.round },
    { header: "dive_order", value: (row) => row.dive.dive_order },
    { header: "dive_number", value: (row) => row.dive.dive_number },
    { header: "official_group", value: (row) => row.dive.official_group_label || row.dive.dive_category_label },
    { header: "height", value: (row) => row.dive.height },
    { header: "description", value: (row) => row.dive.description },
    { header: "dd", value: (row) => row.dive.dd },
    { header: "score", value: (row) => row.dive.score },
    { header: "net_score", value: (row) => row.dive.net_score },
    { header: "running_total", value: (row) => row.dive.running_total_points },
    { header: "judge_scores", value: (row) => row.dive.judges_scores },
    { header: "included_in_active_score", value: (row) => row.inclusion.label || "" },
    { header: "note", value: (row) => row.inclusion.note || "" },
  ];
  downloadTextFile(`${scenarioFileStem("selected-dive-sheet")}.csv`, toCsv(csvRows, columns), "text/csv;charset=utf-8");
  setExportStatus("Exported selected dive sheet CSV.");
}

function exportStaffReviewHtml() {
  const { filtered, evaluated, qualified, bubble } = currentScenarioBundle();
  const validation = buildValidationDashboard(filtered, evaluated, qualified, bubble);
  const html = staffReviewHtml({ filtered, qualified, bubble, validation });
  downloadTextFile(`${scenarioFileStem("staff-review")}.html`, html, "text/html;charset=utf-8");
  setExportStatus("Exported full staff review HTML report.");
}

function exportValidationCsv() {
  const validation = state.lastValidation || buildValidationDashboard(...validationBundleArgs());
  const columns = [
    { header: "severity", value: (row) => row.severity },
    { header: "category", value: (row) => row.category },
    { header: "message", value: (row) => row.message },
    { header: "affected_rows", value: (row) => row.affectedRows },
    { header: "suggested_action", value: (row) => row.suggestedAction },
  ];
  downloadTextFile(`${scenarioFileStem("validation")}.csv`, toCsv(validation.issues, columns), "text/csv;charset=utf-8");
  setValidationStatus("Validation CSV exported");
}

function validationBundleArgs() {
  const bundle = currentScenarioBundle();
  return [bundle.filtered, bundle.evaluated, bundle.qualified, bundle.bubble];
}

function copyValidationSummary() {
  const validation = state.lastValidation || buildValidationDashboard(...validationBundleArgs());
  copyText(buildValidationSummaryText(validation))
    .then(() => setValidationStatus("Validation summary copied"))
    .catch(() => setValidationStatus("Copy failed"));
}

function qualifiedExportColumns() {
  return [
    { header: "athlete_name", value: (row) => row.diver_name },
    { header: "team", value: (row) => row.team_name },
    { header: "nationality", value: (row) => row.nat },
    { header: "meet_name", value: (row) => row.meet_name },
    { header: "meet_year", value: (row) => row.meet_year },
    { header: "competition_family", value: (row) => row.competition_family },
    { header: "competition_group", value: (row) => row.competition_group },
    { header: "event_name", value: (row) => row.event_name },
    { header: "gender", value: (row) => row.gender },
    { header: "discipline", value: (row) => row.discipline },
    { header: "round_stage", value: (row) => row.round_stage },
    { header: "place", value: (row) => row.place },
    { header: "score_used", value: (row) => row.analysis_score },
    { header: "score_basis", value: (row) => row.score_basis },
    { header: "score_threshold", value: (row) => row.threshold_used },
    { header: "score_gap", value: (row) => isFiniteNumber(row.analysis_score) && isFiniteNumber(row.threshold_used) ? row.analysis_score - row.threshold_used : "" },
    { header: "dd_total", value: (row) => row.dd_total_used },
    { header: "dd_threshold", value: (row) => row.dd_minimum_used },
    { header: "dd_status", value: (row) => row.dd_status },
    { header: "top_n", value: () => elements.topN.value },
    { header: "qualification_reason", value: (row) => row.reason },
    ...ncaaExportColumns(),
  ];
}

function bubbleExportColumns() {
  return [
    { header: "athlete_name", value: (row) => row.diver_name },
    { header: "team", value: (row) => row.team_name },
    { header: "nationality", value: (row) => row.nat },
    { header: "meet_name", value: (row) => row.meet_name },
    { header: "meet_year", value: (row) => row.meet_year },
    { header: "competition_family", value: (row) => row.competition_family },
    { header: "competition_group", value: (row) => row.competition_group },
    { header: "event_name", value: (row) => row.event_name },
    { header: "gender", value: (row) => row.gender },
    { header: "discipline", value: (row) => row.discipline },
    { header: "round_stage", value: (row) => row.round_stage },
    { header: "place", value: (row) => row.place },
    { header: "score_used", value: (row) => row.analysis_score },
    { header: "score_basis", value: (row) => row.score_basis },
    { header: "score_threshold", value: (row) => row.threshold_used },
    { header: "score_gap", value: (row) => row.threshold_gap },
    { header: "dd_total", value: (row) => row.dd_total_used },
    { header: "dd_threshold", value: (row) => row.dd_minimum_used },
    { header: "dd_status", value: (row) => row.dd_status },
    { header: "reason_not_qualified", value: (row) => row.reason },
    ...ncaaExportColumns(),
  ];
}

function ncaaExportColumns() {
  return [
    { header: "phase_dive_count", value: (row) => row.phase_dive_count },
    { header: "raw_ncaa_6_dive_score", value: (row) => row.ncaa_women_springboard_raw_6_dive_score },
    { header: "derived_ncaa_5_category_score", value: (row) => row.ncaa_women_springboard_5cat_score },
    { header: "derived_ncaa_5_category_dd_sum", value: (row) => row.ncaa_women_springboard_5cat_dd_sum },
    { header: "ncaa_adjustment_status", value: (row) => row.ncaa_women_springboard_adjustment_status },
    { header: "ncaa_adjustment_note", value: (row) => row.ncaa_women_springboard_adjustment_note },
    { header: "repeated_category", value: (row) => row.ncaa_women_springboard_repeated_category },
    { header: "dropped_dive_number", value: (row) => row.ncaa_women_springboard_dropped_dive_number },
    { header: "dropped_dive_score", value: (row) => row.ncaa_women_springboard_dropped_dive_score },
  ];
}

function toCsv(rows, columns) {
  const header = columns.map((column) => csvEscape(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(column.value(row))).join(","));
  return [header, ...body].join("\r\n");
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function selectedMeetLabels() {
  const ids = selectedMeetIds();
  const byId = new Map(DATA.results.map((row) => [String(row.meet_id), meetLabel(row)]));
  return [...ids].map((id) => byId.get(String(id)) || id).sort();
}

function staffReviewHtml(bundle) {
  const scenario = currentScenarioState();
  const settingsRows = [
    ["Scenario", scenario.scenarioName],
    ["Criteria model", selectedOptionText(elements.criteriaPreset)],
    ["Gender", selectedOptionText(elements.genderFilter)],
    ["Event", selectedOptionText(elements.disciplineFilter)],
    ["Round", selectedOptionText(elements.roundFilter)],
    ["Score basis", selectedOptionText(elements.scoreMode)],
    ["Score threshold", elements.scoreThreshold.value || "Not set"],
    ["DD threshold", elements.ddThreshold.value || "Not set"],
    ["DD check", selectedOptionText(elements.ddMode)],
    ["Placement cutoff", elements.topN.value || "Not active"],
    ["Rule mode", selectedOptionText(elements.ruleMode)],
    ["Exact meets", selectedMeetLabels().join("; ")],
    ["Generated", new Date().toLocaleString()],
  ];
  const summaryRows = [
    ["Included result rows", bundle.filtered.length],
    ["Qualified athletes", bundle.qualified.length],
    ["Bubble athletes", bundle.bubble.length],
    ["Data quality notes", bundle.validation.issues.length],
    ["Critical validation issues", bundle.validation.issues.filter((issue) => issue.severity === "Critical").length],
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>USA Diving Criteria Simulator Staff Review</title>
<style>
body{font-family:Arial,sans-serif;margin:28px;color:#141722}h1{color:#171f69}h2{margin-top:28px;color:#171f69}.note{padding:12px;border-left:5px solid #e31937;background:#f3f7fb}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #d8dde8;padding:6px;text-align:left;vertical-align:top}th{background:#171f69;color:#fff}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.card{border:1px solid #d8dde8;padding:12px;background:#f3f7fb}.critical{color:#b00020;font-weight:bold}.warning{color:#8a5200;font-weight:bold}@media print{button{display:none}body{margin:12px}}
</style>
</head>
<body>
<h1>USA Diving Criteria Simulator Staff Review</h1>
<p class="note">This report reflects the active scenario and filters at export time. NCAA women's springboard derived 5-category scores are labeled separately from raw NCAA 6-dive scores.</p>
<h2>Scenario Settings</h2>${htmlTable(["Setting","Value"], settingsRows)}
<h2>Summary</h2><div class="cards">${summaryRows.map(([k,v]) => `<div class="card"><strong>${escapeHtml(k)}</strong><br>${escapeHtml(v)}</div>`).join("")}</div>
<h2>Validation Summary</h2>${htmlTable(["Severity","Category","Message","Affected rows","Suggested action"], bundle.validation.issues.map(issue => [issue.severity, issue.category, issue.message, issue.affectedRows, issue.suggestedAction]))}
<h2>Qualified Athletes</h2>${htmlTable(qualifiedExportColumns().map(c => c.header), bundle.qualified.map(row => qualifiedExportColumns().map(c => c.value(row))))}
<h2>Bubble Athletes</h2>${htmlTable(bubbleExportColumns().map(c => c.header), bundle.bubble.map(row => bubbleExportColumns().map(c => c.value(row))))}
</body>
</html>`;
}

function htmlTable(headers, rows) {
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(displayValue(value, ""))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}">No rows.</td></tr>`}</tbody></table>`;
}

function buildValidationDashboard(rows, evaluated, qualified, bubble) {
  const issues = [];
  const addIssue = (severity, category, message, affectedRows, suggestedAction) => {
    if (!affectedRows) return;
    issues.push({ severity, category, message, affectedRows, suggestedAction });
  };
  const ddKnownRows = rows.filter((row) => isFiniteNumber(row.phase_dd_sum));
  const rowsMissingDd = rows.length - ddKnownRows.length;
  const diveMatches = rows.map((row) => getDiveRowsForResult(row));
  const rowsWithDiveSheets = diveMatches.filter((match) => match.status === "matched" && match.rows.length).length;
  const rowsMissingDiveSheets = rows.length - rowsWithDiveSheets;
  const ncaaSpringboardRows = rows.filter(isNcaaWomenSpringboardRow);
  const ncaaAdjustedRows = ncaaSpringboardRows.filter((row) => row.ncaa_women_springboard_adjustment_status === "adjusted");
  const ncaaAdjustmentFailures = ncaaSpringboardRows.length - ncaaAdjustedRows.length;
  const missingKeyRows = rows.filter((row) => !row.diver_name || !row.meet_name || !row.event_name || !row.discipline || !row.gender || !row.round_stage || (!isFiniteNumber(scoreValue(row)) && !isFiniteNumber(row.posted_score)));
  const ambiguousDiveMatches = diveMatches.filter((match) => match.status === "ambiguous").length;
  const mixedScoreFormats = mixedScoreFormatIssues(rows);

  addIssue("Critical", "NCAA women springboard", "Some NCAA women's 1m/3m rows do not have enough matched dive data for automatic 5-category adjustment.", ncaaAdjustmentFailures, "Use the athlete audit to confirm whether the raw NCAA score or another source should be used.");
  if (elements.scoreMode.value !== "ncaaWomen5Category") {
    addIssue("Info", "Score basis note", "NCAA women's springboard rows are present and are currently shown under the selected score basis.", ncaaSpringboardRows.length, "Use the derived NCAA 5-category mode when comparing these rows against 5-dive USA/World-style standards.");
  }
  if (elements.ddMode.value !== "ignore") {
    const percentMissing = rows.length ? rowsMissingDd / rows.length : 0;
    addIssue(elements.ddMode.value === "requireKnown" && percentMissing > 0.35 ? "Critical" : "Info", "DD coverage note", "DD threshold is active and some filtered rows do not publish a DD total.", rowsMissingDd, "For a strict DD-only review, use Require known DD; otherwise this is a coverage note for interpretation.");
  }
  addIssue("Info", "Score format context", "The current filtered set includes more than one score format for at least one gender/event group.", mixedScoreFormats.count, mixedScoreFormats.message || "Use the score-basis labels when comparing rows.");
  addIssue("Warning", "Incomplete row detail", "Some rows have incomplete athlete, event, round, or score detail.", missingKeyRows.length, "Open affected athlete audits or verify the source data before using those rows for final decisions.");
  addIssue("Info", "Dive sheet matching note", "Dive sheet data exists but could not be confidently matched for some rows.", ambiguousDiveMatches, "Use athlete audit and source files if dive-level review is needed for those rows.");
  addIssue("Info", "Dive sheet coverage", "Some filtered rows do not have matched dive-sheet detail.", rowsMissingDiveSheets, "Athlete audits will show available dives where a sheet can be matched.");
  addIssue("Info", "Exact meet filter", "Exact meet filtering is active for the current scenario.", selectedMeetIds().size, `Selected exact meets: ${selectedMeetLabels().join(" | ") || "None"}.`);

  return {
    cards: {
      totalRows: rows.length,
      qualifiedCount: qualified.length,
      bubbleCount: bubble.length,
      ddKnown: ddKnownRows.length,
      ddMissing: rowsMissingDd,
      diveSheets: rowsWithDiveSheets,
      missingDiveSheets: rowsMissingDiveSheets,
      ncaaSpringboard: ncaaSpringboardRows.length,
      ncaaAdjusted: ncaaAdjustedRows.length,
      ncaaFailures: ncaaAdjustmentFailures,
      mixedWarnings: mixedScoreFormats.count,
    },
    issues,
  };
}

function mixedScoreFormatIssues(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = [row.gender, row.discipline].join("::");
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(scoreFormatGroup(row));
  });
  const mixed = [...groups.values()].filter((formats) => formats.size > 1);
  return {
    count: mixed.length,
    message: mixed.length ? [...groups.entries()].filter(([, formats]) => formats.size > 1).map(([key, formats]) => `${key.replace("::", " ")}: ${[...formats].join(", ")}`).join("; ") : "",
  };
}

function scoreFormatGroup(row) {
  if (usesNcaaWomenFiveCategoryScore(row)) return "Derived NCAA 5-category";
  if (isNcaaWomenSpringboardRow(row)) return "Raw NCAA 6-dive";
  if (row.phase_dive_count) return `${row.competition_family || "Other"} ${formatInt(row.phase_dive_count)}-dive`;
  return row.competition_family || "Unknown";
}

function renderValidationDashboard(rows, evaluated, qualified, bubble) {
  const validation = buildValidationDashboard(rows, evaluated, qualified, bubble);
  state.lastValidation = validation;
  const cardTarget = document.getElementById("validationCards");
  if (cardTarget) {
    const cards = [
      ["Filtered rows", validation.cards.totalRows],
      ["Qualified", validation.cards.qualifiedCount],
      ["Bubble", validation.cards.bubbleCount],
      ["Known DD", validation.cards.ddKnown],
      ["Missing DD", validation.cards.ddMissing],
      ["Dive sheets", validation.cards.diveSheets],
      ["Missing sheets", validation.cards.missingDiveSheets],
      ["NCAA W springboard", validation.cards.ncaaSpringboard],
      ["NCAA adjusted", validation.cards.ncaaAdjusted],
      ["NCAA needs review", validation.cards.ncaaFailures],
      ["Score format notes", validation.cards.mixedWarnings],
    ];
    cardTarget.innerHTML = cards.map(([label, value]) => `<article class="validation-card"><span>${escapeHtml(label)}</span><strong>${formatInt(value)}</strong></article>`).join("");
  }
  renderValidationTable(validation.issues);
}

function renderValidationTable(issues) {
  const target = document.getElementById("validationRows");
  if (!target) return;
  const filter = document.getElementById("validationFilter")?.value || "all";
  const visible = filter === "all" ? issues : issues.filter((issue) => issue.severity === filter);
  target.innerHTML = visible.length
    ? visible.map((issue) => `<tr>
        <td>${validationSeverityBadge(issue.severity)}</td>
        <td>${escapeHtml(issue.category)}</td>
        <td>${escapeHtml(issue.message)}</td>
        <td>${formatInt(issue.affectedRows)}</td>
        <td>${escapeHtml(issue.suggestedAction)}</td>
      </tr>`).join("")
    : `<tr><td colspan="5">No data notes for this filter.</td></tr>`;
}

function validationSeverityBadge(severity) {
  const labels = { Critical: "Action needed", Warning: "Review note", Info: "Data note" };
  return `<span class="validation-severity ${escapeAttr(severity.toLowerCase())}">${escapeHtml(labels[severity] || severity)}</span>`;
}

function buildValidationSummaryText(validation) {
  const lines = [
    "Data Quality Notes",
    `Filtered rows\t${validation.cards.totalRows}`,
    `Qualified\t${validation.cards.qualifiedCount}`,
    `Bubble\t${validation.cards.bubbleCount}`,
    `Known DD\t${validation.cards.ddKnown}`,
    `Missing DD\t${validation.cards.ddMissing}`,
    `Dive sheets\t${validation.cards.diveSheets}`,
    `NCAA adjustment failures\t${validation.cards.ncaaFailures}`,
    "",
    "Severity\tCategory\tMessage\tAffected rows\tSuggested action",
    ...validation.issues.map((issue) => [issue.severity, issue.category, issue.message, issue.affectedRows, issue.suggestedAction].join("\t")),
  ];
  return lines.join("\n");
}


function initOptimizerAndCertification() {
  state.certificationNotes = loadCertificationNotes();
  ["optimizerTargetMin","optimizerTargetMax","optimizerScoreStart","optimizerScoreEnd","optimizerScoreStep","optimizerDdStart","optimizerDdEnd","optimizerDdStep","optimizerUseDd","optimizerMethod"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => { state.optimizerPreview = null; state.optimizerReady = false; render(); });
    el.addEventListener("input", () => { state.optimizerPreview = null; state.optimizerReady = false; render(); });
  });
  document.getElementById("optimizerRun")?.addEventListener("click", () => { state.optimizerReady = true; state.optimizerPreview = null; render(); });
  document.getElementById("criteriaOptimizerMap")?.addEventListener("click", handleOptimizerMapClick);
  document.getElementById("criteriaOptimizerMap")?.addEventListener("keydown", handleOptimizerMapKeydown);
  document.getElementById("optimizerApplyPreview")?.addEventListener("click", applyOptimizerPreview);
  document.getElementById("exportOptimizerCsv")?.addEventListener("click", exportOptimizerGridCsv);
  document.getElementById("exportOptimizerMemo")?.addEventListener("click", exportOptimizerMemoHtml);
  document.getElementById("toggleCertificationDetails")?.addEventListener("click", () => { state.certificationDetailsOpen = !state.certificationDetailsOpen; renderCertificationCenterFromCurrent(); });
  document.getElementById("criteriaCertificationCenter")?.addEventListener("click", handleCertificationClick);
  document.getElementById("criteriaCertificationCenter")?.addEventListener("input", handleCertificationNoteInput);
  document.getElementById("exportCertificationCsv")?.addEventListener("click", exportCertificationCsv);
  document.getElementById("exportCertificationMemo")?.addEventListener("click", exportCertificationMemoHtml);
  document.getElementById("copyCertificationSummary")?.addEventListener("click", copyCertificationSummary);
}

function optimizerNumber(id, fallback) {
  const value = number(document.getElementById(id)?.value);
  return isFiniteNumber(value) ? value : fallback;
}

function optimizerSettings(rawRows) {
  const scores = rawRows.map((row) => scoreValue(row)).filter(isFiniteNumber);
  const dds = rawRows.map((row) => row.phase_dd_sum).filter(isFiniteNumber);
  const currentScore = number(elements.scoreThreshold.value) ?? median(scores) ?? 0;
  const currentDd = ddMinimum() ?? median(dds) ?? 0;
  const scoreStep = Math.max(0.1, optimizerNumber("optimizerScoreStep", Math.max(1, disciplineStep() || 5)));
  const ddStep = Math.max(0.01, optimizerNumber("optimizerDdStep", 0.25));
  return {
    targetMin: Math.max(0, Math.round(optimizerNumber("optimizerTargetMin", 8))),
    targetMax: Math.max(0, Math.round(optimizerNumber("optimizerTargetMax", 16))),
    scoreStart: optimizerNumber("optimizerScoreStart", Math.max(0, Math.floor((currentScore - scoreStep * 5) / scoreStep) * scoreStep)),
    scoreEnd: optimizerNumber("optimizerScoreEnd", Math.max(0, Math.ceil((currentScore + scoreStep * 5) / scoreStep) * scoreStep)),
    scoreStep,
    ddStart: optimizerNumber("optimizerDdStart", Math.max(0, Math.round((currentDd - ddStep * 4) / ddStep) * ddStep)),
    ddEnd: optimizerNumber("optimizerDdEnd", Math.max(0, Math.round((currentDd + ddStep * 4) / ddStep) * ddStep)),
    ddStep,
    useDd: (document.getElementById("optimizerUseDd")?.value || "yes") === "yes",
    method: document.getElementById("optimizerMethod")?.value || "target",
  };
}

function rangeValues(start, end, step, maxCount = 18) {
  if (!isFiniteNumber(start) || !isFiniteNumber(end) || !isFiniteNumber(step) || step <= 0) return [];
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const values = [];
  for (let value = lo; value <= hi + step * 0.001 && values.length < maxCount; value += step) values.push(Number(value.toFixed(4)));
  return values;
}

function evaluateOptimizerScenario(rawRows, scoreThreshold, ddThreshold, useDd) {
  const ddMode = useDd ? (elements.ddMode.value === "ignore" ? "knownOnly" : elements.ddMode.value) : "ignore";
  const evaluated = rawRows.map((row) => evaluateRow(row, scoreThreshold, useDd ? ddThreshold : null, ddMode));
  const qualified = bestQualifiedRows(evaluated);
  const bubble = bubbleRows(evaluated, qualified);
  const missingDdCount = evaluated.filter((row) => !isFiniteNumber(row.dd_total_used)).length;
  const dataVerificationCount = evaluated.filter(needsDataVerification).length;
  return {
    qualified,
    bubble,
    qualifiedCount: qualified.length,
    bubbleCount: bubble.length,
    averageScore: mean(qualified.map((row) => row.analysis_score).filter(isFiniteNumber)),
    medianScore: median(qualified.map((row) => row.analysis_score).filter(isFiniteNumber)),
    averageDd: mean(qualified.map((row) => row.dd_total_used).filter(isFiniteNumber)),
    ncaaAdjustedCount: qualified.filter(usesNcaaWomenFiveCategoryScore).length,
    missingDdCount,
    dataVerificationCount,
  };
}

function buildOptimizerGrid(rawRows, currentQualified, settings) {
  const scoreValues = rangeValues(settings.scoreStart, settings.scoreEnd, settings.scoreStep, 18);
  const ddValues = settings.useDd ? rangeValues(settings.ddStart, settings.ddEnd, settings.ddStep, 16) : [null];
  const currentKeys = new Set(currentQualified.map(athleteKey));
  const cells = [];
  scoreValues.forEach((scoreThreshold) => {
    ddValues.forEach((ddThreshold) => {
      const result = evaluateOptimizerScenario(rawRows, scoreThreshold, ddThreshold, settings.useDd);
      const nextKeys = new Set(result.qualified.map(athleteKey));
      const added = [...nextKeys].filter((key) => !currentKeys.has(key)).length;
      const removed = [...currentKeys].filter((key) => !nextKeys.has(key)).length;
      const dataRisk = result.missingDdCount + result.dataVerificationCount;
      const cell = { scoreThreshold, ddThreshold, useDd: settings.useDd, ...result, added, removed, dataRisk };
      cell.fitScore = optimizerFitScore(cell, settings);
      cells.push(cell);
    });
  });
  return { cells };
}

function optimizerFitScore(cell, settings) {
  if (settings.method === "score") return safeNumber(cell.averageScore, 0);
  if (settings.method === "dd") return safeNumber(cell.averageDd, 0);
  if (settings.method === "risk") return -cell.dataRisk;
  if (settings.method === "balanced") return safeNumber(cell.averageScore, 0) + safeNumber(cell.averageDd, 0) * 10 - cell.dataRisk * 0.05;
  const min = Math.min(settings.targetMin, settings.targetMax);
  const max = Math.max(settings.targetMin, settings.targetMax);
  if (cell.qualifiedCount >= min && cell.qualifiedCount <= max) return 1000 - Math.abs(cell.qualifiedCount - (min + max) / 2);
  const gap = cell.qualifiedCount < min ? min - cell.qualifiedCount : cell.qualifiedCount - max;
  return -gap;
}

function renderCriteriaOptimizer(rawRows, evaluated, qualified, bubble) {
  const map = document.getElementById("criteriaOptimizerMap");
  const preview = document.getElementById("optimizerPreview");
  if (!map) return;
  if (!rawRows.length) {
    state.optimizerGrid = [];
    map.classList.add("optimizer-placeholder");
    map.innerHTML = `<div class="empty-state">No filtered rows available for optimizer.</div>`;
    setTextIfPresent("optimizerSummary", "");
    if (preview) preview.innerHTML = "";
    return;
  }
  if (!state.optimizerReady) {
    state.optimizerGrid = [];
    state.optimizerPreview = null;
    map.classList.add("optimizer-placeholder");
    map.style.gridTemplateColumns = "1fr";
    map.innerHTML = `<div class="optimizer-standby"><strong>Optimizer ready when needed.</strong><p>Use the normal scenario controls without waiting on the full threshold grid. Click <b>Run optimizer</b> when you want to compare score/DD combinations.</p></div>`;
    setTextIfPresent("optimizerSummary", "");
    if (preview) preview.innerHTML = `<div class="empty-state compact">Run the optimizer to preview athlete movement.</div>`;
    document.getElementById("optimizerApplyPreview")?.setAttribute("disabled", "disabled");
    return;
  }
  map.classList.remove("optimizer-placeholder");
  const settings = optimizerSettings(rawRows);
  const grid = buildOptimizerGrid(rawRows, qualified, settings);
  state.optimizerGrid = grid.cells;
  if (state.optimizerPreview) state.optimizerPreview = grid.cells.find((cell) => sameOptimizerCell(cell, state.optimizerPreview)) || null;
  const ranked = [...grid.cells].sort((a, b) => b.fitScore - a.fitScore).slice(0, 3);
  renderOptimizerSummary(settings, ranked);
  renderOptimizerMap(grid, settings);
  renderOptimizerPreview();
}

function renderOptimizerSummary(settings, ranked) {
  const target = document.getElementById("optimizerSummary");
  if (!target) return;
  target.innerHTML = `<div class="optimizer-recommendations"><strong>Recommended criteria options</strong>${ranked.map((cell, index) => `<button type="button" class="optimizer-recommendation" data-score="${escapeAttr(cell.scoreThreshold)}" data-dd="${escapeAttr(cell.ddThreshold ?? "")}"><span>#${index + 1}</span><b>${formatScore(cell.scoreThreshold)} score${cell.useDd ? ` / ${formatScore(cell.ddThreshold)} DD` : ""}</b><em>${formatInt(cell.qualifiedCount)} criteria met • ${formatInt(cell.bubbleCount)} bubble</em></button>`).join("")}</div>`;
  target.querySelectorAll(".optimizer-recommendation").forEach((button) => button.addEventListener("click", () => {
    const score = number(button.dataset.score);
    const dd = number(button.dataset.dd);
    const cell = state.optimizerGrid.find((candidate) => candidate.scoreThreshold === score && ((candidate.ddThreshold ?? null) === (dd ?? null)));
    if (cell) { state.optimizerPreview = cell; renderOptimizerMap({ cells: state.optimizerGrid }, settings); renderOptimizerPreview(); }
  }));
}

function renderOptimizerMap(grid, settings) {
  const map = document.getElementById("criteriaOptimizerMap");
  if (!map) return;
  const ddValues = settings.useDd ? unique(grid.cells.map((cell) => cell.ddThreshold)).sort((a, b) => b - a) : [null];
  const scoreValues = unique(grid.cells.map((cell) => cell.scoreThreshold)).sort((a, b) => a - b);
  const fitValues = grid.cells.map((cell) => cell.fitScore).filter(isFiniteNumber);
  const minFit = Math.min(...fitValues);
  const maxFit = Math.max(...fitValues);
  const byKey = new Map(grid.cells.map((cell) => [`${cell.scoreThreshold}::${cell.ddThreshold ?? ""}`, cell]));
  map.style.gridTemplateColumns = `minmax(92px, 140px) repeat(${Math.max(1, scoreValues.length)}, minmax(56px, 1fr))`;
  map.innerHTML = `<div class="optimizer-corner">Criteria met</div>${scoreValues.map((score) => `<div class="optimizer-col-label">${escapeHtml(formatScore(score))}</div>`).join("")}${ddValues.map((dd) => `<div class="optimizer-row-label">${settings.useDd ? `DD ${formatScore(dd)}` : "No DD axis"}</div>${scoreValues.map((score) => {
    const cell = byKey.get(`${score}::${dd ?? ""}`);
    if (!cell) return `<div class="optimizer-cell empty"></div>`;
    const heat = maxFit === minFit ? 0.75 : (cell.fitScore - minFit) / (maxFit - minFit);
    const selected = state.optimizerPreview && sameOptimizerCell(cell, state.optimizerPreview);
    const title = `Score ${formatScore(score)}${settings.useDd ? ` / DD ${formatScore(dd)}` : ""}: ${cell.qualifiedCount} criteria met, ${cell.bubbleCount} bubble, added ${cell.added}, removed ${cell.removed}`;
    return `<button type="button" class="optimizer-cell ${selected ? "selected" : ""}" style="--optimizer-heat:${Math.max(0.06, Math.min(1, heat)).toFixed(3)}" data-score="${escapeAttr(score)}" data-dd="${escapeAttr(dd ?? "")}" title="${escapeAttr(title)}"><strong>${formatInt(cell.qualifiedCount)}</strong><span>${formatInt(cell.bubbleCount)} bub</span></button>`;
  }).join("")}`).join("")}<div class="optimizer-legend"><span>Lower fit</span><i></i><strong>Better fit</strong><em>Click a cell to preview. No athlete is manually added or selected.</em></div>`;
}

function sameOptimizerCell(a, b) {
  return a && b && a.scoreThreshold === b.scoreThreshold && ((a.ddThreshold ?? null) === (b.ddThreshold ?? null)) && Boolean(a.useDd) === Boolean(b.useDd);
}

function handleOptimizerMapClick(event) { const button = event.target.closest(".optimizer-cell[data-score]"); if (button) previewOptimizerCell(button); }
function handleOptimizerMapKeydown(event) { if (event.key !== "Enter" && event.key !== " ") return; const button = event.target.closest(".optimizer-cell[data-score]"); if (!button) return; event.preventDefault(); previewOptimizerCell(button); }
function previewOptimizerCell(button) { const score = number(button.dataset.score); const dd = number(button.dataset.dd); const cell = state.optimizerGrid.find((candidate) => candidate.scoreThreshold === score && ((candidate.ddThreshold ?? null) === (dd ?? null))); if (!cell) return; state.optimizerPreview = cell; renderOptimizerMap({ cells: state.optimizerGrid }, optimizerSettings(filteredRows())); renderOptimizerPreview(); }

function renderOptimizerPreview() {
  const target = document.getElementById("optimizerPreview");
  const apply = document.getElementById("optimizerApplyPreview");
  if (!target) return;
  const preview = state.optimizerPreview;
  if (apply) apply.disabled = !preview;
  if (!preview) { target.innerHTML = `<div class="empty-state compact">Select an optimizer cell to preview athlete movement.</div>`; return; }
  const current = currentScenarioBundle();
  const currentKeys = new Set(current.qualified.map(athleteKey));
  const previewKeys = new Set(preview.qualified.map(athleteKey));
  const added = preview.qualified.filter((row) => !currentKeys.has(athleteKey(row))).slice(0, 12);
  const removed = current.qualified.filter((row) => !previewKeys.has(athleteKey(row))).slice(0, 12);
  target.innerHTML = `<div class="optimizer-preview-card"><h3>Previewed criteria scenario</h3><div class="optimizer-preview-grid"><span>Score threshold <strong>${formatScore(preview.scoreThreshold)}</strong></span><span>DD threshold <strong>${preview.useDd ? formatScore(preview.ddThreshold) : "Not used"}</strong></span><span>Criteria met <strong>${formatInt(preview.qualifiedCount)}</strong></span><span>Bubble <strong>${formatInt(preview.bubbleCount)}</strong></span><span>Average score <strong>${displayScoreValue(preview.averageScore)}</strong></span><span>Average DD <strong>${displayScoreValue(preview.averageDd)}</strong></span><span>Added by criteria change <strong>${formatInt(preview.added)}</strong></span><span>Removed by criteria change <strong>${formatInt(preview.removed)}</strong></span></div><div class="optimizer-movement"><div><strong>Added</strong>${optimizerAthleteList(added)}</div><div><strong>Removed</strong>${optimizerAthleteList(removed)}</div></div></div>`;
}

function optimizerAthleteList(rows) { return rows.length ? `<ul>${rows.map((row) => `<li>${escapeHtml(row.diver_name)} — ${escapeHtml(eventDescription(row))} (${displayScoreValue(row.analysis_score)})</li>`).join("")}</ul>` : `<p class="muted">None</p>`; }
function applyOptimizerPreview() { const preview = state.optimizerPreview; if (!preview) return; elements.scoreThreshold.value = formatScore(preview.scoreThreshold); state.thresholdEdited = true; if (preview.useDd && isFiniteNumber(preview.ddThreshold)) { elements.ddThreshold.value = formatScore(preview.ddThreshold); if (elements.ddMode.value === "ignore") elements.ddMode.value = "knownOnly"; state.ddThresholdEdited = true; } setOptimizerStatus("Previewed criteria settings applied. Results remain criteria-derived."); render(); }
function setOptimizerStatus(message) { const target = document.getElementById("optimizerStatus"); if (target) target.textContent = message; }
function exportOptimizerGridCsv() { const columns = optimizerGridColumns(); downloadTextFile(`${scenarioFileStem("optimizer-grid")}.csv`, toCsv(state.optimizerGrid || [], columns), "text/csv;charset=utf-8"); setOptimizerStatus("Optimizer grid CSV exported."); }
function optimizerGridColumns() { return [{ header: "score_threshold", value: (row) => row.scoreThreshold }, { header: "dd_threshold", value: (row) => row.ddThreshold }, { header: "qualified_count", value: (row) => row.qualifiedCount }, { header: "bubble_count", value: (row) => row.bubbleCount }, { header: "average_score", value: (row) => row.averageScore }, { header: "median_score", value: (row) => row.medianScore }, { header: "average_dd", value: (row) => row.averageDd }, { header: "ncaa_adjusted_count", value: (row) => row.ncaaAdjustedCount }, { header: "missing_dd_count", value: (row) => row.missingDdCount }, { header: "added_vs_current", value: (row) => row.added }, { header: "removed_vs_current", value: (row) => row.removed }, { header: "data_risk", value: (row) => row.dataRisk }]; }
function exportOptimizerMemoHtml() { const settings = optimizerSettings(filteredRows()); const ranked = [...(state.optimizerGrid || [])].sort((a, b) => b.fitScore - a.fitScore).slice(0, 3); downloadTextFile(`${scenarioFileStem("optimizer-recommendation")}.html`, optimizerMemoHtml(settings, ranked, state.optimizerPreview || ranked[0]), "text/html;charset=utf-8"); setOptimizerStatus("Optimizer recommendation memo exported."); }
function optimizerMemoHtml(settings, ranked, selected) { const scenario = currentScenarioState(); return htmlDocument("USA Diving Criteria Optimizer Recommendation", `<h1>USA Diving Criteria Optimizer Recommendation</h1><p class="meta">Generated ${escapeHtml(new Date().toLocaleString())}</p><h2>Current scenario</h2>${htmlTable(["Setting","Value"], [["Scenario", scenario.scenarioName], ["Criteria model", selectedOptionText(elements.criteriaPreset)], ["Event", selectedOptionText(elements.genderFilter) + " " + selectedOptionText(elements.disciplineFilter)], ["Current score threshold", elements.scoreThreshold.value], ["Current DD threshold", elements.ddThreshold.value], ["Exact meets", selectedMeetLabels().join("; ")]])}<h2>Recommended options</h2>${htmlTable(["Rank","Score threshold","DD threshold","Criteria met","Bubble","Avg score","Avg DD","Added","Removed","Missing DD"], ranked.map((cell, index) => [index + 1, formatScore(cell.scoreThreshold), cell.useDd ? formatScore(cell.ddThreshold) : "Not used", cell.qualifiedCount, cell.bubbleCount, displayScoreValue(cell.averageScore), displayScoreValue(cell.averageDd), cell.added, cell.removed, cell.missingDdCount]))}<p><strong>Governance note:</strong> The optimizer changes criteria settings only. It does not manually add, select, or override athletes.</p>${selected ? `<h2>Previewed / top recommendation</h2><p>Score ${formatScore(selected.scoreThreshold)}${selected.useDd ? ` and DD ${formatScore(selected.ddThreshold)}` : ""} produces ${formatInt(selected.qualifiedCount)} criteria-met athletes and ${formatInt(selected.bubbleCount)} bubble athletes.</p>` : ""}`); }

function renderCertificationCenterFromCurrent() {
  const bundle = currentScenarioBundle();
  renderCertificationCenter(bundle.evaluated, bundle.qualified, bundle.bubble);
}

function buildCertificationBundle(evaluated, qualified, bubble) { const qualifiedKeys = new Set(qualified.map(athleteKey)); const bubbleKeys = new Set(bubble.map(athleteKey)); const best = bestRowsByAthlete(evaluated); const needsVerification = best.filter((row) => !qualifiedKeys.has(athleteKey(row)) && !bubbleKeys.has(athleteKey(row)) && needsDataVerification(row)); const verificationKeys = new Set(needsVerification.map(athleteKey)); const didNotMeet = best.filter((row) => !qualifiedKeys.has(athleteKey(row)) && !bubbleKeys.has(athleteKey(row)) && !verificationKeys.has(athleteKey(row))).sort((a,b)=>compareRows(b,a)); return { criteriaMet: qualified, bubble, needsVerification, didNotMeet, evaluatedCount: evaluated.length }; }
function bestRowsByAthlete(rows) { const byAthlete = new Map(); rows.forEach((row) => { const key = athleteKey(row); const current = byAthlete.get(key); if (!current || compareRows(row, current) > 0) byAthlete.set(key, row); }); return [...byAthlete.values()]; }
function needsDataVerification(row) { if (!row) return false; if (!row.diver_name || !row.meet_name || !row.event_name || !row.gender || !row.discipline || !row.round_stage) return true; if (!isFiniteNumber(row.analysis_score)) return true; if (elements.ddMode.value === "requireKnown" && !isFiniteNumber(row.dd_total_used)) return true; if (isNcaaWomenSpringboardRow(row)) { const status = String(row.ncaa_women_springboard_adjustment_status || ""); if (!["not_applicable", "adjusted"].includes(status)) return true; } return false; }
function certificationSections(bundle) {
  return [
    { key: "criteriaMet", title: "Criteria Met", rows: bundle.criteriaMet, note: "Generated only from active criteria logic." },
    { key: "bubble", title: "Bubble / Near Miss", rows: bundle.bubble, note: "Closest athletes outside the active score threshold." },
    { key: "needsVerification", title: "Needs Data Verification", rows: bundle.needsVerification, note: "Rows with missing or reviewable data; not a manual selection." },
    { key: "didNotMeet", title: "Did Not Meet Criteria", rows: bundle.didNotMeet, note: "Highest remaining athlete rows that do not meet active criteria." },
  ];
}
function renderCertificationCenter(evaluated, qualified, bubble) {
  const target = document.getElementById("criteriaCertificationCenter");
  if (!target) return;
  const bundle = buildCertificationBundle(evaluated, qualified, bubble);
  state.certificationBundle = bundle;
  renderCertificationSummary(bundle);
  const toggle = document.getElementById("toggleCertificationDetails");
  if (toggle) toggle.textContent = state.certificationDetailsOpen ? "Hide certification details" : "Show certification details";
  if (!state.certificationDetailsOpen) {
    target.classList.add("compact-certification");
    target.innerHTML = `<div class="cert-compact-note"><strong>Certification Center is collapsed for speed.</strong><span>Counts and exports remain available. Open details only when you want to review athlete cards or add audit notes.</span></div>`;
    return;
  }
  target.classList.remove("compact-certification");
  const sections = certificationSections(bundle);
  if (!sections.some((section) => section.key === state.certificationActiveSection)) state.certificationActiveSection = "criteriaMet";
  const active = sections.find((section) => section.key === state.certificationActiveSection) || sections[0];
  const displayRows = active.key === "didNotMeet" ? active.rows.slice(0, 75) : active.rows;
  const truncated = active.rows.length > displayRows.length;
  target.innerHTML = `<div class="cert-section-tabs">${sections.map((section) => `<button type="button" class="cert-section-tab ${section.key === active.key ? "active" : ""}" data-cert-section="${escapeAttr(section.key)}"><strong>${escapeHtml(section.title)}</strong><span>${formatInt(section.rows.length)}</span></button>`).join("")}</div><section class="cert-section ${escapeAttr(active.key)}"><header><h3>${escapeHtml(active.title)}</h3><span>${formatInt(active.rows.length)} athlete${active.rows.length === 1 ? "" : "s"}</span></header><p>${escapeHtml(active.note)}${truncated ? ` Showing first ${displayRows.length} rows for page speed; exports still include all rows.` : ""}</p><div class="cert-card-grid">${displayRows.length ? displayRows.map((row) => renderCertificationCard(row, active.key)).join("") : `<div class="empty-state compact">No athletes in this category.</div>`}</div></section>`;
}
function renderCertificationSummary(bundle) {
  const target = document.getElementById("certificationSummary");
  if (!target) return;
  const scenario = currentScenarioState();
  const cards = [["Scenario", scenario.scenarioName], ["Criteria met", bundle.criteriaMet.length], ["Bubble", bundle.bubble.length], ["Needs verification", bundle.needsVerification.length], ["Did not meet", bundle.didNotMeet.length], ["Score threshold", elements.scoreThreshold.value || "Default"], ["DD threshold", elements.ddThreshold.value || "Default/none"], ["Exact meets", selectedMeetLabels().length]];
  target.innerHTML = cards.map(([label, value]) => `<article class="cert-summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");
}
function renderCertificationCard(row, category) { const key = certificationRowKey(row); const note = state.certificationNotes[key] || ""; const explanationKey = registerExplanationRow(row, `cert-${category}`); const dataNote = needsDataVerification(row); return `<article class="cert-card ${escapeAttr(category)}"><div class="cert-card-head"><strong>${escapeHtml(row.diver_name || "Unnamed athlete")}</strong><span>${escapeHtml(certCategoryLabel(category))}</span></div><p>${escapeHtml(eventDescription(row))} • ${escapeHtml(meetLabel(row))}</p><dl><div><dt>Score</dt><dd>${displayScoreValue(row.analysis_score)}</dd></div><div><dt>Basis</dt><dd>${escapeHtml(row.score_basis || "")}</dd></div><div><dt>Gap</dt><dd>${formatSignedScore(isFiniteNumber(row.analysis_score) && isFiniteNumber(row.threshold_used) ? row.analysis_score - row.threshold_used : null)}</dd></div><div><dt>DD</dt><dd>${displayScoreValue(row.dd_total_used)}</dd></div></dl><div class="cert-badges"><span class="cert-badge">${escapeHtml(row.reason || "Criteria checked")}</span>${usesNcaaWomenFiveCategoryScore(row) ? `<span class="cert-badge ncaa">NCAA 5-category</span>` : ""}${dataNote ? `<span class="cert-badge note">Data note</span>` : ""}</div><div class="cert-actions-row"><button type="button" class="secondary-button" data-cert-audit="${escapeAttr(explanationKey)}">Open audit</button><button type="button" class="secondary-button" data-cert-copy="${escapeAttr(key)}">Copy summary</button></div><label class="cert-note-label">Review note only — does not affect criteria result.<textarea data-cert-note-key="${escapeAttr(key)}" rows="2" placeholder="Optional audit/data note">${escapeHtml(note)}</textarea></label></article>`; }
function certCategoryLabel(category) { return category === "criteriaMet" ? "Criteria met" : category === "bubble" ? "Bubble" : category === "needsVerification" ? "Needs verification" : "Did not meet"; }
function certificationRowKey(row) { return [currentScenarioState().scenarioName, row.meet_id, row.event_id, row.result_set_id, row.diver_id || athleteKey(row), row.round_stage, row.place].map(keyPart).join("::"); }
function loadCertificationNotes() { try { return JSON.parse(localStorage.getItem(CERTIFICATION_NOTES_STORAGE_KEY) || "{}") || {}; } catch (error) { return {}; } }
function persistCertificationNotes() { localStorage.setItem(CERTIFICATION_NOTES_STORAGE_KEY, JSON.stringify(state.certificationNotes || {})); }
function handleCertificationNoteInput(event) { const target = event.target.closest("textarea[data-cert-note-key]"); if (!target) return; state.certificationNotes[target.dataset.certNoteKey] = target.value; persistCertificationNotes(); setCertificationStatus("Review note saved. Criteria result was not changed."); }
function handleCertificationClick(event) { const sectionButton = event.target.closest("[data-cert-section]"); if (sectionButton) { state.certificationActiveSection = sectionButton.dataset.certSection || "criteriaMet"; renderCertificationCenterFromCurrent(); return; } const auditButton = event.target.closest("[data-cert-audit]"); if (auditButton) { openRuleExplanation(auditButton.dataset.certAudit); return; } const copyButton = event.target.closest("[data-cert-copy]"); if (copyButton) { const row = certificationRowsFlat().find((candidate) => certificationRowKey(candidate) === copyButton.dataset.certCopy); if (row) copyText(certificationRowText(row)).then(() => setCertificationStatus("Athlete certification summary copied.")); } }
function certificationRowsFlat() { const bundle = state.certificationBundle || { criteriaMet: [], bubble: [], needsVerification: [], didNotMeet: [] }; return [...bundle.criteriaMet, ...bundle.bubble, ...bundle.needsVerification, ...bundle.didNotMeet]; }
function setCertificationStatus(message) { const target = document.getElementById("certificationStatus"); if (target) target.textContent = message; }
function certificationCategoryForRow(row) { const bundle = state.certificationBundle; if (!bundle) return ""; const key = athleteKey(row); if (bundle.criteriaMet.some((item) => athleteKey(item) === key)) return "Criteria Met"; if (bundle.bubble.some((item) => athleteKey(item) === key)) return "Bubble / Near Miss"; if (bundle.needsVerification.some((item) => athleteKey(item) === key)) return "Needs Data Verification"; return "Did Not Meet Criteria"; }
function certificationRowText(row) { return [`Athlete\t${row.diver_name}`, `Category\t${certificationCategoryForRow(row)}`, `Meet\t${meetLabel(row)}`, `Event\t${eventDescription(row)}`, `Score used\t${displayScoreValue(row.analysis_score)}`, `Score basis\t${row.score_basis}`, `Score threshold\t${displayScoreValue(row.threshold_used)}`, `DD total\t${displayScoreValue(row.dd_total_used)}`, `DD threshold\t${displayScoreValue(row.dd_minimum_used)}`, `Reason\t${row.reason}`, `Review note\t${state.certificationNotes[certificationRowKey(row)] || ""}`].join("\n"); }
function exportCertificationCsv() { const rows = certificationRowsFlat().map((row) => ({ row, category: certificationCategoryForRow(row), note: state.certificationNotes[certificationRowKey(row)] || "" })); const columns = [{ header: "certification_category", value: (item) => item.category }, { header: "athlete_name", value: (item) => item.row.diver_name }, { header: "team", value: (item) => item.row.team_name }, { header: "nationality", value: (item) => item.row.nat }, { header: "meet_name", value: (item) => item.row.meet_name }, { header: "event_name", value: (item) => item.row.event_name }, { header: "round_stage", value: (item) => item.row.round_stage }, { header: "place", value: (item) => item.row.place }, { header: "score_used", value: (item) => item.row.analysis_score }, { header: "score_basis", value: (item) => item.row.score_basis }, { header: "score_threshold", value: (item) => item.row.threshold_used }, { header: "score_gap", value: (item) => isFiniteNumber(item.row.analysis_score) && isFiniteNumber(item.row.threshold_used) ? item.row.analysis_score - item.row.threshold_used : "" }, { header: "dd_total", value: (item) => item.row.dd_total_used }, { header: "dd_threshold", value: (item) => item.row.dd_minimum_used }, { header: "dd_gap", value: (item) => isFiniteNumber(item.row.dd_total_used) && isFiniteNumber(item.row.dd_minimum_used) ? item.row.dd_total_used - item.row.dd_minimum_used : "" }, { header: "qualification_reason", value: (item) => item.row.reason }, { header: "ncaa_adjustment_status", value: (item) => item.row.ncaa_women_springboard_adjustment_status }, { header: "data_quality_notes", value: (item) => needsDataVerification(item.row) ? "Review data fields" : "" }, { header: "review_note", value: (item) => item.note }]; downloadTextFile(`${scenarioFileStem("certification")}.csv`, toCsv(rows, columns), "text/csv;charset=utf-8"); setCertificationStatus("Certification CSV exported."); }
function exportCertificationMemoHtml() { const bundle = state.certificationBundle || buildCertificationBundle(currentScenarioBundle().evaluated, currentScenarioBundle().qualified, currentScenarioBundle().bubble); downloadTextFile(`${scenarioFileStem("certification-memo")}.html`, certificationMemoHtml(bundle), "text/html;charset=utf-8"); setCertificationStatus("Certification memo HTML exported."); }
function copyCertificationSummary() { const bundle = state.certificationBundle; if (!bundle) return; copyText(certificationSummaryText(bundle)).then(() => setCertificationStatus("Certification summary copied.")); }
function certificationSummaryText(bundle) { return ["Criteria Certification Summary", `Scenario\t${currentScenarioState().scenarioName}`, `Criteria model\t${selectedOptionText(elements.criteriaPreset)}`, `Score threshold\t${elements.scoreThreshold.value || "Default"}`, `DD threshold\t${elements.ddThreshold.value || "Default/none"}`, `Exact meets\t${selectedMeetLabels().join(" | ")}`, `Criteria met\t${bundle.criteriaMet.length}`, `Bubble / near miss\t${bundle.bubble.length}`, `Needs data verification\t${bundle.needsVerification.length}`, `Did not meet criteria\t${bundle.didNotMeet.length}`, "Results are criteria-derived. Review notes do not affect qualification status."].join("\n"); }
function certificationMemoHtml(bundle) { const scenario = currentScenarioState(); const allRows = [...bundle.criteriaMet, ...bundle.bubble, ...bundle.needsVerification]; const hasNcaa = allRows.some(isNcaaWomenSpringboardRow); const rowsForTable = (rows) => rows.slice(0, 300).map((row) => [row.diver_name, teamLabel(row), meetLabel(row), eventDescription(row), row.round_stage, displayScoreValue(row.analysis_score), row.score_basis, displayScoreValue(row.dd_total_used), row.reason, state.certificationNotes[certificationRowKey(row)] || ""]); return htmlDocument("USA Diving Criteria Certification Memo", `<h1>USA Diving Criteria Certification Memo</h1><p class="meta">Generated ${escapeHtml(new Date().toLocaleString())}</p><p><strong>Governance note:</strong> Results are criteria-derived and not manually assigned. Review notes are for audit/data verification only and do not change qualification status.</p><h2>Scenario settings</h2>${htmlTable(["Setting","Value"], [["Scenario", scenario.scenarioName], ["Criteria model", selectedOptionText(elements.criteriaPreset)], ["Gender", selectedOptionText(elements.genderFilter)], ["Event", selectedOptionText(elements.disciplineFilter)], ["Round", selectedOptionText(elements.roundFilter)], ["Score basis", selectedOptionText(elements.scoreMode)], ["Score threshold", elements.scoreThreshold.value || "Default"], ["DD threshold", elements.ddThreshold.value || "Default/none"], ["Exact meets", selectedMeetLabels().join("; ")]])}${hasNcaa ? `<h2>NCAA women springboard scoring note</h2><p>NCAA women's springboard rows preserve the raw 6-dive score and, where supported by the dive sheet, display a derived 5-category comparison score. Score bases remain labeled separately.</p>` : ""}<h2>Certification counts</h2>${htmlTable(["Category","Count"], [["Criteria Met", bundle.criteriaMet.length], ["Bubble / Near Miss", bundle.bubble.length], ["Needs Data Verification", bundle.needsVerification.length], ["Did Not Meet Criteria", bundle.didNotMeet.length]])}<h2>Criteria Met</h2>${htmlTable(certificationMemoHeaders(), rowsForTable(bundle.criteriaMet))}<h2>Bubble / Near Miss</h2>${htmlTable(certificationMemoHeaders(), rowsForTable(bundle.bubble))}<h2>Needs Data Verification</h2>${htmlTable(certificationMemoHeaders(), rowsForTable(bundle.needsVerification))}`); }
function certificationMemoHeaders() { return ["Athlete","Team/Nat","Meet","Event","Round","Score","Basis","DD","Reason","Review note"]; }
function htmlDocument(title, body) { return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#15234a}h1,h2{color:#171f69}.meta{color:#5f6062}table{border-collapse:collapse;width:100%;margin:12px 0 24px}th,td{border:1px solid #d8e0ee;padding:8px;text-align:left;font-size:12px;vertical-align:top}th{background:#eef4fb}@media print{body{margin:18px}}</style></head><body>${body}</body></html>`; }

function copyScenarioLink() {
  try {
    const encoded = encodeScenarioToHash(currentScenarioState());
    const url = `${window.location.origin}${window.location.pathname}#scenario=${encoded}`;
    copyText(url)
      .then(() => setSharingStatus("Scenario link copied."))
      .catch(() => setSharingStatus("Scenario link could not be copied.", "error"));
  } catch (error) {
    setSharingStatus("Scenario link could not be created.", "error");
  }
}

function clearScenarioHash() {
  if (window.history?.replaceState) {
    window.history.replaceState(null, "", `${window.location.origin}${window.location.pathname}`);
  } else {
    window.location.hash = "";
  }
  state.linkScenarioLoaded = false;
  renderModeVisibility();
  setSharingStatus("Link scenario cleared.");
}

function encodeScenarioToHash(scenario) {
  const json = JSON.stringify(scenario);
  return btoa(unescape(encodeURIComponent(json))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function decodeScenarioFromHash(hash) {
  const match = String(hash || "").match(/#scenario=([^&]+)/);
  if (!match) return null;
  const base64 = match[1].replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return JSON.parse(decodeURIComponent(escape(atob(padded))));
}

function applyScenarioFromHash() {
  let scenario;
  try {
    scenario = decodeScenarioFromHash(window.location.hash);
  } catch (error) {
    setSharingStatus("Scenario link is invalid. Defaults were loaded instead.", "error");
    return;
  }
  if (!scenario) return;
  applyControls(scenario);
  state.linkScenarioLoaded = true;
  setSharingStatus("Scenario settings loaded from link.");
}

function barChart(points, options) {
  const width = 760;
  const height = 240;
  const pad = { top: 18, right: 16, bottom: 46, left: 42 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const barGap = 8;
  const barWidth = Math.max(8, (innerWidth - barGap * (points.length - 1)) / points.length);

  const bars = points
    .map((point, index) => {
      const x = pad.left + index * (barWidth + barGap);
      const h = (point.value / maxValue) * innerHeight;
      const y = pad.top + innerHeight - h;
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="3" fill="${options.color}" />
        <text x="${x + barWidth / 2}" y="${Math.max(12, y - 5)}" text-anchor="middle" class="bar-label">${formatChartNumber(point.value)}</text>
        <text x="${x + barWidth / 2}" y="${height - 18}" text-anchor="middle" class="axis-label">${escapeHtml(point.label)}</text>
      `;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img">
      <line x1="${pad.left}" y1="${pad.top + innerHeight}" x2="${width - pad.right}" y2="${pad.top + innerHeight}" stroke="#c9d3e1" />
      <text x="${pad.left}" y="13" class="axis-label">${escapeHtml(options.valueLabel)}</text>
      ${bars}
    </svg>
  `;
}

function horizontalBarChart(points) {
  const width = 520;
  const rowHeight = 30;
  const height = Math.max(160, 28 + points.length * rowHeight);
  const labelWidth = 230;
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const bars = points
    .map((point, index) => {
      const y = 20 + index * rowHeight;
      const w = ((width - labelWidth - 48) * point.value) / maxValue;
      return `
        <text x="0" y="${y + 15}" class="bar-label">${escapeHtml(trim(point.label, 30))}</text>
        <rect x="${labelWidth}" y="${y}" width="${w}" height="18" rx="3" fill="${COLORS.red}" />
        <text x="${labelWidth + w + 8}" y="${y + 14}" class="bar-label">${point.value}</text>
      `;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img">${bars}</svg>`;
}

function thresholdForRow(row, simulatedThreshold) {
  if (isFiniteNumber(simulatedThreshold)) return simulatedThreshold;

  const preset = elements.criteriaPreset.value;
  const manualThreshold = number(elements.scoreThreshold.value);
  if (isFiniteNumber(manualThreshold) && (state.thresholdEdited || preset !== "winterEligibility")) {
    return manualThreshold;
  }
  if (preset === "winterEligibility") {
    return winterThresholdForRow(row) ?? manualThreshold;
  }
  return manualThreshold;
}

function athleteScopePass(row) {
  const scope = elements.athleteScope.value;
  const nat = normalizedNat(row);
  if (scope === "all") return true;
  if (scope === "knownUsa") return nat === "USA";
  if (scope === "knownInternational") return nat && nat !== "USA";
  if (scope === "usaDomestic") {
    return nat === "USA" || (!nat && (row.competition_family === "USA Diving" || row.competition_family === "NCAA"));
  }
  return true;
}

function normalizedNat(row) {
  const value = String(row.nat ?? "").trim().toUpperCase();
  if (!value || value === "NAN" || value === "NULL" || value === "NONE") return "";
  return value;
}

function formatNotes(rows) {
  const gender = elements.genderFilter.value;
  const discipline = elements.disciplineFilter.value;
  const dd = ddMinimum();
  const notes = [];
  if (isFiniteNumber(dd)) {
    const editedText = state.ddThresholdEdited ? "custom" : "preset";
    notes.push(`DD threshold for this run: ${formatScore(dd)} (${editedText}).`);
  }
  if (elements.criteriaPreset.value === "winterEligibility") {
    if (elements.scoreMode.value === "ncaaWomen5Category" && gender === "Female" && (discipline === "1m" || discipline === "3m")) {
      notes.push("Winter eligibility uses USA/World-style 5-dive springboard standards for NCAA rows only when the derived NCAA 5-category score is actually used; unadjusted NCAA rows keep the NCAA raw-score threshold.");
    } else {
      notes.push("Winter eligibility uses NCAA women's springboard score standards for NCAA rows and USA Diving standards for USA/World Aquatics rows.");
    }
  }
  if (rows.some((row) => row.competition_family === "NCAA") && gender === "Female" && (discipline === "1m" || discipline === "3m")) {
    notes.push("NCAA Division I women's springboard uses a 6-dive official score. The NCAA 5-category score mode preserves the raw 6-dive score and derives a labeled 5-dive category-complete score only when the dive sheet supports it.");
  }
  const ncaaSpringboardRows = rows.filter(isNcaaWomenSpringboardRow);
  const unadjustedNcaaRows = ncaaSpringboardRows.filter(
    (row) =>
      elements.scoreMode.value === "ncaaWomen5Category" &&
      row.ncaa_women_springboard_adjustment_status !== "adjusted"
  );
  if (unadjustedNcaaRows.length) {
    const statuses = unique(unadjustedNcaaRows.map((row) => adjustmentStatusText(row.ncaa_women_springboard_adjustment_status)));
    notes.push(
      `${formatInt(unadjustedNcaaRows.length)} NCAA women's springboard row(s) cannot be converted to a derived 5-category score: ${statuses.join(", ")}. Those rows show a warning status and fall back to the non-cumulative score basis.`
    );
  }
  if (rows.some((row) => row.competition_family === "NCAA") && gender === "Female" && discipline === "Platform") {
    notes.push("NCAA Division I women's platform is a 5-dive event, but category and qualification systems still belong in the NCAA source bucket.");
  }
  if (rows.some((row) => row.competition_group === "USA Diving Junior Nationals")) {
    notes.push("Junior Nationals includes age-group voluntary and optional structures; Group A/B optional scores should be treated differently from senior open lists.");
  }
  if (rows.some((row) => !isFiniteNumber(row.phase_score_from_dives) && row.competition_family !== "World Aquatics")) {
    notes.push("Divemeets rows without the larger dive-sheet pull can separate posted prelim/final totals, but true phase-only finals and strict DD enforcement need the dive-sheet run.");
  }
  if (elements.athleteScope.value === "usaDomestic") {
    notes.push("USA/domestic includes known-USA rows plus USA Diving and NCAA rows where nationality is not published by Divemeets.");
  }
  if (elements.athleteScope.value === "knownUsa") {
    notes.push("Known USA only uses explicit nationality fields, which are mostly available from World Aquatics rows.");
  }
  return notes.join(" ");
}

function selectedMeetIds() {
  return new Set(
    [...document.querySelectorAll("#meetFilters input:checked")].map((input) => input.value)
  );
}

function selectedMeetRows() {
  const ids = selectedMeetIds();
  return DATA.results.filter((row) => ids.has(String(row.meet_id)));
}

function setMeetIds(wanted) {
  const wantedSet = new Set((wanted || []).map(String));
  document.querySelectorAll("#meetFilters input").forEach((input) => {
    input.checked = wantedSet.has(input.value);
  });
}

function allMeetIds() {
  return [...document.querySelectorAll("#meetFilters input")].map((input) => input.value);
}

function allSourceKeys() {
  return unique(DATA.results.map((row) => sourceKey(row)).filter(Boolean)).sort();
}

function meetIdsForSources(sources) {
  const wanted = new Set((sources || []).map(String));
  if (!wanted.size) return allMeetIds();
  return unique(DATA.results
    .filter((row) => wanted.has(sourceKey(row)))
    .map((row) => String(row.meet_id))
    .filter(Boolean));
}

function meetIdsFromLegacySources(sources) {
  if (!Array.isArray(sources) || !sources.length) return null;
  return meetIdsForSources(sources);
}

function selectedSources() {
  return new Set(allSourceKeys());
}

function setSources() {
  // Source checkboxes were removed from the UI. Preset source defaults are now
  // translated to exact meet selections through meetIdsForSources().
}

function scenarioById(id) {
  return state.scenarios.find((scenario) => scenario.id === id) || null;
}

function uniqueScenarioName(baseName) {
  const existing = new Set(state.scenarios.map((scenario) => scenario.name));
  if (!existing.has(baseName)) return baseName;
  let index = 2;
  while (existing.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

function createScenarioId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function setSelectValue(select, value) {
  const nextValue = selectValueOrFallback(select, value, select.value);
  select.value = nextValue;
}

function selectValueOrFallback(select, value, fallback) {
  const candidate = value === null || value === undefined ? "" : String(value);
  const values = [...select.options].map((option) => option.value);
  return values.includes(candidate) ? candidate : fallback;
}

function normalizeFilterValues(values, allowedValues) {
  const allowed = new Set(allowedValues.map(String));
  const normalized = Array.isArray(values) ? values.map(String).filter((value) => allowed.has(value)) : [];
  return normalized.length ? [...new Set(normalized)].sort() : [...allowed].sort();
}

function inferThresholdEdited(rawControls) {
  if (!rawControls || rawControls.scoreThreshold === undefined || rawControls.scoreThreshold === "") return false;
  const threshold = number(rawControls.scoreThreshold);
  const defaultThreshold = winterThresholdForSelection(
    rawControls.genderFilter || elements.genderFilter.value,
    rawControls.disciplineFilter || elements.disciplineFilter.value,
    "usa"
  );
  return isFiniteNumber(threshold) && isFiniteNumber(defaultThreshold)
    ? Math.abs(threshold - defaultThreshold) > 0.001
    : Boolean(rawControls.scoreThreshold);
}

function inferDdThresholdEdited(rawControls) {
  if (!rawControls || rawControls.ddThreshold === undefined || rawControls.ddThreshold === "") return false;
  const threshold = number(rawControls.ddThreshold);
  const defaultThreshold = defaultDdMinimumForSelection(
    rawControls.genderFilter || elements.genderFilter.value,
    rawControls.disciplineFilter || elements.disciplineFilter.value,
    rawControls.criteriaPreset || elements.criteriaPreset.value
  );
  return isFiniteNumber(threshold) && isFiniteNumber(defaultThreshold)
    ? Math.abs(threshold - defaultThreshold) > 0.001
    : Boolean(rawControls.ddThreshold);
}

function stableControls(controls) {
  return JSON.stringify({
    ...controls,
    selectedMeetIds: [...(controls.selectedMeetIds || [])].sort(),
    thresholdEdited: Boolean(controls.thresholdEdited),
    ddThresholdEdited: Boolean(controls.ddThresholdEdited),
  });
}

function safeFileName(value) {
  const cleaned = String(value || "scenario")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "scenario";
}

function winterThresholdForRow(row) {
  if (usesNcaaWomenFiveCategoryScore(row)) {
    return winterThresholdForSelection(row.gender, row.discipline, "usa");
  }
  const family = row.competition_family === "NCAA" ? "ncaa" : "usa";
  return winterThresholdForSelection(row.gender, row.discipline, family);
}

function winterThresholdForSelection(gender, discipline, family) {
  return WINTER_SCORE_STANDARDS[gender]?.[family]?.[discipline] ?? null;
}

function ddMinimum() {
  const manualThreshold = number(elements.ddThreshold.value);
  if (isFiniteNumber(manualThreshold)) return manualThreshold;
  return defaultDdMinimumForSelection(
    elements.genderFilter.value,
    elements.disciplineFilter.value,
    elements.criteriaPreset.value
  );
}

function defaultDdMinimumForSelection(gender, discipline, preset) {
  if (preset === "nationalQualifier") {
    return NATIONAL_DD_MINIMUMS[gender]?.[discipline] ?? null;
  }
  return WINTER_DD_MINIMUMS[gender]?.[discipline] ?? null;
}

function scoreValue(row) {
  if (usesNcaaWomenFiveCategoryScore(row)) {
    return row.ncaa_women_springboard_5cat_score;
  }
  return baseScoreValue(row);
}

function baseScoreValue(row) {
  if (elements.scoreMode.value === "phaseOrStandalone") {
    if (isFiniteNumber(row.phase_score_from_dives)) return row.phase_score_from_dives;
    return postedLikelyStandalone(row) ? row.posted_score : null;
  }
  if (elements.scoreMode.value === "ncaaWomen5Category") {
    if (isFiniteNumber(row.phase_score_from_dives)) return row.phase_score_from_dives;
    return postedLikelyStandalone(row) ? row.posted_score : null;
  }
  if (elements.scoreMode.value === "phasePreferred" && isFiniteNumber(row.phase_score_from_dives)) {
    return row.phase_score_from_dives;
  }
  return row.posted_score;
}

function scoreBasisLabel(row) {
  if (usesNcaaWomenFiveCategoryScore(row)) return "Derived NCAA 5-category";
  const fallback = baseScoreBasisLabel(row);
  if (elements.scoreMode.value === "ncaaWomen5Category" && isNcaaWomenSpringboardRow(row)) {
    const status = adjustmentStatusText(row.ncaa_women_springboard_adjustment_status);
    return `NCAA 5-cat unavailable; ${fallback} (${status})`;
  }
  return fallback;
}

function baseScoreBasisLabel(row) {
  if (elements.scoreMode.value === "phaseOrStandalone") {
    if (isFiniteNumber(row.phase_score_from_dives)) return "Phase";
    return postedLikelyStandalone(row) ? "Posted" : "Needs sheet";
  }
  if (elements.scoreMode.value === "ncaaWomen5Category") {
    if (isFiniteNumber(row.phase_score_from_dives)) return "Phase";
    return postedLikelyStandalone(row) ? "Posted" : "Needs sheet";
  }
  if (elements.scoreMode.value === "phasePreferred" && isFiniteNumber(row.phase_score_from_dives)) {
    return "Phase";
  }
  return "Posted";
}

function postedLikelyStandalone(row) {
  if (!isFiniteNumber(row.posted_score)) return false;
  if (row.competition_family === "USA Diving" && row.round_stage && row.round_stage !== "Prelim") {
    return false;
  }
  return true;
}

function usesNcaaWomenFiveCategoryScore(row) {
  return (
    elements.scoreMode.value === "ncaaWomen5Category" &&
    row.ncaa_women_springboard_adjustment_status === "adjusted" &&
    isFiniteNumber(row.ncaa_women_springboard_5cat_score)
  );
}

function isNcaaWomenSpringboardRow(row) {
  return (
    row.competition_family === "NCAA" &&
    row.gender === "Female" &&
    (row.discipline === "1m" || row.discipline === "3m") &&
    (!row.ncaa_division || row.ncaa_division === "Division I") &&
    !row.is_synchronized
  );
}

function adjustmentScoreLabel(value, fallback = "n/a") {
  return isFiniteNumber(value) ? formatScore(value) : fallback;
}

function adjustmentValue(value, fallback = "n/a") {
  return displayValue(value, fallback);
}

function droppedDiveLabel(row, fallback = "n/a") {
  const diveNumber = adjustmentValue(row.ncaa_women_springboard_dropped_dive_number, "");
  const score = row.ncaa_women_springboard_dropped_dive_score;
  if (!diveNumber) return fallback;
  return isFiniteNumber(score) ? `${diveNumber} (${formatScore(score)})` : diveNumber;
}

function adjustmentStatusText(status) {
  const value = String(status || "not_applicable");
  const labels = {
    not_applicable: "Not applicable",
    adjusted: "Adjusted",
    missing_dive_sheet: "Missing dive sheet",
    incomplete_categories: "Incomplete categories",
    unexpected_dive_count: "Unexpected dive count",
    ambiguous_repeated_category: "Ambiguous repeated category",
    invalid_dive_numbers: "Invalid dive numbers",
  };
  return labels[value] || value.replaceAll("_", " ");
}

function ddStatusBadge(status) {
  const normalized = String(status || "").toLowerCase();
  let className = "status-badge dd-neutral";
  if (normalized === "pass") className = "status-badge dd-pass";
  if (normalized.includes("unknown")) className = "status-badge dd-warn";
  if (normalized === "fail" || normalized.includes("fail")) className = "status-badge dd-fail";
  if (normalized === "ignored" || normalized.includes("no minimum")) className = "status-badge dd-neutral";
  return `<span class="${className}">${escapeHtml(status || "Unknown")}</span>`;
}

function adjustmentStatusBadge(status) {
  const value = String(status || "not_applicable");
  return `<span class="status-badge ${escapeAttr(value)}">${escapeHtml(adjustmentStatusText(value))}</span>`;
}

function adjustmentNote(row) {
  const status = row.ncaa_women_springboard_adjustment_status || "not_applicable";
  const note = displayValue(row.ncaa_women_springboard_adjustment_note, "");
  if (note) return note;
  if (status === "not_applicable") {
    if (row.discipline === "Platform") return "NCAA women's 5-category springboard adjustment does not apply to platform.";
    return "NCAA women's 5-category springboard adjustment does not apply to this row.";
  }
  return `NCAA women's springboard adjustment status: ${adjustmentStatusText(status)}.`;
}

function adjustmentCheckStatus(row) {
  const status = row.ncaa_women_springboard_adjustment_status || "not_applicable";
  if (status === "adjusted") return "pass";
  if (status === "not_applicable") return "neutral";
  return "warn";
}

function betterRoundRow(current, candidate) {
  if (!current) return candidate;
  if (safeNumber(candidate.posted_score) !== safeNumber(current.posted_score)) {
    return safeNumber(candidate.posted_score) > safeNumber(current.posted_score) ? candidate : current;
  }
  return safeNumber(candidate.phase_score_from_dives) > safeNumber(current.phase_score_from_dives) ? candidate : current;
}

function teamLabel(row) {
  return row.team_name || normalizedNat(row) || "";
}

function teamNationalityLabel(row) {
  const team = String(row.team_name || "").trim();
  const nat = normalizedNat(row);
  if (team && nat) return `${team} / ${nat}`;
  return team || nat || "Not published";
}

function eventDescription(row) {
  const pieces = [row.gender, row.discipline, row.event_level, row.age_group]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
  if (row.is_synchronized) pieces.push("Synchronized");
  return displayValue(pieces.join(" "));
}

function sourceKey(row) {
  return [row.competition_family, row.competition_group, row.ncaa_division].filter(Boolean).join(" / ");
}

function meetLabel(row) {
  const name = String(row.meet_name || "").trim();
  const year = String(row.meet_year || "").trim();
  if (!year || name.startsWith(year)) return name;
  return `${year} ${name}`;
}

function compactSource(source) {
  return source
    .replace("USA Diving / ", "")
    .replace("World Aquatics / ", "WA ")
    .replace("NCAA / ", "");
}

function criteriaPresetLabel() {
  return selectedOptionText(elements.criteriaPreset);
}

function ruleModeLabel(mode) {
  if (mode === "scoreOnly") return "Score only";
  if (mode === "topNOnly") return "placement cutoff only";
  if (mode === "topNOrScore") return "placement cutoff OR score";
  return displayValue(mode);
}

function scoreModeLabel(mode) {
  if (mode === "ncaaWomen5Category") return "NCAA women's 5-category when available";
  if (mode === "phaseOrStandalone") return "Non-cumulative score";
  if (mode === "phasePreferred") return "Phase score when available";
  if (mode === "posted") return "Posted score";
  return displayValue(mode);
}

function ddModeLabel(mode) {
  if (mode === "ignore") return "Ignore DD for this run";
  if (mode === "knownOnly") return "Enforce when known";
  if (mode === "requireKnown") return "Require known DD";
  return displayValue(mode);
}

function athleteKey(row) {
  if (row.diver_id && row.diver_id !== "WA-None") return String(row.diver_id);
  return `${row.diver_name || ""}|${row.team_name || row.nat || ""}`;
}

function compareRows(a, b) {
  const scoreDelta = safeNumber(a.analysis_score) - safeNumber(b.analysis_score);
  if (scoreDelta !== 0) return scoreDelta;
  const placeDelta = safeNumber(b.place, 9999) - safeNumber(a.place, 9999);
  if (placeDelta !== 0) return placeDelta;
  return safeNumber(a.meet_year) - safeNumber(b.meet_year);
}

function compareScores(a, b) {
  const aScore = safeNumber(a, -1);
  const bScore = safeNumber(b, -1);
  return aScore - bScore;
}

function roundOrder(round) {
  if (round === "Prelim") return 1;
  if (round === "Semifinal") return 2;
  if (round === "Final") return 3;
  if (round === "Head-To-Head") return 4;
  return 9;
}

function disciplineStep() {
  const discipline = elements.disciplineFilter.value;
  return discipline === "Platform" ? 10 : 12;
}

function fillSelect(select, values, preferred) {
  select.innerHTML = values
    .map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`)
    .join("");
  if (values.includes(preferred)) select.value = preferred;
}

function groupBy(values, getKey) {
  const map = new Map();
  values.forEach((value) => {
    const key = getKey(value);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  });
  return map;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))];
}

function mean(values) {
  const filtered = values.filter(isFiniteNumber);
  return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : null;
}

function median(values) {
  const filtered = values.filter(isFiniteNumber).sort((a, b) => a - b);
  if (!filtered.length) return 0;
  const mid = Math.floor(filtered.length / 2);
  return filtered.length % 2 ? filtered[mid] : (filtered[mid - 1] + filtered[mid]) / 2;
}

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeNumber(value, fallback = -Infinity) {
  return isFiniteNumber(value) ? value : fallback;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function formatInt(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatScore(value) {
  return isFiniteNumber(value) ? value.toFixed(2).replace(/\.00$/, "") : "";
}

function formatSignedScore(value) {
  if (!isFiniteNumber(value)) return "";
  const formatted = formatScore(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : "0";
}

function displayValue(value, fallback = "Not available") {
  const text = String(value ?? "").trim();
  return text && text !== "NaN" && text !== "null" && text !== "undefined" ? text : fallback;
}

function displayScoreValue(value, fallback = "Not available") {
  return isFiniteNumber(value) ? formatScore(value) : fallback;
}

function formatGapForExplanation(value) {
  if (!isFiniteNumber(value)) return "Not available";
  if (value === 0) return "Exactly at threshold";
  return value > 0
    ? `${formatScore(value)} above threshold`
    : `${formatScore(Math.abs(value))} below threshold`;
}

function ensurePeriod(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function formatChartNumber(value) {
  return isFiniteNumber(value) ? value.toFixed(value % 1 ? 1 : 0) : value;
}

function formatPlace(value) {
  return isFiniteNumber(value) ? String(Math.round(value)) : "";
}

function shortMeet(value) {
  return String(value || "")
    .replace("2025 USA Diving ", "")
    .replace("2026 USA Diving ", "")
    .replace("World Aquatics ", "WA ")
    .replace("Swimming and Diving Championships", "S&D Championships");
}

function trim(value, length) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length - 1)}...` : text;
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function selectedOptionText(select) {
  return select.options[select.selectedIndex]?.textContent || select.value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
