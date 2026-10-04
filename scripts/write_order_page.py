import os

order_page_code = """import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useLiveOrder } from '../../hooks/useLiveOrder';
import { ChevronLeft, RefreshCw, CheckCircle, Clock, MapPin, ChefHat, XCircle } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { ORDER_STATUS_CONFIG } from '../../lib/orderStatus';

export const Route = createFileRoute('/orders/$orderId')({
  component: OrderPage,
});

function OrderPage() {
  const { orderId } = Route.useParams();
  const { order, loading, error } = useLiveOrder(orderId);

  if (loading && !order) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-32 max-w-2xl flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Loading your order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-32 max-w-2xl text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
        <p className="text-muted-foreground mb-8">We couldn't find an order with this ID. It may be invalid or very old.</p>
        <Link to="/" className="text-primary font-bold hover:underline">Return Home</Link>
      </div>
    );
  }

  const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.received;

  return (
    <div className="container mx-auto px-4 pt-24 pb-32 max-w-2xl animate-in fade-in zoom-in-95">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ChevronLeft size={20} />
        <span className="font-semibold">Back to Home</span>
      </Link>

      {/* Status Card */}
      <div className="bg-white rounded-3xl p-8 text-center shadow-lg border border-slate-100 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-orange-400" />
        
        <div className="text-6xl mb-6">{config.emoji}</div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">{config.label}</h1>
        <p className="text-lg text-muted-foreground font-medium mb-6">{config.customerText}</p>
        
        <div className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Order ID</span>
          <span className="font-mono font-bold text-slate-900">{order.shortCode}</span>
        </div>
      </div>

      {order.status === 'out_for_delivery' && order.rider_name && (
         <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20 mb-6 flex items-center gap-4">
           <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
             <MapPin className="text-primary" size={24} />
           </div>
           <div className="flex-1 min-w-0">
             <h3 className="font-bold text-slate-900 truncate">Rider: {order.rider_name}</h3>
             {order.rider_phone && <p className="text-slate-500 text-sm mt-0.5 truncate">{order.rider_phone}</p>}
           </div>
           {order.rider_phone && (
             <a href={`tel:${order.rider_phone}`} className="flex-shrink-0 bg-primary text-white font-bold py-2 px-4 rounded-xl shadow-sm hover:bg-primary/90">
               Call
             </a>
           )}
         </div>
      )}

      {order.status === 'canceled' && order.cancel_reason && (
         <div className="bg-red-50 rounded-2xl p-6 border border-red-100 mb-6">
           <h3 className="font-bold text-red-900 mb-1 flex items-center gap-2">
             <XCircle size={18} /> Cancellation Reason
           </h3>
           <p className="text-red-800 text-sm">{order.cancel_reason}</p>
         </div>
      )}

      {/* Details Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-bold text-lg mb-4">Order Summary</h3>
        
        <div className="space-y-4 mb-6">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-sm">
              <div className="flex-1 pr-4">
                <span className="font-semibold">{item.quantity}x</span> {item.name}
                {item.variants && item.variants.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.variants.map((v:any) => v.name).join(', ')}
                  </p>
                )}
              </div>
              <div className="font-medium">PKR {item.unit_price * item.quantity}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2 text-sm text-slate-500">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>PKR {order.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span>{Number(order.delivery_fee) === 0 ? 'FREE' : `PKR ${order.delivery_fee}`}</span>
          </div>
          <div className="flex justify-between font-black text-lg text-slate-900 pt-2 border-t border-slate-100 mt-2">
            <span>Total</span>
            <span className="text-primary">PKR {order.total}</span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-xs">Payment</p>
            <p className="font-medium text-slate-900">
              {order.payment_method === 'cod' ? 'Cash on Delivery' : 
               order.payment_method === 'online_transfer' ? 'Online Transfer' : order.payment_method}
            </p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-xs">Date</p>
            <p className="font-medium text-slate-900">
              {new Date(order.created_at).toLocaleString('en-PK', { 
                timeZone: 'Asia/Karachi',
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-xs">Delivery To</p>
            <p className="font-medium text-slate-900">{order.customer_name}</p>
            <p className="text-slate-600 mt-0.5">{order.delivery_address}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

with open("src/routes/orders/$orderId.tsx", "w", encoding="utf-8") as f:
    f.write(order_page_code)
