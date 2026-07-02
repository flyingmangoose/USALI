import { NextRequest, NextResponse } from 'next/server';
import { getProperty, updateProperty, deleteProperty } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const p = getProperty(Number(id));
  return p ? NextResponse.json(p) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const p = updateProperty(Number(id), {
    name: typeof body.name === 'string' ? body.name.trim() : undefined,
    city: typeof body.city === 'string' ? body.city.trim() : undefined,
    rooms: body.rooms !== undefined ? Number(body.rooms) || 0 : undefined,
    ccy: typeof body.ccy === 'string' ? body.ccy : undefined,
  });
  return p ? NextResponse.json(p) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  deleteProperty(Number(id));
  return NextResponse.json({ ok: true });
}
