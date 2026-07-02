'use client';
import { PeriodData, RoomsData, Totals } from '@/lib/engine';
import { money, pct } from '@/lib/format';
import { periodLabel } from '@/lib/fiscal';
import Cell from '../Cell';
import type { Updater } from '../Workspace';

type Row =
  | ['group' | 'sec', string]
  | ['in', string, keyof RoomsData, 0 | 1]
  | ['calc' | 'grand', string, keyof Totals['R']];

const ROWS: Row[] = [
  ['group', 'Revenue'],
  ['sec', 'Transient Rooms Revenue'],
  ['in', 'Retail', 'retail', 1], ['in', 'Discount', 'discount', 1], ['in', 'Negotiated', 'negotiated', 1],
  ['in', 'Qualified', 'qualified', 1], ['in', 'Wholesale', 'wholesale', 1],
  ['calc', 'Total Transient Rooms Revenue', 'transient'],
  ['sec', 'Group Rooms Revenue'],
  ['in', 'Corporate', 'corporate', 1], ['in', 'Association/Convention', 'assoc', 1], ['in', 'Government', 'govt', 1],
  ['in', 'Tour/Wholesalers', 'tour', 1], ['in', 'SMERF', 'smerf', 1],
  ['calc', 'Total Group Rooms Revenue', 'group'],
  ['in', 'Contract Rooms Revenue', 'contract', 0], ['in', 'Other Rooms Revenue', 'other', 0], ['in', 'Less: Allowances', 'allowances', 0],
  ['grand', 'Total Rooms Revenue', 'totalRev'],
  ['group', 'Expenses'],
  ['sec', 'Labor — Salaries & Wages'],
  ['in', 'Management', 'salMgmt', 1], ['in', 'Front Office', 'salFront', 1], ['in', 'Guest Services', 'salGuest', 1],
  ['in', 'Housekeeping', 'salHK', 1], ['in', 'Laundry', 'salLaundry', 1], ['in', 'Reservations', 'salRes', 1],
  ['in', 'Transportation', 'salTransport', 1],
  ['calc', 'Sub-Total: Salaries and Wages', 'sw'],
  ['in', 'Service Charge Distribution', 'svcCharge', 0], ['in', 'Contracted/Leased Labor', 'contractLabor', 0],
  ['in', 'Bonuses and Incentives', 'bonus', 0],
  ['in', 'Payroll Taxes', 'payTax', 0], ['in', 'Supplemental Pay', 'suppPay', 0], ['in', 'Employee Benefits', 'benefits', 0],
  ['calc', 'Total Labor Costs & Related', 'totalLabor'],
  ['sec', 'Other Expenses'],
  ['in', 'Cleaning Supplies', 'cleaning', 1], ['in', 'Commissions', 'commissions', 1], ['in', 'Complimentary F&B', 'compFB', 1],
  ['in', 'Contract Services', 'contractSvc', 1], ['in', 'Guest Supplies', 'guestSupplies', 1],
  ['in', 'Laundry & Dry Cleaning', 'laundryDC', 1], ['in', 'Linen', 'linen', 1], ['in', 'Operating Supplies', 'opSupplies', 1],
  ['in', 'Reservations', 'reservations', 1], ['in', 'Training', 'training', 1], ['in', 'Uniform Costs', 'uniforms', 1],
  ['in', 'Miscellaneous', 'miscRooms', 1],
  ['calc', 'Total Other Expenses', 'otherExp'],
  ['calc', 'Total Expenses', 'totalExp'],
  ['grand', 'Departmental Profit', 'profit'],
];

export default function RoomsView({ data, totals, ccy, update, propName, period }: {
  data: PeriodData; totals: Totals; ccy: string; update: Updater; propName: string; period: string;
}) {
  const R = totals.R;
  const tot = R.totalRev || 0;
  return (
    <>
      <div className="card">
        <div className="head">
          <h2>Rooms — Schedule 1</h2><span className="tag">USALI 11th Ed.</span>
          <span className="sub">{propName} · {periodLabel(period)}</span>
        </div>
        <div className="body flush">
          <div style={{ padding: '12px 20px 0' }}>
            <div className="legend">
              <span><span className="sw" style={{ background: 'var(--input)', border: '1px solid var(--inputtxt)' }}></span>Input cells</span>
              <span><span className="sw" style={{ background: 'var(--calc)' }}></span>Calculated</span>
              <span>% of Total Rooms Revenue</span>
            </div>
          </div>
          <table>
            <thead><tr><th>Line Item</th><th>Actual</th><th className="pct">% Rev</th></tr></thead>
            <tbody>
              {ROWS.map((row, i) => {
                if (row[0] === 'group') return <tr key={i} className="grouphdr"><td colSpan={3}>{row[1]}</td></tr>;
                if (row[0] === 'sec') return <tr key={i} className="section"><td colSpan={3}>{row[1]}</td></tr>;
                if (row[0] === 'in') {
                  const key = row[2] as keyof RoomsData;
                  const v = data.rooms[key] || 0;
                  return (
                    <tr key={i}>
                      <td className={row[3] ? 'ind2' : 'ind1'}>{row[1]}</td>
                      <td><Cell value={v} onChange={n => update(d => { d.rooms[key] = n; })} /></td>
                      <td className="pct">{tot ? pct(v / tot) : ''}</td>
                    </tr>
                  );
                }
                const v = R[row[2] as keyof Totals['R']];
                return (
                  <tr key={i} className={row[0] === 'grand' ? 'grand' : 'total'}>
                    <td>{row[1]}</td>
                    <td className={`calc${v < 0 ? ' neg' : ''}`}>{money(v, ccy)}</td>
                    <td className="pct">{tot ? pct(v / tot) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="head"><h2>Operating Statistics</h2><span className="sub">Drives ADR / RevPAR</span></div>
        <div className="body">
          <table>
            <tbody>
              <tr><td>Rooms Available <span className="pct">(inventory × days in month)</span></td>
                <td className="calc">{totals.avail ? totals.avail.toLocaleString('en-IN') : '—'}</td></tr>
              <tr><td>Rooms Sold</td>
                <td><Cell value={data.stats.sold || 0} onChange={n => update(d => { d.stats.sold = n; })} /></td></tr>
              <tr className="total"><td>Occupancy %</td><td className="calc">{pct(totals.occ) || '—'}</td></tr>
              <tr className="total"><td>ADR</td><td className="calc">{money(totals.adr, ccy, 2)}</td></tr>
              <tr className="total"><td>RevPAR</td><td className="calc">{money(totals.revpar, ccy, 2)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
