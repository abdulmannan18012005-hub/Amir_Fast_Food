import { createServerFn } from '@tanstack/react-start';
import { verifyAdminPin } from './auth';

export const verifyAdminPinFn = createServerFn({ method: "POST" })
  .validator((d: { pin?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const isValid = verifyAdminPin(data.pin);
      return { success: isValid };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
