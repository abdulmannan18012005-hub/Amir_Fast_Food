import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { getPublicOrder } from '../../server/order';

export const Route = createFileRoute('/orders/$orderId')({
  component: OrderTrackingPage,
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex' }]
  })
});

function OrderTrackingPage() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [swRegistered, setSwRegistered] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = () => {
    if ('serviceWorker' in navigator) { 
      navigator.serviceWorker.register('/sw.js').then(() => setSwRegistered(true)).catch(console.error); 
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then(p => setNotificationPermission(p));
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getPublicOrder({ data: { orderId } });
        if (data) setOrder(data);
      } catch(e) {}
    };
    fetchOrder();

    const channel = supabaseBrowser.channel(`order_${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
        fetchOrder();
        if (notificationPermission === 'granted') {
          new Notification('Order Update!', {
            body: `Your order status has been updated!`,
            icon: '/vite.svg'
          });
          const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
          audio.play().catch(e => console.error(e));
        }
      })
      .subscribe();

    const interval = setInterval(fetchOrder, 10000); // 10s polling

    return () => {
      supabaseBrowser.removeChannel(channel);
      clearInterval(interval);
    };
  }, [orderId, notificationPermission]);

  const stages = [
    { id: 'received', label: 'Received', desc: 'We have received your order.' },
    { id: 'preparing', label: 'Preparing', desc: 'Your food is being cooked.' },
    { id: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider is on the way.' },
    { id: 'delivered', label: 'Delivered', desc: 'Enjoy your meal!' }
  ];

  const getStageIndex = () => {
    if (!order) return 0;
    const idx = stages.findIndex(s => s.id === order.status);
    return idx === -1 ? 0 : idx;
  };

  const currentStage = getStageIndex();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 w-full">
      <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
        
        {/* Top Header */}
        <div className="h-48 bg-slate-900 relative border-b border-slate-700 flex flex-col items-center justify-center overflow-hidden">
          {/* CSS Progress Bike */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500 via-slate-900 to-slate-900"></div>
          
          <div className="relative w-full max-w-md h-12 flex items-center mt-6">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-0 h-1 bg-red-500 -translate-y-1/2 transition-all duration-1000" style={{ width: `${(currentStage / 3) * 100}%` }}></div>
            <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 text-3xl z-10" style={{ left: `calc(${(currentStage / 3) * 100}% - 1.5rem)` }}>
              🚲
            </div>
          </div>

          <div className="z-10 mt-6 bg-slate-800/80 backdrop-blur px-6 py-3 rounded-full border border-slate-700 shadow-lg flex items-center gap-3 transition-transform">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-white font-bold tracking-wide">
              {stages[currentStage]?.label || 'Loading...'}
            </span>
          </div>
        </div>

        {/* Tracking Details */}
        <div className="p-8">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Order #{orderId.slice(0,8)}</h1>
            </div>
            <span className="text-slate-400 font-mono text-sm">Usually about 30–40 minutes</span>
          </div>

          {notificationPermission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
            <button onClick={handleEnableNotifications} className="mb-8 w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-xl transition-colors">
              🔔 Enable Notifications
            </button>
          )}

          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
            {stages.map((s, idx) => {
              const isPast = idx < currentStage;
              const isActive = idx === currentStage;
              return (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-800 bg-slate-900 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors z-10" style={{
                    backgroundColor: isPast || isActive ? '#DC2626' : '#1E293B',
                    borderColor: '#0F172A',
                    color: isPast || isActive ? 'white' : '#64748B'
                  }}>
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-800/50 p-4 rounded border border-slate-700/50 shadow">
                    <h3 className={`font-bold ${isPast || isActive ? 'text-white' : 'text-slate-500'}`}>{s.label}</h3>
                    <p className={`text-sm ${isPast || isActive ? 'text-slate-300' : 'text-slate-600'}`}>{s.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
