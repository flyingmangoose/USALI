# LedgerLeaf — USALI Hotel Financials

A web-based hotel financial reporting platform built on the **Uniform System of Accounts
for the Lodging Industry (USALI), 11th Revised Edition** — replacing the spreadsheet
workflow for **smaller independent hotels, starting with India**.

## Status

Working multi-property, multi-period web application (Next.js + SQLite). USALI departmental
schedules with live roll-ups to the Summary Operating Statement, a KPI dashboard, and
month-over-month trends. India-first: INR default with lakh/crore digit grouping and
compact ₹ L / ₹ Cr figures, April–March fiscal-year labels.

## Getting started

```bash
npm install
npm run seed   # optional: demo Indian property with 6 months of data
npm run dev    # http://localhost:3000
npm test       # USALI engine unit tests
```

Data is stored in `data/ledgerleaf.db` (SQLite, gitignored). Set `LEDGERLEAF_DB` to
override the path.

## What's built

- **Portfolio** — multiple properties, each with rooms inventory, city, currency; latest-month
  KPIs on the property card
- **Monthly periods** — add months, copy figures from the previous month, autosave on every edit
- **Rooms — Schedule 1** — full USALI detail, ported 1:1 from the source workbook formulas
- **Food & Beverage (Sch 2), Other Operated & Misc (Sch 3–4), Undistributed (Sch 5–9),
  Fees & Fixed (Sch 10–11)** — condensed inputs
- **Summary Operating Statement (Operators view)** — GOP → EBITDA → EBITDA less Replacement Reserve
- **Dashboard** — Occupancy, ADR, RevPAR, Total RevPAR, GOP, GOPPAR, EBITDA
- **Trends** — revenue/GOP/EBITDA bars, occupancy line, and a KPI table across all saved months
- **Trial-balance import** — upload/paste a CSV or tab-separated export (Tally, Zoho Books,
  Busy, Excel; Dr/Cr columns or single-amount with Dr/Cr suffixes, Indian digit grouping).
  Ledger accounts are auto-suggested to USALI lines with India-aware heuristics (OTA
  commissions, PF/ESI, DG diesel…), mappings are saved per property, so the next month's
  import is one click. See `samples/trial-balance-sample.csv`.

## Layout

| Path | Description |
|------|-------------|
| `src/lib/engine.ts` | USALI calculation engine — pure functions, unit-tested (`engine.test.ts`) |
| `src/lib/db.ts` | SQLite persistence (properties, monthly period data, account mappings) |
| `src/lib/importer.ts` | Trial-balance CSV parser, USALI target catalog, mapping heuristics |
| `src/lib/fiscal.ts` | Period helpers, Indian FY (Apr–Mar) labels |
| `src/lib/format.ts` | `en-IN` money formatting, lakh/crore compact figures |
| `src/app/` | Next.js pages + REST API routes |
| `src/components/` | Workspace, schedule views, dashboard, trends |
| `scripts/seed.ts` | Demo data: 42-room independent hotel in Jaipur, Jan–Jun 2026 |
| `usali-prototype.html` | Original single-file prototype (kept for reference) |
| `USALI Hotel Accounting Templates_BSG.xlsx` | Source workbook defining the calculation logic |

## Roadmap (next)

1. Budget vs. actual and prior-year comparison columns
2. Full detail for Schedules 2–11 (currently condensed)
3. Auth + multi-user, PDF/board-pack export, billing
4. India specifics: GST-aware revenue capture, statutory compliance calendar

## Notes

This project reproduces the USALI line-item *structure* for practitioner use; it is not the
copyrighted text of the standard. USALI is published by HFTP and the American Hotel &
Lodging Association. A legal review of the structure is recommended before commercialization.
