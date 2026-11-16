import { createServerFn } from '@tanstack/react-start';
import { verifyAdminPin, signAdminToken, verifyAdminToken } from './auth';
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
      const isConfigured = Boolean(process.env.ADMIN_PIN);
      if (!isConfigured) {
        return { valid: false, configured: false, error: 'Admin access is not configured on the server.' };
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
