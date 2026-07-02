'use client';
import { PeriodData, Totals } from '@/lib/engine';
import { money, pct } from '@/lib/format';

export default function SummaryView({ totals: a, data, ccy }: { totals: Totals; data: PeriodData; ccy: string }) {
  const tr = a.totalRev || 0;
  const P = (v: number) => (tr ? pct(v / tr) : '');
  const Row = ({ label, v, cls = '', ind = false, dec = 0, plain = false }: {
    label: string; v: number; cls?: string; ind?: boolean; dec?: number; plain?: boolean;
  }) => (
    <tr className={cls}>
      <td className={ind ? 'ind1' : ''}>{label}</td>
      <td className={`calc${v < 0 ? ' neg' : ''}`}>{money(v, ccy, dec)}</td>
      <td className="pct">{plain ? '' : P(v)}</td>
    </tr>
  );
  const Hdr = ({ t }: { t: string }) => <tr className="grouphdr"><td colSpan={3}>{t}</td></tr>;

  return (
    <div className="card">
      <div className="head">
        <h2>Summary Operating Statement</h2><span className="tag">For Operators</span>
        <span className="sub">Bottom line: EBITDA less Replacement Reserve</span>
      </div>
      <div className="body flush">
        <table>
          <thead><tr><th>Line Item</th><th>Actual</th><th className="pct">% Rev</th></tr></thead>
          <tbody>
            <Hdr t="Operating Statistics" />
            <tr><td>Rooms Available</td><td className="calc">{a.avail ? a.avail.toLocaleString('en-IN') : '—'}</td><td></td></tr>
            <tr><td>Rooms Sold</td><td className="calc">{a.sold ? a.sold.toLocaleString('en-IN') : '—'}</td><td></td></tr>
            <tr><td>Occupancy %</td><td className="calc">{pct(a.occ) || '—'}</td><td></td></tr>
            <Row label="ADR" v={a.adr} dec={2} plain />
            <Row label="RevPAR" v={a.revpar} dec={2} plain />
            <Row label="Total RevPAR" v={a.trevpar} dec={2} plain />
            <Hdr t="Operating Revenue" />
            <Row label="Rooms" v={a.R.totalRev} ind />
            <Row label="Food & Beverage" v={a.fb.rev} ind />
            <Row label="Other Operated Departments" v={a.ood.rev} ind />
            <Row label="Miscellaneous Income" v={a.miscRev} ind />
            <Row label="Total Operating Revenue" v={a.totalRev} cls="total" />
            <Hdr t="Departmental Expenses" />
            <Row label="Rooms" v={a.R.totalExp} ind />
            <Row label="Food & Beverage" v={a.fb.exp} ind />
            <Row label="Other Operated Departments" v={a.ood.exp} ind />
            <Row label="Total Departmental Expenses" v={a.deptExp} cls="total" />
            <Row label="Total Departmental Profit" v={a.deptProfit} cls="grand" />
            <Hdr t="Undistributed Operating Expenses" />
            <Row label="Administrative & General" v={data.ag.exp || 0} ind />
            <Row label="Information & Telecom" v={data.it.exp || 0} ind />
            <Row label="Sales & Marketing" v={data.sm.exp || 0} ind />
            <Row label="Property Operation & Maintenance" v={data.pom.exp || 0} ind />
            <Row label="Utilities" v={data.util.exp || 0} ind />
            <Row label="Total Undistributed Expenses" v={a.undist} cls="total" />
            <Row label="GROSS OPERATING PROFIT (GOP)" v={a.gop} cls="grand" />
            <Row label="Management Fees" v={a.mgmt} />
            <Row label="Non-Operating Income & Expenses" v={a.nonop} />
            <Row label="EBITDA" v={a.ebitda} cls="grand" />
            <Row label="Less: Replacement Reserve" v={data.reserve || 0} />
            <Row label="EBITDA LESS REPLACEMENT RESERVE" v={a.ebitdaLessReserve} cls="grand" />
          </tbody>
        </table>
      </div>
    </div>
  );
}
