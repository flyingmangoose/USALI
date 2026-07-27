import Link from 'next/link';
import { listLatestKpis } from '@/lib/db';
import { authEnabled } from '@/lib/auth';
import { periodLabel } from '@/lib/fiscal';
import { compact, money, pct } from '@/lib/format';
import AddProperty from '@/components/AddProperty';
import SignOut from '@/components/SignOut';
import LoadDemo from '@/components/LoadDemo';

export const dynamic = 'force-dynamic';

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function Home() {
  const rows = listLatestKpis();
  const properties = rows.map(r => r.property);
  const withKpi = rows.map(r => r.kpi).filter(Boolean) as NonNullable<typeof rows[number]['kpi']>[];
  const bench = {
    revpar: median(withKpi.map(k => k.revpar)),
    occ: median(withKpi.map(k => k.occ)),
    gop: median(withKpi.map(k => k.gop)),
  };

  return (
    <div className="app">
      <aside className="side">
        <Link className="brand" href="/">
          <div className="logo">L</div>
          <div><b>LedgerLeaf</b><small>USALI Financials</small></div>
        </Link>
        <div className="navgroup">Portfolio</div>
        <nav className="nav">
          <a className="active"><span className="dot"></span>Properties</a>
        </nav>
        <div className="navgroup" style={{ marginTop: 'auto' }} />
        <SignOut enabled={authEnabled()} />
      </aside>
      <main className="main">
        <div className="topbar">
          <h1>Portfolio</h1>
          <span className="crumb">{properties.length} propert{properties.length === 1 ? 'y' : 'ies'}</span>
          <div className="spacer"></div>
          <LoadDemo className="btn ghost" label="Load demo data" />
          {bench.revpar != null && withKpi.length > 1 && (
            <span className="pill ok">Portfolio median RevPAR {money(bench.revpar, 'INR', 0)} · Occ {pct(bench.occ ?? 0) || '—'}</span>
          )}
          <span className="pill">India · USALI 11th Ed.</span>
        </div>
        <div className="wrap">
          {properties.length === 0 && (
            <div className="banner">
              <span>🏨</span>
              <div>
                <b>Welcome to LedgerLeaf.</b> Add your first property below, then enter monthly
                figures in the USALI schedules — or{' '}
                <LoadDemo label="load the demo property" /> to see a 42-room Jaipur hotel with six
                months of populated USALI reporting.
              </div>
            </div>
          )}
          <div className="propgrid" style={{ marginBottom: 26 }}>
            {rows.map(({ property: p, kpi: k }) => {
              const benchVsRevpar = k && bench.revpar != null ? (k.revpar - bench.revpar) / (bench.revpar || 1) : null;
              return (
                <Link key={p.id} className="propcard" href={`/p/${p.id}`}>
                  <h3>{p.name}</h3>
                  <div className="loc">{p.city || '—'} · {p.rooms} rooms · {p.ccy}</div>
                  <div className="stats">
                    <div><div className="l">Latest</div><div className="v">{k ? periodLabel(k.period) : 'No data'}</div></div>
                    <div><div className="l">Occupancy</div><div className="v">{k ? pct(k.occ) || '—' : '—'}</div></div>
                    <div><div className="l">Revenue</div><div className="v">{k ? compact(k.totalRev, p.ccy) : '—'}</div></div>
                    <div><div className="l">GOP</div><div className="v">{k ? compact(k.gop, p.ccy) : '—'}</div></div>
                  </div>
                  {benchVsRevpar != null && Math.abs(benchVsRevpar) > 0.001 && (
                    <div className="loc" style={{ marginTop: 8 }}>
                      RevPAR vs portfolio: <b style={{ color: benchVsRevpar > 0 ? 'var(--accent2)' : 'var(--neg)' }}>
                        {benchVsRevpar > 0 ? '+' : ''}{pct(benchVsRevpar)}
                      </b>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          <AddProperty />
        </div>
      </main>
    </div>
  );
}