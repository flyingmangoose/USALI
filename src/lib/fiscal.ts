/**
 * Period & fiscal-year helpers. Periods are 'YYYY-MM' strings.
 * Indian fiscal year runs April–March: '2026-05' belongs to FY 2026-27.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isValidPeriod(p: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
}

export function parsePeriod(p: string): { year: number; month: number } {
  const [y, m] = p.split('-').map(Number);
  return { year: y, month: m };
}

export function daysInPeriod(p: string): number {
  const { year, month } = parsePeriod(p);
  return new Date(year, month, 0).getDate();
}

export function periodLabel(p: string): string {
  const { year, month } = parsePeriod(p);
  return `${MONTHS[month - 1]} ${year}`;
}

export function periodLabelShort(p: string): string {
  const { year, month } = parsePeriod(p);
  return `${MONTHS[month - 1]} '${String(year).slice(2)}`;
}

/** Indian FY label: Apr 2026 – Mar 2027 → 'FY 2026-27'. */
export function fyLabel(p: string): string {
  const { year, month } = parsePeriod(p);
  const start = month >= 4 ? year : year - 1;
  return `FY ${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export function addMonths(p: string, delta: number): string {
  const { year, month } = parsePeriod(p);
  const idx = year * 12 + (month - 1) + delta;
  const y = Math.floor(idx / 12), m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function comparePeriods(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
