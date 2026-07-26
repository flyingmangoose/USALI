/**
 * Lightweight shared-password auth. When LEDGERLEAF_PASSWORD is set, every page
 * and API route requires a signed session cookie; when it's unset, auth is
 * disabled (local dev). The cookie is an HMAC-signed expiry timestamp so the
 * server never stores sessions. Single-tenant today — the authed user sees the
 * whole portfolio; per-property role scoping is the next step when multi-user
 * lands.
 */
import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'll_sess';
const MAX_AGE_DAYS = 30;

export function authEnabled(): boolean {
  return !!process.env.LEDGERLEAF_PASSWORD;
}

function secret(): string {
  return process.env.LEDGERLEAF_SECRET
    ?? (process.env.LEDGERLEAF_PASSWORD ?? 'ledgerleaf-dev-secret');
}

async function hmac(input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  // Hex-encode so this works in the edge middleware runtime too (no Buffer).
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Issue a signed session token: `${expirySeconds}.${signature}`. */
export async function createToken(maxAgeDays = MAX_AGE_DAYS): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + maxAgeDays * 86400;
  const sig = await hmac(String(exp));
  return `${exp}.${sig}`;
}

export async function verifyToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum * 1000 < Date.now()) return false;
  const expected = await hmac(exp);
  // Constant-time-ish compare.
  if (sig.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

export async function checkPassword(pw: string): Promise<boolean> {
  const expected = process.env.LEDGERLEAF_PASSWORD;
  if (!expected) return true; // auth disabled
  if (pw.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < pw.length; i++) mismatch |= pw.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: MAX_AGE_DAYS * 86400,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 });
}

/** Read the cookie off either a NextRequest (API/middleware) — same API. */
export function readSessionToken(req: NextRequest): string | undefined {
  return req.cookies.get(COOKIE)?.value;
}

export async function isAuthenticated(req: NextRequest): Promise<boolean> {
  if (!authEnabled()) return true;
  return verifyToken(readSessionToken(req));
}

/** Guard for API route handlers: returns null when allowed, else a 401 response. */
export async function requireAuth(req: NextRequest): Promise<null | NextResponse> {
  if (await isAuthenticated(req)) return null;
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}