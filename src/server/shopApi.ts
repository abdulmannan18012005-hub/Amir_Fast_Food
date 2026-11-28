import { createServerFn } from '@tanstack/react-start';
import { getShopStatus, MAX_ORDERS_PER_DEVICE_PER_DAY, ShopStatus } from '../lib/shop';
import { getDeviceDailyUsage } from './deviceLimit';

export interface ShopStatusResponse extends ShopStatus {
  serverNow: string;
  deviceDailyLimit?: number;
  deviceDailyUsed?: number;
  deviceDailyRemaining?: number;
  deviceResetLabel?: string;
}

export const getShopStatusFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<ShopStatusResponse> => {
    let now = new Date();
    if ((import.meta as any).env?.DEV && process.env.SHOP_NOW_OVERRIDE) {
      now = new Date(process.env.SHOP_NOW_OVERRIDE);
    }
    const status = getShopStatus(now);

    let quota = {
      limit: MAX_ORDERS_PER_DEVICE_PER_DAY,
      used: 0,
      remaining: MAX_ORDERS_PER_DEVICE_PER_DAY,
      resetLabel: '',
    };
    try {
      quota = await getDeviceDailyUsage(now);
    } catch (err) {
      console.warn('[getShopStatusFn] device usage check skipped:', err);
    }

    return {
      ...status,
      serverNow: now.toISOString(),
      deviceDailyLimit: quota.limit,
      deviceDailyUsed: quota.used,
      deviceDailyRemaining: quota.remaining,
      deviceResetLabel: quota.resetLabel,
    };
  });
