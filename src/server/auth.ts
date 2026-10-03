import crypto from 'crypto';

const attempts = new Map<string, { count: number, lockUntil: number }>();

export function getClientIp(): string {
  // best-effort IP (hard in SSR without req object directly)
  return 'global_ip_fallback';
}

export function verifyAdminPin(providedPin?: string): boolean {
  if (!providedPin) throw new Error('PIN is required');

  const ip = getClientIp();
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, lockUntil: 0 };

  if (record.lockUntil > now) {
    throw new Error('Too many failed attempts. Try again in 60 seconds.');
  }

  const expectedPin = process.env.ADMIN_PIN || '7864';
  
  // Constant time comparison
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
