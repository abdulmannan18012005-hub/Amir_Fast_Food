import { createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { updateOrderStatus, getKitchenOrders } from '../../server/order';
import { playKitchenDing, initAudio } from '../../lib/sound';
import { Clock, CheckCircle, ChefHat, Truck, XCircle, Volume2, VolumeX, BellRing } from 'lucide-react';

export const Route = createFileRoute('/admin/kitchen')({
  component: KitchenKDS,
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex' }]
  })
});

function KitchenKDS() {
  const [orders, setOrders] = useState<any[]>([]);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('admin_pin') !== null;
  });
  const [connState, setConnState] = useState<'Live' | 'Reconnecting...' | 'Offline'>('Live');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Tick for "x min ago"
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000); // 15s ticks
    return () => clearInterval(timer);
  }, []);

  const fetchOrders = async () => {
    const savedPin = sessionStorage.getItem('admin_pin') || '';
    try {
      const data = await getKitchenOrders({ data: { pin: savedPin } });
      setOrders(data || []);
    } catch (e: any) {
      if (e.message?.includes('Unauthorized')) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_pin');
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrders();

    const channel = supabaseBrowser.channel('kitchen_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        fetchOrders();
        if (payload.eventType === 'INSERT' && soundEnabled) {
          playKitchenDing();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnState('Live');
        else if (status === 'CLOSED') setConnState('Offline');
        else setConnState('Reconnecting...');
      });

    const poll = setInterval(fetchOrders, 15000); // 15s polling fallback

    return () => {
      supabaseBrowser.removeChannel(channel);
      clearInterval(poll);
    };
  }, [isAuthenticated, soundEnabled]);

  // Repeat ding for received orders
  useEffect(() => {
    if (!soundEnabled || !isAuthenticated) return;
    const hasReceived = orders.some(o => o.status === 'received');
    if (hasReceived) {
      const dingTimer = setInterval(() => {
        playKitchenDing();
      }, 20000);
      return () => clearInterval(dingTimer);
    }
  }, [orders, soundEnabled, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    initAudio(); // Resume AudioContext on user gesture
    
    try {
      await getKitchenOrders({ data: { pin } });
      sessionStorage.setItem('admin_pin', pin);
      setIsAuthenticated(true);
    } catch (e: any) {
      setErrorMsg(e.message || 'Invalid PIN');
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    const savedPin = sessionStorage.getItem('admin_pin') || '';
    try {
      await updateOrderStatus({ data: { orderId, status, pin: savedPin } });
      fetchOrders();
    } catch(e: any) {
      alert(e.message);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      handleStatusUpdate(orderId, 'canceled');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
          <div className="flex justify-center mb-6 text-primary">
            <ChefHat size={48} />
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-6">Kitchen Display System</h2>
          {errorMsg && <p className="text-red-400 text-sm mb-4 text-center">{errorMsg}</p>}
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-primary text-center tracking-[0.5em] text-lg"
            placeholder="****"
            maxLength={4}
            autoFocus
          />
          <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-colors">
            Unlock KDS
          </button>
        </form>
      </div>
    );
  }

  const renderTicket = (order: any) => {
    const elapsedMins = Math.floor((now - new Date(order.created_at).getTime()) / 60000);
    const isUrgent = elapsedMins > 15 && order.status !== 'out_for_delivery';
    
    return (
      <div key={order.id} className={`bg-slate-800 rounded-xl p-4 shadow-sm border-l-4 ${isUrgent ? 'border-l-red-500 bg-red-900/10' : 'border-l-primary'} border-t border-r border-b border-t-slate-700 border-r-slate-700 border-b-slate-700 flex flex-col gap-3 relative`}>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs text-slate-400 font-mono">#{order.id.slice(0,6)}</span>
            <h3 className="font-bold text-white text-lg">{order.customer_name}</h3>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`px-2 py-1 rounded text-xs font-bold ${order.payment_method === 'cod' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {order.payment_method === 'cod' ? 'COD' : 'PAID'}
            </div>
            <span className={`text-sm font-medium flex items-center gap-1 ${isUrgent ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
              <Clock size={14} /> {elapsedMins} min ago
            </span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <ul className="space-y-2">
            {(order.order_items || []).map((item: any) => (
              <li key={item.id} className="flex justify-between text-sm text-slate-200">
                <span className="font-medium text-white">{item.quantity}x {item.menu_items?.name || 'Item'}</span>
                {item.selected_variants?.length > 0 && (
                  <span className="text-xs text-slate-400 ml-2">({item.selected_variants.map((v:any)=>v.name).join(', ')})</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <p>📞 <a href={`tel:${order.customer_phone}`} className="hover:text-white underline">{order.customer_phone}</a></p>
          <p>📍 {order.delivery_address}</p>
          {order.distance_km && <p>🛣️ Distance: {order.distance_km.toFixed(1)} km</p>}
        </div>

        <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-700">
          <span className="font-bold text-emerald-400">Total: Rs {order.total_amount + order.delivery_fee}</span>
          
          <div className="flex gap-2">
            {order.status === 'received' && (
              <>
                <button onClick={() => handleStatusUpdate(order.id, 'preparing')} className="bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                  Prep Food
                </button>
                <button onClick={() => handleStatusUpdate(order.id, 'out_for_delivery')} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  Skip to Delivery
                </button>
              </>
            )}
            
            {order.status === 'preparing' && (
              <button onClick={() => handleStatusUpdate(order.id, 'out_for_delivery')} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                Dispatch
              </button>
            )}

            {order.status === 'out_for_delivery' && (
              <button onClick={() => handleStatusUpdate(order.id, 'delivered')} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                Mark Completed
              </button>
            )}
            
            <button onClick={() => handleCancel(order.id)} className="text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-4 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 bg-slate-800 p-4 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-4">
          <ChefHat className="text-primary" size={32} />
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Kitchen KDS</h1>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${connState === 'Live' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-slate-400">{connState}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => { playKitchenDing(); }} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg text-white transition-colors" title="Test Sound">
            <BellRing size={20} />
          </button>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button onClick={() => { sessionStorage.removeItem('admin_pin'); setIsAuthenticated(false); }} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors">
            Lock
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Col 1: Received */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
            <h2 className="font-bold text-white flex items-center gap-2"><Clock className="text-primary" size={18}/> Received</h2>
            <span className="bg-slate-700 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {orders.filter(o => o.status === 'received').length}
            </span>
          </div>
          <div className="space-y-4">
            {orders.filter(o => o.status === 'received').map(renderTicket)}
          </div>
        </div>

        {/* Col 2: Preparing */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
            <h2 className="font-bold text-white flex items-center gap-2"><ChefHat className="text-orange-400" size={18}/> Preparing</h2>
            <span className="bg-slate-700 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {orders.filter(o => o.status === 'preparing').length}
            </span>
          </div>
          <div className="space-y-4">
            {orders.filter(o => o.status === 'preparing').map(renderTicket)}
          </div>
        </div>

        {/* Col 3: Dispatch */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
            <h2 className="font-bold text-white flex items-center gap-2"><Truck className="text-blue-400" size={18}/> Out for Delivery</h2>
            <span className="bg-slate-700 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {orders.filter(o => o.status === 'out_for_delivery').length}
            </span>
          </div>
          <div className="space-y-4">
            {orders.filter(o => o.status === 'out_for_delivery').map(renderTicket)}
          </div>
        </div>
      </div>
    </div>
  );
}
