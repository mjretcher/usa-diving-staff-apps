'use strict';

// ── SEED DATA ──────────────────────────────────────────────────────────
// ── SEED DATA ──────────────────────────────────────────────────────────
const BUILTIN_SCHEDULES = [{"id":"seed-zone-b","name":"2026 USA Diving Zone B Championship","builtIn":true,"savedAt":"2026-05-26T23:59:00.000Z","schedule":{"updatedAt":"2026-05-26T23:59:00.000Z","meet":{"name":"2026 USA Diving Zone B Championship","venue":"Competition Pool","city":"","timezone":"America/New_York","meetType":"zone","days":[{"id":"zone-b-day-1","date":"2026-05-27","openMinutes":420,"closeMinutes":1200},{"id":"zone-b-day-2","date":"2026-05-28","openMinutes":420,"closeMinutes":1200},{"id":"zone-b-day-3","date":"2026-05-29","openMinutes":420,"closeMinutes":1200},{"id":"zone-b-day-4","date":"2026-05-30","openMinutes":420,"closeMinutes":1200},{"id":"zone-b-day-5","date":"2026-05-31","openMinutes":420,"closeMinutes":1200}]},"sessions":[{"id":"b-practice-session-003","dayId":"zone-b-day-1","warmupStartMinutes":780,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"b-practice-003","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":240,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"b-practice-session-005","dayId":"zone-b-day-2","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"b-practice-005","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":480,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"b-practice-session-008","dayId":"zone-b-day-3","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Flighted Warm-Ups","events":[{"id":"b-practice-008","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":120,"notes":"Flighted warm-up block.","customLabel":"Flighted warm-up block."}]},{"id":"b-session-01","dayId":"zone-b-day-3","warmupStartMinutes":540,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-001-group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":12.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-002-group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-003-group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":7,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"b-session-02","dayId":"zone-b-day-3","warmupStartMinutes":665,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-004-group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":6.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-005-group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":3.0,"numberOfDives":7,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-006-group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"b-session-03","dayId":"zone-b-day-3","warmupStartMinutes":800,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-007-group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":28.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-b-event-008-group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":30.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"b-practice-session-021","dayId":"zone-b-day-4","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Flighted Warm-Ups","events":[{"id":"b-practice-021","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":120,"notes":"Flighted warm-up block.","customLabel":"Flighted warm-up block."}]},{"id":"b-session-04","dayId":"zone-b-day-4","warmupStartMinutes":540,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-009-group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":19.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-010-group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":8.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-011-group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":12.0,"numberOfDives":8,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"b-session-05","dayId":"zone-b-day-4","warmupStartMinutes":660,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-012-group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":10.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-013-group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-014-group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":24.0,"numberOfDives":8,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review platform load","customLabel":"Review platform load"}]},{"id":"b-session-06","dayId":"zone-b-day-4","warmupStartMinutes":855,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-015-group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":28.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-b-event-016-group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":27.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"b-practice-session-034","dayId":"zone-b-day-5","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Flighted Warm-Ups","events":[{"id":"b-practice-034","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":120,"notes":"Flighted warm-up block.","customLabel":"Flighted warm-up block."}]},{"id":"b-session-07","dayId":"zone-b-day-5","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-017-group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":17.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-018-group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":7.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-019-group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":30.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"b-session-08","dayId":"zone-b-day-5","warmupStartMinutes":690,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-020-group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":7.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-021-group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":7.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-022-group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"b-session-09","dayId":"zone-b-day-5","warmupStartMinutes":825,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-b-event-023-group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":18.0,"numberOfDives":9,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-b-event-024-group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":35.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]}],"publishStatus":"draft","currentLibraryId":"seed-zone-b","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"seed-zone-e","name":"2026 USA Diving Zone E Championship","builtIn":true,"savedAt":"2026-05-27T20:15:00.000Z","schedule":{"updatedAt":"2026-05-27T20:15:00.000Z","meet":{"name":"2026 USA Diving Zone E Championship","venue":"Competition Pool","city":"","timezone":"America/Los_Angeles","meetType":"zone","days":[{"id":"zone-e-day-1","date":"2026-05-27","openMinutes":420,"closeMinutes":1200},{"id":"zone-e-day-2","date":"2026-05-28","openMinutes":420,"closeMinutes":1200},{"id":"zone-e-day-3","date":"2026-05-29","openMinutes":420,"closeMinutes":1200},{"id":"zone-e-day-4","date":"2026-05-30","openMinutes":420,"closeMinutes":1200},{"id":"zone-e-day-5","date":"2026-05-31","openMinutes":420,"closeMinutes":1200}]},"sessions":[{"id":"e-practice-session-003","dayId":"zone-e-day-1","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"e-practice-003","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":420,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"e-practice-session-005","dayId":"zone-e-day-2","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"e-practice-005","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":420,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"e-practice-session-008","dayId":"zone-e-day-3","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted Training","events":[{"id":"e-restricted-friday-region-10","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","round":"Open Training","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"notes":"Region 10 restricted training.","customLabel":"Restricted Training"}]},{"id":"e-restricted-session-009-friday","dayId":"zone-e-day-3","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted Training","events":[{"id":"e-restricted-friday-region-9","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","round":"Open Training","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"notes":"Region 9 restricted training.","customLabel":"Restricted Training"}]},{"id":"e-session-01","dayId":"zone-e-day-3","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-001-group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":28.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-e-event-002-group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":22.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"e-session-02","dayId":"zone-e-day-3","warmupStartMinutes":630,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-003-group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":9.0,"numberOfDives":7,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-004-group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-03","dayId":"zone-e-day-3","warmupStartMinutes":765,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-005-group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":18.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-006-group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":1.0,"numberOfDives":7,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-04","dayId":"zone-e-day-3","warmupStartMinutes":890,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-007-group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":6.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-008-group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":4.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-practice-session-021","dayId":"zone-e-day-3","warmupStartMinutes":970,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"e-practice-021","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":170,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"e-practice-session-023","dayId":"zone-e-day-4","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted Training","events":[{"id":"e-restricted-saturday-region-9","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","round":"Open Training","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"notes":"Region 9 restricted training.","customLabel":"Restricted Training"}]},{"id":"e-restricted-session-024-saturday","dayId":"zone-e-day-4","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted Training","events":[{"id":"e-restricted-saturday-region-10","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","round":"Open Training","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"notes":"Region 10 restricted training.","customLabel":"Restricted Training"}]},{"id":"e-session-05","dayId":"zone-e-day-4","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-009-group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":21.0,"numberOfDives":8,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-010-group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":22.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"e-session-06","dayId":"zone-e-day-4","warmupStartMinutes":660,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-011-group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":22.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-012-group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":7.0,"numberOfDives":8,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-07","dayId":"zone-e-day-4","warmupStartMinutes":820,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-013-group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":16.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-014-group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":8.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-08","dayId":"zone-e-day-4","warmupStartMinutes":940,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-015-group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-016-group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":2.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-practice-session-036","dayId":"zone-e-day-4","warmupStartMinutes":1045,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"e-practice-036","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":95,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"e-practice-session-038","dayId":"zone-e-day-5","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"e-practice-038","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"e-session-09","dayId":"zone-e-day-5","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-017-group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":26.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-e-event-018-group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":14.0,"numberOfDives":9,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-10","dayId":"zone-e-day-5","warmupStartMinutes":630,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-019-group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":23.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-e-event-020-group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":15.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-11","dayId":"zone-e-day-5","warmupStartMinutes":765,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-021-group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":8.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-022-group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":7.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"e-session-12","dayId":"zone-e-day-5","warmupStartMinutes":855,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-e-event-023-group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":14.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-e-event-024-group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":0.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]}],"publishStatus":"draft","currentLibraryId":"seed-zone-e","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"seed-zone-f","name":"2026 USA Diving Zone F Championship","builtIn":true,"savedAt":"2026-05-26T23:59:00.000Z","schedule":{"updatedAt":"2026-05-26T23:59:00.000Z","meet":{"name":"2026 USA Diving Zone F Championship","venue":"Competition Pool","city":"","timezone":"America/Los_Angeles","meetType":"zone","days":[{"id":"zone-f-day-1","date":"2026-05-27","openMinutes":420,"closeMinutes":1200},{"id":"zone-f-day-2","date":"2026-05-28","openMinutes":420,"closeMinutes":1200},{"id":"zone-f-day-3","date":"2026-05-29","openMinutes":420,"closeMinutes":1200},{"id":"zone-f-day-4","date":"2026-05-30","openMinutes":420,"closeMinutes":1200},{"id":"zone-f-day-5","date":"2026-05-31","openMinutes":420,"closeMinutes":1200}]},"sessions":[{"id":"f-practice-session-003","dayId":"zone-f-day-1","warmupStartMinutes":900,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"f-practice-003","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":240,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"f-practice-session-005","dayId":"zone-f-day-2","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"f-practice-005","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":480,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"f-practice-session-008","dayId":"zone-f-day-3","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"f-practice-008","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"f-session-01","dayId":"zone-f-day-3","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-001-group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":23.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-002-group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":13.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-003-group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":37.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"f-session-02","dayId":"zone-f-day-3","warmupStartMinutes":650,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-004-group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":21.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-f-event-005-group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":42.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow; Split strongly recommended if springboard","customLabel":"Review split board / flow; Split strongly recommended if springboard"}]},{"id":"f-session-03","dayId":"zone-f-day-3","warmupStartMinutes":825,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-006-group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":1.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-007-group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":11.0,"numberOfDives":7,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-008-group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":23.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"f-practice-session-021","dayId":"zone-f-day-4","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"f-practice-021","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"f-session-04","dayId":"zone-f-day-4","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-009-group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":8.0,"numberOfDives":6,"secondsPerDive":45.0,"defaultSpd":45.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-010-group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":28.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-f-event-011-group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":39.0,"numberOfDives":9,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":9,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"f-session-05","dayId":"zone-f-day-4","warmupStartMinutes":665,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-012-group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":10.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-013-group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":18.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-014-group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":24.0,"numberOfDives":7,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"f-session-06","dayId":"zone-f-day-4","warmupStartMinutes":835,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-015-group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":17.0,"numberOfDives":8,"secondsPerDive":42.0,"defaultSpd":42.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-016-group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":24.0,"numberOfDives":10,"secondsPerDive":32.0,"defaultSpd":32.0,"defaultDives":10,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"f-practice-session-034","dayId":"zone-f-day-5","warmupStartMinutes":420,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"f-practice-034","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","round":"Custom Block","numberOfDivers":0.0,"numberOfDives":0,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"notes":"Open practice block.","customLabel":"Open practice block."}]},{"id":"f-session-07","dayId":"zone-f-day-5","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-017-group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":33.0,"numberOfDives":7,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":7,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-f-event-018-group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":19.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-019-group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":14.0,"numberOfDives":9,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""}]},{"id":"f-session-08","dayId":"zone-f-day-5","warmupStartMinutes":685,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-020-group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDivers":22.0,"numberOfDives":9,"secondsPerDive":33.0,"defaultSpd":33.0,"defaultDives":9,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"},{"id":"zone-f-event-021-group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":37.0,"numberOfDives":8,"secondsPerDive":34.0,"defaultSpd":34.0,"defaultDives":8,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"customDurationMinutes":0,"notes":"Review split board / flow","customLabel":"Review split board / flow"}]},{"id":"f-session-09","dayId":"zone-f-day-5","warmupStartMinutes":865,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"zone-f-event-022-group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":9.0,"numberOfDives":6,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":6,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-023-group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDivers":17.0,"numberOfDives":8,"secondsPerDive":35.0,"defaultSpd":35.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"","customLabel":""},{"id":"zone-f-event-024-group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Qualifier","numberOfDivers":28.0,"numberOfDives":8,"secondsPerDive":38.0,"defaultSpd":38.0,"defaultDives":8,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":0,"notes":"Review platform load","customLabel":"Review platform load"}]}],"publishStatus":"draft","currentLibraryId":"seed-zone-f","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-jr-nationals","name":"2026 USA Diving Junior National Championships","builtIn":true,"savedAt":"2026-06-09T16:30:00.000Z","schedule":{"updatedAt":"2026-06-09T16:30:00.000Z","meet":{"name":"2026 USA Diving Junior National Championships","venue":"Peak Health Aquatic Center at Mylan Park, Morgantown, WV","city":"Morgantown, WV","timezone":"America/New_York","meetType":"custom","days":[{"id":"day-2026-07-28","date":"2026-07-28","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-29","date":"2026-07-29","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-30","date":"2026-07-30","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-31","date":"2026-07-31","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-01","date":"2026-08-01","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-02","date":"2026-08-02","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-03","date":"2026-08-03","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-04","date":"2026-08-04","openMinutes":390,"closeMinutes":1200}]},"sessions":[{"id":"jn-full-practice","dayId":"day-2026-07-28","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Junior Nationals official practice \u2014 full facility day","events":[{"id":"junior-nationals-official-practice-full-facility-day-event","style":"Custom Block","customLabel":"Junior Nationals official practice \u2014 full facility day","customDurationMinutes":420,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Full facility open practice day."}]},{"id":"jn-open-training-am","dayId":"day-2026-07-29","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open training \u2014 before 2 PM competition start","events":[{"id":"open-training-before-2-pm-competition-start-event","style":"Custom Block","customLabel":"Open training \u2014 before 2 PM competition start","customDurationMinutes":450,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training before the first competition block."}]},{"id":"jn-session-01","dayId":"day-2026-07-29","warmupStartMinutes":840,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 1","events":[{"id":"group-b-boys-1-meter-individual","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter-individual","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":10,"defaultDives":10,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-02","dayId":"day-2026-07-29","warmupStartMinutes":1030,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 2","events":[{"id":"group-b-boys-1-meter-individual","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter-individual","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-03","dayId":"day-2026-07-30","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 3","events":[{"id":"group-a-boys-1-meter-individual","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":10,"defaultDives":10,"numberOfDivers":47,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-3-meter-individual","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform-individual","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-04","dayId":"day-2026-07-30","warmupStartMinutes":725,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 4","events":[{"id":"group-a-girls-platform-individual","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":42,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-05","dayId":"day-2026-07-30","warmupStartMinutes":970,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 5","events":[{"id":"group-a-boys-1-meter-individual","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-3-meter-individual","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform-individual","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-06","dayId":"day-2026-07-30","warmupStartMinutes":1070,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 6","events":[{"id":"group-a-girls-platform-individual","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-07","dayId":"day-2026-07-31","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 7","events":[{"id":"group-b-girls-1-meter-individual","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-girls-3-meter-individual","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform-individual","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":33.0,"defaultSpd":33.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-08","dayId":"day-2026-07-31","warmupStartMinutes":715,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 8","events":[{"id":"group-c-boys-1-meter-individual","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter-individual","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":27,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-platform-individual","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-09","dayId":"day-2026-07-31","warmupStartMinutes":885,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 9","events":[{"id":"group-b-girls-1-meter-individual","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-girls-3-meter-individual","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform-individual","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-10","dayId":"day-2026-07-31","warmupStartMinutes":990,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 10","events":[{"id":"group-c-boys-1-meter-individual","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter-individual","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-platform-individual","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-11","dayId":"day-2026-08-01","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 11","events":[{"id":"group-a-girls-1-meter-individual","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter-individual","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":39,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-platform-individual","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":40,"secondsPerDive":34.0,"defaultSpd":34.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-12","dayId":"day-2026-08-01","warmupStartMinutes":670,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 12","events":[{"id":"group-d-girls-1-meter-individual","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter-individual","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-platform-individual","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":35,"secondsPerDive":36.0,"defaultSpd":36.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-13","dayId":"day-2026-08-01","warmupStartMinutes":865,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 13","events":[{"id":"group-a-girls-1-meter-individual","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter-individual","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-platform-individual","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-14","dayId":"day-2026-08-01","warmupStartMinutes":955,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 14","events":[{"id":"group-d-girls-1-meter-individual","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter-individual","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-platform-individual","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-15","dayId":"day-2026-08-02","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 15","events":[{"id":"group-c-girls-1-meter-individual","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-3-meter-individual","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform-individual","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-16","dayId":"day-2026-08-02","warmupStartMinutes":650,"warmupMinutes":40,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 16","events":[{"id":"group-c-girls-1-meter-individual","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-3-meter-individual","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform-individual","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-restricted-aug02","dayId":"day-2026-08-02","warmupStartMinutes":740,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open boards","events":[{"id":"restricted-senior-qualifier-open-boards-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open boards","customDurationMinutes":420,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"jn-session-17","dayId":"day-2026-08-03","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 17","events":[{"id":"group-d-boys-1-meter-individual","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-3-meter-individual","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":35,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform-individual","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":36,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-18","dayId":"day-2026-08-03","warmupStartMinutes":675,"warmupMinutes":40,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 18","events":[{"id":"group-d-boys-1-meter-individual","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-3-meter-individual","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform-individual","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-19","dayId":"day-2026-08-03","warmupStartMinutes":780,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 19","events":[{"id":"junior-14-18-girls-3-meter-synchronized","level":"Junior 14-18","gender":"Girls","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"junior-14-18-boys-platform-synchronized","level":"Junior 14-18","gender":"Boys","apparatus":"Platform","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-restricted-aug03","dayId":"day-2026-08-03","warmupStartMinutes":905,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open boards","events":[{"id":"restricted-senior-qualifier-open-boards-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open boards","customDurationMinutes":295,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"jn-senior-open-training","dayId":"day-2026-08-04","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Senior open training","events":[{"id":"senior-open-training-event","style":"Custom Block","customLabel":"Senior open training","customDurationMinutes":180,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"USA Nationals senior open training."}]},{"id":"jn-session-20","dayId":"day-2026-08-04","warmupStartMinutes":580,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 20","events":[{"id":"junior-14-18-boys-3-meter-synchronized","level":"Junior 14-18","gender":"Boys","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"junior-14-18-girls-platform-synchronized","level":"Junior 14-18","gender":"Girls","apparatus":"Platform","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-national-qualifier-training","dayId":"day-2026-08-04","warmupStartMinutes":705,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"National Qualifier open training","events":[{"id":"national-qualifier-open-training-event","style":"Custom Block","customLabel":"National Qualifier open training","customDurationMinutes":495,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Remainder of day restricted to USA Nationals / National Qualifier athletes."}]}],"publishStatus":"review","currentLibraryId":"saved-2026-jr-nationals","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-nationals","name":"2026 USA Diving National Championships & Qualifier","builtIn":true,"savedAt":"2026-06-09T16:30:00.000Z","schedule":{"updatedAt":"2026-06-09T16:30:00.000Z","meet":{"name":"2026 USA Diving National Championships & Qualifier","venue":"Peak Health Aquatic Center at Mylan Park, Morgantown, WV","city":"Morgantown, WV","timezone":"America/New_York","meetType":"custom","days":[{"id":"day-2026-08-04","date":"2026-08-04","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-05","date":"2026-08-05","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-06","date":"2026-08-06","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-07","date":"2026-08-07","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-08","date":"2026-08-08","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-09","date":"2026-08-09","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-10","date":"2026-08-10","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-11","date":"2026-08-11","openMinutes":390,"closeMinutes":1200}]},"sessions":[{"id":"sr-senior-open-training","dayId":"day-2026-08-04","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Senior open training","events":[{"id":"senior-open-training-event","style":"Custom Block","customLabel":"Senior open training","customDurationMinutes":180,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"USA Nationals senior open training."}]},{"id":"sr-national-qualifier-training","dayId":"day-2026-08-04","warmupStartMinutes":705,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"National Qualifier open training","events":[{"id":"national-qualifier-open-training-event","style":"Custom Block","customLabel":"National Qualifier open training","customDurationMinutes":495,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted to USA Nationals / National Qualifier athletes."}]},{"id":"sr-open-warmup-aug05","dayId":"day-2026-08-05","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open warm-up","events":[{"id":"restricted-senior-qualifier-open-warm-up-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open warm-up","customDurationMinutes":300,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-technical-meeting","dayId":"day-2026-08-05","warmupStartMinutes":720,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Technical Meeting","events":[{"id":"technical-meeting-event","style":"Custom Block","customLabel":"Technical Meeting","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Technical Meeting"}]},{"id":"sr-open-training-aug05","dayId":"day-2026-08-05","warmupStartMinutes":785,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open training","events":[{"id":"restricted-senior-qualifier-open-training-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open training","customDurationMinutes":175,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-20","dayId":"day-2026-08-05","warmupStartMinutes":960,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 20","events":[{"id":"national-qualifier-men-3-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-women-10-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Qualifier","numberOfDives":5,"defaultDives":5,"numberOfDivers":17,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-open-practice-aug06","dayId":"day-2026-08-06","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-event","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open Training"}]},{"id":"sr-session-21","dayId":"day-2026-08-06","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 21","events":[{"id":"national-qualifier-men-10-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Qualifier","numberOfDives":6,"defaultDives":6,"numberOfDivers":11,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-women-1-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDives":5,"defaultDives":5,"numberOfDivers":34,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-22","dayId":"day-2026-08-06","warmupStartMinutes":840,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 22","events":[{"id":"national-qualifier-women-3-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDives":5,"defaultDives":5,"numberOfDivers":40,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-men-1-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDives":6,"defaultDives":6,"numberOfDivers":25,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug07-am","dayId":"day-2026-08-07","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-23","dayId":"day-2026-08-07","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 23","events":[{"id":"senior-men-3-meter-individual","level":"Senior","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":43,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-10-meter-individual","level":"Senior","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":28,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-24","dayId":"day-2026-08-07","warmupStartMinutes":960,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 24","events":[{"id":"senior-men-3-meter-individual","level":"Senior","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-25","dayId":"day-2026-08-07","warmupStartMinutes":1045,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 25","events":[{"id":"senior-women-10-meter-individual","level":"Senior","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug08-am","dayId":"day-2026-08-08","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-26","dayId":"day-2026-08-08","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 26","events":[{"id":"senior-men-1-meter-individual","level":"Senior","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-3-meter-individual","level":"Senior","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":33,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-27","dayId":"day-2026-08-08","warmupStartMinutes":910,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 27","events":[{"id":"senior-men-1-meter-individual","level":"Senior","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-28","dayId":"day-2026-08-08","warmupStartMinutes":1015,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 28","events":[{"id":"senior-women-3-meter-individual","level":"Senior","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug09-am","dayId":"day-2026-08-09","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-29","dayId":"day-2026-08-09","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 29","events":[{"id":"senior-men-10-meter-individual","level":"Senior","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":28,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-1-meter-individual","level":"Senior","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":29,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-30","dayId":"day-2026-08-09","warmupStartMinutes":970,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 30","events":[{"id":"senior-men-10-meter-individual","level":"Senior","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-31","dayId":"day-2026-08-09","warmupStartMinutes":1065,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 31","events":[{"id":"senior-women-1-meter-individual","level":"Senior","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug10-am","dayId":"day-2026-08-10","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-32","dayId":"day-2026-08-10","warmupStartMinutes":535,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 32","events":[{"id":"senior-synchro-women-10-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"10-Meter","style":"Synchronized","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":6,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-3-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"3-Meter","style":"Synchronized","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":9,"secondsPerDive":34.0,"defaultSpd":34.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-33","dayId":"day-2026-08-10","warmupStartMinutes":815,"warmupMinutes":30,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 33","events":[{"id":"senior-synchro-women-10-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"10-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":6,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-3-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":9,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug11-am","dayId":"day-2026-08-11","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-34","dayId":"day-2026-08-11","warmupStartMinutes":535,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 34","events":[{"id":"senior-synchro-women-3-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"3-Meter","style":"Synchronized","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":5,"secondsPerDive":40.0,"defaultSpd":40.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-10-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"10-Meter","style":"Synchronized","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":7,"secondsPerDive":40.0,"defaultSpd":40.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-35","dayId":"day-2026-08-11","warmupStartMinutes":815,"warmupMinutes":30,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 35","events":[{"id":"senior-synchro-women-3-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":5,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-10-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"10-Meter","style":"Synchronized","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":7,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]}],"publishStatus":"review","currentLibraryId":"saved-2026-nationals","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-combined","name":"2026 Combined Junior & USA National Championships","builtIn":true,"savedAt":"2026-06-09T16:30:00.000Z","schedule":{"updatedAt":"2026-06-09T16:30:00.000Z","meet":{"name":"2026 Combined Junior & USA National Championships","venue":"Peak Health Aquatic Center at Mylan Park, Morgantown, WV","city":"Morgantown, WV","timezone":"America/New_York","meetType":"custom","days":[{"id":"day-2026-07-28","date":"2026-07-28","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-29","date":"2026-07-29","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-30","date":"2026-07-30","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-07-31","date":"2026-07-31","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-01","date":"2026-08-01","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-02","date":"2026-08-02","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-03","date":"2026-08-03","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-04","date":"2026-08-04","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-05","date":"2026-08-05","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-06","date":"2026-08-06","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-07","date":"2026-08-07","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-08","date":"2026-08-08","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-09","date":"2026-08-09","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-10","date":"2026-08-10","openMinutes":390,"closeMinutes":1200},{"id":"day-2026-08-11","date":"2026-08-11","openMinutes":390,"closeMinutes":1200}]},"sessions":[{"id":"jn-full-practice","dayId":"day-2026-07-28","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Junior Nationals official practice \u2014 full facility day","events":[{"id":"junior-nationals-official-practice-full-facility-day-event","style":"Custom Block","customLabel":"Junior Nationals official practice \u2014 full facility day","customDurationMinutes":420,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Full facility open practice day."}]},{"id":"jn-open-training-am","dayId":"day-2026-07-29","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open training \u2014 before 2 PM competition start","events":[{"id":"open-training-before-2-pm-competition-start-event","style":"Custom Block","customLabel":"Open training \u2014 before 2 PM competition start","customDurationMinutes":450,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training before the first competition block."}]},{"id":"jn-session-01","dayId":"day-2026-07-29","warmupStartMinutes":840,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 1","events":[{"id":"group-b-boys-1-meter-individual","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter-individual","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":10,"defaultDives":10,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-02","dayId":"day-2026-07-29","warmupStartMinutes":1030,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 2","events":[{"id":"group-b-boys-1-meter-individual","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter-individual","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-03","dayId":"day-2026-07-30","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 3","events":[{"id":"group-a-boys-1-meter-individual","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":10,"defaultDives":10,"numberOfDivers":47,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-3-meter-individual","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform-individual","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":40,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-04","dayId":"day-2026-07-30","warmupStartMinutes":725,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 4","events":[{"id":"group-a-girls-platform-individual","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":42,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-05","dayId":"day-2026-07-30","warmupStartMinutes":970,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 5","events":[{"id":"group-a-boys-1-meter-individual","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-3-meter-individual","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform-individual","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-06","dayId":"day-2026-07-30","warmupStartMinutes":1070,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 6","events":[{"id":"group-a-girls-platform-individual","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-07","dayId":"day-2026-07-31","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 7","events":[{"id":"group-b-girls-1-meter-individual","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-girls-3-meter-individual","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform-individual","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":33.0,"defaultSpd":33.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-08","dayId":"day-2026-07-31","warmupStartMinutes":715,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 8","events":[{"id":"group-c-boys-1-meter-individual","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter-individual","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":27,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-platform-individual","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-09","dayId":"day-2026-07-31","warmupStartMinutes":885,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 9","events":[{"id":"group-b-girls-1-meter-individual","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-girls-3-meter-individual","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform-individual","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-10","dayId":"day-2026-07-31","warmupStartMinutes":990,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 10","events":[{"id":"group-c-boys-1-meter-individual","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter-individual","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-platform-individual","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-11","dayId":"day-2026-08-01","warmupStartMinutes":450,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 11","events":[{"id":"group-a-girls-1-meter-individual","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":42,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter-individual","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":9,"defaultDives":9,"numberOfDivers":39,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-platform-individual","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":40,"secondsPerDive":34.0,"defaultSpd":34.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-12","dayId":"day-2026-08-01","warmupStartMinutes":670,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 12","events":[{"id":"group-d-girls-1-meter-individual","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter-individual","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":8,"defaultDives":8,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-platform-individual","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":35,"secondsPerDive":36.0,"defaultSpd":36.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-13","dayId":"day-2026-08-01","warmupStartMinutes":865,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 13","events":[{"id":"group-a-girls-1-meter-individual","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter-individual","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-girls-platform-individual","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-14","dayId":"day-2026-08-01","warmupStartMinutes":955,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 14","events":[{"id":"group-d-girls-1-meter-individual","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter-individual","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-platform-individual","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-15","dayId":"day-2026-08-02","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 15","events":[{"id":"group-c-girls-1-meter-individual","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-3-meter-individual","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform-individual","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":34,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-16","dayId":"day-2026-08-02","warmupStartMinutes":650,"warmupMinutes":40,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 16","events":[{"id":"group-c-girls-1-meter-individual","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-girls-3-meter-individual","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform-individual","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-restricted-aug02","dayId":"day-2026-08-02","warmupStartMinutes":740,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open boards","events":[{"id":"restricted-senior-qualifier-open-boards-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open boards","customDurationMinutes":420,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"jn-session-17","dayId":"day-2026-08-03","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 17","events":[{"id":"group-d-boys-1-meter-individual","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":2,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-3-meter-individual","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":35,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform-individual","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDives":7,"defaultDives":7,"numberOfDivers":36,"secondsPerDive":30.0,"defaultSpd":30.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-18","dayId":"day-2026-08-03","warmupStartMinutes":675,"warmupMinutes":40,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 18","events":[{"id":"group-d-boys-1-meter-individual","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-girls-3-meter-individual","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":3,"defaultDives":3,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform-individual","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDives":4,"defaultDives":4,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-session-19","dayId":"day-2026-08-03","warmupStartMinutes":780,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 19","events":[{"id":"junior-14-18-girls-3-meter-synchronized","level":"Junior 14-18","gender":"Girls","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"junior-14-18-boys-platform-synchronized","level":"Junior 14-18","gender":"Boys","apparatus":"Platform","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-restricted-aug03","dayId":"day-2026-08-03","warmupStartMinutes":905,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open boards","events":[{"id":"restricted-senior-qualifier-open-boards-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open boards","customDurationMinutes":295,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"jn-senior-open-training","dayId":"day-2026-08-04","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Senior open training","events":[{"id":"senior-open-training-event","style":"Custom Block","customLabel":"Senior open training","customDurationMinutes":180,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"USA Nationals senior open training."}]},{"id":"jn-session-20","dayId":"day-2026-08-04","warmupStartMinutes":580,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 20","events":[{"id":"junior-14-18-boys-3-meter-synchronized","level":"Junior 14-18","gender":"Boys","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"junior-14-18-girls-platform-synchronized","level":"Junior 14-18","gender":"Girls","apparatus":"Platform","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"jn-national-qualifier-training","dayId":"day-2026-08-04","warmupStartMinutes":705,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"National Qualifier open training","events":[{"id":"national-qualifier-open-training-event","style":"Custom Block","customLabel":"National Qualifier open training","customDurationMinutes":495,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Remainder of day restricted to USA Nationals / National Qualifier athletes."}]},{"id":"sr-open-warmup-aug05","dayId":"day-2026-08-05","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open warm-up","events":[{"id":"restricted-senior-qualifier-open-warm-up-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open warm-up","customDurationMinutes":300,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-technical-meeting","dayId":"day-2026-08-05","warmupStartMinutes":720,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Technical Meeting","events":[{"id":"technical-meeting-event","style":"Custom Block","customLabel":"Technical Meeting","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Technical Meeting"}]},{"id":"sr-open-training-aug05","dayId":"day-2026-08-05","warmupStartMinutes":785,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Restricted senior/qualifier open training","events":[{"id":"restricted-senior-qualifier-open-training-event","style":"Custom Block","customLabel":"Restricted senior/qualifier open training","customDurationMinutes":175,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-20","dayId":"day-2026-08-05","warmupStartMinutes":960,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 20","events":[{"id":"national-qualifier-men-3-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-women-10-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Qualifier","numberOfDives":5,"defaultDives":5,"numberOfDivers":17,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-open-practice-aug06","dayId":"day-2026-08-06","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-event","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open Training"}]},{"id":"sr-session-21","dayId":"day-2026-08-06","warmupStartMinutes":480,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 21","events":[{"id":"national-qualifier-men-10-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Qualifier","numberOfDives":6,"defaultDives":6,"numberOfDivers":11,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-women-1-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDives":5,"defaultDives":5,"numberOfDivers":34,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-22","dayId":"day-2026-08-06","warmupStartMinutes":840,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 22","events":[{"id":"national-qualifier-women-3-meter-individual","level":"National Qualifier","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Qualifier","numberOfDives":5,"defaultDives":5,"numberOfDivers":40,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"national-qualifier-men-1-meter-individual","level":"National Qualifier","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Qualifier","numberOfDives":6,"defaultDives":6,"numberOfDivers":25,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug07-am","dayId":"day-2026-08-07","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-23","dayId":"day-2026-08-07","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 23","events":[{"id":"senior-men-3-meter-individual","level":"Senior","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":43,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-10-meter-individual","level":"Senior","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":28,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-24","dayId":"day-2026-08-07","warmupStartMinutes":960,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 24","events":[{"id":"senior-men-3-meter-individual","level":"Senior","gender":"Men","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-25","dayId":"day-2026-08-07","warmupStartMinutes":1045,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 25","events":[{"id":"senior-women-10-meter-individual","level":"Senior","gender":"Women","apparatus":"10-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug08-am","dayId":"day-2026-08-08","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-26","dayId":"day-2026-08-08","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 26","events":[{"id":"senior-men-1-meter-individual","level":"Senior","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":36,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-3-meter-individual","level":"Senior","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":33,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-27","dayId":"day-2026-08-08","warmupStartMinutes":910,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 27","events":[{"id":"senior-men-1-meter-individual","level":"Senior","gender":"Men","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-28","dayId":"day-2026-08-08","warmupStartMinutes":1015,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 28","events":[{"id":"senior-women-3-meter-individual","level":"Senior","gender":"Women","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug09-am","dayId":"day-2026-08-09","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-29","dayId":"day-2026-08-09","warmupStartMinutes":540,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 29","events":[{"id":"senior-men-10-meter-individual","level":"Senior","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":28,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-women-1-meter-individual","level":"Senior","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":29,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-30","dayId":"day-2026-08-09","warmupStartMinutes":970,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 30","events":[{"id":"senior-men-10-meter-individual","level":"Senior","gender":"Men","apparatus":"10-Meter","style":"Individual","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":12,"secondsPerDive":38.0,"defaultSpd":38.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-31","dayId":"day-2026-08-09","warmupStartMinutes":1065,"warmupMinutes":35,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 31","events":[{"id":"senior-women-1-meter-individual","level":"Senior","gender":"Women","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":12,"secondsPerDive":32.0,"defaultSpd":32.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug10-am","dayId":"day-2026-08-10","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-32","dayId":"day-2026-08-10","warmupStartMinutes":535,"warmupMinutes":60,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 32","events":[{"id":"senior-synchro-women-10-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"10-Meter","style":"Synchronized","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":6,"secondsPerDive":35.0,"defaultSpd":35.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-3-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"3-Meter","style":"Synchronized","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":9,"secondsPerDive":34.0,"defaultSpd":34.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-33","dayId":"day-2026-08-10","warmupStartMinutes":815,"warmupMinutes":30,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 33","events":[{"id":"senior-synchro-women-10-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"10-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":6,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-3-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":9,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-restricted-aug11-am","dayId":"day-2026-08-11","warmupStartMinutes":420,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"USA Nationals restricted open boards","events":[{"id":"usa-nationals-restricted-open-boards-event","style":"Custom Block","customLabel":"USA Nationals restricted open boards","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Restricted: USA Nationals / National Qualifier entrants only."}]},{"id":"sr-session-34","dayId":"day-2026-08-11","warmupStartMinutes":535,"warmupMinutes":55,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 34","events":[{"id":"senior-synchro-women-3-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"3-Meter","style":"Synchronized","round":"Prelim","numberOfDives":5,"defaultDives":5,"numberOfDivers":5,"secondsPerDive":40.0,"defaultSpd":40.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-10-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"10-Meter","style":"Synchronized","round":"Prelim","numberOfDives":6,"defaultDives":6,"numberOfDivers":7,"secondsPerDive":40.0,"defaultSpd":40.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"sr-session-35","dayId":"day-2026-08-11","warmupStartMinutes":815,"warmupMinutes":30,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"Session 35","events":[{"id":"senior-synchro-women-3-meter-synchronized","level":"Senior Synchro","gender":"Women","apparatus":"3-Meter","style":"Synchronized","round":"Final","numberOfDives":5,"defaultDives":5,"numberOfDivers":5,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"senior-synchro-men-10-meter-synchronized","level":"Senior Synchro","gender":"Men","apparatus":"10-Meter","style":"Synchronized","round":"Final","numberOfDives":6,"defaultDives":6,"numberOfDivers":7,"secondsPerDive":45.0,"defaultSpd":45.0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]}],"publishStatus":"review","currentLibraryId":"saved-2026-combined","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-east-championship","name":"2026 USA Diving East Championship","builtIn":true,"savedAt":"2026-06-23T00:00:00.000Z","schedule":{"updatedAt":"2026-06-23T00:00:00.000Z","meet":{"name":"2026 USA Diving East Championship","venue":"Competition Pool","city":"","timezone":"America/New_York","meetType":"eastWestCentral","days":[{"id":"day-2026-06-23","date":"2026-06-23","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-24","date":"2026-06-24","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-25","date":"2026-06-25","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-26","date":"2026-06-26","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-27","date":"2026-06-27","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-28","date":"2026-06-28","openMinutes":360,"closeMinutes":1260}]},"sessions":[{"id":"east-blk-1","dayId":"day-2026-06-23","warmupStartMinutes":840,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-1","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":360,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"east-blk-2","dayId":"day-2026-06-24","warmupStartMinutes":780,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-2","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":360,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Zone A: 1:00\u20133:00 PM, Zone B: 3:00\u20135:00 PM, Zone A: 5:00\u20136:00 PM, Zone B: 6:00\u20137:00 PM"}]},{"id":"east-blk-3","dayId":"day-2026-06-24","warmupStartMinutes":1140,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Technical Meeting","events":[{"id":"technical-meeting-3","style":"Custom Block","customLabel":"Technical Meeting","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Technical Meeting"}]},{"id":"east-blk-4","dayId":"day-2026-06-25","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-4","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"east-s01","dayId":"day-2026-06-25","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s02","dayId":"day-2026-06-25","warmupStartMinutes":630,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s03","dayId":"day-2026-06-25","warmupStartMinutes":775,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-5","dayId":"day-2026-06-25","warmupStartMinutes":885,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-5","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"east-s04","dayId":"day-2026-06-25","warmupStartMinutes":955,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s05","dayId":"day-2026-06-25","warmupStartMinutes":1040,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s06","dayId":"day-2026-06-25","warmupStartMinutes":1110,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-6","dayId":"day-2026-06-26","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-6","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"east-s07","dayId":"day-2026-06-26","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s08","dayId":"day-2026-06-26","warmupStartMinutes":655,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s09","dayId":"day-2026-06-26","warmupStartMinutes":795,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-7","dayId":"day-2026-06-26","warmupStartMinutes":905,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-7","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"east-s10","dayId":"day-2026-06-26","warmupStartMinutes":975,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s11","dayId":"day-2026-06-26","warmupStartMinutes":1045,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s12","dayId":"day-2026-06-26","warmupStartMinutes":1110,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-8","dayId":"day-2026-06-27","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-8","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"east-s13","dayId":"day-2026-06-27","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s14","dayId":"day-2026-06-27","warmupStartMinutes":620,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s15","dayId":"day-2026-06-27","warmupStartMinutes":735,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-9","dayId":"day-2026-06-27","warmupStartMinutes":810,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-9","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"east-s16","dayId":"day-2026-06-27","warmupStartMinutes":880,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s17","dayId":"day-2026-06-27","warmupStartMinutes":955,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s18","dayId":"day-2026-06-27","warmupStartMinutes":1015,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-10","dayId":"day-2026-06-28","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-10","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"east-s19","dayId":"day-2026-06-28","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s20","dayId":"day-2026-06-28","warmupStartMinutes":645,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s21","dayId":"day-2026-06-28","warmupStartMinutes":765,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-blk-11","dayId":"day-2026-06-28","warmupStartMinutes":875,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-11","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":65,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"east-s22","dayId":"day-2026-06-28","warmupStartMinutes":940,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s23","dayId":"day-2026-06-28","warmupStartMinutes":1010,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"east-s24","dayId":"day-2026-06-28","warmupStartMinutes":1075,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]}],"publishStatus":"review","currentLibraryId":"saved-2026-east-championship","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-west-championship","name":"2026 USA Diving West Championship","builtIn":true,"savedAt":"2026-06-23T00:00:00.000Z","schedule":{"updatedAt":"2026-06-23T00:00:00.000Z","meet":{"name":"2026 USA Diving West Championship","venue":"Competition Pool","city":"","timezone":"America/New_York","meetType":"eastWestCentral","days":[{"id":"day-2026-06-23","date":"2026-06-23","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-24","date":"2026-06-24","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-25","date":"2026-06-25","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-26","date":"2026-06-26","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-27","date":"2026-06-27","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-28","date":"2026-06-28","openMinutes":360,"closeMinutes":1260}]},"sessions":[{"id":"west-blk-1","dayId":"day-2026-06-23","warmupStartMinutes":660,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-1","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":540,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"west-blk-2","dayId":"day-2026-06-24","warmupStartMinutes":480,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-2","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":660,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Flighted: Dryland opens 7:30 AM. Zone F: 8\u201310 AM and 1\u20133 PM. Zone E: 10 AM\u201312 PM and 3\u20135 PM. Open: 12\u20131 PM and 5\u20137 PM."}]},{"id":"west-blk-3","dayId":"day-2026-06-24","warmupStartMinutes":1140,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Technical Meeting","events":[{"id":"technical-meeting-3","style":"Custom Block","customLabel":"Technical Meeting","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Technical Meeting"}]},{"id":"west-blk-4","dayId":"day-2026-06-25","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-4","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"west-s01","dayId":"day-2026-06-25","warmupStartMinutes":505,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s02","dayId":"day-2026-06-25","warmupStartMinutes":655,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s03","dayId":"day-2026-06-25","warmupStartMinutes":800,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-5","dayId":"day-2026-06-25","warmupStartMinutes":920,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-5","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"west-s04","dayId":"day-2026-06-25","warmupStartMinutes":1020,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s05","dayId":"day-2026-06-25","warmupStartMinutes":1090,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s06","dayId":"day-2026-06-25","warmupStartMinutes":1160,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-6","dayId":"day-2026-06-26","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-6","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"west-s07","dayId":"day-2026-06-26","warmupStartMinutes":505,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s08","dayId":"day-2026-06-26","warmupStartMinutes":690,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s09","dayId":"day-2026-06-26","warmupStartMinutes":795,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-7","dayId":"day-2026-06-26","warmupStartMinutes":890,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-7","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"west-s10","dayId":"day-2026-06-26","warmupStartMinutes":990,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s11","dayId":"day-2026-06-26","warmupStartMinutes":1060,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s12","dayId":"day-2026-06-26","warmupStartMinutes":1125,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-8","dayId":"day-2026-06-27","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-8","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"west-s13","dayId":"day-2026-06-27","warmupStartMinutes":505,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s14","dayId":"day-2026-06-27","warmupStartMinutes":630,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s15","dayId":"day-2026-06-27","warmupStartMinutes":730,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-9","dayId":"day-2026-06-27","warmupStartMinutes":820,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-9","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"west-s16","dayId":"day-2026-06-27","warmupStartMinutes":920,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s17","dayId":"day-2026-06-27","warmupStartMinutes":995,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s18","dayId":"day-2026-06-27","warmupStartMinutes":1055,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-10","dayId":"day-2026-06-28","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-10","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":115,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"west-s19","dayId":"day-2026-06-28","warmupStartMinutes":505,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":true,"numberOfPanelChanges":3,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s20","dayId":"day-2026-06-28","warmupStartMinutes":620,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s21","dayId":"day-2026-06-28","warmupStartMinutes":720,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-blk-11","dayId":"day-2026-06-28","warmupStartMinutes":815,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-11","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"west-s22","dayId":"day-2026-06-28","warmupStartMinutes":915,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s23","dayId":"day-2026-06-28","warmupStartMinutes":985,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"west-s24","dayId":"day-2026-06-28","warmupStartMinutes":1050,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]}],"publishStatus":"review","currentLibraryId":"saved-2026-west-championship","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}},{"id":"saved-2026-central-championship","name":"2026 USA Diving Central Championship","builtIn":true,"savedAt":"2026-06-23T00:00:00.000Z","schedule":{"updatedAt":"2026-06-23T00:00:00.000Z","meet":{"name":"2026 USA Diving Central Championship","venue":"Competition Pool","city":"","timezone":"America/New_York","meetType":"eastWestCentral","days":[{"id":"day-2026-06-23","date":"2026-06-23","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-24","date":"2026-06-24","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-25","date":"2026-06-25","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-26","date":"2026-06-26","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-27","date":"2026-06-27","openMinutes":360,"closeMinutes":1260},{"id":"day-2026-06-28","date":"2026-06-28","openMinutes":360,"closeMinutes":1260}]},"sessions":[{"id":"central-blk-1","dayId":"day-2026-06-23","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-1","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":870,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-blk-2","dayId":"day-2026-06-24","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-2","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":750,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-blk-3","dayId":"day-2026-06-24","warmupStartMinutes":1140,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Technical Meeting","events":[{"id":"technical-meeting-3","style":"Custom Block","customLabel":"Technical Meeting","customDurationMinutes":60,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Technical Meeting"}]},{"id":"central-blk-4","dayId":"day-2026-06-25","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-4","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-s01","dayId":"day-2026-06-25","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s02","dayId":"day-2026-06-25","warmupStartMinutes":640,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s03","dayId":"day-2026-06-25","warmupStartMinutes":735,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-5","dayId":"day-2026-06-25","warmupStartMinutes":855,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-5","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"central-s04","dayId":"day-2026-06-25","warmupStartMinutes":985,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s05","dayId":"day-2026-06-25","warmupStartMinutes":1055,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s06","dayId":"day-2026-06-25","warmupStartMinutes":1125,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-6","dayId":"day-2026-06-26","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-6","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-s07","dayId":"day-2026-06-26","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s08","dayId":"day-2026-06-26","warmupStartMinutes":640,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s09","dayId":"day-2026-06-26","warmupStartMinutes":780,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-7","dayId":"day-2026-06-26","warmupStartMinutes":880,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-7","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":130,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"central-s10","dayId":"day-2026-06-26","warmupStartMinutes":1020,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s11","dayId":"day-2026-06-26","warmupStartMinutes":1090,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s12","dayId":"day-2026-06-26","warmupStartMinutes":1155,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-8","dayId":"day-2026-06-27","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-8","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-s13","dayId":"day-2026-06-27","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s14","dayId":"day-2026-06-27","warmupStartMinutes":620,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s15","dayId":"day-2026-06-27","warmupStartMinutes":765,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-9","dayId":"day-2026-06-27","warmupStartMinutes":830,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-9","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":120,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"central-s16","dayId":"day-2026-06-27","warmupStartMinutes":960,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s17","dayId":"day-2026-06-27","warmupStartMinutes":1035,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s18","dayId":"day-2026-06-27","warmupStartMinutes":1095,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-10","dayId":"day-2026-06-28","warmupStartMinutes":390,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-practice-10","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":90,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open practice."}]},{"id":"central-s19","dayId":"day-2026-06-28","warmupStartMinutes":480,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s20","dayId":"day-2026-06-28","warmupStartMinutes":635,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s21","dayId":"day-2026-06-28","warmupStartMinutes":725,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Prelim","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-blk-11","dayId":"day-2026-06-28","warmupStartMinutes":805,"warmupMinutes":0,"rounding":5,"introMinutes":0,"bufferMinutes":0,"awardsEnabled":false,"isPractice":true,"title":"Open Training","events":[{"id":"open-training-11","style":"Custom Block","customLabel":"Open Training","customDurationMinutes":110,"apparatus":"Pool","gender":"Open","level":"Schedule","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":0,"defaultSpd":0,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"notes":"Open training."}]},{"id":"central-s22","dayId":"day-2026-06-28","warmupStartMinutes":925,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s23","dayId":"day-2026-06-28","warmupStartMinutes":995,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]},{"id":"central-s24","dayId":"day-2026-06-28","warmupStartMinutes":1060,"warmupMinutes":45,"rounding":5,"introMinutes":0,"bufferMinutes":5,"awardsEnabled":false,"isPractice":false,"title":"","events":[{"id":"group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":35,"defaultSpd":35,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""},{"id":"group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","round":"Final","numberOfDivers":0,"numberOfDives":0,"secondsPerDive":42,"defaultSpd":42,"defaultDives":0,"manualSplit":false,"numberOfPanelChanges":0,"minutesPerPanelChange":3,"customDurationMinutes":0,"notes":""}]}],"publishStatus":"review","currentLibraryId":"saved-2026-central-championship","acknowledgedWarnings":[],"outputSettings":{"showWarmup":true,"showEndTimes":true,"showSubjectToChange":true,"showRound":true}}}];



// ── CONFIG ────────────────────────────────────────────────────────────
const SK='usa-diving-sb-v4',LK='usa-diving-sb-v4-lib';
const EDITOR_ID=localStorage.getItem('sb-eid')||(()=>{const i='e'+Math.random().toString(36).slice(2,8);localStorage.setItem('sb-eid',i);return i})();
// Credential is read from data/config.js (loaded before this file in index.html)
// so a role rotation only ever has to happen in one place. This line used to
// hardcode the owner credential; when that role was rotated on 2026-07-24 every
// client silently went offline and saves stopped reaching the cloud.
const NEON=(window.USAD_CONFIG&&window.USAD_CONFIG.neon&&window.USAD_CONFIG.neon.connectionString)||'';
const STATUS=['draft','review','ready','published'];
const STATUS_LBL={draft:'Draft',review:'In Review',ready:'Ready',published:'Published'};
const TZS=[{v:'America/New_York',l:'Eastern (ET)',s:'ET'},{v:'America/Chicago',l:'Central (CT)',s:'CT'},{v:'America/Denver',l:'Mountain (MT)',s:'MT'},{v:'America/Los_Angeles',l:'Pacific (PT)',s:'PT'}];
const MEET_TYPES={zone:{l:'Zone Championship',groups:['Group A','Group B','Group C','Group D'],plat:true,rounds:['Qualifier']},regional:{l:'Regional Championship',groups:['Group A','Group B'],plat:false,rounds:['Qualifier']},eastWestCentral:{l:'East/West/Central',groups:['Group A','Group B','Group C','Group D'],plat:true,rounds:['Prelim','Final']},juniorNationals:{l:'Junior Nationals',groups:['Group A','Group B','Group C','Group D'],plat:true,rounds:['Prelim','Final'],jrSynchro:true},usaNationals:{l:'USA Nationals',groups:[],plat:true,rounds:['Qualifier','Prelim','Final'],senior:true,srSynchro:true},custom:{l:'Custom',groups:['Group A','Group B','Group C','Group D'],plat:true,rounds:['Qualifier','Prelim','Semifinal','Final'],senior:true,jrSynchro:true,srSynchro:true}};
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
  'Group C':{board:35,plat:45},'Group D':{board:35,plat:45},'Senior':{board:32,plat:38},
  // Synchro pairs move slower than individual rotation — matches the official
  // 2026 Jr Nationals / USA Nationals seed timing (35s board, 45s platform)
  'Junior 14-18':{board:35,plat:45},'Senior Synchro':{board:35,plat:45}};
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
const AUD={public:{l:'Public',showWU:false,showSec:false,showTimes:false,showEntries:false,practiceTop:false,showFlightCounts:true,showUnsplitAlt:false,showSplitAlt:false,showIntros:true,showAwards:true,showInternalBlocks:false},athletes:{l:'Athletes',showWU:true,showSec:false,showTimes:true,showEntries:false,practiceTop:false,showFlightCounts:true,showUnsplitAlt:false,showSplitAlt:false,showIntros:true,showAwards:true,showInternalBlocks:false},judges:{l:'Judges',showWU:true,showSec:true,showTimes:true,showEntries:true,practiceTop:false,showFlightCounts:true,showUnsplitAlt:false,showSplitAlt:false,showIntros:true,showAwards:true,showInternalBlocks:false},internal:{l:'Operations',showWU:true,showSec:true,showTimes:true,showEntries:true,practiceTop:false,showFlightCounts:true,showUnsplitAlt:false,showSplitAlt:false,showIntros:true,showAwards:true,showInternalBlocks:true},broadcast:{l:'Broadcast',showWU:true,showSec:true,showTimes:true,showEntries:true,practiceTop:false,showFlightCounts:false,showUnsplitAlt:false,showSplitAlt:false,showIntros:true,showAwards:true,showInternalBlocks:true,showCues:true,forCoaches:false}};

// ── UTILS ─────────────────────────────────────────────────────────────
const uid=()=>Math.random().toString(36).slice(2,10);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// For values interpolated inside single-quoted JS string literals within
// onclick attributes — apostrophes in user text (e.g. "Coach's copy") would
// otherwise terminate the string and break the handler.
const escJsAttr=v=>esc(String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"));
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
const al=a=>a==='1m'?'1-Meter':a==='3m'?'3-Meter':a==='10m'?'10-Meter':a;
const evName=ev=>{if(ev.style==='Custom Block')return ev.customLabel||ev.title||'Custom block';const syn=ev.style==='Synchronized'&&!/synchro/i.test(ev.level||'')?' Synchro':'';return(`${ev.level||''} ${ev.gender} ${al(ev.apparatus)}`+syn).replace(/\s+/g,' ').trim()};
// National Qualifier events run as a single combined list — no Prelim/Final round
// designation is ever shown on them (the event name already says "National Qualifier").
const evRound=ev=>ev.level==='National Qualifier'?'':(ev.round||'');
const shortDate=ds=>{const d=new Date(`${ds}T00:00:00`);return isNaN(d)?ds:d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})};
const fullDate=ds=>{const d=new Date(`${ds}T00:00:00`);return isNaN(d)?ds:d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})};
const toast=(msg,dur=2400)=>{const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur)};

// ── NEON ──────────────────────────────────────────────────────────────
let sync={ok:false,saving:false,err:null},saveTimer=null,lastSynced=null;
// Latches so a repeated conflict does not spam the user or the version table.
let _staleSaveNoticed=false;
// Record — in the SAVED state, not just in memory — the server-clock revision of the
// cloud copy this browser last agreed with, and clear the "has unpushed edits" flag.
//
// This has to survive a page refresh. `lastSynced` used to be a plain module variable
// that reset to null on every boot, and the poll in startSync() below is gated on
// `lastSynced && cloud > lastSynced` — so on a fresh page load that test could never
// pass and the app never re-read the cloud. It just kept running from whatever was in
// localStorage, and the next edit pushed that copy back up. Persisting the marker lets
// the very first poll after a refresh notice the cloud has moved on and pull it.
//
// Always a SERVER timestamp (Postgres now()), never the client clock — comparing the
// two is what clock skew breaks.
function markSynced(serverIso){
  // Neon hands back "2026-07-27 12:00:00+00" (space separator, 2-digit offset). Bare
  // new Date() on that is Invalid Date in Safari, and .toISOString() on an Invalid Date
  // throws — which would abort the caller mid-sync. parseNeonTimestamp normalizes it.
  const d=serverIso?parseNeonTimestamp(String(serverIso)):null;
  const iso=(d&&!isNaN(d.getTime()))?d.toISOString():new Date().toISOString();
  lastSynced=iso;
  S.lastSyncedAt=iso;
  S.dirty=false;
  try{localStorage.setItem(SK,JSON.stringify(S))}catch{}
}
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
    if(!NEON){const e=new Error('Config not loaded — data/config.js missing, blocked, or stale in cache');e._kind='network';console.error('[Neon] no connection string in USAD_CONFIG');throw e;}
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
    sync.ok=true;sync.err=null;_pollFailures=0;setSyncDot('ok');toast('Back online');
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
// Every real user edit funnels through here. Flag the local copy as carrying work the
// server has not confirmed yet, and persist that flag immediately so it survives a
// refresh — the poll in startSync() uses it to know it must not pull a remote copy
// over the top of unpushed edits. Deliberately NOT set by saveS(), which also runs for
// load-time data repairs (initUI's rulebook re-lock) that are not user edits.
function scheduleSave(){clearTimeout(saveTimer);S.dirty=true;try{localStorage.setItem(SK,JSON.stringify(S))}catch{}setSyncDot('saving');saveTimer=setTimeout(doSave,3000)}
async function doSave(){
  if(!S.currentLibraryId)return;
  try{
    // OPTIMISTIC CONCURRENCY. This used to be an unconditional upsert: whichever
    // browser wrote last replaced the whole schedule, plan and all. Any device
    // holding an older copy — including one whose only action was a run-sheet tap,
    // since those push the same blob — silently republished that older copy over
    // newer work from another device. That is the "schedule reverted to an old
    // version" report, and with two browsers open on a meet day it is easy to hit.
    //
    // Now a write only lands on the revision this browser last agreed with.
    //
    // The millisecond tolerance is load-bearing: Postgres keeps microseconds
    // (…13.216512+00) but markSynced stores a JS toISOString() that truncates to
    // milliseconds (…13.216Z). A plain `updated_at <= $8` is therefore FALSE against
    // the very row we just wrote, which would block every save. Verified against the
    // live row before shipping.
    const guard=lastSynced||null;
    const sql=guard
      ? `INSERT INTO schedule_builder.schedules(id,name,meet_type,year,publish_status,folder,data,updated_at)VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,now())ON CONFLICT(id)DO UPDATE SET name=EXCLUDED.name,meet_type=EXCLUDED.meet_type,publish_status=EXCLUDED.publish_status,folder=EXCLUDED.folder,data=EXCLUDED.data,updated_at=now() WHERE schedules.updated_at < ($8::timestamptz + interval '1 millisecond') RETURNING updated_at`
      : `INSERT INTO schedule_builder.schedules(id,name,meet_type,year,publish_status,folder,data,updated_at)VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,now())ON CONFLICT(id)DO UPDATE SET name=EXCLUDED.name,meet_type=EXCLUDED.meet_type,publish_status=EXCLUDED.publish_status,folder=EXCLUDED.folder,data=EXCLUDED.data,updated_at=now() RETURNING updated_at`;
    // The published schedule no longer carries the run sheet. Keeping actuals out
    // of this payload is what stops recording on the deck from ever rewriting the
    // plan, and it keeps this blob from growing all meet.
    const {live:_liveOmitted,...planOnly}=S;
    const args=[S.currentLibraryId,S.meet.name,S.meet.meetType,parseInt(S.meet.days[0]?.date)||2026,S.publishStatus||'draft',S.libraryFolder||null,JSON.stringify(planOnly)];
    if(guard)args.push(guard);
    const r=await nq(sql,args);

    if(!r.rows||!r.rows.length){
      // Somebody else moved the cloud copy since we last agreed with it. Do NOT
      // overwrite them. Keep what is on this screen in version history so it is
      // recoverable, then let this browser fall back in step with the cloud.
      let archived=true;
      if(!_staleSaveNoticed){
        _staleSaveNoticed=true;
        try{
          await archiveLocalVersion(S.currentLibraryId,'Not saved \u2014 another browser had newer changes');
          toast('Another device has newer changes, so this browser did not overwrite them. What was on this screen is saved in Version history.',9000);
        }catch(archErr){
          archived=false;
          console.error('Could not archive this browser\u2019s copy:',archErr&&archErr.message);
          toast('Another device has newer changes. This browser did not overwrite them, and could not reach Version history either \u2014 what is on screen exists only here, so do not close this tab until you have copied anything you need.',15000);
        }
      }
      if(archived){
        // Dropping the dirty flag is what stops the poll from "winning" with this
        // stale copy on its next cycle. Safe only because it is archived above.
        S.dirty=false;
        try{localStorage.setItem(SK,JSON.stringify(S))}catch{}
        const active=document.activeElement;
        const isTyping=active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
        if(!isTyping)await loadFromNeon(S.currentLibraryId,{silent:true});
      }
      // If the archive failed, the on-screen work is deliberately left exactly
      // where it is. Pulling the remote over it would be the one move that
      // actually loses it.
      setSyncDot(archived?'ok':'error');
      return;
    }
    _staleSaveNoticed=false;
    // Use the DATABASE's own timestamp for updated_at, not the client clock.
    // Comparing a client-clock lastSynced against a server-clock updated_at
    // is exactly the kind of thing clock skew / network latency breaks —
    // this was intermittently making the poll below mistake this save for
    // someone else's edit and silently reload mid-keystroke.
    markSynced(r.rows?.[0]?.[0]);
    sync.ok=true;sync.err=null;setSyncDot('ok');
  }catch(e){sync.err=e.message;setSyncDot('error')}
}
// Snapshot what is on THIS screen into version history — used when we decline to
// overwrite a newer cloud copy, so declining can never mean losing.
async function archiveLocalVersion(id,label){
  await nq(`INSERT INTO schedule_builder.schedule_versions(schedule_id,label,data,created_at)VALUES($1,$2,$3::jsonb,now())`,[id,label,JSON.stringify(S)]);
}
async function saveToNeon(name,folder){
  const id=S.currentLibraryId||uid();S.currentLibraryId=id;
  if(folder)S.libraryFolder=folder;
  setSyncDot('saving');
  try{
    const r=await nq(`INSERT INTO schedule_builder.schedules(id,name,meet_type,year,publish_status,folder,data,updated_at)VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,now())ON CONFLICT(id)DO UPDATE SET name=EXCLUDED.name,meet_type=EXCLUDED.meet_type,publish_status=EXCLUDED.publish_status,folder=EXCLUDED.folder,data=EXCLUDED.data,updated_at=now() RETURNING updated_at`,[id,name||S.meet.name,S.meet.meetType,parseInt(S.meet.days[0]?.date)||2026,S.publishStatus||'draft',S.libraryFolder||null,JSON.stringify(S)]);
    sync.ok=true;sync.err=null;saveS();markSynced(r.rows?.[0]?.[0]);setSyncDot('ok');startSync();saveVersion('Manual save').catch(e=>console.warn('Snapshot after save failed:',e&&e.message));
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
    normalizeAllDays(S);saveS();markSynced(rows[0][1]);
    // Actuals live in their own row. Fall back to whatever the blob carried for
    // schedules saved before the split, so nothing recorded is ever stranded.
    await loadRunSheet(id);
    if(!opts.silent){UI.modal=null;initUI();render();toast('Schedule loaded');}else render();return loaded;}
  catch(e){if(!opts.silent)toast('Could not load');return null}
}
let presT=null,pollT=null,_pollFailures=0,_conflictNoticed=false;
// Snapshot whatever is currently in the cloud into version history, WITHOUT loading it,
// so a copy we are about to overwrite is always recoverable from Version history.
async function startSync(){
  clearInterval(presT);clearTimeout(pollT);
  _pollFailures=0;
  presT=setInterval(()=>S.currentLibraryId&&nq(`INSERT INTO schedule_builder.presence(editor_id,schedule_id,updated_at)VALUES($1,$2,now())ON CONFLICT(editor_id)DO UPDATE SET schedule_id=EXCLUDED.schedule_id,updated_at=now()`,[EDITOR_ID,S.currentLibraryId]).catch(()=>{}),30000);
  // Poll for remote changes, backing off if Neon is unreachable
  const tick=async()=>{
    if(!S.currentLibraryId)return;
    try{
      const r=await nq(`SELECT s.updated_at, rs.updated_at FROM schedule_builder.schedules s LEFT JOIN schedule_builder.run_sheets rs ON rs.schedule_id=s.id WHERE s.id=$1`,[S.currentLibraryId]);
      const _remote=r.rows?.length?parseNeonTimestamp(String(r.rows[0][0])):null;
      // Another device recording on the deck. Small row, folded into the same
      // query so watching for it costs no extra round trip.
      const _remoteRun=r.rows?.length&&r.rows[0][1]?String(r.rows[0][1]):null;
      if(_remoteRun&&_remoteRun!==lastRunSheetSynced){
        if(_liveDirty)doSaveRunSheet().catch(()=>{});   // our taps are newer
        else await loadRunSheet(S.currentLibraryId);
      }
      if(_remote&&!isNaN(_remote.getTime())&&lastSynced&&_remote.toISOString()>lastSynced){
        // Safety net: never silently reload (and blow away in-progress,
        // not-yet-committed typing) while someone's actively in a text
        // field. If they are, skip this cycle — the next poll 8s later
        // will pick up the remote change once they've paused or blurred.
        const active=document.activeElement;
        const isTyping=active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
        if(!isTyping){
          if(S.dirty){
            // Both sides moved: this browser has edits that never reached the cloud
            // AND the cloud changed since we last agreed with it. doSave() owns this
            // now — its concurrency guard declines to overwrite, archives what is on
            // screen, and reports honestly. This used to archive the remote copy and
            // then claim the local one had been pushed, which stopped being true the
            // moment the guard went in.
            if(!_conflictNoticed){
              _conflictNoticed=true;
              await doSave();
            }
          }else{
            await loadFromNeon(S.currentLibraryId,{silent:true});
          }
        }
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
function mkInitial(){return{updatedAt:new Date().toISOString(),meet:{name:'New Schedule',venue:'Competition Pool',city:'',timezone:'America/New_York',meetType:'zone',divemeetsId:'',divemeetsSources:[],days:[mkDay(0),mkDay(1),mkDay(2),mkDay(3)]},sessions:[],publishStatus:'draft',currentLibraryId:'',acknowledgedWarnings:[],outputSettings:{showWarmup:true,showEndTimes:true,showSubjectToChange:true}}}
function loadS(){try{const r=JSON.parse(localStorage.getItem(SK)||'');if(r?.meet&&Array.isArray(r.sessions))return r}catch{}return mkInitial()}
function saveS(){S.updatedAt=new Date().toISOString();lastSavedAt=S.updatedAt;try{localStorage.setItem(SK,JSON.stringify(S))}catch{}}
let S=loadS();
// ── UNDO / REDO ──────────────────────────────────────────────────────
let undoStack=[],redoStack=[];const UNDO_MAX=50;
function snapshot(){return JSON.stringify(S)}
function pushUndo(){undoStack.push(snapshot());if(undoStack.length>UNDO_MAX)undoStack.shift();redoStack=[]}
// Undo/redo is for the PLAN. The run sheet is a record of things that physically
// happened and it lives in its own row in the cloud — rolling it back because
// somebody undid a schedule edit would delete times that were genuinely observed,
// and Cmd+Z right after approving would have wiped the very recordings that drove
// the approval. Carried across every restore.
function undo(){if(!undoStack.length){toast('Nothing to undo');return}const live=S.live;redoStack.push(snapshot());S=JSON.parse(undoStack.pop());if(live!==undefined)S.live=live;normalizeAllDays(S);saveS();if(S.currentLibraryId)scheduleSave();render();toast('Undone')}
function redo(){if(!redoStack.length){toast('Nothing to redo');return}const live=S.live;undoStack.push(snapshot());S=JSON.parse(redoStack.pop());if(live!==undefined)S.live=live;normalizeAllDays(S);saveS();if(S.currentLibraryId)scheduleSave();render();toast('Redone')}
// ── LOCKING ───────────────────────────────────────────────────────────
// Two switches, both saved with the schedule so a lock travels with the meet to every
// device and every member of staff:
//   S.locked   — the whole schedule: every day, the day list, and the meet details
//   day.locked — one single day
//
// A locked day is read-only. Times, blocks, events, entry counts, buffers, pool hours,
// drag-and-drop and deletions are all refused. Everything you do to READ the schedule
// still works: preview, coach handouts, printing, exports, presentation mode, the
// health panel, entries in view-only form.
//
// Locking is one tap. UNLOCKING always asks first, and that asymmetry is the whole
// point: on a phone the thing that quietly wrecks a published schedule is one stray
// tap, so an unlock that also took one tap would be exactly as easy to hit by accident
// as the edit it was supposed to prevent.
function meetLocked(){return !!S.locked}
function dayLocked(dayId){
  if(S.locked)return true;
  const d=((S.meet&&S.meet.days)||[]).find(x=>x.id===dayId);
  return !!(d&&d.locked);
}
function sessionLocked(sessId){
  const sess=(S.sessions||[]).find(x=>x.id===sessId);
  return sess?dayLocked(sess.dayId):meetLocked();
}
function anyLocked(){return !!(S.locked||((S.meet&&S.meet.days)||[]).some(d=>d.locked))}
function lockedDayCount(){
  const days=((S.meet&&S.meet.days)||[]);
  return S.locked?days.length:days.filter(d=>d.locked).length;
}
function lockedIdsOf(st){
  const days=((st.meet&&st.meet.days)||[]);
  return st.locked?days.map(d=>d.id):days.filter(d=>d.locked).map(d=>d.id);
}
// A fingerprint of exactly what a given set of locks protects. `locked` flags are
// normalised out of it so the lock toggles themselves are never seen as a violation.
function protectedFingerprint(st,ids,includeMeet){
  const days=((st.meet&&st.meet.days)||[]);
  const fp={};
  fp._meet=includeMeet?JSON.stringify({...st.meet,days:days.map(d=>({...d,locked:null}))}):'';
  ids.forEach(id=>{
    const d=days.find(x=>x.id===id)||{};
    fp[id]=JSON.stringify({
      date:d.date,openMinutes:d.openMinutes,closeMinutes:d.closeMinutes,eventTag:d.eventTag,
      sessions:(st.sessions||[]).filter(x=>x.dayId===id)
    });
  });
  return JSON.stringify(fp);
}
// Did a change touch anything the locks protected? Uses the lock set as it was BEFORE
// the change, so nothing can unlock a day and edit it in the same breath.
function lockViolation(before,after){
  const ids=lockedIdsOf(before);
  if(!ids.length)return false;
  const meet=!!before.locked;
  return protectedFingerprint(before,ids,meet)!==protectedFingerprint(after,ids,meet);
}
function lockRefused(){
  toast(S.locked
    ?'The whole schedule is locked. Tap the padlock in the top bar to unlock it.'
    :'This day is locked. Tap the padlock on the day toolbar to unlock it.',4200);
}
// Lock changes deliberately bypass the guard in upd() — they are the one thing a lock
// must not be able to block.
function applyLockChange(fn,msg){
  pushUndo();fn(S);saveS();if(S.currentLibraryId)scheduleSave();render();if(msg)toast(msg,3600);
}
function toggleMeetLock(){
  if(!S.locked){
    applyLockChange(s=>{s.locked=true},'Whole schedule locked \u2014 nothing can be changed until you unlock it');
    return;
  }
  askConfirm({
    title:'Unlock the whole schedule?',
    message:'Every day becomes editable again, including any day you locked on its own. Lock it back when you\u2019re done.',
    confirmText:'Unlock schedule',
    onConfirm:()=>applyLockChange(s=>{s.locked=false},'Schedule unlocked \u2014 changes are allowed again')
  });
}
function toggleDayLock(dayId){
  const day=((S.meet&&S.meet.days)||[]).find(d=>d.id===dayId);if(!day)return;
  if(S.locked){toast('The whole schedule is locked \u2014 unlock it in the top bar first',4200);return;}
  if(!day.locked){
    applyLockChange(s=>{const d=s.meet.days.find(x=>x.id===dayId);if(d)d.locked=true},
      fullDate(day.date)+' locked \u2014 nothing on this day can be changed');
    return;
  }
  askConfirm({
    title:'Unlock this day?',
    message:fullDate(day.date)+' becomes editable again.',
    confirmText:'Unlock day',
    onConfirm:()=>applyLockChange(s=>{const d=s.meet.days.find(x=>x.id===dayId);if(d)d.locked=false},
      fullDate(day.date)+' unlocked \u2014 changes are allowed again')
  });
}

// Every edit in the app funnels through here. When anything is locked, the change is
// applied and then checked: if it touched a locked day the WHOLE change is rolled back,
// including the undo entry it created. Guarding here rather than at each of the ~65 call
// sites means a locked day is safe from every existing path — drag-and-drop, delete,
// re-stack, copy-day, prefill, DiveMeets entry sync — and from any path added later.
function upd(fn){
  const guard=anyLocked()?snapshot():null;
  pushUndo();
  fn(S);
  if(guard){
    const before=JSON.parse(guard);
    if(lockViolation(before,S)){
      const _live=S.live;
      S=before;
      if(_live!==undefined)S.live=_live;
      undoStack.pop();
      render();lockRefused();
      return;
    }
  }
  saveS();if(S.currentLibraryId)scheduleSave();render();
}

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
  else if(mod&&(e.key==='k'||e.key==='K')){e.preventDefault();UI.palette?closePalette():openPalette()}
  else if(UI.present&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();const n=S.meet.days.length;UI.present.i=Math.max(0,Math.min(n-1,UI.present.i+(e.key==='ArrowRight'?1:-1)));render()}
  else if(e.key==='Escape'){
    if(UI.palette){closePalette()}
    else if(UI.present){UI.present=null;render()}
    else if(el&&inField){el.blur()}
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

// ── SPLIT PANEL ROTATIONS ─────────────────────────────────────────────
// Single source of truth for split-board judging panel rotations, by
// apparatus type / gender / age group. Used two ways:
//  1) splitPanelRot() prints the rotation text on the Operations report.
//  2) autoPanelChanges() counts the actual Panel A ↔ Panel B hand-offs in
//     that rotation, so toggling Split ON seeds a real panel-change count
//     (A/B/C springboard rotations = 3 hand-offs, Group D = 2) instead of 0.
const SPLIT_ROTS={sb:{Girls:{'Group A':{pA:'Rounds 1,2,3,6,7',pB:'Rounds 4,5,8,9'},'Group B':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7,8'},'Group C':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7'},'Group D':{pA:'Rounds 1,2,6',pB:'Rounds 3,4,5'}},Boys:{'Group A':{pA:'Rounds 1,2,3,7,8',pB:'Rounds 4,5,6,9,10'},'Group B':{pA:'Rounds 1,2,3,6,7',pB:'Rounds 4,5,8,9'},'Group C':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7,8'},'Group D':{pA:'Rounds 1,2,6',pB:'Rounds 3,4,5'}}},plat:{Girls:{'Group A':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7,8'},'Group B':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7'},'Group C':{pA:'Rounds 1,2,6',pB:'Rounds 3,4,5'},'Group D':{pA:'Rounds 1,2,6',pB:'Rounds 3,4,5'}},Boys:{'Group A':{pA:'Rounds 1,2,5,6,7',pB:'Rounds 3,4,8,9'},'Group B':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7,8'},'Group C':{pA:'Rounds 1,2,5,6',pB:'Rounds 3,4,7'},'Group D':{pA:'Rounds 1,2,6',pB:'Rounds 3,4,5'}}}};
function splitRotFor(ev){const type=isPlatform(ev.apparatus)?'plat':'sb';return SPLIT_ROTS[type]?.[ev.gender]?.[ev.level]||null}
// Count Panel A ↔ Panel B hand-offs in the event's published rotation.
// Falls back to 3 (the standard springboard rotation) for levels not in
// the table (Senior, National Qualifier, synchro, etc.).
function autoPanelChanges(ev){
  const r=splitRotFor(ev);
  if(!r)return 3;
  const seq=[];
  const add=(txt,p)=>{(String(txt).match(/\d+/g)||[]).forEach(n=>seq.push([Number(n),p]))};
  add(r.pA,'A');add(r.pB,'B');
  seq.sort((a,b)=>a[0]-b[0]);
  let changes=0;
  for(let i=1;i<seq.length;i++)if(seq[i][1]!==seq[i-1][1])changes++;
  return changes||3;
}
// Panel-change values to use when simulating (or turning on) a split, when
// the event doesn't already carry real values. 3 min per change matches
// every real USA Diving schedule seeded in this app.
function effPanelChanges(ev){return Number(ev.numberOfPanelChanges)||autoPanelChanges(ev)}
function effPanelMinutes(ev){return Number(ev.minutesPerPanelChange)||3}

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
// Operational "what if" reference for the split-boards print toggles: the event's duration
// under the OPPOSITE split setting from what's currently configured, using the same formula
// as calcEvDur() above. Does not touch ev.manualSplit and does not reflow the rest of the
// day — it's a side-by-side reference number for staff deciding whether to flip a board
// split, not a full recalculated schedule. Meaningless for Platform (never splits) and
// Finals (never split); callers gate on the same eligibility as the "Split boards" tag.
function altSplitEvDur(ev){
  const divers=Math.max(0,entryValue(ev));
  const dives=Math.max(0,Number(ev.numberOfDives||ev.defaultDives||0));
  const spd=Math.max(0,Number(ev.secondsPerDive||ev.defaultSpd||35));
  const raw=(divers*dives*spd)/60;
  const willSplit=!Boolean(ev.manualSplit);
  // When simulating "if split", include the panel-change overhead the split
  // would actually get (auto-derived from the rotation if not yet set) so the
  // what-if number isn't optimistically low.
  const panels=willSplit?effPanelChanges(ev)*effPanelMinutes(ev):0;
  return(willSplit?raw/2:raw)+panels;
}
function calcFlightTimes(sess){
  if(!sess.flights?.length)return[];
  let cur=Number(sess.warmupStartMinutes||0);
  return sess.flights.map(f=>{const dur=Number(f.durationMinutes||30);const s=cur;cur+=dur;return{...f,startMinutes:s,endMinutes:cur}});
}
// Every session's timing goes through here. The core does the work; the wrapper
// gives sb-broadcast.js a chance to append awards that an earlier block on the
// day handed over (see bcastAppendDeferredAwards).
function calcSessTiming(sess){
  const t=calcSessTimingCore(sess);
  return (typeof bcastAppendDeferredAwards==='function')?bcastAppendDeferredAwards(sess,t):t;
}
function calcSessTimingCore(sess){
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
  // BROADCAST CLOCK — authoritative. When a Senior finals session is switched to
  // broadcast timing, its run-of-show (intros, named commercial breaks, 45–60s per
  // diver, flash, ceremonies) IS the schedule. Everything downstream — this day's
  // later sessions, exports, the published schedule — reflows around it.
  if(typeof bcastTiming==='function'){const bt=bcastTiming(sess);if(bt)return bt;}

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
// Blocks sort by start time. When two start at the same minute the one that RUNS
// ALONGSIDE comes second, so it always reads as attached to its partner above it.
function sessSortCmp(a,b){const d=Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes);if(d)return d;return (a.parallel?1:0)-(b.parallel?1:0);}
function allTimed(){return S.meet.days.flatMap(day=>S.sessions.filter(s=>s.dayId===day.id).sort(sessSortCmp).map(s=>({...s,timing:calcSessTiming(s)})))}
function sessForDay(dayId){return S.sessions.filter(s=>s.dayId===dayId).sort(sessSortCmp)}
function timedForDay(dayId){return allTimed().filter(s=>s.dayId===dayId)}
function getSessNum(sess,timed){if(sess.isPractice)return null;let n=1;for(const s of timed){if(s.isPractice)continue;if(s.id===sess.id)return n;n++;}return n}
function buildWarnings(dayId){
  // Blocks deliberately set to run at the same time are excluded — their overlap
  // is the point, not a mistake.
  const sessions=timedForDay(dayId).filter(s=>!s.isPractice&&!isParallel(s));const warns=[];
  for(let i=0;i<sessions.length-1;i++){const a=sessions[i],b=sessions[i+1];if(a.timing.sessionEndMinutes>b.timing.warmupStartMinutes){warns.push({key:`ov-${a.id}-${b.id}`,sessId:a.id,msg:`Session ends at ${f12(a.timing.sessionEndMinutes)} but next warm-up starts ${f12(b.timing.warmupStartMinutes)}`});}}
  return warns.filter(w=>!(S.acknowledgedWarnings||[]).includes(w.key));
}

// ── CONFLICT DETECTION (comprehensive) ────────────────────────────────
function detectConflicts(){
  const issues=[];
  ensureProjDataLoaded(); // athlete-aware checks activate once the projected field arrives
  ensureEntrantsLoaded(); // secondary "how many have actually registered" figure for flight counts
  const timed=allTimed();
  S.meet.days.forEach(day=>{
    const sessions=timed.filter(s=>s.dayId===day.id).sort((a,b)=>a.timing.warmupStartMinutes-b.timing.warmupStartMinutes);
    // The day's straight stack, with side-by-side blocks removed. Those overlap on
    // purpose, so they must not be reported as scheduling errors.
    const stack=sessions.filter(s=>!isParallel(s));
    const dayLabel=shortDate(day.date);
    const openM=Number(day.openMinutes||420),closeM=Number(day.closeMinutes||1200);
    // Blocks running at the same time: listed for visibility, plus a real warning
    // if one runs past the block it is supposed to be sharing the facility with.
    sessions.filter(s=>isParallel(s)).forEach(p=>{
      const pn=sessLabelOf(p,timed);
      const anchor=p.parallelWith?sessions.find(x=>x.id===p.parallelWith):null;
      if(anchor){
        issues.push({sev:'info',title:'Runs at the same time (on purpose)',detail:`${pn} (${f12(p.timing.warmupStartMinutes)}–${f12(p.timing.sessionEndMinutes)}) shares the facility with ${sessLabelOf(anchor,timed)} — it does not take its own time in the day`,loc:dayLabel,fixSessId:p.id,dayId:day.id,fixHint:'edit'});
        if(p.timing.sessionEndMinutes>anchor.timing.sessionEndMinutes)
          issues.push({sev:'warn',title:'Side-by-side block runs longer than its partner',detail:`${pn} ends ${f12(p.timing.sessionEndMinutes)} but ${sessLabelOf(anchor,timed)} ends ${f12(anchor.timing.sessionEndMinutes)} — it will spill into whatever comes next`,loc:dayLabel,fixSessId:p.id,dayId:day.id,fixHint:'edit'});
      }else{
        issues.push({sev:'info',title:'Runs alongside at a fixed time',detail:`${pn} (${f12(p.timing.warmupStartMinutes)}–${f12(p.timing.sessionEndMinutes)}) is not paired with another block — it stays at this exact time no matter how the day shifts`,loc:dayLabel,fixSessId:p.id,dayId:day.id,fixHint:'edit'});
      }
    });
    // Overlaps between sessions — fix points at the LATER session (adjust its start/buffer)
    for(let i=0;i<stack.length-1;i++){
      const a=stack[i],b=stack[i+1];
      if(a.timing.sessionEndMinutes>b.timing.warmupStartMinutes){
        const an=a.isPractice?(a.title||'Open Training'):'Session '+getSessNum(a,timed);
        const bn=b.isPractice?(b.title||'Open Training'):'Session '+getSessNum(b,timed);
        // Athlete-aware enrichment (advisory): name the actual divers caught in both
        let athleteNote='';
        if(UI.projRows&&!a.isPractice&&!b.isPractice){
          const shared=sharedAthletes(a,b);
          if(shared.length)athleteNote=` — ${shared.length} of the same projected divers are in both (${nameList(shared,4)})`;
        }
        issues.push({sev:'err',title:'Sessions overlap',detail:`${an} ends ${f12(a.timing.sessionEndMinutes)} but ${bn} starts ${f12(b.timing.warmupStartMinutes)}${athleteNote}`,loc:dayLabel,fixSessId:b.id,dayId:day.id,fixHint:'autoSpace',autoData:{prevId:a.id,nextId:b.id}});
      }
    }
    // Athlete rest windows (advisory, projected field): consecutive competition
    // sessions whose gap is under REST_MIN and which share actual divers.
    if(UI.projRows){
      const comp=stack.filter(s=>!s.isPractice);
      for(let i=0;i<comp.length-1;i++){
        const a=comp[i],b=comp[i+1];
        const rest=b.timing.warmupStartMinutes-a.timing.sessionEndMinutes;
        if(rest>=0&&rest<REST_MIN_DEFAULT){
          const shared=sharedAthletes(a,b);
          if(shared.length){
            const an='Session '+getSessNum(a,timed),bn='Session '+getSessNum(b,timed);
            issues.push({sev:'warn',title:'Tight turnaround for divers in back-to-back sessions',detail:`${shared.length} projected diver${shared.length===1?'':'s'} finish ${an} and start ${bn} warm-up only ${fdur(Math.max(0,rest))} later (${nameList(shared,4)})`,loc:dayLabel,fixSessId:b.id,dayId:day.id,fixHint:'edit'});
          }
        }
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
        // DIVING-SMART: same group/gender needed on two boards at once. Different
        // apparatus running in parallel is normal — but not when it's the SAME
        // athletes. (Same-apparatus overlap is already caught above.)
        const evsAll=s.timing.events||[];
        for(let i=0;i<evsAll.length-1;i++){
          for(let j=i+1;j<evsAll.length;j++){
            const a2=evsAll[i],b2=evsAll[j];
            if(a2.level!==b2.level||a2.gender!==b2.gender)continue;
            if(lk(a2.apparatus)===lk(b2.apparatus))continue; // already flagged above
            if(a2.eventStartMinutes<b2.eventEndMinutes&&b2.eventStartMinutes<a2.eventEndMinutes){
              issues.push({sev:'err',title:'Same divers on two boards',detail:`${sn}: ${evName(a2)} and ${evName(b2)} overlap — ${a2.level} ${a2.gender} can't compete on two boards at once`,loc:dayLabel,fixSessId:s.id,dayId:day.id,fixHint:'edit'});
            }
          }
        }
        // DIVING-SMART: warm-up window vs field size. Below ~30 seconds of board
        // time per diver the warm-up is genuinely tight; only flag real fields.
        const totalDivers=s.events.reduce((n2,e2)=>n2+entryValue(e2),0);
        const wu=Number(s.warmupMinutes||0);
        if(totalDivers>=20&&wu>0&&wu/totalDivers<0.5){
          const secEach=Math.round(wu*60/totalDivers);
          const suggest=Math.ceil((totalDivers*0.5)/5)*5;
          issues.push({sev:'warn',title:'Warm-up may be tight',detail:`${sn}: ${totalDivers} divers share ${wu} min of warm-up — about ${secEach} sec each. Consider ${suggest} min or splitting the session.`,loc:dayLabel,fixSessId:s.id,dayId:day.id,fixHint:'edit'});
        }
      }
    });
  });
  // DIVING-SMART: a Final scheduled before its Prelim has finished (meet-wide,
  // cross-day aware). Finalists can't warm up for a final while the prelim
  // that decides the field is still running — or worse, hasn't happened yet.
  {
    const dayOrder={};S.meet.days.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0).forEach((d,i)=>dayOrder[d.id]=i);
    const finals=[],prelims=[];
    timed.forEach(s=>{
      if(s.isPractice)return;
      (s.timing.events||[]).forEach(ev=>{
        const rec={key:`${ev.level}|${ev.gender}|${ev.apparatus}`,ev,s};
        if(ev.round==='Final')finals.push(rec);
        else if(ev.round==='Prelim'||ev.round==='Semifinal')prelims.push(rec);
      });
    });
    finals.forEach(f=>{
      const matches=prelims.filter(p=>p.key===f.key);
      if(!matches.length)return;
      // Compare against the LATEST qualifying round for that event
      const abs=(sess,min)=>dayOrder[sess.dayId]*10000+min;
      const latest=matches.reduce((m,p)=>abs(p.s,p.ev.eventEndMinutes)>abs(m.s,m.ev.eventEndMinutes)?p:m,matches[0]);
      const fStart=abs(f.s,f.s.timing.warmupStartMinutes);
      const pEnd=abs(latest.s,latest.ev.eventEndMinutes);
      if(fStart<pEnd){
        const fn=`Session ${getSessNum(f.s,timed)}`;
        const sameDay=f.s.dayId===latest.s.dayId;
        issues.push({sev:'err',title:'Final starts before its prelim ends',detail:`${evName(f.ev)} Final (${fn}) warm-up starts ${sameDay?f12(f.s.timing.warmupStartMinutes):shortDate(S.meet.days.find(d=>d.id===f.s.dayId)?.date)+' '+f12(f.s.timing.warmupStartMinutes)}, but the ${latest.ev.round.toLowerCase()} doesn't finish until ${sameDay?f12(latest.ev.eventEndMinutes):shortDate(S.meet.days.find(d=>d.id===latest.s.dayId)?.date)+' '+f12(latest.ev.eventEndMinutes)}`,loc:shortDate(S.meet.days.find(d=>d.id===f.s.dayId)?.date||''),fixSessId:f.s.id,dayId:f.s.dayId,fixHint:'edit'});
      }
    });
  }
  // "Advancing in" cannot exceed the field it advances FROM. The top 12 of a
  // National Qualifier event move into the matching Senior prelim — but a tower
  // qualifier with 6 entered can only ever send 6. Nothing is changed
  // automatically: the correct number is a rules call, not something to infer.
  (function(){
    const quals=[];
    (S.sessions||[]).forEach(sess=>(sess.events||[]).forEach(ev=>{
      if(ev.round==='Qualifier'&&ev.style!=='Synchronized')quals.push(ev);
    }));
    if(!quals.length)return;
    (S.sessions||[]).forEach(sess=>{
      if(sess.isPractice)return;
      (sess.events||[]).forEach(ev=>{
        const adv=advanceInValue(ev);
        if(!adv||!canAdvanceIn(ev)||ev.round!=='Prelim')return;
        const q=quals.find(x=>x.gender===ev.gender&&sameApparatus(x.apparatus,ev.apparatus));
        if(!q)return;
        const typed=advanceInTyped(ev);
        const field=qualifierFieldSize(q);
        if(field>0&&typed>field){
          const day=(S.meet.days||[]).find(d=>d.id===sess.dayId);
          issues.push({sev:'info',
            title:'Advancing in adjusted to the qualifier field',
            detail:`${evName(ev)} is set to take the top ${typed}, but ${evName(q)} has only ${field} entered, so ${field} ${field===1?'is':'are'} being used. Nothing to do — if more enter the qualifier this lifts by itself.`,
            loc:day?shortDate(day.date):'',fixSessId:sess.id,dayId:sess.dayId,fixHint:'edit'});
        }
      });
    });
  })();
  return issues;
}
// Open the right place to fix a given conflict, then act

// Clear session overlaps on a day by pushing DOWN only.
//
// This exists because reflowDay() is the wrong tool for the job. reflowDay is the
// RE-STACK primitive: it walks the day from the top and slams every block onto
// "previous end + buffer", which is exactly what you want from the "Re-stack
// times" button and exactly what you do NOT want from a one-click overlap fix.
// On a day whose start times have been moved by an approved run-sheet delay,
// re-stacking recomputes every block from durations alone and throws the
// approval away — the schedule visibly snaps back to its pre-delay times, which
// reads as "clicking Fix reverted my schedule". It did.
//
// This moves a colliding block later by the minimum needed and carries that push
// down the day only where it creates a further collision. Nothing ever moves
// EARLIER, deliberate gaps survive untouched, and an approved delay stays
// approved. It is idempotent: run it twice and the second run moves nothing.
function clearOverlaps(stateSnap,dayId){
  const day=stateSnap.meet.days.find(x=>x.id===dayId);
  const dayOpen=day&&day.openMinutes!=null?Number(day.openMinutes):0;
  const stack=(stateSnap.sessions||[]).filter(s=>s.dayId===dayId&&!isParallel(s))
    .sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  let moved=0;
  for(let i=1;i<stack.length;i++){
    const prev=stack[i-1];
    const t=calcSessTimingFromObj(prev);
    const min=Math.max(ruUp(t.sessionEndMinutes+Number(prev.bufferMinutes||0),5),dayOpen);
    if((Number(stack[i].warmupStartMinutes)||0)<min){stack[i].warmupStartMinutes=min;moved++;}
  }
  positionParallels(stateSnap,dayId);
  return moved;
}

// Fix a card's inline overlap warning by pushing the colliding block later —
// never by re-stacking the day.
function resolveCardWarning(sessId){
  const sess=S.sessions.find(x=>x.id===sessId);if(!sess)return;
  if(dayLocked(sess.dayId)){lockRefused();return;}
  let moved=0;
  upd(s=>{moved=clearOverlaps(s,sess.dayId);});
  toast(moved?`Spacing fixed — ${moved} block${moved===1?'':'s'} moved later. Nothing else on the day changed.`:'Nothing was overlapping');
}

function resolveConflict(idx){
  const conflicts=detectConflicts();
  const c=conflicts[idx];if(!c)return;
  closeModal();
  // Switch to the day the issue is on
  if(c.dayId)UI.dayId=c.dayId;
  if(c.fixHint==='autoSpace'&&c.autoData){
    // Push the colliding block later by the minimum needed. Deliberately NOT
    // reflowDay() — see clearOverlaps() for why re-stacking here wipes out an
    // approved run-sheet delay and looks like the schedule reverting.
    if(dayLocked(c.dayId)){lockRefused();return;}
    let moved=0;
    upd(s=>{moved=clearOverlaps(s,c.dayId);});
    toast(moved?`Spacing fixed — ${moved} block${moved===1?'':'s'} moved later. Nothing else on the day changed.`:'Nothing was overlapping');
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
  // Junior synchro — Group A/B (14-18) combined bracket, contested on 3-Meter
  // and Platform as straight finals at Junior Nationals
  if(def.jrSynchro){for(const gender of['Girls','Boys']){for(const app of['3m','Platform']){evs.push({id:`junior-14-18-${gender}-${app}-synchro`.toLowerCase(),level:'Junior 14-18',gender,apparatus:app,style:'Synchronized',defaultDives:5,defaultSpd:isPlatform(app)?45:35,rounds:['Final'],alias:'Group A/B 14-18 Synchronized Synchro'});}}}
  // Senior synchro — 3-Meter and 10-Meter, prelim + final
  if(def.srSynchro){for(const gender of['Women','Men']){for(const app of['3m','10m']){evs.push({id:`senior-synchro-${gender}-${app}`.toLowerCase(),level:'Senior Synchro',gender,apparatus:app,style:'Synchronized',defaultDives:gender==='Women'?5:6,defaultSpd:isPlatform(app)?45:35,rounds:['Prelim','Final'],alias:'Synchronized'});}}}
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
  showFlightCounts:true,timeScale:false,addDayTemplateId:null,
  genScopes:[],
};
function initUI(){
  if(S.meet.days.length&&!UI.dayId)UI.dayId=S.meet.days[0].id;
  // NOTE: there used to be a force-off loop here that set awardsEnabled=false
  // on every session. Because initUI() runs at the top of EVERY render(), that
  // made the per-session Awards toggle impossible to turn on — the very next
  // render (triggered by the toggle click itself) wiped it back off. Removed:
  // awards default off on new sessions anyway (see addSession/addBlock), and a
  // user's explicit per-session choice must stick and persist.
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
function openEdit(sessId){UI.editSessId=sessId;UI.entriesOpen=false;UI.previewOpen=false;render()}
function closeEdit(){UI.editSessId=null;render()}
// Live editing: while typing in the block editor, changes apply after a short
// pause (debounced) so the timeline reflows in real time behind the dialog.
// Guards: skip empty/partial values (a half-typed time would otherwise fling
// the block to midnight); focus + caret restore in render() keeps typing
// uninterrupted for inputs with ids.
document.addEventListener('click',e=>{
  if(UI.barMenu&&!e.target.closest('.bar-menu-wrap')){UI.barMenu=false;render();}
});
let _liveTimer=null;
document.addEventListener('input',e=>{
  const el=e.target;
  if(!el||!el.matches||!el.matches('[data-edit-body] input'))return;
  if(!el.id)return; // no id → focus can't be restored after render; wait for change/blur
  if(el.type==='time'&&!el.value)return;
  if(el.type==='number'&&(el.value===''||isNaN(Number(el.value))))return;
  clearTimeout(_liveTimer);
  _liveTimer=setTimeout(()=>{try{el.dispatchEvent(new Event('change'))}catch(err){}},650);
});
function openEntries(){UI.entriesOpen=true;UI.editSessId=null;UI.entriesDayId=UI.dayId;UI.entriesExpanded=[];render()}
function closeEntries(){if(_entryDirty)commitEntries();UI.entriesOpen=false;render()}
function selectDay(id){UI.dayId=id;UI.editSessId=null;render()}
function toggleEntriesSess(id){const i=UI.entriesExpanded.indexOf(id);if(i>=0)UI.entriesExpanded.splice(i,1);else UI.entriesExpanded.push(id);render()}

// ── MUTATIONS ─────────────────────────────────────────────────────────
// Add-day flow: instead of blindly appending a day at the end, open a small
// dialog to choose WHERE the day goes (start or end of the meet) and WHICH
// date it is — e.g. adding a practice day before the meet begins. The date
// pre-fills sensibly (day before the first / day after the last) and stays
// editable for gaps or non-adjacent dates. Days are kept in date order.
function addDay(){
  UI.addDayPos='end';
  UI.addDayDate=suggestedAddDayDate('end');
  UI.addDayEventTag=UI.addDayEventTag||'';
  UI.modal='add-day';
  render();
}
function suggestedAddDayDate(pos){
  const days=S.meet.days;
  if(!days.length)return new Date().toISOString().slice(0,10);
  const ref=pos==='start'?days[0]:days[days.length-1];
  const d=new Date(`${ref.date}T00:00:00`);
  d.setDate(d.getDate()+(pos==='start'?-1:1));
  return d.toISOString().slice(0,10);
}
function setAddDayPos(pos){UI.addDayPos=pos;UI.addDayDate=suggestedAddDayDate(pos);render();}
function executeAddDay(){
  const pos=UI.addDayPos||'end';
  const inp=document.getElementById('add-day-date');
  const date=(inp&&inp.value)||UI.addDayDate||suggestedAddDayDate(pos);
  const tpl=UI.addDayTemplateId?loadDayTemplates().find(t=>t.id===UI.addDayTemplateId):null;
  const eventTag=UI.addDayEventTag||'';
  upd(s=>{
    const day={id:uid(),date,openMinutes:390,closeMinutes:1200,eventTag};
    if(pos==='start')s.meet.days.unshift(day);else s.meet.days.push(day);
    // Keep the day bar chronological no matter what date was picked
    s.meet.days.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
    if(tpl)stampTemplateOntoDay(s,tpl,day.id);
    if(eventTag)s.sessions.forEach(x=>{if(x.dayId===day.id&&!sessTags(x).length){x.eventTags=[eventTag];delete x.eventTag;}});
    UI.dayId=day.id;
  });
  UI.modal=null;UI.addDayTemplateId=null;UI.addDayEventTag=null;
  toast(tpl?`Day added from "${tpl.name}" — ${tpl.sessions.length} block${tpl.sessions.length===1?'':'s'} stamped in`:'Day added — now building '+shortDate(date));
}
function renderAddDayModal(){
  const days=S.meet.days;
  const first=days[0],last=days[days.length-1];
  const pos=UI.addDayPos||'end';
  const date=UI.addDayDate||suggestedAddDayDate(pos);
  const tpls=loadDayTemplates();
  const tag=UI.addDayEventTag||'';
  const eventChips=`
      <label class="fl" style="margin-top:14px">Which event? <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">(new blocks on this day default to it — still editable per block)</span></label>
      <div class="chiprow" style="margin-bottom:14px"><button class="chip ${!tag?'on':''}" onclick="UI.addDayEventTag='';render()" title="Shared — appears in every event's schedule">Shared</button>${EVENT_TAGS.map(t=>`<button class="chip ${tag===t.k?'on':''}" onclick="UI.addDayEventTag='${t.k}';render()">${t.l}</button>`).join('')}</div>`;
  const tplChips=tpls.length?`
      <label class="fl" style="margin-top:14px">Start from a template <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">(optional)</span></label>
      <div style="display:flex;flex-direction:column;gap:5px">
        <button class="move-btn ${!UI.addDayTemplateId?'active':''}" onclick="UI.addDayTemplateId=null;render()">Empty day</button>
        ${tpls.map(t=>`<div style="display:flex;gap:5px;align-items:stretch"><button class="move-btn ${UI.addDayTemplateId===t.id?'active':''}" style="flex:1" onclick="UI.addDayTemplateId='${t.id}';render()">${esc(t.name)} <span class="move-meta">${t.sessions.length} block${t.sessions.length===1?'':'s'}</span></button><button class="tl-iconbtn" style="height:auto" aria-label="Delete template" title="Delete template" onclick="deleteDayTemplate('${t.id}')">×</button></div>`).join('')}
      </div>`:'';
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><div><span class="modal-title">Add a day</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">e.g. a practice day before the meet starts</div></div><button class="modal-close" aria-label="Close" onclick="UI.modal=null;UI.addDayTemplateId=null;UI.addDayEventTag=null;render()">×</button></div>
    <div class="modal-body">
      <label class="fl">Where</label>
      <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:14px">
        <button class="move-btn ${pos==='start'?'active':''}" onclick="setAddDayPos('start')">Before the first day${first?` <span class="move-meta">currently ${shortDate(first.date)}</span>`:''}</button>
        <button class="move-btn ${pos==='end'?'active':''}" onclick="setAddDayPos('end')">After the last day${last?` <span class="move-meta">currently ${shortDate(last.date)}</span>`:''}</button>
      </div>
      <label class="fl">Date</label>
      <input id="add-day-date" class="fi" type="date" value="${date}" onchange="UI.addDayDate=this.value"/>
      <p style="font-size:11px;color:var(--tx3);margin-top:8px">Pre-filled with the ${pos==='start'?'day before':'day after'} — change it if you need a gap.</p>
      ${eventChips}
      ${tplChips}
    </div>
    <div class="modal-foot"><button class="btn btn-sm" onclick="UI.modal=null;UI.addDayTemplateId=null;UI.addDayEventTag=null;render()">Cancel</button><button class="btn btn-sm btn-p" onclick="executeAddDay()">Add day</button></div>
  </div>`;
}
function addSession(dayId,isPractice){
  const existing=timedForDay(dayId);const lastEnd=existing.reduce((m,s)=>Math.max(m,s.timing?.sessionEndMinutes||Number(s.warmupStartMinutes)),390);const start=ru(lastEnd+(existing.length?5:0),5);
  // Practice/training blocks (Open Training, Flighted Warm-Ups, etc.) default to NO buffer —
  // these blocks routinely run back-to-back with no gap needed. Competition sessions keep
  // the standard 5-minute buffer default.
  const day=S.meet.days.find(d=>d.id===dayId);
  const sess={id:uid(),dayId,warmupStartMinutes:start,warmupMinutes:55,rounding:5,introMinutes:0,bufferMinutes:isPractice?0:5,awardsEnabled:false,isPractice:!!isPractice,title:isPractice?'Open Training':'',eventTags:day&&day.eventTag?[day.eventTag]:[],flights:[],events:isPractice?[{id:uid(),style:'Custom Block',customLabel:'Open Training',customDurationMinutes:90,apparatus:'Pool',gender:'Open',level:'Schedule',numberOfDivers:0,numberOfDives:0,secondsPerDive:0,defaultSpd:0,defaultDives:0,manualSplit:false,numberOfPanelChanges:0,minutesPerPanelChange:0,notes:''}]:[]};
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
  cce:{title:'CCE Meeting',label:'CCE Meeting',duration:60,internal:true}, // staff-only: never printed on public outputs
};
function addPracticeBlock(dayId,presetKey){
  const preset=PRACTICE_PRESETS[presetKey];
  if(!preset){addSession(dayId,true);return;} // 'custom' falls back to the generic block for full manual control
  const existing=timedForDay(dayId);const lastEnd=existing.reduce((m,s)=>Math.max(m,s.timing?.sessionEndMinutes||Number(s.warmupStartMinutes)),390);const start=ru(lastEnd+(existing.length?5:0),5);
  const day=S.meet.days.find(d=>d.id===dayId);
  const isMeeting=presetKey==='technical'||presetKey==='cce';
  const sess={id:uid(),dayId,warmupStartMinutes:start,warmupMinutes:isMeeting?0:55,rounding:5,introMinutes:0,bufferMinutes:0,awardsEnabled:false,isPractice:true,title:preset.title,hideFromPublic:Boolean(preset.internal),eventTags:day&&day.eventTag?[day.eventTag]:[],flights:[],events:[{id:uid(),style:'Custom Block',customLabel:preset.label,customDurationMinutes:preset.duration,apparatus:'Pool',gender:'Open',level:'Schedule',numberOfDivers:0,numberOfDives:0,secondsPerDive:0,defaultSpd:0,defaultDives:0,manualSplit:false,numberOfPanelChanges:0,minutesPerPanelChange:0,notes:preset.label}]};
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
    // On a block that runs at the same time as another, typing a start time means
    // "start this many minutes into my partner" — store it as an offset so the two
    // keep their relationship when the day shifts.
    if(field==='warmupStartMinutes'&&isParallel(sess)){
      const a=parallelAnchorOf(s,sess);
      if(a)sess.parallelOffset=Math.max(0,Number(value)-Number(a.warmupStartMinutes||0));
    }
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
// ── FACILITY HOURS ────────────────────────────────────────────────────
// When the pool actually opens and closes on a given day. Three things read it:
// the auto-stacker won't start a block before opening time, "fit to facility
// close" blocks end exactly at closing time, and the health check flags anything
// scheduled outside the window. Defaults are 6:30 AM - 8:00 PM.
function dayOpenFor(dayId){const d=(S.meet.days||[]).find(x=>x.id===dayId);return d&&d.openMinutes!=null?Number(d.openMinutes):390;}
function dayCloseFor(dayId){const d=(S.meet.days||[]).find(x=>x.id===dayId);return d&&d.closeMinutes!=null?Number(d.closeMinutes):1200;}
function setDayOpen(dayId,mins){upd(s=>{const d=s.meet.days.find(x=>x.id===dayId);if(d){d.openMinutes=Number(mins);}reflowDay(s,dayId);});}
function setDayClose(dayId,mins){upd(s=>{const d=s.meet.days.find(x=>x.id===dayId);if(d){d.closeMinutes=Number(mins);}reflowDay(s,dayId);});}
// How many blocks on this day sit outside the facility window right now.
function blocksOutsideHours(dayId){
  const open=dayOpenFor(dayId),close=dayCloseFor(dayId);
  return timedForDay(dayId).filter(s=>s.timing.warmupStartMinutes<open||s.timing.sessionEndMinutes>close).length;
}
function openFacilityHours(dayId){
  if(dayLocked(dayId)){lockRefused();return;}UI.modal='facility-hours';UI.hoursDayId=dayId||UI.dayId;render();}
// Copy this day's hours onto every other day — venues rarely change their hours
// mid-meet, so setting them once and stamping them across is the common case.
function applyHoursToAllDays(dayId){
  const open=dayOpenFor(dayId),close=dayCloseFor(dayId);
  const others=(S.meet.days||[]).filter(d=>d.id!==dayId).length;
  if(!others){toast('This is the only day');return;}
  askConfirm({
    title:'Use these hours every day?',
    message:`All ${others} other day${others===1?'':'s'} will be set to ${f12(open)} - ${f12(close)}. You can undo with Cmd+Z.`,
    confirmText:'Apply to all days',
    onConfirm:()=>{
      upd(s=>{s.meet.days.forEach(d=>{d.openMinutes=open;d.closeMinutes=close;reflowDay(s,d.id);});});
      toast(`Facility hours set on all ${others+1} days`);
    }
  });
}
function toggleFitToClose(sessId){upd(s=>{const sess=s.sessions.find(x=>x.id===sessId);if(sess){sess.fitToClose=!sess.fitToClose;}reflowDay(s,sess.dayId);});}
// Internal-only blocks stay on the working schedule and Operations output but are
// excluded from Public / Athletes / Judges outputs (e.g. staff meetings like CCE).
function toggleHideFromPublic(sessId){upd(s=>{const sess=s.sessions.find(x=>x.id===sessId);if(sess)sess.hideFromPublic=!sess.hideFromPublic;});toast(S.sessions.find(x=>x.id===sessId)?.hideFromPublic?'Internal only — this block will not appear on the public schedule':'This block will now appear on the public schedule');}


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

// ── BLOCKS THAT RUN AT THE SAME TIME (side-by-side blocks) ──────────────
// Normally a day is one straight stack: every block starts when the one above
// it ends. Some things genuinely share the facility, though — an NCAA coaches
// meeting on the deck while open training keeps running in the pool. Marking a
// block "runs at the same time" lifts it OUT of that stack: it no longer pushes
// anything later, and nothing pushes it. Instead it is pinned to a partner block
// at a fixed offset, so if the day shifts the two travel together.
//
//   sess.parallel        true  → this block runs alongside, doesn't take a slot
//   sess.parallelWith    id of the partner block it is pinned to (same day)
//   sess.parallelOffset  minutes after the partner starts (0 = same moment)
//
// A block with parallel:true but no valid partner simply floats at its own
// fixed clock time — still outside the stack, just not following anything.
function isParallel(sess){return Boolean(sess&&sess.parallel);}
function parallelAnchorOf(stateSnap,sess){
  if(!isParallel(sess)||!sess.parallelWith)return null;
  const a=(stateSnap.sessions||[]).find(x=>x.id===sess.parallelWith);
  if(!a||a.id===sess.id||a.dayId!==sess.dayId)return null;
  return a;
}
// Would pinning `sess` to `candidate` create a loop (A follows B follows A)?
function parallelWouldLoop(stateSnap,sessId,candidateId){
  let cur=(stateSnap.sessions||[]).find(x=>x.id===candidateId);
  for(let hops=0;cur&&hops<50;hops++){
    if(cur.id===sessId)return true;
    if(!cur.parallel||!cur.parallelWith)return false;
    cur=(stateSnap.sessions||[]).find(x=>x.id===cur.parallelWith);
  }
  return false;
}
// Snap every alongside block on a day to partnerStart + offset. Resolved in
// repeated passes so a block pinned to another alongside block still lands right;
// the pass cap keeps any accidental loop from spinning.
function positionParallels(stateSnap,dayId){
  const par=(stateSnap.sessions||[]).filter(s=>s.dayId===dayId&&isParallel(s));
  if(!par.length)return;
  // A partner that was deleted or moved to another day is dropped, and the block
  // floats at its own time rather than silently jumping back into the stack.
  par.forEach(p=>{if(p.parallelWith&&!parallelAnchorOf(stateSnap,p))p.parallelWith=null;});
  for(let pass=0;pass<=par.length;pass++){
    let moved=false;
    par.forEach(p=>{
      const a=parallelAnchorOf(stateSnap,p);
      if(!a)return;
      const want=Number(a.warmupStartMinutes||0)+Number(p.parallelOffset||0);
      if(Number(p.warmupStartMinutes)!==want){p.warmupStartMinutes=want;moved=true;}
    });
    if(!moved)break;
  }
}
// Human label for a block, used in the "same time as ..." wording everywhere.
function sessLabelOf(sess,timed){
  if(!sess)return 'another block';
  if(sess.isPractice)return sess.title||'Open Training';
  const n=getSessNum(sess,timed||allTimed());
  return 'Session '+(n||'');
}
// Turn "runs at the same time" on or off for one block.
// Turning it ON pairs the block with whatever WOULD have come next in the day —
// that is the block it was stealing time from — so the day closes up and the two
// overlap immediately. Mike can pick a different partner in the editor.
function toggleParallel(sessId){
  let msg='';
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    if(isParallel(sess)){
      sess.parallel=false;sess.parallelWith=null;sess.parallelOffset=0;
      msg='Back in the day\u2019s normal order \u2014 this block takes its own time again';
    }else{
      const start=Number(sess.warmupStartMinutes||0);
      const stack=s.sessions.filter(x=>x.dayId===sess.dayId&&x.id!==sess.id&&!isParallel(x))
        .sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
      const next=stack.find(x=>Number(x.warmupStartMinutes)>=start);
      const prev=stack.slice().reverse().find(x=>Number(x.warmupStartMinutes)<start);
      const anchor=next||prev||null;
      sess.parallel=true;
      sess.parallelWith=anchor?anchor.id:null;
      sess.parallelOffset=0;
      msg=anchor?`Now runs at the same time as \u201C${sessLabelOf(anchor,null)}\u201D \u2014 the rest of the day closed up`
                :'Now runs alongside the day at its own fixed time';
    }
    reflowDay(s,sess.dayId);
  });
  if(msg)toast(msg);
}
function setParallelPartner(sessId,partnerId){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    if(partnerId&&parallelWouldLoop(s,sessId,partnerId))return;
    sess.parallel=true;
    sess.parallelWith=partnerId||null;
    if(!sess.parallelOffset)sess.parallelOffset=0;
    reflowDay(s,sess.dayId);
  });
}
function setParallelOffset(sessId,mins){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    sess.parallelOffset=Math.max(0,Number(mins)||0);
    reflowDay(s,sess.dayId);
  });
}

// Re-flow an entire day: keep the first session's start, snap every later session to
// the previous session's end + buffer (rounded up to 5). Fully automatic sequencing.
function reflowDay(stateSnap,dayId){
  const day=stateSnap.meet.days.find(x=>x.id===dayId);
  const dayOpen=day&&day.openMinutes!=null?Number(day.openMinutes):0;
  // Blocks marked "runs at the same time" are not part of the stack — they are
  // skipped here and placed against their partner afterwards.
  const sameDay=stateSnap.sessions.filter(s=>s.dayId===dayId&&!isParallel(s)).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  for(let i=1;i<sameDay.length;i++){
    const prev=sameDay[i-1];
    const t=calcSessTimingFromObj(prev);
    const want=ruUp(t.sessionEndMinutes+Number(prev.bufferMinutes||0),5);
    sameDay[i].warmupStartMinutes=Math.max(want,dayOpen);
  }
  positionParallels(stateSnap,dayId);
}
// Runs on EVERY load path: cloud load, page refresh/boot, local library, template,
// version restore, undo/redo.
//
// This pass MUST be lossless with respect to time. What you saved is what you see
// when you come back. It used to end with reflowDay() on every day, which silently
// re-packed every session back-to-back on load — so any hand-typed session start
// time or deliberate gap (a published 4:00 PM finals block, a lunch break, an
// afternoon open-training window) was overwritten the moment the page was refreshed,
// and the schedule-health flags moved with it. The cloud copy stayed correct, which
// is why it looked like "the times revert on refresh".
//
// Session times now change only in response to an edit the user actually makes.
// To re-pack on purpose, use "Re-stack times" (restackDay / restackAllDays) or the
// "remove buffers" control on a day.
//
// The only thing this pass does now is repair stale DATA carried by older saves.
function normalizeAllDays(stateSnap){
  const st=stateSnap||S;
  if(!st||!st.meet||!Array.isArray(st.meet.days))return;
  // National Qualifier events are a single combined list — never Prelim/Semifinal/Final.
  // Older saves tagged them "Prelim"; correct that on every load so displays, exports,
  // and future cloud saves all carry round "Qualifier".
  (st.sessions||[]).forEach(sess=>(sess.events||[]).forEach(ev=>{
    if(ev.level==='National Qualifier'&&ev.round&&ev.round!=='Qualifier')ev.round='Qualifier';
    // numberOfDivers is a denormalised copy of the entry maths. Every write path
    // keeps it in step, but schedules saved before "Advancing in" existed carry a
    // value that no longer agrees with projected+advancing — and the exports read
    // it, so reports could print a bigger field than the schedule was timed for.
    // Recomputing is a no-op when neither entry column is filled, because
    // entryValue() falls back to this very field.
    const _t=entryValue(ev);
    if(Number(ev.numberOfDivers||0)!==_t)ev.numberOfDivers=_t;
  }));
  dedupeEventIds(st);
}

// Two events may not share an id, and some saved schedules break that.
// Every built-in seed that pairs a prelim with a final names its events for
// WHAT they are ("senior-men-1-meter-individual") rather than uniquely, so the
// Senior Men 1-Meter prelim and the Senior Men 1-Meter final carry the same id.
// The run sheet keys actual times by event id, so recording the prelim start
// marked the final as diving too \u2014 hours before it went in, on a live
// run-of-show. Open pool blocks repeated across days had the same problem.
//
// Repaired on every load. The FIRST occurrence keeps the id, because that is
// the prelim and it is the one holding the times that were really recorded;
// every later occurrence is re-minted. Anything keyed by the old id INSIDE
// that session \u2014 announcer dive order, club names \u2014 moves with it, so a
// loaded finals dive order is never orphaned. S.live is deliberately not
// touched: its records stay attached to the first occurrence, which is where
// they belong.
function dedupeEventIds(st){
  if(!st||!Array.isArray(st.sessions))return 0;
  const seen=new Set();let fixed=0;
  st.sessions.forEach(sess=>{
    (sess.events||[]).forEach(ev=>{
      if(!ev||!ev.id)return;
      if(!seen.has(ev.id)){seen.add(ev.id);return;}
      const oldId=ev.id;
      let nid;do{nid=uid()}while(seen.has(nid));
      ev.id=nid;seen.add(nid);fixed++;
      const a=sess.announcer;
      if(a){
        if(a.order&&Object.prototype.hasOwnProperty.call(a.order,oldId)){
          a.order[nid]=a.order[oldId];delete a.order[oldId];
        }
        if(a.clubs&&Object.prototype.hasOwnProperty.call(a.clubs,oldId)){
          a.clubs[nid]=a.clubs[oldId];delete a.clubs[oldId];
        }
      }
      // A pairing that pointed at this exact event within this session follows it.
      (sess.events||[]).forEach(o=>{if(o!==ev&&o.linkedPrelimId===oldId)o.linkedPrelimId=nid;});
    });
  });
  return fixed;
}

// Explicit, user-initiated re-stack of ONE day: every session starts as soon as the
// one above it ends, plus that session's buffer. This is the auto-stacker run on
// demand — it is exactly what used to happen invisibly on load.
function restackDay(dayId){
  if(dayLocked(dayId)){lockRefused();return;}
  const count=S.sessions.filter(x=>x.dayId===dayId&&!isParallel(x)).length;
  if(count<2){toast('Nothing to re-stack — this day only has one block');return;}
  askConfirm({
    title:'Re-stack this day?',
    message:'Every block on this day will be moved to start as soon as the one above it ends, plus that block\u2019s buffer. Start times you typed by hand will be replaced. You can undo with Cmd+Z.',
    confirmText:'Re-stack times',
    danger:true,
    onConfirm:()=>{
      upd(s=>{reflowDay(s,dayId);});
      toast('Day re-stacked back-to-back');
    }
  });
}
// Same thing for the whole meet.
function restackAllDays(){
  if(anyLocked()){lockRefused();return;}
  askConfirm({
    title:'Re-stack every day?',
    message:'Every block in the meet will be moved to start as soon as the one above it ends, plus that block\u2019s buffer. Start times you typed by hand and deliberate gaps will be replaced. You can undo with Cmd+Z.',
    confirmText:'Re-stack whole meet',
    danger:true,
    onConfirm:()=>{
      upd(s=>{s.meet.days.forEach(d=>reflowDay(s,d.id));});
      toast('All days re-stacked back-to-back');
    }
  });
}
// Zero out the buffer on every session for a given day and pack them back-to-back.
// For days that are all (or mostly) Open Training / Flighted Warm-Up blocks with no
// gaps needed between them, rather than clicking the buffer chip to "0" one session at a time.
function zeroBuffersForDay(dayId){
  if(dayLocked(dayId)){lockRefused();return;}
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
  // An alongside block never pushes the day — reposition it and stop.
  if(isParallel(sess)){positionParallels(stateSnap,sess.dayId);return;}
  const sameDay=all.filter(s=>s.dayId===sess.dayId&&!isParallel(s)).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
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
  positionParallels(stateSnap,sess.dayId);
}
// Pure timing calc that doesn't read from S (used in cascade)
function calcSessTimingFromObj(sess){return calcSessTiming(sess)}

// Reorder a session within its day by dropping above/below another session.
// Re-times the whole day sequentially from the earliest start, then cascades.
function reorderSessionWithinDay(draggedId,targetId,placeAbove){
  let msg='Session reordered \u2014 times adjusted';
  upd(s=>{
    const dragged=s.sessions.find(x=>x.id===draggedId);
    const target=s.sessions.find(x=>x.id===targetId);
    if(!dragged||!target||dragged.dayId!==target.dayId)return;
    const dayId=dragged.dayId;
    // A block that runs at the same time isn't in the stack, so "moving" it means
    // re-pairing it: drop it on a block and it now runs alongside THAT block.
    if(isParallel(dragged)){
      const newPartner=isParallel(target)?(parallelAnchorOf(s,target)||null):target;
      if(newPartner&&!parallelWouldLoop(s,dragged.id,newPartner.id)){
        dragged.parallelWith=newPartner.id;dragged.parallelOffset=0;
        msg=`Now runs at the same time as \u201C${sessLabelOf(newPartner,null)}\u201D`;
      }
      reflowDay(s,dayId);
      return;
    }
    // Build ordered list by current start time (alongside blocks follow their partner)
    let dayS=s.sessions.filter(x=>x.dayId===dayId&&!isParallel(x)).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
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
    positionParallels(s,dayId);
  });
  toast(msg);
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
  // The .modal ancestor is the real scroll container (overflow-y:auto), not the
  // body div — preserve both to cover either layout.
  const modal=body.closest('.modal');
  const modalScroll=modal?modal.scrollTop:0;
  const scrollTop=body.scrollTop;
  body.innerHTML=renderEditPrac(sess,t,sess.flights||[]);
  body.scrollTop=scrollTop;
  if(modal)modal.scrollTop=modalScroll;
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
    const nums=['numberOfDivers','numberOfDives','secondsPerDive','numberOfPanelChanges','minutesPerPanelChange','customDurationMinutes','projectedDivers','finalDivers','advanceIn'];
    // Entry counts: empty=unset(null), 0=real. Other numbers coerce normally.
    if(field==='projectedDivers'||field==='finalDivers'||field==='advanceIn'){
      ev[field]=(value===''||value==null)?null:Math.max(0,Number(value)||0);
    } else {
      ev[field]=nums.includes(field)?Number(value):value;
    }
    if(field==='finalDivers'||field==='projectedDivers'||field==='advanceIn'){
      ev.numberOfDivers=entryValue(ev);
      if(ev.round==='Final')ev.autoFinals=false;
      // The finals field tracks the prelim's TOTAL field, so it has to re-sync
      // when ANY of the three prelim inputs move — not just finalDivers. Typing
      // "12 advancing in" grows the prelim field by 12 and can therefore grow
      // the finals field too; before this, finals stayed sized off signups alone.
      if(ev.round==='Prelim'&&entryBase(ev)!=null){
        const target=finalsFieldTarget(ev);
        matchingFinalsEvents(s,ev).forEach(fe=>{
          const currentFinal=Number(fe.finalDivers||0);
          if(currentFinal>12)return; // preserve tie override
          fe.projectedDivers=target;fe.finalDivers=target;fe.numberOfDivers=target;
          fe.autoFinals=true;
        });
      }
    }
    // Cascade: changing divers/dives/sec can extend session, which pushes the next ones
    if(['numberOfDivers','numberOfDives','secondsPerDive','numberOfPanelChanges','minutesPerPanelChange','customDurationMinutes','manualSplit','projectedDivers','finalDivers','advanceIn'].includes(field)){
      reflowDay(s,sess.dayId);
    }
  });
}
function toggleSplit(sessId,evId){
  // Finals are never split — ignore any attempt
  {const _s=S.sessions.find(x=>x.id===sessId);const _e=_s&&_s.events.find(x=>x.id===evId);if(_e&&_e.round==='Final')return;}upd(s=>{const sess=s.sessions.find(x=>x.id===sessId);const ev=sess?.events.find(e=>e.id===evId);if(ev&&!isPlatform(ev.apparatus)){ev.manualSplit=!ev.manualSplit;if(ev.manualSplit){if(!Number(ev.numberOfPanelChanges))ev.numberOfPanelChanges=autoPanelChanges(ev);if(!Number(ev.minutesPerPanelChange))ev.minutesPerPanelChange=3;}reflowDay(s,S.sessions.find(x=>x.id===sessId).dayId);}})}
function setBuffer(sessId,v){updSess(sessId,'bufferMinutes',v)}
// End-time entry for practice/custom blocks: "open 7–11" should be typed as
// 7:00 and 11:00, not 7:00 and 240 minutes of mental math. Duration is derived.
function setPracEndTime(sessId,endMin){
  const sess=S.sessions.find(x=>x.id===sessId);if(!sess||!sess.events[0])return;
  const start=Number(sess.warmupStartMinutes||0);
  const dur=Number(endMin)-start;
  if(isNaN(dur))return;
  if(dur<5){toast('End time must be after the start time');render();return;}
  updEv(sessId,sess.events[0].id,'customDurationMinutes',dur);
}
function ackWarn(key){upd(s=>{if(!s.acknowledgedWarnings)s.acknowledgedWarnings=[];if(!s.acknowledgedWarnings.includes(key))s.acknowledgedWarnings.push(key)})}
function cycleStatus(){const i=STATUS.indexOf(S.publishStatus||'draft');upd(s=>s.publishStatus=STATUS[(i+1)%STATUS.length])}
// "Set finals from prelims": each final takes the top 12 of ITS OWN prelim, or
// the whole prelim field when fewer than 12 are in it. A blanket 12 was wrong
// for any event whose prelim field is smaller — e.g. a 6-entry tower qualifier
// cannot send 12 to a final. Finals with no matching prelim keep the 12 default.
function applyFinalsAll(){
  let capped=0,total=0;
  upd(s=>{
    s.sessions.forEach(sess=>sess.events.forEach(ev=>{
      if(ev.round!=='Final')return;
      const prelim=prelimEventFor(s,ev);
      const target=(prelim&&entryBase(prelim)!=null)?finalsFieldTarget(prelim):12;
      if(target<12)capped++;
      total++;
      ev.projectedDivers=target;ev.finalDivers=target;ev.numberOfDivers=target;ev.autoFinals=true;
    }));
    s.sessions.forEach(sess=>{if(!sess.isPractice)cascadeSession(s,sess.id)});
  });
  toast(capped?`${total} finals sized from their prelims — ${capped} under 12 (smaller field)`:`${total} finals set to 12 (editable for ties)`);
}
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
    toast('Saved to cloud',2400);
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
// DiveMeets meet whose live entry counts feed "Sync actual entries". Each
// schedule can set its own meet ID (Meet Setup → DiveMeets meet ID); this
// falls back to the original 2026 Junior Nationals meet for schedules
// saved before that field existed, so nothing already in use breaks.
const DEFAULT_DIVEMEETS_MEET_ID='12923';
function getDivemeetsMeetId(){
  const id=S.meet&&S.meet.divemeetsId?String(S.meet.divemeetsId).trim():'';
  return id||DEFAULT_DIVEMEETS_MEET_ID;
}
// Additional DiveMeets sources beyond the single default above — lets one
// schedule pull from several meets at once (e.g. a Combined schedule with
// separate Qualifier + Nationals meets), each scoped to specific event
// levels, and each tagged 'registered' (live signups) or 'projected'
// (a past meet used as a planning-baseline estimate, since DiveMeets has no
// "expected turnout" concept of its own). The default source always keeps
// its old behavior: match by whatever level the row itself was parsed
// with (levels:null), which is how the multi-age-group Junior meet has
// always worked. Extra sources instead force-map every row they return
// onto specific levels (levels:[...]), since e.g. USA Diving's own Senior
// meets all say "Senior" in the event name regardless of whether the
// meet itself is the Qualifier or Nationals — only the meet ID tells them
// apart, so the level has to come from configuration, not the page text.
function getAllDivemeetsSources(){
  const legacy={id:getDivemeetsMeetId(),role:'registered',levels:null};
  const extra=(S.meet&&Array.isArray(S.meet.divemeetsSources))?S.meet.divemeetsSources:[];
  return [legacy,...extra.filter(s=>s&&s.id)];
}
function addDivemeetsSource(){
  upd(s=>{s.meet.divemeetsSources=s.meet.divemeetsSources||[];s.meet.divemeetsSources.push({id:'',role:'registered',levels:[]})});
}
function removeDivemeetsSource(i){
  upd(s=>{(s.meet.divemeetsSources||[]).splice(i,1)});
}
function updateDivemeetsSource(i,field,value){
  upd(s=>{
    const src=(s.meet.divemeetsSources||[])[i];if(!src)return;
    src[field]=value;
  });
}
// Levels can ONLY be toggled from the schedule's own actual event levels
// (chips built from distinctScheduleLevels()) — never freehand-typed. A
// hand-typed level string that doesn't exactly match an event's level
// silently matches nothing, which is exactly the failure mode this closes off.
function toggleDivemeetsSourceLevel(i,level){
  upd(s=>{
    const src=(s.meet.divemeetsSources||[])[i];if(!src)return;
    src.levels=src.levels||[];
    const idx=src.levels.indexOf(level);
    if(idx>=0)src.levels.splice(idx,1);else src.levels.push(level);
  });
}
function distinctScheduleLevels(){
  const set=new Set();
  S.sessions.forEach(sess=>{if(sess.isPractice)return;sess.events.forEach(ev=>{if(ev.level)set.add(ev.level)})});
  return[...set].sort();
}
// Postgres timestamptz::text casts return 6-digit microsecond precision
// (e.g. "2026-07-16 11:49:08.636458+00"). JS Date() only supports 3-digit
// milliseconds and rejects the bare 2-digit "+00" offset, so a naive
// .replace(' ','T') silently produces Invalid Date. Truncate the fractional
// seconds and pad the offset before parsing.
function parseNeonTimestamp(raw){
  if(!raw)return null;
  const iso=raw.replace(' ','T').replace(/(\.\d{3})\d+/,'$1').replace(/([+-]\d{2})$/,'$1:00');
  return new Date(iso);
}
async function loadMeetEntriesForId(meetId){
  const r=await nq(`SELECT age_group,gender,discipline,entries,fetched_at::text FROM junior_results.meet_entries WHERE meet_id_dm=$1 AND round='Prelim' ORDER BY age_group,gender,discipline`,[meetId]);
  return(r.rows||[]).map(row=>({ageGroup:row[0],gender:row[1],discipline:row[2],entries:Number(row[3]),fetchedAt:row[4]}));
}
async function loadMeetEntrantsForId(meetId){
  const r=await nq(`SELECT age_group,gender,discipline,diver_name,team,diver_key,dm_profile_id FROM junior_results.meet_entrants WHERE meet_id_dm=$1 ORDER BY age_group,gender,discipline,diver_name`,[meetId]);
  return(r.rows||[]).map(row=>({ageGroup:row[0],gender:row[1],discipline:row[2],name:row[3],team:row[4],diverKey:row[5],dmProfileId:row[6]}));
}
async function loadAllDivemeetsSources(){
  const configs=getAllDivemeetsSources();
  const uniqueIds=[...new Set(configs.map(c=>c.id))];
  const rowsById={},entrantsById={};
  await Promise.all(uniqueIds.map(async id=>{
    rowsById[id]=await loadMeetEntriesForId(id).catch(()=>[]);
    entrantsById[id]=await loadMeetEntrantsForId(id).catch(()=>[]);
  }));
  return configs.map(c=>({...c,rows:rowsById[c.id]||[],entrants:entrantsById[c.id]||[]}));
}
// ── SYNC ACTUAL ENTRIES (DiveMeets registrations → schedule) ─────────
function openEntrySync(){
  UI.entrySync={loading:true,sources:null,error:null,pulling:false,pullMsg:null};
  UI.entrySyncExpand={};
  // Per-event opt-out for this session of the modal only. Deliberately cleared
  // on every open so an unticked row from last time can never silently skip an
  // event you meant to update. Absent = ticked.
  UI.entrySyncSkip={};
  UI.entrySyncFinals=true;
  UI.modal='entry-sync';
  render();
  loadAllDivemeetsSources()
    .then(sources=>{UI.entrySync={loading:false,sources,error:null,pulling:false,pullMsg:null}})
    .catch(e=>{UI.entrySync={loading:false,sources:null,error:e.message||'Could not load entries',pulling:false,pullMsg:null}})
    .finally(()=>render());
}
// Live "pull now" — dispatches the divemeets-entries GitHub Actions workflow
// directly from the browser (same token/pattern overrides-sync.js already
// uses for the Contents API), once per distinct configured meet ID in
// sequence, polling each to completion, then reloads rows from Neon so the
// modal reflects a genuinely fresh DiveMeets fetch rather than whatever the
// last nightly cron happened to leave behind.
const GH_API='https://api.github.com';
const GH_REPO=(window.USAD_CONFIG&&window.USAD_CONFIG.repo)||'mjretcher/usa-diving-staff-apps';
function ghToken(){return (window.USAD_CONFIG&&window.USAD_CONFIG.syncToken)||'';}
async function ghFetch(path,opts={}){
  const res=await fetch(GH_API+path,{...opts,headers:{'Authorization':`Bearer ${ghToken()}`,'Accept':'application/vnd.github+json','Content-Type':'application/json',...(opts.headers||{})}});
  if(!res.ok&&res.status!==204){
    // Surface GitHub's own explanation. A bare "GitHub API 422" said nothing
    // about the workflow input having been renamed; the response body said so
    // in as many words. Anything that goes wrong here should be readable from
    // the toast alone, without anyone opening a browser console.
    let detail='';
    try{const b=await res.json();if(b&&b.message)detail=` — ${b.message}`;}catch(_){}
    throw new Error(`GitHub API ${res.status}${detail}`);
  }
  return res.status===204?null:res.json();
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function pullDivemeetsNow(){
  if(UI.entrySync&&UI.entrySync.pulling)return;
  UI.entrySync=UI.entrySync||{};
  UI.entrySync.pulling=true;
  render();
  // The workflow takes ONE comma-separated `meet_ids` input and loops the list
  // itself. It used to take a singular `meet_id`, and this button still sent
  // that after the workflow changed — GitHub rejected every dispatch with
  // 422 "Unexpected inputs provided", so "Pull now" had been dead since.
  // Dispatch once for the whole list: it matches the workflow, and it is one
  // run of a few minutes instead of N sequential runs.
  const meetIds=[...new Set(getAllDivemeetsSources().map(c=>String(c.id||'').trim()))]
    .filter(id=>/^\d+$/.test(id));
  try{
    if(!meetIds.length)throw new Error('No DiveMeets meet numbers are configured for this schedule');
    const tag=meetIds.length>1?` (meets ${meetIds.join(', ')})`:` (meet ${meetIds[0]})`;
    UI.entrySync.pullMsg=`Requesting a fresh pull from DiveMeets${tag}…`;
    render();
    const dispatchedAt=Date.now();
    await ghFetch(`/repos/${GH_REPO}/actions/workflows/divemeets-entries.yml/dispatches`,{
      method:'POST',body:JSON.stringify({ref:'main',inputs:{meet_ids:meetIds.join(',')}})
    });
    // Filter to workflow_dispatch runs: this workflow also runs on a cron that
    // fires mid-meet-week, and an unfiltered match would happily latch onto a
    // scheduled run that started seconds earlier and report its result as ours.
    let run=null;
    for(let j=0;j<15&&!run;j++){
      await sleep(4000);
      const data=await ghFetch(`/repos/${GH_REPO}/actions/workflows/divemeets-entries.yml/runs?per_page=10&event=workflow_dispatch`);
      run=(data.workflow_runs||[]).find(r=>new Date(r.created_at).getTime()>=dispatchedAt-5000);
    }
    if(!run)throw new Error('Could not find the triggered run — check the Actions tab on GitHub');
    UI.entrySync.pullMsg=`Pulling live entries from DiveMeets${tag} — usually 1–3 minutes…`;
    render();
    const started=Date.now();
    while(run.status!=='completed'){
      if(Date.now()-started>10*60*1000)throw new Error("Still running after 10 minutes — it'll finish in the background; re-open this to check later");
      await sleep(5000);
      run=await ghFetch(`/repos/${GH_REPO}/actions/runs/${run.id}`);
    }
    // A partial failure still leaves real, fresher numbers behind for the meets
    // that did work — the workflow keeps going past a bad meet and only ends red
    // at the finish. Reload either way and say plainly which happened, rather
    // than throwing good data away.
    const sources=await loadAllDivemeetsSources();
    UI.entrySync={loading:false,sources,error:null,pulling:false,pullMsg:null};
    if(run.conclusion!=='success'){
      toast(`Pull finished with errors (${run.conclusion}) — some meets may not have updated. Check the run on GitHub.`);
    }else{
      toast(`Pulled fresh entries from ${meetIds.length} DiveMeets meet${meetIds.length===1?'':'s'}`);
    }
  }catch(e){
    UI.entrySync.pulling=false;
    UI.entrySync.pullMsg=null;
    toast(e.message||'Live pull failed');
  }
  render();
}
// Finds the first configured source (in declared order) of the given role
// that covers this event, matching either by its explicit level override
// (extra sources) or by the row's own parsed level (the default source).
// levels===null means "unrestricted" (the legacy default source only,
// which matches whatever level the row itself was parsed with). Any actual
// array — including an EMPTY one, e.g. a newly added source with no level
// chips clicked yet — must be treated as an explicit allow-list: empty
// means "matches nothing" and must never silently fall back to
// unrestricted matching, which would let a misconfigured source collide
// with unrelated events.
// The schedule calls the tower "10-Meter" on Senior and National Qualifier events
// but "Platform" on Junior ones, while the DiveMeets parser only ever emits
// "Platform". A raw === comparison therefore silently failed to match EVERY Senior
// and Qualifier tower event: the sync looked like it ran and quietly skipped them,
// leaving staff estimates in place with no indication they had not been updated.
// isPlatform() already exists for exactly this; the matcher just never used it.
function sameApparatus(a,b){
  if(a===b)return true;
  return isPlatform(a)&&isPlatform(b);
}
function findDivemeetsMatch(sources,ev,role){
  if(ev.style==='Synchronized')return null; // synchro is never comparable to individual DiveMeets entries — excluded by policy, same as the parser
  for(const s of sources){
    if(s.role!==role)continue;
    let row;
    if(s.levels===null){
      row=(s.rows||[]).find(r=>r.ageGroup===ev.level&&r.gender===ev.gender&&sameApparatus(r.discipline,ev.apparatus));
    }else{
      if(!(s.levels||[]).includes(ev.level))continue;
      row=(s.rows||[]).find(r=>r.gender===ev.gender&&sameApparatus(r.discipline,ev.apparatus));
    }
    if(row)return{entries:row.entries,sourceId:s.id};
  }
  return null;
}
function findDivemeetsEntrants(sources,ev,sourceId){
  if(ev.style==='Synchronized')return[];
  const s=sources.find(x=>x.id===sourceId);if(!s)return[];
  if(s.levels===null)return(s.entrants||[]).filter(e=>e.ageGroup===ev.level&&e.gender===ev.gender&&sameApparatus(e.discipline,ev.apparatus));
  return(s.entrants||[]).filter(e=>e.gender===ev.gender&&sameApparatus(e.discipline,ev.apparatus));
}
function entrySyncDeltas(){
  const sources=UI.entrySync?.sources||[];
  const out=[];
  S.sessions.forEach(sess=>{
    if(sess.isPractice)return;
    sess.events.forEach(ev=>{
      if(ev.round!=='Prelim'&&ev.round!=='Qualifier')return;
      const reg=findDivemeetsMatch(sources,ev,'registered');
      const base=findDivemeetsMatch(sources,ev,'projected');
      if(!reg&&!base)return;
      out.push({sessId:sess.id,evId:ev.id,name:evName(ev),projected:ev.projectedDivers,
        // What the schedule is CURRENTLY sized off (Final wins over Projected).
        // The change column compares against this, not against Projected — a
        // stale Final used to hide a real difference behind a "same" badge.
        base:entryBase(ev),finalSet:(ev.finalDivers!=null&&ev.finalDivers!==''),
        advanceIn:canAdvanceIn(ev)?advanceInValue(ev):0,
        registered:reg?reg.entries:null,registeredSourceId:reg?reg.sourceId:null,
        baseline:base?base.entries:null,baselineSourceId:base?base.sourceId:null});
    });
  });
  return out;
}
// ── Per-row selection in the Sync modal ───────────────────────────────
// Absent means ticked, so a freshly opened modal applies everything and the
// stored object only ever holds deliberate opt-outs.
function esPicked(evId){return !(UI.entrySyncSkip&&UI.entrySyncSkip[evId]===true)}
function esTogglePick(evId){
  if(!UI.entrySyncSkip)UI.entrySyncSkip={};
  UI.entrySyncSkip[evId]=esPicked(evId);
  render();
}
function esToggleAll(){
  const deltas=entrySyncDeltas().filter(d=>d.registered!=null);
  const anyOn=deltas.some(d=>esPicked(d.evId));
  UI.entrySyncSkip={};
  if(anyOn)deltas.forEach(d=>{UI.entrySyncSkip[d.evId]=true});
  render();
}
function esToggleFinals(){UI.entrySyncFinals=!(UI.entrySyncFinals!==false);render()}
function esFinalsOn(){return UI.entrySyncFinals!==false}
function applyEntrySync(){
  const deltas=entrySyncDeltas().filter(d=>d.registered!=null&&esPicked(d.evId));
  if(!deltas.length){toast('Nothing ticked — tick at least one event to apply');return;}
  const doFinals=esFinalsOn();
  let applied=0,finalsTouched=0;
  upd(s=>{
    const touched=new Set();
    const prelims=[];
    // PASS 1 — write the registered count into BOTH entry columns.
    // Writing only projectedDivers meant a stale hand-typed Final silently won
    // (entryBase prefers Final), so the schedule kept sizing off an old number
    // while the panel displayed the fresh one. Worse, those hand-typed Finals
    // had the advancing-in divers baked in, so Total added them a second time.
    // A live DiveMeets signup count IS the confirmed entry count for a
    // Prelim/Qualifier, so it owns both columns and the double-count cannot
    // survive a pull. Advancing-in still lives in its own field and is untouched.
    deltas.forEach(d=>{
      const sess=s.sessions.find(x=>x.id===d.sessId);if(!sess)return;
      const ev=sess.events.find(e=>e.id===d.evId);if(!ev)return;
      ev.projectedDivers=d.registered;
      ev.finalDivers=d.registered;
      // Real registrations are authoritative — mark as a manual-grade value so
      // a later "Pre-fill projected entries" (projection data) can't overwrite.
      ev.autoProjected=false;
      ev.numberOfDivers=entryValue(ev);
      if(ev.round==='Prelim')prelims.push({sess,ev});
      touched.add(sess.dayId);applied++;
    });
    // PASS 2 — resize each final off its prelim's new TOTAL. Must run after
    // pass 1: a prelim's advancing-in is capped by the qualifier's field size,
    // and that qualifier may itself have just been rewritten above.
    // Skipped entirely when "also resize finals" is unticked, so you can take a
    // corrected prelim headcount without disturbing a finals field you set by hand.
    if(doFinals)prelims.forEach(({ev})=>{
      const target=finalsFieldTarget(ev);
      matchingFinalsEvents(s,ev).forEach(fe=>{
        if(Number(fe.finalDivers||0)>12)return; // preserve tie override
        if(Number(fe.finalDivers||0)===target)return; // already right — don't count it as a change
        fe.projectedDivers=target;fe.finalDivers=target;fe.numberOfDivers=target;fe.autoFinals=true;
        finalsTouched++;
        const fs=s.sessions.find(x=>x.events.includes(fe));
        if(fs)touched.add(fs.dayId);
      });
    });
    // Resize events WITHOUT re-packing the day. reflowDay() rewrites the start
    // time of every later session on the day, which is exactly the silent
    // overwrite normalizeAllDays() was changed to stop doing: a published 4:45 PM
    // finals block is a commitment, not a derived value. Correcting the Senior
    // prelims shrinks them by ~30 min a day, so reflowing here would have yanked
    // Aug 7/8/9 finals half an hour earlier the moment you hit Apply — trading a
    // headcount error for a much more visible one, mid-meet.
    // Each session's END still recomputes from its events, so the shorter prelim
    // shows up immediately and any gap it opens appears as a gap chip in the
    // timeline. Closing that gap stays a deliberate act: "Re-stack times".
    // Locked days are read-only and are skipped entirely.
    touched.forEach(dayId=>{if(!dayLocked(dayId))positionParallels(s,dayId)});
  });
  UI.modal=null;
  toast(`Synced ${applied} event${applied===1?'':'s'} to registered DiveMeets entries${finalsTouched?` · ${finalsTouched} final${finalsTouched===1?'':'s'} resized`:''}`);
}
// A "projected baseline" source (e.g. last cycle's Winter Nationals turnout
// standing in for this year's Qualifier/Nationals estimate before real
// registration exists) only ever fills the Projected column — it never
// touches the actual scheduled headcount, since it's an estimate the person
// should still review before committing to it.
function applyBaselineProjections(){
  const deltas=entrySyncDeltas().filter(d=>d.baseline!=null&&esPicked(d.evId));
  if(!deltas.length){toast('Nothing ticked — tick at least one event to apply');return;}
  let applied=0;
  upd(s=>{
    const touched=new Set();
    deltas.forEach(d=>{
      const sess=s.sessions.find(x=>x.id===d.sessId);if(!sess)return;
      const ev=sess.events.find(e=>e.id===d.evId);if(!ev)return;
      ev.projectedDivers=d.baseline;
      // A baseline is a deliberate stand-in for a real signup count (e.g. last
      // cycle's Winter Nationals sizing this year's Qualifier/Nationals before
      // registration exists) — once applied it should behave exactly like a
      // real "Apply registered counts": it sizes the actual schedule and is
      // protected from later pre-fills, not just a hint sitting in one column.
      ev.autoProjected=false;
      ev.numberOfDivers=entryValue(ev);
      touched.add(sess.dayId);applied++;
    });
    // Same rule as applyEntrySync: resize events, never re-pack published
    // session start times, and never touch a locked day.
    touched.forEach(dayId=>{if(!dayLocked(dayId))positionParallels(s,dayId)});
  });
  UI.modal=null;
  toast(`Synced ${applied} event${applied===1?'':'s'} to baseline meet counts`);
}
function renderEntrySyncModal(){
  const es=UI.entrySync||{};
  const configuredSources=getAllDivemeetsSources();
  const hd=`<div class="modal-hd"><div><span class="modal-title">Sync actual entries</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${configuredSources.length} DiveMeets source${configuredSources.length===1?'':'s'} configured <a href="#" onclick="event.preventDefault();UI.modal='meet';render()" style="color:var(--cyan)">manage</a></div></div><button class="modal-close" aria-label="Close" onclick="UI.modal=null;render()">×</button></div>`;
  if(es.loading)return`<div class="modal modal-lg" onclick="event.stopPropagation()">${hd}<div class="modal-body" style="text-align:center;color:var(--tx3);padding:40px 22px">Loading registered entries…</div></div>`;
  if(es.error)return`<div class="modal modal-lg" onclick="event.stopPropagation()">${hd}<div class="modal-body"><div style="color:var(--red);font-size:13px;margin-bottom:12px">Could not load entries: ${esc(es.error)}</div><button class="btn btn-p" onclick="openEntrySync()">Retry</button></div></div>`;
  const sources=es.sources||[];
  const fetchedTimes=sources.map(s=>s.rows&&s.rows.length?parseNeonTimestamp(s.rows[0].fetchedAt):null).filter(d=>d&&!isNaN(d.getTime()));
  const fetchedLbl=fetchedTimes.length?new Date(Math.min(...fetchedTimes.map(d=>d.getTime()))).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
  const hasBaseline=sources.some(s=>s.role==='projected');
  const deltas=entrySyncDeltas();
  const projKeys=new Set((UI.projRows||[]).map(r=>r.diverKey));
  const rows=deltas.map((d,di)=>{
    const proj=d.projected==null||d.projected===''?null:Number(d.projected);
    // Compare against what the event is ACTUALLY sized at right now, including
    // its advancing-in add-on, so the change column can never say "same" while
    // the schedule is quietly running a different number.
    const sizedNow=d.base==null?null:d.base+(d.advanceIn||0);
    const sizedNew=d.registered==null?null:d.registered+(d.advanceIn||0);
    const diff=(sizedNow==null||sizedNew==null)?null:sizedNew-sizedNow;
    const badge=diff==null?`<span style="color:var(--tx3)">—</span>`:diff===0?`<span style="color:var(--tx3)">same</span>`:diff>0?`<span style="color:var(--prac);font-weight:700">+${diff}</span>`:`<span style="color:var(--red);font-weight:700">${diff}</span>`;
    const sess=S.sessions.find(x=>x.id===d.sessId);
    const ev=sess&&sess.events.find(e=>e.id===d.evId);
    const who=ev&&d.registeredSourceId?findDivemeetsEntrants(sources,ev,d.registeredSourceId):[];
    const open=!!(UI.entrySyncExpand&&UI.entrySyncExpand[di]);
    const whoRows=open&&who.length?`<tr><td colspan="${hasBaseline?6:5}" style="padding:2px 8px 10px"><div class="es-who">${who.map(en=>{
      const known=projKeys.size?projKeys.has(en.diverKey):true;
      return`<span class="es-name ${known?'':'new'}" title="${esc(en.team||'')}${known?'':' — registered but not in the projected field'}">${esc(en.name)}${known?'':' ✳'}</span>`;
    }).join('')}${projKeys.size?`<div class="es-legend">✳ = registered on DiveMeets but not in the projected field — worth a look</div>`:''}</div></td></tr>`:'';
    const advTag=d.advanceIn>0?` <span class="es-adv" title="${d.advanceIn} advancing in from an earlier event — kept on top of the registered count">+${d.advanceIn} adv</span>`:'';
    const picked=esPicked(d.evId);
    const willChange=(diff!=null&&diff!==0);
    return`<tr style="border-top:1px solid var(--bd);${picked?'':'opacity:.4'}"><td style="padding:6px 4px 6px 8px;width:26px"><input type="checkbox" class="es-tick" ${picked?'checked':''} onclick="esTogglePick('${d.evId}')" title="${picked?'This event will be updated':'Skipped — this event will be left exactly as it is'}"/></td><td style="padding:6px 8px">${who.length?`<button class="es-expand" onclick="UI.entrySyncExpand[${di}]=!UI.entrySyncExpand[${di}];render()">${open?'▾':'▸'}</button> `:''}${esc(d.name)}${advTag}</td><td style="padding:6px 8px;text-align:right;font-variant-numeric:tabular-nums;color:var(--tx3)">${proj==null?'—':proj}</td>${hasBaseline?`<td style="padding:6px 8px;text-align:right;font-variant-numeric:tabular-nums;color:var(--cyan)">${d.baseline==null?'—':d.baseline}</td>`:''}<td style="padding:6px 8px;text-align:right;font-variant-numeric:tabular-nums;font-weight:700">${d.registered==null?'—':(d.advanceIn>0?`<span style="font-weight:400;color:var(--tx3)">${d.registered} + ${d.advanceIn} adv =</span> <span style="color:var(--cyan)">${sizedNew}</span>`:d.registered)}${(sizedNow!=null&&diff!==0&&d.finalSet)?`<div style="font-size:10px;font-weight:400;color:var(--red)">replaces ${sizedNow} now scheduled</div>`:''}</td><td style="padding:6px 8px;text-align:right">${badge}</td></tr>${whoRows}`;
  }).join('');
  // Which finals the ticked prelims would actually move, named up front so the
  // consequence is visible BEFORE the button is pressed rather than after.
  const finalsPreview=[];
  if(esFinalsOn())deltas.filter(d=>d.registered!=null&&esPicked(d.evId)).forEach(d=>{
    const sess=S.sessions.find(x=>x.id===d.sessId);
    const ev=sess&&sess.events.find(e=>e.id===d.evId);
    if(!ev||ev.round!=='Prelim')return;
    const target=Math.min(12,d.registered+(d.advanceIn||0));
    matchingFinalsEvents(S,ev).forEach(fe=>{
      const cur=Number(fe.finalDivers||0);
      if(cur>12||cur===target)return;
      finalsPreview.push(`${evName(fe)} ${cur||'—'}→${target}`);
    });
  });
  const pickedCount=deltas.filter(d=>d.registered!=null&&esPicked(d.evId)).length;
  const pickedBase=deltas.filter(d=>d.baseline!=null&&esPicked(d.evId)).length;
  return`<div class="modal modal-lg" onclick="event.stopPropagation()">${hd}
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;background:rgba(0,154,199,.08);border:1px solid rgba(0,154,199,.25);font-size:12px;color:var(--tx);margin-bottom:14px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2" style="width:15px;height:15px;flex-shrink:0"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        <span style="flex:1">Pulling from ${configuredSources.map(s=>esc(s.id)+(s.role==='projected'?' (baseline)':'')).join(', ')}.${fetchedLbl?` <span style="color:var(--tx3)">Oldest pull: ${fetchedLbl}.</span>`:''}${es.pulling?` <span style="color:var(--cyan);font-weight:600">${esc(es.pullMsg||'Pulling…')}</span>`:''}</span>
        <button class="btn btn-sm" ${es.pulling?'disabled':''} onclick="pullDivemeetsNow()" style="flex-shrink:0">${es.pulling?'Pulling…':'Pull fresh from DiveMeets'}</button>
      </div>
      ${deltas.length?`<table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--tx3)"><th style="padding:4px 4px 4px 8px;width:26px"><input type="checkbox" class="es-tick" ${deltas.filter(x=>x.registered!=null).every(x=>esPicked(x.evId))?'checked':''} onclick="esToggleAll()" title="Tick or untick every event"/></th><th style="text-align:left;padding:4px 8px">Event</th><th style="text-align:right;padding:4px 8px">Projected</th>${hasBaseline?'<th style="text-align:right;padding:4px 8px">Baseline</th>':''}<th style="text-align:right;padding:4px 8px">Registered</th><th style="text-align:right;padding:4px 8px">Change</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`:`<div style="text-align:center;color:var(--tx3);padding:20px">No Prelim/Qualifier events in this schedule match any configured DiveMeets source.</div>`}
      ${deltas.length?`<label class="es-opt" title="The finals field is the top 12 of the prelim, or the whole prelim field when fewer than 12 are in it. Untick to leave every finals number exactly as you have it.">
        <input type="checkbox" class="es-tick" ${esFinalsOn()?'checked':''} onclick="esToggleFinals()"/>
        <span><strong>Also resize the matching finals</strong> from the ticked prelims — top 12, or the whole field if it's smaller.${esFinalsOn()?(finalsPreview.length?` <span style="color:var(--cyan)">${finalsPreview.length} would change: ${finalsPreview.map(esc).join(', ')}</span>`:` <span style="color:var(--tx3)">Nothing would change — every final is already right.</span>`):` <span style="color:var(--tx3)">Off — finals will be left exactly as they are.</span>`}</span>
      </label>`:''}
      ${deltas.some(d=>d.advanceIn>0)?`<p style="font-size:11px;color:var(--tx3);margin-top:10px">Events marked <span class="es-adv">+N adv</span> have divers advancing in from an earlier event at this meet. DiveMeets never lists those divers, so that number is added on top of the registered count and is <strong>not</strong> cleared by this sync.</p>`:''}
      <p style="font-size:11px;color:var(--tx3);margin-top:12px">Both "Apply" buttons set the event's entry count and protect it from later pre-fills — "Registered" uses live signups, "Baseline" uses the projection-baseline meet(s). ${hasBaseline?'Only events with a configured baseline source are affected by "Apply baseline" — for events that have both, whichever you click last wins.':''}</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-sm" onclick="UI.modal=null;render()">Cancel</button>
      ${hasBaseline?`<button class="btn btn-sm" ${pickedBase?'':'disabled'} onclick="applyBaselineProjections()">Apply baseline to ${pickedBase} ticked</button>`:''}
      <button class="btn btn-sm btn-p" ${pickedCount?'':'disabled'} onclick="applyEntrySync()">Apply registered counts to ${pickedCount} event${pickedCount===1?'':'s'}</button>
    </div>
  </div>`;
}
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
// Background loader for the set of diver_keys who have ACTUALLY completed DiveMeets
// registration for this schedule's configured meet(s). Used only as a SECONDARY figure
// alongside the full pipeline total in athleteCountForFlight() below — not a replacement for
// it. Registration reliably lags qualification (people qualify weeks before they get around to
// registering), so treating "currently registered" as the headcount badly undercounts true
// attendance; but the pipeline total alone also isn't 100% reliable, since not everyone
// qualified ultimately shows up. Surfacing both lets a person watch registrations fill in
// against the known-qualified roster rather than trusting either number blindly.
function ensureEntrantsLoaded(){
  if(UI.regEntrantKeys!=null||UI._entrantsBgLoading)return;
  UI._entrantsBgLoading=true;
  const regSources=getAllDivemeetsSources().filter(s=>s.role==='registered');
  Promise.all(regSources.map(s=>loadMeetEntrantsForId(s.id).catch(()=>[])))
    .then(lists=>{
      // KEY-FORMAT BRIDGE: meet_entrants keys divers by normalized name ("nm:jane doe"),
      // while projected_nationals_field prefers DiveMeets profile IDs ("dm:12345") and only
      // falls back to name keys when no profile is known. The same athlete therefore often
      // carries DIFFERENT keys in the two tables, and a raw key intersection silently drops
      // everyone keyed one way here and the other way there (observed: 123 matches out of
      // 330 real registrants). Adding BOTH the name key and the dm:profile key for every
      // entrant lets the intersection connect regardless of which style the projected field
      // used for that athlete.
      const keys=new Set();
      lists.forEach(list=>list.forEach(e=>{
        if(e.diverKey)keys.add(e.diverKey);
        if(e.dmProfileId)keys.add('dm:'+e.dmProfileId);
      }));
      UI.regEntrantKeys=keys;
    })
    .catch(()=>{UI.regEntrantKeys=new Set()})
    .finally(()=>{UI._entrantsBgLoading=false;render()});
}
// Athlete counts for a flight's zone/E-W-C tag. Returns {total, registered}:
//   total — the FULL qualification-pipeline roster for that group (every diver in the
//     projected field tagged with this zone or E/W/C meet, across all qualification paths:
//     Zone Direct, E/W/C, and HPS-not-yet-competed). This is the number to plan warm-up time
//     around, since it reflects who is actually qualified regardless of DiveMeets paperwork.
//   registered — how many of those SAME divers (matched by diver_key) have completed real
//     DiveMeets registration so far; null until that background load finishes. Not everyone
//     qualified is guaranteed to attend, so this is a live read on how attendance is tracking
//     against the roster — shown alongside the total, never in place of it.
// An athlete who registers without ever appearing in the pipeline at all (late add,
// discretionary invite) isn't reflected in either figure and is handled manually.
// Zone is more specific than E-W-C and takes priority when both are set (every zone belongs
// to exactly one E-W-C group).
function athleteCountForFlight(f){
  if(!UI.projRows)return null;
  if(!f.zone&&!f.ewcMeet)return null;
  const rows=UI.projRows.filter(r=>f.zone?r.zone===f.zone:r.ewcMeet===f.ewcMeet);
  const keys=new Set(rows.map(r=>r.diverKey));
  let registered=null;
  if(UI.regEntrantKeys){
    registered=0;
    keys.forEach(k=>{if(UI.regEntrantKeys.has(k))registered++;});
  }
  return{total:keys.size,registered};
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
  // NOTE: .modal is in this list because it — not .modal-body — is the actual
  // scroll container (overflow-y:auto lives on .modal in the CSS).
  const _scroll={};
  document.querySelectorAll('.modal,.tl-body,.enp-body,.modal-body,.rp-body,.lib-body').forEach((el,i)=>{
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
      <div class="tl-wrap ${dayLocked(UI.dayId)?'day-locked':''}">${renderTlBar(timed)}${typeof liveStrip==='function'?liveStrip():''}${renderLockBanner()}${renderTimeline(timed)}</div>
      ${rightPanel}
    </div>
    ${UI.editSessId?renderEditModal(timed):''}
    ${UI.modal?renderModal(timed):''}
    ${UI.moveSessionId?renderMoveDialog():''}
    ${UI.present?renderPresentation(timed):''}
    ${UI.palette?renderPalette():''}
    ${UI.dialog?renderDialog():''}
    ${UI.combinePicker?renderCombinePickerModal():''}
  `;
  bindDrag();
  if(UI.dialog&&UI.dialog.type==='prompt'){const di=document.getElementById('dialog-input');if(di){di.focus();di.select();}}
  // Jumped in from tapping an event's time — land on that event's field, not the top.
  // Wrapped whole: nothing about a convenience scroll is worth risking a throw
  // inside render() while a meet is running.
  if(UI.modal==='live-times'&&UI.liveTimesFocusEvId){
    try{
      const fe=document.getElementById(UI.liveTimesFocusBoard!=null
        ?'lt-b-st-'+UI.liveTimesFocusEvId+'-'+UI.liveTimesFocusBoard
        :'lt-e-st-'+UI.liveTimesFocusEvId);
      if(fe){if(fe.scrollIntoView)fe.scrollIntoView({block:'center'});if(fe.focus)fe.focus();}
    }catch(e){}
  }
  if(UI.palette){const pi=document.getElementById('palette-input');if(pi&&document.activeElement!==pi){pi.focus();const L=pi.value.length;try{pi.setSelectionRange(L,L)}catch(e){}}}
  // Restore scroll for every matched surface — force instant restore (scrollBehavior
  // 'auto') so no CSS smooth-scroll setting can animate from 0, which reads as a
  // "jump to top" flash on every re-render.
  const sel=document.querySelectorAll('.modal,.tl-body,.enp-body,.modal-body,.rp-body,.lib-body');
  sel.forEach((el,i)=>{
    const cls=el.className.split(' ')[0];
    const v=_scroll[cls+':'+i];
    if(v!=null){const prev=el.style.scrollBehavior;el.style.scrollBehavior='auto';el.scrollTop=v;el.style.scrollBehavior=prev;}
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
  const body=isPrac?renderEditPrac(sess,t,flights,buf):renderEditComp(sess,t,timed,intro,buf,cat,sessUsed);
  return`<div class="modal-bg edit-bg" onclick="if(event.target===this)closeEdit()">
    <div class="modal modal-lg" onclick="event.stopPropagation()" style="max-height:calc(100vh - 48px)">
      <div class="modal-hd"><div><span class="modal-title">${esc(title)}</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)} · ${fdur(t.sessionEndMinutes-t.warmupStartMinutes)}</div></div><button class="modal-close" aria-label="Close" onclick="closeEdit()">×</button></div>
      <div class="modal-body" data-edit-body="1">${body}</div>
      <div class="modal-foot">
        <button class="btn btn-sm btn-gh" style="color:var(--red)" onclick="deleteSession('${sess.id}')">Delete session</button>
        <button class="btn btn-sm btn-gh" onclick="duplicateSession('${sess.id}')" title="Make a copy right below this one">Duplicate</button>
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
// Two tiers. Tier 1: identity (logo + full meet name) and the action cluster —
// the meet name gets flex room and is never crushed to an ellipsis by day tabs.
// Tier 2: a dedicated full-width day strip — day pills show weekday + date
// number (a master schedule spans multiple weeks, so bare weekday names repeat
// and become ambiguous), plus add-day and undo/redo, which pair naturally with
// day-level editing.
function renderBar(timed){
  const tz=TZS.find(t=>t.v===S.meet.timezone)||TZS[0];
  const st=S.publishStatus||'draft';
  const days=S.meet.days.map(d=>{const dt=dayEventTagOf(d);const dd=new Date(`${d.date}T00:00:00`);const wd=isNaN(dd)?d.date:dd.toLocaleDateString('en-US',{weekday:'short'});const dn=isNaN(dd)?'':dd.getDate();const dlk=dayLocked(d.id);return`<button class="dp ${d.id===UI.dayId?'active':''} ${dlk?'locked':''}" onclick="selectDay('${d.id}')" data-day="${d.id}" title="${fullDate(d.date)}${dt?' — '+dt.l:''}${dlk?' — locked, read-only':''}">${dt?`<span class="dp-tag-dot" style="background:${dt.c}"></span>`:''}<span class="dp-wd">${wd}</span><span class="dp-num">${dn}</span>${dlk?`<span class="dp-lock" aria-label="locked">\u{1F512}</span>`:''}</button>`}).join('');
  const conflicts=detectConflicts();
  const errCount=conflicts.filter(c=>c.sev==='err').length;
  const conflictBadge=conflicts.length?`<span style="position:absolute;top:-3px;right:-3px;min-width:15px;height:15px;border-radius:8px;background:${errCount?'var(--red)':'var(--warn)'};color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px">${conflicts.length}</span>`:'';
  return`<header class="bar">
    <div class="bar-top">
      <a class="bar-logo" href="../" title="Back to apps home" onclick="goHome(event)"><img src="../shared/images/logo-white-horizontal.png" alt="USA Diving" draggable="false"/></a>
      <div class="bar-meet" onclick="UI.modal='meet';render()">
        <div class="bar-meet-name">${esc(S.meet.name||'New Schedule')}</div>
        <div class="bar-meet-meta">${esc(S.meet.venue)}${S.meet.city?' · '+esc(S.meet.city):''}${tz?' · '+tz.s:''} · ${MEET_TYPES[S.meet.meetType]?.l||'Custom'}</div>
      </div>
      <div class="bar-right">
        <div class="bar-menu-wrap">
          <button class="bb icon-only ${UI.barMenu?'active':''}" onclick="UI.barMenu=!UI.barMenu;render()" title="Menu — overview, export, presentation, deck mode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/></svg></button>
          ${UI.barMenu?`<div class="bar-menu" onclick="event.stopPropagation()">
            <button class="bm-item" onclick="UI.barMenu=false;render();liveToggle()">${typeof liveOn==='function'&&liveOn()?'Turn off the live run sheet':'Live run sheet \u2014 record what actually happens'}</button>
            <button class="bm-item" onclick="UI.barMenu=false;UI.modal='overview';render()">Meet overview board</button>
            <button class="bm-item" onclick="UI.barMenu=false;UI.modal='export';render()">Export…</button>
            <button class="bm-item" onclick="UI.barMenu=false;render();openPresentation()">Presentation mode</button>
            <button class="bm-item" onclick="UI.barMenu=false;openImportBlocks()">Import blocks from another schedule…</button>
            <button class="bm-item" onclick="UI.barMenu=false;render();toggleTheme()">${document.documentElement.dataset.theme==='deck'?'Light mode':'Deck mode (dark)'}</button>
            <div class="bm-hint">Tip: Ctrl+K opens the command palette</div>
          </div>`:''}
        </div>
        ${(()=>{const ml=meetLocked();const n=lockedDayCount(),total=(S.meet.days||[]).length;
          const partial=!ml&&n>0;
          const lbl=ml?'Locked':partial?`${n} of ${total} days locked`:'Lock';
          const tip=ml
            ?'The whole schedule is locked and cannot be changed. Click to unlock (you will be asked to confirm).'
            :partial?`${n} day${n===1?'':'s'} locked individually. Click to lock the whole schedule so nothing anywhere can be changed.`
            :'Lock the whole schedule so nothing can be changed by accident. You can also lock a single day from the day toolbar.';
          return`<button class="bb lock-chip ${ml?'on':partial?'partial':''}" onclick="toggleMeetLock()" title="${esc(tip)}">${ml?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 017-2.6"/></svg>'}<span class="lock-lbl">${esc(lbl)}</span></button>`})()}
        ${(()=>{const h=computeHealth();const cls=h.score>=90?'good':h.score>=70?'ok':'bad';return`<button class="bb health-chip ${cls}" onclick="UI.modal='conflicts';render()" title="Schedule health — ${h.errs} error${h.errs===1?'':'s'}, ${h.warns} warning${h.warns===1?'':'s'}. Click for findings & one-click fixes."><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><span class="health-num">${h.score}</span></button>`})()}
        <button class="bar-status ${st}" onclick="cycleStatus()" title="Click to advance status">${STATUS_LBL[st]}</button>
        <div class="bar-sep"></div>
        <button class="bb" onclick="openEntries()">Entries</button>
        <button class="bb" onclick="openProjections()">Projections</button>
        <button class="bb" onclick="openLibrary()">Library</button>
        <button class="bb icon-only" onclick="openHistory()" title="Version history" ${S.currentLibraryId?'':'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg></button>
        <div class="bar-sep"></div>
        <button class="bb" onclick="saveSchedule()">Save</button>
        <button class="bb red" onclick="UI.modal='generate';render()">Generate</button>
      </div>
      <div class="bar-sync" ${sync.err?'onclick="retryCloudSync()" title="Click to retry cloud connection" style="cursor:pointer"':''}><div class="sync-pip ${sync.saving?'saving':sync.err?'error':''}"></div><span class="sync-lbl">${sync.saving?'Saving…':sync.err?'Offline — tap to retry':'Saved '+fmtRelativeTime(lastSavedAt||S.updatedAt)}</span></div>
    </div>
    <div class="bar-days-row">
      <div class="bar-days">${days}<button class="dp-add" aria-label="Add day" onclick="addDay()" title="Add day">+</button></div>
      <div class="bar-days-right">
        <button class="bb icon-only" onclick="undo()" title="Undo (Cmd+Z)" ${undoStack.length?'':'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg></button>
        <button class="bb icon-only" onclick="redo()" title="Redo (Cmd+Shift+Z)" ${redoStack.length?'':'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/></svg></button>
      </div>
    </div>
  </header>`;
}

// ── TIMELINE SUB-BAR ──────────────────────────────────────────────────
function renderTlBar(timed){
  const day=S.meet.days.find(d=>d.id===UI.dayId);
  const daySess=day?timedForDay(UI.dayId):[];
  const dayStart=daySess.length?Math.min(...daySess.map(s=>s.timing.warmupStartMinutes)):null;
  const dayEnd=daySess.length?Math.max(...daySess.map(s=>s.timing.sessionEndMinutes)):null;
  const comp=daySess.filter(s=>!s.isPractice).length;
  // On a locked day every editing control is removed rather than just disabled, so
  // there is nothing on screen to tap by mistake. Reading tools all stay.
  const lk=day?dayLocked(UI.dayId):false;
  const mlk=meetLocked();
  return`<div class="tl-bar ${lk?'is-locked':''}">
    <span class="tl-title">${day?fullDate(day.date):'Schedule'}</span>
    ${anyEventTags()?`<div class="evf-row">
      <button class="evf-chip ${!UI.eventFilter?'on':''}" onclick="UI.eventFilter=null;render()">All</button>
      ${EVENT_TAGS.map(t=>`<button class="evf-chip ${UI.eventFilter===t.k?'on':''}" style="--tagc:${t.c}" onclick="UI.eventFilter='${t.k}';render()">${t.s}</button>`).join('')}
      <button class="evf-chip ${UI.eventFilter==='shared'?'on':''}" onclick="UI.eventFilter='shared';render()">Shared</button>
    </div>`:''}
    <div class="tl-spacer"></div>
    ${day?`<button class="tl-hours ${blocksOutsideHours(UI.dayId)?'warn':''}" ${lk?'disabled':`onclick="openFacilityHours('${UI.dayId}')"`} title="Set when the pool opens and closes on this day"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> Pool ${f12(dayOpenFor(UI.dayId))} – ${f12(dayCloseFor(UI.dayId))}</button>`:''}
    ${dayStart!==null?`<span class="tl-day-info"><b>${comp}</b> sessions · <b>${f12(dayStart)}</b>–<b>${f12(dayEnd)}</b> · ${fdur(dayEnd-dayStart)}</span>`:''}
    ${daySess.length?`<button class="tl-iconbtn ${UI.timeScale?'active':''}" onclick="UI.timeScale=!UI.timeScale;render()" title="${UI.timeScale?'Switch to list view':'Switch to time-scale view — block heights match real durations'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 3v18M4 5h6M4 9h10M4 13h6M4 17h10M4 21h6"/></svg></button>`:''}
    ${daySess.length?`<button class="tl-iconbtn" onclick="openCoachHandout('${UI.dayId}')" title="Print coach handout — one page for the pool door"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></button>`:''}
    ${daySess.length?`<button class="tl-iconbtn" onclick="openCopyDay('${UI.dayId}')" title="Copy this day's schedule to another day"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>`:''}
    ${daySess.length>1&&!lk?`<button class="tl-textbtn" onclick="restackDay('${UI.dayId}')" title="Re-stack this day — start each block as soon as the one above it ends, plus its buffer. Start times you typed by hand will be replaced."><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18M3 12h18M3 19h18"/><path d="M17 9l3-3-3-3"/></svg> Re-stack times</button>`:''}
    ${daySess.length>1&&!lk?`<button class="tl-iconbtn" onclick="zeroBuffersForDay('${UI.dayId}')" title="Remove buffers for this day — pack all sessions back-to-back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h4M4 12h6M4 17h4M20 7h-4M20 12h-6M20 17h-4"/><path d="M14 12h-4"/></svg></button>`:''}
    ${typeof liveOn==='function'?`<button class="tl-textbtn tl-runsheet ${liveOn()?'on':''}" onclick="liveToggle()" title="${liveOn()?'The run sheet is on. Every session is showing Start, Finish and Edit times. Click to turn it off and show planned times only.':'Turn on the run sheet to record what actually happens \u2014 tap Start when a session begins, or type the time in by hand afterwards.'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/></svg> ${liveOn()?'Run sheet on':'Run sheet'}</button>`:''}
    <button class="tl-iconbtn ${UI.previewOpen?'active':''}" onclick="UI.previewOpen=!UI.previewOpen;if(UI.previewOpen){UI.editSessId=null;UI.entriesOpen=false}render()" title="Quick preview"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
    ${day?`<button class="tl-lockbtn ${lk?'on':''}" onclick="${mlk?'toggleMeetLock()':`toggleDayLock('${UI.dayId}')`}" title="${mlk?'The whole schedule is locked. Click to unlock everything.':lk?'This day is locked and cannot be changed. Click to unlock it.':'Lock this day so nothing on it can be changed by accident.'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/>${lk?'<path d="M8 11V7a4 4 0 018 0v4"/>':'<path d="M8 11V7a4 4 0 017-2.6"/>'}</svg><span>${lk?'Locked':'Lock day'}</span></button>`:''}
    ${lk?'':`<button class="tl-addbtn" onclick="showAddMenu()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> Add block</button>`}
  </div>`;
}

// Plain-English explanation of why the day cannot be edited, and the way out.
function renderLockBanner(){
  if(!dayLocked(UI.dayId))return'';
  const whole=meetLocked();
  return`<div class="lock-banner">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
    <div class="lb-txt">
      <b>${whole?'The whole schedule is locked':'This day is locked'}</b>
      <span>Nothing here can be changed \u2014 times, blocks, entries and pool hours are all held as they are. You can still preview, print, export and check schedule health.</span>
    </div>
    <button class="lb-btn" onclick="${whole?'toggleMeetLock()':`toggleDayLock('${UI.dayId}')`}">${whole?'Unlock schedule':'Unlock this day'}</button>
  </div>`;
}

// ── TIMELINE BODY ─────────────────────────────────────────────────────
function renderTimeline(timed){
  const day=S.meet.days.find(d=>d.id===UI.dayId);
  if(!day)return`<div class="tl-body"><div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No days yet</div><div class="empty-sub">Click + in the day bar to add a competition day</div></div></div>`;
  let sessions=timedForDay(UI.dayId);
  const warns=buildWarnings(UI.dayId);
  if(!sessions.length)return`<div class="tl-body"><div class="empty"><div class="empty-icon"><img src="../shared/images/diver-mark.svg?v=202607082245" alt="" style="width:36px;height:36px;object-fit:contain;opacity:.5"/></div><div class="empty-title">No sessions yet</div><div class="empty-sub">Click "Add block" to start building this day</div></div></div>`;
  sessions=filterByEvent(sessions);
  if(!sessions.length&&UI.eventFilter)return`<div class="tl-body"><div class="empty" style="margin-top:40px"><div class="empty-title">No ${esc(eventFilterLabel())} blocks this day</div><div class="empty-sub">Switch the event filter to All, or tag blocks via the editor ("Part of").</div></div></div>`;
  if(UI.timeScale)return renderTimelineScale(sessions,timed);
  const parts=[];
  // Group the day into rows: each block in the straight stack, plus any blocks
  // pinned to run at the same time as it, nested underneath. Gap chips only ever
  // measure stack-to-stack, so a side-by-side block never distorts them.
  const byId=new Map(sessions.map(s=>[s.id,s]));
  const attached=new Map();
  sessions.forEach(s=>{
    if(isParallel(s)&&s.parallelWith&&byId.has(s.parallelWith)){
      const l=attached.get(s.parallelWith)||[];l.push(s);attached.set(s.parallelWith,l);
    }
  });
  let prevStack=null;
  sessions.forEach(sess2=>{
    if(isParallel(sess2)&&sess2.parallelWith&&byId.has(sess2.parallelWith))return; // drawn under its partner
    if(!isParallel(sess2)&&prevStack){
      const gap=sess2.timing.warmupStartMinutes-prevStack.timing.sessionEndMinutes;
      parts.push(renderGapChip(prevStack,gap));
    }
    const along=(attached.get(sess2.id)||[]).map(p=>renderAlongsideBlock(p,timed,warns,sess2)).join('');
    parts.push(along?`<div class="tl-row">${renderCard(sess2,timed,warns)}${along}</div>`:renderCard(sess2,timed,warns));
    if(!isParallel(sess2))prevStack=sess2;
  });
  return`<div class="tl-body">
    ${parts.join('')}
    <div class="addrow"><div class="addrow-line"></div><button class="addrow-btn" onclick="showAddMenu()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><path d="M12 5v14M5 12h14"/></svg> Add session or practice</button><div class="addrow-line"></div></div>
  </div>`;
}

// Time-scale view: block heights are proportional to real durations against an
// hour ruler, so a 4-hour warm-up literally towers over a 1-hour meeting and
// dead time appears as visible empty space. Click any block to open it.
function renderTimelineScale(sessions,timed){
  const PX=1.1; // pixels per minute
  const rangeStart=Math.floor(Math.min(...sessions.map(s=>s.timing.warmupStartMinutes))/60)*60;
  const rangeEnd=Math.ceil(Math.max(...sessions.map(s=>s.timing.sessionEndMinutes))/60)*60;
  const H=(rangeEnd-rangeStart)*PX;
  let hours='';
  for(let m=rangeStart;m<=rangeEnd;m+=60){
    const y=(m-rangeStart)*PX;
    hours+=`<div class="ts-hour" style="top:${y}px"><span class="ts-hour-lbl">${f12(m)}</span><div class="ts-hour-line"></div></div>`;
    if(m+30<=rangeEnd)hours+=`<div class="ts-half" style="top:${(m+30-rangeStart)*PX}px"></div>`;
  }
  const cards=sessions.map((sess,i)=>{
    const t=sess.timing;
    const top=(t.warmupStartMinutes-rangeStart)*PX;
    const h=Math.max(30,(t.sessionEndMinutes-t.warmupStartMinutes)*PX);
    const isPrac=sess.isPractice;
    const isTrain=isPrac&&sess.title==='Open Training';
    const n=getSessNum(sess,timed);
    const name=isPrac?(sess.title||'Practice'):`Session ${n}`;
    const detail=isPrac?'':sess.events.map(ev=>evName(ev)).join(' · ');
    // Blocks set to run at the same time get their own right-hand lane so the two
    // read as genuinely simultaneous instead of as a collision.
    const along=isParallel(sess);
    const overlaps=!along&&i>0&&!isParallel(sessions[i-1])&&t.warmupStartMinutes<sessions[i-1].timing.sessionEndMinutes;
    const cls=`ts-card ${isPrac?(isTrain?'train':'prac'):'comp'}${overlaps?' overlap':''}${along?' along':''}`;
    const lane=along?'left:52%;right:0;':'';
    const dur=t.sessionEndMinutes-t.warmupStartMinutes;
    const resizable=isPrac&&!(sess.flights||[]).length&&!sess.fitToClose;
    return`<div class="${cls}" style="top:${top}px;height:${h}px;${lane}" data-ts-sess="${sess.id}" data-ts-dur="${dur}" onclick="openEdit('${sess.id}')" title="${esc(name)} · ${f12(t.warmupStartMinutes)}–${f12(t.sessionEndMinutes)}${along?' · runs at the same time as another block':''} · click to open">
      <div class="ts-card-name">${esc(name)}${along?' <span class="ts-along-flag">same time</span>':''}${overlaps?' <span class="ts-overlap-flag">Overlaps</span>':''}</div>
      ${h>=52&&detail?`<div class="ts-card-detail">${esc(detail)}</div>`:''}
      <div class="ts-card-time">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)} · ${fdur(dur)}</div>
      ${resizable?`<div class="ts-resize" title="Drag to change duration"></div>`:''}
    </div>`;
  }).join('');
  return`<div class="tl-body">
    <div class="ts-wrap" data-px="${PX}" style="height:${H+20}px">${hours}<div class="ts-cards">${cards}</div></div>
    <div class="addrow"><div class="addrow-line"></div><button class="addrow-btn" onclick="showAddMenu()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><path d="M12 5v14M5 12h14"/></svg> Add session or practice</button><div class="addrow-line"></div></div>
  </div>`;
}

// ── COACH HANDOUT ─────────────────────────────────────────────────────
// One print-perfect page per day: big times, blocks, events, flights. Built
// for taping to a pool door — large type, brand header, auto print dialog.
// ── COACH HANDOUT + MEET EXPORT PACK ─────────────────────────────────
// Shared per-day HTML builder used by both the single-day handout and the
// full-meet pack (one page per day, page-break between days → Save as PDF).
const HANDOUT_CSS=`
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;color:#0F172A;padding:28px 34px}
  .hd-page{page-break-after:always}
  .hd-page:last-child{page-break-after:auto}
  .hd-page+.hd-page{margin-top:40px}
  .hd-head{background:#171F69;color:#fff;padding:16px 22px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .hd-meet{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-weight:700;font-size:24px;text-transform:uppercase;letter-spacing:.02em;line-height:1.1}
  .hd-venue{font-size:11px;opacity:.75;margin-top:3px}
  .hd-date{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-weight:700;font-size:26px;text-align:right;line-height:1.05}
  .hd-accent{height:4px;border-radius:2px;background:linear-gradient(90deg,#E31937 0 33%,#fff 33% 66%,#009AC7 66% 100%);margin-bottom:14px}
  table{width:100%;border-collapse:collapse}
  td{padding:9px 10px;border-bottom:1.5px solid #E5E9F2;vertical-align:top}
  .hd-time{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-weight:700;font-size:22px;color:#171F69;white-space:nowrap;width:130px;line-height:1.1}
  .hd-time-end{display:block;font-size:13px;color:#94A3B8;font-weight:600}
  .hd-name{font-weight:700;font-size:15px;margin-bottom:2px}
  .hd-prac .hd-name{color:#15803D}
  .hd-wu{font-size:11px;color:#009AC7;font-weight:600;margin-bottom:3px}
  .hd-ev{display:flex;justify-content:space-between;font-size:12.5px;padding:1.5px 0}
  .hd-ev-time{color:#64748B;font-variant-numeric:tabular-nums;font-weight:600}
  .hd-flights{margin-top:3px}
  .hd-flight{font-size:12px;padding:1.5px 0;display:flex;align-items:center;gap:6px}
  .hd-flight-bar{display:inline-block;width:3px;height:12px;border-radius:2px}
  .hd-flight-time{color:#64748B;font-weight:600;margin-left:auto;font-variant-numeric:tabular-nums}
  .hd-note{font-size:11px;color:#64748B;margin-top:2px;font-style:italic}
  .hd-awards{color:#E31937;font-size:11px;font-weight:700;text-transform:uppercase}
  .hd-along{display:inline-block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#0A6E8C;background:#E3F4FA;border:1px solid #B9E2F0;border-radius:5px;padding:1px 6px;margin-left:6px;vertical-align:middle}
  .hd-foot{margin-top:14px;display:flex;justify-content:space-between;font-size:10px;color:#94A3B8}
  .hd-print{position:fixed;top:12px;right:12px;background:#171F69;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif}
  @media print{.hd-print{display:none}body{padding:0}@page{margin:12mm}}`;
// Printed schedules must say out loud that two things share the window, or a
// coach reading the page assumes the pool closed for the meeting.
function handoutAlongTag(sess,timed){
  if(!isParallel(sess))return'';
  const a=sess.parallelWith?(timed||[]).find(x=>x.id===sess.parallelWith):null;
  return` <span class="hd-along">${a?`at the same time as ${esc(sessLabelOf(a,timed))}`:'runs at the same time'}</span>`;
}
function buildHandoutDayHTML(day,timed,os){
  const sessions=filterByEvent(timed.filter(s=>s.dayId===day.id));
  if(!sessions.length)return'';
  const rows=sessions.map(sess=>{
    const t=sess.timing;
    if(sess.isPractice){
      const ft=t.flightTimes||[];
      const flights=ft.length?`<div class="hd-flights">${ft.map(f=>`<div class="hd-flight"><span class="hd-flight-bar" style="background:${f.color||'#171F69'}"></span>${esc(f.name)} <span class="hd-flight-time">${f12(f.startMinutes)}–${f12(f.endMinutes)}</span></div>`).join('')}</div>`:'';
      const note=(sess.events&&sess.events[0]&&sess.events[0].notes)||'';
      return`<tr class="hd-prac"><td class="hd-time">${f12(t.warmupStartMinutes)}<span class="hd-time-end">– ${f12(t.sessionEndMinutes)}</span></td><td><div class="hd-name">${esc(sess.title||'Practice')}${handoutAlongTag(sess,timed)}</div>${flights}${note&&note!==sess.title?`<div class="hd-note">${esc(note)}</div>`:''}</td></tr>`;
    }
    const n=getSessNum(sess,timed);
    const evs=(t.events||[]).map(ev=>`<div class="hd-ev"><span>${esc(evName(ev))}</span><span class="hd-ev-time">${f12(ev.eventStartMinutes)}</span></div>`).join('');
    const wu=os.showWarmup!==false?`<div class="hd-wu">Warm-up ${f12(t.warmupStartMinutes)} – ${f12(t.warmupEndMinutes)}</div>`:'';
    return`<tr><td class="hd-time">${f12(t.eventStartMinutes)}<span class="hd-time-end">– ${f12(t.sessionEndMinutes)}</span></td><td><div class="hd-name">Session ${n}${handoutAlongTag(sess,timed)}${sess.awardsEnabled?' <span class="hd-awards">+ Awards</span>':''}</div>${wu}${evs}</td></tr>`;
  }).join('');
  return`<div class="hd-page">
<div class="hd-head"><div><div class="hd-meet">${esc(S.meet.name||'Schedule')}</div>${S.meet.venue?`<div class="hd-venue">${esc(S.meet.venue)}${S.meet.city?' · '+esc(S.meet.city):''}${eventFilterLabel()?' · '+eventFilterLabel():''}</div>`:''}</div><div class="hd-date">${fullDate(day.date)}</div></div>
<div class="hd-accent"></div>
<table>${rows}</table>
<div class="hd-foot"><span>${os.showSubjectToChange!==false?'All times subject to change':''}</span><span>USA Diving · printed ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
</div>`;
}
function _openHandoutWindow(title,pagesHTML){
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${HANDOUT_CSS}</style></head><body>
<button class="hd-print" onclick="window.print()">Print</button>
${pagesHTML}
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},400)})<\/script>
</body></html>`;
  const w=window.open('','_blank');
  if(!w){toast('Pop-up blocked — allow pop-ups for this site to print handouts');return;}
  w.document.write(html);w.document.close();
}
function openCoachHandout(dayId){
  const day=S.meet.days.find(d=>d.id===dayId);if(!day)return;
  const timed=allTimed();
  const page=buildHandoutDayHTML(day,timed,S.outputSettings||{});
  if(!page){toast('Nothing on this day yet');return;}
  _openHandoutWindow(`${S.meet.name||'Schedule'} — ${shortDate(day.date)}`,page);
}
function openMeetHandout(){
  const timed=allTimed();
  const os=S.outputSettings||{};
  const pages=S.meet.days.map(d=>buildHandoutDayHTML(d,timed,os)).filter(Boolean).join('');
  if(!pages){toast('Nothing scheduled yet');return;}
  _openHandoutWindow(`${S.meet.name||'Schedule'} — full meet`,pages);
}
// ── CLUB ITINERARIES (per-team personal schedules) ───────────────────
// One print pack: each club's divers with their personal meet schedule —
// report (warm-up) time, approximate dive time, and event, chronologically
// across the whole meet. Built from the projected field + current timings.
function openClubItineraries(){
  if(!UI.projRows||!UI.projRows.length){toast('Projected field not loaded yet — try again in a moment');ensureProjDataLoaded();return;}
  const timed=allTimed();
  // diverKey -> {row, apps:[{dayId,...}]} across all days
  const byDiver=new Map();
  S.meet.days.forEach(day=>{
    diverAppearancesForDay(day.id,filterByEvent(timed)).forEach((d,k)=>{
      if(!byDiver.has(k))byDiver.set(k,{row:d.row,apps:[]});
      d.apps.forEach(a=>byDiver.get(k).apps.push({...a,dayId:day.id}));
    });
  });
  if(!byDiver.size){toast('No competition events matched the projected field yet');return;}
  // Group by team
  const byTeam=new Map();
  byDiver.forEach(d=>{
    const team=d.row.team||'Unaffiliated';
    if(!byTeam.has(team))byTeam.set(team,[]);
    byTeam.get(team).push(d);
  });
  const dayName=id=>{const d=S.meet.days.find(x=>x.id===id);return d?shortDate(d.date):''};
  const teams=[...byTeam.keys()].sort((a,b)=>a.localeCompare(b));
  const pages=teams.map(team=>{
    const divers=byTeam.get(team).sort((a,b)=>(a.row.athlete||'').localeCompare(b.row.athlete||''));
    const rows=divers.map(d=>{
      const apps=d.apps.sort((a,b)=>{const da=S.meet.days.findIndex(x=>x.id===a.dayId),db=S.meet.days.findIndex(x=>x.id===b.dayId);return da!==db?da-db:a.evStart-b.evStart});
      const lines=apps.map(a=>`<div class="it-line"><span class="it-day">${dayName(a.dayId)}</span><span class="it-report">report ${f12(a.warmupStart)}</span><span class="it-ev">${esc(a.evName)} <span class="it-sess">(${a.sessLabel} · dives ~${f12(a.evStart)})</span></span></div>`).join('');
      return`<div class="it-diver"><div class="it-name">${esc(d.row.athlete||'Unknown')}</div>${lines}</div>`;
    }).join('');
    return`<div class="hd-page">
<div class="hd-head"><div><div class="hd-meet">${esc(S.meet.name||'Schedule')}</div><div class="hd-venue">Club itinerary — projected field · times subject to change</div></div><div class="hd-date" style="font-size:20px">${esc(team)}</div></div>
<div class="hd-accent"></div>
${rows}
<div class="hd-foot"><span>Report time = session warm-up start · dive times are estimates</span><span>USA Diving · printed ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
</div>`;
  }).join('');
  const extraCss=`
  .it-diver{padding:8px 2px;border-bottom:1.5px solid #E5E9F2;page-break-inside:avoid}
  .it-name{font-weight:800;font-size:14px;margin-bottom:3px}
  .it-line{display:flex;gap:14px;font-size:12px;padding:2px 0;align-items:baseline}
  .it-day{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-weight:700;font-size:14px;color:#171F69;min-width:72px}
  .it-report{color:#009AC7;font-weight:700;min-width:110px;font-variant-numeric:tabular-nums}
  .it-ev{color:#0F172A}
  .it-sess{color:#94A3B8;font-size:11px}`;
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(S.meet.name||'Schedule')} — Club itineraries</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${HANDOUT_CSS}${extraCss}</style></head><body>
<button class="hd-print" onclick="window.print()">Print</button>
${pages}
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},600)})<\/script>
</body></html>`;
  const w=window.open('','_blank');
  if(!w){toast('Pop-up blocked — allow pop-ups for this site to print itineraries');return;}
  w.document.write(html);w.document.close();
}

// ── CLUB ITINERARIES END ─────────────────────────────────────────────

// ── EXCEL WORKBOOK EXPORT (one sheet per day + summary) ──────────────
let _sheetJsLoading=null;
function loadSheetJS(){
  if(window.XLSX)return Promise.resolve();
  if(_sheetJsLoading)return _sheetJsLoading;
  _sheetJsLoading=new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=()=>res();
    s.onerror=()=>{_sheetJsLoading=null;rej(new Error('Could not load the Excel library — check your internet connection'))};
    document.head.appendChild(s);
  });
  return _sheetJsLoading;
}
function _sheetNameFor(date){
  // Excel sheet names: max 31 chars, no : \ / ? * [ ]
  return shortDate(date).replace(/[:\\\/\?\*\[\]]/g,'').slice(0,31);
}
async function exportMeetExcel(){
  toast('Building Excel workbook…');
  try{await loadSheetJS();}catch(e){toast(e.message);return;}
  const timed=allTimed();
  const os=S.outputSettings||{};
  const wb=XLSX.utils.book_new();
  // Summary sheet
  const sum=[[S.meet.name||'Schedule'],[S.meet.venue?`${S.meet.venue}${S.meet.city?' · '+S.meet.city:''}`:''],[],['Day','First start','Last end','Blocks','Competition sessions','Practice blocks']];
  S.meet.days.forEach(day=>{
    const ds=filterByEvent(timed.filter(s=>s.dayId===day.id));
    if(!ds.length){sum.push([fullDate(day.date),'—','—',0,0,0]);return;}
    const first=Math.min(...ds.map(s=>s.timing.warmupStartMinutes));
    const last=Math.max(...ds.map(s=>s.timing.sessionEndMinutes));
    sum.push([fullDate(day.date),f12(first),f12(last),ds.length,ds.filter(s=>!s.isPractice).length,ds.filter(s=>s.isPractice).length]);
  });
  sum.push([]);sum.push([os.showSubjectToChange!==false?'All times subject to change':'']);
  const wsSum=XLSX.utils.aoa_to_sheet(sum);
  wsSum['!cols']=[{wch:26},{wch:12},{wch:12},{wch:8},{wch:20},{wch:15}];
  XLSX.utils.book_append_sheet(wb,wsSum,'Summary');
  // One sheet per day
  S.meet.days.forEach(day=>{
    const ds=filterByEvent(timed.filter(s=>s.dayId===day.id));
    const aoa=[[`${S.meet.name||'Schedule'}${eventFilterLabel()?' — '+eventFilterLabel():''} — ${fullDate(day.date)}`],[],['Start','End','Block','Detail','Duration','Notes']];
    ds.forEach(sess=>{
      const t=sess.timing;
      if(sess.isPractice){
        aoa.push([f12(t.warmupStartMinutes),f12(t.sessionEndMinutes),sess.title||'Practice','',fdur(t.sessionEndMinutes-t.warmupStartMinutes),(sess.events?.[0]?.notes&&sess.events[0].notes!==sess.title)?sess.events[0].notes:'']);
        (t.flightTimes||[]).forEach(f=>aoa.push([f12(f.startMinutes),f12(f.endMinutes),'','  '+f.name,fdur(f.endMinutes-f.startMinutes),'']));
      }else{
        const n=getSessNum(sess,timed);
        aoa.push([f12(t.eventStartMinutes),f12(t.sessionEndMinutes),`Session ${n}${sess.awardsEnabled?' (+ Awards)':''}`,os.showWarmup!==false?`Warm-up ${f12(t.warmupStartMinutes)}–${f12(t.warmupEndMinutes)}`:'',fdur(t.sessionEndMinutes-t.warmupStartMinutes),'']);
        (t.events||[]).forEach(ev=>aoa.push([f12(ev.eventStartMinutes),'','','  '+evName(ev)+(entryValue(ev)?` — ${entryValue(ev)} divers`:''),'','']));
      }
    });
    if(!ds.length)aoa.push(['(nothing scheduled)']);
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols']=[{wch:10},{wch:10},{wch:24},{wch:44},{wch:10},{wch:30}];
    XLSX.utils.book_append_sheet(wb,ws,_sheetNameFor(day.date));
  });
  const fname=`${(S.meet.name||'Schedule').replace(/[\\\/\?\*\[\]:]/g,'')} schedule.xlsx`;
  XLSX.writeFile(wb,fname);
  toast('Excel downloaded');
}
function renderExportModal(){
  const dayCount=S.meet.days.length;
  const blockCount=S.sessions.length;
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><div><span class="modal-title">Export the meet</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${dayCount} day${dayCount===1?'':'s'} · ${blockCount} block${blockCount===1?'':'s'}</div></div><button class="modal-close" aria-label="Close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="move-btn" onclick="closeModal();openMeetHandout()"><span><strong>Full meet handout</strong><br><span style="font-size:11px;color:var(--tx3)">Every day as a one-page sheet — use the print dialog's "Save as PDF" for a file</span></span></button>
        <button class="move-btn" onclick="closeModal();exportMeetExcel()"><span><strong>Excel workbook (.xlsx)</strong><br><span style="font-size:11px;color:var(--tx3)">One sheet per day plus a meet summary — for ops staff who live in spreadsheets</span></span></button>
        <button class="move-btn" onclick="closeModal();openCoachHandout(UI.dayId)"><span><strong>This day only (print)</strong><br><span style="font-size:11px;color:var(--tx3)">Same one-pager as the printer button on the day toolbar</span></span></button>
        <button class="move-btn" onclick="closeModal();openClubItineraries()"><span><strong>Club itineraries (print)</strong><br><span style="font-size:11px;color:var(--tx3)">One page per club — every diver's personal report times and events, whole meet</span></span></button>
        <button class="move-btn" onclick="closeModal();openPresentation()"><span><strong>Presentation mode</strong><br><span style="font-size:11px;color:var(--tx3)">Full-screen scoreboard walkthrough — one day per screen, arrow keys to move</span></span></button>
        ${anyEventTags()?`<button class="move-btn" onclick="closeModal();splitByEvent()"><span><strong>Split into per-event schedules</strong><br><span style="font-size:11px;color:var(--tx3)">Creates a separate saved schedule for each tagged event (Junior / Senior / Qualifier) — this master stays untouched</span></span></button>`:''}
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-p" onclick="closeModal()">Close</button></div>
  </div>`;
}

// Gap chip: makes the invisible time between two sessions visible and editable
// right where it lives on the timeline. Clicking sets the PRECEDING session's
// buffer (updSess reflows the day, so following sessions shift accordingly).
// A block that runs at the same time as another, drawn indented beneath its
// partner with a rail joining the two so the shared window is obvious at a glance.
function renderAlongsideBlock(p,timed,warns,anchor){
  const t=p.timing;
  const label=anchor?`Same time as ${esc(sessLabelOf(anchor,timed))}`:'Runs alongside \u2014 fixed time';
  return`<div class="tl-along">
    <div class="along-rail"></div>
    <div class="along-body">
      <div class="along-chip" onclick="openEdit('${p.id}')" title="Both blocks run together \u2014 this one does not take its own slot in the day. Click to change.">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:11px;height:11px"><path d="M4 7h7M4 17h7M17 4v6M17 14v6"/><path d="M13 7h7M13 17h7"/></svg>
        ${label} · ${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)}
      </div>
      ${renderCard(p,timed,warns)}
    </div>
  </div>`;
}
function renderGapChip(prevSess,gap){
  if(gap<0)return`<div class="gap-chip overlap" onclick="askGapChange('${prevSess.id}',${gap})" title="These sessions overlap — click to fix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:11px;height:11px"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z"/></svg> Overlapping by ${fdur(-gap)} — click to fix</div>`;
  if(gap===0)return`<div class="gap-chip zero" onclick="askGapChange('${prevSess.id}',0)" title="Back-to-back — click to add a gap">back-to-back</div>`;
  return`<div class="gap-chip" onclick="askGapChange('${prevSess.id}',${gap})" title="Click to change this gap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> ${fdur(gap)} gap</div>`;
}
function askGapChange(prevSessId,currentGap){
  askPrompt({title:'Gap before the next session',message:'Minutes of open time between these two sessions. 0 = back-to-back.',inputType:'number',defaultValue:Math.max(0,currentGap),confirmText:'Set gap',onConfirm:(v)=>{if(v!=='')setBuffer(prevSessId,Math.max(0,Number(v)||0))}});
}

function renderCard(sess,timed,warns){
  const t=sess.timing;const isPrac=sess.isPractice;
  const isEditing=UI.editSessId===sess.id;
  const n=getSessNum(sess,timed);
  const isTraining=isPrac&&sess.title==='Open Training';
  const along=isParallel(sess);
  const alongPill=along?`<span class="along-pill" title="Runs at the same time as another block \u2014 it does not take its own slot in the day">Same time</span>`:'';

  // ── PRACTICE / TRAINING CARDS — distinct, informative layout ──
  if(isPrac){
    const flights=t.flightTimes||[];
    const dur=t.sessionEndMinutes-t.warmupStartMinutes;
    const typeColor=isTraining?'var(--train)':'var(--prac)';
    const typeBg=isTraining?'var(--train-bg)':'var(--prac-bg)';
    const typeLabel='Open Training';
    return`<div class="sc ${isTraining?'train':'prac'} pcard ${isEditing?'editing':''} ${along?'is-along':''}" id="sc-${sess.id}">
      <div class="pcard-hd" onclick="openEdit('${sess.id}')" style="background:${typeBg}">
        <div class="pcard-main">
          <div class="pcard-name" style="color:${typeColor}">${esc(sess.title||typeLabel)}${alongPill}${sess.hideFromPublic?`<span style="font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#B45309;background:#FEF3C7;border:1px solid #FDE68A;border-radius:5px;padding:1px 6px;margin-left:8px;vertical-align:middle" title="Internal only — will not appear on the public schedule">Internal</span>`:''}${eventTagsOf(sess).map(t=>`<span class="tag-pill" style="--tagc:${t.c}">${t.s}</span>`).join('')}</div>
          <div class="pcard-meta">${sess.fitToClose?`Until facility close · ${fdur(dur)}`:flights.length?`${flights.length} flight${flights.length>1?'s':''} · ${fdur(dur)}`:/meeting/i.test(sess.title||'')?fdur(dur):`Open pool · ${fdur(dur)}`}</div>
        </div>
        <div class="pcard-time">
          <div class="pcard-time-range" style="color:${typeColor}">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)}${sess.fitToClose?' 🔒':''}</div>
          <div class="pcard-time-dur">${sess.fitToClose?'fits to close':fdur(dur)}</div>
        </div>
        <div class="sc-actions">
          <button class="sc-act" onclick="event.stopPropagation();nudgeSession('${sess.id}',-1)" title="Move earlier in day"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg></button>
          <button class="sc-act" onclick="event.stopPropagation();nudgeSession('${sess.id}',1)" title="Move later in day"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></button>
          <button class="sc-act drag-handle" onclick="event.stopPropagation();openMoveDialog('${sess.id}')" title="Move to another day or spot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg></button>
          <button class="sc-act" onclick="event.stopPropagation();openEdit('${sess.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        </div>
      </div>
      ${typeof liveSessRow==='function'?liveSessRow(sess,t):''}
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

  return`<div class="sc ${cardClass} ${isEditing?'editing':''} ${along?'is-along':''}" id="sc-${sess.id}">
    <div class="sc-hd" onclick="openEdit('${sess.id}')">
      <span class="badge ${badgeClass}">${badgeTxt}</span>
      <div class="sc-titles">
        <div class="sc-name">Session ${n}${alongPill}${eventTagsOf(sess).map(t=>`<span class="tag-pill" style="--tagc:${t.c}">${t.s}</span>`).join('')}</div>
        <div class="sc-sub">${esc(sub)}</div>
      </div>
      <div class="sc-time">
        <div class="sc-time-main">${f12r(t.warmupStartMinutes,t.sessionEndMinutes)}</div>
        <div class="sc-time-sub">${fdur(t.sessionEndMinutes-t.warmupStartMinutes)} · ${sess.events.reduce((a,e)=>a+entryValue(e),0)} athletes</div>
      </div>
      <div class="sc-actions">
        <button class="sc-act" onclick="event.stopPropagation();nudgeSession('${sess.id}',-1)" title="Move earlier in day"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg></button>
        <button class="sc-act" onclick="event.stopPropagation();nudgeSession('${sess.id}',1)" title="Move later in day"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></button>
        <button class="sc-act drag-handle" onclick="event.stopPropagation();openMoveDialog('${sess.id}')" title="Move to another day or spot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg></button>
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
  return`${typeof liveSessRow==='function'?liveSessRow(sess,t):''}<div class="sc-events">${(t.events||[]).map(ev=>{
    const split=ev.manualSplit&&!isPlatform(ev.apparatus)&&ev.round!=='Final';
    const dur={evMin:ev.evMin,rawMin:ev.rawMin};
    const divers=ev._combined?ev._combinedDivers:entryValue(ev);
    // Split recommended when the event would run 2h30m+ unsplit, or has 40+ divers.
    const needsSplit=(ev.rawMin>=150||divers>=40)&&ev.round!=='Final'&&!ev._combined;
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
      ${evRound(ev)&&ev.round!=='Custom Block'&&!ev._combined?`<span class="ev-badge ${roundCls}">${esc(evRound(ev))}</span>`:''}
      ${typeof liveEvCtl==='function'?liveEvCtl(sess,ev):''}
      ${(!isPlatform(ev.apparatus)&&ev.round!=='Final'&&!ev._combined)?`<button class="ev-splitbtn ${split?'on':needsSplit?'rec':''}" onclick="event.stopPropagation();toggleSplit('${sess.id}','${ev.id}')" title="${split?'Remove split':needsSplit?'Split recommended':'Toggle split'}">${split?'÷ Split':needsSplit?'⚠ Split?':'Split'}</button>`:''}
      ${split&&(isPlatform(ev.apparatus)||ev.round==='Final'||ev._combined)?`<span class="ev-badge split">Split</span>`:''}
      <span class="ev-time">${f12r(ev.eventStartMinutes,ev.eventEndMinutes)}</span>
      <button class="ev-rm" aria-label="Remove this event" onclick="event.stopPropagation();removeEv('${sess.id}','${ev.id}')" title="Remove">×</button>
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
  const body=isPrac?renderEditPrac(sess,t,flights,buf):renderEditComp(sess,t,timed,intro,buf,cat,sessUsed);
  return`<div class="edit-panel open">
    <div class="ep-head">
      <div><div class="ep-title">${esc(title)}</div><div class="ep-sub">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)} · ${fdur(t.sessionEndMinutes-t.warmupStartMinutes)}</div></div>
      <button class="ep-close" aria-label="Close" onclick="closeEdit()">×</button>
    </div>
    <div class="ep-body" data-edit-body="1">${body}</div>
    <div class="ep-foot">
      <button class="btn btn-d btn-sm btn-gh" onclick="deleteSession('${sess.id}')">Delete</button>
      <button class="btn btn-sm btn-gh" onclick="duplicateSession('${sess.id}')" title="Make a copy right below this one">Duplicate</button>
      <button class="btn btn-sm btn-gh" onclick="openMoveDialog('${sess.id}')">Move…</button>
      <div style="flex:1"></div>
      <button class="btn btn-sm" onclick="closeEdit()">Done</button>
    </div>
  </div>`;
}

// ── "RUNS AT THE SAME TIME" CONTROL ───────────────────────────────────
// Plain-English editor control shared by practice blocks and competition
// sessions. Off by default: the day behaves exactly as it always has. Switch it
// on and the block steps out of the stack and shares a window with a partner —
// e.g. the NCAA coaches meeting on the deck while open training keeps running.
function renderParallelBox(sess){
  const timed=allTimed();
  const on=isParallel(sess);
  const me=timed.find(x=>x.id===sess.id);
  const anchor=parallelAnchorOf(S,sess);
  // Any other block on the same day is a valid partner, minus anything that would
  // make two blocks chase each other in a circle.
  const choices=timed.filter(x=>x.dayId===sess.dayId&&x.id!==sess.id&&!parallelWouldLoop(S,sess.id,x.id));
  const opts=[`<option value="">Fixed time — not paired with a block</option>`].concat(
    choices.map(o=>`<option value="${o.id}" ${anchor&&anchor.id===o.id?'selected':''}>${esc(sessLabelOf(o,timed))} · ${f12(o.timing.warmupStartMinutes)}–${f12(o.timing.sessionEndMinutes)}</option>`)
  ).join('');
  const offset=Number(sess.parallelOffset||0);
  let detail='';
  if(on&&me){
    const partner=anchor?timed.find(x=>x.id===anchor.id):null;
    const spills=partner&&me.timing.sessionEndMinutes>partner.timing.sessionEndMinutes;
    detail=`<div class="along-note">
      Runs <strong>${f12(me.timing.warmupStartMinutes)} – ${f12(me.timing.sessionEndMinutes)}</strong>${partner?` alongside <strong>${esc(sessLabelOf(partner,timed))}</strong> (${f12(partner.timing.warmupStartMinutes)} – ${f12(partner.timing.sessionEndMinutes)})`:''}.
      It does not push anything later, so the buffer setting has no effect while this is on.
      ${spills?`<div class="along-warn">⚠ This block ends after ${esc(sessLabelOf(partner,timed))} does — it will overlap whatever comes next.</div>`:''}
    </div>`;
  }
  return`<div class="along-box ${on?'on':''}">
    <label class="along-toggle"><input type="checkbox" ${on?'checked':''} onchange="toggleParallel('${sess.id}')"/>
      <span><strong>Run this at the same time as another block</strong><span class="along-hint">For things that genuinely share the facility — a meeting on the deck while the pool stays open. The rest of the day closes up as if this block weren't there.</span></span></label>
    ${on?`<div class="along-cfg">
      <div class="fg"><label class="fl">Same time as</label>
        <select class="fi" onchange="setParallelPartner('${sess.id}',this.value)">${opts}</select></div>
      <div class="fg"><label class="fl">Starts</label>
        <div class="along-off">
          <input class="fi" type="number" min="0" step="5" value="${offset}" ${anchor?'':'disabled'} onchange="setParallelOffset('${sess.id}',this.value)"/>
          <span>${anchor?'min after that block begins (0 = together)':'set the start time above'}</span>
        </div></div>
    </div>${detail}`:''}
  </div>`;
}
function renderEditPrac(sess,t,flights,buf){
  buf=Number(buf!=null?buf:(sess.bufferMinutes||0));
  if(flights.length){ensureProjDataLoaded();ensureEntrantsLoaded();}
  const showCnt=UI.showFlightCounts!==false;
  const ewcChip=(f,v)=>`<button class="chip ${f.ewcMeet===v?'on':''}" onclick="updFlightTag('${sess.id}','${f.id}','ewcMeet','${f.ewcMeet===v?'':v}')">${v}</button>`;
  const zoneChip=(f,v)=>`<button class="chip ${f.zone===v?'on':''}" style="height:24px;padding:0 8px;font-size:10px" onclick="updFlightTag('${sess.id}','${f.id}','zone','${f.zone===v?'':v}')">${v}</button>`;
  const bufChips=[0,5,10,15].map(v=>`<button class="chip ${buf===v?'on-g':''}" onclick="setBuffer('${sess.id}',${v})">${v===0?'None':v+'m'}</button>`).join('');
  return`
    <div class="fg"><label class="fl">Block name</label><input id="ep-title-${sess.id}" class="fi" value="${esc(sess.title||'')}" placeholder="Open Training" onchange="updSess('${sess.id}','title',this.value)"/></div>
    <div class="fg2" style="grid-template-columns:1.1fr .8fr 1.1fr">
      <div class="fg"><label class="fl">Start time</label><input id="ep-start-${sess.id}" class="fi" type="time" value="${f24(sess.warmupStartMinutes)}" onchange="updSess('${sess.id}','warmupStartMinutes',pt(this.value))"/></div>
      <div class="fg"><label class="fl">Duration ${sess.fitToClose?'🔒':''}</label>${sess.fitToClose?`<div class="fi" style="background:var(--surf3);color:var(--tx2);display:flex;align-items:center;font-weight:600" title="Auto-fit to facility close">${fdur(t.fitDur||0)}</div>`:flights.length?`<div class="fi" style="background:var(--surf3);color:var(--tx2);display:flex;align-items:center;font-weight:600" title="Set by the flights below">${fdur(flights.reduce((s,f)=>s+Number(f.durationMinutes||0),0))}</div>`:`<input id="ep-dur-${sess.id}" class="fi" type="number" min="15" step="15" value="${sess.events[0]?.customDurationMinutes||90}" onchange="updEv('${sess.id}','${sess.events[0]?.id||''}','customDurationMinutes',this.value)"/>`}</div>
      <div class="fg"><label class="fl">End time ${sess.fitToClose?'🔒':''}</label>${sess.fitToClose?`<div class="fi" style="background:var(--surf3);color:var(--tx2);display:flex;align-items:center;font-weight:600" title="Fixed at facility close">${f12(dayCloseFor(sess.dayId))}</div>`:flights.length?`<div class="fi" style="background:var(--surf3);color:var(--tx2);display:flex;align-items:center;font-weight:600" title="Set by the flights below">${f12(t.sessionEndMinutes)}</div>`:`<input id="ep-end-${sess.id}" class="fi" type="time" value="${f24(t.sessionEndMinutes)}" onchange="setPracEndTime('${sess.id}',pt(this.value))" title="Type when it should end — duration adjusts automatically"/>`}</div>
    </div>
    <div class="fitclose-box">
      <div class="fitclose-toggle-row">
        <label class="fitclose-label"><input type="checkbox" ${sess.fitToClose?'checked':''} onchange="toggleFitToClose('${sess.id}')"/> Fit to facility close time</label>
        <div class="fitclose-time ${sess.fitToClose?'':'dim'}">
          <span>Facility closes</span>
          <input class="fi-sm" type="time" value="${f24(dayCloseFor(sess.dayId))}" onchange="setDayClose('${sess.dayId}',pt(this.value))"/>
        </div>
      </div>
      <div class="fitclose-toggle-row" style="margin-top:6px">
        <label class="fitclose-label" title="Keeps this block on your working schedule and the Operations output, but leaves it off the Public, Athletes, and Judges schedules"><input type="checkbox" ${sess.hideFromPublic?'checked':''} onchange="toggleHideFromPublic('${sess.id}')"/> Internal only — leave off the public schedule</label>
      </div>
      ${sess.fitToClose?`<div class="fitclose-note">Ends at ${f12(dayCloseFor(sess.dayId))} — duration adjusts automatically as earlier events shift.${(t.fitDur||0)<=0?' <strong style="color:var(--red)">Starts after close — no time left.</strong>':''}</div>`:''}
    </div>
    ${renderParallelBox(sess)}
    <div class="fg"><label class="fl">Buffer after this block</label><div class="chiprow">${bufChips}<button class="chip" onclick="askPrompt({title:'Buffer after this block (min)',message:'Minutes before the next session starts.',inputType:'number',defaultValue:sess.bufferMinutes||0,confirmText:'Set',onConfirm:(v)=>{if(v!=='')setBuffer('${sess.id}',Number(v)||0)}})">Custom</button></div></div>
    <div class="fg"><label class="fl">Part of <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">(tap to toggle — pick more than one if this block serves multiple events)</span></label><div class="chiprow"><button class="chip ${!sessTags(sess).length?'on':''}" onclick="clearSessTags('${sess.id}')" title="Shared — appears in every event's schedule">Shared</button>${EVENT_TAGS.map(t=>`<button class="chip ${sessTags(sess).includes(t.k)?'on':''}" onclick="toggleSessTag('${sess.id}','${t.k}')">${t.l}</button>`).join('')}</div></div>
    <div class="fdiv"></div>
    <div class="fsec" style="display:flex;align-items:center;justify-content:space-between">
      <span>Flights <span style="font-size:10px;font-weight:400;color:var(--tx3)">optional — times auto-stack</span></span>
      ${flights.length?`<label style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:600;color:var(--tx3);cursor:pointer"><input type="checkbox" ${showCnt?'checked':''} onchange="UI.showFlightCounts=this.checked;patchPracEditModal()"/> Show athlete counts</label>`:''}
    </div>
    <p style="font-size:11px;color:var(--tx3);margin-bottom:10px">e.g. "Zone C — 45 min" then "Zone D — 45 min" — tag a flight below and its count fills in automatically</p>
    ${flights.length?`<div style="margin-bottom:8px">${flights.map((f,i)=>{const ft=(t.flightTimes||[])[i]||{};const cr=athleteCountForFlight(f);const cntLbl=cr==null?(UI.projRows==null?'Loading counts…':'Tag a zone or E/W/C to see a count'):`${cr.total} athlete${cr.total===1?'':'s'}${cr.registered!=null?` · ${cr.registered} registered`:''}`;return`<div class="flight-row">
      <div class="flight-bar" style="background:${f.color||'#171F69'}"></div>
      <input id="flight-name-${f.id}" class="flight-name-inp" value="${esc(f.name)}" placeholder="Flight name" onchange="updFlight('${sess.id}','${f.id}','name',this.value)"/>
      <input id="flight-dur-${f.id}" class="flight-dur-inp" type="number" min="5" step="5" value="${f.durationMinutes||45}" onchange="updFlight('${sess.id}','${f.id}','durationMinutes',this.value)"/>
      <span style="font-size:10px;color:var(--tx3)">min</span>
      ${[45,60,90].map(v=>`<button class="fdur-chip ${Number(f.durationMinutes)===v?'on':''}" onclick="updFlight('${sess.id}','${f.id}','durationMinutes',${v})">${v}</button>`).join('')}
      <div class="flight-time-lbl">${ft.startMinutes!==undefined?`${f12(ft.startMinutes)}–${f12(ft.endMinutes)}`:''}</div>
      <button class="flight-rm" aria-label="Remove this flight" onclick="removeFlight('${sess.id}','${f.id}')">×</button>
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
      <div class="modal-hd"><span class="modal-title">${isCombine?'Combine events':'Run simultaneously'}</span><button class="modal-close" aria-label="Close" onclick="UI.combinePicker=null;render()">×</button></div>
      <div class="modal-body">
        <p style="font-size:12.5px;color:var(--tx2);line-height:1.5;margin-bottom:12px">${isCombine?'Select 2–3 events to merge into one. They run together as a single event — each diver keeps their own dive count and the times add up. The first one you pick is the lead.':'Select events that run at the same time on separate boards. They share a start time — this is distinct from Combined, where events merge into one.'}</p>
        <div class="cpick-list">${sess.events.filter(e=>!e.combinedWith).map(ev=>{
          const sel=cp.selected.indexOf(ev.id);
          const order=sel>=0?sel+1:null;
          return`<button class="cpick-item ${sel>=0?'sel':''}" onclick="toggleCombinePick('${ev.id}')">
            <span class="cpick-check">${sel>=0?(isCombine?(order===1?'★':order):'✓'):''}</span>
            <span class="cpick-name">${esc(evName(ev))}</span>
            <span class="cpick-meta">${entryValue(ev)||0} divers${evRound(ev)?' · '+esc(evRound(ev)):''}</span>
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
    ${renderParallelBox(sess)}
    <div class="fg"><label class="fl">Awards ceremony (+15 min)</label><div class="chiprow"><button class="chip ${sess.awardsEnabled?'on-r':''}" onclick="updSess('${sess.id}','awardsEnabled',${!sess.awardsEnabled})">${sess.awardsEnabled?'On — adds 15 min':'Off'}</button></div></div>
    <div class="fg"><label class="fl">Part of <span style="font-weight:400;color:var(--tx3);text-transform:none;letter-spacing:0">(tap to toggle — pick more than one if this block serves multiple events)</span></label><div class="chiprow"><button class="chip ${!sessTags(sess).length?'on':''}" onclick="clearSessTags('${sess.id}')" title="Shared — appears in every event's schedule">Shared</button>${EVENT_TAGS.map(t=>`<button class="chip ${sessTags(sess).includes(t.k)?'on':''}" onclick="toggleSessTag('${sess.id}','${t.k}')">${t.l}</button>`).join('')}</div></div>
    ${typeof renderBcastSessPanel==='function'?renderBcastSessPanel(sess):''}
    ${typeof renderAnnSessPanel==='function'?renderAnnSessPanel(sess):''}
    ${typeof renderJudgesSessPanel==='function'?renderJudgesSessPanel(sess):''}
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
      const evCopySplit={...ev,manualSplit:true,numberOfPanelChanges:effPanelChanges(ev),minutesPerPanelChange:effPanelMinutes(ev)};
      const unsplitMin=calcEvDur(evCopyUnsplit).evMin;
      const splitMin=calcEvDur(evCopySplit).evMin;
      const saved=Math.round(unsplitMin-splitMin);
      const splitHint=canSplit&&saved>0?`<div style="font-size:10px;color:var(--split-tx);margin-top:3px">${split?`Split saves ~${fdur(saved)} vs running together`:`Splitting would save ~${fdur(saved)}`}</div>`:'';
      return`<div style="border:1px solid var(--bd);border-radius:var(--r);padding:10px 12px;background:var(--surf)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:12.5px;font-weight:600;color:var(--tx);flex:1">${esc(evName(ev))}</span>
          ${evRound(ev)?`<span class="ev-badge ${rc}">${esc(evRound(ev))}</span>`:''}
          <button class="ev-rm" aria-label="Remove this event" onclick="removeEv('${sess.id}','${ev.id}')" title="Remove">×</button>
        </div>
        <div style="display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap">
          <div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Divers</div><input class="ep-inp" type="number" min="0" value="${ev.numberOfDivers||0}" onchange="updEv('${sess.id}','${ev.id}','numberOfDivers',this.value)"/></div>
          <div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Dives ${ev.rulebookLocked?'🔒':''}</div>${ev.rulebookLocked?`<div class="ep-inp" style="background:var(--surf3);color:var(--tx2);cursor:default;display:flex;align-items:center;justify-content:center;font-weight:700" title="Locked to USA Diving rulebook (${ev.round})">${ev.numberOfDives||ev.defaultDives||0}</div>`:`<input class="ep-inp" type="number" min="1" value="${ev.numberOfDives||ev.defaultDives||0}" onchange="updEv('${sess.id}','${ev.id}','numberOfDives',this.value)"/>`}</div>
          <div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Sec/dive</div><input class="ep-inp" type="number" min="5" step="1" value="${ev.secondsPerDive||ev.defaultSpd||35}" onchange="updEv('${sess.id}','${ev.id}','secondsPerDive',this.value)"/></div>
          ${canSplit?`<div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Split boards</div><button class="split-toggle ${split?'on':'off'}" onclick="toggleSplit('${sess.id}','${ev.id}')"><span class="split-toggle-dot"></span>${split?'ON':'OFF'}</button></div>`:'<div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Split</div><div style="font-size:11px;color:var(--tx3);padding:6px 0">Platform — N/A</div></div>'}
          ${split?`<div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px" title="Times the judging panel hands off between Panel A and Panel B during the split">Panel changes</div><input class="ep-inp" type="number" min="0" step="1" value="${Number(ev.numberOfPanelChanges)||0}" onchange="updEv('${sess.id}','${ev.id}','numberOfPanelChanges',this.value)"/></div>
          <div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px" title="Minutes added to the event for each panel change">Min each</div><input class="ep-inp" type="number" min="0" step="0.5" value="${Number(ev.minutesPerPanelChange)||3}" onchange="updEv('${sess.id}','${ev.id}','minutesPerPanelChange',this.value)"/></div>`:''}
          <div style="flex:1;text-align:right"><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">Runs</div><div style="font-size:12px;font-weight:600;color:var(--navy);font-variant-numeric:tabular-nums">${tev.eventStartMinutes!==undefined?`${f12(tev.eventStartMinutes)}–${f12(tev.eventEndMinutes)}`:'—'}</div></div>
        </div>
        ${splitHint}
        ${typeof renderBcastEvPanel==='function'?renderBcastEvPanel(sess,ev):''}
        ${typeof renderJudgesEvPanel==='function'?renderJudgesEvPanel(sess,ev):''}
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
      rowsHtml+=`<tr class="feg-day-row"><td colspan="9">${shortDate(day.date)}</td></tr>`;
      lastDayId=day.id;
    }
    rowsHtml+=`<tr class="feg-sess-row ${hasFinals?'finals':''}" data-sess-id="${sess.id}"><td colspan="9"><span class="feg-sess-badge ${hasFinals?'final':'prelim'}">${hasFinals?'Finals':sess.events.some(e=>e.round==='Prelim')?'Prelims':sess.events.some(e=>e.round==='Qualifier')?'Qualifier':'Session'}</span> Session ${n} <span class="feg-sess-time">${f12(t.eventStartMinutes)} – ${f12(t.sessionEndMinutes)}</span></td></tr>`;
    (t.events||[]).forEach(ev=>{
      const split=ev.manualSplit&&!isPlatform(ev.apparatus);
      const dur=calcEvDur(ev);
      const isFinal=ev.round==='Final';
      const projSet=ev.projectedDivers!=null&&ev.projectedDivers!=='';
      const finlSet=ev.finalDivers!=null&&ev.finalDivers!=='';
      const proj=projSet?Number(ev.projectedDivers):null;
      const finl=finlSet?Number(ev.finalDivers):null;
      const effective=entryValue(ev);
      // Split recommended when the event would run 2h30m+ unsplit, or has 40+ divers.
      const needsSplit=(dur.rawMin>=150||effective>=40)&&ev.round!=='Final';
      const rc=(ev.round||'qualifier').toLowerCase().replace(/[^a-z]+/g,'');
      const usingFinal=finlSet;
      const advOk=canAdvanceIn(ev);
      const advSet=advOk&&hasAdvanceIn(ev);
      const advVal=advanceInTyped(ev);
      const advCap=advOk?advanceInCappedBy(ev):null;
      rowsHtml+=`<tr data-ev-id="${ev.id}" data-sess-id="${sess.id}">
        <td class="feg-name">${esc(evName(ev))}<span class="ev-badge ${rc}" style="margin-left:6px">${esc(ev.round||'')}</span></td>
        <td class="feg-cell"><input ${dayLocked(sess.dayId)?'disabled ':''}type="number" min="0" inputmode="numeric" id="feg-${ev.id}-proj" class="feg-inp proj ${projSet?'on':''}" value="${projSet?proj:''}" placeholder="—" tabindex="${tabIndex++}"
          oninput="setEntry('${sess.id}','${ev.id}','projectedDivers',this.value)"
          onkeydown="entryKey(event,this)"/></td>
        <td class="feg-cell">${advOk?`<input ${dayLocked(sess.dayId)?'disabled ':''}type="number" min="0" inputmode="numeric" id="feg-${ev.id}-adv" class="feg-inp adv ${advSet?'on':''}${advCap!=null?' capped':''}" value="${advSet?advVal:''}" placeholder="—" tabindex="${tabIndex++}"
          title="${advCap!=null?`Only ${advCap} entered in the qualifier, so ${advCap} is being used instead of ${advVal}. This lifts on its own if more enter.`:'Divers arriving from an earlier event at this meet'}"
          oninput="setEntry('${sess.id}','${ev.id}','advanceIn',this.value)"
          onkeydown="entryKey(event,this)"/>${advCap!=null?`<div class="feg-cap" title="The qualifier has only ${advCap} entered, so at most ${advCap} can advance">using ${advCap}</div>`:''}`:'<span style="color:var(--tx3);font-size:10px">N/A</span>'}</td>
        <td class="feg-cell"><input ${dayLocked(sess.dayId)?'disabled ':''}type="number" min="0" inputmode="numeric" id="feg-${ev.id}-final" class="feg-inp final ${finlSet?'on':''}" value="${finlSet?finl:''}" placeholder="${projSet?proj:'—'}" tabindex="${tabIndex++}"
          oninput="setEntry('${sess.id}','${ev.id}','finalDivers',this.value)"
          onkeydown="entryKey(event,this)"/></td>
        <td class="feg-total"><span class="feg-total-num ${advSet?'plus':''}" id="feg-${ev.id}-total">${effective||'—'}</span><div class="feg-total-math">${advSet?`${entryBase(ev)??0} + ${advanceInValue(ev)}`:''}</div></td>
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
      <div class="enp-legitem"><span class="enp-legpill adv">Advancing in</span> moving up from an earlier event</div>
      <div class="enp-legitem"><span class="enp-legpill final">Final</span> confirmed — overrides projected</div>
      <button class="enp-matchall" onclick="copyAllProjectedToFinal()">Copy all Proj → Final</button>
    </div>
    <div class="enp-body">${rowsHtml?`<table class="feg-table"><thead><tr><th style="text-align:left">Event</th><th>Projected</th><th title="Divers moving up from an earlier event at this meet — never overwritten by a DiveMeets pull">Advancing in</th><th>Final</th><th>Total</th><th>Using</th><th>Dives</th><th>Split</th><th>Runs</th></tr></thead><tbody>${rowsHtml}</tbody></table>`:`<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No competition sessions</div></div>`}</div>
    <div class="enp-foot">
      <span class="enp-footinfo">Total = entries + advancing in · A DiveMeets pull sets the entries; advancing in is yours and survives every pull</span>
      <button class="enp-finalsbtn" onclick="applyFinalsAll()">Set finals from prelims</button>
    </div>
  </div>`;
}

// Fast entry: store value WITHOUT re-rendering (preserves focus + Tab flow).
// Recompute timing silently and update just the affected time displays in place.
// CRITICAL: do NOT call render() here — it would destroy the focused <input>
// the user is actively typing into, which causes the "flash" and dropped keystrokes.
// Full render only happens on Tab/Enter/blur/close via commitEntries().
let _entryDirty=false;
// Which days an entry edit actually touched. Editing entry counts on Aug 3 must not
// re-stack Aug 11 — only the days whose durations really changed get re-flowed.
let _entryDirtyDays=new Set();
function setEntry(sessId,evId,field,value){
  const sess=S.sessions.find(x=>x.id===sessId);if(!sess)return;
  if(dayLocked(sess.dayId)){lockRefused();render();return;}
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
  _entryDirtyDays.add(sess.dayId);
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
    // Keep the computed Total cell honest while the user is still typing
    const totalEl=row.querySelector('.feg-total-num');
    if(totalEl){
      const tot=entryValue(ev);
      totalEl.textContent=tot||'—';
      const showsAdv=canAdvanceIn(ev)&&hasAdvanceIn(ev);
      if(showsAdv)totalEl.classList.add('plus');else totalEl.classList.remove('plus');
      const mathEl=row.querySelector('.feg-total-math');
      if(mathEl)mathEl.textContent=showsAdv?`${entryBase(ev)??0} + ${advanceInValue(ev)}`:'';
    }
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
// The typed-in base entry count for an event, before any advancing-in add-on.
// Final wins if it's been entered (including 0); otherwise projected (including 0);
// null means neither column has been filled in.
function entryBase(ev){
  if(ev.finalDivers!=null&&ev.finalDivers!=='')return Number(ev.finalDivers)||0;
  if(ev.projectedDivers!=null&&ev.projectedDivers!=='')return Number(ev.projectedDivers)||0;
  return null;
}
// "Advancing in" — divers who arrive in this prelim from an EARLIER event at the
// same meet rather than from signup, e.g. the top 12 of each National Qualifier
// individual event who move into the matching Senior Nationals prelim. DiveMeets
// has no way to know about them (they never appear on the signup list), so this
// is a staff-entered number. It lives in its own field precisely so that pulling
// fresh entries from DiveMeets — which rewrites projectedDivers — can never wipe
// it out. Blank/unset counts as 0.
// What staff typed: the RULE, e.g. "the top 12 advance". Kept exactly as entered —
// this is the number the input box shows and the intent we must not lose.
function advanceInTyped(ev){
  if(ev==null||ev.advanceIn==null||ev.advanceIn==='')return 0;
  const v=Number(ev.advanceIn);
  return isNaN(v)?0:Math.max(0,v);
}
// The field a qualifier event actually has. Deliberately does NOT consult
// advanceInValue: a qualifier receives no advancers, and reading it here would
// recurse. Falls back to the stored total for legacy rows, same as entryValue.
function qualifierFieldSize(q){
  const base=entryBase(q);
  return base==null?(Number(q.numberOfDivers)||0):base;
}
// The matching National Qualifier event for a prelim — same gender, same
// apparatus, tower spelt either way.
function qualifierEventFor(ev){
  if(!ev||ev.round!=='Prelim'||ev.style==='Synchronized')return null;
  if(typeof S==='undefined'||!S||!S.sessions)return null;
  for(const sess of S.sessions){
    for(const q of (sess.events||[])){
      if(q.round!=='Qualifier'||q.style==='Synchronized')continue;
      if(q.gender===ev.gender&&sameApparatus(q.apparatus,ev.apparatus))return q;
    }
  }
  return null;
}
// When the cap is biting, the qualifier field size; otherwise null. Used to show
// the person WHY the effective number differs from what they typed.
function advanceInCappedBy(ev){
  const typed=advanceInTyped(ev);
  if(!typed)return null;
  const q=qualifierEventFor(ev);
  if(!q)return null;
  const field=qualifierFieldSize(q);
  return (field>0&&typed>field)?field:null;
}
// The EFFECTIVE number advancing in. "Top 12 advance" cannot send 12 out of a
// field of 6, so the rule is capped by the qualifier's actual entries. Derived
// rather than stored on purpose: entries stay open until three hours before an
// event, so this has to track signups in BOTH directions — if six more enter the
// tower qualifier, the cap lifts on its own and nobody has to remember to undo it.
function advanceInValue(ev){
  const typed=advanceInTyped(ev);
  if(!typed)return 0;
  const cap=advanceInCappedBy(ev);
  return cap==null?typed:cap;
}
// True when an event carries an advancing-in add-on worth showing to the user.
function hasAdvanceIn(ev){return advanceInValue(ev)>0}
// Which events may carry an advancing-in count. Finals fields are set by the
// finals rule (top 12 of the prelim), and practice/custom blocks have no field,
// so only the rounds people actually seed from a prior event are eligible.
function canAdvanceIn(ev){return ev&&(ev.round==='Prelim'||ev.round==='Qualifier')&&ev.style!=='Custom Block'}
// The effective diver count an event uses for timing: typed base + advancing in.
// When neither entry column has been filled, fall back to the stored
// numberOfDivers, which is ALREADY a total — adding advanceIn there would
// double-count it.
function entryValue(ev){
  const base=entryBase(ev);
  if(base==null)return Number(ev.numberOfDivers)||0;
  return base+(canAdvanceIn(ev)?advanceInValue(ev):0);
}
// The finals field size for a prelim. Rule: the top 12 of the prelim advance —
// or the whole field when fewer than 12 competed.
// CRITICAL: the prelim's field is its TOTAL, i.e. entries PLUS anyone advancing
// in from an earlier event at this meet (e.g. the top 12 of each National
// Qualifier event moving into the matching Senior Nationals prelim). This used
// to read finalDivers alone, which silently ignored the advancers and undersized
// the finals for every event fed by a qualifier — a 6-entry prelim taking 12
// advancers is an 18-diver field and gets a full 12-diver final, not a 6.
function finalsFieldTarget(prelimEv){
  return Math.min(12,entryValue(prelimEv)||0);
}
// The Final-round event(s) fed by a given prelim, matched on the same four
// attributes everywhere so the rule can't drift between call sites. apparatus
// goes through sameApparatus() because the schedule spells the tower "10-Meter"
// on Senior events but "Platform" on Junior ones, and style is compared so an
// Individual prelim can never seed a Synchronized final or vice versa.
function matchingFinalsEvents(state,prelimEv){
  const out=[];
  (state.sessions||[]).forEach(sess=>(sess.events||[]).forEach(fe=>{
    if(fe===prelimEv)return;
    if(fe.round!=='Final')return;
    if(fe.level!==prelimEv.level||fe.gender!==prelimEv.gender)return;
    if((fe.style||'')!==(prelimEv.style||''))return;
    if(!sameApparatus(fe.apparatus,prelimEv.apparatus))return;
    out.push(fe);
  }));
  return out;
}
// The prelim that feeds a given final — the inverse of matchingFinalsEvents.
function prelimEventFor(state,finalEv){
  let found=null;
  (state.sessions||[]).forEach(sess=>(sess.events||[]).forEach(pe=>{
    if(found||pe===finalEv||pe.round!=='Prelim')return;
    if(pe.level!==finalEv.level||pe.gender!==finalEv.gender)return;
    if((pe.style||'')!==(finalEv.style||''))return;
    if(!sameApparatus(pe.apparatus,finalEv.apparatus))return;
    found=pe;
  }));
  return found;
}
// Sync a finals event's entries from its matching prelim's TOTAL field.
// Rule (per user): the finals field is the top 12 of the prelim, or the whole
// prelim field if fewer than 12 are in it. Manual override above 12 (for ties)
// is preserved — only finals values <=12 are auto-synced.
function syncFinalsToPrelim(prelimEv){
  if(prelimEv.round!=='Prelim')return; // safety
  if(entryBase(prelimEv)==null)return; // neither entry column filled — nothing to size from
  const target=finalsFieldTarget(prelimEv);
  {
    matchingFinalsEvents(S,prelimEv).forEach(fe=>{
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
  }
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
  // Re-flow ONLY the days whose entry counts changed, so each session on those days
  // auto-starts after the previous one ends + buffer. Days the user never touched keep
  // the times they were saved with.
  _entryDirtyDays.forEach(dayId=>{if(!dayLocked(dayId))reflowDay(S,dayId)});
  _entryDirtyDays.clear();
  saveS();if(S.currentLibraryId)scheduleSave();
  render();
}
// Commit when the entries body loses focus (clicking away / closing)
function copyProjectedToFinal(sessId,evId){
  const sess=S.sessions.find(x=>x.id===sessId);const ev=sess?.events.find(e=>e.id===evId);
  if(ev){ev.finalDivers=Number(ev.projectedDivers||0);ev.numberOfDivers=entryValue(ev);}
  S.sessions.forEach(s=>{if(!s.isPractice)cascadeSession(S,s.id)});
  saveS();if(S.currentLibraryId)scheduleSave();render();
}



function copyProjectedToFinal(sessId,evId){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    const ev=sess.events.find(e=>e.id===evId);if(!ev)return;
    ev.finalDivers=Number(ev.projectedDivers||0);
    ev.numberOfDivers=entryValue(ev);
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
          ev.numberOfDivers=entryValue(ev);
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
  if(dayLocked(UI.dayId)){lockRefused();return;}
  if(!UI.dayId){toast('Add a day first');return}
  UI.modal='add-block';render();
}

// ── DRAG & DROP ───────────────────────────────────────────────────────
function bindDrag(){
  // Time-scale resize: grab a block's bottom edge and drag to change its
  // duration — live height while dragging, snapped to 5 min on release.
  document.querySelectorAll('.ts-resize').forEach(handle=>{
    handle.addEventListener('mousedown',e=>{
      e.preventDefault();e.stopPropagation();
      const cardEl=handle.closest('.ts-card');if(!cardEl)return;
      const wrap=cardEl.closest('.ts-wrap');
      const PX=Number(wrap?.dataset.px)||1.1;
      const sessId=cardEl.dataset.tsSess;
      const origDur=Number(cardEl.dataset.tsDur)||60;
      const startY=e.clientY;
      const origH=cardEl.offsetHeight;
      cardEl.classList.add('ts-resizing');
      const timeLbl=cardEl.querySelector('.ts-card-time');
      const origLbl=timeLbl?timeLbl.textContent:'';
      let liveDur=origDur;
      const onMove=ev=>{
        const dy=ev.clientY-startY;
        liveDur=Math.max(15,Math.round((origDur+dy/PX)/5)*5);
        cardEl.style.height=Math.max(30,origH+(liveDur-origDur)*PX)+'px';
        if(timeLbl)timeLbl.textContent=origLbl.replace(/·.*$/,'· '+fdur(liveDur));
      };
      const onUp=()=>{
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
        cardEl.classList.remove('ts-resizing');
        if(liveDur!==origDur){
          const sess=S.sessions.find(x=>x.id===sessId);
          if(sess&&sess.events[0])updEv(sessId,sess.events[0].id,'customDurationMinutes',liveDur);
        }
      };
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    });
  });
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
      toast('Event moved');
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
      // Live preview: exact start time the dragged block would get here
      const dayS=S.sessions.filter(x=>x.dayId===target.dayId&&x.id!==dragged.id).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
      const ti=dayS.findIndex(x=>x.id===targetId);
      const pos=above?(ti<=0?'start':'after-'+dayS[ti-1].id):'after-'+targetId;
      const st=computeMoveStartMinutes(S.sessions,dragged,target.dayId,pos);
      card.setAttribute('data-drop-time',st!=null?('starts '+f12(st)):'');
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
      // Direct manipulation: dropping on a day pill moves it there immediately
      // (end of that day), with a toast + Ctrl+Z undo. No dialog to click through.
      moveSessionToDay(sessId,dayId);
    });
  });
}



// ── VERSION HISTORY ───────────────────────────────────────────────────
// ── RUN SHEET STORAGE ─────────────────────────────────────────────────
// Actuals used to ride inside the schedule blob, so every tap on the deck
// republished the whole plan — which is how a stale device could overwrite
// newer plan edits made somewhere else. They are their own row now: small,
// written often, and incapable of touching the published schedule.
let runSheetTimer=null,_liveDirty=false,lastRunSheetSynced=null;
async function loadRunSheet(id){
  if(!id)return null;
  try{
    const r=await nq(`SELECT data,updated_at FROM schedule_builder.run_sheets WHERE schedule_id=$1`,[id]);
    const rows=r.rows||[];
    if(!rows.length)return null;
    const d=typeof rows[0][0]==='string'?JSON.parse(rows[0][0]):rows[0][0];
    if(d&&typeof d==='object'){
      S.live=d;
      if(!S.live.s)S.live.s={};if(!S.live.e)S.live.e={};if(!S.live.b)S.live.b={};
    }
    lastRunSheetSynced=rows[0][1]?String(rows[0][1]):null;
    _liveDirty=false;
    try{localStorage.setItem(SK,JSON.stringify(S))}catch{}
    return S.live;
  }catch(e){console.warn('Run sheet load failed:',e&&e.message);return null}
}
function scheduleRunSheetSave(){
  _liveDirty=true;
  clearTimeout(runSheetTimer);
  runSheetTimer=setTimeout(doSaveRunSheet,800);
}
async function doSaveRunSheet(){
  if(!S.currentLibraryId)return;
  try{
    const r=await nq(`INSERT INTO schedule_builder.run_sheets(schedule_id,data,updated_at)VALUES($1,$2::jsonb,now())ON CONFLICT(schedule_id)DO UPDATE SET data=EXCLUDED.data,updated_at=now() RETURNING updated_at`,
      [S.currentLibraryId,JSON.stringify(S.live||{})]);
    lastRunSheetSynced=r.rows?.[0]?.[0]?String(r.rows[0][0]):lastRunSheetSynced;
    _liveDirty=false;
  }catch(e){
    // Left dirty on purpose: the next tap, or the poll coming back online,
    // retries. Nothing is lost locally either way — saveS() already wrote it.
    console.warn('Run sheet save failed:',e&&e.message);
  }
}

// Snapshot an EXPLICIT payload rather than whatever S happens to be now — lets a
// caller capture a pre-change state, apply the change immediately, and push the
// snapshot afterwards without the change waiting on the network.
// Version-history writes. There is deliberately no CREATE TABLE fallback here:
// the browser role has no CREATE on schedule_builder (tables are the migration's
// job), so the "table might not exist yet" recovery these used to carry could
// never once have run. It only turned a real failure into a second, confusing
// one. A snapshot that does not happen now says so.
async function saveVersionData(label,dataStr){
  if(!S.currentLibraryId)return;
  await nq(`INSERT INTO schedule_builder.schedule_versions(schedule_id,label,data,created_at)VALUES($1,$2,$3::jsonb,now())`,
    [S.currentLibraryId,label||('Snapshot '+new Date().toLocaleString()),dataStr]);
}
async function saveVersion(label){
  if(!S.currentLibraryId)return;
  return saveVersionData(label,JSON.stringify(S));
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
  try{await saveVersion('Auto-backup before restore');}
  catch(e){
    toast('Could not save a backup of the current schedule, so nothing was restored. Check the connection and try again.',9000);
    return;
  }
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
  UI.modal='history';UI.historyLoading=true;UI.historyVersions=[];UI.historyDiff=null;render();
  UI.historyVersions=await loadVersions();UI.historyLoading=false;render();
}
function snapshotNow(){
  askPrompt({title:'Name this snapshot',message:'e.g. "Sent to HP Director 7/9" — a name you\'ll recognize later.',defaultValue:'',confirmText:'Save snapshot',onConfirm:(v)=>{
    const label=(v||'').trim()||('Snapshot '+new Date().toLocaleString());
    saveVersion(label).then(()=>{toast('Snapshot saved');openHistory()})
      .catch(e=>toast('Could not save the snapshot: '+((e&&e.message)||'unknown error'),7000));
  }});
}
// ── VERSION DIFF ──────────────────────────────────────────────────────
// Human-readable comparison between a saved version and the current state:
// sessions added / removed / moved to another day / retimed / renamed, plus
// day-level adds/removes. Matched by session id.
function _diffLabel(state,sess){
  if(sess.isPractice)return sess.title||'Practice block';
  const evs=(sess.events||[]).map(ev=>evName(ev));
  if(!evs.length)return'Empty session';
  return evs.length<=2?evs.join(' + '):evs[0]+' + '+(evs.length-1)+' more';
}
function _diffDayDate(state,dayId){const d=(state.meet?.days||[]).find(x=>x.id===dayId);return d?shortDate(d.date):'unknown day'}
function diffSchedules(oldS,newS){
  const out={added:[],removed:[],moved:[],retimed:[],renamed:[],changed:[],daysAdded:[],daysRemoved:[]};
  const oldDays=new Set((oldS.meet?.days||[]).map(d=>d.date));
  const newDays=new Set((newS.meet?.days||[]).map(d=>d.date));
  newDays.forEach(d=>{if(!oldDays.has(d))out.daysAdded.push(shortDate(d))});
  oldDays.forEach(d=>{if(!newDays.has(d))out.daysRemoved.push(shortDate(d))});
  const oldMap=new Map((oldS.sessions||[]).map(s=>[s.id,s]));
  const newMap=new Map((newS.sessions||[]).map(s=>[s.id,s]));
  newMap.forEach((ns,id)=>{
    const os=oldMap.get(id);
    if(!os){out.added.push(`${_diffLabel(newS,ns)} — ${_diffDayDate(newS,ns.dayId)} ${f12(ns.warmupStartMinutes)}`);return;}
    if(os.dayId!==ns.dayId)out.moved.push(`${_diffLabel(newS,ns)}: ${_diffDayDate(oldS,os.dayId)} → ${_diffDayDate(newS,ns.dayId)}`);
    else{
      const ot=calcSessTiming(os),nt=calcSessTiming(ns);
      if(Number(os.warmupStartMinutes)!==Number(ns.warmupStartMinutes))
        out.retimed.push(`${_diffLabel(newS,ns)} (${_diffDayDate(newS,ns.dayId)}): ${f12(os.warmupStartMinutes)} → ${f12(ns.warmupStartMinutes)}`);
      else if((ot.sessionEndMinutes-ot.warmupStartMinutes)!==(nt.sessionEndMinutes-nt.warmupStartMinutes))
        out.retimed.push(`${_diffLabel(newS,ns)} (${_diffDayDate(newS,ns.dayId)}): now runs ${fdur(nt.sessionEndMinutes-nt.warmupStartMinutes)} (was ${fdur(ot.sessionEndMinutes-ot.warmupStartMinutes)})`);
    }
    if((os.title||'')!==(ns.title||'')&&(os.title||ns.title))out.renamed.push(`"${os.title||'(untitled)'}" → "${ns.title||'(untitled)'}"`);
    const oe=(os.events||[]),ne=(ns.events||[]);
    const oSum=oe.reduce((s,e)=>s+Number(e.numberOfDivers||0),0),nSum=ne.reduce((s,e)=>s+Number(e.numberOfDivers||0),0);
    if(oe.length!==ne.length)out.changed.push(`${_diffLabel(newS,ns)} (${_diffDayDate(newS,ns.dayId)}): ${oe.length} → ${ne.length} events`);
    else if(oSum!==nSum)out.changed.push(`${_diffLabel(newS,ns)} (${_diffDayDate(newS,ns.dayId)}): entry counts ${oSum} → ${nSum}`);
  });
  oldMap.forEach((os,id)=>{
    if(!newMap.has(id))out.removed.push(`${_diffLabel(oldS,os)} — was ${_diffDayDate(oldS,os.dayId)} ${f12(os.warmupStartMinutes)}`);
  });
  out.empty=!out.added.length&&!out.removed.length&&!out.moved.length&&!out.retimed.length&&!out.renamed.length&&!out.changed.length&&!out.daysAdded.length&&!out.daysRemoved.length;
  return out;
}
async function compareVersion(vid,label){
  UI.historyDiff={loading:true,vid,label};render();
  try{
    const r=await nq(`SELECT data FROM schedule_builder.schedule_versions WHERE id=$1`,[vid]);
    if(!r.rows?.length)throw new Error('Version not found');
    const data=typeof r.rows[0][0]==='string'?JSON.parse(r.rows[0][0]):r.rows[0][0];
    UI.historyDiff={loading:false,vid,label,diff:diffSchedules(data,S)};
  }catch(e){UI.historyDiff={loading:false,vid,label,error:e.message||'Could not load'}}
  render();
}

// ── MEET OVERVIEW BOARD ───────────────────────────────────────────────
// Every day side-by-side as columns. Drag a block card onto another column to
// move it there (lands at end of that day, times recomputed). Click a card to
// jump to that day and open the block. The whole meet's shape at a glance.
function ovDragStart(e,sessId){e.dataTransfer.setData('text/plain','OVSESS::'+sessId);e.dataTransfer.effectAllowed='move';}
function ovDragOver(e,el){e.preventDefault();e.dataTransfer.dropEffect='move';el.classList.add('ov-drop');}
function ovDragLeave(el){el.classList.remove('ov-drop');}
function ovDrop(e,el,dayId){
  el.classList.remove('ov-drop');
  const data=e.dataTransfer.getData('text/plain');
  if(!data.startsWith('OVSESS::'))return;
  e.preventDefault();
  const sessId=data.replace('OVSESS::','');
  const sess=S.sessions.find(x=>x.id===sessId);
  if(!sess||sess.dayId===dayId)return;
  moveSessionToDay(sessId,dayId);
  UI.modal='overview'; // keep the board open after the move
  render();
}
function ovOpenSess(sessId){
  const sess=S.sessions.find(x=>x.id===sessId);if(!sess)return;
  UI.modal=null;UI.dayId=sess.dayId;UI.editSessId=sessId;render();
}
function renderOverviewModal(){
  const timed=allTimed();
  const cols=S.meet.days.map(day=>{
    const daySess=timed.filter(s=>s.dayId===day.id);
    const dayStart=daySess.length?Math.min(...daySess.map(s=>s.timing.warmupStartMinutes)):null;
    const dayEnd=daySess.length?Math.max(...daySess.map(s=>s.timing.sessionEndMinutes)):null;
    const cards=daySess.map(sess=>{
      const t=sess.timing;
      const isPrac=sess.isPractice;
      const isTrain=isPrac&&sess.title==='Open Training';
      const n=getSessNum(sess,timed);
      const name=isPrac?(sess.title||'Practice'):`Session ${n}`;
      const detail=isPrac?'':sess.events.map(ev=>evName(ev)).join(' · ');
      const cls=isPrac?(isTrain?'ov-card train':'ov-card prac'):'ov-card comp';
      return`<div class="${cls}" draggable="true" ondragstart="ovDragStart(event,'${sess.id}')" onclick="ovOpenSess('${sess.id}')" title="Click to open · drag to another day to move">
        <div class="ov-card-name">${esc(name)}</div>
        ${detail?`<div class="ov-card-detail">${esc(detail)}</div>`:''}
        <div class="ov-card-time">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)}</div>
      </div>`;
    }).join('');
    return`<div class="ov-col" ondragover="ovDragOver(event,this)" ondragleave="ovDragLeave(this)" ondrop="ovDrop(event,this,'${day.id}')">
      <button class="ov-col-hd ${day.id===UI.dayId?'active':''}" onclick="UI.modal=null;selectDay('${day.id}')" title="Go to this day">
        <span class="ov-col-date">${shortDate(day.date)}</span>
        <span class="ov-col-meta">${daySess.length?`${daySess.length} block${daySess.length===1?'':'s'} · ${f12(dayStart)}–${f12(dayEnd)}`:'empty'}</span>
      </button>
      <div class="ov-col-body">${cards||`<div class="ov-empty">Drop a block here</div>`}</div>
    </div>`;
  }).join('');
  return`<div class="modal modal-xl" onclick="event.stopPropagation()">
    <div class="modal-hd"><div><span class="modal-title">Meet overview</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">Drag blocks between days · click a block to open it · click a day header to go there</div></div><button class="modal-close" aria-label="Close" onclick="UI.modal=null;render()">×</button></div>
    <div class="modal-body ov-body-wrap"><div class="ov-board">${cols}</div></div>
  </div>`;
}

// ── COMMAND PALETTE (Cmd/Ctrl+K) + NATURAL-LANGUAGE QUICK ADD ────────
// One input for everything: fuzzy commands ("overview", "export excel",
// "go to thursday") and plain-English block creation ("Open training 7-11am
// friday", "Warm-ups 1pm-3pm, 3 flights East/Central/West 45 min").
function openPalette(){UI.palette={q:''};render()}
function closePalette(){UI.palette=null;render()}
function _parseTimeToken(numStr,ap){
  if(!numStr)return null;
  const m=numStr.match(/^(\d{1,2})(?::(\d{2}))?$/);if(!m)return null;
  let h=Number(m[1]);const mm=Number(m[2]||0);
  if(h>23||mm>59)return null;
  if(ap){ap=ap.toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;}
  return h*60+mm;
}
function parseQuickAdd(q){
  const tr=q.match(/(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)?/i);
  if(!tr)return null;
  let start=_parseTimeToken(tr[1],tr[2]||tr[4]);   // "7-11am" → both am
  let end=_parseTimeToken(tr[3],tr[4]||tr[2]);
  if(start==null||end==null)return null;
  if(end<=start&&end+720>start)end+=720;            // "11-1pm" → 1pm not 1am
  if(end<=start)return null;
  // Day: match a weekday word to a meet day
  let dayId=UI.dayId;
  const dm=q.match(/\b(?:on\s+)?(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i);
  if(dm){
    const target={sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6}[dm[1].toLowerCase()];
    const hit=S.meet.days.find(d=>new Date(d.date+'T00:00:00').getDay()===target);
    if(hit)dayId=hit.id;
  }
  // Flights: "3 flights East/Central/West 45 min" or "3 flights 60 min"
  let flights=[];
  const fm=q.match(/(\d+)\s*flights?(?:\s+([A-Za-z][A-Za-z\/,&\s]*?))?(?:\s+(\d+)\s*min)?(?=$|,|\.)/i);
  if(fm){
    const n=Math.min(12,Number(fm[1])||0);
    const names=(fm[2]||'').split(/[\/,&]| and /i).map(s=>s.trim()).filter(Boolean);
    const per=Number(fm[3])||Math.max(5,Math.round((end-start)/Math.max(1,n)/5)*5);
    for(let i=0;i<n;i++)flights.push({name:names[i]||('Flight '+(i+1)),durationMinutes:per});
  }
  // Title: text before the time range, cleaned
  let title=q.slice(0,tr.index).replace(/^\s*add\s+/i,'').replace(/[,\s]+$/,'').trim();
  if(!title)title='Open Training';
  title=title.replace(/\b\w/g,c=>c.toUpperCase());
  return{title,dayId,start,end,flights};
}
function executeQuickAdd(parsedJson){
  const p=typeof parsedJson==='string'?JSON.parse(parsedJson):parsedJson;
  const FLIGHT_COLORS=['#171F69','#009AC7','#E31937','#15803D','#B45309','#6D28D9'];
  const sess={id:uid(),dayId:p.dayId,warmupStartMinutes:p.start,warmupMinutes:0,rounding:5,introMinutes:0,bufferMinutes:0,awardsEnabled:false,isPractice:true,title:p.title,
    flights:(p.flights||[]).map((f,i)=>({id:uid(),name:f.name,durationMinutes:f.durationMinutes,color:FLIGHT_COLORS[i%FLIGHT_COLORS.length]})),
    events:[{id:uid(),style:'Custom Block',customLabel:p.title,customDurationMinutes:p.end-p.start,apparatus:'Pool',gender:'Open',level:'Schedule',numberOfDivers:0,numberOfDives:0,secondsPerDive:0,defaultSpd:0,defaultDives:0,manualSplit:false,numberOfPanelChanges:0,minutesPerPanelChange:0,notes:''}]};
  upd(s=>{s.sessions.push(sess)});
  UI.palette=null;UI.dayId=p.dayId;UI.editSessId=sess.id;
  toast(`Added ${p.title} · ${f12(p.start)}–${f12(p.end)}`);
  render();
}
function paletteCommands(){
  const cmds=[];
  S.meet.days.forEach(d=>cmds.push({label:'Go to '+fullDate(d.date),hint:'day',run:()=>{UI.palette=null;selectDay(d.id)}}));
  cmds.push({label:'Meet overview board',hint:'view',run:()=>{UI.palette=null;UI.modal='overview';render()}});
  cmds.push({label:(UI.timeScale?'Switch to list view':'Switch to time-scale view'),hint:'view',run:()=>{UI.palette=null;UI.timeScale=!UI.timeScale;render()}});
  cmds.push({label:'Presentation mode',hint:'view',run:()=>{UI.palette=null;openPresentation()}});
  cmds.push({label:'Schedule health',hint:'check',run:()=>{UI.palette=null;UI.modal='conflicts';render()}});
  cmds.push({label:'Re-stack this day (times back-to-back)',hint:'times',run:()=>{UI.palette=null;render();restackDay(UI.dayId)}});
  cmds.push({label:'Re-stack whole meet (times back-to-back)',hint:'times',run:()=>{UI.palette=null;render();restackAllDays()}});
  cmds.push({label:'Export — full meet handout',hint:'export',run:()=>{UI.palette=null;render();openMeetHandout()}});
  cmds.push({label:'Export — Excel workbook',hint:'export',run:()=>{UI.palette=null;render();exportMeetExcel()}});
  cmds.push({label:'Print this day (coach handout)',hint:'export',run:()=>{UI.palette=null;render();openCoachHandout(UI.dayId)}});
  cmds.push({label:'Club itineraries (print)',hint:'export',run:()=>{UI.palette=null;render();openClubItineraries()}});
  cmds.push({label:'Sync actual entries (DiveMeets)',hint:'data',run:()=>{UI.palette=null;openEntrySync()}});
  cmds.push({label:'Projections',hint:'data',run:()=>{UI.palette=null;openProjections()}});
  cmds.push({label:'Version history',hint:'safety',run:()=>{UI.palette=null;openHistory()}});
  cmds.push({label:'Snapshot now…',hint:'safety',run:()=>{UI.palette=null;render();snapshotNow()}});
  cmds.push({label:'Copy this day…',hint:'edit',run:()=>{UI.palette=null;openCopyDay(UI.dayId)}});
  cmds.push({label:'Import blocks from another schedule…',hint:'multi-event',run:()=>{UI.palette=null;openImportBlocks()}});
  if(anyEventTags()){
    cmds.push({label:'Split into per-event schedules',hint:'multi-event',run:()=>{UI.palette=null;render();splitByEvent()}});
    EVENT_TAGS.forEach(t=>cmds.push({label:'Filter view: '+t.l,hint:'multi-event',run:()=>{UI.palette=null;UI.eventFilter=t.k;render()}}));
    cmds.push({label:'Filter view: everything',hint:'multi-event',run:()=>{UI.palette=null;UI.eventFilter=null;render()}});
  }
  cmds.push({label:'Add a day…',hint:'edit',run:()=>{UI.palette=null;addDay()}});
  cmds.push({label:(document.documentElement.dataset.theme==='deck'?'Light mode':'Deck mode (dark)'),hint:'view',run:()=>{UI.palette=null;render();toggleTheme()}});
  return cmds;
}
function renderPalette(){
  const q=(UI.palette.q||'').trim();
  const parsed=q?parseQuickAdd(q):null;
  const ql=q.toLowerCase();
  const matches=q?paletteCommands().filter(c=>c.label.toLowerCase().includes(ql)):paletteCommands().slice(0,9);
  window._paletteRun=matches.map(m=>m.run);
  const dayFor=parsed?S.meet.days.find(d=>d.id===parsed.dayId):null;
  const rows=[
    parsed?`<button class="pal-row pal-create" onclick='executeQuickAdd(${esc(JSON.stringify(JSON.stringify(parsed))).replace(/'/g,'&#39;')})'>
      <span class="pal-plus">+</span>
      <span><strong>Create: ${esc(parsed.title)}</strong><span class="pal-sub">${dayFor?shortDate(dayFor.date):''} · ${f12(parsed.start)} – ${f12(parsed.end)}${parsed.flights.length?` · ${parsed.flights.length} flights`:''}</span></span>
      <span class="pal-kbd">↵</span>
    </button>`:'',
    ...matches.map((m,i)=>`<button class="pal-row" onclick="window._paletteRun[${i}]()"><span>${esc(m.label)}</span><span class="pal-hint">${m.hint}</span></button>`)
  ].join('');
  return`<div class="pal-bg" onclick="if(event.target===this)closePalette()">
    <div class="pal">
      <input id="palette-input" class="pal-input" placeholder='Type a command, or "Open training 7-11am friday"…' value="${esc(UI.palette.q||'')}" oninput="UI.palette.q=this.value;render()" onkeydown="if(event.key==='Enter'){event.preventDefault();const f=document.querySelector('.pal-row');if(f)f.click();}"/>
      <div class="pal-list">${rows||`<div class="pal-empty">No matches — try "overview", "export", or a block like "Warm-ups 1-3pm"</div>`}</div>
      <div class="pal-foot">↵ runs the first result · Esc closes</div>
    </div>
  </div>`;
}
// ── PRESENTATION MODE ─────────────────────────────────────────────────
// Full-screen, read-only, scoreboard-typography walkthrough — one day per
// screen, arrow keys to move, for reviewing the meet on a shared display.
function openPresentation(){
  const i=Math.max(0,S.meet.days.findIndex(d=>d.id===UI.dayId));
  UI.present={i:i<0?0:i};render();
}
function renderPresentation(timed){
  const days=S.meet.days;if(!days.length){UI.present=null;return''}
  const i=Math.min(UI.present.i,days.length-1);
  const day=days[i];
  const ds=filterByEvent(timed.filter(s=>s.dayId===day.id));
  const rows=ds.map(sess=>{
    const t=sess.timing;
    const isPrac=sess.isPractice;
    const name=isPrac?(sess.title||'Practice'):'Session '+getSessNum(sess,timed);
    const detail=isPrac
      ?((t.flightTimes||[]).map(f=>`${esc(f.name)} ${f12(f.startMinutes)}–${f12(f.endMinutes)}`).join('  ·  '))
      :(t.events||[]).map(ev=>esc(evName(ev))).join('  ·  ');
    return`<div class="pr-row ${isPrac?'prac':''}">
      <div class="pr-time">${f12(isPrac?t.warmupStartMinutes:t.eventStartMinutes)}<span class="pr-end">– ${f12(t.sessionEndMinutes)}</span></div>
      <div class="pr-body"><div class="pr-name">${esc(name)}${isParallel(sess)?' <span class="pr-along">SAME TIME</span>':''}${sess.awardsEnabled?' <span class="pr-awards">+ AWARDS</span>':''}</div>${detail?`<div class="pr-detail">${detail}</div>`:''}</div>
    </div>`;
  }).join('');
  return`<div class="present">
    <div class="pr-hd"><div class="pr-meet">${esc(S.meet.name||'Schedule')}</div><div class="pr-date">${fullDate(day.date)}</div></div>
    <div class="pr-accent"></div>
    <div class="pr-list">${rows||'<div class="pr-empty">Nothing scheduled this day</div>'}</div>
    <div class="pr-foot">
      <button class="pr-nav" aria-label="Previous day" onclick="UI.present.i=Math.max(0,UI.present.i-1);render()" ${i===0?'disabled':''}>←</button>
      <span>Day ${i+1} of ${days.length} · ← → to move · Esc to exit</span>
      <button class="pr-nav" aria-label="Next day" onclick="UI.present.i=Math.min(${days.length-1},UI.present.i+1);render()" ${i===days.length-1?'disabled':''}>→</button>
    </div>
    <button class="pr-close" aria-label="Close the presentation" onclick="UI.present=null;render()">×</button>
  </div>`;
}
// ── DECK MODE (dark theme) ────────────────────────────────────────────
function toggleTheme(){
  const cur=document.documentElement.dataset.theme==='deck'?'':'deck';
  document.documentElement.dataset.theme=cur;
  try{localStorage.setItem('sbTheme',cur)}catch(e){}
  render();
}
try{document.documentElement.dataset.theme=localStorage.getItem('sbTheme')||''}catch(e){}

// Ambient mini-map: every day as a slim strip from venue open to close, with
// a colored segment per block and red bleed where the day overruns. The whole
// meet's shape stays visible at all times; click a segment to jump to it.
// ── SCHEDULE HEALTH ───────────────────────────────────────────────────
// One number that grades the whole meet against the validation rules:
// 100 minus weighted penalties (errors 10, warnings 4, info 1), floor 25.
function computeHealth(){
  const issues=detectConflicts();
  let score=100;
  issues.forEach(i=>{score-=i.sev==='err'?10:i.sev==='warn'?4:1});
  score=Math.max(25,score);
  return{score,issues,errs:issues.filter(i=>i.sev==='err').length,warns:issues.filter(i=>i.sev==='warn').length};
}

// ── ATHLETE INTELLIGENCE (advisory only) ─────────────────────────────
// The schedule knows WHO is in it: the projected nationals field (per-diver,
// already loaded for projections) is joined to the timeline to surface
// person-level consequences of scheduling choices. Everything here is a lens —
// it never moves, locks, or auto-adjusts anything. Mike schedules; this warns.
const REST_MIN_DEFAULT=45; // minutes between one event's end and the next warm-up considered "tight"
function athletesForEvent(ev){
  if(!UI.projRows)return[];
  return UI.projRows.filter(r=>r.ageGroup===ev.level&&r.gender===ev.gender&&r.discipline===ev.apparatus);
}
function sessionAthletes(sess){
  const map=new Map();
  if(sess.isPractice)return map;
  (sess.events||[]).forEach(ev=>{
    if(ev.round==='Final')return; // finals fields are subsets of prelims; counting them double-books phantom athletes
    athletesForEvent(ev).forEach(r=>{if(!map.has(r.diverKey))map.set(r.diverKey,r)});
  });
  return map;
}
function sharedAthletes(sessA,sessB){
  const a=sessionAthletes(sessA),b=sessionAthletes(sessB);
  const shared=[];
  a.forEach((r,k)=>{if(b.has(k))shared.push(r)});
  return shared;
}
function nameList(rows,max){
  const names=rows.map(r=>r.athlete).filter(Boolean);
  if(names.length<=max)return names.join(', ');
  return names.slice(0,max).join(', ')+` +${names.length-max} more`;
}
// Per-diver chronological appearances for one day: [{diverKey,row,warmupStart,evStart,evEnd,sessLabel}]
function diverAppearancesForDay(dayId,timed){
  const out=new Map(); // diverKey -> {row, apps:[...]}
  timed.filter(s=>s.dayId===dayId&&!s.isPractice).forEach(sess=>{
    const t=sess.timing;
    const label='Session '+getSessNum(sess,timed);
    (sess.events||[]).forEach(ev=>{
      if(ev.round==='Final')return;
      const tev=(t.events||[]).find(x=>x.id===ev.id)||{};
      const evStart=tev.eventStartMinutes!=null?tev.eventStartMinutes:t.eventStartMinutes;
      const evEnd=tev.eventEndMinutes!=null?tev.eventEndMinutes:(tev.eventEnd!=null?tev.eventEnd:t.sessionEndMinutes);
      athletesForEvent(ev).forEach(r=>{
        if(!out.has(r.diverKey))out.set(r.diverKey,{row:r,apps:[]});
        out.get(r.diverKey).apps.push({warmupStart:t.warmupStartMinutes,evStart,evEnd,sessLabel:label,evName:evName(ev)});
      });
    });
  });
  out.forEach(d=>d.apps.sort((a,b)=>a.evStart-b.evStart));
  return out;
}
// Meet-wide advisory metrics for the Health panel
function computeAthleteImpact(timed){
  if(!UI.projRows||!UI.projRows.length)return null;
  let tightTurnarounds=0,tripleDayDivers=0,longestDay=null;
  const tightDetails=[];
  S.meet.days.forEach(day=>{
    const divers=diverAppearancesForDay(day.id,timed);
    divers.forEach(d=>{
      if(d.apps.length>=3)tripleDayDivers++;
      for(let i=0;i<d.apps.length-1;i++){
        const rest=d.apps[i+1].warmupStart-d.apps[i].evEnd;
        if(rest<REST_MIN_DEFAULT&&rest>-600){ // ignore absurd negatives from data holes
          tightTurnarounds++;
          if(tightDetails.length<40)tightDetails.push({day:day.id,row:d.row,rest,from:d.apps[i],to:d.apps[i+1]});
        }
      }
      if(d.apps.length){
        const span=d.apps[d.apps.length-1].evEnd-d.apps[0].warmupStart;
        if(!longestDay||span>longestDay.span)longestDay={span,name:d.row.athlete,team:d.row.team,day:day.id};
      }
    });
  });
  return{tightTurnarounds,tripleDayDivers,longestDay,tightDetails,totalDivers:new Set(UI.projRows.map(r=>r.diverKey)).size};
}

// ── MULTI-EVENT MASTER SCHEDULE ──────────────────────────────────────
// One facility, overlapping championships, ONE master calendar. Every block
// can be tagged with the event it belongs to; untagged blocks are "shared"
// (facility-wide: open training, technical meetings) and belong to every
// event. The filter is a VIEW — timing always computes from the full master
// so the facility reality never lies. Splitting writes per-event copies to
// the cloud library; the master stays the single source of truth.
const EVENT_TAGS=[
  {k:'junior',l:'Junior Nationals',s:'JR',c:'#171F69'},
  {k:'senior',l:'Senior Nationals',s:'SR',c:'#E31937'},
  {k:'qualifier',l:'National Qualifier',s:'NQ',c:'#009AC7'},
];
function dayEventTagOf(day){return EVENT_TAGS.find(t=>t.k===day.eventTag)||null}
// A session can now belong to more than one event (e.g. a Senior Nationals block
// that's simultaneously a National Qualifier block). eventTags is the array of tag
// keys; the legacy single-value eventTag (old saved schedules) is read as a
// one-element array so nothing on disk needs to be migrated.
function sessTags(sess){return Array.isArray(sess.eventTags)?sess.eventTags:(sess.eventTag?[sess.eventTag]:[]);}
function eventTagsOf(sess){const tags=sessTags(sess);return EVENT_TAGS.filter(t=>tags.includes(t.k));}
function toggleSessTag(id,k){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===id);if(!sess)return;
    const cur=sessTags(sess);
    sess.eventTags=cur.includes(k)?cur.filter(x=>x!==k):[...cur,k];
    delete sess.eventTag;
  });
}
function clearSessTags(id){
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===id);if(!sess)return;
    sess.eventTags=[];
    delete sess.eventTag;
  });
}
// Sets a day's default event — new blocks added to this day pick it up automatically
// (see addSession/addPracticeBlock). Existing blocks are never silently retagged; if the
// day already has untagged blocks, offer to tag those too rather than doing it invisibly.
function setDayEventTag(dayId,tag){
  const day=S.meet.days.find(d=>d.id===dayId);if(!day)return;
  const untagged=S.sessions.filter(s=>s.dayId===dayId&&!sessTags(s).length);
  upd(s=>{const d=s.meet.days.find(x=>x.id===dayId);if(d)d.eventTag=tag||'';});
  if(tag&&untagged.length){
    const tagL=EVENT_TAGS.find(t=>t.k===tag)?.l||tag;
    askConfirm({title:'Tag existing blocks too?',message:`This day already has ${untagged.length} untagged block${untagged.length===1?'':'s'}. Tag ${untagged.length===1?'it':'them'} as ${tagL} as well? (New blocks you add from now on will use this automatically either way.)`,confirmText:'Tag them',onConfirm:()=>{
      upd(s=>{s.sessions.forEach(x=>{if(x.dayId===dayId&&!sessTags(x).length){x.eventTags=[tag];delete x.eventTag;}});});
      render();toast(`Tagged ${untagged.length} block${untagged.length===1?'':'s'} as ${tagL}`);
    }});
  } // upd() above already re-rendered; nothing else to do when there's no bulk-apply prompt
}
function anyEventTags(){return S.sessions.some(s=>sessTags(s).length)||S.meet.days.some(d=>d.eventTag)}
// View filter: a tag shows its own blocks + shared; 'shared' shows untagged only.
// A session tagged with MULTIPLE events shows up under every one of its tags' filters.
// f defaults to the on-screen day-view filter (UI.eventFilter), but callers can pass an
// explicit filter key instead — used by the Generate/print modal, which has its OWN
// independent, multi-select scope selector (UI.genScopes / passesGenScope) so viewing
// "All" on screen doesn't force printing "All" too, and vice versa.
function passesEventFilter(sess,f){
  if(f===undefined)f=UI.eventFilter;
  if(!f)return true;
  const tags=sessTags(sess);
  if(f==='shared')return!tags.length;
  return tags.includes(f)||!tags.length;
}
function filterByEvent(sessions){return sessions.filter(s=>passesEventFilter(s))}
function eventFilterLabel(){
  if(!UI.eventFilter)return'';
  if(UI.eventFilter==='shared')return'Shared blocks';
  const t=EVENT_TAGS.find(t=>t.k===UI.eventFilter);
  return t?t.l:'';
}
// ── IMPORT BLOCKS FROM ANOTHER SAVED SCHEDULE ────────────────────────
// Solves the stale-combined-template problem: pull a finished schedule's
// blocks into this master, tagged, matching days by DATE (creating missing
// days), optionally replacing this master's existing blocks with that tag.
function openImportBlocks(){
  UI.modal='import-blocks';
  UI.importState={loading:true,list:null,sourceId:null,tag:EVENT_TAGS[0].k,replace:true,error:null};
  render();
  nq(`SELECT id,name,updated_at::text FROM schedule_builder.schedules WHERE id<>$1 ORDER BY updated_at DESC LIMIT 25`,[S.currentLibraryId||''])
    .then(r=>{UI.importState.list=(r.rows||[]).map(row=>({id:row[0],name:row[1],updatedAt:row[2]}));UI.importState.loading=false;})
    .catch(e=>{UI.importState.error=e.message||'Could not load library';UI.importState.loading=false;})
    .finally(()=>render());
}
async function executeImportBlocks(){
  const st=UI.importState;
  if(!st||!st.sourceId){toast('Pick a schedule to import from');return;}
  toast('Importing…');
  let data;
  try{
    const r=await nq(`SELECT data FROM schedule_builder.schedules WHERE id=$1`,[st.sourceId]);
    if(!r.rows?.length)throw new Error('Schedule not found');
    data=typeof r.rows[0][0]==='string'?JSON.parse(r.rows[0][0]):r.rows[0][0];
  }catch(e){toast('Import failed: '+(e.message||'could not load'));return;}
  const srcSessions=(data.sessions||[]);
  const srcDays=(data.meet?.days||[]);
  if(!srcSessions.length){toast('That schedule has no blocks');return;}
  let added=0,removed=0,daysCreated=0;
  upd(s=>{
    if(st.replace){
      const before=s.sessions.length;
      s.sessions=s.sessions.filter(x=>!sessTags(x).includes(st.tag));
      removed=before-s.sessions.length;
    }
    const dayByDate={};s.meet.days.forEach(d=>dayByDate[d.date]=d.id);
    const impIdMap={},impMade=[];
    srcSessions.forEach(src=>{
      const srcDay=srcDays.find(d=>d.id===src.dayId);
      if(!srcDay)return;
      let targetDayId=dayByDate[srcDay.date];
      if(!targetDayId){
        const nd={id:uid(),date:srcDay.date,openMinutes:srcDay.openMinutes||390,closeMinutes:srcDay.closeMinutes||1200};
        s.meet.days.push(nd);dayByDate[nd.date]=nd.id;targetDayId=nd.id;daysCreated++;
      }
      const copy=JSON.parse(JSON.stringify(src));
      const oldId=src.id;
      copy.id=uid();copy.dayId=targetDayId;copy.eventTags=[st.tag];delete copy.eventTag;
      impIdMap[oldId]=copy.id;
      (copy.events||[]).forEach(ev=>{ev.id=uid();delete ev.linkedPrelimId;});
      (copy.flights||[]).forEach(f=>{f.id=uid();});
      s.sessions.push(copy);impMade.push(copy);added++;
    });
    remapParallelRefs(impMade,impIdMap);
    s.meet.days.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  });
  UI.modal=null;
  const tagL=EVENT_TAGS.find(t=>t.k===st.tag)?.l||st.tag;
  toast(`Imported ${added} block${added===1?'':'s'} as ${tagL}`+(removed?` (replaced ${removed})`:'')+(daysCreated?` · ${daysCreated} day${daysCreated===1?'':'s'} added`:''));
  render();
}
function renderImportBlocksModal(){
  const st=UI.importState||{};
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><div><span class="modal-title">Import blocks from another schedule</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">Days are matched by date · missing days get created · nothing here is deleted unless you say so</div></div><button class="modal-close" aria-label="Close" onclick="UI.modal=null;render()">×</button></div>
    <div class="modal-body">
      ${st.loading?`<div style="text-align:center;color:var(--tx3);padding:20px">Loading your cloud library…</div>`:
       st.error?`<div style="color:var(--red);font-size:12px">${esc(st.error)}</div>`:`
      <label class="fl">From</label>
      <div style="display:flex;flex-direction:column;gap:5px;max-height:200px;overflow-y:auto;margin-bottom:14px">
        ${(st.list||[]).map(x=>`<button class="move-btn ${st.sourceId===x.id?'active':''}" onclick="UI.importState.sourceId='${x.id}';render()">${esc(x.name||'(untitled)')} <span class="move-meta">${new Date(x.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></button>`).join('')||'<div style="font-size:12px;color:var(--tx3)">No other schedules in the cloud library</div>'}
      </div>
      <label class="fl">Tag the imported blocks as</label>
      <div class="chiprow" style="margin-bottom:14px">${EVENT_TAGS.map(t=>`<button class="chip ${st.tag===t.k?'on':''}" onclick="UI.importState.tag='${t.k}';render()">${t.l}</button>`).join('')}</div>
      <label style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--tx2);cursor:pointer"><input type="checkbox" ${st.replace?'checked':''} onchange="UI.importState.replace=this.checked;render()"/> Replace this schedule's existing <b>${esc(EVENT_TAGS.find(t=>t.k===st.tag)?.l||'')}</b> blocks first (clean re-import)</label>
    `}
    </div>
    <div class="modal-foot"><button class="btn btn-sm" onclick="UI.modal=null;render()">Cancel</button><button class="btn btn-sm btn-p" ${st.sourceId?'':'disabled'} onclick="executeImportBlocks()">Import</button></div>
  </div>`;
}
// ── SPLIT MASTER INTO PER-EVENT SCHEDULES ────────────────────────────
async function splitByEvent(){
  const tagsInUse=EVENT_TAGS.filter(t=>S.sessions.some(s=>sessTags(s).includes(t.k)));
  if(!tagsInUse.length){toast('Tag blocks with their event first (open a block → "Part of")');return;}
  askConfirm({title:'Split into per-event schedules?',message:`Creates ${tagsInUse.length} new cloud schedule${tagsInUse.length===1?'':'s'} (${tagsInUse.map(t=>t.l).join(', ')}), each containing that event's blocks plus all shared blocks. This master is not changed.`,confirmText:'Create '+tagsInUse.length,onConfirm:async()=>{
    toast('Splitting…');
    let made=0;
    for(const t of tagsInUse){
      const clone=JSON.parse(JSON.stringify(S));
      clone.sessions=clone.sessions.filter(x=>sessTags(x).includes(t.k)||!sessTags(x).length);
      const usedDays=new Set(clone.sessions.map(x=>x.dayId));
      clone.meet.days=clone.meet.days.filter(d=>usedDays.has(d.id));
      clone.meet.name=`${S.meet.name||'Schedule'} — ${t.l}`;
      clone.currentLibraryId=uid();
      clone.publishStatus='draft';
      try{
        await nq(`INSERT INTO schedule_builder.schedules(id,name,meet_type,year,publish_status,folder,data,updated_at)VALUES($1,$2,$3,$4,'draft',$5,$6::jsonb,now())ON CONFLICT(id)DO UPDATE SET data=EXCLUDED.data,updated_at=now()`,
          [clone.currentLibraryId,clone.meet.name,S.meet.meetType,parseInt(S.meet.days[0]?.date)||2026,S.libraryFolder||null,JSON.stringify(clone)]);
        made++;
      }catch(e){toast(`Split failed on ${t.l}: ${e.message||'error'}`);return;}
    }
    toast(`Created ${made} per-event schedule${made===1?'':'s'} in the cloud library — the master is untouched`);
  }});
}

// ── DAY TEMPLATES ─────────────────────────────────────────────────────
// Save a day's structure as a named, reusable pattern; stamp it onto new days
// from the Add-a-day dialog. Stored locally in this browser.
function loadDayTemplates(){try{return JSON.parse(localStorage.getItem('sbDayTemplates')||'[]')}catch(e){return[]}}
function persistDayTemplates(list){try{localStorage.setItem('sbDayTemplates',JSON.stringify(list))}catch(e){toast('Could not save template — browser storage full?')}}
function saveDayTemplate(dayId){
  const inp=document.getElementById('copy-day-tpl-name');
  const name=(inp&&inp.value.trim())||'';
  if(!name){toast('Give the template a name first');return;}
  const sessions=S.sessions.filter(x=>x.dayId===dayId).map(s=>{
    const c=JSON.parse(JSON.stringify(s));delete c.dayId;return c;
  });
  if(!sessions.length){toast('Nothing on this day to save');return;}
  const list=loadDayTemplates();
  list.push({id:uid(),name,savedAt:new Date().toISOString(),sessions});
  persistDayTemplates(list);
  UI.modal=null;
  toast(`Template "${name}" saved — find it when adding a day`);
  render();
}
function deleteDayTemplate(tplId){
  askConfirm({title:'Delete this template?',message:'This only removes the saved pattern — no schedules are affected.',confirmText:'Delete',onConfirm:()=>{
    persistDayTemplates(loadDayTemplates().filter(t=>t.id!==tplId));
    if(UI.addDayTemplateId===tplId)UI.addDayTemplateId=null;
    render();
  }});
}
// When a set of blocks is cloned together (copy day, import blocks, template
// stamp), any "runs at the same time as" pairing must be re-pointed at the NEW
// copies. Without this the copies would still reference the originals on another
// day, silently losing the pairing.
function remapParallelRefs(copies,idMap){
  copies.forEach(c=>{
    if(!c.parallel)return;
    if(c.parallelWith&&idMap[c.parallelWith])c.parallelWith=idMap[c.parallelWith];
    else c.parallelWith=null;
  });
}
function stampTemplateOntoDay(stateSnap,tpl,dayId){
  const idMap={},made=[];
  tpl.sessions.forEach(src=>{
    const copy=JSON.parse(JSON.stringify(src));
    const oldId=src.id;
    copy.id=uid();copy.dayId=dayId;
    if(oldId)idMap[oldId]=copy.id;
    (copy.events||[]).forEach(ev=>{ev.id=uid();delete ev.linkedPrelimId;});
    (copy.flights||[]).forEach(f=>{f.id=uid();});
    stateSnap.sessions.push(copy);made.push(copy);
  });
  remapParallelRefs(made,idMap);
}

// Pure helper: what warmupStartMinutes would `sess` get if placed at `pos` on
// `targetDayId`? Single source of truth shared by the Move dialog's live
// previews and the actual move execution, so what you see is what you get.
function computeMoveStartMinutes(sessions,sess,targetDayId,pos){
  const sameDay=sessions.filter(x=>x.dayId===targetDayId&&x.id!==sess.id).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  if(pos==='start'){
    const firstStart=sameDay.length?Number(sameDay[0].warmupStartMinutes):420;
    const t=calcSessTiming(sess);
    const sessDur=t.sessionEndMinutes-t.warmupStartMinutes;
    return Math.max(420,firstStart-sessDur-Number(sess.bufferMinutes||0));
  }
  if(pos==='end'){
    if(!sameDay.length)return 420;
    let lastEnd=420,lastBuffer=0;
    sameDay.forEach(x=>{const end=calcSessTiming(x).sessionEndMinutes;if(end>=lastEnd){lastEnd=end;lastBuffer=Number(x.bufferMinutes||0);}});
    return ru(lastEnd+lastBuffer,5);
  }
  if(typeof pos==='string'&&pos.startsWith('after-')){
    const afterId=pos.replace('after-','');
    const afterSess=sameDay.find(x=>x.id===afterId);
    if(afterSess){
      const afterT=calcSessTiming(afterSess);
      return ru(afterT.sessionEndMinutes+Number(afterSess.bufferMinutes||0),5);
    }
  }
  return null;
}
// One-click nudge: swap this session with its neighbor above/below in the day.
// This is the fast path for the most common move — no dialog, no drag.
function nudgeSession(sessId,dir){
  const sess=S.sessions.find(x=>x.id===sessId);if(!sess)return;
  const stack=S.sessions.filter(x=>x.dayId===sess.dayId&&!isParallel(x)).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  // For an alongside block, up/down walks it to the block before or after its
  // current partner — it never re-enters the stack by accident.
  if(isParallel(sess)){
    if(!stack.length){toast('Nothing on this day for it to run alongside');return;}
    const anchor=parallelAnchorOf(S,sess);
    const ai=anchor?stack.findIndex(x=>x.id===anchor.id):-1;
    const nj=ai<0?(dir<0?stack.length-1:0):ai+dir;
    if(nj<0||nj>=stack.length){toast(dir<0?'Already paired with the first block of the day':'Already paired with the last block of the day');return;}
    setParallelPartner(sessId,stack[nj].id);
    toast(`Now runs at the same time as \u201C${sessLabelOf(stack[nj],null)}\u201D`);
    return;
  }
  const i=stack.findIndex(x=>x.id===sessId);
  const j=i+dir;
  if(j<0||j>=stack.length){toast(dir<0?'Already first in the day':'Already last in the day');return;}
  reorderSessionWithinDay(sessId,stack[j].id,dir<0);
}
// Direct move: drop a session on a day pill and it lands at the end of that
// day immediately — no dialog to click through. Undo (Ctrl+Z) reverses it.
function moveSessionToDay(sessId,dayId){
  const day=S.meet.days.find(d=>d.id===dayId);
  upd(s=>{
    const sess=s.sessions.find(x=>x.id===sessId);if(!sess)return;
    sess.dayId=dayId;
    const start=computeMoveStartMinutes(s.sessions,sess,dayId,'end');
    if(start!=null)sess.warmupStartMinutes=start;
  });
  UI.dayId=dayId;
  toast(`Moved to ${day?shortDate(day.date):'day'} — end of day (Ctrl+Z to undo)`);
  render();
}
// Copy day: clone every session on a day (fresh ids, same clock times) onto a
// target day — either an existing day or a brand-new day appended after the
// last. Repeated day structures (identical warm-up/practice patterns) become
// one click instead of rebuilding block by block.
function openCopyDay(dayId){
  if(meetLocked()){lockRefused();return;}
  UI.copyDaySourceId=dayId;
  UI.copyDayTargetId=null;
  UI.modal='copy-day';
  render();
}
function executeCopyDay(){
  const srcId=UI.copyDaySourceId;
  let targetId=UI.copyDayTargetId;
  if(!srcId||!targetId)return;
  upd(s=>{
    if(targetId==='__new__'){
      const last=s.meet.days[s.meet.days.length-1];
      const d=new Date(`${last.date}T00:00:00`);d.setDate(d.getDate()+1);
      const day={id:uid(),date:d.toISOString().slice(0,10),openMinutes:390,closeMinutes:1200};
      s.meet.days.push(day);
      targetId=day.id;
    }
    const _idMap={},_made=[];
    s.sessions.filter(x=>x.dayId===srcId).forEach(src=>{
      const copy=JSON.parse(JSON.stringify(src));
      const oldId=src.id;
      copy.id=uid();copy.dayId=targetId;
      _idMap[oldId]=copy.id;
      (copy.events||[]).forEach(ev=>{ev.id=uid();delete ev.linkedPrelimId;});
      (copy.flights||[]).forEach(f=>{f.id=uid();});
      s.sessions.push(copy);_made.push(copy);
    });
    remapParallelRefs(_made,_idMap);
    UI.dayId=targetId;
  });
  UI.modal=null;
  toast('Day copied — same blocks, same times');
  render();
}
function renderCopyDayModal(){
  const src=S.meet.days.find(d=>d.id===UI.copyDaySourceId);
  if(!src)return'';
  const srcCount=S.sessions.filter(x=>x.dayId===src.id).length;
  const targets=S.meet.days.filter(d=>d.id!==src.id);
  const chip=(id,label,sub)=>`<button class="move-btn ${UI.copyDayTargetId===id?'active':''}" onclick="UI.copyDayTargetId='${id}';render()">${label}${sub?` <span class="move-meta">${sub}</span>`:''}</button>`;
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><div><span class="modal-title">Copy ${shortDate(src.date)}</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${srcCount} block${srcCount===1?'':'s'} will be copied with the same times</div></div><button class="modal-close" aria-label="Close" onclick="UI.modal=null;render()">×</button></div>
    <div class="modal-body">
      <label class="fl">Copy to</label>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${targets.map(d=>{const n=S.sessions.filter(x=>x.dayId===d.id).length;return chip(d.id,shortDate(d.date),n?`${n} block${n===1?'':'s'} already`:'empty')}).join('')}
        ${chip('__new__','+ A brand-new day','added after the last day')}
      </div>
      ${UI.copyDayTargetId&&UI.copyDayTargetId!=='__new__'&&S.sessions.some(x=>x.dayId===UI.copyDayTargetId)?`<p style="font-size:11px;color:var(--tx3);margin-top:10px">The copied blocks will be added alongside what's already there — nothing gets replaced. Watch for overlap chips on the timeline afterward.</p>`:''}
      <div class="fdiv" style="margin:16px 0 12px"></div>
      <label class="fl">Or save this day as a reusable template</label>
      <p style="font-size:11px;color:var(--tx3);margin:2px 0 8px">Name it (e.g. "Standard prelims day") and stamp it onto any new day later, in this or a future meet.</p>
      <div style="display:flex;gap:6px">
        <input id="copy-day-tpl-name" class="fi" style="flex:1" placeholder="Template name" onkeydown="if(event.key==='Enter')saveDayTemplate('${src.id}')"/>
        <button class="btn btn-sm" onclick="saveDayTemplate('${src.id}')">Save template</button>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-sm" onclick="UI.modal=null;render()">Cancel</button><button class="btn btn-sm btn-p" ${UI.copyDayTargetId?'':'disabled'} onclick="executeCopyDay()">Copy day</button></div>
  </div>`;
}

// Duplicate: deep-clone a session (fresh ids for the session, its events, and
// flights) and slot the copy immediately after the original with the same
// buffer. Big time-saver for repeated warm-up/practice patterns.
function duplicateSession(sessId){
  let newId=null;
  upd(s=>{
    const src=s.sessions.find(x=>x.id===sessId);if(!src)return;
    const copy=JSON.parse(JSON.stringify(src));
    copy.id=uid();newId=copy.id;
    (copy.events||[]).forEach(ev=>{ev.id=uid();delete ev.linkedPrelimId;});
    (copy.flights||[]).forEach(f=>{f.id=uid();});
    const t=calcSessTiming(src);
    copy.warmupStartMinutes=ru(t.sessionEndMinutes+Number(src.bufferMinutes||0),5);
    s.sessions.push(copy);
    reflowDay(s,copy.dayId);
  });
  UI.editSessId=null;
  toast('Duplicated — the copy is right below the original');
  render();
}
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
    const start=computeMoveStartMinutes(s.sessions,sess,targetDay,pos);
    if(start!=null){
      sess.warmupStartMinutes=start;
      if(pos!=='end')cascadeSession(s,sessId);
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
  const moveLbl=sess.isPractice?(sess.title||'Practice'):`Session ${n}`;
  const targetDay=UI.moveTargetDayId;
  const targetDaySessions=S.sessions.filter(s=>s.dayId===targetDay&&s.id!==UI.moveSessionId).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  const dayChips=S.meet.days.map(d=>`<button class="move-day-chip ${d.id===targetDay?'active':''}" onclick="UI.moveTargetDayId='${d.id}';UI.moveTargetPos='end';render()">${shortDate(d.date)}${d.id===sess.dayId?'<span class="move-day-cur">current</span>':''}</button>`).join('');
  // Visual timeline of the target day: each existing session is an info row,
  // and every gap around them is a clickable insertion slot showing the exact
  // start time the moved session would get if dropped there.
  const slot=(pos,label)=>{
    const st=computeMoveStartMinutes(S.sessions,sess,targetDay,pos);
    const on=UI.moveTargetPos===pos;
    return`<button class="move-slot ${on?'active':''}" onclick="UI.moveTargetPos='${pos}';render()">
      <span class="move-slot-dot"></span>
      <span class="move-slot-lbl">${label}</span>
      <span class="move-slot-time">${st!=null?`starts ${f12(st)}`:''}</span>
    </button>`;
  };
  let timeline=slot('start','Place first');
  targetDaySessions.forEach((s2,i)=>{
    const t2=calcSessTiming(s2);
    const sn=getSessNum(s2,allTimed());
    const lbl=s2.isPractice?(s2.title||'Practice'):`Session ${sn}`;
    timeline+=`<div class="move-sess-row"><span class="move-sess-name">${esc(lbl)}</span><span class="move-sess-time">${f12(t2.warmupStartMinutes)} – ${f12(t2.sessionEndMinutes)}</span></div>`;
    const isLast=i===targetDaySessions.length-1;
    timeline+=slot(isLast?'end':'after-'+s2.id,isLast?'Place last':'Place here');
  });
  if(!targetDaySessions.length)timeline=`<div class="move-empty">Nothing scheduled this day yet</div>`+slot('end','Place here');
  const previewStart=computeMoveStartMinutes(S.sessions,sess,targetDay,UI.moveTargetPos);
  return`<div class="modal-bg" onclick="if(event.target===this)closeMoveDialog()" style="z-index:650">
    <div class="modal modal-sm" onclick="event.stopPropagation()">
      <div class="modal-hd"><div><span class="modal-title">Move ${esc(moveLbl)}</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">From ${shortDate(S.meet.days.find(d=>d.id===sess.dayId)?.date||'')} · pick a day, then tap where it should go</div></div><button class="modal-close" aria-label="Close" onclick="closeMoveDialog()">×</button></div>
      <div class="modal-body">
        <label class="fl">Day</label>
        <div class="move-day-row">${dayChips}</div>
        <label class="fl" style="margin-top:14px">Where in the day</label>
        <div class="move-timeline">${timeline}</div>
      </div>
      <div class="modal-foot"><button class="btn btn-sm" onclick="closeMoveDialog()">Cancel</button><button class="btn btn-sm btn-p" onclick="executeMoveSession()">Move — starts ${previewStart!=null?f12(previewStart):'…'}</button></div>
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

// Plain-English editor for the day's facility window. Reached from the "Pool"
// chip in the day bar, and from the Days list in meet settings.
function renderFacilityHoursModal(){
  const dayId=UI.hoursDayId||UI.dayId;
  const day=(S.meet.days||[]).find(d=>d.id===dayId);
  if(!day)return`<div class="modal" onclick="event.stopPropagation()"><div class="modal-hd"><span class="modal-title">Facility hours</span><button class="modal-close" aria-label="Close" onclick="closeModal()">&times;</button></div><div class="modal-body">No day selected.</div></div>`;
  const open=dayOpenFor(dayId),close=dayCloseFor(dayId);
  const bad=close<=open;
  const outside=blocksOutsideHours(dayId);
  const others=(S.meet.days||[]).length-1;
  return`<div class="modal" onclick="event.stopPropagation()">
    <div class="modal-hd"><div><span class="modal-title">Facility hours</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${esc(fullDate(day.date))}</div></div><button class="modal-close" aria-label="Close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      <div class="hours-grid">
        <div class="fg"><label class="fl">Pool opens</label><input class="fi" type="time" value="${f24(open)}" onchange="setDayOpen('${dayId}',pt(this.value))"/></div>
        <div class="fg"><label class="fl">Pool closes</label><input class="fi" type="time" value="${f24(close)}" onchange="setDayClose('${dayId}',pt(this.value))"/></div>
      </div>
      ${bad
        ?`<div class="hours-note bad">Closing time is before opening time — fix one of them or blocks won't lay out correctly.</div>`
        :`<div class="hours-note">Open for <b>${fdur(close-open)}</b> on this day.</div>`}
      ${outside?`<div class="hours-note warn">${outside} block${outside===1?'':'s'} on this day fall${outside===1?'s':''} outside these hours. Nothing was moved — check the health panel to see which.</div>`:''}
      <p class="hours-help">These hours don't move any blocks on their own. They set the earliest time the auto-stacker will start a block, they're what "fit to facility close" ends at, and anything scheduled outside them gets flagged in the health check.</p>
      ${others>0?`<button class="btn btn-sm" onclick="applyHoursToAllDays('${dayId}')">Use these hours on all ${others+1} days</button>`:''}
    </div>
    <div class="modal-foot"><button class="btn btn-p" onclick="closeModal()">Done</button></div>
  </div>`;
}

function renderModal(timed){
  const fns={meet:renderMeetModal,'add-event':renderPickerModal,library:renderLibraryModal,generate:renderGenerateModal,'facility-hours':renderFacilityHoursModal,'add-block':renderAddBlockModal,conflicts:renderConflictsModal,history:renderHistoryModal,shortcuts:renderShortcutsModal,saveDialog:renderSaveDialogModal,projections:renderProjectionsModal,'add-day':renderAddDayModal,'copy-day':renderCopyDayModal,overview:renderOverviewModal,'entry-sync':renderEntrySyncModal,'export':renderExportModal,'import-blocks':renderImportBlocksModal,'pa-cues':renderPaCueModal,'bcast-preview':renderBcastPreviewModal,'bcast-copy':renderBcastCopyModal,
    ...(typeof renderAnnModal==='function'?{'announcer':renderAnnModal}:{}),
    ...(typeof renderLiveTimesModal==='function'?{'live-times':renderLiveTimesModal}:{}),
    ...(typeof renderLiveApproveModal==='function'?{'live-approve':renderLiveApproveModal}:{}),
    ...(typeof renderLivePaceModal==='function'?{'live-pace':renderLivePaceModal}:{}),
    ...(typeof renderRecoveryModal==='function'?{'live-recovery':renderRecoveryModal}:{})};
  const fn=fns[UI.modal];if(!fn)return'';
  return`<div class="modal-bg" onclick="if(event.target===this){UI.modal=null;render()}">${fn(timed)}</div>`;
}

// Add-block chooser — proper modal, NO browser confirm()
function renderProjectionsModal(){
  if(UI.projLoading){
    return`<div class="modal modal-lg" onclick="event.stopPropagation()">
      <div class="modal-hd"><span class="modal-title">Athlete Projections</span><button class="modal-close" aria-label="Close" onclick="closeProjections()">×</button></div>
      <div class="modal-body" style="text-align:center;color:var(--tx3);padding:40px 22px">Loading projections…</div>
    </div>`;
  }
  if(UI.projError){
    return`<div class="modal modal-lg" onclick="event.stopPropagation()">
      <div class="modal-hd"><span class="modal-title">Athlete Projections</span><button class="modal-close" aria-label="Close" onclick="closeProjections()">×</button></div>
      <div class="modal-body">
        <div style="color:var(--red);font-size:13px;margin-bottom:12px">Could not load projections: ${esc(UI.projError)}</div>
        <button class="btn btn-p" onclick="refreshProjectionsData()">Retry</button>
      </div>
    </div>`;
  }
  const rows=UI.projRows||[];
  if(!rows.length){
    return`<div class="modal modal-lg" onclick="event.stopPropagation()">
      <div class="modal-hd"><span class="modal-title">Athlete Projections</span><button class="modal-close" aria-label="Close" onclick="closeProjections()">×</button></div>
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
    <div class="modal-hd"><span class="modal-title">Athlete Projections — Junior Nationals</span><button class="modal-close" aria-label="Close" onclick="closeProjections()">×</button></div>
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
      <button class="btn" onclick="openEntrySync()" title="Pull live registered entry counts from DiveMeets">Sync actual entries (DiveMeets)</button>
      <button class="btn btn-p" onclick="prefillProjections()">Pre-fill projected entries in this schedule</button>
    </div>
  </div>`;
}
function renderAddBlockModal(){
  const chip=(key,label)=>`<button class="chip" onclick="closeModal();addPracticeBlock(UI.dayId,'${key}')">${esc(label)}</button>`;
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Add to schedule</span><button class="modal-close" aria-label="Close" onclick="closeModal()">×</button></div>
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
            ${chip('cce','CCE Meeting')}
            ${chip('custom','Custom')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// Conflicts modal
function renderConflictsModal(){
  const h=computeHealth();
  const conflicts=h.issues;
  const errs=conflicts.filter(c=>c.sev==='err');
  const warns=conflicts.filter(c=>c.sev==='warn');
  const infos=conflicts.filter(c=>c.sev==='info');
  const ordered=[...errs,...warns,...infos];
  const scoreCls=h.score>=90?'var(--ok)':h.score>=70?'var(--warn)':'var(--red)';
  const impact=computeAthleteImpact(allTimed());
  const impactSection=impact?`<div class="ai-grid">
      <div class="ai-stat"><div class="ai-num">${impact.totalDivers}</div><div class="ai-lbl">projected divers in the field</div></div>
      <div class="ai-stat ${impact.tightTurnarounds?'warn':''}"><div class="ai-num">${impact.tightTurnarounds}</div><div class="ai-lbl">tight turnarounds (&lt;${REST_MIN_DEFAULT}m rest)</div></div>
      <div class="ai-stat ${impact.tripleDayDivers?'warn':''}"><div class="ai-num">${impact.tripleDayDivers}</div><div class="ai-lbl">divers with 3+ events in one day</div></div>
      <div class="ai-stat"><div class="ai-num">${impact.longestDay?fdur(impact.longestDay.span):'—'}</div><div class="ai-lbl">longest athlete day${impact.longestDay?` (${esc(impact.longestDay.name||'')})`:''}</div></div>
    </div>
    <p style="font-size:11px;color:var(--tx3);margin:6px 0 14px">Athlete impact is advisory, computed from the projected nationals field — it flags human cost, never changes your schedule.</p>`:'';
  return`<div class="modal modal-lg" onclick="event.stopPropagation()">
    <div class="modal-hd"><div style="display:flex;align-items:center;gap:12px"><span style="font-family:var(--font-display,inherit);font-size:30px;font-weight:700;color:${scoreCls};line-height:1">${h.score}</span><div><span class="modal-title">Schedule health</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${conflicts.length?`${errs.length} error${errs.length===1?'':'s'} · ${warns.length} warning${warns.length===1?'':'s'} · ${infos.length} note${infos.length===1?'':'s'}`:'No issues — gold-medal shape'}</div></div></div><button class="modal-close" aria-label="Close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      ${impactSection}
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
  const d=UI.historyDiff;
  const diffSection=(()=>{
    if(!d)return'';
    if(d.loading)return`<div style="padding:14px;color:var(--tx3);font-size:12px;text-align:center">Comparing…</div>`;
    if(d.error)return`<div style="padding:14px;color:var(--red);font-size:12px">${esc(d.error)}</div>`;
    const g=(title,items,color)=>items.length?`<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:${color};margin-bottom:4px">${title} (${items.length})</div>${items.map(x=>`<div style="font-size:12px;padding:3px 0 3px 10px;border-left:2px solid ${color}">${esc(x)}</div>`).join('')}</div>`:'';
    const diff=d.diff;
    return`<div class="hist-diff">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:12px;font-weight:700">Changes since "${esc(d.label)}"</div>
        <button class="btn btn-sm btn-gh" onclick="UI.historyDiff=null;render()">Hide</button>
      </div>
      ${diff.empty?`<div style="font-size:12px;color:var(--tx3)">No differences — the current schedule matches this version.</div>`:
        g('Days added',diff.daysAdded,'var(--prac)')+
        g('Days removed',diff.daysRemoved,'var(--red)')+
        g('Blocks added',diff.added,'var(--prac)')+
        g('Blocks removed',diff.removed,'var(--red)')+
        g('Moved to another day',diff.moved,'var(--cyan)')+
        g('Retimed',diff.retimed,'var(--navy)')+
        g('Renamed',diff.renamed,'var(--tx2)')+
        g('Events / entries changed',diff.changed,'var(--warn,#B45309)')}
    </div>`;
  })();
  return`<div class="modal" onclick="event.stopPropagation()">
    <div class="modal-hd"><div><span class="modal-title">Version history</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">Every cloud save is a restore point · snapshots are named markers you create</div></div><button class="modal-close" aria-label="Close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      ${!S.currentLibraryId?`<div class="empty"><div class="empty-title">Save to cloud first</div><div class="empty-sub">Version history starts once you save this schedule to the cloud.</div></div>`:
        UI.historyLoading?`<div style="text-align:center;padding:24px;color:var(--tx3);font-size:13px">Loading history…</div>`:
        (UI.historyVersions&&UI.historyVersions.length)?`${diffSection}<div class="hist-list">
          <div class="hist-item"><div class="hist-dot current"></div><div class="hist-info"><div class="hist-label">Current version</div><div class="hist-time">Working copy · ${fmtRelativeTime(S.updatedAt)}</div></div></div>
          ${UI.historyVersions.map(v=>`<div class="hist-item"><div class="hist-dot"></div><div class="hist-info"><div class="hist-label">${esc(v.label)}</div><div class="hist-time">${new Date(v.createdAt).toLocaleString()}</div></div><button class="hist-restore" style="margin-right:6px" onclick="compareVersion(${v.id},'${escJsAttr(v.label)}')">Compare</button><button class="hist-restore" onclick="restoreVersion(${v.id})">Restore</button></div>`).join('')}
        </div>`:`<div class="empty"><div class="empty-title">No versions yet</div><div class="empty-sub">Each cloud save creates a restore point. Save now to start tracking.</div></div>`}
    </div>
    <div class="modal-foot">
      ${S.currentLibraryId?`<button class="btn btn-sm" onclick="snapshotNow()" title="Save a named marker you can compare against or restore later">Snapshot now…</button>`:''}
      <div style="flex:1"></div>
      <button class="btn btn-p" onclick="closeModal()">Close</button>
    </div>
  </div>`;
}

// Shortcuts cheat sheet
function renderShortcutsModal(){
  const rows=[['Undo','Cmd / Ctrl + Z'],['Redo','Cmd / Ctrl + Shift + Z'],['Save to cloud','Cmd / Ctrl + S'],['Close panel / modal','Esc'],['This cheat sheet','?']];
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Keyboard shortcuts</span><button class="modal-close" aria-label="Close" onclick="closeModal()">×</button></div>
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
    <div class="modal-hd"><span class="modal-title">Meet setup</span><button class="modal-close" aria-label="Close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="fg"><label class="fl">Meet name</label><input class="fi" value="${esc(S.meet.name)}" onchange="upd(s=>s.meet.name=this.value)"/></div>
      <div class="fg"><label class="fl">DiveMeets meet ID <span style="font-weight:400;color:var(--tx3)">— powers "Sync actual entries" (Projections). Find it in the meet's DiveMeets URL, e.g. divemeets.com/MeetInfo/<b>12923</b></span></label><input class="fi" placeholder="e.g. 12923 — leave blank for ${DEFAULT_DIVEMEETS_MEET_ID} (2026 Jr Nationals)" value="${esc(S.meet.divemeetsId||'')}" onchange="upd(s=>s.meet.divemeetsId=this.value.trim())"/></div>
      <div class="fg"><label class="fl">Additional DiveMeets sources <span style="font-weight:400;color:var(--tx3)">— pull entries from other meets into specific event levels (e.g. a separate Qualifier + Nationals meet in a combined schedule, or a past meet used as a projection baseline).</span></label>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">${(S.meet.divemeetsSources||[]).map((src,i)=>{
          const scheduleLevels=distinctScheduleLevels();
          const active=new Set(src.levels||[]);
          const unknown=(src.levels||[]).filter(l=>!scheduleLevels.includes(l));
          return`
          <div style="display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--bd);border-radius:8px">
            <div style="display:flex;gap:6px;align-items:center">
              <input class="fi" style="width:90px;flex-shrink:0" placeholder="Meet ID" value="${esc(src.id||'')}" onchange="updateDivemeetsSource(${i},'id',this.value.trim())"/>
              <select class="fi" style="width:150px;flex-shrink:0;cursor:pointer" onchange="updateDivemeetsSource(${i},'role',this.value)">
                <option value="registered" ${src.role==='registered'?'selected':''}>Registered (live)</option>
                <option value="projected" ${src.role==='projected'?'selected':''}>Projected baseline</option>
              </select>
              <button class="btn btn-sm btn-gh" aria-label="Remove this source" style="margin-left:auto" onclick="removeDivemeetsSource(${i})">×</button>
            </div>
            <div style="font-size:11px;color:var(--tx3)">Applies to these event levels — click to toggle:</div>
            <div class="chiprow">${scheduleLevels.length?scheduleLevels.map(lvl=>`<button class="chip ${active.has(lvl)?'on':''}" onclick="toggleDivemeetsSourceLevel(${i},'${esc(lvl).replace(/'/g,"\\'")}')" type="button">${esc(lvl)}</button>`).join(''):'<span style="font-size:12px;color:var(--tx3)">No event levels in this schedule yet — add sessions first.</span>'}</div>
            ${unknown.length?`<div style="font-size:11px;color:var(--red)">⚠ Doesn't match any current level, so it matches nothing: ${unknown.map(esc).join(', ')} — click a chip above to fix.</div>`:''}
          </div>`;
        }).join('')||'<div style="font-size:12px;color:var(--tx3)">No additional sources — this schedule uses only the DiveMeets meet ID above.</div>'}
        </div>
        <button class="btn btn-sm" onclick="addDivemeetsSource()">+ Add source</button>
      </div>
      <div class="fg2"><div class="fg"><label class="fl">Venue</label><input class="fi" value="${esc(S.meet.venue)}" onchange="upd(s=>s.meet.venue=this.value)"/></div><div class="fg"><label class="fl">City / state</label><input class="fi" value="${esc(S.meet.city||'')}" onchange="upd(s=>s.meet.city=this.value)"/></div></div>
      <div class="fg2"><div class="fg"><label class="fl">Meet type</label><select class="fi" style="cursor:pointer" onchange="upd(s=>s.meet.meetType=this.value)">${typeOpts}</select></div><div class="fg"><label class="fl">Time zone</label><select class="fi" style="cursor:pointer" onchange="upd(s=>s.meet.timezone=this.value)">${tzOpts}</select></div></div>
      <div class="fg"><label class="fl">Days</label><div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">${S.meet.days.map((d,i)=>{const dt=dayEventTagOf(d);return`<div style="display:flex;flex-direction:column;gap:4px;padding:8px;border:1px solid var(--bd);border-radius:8px">
        <div style="display:flex;align-items:center;gap:4px"><input class="fi" type="date" style="width:160px;padding:6px 8px" value="${d.date}" onchange="upd(s=>s.meet.days[${i}].date=this.value)"/><button class="btn btn-sm btn-gh" onclick="upd(s=>s.meet.days.splice(${i},1))">×</button></div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--tx3)">
          <span>Pool open</span>
          <input class="fi-sm" type="time" value="${f24(dayOpenFor(d.id))}" onchange="setDayOpen('${d.id}',pt(this.value))"/>
          <span>to</span>
          <input class="fi-sm" type="time" value="${f24(dayCloseFor(d.id))}" onchange="setDayClose('${d.id}',pt(this.value))"/>
        </div>
        <div class="chiprow"><button class="chip ${!d.eventTag?'on':''}" onclick="setDayEventTag('${d.id}','')" title="Shared — appears in every event's schedule">Shared</button>${EVENT_TAGS.map(t=>`<button class="chip ${d.eventTag===t.k?'on':''}" style="${d.eventTag===t.k?`background:${t.c};border-color:${t.c};color:#fff`:''}" onclick="setDayEventTag('${d.id}','${t.k}')">${t.s}</button>`).join('')}</div>
      </div>`}).join('')}</div><button class="btn btn-sm" onclick="addDay()">+ Add day</button></div>
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
  const filtered=search?cat.filter(e=>`${evName(e)} ${e.style||''} ${e.alias||''}`.toLowerCase().includes(search)):cat;
  const sel=cat.find(e=>e.id===UI.pickerPreset);
  const rounds=sel?sel.rounds:[];
  const selRound=UI.pickerRound||rounds[0]||'';
  const n=getSessNum(sess,allTimed());
  return`<div class="modal modal-lg" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Add event — Session ${n}</span><button class="modal-close" aria-label="Close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <input class="ev-search-inp" placeholder="Search — Group A Girls, Platform, 3-Meter…" value="${esc(UI.pickerSearch)}" oninput="UI.pickerSearch=this.value;render()"/>
      <div class="ev-grid">${filtered.map(ev=>{const inSched=allUsed.has(`${ev.level}|${ev.gender}|${ev.apparatus}`);return`<div class="ev-pick-card ${ev.id===UI.pickerPreset?'sel':''}" onclick="UI.pickerPreset='${ev.id}';UI.pickerRound='';render()"><div class="epc-name">${esc(evName(ev))}</div><div class="epc-meta">${ev.defaultDives} dives default${ev.style==='Synchronized'?' · synchro pairs':''}</div><span class="epc-status ${inSched?'used':'avail'}">${inSched?'In schedule':'Available'}</span></div>`}).join('')}${!filtered.length?`<div style="grid-column:1/-1;padding:20px;text-align:center;font-size:12px;color:var(--tx3)">No events match</div>`:''}</div>
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
      <button class="lib-toptab ${tab==='templates'?'active':''}" onclick="UI.libTab='templates';render()">Templates</button>
      <button class="lib-toptab ${tab==='saves'?'active':''}" onclick="UI.libTab='saves';render()">📁 My Saved Meets${UI.neonLib.length?` <span class="lib-count">${UI.neonLib.length+local.length}</span>`:local.length?` <span class="lib-count">${local.length}</span>`:''}</button>
    </div>`;
  let body='';
  if(tab==='templates'){
    body=renderLibraryTemplates();
  }else{
    body=renderLibrarySaves(local);
  }
  return`<div class="modal modal-lg" onclick="event.stopPropagation()" style="max-height:calc(100vh - 48px);display:flex;flex-direction:column">
    <div class="modal-hd"><span class="modal-title">Schedule library</span><button class="modal-close" aria-label="Close" onclick="closeModal()">×</button></div>
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
      return`<div class="lib-card ${isPending?'pending':''}"><div class="lib-card-icon">${icon}</div><div class="lib-card-info"><div class="lib-card-name">${esc(item.name)}</div><div class="lib-card-meta">${fIcon} ${esc(item.folder)} · ${statusLine} · ${dt}${item.publishStatus?' · '+item.publishStatus:''}</div></div><div class="lib-card-acts">${isPending?`<button class="lib-act" aria-label="Push to cloud now" onclick="event.stopPropagation();pushOnePendingNow('${esc(item.id)}')" title="Push to cloud now">↑</button>`:''}<button class="lib-act p" onclick="${loadCall}">Load</button><button class="lib-act danger" aria-label="Delete this schedule" onclick="${delCall}" title="Delete">✕</button></div></div>`;
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
    toast('Pushed to cloud',2400);render();
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
    <div class="modal-hd"><span class="modal-title">Save schedule to cloud</span><button class="modal-close" aria-label="Close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="fg"><label class="fl">Schedule name</label><input id="save-dialog-name" class="fi" value="${esc(name)}" oninput="UI.saveDialogName=this.value" placeholder="2026 USA Diving …" autofocus/></div>
      <div class="fg"><label class="fl">Save to folder</label><div class="folder-picker">${folderOpts}</div></div>
      <div style="font-size:11px;color:var(--tx3);margin-top:8px">After saving, autosave will keep this save record current.</div>
    </div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="saveDialogConfirm()">Save</button></div>
  </div>`;
}


function toggleCombineLabels(){S.meet.showCombineLabels=!(S.meet.showCombineLabels!==false);saveS();genRender();}

// Re-render while preserving scroll positions inside the Generate modal. A plain render()
// rebuilds the whole DOM, which silently resets the controls column, the preview pane, and
// (in the stacked mobile layout) the modal itself back to the top — so every toggle click
// yanked the user to the top of the panel. Capture scrollTops before the rebuild and restore
// them after. Outside the Generate modal the selectors match nothing and this is identical
// to render().
function genRender(){
  const c=document.querySelector('.gen-controls');
  const p=document.querySelector('.gen-preview .pp');
  const m=document.querySelector('.gen-modal');
  const cs=c?c.scrollTop:0, ps=p?p.scrollTop:0, ms=m?m.scrollTop:0;
  render();
  const c2=document.querySelector('.gen-controls');
  const p2=document.querySelector('.gen-preview .pp');
  const m2=document.querySelector('.gen-modal');
  if(c2)c2.scrollTop=cs;
  if(p2)p2.scrollTop=ps;
  if(m2)m2.scrollTop=ms;
}

// ── GENERATE/PRINT SCOPE ─────────────────────────────────────────────
// Separate from the on-screen day-view filter (UI.eventFilter): this lets Mike print the
// SAME schedule three different ways for the public (Junior only, Senior only, Combined),
// each under its own correct official name, without permanently renaming the schedule or
// losing the title he typed for one scope when he switches to another.
// Scope is MULTI-SELECT across the three event tags. Senior Nationals and the
// National Qualifier run as one meet on the deck, so they routinely need to print
// as a single document — picking both is a normal thing to want, not an edge case.
//   []                      → All (combined): every block
//   ['senior','qualifier']  → blocks tagged with EITHER, plus untagged (shared) blocks
//   ['shared']              → untagged blocks only. Exclusive: "shared only" narrows
//                             the printout, so it can't be added on top of a tag.
// Kept in EVENT_TAGS order (not click order) so the label and the remembered title
// key are stable however you tap them.
function genScopes(){return Array.isArray(UI.genScopes)?UI.genScopes:[];}
function genScopesOrdered(){
  const sc=genScopes();
  if(sc.includes('shared'))return['shared'];
  return EVENT_TAGS.map(t=>t.k).filter(k=>sc.includes(k));
}
function genScopeOn(k){return genScopes().includes(k);}
function toggleGenScope(k){
  const cur=genScopes();
  if(k==='shared'){UI.genScopes=(cur.length===1&&cur[0]==='shared')?[]:['shared'];genRender();return;}
  const base=cur.filter(x=>x!=='shared');
  UI.genScopes=base.includes(k)?base.filter(x=>x!==k):[...base,k];
  genRender();
}
function clearGenScope(){UI.genScopes=[];genRender();}
// A block is in scope if it carries ANY of the selected tags, or is untagged
// (shared blocks — warm-ups, meetings, open training — belong to every printout).
function passesGenScope(sess){
  const sc=genScopes();
  if(!sc.length)return true;
  const tags=sessTags(sess);
  if(sc.length===1&&sc[0]==='shared')return!tags.length;
  return !tags.length||tags.some(t=>sc.includes(t));
}
/* Tag scope answers "which championship". These answer "which part of it" \u2014 one
   day for the desk, tomorrow's two finals for a coach \u2014 without deleting blocks or
   re-tagging anything. Empty means everything, so nothing changes for anyone who
   never touches them. */
function genDays(){return Array.isArray(UI.genDays)?UI.genDays:[]}
function genDayOn(id){return genDays().includes(id)}
function toggleGenDay(id){
  const cur=genDays();
  UI.genDays=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];
  // Block picks belong to the days they were made on. Keeping them across a day
  // change is how you end up printing nothing and not knowing why.
  UI.genSessIds=[];
  genRender();
}
function clearGenDays(){UI.genDays=[];UI.genSessIds=[];genRender();}
function genSessIds(){return Array.isArray(UI.genSessIds)?UI.genSessIds:[]}
function genSessOn(id){const p=genSessIds();return !p.length||p.includes(id)}
// Every block on the chosen days that also passes the tag scope, in the order the
// meet runs. This is the list the checkboxes are drawn from and measured against.
function genDayPool(){
  const days=genDays();
  const order=(S.meet.days||[]).map(d=>d.id);
  return (typeof allTimed==='function'?allTimed():[])
    .filter(s=>!days.length||days.includes(s.dayId))
    .filter(passesGenScope)
    .sort((a,b)=>(order.indexOf(a.dayId)-order.indexOf(b.dayId))
      ||((a.timing?a.timing.warmupStartMinutes:0)-(b.timing?b.timing.warmupStartMinutes:0)));
}
function toggleGenSess(id){
  const pool=genDayPool().map(s=>s.id);
  let cur=genSessIds();
  if(!cur.length)cur=pool.slice();          // "all" becomes explicit the moment one is dropped
  UI.genSessIds=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];
  if(UI.genSessIds.length>=pool.length)UI.genSessIds=[];   // back to all, stored as all
  genRender();
}
function genPickAllBlocks(){UI.genSessIds=[];genRender();}
function toggleGenBlockPicker(){UI.genPickBlocks=!UI.genPickBlocks;genRender();}
function passesGenPick(sess){
  const days=genDays();
  if(days.length&&!days.includes(sess.dayId))return false;
  const ids=genSessIds();
  if(ids.length&&!ids.includes(sess.id))return false;
  return true;
}
function genTimedForPreview(timed){
  const needTag=genScopes().length, needPick=genDays().length||genSessIds().length;
  if(!needTag&&!needPick)return timed;
  return timed.filter(s=>(!needTag||passesGenScope(s))&&passesGenPick(s));
}
function genTitleKey(){const sc=genScopesOrdered();return sc.length?sc.join('+'):'all';}
function genTitle(){
  if(!UI.genTitles)UI.genTitles={};
  const k=genTitleKey();
  if(UI.genTitles[k]==null)UI.genTitles[k]=S.meet.name||'';
  return UI.genTitles[k];
}
function setGenTitle(v){
  if(!UI.genTitles)UI.genTitles={};
  UI.genTitles[genTitleKey()]=v;
}
function genScopeLabel(){
  const sc=genScopesOrdered();
  if(!sc.length)return'Combined';
  if(sc.length===1&&sc[0]==='shared')return'Shared blocks';
  return sc.map(k=>(EVENT_TAGS.find(t=>t.k===k)||{}).l||k).join(' + ');
}
function renderGenerateModal(timed){
  ensureProjDataLoaded();
  ensureEntrantsLoaded();
  const aud=UI.genAud;const cfg={...AUD[aud]};
  const showLbl=S.meet.showCombineLabels!==false;
  const audDesc={public:'Clean public-facing schedule — event names and session times only.',athletes:'For competitors — adds warm-up windows and event start/end times.',judges:'Full detail for officials — entries, seconds per dive, and all timing.',internal:'Operations master — every field, for staff running the meet.',broadcast:'Second-by-second run-of-show for the streaming partner and the arena announcer — any final on the broadcast clock.'};
  const genTimed=genTimedForPreview(timed);
  return`<div class="modal modal-lg gen-modal" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Generate output</span><button class="modal-close" aria-label="Close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="gen-layout">
        <div class="gen-controls">
          <div class="gen-sec-lbl">Print scope</div>
          <div class="chiprow">
            <button class="chip ${!genScopes().length?'on':''}" onclick="clearGenScope()">All (combined)</button>
            ${EVENT_TAGS.map(t=>`<button class="chip ${genScopeOn(t.k)?'on':''}" onclick="toggleGenScope('${t.k}')">${t.l}</button>`).join('')}
            <button class="chip ${genScopeOn('shared')?'on':''}" onclick="toggleGenScope('shared')">Shared only</button>
          </div>
          <p style="font-size:11px;color:var(--tx3);margin:4px 0 8px;line-height:1.4"><b>Tap more than one to print them together</b> — e.g. Senior Nationals + National Qualifier comes out as one document. Only blocks tagged for the scopes you pick (plus Shared blocks) are included, and days with nothing in scope are skipped entirely. Every combination remembers its own title below, so switching back and forth doesn't lose what you typed.${genScopesOrdered().length>1?`<br/><b style="color:var(--cyan)">Printing ${esc(genScopeLabel())} together.</b>`:''}</p>
          ${(()=>{
            // Days first, then blocks within them. Both are plain lists of the
            // thing on the schedule, not a query to compose.
            const order=(S.meet.days||[]);
            const pool=genDayPool();
            const has=id=>timed.some(s=>s.dayId===id&&passesGenScope(s));
            const dshort=d=>{const a=String(d||'').split('-').map(Number);
              if(a.length<3||!a[0])return String(d||'');
              return new Date(a[0],a[1]-1,a[2]).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});};
            const days=order.filter(d=>has(d.id));
            if(!days.length)return'';
            const picked=genSessIds();
            const nShown=pool.filter(s=>genSessOn(s.id)).length;
            const blkName=s=>{
              try{if(typeof sessLabelOf==='function'){const l=sessLabelOf(s,timed);if(l)return l;}}catch(e){}
              return s.title||(s.events||[]).map(evName).join(' \u00b7 ')||'Block';
            };
            return `
          <div class="gen-sec-lbl">Days</div>
          <div class="chiprow">
            <button class="chip ${!genDays().length?'on':''}" onclick="clearGenDays()" title="Every day of the meet">All days</button>
            ${days.map(d=>`<button class="chip ${genDayOn(d.id)?'on':''}" onclick="toggleGenDay('${d.id}')">${esc(dshort(d.date))}</button>`).join('')}
          </div>
          <div class="gen-sec-lbl" style="margin-top:10px">Blocks
            <button class="gen-blk-tog" onclick="toggleGenBlockPicker()">${UI.genPickBlocks?'Hide the list':'Choose blocks\u2026'}</button></div>
          <p style="font-size:11px;color:var(--tx3);margin:2px 0 6px;line-height:1.4">${picked.length
            ? `<b style="color:var(--cyan)">${nShown} of ${pool.length} blocks</b> \u2014 <button class="gen-blk-tog" onclick="genPickAllBlocks()">put them all back</button>`
            : `All ${pool.length} block${pool.length===1?'':'s'} on the ${genDays().length?'chosen day'+(genDays().length===1?'':'s'):'whole meet'}. Changing the days puts every block back.`}</p>
          ${UI.genPickBlocks?`<div class="gen-blks">${pool.map(s=>`
            <label class="gen-blk"><input type="checkbox" ${genSessOn(s.id)?'checked':''} onchange="toggleGenSess('${s.id}')"/>
              <span class="gen-blk-t">${esc(f12(s.timing?s.timing.warmupStartMinutes:0))}</span>
              <span class="gen-blk-n">${esc(blkName(s))}</span>
              <span class="gen-blk-d">${esc(dshort(((S.meet.days||[]).find(d=>d.id===s.dayId)||{}).date))}</span></label>`).join('')
            ||'<div class="gen-blk-none">Nothing on these days matches the scope above.</div>'}</div>`:''}
          <div class="fdiv"></div>`;
          })()}
          <div class="fg"><label class="fl">Title for this printout</label><input class="fi" value="${esc(genTitle())}" onchange="setGenTitle(this.value);genRender()" placeholder="${esc(S.meet.name||'Meet name')}"/></div>
          <div class="fdiv"></div>
          <div class="gen-sec-lbl">Audience</div>
          <div class="audgrid">${Object.entries(AUD).map(([k,a])=>`<button class="audcard ${aud===k?'sel':''}" onclick="UI.genAud='${k}';genRender()"><div class="audname">${a.l}</div></button>`).join('')}</div>
          <p class="gen-aud-desc">${audDesc[aud]||''}</p>
          ${aud==='broadcast'?`
          <div class="gen-sec-lbl">Who is this run-of-show for?</div>
          <div class="chiprow">${typeof bcastCopyChips==='function'?bcastCopyChips('genRender()'):''}</div>
          <p style="font-size:11px;color:var(--tx3);margin:6px 0 8px;line-height:1.45">${typeof bcastCopyNote==='function'?bcastCopyNote():''} This is the same choice as the one on the block's own run-of-show section \u2014 setting it in either place sets it in both.</p>
          <p style="font-size:11px;color:var(--tx3);margin:6px 0 10px;line-height:1.4">Leave the PA column on for the arena announcer's copy. Switch it off for the clean version you hand the streaming partner.</p>
          <button class="btn btn-sm" onclick="UI.modal='pa-cues';render()">Edit PA announcements</button>
          <p style="font-size:11px;color:var(--tx3);margin-top:8px;line-height:1.4">Only Senior finals sessions with broadcast timing switched on appear here. Turn it on from the session editor.</p>
          `:`
          <div class="gen-sec-lbl">Show / hide</div>
          <div class="gen-toggles">
            <label class="togrow"><span>Warm-up times</span><span class="tog"><input type="checkbox" ${cfg.showWU?'checked':''} onchange="AUD['${aud}'].showWU=this.checked;genRender()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Event start / end times</span><span class="tog"><input type="checkbox" ${cfg.showTimes?'checked':''} onchange="AUD['${aud}'].showTimes=this.checked;genRender()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Event entries (divers)</span><span class="tog"><input type="checkbox" ${cfg.showEntries?'checked':''} onchange="AUD['${aud}'].showEntries=this.checked;genRender()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Seconds per dive</span><span class="tog"><input type="checkbox" ${cfg.showSec?'checked':''} onchange="AUD['${aud}'].showSec=this.checked;genRender()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Athlete introduction times</span><span class="tog"><input type="checkbox" ${cfg.showIntros!==false?'checked':''} onchange="AUD['${aud}'].showIntros=this.checked;genRender()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Awards ceremony times</span><span class="tog"><input type="checkbox" ${cfg.showAwards!==false?'checked':''} onchange="AUD['${aud}'].showAwards=this.checked;genRender()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Group practice at top of day</span><span class="tog"><input type="checkbox" ${cfg.practiceTop?'checked':''} onchange="AUD['${aud}'].practiceTop=this.checked;genRender()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Flighted warm-up athlete counts</span><span class="tog"><input type="checkbox" ${cfg.showFlightCounts?'checked':''} onchange="AUD['${aud}'].showFlightCounts=this.checked;genRender()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Split-board events: show unsplit time</span><span class="tog"><input type="checkbox" ${cfg.showUnsplitAlt?'checked':''} onchange="AUD['${aud}'].showUnsplitAlt=this.checked;genRender()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>Unsplit events: show split time</span><span class="tog"><input type="checkbox" ${cfg.showSplitAlt?'checked':''} onchange="AUD['${aud}'].showSplitAlt=this.checked;genRender()"><span class="togsl"></span></span></label>
            <label class="togrow"><span>"Combined" / "Simultaneous" labels</span><span class="tog"><input type="checkbox" ${showLbl?'checked':''} onchange="toggleCombineLabels()"><span class="togsl"></span></span></label>
          </div>
          <p style="font-size:11px;color:var(--tx3);margin-top:6px;line-height:1.4">The split what-if figures are duration-only reference numbers for planning — they don't reflow the rest of the day's start/end times. Use the Operations audience for these; they're not meant for public-facing output.</p>
          `}
        </div>
        <div class="gen-preview">
          <div class="gen-sec-lbl">Preview — ${esc(genScopeLabel())} <span class="pp-scrollhint">scroll to see full schedule</span></div>
          ${aud==='broadcast'
            ?renderBcastSheet(genTimed.filter(s=>s.timing&&((bcastOn(s)&&s.timing.bcastRows)||s.timing.deferredAwards)),{title:genTitle(),showCues:!cfg.forCoaches&&cfg.showCues!==false,forCoaches:!!cfg.forCoaches})
            :renderPP(genTimed,cfg,genTitle())}
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-gh" onclick="closeModal()">Close</button>
      <div style="flex:1"></div>
      ${aud==='broadcast'
        ?`${cfg.forCoaches?'':`<button class="btn" onclick="UI.bcastSessId=null;exportBroadcast()">Run-of-show (.xlsx)</button>`}
           <button class="btn btn-p" onclick="UI.bcastSessId=null;printBroadcast()">${cfg.forCoaches?"Coaches' copy \u2014 Print / PDF":'Print / PDF'}</button>`
        :`<button class="btn" onclick="exportOpsTimeline()">Ops Timeline (.xlsx)</button>
           <button class="btn" onclick="exportExcel()">Excel</button>
           <button class="btn btn-p" onclick="printReport()">Print / PDF</button>`}
    </div>
  </div>`;
}


function printReport(){
  const timed=genTimedForPreview(allTimed());
  const aud=UI.genAud||'public';
  const cfg={...AUD[aud]};
  const title=genTitle()||S.meet.name||'USA Diving Schedule';
  const meetName=title.replace(/[^\w\s\-\.]/g,'').trim();
  const reportHTML=renderPP(timed,cfg,title);
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
/* Introductions + awards — the two windows athletes and coaches plan around */
.pp-x{display:flex;align-items:baseline;gap:8px;padding:4px 9px;margin:4px 0;border-radius:6px;font-size:11px;border-left:3px solid transparent;break-inside:avoid}
.pp-x-nm{font-weight:700}
.pp-x-ev{font-size:9.5px;opacity:.85}
.pp-x-tm{margin-left:auto;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.pp-x.intro{background:#EEF6FB;border-left-color:#009AC7;color:#0A5E7A}
.pp-x.awards{background:#FDF0F2;border-left-color:#E31937;color:#8E1223}
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

// Athlete introductions and medal ceremonies are the two things a diver or a
// coach plans the day around, and until now they were invisible on the printed
// sheet — folded silently into the session's start and end times. This reads the
// windows back out, from the broadcast run-of-show when there is one, otherwise
// from the session's own intro minutes and awards flag.
function sessCeremonyWindows(sess){
  const t = (sess && sess.timing) || {};
  const out = {intro:null, awards:null};
  const rows = t.bcastRows;
  if (rows && rows.length){
    const pres = rows.filter(r => r.kind === 'presentation');
    if (pres.length){
      out.intro = {start: pres[0].startSec/60, end: pres[pres.length-1].endSec/60,
                   label: 'Athlete introductions'};
    } else if (rows.some(r => r.kind === 'introsdone')){
      out.intro = {moved: true, label: 'Finalists are introduced in the block before this one'};
    }
    const cer = rows.filter(r => r.kind === 'ceremony');
    if (cer.length){
      const prep = rows.find(r => r.kind === 'ceremonyprep');
      const names = [];
      cer.forEach(r => { if (r.evName && names.indexOf(r.evName) < 0) names.push(r.evName); });
      out.awards = {start: (prep ? prep.startSec : cer[0].startSec)/60,
                    end: cer[cer.length-1].endSec/60,
                    label: 'Awards ceremony', evNames: names};
    } else if (rows.some(r => r.kind === 'handoff')){
      out.awards = {moved: true, label: 'Awards are presented after the next block'};
    }
    return out;
  }
  const intro = Number(sess.introMinutes || 0);
  if (intro > 0 && t.warmupEndMinutes != null && t.eventStartMinutes > t.warmupEndMinutes)
    out.intro = {start: t.warmupEndMinutes, end: t.eventStartMinutes, label: 'Introductions'};
  if (sess.awardsEnabled && t.competitiveEnd != null && t.sessionEndMinutes > t.competitiveEnd)
    out.awards = {start: t.competitiveEnd, end: t.sessionEndMinutes, label: 'Awards ceremony'};
  return out;
}

function renderPP(timed,cfg,titleOverride){
  // Internal-only blocks (e.g. staff meetings like a CCE meeting) never appear on
  // public-facing outputs. Only the Operations audience includes them, marked "internal".
  timed=timed.filter(s=>!s.hideFromPublic||cfg.showInternalBlocks);
  if(!S.meet.days.length||!timed.length){
    const msg=!S.sessions.length?'No schedule to preview yet \u2014 add sessions and events first.'
      :(genDays().length||genSessIds().length)?'Nothing to print for the days or blocks you picked \u2014 widen the selection above.'
      :genScopes().length?'No blocks tagged for this scope yet \u2014 tag blocks via the editor ("Part of"), or switch scope.'
      :'No schedule to preview yet \u2014 add sessions and events first.';
    return`<div class="pp"><div class="pp-empty">${esc(msg)}</div></div>`;
  }
  const showLbl=S.meet.showCombineLabels!==false;
  const meetName=esc(titleOverride!=null?titleOverride:(S.meet.name||'Championship'));
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
    const splitEligible=!isPlatform(ev.apparatus)&&ev.round!=='Final'&&!ev._combined;
    const splitNow=Boolean(ev.manualSplit)&&splitEligible;
    return`<tr class="pe ${i%2?'alt':''}">
      <td class="pe-nm">${esc(nm)}${(ev._combined&&showLbl)?`<span class="pe-tag combined">Combined</span>`:''}${(ev._simul&&showLbl)?`<span class="pe-tag simul">Simultaneous</span>`:''}${splitNow?`<span class="pe-tag split">Split boards</span>`:''}${(splitNow&&cfg.showUnsplitAlt)?`<span class="pe-tag altsplit">Unsplit: ${fdur(altSplitEvDur(ev))}</span>`:''}${(!splitNow&&splitEligible&&cfg.showSplitAlt)?`<span class="pe-tag altsplit">If split: ${fdur(altSplitEvDur(ev))}</span>`:''}</td>
      ${cfg.showEntries?`<td class="pe-div">${divers?divers+'<span class="pe-u">divers</span>':'<span class="pe-dash">—</span>'}</td>`:''}
      ${cfg.showSec?`<td class="pe-sec">${ev._bcast?bcastEvSpd(ev):(ev.secondsPerDive||ev.defaultSpd||35)}<span class="pe-u">s/dive</span></td>`:''}
      ${cfg.showTimes?`<td class="pe-tm">${f12(ev.eventStartMinutes)} – ${f12(ev.eventEndMinutes)}</td>`:''}
    </tr>`;
  }
  function pracBlock(sess){
    const t=sess.timing;const ft=t.flightTimes||[];
    const closeNote=sess.fitToClose?'  •  until facility close':'';
    return`<div class="pp-prac">
      <div class="pp-prac-t"><span class="pp-prac-name">${esc(sess.title||'Open Training')}${sess.hideFromPublic?` <span style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#B45309;background:#FEF3C7;border-radius:4px;padding:1px 6px;vertical-align:middle">Internal — not on public schedule</span>`:''}</span><span class="pp-prac-time">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)}${closeNote}</span></div>
      ${ft.length?`<div class="pp-prac-flights">${ft.map(f=>{
        const cr=(cfg.showFlightCounts&&UI.projRows)?athleteCountForFlight(f):null;
        return`<div class="pp-prac-f"><span>${esc(f.name)}</span><span>${f12(f.startMinutes)} – ${f12(f.endMinutes)}${cr!=null?` · ${cr.total} athlete${cr.total===1?'':'s'}${cr.registered!=null?` (${cr.registered} registered)`:''}`:''}</span></div>`;
      }).join('')}</div>`:''}
    </div>`;
  }
  function ceremonyRow(o,cls){
    if(!o)return'';
    const ev=(o.evNames&&o.evNames.length)?`<span class="pp-x-ev">${esc(o.evNames.join(' · '))}</span>`:'';
    const tm=o.moved?'':`<span class="pp-x-tm">${f12(o.start)} – ${f12(o.end)}</span>`;
    return`<div class="pp-x ${cls}"><span class="pp-x-nm">${esc(o.label)}</span>${ev}${tm}</div>`;
  }
  function sessBlock(sess){
    const t=sess.timing;const n=getSessNum(sess,timed);
    const hasFinals=sess.events.some(e=>e.round==='Final');
    const kind=hasFinals?'Finals':sess.events.some(e=>e.round==='Prelim')?'Preliminaries':sess.events.some(e=>e.round==='Qualifier')?'Qualifier':'Session';
    const cw=sessCeremonyWindows(sess);
    return`<div class="pp-sess">
      <div class="pp-sess-hd">
        <span class="pp-sess-badge ${hasFinals?'finals':''}">${kind}</span>${(sess.timing&&sess.timing.bcastRows)?`<span class="pp-sess-badge" style="background:#009AC7">On air</span>`:''}
        <span class="pp-sess-n">Session ${n}</span>
        <span class="pp-sess-win">${f12(t.eventStartMinutes)} – ${f12(t.sessionEndMinutes)}</span>
        ${cfg.showWU?`<span class="pp-sess-wu">Warm-up ${f12(t.warmupStartMinutes)}–${f12(t.warmupEndMinutes)}</span>`:''}
      </div>
      ${cfg.showIntros!==false?ceremonyRow(cw.intro,'intro'):''}
      <table class="pp-tbl"><tbody>${(t.events||[]).map(evRow).join('')}</tbody></table>
      ${cfg.showAwards!==false?ceremonyRow(cw.awards,'awards'):''}
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
function splitPanelRot(ev){const r=splitRotFor(ev);return r?`Panel A: ${r.pA} | Panel B: ${r.pB}`:'Review manually'}

// True .xlsx workbook download (ExcelJS). The old exports wrote HTML with a
// .xls extension, which made Excel show a "format and extension don't match /
// file could be corrupted" warning on every open. Real .xlsx opens clean.
async function xlsxSave(wb,filename,toastMsg){
  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);
  if(toastMsg)toast(toastMsg);
}

async function exportOpsTimeline(){
  if(typeof ExcelJS==='undefined'){toast('Excel engine not loaded — using compatibility export');return exportOpsTimelineLegacy();}
  try{
  const timed=genTimedForPreview(allTimed());
  const title=genTitle()||S.meet.name||'USA Diving Schedule';
  const N='FF171F69',R='FFE31937',C='FF009AC7',LB='FFD6EBF8',PK='FFFFF0F4',W='FFFFFFFF',G='FFF0F2F6';
  const roundBg=rd=>rd==='Final'?'FFFEF2F2':rd==='Prelim'?'FFF0FDF4':'FFEEF3FD';
  const wb=new ExcelJS.Workbook();wb.creator='USA Diving';wb.created=new Date();
  const ws=wb.addWorksheet('Ops Timeline',{views:[{state:'frozen',ySplit:3}]});
  ws.columns=[{width:14},{width:10},{width:36},{width:9},{width:38},{width:8},{width:9},{width:9},{width:10},{width:11},{width:11},{width:8},{width:11},{width:11},{width:11},{width:11}];
  const thin={style:'thin',color:{argb:'FF888888'}};
  const BORD={top:thin,left:thin,bottom:thin,right:thin};
  const fill=a=>({type:'pattern',pattern:'solid',fgColor:{argb:a}});
  // Title block
  ws.mergeCells('A1:P1');
  const t1=ws.getCell('A1');t1.value=title;t1.font={bold:true,size:16,color:{argb:N}};t1.alignment={vertical:'middle'};ws.getRow(1).height=26;
  ws.mergeCells('A2:P2');
  const t2=ws.getCell('A2');t2.value='Operations Timeline · USA Diving · '+new Date().toLocaleDateString();t2.font={size:10,color:{argb:'FF666666'}};ws.getRow(2).height=16;
  // Header row
  const headers=['Day/Session','Round','Event','Format','Panel Rotation','# Dives','# Divers','Sec/Dive','Event Min','Prac Start','Prac End','WU Min','WU Start','WU End','Ev Start','Ev End'];
  const hr=ws.addRow(headers);hr.height=20;
  hr.eachCell((c,i)=>{const bg=(i>=6&&i<=8)?C:(i>=15)?R:N;c.fill=fill(bg);c.font={bold:true,size:10,color:{argb:W}};c.alignment={horizontal:(i===3||i===5)?'left':'center',vertical:'middle',wrapText:true};c.border=BORD;});
  // Row helpers
  const bandRow=(text,bg,align)=>{const r=ws.addRow([text]);ws.mergeCells(`A${r.number}:P${r.number}`);const c=r.getCell(1);c.fill=fill(bg);c.font={bold:true,size:11,color:{argb:W}};c.alignment={horizontal:align,vertical:'middle'};c.border=BORD;r.height=18;};
  const dataRow=(vals,bg,over)=>{while(vals.length<16)vals.push('');const r=ws.addRow(vals);for(let i=1;i<=16;i++){const c=r.getCell(i);c.border=BORD;c.font={size:10};c.alignment={horizontal:(i===3||i===5)?'left':'center',vertical:'middle'};if(bg)c.fill=fill(bg);const o=over&&over[i];if(o){if(o.bg)c.fill=fill(o.bg);if(o.font)c.font=Object.assign({size:10},o.font);}}};
  const mins=v=>Math.round(Number(v||0)*10)/10;
  const cyan={bg:C,font:{bold:true,color:{argb:W}}};
  S.meet.days.forEach(day=>{
    const ds=timed.filter(s=>s.dayId===day.id).sort((a,b)=>a.warmupStartMinutes-b.warmupStartMinutes);
    if(!ds.length)return;
    bandRow(String(fullDate(day.date)).toUpperCase(),R,'center');
    ds.forEach((sess,si)=>{
      const t=sess.timing;const n=getSessNum(sess,timed);const bg=si%2===0?LB:PK;
      const label=sess.isPractice?(sess.title||'Open Training'):`Session ${n}`;
      bandRow(label,N,'left');
      if(sess.isPractice){
        const ev=sess.events[0]||{};
        const ft=t.flightTimes||[];
        dataRow(['','Practice',ev.customLabel||label,'','','','','',mins(ev.customDurationMinutes),f12(t.eventStartMinutes),f12(t.sessionEndMinutes),'','','',f12(t.eventStartMinutes),f12(t.sessionEndMinutes)],bg,{15:cyan,16:cyan});
        ft.forEach(f=>dataRow(['','Flight','↳ '+f.name,'','','','','',mins(f.durationMinutes),f12(f.startMinutes),f12(f.endMinutes),'','','',f12(f.startMinutes),f12(f.endMinutes)],bg,{15:cyan,16:cyan}));
        return;
      }
      const intro=Number(sess.introMinutes||0);
      if(intro>0)dataRow(['','Intro','Introductions','','','','','',mins(intro),'','',Number(sess.warmupMinutes||0),f12(t.warmupStartMinutes),f12(t.warmupEndMinutes),f12(t.warmupStartMinutes-intro),f12(t.warmupStartMinutes)],bg,{15:cyan,16:cyan});
      (t.events||[]).forEach(ev=>{
        const dur=calcEvDur(ev);const split=ev.manualSplit&&!isPlatform(ev.apparatus);
        const onAir=Boolean(ev._bcast);const spdShown=onAir?bcastEvSpd(ev):Number(ev.secondsPerDive||ev.defaultSpd||0);const minShown=onAir?Number(ev.evMin||0):dur.evMin;
        dataRow(['',evRound(ev),evName(ev)+(split?' (Split)':'')+(onAir?' [BROADCAST]':''),split?'Split':'',split?splitPanelRot(ev):'',Number(ev.numberOfDives||ev.defaultDives||0),entryValue(ev),spdShown,mins(minShown),'','',Number(sess.warmupMinutes||0),f12(t.warmupStartMinutes),f12(t.warmupEndMinutes),f12(ev.eventStartMinutes),f12(ev.eventEndMinutes)],bg,
          {2:{bg:roundBg(ev.round),font:{bold:true,size:9}},6:{bg:G,font:{bold:true}},7:{bg:G,font:{bold:true}},8:{bg:G,font:{bold:true}},12:{font:{bold:true}},13:{font:{bold:true}},14:{font:{bold:true}},15:cyan,16:cyan});
      });
    });
  });
  const fr=ws.addRow(['USA Diving · '+title+' · '+new Date().toLocaleDateString()]);
  ws.mergeCells(`A${fr.number}:P${fr.number}`);fr.getCell(1).font={size:9,color:{argb:'FF888888'}};
  await xlsxSave(wb,`${title.replace(/[^a-z0-9]/gi,'-')}-ops-timeline.xlsx`,'Operations timeline downloaded');
  }catch(e){console.error('[ops timeline xlsx]',e);toast('Excel export failed — using compatibility export');exportOpsTimelineLegacy();}
}

async function exportExcel(){
  if(typeof ExcelJS==='undefined'){toast('Excel engine not loaded — using compatibility export');return exportExcelLegacy();}
  try{
  const timed=genTimedForPreview(allTimed());
  const title=genTitle()||S.meet.name||'USA Diving Schedule';
  const N='FF171F69',W='FFFFFFFF';
  const wb=new ExcelJS.Workbook();wb.creator='USA Diving';wb.created=new Date();
  const ws=wb.addWorksheet('Schedule',{views:[{state:'frozen',ySplit:2}]});
  ws.columns=[{width:22},{width:14},{width:34},{width:11},{width:9},{width:8},{width:10},{width:8},{width:11},{width:11},{width:11}];
  const fill=a=>({type:'pattern',pattern:'solid',fgColor:{argb:a}});
  const botBd={bottom:{style:'thin',color:{argb:'FFDDDDDD'}}};
  ws.mergeCells('A1:K1');
  const t1=ws.getCell('A1');t1.value=title;t1.font={bold:true,size:15,color:{argb:N}};ws.getRow(1).height=24;
  const hr=ws.addRow(['Day','Session','Event','Round','Divers','Dives','Sec/dive','Split','Warm-up','Start','End']);hr.height=18;
  hr.eachCell(c=>{c.fill=fill(N);c.font={bold:true,size:10,color:{argb:W}};c.alignment={horizontal:'left',vertical:'middle'};});
  S.meet.days.forEach(day=>{
    const ds=timed.filter(s=>s.dayId===day.id).sort((a,b)=>a.warmupStartMinutes-b.warmupStartMinutes);
    if(!ds.length)return;
    const dr=ws.addRow([fullDate(day.date)]);ws.mergeCells(`A${dr.number}:K${dr.number}`);
    dr.getCell(1).fill=fill('FFE8ECFF');dr.getCell(1).font={bold:true,size:11,color:{argb:N}};dr.height=17;
    ds.forEach(sess=>{
      const t=sess.timing;const n=getSessNum(sess,timed);
      const lbl=sess.isPractice?(sess.title||'Practice'):`Session ${n}`;
      const sr=ws.addRow(['',`${lbl} · ${f12(t.warmupStartMinutes)}–${f12(t.sessionEndMinutes)}`]);
      ws.mergeCells(`B${sr.number}:K${sr.number}`);
      sr.getCell(2).fill=fill('FFF5F6FA');sr.getCell(2).font={bold:true,size:10};
      (t.events||[]).forEach(ev=>{
        const r=ws.addRow([fullDate(day.date),lbl,evName(ev),ev.round||'',entryValue(ev),Number(ev.numberOfDives||ev.defaultDives||0),Number(ev.secondsPerDive||ev.defaultSpd||35),ev.manualSplit&&!isPlatform(ev.apparatus)?'Yes':'',f12(t.warmupStartMinutes),f12(ev.eventStartMinutes),f12(ev.eventEndMinutes)]);
        r.eachCell({includeEmpty:true},c=>{c.font={size:10};c.border=botBd;});
      });
    });
  });
  await xlsxSave(wb,`${title.replace(/[^a-z0-9]/gi,'-')}-schedule.xlsx`,'Excel downloaded');
  }catch(e){console.error('[schedule xlsx]',e);toast('Excel export failed — using compatibility export');exportExcelLegacy();}
}

// Legacy HTML-in-.xls exports — only used if the ExcelJS library fails to
// load (e.g. no internet at the pool). Excel will show a format warning on
// open; the content is safe.
function exportOpsTimelineLegacy(){
  const timed=genTimedForPreview(allTimed());
  const title=genTitle()||S.meet.name||'USA Diving Schedule';
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
      (t.events||[]).forEach(ev=>{const dur=calcEvDur(ev);const split=ev.manualSplit&&!isPlatform(ev.apparatus);const rBg=ev.round==='Final'?'#FEF2F2':ev.round==='Prelim'?'#F0FDF4':'#EEF3FD';rows+=`<tr style="background:${bg}">${td('')}${td(evRound(ev),`background:${rBg};font-weight:700;font-size:10px`)}${tdL(evName(ev)+(split?' (Split)':''))}${td(split?'Split':'')}${tdL(split?splitPanelRot(ev):'')}${td(ev.numberOfDives||ev.defaultDives||0,`background:${G};font-weight:700`)}${td(ev.numberOfDivers||0,`background:${G};font-weight:700`)}${td(ev.secondsPerDive||ev.defaultSpd||0,`background:${G};font-weight:700`)}${td(fd1(dur.evMin))}${td('')}${td('')}${td(sess.warmupMinutes||0,'font-weight:700')}${td(f12(t.warmupStartMinutes),'font-weight:700')}${td(f12(t.warmupEndMinutes),'font-weight:700')}${td(f12(ev.eventStartMinutes),`font-weight:700;background:${C};color:${W}`)}${td(f12(ev.eventEndMinutes),`font-weight:700;background:${C};color:${W}`)}</tr>`});
    });
  });
  const html=`<html><head><meta charset="UTF-8"><style>body{font-family:Arial;font-size:11px}table{border-collapse:collapse;width:100%}</style></head><body><div style="display:flex;align-items:center;gap:16px;padding:12px 16px;border-bottom:3px solid ${N};margin-bottom:12px"><img src="../shared/images/logo-color-horizontal.png" style="height:40px"/><div><div style="font-size:18px;font-weight:700;color:${N}">${esc(title)}</div><div style="font-size:12px;color:#666">Operations Timeline</div></div></div><table><thead><tr>${th('Day/Session')}${th('Round')}${th('Event','text-align:left')}${th('Format')}${th('Panel Rotation','text-align:left')}${th('# Dives',`background:${C}`)}${th('# Divers',`background:${C}`)}${th('Sec/Dive',`background:${C}`)}${th('Event Min')}${th('Prac Start')}${th('Prac End')}${th('WU Min')}${th('WU Start')}${th('WU End')}${th('Ev Start',`background:${R}`)}${th('Ev End',`background:${R}`)}</tr></thead><tbody>${rows}</tbody></table><div style="margin-top:12px;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:8px">USA Diving · ${esc(title)} · ${new Date().toLocaleDateString()}</div></body></html>`;
  dl(html,'application/vnd.ms-excel',`${title.replace(/[^a-z0-9]/gi,'-')}-ops-timeline.xls`);
  toast('Operations timeline downloaded');
}

function exportExcelLegacy(){
  const timed=genTimedForPreview(allTimed());
  const title=genTitle()||S.meet.name||'USA Diving Schedule';
  let html=`<html><head><meta charset="UTF-8"><style>body{font-family:Arial;font-size:11pt}table{border-collapse:collapse;width:100%}th{background:#171F69;color:white;padding:6px 10px;text-align:left}td{padding:5px 10px;border-bottom:1px solid #ddd}.dh td{background:#E8ECFF;font-weight:bold;color:#171F69}.sh td{background:#F5F6FA;font-weight:bold}</style></head><body><h2 style="color:#171F69">${esc(title)}</h2><table><thead><tr><th>Day</th><th>Session</th><th>Event</th><th>Round</th><th>Divers</th><th>Dives</th><th>Sec/dive</th><th>Split</th><th>Warm-up</th><th>Start</th><th>End</th></tr></thead><tbody>`;
  S.meet.days.forEach(day=>{const ds=timed.filter(s=>s.dayId===day.id).sort((a,b)=>a.warmupStartMinutes-b.warmupStartMinutes);if(!ds.length)return;html+=`<tr class="dh"><td colspan="11">${fullDate(day.date)}</td></tr>`;ds.forEach(sess=>{const t=sess.timing;const n=getSessNum(sess,timed);const lbl=sess.isPractice?(sess.title||'Practice'):`Session ${n}`;html+=`<tr class="sh"><td></td><td colspan="10">${esc(lbl)} · ${f12(t.warmupStartMinutes)}–${f12(t.sessionEndMinutes)}</td></tr>`;(t.events||[]).forEach(ev=>{const dur=calcEvDur(ev);html+=`<tr><td>${fullDate(day.date)}</td><td>${esc(lbl)}</td><td>${esc(evName(ev))}</td><td>${esc(ev.round||'')}</td><td>${ev.numberOfDivers||0}</td><td>${ev.numberOfDives||ev.defaultDives||0}</td><td>${ev.secondsPerDive||ev.defaultSpd||35}</td><td>${ev.manualSplit&&!isPlatform(ev.apparatus)?'Yes':''}</td><td>${f12(t.warmupStartMinutes)}</td><td>${f12(ev.eventStartMinutes)}</td><td>${f12(ev.eventEndMinutes)}</td></tr>`});});});
  html+='</tbody></table></body></html>';
  dl(html,'application/vnd.ms-excel',`${title.replace(/[^a-z0-9]/gi,'-')}-schedule.xls`);
  toast('Excel downloaded');
}

function dl(html,type,name){const blob=new Blob([html],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}

// Print
const ps=document.createElement('style');ps.textContent='@media print{body *{visibility:hidden}#printPreview,#printPreview *{visibility:visible}#printPreview{position:absolute;left:0;top:0;width:100%}.modal-bg{position:absolute;background:white;display:block}.modal{width:100%;max-width:none;max-height:none;box-shadow:none;border:none}}';document.head.appendChild(ps);

// ── BOOT ──────────────────────────────────────────────────────────────
// Repair stale data from older saves before the first paint. This does NOT touch
// session times — a refresh shows exactly the times that were saved.
normalizeAllDays(S);
// Carry the server-clock sync marker across the refresh, so the first poll can tell
// whether the cloud moved on while this tab was closed.
lastSynced=S.lastSyncedAt||null;
saveS();
if(S.currentLibraryId)startSync();
render();


// ── Deep link: ?load=<cloud schedule id> ──────────────────────────────
// Used by Season Calendar Planner linked events ("Open linked schedule").
(function(){
  try{
    const p=new URLSearchParams(location.search).get('load');
    if(!p)return;
    loadFromNeon(p).then(loaded=>{
      if(!loaded)toast('Linked schedule not found on cloud');
    }).catch(()=>toast('Could not load linked schedule'));
  }catch(e){}
})();
