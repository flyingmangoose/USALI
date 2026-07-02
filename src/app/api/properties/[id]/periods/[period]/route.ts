import { NextRequest, NextResponse } from 'next/server';
import { getProperty, getPeriod, upsertPeriod, deletePeriod } from '@/lib/db';
import { normalizePeriodData } from '@/lib/engine';
import { isValidPeriod } from '@/lib/fiscal';

type Ctx = { params: Promise<{ id: string; period: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id, period } = await ctx.params;
  const row = getPeriod(Number(id), period);
  return row ? NextResponse.json(row) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id, period } = await ctx.params;
  if (!isValidPeriod(period)) return NextResponse.json({ error: 'period must be YYYY-MM' }, { status: 400 });
  if (!getProperty(Number(id))) return NextResponse.json({ error: 'property not found' }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const data = normalizePeriodData(body);
  upsertPeriod(Number(id), period, data);
  return NextResponse.json({ ok: true, period, data });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id, period } = await ctx.params;
  deletePeriod(Number(id), period);
  return NextResponse.json({ ok: true });
}
