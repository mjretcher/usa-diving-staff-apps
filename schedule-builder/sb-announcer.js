/* ═══════════════════════════════════════════════════════════════════════
   FINALS ANNOUNCER SCRIPT  (Junior finals walk-outs)
   ───────────────────────────────────────────────────────────────────────
   Junior finals do not run on the broadcast clock (that is sb-broadcast.js,
   Senior only). They run like this, every time:

     warm-up as scheduled
       → CLOSE / CLEAR THE BOARDS, line the finalists up
       → short welcome
       → National Anthem (one per championship, length varies — Mike sets it)
       → athlete introductions, ONE EVENT AT A TIME, read in DIVE ORDER
       → hold messaging while the athletes get ready
       → "Judges, the pool is yours" — each table takes its event

   EVENT ORDER IS FIXED AND NON-NEGOTIABLE: 3-METER, then TOWER (platform),
   then 1-METER. An event that is not in this finals session is simply
   dropped from the sequence — no placeholder, no empty heading.

   DIVE ORDER IS TYPED IN BY HAND. The meet management software that produces
   the order is not networked, so there is no feed to read. Mike pastes the
   order per event; this module numbers it, resolves each athlete's club from
   the DiveMeets entrant list already in Neon, and flags anything it could not
   match rather than guessing.

   The output is one thing: a printed script Mike reads from at the mic.
   Everything else here exists to make that page correct.
═══════════════════════════════════════════════════════════════════════ */

// ── ELIGIBILITY ───────────────────────────────────────────────────────
// Junior finals only. Senior finals belong to the broadcast run-of-show,
// which already presents athletes on its own clock; running both would put
// two intro blocks in one session.
function annIsJuniorish(sess, ev) {
  if (/^senior/i.test(ev.level || '')) return false;
  if (ev.round === 'Qualifier' || /qualifier/i.test(ev.level || '')) return false;
  try { if (typeof sessTags === 'function' && sessTags(sess).includes('senior')) return false; } catch (e) { }
  return true;
}
function annIsFinalEv(sess, ev) {
  if (!ev || ev.style === 'Custom Block') return false;
  if (ev.round !== 'Final') return false;
  return annIsJuniorish(sess, ev);
}
function annSessHasFinals(sess) {
  if (!sess || sess.isPractice) return false;
  return (sess.events || []).some(e => annIsFinalEv(sess, e));
}
function annOn(sess) {
  return Boolean(sess && sess.announcer && sess.announcer.on && annSessHasFinals(sess));
}

// ── EVENT ORDER: 3-METER → TOWER → 1-METER ────────────────────────────
const ANN_APP_RANK = { '3-Meter': 0, 'Platform': 1, '10-Meter': 1, '10m': 1, '1-Meter': 2 };
function annAppRank(a) { return ANN_APP_RANK[a] != null ? ANN_APP_RANK[a] : 3; }
// Stable sort by apparatus rank; events sharing an apparatus keep the order
// they sit in on the schedule, which is the order the tables expect.
function annEvents(sess) {
  const evs = (sess.events || []).filter(e => annIsFinalEv(sess, e));
  return evs
    .map((ev, i) => ({ ev, i }))
    .sort((a, b) => (annAppRank(a.ev.apparatus) - annAppRank(b.ev.apparatus)) || (a.i - b.i))
    .map(x => x.ev);
}

// ── DEFAULTS ──────────────────────────────────────────────────────────
const ANN_DEFAULTS = {
  on: false,
  boardsCloseMin: 3,      // clear the boards and line the finalists up
  welcomeSec: 45,
  anthemOn: true,
  anthemSec: 90,          // Mike sets this per championship
  leadInSec: 12,          // "We begin with the …" + floor check, per event
  perAthleteSec: 12,      // reading one name + club, at walk-out pace
  closeSec: 10,           // "Please join us in recognizing …", per event
  holdOn: true,
  notes: '',              // anything extra to read in this one session
  order: {},              // { [evId]: pasted dive order text }
  clubs: {},              // { [evId]: { [rowIndex]: "typed club override" } }
};
function annCfg(sess) {
  return Object.assign({}, ANN_DEFAULTS, (sess && sess.announcer) || {});
}

// Meet-level script copy. Lives on S.meet so it is written once per
// championship and rides along with every cloud save.
const ANN_MEET_DEFAULTS = {
  welcome: 'On behalf of USA Diving, welcome to {venue}. We are excited to recognize today\'s finalists and begin an outstanding afternoon of championship diving.',
  anthemLead: 'Please rise, if you are able, and remove your hats for the playing of our National Anthem.',
  introLead: 'We now invite you to turn your attention to the pool as we introduce today\'s finalists. Athletes will be presented in the dive order provided for each event, beginning with No. 1.',
  primaryMsg: 'Today\'s finals are being livestreamed free on the official USA Diving YouTube channel. Friends, families, and fans can also follow live scoring by visiting DiveMeets.com and selecting Live Results. Please silence your cell phones and refrain from using flash photography while athletes are on the boards or platform.',
  hold1: 'Action Shots Photography is the exclusive photography provider for these championships. To learn about professional photo packages for upcoming sessions, visit the Action Shots booth upstairs. Pre-orders must be placed at least 30 minutes before the start of an athlete\'s competition session.',
  hold2: 'A special thank you to our judges, volunteers, medical staff, meet personnel, the venue staff, and everyone helping make these championships possible.',
  handoff: 'Congratulations to all of today\'s finalists. We wish each of you the very best of luck.',
};
// The morning read. Same shape of thing as the finals copy above: written
// once per championship, stored on S.meet, editable, token-filled.
const ANN_OPEN_DEFAULTS = {
  pWelcome: 'On behalf of USA Diving, welcome to {venue}. We are pleased to welcome our {divers}, coaches, judges, volunteers, families, and fans for another exciting {daypart} of championship competition.',
  pSport: 'Throughout the championships, we ask everyone to help us create a positive and respectful environment by demonstrating outstanding sportsmanship and supporting all of our athletes. Please remember to silence your cell phones during competition and refrain from using flash photography while athletes are on the boards or platform.',
  pStream: 'Today\'s competition is being livestreamed free on the official USA Diving YouTube channel. Friends, families, and fans can also follow live scoring throughout the championships by visiting DiveMeets.com and selecting Live Results.',
  pPhoto: 'A reminder that Action Shots Photography is the exclusive photography provider for the {meet}. If you would like professional photos of your diver, please visit the Action Shots booth located upstairs to pre-order your photography package. Pre-orders must be placed at least 30 minutes prior to the start of your athlete\'s competition session.',
  pThanks: 'A special thank you to our judges, volunteers, medical staff, meet personnel, the staff at {venue}, and everyone whose hard work has helped make these championships possible.',
  pGoodLuck: 'To all of our competitors, congratulations on earning your place at this national championship. We wish each of you the very best of luck in this {daypart}\'s {roundword} competition.',
};
function annMeetCfg() {
  return Object.assign({}, ANN_MEET_DEFAULTS, ANN_OPEN_DEFAULTS, (S.meet && S.meet.paScript) || {});
}
// Tokens: {venue} {meet} {city} always; {divers} {daypart} {roundword} when a
// session context is supplied. Everything else is literal.
// The meet's venue field usually already ends with the city ("... at Mylan
// Park, Morgantown, WV"), which makes "welcome to {venue}" read twice over and
// "the staff at {venue}" read badly. Strip the trailing city when it is
// literally the meet's own city string, so {venue} is the building and {city}
// is the city.
function annVenue() {
  const v = String((S.meet && S.meet.venue) || '').trim();
  const c = String((S.meet && S.meet.city) || '').trim();
  if (!v) return 'the competition venue';
  if (c && v.toLowerCase().endsWith((', ' + c).toLowerCase())) return v.slice(0, v.length - c.length - 2).trim();
  return v;
}
function annFill(tpl, ctx) {
  ctx = ctx || {};
  return String(tpl || '')
    .replace(/\{venue\}/g, annVenue())
    .replace(/\{meet\}/g, (S.meet && S.meet.name) || 'these championships')
    .replace(/\{city\}/g, (S.meet && S.meet.city) || '')
    .replace(/\{divers\}/g, ctx.divers || 'divers')
    .replace(/\{daypart\}/g, ctx.daypart || 'session')
    .replace(/\{roundword\}/g, ctx.roundword || 'competition');
}

/* ═══════════════════════════════════════════════════════════════════════
   DIVE ORDER SHEET IMPORT  (DiveMeets printed PDF → dive order)
   ───────────────────────────────────────────────────────────────────────
   The meet software prints the order to PDF and those land on a shared
   drive. Filenames are typed by whoever ran the report, so they are NOT
   trusted for anything — the event identity is read out of the sheet's own
   header line, which the software writes:

       ( 30650) Group A Boys 3m (16-18)  Prelim

   Text is extracted with coordinates and regrouped into visual lines,
   because a PDF stores glyph runs, not rows. Grouping is greedy on the
   vertical gap: the order number and the name sit ~0.9pt apart and belong
   together, while a name and the dive-code row below it are ~9pt apart.

   A diver row is "<number> <name>". Dive-code rows ("403B 201B …") and
   degree-of-difficulty rows ("2.1 1.8 …") cannot match that shape, because
   the leading integer in those rows is never followed by a space.

   The sheet states its own count ("Total Divers for board : 19"), which is
   used as an integrity check — if what we parsed does not equal what the
   sheet says, the import is reported as failed rather than half-loaded.
═══════════════════════════════════════════════════════════════════════ */

// Items are {str, x, y} with y increasing DOWNWARD (the pdf.js adapter flips).
function annLinesFromItems(items, gap) {
  gap = gap || 4;
  const its = items.filter(i => String(i.str || '').trim()).slice().sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  let cur = null;
  for (const it of its) {
    if (!cur || Math.abs(it.y - cur.y) > gap) { cur = { y: it.y, parts: [it] }; lines.push(cur); }
    else cur.parts.push(it);
  }
  return lines.map(l => ({
    y: l.y,
    text: l.parts.slice().sort((a, b) => a.x - b.x).map(p => String(p.str).trim()).join(' ').replace(/\s+/g, ' ').trim(),
  }));
}

const ANN_APP_FROM_SHEET = { '1m': '1-Meter', '1 m': '1-Meter', '3m': '3-Meter', '3 m': '3-Meter', '10m': 'Platform', '10 m': 'Platform', 'platform': 'Platform', 'tower': 'Platform' };
const ANN_ROUND_FROM_SHEET = { prelim: 'Prelim', preliminary: 'Prelim', final: 'Final', finals: 'Final', semifinal: 'Semifinal', semi: 'Semifinal', quarterfinal: 'Prelim', qualifier: 'Qualifier', qualifying: 'Qualifier' };

// "( 30650 ) Group A Boys 3m (16-18)  Prelim"
function annParseSheetHeader(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  const idm = t.match(/^\(\s*(\d+)?\s*\)\s*(.+)$/);
  if (!idm) return null;
  const dmEventId = idm[1] || '';
  let rest = idm[2].trim();
  const m = rest.match(/^(.*?)\s+(Boys|Girls|Men|Women|Mixed)\s+(1\s?m|3\s?m|10\s?m|Platform|Tower)\b\s*(?:\(([^)]*)\))?\s*(.*)$/i);
  if (!m) return null;
  const tail = (m[5] || '').trim();
  let round = '';
  for (const w of tail.split(/[\s,]+/)) {
    const k = ANN_ROUND_FROM_SHEET[w.toLowerCase()];
    if (k) { round = k; break; }
  }
  return {
    dmEventId,
    level: m[1].trim(),
    gender: m[2].replace(/^./, c => c.toUpperCase()).toLowerCase().replace(/^./, c => c.toUpperCase()),
    apparatus: ANN_APP_FROM_SHEET[m[3].toLowerCase()] || m[3],
    ageTag: (m[4] || '').trim(),
    round,
    synchro: /synchro/i.test(rest),
    raw: t,
  };
}

// "1 Rydan Russell"  /  "1 Noah Horwitz (RipFest)"
function annParseDiverLine(text) {
  const m = String(text || '').match(/^(\d{1,3})\s+(\S.*)$/);
  if (!m) return null;
  let rest = m[2].trim();
  if (!/[A-Za-z]{2}/.test(rest)) return null;
  // Split the club off FIRST. Clubs legitimately carry numbers - "Dive 2000
  // Club", "5280 Diving" - so the numeric sanity check below has to be applied
  // to the athlete's name alone or it throws the whole diver away.
  let club = '';
  const p = rest.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (p) { rest = p[1].trim(); club = p[2].trim(); }
  if (!/[A-Za-z]{2}/.test(rest)) return null;
  // A row of dive codes or DDs can never reach here (no space after the
  // leading integer), but a name is still never mostly digits.
  if ((rest.match(/\d/g) || []).length > 2) return null;
  return { no: Number(m[1]), name: rest.replace(/\s+/g, ' '), club };
}

function annParseSheetLines(lines) {
  const out = { meta: null, boards: [], warnings: [] };
  let board = null;
  const newBoard = (name) => { board = { name: name || '', rows: [], expected: null }; out.boards.push(board); return board; };
  for (const ln of lines) {
    const t = ln.text;
    if (!t) continue;
    if (/^\(/.test(t)) { const h = annParseSheetHeader(t); if (h) { out.meta = out.meta || h; continue; } }
    const bm = t.match(/^Board\s+(\S.*)$/i);
    if (bm) { newBoard(bm[1].trim()); continue; }
    const tm = t.match(/^Total\s+Divers\s+for\s+board\s*:?\s*(\d+)/i);
    if (tm) { if (!board) newBoard(''); board.expected = Number(tm[1]); continue; }
    if (/^(www\.|Page\b|Meet Sponsored|Hosted by|Cuts start|Contact the Meet)/i.test(t)) continue;
    const d = annParseDiverLine(t);
    if (d) { if (!board) newBoard(''); board.rows.push(d); }
  }
  return out;
}

// Flatten to a single ordered list. Boards are separate lanes of the same
// event; a finals field small enough to introduce runs on one board, but if a
// sheet does come through with two, they are concatenated in printed order
// and renumbered so the announcer reads 1..n straight down.
function annSheetToOrder(parsed) {
  const rows = [];
  const problems = [];
  parsed.boards.forEach(b => {
    const who = b.name ? `Board ${b.name}` : 'This sheet';
    if (b.expected != null && b.expected !== b.rows.length) {
      problems.push(`${who}: the sheet says ${b.expected} divers but ${b.rows.length} were read.`);
    }
    // Prelim sheets declare their own total; finals sheets do not. What both
    // always carry is the printed order number, which must run 1..n with no
    // gap and no repeat. A gap means a diver line was not read.
    const seq = b.rows.map(r => r.no);
    const bad = seq.findIndex((n, i) => n !== i + 1);
    if (seq.length && bad >= 0) {
      problems.push(`${who}: the printed order reads ${seq.join(', ')} — expected 1 to ${seq.length}, so a diver line was missed or read twice.`);
    }
    b.rows.forEach(r => rows.push(Object.assign({ board: b.name }, r)));
  });
  return { rows: rows.map((r, i) => Object.assign({}, r, { no: i + 1 })), problems, boards: parsed.boards.length };
}


// ── pdf.js LOADER ─────────────────────────────────────────────────────
// Loaded on demand, not on every page view — most sessions never import a
// sheet. Several CDNs are tried so one blocked host is not fatal.
const ANN_PDFJS_SRCS = [
  ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'],
  ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
  ['https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js', 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
];
function annLoadScript(src) {
  return new Promise((res, rej) => {
    const el = document.createElement('script');
    el.src = src; el.onload = res; el.onerror = () => rej(new Error('blocked: ' + src));
    document.head.appendChild(el);
  });
}
async function annPdfLib() {
  if (window.pdfjsLib) return window.pdfjsLib;
  let last = null;
  for (const [lib, worker] of ANN_PDFJS_SRCS) {
    try {
      await annLoadScript(lib);
      if (window.pdfjsLib) { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = worker; } catch (e) { } return window.pdfjsLib; }
    } catch (e) { last = e; }
  }
  throw new Error('Could not load the PDF reader' + (last ? ' (' + last.message + ')' : '') + '. Check the internet connection and try again.');
}

// A PDF stores glyph runs, not rows. Flip to a top-down y so line grouping
// reads the way the page does, then regroup per page in printed order.
async function annPdfSheetLines(file) {
  const lib = await annPdfLib();
  const buf = await file.arrayBuffer();
  const doc = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
  let lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items.map(i => ({ str: i.str, x: i.transform[4], y: vp.height - i.transform[5] }));
    lines = lines.concat(annLinesFromItems(items));
  }
  try { doc.destroy(); } catch (e) { }
  return lines;
}

// ── MATCHING A SHEET TO AN EVENT IN THIS SESSION ──────────────────────
// Filenames are typed by whoever ran the report, so they are ignored
// entirely. Identity comes from the sheet's own header.
function annMatchSheetToEvent(sess, meta) {
  if (!meta) return null;
  const want = annEvKey(meta.level, meta.gender, meta.apparatus);
  const cand = annEvents(sess).filter(ev => annEvMatchKey(ev) === want);
  return cand.length === 1 ? cand[0] : null;
}

// ── IMPORT ────────────────────────────────────────────────────────────
// Imported rows are written back into the same text box you can type in, as
// "N <tab> Name <tab> Club". There is deliberately no parallel data path:
// one source of truth, hand-editable after import, and the club lookup and
// review table downstream are unchanged.
function annOrderToText(rows) {
  return rows.map(r => `${r.no}\t${r.name}${r.club ? '\t' + r.club : ''}`).join('\n');
}
function annSetImport(sessId, evId, rec) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const a = annEnsure(sess); a.imports = a.imports || {}; a.imports[evId] = rec;
  });
}
async function annImportFiles(sessId, fileList) {
  const files = Array.from(fileList || []).filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  if (!files.length) { UI.annImport = { busy: false, log: [{ ok: false, msg: 'That was not a PDF. Drop the printed dive order sheet.' }] }; render(); return; }
  const sess = S.sessions.find(x => x.id === sessId);
  if (!sess) return;
  UI.annImport = { busy: true, log: [] };
  render();
  const log = [];
  for (const f of files) {
    try {
      const lines = await annPdfSheetLines(f);
      const parsed = annParseSheetLines(lines);
      if (!parsed.meta) { log.push({ ok: false, msg: `${f.name}: could not find the event line on this sheet. Is it a DiveMeets dive order printout?` }); continue; }
      const m = parsed.meta;
      const label = `${m.level} ${m.gender} ${m.apparatus}${m.round ? ' ' + m.round : ''}`;
      const ev = annMatchSheetToEvent(sess, m);
      if (!ev) {
        log.push({ ok: false, msg: `${f.name}: this sheet is ${label}, which is not a finals event in this session (${annEvents(sess).map(evName).join(', ') || 'none'}).` });
        continue;
      }
      const ord = annSheetToOrder(parsed);
      if (!ord.rows.length) { log.push({ ok: false, msg: `${f.name}: no divers were found on this sheet.` }); continue; }
      if (ord.problems.length) { log.push({ ok: false, msg: `${f.name}: ${ord.problems.join(' ')} Nothing was loaded — send this file over rather than trusting a partial read.` }); continue; }
      setAnnOrder(sessId, ev.id, annOrderToText(ord.rows));
      // A prior hand-typed club override would silently outrank the sheet.
      upd(s => { const ss = s.sessions.find(x => x.id === sessId); if (ss && ss.announcer && ss.announcer.clubs) delete ss.announcer.clubs[ev.id]; });
      const roundWarn = m.round && ev.round && m.round !== ev.round;
      const sched = Number(ev.numberOfDivers || 0);
      annSetImport(sessId, ev.id, {
        file: f.name, label, at: new Date().toISOString(), count: ord.rows.length,
        boards: ord.boards, dmEventId: m.dmEventId || '', roundWarn: roundWarn ? m.round : '',
        schedCount: sched && sched !== ord.rows.length ? sched : 0,
      });
      log.push({
        ok: true, warn: roundWarn,
        msg: `${evName(ev)} — ${ord.rows.length} divers read from ${f.name}${ord.boards > 1 ? ` (${ord.boards} boards merged)` : ''}.` +
          (roundWarn ? ` WARNING: this is the ${m.round} sheet, but the event here is the ${ev.round}.` : ''),
      });
    } catch (e) {
      log.push({ ok: false, msg: `${f.name}: ${e.message || 'could not be read'}` });
    }
  }
  UI.annImport = { busy: false, log };
  render();
}
function annPickFiles(input, sessId) { annImportFiles(sessId, input.files); input.value = ''; }
function annDropFiles(ev, sessId) {
  ev.preventDefault(); ev.stopPropagation();
  try { ev.currentTarget.classList.remove('ann-dz-over'); } catch (e) { }
  annImportFiles(sessId, ev.dataTransfer && ev.dataTransfer.files);
}
function annDragOver(ev) { ev.preventDefault(); ev.stopPropagation(); try { ev.currentTarget.classList.add('ann-dz-over'); } catch (e) { } }
function annDragLeave(ev) { try { ev.currentTarget.classList.remove('ann-dz-over'); } catch (e) { } }

// ── DIVE ORDER PARSING ────────────────────────────────────────────────
// Whatever the meet software prints, Mike is going to paste it. Accept:
//     1. Noah Horwitz
//     1) Noah Horwitz          RipFest
//     Noah Horwitz, RipFest
//     Noah Horwitz <TAB> RipFest
//     12  Noah Horwitz  RipFest  403.85
// The leading dive-order number is dropped (we renumber from 1 so the printed
// sheet is always 1..n with no gaps); a trailing score column is dropped; a
// club given on the line always wins over the entrant-list lookup.
// "Horwitz, Noah" -> "Noah Horwitz". Only fires on a single comma with one
// word ahead of it, so a genuinely comma-bearing club is never mangled.
function annFixName(nm) {
  const parts = String(nm || '').split(',').map(x => x.trim()).filter(Boolean);
  if (parts.length === 2 && parts[0].split(/\s+/).length === 1) return (parts[1] + ' ' + parts[0]).replace(/\s+/g, ' ').trim();
  return String(nm || '').trim();
}
function annParseOrder(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];
  for (let raw of lines) {
    let line = raw.replace(/\u00a0/g, ' ').trim();
    if (!line) continue;
    // Drop a leading order number: "1.", "1)", "1 -", "12 \u2013", "1"
    line = line.replace(/^\(?\d{1,3}\)?\s*[.):\-\u2013]?\s+/, '');
    if (!line) continue;
    // Drop a trailing numeric column (score / total) if one is present
    line = line.replace(/[\s\t]+\d{1,4}(?:\.\d{1,3})?\s*$/, '').trim();
    if (!line) continue;
    let name = line, club = '';
    // Unambiguous column separators only: tab, 3+ spaces, pipe, semicolon.
    let m = line.match(/^(.*?)\s*\t+\s*(.+)$/) ||
      line.match(/^(.*?)\s{3,}(.+)$/) ||
      line.match(/^(.*?)\s*[|;]\s*(.+)$/);
    if (m) { name = m[1].trim(); club = m[2].trim(); }
    // A comma is NOT a reliable name/club separator: meet software prints
    // "Horwitz, Noah" as often as staff type "Noah Horwitz, RipFest".
    // Tell them apart by the left side — a single word before the comma is a
    // surname, two or more words is a full name and the rest is the club.
    if (!m && name.indexOf(',') >= 0) {
      const parts = name.split(',').map(x => x.trim()).filter(Boolean);
      if (parts.length >= 2 && parts[0].split(/\s+/).length === 1) {
        name = (parts[1] + ' ' + parts[0]).replace(/\s+/g, ' ').trim();
        club = parts.slice(2).join(', ').trim();
      } else if (parts.length >= 2) {
        name = parts[0];
        club = parts.slice(1).join(', ').trim();
      }
    }
    name = annFixName(name);
    // A line that survived stripping but holds no letters was never an athlete
    // — a bare "1." from a numbered blank template, a stray dash, a page number.
    if (!name || !/[a-z]/i.test(name)) continue;
    out.push({ name, club, clubTyped: Boolean(club) });
  }
  return out;
}

// ── CLUB RESOLUTION FROM THE DIVEMEETS ENTRANT LIST ───────────────────
// Names are matched on a normalized form: lower case, accents folded,
// punctuation dropped, whitespace collapsed. A match must be unambiguous.
// If two entrants normalize to the same thing, or nothing matches, the club
// is left blank and flagged — a wrong club read out loud is worse than a
// blank Mike fills in by hand.
function annNorm(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
// "Horwitz, Noah" and "Noah Horwitz" are the same athlete. Build both keys.
function annNameKeys(s) {
  const n = annNorm(s);
  const keys = [n];
  const parts = n.split(' ');
  if (parts.length > 1) keys.push(parts.slice(1).concat(parts[0]).join(' '));
  return keys;
}
function annEntrantIndex() {
  const list = (UI.annEntrants && UI.annEntrants.rows) || [];
  const byName = new Map(), byEvent = new Map();
  for (const e of list) {
    const evKey = annEvKey(e.ageGroup, e.gender, e.discipline);
    for (const k of annNameKeys(e.name)) {
      // Track collisions so an ambiguous name is never auto-filled
      const prev = byName.get(k);
      if (prev && annNorm(prev.team) !== annNorm(e.team)) prev.ambiguous = true;
      else if (!prev) byName.set(k, { team: e.team, name: e.name, ambiguous: false });
      const ek = evKey + '::' + k;
      const prevE = byEvent.get(ek);
      if (prevE && annNorm(prevE.team) !== annNorm(e.team)) prevE.ambiguous = true;
      else if (!prevE) byEvent.set(ek, { team: e.team, name: e.name, ambiguous: false });
    }
  }
  return { byName, byEvent };
}
// annNorm() strips digits, which is correct for athlete names and WRONG for
// anything where the digit carries the meaning: "3-Meter" and "1-Meter" both
// normalize to "meter". Event identity uses this alphanumeric key instead.
function annKeyPart(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
function annEvKey(level, gender, apparatus) {
  return `${annKeyPart(level)}|${annKeyPart(gender)}|${isPlatform(apparatus) ? 'platform' : annKeyPart(apparatus)}`;
}
function annEvMatchKey(ev) { return annEvKey(ev.level, ev.gender, ev.apparatus); }
// Returns { club, source } where source is 'typed' | 'entries' | 'entries-meet' | ''
function annResolveClub(row, ev, idx) {
  if (row.clubTyped && row.club) return { club: row.club, source: 'typed' };
  const evKey = annEvMatchKey(ev);
  for (const k of annNameKeys(row.name)) {
    const hit = idx.byEvent.get(evKey + '::' + k);
    if (hit && !hit.ambiguous && hit.team) return { club: hit.team, source: 'entries' };
    if (hit && hit.ambiguous) return { club: '', source: 'ambiguous' };
  }
  for (const k of annNameKeys(row.name)) {
    const hit = idx.byName.get(k);
    if (hit && !hit.ambiguous && hit.team) return { club: hit.team, source: 'entries-meet' };
    if (hit && hit.ambiguous) return { club: '', source: 'ambiguous' };
  }
  return { club: '', source: '' };
}
// Manual per-row club override, keyed by event + row position.
function annClubOverride(sess, ev, i) {
  const c = annCfg(sess).clubs || {};
  const m = c[ev.id] || {};
  return m[String(i)] || '';
}
// The finished, print-ready roster for one event.
function annRoster(sess, ev, idx) {
  const c = annCfg(sess);
  const rows = annParseOrder((c.order || {})[ev.id] || '');
  return rows.map((r, i) => {
    const ov = annClubOverride(sess, ev, i);
    const res = ov ? { club: ov, source: 'typed' } : annResolveClub(r, ev, idx);
    return { no: i + 1, name: r.name, club: res.club, source: res.source };
  });
}

// ── ENTRANT LIST LOADING ──────────────────────────────────────────────
// Reuses the loader the Projections / Entry-sync panels already use, so
// there is exactly one query shape against junior_results.meet_entrants.
function annMeetIds() {
  const ids = [];
  const primary = S.meet && S.meet.divemeetsId ? String(S.meet.divemeetsId).trim() : '';
  if (primary) ids.push(primary);
  const extra = (S.meet && Array.isArray(S.meet.divemeetsSources)) ? S.meet.divemeetsSources : [];
  extra.forEach(s => { const v = s && s.id ? String(s.id).trim() : ''; if (v) ids.push(v); });
  if (!ids.length && typeof DEFAULT_DIVEMEETS_MEET_ID === 'string') ids.push(DEFAULT_DIVEMEETS_MEET_ID);
  return [...new Set(ids)];
}
async function annLoadEntrants(force) {
  if (UI.annEntrants && UI.annEntrants.loading) return;
  if (UI.annEntrants && UI.annEntrants.rows && !force) return;
  UI.annEntrants = { loading: true, rows: null, error: null };
  render();
  try {
    const ids = annMeetIds();
    const all = [];
    for (const id of ids) {
      try { (await loadMeetEntrantsForId(id)).forEach(r => all.push(r)); } catch (e) { }
    }
    UI.annEntrants = { loading: false, rows: all, error: all.length ? null : 'No entrant names found — type clubs in by hand.' };
  } catch (e) {
    UI.annEntrants = { loading: false, rows: [], error: e.message || 'Could not load entrant names' };
  }
  render();
}

// ── RUNDOWN + TIMING ──────────────────────────────────────────────────
// Absolute seconds from midnight, anchored to the END of warm-up. Every
// printed timestamp comes from here, so the script and the schedule can
// never drift apart.
function annSec(v) { const n = Math.round(Number(v) || 0); return n < 0 ? 0 : n; }
const annClock = sec => f12(Math.round(annSec(sec) / 60));
const annDur = sec => { sec = annSec(sec); const m = Math.floor(sec / 60), s = sec % 60; return m ? (s ? `${m}m ${s}s` : `${m}m`) : `${s}s`; };

function annRows(sess) {
  const evs = annEvents(sess);
  if (!evs.length) return null;
  const c = annCfg(sess);
  const t = sess.timing || calcSessTiming(sess);
  const idx = annEntrantIndex();
  const rows = [];
  let at = annSec(t.warmupEndMinutes * 60);

  const push = (kind, label, durSec, extra) => {
    const r = Object.assign({ kind, label, startSec: at, durSec: annSec(durSec) }, extra || {});
    r.endSec = r.startSec + r.durSec;
    rows.push(r); at = r.endSec;
    return r;
  };

  rows.push({
    kind: 'warmup', label: 'Athlete warm-up', startSec: annSec(t.warmupStartMinutes * 60),
    endSec: annSec(t.warmupEndMinutes * 60), durSec: annSec((t.warmupEndMinutes - t.warmupStartMinutes) * 60),
  });
  push('boardsclose', 'Close the boards — line up the finalists', Number(c.boardsCloseMin || 0) * 60);
  push('welcome', 'Short welcome', c.welcomeSec);
  if (c.anthemOn) push('anthem', 'National Anthem', c.anthemSec);

  evs.forEach((ev, i) => {
    const roster = annRoster(sess, ev, idx);
    const n = roster.length;
    push('intro', evName(ev) + ' Final', Number(c.leadInSec || 0) + n * Number(c.perAthleteSec || 0) + Number(c.closeSec || 0), {
      ev, evName: evName(ev), roster, divers: n, seq: i + 1, first: i === 0,
    });
  });

  const introsEnd = at;
  const eventStart = annSec(t.eventStartMinutes * 60);
  // When the schedule leaves no room between warm-up and the first dive, the
  // handoff still has to read AFTER the introductions on the page. Clamping it
  // keeps the printed order truthful; the fit warning is what tells Mike the
  // schedule needs more intro time.
  const handoff = Math.max(eventStart, introsEnd);
  push('hold', 'Final preparation messaging', Math.max(0, eventStart - introsEnd));
  rows.push({ kind: 'handoff', label: 'Judges, the pool is yours', startSec: handoff, endSec: handoff, durSec: 0 });

  return {
    rows,
    needSec: introsEnd - annSec(t.warmupEndMinutes * 60),
    availSec: eventStart - annSec(t.warmupEndMinutes * 60),
    introsEndSec: introsEnd,
    eventStartSec: eventStart,
    handoffSec: handoff,
    events: evs,
  };
}

// How many intro minutes the session would need for the script to fit.
// Advisory only — this never moves anything on its own.
function annFitMinutes(sess) {
  const r = annRows(sess);
  if (!r) return null;
  const fixed = (r.availSec / 60) - Number(sess.introMinutes || 0); // rounding + buffer, not intro
  const need = Math.ceil((r.needSec / 60) - fixed);
  return Math.max(0, Math.ceil(need / 5) * 5);
}

// ── SETTERS ───────────────────────────────────────────────────────────
function annEnsure(sess) { if (!sess.announcer) sess.announcer = Object.assign({}, ANN_DEFAULTS, { order: {}, clubs: {} }); return sess.announcer; }
function setAnn(sessId, field, value) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const a = annEnsure(sess);
    a[field] = (typeof ANN_DEFAULTS[field] === 'boolean') ? Boolean(value) : (typeof ANN_DEFAULTS[field] === 'number' ? (Number(value) || 0) : value);
  });
}
function setAnnOrder(sessId, evId, text) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const a = annEnsure(sess); a.order = a.order || {}; a.order[evId] = text;
  });
}
function setAnnClub(sessId, evId, i, text) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const a = annEnsure(sess); a.clubs = a.clubs || {}; a.clubs[evId] = a.clubs[evId] || {};
    if (String(text || '').trim()) a.clubs[evId][String(i)] = String(text).trim();
    else delete a.clubs[evId][String(i)];
  });
}
function setAnnMeet(field, value) {
  upd(s => { s.meet.paScript = Object.assign({}, s.meet.paScript || {}, { [field]: value }); });
}
function annApplyFit(sessId) {
  const sess = S.sessions.find(x => x.id === sessId); if (!sess) return;
  const m = annFitMinutes(Object.assign({}, sess, { timing: calcSessTiming(sess) }));
  if (m == null) return;
  updSess(sessId, 'introMinutes', m);
  toast(`Intro set to ${m} minutes`);
}
function openAnnouncer(sessId) {
  const sess = S.sessions.find(x => x.id === sessId);
  const kind = sess ? annSessKind(sess) : null;
  UI.annSessId = sessId; UI.modal = 'announcer';
  UI.annTab = kind === 'session' ? 'notes' : 'order';
  render();
  // The morning read needs no entrant names — only the dive-order screen does.
  if (kind === 'finals') annLoadEntrants(false);
}

// ── EDITOR: SESSION PANEL ─────────────────────────────────────────────
function renderAnnSessPanel(sess) {
  const kind = annSessKind(sess);
  if (!kind) return '';
  if (kind === 'session') return renderOpenSessPanel(sess);
  const c = annCfg(sess);
  const evs = annEvents(sess);
  const filled = evs.filter(ev => annParseOrder((c.order || {})[ev.id] || '').length).length;
  const st = annRows(sess);
  const over = st && st.needSec > st.availSec;
  return `
    <div class="fdiv"></div>
    <div class="fsec">Announcer script <span style="font-weight:600;color:var(--tx3);text-transform:none;letter-spacing:0">walk-outs, anthem, handoff</span></div>
    <div class="fg"><label class="fl">Use an announcer script for this session</label>
      <div class="chiprow">
        <button class="chip ${c.on ? 'on' : ''}" onclick="setAnn('${sess.id}','on',${!c.on})">${c.on ? 'On' : 'Off'}</button>
        ${c.on ? `<button class="chip" onclick="openAnnouncer('${sess.id}')">Type the dive order…</button>
                  <button class="chip" onclick="printAnnouncer('${sess.id}')">Print script</button>` : ''}
      </div>
    </div>
    ${c.on ? `<div style="font-size:11px;color:var(--tx2);line-height:1.6;background:var(--surf2);border:1px solid var(--bd);border-radius:var(--r);padding:9px 11px">
      Order read: ${evs.map(evName).map(esc).join(' → ')}<br/>
      Dive order typed in for <strong>${filled} of ${evs.length}</strong> event${evs.length === 1 ? '' : 's'}.
      ${over ? `<span style="color:var(--red);font-weight:700">Script runs ${annDur(st.needSec)} but the session only allows ${annDur(st.availSec)} before the first dive.</span>` : ''}
    </div>` : ''}`;
}

function renderOpenModal(sess) {
  const timed = Object.assign({}, sess, { timing: calcSessTiming(sess) });
  const c = annCfg(sess);
  const evs = annOpeningEvents(sess);
  const t = timed.timing;
  const ctx = annOpenCtx(timed, evs);
  const day = S.meet.days.find(d => d.id === sess.dayId);
  const n = getSessNum(sess, allTimed());
  const tab = UI.annTab === 'words' || UI.annTab === 'preview' ? UI.annTab : 'notes';
  const tabBtn = (k, l) => `<button class="chip ${tab === k ? 'on' : ''}" onclick="UI.annTab='${k}';render()">${l}</button>`;
  const txtFld = (label, field, rows, hint) => `<div class="fg"><label class="fl">${label}${hint ? ` <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">— ${hint}</span>` : ''}</label>
    <textarea class="fi" rows="${rows || 3}" style="resize:vertical;line-height:1.5" onchange="setAnnMeet('${field}',this.value)">${esc(annMeetCfg()[field])}</textarea></div>`;

  let body = '';
  if (tab === 'notes') {
    body = `
      <div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:14px">
        Everything below is read straight off the schedule — you do not type any of it. The only thing to add is
        anything extra you want to say in this one session.
      </div>
      <div style="border:1px solid var(--bd);border-radius:var(--r);padding:11px 13px;background:var(--surf2);margin-bottom:16px;font-size:13px;line-height:1.8">
        <div style="font-size:10px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Pulled from the schedule</div>
        Greeting: <strong>Good ${esc(ctx.daypart)}, and ${annIsFirstCompSession(timed) ? 'welcome to' : 'welcome back to'}…</strong><br/>
        Warm-up <strong>${esc(f12(t.warmupStartMinutes))} – ${esc(f12(t.warmupEndMinutes))}</strong> · competition <strong>${esc(f12(t.eventStartMinutes))}</strong><br/>
        Audience: <strong>${esc(ctx.divers)}</strong> · round: <strong>${esc(ctx.roundword)}</strong><br/>
        ${esc(annFeatureSentence(timed, evs, n))} ${esc(annSplitSentence(evs))}
      </div>
      <div class="fg"><label class="fl">Anything extra to read in this session <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">— optional; one paragraph per line</span></label>
        <textarea class="fi" rows="5" style="resize:vertical;line-height:1.5" placeholder="e.g. Awards for last night's finals will be presented at the conclusion of this session."
          onchange="setAnn('${sess.id}','notes',this.value)">${esc(c.notes || '')}</textarea></div>`;
  } else if (tab === 'words') {
    body = `
      <div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:14px">
        This wording is saved with the schedule and reused for every prelim session, so you write it once per championship.
        Tokens: <strong>{venue}</strong> <strong>{meet}</strong> <strong>{city}</strong> <strong>{divers}</strong>
        <strong>{daypart}</strong> <strong>{roundword}</strong> — the last three change by session on their own.
      </div>
      ${txtFld('Venue welcome', 'pWelcome', 4)}
      ${txtFld('Sportsmanship, phones, flash photography', 'pSport', 4)}
      ${txtFld('Livestream and live scoring', 'pStream', 4)}
      ${txtFld('Photography partner', 'pPhoto', 5)}
      ${txtFld('Thank-yous', 'pThanks', 3)}
      ${txtFld('Good luck / handoff', 'pGoodLuck', 3)}`;
  } else {
    body = renderOpenScript(timed);
  }

  return `<div class="modal modal-lg" onclick="event.stopPropagation()" style="max-height:calc(100vh - 48px)">
    <div class="modal-hd">
      <div><span class="modal-title">Announcer script — Session ${n}</span>
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">${day ? esc(fullDate(day.date)) : ''} · ${esc(ctx.daypart)} ${esc(ctx.roundword)}</div></div>
      <button class="modal-close" onclick="UI.modal=null;render()">×</button>
    </div>
    <div style="padding:12px 22px 0"><div class="chiprow">${tabBtn('notes', 'This session')}${tabBtn('words', 'Wording')}${tabBtn('preview', 'Preview')}</div></div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot">
      <button class="btn btn-gh" onclick="UI.modal=null;render()">Close</button>
      <div style="flex:1"></div>
      <button class="btn btn-p" onclick="printAnnouncer('${sess.id}')">Print / PDF</button>
    </div>
  </div>`;
}

// The morning read needs almost no setup — it is derived from the schedule.
// So this panel is deliberately three controls, not a form.
function renderOpenSessPanel(sess) {
  const c = annCfg(sess);
  const evs = annOpeningEvents(sess);
  const t = sess.timing || calcSessTiming(sess);
  const ctx = annOpenCtx(sess, evs);
  return `
    <div class="fdiv"></div>
    <div class="fsec">Announcer script <span style="font-weight:600;color:var(--tx3);text-transform:none;letter-spacing:0">${esc(ctx.daypart)} ${esc(ctx.roundword)} read</span></div>
    <div class="fg"><label class="fl">Use an announcer script for this session</label>
      <div class="chiprow">
        <button class="chip ${c.on ? 'on' : ''}" onclick="setAnn('${sess.id}','on',${!c.on})">${c.on ? 'On' : 'Off'}</button>
        ${c.on ? `<button class="chip" onclick="openAnnouncer('${sess.id}')">Review the wording…</button>
                  <button class="chip" onclick="printAnnouncer('${sess.id}')">Print script</button>` : ''}
      </div>
    </div>
    ${c.on ? `<div style="font-size:11px;color:var(--tx2);line-height:1.6;background:var(--surf2);border:1px solid var(--bd);border-radius:var(--r);padding:9px 11px">
      Warm-up ${esc(f12(t.warmupStartMinutes))} · competition ${esc(f12(t.eventStartMinutes))}<br/>
      ${esc(annFeatureSentence(sess, evs, getSessNum(sess, allTimed())))}
      ${annSplitSentence(evs) ? ' ' + esc(annSplitSentence(evs)) : ''}
    </div>` : ''}`;
}

// ── EDITOR MODAL ──────────────────────────────────────────────────────
function renderAnnModal() {
  const sess = S.sessions.find(x => x.id === UI.annSessId);
  if (!sess) return '';
  annEnsurePreviewCss();
  if (annSessKind(sess) === 'session') return renderOpenModal(sess);
  const timed = Object.assign({}, sess, { timing: calcSessTiming(sess) });
  const c = annCfg(sess);
  const evs = annEvents(sess);
  const st = annRows(timed);
  const tab = UI.annTab || 'order';
  const ent = UI.annEntrants || {};
  const day = S.meet.days.find(d => d.id === sess.dayId);
  const over = st && st.needSec > st.availSec;
  const fit = annFitMinutes(timed);

  const tabBtn = (k, l) => `<button class="chip ${tab === k ? 'on' : ''}" onclick="UI.annTab='${k}';render()">${l}</button>`;

  const numFld = (label, field, hint) => `<div class="fg"><label class="fl">${label}${hint ? ` <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">— ${hint}</span>` : ''}</label>
    <input class="fi" type="number" min="0" step="1" value="${c[field]}" onchange="setAnn('${sess.id}','${field}',this.value)"/></div>`;

  const txtFld = (label, field, rows) => `<div class="fg"><label class="fl">${label}</label>
    <textarea class="fi" rows="${rows || 3}" style="resize:vertical;line-height:1.5" onchange="setAnnMeet('${field}',this.value)">${esc(annMeetCfg()[field])}</textarea></div>`;

  let body = '';
  if (tab === 'order') {
    const idx = annEntrantIndex();
    const imp = UI.annImport || {};
    body = `
      <div class="ann-dz" ondragover="annDragOver(event)" ondragleave="annDragLeave(event)" ondrop="annDropFiles(event,'${sess.id}')"
        style="border:2px dashed var(--bd2);border-radius:var(--r);padding:16px;text-align:center;margin-bottom:14px;background:var(--surf2)">
        <div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:4px">Drop the printed dive order PDFs here</div>
        <div style="font-size:11.5px;color:var(--tx2);line-height:1.6">
          Straight off the shared drive — as many events at once as you like. The file name does not matter;
          the event is read off the sheet itself, so it lands in the right place no matter who ran the report.
        </div>
        <input type="file" id="annFileInput" accept="application/pdf,.pdf" multiple style="display:none"
          onchange="annPickFiles(this,'${sess.id}')"/>
        <button class="btn btn-sm" style="margin-top:9px" onclick="document.getElementById('annFileInput').click()">Choose PDF files…</button>
        ${imp.busy ? `<div style="margin-top:9px;font-size:12px;color:var(--tx2)">Reading…</div>` : ''}
      </div>
      ${(imp.log || []).length ? `<div style="margin-bottom:14px;display:flex;flex-direction:column;gap:6px">
        ${imp.log.map(r => `<div style="font-size:12px;line-height:1.5;padding:7px 10px;border-radius:6px;
          border:1px solid ${r.ok ? (r.warn ? 'var(--red)' : 'var(--bd)') : 'var(--red)'};
          background:${r.ok && !r.warn ? 'var(--surf2)' : '#FFF5F7'};
          color:${r.ok && !r.warn ? 'var(--tx)' : 'var(--red)'}">${r.ok && !r.warn ? '✓ ' : ''}${esc(r.msg)}</div>`).join('')}
      </div>` : ''}
      <div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:14px">
        Or paste or type the dive order for each event, one athlete per line, in the order the meet software printed.
        Numbers at the start of a line are ignored — the script always renumbers from 1.
        Clubs are filled in from the DiveMeets entry list where the name matches exactly; anything it could not match is flagged
        so you can type the club yourself.
        ${ent.loading ? `<div style="margin-top:8px;color:var(--tx3)">Loading entrant names…</div>`
        : ent.error ? `<div style="margin-top:8px;color:var(--red)">${esc(ent.error)}</div>`
          : `<div style="margin-top:8px;color:var(--tx3)">${(ent.rows || []).length} entrant names available for club lookup ·
             <button class="chip" style="height:24px;padding:0 9px" onclick="annLoadEntrants(true)">Refresh</button></div>`}
      </div>
      ${evs.map((ev, ei) => {
      const roster = annRoster(sess, ev, idx);
      const missing = roster.filter(r => !r.club).length;
      return `<div style="border:1px solid var(--bd);border-radius:var(--r);padding:12px;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px;flex-wrap:wrap">
            <span style="background:var(--navy);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px">${ei + 1}</span>
            <strong style="font-size:14px;color:var(--navy)">${esc(evName(ev))} Final</strong>
            <span style="font-size:11px;color:var(--tx3)">${roster.length} in the order${missing ? ` · ${missing} without a club` : ''}</span>
          </div>
          ${(() => {
      const rec = (c.imports || {})[ev.id];
      if (!rec) return '';
      return `<div style="font-size:11px;line-height:1.5;margin-bottom:8px;padding:6px 9px;border-radius:5px;background:var(--surf2);border:1px solid ${rec.roundWarn ? 'var(--red)' : 'var(--bd)'}">
          Imported from <strong>${esc(rec.file)}</strong> — sheet says ${esc(rec.label)}, ${rec.count} divers${rec.boards > 1 ? `, ${rec.boards} boards merged` : ''}.
          ${rec.schedCount ? `<span style="color:var(--tx3)">The schedule is timed on ${rec.schedCount} for this event — an exhibition diver in the cut would explain one more.</span>` : ''}
          ${rec.roundWarn ? `<span style="color:var(--red);font-weight:700">This is the ${esc(rec.roundWarn)} sheet, not the ${esc(ev.round)} — check before printing.</span>` : ''}
        </div>`;
    })()}
          <textarea class="fi" rows="${Math.min(16, Math.max(6, roster.length + 2))}" placeholder="1  Noah Horwitz&#10;2  Ivor Brown&#10;3  Rydan Russel"
            style="resize:vertical;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.7"
            onchange="setAnnOrder('${sess.id}','${ev.id}',this.value)">${esc((c.order || {})[ev.id] || '')}</textarea>
          ${roster.length ? `<table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:12px">
            <thead><tr style="text-align:left;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">
              <th style="padding:4px 6px;width:34px">#</th><th style="padding:4px 6px">Athlete</th><th style="padding:4px 6px">Club / team</th></tr></thead>
            <tbody>${roster.map((r, i) => `<tr style="border-top:1px solid var(--bd2)">
              <td style="padding:4px 6px;font-weight:700;color:var(--navy);font-variant-numeric:tabular-nums">${r.no}</td>
              <td style="padding:4px 6px">${esc(r.name)}</td>
              <td style="padding:4px 6px">
                <input class="fi" style="padding:4px 7px;font-size:12px;${r.club ? '' : 'border-color:var(--red)'}"
                  placeholder="${r.source === 'ambiguous' ? 'More than one club matched — type it' : 'No match — type the club'}"
                  value="${esc(annClubOverride(sess, ev, i) || (r.source === 'typed' ? r.club : (r.club || '')))}"
                  onchange="setAnnClub('${sess.id}','${ev.id}',${i},this.value)"/>
              </td></tr>`).join('')}</tbody></table>` : ''}
        </div>`;
    }).join('')}`;
  } else if (tab === 'timing') {
    body = `
      <div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:14px">
        These lengths set the timestamps printed on the script. They do not move the session —
        if the script needs more room than the schedule allows, the warning below tells you and you decide.
      </div>
      <div class="fg2">
        ${numFld('Clear the boards and line up (minutes)', 'boardsCloseMin', 'after warm-up ends')}
        ${numFld('Short welcome (seconds)', 'welcomeSec')}
      </div>
      <div class="fg"><label class="fl">National Anthem</label>
        <div class="chiprow"><button class="chip ${c.anthemOn ? 'on' : ''}" onclick="setAnn('${sess.id}','anthemOn',${!c.anthemOn})">${c.anthemOn ? 'In this session' : 'Not in this session'}</button></div></div>
      ${c.anthemOn ? numFld('How long is the anthem? (seconds)', 'anthemSec', 'one anthem per championship — leave it off in later finals sessions') : ''}
      <div class="fg2">
        ${numFld('Lead-in per event (seconds)', 'leadInSec', 'floor check + "We begin with…"')}
        ${numFld('Per athlete (seconds)', 'perAthleteSec', 'name, club, walk-out')}
      </div>
      ${numFld('Closing line per event (seconds)', 'closeSec')}
      <div class="fg"><label class="fl">Hold messaging while athletes get ready</label>
        <div class="chiprow"><button class="chip ${c.holdOn ? 'on' : ''}" onclick="setAnn('${sess.id}','holdOn',${!c.holdOn})">${c.holdOn ? 'Print the hold messages' : 'Leave them out'}</button></div></div>
      ${st ? `<div style="border:1px solid ${over ? 'var(--red)' : 'var(--bd)'};border-radius:var(--r);padding:11px 13px;background:var(--surf2)">
        <div style="font-size:10px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Does it fit?</div>
        <div style="font-size:13px;line-height:1.7">
          Warm-up ends <strong>${annClock(annSec((timed.timing.warmupEndMinutes) * 60))}</strong> ·
          first dive <strong>${annClock(st.eventStartSec)}</strong><br/>
          Script needs <strong style="font-variant-numeric:tabular-nums">${annDur(st.needSec)}</strong> ·
          schedule allows <strong style="font-variant-numeric:tabular-nums">${annDur(st.availSec)}</strong>
        </div>
        ${over ? `<div style="margin-top:9px;color:var(--red);font-size:12.5px;font-weight:600">
            The introductions would run past the first dive. Give the intro ${fit} minutes, or shorten the read.
          </div>
          <div class="chiprow" style="margin-top:8px"><button class="chip" onclick="annApplyFit('${sess.id}')">Set intro to ${fit} minutes</button></div>`
        : `<div style="margin-top:8px;color:var(--tx3);font-size:12px">Introductions finish ${annClock(st.introsEndSec)}, leaving ${annDur(st.eventStartSec - st.introsEndSec)} of hold messaging before the first dive.</div>`}
      </div>` : ''}`;
  } else if (tab === 'words') {
    body = `
      <div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:14px">
        This wording is saved with the schedule and reused for every finals session, so you only write it once per championship.
        Use <strong>{venue}</strong>, <strong>{meet}</strong> or <strong>{city}</strong> and they will be filled in from the meet details.
      </div>
      ${txtFld('Welcome', 'welcome', 3)}
      ${txtFld('Line before the anthem', 'anthemLead', 2)}
      ${txtFld('Line before the introductions', 'introLead', 3)}
      <div class="fdiv"></div>
      <div class="fsec">Hold messaging</div>
      ${txtFld('Primary message', 'primaryMsg', 4)}
      ${txtFld('Optional hold message 1', 'hold1', 4)}
      ${txtFld('Optional hold message 2', 'hold2', 3)}
      <div class="fdiv"></div>
      ${txtFld('Handoff to the tables', 'handoff', 2)}`;
  } else {
    body = renderAnnScript(timed, { preview: true });
  }

  const n = getSessNum(sess, allTimed());
  return `<div class="modal modal-lg" onclick="event.stopPropagation()" style="max-height:calc(100vh - 48px)">
    <div class="modal-hd">
      <div><span class="modal-title">Announcer script — Session ${n}</span>
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">${day ? esc(fullDate(day.date)) : ''} · ${esc(evs.map(evName).join('  ·  '))}</div></div>
      <button class="modal-close" onclick="UI.modal=null;render()">×</button>
    </div>
    <div style="padding:12px 22px 0"><div class="chiprow">${tabBtn('order', 'Dive order')}${tabBtn('timing', 'Timing')}${tabBtn('words', 'Wording')}${tabBtn('preview', 'Preview')}</div></div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot">
      <button class="btn btn-gh" onclick="UI.modal=null;render()">Close</button>
      <div style="flex:1"></div>
      <button class="btn btn-p" onclick="printAnnouncer('${sess.id}')">Print / PDF</button>
    </div>
  </div>`;
}

// Ordinal position of this session among every junior-finals session in the
// meet, so the welcome line can say "the first finals session" truthfully.
const ANN_ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
  'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth'];
function annFinalsOrdinal(sess) {
  try {
    const all = allTimed().filter(s => annSessHasFinals(s));
    const i = all.findIndex(s => s.id === sess.id);
    if (i < 0) return '';
    return ANN_ORDINALS[i] || '';
  } catch (e) { return ''; }
}

// ── THE SCRIPT ITSELF ─────────────────────────────────────────────────
// Structure mirrors the session script format Mike already reads from:
// run of show → welcome + anthem → one numbered block per event with the
// dive-order table → hold messaging → handoff.
function renderAnnScript(sess, opts) {
  opts = opts || {};
  const st = annRows(sess);
  if (!st) return `<div class="ans"><div class="ans-empty">No junior finals events in this session.</div></div>`;
  const c = annCfg(sess);
  const m = annMeetCfg();
  const day = S.meet.days.find(d => d.id === sess.dayId);
  const meetName = (S.meet && S.meet.name) || 'USA Diving';
  const n = getSessNum(sess, allTimed());
  const introRows = st.rows.filter(r => r.kind === 'intro');
  const anthemRow = st.rows.find(r => r.kind === 'anthem');
  const wuRow = st.rows.find(r => r.kind === 'warmup');
  const welcomeRow = st.rows.find(r => r.kind === 'welcome');
  const closeRow = st.rows.find(r => r.kind === 'boardsclose');
  const ord = annFinalsOrdinal(sess);

  const flow = ['WARM-UP', 'WELCOME', c.anthemOn ? 'ANTHEM' : null]
    .concat(introRows.map(r => (r.ev.apparatus === 'Platform' || isPlatform(r.ev.apparatus)) ? 'TOWER' : r.ev.apparatus.replace('-Meter', '-METER')))
    .concat([c.holdOn ? 'HOLD MESSAGING' : null, 'JUDGES'])
    .filter(Boolean).join('  >  ');

  const cue = (title, text) => `<div class="ans-cue"><strong>${esc(title)}</strong>${text ? ` <em>${esc(text)}</em>` : ''}</div>`;
  const read = txt => `<p class="ans-read">${esc(annFill(txt))}</p>`;

  const evBlocks = introRows.map(r => {
    const roster = r.roster;
    const lead = r.first
      ? `We begin with the ${r.evName} Final. Let's meet the finalists.`
      : `Next, we recognize the finalists in the ${r.evName} Final.`;
    return `<section class="ans-sec">
      <h2 class="ans-h2"><span class="ans-num">${r.seq}</span> ${esc(r.evName)} Final
        <span class="ans-h2sub">INTRODUCE 1 TO ${roster.length || '__'} — DIVE ORDER</span>
        <span class="ans-h2t">${annClock(r.startSec)}</span></h2>
      ${cue('FLOOR CUE', `Confirm all ${roster.length || '—'} finalists are staged and visible before beginning. Announce the entire event before moving to the next event.`)}
      ${read(lead)}
      ${roster.length ? `<table class="ans-tbl">
        <thead><tr><th class="ans-tno">#</th><th>Athlete</th><th>Club / Team</th></tr></thead>
        <tbody>${roster.map(a => `<tr><td class="ans-tno">${a.no}</td><td class="ans-tnm">${esc(a.name)}</td><td class="ans-tcl${a.club ? '' : ' ans-blank'}">${a.club ? esc(a.club) : '________________'}</td></tr>`).join('')}</tbody>
      </table>` : `<div class="ans-warn">No dive order typed in for this event yet.</div>`}
      ${cue('READ FOR EACH ROW', '"[Athlete name], representing [club or team]."')}
      ${read(`Please join us in recognizing the finalists in the ${r.evName} Final.`)}
    </section>`;
  }).join('');

  const holdBlock = c.holdOn ? `<section class="ans-sec">
    <h2 class="ans-h2">Final Preparation Messaging <span class="ans-h2sub">USE WHILE ATHLETES GET READY</span>
      <span class="ans-h2t">${annClock(st.introsEndSec)}</span></h2>
    ${cue('READ THE PRIMARY MESSAGE FIRST', 'Use the optional messages only if the referee or athletes need additional time. Stop immediately when meet operations signals that the pool is ready.')}
    <div class="ans-msg"><div class="ans-msgh">PRIMARY MESSAGE <span>approx. ${Math.max(5, Math.round(annFill(m.primaryMsg).split(/\s+/).length / 2.6))} seconds</span></div>${read(m.primaryMsg)}</div>
    ${m.hold1 ? `<div class="ans-msg"><div class="ans-msgh">OPTIONAL HOLD MESSAGE 1 <span>approx. ${Math.max(5, Math.round(annFill(m.hold1).split(/\s+/).length / 2.6))} seconds</span></div>${read(m.hold1)}</div>` : ''}
    ${m.hold2 ? `<div class="ans-msg"><div class="ans-msgh">OPTIONAL HOLD MESSAGE 2 <span>approx. ${Math.max(5, Math.round(annFill(m.hold2).split(/\s+/).length / 2.6))} seconds</span></div>${read(m.hold2)}</div>` : ''}
  </section>` : '';

  return `<div class="ans" id="annScript">
    <div class="ans-page">
      <header class="ans-phd">
        <div class="ans-pmeet">${esc(meetName)}<span>Session-specific announcer script</span></div>
        <img class="ans-plogo" src="../shared/images/logo-white-horizontal.png?v=202606250245" alt="USA Diving"/>
      </header>
      <div class="ans-sub">
        <div class="ans-subt">Session ${n} finals${day ? ` — ${esc(fullDate(day.date))}` : ''}</div>
        <div class="ans-flow">${esc(flow)}</div>
      </div>
      <div class="ans-body">

        <section class="ans-sec">
          <h2 class="ans-h2">Run of Show <span class="ans-h2sub">SESSION ${n} FINALS</span></h2>
          ${cue(`ATHLETE WARM-UP — ${wuRow ? annClock(wuRow.startSec) + ' to ' + annClock(wuRow.endSec) : 'per onsite timeline'}`,
    'Do not begin the welcome until meet operations confirms warm-up is complete and the finalists are ready to be presented.')}
          ${cue(`CLOSE THE BOARDS — ${closeRow ? annClock(closeRow.startSec) : ''}`,
      `Clear the boards, line the finalists up for walk-outs. Allow ${annDur(closeRow ? closeRow.durSec : 0)}.`)}
          ${cue(`AT WARM-UP CONCLUSION — ${welcomeRow ? annClock(welcomeRow.startSec) : ''}`,
        `Short welcome${c.anthemOn ? ', National Anthem,' : ','} then introductions one event at a time. Introductions run to about ${annClock(st.introsEndSec)}; first dive is ${annClock(st.eventStartSec)}.`)}
          ${st.needSec > st.availSec ? `<div class="ans-warn">This read is longer than the gap between warm-up and the first dive. Trim it live or hold the start.</div>` : ''}
        </section>

        <section class="ans-sec">
          <h2 class="ans-h2">${c.anthemOn ? 'Short Welcome and National Anthem' : 'Short Welcome'} <span class="ans-h2sub">READ ALOUD</span>
            <span class="ans-h2t">${welcomeRow ? annClock(welcomeRow.startSec) : ''}</span></h2>
          <p class="ans-read ans-big">Good afternoon, and welcome to the ${ord ? esc(ord) + ' ' : ''}finals session of the ${esc(meetName)}!</p>
          ${read(m.welcome)}
          ${c.anthemOn ? `${read(m.anthemLead)}
            ${cue(`PLAY NATIONAL ANTHEM — ${annClock(anthemRow.startSec)}, ${annDur(anthemRow.durSec)}`,
          'Hold all athlete introductions until the anthem has concluded. Allow the final note to clear.')}
            ${read('Thank you. Please be seated.')}` : ''}
          ${read(m.introLead)}
        </section>

        ${evBlocks}
        ${holdBlock}

        <section class="ans-sec">
          <h2 class="ans-h2">Competition Handoff <span class="ans-h2sub">READ WHEN CLEARED</span>
            <span class="ans-h2t">${annClock(st.handoffSec)}</span></h2>
          ${read(m.handoff)}
          <div class="ans-handoff">JUDGES, THE POOL IS YOURS.<span>Best of luck to all of our competitors.</span></div>
        </section>

      </div>
      <footer class="ans-pft"><span>${esc(meetName)} · Session ${n} announcer script</span><span>Printed ${esc(new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }))}</span></footer>
    </div>
  </div>`;
}


/* ═══════════════════════════════════════════════════════════════════════
   SESSION-OPENING SCRIPT  (prelims / qualifiers — the morning read)
   ───────────────────────────────────────────────────────────────────────
   A prelim session has no walk-outs and no anthem. It is a straight read:
   greeting, venue welcome, sportsmanship and phones, livestream, the photo
   partner, thank-yous, what is competing this session, good luck, handoff.

   Everything that changes session to session — the greeting's time of day,
   whether it is "welcome" or "welcome back", the event list, which events
   are on split boards, the warm-up and competition times — is derived from
   the schedule, not typed twice.
═══════════════════════════════════════════════════════════════════════ */

// Which script does this session get? Junior finals get the walk-out script;
// anything else with scored events gets the opening read. Senior finals fall
// through to neither, because sb-broadcast.js already presents those athletes.
function annIsOpeningEv(ev) {
  if (!ev || ev.style === 'Custom Block') return false;
  return ev.round === 'Prelim' || ev.round === 'Qualifier' || ev.round === 'Semifinal';
}
function annOpeningEvents(sess) {
  // Schedule order is kept: that is the order the tables actually run.
  return (sess.events || []).filter(annIsOpeningEv);
}
function annSessKind(sess) {
  if (!sess || sess.isPractice) return null;
  if (annSessHasFinals(sess)) return 'finals';
  return annOpeningEvents(sess).length ? 'session' : null;
}

const ANN_ROUND_LABEL = { Prelim: 'Preliminary', Qualifier: 'Qualifier', Semifinal: 'Semifinal', Final: 'Final' };
function annDaypart(mins) {
  const h = Math.floor((Number(mins) || 0) / 60);
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
// "junior divers" / "senior divers" / plain "divers" for a combined session.
function annDiverWord(evs) {
  let jr = false, sr = false;
  evs.forEach(ev => {
    const l = ev.level || '';
    if (/^(Senior|National Qualifier)/i.test(l)) sr = true;
    else if (/^(Group|Junior)/i.test(l)) jr = true;
  });
  if (jr && !sr) return 'junior divers';
  if (sr && !jr) return 'senior divers';
  return 'divers';
}
// "preliminary" / "qualifying" / "semifinal" — plain word for the read.
function annRoundWord(evs) {
  const set = new Set(evs.map(e => e.round));
  if (set.size === 1) {
    const r = [...set][0];
    if (r === 'Prelim') return 'preliminary';
    if (r === 'Qualifier') return 'qualifying';
    if (r === 'Semifinal') return 'semifinal';
  }
  return 'competition';
}
// Is this the first competition session of the whole championship? Decides
// "welcome to" versus "welcome back to".
function annIsFirstCompSession(sess) {
  try {
    const all = allTimed().filter(s => annSessKind(s));
    return all.length ? all[0].id === sess.id : true;
  } catch (e) { return false; }
}
function annOpenCtx(sess, evs) {
  const t = sess.timing || calcSessTiming(sess);
  return {
    daypart: annDaypart(t.eventStartMinutes),
    divers: annDiverWord(evs),
    roundword: annRoundWord(evs),
  };
}

// "Session 3 features the Group A Boys 1-Meter Preliminary and the Group B
//  Boys Platform Preliminary, competing simultaneously."
// "National Qualifier Men 3-Meter" must not become "... 3-Meter Qualifier" —
// the level already carries the word.
function annEvReadName(ev) {
  const nm = evName(ev), lbl = ANN_ROUND_LABEL[ev.round] || ev.round || '';
  if (!lbl) return nm;
  return new RegExp('\\b' + lbl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(nm) ? nm : (nm + ' ' + lbl);
}
function annFeatureSentence(sess, evs, n) {
  const names = evs.map(ev => `the ${annEvReadName(ev)}`);
  let list;
  if (names.length === 1) list = names[0];
  else if (names.length === 2) list = names[0] + ' and ' + names[1];
  else list = names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  const sim = names.length > 1 ? ', competing simultaneously' : '';
  return `Session ${n} features ${list}${sim}.`;
}
// Split boards are a real instruction to the crowd and the tables, so they get
// their own sentence — driven by the schedule's own split flags, never typed.
function annSplitSentence(evs) {
  const split = evs.filter(ev => ev.manualSplit && !isPlatform(ev.apparatus));
  if (!split.length) return '';
  const apps = [...new Set(split.map(ev => (al(ev.apparatus) || '').toLowerCase()))];
  const list = apps.length === 1 ? apps[0]
    : apps.length === 2 ? apps[0] + ' and ' + apps[1]
      : apps.slice(0, -1).join(', ') + ', and ' + apps[apps.length - 1];
  return `The ${list} event${split.length > 1 ? 's' : ''} will be conducted on split boards.`;
}

function renderOpenScript(sess) {
  const evs = annOpeningEvents(sess);
  if (!evs.length) return `<div class="ans"><div class="ans-empty">No preliminary or qualifying events in this session.</div></div>`;
  const t = sess.timing || calcSessTiming(sess);
  const m = annMeetCfg();
  const c = annCfg(sess);
  const ctx = annOpenCtx(sess, evs);
  const day = S.meet.days.find(d => d.id === sess.dayId);
  const meetName = (S.meet && S.meet.name) || 'USA Diving';
  const n = getSessNum(sess, allTimed());
  const daypartCap = ctx.daypart.charAt(0).toUpperCase() + ctx.daypart.slice(1);
  const roundCap = ctx.roundword.charAt(0).toUpperCase() + ctx.roundword.slice(1);
  const backTo = annIsFirstCompSession(sess) ? 'welcome to' : 'welcome back to';
  const read = (txt) => `<p class="ans-read">${esc(annFill(txt, ctx))}</p>`;
  const split = annSplitSentence(evs);

  return `<div class="ans" id="annScript">
    <div class="ans-page">
      <header class="ans-phd">
        <div class="ans-pmeet">${esc(meetName)}<span>Announcer script</span></div>
        <img class="ans-plogo" src="../shared/images/logo-white-horizontal.png?v=202606250245" alt="USA Diving"/>
      </header>
      <div class="ans-sub">
        <div class="ans-subt">Session ${n} — ${esc(daypartCap)} ${esc(roundCap)}${day ? ` · ${esc(fullDate(day.date))}` : ''}</div>
        <div class="ans-flow">WARM-UP ${esc(f12(t.warmupStartMinutes))}&nbsp;&nbsp;&gt;&nbsp;&nbsp;COMPETITION ${esc(f12(t.eventStartMinutes))}</div>
      </div>
      <div class="ans-body">

        <section class="ans-sec">
          <h2 class="ans-h2">Welcome <span class="ans-h2sub">READ ALOUD</span>
            <span class="ans-h2t">${esc(f12(t.eventStartMinutes))}</span></h2>
          ${cueBlock('BEFORE YOU BEGIN', `Wait for meet operations to confirm warm-up is complete and the panels are seated. Warm-up runs ${f12(t.warmupStartMinutes)} to ${f12(t.warmupEndMinutes)}.`)}
          <p class="ans-read ans-big">Good ${esc(ctx.daypart)}, and ${backTo} the ${esc(meetName)}!</p>
          ${read(m.pWelcome)}
          ${read(m.pSport)}
          ${read(m.pStream)}
          <div class="ans-msg"><div class="ans-msgh">ACTION SHOTS PHOTOGRAPHY</div>${read(m.pPhoto)}</div>
          ${read(m.pThanks)}
        </section>

        <section class="ans-sec">
          <h2 class="ans-h2">This Session <span class="ans-h2sub">READ ALOUD</span></h2>
          <p class="ans-read ans-big">Now, it is time to begin this ${esc(ctx.daypart)}'s ${esc(ctx.roundword)} competition!</p>
          <p class="ans-read">${esc(annFeatureSentence(sess, evs, n))}${split ? ' ' + esc(split) : ''}</p>
          <table class="ans-tbl">
            <thead><tr><th class="ans-tno">#</th><th>Event</th><th>Entries</th><th>Dives</th><th>Boards</th><th>Starts</th></tr></thead>
            <tbody>${evs.map((ev, i) => {
    const tev = (t.events || []).find(e => e.id === ev.id) || {};
    return `<tr><td class="ans-tno">${i + 1}</td>
                <td class="ans-tnm">${esc(annEvReadName(ev))}</td>
                <td class="ans-tcl">${ev.numberOfDivers || '—'}</td>
                <td class="ans-tcl">${ev.numberOfDives || '—'}</td>
                <td class="ans-tcl">${ev.manualSplit && !isPlatform(ev.apparatus) ? 'Split' : 'Single'}</td>
                <td class="ans-tcl">${tev.eventStartMinutes != null ? esc(f12(tev.eventStartMinutes)) : ''}</td></tr>`;
  }).join('')}</tbody>
          </table>
          ${sess.awardsEnabled ? cueBlock('AWARDS IN THIS SESSION', 'An awards presentation is scheduled in this block — hold the closing line until meet operations confirms the ceremony order.') : ''}
        </section>

        ${String(c.notes || '').trim() ? `<section class="ans-sec">
          <h2 class="ans-h2">Session Notes <span class="ans-h2sub">READ ALOUD</span></h2>
          ${String(c.notes).split(/\n\s*\n|\n/).map(x => x.trim()).filter(Boolean).map(x => `<p class="ans-read">${esc(annFill(x, ctx))}</p>`).join('')}
        </section>` : ''}

        <section class="ans-sec">
          <h2 class="ans-h2">Competition Handoff <span class="ans-h2sub">READ WHEN CLEARED</span></h2>
          ${read(m.pGoodLuck)}
          <div class="ans-handoff">JUDGES, THE POOL IS YOURS.<span>Best of luck to all of our competitors.</span></div>
        </section>

      </div>
      <footer class="ans-pft"><span>${esc(meetName)} · Session ${n} announcer script</span><span>Printed ${esc(new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }))}</span></footer>
    </div>
  </div>`;
}
// Shared cue-box helper (the finals renderer builds its own inline).
function cueBlock(title, text) {
  return `<div class="ans-cue"><strong>${esc(title)}</strong>${text ? ` <em>${esc(text)}</em>` : ''}</div>`;
}

// ── PRINT ─────────────────────────────────────────────────────────────
function printAnnouncer(sessId) {
  const raw = S.sessions.find(x => x.id === (sessId || UI.annSessId));
  if (!raw) { toast('Session not found'); return; }
  const sess = Object.assign({}, raw, { timing: calcSessTiming(raw) });
  const kind = annSessKind(sess);
  if (!kind) { toast('Nothing to announce in this session'); return; }
  const title = (S.meet && S.meet.name) || 'USA Diving';
  const html = kind === 'finals' ? renderAnnScript(sess, {}) : renderOpenScript(sess);
  const w = window.open('', '_blank');
  if (!w) { alert('Pop-up blocked — allow pop-ups for this site and try again'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)} — Announcer script</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>${ANN_PRINT_CSS}</style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 700);
}

/* Print styling is deliberately larger than the other sheets in this app.
   This page is read out loud, standing up, under arena light — body copy is
   set at 14px and the spoken lines at 16px so a line is never lost mid-read.
   Brand rule: red never sits on blue. Red appears only on white. */
const ANN_PRINT_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#171F69;--red:#E31937;--pool:#009AC7;--sky:#8FC3EA;--gray:#5F6062}
html,body{background:#fff;font-family:'Inter',system-ui,sans-serif;color:#15172b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:letter portrait;margin:0.45in}
.ans-page{display:flex;flex-direction:column}
.ans-phd{background:var(--navy);color:#fff;padding:13px 20px;display:flex;align-items:center;justify-content:space-between;position:relative}
.ans-phd::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--pool)}
.ans-pmeet{font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:700;line-height:1.05;letter-spacing:.01em}
.ans-pmeet span{display:block;font-family:'Inter',sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--sky);margin-top:3px}
.ans-plogo{height:32px}
.ans-sub{padding:10px 20px 9px;border-bottom:2px solid var(--navy);display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap}
.ans-subt{font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.02em}
.ans-flow{font-size:9px;font-weight:800;letter-spacing:.09em;color:var(--gray);text-transform:uppercase}
.ans-body{padding:14px 20px 0}
.ans-sec{margin-bottom:17px;break-inside:avoid;page-break-inside:avoid}
.ans-h2{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.02em;
  border-bottom:2px solid var(--pool);padding-bottom:4px;margin-bottom:9px;display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;
  break-after:avoid;page-break-after:avoid}
.ans-num{display:inline-flex;align-items:center;justify-content:center;min-width:23px;height:23px;background:var(--navy);color:#fff;
  font-family:'Inter',sans-serif;font-size:12px;font-weight:800;border-radius:5px;padding:0 5px}
.ans-h2sub{font-family:'Inter',sans-serif;font-size:9.5px;font-weight:800;letter-spacing:.1em;color:var(--gray);text-transform:uppercase}
.ans-h2t{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--navy)}
.ans-read{font-size:16px;font-weight:600;line-height:1.55;margin:0 0 9px;color:#101227}
.ans-read.ans-big{font-size:18px;font-weight:700;color:var(--navy)}
.ans-cue{border-left:3px solid var(--sky);background:#F4F8FC;padding:7px 11px;margin:0 0 9px;font-size:11.5px;line-height:1.5;color:#2c3049}
.ans-cue strong{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--navy);margin-bottom:2px}
.ans-cue em{font-style:italic;color:var(--gray)}
.ans-tbl{width:100%;border-collapse:collapse;margin:0 0 10px}
.ans-tbl thead{display:table-header-group;break-after:avoid;page-break-after:avoid}
.ans-tbl tr{break-inside:avoid;page-break-inside:avoid}
.ans-tbl th{background:#F2F4F8;color:var(--navy);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;text-align:left;padding:5px 9px;border-bottom:1.5px solid var(--navy)}
.ans-tbl td{padding:6px 9px;font-size:14.5px;border-bottom:1px solid #E6EAF1;vertical-align:baseline}
.ans-tno{width:38px;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--navy);text-align:left}
.ans-tnm{font-weight:700;color:#101227}
.ans-tcl{color:#33374d}
.ans-blank{color:var(--red);font-weight:600;letter-spacing:.04em}
.ans-msg{margin:0 0 11px}
.ans-msgh{font-size:9.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--navy);margin-bottom:4px}
.ans-msgh span{font-weight:700;color:var(--gray);letter-spacing:.05em}
.ans-warn{border:1.5px solid var(--red);background:#FFF5F7;color:var(--red);font-size:12px;font-weight:700;padding:7px 11px;border-radius:5px;margin:0 0 9px}
.ans-handoff{background:var(--navy);color:#fff;padding:12px 16px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;
  font-size:24px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;line-height:1.1}
.ans-handoff span{display:block;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--sky);margin-top:5px}
.ans-pft{display:flex;justify-content:space-between;padding:9px 20px;border-top:2px solid var(--navy);font-size:9.5px;color:var(--gray);margin-top:8px}
.ans-empty{padding:40px;text-align:center;color:var(--gray)}
`;

/* In-app preview reuses the same markup, so what Mike sees in the modal is
   what comes out of the printer. The stylesheet is injected once. */
function annEnsurePreviewCss() {
  if (document.getElementById('annPreviewCss')) return;
  const el = document.createElement('style');
  el.id = 'annPreviewCss';
  el.textContent = ANN_PRINT_CSS.replace(/@page\{[^}]*\}/, '') +
    `\n.modal .ans-page{background:#fff;color:#15172b;border:1px solid #D9DEE8;border-radius:8px;overflow:hidden}` +
    `\n.ann-dz.ann-dz-over{border-color:var(--pool)!important;background:#EAF6FB!important}`;
  document.head.appendChild(el);
}
