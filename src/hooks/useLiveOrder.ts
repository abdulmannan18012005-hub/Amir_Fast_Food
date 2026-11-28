import { useState, useEffect, useRef, useCallback } from 'react';
import { getPublicOrders } from '../server/order';
import { OrderStatus } from '../lib/orderStatus';
import { getLocal, setLocal } from '../lib/storage';
import { getTrackingToken, getCancellationToken } from '../lib/activeOrders';

export type LiveOrder = {
  id: string;
  shortCode: string;
  authorized?: boolean;
  status: OrderStatus;
  payment_review_status?: 'not_required' | 'pending' | 'approved' | 'rejected';
  payment_verified_at?: string | null;
  payment_trx_id_masked?: string | null;
  created_at: string;
  status_changed_at: string;
  canceled_at: string | null;
  cancellation_source?: 'customer' | 'admin' | 'system' | null;
  refund_status?: 'not_required' | 'pending_review' | 'approved' | 'paid' | 'rejected' | null;
  refund_proof_path?: string | null;
  refund_reviewed_at?: string | null;
  refund_paid_at?: string | null;
  refund_trx_ref?: string | null;
  refund_admin_note?: string | null;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  delivery_address: string | null;
  rider_name: string | null;
  rider_phone: string | null;
  cancel_reason: string | null;
  items: { name: string; quantity: number; unit_price: number; variants: any[] }[];
};

export function useLiveOrder(
  orderId: string | null, 
  onStatusChange?: (newStatus: OrderStatus, oldStatus: OrderStatus | null, order: LiveOrder) => void,
  explicitTrackingToken?: string
) {
  const [order, setOrder] = useState<LiveOrder | null>(() => {
    if (!orderId) return null;
    return getLocal(`order_cache_${orderId}`, null);
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const notFoundCountRef = useRef(0);
  const statusRef = useRef<OrderStatus | null>(order?.status || null);
  const onStatusChangeRef = useRef(onStatusChange);
  const manualFetchRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const retryNow = useCallback(() => {
    if (manualFetchRef.current) {
      return manualFetchRef.current();
    }
    return Promise.resolve();
  }, []);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      setError(false);
      setIsReconnecting(false);
      manualFetchRef.current = null;
      return;
    }

    const cached = getLocal<LiveOrder | null>(`order_cache_${orderId}`, null);
    if (cached) {
      setOrder(cached);
      statusRef.current = cached.status;
    } else {
      setOrder(null);
      setLoading(true);
    }

    let isSubscribed = true;
    let fetchTimeout: any;

    const fetchOrder = async () => {
      try {
        const token = explicitTrackingToken || getTrackingToken(orderId) || getCancellationToken(orderId) || undefined;
        const dataArray = await getPublicOrders({
          data: {
            orderIds: [orderId],
            ...(token ? { trackingToken: token } : {}),
          },
        });
        if (!isSubscribed) return;

        if (dataArray && dataArray.length > 0) {
          notFoundCountRef.current = 0;
          const data = dataArray[0] as LiveOrder;
          setError(false);
          setIsReconnecting(false);
          setOrder(data);
          setLocal(`order_cache_${orderId}`, data);

          if (statusRef.current && statusRef.current !== data.status && onStatusChangeRef.current) {
            onStatusChangeRef.current(data.status, statusRef.current, data);
          }
          statusRef.current = data.status;
        } else {
          // Confirmed empty response from server means order ID does not exist
          setOrder(null);
          setError(true);
          setIsReconnecting(false);
        }
      } catch (err) {
        if (!isSubscribed) return;
        setIsReconnecting(true);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    manualFetchRef.current = fetchOrder;

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

    fetchOrder().finally(() => {
      if (isSubscribed && statusRef.current !== 'delivered' && statusRef.current !== 'canceled') {
        scheduleNext();
      }
    });

    const handleRefetch = () => {
       if (document.visibilityState === 'visible') fetchOrder();
    };
    
    document.addEventListener('visibilitychange', handleRefetch);
    window.addEventListener('focus', handleRefetch);
    window.addEventListener('online', handleRefetch);
    window.addEventListener('pageshow', handleRefetch);
    
    const handleOrderUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ orderId?: string }>).detail;
      if (!detail?.orderId || detail.orderId === orderId) {
        fetchOrder();
      }
    };
    window.addEventListener('orderUpdated', handleOrderUpdated);

    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'ORDER_UPDATE' && e.data.orderId === orderId) {
        fetchOrder();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      isSubscribed = false;
      manualFetchRef.current = null;
      clearTimeout(fetchTimeout);
      document.removeEventListener('visibilitychange', handleRefetch);
      window.removeEventListener('focus', handleRefetch);
      window.removeEventListener('online', handleRefetch);
      window.removeEventListener('pageshow', handleRefetch);
      window.removeEventListener('orderUpdated', handleOrderUpdated);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [orderId, explicitTrackingToken]);

  return { order, loading, error, isReconnecting, retryNow };
}
