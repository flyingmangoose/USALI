import { describe, expect, it } from 'vitest';
import { gstCalc, GST_ROOM_SLABS, diffTotals, calcAll, emptyPeriodData } from './engine';

describe('gstCalc', () => {
  it('picks the 12% slab for ADR between ₹1,001 and ₹2,500', () => {
    const g = gstCalc(500000, 100000, 2000);
    expect(g.roomsRate).toBe(0.12);
    expect(g.roomsGST).toBe(60000);
    expect(g.fbRate).toBe(0.05);
    expect(g.fbGST).toBe(5000);
    expect(g.totalGST).toBe(65000);
  });
  it('picks the 28% slab above ₹7,500', () => {
    expect(gstCalc(0, 0, 8000).roomsRate).toBe(0.28);
  });
  it('is nil at or below ₹1,000', () => {
    expect(gstCalc(100000, 0, 1000).roomsGST).toBe(0);
    expect(gstCalc(100000, 0, 999).roomsRate).toBe(0);
  });
  it('orders slabs ascending by rate', () => {
    const rates = GST_ROOM_SLABS.map(s => s.rate);
    expect([...rates].sort((a, b) => a - b)).toEqual(rates);
  });
});

describe('diffTotals', () => {
  it('subtracts baseline from actual per field', () => {
    const a = calcAll(emptyPeriodData(), 100);
    a.totalRev = 500; a.gop = 100;
    const b = calcAll(emptyPeriodData(), 100);
    b.totalRev = 400; b.gop = 60;
    const d = diffTotals(a, b)!;
    expect(d.totalRev).toBe(100);
    expect(d.gop).toBe(40);
  });
  it('returns null without a baseline', () => {
    expect(diffTotals(calcAll(emptyPeriodData(), 0), null)).toBeNull();
  });
});