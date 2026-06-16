# LedgerLeaf — USALI Hotel Financials

A web-based hotel financial reporting system built on the **Uniform System of Accounts
for the Lodging Industry (USALI), 11th Revised Edition**. The goal is a SaaS product that
replaces the spreadsheet workflow with a multi-property, multi-period web application —
initially targeting independent hotels.

## Status

Early prototype. The current deliverable is a single-file, self-contained web app that
proves the core concept: USALI departmental schedules with live roll-ups to the Summary
Operating Statement and a KPI dashboard.

## Contents

| File | Description |
|------|-------------|
| `usali-prototype.html` | Clickable prototype. Open directly in any browser; no install or server required. Click **"Load demo data"** to populate it. |
| `USALI Hotel Accounting Templates_BSG.xlsx` | Source workbook — the 24-sheet USALI 11th-edition reference whose formulas define the calculation logic. |
| `.claude/launch.json` | Local static-server config for previewing the prototype on port 8765. |

## Prototype scope

- **Setup & Assumptions** — property, period, room inventory × days (drives per-room metrics)
- **Rooms — Schedule 1** — full USALI detail, ported 1:1 from the workbook formulas
- **Food & Beverage, Other Operated, Misc Income, Undistributed (Sch 5–9), Fees & Fixed (Sch 10–11)** — condensed inputs
- **Summary Operating Statement (Operators view)** — rolls up to GOP → EBITDA → EBITDA less Replacement Reserve
- **Dashboard** — Occupancy, ADR, RevPAR, Total RevPAR, GOP, GOPPAR, EBITDA with live charts

## Roadmap (next)

1. CSV / trial-balance import with account mapping
2. Backend persistence + multi-period trending
3. Auth, multi-property portfolios, PDF/board-pack export, billing

## Notes

This project reproduces the USALI line-item *structure* for practitioner use; it is not the
copyrighted text of the standard. USALI is published by HFTP and the American Hotel &
Lodging Association. A legal review of the structure is recommended before commercialization.
