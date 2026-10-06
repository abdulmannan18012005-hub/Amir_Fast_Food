import { useState, useEffect, useRef } from 'react';
import { getPublicOrders } from '../server/order';
import { supabaseBrowser } from '../lib/supabase';
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

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }

    let isSubscribed = true;
    let fetchTimeout: any;

    const fetchOrder = async () => {
      try {
        const dataArray = await getPublicOrders({ data: { orderIds: [orderId] } });
        if (!isSubscribed) return;
        
        if (dataArray && dataArray.length > 0) {
          const data = dataArray[0] as LiveOrder;
          setError(false);
          setOrder(data);
          setLocal(`order_cache_${orderId}`, data);
          
          if (statusRef.current && statusRef.current !== data.status && onStatusChangeRef.current) {
            onStatusChangeRef.current(data.status, statusRef.current, data);
          }
          statusRef.current = data.status;
        } else {
          setError(true);
        }
      } catch (err) {
        if (!order) setError(true);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchOrder();

    const scheduleNext = () => {
      clearTimeout(fetchTimeout);
      if (!isSubscribed) return;
      
      const isFinal = statusRef.current === 'delivered' || statusRef.current === 'canceled';
      if (isFinal) return; // Stop polling when final
      
      const interval = document.visibilityState === 'visible' ? 5000 : 30000;
      fetchTimeout = setTimeout(() => {
        fetchOrder().finally(scheduleNext);
      }, interval);
    };
    
    // Only schedule if not final initially
    if (statusRef.current !== 'delivered' && statusRef.current !== 'canceled') {
      scheduleNext();
    }

    const handleRefetch = () => {
       if (document.visibilityState === 'visible') fetchOrder();
    };
    
    document.addEventListener('visibilitychange', handleRefetch);
    window.addEventListener('focus', handleRefetch);
    window.addEventListener('online', handleRefetch);
    window.addEventListener('pageshow', handleRefetch);
    
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'ORDER_UPDATE' && e.data.orderId === orderId) {
        fetchOrder();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      isSubscribed = false;
      clearTimeout(fetchTimeout);
      document.removeEventListener('visibilitychange', handleRefetch);
      window.removeEventListener('focus', handleRefetch);
      window.removeEventListener('online', handleRefetch);
      window.removeEventListener('pageshow', handleRefetch);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [orderId]);

  return { order, loading, error };
}
