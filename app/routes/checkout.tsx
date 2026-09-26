import { createFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
});

function CheckoutPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <h1 className="text-3xl font-extrabold text-white mb-8 tracking-tight">Secure Checkout</h1>
      
      {/* Progress Stepper */}
      <div className="flex items-center mb-10">
        <div className={`flex-1 h-1.5 rounded-l-full ${step >= 1 ? 'bg-red-600' : 'bg-slate-700'}`}></div>
        <div className={`flex-1 h-1.5 ${step >= 2 ? 'bg-red-600' : 'bg-slate-700'}`}></div>
        <div className={`flex-1 h-1.5 rounded-r-full ${step >= 3 ? 'bg-red-600' : 'bg-slate-700'}`}></div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
        {step === 1 && (
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white">1. Contact Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Full Name" className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white w-full" />
              <input type="tel" placeholder="Phone Number" className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white w-full" />
              <input type="email" placeholder="Email Address" className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white w-full md:col-span-2" />
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-500">Continue to Delivery</button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white">2. Delivery Address</h2>
            <textarea placeholder="Complete Street Address" rows={3} className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white w-full"></textarea>
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-lg border border-slate-700">
              <span className="text-slate-300">Delivery Fee (Orders &lt; PKR 1000)</span>
              <span className="font-bold text-white">PKR 100</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="w-1/3 bg-slate-700 text-white font-bold py-3 rounded-lg">Back</button>
              <button onClick={() => setStep(3)} className="w-2/3 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-500">Continue to Payment</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white">3. Payment Method</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-4 p-4 border border-slate-600 rounded-lg bg-slate-900/50 cursor-pointer hover:border-red-500 transition-colors">
                <input type="radio" name="payment" className="w-5 h-5 text-red-600" defaultChecked />
                <div className="flex-1">
                  <span className="font-bold text-white block">In-App Wallet</span>
                  <span className="text-emerald-400 text-sm font-medium">Balance: PKR 10,000.00</span>
                </div>
              </label>
              <label className="flex items-center gap-4 p-4 border border-slate-700 rounded-lg bg-slate-900/50 cursor-pointer hover:border-slate-500 transition-colors">
                <input type="radio" name="payment" className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <span className="font-bold text-white block">Cash on Delivery (COD)</span>
                  <span className="text-slate-400 text-sm">Pay at your doorstep (0 extra fees)</span>
                </div>
              </label>
              <label className="flex items-center gap-4 p-4 border border-slate-700 rounded-lg bg-slate-900/50 cursor-pointer hover:border-slate-500 transition-colors">
                <input type="radio" name="payment" className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <span className="font-bold text-white block">Online Transfer</span>
                  <span className="text-slate-400 text-sm">Easypaisa / JazzCash / Bank</span>
                </div>
              </label>
            </div>
            <div className="flex gap-4 pt-4 border-t border-slate-700">
              <button onClick={() => setStep(2)} className="w-1/3 bg-slate-700 text-white font-bold py-3 rounded-lg">Back</button>
              <button className="w-2/3 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-900/50">Place Order</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
