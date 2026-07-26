import { describe, expect, it } from 'vitest';
import { compact, money, num, pct, sym } from './format';

describe('money', () => {
  it('groups in en-IN lakh/crore style and shows parens for negatives', () => {
    expect(money(1234567, 'INR')).toBe('₹12,34,567');
    expect(money(-1000, 'INR')).toBe('(₹1,000)');
    expect(money(0, 'INR')).toBe('—');
  });
  it('uses the configured currency symbol', () => {
    expect(money(5000, 'USD')).toBe('$5,000');
    expect(money(5000, 'AED')).toBe('AED 5,000');
    expect(sym('SGD')).toBe('S$');
    expect(sym('XYZ')).toBe('XYZ '); // unknown → code + space
  });
});

describe('compact', () => {
  it('renders INR as L / Cr', () => {
    expect(compact(150000, 'INR')).toBe('₹1.5 L');
    expect(compact(15000000, 'INR')).toBe('₹1.50 Cr');  // 1.5 crore
    expect(compact(150000000, 'INR')).toBe('₹15.00 Cr'); // 15 crore
    expect(compact(-2300000, 'INR')).toBe('(₹23.0 L)');
  });
  it('renders other currencies as K / M', () => {
    expect(compact(15000, 'USD')).toBe('$15K');
    expect(compact(2500000, 'USD')).toBe('$2.50M');
  });
});

describe('pct', () => {
  it('returns empty string for zero / non-finite', () => {
    expect(pct(0)).toBe('');
    expect(pct(NaN)).toBe('');
  });
  it('formats a fraction as a percentage', () => {
    expect(pct(0.5)).toBe('50.0%');
    expect(pct(0.125, 2)).toBe('12.50%');
  });
});

describe('num', () => {
  it('parses user input tolerating commas and spaces', () => {
    expect(num('1,234')).toBe(1234);
    expect(num(' 12 345 ')).toBe(12345);
    expect(num('abc')).toBe(0);
  });
});