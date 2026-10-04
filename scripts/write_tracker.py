import os

order_tracker_code = """import React, { useEffect, useState } from 'react';
import { useLiveOrder } from '../../hooks/useLiveOrder';
import { Clock, MapPin, CheckCircle, ChefHat, X, ChevronUp, ChevronDown, Package } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { safeJson } from '../../lib/storage';

export function OrderTracker() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkOrder = () => {
      const active = safeJson('active_order', '') || safeJson('just_ordered', '');
      if (active && active !== orderId) {
        setOrderId(active);
      }
    };
    checkOrder();
    
    const interval = setInterval(checkOrder, 2000);
    return () => clearInterval(interval);
  }, [orderId]);

  const { order, loading } = useLiveOrder(orderId, (newStatus, oldStatus) => {
    if (newStatus !== oldStatus && newStatus === 'delivered') {
       // Auto close after some time if delivered
       setTimeout(() => {
         localStorage.removeItem('active_order');
         sessionStorage.removeItem('just_ordered');
         setOrderId(null);
       }, 60000);
    }
  });

  if (!orderId) return null;
  if (!order && !loading) return null;

  const dismiss = () => {
    localStorage.removeItem('active_order');
    sessionStorage.removeItem('just_ordered');
    setOrderId(null);
  };

  const getProgress = (status: string) => {
    switch (status) {
      case 'received': return 15;
      case 'preparing': return 50;
      case 'out_for_delivery': return 85;
      case 'delivered': return 100;
      case 'canceled': return 100;
      default: return 0;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received': return 'Order Received';
      case 'preparing': return 'Preparing Food';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'canceled': return 'Canceled';
      default: return 'Loading...';
    }
  };

  const status = order?.status || 'received';
  const progress = getProgress(status);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out transform">
      {/* Header bar (always visible when order active) */}
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer active:bg-slate-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            status === 'delivered' ? 'bg-green-100 text-green-600' :
            status === 'canceled' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
          }`}>
            {status === 'delivered' ? <CheckCircle size={20} /> :
             status === 'canceled' ? <X size={20} /> :
             status === 'out_for_delivery' ? <MapPin size={20} /> :
             status === 'preparing' ? <ChefHat size={20} /> :
             <Package size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {getStatusText(status)}
            </p>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${status === 'canceled' ? 'bg-red-500' : status === 'delivered' ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
           <button 
             onClick={(e) => { e.stopPropagation(); navigate({ to: `/orders/${orderId}` }); }}
             className="text-xs font-bold text-primary hover:underline px-2 py-1"
           >
             Details
           </button>
           {isExpanded ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronUp size={20} className="text-slate-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-bottom-2">
          {order ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Order ID</span>
                <span className="font-mono font-medium">{order.shortCode}</span>
              </div>
              
              {status === 'out_for_delivery' && order.rider_name && (
                <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">Rider: {order.rider_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{order.rider_phone || 'Number hidden'}</p>
                  </div>
                  {order.rider_phone && (
                    <a href={`tel:${order.rider_phone}`} className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90">
                      📞
                    </a>
                  )}
                </div>
              )}

              {status === 'canceled' && order.cancel_reason && (
                <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
                  <p className="font-bold text-red-900">Reason</p>
                  <p className="text-sm text-red-700 mt-0.5">{order.cancel_reason}</p>
                </div>
              )}
              
              {(status === 'delivered' || status === 'canceled') && (
                <button onClick={(e) => { e.stopPropagation(); dismiss(); }} className="w-full mt-2 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors">
                  Dismiss
                </button>
              )}
            </div>
          ) : (
             <div className="py-4 flex justify-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          )}
        </div>
      )}
    </div>
  );
}
"""

with open("src/components/orders/OrderTracker.tsx", "w", encoding="utf-8") as f:
    f.write(order_tracker_code)
