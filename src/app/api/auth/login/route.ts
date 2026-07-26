import { NextRequest, NextResponse } from 'next/server';
import { authEnabled, checkPassword, createToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!authEnabled()) {
    // Auth disabled in this environment — return a session anyway so the UI flow is uniform.
    const token = await createToken();
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    return res;
  }
  const body = await req.json().catch(() => ({}));
  const pw = typeof body.password === 'string' ? body.password : '';
  if (!(await checkPassword(pw))) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }
  const token = await createToken();
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, token);
  return res;
}