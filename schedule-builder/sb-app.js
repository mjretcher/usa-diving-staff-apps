'use strict';

// ── SEED DATA ──────────────────────────────────────────────────────────
// ── SEED DATA ──────────────────────────────────────────────────────────
const BUILTIN_SCHEDULES = [{"id":"seed-zone-b","name":"2026 USA Diving Zone B Championship","builtIn":true,"savedAt":"2026-05-26T23:59:00.000Z","schedule":{"updatedAt":"2026-05-26T23:59:00.000Z","meet":{"name":"2026 USA Diving Zone B Championship","venue":"Competition Pool","city":"","timezone":"America/New_York","meetType":"zone","days":[{"id":"zone-b-day-1","date":"2026-05-27","openMinutes":420,"closeMinutes":1200},{"id":"zone-b-day-2","date":"2026-05-28","openMinutes":420,"closeMinutes":1200},{"id":"zone-b-day-3","date":"2026-05-29","openMinutes":420,"closeMinutes":1200},{"id":"zone-b-day-4","date":"2026-05-30","openMinutes":420,"closeMinutes":1200},{"id":"zone-b-day-5","date":"2026-05-31","openMinutes":420,"closeMinutes":1200}]},"sessions":[{"id":"b-practice-session-003","dayId":"zone-b-day-1","warmupStartMinutes":780,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"b-practice-003","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":240,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"b-practice-session-005","dayId":"zone-b-day-2","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"b-practice-005","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":480,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"b-practice-session-008","dayId":"zone-b-day-3","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Flighted Warm-Ups","events":[{"id":"b-practice-008","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":120,"notes":"Flighted warm-up block.","customLabel":"Flighted warm-up block."}]},{"id":"b-session-01","dayId":"zone-b-day-3","warmupStartMinutes":540,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-001-group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":12.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-002-group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-003-group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":7,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"b-session-02","dayId":"zone-b-day-3","warmupStartMinutes":665,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-004-group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":6.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-005-group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":3.0,"numberOfDives":7,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-006-group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"b-session-03","dayId":"zone-b-day-3","warmupStartMinutes":800,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-007-group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":28.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-b-event-008-group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":30.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"b-practice-session-021","dayId":"zone-b-day-4","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Flighted Warm-Ups","events":[{"id":"b-practice-021","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":120,"notes":"Flighted warm-up block.","customLabel":"Flighted warm-up block."}]},{"id":"b-session-04","dayId":"zone-b-day-4","warmupStartMinutes":540,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-009-group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":19.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-010-group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":8.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-011-group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":12.0,"numberOfDives":8,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"b-session-05","dayId":"zone-b-day-4","warmupStartMinutes":660,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-012-group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":10.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-013-group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-014-group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":24.0,"numberOfDives":8,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review platform load","customLabel":"Review platform load"}]},{"id":"b-session-06","dayId":"zone-b-day-4","warmupStartMinutes":855,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-015-group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":28.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-b-event-016-group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":27.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"b-practice-session-034","dayId":"zone-b-day-5","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Flighted Warm-Ups","events":[{"id":"b-practice-034","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":120,"notes":"Flighted warm-up block.","customLabel":"Flighted warm-up block."}]},{"id":"b-session-07","dayId":"zone-b-day-5","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-017-group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":17.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-018-group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":7.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-019-group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":30.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"b-session-08","dayId":"zone-b-day-5","warmupStartMinutes":690,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-020-group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":7.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-021-group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":7.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-022-group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"b-session-09","dayId":"zone-b-day-5","warmupStartMinutes":825,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-023-group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":18.0,"numberOfDives":9,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-024-group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":35.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]}],"publishStatus":"draft","currentLibraryId":"seed-zone-b","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"seed-zone-e","name":"2026 USA Diving Zone E Championship","builtIn":true,"savedAt":"2026-05-27T20:15:00.000Z","schedule":{"updatedAt":"2026-05-27T20:15:00.000Z","meet":{"name":"2026 USA Diving Zone E Championship","venue":"Competition Pool","city":"","timezone":"America/Los_Angeles","meetType":"zone","days":[{"id":"zone-e-day-1","date":"2026-05-27","openMinutes":420,"closeMinutes":1200},{"id":"zone-e-day-2","date":"2026-05-28","openMinutes":420,"closeMinutes":1200},{"id":"zone-e-day-3","date":"2026-05-29","openMinutes":420,"closeMinutes":1200},{"id":"zone-e-day-4","date":"2026-05-30","openMinutes":420,"closeMinutes":1200},{"id":"zone-e-day-5","date":"2026-05-31","openMinutes":420,"closeMinutes":1200}]},"sessions":[{"id":"e-practice-session-003","dayId":"zone-e-day-1","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"e-practice-003","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":420,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"e-practice-session-005","dayId":"zone-e-day-2","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"e-practice-005","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":420,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"e-practice-session-008","dayId":"zone-e-day-3","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted Training","events":[{"id":"e-restricted-friday-region-10","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","round":"Open Training","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"notes":"Region 10 restricted training.","customLabel":"Restricted Training"}]},{"id":"e-restricted-session-009-friday","dayId":"zone-e-day-3","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted Training","events":[{"id":"e-restricted-friday-region-9","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","round":"Open Training","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"notes":"Region 9 restricted training.","customLabel":"Restricted Training"}]},{"id":"e-session-01","dayId":"zone-e-day-3","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-001-group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":28.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-e-event-002-group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":22.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"e-session-02","dayId":"zone-e-day-3","warmupStartMinutes":630,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-003-group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":9.0,"numberOfDives":7,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-004-group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-03","dayId":"zone-e-day-3","warmupStartMinutes":765,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-005-group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":18.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-006-group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":1.0,"numberOfDives":7,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-04","dayId":"zone-e-day-3","warmupStartMinutes":890,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-007-group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":6.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-008-group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":4.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-practice-session-021","dayId":"zone-e-day-3","warmupStartMinutes":970,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"e-practice-021","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":170,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"e-practice-session-023","dayId":"zone-e-day-4","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted Training","events":[{"id":"e-restricted-saturday-region-9","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","round":"Open Training","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"notes":"Region 9 restricted training.","customLabel":"Restricted Training"}]},{"id":"e-restricted-session-024-saturday","dayId":"zone-e-day-4","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted Training","events":[{"id":"e-restricted-saturday-region-10","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","round":"Open Training","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"notes":"Region 10 restricted training.","customLabel":"Restricted Training"}]},{"id":"e-session-05","dayId":"zone-e-day-4","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-009-group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":21.0,"numberOfDives":8,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-010-group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":22.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"e-session-06","dayId":"zone-e-day-4","warmupStartMinutes":660,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-011-group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":22.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-012-group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":7.0,"numberOfDives":8,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-07","dayId":"zone-e-day-4","warmupStartMinutes":820,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-013-group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":16.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-014-group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":8.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-08","dayId":"zone-e-day-4","warmupStartMinutes":940,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-015-group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-016-group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":2.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-practice-session-036","dayId":"zone-e-day-4","warmupStartMinutes":1045,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"e-practice-036","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":95,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"e-practice-session-038","dayId":"zone-e-day-5","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"e-practice-038","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"e-session-09","dayId":"zone-e-day-5","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-017-group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":26.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-e-event-018-group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":14.0,"numberOfDives":9,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-10","dayId":"zone-e-day-5","warmupStartMinutes":630,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-019-group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":23.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-e-event-020-group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-11","dayId":"zone-e-day-5","warmupStartMinutes":765,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-021-group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":8.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-022-group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":7.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-12","dayId":"zone-e-day-5","warmupStartMinutes":855,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-023-group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":14.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-024-group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":0.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]}],"publishStatus":"draft","currentLibraryId":"seed-zone-e","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"seed-zone-f","name":"2026 USA Diving Zone F Championship","builtIn":true,"savedAt":"2026-05-26T23:59:00.000Z","schedule":{"updatedAt":"2026-05-26T23:59:00.000Z","meet":{"name":"2026 USA Diving Zone F Championship","venue":"Competition Pool","city":"","timezone":"America/Los_Angeles","meetType":"zone","days":[{"id":"zone-f-day-1","date":"2026-05-27","openMinutes":420,"closeMinutes":1200},{"id":"zone-f-day-2","date":"2026-05-28","openMinutes":420,"closeMinutes":1200},{"id":"zone-f-day-3","date":"2026-05-29","openMinutes":420,"closeMinutes":1200},{"id":"zone-f-day-4","date":"2026-05-30","openMinutes":420,"closeMinutes":1200},{"id":"zone-f-day-5","date":"2026-05-31","openMinutes":420,"closeMinutes":1200}]},"sessions":[{"id":"f-practice-session-003","dayId":"zone-f-day-1","warmupStartMinutes":900,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"f-practice-003","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":240,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"f-practice-session-005","dayId":"zone-f-day-2","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"f-practice-005","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":480,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"f-practice-session-008","dayId":"zone-f-day-3","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"f-practice-008","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"f-session-01","dayId":"zone-f-day-3","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-001-group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":23.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-002-group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":13.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-003-group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":37.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"f-session-02","dayId":"zone-f-day-3","warmupStartMinutes":650,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-004-group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":21.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-f-event-005-group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":42.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow; Split strongly recommended if springboard","customLabel":"Review split board / flow; Split strongly recommended if springboard"}]},{"id":"f-session-03","dayId":"zone-f-day-3","warmupStartMinutes":825,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-006-group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":1.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-007-group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":11.0,"numberOfDives":7,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-008-group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":23.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"f-practice-session-021","dayId":"zone-f-day-4","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"f-practice-021","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"f-session-04","dayId":"zone-f-day-4","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-009-group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":8.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-010-group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":28.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-f-event-011-group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":39.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"f-session-05","dayId":"zone-f-day-4","warmupStartMinutes":665,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-012-group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":10.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-013-group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":18.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-014-group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":24.0,"numberOfDives":7,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"f-session-06","dayId":"zone-f-day-4","warmupStartMinutes":835,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-015-group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":17.0,"numberOfDives":8,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-016-group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":24.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"f-practice-session-034","dayId":"zone-f-day-5","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"f-practice-034","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"f-session-07","dayId":"zone-f-day-5","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-017-group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":33.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-f-event-018-group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":19.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-019-group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":14.0,"numberOfDives":9,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"f-session-08","dayId":"zone-f-day-5","warmupStartMinutes":685,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-020-group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":22.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-f-event-021-group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":37.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"f-session-09","dayId":"zone-f-day-5","warmupStartMinutes":865,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-022-group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":9.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-023-group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":17.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-024-group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":28.0,"numberOfDives":8,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review platform load","customLabel":"Review platform load"}]}],"publishStatus":"draft","currentLibraryId":"seed-zone-f","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-jr-nationals","name":"2026 USA Diving Junior National Championships","builtIn":true,"savedAt":"2026-06-09T16:30:00.000Z","schedule":{"updatedAt":"2026-06-09T16:30:00.000Z","meet":{"name":"2026 USA Diving Junior National Championships","venue":"Peak Health Aquatic Center at Mylan Park, Morgantown, WV","city":"Morgantown, WV","timezone":"America/New_York","meetType":"custom","days":[{"id":"day-2026-07-28","date":"2026-07-28","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-29","date":"2026-07-29","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-30","date":"2026-07-30","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-31","date":"2026-07-31","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-01","date":"2026-08-01","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-02","date":"2026-08-02","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-03","date":"2026-08-03","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-04","date":"2026-08-04","openMinutes":390,"closeMinutes":1200}]},"sessions":[{"id":"jn-full-practice","dayId":"day-2026-07-28","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Junior Nationals official practice \u2014 full facility day","events":[{"id":"junior-nationals-official-practice-full-facility-day-event","style":"Custom Block","customLabel":"Junior Nationals official practice \u2014 full facility day","customDurationMinutes":420,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Full facility open practice day."}]},{"id":"jn-open-training-am","dayId":"day-2026-07-29","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open training \u2014 before 2 PM competition start","events":[{"id":"open-training-before-2-pm-competition-start-event","style":"Custom Block","customLabel":"Open training \u2014 before 2 PM competition start","customDurationMinutes":450,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training before the first competition block."}]},{"id":"jn-session-01","dayId":"day-2026-07-29","warmupStartMinutes":840,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 1","events":[{"id":"group-b-boys-1-meter-individual","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter-individual","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":10,"defaultDives":10,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-02","dayId":"day-2026-07-29","warmupStartMinutes":1030,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 2","events":[{"id":"group-b-boys-1-meter-individual","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter-individual","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-03","dayId":"day-2026-07-30","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 3","events":[{"id":"group-a-boys-1-meter-individual","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":10,"defaultDives":10,"numberOfDivers":47,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-3-meter-individual","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform-individual","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-04","dayId":"day-2026-07-30","warmupStartMinutes":725,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 4","events":[{"id":"group-a-girls-platform-individual","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":42,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-05","dayId":"day-2026-07-30","warmupStartMinutes":970,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 5","events":[{"id":"group-a-boys-1-meter-individual","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-3-meter-individual","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform-individual","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-06","dayId":"day-2026-07-30","warmupStartMinutes":1070,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 6","events":[{"id":"group-a-girls-platform-individual","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-07","dayId":"day-2026-07-31","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 7","events":[{"id":"group-b-girls-1-meter-individual","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-girls-3-meter-individual","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform-individual","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":33.0,"defaultSpd":33.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-08","dayId":"day-2026-07-31","warmupStartMinutes":715,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 8","events":[{"id":"group-c-boys-1-meter-individual","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter-individual","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":27,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-platform-individual","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-09","dayId":"day-2026-07-31","warmupStartMinutes":885,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 9","events":[{"id":"group-b-girls-1-meter-individual","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-girls-3-meter-individual","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform-individual","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-10","dayId":"day-2026-07-31","warmupStartMinutes":990,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 10","events":[{"id":"group-c-boys-1-meter-individual","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter-individual","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-platform-individual","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-11","dayId":"day-2026-08-01","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 11","events":[{"id":"group-a-girls-1-meter-individual","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter-individual","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":39,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-platform-individual","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":40,"secondsPerDive":34.0,"defaultSpd":34.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-12","dayId":"day-2026-08-01","warmupStartMinutes":670,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 12","events":[{"id":"group-d-girls-1-meter-individual","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter-individual","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-platform-individual","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":35,"secondsPerDive":36.0,"defaultSpd":36.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-13","dayId":"day-2026-08-01","warmupStartMinutes":865,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 13","events":[{"id":"group-a-girls-1-meter-individual","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter-individual","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-platform-individual","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-14","dayId":"day-2026-08-01","warmupStartMinutes":955,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 14","events":[{"id":"group-d-girls-1-meter-individual","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter-individual","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-platform-individual","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-15","dayId":"day-2026-08-02","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 15","events":[{"id":"group-c-girls-1-meter-individual","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-3-meter-individual","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform-individual","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-16","dayId":"day-2026-08-02","warmupStartMinutes":650,"warmupMinutes":40,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 16","events":[{"id":"group-c-girls-1-meter-individual","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-3-meter-individual","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform-individual","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-restricted-aug02","dayId":"day-2026-08-02","warmupStartMinutes":740,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open boards","events":[{"id":"restricted-senior-qualifier-open-boards-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open boards","customDurationMinutes":420,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"jn-session-17","dayId":"day-2026-08-03","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 17","events":[{"id":"group-d-boys-1-meter-individual","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-3-meter-individual","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":35,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform-individual","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":36,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-18","dayId":"day-2026-08-03","warmupStartMinutes":675,"warmupMinutes":40,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 18","events":[{"id":"group-d-boys-1-meter-individual","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-3-meter-individual","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform-individual","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-19","dayId":"day-2026-08-03","warmupStartMinutes":780,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 19","events":[{"id":"junior-14-18-girls-3-meter-synchronized","level":"Junior 14-18","gender":"Girls","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"junior-14-18-boys-platform-synchronized","level":"Junior 14-18","gender":"Boys","apparatus":"Platform","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-restricted-aug03","dayId":"day-2026-08-03","warmupStartMinutes":905,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open boards","events":[{"id":"restricted-senior-qualifier-open-boards-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open boards","customDurationMinutes":295,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"jn-senior-open-training","dayId":"day-2026-08-04","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Senior open training","events":[{"id":"senior-open-training-event","style":"Custom Block","customLabel":"Senior open training","customDurationMinutes":180,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"USA Nationals senior open training."}]},{"id":"jn-session-20","dayId":"day-2026-08-04","warmupStartMinutes":580,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 20","events":[{"id":"junior-14-18-boys-3-meter-synchronized","level":"Junior 14-18","gender":"Boys","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"junior-14-18-girls-platform-synchronized","level":"Junior 14-18","gender":"Girls","apparatus":"Platform","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-national-qualifier-training","dayId":"day-2026-08-04","warmupStartMinutes":705,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"National Qualifier open training","events":[{"id":"national-qualifier-open-training-event","style":"Custom Block","customLabel":"National Qualifier open training","customDurationMinutes":495,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Remainder of day restricted to USA Nationals / National Qualifier athletes."}]}],"publishStatus":"review","currentLibraryId":"saved-2026-jr-nationals","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-nationals","name":"2026 USA Diving National Championships & Qualifier","builtIn":true,"savedAt":"2026-06-09T16:30:00.000Z","schedule":{"updatedAt":"2026-06-09T16:30:00.000Z","meet":{"name":"2026 USA Diving National Championships & Qualifier","venue":"Peak Health Aquatic Center at Mylan Park, Morgantown, WV","city":"Morgantown, WV","timezone":"America/New_York","meetType":"custom","days":[{"id":"day-2026-08-04","date":"2026-08-04","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-05","date":"2026-08-05","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-06","date":"2026-08-06","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-07","date":"2026-08-07","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-08","date":"2026-08-08","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-09","date":"2026-08-09","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-10","date":"2026-08-10","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-11","date":"2026-08-11","openMinutes":390,"closeMinutes":1200}]},"sessions":[{"id":"sr-senior-open-training","dayId":"day-2026-08-04","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Senior open training","events":[{"id":"senior-open-training-event","style":"Custom Block","customLabel":"Senior open training","customDurationMinutes":180,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"USA Nationals senior open training."}]},{"id":"sr-national-qualifier-training","dayId":"day-2026-08-04","warmupStartMinutes":705,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"National Qualifier open training","events":[{"id":"national-qualifier-open-training-event","style":"Custom Block","customLabel":"National Qualifier open training","customDurationMinutes":495,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted to USA Nationals / National Qualifier athletes."}]},{"id":"sr-open-warmup-aug05","dayId":"day-2026-08-05","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open warm-up","events":[{"id":"restricted-senior-qualifier-open-warm-up-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open warm-up","customDurationMinutes":300,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-technical-meeting","dayId":"day-2026-08-05","warmupStartMinutes":720,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Technical Meeting","events":[{"id":"technical-meeting-event","style":"Custom Block","customLabel":"Technical Meeting","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Technical Meeting"}]},{"id":"sr-open-training-aug05","dayId":"day-2026-08-05","warmupStartMinutes":785,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open training","events":[{"id":"restricted-senior-qualifier-open-training-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open training","customDurationMinutes":175,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-20","dayId":"day-2026-08-05","warmupStartMinutes":960,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 20","events":[{"id":"national-qualifier-men-3-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-women-10-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":17,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-open-practice-aug06","dayId":"day-2026-08-06","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-event","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open Training"}]},{"id":"sr-session-21","dayId":"day-2026-08-06","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 21","events":[{"id":"national-qualifier-men-10-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":11,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-women-1-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":34,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-22","dayId":"day-2026-08-06","warmupStartMinutes":840,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 22","events":[{"id":"national-qualifier-women-3-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":40,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-men-1-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":25,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug07-am","dayId":"day-2026-08-07","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-23","dayId":"day-2026-08-07","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 23","events":[{"id":"senior-men-3-meter-individual","level":"Senior","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":43,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-10-meter-individual","level":"Senior","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":28,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-24","dayId":"day-2026-08-07","warmupStartMinutes":960,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 24","events":[{"id":"senior-men-3-meter-individual","level":"Senior","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-25","dayId":"day-2026-08-07","warmupStartMinutes":1045,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 25","events":[{"id":"senior-women-10-meter-individual","level":"Senior","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug08-am","dayId":"day-2026-08-08","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-26","dayId":"day-2026-08-08","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 26","events":[{"id":"senior-men-1-meter-individual","level":"Senior","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-3-meter-individual","level":"Senior","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":33,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-27","dayId":"day-2026-08-08","warmupStartMinutes":910,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 27","events":[{"id":"senior-men-1-meter-individual","level":"Senior","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-28","dayId":"day-2026-08-08","warmupStartMinutes":1015,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 28","events":[{"id":"senior-women-3-meter-individual","level":"Senior","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug09-am","dayId":"day-2026-08-09","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-29","dayId":"day-2026-08-09","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 29","events":[{"id":"senior-men-10-meter-individual","level":"Senior","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":28,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-1-meter-individual","level":"Senior","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":29,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-30","dayId":"day-2026-08-09","warmupStartMinutes":970,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 30","events":[{"id":"senior-men-10-meter-individual","level":"Senior","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-31","dayId":"day-2026-08-09","warmupStartMinutes":1065,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 31","events":[{"id":"senior-women-1-meter-individual","level":"Senior","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug10-am","dayId":"day-2026-08-10","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-32","dayId":"day-2026-08-10","warmupStartMinutes":535,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 32","events":[{"id":"senior-synchro-women-10-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"10-Meter","style":"Synchronized","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":6,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-3-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"3-Meter","style":"Synchronized","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":9,"secondsPerDive":34.0,"defaultSpd":34.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-33","dayId":"day-2026-08-10","warmupStartMinutes":815,"warmupMinutes":30,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 33","events":[{"id":"senior-synchro-women-10-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"10-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":6,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-3-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":9,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug11-am","dayId":"day-2026-08-11","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-34","dayId":"day-2026-08-11","warmupStartMinutes":535,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 34","events":[{"id":"senior-synchro-women-3-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"3-Meter","style":"Synchronized","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":5,"secondsPerDive":40.0,"defaultSpd":40.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-10-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"10-Meter","style":"Synchronized","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":7,"secondsPerDive":40.0,"defaultSpd":40.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-35","dayId":"day-2026-08-11","warmupStartMinutes":815,"warmupMinutes":30,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 35","events":[{"id":"senior-synchro-women-3-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":5,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-10-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"10-Meter","style":"Synchronized","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":7,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]}],"publishStatus":"review","currentLibraryId":"saved-2026-nationals","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-combined","name":"2026 Combined Junior & USA National Championships","builtIn":true,"savedAt":"2026-06-09T16:30:00.000Z","schedule":{"updatedAt":"2026-06-09T16:30:00.000Z","meet":{"name":"2026 Combined Junior & USA National Championships","venue":"Peak Health Aquatic Center at Mylan Park, Morgantown, WV","city":"Morgantown, WV","timezone":"America/New_York","meetType":"custom","days":[{"id":"day-2026-07-28","date":"2026-07-28","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-29","date":"2026-07-29","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-30","date":"2026-07-30","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-31","date":"2026-07-31","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-01","date":"2026-08-01","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-02","date":"2026-08-02","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-03","date":"2026-08-03","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-04","date":"2026-08-04","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-05","date":"2026-08-05","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-06","date":"2026-08-06","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-07","date":"2026-08-07","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-08","date":"2026-08-08","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-09","date":"2026-08-09","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-10","date":"2026-08-10","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-11","date":"2026-08-11","openMinutes":390,"closeMinutes":1200}]},"sessions":[{"id":"jn-full-practice","dayId":"day-2026-07-28","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Junior Nationals official practice \u2014 full facility day","events":[{"id":"junior-nationals-official-practice-full-facility-day-event","style":"Custom Block","customLabel":"Junior Nationals official practice \u2014 full facility day","customDurationMinutes":420,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Full facility open practice day."}]},{"id":"jn-open-training-am","dayId":"day-2026-07-29","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open training \u2014 before 2 PM competition start","events":[{"id":"open-training-before-2-pm-competition-start-event","style":"Custom Block","customLabel":"Open training \u2014 before 2 PM competition start","customDurationMinutes":450,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training before the first competition block."}]},{"id":"jn-session-01","dayId":"day-2026-07-29","warmupStartMinutes":840,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 1","events":[{"id":"group-b-boys-1-meter-individual","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter-individual","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":10,"defaultDives":10,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-02","dayId":"day-2026-07-29","warmupStartMinutes":1030,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 2","events":[{"id":"group-b-boys-1-meter-individual","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter-individual","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-03","dayId":"day-2026-07-30","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 3","events":[{"id":"group-a-boys-1-meter-individual","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":10,"defaultDives":10,"numberOfDivers":47,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-3-meter-individual","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform-individual","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-04","dayId":"day-2026-07-30","warmupStartMinutes":725,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 4","events":[{"id":"group-a-girls-platform-individual","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":42,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-05","dayId":"day-2026-07-30","warmupStartMinutes":970,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 5","events":[{"id":"group-a-boys-1-meter-individual","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-3-meter-individual","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform-individual","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-06","dayId":"day-2026-07-30","warmupStartMinutes":1070,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 6","events":[{"id":"group-a-girls-platform-individual","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-07","dayId":"day-2026-07-31","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 7","events":[{"id":"group-b-girls-1-meter-individual","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-girls-3-meter-individual","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform-individual","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":33.0,"defaultSpd":33.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-08","dayId":"day-2026-07-31","warmupStartMinutes":715,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 8","events":[{"id":"group-c-boys-1-meter-individual","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter-individual","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":27,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-platform-individual","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-09","dayId":"day-2026-07-31","warmupStartMinutes":885,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 9","events":[{"id":"group-b-girls-1-meter-individual","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-girls-3-meter-individual","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform-individual","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-10","dayId":"day-2026-07-31","warmupStartMinutes":990,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 10","events":[{"id":"group-c-boys-1-meter-individual","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter-individual","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-platform-individual","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-11","dayId":"day-2026-08-01","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 11","events":[{"id":"group-a-girls-1-meter-individual","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter-individual","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":39,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-platform-individual","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":40,"secondsPerDive":34.0,"defaultSpd":34.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-12","dayId":"day-2026-08-01","warmupStartMinutes":670,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 12","events":[{"id":"group-d-girls-1-meter-individual","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter-individual","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-platform-individual","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":35,"secondsPerDive":36.0,"defaultSpd":36.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-13","dayId":"day-2026-08-01","warmupStartMinutes":865,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 13","events":[{"id":"group-a-girls-1-meter-individual","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter-individual","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-platform-individual","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-14","dayId":"day-2026-08-01","warmupStartMinutes":955,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 14","events":[{"id":"group-d-girls-1-meter-individual","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter-individual","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-platform-individual","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-15","dayId":"day-2026-08-02","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 15","events":[{"id":"group-c-girls-1-meter-individual","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-3-meter-individual","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform-individual","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-16","dayId":"day-2026-08-02","warmupStartMinutes":650,"warmupMinutes":40,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 16","events":[{"id":"group-c-girls-1-meter-individual","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-3-meter-individual","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform-individual","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-restricted-aug02","dayId":"day-2026-08-02","warmupStartMinutes":740,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open boards","events":[{"id":"restricted-senior-qualifier-open-boards-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open boards","customDurationMinutes":420,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"jn-session-17","dayId":"day-2026-08-03","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 17","events":[{"id":"group-d-boys-1-meter-individual","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-3-meter-individual","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":35,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform-individual","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":36,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-18","dayId":"day-2026-08-03","warmupStartMinutes":675,"warmupMinutes":40,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 18","events":[{"id":"group-d-boys-1-meter-individual","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-3-meter-individual","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform-individual","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-19","dayId":"day-2026-08-03","warmupStartMinutes":780,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 19","events":[{"id":"junior-14-18-girls-3-meter-synchronized","level":"Junior 14-18","gender":"Girls","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"junior-14-18-boys-platform-synchronized","level":"Junior 14-18","gender":"Boys","apparatus":"Platform","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-restricted-aug03","dayId":"day-2026-08-03","warmupStartMinutes":905,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open boards","events":[{"id":"restricted-senior-qualifier-open-boards-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open boards","customDurationMinutes":295,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"jn-senior-open-training","dayId":"day-2026-08-04","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Senior open training","events":[{"id":"senior-open-training-event","style":"Custom Block","customLabel":"Senior open training","customDurationMinutes":180,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"USA Nationals senior open training."}]},{"id":"jn-session-20","dayId":"day-2026-08-04","warmupStartMinutes":580,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 20","events":[{"id":"junior-14-18-boys-3-meter-synchronized","level":"Junior 14-18","gender":"Boys","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"junior-14-18-girls-platform-synchronized","level":"Junior 14-18","gender":"Girls","apparatus":"Platform","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-national-qualifier-training","dayId":"day-2026-08-04","warmupStartMinutes":705,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"National Qualifier open training","events":[{"id":"national-qualifier-open-training-event","style":"Custom Block","customLabel":"National Qualifier open training","customDurationMinutes":495,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Remainder of day restricted to USA Nationals / National Qualifier athletes."}]},{"id":"sr-open-warmup-aug05","dayId":"day-2026-08-05","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open warm-up","events":[{"id":"restricted-senior-qualifier-open-warm-up-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open warm-up","customDurationMinutes":300,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-technical-meeting","dayId":"day-2026-08-05","warmupStartMinutes":720,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Technical Meeting","events":[{"id":"technical-meeting-event","style":"Custom Block","customLabel":"Technical Meeting","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Technical Meeting"}]},{"id":"sr-open-training-aug05","dayId":"day-2026-08-05","warmupStartMinutes":785,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open training","events":[{"id":"restricted-senior-qualifier-open-training-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open training","customDurationMinutes":175,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-20","dayId":"day-2026-08-05","warmupStartMinutes":960,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 20","events":[{"id":"national-qualifier-men-3-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-women-10-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":17,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-open-practice-aug06","dayId":"day-2026-08-06","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-event","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open Training"}]},{"id":"sr-session-21","dayId":"day-2026-08-06","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 21","events":[{"id":"national-qualifier-men-10-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":11,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-women-1-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":34,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-22","dayId":"day-2026-08-06","warmupStartMinutes":840,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 22","events":[{"id":"national-qualifier-women-3-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":40,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-men-1-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":25,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug07-am","dayId":"day-2026-08-07","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-23","dayId":"day-2026-08-07","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 23","events":[{"id":"senior-men-3-meter-individual","level":"Senior","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":43,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-10-meter-individual","level":"Senior","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":28,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-24","dayId":"day-2026-08-07","warmupStartMinutes":960,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 24","events":[{"id":"senior-men-3-meter-individual","level":"Senior","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-25","dayId":"day-2026-08-07","warmupStartMinutes":1045,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 25","events":[{"id":"senior-women-10-meter-individual","level":"Senior","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug08-am","dayId":"day-2026-08-08","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-26","dayId":"day-2026-08-08","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 26","events":[{"id":"senior-men-1-meter-individual","level":"Senior","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-3-meter-individual","level":"Senior","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":33,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-27","dayId":"day-2026-08-08","warmupStartMinutes":910,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 27","events":[{"id":"senior-men-1-meter-individual","level":"Senior","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-28","dayId":"day-2026-08-08","warmupStartMinutes":1015,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 28","events":[{"id":"senior-women-3-meter-individual","level":"Senior","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug09-am","dayId":"day-2026-08-09","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-29","dayId":"day-2026-08-09","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 29","events":[{"id":"senior-men-10-meter-individual","level":"Senior","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":28,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-1-meter-individual","level":"Senior","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":29,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-30","dayId":"day-2026-08-09","warmupStartMinutes":970,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 30","events":[{"id":"senior-men-10-meter-individual","level":"Senior","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-31","dayId":"day-2026-08-09","warmupStartMinutes":1065,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 31","events":[{"id":"senior-women-1-meter-individual","level":"Senior","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug10-am","dayId":"day-2026-08-10","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-32","dayId":"day-2026-08-10","warmupStartMinutes":535,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 32","events":[{"id":"senior-synchro-women-10-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"10-Meter","style":"Synchronized","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":6,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-3-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"3-Meter","style":"Synchronized","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":9,"secondsPerDive":34.0,"defaultSpd":34.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-33","dayId":"day-2026-08-10","warmupStartMinutes":815,"warmupMinutes":30,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 33","events":[{"id":"senior-synchro-women-10-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"10-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":6,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-3-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":9,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug11-am","dayId":"day-2026-08-11","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-34","dayId":"day-2026-08-11","warmupStartMinutes":535,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 34","events":[{"id":"senior-synchro-women-3-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"3-Meter","style":"Synchronized","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":5,"secondsPerDive":40.0,"defaultSpd":40.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-10-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"10-Meter","style":"Synchronized","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":7,"secondsPerDive":40.0,"defaultSpd":40.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-35","dayId":"day-2026-08-11","warmupStartMinutes":815,"warmupMinutes":30,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 35","events":[{"id":"senior-synchro-women-3-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":5,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-10-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"10-Meter","style":"Synchronized","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":7,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]}],"publishStatus":"review","currentLibraryId":"saved-2026-combined","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-east-championship","name":"2026 USA Diving East Championship","builtIn":true,"savedAt":"2026-06-23T00:00:00.000Z","schedule":{"updatedAt":"2026-06-23T00:00:00.000Z","meet":{"name":"2026 USA Diving East Championship","venue":"Competition Pool","city":"","timezone":"America/New_York","meetType":"eastWestCentral","days":[{"id":"day-2026-06-23","date":"2026-06-23","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-24","date":"2026-06-24","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-25","date":"2026-06-25","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-26","date":"2026-06-26","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-27","date":"2026-06-27","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-28","date":"2026-06-28","openMinutes":360,"closeMinutes":1260}]},"sessions":[{"id":"east-blk-1","dayId":"day-2026-06-23","warmupStartMinutes":840,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-1","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":360,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"east-blk-2","dayId":"day-2026-06-24","warmupStartMinutes":780,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-2","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":360,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Zone A: 1:00\u20133:00 PM, Zone B: 3:00\u20135:00 PM, Zone A: 5:00\u20136:00 PM, Zone B: 6:00\u20137:00 PM"}]},{"id":"east-blk-3","dayId":"day-2026-06-24","warmupStartMinutes":1140,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Technical Meeting","events":[{"id":"technical-meeting-3","style":"Custom Block","customLabel":"Technical Meeting","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Technical Meeting"}]},{"id":"east-blk-4","dayId":"day-2026-06-25","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-4","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"east-s01","dayId":"day-2026-06-25","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s02","dayId":"day-2026-06-25","warmupStartMinutes":630,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s03","dayId":"day-2026-06-25","warmupStartMinutes":775,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-5","dayId":"day-2026-06-25","warmupStartMinutes":885,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-5","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"east-s04","dayId":"day-2026-06-25","warmupStartMinutes":955,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s05","dayId":"day-2026-06-25","warmupStartMinutes":1040,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s06","dayId":"day-2026-06-25","warmupStartMinutes":1110,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-6","dayId":"day-2026-06-26","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-6","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"east-s07","dayId":"day-2026-06-26","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s08","dayId":"day-2026-06-26","warmupStartMinutes":655,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s09","dayId":"day-2026-06-26","warmupStartMinutes":795,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-7","dayId":"day-2026-06-26","warmupStartMinutes":905,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-7","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"east-s10","dayId":"day-2026-06-26","warmupStartMinutes":975,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s11","dayId":"day-2026-06-26","warmupStartMinutes":1045,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s12","dayId":"day-2026-06-26","warmupStartMinutes":1110,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-8","dayId":"day-2026-06-27","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-8","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"east-s13","dayId":"day-2026-06-27","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s14","dayId":"day-2026-06-27","warmupStartMinutes":620,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s15","dayId":"day-2026-06-27","warmupStartMinutes":735,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-9","dayId":"day-2026-06-27","warmupStartMinutes":810,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-9","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"east-s16","dayId":"day-2026-06-27","warmupStartMinutes":880,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s17","dayId":"day-2026-06-27","warmupStartMinutes":955,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s18","dayId":"day-2026-06-27","warmupStartMinutes":1015,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-10","dayId":"day-2026-06-28","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-10","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"east-s19","dayId":"day-2026-06-28","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s20","dayId":"day-2026-06-28","warmupStartMinutes":645,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s21","dayId":"day-2026-06-28","warmupStartMinutes":765,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-11","dayId":"day-2026-06-28","warmupStartMinutes":875,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-11","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":65,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"east-s22","dayId":"day-2026-06-28","warmupStartMinutes":940,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s23","dayId":"day-2026-06-28","warmupStartMinutes":1010,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s24","dayId":"day-2026-06-28","warmupStartMinutes":1075,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]}],"publishStatus":"review","currentLibraryId":"saved-2026-east-championship","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-west-championship","name":"2026 USA Diving West Championship","builtIn":true,"savedAt":"2026-06-23T00:00:00.000Z","schedule":{"updatedAt":"2026-06-23T00:00:00.000Z","meet":{"name":"2026 USA Diving West Championship","venue":"Competition Pool","city":"","timezone":"America/New_York","meetType":"eastWestCentral","days":[{"id":"day-2026-06-23","date":"2026-06-23","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-24","date":"2026-06-24","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-25","date":"2026-06-25","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-26","date":"2026-06-26","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-27","date":"2026-06-27","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-28","date":"2026-06-28","openMinutes":360,"closeMinutes":1260}]},"sessions":[{"id":"west-blk-1","dayId":"day-2026-06-23","warmupStartMinutes":660,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-1","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":540,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"west-blk-2","dayId":"day-2026-06-24","warmupStartMinutes":480,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-2","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":660,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Flighted: Dryland opens 7:30 AM. Zone F: 8\u201310 AM and 1\u20133 PM. Zone E: 10 AM\u201312 PM and 3\u20135 PM. Open: 12\u20131 PM and 5\u20137 PM."}]},{"id":"west-blk-3","dayId":"day-2026-06-24","warmupStartMinutes":1140,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Technical Meeting","events":[{"id":"technical-meeting-3","style":"Custom Block","customLabel":"Technical Meeting","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Technical Meeting"}]},{"id":"west-blk-4","dayId":"day-2026-06-25","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-4","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"west-s01","dayId":"day-2026-06-25","warmupStartMinutes":505,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s02","dayId":"day-2026-06-25","warmupStartMinutes":655,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s03","dayId":"day-2026-06-25","warmupStartMinutes":800,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-5","dayId":"day-2026-06-25","warmupStartMinutes":920,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-5","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"west-s04","dayId":"day-2026-06-25","warmupStartMinutes":1020,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s05","dayId":"day-2026-06-25","warmupStartMinutes":1090,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s06","dayId":"day-2026-06-25","warmupStartMinutes":1160,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-6","dayId":"day-2026-06-26","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-6","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"west-s07","dayId":"day-2026-06-26","warmupStartMinutes":505,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s08","dayId":"day-2026-06-26","warmupStartMinutes":690,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s09","dayId":"day-2026-06-26","warmupStartMinutes":795,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-7","dayId":"day-2026-06-26","warmupStartMinutes":890,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-7","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"west-s10","dayId":"day-2026-06-26","warmupStartMinutes":990,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s11","dayId":"day-2026-06-26","warmupStartMinutes":1060,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s12","dayId":"day-2026-06-26","warmupStartMinutes":1125,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-8","dayId":"day-2026-06-27","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-8","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"west-s13","dayId":"day-2026-06-27","warmupStartMinutes":505,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s14","dayId":"day-2026-06-27","warmupStartMinutes":630,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s15","dayId":"day-2026-06-27","warmupStartMinutes":730,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-9","dayId":"day-2026-06-27","warmupStartMinutes":820,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-9","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"west-s16","dayId":"day-2026-06-27","warmupStartMinutes":920,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s17","dayId":"day-2026-06-27","warmupStartMinutes":995,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s18","dayId":"day-2026-06-27","warmupStartMinutes":1055,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-10","dayId":"day-2026-06-28","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-10","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"west-s19","dayId":"day-2026-06-28","warmupStartMinutes":505,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s20","dayId":"day-2026-06-28","warmupStartMinutes":620,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s21","dayId":"day-2026-06-28","warmupStartMinutes":720,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-11","dayId":"day-2026-06-28","warmupStartMinutes":815,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-11","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"west-s22","dayId":"day-2026-06-28","warmupStartMinutes":915,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s23","dayId":"day-2026-06-28","warmupStartMinutes":985,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s24","dayId":"day-2026-06-28","warmupStartMinutes":1050,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]}],"publishStatus":"review","currentLibraryId":"saved-2026-west-championship","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-central-championship","name":"2026 USA Diving Central Championship","builtIn":true,"savedAt":"2026-06-23T00:00:00.000Z","schedule":{"updatedAt":"2026-06-23T00:00:00.000Z","meet":{"name":"2026 USA Diving Central Championship","venue":"Competition Pool","city":"","timezone":"America/New_York","meetType":"eastWestCentral","days":[{"id":"day-2026-06-23","date":"2026-06-23","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-24","date":"2026-06-24","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-25","date":"2026-06-25","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-26","date":"2026-06-26","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-27","date":"2026-06-27","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-28","date":"2026-06-28","openMinutes":360,"closeMinutes":1260}]},"sessions":[{"id":"central-blk-1","dayId":"day-2026-06-23","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-1","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":870,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-blk-2","dayId":"day-2026-06-24","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-2","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":750,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-blk-3","dayId":"day-2026-06-24","warmupStartMinutes":1140,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Technical Meeting","events":[{"id":"technical-meeting-3","style":"Custom Block","customLabel":"Technical Meeting","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Technical Meeting"}]},{"id":"central-blk-4","dayId":"day-2026-06-25","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-4","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-s01","dayId":"day-2026-06-25","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s02","dayId":"day-2026-06-25","warmupStartMinutes":640,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s03","dayId":"day-2026-06-25","warmupStartMinutes":735,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-5","dayId":"day-2026-06-25","warmupStartMinutes":855,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-5","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"central-s04","dayId":"day-2026-06-25","warmupStartMinutes":985,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s05","dayId":"day-2026-06-25","warmupStartMinutes":1055,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s06","dayId":"day-2026-06-25","warmupStartMinutes":1125,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-6","dayId":"day-2026-06-26","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-6","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-s07","dayId":"day-2026-06-26","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s08","dayId":"day-2026-06-26","warmupStartMinutes":640,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s09","dayId":"day-2026-06-26","warmupStartMinutes":780,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-7","dayId":"day-2026-06-26","warmupStartMinutes":880,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-7","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":130,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"central-s10","dayId":"day-2026-06-26","warmupStartMinutes":1020,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s11","dayId":"day-2026-06-26","warmupStartMinutes":1090,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s12","dayId":"day-2026-06-26","warmupStartMinutes":1155,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-8","dayId":"day-2026-06-27","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-8","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-s13","dayId":"day-2026-06-27","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s14","dayId":"day-2026-06-27","warmupStartMinutes":620,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s15","dayId":"day-2026-06-27","warmupStartMinutes":765,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-9","dayId":"day-2026-06-27","warmupStartMinutes":830,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-9","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"central-s16","dayId":"day-2026-06-27","warmupStartMinutes":960,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s17","dayId":"day-2026-06-27","warmupStartMinutes":1035,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s18","dayId":"day-2026-06-27","warmupStartMinutes":1095,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-10","dayId":"day-2026-06-28","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-10","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-s19","dayId":"day-2026-06-28","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s20","dayId":"day-2026-06-28","warmupStartMinutes":635,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s21","dayId":"day-2026-06-28","warmupStartMinutes":725,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-11","dayId":"day-2026-06-28","warmupStartMinutes":805,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-11","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":110,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"central-s22","dayId":"day-2026-06-28","warmupStartMinutes":925,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s23","dayId":"day-2026-06-28","warmupStartMinutes":995,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s24","dayId":"day-2026-06-28","warmupStartMinutes":1060,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]}],"publishStatus":"review","currentLibraryId":"saved-2026-central-championship","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}}];



// ── CONFIG ────────────────────────────────────────────────────────────
const SK='usa-diving-sb-v4',LK='usa-diving-sb-v4-lib';
const EDITOR_ID=localStorage.getItem('sb-eid')||(()=>{const i='e'+Math.random().toString(36).slice(2,8);localStorage.setItem('sb-eid',i);return i})();
const NEON='postgresql://neondb_owner:npg_SN1ULPtYhC6J@ep-holy-bird-aj5deo63-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require';
const STATUS=['draft','review','ready','published'];
const STATUS_LBL={draft:'Draft',review:'In Review',ready:'Ready',published:'Published'};
const TZS=[{v:'America/New_York',l:'Eastern (ET)',s:'ET'},{v:'America/Chicago',l:'Central (CT)',s:'CT'},{v:'America/Denver',l:'Mountain (MT)',s:'MT'},{v:'America/Los_Angeles',l:'Pacific (PT)',s:'PT'}];
const MEET_TYPES={zone:{l:'Zone Championship',groups:['Group A','Group B','Group C','Group D'],plat:true,rounds:['Qualifier']},regional:{l:'Regional Championship',groups:['Group A','Group B'],plat:false,rounds:['Qualifier']},eastWestCentral:{l:'East/West/Central',groups:['Group A','Group B','Group C','Group D'],plat:true,rounds:['Prelim','Final']},juniorNationals:{l:'Junior Nationals',groups:['Group A','Group B','Group C','Group D'],plat:true,rounds:['Prelim','Final']},usaNationals:{l:'USA Nationals',groups:[],plat:true,rounds:['Qualifier','Prelim','Final'],senior:true},custom:{l:'Custom',groups:['Group A','Group B','Group C','Group D'],plat:true,rounds:['Qualifier','Prelim','Semifinal','Final'],senior:true}};
// ── USA DIVING 2026 RULEBOOK — DIVE COUNTS (Article 302) ──────────────
// fullList = Prelim / Qualifier / "one list" dive count
// finalsOptionals = Finals dive count (optional/without-limit dives only)
// Junior groups: A=16-18, B=14/15, C=12/13, D=11&under
const RULEBOOK_DIVES={
  // ── Springboard (1-Meter & 3-Meter identical counts) — Art. 302.1 ──
  'Group A Girls 1-Meter':{full:9,finals:4},'Group A Girls 3-Meter':{full:9,finals:4},
  'Group A Boys 1-Meter':{full:10,finals:5},'Group A Boys 3-Meter':{full:10,finals:5},
  'Group B Girls 1-Meter':{full:8,finals:3},'Group B Girls 3-Meter':{full:8,finals:3},
  'Group B Boys 1-Meter':{full:9,finals:4},'Group B Boys 3-Meter':{full:9,finals:4},
  'Group C Girls 1-Meter':{full:7,finals:2},'Group C Girls 3-Meter':{full:7,finals:2},
  'Group C Boys 1-Meter':{full:8,finals:3},'Group C Boys 3-Meter':{full:8,finals:3},
  'Group D Girls 1-Meter':{full:6,finals:2},'Group D Girls 3-Meter':{full:6,finals:2},
  'Group D Boys 1-Meter':{full:6,finals:2},'Group D Boys 3-Meter':{full:6,finals:2},
  // ── Platform — Art. 302.2 ──
  'Group A Girls Platform':{full:8,finals:4},'Group A Boys Platform':{full:9,finals:5},
  'Group B Girls Platform':{full:7,finals:3},'Group B Boys Platform':{full:8,finals:4},
  'Group C Girls Platform':{full:6,finals:2},'Group C Boys Platform':{full:7,finals:3},
  'Group D Girls Platform':{full:6,finals:2},'Group D Boys Platform':{full:6,finals:2},
};
// Seconds-per-dive estimates by group/apparatus (timing only; not a rulebook value)
const SPD_TABLE={
  'Group A':{board:32,plat:38},'Group B':{board:34,plat:42},
  'Group C':{board:35,plat:45},'Group D':{board:35,plat:45},'Senior':{board:32,plat:38}};
// Returns the locked dive count for an event given its round
function rulebookDives(level,gender,apparatus,round){
  const app=isPlatform(apparatus)?'Platform':al(apparatus);
  const key=`${level} ${gender} ${app}`;
  const rec=RULEBOOK_DIVES[key];
  if(!rec)return null; // senior/custom — no rulebook lock
  // Finals = optionals only; everything else (Prelim, Qualifier, one-list) = full
  return round==='Final'?rec.finals:rec.full;
}
function rulebookSpd(level,apparatus){
  const rec=SPD_TABLE[level]||SPD_TABLE['Group A'];
  return isPlatform(apparatus)?rec.plat:rec.board;
}
// Back-compat shim: some code still reads EV_TIMING[name].dives / .spd
const EV_TIMING=new Proxy({},{get(_,name){
  if(typeof name!=='string')return undefined;
  const rec=RULEBOOK_DIVES[name];
  const parts=name.split(' ');const level=parts[0]+' '+parts[1];
  const app=name.includes('Platform')?'Platform':name.includes('1-Meter')?'1m':'3m';
  return{dives:rec?rec.full:6,spd:rulebookSpd(level,app)};
}});
const LIB_FOLDERS={
  'Zone Championships':{icon:'🌊',ids:['seed-zone-b','seed-zone-e','seed-zone-f']},
  'East / West / Central':{icon:'🗺️',ids:['saved-2026-east-championship','saved-2026-west-championship','saved-2026-central-championship']},
  'Junior Nationals':{icon:'🥇',ids:['saved-2026-jr-nationals','saved-2026-combined']},
  'Senior / USA Nationals':{icon:'🇺🇸',ids:['saved-2026-nationals','saved-2026-combined']},
};
// Folders available for user saves (includes catch-all "Other")
const SAVE_FOLDERS=['Zone Championships','East / West / Central','Junior Nationals','Senior / USA Nationals','Other'];
const SAVE_FOLDER_ICONS={'Zone Championships':'🌊','East / West / Central':'🗺️','Junior Nationals':'🥇','Senior / USA Nationals':'🇺🇸','Other':'📌'};
// Infer a folder from a saved schedule when none is stored (legacy saves)
function inferFolder(item){
  if(item.folder)return item.folder;
  const mt=(item.meetType||'').toLowerCase();
  const nm=(item.name||'').toLowerCase();
  if(mt==='zone')return 'Zone Championships';
  if(mt==='eastwestcentral'||/east|west|central/.test(nm))return 'East / West / Central';
  if(/junior/.test(nm))return 'Junior Nationals';
  if(/senior|usa national|national qualifier/.test(nm))return 'Senior / USA Nationals';
  return 'Other';
}
const AUD={public:{l:'Public',showWU:false,showSec:false,showTimes:false,showEntries:false,practiceTop:false,showFlightCounts:true},athletes:{l:'Athletes',showWU:true,showSec:false,showTimes:true,showEntries:false,practiceTop:false,showFlightCounts:true},judges:{l:'Judges',showWU:true,showSec:true,showTimes:true,showEntries:true,practiceTop:false,showFlightCounts:true},internal:{l:'Operations',showWU:true,showSec:true,showTimes:true,showEntries:true,practiceTop:false,showFlightCounts:true}};

// ── UTILS ─────────────────────────────────────────────────────────────
const uid=()=>Math.random().toString(36).slice(2,10);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const ru=(n,inc)=>inc<=0?n:Math.ceil(n/inc)*inc;
function ruUp(v,n){n=n||5;return Math.ceil(Number(v)/n)*n;}
const pt=s=>{if(typeof s==='number')return s;const[h,m]=String(s||'00:00').split(':').map(Number);return(h||0)*60+(m||0)};
const f24=m=>{m=Math.max(0,Math.round(m));return`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`};
const f12=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60)%24,mn=m%60,ap=h>=12?'PM':'AM',h12=h%12||12;return`${h12}:${String(mn).padStart(2,'0')} ${ap}`};
const f12r=(s,e)=>{s=Math.max(0,Math.round(s));e=Math.max(0,Math.round(e));const sh=Math.floor(s/60)%24,sm=s%60,eh=Math.floor(e/60)%24,em=e%60,sa=sh>=12?'PM':'AM',ea=eh>=12?'PM':'AM',s12=sh%12||12,e12=eh%12||12,sMM=String(sm).padStart(2,'0'),eMM=String(em).padStart(2,'0');return sa===ea?`${s12}:${sMM} – ${e12}:${eMM} ${ea}`:`${s12}:${sMM} ${sa} – ${e12}:${eMM} ${ea}`};
const fdur=m=>{m=Math.round(m);if(m<60)return`${m}m`;const h=Math.floor(m/60),r=m%60;return r?`${h}h ${r}m`:`${h}h`};
const fd1=n=>Number(n||0).toFixed(1);
const isPlatform=a=>['Platform','10m','10-Meter'].includes(a);
const lk=a=>['1m','1-Meter'].includes(a)?'1m':['3m','3-Meter'].includes(a)?'3m':isPlatform(a)?'platform':'other';
const al=a=>a==='1m'?'1-Meter':a==='3m'?'3-Meter':a;
const evName=ev=>{if(ev.style==='Custom Block')return ev.customLabel||ev.title||'Custom block';return`${ev.level||''} ${ev.gender} ${al(ev.apparatus)}`.replace(/\s+/g,' ').trim()};
const shortDate=ds=>{const d=new Date(`${ds}T00:00:00`);return isNaN(d)?ds:d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})};
const fullDate=ds=>{const d=new Date(`${ds}T00:00:00`);return isNaN(d)?ds:d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})};
const toast=(msg,dur=2400)=>{const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur)};

// ── NEON ──────────────────────────────────────────────────────────────
let sync={ok:false,saving:false,err:null},saveTimer=null,lastSynced=null;
async function nq(sql,params=[]){
  let r;
  const _proxy = window.USAD_CONFIG && window.USAD_CONFIG.neon && window.USAD_CONFIG.neon.proxy === true;
  try{
    if (_proxy) {
      // Vercel read-only deployment: route through the server-side proxy —
      // no database credential ever reaches this browser. The proxy itself
      // enforces read-only (rejects anything but a single SELECT/WITH).
      r=await fetch('/api/neon',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({query:sql,params:(params||[]).map(p=>p===null||p===undefined?null:String(p))})
      });
    } else {
    // NOTE: We do NOT send Content-Type header. Neon's CORS preflight rejects
    // content-type: application/json — it only allows specific Neon-* headers.
    // Without Content-Type, browser defaults to text/plain (simple CORS), which
    // doesn't trigger the preflight Content-Type check. Neon parses body as JSON
    // regardless of Content-Type. (This is how Neon's official serverless driver
    // works under the hood.)
    r=await fetch('https://ep-holy-bird-aj5deo63.c-3.us-east-2.aws.neon.tech/sql',{
      method:'POST',
      headers:{
        'Neon-Connection-String':NEON,
        'Neon-Raw-Text-Output':'false',
        'Neon-Array-Mode':'true'
      },
      body:JSON.stringify({query:sql,params:(params||[]).map(p=>p===null||p===undefined?null:String(p))})
    });
    }
  }catch(netErr){
    const e=new Error('Network: '+(netErr.message||'fetch failed'));e._kind='network';
    console.error('[Neon] network error:',netErr);throw e;
  }
  if(!r.ok){
    let body='';try{body=(await r.text()).slice(0,300);}catch{}
    console.error('[Neon] HTTP '+r.status+':',body,'\nQuery:',sql.slice(0,100));
    const e=new Error('HTTP '+r.status+(body?' — '+body:''));e._kind='http'+r.status;throw e;
  }
  return r.json();
}
// Manual retry — pings Neon with a cheap query to wake/check, called from the sync indicator
async function retryCloudSync(){
  const l=document.querySelector('.sync-lbl');
  if(l){l.textContent='Reconnecting…';}
  try{
    await nq('SELECT 1');
    sync.ok=true;sync.err=null;_pollFailures=0;setSyncDot('ok');toast('Back online ✓');
    // Push any local saves that haven't made it to cloud yet
    pushPendingLocalSaves().catch(e=>console.warn('Pending push error:',e));
    // Push current working state if it has a save record
    if(S.currentLibraryId&&S.libraryFolder)doSave().catch(()=>{});
    if(S.currentLibraryId)startSync();
    render();
  }catch(e){
    sync.err=e.message;setSyncDot('error');
    toast('Still offline: '+(e.message||'').slice(0,100),5000);
    console.error('Retry failed:',e);
  }
}
// Background heartbeat — every 60s while we're offline, try to wake Neon.
let _heartbeatT=null;
function startHeartbeat(){
  clearInterval(_heartbeatT);
  _heartbeatT=setInterval(async()=>{
    if(sync.err){
      try{
        await nq('SELECT 1');
        sync.ok=true;sync.err=null;_pollFailures=0;setSyncDot('ok');
        pushPendingLocalSaves().catch(()=>{});
        if(S.currentLibraryId&&S.libraryFolder)doSave().catch(()=>{});
        if(S.currentLibraryId)startSync();
        render();
      }catch{}
    }
  },60000);
}
startHeartbeat();
// Auto-detect new deploys: every 5 min, fetch the current page and compare
// the app-version meta tag. If different from what we booted with, offer to reload.
const _bootVersion=document.querySelector('meta[name="app-version"]')?.content||'';
let _updateOffered=false;
async function checkForUpdate(){
  if(_updateOffered)return;
  try{
    const r=await fetch(location.pathname+'?_v='+Date.now(),{cache:'no-store'});
    if(!r.ok)return;
    const html=await r.text();
    const m=html.match(/<meta name="app-version" content="([^"]+)"/);
    if(m&&m[1]&&m[1]!==_bootVersion){
      _updateOffered=true;
      const t=document.getElementById('toast');
      if(t){
        t.innerHTML='New version available · <button onclick="location.reload(true)" style="background:#fff;color:#171F69;border:none;padding:4px 10px;border-radius:5px;font-weight:700;margin-left:6px;cursor:pointer">Reload now</button>';
        t.classList.add('show');
        // Keep it visible until user acts or 30s
        setTimeout(()=>t.classList.remove('show'),30000);
      }
    }
  }catch{}
}
// First check 60s after load (avoid flashing on initial hit), then every 5 min
setTimeout(checkForUpdate,60000);
setInterval(checkForUpdate,300000);
function scheduleSave(){clearTimeout(saveTimer);setSyncDot('saving');saveTimer=setTimeout(doSave,3000)}
async function doSave(){
  if(!S.currentLibraryId)return;
  try{
    const r=await nq(`INSERT INTO schedule_builder.schedules(id,name,meet_type,year,publish_status,folder,data,updated_at)VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,now())ON CONFLICT(id)DO UPDATE SET name=EXCLUDED.name,meet_type=EXCLUDED.meet_type,publish_status=EXCLUDED.publish_status,folder=EXCLUDED.folder,data=EXCLUDED.data,updated_at=now() RETURNING updated_at`,[S.currentLibraryId,S.meet.name,S.meet.meetType,parseInt(S.meet.days[0]?.date)||2026,S.publishStatus||'draft',S.libraryFolder||null,JSON.stringify(S)]);
    // Use the DATABASE's own timestamp for updated_at, not the client clock.
    // Comparing a client-clock lastSynced against a server-clock updated_at
    // is exactly the kind of thing clock skew / network latency breaks —
    // this was intermittently making the poll below mistake this save for
    // someone else's edit and silently reload mid-keystroke.
    lastSynced=r.rows?.[0]?.[0]?new Date(r.rows[0][0]).toISOString():new Date().toISOString();
    sync.ok=true;sync.err=null;setSyncDot('ok');
  }catch(e){sync.err=e.message;setSyncDot('error')}
}
async function saveToNeon(name,folder){
  const id=S.currentLibraryId||uid();S.currentLibraryId=id;
  if(folder)S.libraryFolder=folder;
  setSyncDot('saving');
  try{
    const r=await nq(`INSERT INTO schedule_builder.schedules(id,name,meet_type,year,publish_status,folder,data,updated_at)VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,now())ON CONFLICT(id)DO UPDATE SET name=EXCLUDED.name,meet_type=EXCLUDED.meet_type,publish_status=EXCLUDED.publish_status,folder=EXCLUDED.folder,data=EXCLUDED.data,updated_at=now() RETURNING updated_at`,[id,name||S.meet.name,S.meet.meetType,parseInt(S.meet.days[0]?.date)||2026,S.publishStatus||'draft',S.libraryFolder||null,JSON.stringify(S)]);
    lastSynced=r.rows?.[0]?.[0]?new Date(r.rows[0][0]).toISOString():new Date().toISOString();
    sync.ok=true;sync.err=null;saveS();setSyncDot('ok');startSync();saveVersion('Manual save');
    return true;
  }catch(e){
    sync.err=e.message;setSyncDot('error');
    throw e; // re-throw so callers can fall back to local
  }
}

// Insert or update an entry in the local library (LK)
function upsertLocalSave(entry){
  const lib=JSON.parse(localStorage.getItem(LK)||'[]');
  const idx=lib.findIndex(x=>x.id===entry.id);
  if(idx>=0)lib[idx]=entry;
  else lib.unshift(entry);
  // Keep 30 most recent
  localStorage.setItem(LK,JSON.stringify(lib.slice(0,30)));
}

// Push any local saves that are flagged pendingSync to the cloud
async function pushPendingLocalSaves(){
  const lib=JSON.parse(localStorage.getItem(LK)||'[]');
  const pending=lib.filter(x=>x.pendingSync);
  if(!pending.length)return 0;
  let pushed=0;
  for(const item of pending){
    try{
      const sch=item.schedule||{};
      await nq(`INSERT INTO schedule_builder.schedules(id,name,meet_type,year,publish_status,folder,data,updated_at)VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,now())ON CONFLICT(id)DO UPDATE SET name=EXCLUDED.name,meet_type=EXCLUDED.meet_type,publish_status=EXCLUDED.publish_status,folder=EXCLUDED.folder,data=EXCLUDED.data,updated_at=now()`,[item.id,item.name,sch.meet?.meetType||'',parseInt(sch.meet?.days?.[0]?.date)||2026,sch.publishStatus||'draft',item.folder||null,JSON.stringify(sch)]);
      // Mark as synced
      const idx=lib.findIndex(x=>x.id===item.id);
      if(idx>=0){lib[idx].pendingSync=false;lib[idx].syncedAt=new Date().toISOString();}
      pushed++;
    }catch(e){console.warn('Could not push',item.name,e.message);break;}
  }
  if(pushed>0){
    localStorage.setItem(LK,JSON.stringify(lib));
    toast(`Pushed ${pushed} local save${pushed>1?'s':''} to cloud ✓`,3000);
  }
  return pushed;
}
async function loadNeonLib(){
  try{
    // Try with folder column first
    let r;
    try{r=await nq(`SELECT id,name,meet_type,publish_status,updated_at,folder FROM schedule_builder.schedules ORDER BY updated_at DESC LIMIT 100`);}
    catch{r=await nq(`SELECT id,name,meet_type,publish_status,updated_at FROM schedule_builder.schedules ORDER BY updated_at DESC LIMIT 100`);}
    return(r.rows||[]).map(row=>({id:row[0],name:row[1],meetType:row[2],publishStatus:row[3],savedAt:row[4],folder:row[5]||null,fromNeon:true}));
  }catch{return[]}
}
async function loadFromNeon(id,opts={}){
  try{
    // Try with folder column; fall back if column doesn't exist yet
    let r;
    try{r=await nq(`SELECT data,updated_at,folder FROM schedule_builder.schedules WHERE id=$1`,[id]);}
    catch{r=await nq(`SELECT data,updated_at FROM schedule_builder.schedules WHERE id=$1`,[id]);}
    const rows=r.rows||[];if(!rows.length)return null;
    const loaded=typeof rows[0][0]==='string'?JSON.parse(rows[0][0]):rows[0][0];
    S=loaded;S.currentLibraryId=id;
    if(rows[0][2])S.libraryFolder=rows[0][2];
    normalizeAllDays(S);saveS();lastSynced=new Date(rows[0][1]).toISOString();
    if(!opts.silent){UI.modal=null;initUI();render();toast('Schedule loaded');}else render();return loaded;}
  catch(e){if(!opts.silent)toast('Could not load');return null}
}
let presT=null,pollT=null,_pollFailures=0;
async function startSync(){
  clearInterval(presT);clearTimeout(pollT);
  _pollFailures=0;
  presT=setInterval(()=>S.currentLibraryId&&nq(`INSERT INTO schedule_builder.presence(editor_id,schedule_id,updated_at)VALUES($1,$2,now())ON CONFLICT(editor_id)DO UPDATE SET schedule_id=EXCLUDED.schedule_id,updated_at=now()`,[EDITOR_ID,S.currentLibraryId]).catch(()=>{}),30000);
  // Poll for remote changes, backing off if Neon is unreachable
  const tick=async()=>{
    if(!S.currentLibraryId)return;
    try{
      const r=await nq(`SELECT updated_at FROM schedule_builder.schedules WHERE id=$1`,[S.currentLibraryId]);
      if(r.rows?.length&&lastSynced&&new Date(r.rows[0][0]).toISOString()>lastSynced){
        // Safety net: never silently reload (and blow away in-progress,
        // not-yet-committed typing) while someone's actively in a text
        // field. If they are, skip this cycle — the next poll 8s later
        // will pick up the remote change once they've paused or blurred.
        const active=document.activeElement;
        const isTyping=active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
        if(!isTyping)await loadFromNeon(S.currentLibraryId,{silent:true});
      }
      sync.ok=true;sync.err=null;setSyncDot('ok');
      // Came back online: also push any pending local changes
      if(_pollFailures>0&&S.currentLibraryId){_pollFailures=0;doSave().catch(()=>{});}
    }catch(e){
      _pollFailures++;sync.ok=false;sync.err=e.message;setSyncDot('error');
    }
  };
  // First poll quick, then 8s, backing off to 60s on repeated failures
  let nextDelay=8000;
  const scheduleNext=()=>{
    if(_pollFailures>0){nextDelay=Math.min(60000,8000*Math.pow(2,Math.min(3,_pollFailures-1)));}
    else nextDelay=8000;
    pollT=setTimeout(async()=>{await tick();scheduleNext();},nextDelay);
  };
  await tick();scheduleNext();
}
let lastSavedAt=null;
function fmtRelativeTime(iso){
  if(!iso)return'';
  const ms=Date.now()-new Date(iso).getTime();
  if(ms<3000)return'just now';
  if(ms<60000)return Math.floor(ms/1000)+'s ago';
  if(ms<3600000)return Math.floor(ms/60000)+'m ago';
  if(ms<86400000)return Math.floor(ms/3600000)+'h ago';
  return new Date(iso).toLocaleDateString();
}
function setSyncDot(s){
  const d=document.querySelector('.sync-pip'),l=document.querySelector('.sync-lbl');
  if(!d||!l)return;
  d.className='sync-pip'+(s==='saving'?' saving':s==='error'?' error':'');
  if(s==='saving'){l.textContent='Saving…'}
  else if(s==='error'){l.textContent='Offline — tap to retry';l.style.cursor='pointer';l.onclick=retryCloudSync;}
  else if(s==='ok'){l.textContent='Saved '+fmtRelativeTime(lastSavedAt||lastSynced);d.className='sync-pip';l.style.cursor='';l.onclick=null;}
  else{l.textContent='Saved locally'}
}
setInterval(()=>{
  const l=document.querySelector('.sync-lbl');
  if(l&&!l.textContent.startsWith('Saving')&&!l.textContent.startsWith('Offline')){
    l.textContent='Saved '+fmtRelativeTime(lastSavedAt||lastSynced||S.updatedAt);
  }
},15000);

// ── STATE ─────────────────────────────────────────────────────────────
function mkDay(off=0){const d=new Date();d.setDate(d.getDate()+off);return{id:uid(),date:d.toISOString().slice(0,10),openMinutes:390,closeMinutes:1200}}
function mkInitial(){return{updatedAt:new Date().toISOString(),meet:{name:'New Schedule',venue:'Competition Pool',city:'',timezone:'America/New_York',meetType:'zone',days:[mkDay(0),mkDay(1),mkDay(2),mkDay(3)]},sessions:[],publishStatus:'draft',currentLibraryId:'',acknowledgedWarnings:[],outputSettings:{showWarmup:true,showEndTimes:true,showSubjectToChange:true}}}
function loadS(){try{const r=JSON.parse(localStorage.getItem(SK)||'');if(r?.meet&&Array.isArray(r.sessions))return r}catch{}return mkInitial()}
function saveS(){S.updatedAt=new Date().toISOString();lastSavedAt=S.updatedAt;try{localStorage.setItem(SK,JSON.stringify(S))}catch{}}
let S=loadS();
// ── UNDO / REDO ──────────────────────────────────────────────────────
let undoStack=[],redoStack=[];const UNDO_MAX=50;
function snapshot(){return JSON.stringify(S)}
function pushUndo(){undoStack.push(snapshot());if(undoStack.length>UNDO_MAX)undoStack.shift();redoStack=[]}
function undo(){if(!undoStack.length){toast('Nothing to undo');return}redoStack.push(snapshot());S=JSON.parse(undoStack.pop());normalizeAllDays(S);saveS();if(S.currentLibraryId)scheduleSave();render();toast('Undone')}
function redo(){if(!redoStack.length){toast('Nothing to redo');return}undoStack.push(snapshot());S=JSON.parse(redoStack.pop());normalizeAllDays(S);saveS();if(S.currentLibraryId)scheduleSave();render();toast('Redone')}
function upd(fn){pushUndo();fn(S);saveS();if(S.currentLibraryId)scheduleSave();render()}

// ── KEYBOARD SHORTCUTS ───────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  const mod=e.metaKey||e.ctrlKey;
  const el=document.activeElement;
  const inField=['INPUT','TEXTAREA','SELECT'].includes(el?.tagName);
  // Enter inside a number/text/time input commits the value (fires onchange) and blurs.
  if(e.key==='Enter'&&inField&&el.tagName!=='TEXTAREA'){
    e.preventDefault();
    // Dispatch change so the handler runs, then blur to lock it in
    el.dispatchEvent(new Event('change',{bubbles:true}));
    el.blur();
    return;
  }
  if(mod&&e.key==='z'&&!e.shiftKey){if(!inField){e.preventDefault();undo()}}
  else if(mod&&(e.key==='z'&&e.shiftKey||e.key==='y')){if(!inField){e.preventDefault();redo()}}
  else if(mod&&e.key==='s'){e.preventDefault();saveSchedule()}
  else if(e.key==='Escape'){
    if(el&&inField){el.blur()}
    else if(UI.modal){UI.modal=null;render()}
    else if(UI.moveSessionId){closeMoveDialog()}
    else if(UI.editSessId){closeEdit()}
    else if(UI.entriesOpen){closeEntries()}
  }
  else if(e.key==='?'&&!inField){e.preventDefault();UI.modal='shortcuts';render()}
});

// Auto-save: localStorage every 30s, on visibility change, on unload
setInterval(()=>{if(S?.meet){saveS();if(saveTimer){clearTimeout(saveTimer);saveTimer=null;if(S.currentLibraryId)doSave();}}},30000);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S?.meet)saveS()});
window.addEventListener('beforeunload',()=>{if(S?.meet){saveS();if(S.currentLibraryId&&saveTimer){clearTimeout(saveTimer);saveTimer=null;doSave();}}});

// Logo → apps home. Forces same-tab navigation on a normal left-click (the bar
// is JS-rendered and the logo img is otherwise draggable, which can swallow the
// click), while still allowing cmd/ctrl/shift/middle-click to open a new tab.
function goHome(e){
  if(e&&(e.metaKey||e.ctrlKey||e.shiftKey||e.button===1))return;
  if(e&&e.preventDefault)e.preventDefault();
  try{if(typeof S!=='undefined'&&S&&S.meet){saveS();if(S.currentLibraryId&&saveTimer){clearTimeout(saveTimer);saveTimer=null;doSave();}}}catch(_){}
  window.location.assign('../');
}

// ── TIMING ────────────────────────────────────────────────────────────
function calcEvDur(ev){
  if(Number(ev.customDurationMinutes||0)>0)return{evMin:Number(ev.customDurationMinutes),rawMin:Number(ev.customDurationMinutes)};
  const divers=Math.max(0,entryValue(ev));
  const dives=Math.max(0,Number(ev.numberOfDives||ev.defaultDives||0));
  const spd=Math.max(0,Number(ev.secondsPerDive||ev.defaultSpd||35));
  const raw=(divers*dives*spd)/60;
  const split=Boolean(ev.manualSplit)&&!isPlatform(ev.apparatus);
  const panels=split?Number(ev.numberOfPanelChanges||0)*Number(ev.minutesPerPanelChange||2.5):0;
  return{evMin:(split?raw/2:raw)+panels,rawMin:raw};
}
function calcFlightTimes(sess){
  if(!sess.flights?.length)return[];
  let cur=Number(sess.warmupStartMinutes||0);
  return sess.flights.map(f=>{const dur=Number(f.durationMinutes||30);const s=cur;cur+=dur;return{...f,startMinutes:s,endMinutes:cur}});
}
function calcSessTiming(sess){
  if(sess.isPractice){
    const ft=calcFlightTimes(sess);
    const s=Number(sess.warmupStartMinutes);
    let dur;
    if(sess.fitToClose){
      // Fit-to-close: end exactly at the day's facility close time; duration is whatever's left
      const day=(S.meet.days||[]).find(d=>d.id===sess.dayId);
      const close=day&&day.closeMinutes!=null?Number(day.closeMinutes):1200;
      dur=Math.max(0,close-s);
    } else if(ft.length){const last=ft[ft.length-1];dur=last.endMinutes-s;}
    else dur=Number(sess.events[0]?.customDurationMinutes||90);
    return{warmupStartMinutes:s,warmupEndMinutes:s,eventStartMinutes:s,sessionEndMinutes:s+dur,competitiveEnd:s+dur,events:[],flightTimes:ft,fitToClose:Boolean(sess.fitToClose),fitDur:dur};
  }
  const wu=Number(sess.warmupStartMinutes);
  const wuEnd=wu+Number(sess.warmupMinutes||55);
  const intro=Number(sess.introMinutes||0);
  const round=Number(sess.rounding||5);
  const first=ru(wuEnd+intro,round);

  // ── Build display units from events, honoring Combined + Simultaneous ──
  // Combined: events merged into a lead event; their durations SUM, render as one unit.
  // Simultaneous: separate units that share the same start time (parallel boards).
  const evs=(sess.events||[]);
  // 1) Group combined events. combinedWith points at the lead event's id.
  const combinedMap={}; // leadId -> [member events incl lead]
  const standalone=[];
  evs.forEach(ev=>{
    if(ev.combinedWith){
      (combinedMap[ev.combinedWith]=combinedMap[ev.combinedWith]||[]).push(ev);
    }
  });
  // Build ordered "units": each unit is either a single event or a combined cluster (lead + members)
  const units=[];const seen=new Set();
  evs.forEach(ev=>{
    if(seen.has(ev.id))return;
    if(ev.combinedWith)return; // members handled with their lead
    const members=combinedMap[ev.id];
    if(members&&members.length){
      const all=[ev,...members];
      all.forEach(e=>seen.add(e.id));
      // combined duration = sum of each member's own duration (each keeps its own dive count)
      let sumMin=0,sumRaw=0;
      all.forEach(e=>{const d=calcEvDur(e);sumMin+=Math.ceil(d.evMin);sumRaw+=d.rawMin;});
      units.push({kind:'combined',lead:ev,members:all,evMin:sumMin,rawMin:sumRaw,
        simulGroup:ev.simulGroup||null,apparatus:ev.apparatus});
    } else {
      seen.add(ev.id);
      const d=calcEvDur(ev);
      units.push({kind:'single',ev,evMin:Math.ceil(d.evMin),rawMin:d.rawMin,
        simulGroup:ev.simulGroup||null,apparatus:ev.apparatus});
    }
  });

  // 2) Lay out units. DEFAULT (restored original behavior): each unit starts at `first`
  //    and events run in parallel by apparatus lane (different boards = simultaneous).
  //    A unit on the same lane as a prior one stacks after it on that lane.
  //    OVERRIDES:
  //      - Simultaneous group: all members share one start time (forced parallel).
  //      - Combined: members already merged into one unit; it occupies its lane like a single.
  const tevs=[];const laneCursor={};const simulStart={};
  units.forEach(u=>{
    const lane=lk(u.apparatus);
    let start;
    if(u.simulGroup){
      // First member of a simul group sets the start; the rest share it
      if(simulStart[u.simulGroup]==null)simulStart[u.simulGroup]=ru(laneCursor[lane]??first,round);
      start=simulStart[u.simulGroup];
    } else {
      // Default: start where this lane currently is (first if lane unused = parallel)
      start=ru(laneCursor[lane]??first,round);
    }
    const end=start+u.evMin;
    // Advance this lane's cursor so the next same-lane event stacks after
    laneCursor[lane]=ru(end,round);
    if(u.kind==='single'){
      tevs.push({...u.ev,eventStartMinutes:start,eventEndMinutes:end,evMin:u.evMin,rawMin:u.rawMin,
        _combined:false,_simul:Boolean(u.simulGroup)});
    } else {
      tevs.push({...u.lead,eventStartMinutes:start,eventEndMinutes:end,evMin:u.evMin,rawMin:u.rawMin,
        _combined:true,_combinedMembers:u.members.map(m=>m.id),
        _combinedNames:u.members.map(m=>evName(m)),
        _combinedDivers:u.members.reduce((a,m)=>a+entryValue(m),0),
        _simul:Boolean(u.simulGroup)});
    }
  });
  const compEnd=tevs.reduce((m,e)=>Math.max(m,e.eventEndMinutes),first);
  const awards=sess.awardsEnabled?15:0;
  return{warmupStartMinutes:wu,warmupEndMinutes:wuEnd,eventStartMinutes:first,competitiveEnd:compEnd,sessionEndMinutes:compEnd+awards,events:tevs,flightTimes:[]};
}
function allTimed(){return S.meet.days.flatMap(day=>S.sessions.filter(s=>s.dayId===day.id).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes)).map(s=>({...s,timing:calcSessTiming(s)})))}
function sessForDay(dayId){return S.sessions.filter(s=>s.dayId===dayId).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes))}
function timedForDay(dayId){return allTimed().filter(s=>s.dayId===dayId)}
function getSessNum(sess,timed){if(sess.isPractice)return null;let n=1;for(const s of timed){if(s.isPractice)continue;if(s.id===sess.id)return n;n++;}return n}
function buildWarnings(dayId){
  const sessions=timedForDay(dayId).filter(s=>!s.isPractice);const warns=[];
  for(let i=0;i<sessions.length-1;i++){const a=sessions[i],b=sessions[i+1];if(a.timing.sessionEndMinutes>b.timing.warmupStartMinutes){warns.push({key:`ov-${a.id}-${b.id}`,sessId:a.id,msg:`Session ends at ${f12(a.timing.sessionEndMinutes)} but next warm-up starts ${f12(b.timing.warmupStartMinutes)}`});}}
  return warns.filter(w=>!(S.acknowledgedWarnings||[]).includes(w.key));
}

// ── CONFLICT DETECTION (comprehensive) ────────────────────────────────
function detectConflicts(){
  const issues=[];
  const timed=allTimed();
  S.meet.days.forEach(day=>{
    const sessions=timed.filter(s=>s.dayId===day.id).sort((a,b)=>a.timing.warmupStartMinutes-b.timing.warmupStartMinutes);
    const dayLabel=shortDate(day.date);
    const openM=Number(day.openMinutes||420),closeM=Number(day.closeMinutes||1200);
    // Overlaps between sessions — fix points at the LATER session (adjust its start/buffer)
    for(let i=0;i<sessions.length-1;i++){
      const a=sessions[i],b=sessions[i+1];
      if(a.timing.sessionEndMinutes>b.timing.warmupStartMinutes){
        const an=a.isPractice?(a.title||'Open Training'):'Session '+getSessNum(a,timed);
        const bn=b.isPractice?(b.title||'Open Training'):'Session '+getSessNum(b,timed);
        issues.push({sev:'err',title:'Sessions overlap',detail:`${an} ends ${f12(a.timing.sessionEndMinutes)} but ${bn} starts ${f12(b.timing.warmupStartMinutes)}`,loc:dayLabel,fixSessId:b.id,dayId:day.id,fixHint:'autoSpace',autoData:{prevId:a.id,nextId:b.id}});
      }
    }
    sessions.forEach(s=>{
      const sn=s.isPractice?(s.title||'Open Training'):'Session '+getSessNum(s,timed);
      // Day boundary
      if(s.timing.warmupStartMinutes<openM)issues.push({sev:'warn',title:'Starts before venue opens',detail:`${sn} starts ${f12(s.timing.warmupStartMinutes)}, venue opens ${f12(openM)}`,loc:dayLabel,fixSessId:s.id,dayId:day.id,fixHint:'edit'});
      if(s.timing.sessionEndMinutes>closeM)issues.push({sev:'warn',title:'Runs past venue close',detail:`${sn} ends ${f12(s.timing.sessionEndMinutes)}, venue closes ${f12(closeM)}`,loc:dayLabel,fixSessId:s.id,dayId:day.id,fixHint:'edit'});
      if(s.timing.sessionEndMinutes>=1440)issues.push({sev:'err',title:'Session crosses midnight',detail:`${sn} extends past midnight — check entry counts`,loc:dayLabel,fixSessId:s.id,dayId:day.id,fixHint:'entries'});
      if(!s.isPractice){
        // Events with no divers
        const emptyEvs=s.events.filter(e=>entryValue(e)===0&&!(e.finalDivers===0||e.projectedDivers===0));
        if(emptyEvs.length)issues.push({sev:'info',title:'Events missing entries',detail:`${sn}: ${emptyEvs.map(e=>evName(e)).join(', ')} — no divers entered yet`,loc:dayLabel,fixSessId:s.id,dayId:day.id,fixHint:'entries'});
        // Same apparatus parallel (impossible)
        const byLane={};
        s.timing.events.forEach(e=>{const l=lk(e.apparatus);if(!byLane[l])byLane[l]=[];byLane[l].push(e)});
        Object.entries(byLane).forEach(([lane,evs])=>{
          for(let i=0;i<evs.length-1;i++){
            for(let j=i+1;j<evs.length;j++){
              if(evs[i].eventStartMinutes<evs[j].eventEndMinutes&&evs[j].eventStartMinutes<evs[i].eventEndMinutes){
                issues.push({sev:'err',title:'Same board, overlapping events',detail:`${sn}: ${evName(evs[i])} and ${evName(evs[j])} both scheduled on ${al(lane==='platform'?'Platform':lane)} at the same time`,loc:dayLabel,fixSessId:s.id,dayId:day.id,fixHint:'edit'});
              }
            }
          }
        });
      }
    });
  });
  return issues;
}
// Open the right place to fix a given conflict, then act

// Fix a card's inline warning (these are session-overlap warnings) by re-flowing the day
function resolveCardWarning(sessId){
  const sess=S.sessions.find(x=>x.id===sessId);if(!sess)return;
  upd(s=>{reflowDay(s,sess.dayId);});
  toast('Spacing fixed automatically');
}

function resolveConflict(idx){
  const conflicts=detectConflicts();
  const c=conflicts[idx];if(!c)return;
  closeModal();
  // Switch to the day the issue is on
  if(c.dayId)UI.dayId=c.dayId;
  if(c.fixHint==='autoSpace'&&c.autoData){
    // One-click fix: re-flow so the next session starts after the previous ends + buffer
    upd(s=>{reflowDay(s,c.dayId);});
    toast('Spacing fixed — session moved after the previous one');
    return;
  }
  if(c.fixHint==='entries'){
    // Open the entries panel focused on that day
    UI.entriesOpen=true;UI.entriesShowAll=false;UI.entriesDayId=c.dayId;
    render();
    toast('Enter the missing counts here');
    return;
  }
  // Default: open that session's editor
  if(c.fixSessId){UI.editSessId=c.fixSessId;render();}
}

// ── EVENT CATALOG ─────────────────────────────────────────────────────
function buildCatalog(meetType){
  const def=MEET_TYPES[meetType]||MEET_TYPES.custom;const evs=[];
  for(const grp of(def.groups||[])){for(const gender of['Girls','Boys']){for(const app of['1m','3m']){const nm=`${grp} ${gender} ${al(app)}`;const t=EV_TIMING[nm]||{};evs.push({id:`${grp}-${gender}-${app}`.toLowerCase().replace(/\s+/g,'-'),level:grp,gender,apparatus:app,style:'Individual',defaultDives:t.dives||6,defaultSpd:t.spd||35,rounds:def.rounds||['Qualifier']});}if(def.plat){const nm=`${grp} ${gender} Platform`;const t=EV_TIMING[nm]||{};evs.push({id:`${grp}-${gender}-platform`.toLowerCase().replace(/\s+/g,'-'),level:grp,gender,apparatus:'Platform',style:'Individual',defaultDives:t.dives||6,defaultSpd:t.spd||45,rounds:def.rounds||['Qualifier']});}}}
  if(def.senior){for(const gender of['Women','Men']){for(const app of['1m','3m','10m']){evs.push({id:`senior-${gender}-${app}`.toLowerCase(),level:'Senior',gender,apparatus:app,style:'Individual',defaultDives:gender==='Women'?5:6,defaultSpd:isPlatform(app)?38:32,rounds:def.rounds||['Qualifier']});}}}
  return evs;
}

// ── UI STATE ──────────────────────────────────────────────────────────
let UI={
  dayId:'',modal:null,editSessId:null,entriesOpen:false,entriesDayId:'',
  entriesExpanded:[],entriesShowAll:false,previewOpen:false,
  libTab:'templates',libFolder:'Zone Championships',savesFolder:'all',
  neonLib:[],neonLibLoading:false,genAud:'athletes',
  pickerSessId:'',pickerSearch:'',pickerPreset:'',pickerRound:'',
  moveSessionId:null,moveTargetDayId:null,moveTargetPos:'end',
  draggedSessId:null,draggedEvFrom:null,
  projRows:null,projLoading:false,projError:null,projFilterEwc:null,projFilterZone:null,
  showFlightCounts:true,
};
function initUI(){
  if(S.meet.days.length&&!UI.dayId)UI.dayId=S.meet.days[0].id;
  // Force-off awards on every session load — awards never default on.
  // User can toggle on per-session if needed for a specific meet.
  S.sessions.forEach(sess=>{if(sess.awardsEnabled){sess.awardsEnabled=false;}});
  // Re-lock rulebook dive counts + normalize legacy titles on load
  if(!UI._divesRelocked){
    let changed=false;
    S.sessions.forEach(sess=>{
      // Legacy practice blocks named "Open Training" → "Open Training"
      if(sess.isPractice&&(sess.title==='Open Training'||!sess.title)){sess.title='Open Training';changed=true;}
      if(sess.events&&sess.events[0]&&sess.events[0].customLabel==='Open Training'){sess.events[0].customLabel='Open Training';changed=true;}
      if(!sess.isPractice)sess.events.forEach(ev=>{
        const rb=rulebookDives(ev.level,ev.gender,ev.apparatus,ev.round);
        if(rb!=null&&(ev.numberOfDives!==rb||!ev.rulebookLocked)){ev.numberOfDives=rb;ev.defaultDives=rb;ev.rulebookLocked=true;changed=true;}
        // Finals are never split — clear any legacy split flag
        if(ev.round==='Final'&&ev.manualSplit){ev.manualSplit=false;changed=true;}
      });
    });
    UI._divesRelocked=true;
    if(changed)saveS();
  }
}
function openEdit(sessId){UI.editSessId=sessId;render()}
function closeEdit(){UI.editSessId=null;render()}
function openEntries(){UI.entriesOpen=true;UI.editSessId=null;UI.entriesDayId=UI.dayId;UI.entriesExpanded=[];render()}
function closeEntries(){if(_entryDirty)commitEntries();UI.entriesOpen=false;render()}
function selectDay(id){UI.dayId=id;UI.editSessId=null;render()}
function toggleEntriesSess(id){const i=UI.entriesExpanded.indexOf(id);if(i>=0)UI.entriesExpanded.splice(i,1);else UI.entriesExpanded.push(id);render()}

// ── MUTATIONS ─────────────────────────────────────────────────────────
function addDay(){const days=S.meet.days;const last=days[days.length-1];const next=last?(()=>{const d=new Date(`${last.date}T00:00:00`);d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)})():new Date().toISOString().slice(0,10);upd(s=>{const day={id:uid(),date:next,openMinutes:390,closeMinutes:1200};s.meet.days.push(day);UI.dayId=day.id})}
function addSession(dayId,isPractice){
  const existing=timedForDay(dayId);const lastEnd=existing.reduce((m,s)=>Math.max(m,s.timing?.sessionEndMinutes||Number(s.warmupStartMinutes)),390);const start=ru(lastEnd+(existing.length?5:0),5);
  // Practice/training blocks (Open Training, Flighted Warm-Ups, etc.) default to NO buffer —
  // these blocks routinely run back-to-back with no gap needed. Competition sessions keep
  // the standard 5-minute buffer default.
  const sess={id:uid(),dayId,warmupStartMinutes:start,warmupMinutes:55,rounding:5,introMinutes:0,bufferMinutes:isPractice?0:5,awardsEnabled:false,isPractice:!!isPractice,title:isPractice?'Open Training':'',flights:[],events:isPractice?[{id:uid(),style:'Custom Block',customLabel:'Open Training',customDurationMinutes:90,apparatus:'Pool',gender:'Open',level:'Schedule',numberOfDivers:0,numberOfDives:0,secondsPerDive:0,defaultSpd:0,defaultDives:0,manualSplit:false,numberOfPanelChanges:0,minutesPerPanelChange:0,notes:''}]:[]};
  upd(s=>{s.sessions.push(sess)});UI.editSessId=sess.id;render();
}
// Standard practice/meeting block presets — quick-pick chips instead of always defaulting to a
// generic "Open Training" block that then needs manual retitling. Technical Meeting is included
// as a standard preset since every meet needs at least one and it's easy to forget.
const PRACTICE_PRESETS={
  open:{title:'Open Training',label:'Open practice block.',duration:90},
  flighted:{title:'Flighted Warm-Ups',label:'Flighted warm-up block.',duration:120},
  restricted:{title:'Restricted Training',label:'Restricted Training',duration:30},
  technical:{title:'Technical Meeting',label:'Technical Meeting',duration:60},
};
function addPracticeBlock(dayId,presetKey){
  const preset=PRACTICE_PRESETS[presetKey];
  if(!preset){addSession(dayId,true);return;} // 'custom' falls back to the generic block for full manual control
  const existing=timedForDay(dayId);const lastEnd=existing.reduce((m,s)=>Math.max(m,s.timing?.sessionEndMinutes||Number(s.warmupStartMinutes)),390);const start=ru(lastEnd+(existing.length?5:0),5);
  const sess={id:uid(),dayId,warmupStartMinutes:start,warmupMinutes:presetKey==='technical'?0:55,rounding:5,introMinutes:0,bufferMinutes:0,awardsEnabled:false,isPractice:true,title:preset.title,flights:[],events:[{id:uid(),style:'Custom Block',customLabel:preset.label,customDurationMinutes:preset.duration,apparatus:'Pool',gender:'Open',level:'Schedule',numberOfDivers:0,numberOfDives:0,secondsPerDive:0,defaultSpd:0,defaultDives:0,manualSplit:false,numberOfPanelChanges:0,minutesPerPanelChange:0,notes:preset.label}]};
  upd(s=>{s.sessions.push(sess)});UI.editSessId=sess.id;render();
}
function deleteSession(id){
  const sess=S.sessions.find(x=>x.id===id);
  const label=sess&&sess.isPractice?(sess.title||'Open Training'):'this session';
  askConfirm({title:'Delete '+(sess&&sess.isPractice?'block':'session')+'?',message:'Remove '+label+'? This can be undone with Cmd+Z.',confirmText:'Delete',danger:true,onConfirm:()=>{
    if(UI.editSessId===id)UI.editSessId=null;
    upd(s=>{s.sessions=s.sessions.filter(x=>x.id!==id);if(s.sessions.length)reflowDay(s,sess.dayId);});
    toast('Deleted');
  }});
}
function updSess(id,field,value){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===id);if(!sess)return;
    const nums=['warmupStartMinutes','warmupMinutes','rounding','introMinutes','bufferMinutes'];
    const old=sess[field];
    sess[field]=nums.includes(field)?Number(value):value;
    // Re-flow the whole day for time-affecting fields so downstream auto-adjusts
    if(['warmupStartMinutes','warmupMinutes','introMinutes','bufferMinutes','awardsEnabled'].includes(field)){
      reflowDay(s,sess.dayId);
    }
  });
}

// Cascade: after a session's timing changes, push subsequent same-day sessions
// to start at endOfPrevious + buffer, but only if doing so doesn't move them BACKWARDS
// (we never auto-move a session to an EARLIER time).

// Day facility close time (minutes); default 8:00 PM (1200)
function dayCloseFor(dayId){const d=(S.meet.days||[]).find(x=>x.id===dayId);return d&&d.closeMinutes!=null?Number(d.closeMinutes):1200;}
function setDayClose(dayId,mins){upd(s=>{const d=s.meet.days.find(x=>x.id===dayId);if(d){d.closeMinutes=Number(mins);}reflowDay(s,dayId);});}
function toggleFitToClose(sessId){upd(s=>{const sess=s.sessions.find(x=>x.id===sessId);if(sess){sess.fitToClose=!sess.fitToClose;}reflowDay(s,sess.dayId);});}


// ── Combine / Simultaneous actions ──
// Combine: attach member events to a lead event. They run as one; durations sum.
function combineEvents(sessId,leadId,memberIds){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    memberIds.forEach(mid=>{
      if(mid===leadId)return;
      const m=sess.events.find(e=>e.id===mid);
      if(m){m.combinedWith=leadId;m.simulGroup=null;}
    });
    reflowDay(s,sess.dayId);
  });
  toast('Events combined');
}
// Split apart: remove an event from its combined cluster (back to standalone)
function uncombineEvent(sessId,evId){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    const ev=sess.events.find(e=>e.id===evId);
    if(ev)ev.combinedWith=null;
    // if this WAS a lead, its members now point at a gone lead — promote first member to lead
    const orphans=sess.events.filter(e=>e.combinedWith===evId);
    if(orphans.length){const newLead=orphans[0];newLead.combinedWith=null;orphans.slice(1).forEach(o=>o.combinedWith=newLead.id);}
    reflowDay(s,sess.dayId);
  });
  toast('Split apart');
}
// Break a whole combined cluster back into separate events
function uncombineCluster(sessId,leadId){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    sess.events.forEach(e=>{if(e.id===leadId||e.combinedWith===leadId)e.combinedWith=null;});
    reflowDay(s,sess.dayId);
  });
  toast('Events separated');
}
// Toggle simultaneous: tag selected events with a shared simulGroup so they share a start time
function setSimultaneous(sessId,evIds){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    const gid='simul-'+uid();
    evIds.forEach(id=>{const e=sess.events.find(x=>x.id===id);if(e){e.simulGroup=gid;e.combinedWith=null;}});
    reflowDay(s,sess.dayId);
  });
  toast('Set to run simultaneously');
}
function clearSimultaneous(sessId,evId){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    const ev=sess.events.find(e=>e.id===evId);if(!ev)return;
    const g=ev.simulGroup;
    // clear the whole group
    if(g)sess.events.forEach(e=>{if(e.simulGroup===g)e.simulGroup=null;});
    reflowDay(s,sess.dayId);
  });
  toast('Simultaneous cleared');
}

// Re-flow an entire day: keep the first session's start, snap every later session to
// the previous session's end + buffer (rounded up to 5). Fully automatic sequencing.
function reflowDay(stateSnap,dayId){
  const day=stateSnap.meet.days.find(x=>x.id===dayId);
  const dayOpen=day&&day.openMinutes!=null?Number(day.openMinutes):0;
  const sameDay=stateSnap.sessions.filter(s=>s.dayId===dayId).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  for(let i=1;i<sameDay.length;i++){
    const prev=sameDay[i-1];
    const t=calcSessTimingFromObj(prev);
    const want=ruUp(t.sessionEndMinutes+Number(prev.bufferMinutes||0),5);
    sameDay[i].warmupStartMinutes=Math.max(want,dayOpen);
  }
}
// Reflow every day at once. Used after loading a schedule, undo/redo, or anywhere
// a bulk import could leave gaps between sessions (e.g. Open Training → next session).
// This is the "normalize" pass — every day is laid out back-to-back per session buffers.
function normalizeAllDays(stateSnap){
  const st=stateSnap||S;
  if(!st||!st.meet||!Array.isArray(st.meet.days))return;
  st.meet.days.forEach(d=>reflowDay(st,d.id));
}
// Zero out the buffer on every session for a given day and pack them back-to-back.
// For days that are all (or mostly) Open Training / Flighted Warm-Up blocks with no
// gaps needed between them, rather than clicking the buffer chip to "0" one session at a time.
function zeroBuffersForDay(dayId){
  const count=S.sessions.filter(x=>x.dayId===dayId).length;
  if(count<2){toast('Nothing to pack — this day only has one session');return;}
  askConfirm({
    title:'Remove buffers for this day?',
    message:'Every session on this day will be packed back-to-back with no gap in between. You can undo with Cmd+Z.',
    confirmText:'Remove buffers',
    onConfirm:()=>{
      upd(s=>{
        s.sessions.filter(x=>x.dayId===dayId).forEach(x=>{x.bufferMinutes=0;});
        reflowDay(s,dayId);
      });
      toast('Buffers cleared — sessions packed back-to-back');
    }
  });
}
function cascadeSession(stateSnap,changedId){
  const all=stateSnap.sessions;
  const sess=all.find(x=>x.id===changedId);
  if(!sess)return;
  const sameDay=all.filter(s=>s.dayId===sess.dayId).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  const idx=sameDay.findIndex(s=>s.id===changedId);
  if(idx<0)return;
  // Each later session starts the moment the previous one's LONGEST event (its session end)
  // finishes, plus that session's buffer, rounded UP to the nearest 5 minutes. This both
  // pushes sessions later when something grows and pulls them earlier to close gaps when
  // something shrinks — fully automatic, no manual time edits needed.
  const day=stateSnap.meet.days.find(x=>x.id===sess.dayId);
  const dayOpen=day&&day.openMinutes!=null?Number(day.openMinutes):0;
  let prev=sess;
  for(let i=idx+1;i<sameDay.length;i++){
    const t=calcSessTimingFromObj(prev);
    const want=ruUp(t.sessionEndMinutes+Number(prev.bufferMinutes||0),5);
    const curr=sameDay[i];
    curr.warmupStartMinutes=Math.max(want,dayOpen);
    prev=curr;
  }
}
// Pure timing calc that doesn't read from S (used in cascade)
function calcSessTimingFromObj(sess){return calcSessTiming(sess)}

// Reorder a session within its day by dropping above/below another session.
// Re-times the whole day sequentially from the earliest start, then cascades.
function reorderSessionWithinDay(draggedId,targetId,placeAbove){
  upd(s=>{
    const dragged=s.sessions.find(x=>x.id===draggedId);
    const target=s.sessions.find(x=>x.id===targetId);
    if(!dragged||!target||dragged.dayId!==target.dayId)return;
    const dayId=dragged.dayId;
    // Build ordered list by current start time
    let dayS=s.sessions.filter(x=>x.dayId===dayId).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
    // Remove dragged
    dayS=dayS.filter(x=>x.id!==draggedId);
    // Insert relative to target
    const ti=dayS.findIndex(x=>x.id===targetId);
    const insertAt=placeAbove?ti:ti+1;
    dayS.splice(insertAt,0,dragged);
    // Re-time sequentially: keep the earliest start, lay sessions back-to-back with buffers
    const startAnchor=Number(dayS[0].warmupStartMinutes);
    let cursor=startAnchor;
    dayS.forEach((sess,i)=>{
      sess.warmupStartMinutes=ru(cursor,5);
      const t=calcSessTiming(sess);
      const dur=t.sessionEndMinutes-t.warmupStartMinutes;
      cursor=ru(sess.warmupStartMinutes+dur+Number(sess.bufferMinutes||0),5);
    });
  });
  toast('Session reordered — times adjusted');
}

function addFlight(sessId){upd(s=>{const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;if(!sess.flights)sess.flights=[];const colors=['#171F69','#009AC7','#E31937','#16A34A','#D97706','#7C3AED'];sess.flights.push({id:uid(),name:`Flight ${sess.flights.length+1}`,durationMinutes:45,color:colors[sess.flights.length%colors.length]});const tot=sess.flights.reduce((s,f)=>s+Number(f.durationMinutes||0),0);if(sess.events[0])sess.events[0].customDurationMinutes=tot})}
function updFlight(sessId,fid,field,value){upd(s=>{const sess=s.sessions.find(x=>x.id===sessId);if(!sess?.flights)return;const f=sess.flights.find(x=>x.id===fid);if(!f)return;f[field]=field==='durationMinutes'?Number(value):value;if(field==='name')f._customName=true;const tot=sess.flights.reduce((s,f)=>s+Number(f.durationMinutes||0),0);if(sess.events[0])sess.events[0].customDurationMinutes=tot||90})}
// Zone/E-W-C tag clicks — separate from updFlight() above because these fire rapidly (tagging
// several flights in a row) and don't affect timing at all, so a full app re-render on every
// click is both wasteful and causes a visible scroll/focus disturbance. This path patches just
// the edit modal's body in place, preserving its scroll position exactly.
function updFlightTag(sessId,fid,field,value){
  pushUndo();
  const sess=S.sessions.find(x=>x.id===sessId);
  if(!sess?.flights)return;
  const f=sess.flights.find(x=>x.id===fid);
  if(!f)return;
  f[field]=value;
  // Auto-name from the tag just picked, unless the user has typed a custom name themselves.
  // Only auto-names on SET (not on clearing a tag back to '') so clearing never blanks a title.
  if(value&&!f._customName){
    f.name=field==='zone'?('Zone '+value):value;
  }
  saveS();
  if(S.currentLibraryId)scheduleSave();
  patchPracEditModal();
}
// Re-renders just the practice-edit modal body in place (used by tag clicks above). Falls back
// to a full render() if the modal isn't in the expected state, so this can never leave the UI stuck.
function patchPracEditModal(){
  const sess=S.sessions.find(s=>s.id===UI.editSessId);
  const body=document.querySelector('[data-edit-body="1"]');
  if(!sess||!sess.isPractice||!body){render();return;}
  const t=sess.timing||calcSessTiming(sess);
  const scrollTop=body.scrollTop;
  body.innerHTML=renderEditPrac(sess,t,sess.flights||[]);
  body.scrollTop=scrollTop;
}
function removeFlight(sessId,fid){upd(s=>{const sess=s.sessions.find(x=>x.id===sessId);if(!sess?.flights)return;sess.flights=sess.flights.filter(f=>f.id!==fid);const tot=sess.flights.reduce((s,f)=>s+Number(f.durationMinutes||0),0);if(sess.events[0])sess.events[0].customDurationMinutes=tot||90})}
function makeEvent(p,round){
  const isFinal=round==='Final';
  const rbDives=rulebookDives(p.level,p.gender,p.apparatus,round);
  const dives=rbDives!=null?rbDives:p.defaultDives;
  const spd=rulebookSpd(p.level,p.apparatus);
  // Finals default BOTH projected and final to 12; prelims/qualifiers start UNSET (null)
  return{id:uid(),level:p.level,gender:p.gender,apparatus:p.apparatus,style:p.style,round,
    defaultDives:dives,numberOfDivers:isFinal?12:0,numberOfDives:dives,
    projectedDivers:isFinal?12:null,finalDivers:isFinal?12:null,
    secondsPerDive:spd,defaultSpd:spd,manualSplit:false,numberOfPanelChanges:0,
    minutesPerPanelChange:2.5,customDurationMinutes:0,notes:'',rulebookLocked:rbDives!=null,
    autoFinals:isFinal};
}
// Does this meet type pair prelims with finals (same day)?
function meetHasFinals(){const def=MEET_TYPES[S.meet.meetType];return def&&def.rounds&&def.rounds.includes('Prelim')&&def.rounds.includes('Final')}
// Find or create a finals session later the same day as the given prelim session
function ensureFinalsSession(state,prelimSess){
  const dayId=prelimSess.dayId;
  // A "finals session" = a comp session on the same day that holds Final-round events
  // Strategy: find the latest finals session that has room, else create one after the last session of the day.
  let finalsSess=state.sessions.filter(s=>s.dayId===dayId&&!s.isPractice&&s.events.some(e=>e.round==='Final')).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes)).pop();
  if(finalsSess&&finalsSess.events.length<2)return finalsSess;
  // Create a new finals session after the last session that day
  const dayS=state.sessions.filter(s=>s.dayId===dayId);
  const lastEnd=dayS.reduce((m,s)=>Math.max(m,calcSessTiming(s).sessionEndMinutes),420);
  const ns={id:uid(),dayId,warmupStartMinutes:ru(lastEnd+5,5),warmupMinutes:55,rounding:5,introMinutes:0,bufferMinutes:5,awardsEnabled:false,isPractice:false,title:'',flights:[],events:[]};
  state.sessions.push(ns);
  return ns;
}
// When a Prelim event with a linked Final moves to a different session, the Final should
// follow it so the pairing stays together for scheduling purposes. Same-day moves relocate
// the Final into the correct finals session for the (possibly new) day; the Final is left
// alone if the Prelim just moves within the same day into a session that already has a
// finals session in place. Cross-day moves of the Prelim are not auto-followed — awards/
// finals structure across different meet days isn't assumed to carry over automatically.
function relocateLinkedFinal(state,prelimEv,newDayId){
  let finalEv=null,finalSess=null;
  for(const sess of state.sessions){
    const fe=sess.events.find(e=>e.linkedPrelimId===prelimEv.id);
    if(fe){finalEv=fe;finalSess=sess;break;}
  }
  if(!finalEv||!finalSess)return;
  if(finalSess.dayId===newDayId)return; // already tracking the right day — leave its session placement as-is
  finalSess.events=finalSess.events.filter(e=>e.id!==finalEv.id);
  const destSess=ensureFinalsSession(state,{dayId:newDayId});
  destSess.events.push(finalEv);
  cascadeSession(state,finalSess.id);
  cascadeSession(state,destSess.id);
}
function addEvToSess(sessId,presetId,round){
  const cat=buildCatalog(S.meet.meetType);const p=cat.find(e=>e.id===presetId);if(!p)return;
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    const ev=makeEvent(p,round);
    sess.events.push(ev);
    // Auto-create matching finals when adding a prelim at EWC / Jr Nationals
    if(round==='Prelim'&&meetHasFinals()){
      // Don't duplicate if a finals for this event already exists that day
      const exists=s.sessions.some(x=>x.dayId===sess.dayId&&x.events.some(e=>e.round==='Final'&&e.level===p.level&&e.gender===p.gender&&e.apparatus===p.apparatus));
      if(!exists){
        const fSess=ensureFinalsSession(s,sess);
        const fEv=makeEvent(p,'Final');
        fEv.linkedPrelimId=ev.id; // track the pairing for live sync
        fSess.events.push(fEv);
      }
    }
    // recompute all timing
    s.sessions.forEach(x=>{if(!x.isPractice)cascadeSession(s,x.id)});
  });
}
// Re-lock dives whenever needed (e.g., loading older schedules)
function relockDives(ev){
  const rb=rulebookDives(ev.level,ev.gender,ev.apparatus,ev.round);
  if(rb!=null){ev.numberOfDives=rb;ev.defaultDives=rb;ev.rulebookLocked=true;}
  return ev;
}
function removeEv(sessId,evId){upd(s=>{const sess=s.sessions.find(x=>x.id===sessId);if(sess)sess.events=sess.events.filter(e=>e.id!==evId)})}
function updEv(sessId,evId,field,value){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    const ev=sess.events.find(e=>e.id===evId);if(!ev)return;
    const nums=['numberOfDivers','numberOfDives','secondsPerDive','numberOfPanelChanges','minutesPerPanelChange','customDurationMinutes','projectedDivers','finalDivers'];
    // Entry counts: empty=unset(null), 0=real. Other numbers coerce normally.
    if(field==='projectedDivers'||field==='finalDivers'){
      ev[field]=(value===''||value==null)?null:Math.max(0,Number(value)||0);
    } else {
      ev[field]=nums.includes(field)?Number(value):value;
    }
    if(field==='finalDivers'||field==='projectedDivers'){
      ev.numberOfDivers=entryValue(ev);
      if(ev.round==='Final')ev.autoFinals=false;
      if(ev.round==='Prelim'&&field==='finalDivers'){
        const prelimFinal=Number(ev.finalDivers||0);
        const target=Math.min(12,prelimFinal); // 0-12 cap; ties handled via manual override
        s.sessions.forEach(sess=>sess.events.forEach(fe=>{
          if(fe===ev)return;
          if(fe.round!=='Final')return;
          if(fe.level!==ev.level||fe.gender!==ev.gender||fe.apparatus!==ev.apparatus)return;
          const currentFinal=Number(fe.finalDivers||0);
          if(currentFinal>12)return; // preserve tie override
          fe.projectedDivers=target;fe.finalDivers=target;fe.numberOfDivers=target;
          fe.autoFinals=true;
        }));
      }
    }
    // Cascade: changing divers/dives/sec can extend session, which pushes the next ones
    if(['numberOfDivers','numberOfDives','secondsPerDive','customDurationMinutes','manualSplit','projectedDivers','finalDivers'].includes(field)){
      reflowDay(s,sess.dayId);
    }
  });
}
function toggleSplit(sessId,evId){
  // Finals are never split — ignore any attempt
  {const _s=S.sessions.find(x=>x.id===sessId);const _e=_s&&_s.events.find(x=>x.id===evId);if(_e&&_e.round==='Final')return;}upd(s=>{const sess=s.sessions.find(x=>x.id===sessId);const ev=sess?.events.find(e=>e.id===evId);if(ev&&!isPlatform(ev.apparatus)){ev.manualSplit=!ev.manualSplit;reflowDay(s,S.sessions.find(x=>x.id===sessId).dayId);}})}
function setBuffer(sessId,v){updSess(sessId,'bufferMinutes',v)}
function ackWarn(key){upd(s=>{if(!s.acknowledgedWarnings)s.acknowledgedWarnings=[];if(!s.acknowledgedWarnings.includes(key))s.acknowledgedWarnings.push(key)})}
function cycleStatus(){const i=STATUS.indexOf(S.publishStatus||'draft');upd(s=>s.publishStatus=STATUS[(i+1)%STATUS.length])}
function applyFinalsAll(){upd(s=>{s.sessions.forEach(sess=>sess.events.forEach(ev=>{if(ev.round==='Final'){ev.finalDivers=12;ev.numberOfDivers=12;}}));s.sessions.forEach(sess=>{if(!sess.isPractice)cascadeSession(s,sess.id)})});toast('Finals set to 12 (editable for ties)')}
function saveSchedule(){
  try{
    // If already saved (has cloud id and folder), just push an update with visible feedback
    if(S.currentLibraryId&&S.libraryFolder){
      toast('Saving to cloud…',1200);
      saveToNeon(S.meet.name,S.libraryFolder).catch(e=>{console.error('Save failed:',e);toast('Save failed: '+(e&&e.message||'unknown'),4000);});
      return;
    }
    // Otherwise prompt for name + folder
    const defaultFolder=inferFolder({name:S.meet.name||'',meetType:S.meet.meetType||'',folder:S.libraryFolder||''});
    UI.modal='saveDialog';
    UI.saveDialogName=S.meet.name||'New Schedule';
    UI.saveDialogFolder=defaultFolder;
    render();
    // If modal didn't appear (CSS issue, etc.), fallback to prompt
    setTimeout(()=>{
      if(UI.modal==='saveDialog'&&!document.querySelector('.folder-picker')){
        console.warn('Save dialog did not render — falling back to prompt');
        const n=prompt('Schedule name:',UI.saveDialogName);
        if(n){_doSaveSchedule(n.trim(),UI.saveDialogFolder||'Other');UI.modal=null;render();}
        else{UI.modal=null;render();}
      }
    },150);
  }catch(e){
    console.error('saveSchedule error:',e);
    toast('Could not open save dialog — check console',4000);
  }
}
function saveDialogConfirm(){
  const name=(UI.saveDialogName||'').trim();
  const folder=UI.saveDialogFolder||'Other';
  if(!name){toast('Name required');return;}
  UI.modal=null;
  _doSaveSchedule(name,folder);
}
async function _doSaveSchedule(name,folder){
  S.meet.name=name;
  S.libraryFolder=folder;
  // Always assign an id and write to local library FIRST so save is never lost
  const id=S.currentLibraryId||uid();
  S.currentLibraryId=id;
  saveS();
  const localEntry={
    id,name,folder,
    savedAt:new Date().toISOString(),
    schedule:JSON.parse(JSON.stringify(S)),
    pendingSync:true // mark as needing cloud push; cleared on cloud success
  };
  upsertLocalSave(localEntry);
  // Show immediate feedback so user knows save registered
  toast('Saved locally — pushing to cloud…',1500);
  // Now attempt cloud save
  try{
    await saveToNeon(name,folder);
    // Cloud succeeded — clear the pendingSync flag
    localEntry.pendingSync=false;
    localEntry.syncedAt=new Date().toISOString();
    upsertLocalSave(localEntry);
    toast('Saved to cloud ✓',2400);
  }catch(e){
    // Cloud failed — local copy already saved with pendingSync:true
    console.warn('Cloud save failed (will retry when online):',e.message);
    toast('Offline — saved locally, will sync when back online',4000);
  }
  render();
}
function loadBuiltin(id){askConfirm({title:'Load template?',message:'Your current work will be replaced. Save it first if you want to keep it.',confirmText:'Load template',danger:true,onConfirm:()=>_doLoadBuiltin(id)});}
function _doLoadBuiltin(id){
  const item=BUILTIN_SCHEDULES.find(x=>x.id===id);if(!item)return;
  S=JSON.parse(JSON.stringify(item.schedule));
  // Clear so this is a fresh editable copy (template stays untouched).
  // User must "Save to cloud" to begin autosaving — keeps templates clean.
  S.currentLibraryId='';
  S.libraryFolder='';
  normalizeAllDays(S);saveS();UI.modal=null;initUI();render();
  toast('Loaded: '+item.name+' — click Save to cloud to begin autosave');
}
async function openLibrary(){
  UI.modal='library';UI.neonLibLoading=true;
  render();
  try{UI.neonLib=await loadNeonLib()}catch{UI.neonLib=[]}
  UI.neonLibLoading=false;
  // First-time-open this session: if there are saves, default to Saves tab so user sees them
  const local=JSON.parse(localStorage.getItem(LK)||'[]');
  if(!UI._libOpened&&(UI.neonLib.length||local.length)){UI.libTab='saves';UI._libOpened=true;}
  render();
}

// ── ATHLETE PROJECTIONS (from Junior Results Audit's published snapshot) ──────
// Reads junior_results.projected_nationals_field — a point-in-time snapshot Junior
// Results Audit publishes on demand (its qualifier engine's advancesToNationals flag
// plus the full HPS roster). This app never recomputes qualification itself; it only
// reads what's already been published, matching how everywhere else in this codebase
// treats the qualifier engine as the single source of truth for who's qualified.
const PROJ_SEASON='2026';
async function loadProjRows(){
  const r=await nq(`SELECT diver_key,athlete_name,age_group,gender,discipline,zone,ewc_meet,team,qualification_path,published_at FROM junior_results.projected_nationals_field WHERE season=$1 ORDER BY age_group,gender,discipline`,[PROJ_SEASON]);
  return(r.rows||[]).map(row=>({diverKey:row[0],athlete:row[1],ageGroup:row[2],gender:row[3],discipline:row[4],zone:row[5],ewcMeet:row[6],team:row[7],path:row[8],publishedAt:row[9]}));
}
// Background loader used wherever projection counts are needed (flight tagging, print) but the
// Projections panel itself hasn't been opened yet this session. Guarded so it only fires once.
function ensureProjDataLoaded(){
  if(UI.projRows!=null||UI._projBgLoading)return;
  UI._projBgLoading=true;
  loadProjRows().then(rows=>{UI.projRows=rows}).catch(()=>{UI.projRows=[]}).finally(()=>{UI._projBgLoading=false;render()});
}
// Distinct athlete count for a flight's zone/E-W-C tag. Zone is more specific than E-W-C
// and takes priority when both are set (every zone belongs to exactly one E-W-C group).
function athleteCountForFlight(f){
  if(!UI.projRows)return null;
  if(!f.zone&&!f.ewcMeet)return null;
  const rows=UI.projRows.filter(r=>f.zone?r.zone===f.zone:r.ewcMeet===f.ewcMeet);
  return new Set(rows.map(r=>r.diverKey)).size;
}
async function openProjections(){
  UI.modal='projections';
  if(UI.projRows==null){
    UI.projLoading=true;UI.projError=null;render();
    try{UI.projRows=await loadProjRows();}catch(e){UI.projError=e.message||'Could not load projections';UI.projRows=[];}
    UI.projLoading=false;
  }
  render();
}
function closeProjections(){UI.modal=null;render()}
function refreshProjectionsData(){UI.projRows=null;openProjections()}
function setProjFilterEwc(v){UI.projFilterEwc=(UI.projFilterEwc===v?null:v);render()}
function setProjFilterZone(v){UI.projFilterZone=(UI.projFilterZone===v?null:v);render()}
function filteredProjRows(){
  return(UI.projRows||[]).filter(r=>
    (!UI.projFilterEwc||r.ewcMeet===UI.projFilterEwc)&&
    (!UI.projFilterZone||r.zone===UI.projFilterZone)
  );
}
// Distinct-athlete counts by age group + gender — this is the board-loading breakdown.
// Counts every athlete once even if they appear on multiple apparatus rows.
function projBreakdown(){
  const byKey=new Map();
  filteredProjRows().forEach(r=>{
    const k=r.ageGroup+'|'+r.gender;
    if(!byKey.has(k))byKey.set(k,new Set());
    byKey.get(k).add(r.diverKey);
  });
  return['Group A','Group B','Group C','Group D'].map(g=>({
    group:g,girls:(byKey.get(g+'|Girls')||new Set()).size,boys:(byKey.get(g+'|Boys')||new Set()).size,
  }));
}
// Distinct-athlete counts by age group + gender + apparatus — drives the pre-fill.
// Only rows with a known apparatus count here (HPS-not-yet-competed rows have no
// apparatus and are intentionally excluded from this specific breakdown).
function projByEvent(){
  const map=new Map();
  filteredProjRows().filter(r=>r.discipline).forEach(r=>{
    const k=r.ageGroup+'|'+r.gender+'|'+r.discipline;
    if(!map.has(k))map.set(k,new Set());
    map.get(k).add(r.diverKey);
  });
  const out={};map.forEach((set,k)=>{out[k]=set.size});
  return out;
}
function prefillProjections(){
  const byEvent=projByEvent();
  let filled=0,skipped=0;
  upd(s=>{
    s.sessions.forEach(sess=>{
      if(sess.isPractice)return;
      sess.events.forEach(ev=>{
        if(ev.round!=='Prelim'&&ev.round!=='Qualifier')return;
        const k=ev.level+'|'+ev.gender+'|'+ev.apparatus;
        const count=byEvent[k];
        if(count==null)return;
        // A value is protected from overwrite only if it was a genuine manual
        // staff entry (autoProjected===false, set by setEntry()). A value left
        // over from an earlier prefill run (autoProjected===true, or unset for
        // schedules saved before this flag existed) is safe to refresh — this
        // is what lets re-publishing corrected projections in Junior Results
        // Audit actually flow through on a second "Pre-fill" click instead of
        // silently no-opping on every event that was already filled once.
        const isManualOverride=ev.projectedDivers!=null&&ev.projectedDivers!==''&&ev.autoProjected===false;
        if(isManualOverride){skipped++;return;}
        ev.projectedDivers=count;ev.autoProjected=true;ev.numberOfDivers=entryValue(ev);filled++;
      });
    });
    const touchedDays=new Set();
    s.sessions.forEach(sess=>{if(!sess.isPractice)touchedDays.add(sess.dayId)});
    touchedDays.forEach(dayId=>reflowDay(s,dayId));
  });
  toast(`Pre-filled ${filled} event${filled===1?'':'s'}`+(skipped?` — ${skipped} manually-entered value${skipped===1?'':'s'} left untouched`:''));
}

// ── RENDER CORE ───────────────────────────────────────────────────────
function render(){
  initUI();
  UI.draggedSessId=UI.draggedSessId||null;
  // Capture scroll positions of EVERY scrollable surface by a stable selector,
  // so nothing jumps when the DOM is rebuilt (timeline, entries, edit modal, etc).
  const _scroll={};
  document.querySelectorAll('.tl-body,.enp-body,.modal-body,.rp-body,.lib-body').forEach((el,i)=>{
    // key by class + index so we can match the same element after re-render
    const cls=el.className.split(' ')[0];
    _scroll[cls+':'+i]=el.scrollTop;
  });
  // Remember focused input + caret
  const _act=document.activeElement;
  const _actId=_act&&_act.id?_act.id:null;
  const _selStart=_act&&_act.selectionStart!=null?_act.selectionStart:null;
  const timed=allTimed();
  let rightPanel='';
  if(UI.entriesOpen)rightPanel=renderEntriesPanel(timed);
  else if(UI.previewOpen)rightPanel=renderPreviewPanel(timed);
  document.getElementById('app').innerHTML=`
    ${renderBar(timed)}
    <div class="workspace">
      <div class="tl-wrap">${renderTlBar(timed)}${renderTimeline(timed)}</div>
      ${rightPanel}
    </div>
    ${UI.editSessId?renderEditModal(timed):''}
    ${UI.modal?renderModal(timed):''}
    ${UI.moveSessionId?renderMoveDialog():''}
    ${UI.dialog?renderDialog():''}
    ${UI.combinePicker?renderCombinePickerModal():''}
  `;
  bindDrag();
  if(UI.dialog&&UI.dialog.type==='prompt'){const di=document.getElementById('dialog-input');if(di){di.focus();di.select();}}
  // Restore scroll for every matched surface
  const sel=document.querySelectorAll('.tl-body,.enp-body,.modal-body,.rp-body,.lib-body');
  sel.forEach((el,i)=>{
    const cls=el.className.split(' ')[0];
    const v=_scroll[cls+':'+i];
    if(v)el.scrollTop=v;
  });
  // Restore focus + caret
  if(_actId){const el=document.getElementById(_actId);if(el){try{el.focus({preventScroll:true});if(_selStart!=null&&el.setSelectionRange)el.setSelectionRange(_selStart,_selStart);}catch(e){}}}
}

function renderEditModal(timed){
  const sess=S.sessions.find(s=>s.id===UI.editSessId);if(!sess)return'';
  const t=sess.timing||calcSessTiming(sess);
  const isPrac=sess.isPractice;const n=getSessNum(sess,timed);
  const title=isPrac?(sess.title||'Open Training'):`Session ${n}`;
  const flights=sess.flights||[];
  const intro=Number(sess.introMinutes||0);const buf=Number(sess.bufferMinutes||0);
  const cat=buildCatalog(S.meet.meetType);
  const sessUsed=new Set(sess.events.map(e=>`${e.level}|${e.gender}|${e.apparatus}|${e.round}`));
  const body=isPrac?renderEditPrac(sess,t,flights):renderEditComp(sess,t,timed,intro,buf,cat,sessUsed);
  return`<div class="modal-bg" onclick="if(event.target===this)closeEdit()">
    <div class="modal modal-lg" onclick="event.stopPropagation()" style="max-height:calc(100vh - 48px)">
      <div class="modal-hd"><div><span class="modal-title">${esc(title)}</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)} · ${fdur(t.sessionEndMinutes-t.warmupStartMinutes)}</div></div><button class="modal-close" onclick="closeEdit()">×</button></div>
      <div class="modal-body" data-edit-body="1">${body}</div>
      <div class="modal-foot">
        <button class="btn btn-sm btn-gh" style="color:var(--red)" onclick="deleteSession('${sess.id}')">Delete session</button>
        <div style="flex:1"></div>
        <button class="btn btn-sm" onclick="openMoveDialog('${sess.id}')">Move…</button>
        <button class="btn btn-sm btn-p" onclick="closeEdit()">Done</button>
      </div>
    </div>
  </div>`;
}

// ── PREVIEW PANEL (right side, quick reference) ───────────────────────
function renderPreviewPanel(timed){
  const day=S.meet.days.find(d=>d.id===UI.dayId);
  const sessions=(day?timedForDay(UI.dayId):[]).slice().sort((a,b)=>a.timing.warmupStartMinutes-b.timing.warmupStartMinutes);
  return`<div class="rpanel open-sm">
    <div class="rp-hd">
      <div><div class="rp-title">Quick preview</div><div class="rp-sub">${day?shortDate(day.date):''} · timeline flow</div></div>
      <button class="rp-close" onclick="UI.previewOpen=false;render()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="rp-body">
      ${sessions.map(sess=>{
        const t=sess.timing;
        if(sess.isPractice){
          const ft=t.flightTimes||[];const isTrain=sess.title==='Open Training';
          return`<div class="mini-prac" style="${isTrain?'background:var(--train-bg);color:var(--train)':''}">${esc(sess.title||'Open Training')} · ${f12(t.warmupStartMinutes)}–${f12(t.sessionEndMinutes)}</div>${ft.map(f=>`<div style="font-size:10px;color:var(--tx3);padding:2px 0 2px 11px;border-left:2px solid ${f.color||'#ccc'};margin:2px 0 2px 4px">${esc(f.name)} · ${f12(f.startMinutes)}–${f12(f.endMinutes)}</div>`).join('')}`;
        }
        const n=getSessNum(sess,timed);const hasF=sess.events.some(e=>e.round==='Final');
        return`<div class="mini-sess">
          <div class="mini-sess-hd"><div class="mini-dot" style="background:${hasF?'var(--red)':'var(--navy)'}"></div><span class="mini-sess-name">Session ${n}${hasF?' (Finals)':''}</span><span class="mini-sess-time">${f12(t.eventStartMinutes)}</span></div>
          <div class="mini-wu">Warm-up ${f12(t.warmupStartMinutes)}–${f12(t.warmupEndMinutes)}</div>
          ${(t.events||[]).map(ev=>`<div class="mini-ev"><span class="mini-ev-name">${esc(evName(ev))}${ev.manualSplit&&!isPlatform(ev.apparatus)?' ÷':''}</span><span class="mini-ev-time">${f12(ev.eventStartMinutes)}</span></div>`).join('')}
        </div>`;
      }).join('')}
      ${!sessions.length?`<div style="font-size:12px;color:var(--tx3);text-align:center;padding:24px">No sessions this day yet</div>`:''}
    </div>
  </div>`;
}

// ── TOP BAR ───────────────────────────────────────────────────────────
function renderBar(timed){
  const tz=TZS.find(t=>t.v===S.meet.timezone)||TZS[0];
  const st=S.publishStatus||'draft';
  const days=S.meet.days.map(d=>`<button class="dp ${d.id===UI.dayId?'active':''}" onclick="selectDay('${d.id}')" data-day="${d.id}">${shortDate(d.date).replace(/,.*/,'')}</button>`).join('');
  const conflicts=detectConflicts();
  const errCount=conflicts.filter(c=>c.sev==='err').length;
  const conflictBadge=conflicts.length?`<span style="position:absolute;top:-3px;right:-3px;min-width:15px;height:15px;border-radius:8px;background:${errCount?'var(--red)':'var(--warn)'};color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px">${conflicts.length}</span>`:'';
  return`<header class="bar">
    <a class="bar-logo" href="../" title="Back to apps home" onclick="goHome(event)"><img src="../shared/images/logo-white-horizontal.png" alt="USA Diving" draggable="false"/></a>
    <div class="bar-meet" onclick="UI.modal='meet';render()">
      <div class="bar-meet-name">${esc(S.meet.name||'New Schedule')}</div>
      <div class="bar-meet-meta">${esc(S.meet.venue)}${S.meet.city?' · '+esc(S.meet.city):''}${tz?' · '+tz.s:''} · ${MEET_TYPES[S.meet.meetType]?.l||'Custom'}</div>
    </div>
    <div class="bar-days">${days}<button class="dp-add" onclick="addDay()" title="Add day">+</button></div>
    <div class="bar-right">
      <button class="bb icon-only" onclick="undo()" title="Undo (Cmd+Z)" ${undoStack.length?'':'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg></button>
      <button class="bb icon-only" onclick="redo()" title="Redo (Cmd+Shift+Z)" ${redoStack.length?'':'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/></svg></button>
      <div class="bar-sep"></div>
      <button class="bb icon-only" onclick="UI.modal='conflicts';render()" title="Issues &amp; conflicts" style="position:relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z"/></svg>
        ${conflictBadge}
      </button>
      <button class="bar-status ${st}" onclick="cycleStatus()" title="Click to advance status">${STATUS_LBL[st]}</button>
      <div class="bar-sep"></div>
      <button class="bb" onclick="openEntries()">Entries</button>
      <button class="bb" onclick="openProjections()">Projections</button>
      <button class="bb" onclick="openLibrary()">Library</button>
      <button class="bb icon-only" onclick="openHistory()" title="Version history" ${S.currentLibraryId?'':'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg></button>
      <button class="bb" onclick="saveSchedule()">Save</button>
      <button class="bb red" onclick="UI.modal='generate';render()">Generate</button>
    </div>
    <div class="bar-sync" ${sync.err?'onclick="retryCloudSync()" title="Click to retry cloud connection" style="cursor:pointer"':''}><div class="sync-pip ${sync.saving?'saving':sync.err?'error':''}"></div><span class="sync-lbl">${sync.saving?'Saving…':sync.err?'Offline — tap to retry':'Saved '+fmtRelativeTime(lastSavedAt||S.updatedAt)}</span></div>
  </header>`;
}

// ── TIMELINE SUB-BAR ──────────────────────────────────────────────────
function renderTlBar(timed){
  const day=S.meet.days.find(d=>d.id===UI.dayId);
  const daySess=day?timedForDay(UI.dayId):[];
  const dayStart=daySess.length?Math.min(...daySess.map(s=>s.timing.warmupStartMinutes)):null;
  const dayEnd=daySess.length?Math.max(...daySess.map(s=>s.timing.sessionEndMinutes)):null;
  const comp=daySess.filter(s=>!s.isPractice).length;
  return`<div class="tl-bar">
    <span class="tl-title">${day?fullDate(day.date):'Schedule'}</span>
    <div class="tl-spacer"></div>
    ${dayStart!==null?`<span class="tl-day-info"><b>${comp}</b> sessions · <b>${f12(dayStart)}</b>–<b>${f12(dayEnd)}</b> · ${fdur(dayEnd-dayStart)}</span>`:''}
    ${daySess.length>1?`<button class="tl-iconbtn" onclick="zeroBuffersForDay('${UI.dayId}')" title="Remove buffers for this day — pack all sessions back-to-back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h4M4 12h6M4 17h4M20 7h-4M20 12h-6M20 17h-4"/><path d="M14 12h-4"/></svg></button>`:''}
    <button class="tl-iconbtn ${UI.previewOpen?'active':''}" onclick="UI.previewOpen=!UI.previewOpen;if(UI.previewOpen){UI.editSessId=null;UI.entriesOpen=false}render()" title="Quick preview"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
    <button class="tl-addbtn" onclick="showAddMenu()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> Add block</button>
  </div>`;
}

// ── TIMELINE BODY ─────────────────────────────────────────────────────
function renderTimeline(timed){
  const day=S.meet.days.find(d=>d.id===UI.dayId);
  if(!day)return`<div class="tl-body"><div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No days yet</div><div class="empty-sub">Click + in the day bar to add a competition day</div></div></div>`;
  const sessions=timedForDay(UI.dayId);
  const warns=buildWarnings(UI.dayId);
  if(!sessions.length)return`<div class="tl-body"><div class="empty"><div class="empty-icon"><img src="../shared/images/diver-mark.svg?v=202607082245" alt="" style="width:36px;height:36px;object-fit:contain;opacity:.5"/></div><div class="empty-title">No sessions yet</div><div class="empty-sub">Click "Add block" to start building this day</div></div></div>`;
  return`<div class="tl-body">
    ${sessions.map(s=>renderCard(s,timed,warns)).join('')}
    <div class="addrow"><div class="addrow-line"></div><button class="addrow-btn" onclick="showAddMenu()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><path d="M12 5v14M5 12h14"/></svg> Add session or practice</button><div class="addrow-line"></div></div>
  </div>`;
}

function renderCard(sess,timed,warns){
  const t=sess.timing;const isPrac=sess.isPractice;
  const isEditing=UI.editSessId===sess.id;
  const n=getSessNum(sess,timed);
  const isTraining=isPrac&&sess.title==='Open Training';

  // ── PRACTICE / TRAINING CARDS — distinct, informative layout ──
  if(isPrac){
    const flights=t.flightTimes||[];
    const dur=t.sessionEndMinutes-t.warmupStartMinutes;
    const typeColor=isTraining?'var(--train)':'var(--prac)';
    const typeBg=isTraining?'var(--train-bg)':'var(--prac-bg)';
    const typeLabel='Open Training';
    return`<div class="sc ${isTraining?'train':'prac'} pcard ${isEditing?'editing':''}" id="sc-${sess.id}">
      <div class="pcard-hd" onclick="openEdit('${sess.id}')" style="background:${typeBg}">
        <div class="pcard-main">
          <div class="pcard-name" style="color:${typeColor}">${esc(sess.title||typeLabel)}</div>
          <div class="pcard-meta">${sess.fitToClose?`Until facility close · ${fdur(dur)}`:flights.length?`${flights.length} flight${flights.length>1?'s':''} · ${fdur(dur)}`:`Open pool · ${fdur(dur)}`}</div>
        </div>
        <div class="pcard-time">
          <div class="pcard-time-range" style="color:${typeColor}">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)}${sess.fitToClose?' 🔒':''}</div>
          <div class="pcard-time-dur">${sess.fitToClose?'fits to close':fdur(dur)}</div>
        </div>
        <div class="sc-actions">
          <button class="sc-act drag-handle" onclick="event.stopPropagation();openMoveDialog('${sess.id}')" title="Move"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg></button>
          <button class="sc-act" onclick="event.stopPropagation();openEdit('${sess.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        </div>
      </div>
      ${flights.length?`<div class="pcard-flights">${flights.map(f=>`<div class="pcard-flight"><div class="pcard-flight-bar" style="background:${f.color||typeColor}"></div><div class="pcard-flight-name">${esc(f.name)}</div><div class="pcard-flight-time">${f12(f.startMinutes)} – ${f12(f.endMinutes)}</div><div class="pcard-flight-dur">${fdur(f.durationMinutes)}</div></div>`).join('')}</div>`:''}
    </div>`;
  }

  // ── COMPETITION CARDS ──
  const hasFinals=sess.events.some(e=>e.round==='Final');
  const hasPrelims=sess.events.some(e=>e.round==='Prelim');
  const hasQual=sess.events.some(e=>e.round==='Qualifier');
  const warn=warns?.find(w=>w.sessId===sess.id);
  const buf=Number(sess.bufferMinutes||0);

  let badgeClass='comp',badgeTxt='Session';
  if(hasFinals){badgeClass='final';badgeTxt='Finals';}
  else if(hasPrelims){badgeClass='prelim';badgeTxt='Prelims';}
  else if(hasQual){badgeClass='qualifier';badgeTxt='Qualifier';}

  const cardClass=hasFinals?'finals':'comp';
  // Sub-line summarizes the actual events so you can read the card at a glance
  const evNames=sess.events.map(e=>evName(e)).join(' · ');
  const sub=sess.events.length?evNames:'No events yet';
  const bufChips=[0,5,10,15].map(v=>`<button class="bufchip ${buf===v?'on':''}" onclick="event.stopPropagation();setBuffer('${sess.id}',${v})">${v===0?'0':v+'m'}</button>`).join('');

  return`<div class="sc ${cardClass} ${isEditing?'editing':''}" id="sc-${sess.id}">
    <div class="sc-hd" onclick="openEdit('${sess.id}')">
      <span class="badge ${badgeClass}">${badgeTxt}</span>
      <div class="sc-titles">
        <div class="sc-name">Session ${n}</div>
        <div class="sc-sub">${esc(sub)}</div>
      </div>
      <div class="sc-time">
        <div class="sc-time-main">${f12r(t.warmupStartMinutes,t.sessionEndMinutes)}</div>
        <div class="sc-time-sub">${fdur(t.sessionEndMinutes-t.warmupStartMinutes)} · ${sess.events.reduce((a,e)=>a+Number(e.finalDivers||e.projectedDivers||e.numberOfDivers||0),0)} athletes</div>
      </div>
      <div class="sc-actions">
        <button class="sc-act drag-handle" onclick="event.stopPropagation();openMoveDialog('${sess.id}')" title="Move session"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg></button>
        <button class="sc-act" onclick="event.stopPropagation();openEdit('${sess.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      </div>
    </div>
    <div class="sc-wu"><div class="sc-wu-icon"></div><span class="sc-wu-lbl">Warm-up</span><span class="sc-wu-time">${f12(t.warmupStartMinutes)} – ${f12(t.warmupEndMinutes)} · ${sess.warmupMinutes||55} min</span></div>
    ${sess.events.length?renderCardEvents(sess,t):`<div style="padding:12px 18px;font-size:12px;color:var(--tx3)">No events yet — add one below</div>`}
    ${warn?`<div class="sc-warn clickable" onclick="resolveCardWarning('${sess.id}')"><div class="sc-warn-icon"></div><span class="sc-warn-txt">${esc(warn.msg)}</span><button class="sc-warn-fix" onclick="event.stopPropagation();resolveCardWarning('${sess.id}')">Fix →</button><button class="sc-warn-ack" onclick="event.stopPropagation();ackWarn('${warn.key}')">Dismiss</button></div>`:''}
    <div class="sc-foot">
      <span class="sc-foot-lbl">Buffer:</span>
      <div class="bufchips">${bufChips}</div>
      <div class="sc-foot-sp"></div>
      <button class="sc-addev" onclick="event.stopPropagation();UI.modal='add-event';UI.pickerSessId='${sess.id}';UI.pickerSearch='';UI.pickerPreset='';UI.pickerRound='';render()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px;height:12px"><path d="M12 5v14M5 12h14"/></svg> Add event</button>
    </div>
  </div>`;
}

function renderCardPrac(sess,t){
  const flights=t.flightTimes||[];
  if(!flights.length)return`<div class="sc-pool"><div class="sc-pool-icon"></div><span class="sc-pool-lbl">Pool open</span><span class="sc-pool-time">${f12(t.eventStartMinutes)} – ${f12(t.sessionEndMinutes)} · ${fdur(t.sessionEndMinutes-t.eventStartMinutes)}</span></div>`;
  return`<div class="sc-flights">${flights.map(f=>`<div class="sc-flight"><div class="sc-flight-bar" style="background:${f.color||'#171F69'}"></div><div class="sc-flight-name">${esc(f.name)}</div><div class="sc-flight-time">${f12(f.startMinutes)} – ${f12(f.endMinutes)}</div><div class="sc-flight-dur">· ${fdur(f.durationMinutes)}</div></div>`).join('')}</div>`;
}

function renderCardEvents(sess,t){
  return`<div class="sc-events">${(t.events||[]).map(ev=>{
    const split=ev.manualSplit&&!isPlatform(ev.apparatus)&&ev.round!=='Final';
    const dur={evMin:ev.evMin,rawMin:ev.rawMin};
    const divers=ev._combined?ev._combinedDivers:entryValue(ev);
    const needsSplit=(ev.rawMin>=3||divers>=40)&&ev.round!=='Final'&&!ev._combined;
    const roundCls=(ev.round||'qualifier').toLowerCase().replace(/[^a-z]+/g,'');
    const name=ev._combined?ev._combinedNames.join(' + '):evName(ev);
    const diveSub=ev._combined?`${ev._combinedMembers.length} events combined`:`${ev.numberOfDives||ev.defaultDives||0} dives · ${ev.secondsPerDive||ev.defaultSpd||35}s/dive`;
    return`<div class="sc-ev ${ev._combined?'is-combined':''} ${ev._simul?'is-simul':''}" draggable="true" data-ev="${ev.id}" data-sess="${sess.id}">
      <span class="ev-handle" title="Drag to reorder or to another session">⠿</span>
      <div class="ev-info">
        <div class="ev-name">${esc(name)}${ev._combined?'<span class="ev-tag combined">COMBINED</span>':''}${ev._simul?'<span class="ev-tag simul">SIMULTANEOUS</span>':''}</div>
        <div class="ev-sub">${diveSub} · ${fdur(ev.evMin)}</div>
      </div>
      <div class="ev-stat">
        <span class="ev-stat-val ${divers?'':'empty'}">${divers||'—'}</span>
        <span class="ev-stat-lbl">divers</span>
      </div>
      ${ev.round&&ev.round!=='Custom Block'&&!ev._combined?`<span class="ev-badge ${roundCls}">${esc(ev.round)}</span>`:''}
      ${(!isPlatform(ev.apparatus)&&ev.round!=='Final'&&!ev._combined)?`<button class="ev-splitbtn ${split?'on':needsSplit?'rec':''}" onclick="event.stopPropagation();toggleSplit('${sess.id}','${ev.id}')" title="${split?'Remove split':needsSplit?'Split recommended':'Toggle split'}">${split?'÷ Split':needsSplit?'⚠ Split?':'Split'}</button>`:''}
      ${split&&(isPlatform(ev.apparatus)||ev.round==='Final'||ev._combined)?`<span class="ev-badge split">Split</span>`:''}
      <span class="ev-time">${f12r(ev.eventStartMinutes,ev.eventEndMinutes)}</span>
      <button class="ev-rm" onclick="event.stopPropagation();removeEv('${sess.id}','${ev.id}')" title="Remove">×</button>
    </div>`;
  }).join('')}</div>`;
}

// ── RIGHT EDIT PANEL ──────────────────────────────────────────────────
function renderEditPanel(timed){
  const sess=S.sessions.find(s=>s.id===UI.editSessId);if(!sess)return'';
  const t=sess.timing||calcSessTiming(sess);
  const isPrac=sess.isPractice;const n=getSessNum(sess,timed);
  const title=isPrac?(sess.title||'Open Training'):`Session ${n}`;
  const flights=sess.flights||[];
  const intro=Number(sess.introMinutes||0);
  const buf=Number(sess.bufferMinutes||0);
  const cat=buildCatalog(S.meet.meetType);
  const sessUsed=new Set(sess.events.map(e=>`${e.level}|${e.gender}|${e.apparatus}|${e.round}`));
  const body=isPrac?renderEditPrac(sess,t,flights):renderEditComp(sess,t,timed,intro,buf,cat,sessUsed);
  return`<div class="edit-panel open">
    <div class="ep-head">
      <div><div class="ep-title">${esc(title)}</div><div class="ep-sub">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)} · ${fdur(t.sessionEndMinutes-t.warmupStartMinutes)}</div></div>
      <button class="ep-close" onclick="closeEdit()">×</button>
    </div>
    <div class="ep-body">${body}</div>
    <div class="ep-foot">
      <button class="btn btn-d btn-sm btn-gh" onclick="deleteSession('${sess.id}')">Delete</button>
      <div style="flex:1"></div>
      <button class="btn btn-sm" onclick="closeEdit()">Done</button>
    </div>
  </div>`;
}

function renderEditPrac(sess,t,flights){
  if(flights.length)ensureProjDataLoaded();
  const showCnt=UI.showFlightCounts!==false;
  const ewcChip=(f,v)=>`<button class="chip ${f.ewcMeet===v?'on':''}" onclick="updFlightTag('${sess.id}','${f.id}','ewcMeet','${f.ewcMeet===v?'':v}')">${v}</button>`;
  const zoneChip=(f,v)=>`<button class="chip ${f.zone===v?'on':''}" style="height:24px;padding:0 8px;font-size:10px" onclick="updFlightTag('${sess.id}','${f.id}','zone','${f.zone===v?'':v}')">${v}</button>`;
  return`
    <div class="fg"><label class="fl">Block name</label><input class="fi" value="${esc(sess.title||'')}" placeholder="Open Training" onchange="updSess('${sess.id}','title',this.value)"/></div>
    <div class="fg2">
      <div class="fg"><label class="fl">Start time</label><input class="fi" type="time" value="${f24(sess.warmupStartMinutes)}" onchange="updSess('${sess.id}','warmupStartMinutes',pt(this.value))"/></div>
      <div class="fg"><label class="fl">Duration (min) ${sess.fitToClose?'🔒':''}</label>${sess.fitToClose?`<div class="fi" style="background:var(--surf3);color:var(--tx2);display:flex;align-items:center;font-weight:600" title="Auto-fit to facility close">${fdur(t.fitDur||0)} (auto)</div>`:`<input class="fi" type="number" min="15" step="15" value="${sess.events[0]?.customDurationMinutes||90}" ${flights.length?'disabled':''} onchange="updEv('${sess.id}','${sess.events[0]?.id||''}','customDurationMinutes',this.value)"/>`}</div>
    </div>
    <div class="fitclose-box">
      <div class="fitclose-toggle-row">
        <label class="fitclose-label"><input type="checkbox" ${sess.fitToClose?'checked':''} onchange="toggleFitToClose('${sess.id}')"/> Fit to facility close time</label>
        <div class="fitclose-time ${sess.fitToClose?'':'dim'}">
          <span>Facility closes</span>
          <input class="fi-sm" type="time" value="${f24(dayCloseFor(sess.dayId))}" onchange="setDayClose('${sess.dayId}',pt(this.value))"/>
        </div>
      </div>
      ${sess.fitToClose?`<div class="fitclose-note">Ends at ${f12(dayCloseFor(sess.dayId))} — duration adjusts automatically as earlier events shift.${(t.fitDur||0)<=0?' <strong style="color:var(--red)">⚠ Starts after close — no time left.</strong>':''}</div>`:''}
    </div>
    <div class="fdiv"></div>
    <div class="fsec" style="display:flex;align-items:center;justify-content:space-between">
      <span>Flights <span style="font-size:10px;font-weight:400;color:var(--tx3)">optional — times auto-stack</span></span>
      ${flights.length?`<label style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:600;color:var(--tx3);cursor:pointer"><input type="checkbox" ${showCnt?'checked':''} onchange="UI.showFlightCounts=this.checked;patchPracEditModal()"/> Show athlete counts</label>`:''}
    </div>
    <p style="font-size:11px;color:var(--tx3);margin-bottom:10px">e.g. "Zone C — 45 min" then "Zone D — 45 min" — tag a flight below and its count fills in automatically</p>
    ${flights.length?`<div style="margin-bottom:8px">${flights.map((f,i)=>{const ft=(t.flightTimes||[])[i]||{};const cnt=athleteCountForFlight(f);const cntLbl=cnt==null?(UI.projRows==null?'Loading counts…':'Tag a zone or E/W/C to see a count'):cnt+' athlete'+(cnt===1?'':'s');return`<div class="flight-row">
      <div class="flight-bar" style="background:${f.color||'#171F69'}"></div>
      <input id="flight-name-${f.id}" class="flight-name-inp" value="${esc(f.name)}" placeholder="Flight name" onchange="updFlight('${sess.id}','${f.id}','name',this.value)"/>
      <input id="flight-dur-${f.id}" class="flight-dur-inp" type="number" min="5" step="5" value="${f.durationMinutes||45}" onchange="updFlight('${sess.id}','${f.id}','durationMinutes',this.value)"/>
      <span style="font-size:10px;color:var(--tx3)">min</span>
      <div class="flight-time-lbl">${ft.startMinutes!==undefined?`${f12(ft.startMinutes)}–${f12(ft.endMinutes)}`:''}</div>
      <button class="flight-rm" onclick="removeFlight('${sess.id}','${f.id}')">×</button>
    </div>
    <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:3px 0 10px 20px">
      <span style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:.04em">Zone</span>
      ${['A','B','C','D','E','F'].map(v=>zoneChip(f,v)).join('')}
      <span style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:.04em;margin-left:8px">E/W/C</span>
      ${ewcChip(f,'East')}${ewcChip(f,'Central')}${ewcChip(f,'West')}
      ${showCnt?`<span style="font-size:11px;font-weight:600;color:var(--navy);margin-left:auto;white-space:nowrap">${esc(cntLbl)}</span>`:''}
    </div>`}).join('')}
    <div style="font-size:11px;color:var(--tx3);margin-top:4px;text-align:right">Total: ${fdur(flights.reduce((s,f)=>s+Number(f.durationMinutes||0),0))}</div>
    </div>`:''}
    <button class="add-flight-btn" onclick="addFlight('${sess.id}')">+ Add flight</button>`;
}


// Combine / Simultaneous management panel inside the session editor
function renderCombinePanel(sess,t){
  const evs=sess.events;
  // Current combined clusters and simul groups
  const clusters={};evs.forEach(e=>{if(e.combinedWith)(clusters[e.combinedWith]=clusters[e.combinedWith]||[]).push(e);});
  const simulGroups={};evs.forEach(e=>{if(e.simulGroup)(simulGroups[e.simulGroup]=simulGroups[e.simulGroup]||[]).push(e);});
  const hasCombos=Object.keys(clusters).length>0;
  const hasSimul=Object.keys(simulGroups).length>0;
  return`<div class="combine-panel">
    <div class="combine-head">
      <span class="combine-title">Combine &amp; Simultaneous</span>
      <span class="combine-sub">Merge small events, or run boards at the same time</span>
    </div>
    <div class="combine-actions">
      <button class="combine-btn" onclick="openCombinePicker('${sess.id}','combine')"><span class="cb-ic">⛓</span> Combine events…</button>
      <button class="combine-btn" onclick="openCombinePicker('${sess.id}','simul')"><span class="cb-ic">⇉</span> Run simultaneously…</button>
    </div>
    ${hasCombos?`<div class="combine-list">${Object.entries(clusters).map(([leadId,members])=>{
      const lead=evs.find(e=>e.id===leadId);if(!lead)return'';
      const all=[lead,...members];
      return`<div class="combine-cluster"><span class="cc-tag combined">COMBINED</span><span class="cc-names">${all.map(e=>esc(evName(e))).join(' + ')}</span><button class="cc-split" onclick="uncombineCluster('${sess.id}','${leadId}')">Split apart</button></div>`;
    }).join('')}</div>`:''}
    ${hasSimul?`<div class="combine-list">${Object.entries(simulGroups).map(([gid,members])=>{
      if(members.length<2)return'';
      return`<div class="combine-cluster"><span class="cc-tag simul">SIMULTANEOUS</span><span class="cc-names">${members.map(e=>esc(evName(e))).join(' + ')}</span><button class="cc-split" onclick="clearSimultaneous('${sess.id}','${members[0].id}')">Separate</button></div>`;
    }).join('')}</div>`:''}
  </div>`;
}
// Picker modal to select which events to combine / run simultaneously
function openCombinePicker(sessId,mode){
  UI.combinePicker={sessId,mode,selected:[]};
  render();
}
function toggleCombinePick(evId){
  const cp=UI.combinePicker;if(!cp)return;
  const i=cp.selected.indexOf(evId);
  if(i>=0)cp.selected.splice(i,1);else cp.selected.push(evId);
  render();
}
function confirmCombinePicker(){
  const cp=UI.combinePicker;if(!cp||cp.selected.length<2){toast('Pick at least 2 events');return;}
  if(cp.mode==='combine'){
    // first selected = lead
    combineEvents(cp.sessId,cp.selected[0],cp.selected.slice(1));
  } else {
    setSimultaneous(cp.sessId,cp.selected);
  }
  UI.combinePicker=null;render();
}
function renderCombinePickerModal(){
  const cp=UI.combinePicker;if(!cp)return'';
  const sess=S.sessions.find(s=>s.id===cp.sessId);if(!sess)return'';
  const isCombine=cp.mode==='combine';
  return`<div class="modal-bg" onclick="if(event.target===this){UI.combinePicker=null;render()}">
    <div class="modal modal-sm" onclick="event.stopPropagation()">
      <div class="modal-hd"><span class="modal-title">${isCombine?'Combine events':'Run simultaneously'}</span><button class="modal-close" onclick="UI.combinePicker=null;render()">×</button></div>
      <div class="modal-body">
        <p style="font-size:12.5px;color:var(--tx2);line-height:1.5;margin-bottom:12px">${isCombine?'Select 2–3 events to merge into one. They run together as a single event — each diver keeps their own dive count and the times add up. The first one you pick is the lead.':'Select events that run at the same time on separate boards. They share a start time — this is distinct from Combined, where events merge into one.'}</p>
        <div class="cpick-list">${sess.events.filter(e=>!e.combinedWith).map(ev=>{
          const sel=cp.selected.indexOf(ev.id);
          const order=sel>=0?sel+1:null;
          return`<button class="cpick-item ${sel>=0?'sel':''}" onclick="toggleCombinePick('${ev.id}')">
            <span class="cpick-check">${sel>=0?(isCombine?(order===1?'★':order):'✓'):''}</span>
            <span class="cpick-name">${esc(evName(ev))}</span>
            <span class="cpick-meta">${entryValue(ev)||0} divers · ${ev.round||''}</span>
          </button>`;
        }).join('')}</div>
        ${isCombine&&cp.selected.length>0?`<div style="font-size:11px;color:var(--tx3);margin-top:8px">★ = lead event</div>`:''}
      </div>
      <div class="modal-foot"><button class="btn btn-sm btn-gh" onclick="UI.combinePicker=null;render()">Cancel</button><button class="btn btn-sm btn-p" onclick="confirmCombinePicker()">${isCombine?'Combine':'Set simultaneous'} (${cp.selected.length})</button></div>
    </div>
  </div>`;
}

function renderEditComp(sess,t,timed,intro,buf,cat,sessUsed){
  const introChips=[0,5,10,15].map(v=>`<button class="chip ${intro===v?'on':''}" onclick="updSess('${sess.id}','introMinutes',${v})">${v===0?'Off':v+'m'}</button>`).join('');
  const bufChips=[0,5,10,15].map(v=>`<button class="chip ${buf===v?'on-g':''}" onclick="setBuffer('${sess.id}',${v})">${v===0?'None':v+'m'}</button>`).join('');
  // Session timing summary box
  const sessSummary=`<div style="background:var(--surf2);border:1px solid var(--bd);border-radius:var(--r);padding:10px 12px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
    <div><div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.04em">Session window</div><div style="font-size:15px;font-weight:700;color:var(--tx);margin-top:2px;font-variant-numeric:tabular-nums">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)}</div></div>
    <div style="text-align:right"><div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.04em">Total</div><div style="font-size:15px;font-weight:700;color:var(--navy);margin-top:2px">${fdur(t.sessionEndMinutes-t.warmupStartMinutes)}</div></div>
  </div>`;
  return`
    ${sessSummary}
    <div class="fg2">
      <div class="fg"><label class="fl">Warm-up start</label><input class="fi" type="time" value="${f24(sess.warmupStartMinutes)}" onchange="updSess('${sess.id}','warmupStartMinutes',pt(this.value))"/></div>
      <div class="fg"><label class="fl">Warm-up length</label>
      <div class="wu-hotrow">
        ${[25,45,55].map(v=>`<button class="wu-hot ${Number(sess.warmupMinutes||55)===v?'on':''}" onclick="updSess('${sess.id}','warmupMinutes',${v})">${v}m</button>`).join('')}
        <input class="fi wu-hotinp" type="number" min="0" step="5" value="${sess.warmupMinutes||55}" onchange="updSess('${sess.id}','warmupMinutes',this.value)"/>
      </div></div>
    </div>
    <div class="fg"><label class="fl">Intro / ceremony before events</label><div class="chiprow">${introChips}<button class="chip" onclick="askPrompt({title:'Intro / parade (min)',message:'Minutes for intro before the first event.',inputType:'number',defaultValue:sess.introMinutes||0,confirmText:'Set',onConfirm:(v)=>{if(v!=='')updSess('${sess.id}','introMinutes',Number(v)||0)}})">Custom</button></div></div>
    <div class="fg"><label class="fl">Buffer after session</label><div class="chiprow">${bufChips}<button class="chip" onclick="askPrompt({title:'Buffer after session (min)',message:'Minutes before the next session starts.',inputType:'number',defaultValue:sess.bufferMinutes||0,confirmText:'Set',onConfirm:(v)=>{if(v!=='')setBuffer('${sess.id}',Number(v)||0)}})">Custom</button></div></div>
    <div class="fg"><label class="fl">Awards ceremony (+15 min)</label><div class="chiprow"><button class="chip ${sess.awardsEnabled?'on-r':''}" onclick="updSess('${sess.id}','awardsEnabled',${!sess.awardsEnabled})">${sess.awardsEnabled?'On — adds 15 min':'Off'}</button></div></div>
    <div class="fdiv"></div>
    <div class="fsec">Events</div>
    ${sess.events.length>1?renderCombinePanel(sess,t):''}
    ${sess.events.length?`<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">${sess.events.map(ev=>{
      const dur=calcEvDur(ev);
      const tev=(t.events||[]).find(e=>e.id===ev.id)||{};
      const canSplit=!isPlatform(ev.apparatus)&&ev.round!=='Final';
      const split=ev.manualSplit&&canSplit;
      const rc=(ev.round||'qualifier').toLowerCase().replace(/[^a-z]+/g,'');
      // Split delta: compute both ways
      const evCopyUnsplit={...ev,manualSplit:false};
      const evCopySplit={...ev,manualSplit:true};
      const unsplitMin=calcEvDur(evCopyUnsplit).evMin;
      const splitMin=calcEvDur(evCopySplit).evMin;
      const saved=Math.round(unsplitMin-splitMin);
      const splitHint=canSplit&&saved>0?`<div style="font-size:10px;color:var(--split-tx);margin-top:3px">${split?`Split saves ~${fdur(saved)} vs running together`:`Splitting would save ~${fdur(saved)}`}</div>`:'';
      return`<div style="border:1px solid var(--bd);border-radius:var(--r);padding:10px 12px;background:var(--surf)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:12.5px;font-weight:600;color:var(--tx);flex:1">${esc(evName(ev))}</span>
          <span class="ev-badge ${rc}">${esc(ev.round||'')}</span>
          <button class="ev-rm" onclick="removeEv('${sess.id}','${ev.id}')" title="Remove">×</button>
        </div>
        <div style="display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap">
          <div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Divers</div><input class="ep-inp" type="number" min="0" value="${ev.numberOfDivers||0}" onchange="updEv('${sess.id}','${ev.id}','numberOfDivers',this.value)"/></div>
          <div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Dives ${ev.rulebookLocked?'🔒':''}</div>${ev.rulebookLocked?`<div class="ep-inp" style="background:var(--surf3);color:var(--tx2);cursor:default;display:flex;align-items:center;justify-content:center;font-weight:700" title="Locked to USA Diving rulebook (${ev.round})">${ev.numberOfDives||ev.defaultDives||0}</div>`:`<input class="ep-inp" type="number" min="1" value="${ev.numberOfDives||ev.defaultDives||0}" onchange="updEv('${sess.id}','${ev.id}','numberOfDives',this.value)"/>`}</div>
          <div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Sec/dive</div><input class="ep-inp" type="number" min="5" step="1" value="${ev.secondsPerDive||ev.defaultSpd||35}" onchange="updEv('${sess.id}','${ev.id}','secondsPerDive',this.value)"/></div>
          ${canSplit?`<div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Split boards</div><button class="split-toggle ${split?'on':'off'}" onclick="toggleSplit('${sess.id}','${ev.id}')"><span class="split-toggle-dot"></span>${split?'ON':'OFF'}</button></div>`:'<div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Split</div><div style="font-size:11px;color:var(--tx3);padding:6px 0">Platform — N/A</div></div>'}
          <div style="flex:1;text-align:right"><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Runs</div><div style="font-size:12px;font-weight:600;color:var(--navy);font-variant-numeric:tabular-nums">${tev.eventStartMinutes!==undefined?`${f12(tev.eventStartMinutes)}–${f12(tev.eventEndMinutes)}`:'—'}</div></div>
        </div>
        ${splitHint}
      </div>`;
    }).join('')}</div>`:`<p style="font-size:12px;color:var(--tx3);margin-bottom:12px">No events yet.</p>`}
    <button class="btn btn-sm" onclick="UI.modal='add-event';UI.pickerSessId='${sess.id}';UI.pickerSearch='';UI.pickerPreset='';UI.pickerRound='';render()">+ Add event</button>`;
}

// ── ENTRIES PANEL ─────────────────────────────────────────────────────
function renderEntriesPanel(timed){
  const days=S.meet.days;
  const eDayId=UI.entriesDayId||days[0]?.id||'';
  const showAllDays=UI.entriesShowAll;
  const allComp=S.sessions.filter(s=>!s.isPractice);
  const allWithEntries=allComp.reduce((nn,s)=>nn+s.events.filter(e=>Number(e.finalDivers||e.projectedDivers||0)>0).length,0);
  const totalEvs=allComp.reduce((nn,s)=>nn+s.events.length,0);
  const dayTabs=`<button class="enp-daybtn ${showAllDays?'active':''}" onclick="UI.entriesShowAll=true;render()">All days</button>`+
    days.map(d=>`<button class="enp-daybtn ${!showAllDays&&d.id===eDayId?'active':''}" onclick="UI.entriesShowAll=false;UI.entriesDayId='${d.id}';render()">${shortDate(d.date).replace(/,.*/,'')}</button>`).join('');

  // All competition sessions in scope, in timeline order
  const scope=showAllDays?
    days.flatMap(d=>timedForDay(d.id).filter(s=>!s.isPractice).map(s=>({sess:s,day:d}))):
    timedForDay(eDayId).filter(s=>!s.isPractice).map(s=>({sess:s,day:S.meet.days.find(d=>d.id===eDayId)}));

  // Build one continuous fast-entry grid. Each row = an event.
  // Inputs use oninput (store silently, no re-render) so Tab flow + focus is preserved.
  let rowsHtml='';let lastDayId=null;let tabIndex=1;
  scope.forEach(({sess,day})=>{
    const t=sess.timing;const n=getSessNum(sess,timed);
    const hasFinals=sess.events.some(e=>e.round==='Final');
    if(showAllDays&&day&&day.id!==lastDayId){
      rowsHtml+=`<tr class="feg-day-row"><td colspan="7">${shortDate(day.date)}</td></tr>`;
      lastDayId=day.id;
    }
    rowsHtml+=`<tr class="feg-sess-row ${hasFinals?'finals':''}" data-sess-id="${sess.id}"><td colspan="7"><span class="feg-sess-badge ${hasFinals?'final':'prelim'}">${hasFinals?'Finals':sess.events.some(e=>e.round==='Prelim')?'Prelims':sess.events.some(e=>e.round==='Qualifier')?'Qualifier':'Session'}</span> Session ${n} <span class="feg-sess-time">${f12(t.eventStartMinutes)} – ${f12(t.sessionEndMinutes)}</span></td></tr>`;
    (t.events||[]).forEach(ev=>{
      const split=ev.manualSplit&&!isPlatform(ev.apparatus);
      const dur=calcEvDur(ev);
      const isFinal=ev.round==='Final';
      const projSet=ev.projectedDivers!=null&&ev.projectedDivers!=='';
      const finlSet=ev.finalDivers!=null&&ev.finalDivers!=='';
      const proj=projSet?Number(ev.projectedDivers):null;
      const finl=finlSet?Number(ev.finalDivers):null;
      const effective=entryValue(ev);
      const needsSplit=dur.rawMin>=3||effective>=40&&ev.round!=='Final';
      const rc=(ev.round||'qualifier').toLowerCase().replace(/[^a-z]+/g,'');
      const usingFinal=finlSet;
      rowsHtml+=`<tr data-ev-id="${ev.id}" data-sess-id="${sess.id}">
        <td class="feg-name">${esc(evName(ev))}<span class="ev-badge ${rc}" style="margin-left:6px">${esc(ev.round||'')}</span></td>
        <td class="feg-cell"><input type="number" min="0" inputmode="numeric" id="feg-${ev.id}-proj" class="feg-inp proj ${projSet?'on':''}" value="${projSet?proj:''}" placeholder="—" tabindex="${tabIndex++}"
          oninput="setEntry('${sess.id}','${ev.id}','projectedDivers',this.value)"
          onkeydown="entryKey(event,this)"/></td>
        <td class="feg-cell"><input type="number" min="0" inputmode="numeric" id="feg-${ev.id}-final" class="feg-inp final ${finlSet?'on':''}" value="${finlSet?finl:''}" placeholder="${projSet?proj:'—'}" tabindex="${tabIndex++}"
          oninput="setEntry('${sess.id}','${ev.id}','finalDivers',this.value)"
          onkeydown="entryKey(event,this)"/></td>
        <td class="feg-using">${finlSet?'<span class="feg-tag final">Final</span>':projSet?'<span class="feg-tag proj">Proj</span>':''}</td>
        <td class="feg-dives">${ev.numberOfDives||ev.defaultDives||0}<span class="feg-dives-lbl">dives</span></td>
        <td class="feg-split">${(!isPlatform(ev.apparatus)&&ev.round!=='Final')?`<button class="split-toggle sm ${split?'on':needsSplit?'rec':'off'}" onclick="toggleSplit('${sess.id}','${ev.id}')" title="${split?'Split ON':needsSplit?'Split recommended':'Split OFF'}"><span class="split-toggle-dot"></span>${split?'ON':needsSplit?'REC':'OFF'}</button>`:'<span style="color:var(--tx3);font-size:10px">N/A</span>'}</td>
        <td class="feg-window">${f12(ev.eventStartMinutes)}–${f12(ev.eventEndMinutes)}</td>
      </tr>`;
    });
  });

  return`<div class="entries-panel open">
    <div class="enp-head">
      <div><div class="enp-title">Event Entries</div><div class="enp-sub-title">Type a number, press Tab → next cell · ${allWithEntries}/${totalEvs} filled</div></div>
      <button class="enp-close" onclick="closeEntries()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="enp-daybar">${dayTabs}</div>
    <div class="enp-legend">
      <div class="enp-legitem"><span class="enp-legpill proj">Projected</span> estimate</div>
      <div class="enp-legitem"><span class="enp-legpill final">Final</span> confirmed — overrides projected</div>
      <button class="enp-matchall" onclick="copyAllProjectedToFinal()">Copy all Proj → Final</button>
    </div>
    <div class="enp-body">${rowsHtml?`<table class="feg-table"><thead><tr><th style="text-align:left">Event</th><th>Projected</th><th>Final</th><th>Using</th><th>Dives</th><th>Split</th><th>Runs</th></tr></thead><tbody>${rowsHtml}</tbody></table>`:`<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No competition sessions</div></div>`}</div>
    <div class="enp-foot">
      <span class="enp-footinfo">Final overrides Projected for timing · finals can exceed 12 for ties</span>
      <button class="enp-finalsbtn" onclick="applyFinalsAll()">Set Finals → 12</button>
    </div>
  </div>`;
}

// Fast entry: store value WITHOUT re-rendering (preserves focus + Tab flow).
// Recompute timing silently and update just the affected time displays in place.
// CRITICAL: do NOT call render() here — it would destroy the focused <input>
// the user is actively typing into, which causes the "flash" and dropped keystrokes.
// Full render only happens on Tab/Enter/blur/close via commitEntries().
let _entryDirty=false;
function setEntry(sessId,evId,field,value){
  const sess=S.sessions.find(x=>x.id===sessId);if(!sess)return;
  const ev=sess.events.find(e=>e.id===evId);if(!ev)return;
  // Empty string = unset (null); any number including 0 is a real value
  const v=(value===''||value==null)?null:Number(value);
  ev[field]=(v==null||isNaN(v))?null:Math.max(0,v);
  if(field==='projectedDivers'){
    // A real, typed-in value is a manual override — protect it from being
    // silently overwritten the next time "Pre-fill projected entries" runs.
    // Clearing the field (v==null) releases the protection again.
    ev.autoProjected=(v==null)?null:false;
  }
  // Timeline divers: final takes precedence IF entered (incl 0); else projected IF entered; else 0
  ev.numberOfDivers=entryValue(ev);
  if(ev.round==='Final'&&(field==='finalDivers'||field==='projectedDivers')){
    ev.autoFinals=false;
  }
  if(ev.round==='Prelim'&&field==='finalDivers'){
    syncFinalsToPrelim(ev);
  }
  // Re-flow this day immediately so session times update as user types
  reflowDay(S,sess.dayId);
  _entryDirty=true;
  saveS();
  // Surgical DOM update — refresh the time/badge text only, leaving the
  // focused <input> element untouched so the user's typing isn't disturbed.
  surgicalUpdateEntryTimes();
  // Debounced cloud save (no re-render — render only on commit)
  clearTimeout(_entryRenderT);
  _entryRenderT=setTimeout(()=>{
    if(S.currentLibraryId)scheduleSave();
  },800);
}
let _entryRenderT=null;
// Walk visible entry-panel rows and update only the time cells / session times.
// This is the live-feedback equivalent of render() but without destroying inputs.
function surgicalUpdateEntryTimes(){
  const panel=document.querySelector('.entries-panel');
  if(!panel)return;
  // Recompute timing for every session touched by visible rows
  const sessIds=new Set();
  panel.querySelectorAll('tr[data-sess-id]').forEach(tr=>sessIds.add(tr.getAttribute('data-sess-id')));
  sessIds.forEach(sid=>{
    const sess=S.sessions.find(x=>x.id===sid);if(!sess)return;
    const t=calcSessTiming(sess);
    // Update session header time
    const hdr=panel.querySelector(`tr.feg-sess-row[data-sess-id="${sid}"] .feg-sess-time`);
    if(hdr)hdr.textContent=`${f12(t.eventStartMinutes)} – ${f12(t.sessionEndMinutes)}`;
    // Update each event row's "Runs" window cell
    (t.events||[]).forEach(ev=>{
      const row=panel.querySelector(`tr[data-ev-id="${ev.id}"][data-sess-id="${sid}"]`);
      if(!row)return;
      const win=row.querySelector('.feg-window');
      if(win)win.textContent=`${f12(ev.eventStartMinutes)}–${f12(ev.eventEndMinutes)}`;
    });
  });
  // Update the "Using" tag column for every row (Final / Proj / blank) without touching inputs
  panel.querySelectorAll('tr[data-ev-id]').forEach(row=>{
    const evId=row.getAttribute('data-ev-id');
    const sid=row.getAttribute('data-sess-id');
    const sess=S.sessions.find(x=>x.id===sid);if(!sess)return;
    const ev=sess.events.find(e=>e.id===evId);if(!ev)return;
    const projSet=ev.projectedDivers!=null&&ev.projectedDivers!=='';
    const finlSet=ev.finalDivers!=null&&ev.finalDivers!=='';
    const using=row.querySelector('.feg-using');
    if(using)using.innerHTML=finlSet?'<span class="feg-tag final">Final</span>':projSet?'<span class="feg-tag proj">Proj</span>':'';
    // Sync the "on" state on the proj/final inputs without rewriting their value
    const projInp=row.querySelector('.feg-inp.proj');
    const finlInp=row.querySelector('.feg-inp.final');
    if(projInp){projSet?projInp.classList.add('on'):projInp.classList.remove('on');}
    if(finlInp){finlSet?finlInp.classList.add('on'):finlInp.classList.remove('on');
      // Keep placeholder synced to current projected (so unset final shows the proj fallback)
      finlInp.placeholder=projSet?String(Number(ev.projectedDivers)):'—';
    }
  });
}
// The effective diver count an event uses for timing.
// Final wins if it's been entered (including 0); otherwise projected (including 0); else 0.
function entryValue(ev){
  if(ev.finalDivers!=null&&ev.finalDivers!=='')return Number(ev.finalDivers)||0;
  if(ev.projectedDivers!=null&&ev.projectedDivers!=='')return Number(ev.projectedDivers)||0;
  return Number(ev.numberOfDivers)||0;
}
// Sync a finals event's entries from its matching prelim's FINAL count.
// Rule (per user): when user enters Final entries on a PRELIM event, the matching
// FINALS event auto-populates to min(12, prelimFinalCount). Manual override above
// 12 (for ties) is preserved — only finals values <=12 are auto-synced.
function syncFinalsToPrelim(prelimEv){
  if(prelimEv.round!=='Prelim')return; // safety
  if(prelimEv.finalDivers==null||prelimEv.finalDivers==='')return;
  const prelimFinal=Number(prelimEv.finalDivers)||0;
  const target=Math.min(12,prelimFinal); // 0-12 cap (ties handled by manual override)
  S.sessions.forEach(sess=>{
    sess.events.forEach(fe=>{
      if(fe===prelimEv)return;
      if(fe.round!=='Final')return;
      if(fe.level!==prelimEv.level||fe.gender!==prelimEv.gender||fe.apparatus!==prelimEv.apparatus)return;
      // Preserve manual override for ties: if current finals count is >12, leave alone
      const currentFinal=Number(fe.finalDivers||0);
      if(currentFinal>12)return;
      // Otherwise auto-sync (overrides previous autoFinals=false flag since we have
      // a clear rule: 0-12 always tracks the prelim)
      fe.projectedDivers=target;
      fe.finalDivers=target;
      fe.numberOfDivers=target;
      fe.autoFinals=true; // reset to auto-tracking
      const fp=document.getElementById('feg-'+fe.id+'-proj');
      const ff=document.getElementById('feg-'+fe.id+'-final');
      if(fp){fp.value=target;if(target>0)fp.classList.add('on');else fp.classList.remove('on');}
      if(ff){ff.value=target;if(target>0)ff.classList.add('on');else ff.classList.remove('on');ff.classList.add('synced-flash');setTimeout(()=>ff.classList.remove('synced-flash'),600);}
    });
  });
}
// On Enter or Tab, commit + cascade + light refresh of time columns
function entryKey(e,el){
  if(e.key==='Enter'){
    e.preventDefault();
    commitEntries();
    // move focus to next entry input
    const inputs=[...document.querySelectorAll('.feg-inp')];
    const i=inputs.indexOf(el);
    if(i>=0&&i<inputs.length-1)inputs[i+1].focus();
  }else if(e.key==='Tab'){
    // Tab also commits — let the browser handle focus movement naturally
    commitEntries();
  }
}
// Belt-and-suspenders: if focus leaves the entries panel entirely (e.g. user
// clicks the main timeline area without using Tab/Enter), commit so the
// timeline updates too. Uses focusout + a short timeout to check whether
// focus actually moved outside the panel rather than between its inputs.
document.addEventListener('focusout',function(e){
  if(!_entryDirty)return;
  const panel=e.target&&e.target.closest&&e.target.closest('.entries-panel');
  if(!panel)return;
  setTimeout(()=>{
    if(!_entryDirty)return;
    const active=document.activeElement;
    if(active&&active.closest&&active.closest('.entries-panel'))return; // still inside, no commit
    commitEntries();
  },50);
});
function commitEntries(){
  if(!_entryDirty)return;
  _entryDirty=false;
  // Re-flow every day so each session auto-starts after the previous one ends + buffer
  S.meet.days.forEach(d=>reflowDay(S,d.id));
  saveS();if(S.currentLibraryId)scheduleSave();
  render();
}
// Commit when the entries body loses focus (clicking away / closing)
function copyProjectedToFinal(sessId,evId){
  const sess=S.sessions.find(x=>x.id===sessId);const ev=sess?.events.find(e=>e.id===evId);
  if(ev){ev.finalDivers=Number(ev.projectedDivers||0);ev.numberOfDivers=ev.finalDivers;}
  S.sessions.forEach(s=>{if(!s.isPractice)cascadeSession(S,s.id)});
  saveS();if(S.currentLibraryId)scheduleSave();render();
}



function copyProjectedToFinal(sessId,evId){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    const ev=sess.events.find(e=>e.id===evId);if(!ev)return;
    ev.finalDivers=Number(ev.projectedDivers||0);
    ev.numberOfDivers=ev.finalDivers;
    cascadeSession(s,sessId);
  });
  toast('Final set to projected');
}

function copyAllProjectedToFinal(){
  let count=0;
  upd(s=>{
    s.sessions.forEach(sess=>{
      sess.events.forEach(ev=>{
        const proj=Number(ev.projectedDivers||0);
        const finl=Number(ev.finalDivers||0);
        if(proj>0&&!finl){
          ev.finalDivers=proj;
          ev.numberOfDivers=proj;
          count++;
        }
      });
    });
    s.sessions.forEach(sess=>cascadeSession(s,sess.id));
  });
  toast(`${count} events: Projected → Final`);
}
function renderSyncDot(){saveS();if(S.currentLibraryId)scheduleSave()}

// ── ADD MENU ──────────────────────────────────────────────────────────
function showAddMenu(){
  if(!UI.dayId){toast('Add a day first');return}
  UI.modal='add-block';render();
}

// ── DRAG & DROP ───────────────────────────────────────────────────────
function bindDrag(){
  // Event rows: drag within or across sessions
  document.querySelectorAll('[data-ev][draggable]').forEach(el=>{
    el.addEventListener('dragstart',e=>{
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain','EV::'+el.dataset.sess+'::'+el.dataset.ev);
      el.classList.add('dragging');
      UI.draggedEvFrom={sessId:el.dataset.sess,evId:el.dataset.ev};
    });
    el.addEventListener('dragend',()=>{el.classList.remove('dragging');UI.draggedEvFrom=null});
    el.addEventListener('dragover',e=>{e.preventDefault();el.style.outline='2px solid var(--navy)'});
    el.addEventListener('dragleave',()=>el.style.outline='');
    el.addEventListener('drop',e=>{
      e.preventDefault();el.style.outline='';
      const data=e.dataTransfer.getData('text/plain');
      if(!data.startsWith('EV::'))return;
      const[,fromSess,fromEv]=data.split('::');
      const toEv=el.dataset.ev,toSess=el.dataset.sess;
      if(fromSess===toSess){
        // Reorder within session
        if(fromEv===toEv)return;
        upd(s=>{const sess=s.sessions.find(x=>x.id===fromSess);if(!sess)return;const fi=sess.events.findIndex(e=>e.id===fromEv),ti=sess.events.findIndex(e=>e.id===toEv);if(fi<0||ti<0)return;const[m]=sess.events.splice(fi,1);sess.events.splice(ti,0,m);cascadeSession(s,fromSess)});
      } else {
        // Cross-session move
        upd(s=>{
          const fromS=s.sessions.find(x=>x.id===fromSess);
          const toS=s.sessions.find(x=>x.id===toSess);
          if(!fromS||!toS)return;
          const fi=fromS.events.findIndex(e=>e.id===fromEv);if(fi<0)return;
          const[ev]=fromS.events.splice(fi,1);
          const ti=toS.events.findIndex(e=>e.id===toEv);
          if(ti<0)toS.events.push(ev);else toS.events.splice(ti,0,ev);
          cascadeSession(s,fromSess);
          cascadeSession(s,toSess);
          if(ev.round==='Prelim')relocateLinkedFinal(s,ev,toS.dayId);
        });
        toast('Event moved');
      }
    });
  });
  // Drop event onto session card header (place at end of that session)
  document.querySelectorAll('.sc').forEach(el=>{
    const sessId=el.id.replace('sc-','');
    el.addEventListener('dragover',e=>{if(UI.draggedEvFrom&&UI.draggedEvFrom.sessId!==sessId){e.preventDefault();el.style.boxShadow='inset 0 0 0 2px var(--navy)'}});
    el.addEventListener('dragleave',()=>el.style.boxShadow='');
    el.addEventListener('drop',e=>{
      el.style.boxShadow='';
      const data=e.dataTransfer.getData('text/plain');
      if(!data.startsWith('EV::'))return;
      const[,fromSess,fromEv]=data.split('::');
      if(fromSess===sessId)return;
      e.preventDefault();
      upd(s=>{
        const fromS=s.sessions.find(x=>x.id===fromSess);
        const toS=s.sessions.find(x=>x.id===sessId);
        if(!fromS||!toS)return;
        const fi=fromS.events.findIndex(e=>e.id===fromEv);if(fi<0)return;
        const[ev]=fromS.events.splice(fi,1);
        toS.events.push(ev);
        cascadeSession(s,fromSess);
        cascadeSession(s,sessId);
        if(ev.round==='Prelim')relocateLinkedFinal(s,ev,toS.dayId);
      });
      toast('Event moved to session');
    });
  });
  // Session card drag → reorder within day OR drop on day tab for cross-day
  document.querySelectorAll('.sc-hd').forEach(hd=>{
    const card=hd.closest('.sc');if(!card)return;
    const sessId=card.id.replace('sc-','');
    hd.setAttribute('draggable','true');
    hd.addEventListener('dragstart',e=>{
      // Only start a SESSION drag if not dragging an event row
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain','SESS::'+sessId);
      UI.draggedSessId=sessId;
      card.style.opacity='.4';
    });
    hd.addEventListener('dragend',()=>{card.style.opacity='';UI.draggedSessId=null;document.querySelectorAll('.sc').forEach(x=>x.classList.remove('sess-drop-above','sess-drop-below'))});
  });
  // Session cards accept session-card drops (same-day reorder, slides into place)
  document.querySelectorAll('.sc').forEach(card=>{
    const targetId=card.id.replace('sc-','');
    card.addEventListener('dragover',e=>{
      if(!UI.draggedSessId||UI.draggedSessId===targetId)return;
      // only if same day
      const dragged=S.sessions.find(s=>s.id===UI.draggedSessId);
      const target=S.sessions.find(s=>s.id===targetId);
      if(!dragged||!target||dragged.dayId!==target.dayId)return;
      e.preventDefault();
      const rect=card.getBoundingClientRect();
      const above=e.clientY<rect.top+rect.height/2;
      card.classList.toggle('sess-drop-above',above);
      card.classList.toggle('sess-drop-below',!above);
    });
    card.addEventListener('dragleave',()=>card.classList.remove('sess-drop-above','sess-drop-below'));
    card.addEventListener('drop',e=>{
      const data=e.dataTransfer.getData('text/plain');
      if(!data.startsWith('SESS::'))return;
      const draggedId=data.replace('SESS::','');
      if(draggedId===targetId)return;
      const dragged=S.sessions.find(s=>s.id===draggedId);
      const target=S.sessions.find(s=>s.id===targetId);
      if(!dragged||!target||dragged.dayId!==target.dayId){card.classList.remove('sess-drop-above','sess-drop-below');return;}
      e.preventDefault();
      const rect=card.getBoundingClientRect();
      const above=e.clientY<rect.top+rect.height/2;
      card.classList.remove('sess-drop-above','sess-drop-below');
      reorderSessionWithinDay(draggedId,targetId,above);
    });
  });
  // Day pills accept session drops
  document.querySelectorAll('.dp[onclick*=selectDay]').forEach(pill=>{
    const m=pill.getAttribute('onclick').match(/selectDay\('([^']+)'\)/);
    if(!m)return;
    const dayId=m[1];
    pill.addEventListener('dragover',e=>{if(UI.draggedSessId){e.preventDefault();pill.classList.add('drop-target')}});
    pill.addEventListener('dragleave',()=>pill.classList.remove('drop-target'));
    pill.addEventListener('drop',e=>{
      pill.classList.remove('drop-target');
      const data=e.dataTransfer.getData('text/plain');
      if(!data.startsWith('SESS::'))return;
      e.preventDefault();
      const sessId=data.replace('SESS::','');
      UI.moveSessionId=sessId;
      UI.moveTargetDayId=dayId;
      UI.moveTargetPos='end';
      render();
    });
  });
}



// ── VERSION HISTORY ───────────────────────────────────────────────────
async function saveVersion(label){
  if(!S.currentLibraryId)return;
  try{
    await nq(`INSERT INTO schedule_builder.schedule_versions(schedule_id,label,data,created_at)VALUES($1,$2,$3::jsonb,now())`,
      [S.currentLibraryId,label||('Snapshot '+new Date().toLocaleString()),JSON.stringify(S)]);
  }catch(e){
    // Table may not exist yet — try to create it
    try{
      await nq(`CREATE TABLE IF NOT EXISTS schedule_builder.schedule_versions(id BIGSERIAL PRIMARY KEY,schedule_id TEXT,label TEXT,data JSONB,created_at TIMESTAMPTZ DEFAULT now())`);
      await nq(`INSERT INTO schedule_builder.schedule_versions(schedule_id,label,data,created_at)VALUES($1,$2,$3::jsonb,now())`,[S.currentLibraryId,label||('Snapshot '+new Date().toLocaleString()),JSON.stringify(S)]);
    }catch(e2){console.warn('version save failed',e2)}
  }
}
async function loadVersions(){
  if(!S.currentLibraryId)return[];
  try{
    const r=await nq(`SELECT id,label,created_at FROM schedule_builder.schedule_versions WHERE schedule_id=$1 ORDER BY created_at DESC LIMIT 30`,[S.currentLibraryId]);
    return(r.rows||[]).map(row=>({id:row[0],label:row[1],createdAt:row[2]}));
  }catch{return[]}
}
function restoreVersion(vid){
  askConfirm({title:'Restore this version?',message:'Your current state will be saved as a new version first, then this version will be loaded.',confirmText:'Restore',onConfirm:()=>_doRestoreVersion(vid)});
}
async function _doRestoreVersion(vid){
  await saveVersion('Auto-backup before restore');
  try{
    const r=await nq(`SELECT data FROM schedule_builder.schedule_versions WHERE id=$1`,[vid]);
    if(r.rows?.length){
      const data=typeof r.rows[0][0]==='string'?JSON.parse(r.rows[0][0]):r.rows[0][0];
      pushUndo();
      S=data;normalizeAllDays(S);saveS();if(S.currentLibraryId)scheduleSave();
      UI.modal=null;initUI();render();toast('Version restored');
    }
  }catch(e){toast('Could not restore version')}
}
async function openHistory(){
  UI.modal='history';UI.historyLoading=true;UI.historyVersions=[];render();
  UI.historyVersions=await loadVersions();UI.historyLoading=false;render();
}
// ── MOVE SESSION (cross-day or reposition) ────────────────────────────
function openMoveDialog(sessId){
  UI.moveSessionId=sessId;
  const sess=S.sessions.find(s=>s.id===sessId);
  UI.moveTargetDayId=sess?.dayId||S.meet.days[0]?.id;
  UI.moveTargetPos='end';
  render();
}
function closeMoveDialog(){UI.moveSessionId=null;render()}
function executeMoveSession(){
  const sessId=UI.moveSessionId;const targetDay=UI.moveTargetDayId;const pos=UI.moveTargetPos;
  if(!sessId||!targetDay)return;
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    sess.dayId=targetDay;
    // Compute new warmupStart based on position
    const sameDay=s.sessions.filter(x=>x.dayId===targetDay&&x.id!==sessId).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
    if(pos==='start'){
      // Place at start: uses this session's OWN buffer to leave the correct gap before
      // whatever follows it (0 buffer = back-to-back, e.g. practice blocks).
      const firstStart=sameDay.length?Number(sameDay[0].warmupStartMinutes):420;
      const sessDur=calcSessTiming(sess).sessionEndMinutes-calcSessTiming(sess).warmupStartMinutes;
      sess.warmupStartMinutes=Math.max(420,firstStart-sessDur-Number(sess.bufferMinutes||0));
      cascadeSession(s,sessId);
    } else if(pos==='end'){
      // Place at end: uses the CURRENT last session's buffer to leave the correct gap
      // before this one starts (0 buffer = back-to-back, e.g. practice blocks).
      let lastEnd=420,lastBuffer=0;
      sameDay.forEach(x=>{const end=calcSessTiming(x).sessionEndMinutes;if(end>=lastEnd){lastEnd=end;lastBuffer=Number(x.bufferMinutes||0);}});
      sess.warmupStartMinutes=ru(lastEnd+lastBuffer,5);
    } else if(typeof pos==='string'&&pos.startsWith('after-')){
      const afterId=pos.replace('after-','');
      const afterSess=sameDay.find(x=>x.id===afterId);
      if(afterSess){
        const afterT=calcSessTiming(afterSess);
        sess.warmupStartMinutes=ru(afterT.sessionEndMinutes+Number(afterSess.bufferMinutes||0),5);
        cascadeSession(s,sessId);
      }
    }
  });
  UI.dayId=targetDay;
  closeMoveDialog();
  toast('Session moved');
}

function renderMoveDialog(){
  if(!UI.moveSessionId)return'';
  const sess=S.sessions.find(s=>s.id===UI.moveSessionId);if(!sess)return'';
  const n=getSessNum(sess,allTimed());
  const targetDay=UI.moveTargetDayId;
  const targetDaySessions=S.sessions.filter(s=>s.dayId===targetDay&&s.id!==UI.moveSessionId).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  const dayBtns=S.meet.days.map(d=>`<button class="move-btn ${d.id===targetDay?'active':''}" onclick="UI.moveTargetDayId='${d.id}';UI.moveTargetPos='end';render()">${shortDate(d.date)}${d.id===sess.dayId?' <span class="move-meta">current</span>':''}</button>`).join('');
  const posBtns=`<button class="move-btn ${UI.moveTargetPos==='start'?'active':''}" onclick="UI.moveTargetPos='start';render()">▲ Start of day</button>`+
    targetDaySessions.map(s=>{const t=calcSessTiming(s);const sn=getSessNum(s,allTimed());const lbl=s.isPractice?(s.title||'Practice'):`Session ${sn}`;return`<button class="move-btn ${UI.moveTargetPos==='after-'+s.id?'active':''}" onclick="UI.moveTargetPos='after-${s.id}';render()">After ${esc(lbl)} <span class="move-meta">ends ${f12(t.sessionEndMinutes)}</span></button>`}).join('')+
    `<button class="move-btn ${UI.moveTargetPos==='end'?'active':''}" onclick="UI.moveTargetPos='end';render()">▼ End of day</button>`;
  return`<div class="modal-bg" onclick="if(event.target===this)closeMoveDialog()" style="z-index:650">
    <div class="modal modal-sm" onclick="event.stopPropagation()">
      <div class="modal-hd"><div><span class="modal-title">Move ${sess.isPractice?esc(sess.title||'Practice'):`Session ${n}`}</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">From ${shortDate(S.meet.days.find(d=>d.id===sess.dayId)?.date||'')}</div></div><button class="modal-close" onclick="closeMoveDialog()">×</button></div>
      <div class="modal-body">
        <label class="fl">Move to day</label>
        <div class="move-day-list" style="margin-bottom:14px">${dayBtns}</div>
        <label class="fl">Position</label>
        <div class="move-pos-list">${posBtns}</div>
      </div>
      <div class="modal-foot"><button class="btn btn-sm" onclick="closeMoveDialog()">Cancel</button><button class="btn btn-sm btn-p" onclick="executeMoveSession()">Move session</button></div>
    </div>
  </div>`;
}

// ── MODALS ────────────────────────────────────────────────────────────

// ── Styled confirm / prompt dialogs (replace ALL native browser popups) ──
function askConfirm(opts){
  // opts: {title, message, confirmText, cancelText, danger, onConfirm}
  UI.dialog={type:'confirm',title:opts.title||'Confirm',message:opts.message||'',
    confirmText:opts.confirmText||'Confirm',cancelText:opts.cancelText||'Cancel',
    danger:Boolean(opts.danger),onConfirm:opts.onConfirm};
  render();
}
function askPrompt(opts){
  // opts: {title, message, placeholder, defaultValue, confirmText, inputType, onConfirm(value)}
  UI.dialog={type:'prompt',title:opts.title||'Enter value',message:opts.message||'',
    placeholder:opts.placeholder||'',defaultValue:opts.defaultValue!=null?String(opts.defaultValue):'',
    confirmText:opts.confirmText||'OK',inputType:opts.inputType||'text',onConfirm:opts.onConfirm};
  render();
}
function closeDialog(){UI.dialog=null;render();}
function dialogConfirm(){
  const d=UI.dialog;if(!d)return;
  if(d.type==='prompt'){
    const el=document.getElementById('dialog-input');
    const val=el?el.value:'';
    UI.dialog=null;render();
    if(d.onConfirm)d.onConfirm(val);
  } else {
    UI.dialog=null;render();
    if(d.onConfirm)d.onConfirm();
  }
}
function renderDialog(){
  const d=UI.dialog;if(!d)return'';
  const isPrompt=d.type==='prompt';
  return`<div class="modal-bg dialog-bg" onclick="if(event.target===this)closeDialog()">
    <div class="dialog" onclick="event.stopPropagation()">
      <div class="dialog-title">${esc(d.title)}</div>
      ${d.message?`<div class="dialog-msg">${esc(d.message)}</div>`:''}
      ${isPrompt?`<input id="dialog-input" class="dialog-input" type="${d.inputType}" value="${esc(d.defaultValue)}" placeholder="${esc(d.placeholder)}" onkeydown="if(event.key==='Enter'){event.preventDefault();dialogConfirm()}if(event.key==='Escape')closeDialog()"/>`:''}
      <div class="dialog-actions">
        <button class="btn btn-sm btn-gh" onclick="closeDialog()">${esc(d.cancelText||'Cancel')}</button>
        <button class="btn btn-sm ${d.danger?'btn-danger':'btn-p'}" onclick="dialogConfirm()">${esc(d.confirmText)}</button>
      </div>
    </div>
  </div>`;
}

function renderModal(timed){
  const fns={meet:renderMeetModal,'add-event':renderPickerModal,library:renderLibraryModal,generate:renderGenerateModal,'add-block':renderAddBlockModal,conflicts:renderConflictsModal,history:renderHistoryModal,shortcuts:renderShortcutsModal,saveDialog:renderSaveDialogModal,projections:renderProjectionsModal};
  const fn=fns[UI.modal];if(!fn)return'';
  return`<div class="modal-bg" onclick="if(event.target===this){UI.modal=null;render()}">${fn(timed)}</div>`;
}

// Add-block chooser — proper modal, NO browser confirm()
function renderProjectionsModal(){
  if(UI.projLoading){
    return`<div class="modal modal-lg" onclick="event.stopPropagation()">
      <div class="modal-hd"><span class="modal-title">Athlete Projections</span><button class="modal-close" onclick="closeProjections()">×</button></div>
      <div class="modal-body" style="text-align:center;color:var(--tx3);padding:40px 22px">Loading projections…</div>
    </div>`;
  }
  if(UI.projError){
    return`<div class="modal modal-lg" onclick="event.stopPropagation()">
      <div class="modal-hd"><span class="modal-title">Athlete Projections</span><button class="modal-close" onclick="closeProjections()">×</button></div>
      <div class="modal-body">
        <div style="color:var(--red);font-size:13px;margin-bottom:12px">Could not load projections: ${esc(UI.projError)}</div>
        <button class="btn btn-p" onclick="refreshProjectionsData()">Retry</button>
      </div>
    </div>`;
  }
  const rows=UI.projRows||[];
  if(!rows.length){
    return`<div class="modal modal-lg" onclick="event.stopPropagation()">
      <div class="modal-hd"><span class="modal-title">Athlete Projections</span><button class="modal-close" onclick="closeProjections()">×</button></div>
      <div class="modal-body" style="text-align:center;color:var(--tx3);padding:30px 22px">
        No projections published yet.<br/>Open Junior Results Audit and click "Publish to Schedule Builder," then refresh here.
      </div>
      <div class="modal-foot"><button class="btn" onclick="refreshProjectionsData()">Refresh</button></div>
    </div>`;
  }
  const publishedAt=rows[0].publishedAt?new Date(rows[0].publishedAt).toLocaleString():'';
  const filtered=filteredProjRows();
  const totalAthletes=new Set(filtered.map(r=>r.diverKey)).size;
  const unknownDisc=new Set(filtered.filter(r=>!r.discipline).map(r=>r.diverKey)).size;
  const ewcChip=v=>`<button class="chip ${UI.projFilterEwc===v?'on':''}" onclick="setProjFilterEwc('${v}')">${v}</button>`;
  const zoneChip=v=>`<button class="chip ${UI.projFilterZone===v?'on':''}" onclick="setProjFilterZone('${v}')">${v}</button>`;
  const bd=projBreakdown();
  const totGirls=bd.reduce((a,r)=>a+r.girls,0),totBoys=bd.reduce((a,r)=>a+r.boys,0);
  return`<div class="modal modal-lg" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Athlete Projections — Junior Nationals</span><button class="modal-close" onclick="closeProjections()">×</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--tx3);margin-bottom:14px;display:flex;align-items:center;gap:8px">
        <span>${totalAthletes} athletes (Zone-direct + E/W/C + HPS) · published ${esc(publishedAt)}</span>
        <button class="btn btn-sm" onclick="refreshProjectionsData()">Refresh</button>
      </div>
      <div class="fg"><label class="fl">East / West / Central</label><div class="chiprow">${ewcChip('East')}${ewcChip('Central')}${ewcChip('West')}</div></div>
      <div class="fg"><label class="fl">Zone (optional, narrower filter)</label><div class="chiprow">${['A','B','C','D','E','F'].map(zoneChip).join('')}</div></div>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:12.5px">
        <thead><tr style="text-align:left;color:var(--tx3);font-size:10px;text-transform:uppercase;letter-spacing:.04em">
          <th style="padding:6px 8px">Age Group</th><th style="padding:6px 8px;text-align:right">Girls</th><th style="padding:6px 8px;text-align:right">Boys</th><th style="padding:6px 8px;text-align:right">Total</th>
        </tr></thead>
        <tbody>
          ${bd.map(r=>`<tr style="border-top:1px solid var(--bd2)"><td style="padding:6px 8px;font-weight:600">${r.group}</td><td style="padding:6px 8px;text-align:right;font-variant-numeric:tabular-nums">${r.girls}</td><td style="padding:6px 8px;text-align:right;font-variant-numeric:tabular-nums">${r.boys}</td><td style="padding:6px 8px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${r.girls+r.boys}</td></tr>`).join('')}
          <tr style="border-top:2px solid var(--bd2)"><td style="padding:6px 8px;font-weight:700">Total</td><td style="padding:6px 8px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${totGirls}</td><td style="padding:6px 8px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${totBoys}</td><td style="padding:6px 8px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${totGirls+totBoys}</td></tr>
        </tbody>
      </table>
      ${unknownDisc?`<div style="font-size:11px;color:var(--tx3);margin-top:10px">Includes ${unknownDisc} HPS athlete${unknownDisc===1?'':'s'} not yet competed this cycle — counted in the totals above, but not assignable to a specific apparatus below.</div>`:''}
    </div>
    <div class="modal-foot">
      <button class="btn" onclick="closeProjections()">Close</button>
      <button class="btn btn-p" onclick="prefillProjections()">Pre-fill projected entries in this schedule</button>
    </div>
  </div>`;
}
function renderAddBlockModal(){
  const chip=(key,label)=>`<button class="chip" onclick="closeModal();addPracticeBlock(UI.dayId,'${key}')">${esc(label)}</button>`;
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Add to schedule</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="choose-grid">
        <div class="choose-card" onclick="closeModal();addSession(UI.dayId,false)">
          <div class="choose-icon comp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:26px;height:26px"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg></div>
          <div class="choose-name">Competition Session</div>
          <div class="choose-desc">Warm-up plus events with rounds, divers, and timing</div>
        </div>
        <div class="choose-card" style="cursor:default" onclick="event.stopPropagation()">
          <div class="choose-icon prac"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:26px;height:26px"><path d="M2 12h20M2 12c0-3 2-5 5-5s5 2 5 5M12 12c0-3 2-5 5-5s5 2 5 5"/></svg></div>
          <div class="choose-name">Practice / Meeting Block</div>
          <div class="choose-desc" style="margin-bottom:10px">Pick a type — timing and title fill in automatically</div>
          <div class="chiprow">
            ${chip('open','Open Training')}
            ${chip('flighted','Flighted Warm-Ups')}
            ${chip('restricted','Restricted Training')}
            ${chip('technical','Technical Meeting')}
            ${chip('custom','Custom')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// Conflicts modal
function renderConflictsModal(){
  const conflicts=detectConflicts();
  const errs=conflicts.filter(c=>c.sev==='err');
  const warns=conflicts.filter(c=>c.sev==='warn');
  const infos=conflicts.filter(c=>c.sev==='info');
  const ordered=[...errs,...warns,...infos];
  return`<div class="modal modal-lg" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Issues & conflicts ${conflicts.length?`<span style="color:var(--tx3);font-weight:500">(${conflicts.length})</span>`:''}</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      ${conflicts.length?`<div class="conflicts-list">${ordered.map((c)=>{
        const realIdx=conflicts.indexOf(c);
        const fixLabel=c.fixHint==='autoSpace'?'Auto-fix spacing':c.fixHint==='entries'?'Enter counts':'Open & fix';
        return`<div class="conflict-item ${c.sev} clickable" onclick="resolveConflict(${realIdx})">
        <div class="conflict-icon ${c.sev}">${c.sev==='err'?'!':c.sev==='warn'?'!':'i'}</div>
        <div class="conflict-body"><div class="conflict-title">${esc(c.title)}</div><div class="conflict-detail">${esc(c.detail)}</div><div class="conflict-loc">${esc(c.loc)}</div></div>
        <button class="conflict-fix" onclick="event.stopPropagation();resolveConflict(${realIdx})">${fixLabel} →</button>
      </div>`;}).join('')}</div>`:`<div class="conflict-ok"><div class="conflict-ok-icon">✓</div><div class="empty-title">No conflicts found</div><div class="empty-sub">Your schedule looks clean — no overlaps, boundary issues, or missing entries.</div></div>`}
    </div>
    <div class="modal-foot"><button class="btn btn-p" onclick="closeModal()">Done</button></div>
  </div>`;
}

// History modal
function renderHistoryModal(){
  return`<div class="modal" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Version history</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      ${!S.currentLibraryId?`<div class="empty"><div class="empty-title">Save to cloud first</div><div class="empty-sub">Version history starts once you save this schedule to the cloud.</div></div>`:
        UI.historyLoading?`<div style="text-align:center;padding:24px;color:var(--tx3);font-size:13px">Loading history…</div>`:
        (UI.historyVersions&&UI.historyVersions.length)?`<div class="hist-list">
          <div class="hist-item"><div class="hist-dot current"></div><div class="hist-info"><div class="hist-label">Current version</div><div class="hist-time">Working copy · ${fmtRelativeTime(S.updatedAt)}</div></div></div>
          ${UI.historyVersions.map(v=>`<div class="hist-item"><div class="hist-dot"></div><div class="hist-info"><div class="hist-label">${esc(v.label)}</div><div class="hist-time">${new Date(v.createdAt).toLocaleString()}</div></div><button class="hist-restore" onclick="restoreVersion(${v.id})">Restore</button></div>`).join('')}
        </div>`:`<div class="empty"><div class="empty-title">No versions yet</div><div class="empty-sub">Each cloud save creates a restore point. Save now to start tracking.</div></div>`}
    </div>
    <div class="modal-foot">
      ${S.currentLibraryId?`<button class="btn btn-sm" onclick="saveVersion('Manual snapshot').then(()=>{openHistory()})">Snapshot now</button>`:''}
      <div style="flex:1"></div>
      <button class="btn btn-p" onclick="closeModal()">Close</button>
    </div>
  </div>`;
}

// Shortcuts cheat sheet
function renderShortcutsModal(){
  const rows=[['Undo','Cmd / Ctrl + Z'],['Redo','Cmd / Ctrl + Shift + Z'],['Save to cloud','Cmd / Ctrl + S'],['Close panel / modal','Esc'],['This cheat sheet','?']];
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Keyboard shortcuts</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      ${rows.map(([a,b])=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--bd)"><span style="font-size:13px;color:var(--tx2)">${a}</span><span style="font-size:11px;color:var(--tx3);font-weight:600">${b}</span></div>`).join('')}
    </div>
    <div class="modal-foot"><button class="btn btn-p" onclick="closeModal()">Got it</button></div>
  </div>`;
}
const closeModal=()=>{UI.modal=null;render()};

function renderMeetModal(){
  const tzOpts=TZS.map(t=>`<option value="${t.v}" ${S.meet.timezone===t.v?'selected':''}>${t.l}</option>`).join('');
  const typeOpts=Object.entries(MEET_TYPES).map(([k,v])=>`<option value="${k}" ${S.meet.meetType===k?'selected':''}>${v.l}</option>`).join('');
  return`<div class="modal" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Meet setup</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="fg"><label class="fl">Meet name</label><input class="fi" value="${esc(S.meet.name)}" onchange="upd(s=>s.meet.name=this.value)"/></div>
      <div class="fg2"><div class="fg"><label class="fl">Venue</label><input class="fi" value="${esc(S.meet.venue)}" onchange="upd(s=>s.meet.venue=this.value)"/></div><div class="fg"><label class="fl">City / state</label><input class="fi" value="${esc(S.meet.city||'')}" onchange="upd(s=>s.meet.city=this.value)"/></div></div>
      <div class="fg2"><div class="fg"><label class="fl">Meet type</label><select class="fi" style="cursor:pointer" onchange="upd(s=>s.meet.meetType=this.value)">${typeOpts}</select></div><div class="fg"><label class="fl">Time zone</label><select class="fi" style="cursor:pointer" onchange="upd(s=>s.meet.timezone=this.value)">${tzOpts}</select></div></div>
      <div class="fg"><label class="fl">Days</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${S.meet.days.map((d,i)=>`<div style="display:flex;align-items:center;gap:4px"><input class="fi" type="date" style="width:160px;padding:6px 8px" value="${d.date}" onchange="upd(s=>s.meet.days[${i}].date=this.value)"/><button class="btn btn-sm btn-gh" onclick="upd(s=>s.meet.days.splice(${i},1))">×</button></div>`).join('')}</div><button class="btn btn-sm" onclick="addDay()">+ Add day</button></div>
    </div>
    <div class="modal-foot"><button class="btn btn-p" onclick="closeModal()">Done</button></div>
  </div>`;
}

function renderPickerModal(timed){
  const sess=S.sessions.find(s=>s.id===UI.pickerSessId);if(!sess)return'';
  const cat=buildCatalog(S.meet.meetType);
  const sessUsed=new Set(sess.events.map(e=>`${e.level}|${e.gender}|${e.apparatus}|${e.round}`));
  const allUsed=new Set(S.sessions.flatMap(s=>s.events.map(e=>`${e.level}|${e.gender}|${e.apparatus}`)));
  const search=(UI.pickerSearch||'').toLowerCase();
  const filtered=search?cat.filter(e=>evName(e).toLowerCase().includes(search)):cat;
  const sel=cat.find(e=>e.id===UI.pickerPreset);
  const rounds=sel?sel.rounds:[];
  const selRound=UI.pickerRound||rounds[0]||'';
  const n=getSessNum(sess,allTimed());
  return`<div class="modal modal-lg" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Add event — Session ${n}</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <input class="ev-search-inp" placeholder="Search — Group A Girls, Platform, 3-Meter…" value="${esc(UI.pickerSearch)}" oninput="UI.pickerSearch=this.value;render()"/>
      <div class="ev-grid">${filtered.map(ev=>{const inSched=allUsed.has(`${ev.level}|${ev.gender}|${ev.apparatus}`);return`<div class="ev-pick-card ${ev.id===UI.pickerPreset?'sel':''}" onclick="UI.pickerPreset='${ev.id}';UI.pickerRound='';render()"><div class="epc-name">${esc(evName(ev))}</div><div class="epc-meta">${ev.defaultDives} dives default</div><span class="epc-status ${inSched?'used':'avail'}">${inSched?'In schedule':'Available'}</span></div>`}).join('')}${!filtered.length?`<div style="grid-column:1/-1;padding:20px;text-align:center;font-size:12px;color:var(--tx3)">No events match</div>`:''}</div>
      ${sel?`<div class="fg"><label class="fl">Round</label><div class="round-btns">${rounds.map(r=>{const used=sessUsed.has(`${sel.level}|${sel.gender}|${sel.apparatus}|${r}`);return`<button class="round-btn ${r===selRound?'active':''} ${used?'used':''}" ${used?'disabled':''} onclick="UI.pickerRound='${r}';render()">${r}${used?' ✓':''}</button>`}).join('')}</div></div>`:''}
    </div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-p" ${!sel||!selRound?'disabled':''} onclick="addEvToSess('${UI.pickerSessId}','${UI.pickerPreset}','${selRound}');closeModal()">Add ${esc(selRound||'event')}</button></div>
  </div>`;
}

function renderLibraryModal(){
  const local=JSON.parse(localStorage.getItem(LK)||'[]');
  const tab=UI.libTab||'templates';
  // Top-level tabs
  const topTabs=`
    <div class="lib-toptabs">
      <button class="lib-toptab ${tab==='templates'?'active':''}" onclick="UI.libTab='templates';render()">📚 Templates</button>
      <button class="lib-toptab ${tab==='saves'?'active':''}" onclick="UI.libTab='saves';render()">📁 My Saved Meets${UI.neonLib.length?` <span class="lib-count">${UI.neonLib.length+local.length}</span>`:local.length?` <span class="lib-count">${local.length}</span>`:''}</button>
    </div>`;
  let body='';
  if(tab==='templates'){
    body=renderLibraryTemplates();
  }else{
    body=renderLibrarySaves(local);
  }
  return`<div class="modal modal-lg" onclick="event.stopPropagation()" style="max-height:calc(100vh - 48px);display:flex;flex-direction:column">
    <div class="modal-hd"><span class="modal-title">Schedule library</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body" style="overflow-y:auto;flex:1">
      ${topTabs}
      ${body}
    </div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Close</button>${tab==='saves'?`<button class="btn btn-p" onclick="saveSchedule()">Save current to cloud</button>`:''}</div>
  </div>`;
}
function renderLibraryTemplates(){
  const byId={};BUILTIN_SCHEDULES.forEach(x=>byId[x.id]=x);
  if(!UI.libFolder||!LIB_FOLDERS[UI.libFolder])UI.libFolder='Zone Championships';
  const folderTabs=Object.keys(LIB_FOLDERS).map(name=>`<button class="lib-ftab ${UI.libFolder===name?'active':''}" onclick="UI.libFolder=this.dataset.f;render()" data-f="${esc(name)}">${LIB_FOLDERS[name].icon} ${name}</button>`).join('');
  const cfg=LIB_FOLDERS[UI.libFolder]||Object.values(LIB_FOLDERS)[0];
  const seen=new Set();const items=(cfg.ids||[]).map(id=>byId[id]).filter(x=>x&&!seen.has(x.id)&&seen.add(x.id));
  return`
    <div class="lib-note">Read-only meet templates. Loading one creates a fresh editable copy — your work won't change the template.</div>
    <div class="lib-folder-tabs">${folderTabs}</div>
    ${items.length?`<div class="lib-list">${items.map(item=>{const sc=item.schedule;const comp=sc.sessions.filter(s=>!s.isPractice).length;return`<div class="lib-card"><div class="lib-card-icon">${cfg.icon}</div><div class="lib-card-info"><div class="lib-card-name">${esc(item.name)}</div><div class="lib-card-meta">${sc.meet.days.length} days · ${comp} comp sessions · template</div></div><div class="lib-card-acts"><button class="lib-act p" onclick="loadBuiltin('${item.id}')">Load</button></div></div>`}).join('')}</div>`:`<div class="empty"><div class="empty-title">No templates in this folder</div></div>`}
  `;
}
function renderLibrarySaves(local){
  if(!UI.savesFolder)UI.savesFolder='all';
  // Build unified list with dedupe:
  // - Local entries with pendingSync=true: ALWAYS shown (these are local-only/newer-than-cloud)
  // - Local entries without pendingSync: ignored (cloud has the canonical version)
  // - Cloud entries: shown unless there's a pendingSync local with the same id (local is newer)
  const cloudSaves=UI.neonLib.map(it=>({...it,folder:inferFolder(it),source:'cloud'}));
  const localSavesAll=local.map(it=>({...it,folder:inferFolder(it),source:'local'}));
  const pendingLocal=localSavesAll.filter(l=>l.pendingSync);
  const pendingIds=new Set(pendingLocal.map(l=>l.id));
  const cloudIds=new Set(cloudSaves.map(c=>c.id));
  // Local entries without any cloud counterpart (pure local, not yet pushed)
  const orphanedLocal=localSavesAll.filter(l=>!l.pendingSync&&!cloudIds.has(l.id));
  const filteredCloud=cloudSaves.filter(c=>!pendingIds.has(c.id));
  const all=[...pendingLocal,...filteredCloud,...orphanedLocal];
  const folderCounts={all:all.length};
  SAVE_FOLDERS.forEach(f=>folderCounts[f]=all.filter(x=>x.folder===f).length);
  const folderPills=`<button class="lib-ftab ${UI.savesFolder==='all'?'active':''}" onclick="UI.savesFolder='all';render()">All${folderCounts.all?` <span class="lib-pill-ct">${folderCounts.all}</span>`:''}</button>`+
    SAVE_FOLDERS.map(f=>`<button class="lib-ftab ${UI.savesFolder===f?'active':''}" onclick="UI.savesFolder='${esc(f)}';render()">${SAVE_FOLDER_ICONS[f]||'📌'} ${esc(f)}${folderCounts[f]?` <span class="lib-pill-ct">${folderCounts[f]}</span>`:''}</button>`).join('');
  const filtered=UI.savesFolder==='all'?all:all.filter(x=>x.folder===UI.savesFolder);
  // Sort: pending-sync first (most urgent), then cloud, then orphan-local; all by date desc within group
  filtered.sort((a,b)=>{
    const aPri=a.pendingSync?0:a.source==='cloud'?1:2;
    const bPri=b.pendingSync?0:b.source==='cloud'?1:2;
    if(aPri!==bPri)return aPri-bPri;
    return new Date(b.savedAt||0)-new Date(a.savedAt||0);
  });
  // Count pending for header note
  const pendingCount=pendingLocal.length;
  const pendingBanner=pendingCount>0?`<div class="lib-pending-banner" onclick="retryCloudSync()" style="cursor:pointer">⚠️ ${pendingCount} save${pendingCount>1?'s':''} not yet on cloud — tap to retry now (otherwise auto-pushes within ~60s when online)</div>`:'';
  let listHtml='';
  if(UI.neonLibLoading){
    listHtml+=`<div style="font-size:12px;color:var(--tx3);padding:10px 0">Loading cloud schedules…</div>`;
  }
  if(filtered.length){
    listHtml+=`<div class="lib-list">${filtered.map(item=>{
      const isPending=!!item.pendingSync;
      const icon=isPending?'⏳':item.source==='cloud'?'☁':'💾';
      const fIcon=SAVE_FOLDER_ICONS[item.folder]||'📌';
      const dt=item.savedAt?fmtRelativeTime(item.savedAt):'';
      const statusLine=isPending?`<span class="lib-pending-badge">Not on cloud yet</span>`:item.source==='cloud'?'Cloud':'Local only';
      const loadCall=isPending||item.source==='local'?`loadLocalSaveById('${esc(item.id)}')`:`loadFromNeon('${esc(item.id)}')`;
      const delCall=isPending||item.source==='local'?`deleteLocalSaveById('${esc(item.id)}')`:`deleteCloudSave('${esc(item.id)}','${esc(item.name).replace(/'/g,"\\'")}')`;
      return`<div class="lib-card ${isPending?'pending':''}"><div class="lib-card-icon">${icon}</div><div class="lib-card-info"><div class="lib-card-name">${esc(item.name)}</div><div class="lib-card-meta">${fIcon} ${esc(item.folder)} · ${statusLine} · ${dt}${item.publishStatus?' · '+item.publishStatus:''}</div></div><div class="lib-card-acts">${isPending?`<button class="lib-act" onclick="event.stopPropagation();pushOnePendingNow('${esc(item.id)}')" title="Push to cloud now">↑</button>`:''}<button class="lib-act p" onclick="${loadCall}">Load</button><button class="lib-act danger" onclick="${delCall}" title="Delete">✕</button></div></div>`;
    }).join('')}</div>`;
  }else if(!UI.neonLibLoading){
    listHtml+=`<div class="empty"><div class="empty-title">No saved meets ${UI.savesFolder==='all'?'yet':'in this folder'}</div><div class="empty-sub">${UI.savesFolder==='all'?'Click "Save current to cloud" below after editing a schedule.':'Try "All" to see saves in other folders.'}</div></div>`;
  }
  return`
    <div class="lib-note">Your saved meets — separate from templates. Loading one resumes autosave on that save record.</div>
    ${pendingBanner}
    <div class="lib-folder-tabs">${folderPills}</div>
    ${listHtml}
  `;
}
// Find local save by id (id-based, not index-based)
function loadLocalSaveById(id){
  const lib=JSON.parse(localStorage.getItem(LK)||'[]');
  const item=lib.find(x=>x.id===id);if(!item)return;
  askConfirm({title:'Load saved meet?',message:'Your current working copy will be replaced.',confirmText:'Load',onConfirm:()=>{
    S=JSON.parse(JSON.stringify(item.schedule||{}));
    if(item.folder)S.libraryFolder=item.folder;
    normalizeAllDays(S);saveS();UI.modal=null;initUI();render();toast('Loaded: '+item.name);
  }});
}
function deleteLocalSaveById(id){
  const lib=JSON.parse(localStorage.getItem(LK)||'[]');
  const item=lib.find(x=>x.id===id);if(!item)return;
  askConfirm({title:'Delete local save?',message:'Delete "'+item.name+'"? This cannot be undone.',confirmText:'Delete',danger:true,onConfirm:()=>{
    const newLib=lib.filter(x=>x.id!==id);
    localStorage.setItem(LK,JSON.stringify(newLib));render();toast('Deleted');
  }});
}
// Push one specific pending save now (from the per-card up-arrow button)
async function pushOnePendingNow(id){
  const lib=JSON.parse(localStorage.getItem(LK)||'[]');
  const item=lib.find(x=>x.id===id);if(!item)return;
  toast('Pushing to cloud…',1200);
  try{
    const sch=item.schedule||{};
    await nq(`INSERT INTO schedule_builder.schedules(id,name,meet_type,year,publish_status,folder,data,updated_at)VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,now())ON CONFLICT(id)DO UPDATE SET name=EXCLUDED.name,meet_type=EXCLUDED.meet_type,publish_status=EXCLUDED.publish_status,folder=EXCLUDED.folder,data=EXCLUDED.data,updated_at=now()`,[item.id,item.name,sch.meet?.meetType||'',parseInt(sch.meet?.days?.[0]?.date)||2026,sch.publishStatus||'draft',item.folder||null,JSON.stringify(sch)]);
    const idx=lib.findIndex(x=>x.id===id);
    if(idx>=0){lib[idx].pendingSync=false;lib[idx].syncedAt=new Date().toISOString();localStorage.setItem(LK,JSON.stringify(lib));}
    sync.ok=true;sync.err=null;setSyncDot('ok');
    // Refresh cloud list so the just-pushed item appears as cloud-synced
    UI.neonLibLoading=true;render();
    const cloudLib=await loadNeonLib();UI.neonLib=cloudLib;UI.neonLibLoading=false;
    toast('Pushed to cloud ✓',2400);render();
  }catch(e){
    console.error('Push failed:',e);
    toast('Push failed: '+(e.message||'').slice(0,80),4000);
  }
}
function loadLocalSave(i){
  const lib=JSON.parse(localStorage.getItem(LK)||'[]');
  const item=lib[i];if(!item)return;
  askConfirm({title:'Load saved meet?',message:'Your current working copy will be replaced.',confirmText:'Load',onConfirm:()=>{
    S=JSON.parse(JSON.stringify(item.schedule||{}));
    if(item.folder)S.libraryFolder=item.folder;
    normalizeAllDays(S);saveS();UI.modal=null;initUI();render();toast('Loaded: '+item.name);
  }});
}
function deleteLocalSave(i){
  const lib=JSON.parse(localStorage.getItem(LK)||'[]');
  const item=lib[i];if(!item)return;
  askConfirm({title:'Delete local save?',message:'Delete "'+item.name+'"? This cannot be undone.',confirmText:'Delete',danger:true,onConfirm:()=>{
    lib.splice(i,1);localStorage.setItem(LK,JSON.stringify(lib));render();toast('Deleted');
  }});
}
function deleteCloudSave(id,name){
  askConfirm({title:'Delete cloud save?',message:'Delete "'+name+'" from the cloud? This cannot be undone.',confirmText:'Delete',danger:true,onConfirm:async()=>{
    try{await nq(`DELETE FROM schedule_builder.schedules WHERE id=$1`,[id]);UI.neonLib=UI.neonLib.filter(x=>x.id!==id);if(S.currentLibraryId===id){S.currentLibraryId='';saveS();}render();toast('Deleted from cloud');}
    catch(e){toast('Could not delete: '+e.message);}
  }});
}
function renderSaveDialogModal(){
  const folder=UI.saveDialogFolder||'Other';
  const name=UI.saveDialogName||'';
  const folderOpts=SAVE_FOLDERS.map(f=>`<button class="folder-pick ${folder===f?'active':''}" onclick="UI.saveDialogFolder='${esc(f)}';render()">${SAVE_FOLDER_ICONS[f]||'📌'} ${esc(f)}</button>`).join('');
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Save schedule to cloud</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="fg"><label class="fl">Schedule name</label><input id="save-dialog-name" class="fi" value="${esc(name)}" oninput="UI.saveDialogName=this.value" placeholder="2026 USA Diving …" autofocus/></div>
      <div class="fg"><label class="fl">Save to folder</label><div class="folder-picker">${folderOpts}</div></div>
      <div style="font-size:11px;color:var(--tx3);margin-top:8px">After saving, autosave will keep this save record current.</div>
    </div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="saveDialogConfirm()">Save</button></div>
  </div>`;
}


function toggleCombineLabels(){S.meet.showCombineLabels=!(S.meet.showCombineLabels!==false);saveS();render();}

function renderGenerateModal(timed){
  ensureProjDataLoaded();
  const aud=UI.genAud;const cfg={...AUD[aud]};
  const showLbl=S.meet.showCombineLabels!==false;
  const audDesc={public:'Clean public-facing schedule — event names and session times only.',athletes:'For competitors — adds warm-up windows and event start/end times.',judges:'Full detail for officials — entries, seconds per dive, and all timing.',internal:'Operations master — every field, for staff running the meet.'};
  return`<div class="modal modal-lg gen-modal" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Generate output</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="gen-layout">
        <div class="gen-controls">
          <div class="gen-sec-lbl">Audience</div>
          <div class="audgrid">${Object.entries(AUD).map(([k,a])=>`<button class="audcard ${aud===k?'sel':''}" onclick="UI.genAud='${k}';render()"><div class="audname">${a.l}</div></button>`).join('')}</div>
          <p class="gen-aud-desc">${audDesc[aud]||''}</p>
          <div class="gen-sec-lbl">Show / hide</div>
          <div class="gen-toggles">
            <label class="togrow"><span>Warm-up times</span><span class="tog"><input type="checkbox" ${cfg.showWU?'checked':''} onchange="AUD['${aud}'].showWU=this.checked;render()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Event start / end times</span><span class="tog"><input type="checkbox" ${cfg.showTimes?'checked':''} onchange="AUD['${aud}'].showTimes=this.checked;render()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Event entries (divers)</span><span class="tog"><input type="checkbox" ${cfg.showEntries?'checked':''} onchange="AUD['${aud}'].showEntries=this.checked;render()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Seconds per dive</span><span class="tog"><input type="checkbox" ${cfg.showSec?'checked':''} onchange="AUD['${aud}'].showSec=this.checked;render()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Group practice at top of day</span><span class="tog"><input type="checkbox" ${cfg.practiceTop?'checked':''} onchange="AUD['${aud}'].practiceTop=this.checked;render()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Flighted warm-up athlete counts</span><span class="tog"><input type="checkbox" ${cfg.showFlightCounts?'checked':''} onchange="AUD['${aud}'].showFlightCounts=this.checked;render()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>"Combined" / "Simultaneous" labels</span><span class="tog"><input type="checkbox" ${showLbl?'checked':''} onchange="toggleCombineLabels()"><span class="togsl"></span></span></label>
          </div>
        </div>
        <div class="gen-preview">
          <div class="gen-sec-lbl">Preview <span class="pp-scrollhint">scroll to see full schedule</span></div>
          ${renderPP(timed,cfg)}
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-gh" onclick="closeModal()">Close</button>
      <div style="flex:1"></div>
      <button class="btn" onclick="exportOpsTimeline()">Ops Timeline (.xls)</button>
      <button class="btn" onclick="exportExcel()">Excel</button>
      <button class="btn btn-p" onclick="printReport()">Print / PDF</button>
    </div>
  </div>`;
}


function printReport(){
  const timed=allTimed();
  const aud=UI.genAud||'public';
  const cfg={...AUD[aud]};
  const meetName=(S.meet.name||'USA Diving Schedule').replace(/[^\w\s\-\.]/g,'').trim();
  const reportHTML=renderPP(timed,cfg);
  const fontLink='<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
  const w=window.open('','_blank');
  if(!w){alert('Pop-up blocked — allow pop-ups for this site and try again');return;}
  // Self-contained COMPACT stylesheet — sized so a full competition day fits ONE letter page.
  const css=`
*{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#171F69;--red:#E31937;--gray:#5F6062}
html,body{background:#fff;font-family:'Inter',system-ui,sans-serif;color:#1a1c2e}
.pp{background:#fff;padding:0}
.pp-page{background:#fff;display:flex;flex-direction:column;page-break-after:always;break-after:page;overflow:hidden}
.pp-page:last-child{page-break-after:auto;break-after:auto}
/* Header band */
.pp-hd{background:var(--navy);color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;position:relative}
.pp-hd::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--red)}
.pp-meet{font-size:17px;font-weight:800;letter-spacing:-.01em;color:#fff;line-height:1.1}
.pp-logo{height:34px;width:auto;flex-shrink:0}
/* Body */
.pp-body{padding:14px 22px 4px;flex:1}
.pp-day{margin-bottom:12px}
.pp-day-hd{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:800;color:var(--navy);padding-bottom:4px;border-bottom:2px solid var(--navy);margin-bottom:9px}
.pp-day-dot{width:7px;height:7px;border-radius:50%;background:var(--red);flex-shrink:0}
/* Session */
.pp-sess{margin-bottom:9px;break-inside:avoid;page-break-inside:avoid}
.pp-sess-hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px;padding-bottom:3px;border-bottom:1px solid #E4E7EE}
.pp-sess-badge{font-size:8px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:4px;background:var(--navy);color:#fff}
.pp-sess-badge.finals{background:var(--red)}
.pp-sess-n{font-size:13px;font-weight:800;color:var(--navy)}
.pp-sess-win{font-size:11.5px;font-weight:700;color:#1a1c2e}
.pp-sess-wu{margin-left:auto;font-size:10px;font-weight:600;color:var(--gray);background:#F2F4F8;padding:2px 7px;border-radius:4px}
/* Event table */
.pp-tbl{width:100%;border-collapse:collapse}
.pe td{padding:4px 0;vertical-align:middle}
.pe.alt{background:#F7F8FB}
.pe td:first-child{padding-left:8px;border-radius:5px 0 0 5px}
.pe td:last-child{padding-right:8px;border-radius:0 5px 5px 0}
.pe-nm{font-size:11.5px;font-weight:600;color:#1a1c2e;padding-right:12px!important}
.pe-tag{display:inline-block;font-size:7px;font-weight:800;padding:1px 5px;border-radius:3px;margin-left:6px;text-transform:uppercase;vertical-align:middle}
.pe-tag.combined{background:var(--navy);color:#fff}
.pe-tag.simul{background:#8FC3EA;color:var(--navy)}
.pe-tag.split{background:#FFF1DC;color:#92400E}
.pe-div{font-size:11.5px;font-weight:800;color:var(--red);white-space:nowrap;text-align:right;padding-right:16px!important}
.pe-sec{font-size:10.5px;font-weight:600;color:var(--gray);white-space:nowrap;text-align:right;padding-right:16px!important}
.pe-tm{font-size:11px;font-weight:700;color:var(--navy);white-space:nowrap;text-align:right}
.pe-u{font-size:8px;font-weight:600;color:var(--gray);margin-left:2px;text-transform:lowercase}
.pe-dash{color:#C8CCD6}
/* Open Training */
.pp-prac{background:#F5F7FB;border-left:3px solid var(--navy);border-radius:0 6px 6px 0;padding:6px 12px;margin-bottom:8px;break-inside:avoid}
.pp-prac-t{display:flex;align-items:center;gap:9px}
.pp-prac-name{font-size:11.5px;font-weight:700;color:var(--navy)}
.pp-prac-time{margin-left:auto;font-size:10.5px;font-weight:600;color:var(--gray)}
.pp-prac-flights{margin-top:3px;display:flex;flex-direction:column;gap:1px}
.pp-prac-f{display:flex;justify-content:space-between;font-size:10px;color:var(--gray);font-weight:500;max-width:320px}
/* Footer */
.pp-ft{display:flex;justify-content:space-between;align-items:center;padding:8px 22px;border-top:2px solid var(--navy);font-size:9px;font-weight:600;color:var(--gray);margin-top:auto}
.pp-ft-l{color:var(--navy);font-weight:700}
.pp-ft-r{color:var(--gray);font-style:italic}
@page{size:letter portrait;margin:0.4in}
@media screen{
  body{background:#E9ECF2;padding:20px}
  .pp-page{max-width:760px;margin:0 auto 20px;border-radius:8px;box-shadow:0 2px 16px rgba(23,31,105,.12)}
}
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .pp-sess,.pp-prac{break-inside:avoid;page-break-inside:avoid}
  .pp-day-hd{break-after:avoid;page-break-after:avoid}
}`;
  w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${meetName}</title>${fontLink}<style>${css}</style></head><body>${reportHTML}
<script>
// Auto-scale safety: if any page is taller than one printable page, shrink it to fit.
window.addEventListener('load',function(){
  setTimeout(function(){
    var PAGE_H = 10.2 * 96; // ~10.2in usable at 96dpi (letter minus 0.4in margins)
    document.querySelectorAll('.pp-page').forEach(function(pg){
      var h = pg.scrollHeight;
      if(h > PAGE_H){
        var scale = Math.max(0.7, PAGE_H / h);
        var body = pg.querySelector('.pp-body');
        if(body){
          body.style.transformOrigin='top left';
          body.style.transform='scale('+scale+')';
          body.style.width=(100/scale)+'%';
        }
      }
    });
    setTimeout(function(){ window.focus(); window.print(); }, 250);
  }, 400);
});
<\/script>
</body></html>`);
  w.document.close();
}

function renderPP(timed,cfg){
  if(!S.meet.days.length||!timed.length)return`<div class="pp"><div class="pp-empty">No schedule to preview yet — add sessions and events first.</div></div>`;
  const showLbl=S.meet.showCombineLabels!==false;
  const meetName=esc(S.meet.name||'Championship');
  const today=new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});

  const days=S.meet.days.map(day=>{
    const ds=timed.filter(s=>s.dayId===day.id).sort((a,b)=>a.timing.warmupStartMinutes-b.timing.warmupStartMinutes);
    const comp=ds.filter(s=>!s.isPractice);
    const prac=ds.filter(s=>s.isPractice);
    return {day,ds,comp,prac,trainingOnly:comp.length===0&&prac.length>0,empty:ds.length===0};
  }).filter(d=>!d.empty);

  // Group days into pages. Training-only days share a page; the first comp day after
  // a training run joins it if light; comp days otherwise get their own page. A short
  // trailing training-only day attaches to the previous comp day's page rather than
  // creating a near-empty page.
  // Page grouping rules:
  // • Each competition day is ONE page — never split a single day across pages.
  //   All sessions AND practice blocks for that day stay together.
  // • Training-only days (no comp sessions) are lightweight and group together
  //   until they fill a page, OR they attach to the NEXT comp day if they fit.
  // • The join threshold is generous so a trailing Open Training block on a
  //   comp day never causes an orphaned near-empty second page.
  const pages=[];
  function pracWeight(d){ return 0.6 + d.prac.length*0.3; }
  // Group training-only days together first, then decide whether to attach to following comp day
  const trainingRun=[];
  days.forEach((d,i)=>{
    if(d.trainingOnly){
      trainingRun.push(d);
    } else {
      // Comp day: check if the training run before it fits on the same page
      if(trainingRun.length){
        const runWeight=trainingRun.reduce((w,x)=>w+pracWeight(x),0);
        const compEstimate=d.comp.length*2.1; // rough comp day weight for join decision
        if(runWeight+compEstimate<=5.5){
          // All fits: training run + this comp day share a page
          pages.push([...trainingRun,d]);
        } else {
          // Training run gets its own page, comp day gets its own page
          pages.push([...trainingRun]);
          pages.push([d]);
        }
        trainingRun.length=0;
      } else {
        // No preceding training — comp day always gets its own page
        pages.push([d]);
      }
    }
  });
  // Any remaining training-only days at the end
  if(trainingRun.length) pages.push([...trainingRun]);

  function evRow(ev,i){
    const divers=ev._combined?ev._combinedDivers:entryValue(ev);
    const nm=ev._combined?ev._combinedNames.join(' + '):evName(ev);
    return`<tr class="pe ${i%2?'alt':''}">
      <td class="pe-nm">${esc(nm)}${(ev._combined&&showLbl)?`<span class="pe-tag combined">Combined</span>`:''}${(ev._simul&&showLbl)?`<span class="pe-tag simul">Simultaneous</span>`:''}${(ev.manualSplit&&!isPlatform(ev.apparatus)&&ev.round!=='Final'&&!ev._combined)?`<span class="pe-tag split">Split boards</span>`:''}</td>
      ${cfg.showEntries?`<td class="pe-div">${divers?divers+'<span class="pe-u">divers</span>':'<span class="pe-dash">—</span>'}</td>`:''}
      ${cfg.showSec?`<td class="pe-sec">${ev.secondsPerDive||ev.defaultSpd||35}<span class="pe-u">s/dive</span></td>`:''}
      ${cfg.showTimes?`<td class="pe-tm">${f12(ev.eventStartMinutes)} – ${f12(ev.eventEndMinutes)}</td>`:''}
    </tr>`;
  }
  function pracBlock(sess){
    const t=sess.timing;const ft=t.flightTimes||[];
    const closeNote=sess.fitToClose?'  •  until facility close':'';
    return`<div class="pp-prac">
      <div class="pp-prac-t"><span class="pp-prac-name">${esc(sess.title||'Open Training')}</span><span class="pp-prac-time">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)}${closeNote}</span></div>
      ${ft.length?`<div class="pp-prac-flights">${ft.map(f=>{
        const cnt=(cfg.showFlightCounts&&UI.projRows)?athleteCountForFlight(f):null;
        return`<div class="pp-prac-f"><span>${esc(f.name)}</span><span>${f12(f.startMinutes)} – ${f12(f.endMinutes)}${cnt!=null?` · ${cnt} athlete${cnt===1?'':'s'}`:''}</span></div>`;
      }).join('')}</div>`:''}
    </div>`;
  }
  function sessBlock(sess){
    const t=sess.timing;const n=getSessNum(sess,timed);
    const hasFinals=sess.events.some(e=>e.round==='Final');
    const kind=hasFinals?'Finals':sess.events.some(e=>e.round==='Prelim')?'Preliminaries':sess.events.some(e=>e.round==='Qualifier')?'Qualifier':'Session';
    return`<div class="pp-sess">
      <div class="pp-sess-hd">
        <span class="pp-sess-badge ${hasFinals?'finals':''}">${kind}</span>
        <span class="pp-sess-n">Session ${n}</span>
        <span class="pp-sess-win">${f12(t.eventStartMinutes)} – ${f12(t.sessionEndMinutes)}</span>
        ${cfg.showWU?`<span class="pp-sess-wu">Warm-up ${f12(t.warmupStartMinutes)}–${f12(t.warmupEndMinutes)}</span>`:''}
      </div>
      <table class="pp-tbl"><tbody>${(t.events||[]).map(evRow).join('')}</tbody></table>
    </div>`;
  }
  function dayBlock(d){
    const ordered=cfg.practiceTop?[...d.prac,...d.comp]:d.ds;
    return`<div class="pp-day">
      <div class="pp-day-hd"><span class="pp-day-dot"></span>${esc(fullDate(d.day.date))}</div>
      ${ordered.map(sess=>sess.isPractice?pracBlock(sess):sessBlock(sess)).join('')}
    </div>`;
  }

  const pageHtml=pages.map((pg)=>`<section class="pp-page">
    <header class="pp-hd">
      <div class="pp-meet">${meetName}</div>
      <img class="pp-logo" src="../shared/images/logo-white-horizontal.png?v=202606250245" alt="USA Diving"/>
    </header>
    <div class="pp-body">
      ${pg.map(dayBlock).join('')}
    </div>
    <footer class="pp-ft">
      <span class="pp-ft-l">${meetName}</span>
      <span class="pp-ft-r">Schedule subject to change  •  ${esc(today)}</span>
    </footer>
  </section>`).join('');

  return`<div class="pp" id="printPreview">${pageHtml}</div>`;
}

// ── EXPORTS ───────────────────────────────────────────────────────────
function splitPanelRot(ev){const rots={sb:{Girls:{'Group A':{pA:'Rounds 1,2,3,6,7',pB:'Rounds 4,5,8,9'},'Group B':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7,8'},'Group C':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7'},'Group D':{pA:'Rounds 1,2,6',pB:'Rounds 3,4,5'}},Boys:{'Group A':{pA:'Rounds 1,2,3,7,8',pB:'Rounds 4,5,6,9,10'},'Group B':{pA:'Rounds 1,2,3,6,7',pB:'Rounds 4,5,8,9'},'Group C':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7,8'},'Group D':{pA:'Rounds 1,2,6',pB:'Rounds 3,4,5'}}},plat:{Girls:{'Group A':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7,8'},'Group B':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7'},'Group C':{pA:'Rounds 1,2,6',pB:'Rounds 3,4,5'},'Group D':{pA:'Rounds 1,2,6',pB:'Rounds 3,4,5'}},Boys:{'Group A':{pA:'Rounds 1,2,5,6,7',pB:'Rounds 3,4,8,9'},'Group B':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7,8'},'Group C':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7'},'Group D':{pA:'Rounds 1,2,6',pB:'Rounds 3,4,5'}}}};const type=isPlatform(ev.apparatus)?'plat':'sb';const r=rots[type]?.[ev.gender]?.[ev.level];return r?`Panel A: ${r.pA} | Panel B: ${r.pB}`:'Review manually'}

function exportOpsTimeline(){
  const timed=allTimed();
  const N='#171F69',R='#E31937',C='#009AC7',LB='#D6EBF8',PK='#FFF0F4',W='#FFFFFF',G='#F0F2F6';
  const th=(t,x='')=>`<th style="background:${N};color:${W};border:1px solid #000;padding:5px 6px;font-size:11px;text-align:center;${x}">${t}</th>`;
  const td=(t,x='')=>`<td style="border:1px solid #888;padding:4px 6px;font-size:11px;text-align:center;${x}">${esc(String(t??''))}</td>`;
  const tdL=(t,x='')=>`<td style="border:1px solid #888;padding:4px 6px;font-size:11px;text-align:left;${x}">${esc(String(t??''))}</td>`;
  let rows='';
  S.meet.days.forEach(day=>{
    const ds=timed.filter(s=>s.dayId===day.id).sort((a,b)=>a.warmupStartMinutes-b.warmupStartMinutes);
    if(!ds.length)return;
    rows+=`<tr><td colspan="16" style="background:${R};color:${W};font-weight:700;font-size:12px;text-align:center;border:1px solid #000;padding:5px;text-transform:uppercase">${fullDate(day.date)}</td></tr>`;
    ds.forEach((sess,si)=>{
      const t=sess.timing;const n=getSessNum(sess,timed);const bg=si%2===0?LB:PK;
      const label=sess.isPractice?(sess.title||'Open Training'):`Session ${n}`;
      rows+=`<tr><td colspan="16" style="background:${N};color:${W};font-weight:700;font-size:12px;text-align:left;border:1px solid #000;padding:5px 8px">${esc(label)}</td></tr>`;
      if(sess.isPractice){
        const ev=sess.events[0]||{};
        const ft=t.flightTimes||[];
        rows+=`<tr style="background:${bg}">${td('')}${td('Practice')}${tdL(ev.customLabel||label)}${td('')}${td('')}${td('')}${td('')}${td('')}${td(fd1(ev.customDurationMinutes||0))}${td(f12(t.eventStartMinutes))}${td(f12(t.sessionEndMinutes))}${td('')}${td('')}${td('')}${td(f12(t.eventStartMinutes),`font-weight:700;background:${C};color:${W}`)}${td(f12(t.sessionEndMinutes),`font-weight:700;background:${C};color:${W}`)}</tr>`;
        ft.forEach(f=>{rows+=`<tr style="background:${bg}">${td('')}${td('Flight')}${tdL('↳ '+f.name)}${td('')}${td('')}${td('')}${td('')}${td('')}${td(fd1(f.durationMinutes))}${td(f12(f.startMinutes))}${td(f12(f.endMinutes))}${td('')}${td('')}${td('')}${td(f12(f.startMinutes),`background:${C};color:${W}`)}${td(f12(f.endMinutes),`background:${C};color:${W}`)}</tr>`});
        return;
      }
      const intro=Number(sess.introMinutes||0);
      if(intro>0)rows+=`<tr style="background:${bg}">${td('')}${td('Intro')}${tdL('Introductions')}${td('')}${td('')}${td('')}${td('')}${td('')}${td(fd1(intro))}${td('')}${td('')}${td(sess.warmupMinutes||0)}${td(f12(t.warmupStartMinutes))}${td(f12(t.warmupEndMinutes))}${td(f12(t.warmupStartMinutes-intro),`background:${C};color:${W}`)}${td(f12(t.warmupStartMinutes),`background:${C};color:${W}`)}</tr>`;
      (t.events||[]).forEach(ev=>{const dur=calcEvDur(ev);const split=ev.manualSplit&&!isPlatform(ev.apparatus);const rBg=ev.round==='Final'?'#FEF2F2':ev.round==='Prelim'?'#F0FDF4':'#EEF3FD';rows+=`<tr style="background:${bg}">${td('')}${td(ev.round||'',`background:${rBg};font-weight:700;font-size:10px`)}${tdL(evName(ev)+(split?' (Split)':''))}${td(split?'Split':'')}${tdL(split?splitPanelRot(ev):'')}${td(ev.numberOfDives||ev.defaultDives||0,`background:${G};font-weight:700`)}${td(ev.numberOfDivers||0,`background:${G};font-weight:700`)}${td(ev.secondsPerDive||ev.defaultSpd||0,`background:${G};font-weight:700`)}${td(fd1(dur.evMin))}${td('')}${td('')}${td(sess.warmupMinutes||0,'font-weight:700')}${td(f12(t.warmupStartMinutes),'font-weight:700')}${td(f12(t.warmupEndMinutes),'font-weight:700')}${td(f12(ev.eventStartMinutes),`font-weight:700;background:${C};color:${W}`)}${td(f12(ev.eventEndMinutes),`font-weight:700;background:${C};color:${W}`)}</tr>`});
    });
  });
  const html=`<html><head><meta charset="UTF-8"><style>body{font-family:Arial;font-size:11px}table{border-collapse:collapse;width:100%}</style></head><body><div style="display:flex;align-items:center;gap:16px;padding:12px 16px;border-bottom:3px solid ${N};margin-bottom:12px"><img src="../shared/images/logo-color-horizontal.png" style="height:40px"/><div><div style="font-size:18px;font-weight:700;color:${N}">${esc(S.meet.name)}</div><div style="font-size:12px;color:#666">Operations Timeline</div></div></div><table><thead><tr>${th('Day/Session')}${th('Round')}${th('Event','text-align:left')}${th('Format')}${th('Panel Rotation','text-align:left')}${th('# Dives',`background:${C}`)}${th('# Divers',`background:${C}`)}${th('Sec/Dive',`background:${C}`)}${th('Event Min')}${th('Prac Start')}${th('Prac End')}${th('WU Min')}${th('WU Start')}${th('WU End')}${th('Ev Start',`background:${R}`)}${th('Ev End',`background:${R}`)}</tr></thead><tbody>${rows}</tbody></table><div style="margin-top:12px;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:8px">USA Diving · ${esc(S.meet.name)} · ${new Date().toLocaleDateString()}</div></body></html>`;
  dl(html,'application/vnd.ms-excel',`${S.meet.name.replace(/[^a-z0-9]/gi,'-')}-ops-timeline.xls`);
  toast('Operations timeline downloaded');
}

function exportExcel(){
  const timed=allTimed();
  let html=`<html><head><meta charset="UTF-8"><style>body{font-family:Arial;font-size:11pt}table{border-collapse:collapse;width:100%}th{background:#171F69;color:white;padding:6px 10px;text-align:left}td{padding:5px 10px;border-bottom:1px solid #ddd}.dh td{background:#E8ECFF;font-weight:bold;color:#171F69}.sh td{background:#F5F6FA;font-weight:bold}</style></head><body><h2 style="color:#171F69">${esc(S.meet.name)}</h2><table><thead><tr><th>Day</th><th>Session</th><th>Event</th><th>Round</th><th>Divers</th><th>Dives</th><th>Sec/dive</th><th>Split</th><th>Warm-up</th><th>Start</th><th>End</th></tr></thead><tbody>`;
  S.meet.days.forEach(day=>{const ds=timed.filter(s=>s.dayId===day.id).sort((a,b)=>a.warmupStartMinutes-b.warmupStartMinutes);if(!ds.length)return;html+=`<tr class="dh"><td colspan="11">${fullDate(day.date)}</td></tr>`;ds.forEach(sess=>{const t=sess.timing;const n=getSessNum(sess,timed);const lbl=sess.isPractice?(sess.title||'Practice'):`Session ${n}`;html+=`<tr class="sh"><td></td><td colspan="10">${esc(lbl)} · ${f12(t.warmupStartMinutes)}–${f12(t.sessionEndMinutes)}</td></tr>`;(t.events||[]).forEach(ev=>{const dur=calcEvDur(ev);html+=`<tr><td>${fullDate(day.date)}</td><td>${esc(lbl)}</td><td>${esc(evName(ev))}</td><td>${esc(ev.round||'')}</td><td>${ev.numberOfDivers||0}</td><td>${ev.numberOfDives||ev.defaultDives||0}</td><td>${ev.secondsPerDive||ev.defaultSpd||35}</td><td>${ev.manualSplit&&!isPlatform(ev.apparatus)?'Yes':''}</td><td>${f12(t.warmupStartMinutes)}</td><td>${f12(ev.eventStartMinutes)}</td><td>${f12(ev.eventEndMinutes)}</td></tr>`});});});
  html+='</tbody></table></body></html>';
  dl(html,'application/vnd.ms-excel',`${S.meet.name.replace(/[^a-z0-9]/gi,'-')}-schedule.xls`);
  toast('Excel downloaded');
}

function dl(html,type,name){const blob=new Blob([html],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}

// Print
const ps=document.createElement('style');ps.textContent='@media print{body *{visibility:hidden}#printPreview,#printPreview *{visibility:visible}#printPreview{position:absolute;left:0;top:0;width:100%}.modal-bg{position:absolute;background:white;display:block}.modal{width:100%;max-width:none;max-height:none;box-shadow:none;border:none}}';document.head.appendChild(ps);

// ── BOOT ──────────────────────────────────────────────────────────────
// Tighten any saved gaps between sessions (esp. Open Training → next session)
// before the first paint, so the user sees a clean back-to-back layout on load.
normalizeAllDays(S);saveS();
if(S.currentLibraryId)startSync();
render();

