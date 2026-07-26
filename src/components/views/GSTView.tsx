'use client';
import { Totals, gstCalc } from '@/lib/engine';
import { money, pct } from '@/lib/format';
import { periodLabel } from '@/lib/fiscal';

export default function GSTView({ totals: a, ccy, period }: {
  totals: Totals; data: import('@/lib/engine').PeriodData; ccy: string; period: string;
}) {
  if (ccy !== 'INR') {
    return (
      <div className="card">
        <div className="head"><h2>GST Liability</h2></div>
        <div className="body">
          <p className="note">GST liability is only modelled for INR properties. This property uses {ccy}.</p>
        </div>
      </div>
    );
  }
  const g = gstCalc(a.R.totalRev, a.fb.rev, a.adr);
  const taxableRev = a.R.totalRev + a.fb.rev;

  const Row = ({ label, v, sub }: { label: string; v: number; sub?: string }) => (
    <tr><td className="ind1">{label}</td><td className="calc">{money(v, ccy)}</td><td className="pct">{sub ?? ''}</td></tr>
  );

  return (
    <div className="card">
      <div className="head">
        <h2>GST Liability — {periodLabel(period)}</h2>
        <span className="tag">India · estimated</span>
        <span className="sub">Output GST on rooms + F&amp;B revenue</span>
      </div>
      <div className="body flush">
        <table>
          <thead><tr><th>Line</th><th>Amount</th><th className="pct">Rate</th></tr></thead>
          <tbody>
            <tr className="grouphdr"><td colSpan={3}>Accommodation (rooms)</td></tr>
            <Row label="Rooms revenue (taxable)" v={a.R.totalRev} sub={g.roomsSlab} />
            <tr><td className="ind1">Output GST on rooms</td>
              <td className={`calc${g.roomsGST < 0 ? ' neg' : ''}`}>{money(g.roomsGST, ccy)}</td>
              <td className="pct">{pct(g.roomsRate) || '0%'}</td></tr>
            <tr className="grouphdr"><td colSpan={3}>Food &amp; Beverage</td></tr>
            <Row label="F&B revenue (taxable)" v={a.fb.rev} sub="5% composition" />
            <tr><td className="ind1">Output GST on F&amp;B</td>
              <td className={`calc${g.fbGST < 0 ? ' neg' : ''}`}>{money(g.fbGST, ccy)}</td>
              <td className="pct">{pct(g.fbRate)}</td></tr>
            <tr className="grouphdr"><td colSpan={3}>Summary</td></tr>
            <tr><td>Taxable revenue (rooms + F&amp;B)</td><td className="calc">{money(taxableRev, ccy)}</td><td className="pct"></td></tr>
            <tr className="grand"><td>Total output GST payable (estimate)</td>
              <td className={`calc${g.totalGST < 0 ? ' neg' : ''}`}>{money(g.totalGST, ccy)}</td><td className="pct"></td></tr>
          </tbody>
        </table>
        <p className="note" style={{ padding: '14px 20px' }}>
          Rooms GST uses the ADR-based accommodation slab ({g.roomsSlab}); F&amp;B uses the 5% composition rate
          common for independent hotels. This is an estimate for cash-flow planning, not a tax filing —
          confirm input-credit netting and slab edge cases with your accountant.
        </p>
      </div>
    </div>
  );
}