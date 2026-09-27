import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';

export const Route = createFileRoute('/orders/$orderId')({
  component: OrderTrackingPage,
});

function OrderTrackingPage() {
  const { orderId } = Route.useParams();
  const [stage, setStage] = useState(0);

  // Simulator for UI purposes
  useEffect(() => {
    const interval = setInterval(() => {
      setStage(s => (s < 3 ? s + 1 : s));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const stages = [
    { label: 'Received', desc: 'We have received your order.' },
    { label: 'Preparing', desc: 'Your food is being cooked.' },
    { label: 'Out for Delivery', desc: 'Rider is on the way.' },
    { label: 'Delivered', desc: 'Enjoy your meal!' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 w-full">
      <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
        
        {/* Top Header / Map Placeholder */}
        <div className="h-64 bg-slate-900 relative border-b border-slate-700 flex flex-col items-center justify-center">
          {/* Animated 2D/3D moving bike canvas will go here */}
          <div className="text-slate-500 font-medium mb-4">[ 3D Moving Delivery Bike Canvas ]</div>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500 via-slate-900 to-slate-900"></div>
          
          <div className="z-10 bg-slate-800/80 backdrop-blur px-6 py-3 rounded-full border border-slate-700 shadow-lg flex items-center gap-3 transition-transform">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-white font-bold tracking-wide">
              {stages[stage].label}
            </span>
          </div>
        </div>

        {/* Tracking Details */}
        <div className="p-8">
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Order #{orderId.slice(0,8)}</h1>
              
            </div>
            <span className="text-slate-400 font-mono text-sm">ETA: 25 mins</span>
          </div>

          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
            {stages.map((s, idx) => {
              const isPast = idx < stage;
              const isActive = idx === stage;
              return (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-800 bg-slate-900 text-slate-500 group-[.is-active]:bg-red-600 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors z-10" style={{
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
