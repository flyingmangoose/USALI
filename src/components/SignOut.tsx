'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignOut({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!enabled) return null;
  async function out() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/login');
    router.refresh();
  }
  return (
    <nav className="nav" style={{ marginTop: 10 }}>
      <button onClick={out} disabled={busy}>
        <span className="dot"></span>{busy ? 'Signing out…' : 'Sign out'}
      </button>
    </nav>
  );
}