import { NextRequest, NextResponse } from 'next/server';
import { deleteDailyStat } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string; date: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { id, date } = await ctx.params;
  deleteDailyStat(Number(id), date);
  return NextResponse.json({ ok: true });
}