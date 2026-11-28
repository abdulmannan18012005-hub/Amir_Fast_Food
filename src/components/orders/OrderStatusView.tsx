import React, { useEffect, useState } from 'react';
import { MapPin, XCircle, Phone, Bell, ShieldAlert, CheckCircle2, AlertOctagon } from 'lucide-react';
import { LiveOrder } from '../../hooks/useLiveOrder';
import { SHOP_PHONE_LOCAL } from '../../lib/shop';
import { OrderFeedback } from './OrderFeedback';
import { CustomerCancelModal } from './CustomerCancelModal';

export function OrderStatusView({ order, onNotify }: { order: LiveOrder, onNotify?: () => Promise<boolean> | void }) {
  const [now, setNow] = useState(Date.now());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [enablingNotify, setEnablingNotify] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const elapsedMinutes = (now - new Date(order.created_at).getTime()) / 60000;
  const isExpired = elapsedMinutes > 40;

  const isOnline = order.payment_method === 'online_transfer';
  const reviewStatus = order.payment_review_status || (
    isOnline
      ? (order.status === 'canceled' && order.cancel_reason?.toLowerCase().includes('payment')
          ? 'rejected'
          : (order.payment_verified_at ? 'approved' : 'pending'))
      : 'not_required'
  );
  const isPendingReview = isOnline && reviewStatus === 'pending' && order.status !== 'canceled';
  const isApprovedPayment = isOnline && (reviewStatus === 'approved' || Boolean(order.payment_verified_at));
  const isRejectedPayment = isOnline && (reviewStatus === 'rejected' || (order.status === 'canceled' && order.cancel_reason?.toLowerCase().includes('payment')));

  const getProgress = () => {
    if (order.status === 'canceled') return 100;
    if (order.status === 'delivered') return 100;
    if (isPendingReview) return 8;
    
    const statusChangedAt = new Date(order.status_changed_at || order.created_at).getTime();
    const elapsed = now - statusChangedAt;
    
    if (order.status === 'received') {
      if (isExpired) return 15;
      const expected = 3 * 60000;
      const fraction = Math.min(0.95, elapsed / expected);
      return 0 + (15 - 0) * fraction;
    }
    if (order.status === 'preparing') {
      if (isExpired) return 60;
      const expected = 15 * 60000;
      const fraction = Math.min(0.95, elapsed / expected);
      return 15 + (60 - 15) * fraction;
    }
    if (order.status === 'out_for_delivery') {
      if (isExpired) return 95;
      const expected = 15 * 60000;
      const fraction = Math.min(0.95, elapsed / expected);
      return 60 + (95 - 60) * fraction;
    }
    return 0;
  };
  
  const getEta = () => {
    if (order.status === 'delivered') return 'Delivered';
    if (order.status === 'canceled') return 'Canceled';
    if (isPendingReview) return 'Awaiting Payment Verification';

    if (isExpired) {
      if (order.status === 'out_for_delivery') {
        return "Your order is coming soon. Rider is on the way.";
      }
      if (order.status === 'received') {
        return `Estimate has passed. Order received; call ${SHOP_PHONE_LOCAL} for an update.`;
      }
      if (order.status === 'preparing') {
        return `Estimate has passed. Food is being prepared; call ${SHOP_PHONE_LOCAL} for an update.`;
      }
    }
    return "Estimated 30–40 minutes";
  };

  const progress = getProgress();
  const isFinal = order.status === 'delivered' || order.status === 'canceled';

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header section */}
      <div className="bg-card px-6 py-5 border-b border-border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-black text-foreground">
              {isPendingReview
                ? "Payment Verification Pending"
                : order.status === 'received'
                ? "Order Received"
                : order.status === 'preparing'
                ? "Preparing Food"
                : order.status === 'out_for_delivery'
                ? "Out for Delivery"
                : order.status === 'delivered'
                ? "Delivered - Enjoy!"
                : "Order Canceled"}
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isPendingReview
                ? "We have received your order details. Verifying payment..."
                : `Order #${order.shortCode}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {order.status === 'received' && order.authorized !== false && (
              <button 
                type="button"
                onClick={() => setShowCancelModal(true)} 
                aria-label="Cancel this order"
                className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold px-3 py-1.5 rounded-full text-xs transition-colors"
              >
                <XCircle size={15} />
                <span>Cancel Order</span>
              </button>
            )}
            {onNotify && !isFinal && (
              <button 
                type="button"
                disabled={enablingNotify}
                onClick={async () => {
                  setEnablingNotify(true);
                  setNotifyMsg(null);
                  try {
                    const result = await onNotify();
                    if (result === true) {
                      setNotifyMsg({ ok: true, text: 'Order notifications enabled for this order.' });
                    } else {
                      setNotifyMsg({ ok: false, text: 'Could not enable notifications — check browser notification permissions.' });
                    }
                  } catch {
                    setNotifyMsg({ ok: false, text: 'Unable to verify notification setup right now.' });
                  } finally {
                    setEnablingNotify(false);
                  }
                }} 
                aria-label="Enable order notifications"
                className="inline-flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 font-bold px-3 py-1.5 rounded-full text-sm transition-colors disabled:opacity-50"
              >
                <Bell size={16} />
                <span>{enablingNotify ? 'Enabling...' : 'Notify me'}</span>
              </button>
            )}
          </div>
        </div>

        {notifyMsg && (
          <div role="status" className={`mb-3 text-xs font-semibold px-3 py-2 rounded-xl border ${
            notifyMsg.ok
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30'
          }`}>
            {notifyMsg.text}
          </div>
        )}
        
        <div className="w-full h-2 bg-muted rounded-full mb-3 overflow-hidden">
          <div 
             className={`h-full rounded-full transition-all duration-[10000ms] ease-linear motion-reduce:transition-none ${
               order.status === 'canceled'
                 ? 'bg-destructive'
                 : order.status === 'delivered'
                 ? 'bg-emerald-700'
                 : isPendingReview
                 ? 'bg-amber-500 animate-pulse'
                 : 'bg-primary'
             }`}
             style={{ width: `${progress}%` }}
          />
        </div>
        
        {!isFinal && (
          <div className="flex justify-between text-sm font-semibold text-muted-foreground">
            <span>Progress</span>
            <span>{getEta()}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Pending Review Card */}
        {isPendingReview && (
          <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-4 text-amber-950 dark:text-amber-200 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-amber-500 flex-shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="font-black text-base text-amber-600 dark:text-amber-400">Payment Verification Pending</h3>
                <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
                  We have received your order details. Our team is checking your transaction. Your order will be accepted once payment is verified.
                </p>
              </div>
            </div>

            <div className="bg-card rounded-xl p-3 border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono font-bold text-foreground">#{order.shortCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-semibold text-foreground">Online Transfer</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount for Verification:</span>
                <span className="font-black text-primary text-sm">PKR {order.total}</span>
              </div>
              {order.payment_trx_id_masked && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono font-bold text-foreground">{order.payment_trx_id_masked}</span>
                </div>
              )}
            </div>

            <div className="bg-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-900 dark:text-amber-300 font-medium text-center">
              Please do not submit the same order again while it is under review.
            </div>
          </div>
        )}

        {/* Payment Approved Banner */}
        {isApprovedPayment && order.status !== 'delivered' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={22} />
            <div>
              <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Payment Verified — Order Accepted</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your payment was confirmed and your order is in our kitchen.</p>
            </div>
          </div>
        )}

        {/* Order Canceled / Rejected Card */}
        {order.status === 'canceled' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
            <XCircle className="text-destructive flex-shrink-0 mt-0.5" size={24} />
            <div className="w-full">
              <p className="font-bold text-destructive">
                {isRejectedPayment 
                  ? "Payment Could Not Be Verified" 
                  : order.cancellation_source === 'customer' 
                    ? "Canceled by Customer" 
                    : "Canceled by Restaurant"}
              </p>
              <p className="text-sm text-foreground/90 mt-1">{order.cancel_reason || "Your order was canceled."}</p>

              {/* Online refund status breakdown */}
              {isOnline && (
                <div className="mt-3 p-3.5 rounded-xl bg-card border border-border text-xs space-y-2">
                  <div className="font-bold text-xs text-foreground flex items-center justify-between">
                    <span className="uppercase tracking-wider text-muted-foreground">Refund Status</span>
                    {(!order.refund_status || order.refund_status === 'pending_review') && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                        Pending Review
                      </span>
                    )}
                    {order.refund_status === 'approved' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                        Approved — Queued for Transfer
                      </span>
                    )}
                    {order.refund_status === 'paid' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                        Refund Completed
                      </span>
                    )}
                    {order.refund_status === 'rejected' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold text-[11px]">
                        Refund Rejected
                      </span>
                    )}
                  </div>

                  {(!order.refund_status || order.refund_status === 'pending_review') && (
                    <p className="text-muted-foreground leading-relaxed">
                      Our team has received your refund request and is reviewing your payment screenshot.
                    </p>
                  )}
                  {order.refund_status === 'approved' && (
                    <p className="text-muted-foreground leading-relaxed">
                      Your refund was approved. Our manager is processing the bank transfer back to your account.
                    </p>
                  )}
                  {order.refund_status === 'paid' && (
                    <div className="space-y-1 text-emerald-700 dark:text-emerald-400">
                      <p className="font-semibold">Refund amount of PKR {order.total} has been transferred.</p>
                      {order.refund_trx_ref && (
                        <p className="font-mono text-xs bg-muted px-2 py-1 rounded-md text-foreground inline-block">
                          Bank Ref: {order.refund_trx_ref}
                        </p>
                      )}
                    </div>
                  )}
                  {order.refund_status === 'rejected' && (
                    <div className="space-y-1 text-destructive">
                      <p className="font-semibold">Refund request was not approved.</p>
                      {order.refund_admin_note && (
                        <p className="text-muted-foreground italic">Note: "{order.refund_admin_note}"</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <a href={`tel:${SHOP_PHONE_LOCAL}`} className="inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-destructive/90 transition-colors">
                  <Phone size={14} /> Call {SHOP_PHONE_LOCAL}
                </a>
              </div>
            </div>
          </div>
        )}

        {order.status === 'out_for_delivery' && order.rider_name && (
           <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="bg-card p-2 rounded-full shadow-sm border border-border"><MapPin className="text-primary" size={20}/></div>
               <div>
                 <p className="font-bold text-foreground">Rider: {order.rider_name}</p>
                 <p className="text-xs text-muted-foreground">On the way to you</p>
               </div>
             </div>
             {order.rider_phone && (
               <a href={`tel:${order.rider_phone}`} aria-label="Call rider" className="bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 rounded-full transition-colors shadow-sm">
                 <Phone size={18} />
               </a>
             )}
           </div>
        )}

        {/* Customer Feedback Card (Only available once delivered) */}
        {order.status === 'delivered' && (
          <OrderFeedback orderId={order.id} status={order.status} />
        )}

        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
           <h3 className="font-bold text-lg text-foreground mb-4">Order Details</h3>
           {order.authorized === false ? (
             <div className="p-4 rounded-2xl bg-muted/50 border border-border text-xs text-muted-foreground space-y-2 mb-4">
               <p className="font-semibold text-foreground">Protected Customer Details</p>
               <p>
                 Full item receipt, delivery address, rider contact, and online cancellation are only visible when opened from your personal tracking link or the device that placed this order.
               </p>
             </div>
           ) : (
             <div className="space-y-3 mb-5">
               {order.items.map((item, i) => (
                 <div key={i} className="flex justify-between text-sm text-foreground">
                   <div className="pr-4">
                     <span className="font-bold">{item.quantity}x</span> {item.name}
                     {item.variants && item.variants.length > 0 && (
                       <p className="text-xs text-muted-foreground mt-0.5 ml-4">{item.variants.map(v => v.name).join(', ')}</p>
                     )}
                   </div>
                   <div className="font-medium whitespace-nowrap">Rs {item.unit_price * item.quantity}</div>
                 </div>
               ))}
             </div>
           )}

           <div className="border-t border-border pt-4 space-y-2 text-sm text-muted-foreground">
             <div className="flex justify-between"><span>Subtotal</span><span>Rs {order.subtotal}</span></div>
             <div className="flex justify-between"><span>Delivery Fee</span><span>{order.delivery_fee > 0 ? `Rs ${order.delivery_fee}` : 'FREE'}</span></div>
             <div className="flex justify-between font-black text-lg text-foreground pt-2">
               <span>Total</span>
               <span className="text-primary">Rs {order.total}</span>
             </div>
           </div>
           {order.authorized !== false && (
             <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4 text-sm">
               <div>
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Payment</p>
                 <p className="font-semibold text-foreground">{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Transfer'}</p>
               </div>
               <div>
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Delivery to</p>
                 <p className="font-semibold text-foreground truncate">{order.customer_name}</p>
                 <p className="text-xs text-muted-foreground line-clamp-2">{order.delivery_address}</p>
               </div>
             </div>
           )}
        </div>
      </div>

      <CustomerCancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        order={order}
      />
    </div>
  );
}
