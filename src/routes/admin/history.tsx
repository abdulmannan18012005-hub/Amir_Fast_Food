import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { getCompletedOrdersFn } from '../../server/order';
import { ChefHat, Search, Calendar, RefreshCcw } from 'lucide-react';

export const Route = createFileRoute('/admin/history')({
  component: AdminHistoryPage,
});

function AdminHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('admin_pin') !== null;
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    const savedPin = sessionStorage.getItem('admin_pin') || '';
    try {
      const data = await getCompletedOrdersFn({ data: { pin: savedPin, date: dateFilter, search: searchQuery } });
      setOrders(data || []);
    } catch (e: any) {
      if (e.message?.includes('Unauthorized')) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_pin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchOrders();
  }, [isAuthenticated, dateFilter]); // search is done on button click/enter

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await getCompletedOrdersFn({ data: { pin } });
      sessionStorage.setItem('admin_pin', pin);
      setIsAuthenticated(true);
    } catch (e: any) {
      alert(e.message || 'Invalid PIN');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-xl border border-slate-700">
          <ChefHat className="text-primary w-16 h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Order History Access</h1>
          <input 
            type="password" 
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-slate-900 border border-slate-700 text-white text-center text-xl tracking-[0.5em] rounded-xl py-3 mb-4 focus:outline-none focus:border-primary"
            autoFocus
          />
          <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-4 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 bg-slate-800 p-4 rounded-2xl border border-slate-700 gap-4">
        <div className="flex items-center gap-4">
          <ChefHat className="text-primary" size={32} />
          <h1 className="text-xl font-bold text-white">Order History</h1>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchOrders()}
              className="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-primary focus:outline-none text-white text-sm"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full md:w-48 pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-primary focus:outline-none text-white text-sm [color-scheme:dark]"
            />
          </div>
          <button onClick={fetchOrders} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-xl text-white flex items-center justify-center transition-colors">
            <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-400">
              <tr>
                <th className="p-4 font-semibold">Date & Time</th>
                <th className="p-4 font-semibold">Order ID</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No completed orders found for this criteria.
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="p-4 text-slate-400">
                      {new Date(order.created_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">{order.id.slice(0,8)}</td>
                    <td className="p-4">
                      <div className="text-white font-medium">{order.customer_name}</div>
                      <div className="text-slate-500 text-xs">{order.customer_phone}</div>
                    </td>
                    <td className="p-4 text-xs text-slate-400 truncate max-w-[200px]" title={order.order_items?.map((i:any)=>`${i.quantity}x ${i.menu_items?.name}`).join(', ')}>
                      {order.order_items?.map((i:any)=>`${i.quantity}x ${i.menu_items?.name}`).join(', ')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-400">
                      Rs {order.total_amount + order.delivery_fee}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
