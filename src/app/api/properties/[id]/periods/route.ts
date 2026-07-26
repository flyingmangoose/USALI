import { NextRequest, NextResponse } from 'next/server';
import { getProperty, listPeriods } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id } = await ctx.params;
  if (!getProperty(Number(id))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(listPeriods(Number(id)));
}