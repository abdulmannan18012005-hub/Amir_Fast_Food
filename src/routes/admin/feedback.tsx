import { createFileRoute, Link } from '@tanstack/react-router';
import { seo } from '../../lib/seo';
import React, { useState, useEffect, useTransition } from 'react';
import { 
  Star, MessageSquareHeart, Search, Calendar, RefreshCcw, 
  Filter, ThumbsUp, AlertTriangle, ChevronLeft, ChevronRight, 
  X, Check, ExternalLink, Database, Sparkles, MessageCircle, 
  Copy, Phone, User, Clock, ShoppingBag
} from 'lucide-react';
import { PinGate } from '../../components/admin/PinGate';
import { AdminNav } from '../../components/admin/AdminNav';
import { AdminProvider, useAdminContext } from '../../components/admin/AdminContext';
import { adminCall } from '../../lib/adminSession';
import { 
  getAdminFeedbackListFn, 
  type AdminFeedbackItem, 
  type AdminFeedbackStats,
  type AdminFeedbackResponse 
} from '../../server/feedbackApi';

export const Route = createFileRoute('/admin/feedback')({
  head: () => Object.assign(
    seo({ 
      title: 'Customer Feedback - Amir Fast Food Admin', 
      description: 'Manage and review customer feedback on delivered orders.', 
      path: '/admin/feedback', 
      noindex: true 
    }), 
    { links: [{ rel: 'manifest', href: '/admin.webmanifest' }] }
  ),
  component: AdminFeedbackRoute,
});

function AdminFeedbackRoute() {
  return (
    <PinGate>
      <AdminProvider>
        <AdminNav />
        <AdminFeedbackPage />
      </AdminProvider>
    </PinGate>
  );
}

const MIGRATION_SQL = `-- Run in Supabase SQL Editor if table is not yet created:
CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  chips TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_order_feedback UNIQUE (order_id)
);
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert for delivered orders" ON public.customer_feedback
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE public.orders.id = customer_feedback.order_id AND public.orders.status = 'delivered')
  );
CREATE POLICY "Allow public read customer_feedback" ON public.customer_feedback FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_order_id ON public.customer_feedback(order_id);`;

function AdminFeedbackPage() {
  const { theme } = useAdminContext();
  const isDark = theme === 'dark';
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [stats, setStats] = useState<AdminFeedbackStats>({
    totalCount: 0,
    averageRating: 0,
    fiveStarCount: 0,
    lowRatingCount: 0,
  });
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingMigration, setPendingMigration] = useState(false);
  const [activeModalItem, setActiveModalItem] = useState<AdminFeedbackItem | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const fetchFeedback = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg('');

    try {
      const res: AdminFeedbackResponse = await adminCall(getAdminFeedbackListFn, {
        search: appliedSearch,
        rating: ratingFilter,
        date: dateFilter,
        sort: sortOrder,
        page,
        pageSize: 15,
      });

      if (res.success) {
        setItems(res.items || []);
        setStats(res.stats || { totalCount: 0, averageRating: 0, fiveStarCount: 0, lowRatingCount: 0 });
        setTotalFiltered(res.totalFiltered || 0);
        setTotalPages(res.totalPages || 1);
        setPendingMigration(!!res.pendingMigration);
      } else {
        setErrorMsg(res.error || 'Failed to fetch customer feedback.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error communicating with server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [appliedSearch, ratingFilter, dateFilter, sortOrder, page]);

  // Periodic background sync when tab is active
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && page === 1 && !isLoading) {
        fetchFeedback(true);
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [appliedSearch, ratingFilter, dateFilter, sortOrder, page, isLoading]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchQuery.trim());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setAppliedSearch('');
    setRatingFilter('all');
    setDateFilter('');
    setSortOrder('newest');
    setPage(1);
  };

  const handleCopySql = () => {
    try {
      navigator.clipboard.writeText(MIGRATION_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch { /* ignore */ }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const hasActiveFilters = appliedSearch !== '' || ratingFilter !== 'all' || dateFilter !== '' || sortOrder !== 'newest';

  return (
    <div className={`min-h-[100dvh] pb-20 transition-colors ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`px-4 sm:px-6 py-4 sticky top-0 z-10 transition-colors border-b ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <MessageSquareHeart className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Customer Feedback</h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Live ratings and reviews submitted for delivered orders</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => fetchFeedback(true)}
              disabled={isLoading || isRefreshing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Pending Migration Notice (if table not in DB) */}
        {pendingMigration && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 space-y-3">
            <div className="flex items-start gap-3">
              <Database className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-base">Database Migration Required for Feedback</h3>
                <p className="text-xs sm:text-sm text-amber-800 mt-1">
                  The <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">customer_feedback</code> table is not yet created in your Supabase database. You can run the idempotent migration SQL in your Supabase SQL Editor to enable live feedback storage.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  >
                    {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy Migration SQL'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => fetchFeedback()}
              className="text-xs font-bold text-red-800 underline hover:no-underline ml-4"
            >
              Try Again
            </button>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Feedback */}
          <div className={`rounded-2xl p-4 sm:p-5 shadow-sm space-y-2 border transition-colors ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Reviews</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {stats.totalCount}
            </div>
            <p className="text-[11px] text-slate-400">Total submissions recorded</p>
          </div>

          {/* Card 2: Average Rating */}
          <div className={`rounded-2xl p-4 sm:p-5 shadow-sm space-y-2 border transition-colors ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Average Rating</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                <Star className="w-4 h-4 fill-amber-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {stats.totalCount > 0 ? stats.averageRating : '—'}
              </span>
              {stats.totalCount > 0 && (
                <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= Math.round(stats.averageRating)
                      ? 'text-amber-500 fill-amber-500'
                      : isDark ? 'text-slate-700' : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Card 3: 5-Star Reviews */}
          <div className={`rounded-2xl p-4 sm:p-5 shadow-sm space-y-2 border transition-colors ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>5-Star Reviews</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ThumbsUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.fiveStarCount}</span>
              {stats.totalCount > 0 && (
                <span className="text-xs font-semibold text-emerald-500">
                  {Math.round((stats.fiveStarCount / stats.totalCount) * 100)}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Top-rated customer experiences</p>
          </div>

          {/* Card 4: Low Ratings (1-2 Stars) */}
          <div className={`rounded-2xl p-4 sm:p-5 shadow-sm space-y-2 border transition-colors ${
            stats.lowRatingCount > 0 
              ? isDark ? 'border-rose-800 bg-rose-950/20' : 'border-rose-300 bg-rose-50/30' 
              : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Low Ratings (1-2★)</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.lowRatingCount > 0 ? 'bg-rose-100 text-rose-600' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {stats.lowRatingCount}
            </div>
            <p className="text-[11px] text-slate-400">
              {stats.lowRatingCount > 0 ? 'Needs attention or review' : 'Zero low ratings recorded'}
            </p>
          </div>
        </section>

        {/* SEARCH & FILTERS BAR */}
        <section className={`rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 border transition-colors ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
              <input
                type="text"
                placeholder="Search by customer name, order ID, or comment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-20 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition-colors"
              >
                Search
              </button>
            </form>

            {/* Rating Filter */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rating:</span>
              <select
                value={ratingFilter}
                onChange={(e) => {
                  setPage(1);
                  setRatingFilter(e.target.value);
                }}
                className={`py-2.5 px-3 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="all">All Ratings (1–5★)</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                <option value="3">⭐⭐⭐ (3 Stars)</option>
                <option value="2">⭐⭐ (2 Stars)</option>
                <option value="1">⭐ (1 Star)</option>
                <option value="low">⚠️ Low Ratings (1–2 Stars)</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setPage(1);
                  setDateFilter(e.target.value);
                }}
                className={`pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className={`py-2.5 px-3 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-2.5 px-3 text-xs font-bold text-rose-500 hover:bg-rose-50/10 rounded-xl border border-rose-300 transition-colors whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>
        </section>

        {/* FEEDBACK LIST SECTION */}
        <section className={`rounded-2xl shadow-sm overflow-hidden border transition-colors ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-700 text-white' : 'border-slate-100 text-slate-800'
          }`}>
            <h2 className="font-bold text-base">
              {hasActiveFilters ? `Filtered Results (${totalFiltered})` : `All Feedback (${totalFiltered})`}
            </h2>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Page {page} of {totalPages}
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-slate-400">Loading feedback...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'
              }`}>
                <MessageSquareHeart className="w-7 h-7" />
              </div>
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>No Feedback Found</h3>
              <p className={`text-sm max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {hasActiveFilters
                  ? 'No feedback entries matched your current search and filter criteria.'
                  : 'Customer feedback will appear here as soon as orders are delivered and rated.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className={`mt-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (hidden on small mobile) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-5">Rating</th>
                      <th className="py-3.5 px-5">Customer & Order</th>
                      <th className="py-3.5 px-5">Feedback & Preset Chips</th>
                      <th className="py-3.5 px-5">Date</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {items.map((item) => (
                      <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/80'}`}>
                        {/* Rating column */}
                        <td className="py-4 px-5 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= item.rating
                                      ? 'text-amber-500 fill-amber-500'
                                      : isDark ? 'text-slate-700' : 'text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`font-black text-sm ml-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.rating}/5</span>
                          </div>
                        </td>

                        {/* Customer & Order */}
                        <td className="py-4 px-5 align-top">
                          <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.customerName}</div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>Order #{item.orderShortCode}</span>
                            <span>•</span>
                            <span>Rs {item.orderTotal}</span>
                          </div>
                          {item.customerPhoneMasked !== '—' && (
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {item.customerPhoneMasked}
                            </div>
                          )}
                        </td>

                        {/* Feedback & Chips */}
                        <td className="py-4 px-5 align-top max-w-md">
                          {/* Chips */}
                          {item.chips && item.chips.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {item.chips.map((chip, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full"
                                >
                                  {chip}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Written Comment */}
                          {item.comment ? (
                            <p className={`text-xs italic p-2.5 rounded-xl border line-clamp-3 ${
                              isDark ? 'bg-slate-900/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                            }`}>
                              &ldquo;{item.comment}&rdquo;
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No written comment</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className={`py-4 px-5 align-top text-xs whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatDate(item.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 align-top text-right whitespace-nowrap">
                          <button
                            onClick={() => setActiveModalItem(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-slate-100 hover:bg-primary hover:text-white text-slate-700 border-slate-200'
                            }`}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW (visible on small mobile) */}
              <div className={`block md:hidden divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                {items.map((item) => (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= item.rating
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`font-black text-sm ml-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.rating}/5</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{formatDate(item.createdAt)}</span>
                    </div>

                    <div>
                      <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.customerName}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Order #{item.orderShortCode}</span>
                        <span>•</span>
                        <span>Rs {item.orderTotal}</span>
                        {item.customerPhoneMasked !== '—' && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{item.customerPhoneMasked}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {item.chips && item.chips.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.chips.map((chip, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.comment && (
                      <p className={`text-xs italic p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                        &ldquo;{item.comment}&rdquo;
                      </p>
                    )}

                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => setActiveModalItem(item)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                      >
                        View Full Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className={`p-4 border-t flex items-center justify-between transition-colors ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                  <span className="text-xs text-slate-500">
                    Showing {items.length} of {totalFiltered} entries
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors flex items-center gap-1 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                      <ChevronLeft size={14} />
                      <span>Prev</span>
                    </button>
                    <span className={`text-xs font-bold px-2 ${isDark ? 'text-white' : 'text-slate-700'}`}>
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors flex items-center gap-1 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* DETAIL MODAL */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 transition-colors ${
            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <MessageSquareHeart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Feedback Details</h3>
                  <p className="text-xs text-slate-400">Order #{activeModalItem.orderShortCode}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Rating */}
            <div className={`border rounded-2xl p-4 flex items-center justify-between ${
              isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-100'
            }`}>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Customer Rating
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= activeModalItem.rating
                          ? 'text-amber-500 fill-amber-500'
                          : isDark ? 'text-slate-700' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeModalItem.rating}/5</span>
            </div>

            {/* Customer & Order info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`p-3 rounded-xl border space-y-1 ${
                isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-100'
              }`}>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Customer</span>
                <p className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeModalItem.customerName}</p>
                <p className="text-slate-400 font-mono">{activeModalItem.customerPhoneMasked}</p>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${
                isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-100'
              }`}>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Order Info</span>
                <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {activeModalItem.orderTotal}</p>
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: activeModalItem.orderId }}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                >
                  <span>Track View</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>

            {/* Selected Chips */}
            {activeModalItem.chips && activeModalItem.chips.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Preset Comments Chosen
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeModalItem.chips.map((chip, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                    >
                      <Check size={12} />
                      <span>{chip}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Written Comment */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Customer Written Review
              </span>
              {activeModalItem.comment ? (
                <div className={`border rounded-2xl p-4 text-sm leading-relaxed italic whitespace-pre-wrap ${
                  isDark ? 'bg-slate-900/60 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-100 text-slate-800'
                }`}>
                  &ldquo;{activeModalItem.comment}&rdquo;
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No additional written comments provided.</p>
              )}
            </div>

            {/* Submission Time */}
            <div className={`text-[11px] text-slate-400 pt-2 border-t flex items-center justify-between ${
              isDark ? 'border-slate-700' : 'border-slate-100'
            }`}>
              <span>Submitted on {formatDate(activeModalItem.createdAt)}</span>
              <span className="font-mono text-[10px] text-slate-500">ID: {activeModalItem.id.slice(0, 8)}</span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveModalItem(null)}
                className={`w-full py-2.5 px-4 font-bold rounded-xl text-sm transition-colors ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
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
