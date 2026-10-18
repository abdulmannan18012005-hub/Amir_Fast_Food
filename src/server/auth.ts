import crypto from 'crypto';
import { getRequestIP, getRequestHeaders } from '@tanstack/react-start/server';
import { checkRateLimit } from './rateLimit';
import { UserFacingError } from './errors';

const attempts = new Map<string, { count: number, lockUntil: number }>();

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
  } catch (e) {
    // If not in request context, create a fingerprint from whatever is available
    return `fp_${crypto.randomBytes(8).toString('hex')}`;
  }
}

function getAdminSigningKey(): Buffer {
  const pin = process.env.ADMIN_PIN || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'aff-admin-secret-key-salt-32-chars-long';
  return crypto.createHmac('sha256', serviceKey).update(`admin-session|${pin}`).digest();
}

export function signAdminToken(): string {
  const payload = {
    role: 'admin',
    exp: Date.now() + 12 * 3600 * 1000 // 12 hours
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getAdminSigningKey()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyAdminToken(token: string): boolean {
  if (!process.env.ADMIN_PIN) return false;
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  try {
    const expectedSig = crypto.createHmac('sha256', getAdminSigningKey()).update(payloadB64).digest('base64url');
    if (expectedSig.length !== sig.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload || payload.role !== 'admin' || typeof payload.exp !== 'number') return false;
    if (payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function requireAdmin(tokenOrPin?: string): boolean {
  if (!process.env.ADMIN_PIN) {
    console.warn('[AUTH] Admin is not configured.');
    throw new UserFacingError('Admin is not configured.', 'auth');
  }
  if (!tokenOrPin) {
    throw new UserFacingError('PIN is required. Please enter your admin PIN.', 'auth');
  }
  if (tokenOrPin.includes('.')) {
    if (verifyAdminToken(tokenOrPin)) return true;
    throw new UserFacingError('Your session has expired. Please enter the PIN again.', 'auth');
  }
  return verifyAdminPin(tokenOrPin);
}

export function verifyAdminPin(providedPin?: string): boolean {
  if (!process.env.ADMIN_PIN) {
    console.warn('[AUTH] Admin is not configured.');
    throw new UserFacingError('Admin is not configured.', 'auth');
  }

  if (!providedPin) {
    throw new UserFacingError('PIN is required. Please enter your admin PIN.', 'auth');
  }

  const ip = getClientIp();
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, lockUntil: 0 };

  if (record.lockUntil > now) {
    throw new UserFacingError('Too many attempts. Please wait 15 minutes and try again.', 'rate_limited');
  }

  const expectedPin = process.env.ADMIN_PIN;

  let isMatch = false;
  try {
    const expectedBuffer = Buffer.from(expectedPin);
    const providedBuffer = Buffer.from(String(providedPin));
    if (expectedBuffer.length === providedBuffer.length) {
      isMatch = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    }
  } catch (e) {
    isMatch = false;
  }

  if (isMatch) {
    attempts.delete(ip);
    return true;
  } else {
    record.count++;
    if (record.count >= 5) {
      record.lockUntil = now + 15 * 60 * 1000; // 15 minutes lock
      record.count = 0;
    }
    attempts.set(ip, record);
    throw new UserFacingError('Incorrect PIN. Please try again.', 'auth');
  }
}
