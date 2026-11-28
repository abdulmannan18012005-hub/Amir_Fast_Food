import { createServerFn } from '@tanstack/react-start';
import {
  verifyAdminPinDetailed,
  createAdminSession,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  getAdminCookieToken,
  verifyAdminToken,
  revokeAdminToken,
  getClientIp,
} from './auth';

export const loginAdminFn = createServerFn({ method: 'POST' })
  .validator((d: { pin: string }) => d)
  .handler(async ({ data }) => {
    try {
      const ip = getClientIp();
      const check = await verifyAdminPinDetailed(data.pin, ip);
      if (!check.ok) {
        return {
          success: false,
          blocked: Boolean(check.blocked),
          error: check.error || 'Incorrect PIN.',
        };
      }

      const { token, expiresAt } = await createAdminSession();
      setAdminSessionCookie(token);

      return {
        success: true,
        expiresAt,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Unable to sign in right now.',
      };
    }
  });

export const validateAdminSessionFn = createServerFn({ method: 'POST' })
  .validator((d?: { token?: string }) => d || {})
  .handler(async ({ data }) => {
    const token = getAdminCookieToken() || data?.token;
    if (!token) return { valid: false };
    const valid = await verifyAdminToken(token);
    return { valid };
  });

export const logoutAdminFn = createServerFn({ method: 'POST' })
  .validator((d?: { token?: string }) => d || {})
  .handler(async ({ data }) => {
    const token = getAdminCookieToken() || data?.token;
    if (token) {
      await revokeAdminToken(token);
    }
    clearAdminSessionCookie();
    return { success: true };
  });
