import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { PeriodData, Totals, calcAll, normalizePeriodData } from './engine';
import { daysInPeriod } from './fiscal';

export interface Property {
  id: number;
  name: string;
  city: string;
  rooms: number;
  ccy: string;
  created_at: string;
}

export interface PeriodRow {
  period: string; // YYYY-MM
  data: PeriodData;
  updated_at: string;
  locked: boolean;
}

/** Snapshot of computed KPIs for a period — used by the portfolio view and
 *  cross-property benchmarking without re-deriving from every period blob. */
export interface KpiRow {
  property_id: number;
  period: string;
  occ: number; adr: number; revpar: number; trevpar: number; goppar: number;
  totalRev: number; gop: number; ebitda: number; ebitdaLessReserve: number;
  updated_at: string;
}

export interface DailyStat {
  date: string;     // YYYY-MM-DD
  sold: number; comps: number; houseUse: number; noShow: number;
}

export interface AuditEntry {
  id: number; property_id: number; period: string | null;
  action: string; payload: string; at: string;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.LEDGERLEAF_DB ?? path.join(DB_DIR, 'ledgerleaf.db');

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      rooms INTEGER NOT NULL DEFAULT 0,
      ccy TEXT NOT NULL DEFAULT 'INR',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS periods (
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      data TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (property_id, period)
    );
    CREATE TABLE IF NOT EXISTS budgets (
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (property_id, period)
    );
    CREATE TABLE IF NOT EXISTS daily_stats (
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      sold INTEGER NOT NULL DEFAULT 0,
      comps INTEGER NOT NULL DEFAULT 0,
      house_use INTEGER NOT NULL DEFAULT 0,
      no_show INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (property_id, date)
    );
    CREATE TABLE IF NOT EXISTS period_kpis (
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      occ REAL NOT NULL DEFAULT 0,
      adr REAL NOT NULL DEFAULT 0,
      revpar REAL NOT NULL DEFAULT 0,
      trevpar REAL NOT NULL DEFAULT 0,
      goppar REAL NOT NULL DEFAULT 0,
      totalRev REAL NOT NULL DEFAULT 0,
      gop REAL NOT NULL DEFAULT 0,
      ebitda REAL NOT NULL DEFAULT 0,
      ebitdaLessReserve REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (property_id, period)
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      period TEXT,
      action TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '',
      at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS mappings (
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      account TEXT NOT NULL,
      target TEXT NOT NULL,
      PRIMARY KEY (property_id, account)
    );
  `);
  // Migration: older `periods` tables predate the `locked` column.
  const cols = _db.prepare("PRAGMA table_info(periods)").all() as { name: string }[];
  if (!cols.some(c => c.name === 'locked')) {
    _db.exec('ALTER TABLE periods ADD COLUMN locked INTEGER NOT NULL DEFAULT 0');
  }
  backfillKpis();
  return _db;
}

/* ---------- audit ---------- */

export function recordAudit(propertyId: number, period: string | null, action: string, payload: unknown = null): void {
  db().prepare(
    'INSERT INTO audit_log (property_id, period, action, payload) VALUES (?, ?, ?, ?)'
  ).run(propertyId, period, action, payload == null ? '' : JSON.stringify(payload));
}

export function listAudit(propertyId: number, limit = 50): AuditEntry[] {
  return db().prepare(
    'SELECT id, property_id, period, action, payload, at FROM audit_log WHERE property_id = ? ORDER BY id DESC LIMIT ?'
  ).all(propertyId, limit) as AuditEntry[];
}

/* ---------- properties ---------- */

export function listProperties(): Property[] {
  return db().prepare('SELECT * FROM properties ORDER BY name').all() as Property[];
}

export function getProperty(id: number): Property | undefined {
  return db().prepare('SELECT * FROM properties WHERE id = ?').get(id) as Property | undefined;
}

export function createProperty(p: { name: string; city?: string; rooms?: number; ccy?: string }): Property {
  const info = db().prepare(
    'INSERT INTO properties (name, city, rooms, ccy) VALUES (?, ?, ?, ?)'
  ).run(p.name, p.city ?? '', p.rooms ?? 0, p.ccy ?? 'INR');
  const created = getProperty(Number(info.lastInsertRowid))!;
  recordAudit(created.id, null, 'property.create', { name: created.name });
  return created;
}

export function updateProperty(id: number, p: Partial<Pick<Property, 'name' | 'city' | 'rooms' | 'ccy'>>): Property | undefined {
  const cur = getProperty(id);
  if (!cur) return undefined;
  db().prepare('UPDATE properties SET name = ?, city = ?, rooms = ?, ccy = ? WHERE id = ?')
    .run(p.name ?? cur.name, p.city ?? cur.city, p.rooms ?? cur.rooms, p.ccy ?? cur.ccy, id);
  const updated = getProperty(id);
  recordAudit(id, null, 'property.update', { before: cur, after: updated });
  return updated;
}

export function deleteProperty(id: number): void {
  // ON DELETE CASCADE (now active with foreign_keys=ON) clears periods, budgets,
  // daily_stats, period_kpis, mappings, and audit_log. Mappings rows also
  // cascade via their own FK.
  db().prepare('DELETE FROM properties WHERE id = ?').run(id);
}

/* ---------- periods ---------- */

export function listPeriods(propertyId: number): PeriodRow[] {
  const rows = db().prepare(
    'SELECT period, data, updated_at, locked FROM periods WHERE property_id = ? ORDER BY period'
  ).all(propertyId) as { period: string; data: string; updated_at: string; locked: number }[];
  return rows.map(r => ({
    period: r.period, data: normalizePeriodData(JSON.parse(r.data)),
    updated_at: r.updated_at, locked: !!r.locked,
  }));
}

export function getPeriod(propertyId: number, period: string): PeriodRow | undefined {
  const r = db().prepare(
    'SELECT period, data, updated_at, locked FROM periods WHERE property_id = ? AND period = ?'
  ).get(propertyId, period) as { period: string; data: string; updated_at: string; locked: number } | undefined;
  return r && {
    period: r.period, data: normalizePeriodData(JSON.parse(r.data)),
    updated_at: r.updated_at, locked: !!r.locked,
  };
}

export function isPeriodLocked(propertyId: number, period: string): boolean {
  const r = db().prepare('SELECT locked FROM periods WHERE property_id = ? AND period = ?')
    .get(propertyId, period) as { locked: number } | undefined;
  return !!r?.locked;
}

/** Update the KPI cache row for a single period from a freshly computed Totals. */
function writeKpis(propertyId: number, period: string, t: Totals): void {
  db().prepare(`
    INSERT INTO period_kpis (property_id, period, occ, adr, revpar, trevpar, goppar, totalRev, gop, ebitda, ebitdaLessReserve, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (property_id, period) DO UPDATE SET
      occ = excluded.occ, adr = excluded.adr, revpar = excluded.revpar, trevpar = excluded.trevpar,
      goppar = excluded.goppar, totalRev = excluded.totalRev, gop = excluded.gop, ebitda = excluded.ebitda,
      ebitdaLessReserve = excluded.ebitdaLessReserve, updated_at = datetime('now')
  `).run(propertyId, period, t.occ, t.adr, t.revpar, t.trevpar, t.goppar, t.totalRev, t.gop, t.ebitda, t.ebitdaLessReserve);
}

/** Populate the KPI cache for periods that predate it (seed data, older rows).
 *  Runs once on first DB init; new saves keep the cache fresh via upsertPeriodWithKpis. */
function backfillKpis(): void {
  const missing = _db!.prepare(`
    SELECT p.id AS pid, p.rooms, per.period, per.data FROM properties p
    JOIN periods per ON per.property_id = p.id
    LEFT JOIN period_kpis k ON k.property_id = p.id AND k.period = per.period
    WHERE k.period IS NULL
  `).all() as { pid: number; rooms: number; period: string; data: string }[];
  for (const m of missing) {
    const data = normalizePeriodData(JSON.parse(m.data));
    const t = calcAll(data, m.rooms * daysInPeriod(m.period));
    writeKpis(m.pid, m.period, t);
  }
}

export function upsertPeriod(propertyId: number, period: string, data: PeriodData): void {
  db().prepare(`
    INSERT INTO periods (property_id, period, data, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT (property_id, period)
    DO UPDATE SET data = excluded.data, updated_at = datetime('now')
  `).run(propertyId, period, JSON.stringify(data));
  recordAudit(propertyId, period, 'period.upsert');
}

/** Upsert a period and refresh its KPI cache row. Caller passes the computed totals. */
export function upsertPeriodWithKpis(propertyId: number, period: string, data: PeriodData, totals: Totals): void {
  upsertPeriod(propertyId, period, data);
  writeKpis(propertyId, period, totals);
}

export function deletePeriod(propertyId: number, period: string): void {
  db().prepare('DELETE FROM periods WHERE property_id = ? AND period = ?').run(propertyId, period);
  db().prepare('DELETE FROM period_kpis WHERE property_id = ? AND period = ?').run(propertyId, period);
  recordAudit(propertyId, period, 'period.delete');
}

export function setPeriodLocked(propertyId: number, period: string, locked: boolean): void {
  db().prepare('UPDATE periods SET locked = ? WHERE property_id = ? AND period = ?')
    .run(locked ? 1 : 0, propertyId, period);
  recordAudit(propertyId, period, locked ? 'period.lock' : 'period.unlock');
}

/* ---------- budgets ---------- */

export function getBudget(propertyId: number, period: string): PeriodData | undefined {
  const r = db().prepare('SELECT data FROM budgets WHERE property_id = ? AND period = ?')
    .get(propertyId, period) as { data: string } | undefined;
  return r ? normalizePeriodData(JSON.parse(r.data)) : undefined;
}

export function upsertBudget(propertyId: number, period: string, data: PeriodData): void {
  db().prepare(`
    INSERT INTO budgets (property_id, period, data, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT (property_id, period)
    DO UPDATE SET data = excluded.data, updated_at = datetime('now')
  `).run(propertyId, period, JSON.stringify(data));
  recordAudit(propertyId, period, 'budget.upsert');
}

export function deleteBudget(propertyId: number, period: string): void {
  db().prepare('DELETE FROM budgets WHERE property_id = ? AND period = ?').run(propertyId, period);
  recordAudit(propertyId, period, 'budget.delete');
}

/* ---------- daily stats ---------- */

export function listDailyStats(propertyId: number): DailyStat[] {
  const rows = db().prepare(
    'SELECT date, sold, comps, house_use AS houseUse, no_show AS noShow FROM daily_stats WHERE property_id = ? ORDER BY date'
  ).all(propertyId) as DailyStat[];
  return rows;
}

export function upsertDailyStat(propertyId: number, s: DailyStat): void {
  db().prepare(`
    INSERT INTO daily_stats (property_id, date, sold, comps, house_use, no_show, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (property_id, date) DO UPDATE SET
      sold = excluded.sold, comps = excluded.comps, house_use = excluded.house_use,
      no_show = excluded.no_show, updated_at = datetime('now')
  `).run(propertyId, s.date, s.sold, s.comps, s.houseUse, s.noShow);
}

export function deleteDailyStat(propertyId: number, date: string): void {
  db().prepare('DELETE FROM daily_stats WHERE property_id = ? AND date = ?').run(propertyId, date);
}

/** Sum daily stats for a given period (YYYY-MM) — used to populate stats.sold. */
export function dailyStatsTotalForPeriod(propertyId: number, period: string): number {
  const r = db().prepare(`
    SELECT COALESCE(SUM(sold), 0) AS s FROM daily_stats
    WHERE property_id = ? AND substr(date, 1, 7) = ?
  `).get(propertyId, period) as { s: number };
  return r.s;
}

/* ---------- KPI cache / benchmarking ---------- */

/** Latest-period KPI row per property, for the portfolio grid. */
export function listLatestKpis(): { property: Property; kpi: KpiRow | null }[] {
  const rows = db().prepare(`
    SELECT p.* AS property, k.* AS kpi FROM properties p
    LEFT JOIN period_kpis k ON k.property_id = p.id AND k.period = (
      SELECT MAX(period) FROM period_kpis WHERE property_id = p.id
    )
    ORDER BY p.name
  `).all() as (Property & KpiRow & { period: string | null })[];
  // Distinguish the property columns from the kpi columns (join flattens them).
  return rows.map(r => {
    const { id, name, city, rooms, ccy, created_at } = r;
    const property: Property = { id, name, city, rooms, ccy, created_at };
    const kpi: KpiRow | null = r.period ? {
      property_id: id, period: r.period, occ: r.occ, adr: r.adr, revpar: r.revpar,
      trevpar: r.trevpar, goppar: r.goppar, totalRev: r.totalRev, gop: r.gop,
      ebitda: r.ebitda, ebitdaLessReserve: r.ebitdaLessReserve, updated_at: r.updated_at,
    } : null;
    return { property, kpi };
  });
}

/** Aggregated KPI stats across a property's portfolio for benchmarking. */
export function portfolioKpiStats(propertyId: number): {
  medianRevpar: number | null; medianGoppar: number | null; medianOcc: number | null; count: number;
} {
  const rows = db().prepare(`
    SELECT revpar, goppar, occ FROM period_kpis WHERE property_id = ?
  `).all(propertyId) as { revpar: number; goppar: number; occ: number }[];
  if (!rows.length) return { medianRevpar: null, medianGoppar: null, medianOcc: null, count: 0 };
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  return {
    medianRevpar: median(rows.map(r => r.revpar)),
    medianGoppar: median(rows.map(r => r.goppar)),
    medianOcc: median(rows.map(r => r.occ)),
    count: rows.length,
  };
}

/* ---------- mappings ---------- */

/** Saved trial-balance account → USALI target mappings, keyed by normalized account name. */
export function getMappings(propertyId: number): Record<string, string> {
  const rows = db().prepare('SELECT account, target FROM mappings WHERE property_id = ?')
    .all(propertyId) as { account: string; target: string }[];
  return Object.fromEntries(rows.map(r => [r.account, r.target]));
}

/** Upsert mappings; a null/empty target removes the saved mapping for that account. */
export function saveMappings(propertyId: number, entries: Record<string, string | null>): void {
  const upsert = db().prepare(`
    INSERT INTO mappings (property_id, account, target) VALUES (?, ?, ?)
    ON CONFLICT (property_id, account) DO UPDATE SET target = excluded.target
  `);
  const del = db().prepare('DELETE FROM mappings WHERE property_id = ? AND account = ?');
  const tx = db().transaction(() => {
    for (const [account, target] of Object.entries(entries)) {
      if (target) upsert.run(propertyId, account, target);
      else del.run(propertyId, account);
    }
  });
  tx();
}