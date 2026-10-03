import { createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { updateOrderStatus } from '../../server/order';
import { playKitchenDing } from '../../lib/sound';
import { Clock, CheckCircle, ChefHat } from 'lucide-react';

export const Route = createFileRoute('/admin/kitchen')({
  component: KitchenKDS,
});

function KitchenKDS() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('kitchen_auth');
      if (stored && Date.now() - parseInt(stored) < 300000) return true; // valid for 5 min
    }
    return false;
  });
  const [pin, setPin] = useState('');
    

  useEffect(() => {
    if (!isAuthenticated) return;
    // Initial fetch
    const fetchOrders = async () => {
      const { data } = await supabaseBrowser
        .from('orders')
        .select('*')
        .in('status', ['received', 'preparing'])
        .order('created_at', { ascending: true });
      if (data) setOrders(data);
    };
    fetchOrders();

    // Subscribe to new/updated orders
    const channel = supabaseBrowser.channel('kds_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          playKitchenDing();
          setOrders(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => {
            const updated = payload.new;
            if (updated.status === 'delivered' || updated.status === 'canceled') {
              return prev.filter(o => o.id !== updated.id);
            }
            return prev.map(o => o.id === updated.id ? updated : o);
          });
        }
      })
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const handleBump = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus({ data: { orderId, status: newStatus } });
      // UI optimistic update is optional since the websocket will catch it
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card border border-border p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
          <ChefHat className="text-primary w-16 h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Kitchen Access</h1>
          <p className="text-muted-foreground mb-6 text-sm">Enter the admin PIN to access the KDS.</p>
          <input 
            type="password" 
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-white border border-border text-slate-900 text-center text-xl tracking-[0.5em] rounded-xl py-3 mb-4 focus:outline-none focus:border-primary"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pin === '7864') { setIsAuthenticated(true); sessionStorage.setItem('kitchen_auth', Date.now().toString()); }
                else { alert('Incorrect PIN!'); setPin(''); }
              }
            }}
          />
          <button 
            onClick={() => {
              if (pin === '7864') { setIsAuthenticated(true); sessionStorage.setItem('kitchen_auth', Date.now().toString()); }
              else { alert('Incorrect PIN!'); setPin(''); }
            }}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-colors"
          >
            Unlock KDS
          </button>
        </div>
      </div>
    );
  }

  const receivedOrders = orders.filter(o => o.status === 'received');
  const preparingOrders = orders.filter(o => o.status === 'preparing');

  const OrderCard = ({ order, nextStatus, label, icon: Icon, btnColor }: any) => (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-2">
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-white font-bold text-lg">#{order.id.slice(0, 8)}</h4>
        <span className="text-slate-400 text-xs">{new Date(order.created_at).toLocaleTimeString()}</span>
      </div>
      <p className="text-slate-300 mb-2 font-medium">{order.customer_name}</p>
      <div className="text-sm text-slate-400 mb-4 h-16 overflow-y-auto">
        (Items omitted for KDS view, fetch via RPC/Joins in prod)
      </div>
      <button
        onClick={() => handleBump(order.id, nextStatus)}
        className={`w-full py-2 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-colors ${btnColor}`}
      >
        <Icon size={18} /> {label}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <ChefHat className="text-red-500" size={32} />
            Kitchen Display System
          </h1>
          <p className="text-slate-400 mt-1">Live order synchronization.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-green-400 text-sm font-medium">Realtime Active</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Received */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 min-h-[600px]">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">{receivedOrders.length}</span>
            New Orders
          </h2>
          <div className="space-y-4">
            {receivedOrders.map(o => (
              <OrderCard key={o.id} order={o} nextStatus="preparing" label="Start Preparing" icon={Clock} btnColor="bg-amber-600 hover:bg-amber-500" />
            ))}
            {receivedOrders.length === 0 && <p className="text-slate-500 text-center py-10">No new orders.</p>}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 min-h-[600px]">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">{preparingOrders.length}</span>
            Preparing
          </h2>
          <div className="space-y-4">
            {preparingOrders.map(o => (
              <OrderCard key={o.id} order={o} nextStatus="out_for_delivery" label="Mark Ready" icon={CheckCircle} btnColor="bg-emerald-600 hover:bg-emerald-500" />
            ))}
            {preparingOrders.length === 0 && <p className="text-slate-500 text-center py-10">No orders currently preparing.</p>}
          </div>
        </div>

        {/* Column 3: Ready / Completed */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 min-h-[600px] opacity-75">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            Ready for Pickup / Delivery
          </h2>
          <p className="text-slate-500 text-center py-10">Moved to dispatch queue automatically.</p>
        </div>

      
        {/* Out For Delivery Column */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col max-h-[85vh]">
          <div className="flex items-center gap-3 mb-6 bg-blue-600/10 p-3 rounded-lg border border-blue-600/20 text-blue-600">
            <CheckCircle className="w-6 h-6" />
            <h2 className="text-xl font-black uppercase tracking-wider">Out for Delivery</h2>
            <span className="ml-auto bg-blue-600 text-white text-sm py-1 px-3 rounded-full font-bold">
              {orders.filter((o) => o.status === 'out_for_delivery').length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {orders
              .filter((o) => o.status === 'out_for_delivery')
              .map((order) => (
                <div key={order.id} className="bg-muted p-4 rounded-xl border border-border flex flex-col relative overflow-hidden shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-sm bg-background px-2 py-1 rounded font-bold border border-border">
                      #{order.id.slice(0, 5).toUpperCase()}
                    </span>
                    <div className="flex gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${order.payment_method === 'cod' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                        {order.payment_method === 'cod' ? 'CASH ON DELIVERY' : 'ONLINE PAID'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm bg-background p-3 rounded-md mb-4 border border-border">
                    <p className="font-bold">{order.customer_name} - {order.customer_phone}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{order.delivery_address}</p>
                    <p className="text-xs font-semibold text-primary mt-2">Distance Check: Pending (+PKR 0)</p>
                  </div>

                  <ul className="space-y-3 mb-4">
                    {order.order_items.map((item: any) => (
                      <li key={item.id} className="flex gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                        <span className="font-black text-primary bg-primary/10 px-2 py-1 rounded h-fit">{item.quantity}x</span>
                        <span className="font-bold text-foreground mt-1">{item.menu_items.name}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleBump(order.id, 'delivered')}
                    className="w-full mt-auto bg-gray-800 text-white font-bold py-3 rounded-lg shadow hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    ✅ Mark Completed
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}