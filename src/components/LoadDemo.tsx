'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** "Load demo data" — seeds the demo property + six months via /api/seed,
 *  then navigates to it. Self-service equivalent of `npm run seed`. */
export default function LoadDemo({ label = 'Load demo data', className = 'btn' }: { label?: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function run() {
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) {
        setMsg(data?.error || 'Failed to load demo data.');
        setBusy(false);
        return;
      }
      setMsg(data.created ? 'Loaded — opening…' : 'Already loaded — opening…');
      router.refresh();
      router.push(`/p/${data.id}`);
    } catch {
      setMsg('Network error — retry.');
      setBusy(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
      <button className={className} disabled={busy} onClick={run}>{busy ? 'Loading…' : label}</button>
      {msg && <span className="note">{msg}</span>}
    </span>
  );
}