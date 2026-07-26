'use client';
import { useEffect, useRef, useState } from 'react';
import { num } from '@/lib/format';

/**
 * Editable schedule cell. Holds its own draft so typing is never interrupted by
 * re-renders, but resyncs from `value` whenever the cell is not focused — so an
 * external change (import, copy-from-previous, period switch) is reflected even
 * without a blur event. `readOnly` locks the cell for closed periods.
 */
export default function Cell({ value, onChange, readOnly = false }: {
  value: number; onChange: (n: number) => void; readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<string>(value ? String(value) : '');
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(value ? String(value) : ''); }, [value]);
  return (
    <input
      className="cell"
      inputMode="decimal"
      readOnly={readOnly}
      placeholder={readOnly ? '—' : '0'}
      value={draft}
      onChange={e => { setDraft(e.target.value); if (!readOnly) onChange(num(e.target.value)); }}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; setDraft(value ? String(value) : ''); }}
    />
  );
}