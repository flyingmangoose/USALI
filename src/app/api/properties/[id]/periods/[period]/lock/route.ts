import { NextRequest, NextResponse } from 'next/server';
import { getProperty, setPeriodLocked } from '@/lib/db';
import { isValidPeriod } from '@/lib/fiscal';
import { requireAuth } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string; period: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id, period } = await ctx.params;
  if (!isValidPeriod(period)) return NextResponse.json({ error: 'period must be YYYY-MM' }, { status: 400 });
  if (!getProperty(Number(id))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  setPeriodLocked(Number(id), period, !!body.locked);
  return NextResponse.json({ ok: true, locked: !!body.locked });
}