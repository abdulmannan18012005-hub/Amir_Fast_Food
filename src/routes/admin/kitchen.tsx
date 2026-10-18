import { friendlyMessage } from '../../lib/errors';
import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../../lib/seo';
import React, { useEffect, useState, useRef } from 'react';
import { updateOrderStatus, getKitchenOrders, verifyPaymentFn } from '../../server/order';
import { playKitchenDing, initAudio } from '../../lib/sound';
import { PinGate } from '../../components/admin/PinGate';
import { AdminNav } from '../../components/admin/AdminNav';
import { Clock, CheckCircle, ChefHat, Truck, XCircle, Volume2, VolumeX, BellRing, Printer, AlertTriangle, Copy } from 'lucide-react';
import { subscribeAdminPushFn, sendTestAdminPushFn, getVapidPublicKeyFn } from '../../server/push';
import { adminCall, clearAdminSession } from '../../lib/adminSession';


function KitchenColumn({
  title,
  icon,
  badgeBg,
  badgeText,
  count,
  orders,
  emptyText,
  renderCard,
  status
}: {
  title: string;
  icon: React.ReactNode;
  badgeBg: string;
  badgeText: string;
  count: number;
  orders: any[];
  emptyText: string;
  renderCard: (o: any, s: string) => React.ReactNode;
  status: string;
}) {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
        <h2 className="font-bold text-lg text-white flex items-center gap-2">
          {icon} {title}
        </h2>
        <span className={`${badgeBg} ${badgeText} font-bold px-2.5 py-0.5 rounded-full text-sm`}>{count}</span>
      </div>
      <div className="space-y-4">
        {orders.map(o => renderCard(o, status))}
        {orders.length === 0 && <p className="text-slate-500 text-sm text-center py-8 font-medium">{emptyText}</p>}
      </div>
    </div>
  );
}


export const Route = createFileRoute('/admin/kitchen')({
  component: KitchenKDSRoute,
  head: () => ({ meta: [{ title: 'Kitchen KDS - Amir Fast Food Admin' }, { name: 'robots', content: 'noindex' }], links: [{ rel: 'manifest', href: '/admin.webmanifest' }] })
});

function KitchenKDSRoute() {
  return (
    <PinGate>
      <AdminNav />
      <KitchenSoundGate>
        <KitchenKDS />
      </KitchenSoundGate>
    </PinGate>
  );
}

function KitchenSoundGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  if (!ready) {
    return (
      <button type="button" onClick={() => { initAudio(); setReady(true); }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white w-full">
        <span className="text-center">
          <Volume2 size={64} className="mx-auto mb-4 text-primary animate-pulse" aria-hidden="true" />
          <span className="block text-3xl font-black">Tap to enable kitchen sound</span>
        </span>
      </button>
    );
  }
  return <>{children}</>;
}

function KitchenKDS() {
  const [orders, setOrders] = useState<any[]>([]);
  const [connStatus, setConnStatus] = useState<'live' | 'reconnecting' | 'offline'>('live');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [dbMigrationNeeded, setDbMigrationNeeded] = useState(false);
  const [copiedTid, setCopiedTid] = useState<string | null>(null);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [kitchenToast, setKitchenToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setKitchenToast({ msg, type });
    setTimeout(() => setKitchenToast(null), 4000);
  };
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
  const [pushStatus, setPushStatus] = useState<'Checking...' | 'Enabled' | 'Blocked' | 'Not Supported' | 'Alerts not configured'>('Checking...');

  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const consecutiveFailuresRef = useRef<number>(0);
  const lastSuccessTimeRef = useRef<number>(Date.now());
  const pollTimerRef = useRef<any>(null);
  const isPollingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('Not Supported');
      return;
    }
    navigator.permissions.query({ name: 'notifications' }).then(status => {
      if (status.state === 'denied') setPushStatus('Blocked');
      else if (status.state === 'granted') setPushStatus('Enabled');
      else setPushStatus('Checking...');
    });
  }, []);

  const handleEnablePush = async () => {
    if (pushStatus === 'Not Supported' || pushStatus === 'Blocked') return;
    try {
      const { publicKey } = await getVapidPublicKeyFn();
      if (!publicKey) {
        setPushStatus('Alerts not configured');
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setPushStatus('Blocked');
        return;
      }

      const swRegistration = await navigator.serviceWorker.ready;
      let subscription = await swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey
        });
      }

      const res = await adminCall(subscribeAdminPushFn, { subscription: JSON.parse(JSON.stringify(subscription)) });
      if (res.success) {
        setPushStatus('Enabled');
      } else {
        showToast('Failed to subscribe on server: ' + friendlyMessage(res.error), 'error');
      }
    } catch (e: any) {
      showToast('Failed to enable push: ' + friendlyMessage(e), 'error');
    }
  };

  const handleTestPush = async () => {
    try {
      await adminCall(sendTestAdminPushFn);
    } catch (e: any) {
      showToast('Test push failed: ' + friendlyMessage(e), 'error');
    }
  };

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

  const scheduleNextPoll = (delayMs: number) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(runPoll, delayMs);
  };

  const runPoll = async () => {
    if (isPollingRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      scheduleNextPoll(5000);
      return;
    }
    isPollingRef.current = true;
    try {
      const data = await adminCall(getKitchenOrders);
      lastSuccessTimeRef.current = Date.now();
      consecutiveFailuresRef.current = 0;
      setConnStatus('live');
      
      const nowStr = new Date().toLocaleTimeString('en-GB');
      setLastUpdatedTime(nowStr);

      const newOrders = Array.isArray(data) ? data : [];
      const newIds = new Set(newOrders.map((o: any) => o.id));
      const newlyArrived = newOrders.filter((o: any) => !prevOrderIdsRef.current.has(o.id));
      
      if (prevOrderIdsRef.current.size > 0 && newlyArrived.length > 0 && soundEnabled) {
        playKitchenDing();
      }
      prevOrderIdsRef.current = newIds;
      setOrders(newOrders);
      scheduleNextPoll(5000);
    } catch (err: any) {
      consecutiveFailuresRef.current++;
      const timeSinceSuccess = Date.now() - lastSuccessTimeRef.current;
      const isOffline = consecutiveFailuresRef.current >= 3 || timeSinceSuccess >= 20000;
      
      if (isOffline) {
        if (connStatus !== 'offline' && soundEnabled) {
          playKitchenDing();
        }
        setConnStatus('offline');
      } else {
        setConnStatus('reconnecting');
      }

      const nextDelay = consecutiveFailuresRef.current === 1 ? 5000 : (consecutiveFailuresRef.current === 2 ? 10000 : 20000);
      scheduleNextPoll(nextDelay);
    } finally {
      isPollingRef.current = false;
    }
  };

  useEffect(() => {
    runPoll();

    const onOnline = () => {
      runPoll();
    };
    const onOffline = () => {
      setConnStatus('offline');
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') runPoll();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [soundEnabled]);

  // Repeat ding for received orders
  useEffect(() => {
    if (!soundEnabled) return;
    const hasReceived = orders.some(o => o.status === 'received');
    if (hasReceived) {
      const dingTimer = setInterval(() => {
        playKitchenDing();
      }, 20000);
      return () => clearInterval(dingTimer);
    }
  }, [orders, soundEnabled]);

  const handleStatusUpdate = async (orderId: string, status: any, reason?: string, riderN?: string, riderP?: string, expectedFrom?: any) => {
    try {
      await adminCall(updateOrderStatus, { 
        orderId, 
        status, 
        reason,
        riderName: riderN,
        riderPhone: riderP,
        expectedFrom
      });
      runPoll();
    } catch (e: any) {
      showToast(friendlyMessage(e, 'Failed to update order'), 'error');
      runPoll();
    }
  };

  const handleVerifyPayment = async (orderId: string) => {
    setVerifyingPaymentId(orderId);
    try {
      const res = await adminCall(verifyPaymentFn, { orderId });
      if (res && (res as any).code === 'db_migration_needed') {
        setDbMigrationNeeded(true);
        showToast((res as any).message || 'Database update needed for payment verification', 'error');
      } else if (res && res.success) {
        showToast('Payment verified successfully', 'success');
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_verified_at: new Date().toISOString() } : o));
      } else {
        showToast('Failed to verify payment', 'error');
      }
    } catch (e: any) {
      showToast(friendlyMessage(e, 'Failed to verify payment'), 'error');
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  const handlePrint = (order: any) => {
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));

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
        <p><b>Customer:</b> ${esc(order.customer_name)}</p>
        <p><b>Phone:</b> ${esc(order.customer_phone)}</p>
        <p><b>Address:</b> ${esc(order.delivery_address)}</p>
        ${order.distance_km ? `<p><b>Distance:</b> ${order.distance_km.toFixed(1)} km</p>` : ''}
        <br/>
        ${itemsHtml}
        <div class="footer">
          <p>Total: PKR ${Number(order.total_amount) + Number(order.delivery_fee)}</p>
          <p><b>Payment:</b> ${order.payment_method === 'cod' ? 'COD' : (order.payment_verified_at ? 'ONLINE (verified)' : 'ONLINE (verify TID)')}</p>
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
              {order.payment_method === 'cod' ? (
                <span className="text-xs bg-slate-900 text-slate-300 font-bold px-2 py-0.5 rounded">COD</span>
              ) : order.payment_verified_at ? (
                <span className="text-xs bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 font-bold px-2 py-0.5 rounded">ONLINE · verified</span>
              ) : (
                <span className="text-xs bg-amber-950/90 text-amber-300 border border-amber-700/60 font-bold px-2 py-0.5 rounded">ONLINE · verify TID</span>
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

        {order.payment_method === 'online_transfer' && (
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-300 flex items-center justify-between gap-2 mt-1">
            <div>
              <span className="text-slate-400 block text-[11px]">TID to match:</span>
              <span className="font-mono font-bold text-amber-300 text-sm select-all tracking-wider">{order.payment_trx_id || 'N/A'}</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">Amount: <strong className="text-white">PKR {Number(order.total_amount) + Number(order.delivery_fee)}</strong></span>
            </div>
            {order.payment_trx_id && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(order.payment_trx_id);
                  setCopiedTid(order.id);
                  setTimeout(() => setCopiedTid(null), 2000);
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600 font-semibold text-xs flex items-center gap-1 transition-colors"
                title="Copy TID"
              >
                <Copy size={13} />
                <span>{copiedTid === order.id ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
        )}

        {currentStatus === 'received' && order.payment_method === 'online_transfer' && !order.payment_verified_at && (
          <div className="bg-amber-950/30 border border-amber-800/60 rounded-lg p-2.5 text-xs text-amber-200 space-y-2 mt-1">
            <p className="font-medium text-amber-300">Check this TID and amount in the EasyPaisa/JazzCash app first</p>
            <button
              type="button"
              disabled={verifyingPaymentId === order.id}
              onClick={() => handleVerifyPayment(order.id)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
            >
              {verifyingPaymentId === order.id ? 'Verifying...' : 'Mark payment verified'}
            </button>
          </div>
        )}

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

        <div className="flex gap-2 mt-2 pt-3 border-t border-slate-700 flex-wrap">
          <button 
             onClick={() => handlePrint(order)}
             className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
             <Printer size={16} />
          </button>
          
          {currentStatus === 'received' && (
            <>
              <button 
                onClick={() => handleStatusUpdate(order.id, 'preparing', undefined, undefined, undefined, 'received')}
                disabled={order.payment_method === 'online_transfer' && !order.payment_verified_at && !dbMigrationNeeded}
                className="flex-[1] bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={order.payment_method === 'online_transfer' && !order.payment_verified_at && !dbMigrationNeeded ? 'Please verify the payment first' : undefined}
              >
                Prep Food
              </button>
              <button 
                onClick={() => setDispatchModalOpen({ id: order.id, expected: 'received' })}
                disabled={order.payment_method === 'online_transfer' && !order.payment_verified_at && !dbMigrationNeeded}
                className="flex-[1] bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={order.payment_method === 'online_transfer' && !order.payment_verified_at && !dbMigrationNeeded ? 'Please verify the payment first' : undefined}
              >
                Skip to Delivery
              </button>
            </>
          )}

          {currentStatus === 'preparing' && (
            <button 
              onClick={() => setDispatchModalOpen({ id: order.id, expected: 'preparing' })}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors"
            >
              Dispatch
            </button>
          )}

          {currentStatus === 'out_for_delivery' && (
            <button 
              onClick={() => handleStatusUpdate(order.id, 'delivered', undefined, undefined, undefined, 'out_for_delivery')}
              className="flex-[2] bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors"
            >
              Mark Completed
            </button>
          )}

          <button 
            onClick={() => setCancelModalOpen({ id: order.id, expected: currentStatus })}
            className="bg-slate-700 hover:bg-red-900/50 text-red-400 hover:text-red-300 py-2 px-3 rounded-lg transition-colors"
            title="Cancel"
          >
            <XCircle size={16} />
          </button>
        </div>
      </div>
    );
  };

  const received = orders.filter(o => o.status === 'received');
  const preparing = orders.filter(o => o.status === 'preparing');
  const outForDelivery = orders.filter(o => o.status === 'out_for_delivery');

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-slate-200">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <ChefHat className="text-primary" size={28} />
          <h1 className="text-xl font-bold text-white hidden md:block">KDS | AMR Fast Food</h1>
          
          {connStatus === 'live' && (
            <div className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Live{lastUpdatedTime ? ` · updated ${lastUpdatedTime}` : ''}</span>
            </div>
          )}
          {connStatus === 'reconnecting' && (
            <div className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-amber-950/80 text-amber-300 border border-amber-700/60">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Reconnecting…</span>
            </div>
          )}
          {connStatus === 'offline' && (
            <div role="alert" className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-red-700 text-white shadow-md animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white" />
              <span>Offline — orders may be out of date</span>
            </div>
          )}
          {wakeLockEnabled && (
            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300 hidden sm:block">
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
          <button onClick={() => { clearAdminSession(); window.location.reload(); }} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors">
            Lock
          </button>
        </div>
      </header>

      {dbMigrationNeeded && (
        <div role="alert" className="bg-red-600 text-white font-bold p-3 text-center text-sm shadow">
          Database update needed for payment verification (ask the developer)
        </div>
      )}
      {connStatus === 'offline' && (
        <div role="alert" className="bg-red-950/90 border-b border-red-800 text-red-200 px-6 py-2.5 text-xs text-center font-bold flex items-center justify-center gap-2">
          <AlertTriangle size={15} className="text-red-400" />
          <span>Offline — orders may be out of date. Reconnecting automatically...</span>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start p-6">
        <KitchenColumn 
          title="Received"
          icon={<BellRing className="text-primary" size={20} />}
          badgeBg="bg-primary/20"
          badgeText="text-primary"
          count={received.length}
          orders={received}
          emptyText="No new orders"
          renderCard={renderCard}
          status="received"
        />

        <KitchenColumn 
          title="Preparing"
          icon={<ChefHat className="text-blue-400" size={20} />}
          badgeBg="bg-blue-900/40"
          badgeText="text-blue-400"
          count={preparing.length}
          orders={preparing}
          emptyText="Clear board"
          renderCard={renderCard}
          status="preparing"
        />

        <KitchenColumn 
          title="Delivery"
          icon={<Truck className="text-green-400" size={20} />}
          badgeBg="bg-green-900/40"
          badgeText="text-green-400"
          count={outForDelivery.length}
          orders={outForDelivery}
          emptyText="No active deliveries"
          renderCard={renderCard}
          status="out_for_delivery"
        />
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
                   if (cancelReason.trim().length < 5) return showToast("Please enter a valid reason (at least 5 characters).", "error");
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
                   // Rider name optional
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
