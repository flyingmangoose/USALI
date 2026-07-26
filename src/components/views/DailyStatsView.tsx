'use client';
import { useEffect, useState } from 'react';
import type { Property } from '@/lib/db';
import { PeriodData } from '@/lib/engine';
import { daysInPeriod, periodLabel } from '@/lib/fiscal';
import { num } from '@/lib/format';

interface DStat { date: string; sold: number; comps: number; houseUse: number; noShow: number }

export default function DailyStatsView({ prop, period, onSumChanged }: {
  prop: Property; period: string; onSumChanged?: (sum: number) => void;
}) {
  const days = daysInPeriod(period);
  const dayList = Array.from({ length: days }, (_, i) => {
    const dd = String(i + 1).padStart(2, '0');
    return `${period}-${dd}`;
  });
  const [stats, setStats] = useState<Record<string, DStat>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/properties/${prop.id}/daily-stats`).then(r => r.json()).then(rows => {
      if (!alive || !Array.isArray(rows)) return;
      const map: Record<string, DStat> = {};
      for (const r of rows) map[r.date] = r;
      setStats(map);
    }).catch(() => {});
    return () => { alive = false; };
  }, [prop.id]);

  function val(date: string, k: 'sold' | 'comps' | 'houseUse' | 'noShow'): number {
    return stats[date]?.[k] ?? 0;
  }

  async function update(date: string, k: keyof DStat, v: number) {
    const cur: DStat = stats[date] ?? { date, sold: 0, comps: 0, houseUse: 0, noShow: 0 };
    const next = { ...cur, [k]: v } as DStat;
    setStats(s => ({ ...s, [date]: next }));
    await fetch(`/api/properties/${prop.id}/daily-stats`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  const sumSold = dayList.reduce((s, d) => s + val(d, 'sold'), 0);
  const sumComps = dayList.reduce((s, d) => s + val(d, 'comps'), 0);

  async function applySumToPeriod() {
    setBusy(true); setMsg('');
    const r = await fetch(`/api/properties/${prop.id}/periods/${period}`);
    if (!r.ok) { setMsg('No data for this period yet — add the month first.'); setBusy(false); return; }
    const j = await r.json();
    const data: PeriodData = j.data;
    data.stats.sold = sumSold;
    const res = await fetch(`/api/properties/${prop.id}/periods/${period}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setBusy(false);
    setMsg(res.ok ? `Applied ${sumSold} room-nights to ${periodLabel(period)}.` : 'Save failed.');
    onSumChanged?.(sumSold);
  }

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="card">
      <div className="head">
        <h2>Daily Operating Statistics — {periodLabel(period)}</h2>
        <span className="sub">Per-day room counts; sum feeds Occupancy &amp; ADR</span>
      </div>
      <div className="body">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <span className="note">Total sold: <b>{sumSold.toLocaleString('en-IN')}</b> · comps: <b>{sumComps.toLocaleString('en-IN')}</b> · {days} days</span>
          <button className="btn" disabled={busy} onClick={applySumToPeriod}>
            {busy ? 'Applying…' : `Apply ${sumSold} sold to period`}
          </button>
          <span className="note">{msg}</span>
        </div>
        <div className="body flush" style={{ maxHeight: 460, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
          <table>
            <thead><tr><th>Date</th><th>Day</th><th>Sold</th><th>Comp</th><th>House use</th><th>No-show</th></tr></thead>
            <tbody>
              {dayList.map(d => {
                const dt = new Date(d + 'T00:00:00');
                return (
                  <tr key={d}>
                    <td>{d.slice(8)}</td>
                    <td className="pct" style={{ textAlign: 'left' }}>{DOW[dt.getDay()]}</td>
                    <td><input className="cell" inputMode="decimal" value={val(d, 'sold') || ''} onChange={e => update(d, 'sold', num(e.target.value))} /></td>
                    <td><input className="cell" inputMode="decimal" value={val(d, 'comps') || ''} onChange={e => update(d, 'comps', num(e.target.value))} /></td>
                    <td><input className="cell" inputMode="decimal" value={val(d, 'houseUse') || ''} onChange={e => update(d, 'houseUse', num(e.target.value))} /></td>
                    <td><input className="cell" inputMode="decimal" value={val(d, 'noShow') || ''} onChange={e => update(d, 'noShow', num(e.target.value))} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}