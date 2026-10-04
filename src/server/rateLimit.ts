// In-memory token bucket rate limiter (best effort per serverless instance)

const store = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(ip: string, action: string, limit: number, windowMs: number): boolean {
  const key = `${ip}:${action}`;
  const now = Date.now();
  
  const record = store.get(key);
  if (!record || record.expiresAt < now) {
    store.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count += 1;
  store.set(key, record);
  return true;
}

// Global cleanup every minute to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.expiresAt < now) {
      store.delete(key);
    }
  }
}, 60000).unref();
