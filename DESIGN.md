---
version: 1.0
name: usa-diving-staff-platform
description: "Design system for the USA Diving staff web apps. A light, data-dense working surface (#f0f2f8 canvas, white panels, hairline borders) under a deep-navy chrome bar (#0d1040). Navy #171f69 is the brand and the primary action; Red #e31937 is the single loud accent and is never placed on blue; Pool #009ac7 and Sky #8fc3ea carry data and highlights. Display type is Barlow Condensed, UI is Inter, every number is JetBrains Mono. The system reads like a broadcast scoring console: calm chrome, numbers first, provenance always visible."

colors:
  brand-navy: "#171f69"
  brand-navy-700: "#1e2d8a"
  brand-navy-800: "#131960"
  brand-navy-900: "#0d1040"
  brand-navy-950: "#080c2e"
  brand-red: "#e31937"
  brand-red-soft: "rgba(227,25,55,.12)"
  brand-pool: "#009ac7"
  brand-sky: "#8fc3ea"
  brand-gray: "#5f6062"
  nav-bg: "#0d1040"
  nav-border: "rgba(255,255,255,.07)"
  nav-ink: "#c8d0f0"
  nav-muted: "rgba(200,208,240,.45)"
  nav-active-bg: "rgba(143,195,234,.14)"
  nav-active-ink: "#8fc3ea"
  canvas: "#f0f2f8"
  surface: "#ffffff"
  surface-2: "#f7f8fc"
  hairline: "#e2e5ef"
  hairline-soft: "#f0f2f8"
  ink: "#0d1117"
  ink-2: "#2d3a4a"
  ink-3: "#5a6a7e"
  ink-4: "#94a3b8"
  status-good: "#059669"
  status-good-bg: "#ecfdf5"
  status-info: "#0369a1"
  status-info-bg: "#eff6ff"
  status-warn: "#d97706"
  status-warn-bg: "#fffbeb"
  status-out: "#6b7280"
  status-out-bg: "#f3f4f6"
  status-flag: "#e31937"
  status-flag-bg: "rgba(227,25,55,.08)"

typography:
  display-xl:   { fontFamily: Barlow Condensed, fontSize: 40px, fontWeight: 800, lineHeight: 1.0, letterSpacing: 0.01em, transform: uppercase }
  display-lg:   { fontFamily: Barlow Condensed, fontSize: 28px, fontWeight: 700, lineHeight: 1.05, letterSpacing: 0.01em, transform: uppercase }
  display-md:   { fontFamily: Barlow Condensed, fontSize: 20px, fontWeight: 700, lineHeight: 1.1,  letterSpacing: 0.02em, transform: uppercase }
  title:        { fontFamily: Inter, fontSize: 15px, fontWeight: 600, lineHeight: 1.3 }
  body:         { fontFamily: Inter, fontSize: 13px, fontWeight: 400, lineHeight: 1.5 }
  body-sm:      { fontFamily: Inter, fontSize: 12px, fontWeight: 400, lineHeight: 1.45 }
  eyebrow:      { fontFamily: Inter, fontSize: 10.5px, fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.08em, transform: uppercase }
  caption:      { fontFamily: Inter, fontSize: 11px, fontWeight: 500, lineHeight: 1.3 }
  number-xl:    { fontFamily: JetBrains Mono, fontSize: 30px, fontWeight: 500, lineHeight: 1.0, fontVariantNumeric: tabular-nums }
  number-lg:    { fontFamily: JetBrains Mono, fontSize: 20px, fontWeight: 500, lineHeight: 1.0, fontVariantNumeric: tabular-nums }
  number:       { fontFamily: JetBrains Mono, fontSize: 13px, fontWeight: 500, lineHeight: 1.3, fontVariantNumeric: tabular-nums }
  number-sm:    { fontFamily: JetBrains Mono, fontSize: 11.5px, fontWeight: 400, lineHeight: 1.3, fontVariantNumeric: tabular-nums }

rounded:  { xs: 4px, sm: 6px, md: 8px, lg: 12px, xl: 16px, pill: 999px }
spacing:  { xxs: 4px, xs: 8px, sm: 12px, md: 16px, lg: 24px, xl: 32px, xxl: 48px }
elevation:
  flat:   none
  xs:     "0 1px 2px rgba(0,0,0,.05)"
  sm:     "0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.05)"
  md:     "0 4px 16px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.07)"
  lg:     "0 8px 32px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.08)"
---

# USA Diving Staff Platform — DESIGN.md

The source of truth for how every app in `mjretcher/usa-diving-staff-apps` looks. Tokens live in `shared/design.css`; this file says how to use them. Every app links `shared/design.css` and `shared/usad-overlays.css`; the three High Performance apps also link `shared/hp-shell.css`.

## 1. Visual theme

A scoring console, not a marketing site. The chrome (topbar, sidebars) is deep navy and quiet. The working surface is a cool light gray with white panels separated by hairlines. Numbers are the hero: monospaced, tabular, larger than the labels around them. Color means something — green is "clears the bar", amber is "close", red is "flag" — and is never decorative. The page should feel like it was built by someone who runs meets for a living: dense, legible from arm's length, nothing hidden.

## 2. Color roles

- **Navy `#171f69`** is the brand and the primary action: primary buttons, selected tabs, active chips, dark hero panels.
- **Red `#e31937`** is one accent per view at most: the Generate/Export button, a threshold line, a flag. **Never red text or red fills on a navy or blue background** (ADA contrast). On dark chrome use Sky for emphasis instead.
- **Pool `#009ac7`** carries data: bars, dots, the "below threshold" series, links on light surfaces.
- **Sky `#8fc3ea`** is the active state on dark chrome and the light series in charts.
- **Semantic status** (`status-good/info/warn/out/flag`) is reserved for qualification and data-quality meaning. Do not reuse status colors as chart series.
- **Canvas `#f0f2f8`**, **surface white**, **hairline `#e2e5ef`**. Panels are white on canvas with a 1px hairline; no gradients on panels.
- Dark hero panels (athlete header, landing cards) use a navy → `brand-navy-700` gradient and white type; Sky for sub-labels.

## 3. Typography

- **Barlow Condensed** (700/800, uppercase, tight tracking) for app titles, panel titles ≥ 20px, hero names, big section labels. Never for body text.
- **Inter** for everything else. Base 13px. Labels 11–12px. Eyebrows 10.5px, 700, +0.08em, uppercase, `ink-3`.
- **JetBrains Mono** for every number that is data (scores, DD, counts, percentages, dates in tables). `font-variant-numeric: tabular-nums` so columns align. A number in a sentence of prose can stay in Inter.
- No faux-bold hierarchy: at most three weights visible on one screen.

## 4. Layout

- Fixed topbar, 52px, `nav-bg`. Left: logo block (min 240px, right hairline). Then app identity (eyebrow + title). Then the app's own nav. Right: status pills.
- Below the topbar, HP apps use a **context bar** (search, selected entity, view tabs) — one row on desktop, wrapping to two on mobile. Never three stacked header rows.
- Content max-width 1440px, 20–24px gutters, 16px between panels. Panels do not nest more than two deep (panel → tile). No cards inside cards inside cards.
- Sidebars are 240–300px, navy, with 16px section padding and 10.5px uppercase section titles.
- Mobile (≤ 720px): sidebars become a top drawer or collapse into the context bar; KPI rows go single-column; tables scroll horizontally inside their panel, never the page.

## 5. Components

- **Panel**: white, 1px hairline, radius 12px, padding 16–20px, no shadow at rest; `elevation-sm` on hover only when the panel is clickable.
- **Panel head**: title (Inter 15/600 or Barlow 20/700) + one-line subtitle in `ink-3`. The subtitle says what the numbers are, in plain English.
- **KPI tile**: eyebrow label, `number-xl` value, one-line foot. A 2px top border in the tile's meaning color. Four per row desktop, two tablet, one mobile.
- **Buttons**: `btn-primary` navy/white; `btn-ghost` white with hairline; `btn-danger` red only on light surfaces. Height 34px, radius 8px, 13px/600. On dark chrome, buttons are translucent white with a Sky active state.
- **Tabs**: text tabs with a 2px navy underline on light surfaces; pill tabs (Sky fill at 14% + Sky text) on dark chrome.
- **Chips / filters**: pill, 11.5px, hairline; active chip is navy fill with white text. Chips are read-outs of current state and are clickable to change it.
- **Tables**: 13px, hairline rows, sticky header (`surface-2` background, eyebrow-styled header text), numeric columns right-aligned in mono, first column padded 14px. Row hover `surface-2`. Sort indicators on the header, never a separate control.
- **Status badge**: pill, 11px/600, tinted background + ink from the status set.
- **Provenance chip**: small mono pill ("Live · updated 2026-11-08", "n = 23 results") placed where a number is doing real work. Required on any figure that could reach a selection conversation.
- **Charts**: Pool for the main series, Navy for the comparison series, Sky for context bands, Red for a threshold line only. Axis labels in `number-sm`, `ink-4`. Every chart states its unit and its n.
- **Empty / loading / error**: one centered block — spinner or icon, one sentence, one action. Loading never shows beside an empty state; `[hidden]` always wins (`[hidden]{display:none!important}` in every app stylesheet).

## 6. Depth

Flat by default. Hairlines separate; shadows lift only things that float (menus, drawers, drag ghosts, the fixed topbar's bottom edge). Never stack a shadow on a hairline border.

## 7. Content rules

- Plain English labels. No invented metric names, no jargon, no emoji, no icons without a text label.
- Every count says its unit (**event entries** or **unique athletes**) and whether it is **actual**, **projected**, or a **range** with the reason.
- Never show one side of a comparison. Never draw a reference line across mixed score formats.
- If a number cannot be verified, withhold it and say why in place; do not estimate.
- Documents and reports handed to staff: plain black and white, no decorative separators, no em dashes, nothing that reads as machine-written.

## 8. Do / Don't

**Do**
- Lead every screen with the answer (the KPI or the table), then the evidence below it.
- Put the data source and freshness in the topbar of any app that reads the database.
- Use mono for every number in a table or tile.
- Keep one red element per view.

**Don't**
- Don't put red on navy/blue.
- Don't load whole tables into the browser; query the scope the screen needs.
- Don't show a static fallback dataset as if it were live.
- Don't hide controls behind hover.
- Don't stack more than two header rows above the content on desktop.
- Don't use status colors as chart series.

## 9. Agent prompt guide

When building or restyling a screen in this repo: "Use the USA Diving staff design system (DESIGN.md). Navy #171f69 chrome and primary, red #e31937 one accent per view and never on blue, Pool #009ac7 for data. Barlow Condensed uppercase for titles, Inter 13px UI, JetBrains Mono tabular for every number. White panels with #e2e5ef hairlines on a #f0f2f8 canvas, flat, 12px radius. Fixed 52px navy topbar; one context row below it. Every figure labelled with unit, actual/projected, and source. Plain English, no jargon, no emoji."
