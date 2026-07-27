import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { seedDemoData } from '@/lib/seed';

/** POST /api/seed — load the demo property + six months of USALI data.
 *  Idempotent: if the demo property already exists, nothing is written. */
export async function POST(req: NextRequest) {
  const guard = await requireAuth(req); if (guard) return guard;
  const { property, created } = seedDemoData();
  return NextResponse.json({ id: property.id, name: property.name, created }, { status: created ? 201 : 200 });
}