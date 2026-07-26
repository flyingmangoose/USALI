import { NextRequest, NextResponse } from 'next/server';
import { authEnabled, isAuthenticated } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next(); // local dev: open
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api');
  if (await isAuthenticated(req)) return NextResponse.next();
  if (isApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Page request — bounce to login.
  const next = encodeURIComponent(pathname + req.nextUrl.search);
  return NextResponse.redirect(new URL(`/login?next=${next}`, req.url));
}

export const config = {
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};