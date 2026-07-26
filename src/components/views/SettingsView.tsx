'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Property } from '@/lib/db';

export default function SettingsView({ prop, onSaved }: { prop: Property; onSaved: (p: Property) => void }) {
  const router = useRouter();
  const [name, setName] = useState(prop.name);
  const [city, setCity] = useState(prop.city);
  const [rooms, setRooms] = useState(String(prop.rooms || ''));
  const [ccy, setCcy] = useState(prop.ccy);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const res = await fetch(`/api/properties/${prop.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, city, rooms: Number(rooms) || 0, ccy }),
    });
    setBusy(false);
    if (res.ok) { onSaved(await res.json()); setMsg('Saved.'); }
    else setMsg('Save failed.');
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/properties/${prop.id}`, { method: 'DELETE' });
    router.push('/');
    router.refresh();
  }

  return (
    <div className="card">
      <div className="head"><h2>Property Settings</h2><span className="sub">Room count drives every per-available-room metric</span></div>
      <div className="body">
        <form onSubmit={save}>
          <div className="grid2">
            <div className="field"><label>Property name</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div className="field"><label>City</label><input value={city} onChange={e => setCity(e.target.value)} /></div>
            <div className="field"><label>Rooms in inventory</label><input type="number" min="1" value={rooms} onChange={e => setRooms(e.target.value)} /></div>
            <div className="field"><label>Currency</label>
              <select value={ccy} onChange={e => setCcy(e.target.value)}>
                <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
                <option>AED</option><option>SGD</option><option>LKR</option><option>NPR</option>
              </select></div>
          </div>
          <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn" disabled={busy}>Save settings</button>
            <span className="note">{msg}</span>
          </div>
        </form>
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '24px 0' }} />
        {!confirmDelete ? (
          <button className="btn danger" onClick={() => setConfirmDelete(true)}>Delete property…</button>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="note" style={{ color: 'var(--neg)' }}>
              This permanently deletes <b>{prop.name}</b> and all its monthly data.
            </span>
            <button className="btn danger" disabled={busy} onClick={remove}>Yes, delete everything</button>
            <button className="btn ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
