import React, { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { Clock, MapPin, CheckCircle, ChefHat } from 'lucide-react';

export function OrderTracker() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check local storage for active order
    const checkOrder = () => {
      const active = localStorage.getItem('active_order');
      if (active) setOrderId(active);
    };
    checkOrder();
    window.addEventListener('cartUpdated', checkOrder);
    return () => window.removeEventListener('cartUpdated', checkOrder);
  }, []);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      const { data } = await supabaseBrowser
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (data) {
        setOrder(data);
        if (data.status === 'delivered' || data.status === 'canceled') {
          setTimeout(() => {
            localStorage.removeItem('active_order');
            setOrderId(null);
            setOrder(null);
          }, 10000); // clear after 10 sec of completion
        }
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 30000); // Poll every 30s as fallback
    return () => clearInterval(interval);
  }, [orderId]);

  if (!orderId || !order) return null;

  // Calculate standard 30 min progress
  const start = new Date(order.created_at).getTime();
  const now = Date.now();
  const elapsedMinutes = (now - start) / 60000;
  
  let phase = 1;
  let label = 'Received';
  let Icon = CheckCircle;
  let riderInfo = null;

  if (order.status === 'delivered') { phase = 4; label = 'Delivered'; }
  else if (order.status === 'out_for_delivery') { phase = 3; label = 'Out for Delivery'; Icon = MapPin; riderInfo = order.rider_name; }
  else if (order.status === 'preparing') { phase = 2; label = 'Preparing'; Icon = ChefHat; }
  else {
    // time-based fallback if status hasn't synced
    if (elapsedMinutes > 22.5) { phase = 4; label = 'Delivered'; }
    else if (elapsedMinutes > 15) { phase = 3; label = 'Out for Delivery'; Icon = MapPin; }
    else if (elapsedMinutes > 7.5) { phase = 2; label = 'Preparing'; Icon = ChefHat; }
  }

  const progress = Math.min(100, Math.max(0, (elapsedMinutes / 30) * 100));

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg shadow-primary/30 flex items-center gap-3 cursor-pointer animate-in slide-in-from-bottom-8 w-[90%] sm:w-[400px] hover:scale-105 transition-transform"
      >
        <div className="bg-white/20 p-2 rounded-full animate-pulse">
          <Clock size={20} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium opacity-90">Order {label}</p>
          <div className="w-full bg-primary-foreground/20 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Order Status</h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground p-1 rounded-full bg-muted">✕</button>
            </div>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-card ${phase >= 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow`}>
                  <CheckCircle size={18} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-muted p-4 rounded-xl border border-border">
                  <h4 className="font-bold text-sm">Order Received</h4>
                  <p className="text-xs text-muted-foreground mt-1">Kitchen has received your order.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-card ${phase >= 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow`}>
                  <ChefHat size={18} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-muted p-4 rounded-xl border border-border">
                  <h4 className="font-bold text-sm">Preparing</h4>
                  <p className="text-xs text-muted-foreground mt-1">Cooking your delicious food.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-card ${phase >= 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow`}>
                  <MapPin size={18} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-muted p-4 rounded-xl border border-border">
                  <h4 className="font-bold text-sm">Out for Delivery</h4>
                  <p className="text-xs text-muted-foreground mt-1">Your order is on the way!</p>
                  {phase >= 3 && riderInfo && (
                    <div className="mt-3 bg-card rounded-lg p-2 flex flex-col gap-2 border border-primary/20">
                      <span className="text-xs font-semibold text-primary">Rider: {riderInfo}</span>
                      {order.rider_phone && (
                         <a href={`tel:${order.rider_phone}`} className="text-xs bg-primary/10 text-primary py-1 px-2 rounded-md font-bold text-center block w-full hover:bg-primary hover:text-white transition-colors">📞 {order.rider_phone}</a>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
