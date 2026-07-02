'use client';
import { PeriodData, deptCalc } from '@/lib/engine';
import { money } from '@/lib/format';
import Cell from '../Cell';
import type { Updater } from '../Workspace';

function CondensedTable({ data, dept, ccy, update, lines }: {
  data: PeriodData; dept: 'fb' | 'ood'; ccy: string; update: Updater;
  lines: [string, 'rev' | 'labor' | 'other'][];
}) {
  const obj = data[dept];
  const c = deptCalc(obj);
  return (
    <table>
      <thead><tr><th>Line Item</th><th>Actual</th></tr></thead>
      <tbody>
        {lines.map(([label, key]) => (
          <tr key={key}>
            <td className={key === 'rev' ? 'section' : 'ind1'}>{label}</td>
            <td><Cell value={obj[key] || 0} onChange={n => update(d => { d[dept][key] = n; })} /></td>
          </tr>
        ))}
        <tr className="grand">
          <td>Departmental Profit</td>
          <td className={`calc${c.profit < 0 ? ' neg' : ''}`}>{money(c.profit, ccy)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function FBView({ data, ccy, update }: { data: PeriodData; ccy: string; update: Updater }) {
  return (
    <div className="card">
      <div className="head"><h2>Food &amp; Beverage — Schedule 2</h2><span className="sub">Condensed</span></div>
      <div className="body flush">
        <CondensedTable data={data} dept="fb" ccy={ccy} update={update}
          lines={[['Total F&B Revenue', 'rev'], ['Labor & Related', 'labor'], ['Cost of Sales & Other Expenses', 'other']]} />
      </div>
    </div>
  );
}

export function OtherView({ data, ccy, update }: { data: PeriodData; ccy: string; update: Updater }) {
  return (
    <>
      <div className="card">
        <div className="head"><h2>Other Operated Departments — Schedule 3</h2></div>
        <div className="body flush">
          <CondensedTable data={data} dept="ood" ccy={ccy} update={update}
            lines={[['Other Operated Dept Revenue', 'rev'], ['Labor & Related', 'labor'], ['Other Expenses', 'other']]} />
        </div>
      </div>
      <div className="card">
        <div className="head"><h2>Miscellaneous Income — Schedule 4</h2><span className="sub">Pure income — no departmental expense</span></div>
        <div className="body flush">
          <table>
            <tbody>
              <tr>
                <td className="section">Total Miscellaneous Income</td>
                <td><Cell value={data.misc.rev || 0} onChange={n => update(d => { d.misc.rev = n; })} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const UNDIST: ['ag' | 'it' | 'sm' | 'pom' | 'util', string][] = [
  ['ag', 'Sch 5 · Administrative & General'],
  ['it', 'Sch 6 · Information & Telecom'],
  ['sm', 'Sch 7 · Sales & Marketing'],
  ['pom', 'Sch 8 · Property Operation & Maintenance'],
  ['util', 'Sch 9 · Utilities'],
];

export function UndistView({ data, ccy, update }: { data: PeriodData; ccy: string; update: Updater }) {
  const tot = UNDIST.reduce((s, [k]) => s + (data[k].exp || 0), 0);
  return (
    <div className="card">
      <div className="head"><h2>Undistributed Operating Expenses — Sch 5–9</h2><span className="sub">No revenue — overhead expense only</span></div>
      <div className="body flush">
        <table>
          <thead><tr><th>Schedule</th><th>Expense</th></tr></thead>
          <tbody>
            {UNDIST.map(([key, label]) => (
              <tr key={key}>
                <td className="section">{label}</td>
                <td><Cell value={data[key].exp || 0} onChange={n => update(d => { d[key].exp = n; })} /></td>
              </tr>
            ))}
            <tr className="grand"><td>Total Undistributed Expenses</td><td className="calc">{money(tot, ccy)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FixedView({ data, ccy, update }: { data: PeriodData; ccy: string; update: Updater }) {
  return (
    <div className="card">
      <div className="head"><h2>Management Fees &amp; Non-Operating — Sch 10–11</h2></div>
      <div className="body flush">
        <table>
          <thead><tr><th>Line Item</th><th>Amount</th></tr></thead>
          <tbody>
            <tr className="grouphdr"><td colSpan={2}>Sch 10 · Management Fees</td></tr>
            <tr><td className="ind1">Base Management Fee</td>
              <td><Cell value={data.mgmtFee.base || 0} onChange={n => update(d => { d.mgmtFee.base = n; })} /></td></tr>
            <tr><td className="ind1">Incentive Management Fee</td>
              <td><Cell value={data.mgmtFee.incentive || 0} onChange={n => update(d => { d.mgmtFee.incentive = n; })} /></td></tr>
            <tr className="grouphdr"><td colSpan={2}>Sch 11 · Non-Operating Income &amp; Expenses</td></tr>
            <tr><td className="ind1">Rent</td>
              <td><Cell value={data.nonop.rent || 0} onChange={n => update(d => { d.nonop.rent = n; })} /></td></tr>
            <tr><td className="ind1">Property &amp; Other Taxes</td>
              <td><Cell value={data.nonop.tax || 0} onChange={n => update(d => { d.nonop.tax = n; })} /></td></tr>
            <tr><td className="ind1">Insurance</td>
              <td><Cell value={data.nonop.insurance || 0} onChange={n => update(d => { d.nonop.insurance = n; })} /></td></tr>
            <tr><td className="ind1">Other</td>
              <td><Cell value={data.nonop.other || 0} onChange={n => update(d => { d.nonop.other = n; })} /></td></tr>
            <tr className="grouphdr"><td colSpan={2}>Replacement Reserve</td></tr>
            <tr><td className="ind1">FF&amp;E Reserve</td>
              <td><Cell value={data.reserve || 0} onChange={n => update(d => { d.reserve = n; })} /></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
