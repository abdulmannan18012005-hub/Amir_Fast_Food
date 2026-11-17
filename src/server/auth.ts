import crypto from 'crypto';
import { getRequestIP, getRequestHeaders } from '@tanstack/react-start/server';
import { checkRateLimit } from './rateLimit';
import { UserFacingError } from './errors';

// Persistent tracking with in-memory lock fallback
const attempts = new Map<string, { count: number; lockUntil: number }>();
// In-memory revoked tokens blacklist
const revokedTokens = new Set<string>();

export function getClientIp(): string {
  try {
    const headers = getRequestHeaders() as any;

    // 1. Vercel-specific header
    const vercelForwarded = headers['x-vercel-forwarded-for'];
    if (vercelForwarded) {
      const first = String(vercelForwarded).split(',')[0]?.trim();
      if (first) return first;
    }

    // 2. Standard x-forwarded-for
    const xForwarded = headers['x-forwarded-for'];
    if (xForwarded) {
      const first = String(xForwarded).split(',')[0]?.trim();
      if (first) return first;
    }

    // 3. x-real-ip
    const realIp = headers['x-real-ip'];
    if (realIp) return String(realIp).trim();

    // 4. TanStack's getRequestIP
    const ip = getRequestIP();
    if (ip) return ip;

    // 5. Hashed fingerprint as last resort (unique per UA + accept-language)
    const ua = headers['user-agent'] || '';
    const lang = headers['accept-language'] || '';
    const hash = crypto.createHash('sha256').update(`${ua}|${lang}`).digest('hex').slice(0, 16);
    return `fp_${hash}`;
  } catch {
    // If not in request context, create a fingerprint from whatever is available
    return `fp_${crypto.randomBytes(8).toString('hex')}`;
  }
}

export function getAdminCredential(): string {
  const credential = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PIN;
  if (!credential) {
    throw new UserFacingError(
      'Admin access is not configured on the server. Please set ADMIN_PASSPHRASE or ADMIN_PIN in environment variables.',
      'auth'
    );
  }
  return String(credential).replace(/^["']|["']$/g, '').trim();
}

function getAdminSigningKey(): Buffer {
  const credential = getAdminCredential();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new UserFacingError(
      'Admin server secret missing. Please configure SUPABASE_SERVICE_ROLE_KEY or ADMIN_SESSION_SECRET.',
      'auth'
    );
  }
  return crypto.createHmac('sha256', secret).update(`admin-session|${credential}`).digest();
}

/**
 * Constant-time timing-safe string comparison.
 * Hashes inputs with SHA-256 first so buffer lengths are always identical (32 bytes),
 * preventing string-length timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const hashA = crypto.createHash('sha256').update(String(a)).digest();
    const hashB = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  } catch {
    return false;
  }
}

export function signAdminToken(): string {
  const payload = {
    role: 'admin',
    exp: Date.now() + 12 * 3600 * 1000, // 12 hours max
    nonce: crypto.randomBytes(8).toString('hex')
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getAdminSigningKey()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function revokeAdminToken(token?: string): void {
  if (token && typeof token === 'string') {
    revokedTokens.add(token);
    // Limit memory size of revoked set
    if (revokedTokens.size > 2000) {
      const firstEntry = revokedTokens.values().next().value;
      if (firstEntry) revokedTokens.delete(firstEntry);
    }
  }
}

export function verifyAdminToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  if (revokedTokens.has(token)) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;

  try {
    const expectedSig = crypto.createHmac('sha256', getAdminSigningKey()).update(payloadB64).digest('base64url');
    if (!timingSafeCompare(sig, expectedSig)) return false;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload || payload.role !== 'admin' || typeof payload.exp !== 'number') return false;
    if (payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function requireAdmin(tokenOrPin?: string): boolean {
  if (!tokenOrPin) {
    throw new UserFacingError('Admin authorization required. Please enter your passphrase or PIN.', 'auth');
  }

  if (tokenOrPin.includes('.')) {
    if (verifyAdminToken(tokenOrPin)) return true;
    throw new UserFacingError('Your session has expired. Please log in again.', 'auth');
  }

  return verifyAdminPin(tokenOrPin);
}

export function verifyAdminPin(providedPin?: string): boolean {
  const expected = getAdminCredential();

  if (!providedPin) {
    throw new UserFacingError('Passphrase / PIN is required. Please enter your admin credentials.', 'auth');
  }

  const ip = getClientIp();
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, lockUntil: 0 };

  if (record.lockUntil > now) {
    const remainingMins = Math.ceil((record.lockUntil - now) / 60000);
    throw new UserFacingError(`Too many failed attempts. Please wait ${remainingMins} minute(s) and try again.`, 'rate_limited');
  }

  const unquotedExpected = expected.replace(/^["']|["']$/g, '').trim();
  const providedStr = String(providedPin).replace(/^["']|["']$/g, '').trim();

  const isMatch = timingSafeCompare(expected, providedStr) ||
                  timingSafeCompare(unquotedExpected, providedStr);

  if (isMatch) {
    attempts.delete(ip);
    return true;
  } else {
    record.count++;
    if (record.count >= 5) {
      record.lockUntil = now + 15 * 60 * 1000; // 15-minute lockout
      record.count = 0;
    }
    attempts.set(ip, record);

    // Call persistent rate limiter asynchronously (non-blocking failure log)
    checkRateLimit(ip, 'admin_auth_fail', 5, 15 * 60 * 1000).catch(() => {});

    throw new UserFacingError('Incorrect passphrase or PIN. Please try again.', 'auth');
  }
}
