const DATA = window.JUNIOR_RESULTS_DATA || {
  meta: { counts: {} },
  stages: [],
  events: [],
  results: [],
  athletes: [],
  officialZoneQualifiers: [],
};

const OVERRIDE_STORAGE_KEY = "usad.juniorResults.overrides.v1";
const ZONE_DIRECT_NATIONAL_LIMIT = 5;
const ZONE_REPLACEMENT_ELIGIBLE_LIMIT = 6;

const state = {
  stage: "Regionals",
  meetName: "",
  eventCategory: "",
  discipline: "",
  gender: "",
  ageGroup: "",
  zone: "",
  ewc: "",
  search: "",
  selectedEventId: "",
  flagMode: "any",
  flags: new Set(),
  view: "results",
  overrides: loadOverrides(),
};

const filters = [
  ["stageFilter", "stage", "Stage"],
  ["meetFilter", "meetName", "All meets"],
  ["eventTypeFilter", "eventCategory", "All event types"],
  ["boardFilter", "discipline", "All boards"],
  ["genderFilter", "gender", "All genders"],
  ["ageFilter", "ageGroup", "All age groups"],
  ["zoneFilter", "zone", "All zones"],
  ["ewcFilter", "ewc", "All E/W/C"],
];

const flagDefinitions = [
  { key: "foreignDeclared", label: "Foreign declared" },
  { key: "dualDeclared", label: "Dual citizen" },
  { key: "prequalified", label: "Prequalified" },
  { key: "hps", label: "HPS" },
  { key: "ymca", label: "YMCA" },
  { key: "nonDisplacing", label: "Non-displacing" },
  { key: "bumpIn", label: "Bump in" },
  { key: "officialAverageScoreQualifier", label: "15th avg" },
  { key: "officialQualified", label: "Official list" },
  { key: "declaredNotAttending", label: "Not attending" },
  { key: "review", label: "Review flag" },
];

const elements = {
  headerSummary: document.getElementById("headerSummary"),
  flagControls: document.getElementById("flagControls"),
  kpiBand: document.getElementById("kpiBand"),
  eventList: document.getElementById("eventList"),
  contextPanel: document.getElementById("contextPanel"),
  tableWrap: document.getElementById("tableWrap"),
  rowCount: document.getElementById("rowCount"),
  searchInput: document.getElementById("searchInput"),
  clearEventButton: document.getElementById("clearEventButton"),
  copyTsvButton: document.getElementById("copyTsvButton"),
  downloadCsvButton: document.getElementById("downloadCsvButton"),
  overrideAthleteId: document.getElementById("overrideAthleteId"),
  overrideAthleteName: document.getElementById("overrideAthleteName"),
  overrideType: document.getElementById("overrideType"),
  overrideValue: document.getElementById("overrideValue"),
  overrideNote: document.getElementById("overrideNote"),
  addOverrideButton: document.getElementById("addOverrideButton"),
  undoOverrideButton: document.getElementById("undoOverrideButton"),
  redoOverrideButton: document.getElementById("redoOverrideButton"),
  exportOverridesButton: document.getElementById("exportOverridesButton"),
  clearOverridesButton: document.getElementById("clearOverridesButton"),
  overrideSummary: document.getElementById("overrideSummary"),
  overrideLog: document.getElementById("overrideLog"),
};

let effectiveResults = [];
let effectiveEvents = [];
let eventById = new Map();

function init() {
  recomputeEffectiveData();
  renderHeader();
  renderFlagControls();
  attachListeners();
  populateFilters();
  render();
}

function attachListeners() {
  filters.forEach(([elementId, key]) => {
    const element = document.getElementById(elementId);
    element.addEventListener("change", () => {
      state[key] = element.value;
      state.selectedEventId = "";
      populateFilters();
      render();
    });
  });

  elements.searchInput.addEventListener("input", () => {
    state.search = elements.searchInput.value.trim();
    state.selectedEventId = "";
    render();
  });

  elements.clearEventButton.addEventListener("click", () => {
    state.selectedEventId = "";
    render();
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.toggle("active", item === button));
      renderTable();
    });
  });

  elements.copyTsvButton.addEventListener("click", copyCurrentTsv);
  elements.downloadCsvButton.addEventListener("click", downloadCurrentCsv);
  elements.addOverrideButton.addEventListener("click", addManualOverrideFromForm);
  elements.undoOverrideButton.addEventListener("click", undoLastOverride);
  elements.redoOverrideButton.addEventListener("click", redoLastOverride);
  elements.exportOverridesButton.addEventListener("click", exportOverridesJson);
  elements.clearOverridesButton.addEventListener("click", clearOverrides);

  elements.overrideLog.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-override-action]");
    if (!button) return;
    handleOverrideLogAction(button.dataset.overrideAction, button.dataset.overrideId);
  });

  elements.tableWrap.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-row-override]");
    if (!button) return;
    const row = effectiveResults.find((item) => item.id === button.dataset.rowId);
    if (!row) return;
    addOverride({
      type: button.dataset.rowOverride,
      value: button.dataset.overrideValue === "true",
      athleteId: row.diveMeetsId,
      athleteName: row.athlete,
      eventId: button.dataset.rowOverride === "notAttending" ? row.eventId : "",
      eventName: button.dataset.rowOverride === "notAttending" ? row.eventName : "",
      note: button.dataset.note || "Row action",
    });
  });
}

function loadOverrides() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OVERRIDE_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOverrides() {
  localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(state.overrides));
}

function addOverride(input) {
  const override = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    active: true,
    type: input.type,
    value: Boolean(input.value),
    athleteId: String(input.athleteId || "").trim(),
    athleteName: String(input.athleteName || "").trim(),
    eventId: input.eventId || "",
    eventName: input.eventName || "",
    note: String(input.note || "").trim(),
  };
  if (!override.athleteId && !override.athleteName) return;
  state.overrides.push(override);
  saveOverrides();
  render();
}

function addManualOverrideFromForm() {
  if (elements.overrideType.value === "notAttending" && !state.selectedEventId) {
    alert("Select one event before adding a declared-not-attending override.");
    return;
  }
  addOverride({
    type: elements.overrideType.value,
    value: elements.overrideValue.value === "true",
    athleteId: elements.overrideAthleteId.value,
    athleteName: elements.overrideAthleteName.value,
    eventId: elements.overrideType.value === "notAttending" ? state.selectedEventId : "",
    eventName: state.selectedEventId && eventById.get(state.selectedEventId) ? eventById.get(state.selectedEventId).eventName : "",
    note: elements.overrideNote.value || "Manual entry",
  });
  elements.overrideNote.value = "";
}

function undoLastOverride() {
  const target = [...state.overrides].reverse().find((item) => item.active);
  if (!target) return;
  target.active = false;
  saveOverrides();
  render();
}

function redoLastOverride() {
  const target = [...state.overrides].reverse().find((item) => !item.active);
  if (!target) return;
  target.active = true;
  saveOverrides();
  render();
}

function clearOverrides() {
  if (!state.overrides.length) return;
  if (!confirm("Clear all manual overrides saved in this browser?")) return;
  state.overrides = [];
  saveOverrides();
  render();
}

function handleOverrideLogAction(action, overrideId) {
  const item = state.overrides.find((override) => override.id === overrideId);
  if (!item) return;
  if (action === "toggle") {
    item.active = !item.active;
  }
  if (action === "delete") {
    state.overrides = state.overrides.filter((override) => override.id !== overrideId);
  }
  saveOverrides();
  render();
}

function exportOverridesJson() {
  const blob = new Blob([JSON.stringify(state.overrides, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "junior-results-overrides.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function recomputeEffectiveData() {
  const rowOverrides = buildOverrideLookup();
  effectiveResults = DATA.results.map((row) => applyOverridesToRow(row, rowOverrides));
  recalculateEventQualification(effectiveResults);
  effectiveResults.forEach((row) => {
    row.flags = buildEffectiveFlags(row);
  });
  effectiveEvents = buildEffectiveEvents(effectiveResults);
  eventById = new Map(effectiveEvents.map((event) => [event.id, event]));
}

function buildOverrideLookup() {
  const byAthlete = new Map();
  const byEventAthlete = new Map();
  state.overrides
    .filter((override) => override.active)
    .forEach((override) => {
      const key = athleteKey(override);
      if (!key) return;
      const target = override.eventId ? byEventAthlete : byAthlete;
      const lookupKey = override.eventId ? `${override.eventId}|${key}` : key;
      if (!target.has(lookupKey)) target.set(lookupKey, []);
      target.get(lookupKey).push(override);
    });
  return { byAthlete, byEventAthlete };
}

function applyOverridesToRow(row, lookups) {
  const next = cloneRow(row);
  const key = athleteKey(next);
  const overrides = [
    ...(lookups.byAthlete.get(key) || []),
    ...(lookups.byEventAthlete.get(`${next.eventId}|${key}`) || []),
  ];
  next.baseForeignDeclared = Boolean(row.foreignDeclared);
  next.baseDualDeclared = Boolean(row.dualDeclared);
  next.baseDualOtherCountry = Boolean(row.dualOtherCountry);
  next.baseNonDisplacingReason = row.nonDisplacingReason || "";
  next.declaredNotAttending = false;
  next.overrideNotes = overrides.map((override) => overrideNote(override));

  const foreignOverride = lastOverrideValue(overrides, "foreign");
  const dualOverride = lastOverrideValue(overrides, "dual");
  const dualEffectOverride = lastOverrideValue(overrides, "dualEffect");
  const notAttendingOverride = lastOverrideValue(overrides, "notAttending");

  next.foreignDeclared = foreignOverride == null ? Boolean(row.foreignDeclared) : foreignOverride;
  next.dualDeclared = dualOverride == null ? Boolean(row.dualDeclared) || dualEffectOverride === true : dualOverride || dualEffectOverride === true;
  next.dualOtherCountry = dualEffectOverride == null ? Boolean(row.dualOtherCountry) : dualEffectOverride;
  next.declaredNotAttending = notAttendingOverride == null ? false : notAttendingOverride;
  next.webpointNonUsEffective = Boolean(next.webpointNonUs && foreignOverride !== false);
  next.foreignInternational = next.foreignDeclared || next.webpointNonUsEffective || next.dualOtherCountry;

  const reasons = [];
  if (next.hps) reasons.push("HPS Tier 3 Junior squad");
  if (next.ymca) reasons.push("YMCA champion in this event");
  if (next.foreignDeclared) reasons.push("Foreign athlete declaration");
  if (next.webpointNonUsEffective) reasons.push("Webpoint non-US citizen");
  if (next.dualOtherCountry) reasons.push("Dual citizen declared/competed for another federation");
  next.prequalified = Boolean(next.hps || next.ymca);
  next.prequalification = [];
  if (next.hps) next.prequalification.push("Junior Nationals: Tier 3 Junior HPS");
  if (next.ymca) next.prequalification.push("E/W/C prelims: YMCA national event champion");
  next.nonDisplacingReason = reasons.join(" | ");
  next.nonDisplacing = reasons.length > 0;
  next.countsTowardTop15 = Boolean(next.qualifyingEvent && !next.nonDisplacing && next.placeNumber != null);
  next.flags = buildEffectiveFlags(next);
  return next;
}

function cloneRow(row) {
  return JSON.parse(JSON.stringify(row));
}

function lastOverrideValue(overrides, type) {
  const match = [...overrides].reverse().find((override) => override.type === type);
  return match ? Boolean(match.value) : null;
}

function recalculateEventQualification(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.eventId)) grouped.set(row.eventId, []);
    grouped.get(row.eventId).push(row);
  });

  grouped.forEach((eventRows) => {
    eventRows.sort((a, b) => (a.placeNumber || 9999) - (b.placeNumber || 9999) || (b.score || 0) - (a.score || 0));
    if (eventRows.some((row) => row.stage === "Zones")) {
      recalculateZoneToNational(eventRows);
    } else {
      recalculateRegionalToZone(eventRows);
    }
  });
}

function recalculateRegionalToZone(eventRows) {
  let count = 0;
  const nonDisplacingAhead = [];
  const bumpInRows = [];
  eventRows.forEach((row) => {
    row.countingRank = "";
    row.top15Qualifier = false;
    row.bumpIn = false;
    row.spotShifted = false;
    row.openedSpot = false;
    row.bumpedBy = [];
    row.openedFor = [];
    row.officialAverageScoreQualifier = Boolean(
      row.qualifyingEvent &&
        !row.nonDisplacing &&
        row.officialThresholdScore != null &&
        row.score != null &&
        row.score >= row.officialThresholdScore &&
        !row.top15Qualifier
    );
    row.officialQualified = Boolean(row.officialQualified && !row.nonDisplacing);
    if (row.countsTowardTop15) {
      count += 1;
      row.countingRank = count;
      row.top15Qualifier = count <= 15;
    }
    row.officialAverageScoreQualifier = Boolean(
      row.qualifyingEvent &&
        !row.nonDisplacing &&
        row.officialThresholdScore != null &&
        row.score != null &&
        row.score >= row.officialThresholdScore &&
        !row.top15Qualifier
    );
    if (row.nonDisplacing) {
      nonDisplacingAhead.push(row);
    } else if (row.countingRank && row.placeNumber > row.countingRank && nonDisplacingAhead.length) {
      row.spotShifted = true;
      row.bumpedBy = nonDisplacingAhead.map((item) => ({ athlete: item.athlete, place: item.place, reason: item.nonDisplacingReason }));
    }
    if (row.top15Qualifier && row.placeNumber > 15) {
      row.bumpIn = true;
      bumpInRows.push(row);
    }
  });
  eventRows.forEach((row) => {
    if (row.nonDisplacing && row.qualifyingEvent && row.placeNumber <= Math.max(15, count)) {
      row.openedSpot = true;
      row.openedFor = bumpInRows
        .filter((bumped) => bumped.bumpedBy.some((item) => item.athlete === row.athlete))
        .map((bumped) => ({ athlete: bumped.athlete, place: bumped.place, countingRank: bumped.countingRank }));
    }
    row.qualificationStatus = regionalQualificationStatus(row);
    row.advancesToZone = row.top15Qualifier || row.officialAverageScoreQualifier || row.officialQualified;
  });
}

function regionalQualificationStatus(row) {
  if (!row.qualifyingEvent) return "Non-qualifying event";
  if (row.nonDisplacing) return "Non-displacing - no spot consumed";
  if (row.top15Qualifier) return "Zone qualifier - top 15/drop-down";
  if (row.officialAverageScoreQualifier) return "Zone qualifier - official 15th average";
  if (row.officialQualified) return "Zone qualifier - official list";
  return "Does not advance from Region";
}

function recalculateZoneToNational(eventRows) {
  let rawEligibleRank = 0;
  let attendingEligibleRank = 0;
  let declinedInsideDirectLimit = 0;
  eventRows.forEach((row) => {
    row.eligibleRank = "";
    row.attendingEligibleRank = "";
    row.juniorNationalStatus = "";
    row.bumpIn = false;
    row.openedSpot = false;
    row.spotShifted = false;
    row.bumpedBy = [];
    row.openedFor = [];
    const eligible = row.qualifyingEvent !== false && !row.nonDisplacing && !row.prequalified;
    if (!eligible) {
      row.qualificationStatus = row.nonDisplacing ? "Non-displacing - no spot consumed" : "Not eligible for direct advancement";
      row.advancesToZone = false;
      return;
    }
    rawEligibleRank += 1;
    row.eligibleRank = rawEligibleRank;
    if (row.declaredNotAttending) {
      row.qualificationStatus = "Declared not attending";
      row.juniorNationalStatus = "Declined";
      if (rawEligibleRank <= ZONE_DIRECT_NATIONAL_LIMIT) declinedInsideDirectLimit += 1;
      row.advancesToZone = false;
      row.openedSpot = rawEligibleRank <= ZONE_DIRECT_NATIONAL_LIMIT;
      return;
    }
    attendingEligibleRank += 1;
    row.attendingEligibleRank = attendingEligibleRank;
    if (rawEligibleRank <= ZONE_DIRECT_NATIONAL_LIMIT) {
      row.qualificationStatus = "Junior Nationals qualifier - direct";
      row.juniorNationalStatus = "Direct";
      row.advancesToZone = true;
    } else if (
      declinedInsideDirectLimit > 0 &&
      rawEligibleRank <= ZONE_REPLACEMENT_ELIGIBLE_LIMIT &&
      attendingEligibleRank <= ZONE_DIRECT_NATIONAL_LIMIT
    ) {
      row.qualificationStatus = "Junior Nationals qualifier - decline replacement";
      row.juniorNationalStatus = "Replacement";
      row.bumpIn = true;
      row.advancesToZone = true;
    } else if (rawEligibleRank <= ZONE_REPLACEMENT_ELIGIBLE_LIMIT) {
      row.qualificationStatus = "Replacement eligible if a direct qualifier declines";
      row.juniorNationalStatus = "Replacement pool";
      row.advancesToZone = false;
    } else {
      row.qualificationStatus = "Does not advance from Zone";
      row.advancesToZone = false;
    }
  });
}

function buildEffectiveEvents(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.eventId)) grouped.set(row.eventId, []);
    grouped.get(row.eventId).push(row);
  });
  return [...grouped.entries()]
    .map(([id, eventRows]) => {
      const original = DATA.events.find((event) => event.id === id) || eventRows[0];
      return {
        ...original,
        entries: eventRows.length,
        countableEntries: eventRows.filter((row) => row.countsTowardTop15).length,
        nonDisplacingEntries: eventRows.filter((row) => row.nonDisplacing).length,
        foreignRows: eventRows.filter((row) => row.foreignDeclared || row.webpointNonUsEffective).length,
        dualRows: eventRows.filter((row) => row.dualDeclared).length,
        prequalifiedRows: eventRows.filter((row) => row.prequalified).length,
        top15Qualifiers: eventRows.filter((row) => row.top15Qualifier).length,
        officialAverageQualifiers: eventRows.filter((row) => row.officialAverageScoreQualifier).length,
        officialQualifiedRows: eventRows.filter((row) => row.officialQualified).length,
        declaredNotAttendingRows: eventRows.filter((row) => row.declaredNotAttending).length,
        bumpIns: eventRows.filter((row) => row.bumpIn).length,
        spotShifts: eventRows.filter((row) => row.spotShifted).length,
        openedSpots: eventRows.filter((row) => row.openedSpot).length,
        reviewRows: eventRows.filter((row) => row.reviewFlags && row.reviewFlags.length).length,
      };
    })
    .sort(eventCompare);
}

function buildEffectiveFlags(row) {
  const flags = [];
  if (row.foreignDeclared) flags.push("Foreign declared");
  if (row.webpointNonUsEffective && !row.foreignDeclared) flags.push("Webpoint non-US");
  if (row.dualDeclared) flags.push(row.dualOtherCountry ? "Dual affects results" : "Dual citizen");
  if (row.hps) flags.push("HPS");
  if (row.ymca) flags.push("YMCA");
  if (row.prequalified) flags.push("Prequalified");
  if (row.declaredNotAttending) flags.push("Declared not attending");
  if (row.bumpIn) flags.push("Bump in");
  if (row.reviewFlags && row.reviewFlags.length) flags.push("Review");
  return flags;
}

function athleteKey(value) {
  const id = String(value.athleteId || value.diveMeetsId || "").trim();
  if (id) return `id:${id}`;
  const name = String(value.athleteName || value.athlete || "").trim().toLowerCase();
  return name ? `name:${name}` : "";
}

function overrideNote(override) {
  const label = overrideTypeLabel(override.type);
  const stateLabel = override.value ? "on" : "off";
  return `${label} ${stateLabel}${override.note ? ` - ${override.note}` : ""}`;
}

function overrideTypeLabel(type) {
  return {
    foreign: "Foreign athlete",
    dual: "Dual citizen",
    dualEffect: "Dual affects results",
    notAttending: "Declared not attending",
  }[type] || type;
}

function renderHeader() {
  const counts = DATA.meta.counts || {};
  elements.headerSummary.innerHTML = [
    headerPill(counts.results || effectiveResults.length, "result rows"),
    headerPill(counts.events || effectiveEvents.length, "events"),
    headerPill(counts.officialThresholds || 0, "15th avgs"),
    headerPill(counts.officialZoneQualifiers || 0, "official qualifiers"),
  ].join("");
}

function headerPill(value, label) {
  return `<div class="summary-pill"><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function renderFlagControls() {
  const toggles = flagDefinitions
    .map(
      (flag) => `
        <label class="flag-toggle">
          <input type="checkbox" data-flag="${flag.key}">
          ${escapeHtml(flag.label)}
        </label>`
    )
    .join("");
  elements.flagControls.innerHTML = `
    <select id="flagMode" class="flag-mode" aria-label="Flag filter mode">
      <option value="any">Any tag</option>
      <option value="all">All tags</option>
    </select>
    ${toggles}
  `;
  document.getElementById("flagMode").addEventListener("change", (event) => {
    state.flagMode = event.target.value;
    render();
  });
  elements.flagControls.querySelectorAll("input[data-flag]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        state.flags.add(input.dataset.flag);
      } else {
        state.flags.delete(input.dataset.flag);
      }
      state.selectedEventId = "";
      render();
    });
  });
}

function populateFilters() {
  filters.forEach(([elementId, key, allLabel]) => {
    const element = document.getElementById(elementId);
    const options = key === "stage" ? DATA.stages.map((stage) => stage.stage) : uniqueValues(rowsForOptions(key), key);
    if (key !== "stage" && state[key] && !options.includes(state[key])) {
      state[key] = "";
    }
    const allowAll = key !== "stage";
    element.innerHTML = [
      allowAll ? `<option value="">${escapeHtml(allLabel)}</option>` : "",
      ...options.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`),
    ].join("");
    element.value = state[key] || (allowAll ? "" : options[0] || "");
    if (key === "stage") {
      state.stage = element.value || "Regionals";
    }
  });
}

function rowsForOptions(exceptKey) {
  return effectiveResults.filter((row) => {
    return filters.every(([, key]) => {
      if (key === exceptKey) return true;
      if (!state[key]) return true;
      return String(row[key] || "") === state[key];
    });
  });
}

function uniqueValues(rows, key) {
  const values = [...new Set(rows.map((row) => row[key]).filter(Boolean))];
  return values.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function render() {
  recomputeEffectiveData();
  renderOverridePanel();
  renderKpis();
  renderEventList();
  renderContext();
  renderTable();
}

function renderOverridePanel() {
  const active = state.overrides.filter((override) => override.active);
  elements.undoOverrideButton.disabled = !active.length;
  elements.redoOverrideButton.disabled = !state.overrides.some((override) => !override.active);
  elements.clearOverridesButton.disabled = !state.overrides.length;
  elements.exportOverridesButton.disabled = !state.overrides.length;
  elements.overrideSummary.innerHTML = `
    <span>${formatNumber(active.length)} active overrides</span>
    <span>${formatNumber(state.overrides.length)} total log entries</span>
    <span>${formatNumber(effectiveResults.filter((row) => row.declaredNotAttending).length)} declared-not-attending rows</span>
    <span>${formatNumber(effectiveResults.filter((row) => row.dualOtherCountry).length)} dual-effect rows</span>
  `;
  if (!state.overrides.length) {
    elements.overrideLog.innerHTML = `<div class="empty-mini">No manual overrides yet.</div>`;
    return;
  }
  elements.overrideLog.innerHTML = state.overrides
    .slice()
    .reverse()
    .map(
      (override) => `
        <div class="override-item ${override.active ? "active" : "inactive"}">
          <div>
            <strong>${escapeHtml(overrideTypeLabel(override.type))}: ${override.value ? "on" : "off"}</strong>
            <span>${escapeHtml(override.athleteName || "Unknown athlete")} ${override.athleteId ? `(${escapeHtml(override.athleteId)})` : ""}</span>
            ${override.eventName ? `<span>${escapeHtml(override.eventName)}</span>` : ""}
            ${override.note ? `<span>${escapeHtml(override.note)}</span>` : ""}
          </div>
          <div class="override-item-actions">
            <button class="secondary-button" type="button" data-override-action="toggle" data-override-id="${escapeAttr(override.id)}">
              ${override.active ? "Deactivate" : "Reactivate"}
            </button>
            <button class="secondary-button" type="button" data-override-action="delete" data-override-id="${escapeAttr(override.id)}">Delete</button>
          </div>
        </div>`
    )
    .join("");
}

function baseFilteredRows(options = {}) {
  const ignoreEvent = Boolean(options.ignoreEvent);
  const query = state.search.toLowerCase();
  return effectiveResults.filter((row) => {
    if (state.selectedEventId && !ignoreEvent && row.eventId !== state.selectedEventId) return false;
    if (!matchesFilter(row, "stage")) return false;
    if (!matchesFilter(row, "meetName")) return false;
    if (!matchesFilter(row, "eventCategory")) return false;
    if (!matchesFilter(row, "discipline")) return false;
    if (!matchesFilter(row, "gender")) return false;
    if (!matchesFilter(row, "ageGroup")) return false;
    if (!matchesFilter(row, "zone")) return false;
    if (!matchesFilter(row, "ewc")) return false;
    if (query && !searchText(row).includes(query)) return false;
    if (!matchesFlags(row)) return false;
    return true;
  });
}

function matchesFilter(row, key) {
  return !state[key] || String(row[key] || "") === state[key];
}

function matchesFlags(row) {
  if (!state.flags.size) return true;
  const checks = [...state.flags].map((flag) => flagValue(row, flag));
  return state.flagMode === "all" ? checks.every(Boolean) : checks.some(Boolean);
}

function flagValue(row, key) {
  if (key === "review") return Boolean(row.reviewFlags && row.reviewFlags.length);
  return Boolean(row[key]);
}

function searchText(row) {
  return [row.athlete, row.diveMeetsId, row.team, row.eventName, row.meetName, row.flags.join(" ")]
    .join(" ")
    .toLowerCase();
}

function renderKpis() {
  const rows = baseFilteredRows({ ignoreEvent: true });
  const athletes = new Set(rows.map((row) => row.diveMeetsId || row.athlete));
  const kpis = [
    ["Rows", rows.length],
    ["Athletes", athletes.size],
    ["Qualifiers", rows.filter((row) => row.advancesToZone).length],
    ["Non-displacing", rows.filter((row) => row.nonDisplacing).length],
    ["Foreign", rows.filter((row) => row.foreignDeclared || row.webpointNonUsEffective).length],
    ["Dual", rows.filter((row) => row.dualDeclared).length],
    ["Prequalified", rows.filter((row) => row.prequalified).length],
    ["Not attending", rows.filter((row) => row.declaredNotAttending).length],
    ["Bump-ins", rows.filter((row) => row.bumpIn).length],
  ];
  elements.kpiBand.innerHTML = kpis
    .map(([label, value]) => `<div class="kpi"><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></div>`)
    .join("");
}

function renderEventList() {
  const rows = baseFilteredRows({ ignoreEvent: true });
  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.eventId)) grouped.set(row.eventId, []);
    grouped.get(row.eventId).push(row);
  });
  const events = [...grouped.entries()]
    .map(([id, eventRows]) => ({ event: eventById.get(id), rows: eventRows }))
    .filter((item) => item.event)
    .sort((a, b) => eventCompare(a.event, b.event));

  if (!events.length) {
    elements.eventList.innerHTML = `<div class="empty-state">No events match the current filters.</div>`;
    return;
  }

  elements.eventList.innerHTML = events
    .map(({ event, rows }) => {
      const active = event.id === state.selectedEventId ? " active" : "";
      const details = [
        event.meetName.replace("2026 USA Diving Junior ", ""),
        `${rows.length} rows`,
        `${rows.filter((row) => row.nonDisplacing).length} non-displacing`,
        `${rows.filter((row) => row.bumpIn).length} bump-ins`,
      ].join(" | ");
      return `
        <button type="button" class="event-item${active}" data-event-id="${escapeAttr(event.id)}">
          <strong>${escapeHtml(event.eventName)}</strong>
          <span>${escapeHtml(details)}</span>
        </button>`;
    })
    .join("");

  elements.eventList.querySelectorAll("button[data-event-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedEventId = button.dataset.eventId;
      render();
    });
  });
}

function eventCompare(a, b) {
  return (
    (a.region || 999) - (b.region || 999) ||
    (a.sort || 999) - (b.sort || 999) ||
    a.eventName.localeCompare(b.eventName)
  );
}

function renderContext() {
  const rows = baseFilteredRows();
  const selected = state.selectedEventId ? eventById.get(state.selectedEventId) : null;
  const title = selected ? selected.eventName : "All matching rows";
  const subtitle = selected
    ? `${selected.meetName} | Zone ${selected.zone || ""} | ${selected.eventCategory}`
    : "Use filters or click an event to narrow the audit table.";
  const threshold = selected && selected.officialThresholdScore != null ? formatScore(selected.officialThresholdScore) : "n/a";
  const metrics = [
    ["Entries", rows.length],
    ["Countable", rows.filter((row) => row.countsTowardTop15).length],
    ["Top 15", rows.filter((row) => row.top15Qualifier).length],
    ["15th avg", rows.filter((row) => row.officialAverageScoreQualifier).length],
    ["Threshold", threshold],
  ];
  elements.contextPanel.innerHTML = `
    <div class="context-title">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(subtitle)}</span>
    </div>
    ${metrics
      .map(([label, value]) => `<div class="context-metric"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`)
      .join("")}
  `;
}

function renderTable() {
  const rows = currentRowsForView();
  elements.rowCount.textContent = `${formatNumber(rows.length)} ${state.view === "athletes" ? "athletes" : "rows"} shown`;
  if (!rows.length) {
    elements.tableWrap.innerHTML = `<div class="empty-state">No records match this view.</div>`;
    return;
  }
  if (state.view === "athletes") {
    renderAthleteTable(rows);
    return;
  }
  if (state.view === "overrides") {
    renderOverridesTable(rows);
    return;
  }
  if (state.view === "official") {
    renderOfficialTable(rows);
    return;
  }
  renderResultTable(rows);
}

function currentRowsForView() {
  const rows = sortRows(baseFilteredRows());
  if (state.view === "bumps") {
    return rows.filter((row) => row.bumpIn || row.spotShifted || row.openedSpot || row.officialAverageScoreQualifier);
  }
  if (state.view === "flags") {
    return rows.filter(
      (row) =>
        row.foreignDeclared ||
        row.webpointNonUsEffective ||
        row.dualDeclared ||
        row.prequalified ||
        row.declaredNotAttending ||
        row.nonDisplacing ||
        (row.overrideNotes && row.overrideNotes.length) ||
        (row.reviewFlags && row.reviewFlags.length)
    );
  }
  if (state.view === "athletes") {
    return buildFilteredAthletes(rows);
  }
  if (state.view === "overrides") {
    return state.overrides.slice().reverse();
  }
  if (state.view === "official") {
    return officialRowsForCurrentFilters();
  }
  return rows;
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const eventA = eventById.get(a.eventId) || {};
    const eventB = eventById.get(b.eventId) || {};
    return (
      (a.region || 999) - (b.region || 999) ||
      (eventA.sort || 999) - (eventB.sort || 999) ||
      (a.placeNumber || 9999) - (b.placeNumber || 9999) ||
      (b.score || 0) - (a.score || 0)
    );
  });
}

function buildFilteredAthletes(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = `${row.diveMeetsId}|${row.athlete}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });
  return [...grouped.entries()]
    .map(([key, athleteRows]) => {
      const first = athleteRows[0];
      return {
        key,
        athlete: first.athlete,
        diveMeetsId: first.diveMeetsId,
        teams: [...new Set(athleteRows.map((row) => row.team).filter(Boolean))],
        events: athleteRows.length,
        advancing: athleteRows.filter((row) => row.advancesToZone).length,
        nonDisplacing: athleteRows.filter((row) => row.nonDisplacing).length,
        bumpIns: athleteRows.filter((row) => row.bumpIn).length,
        flags: [...new Set(athleteRows.flatMap((row) => row.flags))],
        prequalification: [...new Set(athleteRows.flatMap((row) => row.prequalification))],
      };
    })
    .sort((a, b) => a.athlete.localeCompare(b.athlete));
}

function officialRowsForCurrentFilters() {
  const selected = state.selectedEventId ? eventById.get(state.selectedEventId) : null;
  return DATA.officialZoneQualifiers
    .filter((row) => {
      if (selected && (row.zone !== selected.zone || row.eventKey !== selected.eventKey)) return false;
      if (state.zone && row.zone !== state.zone) return false;
      if (state.search) {
        const query = state.search.toLowerCase();
        if (![row.athlete, row.diveMeetsId, row.team, row.region, row.eventName].join(" ").toLowerCase().includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => a.zone.localeCompare(b.zone) || (a.eventSort || 999) - (b.eventSort || 999) || (a.rank || 9999) - (b.rank || 9999));
}

function renderResultTable(rows) {
  const columns = [
    "Place",
    "Rank",
    "Eligible",
    "Athlete",
    "Team",
    "Score",
    "Qualification",
    "Bump / Spot",
    "Flags",
    "Prequalified to",
    "Notes",
    "Manual",
  ];
  const body = rows
    .map(
      (row) => `
        <tr class="${rowClass(row)}">
          <td class="mono">${escapeHtml(row.place || "")}</td>
          <td class="mono">${rankCell(row)}</td>
          <td class="mono">${eligibleRankCell(row)}</td>
          <td>${athleteCell(row)}</td>
          <td>${escapeHtml(row.team || "")}</td>
          <td class="mono">${formatScore(row.score)}</td>
          <td>${statusBadge(row)}</td>
          <td>${bumpCell(row)}</td>
          <td>${flagPills(row)}</td>
          <td>${prequalificationCell(row)}</td>
          <td>${notesCell(row)}</td>
          <td>${rowActionButtons(row)}</td>
        </tr>`
    )
    .join("");
  elements.tableWrap.innerHTML = tableHtml(columns, body);
}

function renderOverridesTable(rows) {
  const columns = ["State", "Type", "Value", "Athlete", "Event", "Note", "Created", "Actions"];
  const body = rows
    .map(
      (override) => `
        <tr>
          <td>${override.active ? pill("Active", "hps") : pill("Inactive", "review")}</td>
          <td>${escapeHtml(overrideTypeLabel(override.type))}</td>
          <td>${escapeHtml(override.value ? "On" : "Off")}</td>
          <td><span class="athlete-name">${escapeHtml(override.athleteName || "Unknown athlete")}</span><div class="subtle mono">${escapeHtml(override.athleteId || "")}</div></td>
          <td>${escapeHtml(override.eventName || "All events")}</td>
          <td>${escapeHtml(override.note || "")}</td>
          <td class="mono">${escapeHtml(new Date(override.createdAt).toLocaleString())}</td>
          <td>
            <div class="row-actions">
              <button class="secondary-button" type="button" data-override-action="toggle" data-override-id="${escapeAttr(override.id)}">${override.active ? "Deactivate" : "Reactivate"}</button>
              <button class="secondary-button" type="button" data-override-action="delete" data-override-id="${escapeAttr(override.id)}">Delete</button>
            </div>
          </td>
        </tr>`
    )
    .join("");
  elements.tableWrap.innerHTML = tableHtml(columns, body);
}

function renderAthleteTable(rows) {
  const columns = ["Athlete", "ID", "Teams", "Events", "Advancing", "Non-displacing", "Bump-ins", "Flags", "Prequalified to"];
  const body = rows
    .map(
      (row) => `
        <tr>
          <td><span class="athlete-name">${escapeHtml(row.athlete)}</span></td>
          <td class="mono">${escapeHtml(row.diveMeetsId)}</td>
          <td>${escapeHtml(row.teams.join(", "))}</td>
          <td class="mono">${row.events}</td>
          <td class="mono">${row.advancing}</td>
          <td class="mono">${row.nonDisplacing}</td>
          <td class="mono">${row.bumpIns}</td>
          <td>${pillList(row.flags)}</td>
          <td>${escapeHtml(row.prequalification.join(" | "))}</td>
        </tr>`
    )
    .join("");
  elements.tableWrap.innerHTML = tableHtml(columns, body);
}

function renderOfficialTable(rows) {
  const columns = ["Zone", "Event", "Rank", "Athlete", "ID", "Team", "Region", "Score", "Official marker"];
  const body = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.zone)}</td>
          <td>${escapeHtml(row.eventName)}</td>
          <td class="mono">${escapeHtml(row.rank || "")}</td>
          <td><span class="athlete-name">${escapeHtml(row.athlete)}</span></td>
          <td class="mono">${escapeHtml(row.diveMeetsId)}</td>
          <td>${escapeHtml(row.team)}</td>
          <td>${escapeHtml(row.region)}</td>
          <td class="mono">${formatScore(row.score)}</td>
          <td>${row.isAverageScoreMarker ? pill("15th avg", "bump") : ""}</td>
        </tr>`
    )
    .join("");
  elements.tableWrap.innerHTML = tableHtml(columns, body);
}

function tableHtml(columns, body) {
  return `
    <table>
      <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function athleteCell(row) {
  return `
    <span class="athlete-name">${escapeHtml(row.athlete)}</span>
    <div class="subtle mono">${escapeHtml(row.diveMeetsId || "")}</div>
    <div class="subtle">${escapeHtml(row.eventName)}</div>
  `;
}

function rankCell(row) {
  if (row.stage === "Zones" && row.eligibleRank) {
    return `raw ${escapeHtml(row.eligibleRank)}`;
  }
  return escapeHtml(row.countingRank || "");
}

function eligibleRankCell(row) {
  if (row.stage === "Zones") {
    const pieces = [];
    if (row.eligibleRank) pieces.push(`eligible ${row.eligibleRank}`);
    if (row.attendingEligibleRank) pieces.push(`attending ${row.attendingEligibleRank}`);
    return pieces.join(" / ");
  }
  if (row.spotShifted || row.bumpIn) return "shifted";
  return "";
}

function statusBadge(row) {
  let className = "out";
  if (row.qualificationStatus.includes("qualifier") || row.qualificationStatus.includes("official list")) className = "qualifier";
  if (row.qualificationStatus.includes("15th average")) className = "average";
  if (row.qualificationStatus.includes("Non-displacing")) className = "non-displacing";
  if (row.qualificationStatus.includes("Non-qualifying")) className = "non-qual";
  if (row.qualificationStatus.includes("Declared not attending")) className = "decline";
  return `<span class="status ${className}">${escapeHtml(row.qualificationStatus)}</span>`;
}

function rowActionButtons(row) {
  const foreignNext = !(row.foreignDeclared || row.webpointNonUsEffective);
  const dualNext = !row.dualDeclared;
  const dualEffectNext = !row.dualOtherCountry;
  const notAttendingNext = !row.declaredNotAttending;
  return `
    <div class="row-actions">
      <button class="secondary-button" type="button" data-row-override="foreign" data-override-value="${foreignNext}" data-row-id="${escapeAttr(row.id)}" data-note="Foreign athlete row toggle">${foreignNext ? "Foreign" : "Not foreign"}</button>
      <button class="secondary-button" type="button" data-row-override="dual" data-override-value="${dualNext}" data-row-id="${escapeAttr(row.id)}" data-note="Dual citizen row toggle">${dualNext ? "Dual" : "No dual"}</button>
      <button class="secondary-button" type="button" data-row-override="dualEffect" data-override-value="${dualEffectNext}" data-row-id="${escapeAttr(row.id)}" data-note="Dual competed for another federation toggle">${dualEffectNext ? "Dual effect" : "No effect"}</button>
      <button class="secondary-button" type="button" data-row-override="notAttending" data-override-value="${notAttendingNext}" data-row-id="${escapeAttr(row.id)}" data-note="Declared not attending">${notAttendingNext ? "Not attending" : "Attending"}</button>
    </div>
  `;
}

function bumpCell(row) {
  const lines = [];
  if (row.bumpIn) lines.push("Bumped into top 15/drop-down");
  if (row.spotShifted && !row.bumpIn) lines.push("Counting rank shifted");
  if (row.openedSpot) lines.push("Opened a Zone spot");
  if (row.declaredNotAttending) lines.push("Declared not attending");
  if (row.juniorNationalStatus) lines.push(`Junior Nationals: ${row.juniorNationalStatus}`);
  if (row.officialAverageScoreQualifier && !row.top15Qualifier) lines.push("Meets official 15th average");
  if (row.officialThresholdScore != null) lines.push(`15th avg: ${formatScore(row.officialThresholdScore)}`);
  if (row.bumpedBy && row.bumpedBy.length) {
    lines.push(`By: ${row.bumpedBy.map((item) => `${item.athlete} (${item.reason})`).join("; ")}`);
  }
  if (row.openedFor && row.openedFor.length) {
    lines.push(`For: ${row.openedFor.map((item) => `${item.athlete} rank ${item.countingRank}`).join("; ")}`);
  }
  return lines.length ? lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("") : "";
}

function flagPills(row) {
  const pills = [];
  if (row.foreignDeclared) pills.push(pill("Foreign", "foreign"));
  if (row.webpointNonUsEffective && !row.foreignDeclared) pills.push(pill("Webpoint non-US", "foreign"));
  if (row.dualDeclared) pills.push(pill(row.dualOtherCountry ? "Dual effect" : "Dual", "dual"));
  if (row.hps) pills.push(pill("HPS", "hps"));
  if (row.ymca) pills.push(pill("YMCA", "ymca"));
  if (row.prequalified) pills.push(pill("Prequalified", "preq"));
  if (row.declaredNotAttending) pills.push(pill("Not attending", "decline"));
  if (row.bumpIn) pills.push(pill("Bump in", "bump"));
  if (row.reviewFlags && row.reviewFlags.length) pills.push(pill("Review", "review"));
  return `<div class="pill-list">${pills.join("")}</div>`;
}

function pillList(labels) {
  return `<div class="pill-list">${labels.map((label) => pill(label, pillClass(label))).join("")}</div>`;
}

function pill(label, className) {
  return `<span class="pill ${className}">${escapeHtml(label)}</span>`;
}

function pillClass(label) {
  const lower = String(label).toLowerCase();
  if (lower.includes("foreign") || lower.includes("non-us")) return "foreign";
  if (lower.includes("dual")) return "dual";
  if (lower.includes("hps")) return "hps";
  if (lower.includes("ymca")) return "ymca";
  if (lower.includes("prequalified")) return "preq";
  if (lower.includes("not attending") || lower.includes("decline")) return "decline";
  if (lower.includes("bump") || lower.includes("average")) return "bump";
  return "review";
}

function prequalificationCell(row) {
  if (!row.prequalification.length) return "";
  return row.prequalification.map((item) => `<div>${escapeHtml(item)}</div>`).join("");
}

function notesCell(row) {
  const notes = [];
  if (row.nonDisplacingReason) notes.push(row.nonDisplacingReason);
  if (row.dualDeclared) notes.push(`Dual: ${row.dualSportNationalityStatus}`);
  if (row.reviewFlags && row.reviewFlags.length) notes.push(`Review: ${row.reviewFlags.join("; ")}`);
  if (row.overrideNotes && row.overrideNotes.length) notes.push(`Overrides: ${row.overrideNotes.join("; ")}`);
  if (row.foreignDeclarationDetail) notes.push(row.foreignDeclarationDetail);
  return notes.map((note) => `<div>${escapeHtml(note)}</div>`).join("");
}

function rowClass(row) {
  const classes = [];
  if (row.foreignDeclared || row.webpointNonUsEffective) classes.push("has-foreign");
  if (row.dualDeclared) classes.push("has-dual");
  if (row.prequalified) classes.push("has-preq");
  if (row.declaredNotAttending) classes.push("has-decline");
  return classes.join(" ");
}

function copyCurrentTsv() {
  const text = exportRows("\t");
  navigator.clipboard.writeText(text).then(
    () => {
      elements.rowCount.textContent = "Copied current view as TSV.";
    },
    () => {
      elements.rowCount.textContent = "Clipboard copy was blocked by the browser.";
    }
  );
}

function downloadCurrentCsv() {
  const text = exportRows(",");
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `junior-results-${state.view}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportRows(delimiter) {
  const rows = currentRowsForView();
  const headers =
    state.view === "athletes"
      ? ["Athlete", "DiveMeetsID", "Teams", "Events", "Advancing", "NonDisplacing", "BumpIns", "Flags", "Prequalification"]
      : state.view === "overrides"
      ? ["Active", "Type", "Value", "Athlete", "DiveMeetsID", "Event", "Note", "CreatedAt"]
      : ["Stage", "Meet", "Event", "Place", "CountingRank", "EligibleRank", "AttendingEligibleRank", "Athlete", "DiveMeetsID", "Team", "Score", "QualificationStatus", "DeclaredNotAttending", "Flags", "NonDisplacingReason", "BumpedBy", "Official15thAverage", "OverrideNotes"];
  const lines = [headers.join(delimiter)];
  rows.forEach((row) => {
    const values =
      state.view === "athletes"
        ? [row.athlete, row.diveMeetsId, row.teams.join("; "), row.events, row.advancing, row.nonDisplacing, row.bumpIns, row.flags.join("; "), row.prequalification.join("; ")]
        : state.view === "overrides"
        ? [row.active ? "Yes" : "No", overrideTypeLabel(row.type), row.value ? "On" : "Off", row.athleteName, row.athleteId, row.eventName || "All events", row.note, row.createdAt]
        : [row.stage, row.meetName, row.eventName, row.place, row.countingRank, row.eligibleRank, row.attendingEligibleRank, row.athlete, row.diveMeetsId, row.team, row.score, row.qualificationStatus, row.declaredNotAttending ? "Yes" : "No", row.flags.join("; "), row.nonDisplacingReason, (row.bumpedBy || []).map((item) => item.athlete).join("; "), row.officialThresholdScore, (row.overrideNotes || []).join("; ")];
    lines.push(values.map((value) => exportValue(value, delimiter)).join(delimiter));
  });
  return lines.join("\n");
}

function exportValue(value, delimiter) {
  const text = value == null ? "" : String(value);
  if (delimiter === "\t") return text.replace(/\t/g, " ").replace(/\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatScore(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

init();
