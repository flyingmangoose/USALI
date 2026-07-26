'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddProperty() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [rooms, setRooms] = useState('');
  const [ccy, setCcy] = useState('INR');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, city, rooms: Number(rooms) || 0, ccy }),
    });
    setBusy(false);
    if (res.ok) {
      const p = await res.json();
      router.push(`/p/${p.id}`);
      router.refresh();
    }
  }

  return (
    <div className="card">
      <div className="head"><h2>Add a property</h2><span className="sub">Independent hotel, guesthouse or resort</span></div>
      <div className="body">
        <form onSubmit={submit}>
          <div className="grid2">
            <div className="field"><label>Property name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tamarind Court Hotel" required /></div>
            <div className="field"><label>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Jaipur" /></div>
            <div className="field"><label>Rooms in inventory</label>
              <input value={rooms} onChange={e => setRooms(e.target.value)} type="number" min="1" placeholder="42" /></div>
            <div className="field"><label>Currency</label>
              <select value={ccy} onChange={e => setCcy(e.target.value)}>
                <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
                <option>AED</option><option>SGD</option><option>LKR</option><option>NPR</option>
              </select></div>
          </div>
          <div style={{ marginTop: 18 }}>
            <button className="btn" disabled={busy || !name.trim()}>{busy ? 'Adding…' : 'Add property'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
