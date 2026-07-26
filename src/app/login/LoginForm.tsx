'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm({ enabled, next }: { enabled: boolean; next: string }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (res.ok) { router.replace(next || '/'); router.refresh(); }
    else { const b = await res.json().catch(() => ({})); setErr(b.error || 'Login failed'); }
  }

  return (
    <div className="app">
      <main className="main" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ width: 380, maxWidth: '92vw' }}>
          <div className="head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="logo">L</div>
              <b style={{ fontSize: 17 }}>LedgerLeaf</b>
            </div>
            <span className="sub">{enabled ? 'Sign in to your portfolio' : 'Auth is disabled — set LEDGERLEAF_PASSWORD to secure this instance.'}</span>
          </div>
          <div className="body">
            <form onSubmit={submit}>
              <div className="field">
                <label>Shared password</label>
                <input
                  type="password" value={pw} onChange={e => setPw(e.target.value)}
                  placeholder={enabled ? '••••••••' : '(no password set)'}
                  autoFocus={enabled}
                />
              </div>
              {err && <p className="note" style={{ color: 'var(--neg)', marginTop: 10 }}>⚠ {err}</p>}
              <div style={{ marginTop: 18 }}>
                <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}