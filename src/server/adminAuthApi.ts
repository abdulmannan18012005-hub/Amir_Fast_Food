import { createServerFn } from '@tanstack/react-start';
import { verifyAdminPin, signAdminToken } from './auth';
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
