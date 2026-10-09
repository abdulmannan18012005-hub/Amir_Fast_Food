import crypto from 'crypto';
import { getRequestIP, getRequestHeaders } from '@tanstack/react-start/server';
import { checkRateLimit } from './rateLimit';

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

export function verifyAdminPin(providedPin?: string): boolean {
  if (!providedPin) {
    const err = new Error('PIN is required. Please enter your admin PIN.');
    (err as any).code = 'auth';
    throw err;
  }

  const ip = getClientIp();
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, lockUntil: 0 };

  if (record.lockUntil > now) {
    const err = new Error('Too many attempts. Please wait one minute and try again.');
    (err as any).code = 'rate_limited';
    throw err;
  }

  const expectedPin = process.env.ADMIN_PIN || '7864';

  let isMatch = false;
  try {
    const expectedBuffer = Buffer.from(expectedPin);
    const providedBuffer = Buffer.from(String(providedPin));
    if (expectedBuffer.length === providedBuffer.length) {
      isMatch = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    }
  } catch(e) {
    isMatch = false;
  }

  if (isMatch) {
    attempts.delete(ip);
    return true;
  } else {
    record.count++;
    if (record.count >= 5) {
      record.lockUntil = now + 60000;
      record.count = 0;
    }
    attempts.set(ip, record);
    const err = new Error('Incorrect PIN. Please try again.');
    (err as any).code = 'auth';
    throw err;
  }
}
