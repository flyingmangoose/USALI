import { NextRequest, NextResponse } from 'next/server';
import { getProperty, getPeriod, upsertPeriodWithKpis, deletePeriod, isPeriodLocked } from '@/lib/db';
import { normalizePeriodData } from '@/lib/engine';
import { calcAll } from '@/lib/engine';
import { isValidPeriod } from '@/lib/fiscal';
import { daysInPeriod } from '@/lib/fiscal';
import { requireAuth } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string; period: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id, period } = await ctx.params;
  const row = getPeriod(Number(id), period);
  return row ? NextResponse.json(row) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id, period } = await ctx.params;
  if (!isValidPeriod(period)) return NextResponse.json({ error: 'period must be YYYY-MM' }, { status: 400 });
  const prop = getProperty(Number(id));
  if (!prop) return NextResponse.json({ error: 'property not found' }, { status: 404 });
  if (isPeriodLocked(Number(id), period)) {
    return NextResponse.json({ error: 'period is locked — unlock it in Property Settings to edit' }, { status: 409 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const data = normalizePeriodData(body);
  const totals = calcAll(data, prop.rooms * daysInPeriod(period));
  upsertPeriodWithKpis(Number(id), period, data, totals);
  return NextResponse.json({ ok: true, period, data });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id, period } = await ctx.params;
  if (isPeriodLocked(Number(id), period)) {
    return NextResponse.json({ error: 'period is locked — unlock before deleting' }, { status: 409 });
  }
  deletePeriod(Number(id), period);
  return NextResponse.json({ ok: true });
}