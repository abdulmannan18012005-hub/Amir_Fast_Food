import { getSupabaseServer } from '../lib/supabase';
import { UserFacingError } from './errors';

export interface RateLimitOptions {
  /**
   * When true (default), fail closed if PostgreSQL rate-limit RPC is missing or errors,
   * instead of falling back to transient serverless in-memory state.
   */
  strict?: boolean;
}

const memoryFallbackStore = new Map<string, { count: number; expiresAt: number }>();

function checkMemoryFallback(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  if (memoryFallbackStore.size > 2000) {
    for (const [k, v] of memoryFallbackStore.entries()) {
      if (v.expiresAt < now) memoryFallbackStore.delete(k);
    }
  }
  const existing = memoryFallbackStore.get(key);
  if (!existing || existing.expiresAt < now) {
    memoryFallbackStore.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }
  existing.count += 1;
  return existing.count <= maxRequests;
}

function isMissingRpcError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === '42883' ||
    code === '42P01' ||
    code === 'PGRST202' ||
    msg.includes('could not find the function') ||
    msg.includes('does not exist')
  );
}

/**
 * Atomic persistent rate limit check via Supabase RPC `rate_limit_hit`.
 * Returns `true` if allowed, `false` if limit exceeded.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests = 5,
  windowMs = 60000,
  options: RateLimitOptions = {}
): Promise<boolean> {
  const strict = options.strict !== false;
  const key = `${action}:${identifier}`;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.rpc('rate_limit_hit', {
      p_key: key,
      p_limit: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      if (!strict && isMissingRpcError(error)) {
        return checkMemoryFallback(key, maxRequests, windowMs);
      }
      console.error('[checkRateLimit] DB error:', error);
      throw new UserFacingError(
        'Security rate-limit storage is unavailable. Please apply the latest security database migration.',
        'db_migration_needed'
      );
    }

    if (typeof data !== 'boolean') {
      throw new UserFacingError(
        'Invalid rate-limit response from database.',
        'db_migration_needed'
      );
    }

    return data;
  } catch (err: any) {
    if (err instanceof UserFacingError) throw err;
    console.error('[checkRateLimit] Unexpected error:', err);
    if (!strict) {
      return checkMemoryFallback(key, maxRequests, windowMs);
    }
    throw new UserFacingError(
      'Unable to verify request rate limit. Please try again shortly.',
      'db_migration_needed'
    );
  }
}

/**
 * Read-only lockout status check without incrementing attempt count.
 * Returns `true` when blocked.
 */
export async function isRateLimited(
  key: string,
  maxRequests = 5,
  options: RateLimitOptions = {}
): Promise<boolean> {
  const strict = options.strict !== false;
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.rpc('rate_limit_is_blocked', {
      p_key: key,
      p_limit: maxRequests,
    });

    if (error) {
      if (!strict && isMissingRpcError(error)) {
        const rec = memoryFallbackStore.get(key);
        return Boolean(rec && rec.expiresAt >= Date.now() && rec.count >= maxRequests);
      }
      console.error('[isRateLimited] DB error:', error);
      throw new UserFacingError(
        'Security rate-limit storage is unavailable. Please apply the latest security database migration.',
        'db_migration_needed'
      );
    }

    return Boolean(data);
  } catch (err: any) {
    if (err instanceof UserFacingError) throw err;
    console.error('[isRateLimited] Unexpected error:', err);
    if (!strict) return false;
    throw new UserFacingError(
      'Unable to verify lockout status. Please try again shortly.',
      'db_migration_needed'
    );
  }
}

/**
 * Clears a rate-limit counter (e.g. after successful admin PIN login).
 */
export async function resetRateLimit(key: string): Promise<void> {
  memoryFallbackStore.delete(key);
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.rpc('rate_limit_reset', { p_key: key });
    if (error && !isMissingRpcError(error)) {
      console.error('[resetRateLimit] DB error:', error);
    }
  } catch (err) {
    console.error('[resetRateLimit] Unexpected error:', err);
  }
}
