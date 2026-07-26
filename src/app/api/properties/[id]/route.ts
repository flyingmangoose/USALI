import { NextRequest, NextResponse } from 'next/server';
import { getProperty, updateProperty, deleteProperty } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const SUPPORTED_CCY = new Set(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'LKR', 'NPR']);

function parseRooms(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return undefined; // reject junk / negatives silently by dropping
  return n;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id } = await ctx.params;
  const p = getProperty(Number(id));
  return p ? NextResponse.json(p) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const p = updateProperty(Number(id), {
    name: typeof body.name === 'string' ? body.name.trim() : undefined,
    city: typeof body.city === 'string' ? body.city.trim() : undefined,
    rooms: body.rooms !== undefined ? parseRooms(body.rooms) : undefined,
    ccy: typeof body.ccy === 'string' && SUPPORTED_CCY.has(body.ccy) ? body.ccy : undefined,
  });
  return p ? NextResponse.json(p) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id } = await ctx.params;
  deleteProperty(Number(id));
  return NextResponse.json({ ok: true });
}