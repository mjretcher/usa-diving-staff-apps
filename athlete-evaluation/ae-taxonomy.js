/* ============================================================
   ae-taxonomy.js — canonical dive-number classifier (browser).

   MIRROR of db/scripts/dive_taxonomy.py. Both are verified against the
   same fixture in db/scripts/taxonomy_fixture.json — if you change one,
   change the other and re-run the fixture test.

   Grounded in the 2026 USA Diving Technical Rulebook, Article 105.1:
     digit 1 = group (1 Front, 2 Back, 3 Reverse, 4 Inward, 5 Twist, 6 Armstand)
     groups 1-4: digit 2 = flying action; armstand: digit 2 = direction (1-3);
     twisting: digit 2 = takeoff direction (1-4); somersault digit = half
     somersaults; trailing digit on groups 5/6 = half twists; letter = position.

   Skills come from the Skills Bank (Art. 401.4, Art. 503.15(d)) plus the
   Group D platform lineup allowance in Art. 302.2(a)(3).
   ============================================================ */
(function () {
  'use strict';

  var GROUPS = {
    '1':  ['1',  'Forward'],
    '2':  ['2',  'Back'],
    '3':  ['3',  'Reverse'],
    '4':  ['4',  'Inward'],
    '51': ['51', 'Forward twisting'],
    '52': ['52', 'Back twisting'],
    '53': ['53', 'Reverse twisting'],
    '54': ['54', 'Inward twisting'],
    '61': ['61', 'Armstand forward'],
    '62': ['62', 'Armstand back'],
    '63': ['63', 'Armstand reverse'],
  };

  // Display order for charts/tables: the four families, then twists, then armstands.
  var GROUP_ORDER = ['1', '2', '3', '4', '51', '52', '53', '54', '61', '62', '63'];

  var SKILL_BANK_VALID_DIVES = { '611A': 1, '6111A': 1, '621A': 1, '6211A': 1 };

  var SKILL_STEMS = {
    '001': 1, '002': 1, '003': 1,
    '100': 1, '200': 1,
    '600': 1, '620': 1,
    '5101': 1, '5102': 1, '5104': 1, '5201': 1, '5203': 1, '5205': 1, '5301': 1, '5303': 1,
  };

  var POS = { A: 'Straight', B: 'Pike', C: 'Tuck', D: 'Free' };

  var RX_G14 = /^([1-4])([01])(\d{1,2})([ABCD])$/;
  var RX_G5  = /^5([1-4])(\d)(\d)([ABCD])$/;
  var RX_G6  = /^6([1-3])(\d)(\d?)([ABCD])$/;

  function normalize(raw) {
    if (raw == null) return '';
    var s = String(raw).trim().toUpperCase().replace(/\s/g, '').replace(/\./g, '');
    s = s.replace(/^O+/, function (m) { return new Array(m.length + 1).join('0'); });
    if (/^0{3,}\d[ABCD]$/.test(s)) s = '00' + s.slice(-2);
    return s;
  }

  function isWellformed(s) {
    return RX_G14.test(s) || RX_G5.test(s) || RX_G6.test(s);
  }

  function looksConcatenated(s) {
    if (s.length < 8) return false;
    for (var cut = 4; cut < s.length - 3; cut++) {
      if (isWellformed(s.slice(0, cut)) && isWellformed(s.slice(cut))) return true;
    }
    return false;
  }

  function classify(raw) {
    var s = normalize(raw);
    var out = {
      code: s, bucket: 'unclassified', groupCode: 'UNK', groupLabel: 'Unclassified',
      position: null, somersaults: null, twists: null, flying: null, skillBank: false,
    };
    if (!s) return out;
    out.position = POS[s.charAt(s.length - 1)] || null;

    if (looksConcatenated(s)) {
      out.bucket = 'parse_error';
      out.groupCode = 'PARSE';
      out.groupLabel = 'Unparseable (multi-dive string)';
      return out;
    }

    var stem = POS[s.charAt(s.length - 1)] ? s.slice(0, -1) : s;
    if (SKILL_STEMS[stem]) {
      out.bucket = 'skill'; out.groupCode = 'SKILL'; out.groupLabel = 'Skill';
      out.skillBank = true;
      return out;
    }

    var m = RX_G14.exec(s);
    if (m) {
      if (Number(m[3]) === 0) {
        out.bucket = 'skill'; out.groupCode = 'SKILL'; out.groupLabel = 'Skill';
        return out;
      }
      out.bucket = 'dive';
      out.groupCode = GROUPS[m[1]][0]; out.groupLabel = GROUPS[m[1]][1];
      out.somersaults = Number(m[3]); out.flying = m[2] === '1';
      return out;
    }

    m = RX_G5.exec(s);
    if (m) {
      if (Number(m[2]) === 0) {
        out.bucket = 'skill'; out.groupCode = 'SKILL'; out.groupLabel = 'Skill';
        return out;
      }
      var g5 = GROUPS['5' + m[1]];
      out.bucket = 'dive'; out.groupCode = g5[0]; out.groupLabel = g5[1];
      out.somersaults = Number(m[2]); out.twists = Number(m[3]);
      return out;
    }

    m = RX_G6.exec(s);
    if (m) {
      if (Number(m[2]) === 0) {
        out.bucket = 'skill'; out.groupCode = 'SKILL'; out.groupLabel = 'Skill';
        return out;
      }
      var g6 = GROUPS['6' + m[1]];
      out.bucket = 'dive'; out.groupCode = g6[0]; out.groupLabel = g6[1];
      out.somersaults = Number(m[2]); out.twists = m[3] ? Number(m[3]) : 0;
      out.skillBank = !!SKILL_BANK_VALID_DIVES[s];
      return out;
    }

    if (/^[56]\d0\d?[ABCD]$/.test(s)) {
      out.bucket = 'skill'; out.groupCode = 'SKILL'; out.groupLabel = 'Skill';
      return out;
    }
    if (/^00\d[ABCD]?$/.test(s)) {
      out.bucket = 'skill'; out.groupCode = 'SKILL'; out.groupLabel = 'Skill';
      out.skillBank = true;
      return out;
    }
    return out;
  }

  window.AETaxonomy = {
    classify: classify,
    normalize: normalize,
    GROUPS: GROUPS,
    GROUP_ORDER: GROUP_ORDER,
    groupOf: function (raw) { return classify(raw).groupCode; },
    label: function (code) { return GROUPS[code] ? GROUPS[code][1] : code; },
  };
})();
