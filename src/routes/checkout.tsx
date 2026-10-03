import React, { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { createOrder } from '../server/order';
import { playSuccessChime } from '../lib/sound';
import type { CartItem } from '../types';

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State - Cached
  const [name, setName] = useState(() => JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user_profile') || '{}' : '{}').name || '');
  const [phone, setPhone] = useState(() => JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user_profile') || '{}' : '{}').phone || '');
  const [email, setEmail] = useState(() => JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user_profile') || '{}' : '{}').email || '');
  const [address, setAddress] = useState(() => JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user_profile') || '{}' : '{}').address || '');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online_transfer'>('online_transfer');
  const [trxId, setTrxId] = useState('');
  const [consent, setConsent] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGettingLocation(false);
        // We just save it. The server calculates the exact distance fee.
        // But for UI preview, we can calculate it here or fetch from an endpoint.
      },
      () => {
        setError('Failed to get location. Please ensure location permissions are granted.');
        setGettingLocation(false);
      }
    );
  };


  // Real Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
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
        deliveryAddress: address, deliveryLat: lat, deliveryLng: lng,
        paymentMethod,
        items: cartItems,
        subtotal
      } });

      if (!res.success) {
        throw new Error(res.error);
      }
      
      playSuccessChime();
      localStorage.removeItem('cart');
      localStorage.setItem('user_profile', JSON.stringify({ name, phone, email, address }));
      localStorage.setItem('active_order', res.orderId || '');
      window.dispatchEvent(new Event('cartUpdated'));
      
      // Navigate Home so they see the popup
      navigate({ to: '/' });

    } catch (err: any) {
      setError(err.message || 'Failed to place order.');
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) return setError('Please provide your name.');
      if (!address.trim()) return setError('Please provide your complete address.');
      
      const phoneRegex = /^(?:\+923|923|03)\d{9}$/;
      let normalizedPhone = phone.replace(/\s|-/g, '');
      if (!phoneRegex.test(normalizedPhone)) {
        return setError('Please enter a valid Pakistani phone number (e.g. 03001234567).');
      }
    }
    setError('');
    setStep(2);
  };

  return (
    <div className="container mx-auto px-4 pt-24 pb-32 max-w-2xl">
      <h1 className="text-3xl font-black text-slate-900 mb-8">Checkout</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-border">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <button onClick={() => navigate({ to: '/menu' })} className="mt-4 text-primary font-bold hover:underline">
            Browse Menu
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-8">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-border p-6 md:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl font-medium text-sm border border-red-100">
                {error}
              </div>
            )}

            {step === 1 && (
              <section className="animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-xl font-bold mb-6">Delivery Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Full Name *</label>
                    <input 
                      type="text" 
                      value={name} onChange={e => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Amir Khan"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                    <input 
                      type="tel" 
                      value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="0300 1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Email (Optional)</label>
                    <input 
                      type="email" 
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="amir@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Complete Address *</label>
                    <textarea 
                      value={address} onChange={e => setAddress(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                      placeholder="House, Street, Area, Lahore"
                    />
                    <button type="button" onClick={handleGetLocation} disabled={gettingLocation} className="mt-2 text-sm text-primary font-semibold flex items-center gap-1 hover:underline">
                      📍 {gettingLocation ? 'Finding...' : 'Use my current location'}
                    </button>
                    {lat && lng && <p className="text-xs text-green-600 mt-1">Location pinned successfully.</p>}
                  </div>
                </div>

                <button 
                  onClick={handleNext}
                  className="w-full mt-8 bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all text-lg"
                >
                  Continue to Payment
                </button>
              </section>
            )}

            {step === 2 && (
              <section className="animate-in fade-in slide-in-from-right-8">
                <h2 className="text-xl font-bold mb-6">Payment & Summary</h2>

                <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-border space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-bold">PKR {subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-bold">{deliveryFee === 0 ? 'FREE' : `PKR ${deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3 mt-3 text-lg">
                    <span className="font-black text-slate-900">Total</span>
                    <span className="font-black text-primary">PKR {total}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'online_transfer' ? 'border-primary bg-primary/5' : 'border-border hover:bg-slate-50'}`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="online_transfer"
                      checked={paymentMethod === 'online_transfer'}
                      onChange={() => setPaymentMethod('online_transfer')}
                      className="w-5 h-5 accent-primary"
                    />
                    <div>
                      <p className="font-bold text-slate-900">Bank Transfer / EasyPaisa</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Send to contact us on WhatsApp for account details and upload TID</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border hover:bg-slate-50'}`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="w-5 h-5 accent-primary"
                    />
                    <div>
                      <p className="font-bold text-slate-900">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground mt-0.5">+PKR 100 for orders under PKR 1000</p>
                    </div>
                  </label>
                </div>

                {paymentMethod === 'online_transfer' && (
                  <div className="mb-8 animate-in fade-in zoom-in-95">
                    <label className="block text-sm font-semibold mb-2">Transaction ID (TID) *</label>
                    <input 
                      type="text" 
                      value={trxId} onChange={e => setTrxId(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="e.g. 123456789012"
                    />
                  </div>
                )}

                <label className="flex items-start gap-3 mb-6 p-4 bg-red-50 text-red-900 border border-red-200 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-5 h-5 accent-red-600 rounded" />
                  <span className="text-sm font-medium">Orders once confirmed cannot be cancelled as preparation begins immediately. I agree and wish to place my order.</span>
                </label>

                <div className="flex gap-4 pt-6 mt-6 border-t border-border">
                  <button onClick={() => setStep(1)} className="w-1/3 bg-accent text-foreground font-bold py-3.5 rounded-xl hover:bg-accent/80 transition-colors">Back</button>
                  <button 
                    onClick={handlePlaceOrder}
                    disabled={loading || !consent} 
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
