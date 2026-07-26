import { describe, expect, it } from 'vitest';
import { calcAll, calcRooms, emptyPeriodData, normalizePeriodData, PeriodData } from './engine';

/** The Cedarwood Inn demo dataset from the original prototype — expected values
 * hand-computed from the workbook formulas. */
function demoData(): PeriodData {
  const d = emptyPeriodData();
  d.stats.sold = 1979;
  Object.assign(d.rooms, {
    retail: 268000, discount: 31000, negotiated: 54000, qualified: 22000, wholesale: 18000,
    corporate: 41000, assoc: 12000, govt: 9000, tour: 7000, smerf: 6000,
    contract: 8000, other: 5500, allowances: 4200,
    salMgmt: 21000, salFront: 18500, salGuest: 7400, salHK: 26800, salLaundry: 5200, salRes: 4100, salTransport: 2600,
    svcCharge: 0, contractLabor: 6200, bonus: 3500,
    payTax: 7800, suppPay: 2100, benefits: 14600,
    cleaning: 5400, commissions: 21800, compFB: 1800, contractSvc: 3900, guestSupplies: 9100,
    laundryDC: 2400, linen: 3100, opSupplies: 6700, reservations: 8800, training: 1200, uniforms: 1500, miscRooms: 2600,
  });
  Object.assign(d.fb, { rev: 186000, labor: 74000, other: 62000 });
  d.ood = { rev: 28000, labor: 9000, other: 7000 };
  d.misc = { rev: 14500 };
  d.ag = { exp: 41000 }; d.it = { exp: 8600 }; d.sm = { exp: 33000 }; d.pom = { exp: 22000 }; d.util = { exp: 19500 };
  d.mgmtFee = { base: 18000, incentive: 0 };
  d.nonop = { rent: 0, tax: 24000, insurance: 9500, other: 0 };
  d.reserve = 24000;
  return d;
}

describe('calcRooms', () => {
  it('matches the workbook roll-up', () => {
    const R = calcRooms(demoData().rooms);
    expect(R.transient).toBe(393000);
    expect(R.group).toBe(75000);
    expect(R.totalRev).toBe(477300);
    expect(R.sw).toBe(85600);
    expect(R.totalLaborWages).toBe(95300);
    expect(R.payroll).toBe(24500);
    expect(R.totalLabor).toBe(119800);
    expect(R.otherExp).toBe(68300);
    expect(R.totalExp).toBe(188100);
    expect(R.profit).toBe(289200);
  });
});

describe('calcAll', () => {
  const a = calcAll(demoData(), 84 * 31);

  it('rolls up to the Summary Operating Statement', () => {
    expect(a.totalRev).toBe(705800);
    expect(a.deptExp).toBe(340100);
    expect(a.deptProfit).toBe(365700);
    expect(a.undist).toBe(124100);
    expect(a.gop).toBe(241600);
    expect(a.mgmt).toBe(18000);
    expect(a.incomeAfterMgmt).toBe(223600);
    expect(a.nonop).toBe(33500);
    expect(a.ebitda).toBe(190100);
    expect(a.ebitdaLessReserve).toBe(166100);
  });

  it('computes operating statistics', () => {
    expect(a.avail).toBe(2604);
    expect(a.occ).toBeCloseTo(1979 / 2604, 6);
    expect(a.adr).toBeCloseTo(477300 / 1979, 4);
    expect(a.revpar).toBeCloseTo(477300 / 2604, 4);
    expect(a.trevpar).toBeCloseTo(705800 / 2604, 4);
    expect(a.goppar).toBeCloseTo(241600 / 2604, 4);
  });

  it('guards divide-by-zero when the property has no rooms or sales', () => {
    const z = calcAll(emptyPeriodData(), 0);
    expect(z.occ).toBe(0);
    expect(z.adr).toBe(0);
    expect(z.revpar).toBe(0);
  });
});

describe('normalizePeriodData', () => {
  it('fills missing sections with zeros and drops unknown keys', () => {
    const n = normalizePeriodData({ fb: { rev: 100, bogus: 9 }, junk: { x: 1 } } as unknown);
    expect(n.fb.rev).toBe(100);
    expect(n.fb.labor).toBe(0);
    expect((n.fb as unknown as Record<string, unknown>).bogus).toBeUndefined();
    expect((n as unknown as Record<string, unknown>).junk).toBeUndefined();
    expect(n.rooms.retail).toBe(0);
    expect(n.reserve).toBe(0);
  });

  it('preserves top-level scalars', () => {
    const n = normalizePeriodData({ reserve: 5000 });
    expect(n.reserve).toBe(5000);
  });
});
