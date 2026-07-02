import Link from 'next/link';
import { listProperties, listPeriods } from '@/lib/db';
import { calcAll } from '@/lib/engine';
import { daysInPeriod, periodLabel } from '@/lib/fiscal';
import { compact, pct } from '@/lib/format';
import AddProperty from '@/components/AddProperty';

export const dynamic = 'force-dynamic';

export default function Home() {
  const properties = listProperties();

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
      </aside>
      <main className="main">
        <div className="topbar">
          <h1>Portfolio</h1>
          <span className="crumb">{properties.length} propert{properties.length === 1 ? 'y' : 'ies'}</span>
          <div className="spacer"></div>
          <span className="pill">India · USALI 11th Ed.</span>
        </div>
        <div className="wrap">
          {properties.length === 0 && (
            <div className="banner">
              <span>🏨</span>
              <div><b>Welcome to LedgerLeaf.</b> Add your first property below, then enter monthly
              figures in the USALI schedules. Run <code>npm run seed</code> for a demo Indian property
              with six months of data.</div>
            </div>
          )}
          <div className="propgrid" style={{ marginBottom: 26 }}>
            {properties.map(p => {
              const periods = listPeriods(p.id);
              const latest = periods[periods.length - 1];
              const t = latest ? calcAll(latest.data, p.rooms * daysInPeriod(latest.period)) : null;
              return (
                <Link key={p.id} className="propcard" href={`/p/${p.id}`}>
                  <h3>{p.name}</h3>
                  <div className="loc">{p.city || '—'} · {p.rooms} rooms · {p.ccy}</div>
                  <div className="stats">
                    <div><div className="l">Latest</div><div className="v">{latest ? periodLabel(latest.period) : 'No data'}</div></div>
                    <div><div className="l">Occupancy</div><div className="v">{t ? pct(t.occ) || '—' : '—'}</div></div>
                    <div><div className="l">Revenue</div><div className="v">{t ? compact(t.totalRev, p.ccy) : '—'}</div></div>
                    <div><div className="l">GOP</div><div className="v">{t ? compact(t.gop, p.ccy) : '—'}</div></div>
                  </div>
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
