import crypto from 'crypto';
import {
  getCookie,
  setCookie,
  getRequestHeader,
  getRequestHost,
  getRequestProtocol,
} from '@tanstack/react-start/server';
import { getSupabaseServer } from '../lib/supabase';
import { MAX_ORDERS_PER_DEVICE_PER_DAY, SHOP_PHONE_LOCAL, getPktDayWindow } from '../lib/shop';
import { UserFacingError } from './errors';
import { getClientIp, timingSafeCompare } from './auth';

export const DEVICE_ID_COOKIE = 'amir_device_id';
const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

function getDeviceSigningSecret(): string {
  const secret = (process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!secret || secret.length < 16) {
    throw new Error('Server configuration error: missing signing secret for device verification.');
  }
  return secret;
}

function signDeviceToken(uuid: string, mintedDay: string, fallbackBlockedOnMint: boolean): string {
  const payload = `${uuid}.${mintedDay}.${fallbackBlockedOnMint ? '1' : '0'}`;
  const sig = crypto.createHmac('sha256', getDeviceSigningSecret()).update(payload).digest('hex').slice(0, 32);
  return `${payload}.${sig}`;
}

export interface ParsedDeviceCookie {
  uuid: string;
  mintedDay: string;
  fallbackBlockedOnMint: boolean;
}

export function verifySignedDeviceCookie(raw?: string | null): ParsedDeviceCookie | null {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.trim().split('.');
  if (parts.length !== 4) return null;
  const [uuid, mintedDay, flag, sig] = parts;
  if (
    !/^[0-9a-f-]{16,64}$/i.test(uuid) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(mintedDay) ||
    (flag !== '0' && flag !== '1') ||
    !/^[0-9a-f]{32}$/i.test(sig)
  ) {
    return null;
  }
  const expectedSig = crypto
    .createHmac('sha256', getDeviceSigningSecret())
    .update(`${uuid}.${mintedDay}.${flag}`)
    .digest('hex')
    .slice(0, 32);

  if (!timingSafeCompare(sig.toLowerCase(), expectedSig.toLowerCase())) {
    return null;
  }
  return {
    uuid,
    mintedDay,
    fallbackBlockedOnMint: flag === '1',
  };
}

function setSignedDeviceCookie(token: string): void {
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

    setCookie(DEVICE_ID_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecure,
      maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS,
    });
  } catch (err) {
    console.error('[setSignedDeviceCookie] Failed:', err);
  }
}

export function computeFallbackDeviceKey(ipOverride?: string): string {
  const ip = (ipOverride || getClientIp() || 'unknown').trim().toLowerCase();
  let ua = '';
  let lang = '';
  let chPlatform = '';
  let chMobile = '';
  try {
    ua = (getRequestHeader('user-agent') || '').trim().toLowerCase().slice(0, 180);
    lang = (getRequestHeader('accept-language') || '').trim().toLowerCase().split(',')[0]?.slice(0, 24) || '';
    chPlatform = (getRequestHeader('sec-ch-ua-platform') || '').trim().toLowerCase().slice(0, 40);
    chMobile = (getRequestHeader('sec-ch-ua-mobile') || '').trim().toLowerCase().slice(0, 12);
  } catch {}
  const hash = crypto
    .createHash('sha256')
    .update(`${ip}|${ua}|${lang}|${chPlatform}|${chMobile}`)
    .digest('hex')
    .slice(0, 40);
  return `fp:${hash}`;
}

export function toDeviceCookieKey(uuid: string): string {
  const hash = crypto.createHash('sha256').update(`cookie:${uuid}`).digest('hex').slice(0, 40);
  return `dev:${hash}`;
}

function isMissingDeviceLimitRpcError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === '42883' ||
    code === '42P01' ||
    code === 'PGRST202' ||
    code === 'PGRST205' ||
    msg.includes('could not find the function') ||
    msg.includes('does not exist')
  );
}

async function readFallbackCountToday(fallbackKey: string, dayKey: string): Promise<number> {
  const supabase = getSupabaseServer();
  try {
    const { data, error } = await supabase
      .from('device_daily_orders')
      .select('order_count')
      .eq('device_key', fallbackKey)
      .eq('day_pkt', dayKey)
      .maybeSingle();

    if (!error) {
      return Number(data?.order_count || 0);
    }
    if (!isMissingDeviceLimitRpcError(error)) {
      return 0;
    }
  } catch {}

  try {
    const { data } = await supabase
      .from('rate_limits')
      .select('count, expires_at')
      .eq('key', `devlimit:${dayKey}:${fallbackKey}`)
      .maybeSingle();
    if (data && data.expires_at && new Date(data.expires_at).getTime() > Date.now()) {
      return Number(data.count || 0);
    }
  } catch {}
  return 0;
}

export async function ensureDeviceCookie(now: Date = new Date()): Promise<{
  deviceKey: string;
  fallbackKey: string;
  hadValidCookie: boolean;
  wasTampered: boolean;
  fallbackBlockedOnMint: boolean;
  dayKey: string;
}> {
  const { dayKey } = getPktDayWindow(now);
  const fallbackKey = computeFallbackDeviceKey();

  let rawCookie: string | undefined;
  try {
    rawCookie = getCookie(DEVICE_ID_COOKIE);
  } catch {
    rawCookie = undefined;
  }

  const parsed = verifySignedDeviceCookie(rawCookie);
  if (parsed) {
    // Reset the mint-block marker once a new PKT calendar day arrives
    const activeFallbackFlag = parsed.mintedDay === dayKey && parsed.fallbackBlockedOnMint;
    if (parsed.mintedDay !== dayKey && parsed.fallbackBlockedOnMint) {
      setSignedDeviceCookie(signDeviceToken(parsed.uuid, dayKey, false));
    }
    return {
      deviceKey: toDeviceCookieKey(parsed.uuid),
      fallbackKey,
      hadValidCookie: true,
      wasTampered: false,
      fallbackBlockedOnMint: activeFallbackFlag,
      dayKey,
    };
  }

  const wasTampered = Boolean(rawCookie && rawCookie.trim().length > 0);
  const fpCount = await readFallbackCountToday(fallbackKey, dayKey);
  const fallbackBlockedOnMint = fpCount >= MAX_ORDERS_PER_DEVICE_PER_DAY;
  const freshUuid = crypto.randomUUID();
  setSignedDeviceCookie(signDeviceToken(freshUuid, dayKey, fallbackBlockedOnMint));

  return {
    deviceKey: toDeviceCookieKey(freshUuid),
    fallbackKey,
    hadValidCookie: false,
    wasTampered,
    fallbackBlockedOnMint,
    dayKey,
  };
}

export interface DeviceOrderQuotaHandle {
  deviceKey: string;
  fallbackKey: string;
  dayKey: string;
  usedTableRpc: boolean;
}

/**
 * Atomically checks and reserves 1 daily order slot for the current device (20/day PKT reset).
 * Throws UserFacingError('device_limit_reached') if limit has been reached.
 */
export async function consumeDeviceDailyOrder(now: Date = new Date()): Promise<DeviceOrderQuotaHandle> {
  const { dayKey, secondsUntilMidnight, resetLabel } = getPktDayWindow(now);
  const identity = await ensureDeviceCookie(now);
  const enforceFallbackCap = !identity.hadValidCookie || identity.fallbackBlockedOnMint;
  const expiresAtIso = new Date(now.getTime() + secondsUntilMidnight * 1000).toISOString();
  const supabase = getSupabaseServer();

  const limitMessage = `Daily order limit reached (${MAX_ORDERS_PER_DEVICE_PER_DAY} orders per device per day). Your limit will reset ${resetLabel}. Need a bulk or catering order? Call us on ${SHOP_PHONE_LOCAL}.`;

  try {
    const { data, error } = await supabase.rpc('consume_device_daily_order', {
      p_device_key: identity.deviceKey,
      p_fallback_key: identity.fallbackKey,
      p_day_pkt: dayKey,
      p_limit: MAX_ORDERS_PER_DEVICE_PER_DAY,
      p_enforce_fallback: enforceFallbackCap,
      p_expires_at: expiresAtIso,
    });

    if (!error && data && typeof data === 'object' && !Array.isArray(data) && 'allowed' in (data as Record<string, unknown>)) {
      const allowed = Boolean((data as any).allowed);
      if (!allowed) {
        throw new UserFacingError(limitMessage, 'device_limit_reached');
      }
      return {
        deviceKey: identity.deviceKey,
        fallbackKey: identity.fallbackKey,
        dayKey,
        usedTableRpc: true,
      };
    }

    if (error && !isMissingDeviceLimitRpcError(error)) {
      console.error('[consumeDeviceDailyOrder] RPC error:', error);
      throw new UserFacingError('Unable to verify device order limit right now. Please try again shortly.', 'db_migration_needed');
    }
  } catch (err) {
    if (err instanceof UserFacingError) throw err;
    console.error('[consumeDeviceDailyOrder] Unexpected RPC failure:', err);
  }

  // Graceful fallback to existing atomic PostgreSQL `rate_limit_hit` before Migration 05 is applied
  const fpRateKey = `devlimit:${dayKey}:${identity.fallbackKey}`;
  const devRateKey = `devlimit:${dayKey}:${identity.deviceKey}`;

  if (enforceFallbackCap) {
    const { data: fpBlocked, error: fpBlockErr } = await supabase.rpc('rate_limit_is_blocked', {
      p_key: fpRateKey,
      p_limit: MAX_ORDERS_PER_DEVICE_PER_DAY,
    });
    if (!fpBlockErr && fpBlocked) {
      throw new UserFacingError(limitMessage, 'device_limit_reached');
    }
  }

  const { data: devAllowed, error: devHitErr } = await supabase.rpc('rate_limit_hit', {
    p_key: devRateKey,
    p_limit: MAX_ORDERS_PER_DEVICE_PER_DAY,
    p_window_seconds: secondsUntilMidnight,
  });

  if (devHitErr) {
    console.error('[consumeDeviceDailyOrder] Fallback rate_limit_hit error:', devHitErr);
    throw new UserFacingError('Unable to verify device order limit right now. Please try again shortly.', 'db_migration_needed');
  }

  if (!devAllowed) {
    throw new UserFacingError(limitMessage, 'device_limit_reached');
  }

  // Also mirror into fallback counter without failing legitimate separate-device cookie holders unless enforceFallbackCap=true
  await supabase.rpc('rate_limit_hit', {
    p_key: fpRateKey,
    p_limit: enforceFallbackCap ? MAX_ORDERS_PER_DEVICE_PER_DAY : MAX_ORDERS_PER_DEVICE_PER_DAY * 20,
    p_window_seconds: secondsUntilMidnight,
  }).then(() => {}, () => {});

  return {
    deviceKey: identity.deviceKey,
    fallbackKey: identity.fallbackKey,
    dayKey,
    usedTableRpc: false,
  };
}

/**
 * Releases a previously reserved daily order slot if order insertion aborted/failed cleanly.
 */
export async function releaseDeviceDailyOrder(handle: DeviceOrderQuotaHandle | null | undefined): Promise<void> {
  if (!handle) return;
  const supabase = getSupabaseServer();
  if (handle.usedTableRpc) {
    try {
      await supabase.rpc('release_device_daily_order', {
        p_device_key: handle.deviceKey,
        p_fallback_key: handle.fallbackKey,
        p_day_pkt: handle.dayKey,
      });
    } catch (err) {
      console.error('[releaseDeviceDailyOrder] Failed:', err);
    }
  }
}

export async function getDeviceDailyUsage(now: Date = new Date()): Promise<{
  limit: number;
  used: number;
  remaining: number;
  resetLabel: string;
}> {
  const { dayKey, resetLabel } = getPktDayWindow(now);
  const identity = await ensureDeviceCookie(now);
  const supabase = getSupabaseServer();

  let devUsed = 0;
  try {
    const { data, error } = await supabase
      .from('device_daily_orders')
      .select('order_count')
      .eq('device_key', identity.deviceKey)
      .eq('day_pkt', dayKey)
      .maybeSingle();
    if (!error && data) {
      devUsed = Number(data.order_count || 0);
    } else if (error && isMissingDeviceLimitRpcError(error)) {
      const { data: rlData } = await supabase
        .from('rate_limits')
        .select('count, expires_at')
        .eq('key', `devlimit:${dayKey}:${identity.deviceKey}`)
        .maybeSingle();
      if (rlData && rlData.expires_at && new Date(rlData.expires_at).getTime() > Date.now()) {
        devUsed = Number(rlData.count || 0);
      }
    }
  } catch {}

  let effectiveUsed = devUsed;
  if (!identity.hadValidCookie || identity.fallbackBlockedOnMint) {
    const fpUsed = await readFallbackCountToday(identity.fallbackKey, dayKey);
    effectiveUsed = Math.max(devUsed, fpUsed);
  }

  return {
    limit: MAX_ORDERS_PER_DEVICE_PER_DAY,
    used: effectiveUsed,
    remaining: Math.max(0, MAX_ORDERS_PER_DEVICE_PER_DAY - effectiveUsed),
    resetLabel,
  };
}
