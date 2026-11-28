import crypto from 'crypto';
import {
  getCookie,
  setCookie,
  deleteCookie,
  getRequestHeader,
  getRequestHost,
  getRequestProtocol,
  getRequestIP,
} from '@tanstack/react-start/server';
import { getSupabaseServer } from '../lib/supabase';
import { checkRateLimit, isRateLimited, resetRateLimit } from './rateLimit';
import { UserFacingError } from './errors';

export const ADMIN_SESSION_COOKIE = 'amir_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours
const ADMIN_PIN_MAX_ATTEMPTS = 5;
const ADMIN_PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function getAdminCredential(): { pin: string; secret: string } {
  const pin = (process.env.ADMIN_PIN || '').trim();
  if (!pin || pin.length < 4) {
    throw new Error('Server misconfigured: ADMIN_PIN environment variable is missing or weak.');
  }
  const secret = (process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!secret || secret.length < 16) {
    throw new Error('Server misconfigured: ADMIN_SESSION_SECRET or service key missing for session signing.');
  }
  return { pin, secret };
}

export function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getClientIp(req?: Request): string {
  try {
    if (req) {
      const forwarded = req.headers.get('x-forwarded-for');
      if (forwarded) return forwarded.split(',')[0].trim();
      const realIp = req.headers.get('x-real-ip');
      if (realIp) return realIp.trim();
    }
  } catch {}

  try {
    const forwarded = getRequestHeader('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIp = getRequestHeader('x-real-ip');
    if (realIp) return realIp.trim();
    const ip = getRequestIP({ xForwardedFor: true });
    if (ip) return ip;
  } catch {}

  return 'unknown';
}

/**
 * Verifies same-origin for cookie-authenticated admin requests when Origin/Referer headers are present.
 */
export function assertSameOriginRequest(): void {
  try {
    const host = (getRequestHost({ xForwardedHost: true }) || '').toLowerCase();
    if (!host) return;
    const origin = getRequestHeader('origin');
    if (origin) {
      const originHost = new URL(origin).host.toLowerCase();
      if (originHost !== host) {
        throw new UserFacingError('Cross-origin admin request blocked.', 'unauthorized');
      }
      return;
    }
    const referer = getRequestHeader('referer');
    if (referer) {
      const refHost = new URL(referer).host.toLowerCase();
      if (refHost !== host) {
        throw new UserFacingError('Cross-origin admin request blocked.', 'unauthorized');
      }
    }
  } catch (err: any) {
    if (err instanceof UserFacingError) throw err;
  }
}

export async function verifyAdminPinDetailed(
  pin?: string,
  clientIp?: string
): Promise<{ ok: boolean; blocked?: boolean; error?: string }> {
  const ip = clientIp || getClientIp();
  const lockKey = `admin_login:${ip}`;

  const locked = await isRateLimited(lockKey, ADMIN_PIN_MAX_ATTEMPTS, { strict: true });
  if (locked) {
    return {
      ok: false,
      blocked: true,
      error: 'Too many invalid PIN attempts. Admin login is locked for 15 minutes.',
    };
  }

  let expectedPin = '';
  try {
    expectedPin = getAdminCredential().pin;
  } catch {
    return { ok: false, error: 'Admin authentication is not configured on the server.' };
  }

  if (typeof pin === 'string' && timingSafeCompare(pin.trim(), expectedPin)) {
    await resetRateLimit(lockKey);
    return { ok: true };
  }

  const stillAllowed = await checkRateLimit(
    ip,
    'admin_login',
    ADMIN_PIN_MAX_ATTEMPTS,
    ADMIN_PIN_LOCKOUT_MS,
    { strict: true }
  );
  if (!stillAllowed) {
    return {
      ok: false,
      blocked: true,
      error: 'Too many invalid PIN attempts. Admin login is locked for 15 minutes.',
    };
  }

  return { ok: false, error: 'Incorrect PIN.' };
}

export async function verifyAdminPin(pin?: string, clientIp?: string): Promise<boolean> {
  const res = await verifyAdminPinDetailed(pin, clientIp);
  return res.ok;
}

function buildSignedTokenPayload(): { token: string; expiresAtIso: string; tokenHash: string } {
  const { secret } = getAdminCredential();
  const exp = Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000;
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp, nonce })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const token = `${payload}.${sig}`;
  return {
    token,
    expiresAtIso: new Date(exp).toISOString(),
    tokenHash: hashSessionToken(token),
  };
}

function verifyTokenCrypto(token: string): boolean {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;

  try {
    const { secret } = getAdminCredential();
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (!timingSafeCompare(sig, expectedSig)) return false;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.role !== 'admin') return false;
    if (typeof decoded.exp !== 'number' || decoded.exp <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function createAdminSession(): Promise<{ token: string; expiresAt: string }> {
  const { token, expiresAtIso, tokenHash } = buildSignedTokenPayload();
  const supabase = getSupabaseServer();
  const { error } = await supabase.from('admin_sessions').insert({
    token_hash: tokenHash,
    expires_at: expiresAtIso,
  });

  if (error) {
    console.error('[createAdminSession] DB insert error:', error);
    throw new UserFacingError(
      'Unable to persist admin session. Please apply the latest database security migration.',
      'db_migration_needed'
    );
  }

  return { token, expiresAt: expiresAtIso };
}

export function setAdminSessionCookie(token: string, maxAgeSeconds = ADMIN_SESSION_TTL_SECONDS): void {
  try {
    let isSecure = process.env.NODE_ENV === 'production';
    try {
      const proto = getRequestProtocol({ xForwardedProto: true });
      const host = (getRequestHost({ xForwardedHost: true }) || '').toLowerCase();
      if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
        isSecure = proto === 'https';
      } else if (proto) {
        isSecure = proto === 'https';
      }
    } catch {}

    setCookie(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecure,
      maxAge: maxAgeSeconds,
    });
  } catch (err) {
    console.error('[setAdminSessionCookie] Failed:', err);
  }
}

export function clearAdminSessionCookie(): void {
  try {
    deleteCookie(ADMIN_SESSION_COOKIE, { path: '/' });
  } catch {}
}

export function getAdminCookieToken(): string | undefined {
  try {
    return getCookie(ADMIN_SESSION_COOKIE);
  } catch {
    return undefined;
  }
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  if (!verifyTokenCrypto(token)) return false;
  try {
    const supabase = getSupabaseServer();
    const tokenHash = hashSessionToken(token);
    const { data, error } = await supabase
      .from('admin_sessions')
      .select('token_hash, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      console.error('[verifyAdminToken] DB error:', error);
      return false;
    }
    if (!data || data.revoked_at) return false;
    if (new Date(data.expires_at).getTime() <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function revokeAdminToken(token?: string): Promise<void> {
  if (!token) return;
  try {
    const supabase = getSupabaseServer();
    const tokenHash = hashSessionToken(token);
    const { error } = await supabase
      .from('admin_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('revoked_at', null);

    if (error) {
      console.error('[revokeAdminToken] DB error:', error);
    }
  } catch (err) {
    console.error('[revokeAdminToken] Unexpected error:', err);
  }
}

export async function requireAdmin(tokenOrPin?: string): Promise<boolean> {
  const cookieToken = getAdminCookieToken();
  if (cookieToken) {
    assertSameOriginRequest();
    if (await verifyAdminToken(cookieToken)) {
      return true;
    }
  }

  if (tokenOrPin && tokenOrPin.includes('.')) {
    if (await verifyAdminToken(tokenOrPin)) {
      return true;
    }
  }

  if (tokenOrPin && !tokenOrPin.includes('.')) {
    if (await verifyAdminPin(tokenOrPin, getClientIp())) {
      return true;
    }
  }

  throw new UserFacingError('Unauthorized: Invalid or expired Admin Session', 'unauthorized');
}
