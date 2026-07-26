'use client';
import { PeriodData, Totals, calcAll } from '@/lib/engine';
import { money, pct } from '@/lib/format';

/** Variance coloring: revenue & profit are good when up; expenses are good when down. */
function varClass(actual: number, baseline: number | undefined | null, goodWhenUp: boolean): string {
  if (baseline === undefined || baseline === null) return 'pct';
  const v = actual - baseline;
  if (v === 0) return 'pct';
  const good = goodWhenUp ? v > 0 : v < 0;
  return `pct ${good ? 'pos' : 'neg'}`;
}

export default function SummaryView({ totals: a, data, ccy, budget: bData, prior: pyData }: {
  totals: Totals; data: PeriodData; ccy: string; budget: PeriodData | null; prior: PeriodData | null;
}) {
  const b = bData ? calcAll(bData, a.avail) : null;
  const py = pyData ? calcAll(pyData, a.avail) : null;
  const tr = a.totalRev || 0;
  const P = (v: number) => (tr ? pct(v / tr) : '');
  const haveB = !!b, havePY = !!py;

  const Row = ({ label, v, bv, pyv, good = true, cls = '', ind = false, dec = 0, plain = false }: {
    label: string; v: number; bv?: number; pyv?: number; good?: boolean; cls?: string; ind?: boolean; dec?: number; plain?: boolean;
  }) => (
    <tr className={cls}>
      <td className={ind ? 'ind1' : ''}>{label}</td>
      <td className={`calc${v < 0 ? ' neg' : ''}`}>{money(v, ccy, dec)}</td>
      <td className="calc">{haveB && bv !== undefined ? money(bv, ccy, dec) : '—'}</td>
      <td className={haveB && bv !== undefined ? varClass(v, bv, good) : 'pct'}>
        {haveB && bv !== undefined ? money(v - bv, ccy, dec) : ''}
      </td>
      <td className="calc">{havePY && pyv !== undefined ? money(pyv, ccy, dec) : '—'}</td>
      <td className={havePY && pyv ? varClass(v, pyv, good) : 'pct'}>
        {havePY && pyv ? pct((v - pyv) / pyv) : ''}
      </td>
      <td className="pct">{plain ? '' : P(v)}</td>
    </tr>
  );
  const Hdr = ({ t }: { t: string }) => <tr className="grouphdr"><td colSpan={7}>{t}</td></tr>;

  return (
    <div className="card">
      <div className="head">
        <h2>Summary Operating Statement</h2><span className="tag">For Operators</span>
        <span className="sub">Bottom line: EBITDA less Replacement Reserve
          {haveB ? ' · Budget variance shown' : ''}{havePY ? ' · Prior year compared' : ''}</span>
      </div>
      <div className="body flush">
        <table>
          <thead><tr>
            <th>Line Item</th><th>Actual</th>
            {haveB ? <th>Budget</th> : <th></th>}
            {haveB ? <th>Var</th> : <th></th>}
            <th>PY Actual</th><th>PY Var</th>
            <th className="pct">% Rev</th>
          </tr></thead>
          <tbody>
            <Hdr t="Operating Statistics" />
            <Row label="Rooms Available" v={a.avail} bv={b?.avail} pyv={py?.avail} plain />
            <Row label="Rooms Sold" v={a.sold} bv={b?.sold} pyv={py?.sold} plain />
            <Row label="Occupancy %" v={a.occ} bv={b?.occ} pyv={py?.occ} plain />
            <Row label="ADR" v={a.adr} bv={b?.adr} pyv={py?.adr} dec={2} plain />
            <Row label="RevPAR" v={a.revpar} bv={b?.revpar} pyv={py?.revpar} dec={2} plain />
            <Row label="Total RevPAR" v={a.trevpar} bv={b?.trevpar} pyv={py?.trevpar} dec={2} plain />
            <Hdr t="Operating Revenue" />
            <Row label="Rooms" v={a.R.totalRev} bv={b?.R.totalRev} pyv={py?.R.totalRev} ind />
            <Row label="Food & Beverage" v={a.fb.rev} bv={b?.fb.rev} pyv={py?.fb.rev} ind />
            <Row label="Other Operated Departments" v={a.ood.rev} bv={b?.ood.rev} pyv={py?.ood.rev} ind />
            <Row label="Miscellaneous Income" v={a.miscRev} bv={b?.miscRev} pyv={py?.miscRev} ind />
            <Row label="Total Operating Revenue" v={a.totalRev} bv={b?.totalRev} pyv={py?.totalRev} cls="total" />
            <Hdr t="Departmental Expenses" />
            <Row label="Rooms" v={a.R.totalExp} bv={b?.R.totalExp} pyv={py?.R.totalExp} good={false} ind />
            <Row label="Food & Beverage" v={a.fb.exp} bv={b?.fb.exp} pyv={py?.fb.exp} good={false} ind />
            <Row label="Other Operated Departments" v={a.ood.exp} bv={b?.ood.exp} pyv={py?.ood.exp} good={false} ind />
            <Row label="Total Departmental Expenses" v={a.deptExp} bv={b?.deptExp} pyv={py?.deptExp} good={false} cls="total" />
            <Row label="Total Departmental Profit" v={a.deptProfit} bv={b?.deptProfit} pyv={py?.deptProfit} cls="grand" />
            <Hdr t="Undistributed Operating Expenses" />
            <Row label="Administrative & General" v={data.ag.exp || 0} bv={bData?.ag.exp} pyv={pyData?.ag.exp} good={false} ind />
            <Row label="Information & Telecom" v={data.it.exp || 0} bv={bData?.it.exp} pyv={pyData?.it.exp} good={false} ind />
            <Row label="Sales & Marketing" v={data.sm.exp || 0} bv={bData?.sm.exp} pyv={pyData?.sm.exp} good={false} ind />
            <Row label="Property Operation & Maintenance" v={data.pom.exp || 0} bv={bData?.pom.exp} pyv={pyData?.pom.exp} good={false} ind />
            <Row label="Utilities" v={data.util.exp || 0} bv={bData?.util.exp} pyv={pyData?.util.exp} good={false} ind />
            <Row label="Total Undistributed Expenses" v={a.undist} bv={b?.undist} pyv={py?.undist} good={false} cls="total" />
            <Row label="GROSS OPERATING PROFIT (GOP)" v={a.gop} bv={b?.gop} pyv={py?.gop} cls="grand" />
            <Row label="Management Fees" v={a.mgmt} bv={b?.mgmt} pyv={py?.mgmt} good={false} />
            <Row label="Non-Operating Income & Expenses" v={a.nonop} bv={b?.nonop} pyv={py?.nonop} good={false} />
            <Row label="EBITDA" v={a.ebitda} bv={b?.ebitda} pyv={py?.ebitda} cls="grand" />
            <Row label="Less: Replacement Reserve" v={data.reserve || 0} bv={bData?.reserve} pyv={pyData?.reserve} good={false} />
            <Row label="EBITDA LESS REPLACEMENT RESERVE" v={a.ebitdaLessReserve} bv={b?.ebitdaLessReserve} pyv={py?.ebitdaLessReserve} cls="grand" />
          </tbody>
        </table>
      </div>
    </div>
  );
}