import { createServerFn } from '@tanstack/react-start';
import { verifyAdminPin } from './auth';
import { toSafeError } from './errors';

export const verifyAdminPinFn = createServerFn({ method: "POST" })
  .validator((d: { pin?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const isValid = verifyAdminPin(data.pin);
      return { success: isValid };
    } catch (e: any) {
      return { success: false, error: toSafeError(e) };
    }
  });
