import React, { useEffect, useState, useRef } from 'react';
import { useLiveOrder } from '../../hooks/useLiveOrder';
import { usePushSetup } from '../../hooks/usePushSetup';
import { getActiveOrders, consumeJustOrdered, removeActiveOrder, addActiveOrder } from '../../lib/activeOrders';
import { OrderStatusView } from './OrderStatusView';
import { ChevronUp, Package, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export function OrderTracker() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { enableOrderNotifications, silentlyAttach } = usePushSetup();
  
  const attachRef = useRef(silentlyAttach);
  attachRef.current = silentlyAttach;
  
  const barRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const vanishTimerRef = useRef<any>(null);

  useEffect(() => {
    const sync = () => {
      const justOrdered = consumeJustOrdered();
      if (justOrdered) {
        addActiveOrder(justOrdered);
        setOrderId(justOrdered);
        setIsExpanded(true);
        attachRef.current(justOrdered);
        return;
      }
      const actives = getActiveOrders();
      setOrderId(prev =>
        prev && actives.some(o => o.id === prev) ? prev : (actives[0]?.id ?? null)
      );
    };
    sync();
    const handleOpen = () => setIsExpanded(true);
    window.addEventListener('orderPlaced', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    window.addEventListener('openTracker', handleOpen);
    return () => {
      window.removeEventListener('orderPlaced', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('openTracker', handleOpen);
    };
  }, []);

  const { order, loading, error, isReconnecting } = useLiveOrder(orderId, (newStatus) => {
    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      if (newStatus === 'canceled') {
        setIsExpanded(true);
      }
    } catch(e) {}
  });

  // Handle server says order not found
  useEffect(() => {
    if (error && orderId) {
      const remaining = removeActiveOrder(orderId);
      setOrderId(remaining[0]?.id ?? null);
      setIsExpanded(false);
    }
  }, [error, orderId]);

  // Handle delivery / cancel auto-removal
  useEffect(() => {
    clearTimeout(vanishTimerRef.current);
    if (!order || !orderId) return;

    if (order.status === 'delivered') {
      const deliveredAt = new Date(order.status_changed_at || order.created_at).getTime();
      const elapsed = Date.now() - deliveredAt;
      
      // If already delivered > 2 minutes ago on load: remove silently
      if (elapsed > 120000) {
        const remaining = removeActiveOrder(orderId);
        setOrderId(remaining[0]?.id ?? null);
        setIsExpanded(false);
        return;
      }

      // Show for 8 seconds, then auto-vanish
      vanishTimerRef.current = setTimeout(() => {
        setIsExpanded(false);
        const remaining = removeActiveOrder(orderId);
        setOrderId(remaining[0]?.id ?? null);
      }, 8000);
    } else if (order.status === 'canceled') {
      const canceledAt = new Date(order.canceled_at || order.status_changed_at || order.created_at).getTime();
      const elapsed = Date.now() - canceledAt;
      // Auto-remove 30 minutes after cancellation
      if (elapsed > 30 * 60000) {
        const remaining = removeActiveOrder(orderId);
        setOrderId(remaining[0]?.id ?? null);
        setIsExpanded(false);
      }
    }

    return () => clearTimeout(vanishTimerRef.current);
  }, [order?.status, orderId]);

  // Publish CSS variable --tracker-h
  useEffect(() => {
    const isVisible = Boolean(orderId && (order || loading));
    if (isVisible && !isExpanded && barRef.current) {
      const h = barRef.current.offsetHeight || 64;
      document.documentElement.style.setProperty('--tracker-h', `${h}px`);
    } else {
      document.documentElement.style.setProperty('--tracker-h', '0px');
    }
    return () => {
      document.documentElement.style.setProperty('--tracker-h', '0px');
    };
  }, [orderId, order, loading, isExpanded]);

  // Accessibility: Focus trap & Escape listener
  useEffect(() => {
    if (!isExpanded) {
      triggerRef.current?.focus();
      return;
    }
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  if (!orderId) return null;
  if (!order && !loading) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = removeActiveOrder(orderId);
    setOrderId(remaining[0]?.id ?? null);
    setIsExpanded(false);
  };

  const status = order?.status || 'received';
  const isFinal = status === 'delivered' || status === 'canceled';

  return (
    <>
      {/* Expanded Sheet Modal */}
      {isExpanded && (
        <>
          <div 
             className="fixed inset-0 bg-black/60 z-[65] animate-in fade-in"
             onClick={() => setIsExpanded(false)}
             aria-hidden="true"
          />
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="tracker-sheet-title"
            className="fixed inset-x-0 bottom-0 md:bottom-6 md:right-6 md:left-auto md:w-[420px] z-[70] h-[85dvh] max-h-[100dvh] bg-card rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border animate-in slide-in-from-bottom duration-300"
          >
            {/* Dedicated Top Bar inside Sheet (never overlapped) */}
            <div className="sticky top-0 z-10 bg-card border-b border-border/60 px-4 pt-3 pb-3 flex flex-col shrink-0">
              <div 
                className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-2 cursor-pointer" 
                onClick={() => setIsExpanded(false)}
                title="Collapse sheet"
              />
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="tracker-sheet-title" className="font-bold text-lg text-foreground leading-tight">
                    Order #{order?.shortCode || '...'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {status === 'delivered' ? 'Delivered' : status === 'canceled' ? 'Canceled' : 'Live Status'}
                  </p>
                </div>
                <button 
                  ref={closeBtnRef}
                  onClick={() => setIsExpanded(false)} 
                  aria-label="Close order details"
                  className="w-11 h-11 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Status View */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {order && (
                <OrderStatusView 
                  order={order} 
                  onNotify={() => enableOrderNotifications(orderId)}
                />
              )}
            </div>

            {/* Fixed Footer within Sheet */}
            <div className="p-4 bg-card border-t border-border flex gap-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shrink-0">
              <Link 
                 to={`/orders/${orderId}`}
                 className="flex-1 text-center py-3 font-bold text-foreground bg-accent rounded-xl hover:bg-accent/80 transition-colors"
                 onClick={() => setIsExpanded(false)}
              >
                 Full Page
              </Link>
              <button 
                 onClick={() => setIsExpanded(false)}
                 className="flex-1 py-3 font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors"
              >
                 Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Collapsed Bar: floats above bottom nav on mobile, small card on desktop */}
      {!isExpanded && (
        <div 
          ref={barRef}
          className="fixed inset-x-2 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] md:inset-x-auto md:bottom-6 md:right-6 md:w-[360px] z-[55] bg-card text-card-foreground border border-border shadow-xl rounded-2xl transition-all duration-300"
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div 
              ref={triggerRef}
              role="button"
              tabIndex={0}
              aria-label="Expand order status"
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:bg-accent/50 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setIsExpanded(true)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(true); } }}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                status === 'delivered' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                status === 'canceled' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
              }`}>
                {status === 'delivered' ? <CheckCircle size={20} /> : status === 'canceled' ? <AlertTriangle size={20} /> : <Package size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {status === 'received' && 'Order Received'}
                  {status === 'preparing' && 'Preparing Food'}
                  {status === 'out_for_delivery' && 'Out for Delivery'}
                  {status === 'delivered' && 'Delivered - Enjoy!'}
                  {status === 'canceled' && 'Order Canceled'}
                </p>
                <div className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-2">
                  <span>{status === 'out_for_delivery' && order?.rider_name ? `Rider: ${order.rider_name}` : `Order #${order?.shortCode || '...'}`}</span>
                  {isReconnecting && <span className="text-amber-500 font-semibold">(Reconnecting...)</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-3">
              {isFinal && (
                <button 
                  onClick={handleDismiss} 
                  aria-label="Dismiss order tracker"
                  className="p-2 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                aria-label="Expand order status"
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <ChevronUp size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
