import { describe, expect, it } from 'vitest';
import {
  addMonths, comparePeriods, daysInPeriod, fyLabel, isValidPeriod, periodLabel, periodLabelShort,
} from './fiscal';

describe('isValidPeriod', () => {
  it('accepts YYYY-MM', () => {
    expect(isValidPeriod('2026-01')).toBe(true);
    expect(isValidPeriod('2026-12')).toBe(true);
  });
  it('rejects junk', () => {
    expect(isValidPeriod('2026-13')).toBe(false);
    expect(isValidPeriod('2026-00')).toBe(false);
    expect(isValidPeriod('20261')).toBe(false);
    expect(isValidPeriod('')).toBe(false);
  });
});

describe('fyLabel', () => {
  it('maps April–March to the Indian fiscal year', () => {
    expect(fyLabel('2026-04')).toBe('FY 2026-27'); // Apr 2026 starts FY 2026-27
    expect(fyLabel('2026-03')).toBe('FY 2025-26'); // Mar 2026 is the tail of FY 2025-26
    expect(fyLabel('2027-01')).toBe('FY 2026-27');
  });
});

describe('addMonths / comparePeriods / daysInPeriod', () => {
  it('rolls across year boundaries', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-07', -12)).toBe('2025-07'); // prior year
  });
  it('orders periods lexicographically', () => {
    expect(comparePeriods('2026-01', '2026-02')).toBe(-1);
    expect(comparePeriods('2026-12', '2026-01')).toBe(1);
    expect(comparePeriods('2026-05', '2026-05')).toBe(0);
  });
  it('counts days in the month', () => {
    expect(daysInPeriod('2026-01')).toBe(31);
    expect(daysInPeriod('2026-02')).toBe(28); // 2026 not a leap year
    expect(daysInPeriod('2024-02')).toBe(29); // leap year
  });
  it('formats labels', () => {
    expect(periodLabel('2026-07')).toBe('Jul 2026');
    expect(periodLabelShort('2026-07')).toBe("Jul '26");
  });
});