import { createServerFn } from '@tanstack/react-start';
import { verifyAdminPin, signAdminToken, verifyAdminToken, revokeAdminToken, getAdminCredential } from './auth';
import { toSafeError } from './errors';

export const loginAdminFn = createServerFn({ method: "POST" })
  .validator((d: { pin?: string }) => d)
  .handler(async ({ data }) => {
    try {
      verifyAdminPin(data.pin);
      const token = signAdminToken();
      return { success: true, token };
    } catch (e: any) {
      return { success: false, error: toSafeError(e) };
    }
  });

export const logoutAdminFn = createServerFn({ method: "POST" })
  .validator((d: { token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      if (data.token) {
        revokeAdminToken(data.token);
      }
      return { success: true };
    } catch {
      return { success: true };
    }
  });

export const verifyAdminPinFn = createServerFn({ method: "POST" })
  .validator((d: { pin?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const isValid = verifyAdminPin(data.pin);
      return { success: isValid, token: isValid ? signAdminToken() : undefined };
    } catch (e: any) {
      return { success: false, error: toSafeError(e) };
    }
  });

export const validateAdminSessionFn = createServerFn({ method: "POST" })
  .validator((d: { token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      let isConfigured = false;
      try {
        isConfigured = Boolean(getAdminCredential());
      } catch {
        isConfigured = false;
      }

      if (!isConfigured) {
        return { valid: false, configured: false, error: 'Admin access is not configured on the server. Please set ADMIN_PASSPHRASE or ADMIN_PIN.' };
      }
      if (!data.token) {
        return { valid: false, configured: true };
      }
      const isValid = verifyAdminToken(data.token);
      return { valid: isValid, configured: true };
    } catch {
      return { valid: false, configured: false };
    }
  });
