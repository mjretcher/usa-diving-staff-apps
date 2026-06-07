(function () {
  "use strict";

  const BRAND = {
    red: "#E31937",
    blue: "#171F69",
    gray: "#5F6062",
    lightBlue: "#8FC3EA",
    cyan: "#009AC7",
    white: "#FFFFFF",
  };



  const COLOR_THEMES = {
    classic: { label: "Classic USA", primary: "#171F69", accent: "#E31937", soft: "#EEF6FC", block: "#009AC7", neutral: "#F7F8FA" },
    coastal: { label: "Coastal Light", primary: "#0B4F6C", accent: "#009AC7", soft: "#EAF7FB", block: "#8FC3EA", neutral: "#FAFBFC" },
    championship: { label: "Championship", primary: "#171F69", accent: "#D7263D", soft: "#F3F1FA", block: "#5F6062", neutral: "#F8F7FA" },
    warmup: { label: "Warm-Up", primary: "#243B53", accent: "#E31937", soft: "#FFF4F1", block: "#F0B429", neutral: "#FFFDF8" },
  };

  const PUBLIC_OUTPUT_PRESETS = {
    clean: { label: "Clean Event Schedule", description: "Balanced public schedule with day cards and warm-up visibility." },
    coach: { label: "Coach/Athlete Schedule", description: "More warm-up context and practice notes." },
    compact: { label: "Compact Web View", description: "Dense schedule for email/web posting." },
    poster: { label: "Poster Style", description: "Larger day banners and more visual spacing." },
  };

  const PX_PER_MINUTE = 0.75;
  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const SCHEDULE_LIBRARY_KEY = "usa-diving-schedule-builder-saved-schedules-v1";
  const BUILT_IN_SCHEDULE_LIBRARY = [{"id":"seed-zone-b","name":"2026 USA Diving Zone B Championship","updatedAt":"2026-05-26T23:59:00.000Z","builtIn":true,"schedule":{"updatedAt":"2026-05-26T23:59:00.000Z","meet":{"name":"2026 USA Diving Zone B Championship","venue":"Competition Pool","timezone":"America/New_York","meetType":"zone","canvaUrl":"","days":[{"id":"zone-b-day-1","date":"2026-05-27","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-b-day-2","date":"2026-05-28","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-b-day-3","date":"2026-05-29","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-b-day-4","date":"2026-05-30","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-b-day-5","date":"2026-05-31","openMinutes":420,"closeMinutes":1200,"locked":false}]},"profile":{"id":"zone","label":"Zone","description":"Seed placeholder; normalized on load.","allowedRounds":["Qualifier"],"roundRelationships":[],"events":[]},"sessions":[{"id":"b-practice-session-003","dayId":"zone-b-day-1","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":780,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from B primary timeline.","scheduleEventId":"b-practice-003","eventGroupId":"b-practice-group-003","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":240,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"b-practice-session-005","dayId":"zone-b-day-2","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":480,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from B primary timeline.","scheduleEventId":"b-practice-005","eventGroupId":"b-practice-group-005","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":480,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"b-practice-session-008","dayId":"zone-b-day-3","title":"Flighted Warm-Ups","isOpenPracticeSession":true,"warmupStartMinutes":420,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-flighted-warm-ups","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from B primary timeline.","scheduleEventId":"b-practice-008","eventGroupId":"b-practice-group-008","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":120,"manualSplit":false,"detailsOpen":false,"notes":"Flighted warm-up block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"b-session-01","dayId":"zone-b-day-3","title":"Session","warmupStartMinutes":540,"warmupMinutes":35,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group D Boys 1-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-001-group-d-boys-1-meter","eventGroupId":"b-session-01-lane-1m-start-580","round":"Qualifier","canonicalKey":"Group D | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":12.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group C Girls 1-Meter","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-002-group-c-girls-1-meter","eventGroupId":"b-session-01-lane-1m-start-580","round":"Qualifier","canonicalKey":"Group C | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":15.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group B Girls Platform","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-003-group-b-girls-platform","eventGroupId":"b-session-01-lane-platform-start-580","round":"Qualifier","canonicalKey":"Group B | Girls | Platform | Individual | Qualifier","numberOfDivers":15.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":42.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"b-session-02","dayId":"zone-b-day-3","title":"Session","warmupStartMinutes":665,"warmupMinutes":45,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group D Girls Platform","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-004-group-d-girls-platform","eventGroupId":"b-session-02-lane-platform-start-715","round":"Qualifier","canonicalKey":"Group D | Girls | Platform | Individual | Qualifier","numberOfDivers":6.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group C Boys Platform","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-005-group-c-boys-platform","eventGroupId":"b-session-02-lane-platform-start-715","round":"Qualifier","canonicalKey":"Group C | Boys | Platform | Individual | Qualifier","numberOfDivers":3.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group B Boys 1-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-006-group-b-boys-1-meter","eventGroupId":"b-session-02-lane-1m-start-715","round":"Qualifier","canonicalKey":"Group B | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":15.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":33.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"b-session-03","dayId":"zone-b-day-3","title":"Session","warmupStartMinutes":800,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group A Girls 1-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-007-group-a-girls-1-meter","eventGroupId":"b-session-03-lane-1m-start-860","round":"Qualifier","canonicalKey":"Group A | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":28.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"},{"id":"seed-group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group A Boys 3-Meter","defaultDives":10,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-008-group-a-boys-3-meter","eventGroupId":"b-session-03-lane-3m-start-860","round":"Qualifier","canonicalKey":"Group A | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":30.0,"defaultNumberOfDives":10,"numberOfDives":10,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]},{"id":"b-practice-session-021","dayId":"zone-b-day-4","title":"Flighted Warm-Ups","isOpenPracticeSession":true,"warmupStartMinutes":420,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-flighted-warm-ups","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from B primary timeline.","scheduleEventId":"b-practice-021","eventGroupId":"b-practice-group-021","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":120,"manualSplit":false,"detailsOpen":false,"notes":"Flighted warm-up block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"b-session-04","dayId":"zone-b-day-4","title":"Session","warmupStartMinutes":540,"warmupMinutes":35,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group D Girls 1-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-009-group-d-girls-1-meter","eventGroupId":"b-session-04-lane-1m-start-580","round":"Qualifier","canonicalKey":"Group D | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":19.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group C Boys 1-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-010-group-c-boys-1-meter","eventGroupId":"b-session-04-lane-1m-start-580","round":"Qualifier","canonicalKey":"Group C | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":8.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group B Boys Platform","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-011-group-b-boys-platform","eventGroupId":"b-session-04-lane-platform-start-580","round":"Qualifier","canonicalKey":"Group B | Boys | Platform | Individual | Qualifier","numberOfDivers":12.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":42.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"b-session-05","dayId":"zone-b-day-4","title":"Session","warmupStartMinutes":660,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group D Boys 3-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-012-group-d-boys-3-meter","eventGroupId":"b-session-05-lane-3m-start-720","round":"Qualifier","canonicalKey":"Group D | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":10.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group C Girls 3-Meter","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-013-group-c-girls-3-meter","eventGroupId":"b-session-05-lane-3m-start-720","round":"Qualifier","canonicalKey":"Group C | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":15.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group A Girls Platform","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-014-group-a-girls-platform","eventGroupId":"b-session-05-lane-platform-start-720","round":"Qualifier","canonicalKey":"Group A | Girls | Platform | Individual | Qualifier","numberOfDivers":24.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":38.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review platform load"}]},{"id":"b-session-06","dayId":"zone-b-day-4","title":"Session","warmupStartMinutes":855,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group A Boys 1-Meter","defaultDives":10,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-015-group-a-boys-1-meter","eventGroupId":"b-session-06-lane-1m-start-915","round":"Qualifier","canonicalKey":"Group A | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":28.0,"defaultNumberOfDives":10,"numberOfDives":10,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"},{"id":"seed-group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group B Girls 3-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-016-group-b-girls-3-meter","eventGroupId":"b-session-06-lane-3m-start-915","round":"Qualifier","canonicalKey":"Group B | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":27.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":34.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]},{"id":"b-practice-session-034","dayId":"zone-b-day-5","title":"Flighted Warm-Ups","isOpenPracticeSession":true,"warmupStartMinutes":420,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-flighted-warm-ups","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from B primary timeline.","scheduleEventId":"b-practice-034","eventGroupId":"b-practice-group-034","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":120,"manualSplit":false,"detailsOpen":false,"notes":"Flighted warm-up block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"b-session-07","dayId":"zone-b-day-5","title":"Session","warmupStartMinutes":540,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group D Girls 3-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-017-group-d-girls-3-meter","eventGroupId":"b-session-07-lane-3m-start-600","round":"Qualifier","canonicalKey":"Group D | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":17.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group C Boys 3-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-018-group-c-boys-3-meter","eventGroupId":"b-session-07-lane-3m-start-600","round":"Qualifier","canonicalKey":"Group C | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":7.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group B Girls 1-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-019-group-b-girls-1-meter","eventGroupId":"b-session-07-lane-1m-start-600","round":"Qualifier","canonicalKey":"Group B | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":30.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":34.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]},{"id":"b-session-08","dayId":"zone-b-day-5","title":"Session","warmupStartMinutes":690,"warmupMinutes":45,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group D Boys Platform","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-020-group-d-boys-platform","eventGroupId":"b-session-08-lane-platform-start-740","round":"Qualifier","canonicalKey":"Group D | Boys | Platform | Individual | Qualifier","numberOfDivers":7.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group C Girls Platform","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-021-group-c-girls-platform","eventGroupId":"b-session-08-lane-platform-start-740","round":"Qualifier","canonicalKey":"Group C | Girls | Platform | Individual | Qualifier","numberOfDivers":7.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group B Boys 3-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-022-group-b-boys-3-meter","eventGroupId":"b-session-08-lane-3m-start-740","round":"Qualifier","canonicalKey":"Group B | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":15.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":33.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"b-session-09","dayId":"zone-b-day-5","title":"Session","warmupStartMinutes":825,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group A Boys Platform","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-023-group-a-boys-platform","eventGroupId":"b-session-09-lane-platform-start-885","round":"Qualifier","canonicalKey":"Group A | Boys | Platform | Individual | Qualifier","numberOfDivers":18.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":38.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group A Girls 3-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone B).","scheduleEventId":"zone-b-event-024-group-a-girls-3-meter","eventGroupId":"b-session-09-lane-3m-start-885","round":"Qualifier","canonicalKey":"Group A | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":35.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]}],"entryDefaults":{"Group D | Boys | 1-Meter | Individual | Qualifier":12.0,"Group C | Girls | 1-Meter | Individual | Qualifier":15.0,"Group B | Girls | Platform | Individual | Qualifier":15.0,"Group D | Girls | Platform | Individual | Qualifier":6.0,"Group C | Boys | Platform | Individual | Qualifier":3.0,"Group B | Boys | 1-Meter | Individual | Qualifier":15.0,"Group A | Girls | 1-Meter | Individual | Qualifier":28.0,"Group A | Boys | 3-Meter | Individual | Qualifier":30.0,"Group D | Girls | 1-Meter | Individual | Qualifier":19.0,"Group C | Boys | 1-Meter | Individual | Qualifier":8.0,"Group B | Boys | Platform | Individual | Qualifier":12.0,"Group D | Boys | 3-Meter | Individual | Qualifier":10.0,"Group C | Girls | 3-Meter | Individual | Qualifier":15.0,"Group A | Girls | Platform | Individual | Qualifier":24.0,"Group A | Boys | 1-Meter | Individual | Qualifier":28.0,"Group B | Girls | 3-Meter | Individual | Qualifier":27.0,"Group D | Girls | 3-Meter | Individual | Qualifier":17.0,"Group C | Boys | 3-Meter | Individual | Qualifier":7.0,"Group B | Girls | 1-Meter | Individual | Qualifier":30.0,"Group D | Boys | Platform | Individual | Qualifier":7.0,"Group C | Girls | Platform | Individual | Qualifier":7.0,"Group B | Boys | 3-Meter | Individual | Qualifier":15.0,"Group A | Boys | Platform | Individual | Qualifier":18.0,"Group A | Girls | 3-Meter | Individual | Qualifier":35.0},"splitDefaults":{"Group A | Girls | 1-Meter | Individual | Qualifier":true,"Group A | Boys | 3-Meter | Individual | Qualifier":true,"Group A | Boys | 1-Meter | Individual | Qualifier":true,"Group B | Girls | 3-Meter | Individual | Qualifier":true,"Group B | Girls | 1-Meter | Individual | Qualifier":true,"Group A | Girls | 3-Meter | Individual | Qualifier":true},"duplicateMessage":"","selectedEventId":"group-a-girls-1-meter","selectedRound":"Qualifier","combineSessionId":"","outputSettings":{"publicShowWarmups":true,"publicShowOpenPracticeNotes":true},"locks":{"entries":false,"sessionOrder":false},"publishStatus":"draft","scheduleNotes":[{"id":"zone-b-seed-note","scope":"meet","audience":"operations","text":"Seeded from Zones B-E-F Detailed Timelines.xlsx for Zone B. Review entries, time zone, venue, and open practice notes before publishing."}],"exceptions":[],"currentLibraryId":"seed-zone-b"}},{"id":"seed-zone-e","name":"2026 USA Diving Zone E Championship","updatedAt":"2026-05-27T20:15:00.000Z","builtIn":true,"schedule":{"updatedAt":"2026-05-27T20:15:00.000Z","meet":{"name":"2026 USA Diving Zone E Championship","venue":"Competition Pool","timezone":"America/Los_Angeles","meetType":"zone","canvaUrl":"","days":[{"id":"zone-e-day-1","date":"2026-05-27","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-e-day-2","date":"2026-05-28","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-e-day-3","date":"2026-05-29","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-e-day-4","date":"2026-05-30","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-e-day-5","date":"2026-05-31","openMinutes":420,"closeMinutes":1200,"locked":false}]},"profile":{"id":"zone","label":"Zone","description":"Seed placeholder; normalized on load.","allowedRounds":["Qualifier"],"roundRelationships":[],"events":[]},"sessions":[{"id":"e-practice-session-003","dayId":"zone-e-day-1","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":540,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from E primary timeline.","scheduleEventId":"e-practice-003","eventGroupId":"e-practice-group-003","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":420,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"e-practice-session-005","dayId":"zone-e-day-2","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":540,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from E primary timeline.","scheduleEventId":"e-practice-005","eventGroupId":"e-practice-group-005","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":420,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"e-practice-session-008","dayId":"zone-e-day-3","title":"Restricted Training","isOpenPracticeSession":true,"warmupStartMinutes":420,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","defaultDives":0,"allowedRounds":["Open Practice"],"sourceNote":"Seeded restricted training assignment for Zone E.","scheduleEventId":"e-restricted-friday-region-10","eventGroupId":"e-restricted-friday-region-10-group","round":"Open Practice","canonicalKey":"restricted training | zone E | Region 10 | 420","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"manualSplit":false,"detailsOpen":false,"notes":"Region 10 restricted training.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"display":"Restricted Training","blockTitle":"Restricted Training"}]},{"id":"e-restricted-session-009-friday","dayId":"zone-e-day-3","title":"Restricted Training","isOpenPracticeSession":true,"warmupStartMinutes":450,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","defaultDives":0,"allowedRounds":["Open Practice"],"sourceNote":"Seeded restricted training assignment for Zone E.","scheduleEventId":"e-restricted-friday-region-9","eventGroupId":"e-restricted-friday-region-9-group","round":"Open Practice","canonicalKey":"restricted training | zone E | Region 9 | 450","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"manualSplit":false,"detailsOpen":false,"notes":"Region 9 restricted training.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"display":"Restricted Training","blockTitle":"Restricted Training"}]},{"id":"e-session-01","dayId":"zone-e-day-3","title":"Session","warmupStartMinutes":480,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group A Girls 1-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-001-group-a-girls-1-meter","eventGroupId":"e-session-01-lane-1m-start-540","round":"Qualifier","canonicalKey":"Group A | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":28.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"},{"id":"seed-group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group A Boys 3-Meter","defaultDives":10,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-002-group-a-boys-3-meter","eventGroupId":"e-session-01-lane-3m-start-540","round":"Qualifier","canonicalKey":"Group A | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":22.0,"defaultNumberOfDives":10,"numberOfDives":10,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]},{"id":"e-session-02","dayId":"zone-e-day-3","title":"Session","warmupStartMinutes":630,"warmupMinutes":45,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group B Girls Platform","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-003-group-b-girls-platform","eventGroupId":"e-session-02-lane-platform-start-680","round":"Qualifier","canonicalKey":"Group B | Girls | Platform | Individual | Qualifier","numberOfDivers":9.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":42.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group B Boys 1-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-004-group-b-boys-1-meter","eventGroupId":"e-session-02-lane-1m-start-680","round":"Qualifier","canonicalKey":"Group B | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":15.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":33.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"e-session-03","dayId":"zone-e-day-3","title":"Session","warmupStartMinutes":765,"warmupMinutes":35,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group C Girls 1-Meter","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-005-group-c-girls-1-meter","eventGroupId":"e-session-03-lane-1m-start-805","round":"Qualifier","canonicalKey":"Group C | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":18.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group C Boys Platform","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-006-group-c-boys-platform","eventGroupId":"e-session-03-lane-platform-start-805","round":"Qualifier","canonicalKey":"Group C | Boys | Platform | Individual | Qualifier","numberOfDivers":1.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"e-session-04","dayId":"zone-e-day-3","title":"Session","warmupStartMinutes":890,"warmupMinutes":35,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group D Girls Platform","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-007-group-d-girls-platform","eventGroupId":"e-session-04-lane-platform-start-930","round":"Qualifier","canonicalKey":"Group D | Girls | Platform | Individual | Qualifier","numberOfDivers":6.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group D Boys 1-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-008-group-d-boys-1-meter","eventGroupId":"e-session-04-lane-1m-start-930","round":"Qualifier","canonicalKey":"Group D | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":4.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"e-practice-session-021","dayId":"zone-e-day-3","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":970,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from E primary timeline.","scheduleEventId":"e-practice-021","eventGroupId":"e-practice-group-021","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":170,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"e-practice-session-023","dayId":"zone-e-day-4","title":"Restricted Training","isOpenPracticeSession":true,"warmupStartMinutes":420,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","defaultDives":0,"allowedRounds":["Open Practice"],"sourceNote":"Seeded restricted training assignment for Zone E.","scheduleEventId":"e-restricted-saturday-region-9","eventGroupId":"e-restricted-saturday-region-9-group","round":"Open Practice","canonicalKey":"restricted training | zone E | Region 9 | 420","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"manualSplit":false,"detailsOpen":false,"notes":"Region 9 restricted training.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"display":"Restricted Training","blockTitle":"Restricted Training"}]},{"id":"e-restricted-session-024-saturday","dayId":"zone-e-day-4","title":"Restricted Training","isOpenPracticeSession":true,"warmupStartMinutes":450,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Practice","style":"Restricted Training","defaultDives":0,"allowedRounds":["Open Practice"],"sourceNote":"Seeded restricted training assignment for Zone E.","scheduleEventId":"e-restricted-saturday-region-10","eventGroupId":"e-restricted-saturday-region-10-group","round":"Open Practice","canonicalKey":"restricted training | zone E | Region 10 | 450","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":30,"manualSplit":false,"detailsOpen":false,"notes":"Region 10 restricted training.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"display":"Restricted Training","blockTitle":"Restricted Training"}]},{"id":"e-session-05","dayId":"zone-e-day-4","title":"Session","warmupStartMinutes":480,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group A Girls Platform","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-009-group-a-girls-platform","eventGroupId":"e-session-05-lane-platform-start-540","round":"Qualifier","canonicalKey":"Group A | Girls | Platform | Individual | Qualifier","numberOfDivers":21.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":38.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group A Boys 1-Meter","defaultDives":10,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-010-group-a-boys-1-meter","eventGroupId":"e-session-05-lane-1m-start-540","round":"Qualifier","canonicalKey":"Group A | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":22.0,"defaultNumberOfDives":10,"numberOfDives":10,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]},{"id":"e-session-06","dayId":"zone-e-day-4","title":"Session","warmupStartMinutes":660,"warmupMinutes":45,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group B Girls 3-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-011-group-b-girls-3-meter","eventGroupId":"e-session-06-lane-3m-start-710","round":"Qualifier","canonicalKey":"Group B | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":22.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":34.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group B Boys Platform","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-012-group-b-boys-platform","eventGroupId":"e-session-06-lane-platform-start-710","round":"Qualifier","canonicalKey":"Group B | Boys | Platform | Individual | Qualifier","numberOfDivers":7.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":42.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"e-session-07","dayId":"zone-e-day-4","title":"Session","warmupStartMinutes":820,"warmupMinutes":35,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group C Girls 3-Meter","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-013-group-c-girls-3-meter","eventGroupId":"e-session-07-lane-3m-start-860","round":"Qualifier","canonicalKey":"Group C | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":16.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group C Boys 1-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-014-group-c-boys-1-meter","eventGroupId":"e-session-07-lane-1m-start-860","round":"Qualifier","canonicalKey":"Group C | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":8.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"e-session-08","dayId":"zone-e-day-4","title":"Session","warmupStartMinutes":940,"warmupMinutes":35,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group D Girls 1-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-015-group-d-girls-1-meter","eventGroupId":"e-session-08-lane-1m-start-980","round":"Qualifier","canonicalKey":"Group D | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":15.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group D Boys 3-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-016-group-d-boys-3-meter","eventGroupId":"e-session-08-lane-3m-start-980","round":"Qualifier","canonicalKey":"Group D | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":2.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"e-practice-session-036","dayId":"zone-e-day-4","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":1045,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from E primary timeline.","scheduleEventId":"e-practice-036","eventGroupId":"e-practice-group-036","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":95,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"e-practice-session-038","dayId":"zone-e-day-5","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":420,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from E primary timeline.","scheduleEventId":"e-practice-038","eventGroupId":"e-practice-group-038","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"e-session-09","dayId":"zone-e-day-5","title":"Session","warmupStartMinutes":480,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group A Girls 3-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-017-group-a-girls-3-meter","eventGroupId":"e-session-09-lane-3m-start-540","round":"Qualifier","canonicalKey":"Group A | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":26.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"},{"id":"seed-group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group A Boys Platform","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-018-group-a-boys-platform","eventGroupId":"e-session-09-lane-platform-start-540","round":"Qualifier","canonicalKey":"Group A | Boys | Platform | Individual | Qualifier","numberOfDivers":14.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":38.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"e-session-10","dayId":"zone-e-day-5","title":"Session","warmupStartMinutes":630,"warmupMinutes":45,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group B Girls 1-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-019-group-b-girls-1-meter","eventGroupId":"e-session-10-lane-1m-start-680","round":"Qualifier","canonicalKey":"Group B | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":23.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":34.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"},{"id":"seed-group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group B Boys 3-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-020-group-b-boys-3-meter","eventGroupId":"e-session-10-lane-3m-start-680","round":"Qualifier","canonicalKey":"Group B | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":15.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":33.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"e-session-11","dayId":"zone-e-day-5","title":"Session","warmupStartMinutes":765,"warmupMinutes":35,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group C Girls Platform","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-021-group-c-girls-platform","eventGroupId":"e-session-11-lane-platform-start-805","round":"Qualifier","canonicalKey":"Group C | Girls | Platform | Individual | Qualifier","numberOfDivers":8.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group C Boys 3-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-022-group-c-boys-3-meter","eventGroupId":"e-session-11-lane-3m-start-805","round":"Qualifier","canonicalKey":"Group C | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":7.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"e-session-12","dayId":"zone-e-day-5","title":"Session","warmupStartMinutes":855,"warmupMinutes":35,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group D Girls 3-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-023-group-d-girls-3-meter","eventGroupId":"e-session-12-lane-3m-start-895","round":"Qualifier","canonicalKey":"Group D | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":14.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group D Boys Platform","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone E).","scheduleEventId":"zone-e-event-024-group-d-boys-platform","eventGroupId":"e-session-12-lane-platform-start-895","round":"Qualifier","canonicalKey":"Group D | Boys | Platform | Individual | Qualifier","numberOfDivers":0.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]}],"entryDefaults":{"Group A | Girls | 1-Meter | Individual | Qualifier":28.0,"Group A | Boys | 3-Meter | Individual | Qualifier":22.0,"Group B | Girls | Platform | Individual | Qualifier":9.0,"Group B | Boys | 1-Meter | Individual | Qualifier":15.0,"Group C | Girls | 1-Meter | Individual | Qualifier":18.0,"Group C | Boys | Platform | Individual | Qualifier":1.0,"Group D | Girls | Platform | Individual | Qualifier":6.0,"Group D | Boys | 1-Meter | Individual | Qualifier":4.0,"Group A | Girls | Platform | Individual | Qualifier":21.0,"Group A | Boys | 1-Meter | Individual | Qualifier":22.0,"Group B | Girls | 3-Meter | Individual | Qualifier":22.0,"Group B | Boys | Platform | Individual | Qualifier":7.0,"Group C | Girls | 3-Meter | Individual | Qualifier":16.0,"Group C | Boys | 1-Meter | Individual | Qualifier":8.0,"Group D | Girls | 1-Meter | Individual | Qualifier":15.0,"Group D | Boys | 3-Meter | Individual | Qualifier":2.0,"Group A | Girls | 3-Meter | Individual | Qualifier":26.0,"Group A | Boys | Platform | Individual | Qualifier":14.0,"Group B | Girls | 1-Meter | Individual | Qualifier":23.0,"Group B | Boys | 3-Meter | Individual | Qualifier":15.0,"Group C | Girls | Platform | Individual | Qualifier":8.0,"Group C | Boys | 3-Meter | Individual | Qualifier":7.0,"Group D | Girls | 3-Meter | Individual | Qualifier":14.0,"Group D | Boys | Platform | Individual | Qualifier":0.0},"splitDefaults":{"Group A | Girls | 1-Meter | Individual | Qualifier":true,"Group A | Boys | 3-Meter | Individual | Qualifier":true,"Group A | Boys | 1-Meter | Individual | Qualifier":true,"Group A | Girls | 3-Meter | Individual | Qualifier":true,"Group B | Girls | 1-Meter | Individual | Qualifier":true},"duplicateMessage":"","selectedEventId":"group-a-girls-1-meter","selectedRound":"Qualifier","combineSessionId":"","outputSettings":{"publicShowWarmups":true,"publicShowOpenPracticeNotes":true},"locks":{"entries":false,"sessionOrder":false},"publishStatus":"draft","scheduleNotes":[{"id":"zone-e-seed-note","scope":"meet","audience":"operations","text":"Seeded from Zones B-E-F Detailed Timelines.xlsx for Zone E. Review entries, time zone, venue, and open practice notes before publishing."}],"exceptions":[],"currentLibraryId":"seed-zone-e"}},{"id":"seed-zone-f","name":"2026 USA Diving Zone F Championship","updatedAt":"2026-05-26T23:59:00.000Z","builtIn":true,"schedule":{"updatedAt":"2026-05-26T23:59:00.000Z","meet":{"name":"2026 USA Diving Zone F Championship","venue":"Competition Pool","timezone":"America/Los_Angeles","meetType":"zone","canvaUrl":"","days":[{"id":"zone-f-day-1","date":"2026-05-27","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-f-day-2","date":"2026-05-28","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-f-day-3","date":"2026-05-29","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-f-day-4","date":"2026-05-30","openMinutes":420,"closeMinutes":1200,"locked":false},{"id":"zone-f-day-5","date":"2026-05-31","openMinutes":420,"closeMinutes":1200,"locked":false}]},"profile":{"id":"zone","label":"Zone","description":"Seed placeholder; normalized on load.","allowedRounds":["Qualifier"],"roundRelationships":[],"events":[]},"sessions":[{"id":"f-practice-session-003","dayId":"zone-f-day-1","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":900,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from F primary timeline.","scheduleEventId":"f-practice-003","eventGroupId":"f-practice-group-003","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":240,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"f-practice-session-005","dayId":"zone-f-day-2","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":480,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from F primary timeline.","scheduleEventId":"f-practice-005","eventGroupId":"f-practice-group-005","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":480,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"f-practice-session-008","dayId":"zone-f-day-3","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":420,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from F primary timeline.","scheduleEventId":"f-practice-008","eventGroupId":"f-practice-group-008","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"f-session-01","dayId":"zone-f-day-3","title":"Session","warmupStartMinutes":480,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-girls-1-meter","level":"Group D","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group D Girls 1-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-001-group-d-girls-1-meter","eventGroupId":"f-session-01-lane-1m-start-540","round":"Qualifier","canonicalKey":"Group D | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":23.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-girls-platform","level":"Group C","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group C Girls Platform","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-002-group-c-girls-platform","eventGroupId":"f-session-01-lane-platform-start-540","round":"Qualifier","canonicalKey":"Group C | Girls | Platform | Individual | Qualifier","numberOfDivers":13.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-a-girls-3-meter","level":"Group A","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group A Girls 3-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-003-group-a-girls-3-meter","eventGroupId":"f-session-01-lane-3m-start-540","round":"Qualifier","canonicalKey":"Group A | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":37.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]},{"id":"f-session-02","dayId":"zone-f-day-3","title":"Session","warmupStartMinutes":650,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-b-boys-3-meter","level":"Group B","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group B Boys 3-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-004-group-b-boys-3-meter","eventGroupId":"f-session-02-lane-3m-start-710","round":"Qualifier","canonicalKey":"Group B | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":21.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":33.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"},{"id":"seed-group-b-girls-1-meter","level":"Group B","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group B Girls 1-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-005-group-b-girls-1-meter","eventGroupId":"f-session-02-lane-1m-start-710","round":"Qualifier","canonicalKey":"Group B | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":42.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":34.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow; Split strongly recommended if springboard"}]},{"id":"f-session-03","dayId":"zone-f-day-3","title":"Session","warmupStartMinutes":825,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-boys-platform","level":"Group D","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group D Boys Platform","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-006-group-d-boys-platform","eventGroupId":"f-session-03-lane-platform-start-885","round":"Qualifier","canonicalKey":"Group D | Boys | Platform | Individual | Qualifier","numberOfDivers":1.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-boys-platform","level":"Group C","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group C Boys Platform","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-007-group-c-boys-platform","eventGroupId":"f-session-03-lane-platform-start-885","round":"Qualifier","canonicalKey":"Group C | Boys | Platform | Individual | Qualifier","numberOfDivers":11.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-a-boys-1-meter","level":"Group A","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group A Boys 1-Meter","defaultDives":10,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-008-group-a-boys-1-meter","eventGroupId":"f-session-03-lane-1m-start-885","round":"Qualifier","canonicalKey":"Group A | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":23.0,"defaultNumberOfDives":10,"numberOfDives":10,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]},{"id":"f-practice-session-021","dayId":"zone-f-day-4","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":420,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from F primary timeline.","scheduleEventId":"f-practice-021","eventGroupId":"f-practice-group-021","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"f-session-04","dayId":"zone-f-day-4","title":"Session","warmupStartMinutes":480,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-girls-platform","level":"Group D","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group D Girls Platform","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-009-group-d-girls-platform","eventGroupId":"f-session-04-lane-platform-start-540","round":"Qualifier","canonicalKey":"Group D | Girls | Platform | Individual | Qualifier","numberOfDivers":8.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":45.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-girls-3-meter","level":"Group C","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group C Girls 3-Meter","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-010-group-c-girls-3-meter","eventGroupId":"f-session-04-lane-3m-start-540","round":"Qualifier","canonicalKey":"Group C | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":28.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"},{"id":"seed-group-a-girls-1-meter","level":"Group A","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group A Girls 1-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-011-group-a-girls-1-meter","eventGroupId":"f-session-04-lane-1m-start-540","round":"Qualifier","canonicalKey":"Group A | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":39.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]},{"id":"f-session-05","dayId":"zone-f-day-4","title":"Session","warmupStartMinutes":665,"warmupMinutes":35,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-boys-1-meter","level":"Group D","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group D Boys 1-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-012-group-d-boys-1-meter","eventGroupId":"f-session-05-lane-1m-start-705","round":"Qualifier","canonicalKey":"Group D | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":10.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-boys-1-meter","level":"Group C","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group C Boys 1-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-013-group-c-boys-1-meter","eventGroupId":"f-session-05-lane-1m-start-705","round":"Qualifier","canonicalKey":"Group C | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":18.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-b-girls-platform","level":"Group B","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group B Girls Platform","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-014-group-b-girls-platform","eventGroupId":"f-session-05-lane-platform-start-705","round":"Qualifier","canonicalKey":"Group B | Girls | Platform | Individual | Qualifier","numberOfDivers":24.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":42.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"f-session-06","dayId":"zone-f-day-4","title":"Session","warmupStartMinutes":835,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-b-boys-platform","level":"Group B","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group B Boys Platform","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-015-group-b-boys-platform","eventGroupId":"f-session-06-lane-platform-start-895","round":"Qualifier","canonicalKey":"Group B | Boys | Platform | Individual | Qualifier","numberOfDivers":17.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":42.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-a-boys-3-meter","level":"Group A","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group A Boys 3-Meter","defaultDives":10,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-016-group-a-boys-3-meter","eventGroupId":"f-session-06-lane-3m-start-895","round":"Qualifier","canonicalKey":"Group A | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":24.0,"defaultNumberOfDives":10,"numberOfDives":10,"numberOfDivesLocked":true,"secondsPerDive":32.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]},{"id":"f-practice-session-034","dayId":"zone-f-day-5","title":"Open Practice","isOpenPracticeSession":true,"warmupStartMinutes":420,"warmupMinutes":0,"transitionBufferMinutes":0,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":false,"events":[{"id":"seed-open-practice","level":"Schedule","gender":"Open","apparatus":"Pool","style":"Custom Block","defaultDives":0,"allowedRounds":["Custom Block"],"sourceNote":"Seeded from F primary timeline.","scheduleEventId":"f-practice-034","eventGroupId":"f-practice-group-034","round":"Custom Block","canonicalKey":"Schedule | Open | Pool | Custom Block | Custom Block","defaultNumberOfDives":0,"numberOfDives":0,"numberOfDivers":0,"secondsPerDive":0,"numberOfDivesLocked":false,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"customDurationMinutes":60,"manualSplit":false,"detailsOpen":false,"notes":"Open practice block.","projectedAdvancers":0,"actualAdvancers":0,"finalFieldSize":0,"domesticEligibleAdvancers":0,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0}]},{"id":"f-session-07","dayId":"zone-f-day-5","title":"Session","warmupStartMinutes":480,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-c-girls-1-meter","level":"Group C","gender":"Girls","apparatus":"1-Meter","style":"Individual","display":"Group C Girls 1-Meter","defaultDives":7,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-017-group-c-girls-1-meter","eventGroupId":"f-session-07-lane-1m-start-540","round":"Qualifier","canonicalKey":"Group C | Girls | 1-Meter | Individual | Qualifier","numberOfDivers":33.0,"defaultNumberOfDives":7,"numberOfDives":7,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"},{"id":"seed-group-d-girls-3-meter","level":"Group D","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group D Girls 3-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-018-group-d-girls-3-meter","eventGroupId":"f-session-07-lane-3m-start-540","round":"Qualifier","canonicalKey":"Group D | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":19.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-a-boys-platform","level":"Group A","gender":"Boys","apparatus":"Platform","style":"Individual","display":"Group A Boys Platform","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-019-group-a-boys-platform","eventGroupId":"f-session-07-lane-platform-start-540","round":"Qualifier","canonicalKey":"Group A | Boys | Platform | Individual | Qualifier","numberOfDivers":14.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":38.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""}]},{"id":"f-session-08","dayId":"zone-f-day-5","title":"Session","warmupStartMinutes":685,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-b-boys-1-meter","level":"Group B","gender":"Boys","apparatus":"1-Meter","style":"Individual","display":"Group B Boys 1-Meter","defaultDives":9,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-020-group-b-boys-1-meter","eventGroupId":"f-session-08-lane-1m-start-745","round":"Qualifier","canonicalKey":"Group B | Boys | 1-Meter | Individual | Qualifier","numberOfDivers":22.0,"defaultNumberOfDives":9,"numberOfDives":9,"numberOfDivesLocked":true,"secondsPerDive":33.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"},{"id":"seed-group-b-girls-3-meter","level":"Group B","gender":"Girls","apparatus":"3-Meter","style":"Individual","display":"Group B Girls 3-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-021-group-b-girls-3-meter","eventGroupId":"f-session-08-lane-3m-start-745","round":"Qualifier","canonicalKey":"Group B | Girls | 3-Meter | Individual | Qualifier","numberOfDivers":37.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":34.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":3,"minutesPerPanelChange":3.0,"manualSplit":true,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review split board / flow"}]},{"id":"f-session-09","dayId":"zone-f-day-5","title":"Session","warmupStartMinutes":865,"warmupMinutes":55,"transitionBufferMinutes":5,"roundingIncrementMinutes":5,"locked":false,"collapsed":false,"awardsEnabled":true,"events":[{"id":"seed-group-d-boys-3-meter","level":"Group D","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group D Boys 3-Meter","defaultDives":6,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-022-group-d-boys-3-meter","eventGroupId":"f-session-09-lane-3m-start-925","round":"Qualifier","canonicalKey":"Group D | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":9.0,"defaultNumberOfDives":6,"numberOfDives":6,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-c-boys-3-meter","level":"Group C","gender":"Boys","apparatus":"3-Meter","style":"Individual","display":"Group C Boys 3-Meter","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-023-group-c-boys-3-meter","eventGroupId":"f-session-09-lane-3m-start-925","round":"Qualifier","canonicalKey":"Group C | Boys | 3-Meter | Individual | Qualifier","numberOfDivers":17.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":35.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":""},{"id":"seed-group-a-girls-platform","level":"Group A","gender":"Girls","apparatus":"Platform","style":"Individual","display":"Group A Girls Platform","defaultDives":8,"allowedRounds":["Qualifier"],"sourceNote":"Seeded from Zones B-E-F Detailed Timelines.xlsx (Zone F).","scheduleEventId":"zone-f-event-024-group-a-girls-platform","eventGroupId":"f-session-09-lane-platform-start-925","round":"Qualifier","canonicalKey":"Group A | Girls | Platform | Individual | Qualifier","numberOfDivers":28.0,"defaultNumberOfDives":8,"numberOfDives":8,"numberOfDivesLocked":true,"secondsPerDive":38.0,"secondsPerDiveLocked":false,"numberOfPanelChanges":0,"minutesPerPanelChange":0,"manualSplit":false,"detailsOpen":false,"projectedAdvancers":12,"actualAdvancers":0,"finalFieldSize":12,"domesticEligibleAdvancers":12,"foreignAthleteAdjustment":0,"dualCitizenAdjustment":0,"notes":"Review platform load"}]}],"entryDefaults":{"Group D | Girls | 1-Meter | Individual | Qualifier":23.0,"Group C | Girls | Platform | Individual | Qualifier":13.0,"Group A | Girls | 3-Meter | Individual | Qualifier":37.0,"Group B | Boys | 3-Meter | Individual | Qualifier":21.0,"Group B | Girls | 1-Meter | Individual | Qualifier":42.0,"Group D | Boys | Platform | Individual | Qualifier":1.0,"Group C | Boys | Platform | Individual | Qualifier":11.0,"Group A | Boys | 1-Meter | Individual | Qualifier":23.0,"Group D | Girls | Platform | Individual | Qualifier":8.0,"Group C | Girls | 3-Meter | Individual | Qualifier":28.0,"Group A | Girls | 1-Meter | Individual | Qualifier":39.0,"Group D | Boys | 1-Meter | Individual | Qualifier":10.0,"Group C | Boys | 1-Meter | Individual | Qualifier":18.0,"Group B | Girls | Platform | Individual | Qualifier":24.0,"Group B | Boys | Platform | Individual | Qualifier":17.0,"Group A | Boys | 3-Meter | Individual | Qualifier":24.0,"Group C | Girls | 1-Meter | Individual | Qualifier":33.0,"Group D | Girls | 3-Meter | Individual | Qualifier":19.0,"Group A | Boys | Platform | Individual | Qualifier":14.0,"Group B | Boys | 1-Meter | Individual | Qualifier":22.0,"Group B | Girls | 3-Meter | Individual | Qualifier":37.0,"Group D | Boys | 3-Meter | Individual | Qualifier":9.0,"Group C | Boys | 3-Meter | Individual | Qualifier":17.0,"Group A | Girls | Platform | Individual | Qualifier":28.0},"splitDefaults":{"Group A | Girls | 3-Meter | Individual | Qualifier":true,"Group B | Girls | 1-Meter | Individual | Qualifier":true,"Group A | Girls | 1-Meter | Individual | Qualifier":true,"Group B | Girls | 3-Meter | Individual | Qualifier":true},"duplicateMessage":"","selectedEventId":"group-a-girls-1-meter","selectedRound":"Qualifier","combineSessionId":"","outputSettings":{"publicShowWarmups":true,"publicShowOpenPracticeNotes":true},"locks":{"entries":false,"sessionOrder":false},"publishStatus":"draft","scheduleNotes":[{"id":"zone-f-seed-note","scope":"meet","audience":"operations","text":"Seeded from Zones B-E-F Detailed Timelines.xlsx for Zone F. Review entries, time zone, venue, and open practice notes before publishing."}],"exceptions":[],"currentLibraryId":"seed-zone-f"}}];
  const ROUND_OPTIONS = ["Qualifier", "Prelim", "Semifinal", "Final", "Custom Block"];
  const SCHEDULE_BLOCK_TYPES = ["Open Practice", "Restricted Training", "Open Training", "Break", "Awards", "Custom Block"];
  const SCHEDULE_BLOCK_DEFAULT_NOTES = {
    "Open Practice": "Open practice.",
    "Restricted Training": "Restricted training.",
    "Open Training": "Open training.",
    "Break": "Break.",
    "Awards": "Awards.",
    "Custom Block": "Custom schedule note.",
  };
  const SCHEDULE_BLOCK_DEFAULT_NOTE_PATTERN = /^(Open practice\.|Restricted training\.|Open training\.|Break\.|Awards\.|Custom schedule note\.)$/i;
  const TECHNICAL_MEETING_BLOCK_ALERT = "Technical Meeting blocks cannot be manually added or renamed in Schedule Builder.";
  const RELATIONSHIP_OPTIONS = [
    ["sameDayRequired", "Same day required"],
    ["sameDayPreferred", "Same day preferred"],
    ["differentDayAllowed", "Different day allowed"],
    ["differentDayRequired", "Different day required"],
    ["userChoice", "User choice"],
  ];

  const TIME_ZONE_OPTIONS = [
    { value: "America/New_York", label: "Eastern Time (ET)", short: "ET" },
    { value: "America/Chicago", label: "Central Time (CT)", short: "CT" },
    { value: "America/Denver", label: "Mountain Time (MT)", short: "MT" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)", short: "PT" },
  ];

  const FACILITY_ASSUMPTIONS = [
    { label: "1-Meter", count: 2, note: "two competition 1-meter boards" },
    { label: "3-Meter", count: 2, note: "two competition 3-meter boards" },
    { label: "Platform", count: 1, note: "5m, 7.5m/7m, and 10m platform tower" },
  ];

  const TEMPLATE_GROUPS = [
    { id: "juniorQualifiers", title: "Junior Qualifier", description: "Regionals/Zones/E/W/C style qualifier schedule with junior split-board logic." },
    { id: "usaNationalsNoSemis", title: "USA Nationals", description: "Senior nationals profile with qualifiers, prelims, finals, and rare same-day qualifier exceptions." },
    { id: "usaNationalsWithSemis", title: "USA Nationals + Semis", description: "Adds semifinal relationships for senior championship formats." },
    { id: "winterNationals", title: "Winter Nationals", description: "Winter Nationals qualifier/championship profile." },
    { id: "custom", title: "Custom", description: "All catalog events and all editable rule relationships." },
  ];

  let dragSessionId = "";
  let dragEventId = "";
  let combineHoverTimer = 0;
  let combineHoverEventId = "";
  let dragScrollFrame = 0;
  let lastDragScrollEvent = null;
  let pointerDragState = null;
  let pointerDragGhost = null;
  let pointerDragHoverId = "";
  let pointerDragHoverStartedAt = 0;
  let clickMoveState = null;
  let scheduleBlockPlanner = null;
  let scheduleLibraryOpen = false;
  let notesManagerOpen = false;
  let duplicateDayPlanner = null;
  let releaseModeOpen = false;
  let resetWorkspaceOpen = false;
  let publishedEditBypass = false;

  function setDragPayload(event, kind, idValue) {
    if (!event || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = "move";
    try { event.dataTransfer.setData(`application/x-usadiving-${kind}`, idValue); } catch {}
    try { event.dataTransfer.setData("text/plain", `${kind}:${idValue}`); } catch {}
  }

  function dragPayload(event, kind) {
    const fallback = kind === "session" ? dragSessionId : dragEventId;
    if (fallback) return fallback;
    if (!event || !event.dataTransfer) return "";
    try {
      const direct = event.dataTransfer.getData(`application/x-usadiving-${kind}`);
      if (direct) return direct;
      const text = event.dataTransfer.getData("text/plain") || "";
      const prefix = `${kind}:`;
      return text.startsWith(prefix) ? text.slice(prefix.length) : "";
    } catch {
      return "";
    }
  }

  function hasDragType(event, kind) {
    if (kind === "session" && dragSessionId) return true;
    if (kind === "event" && dragEventId) return true;
    const types = Array.from(event?.dataTransfer?.types || []);
    return types.includes(`application/x-usadiving-${kind}`);
  }

  function cssEscapeValue(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
  let catalogMode = "new";
  let catalogNewDayId = "";
  let catalogSearch = "";
  let catalogGenderFilter = "all";
  let catalogApparatusFilter = "all";
  let catalogStatusFilter = "available";
  let previewMode = "timeline";
  let scheduleHealthExpanded = true;
  let entryManagerOpen = false;
  let activeBuilderDayId = "";
  let pendingBuilderScrollTop = false;
  let currentSessionNumberMap = new Map();

  function parseTime(value) {
    const parts = String(value || "00:00").split(":").map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  function formatTimeInput(minutes) {
    const rounded = Math.max(0, Math.round(minutes));
    const hours = Math.floor(rounded / 60) % 24;
    const mins = rounded % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  function displayTime(minutes) {
    const rounded = Math.max(0, Math.round(minutes));
    const hours24 = Math.floor(rounded / 60) % 24;
    const mins = rounded % 60;
    const suffix = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
  }

  function lockIcon(isLocked) {
    return isLocked ? "🔒" : "🔓";
  }

  function activeEntryDefaultsForState(source = state) {
    if (!source) return {};
    if ((source.entryMode || "projected") === "actual") {
      return { ...(source.projectedEntryDefaults || source.entryDefaults || {}), ...(source.actualEntryDefaults || {}) };
    }
    return source.projectedEntryDefaults || source.entryDefaults || {};
  }

  function entryValueForKey(key) {
    const active = activeEntryDefaultsForState(state);
    return active?.[key];
  }

  function activeTheme() {
    return COLOR_THEMES[state?.theme || "classic"] || COLOR_THEMES.classic;
  }

  function selectedTimeZoneOption() {
    const tz = state?.meet?.timezone || "America/New_York";
    return TIME_ZONE_OPTIONS.find((option) => option.value === tz) || TIME_ZONE_OPTIONS[0];
  }

  function timeZoneSelectOptions() {
    const tz = state?.meet?.timezone || "America/New_York";
    return TIME_ZONE_OPTIONS.map((option) => `<option value="${option.value}" ${option.value === tz ? "selected" : ""}>${option.label}</option>`).join("");
  }


  function publishStatusLabel(value = state.publishStatus) {
    const labels = { draft: "Draft", review: "Internal Review", ready: "Ready to Publish", published: "Published" };
    return labels[value] || "Draft";
  }

  function publishStatusOptions() {
    const options = [
      ["draft", "Draft"],
      ["review", "Internal Review"],
      ["ready", "Ready to Publish"],
      ["published", "Published"],
    ];
    return options.map(([value, label]) => `<option value="${value}" ${value === (state.publishStatus || "draft") ? "selected" : ""}>${label}</option>`).join("");
  }

  function noteScopeLabel(note) {
    if (!note) return "Meet";
    if (note.scope === "day") {
      const day = state.meet.days.find((item) => item.id === note.dayId);
      return day ? fullDayName(day) : "Day note";
    }
    if (note.scope === "session") {
      const session = state.sessions.find((item) => item.id === note.sessionId);
      return session ? sessionDisplayName(session) : "Session note";
    }
    return "Meet";
  }

  function noteAudienceLabel(value) {
    if (value === "public") return "Public";
    if (value === "operations") return "Operations";
    return "Public + Operations";
  }

  function notesForContext({ dayId = "", sessionId = "", audience = "both" } = {}) {
    const notes = Array.isArray(state.scheduleNotes) ? state.scheduleNotes : [];
    return notes.filter((note) => {
      const audienceMatch = note.audience === "both" || note.audience === audience || audience === "both";
      if (!audienceMatch) return false;
      if (sessionId && note.scope === "session") return note.sessionId === sessionId;
      if (dayId && note.scope === "day") return note.dayId === dayId;
      return note.scope === "meet";
    });
  }

  function exceptionKey(warning) {
    return String(warning?.id || `${warning?.code || "warning"}-${warning?.sessionId || ""}-${warning?.scheduleEventId || ""}`);
  }

  function stableDomId(prefix, value) {
    let hash = 0;
    const text = String(value || "");
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return `${prefix}-${Math.abs(hash).toString(36)}`;
  }

  function exceptionRecordForWarning(warning) {
    const key = exceptionKey(warning);
    return (state.exceptions || []).find((item) => item.warningId === key);
  }

  function isWarningAcknowledged(warning) {
    const key = exceptionKey(warning);
    return (state.exceptions || []).some((item) => item.warningId === key);
  }

  function builderActiveDay() {
    const days = state?.meet?.days || [];
    if (!days.length) return null;
    if (!activeBuilderDayId || !days.some((day) => day.id === activeBuilderDayId)) {
      activeBuilderDayId = days[0].id;
    }
    return days.find((day) => day.id === activeBuilderDayId) || days[0];
  }

  function afterRender() {
    const theme = activeTheme();
    const root = document.documentElement;
    root.style.setProperty("--theme-primary", theme.primary);
    root.style.setProperty("--theme-accent", theme.accent);
    root.style.setProperty("--theme-soft", theme.soft);
    root.style.setProperty("--theme-block", theme.block);
    root.style.setProperty("--theme-neutral", theme.neutral);
    if (!pendingBuilderScrollTop) return;
    pendingBuilderScrollTop = false;
    window.setTimeout(() => {
      const builder = document.getElementById("scheduleBuilderBoard");
      if (builder) builder.scrollIntoView({ behavior: "smooth", block: "start" });
      const scrollPanel = document.querySelector(".single-day-board");
      if (scrollPanel) scrollPanel.scrollTop = 0;
      const dayPanel = document.querySelector(".active-day-panel");
      if (dayPanel) dayPanel.scrollTop = 0;
    }, 0);
  }

  function formatUpdatedStamp() {
    const option = selectedTimeZoneOption();
    const date = new Date(state.updatedAt || state.meet?.updatedAt || Date.now());
    if (Number.isNaN(date.getTime())) return `not saved yet ${option.short}`;
    const formatted = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: option.value,
    }).format(date);
    return `${formatted} ${option.short}`;
  }

  function timelineEndCapNote() {
    const option = selectedTimeZoneOption();
    return `* Schedule updated ${formatUpdatedStamp()}. Status: ${publishStatusLabel(state.publishStatus)}. All times are in ${option.label}.`;
  }

  function roundUp(minutes, increment) {
    return increment <= 0 ? minutes : Math.ceil(minutes / increment) * increment;
  }

  function id(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function escapeJs(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\r/g, "")
      .replace(/\n/g, "\\n");
  }

  function normalizeScheduleBlockLabel(value) {
    return String(value ?? "").replace(/[\s_-]+/g, " ").trim().toLowerCase();
  }

  function isTechnicalMeetingBlockName(value) {
    return normalizeScheduleBlockLabel(value) === "technical meeting";
  }

  function alertTechnicalMeetingBlock() {
    window.alert(TECHNICAL_MEETING_BLOCK_ALERT);
  }

  function plannerNameMatchesDefault(name, defaultLabel) {
    return normalizeScheduleBlockLabel(name) === normalizeScheduleBlockLabel(defaultLabel);
  }

  function dateLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  function shortDayLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function eventKey(event, round) {
    return `${event.level} | ${event.gender} | ${event.apparatus} | ${event.style} | ${round}`;
  }

  function eventDisplayName(event) {
    return `${event.level} ${event.gender} ${apparatusDisplay(event.apparatus)}`.replace(/\s+/g, " ").trim();
  }

  function apparatusDisplay(apparatus) {
    if (apparatus === "1m") return "1-Meter";
    if (apparatus === "3m") return "3-Meter";
    if (apparatus === "10m") return "10-Meter";
    return apparatus;
  }

  function isPlatformEvent(event) {
    const apparatus = String(event?.apparatus || "").toLowerCase();
    return apparatus === "platform" || apparatus === "10m" || apparatus === "10-meter";
  }

  function eventLaneKey(event) {
    const apparatus = String(event?.apparatus || "").toLowerCase();
    if (apparatus === "1m" || apparatus === "1-meter") return "1m";
    if (apparatus === "3m" || apparatus === "3-meter") return "3m";
    if (apparatus === "platform" || apparatus === "10m" || apparatus === "10-meter") return "platform";
    return "other";
  }

  function eventLaneLabelFromKey(key) {
    if (key === "1m") return "1-Meter";
    if (key === "3m") return "3-Meter";
    if (key === "platform") return "Platform";
    return "Other";
  }

  function eventLaneLabel(event) {
    return eventLaneLabelFromKey(eventLaneKey(event));
  }

  function fullEventIdentity(event) {
    return `${event.level || ""} ${event.gender || ""}`.replace(/\s+/g, " ").trim();
  }

  function disciplineKey(event) {
    return eventLaneKey(event);
  }

  function allowsSameDayMultiDiscipline(event) {
    const meetType = String(state?.meet?.meetType || "");
    return event?.round === "Qualifier" && /usaNationals|winterNationals/i.test(meetType);
  }

  function groupLaneKey(group) {
    return eventLaneKey(group?.events?.[0]);
  }

  function sameEventLane(a, b) {
    return eventLaneKey(a) === eventLaneKey(b);
  }

  function canCombineEvents(a, b) {
    return Boolean(a && b && sameEventLane(a, b));
  }

  function canonicalLabel(event) {
    return `${eventDisplayName(event)} ${event.style} ${event.round}`.replace(" Individual", "");
  }

  const defaultTiming = {
    transitionBufferMinutes: 5,
    roundingIncrementMinutes: 5,
    secondsPerDive: 42,
    secondsPerDiveLocked: false,
    warmupMinutes: 55,
    panelChangeMinutes: 2.5,
    introductionsMinutes: 10,
    awardsMinutes: 15,
    finalsTransitionMode: "openTraining",
    finalsTransitionMinutes: 45,
    splitThresholds: { recommendTotalDives: 180, reviewAthletes: 40 },
  };


  const TIMING_TEMPLATE_SOURCE_NOTE = "Timing seeded from prior USA Diving zone/JWCT workbook templates; edit per meet entries as needed.";

  const EVENT_TIMING_TEMPLATES = {
    "Group A Girls 3-Meter": { dives: 9, secondsPerDive: 32, warmupMinutes: 55 },
    "Group A Girls 1-Meter": { dives: 9, secondsPerDive: 32, warmupMinutes: 55 },
    "Group A Girls Platform": { dives: 8, secondsPerDive: 38, warmupMinutes: 55 },
    "Group A Boys 3-Meter": { dives: 10, secondsPerDive: 32, warmupMinutes: 55 },
    "Group A Boys 1-Meter": { dives: 10, secondsPerDive: 32, warmupMinutes: 55 },
    "Group A Boys Platform": { dives: 9, secondsPerDive: 38, warmupMinutes: 55 },
    "Group B Girls 3-Meter": { dives: 8, secondsPerDive: 34, warmupMinutes: 45 },
    "Group B Girls 1-Meter": { dives: 8, secondsPerDive: 34, warmupMinutes: 45 },
    "Group B Girls Platform": { dives: 7, secondsPerDive: 42, warmupMinutes: 35 },
    "Group B Boys 3-Meter": { dives: 9, secondsPerDive: 33, warmupMinutes: 45 },
    "Group B Boys 1-Meter": { dives: 9, secondsPerDive: 34, warmupMinutes: 35 },
    "Group B Boys Platform": { dives: 8, secondsPerDive: 42, warmupMinutes: 35 },
    "Group C Girls 3-Meter": { dives: 7, secondsPerDive: 35, warmupMinutes: 35 },
    "Group C Girls 1-Meter": { dives: 7, secondsPerDive: 35, warmupMinutes: 35 },
    "Group C Girls Platform": { dives: 6, secondsPerDive: 45, warmupMinutes: 35 },
    "Group C Boys 3-Meter": { dives: 8, secondsPerDive: 35, warmupMinutes: 35 },
    "Group C Boys 1-Meter": { dives: 8, secondsPerDive: 35, warmupMinutes: 35 },
    "Group C Boys Platform": { dives: 7, secondsPerDive: 45, warmupMinutes: 35 },
    "Group D Girls 3-Meter": { dives: 6, secondsPerDive: 35, warmupMinutes: 35 },
    "Group D Girls 1-Meter": { dives: 6, secondsPerDive: 35, warmupMinutes: 35 },
    "Group D Girls Platform": { dives: 6, secondsPerDive: 45, warmupMinutes: 35 },
    "Group D Boys 3-Meter": { dives: 6, secondsPerDive: 35, warmupMinutes: 35 },
    "Group D Boys 1-Meter": { dives: 6, secondsPerDive: 35, warmupMinutes: 35 },
    "Group D Boys Platform": { dives: 6, secondsPerDive: 45, warmupMinutes: 35 },
    "A Girls 3-Meter": { dives: 9, secondsPerDive: 32, warmupMinutes: 55 },
    "A Girls 1-Meter": { dives: 9, secondsPerDive: 32, warmupMinutes: 55 },
    "A Girls Platform": { dives: 8, secondsPerDive: 38, warmupMinutes: 55 },
    "A Boys 3-Meter": { dives: 10, secondsPerDive: 32, warmupMinutes: 55 },
    "A Boys 1-Meter": { dives: 10, secondsPerDive: 32, warmupMinutes: 55 },
    "A Boys Platform": { dives: 9, secondsPerDive: 35, warmupMinutes: 55 },
    "B Girls 3-Meter": { dives: 8, secondsPerDive: 34, warmupMinutes: 45 },
    "B Girls 1-Meter": { dives: 8, secondsPerDive: 34, warmupMinutes: 45 },
    "B Girls Platform": { dives: 7, secondsPerDive: 35, warmupMinutes: 35 },
    "B Boys 3-Meter": { dives: 9, secondsPerDive: 33, warmupMinutes: 45 },
    "B Boys 1-Meter": { dives: 9, secondsPerDive: 34, warmupMinutes: 35 },
    "B Boys Platform": { dives: 8, secondsPerDive: 35, warmupMinutes: 35 },
  };


  const JUNIOR_SPLIT_PANEL_ROTATIONS = {
    springboard: {
      Girls: {
        "Group A": { dives: 9, panelA: "Rounds 1, 2, 3, 6, 7", panelB: "Rounds 4, 5, 8, 9" },
        "Group B": { dives: 8, panelA: "Rounds 1, 2, 5, 6", panelB: "Rounds 3, 4, 7, 8" },
        "Group C": { dives: 7, panelA: "Rounds 1, 2, 5, 6", panelB: "Rounds 3, 4, 7" },
        "Group D": { dives: 6, panelA: "Rounds 1, 2, 6", panelB: "Rounds 3, 4, 5" },
      },
      Boys: {
        "Group A": { dives: 10, panelA: "Rounds 1, 2, 3, 7, 8", panelB: "Rounds 4, 5, 6, 9, 10" },
        "Group B": { dives: 9, panelA: "Rounds 1, 2, 3, 6, 7", panelB: "Rounds 4, 5, 8, 9" },
        "Group C": { dives: 8, panelA: "Rounds 1, 2, 5, 6", panelB: "Rounds 3, 4, 7, 8" },
        "Group D": { dives: 6, panelA: "Rounds 1, 2, 6", panelB: "Rounds 3, 4, 5" },
      },
    },
    platform: {
      Girls: {
        "Group A": { dives: 8, panelA: "Rounds 1, 2, 5, 6", panelB: "Rounds 3, 4, 7, 8" },
        "Group B": { dives: 7, panelA: "Rounds 1, 2, 5, 6", panelB: "Rounds 3, 4, 7" },
        "Group C": { dives: 6, panelA: "Rounds 1, 2, 6", panelB: "Rounds 3, 4, 5" },
        "Group D": { dives: 6, panelA: "Rounds 1, 2, 6", panelB: "Rounds 3, 4, 5" },
      },
      Boys: {
        "Group A": { dives: 9, panelA: "Rounds 1, 2, 5, 6, 7", panelB: "Rounds 3, 4, 8, 9" },
        "Group B": { dives: 8, panelA: "Rounds 1, 2, 5, 6", panelB: "Rounds 3, 4, 7, 8" },
        "Group C": { dives: 7, panelA: "Rounds 1, 2, 5, 6", panelB: "Rounds 3, 4, 7" },
        "Group D": { dives: 6, panelA: "Rounds 1, 2, 6", panelB: "Rounds 3, 4, 5" },
      },
    },
  };

  function apparatusRotationType(event) {
    return event.apparatus === "Platform" || event.apparatus === "10m" ? "platform" : "springboard";
  }

  function splitPanelRotationForEvent(event) {
    if (!event || event.style !== "Individual") return null;
    if (event.gender !== "Girls" && event.gender !== "Boys") return null;
    const level = String(event.level || "").startsWith("Group ") ? event.level : `Group ${event.level}`;
    return JUNIOR_SPLIT_PANEL_ROTATIONS[apparatusRotationType(event)]?.[event.gender]?.[level] || null;
  }

  function splitPanelRotationText(event) {
    const rotation = splitPanelRotationForEvent(event);
    if (!rotation) return "Split board rotation: review manually for this event type.";
    return `Panel A: ${rotation.panelA}; Panel B: ${rotation.panelB}`;
  }

  function seniorTimingTemplate(preset) {
    if (preset.level !== "Senior") return null;
    const isSynchro = preset.style === "Synchronized";
    const isPlatform = preset.apparatus === "10m" || preset.apparatus === "Platform";
    const dives = isSynchro ? (preset.gender === "Men" ? 6 : 5) : preset.gender === "Men" ? 6 : 5;
    return {
      dives,
      secondsPerDive: isSynchro ? (isPlatform ? 45 : 40) : isPlatform ? 38 : 32,
      warmupMinutes: isPlatform ? 55 : 45,
    };
  }

  function timingTemplateForPreset(preset) {
    const direct = EVENT_TIMING_TEMPLATES[eventDisplayName(preset)];
    return direct || seniorTimingTemplate(preset) || null;
  }

  function applyTimingTemplateToPreset(preset) {
    const template = timingTemplateForPreset(preset);
    if (!template) return preset;
    return {
      ...preset,
      defaultDives: template.dives ?? preset.defaultDives,
      defaultSecondsPerDive: template.secondsPerDive ?? preset.defaultSecondsPerDive,
      defaultWarmupMinutes: template.warmupMinutes ?? preset.defaultWarmupMinutes,
      sourceNote: `${preset.sourceNote || "Event preset."} ${TIMING_TEMPLATE_SOURCE_NOTE}`,
    };
  }

  const advancementDefaults = {
    projectedAdvancers: 12,
    actualAdvancers: 0,
    finalFieldSize: 12,
    domesticEligibleAdvancers: 12,
    foreignAthleteAdjustment: 0,
    dualCitizenAdjustment: 0,
    notes: "",
  };

  function seniorIndividual(rounds) {
    return ["Women", "Men"].flatMap((gender) =>
      ["1m", "3m", "10m"].map((apparatus) => ({
        id: `senior-${gender.toLowerCase()}-${apparatus}`,
        level: "Senior",
        gender,
        apparatus,
        style: "Individual",
        defaultDives: gender === "Women" ? 5 : 6,
        allowedRounds: rounds,
        sourceNote: "Senior individual preset. Advancement fields are editable.",
      })),
    );
  }

  function seniorSynchro(rounds) {
    return [
      ...["Women", "Men"].flatMap((gender) =>
        ["3m", "10m"].map((apparatus) => ({
          id: `senior-synchro-${gender.toLowerCase()}-${apparatus}`,
          level: "Senior",
          gender,
          apparatus,
          style: "Synchronized",
          defaultDives: gender === "Women" ? 5 : 6,
          allowedRounds: rounds,
          sourceNote: "Senior synchronized preset.",
        })),
      ),
      ...["3m", "10m"].map((apparatus) => ({
        id: `senior-mixed-synchro-${apparatus}`,
        level: "Senior",
        gender: "Mixed",
        apparatus,
        style: "Synchronized",
        defaultDives: 5,
        allowedRounds: rounds,
        sourceNote: "Mixed synchronized preset.",
      })),
    ];
  }

  const juniorGroups = [
    { level: "Group D", girls: { springboard: 6, platform: 6 }, boys: { springboard: 6, platform: 6 } },
    { level: "Group C", girls: { springboard: 7, platform: 6 }, boys: { springboard: 8, platform: 7 } },
    { level: "Group B", girls: { springboard: 8, platform: 7 }, boys: { springboard: 9, platform: 8 } },
    { level: "Group A", girls: { springboard: 9, platform: 8 }, boys: { springboard: 10, platform: 9 } },
  ];

  function juniorEvents(rounds, options) {
    const groups = juniorGroups.filter((group) => options.groups.includes(group.level));
    const springboard = groups.flatMap((group) =>
      ["Girls", "Boys"].flatMap((gender) =>
        ["1m", "3m"].map((apparatus) => ({
          id: `${group.level}-${gender}-${apparatus}`.toLowerCase().replace(/\s+/g, "-"),
          level: group.level,
          gender,
          apparatus,
          style: "Individual",
          defaultDives: gender === "Girls" ? group.girls.springboard : group.boys.springboard,
          allowedRounds: rounds,
          sourceNote: "Junior springboard preset from current circuit event structure.",
        })),
      ),
    );
    const platform = groups.flatMap((group) =>
      ["Girls", "Boys"].map((gender) => ({
        id: `${group.level}-${gender}-platform`.toLowerCase().replace(/\s+/g, "-"),
        level: group.level,
        gender,
        apparatus: "Platform",
        style: "Individual",
        defaultDives: gender === "Girls" ? group.girls.platform : group.boys.platform,
        allowedRounds: rounds,
        sourceNote: "Junior platform preset from current circuit event structure.",
      })),
    );
    const synchro = ["Girls", "Boys", "Mixed"].flatMap((gender) =>
      ["3m", "Platform"].flatMap((apparatus) =>
        ["Junior 13 & Under", "Junior 14-18"].map((level) => ({
          id: `${level}-${gender}-synchro-${apparatus}`.toLowerCase().replace(/\s+/g, "-"),
          level,
          gender,
          apparatus,
          style: "Synchronized",
          defaultDives: 5,
          allowedRounds: rounds,
          sourceNote: "Junior synchronized preset.",
        })),
      ),
    );
    return [...springboard, ...(options.platform ? platform : []), ...(options.synchro ? synchro : [])];
  }

  const meetProfiles = {
    regional: {
      id: "regional",
      label: "Regional",
      description: "Junior regional qualifier profile. Qualifier events do not automatically create finals.",
      allowedRounds: ["Qualifier"],
      roundRelationships: [],
      events: juniorEvents(["Qualifier"], { platform: false, synchro: false, groups: ["Group A", "Group B"] }),
    },
    zone: {
      id: "zone",
      label: "Zone",
      description: "Junior zone qualifier profile. Qualifier events do not automatically create finals.",
      allowedRounds: ["Qualifier"],
      roundRelationships: [],
      events: juniorEvents(["Qualifier"], { platform: true, synchro: true, groups: ["Group A", "Group B", "Group C", "Group D"] }),
    },
    eastWestCentral: {
      id: "eastWestCentral",
      label: "East/West/Central",
      description: "EWC profile using preliminaries and finals.",
      allowedRounds: ["Prelim", "Final"],
      roundRelationships: [{ from: "Prelim", to: "Final", relationship: "sameDayPreferred", configurable: true }],
      events: juniorEvents(["Prelim", "Final"], { platform: true, synchro: false, groups: ["Group A", "Group B", "Group C", "Group D"] }),
    },
    juniorNationals: {
      id: "juniorNationals",
      label: "Junior Nationals",
      description: "Junior Nationals prelim/final profile.",
      allowedRounds: ["Prelim", "Final"],
      roundRelationships: [{ from: "Prelim", to: "Final", relationship: "differentDayAllowed", configurable: true }],
      events: juniorEvents(["Prelim", "Final"], { platform: true, synchro: true, groups: ["Group A", "Group B", "Group C", "Group D"] }),
    },
    usaNationalsNoSemis: {
      id: "usaNationalsNoSemis",
      label: "USA Nationals without semifinals",
      description: "Senior national profile without semifinals.",
      allowedRounds: ["Qualifier", "Prelim", "Final"],
      roundRelationships: [
        { from: "Qualifier", to: "Prelim", relationship: "differentDayAllowed", configurable: true },
        { from: "Prelim", to: "Final", relationship: "differentDayAllowed", configurable: true },
      ],
      events: [...seniorIndividual(["Qualifier", "Prelim", "Final"]), ...seniorSynchro(["Final"])],
    },
    usaNationalsWithSemis: {
      id: "usaNationalsWithSemis",
      label: "USA Nationals with semifinals",
      description: "Senior national profile with semifinals.",
      allowedRounds: ["Qualifier", "Prelim", "Semifinal", "Final"],
      roundRelationships: [
        { from: "Qualifier", to: "Prelim", relationship: "differentDayAllowed", configurable: true },
        { from: "Prelim", to: "Semifinal", relationship: "sameDayPreferred", configurable: true },
        { from: "Semifinal", to: "Final", relationship: "differentDayAllowed", configurable: true },
      ],
      events: [...seniorIndividual(["Qualifier", "Prelim", "Semifinal", "Final"]), ...seniorSynchro(["Final"])],
    },
    winterNationals: {
      id: "winterNationals",
      label: "Winter Nationals",
      description: "Winter Nationals qualifier and championship profile.",
      allowedRounds: ["Qualifier", "Prelim", "Final"],
      roundRelationships: [
        { from: "Qualifier", to: "Prelim", relationship: "differentDayAllowed", configurable: true },
        { from: "Prelim", to: "Final", relationship: "differentDayAllowed", configurable: true },
      ],
      events: [...seniorIndividual(["Qualifier", "Prelim", "Final"]), ...seniorSynchro(["Prelim", "Final"])],
    },
    custom: {
      id: "custom",
      label: "Custom",
      description: "All standard event presets with editable rules.",
      allowedRounds: ROUND_OPTIONS,
      roundRelationships: [
        { from: "Qualifier", to: "Prelim", relationship: "userChoice", configurable: true },
        { from: "Prelim", to: "Semifinal", relationship: "userChoice", configurable: true },
        { from: "Semifinal", to: "Final", relationship: "userChoice", configurable: true },
        { from: "Prelim", to: "Final", relationship: "userChoice", configurable: true },
      ],
      events: [
        ...juniorEvents(["Qualifier", "Prelim", "Semifinal", "Final"], { platform: true, synchro: true, groups: ["Group A", "Group B", "Group C", "Group D"] }),
        ...seniorIndividual(["Qualifier", "Prelim", "Semifinal", "Final"]),
        ...seniorSynchro(["Qualifier", "Prelim", "Semifinal", "Final"]),
      ],
    },
  };

  function cloneProfile(profile) {
    const cloned = JSON.parse(JSON.stringify({ ...profile, timingDefaults: defaultTiming, advancementDefaults }));
    cloned.events = (cloned.events || []).map(applyTimingTemplateToPreset);
    return cloned;
  }

  function makeInitialState() {
    const today = new Date();
    const days = [0, 1, 2, 3].map((offset) => {
      const next = new Date(today);
      next.setDate(today.getDate() + offset);
      return {
        id: `day-${offset + 1}`,
        date: next.toISOString().slice(0, 10),
        openMinutes: parseTime("07:00"),
        closeMinutes: parseTime("20:00"),
      };
    });
    return {
      updatedAt: new Date().toISOString(),
      meet: {
        name: "USA Diving Schedule Builder",
        venue: "Competition Pool",
        timezone: "America/New_York",
        meetType: "custom",
        canvaUrl: "",
        days,
      },
      profile: cloneProfile(meetProfiles.custom),
      sessions: [],
      entryDefaults: {},
      splitDefaults: {},
      duplicateMessage: "",
      selectedEventId: meetProfiles.custom.events[0].id,
      selectedRound: meetProfiles.custom.events[0].allowedRounds[0] || "Prelim",
      combineSessionId: "",
      outputSettings: { publicShowWarmups: true, publicShowOpenPracticeNotes: true, publicPreset: "clean", showEndTimes: true, showSubjectToChange: true },
      theme: "classic",
      entryMode: "projected",
      projectedEntryDefaults: {},
      actualEntryDefaults: {},
      locks: { entries: false, sessionOrder: false },
      publishStatus: "draft",
      releasedAt: "",
      currentLibraryId: "",
      scheduleNotes: [],
      exceptions: [],
    };
  }

  let state = loadState();

  function normalizeLoadedState(loaded) {
    if (!loaded || !loaded.meet || !loaded.profile || !Array.isArray(loaded.sessions)) return makeInitialState();
    loaded.profile = cloneProfile(meetProfiles[loaded.meet.meetType] || loaded.profile);
    loaded.selectedEventId = loaded.selectedEventId || loaded.profile.events[0]?.id || "";
    loaded.selectedRound = loaded.selectedRound || loaded.profile.allowedRounds[0] || "Final";
    loaded.combineSessionId = loaded.combineSessionId || "";
    loaded.entryDefaults = loaded.entryDefaults || {};
    loaded.splitDefaults = loaded.splitDefaults || {};
    loaded.duplicateMessage = loaded.duplicateMessage || "";
    loaded.updatedAt = loaded.updatedAt || loaded.meet.updatedAt || new Date().toISOString();
    loaded.meet.canvaUrl = loaded.meet.canvaUrl || "";
    loaded.meet.days = (loaded.meet.days || []).map((day) => ({ ...day, locked: Boolean(day.locked) }));
    loaded.outputSettings = { publicShowWarmups: true, publicShowOpenPracticeNotes: true, publicPreset: "clean", showEndTimes: true, showSubjectToChange: true, ...(loaded.outputSettings || {}) };
    loaded.theme = loaded.theme || "classic";
    loaded.entryMode = loaded.entryMode || "projected";
    loaded.projectedEntryDefaults = loaded.projectedEntryDefaults || loaded.entryDefaults || {};
    loaded.actualEntryDefaults = loaded.actualEntryDefaults || {};
    loaded.entryDefaults = activeEntryDefaultsForState(loaded);
    loaded.locks = loaded.locks || { entries: false, sessionOrder: false };
    loaded.publishStatus = loaded.publishStatus || "draft";
    loaded.releasedAt = loaded.releasedAt || "";
    loaded.currentLibraryId = loaded.currentLibraryId || "";
    loaded.scheduleNotes = Array.isArray(loaded.scheduleNotes) ? loaded.scheduleNotes : [];
    loaded.exceptions = Array.isArray(loaded.exceptions) ? loaded.exceptions : [];
    if (!TIME_ZONE_OPTIONS.some((option) => option.value === loaded.meet.timezone)) loaded.meet.timezone = "America/New_York";
    if (!loaded.profile.events.some((event) => event.id === loaded.selectedEventId)) loaded.selectedEventId = loaded.profile.events[0]?.id || "";
    loaded.sessions.forEach((session) => {
      session.collapsed = Boolean(session.collapsed);
      session.isOpenPracticeSession = Boolean(session.isOpenPracticeSession);
      session.events = (session.events || []).map((event) => normalizeScheduledEvent(event));
    });
    return loaded;
  }

  function normalizeScheduledEvent(event) {
    const template = timingTemplateForPreset(event);
    const defaultDives = Number(event.defaultNumberOfDives ?? template?.dives ?? event.defaultDives ?? event.numberOfDives ?? 0);
    const manualSplit = Boolean(event.manualSplit) && !isPlatformEvent(event);
    return {
      ...event,
      eventGroupId: event.eventGroupId || id("group"),
      defaultNumberOfDives: defaultDives,
      numberOfDives: Number(event.numberOfDives ?? defaultDives),
      numberOfDivesLocked: event.round === "Custom Block" ? false : event.numberOfDivesLocked !== false,
      secondsPerDive: Number(event.secondsPerDive ?? template?.secondsPerDive ?? defaultTiming.secondsPerDive),
      defaultWarmupMinutes: event.defaultWarmupMinutes ?? template?.warmupMinutes ?? defaultTiming.warmupMinutes,
      numberOfPanelChanges: manualSplit ? Number(event.numberOfPanelChanges || 0) : 0,
      minutesPerPanelChange: Number(event.minutesPerPanelChange ?? defaultTiming.panelChangeMinutes),
      customDurationMinutes: Number(event.customDurationMinutes || 0),
      detailsOpen: event.detailsOpen !== false,
      manualSplit,
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
      if (saved && saved.meet && saved.profile && Array.isArray(saved.sessions)) return normalizeLoadedState(saved);
    } catch {
      // Ignore malformed local storage.
    }
    return makeInitialState();
  }

  function saveState() {
    const now = new Date().toISOString();
    state.updatedAt = now;
    if (state.meet) state.meet.updatedAt = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }


  function rawSavedScheduleLibrary() {
    // Synchronous: return localStorage immediately (fast, always works)
    // GitHub sync runs in background and calls refreshLibraryIfOpen() when done
    try {
      const parsed = JSON.parse(localStorage.getItem(SCHEDULE_LIBRARY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // Background GitHub sync — pulls shared schedules and merges with local
  async function syncLibraryFromGitHub() {
    if (!window.ScheduleSync) return;
    try {
      const remote = await window.ScheduleSync.loadSchedules();
      if (!remote.length) return;
      const local = rawSavedScheduleLibrary();
      const localIds = new Set(local.map(s => s.id));
      // Merge: remote schedules not in local get added
      const merged = [...local];
      remote.forEach(r => { if (!localIds.has(r.id)) merged.push(r); });
      if (merged.length !== local.length) {
        localStorage.setItem(SCHEDULE_LIBRARY_KEY, JSON.stringify(merged.filter(s => !s.builtIn).slice(0, 50)));
        if (typeof refreshLibraryUI === 'function') refreshLibraryUI();
      }
    } catch(e) { console.warn('[schedule-sync] pull failed:', e); }
  }

  // Call on app load — background, non-blocking
  setTimeout(() => syncLibraryFromGitHub(), 1500);

  function savedScheduleLibrary() {
    const local = rawSavedScheduleLibrary();
    const localKeys = new Set(local.map((item) => `${String(item.id || "").toLowerCase()}|${String(item.name || "").toLowerCase()}`));
    const localNames = new Set(local.map((item) => String(item.name || "").toLowerCase()));
    const builtIns = (BUILT_IN_SCHEDULE_LIBRARY || []).filter((item) => {
      const key = `${String(item.id || "").toLowerCase()}|${String(item.name || "").toLowerCase()}`;
      return !localKeys.has(key) && !localNames.has(String(item.name || "").toLowerCase());
    });
    return [...local, ...builtIns].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  function writeScheduleLibrary(items) {
    const clean = (items || []).filter((item) => !item.builtIn).slice(0, 50);
    localStorage.setItem(SCHEDULE_LIBRARY_KEY, JSON.stringify(clean));
    // Push each new/updated schedule to GitHub in background
    if (window.ScheduleSync) {
      clean.forEach(item => {
        if (item && item.id) {
          window.ScheduleSync.saveSchedule(item).catch(e =>
            console.warn('[schedule-sync] save failed for', item.id, e)
          );
        }
      });
    }
  }

  // Called by syncLibraryFromGitHub after merge
  function refreshLibraryUI() {
    try {
      // Re-render the library panel if it's open
      if (typeof actions !== 'undefined' && typeof actions.refreshLibrary === 'function') {
        actions.refreshLibrary();
      } else {
        // Fallback: trigger a soft re-render via state update
        const el = document.querySelector('.schedule-library-panel, .library-panel, [data-panel="library"]');
        if (el) el.dispatchEvent(new CustomEvent('library-updated'));
      }
    } catch(e) {}
  }

  function uniqueScheduleName(base, library) {
    const cleanBase = String(base || scheduleSnapshotName()).trim() || scheduleSnapshotName();
    const used = new Set((library || []).map((item) => String(item.name || "").toLowerCase()));
    if (!used.has(cleanBase.toLowerCase())) return cleanBase;
    let counter = 2;
    while (used.has(`${cleanBase} v${counter}`.toLowerCase())) counter += 1;
    return `${cleanBase} v${counter}`;
  }

  function scheduleSnapshotName() {
    const base = String(state.meet?.name || "USA Diving Schedule").trim() || "USA Diving Schedule";
    return base;
  }

  function schedulePackageId() {
    if (!state.schedulePackageId) state.schedulePackageId = state.currentLibraryId || id("schedule");
    return state.schedulePackageId;
  }

  function buildSchedulePackage() {
    const now = new Date().toISOString();
    const snapshot = JSON.parse(JSON.stringify(state));
    snapshot.schedulePackageId = snapshot.schedulePackageId || schedulePackageId();
    snapshot.updatedAt = snapshot.updatedAt || now;
    if (snapshot.meet) snapshot.meet.updatedAt = snapshot.meet.updatedAt || snapshot.updatedAt;
    return {
      packageType: "USA_DIVING_SCHEDULE_PACKAGE",
      packageVersion: 1,
      appBuild: "Standalone Schedule Builder - Share Package",
      exportedAt: now,
      scheduleId: snapshot.schedulePackageId,
      scheduleName: snapshot.meet?.name || scheduleSnapshotName(),
      scheduleUpdatedAt: snapshot.updatedAt || now,
      publishStatus: snapshot.publishStatus || "draft",
      timezone: snapshot.meet?.timezone || "America/New_York",
      schedule: snapshot,
    };
  }

  function packageFilename() {
    return `${filenameBase()}-${new Date().toISOString().slice(0, 10)}.usadiving-schedule`;
  }

  function parseSchedulePackage(parsed) {
    if (parsed?.packageType === "USA_DIVING_SCHEDULE_PACKAGE" && parsed.schedule) return parsed;
    if (parsed?.meet && parsed?.profile && Array.isArray(parsed.sessions)) {
      return {
        packageType: "USA_DIVING_SCHEDULE_PACKAGE",
        packageVersion: 1,
        exportedAt: new Date().toISOString(),
        scheduleId: parsed.schedulePackageId || parsed.currentLibraryId || id("imported"),
        scheduleName: parsed.meet?.name || "Imported Schedule",
        scheduleUpdatedAt: parsed.updatedAt || parsed.meet?.updatedAt || new Date().toISOString(),
        publishStatus: parsed.publishStatus || "draft",
        timezone: parsed.meet?.timezone || "America/New_York",
        schedule: parsed,
      };
    }
    return null;
  }

  function importSchedulePackage(pkg, options = {}) {
    const imported = normalizeLoadedState(JSON.parse(JSON.stringify(pkg.schedule)));
    imported.schedulePackageId = pkg.scheduleId || imported.schedulePackageId || id("schedule");
    imported.importedFromPackageAt = new Date().toISOString();
    imported.currentLibraryId = "";
    const matching = savedScheduleLibrary().find((item) => {
      const sched = item.schedule || {};
      return (sched.schedulePackageId && sched.schedulePackageId === imported.schedulePackageId) || String(item.name || "").toLowerCase() === String(pkg.scheduleName || imported.meet?.name || "").toLowerCase();
    });
    if (matching && !options.skipConflictCheck) {
      const localTime = new Date(matching.updatedAt || matching.schedule?.updatedAt || 0).getTime();
      const packageTime = new Date(pkg.scheduleUpdatedAt || imported.updatedAt || 0).getTime();
      if (localTime > packageTime) {
        const ok = window.confirm(`This shared schedule appears older than your saved copy of "${matching.name}". Open it anyway as a new copy?`);
        if (!ok) return null;
      } else {
        const ok = window.confirm(`A saved schedule named "${matching.name}" already exists in this browser. Import the shared schedule as a new copy?`);
        if (!ok) return null;
      }
    }
    state = imported;
    state.currentLibraryId = "";
    saveState();
    const item = saveNamedSchedule(pkg.scheduleName || imported.meet?.name || "Imported Schedule", { mode: "newVersion" });
    scheduleLibraryOpen = true;
    return item;
  }

  function saveNamedSchedule(name, options = {}) {
    const library = rawSavedScheduleLibrary();
    const visibleLibrary = savedScheduleLibrary();
    const now = new Date().toISOString();
    const mode = options.mode || "updateByName";
    let finalName = String(name || scheduleSnapshotName()).trim() || scheduleSnapshotName();
    if (mode === "newVersion") finalName = uniqueScheduleName(finalName, visibleLibrary);
    const currentId = options.targetId || state.currentLibraryId || "";
    const itemId = currentId && mode !== "newVersion" ? currentId : id("saved");
    if (!state.schedulePackageId) state.schedulePackageId = itemId;
    const item = {
      id: itemId,
      name: finalName,
      updatedAt: now,
      schedule: JSON.parse(JSON.stringify({ ...state, currentLibraryId: currentId || "", schedulePackageId: state.schedulePackageId || itemId })),
    };
    item.schedule.currentLibraryId = item.id;
    item.schedule.schedulePackageId = item.schedule.schedulePackageId || item.id;
    item.schedule.updatedAt = now;
    if (item.schedule.meet) item.schedule.meet.updatedAt = now;
    let existingIndex = -1;
    if (mode !== "newVersion" && item.id) existingIndex = library.findIndex((entry) => entry.id === item.id);
    if (existingIndex < 0 && mode !== "newVersion") existingIndex = library.findIndex((entry) => String(entry.name || "").toLowerCase() === finalName.toLowerCase());
    if (existingIndex >= 0) library[existingIndex] = item;
    else library.unshift(item);
    state.currentLibraryId = item.id;
    state.updatedAt = now;
    if (state.meet) state.meet.updatedAt = now;
    writeScheduleLibrary(library);
    saveState();
    return item;
  }

  function duplicateLibraryItem(item, name) {
    const library = rawSavedScheduleLibrary();
    const visible = savedScheduleLibrary();
    const now = new Date().toISOString();
    const copyName = uniqueScheduleName(name || `${item.name || "Schedule"} Copy`, visible);
    const copy = {
      id: id("saved"),
      name: copyName,
      updatedAt: now,
      schedule: normalizeLoadedState(JSON.parse(JSON.stringify(item.schedule))),
    };
    copy.schedule.currentLibraryId = copy.id;
    copy.schedule.publishStatus = "draft";
    copy.schedule.updatedAt = now;
    if (copy.schedule.meet) copy.schedule.meet.updatedAt = now;
    library.unshift(copy);
    writeScheduleLibrary(library);
    return copy;
  }

  function normalizeCanvaUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^www\./i.test(raw)) return `https://${raw}`;
    return "";
  }

  function openCanvaUrl() {
    const savedUrl = normalizeCanvaUrl(state.meet?.canvaUrl || "");
    if (savedUrl) {
      window.open(savedUrl, "_blank", "noopener");
      return;
    }
    const pasted = window.prompt("Paste the Canva design/template URL to link it to this schedule. Leave blank to open Canva home.", "");
    if (pasted === null) return;
    const url = normalizeCanvaUrl(pasted);
    if (url) {
      state.meet.canvaUrl = url;
      saveState();
      render();
      window.open(url, "_blank", "noopener");
      return;
    }
    window.open("https://www.canva.com/", "_blank", "noopener");
  }

  function update(mutator) {
    if (state.publishStatus === "published" && !publishedEditBypass) {
      const ok = window.confirm("This schedule is marked Published. Continue editing? If you continue, the schedule will return to Draft so shared/exported copies are not confused with the new working version.");
      if (!ok) return;
      state.publishStatus = "draft";
    }
    mutator(state);
    saveState();
    render();
  }

  function calculateEventDuration(event) {
    if (Number(event.customDurationMinutes || 0) > 0) {
      const eventMinutes = Math.max(0, Number(event.customDurationMinutes || 0));
      return {
        totalDives: 0,
        rawEventMinutes: eventMinutes,
        competitiveMinutes: eventMinutes,
        splitSavingsMinutes: 0,
        panelChangeMinutes: 0,
        eventMinutes,
        splitLanes: 1,
      };
    }
    const totalDives = Math.max(0, Number(event.numberOfDivers || 0)) * Math.max(0, Number(event.numberOfDives || 0));
    const rawEventMinutes = (totalDives * Math.max(0, Number(event.secondsPerDive || 0))) / 60;
    const splitActive = Boolean(event.manualSplit) && !isPlatformEvent(event);
    const competitiveMinutes = splitActive ? rawEventMinutes / 2 : rawEventMinutes;
    const panelCount = splitActive ? Math.max(0, Number(event.numberOfPanelChanges || 0)) : 0;
    const panelChangeMinutes = panelCount * Math.max(0, Number(event.minutesPerPanelChange || 0));
    return {
      totalDives,
      rawEventMinutes,
      competitiveMinutes,
      splitSavingsMinutes: splitActive ? rawEventMinutes / 2 : 0,
      panelChangeMinutes,
      eventMinutes: competitiveMinutes + panelChangeMinutes,
      splitLanes: splitActive ? 2 : 1,
    };
  }

  function getEventGroups(session) {
    const groups = [];
    const seen = new Map();
    session.events.forEach((event) => {
      if (!event.eventGroupId) event.eventGroupId = id("group");
      if (!seen.has(event.eventGroupId)) {
        const group = { id: event.eventGroupId, events: [] };
        seen.set(event.eventGroupId, group);
        groups.push(group);
      }
      seen.get(event.eventGroupId).events.push(event);
    });
    return groups;
  }

  function sessionHasFinals(session) {
    return (session.events || []).some((event) => event.round === "Final");
  }

  function sessionAwardsEnabled(session) {
    return sessionHasFinals(session) && session.awardsEnabled !== false;
  }

  function awardsEventLabel(events) {
    const unique = [...new Set((events || []).map((event) => String(event || "").trim()).filter(Boolean))];
    return unique.length ? `Awards: ${unique.join("; ")}` : "Awards";
  }

  function openPracticeTimelineLabel(event) {
    const title = String(event?.blockTitle || event?.style || "Open Practice").trim() || "Open Practice";
    const note = String(event?.notes || "").trim();
    if (!note || /^(open practice block|full-day open practice|open practice|restricted training|open training|break|awards|custom block|custom schedule note)\.?$/i.test(note)) return title;
    return `${title} - ${note}`;
  }

  function calculateSessionTiming(session) {
    const hasFinals = sessionHasFinals(session);
    const awardsEnabled = sessionAwardsEnabled(session);
    const introductionMinutes = hasFinals ? Number(state.profile.timingDefaults.introductionsMinutes ?? defaultTiming.introductionsMinutes ?? 10) : 0;
    const awardsMinutes = awardsEnabled ? Number(state.profile.timingDefaults.awardsMinutes ?? defaultTiming.awardsMinutes ?? 15) : 0;
    const introductionStartMinutes = Number(session.warmupStartMinutes) - introductionMinutes;
    const warmupEndMinutes = Number(session.warmupStartMinutes) + Number(session.warmupMinutes);
    const firstEventStartMinutes = roundUp(warmupEndMinutes + Number(session.transitionBufferMinutes), Number(session.roundingIncrementMinutes));
    const groups = getEventGroups(session);
    const events = [];
    const laneCursors = new Map();
    const laneEnds = new Map();
    groups.forEach((group) => {
      const lane = groupLaneKey(group);
      const groupStart = laneCursors.has(lane) ? laneCursors.get(lane) : firstEventStartMinutes;
      const timedGroupEvents = group.events.map((event) => {
        const duration = calculateEventDuration(event);
        return {
          scheduleEventId: event.scheduleEventId,
          eventGroupId: group.id,
          lane,
          laneLabel: eventLaneLabel(event),
          ...duration,
          eventStartMinutes: groupStart,
          eventEndMinutes: groupStart + duration.eventMinutes,
        };
      });
      const groupEnd = timedGroupEvents.reduce((latest, event) => Math.max(latest, event.eventEndMinutes), groupStart);
      events.push(...timedGroupEvents);
      laneEnds.set(lane, Math.max(laneEnds.get(lane) || firstEventStartMinutes, groupEnd));
      laneCursors.set(lane, roundUp(groupEnd + Number(session.transitionBufferMinutes), Number(session.roundingIncrementMinutes)));
    });
    return {
      sessionId: session.id,
      warmupStartMinutes: session.warmupStartMinutes,
      warmupEndMinutes,
      eventStartMinutes: firstEventStartMinutes,
      competitiveEndMinutes: events.reduce((latest, event) => Math.max(latest, event.eventEndMinutes), firstEventStartMinutes),
      sessionEndMinutes: events.reduce((latest, event) => Math.max(latest, event.eventEndMinutes), firstEventStartMinutes) + awardsMinutes,
      introductionMinutes,
      introductionStartMinutes,
      awardsMinutes,
      awardsEnabled,
      awardsStartMinutes: events.reduce((latest, event) => Math.max(latest, event.eventEndMinutes), firstEventStartMinutes),
      awardsEndMinutes: events.reduce((latest, event) => Math.max(latest, event.eventEndMinutes), firstEventStartMinutes) + awardsMinutes,
      laneEnds: Object.fromEntries(laneEnds.entries()),
      events,
    };
  }

  function isManualScheduleBlock(session) {
    return Boolean(session?.isOpenPracticeSession || session?.autoTrainingForDayId);
  }

  function cascadeDayTimeline(sessions) {
    const sorted = [...sessions].sort((a, b) => {
      const timeCompare = Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
      if (timeCompare) return timeCompare;
      const blockCompare = Number(!isManualScheduleBlock(a)) - Number(!isManualScheduleBlock(b));
      if (blockCompare) return blockCompare;
      return 0;
    });
    let cursor = sorted[0]?.warmupStartMinutes || 0;
    return sorted.map((session) => {
      const next = { ...session, events: session.events.map((event) => ({ ...event })) };
      const introMinutes = sessionHasFinals(next) ? Number(state.profile.timingDefaults.introductionsMinutes ?? defaultTiming.introductionsMinutes ?? 10) : 0;
      const earliestWarmupStart = cursor + introMinutes;
      // Practice/training/custom blocks are explicit time blocks. Do not cascade them to a new time.
      // They may affect later competition sessions, but their own entered start/end time must remain stable.
      if (!isManualScheduleBlock(next) && !next.locked && next.warmupStartMinutes < earliestWarmupStart) {
        next.warmupStartMinutes = roundUp(earliestWarmupStart, next.roundingIncrementMinutes);
      }
      next.timing = calculateSessionTiming(next);
      cursor = Math.max(cursor, next.timing.sessionEndMinutes);
      return next;
    });
  }

  function allTimedSessions() {
    return state.meet.days.flatMap((day) => cascadeDayTimeline(state.sessions.filter((session) => session.dayId === day.id)));
  }

  function sessionNumberMap(sessions = allTimedSessions()) {
    const dayOrder = new Map(state.meet.days.map((day, index) => [day.id, index]));
    const originalOrder = new Map(state.sessions.map((session, index) => [session.id, index]));
    const sorted = [...sessions].filter((session) => !session.autoTrainingForDayId && !session.isOpenPracticeSession).sort((a, b) => {
      const dayCompare = (dayOrder.get(a.dayId) ?? 999) - (dayOrder.get(b.dayId) ?? 999);
      if (dayCompare) return dayCompare;
      const timeCompare = Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
      if (timeCompare) return timeCompare;
      return (originalOrder.get(a.id) ?? 9999) - (originalOrder.get(b.id) ?? 9999);
    });
    const map = new Map();
    sorted.forEach((session, index) => map.set(session.id, index + 1));
    return map;
  }

  function sessionDisplayName(session, map = currentSessionNumberMap) {
    if (session.autoTrainingForDayId) return session.title || "Open Training";
    if (session.isOpenPracticeSession) return session.title || "Open Practice";
    const number = map.get(session.id);
    return number ? `Session ${number}` : "Session";
  }

  function eventPhaseLabel(event) {
    const base = event.round === "Custom Block" ? (event.notes || "Custom Block") : eventDisplayName(event);
    return `${base}${event.round && event.round !== "Custom Block" ? ` ${event.round}` : ""}`.trim();
  }

  function sessionEventSummary(session, max = 3) {
    if (!session.events.length) return "No events loaded";
    const labels = session.events.map(eventPhaseLabel);
    const visible = labels.slice(0, max).join(" | ");
    const extra = labels.length > max ? ` | +${labels.length - max} more` : "";
    return `${labels.length} event${labels.length === 1 ? "" : "s"}: ${visible}${extra}`;
  }

  function laneOrder(key) {
    const order = { "1m": 1, "3m": 2, platform: 3, other: 9 };
    return order[key] || 9;
  }

  function eventGroupsByLane(session) {
    const grouped = new Map();
    getEventGroups(session).forEach((group) => {
      const lane = groupLaneKey(group);
      if (!grouped.has(lane)) grouped.set(lane, []);
      grouped.get(lane).push(group);
    });
    return [...grouped.entries()].sort((a, b) => laneOrder(a[0]) - laneOrder(b[0]));
  }

  function laneSummary(session) {
    const lanes = eventGroupsByLane(session);
    if (!lanes.length) return "No board lanes";
    return lanes.map(([lane, groups]) => `${eventLaneLabelFromKey(lane)}: ${groups.reduce((sum, group) => sum + group.events.length, 0)} event${groups.reduce((sum, group) => sum + group.events.length, 0) === 1 ? "" : "s"}`).join(" | ");
  }

  function sessionTargetLabel(session, map = currentSessionNumberMap) {
    const day = state.meet.days.find((candidate) => candidate.id === session.dayId);
    const dayText = day ? shortDayLabel(day.date) : "Unassigned day";
    return `${sessionDisplayName(session, map)} | ${dayText} | ${sessionEventSummary(session, 2)}`;
  }

  function validateWarnings(timedSessions) {
    const warnings = [];
    const rawSessions = timedSessions.map(({ timing, ...session }) => session);
    const allEvents = rawSessions.flatMap((session) => session.events.map((event) => ({ ...event, sessionId: session.id, dayId: session.dayId })));
    for (const rule of state.profile.roundRelationships) {
      const toEvents = allEvents.filter((event) => event.round === rule.to);
      const fromEvents = allEvents.filter((event) => event.round === rule.from);
      for (const toEvent of toEvents) {
        const dependency = fromEvents.find((event) => sameEventFamily(event, toEvent));
        if (!dependency && rule.relationship !== "userChoice") {
          warnings.push({
            id: `dependency-${toEvent.scheduleEventId}`,
            severity: "warning",
            code: "dependency",
            message: `${toEvent.round} is scheduled without its related ${rule.from}.`,
            sessionId: toEvent.sessionId,
            scheduleEventId: toEvent.scheduleEventId,
          });
        }
        if (dependency) {
          const sameDay = dependency.dayId === toEvent.dayId;
          const issue =
            (rule.relationship === "sameDayRequired" && !sameDay) ||
            (rule.relationship === "sameDayPreferred" && !sameDay) ||
            (rule.relationship === "differentDayRequired" && sameDay);
          if (issue) {
            warnings.push({
              id: `date-${dependency.scheduleEventId}-${toEvent.scheduleEventId}`,
              severity: rule.relationship === "sameDayPreferred" ? "info" : "warning",
              code: "dateRule",
              message: relationshipMessage(rule),
              sessionId: toEvent.sessionId,
              scheduleEventId: toEvent.scheduleEventId,
            });
          }
        }
      }
    }

    const seen = new Map();
    for (const session of timedSessions) {
      const day = state.meet.days.find((candidate) => candidate.id === session.dayId);
      getEventGroups(session).forEach((group) => {
        const lanes = new Set(group.events.map(eventLaneKey));
        if (lanes.size > 1) {
          warnings.push({ id: `combined-lane-${group.id}`, severity: "warning", code: "combinedLane", message: "Combined block contains different boards; use separate lane blocks instead.", sessionId: session.id });
        }
      });
      if (session.transitionBufferMinutes < state.profile.timingDefaults.transitionBufferMinutes) {
        warnings.push({ id: `buffer-${session.id}`, severity: "warning", code: "buffer", message: "Transition buffer is below the meet default.", sessionId: session.id });
      }
      if (day && session.timing.sessionEndMinutes > day.closeMinutes) {
        warnings.push({ id: `close-${session.id}`, severity: "error", code: "pastClose", message: "Event runs past facility close.", sessionId: session.id });
      }
      for (const event of session.events) {
        if (event.round !== "Custom Block") {
          const duplicate = seen.get(event.canonicalKey);
          if (duplicate) {
            warnings.push({ id: `dup-${event.scheduleEventId}`, severity: "error", code: "duplicate", message: "Duplicate event/round selected.", sessionId: session.id, scheduleEventId: event.scheduleEventId });
          }
          seen.set(event.canonicalKey, event);
        }
        const duration = calculateEventDuration(event);
        if (!isPlatformEvent(event) && duration.totalDives >= state.profile.timingDefaults.splitThresholds.recommendTotalDives && !event.manualSplit) {
          warnings.push({ id: `split-rec-${event.scheduleEventId}`, severity: "info", code: "split", message: "Split recommendation threshold reached.", sessionId: session.id, scheduleEventId: event.scheduleEventId });
        }
        if (!isPlatformEvent(event) && event.numberOfDivers >= state.profile.timingDefaults.splitThresholds.reviewAthletes) {
          warnings.push({ id: `split-review-${event.scheduleEventId}`, severity: "warning", code: "split", message: "Split required/review warning threshold reached.", sessionId: session.id, scheduleEventId: event.scheduleEventId });
        }
      }
    }

    for (const day of state.meet.days) {
      const sessions = timedSessions.filter((session) => session.dayId === day.id).sort((a, b) => a.warmupStartMinutes - b.warmupStartMinutes);
      for (let index = 1; index < sessions.length; index += 1) {
        const previous = sessions[index - 1];
        const current = sessions[index];
        if (previous.timing.sessionEndMinutes > current.timing.warmupStartMinutes) {
          warnings.push({
            id: `overlap-${previous.id}-${current.id}`,
            severity: current.locked ? "error" : "warning",
            code: current.locked ? "lockedCascade" : "warmupOverlap",
            message: current.locked ? "Locked block prevents clean cascade." : "Warm-up overlaps active event.",
            sessionId: current.id,
          });
        }
      }

      const dayEvents = sessions.flatMap((session) => session.events.map((event) => ({ ...event, sessionId: session.id, dayId: day.id, warmupStartMinutes: session.warmupStartMinutes, timing: session.timing }))).filter((event) => event.round !== "Custom Block");
      const familyById = new Map();
      dayEvents.forEach((event) => familyById.set(`${fullEventIdentity(event)}|${event.style}`, event));
      const byCompetitorGroup = new Map();
      dayEvents.forEach((event) => {
        if (allowsSameDayMultiDiscipline(event)) return;
        const key = fullEventIdentity(event);
        if (!byCompetitorGroup.has(key)) byCompetitorGroup.set(key, new Map());
        const disciplines = byCompetitorGroup.get(key);
        if (!disciplines.has(disciplineKey(event))) disciplines.set(disciplineKey(event), []);
        disciplines.get(disciplineKey(event)).push(event);
      });
      byCompetitorGroup.forEach((disciplines, competitorGroup) => {
        if (disciplines.size > 1) {
          const names = [...disciplines.keys()].map(eventLaneLabelFromKey).join(" and ");
          const sample = [...disciplines.values()][0][0];
          warnings.push({ id: `discipline-${day.id}-${competitorGroup}`, severity: "warning", code: "disciplineDay", message: `${competitorGroup} has more than one discipline on ${dateLabel(day.date)} (${names}). Standard rule is one discipline per day except rare USA/Winter Nationals qualifier scenarios.`, sessionId: sample.sessionId });
        }
      });
    }

    const dayIndexById = new Map(state.meet.days.map((day, index) => [day.id, index]));
    const prelimLike = allEvents.filter((event) => ["Prelim", "Semifinal"].includes(event.round));
    const finals = allEvents.filter((event) => event.round === "Final");
    finals.forEach((finalEvent) => {
      const dependency = prelimLike.find((event) => sameEventFamily(event, finalEvent));
      if (!dependency) return;
      const depDay = dayIndexById.get(dependency.dayId) ?? 0;
      const finalDay = dayIndexById.get(finalEvent.dayId) ?? 0;
      if (finalDay < depDay) {
        warnings.push({ id: `final-order-${finalEvent.scheduleEventId}`, severity: "error", code: "finalsOrder", message: `Final is scheduled before its ${dependency.round}. Move finals after prelim/semi sessions.`, sessionId: finalEvent.sessionId, scheduleEventId: finalEvent.scheduleEventId });
      }
    });

    rawSessions.forEach((session) => {
      (session.events || []).forEach((event) => {
        if (isPlatformEvent(event) && event.manualSplit) {
          warnings.push({ id: `platform-split-${event.scheduleEventId}`, severity: "error", code: "platformSplit", message: "Platform events cannot be split. Combine platform age groups/events only when appropriate.", sessionId: session.id, scheduleEventId: event.scheduleEventId });
        }
      });
    });
    return warnings;
  }

  function sameEventFamily(a, b) {
    return a.level === b.level && a.gender === b.gender && a.apparatus === b.apparatus && a.style === b.style;
  }

  function relationshipMessage(rule) {
    if (rule.relationship === "sameDayRequired") return `${rule.from} and ${rule.to} must be on the same day.`;
    if (rule.relationship === "sameDayPreferred") return `${rule.from} and ${rule.to} are preferred on the same day.`;
    if (rule.relationship === "differentDayRequired") return `${rule.from} and ${rule.to} must be on different days.`;
    return `${rule.from} and ${rule.to} date relationship should be reviewed.`;
  }

  function entryDefaultKey(preset, round) {
    return eventKey(preset, round);
  }

  function defaultDiversForPresetRound(preset, round, profile = state.profile) {
    if (round === "Final") return 12;
    const key = entryDefaultKey(preset, round);
    const value = Number(entryValueForKey(key));
    if (Number.isFinite(value) && value >= 0) return value;
    return Number(profile?.timingDefaults?.defaultDivers || 24);
  }

  function defaultSplitForPresetRound(preset, round) {
    if (isPlatformEvent(preset)) return false;
    const key = entryDefaultKey(preset, round);
    return Boolean(state.splitDefaults?.[key]);
  }

  function isJuniorEvent(event) {
    const level = String(event?.level || "");
    return /^Group\s+[A-D]\b/i.test(level);
  }

  function defaultPanelChangesForSplit(event) {
    return Boolean(event?.manualSplit) && isJuniorEvent(event) && !isPlatformEvent(event) ? 2 : 0;
  }

  function bulkEntryRows() {
    return state.profile.events
      .flatMap((preset) => (preset.allowedRounds || [])
        .filter((round) => ["Qualifier", "Prelim"].includes(round) && state.profile.allowedRounds.includes(round))
        .map((round) => ({ preset, round, key: entryDefaultKey(preset, round) })))
      .sort((a, b) => {
        const nameDelta = eventDisplayName(a.preset).localeCompare(eventDisplayName(b.preset), undefined, { sensitivity: "base" });
        if (nameDelta) return nameDelta;
        return a.round.localeCompare(b.round);
      });
  }

  function createScheduledEvent(preset, round, profile = state.profile) {
    const templated = applyTimingTemplateToPreset(preset);
    const manualSplit = defaultSplitForPresetRound(templated, round);
    const scheduled = {
      ...templated,
      scheduleEventId: id("event"),
      eventGroupId: id("group"),
      round,
      canonicalKey: eventKey(templated, round),
      numberOfDivers: defaultDiversForPresetRound(templated, round, profile),
      defaultNumberOfDives: templated.defaultDives,
      numberOfDives: templated.defaultDives,
      numberOfDivesLocked: round === "Custom Block" ? false : true,
      secondsPerDive: profile.timingDefaults.secondsPerDive ?? templated.defaultSecondsPerDive ?? defaultTiming.secondsPerDive,
      secondsPerDiveLocked: profile.timingDefaults.secondsPerDiveLocked,
      numberOfPanelChanges: 0,
      minutesPerPanelChange: profile.timingDefaults.panelChangeMinutes,
      manualSplit,
      detailsOpen: true,
      ...profile.advancementDefaults,
    };
    scheduled.numberOfPanelChanges = defaultPanelChangesForSplit(scheduled);
    return scheduled;
  }

  function createSession(event, dayIdOverride) {
    const requestedDayId = String(dayIdOverride || "");
    const dayId = state.meet.days.some((candidate) => candidate.id === requestedDayId) ? requestedDayId : (state.meet.days[0]?.id || "day-1");
    const day = state.meet.days.find((candidate) => candidate.id === dayId);
    const daySessionCount = state.sessions.filter((session) => session.dayId === dayId).length;
    return {
      id: id("session"),
      dayId,
      title: "Session",
      warmupStartMinutes: roundUp((day?.openMinutes || parseTime("08:00")) + daySessionCount * 95, state.profile.timingDefaults.roundingIncrementMinutes),
      warmupMinutes: state.profile.timingDefaults.warmupMinutes ?? event.defaultWarmupMinutes ?? defaultTiming.warmupMinutes,
      transitionBufferMinutes: state.profile.timingDefaults.transitionBufferMinutes,
      roundingIncrementMinutes: state.profile.timingDefaults.roundingIncrementMinutes,
      locked: false,
      collapsed: false,
      awardsEnabled: true,
      events: [event],
    };
  }

  function render() {
    const timedSessions = allTimedSessions();
    currentSessionNumberMap = sessionNumberMap(timedSessions);
    const warnings = validateWarnings(timedSessions);
    const app = document.getElementById("app");
    app.innerHTML = `
      <header class="app-header">
        <div class="brand-lockup">
          <img src="assets/usa-diving-horizontal-color.png" alt="USA Diving" />
          <div>
            <h1>Schedule Builder</h1>
            <p>${escapeHtml(state.meet.name||'New Schedule')}</p>
          </div>
        </div>
        ${renderProgressSteps(timedSessions, warnings)}
        <div class="header-actions">
          <button class="text-button" onclick="actions.newSchedule()">New</button>
          <button class="text-button" onclick="actions.openEntryManager()">Entries</button>
          <button class="text-button" onclick="actions.openResetWorkspace()">Reset</button>
          <input class="hidden" id="jsonLoader" type="file" accept="application/json" onchange="actions.loadJson(this.files[0])" />
          <input class="hidden" id="packageLoader" type="file" accept=".usadiving-schedule,.schedule,.json,application/json" onchange="actions.openSharedSchedulePackage(this.files[0]); this.value=''" />
          <button class="primary-button compact-primary" onclick="actions.releaseCurrentSchedule()">Release</button>
        </div>
      </header>
      <main class="app-main">
        <div class="sb-left-rail">
          ${renderSidebarNav()}
          <div class="sb-tab-body" id="sbTabBody">
            ${renderSidebarTabContent(timedSessions, warnings)}
          </div>
        </div>
        <section class="workspace">
          <div class="sb-board-wrap">
            ${renderCommandCenter(timedSessions, warnings)}
            ${renderBuildChecklist(timedSessions, warnings)}
            ${renderScheduleSetupSummary(timedSessions, warnings)}
            ${renderBoard(timedSessions, warnings)}
          </div>
          ${renderPreview(timedSessions)}
        </section>
      </main>
      ${entryManagerOpen ? renderEntryManager() : ""}
      ${scheduleBlockPlanner ? renderScheduleBlockPlanner(timedSessions) : ""}
      ${scheduleLibraryOpen ? renderScheduleLibraryModal() : ""}
      ${releaseModeOpen ? renderReleaseModal(timedSessions, warnings) : ""}
      ${resetWorkspaceOpen ? renderResetWorkspaceModal() : ""}
      ${notesManagerOpen ? renderNotesManagerModal(timedSessions) : ""}
      ${duplicateDayPlanner ? renderDuplicateDayModal() : ""}
    `;
    afterRender();
  }

  function renderCommandCenter(timedSessions, warnings) {
    const activeWarnings = (warnings || []).filter((warning) => !isWarningAcknowledged(warning));
    const unsaved = "Current workspace";
    let nextLabel = "Release Schedule";
    let nextAction = "actions.releaseCurrentSchedule()";
    if (!Object.keys(activeEntryDefaultsForState(state)).length) { nextLabel = "Set Entries"; nextAction = "actions.openEntryManager()"; }
    else if (activeWarnings.length) { nextLabel = "Review Warnings"; nextAction = "actions.toggleScheduleHealth()"; }
    else if (state.publishStatus === "draft") { nextLabel = "Set Publish Status"; nextAction = "actions.releaseCurrentSchedule()"; }
    const theme = activeTheme();
    return `
      <section class="command-center-panel">
        <div class="command-center-copy">
          <span class="summary-kicker">Command center</span>
          <h2>${escapeHtml(state.meet.name || "Untitled schedule")}</h2>
          <p>${timedSessions.length} session/block${timedSessions.length === 1 ? "" : "s"} · ${activeWarnings.length} active health item${activeWarnings.length === 1 ? "" : "s"} · ${escapeHtml(publishStatusLabel())} · ${escapeHtml(formatUpdatedStamp())}</p>
        </div>
        <div class="command-center-actions">
          <label>Color template
            <select onchange="actions.setTheme(this.value)">
              ${Object.entries(COLOR_THEMES).map(([value, item]) => `<option value="${value}" ${value === (state.theme || "classic") ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
            </select>
          </label>
          <button class="primary-button compact-primary" onclick="${nextAction}">${escapeHtml(nextLabel)}</button>
        </div>
      </section>
    `;
  }

  function renderBuildChecklist(timedSessions, warnings) {
    const hasMeet = Boolean(String(state.meet?.name || "").trim()) && Boolean(String(state.meet?.venue || "").trim());
    const hasTemplate = Boolean(state.meet?.meetType);
    const hasEntries = Object.keys(state.entryDefaults || {}).length > 0;
    const hasSchedule = timedSessions.length > 0;
    const activeWarnings = warnings.filter((warning) => !isWarningAcknowledged(warning));
    const hasPublicReview = previewMode === "public" || state.publishStatus === "published" || state.publishStatus === "ready";
    const savedCount = savedScheduleLibrary().length;
    const items = [
      { label: "Meet setup", done: hasMeet, action: "actions.focusMeetSetup()" },
      { label: "Template selected", done: hasTemplate, action: "actions.focusMeetSetup()" },
      { label: "Entries set", done: hasEntries, action: "actions.openEntryManager()" },
      { label: "Schedule built", done: hasSchedule, action: "actions.focusBuilder()" },
      { label: "Health reviewed", done: !activeWarnings.length && hasSchedule, action: "actions.toggleScheduleHealth()" },
      { label: "Public output reviewed", done: hasPublicReview, action: "actions.setPreview('public')" },
      { label: "Saved / publish status set", done: savedCount > 0 || state.publishStatus !== "draft", action: "actions.openScheduleLibrary()" },
    ];
    const completed = items.filter((item) => item.done).length;
    return `
      <section class="build-checklist-panel">
        <div class="checklist-heading">
          <div><span>Build checklist</span><strong>${completed}/${items.length} complete</strong></div>
          <div class="publish-control"><label>Status <select onchange="actions.setPublishStatus(this.value)">${publishStatusOptions()}</select></label><button class="text-button small" onclick="actions.openNotesManager()">Notes</button><button class="primary-button tiny-primary" onclick="actions.releaseCurrentSchedule()">Release</button></div>
        </div>
        <div class="checklist-grid">
          ${items.map((item) => `<button type="button" class="checklist-item ${item.done ? "done" : "todo"}" onclick="${item.action}"><span>${item.done ? "✓" : "•"}</span>${escapeHtml(item.label)}</button>`).join("")}
        </div>
      </section>
    `;
  }

  function scheduleDateRangeLabel() {
    const days = state.meet.days || [];
    if (!days.length) return "No dates set";
    const first = fullDayName(days[0]);
    const last = fullDayName(days[days.length - 1]);
    return first === last ? first : `${first} – ${last}`;
  }

  function activeHealthCounts(warnings) {
    const active = (warnings || []).filter((warning) => !isWarningAcknowledged(warning));
    return {
      errors: active.filter((warning) => warning.severity === "error").length,
      warnings: active.filter((warning) => warning.severity === "warning").length,
      notes: active.filter((warning) => warning.severity === "info").length,
      exceptions: (warnings || []).filter((warning) => isWarningAcknowledged(warning)).length,
    };
  }

  function renderScheduleSetupSummary(timedSessions, warnings) {
    const counts = activeHealthCounts(warnings);
    const openBlocks = timedSessions.filter((session) => session.isOpenPracticeSession || session.autoTrainingForDayId).length;
    const competitionSessions = timedSessions.filter((session) => !session.isOpenPracticeSession && !session.autoTrainingForDayId).length;
    const profile = meetProfiles[state.meet.meetType] || state.profile || {};
    return `
      <section class="setup-summary-card" id="scheduleSetupSummary">
        <div class="setup-summary-main">
          <span class="summary-kicker">Current schedule</span>
          <strong>${escapeHtml(state.meet.name || "Untitled schedule")}</strong>
          <small>${escapeHtml(scheduleDateRangeLabel())} · ${escapeHtml(selectedTimeZoneOption().label)}</small>
        </div>
        <div class="summary-metric"><span>Template</span><strong>${escapeHtml(profile.label || state.meet.meetType || "Custom")}</strong></div>
        <div class="summary-metric"><span>Competition sessions</span><strong>${competitionSessions}</strong></div>
        <div class="summary-metric"><span>Practice / blocks</span><strong>${openBlocks}</strong></div>
        <div class="summary-metric"><span>Status</span><strong>${escapeHtml(publishStatusLabel())}</strong></div>
        <div class="summary-metric ${counts.errors || counts.warnings ? "needs-review" : "clear"}"><span>Health</span><strong>${counts.errors ? `${counts.errors} error${counts.errors === 1 ? "" : "s"}` : counts.warnings ? `${counts.warnings} warning${counts.warnings === 1 ? "" : "s"}` : "Clear"}</strong><em>${counts.exceptions} exception${counts.exceptions === 1 ? "" : "s"}</em></div>
      </section>`;
  }

  function renderReleaseModal(timedSessions, warnings) {
    const counts = activeHealthCounts(warnings);
    const scheduleName = scheduleSnapshotName();
    const notesCount = (state.scheduleNotes || []).length;
    return `
      <div class="modal-backdrop release-backdrop" role="dialog" aria-modal="true">
        <section class="release-modal">
          <div class="library-hero release-hero">
            <div><span>Release Mode</span><h2>Preflight current schedule</h2><p>Save the current version and prepare it for operations timeline, public schedule, and export review.</p></div>
            <button class="icon-button" onclick="actions.closeReleaseMode()">×</button>
          </div>
          <div class="release-check-grid">
            <div class="release-check ${state.meet?.timezone ? "ok" : "warn"}"><strong>Time zone</strong><span>${escapeHtml(selectedTimeZoneOption().label)}</span></div>
            <div class="release-check ${timedSessions.length ? "ok" : "warn"}"><strong>Schedule blocks</strong><span>${timedSessions.length} total block${timedSessions.length === 1 ? "" : "s"}</span></div>
            <div class="release-check ${counts.errors || counts.warnings ? "warn" : "ok"}"><strong>Schedule health</strong><span>${counts.errors} errors · ${counts.warnings} warnings · ${counts.exceptions} exceptions</span></div>
            <div class="release-check ${notesCount ? "ok" : "neutral"}"><strong>Notes</strong><span>${notesCount} public/operations note${notesCount === 1 ? "" : "s"}</span></div>
          </div>
          <div class="release-output-strip">
            <button onclick="actions.setPreview('timeline')">Review Operations Timeline</button>
            <button onclick="actions.setPreview('public')">Review Public Schedule</button>
            <button onclick="actions.printPreview()">Open PDF Print View</button>
          </div>
          <div class="release-name-row"><label>Release name<input id="releaseScheduleNameInput" value="${escapeHtml(scheduleName)}" /></label></div>
          <div class="modal-actions"><button class="text-button" onclick="actions.closeReleaseMode()">Cancel</button><button class="primary-button compact-primary" onclick="actions.confirmReleaseCurrentSchedule()">Save release package</button></div>
        </section>
      </div>`;
  }

  function renderResetWorkspaceModal() {
    const current = state.currentLibraryId ? "This does not delete the saved schedule unless you delete it from the library." : "No named schedule is currently linked.";
    return `
      <div class="modal-backdrop reset-backdrop" role="dialog" aria-modal="true">
        <section class="reset-modal">
          <div class="library-hero reset-hero">
            <div><span>Reset tools</span><h2>Clear only what you intend</h2><p>${escapeHtml(current)}</p></div>
            <button class="icon-button" onclick="actions.closeResetWorkspace()">×</button>
          </div>
          <div class="reset-options-grid">
            <button class="reset-option" onclick="actions.clearCurrentWorkspace()"><strong>Clear current workspace</strong><span>Start over in the active browser workspace. Saved schedules remain in the library.</span></button>
            <button class="reset-option" onclick="actions.clearEntryDefaults()"><strong>Reset entries only</strong><span>Clear saved Prelim/Qualifier entry counts and split defaults.</span></button>
            <button class="reset-option" onclick="actions.openScheduleLibrary()"><strong>Open schedule library</strong><span>Open, duplicate, rename, or delete saved schedules intentionally.</span></button>
          </div>
        </section>
      </div>`;
  }


  // ═══════════════════════════════════════════════════
  // SIDEBAR — tabbed navigation + per-tab content
  // ═══════════════════════════════════════════════════
  let _sbActiveTab = 'setup';

  function renderProgressSteps(timedSessions, warnings) {
    const activeWarnings = (warnings||[]).filter(w => !isWarningAcknowledged(w));
    const hasEvents  = (state.profile.events||[]).length > 0;
    const hasSessions = (state.sessions||[]).filter(s=>!s.autoTrainingForDayId).length > 0;
    const hasEntries = (state.sessions||[]).some(s=>(s.events||[]).some(e=>Number(e.numberOfDivers||0)>0));
    const isReleased = state.meet.publishStatus === 'published';
    const steps = [
      { label:'Setup',   done: !!(state.meet.name && state.meet.days.length) },
      { label:'Entries', done: hasEntries },
      { label:'Build',   done: hasSessions },
      { label:'Release', done: isReleased },
    ];
    let activeDone = false;
    return `<div class="sb-progress">
      ${steps.map((st,i)=>{
        const isActive = !st.done && !activeDone ? (activeDone=true,true) : false;
        const cls = st.done ? 'done' : isActive ? 'active' : '';
        return `${i>0?'<div class="sb-prog-sep"></div>':''}
        <div class="sb-prog-step ${cls}"><div class="sb-prog-dot"></div>${escapeHtml(st.label)}</div>`;
      }).join('')}
    </div>`;
  }

  function renderSidebarNav() {
    const timedSessions = allTimedSessions();
    const warnings = validateWarnings(timedSessions);
    const activeWarnings = warnings.filter(w => !isWarningAcknowledged(w));
    const tabs = [
      { id:'setup',   icon:'⚙',  label:'Meet setup'       },
      { id:'catalog', icon:'☰',  label:'Event catalog'    },
      { id:'timing',  icon:'◷',  label:'Timing profile'   },
      { id:'health',  icon:'⚡',  label:'Schedule health', badge: activeWarnings.length },
      { id:'library', icon:'⊟',  label:'Library'          },
    ];
    return `<div class="sb-tab-nav">
      ${tabs.map(t=>`
        <button class="sb-tab-btn${(window._sbActiveTab||_sbActiveTab)===t.id?' active':''}"
          onclick="actions.switchSidebarTab('${t.id}')" type="button">
          <span style="font-size:13px;flex-shrink:0">${t.icon}</span>
          ${escapeHtml(t.label)}
          ${t.badge ? `<span class="sb-tab-badge">${t.badge}</span>` : ''}
        </button>`).join('')}
    </div>`;
  }

  function renderSidebarTabContent(timedSessions, warnings) {
    switch(window._sbActiveTab||_sbActiveTab) {
      case 'catalog': return renderSidebarCatalog();
      case 'timing':  return renderSidebarTiming();
      case 'health':  return renderSidebarHealth(warnings);
      case 'library': return renderSidebarLibrary();
      default:        return renderSidebarSetup();
    }
  }

  function renderSidebarSetup() {
    const profileEntries = Object.entries(meetProfiles||{});
    const publishOpts = ['draft','published','archived'];
    return `
      <div class="sb-field">
        <span class="sb-field-label">Meet name</span>
        <input value="${escapeHtml(state.meet.name||'')}" onchange="actions.setMeet('name',this.value)">
      </div>
      <div class="sb-field">
        <span class="sb-field-label">Venue</span>
        <input value="${escapeHtml(state.meet.venue||'')}" onchange="actions.setMeet('venue',this.value)">
      </div>
      <div class="sb-field">
        <span class="sb-field-label">Timezone</span>
        <select onchange="actions.setMeet('timezone',this.value)">
          ${timeZoneSelectOptions()}
        </select>
      </div>
      <div class="sb-field">
        <span class="sb-field-label">Meet type</span>
        <select onchange="actions.setMeetType(this.value)">
          ${profileEntries.map(([k,v])=>`<option value="${escapeHtml(k)}" ${state.meet.meetType===k?'selected':''}>${escapeHtml(v.label||k)}</option>`).join('')}
        </select>
      </div>
      <div class="sb-field">
        <span class="sb-field-label">Publish status</span>
        <select onchange="actions.setMeet('publishStatus',this.value)">
          ${publishOpts.map(o=>`<option value="${o}" ${state.meet.publishStatus===o?'selected':''}>${o.charAt(0).toUpperCase()+o.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="sb-field">
        <span class="sb-field-label">Competition days</span>
        ${(state.meet.days||[]).map(day=>`
          <div class="sb-day-chip">
            <span>${escapeHtml(shortDayLabel(day.date||'')||day.date||'Day')}</span>
          </div>`).join('')}
        <button onclick="actions.addDay()" type="button" style="width:100%;margin-top:4px;height:24px;border-radius:var(--sb-r);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:var(--sb-nav-ink);font-size:10.5px;cursor:pointer">+ Add day</button>
      </div>
    `;
  }

  function renderSidebarCatalog() {
    // Use the real catalogSearch state var (same as full renderCatalog)
    const filter = (catalogSearch||state.catalogFilter||'').toLowerCase();
    const allEvents = state.profile.events||[];
    const filtered = filter ? allEvents.filter(e=>
      eventDisplayName(e).toLowerCase().includes(filter) ||
      (e.style||'').toLowerCase().includes(filter) ||
      (e.apparatus||'').toLowerCase().includes(filter)
    ) : allEvents;
    const allowedRounds = state.profile.allowedRounds||[];

    return `
      <div class="sb-field" style="margin-bottom:8px">
        <input placeholder="Search events…" value="${escapeHtml(catalogSearch||state.catalogFilter||'')}"
          oninput="actions.setCatalogSearch(this.value)">
      </div>
      ${filtered.length===0 ? '<div style="font-size:11px;color:var(--sb-nav-muted);text-align:center;padding:16px">No events match</div>' :
        filtered.map(ev => {
          const rounds = (ev.allowedRounds||[]).filter(r=>allowedRounds.includes(r));
          return `<div class="sb-cat-item">
            <div class="sb-cat-name">${escapeHtml(eventDisplayName(ev))}</div>
            <div class="sb-cat-sub">${escapeHtml(ev.style||'')}${ev.apparatus?' · '+escapeHtml(apparatusDisplay(ev.apparatus)):''}</div>
            <div class="sb-cat-pills">
              ${rounds.map(r=>`
                <button class="sb-round-pill" type="button"
                  onclick="actions.selectCatalogEvent('${escapeHtml(ev.id)}');actions.selectRound('${escapeHtml(r)}');actions.addPresetEvent();"
                  title="Add ${escapeHtml(eventDisplayName(ev))} ${escapeHtml(r)} to new session">
                  ${escapeHtml(r)}
                </button>`).join('')}
            </div>
          </div>`;
        }).join('')}
    `;
  }

  function renderSidebarTiming() {
    const td = state.profile.timingDefaults||{};
    const nf = (label,key,step=1)=>`
      <div>
        <span class="sb-field-label">${escapeHtml(label)}</span>
        <input type="number" min="0" step="${step}" value="${Number(td[key]||0)}"
          onchange="actions.setTimingDefault('${key}',this.value)">
      </div>`;
    return `
      <div class="sb-field-row sb-field">
        ${nf('Sec / dive','secondsPerDive',1)}
        ${nf('Warmup min','warmupMinutes',5)}
      </div>
      <div class="sb-field-row sb-field">
        ${nf('Buffer min','transitionBufferMinutes',1)}
        ${nf('Time grid','roundingIncrementMinutes',1)}
      </div>
      <div class="sb-field-row sb-field">
        ${nf('Awards min','awardsMinutes',1)}
        ${nf('Intros min','introductionsMinutes',1)}
      </div>
      <div class="sb-field-row sb-field">
        ${nf('Panel chg min','panelChangeMinutes',0.5)}
        ${nf('Sec/dive lock','secondsPerDive',1)}
      </div>
      <div class="sb-field">
        <span class="sb-field-label">Finals transition</span>
        <select onchange="actions.setTimingDefault('finalsTransitionMode',this.value)">
          <option value="openTransition" ${(td.finalsTransitionMode||'')===('openTransition')?'selected':''}>Open transition</option>
          <option value="noTransition" ${(td.finalsTransitionMode||'')==='noTransition'?'selected':''}>No transition</option>
        </select>
      </div>
    `;
  }

  function renderSidebarHealth(warnings) {
    const active = (warnings||[]).filter(w=>!isWarningAcknowledged(w));
    if (!active.length) return `<div style="padding:20px 8px;text-align:center;font-size:11px;color:var(--sb-nav-muted)">✓ No schedule issues</div>`;
    return active.map(w=>`
      <div class="sb-health-item ${w.severity==='error'?'err':w.severity==='info'?'info':'warn'}">
        <div class="sb-health-title">${escapeHtml(w.message||w.title||'')}</div>
        ${w.detail||w.description?`<div class="sb-health-sub">${escapeHtml(w.detail||w.description)}</div>`:''}
      </div>`).join('');
  }

  function renderSidebarLibrary() {
    // Force a fresh read in case localStorage was populated under old key
    const library = savedScheduleLibrary();
    // Debug: if library is empty, try legacy key as fallback
    if (!library.filter(i=>!i.builtIn).length) {
      const legacyKeys = Object.keys(localStorage).filter(k =>
        k.includes('schedule') || k.includes('diving') || k.includes('builder')
      );
      // Trigger a sync refresh quietly
      if (window.ScheduleSync) window.ScheduleSync.loadSchedules().then(remote => {
        if (remote && remote.length) {
          const existing = savedScheduleLibrary().map(s=>s.id);
          remote.filter(r=>!existing.includes(r.id)).forEach(r=>{
            const lib = rawSavedScheduleLibrary();
            lib.push(r);
            localStorage.setItem(SCHEDULE_LIBRARY_KEY, JSON.stringify(lib.filter(s=>!s.builtIn).slice(0,50)));
          });
          render();
        }
      }).catch(()=>{});
    }
    const userItems = library.filter(i=>!i.builtIn);
    const builtIn   = library.filter(i=> i.builtIn);
    const snapshotName = scheduleSnapshotName ? scheduleSnapshotName() : (state.meet.name||'My Schedule');
    const saveRow = `
      <div style="margin-bottom:8px">
        <input id="sbLibSaveName" value="${escapeHtml(snapshotName)}" style="width:100%;margin-bottom:5px">
        <button type="button" onclick="actions.saveNamedScheduleFromSidebar()"
          style="width:100%;height:26px;border-radius:var(--sb-r);background:var(--sb-sky);color:#0a1840;border:none;font-size:11px;font-weight:700;cursor:pointer">
          ↑ Save to library
        </button>
      </div>`;
    const renderItem = (item, index)=>`
      <div class="sb-lib-item ${state.currentLibraryId===item.id?'sb-lib-active':''}">
        <div class="sb-lib-name">${escapeHtml(item.name||'Untitled')}</div>
        <div class="sb-lib-sub">${item.builtIn?'Built-in':item.updatedAt?new Date(item.updatedAt).toLocaleDateString():''} · ${((item.schedule?.sessions)||[]).length} sessions</div>
        <div style="display:flex;gap:3px;margin-top:4px">
          <button onclick="actions.loadSavedScheduleByIndex(${index})" type="button"
            style="height:20px;padding:0 8px;border-radius:4px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:var(--sb-nav-ink);font-size:9.5px;cursor:pointer">
            Open
          </button>
          ${!item.builtIn?`<button onclick="actions.deleteSavedScheduleByIndex(${index})" type="button"
            style="height:20px;padding:0 8px;border-radius:4px;border:1px solid rgba(255,255,255,.08);background:transparent;color:var(--sb-nav-muted);font-size:9.5px;cursor:pointer">
            Delete
          </button>`:''}
        </div>
      </div>`;
    return saveRow
      + (userItems.length ? userItems.map((item,i)=>renderItem(item, library.indexOf(item))).join('') : '<div style="font-size:10.5px;color:var(--sb-nav-muted);text-align:center;padding:10px 0">No saved schedules yet</div>')
      + (builtIn.length ? `<div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--sb-nav-muted);margin:10px 0 5px">Templates</div>`+builtIn.map((item,i)=>renderItem(item, library.indexOf(item))).join('') : '');
  }

  function renderMeetSetup() {
    return `
      <section class="panel">
        <div class="panel-heading">
          <h2>Meet Setup</h2>
          <button class="icon-button" title="Add day" onclick="actions.addDay()">+</button>
        </div>
        <label>Meet name<input value="${escapeHtml(state.meet.name)}" onchange="actions.setMeet('name', this.value)" /></label>
        <label>Venue<input value="${escapeHtml(state.meet.venue)}" onchange="actions.setMeet('venue', this.value)" /></label>
        <label>Time zone
          <select onchange="actions.setMeet('timezone', this.value)">${timeZoneSelectOptions()}</select>
        </label>
        <label>Publish status
          <select onchange="actions.setPublishStatus(this.value)">${publishStatusOptions()}</select>
        </label>
        <label>Canva design URL<input placeholder="Paste Canva design link when one exists" value="${escapeHtml(state.meet.canvaUrl || '')}" onchange="actions.setMeet('canvaUrl', this.value)" /></label>
        <label>Meet type
          <select onchange="actions.setMeetType(this.value)">
            ${Object.values(meetProfiles).map((profile) => `<option value="${profile.id}" ${profile.id === state.meet.meetType ? "selected" : ""}>${profile.label}</option>`).join("")}
          </select>
        </label>
        <div class="template-library">
          <div class="template-library-head"><strong>Meet templates</strong><span>Choose a starting rules profile; all timing remains editable.</span></div>
          <div class="template-card-grid">
            ${TEMPLATE_GROUPS.map((item) => `<button type="button" class="template-card ${state.meet.meetType === item.id ? "active" : ""}" onclick="actions.applyMeetTemplate('${item.id}')"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></button>`).join("")}
          </div>
        </div>
        <div class="facility-assumption-card">
          <strong>Default facility assumptions</strong>
          <span>Used for schedule health until exact facility specs are added in a future version.</span>
          <div>${FACILITY_ASSUMPTIONS.map((item) => `<em>${item.count}× ${item.label}</em>`).join("")}</div>
        </div>
        ${state.meet.days.map((day, index) => `
          <div class="day-editor">
            <label>Day ${index + 1}<input type="date" value="${day.date}" onchange="actions.setDay('${day.id}', 'date', this.value)" /></label>
            <label>Open<input type="time" value="${formatTimeInput(day.openMinutes)}" onchange="actions.setDay('${day.id}', 'openMinutes', this.value)" /></label>
            <label>Close<input type="time" value="${formatTimeInput(day.closeMinutes)}" onchange="actions.setDay('${day.id}', 'closeMinutes', this.value)" /></label>
            <button class="icon-button" title="${day.locked ? "Unlock day" : "Lock day"}" onclick="actions.toggleDayLock('${day.id}')">${lockIcon(day.locked)}</button>
            <button class="icon-button" title="Remove day" onclick="actions.removeDay('${day.id}')">x</button>
          </div>
        `).join("")}
      </section>
    `;
  }


  function usedRoundMapForPreset(preset) {
    const used = new Map();
    if (!preset) return used;
    state.sessions.forEach((session) => {
      session.events.forEach((event) => {
        if (sameEventFamily(event, preset) && event.round !== "Custom Block") {
          const day = state.meet.days.find((candidate) => candidate.id === session.dayId);
          used.set(event.round, { session, event, day });
        }
      });
    });
    return used;
  }

  function usageTextForPreset(preset) {
    const used = usedRoundMapForPreset(preset);
    const usableRounds = (preset.allowedRounds || []).filter((round) => state.profile.allowedRounds.includes(round));
    const usedLabels = usableRounds.filter((round) => used.has(round));
    if (!usedLabels.length) return "unused";
    return `used: ${usedLabels.join(", ")}`;
  }

  function selectedRoundIsUsed(preset, round) {
    return Boolean(preset && round && usedRoundMapForPreset(preset).has(round));
  }

  function selectedCatalogPreset(profile = state.profile) {
    return profile.events.find((candidate) => candidate.id === state.selectedEventId) || profile.events[0];
  }

  function syncProfileDefaultsToPreset(draft, preset) {
    if (!draft || !draft.profile || !preset) return;
    const templated = applyTimingTemplateToPreset(preset);
    const template = timingTemplateForPreset(templated) || {};
    const warmup = Number(templated.defaultWarmupMinutes ?? template.warmupMinutes);
    const seconds = Number(templated.defaultSecondsPerDive ?? template.secondsPerDive);
    if (Number.isFinite(warmup) && warmup > 0) draft.profile.timingDefaults.warmupMinutes = warmup;
    if (Number.isFinite(seconds) && seconds > 0) draft.profile.timingDefaults.secondsPerDive = seconds;
  }

  function finalAutoRuleForRound(profile, round) {
    if (round === "Qualifier") return null;
    return (profile.roundRelationships || []).find((rule) =>
      rule.from === round &&
      rule.to === "Final" &&
      (rule.relationship === "sameDayRequired" || rule.relationship === "sameDayPreferred")
    );
  }

  function relatedFinalKey(event) {
    return `${event.level} | ${event.gender} | ${event.apparatus} | ${event.style} | Final`;
  }
  function selectedNewSessionDayId() {
    const days = state.meet.days || [];
    if (!days.length) return "";
    if (!days.some((day) => day.id === catalogNewDayId)) catalogNewDayId = days[0].id;
    return catalogNewDayId;
  }

  function dayTargetLabel(day, index) {
    return `Day ${index + 1} - ${shortDayLabel(day.date)}`;
  }

  function presetHasAnyScheduledUse(preset) {
    return Boolean(preset && usedRoundMapForPreset(preset).size);
  }

  function catalogEventsSorted() {
    return [...state.profile.events].sort((a, b) => {
      const usedDelta = Number(presetHasAnyScheduledUse(a)) - Number(presetHasAnyScheduledUse(b));
      if (usedDelta) return usedDelta;
      const nameDelta = eventDisplayName(a).localeCompare(eventDisplayName(b), undefined, { sensitivity: "base" });
      if (nameDelta) return nameDelta;
      const styleDelta = String(a.style || "").localeCompare(String(b.style || ""), undefined, { sensitivity: "base" });
      if (styleDelta) return styleDelta;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }

  function catalogFilteredEvents() {
    const text = String(catalogSearch || "").trim().toLowerCase();
    return catalogEventsSorted().filter((preset) => {
      if (catalogGenderFilter !== "all" && String(preset.gender || "").toLowerCase() !== catalogGenderFilter) return false;
      if (catalogApparatusFilter !== "all" && !String(apparatusDisplay(preset.apparatus)).toLowerCase().includes(catalogApparatusFilter)) return false;
      const used = presetHasAnyScheduledUse(preset);
      if (catalogStatusFilter === "available" && used) return false;
      if (catalogStatusFilter === "used" && !used) return false;
      if (!text) return true;
      const haystack = `${eventDisplayName(preset)} ${preset.gender || ""} ${preset.level || ""} ${preset.apparatus || ""} ${preset.style || ""}`.toLowerCase();
      return haystack.includes(text);
    });
  }

  function catalogFilterSummary() {
    const total = state.profile.events.length;
    const shown = catalogFilteredEvents().length;
    const available = state.profile.events.filter((preset) => !presetHasAnyScheduledUse(preset)).length;
    return `${shown} shown · ${available} available · ${total - available} used`;
  }


  function renderCatalog() {
    const event = selectedCatalogPreset();
    const rounds = event ? event.allowedRounds.filter((round) => state.profile.allowedRounds.includes(round)) : [];
    const usedRounds = usedRoundMapForPreset(event);
    const selectedRound = rounds.includes(state.selectedRound) ? state.selectedRound : rounds.find((round) => !usedRounds.has(round)) || rounds[0];
    const roundUsed = selectedRoundIsUsed(event, selectedRound);
    const addDisabled = !event || roundUsed || (catalogMode === "combine" && !state.combineSessionId);
    const filteredEvents = catalogFilteredEvents();
    return `
      <section class="panel catalog-modern-panel">
        <div class="panel-heading catalog-heading-modern">
          <div>
            <span class="summary-kicker">Build faster</span>
            <h2>Event Catalog</h2>
            <p class="muted">Search, filter, select a round, then add it to a new or existing session.</p>
          </div>
          <div class="panel-actions-inline">
            <button class="text-button" onclick="actions.openEntryManager()">Set Entries</button><button class="text-button danger-soft" onclick="actions.clearEntryDefaults()">Clear Entries</button>
            <button class="text-button" onclick="actions.addCustomBlock()">Schedule Block</button>
          </div>
        </div>
        <div class="catalog-toolbox">
          <label class="catalog-search-label">Search events
            <input type="search" value="${escapeHtml(catalogSearch)}" placeholder="Type age group, gender, board..." oninput="actions.setCatalogSearch(this.value)" />
          </label>
          <div class="catalog-filter-row">
            <label>Gender
              <select onchange="actions.setCatalogGenderFilter(this.value)">
                <option value="all" ${catalogGenderFilter === "all" ? "selected" : ""}>All</option>
                <option value="girls" ${catalogGenderFilter === "girls" ? "selected" : ""}>Girls/Women</option>
                <option value="boys" ${catalogGenderFilter === "boys" ? "selected" : ""}>Boys/Men</option>
              </select>
            </label>
            <label>Board
              <select onchange="actions.setCatalogApparatusFilter(this.value)">
                <option value="all" ${catalogApparatusFilter === "all" ? "selected" : ""}>All</option>
                <option value="1" ${catalogApparatusFilter === "1" ? "selected" : ""}>1-Meter</option>
                <option value="3" ${catalogApparatusFilter === "3" ? "selected" : ""}>3-Meter</option>
                <option value="platform" ${catalogApparatusFilter === "platform" ? "selected" : ""}>Platform</option>
              </select>
            </label>
            <label>Status
              <select onchange="actions.setCatalogStatusFilter(this.value)">
                <option value="available" ${catalogStatusFilter === "available" ? "selected" : ""}>Available first</option>
                <option value="all" ${catalogStatusFilter === "all" ? "selected" : ""}>All events</option>
                <option value="used" ${catalogStatusFilter === "used" ? "selected" : ""}>Used only</option>
              </select>
            </label>
            <button class="text-button" onclick="actions.resetCatalogFilters()">Reset</button>
          </div>
          <div class="catalog-count-pill">${escapeHtml(catalogFilterSummary())}</div>
        </div>
        <div class="catalog-event-grid" role="listbox" aria-label="Event catalog">
          ${filteredEvents.length ? filteredEvents.map((candidate) => {
            const selected = candidate.id === event?.id;
            const usage = usageTextForPreset(candidate);
            const used = presetHasAnyScheduledUse(candidate);
            return `<button type="button" class="catalog-event-card ${selected ? "selected" : ""} ${used ? "used" : ""}" onclick="actions.selectCatalogEvent('${escapeJs(candidate.id)}')">
              <span class="catalog-event-name">${escapeHtml(eventDisplayName(candidate))}</span>
              <span class="catalog-event-meta">${escapeHtml(candidate.style || "Individual")} · ${escapeHtml(usage)}</span>
              <span class="catalog-event-status ${used ? "used" : "available"}">${used ? "Used" : "Available"}</span>
            </button>`;
          }).join("") : `<div class="empty-state-card">No events match those filters. Try resetting the catalog filters.</div>`}
        </div>
        ${event ? `<div class="selected-event-panel">
          <div>
            <span class="summary-kicker">Selected event</span>
            <h3>${escapeHtml(eventDisplayName(event))}</h3>
            <p>${escapeHtml(event.style || "Individual")} · ${escapeHtml(event.sourceNote || state.profile.description || "")}</p>
          </div>
          <div class="selected-event-facts">
            <span>${event.defaultDives ?? "--"} dives</span>
            <span>${state.profile.timingDefaults.secondsPerDive} sec/dive</span>
            <span>${state.profile.timingDefaults.warmupMinutes} min warm-up</span>
          </div>
        </div>` : ""}
        <div class="catalog-usage">
          ${event && rounds.length ? rounds.map((round) => {
            const used = usedRounds.get(round);
            const active = round === selectedRound;
            const label = used ? `${round}: used${used.day ? ` on ${shortDayLabel(used.day.date)}` : ""}` : `${round}: available`;
            return `<button class="usage-chip ${used ? "used" : "available"} ${active ? "active" : ""}" ${used ? "disabled" : ""} onclick="actions.selectRound('${round}')">${escapeHtml(label)}</button>`;
          }).join("") : ""}
        </div>
        <div class="catalog-add-card">
          <div class="catalog-add-mode">
            <span class="summary-kicker">Add destination</span>
            <div class="segmented">
              <button class="${catalogMode === "new" ? "active" : ""}" onclick="actions.setCatalogMode('new')">New session</button>
              <button class="${catalogMode === "combine" ? "active" : ""}" onclick="actions.setCatalogMode('combine')">Existing session</button>
            </div>
          </div>
          ${catalogMode === "new" ? `
            <label>Target day
              <select onchange="actions.setCatalogNewDay(this.value)">
                ${state.meet.days.map((day, index) => `<option value="${day.id}" ${selectedNewSessionDayId() === day.id ? "selected" : ""}>${escapeHtml(dayTargetLabel(day, index))}</option>`).join("")}
              </select>
            </label>
          ` : ""}
          ${catalogMode === "combine" ? `
            <label>Target session
              <select onchange="actions.setCombineSession(this.value)">
                <option value="">Choose session</option>
                ${allTimedSessions().map((session) => `<option value="${session.id}" ${state.combineSessionId === session.id ? "selected" : ""}>${escapeHtml(sessionTargetLabel(session))}</option>`).join("")}
              </select>
            </label>
          ` : ""}
          <button class="primary-button catalog-add-button" ${addDisabled ? "disabled" : ""} onclick="actions.addPresetEvent()">Add ${escapeHtml(selectedRound || "Round")}</button>
        </div>
        ${finalAutoRuleForRound(state.profile, selectedRound) ? `<div class="inline-message" style="margin-top:10px">Adding this ${escapeHtml(selectedRound)} will also create the same-day Final session automatically.</div>` : ""}
        ${roundUsed ? `<div class="inline-message error" style="margin-top:10px">${escapeHtml(selectedRound)} is already scheduled for this event. Choose another phase or remove the existing event first.</div>` : ""}
        ${state.duplicateMessage ? `<div class="inline-message error" style="margin-top:10px">${escapeHtml(state.duplicateMessage)}</div>` : ""}
      </section>
    `;
  }

  function renderEntryManager() {
    const rows = bulkEntryRows();
    const mode = state.entryMode || "projected";
    return `
      <div class="modal-backdrop">
        <section class="entry-manager-modal streamlined-entry-modal" role="dialog" aria-modal="true" aria-label="Event entries">
          <div class="entry-manager-header modern-modal-header">
            <div>
              <span class="summary-kicker">Entry builder</span>
              <h2>Projected + Actual Entries</h2>
              <p>Use projected entries to build anticipated timelines before registration closes. Switch to actual entries when final numbers are ready; actual blank rows fall back to projected counts.</p>
            </div>
            <button class="icon-button" onclick="actions.closeEntryManager()">×</button>
          </div>
          <div class="entry-mode-toolbar">
            <div class="entry-mode-copy"><strong>Timeline basis</strong><span>${mode === "actual" ? "Actual entries are driving the schedule." : "Projected entries are driving the schedule."}</span></div>
            <div class="entry-mode-switch">
              <button class="${mode === "projected" ? "active" : ""}" onclick="actions.setEntryMode('projected')">Projected</button>
              <button class="${mode === "actual" ? "active" : ""}" onclick="actions.setEntryMode('actual')">Actual</button>
            </div>
          </div>
          <div class="entry-manager-table-wrap">
            <table class="entry-manager-table">
              <thead><tr><th>Event</th><th>Round</th><th>Projected</th><th>Actual</th><th>Split</th><th>Using</th></tr></thead>
              <tbody>
                ${rows.map(({ preset, round, key }) => {
                  const projected = Number(state.projectedEntryDefaults?.[key] ?? state.entryDefaults?.[key] ?? defaultDiversForPresetRound(preset, round));
                  const actualRaw = state.actualEntryDefaults?.[key];
                  const actual = actualRaw === undefined || actualRaw === null || actualRaw === "" ? "" : Number(actualRaw);
                  const activeValue = Number(entryValueForKey(key) ?? projected ?? 0);
                  const splitOn = Boolean(state.splitDefaults?.[key]) && !isPlatformEvent(preset);
                  return `
                    <tr class="${splitOn ? "entry-split-row" : ""}">
                      <td>${escapeHtml(eventDisplayName(preset))}</td>
                      <td>${escapeHtml(round)}</td>
                      <td><input type="number" min="0" step="1" value="${Number.isFinite(projected) ? projected : 0}" onchange="actions.setEntryDefaultMode('${escapeJs(key)}', 'projected', this.value)" /></td>
                      <td><input type="number" min="0" step="1" placeholder="Later" value="${actual === "" ? "" : (Number.isFinite(actual) ? actual : 0)}" onchange="actions.setEntryDefaultMode('${escapeJs(key)}', 'actual', this.value)" /></td>
                      <td>${isPlatformEvent(preset)
                        ? `<span class="entry-split-na">N/A</span>`
                        : `<button class="entry-split-button ${splitOn ? "active" : ""}" onclick="actions.setEntrySplitDefault('${escapeJs(key)}', ${splitOn ? "false" : "true"})">${splitOn ? "Split on" : "Split"}</button>`}</td>
                      <td><span class="entry-using-pill ${mode}">${activeValue}</span></td>
                    </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
          <div class="entry-manager-footer modern-modal-footer">
            <button class="text-button danger-soft" onclick="actions.clearEntryDefaults()">Clear Entries</button>
            <button class="text-button" onclick="actions.closeEntryManager()">Done</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderProfile() {
    const preset = selectedCatalogPreset();
    return `
      <section class="panel">
        <div class="panel-heading"><h2>Profile Rules</h2></div>
        <p class="muted">These defaults mirror the selected catalog event before you add it, so you can adjust timing first.</p>
        <div class="profile-grid">
          <label>Selected dives<input type="number" disabled value="${preset?.defaultDives ?? 0}" title="Dive counts are locked from the event template after the event is added." /></label>
          ${numberInput("Default warm-up", "warmupMinutes", state.profile.timingDefaults.warmupMinutes, 5)}
          ${numberInput("Buffer", "transitionBufferMinutes", state.profile.timingDefaults.transitionBufferMinutes, 1)}
          ${numberInput("Time grid (min)", "roundingIncrementMinutes", state.profile.timingDefaults.roundingIncrementMinutes, 1)}
          ${numberInput("Sec/dive", "secondsPerDive", state.profile.timingDefaults.secondsPerDive, 1)}
          ${numberInput("Panel min", "panelChangeMinutes", state.profile.timingDefaults.panelChangeMinutes, 0.5)}
          ${numberInput("Intro min", "introductionsMinutes", state.profile.timingDefaults.introductionsMinutes ?? 10, 1)}
          ${numberInput("Awards min", "awardsMinutes", state.profile.timingDefaults.awardsMinutes ?? 15, 1)}
          <label>Finals transition
            <select onchange="actions.setTimingDefault('finalsTransitionMode', this.value)">
              <option value="openTraining" ${(state.profile.timingDefaults.finalsTransitionMode || defaultTiming.finalsTransitionMode) === "openTraining" ? "selected" : ""}>Open training before finals</option>
              <option value="backToBack" ${(state.profile.timingDefaults.finalsTransitionMode || defaultTiming.finalsTransitionMode) === "backToBack" ? "selected" : ""}>Back-to-back finals</option>
              <option value="manualGap" ${(state.profile.timingDefaults.finalsTransitionMode || defaultTiming.finalsTransitionMode) === "manualGap" ? "selected" : ""}>Manual gap only</option>
            </select>
          </label>
          ${numberInput("Training/gap min", "finalsTransitionMinutes", state.profile.timingDefaults.finalsTransitionMinutes ?? defaultTiming.finalsTransitionMinutes ?? 45, 5)}
          <label>Split dives<input type="number" min="1" value="${state.profile.timingDefaults.splitThresholds.recommendTotalDives}" onchange="actions.setSplitThreshold('recommendTotalDives', this.value)" /></label>
          <label>Review athletes<input type="number" min="1" value="${state.profile.timingDefaults.splitThresholds.reviewAthletes}" onchange="actions.setSplitThreshold('reviewAthletes', this.value)" /></label>
          <label class="checkbox-label"><input type="checkbox" ${state.profile.timingDefaults.secondsPerDiveLocked ? "checked" : ""} onchange="actions.setTimingDefault('secondsPerDiveLocked', this.checked)" /> Lock sec/dive</label>
        </div>
        <div class="relationship-list">
          ${state.profile.roundRelationships.map((rule, index) => `
            <label>${rule.from} to ${rule.to}
              <select ${!rule.configurable ? "disabled" : ""} onchange="actions.setRelationship(${index}, this.value)">
                ${RELATIONSHIP_OPTIONS.map(([value, label]) => `<option value="${value}" ${rule.relationship === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
          `).join("")}
        </div>
      </section>
    `;
  }

  function numberInput(label, field, value, step) {
    return `<label>${label}<input type="number" min="0" step="${step}" value="${value}" onchange="actions.setTimingDefault('${field}', this.value)" /></label>`;
  }

  function renderWarningAction(warning) {
    const acknowledged = isWarningAcknowledged(warning);
    const key = exceptionKey(warning);
    const fieldId = stableDomId("exception-note", key);
    const existing = exceptionRecordForWarning(warning);
    let fix = "";
    if (!acknowledged && (warning.code === "finalsOrder" || warning.code === "dateRule")) {
      fix = `<button class="text-button small" onclick="actions.fixFinalsOrder()">Fix order</button>`;
    } else if (!acknowledged && warning.code === "warmupOverlap" && warning.sessionId) {
      fix = `<button class="text-button small" onclick="actions.reflowDayForSession('${warning.sessionId}')">Reflow day</button>`;
    } else if (!acknowledged && (warning.code === "split" || warning.code === "platformSplit") && warning.scheduleEventId) {
      fix = warning.code === "split" ? `<button class="text-button small" onclick="actions.setEventSplit('${warning.scheduleEventId}', true)">Split</button>` : `<button class="text-button small" onclick="actions.setEventSplit('${warning.scheduleEventId}', false)">Clear split</button>`;
    }
    if (acknowledged) {
      return `<div class="warning-actions inline-exception-approved">
        ${fix}
        <div class="exception-chip"><strong>Exception acknowledged</strong><span>${escapeHtml(existing?.note || "Operational exception acknowledged.")}</span></div>
        <button class="text-button small" onclick='actions.clearException(${JSON.stringify(key)})'>Clear</button>
      </div>`;
    }
    return `<div class="warning-actions inline-exception-actions">
      <div class="quick-fix-actions">${fix}</div>
      <div class="inline-exception-editor">
        <textarea id="${fieldId}" placeholder="Reason this is acceptable, e.g. USA Nationals qualifier exception, approved shortened warm-up, intentional open practice restriction..."></textarea>
        <button class="text-button small approve-exception-button" onclick='actions.acknowledgeWarning(${JSON.stringify(key)}, "${fieldId}")'>Approve exception</button>
      </div>
    </div>`;
  }

  function renderWarnings(warnings) {
    const active = warnings.filter((warning) => !isWarningAcknowledged(warning));
    const acknowledged = warnings.filter((warning) => isWarningAcknowledged(warning));
    const errors = active.filter((warning) => warning.severity === "error").length;
    const activeWarnings = active.filter((warning) => warning.severity === "warning").length;
    const infos = active.filter((warning) => warning.severity === "info").length;
    const shown = scheduleHealthExpanded ? warnings : warnings.slice(0, 4);
    return `
      <section class="panel schedule-health-panel">
        <div class="panel-heading"><h2>Schedule Health</h2><strong>${errors ? `${errors} error${errors === 1 ? "" : "s"}` : activeWarnings ? `${activeWarnings} warning${activeWarnings === 1 ? "" : "s"}` : "Clear"}</strong></div>
        <div class="health-summary-grid">
          <div><strong>${errors}</strong><span>Errors</span></div>
          <div><strong>${activeWarnings}</strong><span>Warnings</span></div>
          <div><strong>${infos}</strong><span>Notes</span></div>
          <div><strong>${acknowledged.length}</strong><span>Exceptions</span></div>
        </div>
        <div class="facility-health-note">
          <strong>Facility model:</strong> ${FACILITY_ASSUMPTIONS.map((item) => `${item.count} ${item.label}`).join(" · ")}
        </div>
        <div class="warning-list health-list">
          ${warnings.length ? shown.map((warning) => `<div class="warning-row ${warning.severity} ${isWarningAcknowledged(warning) ? "acknowledged" : ""}"><div class="warning-message"><strong>${escapeHtml(warning.code)}${isWarningAcknowledged(warning) ? " · exception" : ""}</strong><span>${escapeHtml(warning.message)}</span></div>${renderWarningAction(warning)}</div>`).join("") : `<div class="muted">No health issues detected.</div>`}
        </div>
        ${warnings.length > 4 ? `<button class="text-button" onclick="actions.toggleScheduleHealth()">${scheduleHealthExpanded ? "Show fewer" : `Show all ${warnings.length}`}</button>` : ""}
      </section>
    `;
  }

  function renderBoard(timedSessions, warnings) {
    const activeDay = builderActiveDay();
    const activeSessions = activeDay ? timedSessions.filter((session) => session.dayId === activeDay.id) : [];
    const activeWarnings = activeDay ? warnings.filter((warning) => activeSessions.some((session) => session.id === warning.sessionId)) : warnings;
    const picking = clickMoveState
      ? `Move mode active: choose a destination for ${clickMoveState.kind === "session" ? "the selected session" : "the selected event"}.`
      : "Use Move Mode for reliable placement, then choose the destination. Use Add Schedule Block for open practice, training, breaks, awards, or custom schedule notes.";
    return `
      <section class="board-shell modern-builder-shell ${clickMoveState ? "click-move-active" : ""}" id="scheduleBuilderBoard">
        <div class="board-header modern-board-header">
          <div>
            <h2>Schedule Builder</h2>
            <p class="muted">${escapeHtml(picking)}</p>
          </div>
          <div class="builder-header-actions">
            ${clickMoveState ? `<button type="button" class="text-button small" onclick="actions.cancelPickMove()">Cancel move</button>` : ""}
            <button type="button" class="text-button" onclick="actions.suggestSessions()">Suggest Sessions</button>
            ${activeDay ? `<button type="button" class="text-button" onclick="actions.toggleDayLock('${activeDay.id}')">${activeDay.locked ? "Unlock Day" : "Lock Day"}</button>` : ""}
            ${activeDay && !activeDay.locked ? `<button type="button" class="primary-button compact-primary" onclick="actions.openScheduleBlockPlanner('${activeDay.id}', '', 'end')">Add Schedule Block</button>` : ""}
          </div>
        </div>
        <div class="builder-day-tabs" role="tablist">
          ${state.meet.days.map((day, index) => {
            const daySessions = timedSessions.filter((session) => session.dayId === day.id);
            return `<button type="button" class="builder-day-tab ${day.id === activeDay?.id ? "active" : ""}" onclick="actions.setActiveBuilderDay('${day.id}')">
              <strong>Day ${index + 1}</strong><span>${escapeHtml(fullDayName(day))}</span><em>${daySessions.length} block${daySessions.length === 1 ? "" : "s"}</em>
            </button>`;
          }).join("")}
        </div>
        ${renderMoveModePanel(timedSessions, activeDay)}
        <div class="builder-workspace-split">
          <div class="builder-day-pane">
            <div class="day-board single-day-board">
              ${activeDay ? renderDayLane(activeDay, activeSessions, activeWarnings) : `<div class="empty-session-lane">Add a day in Meet Setup to begin.</div>`}
            </div>
          </div>
          ${activeDay ? `<div class="builder-right-rail live-flow-only">${renderBuilderFlowDock(activeDay, activeSessions)}</div>` : ""}
        </div>
      </section>
    `;
  }

  function renderBoardLanePreview(day, sessions) {
    const lanes = ["1-Meter", "3-Meter", "Platform", "Practice / Blocks"];
    const itemsByLane = Object.fromEntries(lanes.map((lane) => [lane, []]));
    [...sessions].sort((a,b)=>Number(a.warmupStartMinutes||0)-Number(b.warmupStartMinutes||0)).forEach((session) => {
      const timing = session.timing || calculateSessionTiming(session);
      const practice = Boolean(session.isOpenPracticeSession || session.autoTrainingForDayId);
      if (practice) {
        itemsByLane["Practice / Blocks"].push({ label: sessionDisplayName(session), time: `${displayTime(timing.eventStartMinutes)}-${displayTime(timing.sessionEndMinutes)}` });
        return;
      }
      const seen = new Set();
      session.events.forEach((event) => {
        const lane = isPlatformEvent(event) ? "Platform" : (apparatusDisplay(event.apparatus).includes("3") ? "3-Meter" : "1-Meter");
        const et = timing.events.find((item) => item.scheduleEventId === event.scheduleEventId) || {};
        const key = `${lane}-${event.eventGroupId || event.scheduleEventId}`;
        if (seen.has(key)) return;
        seen.add(key);
        itemsByLane[lane].push({ label: eventDisplayName(event), time: `${displayTime(et.eventStartMinutes || timing.eventStartMinutes)}-${displayTime(et.eventEndMinutes || timing.sessionEndMinutes)}` });
      });
    });
    return `<aside class="board-lane-preview"><div class="builder-flow-header"><span>Board lanes</span><strong>${escapeHtml(shortDayLabel(day.date))}</strong></div>${lanes.map((lane) => `<div class="lane-preview-row"><strong>${escapeHtml(lane)}</strong><div>${itemsByLane[lane].length ? itemsByLane[lane].slice(0,5).map((item)=>`<span><b>${escapeHtml(item.time)}</b>${escapeHtml(item.label)}</span>`).join("") : `<em>No blocks</em>`}</div></div>`).join("")}</aside>`;
  }

  function sessionCardVisualHeight(session) {
    const timedHeight = (session.timing.sessionEndMinutes - session.timing.warmupStartMinutes) * PX_PER_MINUTE;
    const eventCount = Math.max(1, session.events.length);
    const groupCount = Math.max(1, getEventGroups(session).length);
    const estimatedControlsHeight = 380 + eventCount * 360 + Math.max(0, groupCount - 1) * 34;
    return Math.max(420, timedHeight, estimatedControlsHeight);
  }


  function currentMoveLabel() {
    if (!clickMoveState) return "";
    if (clickMoveState.kind === "session") {
      const session = state.sessions.find((item) => item.id === clickMoveState.id);
      return session ? sessionDisplayName(session) : "Selected session";
    }
    const located = findEventLocation(state, clickMoveState.id);
    return located?.event ? eventDisplayName(located.event) : "Selected event";
  }

  function renderMoveModePanel(timedSessions, activeDay) {
    if (!clickMoveState) return "";
    const selectedLabel = currentMoveLabel();
    if (clickMoveState.kind === "session") {
      return `
        <div class="move-mode-panel">
          <div class="move-mode-copy">
            <strong>Moving session</strong>
            <span>${escapeHtml(selectedLabel)} — click a placement line in the active day, or send it to the end of another day.</span>
          </div>
          <div class="move-mode-destinations">
            ${state.meet.days.map((day, index) => `<button type="button" onclick="actions.dropPickedSessionAt('${day.id}', '', 'end')">Day ${index + 1}<span>${escapeHtml(fullDayName(day))}</span></button>`).join("")}
            <button type="button" class="ghost-danger" onclick="actions.cancelPickMove()">Cancel</button>
          </div>
        </div>`;
    }
    return `
      <div class="move-mode-panel event-move-panel">
        <div class="move-mode-copy">
          <strong>Moving event</strong>
          <span>${escapeHtml(selectedLabel)} — click a session to move it there, or click another event to combine.</span>
        </div>
        <div class="move-mode-destinations">
          ${timedSessions.map((session) => `<button type="button" onclick="actions.dropPickedEventInSession(null, '${session.id}')">${escapeHtml(sessionDisplayName(session))}<span>${escapeHtml(fullDayName(state.meet.days.find((day) => day.id === session.dayId) || activeDay || state.meet.days[0]))}</span></button>`).join("")}
          <button type="button" class="ghost-danger" onclick="actions.cancelPickMove()">Cancel</button>
        </div>
      </div>`;
  }

  function blockPlannerDefaults(dayId, afterSessionId, position) {
    const previousState = state;
    const day = state.meet.days.find((item) => item.id === dayId) || state.meet.days[0];
    const timedSessions = allTimedSessions().filter((session) => session.dayId === day?.id);
    let start = Number(day?.openMinutes || parseTime("08:00"));
    if (afterSessionId) {
      const source = timedSessions.find((session) => session.id === afterSessionId);
      start = roundUp(Number(source?.timing?.sessionEndMinutes || source?.warmupStartMinutes || start), Number(state.profile.timingDefaults.roundingIncrementMinutes || 5));
    } else if (position === "end") {
      start = roundUp(timedSessions.reduce((latest, session) => Math.max(latest, Number(session.timing?.sessionEndMinutes || session.warmupStartMinutes || start)), start), Number(state.profile.timingDefaults.roundingIncrementMinutes || 5));
    }
    return { start, end: start + 60 };
  }

  function renderScheduleBlockPlanner() {
    if (!scheduleBlockPlanner) return "";
    const types = SCHEDULE_BLOCK_TYPES;
    const day = state.meet.days.find((item) => item.id === scheduleBlockPlanner.dayId) || state.meet.days[0];
    return `
      <div class="modal-backdrop schedule-block-backdrop" role="dialog" aria-modal="true">
        <section class="schedule-block-modal">
          <div class="modal-heading">
            <div>
              <h2>Add schedule block</h2>
              <p>${escapeHtml(fullDayName(day))} · ${scheduleBlockPlanner.position === "start" ? "Start of day" : scheduleBlockPlanner.afterSessionId ? "After selected session" : "End of day"}</p>
            </div>
            <button class="icon-button" onclick="actions.closeScheduleBlockPlanner()">×</button>
          </div>
          <div class="block-type-grid">
            ${types.map((type) => `<button type="button" class="${scheduleBlockPlanner.type === type ? "active" : ""}" onclick="actions.updateScheduleBlockPlanner('type', '${type}')"><strong>${type}</strong><span>${blockTypeHelp(type)}</span></button>`).join("")}
          </div>
          <label class="block-name-field">Block name<input type="text" value="${escapeHtml(scheduleBlockPlanner.name || "")}" onchange="actions.updateScheduleBlockPlanner('name', this.value)" /></label>
          <div class="block-time-grid">
            <label>Start time<input type="time" value="${formatTimeInput(scheduleBlockPlanner.start)}" onchange="actions.updateScheduleBlockPlanner('start', this.value)" /></label>
            <label>End time<input type="time" value="${formatTimeInput(scheduleBlockPlanner.end)}" onchange="actions.updateScheduleBlockPlanner('end', this.value)" /></label>
          </div>
          <label class="block-note-field">Daily flow note / restriction<textarea placeholder="Example: Region 6 only, Zone E platform warm-up, pool closed for setup, etc." onchange="actions.updateScheduleBlockPlanner('note', this.value)">${escapeHtml(scheduleBlockPlanner.note || "")}</textarea></label>
          <div class="modal-actions">
            <button type="button" class="text-button" onclick="actions.closeScheduleBlockPlanner()">Cancel</button>
            <button type="button" class="primary-button compact-primary" onclick="actions.createScheduleBlockFromPlanner()">Add block</button>
          </div>
        </section>
      </div>`;
  }

  function blockTypeHelp(type) {
    if (type === "Open Practice") return "General open pool time";
    if (type === "Restricted Training") return "Region/zone-specific practice block";
    if (type === "Open Training") return "Training between sessions";
    if (type === "Break") return "Operational pause";
    if (type === "Awards") return "Ceremony block";
    return "Custom schedule note";
  }

  function renderSessionDropZone(dayId, targetSessionId, position, label) {
    const active = clickMoveState?.kind === "session";
    return `
      <div class="session-slot-drop-zone ${active ? "click-drop-ready" : ""}" data-day="${dayId}" data-target-session="${targetSessionId || ""}" data-position="${position}" ondragover="actions.sessionSlotDragOver(event)" ondragleave="actions.sessionSlotDragLeave(event)" ondrop="actions.dropSessionAtSlot(event, '${dayId}', '${targetSessionId || ""}', '${position}')" onclick="actions.dropPickedSessionAt('${dayId}', '${targetSessionId || ""}', '${position}')">
        ${escapeHtml(active ? "Click to place session here" : label)}
      </div>
    `;
  }

  function renderBuilderFlowDock(day, sessions) {
    const sortedSessions = [...sessions].sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));
    const items = sortedSessions.length
      ? sortedSessions.map((session) => {
          const timing = session.timing || calculateSessionTiming(session);
          const isPractice = Boolean(session.isOpenPracticeSession);
          const timeLabel = isPractice
            ? `${displayTime(timing.eventStartMinutes)}-${displayTime(timing.sessionEndMinutes)}`
            : `${displayTime(timing.warmupStartMinutes)}-${displayTime(timing.sessionEndMinutes)}`;
          const eventList = session.events.slice(0, 4).map((event) => `<li>${escapeHtml(eventDisplayName(event))}${event.round && event.round !== "Custom Block" ? ` <span>${escapeHtml(event.round)}</span>` : ""}</li>`).join("");
          const extra = session.events.length > 4 ? `<li class="flow-more">+${session.events.length - 4} more</li>` : "";
          const note = isPractice ? String(session.events[0]?.notes || "").trim() : "";
          return `<article class="builder-flow-item ${isPractice ? "practice" : "competition"}">
            <div class="builder-flow-time">${escapeHtml(timeLabel)}</div>
            <div class="builder-flow-content">
              <strong>${escapeHtml(sessionDisplayName(session))}</strong>
              <ul>${eventList}${extra}</ul>
              ${note ? `<p>${escapeHtml(note)}</p>` : ""}
            </div>
          </article>`;
        }).join("")
      : `<div class="builder-flow-empty">No schedule blocks on this day yet.</div>`;
    return `<aside class="builder-flow-dock" aria-label="Live daily flow preview">
      <div class="builder-flow-header">
        <span>Live Daily Flow</span>
        <strong>${escapeHtml(fullDayName(day))}</strong>
      </div>
      <div class="builder-flow-list">${items}</div>
    </aside>`;
  }

  function renderDayLane(day, sessions, warnings) {
    const sortedSessions = [...sessions].sort((a, b) => a.warmupStartMinutes - b.warmupStartMinutes);
    const sessionCards = sortedSessions.length
      ? `${renderSessionDropZone(day.id, sortedSessions[0].id, "before", "Place session before first block")}${sortedSessions.map((session, index) => `
          ${renderSessionCard(day, session, warnings.filter((warning) => warning.sessionId === session.id))}
          ${renderSessionDropZone(day.id, session.id, "after", index === sortedSessions.length - 1 ? "Place session at end of day" : "Place session here")}
        `).join("")}`
      : `<div class="empty-session-lane">No schedule blocks yet. Add a competition event from the catalog or add an open practice/training block.</div>${renderSessionDropZone(day.id, "", "end", "Place selected session here")}`;
    return `
      <section class="day-lane active-day-panel ${day.locked ? "locked-day" : ""}" data-day="${day.id}">
        <div class="day-lane-header modern-day-header">
          <div class="active-day-title"><h3>${escapeHtml(fullDayName(day))}${day.locked ? " · Locked" : ""}</h3><span>Pool open ${displayTime(day.openMinutes)}-${displayTime(day.closeMinutes)}</span></div>
          <div class="day-lane-actions">
            ${day.locked ? `<span class="locked-note">Unlock this day to add or move schedule blocks.</span>` : `<button type="button" class="text-button" onclick="actions.openScheduleBlockPlanner('${day.id}', '', 'start')">Add Block</button><button type="button" class="text-button" onclick="actions.openScheduleBlockPlanner('${day.id}', '', 'end')">Add Block at End</button><button type="button" class="text-button" onclick="actions.openDuplicateDayPlanner('${day.id}')">Duplicate Day</button>`}
          </div>
        </div>
        <div class="session-list modern-session-list">
          ${sessionCards}
        </div>
      </section>
    `;
  }

  function renderSessionCard(day, session, warnings) {
    const collapsed = Boolean(session.collapsed);
    const splitCount = session.events.filter((event) => event.manualSplit).length;
    const combinedBlocks = getEventGroups(session).filter((group) => group.events.length > 1).length;
    const awardsStatus = sessionHasFinals(session) ? (session.awardsEnabled !== false ? "Awards on" : "Awards carried") : "";
    const isBlock = Boolean(session.isOpenPracticeSession || session.autoTrainingForDayId);
    const cardLabel = sessionDisplayName(session);
    return `
      <article class="session-card modern-session-card ${collapsed ? "session-collapsed" : "session-open"} ${isBlock ? "schedule-block-card" : ""} ${session.isOpenPracticeSession ? "open-practice-session" : ""}" data-session-id="${session.id}">
        <div class="session-accent-bar"></div>
        <div class="card-header session-card-header modern-session-card-header">
          <button class="session-toggle" title="${collapsed ? "Open session" : "Collapse session"}" onclick="actions.toggleSession('${session.id}')">${collapsed ? "▸" : "▾"}</button>
          <div class="session-title-lockup">
            <strong>${escapeHtml(cardLabel)}</strong>
            <span>${escapeHtml(sessionEventSummary(session))}</span>
          </div>
          <div class="session-chip-row">
            ${splitCount ? `<span class="status-chip split-chip">${splitCount} split</span>` : ""}
            ${combinedBlocks ? `<span class="status-chip combined-chip">${combinedBlocks} combined</span>` : ""}
            ${awardsStatus ? `<span class="status-chip awards-chip">${awardsStatus}</span>` : ""}
          </div>
          <div class="session-card-actions">
            <button type="button" class="text-button small ${clickMoveState?.kind === 'session' && clickMoveState.id === session.id ? 'picked' : ''}" title="Pick up this session, then click a destination" onclick="actions.pickMove('session', '${session.id}')">Move</button>
            <button class="icon-button" title="${session.locked ? "Unlock automatic timing" : "Lock timing"}" onclick="actions.updateSession('${session.id}', 'locked', ${!session.locked})">${lockIcon(session.locked)}</button>
            <button class="icon-button" title="Remove session" onclick="actions.removeSession('${session.id}')">×</button>
          </div>
        </div>
        <div class="session-times session-summary-line">
          ${session.isOpenPracticeSession
            ? `<span>${escapeHtml(sessionDisplayName(session))} ${displayTime(session.timing.eventStartMinutes)}-${displayTime(session.timing.sessionEndMinutes)}</span><span>${(session.timing.sessionEndMinutes - session.timing.eventStartMinutes).toFixed(0)} min</span>`
            : `<span>Warm-up ${displayTime(session.timing.warmupStartMinutes)}-${displayTime(session.timing.warmupEndMinutes)}</span><span>Events ${displayTime(session.timing.eventStartMinutes)}-${displayTime(session.timing.sessionEndMinutes)}</span><span>${session.events.length} event${session.events.length === 1 ? "" : "s"}</span>`}
        </div>
        <div class="session-quick-insert"><button type="button" onclick="actions.openScheduleBlockPlanner('${session.dayId}', '${session.id}', 'after')">+ Add Block After</button></div>
        ${session.isOpenPracticeSession ? renderOpenPracticeSessionBody(session, warnings, collapsed) : (collapsed ? renderCollapsedSessionBody(session, warnings) : renderOpenSessionBody(session, warnings))}
      </article>
    `;
  }

  function renderOpenPracticeSessionBody(session, warnings, collapsed) {
    const event = session.events[0];
    const timing = session.timing.events.find((item) => item.scheduleEventId === event?.scheduleEventId) || {};
    const startMinutes = Number(timing.eventStartMinutes ?? session.timing.eventStartMinutes ?? session.warmupStartMinutes ?? 0);
    const endMinutes = Number(timing.eventEndMinutes ?? session.timing.sessionEndMinutes ?? (startMinutes + Number(event?.customDurationMinutes || 60)));
    const duration = Math.max(0, endMinutes - startMinutes);
    if (collapsed) {
      return `
        <div class="open-practice-compact">
          <strong>${escapeHtml(sessionDisplayName(session))}</strong>
          <span>${displayTime(startMinutes)}-${displayTime(endMinutes)}</span>
        </div>
        ${warnings.length ? `<div class="compact-warning-count">${warnings.length} warning${warnings.length === 1 ? "" : "s"}</div>` : ""}
      `;
    }
    return `
      <div class="session-details open-practice-editor">
        <div class="session-grid">
          <label>Block name<input type="text" value="${escapeHtml(sessionDisplayName(session))}" onchange="actions.renameScheduleBlock('${session.id}', this.value)" /></label>
          <label>Block start<input type="time" value="${formatTimeInput(startMinutes)}" onchange="actions.updateOpenPracticeTime('${session.id}', 'start', this.value)" /></label>
          <label>Block end<input type="time" value="${formatTimeInput(endMinutes)}" onchange="actions.updateOpenPracticeTime('${session.id}', 'end', this.value)" /></label>
          <label>Time grid (min)<input type="number" min="1" step="1" value="${session.roundingIncrementMinutes}" title="Snaps calculated start times to this interval." onchange="actions.updateSession('${session.id}', 'roundingIncrementMinutes', this.value)" /></label>
        </div>
        <div class="time-grid-helper">Block length is calculated from the start and end times shown above (${duration.toFixed(0)} min).</div>
        <label>Daily flow note / restriction<textarea placeholder="Example: Region 4 athletes only, Zone E only, E/W/C warm-up assignment, etc." onchange="actions.updateEvent('${event.scheduleEventId}', 'notes', this.value)">${escapeHtml(event?.notes || "")}</textarea></label>
        <div class="open-practice-presets">
          <button type="button" onclick="actions.resizeOpenPractice('${session.id}', 'day')">Use day open-close</button>
        </div>
      </div>
      ${warnings.length ? `<div class="warning-list">${warnings.map((warning) => `<div class="warning-pill ${warning.severity}">${escapeHtml(warning.message)}</div>`).join("")}</div>` : ""}
    `;
  }

  function renderOpenSessionBody(session, warnings) {
    return `
      <div class="session-details">
        <div class="session-grid">
          <label>Start<input type="time" value="${formatTimeInput(session.warmupStartMinutes)}" onchange="actions.updateSession('${session.id}', 'warmupStartMinutes', this.value)" /></label>
          <label>Warm-up<input type="number" min="0" step="5" value="${session.warmupMinutes}" onchange="actions.updateSession('${session.id}', 'warmupMinutes', this.value)" /></label>
          <label>Buffer<input type="number" min="0" step="1" value="${session.transitionBufferMinutes}" onchange="actions.updateSession('${session.id}', 'transitionBufferMinutes', this.value)" /></label>
          <label>Time grid (min)<input type="number" min="1" step="1" value="${session.roundingIncrementMinutes}" title="Snaps calculated start times to this interval." onchange="actions.updateSession('${session.id}', 'roundingIncrementMinutes', this.value)" /></label>
        </div>
        <div class="preset-row">${[25, 35, 55, 75].map((minutes) => `<button onclick="actions.updateSession('${session.id}', 'warmupMinutes', ${minutes})">${minutes}</button>`).join("")}</div>
        <div class="time-grid-helper">Time grid controls how calculated start times snap to clean marks, usually every 5 minutes.</div>
        ${renderAwardsControl(session)}
      </div>
      <div class="event-stack ${clickMoveState?.kind === 'event' ? 'click-drop-ready' : ''}" ondragover="actions.eventStackDragOver(event, '${session.id}')" ondragleave="actions.eventStackDragLeave(event)" ondrop="actions.dropEventInSession(event, '${session.id}')" onclick="actions.dropPickedEventInSession(null, '${session.id}')">
        ${renderSessionLaneGroups(session, false)}
        <div class="session-drop-zone">Drop event here to move it into this session</div>
      </div>
      ${warnings.length ? `<div class="warning-list">${warnings.map((warning) => `<div class="warning-pill ${warning.severity}">${escapeHtml(warning.message)}</div>`).join("")}</div>` : ""}
    `;
  }

  function renderAwardsControl(session) {
    if (!sessionHasFinals(session)) return "";
    const enabled = session.awardsEnabled !== false;
    return `
      <div class="awards-toggle-row">
        <label class="checkbox-label awards-switch"><input type="checkbox" ${enabled ? "checked" : ""} onchange="actions.updateSession('${session.id}', 'awardsEnabled', this.checked)" /> Awards after this finals session</label>
        <div class="time-grid-helper">${enabled ? "Awards will be scheduled after this finals session and will include any prior finals sessions with awards turned off." : "Awards are carried forward to the next finals session with awards turned on."}</div>
      </div>
    `;
  }

  function renderCollapsedSessionBody(session, warnings) {
    return `
      <div class="event-stack compact-event-stack ${clickMoveState?.kind === 'event' ? 'click-drop-ready' : ''}" ondragover="actions.eventStackDragOver(event, '${session.id}')" ondragleave="actions.eventStackDragLeave(event)" ondrop="actions.dropEventInSession(event, '${session.id}')" onclick="actions.dropPickedEventInSession(null, '${session.id}')">
        ${renderSessionLaneGroups(session, true)}
        <div class="session-drop-zone">Drop event here to move it into this session</div>
      </div>
      ${warnings.length ? `<div class="compact-warning-count">${warnings.length} warning${warnings.length === 1 ? "" : "s"}</div>` : ""}
    `;
  }

  function renderSessionLaneGroups(session, compact) {
    const lanes = eventGroupsByLane(session);
    return lanes.map(([lane, groups]) => `
      <div class="board-lane-group ${compact ? "compact-board-lane" : ""}" data-lane="${lane}">
        ${groups.map((group) => compact ? renderCompactEventGroup(session, group) : renderEventGroup(session, group)).join("")}
      </div>
    `).join("");
  }

  function renderCompactEventGroup(session, group) {
    const combined = group.events.length > 1;
    return `
      <div class="event-group compact-group ${combined ? "combined" : ""}" data-group-id="${group.id}">
        ${combined ? `<div class="combined-label">Combined block <span>${group.events.length} events start together</span></div>` : ""}
        ${group.events.map((event) => renderCompactEvent(session, event, combined)).join("")}
      </div>
    `;
  }

  function canCombineWithPrevious(session, event) {
    const index = session.events.findIndex((item) => item.scheduleEventId === event.scheduleEventId);
    if (index <= 0) return false;
    const previous = session.events[index - 1];
    return previous && previous.eventGroupId !== event.eventGroupId && canCombineEvents(previous, event);
  }

  function renderCompactEvent(session, event, combinedGroup) {
    const timing = session.timing.events.find((item) => item.scheduleEventId === event.scheduleEventId);
    return `
      <div class="scheduled-event compact-event ${event.manualSplit ? "split-event" : ""} ${clickMoveState?.kind === 'event' && clickMoveState.id !== event.scheduleEventId ? 'click-event-target' : ''}" data-event-id="${event.scheduleEventId}" ondragover="actions.eventDragOver(event, '${event.scheduleEventId}')" ondragleave="actions.eventDragLeave(event, '${event.scheduleEventId}')" ondrop="actions.dropEventOnEvent(event, '${session.id}', '${event.scheduleEventId}')" onclick="actions.dropPickedEventOnEvent(event, '${session.id}', '${event.scheduleEventId}')">
        <button class="event-disclosure" title="Open event options" onclick="actions.openEventDetails('${event.scheduleEventId}')">▸</button>
        <div class="compact-event-main">
          <strong>${escapeHtml(eventDisplayName(event))}${event.manualSplit ? " <span class='split-badge'>SPLIT</span>" : ""}</strong>
          <span>${event.style} | ${event.round} | ${timing?.totalDives || 0} dives | ${displayTime(timing?.eventStartMinutes || session.timing.eventStartMinutes)}-${displayTime(timing?.eventEndMinutes || session.timing.sessionEndMinutes)}</span>
        </div>
        <div class="event-actions compact-actions">
          <button type="button" class="event-drag-handle ${clickMoveState?.kind === 'event' && clickMoveState.id === event.scheduleEventId ? 'picked' : ''}" title="Pick up this event, then click a destination session or event" onclick="actions.pickMove('event', '${event.scheduleEventId}')">Move</button>
          <button class="text-button small" title="Move event up within this session" onclick="actions.moveEventStep('${event.scheduleEventId}', -1)">↑</button>
          <button class="text-button small" title="Move event down within this session" onclick="actions.moveEventStep('${event.scheduleEventId}', 1)">↓</button>
          ${combinedGroup ? `<button class="text-button small" title="Separate from this combined block" onclick="actions.uncombineEvent('${event.scheduleEventId}')">Uncombine</button>` : canCombineWithPrevious(session, event) ? `<button class="text-button small" title="Run this event at the same start time as the event above" onclick="actions.combineWithPrevious('${event.scheduleEventId}')">Combine ↑</button>` : ""}
          ${session.events.length > 1 ? `<button class="text-button small" title="Move this event into its own session" onclick="actions.moveEventToNewSession('${event.scheduleEventId}')">New session</button>` : ""}
        </div>
      </div>
    `;
  }

  function renderEventGroup(session, group) {
    const combined = group.events.length > 1;
    return `
      <div class="event-group ${combined ? "combined" : ""}" data-group-id="${group.id}">
        ${combined ? `<div class="combined-label">Combined event block <span>${group.events.length} events start together</span></div>` : ""}
        ${group.events.map((event) => renderEvent(session, event, combined)).join("")}
      </div>
    `;
  }

  function renderEvent(session, event, combinedGroup) {
    const timing = session.timing.events.find((item) => item.scheduleEventId === event.scheduleEventId);
    const recommendation = splitRecommendation(event);
    const duration = calculateEventDuration(event);
    const rotationText = splitPanelRotationText(event);
    const eventOpen = event.detailsOpen !== false;
    const panelControls = event.manualSplit
      ? `${eventNumberInput(event, "Panel break(s)", "numberOfPanelChanges", 1)}${eventNumberInput(event, "Min/break", "minutesPerPanelChange", 0.5)}`
      : `<div class="split-note">Panel break time is only available when Split is on.</div>`;
    return `
      <div class="scheduled-event ${event.manualSplit ? "split-event" : ""} ${eventOpen ? "event-open" : "event-collapsed"} ${clickMoveState?.kind === 'event' && clickMoveState.id !== event.scheduleEventId ? 'click-event-target' : ''}" data-event-id="${event.scheduleEventId}" ondragover="actions.eventDragOver(event, '${event.scheduleEventId}')" ondragleave="actions.eventDragLeave(event, '${event.scheduleEventId}')" ondrop="actions.dropEventOnEvent(event, '${session.id}', '${event.scheduleEventId}')" onclick="actions.dropPickedEventOnEvent(event, '${session.id}', '${event.scheduleEventId}')">
        <div class="event-title event-title-collapsible">
          <button class="event-disclosure" title="${eventOpen ? "Close event options" : "Open event options"}" onclick="actions.toggleEventDetails('${event.scheduleEventId}')">${eventOpen ? "▾" : "▸"}</button>
          <div class="event-title-main">
            <strong>${escapeHtml(eventDisplayName(event))}${event.manualSplit ? " <span class='split-badge'>SPLIT</span>" : ""}</strong>
            <span>${event.style} | ${event.round}${event.defaultSecondsPerDive ? ` | template ${event.defaultNumberOfDives ?? event.numberOfDives} dives @ ${event.secondsPerDive} sec` : ""}</span>
          </div>
          <div class="event-actions">
            <button type="button" class="event-drag-handle ${clickMoveState?.kind === 'event' && clickMoveState.id === event.scheduleEventId ? 'picked' : ''}" title="Pick up this event, then click a destination session or event" onclick="actions.pickMove('event', '${event.scheduleEventId}')">Move</button>
            ${combinedGroup ? `<button class="text-button small" title="Separate from this combined block" onclick="actions.uncombineEvent('${event.scheduleEventId}')">Uncombine</button>` : canCombineWithPrevious(session, event) ? `<button class="text-button small" title="Run this event at the same start time as the event above" onclick="actions.combineWithPrevious('${event.scheduleEventId}')">Combine ↑</button>` : ""}
            ${session.events.length > 1 ? `<button class="text-button small" title="Move this event into its own session" onclick="actions.moveEventToNewSession('${event.scheduleEventId}')">New session</button>` : ""}
            <button class="icon-button" title="Remove event" onclick="actions.removeEvent('${event.scheduleEventId}')">x</button>
          </div>
        </div>
        ${eventOpen ? `
          <div class="event-detail-panel">
            <div class="event-grid event-grid-wide">
              ${eventNumberInput(event, "Divers", "numberOfDivers", 1)}
              ${eventNumberInput(event, "Dives", "numberOfDives", 1, event.numberOfDivesLocked)}
              <label class="checkbox-label dive-lock"><input type="checkbox" ${event.numberOfDivesLocked ? "checked" : ""} onchange="actions.toggleDivesLock('${event.scheduleEventId}', this.checked)" /> Lock dives</label>
              ${eventNumberInput(event, "Sec/dive", "secondsPerDive", 1, event.secondsPerDiveLocked)}
              <label class="checkbox-label"><input type="checkbox" ${event.secondsPerDiveLocked ? "checked" : ""} onchange="actions.updateEvent('${event.scheduleEventId}', 'secondsPerDiveLocked', this.checked)" /> Lock sec/dive</label>
            </div>
            ${renderSplitControls(event, timing, duration, recommendation, panelControls, rotationText)}
            <details>
              <summary class="muted">Round fields</summary>
              <div class="event-grid">
                ${["projectedAdvancers", "actualAdvancers", "finalFieldSize", "domesticEligibleAdvancers", "foreignAthleteAdjustment", "dualCitizenAdjustment"].map((field) => eventNumberInput(event, field.replace(/([A-Z])/g, " $1"), field, 1)).join("")}
                <label style="grid-column:1/-1">Notes<textarea onchange="actions.updateEvent('${event.scheduleEventId}', 'notes', this.value)">${escapeHtml(event.notes)}</textarea></label>
              </div>
            </details>
          </div>` : ""}
        <div class="duration-line">
          <span>${timing?.totalDives || 0} dives</span>
          <span>${event.manualSplit ? "split time" : "event time"}: ${(timing?.eventMinutes || 0).toFixed(1)} min</span>
          ${event.manualSplit ? `<span>unsplit would be ${duration.rawEventMinutes.toFixed(1)} min</span>` : ""}
          ${event.manualSplit && Number(event.numberOfPanelChanges || 0) ? `<span>breaks ${Number(event.numberOfPanelChanges || 0)} x ${Number(event.minutesPerPanelChange || 0)} min</span>` : ""}
          <span>${displayTime(timing?.eventStartMinutes || session.timing.eventStartMinutes)}-${displayTime(timing?.eventEndMinutes || session.timing.sessionEndMinutes)}</span>
        </div>
      </div>
    `;
  }

  function renderSplitControls(event, timing, duration, recommendation, panelControls, rotationText) {
    if (isPlatformEvent(event)) {
      return `
        <div class="split-controls split-disabled">
          <div class="split-status">
            <strong>Platform split disabled</strong>
            <span>Platform events cannot be split. Platform age groups/events can still be combined and will run as a combined platform block.</span>
          </div>
        </div>
      `;
    }
    return `
      <div class="split-controls">
        <div class="split-status ${recommendation.recommended ? "recommended" : ""}">
          <strong>Split review</strong>
          <span>${recommendation.message}</span>
        </div>
        <div class="segmented split-toggle">
          <button class="${!event.manualSplit ? "active" : ""}" onclick="actions.setEventSplit('${event.scheduleEventId}', false)">No split</button>
          <button class="${event.manualSplit ? "active" : ""}" onclick="actions.setEventSplit('${event.scheduleEventId}', true)">Split into 2 boards</button>
        </div>
        <div class="event-grid panel-grid">${panelControls}</div>
        ${event.manualSplit ? renderSplitBoardInfo(event, timing, duration, rotationText) : ""}
      </div>
    `;
  }

  function renderSplitBoardInfo(event, timing, duration, rotationText) {
    const start = displayTime(timing?.eventStartMinutes || 0);
    const end = displayTime(timing?.eventEndMinutes || 0);
    return `
      <div class="split-board-info">
        <div class="split-lanes">
          <div><strong>Board A</strong><span>${start}-${end} | computer/judges A</span></div>
          <div><strong>Board B</strong><span>${start}-${end} | computer/judges B</span></div>
        </div>
        <div class="split-explainer">One warm-up. Two simultaneous boards. Timeline uses one-half of the dive time plus any panel-break time entered above.</div>
        <div class="panel-rotation"><strong>Junior panel rotation:</strong> ${escapeHtml(rotationText)}</div>
      </div>
    `;
  }

  function splitRecommendation(event) {
    if (isPlatformEvent(event)) return { recommended: false, message: "Platform cannot be split; combine age groups/events only when appropriate." };
    const duration = calculateEventDuration({ ...event, manualSplit: false, numberOfPanelChanges: 0 });
    const thresholds = state.profile.timingDefaults.splitThresholds || defaultTiming.splitThresholds;
    const overDives = duration.totalDives >= Number(thresholds.recommendTotalDives || 180);
    const overAthletes = Number(event.numberOfDivers || 0) >= Number(thresholds.reviewAthletes || 40);
    if (overDives || overAthletes) {
      return { recommended: true, message: `Review split: ${duration.totalDives} total dives / ${event.numberOfDivers || 0} divers.` };
    }
    return { recommended: false, message: `${duration.totalDives} total dives; split not required by current thresholds.` };
  }

  function eventNumberInput(event, label, field, step, disabled) {
    return `<label>${escapeHtml(label)}<input type="number" min="0" step="${step}" ${disabled ? "disabled" : ""} value="${event[field] ?? 0}" onchange="actions.updateEvent('${event.scheduleEventId}', '${field}', this.value)" /></label>`;
  }

  function renderContextNotes(context = {}) {
    const notes = notesForContext(context);
    if (!notes.length) return "";
    return `<div class="context-notes">${notes.map((note) => `<div class="context-note"><strong>${escapeHtml(noteAudienceLabel(note.audience))}</strong><span>${escapeHtml(note.text)}</span></div>`).join("")}</div>`;
  }

  function renderNotesManagerModal() {
    const notes = state.scheduleNotes || [];
    const dayOptions = state.meet.days.map((day) => `<option value="${day.id}">${escapeHtml(fullDayName(day))}</option>`).join("");
    return `
      <div class="modal-backdrop notes-backdrop" role="dialog" aria-modal="true">
        <section class="notes-manager-modal">
          <div class="library-hero notes-hero">
            <div><span>Schedule Notes</span><h2>Public and operations notes</h2><p>Attach communication notes to the meet, a day, or a session. Public notes appear on public-facing outputs.</p></div>
            <button class="icon-button" onclick="actions.closeNotesManager()">×</button>
          </div>
          <div class="notes-create-card">
            <label>Audience<select id="noteAudience"><option value="both">Public + Operations</option><option value="public">Public only</option><option value="operations">Operations only</option></select></label>
            <label>Scope<select id="noteScope"><option value="meet">Full meet</option><option value="day">Specific day</option></select></label>
            <label>Day<select id="noteDayId">${dayOptions}</select></label>
            <label class="notes-text-field">Note<textarea id="noteText" placeholder="Example: Region 8 only, platform closed during this block, awards after Session 6, schedule subject to change."></textarea></label>
            <button class="primary-button compact-primary" onclick="actions.addScheduleNoteFromModal()">Add note</button>
          </div>
          <div class="notes-list">
            ${notes.length ? notes.map((note) => `<article class="note-row"><div><strong>${escapeHtml(noteScopeLabel(note))}</strong><span>${escapeHtml(noteAudienceLabel(note.audience))}</span><p>${escapeHtml(note.text)}</p></div><button class="text-button small danger-soft" onclick="actions.deleteScheduleNote('${note.id}')">Delete</button></article>`).join("") : `<div class="library-empty"><strong>No notes yet.</strong><span>Add public or operations notes when the schedule needs extra context.</span></div>`}
          </div>
        </section>
      </div>`;
  }

  function renderDuplicateDayModal() {
    if (!duplicateDayPlanner) return "";
    const source = state.meet.days.find((day) => day.id === duplicateDayPlanner.sourceDayId) || state.meet.days[0];
    const targetOptions = state.meet.days.filter((day) => day.id !== source?.id).map((day) => `<option value="${day.id}" ${day.id === duplicateDayPlanner.targetDayId ? "selected" : ""}>${escapeHtml(fullDayName(day))}</option>`).join("");
    return `
      <div class="modal-backdrop duplicate-backdrop" role="dialog" aria-modal="true">
        <section class="duplicate-day-modal">
          <div class="library-hero duplicate-hero">
            <div><span>Duplicate Day Structure</span><h2>${escapeHtml(source ? fullDayName(source) : "Day")}</h2><p>Copy the day rhythm to another day. Structure mode copies timing blocks/placeholders without copying exact competition events.</p></div>
            <button class="icon-button" onclick="actions.closeDuplicateDayPlanner()">×</button>
          </div>
          <div class="duplicate-options">
            <label>Target day<select onchange="actions.updateDuplicateDayPlanner('targetDayId', this.value)">${targetOptions}</select></label>
            <label>Copy mode<select onchange="actions.updateDuplicateDayPlanner('mode', this.value)"><option value="structure" ${duplicateDayPlanner.mode === "structure" ? "selected" : ""}>Structure only</option><option value="full" ${duplicateDayPlanner.mode === "full" ? "selected" : ""}>Structure + events</option></select></label>
          </div>
          <div class="duplicate-explainer">
            <strong>Structure only</strong> keeps open practice/training/breaks and session timing rhythm without duplicating exact event rounds. <strong>Structure + events</strong> copies the entire day and may trigger duplicate-event warnings.
          </div>
          <div class="modal-actions"><button class="text-button" onclick="actions.closeDuplicateDayPlanner()">Cancel</button><button class="primary-button compact-primary" onclick="actions.applyDuplicateDay()">Duplicate day</button></div>
        </section>
      </div>`;
  }

  function renderScheduleLibraryModal() {
    const library = savedScheduleLibrary();
    const suggested = scheduleSnapshotName();
    const currentItem = library.find((item) => item.id === state.currentLibraryId);
    return `
      <div class="modal-backdrop schedule-library-backdrop" role="dialog" aria-modal="true">
        <section class="schedule-library-modal schedule-library-v2">
          <div class="library-hero">
            <div><span>Schedule Library</span><h2>Save, open, and share schedules</h2><p>Use this library for local saves. Use Share Schedule/Open Shared Schedule to pass one schedule package through SharePoint, Teams, email, or OneDrive.</p></div>
            <button class="icon-button" onclick="actions.closeScheduleLibrary()">×</button>
          </div>
          <div class="library-current-card">
            <div><span>Current workspace</span><strong>${escapeHtml(state.meet.name || "Untitled schedule")}</strong><small>${currentItem ? `Linked to ${escapeHtml(currentItem.name)}` : "Not linked to a saved library item"}</small></div>
            <label>Schedule name<input id="saveScheduleNameInput" value="${escapeHtml(currentItem?.name || suggested)}" /></label>
            <div class="library-primary-actions">
              <button class="primary-button compact-primary" onclick="actions.updateCurrentScheduleFromModal()">Update Current Schedule</button>
              <button class="text-button" onclick="actions.saveNewVersionFromModal()">Save New Version</button>
              <button class="text-button" onclick="actions.duplicateCurrentScheduleFromModal()">Duplicate Schedule</button>
              <button class="text-button" onclick="actions.shareSchedulePackage()">Share Package</button>
              <button class="text-button" onclick="document.getElementById('packageLoader').click()">Open Package</button>
            </div>
          </div>
          <div class="library-list library-list-v2">
            ${library.length ? library.map((item, index) => `<article class="library-row ${item.id === state.currentLibraryId ? "current" : ""} ${item.builtIn ? "seeded" : ""}">
              <div><strong>${escapeHtml(item.name)}</strong><span>${item.builtIn ? "Seeded template" : "Saved"} · Updated ${escapeHtml(new Date(item.updatedAt).toLocaleString())} · ${escapeHtml(publishStatusLabel(item.schedule?.publishStatus || "draft"))}${item.schedule?.schedulePackageId ? ` · Package ID ${escapeHtml(String(item.schedule.schedulePackageId).slice(-8))}` : ""}</span></div>
              <div class="library-row-actions"><button class="text-button small" onclick="actions.loadSavedScheduleByIndex(${index})">Open</button><button class="text-button small" onclick="actions.duplicateSavedScheduleByIndex(${index})">Duplicate</button><button class="text-button small" onclick="actions.renameSavedScheduleByIndex(${index})">Rename</button><button class="text-button small danger-soft" onclick="actions.deleteSavedScheduleByIndex(${index})">Delete</button></div>
            </article>`).join("") : `<div class="library-empty"><strong>No saved schedules yet.</strong><span>Save the current schedule to create the first library item.</span></div>`}
          </div>
        </section>
      </div>`;
  }

  function renderPreview(timedSessions) {
    return `
      <section class="preview-shell">
        <div class="preview-toolbar">
          <div class="segmented">
            <button class="${previewMode === "timeline" ? "active" : ""}" onclick="actions.setPreview('timeline')">Operations Timeline</button>
            <button class="${previewMode === "daily" ? "active" : ""}" onclick="actions.setPreview('daily')">Poster / Canva View</button>
            <button class="${previewMode === "public" ? "active" : ""}" onclick="actions.setPreview('public')">Public Schedule</button>
          </div>
          <div class="export-actions">
            <button class="text-button" onclick="actions.printPreview()">PDF</button>
            <button class="text-button" onclick="actions.exportPng()">PNG</button>
            <button class="text-button" onclick="actions.exportJpg()">JPG</button>
            <button class="text-button" onclick="actions.exportSvg()">SVG</button>
            ${normalizeCanvaUrl(state.meet.canvaUrl || "") ? `<a class="text-button export-link" href="${escapeHtml(normalizeCanvaUrl(state.meet.canvaUrl || ""))}" target="_blank" rel="noopener">Open Canva</a>` : `<button class="text-button" onclick="actions.openCanva()">Set Canva Link</button>`}
            <button class="text-button" onclick="actions.exportExcel()">Excel</button>
          </div>
        </div>
        ${previewMode === "daily" ? renderPosterPreview(timedSessions) : previewMode === "public" ? renderPublicSchedulePreview(timedSessions) : renderTimelinePreview(timedSessions)}
      </section>
    `;
  }

  function renderPosterPreview(timedSessions) {
    const posterDays = buildPosterDays(timedSessions).filter((day) => day.sessions.length).slice(0, 5);
    return `
      <div class="poster-preview poster-preview-v2" id="posterPreview">
        <img class="poster-watermark" src="assets/usa-diving-horizontal-white.png" alt="" />
        <div class="poster-content">
          <div class="poster-brand-row"><img src="assets/usa-diving-horizontal-white.png" alt="USA Diving" /></div>
          <div class="poster-title">${escapeHtml(state.meet.name)}<br /><span>Event Schedule</span></div>
          <div class="poster-days-grid">
            ${posterDays.map((day) => `
              <section class="poster-day-card">
                <div class="poster-date">${escapeHtml(day.label)}</div>
                ${day.sessions.map((session) => posterSession(session)).join("")}
              </section>
            `).join("")}
          </div>
        </div>
        <div class="poster-note">*The order of events within a given day is subject to change based on entries at the time of the late fee deadline.</div>
      </div>
    `;
  }

  function posterSession(session) {
    const name = sessionDisplayName(session);
    const timing = session.timing || calculateSessionTiming(session);
    const time = `${displayTime(timing.warmupStartMinutes)}-${displayTime(timing.sessionEndMinutes)}`;
    const events = session.events.map((event) => `<li>${event.manualSplit ? "Split - " : ""}${escapeHtml(eventDisplayName(event))}${event.round && event.round !== "Custom Block" ? ` <span>${escapeHtml(event.round)}</span>` : ""}</li>`).join("");
    return `<div class="poster-session"><h4>${escapeHtml(name)} <span>${escapeHtml(time)}</span></h4><ul>${events}</ul></div>`;
  }

  function buildPosterDays(timedSessions) {
    return state.meet.days.map((day) => {
      const sessions = timedSessions
        .filter((session) => session.dayId === day.id)
        .sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));
      return {
        id: day.id,
        label: dateLabel(day.date),
        sessions,
        left: sessions.filter((session) => !session.events.every((event) => event.round === "Final")),
        right: sessions.filter((session) => session.events.every((event) => event.round === "Final")),
      };
    });
  }

  function publicSessionTimeLabel(session) {
    const timing = session.timing || calculateSessionTiming(session);
    if (session.isOpenPracticeSession) {
      return `${displayTime(timing.eventStartMinutes)}-${displayTime(timing.sessionEndMinutes)}`;
    }
    return `${displayTime(timing.eventStartMinutes)}`;
  }

  function publicEventLine(session) {
    const timing = session.timing || calculateSessionTiming(session);
    if (session.isOpenPracticeSession) {
      const event = session.events[0] || {};
      const note = String(event.notes || "").trim();
      const type = sessionDisplayName(session);
      return `<article class="public-schedule-item public-practice-item">
        <div class="public-time-pill">${displayTime(timing.eventStartMinutes)}${state.outputSettings?.showEndTimes === false ? "" : `<span>${displayTime(timing.sessionEndMinutes)}</span>`}</div>
        <div class="public-item-body"><strong>${escapeHtml(type)}</strong><p>${escapeHtml(event.blockTitle || event.notes || "Open pool time")}</p>${note && state.outputSettings?.publicShowOpenPracticeNotes !== false ? `<em>${escapeHtml(note)}</em>` : ""}</div>
      </article>`;
    }
    const sessionName = sessionDisplayName(session);
    const sessionEvents = session.events.map((event) => `<li>${event.manualSplit ? `<span class="public-mini-chip">Split</span>` : ""}${escapeHtml(eventDisplayName(event))}${event.round && event.round !== "Custom Block" ? ` <small>${escapeHtml(event.round)}</small>` : ""}</li>`).join("");
    const warmup = state.outputSettings?.publicShowWarmups === false ? "" : `<span class="public-warmup">Warm-up ${displayTime(timing.warmupStartMinutes)}-${displayTime(timing.warmupEndMinutes)}</span>`;
    return `<article class="public-schedule-item">
      <div class="public-time-pill">${displayTime(timing.eventStartMinutes)}<span>${displayTime(timing.sessionEndMinutes)}</span></div>
      <div class="public-item-body"><div class="public-item-heading"><strong>${escapeHtml(sessionName)}</strong>${warmup}</div><ul>${sessionEvents}</ul></div>
    </article>`;
  }

  function renderPublicSchedulePreview(timedSessions) {
    const grouped = state.meet.days
      .map((day) => ({ day, sessions: timedSessions.filter((session) => session.dayId === day.id).sort((a,b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0)) }))
      .filter((group) => group.sessions.length);
    return `
      <div class="public-schedule-preview public-schedule-polished public-preset-${escapeHtml(state.outputSettings?.publicPreset || "clean")}" id="posterPreview">
        <section class="public-hero-card">
          <div><span class="public-kicker">USA Diving Event Schedule</span><h2>${escapeHtml(state.meet.name)}</h2><p>${escapeHtml(state.meet.venue || "")}${state.meet.venue ? " · " : ""}${escapeHtml(selectedTimeZoneOption().label)} · ${escapeHtml(publishStatusLabel())}</p></div>
          <img src="assets/usa-diving-horizontal-white.png" alt="USA Diving" />
        </section>
        <div class="public-output-controls public-designer-panel">
          <label>Public preset <select onchange="actions.setOutputSetting('publicPreset', this.value)">${Object.entries(PUBLIC_OUTPUT_PRESETS).map(([value, item]) => `<option value="${value}" ${value === (state.outputSettings?.publicPreset || "clean") ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
          <label><input type="checkbox" ${state.outputSettings?.publicShowWarmups !== false ? "checked" : ""} onchange="actions.setOutputSetting('publicShowWarmups', this.checked)" /> Show warm-up windows</label>
          <label><input type="checkbox" ${state.outputSettings?.publicShowOpenPracticeNotes !== false ? "checked" : ""} onchange="actions.setOutputSetting('publicShowOpenPracticeNotes', this.checked)" /> Show practice notes</label>
          <label><input type="checkbox" ${state.outputSettings?.showEndTimes !== false ? "checked" : ""} onchange="actions.setOutputSetting('showEndTimes', this.checked)" /> Show estimated end times</label>
          <label><input type="checkbox" ${state.outputSettings?.showSubjectToChange !== false ? "checked" : ""} onchange="actions.setOutputSetting('showSubjectToChange', this.checked)" /> Subject-to-change footer</label>
        </div>
        ${renderContextNotes({ audience: "public" })}
        <div class="public-day-grid polished-public-grid">
          ${grouped.map(({ day, sessions }, index) => `<section class="public-day-card polished-public-day"><div class="public-day-top"><span>Day ${index + 1}</span><h3>${escapeHtml(fullDayName(day))}</h3></div>${renderContextNotes({ dayId: day.id, audience: "public" })}<div class="public-session-list">${sessions.map(publicEventLine).join("")}</div></section>`).join("")}
        </div>
        ${state.outputSettings?.showSubjectToChange === false ? "" : `<div class="public-schedule-footer">${escapeHtml(timelineEndCapNote())} Schedule subject to change.</div>`}
      </div>
    `;
  }

  function renderTimelinePreview(timedSessions) {
    const pages = timelinePageGroups(timedSessions, 34);
    return `
      <div class="timeline-preview timeline-preview-by-day" id="timelinePreview">
        ${renderContextNotes({ audience: "operations" })}
        ${pages.map((page) => `
          <table class="timeline-table timeline-day-table timeline-page-table">
            <thead>
              <tr class="title"><th colspan="16">${escapeHtml(state.meet.name)}</th></tr>
              <tr>
                <th>Day / Session</th><th>Round</th><th>Event</th><th>Format</th><th>Panel Rotation</th><th># of Dives</th><th># of Divers</th><th>Seconds Per Dive</th><th>Event Time Minutes</th>
                <th>Open Practice Start</th><th>Open Practice End</th><th>Warm-Up Time Given</th><th>Warm-Up Start</th><th>Warm-Up End</th><th>Event Start</th><th>Event End</th>
              </tr>
            </thead>
            <tbody>${page.groups.map((group) => `<tr class="timeline-day-label"><td colspan="16">${escapeHtml(group.label)}</td></tr>${group.rows.map((row) => timelineRow(row)).join("")}`).join("")}</tbody>
          </table>
        `).join("")}
      </div>
    `;
  }

  function buildTimelineRows(timedSessions) {
    const rows = [];
    for (const day of state.meet.days) {
      const sessions = timedSessions.filter((session) => session.dayId === day.id);
      if (!sessions.length) continue;
      rows.push({ type: "separator", label: fullDayName(day).replace("\n", " ") });
      const dayRows = [];
      let pendingAwardEvents = [];
      sessions.forEach((session, sessionIndex) => {
        const isTraining = Boolean(session.autoTrainingForDayId);
        const isOpenPractice = Boolean(session.isOpenPracticeSession);
        dayRows.push({
          type: "session",
          stripe: sessionIndex % 2 ? "pink" : "blue",
          title: isTraining ? "Open Training" : isOpenPractice ? sessionDisplayName(session) : sessionDisplayName(session),
        });
        const finalsSession = sessionHasFinals(session);
        if (isTraining || isOpenPractice) {
          const trainingEvent = session.events[0];
          const timing = session.timing.events.find((item) => item.scheduleEventId === trainingEvent?.scheduleEventId);
          dayRows.push({
            type: "ceremony",
            stripe: sessionIndex % 2 ? "pink" : "blue",
            round: isOpenPractice ? sessionDisplayName(session) : "Training",
            event: isOpenPractice ? openPracticeTimelineLabel(trainingEvent) : "Open training before finals",
            eventMinutes: Number(timing?.eventMinutes || trainingEvent?.customDurationMinutes || 0),
            openStart: isOpenPractice ? displayTime(timing?.eventStartMinutes || session.timing.eventStartMinutes) : "",
            openEnd: isOpenPractice ? displayTime(timing?.eventEndMinutes || session.timing.sessionEndMinutes) : "",
            eventStart: displayTime(timing?.eventStartMinutes || session.timing.eventStartMinutes),
            eventEnd: displayTime(timing?.eventEndMinutes || session.timing.sessionEndMinutes),
          });
          return;
        }
        if (finalsSession && Number(session.timing.introductionMinutes || 0) > 0) {
          dayRows.push({
            type: "ceremony",
            stripe: sessionIndex % 2 ? "pink" : "blue",
            round: "Intro",
            event: "Introductions",
            eventMinutes: Number(session.timing.introductionMinutes || 0),
            eventStart: displayTime(session.timing.introductionStartMinutes),
            eventEnd: displayTime(session.timing.warmupStartMinutes),
          });
        }
        const groups = getEventGroups(session);
        groups.forEach((group) => {
          const combined = group.events.length > 1;
          group.events.forEach((event, eventIndex) => {
            const timing = session.timing.events.find((item) => item.scheduleEventId === event.scheduleEventId);
            dayRows.push({
              type: "event",
              stripe: sessionIndex % 2 ? "pink" : "blue",
              round: event.round,
              event: eventDisplayName(event),
              format: combined ? "Combined" : event.manualSplit ? "Split" : "",
              formatRowspan: combined && eventIndex === 0 ? group.events.length : 0,
              omitFormat: combined && eventIndex > 0,
              panelRotation: event.manualSplit ? splitPanelRotationText(event) : "",
              dives: event.round === "Custom Block" ? "" : event.numberOfDives,
              divers: event.round === "Custom Block" ? "" : event.numberOfDivers,
              seconds: event.round === "Custom Block" ? "" : event.secondsPerDive,
              eventMinutes: timing?.eventMinutes || 0,
              openStart: "",
              openEnd: "",
              warmupMinutes: session.warmupMinutes,
              warmupStart: displayTime(session.timing.warmupStartMinutes),
              warmupEnd: displayTime(session.timing.warmupEndMinutes),
              eventStart: displayTime(timing?.eventStartMinutes || session.timing.eventStartMinutes),
              eventEnd: displayTime(timing?.eventEndMinutes || session.timing.sessionEndMinutes),
              split: Boolean(event.manualSplit),
              combined,
            });
          });
        });
        if (finalsSession) {
          pendingAwardEvents.push(...session.events.filter((event) => event.round === "Final").map(eventDisplayName));
        }
        if (finalsSession && session.timing.awardsEnabled && Number(session.timing.awardsMinutes || 0) > 0) {
          dayRows.push({
            type: "ceremony",
            stripe: sessionIndex % 2 ? "pink" : "blue",
            round: "Awards",
            event: awardsEventLabel(pendingAwardEvents),
            eventMinutes: Number(session.timing.awardsMinutes || 0),
            eventStart: displayTime(session.timing.awardsStartMinutes),
            eventEnd: displayTime(session.timing.awardsEndMinutes),
          });
          pendingAwardEvents = [];
        }
      });
      if (dayRows.length) {
        dayRows.push({
          type: "endcap",
          note: timelineEndCapNote(),
        });
        dayRows[0].dayLabel = fullDayName(day);
        dayRows[0].dayRowspan = dayRows.length;
      }
      rows.push(...dayRows);
    }
    return rows;
  }

  function fullDayName(day) {
    const date = new Date(`${day.date}T00:00:00`);
    if (Number.isNaN(date.getTime())) return day.date;
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function dayCellForRow(row) {
    if (!row.dayRowspan) return "";
    return `<td class="day-cell" rowspan="${row.dayRowspan}">${escapeHtml(row.dayLabel || "").replace(/\n/g, "<br />")}</td>`;
  }

  function timelineRoundClass(round) {
    const normalized = String(round || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return normalized ? `round-${normalized}` : "round-none";
  }

  function timelineRow(row) {
    if (row.type === "separator") return `<tr class="separator"><td colspan="16">${escapeHtml(row.label || "")}</td></tr>`;
    const dayCell = dayCellForRow(row);
    if (row.type === "session") {
      return `<tr class="session-separator-row ${row.stripe === "pink" ? "pink-session" : "blue-session"}">
        ${dayCell}
        <td colspan="15" class="session-title-cell"><strong>${escapeHtml(row.title)}</strong></td>
      </tr>`;
    }
    if (row.type === "endcap") {
      return `<tr class="timeline-endcap-row">${dayCell}<td colspan="15">${escapeHtml(row.note || timelineEndCapNote())}</td></tr>`;
    }
    if (row.type === "ceremony") {
      const isOpenPractice = !["Intro", "Awards"].includes(row.round);
      return `
        <tr class="ceremony-row ${row.stripe === "pink" ? "pink-row" : "blue-row"} ${timelineRoundClass(row.round)} ${isOpenPractice ? "open-practice-wide-row" : ""}">
          ${dayCell}
          <td class="event-kind">${escapeHtml(row.round)}</td>
          <td colspan="6" class="ceremony-event-cell">${escapeHtml(row.event)}</td>
          <td>${row.eventMinutes.toFixed(1)}</td>
          <td>${escapeHtml(row.openStart || "")}</td>
          <td>${escapeHtml(row.openEnd || "")}</td>
          <td></td><td></td><td></td>
          <td>${row.eventStart}</td>
          <td>${row.eventEnd}</td>
        </tr>
      `;
    }
    const formatCell = row.omitFormat
      ? ""
      : `<td class="format-cell ${row.combined ? "combined-format-cell" : ""}" ${row.formatRowspan ? `rowspan="${row.formatRowspan}"` : ""}>${escapeHtml(row.format)}</td>`;
    return `
      <tr class="${row.stripe === "pink" ? "pink-row" : "blue-row"} ${timelineRoundClass(row.round)} ${row.split ? "split-row" : ""} ${row.combined ? "combined-row" : ""}">
        ${dayCell}
        <td class="event-kind">${escapeHtml(row.round)}</td>
        <td>${escapeHtml(row.event)}</td>
        ${formatCell}
        <td class="panel-rotation-cell">${escapeHtml(row.panelRotation)}</td>
        <td class="calc-head">${row.dives}</td>
        <td class="calc-head">${row.divers}</td>
        <td class="calc-head">${row.seconds}</td>
        <td>${row.eventMinutes.toFixed(1)}</td>
        <td>${row.openStart}</td>
        <td>${row.openEnd}</td>
        <td>${row.warmupMinutes}</td>
        <td>${row.warmupStart}</td>
        <td>${row.warmupEnd}</td>
        <td>${row.eventStart}</td>
        <td>${row.eventEnd}</td>
      </tr>
    `;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function filenameBase() {
    return state.meet.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "usa-diving-schedule";
  }

  function buildPosterCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 1700;
    canvas.height = 2200;
    const ctx = canvas.getContext("2d");
    const bg = new Image();
    bg.src = window.USAD_ASSETS.background;
    const logo = new Image();
    logo.src = window.USAD_ASSETS.logoWhite;
    return new Promise((resolve) => {
      let loaded = 0;
      const done = () => {
        loaded += 1;
        if (loaded < 2) return;
        drawPosterCanvas(ctx, bg, logo, canvas.width, canvas.height);
        resolve(canvas);
      };
      bg.onload = done;
      logo.onload = done;
    });
  }

  function drawPosterCanvas(ctx, bg, logo, width, height) {
    ctx.drawImage(bg, 0, 0, width, height);
    ctx.fillStyle = "rgba(23,31,105,0.84)";
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.10;
    ctx.drawImage(logo, width * 0.12, height * 0.35, width * 0.76, width * 0.23);
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.fillStyle = BRAND.white;
    ctx.font = "900 70px Arial";
    drawMultiline(ctx, state.meet.name, width / 2, 110, 82, width - 160);
    ctx.font = "900 58px Arial";
    ctx.fillText("Event Schedule", width / 2, 292);

    const days = buildPosterDays(allTimedSessions()).filter((day) => day.sessions.length).slice(0, 5);
    const top = 360;
    const bottom = height - 150;
    const dayGap = 24;
    const blockHeight = days.length ? (bottom - top - dayGap * (days.length - 1)) / days.length : 0;
    let y = top;
    days.forEach((day) => {
      drawPosterDayBlock(ctx, day, 120, y, width - 240, blockHeight);
      y += blockHeight + dayGap;
    });
    ctx.fillStyle = BRAND.white;
    ctx.font = "700 26px Arial";
    drawMultiline(ctx, "*The order of events within a given day is subject to change based on entries at the time of the late fee deadline.", width / 2, height - 88, 34, width - 180);
  }

  function drawPosterDayBlock(ctx, day, x, y, w, h) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(ctx, x, y, w, h, 18, true, false);
    ctx.fillStyle = BRAND.blue;
    ctx.font = "900 38px Arial";
    ctx.textAlign = "left";
    ctx.fillText(day.label, x + 24, y + 50);
    ctx.fillStyle = BRAND.red;
    ctx.fillRect(x, y, 12, h);
    const sessions = day.sessions.slice(0, 8);
    const colCount = sessions.length > 4 ? 2 : 1;
    const colWidth = (w - 58) / colCount;
    sessions.forEach((session, index) => {
      const col = index % colCount;
      const row = Math.floor(index / colCount);
      const rowHeight = (h - 78) / Math.ceil(sessions.length / colCount);
      const sx = x + 26 + col * colWidth;
      const sy = y + 75 + row * rowHeight;
      drawPosterSessionCard(ctx, session, sx, sy, colWidth - 18, rowHeight - 10);
    });
  }

  function drawPosterSessionCard(ctx, session, x, y, w, h) {
    const timing = session.timing || calculateSessionTiming(session);
    ctx.fillStyle = "rgba(143,195,234,0.18)";
    roundRect(ctx, x, y, w, h, 12, true, false);
    ctx.fillStyle = BRAND.blue;
    ctx.font = "900 24px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`${sessionDisplayName(session)}  ${displayTime(timing.warmupStartMinutes)}-${displayTime(timing.sessionEndMinutes)}`, x + 14, y + 30);
    ctx.fillStyle = "#20254a";
    ctx.font = "700 22px Arial";
    let cursor = y + 62;
    session.events.slice(0, 5).forEach((event) => {
      drawMultiline(ctx, `• ${event.manualSplit ? "Split - " : ""}${eventDisplayName(event)} ${event.round && event.round !== "Custom Block" ? event.round : ""}`.trim(), x + 14, cursor, 26, w - 28);
      cursor += 30;
    });
    if (session.events.length > 5) {
      ctx.fillText(`+${session.events.length - 5} more`, x + 14, Math.min(y + h - 12, cursor));
    }
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function timelineDayGroups(timedSessions) {
    const groups = [];
    let current = null;
    buildTimelineRows(timedSessions).forEach((row) => {
      if (row.type === "separator") {
        current = { label: row.label, rows: [] };
        groups.push(current);
      } else if (current) {
        current.rows.push(row);
      }
    });
    return groups.filter((group) => group.rows.length);
  }

  function timelinePageGroups(timedSessions, maxRows = 30) {
    const groups = timelineDayGroups(timedSessions);
    const pages = [];
    let current = { groups: [], rowCount: 0 };
    groups.forEach((group) => {
      const groupRows = group.rows.length + 1;
      if (current.groups.length && current.rowCount + groupRows > maxRows) {
        pages.push(current);
        current = { groups: [], rowCount: 0 };
      }
      current.groups.push(group);
      current.rowCount += groupRows;
    });
    if (current.groups.length) pages.push(current);
    return pages;
  }

  function timelineTableHeader() {
    return `
      <thead>
        <tr>
          <th>Day / Session</th><th>Round</th><th>Event</th><th>Format</th><th>Panel Rotation</th><th># of Dives</th><th># of Divers</th><th>Seconds Per Dive</th><th>Event Time Minutes</th>
          <th>Open Practice Start</th><th>Open Practice End</th><th>Warm-Up Time Given</th><th>Warm-Up Start</th><th>Warm-Up End</th><th>Event Start</th><th>Event End</th>
        </tr>
      </thead>`;
  }

  function buildTimelinePrintHtml(timedSessions) {
    const pages = timelinePageGroups(timedSessions, 42);
    const styles = `
      @page { size: letter landscape; margin: 0.18in; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      html, body { background: #ffffff; color: ${BRAND.blue}; font-family: Arial, sans-serif; margin: 0; }
      .print-day-page { break-after: page; page-break-after: always; width: 100%; min-height: 7.8in; }
      .print-day-page:last-child { break-after: auto; page-break-after: auto; }
      .print-title { background: ${BRAND.blue}; color: #fff; font-size: 13px; font-weight: 900; padding: 7px 8px; text-align: center; width: 100%; }
      .timeline-table .timeline-day-label td { background: #c9142f !important; color: #fff !important; font-size: 8.2px; font-weight: 900; letter-spacing: .02em; padding: 4px 6px; text-align: center !important; }
      .timeline-table { border-collapse: collapse; table-layout: fixed; width: 100%; }
      .timeline-table th, .timeline-table td { border: 0.6px solid #1a3c66; font-size: 6.4px; line-height: 1.08; padding: 2px 2px; text-align: center; vertical-align: middle; word-break: normal; overflow-wrap: anywhere; }
      .timeline-table th { background: #ffffff; color: ${BRAND.blue}; font-weight: 900; }
      .timeline-table .day-cell { background: #e7f5fc !important; color: ${BRAND.blue} !important; font-weight: 900; text-align: center !important; vertical-align: middle !important; width: 0.72in; white-space: normal; }
      .timeline-table .event-kind { background: #c8f0f7 !important; color: ${BRAND.blue} !important; font-weight: 900; width: 0.42in; }
      .timeline-table .session-separator-row td:not(.day-cell) { background: #eef0f3 !important; color: ${BRAND.blue} !important; font-weight: 900; height: 20px; text-align: center !important; vertical-align: middle !important; }
      .timeline-table .session-title-cell strong { color: ${BRAND.blue} !important; display: inline-block; text-align: center; width: 100%; }
      .timeline-table .timeline-endcap-row td:not(.day-cell) { background: ${BRAND.blue} !important; color: #fff !important; font-weight: 900; font-size: 6.2px; text-align: center !important; }
      .timeline-table .blue-row td:not(.day-cell), .timeline-table .pink-row td:not(.day-cell), .timeline-table .ceremony-row td:not(.day-cell) { background: #ffffff !important; color: ${BRAND.blue}; }
      .timeline-table .round-qualifier td:not(.day-cell) { background: #eff9fb !important; }
      .timeline-table .round-prelim td:not(.day-cell) { background: #fff6f7 !important; }
      .timeline-table .round-semifinal td:not(.day-cell) { background: #f3f4f6 !important; }
      .timeline-table .round-final td:not(.day-cell) { background: #fdecef !important; }
      .timeline-table .round-open-practice td:not(.day-cell), .timeline-table .round-training td:not(.day-cell), .timeline-table .round-intro td:not(.day-cell), .timeline-table .round-awards td:not(.day-cell) { background: #f5f6f8 !important; }
      .timeline-table .split-row td:not(.day-cell) { box-shadow: inset 2px 0 0 ${BRAND.cyan} !important; }
      .timeline-table .combined-format-cell { background: #f7d8df !important; color: ${BRAND.blue} !important; font-weight: 900; }
      .timeline-table .panel-rotation-cell { font-size: 5.8px; }
      .timeline-table th:nth-child(1), .timeline-table td.day-cell { width: 0.72in; }
      .timeline-table th:nth-child(2) { width: 0.43in; }
      .timeline-table th:nth-child(3) { width: 1.55in; }
      .timeline-table th:nth-child(4) { width: 0.42in; }
      .timeline-table th:nth-child(5) { width: 1.38in; }
      .timeline-table th:nth-child(n+6) { width: 0.58in; }
    `;
    const pageHtml = pages.map((page) => `
      <section class="print-day-page">
        <table class="timeline-table">
          <thead><tr class="title"><th colspan="16">${escapeHtml(state.meet.name)}</th></tr>${timelineTableHeader().replace(/^\s*<thead>|<\/thead>\s*$/g, "")}</thead>
          <tbody>${page.groups.map((group) => `<tr class="timeline-day-label"><td colspan="16">${escapeHtml(group.label)}</td></tr>${group.rows.map((row) => timelineRow(row)).join("")}`).join("")}</tbody>
        </table>
      </section>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(state.meet.name)} Timeline PDF</title><style>${styles}</style></head><body>${pageHtml}</body></html>`;
  }

  function openTimelinePrintWindow() {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Your browser blocked the PDF window. Allow pop-ups for this app, then click PDF again.");
      return;
    }
    win.document.open();
    win.document.write(buildTimelinePrintHtml(allTimedSessions()));
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 450);
  }

  async function exportCanvas(type) {
    const canvas = await buildPosterCanvas();
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${filenameBase()}-daily-schedule.${type === "jpeg" ? "jpg" : "png"}`);
    }, `image/${type}`, 0.96);
  }

  function buildPosterSvg() {
    const days = buildPosterDays(allTimedSessions()).filter((day) => day.sessions.length).slice(0, 5);
    const width = 1700;
    const height = 2200;
    const safeTitle = escapeHtml(state.meet.name);
    const top = 360;
    const bottom = height - 150;
    const gap = 24;
    const blockHeight = days.length ? (bottom - top - gap * (days.length - 1)) / days.length : 0;
    let y = top;
    let body = "";
    days.forEach((day) => {
      body += svgPosterDay(day, 120, y, width - 240, blockHeight);
      y += blockHeight + gap;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <image href="${window.USAD_ASSETS.background}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
      <rect width="${width}" height="${height}" fill="${BRAND.blue}" opacity="0.84"/>
      <image href="${window.USAD_ASSETS.logoWhite}" x="${width * 0.12}" y="${height * 0.35}" width="${width * 0.76}" opacity="0.10"/>
      <text x="${width / 2}" y="120" fill="${BRAND.white}" font-size="70" font-weight="900" text-anchor="middle" font-family="Arial">${safeTitle}</text>
      <text x="${width / 2}" y="292" fill="${BRAND.white}" font-size="58" font-weight="900" text-anchor="middle" font-family="Arial">Event Schedule</text>
      ${body}
      <text x="${width / 2}" y="${height - 80}" fill="${BRAND.white}" font-size="26" font-weight="700" text-anchor="middle" font-family="Arial">*The order of events within a given day is subject to change based on entries at the time of the late fee deadline.</text>
    </svg>`;
  }

  function svgPosterDay(day, x, y, w, h) {
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="white" opacity="0.92"/><rect x="${x}" y="${y}" width="12" height="${h}" fill="${BRAND.red}"/><text x="${x + 24}" y="${y + 50}" fill="${BRAND.blue}" font-size="38" font-weight="900" font-family="Arial">${escapeHtml(day.label)}</text>`;
    const sessions = day.sessions.slice(0, 8);
    const colCount = sessions.length > 4 ? 2 : 1;
    const colWidth = (w - 58) / colCount;
    sessions.forEach((session, index) => {
      const col = index % colCount;
      const row = Math.floor(index / colCount);
      const rowHeight = (h - 78) / Math.ceil(sessions.length / colCount);
      out += svgPosterSession(session, x + 26 + col * colWidth, y + 75 + row * rowHeight, colWidth - 18, rowHeight - 10);
    });
    return out;
  }

  function svgPosterSession(session, x, y, w, h) {
    const timing = session.timing || calculateSessionTiming(session);
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${BRAND.lightBlue}" opacity="0.18"/><text x="${x + 14}" y="${y + 30}" fill="${BRAND.blue}" font-size="24" font-weight="900" font-family="Arial">${escapeHtml(sessionDisplayName(session))} ${escapeHtml(displayTime(timing.warmupStartMinutes))}-${escapeHtml(displayTime(timing.sessionEndMinutes))}</text>`;
    let cursor = y + 62;
    session.events.slice(0, 5).forEach((event) => {
      const text = `• ${event.manualSplit ? "Split - " : ""}${eventDisplayName(event)} ${event.round && event.round !== "Custom Block" ? event.round : ""}`.trim();
      out += `<text x="${x + 14}" y="${cursor}" fill="#20254a" font-size="22" font-weight="700" font-family="Arial">${escapeHtml(text)}</text>`;
      cursor += 30;
    });
    if (session.events.length > 5) out += `<text x="${x + 14}" y="${Math.min(y + h - 12, cursor)}" fill="#20254a" font-size="22" font-weight="700" font-family="Arial">+${session.events.length - 5} more</text>`;
    return out;
  }

  function exportWorkbookHtml() {
    const timedSessions = allTimedSessions();
    const timeline = renderTimelinePreview(timedSessions);
    const posterRows = buildPosterDays(timedSessions).flatMap((day) => day.sessions.map((session) => [
      day.label,
      sessionDisplayName(session),
      session.events.map((event) => `${event.manualSplit ? "Split - " : ""}${eventDisplayName(event)}${event.round && event.round !== "Custom Block" ? ` ${event.round}` : ""}`).join("; ")
    ]));
    const dailyTable = `
      <table>
        <tr><th colspan="3" style="background:${BRAND.blue};color:white;font-size:18px">${escapeHtml(state.meet.name)} - Canva Daily Schedule Data</th></tr>
        <tr style="background:${BRAND.red};color:white"><th>Date</th><th>Group</th><th>Events</th></tr>
        ${posterRows.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td></tr>`).join("")}
      </table>`;
    const html = `
      <html><head><meta charset="utf-8" /></head><body>
        ${dailyTable}
        <br />
        ${timeline.replace("<div class=\"timeline-preview\" id=\"timelinePreview\">", "").replace("</div>", "")}
      </body></html>`;
    downloadBlob(new Blob([html], { type: "application/vnd.ms-excel" }), `${filenameBase()}-schedule.xls`);
  }

  function clearEventDragMarkers() {
    clearTimeout(combineHoverTimer);
    combineHoverTimer = 0;
    combineHoverEventId = "";
    document.querySelectorAll(".event-drop-target, .combine-ready, .event-dragging, .stack-drop-ready").forEach((node) => node.classList.remove("event-drop-target", "combine-ready", "event-dragging", "stack-drop-ready"));
  }

  function stopDragAutoScroll() {
    lastDragScrollEvent = null;
    if (dragScrollFrame) window.cancelAnimationFrame(dragScrollFrame);
    dragScrollFrame = 0;
    document.body.classList.remove("schedule-drag-active");
  }

  function scrollOneContainer(container, event) {
    if (!container || !event) return false;
    const rect = container === document.scrollingElement
      ? { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth }
      : container.getBoundingClientRect();
    const edge = 88;
    const maxSpeed = 34;
    let dx = 0;
    let dy = 0;
    if (event.clientY < rect.top + edge) dy = -Math.ceil(maxSpeed * (1 - Math.max(0, event.clientY - rect.top) / edge));
    if (event.clientY > rect.bottom - edge) dy = Math.ceil(maxSpeed * (1 - Math.max(0, rect.bottom - event.clientY) / edge));
    if (event.clientX < rect.left + edge) dx = -Math.ceil(maxSpeed * (1 - Math.max(0, event.clientX - rect.left) / edge));
    if (event.clientX > rect.right - edge) dx = Math.ceil(maxSpeed * (1 - Math.max(0, rect.right - event.clientX) / edge));
    if (dx) container.scrollLeft += dx;
    if (dy) container.scrollTop += dy;
    return Boolean(dx || dy);
  }

  function autoScrollDuringDrag(event) {
    if (!dragSessionId && !dragEventId) return;
    lastDragScrollEvent = event;
    if (dragScrollFrame) return;
    dragScrollFrame = window.requestAnimationFrame(function tick() {
      const activeEvent = lastDragScrollEvent;
      if (!activeEvent || (!dragSessionId && !dragEventId)) {
        stopDragAutoScroll();
        return;
      }
      const board = document.querySelector(".day-board");
      const scrolledBoard = scrollOneContainer(board, activeEvent);
      const scrolledPage = scrollOneContainer(document.scrollingElement || document.documentElement, activeEvent);
      dragScrollFrame = (scrolledBoard || scrolledPage) ? window.requestAnimationFrame(tick) : 0;
    });
  }

  function clearPointerDropMarkers() {
    document.querySelectorAll(".pointer-drop-active, .pointer-drop-ready, .pointer-combine-ready, .pointer-drag-source").forEach((node) => {
      node.classList.remove("pointer-drop-active", "pointer-drop-ready", "pointer-combine-ready", "pointer-drag-source");
    });
  }

  function createPointerDragGhost(kind, idValue, event) {
    const ghost = document.createElement("div");
    ghost.className = "pointer-drag-ghost";
    let label = kind === "session" ? "Session" : "Event";
    if (kind === "session") {
      const session = state.sessions.find((item) => item.id === idValue);
      label = session ? `${sessionDisplayName(session)} - ${sessionEventSummary(session, 2)}` : "Session";
    } else {
      const located = findEventLocation(state, idValue);
      label = located ? eventDisplayName(located.event) : "Event";
    }
    ghost.textContent = label;
    document.body.appendChild(ghost);
    updatePointerDragGhost(event);
    return ghost;
  }

  function updatePointerDragGhost(event) {
    if (!pointerDragGhost || !event) return;
    pointerDragGhost.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
  }

  function removePointerDragGhost() {
    if (pointerDragGhost) pointerDragGhost.remove();
    pointerDragGhost = null;
  }

  function pointerElementFromEvent(event) {
    if (!event) return null;
    if (pointerDragGhost) pointerDragGhost.style.display = "none";
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (pointerDragGhost) pointerDragGhost.style.display = "block";
    return element;
  }

  function pointerDragMove(event) {
    if (!pointerDragState) return;
    event.preventDefault();
    lastDragScrollEvent = event;
    autoScrollDuringDrag(event);
    updatePointerDragGhost(event);
    clearPointerDropMarkers();
    pointerDragState.drop = null;

    const element = pointerElementFromEvent(event);
    if (!element) return;

    if (pointerDragState.kind === "session") {
      const slot = element.closest(".session-slot-drop-zone");
      if (slot) {
        slot.classList.add("pointer-drop-active");
        pointerDragState.drop = {
          type: "session-slot",
          dayId: slot.dataset.day || "",
          targetSessionId: slot.dataset.targetSession || "",
          position: slot.dataset.position || "end",
        };
        return;
      }
      const lane = element.closest(".day-lane");
      if (lane) {
        lane.classList.add("pointer-drop-ready");
        pointerDragState.drop = { type: "day-end", dayId: lane.dataset.day || "" };
      }
      return;
    }

    if (pointerDragState.kind === "event") {
      const targetEvent = element.closest(".scheduled-event");
      if (targetEvent && targetEvent.dataset.eventId && targetEvent.dataset.eventId !== pointerDragState.id) {
        const targetSession = targetEvent.closest(".session-card");
        const targetEventId = targetEvent.dataset.eventId;
        targetEvent.classList.add("pointer-drop-active");
        if (pointerDragHoverId !== targetEventId) {
          pointerDragHoverId = targetEventId;
          pointerDragHoverStartedAt = Date.now();
        }
        const combineReady = Date.now() - pointerDragHoverStartedAt >= 650;
        if (combineReady) targetEvent.classList.add("pointer-combine-ready");
        pointerDragState.drop = {
          type: "event-on-event",
          targetSessionId: targetSession?.dataset.sessionId || "",
          targetEventId,
          combine: combineReady,
        };
        return;
      }
      pointerDragHoverId = "";
      pointerDragHoverStartedAt = 0;
      const stack = element.closest(".event-stack");
      const targetSession = stack?.closest(".session-card");
      if (stack && targetSession?.dataset.sessionId) {
        stack.classList.add("pointer-drop-ready");
        pointerDragState.drop = { type: "event-in-session", targetSessionId: targetSession.dataset.sessionId };
      }
    }
  }

  function pointerDragUp(event) {
    if (!pointerDragState) return;
    event.preventDefault();
    const drop = pointerDragState.drop;
    const kind = pointerDragState.kind;
    const idValue = pointerDragState.id;
    pointerDragState = null;
    pointerDragHoverId = "";
    pointerDragHoverStartedAt = 0;
    dragSessionId = "";
    dragEventId = "";
    stopDragAutoScroll();
    removePointerDragGhost();
    clearPointerDropMarkers();
    window.removeEventListener("pointermove", pointerDragMove, true);
    window.removeEventListener("pointerup", pointerDragUp, true);
    window.removeEventListener("pointercancel", pointerDragCancel, true);

    if (!drop) return;
    if (kind === "session") {
      update((draft) => {
        if (drop.type === "session-slot") moveSessionToSlot(draft, idValue, drop.dayId, drop.targetSessionId, drop.position);
        if (drop.type === "day-end") moveSessionToSlot(draft, idValue, drop.dayId, "", "end");
      });
      return;
    }
    if (kind === "event") {
      if (drop.type === "event-in-session") moveScheduledEvent(idValue, drop.targetSessionId, null, false);
      if (drop.type === "event-on-event") moveScheduledEvent(idValue, drop.targetSessionId, drop.targetEventId, Boolean(drop.combine));
    }
  }

  function pointerDragCancel() {
    pointerDragState = null;
    pointerDragHoverId = "";
    pointerDragHoverStartedAt = 0;
    dragSessionId = "";
    dragEventId = "";
    stopDragAutoScroll();
    removePointerDragGhost();
    clearPointerDropMarkers();
    window.removeEventListener("pointermove", pointerDragMove, true);
    window.removeEventListener("pointerup", pointerDragUp, true);
    window.removeEventListener("pointercancel", pointerDragCancel, true);
  }

  function findEventLocation(draft, eventId) {
    for (const session of draft.sessions) {
      const index = session.events.findIndex((event) => event.scheduleEventId === eventId);
      if (index !== -1) return { session, index, event: session.events[index] };
    }
    return null;
  }

  function autoFinalSessionsForDay(draft, dayId) {
    const sessionIndex = new Map(draft.sessions.map((session, index) => [session.id, index]));
    return draft.sessions
      .filter((session) => session.dayId === dayId && session.autoFinalForSessionId && sessionHasFinals(session))
      .sort((a, b) => {
        const sourceA = draft.sessions.find((session) => session.id === a.autoFinalForSessionId);
        const sourceB = draft.sessions.find((session) => session.id === b.autoFinalForSessionId);
        const sourceTime = Number(sourceA?.warmupStartMinutes || 0) - Number(sourceB?.warmupStartMinutes || 0);
        if (sourceTime) return sourceTime;
        return (sessionIndex.get(a.id) ?? 9999) - (sessionIndex.get(b.id) ?? 9999);
      });
  }

  function createOpenTrainingEvent(minutes) {
    return {
      id: id("open-training-preset"),
      scheduleEventId: id("event"),
      eventGroupId: id("group"),
      level: "Open",
      gender: "",
      apparatus: "Training",
      style: "Open Training",
      round: "Custom Block",
      canonicalKey: `open training | ${id("block")}`,
      defaultDives: 0,
      defaultNumberOfDives: 0,
      numberOfDives: 0,
      numberOfDivers: 0,
      secondsPerDive: 0,
      numberOfDivesLocked: false,
      secondsPerDiveLocked: false,
      numberOfPanelChanges: 0,
      minutesPerPanelChange: 0,
      customDurationMinutes: Math.max(0, Number(minutes || 0)),
      manualSplit: false,
      detailsOpen: false,
      notes: "Open training before finals.",
    };
  }


  function createOpenPracticeEvent(minutes, notes = "Open practice.", title = "Open Practice") {
    return {
      id: id("open-practice-preset"),
      scheduleEventId: id("event"),
      eventGroupId: id("group"),
      level: "Open",
      gender: "",
      apparatus: "Practice",
      style: title,
      round: "Open Practice",
      blockTitle: title,
      canonicalKey: `open practice | ${id("block")}`,
      defaultDives: 0,
      defaultNumberOfDives: 0,
      numberOfDives: 0,
      numberOfDivers: 0,
      secondsPerDive: 0,
      numberOfDivesLocked: false,
      secondsPerDiveLocked: false,
      numberOfPanelChanges: 0,
      minutesPerPanelChange: 0,
      customDurationMinutes: Math.max(0, Number(minutes || 0)),
      manualSplit: false,
      detailsOpen: false,
      notes,
    };
  }

  function createOpenPracticeSession(dayId, fullDay = false, startOverride = null, endOverride = null, noteOverride = "") {
    const day = state.meet.days.find((item) => item.id === dayId) || state.meet.days[0];
    const rounding = Number(state.profile.timingDefaults.roundingIncrementMinutes || 5);
    const sessionsForDay = allTimedSessions().filter((session) => session.dayId === day.id);
    const latestEnd = sessionsForDay.reduce((latest, session) => Math.max(latest, Number(session.timing?.sessionEndMinutes || session.warmupStartMinutes || 0)), 0);
    const defaultStart = fullDay ? Number(day.openMinutes || parseTime("07:00")) : roundUp(latestEnd || Number(day.openMinutes || parseTime("07:00")), rounding);
    const start = Number.isFinite(Number(startOverride)) ? Number(startOverride) : defaultStart;
    const defaultEnd = fullDay ? Number(day.closeMinutes || start + 480) : start + 60;
    const end = Math.max(start, Number.isFinite(Number(endOverride)) ? Number(endOverride) : defaultEnd);
    const duration = Math.max(0, end - start);
    const practiceEvent = createOpenPracticeEvent(duration, noteOverride || (fullDay ? "Full-day open practice." : "Open practice block."), "Open Practice");
    return {
      id: id("session"),
      dayId: day.id,
      title: "Open Pool / Open Practice",
      isOpenPracticeSession: true,
      warmupStartMinutes: start,
      warmupMinutes: 0,
      transitionBufferMinutes: 0,
      roundingIncrementMinutes: rounding,
      locked: false,
      collapsed: false,
      awardsEnabled: false,
      events: [practiceEvent],
    };
  }

  function reflowSameDayFinals(draft, dayId) {
    const finalsSessions = autoFinalSessionsForDay(draft, dayId);
    const rounding = Number(draft.profile.timingDefaults.roundingIncrementMinutes || defaultTiming.roundingIncrementMinutes || 5);
    const mode = draft.profile.timingDefaults.finalsTransitionMode || defaultTiming.finalsTransitionMode || "openTraining";
    const transitionMinutes = Math.max(0, Number(draft.profile.timingDefaults.finalsTransitionMinutes ?? defaultTiming.finalsTransitionMinutes ?? 45));
    const daySessions = draft.sessions.filter((session) => session.dayId === dayId);
    const prelimSessions = daySessions.filter((session) => !sessionHasFinals(session) && !session.autoTrainingForDayId);
    let cursor = prelimSessions.reduce((latest, session) => {
      const timing = calculateSessionTiming(session);
      return Math.max(latest, timing.sessionEndMinutes || session.warmupStartMinutes || 0);
    }, 0);
    if (!cursor) {
      const day = draft.meet.days.find((item) => item.id === dayId);
      cursor = day?.openMinutes || parseTime("08:00");
    }
    let trainingSession = draft.sessions.find((session) => session.autoTrainingForDayId === dayId);
    if (mode === "openTraining" && finalsSessions.length && transitionMinutes > 0) {
      if (!trainingSession) {
        const trainingEvent = createOpenTrainingEvent(transitionMinutes);
        trainingSession = {
          id: id("session"),
          dayId,
          title: "Open Training",
          autoTrainingForDayId: dayId,
          warmupStartMinutes: roundUp(cursor, rounding),
          warmupMinutes: 0,
          transitionBufferMinutes: 0,
          roundingIncrementMinutes: rounding,
          locked: false,
          collapsed: true,
          awardsEnabled: false,
          events: [trainingEvent],
        };
        draft.sessions.push(trainingSession);
      }
      trainingSession.warmupStartMinutes = roundUp(cursor, rounding);
      trainingSession.warmupMinutes = 0;
      trainingSession.transitionBufferMinutes = 0;
      trainingSession.roundingIncrementMinutes = rounding;
      trainingSession.collapsed = true;
      trainingSession.events = trainingSession.events && trainingSession.events.length ? trainingSession.events : [createOpenTrainingEvent(transitionMinutes)];
      trainingSession.events[0].customDurationMinutes = transitionMinutes;
      trainingSession.events[0].detailsOpen = false;
      cursor = trainingSession.warmupStartMinutes + transitionMinutes;
    } else {
      draft.sessions = draft.sessions.filter((session) => session.autoTrainingForDayId !== dayId);
      if (mode === "manualGap") cursor += transitionMinutes;
    }
    finalsSessions.forEach((session) => {
      const intro = sessionHasFinals(session) ? Number(draft.profile.timingDefaults.introductionsMinutes ?? defaultTiming.introductionsMinutes ?? 10) : 0;
      session.warmupStartMinutes = roundUp(cursor + intro, Number(session.roundingIncrementMinutes || rounding));
      session.collapsed = false;
      const timing = calculateSessionTiming(session);
      cursor = timing.sessionEndMinutes;
    });
  }

  function createAutoFinalIfNeeded(draft, preset, sourceEvent, sourceSession) {
    const rule = finalAutoRuleForRound(draft.profile, sourceEvent.round);
    if (!rule || !preset || !preset.allowedRounds.includes("Final")) return;
    const finalKey = relatedFinalKey(sourceEvent);
    if (draft.sessions.flatMap((session) => session.events).some((event) => event.canonicalKey === finalKey)) return;
    const finalEvent = createScheduledEvent(preset, "Final", draft.profile);
    finalEvent.numberOfDivers = 12;
    finalEvent.detailsOpen = false;
    finalEvent.autoCreatedFromEventId = sourceEvent.scheduleEventId;
    finalEvent.autoCreatedFromSessionId = sourceSession.id;
    finalEvent.autoCreatedReason = `${sourceEvent.round} to Final ${rule.relationship}`;

    let finalSession = draft.sessions.find((session) => session.autoFinalForSessionId === sourceSession.id && session.dayId === sourceSession.dayId);
    if (!finalSession) {
      const sourceTiming = calculateSessionTiming(sourceSession);
      finalSession = createSession(finalEvent);
      finalSession.dayId = sourceSession.dayId;
      finalSession.title = "Finals";
      finalSession.autoFinalForSessionId = sourceSession.id;
      finalSession.warmupStartMinutes = roundUp((sourceTiming.sessionEndMinutes || sourceSession.warmupStartMinutes) + Number(draft.profile.timingDefaults.introductionsMinutes ?? defaultTiming.introductionsMinutes ?? 10), sourceSession.roundingIncrementMinutes || draft.profile.timingDefaults.roundingIncrementMinutes || 5);
      finalSession.warmupMinutes = Math.max(Number(finalSession.warmupMinutes || 0), Number(finalEvent.defaultWarmupMinutes || 0), Number(draft.profile.timingDefaults.warmupMinutes || 0));
      finalSession.events = [];
      finalSession.awardsEnabled = true;
      finalSession.collapsed = false;
      draft.sessions.push(finalSession);
    }

    const matchingSourceGroupIds = new Set(
      sourceSession.events
        .filter((event) => event.eventGroupId === sourceEvent.eventGroupId)
        .map((event) => event.scheduleEventId)
    );
    const existingFinalInGroup = finalSession.events.find((event) => matchingSourceGroupIds.has(event.autoCreatedFromEventId));
    finalEvent.eventGroupId = existingFinalInGroup ? existingFinalInGroup.eventGroupId : id("group");
    finalSession.events.push(finalEvent);
    reflowSameDayFinals(draft, sourceSession.dayId);
  }

  function sortedSessionsForDay(draft, dayId, excludeSessionId = "") {
    const originalOrder = new Map(draft.sessions.map((session, index) => [session.id, index]));
    return draft.sessions
      .filter((session) => session.dayId === dayId && session.id !== excludeSessionId)
      .sort((a, b) => {
        const timeCompare = Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
        if (timeCompare) return timeCompare;
        return (originalOrder.get(a.id) ?? 9999) - (originalOrder.get(b.id) ?? 9999);
      });
  }

  function normalizeSessionOrderForDay(draft, dayId, orderedSessions) {
    const day = draft.meet.days.find((item) => item.id === dayId);
    if (!day || !orderedSessions.length) return;
    const rounding = Number(draft.profile.timingDefaults.roundingIncrementMinutes || defaultTiming.roundingIncrementMinutes || 5);
    const existingStarts = orderedSessions
      .map((session) => Number(session.warmupStartMinutes || 0))
      .filter((minutes) => Number.isFinite(minutes) && minutes > 0);
    let cursor = Math.max(Number(day.openMinutes || 0), existingStarts.length ? Math.min(...existingStarts) : Number(day.openMinutes || 0));
    orderedSessions.forEach((session) => {
      const sessionRounding = Number(session.roundingIncrementMinutes || rounding || 5);
      const introMinutes = sessionHasFinals(session) ? Number(draft.profile.timingDefaults.introductionsMinutes ?? defaultTiming.introductionsMinutes ?? 10) : 0;
      session.dayId = dayId;
      if (isManualScheduleBlock(session)) {
        const timing = calculateSessionTiming(session);
        cursor = Math.max(cursor, roundUp(timing.sessionEndMinutes, sessionRounding));
        return;
      }
      const requestedStart = Number(session.warmupStartMinutes || cursor);
      session.warmupStartMinutes = roundUp(Math.max(requestedStart, cursor + introMinutes), sessionRounding);
      const timing = calculateSessionTiming(session);
      cursor = roundUp(timing.sessionEndMinutes, sessionRounding);
    });
  }

  function moveSessionToSlot(draft, sourceSessionId, targetDayId, targetSessionId, position) {
    const source = draft.sessions.find((session) => session.id === sourceSessionId);
    const targetDay = draft.meet.days.find((day) => day.id === targetDayId);
    if (!source || !targetDay) return;
    const sourceDay = draft.meet.days.find((day) => day.id === source.dayId);
    if (targetDay.locked || sourceDay?.locked) return;
    const sourceDayId = source.dayId;
    source.dayId = targetDayId;
    source.locked = false;
    const targetDaySessions = sortedSessionsForDay(draft, targetDayId, sourceSessionId);
    let insertIndex = targetDaySessions.length;
    if (targetSessionId) {
      const targetIndex = targetDaySessions.findIndex((session) => session.id === targetSessionId);
      if (targetIndex !== -1) insertIndex = targetIndex + (position === "after" ? 1 : 0);
    } else if (position === "before") {
      insertIndex = 0;
    }
    targetDaySessions.splice(insertIndex, 0, source);
    normalizeSessionOrderForDay(draft, targetDayId, targetDaySessions);
    if (sourceDayId !== targetDayId) {
      normalizeSessionOrderForDay(draft, sourceDayId, sortedSessionsForDay(draft, sourceDayId));
    }
  }

  function moveSessionStepByIndex(draft, sessionId, direction) {
    const session = draft.sessions.find((item) => item.id === sessionId);
    if (!session) return;
    const ordered = sortedSessionsForDay(draft, session.dayId);
    const index = ordered.findIndex((item) => item.id === sessionId);
    if (index < 0) return;
    const nextIndex = Math.max(0, Math.min(ordered.length - 1, index + Number(direction || 0)));
    if (nextIndex === index) return;
    const [moved] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, moved);
    ordered.forEach((item) => { item.locked = false; });
    normalizeSessionOrderForDay(draft, session.dayId, ordered);
  }

  function moveSessionDayByOffset(draft, sessionId, offset) {
    const session = draft.sessions.find((item) => item.id === sessionId);
    if (!session) return;
    const currentDayIndex = draft.meet.days.findIndex((day) => day.id === session.dayId);
    const nextDay = draft.meet.days[currentDayIndex + Number(offset || 0)];
    if (!nextDay) return;
    moveSessionToSlot(draft, sessionId, nextDay.id, "", "end");
  }

  function moveEventStepByIndex(draft, eventId, direction) {
    const located = findEventLocation(draft, eventId);
    if (!located) return;
    const { session, index } = located;
    const nextIndex = Math.max(0, Math.min(session.events.length - 1, index + Number(direction || 0)));
    if (nextIndex === index) return;
    const [moved] = session.events.splice(index, 1);
    session.events.splice(nextIndex, 0, moved);
    session.collapsed = false;
    reflowSameDayFinals(draft, session.dayId);
  }

  function sessionChoicesText() {
    const timed = allTimedSessions();
    const numbered = sessionNumberMap(timed);
    return timed
      .filter((session) => !session.isOpenPracticeSession && !session.autoTrainingForDayId)
      .map((session) => `${numbered.get(session.id) || "?"}: ${shortDayLabel(state.meet.days.find((day) => day.id === session.dayId)?.date || "")} - ${sessionEventSummary(session, 2)}`)
      .join("\n");
  }

  function sessionIdFromPromptValue(value) {
    const wanted = Number(String(value || "").trim());
    if (!Number.isFinite(wanted)) return "";
    const timed = allTimedSessions();
    const numbered = sessionNumberMap(timed);
    for (const session of timed) {
      if ((numbered.get(session.id) || 0) === wanted) return session.id;
    }
    return "";
  }

  function moveScheduledEvent(sourceEventId, targetSessionId, targetEventId, combine) {
    update((draft) => {
      const source = findEventLocation(draft, sourceEventId);
      const targetSession = draft.sessions.find((session) => session.id === targetSessionId);
      if (!source || !targetSession || dayIsLocked(draft, source.session.dayId) || dayIsLocked(draft, targetSession.dayId)) return;
      const [moved] = source.session.events.splice(source.index, 1);
      if (!moved) return;
      const targetIndex = targetEventId ? targetSession.events.findIndex((event) => event.scheduleEventId === targetEventId) : targetSession.events.length - 1;
      const targetEvent = targetIndex >= 0 ? targetSession.events[targetIndex] : null;
      moved.eventGroupId = combine && targetEvent && canCombineEvents(moved, targetEvent) ? targetEvent.eventGroupId : id("group");
      moved.detailsOpen = true;
      targetSession.collapsed = false;
      const insertIndex = targetEvent ? targetIndex + 1 : targetSession.events.length;
      targetSession.events.splice(insertIndex, 0, moved);
      targetSession.warmupMinutes = Math.max(Number(targetSession.warmupMinutes || 0), Number(moved.defaultWarmupMinutes || 0));
      const dayId = targetSession.dayId;
      draft.sessions = draft.sessions.filter((session) => session.events.length || session.autoTrainingForDayId);
      reflowSameDayFinals(draft, dayId);
    });
  }

  function dayIsLocked(draft, dayId) {
    return Boolean((draft.meet.days || []).find((day) => day.id === dayId)?.locked);
  }

  function roundPriorityForSuggestion(profile) {
    if ((profile.allowedRounds || []).includes("Qualifier")) return "Qualifier";
    if ((profile.allowedRounds || []).includes("Prelim")) return "Prelim";
    return (profile.allowedRounds || ["Final"])[0] || "Final";
  }

  function buildSuggestedSessions(draft) {
    const days = (draft.meet.days || []).filter((day) => !day.locked);
    if (!days.length) return [];
    const previousState = state;
    state = draft;
    try {
      const round = roundPriorityForSuggestion(draft.profile);
      const already = new Set(draft.sessions.flatMap((session) => (session.events || []).map((event) => event.canonicalKey)));
      const candidateEvents = (draft.profile.events || [])
        .filter((preset) => (preset.allowedRounds || []).includes(round))
        .map((preset) => createScheduledEvent(preset, round, draft.profile))
        .filter((event) => !already.has(event.canonicalKey));
      const dayLoads = new Map(days.map((day) => [day.id, { sessions: [], groups: new Set(), cursor: Number(day.openMinutes || parseTime("08:00")) }]));
      const newSessions = [];
      candidateEvents.forEach((event) => {
        const groupKey = fullEventIdentity(event);
        let day = days.find((candidate) => !dayLoads.get(candidate.id).groups.has(groupKey));
        if (!day) day = days.reduce((best, candidate) => dayLoads.get(candidate.id).sessions.length < dayLoads.get(best.id).sessions.length ? candidate : best, days[0]);
        const load = dayLoads.get(day.id);
        let target = load.sessions.find((session) => !session.events.some((existing) => sameEventLane(existing, event)) && !session.events.some((existing) => fullEventIdentity(existing) === groupKey));
        if (!target) {
          target = createSession(event, day.id);
          target.events = [];
          target.warmupStartMinutes = roundUp(load.cursor, Number(draft.profile.timingDefaults.roundingIncrementMinutes || 5));
          target.collapsed = true;
          load.sessions.push(target);
          newSessions.push(target);
          load.cursor += 130;
        }
        event.detailsOpen = false;
        target.events.push(event);
        target.warmupMinutes = Math.max(Number(target.warmupMinutes || 0), Number(event.defaultWarmupMinutes || 0), Number(draft.profile.timingDefaults.warmupMinutes || 0));
        load.groups.add(groupKey);
      });
      days.forEach((day) => normalizeSessionOrderForDay(draft, day.id, sortedSessionsForDay({ ...draft, sessions: [...draft.sessions, ...newSessions] }, day.id)));
      return newSessions;
    } finally {
      state = previousState;
    }
  }

  function applyRuleProfile(draft, meetType) {
    const profile = meetProfiles[meetType] || meetProfiles.custom;
    draft.meet.meetType = profile.id;
    draft.profile = cloneProfile(profile);
    draft.selectedEventId = draft.profile.events[0]?.id || "";
    draft.selectedRound = draft.profile.allowedRounds[0] || "Final";
    syncProfileDefaultsToPreset(draft, draft.profile.events[0]);
    draft.duplicateMessage = "";
  }

  function copyScheduledEventForDuplicate(event, mode) {
    if (mode === "structure" && event.round !== "Open Practice" && event.round !== "Custom Block") {
      return createOpenPracticeEvent(0, "Session placeholder copied from day structure.", "Session Placeholder");
    }
    const copy = JSON.parse(JSON.stringify(event));
    copy.scheduleEventId = id("event");
    copy.eventGroupId = id("group");
    copy.detailsOpen = false;
    if (mode === "full") copy.copiedFromEventId = event.scheduleEventId;
    return copy;
  }

  function duplicateDayStructure(draft, sourceDayId, targetDayId, mode = "structure") {
    if (!sourceDayId || !targetDayId || sourceDayId === targetDayId) return;
    const targetDay = draft.meet.days.find((day) => day.id === targetDayId);
    if (!targetDay || targetDay.locked) {
      alert("Target day is locked. Unlock it before duplicating a structure into it.");
      return;
    }
    const sourceSessions = sortedSessionsForDay(draft, sourceDayId);
    const copied = sourceSessions.map((session) => {
      const sessionCopy = JSON.parse(JSON.stringify(session));
      sessionCopy.id = id("session");
      sessionCopy.dayId = targetDayId;
      sessionCopy.collapsed = true;
      sessionCopy.locked = false;
      sessionCopy.autoFinalForSessionId = "";
      sessionCopy.autoTrainingForDayId = "";
      sessionCopy.events = (session.events || []).map((event) => copyScheduledEventForDuplicate(event, mode));
      if (mode === "structure" && !session.isOpenPracticeSession) {
        sessionCopy.title = "Session Placeholder";
        sessionCopy.isOpenPracticeSession = true;
        const duration = Math.max(30, Number((session.timing?.sessionEndMinutes || session.warmupStartMinutes + 60) - (session.warmupStartMinutes || 0)));
        sessionCopy.events = [createOpenPracticeEvent(duration, "Replace this placeholder with competition events.", "Session Placeholder")];
      }
      return sessionCopy;
    });
    draft.sessions.push(...copied);
  }

  window.actions = {
    // ── Sidebar tab navigation ──────────────────────────
    switchSidebarTab(id) {
      if (typeof _sbActiveTab !== 'undefined') {
        _sbActiveTab = id;
      } else {
        window._sbActiveTab = id;
      }
      if (typeof render === 'function') render();
    },
    saveNamedScheduleFromSidebar() {
      const inp = document.getElementById('sbLibSaveName');
      const name = inp ? inp.value.trim() : (typeof state !== 'undefined' ? (state.meet?.name || 'My Schedule') : 'My Schedule');
      if (name && typeof saveNamedSchedule === 'function') saveNamedSchedule(name);
    },
    sbSetCatalogFilter(val) {
      if (typeof window.actions.setCatalogSearch === 'function') window.actions.setCatalogSearch(val);
    },
    addCatalogEventDirect(eventId, round) {
      if (typeof window.actions.selectCatalogEvent === 'function') window.actions.selectCatalogEvent(eventId);
      if (round && typeof window.actions.selectRound === 'function') window.actions.selectRound(round);
      if (typeof window.actions.addPresetEvent === 'function') window.actions.addPresetEvent();
    },
    openSavedSchedule(id) {
      if (typeof savedScheduleLibrary === 'function') {
        const library = savedScheduleLibrary();
        const index = library.findIndex(i => i.id === id);
        if (index >= 0 && typeof window.actions.loadSavedScheduleByIndex === 'function') {
          window.actions.loadSavedScheduleByIndex(index);
        }
      }
    },
    deleteLibraryItem(id) {
      if (typeof savedScheduleLibrary === 'function') {
        const library = savedScheduleLibrary();
        const index = library.findIndex(i => i.id === id);
        if (index >= 0 && typeof window.actions.deleteSavedScheduleByIndex === 'function') {
          window.actions.deleteSavedScheduleByIndex(index);
        }
      }
    },
    // ── End sidebar actions ──────────────────────────────
    focusMeetSetup() {
      document.querySelector('.left-rail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    focusBuilder() {
      document.getElementById('scheduleBuilderBoard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    setPublishStatus(value) {
      publishedEditBypass = true;
      update((draft) => { draft.publishStatus = value || "draft"; });
      publishedEditBypass = false;
    },
    openNotesManager() { notesManagerOpen = true; render(); },
    closeNotesManager() { notesManagerOpen = false; render(); },
    addScheduleNoteFromModal() {
      const audience = document.getElementById('noteAudience')?.value || 'both';
      const scope = document.getElementById('noteScope')?.value || 'meet';
      const dayId = document.getElementById('noteDayId')?.value || '';
      const text = String(document.getElementById('noteText')?.value || '').trim();
      if (!text) return;
      update((draft) => {
        draft.scheduleNotes = draft.scheduleNotes || [];
        draft.scheduleNotes.push({ id: id('note'), scope, audience, dayId: scope === 'day' ? dayId : '', sessionId: '', text, createdAt: new Date().toISOString() });
      });
      notesManagerOpen = true;
    },
    deleteScheduleNote(noteId) {
      update((draft) => { draft.scheduleNotes = (draft.scheduleNotes || []).filter((note) => note.id !== noteId); });
      notesManagerOpen = true;
    },
    acknowledgeWarning(warningId, fieldId = "") {
      const warning = validateWarnings(allTimedSessions()).find((item) => exceptionKey(item) === warningId);
      const noteField = fieldId ? document.getElementById(fieldId) : null;
      const reason = String(noteField?.value || "").trim();
      if (!reason) {
        if (noteField) {
          noteField.focus();
          noteField.classList.add("needs-note");
          window.setTimeout(() => noteField.classList.remove("needs-note"), 900);
        }
        return;
      }
      update((draft) => {
        draft.exceptions = draft.exceptions || [];
        if (!draft.exceptions.some((item) => item.warningId === warningId)) {
          draft.exceptions.push({ warningId, code: warning?.code || 'warning', message: warning?.message || '', note: reason, acknowledgedAt: new Date().toISOString() });
        }
      });
    },
    clearException(warningId) {
      update((draft) => { draft.exceptions = (draft.exceptions || []).filter((item) => item.warningId !== warningId); });
    },
    openDuplicateDayPlanner(sourceDayId) {
      const target = (state.meet.days || []).find((day) => day.id !== sourceDayId);
      if (!target) { alert('Add another day before duplicating a day structure.'); return; }
      duplicateDayPlanner = { sourceDayId, targetDayId: target.id, mode: 'structure' };
      render();
    },
    updateDuplicateDayPlanner(field, value) {
      if (!duplicateDayPlanner) return;
      duplicateDayPlanner[field] = value;
      render();
    },
    closeDuplicateDayPlanner() { duplicateDayPlanner = null; render(); },
    applyDuplicateDay() {
      if (!duplicateDayPlanner) return;
      const planner = { ...duplicateDayPlanner };
      duplicateDayPlanner = null;
      if (state.sessions.some((session) => session.dayId === planner.targetDayId)) {
        const ok = window.confirm('Duplicate into a day that already has schedule blocks? Existing blocks will remain, and the copied blocks will be added after them.');
        if (!ok) { render(); return; }
      }
      update((draft) => duplicateDayStructure(draft, planner.sourceDayId, planner.targetDayId, planner.mode));
    },
    setMeet(field, value) {
      update((draft) => {
        draft.meet[field] = value;
      });
    },
    applyMeetTemplate(meetType) {
      update((draft) => applyRuleProfile(draft, meetType));
    },
    setMeetType(meetType) {
      update((draft) => applyRuleProfile(draft, meetType));
    },
    toggleScheduleHealth() {
      scheduleHealthExpanded = !scheduleHealthExpanded;
      render();
    },
    setOutputSetting(field, value) {
      update((draft) => {
        draft.outputSettings = draft.outputSettings || {};
        if (field === "publicPreset") draft.outputSettings[field] = value;
        else draft.outputSettings[field] = Boolean(value);
      });
    },
    setTheme(value) {
      update((draft) => { draft.theme = COLOR_THEMES[value] ? value : "classic"; });
    },
    toggleDayLock(dayId) {
      update((draft) => {
        const day = draft.meet.days.find((item) => item.id === dayId);
        if (day) day.locked = !Boolean(day.locked);
      });
    },
    suggestSessions() {
      if (!window.confirm("Create suggested sessions for unscheduled events using the current meet template and entry defaults? This keeps existing sessions and skips locked days.")) return;
      update((draft) => {
        const additions = buildSuggestedSessions(draft);
        draft.sessions.push(...additions);
        draft.meet.days.forEach((day) => reflowSameDayFinals(draft, day.id));
      });
    },
    fixFinalsOrder() {
      update((draft) => {
        draft.meet.days.forEach((day) => reflowSameDayFinals(draft, day.id));
        draft.meet.days.forEach((day) => normalizeSessionOrderForDay(draft, day.id, sortedSessionsForDay(draft, day.id)));
      });
    },
    reflowDayForSession(sessionId) {
      update((draft) => {
        const session = draft.sessions.find((item) => item.id === sessionId);
        if (!session) return;
        normalizeSessionOrderForDay(draft, session.dayId, sortedSessionsForDay(draft, session.dayId));
      });
    },
    addDay() {
      update((draft) => {
        const last = draft.meet.days[draft.meet.days.length - 1];
        const nextDate = last ? new Date(`${last.date}T00:00:00`) : new Date();
        nextDate.setDate(nextDate.getDate() + 1);
        draft.meet.days.push({ id: id("day"), date: nextDate.toISOString().slice(0, 10), openMinutes: last?.openMinutes || parseTime("07:00"), closeMinutes: last?.closeMinutes || parseTime("20:00") });
      });
    },
    removeDay(dayId) {
      update((draft) => {
        if (draft.meet.days.length <= 1) return;
        const fallback = draft.meet.days.find((day) => day.id !== dayId)?.id || draft.meet.days[0].id;
        draft.meet.days = draft.meet.days.filter((day) => day.id !== dayId);
        draft.sessions.forEach((session) => {
          if (session.dayId === dayId) session.dayId = fallback;
        });
      });
    },
    setDay(dayId, field, value) {
      update((draft) => {
        const day = draft.meet.days.find((item) => item.id === dayId);
        if (!day) return;
        day[field] = field === "date" ? value : parseTime(value);
      });
    },
    setTimingDefault(field, value) {
      update((draft) => {
        if (field === "finalsTransitionMode") draft.profile.timingDefaults[field] = value;
        else draft.profile.timingDefaults[field] = typeof value === "boolean" ? value : Number(value);
        draft.meet.days.forEach((day) => reflowSameDayFinals(draft, day.id));
      });
    },
    setSplitThreshold(field, value) {
      update((draft) => {
        draft.profile.timingDefaults.splitThresholds[field] = Number(value);
      });
    },
    setRelationship(index, value) {
      update((draft) => {
        draft.profile.roundRelationships[index].relationship = value;
      });
    },
    setCatalogSearch(value) {
      catalogSearch = value || "";
      render();
    },
    setCatalogGenderFilter(value) {
      catalogGenderFilter = value || "all";
      render();
    },
    setCatalogApparatusFilter(value) {
      catalogApparatusFilter = value || "all";
      render();
    },
    setCatalogStatusFilter(value) {
      catalogStatusFilter = value || "available";
      render();
    },
    resetCatalogFilters() {
      catalogSearch = "";
      catalogGenderFilter = "all";
      catalogApparatusFilter = "all";
      catalogStatusFilter = "available";
      render();
    },
    selectCatalogEvent(eventId) {
      update((draft) => {
        draft.selectedEventId = eventId;
        const event = draft.profile.events.find((candidate) => candidate.id === eventId);
        const used = new Set(draft.sessions.flatMap((session) => session.events).filter((scheduled) => event && sameEventFamily(scheduled, event)).map((scheduled) => scheduled.round));
        draft.selectedRound = event?.allowedRounds.find((round) => draft.profile.allowedRounds.includes(round) && !used.has(round)) || event?.allowedRounds[0] || "Final";
        syncProfileDefaultsToPreset(draft, event);
        draft.duplicateMessage = "";
      });
    },
    selectRound(round) {
      update((draft) => {
        draft.selectedRound = round;
      });
    },
    setCatalogMode(mode) {
      catalogMode = mode;
      render();
    },
    setCatalogNewDay(dayId) {
      catalogNewDayId = dayId;
      render();
    },
    setActiveBuilderDay(dayId) {
      activeBuilderDayId = dayId;
      pendingBuilderScrollTop = true;
      render();
    },
    openScheduleBlockPlanner(dayId, afterSessionId = "", position = "end") {
      if ((state.meet.days || []).find((day) => day.id === dayId)?.locked) {
        alert("This day is locked. Unlock the day before adding schedule blocks.");
        return;
      }
      const defaults = blockPlannerDefaults(dayId, afterSessionId, position);
      scheduleBlockPlanner = {
        dayId,
        afterSessionId,
        position,
        type: "Open Practice",
        name: "Open Practice",
        start: defaults.start,
        end: defaults.end,
        note: "Open practice."
      };
      render();
    },
    closeScheduleBlockPlanner() {
      scheduleBlockPlanner = null;
      render();
    },
    updateScheduleBlockPlanner(field, value) {
      if (!scheduleBlockPlanner) return;
      if ((field === "type" || field === "name") && isTechnicalMeetingBlockName(value)) {
        alertTechnicalMeetingBlock();
        render();
        return;
      }
      if (field === "start" || field === "end") {
        scheduleBlockPlanner[field] = parseTime(value);
        if (field === "start" && Number(scheduleBlockPlanner.end || 0) <= Number(scheduleBlockPlanner.start || 0)) {
          scheduleBlockPlanner.end = Number(scheduleBlockPlanner.start || 0) + 60;
        }
      } else if (field === "type") {
        const previousType = scheduleBlockPlanner.type || "Open Practice";
        const previousName = scheduleBlockPlanner.name || "";
        scheduleBlockPlanner.type = value;
        if (!previousName.trim() || plannerNameMatchesDefault(previousName, previousType)) {
          scheduleBlockPlanner.name = value;
        }
        if (!scheduleBlockPlanner.note || SCHEDULE_BLOCK_DEFAULT_NOTE_PATTERN.test(scheduleBlockPlanner.note)) {
          scheduleBlockPlanner.note = SCHEDULE_BLOCK_DEFAULT_NOTES[value] || value;
        }
      } else {
        scheduleBlockPlanner[field] = value;
      }
      render();
    },
    createScheduleBlockFromPlanner() {
      if (!scheduleBlockPlanner) return;
      const planner = { ...scheduleBlockPlanner };
      if (isTechnicalMeetingBlockName(planner.type) || isTechnicalMeetingBlockName(planner.name)) {
        alertTechnicalMeetingBlock();
        return;
      }
      const displayName = String(planner.name || "").trim() || planner.type || "Open Practice";
      if (isTechnicalMeetingBlockName(displayName)) {
        alertTechnicalMeetingBlock();
        return;
      }
      scheduleBlockPlanner = null;
      update((draft) => {
        const day = draft.meet.days.find((item) => item.id === planner.dayId) || draft.meet.days[0];
        if (!day) return;
        const start = Number(planner.start || day.openMinutes || parseTime("08:00"));
        const end = Math.max(start + 5, Number(planner.end || start + 60));
        const note = planner.note || planner.type || "Schedule block.";
        const block = createOpenPracticeSession(day.id, false, start, end, note);
        block.title = displayName;
        block.collapsed = false;
        block.events[0].style = block.title;
        block.events[0].blockTitle = block.title;
        block.events[0].notes = note;
        draft.sessions.push(block);
        // Keep the operator-entered start/end time as the source of truth.
        // The builder and timeline sort by time, so a 7:00 block appears before an 8:00 session
        // even if it was added from the bottom of the day.
        const originalOrder = new Map(draft.sessions.map((session, index) => [session.id, index]));
        const dayOrder = new Map(draft.meet.days.map((item, index) => [item.id, index]));
        draft.sessions.sort((a, b) => {
          const dayCompare = (dayOrder.get(a.dayId) ?? 999) - (dayOrder.get(b.dayId) ?? 999);
          if (dayCompare) return dayCompare;
          const timeCompare = Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
          if (timeCompare) return timeCompare;
          return (originalOrder.get(a.id) ?? 9999) - (originalOrder.get(b.id) ?? 9999);
        });
      });
    },
    addScheduleBlock(dayId, afterSessionId = "", position = "end") {
      const typeChoice = window.prompt("Add schedule block:\n1 = Open Practice\n2 = Restricted Training\n3 = Open Training\n4 = Break\n5 = Awards\n6 = Custom Note", "1");
      if (typeChoice === null) return;
      const normalized = String(typeChoice).trim().toLowerCase();
      const typeMap = {
        "1": "Open Practice",
        "open practice": "Open Practice",
        "practice": "Open Practice",
        "2": "Restricted Training",
        "restricted training": "Restricted Training",
        "restricted": "Restricted Training",
        "3": "Open Training",
        "open training": "Open Training",
        "training": "Open Training",
        "4": "Break",
        "break": "Break",
        "5": "Awards",
        "awards": "Awards",
        "6": "Custom Block",
        "custom": "Custom Block",
        "custom note": "Custom Block",
      };
      const title = typeMap[normalized] || typeChoice.trim() || "Open Practice";
      if (isTechnicalMeetingBlockName(title)) {
        alertTechnicalMeetingBlock();
        return;
      }
      const defaultNote = SCHEDULE_BLOCK_DEFAULT_NOTES[title] || title;
      const note = window.prompt("Optional note/restriction for the daily flow timeline:", defaultNote);
      if (note === null) return;
      update((draft) => {
        const previousState = state;
        state = draft;
        try {
          const day = draft.meet.days.find((item) => item.id === dayId) || draft.meet.days[0];
          const timedSessions = allTimedSessions().filter((session) => session.dayId === day.id);
          let start = Number(day?.openMinutes || parseTime("08:00"));
          if (afterSessionId) {
            const source = timedSessions.find((session) => session.id === afterSessionId);
            start = roundUp(Number(source?.timing?.sessionEndMinutes || source?.warmupStartMinutes || start), Number(draft.profile.timingDefaults.roundingIncrementMinutes || 5));
          } else if (position === "end") {
            start = roundUp(timedSessions.reduce((latest, session) => Math.max(latest, Number(session.timing?.sessionEndMinutes || session.warmupStartMinutes || start)), start), Number(draft.profile.timingDefaults.roundingIncrementMinutes || 5));
          }
          const defaultDuration = title === "Break" ? 30 : title === "Awards" ? 15 : 60;
          const block = createOpenPracticeSession(day.id, false, start, start + defaultDuration, note || defaultNote);
          block.title = title;
          block.collapsed = false;
          block.events[0].style = title;
          block.events[0].blockTitle = title;
          block.events[0].notes = note || defaultNote;
          draft.sessions.push(block);
        } finally {
          state = previousState;
        }
      });
    },
    setCombineSession(sessionId) {
      update((draft) => {
        draft.combineSessionId = sessionId;
      });
    },
    addPresetEvent() {
      const targetDayId = catalogMode === "new" ? selectedNewSessionDayId() : "";
      update((draft) => {
        const preset = draft.profile.events.find((candidate) => candidate.id === draft.selectedEventId);
        if (!preset) return;
        if (catalogMode === "new" && dayIsLocked(draft, targetDayId)) {
          draft.duplicateMessage = "Target day is locked. Unlock the day before adding a new session.";
          return;
        }
        const round = draft.selectedRound || preset.allowedRounds[0];
        const scheduled = createScheduledEvent(preset, round, draft.profile);
        if (scheduled.round !== "Custom Block" && draft.sessions.flatMap((session) => session.events).some((event) => event.canonicalKey === scheduled.canonicalKey)) {
          draft.duplicateMessage = `${scheduled.round} is already scheduled for ${eventDisplayName(scheduled)}. Choose another phase or remove the existing event first.`;
          return;
        }
        let sourceSession = null;
        if (catalogMode === "combine" && draft.combineSessionId) {
          const session = draft.sessions.find((candidate) => candidate.id === draft.combineSessionId);
          if (session) {
            scheduled.eventGroupId = id("group");
            scheduled.detailsOpen = true;
            session.collapsed = false;
            session.events.push(scheduled);
            session.warmupMinutes = Math.max(Number(session.warmupMinutes || 0), Number(scheduled.defaultWarmupMinutes || 0), Number(draft.profile.timingDefaults.warmupMinutes || 0));
            sourceSession = session;
          }
        } else {
          sourceSession = createSession(scheduled, targetDayId);
          draft.sessions.push(sourceSession);
        }
        if (sourceSession) {
          createAutoFinalIfNeeded(draft, preset, scheduled, sourceSession);
          reflowSameDayFinals(draft, sourceSession.dayId);
        }
        draft.duplicateMessage = "";
      });
    },
    addOpenPractice(dayId, fullDay) {
      update((draft) => {
        const previousState = state;
        state = draft;
        try {
          const day = draft.meet.days.find((item) => item.id === dayId);
          const start = Boolean(fullDay) ? Number(day?.openMinutes || parseTime("07:00")) : Number(day?.openMinutes || parseTime("07:00"));
          const end = Boolean(fullDay) ? Number(day?.closeMinutes || start + 480) : start + 60;
          const session = createOpenPracticeSession(dayId, Boolean(fullDay), start, end);
          draft.sessions.push(session);
        } finally {
          state = previousState;
        }
      });
    },
    addOpenPracticeAfter(dayId, afterSessionId) {
      update((draft) => {
        const previousState = state;
        state = draft;
        try {
          const timed = allTimedSessions().find((session) => session.id === afterSessionId);
          const start = roundUp(Number(timed?.timing?.sessionEndMinutes || timed?.warmupStartMinutes || parseTime("08:00")), Number(draft.profile.timingDefaults.roundingIncrementMinutes || 5));
          const session = createOpenPracticeSession(dayId, false, start, start + 60, "Open practice block.");
          draft.sessions.push(session);
        } finally {
          state = previousState;
        }
      });
    },
    renameScheduleBlock(sessionId, value) {
      if (isTechnicalMeetingBlockName(value)) {
        alertTechnicalMeetingBlock();
        render();
        return;
      }
      const displayName = String(value || "").trim() || "Open Practice";
      update((draft) => {
        const session = draft.sessions.find((item) => item.id === sessionId);
        if (!session || !isManualScheduleBlock(session) || !session.events[0]) return;
        session.title = displayName;
        session.events[0].style = displayName;
        session.events[0].blockTitle = displayName;
      });
    },
    updateOpenPracticeTime(sessionId, edge, value) {
      update((draft) => {
        const session = draft.sessions.find((item) => item.id === sessionId);
        if (!session || !session.isOpenPracticeSession || !session.events[0]) return;
        const parsed = parseTime(value);
        const currentStart = Number(session.warmupStartMinutes || 0);
        const currentEnd = currentStart + Math.max(0, Number(session.events[0].customDurationMinutes || 0));
        if (edge === "start") {
          session.warmupStartMinutes = parsed;
          session.events[0].customDurationMinutes = Math.max(5, currentEnd - parsed);
        } else {
          session.events[0].customDurationMinutes = Math.max(5, parsed - currentStart);
        }
      });
    },
    resizeOpenPractice(sessionId, duration) {
      update((draft) => {
        const session = draft.sessions.find((item) => item.id === sessionId);
        if (!session || !session.isOpenPracticeSession || !session.events[0]) return;
        if (duration === "day") {
          const day = draft.meet.days.find((item) => item.id === session.dayId);
          if (!day) return;
          session.warmupStartMinutes = Number(day.openMinutes || session.warmupStartMinutes || 0);
          session.events[0].customDurationMinutes = Math.max(0, Number(day.closeMinutes || session.warmupStartMinutes) - Number(session.warmupStartMinutes || 0));
        } else {
          session.events[0].customDurationMinutes = Math.max(0, Number(duration || 0));
        }
      });
    },
    addCustomBlock() {
      const targetDayId = selectedNewSessionDayId();
      update((draft) => {
        const custom = {
          id: id("custom-preset"),
          level: "Custom",
          gender: "Open",
          apparatus: "Mixed",
          style: "Custom",
          defaultDives: 0,
          allowedRounds: ["Custom Block"],
          sourceNote: "Intentionally created custom block.",
        };
        const scheduled = createScheduledEvent(custom, "Custom Block");
        scheduled.numberOfDivers = 0;
        scheduled.numberOfDives = 0;
        scheduled.projectedAdvancers = 0;
        scheduled.finalFieldSize = 0;
        scheduled.domesticEligibleAdvancers = 0;
        scheduled.notes = "Custom non-duplicating schedule block.";
        const session = createSession(scheduled, targetDayId);
        session.title = "Session";
        session.warmupMinutes = 15;
        draft.sessions.push(session);
      });
    },
    updateSession(sessionId, field, value) {
      update((draft) => {
        const session = draft.sessions.find((item) => item.id === sessionId);
        if (!session) return;
        if (field === "locked") session.locked = value;
        else if (field === "awardsEnabled") session.awardsEnabled = Boolean(value);
        else if (field === "title") session.title = value;
        else if (field === "warmupStartMinutes") session.warmupStartMinutes = parseTime(value);
        else session[field] = Number(value);
        reflowSameDayFinals(draft, session.dayId);
      });
    },
    toggleSession(sessionId) {
      pendingBuilderScrollTop = true;
      update((draft) => {
        const session = draft.sessions.find((item) => item.id === sessionId);
        if (!session) return;
        session.collapsed = !Boolean(session.collapsed);
      });
    },
    toggleEventDetails(eventId) {
      pendingBuilderScrollTop = true;
      update((draft) => {
        const located = findEventLocation(draft, eventId);
        if (!located) return;
        located.session.collapsed = false;
        located.event.detailsOpen = !Boolean(located.event.detailsOpen);
      });
    },
    openEventDetails(eventId) {
      pendingBuilderScrollTop = true;
      update((draft) => {
        const located = findEventLocation(draft, eventId);
        if (!located) return;
        located.session.collapsed = false;
        located.event.detailsOpen = true;
      });
    },
    updateEvent(eventId, field, value) {
      update((draft) => {
        const located = findEventLocation(draft, eventId);
        if (!located) return;
        const event = located.event;
        if (field === "numberOfDives" && event.numberOfDivesLocked) return;
        event[field] = typeof value === "boolean" || field === "notes" ? value : Number(value);
        if (field === "manualSplit" && !event.manualSplit) event.numberOfPanelChanges = 0;
        reflowSameDayFinals(draft, located.session.dayId);
      });
    },
    toggleDivesLock(eventId, shouldLock) {
      if (!shouldLock) {
        const proceed = window.confirm("Changing the number of dives changes the event template. Unlock only if this meet information intentionally overrides the standard dive count.");
        if (!proceed) {
          render();
          return;
        }
      }
      update((draft) => {
        const event = draft.sessions.flatMap((session) => session.events).find((item) => item.scheduleEventId === eventId);
        if (!event) return;
        event.numberOfDivesLocked = Boolean(shouldLock);
        if (event.numberOfDivesLocked && event.defaultNumberOfDives) event.numberOfDives = Number(event.defaultNumberOfDives);
      });
    },
    setEventSplit(eventId, shouldSplit) {
      update((draft) => {
        const event = draft.sessions.flatMap((session) => session.events).find((item) => item.scheduleEventId === eventId);
        if (!event) return;
        if (isPlatformEvent(event) && shouldSplit) {
          event.manualSplit = false;
          event.numberOfPanelChanges = 0;
          event.detailsOpen = true;
          return;
        }
        event.manualSplit = Boolean(shouldSplit);
        event.detailsOpen = true;
        if (shouldSplit) {
          const defaultPanels = defaultPanelChangesForSplit(event);
          event.numberOfPanelChanges = Math.max(defaultPanels, Number(event.numberOfPanelChanges || 0));
        } else {
          event.numberOfPanelChanges = 0;
        }
        event.minutesPerPanelChange = Number(event.minutesPerPanelChange || draft.profile.timingDefaults.panelChangeMinutes || defaultTiming.panelChangeMinutes);
      });
    },
    removeSession(sessionId) {
      update((draft) => {
        draft.sessions = draft.sessions.filter((session) => session.id !== sessionId);
      });
    },
    removeEvent(eventId) {
      update((draft) => {
        const affectedDays = new Set();
        draft.sessions.forEach((session) => {
          const before = session.events.length;
          session.events = session.events.filter((event) => event.scheduleEventId !== eventId);
          if (session.events.length !== before) affectedDays.add(session.dayId);
        });
        draft.sessions = draft.sessions.filter((session) => session.events.length || session.autoTrainingForDayId);
        affectedDays.forEach((dayId) => reflowSameDayFinals(draft, dayId));
      });
    },
    moveSessionStep(sessionId, direction) {
      update((draft) => {
        moveSessionStepByIndex(draft, sessionId, direction);
      });
    },
    moveSessionDay(sessionId, offset) {
      update((draft) => {
        moveSessionDayByOffset(draft, sessionId, offset);
      });
    },
    moveEventStep(eventId, direction) {
      update((draft) => {
        moveEventStepByIndex(draft, eventId, direction);
      });
    },
    moveEventPrompt(eventId) {
      const choices = sessionChoicesText();
      const entered = window.prompt(`Move this event to which session number?\n\n${choices}`, "");
      if (entered === null) return;
      const targetSessionId = sessionIdFromPromptValue(entered);
      if (!targetSessionId) {
        window.alert("That session number was not found.");
        return;
      }
      moveScheduledEvent(eventId, targetSessionId, null, false);
    },
    pickMove(kind, idValue) {
      clickMoveState = { kind, id: idValue };
      render();
    },
    cancelPickMove() {
      clickMoveState = null;
      render();
    },
    dropPickedSessionAt(dayId, targetSessionId, position) {
      if (!clickMoveState || clickMoveState.kind !== "session") return;
      const sourceSessionId = clickMoveState.id;
      clickMoveState = null;
      update((draft) => {
        moveSessionToSlot(draft, sourceSessionId, dayId, targetSessionId, position);
      });
    },
    dropPickedEventInSession(event, targetSessionId) {
      if (!clickMoveState || clickMoveState.kind !== "event") return;
      if (event?.target?.closest?.("button, input, select, textarea, summary, details")) return;
      event?.stopPropagation?.();
      const sourceEventId = clickMoveState.id;
      clickMoveState = null;
      moveScheduledEvent(sourceEventId, targetSessionId, null, false);
    },
    dropPickedEventOnEvent(event, targetSessionId, targetEventId) {
      if (!clickMoveState || clickMoveState.kind !== "event") return;
      if (event?.target?.closest?.("button, input, select, textarea, summary, details")) return;
      event?.stopPropagation?.();
      const sourceEventId = clickMoveState.id;
      if (!sourceEventId || sourceEventId === targetEventId) return;
      clickMoveState = null;
      moveScheduledEvent(sourceEventId, targetSessionId, targetEventId, true);
    },
    pointerDragStart(event, kind, idValue) {
      if (!event || event.button !== 0 || pointerDragState) return;
      event.preventDefault();
      event.stopPropagation();
      dragSessionId = kind === "session" ? idValue : "";
      dragEventId = kind === "event" ? idValue : "";
      pointerDragState = { kind, id: idValue, drop: null };
      pointerDragHoverId = "";
      pointerDragHoverStartedAt = 0;
      document.body.classList.add("schedule-drag-active", "pointer-drag-active");
      const sourceSelector = kind === "session" ? `.session-card[data-session-id="${cssEscapeValue(idValue)}"]` : `.scheduled-event[data-event-id="${cssEscapeValue(idValue)}"]`;
      document.querySelector(sourceSelector)?.classList.add("pointer-drag-source");
      pointerDragGhost = createPointerDragGhost(kind, idValue, event);
      window.addEventListener("pointermove", pointerDragMove, true);
      window.addEventListener("pointerup", pointerDragUp, true);
      window.addEventListener("pointercancel", pointerDragCancel, true);
    },
    dragStart(event, sessionId) {
      if (dragEventId) return;
      dragSessionId = sessionId;
      dragEventId = "";
      document.body.classList.add("schedule-drag-active");
      setDragPayload(event, "session", sessionId);
      event.currentTarget.closest(".session-card")?.classList.add("dragging");
    },
    dragEnd(event) {
      dragSessionId = "";
      stopDragAutoScroll();
      event.currentTarget.closest(".session-card")?.classList.remove("dragging");
      document.querySelectorAll(".day-lane.over, .session-slot-active").forEach((node) => node.classList.remove("over", "session-slot-active"));
    },
    dragOver(event) {
      if (dragEventId || hasDragType(event, "event")) return;
      autoScrollDuringDrag(event);
      if (!dragSessionId && !hasDragType(event, "session")) return;
      event.preventDefault();
      event.currentTarget.classList.add("over");
    },
    dragLeave(event) {
      event.currentTarget.classList.remove("over");
    },
    sessionSlotDragOver(event) {
      if (dragEventId || hasDragType(event, "event")) return;
      if (!dragSessionId && !hasDragType(event, "session")) return;
      autoScrollDuringDrag(event);
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.classList.add("session-slot-active");
    },
    sessionSlotDragLeave(event) {
      event.currentTarget.classList.remove("session-slot-active");
    },
    dropSessionAtSlot(event, dayId, targetSessionId, position) {
      const sourceSessionId = dragPayload(event, "session");
      if (!sourceSessionId || dragEventId || hasDragType(event, "event")) return;
      event.preventDefault();
      event.stopPropagation();
      update((draft) => {
        moveSessionToSlot(draft, sourceSessionId, dayId, targetSessionId, position);
      });
      dragSessionId = "";
      stopDragAutoScroll();
      document.querySelectorAll(".day-lane.over, .session-slot-active").forEach((node) => node.classList.remove("over", "session-slot-active"));
    },
    dropSession(event, dayId) {
      const sourceSessionId = dragPayload(event, "session");
      if (dragEventId || hasDragType(event, "event") || !sourceSessionId) return;
      event.preventDefault();
      const lane = event.currentTarget;
      lane.classList.remove("over");
      update((draft) => {
        moveSessionToSlot(draft, sourceSessionId, dayId, "", "end");
      });
      dragSessionId = "";
      stopDragAutoScroll();
      document.querySelectorAll(".session-slot-active").forEach((node) => node.classList.remove("session-slot-active"));
    },
    eventDragStart(event, eventId) {
      event.stopPropagation();
      dragEventId = eventId;
      dragSessionId = "";
      document.body.classList.add("schedule-drag-active");
      event.currentTarget.closest(".scheduled-event")?.classList.add("event-dragging");
      setDragPayload(event, "event", eventId);
    },
    eventDragEnd(event) {
      event.stopPropagation();
      dragEventId = "";
      stopDragAutoScroll();
      clearEventDragMarkers();
      event.currentTarget.closest(".scheduled-event")?.classList.remove("event-dragging");
    },
    eventDragOver(event, targetEventId) {
      const sourceEventId = dragPayload(event, "event");
      if (!sourceEventId || sourceEventId === targetEventId) return;
      autoScrollDuringDrag(event);
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      target.classList.add("event-drop-target");
      if (combineHoverEventId !== targetEventId) {
        clearTimeout(combineHoverTimer);
        combineHoverEventId = targetEventId;
        combineHoverTimer = window.setTimeout(() => {
          target.classList.add("combine-ready");
        }, 500);
      }
    },
    eventDragLeave(event, targetEventId) {
      event.stopPropagation();
      if (combineHoverEventId === targetEventId) {
        clearTimeout(combineHoverTimer);
        combineHoverEventId = "";
      }
      event.currentTarget.classList.remove("event-drop-target", "combine-ready");
    },
    eventStackDragOver(event, sessionId) {
      if (!dragEventId && !hasDragType(event, "event")) return;
      autoScrollDuringDrag(event);
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.classList.add("stack-drop-ready");
    },
    eventStackDragLeave(event) {
      event.currentTarget.classList.remove("stack-drop-ready");
    },
    dropEventInSession(event, targetSessionId) {
      const sourceEventId = dragPayload(event, "event");
      if (!sourceEventId) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.classList.remove("stack-drop-ready");
      moveScheduledEvent(sourceEventId, targetSessionId, null, false);
      dragEventId = "";
      stopDragAutoScroll();
      clearEventDragMarkers();
    },
    dropEventOnEvent(event, targetSessionId, targetEventId) {
      const sourceEventId = dragPayload(event, "event");
      if (!sourceEventId || sourceEventId === targetEventId) return;
      event.preventDefault();
      event.stopPropagation();
      const combine = event.currentTarget.classList.contains("combine-ready");
      moveScheduledEvent(sourceEventId, targetSessionId, targetEventId, combine);
      dragEventId = "";
      stopDragAutoScroll();
      clearEventDragMarkers();
    },
    combineWithPrevious(eventId) {
      update((draft) => {
        const located = findEventLocation(draft, eventId);
        if (!located) return;
        const { session, index, event: scheduled } = located;
        if (index <= 0) return;
        const previous = session.events[index - 1];
        if (!previous || !canCombineEvents(previous, scheduled)) return;
        scheduled.eventGroupId = previous.eventGroupId || id("group");
        scheduled.detailsOpen = false;
        session.collapsed = false;
      });
    },
    uncombineEvent(eventId) {
      update((draft) => {
        const located = findEventLocation(draft, eventId);
        if (!located) return;
        const { session, event: scheduled } = located;
        const oldGroupId = scheduled.eventGroupId;
        const oldIndex = session.events.findIndex((item) => item.scheduleEventId === eventId);
        session.events.splice(oldIndex, 1);
        scheduled.eventGroupId = id("group");
        scheduled.detailsOpen = true;
        const insertAfter = Math.max(...session.events.map((item, index) => item.eventGroupId === oldGroupId ? index : -1), oldIndex - 1);
        session.events.splice(insertAfter + 1, 0, scheduled);
      });
    },
    moveEventToNewSession(eventId) {
      update((draft) => {
        const located = findEventLocation(draft, eventId);
        if (!located) return;
        const { session, event: scheduled } = located;
        session.events = session.events.filter((item) => item.scheduleEventId !== eventId);
        scheduled.eventGroupId = id("group");
        const newSession = createSession(scheduled);
        newSession.dayId = session.dayId;
        newSession.warmupStartMinutes = roundUp((session.warmupStartMinutes || 0) + 60, session.roundingIncrementMinutes || 5);
        newSession.title = "Session";
        newSession.collapsed = false;
        scheduled.detailsOpen = true;
        draft.sessions.push(newSession);
        draft.sessions = draft.sessions.filter((item) => item.events.length);
      });
    },
    clearEntryDefaults() {
      const confirmed = window.confirm("Clear all saved Prelim/Qualifier entry counts and manual split choices? Existing scheduled prelim/qualifier events will reset to the profile default entry count and no split.");
      if (!confirmed) return;
      update((draft) => {
        draft.entryDefaults = {};
        draft.projectedEntryDefaults = {};
        draft.actualEntryDefaults = {};
        draft.splitDefaults = {};
        const fallbackDivers = Number(draft.profile?.timingDefaults?.defaultDivers || 24);
        draft.sessions.forEach((session) => {
          session.events.forEach((event) => {
            if (["Qualifier", "Prelim"].includes(event.round)) {
              event.numberOfDivers = fallbackDivers;
              event.manualSplit = false;
              event.numberOfPanelChanges = 0;
            }
          });
        });
        draft.meet.days.forEach((day) => reflowSameDayFinals(draft, day.id));
      });
    },
    openEntryManager() {
      entryManagerOpen = true;
      render();
    },
    closeEntryManager() {
      entryManagerOpen = false;
      render();
    },
    setEntryMode(mode) {
      update((draft) => {
        draft.entryMode = mode === "actual" ? "actual" : "projected";
        draft.entryDefaults = activeEntryDefaultsForState(draft);
        draft.sessions.forEach((session) => {
          session.events.forEach((event) => {
            if (["Qualifier", "Prelim"].includes(event.round)) {
              const key = entryDefaultKey(event, event.round);
              const value = Number(activeEntryDefaultsForState(draft)?.[key]);
              if (Number.isFinite(value)) event.numberOfDivers = value;
            }
          });
        });
        draft.meet.days.forEach((day) => reflowSameDayFinals(draft, day.id));
      });
      entryManagerOpen = true;
    },
    setEntryDefaultMode(key, mode, value) {
      update((draft) => {
        const count = Math.max(0, Number(value) || 0);
        draft.projectedEntryDefaults = draft.projectedEntryDefaults || {};
        draft.actualEntryDefaults = draft.actualEntryDefaults || {};
        if (mode === "actual") draft.actualEntryDefaults[key] = count;
        else draft.projectedEntryDefaults[key] = count;
        draft.entryDefaults = activeEntryDefaultsForState(draft);
        draft.sessions.forEach((session) => {
          session.events.forEach((event) => {
            if (["Qualifier", "Prelim"].includes(event.round) && entryDefaultKey(event, event.round) === key) {
              const activeValue = Number(activeEntryDefaultsForState(draft)?.[key]);
              event.numberOfDivers = Number.isFinite(activeValue) ? activeValue : count;
            }
          });
        });
        draft.meet.days.forEach((day) => reflowSameDayFinals(draft, day.id));
      });
      entryManagerOpen = true;
    },
    setEntryDefault(key, value) {
      update((draft) => {
        draft.projectedEntryDefaults = draft.projectedEntryDefaults || {};
        draft.actualEntryDefaults = draft.actualEntryDefaults || {};
        const count = Math.max(0, Number(value) || 0);
        if ((draft.entryMode || "projected") === "actual") draft.actualEntryDefaults[key] = count;
        else draft.projectedEntryDefaults[key] = count;
        draft.entryDefaults = activeEntryDefaultsForState(draft);
        draft.sessions.forEach((session) => {
          session.events.forEach((event) => {
            if (["Qualifier", "Prelim"].includes(event.round) && entryDefaultKey(event, event.round) === key) {
              event.numberOfDivers = count;
            }
          });
        });
        draft.meet.days.forEach((day) => reflowSameDayFinals(draft, day.id));
      });
    },
    setEntrySplitDefault(key, shouldSplit) {
      update((draft) => {
        draft.splitDefaults = draft.splitDefaults || {};
        if (shouldSplit) draft.splitDefaults[key] = true;
        else delete draft.splitDefaults[key];
        draft.sessions.forEach((session) => {
          session.events.forEach((event) => {
            if (["Qualifier", "Prelim"].includes(event.round) && entryDefaultKey(event, event.round) === key) {
              if (isPlatformEvent(event)) {
                event.manualSplit = false;
                event.numberOfPanelChanges = 0;
              } else {
                event.manualSplit = Boolean(shouldSplit);
                if (shouldSplit) {
                  const defaultPanels = defaultPanelChangesForSplit(event);
                  event.numberOfPanelChanges = Math.max(defaultPanels, Number(event.numberOfPanelChanges || 0));
                } else {
                  event.numberOfPanelChanges = 0;
                }
                event.minutesPerPanelChange = Number(event.minutesPerPanelChange || draft.profile.timingDefaults.panelChangeMinutes || defaultTiming.panelChangeMinutes);
              }
            }
          });
        });
        draft.meet.days.forEach((day) => reflowSameDayFinals(draft, day.id));
      });
    },
    setPreview(mode) {
      previewMode = mode;
      render();
    },
    printPreview() {
      openTimelinePrintWindow();
    },
    exportPng() {
      exportCanvas("png");
    },
    exportJpg() {
      exportCanvas("jpeg");
    },
    exportSvg() {
      const svg = buildPosterSvg();
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${filenameBase()}-daily-schedule.svg`);
    },
    exportExcel() {
      exportWorkbookHtml();
    },
    openCanva() {
      openCanvaUrl();
    },
    saveScheduleSlot() {
      saveNamedSchedule(scheduleSnapshotName());
      scheduleLibraryOpen = true;
      render();
    },
    openScheduleLibrary() {
      scheduleLibraryOpen = true;
      render();
    },
    closeScheduleLibrary() {
      scheduleLibraryOpen = false;
      render();
    },
    showSavedSchedules() {
      scheduleLibraryOpen = true;
      render();
    },
    saveCurrentScheduleFromModal() {
      const input = document.getElementById("saveScheduleNameInput");
      const name = input?.value || scheduleSnapshotName();
      saveNamedSchedule(name);
      scheduleLibraryOpen = true;
      render();
    },
    updateCurrentScheduleFromModal() {
      const input = document.getElementById("saveScheduleNameInput");
      const name = input?.value || scheduleSnapshotName();
      saveNamedSchedule(name, { mode: "updateByName", targetId: state.currentLibraryId });
      scheduleLibraryOpen = true;
      render();
    },
    saveNewVersionFromModal() {
      const input = document.getElementById("saveScheduleNameInput");
      const name = input?.value || scheduleSnapshotName();
      saveNamedSchedule(name, { mode: "newVersion" });
      scheduleLibraryOpen = true;
      render();
    },
    duplicateCurrentScheduleFromModal() {
      const name = `${scheduleSnapshotName()} Copy`;
      saveNamedSchedule(name, { mode: "newVersion" });
      scheduleLibraryOpen = true;
      render();
    },
    loadSavedScheduleByIndex(index) {
      const library = savedScheduleLibrary();
      const item = library[Number(index)];
      if (!item) return;
      state = normalizeLoadedState(JSON.parse(JSON.stringify(item.schedule)));
      state.currentLibraryId = item.id || "";
      scheduleLibraryOpen = false;
      saveState();
      render();
    },
    duplicateSavedScheduleByIndex(index) {
      const library = savedScheduleLibrary();
      const item = library[Number(index)];
      if (!item) return;
      duplicateLibraryItem(item, `${item.name || "Schedule"} Copy`);
      scheduleLibraryOpen = true;
      render();
    },
    renameSavedScheduleByIndex(index) {
      const visible = savedScheduleLibrary();
      const item = visible[Number(index)];
      if (!item) return;
      if (item.builtIn) {
        const copy = duplicateLibraryItem(item, `${item.name || "Schedule"} Custom`);
        state = normalizeLoadedState(JSON.parse(JSON.stringify(copy.schedule)));
        state.currentLibraryId = copy.id;
        scheduleLibraryOpen = true;
        saveState();
        render();
        return;
      }
      const entered = window.prompt("Rename saved schedule:", item.name || "Schedule");
      if (entered === null) return;
      const name = String(entered || "").trim();
      if (!name) return;
      const library = rawSavedScheduleLibrary();
      const target = library.find((entry) => entry.id === item.id);
      if (!target) return;
      target.name = name;
      target.updatedAt = new Date().toISOString();
      if (target.schedule?.meet) target.schedule.meet.name = target.schedule.meet.name || name;
      writeScheduleLibrary(library);
      scheduleLibraryOpen = true;
      render();
    },
    deleteSavedScheduleByIndex(index) {
      const visible = savedScheduleLibrary();
      const item = visible[Number(index)];
      if (!item) return;
      if (item.builtIn) {
        window.alert("Seeded schedules cannot be deleted from the built-in library. Duplicate it first, then edit or delete your copy.");
        return;
      }
      if (!window.confirm(`Delete saved schedule "${item.name}"? This will not clear the current workspace unless this schedule is currently open.`)) return;
      const library = rawSavedScheduleLibrary().filter((entry) => entry.id !== item.id);
      if (state.currentLibraryId === item.id) state.currentLibraryId = "";
      writeScheduleLibrary(library);
      scheduleLibraryOpen = true;
      render();
    },
    releaseCurrentSchedule() {
      releaseModeOpen = true;
      render();
    },
    closeReleaseMode() {
      releaseModeOpen = false;
      render();
    },
    confirmReleaseCurrentSchedule() {
      const input = document.getElementById("releaseScheduleNameInput");
      const name = input?.value || scheduleSnapshotName();
      update((draft) => {
        draft.publishStatus = draft.publishStatus === "published" ? "published" : "ready";
        draft.releasedAt = new Date().toISOString();
      });
      saveNamedSchedule(name, { mode: "updateByName", targetId: state.currentLibraryId });
      releaseModeOpen = false;
      previewMode = "timeline";
      render();
    },
    openResetWorkspace() {
      resetWorkspaceOpen = true;
      render();
    },
    closeResetWorkspace() {
      resetWorkspaceOpen = false;
      render();
    },
    clearCurrentWorkspace() {
      if (!window.confirm("Clear the current workspace only? Saved schedules in the Schedule Library will remain available.")) return;
      state = makeInitialState();
      resetWorkspaceOpen = false;
      saveState();
      render();
    },
    newSchedule() {
      resetWorkspaceOpen = true;
      render();
    },
    shareSchedulePackage() {
      const pkg = buildSchedulePackage();
      downloadBlob(new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" }), packageFilename());
    },
    openSharedSchedulePackage(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const pkg = parseSchedulePackage(parsed);
          if (!pkg) throw new Error("not a schedule package");
          const item = importSchedulePackage(pkg);
          if (item) render();
        } catch {
          window.alert("That file could not be opened as a USA Diving schedule package.");
        }
      };
      reader.readAsText(file);
    },
    exportJson() {
      downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), `${filenameBase()}-schedule.json`);
    },
    loadJson(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const pkg = parseSchedulePackage(parsed);
          if (pkg) {
            const item = importSchedulePackage(pkg, { skipConflictCheck: parsed.packageType !== "USA_DIVING_SCHEDULE_PACKAGE" });
            if (item) render();
          }
        } catch {
          alert("That JSON file could not be loaded.");
        }
      };
      reader.readAsText(file);
    },

  };

  window.addEventListener("dragover", autoScrollDuringDrag);
  window.addEventListener("drop", stopDragAutoScroll);

  render();
})();
