# USA Diving Staff Apps

Internal staff tools for the USA Diving High Performance Department.

**Live site:** https://mjretcher.github.io/usa-diving-staff-apps/

---

## Apps

| # | App | URL |
|---|-----|-----|
| 1 | Schedule Builder | `/schedule-builder/` |
| 2 | Junior Results Audit | `/junior-results/` |
| 3 | Criteria Simulator | `/criteria-simulator/` |
| 4 | Athlete Evaluation | `/athlete-evaluation/` |

---

## Repo Structure

```
usa-diving-staff-apps/
├── index.html                  ← landing page
├── README.md
├── .gitignore
├── data/
│   ├── data.js                 ← dataset index
│   ├── data_2021.js
│   ├── data_2022.js
│   ├── data_2023.js
│   ├── data_2024.js
│   ├── data_2025.js
│   ├── data_2026.js
│   ├── dd_table.js
│   ├── junior-data.js          ← Junior Circuit results
│   └── criteria-data.js        ← Criteria Simulator dataset
├── schedule-builder/
├── junior-results/
├── criteria-simulator/
└── athlete-evaluation/
```

---

## Updating Data

All competition results data lives in `data/`. To update:

1. Replace the relevant `data_YYYY.js` file with the new scrape output
2. Commit and push — GitHub Pages deploys automatically within ~60 seconds

Apps 2, 3, and 4 all reference the shared `data/` folder. Update once, all apps see it.

---

## Sharing With Staff

Send staff this URL:
```
https://mjretcher.github.io/usa-diving-staff-apps/
```

No install, no login required. Works in any browser.

---

Internal use only. Not for public distribution.
