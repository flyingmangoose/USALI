import { NextRequest, NextResponse } from 'next/server';
import { listProperties, createProperty } from '@/lib/db';

export async function GET() {
  return NextResponse.json(listProperties());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const p = createProperty({
    name: body.name.trim(),
    city: typeof body.city === 'string' ? body.city.trim() : '',
    rooms: Number(body.rooms) || 0,
    ccy: typeof body.ccy === 'string' && body.ccy ? body.ccy : 'INR',
  });
  return NextResponse.json(p, { status: 201 });
}
