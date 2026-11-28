import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../../lib/seo';
import React, { useState, useEffect } from 'react';
import { getCompletedOrdersFn } from '../../server/order';
import { ChefHat, Search, Calendar, RefreshCcw } from 'lucide-react';
import { PinGate } from '../../components/admin/PinGate';
import { AdminNav } from '../../components/admin/AdminNav';
import { AdminProvider, useAdminContext } from '../../components/admin/AdminContext';
import { adminCall } from '../../lib/adminSession';

export const Route = createFileRoute('/admin/history')({
  head: () => Object.assign(seo({ title: 'Admin - Amir Fast Food', description: 'Admin Panel', path: '/admin', noindex: true }), { links: [{ rel: 'manifest', href: '/admin.webmanifest' }] }),
  component: AdminHistoryRoute,
});

function AdminHistoryRoute() {
  return (
    <PinGate>
      <AdminProvider>
        <AdminNav />
        <AdminHistoryPage />
      </AdminProvider>
    </PinGate>
  );
}

function AdminHistoryPage() {
  const { theme } = useAdminContext();
  const isDark = theme === 'dark';
  const [orders, setOrders] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<{ totalCount: number; deliveredCount: number; deliveredRevenue: number }>({
    totalCount: 0,
    deliveredCount: 0,
    deliveredRevenue: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await adminCall(getCompletedOrdersFn, { date: dateFilter, search: searchQuery, status: statusFilter, page, pageSize: 25 });
      setOrders(res.orders || []);
      setTotalCount(res.totalCount || 0);
      if ((res as any).summary) {
        setSummary((res as any).summary);
      }
      setRefreshError(false);
    } catch {
      setRefreshError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [dateFilter, statusFilter, page]);

  useEffect(() => {
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible' && page === 1) fetchOrders();
    }, 15000);
    const onVis = () => {
      if (document.visibilityState === 'visible' && page === 1) fetchOrders();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [dateFilter, statusFilter, page, searchQuery]);

  return (
    <div className={`min-h-[100dvh] pb-20 transition-colors ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10 transition-colors border-b ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <ChefHat className="text-primary" size={28} />
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Order History</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
            <input 
              type="text" 
              placeholder="Search Name or Phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchOrders()}
              className={`w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors ${
                isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-400' : 'bg-slate-100 border-slate-200 text-slate-900'
              }`}
            />
          </div>
          
          <div className="relative">
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
            <input 
              type="date" 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className={`pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className={`py-2 px-3 border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <option value="All">All Status</option>
            <option value="Active">Active (Rec/Prep/Out)</option>
            <option value="Delivered">Delivered</option>
            <option value="Canceled">Canceled</option>
          </select>
          
          <button 
            onClick={fetchOrders}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
            title="Refresh"
          >
            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {refreshError && (
        <div role="alert" className="bg-amber-100 border-b border-amber-300 text-amber-900 px-6 py-2 text-xs text-center font-semibold">
          Could not refresh — retrying
        </div>
      )}

      <div className={`border-b px-6 py-3 flex flex-wrap gap-2 justify-between items-center text-sm transition-colors ${
        isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          Filtered Summary ({summary.deliveredCount} delivered / {totalCount} matching orders · Page {page})
        </span>
        <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full">
          Total Delivered Revenue: PKR {summary.deliveredRevenue.toLocaleString()}
        </span>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className={`rounded-2xl shadow-sm border overflow-hidden transition-colors ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={`font-semibold uppercase tracking-wider text-xs border-b ${
                isDark ? 'bg-slate-900/60 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                <tr>
                  <th className="px-6 py-4">Order ID & Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Amount & Payment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Items</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                {orders.map(order => (
                  <tr key={order.id} className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-4">
                      <div className={`font-mono font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>#{order.id.slice(0,8).toUpperCase()}</div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {new Date(order.created_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.customer_name}</div>
                      <div className={isDark ? 'text-slate-400' : 'text-slate-500'}>{order.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-primary mb-1">PKR {Number(order.total_amount) + Number(order.delivery_fee)}</div>
                      {order.payment_method === 'cod' ? (
                        <div className={`text-xs font-semibold uppercase tracking-wider inline-block px-2 py-0.5 rounded ${
                          isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          COD
                        </div>
                      ) : order.payment_verified_at ? (
                        <div className="text-emerald-800 text-xs font-semibold bg-emerald-100 inline-block px-2 py-0.5 rounded">
                          ONLINE · verified
                        </div>
                      ) : (
                        <div className="text-amber-800 text-xs font-semibold bg-amber-100 inline-block px-2 py-0.5 rounded">
                          ONLINE · verify TID
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize
                        ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'canceled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'}`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                      {order.cancel_reason && <div className="text-xs text-red-400 mt-1 truncate max-w-[150px]" title={order.cancel_reason}>{order.cancel_reason}</div>}
                    </td>
                    <td className="px-6 py-4 max-w-[250px]">
                      <div className={`text-xs line-clamp-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {order.order_items.map((i:any) => `${i.quantity}x ${i.menu_items?.name}`).join(', ')}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className={`px-6 py-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No orders found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className={`border-t px-6 py-4 flex justify-between items-center transition-colors ${
            isDark ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Showing page {page} ({totalCount} total)</span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className={`px-4 py-2 border rounded-lg font-bold disabled:opacity-50 transition-colors ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Previous
              </button>
              <button 
                disabled={orders.length < 25}
                onClick={() => setPage(p => p + 1)}
                className={`px-4 py-2 border rounded-lg font-bold disabled:opacity-50 transition-colors ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
