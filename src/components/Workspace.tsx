'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Property, PeriodRow } from '@/lib/db';
import { PeriodData, Totals, calcAll, emptyPeriodData } from '@/lib/engine';
import { addMonths, comparePeriods, daysInPeriod, fyLabel, periodLabel } from '@/lib/fiscal';
import SignOut from './SignOut';
import DashboardView from './views/DashboardView';
import RoomsView from './views/RoomsView';
import { FBView, OtherView, UndistView, FixedView } from './views/CondensedViews';
import SummaryView from './views/SummaryView';
import ImportView from './views/ImportView';
import TrendsView from './views/TrendsView';
import SettingsView from './views/SettingsView';
import BudgetView from './views/BudgetView';
import GSTView from './views/GSTView';
import DailyStatsView from './views/DailyStatsView';

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
  { key: 'budget', title: 'Budget', group: 'Data' },
  { key: 'daily', title: 'Daily Operating Stats', group: 'Data' },
  { key: 'summary', title: 'Summary Op Statement', group: 'Reports' },
  { key: 'gst', title: 'GST Liability', group: 'Reports' },
  { key: 'settings', title: 'Property Settings', group: 'Property' },
] as const;

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard', trends: 'Trends',
  rooms: 'Rooms — Schedule 1', fb: 'Food & Beverage — Schedule 2',
  other: 'Other Operated & Misc Income', undist: 'Undistributed Operating Expenses',
  fixed: 'Fees & Fixed Charges', summary: 'Summary Operating Statement',
  budget: 'Budget', gst: 'GST Liability', daily: 'Daily Operating Statistics',
  import: 'Import Trial Balance', settings: 'Property Settings',
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Workspace({ property, initialPeriods, initialView, initialPeriod, authEnabled }: {
  property: Property;
  initialPeriods: PeriodRow[];
  initialView?: string;
  initialPeriod?: string;
  authEnabled?: boolean;
}) {
  const router = useRouter();
  const [prop, setProp] = useState(property);
  const [periods, setPeriods] = useState<Record<string, PeriodData>>(
    () => Object.fromEntries(initialPeriods.map(r => [r.period, r.data]))
  );
  const [lockState, setLockState] = useState<Record<string, boolean>>(
    () => Object.fromEntries(initialPeriods.map(r => [r.period, r.locked]))
  );
  const periodKeys = useMemo(() => Object.keys(periods).sort(comparePeriods), [periods]);
  const [sel, setSel] = useState<string>(
    () => (initialPeriod && periods[initialPeriod]) ? initialPeriod
      : periodKeys[periodKeys.length - 1] ?? currentMonth()
  );
  const [view, setView] = useState<string>(initialView ?? 'dashboard');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [budget, setBudget] = useState<PeriodData | null>(null);
  const [bench, setBench] = useState<{ medianRevpar: number | null; medianGoppar: number | null; medianOcc: number | null } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const budgetCache = useRef<Record<string, PeriodData | null>>({});

  const data = periods[sel] ?? emptyPeriodData();
  const locked = !!lockState[sel];
  const canEdit = !locked;
  const avail = prop.rooms * daysInPeriod(sel);
  const totals: Totals = useMemo(() => calcAll(data, avail), [data, avail]);

  // Prior-year period (same month, 12 months earlier) if it exists in this property.
  const pyPeriod = addMonths(sel, -12);
  const priorData = periods[pyPeriod] ?? null;

  // Keep the URL in sync with the current view + period (deep-linkable).
  useEffect(() => {
    const url = `/p/${prop.id}?v=${view}&period=${sel}`;
    router.replace(url, { scroll: false });
  }, [view, sel, prop.id, router]);

  // Load budget for the selected period (cached).
  useEffect(() => {
    if (!(sel in budgetCache.current)) {
      budgetCache.current[sel] = null;
      fetch(`/api/properties/${prop.id}/budgets/${sel}`)
        .then(r => r.ok ? r.json() : null)
        .then(j => { budgetCache.current[sel] = j?.data ?? null; setBudget(j?.data ?? null); })
        .catch(() => setBudget(null));
    } else {
      setBudget(budgetCache.current[sel]);
    }
  }, [sel, prop.id]);

  // Portfolio benchmark for this property.
  useEffect(() => {
    fetch(`/api/properties/${prop.id}/benchmark`).then(r => r.ok ? r.json() : null).then(setBench).catch(() => {});
  }, [prop.id]);

  const persist = useCallback(async (period: string, d: PeriodData) => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/properties/${prop.id}/periods/${period}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
      });
      setSaveState(res.ok ? 'saved' : 'error');
      if (res.status === 409) setLockState(s => ({ ...s, [period]: true })); // someone locked it
    } catch {
      setSaveState('error');
    }
  }, [prop.id]);

  const update: Updater = useCallback(fn => {
    if (locked) return; // closed period — edits ignored
    setPeriods(prev => {
      const next = structuredClone(prev[sel] ?? emptyPeriodData());
      fn(next);
      const out = { ...prev, [sel]: next };
      setSaveState('unsaved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(sel, next), 700);
      return out;
    });
  }, [sel, persist, locked]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  async function addPeriod() {
    const next = periodKeys.length ? addMonths(periodKeys[periodKeys.length - 1], 1) : currentMonth();
    const d = emptyPeriodData();
    setPeriods(prev => ({ ...prev, [next]: d }));
    setLockState(prev => ({ ...prev, [next]: false }));
    setSel(next);
    await persist(next, d);
  }

  function copyFromPrevious() {
    const idx = periodKeys.indexOf(sel);
    if (idx <= 0) return;
    const prevData = periods[periodKeys[idx - 1]];
    update(d => Object.assign(d, structuredClone(prevData)));
  }

  async function deleteCurrentPeriod() {
    if (periodKeys.length <= 1) return; // keep at least one
    if (locked) return;
    await fetch(`/api/properties/${prop.id}/periods/${sel}`, { method: 'DELETE' });
    setPeriods(prev => { const n = { ...prev }; delete n[sel]; return n; });
    setLockState(prev => { const n = { ...prev }; delete n[sel]; return n; });
    delete budgetCache.current[sel];
    const idx = periodKeys.indexOf(sel);
    const neighbor = periodKeys[idx - 1] ?? periodKeys[idx + 1];
    if (neighbor) setSel(neighbor);
  }

  async function toggleLock() {
    const next = !locked;
    setLockState(prev => ({ ...prev, [sel]: next }));
    await fetch(`/api/properties/${prop.id}/periods/${sel}/lock`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: next }),
    }).catch(() => {});
  }

  const isEmpty = totals.totalRev === 0 && totals.deptExp === 0 && totals.sold === 0;
  const hasPrev = periodKeys.indexOf(sel) > 0;

  const saveLabel = { saved: 'Saved', saving: 'Saving…', unsaved: 'Editing…', error: 'Save failed — retrying on next edit' }[saveState];

  const groups: string[] = Array.from(new Set(VIEWS.map(v => v.group)));

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
        <SignOut enabled={!!authEnabled} />
      </aside>
      <main className="main">
        <div className="topbar">
          <h1>{TITLES[view]}</h1>
          <span className="crumb">{prop.name}{prop.city ? ` · ${prop.city}` : ''} · {fyLabel(sel)}</span>
          <div className="spacer"></div>
          {locked && <span className="pill" style={{ color: 'var(--warn)', borderColor: 'rgba(244,183,64,.4)' }}>🔒 {periodLabel(sel)} locked</span>}
          <span className={`pill${saveState === 'saved' ? ' ok' : ''}`}>{saveLabel}</span>
          <select className="periodsel" value={sel} onChange={e => setSel(e.target.value)}>
            {periodKeys.map(p => <option key={p} value={p}>{periodLabel(p)}{lockState[p] ? ' 🔒' : ''}</option>)}
            {!periodKeys.includes(sel) && <option value={sel}>{periodLabel(sel)}</option>}
          </select>
          <button className="btn ghost" onClick={addPeriod}>+ Month</button>
          {periodKeys.length > 1 && !locked && (
            <button className="btn ghost" onClick={deleteCurrentPeriod} title="Delete this month's data">Delete month</button>
          )}
          <button className="btn ghost" onClick={toggleLock} title={locked ? 'Unlock to edit' : 'Lock this period'}>
            {locked ? 'Unlock' : 'Lock'}
          </button>
        </div>
        <div className="wrap" key={sel /* remount cells on period switch */}>
          {locked && !['trends', 'settings', 'dashboard', 'summary'].includes(view) && (
            <div className="banner" style={{ borderColor: 'rgba(244,183,64,.4)' }}>
              <span>🔒</span>
              <div>
                <b>{periodLabel(sel)} is locked.</b> Closed periods are read-only to protect signed-off
                figures. Unlock with the button in the top bar to make changes.
              </div>
            </div>
          )}
          {isEmpty && hasPrev && !['trends', 'settings', 'import', 'budget', 'gst', 'daily'].includes(view) && (
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
          {view === 'dashboard' && <DashboardView totals={totals} ccy={prop.ccy} period={sel} bench={bench} />}
          {view === 'trends' && <TrendsView periods={periods} prop={prop} />}
          {view === 'rooms' && <RoomsView data={data} totals={totals} ccy={prop.ccy} update={update} canEdit={canEdit} propName={prop.name} period={sel} />}
          {view === 'fb' && <FBView data={data} ccy={prop.ccy} update={update} canEdit={canEdit} />}
          {view === 'other' && <OtherView data={data} ccy={prop.ccy} update={update} canEdit={canEdit} />}
          {view === 'undist' && <UndistView data={data} ccy={prop.ccy} update={update} canEdit={canEdit} />}
          {view === 'fixed' && <FixedView data={data} update={update} canEdit={canEdit} />}
          {view === 'import' && <ImportView prop={prop} period={sel} update={update} canEdit={canEdit} onApplied={() => setView('summary')} />}
          {view === 'budget' && <BudgetView prop={prop} period={sel} budget={budget} onSaved={(b) => { budgetCache.current[sel] = b; setBudget(b); }} />}
          {view === 'daily' && <DailyStatsView prop={prop} period={sel} onSumChanged={() => {}} />}
          {view === 'summary' && <SummaryView totals={totals} data={data} ccy={prop.ccy} budget={budget} prior={priorData} />}
          {view === 'gst' && <GSTView totals={totals} data={data} ccy={prop.ccy} period={sel} />}
          {view === 'settings' && <SettingsView prop={prop} onSaved={setProp} />}
        </div>
      </main>
    </div>
  );
}