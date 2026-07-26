# LedgerLeaf — USALI Hotel Financials

A web-based hotel financial reporting platform built on the **Uniform System of Accounts
for the Lodging Industry (USALI), 11th Revised Edition** — replacing the spreadsheet
workflow for **smaller independent hotels, starting with India**.

## Status

Working multi-property, multi-period web application (Next.js + SQLite). USALI departmental
schedules with live roll-ups to the Summary Operating Statement, budget vs. actual and
prior-year variance, full F&B detail, India-aware GST liability, daily operating statistics,
a KPI dashboard with portfolio benchmarking, period locking with an audit trail, and
month-over-month trends. India-first: INR default with lakh/crore digit grouping and
compact ₹ L / ₹ Cr figures, April–March fiscal-year labels.

## Getting started

```bash
npm install
npm run seed   # optional: demo Indian property with 6 months of data
npm run dev    # http://localhost:3000
npm test       # engine, fiscal, format, GST, importer, API route tests (vitest)
npm run lint   # eslint
npm run build  # production build
```

Data is stored in `data/ledgerleaf.db` (SQLite, gitignored). Set `LEDGERLEAF_DB` to
override the path. CI runs the same matrix (`.github/workflows/ci.yml`).

## Authentication (optional)

Access is open in development. To gate writes behind a single shared password, set
`LEDGERLEAF_PASSWORD` in the environment — the app then requires login (`/login`) and
signs an HMAC session cookie (edge-compatible, Web Crypto). Unset → no auth (dev only).
Do not deploy publicly without setting `LEDGERLEAF_PASSWORD`.

## What's built

- **Portfolio** — multiple properties, each with rooms inventory, city, currency; latest-month
  KPIs on the property card with a cross-portfolio median benchmark and a RevPAR-vs-portfolio badge
- **Monthly periods** — add months, copy figures from the previous month, autosave on every edit,
  per-period **lock** (prevents further edits until unlocked) with an **audit log** of changes
- **Rooms — Schedule 1** — full USALI detail, ported 1:1 from the source workbook formulas
- **Food & Beverage — Schedule 2 (full detail)** — outlets, cost of sales, labor, and other
  expenses with automatic aggregate recomputation
- **Other Operated & Misc (Sch 3–4), Undistributed (Sch 5–9), Fees & Fixed (Sch 10–11)** —
  condensed inputs
- **Summary Operating Statement** — Actual / Budget / Variance / Prior-Year Actual / PY Variance /
  % of revenue columns; GOP → EBITDA → EBITDA less Replacement Reserve
- **Budget entry** — seed a month's budget from actuals or prior year, edit line by line, save/clear
- **GST liability (India)** — accommodation slabs by ADR (0/12/18/28%) + 5% F&B composition;
  computes total output GST for the period
- **Daily operating statistics** — per-day sold/comps/house-use/no-show grid; "apply N sold to
  period" rolls the month up for occupancy/ADR
- **Dashboard** — Occupancy, ADR, RevPAR, Total RevPAR, GOP, GOPPAR, EBITDA, with a portfolio
  benchmark card (median RevPAR/GOPPAR/Occ)
- **Trends** — revenue/GOP/EBITDA bars, occupancy line, and a KPI table across all saved months
  (negative-safe charts with a zero baseline)
- **Trial-balance import** — upload/paste a CSV or tab-separated export (Tally, Zoho Books,
  Busy, Excel; Dr/Cr columns or single-amount with Dr/Cr suffixes, Indian digit grouping, and
  currency symbols). Ledger accounts are auto-suggested to USALI lines with India-aware
  heuristics (OTA commissions, PF/ESI, DG diesel…); mappings are saved per property, so the
  next month's import is one click. See `samples/trial-balance-sample.csv`.
- **URL-addressable views** — every view/period is deep-linkable (`/p/<id>?v=summary&period=2026-01`)

## Layout

| Path | Description |
|------|-------------|
| `src/lib/engine.ts` | USALI calculation engine, F&B aggregates, GST — pure functions, unit-tested |
| `src/lib/db.ts` | SQLite persistence (properties, periods, budgets, daily stats, KPI cache, audit log, mappings) |
| `src/lib/importer.ts` | Trial-balance CSV parser, USALI target catalog, mapping heuristics |
| `src/lib/fiscal.ts` | Period helpers, Indian FY (Apr–Mar) labels |
| `src/lib/format.ts` | `en-IN` money formatting, lakh/crore compact figures |
| `src/lib/auth.ts` | HMAC session cookie auth (edge-compatible) |
| `src/middleware.ts` | Route guard (active when `LEDGERLEAF_PASSWORD` is set) |
| `src/app/` | Next.js pages + REST API routes |
| `src/components/` | Workspace, schedule views, dashboard, trends, error boundary |
| `scripts/seed.ts` | Demo data: 42-room independent hotel in Jaipur, Jan–Jun 2026 |
| `usali-prototype.html` | Original single-file prototype (kept for reference) |
| `USALI Hotel Accounting Templates_BSG.xlsx` | Source workbook defining the calculation logic |

## Roadmap (next)

1. Multi-user auth with per-property roles; PDF / board-pack export; billing
2. India specifics: GST return preparation (GSTR-1/3B), TDS, statutory compliance calendar
3. Cash flow statement and balance-sheet stubs
4. More peer-benchmarking slices (segment, city, ADR band)

## Notes

This project reproduces the USALI line-item *structure* for practitioner use; it is not the
copyrighted text of the standard. USALI is published by HFTP and the American Hotel &
Lodging Association. A legal review of the structure is recommended before commercialization.
