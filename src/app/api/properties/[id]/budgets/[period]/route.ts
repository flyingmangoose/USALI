import { NextRequest, NextResponse } from 'next/server';
import { deleteBudget, getBudget, getProperty, upsertBudget } from '@/lib/db';
import { normalizePeriodData } from '@/lib/engine';
import { isValidPeriod } from '@/lib/fiscal';
import { requireAuth } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string; period: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id, period } = await ctx.params;
  if (!getProperty(Number(id))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const data = getBudget(Number(id), period);
  return data ? NextResponse.json({ period, data }) : NextResponse.json({ error: 'no budget' }, { status: 404 });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id, period } = await ctx.params;
  if (!isValidPeriod(period)) return NextResponse.json({ error: 'period must be YYYY-MM' }, { status: 400 });
  if (!getProperty(Number(id))) return NextResponse.json({ error: 'property not found' }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const data = normalizePeriodData(body);
  upsertBudget(Number(id), period, data);
  return NextResponse.json({ ok: true, period, data });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id, period } = await ctx.params;
  deleteBudget(Number(id), period);
  return NextResponse.json({ ok: true });
}