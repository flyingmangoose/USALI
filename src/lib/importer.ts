/**
 * Trial-balance CSV import: parsing, USALI target catalog, account-name
 * auto-suggestion, and application of mapped rows onto a PeriodData.
 * Pure functions — shared by the client Import view and unit tests.
 *
 * Sign convention: a trial balance carries debits and credits; the USALI
 * target a row is mapped to already says whether it is revenue or expense,
 * so amounts are applied as absolute values.
 */
import { PeriodData } from './engine';

export interface TBRow { account: string; amount: number }

/** Strip currency symbols/grouping; handle (1,234), -1234, and Tally's "1,234.00 Dr / Cr". */
export function parseAmount(s: string): number {
  let t = s.trim();
  if (!t) return 0;
  let sign = 1;
  if (/^\(.*\)$/.test(t)) { sign = -1; t = t.slice(1, -1); }
  const drcr = t.match(/\b(dr|cr)\.?$/i);
  if (drcr) t = t.slice(0, drcr.index).trim();
  t = t.replace(/[₹$€£,\s]/g, '');
  const n = parseFloat(t);
  if (isNaN(n)) return 0;
  return sign * n;
}

function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

const NAME_RE = /particular|account|ledger|head|description|name/i;
const DEBIT_RE = /debit|^dr\.?$/i;
const CREDIT_RE = /credit|^cr\.?$/i;
const AMOUNT_RE = /amount|balance|closing|net/i;
const SKIP_ROW_RE = /^(total|grand total|sub ?total|opening balance|closing balance|difference in opening)/i;

/**
 * Parse a pasted/uploaded trial balance. Sniffs the delimiter (comma / tab /
 * semicolon), detects the header row and its columns, and nets Debit − Credit
 * when both columns exist. Rows with the same account name are summed.
 */
export function parseTrialBalance(text: string): { rows: TBRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = text.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
  if (!lines.length) return { rows: [], warnings: ['No data found.'] };

  const sample = lines.slice(0, 5).join('\n');
  const delim = [',', '\t', ';']
    .map(d => ({ d, n: (sample.match(new RegExp(d === '\t' ? '\t' : `\\${d}`, 'g')) || []).length }))
    .sort((a, b) => b.n - a.n)[0];
  if (delim.n === 0) return { rows: [], warnings: ['Could not detect a column separator — expected CSV or tab-separated data.'] };

  const grid = lines.map(l => splitLine(l, delim.d));

  // Header detection: a row with a name-ish cell and a debit/credit/amount-ish cell.
  let headerIdx = -1;
  let nameCol = 0, debitCol = -1, creditCol = -1, amountCol = -1;
  for (let i = 0; i < Math.min(grid.length, 8); i++) {
    const cells = grid[i];
    const n = cells.findIndex(c => NAME_RE.test(c));
    const dr = cells.findIndex(c => DEBIT_RE.test(c));
    const cr = cells.findIndex(c => CREDIT_RE.test(c));
    const am = cells.findIndex(c => AMOUNT_RE.test(c));
    if (n >= 0 && (dr >= 0 || cr >= 0 || am >= 0)) {
      headerIdx = i; nameCol = n; debitCol = dr; creditCol = cr; amountCol = am;
      break;
    }
  }
  if (headerIdx < 0) {
    // No header: assume name in col 0; cols 1(+2) are amounts.
    const width = grid[0].length;
    nameCol = 0;
    if (width >= 3) { debitCol = 1; creditCol = 2; }
    else amountCol = 1;
    warnings.push('No header row detected — assumed first column is the account and the rest are amounts.');
  }

  const byAccount = new Map<string, number>();
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const cells = grid[i];
    const account = (cells[nameCol] || '').trim();
    if (!account || SKIP_ROW_RE.test(account)) continue;
    let amt = 0;
    if (debitCol >= 0 || creditCol >= 0) {
      const dr = debitCol >= 0 ? parseAmount(cells[debitCol] || '') : 0;
      const cr = creditCol >= 0 ? parseAmount(cells[creditCol] || '') : 0;
      amt = dr - cr;
    } else if (amountCol >= 0) {
      amt = parseAmount(cells[amountCol] || '');
    }
    if (amt === 0) continue;
    byAccount.set(account, (byAccount.get(account) || 0) + amt);
  }

  const rows = [...byAccount.entries()].map(([account, amount]) => ({ account, amount }));
  if (!rows.length) warnings.push('No account rows with amounts were found.');
  return { rows, warnings };
}

/* ---------- USALI target catalog ---------- */

export interface Target { path: string; label: string; group: string }

export const TARGETS: Target[] = [
  ...[
    ['retail', 'Retail'], ['discount', 'Discount'], ['negotiated', 'Negotiated'], ['qualified', 'Qualified'],
    ['wholesale', 'Wholesale'], ['corporate', 'Group — Corporate'], ['assoc', 'Group — Association'],
    ['govt', 'Group — Government'], ['tour', 'Group — Tour/Wholesalers'], ['smerf', 'Group — SMERF'],
    ['contract', 'Contract Rooms Revenue'], ['other', 'Other Rooms Revenue'], ['allowances', 'Allowances (contra)'],
  ].map(([k, l]) => ({ path: `rooms.${k}`, label: l, group: 'Rooms — Revenue' })),
  ...[
    ['salMgmt', 'Salaries — Management'], ['salFront', 'Salaries — Front Office'], ['salGuest', 'Salaries — Guest Services'],
    ['salHK', 'Salaries — Housekeeping'], ['salLaundry', 'Salaries — Laundry'], ['salRes', 'Salaries — Reservations'],
    ['salTransport', 'Salaries — Transportation'], ['svcCharge', 'Service Charge Distribution'],
    ['contractLabor', 'Contracted/Leased Labor'], ['bonus', 'Bonuses & Incentives'],
    ['payTax', 'Payroll Taxes'], ['suppPay', 'Supplemental Pay'], ['benefits', 'Employee Benefits (PF/ESI/Gratuity)'],
  ].map(([k, l]) => ({ path: `rooms.${k}`, label: l, group: 'Rooms — Labor' })),
  ...[
    ['cleaning', 'Cleaning Supplies'], ['commissions', 'Commissions (OTA/agent)'], ['compFB', 'Complimentary F&B'],
    ['contractSvc', 'Contract Services'], ['guestSupplies', 'Guest Supplies & Amenities'], ['laundryDC', 'Laundry & Dry Cleaning'],
    ['linen', 'Linen'], ['opSupplies', 'Operating Supplies'], ['reservations', 'Reservations Systems'],
    ['training', 'Training'], ['uniforms', 'Uniforms'], ['miscRooms', 'Miscellaneous'],
  ].map(([k, l]) => ({ path: `rooms.${k}`, label: l, group: 'Rooms — Other Expenses' })),
  { path: 'fb.rev', label: 'F&B Revenue', group: 'Food & Beverage' },
  { path: 'fb.labor', label: 'F&B Labor & Related', group: 'Food & Beverage' },
  { path: 'fb.other', label: 'F&B Cost of Sales & Other', group: 'Food & Beverage' },
  { path: 'ood.rev', label: 'Other Operated — Revenue', group: 'Other Operated & Misc' },
  { path: 'ood.labor', label: 'Other Operated — Labor', group: 'Other Operated & Misc' },
  { path: 'ood.other', label: 'Other Operated — Other Expenses', group: 'Other Operated & Misc' },
  { path: 'misc.rev', label: 'Miscellaneous Income', group: 'Other Operated & Misc' },
  { path: 'ag.exp', label: 'Administrative & General', group: 'Undistributed (Sch 5–9)' },
  { path: 'it.exp', label: 'Information & Telecom', group: 'Undistributed (Sch 5–9)' },
  { path: 'sm.exp', label: 'Sales & Marketing', group: 'Undistributed (Sch 5–9)' },
  { path: 'pom.exp', label: 'Property Operation & Maintenance', group: 'Undistributed (Sch 5–9)' },
  { path: 'util.exp', label: 'Utilities', group: 'Undistributed (Sch 5–9)' },
  { path: 'mgmtFee.base', label: 'Base Management Fee', group: 'Fees, Fixed & Reserve' },
  { path: 'mgmtFee.incentive', label: 'Incentive Management Fee', group: 'Fees, Fixed & Reserve' },
  { path: 'nonop.rent', label: 'Rent / Lease', group: 'Fees, Fixed & Reserve' },
  { path: 'nonop.tax', label: 'Property & Other Taxes', group: 'Fees, Fixed & Reserve' },
  { path: 'nonop.insurance', label: 'Insurance', group: 'Fees, Fixed & Reserve' },
  { path: 'nonop.other', label: 'Non-Operating — Other', group: 'Fees, Fixed & Reserve' },
  { path: 'reserve', label: 'FF&E Replacement Reserve', group: 'Fees, Fixed & Reserve' },
];

export const TARGET_PATHS = new Set(TARGETS.map(t => t.path));

export function normalizeAccount(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Ordered keyword heuristics — specific rules before generic ones. */
const RULES: [RegExp, string][] = [
  // Revenue
  [/room (rent|revenue|sale|tariff)|accommodation|tariff/, 'rooms.retail'],
  [/allowance|rebate/, 'rooms.allowances'],
  // F&B costs and labor must outrank the F&B revenue catch-all below.
  [/(restaurant|kitchen|banquet|chef|steward|f\s*&\s*b).*(salar|wage|staff cost)/, 'fb.labor'],
  [/food cost|beverage cost|kitchen|grocer|provisions|vegetable|liquor purchase|gas cylinder|food.*purchase/, 'fb.other'],
  [/banquet|restaurant|food|beverage|f\s*&\s*b|bar sale|liquor sale|room service|breakfast/, 'fb.rev'],
  [/spa|gym|travel desk|tour income|transport income|laundry income|vehicle income/, 'ood.rev'],
  [/misc.*income|other income|forex|scrap|interest (received|income)/, 'misc.rev'],
  // Rooms labor
  [/housekeeping.*(salar|wage)/, 'rooms.salHK'],
  [/(front office|reception).*(salar|wage)/, 'rooms.salFront'],
  [/(reservation).*(salar|wage)/, 'rooms.salRes'],
  [/(driver|transport).*(salar|wage)/, 'rooms.salTransport'],
  [/(laundry).*(salar|wage)/, 'rooms.salLaundry'],
  [/provident|\bpf\b|\besi\b|esic|gratuity|mediclaim|staff welfare/, 'rooms.benefits'],
  [/bonus|incentive/, 'rooms.bonus'],
  [/contract (labor|labour|staff)|outsourced (labor|labour|staff)/, 'rooms.contractLabor'],
  // Rooms other expenses
  [/commission|ota\b|makemytrip|goibibo|booking\.com|agoda|expedia|yatra/, 'rooms.commissions'],
  [/guest suppl|amenit|toiletr/, 'rooms.guestSupplies'],
  [/linen/, 'rooms.linen'],
  [/laundry|dry ?clean/, 'rooms.laundryDC'],
  [/cleaning|housekeeping/, 'rooms.cleaning'],
  [/reservation|channel manager|gds\b/, 'rooms.reservations'],
  [/training/, 'rooms.training'],
  [/uniform/, 'rooms.uniforms'],
  // Undistributed
  [/electricity|power|diesel|generator|\bdg\b|water charge|fuel|lpg/, 'util.exp'],
  [/repair|maintenance|\bamc\b/, 'pom.exp'],
  [/marketing|advertis|promotion|publicity|social media/, 'sm.exp'],
  [/internet|telephone|broadband|wi-?fi|software|subscription|mobile/, 'it.exp'],
  // Fixed
  [/insurance/, 'nonop.insurance'],
  [/property tax|municipal|house tax/, 'nonop.tax'],
  [/rent|lease/, 'nonop.rent'],
  [/management fee/, 'mgmtFee.base'],
  [/ff&e|replacement reserve/, 'reserve'],
  // Generic admin (keep last)
  [/printing|stationery|audit|legal|professional|bank charge|licen[cs]e|accounting|security|office|salar|wage|payroll/, 'ag.exp'],
];

/** Best-guess USALI target for an account name; null → leave unmapped. */
export function suggestTarget(account: string): string | null {
  const a = normalizeAccount(account);
  for (const [re, target] of RULES) if (re.test(a)) return target;
  return null;
}

export interface Assignment { account: string; amount: number; target: string }

/**
 * Apply mapped rows onto a copy of the period data. Each distinct target is
 * zeroed first, then receives the sum of |amount| of its rows — re-importing
 * the same file is idempotent, and unmapped fields keep their values.
 */
export function applyImport(data: PeriodData, assignments: Assignment[]): PeriodData {
  const out = structuredClone(data);
  const rec = out as unknown as Record<string, Record<string, number> | number>;
  const set = (path: string, v: number) => {
    const [a, b] = path.split('.');
    if (b === undefined) rec[a] = v;
    else (rec[a] as Record<string, number>)[b] = v;
  };
  const get = (path: string): number => {
    const [a, b] = path.split('.');
    return b === undefined ? (rec[a] as number) : (rec[a] as Record<string, number>)[b];
  };
  const targets = new Set(assignments.map(x => x.target).filter(t => TARGET_PATHS.has(t)));
  for (const t of targets) set(t, 0);
  for (const { target, amount } of assignments) {
    if (!TARGET_PATHS.has(target)) continue;
    set(target, get(target) + Math.abs(amount));
  }
  return out;
}
