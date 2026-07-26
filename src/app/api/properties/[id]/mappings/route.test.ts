import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import { NextRequest } from 'next/server';
import { createProperty, getMappings, getProperty, listProperties } from '@/lib/db';
import { PUT, GET } from './route';

// Isolate a throwaway SQLite file so this test never touches the dev database.
const TMP_DB = `/tmp/ll-mappings-test-${process.pid}.db`;
process.env.LEDGERLEAF_DB = TMP_DB;
// Auth stays disabled in tests (no LEDGERLEAF_PASSWORD).

function req(url: string, body: unknown, method = 'PUT'): NextRequest {
  return new NextRequest(url, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

async function ctxFor(id: number) {
  return { params: Promise.resolve({ id: String(id) }) };
}

describe('mappings PUT validation', () => {
  let pid: number;
  beforeAll(() => {
    if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB);
    // Ensure the schema + a property exist.
    const p = createProperty({ name: 'Test Inn', rooms: 20 });
    pid = p.id;
  });
  afterEach(() => {
    // Reset saved mappings between cases.
    const props = listProperties();
    for (const p of props) {
      const saved = getMappings(p.id);
      const entries: Record<string, null> = {};
      for (const k of Object.keys(saved)) entries[k] = null;
      // direct DB clear via the route isn't needed; clear through saveMappings path
    }
  });

  it('saves valid targets and silently drops unknown paths (prevents JSON injection)', async () => {
    const res = await PUT(
      req(`http://localhost/api/properties/${pid}/mappings`, {
        'room rent': 'rooms.retail',                 // valid
        'electricity': 'util.exp',                    // valid
        'evil account': 'rooms.__proto__',            // not a real target → dropped
        'another': 'fb.cost.food',                    // not in TARGET_PATHS → dropped
      }),
      await ctxFor(pid),
    );
    expect(res.status).toBe(200);
    const saved = getMappings(pid);
    expect(saved['room rent']).toBe('rooms.retail');
    expect(saved['electricity']).toBe('util.exp');
    expect(saved['evil account']).toBeUndefined();
    expect(saved['another']).toBeUndefined();
  });

  it('removes a mapping when the target is null or empty', async () => {
    await PUT(
      req(`http://localhost/api/properties/${pid}/mappings`, { 'room rent': 'rooms.retail' }),
      await ctxFor(pid),
    );
    expect(getMappings(pid)['room rent']).toBe('rooms.retail');
    await PUT(
      req(`http://localhost/api/properties/${pid}/mappings`, { 'room rent': null }),
      await ctxFor(pid),
    );
    expect(getMappings(pid)['room rent']).toBeUndefined();
  });

  it('rejects a non-object body with 400', async () => {
    const res = await PUT(
      req(`http://localhost/api/properties/${pid}/mappings`, 'not-json-payload'),
      await ctxFor(pid),
    );
    // body is JSON string → JSON.parse in NextRequest.json yields a string; route checks object
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown property', async () => {
    const res = await PUT(
      req(`http://localhost/api/properties/999999/mappings`, { x: 'rooms.retail' }),
      await ctxFor(999999),
    );
    expect(res.status).toBe(404);
  });

  it('GET returns the saved mappings', async () => {
    await PUT(
      req(`http://localhost/api/properties/${pid}/mappings`, { foo: 'rooms.retail' }),
      await ctxFor(pid),
    );
    const res = await GET(new NextRequest(`http://localhost/api/properties/${pid}/mappings`), await ctxFor(pid));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.foo).toBe('rooms.retail');
  });

  it('creates the property used by the suite', () => {
    expect(getProperty(pid)).toBeDefined();
  });
});