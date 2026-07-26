'use client';
import { Totals } from '@/lib/engine';
import { compact, money, pct } from '@/lib/format';
import { periodLabel } from '@/lib/fiscal';

function BarChart({ items, ccy }: { items: [string, number, string][]; ccy: string }) {
  const W = 700, H = 260, pad = 40;
  const scale = Math.max(1, ...items.map(d => Math.abs(d[1])));
  const baseline = H - 45;
  const bw = (W - pad * 2) / items.length;
  return (
    <div className="chartwrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <line x1={pad} y1={baseline} x2={W - pad} y2={baseline} stroke="#2a3340" strokeWidth="1" />
        {items.map(([label, v, color], i) => {
          const bh = (Math.abs(v) / scale) * (H - 80);
          const x = pad + i * bw + bw * 0.2, w = bw * 0.6;
          const y = v >= 0 ? baseline - bh : baseline;
          return (
            <g key={label}>
              <rect x={x} y={y} width={w} height={Math.max(2, bh)} rx="5" fill={color} opacity={v < 0 ? 0.55 : 0.85} />
              <text x={x + w / 2} y={H - 24} textAnchor="middle" fontSize="11" fill="#8b98a8">{label}</text>
              <text x={x + w / 2} y={(v >= 0 ? y : y + bh + 14) - 8} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#e6edf3">
                {compact(v, ccy)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function DashboardView({ totals: a, ccy, period, bench }: {
  totals: Totals; ccy: string; period: string;
  bench?: { medianRevpar: number | null; medianGoppar: number | null; medianOcc: number | null } | null;
}) {
  const dp: [string, number][] = [
    ['Rooms', a.R.profit], ['Food & Beverage', a.fb.profit],
    ['Other Operated', a.ood.profit], ['Misc Income', a.miscRev],
  ];
  const maxd = Math.max(1, ...dp.map(d => Math.abs(d[1])));
  const steps: [string, number][] = [
    ['Total Revenue', a.totalRev], ['– Dept Expenses', -a.deptExp], ['– Undistributed', -a.undist],
    ['= GOP', a.gop], ['– Mgmt Fees', -a.mgmt], ['– Non-Operating', -a.nonop], ['= EBITDA', a.ebitda],
  ];
  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="l">Occupancy</div><div className="v">{pct(a.occ) || '—'}</div>
          <div className="d">{a.avail ? `${a.sold.toLocaleString('en-IN')} of ${a.avail.toLocaleString('en-IN')} room-nights` : 'rooms sold ÷ available'}</div></div>
        <div className="kpi g"><div className="l">ADR</div><div className="v">{money(a.adr, ccy, 0)}</div><div className="d">average daily rate</div></div>
        <div className="kpi g"><div className="l">RevPAR</div><div className="v">{money(a.revpar, ccy, 0)}</div><div className="d">rooms rev ÷ available</div></div>
        <div className="kpi w"><div className="l">Total RevPAR</div><div className="v">{money(a.trevpar, ccy, 0)}</div><div className="d">total rev ÷ available</div></div>
      </div>
      <div className="kpis">
        <div className="kpi"><div className="l">Total Operating Revenue</div><div className="v">{compact(a.totalRev, ccy)}</div>
          <div className="d">{periodLabel(period)}</div></div>
        <div className="kpi g"><div className="l">Gross Operating Profit</div><div className="v">{compact(a.gop, ccy)}</div>
          <div className="d">{a.totalRev ? `${pct(a.gop / a.totalRev)} GOP margin` : 'GOP margin'}</div></div>
        <div className="kpi w"><div className="l">GOPPAR</div><div className="v">{money(a.goppar, ccy, 0)}</div><div className="d">GOP per available room</div></div>
        <div className="kpi g"><div className="l">EBITDA</div><div className="v">{compact(a.ebitda, ccy)}</div>
          <div className="d">{a.totalRev ? `${pct(a.ebitda / a.totalRev)} EBITDA margin` : 'EBITDA margin'}</div></div>
      </div>
      <div className="card">
        <div className="head"><h2>Revenue &amp; Profit Flow</h2><span className="sub">Where the money goes — {periodLabel(period)}</span></div>
        <div className="body">
          <BarChart ccy={ccy} items={[
            ['Rooms Rev', a.R.totalRev, '#3b82f6'], ['F&B Rev', a.fb.rev, '#22d3a6'],
            ['Other', a.ood.rev + a.miscRev, '#f4b740'], ['GOP', a.gop, '#8b5cf6'], ['EBITDA', a.ebitda, '#ec4899'],
          ]} />
        </div>
      </div>
      <div className="flexcards">
        <div className="card" style={{ margin: 0 }}>
          <div className="head"><h2>Departmental Profit</h2></div>
          <div className="body">
            {a.totalRev === 0 ? <p className="note">No data yet — enter figures in the schedules.</p> : dp.map(([label, v]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <b style={{ fontVariantNumeric: 'tabular-nums' }}>{money(v, ccy)}</b>
                </div>
                <div className="bar"><i style={{
                  width: `${Math.max(2, Math.abs(v) / maxd * 100)}%`,
                  ...(v < 0 ? { background: 'linear-gradient(90deg,#f47174,#f4b740)' } : {}),
                }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <div className="head"><h2>Path to EBITDA</h2></div>
          <div className="body">
            <table style={{ fontSize: 12.5 }}>
              <tbody>
                {steps.map(([label, v]) => (
                  <tr key={label} className={label.startsWith('=') ? 'total' : ''}>
                    <td>{label}</td>
                    <td className={`calc${v < 0 ? ' neg' : ''}`}>{money(v, ccy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {bench && bench.medianRevpar != null && (bench.medianRevpar > 0 || bench.medianOcc != null) && (() => {
        const cmp = (cur: number, med: number | null, fmt: (n: number) => string) => {
          if (med == null || !med) return <span className="note">—</span>;
          const d = cur - med;
          const good = d >= 0;
          return <b style={{ color: good ? 'var(--accent2)' : 'var(--neg)' }}>{fmt(cur)} {good ? '▲' : '▼'} {fmt(med)}</b>;
        };
        return (
          <div className="card">
            <div className="head"><h2>vs. your portfolio median</h2>
              <span className="sub">Across this property&apos;s saved months</span></div>
            <div className="body flush">
              <table>
                <thead><tr><th>Metric</th><th>This period</th><th>Portfolio median</th></tr></thead>
                <tbody>
                  <tr><td className="section">RevPAR</td><td className="calc">{money(a.revpar, ccy, 0)}</td><td>{cmp(a.revpar, bench.medianRevpar, n => money(n, ccy, 0))}</td></tr>
                  <tr><td className="section">GOPPAR</td><td className="calc">{money(a.goppar, ccy, 0)}</td><td>{cmp(a.goppar, bench.medianGoppar, n => money(n, ccy, 0))}</td></tr>
                  <tr><td className="section">Occupancy</td><td className="calc">{pct(a.occ) || '—'}</td><td>{cmp(a.occ, bench.medianOcc, n => pct(n) || '—')}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </>
  );
}
