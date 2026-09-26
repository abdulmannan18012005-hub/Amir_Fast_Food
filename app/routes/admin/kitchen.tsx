import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import type { Order } from '../../types';

export const Route = createFileRoute('/admin/kitchen')({
  component: KitchenDisplaySystem,
});

function KitchenDisplaySystem() {
  const [orders, setOrders] = useState<Order[]>([]);

  // Simulation placeholder - Will connect to Supabase Realtime later
  useEffect(() => {
    // Scaffold UI state
    setOrders([
      {
        id: 'ord_123', status: 'received', total_amount: 1550, delivery_fee: 0,
        payment_method: 'wallet', customer_name: 'Ahmed', customer_phone: '',
        customer_email: '', delivery_address: '', created_at: new Date().toISOString(),
        user_id: null
      }
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col w-full font-mono">
      <header className="flex justify-between items-center mb-8 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <h1 className="text-2xl font-bold text-red-500">KITCHEN DISPLAY SYSTEM</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
            Live (WebSockets Connected)
          </div>
        </div>
      </header>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        
        {/* Kanban Column 1 */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-800/50 rounded-t-xl">
            <h2 className="font-bold text-white">RECEIVED ({orders.filter(o => o.status === 'received').length})</h2>
          </div>
          <div className="p-4 flex-grow overflow-y-auto space-y-4">
            {orders.filter(o => o.status === 'received').map(o => (
              <div key={o.id} className="bg-slate-950 border-l-4 border-l-red-500 p-4 rounded shadow">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-white">#{o.id.slice(0, 6)}</span>
                  <span className="text-slate-400 text-sm">2 mins ago</span>
                </div>
                <div className="text-slate-300 mb-4">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>1x Ultimate Crispy Zinger</li>
                    <li>2x Loaded Garlic Mayo Fries</li>
                  </ul>
                </div>
                <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded transition">
                  Start Preparing
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Kanban Column 2 */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-amber-500/10 rounded-t-xl">
            <h2 className="font-bold text-amber-500">PREPARING (0)</h2>
          </div>
          <div className="p-4 flex-grow overflow-y-auto space-y-4">
            {/* Items */}
          </div>
        </div>

        {/* Kanban Column 3 */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-emerald-500/10 rounded-t-xl">
            <h2 className="font-bold text-emerald-500">READY FOR RIDER (0)</h2>
          </div>
          <div className="p-4 flex-grow overflow-y-auto space-y-4">
            {/* Items */}
          </div>
        </div>

      </div>
    </div>
  );
}
