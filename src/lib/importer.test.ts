import { describe, expect, it } from 'vitest';
import { emptyPeriodData } from './engine';
import { applyImport, parseAmount, parseTrialBalance, suggestTarget } from './importer';

describe('parseAmount', () => {
  it('handles Indian grouping and currency symbols', () => {
    expect(parseAmount('₹12,34,567.50')).toBe(1234567.5);
    expect(parseAmount('1,234')).toBe(1234);
  });
  it('handles negatives and parentheses', () => {
    expect(parseAmount('(1,234)')).toBe(-1234);
    expect(parseAmount('-500')).toBe(-500);
  });
  it('handles Tally Dr/Cr suffixes', () => {
    expect(parseAmount('1,23,456.00 Dr')).toBe(123456);
    expect(parseAmount('99,000 Cr')).toBe(99000);
  });
  it('returns 0 for junk', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('n/a')).toBe(0);
  });
});

describe('parseTrialBalance', () => {
  it('parses a Tally-style debit/credit trial balance', () => {
    const csv = [
      'Particulars,Debit,Credit',
      'Room Rent,,“19,96,600”'.replace(/“|”/g, '"'),
      'Restaurant Sales,,"7,18,700"',
      'Housekeeping Salaries,"1,20,000",',
      'Electricity Charges,"2,45,000",',
      'Grand Total,"3,65,000","27,15,300"',
    ].join('\n');
    const { rows, warnings } = parseTrialBalance(csv);
    expect(warnings).toEqual([]);
    expect(rows).toHaveLength(4); // Grand Total skipped
    expect(rows.find(r => r.account === 'Room Rent')!.amount).toBe(-1996600); // credit balance
    expect(rows.find(r => r.account === 'Housekeeping Salaries')!.amount).toBe(120000);
  });

  it('parses a single amount column with Dr/Cr suffixes', () => {
    const csv = 'Ledger,Closing Balance\nRoom Revenue,"5,00,000 Cr"\nDiesel for DG,"40,000 Dr"';
    const { rows } = parseTrialBalance(csv);
    expect(rows.find(r => r.account === 'Room Revenue')!.amount).toBe(500000);
    expect(rows.find(r => r.account === 'Diesel for DG')!.amount).toBe(40000);
  });

  it('handles tab-separated exports and headerless files', () => {
    const tsv = 'Room Rent\t100000\nLinen Purchase\t5000';
    const { rows, warnings } = parseTrialBalance(tsv);
    expect(rows).toHaveLength(2);
    expect(warnings.some(w => w.includes('No header'))).toBe(true);
  });

  it('sums duplicate account names', () => {
    const csv = 'Account,Amount\nMisc,100\nMisc,250';
    const { rows } = parseTrialBalance(csv);
    expect(rows).toEqual([{ account: 'Misc', amount: 350 }]);
  });
});

describe('suggestTarget', () => {
  it('maps common Indian hotel ledger names', () => {
    expect(suggestTarget('Room Rent')).toBe('rooms.retail');
    expect(suggestTarget('Restaurant & Bar Sales')).toBe('fb.rev');
    expect(suggestTarget('MakeMyTrip Commission')).toBe('rooms.commissions');
    expect(suggestTarget('Electricity Charges')).toBe('util.exp');
    expect(suggestTarget('Diesel for Generator')).toBe('util.exp');
    expect(suggestTarget('PF & ESI Contribution')).toBe('rooms.benefits');
    expect(suggestTarget('Repairs & Maintenance - AMC')).toBe('pom.exp');
    expect(suggestTarget('Printing & Stationery')).toBe('ag.exp');
    expect(suggestTarget('Property Tax - Municipal')).toBe('nonop.tax');
    expect(suggestTarget('Housekeeping Salaries')).toBe('rooms.salHK');
    expect(suggestTarget('Guest Amenities')).toBe('rooms.guestSupplies');
  });
  it('does not misfile F&B labor/costs as F&B revenue', () => {
    expect(suggestTarget('Restaurant Staff Wages')).toBe('fb.labor');
    expect(suggestTarget('Food & Provisions Purchase')).toBe('fb.other');
    expect(suggestTarget('Kitchen Gas Cylinders')).toBe('fb.other');
    expect(suggestTarget('Restaurant & Bar Sales')).toBe('fb.rev');
    expect(suggestTarget('Banquet Income')).toBe('fb.rev');
  });
  it('returns null for unknown accounts', () => {
    expect(suggestTarget('Directors Loan Account')).toBeNull();
  });
});

describe('applyImport', () => {
  it('zeroes targeted fields then sums absolute amounts, leaving others untouched', () => {
    const d = emptyPeriodData();
    d.rooms.retail = 999; // stale value that should be replaced
    d.fb.labor = 5000;    // untargeted — must survive
    const out = applyImport(d, [
      { account: 'Room Rent', amount: -1996600, target: 'rooms.retail' },
      { account: 'OTA Rooms', amount: -100000, target: 'rooms.retail' },
      { account: 'Electricity', amount: 245000, target: 'util.exp' },
      { account: 'Junk', amount: 1, target: 'not.a.path' },
    ]);
    expect(out.rooms.retail).toBe(2096600);
    expect(out.util.exp).toBe(245000);
    expect(out.fb.labor).toBe(5000);
    expect(d.rooms.retail).toBe(999); // input not mutated
  });
});
