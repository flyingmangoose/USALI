'use client';
import { Fragment, useState } from 'react';
import type { Property } from '@/lib/db';
import { PeriodData, emptyPeriodData, recomputeFBAggregates } from '@/lib/engine';
import { periodLabel, addMonths } from '@/lib/fiscal';
import Cell from '../Cell';

type Line = [string, (d: PeriodData) => number, (d: PeriodData, n: number) => void];

const LINES: { section: string; rows: Line[] }[] = [
  {
    section: 'Operating Statistics',
    rows: [
      ['Rooms sold', d => d.stats.sold, (d, n) => { d.stats.sold = n; }],
    ],
  },
  {
    section: 'Revenue',
    rows: [
      ['Rooms revenue', d => d.rooms.retail, (d, n) => { d.rooms.retail = n; }],
      ['F&B revenue', d => d.fb.rev, (d, n) => { d.fb.rev = n; }],
      ['Other operated revenue', d => d.ood.rev, (d, n) => { d.ood.rev = n; }],
      ['Miscellaneous income', d => d.misc.rev, (d, n) => { d.misc.rev = n; }],
    ],
  },
  {
    section: 'Departmental Expenses',
    rows: [
      ['Rooms labor', d => d.rooms.salMgmt, (d, n) => { d.rooms.salMgmt = n; }],
      ['Rooms other expenses', d => d.rooms.miscRooms, (d, n) => { d.rooms.miscRooms = n; }],
      ['F&B labor', d => d.fb.labor, (d, n) => { d.fb.labor = n; }],
      ['F&B cost of sales & other', d => d.fb.other, (d, n) => { d.fb.other = n; }],
      ['Other operated labor', d => d.ood.labor, (d, n) => { d.ood.labor = n; }],
      ['Other operated expenses', d => d.ood.other, (d, n) => { d.ood.other = n; }],
    ],
  },
  {
    section: 'Undistributed Expenses',
    rows: [
      ['Administrative & General', d => d.ag.exp, (d, n) => { d.ag.exp = n; }],
      ['Information & Telecom', d => d.it.exp, (d, n) => { d.it.exp = n; }],
      ['Sales & Marketing', d => d.sm.exp, (d, n) => { d.sm.exp = n; }],
      ['Property Operation & Maintenance', d => d.pom.exp, (d, n) => { d.pom.exp = n; }],
      ['Utilities', d => d.util.exp, (d, n) => { d.util.exp = n; }],
    ],
  },
  {
    section: 'Fees, Fixed & Reserve',
    rows: [
      ['Base management fee', d => d.mgmtFee.base, (d, n) => { d.mgmtFee.base = n; }],
      ['Incentive fee', d => d.mgmtFee.incentive, (d, n) => { d.mgmtFee.incentive = n; }],
      ['Rent / lease', d => d.nonop.rent, (d, n) => { d.nonop.rent = n; }],
      ['Property & other taxes', d => d.nonop.tax, (d, n) => { d.nonop.tax = n; }],
      ['Insurance', d => d.nonop.insurance, (d, n) => { d.nonop.insurance = n; }],
      ['Non-operating other', d => d.nonop.other, (d, n) => { d.nonop.other = n; }],
      ['FF&E replacement reserve', d => d.reserve, (d, n) => { d.reserve = n; }],
    ],
  },
];

export default function BudgetView({ prop, period, budget, onSaved }: {
  prop: Property; period: string; budget: PeriodData | null; onSaved: (b: PeriodData) => void;
}) {
  const [draft, setDraft] = useState<PeriodData>(() => structuredClone(budget ?? emptyPeriodData()));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const edit = (fn: (d: PeriodData) => void) => setDraft(d => { const nd = structuredClone(d); fn(nd); return nd; });

  async function seed(source: 'actuals' | 'prior') {
    setBusy(true); setMsg('');
    let seedData: PeriodData | null = null;
    if (source === 'actuals') {
      const r = await fetch(`/api/properties/${prop.id}/periods/${period}`);
      if (r.ok) { const j = await r.json(); seedData = j.data; }
    } else {
      const py = addMonths(period, -12);
      const r = await fetch(`/api/properties/${prop.id}/periods/${py}`);
      if (r.ok) { const j = await r.json(); seedData = j.data; }
    }
    if (seedData) {
      const copy = structuredClone(seedData);
      recomputeFBAggregates(copy.fb);
      setDraft(copy);
      setMsg(source === 'actuals' ? 'Seeded from actuals — review and adjust.' : 'Seeded from prior year — review and adjust.');
    } else {
      setMsg(source === 'prior' ? 'No prior-year period found to copy.' : 'Could not load actuals.');
    }
    setBusy(false);
  }

  async function save() {
    setBusy(true); setMsg('');
    const res = await fetch(`/api/properties/${prop.id}/budgets/${period}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    setBusy(false);
    if (res.ok) { setMsg('Budget saved.'); onSaved(structuredClone(draft)); }
    else setMsg('Save failed.');
  }

  async function clearBudget() {
    setBusy(true);
    await fetch(`/api/properties/${prop.id}/budgets/${period}`, { method: 'DELETE' }).catch(() => {});
    const e = emptyPeriodData();
    setDraft(e); onSaved(e); setMsg('Budget cleared.'); setBusy(false);
  }

  return (
    <div className="card">
      <div className="head">
        <h2>Budget — {periodLabel(period)}</h2>
        <span className="sub">Feeds the Budget & variance columns on the Summary Operating Statement</span>
      </div>
      <div className="body">
        <p className="note" style={{ marginTop: 0 }}>
          Set a monthly budget to track plan-vs-actual. Seed it from this period&apos;s actuals or the
          same month last year, then adjust the lines below. Rooms revenue is budgeted as a single
          line (segmentation isn&apos;t required for variance). Once saved, the Summary Statement shows
          Budget / Var columns.
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <button className="btn ghost" disabled={busy} onClick={() => seed('actuals')}>Seed from actuals</button>
          <button className="btn ghost" disabled={busy} onClick={() => seed('prior')}>Seed from prior year</button>
          <button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save budget'}</button>
          <button className="btn danger" disabled={busy} onClick={clearBudget}>Clear budget</button>
          <span className="note">{msg}</span>
        </div>
        <table style={{ maxWidth: 560 }}>
          <thead><tr><th>Line Item</th><th>Budget</th></tr></thead>
          <tbody>
            {LINES.map(s => (
              <Fragment key={s.section}>
                <tr className="grouphdr"><td colSpan={2}>{s.section}</td></tr>
                {s.rows.map(([label, get, set]) => (
                  <tr key={label}>
                    <td className="ind1">{label}</td>
                    <td><Cell value={get(draft)} onChange={n => edit(d => set(d, n))} /></td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}