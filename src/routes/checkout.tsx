import { friendlyMessage } from '../lib/errors';
import { SHOP_PHONE_LOCAL, SHOP_WHATSAPP, SHOP_PAYMENT_VERIFICATION_NOTE } from '../lib/shop';
import React, { useState, useEffect, useRef } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { reverseGeocodeFn } from '../server/location';
import { quoteDeliveryFn } from '../server/pricingApi';
import { safeJson } from '../lib/storage';
import { seo } from '../lib/seo';
import { getCartSubtotal } from '../lib/cart';
import { useShopStatus } from '../hooks/useShopStatus';
import { useOrderDraft } from '../lib/orderDraft';
import { submitOrder } from '../lib/orderSubmit';
import { validateName, validatePhone, validateAddress, validateTid } from '../lib/orderValidation';
import type { CartItem } from '../types';

export const Route = createFileRoute('/checkout')({
  validateSearch: (search: Record<string, unknown>): { step?: number } => {
    const s = Number(search.step);
    return s ? { step: s } : {};
  },
  head: () => seo({ title: 'Checkout - Amir Fast Food', description: 'Complete your Amir Fast Food order.', path: '/checkout' }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const shopStatus = useShopStatus();
  const [draft, updateDraft, clearDraft] = useOrderDraft();

  const [step, setStep] = useState<number>(() => {
    if (search?.step === 2) return 2;
    if (draft.step >= 4) return 2;
    return 1;
  });

  const [successOrderId, setSuccessOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State - Synchronized with Draft
  const [name, setName] = useState(draft.contact.name);
  const [phone, setPhone] = useState(draft.contact.phone);
  const [email, setEmail] = useState(draft.contact.email);
  const [address, setAddress] = useState(draft.delivery.address);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online_transfer'>(
    draft.payment.method || 'online_transfer'
  );
  const [trxId, setTrxId] = useState(draft.payment.trxId);
  const [consent, setConsent] = useState(false);
  const [lat, setLat] = useState<number | null>(draft.delivery.lat);
  const [lng, setLng] = useState<number | null>(draft.delivery.lng);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<any>(null);

  const saveToDraftDebounced = (patch: Parameters<typeof updateDraft>[0]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      updateDraft(patch);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (step === 1) {
      if (!name.trim()) {
        nameInputRef.current?.focus();
      } else if (!phone.trim()) {
        phoneInputRef.current?.focus();
      } else if (!address.trim()) {
        addressInputRef.current?.focus();
      }
    }
  }, [step]);

  const handleNameChange = (val: string) => {
    setName(val);
    saveToDraftDebounced({ contact: { name: val } });
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    saveToDraftDebounced({ contact: { phone: val } });
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    saveToDraftDebounced({ contact: { email: val } });
  };

  const handleAddressChange = (val: string) => {
    setAddress(val);
    saveToDraftDebounced({ delivery: { address: val, source: 'typed' } });
  };

  const handlePaymentMethodChange = (method: 'cod' | 'online_transfer') => {
    setPaymentMethod(method);
    updateDraft({ payment: { method, chosen: true } });
  };

  const handleTrxIdChange = (val: string) => {
    setTrxId(val);
    saveToDraftDebounced({ payment: { trxId: val } });
  };
  
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locMsg, setLocMsg] = useState('');
  
  // Pricing State
  const [distanceKm, setDistanceKm] = useState(0);
  const [codFee, setCodFee] = useState(0);
  const [distanceFee, setDistanceFee] = useState(0);
  const [totalDeliveryFee, setTotalDeliveryFee] = useState(0);
  const [distanceError, setDistanceError] = useState('');

  // Real Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const subtotal = getCartSubtotal(cartItems);
  const total = subtotal + totalDeliveryFee;

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCartItems(safeJson('cart', []));
    }
  }, []);

  // Update quote when location or payment changes
  useEffect(() => {
    if (cartItems.length === 0) return;
    
    quoteDeliveryFn({ data: { lat, lng, address, subtotal, paymentMethod } })
      .then(res => {
        if (!res.ok) {
          setDistanceError(res.error || 'Delivery unavailable.');
          setTotalDeliveryFee(0);
        } else {
          setDistanceError('');
          setDistanceKm(res.distanceKm || 0);
          setCodFee(res.codFee || 0);
          setDistanceFee(res.distanceFee || 0);
          setTotalDeliveryFee(res.totalDeliveryFee || 0);
        }
      });
  }, [lat, lng, address, subtotal, paymentMethod, cartItems.length]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    setLocMsg('Finding your location...');
    setError('');
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = pos.coords;
        setLat(coords.latitude);
        setLng(coords.longitude);
        
        if (coords.accuracy > 200) {
          setLocMsg('Location is approximate — please check the address.');
        } else {
          setLocMsg('Location pinned successfully.');
        }
        
        let resolvedAddr = '';
        try {
          const addr = await reverseGeocodeFn({ data: { lat: coords.latitude, lng: coords.longitude } });
          if (addr) {
            resolvedAddr = addr;
            setAddress(addr);
            setLocMsg('Address updated with pinned location.');
          } else {
             const fallback = `GPS location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
             if (!address) {
               resolvedAddr = fallback;
               setAddress(fallback);
             }
          }
        } catch(e) {
          const fallback = `GPS location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
          if (!address) {
            resolvedAddr = fallback;
            setAddress(fallback);
          }
        }
        
        updateDraft({
          delivery: {
            lat: coords.latitude,
            lng: coords.longitude,
            source: 'gps',
            ...(resolvedAddr ? { address: resolvedAddr } : {})
          }
        });
        
        setGettingLocation(false);
      },
      (err) => {
        setGettingLocation(false);
        setLocMsg('');
        if (err.code === err.PERMISSION_DENIED) {
           setError('Please enable location permissions in your browser/phone settings.');
        } else if (err.code === err.TIMEOUT) {
           setError('Location request timed out.');
        } else {
           setError('Failed to get location. Please type your address.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handlePlaceOrder = async () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    
    setLoading(true);
    setError('');

    const currentDraft = {
      ...draft,
      contact: { name, phone, email },
      delivery: { address, lat, lng, source: draft.delivery.source },
      payment: { method: paymentMethod, chosen: true, trxId }
    };

    const res = await submitOrder(currentDraft, cartItems);

    if (!res.success) {
      setError(res.error || 'Failed to place order.');
      setLoading(false);
      return;
    }

    setSuccessOrderId(res.orderId || '');
    setStep(3);
    setLoading(false);
  };

  const handleNext = () => {
    if (step === 1) {
      const nameVal = validateName(name);
      if (!nameVal.valid) return setError(nameVal.error || 'Please provide your name.');
      
      const phoneVal = validatePhone(phone);
      if (!phoneVal.valid) return setError(phoneVal.error || 'Please enter a valid Pakistani phone number.');
      
      const addrVal = validateAddress(address);
      if (!addrVal.valid) return setError(addrVal.error || 'Please provide your complete address.');
      
      if (distanceError) return setError(distanceError);

      updateDraft({
        step: 4,
        contact: { name: nameVal.normalized, phone: phoneVal.normalized, email: email.trim() },
        delivery: { address: addrVal.normalized, lat, lng }
      });
    }
    setError('');
    setStep(2);
  };

  return (
    <div className="container mx-auto px-4 pt-24 pb-32 max-w-2xl">
      <h1 className="text-3xl font-black text-slate-900 mb-8">Checkout</h1>

      {cartItems.length === 0 && step !== 3 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-border">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <button onClick={() => navigate({ to: '/menu' })} className="mt-4 text-primary font-bold hover:underline">
            Browse Menu
          </button>
        </div>
      ) : (
        <>
          {step !== 3 && (
            <div className="flex gap-2 mb-8">
              <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-border p-6 md:p-8">
            {!shopStatus.open && (
              <div role="alert" className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-900 rounded-2xl font-medium text-sm leading-relaxed">
                {shopStatus.closedMessage}
              </div>
            )}
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl font-medium text-sm border border-red-100">
                {error}
              </div>
            )}

            {step === 1 && (
              <section className="animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-xl font-bold mb-6">Delivery Details</h2>
                
                <input type="text" id="website_honeypot" name="website_url_hp" style={{position: 'absolute', left: '-9999px'}} tabIndex={-1} autoComplete="off" aria-hidden="true" />
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="checkout-name" className="block text-sm font-semibold mb-2">Full Name *</label>
                    <input 
                      ref={nameInputRef}
                      id="checkout-name"
                      name="name"
                      type="text"
                      autoComplete="name" 
                      value={name} onChange={e => handleNameChange(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Amir Khan"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="checkout-phone" className="block text-sm font-semibold mb-2">Phone Number *</label>
                    <input 
                      ref={phoneInputRef}
                      id="checkout-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel" 
                      value={phone} onChange={e => handlePhoneChange(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="0300 1234567"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="checkout-email" className="block text-sm font-semibold mb-2">Email (Optional)</label>
                    <input 
                      id="checkout-email"
                      name="email"
                      type="email"
                      autoComplete="email" 
                      value={email} onChange={e => handleEmailChange(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="amir@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="checkout-address" className="block text-sm font-semibold mb-2">Complete Address *</label>
                    <textarea 
                      ref={addressInputRef}
                      id="checkout-address"
                      name="address"
                      autoComplete="street-address"
                      value={address} onChange={e => handleAddressChange(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                      placeholder="House, Street, Area, Lahore"
                      required
                    />
                    <button type="button" onClick={handleGetLocation} disabled={gettingLocation} className="mt-2 text-sm text-primary font-semibold flex items-center gap-1 hover:underline">
                      📍 {gettingLocation ? 'Finding...' : 'Use my current location'}
                    </button>
                    {locMsg && <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">{locMsg}</p>}
                    {distanceKm > 0 && (
                       <p className="text-xs text-muted-foreground mt-2">
                         📍 Location pinned · about {distanceKm.toFixed(1)} km from the shop · delivery fee PKR {totalDeliveryFee}
                       </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Please add your house/shop number and a landmark so the rider finds you.</p>
                  </div>
                </div>

                <button 
                  onClick={handleNext}
                  disabled={!!distanceError}
                  className="w-full mt-8 bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all text-lg disabled:opacity-50"
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
                    <span className="font-bold">
                       {totalDeliveryFee === 0 ? 'FREE' : `PKR ${totalDeliveryFee}`}
                    </span>
                  </div>
                  {distanceFee > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground pl-4">
                      <span>Distance Fee</span>
                      <span>PKR {distanceFee}</span>
                    </div>
                  )}
                  {codFee > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground pl-4">
                      <span>COD Fee</span>
                      <span>PKR {codFee}</span>
                    </div>
                  )}
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
                      onChange={() => handlePaymentMethodChange('online_transfer')}
                      className="w-5 h-5 accent-primary flex-shrink-0"
                    />
                    <div>
                      <p className="font-bold text-slate-900">Bank Transfer / EasyPaisa</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Send the total amount by EasyPaisa / JazzCash to {SHOP_PHONE_LOCAL}, then enter your Transaction ID (TID) below. Questions? <a href={`https://wa.me/${SHOP_WHATSAPP}`} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp" className="text-primary hover:underline">WhatsApp us on the same number.</a>
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border hover:bg-slate-50'}`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => handlePaymentMethodChange('cod')}
                      className="w-5 h-5 accent-primary flex-shrink-0"
                    />
                    <div>
                      <p className="font-bold text-slate-900">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground mt-0.5">+PKR 100 for orders under PKR 1000</p>
                    </div>
                  </label>
                </div>

                {paymentMethod === 'online_transfer' && (
                  <div className="mb-8 animate-in fade-in zoom-in-95">
                    <label htmlFor="checkout-trxid" className="block text-sm font-semibold mb-2">Transaction ID (TID) *</label>
                    <input 
                      id="checkout-trxid"
                      name="trxId"
                      type="text" 
                      value={trxId} onChange={e => handleTrxIdChange(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="e.g. 123456789012"
                    />
                    <p className="text-xs text-muted-foreground mt-2">{SHOP_PAYMENT_VERIFICATION_NOTE}</p>
                  </div>
                )}

                <label className="flex items-start gap-3 mb-6 p-4 bg-red-50 text-red-900 border border-red-200 rounded-xl cursor-pointer">
                  <input type="checkbox"  checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-5 h-5 accent-red-600 rounded flex-shrink-0" />
                  <span className="text-sm font-medium leading-tight">Orders cannot be cancelled on the website once placed as kitchen preparation begins immediately. I agree and wish to place my order.</span>
                </label>

                <div className="flex gap-4 pt-6 mt-6 border-t border-border">
                  <button onClick={() => setStep(1)} className="w-1/3 bg-accent text-foreground font-bold py-3.5 rounded-xl hover:bg-accent/80 transition-colors">Back</button>
                  <button 
                    onClick={handlePlaceOrder}
                    disabled={loading || !consent || !shopStatus.open} 
                    className="w-2/3 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/30 disabled:opacity-50 flex justify-center items-center transition-all"
                  >
                    {loading ? 'Processing...' : !shopStatus.open ? 'Closed right now' : 'Place Order'}
                  </button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="animate-in fade-in zoom-in-95 text-center py-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4">Order Placed!</h2>
                <p className="text-muted-foreground mb-8 text-lg">Your order #{successOrderId.slice(0,8).toUpperCase()} has been sent to the kitchen.</p>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-border mb-8">
                  <p className="font-semibold text-slate-900 mb-2">Permanent Tracking Link:</p>
                  <Link to="/orders/$orderId" params={{ orderId: successOrderId }} className="text-primary hover:underline font-mono text-sm break-all">
                    https://amir-fast-food.vercel.app/orders/{successOrderId}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-4">Save this link to track your order status with live updates.</p>
                </div>

                <Link to="/orders/$orderId" params={{ orderId: successOrderId }} className="inline-block w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all text-lg mb-4">
                  Track My Order Now
                </Link>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
