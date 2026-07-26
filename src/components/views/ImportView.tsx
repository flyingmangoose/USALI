'use client';
import { useMemo, useRef, useState } from 'react';
import type { Property } from '@/lib/db';
import { applyImport } from '@/lib/importer';
import {
  Assignment, TARGETS, TBRow, normalizeAccount, parseTrialBalance, suggestTarget,
} from '@/lib/importer';
import { periodLabel } from '@/lib/fiscal';
import { money } from '@/lib/format';
import type { Updater } from '../Workspace';

const GROUPS = [...new Set(TARGETS.map(t => t.group))];

export default function ImportView({ prop, period, update, canEdit = true, onApplied }: {
  prop: Property; period: string; update: Updater; canEdit?: boolean; onApplied: () => void;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<TBRow[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [savedCount, setSavedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ mapped: number; ignored: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function parse(input: string) {
    setBusy(true); setDone(null);
    const { rows: parsed, warnings: warns } = parseTrialBalance(input);
    let saved: Record<string, string> = {};
    try {
      const res = await fetch(`/api/properties/${prop.id}/mappings`);
      if (res.ok) saved = await res.json();
    } catch { /* suggestions still work without saved mappings */ }
    const t: Record<string, string> = {};
    let fromSaved = 0;
    for (const r of parsed) {
      const key = normalizeAccount(r.account);
      if (saved[key]) { t[r.account] = saved[key]; fromSaved++; }
      else t[r.account] = suggestTarget(r.account) ?? '';
    }
    setRows(parsed); setWarnings(warns); setTargets(t); setSavedCount(fromSaved);
    setBusy(false);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    const content = await f.text();
    setText(content);
    await parse(content);
  }

  const mapped = useMemo(
    () => (rows ?? []).filter(r => targets[r.account]),
    [rows, targets]
  );

  async function apply() {
    if (!rows) return;
    setBusy(true);
    const assignments: Assignment[] = mapped.map(r => ({ ...r, target: targets[r.account] }));
    update(d => Object.assign(d, applyImport(d, assignments)));
    await fetch(`/api/properties/${prop.id}/mappings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(rows.map(r => [normalizeAccount(r.account), targets[r.account] || null]))),
    }).catch(() => {});
    setBusy(false);
    setDone({ mapped: mapped.length, ignored: rows.length - mapped.length });
  }

  return (
    <>
      <div className="card">
        <div className="head">
          <h2>Import Trial Balance</h2>
          <span className="sub">CSV or tab-separated export from Tally, Zoho Books, Busy, Excel… → {periodLabel(period)}</span>
        </div>
        <div className="body">
          <p className="note" style={{ marginTop: 0 }}>
            Upload or paste a trial balance for <b>{periodLabel(period)}</b>. Map each ledger account to a
            USALI line once — LedgerLeaf remembers the mapping for this property, so next month&apos;s import
            is one click. Debit/credit signs don&apos;t matter; the USALI line decides revenue vs. expense.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <button className="btn ghost" onClick={() => fileRef.current?.click()}>Choose file…</button>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }}
              onChange={e => onFile(e.target.files?.[0])} />
            <span className="note">or paste below</span>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={'Particulars,Debit,Credit\nRoom Rent,,"19,96,600"\nHousekeeping Salaries,"1,20,000",'}
            style={{
              width: '100%', minHeight: 120, background: 'var(--input)', color: 'var(--inputtxt)',
              border: '1px solid var(--line)', borderRadius: 8, font: '12.5px/1.5 ui-monospace,monospace', padding: 10,
            }}
          />
          <div style={{ marginTop: 12 }}>
            <button className="btn" disabled={busy || !text.trim()} onClick={() => parse(text)}>
              {busy ? 'Working…' : 'Parse trial balance'}
            </button>
          </div>
          {!canEdit && (
            <p className="note" style={{ color: 'var(--warn)' }}>⚠ This period is locked — unlock it to apply an import.</p>
          )}
          {warnings.map(w => <p key={w} className="note" style={{ color: 'var(--warn)' }}>⚠ {w}</p>)}
        </div>
      </div>

      {rows && rows.length > 0 && (
        <div className="card">
          <div className="head">
            <h2>Map accounts to USALI lines</h2>
            <span className="sub">
              {rows.length} accounts · {mapped.length} mapped
              {savedCount > 0 ? ` · ${savedCount} from saved mappings` : ''}
            </span>
          </div>
          <div className="body flush">
            <table>
              <thead><tr><th>Ledger account</th><th>Amount</th><th style={{ textAlign: 'left' }}>USALI line</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.account}>
                    <td className="section">{r.account}</td>
                    <td className="calc">{money(Math.abs(r.amount), prop.ccy)}</td>
                    <td style={{ textAlign: 'left' }}>
                      <select
                        className="periodsel"
                        style={{ maxWidth: 320, fontWeight: 500, ...(targets[r.account] ? {} : { color: 'var(--faint)' }) }}
                        value={targets[r.account] ?? ''}
                        onChange={e => setTargets(t => ({ ...t, [r.account]: e.target.value }))}
                      >
                        <option value="">— Ignore —</option>
                        {GROUPS.map(g => (
                          <optgroup key={g} label={g}>
                            {TARGETS.filter(t => t.group === g).map(t => (
                              <option key={t.path} value={t.path}>{t.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="btn" disabled={busy || mapped.length === 0 || !canEdit} onClick={apply}>
                Apply {mapped.length} accounts to {periodLabel(period)}
              </button>
              <span className="note">Mapped lines are replaced with the imported totals; everything else is left as-is.</span>
            </div>
          </div>
        </div>
      )}

      {done && (
        <div className="banner">
          <span>✅</span>
          <div>
            <b>Imported.</b> {done.mapped} accounts applied to {periodLabel(period)}
            {done.ignored > 0 ? `, ${done.ignored} ignored` : ''}. Mappings saved for next month.{' '}
            <button className="btn ghost" style={{ marginLeft: 8 }} onClick={onApplied}>
              View Summary Operating Statement →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
