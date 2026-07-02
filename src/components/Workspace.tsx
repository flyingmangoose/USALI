'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Property, PeriodRow } from '@/lib/db';
import { PeriodData, Totals, calcAll, emptyPeriodData } from '@/lib/engine';
import { addMonths, comparePeriods, daysInPeriod, fyLabel, periodLabel } from '@/lib/fiscal';
import DashboardView from './views/DashboardView';
import RoomsView from './views/RoomsView';
import { FBView, OtherView, UndistView, FixedView } from './views/CondensedViews';
import SummaryView from './views/SummaryView';
import ImportView from './views/ImportView';
import TrendsView from './views/TrendsView';
import SettingsView from './views/SettingsView';

export type Updater = (fn: (d: PeriodData) => void) => void;

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

const VIEWS = [
  { key: 'dashboard', title: 'Dashboard', group: 'Property' },
  { key: 'trends', title: 'Trends', group: 'Property' },
  { key: 'rooms', title: 'Sch 1 · Rooms', group: 'Operating Departments' },
  { key: 'fb', title: 'Sch 2 · Food & Beverage', group: 'Operating Departments' },
  { key: 'other', title: 'Sch 3–4 · Other & Misc', group: 'Operating Departments' },
  { key: 'undist', title: 'Sch 5–9 · Overheads', group: 'Undistributed' },
  { key: 'fixed', title: 'Sch 10–11 · Fees & Fixed', group: 'Undistributed' },
  { key: 'import', title: 'Import Trial Balance', group: 'Data' },
  { key: 'summary', title: 'Summary Op Statement', group: 'Reports' },
  { key: 'settings', title: 'Property Settings', group: 'Property' },
] as const;

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard', trends: 'Trends',
  rooms: 'Rooms — Schedule 1', fb: 'Food & Beverage — Schedule 2',
  other: 'Other Operated & Misc Income', undist: 'Undistributed Operating Expenses',
  fixed: 'Fees & Fixed Charges', summary: 'Summary Operating Statement',
  import: 'Import Trial Balance', settings: 'Property Settings',
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Workspace({ property, initialPeriods }: { property: Property; initialPeriods: PeriodRow[] }) {
  const [prop, setProp] = useState(property);
  const [periods, setPeriods] = useState<Record<string, PeriodData>>(
    () => Object.fromEntries(initialPeriods.map(r => [r.period, r.data]))
  );
  const periodKeys = useMemo(() => Object.keys(periods).sort(comparePeriods), [periods]);
  const [sel, setSel] = useState<string>(periodKeys[periodKeys.length - 1] ?? currentMonth());
  const [view, setView] = useState<string>('dashboard');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const data = periods[sel] ?? emptyPeriodData();
  const totals: Totals = useMemo(
    () => calcAll(data, prop.rooms * daysInPeriod(sel)),
    [data, prop.rooms, sel]
  );

  const persist = useCallback(async (period: string, d: PeriodData) => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/properties/${prop.id}/periods/${period}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
      });
      setSaveState(res.ok ? 'saved' : 'error');
    } catch {
      setSaveState('error');
    }
  }, [prop.id]);

  const update: Updater = useCallback(fn => {
    setPeriods(prev => {
      const next = structuredClone(prev[sel] ?? emptyPeriodData());
      fn(next);
      const out = { ...prev, [sel]: next };
      setSaveState('unsaved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(sel, next), 700);
      return out;
    });
  }, [sel, persist]);

  // flush pending save on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  async function addPeriod() {
    const next = periodKeys.length ? addMonths(periodKeys[periodKeys.length - 1], 1) : currentMonth();
    const d = emptyPeriodData();
    setPeriods(prev => ({ ...prev, [next]: d }));
    setSel(next);
    await persist(next, d);
  }

  function copyFromPrevious() {
    const idx = periodKeys.indexOf(sel);
    if (idx <= 0) return;
    const prevData = periods[periodKeys[idx - 1]];
    update(d => Object.assign(d, structuredClone(prevData)));
  }

  const isEmpty = totals.totalRev === 0 && totals.deptExp === 0 && totals.sold === 0;
  const hasPrev = periodKeys.indexOf(sel) > 0;

  const saveLabel = { saved: 'Saved', saving: 'Saving…', unsaved: 'Editing…', error: 'Save failed — retrying on next edit' }[saveState];

  let groups: string[] = [];
  for (const v of VIEWS) if (!groups.includes(v.group)) groups.push(v.group);

  return (
    <div className="app">
      <aside className="side">
        <Link className="brand" href="/">
          <div className="logo">L</div>
          <div><b>LedgerLeaf</b><small>USALI Financials</small></div>
        </Link>
        <div className="navgroup">Portfolio</div>
        <nav className="nav"><Link href="/"><span className="dot"></span>← All properties</Link></nav>
        {groups.map(g => (
          <div key={g}>
            <div className="navgroup">{g}</div>
            <nav className="nav">
              {VIEWS.filter(v => v.group === g).map(v => (
                <button key={v.key} className={view === v.key ? 'active' : ''} onClick={() => setView(v.key)}>
                  <span className="dot"></span>{v.title}
                </button>
              ))}
            </nav>
          </div>
        ))}
      </aside>
      <main className="main">
        <div className="topbar">
          <h1>{TITLES[view]}</h1>
          <span className="crumb">{prop.name}{prop.city ? ` · ${prop.city}` : ''} · {fyLabel(sel)}</span>
          <div className="spacer"></div>
          <span className={`pill${saveState === 'saved' ? ' ok' : ''}`}>{saveLabel}</span>
          <select className="periodsel" value={sel} onChange={e => setSel(e.target.value)}>
            {periodKeys.map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
            {!periodKeys.includes(sel) && <option value={sel}>{periodLabel(sel)}</option>}
          </select>
          <button className="btn ghost" onClick={addPeriod}>+ Month</button>
        </div>
        <div className="wrap" key={sel /* remount cells on period switch */}>
          {isEmpty && hasPrev && !['trends', 'settings', 'import'].includes(view) && (
            <div className="banner">
              <span>📋</span>
              <div>
                <b>{periodLabel(sel)} is empty.</b> Start from last month&apos;s figures and adjust?{' '}
                <button className="btn ghost" style={{ marginLeft: 8 }} onClick={copyFromPrevious}>
                  Copy from {periodLabel(periodKeys[periodKeys.indexOf(sel) - 1])}
                </button>
              </div>
            </div>
          )}
          {view === 'dashboard' && <DashboardView totals={totals} ccy={prop.ccy} period={sel} />}
          {view === 'trends' && <TrendsView periods={periods} prop={prop} />}
          {view === 'rooms' && <RoomsView data={data} totals={totals} ccy={prop.ccy} update={update} propName={prop.name} period={sel} />}
          {view === 'fb' && <FBView data={data} ccy={prop.ccy} update={update} />}
          {view === 'other' && <OtherView data={data} ccy={prop.ccy} update={update} />}
          {view === 'undist' && <UndistView data={data} ccy={prop.ccy} update={update} />}
          {view === 'fixed' && <FixedView data={data} ccy={prop.ccy} update={update} />}
          {view === 'import' && <ImportView prop={prop} period={sel} update={update} onApplied={() => setView('summary')} />}
          {view === 'summary' && <SummaryView totals={totals} data={data} ccy={prop.ccy} />}
          {view === 'settings' && <SettingsView prop={prop} onSaved={setProp} />}
        </div>
      </main>
    </div>
  );
}
