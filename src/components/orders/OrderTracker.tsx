import React, { useEffect, useState, useRef } from 'react';
import { useLiveOrder } from '../../hooks/useLiveOrder';
import { usePushSetup } from '../../hooks/usePushSetup';
import { getActiveOrders, consumeJustOrdered, removeActiveOrder, addActiveOrder } from '../../lib/activeOrders';
import { OrderStatusView } from './OrderStatusView';
import { ChevronUp, Package, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export function OrderTracker() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { enableOrderNotifications, silentlyAttach } = usePushSetup();
  
  const attachRef = useRef(silentlyAttach);
  attachRef.current = silentlyAttach;

  useEffect(() => {
    const sync = () => {
      const justOrdered = consumeJustOrdered();
      if (justOrdered) {
        addActiveOrder(justOrdered);          // safety net: never lose it
        setOrderId(justOrdered);
        setIsExpanded(true);                  // auto-open once
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
  }, []); // <- empty on purpose

  const { order, loading } = useLiveOrder(orderId, (newStatus, oldStatus, currentOrder) => {
    // Sound + vibration on status change
    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      if (newStatus === 'canceled') {
        setIsExpanded(true); // Blocking popup logic for cancel handled inside OrderStatusView
      }
    } catch(e) {}
  });

  if (!orderId) return null;
  if (!order && !loading) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeActiveOrder(orderId);
    setOrderId(null);
    setIsExpanded(false);
  };

  const status = order?.status || 'received';

  return (
    <>
      {isExpanded && (
        <div 
           className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm animate-in fade-in"
           onClick={() => setIsExpanded(false)}
        />
      )}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[70] bg-white border-t border-slate-200 shadow-2xl transition-all duration-300 ease-in-out transform flex flex-col ${isExpanded ? 'h-[85dvh] rounded-t-3xl' : 'pb-[calc(env(safe-area-inset-bottom)+60px)]'}`}
      >
        {/* Header bar (Collapsed view) */}
        {!isExpanded && (
          <div 
            className="px-4 py-3 flex items-center justify-between cursor-pointer active:bg-slate-50"
            onClick={() => setIsExpanded(true)}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                status === 'delivered' ? 'bg-green-100 text-green-600' :
                status === 'canceled' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
              }`}>
                <Package size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {status === 'received' && 'Order Received'}
                  {status === 'preparing' && 'Preparing Food'}
                  {status === 'out_for_delivery' && 'Out for Delivery'}
                  {status === 'delivered' && 'Delivered'}
                  {status === 'canceled' && 'Canceled'}
                </p>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {status === 'out_for_delivery' && order?.rider_name ? `Rider: ${order.rider_name}` : `Order #${order?.shortCode || '...'}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
               {(status === 'delivered' || status === 'canceled') && (
                 <button onClick={handleDismiss} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600">
                   <X size={16} />
                 </button>
               )}
               <ChevronUp size={20} className="text-slate-400" />
            </div>
          </div>
        )}

        {/* Expanded Sheet Content */}
        {isExpanded && order && (
          <div className="flex flex-col h-full overflow-hidden relative">
            <div className="w-full flex justify-center pt-3 pb-1 cursor-pointer" onClick={() => setIsExpanded(false)}>
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>
            
            <div className="absolute top-2 right-4">
               <button onClick={handleDismiss} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600">
                 <X size={20} />
               </button>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
              <OrderStatusView 
                order={order} 
                onNotify={() => enableOrderNotifications(orderId)}
              />
            </div>
            
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex gap-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <Link 
                 to={`/orders/${orderId}`}
                 className="flex-1 text-center py-3 font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                 onClick={() => setIsExpanded(false)}
              >
                 Full Page
              </Link>
              <button 
                 onClick={() => setIsExpanded(false)}
                 className="flex-1 py-3 font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
              >
                 Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
