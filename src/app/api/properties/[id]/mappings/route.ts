import { NextRequest, NextResponse } from 'next/server';
import { getMappings, getProperty, saveMappings } from '@/lib/db';
import { TARGET_PATHS } from '@/lib/importer';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!getProperty(Number(id))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(getMappings(Number(id)));
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!getProperty(Number(id))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const entries: Record<string, string | null> = {};
  for (const [account, target] of Object.entries(body as Record<string, unknown>)) {
    if (target === null || target === '') entries[account] = null;
    else if (typeof target === 'string' && TARGET_PATHS.has(target)) entries[account] = target;
  }
  saveMappings(Number(id), entries);
  return NextResponse.json(getMappings(Number(id)));
}
