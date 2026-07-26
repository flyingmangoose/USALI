import { NextRequest, NextResponse } from 'next/server';
import { getProperty, listDailyStats, upsertDailyStat, DailyStat } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function sanitize(v: unknown): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id } = await ctx.params;
  if (!getProperty(Number(id))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(listDailyStats(Number(id)));
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id } = await ctx.params;
  if (!getProperty(Number(id))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.date !== 'string' || !isValidDate(body.date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  const s: DailyStat = {
    date: body.date,
    sold: sanitize(body.sold),
    comps: sanitize(body.comps),
    houseUse: sanitize(body.houseUse),
    noShow: sanitize(body.noShow),
  };
  upsertDailyStat(Number(id), s);
  return NextResponse.json({ ok: true, ...s });
}