import os

useLiveOrder_code = """import { useState, useEffect, useRef, useCallback } from 'react';
import { getPublicOrder } from '../server/order';
import { supabaseBrowser } from '../lib/supabase';
import { safeJson } from '../lib/storage';
import { OrderStatus } from '../lib/orderStatus';
import { getLocal, setLocal } from '../lib/storage';

export type LiveOrder = {
  id: string;
  shortCode: string;
  status: OrderStatus;
  created_at: string;
  status_changed_at: string;
  canceled_at: string | null;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  delivery_address: string;
  rider_name: string | null;
  rider_phone: string | null;
  cancel_reason: string | null;
  items: { name: string; quantity: number; unit_price: number; variants: any[] }[];
};

export function useLiveOrder(
  orderId: string | null, 
  onStatusChange?: (newStatus: OrderStatus, oldStatus: OrderStatus | null, order: LiveOrder) => void
) {
  const [order, setOrder] = useState<LiveOrder | null>(() => {
    if (!orderId) return null;
    return getLocal(`order_cache_${orderId}`, null);
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const statusRef = useRef<OrderStatus | null>(order?.status || null);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await getPublicOrder({ data: { orderIds: [orderId] } }); // Changed getPublicOrder payload to match Array logic or getPublicOrders
      // Wait, earlier I wrote getPublicOrder which expects {orderId: string}. getPublicOrders expects {orderIds: string[]}.
      // Let's rely on getPublicOrder expecting {orderId: string}. I'll use it.
    } catch(e) {}
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }

    let isSubscribed = true;
    let fetchTimeout: any;

    const doFetch = async () => {
      try {
        const dataArray = await getPublicOrder({ data: { orderId } }); // Actually wait, I need to check what getPublicOrder expects. 
        // Previously it was exported as getPublicOrderFn({data: {orderId}}) and later getPublicOrders({data: {orderIds}}).
        // I will use getPublicOrders since it has all the fields.
      } catch(e) {}
    };

    // Replace all with correct fetching logic
  }, [orderId]);
  return { order, loading, error };
}
"""

with open("src/hooks/useLiveOrder.ts", "r", encoding="utf-8") as f:
    code = f.read()

# Instead of rewriting entirely by string, I will write it properly using python.
