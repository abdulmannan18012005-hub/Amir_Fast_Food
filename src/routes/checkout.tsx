import { createFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';
import { createOrder } from '../server/order';
import { playSuccessChime } from '../lib/sound';

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
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online_transfer'>('online_transfer');
  const [trxId, setTrxId] = useState('');

  // Dummy cart state for scaffold (would be from Context/Store)
  const cartItems = [
    { menu_item_id: 'dummy_id', quantity: 1, price: 550, variants: [], name: 'Ultimate Crispy Zinger' }
  ];
  const subtotal = 550;
  const deliveryFee = paymentMethod === 'cod' && subtotal < 100 ? 100 : 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await createOrder({ data: { customerName: name,
        customerPhone: phone,
        customerEmail: email,
        deliveryAddress: address,
        paymentMethod,
        items: cartItems,
        subtotal
      } });

      if (!res.success) {
        throw new Error(res.error);
      }
      
      playSuccessChime();
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
      <h1 className="text-3xl font-extrabold text-foreground mb-8 tracking-tight">Secure Checkout</h1>
      
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Progress Stepper */}
      <div className="flex items-center mb-10">
        <div className={`flex-1 h-1.5 rounded-l-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`}></div>
        <div className={`flex-1 h-1.5 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
        <div className={`flex-1 h-1.5 rounded-r-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
        {step === 1 && (
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">1. Contact Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="bg-card border border-border rounded-lg p-3 text-foreground w-full" />
              <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="bg-card border border-border rounded-lg p-3 text-foreground w-full" />
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="bg-card border border-border rounded-lg p-3 text-foreground w-full md:col-span-2" />
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-primary text-foreground font-bold py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50">Continue to Delivery</button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">2. Delivery Address</h2>
            <textarea placeholder="Complete Street Address" value={address} onChange={e => setAddress(e.target.value)} rows={3} className="bg-card border border-border rounded-lg p-3 text-foreground w-full"></textarea>
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
              <span className="text-muted-foreground">Delivery Fee (Orders &lt; PKR 1000)</span>
              <span className="font-bold text-foreground">{deliveryFee === 0 ? 'FREE' : `PKR ${deliveryFee}`}</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="w-1/3 bg-muted text-foreground font-bold py-3 rounded-lg">Back</button>
              <button onClick={() => setStep(3)} className="w-2/3 bg-primary text-foreground font-bold py-3 rounded-lg hover:bg-primary/90">Continue to Payment</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">3. Payment Method</h2>
            
            <div className="p-4 bg-card rounded-lg border border-border mb-6">
              <div className="flex justify-between text-muted-foreground mb-2"><span>Subtotal</span><span>PKR {subtotal}</span></div>
              <div className="flex justify-between text-muted-foreground mb-4"><span>Delivery</span><span>PKR {deliveryFee}</span></div>
              <div className="flex justify-between text-foreground font-bold text-lg border-t border-border pt-4"><span>Total</span><span>PKR {total}</span></div>
            </div>

            <div className="space-y-3">
              <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'online_transfer' ? 'border-red-500 bg-card' : 'border-border bg-card/50'}`}>
                <input type="radio" name="payment" checked={paymentMethod === 'online_transfer'} onChange={() => setPaymentMethod('online_transfer')} className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <span className="font-bold text-foreground block">Online Pre-Payment (FREE Delivery)</span>
                  <span className="text-xs text-emerald-400 block mt-1">Pay via Easypaisa/JazzCash to 0300-1234567 (Title: Amir Fast Food)</span>
                  {paymentMethod === 'online_transfer' && (
                    <input type="text" placeholder="Enter Transaction ID (TID) / Ref" value={trxId} onChange={e => setTrxId(e.target.value)} className="mt-3 bg-slate-950 border border-border rounded-lg p-2 text-foreground w-full text-sm" />
                  )}
                </div>
              </label>
              <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-red-500 bg-card' : 'border-border bg-card/50'}`}>
                <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <span className="font-bold text-foreground block">Cash on Delivery (COD)</span>
                  <span className="text-xs text-muted-foreground block mt-1">PKR 100 fee for orders under PKR 100</span>
                </div>
              </label>
            </div>
            <div className="flex gap-4 pt-4 border-t border-border">
              <button onClick={() => setStep(2)} className="w-1/3 bg-muted text-foreground font-bold py-3 rounded-lg">Back</button>
              <button 
                onClick={handlePlaceOrder}
                disabled={loading} 
                className="w-2/3 bg-emerald-600 text-foreground font-bold py-3 rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-900/50 disabled:opacity-50 flex justify-center items-center"
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
