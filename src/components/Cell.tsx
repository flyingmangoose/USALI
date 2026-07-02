'use client';
import { useState } from 'react';
import { num } from '@/lib/format';

/** Editable schedule cell. Holds its own draft string so typing is never
 * interrupted by re-renders; parses commas/spaces on the fly. */
export default function Cell({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState<string>(value ? String(value) : '');
  return (
    <input
      className="cell"
      inputMode="decimal"
      placeholder="0"
      value={draft}
      onChange={e => { setDraft(e.target.value); onChange(num(e.target.value)); }}
      onBlur={() => setDraft(value ? String(value) : '')}
    />
  );
}
