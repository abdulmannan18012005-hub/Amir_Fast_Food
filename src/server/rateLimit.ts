import { getSupabaseServer } from '../lib/supabase';

// In-memory token bucket fallback (per instance)
const inMemoryStore = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimitInMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = inMemoryStore.get(key);
  if (!record || record.expiresAt < now) {
    inMemoryStore.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  inMemoryStore.set(key, record);
  return true;
}

export async function checkRateLimit(
  keyIdentifier: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const key = `${keyIdentifier}:${action}`;
  const windowSeconds = Math.max(1, Math.round(windowMs / 1000));

  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.rpc('rate_limit_hit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (!error && typeof data === 'boolean') {
      return data;
    }

    if (error) {
      console.warn(`[RateLimit] RPC 'rate_limit_hit' unavailable (${error.message}); using in-memory limiter.`);
    }
  } catch (err: any) {
    console.warn(`[RateLimit] RPC 'rate_limit_hit' failed (${err?.message || err}); using in-memory limiter.`);
  }

  // Graceful fallback to in-memory store
  return checkRateLimitInMemory(key, limit, windowMs);
}

// Global cleanup every minute for in-memory fallback store
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of inMemoryStore.entries()) {
    if (record.expiresAt < now) {
      inMemoryStore.delete(key);
    }
  }
}, 60000);

if (cleanupTimer && typeof (cleanupTimer as any).unref === 'function') {
  (cleanupTimer as any).unref();
}
