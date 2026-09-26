import { createFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';
import { createOrder } from '../server/order';

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
});

function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'cod' | 'online_transfer'>('wallet');

  // Dummy cart state for scaffold (would be from Context/Store)
  const cartItems = [
    { menu_item_id: 'dummy_id', quantity: 1, price: 550, variants: [], name: 'Ultimate Crispy Zinger' }
  ];
  const subtotal = 550;
  const deliveryFee = subtotal < 1000 ? 100 : 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await createOrder({
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        deliveryAddress: address,
        paymentMethod,
        items: cartItems,
        subtotal
      });

      if (!res.success) {
        throw new Error(res.error);
      }
      
      // Navigate to tracking
      window.location.href = `/orders/${res.orderId}`;
    } catch (err: any) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <h1 className="text-3xl font-extrabold text-white mb-8 tracking-tight">Secure Checkout</h1>
      
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

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
              <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white w-full" />
              <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white w-full" />
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white w-full md:col-span-2" />
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-500 disabled:opacity-50">Continue to Delivery</button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white">2. Delivery Address</h2>
            <textarea placeholder="Complete Street Address" value={address} onChange={e => setAddress(e.target.value)} rows={3} className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white w-full"></textarea>
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-lg border border-slate-700">
              <span className="text-slate-300">Delivery Fee (Orders &lt; PKR 1000)</span>
              <span className="font-bold text-white">{deliveryFee === 0 ? 'FREE' : `PKR ${deliveryFee}`}</span>
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
            
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 mb-6">
              <div className="flex justify-between text-slate-300 mb-2"><span>Subtotal</span><span>PKR {subtotal}</span></div>
              <div className="flex justify-between text-slate-300 mb-4"><span>Delivery</span><span>PKR {deliveryFee}</span></div>
              <div className="flex justify-between text-white font-bold text-lg border-t border-slate-700 pt-4"><span>Total</span><span>PKR {total}</span></div>
            </div>

            <div className="space-y-3">
              <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'wallet' ? 'border-red-500 bg-slate-900' : 'border-slate-700 bg-slate-900/50'}`}>
                <input type="radio" name="payment" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <span className="font-bold text-white block">In-App Wallet</span>
                </div>
              </label>
              <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-red-500 bg-slate-900' : 'border-slate-700 bg-slate-900/50'}`}>
                <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <span className="font-bold text-white block">Cash on Delivery (COD)</span>
                </div>
              </label>
            </div>
            <div className="flex gap-4 pt-4 border-t border-slate-700">
              <button onClick={() => setStep(2)} className="w-1/3 bg-slate-700 text-white font-bold py-3 rounded-lg">Back</button>
              <button 
                onClick={handlePlaceOrder}
                disabled={loading} 
                className="w-2/3 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-900/50 disabled:opacity-50 flex justify-center items-center"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
