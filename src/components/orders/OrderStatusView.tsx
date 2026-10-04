import React, { useEffect, useState } from 'react';
import { Clock, MapPin, CheckCircle, ChefHat, XCircle, Phone } from 'lucide-react';
import { LiveOrder } from '../../hooks/useLiveOrder';

export function OrderStatusView({ order, onNotify }: { order: LiveOrder, onNotify?: () => void }) {
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getProgress = () => {
    if (order.status === 'canceled') return 100;
    if (order.status === 'delivered') return 100;
    
    const statusChangedAt = new Date(order.status_changed_at || order.created_at).getTime();
    const elapsed = now - statusChangedAt;
    
    if (order.status === 'received') {
      const expected = 3 * 60000;
      const fraction = Math.min(0.95, elapsed / expected);
      return 0 + (15 - 0) * fraction;
    }
    if (order.status === 'preparing') {
      const expected = 15 * 60000;
      const fraction = Math.min(0.95, elapsed / expected);
      return 15 + (60 - 15) * fraction;
    }
    if (order.status === 'out_for_delivery') {
      const expected = 15 * 60000;
      const fraction = Math.min(0.95, elapsed / expected);
      return 60 + (95 - 60) * fraction;
    }
    return 0;
  };
  
  const getEta = () => {
    const elapsedAll = (now - new Date(order.created_at).getTime()) / 60000;
    const remaining = Math.max(5, 35 - elapsedAll);
    if (remaining > 35) return "Taking a bit longer than usual";
    return `About ${Math.round(remaining)} min`;
  };

  const progress = getProgress();
  const isFinal = order.status === 'delivered' || order.status === 'canceled';

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      {/* Header section */}
      <div className="bg-white px-6 py-5 border-b border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-black">
              {order.status === 'received' && 'Order Received'}
              {order.status === 'preparing' && 'Preparing Food'}
              {order.status === 'out_for_delivery' && 'Out for Delivery'}
              {order.status === 'delivered' && 'Delivered - Enjoy!'}
              {order.status === 'canceled' && 'Order Canceled'}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">Order #{order.shortCode}</p>
          </div>
          {onNotify && !isFinal && (
             <button onClick={onNotify} className="bg-primary/10 text-primary hover:bg-primary/20 font-bold px-3 py-1.5 rounded-full text-sm transition-colors">
               🔔 Notify me
             </button>
          )}
        </div>
        
        <div className="w-full h-2 bg-slate-100 rounded-full mb-3 overflow-hidden">
          <div 
             className={`h-full rounded-full transition-all duration-[10000ms] ease-linear ${order.status === 'canceled' ? 'bg-red-500' : order.status === 'delivered' ? 'bg-green-500' : 'bg-primary'}`}
             style={{ width: `${progress}%` }}
          />
        </div>
        
        {!isFinal && (
          <div className="flex justify-between text-sm font-semibold text-slate-600">
            <span>Progress</span>
            <span>{getEta()}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {order.status === 'canceled' && order.cancel_reason && (
           <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
             <XCircle className="text-red-500 flex-shrink-0 mt-0.5" />
             <div>
               <p className="font-bold text-red-900">Canceled by Restaurant</p>
               <p className="text-sm text-red-700 mt-1">{order.cancel_reason}</p>
               {order.payment_method === 'online_transfer' && (
                 <p className="text-xs text-red-600 mt-2 italic">Your online payment will be refunded shortly. Contact us for details.</p>
               )}
             </div>
           </div>
        )}

        {order.status === 'out_for_delivery' && order.rider_name && (
           <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="bg-white p-2 rounded-full shadow-sm"><MapPin className="text-blue-500" size={20}/></div>
               <div>
                 <p className="font-bold text-slate-900">Rider: {order.rider_name}</p>
                 <p className="text-xs text-slate-500">On the way to you</p>
               </div>
             </div>
             {order.rider_phone && (
               <a href={`tel:${order.rider_phone}`} className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full transition-colors shadow-sm">
                 <Phone size={18} />
               </a>
             )}
           </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
           <h3 className="font-bold text-lg mb-4">Order Details</h3>
           <div className="space-y-3 mb-5">
             {order.items.map((item, i) => (
               <div key={i} className="flex justify-between text-sm">
                 <div className="pr-4">
                   <span className="font-bold">{item.quantity}x</span> {item.name}
                   {item.variants && item.variants.length > 0 && (
                     <p className="text-xs text-slate-500 mt-0.5 ml-4">{item.variants.map(v => v.name).join(', ')}</p>
                   )}
                 </div>
                 <div className="font-medium whitespace-nowrap">Rs {item.unit_price * item.quantity}</div>
               </div>
             ))}
           </div>
           
           <div className="border-t border-slate-100 pt-4 space-y-2 text-sm text-slate-500">
             <div className="flex justify-between"><span>Subtotal</span><span>Rs {order.subtotal}</span></div>
             <div className="flex justify-between"><span>Delivery Fee</span><span>{order.delivery_fee > 0 ? `Rs ${order.delivery_fee}` : 'FREE'}</span></div>
             <div className="flex justify-between font-black text-lg text-slate-900 pt-2">
               <span>Total</span>
               <span className="text-primary">Rs {order.total}</span>
             </div>
           </div>
           <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
             <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment</p>
               <p className="font-semibold text-slate-800">{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Transfer'}</p>
             </div>
             <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Delivery to</p>
               <p className="font-semibold text-slate-800 truncate">{order.customer_name}</p>
               <p className="text-xs text-slate-500 line-clamp-2">{order.delivery_address}</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
