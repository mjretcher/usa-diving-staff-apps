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
// The broadcast run-of-show presents the athletes on its own clock. A block
// running on that clock must NOT also build an announcer script, or the
// session gets two sets of introductions and two competing timings. Broadcast
// wins because it is the authoritative clock (calcSessTiming defers to it);
// the announcer panel says so in plain English rather than silently vanishing.
function annOn(sess) {
  if (typeof bcastOn === 'function' && bcastOn(sess)) return false;
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

// ── DIVE ORDER ON A BLOCK RUNNING THE BROADCAST CLOCK ─────────────────
// The broadcast run-of-show replaces the announcer script's own intro block
// and its timing. It does NOT replace the names. Somebody still stands at a
// microphone and reads the finalists out in the order the meet software
// printed, and that person needs the same page: number, name, club.
//
// So the dive-order screen is shared between the two, and so is the storage —
// sess.announcer.order / .clubs / .imports either way. An order loaded while
// broadcast timing is on is still there if broadcast is switched off later,
// and the other way round. Nothing is duplicated and nothing is stranded.
//
// The event list is the only real difference:
//   • announcer script — junior finals only, read 3-METER → TOWER → 1-METER
//   • broadcast block  — EVERY final on the block, Senior included, read in
//     the run-of-show's own presentation order, plus the next block's finals
//     when this block introduces both (introMode "withNext").
//
// A target is { sess, sessId, ev, next }. `sess` is the session the order is
// STORED on, which is not always the session being edited — when one block
// introduces the next block's finalists, those orders belong to the block the
// athletes actually dive in, so they are still right if the intro is moved.
function annOwnOrderEvents(sess) {
  if (!sess || sess.isPractice) return [];
  if (typeof bcastOn === 'function' && bcastOn(sess) && typeof bcastFinalsOf === 'function') {
    try { return bcastFinalsOf(sess); } catch (e) { return []; }
  }
  return annEvents(sess);
}
function annOrderTargets(sess) {
  if (!sess) return [];
  const own = annOwnOrderEvents(sess).map(ev => ({ sess, sessId: sess.id, ev, next: false }));
  let nx = null;
  try { nx = (typeof bcastIntrosCoverNext === 'function') ? bcastIntrosCoverNext(sess) : null; } catch (e) { }
  if (!nx) return own;
  const more = annOwnOrderEvents(nx).map(ev => ({ sess: nx, sessId: nx.id, ev, next: true }));
  return own.concat(more);
}
// True when there is a dive order to load for this block at all — used to
// decide whether to offer the screen, on the broadcast panel and elsewhere.
function annHasOrderScreen(sess) {
  return annOrderTargets(sess).length > 0;
}
// How many of this block's events have an order loaded, and whether any of
// them disagrees with the field size the schedule is timed on. The count
// mismatch is REPORTED, never acted on: the schedule is Mike's to change.
function annOrderStatus(sess) {
  const targets = annOrderTargets(sess);
  let filled = 0, athletes = 0;
  const mismatch = [];
  targets.forEach(t => {
    const rows = annParseOrder((annCfg(t.sess).order || {})[t.ev.id] || '');
    if (!rows.length) return;
    filled++; athletes += rows.length;
    let sched = 0;
    try { sched = Number(entryValue(t.ev)) || 0; } catch (e) { }
    if (sched && sched !== rows.length) mismatch.push({ ev: t.ev, sheet: rows.length, sched });
  });
  return { targets, total: targets.length, filled, athletes, mismatch };
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
   drive. Two things about those files are nobody's to control, so the
   importer is built around them:

     1. The file name is typed by whoever ran the report — "Tuesday synchro",
        "orders final 2" — so it is never read for anything.
     2. One printout often holds SEVERAL events, and the title line is
        worded differently every time:

            ( 30650 ) Group A Boys 3m (16-18)  Prelim
            ( 30660 ) Group A/B Synchro.Boys 3m  Final
            ( 30540 ) Group A/B Synchronized Girls Platform  Final

   So the sheet is cut into one section per title line, each section is read
   on its own, and the title is matched on what it MEANS — sex, board, and
   whether it is synchro — instead of on the wording. All three have to
   agree before an event is even a candidate, the age group is not allowed
   to contradict, and the answer has to be the only one that fits. Anything
   short of that is handed back to be placed from a list rather than
   guessed at, so a sheet never lands on the wrong event.

   Text is extracted with coordinates and regrouped into visual lines,
   because a PDF stores glyph runs, not rows. Grouping is greedy on the
   vertical gap: the order number and the name sit ~0.9pt apart and belong
   together, while a name and the dive-code row below it are ~9pt apart.

   A diver row is "<number> <name>", and a synchro row is
   "<number> <name> (club) / <name> (club)". Dive-code rows ("403B 201B …")
   and degree-of-difficulty rows ("2.1 1.8 …") cannot match that shape,
   because the leading integer in those rows is never followed by a space.

   Printed order numbers have to run consecutively inside a section. On a
   combined printout the second event carries straight on from the first
   (8, 9, 10, 11) which is fine and gets renumbered from 1; a gap is not,
   because it means a diver line was missed.
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

// ── READING A TITLE LINE ──────────────────────────────────────────────
// Longest form first in each list: "semi-final" must not be read as "final",
// and "women" must not be read as "men".
const ANN_TITLE_ROUND = [
  [/\bquarter\s*-?\s*finals?\b/i, 'Prelim'],
  [/\bsemi\s*-?\s*finals?\b/i, 'Semifinal'],
  [/\bprelim(?:inar(?:y|ies))?s?\b/i, 'Prelim'],
  [/\bfinals?\b/i, 'Final'],
  [/\bqualif(?:ier|ying)\b/i, 'Qualifier'],
];
const ANN_TITLE_SEX = [
  [/\bwomen(?:'?s)?\b/i, 'Women'],
  [/\bgirls?(?:'?s)?\b/i, 'Girls'],
  [/\bmen(?:'?s)?\b/i, 'Men'],
  [/\bboys?(?:'?s)?\b/i, 'Boys'],
  [/\bmixed\b/i, 'Mixed'],
];
// A board number is only a board when it is not part of an age range: the "1"
// in "14-15" and the "10" in "10-11" must never be read as a springboard.
const ANN_TITLE_APP = [
  [/\bplatform\b|\btower\b|(?:^|[^\d.])10\s*-?\s*m(?:etre|eter)?\b/i, 'Platform'],
  [/(?:^|[^\d.])3\s*-?\s*m(?:etre|eter)?\b/i, '3-Meter'],
  [/(?:^|[^\d.])1\s*-?\s*m(?:etre|eter)?\b/i, '1-Meter'],
];
// Age groups, however the sheet chooses to say it. These are the USA Diving
// junior brackets, so "16-18" and "Group A" are the same statement.
const ANN_TITLE_AGES = [
  [/\b16\s*[-–—]\s*18\b/, ['a']],
  [/\b14\s*[-–—]\s*15\b/, ['b']],
  [/\b12\s*[-–—]\s*13\b/, ['c']],
  [/\b(?:11|10)\s*(?:&|and)?\s*(?:under|below)\b/i, ['d']],
  [/\b14\s*[-–—]\s*18\b/, ['a', 'b']],
];
function annPickToken(list, text) {
  for (const [re, val] of list) if (re.test(text)) return val;
  return '';
}
// The set of age brackets a piece of text is talking about. Used on both the
// sheet title and the scheduled event, so "Group A/B", "14-18" and
// "Junior 14-18" all come out as the same two tags.
function annLevelTags(text) {
  const s = String(text || '');
  const tags = new Set();
  const gm = s.match(/\bgroups?\s*([a-d](?:\s*[\/&+,]\s*[a-d])*)\b/i);
  if (gm) gm[1].toLowerCase().split(/[^a-d]+/).filter(Boolean).forEach(x => tags.add(x));
  else {
    const ab = s.match(/\b([a-d])\s*\/\s*([a-d])\b/i);
    if (ab) { tags.add(ab[1].toLowerCase()); tags.add(ab[2].toLowerCase()); }
  }
  for (const [re, add] of ANN_TITLE_AGES) if (re.test(s)) add.forEach(x => tags.add(x));
  if (/\bsenior\b/i.test(s)) tags.add('senior');
  if (/\bmaster/i.test(s)) tags.add('masters');
  if (/\bnational\s+qualifier\b/i.test(s)) tags.add('qualifier');
  return tags;
}
// "Group A/B Synchro.Boys 3m Final" -> "Group A/B Synchro"
function annTitleLevel(title, sexWord) {
  let head = title;
  if (sexWord) {
    const i = title.toLowerCase().indexOf(String(sexWord).toLowerCase());
    if (i > 0) head = title.slice(0, i);
  }
  return head.replace(/[\s.,;:/\\-]+$/, '').trim();
}
// Returns the meta for a title line, or null if the line is not a title.
// A line that carries the software's "( 30660 )" event number is ALWAYS
// treated as a title even when the wording defeats us — otherwise its divers
// would silently pile onto the event above it, which is the one outcome worth
// protecting against above all others.
function annReadSheetTitle(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  let title = t, dmEventId = '', tagged = false;
  const idm = t.match(/^\(\s*(\d*)\s*\)\s*(.*)$/);
  if (idm) { tagged = true; dmEventId = idm[1] || ''; title = (idm[2] || '').trim(); }
  const gender = annPickToken(ANN_TITLE_SEX, title);
  const apparatus = annPickToken(ANN_TITLE_APP, title);
  if (!tagged) {
    // No event number to go on, so only accept an unmistakable title: it has
    // to name a sex and a board, and be short enough to be a heading.
    if (!gender || !apparatus) return null;
    if (title.split(' ').length > 12) return null;
    if (annParseDiverLine(t)) return null;
  }
  return {
    dmEventId,
    title: title || t,
    gender,
    apparatus,
    round: annPickToken(ANN_TITLE_ROUND, title),
    synchro: /synchro/i.test(title),
    level: annTitleLevel(title, gender),
    tags: annLevelTags(title),
  };
}

// ── READING A DIVER ROW ───────────────────────────────────────────────
// Split a row into athletes on the slash that sits OUTSIDE the club brackets,
// so a club with a slash in its name is never mistaken for a synchro partner.
function annSplitPair(text) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of String(text || '')) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === '/' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim()).filter(Boolean);
}
function annSplitClub(text) {
  const t = String(text || '').trim();
  const p = t.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return p ? { name: p[1].trim(), club: p[2].trim() } : { name: t, club: '' };
}
// "1 Noah Horwitz"  /  "1 Noah Horwitz (RipFest)"
// "1 Rydan Russell (Coral Springs Diving) / Amir Owens (Montgomery Dive Club)"
function annParseDiverLine(text) {
  const m = String(text || '').match(/^(\d{1,3})\s+(\S.*)$/);
  if (!m) return null;
  const rest = m[2].trim();
  if (!/[A-Za-z]{2}/.test(rest)) return null;
  // Clubs legitimately carry numbers — "Dive 2000 Club", "5280 Diving" — so
  // the numeric sanity check has to be applied to the athlete's name alone or
  // it throws the whole diver away.
  const people = annSplitPair(rest).map(annSplitClub);
  if (!people.length || people.length > 2) return null;
  for (const p of people) {
    if (!/[A-Za-z]{2}/.test(p.name)) return null;
    // A row of dive codes or DDs can never reach here (no space after the
    // leading integer), but a name is still never mostly digits.
    if ((p.name.match(/\d/g) || []).length > 2) return null;
  }
  const clubs = [];
  for (const p of people) {
    if (!p.club) continue;
    if (!clubs.some(c => annNorm(c) === annNorm(p.club))) clubs.push(p.club);
  }
  return {
    no: Number(m[1]),
    name: people.map(p => p.name.replace(/\s+/g, ' ')).join(' and '),
    club: clubs.join(' and '),
    pair: people.length > 1,
  };
}

// ── CUTTING THE SHEET INTO EVENTS ─────────────────────────────────────
// Every title line opens a new section. Divers printed before the first title
// are page furniture and are dropped.
function annParseSheetSections(lines) {
  const sections = [];
  let cur = null, board = null;
  const newSection = meta => { cur = { meta, boards: [] }; board = null; sections.push(cur); return cur; };
  const newBoard = name => { board = { name: name || '', rows: [], expected: null }; cur.boards.push(board); return board; };
  for (const ln of lines) {
    const t = ln.text;
    if (!t) continue;
    const h = annReadSheetTitle(t);
    if (h) { newSection(h); continue; }
    if (!cur) continue;
    const bm = t.match(/^Board\s+(\S.*)$/i);
    if (bm) { newBoard(bm[1].trim()); continue; }
    const tm = t.match(/^Total\s+Divers\s+for\s+board\s*:?\s*(\d+)/i);
    if (tm) { if (!board) newBoard(''); board.expected = Number(tm[1]); continue; }
    if (/^(www\.|Page\b|Meet Sponsored|Hosted by|Cuts start|Contact the Meet|Order\b\s+Round\b)/i.test(t)) continue;
    const d = annParseDiverLine(t);
    if (d) { if (!board) newBoard(''); board.rows.push(d); }
  }
  return sections;
}

// Flatten one section to a single ordered list. Boards are separate lanes of
// the same event; if a sheet comes through with two they are concatenated in
// printed order and renumbered so the announcer reads 1..n straight down.
function annSheetToOrder(section) {
  const rows = [];
  const problems = [];
  (section.boards || []).forEach(b => {
    const who = b.name ? `Board ${b.name}` : 'This sheet';
    if (b.expected != null && b.expected !== b.rows.length) {
      problems.push(`${who}: the sheet says ${b.expected} divers but ${b.rows.length} were read.`);
    }
    // Prelim sheets declare their own total; finals sheets do not. What both
    // always carry is the printed order number, which must step by one with no
    // gap and no repeat. On a combined printout the numbering carries on from
    // the event above, so the run is checked, not the starting value.
    const seq = b.rows.map(r => r.no);
    const bad = seq.some((n, i) => i > 0 && n !== seq[i - 1] + 1);
    if (seq.length > 1 && bad) {
      problems.push(`${who}: the printed order reads ${seq.join(', ')} — those do not run one after another, so a diver line was missed or read twice.`);
    }
    b.rows.forEach(r => rows.push(Object.assign({ board: b.name }, r)));
  });
  return { rows: rows.map((r, i) => Object.assign({}, r, { no: i + 1 })), problems, boards: (section.boards || []).length };
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

// ── MATCHING A SHEET TO AN EVENT ──────────────────────────────────────
// Sex, board and synchro are facts, not wording, and all three must agree.
// The age bracket is allowed to be silent on either side, but it is never
// allowed to disagree: a Group C sheet must not land on the Group D event
// just because that is the only 1-meter final in the session.
function annSexClass(g) {
  const s = String(g || '').toLowerCase();
  if (/^(boy|men|man|male)/.test(s)) return 'm';
  if (/^(girl|women|woman|female)/.test(s)) return 'f';
  if (/mixed/.test(s)) return 'x';
  return '';
}
function annSheetFits(meta, ev) {
  if (!ev || !meta) return false;
  if (Boolean(meta.synchro) !== (ev.style === 'Synchronized')) return false;
  const a = annSexClass(meta.gender), b = annSexClass(ev.gender);
  if (a && b && a !== 'x' && b !== 'x' && a !== b) return false;
  if (meta.apparatus && ev.apparatus && lk(meta.apparatus) !== lk(ev.apparatus)) return false;
  const mt = meta.tags || new Set(), et = annLevelTags(ev.level);
  if (mt.size && et.size && ![...mt].some(x => et.has(x))) return false;
  return true;
}
function annSheetScore(meta, ev) {
  let s = 0;
  const mt = meta.tags || new Set(), et = annLevelTags(ev.level);
  if ([...mt].some(x => et.has(x))) s += 4;
  if (annKeyPart(meta.level) && annKeyPart(meta.level) === annKeyPart(ev.level)) s += 2;
  if (meta.round && ev.round && meta.round === ev.round) s += 1;
  return s;
}
// Every finals event in the meet, so a sheet from another session can be named
// rather than simply refused.
function annAllFinalTargets() {
  const out = [];
  const timed = (typeof allTimed === 'function') ? allTimed() : null;
  (S.sessions || []).forEach(s => {
    if (s.isPractice) return;
    annOwnOrderEvents(s).forEach(ev => {
      let label = '';
      try { label = timed ? `Session ${getSessNum(s, timed)}` : ''; } catch (e) { }
      out.push({ sessId: s.id, sessLabel: label || (s.title || 'Session'), evId: ev.id, ev });
    });
  });
  return out;
}
// { ev, reason, elsewhere:[{sessId,sessLabel,evId,ev}] }
function annMatchSheetToEvent(sess, meta) {
  // sessId is the session the order gets WRITTEN to, which is this session
  // unless the sheet belongs to a block whose finalists are introduced here.
  const out = { ev: null, sessId: sess.id, reason: '', elsewhere: [] };
  if (!meta) { out.reason = 'There was no event title on this sheet.'; return out; }
  const here = annOrderTargets(sess);
  const take = t => { out.ev = t.ev; out.sessId = t.sessId; return out; };
  if (!meta.gender || !meta.apparatus) {
    out.reason = 'The title does not say which sex and board this event is in a way the app can read.';
  } else {
    const fits = here.filter(t => annSheetFits(meta, t.ev));
    if (fits.length === 1) return take(fits[0]);
    if (fits.length > 1) {
      const scored = fits.map(t => ({ t, s: annSheetScore(meta, t.ev) })).sort((a, b) => b.s - a.s);
      if (scored[0].s > scored[1].s) return take(scored[0].t);
      out.reason = `Two events in this session could be this sheet — ${scored.filter(x => x.s === scored[0].s).map(x => evName(x.t.ev)).join(' and ')}.`;
    } else {
      out.reason = 'No finals event in this session matches this sheet.';
    }
  }
  const mine = new Set(here.map(t => t.sessId + '::' + t.ev.id));
  out.elsewhere = annAllFinalTargets().filter(t => !mine.has(t.sessId + '::' + t.evId) && annSheetFits(meta, t.ev));
  return out;
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
// Write one read section onto one event, and hand back the line to show for it.
function annApplySection(sessId, ev, sec, byHand) {
  const sess = S.sessions.find(x => x.id === sessId);
  setAnnOrder(sessId, ev.id, annOrderToText(sec.rows));
  // A prior hand-typed club override would silently outrank the sheet.
  upd(s => { const ss = s.sessions.find(x => x.id === sessId); if (ss && ss.announcer && ss.announcer.clubs) delete ss.announcer.clubs[ev.id]; });
  const roundWarn = sec.meta.round && ev.round && sec.meta.round !== ev.round ? sec.meta.round : '';
  const sched = Number(ev.numberOfDivers || 0);
  annSetImport(sessId, ev.id, {
    file: sec.file, label: sec.meta.title, at: new Date().toISOString(), count: sec.rows.length,
    pair: Boolean(sec.rows[0] && sec.rows[0].pair),
    boards: sec.boards, dmEventId: sec.meta.dmEventId || '', roundWarn,
    schedCount: sched && sched !== sec.rows.length ? sched : 0, byHand: Boolean(byHand),
  });
  let where = '';
  if (sess && sessId !== UI.annSessId) {
    let n = '';
    try { n = getSessNum(sess, allTimed()); } catch (e) { }
    where = n ? ` in Session ${n}` : '';
  }
  return {
    ok: true, warn: Boolean(roundWarn),
    msg: `${evName(ev)}${where} — ${sec.rows.length} ${sec.rows[0] && sec.rows[0].pair ? 'pairs' : 'divers'} read from ${sec.file}` +
      `${sec.boards > 1 ? ` (${sec.boards} boards merged)` : ''}.` +
      (roundWarn ? ` Careful: this is the ${roundWarn} sheet, but the event here is the ${ev.round}.` : ''),
  };
}
async function annImportFiles(sessId, fileList) {
  const files = Array.from(fileList || []).filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  if (!files.length) { UI.annImport = { busy: false, log: [{ ok: false, msg: 'That was not a PDF. Drop the printed dive order sheet.' }], pending: [] }; render(); return; }
  const sess = S.sessions.find(x => x.id === sessId);
  if (!sess) return;
  UI.annImport = { busy: true, log: [], pending: [] };
  render();
  const log = [], pending = [];
  for (const f of files) {
    try {
      const lines = await annPdfSheetLines(f);
      const sections = annParseSheetSections(lines);
      if (!sections.length) { log.push({ ok: false, msg: `${f.name}: no event title line was found. Is this a DiveMeets dive order printout?` }); continue; }
      for (const raw of sections) {
        const ord = annSheetToOrder(raw);
        const many = sections.length > 1;
        const title = raw.meta.title || 'an untitled event';
        const where = many ? `${f.name}, "${title}"` : f.name;
        if (!ord.rows.length) { log.push({ ok: false, msg: `${where}: no divers were read under this title.` }); continue; }
        if (ord.problems.length) { log.push({ ok: false, msg: `${where}: ${ord.problems.join(' ')} Nothing was loaded from it — send the file over rather than trusting a partial read.` }); continue; }
        const sec = { file: f.name, meta: raw.meta, rows: ord.rows, boards: ord.boards };
        const hit = annMatchSheetToEvent(sess, raw.meta);
        if (hit.ev) { log.push(annApplySection(hit.sessId || sessId, hit.ev, sec)); continue; }
        pending.push(Object.assign({
          id: 'imp' + Math.random().toString(36).slice(2, 9),
          reason: hit.reason, elsewhere: hit.elsewhere || [],
        }, sec));
      }
    } catch (e) {
      log.push({ ok: false, msg: `${f.name}: ${e.message || 'could not be read'}` });
    }
  }
  UI.annImport = { busy: false, log, pending };
  render();
}
// Every finals event in the meet, this session's first, so a held sheet can be
// placed anywhere it actually belongs. When exactly one event elsewhere fits
// the sheet, that one starts selected — one look and one click.
function annAssignOptions(sess, p) {
  const all = annAllFinalTargets();
  const near = p.elsewhere || [];
  const only = near.length === 1 ? near[0] : null;
  const key = t => t.sessId + '::' + t.evId;
  const taken = new Set(near.map(key));
  const opt = t => `<option value="${key(t)}"${only && key(only) === key(t) ? ' selected' : ''}>${esc(evName(t.ev))}${t.sessId === sess.id ? '' : ` \u2014 ${esc(t.sessLabel)}`}</option>`;
  const mine = all.filter(t => t.sessId === sess.id && !taken.has(key(t)));
  const groups = [];
  all.filter(t => t.sessId !== sess.id && !taken.has(key(t))).forEach(t => {
    let g = groups.find(x => x.k === t.sessLabel);
    if (!g) { g = { k: t.sessLabel, rows: [] }; groups.push(g); }
    g.rows.push(t);
  });
  return `<option value="">Choose the event this sheet is\u2026</option>` +
    (near.length ? `<optgroup label="${near.length === 1 ? 'Same sex, board and synchro as this sheet' : 'Could be any of these'}">${near.map(opt).join('')}</optgroup>` : '') +
    (mine.length ? `<optgroup label="This session">${mine.map(opt).join('')}</optgroup>` : '') +
    groups.map(g => `<optgroup label="${esc(g.k)}">${g.rows.map(opt).join('')}</optgroup>`).join('');
}
// Placing a held sheet by hand. The dropdown carries "<session id>::<event id>"
// so a sheet that belongs to another session can be sent straight there.
function annAssignPending(sessId, pid) {
  const st = UI.annImport || {};
  const p = (st.pending || []).find(x => x.id === pid);
  if (!p) return;
  const sel = document.getElementById('annAssign-' + pid);
  const val = sel ? sel.value : '';
  if (!val) { toast('Choose the event this sheet belongs to first.'); return; }
  const cut = val.indexOf('::');
  const targetSess = val.slice(0, cut), evId = val.slice(cut + 2);
  const ts = S.sessions.find(x => x.id === targetSess);
  const ev = ts && (ts.events || []).find(e => e.id === evId);
  if (!ev) { toast('That event is no longer in the schedule.'); return; }
  const line = annApplySection(targetSess, ev, p, true);
  st.pending = (st.pending || []).filter(x => x.id !== pid);
  st.log = (st.log || []).concat([line]);
  UI.annImport = st;
  render();
}
function annSkipPending(pid) {
  const st = UI.annImport || {};
  st.pending = (st.pending || []).filter(x => x.id !== pid);
  UI.annImport = st;
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

/* ═══════════════════════════════════════════════════════════════════════
   FLOW ITEMS  (anything extra that has to happen in the run of show)
   ───────────────────────────────────────────────────────────────────────
   A countdown video on the board, a moment of silence, a sponsor read, a
   presentation — the shape is always the same: it has a name, it sits
   somewhere in the flow, it may take time, there may be something to say,
   and there is usually a cue for whoever is running it.

   Items live at two levels. Meet-level items repeat in EVERY session of
   that kind, which is how "a countdown video before all finals" is written
   once. Session-level items are for the one-off. Both are edited in the
   same place and print in the same shape; meet-level items print first
   within a slot.

   Slots are deliberately few and named for what the announcer sees, not
   for the data structure — three places a thing can go, described the way
   Mike would say them out loud.
═══════════════════════════════════════════════════════════════════════ */
const ANN_SLOTS = [
  { k: 'start', l: 'Before the welcome', lOpen: 'Before the welcome' },
  { k: 'beforeEvents', l: 'After the welcome, before the introductions', lOpen: 'After the welcome, before the event rundown' },
  { k: 'beforeHandoff', l: 'Right before the pool is turned over', lOpen: 'Right before the pool is turned over' },
];
// A run-of-show has no welcome, no anthem and no "the pool is yours" handoff,
// so the announcer's three places do not exist on a broadcast block. These are
// the three places on the broadcast spine, named for what the producer sees.
const BCAST_SLOTS = [
  { k: 'preIntros', l: 'After the boards close, before the introductions' },
  { k: 'preRound1', l: 'After the introductions, before the first dive' },
  { k: 'preAwards', l: 'After the last dive, before the awards' },
];
function annSlotsFor(kind) { return kind === 'bcast' ? BCAST_SLOTS : ANN_SLOTS; }
function annSlotLabel(k, kind) {
  const list = annSlotsFor(kind);
  const s = list.find(x => x.k === k) || list[0];
  return kind === 'session' ? s.lOpen : s.l;
}
function annDefaultSlot(kind) { return annSlotsFor(kind)[0].k; }
function annNewItem(o) {
  return Object.assign({
    id: 'fi' + Math.random().toString(36).slice(2, 9),
    label: 'New item', slot: 'start', sec: 0, say: '', cue: '',
  }, o || {});
}
// Broadcast show elements are a SEPARATE list from the announcer script's, at
// both levels. Two reasons, and the second is the important one:
//   • the slots differ, so an item written for one has no honest place in the
//     other ("right before the pool is turned over" means nothing on air);
//   • sharing them would make every existing broadcast block in every saved
//     schedule suddenly longer the moment this shipped, and the whole day
//     would reflow around items nobody put there. An empty list adds zero
//     seconds, so nothing moves until Mike adds something himself.
// "Copy the finals items in" (annCopyFinalsFlowToBcast) covers the case where
// he does want the same countdown in both, without retyping it.
function annMeetFlowKey(kind) { return kind === 'session' ? 'flowOpen' : (kind === 'bcast' ? 'flowBcast' : 'flowFinals'); }
function annSessFlowKey(kind) { return kind === 'bcast' ? 'bcastItems' : 'items'; }
function annMeetFlow(kind) {
  const v = (S.meet && S.meet.paScript && S.meet.paScript[annMeetFlowKey(kind)]) || [];
  return Array.isArray(v) ? v : [];
}
function annSessFlow(sess, kind) {
  const v = (sess && sess.announcer && sess.announcer[annSessFlowKey(kind)]) || [];
  return Array.isArray(v) ? v : [];
}
// Everything sitting in the same part of the show runs in ONE order, whether
// it is standing or a one-off — an anthem that only happens on finals night
// still has to be able to run before a countdown video that happens every
// night. So the two lists are merged and then sorted.
//
// A standing item takes its position from its own list: first, second, third.
// A one-off stores where it sits relative to those — 1.5 means "after the
// second standing item, before the third", −0.5 means "before all of them".
// Only the one-off carries the number, which is what keeps ordering the show
// in one session from disturbing the running order of any other session.
// A one-off with no number written on it runs after the standing items, which
// is exactly what everything did before ordering existed.
function annSlotEntries(sess, kind, slot) {
  const dflt = annDefaultSlot(kind);
  const inSlot = it => (it.slot || dflt) === slot;
  const meet = annMeetFlow(kind).filter(inSlot);
  const ses = annSessFlow(sess, kind).filter(inSlot);
  const rows = meet.map((it, i) => ({ it, scope: 'meet', i, ord: i }))
    .concat(ses.map((it, i) => ({
      it, scope: 'sess', i,
      ord: Number.isFinite(Number(it.ord)) ? Number(it.ord) : (meet.length + i),
    })));
  rows.sort((a, b) => (a.ord - b.ord) || (a.scope === b.scope ? a.i - b.i : (a.scope === 'meet' ? -1 : 1)));
  return rows;
}
function annFlowAt(sess, kind, slot) { return annSlotEntries(sess, kind, slot).map(r => r.it); }
// Where a one-off has to sit to hold a given position in the merged order:
// half a step behind the standing item that follows it, nudged by hundredths
// so several one-offs in the same gap keep the order they were given.
function annGapOrd(standingBefore, nthInGap) { return standingBefore - 0.5 + (nthInGap || 0) * 0.01; }
// Everything scheduled on a broadcast block, in slot order — used by the
// rundown and by the "how much longer does this make the show" line.
function bcastFlowItems(sess) {
  return BCAST_SLOTS.reduce((a, sl) => a.concat(annFlowAt(sess, 'bcast', sl.k)), []);
}
function bcastFlowAddedSec(sess) {
  return bcastFlowItems(sess).reduce((a, i) => a + annFlowSec(i), 0);
}
function annFlowSec(i) { return Math.max(0, Math.round(Number(i && i.sec) || 0)); }

// ── mutators ──
function annWriteMeetFlow(kind, fn) {
  upd(s => {
    s.meet.paScript = s.meet.paScript || {};
    const k = annMeetFlowKey(kind);
    const arr = Array.isArray(s.meet.paScript[k]) ? s.meet.paScript[k].slice() : [];
    const out = fn(arr);
    s.meet.paScript[k] = out || arr;
  });
}
function annWriteSessFlow(sessId, kind, fn) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const a = annEnsure(sess);
    const k = annSessFlowKey(kind);
    const arr = Array.isArray(a[k]) ? a[k].slice() : [];
    a[k] = fn(arr) || arr;
  });
}
function annFlowWrite(scope, kind, sessId, fn) {
  if (scope === 'meet') annWriteMeetFlow(kind, fn); else annWriteSessFlow(sessId, kind, fn);
}
function annAddItem(scope, kind, sessId, preset) {
  annFlowWrite(scope, kind, sessId, arr => { arr.push(annNewItem(Object.assign({ slot: annDefaultSlot(kind) }, preset || {}))); return arr; });
}
function annUpdItem(scope, kind, sessId, id, field, value) {
  annFlowWrite(scope, kind, sessId, arr => {
    const it = arr.find(x => x.id === id); if (!it) return arr;
    it[field] = field === 'sec' ? (Number(value) || 0) : value;
    return arr;
  });
}
function annDelItem(scope, kind, sessId, id) {
  annFlowWrite(scope, kind, sessId, arr => arr.filter(x => x.id !== id));
}
// Move an element one place earlier or later in the part of the show it sits
// in, regardless of which list it or its neighbour is on. Standing items are
// reseated within their own list (and only within this slot, so nothing in
// another part of the show shifts); one-offs get their position number
// rewritten. Nothing else in the schedule is touched.
function annMoveInSlot(kind, sessId, id, dir) {
  const cur = (S.sessions || []).find(x => x.id === sessId); if (!cur) return;
  const dflt = annDefaultSlot(kind);
  const item = annMeetFlow(kind).find(x => x.id === id) || annSessFlow(cur, kind).find(x => x.id === id);
  if (!item) return;
  const slot = item.slot || dflt;
  const rows = annSlotEntries(cur, kind, slot);
  const p = rows.findIndex(r => r.it.id === id); if (p < 0) return;
  const q = p + dir; if (q < 0 || q >= rows.length) return;
  const seq = rows.slice(); const t = seq[p]; seq[p] = seq[q]; seq[q] = t;

  const meetOrder = seq.filter(r => r.scope === 'meet').map(r => r.it.id);
  const sessOrd = {};
  let standingBefore = 0, nthInGap = 0;
  seq.forEach(r => {
    if (r.scope === 'meet') { standingBefore++; nthInGap = 0; }
    else { sessOrd[r.it.id] = annGapOrd(standingBefore, nthInGap); nthInGap++; }
  });

  upd(s => {
    const se = s.sessions.find(x => x.id === sessId); if (!se) return;
    s.meet.paScript = s.meet.paScript || {};
    const mk = annMeetFlowKey(kind);
    const marr = Array.isArray(s.meet.paScript[mk]) ? s.meet.paScript[mk].slice() : [];
    // Reseat this slot's standing items into their new relative order, leaving
    // every other slot's items exactly where they were in the array.
    const seats = []; marr.forEach((it, i) => { if ((it.slot || dflt) === slot) seats.push(i); });
    const byId = {}; marr.forEach(it => { byId[it.id] = it; });
    meetOrder.forEach((mid, k) => { if (seats[k] != null && byId[mid]) marr[seats[k]] = byId[mid]; });
    s.meet.paScript[mk] = marr;

    const a = annEnsure(se); const sk = annSessFlowKey(kind);
    const sarr = Array.isArray(a[sk]) ? a[sk].slice() : [];
    sarr.forEach(it => { if (sessOrd[it.id] != null) it.ord = sessOrd[it.id]; });
    a[sk] = sarr;
  });
}
// One vocabulary for the two scopes, said the way Mike says it out loud:
// "all finals" or "just this one". Every label on the Flow tab comes from here
// so the section head, the chip on the item and the toast cannot drift apart.
function annScopeWords(kind) {
  const bc = kind === 'bcast', op = kind === 'session';
  return {
    everyChip: op ? 'All preliminary sessions' : bc ? 'All broadcast blocks' : 'All finals sessions',
    oneChip: bc ? 'Just this block' : 'Just this session',
    everySub: op ? 'written once, runs in every preliminary session'
      : bc ? 'written once, runs in every block on the broadcast clock'
        : 'written once, runs in every finals session',
    everySay: op ? 'every preliminary session' : bc ? 'every block on the broadcast clock' : 'every finals session',
    oneSay: bc ? 'this block only' : 'this session only',
    unit: bc ? 'block' : 'session',
    units: bc ? 'blocks' : 'sessions',
  };
}
// Adding an element must never quietly commit it to the whole championship,
// and changing your mind must not mean deleting it and typing it again. This
// lifts the item out of one list and drops it in the other with everything on
// it intact — one undo step, because it is one decision.
function annSetItemScope(fromScope, kind, sessId, id, toScope) {
  if (fromScope === toScope) return;
  // Look before touching anything. A click that cannot find its item must not
  // burn an undo step or mark the schedule dirty for no reason.
  const cur = (S.sessions || []).find(x => x.id === sessId); if (!cur) return;
  const srcList = fromScope === 'meet' ? annMeetFlow(kind) : annSessFlow(cur, kind);
  const item = srcList.find(x => x.id === id); if (!item) return;
  // Count what runs ahead of it BEFORE anything is removed — read this after
  // the removal and the item can no longer find itself, which silently sent
  // every demoted element to the front of its part of the show.
  const dflt = annDefaultSlot(kind);
  const slot = item.slot || dflt;
  const seqNow = annSlotEntries(cur, kind, slot);
  const at = seqNow.findIndex(r => r.it.id === id);
  let standingBefore = 0;
  for (let z = 0; z < at; z++) if (seqNow[z].scope === 'meet') standingBefore++;
  let moved = null;
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    s.meet.paScript = s.meet.paScript || {};
    const a = annEnsure(sess);
    const mk = annMeetFlowKey(kind), sk = annSessFlowKey(kind);
    const read = sc => sc === 'meet'
      ? (Array.isArray(s.meet.paScript[mk]) ? s.meet.paScript[mk].slice() : [])
      : (Array.isArray(a[sk]) ? a[sk].slice() : []);
    const write = (sc, arr) => { if (sc === 'meet') s.meet.paScript[mk] = arr; else a[sk] = arr; };
    const from = read(fromScope);
    const i = from.findIndex(x => x.id === id); if (i < 0) return;
    moved = from[i];
    write(fromScope, from.filter(x => x.id !== id));
    // Hold its place in the show. A standing element dropping to one session
    // keeps the spot it was printing in; a one-off promoted to every session
    // is seated in the standing list at the same point in the sequence, since
    // standing elements take their order from that list alone.
    if (toScope === 'sess') {
      moved.ord = annGapOrd(standingBefore, 0);
      const to = read('sess'); to.push(moved); write('sess', to);
    } else {
      delete moved.ord;
      const to = read('meet');
      const seats = []; to.forEach((it, ix) => { if ((it.slot || dflt) === slot) seats.push(ix); });
      to.splice(seats[standingBefore] != null ? seats[standingBefore] : to.length, 0, moved);
      write('meet', to);
    }
  });
  if (!moved) return;
  const w = annScopeWords(kind);
  const nm = String(moved.label || 'That item').trim() || 'That item';
  toast(toScope === 'meet'
    ? `“${nm}” now runs in ${w.everySay}.`
    : `“${nm}” now runs in ${w.oneSay} — it has been taken out of the other ${w.units}.`, 4600);
}

// The one item Mike asked for by name, pre-filled so it is one click.
function annAddCountdown(scope, kind, sessId) {
  annAddItem(scope, kind, sessId, {
    label: 'Countdown video', slot: kind === 'bcast' ? 'preIntros' : 'beforeEvents', sec: 60,
    say: 'Please direct your attention to the video board.',
    cue: 'Roll the countdown video. Hold the microphone until it has finished and the room settles.',
  });
}

// Bringing the announcer script's standing finals items onto the broadcast
// list. Offered, never automatic — see annMeetFlowKey() for why. The slots are
// remapped because the two shows are not the same shape: everything the
// announcer does before the introductions happens before the introductions on
// air too, and the handoff slot becomes "before the first dive".
const ANN_TO_BCAST_SLOT = { start: 'preIntros', beforeEvents: 'preIntros', beforeHandoff: 'preRound1' };
function annCopyFinalsFlowToBcast() {
  const src = annMeetFlow('finals');
  if (!src.length) { toast('There are no every-finals items to copy.'); return; }
  annWriteMeetFlow('bcast', arr => {
    src.forEach(it => arr.push(annNewItem(Object.assign({}, it, {
      id: 'fi' + Math.random().toString(36).slice(2, 9),
      slot: ANN_TO_BCAST_SLOT[it.slot || 'start'] || 'preIntros',
    }))));
    return arr;
  });
  toast(`Copied ${src.length} item${src.length === 1 ? '' : 's'} — check the timing, the show is now longer.`);
}

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
  const itemAt = slot => annFlowAt(sess, 'finals', slot);
  const pushItems = slot => itemAt(slot).forEach(it => push('item', it.label, annFlowSec(it), { item: it, slot }));

  push('boardsclose', 'Close the boards — line up the finalists', Number(c.boardsCloseMin || 0) * 60);
  pushItems('start');
  push('welcome', 'Short welcome', c.welcomeSec);
  if (c.anthemOn) push('anthem', 'National Anthem', c.anthemSec);
  pushItems('beforeEvents');

  evs.forEach((ev, i) => {
    const roster = annRoster(sess, ev, idx);
    const n = roster.length;
    push('intro', evName(ev) + ' Final', Number(c.leadInSec || 0) + n * Number(c.perAthleteSec || 0) + Number(c.closeSec || 0), {
      ev, evName: evName(ev), roster, divers: n, seq: i + 1, first: i === 0,
    });
  });

  const introsEnd = at;
  const eventStart = annSec(t.eventStartMinutes * 60);
  // Anything sitting right before the handoff is fixed; the hold messaging is
  // the elastic part, so it absorbs whatever slack is left rather than pushing
  // the first dive later.
  const preItems = itemAt('beforeHandoff');
  const preSec = preItems.reduce((a, i) => a + annFlowSec(i), 0);
  push('hold', 'Final preparation messaging', Math.max(0, eventStart - introsEnd - preSec));
  pushItems('beforeHandoff');
  // When the schedule leaves no room between warm-up and the first dive, the
  // handoff still has to read AFTER everything else on the page. Clamping it
  // keeps the printed order truthful; the fit warning is what tells Mike the
  // schedule needs more intro time.
  const handoff = Math.max(eventStart, at);
  rows.push({ kind: 'handoff', label: 'Judges, the pool is yours', startSec: handoff, endSec: handoff, durSec: 0 });

  return {
    rows,
    needSec: (introsEnd - annSec(t.warmupEndMinutes * 60)) + preSec,
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
  const bc = Boolean(sess && typeof bcastOn === 'function' && bcastOn(sess));
  const kind = sess ? annSessKind(sess) : null;
  UI.annSessId = sessId; UI.modal = 'announcer';
  UI.annTab = (!bc && kind === 'session') ? 'notes' : 'order';
  render();
  // The morning read needs no entrant names — only the dive-order screen does.
  if (bc || kind === 'finals') annLoadEntrants(false);
}

// ── EDITOR: SESSION PANEL ─────────────────────────────────────────────
function renderAnnSessPanel(sess) {
  // Checked FIRST, ahead of annSessKind(). A Senior finals block has no
  // announcer-script "kind" at all — annSessHasFinals() excludes Senior on
  // purpose — so anything behind that gate would never render for exactly the
  // blocks most likely to be on the broadcast clock.
  if (typeof bcastOn === 'function' && bcastOn(sess)) return renderAnnBcastSessPanel(sess);
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


// ── EDITOR: SESSION PANEL, BROADCAST CLOCK ────────────────────────────
// Broadcast timing runs the introductions itself, so the announcer SCRIPT
// stands down — two sets of intros in one session is the bug that rule exists
// to prevent. The NAMES are a different thing: whoever is on the microphone
// still reads the finalists out in dive order, and now loads them here. They
// print on the run-of-show under ATHLETE PRESENTATION, next to the PA lines.
function renderAnnBcastSessPanel(sess) {
  const st = annOrderStatus(sess);
  if (!st.total) return '';
  const flow = bcastFlowItems(sess);
  const flowSec = bcastFlowAddedSec(sess);
  const done = st.filled === st.total;
  return `
    <div class="fdiv"></div>
    <div class="fsec">Announcer script <span style="font-weight:600;color:var(--tx3);text-transform:none;letter-spacing:0">on the broadcast clock</span></div>
    <div style="font-size:11px;color:var(--tx2);line-height:1.6;background:var(--surf2);border:1px solid var(--bd);border-radius:var(--r);padding:9px 11px">
      This block runs on the <strong>broadcast clock</strong>, so the run-of-show does the introductions
      and the standalone announcer script stays off — one session, one set of intros.<br/>
      Load the <strong>finals dive order</strong> below and the names print on the run-of-show under
      <strong>Athlete presentation</strong>, in the order they are read, with each athlete's club.
    </div>
    <div class="fg" style="margin-top:10px"><label class="fl">Finals dive order for the introductions</label>
      <div class="chiprow">
        <button class="chip" onclick="openAnnouncer('${sess.id}')">${st.filled ? 'Dive order…' : 'Load the dive order…'}</button>
        <button class="chip" onclick="UI.annSessId='${sess.id}';UI.annTab='flow';UI.modal='announcer';render()">Show elements${flowSec ? ` (+${bmmss(flowSec)})` : '…'}</button>
        <button class="chip" onclick="UI.modal='bcast-preview';UI.bcastSessId='${sess.id}';render()">Preview run-of-show</button>
        <button class="chip" onclick="printAnnouncer('${sess.id}')" title="The same show, set for reading aloud \u2014 large type, the dive order as names and clubs, cues kept separate from what is read">Print announcer script</button>
      </div>
    </div>
    <div style="font-size:11px;color:${done ? 'var(--tx2)' : 'var(--tx3)'};line-height:1.6;background:var(--surf2);border:1px solid var(--bd);border-radius:var(--r);padding:9px 11px">
      ${st.filled
      ? `Dive order loaded for <strong>${st.filled} of ${st.total}</strong> event${st.total === 1 ? '' : 's'} — ${st.athletes} ${st.athletes === 1 ? 'athlete' : 'athletes'} to read.`
      : `No dive order loaded yet. The run-of-show still times the introductions; it just has no names to print.`}
      ${st.mismatch.length ? `<br/><span style="color:var(--red);font-weight:700">${st.mismatch.map(m => `${esc(evName(m.ev))}: sheet has ${m.sheet}, the show is timed on ${m.sched}`).join(' · ')}.</span>
      <span style="color:var(--tx3)">The read uses the sheet; the clock uses the entries. Change the entries if the field really has changed.</span>` : ''}
      ${flow.length ? `<br/><strong>${flow.length} show element${flow.length === 1 ? '' : 's'}</strong> — ${esc(flow.map(i => i.label || 'Untitled').join(', '))}${flowSec ? `, adding <span style="font-family:'JetBrains Mono',monospace;font-weight:700">${bmmss(flowSec)}</span> to this block.` : ', none of them taking time.'}` : ''}
    </div>`;
}

// ── EDITOR: FLOW TAB (shared by both script types) ────────────────────
function renderFlowItemCard(it, scope, kind, sessId, i, n) {
  const w = annScopeWords(kind);
  const up = (field, extra) => `annUpdItem('${scope}','${kind}','${sessId}','${it.id}','${field}',${extra || 'this.value'})`;
  const scopeChip = (sc, label) => `<button class="chip ${scope === sc ? 'on' : ''}" style="padding:3px 9px;font-size:11px"
    onclick="annSetItemScope('${scope}','${kind}','${sessId}','${it.id}','${sc}')">${esc(label)}</button>`;
  const slotChip = sl => `<button class="chip ${(it.slot || 'start') === sl.k ? 'on' : ''}" style="padding:3px 9px;font-size:11px"
    onclick="annUpdItem('${scope}','${kind}','${sessId}','${it.id}','slot','${sl.k}')">${esc(annSlotLabel(sl.k, kind))}</button>`;
  return `<div style="border:1px solid var(--bd);border-radius:var(--r);padding:11px;margin-bottom:10px;background:var(--surf)">
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:9px">
      <input class="fi" style="flex:1;font-weight:700" value="${esc(it.label || '')}" placeholder="What is it? e.g. Countdown video"
        onchange="${up('label')}"/>
      <button class="chip" style="padding:3px 9px;color:var(--red)" onclick="annDelItem('${scope}','${kind}','${sessId}','${it.id}')">Remove</button>
    </div>
    <div class="fg" style="margin-bottom:9px"><label class="fl">Runs in <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">— switch it any time; nothing you have typed is lost</span></label>
      <div class="chiprow">${scopeChip('meet', w.everyChip)}${scopeChip('sess', w.oneChip)}</div></div>
    <div class="fg" style="margin-bottom:9px"><label class="fl">Where it goes <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">— the point in the show it happens</span></label>
      <div class="chiprow">${annSlotsFor(kind).map(slotChip).join('')}</div></div>
    <div class="fg" style="margin-bottom:9px"><label class="fl">How long does it take? <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">— seconds; 0 if it takes no time</span></label>
      <input class="fi" type="number" min="0" step="5" style="max-width:140px" value="${annFlowSec(it)}" onchange="${up('sec')}"/></div>
    <div class="fg" style="margin-bottom:9px"><label class="fl">What I say <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">— leave blank if I say nothing</span></label>
      <textarea class="fi" rows="2" style="resize:vertical;line-height:1.5" onchange="${up('say')}">${esc(it.say || '')}</textarea></div>
    <div class="fg" style="margin-bottom:0"><label class="fl">Cue for me or the crew <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">— printed in a box, not read out</span></label>
      <textarea class="fi" rows="2" style="resize:vertical;line-height:1.5" onchange="${up('cue')}">${esc(it.cue || '')}</textarea></div>
  </div>`;
}
// The two lists on this tab are about WHERE an element lives; this panel is
// about WHEN it runs. It is the only place the merged order is visible, so it
// is the only place ordering happens — the cards no longer carry arrows that
// could only ever move an item inside its own list.
function renderFlowOrderPanel(sess, kind) {
  const w = annScopeWords(kind);
  const groups = annSlotsFor(kind)
    .map(sl => ({ sl, rows: annSlotEntries(sess, kind, sl.k) }))
    .filter(g => g.rows.length);
  if (groups.reduce((a, g) => a + g.rows.length, 0) < 2) return '';
  const row = (r, i, n) => `<div style="display:flex;gap:8px;align-items:center;padding:6px 0;${i ? 'border-top:1px solid var(--bd)' : ''}">
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--pool);min-width:14px">${i + 1}</span>
      <span style="flex:1;font-size:12.5px;font-weight:600;color:var(--navy);line-height:1.35">${esc(r.it.label || 'Untitled')}</span>
      <span style="font-size:10.5px;color:var(--tx3);white-space:nowrap">${esc(r.scope === 'meet' ? w.everyChip : w.oneChip)}</span>
      <button class="chip" style="padding:2px 8px" title="Run this earlier" ${i === 0 ? 'disabled' : ''} onclick="annMoveInSlot('${kind}','${sess.id}','${r.it.id}',-1)">\u2191</button>
      <button class="chip" style="padding:2px 8px" title="Run this later" ${i === n - 1 ? 'disabled' : ''} onclick="annMoveInSlot('${kind}','${sess.id}','${r.it.id}',1)">\u2193</button>
    </div>`;
  return `<div style="border:1px solid var(--bd);border-left:3px solid var(--pool);border-radius:0 var(--r) var(--r) 0;background:var(--surf2);padding:11px 13px;margin-bottom:18px">
    <div style="font-size:10px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">The order they run in</div>
    <div style="font-size:11.5px;color:var(--tx2);line-height:1.55;margin-top:3px">
      This is the order printed on the ${kind === 'bcast' ? 'run-of-show' : 'script'}. Standing elements and one-offs
      run in one sequence, so anything here can go before anything else in the same part of the show.
    </div>
    ${groups.map(g => `<div style="margin-top:11px">
      <div style="font-size:11px;font-weight:700;color:var(--navy);padding-bottom:2px">${esc(annSlotLabel(g.sl.k, kind))}</div>
      ${g.rows.map((r, i) => row(r, i, g.rows.length)).join('')}
    </div>`).join('')}
  </div>`;
}

function renderFlowTab(sess, kind) {
  const meetList = annMeetFlow(kind), sessList = annSessFlow(sess, kind);
  const bc = kind === 'bcast';
  const w = annScopeWords(kind);
  // Name the one-off list after the actual session on screen. "Just this
  // session" is abstract; "Just Session 3" is the thing Mike is looking at.
  let sessN = null; try { sessN = getSessNum(sess, allTimed()); } catch (e) { }
  const list = (arr, scope) => arr.length
    ? arr.map((it, i) => renderFlowItemCard(it, scope, kind, sess.id, i, arr.length)).join('')
    : `<div style="font-size:12px;color:var(--tx3);padding:10px 0">Nothing here yet.</div>`;
  const added = bc ? bcastFlowAddedSec(sess) : 0;
  const canCopy = bc && !meetList.length && annMeetFlow('finals').length;
  return `
    <div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:16px">
      Anything extra that has to happen in the run of show — a countdown video, a moment of silence, a presentation,
      a sponsor read, an anthem. Give it a name, say where it goes and how long it takes. Whatever you put under
      <strong>What I say</strong> is ${bc ? 'printed in the PA column to read aloud' : 'printed to read aloud'};
      the <strong>cue</strong> is printed ${bc ? 'under the element for you and the crew, not read out' : 'in a box for you and the crew'}.
      <br/><br/><strong>Every element runs in one place or everywhere — you choose.</strong>
      Add it under <strong>${esc(w.everyChip)}</strong> and it runs in all of them. Add it under
      <strong>${esc(w.oneChip)}</strong>${sessN ? ` (Session ${sessN})` : ''} and nothing else is touched.
      Which list an element is on does not decide when it runs — set that under <strong>The order they run in</strong>. Each element shows which list it is on, and you can move it between the two
      at any time without retyping it.
      ${bc ? `<br/><br/><strong>These make the show longer.</strong> The broadcast clock is the schedule for this block, so anything
        with a length on it pushes the run-of-show out by exactly that much and the rest of the day reflows around it.
        Put a sponsor read inside an existing break instead if you do not want the show to grow — breaks are named and timed
        on the broadcast panel.` : `Items that take time are counted in the timing check, so the script still tells you honestly whether it all fits.`}
    </div>
    ${bc && added ? `<div style="font-size:12px;font-weight:700;color:var(--navy);background:var(--surf2);border:1px solid var(--bd);border-left:3px solid var(--pool);border-radius:0 var(--r) var(--r) 0;padding:9px 12px;margin-bottom:16px">
      These add <span style="font-family:'JetBrains Mono',monospace">${bmmss(added)}</span> to this block's show.
    </div>` : ''}
    ${canCopy ? `<div style="font-size:11.5px;color:var(--tx2);line-height:1.6;background:var(--wu-bg);border:1px solid var(--wu-bd);border-radius:var(--r);padding:10px 12px;margin-bottom:16px">
      You already have <strong>${annMeetFlow('finals').length}</strong> standing item${annMeetFlow('finals').length === 1 ? '' : 's'} on the announcer script's finals list.
      Broadcast blocks keep their own list on purpose — nothing is pulled across by itself, because it would make every
      broadcast block longer without you asking.
      <div class="chiprow" style="margin-top:8px"><button class="chip" onclick="annCopyFinalsFlowToBcast()">Copy the finals items in</button></div>
    </div>` : ''}

    ${renderFlowOrderPanel(sess, kind)}
    <div class="fsec">${esc(w.everyChip)} <span style="font-weight:600;color:var(--tx3);text-transform:none;letter-spacing:0">— ${esc(w.everySub)}</span></div>
    ${list(meetList, 'meet')}
    <div class="chiprow" style="margin-bottom:20px">
      ${kind === 'finals' || bc ? `<button class="chip" onclick="annAddCountdown('meet','${kind}','${sess.id}')">Add countdown video to all ${w.units}</button>` : ''}
      <button class="chip" onclick="annAddItem('meet','${kind}','${sess.id}')">Add something else to all ${w.units}</button>
    </div>

    <div class="fdiv"></div>
    <div class="fsec">Just this ${bc ? 'block' : 'session'}${sessN ? ` <span style="font-family:'JetBrains Mono',monospace">(Session ${sessN})</span>` : ''} <span style="font-weight:600;color:var(--tx3);text-transform:none;letter-spacing:0">— one-offs, no other ${w.unit} is affected</span></div>
    ${list(sessList, 'sess')}
    <div class="chiprow">
      ${kind === 'finals' || bc ? `<button class="chip" onclick="annAddCountdown('sess','${kind}','${sess.id}')">Add countdown video to this ${w.unit} only</button>` : ''}
      <button class="chip" onclick="annAddItem('sess','${kind}','${sess.id}')">Add something else to this ${w.unit} only</button>
    </div>`;
}

function renderOpenModal(sess) {
  const timed = Object.assign({}, sess, { timing: calcSessTiming(sess) });
  const c = annCfg(sess);
  const evs = annOpeningEvents(sess);
  const t = timed.timing;
  const ctx = annOpenCtx(timed, evs);
  const day = S.meet.days.find(d => d.id === sess.dayId);
  const n = getSessNum(sess, allTimed());
  const tab = ['words', 'preview', 'flow'].includes(UI.annTab) ? UI.annTab : 'notes';
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
  } else if (tab === 'flow') {
    body = renderFlowTab(sess, 'session');
  } else {
    body = renderOpenScript(timed);
  }

  return `<div class="modal modal-lg" onclick="event.stopPropagation()" style="max-height:calc(100vh - 48px)">
    <div class="modal-hd">
      <div><span class="modal-title">Announcer script — Session ${n}</span>
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">${day ? esc(fullDate(day.date)) : ''} · ${esc(ctx.daypart)} ${esc(ctx.roundword)}</div></div>
      <button class="modal-close" onclick="UI.modal=null;render()">×</button>
    </div>
    <div style="padding:12px 22px 0"><div class="chiprow">${tabBtn('notes', 'This session')}${tabBtn('flow', 'Flow')}${tabBtn('words', 'Wording')}${tabBtn('preview', 'Preview')}</div></div>
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
  if (typeof bcastOn === 'function' && bcastOn(sess)) return renderAnnBcastModal(sess);
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
    body = renderAnnOrderTab(sess, annOrderTargets(sess));
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
  } else if (tab === 'flow') {
    body = renderFlowTab(sess, 'finals');
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
    <div style="padding:12px 22px 0"><div class="chiprow">${tabBtn('order', 'Dive order')}${tabBtn('timing', 'Timing')}${tabBtn('flow', 'Flow')}${tabBtn('words', 'Wording')}${tabBtn('preview', 'Preview')}</div></div>
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

  const itemRows = st.rows.filter(r => r.kind === 'item');
  const itemsIn = slot => itemRows.filter(r => r.slot === slot);
  const flow = ['WARM-UP']
    .concat(itemsIn('start').map(r => String(r.item.label || '').toUpperCase()))
    .concat(['WELCOME', c.anthemOn ? 'ANTHEM' : null])
    .concat(itemsIn('beforeEvents').map(r => String(r.item.label || '').toUpperCase()))
    .concat(introRows.map(r => (r.ev.apparatus === 'Platform' || isPlatform(r.ev.apparatus)) ? 'TOWER' : r.ev.apparatus.replace('-Meter', '-METER')))
    .concat([c.holdOn ? 'HOLD MESSAGING' : null])
    .concat(itemsIn('beforeHandoff').map(r => String(r.item.label || '').toUpperCase()))
    .concat(['JUDGES'])
    .filter(Boolean).join('  >  ');
  // One shape for every extra item, wherever it sits.
  const itemBlock = r => `<section class="ans-sec">
      <h2 class="ans-h2">${esc(r.item.label || 'Item')}
        <span class="ans-h2sub">${r.item.say ? 'READ ALOUD' : 'CUE ONLY'}</span>
        <span class="ans-h2t">${annClock(r.startSec)}${r.durSec ? ' · ' + annDur(r.durSec) : ''}</span></h2>
      ${r.item.cue ? cueBlock('CUE', r.item.cue) : ''}
      ${r.item.say ? `<p class="ans-read">${esc(annFill(r.item.say))}</p>` : ''}
    </section>`;
  const itemsHtml = slot => itemsIn(slot).map(itemBlock).join('');

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

        ${itemsHtml('start')}

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

        ${itemsHtml('beforeEvents')}
        ${evBlocks}
        ${holdBlock}
        ${itemsHtml('beforeHandoff')}

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
  // The morning read has no second-by-second rundown, so an item shows its
  // length rather than a clock time.
  const itemBlock = it => `<section class="ans-sec">
      <h2 class="ans-h2">${esc(it.label || 'Item')}
        <span class="ans-h2sub">${it.say ? 'READ ALOUD' : 'CUE ONLY'}</span>
        ${annFlowSec(it) ? `<span class="ans-h2t">${annDur(annFlowSec(it))}</span>` : ''}</h2>
      ${it.cue ? cueBlock('CUE', it.cue) : ''}
      ${it.say ? `<p class="ans-read">${esc(annFill(it.say, ctx))}</p>` : ''}
    </section>`;
  const itemsHtml = slot => annFlowAt(sess, 'session', slot).map(itemBlock).join('');

  return `<div class="ans" id="annScript">
    <div class="ans-page">
      <header class="ans-phd">
        <div class="ans-pmeet">${esc(meetName)}<span>Announcer script</span></div>
        <img class="ans-plogo" src="../shared/images/logo-white-horizontal.png?v=202606250245" alt="USA Diving"/>
      </header>
      <div class="ans-sub">
        <div class="ans-subt">Session ${n} — ${esc(daypartCap)} ${esc(roundCap)}${day ? ` · ${esc(fullDate(day.date))}` : ''}</div>
        <div class="ans-flow">WARM-UP ${esc(f12(t.warmupStartMinutes))}&nbsp;&nbsp;&gt;&nbsp;&nbsp;${ANN_SLOTS.map(sl => annFlowAt(sess, 'session', sl.k).map(i => esc(String(i.label || '').toUpperCase()) + '&nbsp;&nbsp;&gt;&nbsp;&nbsp;').join('')).join('')}COMPETITION ${esc(f12(t.eventStartMinutes))}</div>
      </div>
      <div class="ans-body">

        ${itemsHtml('start')}

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

        ${itemsHtml('beforeEvents')}

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

        ${itemsHtml('beforeHandoff')}

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
/* THE ANNOUNCER'S COPY OF A BROADCAST BLOCK

   A Senior finals block on the broadcast clock had a run-of-show and nothing to
   read from. The run-of-show is a crew document \u2014 a wide table, seconds-accurate,
   PA copy squeezed into a column \u2014 and nobody can read a name off it standing at
   a microphone under arena light.

   So: one clock, two documents. This walks the SAME bcastRows the run-of-show
   walks, in the same order, off the same timing, and sets them the way the junior
   announcer script is set \u2014 large type, the read on its own line, the dive order
   as a table of names and clubs. It computes no timing of its own, which is the
   thing annOn() was guarding against when it kept the announcer off broadcast
   blocks. Nothing here can move the show.

   Rows with nothing to say are one line, not a section. An announcer needs to see
   that Round 3 and a commercial come next, but does not need half a page for it. */
// Moments the announcer works, copy or no copy.
const ANN_BCAST_OWED = { presentation: 1, boardsclose: 1, ceremony: 1, finish: 1, handoff: 1 };
function annBcastSubtitle(r, hasSay) {
  if (r.kind === 'presentation') return 'INTRODUCE THE FINALISTS \u2014 DIVE ORDER';
  if (r.kind === 'boardsclose') return 'BOARDS CLOSE \u2014 LINE UP THE FINALISTS';
  if (r.kind === 'ceremony') return 'MEDAL CEREMONY';
  if (r.kind === 'ceremonyprep') return 'AWARDS AREA BEING SET';
  if (r.kind === 'handoff') return 'AWARDS PRESENTED IN ANOTHER BLOCK';
  if (r.kind === 'finish') return 'END OF SHOW';
  return hasSay ? 'READ ALOUD' : 'CUE ONLY';
}
function renderAnnBcastScript(sess) {
  const rows = (sess && sess.timing && sess.timing.bcastRows) || [];
  if (!rows.length) return `<div class="ans"><div class="ans-empty">This block has no broadcast run-of-show yet.</div></div>`;
  const cues = (typeof paCues === 'function') ? paCues() : {};
  const day = S.meet.days.find(d => d.id === sess.dayId);
  const meetName = (S.meet && S.meet.name) || 'USA Diving';
  const n = getSessNum(sess, allTimed());
  const evs = (sess.events || []).filter(e => (typeof isBcastEv === 'function') ? isBcastEv(sess, e) : true);
  const cue = (title, text) => `<div class="ans-cue"><strong>${esc(title)}</strong>${text ? ` <em>${esc(text)}</em>` : ''}</div>`;

  let seq = 0;
  const body = rows.map(r => {
    const say = (typeof paCueFor === 'function') ? (paCueFor(r, cues) || '') : '';
    const note = (typeof bcastRowNote === 'function') ? (bcastRowNote(r) || '') : '';
    const groups = (typeof bcastPresentGroups === 'function') ? bcastPresentGroups(r) : [];
    const when = `${annClock(r.startSec)}${r.durSec ? ' \u00b7 ' + annDur(r.durSec) : ''}`;
    const label = (typeof bcastRowLabel === 'function') ? bcastRowLabel(r) : (r.label || '');
    // Some moments are the announcer's job whether or not anyone has written copy
    // for them \u2014 the walk-outs, the medals, the close. Those always get a section,
    // and an empty one says so, which is how a missing PA line gets noticed on
    // paper the day before instead of at the microphone.
    const owed = ANN_BCAST_OWED[r.kind];
    // Nothing to read, nothing to do, nobody's job: a single line to keep your place by.
    if (!say && !note && !groups.length && !owed) {
      return cue(`${annClock(r.startSec)} \u00b7 ${esc(label)}`, r.durSec ? annDur(r.durSec) + ' \u00b7 no read' : 'no read');
    }
    seq++;
    const rosterHtml = groups.map(g => {
      const rs = g.rows || [];
      return `${groups.length > 1 ? `<div class="ans-msgh" style="margin-top:8px">${esc(evName(g.ev))}</div>` : ''}
      ${rs.length ? `<table class="ans-tbl">
        <thead><tr><th class="ans-tno">#</th><th>Athlete</th><th>Club / Team</th></tr></thead>
        <tbody>${rs.map(a => `<tr><td class="ans-tno">${a.no}</td><td class="ans-tnm">${esc(a.name)}</td><td class="ans-tcl${a.club ? '' : ' ans-blank'}">${a.club ? esc(a.club) : '________________'}</td></tr>`).join('')}</tbody>
      </table>` : `<div class="ans-warn">No dive order loaded for this event yet.</div>`}`;
    }).join('');
    return `<section class="ans-sec">
      <h2 class="ans-h2"><span class="ans-num">${seq}</span> ${esc(label)}
        <span class="ans-h2sub">${annBcastSubtitle(r, !!say)}</span>
        <span class="ans-h2t">${when}</span></h2>
      ${note ? cue('CUE', note.replace(/^\s*CUE\s*\u2014\s*/i, '')) : ''}
      ${say ? `<p class="ans-read">${esc(annFill(say))}</p>` : ''}
      ${rosterHtml}
      ${groups.length ? cue('READ FOR EACH ROW', '"[Athlete name], representing [club or team]."') : ''}
      ${(!say && !note && !groups.length)
        ? cue('NO COPY SET FOR THIS', 'Nothing is written for this moment on the PA cue sheet. Ad lib, or add the wording under Edit PA announcements.')
        : ''}
    </section>`;
  }).join('');

  const first = rows[0], last = rows[rows.length - 1];
  return `<div class="ans" id="annScript">
    <div class="ans-page">
      <header class="ans-phd">
        <div class="ans-pmeet">${esc(meetName)}<span>Announcer script \u00b7 broadcast block</span></div>
        <img class="ans-plogo" src="../shared/images/logo-white-horizontal.png?v=202606250245" alt="USA Diving"/>
      </header>
      <div class="ans-sub">
        <div class="ans-subt">Session ${n}${evs.length ? ' \u2014 ' + esc(evs.map(evName).join('  &  ')) : ''}${day ? ` \u2014 ${esc(fullDate(day.date))}` : ''}</div>
        <div class="ans-flow">${annClock(first.startSec)} \u2013 ${annClock(last.endSec)}</div>
      </div>
      <div class="ans-body">
        <section class="ans-sec">
          <h2 class="ans-h2">Before you start <span class="ans-h2sub">HOW THIS PAGE WORKS</span></h2>
          ${cue('THE SHOW CLOCK RUNS THIS BLOCK', 'Every time on this page comes from the broadcast run-of-show \u2014 the same clock, the same order. If the show moves, the producer moves it; follow the floor, not the printed minute.')}
          ${cue('LINES IN LARGE TYPE ARE READ ALOUD', 'Anything in a grey CUE box is for you and the crew, and is never read.')}
        </section>
        ${body}
      </div>
    </div>
  </div>`;
}

function printAnnouncer(sessId) {
  const raw = S.sessions.find(x => x.id === (sessId || UI.annSessId));
  if (!raw) { toast('Session not found'); return; }
  const sess = Object.assign({}, raw, { timing: calcSessTiming(raw) });
  const bc = (typeof bcastOn === 'function') && bcastOn(sess)
    && ((sess.timing && sess.timing.bcastRows) || []).length;
  const kind = bc ? 'bcast' : annSessKind(sess);
  if (!kind) { toast('Nothing to announce in this session'); return; }
  const title = (S.meet && S.meet.name) || 'USA Diving';
  const html = bc ? renderAnnBcastScript(sess)
    : (kind === 'finals' ? renderAnnScript(sess, {}) : renderOpenScript(sess));
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

/* ═══════════════════════════════════════════════════════════════════════
   THE DIVE-ORDER SCREEN ON A BROADCAST BLOCK
   ───────────────────────────────────────────────────────────────────────
   Same screen, cut down to what the run-of-show actually uses. There is no
   Timing tab (the show clock owns the timing), no Wording tab and no Flow tab
   (the run-of-show has its own PA cue library and its own elements) — those
   would each be a second place to set the same thing, which is how a session
   ends up running two different scripts.

   Print goes through the run-of-show sheet, so there is exactly one page and
   the producer, the PA and the announcer are all reading it.
═══════════════════════════════════════════════════════════════════════ */
function renderAnnBcastModal(sess) {
  annEnsurePreviewCss();
  const targets = annOrderTargets(sess);
  const st = annOrderStatus(sess);
  const day = S.meet.days.find(d => d.id === sess.dayId);
  const tab = ['preview', 'flow'].includes(UI.annTab) ? UI.annTab : 'order';
  let n = ''; try { n = getSessNum(sess, allTimed()); } catch (e) { }
  const tabBtn = (k, l) => `<button class="chip ${tab === k ? 'on' : ''}" onclick="UI.annTab='${k}';render()">${l}</button>`;
  const added = bcastFlowAddedSec(sess);
  const body = tab === 'order' ? renderAnnOrderTab(sess, targets)
    : tab === 'flow' ? renderFlowTab(sess, 'bcast')
      : renderAnnPresentRead(sess, targets);

  return `<div class="modal modal-lg" onclick="event.stopPropagation()" style="max-height:calc(100vh - 48px)">
    <div class="modal-hd">
      <div><span class="modal-title">Athlete presentation — ${n ? 'Session ' + n : 'this block'}</span>
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">Broadcast clock · ${day ? esc(fullDate(day.date)) : ''} · ${esc(targets.map(t => evName(t.ev)).join('  ·  '))}</div></div>
      <button class="modal-close" onclick="UI.modal=null;render()">×</button>
    </div>
    <div style="padding:12px 22px 0">
      <div class="chiprow">${tabBtn('order', 'Dive order')}${tabBtn('preview', 'The read')}${tabBtn('flow', 'Flow' + (added ? ` (+${bmmss(added)})` : ''))}</div>
      <div style="font-size:11.5px;color:var(--tx2);line-height:1.6;margin-top:10px;background:var(--surf2);border:1px solid var(--bd);border-radius:var(--r);padding:9px 11px">
        ${tab === 'flow'
      ? `Extra things that have to happen in the show — a countdown video, a moment of silence, a presentation. They print
         on the run-of-show in place, and <strong>they make the block longer</strong>.`
      : `These names are read during <strong>Athlete presentation</strong> on the run-of-show, and print there.
         The show clock, the PA cue lines and the breaks are set on the <strong>broadcast timing</strong> panel — not here.`}
        ${st.mismatch.length ? `<br/><span style="color:var(--red);font-weight:700">${st.mismatch.map(m => `${esc(evName(m.ev))}: sheet has ${m.sheet}, the show is timed on ${m.sched}`).join(' · ')}.</span>` : ''}
      </div>
    </div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot">
      <button class="btn btn-gh" onclick="UI.modal=null;render()">Close</button>
      <div style="flex:1"></div>
      <button class="btn" onclick="UI.modal='bcast-preview';UI.bcastSessId='${sess.id}';render()">Run-of-show…</button>
      <button class="btn" onclick="printAnnouncer('${sess.id}')" title="The same show, set for reading aloud">Announcer script (PDF)</button>
      <button class="btn btn-p" onclick="UI.bcastSessId='${sess.id}';printBroadcast()">Run-of-show (PDF)</button>
    </div>
  </div>`;
}

// The read itself, in the order the run-of-show presents it. This is a preview
// of what prints under ATHLETE PRESENTATION — same source, same order, so what
// is checked here is what comes off the printer.
function renderAnnPresentRead(sess, targets) {
  const idx = annEntrantIndex();
  const cue = (typeof paCues === 'function') ? paCues() : {};
  const lead = String(cue.presentation || '')
    .replace(/\{event\}/g, targets.map(t => evName(t.ev)).join(' & ') || 'this event')
    .replace(/\{meet\}/g, (S.meet && S.meet.name) || 'USA Diving');
  const blocks = targets.map(t => {
    const rows = annRoster(t.sess, t.ev, idx);
    return { ev: t.ev, next: t.next, rows };
  });
  const any = blocks.some(b => b.rows.length);
  if (!any) {
    return `<div style="font-size:12.5px;color:var(--tx2);line-height:1.7;padding:14px;border:1px dashed var(--bd2);border-radius:var(--r);background:var(--surf2)">
      Nothing to read yet. Load the dive order on the <strong>Dive order</strong> tab — drop the printed PDFs in, or paste the
      list — and the read appears here and on the run-of-show.
    </div>`;
  }
  return `
    ${lead ? `<div style="font-size:13.5px;line-height:1.7;font-weight:600;color:var(--navy);padding:11px 13px;border-left:3px solid var(--pool);background:var(--surf2);border-radius:0 var(--r) var(--r) 0;margin-bottom:16px">${esc(lead)}</div>` : ''}
    ${blocks.map(b => `<div style="margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;padding-bottom:5px;border-bottom:2px solid var(--navy)">
        <strong style="font-size:13px;color:var(--navy)">${esc(evName(b.ev))}</strong>
        ${b.next ? `<span style="font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--pool)">Next block</span>` : ''}
        <span style="margin-left:auto;font-size:11px;color:var(--tx3)">${b.rows.length} to read</span>
      </div>
      ${b.rows.length ? `<ol style="margin:0;padding:0;list-style:none">
        ${b.rows.map(r => `<li style="display:flex;gap:10px;padding:4px 2px;border-bottom:1px solid var(--bd2);font-size:13px;line-height:1.5">
          <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--navy);min-width:22px;text-align:right">${r.no}</span>
          <span style="font-weight:600">${esc(r.name)}</span>
          <span style="margin-left:auto;color:${r.club ? 'var(--tx2)' : 'var(--red)'};font-size:12px">${r.club ? esc(r.club) : 'no club — type it on the Dive order tab'}</span>
        </li>`).join('')}
      </ol>` : `<div style="font-size:12px;color:var(--tx3);padding:6px 2px">No order loaded for this event.</div>`}
    </div>`).join('')}`;
}

/* ═══════════════════════════════════════════════════════════════════════
   THE DIVE-ORDER SCREEN
   ───────────────────────────────────────────────────────────────────────
   One screen, two callers. The announcer script opens it for a junior finals
   session; a block on the broadcast clock opens it for its own presented
   finals. `targets` decides which events appear and, crucially, WHICH SESSION
   each one is stored on — see annOrderTargets().
═══════════════════════════════════════════════════════════════════════ */
function renderAnnOrderTab(sess, targets) {
  const idx = annEntrantIndex();
  const imp = UI.annImport || {};
  const ent = UI.annEntrants || {};
  const bc = Boolean(typeof bcastOn === 'function' && bcastOn(sess));

  const card = (t, ei) => {
    const ev = t.ev, own = t.sess, c = annCfg(own);
    const roster = annRoster(own, ev, idx);
    const missing = roster.filter(r => !r.club).length;
    const rec = (c.imports || {})[ev.id];
    let sched = 0;
    try { sched = Number(entryValue(ev)) || 0; } catch (e) { }
    const off = roster.length && sched && sched !== roster.length ? sched : 0;
    return `<div style="border:1px solid var(--bd);border-radius:var(--r);padding:12px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px;flex-wrap:wrap">
        <span style="background:var(--navy);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px">${ei + 1}</span>
        <strong style="font-size:14px;color:var(--navy)">${esc(evName(ev))} ${esc(ev.round === 'Final' ? 'Final' : ev.round || '')}</strong>
        ${t.next ? `<span style="font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--pool);background:rgba(0,154,199,.1);border:1px solid rgba(0,154,199,.3);padding:2px 7px;border-radius:4px">Next block — introduced here</span>` : ''}
        <span style="font-size:11px;color:var(--tx3)">${roster.length} in the order${missing ? ` · ${missing} without a club` : ''}</span>
      </div>
      ${rec ? `<div style="font-size:11px;line-height:1.5;margin-bottom:8px;padding:6px 9px;border-radius:5px;background:var(--surf2);border:1px solid ${rec.roundWarn ? 'var(--red)' : 'var(--bd)'}">
        Imported from <strong>${esc(rec.file)}</strong> — sheet says ${esc(rec.label)}, ${rec.count} ${rec.pair ? 'pairs' : 'divers'}${rec.boards > 1 ? `, ${rec.boards} boards merged` : ''}.${rec.byHand ? ' Placed on this event by hand.' : ''}
        ${rec.roundWarn ? `<span style="color:var(--red);font-weight:700">This is the ${esc(rec.roundWarn)} sheet, not the ${esc(ev.round)} — check before printing.</span>` : ''}
      </div>` : ''}
      ${off ? `<div style="font-size:11px;line-height:1.5;margin-bottom:8px;padding:6px 9px;border-radius:5px;background:var(--wu-bg);border:1px solid var(--wu-bd);color:var(--tx2)">
        The sheet has <strong>${roster.length}</strong> ${roster.length === 1 ? 'name' : 'names'}, but this event is timed on <strong>${off}</strong>.
        The read below uses the sheet. ${bc ? 'The show clock still uses ' + off + ' — change the entries if the field really has changed.' : 'Change the entries if the field really has changed.'}
      </div>` : ''}
      <textarea class="fi" rows="${Math.min(16, Math.max(6, roster.length + 2))}" placeholder="1  Noah Horwitz&#10;2  Ivor Brown&#10;3  Rydan Russel"
        style="resize:vertical;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.7"
        onchange="setAnnOrder('${t.sessId}','${ev.id}',this.value)">${esc((c.order || {})[ev.id] || '')}</textarea>
      ${roster.length ? `<table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:12px">
        <thead><tr style="text-align:left;color:var(--tx3);font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">
          <th style="padding:4px 6px;width:34px">#</th><th style="padding:4px 6px">Athlete</th><th style="padding:4px 6px">Club / team</th></tr></thead>
        <tbody>${roster.map((r, i) => `<tr style="border-top:1px solid var(--bd2)">
          <td style="padding:4px 6px;font-weight:700;color:var(--navy);font-variant-numeric:tabular-nums">${r.no}</td>
          <td style="padding:4px 6px">${esc(r.name)}</td>
          <td style="padding:4px 6px">
            <input class="fi" style="padding:4px 7px;font-size:12px;${r.club ? '' : 'border-color:var(--red)'}"
              placeholder="${r.source === 'ambiguous' ? 'More than one club matched — type it' : 'No match — type the club'}"
              value="${esc(annClubOverride(own, ev, i) || (r.source === 'typed' ? r.club : (r.club || '')))}"
              onchange="setAnnClub('${t.sessId}','${ev.id}',${i},this.value)"/>
          </td></tr>`).join('')}</tbody></table>` : ''}
    </div>`;
  };

  return `
    <div class="ann-dz" ondragover="annDragOver(event)" ondragleave="annDragLeave(event)" ondrop="annDropFiles(event,'${sess.id}')"
      style="border:2px dashed var(--bd2);border-radius:var(--r);padding:16px;text-align:center;margin-bottom:14px;background:var(--surf2)">
      <div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:4px">Drop the printed dive order PDFs here</div>
      <div style="font-size:11.5px;color:var(--tx2);line-height:1.6">
        Straight off the shared drive — as many files as you like, and one printout holding several events is fine.
        File names are ignored: every event is read off its own title line, so it lands in the right place no matter
        who ran the report or what they called it. Anything that cannot be placed with certainty is listed below for
        you to point at the right event.
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
    ${(imp.pending || []).length ? `<div style="margin-bottom:14px;display:flex;flex-direction:column;gap:8px">
      ${imp.pending.map(p => {
    const first = p.rows[0], last = p.rows[p.rows.length - 1];
    const one = (p.elsewhere || []).length === 1 ? p.elsewhere[0] : null;
    return `<div style="border:1px solid var(--wu-bd);background:var(--wu-bg);border-radius:var(--r);padding:10px 12px">
        <div style="font-size:12.5px;font-weight:700;color:var(--navy);margin-bottom:3px">
          “${esc(p.meta.title || 'Untitled event')}” — ${p.rows.length} ${first && first.pair ? 'pairs' : 'divers'} read, waiting for an event
        </div>
        <div style="font-size:11.5px;color:var(--tx2);line-height:1.6;margin-bottom:8px">
          ${esc(p.reason || '')}
          ${one ? ` This looks like <strong>${esc(evName(one.ev))}</strong> in ${esc(one.sessLabel)}, which is picked below — check it, then load it.` : ''}
          <br/><span style="color:var(--tx3)">From ${esc(p.file)} · starts ${esc(first ? first.name : '')}${p.rows.length > 1 ? `, ends ${esc(last.name)}` : ''}.</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <select class="fi" id="annAssign-${p.id}" style="width:auto;max-width:100%;flex:1 1 260px;padding:6px 9px;font-size:12px">
            ${annAssignOptions(sess, p)}
          </select>
          <button class="btn btn-p btn-sm" onclick="annAssignPending('${sess.id}','${p.id}')">Load it here</button>
          <button class="chip" onclick="annSkipPending('${p.id}')">Skip this one</button>
        </div>
      </div>`;
  }).join('')}
    </div>` : ''}
    <div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:14px">
      Or paste or type the dive order for each event, one athlete per line, in the order the meet software printed.
      Numbers at the start of a line are ignored — the ${bc ? 'run-of-show' : 'script'} always renumbers from 1.
      Clubs are filled in from the DiveMeets entry list where the name matches exactly; anything it could not match is flagged
      so you can type the club yourself.
      ${ent.loading ? `<div style="margin-top:8px;color:var(--tx3)">Loading entrant names…</div>`
      : ent.error ? `<div style="margin-top:8px;color:var(--red)">${esc(ent.error)}</div>`
        : `<div style="margin-top:8px;color:var(--tx3)">${(ent.rows || []).length} entrant names available for club lookup ·
           <button class="chip" style="height:24px;padding:0 9px" onclick="annLoadEntrants(true)">Refresh</button></div>`}
    </div>
    ${targets.length ? targets.map(card).join('') :
      `<div style="font-size:12px;color:var(--tx3);padding:10px 0">No finals on this block yet.</div>`}`;
}

