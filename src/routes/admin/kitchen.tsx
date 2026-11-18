import { friendlyMessage } from '../../lib/errors';
import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../../lib/seo';
import React, { useEffect, useState, useRef } from 'react';
import { updateOrderStatus, getKitchenOrders, verifyPaymentFn, approvePaymentFn, rejectPaymentFn } from '../../server/order';
import { playKitchenDing, initAudio } from '../../lib/sound';
import { PinGate } from '../../components/admin/PinGate';
import { AdminNav } from '../../components/admin/AdminNav';
import { AdminProvider, useAdminContext } from '../../components/admin/AdminContext';
import { Clock, CheckCircle, ChefHat, Truck, XCircle, Volume2, VolumeX, BellRing, Printer, AlertTriangle, Copy, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
  const { theme } = useAdminContext();
  const isDark = theme === 'dark';
  return (
    <div className={`rounded-2xl p-4 border transition-colors ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className={`flex justify-between items-center mb-4 pb-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <h2 className={`font-bold text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {icon} {title}
        </h2>
        <span className={`${badgeBg} ${badgeText} font-bold px-2.5 py-0.5 rounded-full text-sm`}>{count}</span>
      </div>
      <div className="space-y-4">
        {orders.map(o => renderCard(o, status))}
        {orders.length === 0 && <p className={`${isDark ? 'text-slate-500' : 'text-slate-400'} text-sm text-center py-8 font-medium`}>{emptyText}</p>}
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
      <AdminProvider>
        <AdminNav />
        <KitchenKDS />
      </AdminProvider>
    </PinGate>
  );
}

function KitchenKDS() {
  const { soundEnabled, playNotificationSound, theme } = useAdminContext();
  const isDark = theme === 'dark';
  const [orders, setOrders] = useState<any[]>([]);
  const [connStatus, setConnStatus] = useState<'live' | 'reconnecting' | 'offline'>('live');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [dbMigrationNeeded, setDbMigrationNeeded] = useState(false);
  const [copiedTid, setCopiedTid] = useState<string | null>(null);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);
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

  // Payment Review State
  const [rejectPaymentModalOpen, setRejectPaymentModalOpen] = useState<{ id: string; shortCode: string; amount: number; tid: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingPaymentId, setApprovingPaymentId] = useState<string | null>(null);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);

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
      const res = await adminCall(approvePaymentFn, { orderId });
      if (res && (res as any).code === 'db_migration_needed') {
        setDbMigrationNeeded(true);
        showToast((res as any).message || 'Database update needed for payment verification', 'error');
      } else if (res && res.success) {
        showToast('Payment verified & approved successfully', 'success');
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_verified_at: new Date().toISOString(), payment_review_status: 'approved' } : o));
        runPoll();
      } else {
        showToast('Failed to verify payment', 'error');
      }
    } catch (e: any) {
      showToast(friendlyMessage(e, 'Failed to verify payment'), 'error');
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  const handleApprovePayment = async (orderId: string) => {
    setApprovingPaymentId(orderId);
    try {
      const res = await adminCall(approvePaymentFn, { orderId });
      if (res && res.success) {
        showToast('Payment approved! Order accepted and moved to kitchen queue.', 'success');
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_review_status: 'approved', payment_verified_at: new Date().toISOString() } : o));
        runPoll();
      } else {
        showToast('Failed to approve payment', 'error');
      }
    } catch (e: any) {
      showToast(friendlyMessage(e, 'Failed to approve payment'), 'error');
    } finally {
      setApprovingPaymentId(null);
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectPaymentModalOpen) return;
    if (rejectReason.trim().length < 5) {
      showToast('Please enter a rejection reason (at least 5 characters).', 'error');
      return;
    }
    setRejectingPaymentId(rejectPaymentModalOpen.id);
    try {
      const res = await adminCall(rejectPaymentFn, {
        orderId: rejectPaymentModalOpen.id,
        reason: rejectReason.trim()
      });
      if (res && res.success) {
        showToast('Payment rejected and order canceled.', 'info');
        setOrders(prev => prev.filter(o => o.id !== rejectPaymentModalOpen.id));
        setRejectPaymentModalOpen(null);
        setRejectReason('');
        runPoll();
      } else {
        showToast('Failed to reject payment', 'error');
      }
    } catch (e: any) {
      showToast(friendlyMessage(e, 'Failed to reject payment'), 'error');
    } finally {
      setRejectingPaymentId(null);
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
      <div key={order.id} className={`rounded-xl p-4 border shadow-sm flex flex-col gap-3 transition-colors ${
        isLate 
          ? isDark ? 'border-red-500/50 bg-red-950/20' : 'border-red-400 bg-red-50/60'
          : isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs px-2 py-0.5 rounded ${isDark ? 'text-slate-400 bg-slate-900' : 'text-slate-600 bg-slate-200'}`}>#{order.id.slice(0, 8)}</span>
              {order.payment_method === 'cod' ? (
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>COD</span>
              ) : order.payment_verified_at ? (
                <span className="text-xs bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 font-bold px-2 py-0.5 rounded">ONLINE · verified</span>
              ) : (
                <span className="text-xs bg-amber-950/90 text-amber-300 border border-amber-700/60 font-bold px-2 py-0.5 rounded">ONLINE · verify TID</span>
              )}
            </div>
            <h3 className={`font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.customer_name}</h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{order.delivery_address}</p>
            {order.distance_km && <p className="text-xs text-blue-500 mt-0.5">~{order.distance_km.toFixed(1)} km</p>}
          </div>
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isLate ? 'bg-red-500/20 text-red-400' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
            <Clock size={12} /> {timeAgo(order.created_at)}
          </div>
        </div>

        {order.payment_method === 'online_transfer' && (
          <div className={`border rounded-lg p-2.5 text-xs flex items-center justify-between gap-2 mt-1 ${isDark ? 'bg-slate-900/90 border-slate-700/80 text-slate-300' : 'bg-amber-50/70 border-amber-200 text-slate-800'}`}>
            <div>
              <span className={`block text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TID to match:</span>
              <span className="font-mono font-bold text-amber-500 text-sm select-all tracking-wider">{order.payment_trx_id || 'N/A'}</span>
              <span className={`block text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Amount: <strong className={isDark ? 'text-white' : 'text-slate-900'}>PKR {Number(order.total_amount) + Number(order.delivery_fee)}</strong></span>
            </div>
            {order.payment_trx_id && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(order.payment_trx_id);
                  setCopiedTid(order.id);
                  setTimeout(() => setCopiedTid(null), 2000);
                }}
                className={`px-2.5 py-1.5 rounded border font-semibold text-xs flex items-center gap-1 transition-colors ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title="Copy TID"
              >
                <Copy size={13} />
                <span>{copiedTid === order.id ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
        )}

        {currentStatus === 'received' && order.payment_method === 'online_transfer' && !order.payment_verified_at && (
          <div className={`border rounded-lg p-2.5 text-xs space-y-2 mt-1 ${isDark ? 'bg-amber-950/30 border-amber-800/60 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
            <p className="font-medium text-amber-600 dark:text-amber-300">Check this TID and amount in the EasyPaisa/JazzCash app first</p>
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
            <div key={idx} className={`flex justify-between text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <div>
                <span className="font-bold text-primary mr-2">{item.quantity}x</span>
                {item.menu_items?.name || 'Unknown Item'}
                {item.selected_variants && item.selected_variants.length > 0 && (
                  <div className={`text-xs ml-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.selected_variants.map((v:any) => v.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={`flex gap-2 mt-2 pt-3 border-t flex-wrap ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button 
             onClick={() => handlePrint(order)}
             className={`font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
               isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
             }`}
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
            className={`py-2 px-3 rounded-lg transition-colors ${
              isDark ? 'bg-slate-700 hover:bg-red-950/50 text-red-400 hover:text-red-300' : 'bg-slate-100 hover:bg-red-50 text-red-600 border border-slate-200'
            }`}
            title="Cancel"
          >
            <XCircle size={16} />
          </button>
        </div>
      </div>
    );
  };

  const isApproved = (o: any) => o.payment_review_status === 'approved' || Boolean(o.payment_verified_at);
  const isOnlinePending = (o: any) => o.payment_method === 'online_transfer' && !isApproved(o) && o.status !== 'canceled';

  const pendingPayments = orders.filter(isOnlinePending);
  const received = orders.filter(o => o.status === 'received' && (o.payment_method === 'cod' || isApproved(o)));
  const preparing = orders.filter(o => o.status === 'preparing');
  const outForDelivery = orders.filter(o => o.status === 'out_for_delivery');

  return (
    <div className={`min-h-[100dvh] transition-colors ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <header className={`px-6 py-4 flex justify-between items-center sticky top-0 z-10 transition-colors border-b ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <ChefHat className="text-primary" size={28} />
          <h1 className={`text-xl font-bold hidden md:block ${isDark ? 'text-white' : 'text-slate-900'}`}>KDS | AMR Fast Food</h1>
          
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
          {pendingPayments.length > 0 && (
            <div className="px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 bg-amber-500 text-slate-950 shadow animate-pulse">
              <ShieldAlert size={15} />
              <span>{pendingPayments.length} Pending Review</span>
            </div>
          )}
          {wakeLockEnabled && (
            <span className={`text-xs px-2 py-0.5 rounded hidden sm:block ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
              Screen Awake
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {pushStatus !== 'Enabled' && pushStatus !== 'Not Supported' && pushStatus !== 'Alerts not configured' && (
            <button
              type="button"
              onClick={handleEnablePush}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <BellRing size={14} /> Enable Push
            </button>
          )}
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

      {/* PENDING PAYMENT REVIEW SECTION */}
      <section className="px-6 pt-4 pb-2">
        <div className={`rounded-2xl border-2 p-5 shadow-xl transition-colors ${
          isDark ? 'bg-slate-800/90 border-amber-600/70' : 'bg-white border-amber-400 shadow-sm'
        }`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b gap-2 ${isDark ? 'border-slate-700/80' : 'border-amber-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
                <ShieldAlert size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-xl font-black tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>PENDING PAYMENT REVIEW</h2>
                  <span className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full text-xs">
                    {pendingPayments.length} PENDING
                  </span>
                </div>
                <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-amber-200/90' : 'text-amber-800'}`}>
                  Check the Transaction ID and exact amount in your EasyPaisa/JazzCash account before approving this order.
                </p>
              </div>
            </div>
            {pendingPayments.length > 0 && (
              <span className={`text-xs self-start sm:self-auto font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Orders remain blocked from kitchen preparation until approved.
              </span>
            )}
          </div>

          {pendingPayments.length === 0 ? (
            <div className={`text-center py-5 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No pending online payments.</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>All online-transfer orders have been reviewed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingPayments.map(order => {
                const total = Number(order.total_amount) + Number(order.delivery_fee);
                const shortCode = order.id.slice(0, 8).toUpperCase();
                return (
                  <div key={order.id} className={`border rounded-xl p-4 flex flex-col justify-between shadow-md space-y-3 transition-colors ${
                    isDark ? 'bg-slate-900/95 border-amber-500/40' : 'bg-amber-50/40 border-amber-300'
                  }`}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-500 bg-amber-950/20 border border-amber-600/40 px-2 py-0.5 rounded">
                              #{shortCode}
                            </span>
                            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                              Online Transfer
                            </span>
                          </div>
                          <h3 className={`font-bold text-base mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.customer_name}</h3>
                          <a href={`tel:${order.customer_phone}`} className="text-xs text-primary hover:underline flex items-center gap-1 font-mono">
                            <span>{order.customer_phone}</span>
                          </a>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                          <Clock size={12} /> {timeAgo(order.created_at)}
                        </div>
                      </div>

                      {/* Items */}
                      <div className={`rounded-lg p-2.5 text-xs space-y-1 max-h-28 overflow-y-auto ${isDark ? 'bg-slate-800/60 text-slate-300' : 'bg-white border border-slate-200 text-slate-700'}`}>
                        {(order.order_items || []).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span><strong className="text-primary">{item.quantity}x</strong> {item.menu_items?.name || 'Item'}</span>
                            {item.selected_variants?.length > 0 && (
                              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>({item.selected_variants.map((v: any) => v.name).join(', ')})</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* TID & Amount verification box */}
                      <div className={`border rounded-xl p-3 text-xs space-y-2 ${isDark ? 'bg-amber-950/40 border-amber-600/50' : 'bg-amber-100/60 border-amber-300'}`}>
                        <div className="flex justify-between items-center">
                          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Submitted TID:</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (order.payment_trx_id) {
                                navigator.clipboard?.writeText(order.payment_trx_id);
                                setCopiedTid(order.id);
                                setTimeout(() => setCopiedTid(null), 2000);
                              }
                            }}
                            className={`px-2 py-1 rounded border font-semibold text-[11px] flex items-center gap-1 transition-colors ${
                              isDark ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-700/60' : 'bg-white hover:bg-slate-100 text-amber-700 border-amber-300'
                            }`}
                          >
                            <Copy size={12} />
                            <span>{copiedTid === order.id ? 'Copied!' : 'Copy TID'}</span>
                          </button>
                        </div>
                        <div className={`font-mono font-bold text-amber-500 text-base select-all tracking-wider break-all p-2 rounded border ${
                          isDark ? 'bg-slate-900/90 border-slate-700' : 'bg-white border-amber-200'
                        }`}>
                          {order.payment_trx_id || 'NO TID PROVIDED'}
                        </div>
                        <div className={`flex justify-between items-center pt-1 border-t text-xs ${isDark ? 'border-amber-800/40' : 'border-amber-200'}`}>
                          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Total Payable:</span>
                          <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>PKR {total}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <button
                        type="button"
                        disabled={approvingPaymentId === order.id || rejectingPaymentId === order.id}
                        onClick={() => handleApprovePayment(order.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow"
                      >
                        <CheckCircle2 size={15} />
                        <span>{approvingPaymentId === order.id ? 'Approving...' : 'Approve & Accept'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={approvingPaymentId === order.id || rejectingPaymentId === order.id}
                        onClick={() => {
                          setRejectPaymentModalOpen({
                            id: order.id,
                            shortCode,
                            amount: total,
                            tid: order.payment_trx_id || 'N/A'
                          });
                          setRejectReason('');
                        }}
                        className={`font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center gap-1 border ${
                          isDark ? 'bg-slate-800 hover:bg-red-950/60 border-slate-700 text-red-400 hover:text-red-300' : 'bg-white hover:bg-red-50 border-slate-300 text-red-600'
                        }`}
                        title="Reject payment and cancel order"
                      >
                        <XCircle size={15} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

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
           <div className={`rounded-2xl p-6 max-w-sm w-full shadow-2xl border transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
             <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
               <AlertTriangle className="text-red-500" /> Cancel Order
             </h3>
             <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Are you sure you want to cancel this order? The customer will see this reason.</p>
             <textarea 
               value={cancelReason}
               onChange={e => setCancelReason(e.target.value)}
               placeholder="e.g., Rider unavailable, Item out of stock..."
               className={`w-full border rounded-xl p-3 mb-4 min-h-[100px] focus:border-red-500 outline-none ${
                 isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
               }`}
             />
             <div className="flex gap-3">
               <button onClick={() => { setCancelModalOpen(null); setCancelReason(''); }} className={`flex-1 font-bold py-2 rounded-xl ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'}`}>Back</button>
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
           <div className={`rounded-2xl p-6 max-w-sm w-full shadow-2xl border transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
             <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
               <Truck className="text-blue-500" /> Dispatch Rider
             </h3>
             <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Enter rider details so the customer can track or call them.</p>
             <div className="space-y-3 mb-6">
               <input 
                 type="text" value={riderName} onChange={e => setRiderName(e.target.value)}
                 placeholder="Rider Name (e.g. Ali)"
                 className={`w-full border rounded-xl p-3 outline-none focus:border-blue-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
               />
               <input 
                 type="tel" value={riderPhone} onChange={e => setRiderPhone(e.target.value)}
                 placeholder="Rider Phone (Optional)"
                 className={`w-full border rounded-xl p-3 outline-none focus:border-blue-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
               />
             </div>
             <div className="flex gap-3">
               <button onClick={() => { setDispatchModalOpen(null); setRiderName(''); setRiderPhone(''); }} className={`flex-1 font-bold py-2 rounded-xl ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'}`}>Back</button>
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
      {/* Reject Payment Modal */}
      {rejectPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl p-6 max-w-md w-full shadow-2xl border transition-colors ${isDark ? 'bg-slate-800 border-red-500/50 text-white' : 'bg-white border-red-400 text-slate-900'}`}>
            <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <XCircle className="text-red-500" /> Reject Payment / Cancel Order
            </h3>
            <p className={`text-sm mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Order <strong className={isDark ? 'text-white' : 'text-slate-900'}>#{rejectPaymentModalOpen.shortCode}</strong> (PKR {rejectPaymentModalOpen.amount}) with TID: <span className="font-mono text-amber-500">{rejectPaymentModalOpen.tid}</span>
            </p>
            <p className="text-xs text-red-500 mb-4">
              Enter the reason why this transaction could not be verified. The customer will see this reason on their tracking screen.
            </p>
            <textarea 
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g., TID not found in EasyPaisa account, amount mismatch, duplicate TID..."
              className={`w-full border rounded-xl p-3 mb-4 min-h-[100px] focus:border-red-500 outline-none text-sm ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
              disabled={rejectingPaymentId !== null}
            />
            <div className="flex gap-3">
              <button 
                disabled={rejectingPaymentId !== null}
                onClick={() => { setRejectPaymentModalOpen(null); setRejectReason(''); }} 
                className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
              >
                Back
              </button>
              <button 
                disabled={rejectingPaymentId !== null}
                onClick={handleRejectPayment} 
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow"
              >
                {rejectingPaymentId !== null ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
