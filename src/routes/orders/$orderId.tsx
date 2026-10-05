import React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useLiveOrder } from '../../hooks/useLiveOrder';
import { usePushSetup } from '../../hooks/usePushSetup';
import { OrderStatusView } from '../../components/orders/OrderStatusView';
import { ChevronLeft, RefreshCw, XCircle } from 'lucide-react';

export const Route = createFileRoute('/orders/$orderId')({
  component: OrderPage,
  head: () => ({
    meta: [
      { title: 'Track Order | AMR Fast Food' }
    ]
  })
});

function OrderPage() {
  const { orderId } = Route.useParams();
  const { order, loading, error } = useLiveOrder(orderId);
  const { enableOrderNotifications } = usePushSetup();

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

  return (
    <div className="container mx-auto max-w-2xl h-screen flex flex-col bg-slate-50 relative pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-slate-200">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="font-bold text-lg text-slate-900">Track Order</h1>
      </div>

      <div className="flex-1 overflow-hidden">
         <OrderStatusView 
            order={order} 
            onNotify={() => enableOrderNotifications(order.id)} 
         />
      </div>
    </div>
  );
}
