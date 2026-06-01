const DATA = window.JUNIOR_RESULTS_DATA || {
  meta: { counts: {} },
  stages: [],
  events: [],
  results: [],
  athletes: [],
  officialZoneQualifiers: [],
};

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
};

const eventById = new Map(DATA.events.map((event) => [event.id, event]));

function init() {
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
}

function renderHeader() {
  const counts = DATA.meta.counts || {};
  elements.headerSummary.innerHTML = [
    headerPill(counts.results || DATA.results.length, "result rows"),
    headerPill(counts.events || DATA.events.length, "events"),
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
  return DATA.results.filter((row) => {
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
  renderKpis();
  renderEventList();
  renderContext();
  renderTable();
}

function baseFilteredRows(options = {}) {
  const ignoreEvent = Boolean(options.ignoreEvent);
  const query = state.search.toLowerCase();
  return DATA.results.filter((row) => {
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
    ["Foreign", rows.filter((row) => row.foreignDeclared || row.webpointNonUs).length],
    ["Dual", rows.filter((row) => row.dualDeclared).length],
    ["Prequalified", rows.filter((row) => row.prequalified).length],
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
        row.webpointNonUs ||
        row.dualDeclared ||
        row.prequalified ||
        row.nonDisplacing ||
        (row.reviewFlags && row.reviewFlags.length)
    );
  }
  if (state.view === "athletes") {
    return buildFilteredAthletes(rows);
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
    "Athlete",
    "Team",
    "Score",
    "Qualification",
    "Bump / Spot",
    "Flags",
    "Prequalified to",
    "Notes",
  ];
  const body = rows
    .map(
      (row) => `
        <tr class="${rowClass(row)}">
          <td class="mono">${escapeHtml(row.place || "")}</td>
          <td class="mono">${escapeHtml(row.countingRank || "")}</td>
          <td>${athleteCell(row)}</td>
          <td>${escapeHtml(row.team || "")}</td>
          <td class="mono">${formatScore(row.score)}</td>
          <td>${statusBadge(row)}</td>
          <td>${bumpCell(row)}</td>
          <td>${flagPills(row)}</td>
          <td>${prequalificationCell(row)}</td>
          <td>${notesCell(row)}</td>
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

function statusBadge(row) {
  let className = "out";
  if (row.qualificationStatus.includes("top 15") || row.qualificationStatus.includes("official list")) className = "qualifier";
  if (row.qualificationStatus.includes("15th average")) className = "average";
  if (row.qualificationStatus.includes("Non-displacing")) className = "non-displacing";
  if (row.qualificationStatus.includes("Non-qualifying")) className = "non-qual";
  return `<span class="status ${className}">${escapeHtml(row.qualificationStatus)}</span>`;
}

function bumpCell(row) {
  const lines = [];
  if (row.bumpIn) lines.push("Bumped into top 15/drop-down");
  if (row.spotShifted && !row.bumpIn) lines.push("Counting rank shifted");
  if (row.openedSpot) lines.push("Opened a Zone spot");
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
  if (row.webpointNonUs && !row.foreignDeclared) pills.push(pill("Webpoint non-US", "foreign"));
  if (row.dualDeclared) pills.push(pill("Dual", "dual"));
  if (row.hps) pills.push(pill("HPS", "hps"));
  if (row.ymca) pills.push(pill("YMCA", "ymca"));
  if (row.prequalified) pills.push(pill("Prequalified", "preq"));
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
  if (row.foreignDeclarationDetail) notes.push(row.foreignDeclarationDetail);
  return notes.map((note) => `<div>${escapeHtml(note)}</div>`).join("");
}

function rowClass(row) {
  const classes = [];
  if (row.foreignDeclared || row.webpointNonUs) classes.push("has-foreign");
  if (row.dualDeclared) classes.push("has-dual");
  if (row.prequalified) classes.push("has-preq");
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
      : ["Stage", "Meet", "Event", "Place", "CountingRank", "Athlete", "DiveMeetsID", "Team", "Score", "QualificationStatus", "Flags", "NonDisplacingReason", "BumpedBy", "Official15thAverage"];
  const lines = [headers.join(delimiter)];
  rows.forEach((row) => {
    const values =
      state.view === "athletes"
        ? [row.athlete, row.diveMeetsId, row.teams.join("; "), row.events, row.advancing, row.nonDisplacing, row.bumpIns, row.flags.join("; "), row.prequalification.join("; ")]
        : [row.stage, row.meetName, row.eventName, row.place, row.countingRank, row.athlete, row.diveMeetsId, row.team, row.score, row.qualificationStatus, row.flags.join("; "), row.nonDisplacingReason, (row.bumpedBy || []).map((item) => item.athlete).join("; "), row.officialThresholdScore];
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
