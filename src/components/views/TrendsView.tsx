'use client';
import { useMemo } from 'react';
import type { Property } from '@/lib/db';
import { PeriodData, Totals, calcAll } from '@/lib/engine';
import { comparePeriods, daysInPeriod, fyLabel, periodLabelShort } from '@/lib/fiscal';
import { compact, money, pct } from '@/lib/format';

function GroupedBars({ months, series, ccy }: {
  months: string[];
  series: { name: string; color: string; values: number[] }[];
  ccy: string;
}) {
  const W = Math.max(700, months.length * 90), H = 280, pad = 40;
  const max = Math.max(1, ...series.flatMap(s => s.values));
  const gw = (W - pad * 2) / months.length;
  const bw = (gw * 0.7) / series.length;
  return (
    <div className="chartwrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: months.length * 70 }}>
        {months.map((m, mi) => (
          <g key={m}>
            {series.map((s, si) => {
              const v = s.values[mi];
              const bh = Math.max(2, (v / max) * (H - 70));
              const x = pad + mi * gw + gw * 0.15 + si * bw;
              return <rect key={s.name} x={x} y={H - 40 - bh} width={bw - 3} height={bh} rx="3" fill={s.color} opacity="0.85" />;
            })}
            <text x={pad + mi * gw + gw / 2} y={H - 20} textAnchor="middle" fontSize="11" fill="#8b98a8">
              {periodLabelShort(m)}
            </text>
          </g>
        ))}
      </svg>
      <div className="legend" style={{ padding: '6px 4px 0' }}>
        {series.map(s => <span key={s.name}><span className="sw" style={{ background: s.color }}></span>{s.name}</span>)}
      </div>
    </div>
  );
}

function OccLine({ months, values }: { months: string[]; values: number[] }) {
  const W = Math.max(700, months.length * 90), H = 200, pad = 40;
  const max = Math.max(0.9, ...values);
  const x = (i: number) => pad + (i + 0.5) * ((W - pad * 2) / months.length);
  const y = (v: number) => H - 40 - (v / max) * (H - 75);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  return (
    <div className="chartwrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: months.length * 70 }}>
        <path d={path} fill="none" stroke="#22d3a6" strokeWidth="2.5" />
        {values.map((v, i) => (
          <g key={months[i]}>
            <circle cx={x(i)} cy={y(v)} r="4" fill="#22d3a6" />
            <text x={x(i)} y={y(v) - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#e6edf3">{pct(v) || '0%'}</text>
            <text x={x(i)} y={H - 20} textAnchor="middle" fontSize="11" fill="#8b98a8">{periodLabelShort(months[i])}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function TrendsView({ periods, prop }: { periods: Record<string, PeriodData>; prop: Property }) {
  const months = useMemo(() => Object.keys(periods).sort(comparePeriods), [periods]);
  const totals: Totals[] = useMemo(
    () => months.map(m => calcAll(periods[m], prop.rooms * daysInPeriod(m))),
    [months, periods, prop.rooms]
  );

  if (months.length < 2) {
    return (
      <div className="banner">
        <span>📈</span>
        <div><b>Trends need at least two months.</b> Use the <b>+ Month</b> button in the top bar to add
        another period, then enter figures — this view compares occupancy, ADR, RevPAR, revenue, GOP and
        EBITDA month over month across the fiscal year (April–March).</div>
      </div>
    );
  }

  const rows: { label: string; fmt: (t: Totals) => string; cls?: (t: Totals) => string }[] = [
    { label: 'Occupancy %', fmt: t => pct(t.occ) || '—' },
    { label: 'ADR', fmt: t => money(t.adr, prop.ccy, 0) },
    { label: 'RevPAR', fmt: t => money(t.revpar, prop.ccy, 0) },
    { label: 'Total RevPAR', fmt: t => money(t.trevpar, prop.ccy, 0) },
    { label: 'Total Operating Revenue', fmt: t => compact(t.totalRev, prop.ccy) },
    { label: 'GOP', fmt: t => compact(t.gop, prop.ccy), cls: t => (t.gop < 0 ? 'neg' : '') },
    { label: 'GOP Margin', fmt: t => (t.totalRev ? pct(t.gop / t.totalRev) : '—') },
    { label: 'GOPPAR', fmt: t => money(t.goppar, prop.ccy, 0) },
    { label: 'EBITDA', fmt: t => compact(t.ebitda, prop.ccy), cls: t => (t.ebitda < 0 ? 'neg' : '') },
    { label: 'EBITDA less Reserve', fmt: t => compact(t.ebitdaLessReserve, prop.ccy), cls: t => (t.ebitdaLessReserve < 0 ? 'neg' : '') },
  ];

  return (
    <>
      <div className="card">
        <div className="head"><h2>Revenue · GOP · EBITDA by month</h2>
          <span className="sub">{fyLabel(months[0])}{fyLabel(months[0]) !== fyLabel(months[months.length - 1]) ? ` → ${fyLabel(months[months.length - 1])}` : ''}</span></div>
        <div className="body">
          <GroupedBars months={months} ccy={prop.ccy} series={[
            { name: 'Revenue', color: '#3b82f6', values: totals.map(t => t.totalRev) },
            { name: 'GOP', color: '#8b5cf6', values: totals.map(t => t.gop) },
            { name: 'EBITDA', color: '#ec4899', values: totals.map(t => t.ebitda) },
          ]} />
        </div>
      </div>
      <div className="card">
        <div className="head"><h2>Occupancy trend</h2></div>
        <div className="body"><OccLine months={months} values={totals.map(t => t.occ)} /></div>
      </div>
      <div className="card">
        <div className="head"><h2>KPI table</h2><span className="sub">All saved months</span></div>
        <div className="body flush" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                {months.map(m => <th key={m}>{periodLabelShort(m)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.label}>
                  <td className="section">{r.label}</td>
                  {totals.map((t, i) => (
                    <td key={months[i]} className={`calc ${r.cls ? r.cls(t) : ''}`}>{r.fmt(t)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
