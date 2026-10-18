import { createServerFn } from '@tanstack/react-start';
import { getShopStatus, ShopStatus } from '../lib/shop';

export interface ShopStatusResponse extends ShopStatus {
  serverNow: string;
}

export const getShopStatusFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<ShopStatusResponse> => {
    let now = new Date();
    if ((import.meta as any).env?.DEV && process.env.SHOP_NOW_OVERRIDE) {
      now = new Date(process.env.SHOP_NOW_OVERRIDE);
    }
    const status = getShopStatus(now);
    return {
      ...status,
      serverNow: now.toISOString()
    };
  });
