import { NextRequest, NextResponse } from 'next/server';
import { listProperties, createProperty } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const SUPPORTED_CCY = new Set(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'LKR', 'NPR']);

/** Parse a room count: integer ≥ 0, or undefined when the field is absent. */
function parseRooms(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export async function GET(req: NextRequest) {
  const guard = await requireAuth(req); if (guard) return guard;
  return NextResponse.json(listProperties());
}

export async function POST(req: NextRequest) {
  const guard = await requireAuth(req); if (guard) return guard;
  const body = await req.json().catch(() => null);
  if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const ccy = typeof body.ccy === 'string' && SUPPORTED_CCY.has(body.ccy) ? body.ccy : 'INR';
  const rooms = parseRooms(body.rooms) ?? 0;
  const p = createProperty({
    name: body.name.trim(),
    city: typeof body.city === 'string' ? body.city.trim() : '',
    rooms, ccy,
  });
  return NextResponse.json(p, { status: 201 });
}