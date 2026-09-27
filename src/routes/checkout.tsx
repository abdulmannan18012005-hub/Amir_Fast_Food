import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import { createOrder } from '../server/order';
import { playSuccessChime } from '../lib/sound';
import type { CartItem } from '../types';

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

  // Real Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  const subtotal = cartItems.reduce((acc, item) => {
    const varsTotal = item.variants?.reduce((vSum, v) => vSum + (v.price || 0), 0) || 0;
    return acc + ((item.price || 0) + varsTotal) * item.quantity;
  }, 0);

  // Fee logic: Only COD under 1000 has 100rs fee.
  const deliveryFee = paymentMethod === 'cod' && subtotal < 1000 && subtotal > 0 ? 100 : 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (paymentMethod === 'online_transfer' && !trxId.trim()) {
      setError('Please provide the Transaction ID (TID) for your payment.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await createOrder({ data: { 
        customerName: name,
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
      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cartUpdated'));
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
        <div className="mb-6 bg-destructive/10 border border-destructive text-destructive p-4 rounded-xl">
          {error}
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="text-center bg-card rounded-2xl p-12 border border-border">
          <p className="text-muted-foreground mb-4">Your cart is empty.</p>
          <a href="/menu" className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-full">Return to Menu</a>
        </div>
      ) : (
        <>
          {/* Progress Stepper */}
          <div className="flex items-center mb-10">
            <div className={`flex-1 h-1.5 rounded-l-full ${step >= 1 ? 'bg-primary' : 'bg-muted transition-colors'}`}></div>
            <div className={`flex-1 h-1.5 ${step >= 2 ? 'bg-primary' : 'bg-muted transition-colors'}`}></div>
            <div className={`flex-1 h-1.5 rounded-r-full ${step >= 3 ? 'bg-primary' : 'bg-muted transition-colors'}`}></div>
          </div>

          <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-xl">
            {step === 1 && (
              <section className="space-y-6 animate-in fade-in">
                <h2 className="text-xl font-bold text-foreground">1. Contact Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="bg-accent/50 border border-border rounded-xl p-3.5 text-foreground w-full focus:ring-2 focus:ring-primary focus:outline-none" />
                  <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="bg-accent/50 border border-border rounded-xl p-3.5 text-foreground w-full focus:ring-2 focus:ring-primary focus:outline-none" />
                  <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="bg-accent/50 border border-border rounded-xl p-3.5 text-foreground w-full md:col-span-2 focus:ring-2 focus:ring-primary focus:outline-none" />
                </div>
                <button onClick={() => setStep(2)} disabled={!name || !phone} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">Continue to Delivery</button>
              </section>
            )}

                          {step === 2 && (
                <section className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-xl font-bold text-foreground">2. Fulfillment</h2>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => { localStorage.setItem('fulfillment', 'delivery'); setAddress(''); window.dispatchEvent(new Event('fulfillmentUpdated')); }}
                      className={`w-1/2 py-3.5 rounded-xl font-bold transition-colors ${(localStorage.getItem('fulfillment') || 'delivery') === 'delivery' ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground border border-border'}`}
                    >
                      Delivery 🛵
                    </button>
                    <button 
                      onClick={() => { localStorage.setItem('fulfillment', 'takeaway'); setAddress('Takeaway'); window.dispatchEvent(new Event('fulfillmentUpdated')); }}
                      className={`w-1/2 py-3.5 rounded-xl font-bold transition-colors ${localStorage.getItem('fulfillment') === 'takeaway' ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground border border-border'}`}
                    >
                      Takeaway 🏪
                    </button>
                  </div>
                  
                  {(localStorage.getItem('fulfillment') || 'delivery') === 'delivery' && (
                    <textarea placeholder="Complete Street Address (House/Apt, Street, Area)" value={address === 'Takeaway' ? '' : address} onChange={e => setAddress(e.target.value)} rows={4} className="bg-accent/50 border border-border rounded-xl p-3.5 text-foreground w-full focus:ring-2 focus:ring-primary focus:outline-none"></textarea>
                  )}
                  
                  <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className="w-1/3 bg-accent text-foreground font-bold py-3.5 rounded-xl hover:bg-accent/80 transition-colors">Back</button>
                    <button onClick={() => setStep(3)} disabled={(localStorage.getItem('fulfillment') || 'delivery') === 'delivery' && (!address || address === 'Takeaway')} className="w-2/3 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">Continue to Payment</button>
                  </div>
                </section>
              )}

            {step === 3 && (
              <section className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-xl font-bold text-foreground">3. Payment Method</h2>
                
                <div className="p-5 bg-background rounded-xl border border-border/50 mb-6 space-y-3">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>PKR {subtotal}</span></div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Fee</span>
                    {deliveryFee === 0 ? <span className="text-emerald-500 font-bold">FREE</span> : <span>PKR {deliveryFee}</span>}
                  </div>
                  <div className="flex justify-between text-foreground font-extrabold text-xl border-t border-border/50 pt-3 mt-1"><span>Total</span><span>PKR {total}</span></div>
                </div>

                <div className="space-y-4">
                  <label className={`block border rounded-xl overflow-hidden cursor-pointer transition-all ${paymentMethod === 'online_transfer' ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/10' : 'border-border bg-accent/20'}`}>
                    <div className="flex items-center gap-4 p-5 bg-card" onClick={() => setPaymentMethod('online_transfer')}>
                      <input type="radio" name="payment" checked={paymentMethod === 'online_transfer'} readOnly className="w-5 h-5 text-primary" />
                      <div>
                        <span className="font-bold text-foreground block text-lg">Online Bank / Wallet Transfer</span>
                        <span className="text-sm text-emerald-500 font-medium block mt-0.5">Secure • FREE Delivery Always</span>
                      </div>
                    </div>
                    {paymentMethod === 'online_transfer' && (
                      <div className="p-5 bg-background/50 border-t border-border/50 flex flex-col md:flex-row gap-6 items-start">
                        <div className="shrink-0 bg-white p-2 rounded-lg mx-auto md:mx-0">
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=03001234567" alt="Easypaisa/JazzCash QR" className="w-24 h-24" />
                        </div>
                        <div className="flex-1 w-full space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Pay to EasyPaisa / JazzCash / Bank Account</p>
                            <p className="font-mono text-xl font-bold text-foreground tracking-wider mt-1">0300 1234567</p>
                            <p className="text-sm font-semibold text-primary mt-1">Account Title: AMIR FAST FOOD</p>
                          </div>
                          <input type="text" placeholder="Enter 11-digit Transaction ID (TID) / Ref No." value={trxId} onChange={e => setTrxId(e.target.value)} className="bg-card border border-border rounded-lg p-3 text-foreground w-full text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                        </div>
                      </div>
                    )}
                  </label>

                  <label className={`block border rounded-xl overflow-hidden cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/10' : 'border-border bg-accent/20'}`}>
                    <div className="flex items-center gap-4 p-5 bg-card" onClick={() => setPaymentMethod('cod')}>
                      <input type="radio" name="payment" checked={paymentMethod === 'cod'} readOnly className="w-5 h-5 text-primary" />
                      <div>
                        <span className="font-bold text-foreground block text-lg">Cash on Delivery (COD)</span>
                        <span className="text-sm text-muted-foreground block mt-0.5">Pay in cash when order arrives</span>
                        {subtotal < 1000 && <span className="text-xs text-amber-500 font-bold block mt-1">PKR 100 delivery fee added (orders under PKR 1000)</span>}
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex gap-4 pt-6 mt-6 border-t border-border">
                  <button onClick={() => setStep(2)} className="w-1/3 bg-accent text-foreground font-bold py-3.5 rounded-xl hover:bg-accent/80 transition-colors">Back</button>
                  <button 
                    onClick={handlePlaceOrder}
                    disabled={loading} 
                    className="w-2/3 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/30 disabled:opacity-50 flex justify-center items-center transition-all"
                  >
                    {loading ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
