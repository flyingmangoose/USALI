import { beforeAll, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';

// Fully isolated in-memory DB: we point LEDGERLEAF_DB at a throwaway file and
// import the app's db module, which builds its schema on first use.
const TMP_DB = `/tmp/ll-db-test-${process.pid}.db`;

describe('listLatestKpis / portfolioKpiStats (regression: SQL alias on *)', () => {
  let createProperty: typeof import('./db').createProperty;
  let listLatestKpis: typeof import('./db').listLatestKpis;
  let portfolioKpiStats: typeof import('./db').portfolioKpiStats;
  let upsertPeriodWithKpis: typeof import('./db').upsertPeriodWithKpis;
  let calcAll: typeof import('./engine').calcAll;
  let emptyPeriodData: typeof import('./engine').emptyPeriodData;
  let daysInPeriod: typeof import('./fiscal').daysInPeriod;

  beforeAll(async () => {
    // Reset any singleton from other test files by pointing the env at a fresh
    // throwaway file before the db module is imported in this file's context.
    process.env.LEDGERLEAF_DB = TMP_DB;
    const fs = await import('fs');
    if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB);
    const db = await import('./db');
    createProperty = db.createProperty;
    listLatestKpis = db.listLatestKpis;
    portfolioKpiStats = db.portfolioKpiStats;
    upsertPeriodWithKpis = db.upsertPeriodWithKpis;
    const eng = await import('./engine');
    calcAll = eng.calcAll;
    emptyPeriodData = eng.emptyPeriodData;
    const fisc = await import('./fiscal');
    daysInPeriod = fisc.daysInPeriod;
  });

  it('returns properties with null KPIs when no periods exist (no SQL error)', () => {
    const p = createProperty({ name: 'Test Inn', rooms: 20 });
    const rows = listLatestKpis();
    const mine = rows.find(r => r.property.id === p.id);
    expect(mine).toBeDefined();
    expect(mine!.property.name).toBe('Test Inn');
    expect(mine!.kpi).toBeNull();
  });

  it('returns the latest KPI row once a period is upserted', () => {
    const p = createProperty({ name: 'KPI Hotel', rooms: 20 });
    const data = emptyPeriodData();
    data.rooms.retail = 100000;
    data.stats.sold = 200;
    const totals = calcAll(data, 20 * daysInPeriod('2026-01'));
    upsertPeriodWithKpis(p.id, '2026-01', data, totals);
    const rows = listLatestKpis();
    const mine = rows.find(r => r.property.id === p.id);
    expect(mine!.kpi).not.toBeNull();
    expect(mine!.kpi!.period).toBe('2026-01');
    expect(mine!.kpi!.totalRev).toBeGreaterThan(0);
  });

  it('portfolioKpiStats reports medians once a period exists', () => {
    const rows = listLatestKpis();
    const withData = rows.filter(r => r.kpi);
    expect(withData.length).toBeGreaterThan(0);
    const stats = portfolioKpiStats(withData[0].property.id);
    expect(stats.count).toBe(1);
    expect(stats.medianRevpar).not.toBeNull();
  });

  it('in-memory DB sanity (better-sqlite3 loads)', () => {
    const mem = new Database(':memory:');
    mem.exec('CREATE TABLE t(x INTEGER)');
    mem.prepare('INSERT INTO t VALUES (?)').run(42);
    expect(mem.prepare('SELECT x FROM t').get()).toEqual({ x: 42 });
    mem.close();
  });
});