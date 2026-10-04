import os

kitchen_code = """import { createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { updateOrderStatus, getKitchenOrders } from '../../server/order';
import { playKitchenDing, initAudio } from '../../lib/sound';
import { PinGate } from '../../components/admin/PinGate';
import { Clock, CheckCircle, ChefHat, Truck, XCircle, Volume2, VolumeX, BellRing, Printer, AlertTriangle } from 'lucide-react';
import { safeJson } from '../../lib/storage';

export const Route = createFileRoute('/admin/kitchen')({
  component: KitchenKDSRoute,
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex' }]
  })
});

function KitchenKDSRoute() {
  return (
    <PinGate>
      <KitchenKDS />
    </PinGate>
  );
}

function KitchenKDS() {
  const [orders, setOrders] = useState<any[]>([]);
  const [connState, setConnState] = useState<'Live' | 'Reconnecting...' | 'Offline'>('Live');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);

  // Modals
  const [cancelModalOpen, setCancelModalOpen] = useState<{ id: string, expected: any } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  
  const [dispatchModalOpen, setDispatchModalOpen] = useState<{ id: string, expected: any } | null>(null);
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');

  // Wake Lock
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          setWakeLockEnabled(true);
          wakeLock.addEventListener('release', () => {
            setWakeLockEnabled(false);
          });
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    };
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) wakeLock.release();
    };
  }, []);

  // Tick for "x min ago"
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000); // 15s ticks
    return () => clearInterval(timer);
  }, []);

  const fetchOrders = async () => {
    const pin = safeJson('admin_pin', '');
    try {
      const data = await getKitchenOrders({ data: { pin } });
      setOrders(data);
      setConnState('Live');
    } catch (e: any) {
      if (e.message?.includes('Unauthorized')) {
        sessionStorage.removeItem('admin_pin');
        window.location.reload();
      }
    }
  };

  useEffect(() => {
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
        else if (status === 'TIMED_OUT' || status === 'CLOSED') setConnState('Offline');
      });

    // Network status
    const onOnline = () => setConnState('Reconnecting...');
    const onOffline = () => setConnState('Offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Fallback polling
    const poll = setInterval(() => {
       if (document.visibilityState === 'visible') fetchOrders();
    }, 15000);

    return () => {
      supabaseBrowser.removeChannel(channel);
      clearInterval(poll);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [soundEnabled]);

  // Repeat ding for received orders
  useEffect(() => {
    if (!soundEnabled) return;
    const hasReceived = orders.some(o => o.status === 'received');
    if (hasReceived) {
      const dingTimer = setInterval(() => {
        playKitchenDing();
      }, 20000); // Repeat ding every 20s if pending
      return () => clearInterval(dingTimer);
    }
  }, [orders, soundEnabled]);

  const handleStatusUpdate = async (orderId: string, status: any, reason?: string, riderN?: string, riderP?: string, expectedFrom?: any) => {
    const savedPin = safeJson('admin_pin', '');
    try {
      await updateOrderStatus({ data: { 
        orderId, 
        status, 
        pin: savedPin,
        reason,
        riderName: riderN,
        riderPhone: riderP,
        expectedFrom
      }});
      fetchOrders();
    } catch (e: any) {
      alert(e.message || 'Failed to update order');
      fetchOrders();
    }
  };

  const handlePrint = (order: any) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    
    let itemsHtml = order.order_items.map((i:any) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div><b>${i.quantity}x</b> ${i.menu_items?.name || 'Item'}
          ${i.selected_variants?.length > 0 ? `<br><small>${i.selected_variants.map((v:any) => v.name).join(', ')}</small>` : ''}
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
      <head>
        <style>
          body { font-family: monospace; padding: 20px; font-size: 14px; max-width: 300px; margin: 0 auto; color: black; background: white; }
          .header { text-align: center; border-bottom: 1px dashed black; padding-bottom: 10px; margin-bottom: 10px; }
          .footer { text-align: center; border-top: 1px dashed black; padding-top: 10px; margin-top: 20px; }
          .row { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>AMR Fast Food</h2>
          <p>Order #${order.id.slice(0,8).toUpperCase()}</p>
          <p>${new Date(order.created_at).toLocaleString()}</p>
        </div>
        <p><b>Customer:</b> ${order.customer_name}</p>
        <p><b>Phone:</b> ${order.customer_phone}</p>
        <p><b>Address:</b> ${order.delivery_address}</p>
        ${order.distance_km ? `<p><b>Distance:</b> ${order.distance_km.toFixed(1)} km</p>` : ''}
        <br/>
        ${itemsHtml}
        <div class="footer">
          <p>Total: PKR ${Number(order.total_amount) + Number(order.delivery_fee)}</p>
          <p><b>Payment:</b> ${order.payment_method === 'cod' ? 'COD' : 'PAID (ONLINE)'}</p>
        </div>
        <script>
          window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((now - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    return `${mins}m ago`;
  };

  const renderCard = (order: any, currentStatus: string) => {
    const minElapsed = Math.floor((now - new Date(order.created_at).getTime()) / 60000);
    const isLate = (currentStatus === 'received' && minElapsed > 5) || (currentStatus === 'preparing' && minElapsed > 25);
    
    return (
      <div key={order.id} className={`bg-slate-800 rounded-xl p-4 border shadow-sm flex flex-col gap-3 transition-colors ${isLate ? 'border-red-500/50 bg-red-950/20' : 'border-slate-700'}`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded">#{order.id.slice(0, 8)}</span>
              {order.payment_method !== 'cod' && (
                <span className="text-[10px] bg-green-900/50 text-green-400 font-bold px-1.5 py-0.5 rounded uppercase">Paid</span>
              )}
            </div>
            <h3 className="font-bold text-white mt-1">{order.customer_name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{order.delivery_address}</p>
            {order.distance_km && <p className="text-xs text-blue-400 mt-0.5">~{order.distance_km.toFixed(1)} km</p>}
          </div>
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isLate ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
            <Clock size={12} /> {timeAgo(order.created_at)}
          </div>
        </div>

        <div className="space-y-2 mt-2">
          {order.order_items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm text-slate-200">
              <div>
                <span className="font-bold text-primary mr-2">{item.quantity}x</span>
                {item.menu_items?.name || 'Unknown Item'}
                {item.selected_variants && item.selected_variants.length > 0 && (
                  <div className="text-xs text-slate-400 ml-6">
                    {item.selected_variants.map((v:any) => v.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-2 pt-3 border-t border-slate-700">
          <button 
             onClick={() => handlePrint(order)}
             className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
             <Printer size={16} /> Print
          </button>
          
          {currentStatus === 'received' && (
            <button 
              onClick={() => handleStatusUpdate(order.id, 'preparing', undefined, undefined, undefined, 'received')}
              className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <ChefHat size={16} /> Accept
            </button>
          )}

          {currentStatus === 'preparing' && (
            <button 
              onClick={() => setDispatchModalOpen({ id: order.id, expected: 'preparing' })}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Truck size={16} /> Dispatch
            </button>
          )}

          {currentStatus === 'out_for_delivery' && (
            <button 
              onClick={() => handleStatusUpdate(order.id, 'delivered', undefined, undefined, undefined, 'out_for_delivery')}
              className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle size={16} /> Delivered
            </button>
          )}

          {(currentStatus === 'received' || currentStatus === 'preparing') && (
             <button 
               onClick={() => setCancelModalOpen({ id: order.id, expected: currentStatus })}
               className="bg-slate-700 hover:bg-red-900/50 text-red-400 hover:text-red-300 py-2 px-3 rounded-lg transition-colors"
               title="Cancel Order"
             >
               <XCircle size={16} />
             </button>
          )}
        </div>
      </div>
    );
  };

  const received = orders.filter(o => o.status === 'received');
  const preparing = orders.filter(o => o.status === 'preparing');
  const outForDelivery = orders.filter(o => o.status === 'out_for_delivery');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <ChefHat className="text-primary" size={28} />
          <h1 className="text-xl font-bold text-white hidden md:block">KDS | AMR Fast Food</h1>
          
          <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
            connState === 'Live' ? 'bg-green-900/40 text-green-400' :
            connState === 'Reconnecting...' ? 'bg-yellow-900/40 text-yellow-400' :
            'bg-red-900/40 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${connState === 'Live' ? 'bg-green-400' : connState === 'Reconnecting...' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
            {connState}
          </div>
          {wakeLockEnabled && (
            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 hidden sm:block">
              Screen Awake
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) {
                initAudio();
                playKitchenDing();
              }
            }}
            className={`p-2 rounded-full transition-colors ${soundEnabled ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button onClick={() => { sessionStorage.removeItem('admin_pin'); window.location.reload(); }} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors">
            Lock
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start p-6">
        {/* Col 1: Received */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <BellRing className="text-primary" size={20} /> Received
            </h2>
            <span className="bg-primary/20 text-primary font-bold px-2.5 py-0.5 rounded-full text-sm">{received.length}</span>
          </div>
          <div className="space-y-4">
            {received.map(o => renderCard(o, 'received'))}
            {received.length === 0 && <p className="text-slate-500 text-sm text-center py-8 font-medium">No new orders</p>}
          </div>
        </div>

        {/* Col 2: Preparing */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <ChefHat className="text-blue-400" size={20} /> Preparing
            </h2>
            <span className="bg-blue-900/40 text-blue-400 font-bold px-2.5 py-0.5 rounded-full text-sm">{preparing.length}</span>
          </div>
          <div className="space-y-4">
            {preparing.map(o => renderCard(o, 'preparing'))}
            {preparing.length === 0 && <p className="text-slate-500 text-sm text-center py-8 font-medium">Clear board</p>}
          </div>
        </div>

        {/* Col 3: Out for Delivery */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <Truck className="text-green-400" size={20} /> Delivery
            </h2>
            <span className="bg-green-900/40 text-green-400 font-bold px-2.5 py-0.5 rounded-full text-sm">{outForDelivery.length}</span>
          </div>
          <div className="space-y-4">
            {outForDelivery.map(o => renderCard(o, 'out_for_delivery'))}
            {outForDelivery.length === 0 && <p className="text-slate-500 text-sm text-center py-8 font-medium">No active deliveries</p>}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-700">
             <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
               <AlertTriangle className="text-red-500" /> Cancel Order
             </h3>
             <p className="text-sm text-slate-400 mb-4">Are you sure you want to cancel this order? The customer will see this reason.</p>
             <textarea 
               value={cancelReason}
               onChange={e => setCancelReason(e.target.value)}
               placeholder="e.g., Rider unavailable, Item out of stock..."
               className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white mb-4 min-h-[100px] focus:border-red-500 outline-none"
             />
             <div className="flex gap-3">
               <button onClick={() => { setCancelModalOpen(null); setCancelReason(''); }} className="flex-1 bg-slate-700 text-white font-bold py-2 rounded-xl">Back</button>
               <button 
                 onClick={() => {
                   if (cancelReason.trim().length < 5) return alert("Please enter a valid reason.");
                   handleStatusUpdate(cancelModalOpen.id, 'canceled', cancelReason, undefined, undefined, cancelModalOpen.expected);
                   setCancelModalOpen(null);
                   setCancelReason('');
                 }} 
                 className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl"
               >
                 Confirm Cancel
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-700">
             <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
               <Truck className="text-blue-500" /> Dispatch Rider
             </h3>
             <p className="text-sm text-slate-400 mb-4">Enter rider details so the customer can track or call them.</p>
             <div className="space-y-3 mb-6">
               <input 
                 type="text" value={riderName} onChange={e => setRiderName(e.target.value)}
                 placeholder="Rider Name (e.g. Ali)"
                 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
               />
               <input 
                 type="tel" value={riderPhone} onChange={e => setRiderPhone(e.target.value)}
                 placeholder="Rider Phone (Optional)"
                 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
               />
             </div>
             <div className="flex gap-3">
               <button onClick={() => { setDispatchModalOpen(null); setRiderName(''); setRiderPhone(''); }} className="flex-1 bg-slate-700 text-white font-bold py-2 rounded-xl">Back</button>
               <button 
                 onClick={() => {
                   if (!riderName.trim()) return alert("Rider Name is required.");
                   handleStatusUpdate(dispatchModalOpen.id, 'out_for_delivery', undefined, riderName, riderPhone, dispatchModalOpen.expected);
                   setDispatchModalOpen(null);
                   setRiderName(''); setRiderPhone('');
                 }} 
                 className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl"
               >
                 Dispatch
               </button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
}
"""

with open("src/routes/admin/kitchen.tsx", "w", encoding="utf-8") as f:
    f.write(kitchen_code)
