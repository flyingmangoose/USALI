import { NextRequest, NextResponse } from 'next/server';
import { getProperty, listPeriods } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!getProperty(Number(id))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(listPeriods(Number(id)));
}
