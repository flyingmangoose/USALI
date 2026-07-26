/**
 * Number formatting — India-first. `en-IN` locale gives lakh/crore digit
 * grouping (₹12,34,567) for every currency; compact() renders KPI-sized
 * figures as L / Cr for INR and K / M otherwise.
 */

const SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ', SGD: 'S$', LKR: 'Rs ', NPR: 'Rs ',
};

export function sym(ccy: string): string {
  return SYMBOLS[ccy] ?? ccy + ' ';
}

export function money(n: number, ccy = 'INR', dec = 0): string {
  if (n === 0 || n === null || n === undefined || isNaN(n)) return '—';
  const neg = n < 0;
  const s = sym(ccy) + Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });
  return neg ? '(' + s + ')' : s;
}

/** Compact KPI figure: INR → lakh/crore; other currencies → K/M. */
export function compact(n: number, ccy = 'INR'): string {
  if (n === 0 || n === null || n === undefined || isNaN(n)) return '—';
  const neg = n < 0;
  const a = Math.abs(n);
  let s: string;
  if (ccy === 'INR') {
    if (a >= 1e7) s = sym(ccy) + (a / 1e7).toFixed(2) + ' Cr';
    else if (a >= 1e5) s = sym(ccy) + (a / 1e5).toFixed(1) + ' L';
    else s = money(a, ccy);
  } else {
    if (a >= 1e6) s = sym(ccy) + (a / 1e6).toFixed(2) + 'M';
    else if (a >= 1e4) s = sym(ccy) + (a / 1e3).toFixed(0) + 'K';
    else s = money(a, ccy);
  }
  return neg ? '(' + s + ')' : s;
}

export function pct(n: number, dec = 1): string {
  if (!isFinite(n) || n === 0) return '';
  return (n * 100).toFixed(dec) + '%';
}

/** Parse a user-typed number, tolerating commas and spaces. */
export function num(v: string | number): number {
  const n = parseFloat(String(v).replace(/[, ]/g, ''));
  return isNaN(n) ? 0 : n;
}
