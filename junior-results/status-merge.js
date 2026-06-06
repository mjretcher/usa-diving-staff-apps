/*
  Junior Circuit live status merge
  --------------------------------
  Runs after ../data/junior-data.js and ../data/junior-athlete-status.js,
  before main.js. This keeps the existing dashboard as the source of truth by
  applying canonical athlete status flags to live result rows before the normal
  Article 303-306 recompute logic runs.

  Guardrails:
  - dualOtherCountry is activated only by staff approval.
  - unmatched status records are stored for review, not injected into event tables.
*/
(function mergeJuniorAthleteStatus() {
  const data = window.JUNIOR_RESULTS_DATA;
  const source = window.USAD_JUNIOR_ATHLETE_STATUS;
  if (!data || !source || !Array.isArray(data.results)) return;

  const headers = Array.isArray(source.headers) ? source.headers : [];
  const records = Array.isArray(source.records)
    ? source.records.map(row => Object.fromEntries(headers.map((key, idx) => [key, row[idx]])))
    : [];

  const conflictHeaders = Array.isArray(source.conflictHeaders) ? source.conflictHeaders : [];
  const conflicts = Array.isArray(source.conflicts)
    ? source.conflicts.map(row => Object.fromEntries(conflictHeaders.map((key, idx) => [key, row[idx]])))
    : [];

  const normalizeId = value => String(value == null ? '' : value).trim();
  const normalizeName = value => String(value == null ? '' : value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const byDiveMeetsId = new Map();
  const byUsaDivingId = new Map();
  const byName = new Map();
  const conflictsByDiveMeetsId = new Map();
  const conflictsByName = new Map();

  records.forEach(record => {
    record.foreignDeclared = Boolean(record.foreignDeclared);
    record.dualDeclared = Boolean(record.dualDeclared);
    record.dualOtherCountry = Boolean(record.dualOtherCountry);
    record.hps = Boolean(record.hps);
    record.ymca = Boolean(record.ymca);
    const dm = normalizeId(record.diveMeetsId);
    const usad = normalizeId(record.usaDivingId);
    const nm = normalizeName(record.name);
    record._statusKey = dm || (usad ? `usad:${usad}` : `name:${nm}`);
    if (dm) byDiveMeetsId.set(dm, record);
    if (usad) byUsaDivingId.set(usad, record);
    if (nm) {
      if (!byName.has(nm)) byName.set(nm, []);
      byName.get(nm).push(record);
    }
  });

  conflicts.forEach(conflict => {
    const dm = normalizeId(conflict.diveMeetsId);
    const nm = normalizeName(conflict.athlete);
    if (dm) {
      if (!conflictsByDiveMeetsId.has(dm)) conflictsByDiveMeetsId.set(dm, []);
      conflictsByDiveMeetsId.get(dm).push(conflict);
    }
    if (nm) {
      if (!conflictsByName.has(nm)) conflictsByName.set(nm, []);
      conflictsByName.get(nm).push(conflict);
    }
  });

  const singleNameMatches = new Map(
    [...byName.entries()].filter(([, matches]) => matches.length === 1).map(([name, matches]) => [name, matches[0]])
  );

  function findRecord(row) {
    const dm = normalizeId(row.diveMeetsId || row.diver_id || row.diverId);
    if (dm && byDiveMeetsId.has(dm)) return byDiveMeetsId.get(dm);
    const usad = normalizeId(row.usaDivingId || row.usadId || row.memberId);
    if (usad && byUsaDivingId.has(usad)) return byUsaDivingId.get(usad);
    const nm = normalizeName(row.athlete || [row.first, row.last].filter(Boolean).join(' '));
    if (nm && singleNameMatches.has(nm)) return singleNameMatches.get(nm);
    return null;
  }

  function rowConflicts(row) {
    const dm = normalizeId(row.diveMeetsId || row.diver_id || row.diverId);
    const nm = normalizeName(row.athlete || [row.first, row.last].filter(Boolean).join(' '));
    return [
      ...(dm ? conflictsByDiveMeetsId.get(dm) || [] : []),
      ...(nm ? conflictsByName.get(nm) || [] : []),
    ];
  }

  function asArray(value) { return Array.isArray(value) ? value.slice() : []; }
  function appendUnique(items, value) {
    const text = String(value || '').trim();
    if (text && !items.includes(text)) items.push(text);
  }

  function applyRecordToRow(row, record) {
    row.statusRecord = { approval: record.approval || '', review: record.review || '', source: 'junior-athlete-status' };
    row.foreignDeclared = Boolean(row.foreignDeclared || record.foreignDeclared);
    row.dualDeclared = Boolean(row.dualDeclared || record.dualDeclared);
    row.hps = Boolean(row.hps || record.hps);
    row.ymca = Boolean(row.ymca || record.ymca);
    const explicitDataApproval = row.dualOtherCountryApproved === true || row.staffDualApproval === 'Approved - affects results';
    const staffApprovedDualEffect = record.dualOtherCountry === true && record.approval === 'Approved - affects results';
    row.dualOtherCountry = Boolean(explicitDataApproval || staffApprovedDualEffect);
    row.dualSportNationalityStatus = record.dualDeclared ? (record.approval || 'Pending staff approval') : (row.dualSportNationalityStatus || 'No declaration');
    return row;
  }

  function makeUnmatchedStatusRecord(record, idx) {
    const reviews = [];
    const notes = [];
    if (record.review) appendUnique(notes, record.review);
    if (record.dualDeclared && !record.dualOtherCountry) appendUnique(reviews, 'Dual citizen requires staff approval before affecting qualification');
    if (record.approval && record.approval !== 'N/A' && !String(record.approval).startsWith('Approved')) appendUnique(reviews, record.approval);
    if (record.foreignDeclared) appendUnique(notes, 'Foreign declaration has no matched result row');
    if (record.hps) appendUnique(notes, 'HPS list record has no matched result row in current stage');
    if (record.ymca) appendUnique(notes, 'YMCA champion list record has no matched result row in current stage');
    return {
      id: `StatusOnly|${record._statusKey || idx}`,
      statusOnly: true,
      athlete: record.name || record.diveMeetsId || `Status record ${idx + 1}`,
      diveMeetsId: record.diveMeetsId || '',
      usaDivingId: record.usaDivingId || '',
      foreignDeclared: Boolean(record.foreignDeclared),
      dualDeclared: Boolean(record.dualDeclared),
      dualOtherCountry: Boolean(record.dualOtherCountry && record.approval === 'Approved - affects results'),
      hps: Boolean(record.hps),
      ymca: Boolean(record.ymca),
      approval: record.approval || '',
      review: record.review || '',
      reviewFlags: reviews,
      sourceReviewNotes: notes,
      source: 'junior-athlete-status',
      qualificationStatus: 'Unmatched status record',
    };
  }

  const statusOnlyRecords = [];
  const matchedRecordIds = new Set();
  let matchedRows = 0;
  let reviewRows = 0;

  data.results = data.results.map(original => {
    const row = { ...original };
    const record = findRecord(row);
    const reviews = asArray(row.reviewFlags);
    const notes = asArray(row.sourceReviewNotes);
    const preMergeDualOtherCountry = Boolean(row.dualOtherCountry);
    const explicitDataApproval = row.dualOtherCountryApproved === true || row.staffDualApproval === 'Approved - affects results';
    row.dualOtherCountry = Boolean(explicitDataApproval);

    if (record) {
      matchedRows += 1;
      matchedRecordIds.add(record._statusKey || record.diveMeetsId || record.name);
      applyRecordToRow(row, record);
      if (record.review) appendUnique(notes, record.review);
      if (record.dualDeclared && !row.dualOtherCountry) appendUnique(reviews, 'Dual citizen requires staff approval before affecting qualification');
      if (record.approval && record.approval !== 'N/A' && !String(record.approval).startsWith('Approved')) appendUnique(reviews, record.approval);
      if (record.foreignDeclared) appendUnique(notes, 'Matched foreign athlete declaration');
      if (record.hps) appendUnique(notes, 'Matched HPS list');
      if (record.ymca) appendUnique(notes, 'Matched YMCA champion list');
    }

    const conflictsForRow = rowConflicts(row);
    if (conflictsForRow.length) {
      row.dataConflicts = conflictsForRow.map(conflict => ({ issueType: conflict.issueType || '', description: conflict.description || '', recommendedAction: conflict.recommendedAction || '' }));
      conflictsForRow.forEach(conflict => appendUnique(reviews, conflict.issueType || 'Data conflict'));
      conflictsForRow.forEach(conflict => appendUnique(notes, conflict.recommendedAction || conflict.description));
    }
    if (preMergeDualOtherCountry && !row.dualOtherCountry) appendUnique(reviews, 'Legacy dualOtherCountry suppressed pending staff approval');
    row.reviewFlags = reviews;
    row.sourceReviewNotes = notes;
    if (reviews.length) reviewRows += 1;
    return row;
  });

  records.forEach((record, idx) => {
    const key = record._statusKey || record.diveMeetsId || record.name;
    if (!matchedRecordIds.has(key)) statusOnlyRecords.push(makeUnmatchedStatusRecord(record, idx));
  });

  data.athleteStatusRecords = records;
  data.athleteStatusConflicts = conflicts;
  data.athleteStatusOnlyRecords = statusOnlyRecords;
  data.meta = data.meta || {};
  data.meta.athleteStatus = {
    ...(source.meta || {}),
    matchedResultRows: matchedRows,
    statusOnlyRecords: statusOnlyRecords.length,
    reviewResultRows: reviewRows,
    mergeRule: 'dualOtherCountry requires explicit staff approval; unmatched statuses remain review records and are not event rows',
  };
})();
