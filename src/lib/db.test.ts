import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import { createProperty, listLatestKpis, portfolioKpiStats, upsertPeriodWithKpis } from '@/lib/db';
import { calcAll, emptyPeriodData } from '@/lib/engine';
import { daysInPeriod } from '@/lib/fiscal';

// Isolate a throwaway SQLite file so this test never touches the dev database.
const TMP_DB = `/tmp/ll-db-test-${process.pid}.db`;
process.env.LEDGERLEAF_DB = TMP_DB;
// Auth stays disabled in tests (no LEDGERLEAF_PASSWORD).

describe('listLatestKpis / portfolioKpiStats', () => {
  let pid: number;
  beforeAll(() => {
    if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB);
    const p = createProperty({ name: 'Test Inn', rooms: 20 });
    pid = p.id;
  });

  it('returns properties with null KPIs when no periods exist (no SQL error)', () => {
    const rows = listLatestKpis();
    expect(rows).toHaveLength(1);
    expect(rows[0].property.name).toBe('Test Inn');
    expect(rows[0].kpi).toBeNull();
  });

  it('returns the latest KPI row once a period is upserted', () => {
    const data = emptyPeriodData();
    data.rooms.retail = 100000;
    data.stats.sold = 200;
    const totals = calcAll(data, 20 * daysInPeriod('2026-01'));
    upsertPeriodWithKpis(pid, '2026-01', data, totals);
    const rows = listLatestKpis();
    expect(rows[0].kpi).not.toBeNull();
    expect(rows[0].kpi!.period).toBe('2026-01');
    expect(rows[0].kpi!.totalRev).toBeGreaterThan(0);
  });

  it('portfolioKpiStats reports medians once a period exists', () => {
    const stats = portfolioKpiStats(pid);
    expect(stats.count).toBe(1);
    expect(stats.medianRevpar).not.toBeNull();
  });
});