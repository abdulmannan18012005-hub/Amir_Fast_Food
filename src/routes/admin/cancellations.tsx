import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../../lib/seo';
import React, { useState, useEffect } from 'react';
import { 
  PinGate 
} from '../../components/admin/PinGate';
import { AdminNav } from '../../components/admin/AdminNav';
import { AdminProvider, useAdminContext } from '../../components/admin/AdminContext';
import { adminCall } from '../../lib/adminSession';
import { 
  listCancellationsAdminFn, 
  getProofSignedUrlFn, 
  reviewRefundFn, 
  markRefundPaidFn 
} from '../../server/cancellationApi';
import { 
  Search, RefreshCcw, Eye, CheckCircle2, XCircle, 
  Clock, DollarSign, AlertTriangle, FileText, ExternalLink, X, ShieldAlert
} from 'lucide-react';

export const Route = createFileRoute('/admin/cancellations')({
  head: () => Object.assign(
    seo({ 
      title: 'Admin Cancellations & Refunds | Amir Fast Food', 
      description: 'Manage customer order cancellations and refund reviews', 
      path: '/admin/cancellations', 
      noindex: true 
    }), 
    { links: [{ rel: 'manifest', href: '/admin.webmanifest' }] }
  ),
  component: AdminCancellationsRoute,
});

function AdminCancellationsRoute() {
  return (
    <PinGate>
      <AdminProvider>
        <AdminNav />
        <AdminCancellationsPage />
      </AdminProvider>
    </PinGate>
  );
}

type TabType = 'pending_review' | 'approved' | 'paid' | 'rejected' | 'history';

function AdminCancellationsPage() {
  const { theme } = useAdminContext();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<TabType>('pending_review');
  const [orders, setOrders] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    pending_review: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
    history: 0
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  // Reject Modal
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Mark Paid Modal
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [refundTrxRef, setRefundTrxRef] = useState('');
  const [paidAdminNote, setPaidAdminNote] = useState('');

  const fetchCancellations = async () => {
    setIsLoading(true);
    setActionError('');
    try {
      const res = await adminCall(listCancellationsAdminFn, {
        tab: activeTab === 'history' ? 'all' : activeTab,
        search,
        page,
        pageSize: 20
      });
      setOrders(res.orders || []);
      setTotalCount(res.totalCount || 0);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch cancellation orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCancellations();
  }, [activeTab, page]);

  // Polling every 15s on visible tab
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !rejectingOrderId && !payingOrderId && !selectedOrder) {
        fetchCancellations();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [activeTab, page, search]);

  const handleOpenProof = async (proofPath: string) => {
    if (!proofPath) return;
    setProofLoading(true);
    setProofModalUrl(null);
    try {
      const res = await adminCall(getProofSignedUrlFn, { proofPath });
      if (res.signedUrl) {
        setProofModalUrl(res.signedUrl);
      } else {
        setActionError("Could not load signed URL for proof image.");
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to load proof image.");
    } finally {
      setProofLoading(false);
    }
  };

  const handleApproveRefund = async (orderId: string) => {
    setIsSubmittingAction(true);
    setActionError('');
    try {
      await adminCall(reviewRefundFn, {
        orderId,
        decision: 'approved',
        adminNote: 'Refund approved by admin'
      });
      setActionSuccess('Refund approved. Order moved to Approved Refunds (Awaiting Payment).');
      setTimeout(() => setActionSuccess(''), 4000);
      fetchCancellations();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => prev ? { ...prev, refund_status: 'approved' } : null);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve refund.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrderId) return;
    if (rejectReason.trim().length < 5) {
      setActionError('Please enter an explanation note for the rejection (minimum 5 characters).');
      return;
    }
    setIsSubmittingAction(true);
    setActionError('');
    try {
      await adminCall(reviewRefundFn, {
        orderId: rejectingOrderId,
        decision: 'rejected',
        adminNote: rejectReason.trim()
      });
      setActionSuccess('Refund request rejected and customer notified.');
      setTimeout(() => setActionSuccess(''), 4000);
      setRejectingOrderId(null);
      setRejectReason('');
      fetchCancellations();
      if (selectedOrder?.id === rejectingOrderId) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject refund.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!payingOrderId) return;
    setIsSubmittingAction(true);
    setActionError('');
    try {
      await adminCall(markRefundPaidFn, {
        orderId: payingOrderId,
        refundTrxRef: refundTrxRef.trim(),
        adminNote: paidAdminNote.trim()
      });
      setActionSuccess('Refund marked as paid. Completed transfer recorded.');
      setTimeout(() => setActionSuccess(''), 4000);
      setPayingOrderId(null);
      setRefundTrxRef('');
      setPaidAdminNote('');
      fetchCancellations();
      if (selectedOrder?.id === payingOrderId) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to record refund payment.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const tabs: { id: TabType; label: string; count: number; badgeColor: string }[] = [
    { id: 'pending_review', label: 'Pending Review', count: counts.pending_review, badgeColor: 'bg-amber-500 text-white' },
    { id: 'approved', label: 'Approved (Awaiting Payment)', count: counts.approved, badgeColor: 'bg-blue-600 text-white' },
    { id: 'paid', label: 'Completed Refunds', count: counts.paid, badgeColor: 'bg-emerald-600 text-white' },
    { id: 'rejected', label: 'Rejected', count: counts.rejected, badgeColor: 'bg-rose-600 text-white' },
    { id: 'history', label: 'All Cancellations', count: counts.history, badgeColor: isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700' },
  ];

  return (
    <div className={`min-h-screen pb-20 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5 border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2.5">
              <span className="text-rose-500">✕</span> Cancellations &amp; Refunds
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review customer cancellation requests, inspect payment proof screenshots, and process refunds.
            </p>
          </div>
          <button
            onClick={fetchCancellations}
            disabled={isLoading}
            className={`self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' 
                : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
            }`}
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Global Notifications */}
        {actionSuccess && (
          <div role="status" className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={18} /> {actionSuccess}
          </div>
        )}
        {actionError && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-sm flex items-center gap-2 animate-in fade-in">
            <AlertTriangle size={18} /> {actionError}
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide border-b border-border">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : isDark
                  ? 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeTab === t.id ? 'bg-black/20 text-white' : t.badgeColor
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchCancellations(); }}
              placeholder="Search by customer name, phone, order ID or transaction ID..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-primary ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' 
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
          <button
            onClick={fetchCancellations}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:bg-primary/90 transition-all"
          >
            Search
          </button>
        </div>

        {/* Orders Table & Cards */}
        {isLoading && orders.length === 0 ? (
          <div className="text-center py-20">
            <RefreshCcw size={32} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-semibold">Loading cancellation records...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg">No cancellations in this section</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {activeTab === 'pending_review' 
                ? 'All online refund requests have been reviewed!' 
                : activeTab === 'approved'
                ? 'No refunds currently awaiting payment transfer.'
                : 'No orders found matching this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isOnline = order.payment_method === 'online_transfer';
              const rStatus = order.refund_status || 'not_required';
              const shortId = (order.id || '').slice(0, 8).toUpperCase();
              const cancelDate = order.canceled_at 
                ? new Date(order.canceled_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })
                : 'N/A';

              return (
                <div 
                  key={order.id}
                  className={`p-5 rounded-2xl border transition-all shadow-sm ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Main Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-black text-base">#{shortId}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          order.cancellation_source === 'customer' 
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/30'
                        }`}>
                          {order.cancellation_source === 'customer' ? 'Customer Canceled' : 'Admin/Kitchen Canceled'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isOnline ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                        }`}>
                          {isOnline ? 'Online Transfer' : 'Cash on Delivery'}
                        </span>

                        {/* Refund Status Pill */}
                        {isOnline && (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            rStatus === 'pending_review'
                              ? 'bg-amber-500 text-white animate-pulse'
                              : rStatus === 'approved'
                              ? 'bg-blue-600 text-white'
                              : rStatus === 'paid'
                              ? 'bg-emerald-600 text-white'
                              : rStatus === 'rejected'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-600 text-white'
                          }`}>
                            Refund: {rStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="text-sm">
                        <span className="font-bold">{order.customer_name}</span> · <span className="text-muted-foreground font-mono">{order.customer_phone}</span>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Canceled on: <span className="font-medium text-foreground">{cancelDate}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-accent/40 border border-border text-xs mt-2">
                        <span className="font-bold text-foreground">Reason: </span>
                        <span className="text-muted-foreground">{order.cancel_reason || 'No reason provided'}</span>
                      </div>

                      {order.refund_admin_note && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs mt-1">
                          <span className="font-bold text-amber-700 dark:text-amber-300">Admin Note: </span>
                          <span className="text-foreground">{order.refund_admin_note}</span>
                          {order.refund_trx_ref && (
                            <span className="ml-2 font-mono font-bold text-primary">(Trx Ref: {order.refund_trx_ref})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border">
                      <div className="text-left lg:text-right">
                        <p className="text-xs text-muted-foreground">Total Order Amount</p>
                        <p className="font-black text-xl text-primary">PKR {Number(order.total_amount) + Number(order.delivery_fee || 0)}</p>
                        {order.payment_trx_id && (
                          <p className="text-xs font-mono text-muted-foreground">TID: {order.payment_trx_id}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* View Proof Button */}
                        {order.refund_proof_path && (
                          <button
                            type="button"
                            onClick={() => handleOpenProof(order.refund_proof_path)}
                            disabled={proofLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition-all"
                          >
                            <Eye size={14} /> View Proof
                          </button>
                        )}

                        {/* View Order Details */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/80 text-foreground text-xs font-semibold transition-colors"
                        >
                          <FileText size={14} /> Details
                        </button>

                        {/* Workflow Action: Approve Refund */}
                        {isOnline && rStatus === 'pending_review' && (
                          <button
                            type="button"
                            onClick={() => handleApproveRefund(order.id)}
                            disabled={isSubmittingAction}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all"
                          >
                            <CheckCircle2 size={14} /> Approve Refund
                          </button>
                        )}

                        {/* Workflow Action: Reject Refund */}
                        {isOnline && (rStatus === 'pending_review' || rStatus === 'approved') && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingOrderId(order.id);
                              setRejectReason('');
                            }}
                            disabled={isSubmittingAction}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-all"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        )}

                        {/* Workflow Action: Mark Paid */}
                        {isOnline && rStatus === 'approved' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayingOrderId(order.id);
                              setRefundTrxRef('');
                              setPaidAdminNote('');
                            }}
                            disabled={isSubmittingAction}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
                          >
                            <DollarSign size={14} /> Mark as Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalCount > 20 && (
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-accent disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {Math.ceil(totalCount / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(totalCount / 20)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-accent disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

      </div>

      {/* Proof Viewer Modal */}
      {proofModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-sm">Customer Payment Proof (Receipt)</h3>
              <button 
                onClick={() => setProofModalUrl(null)}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-black/40">
              <img 
                src={proofModalUrl} 
                alt="Payment proof screenshot" 
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>
            <div className="p-3 border-t border-border flex justify-end gap-2 bg-card">
              <a 
                href={proofModalUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-foreground text-xs font-semibold"
              >
                Open in Full Tab <ExternalLink size={12} />
              </a>
              <button 
                onClick={() => setProofModalUrl(null)} 
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Refund Modal */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-500">
              <XCircle size={24} />
              <h3 className="font-black text-lg">Reject Refund Request</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Please provide a clear explanation for rejecting this refund request. This note will be visible to the customer on their tracking page.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Rejection Explanation Note (Mandatory):</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Transaction ID was not found in our bank account statement, or amount does not match."
                rows={3}
                className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setRejectingOrderId(null); setRejectReason(''); }}
                disabled={isSubmittingAction}
                className="flex-1 py-2.5 rounded-xl bg-accent text-foreground text-xs font-bold hover:bg-accent/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingAction || rejectReason.trim().length < 5}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isSubmittingAction ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {payingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 size={24} />
              <h3 className="font-black text-lg">Confirm Refund Transfer (Mark Paid)</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Confirm that you have manually executed the refund transfer in your EasyPaisa / JazzCash app to the customer's phone number.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground">Refund Transaction Reference / ID (Optional):</label>
                <input
                  type="text"
                  value={refundTrxRef}
                  onChange={e => setRefundTrxRef(e.target.value)}
                  placeholder="e.g. EP-9876543210"
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground">Administrative Note (Optional):</label>
                <input
                  type="text"
                  value={paidAdminNote}
                  onChange={e => setPaidAdminNote(e.target.value)}
                  placeholder="e.g. Sent via EasyPaisa 0301-4265785"
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setPayingOrderId(null); setRefundTrxRef(''); setPaidAdminNote(''); }}
                disabled={isSubmittingAction}
                className="flex-1 py-2.5 rounded-xl bg-accent text-foreground text-xs font-bold hover:bg-accent/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPaid}
                disabled={isSubmittingAction}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isSubmittingAction ? 'Recording...' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Order Details #{selectedOrder.id.slice(0, 8).toUpperCase()}</h3>
                <p className="text-xs text-muted-foreground">{selectedOrder.customer_name} · {selectedOrder.customer_phone}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-2 border-b border-border pb-3">
                <p className="font-bold text-foreground">Items:</p>
                {(selectedOrder.order_items || []).map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <span className="font-bold">{i.quantity}x</span> {i.menu_items?.name || 'Item'}
                      {i.selected_variants && i.selected_variants.length > 0 && (
                        <span className="text-muted-foreground ml-2">({i.selected_variants.map((v: any) => v.name).join(', ')})</span>
                      )}
                    </div>
                    <span className="font-mono">PKR {Number(i.unit_price) * Number(i.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 border-b border-border pb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono">PKR {selectedOrder.total_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee:</span>
                  <span className="font-mono">PKR {selectedOrder.delivery_fee || 0}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-primary pt-1">
                  <span>Total Amount:</span>
                  <span className="font-mono">PKR {Number(selectedOrder.total_amount) + Number(selectedOrder.delivery_fee || 0)}</span>
                </div>
              </div>

              <div className="space-y-1.5 border-b border-border pb-3">
                <p><span className="text-muted-foreground">Payment:</span> <span className="font-bold">{selectedOrder.payment_method === 'online_transfer' ? 'Online Transfer' : 'COD'}</span></p>
                {selectedOrder.payment_trx_id && (
                  <p><span className="text-muted-foreground">TID:</span> <span className="font-mono font-bold">{selectedOrder.payment_trx_id}</span></p>
                )}
                <p><span className="text-muted-foreground">Delivery Address:</span> <span className="font-medium">{selectedOrder.delivery_address}</span></p>
                <p><span className="text-muted-foreground">Cancellation Reason:</span> <span className="font-medium text-rose-500">{selectedOrder.cancel_reason || 'N/A'}</span></p>
              </div>

              {selectedOrder.refund_proof_path && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenProof(selectedOrder.refund_proof_path)}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Eye size={14} /> Open Customer Payment Receipt
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-card">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-accent text-foreground text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
