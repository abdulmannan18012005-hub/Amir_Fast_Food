import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../../lib/seo';
import React, { useState, useEffect } from 'react';
import { getCompletedOrdersFn } from '../../server/order';
import { ChefHat, Search, Calendar, RefreshCcw } from 'lucide-react';
import { PinGate } from '../../components/admin/PinGate';
import { safeJson, getRawSession } from '../../lib/storage';

export const Route = createFileRoute('/admin/history')({
  head: () => seo({ title: 'Admin - Amir Fast Food', description: 'Admin Panel', path: '/admin', noindex: true }),
  component: AdminHistoryRoute,
});

function AdminHistoryRoute() {
  return (
    <PinGate>
      <AdminHistoryPage />
    </PinGate>
  );
}

function AdminHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    const savedPin = getRawSession('admin_pin') || '';
    try {
      const res = await getCompletedOrdersFn({ data: { pin: savedPin, date: dateFilter, search: searchQuery, status: statusFilter, page, pageSize: 25 } });
      setOrders(res.orders || []);
      setTotalCount(res.totalCount || 0);
    } catch (e: any) {
      if (e.message?.includes('Unauthorized')) {
        sessionStorage.removeItem('admin_pin');
        window.location.reload();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [dateFilter, statusFilter, page]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <ChefHat className="text-primary" size={28} />
          <h1 className="text-xl font-bold text-slate-900">Order History</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Name or Phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchOrders()}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="date" 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary"
          >
            <option value="All">All Status</option>
            <option value="Active">Active (Rec/Prep/Out)</option>
            <option value="Delivered">Delivered</option>
            <option value="Canceled">Canceled</option>
          </select>
          
          <button 
            onClick={fetchOrders}
            className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Order ID & Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Amount & Payment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-slate-900 mb-1">#{order.id.slice(0,8).toUpperCase()}</div>
                      <div className="text-slate-500 text-xs">
                        {new Date(order.created_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{order.customer_name}</div>
                      <div className="text-slate-500">{order.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-primary mb-1">PKR {Number(order.total_amount) + Number(order.delivery_fee)}</div>
                      <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-100 inline-block px-2 py-0.5 rounded">
                        {order.payment_method}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize
                        ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'canceled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'}`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                      {order.cancel_reason && <div className="text-xs text-red-500 mt-1 truncate max-w-[150px]" title={order.cancel_reason}>{order.cancel_reason}</div>}
                    </td>
                    <td className="px-6 py-4 max-w-[250px]">
                      <div className="text-xs text-slate-600 line-clamp-2">
                        {order.order_items.map((i:any) => `${i.quantity}x ${i.menu_items?.name}`).join(', ')}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No orders found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="border-t border-slate-200 px-6 py-4 flex justify-between items-center bg-slate-50">
            <span className="text-sm text-slate-500">Showing page {page} ({totalCount} total)</span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={orders.length < 25}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-50"
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
