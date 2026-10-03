import { createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useState, useRef } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { updateOrderStatus, getKitchenOrders } from '../../server/order';
import { playKitchenDing, initAudio } from '../../lib/sound';
import { Clock, CheckCircle, ChefHat, Truck, XCircle, Volume2, VolumeX } from 'lucide-react';

export const Route = createFileRoute('/admin/kitchen')({
  component: KitchenKDS,
});

function KitchenKDS() {
  const [orders, setOrders] = useState<any[]>([]);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('admin_pin') === '7864';
  });
  const [connState, setConnState] = useState<'Live' | 'Reconnecting…' | 'Offline — retrying'>('Live');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Tick for "x min ago"
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '7864') {
      sessionStorage.setItem('admin_pin', pin);
      initAudio(); // Init audio context on user interaction
      setIsAuthenticated(true);
    } else {
      setPin('');
    }
  };

  const fetchAllOrders = async () => {
    try {
      const data = await getKitchenOrders({ data: { pin: sessionStorage.getItem('admin_pin') || '' } });
      setOrders(data);
      setLastUpdated(new Date());
      setConnState('Live');
    } catch (e) {
      console.error(e);
      setConnState('Offline — retrying');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAllOrders();

    // Polling safety net
    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAllOrders();
      }
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchAllOrders();
    };
    const handleOnline = () => fetchAllOrders();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    // Realtime channel
    const channel = supabaseBrowser.channel('kds_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          // Re-fetch everything to ensure we have items (since items aren't in the payload)
          // and to ensure we don't have race conditions.
          if (payload.eventType === 'INSERT' && soundEnabled) {
             playKitchenDing();
          }
          fetchAllOrders();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnState('Live');
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') setConnState('Offline — retrying');
      });

    return () => {
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      supabaseBrowser.removeChannel(channel);
    };
  }, [isAuthenticated, soundEnabled]);

  const handleBump = async (orderId: string, newStatus: string) => {
    try {
      // Optimistic
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      await updateOrderStatus({ data: { orderId, status: newStatus, pin: sessionStorage.getItem('admin_pin') || '' } });
    } catch (e) {
      console.error(e);
      fetchAllOrders(); // rollback
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <ChefHat className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white text-center mb-6">Kitchen Login</h1>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-slate-700 text-white border-0 rounded-xl p-4 text-center text-xl mb-4 focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl">
            Unlock KDS
          </button>
        </form>
      </div>
    );
  }

  const received = orders.filter(o => o.status === 'received');
  const preparing = orders.filter(o => o.status === 'preparing');
  const outForDelivery = orders.filter(o => o.status === 'out_for_delivery');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans">
      <div className="flex justify-between items-center mb-6 bg-slate-900 p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <ChefHat className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-black">KITCHEN DISPLAY</h1>
          <div className="flex items-center gap-2 ml-4">
            <span className={`w-3 h-3 rounded-full ${connState === 'Live' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
            <span className="text-sm text-slate-400">{connState} - Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => { setSoundEnabled(!soundEnabled); if(!soundEnabled) playKitchenDing(); }} className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
            {soundEnabled ? <Volume2 className="w-5 h-5 text-green-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Column title="RECEIVED" count={received.length} items={received} onBump={handleBump} now={now} />
        <Column title="PREPARING" count={preparing.length} items={preparing} onBump={handleBump} now={now} />
        <Column title="OUT FOR DELIVERY" count={outForDelivery.length} items={outForDelivery} onBump={handleBump} now={now} />
      </div>
    </div>
  );
}

function Column({ title, count, items, onBump, now }: { title: string, count: number, items: any[], onBump: any, now: number }) {
  return (
    <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800 min-h-[80vh] flex flex-col">
      <h2 className="text-xl font-bold mb-4 flex justify-between items-center pb-2 border-b border-slate-800">
        {title} <span className="bg-slate-800 px-3 py-1 rounded-full text-sm">{count}</span>
      </h2>
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {items.map(order => (
          <OrderCard key={order.id} order={order} onBump={onBump} now={now} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, onBump, now }: { order: any, onBump: any, now: number }) {
  const elapsed = Math.floor((now - new Date(order.created_at).getTime()) / 60000);
  const isPaid = order.payment_method === 'online_transfer';
  const ageColor = elapsed > 20 ? 'text-red-400' : elapsed > 10 ? 'text-amber-400' : 'text-green-400';

  return (
    <div className="bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-700">
        <div>
          <span className="font-mono font-bold text-lg text-white">#{order.id.slice(0,5).toUpperCase()}</span>
          <div className={`flex items-center gap-1 text-sm font-semibold ${ageColor}`}>
            <Clock className="w-4 h-4" /> {elapsed} min ago
          </div>
        </div>
        <div className={`px-3 py-1 rounded-md font-black text-sm ${isPaid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {isPaid ? 'PAID' : 'COD'}
        </div>
      </div>

      <div className="mb-4 text-sm text-slate-300">
        <p className="font-bold text-white text-base">{order.customer_name}</p>
        <a href={`tel:${order.customer_phone}`} className="text-blue-400 hover:underline block mb-1">{order.customer_phone}</a>
        <p className="line-clamp-2 leading-snug">{order.delivery_address}</p>
      </div>

      <div className="bg-slate-900 rounded-lg p-3 mb-4 space-y-2">
        {order.order_items?.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="font-semibold text-white">{item.quantity}x {item.menu_items?.name || item.menu_item_id}</span>
            <span className="text-slate-400">PKR {item.unit_price}</span>
          </div>
        ))}
        {!isPaid && (
          <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between font-bold text-white">
            <span>Collect:</span>
            <span>PKR {order.total_amount}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        {order.status === 'received' && (
          <>
            <button onClick={() => onBump(order.id, 'preparing')} className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
              <ChefHat className="w-5 h-5" /> Prep Food
            </button>
            <button onClick={() => onBump(order.id, 'out_for_delivery')} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg text-sm">
              Skip to Delivery
            </button>
            <button onClick={() => { if(confirm('Cancel order?')) onBump(order.id, 'canceled') }} className="bg-red-900/50 hover:bg-red-900 text-red-200 font-bold py-2 rounded-lg text-sm">
              Cancel
            </button>
          </>
        )}
        {order.status === 'preparing' && (
          <button onClick={() => onBump(order.id, 'out_for_delivery')} className="col-span-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
            <Truck className="w-5 h-5" /> Dispatch
          </button>
        )}
        {order.status === 'out_for_delivery' && (
          <button onClick={() => onBump(order.id, 'delivered')} className="col-span-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" /> Mark Completed
          </button>
        )}
      </div>
    </div>
  );
}