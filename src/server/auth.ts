import crypto from 'crypto';
import { getRequestIP, getRequestHeaders } from '@tanstack/react-start/server';
import { checkRateLimit } from './rateLimit';

const attempts = new Map<string, { count: number, lockUntil: number }>();

export function getClientIp(): string {
  try {
    const headers = getRequestHeaders() as any;
    const xForwarded = headers['x-forwarded-for'];
    if (xForwarded) {
      const parts = String(xForwarded).split(',');
      if (parts[0]) return parts[0].trim();
    }
    const ip = getRequestIP();
    if (ip) return ip;
  } catch (e) {
    // Ignore error if not called in request context
  }
  return 'global_ip_fallback';
}

export function verifyAdminPin(providedPin?: string): boolean {
  if (!providedPin) throw new Error('Unauthorized: PIN is required');

  const ip = getClientIp();
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, lockUntil: 0 };

  if (record.lockUntil > now) {
    throw new Error('Too many failed attempts. Try again in 60 seconds.');
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
    throw new Error('Unauthorized: Invalid PIN');
  }
}
