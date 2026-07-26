'use client';
import { PeriodData, deptCalc, recomputeFBAggregates } from '@/lib/engine';
import { money } from '@/lib/format';
import Cell from '../Cell';
import type { Updater } from '../Workspace';

function CondensedTable({ data, dept, ccy, update, canEdit, lines }: {
  data: PeriodData; dept: 'ood'; ccy: string; update: Updater; canEdit: boolean;
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
            <td><Cell value={obj[key] || 0} readOnly={!canEdit} onChange={n => update(d => { d[dept][key] = n; })} /></td>
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

export function FBView({ data, ccy, update, canEdit = true }: { data: PeriodData; ccy: string; update: Updater; canEdit?: boolean }) {
  const fb = data.fb;
  const ro = !canEdit;
  const o = fb.outlets, c = fb.cost, l = fb.laborD, od = fb.otherD;
  const rec = (fn: (d: PeriodData) => void) => update(d => { fn(d); recomputeFBAggregates(d.fb); });
  return (
    <div className="card">
      <div className="head">
        <h2>Food &amp; Beverage — Schedule 2</h2>
        <span className="tag">USALI 11th Ed.</span>
        <span className="sub">Revenue by outlet · cost of sales · labor · other</span>
      </div>
      <div className="body flush">
        <table>
          <thead><tr><th>Line Item</th><th>Actual</th></tr></thead>
          <tbody>
            <tr className="grouphdr"><td colSpan={2}>Revenue by outlet</td></tr>
            <tr><td className="ind1">Restaurant / Coffee Shop</td>
              <td><Cell value={o.restaurant || 0} readOnly={ro} onChange={n => rec(d => { d.fb.outlets.restaurant = n; })} /></td></tr>
            <tr><td className="ind1">Banquets / Events</td>
              <td><Cell value={o.banquet || 0} readOnly={ro} onChange={n => rec(d => { d.fb.outlets.banquet = n; })} /></td></tr>
            <tr><td className="ind1">Room Service / Mini-bar</td>
              <td><Cell value={o.roomService || 0} readOnly={ro} onChange={n => rec(d => { d.fb.outlets.roomService = n; })} /></td></tr>
            <tr><td className="ind1">Bar / Lounge</td>
              <td><Cell value={o.bar || 0} readOnly={ro} onChange={n => rec(d => { d.fb.outlets.bar = n; })} /></td></tr>
            <tr><td className="ind1">Other F&amp;B Revenue</td>
              <td><Cell value={o.other || 0} readOnly={ro} onChange={n => rec(d => { d.fb.outlets.other = n; })} /></td></tr>
            <tr className="total"><td>Total F&amp;B Revenue</td><td className="calc">{money(fb.rev, ccy)}</td></tr>

            <tr className="grouphdr"><td colSpan={2}>Cost of Sales</td></tr>
            <tr><td className="ind1">Cost of Food</td>
              <td><Cell value={c.food || 0} readOnly={ro} onChange={n => rec(d => { d.fb.cost.food = n; })} /></td></tr>
            <tr><td className="ind1">Cost of Beverages</td>
              <td><Cell value={c.beverage || 0} readOnly={ro} onChange={n => rec(d => { d.fb.cost.beverage = n; })} /></td></tr>

            <tr className="grouphdr"><td colSpan={2}>Labor &amp; Related</td></tr>
            <tr><td className="ind1">Salaries &amp; Wages</td>
              <td><Cell value={l.sal || 0} readOnly={ro} onChange={n => rec(d => { d.fb.laborD.sal = n; })} /></td></tr>
            <tr><td className="ind1">Service Charge Distribution</td>
              <td><Cell value={l.svcCharge || 0} readOnly={ro} onChange={n => rec(d => { d.fb.laborD.svcCharge = n; })} /></td></tr>
            <tr><td className="ind1">Contracted/Leased Labor</td>
              <td><Cell value={l.contractLabor || 0} readOnly={ro} onChange={n => rec(d => { d.fb.laborD.contractLabor = n; })} /></td></tr>
            <tr><td className="ind1">Bonuses &amp; Incentives</td>
              <td><Cell value={l.bonus || 0} readOnly={ro} onChange={n => rec(d => { d.fb.laborD.bonus = n; })} /></td></tr>
            <tr><td className="ind1">Payroll Taxes</td>
              <td><Cell value={l.payTax || 0} readOnly={ro} onChange={n => rec(d => { d.fb.laborD.payTax = n; })} /></td></tr>
            <tr><td className="ind1">Supplemental Pay</td>
              <td><Cell value={l.suppPay || 0} readOnly={ro} onChange={n => rec(d => { d.fb.laborD.suppPay = n; })} /></td></tr>
            <tr><td className="ind1">Employee Benefits (PF/ESI/Gratuity)</td>
              <td><Cell value={l.benefits || 0} readOnly={ro} onChange={n => rec(d => { d.fb.laborD.benefits = n; })} /></td></tr>
            <tr className="total"><td>Total Labor &amp; Related</td><td className="calc">{money(fb.labor, ccy)}</td></tr>

            <tr className="grouphdr"><td colSpan={2}>Other Operating Expenses</td></tr>
            <tr><td className="ind1">Cleaning Supplies</td>
              <td><Cell value={od.cleaning || 0} readOnly={ro} onChange={n => rec(d => { d.fb.otherD.cleaning = n; })} /></td></tr>
            <tr><td className="ind1">Laundry, Linen &amp; Uniforms</td>
              <td><Cell value={od.laundry || 0} readOnly={ro} onChange={n => rec(d => { d.fb.otherD.laundry = n; })} /></td></tr>
            <tr><td className="ind1">Operating Supplies</td>
              <td><Cell value={od.supplies || 0} readOnly={ro} onChange={n => rec(d => { d.fb.otherD.supplies = n; })} /></td></tr>
            <tr><td className="ind1">Miscellaneous</td>
              <td><Cell value={od.misc || 0} readOnly={ro} onChange={n => rec(d => { d.fb.otherD.misc = n; })} /></td></tr>
            <tr className="total"><td>Total Cost of Sales &amp; Other</td><td className="calc">{money(fb.other, ccy)}</td></tr>

            <tr className="grand"><td>Departmental Profit</td>
              <td className={`calc${fb.rev - fb.labor - fb.other < 0 ? ' neg' : ''}`}>{money(fb.rev - fb.labor - fb.other, ccy)}</td></tr>
          </tbody>
        </table>
        <p className="note" style={{ padding: '12px 20px' }}>
          Outlet and cost lines roll up into the three F&amp;B totals that feed the Summary Operating
          Statement. Leave a line at zero if your property doesn&apos;t operate it.
        </p>
      </div>
    </div>
  );
}

export function OtherView({ data, ccy, update, canEdit = true }: { data: PeriodData; ccy: string; update: Updater; canEdit?: boolean }) {
  return (
    <>
      <div className="card">
        <div className="head"><h2>Other Operated Departments — Schedule 3</h2></div>
        <div className="body flush">
          <CondensedTable data={data} dept="ood" ccy={ccy} update={update} canEdit={canEdit}
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
                <td><Cell value={data.misc.rev || 0} readOnly={!canEdit} onChange={n => update(d => { d.misc.rev = n; })} /></td>
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

export function UndistView({ data, ccy, update, canEdit = true }: { data: PeriodData; ccy: string; update: Updater; canEdit?: boolean }) {
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
                <td><Cell value={data[key].exp || 0} readOnly={!canEdit} onChange={n => update(d => { d[key].exp = n; })} /></td>
              </tr>
            ))}
            <tr className="grand"><td>Total Undistributed Expenses</td><td className="calc">{money(tot, ccy)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FixedView({ data, update, canEdit = true }: { data: PeriodData; update: Updater; canEdit?: boolean }) {
  return (
    <div className="card">
      <div className="head"><h2>Management Fees &amp; Non-Operating — Sch 10–11</h2></div>
      <div className="body flush">
        <table>
          <thead><tr><th>Line Item</th><th>Amount</th></tr></thead>
          <tbody>
            <tr className="grouphdr"><td colSpan={2}>Sch 10 · Management Fees</td></tr>
            <tr><td className="ind1">Base Management Fee</td>
              <td><Cell value={data.mgmtFee.base || 0} readOnly={!canEdit} onChange={n => update(d => { d.mgmtFee.base = n; })} /></td></tr>
            <tr><td className="ind1">Incentive Management Fee</td>
              <td><Cell value={data.mgmtFee.incentive || 0} readOnly={!canEdit} onChange={n => update(d => { d.mgmtFee.incentive = n; })} /></td></tr>
            <tr className="grouphdr"><td colSpan={2}>Sch 11 · Non-Operating Income &amp; Expenses</td></tr>
            <tr><td className="ind1">Rent</td>
              <td><Cell value={data.nonop.rent || 0} readOnly={!canEdit} onChange={n => update(d => { d.nonop.rent = n; })} /></td></tr>
            <tr><td className="ind1">Property &amp; Other Taxes</td>
              <td><Cell value={data.nonop.tax || 0} readOnly={!canEdit} onChange={n => update(d => { d.nonop.tax = n; })} /></td></tr>
            <tr><td className="ind1">Insurance</td>
              <td><Cell value={data.nonop.insurance || 0} readOnly={!canEdit} onChange={n => update(d => { d.nonop.insurance = n; })} /></td></tr>
            <tr><td className="ind1">Other</td>
              <td><Cell value={data.nonop.other || 0} readOnly={!canEdit} onChange={n => update(d => { d.nonop.other = n; })} /></td></tr>
            <tr className="grouphdr"><td colSpan={2}>Replacement Reserve</td></tr>
            <tr><td className="ind1">FF&amp;E Reserve</td>
              <td><Cell value={data.reserve || 0} readOnly={!canEdit} onChange={n => update(d => { d.reserve = n; })} /></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}