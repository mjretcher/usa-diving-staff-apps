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
  ensureProjDataLoaded(); // athlete-aware checks activate once the projected field arrives
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
      const comp=sessions.filter(s=>!s.isPractice);
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
  showFlightCounts:true,timeScale:false,addDayTemplateId:null,
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
    if(eventTag)s.sessions.forEach(x=>{if(x.dayId===day.id&&!x.eventTag)x.eventTag=eventTag;});
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
        ${tpls.map(t=>`<div style="display:flex;gap:5px;align-items:stretch"><button class="move-btn ${UI.addDayTemplateId===t.id?'active':''}" style="flex:1" onclick="UI.addDayTemplateId='${t.id}';render()">${esc(t.name)} <span class="move-meta">${t.sessions.length} block${t.sessions.length===1?'':'s'}</span></button><button class="tl-iconbtn" style="height:auto" title="Delete template" onclick="deleteDayTemplate('${t.id}')">×</button></div>`).join('')}
      </div>`:'';
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><div><span class="modal-title">Add a day</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">e.g. a practice day before the meet starts</div></div><button class="modal-close" onclick="UI.modal=null;UI.addDayTemplateId=null;UI.addDayEventTag=null;render()">×</button></div>
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
  const sess={id:uid(),dayId,warmupStartMinutes:start,warmupMinutes:55,rounding:5,introMinutes:0,bufferMinutes:isPractice?0:5,awardsEnabled:false,isPractice:!!isPractice,title:isPractice?'Open Training':'',eventTag:day&&day.eventTag?day.eventTag:'',flights:[],events:isPractice?[{id:uid(),style:'Custom Block',customLabel:'Open Training',customDurationMinutes:90,apparatus:'Pool',gender:'Open',level:'Schedule',numberOfDivers:0,numberOfDives:0,secondsPerDive:0,defaultSpd:0,defaultDives:0,manualSplit:false,numberOfPanelChanges:0,minutesPerPanelChange:0,notes:''}]:[]};
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
  const day=S.meet.days.find(d=>d.id===dayId);
  const sess={id:uid(),dayId,warmupStartMinutes:start,warmupMinutes:presetKey==='technical'?0:55,rounding:5,introMinutes:0,bufferMinutes:0,awardsEnabled:false,isPractice:true,title:preset.title,eventTag:day&&day.eventTag?day.eventTag:'',flights:[],events:[{id:uid(),style:'Custom Block',customLabel:preset.label,customDurationMinutes:preset.duration,apparatus:'Pool',gender:'Open',level:'Schedule',numberOfDivers:0,numberOfDives:0,secondsPerDive:0,defaultSpd:0,defaultDives:0,manualSplit:false,numberOfPanelChanges:0,minutesPerPanelChange:0,notes:preset.label}]};
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
// DiveMeets meet whose live entry counts feed "Sync actual entries". Updated
// nightly (10:05 UTC cron) + on-demand via the divemeets-entries workflow.
const DIVEMEETS_MEET_ID='12923';
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
async function loadMeetEntries(){
  const r=await nq(`SELECT age_group,gender,discipline,entries,fetched_at::text FROM junior_results.meet_entries WHERE meet_id_dm=$1 AND round='Prelim' ORDER BY age_group,gender,discipline`,[DIVEMEETS_MEET_ID]);
  return(r.rows||[]).map(row=>({ageGroup:row[0],gender:row[1],discipline:row[2],entries:Number(row[3]),fetchedAt:row[4]}));
}
async function loadMeetEntrants(){
  const r=await nq(`SELECT age_group,gender,discipline,diver_name,team,diver_key FROM junior_results.meet_entrants WHERE meet_id_dm=$1 ORDER BY age_group,gender,discipline,diver_name`,[DIVEMEETS_MEET_ID]);
  return(r.rows||[]).map(row=>({ageGroup:row[0],gender:row[1],discipline:row[2],name:row[3],team:row[4],diverKey:row[5]}));
}
// ── SYNC ACTUAL ENTRIES (DiveMeets registrations → schedule) ─────────
function openEntrySync(){
  UI.entrySync={loading:true,rows:null,entrants:null,error:null};
  UI.entrySyncExpand={};
  UI.modal='entry-sync';
  render();
  Promise.all([loadMeetEntries(),loadMeetEntrants().catch(()=>[])])
    .then(([rows,entrants])=>{UI.entrySync={loading:false,rows,entrants,error:null}})
    .catch(e=>{UI.entrySync={loading:false,rows:null,entrants:null,error:e.message||'Could not load entries'}})
    .finally(()=>render());
}
function entrySyncDeltas(){
  const byKey={};
  (UI.entrySync?.rows||[]).forEach(r=>{byKey[r.ageGroup+'|'+r.gender+'|'+r.discipline]=r.entries});
  const out=[];
  S.sessions.forEach(sess=>{
    if(sess.isPractice)return;
    sess.events.forEach(ev=>{
      if(ev.round!=='Prelim'&&ev.round!=='Qualifier')return;
      const k=ev.level+'|'+ev.gender+'|'+ev.apparatus;
      if(!(k in byKey))return;
      out.push({sessId:sess.id,evId:ev.id,name:evName(ev),projected:ev.projectedDivers,registered:byKey[k]});
    });
  });
  return out;
}
function applyEntrySync(){
  const deltas=entrySyncDeltas();
  if(!deltas.length){toast('No matching events to update');return;}
  let applied=0;
  upd(s=>{
    const touched=new Set();
    deltas.forEach(d=>{
      const sess=s.sessions.find(x=>x.id===d.sessId);if(!sess)return;
      const ev=sess.events.find(e=>e.id===d.evId);if(!ev)return;
      ev.projectedDivers=d.registered;
      // Real registrations are authoritative — mark as a manual-grade value so
      // a later "Pre-fill projected entries" (projection data) can't overwrite.
      ev.autoProjected=false;
      ev.numberOfDivers=entryValue(ev);
      touched.add(sess.dayId);applied++;
    });
    touched.forEach(dayId=>reflowDay(s,dayId));
  });
  UI.modal=null;
  toast(`Synced ${applied} event${applied===1?'':'s'} to registered DiveMeets entries`);
}
function renderEntrySyncModal(){
  const es=UI.entrySync||{};
  const hd=`<div class="modal-hd"><div><span class="modal-title">Sync actual entries</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">Live registrations from DiveMeets meet ${DIVEMEETS_MEET_ID} (2026 Junior Nationals)</div></div><button class="modal-close" onclick="UI.modal=null;render()">×</button></div>`;
  if(es.loading)return`<div class="modal modal-lg" onclick="event.stopPropagation()">${hd}<div class="modal-body" style="text-align:center;color:var(--tx3);padding:40px 22px">Loading registered entries…</div></div>`;
  if(es.error)return`<div class="modal modal-lg" onclick="event.stopPropagation()">${hd}<div class="modal-body"><div style="color:var(--red);font-size:13px;margin-bottom:12px">Could not load entries: ${esc(es.error)}</div><button class="btn btn-p" onclick="openEntrySync()">Retry</button></div></div>`;
  const fetchedAt=es.rows&&es.rows.length?es.rows[0].fetchedAt:null;
  const fetchedLbl=fetchedAt?parseNeonTimestamp(fetchedAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
  const deltas=entrySyncDeltas();
  const entrantsByEvent={};
  (es.entrants||[]).forEach(en=>{
    const k=en.ageGroup+'|'+en.gender+'|'+en.discipline;
    (entrantsByEvent[k]=entrantsByEvent[k]||[]).push(en);
  });
  const projKeys=new Set((UI.projRows||[]).map(r=>r.diverKey));
  const rows=deltas.map((d,di)=>{
    const proj=d.projected==null||d.projected===''?null:Number(d.projected);
    const diff=proj==null?null:d.registered-proj;
    const badge=diff==null?`<span style="color:var(--tx3)">new</span>`:diff===0?`<span style="color:var(--tx3)">same</span>`:diff>0?`<span style="color:var(--prac);font-weight:700">+${diff}</span>`:`<span style="color:var(--red);font-weight:700">${diff}</span>`;
    const sess=S.sessions.find(x=>x.id===d.sessId);
    const ev=sess&&sess.events.find(e=>e.id===d.evId);
    const k=ev?ev.level+'|'+ev.gender+'|'+ev.apparatus:'';
    const who=entrantsByEvent[k]||[];
    const open=!!(UI.entrySyncExpand&&UI.entrySyncExpand[di]);
    const whoRows=open&&who.length?`<tr><td colspan="4" style="padding:2px 8px 10px"><div class="es-who">${who.map(en=>{
      const known=projKeys.size?projKeys.has(en.diverKey):true;
      return`<span class="es-name ${known?'':'new'}" title="${esc(en.team||'')}${known?'':' — registered but not in the projected field'}">${esc(en.name)}${known?'':' ✳'}</span>`;
    }).join('')}${projKeys.size?`<div class="es-legend">✳ = registered on DiveMeets but not in the projected field — worth a look</div>`:''}</div></td></tr>`:'';
    return`<tr style="border-top:1px solid var(--bd)"><td style="padding:6px 8px">${who.length?`<button class="es-expand" onclick="UI.entrySyncExpand[${di}]=!UI.entrySyncExpand[${di}];render()">${open?'▾':'▸'}</button> `:''}${esc(d.name)}</td><td style="padding:6px 8px;text-align:right;font-variant-numeric:tabular-nums;color:var(--tx3)">${proj==null?'—':proj}</td><td style="padding:6px 8px;text-align:right;font-variant-numeric:tabular-nums;font-weight:700">${d.registered}</td><td style="padding:6px 8px;text-align:right">${badge}</td></tr>${whoRows}`;
  }).join('');
  return`<div class="modal modal-lg" onclick="event.stopPropagation()">${hd}
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;background:rgba(0,154,199,.08);border:1px solid rgba(0,154,199,.25);font-size:12px;color:var(--tx);margin-bottom:14px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2" style="width:15px;height:15px;flex-shrink:0"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        <span><strong>Registration is still open</strong> — late fee starts July 16, sign-ups close July 28 at 5 PM. These counts will keep growing; re-sync any time.${fetchedLbl?` <span style="color:var(--tx3)">Counts pulled ${fetchedLbl}.</span>`:''}</span>
      </div>
      ${deltas.length?`<table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--tx3)"><th style="text-align:left;padding:4px 8px">Event</th><th style="text-align:right;padding:4px 8px">Projected</th><th style="text-align:right;padding:4px 8px">Registered</th><th style="text-align:right;padding:4px 8px">Change</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`:`<div style="text-align:center;color:var(--tx3);padding:20px">No Prelim/Qualifier events in this schedule match the DiveMeets entry list.</div>`}
      <p style="font-size:11px;color:var(--tx3);margin-top:12px">Applying sets each event's entry count to the registered number and protects it — the projections pre-fill won't overwrite synced values.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-sm" onclick="UI.modal=null;render()">Cancel</button>
      <button class="btn btn-sm btn-p" ${deltas.length?'':'disabled'} onclick="applyEntrySync()">Apply registered counts</button>
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
      <div class="tl-wrap">${renderTlBar(timed)}${renderTimeline(timed)}</div>
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
      <div class="modal-hd"><div><span class="modal-title">${esc(title)}</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)} · ${fdur(t.sessionEndMinutes-t.warmupStartMinutes)}</div></div><button class="modal-close" onclick="closeEdit()">×</button></div>
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
  const days=S.meet.days.map(d=>{const dt=dayEventTagOf(d);const dd=new Date(`${d.date}T00:00:00`);const wd=isNaN(dd)?d.date:dd.toLocaleDateString('en-US',{weekday:'short'});const dn=isNaN(dd)?'':dd.getDate();return`<button class="dp ${d.id===UI.dayId?'active':''}" onclick="selectDay('${d.id}')" data-day="${d.id}" title="${fullDate(d.date)}${dt?' — '+dt.l:''}">${dt?`<span class="dp-tag-dot" style="background:${dt.c}"></span>`:''}<span class="dp-wd">${wd}</span><span class="dp-num">${dn}</span></button>`}).join('');
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
            <button class="bm-item" onclick="UI.barMenu=false;UI.modal='overview';render()">Meet overview board</button>
            <button class="bm-item" onclick="UI.barMenu=false;UI.modal='export';render()">Export…</button>
            <button class="bm-item" onclick="UI.barMenu=false;render();openPresentation()">Presentation mode</button>
            <button class="bm-item" onclick="UI.barMenu=false;openImportBlocks()">Import blocks from another schedule…</button>
            <button class="bm-item" onclick="UI.barMenu=false;render();toggleTheme()">${document.documentElement.dataset.theme==='deck'?'Light mode':'Deck mode (dark)'}</button>
            <div class="bm-hint">Tip: Ctrl+K opens the command palette</div>
          </div>`:''}
        </div>
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
      <div class="bar-days">${days}<button class="dp-add" onclick="addDay()" title="Add day">+</button></div>
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
  return`<div class="tl-bar">
    <span class="tl-title">${day?fullDate(day.date):'Schedule'}</span>
    ${anyEventTags()?`<div class="evf-row">
      <button class="evf-chip ${!UI.eventFilter?'on':''}" onclick="UI.eventFilter=null;render()">All</button>
      ${EVENT_TAGS.map(t=>`<button class="evf-chip ${UI.eventFilter===t.k?'on':''}" style="--tagc:${t.c}" onclick="UI.eventFilter='${t.k}';render()">${t.s}</button>`).join('')}
      <button class="evf-chip ${UI.eventFilter==='shared'?'on':''}" onclick="UI.eventFilter='shared';render()">Shared</button>
    </div>`:''}
    <div class="tl-spacer"></div>
    ${dayStart!==null?`<span class="tl-day-info"><b>${comp}</b> sessions · <b>${f12(dayStart)}</b>–<b>${f12(dayEnd)}</b> · ${fdur(dayEnd-dayStart)}</span>`:''}
    ${daySess.length?`<button class="tl-iconbtn ${UI.timeScale?'active':''}" onclick="UI.timeScale=!UI.timeScale;render()" title="${UI.timeScale?'Switch to list view':'Switch to time-scale view — block heights match real durations'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 3v18M4 5h6M4 9h10M4 13h6M4 17h10M4 21h6"/></svg></button>`:''}
    ${daySess.length?`<button class="tl-iconbtn" onclick="openCoachHandout('${UI.dayId}')" title="Print coach handout — one page for the pool door"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></button>`:''}
    ${daySess.length?`<button class="tl-iconbtn" onclick="openCopyDay('${UI.dayId}')" title="Copy this day's schedule to another day"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>`:''}
    ${daySess.length>1?`<button class="tl-iconbtn" onclick="zeroBuffersForDay('${UI.dayId}')" title="Remove buffers for this day — pack all sessions back-to-back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h4M4 12h6M4 17h4M20 7h-4M20 12h-6M20 17h-4"/><path d="M14 12h-4"/></svg></button>`:''}
    <button class="tl-iconbtn ${UI.previewOpen?'active':''}" onclick="UI.previewOpen=!UI.previewOpen;if(UI.previewOpen){UI.editSessId=null;UI.entriesOpen=false}render()" title="Quick preview"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
    <button class="tl-addbtn" onclick="showAddMenu()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> Add block</button>
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
  sessions.forEach((sess2,i)=>{
    parts.push(renderCard(sess2,timed,warns));
    if(i<sessions.length-1){
      const gap=sessions[i+1].timing.warmupStartMinutes-sess2.timing.sessionEndMinutes;
      parts.push(renderGapChip(sess2,gap));
    }
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
    const overlaps=i>0&&t.warmupStartMinutes<sessions[i-1].timing.sessionEndMinutes;
    const cls=`ts-card ${isPrac?(isTrain?'train':'prac'):'comp'}${overlaps?' overlap':''}`;
    const dur=t.sessionEndMinutes-t.warmupStartMinutes;
    const resizable=isPrac&&!(sess.flights||[]).length&&!sess.fitToClose;
    return`<div class="${cls}" style="top:${top}px;height:${h}px" data-ts-sess="${sess.id}" data-ts-dur="${dur}" onclick="openEdit('${sess.id}')" title="${esc(name)} · ${f12(t.warmupStartMinutes)}–${f12(t.sessionEndMinutes)} · click to open">
      <div class="ts-card-name">${esc(name)}${overlaps?' <span class="ts-overlap-flag">⚠ overlaps</span>':''}</div>
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
  .hd-foot{margin-top:14px;display:flex;justify-content:space-between;font-size:10px;color:#94A3B8}
  .hd-print{position:fixed;top:12px;right:12px;background:#171F69;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif}
  @media print{.hd-print{display:none}body{padding:0}@page{margin:12mm}}`;
function buildHandoutDayHTML(day,timed,os){
  const sessions=filterByEvent(timed.filter(s=>s.dayId===day.id));
  if(!sessions.length)return'';
  const rows=sessions.map(sess=>{
    const t=sess.timing;
    if(sess.isPractice){
      const ft=t.flightTimes||[];
      const flights=ft.length?`<div class="hd-flights">${ft.map(f=>`<div class="hd-flight"><span class="hd-flight-bar" style="background:${f.color||'#171F69'}"></span>${esc(f.name)} <span class="hd-flight-time">${f12(f.startMinutes)}–${f12(f.endMinutes)}</span></div>`).join('')}</div>`:'';
      const note=(sess.events&&sess.events[0]&&sess.events[0].notes)||'';
      return`<tr class="hd-prac"><td class="hd-time">${f12(t.warmupStartMinutes)}<span class="hd-time-end">– ${f12(t.sessionEndMinutes)}</span></td><td><div class="hd-name">${esc(sess.title||'Practice')}</div>${flights}${note&&note!==sess.title?`<div class="hd-note">${esc(note)}</div>`:''}</td></tr>`;
    }
    const n=getSessNum(sess,timed);
    const evs=(t.events||[]).map(ev=>`<div class="hd-ev"><span>${esc(evName(ev))}</span><span class="hd-ev-time">${f12(ev.eventStartMinutes)}</span></div>`).join('');
    const wu=os.showWarmup!==false?`<div class="hd-wu">Warm-up ${f12(t.warmupStartMinutes)} – ${f12(t.warmupEndMinutes)}</div>`:'';
    return`<tr><td class="hd-time">${f12(t.eventStartMinutes)}<span class="hd-time-end">– ${f12(t.sessionEndMinutes)}</span></td><td><div class="hd-name">Session ${n}${sess.awardsEnabled?' <span class="hd-awards">+ Awards</span>':''}</div>${wu}${evs}</td></tr>`;
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
        (t.events||[]).forEach(ev=>aoa.push([f12(ev.eventStartMinutes),'','','  '+evName(ev)+(Number(ev.numberOfDivers)?` — ${ev.numberOfDivers} divers`:''),'','']));
      }
    });
    if(!ds.length)aoa.push(['(nothing scheduled)']);
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols']=[{wch:10},{wch:10},{wch:24},{wch:44},{wch:10},{wch:30}];
    XLSX.utils.book_append_sheet(wb,ws,_sheetNameFor(day.date));
  });
  const fname=`${(S.meet.name||'Schedule').replace(/[\\\/\?\*\[\]:]/g,'')} schedule.xlsx`;
  XLSX.writeFile(wb,fname);
  toast('Excel workbook downloaded');
}
function renderExportModal(){
  const dayCount=S.meet.days.length;
  const blockCount=S.sessions.length;
  return`<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><div><span class="modal-title">Export the meet</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${dayCount} day${dayCount===1?'':'s'} · ${blockCount} block${blockCount===1?'':'s'}</div></div><button class="modal-close" onclick="closeModal()">×</button></div>
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
          <div class="pcard-name" style="color:${typeColor}">${esc(sess.title||typeLabel)}${(()=>{const t=eventTagOf(sess);return t?`<span class="tag-pill" style="--tagc:${t.c}">${t.s}</span>`:''})()}</div>
          <div class="pcard-meta">${sess.fitToClose?`Until facility close · ${fdur(dur)}`:flights.length?`${flights.length} flight${flights.length>1?'s':''} · ${fdur(dur)}`:`Open pool · ${fdur(dur)}`}</div>
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
        <div class="sc-name">Session ${n}${(()=>{const t=eventTagOf(sess);return t?`<span class="tag-pill" style="--tagc:${t.c}">${t.s}</span>`:''})()}</div>
        <div class="sc-sub">${esc(sub)}</div>
      </div>
      <div class="sc-time">
        <div class="sc-time-main">${f12r(t.warmupStartMinutes,t.sessionEndMinutes)}</div>
        <div class="sc-time-sub">${fdur(t.sessionEndMinutes-t.warmupStartMinutes)} · ${sess.events.reduce((a,e)=>a+Number(e.finalDivers||e.projectedDivers||e.numberOfDivers||0),0)} athletes</div>
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
  const body=isPrac?renderEditPrac(sess,t,flights,buf):renderEditComp(sess,t,timed,intro,buf,cat,sessUsed);
  return`<div class="edit-panel open">
    <div class="ep-head">
      <div><div class="ep-title">${esc(title)}</div><div class="ep-sub">${f12(t.warmupStartMinutes)} – ${f12(t.sessionEndMinutes)} · ${fdur(t.sessionEndMinutes-t.warmupStartMinutes)}</div></div>
      <button class="ep-close" onclick="closeEdit()">×</button>
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

function renderEditPrac(sess,t,flights,buf){
  buf=Number(buf!=null?buf:(sess.bufferMinutes||0));
  if(flights.length)ensureProjDataLoaded();
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
      ${sess.fitToClose?`<div class="fitclose-note">Ends at ${f12(dayCloseFor(sess.dayId))} — duration adjusts automatically as earlier events shift.${(t.fitDur||0)<=0?' <strong style="color:var(--red)">⚠ Starts after close — no time left.</strong>':''}</div>`:''}
    </div>
    <div class="fg"><label class="fl">Buffer after this block</label><div class="chiprow">${bufChips}<button class="chip" onclick="askPrompt({title:'Buffer after this block (min)',message:'Minutes before the next session starts.',inputType:'number',defaultValue:sess.bufferMinutes||0,confirmText:'Set',onConfirm:(v)=>{if(v!=='')setBuffer('${sess.id}',Number(v)||0)}})">Custom</button></div></div>
    <div class="fg"><label class="fl">Part of</label><div class="chiprow"><button class="chip ${!sess.eventTag?'on':''}" onclick="updSess('${sess.id}','eventTag','')" title="Shared — appears in every event's schedule">Shared</button>${EVENT_TAGS.map(t=>`<button class="chip ${sess.eventTag===t.k?'on':''}" onclick="updSess('${sess.id}','eventTag','${t.k}')">${t.l}</button>`).join('')}</div></div>
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
      ${[45,60,90].map(v=>`<button class="fdur-chip ${Number(f.durationMinutes)===v?'on':''}" onclick="updFlight('${sess.id}','${f.id}','durationMinutes',${v})">${v}</button>`).join('')}
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
    <div class="fg"><label class="fl">Part of</label><div class="chiprow"><button class="chip ${!sess.eventTag?'on':''}" onclick="updSess('${sess.id}','eventTag','')" title="Shared — appears in every event's schedule">Shared</button>${EVENT_TAGS.map(t=>`<button class="chip ${sess.eventTag===t.k?'on':''}" onclick="updSess('${sess.id}','eventTag','${t.k}')">${t.l}</button>`).join('')}</div></div>
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
  UI.modal='history';UI.historyLoading=true;UI.historyVersions=[];UI.historyDiff=null;render();
  UI.historyVersions=await loadVersions();UI.historyLoading=false;render();
}
function snapshotNow(){
  askPrompt({title:'Name this snapshot',message:'e.g. "Sent to HP Director 7/9" — a name you\'ll recognize later.',defaultValue:'',confirmText:'Save snapshot',onConfirm:(v)=>{
    const label=(v||'').trim()||('Snapshot '+new Date().toLocaleString());
    saveVersion(label).then(()=>{toast('Snapshot saved');openHistory()});
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
    <div class="modal-hd"><div><span class="modal-title">Meet overview</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">Drag blocks between days · click a block to open it · click a day header to go there</div></div><button class="modal-close" onclick="UI.modal=null;render()">×</button></div>
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
      <div class="pr-body"><div class="pr-name">${esc(name)}${sess.awardsEnabled?' <span class="pr-awards">+ AWARDS</span>':''}</div>${detail?`<div class="pr-detail">${detail}</div>`:''}</div>
    </div>`;
  }).join('');
  return`<div class="present">
    <div class="pr-hd"><div class="pr-meet">${esc(S.meet.name||'Schedule')}</div><div class="pr-date">${fullDate(day.date)}</div></div>
    <div class="pr-accent"></div>
    <div class="pr-list">${rows||'<div class="pr-empty">Nothing scheduled this day</div>'}</div>
    <div class="pr-foot">
      <button class="pr-nav" onclick="UI.present.i=Math.max(0,UI.present.i-1);render()" ${i===0?'disabled':''}>←</button>
      <span>Day ${i+1} of ${days.length} · ← → to move · Esc to exit</span>
      <button class="pr-nav" onclick="UI.present.i=Math.min(${days.length-1},UI.present.i+1);render()" ${i===days.length-1?'disabled':''}>→</button>
    </div>
    <button class="pr-close" onclick="UI.present=null;render()">×</button>
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
function eventTagOf(sess){return EVENT_TAGS.find(t=>t.k===sess.eventTag)||null}
function dayEventTagOf(day){return EVENT_TAGS.find(t=>t.k===day.eventTag)||null}
// Sets a day's default event — new blocks added to this day pick it up automatically
// (see addSession/addPracticeBlock). Existing blocks are never silently retagged; if the
// day already has untagged blocks, offer to tag those too rather than doing it invisibly.
function setDayEventTag(dayId,tag){
  const day=S.meet.days.find(d=>d.id===dayId);if(!day)return;
  const untagged=S.sessions.filter(s=>s.dayId===dayId&&!s.eventTag);
  upd(s=>{const d=s.meet.days.find(x=>x.id===dayId);if(d)d.eventTag=tag||'';});
  if(tag&&untagged.length){
    const tagL=EVENT_TAGS.find(t=>t.k===tag)?.l||tag;
    askConfirm({title:'Tag existing blocks too?',message:`This day already has ${untagged.length} untagged block${untagged.length===1?'':'s'}. Tag ${untagged.length===1?'it':'them'} as ${tagL} as well? (New blocks you add from now on will use this automatically either way.)`,confirmText:'Tag them',onConfirm:()=>{
      upd(s=>{s.sessions.forEach(x=>{if(x.dayId===dayId&&!x.eventTag)x.eventTag=tag;});});
      render();toast(`Tagged ${untagged.length} block${untagged.length===1?'':'s'} as ${tagL}`);
    }});
  } // upd() above already re-rendered; nothing else to do when there's no bulk-apply prompt
}
function anyEventTags(){return S.sessions.some(s=>s.eventTag)||S.meet.days.some(d=>d.eventTag)}
// View filter: a tag shows its own blocks + shared; 'shared' shows untagged only.
function passesEventFilter(sess){
  const f=UI.eventFilter;
  if(!f)return true;
  if(f==='shared')return!sess.eventTag;
  return sess.eventTag===f||!sess.eventTag;
}
function filterByEvent(sessions){return sessions.filter(passesEventFilter)}
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
      s.sessions=s.sessions.filter(x=>x.eventTag!==st.tag);
      removed=before-s.sessions.length;
    }
    const dayByDate={};s.meet.days.forEach(d=>dayByDate[d.date]=d.id);
    srcSessions.forEach(src=>{
      const srcDay=srcDays.find(d=>d.id===src.dayId);
      if(!srcDay)return;
      let targetDayId=dayByDate[srcDay.date];
      if(!targetDayId){
        const nd={id:uid(),date:srcDay.date,openMinutes:srcDay.openMinutes||390,closeMinutes:srcDay.closeMinutes||1200};
        s.meet.days.push(nd);dayByDate[nd.date]=nd.id;targetDayId=nd.id;daysCreated++;
      }
      const copy=JSON.parse(JSON.stringify(src));
      copy.id=uid();copy.dayId=targetDayId;copy.eventTag=st.tag;
      (copy.events||[]).forEach(ev=>{ev.id=uid();delete ev.linkedPrelimId;});
      (copy.flights||[]).forEach(f=>{f.id=uid();});
      s.sessions.push(copy);added++;
    });
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
    <div class="modal-hd"><div><span class="modal-title">Import blocks from another schedule</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">Days are matched by date · missing days get created · nothing here is deleted unless you say so</div></div><button class="modal-close" onclick="UI.modal=null;render()">×</button></div>
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
  const tagsInUse=EVENT_TAGS.filter(t=>S.sessions.some(s=>s.eventTag===t.k));
  if(!tagsInUse.length){toast('Tag blocks with their event first (open a block → "Part of")');return;}
  askConfirm({title:'Split into per-event schedules?',message:`Creates ${tagsInUse.length} new cloud schedule${tagsInUse.length===1?'':'s'} (${tagsInUse.map(t=>t.l).join(', ')}), each containing that event's blocks plus all shared blocks. This master is not changed.`,confirmText:'Create '+tagsInUse.length,onConfirm:async()=>{
    toast('Splitting…');
    let made=0;
    for(const t of tagsInUse){
      const clone=JSON.parse(JSON.stringify(S));
      clone.sessions=clone.sessions.filter(x=>x.eventTag===t.k||!x.eventTag);
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
function stampTemplateOntoDay(stateSnap,tpl,dayId){
  tpl.sessions.forEach(src=>{
    const copy=JSON.parse(JSON.stringify(src));
    copy.id=uid();copy.dayId=dayId;
    (copy.events||[]).forEach(ev=>{ev.id=uid();delete ev.linkedPrelimId;});
    (copy.flights||[]).forEach(f=>{f.id=uid();});
    stateSnap.sessions.push(copy);
  });
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
  const dayS=S.sessions.filter(x=>x.dayId===sess.dayId).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  const i=dayS.findIndex(x=>x.id===sessId);
  const j=i+dir;
  if(j<0||j>=dayS.length){toast(dir<0?'Already first in the day':'Already last in the day');return;}
  reorderSessionWithinDay(sessId,dayS[j].id,dir<0);
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
    s.sessions.filter(x=>x.dayId===srcId).forEach(src=>{
      const copy=JSON.parse(JSON.stringify(src));
      copy.id=uid();copy.dayId=targetId;
      (copy.events||[]).forEach(ev=>{ev.id=uid();delete ev.linkedPrelimId;});
      (copy.flights||[]).forEach(f=>{f.id=uid();});
      s.sessions.push(copy);
    });
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
    <div class="modal-hd"><div><span class="modal-title">Copy ${shortDate(src.date)}</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${srcCount} block${srcCount===1?'':'s'} will be copied with the same times</div></div><button class="modal-close" onclick="UI.modal=null;render()">×</button></div>
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
      <div class="modal-hd"><div><span class="modal-title">Move ${esc(moveLbl)}</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">From ${shortDate(S.meet.days.find(d=>d.id===sess.dayId)?.date||'')} · pick a day, then tap where it should go</div></div><button class="modal-close" onclick="closeMoveDialog()">×</button></div>
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

function renderModal(timed){
  const fns={meet:renderMeetModal,'add-event':renderPickerModal,library:renderLibraryModal,generate:renderGenerateModal,'add-block':renderAddBlockModal,conflicts:renderConflictsModal,history:renderHistoryModal,shortcuts:renderShortcutsModal,saveDialog:renderSaveDialogModal,projections:renderProjectionsModal,'add-day':renderAddDayModal,'copy-day':renderCopyDayModal,overview:renderOverviewModal,'entry-sync':renderEntrySyncModal,'export':renderExportModal,'import-blocks':renderImportBlocksModal};
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
      <button class="btn" onclick="openEntrySync()" title="Pull live registered entry counts from DiveMeets">Sync actual entries (DiveMeets)</button>
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
    <p style="font-size:10.5px;color:var(--tx3);margin:6px 0 14px">Athlete impact is advisory, computed from the projected nationals field — it flags human cost, never changes your schedule.</p>`:'';
  return`<div class="modal modal-lg" onclick="event.stopPropagation()">
    <div class="modal-hd"><div style="display:flex;align-items:center;gap:12px"><span style="font-family:var(--font-display,inherit);font-size:30px;font-weight:700;color:${scoreCls};line-height:1">${h.score}</span><div><span class="modal-title">Schedule health</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${conflicts.length?`${errs.length} error${errs.length===1?'':'s'} · ${warns.length} warning${warns.length===1?'':'s'} · ${infos.length} note${infos.length===1?'':'s'}`:'No issues — gold-medal shape'}</div></div></div><button class="modal-close" onclick="closeModal()">×</button></div>
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
    <div class="modal-hd"><div><span class="modal-title">Version history</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">Every cloud save is a restore point · snapshots are named markers you create</div></div><button class="modal-close" onclick="closeModal()">×</button></div>
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
      <div class="fg"><label class="fl">Days</label><div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">${S.meet.days.map((d,i)=>{const dt=dayEventTagOf(d);return`<div style="display:flex;flex-direction:column;gap:4px;padding:8px;border:1px solid var(--bd);border-radius:8px">
        <div style="display:flex;align-items:center;gap:4px"><input class="fi" type="date" style="width:160px;padding:6px 8px" value="${d.date}" onchange="upd(s=>s.meet.days[${i}].date=this.value)"/><button class="btn btn-sm btn-gh" onclick="upd(s=>s.meet.days.splice(${i},1))">×</button></div>
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

