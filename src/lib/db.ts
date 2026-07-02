import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { PeriodData, normalizePeriodData } from './engine';

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
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.LEDGERLEAF_DB ?? path.join(DB_DIR, 'ledgerleaf.db');

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
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
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (property_id, period)
    );
  `);
  return _db;
}

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
  return getProperty(Number(info.lastInsertRowid))!;
}

export function updateProperty(id: number, p: Partial<Pick<Property, 'name' | 'city' | 'rooms' | 'ccy'>>): Property | undefined {
  const cur = getProperty(id);
  if (!cur) return undefined;
  db().prepare('UPDATE properties SET name = ?, city = ?, rooms = ?, ccy = ? WHERE id = ?')
    .run(p.name ?? cur.name, p.city ?? cur.city, p.rooms ?? cur.rooms, p.ccy ?? cur.ccy, id);
  return getProperty(id);
}

export function deleteProperty(id: number): void {
  db().prepare('DELETE FROM periods WHERE property_id = ?').run(id);
  db().prepare('DELETE FROM properties WHERE id = ?').run(id);
}

export function listPeriods(propertyId: number): PeriodRow[] {
  const rows = db().prepare(
    'SELECT period, data, updated_at FROM periods WHERE property_id = ? ORDER BY period'
  ).all(propertyId) as { period: string; data: string; updated_at: string }[];
  return rows.map(r => ({ period: r.period, data: normalizePeriodData(JSON.parse(r.data)), updated_at: r.updated_at }));
}

export function getPeriod(propertyId: number, period: string): PeriodRow | undefined {
  const r = db().prepare(
    'SELECT period, data, updated_at FROM periods WHERE property_id = ? AND period = ?'
  ).get(propertyId, period) as { period: string; data: string; updated_at: string } | undefined;
  return r && { period: r.period, data: normalizePeriodData(JSON.parse(r.data)), updated_at: r.updated_at };
}

export function upsertPeriod(propertyId: number, period: string, data: PeriodData): void {
  db().prepare(`
    INSERT INTO periods (property_id, period, data, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT (property_id, period)
    DO UPDATE SET data = excluded.data, updated_at = datetime('now')
  `).run(propertyId, period, JSON.stringify(data));
}

export function deletePeriod(propertyId: number, period: string): void {
  db().prepare('DELETE FROM periods WHERE property_id = ? AND period = ?').run(propertyId, period);
}
