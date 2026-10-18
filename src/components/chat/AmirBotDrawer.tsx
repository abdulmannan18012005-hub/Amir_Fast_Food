import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { 
  Bot, X, Send, Trash2, Check, ArrowRight, ArrowLeft, 
  RotateCcw, Plus, Minus, ShoppingBag, MapPin, CreditCard, 
  AlertCircle, CheckCircle2, ExternalLink, Edit2
} from 'lucide-react';
import { playSuccessChime } from '../../lib/sound';
import { chatWithAmirBot } from '../../server/chat';
import { reverseGeocodeFn } from '../../server/location';
import { quoteDeliveryFn } from '../../server/pricingApi';
import { 
  addToCart, getCart, removeItem, updateItemQuantity, 
  clearCart, getCartSubtotal, lineTotal 
} from '../../lib/cart';
import { useOrderDraft, clearDraft } from '../../lib/orderDraft';
import { submitOrder } from '../../lib/orderSubmit';
import { validateName, validatePhone, validateAddress, validateTid } from '../../lib/orderValidation';
import { useShopStatus } from '../../hooks/useShopStatus';
import { 
  SHOP_PHONE_LOCAL, SHOP_WHATSAPP, 
  SHOP_ESTIMATED_DELIVERY_TIME, SHOP_CANCELLATION_POLICY, 
  SHOP_PAYMENT_VERIFICATION_NOTE 
} from '../../lib/shop';
import { 
  DEFAULT_DRINKS, DEFAULT_SIDES, getAllAvailableUpgrades, 
  detectInitialVariants, buildCompleteVariants 
} from '../../lib/variants';
import type { CartItem, ItemVariant } from '../../types';

type Msg = { role: 'user' | 'bot' | 'system'; text: string; time?: string };
type ToastInfo = { id: number; msg: string; type: 'success' | 'error' | 'info' };

const STORAGE_KEY = 'amirbot_chat';
const DEFAULT_MSG: Msg[] = [
  { 
    role: 'bot', 
    text: 'Hi! I am AmirBot. I can help you build your cart, take your delivery and payment details, and place your order.' 
  }
];

const STEP_LABELS = [
  'Cart',
  'Contact',
  'Delivery',
  'Payment',
  'Review',
  'Place order',
  'Done'
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AmirBotDrawer({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const shopStatus = useShopStatus();
  const [draft, updateDraft] = useOrderDraft();

  // Cart State (hydrated via event listeners)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') return getCart();
    return [];
  });

  const subtotal = getCartSubtotal(cartItems);

  // Active step (1 to 7)
  const step = Math.min(Math.max(1, draft.step || 1), 7);
  const setStep = (s: number) => {
    updateDraft({ step: s });
  };

  // Chat message state
  const [messages, setMessages] = useState<Msg[]>(DEFAULT_MSG);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Delivery quote state
  const [distanceKm, setDistanceKm] = useState(0);
  const [codFee, setCodFee] = useState(0);
  const [distanceFee, setDistanceFee] = useState(0);
  const [totalDeliveryFee, setTotalDeliveryFee] = useState(0);
  const [deliveryError, setDeliveryError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locMsg, setLocMsg] = useState('');

  // Inline validation errors for form cards
  const [contactErrors, setContactErrors] = useState<{ name?: string; phone?: string }>({});
  const [deliveryInputError, setDeliveryInputError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [reviewConsent, setReviewConsent] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState('');

  // Option selection card for items with variants
  const [activeOptionItem, setActiveOptionItem] = useState<{
    menu_item_id: string;
    name: string;
    price: number;
    image_url: string;
    category_id?: string;
    variants?: ItemVariant[];
    qty: number;
  } | null>(null);

  const [selectedDrink, setSelectedDrink] = useState('Pepsi');
  const [selectedSide, setSelectedSide] = useState('Regular Fries');
  const [selectedUpgrades, setSelectedUpgrades] = useState<ItemVariant[]>([]);

  // Start Over modal state
  const [confirmReset, setConfirmReset] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const tidRef = useRef<HTMLInputElement>(null);

  // Sync cart from storage / events
  useEffect(() => {
    const handleCartSync = () => {
      setCartItems(getCart());
    };
    handleCartSync();
    window.addEventListener('storage', handleCartSync);
    window.addEventListener('cartUpdated', handleCartSync);
    return () => {
      window.removeEventListener('storage', handleCartSync);
      window.removeEventListener('cartUpdated', handleCartSync);
    };
  }, []);

  // Hydrate chat from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed as Msg[]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Persist chat to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
      } catch { /* ignore */ }
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen, step, activeOptionItem]);

  // Focus appropriate field when step changes
  useEffect(() => {
    if (!isOpen) return;
    if (step === 2) {
      setTimeout(() => nameRef.current?.focus(), 150);
    } else if (step === 3) {
      setTimeout(() => addressRef.current?.focus(), 150);
    } else if (step === 4 && draft.payment.method === 'online_transfer') {
      setTimeout(() => tidRef.current?.focus(), 150);
    }
  }, [step, isOpen, draft.payment.method]);

  // Escape key handler to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeOptionItem) {
          setActiveOptionItem(null);
        } else if (confirmReset) {
          setConfirmReset(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeOptionItem, confirmReset, onClose]);

  // Re-quote delivery when delivery address/coordinates/subtotal/payment method changes
  useEffect(() => {
    if (cartItems.length === 0 || (!draft.delivery.address && !draft.delivery.lat)) {
      setDistanceKm(0);
      setCodFee(0);
      setDistanceFee(0);
      setTotalDeliveryFee(0);
      setDeliveryError('');
      return;
    }

    quoteDeliveryFn({
      data: {
        lat: draft.delivery.lat,
        lng: draft.delivery.lng,
        address: draft.delivery.address,
        subtotal,
        paymentMethod: draft.payment.method || 'cod',
      }
    }).then(res => {
      if (!res.ok) {
        setDeliveryError(res.error || 'Delivery unavailable to this address.');
        setTotalDeliveryFee(0);
      } else {
        setDeliveryError('');
        setDistanceKm(res.distanceKm || 0);
        setCodFee(res.codFee || 0);
        setDistanceFee(res.distanceFee || 0);
        setTotalDeliveryFee(res.totalDeliveryFee || 0);
      }
    }).catch(() => {
      setDeliveryError('Could not calculate delivery charges.');
    });
  }, [draft.delivery.address, draft.delivery.lat, draft.delivery.lng, draft.payment.method, subtotal, cartItems.length]);

  const addToast = (msg: string, type: 'success' | 'error' | 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const handleStartOver = () => {
    clearCart();
    clearDraft();
    setMessages(DEFAULT_MSG);
    setActiveOptionItem(null);
    setReviewConsent(false);
    setConfirmReset(false);
    setSuccessOrderId('');
    addToast('Started over with a fresh cart.', 'info');
  };

  const executeActions = (actions: any[]) => {
    if (!actions || !Array.isArray(actions)) return;

    for (const action of actions.slice(0, 5)) {
      switch (action.type) {
        case 'ADD_ITEM': {
          if (action.hasVariants) {
            const availableUpgrades = getAllAvailableUpgrades(action);
            const detected = detectInitialVariants(action.userText || input, availableUpgrades);
            setSelectedDrink(detected.drink);
            setSelectedSide(detected.side);
            setSelectedUpgrades(detected.selectedUpgrades);
            setActiveOptionItem(action);
            addToast(`Choose options for ${action.name}`, 'info');
          } else {
            const cartItem: CartItem = {
              menu_item_id: action.menu_item_id,
              name: action.name,
              image_url: action.image_url || '/placeholder.webp',
              quantity: action.qty || 1,
              price: action.price,
              variants: [],
            };
            addToCart(cartItem);
            playSuccessChime();
            addToast(`Added ${action.qty || 1}x ${action.name}`, 'success');
          }
          break;
        }
        case 'SET_QTY': {
          const cart = getCart();
          const item = cart.find(i => i.menu_item_id === action.menu_item_id);
          if (item) {
            updateItemQuantity(item.menu_item_id, item.variants, action.qty || 1);
            addToast(`Updated quantity for ${item.name}`, 'info');
          }
          break;
        }
        case 'REMOVE_ITEM': {
          const cart = getCart();
          const item = cart.find(i => i.menu_item_id === action.menu_item_id);
          if (item) {
            removeItem(item.menu_item_id, item.variants);
            addToast(`Removed ${item.name}`, 'info');
          } else {
            addToast('That item is not in your cart.', 'info');
          }
          break;
        }
        case 'CLEAR_CART': {
          clearCart();
          addToast('Cart cleared.', 'info');
          break;
        }
        case 'SHOW_CART': {
          setStep(1);
          break;
        }
        case 'GO_STEP': {
          if (action.step >= 1 && action.step <= 7) {
            setStep(action.step);
          }
          break;
        }
        case 'NOT_FOUND': {
          const suggestions = action.suggestions;
          if (suggestions && suggestions.length > 0) {
            addToast(`Item not found. Did you mean: ${suggestions.join(', ')}?`, 'info');
          } else {
            addToast("I couldn't find that item on the menu.", 'error');
          }
          break;
        }
        case 'OPEN_MENU': {
          onClose();
          navigate({ to: '/menu' });
          break;
        }
        case 'TRACK_ORDER': {
          window.dispatchEvent(new CustomEvent('openTracker'));
          break;
        }
      }
    }
  };

  const handleSend = async () => {
    const txt = input.trim();
    if (!txt || isTyping || txt.length > 500) return;

    setInput('');
    const userMsg: Msg = { role: 'user', text: txt };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const cart = getCart();
      const cartSummary = cart.length > 0 
        ? `${cart.length} items, subtotal PKR ${getCartSubtotal(cart)}` 
        : 'Empty';

      const history = messages
        .filter(m => m.role === 'user' || m.role === 'bot')
        .slice(-10)
        .map(m => ({
          role: (m.role === 'bot' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.text.substring(0, 500),
        }));

      // Non-personal flow context only
      const flowContext = {
        step,
        stepName: STEP_LABELS[step - 1],
        itemCount: cart.length,
        hasName: validateName(draft.contact.name).valid,
        hasPhone: validatePhone(draft.contact.phone).valid,
        hasAddress: validateAddress(draft.delivery.address).valid,
        hasLocationPin: !!draft.delivery.lat,
        paymentMethod: draft.payment.method,
        subtotal,
        total: subtotal + totalDeliveryFee,
        shopOpen: shopStatus.open,
      };

      const res = await chatWithAmirBot({
        data: {
          text: txt,
          history,
          cartSummary,
          flowContext,
        }
      });

      if (res.actions && res.actions.length > 0) {
        // Pass original user text so variants can be preselected
        const enriched = res.actions.map(a => ({ ...a, userText: txt }));
        executeActions(enriched);
      }

      if (res.reply) {
        setMessages(prev => [...prev, { role: 'bot', text: res.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'system',
        text: 'Sorry, I had trouble with that message. You can continue using the form below or call us at 0301-4265785.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Step 3: Geolocation handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setDeliveryInputError('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    setLocMsg('Finding your location...');
    setDeliveryInputError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = pos.coords;
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
            setLocMsg('Address updated with pinned location.');
          } else {
            resolvedAddr = `GPS location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
          }
        } catch {
          resolvedAddr = `GPS location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
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
          setDeliveryInputError('Please enable location permissions in your browser/phone settings.');
        } else if (err.code === err.TIMEOUT) {
          setDeliveryInputError('Location request timed out.');
        } else {
          setDeliveryInputError('Failed to get location. Please type your address.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Step 2 Next
  const handleContactNext = () => {
    const nameVal = validateName(draft.contact.name);
    const phoneVal = validatePhone(draft.contact.phone);
    const errors: { name?: string; phone?: string } = {};

    if (!nameVal.valid) errors.name = nameVal.error;
    if (!phoneVal.valid) errors.phone = phoneVal.error;

    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      return;
    }

    setContactErrors({});
    updateDraft({
      step: 3,
      contact: {
        name: nameVal.normalized,
        phone: phoneVal.normalized,
        email: draft.contact.email.trim(),
      }
    });
  };

  // Step 3 Next
  const handleDeliveryNext = () => {
    const addrVal = validateAddress(draft.delivery.address);
    if (!addrVal.valid) {
      setDeliveryInputError(addrVal.error || 'Please enter a complete address.');
      return;
    }
    if (deliveryError) {
      setDeliveryInputError(deliveryError);
      return;
    }

    setDeliveryInputError('');
    updateDraft({
      step: 4,
      delivery: {
        address: addrVal.normalized,
        lat: draft.delivery.lat,
        lng: draft.delivery.lng,
        source: draft.delivery.source || 'typed',
      }
    });
  };

  // Step 4 Next
  const handlePaymentNext = () => {
    if (!draft.payment.method) {
      setPaymentError('Please select a payment method.');
      return;
    }

    if (draft.payment.method === 'online_transfer') {
      const tidVal = validateTid(draft.payment.trxId);
      if (!tidVal.valid) {
        setPaymentError(tidVal.error || 'Please enter a valid Transaction ID.');
        return;
      }
      updateDraft({
        step: 5,
        payment: {
          method: 'online_transfer',
          chosen: true,
          trxId: tidVal.normalized,
        }
      });
    } else {
      updateDraft({
        step: 5,
        payment: {
          method: 'cod',
          chosen: true,
          trxId: '',
        }
      });
    }
    setPaymentError('');
  };

  // Step 5: Place order click
  const handleConfirmOrder = async () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    if (!shopStatus.open) {
      setSubmitError(shopStatus.closedMessage);
      return;
    }

    if (cartItems.length === 0) {
      setSubmitError('Your cart is empty.');
      return;
    }

    if (!reviewConsent) {
      setSubmitError('Please accept the cancellation policy to place your order.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const res = await submitOrder(draft, cartItems);

    if (!res.success) {
      setSubmitError(res.error || 'Could not place order. Please try again.');
      setIsSubmitting(false);
      return;
    }

    setSuccessOrderId(res.orderId || '');
    setIsSubmitting(false);
    setStep(7);
  };

  // Add Item with options from Option Card
  const handleAddWithOptions = () => {
    if (!activeOptionItem) return;

    const isDeal = activeOptionItem.category_id === 'cat_deals' || (activeOptionItem.variants && activeOptionItem.variants.length > 0);
    const finalVariants = buildCompleteVariants(
      !!isDeal,
      selectedDrink,
      selectedSide,
      selectedUpgrades
    );

    const cartItem: CartItem = {
      menu_item_id: activeOptionItem.menu_item_id,
      name: activeOptionItem.name,
      price: activeOptionItem.price,
      quantity: activeOptionItem.qty || 1,
      image_url: activeOptionItem.image_url || '/placeholder.webp',
      variants: finalVariants,
    };

    addToCart(cartItem);
    playSuccessChime();
    addToast(`Added ${cartItem.quantity}x ${cartItem.name}`, 'success');
    setActiveOptionItem(null);
  };

  // Step Validity summaries
  const isCartValid = cartItems.length > 0;
  const isContactValid = validateName(draft.contact.name).valid && validatePhone(draft.contact.phone).valid;
  const isDeliveryValid = validateAddress(draft.delivery.address).valid && !deliveryError;
  const isPaymentValid = draft.payment.chosen && (
    draft.payment.method === 'cod' || 
    (draft.payment.method === 'online_transfer' && validateTid(draft.payment.trxId).valid)
  );

  const getStepSummary = (s: number): string => {
    switch (s) {
      case 1:
        return isCartValid ? `${cartItems.length} item(s) · PKR ${subtotal}` : 'Empty';
      case 2:
        return isContactValid ? `${draft.contact.name} · ${draft.contact.phone}` : 'Pending';
      case 3:
        return isDeliveryValid 
          ? `${draft.delivery.address.slice(0, 20)}... ${draft.delivery.lat ? '📍' : ''}` 
          : 'Pending';
      case 4:
        return isPaymentValid 
          ? (draft.payment.method === 'cod' ? 'Cash on Delivery' : `Online · TID ${draft.payment.trxId.slice(0, 10)}`) 
          : 'Pending';
      case 5:
        return `Total PKR ${subtotal + totalDeliveryFee}`;
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-50 transition-opacity" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Drawer */}
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-label="AmirBot Ordering Assistant"
        className="fixed bottom-0 right-0 w-full sm:w-[440px] md:w-[460px] h-[100dvh] max-h-[100dvh] bg-card text-card-foreground sm:rounded-l-3xl rounded-t-3xl shadow-2xl z-50 flex flex-col transform transition-transform duration-300 border-l border-border"
      >
        {/* Floating Toast Notification */}
        <div className="absolute top-2 left-0 right-0 flex flex-col items-center gap-1.5 pointer-events-none z-50 px-4">
          {toasts.map(t => (
            <div 
              key={t.id} 
              role="status" 
              aria-live="polite" 
              className={`px-4 py-2 rounded-full text-white text-xs sm:text-sm font-bold shadow-lg pointer-events-auto transition-all ${
                t.type === 'success' ? 'bg-emerald-700' : t.type === 'error' ? 'bg-rose-700' : 'bg-slate-800'
              }`}
            >
              {t.msg}
            </div>
          ))}
        </div>

        {/* Top Header Bar */}
        <div className="p-3.5 bg-primary text-primary-foreground flex justify-between items-center sm:rounded-tl-3xl rounded-t-3xl shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight flex items-center gap-1.5">
                AmirBot
                <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  Assistant
                </span>
              </h2>
              <p className="text-[11px] text-primary-foreground/80 leading-none mt-0.5">
                Build cart · Delivery · Payment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button 
              type="button"
              onClick={() => setConfirmReset(true)} 
              aria-label="Start over" 
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-white text-xs font-semibold flex items-center gap-1"
              title="Start over"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline text-xs">Reset</span>
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-white" 
              aria-label="Close assistant"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 7-Segment Progress Header */}
        <div className="px-4 py-2.5 bg-accent/60 border-b border-border shrink-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-foreground">
              Step {step} of 7 · {STEP_LABELS[step - 1]}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              {getStepSummary(step)}
            </span>
          </div>

          {/* Stepper Segments */}
          <div className="flex gap-1.5" role="tablist" aria-label="Order progress">
            {STEP_LABELS.map((label, idx) => {
              const stepIdx = idx + 1;
              const isCurrent = step === stepIdx;
              const isPast = step > stepIdx;
              const isValid = 
                (stepIdx === 1 && isCartValid) ||
                (stepIdx === 2 && isContactValid) ||
                (stepIdx === 3 && isDeliveryValid) ||
                (stepIdx === 4 && isPaymentValid) ||
                (stepIdx === 5 && isCartValid && isContactValid && isDeliveryValid && isPaymentValid);

              return (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`Step ${stepIdx}: ${label}`}
                  onClick={() => {
                    if (isValid || isPast || stepIdx === 1) {
                      setStep(stepIdx);
                    }
                  }}
                  disabled={!isValid && !isPast && stepIdx !== 1}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    isCurrent 
                      ? 'bg-primary ring-2 ring-primary/30' 
                      : isPast || isValid 
                      ? 'bg-emerald-600 hover:opacity-80 cursor-pointer' 
                      : 'bg-muted-foreground/20 cursor-not-allowed'
                  }`}
                  title={`${label}: ${isValid ? 'Completed (click to edit)' : isCurrent ? 'Active' : 'Incomplete'}`}
                />
              );
            })}
          </div>
        </div>

        {/* Start Over Confirmation Modal */}
        {confirmReset && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border p-5 rounded-2xl max-w-xs w-full shadow-2xl text-center space-y-3">
              <AlertCircle size={32} className="text-amber-500 mx-auto" />
              <h3 className="font-bold text-base text-foreground">Start Over?</h3>
              <p className="text-xs text-muted-foreground">
                This will clear your current cart and unfinished order details.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 bg-accent text-foreground font-semibold py-2 rounded-xl text-xs hover:bg-accent/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="flex-1 bg-rose-600 text-white font-semibold py-2 rounded-xl text-xs hover:bg-rose-700"
                >
                  Yes, Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Option Customizer Overlay Card for items with variants */}
        {activeOptionItem && (
          <div className="absolute inset-x-2 bottom-16 top-24 bg-card border border-primary/40 rounded-2xl shadow-2xl z-40 p-4 overflow-y-auto flex flex-col space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <div>
                <h3 className="font-bold text-sm text-foreground">{activeOptionItem.name}</h3>
                <p className="text-xs text-primary font-bold">Base PKR {activeOptionItem.price}</p>
              </div>
              <button 
                type="button"
                onClick={() => setActiveOptionItem(null)} 
                className="p-1 hover:bg-accent rounded-full text-muted-foreground"
                aria-label="Close options"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drink Choice */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Choose Drink</label>
              <div className="grid grid-cols-2 gap-1.5">
                {DEFAULT_DRINKS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDrink(d)}
                    className={`text-xs p-2 rounded-lg border text-left font-medium transition-colors ${
                      selectedDrink === d 
                        ? 'border-primary bg-primary/10 text-primary font-bold' 
                        : 'border-border bg-slate-50 dark:bg-slate-900 text-foreground'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Side Choice */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Choose Side</label>
              <div className="grid grid-cols-2 gap-1.5">
                {DEFAULT_SIDES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSide(s)}
                    className={`text-xs p-2 rounded-lg border text-left font-medium transition-colors ${
                      selectedSide === s 
                        ? 'border-primary bg-primary/10 text-primary font-bold' 
                        : 'border-border bg-slate-50 dark:bg-slate-900 text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Upgrades Choice */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Upgrades & Add-ons</label>
              <div className="space-y-1">
                {getAllAvailableUpgrades(activeOptionItem).map(u => {
                  const checked = selectedUpgrades.some(x => x.name.toLowerCase() === u.name.toLowerCase());
                  return (
                    <label 
                      key={u.name} 
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                        checked ? 'border-primary bg-primary/5' : 'border-border bg-slate-50 dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setSelectedUpgrades(prev => prev.filter(x => x.name.toLowerCase() !== u.name.toLowerCase()));
                            } else {
                              setSelectedUpgrades(prev => [...prev, u]);
                            }
                          }}
                          className="w-4 h-4 accent-primary rounded"
                        />
                        <span className="font-medium text-foreground">{u.name}</span>
                      </div>
                      <span className="font-bold text-primary">+PKR {u.price}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 mt-auto border-t border-border flex gap-2">
              <button
                type="button"
                onClick={() => setActiveOptionItem(null)}
                className="w-1/3 bg-accent text-foreground font-semibold py-2.5 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddWithOptions}
                className="w-2/3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors"
              >
                Add · PKR {activeOptionItem.price + selectedUpgrades.reduce((s, u) => s + u.price, 0)}
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area: Chat History + Active Guided Step Card */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
          {/* Closed Banner */}
          {!shopStatus.open && (
            <div role="alert" className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-medium leading-relaxed">
              {shopStatus.closedMessage}
            </div>
          )}

          {/* Chat Messages */}
          <div role="log" aria-live="polite" className="space-y-2.5">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm font-medium'
                      : msg.role === 'system'
                      ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200 border border-red-200 mx-auto text-center'
                      : 'bg-card border border-border text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE GUIDED STEP CARD */}
          <div className="pt-2">
            {/* STEP 1: CART CARD */}
            {step === 1 && (
              <div className="bg-card border border-border rounded-2xl p-3.5 shadow-sm space-y-3 animate-in fade-in">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <ShoppingBag size={16} className="text-primary" />
                    Your Cart ({cartItems.length})
                  </h3>
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearCart()}
                      className="text-[11px] text-muted-foreground hover:text-rose-600 transition-colors flex items-center gap-0.5"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-xs text-muted-foreground">Your cart is empty.</p>
                    <p className="text-[11px] text-muted-foreground">
                      Type below (e.g. "add 2 zinger burgers") or browse the menu.
                    </p>
                    <button
                      type="button"
                      onClick={() => { onClose(); navigate({ to: '/menu' }); }}
                      className="mt-2 text-xs text-primary font-bold hover:underline"
                    >
                      Open Menu →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cartItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-accent/30 border border-border text-xs">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-foreground">{item.name}</p>
                          {item.variants && item.variants.length > 0 && (
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {item.variants.map(v => v.name).join(', ')}
                            </p>
                          )}
                          <p className="font-bold text-primary text-[11px] mt-0.5">
                            PKR {lineTotal(item)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            aria-label={`Decrease ${item.name}`}
                            onClick={() => updateItemQuantity(item.menu_item_id, item.variants, item.quantity - 1)}
                            className="w-6 h-6 rounded-md bg-accent hover:bg-accent/80 flex items-center justify-center font-bold"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${item.name}`}
                            onClick={() => updateItemQuantity(item.menu_item_id, item.variants, item.quantity + 1)}
                            className="w-6 h-6 rounded-md bg-accent hover:bg-accent/80 flex items-center justify-center font-bold"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-2 border-t border-border font-bold text-xs">
                      <span>Subtotal</span>
                      <span className="text-primary text-sm font-black">PKR {subtotal}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-all text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
                    >
                      Continue to Contact Details <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => { onClose(); navigate({ to: '/menu' }); }}
                    className="text-primary hover:underline font-semibold"
                  >
                    + Add from menu
                  </button>
                  <Link 
                    to="/checkout" 
                    search={{ step: 1 }} 
                    onClick={onClose} 
                    className="text-muted-foreground hover:text-foreground font-medium flex items-center gap-0.5"
                  >
                    Continue on checkout page <ExternalLink size={10} />
                  </Link>
                </div>
              </div>
            )}

            {/* STEP 2: CONTACT CARD */}
            {step === 2 && (
              <form 
                onSubmit={e => { e.preventDefault(); handleContactNext(); }} 
                className="bg-card border border-border rounded-2xl p-3.5 shadow-sm space-y-3 animate-in fade-in"
                aria-label="Contact information form"
              >
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="font-bold text-sm text-foreground">Contact Details</h3>
                  <span className="text-[11px] text-muted-foreground">Step 2 of 7</span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label htmlFor="bot-name" className="block text-xs font-semibold mb-1 text-foreground">
                      Full Name *
                    </label>
                    <input
                      ref={nameRef}
                      id="bot-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={draft.contact.name}
                      onChange={e => updateDraft({ contact: { name: e.target.value } })}
                      placeholder="Amir Khan"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                    />
                    {contactErrors.name && (
                      <p className="text-[11px] text-red-600 mt-1">{contactErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="bot-phone" className="block text-xs font-semibold mb-1 text-foreground">
                      Pakistani Phone Number *
                    </label>
                    <input
                      id="bot-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={draft.contact.phone}
                      onChange={e => updateDraft({ contact: { phone: e.target.value } })}
                      placeholder="0300 1234567"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                    />
                    {contactErrors.phone && (
                      <p className="text-[11px] text-red-600 mt-1">{contactErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="bot-email" className="block text-xs font-semibold mb-1 text-foreground">
                      Email (Optional)
                    </label>
                    <input
                      id="bot-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={draft.contact.email}
                      onChange={e => updateDraft({ contact: { email: e.target.value } })}
                      placeholder="amir@example.com"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 bg-accent text-foreground font-semibold py-2.5 rounded-xl text-xs hover:bg-accent/80 transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-all text-xs flex items-center justify-center gap-1 shadow-md shadow-primary/20"
                  >
                    Continue to Delivery <ArrowRight size={12} />
                  </button>
                </div>

                <div className="text-center pt-1">
                  <Link 
                    to="/checkout" 
                    search={{ step: 1 }} 
                    onClick={onClose} 
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-0.5"
                  >
                    Continue on checkout page <ExternalLink size={10} />
                  </Link>
                </div>
              </form>
            )}

            {/* STEP 3: DELIVERY CARD */}
            {step === 3 && (
              <form 
                onSubmit={e => { e.preventDefault(); handleDeliveryNext(); }} 
                className="bg-card border border-border rounded-2xl p-3.5 shadow-sm space-y-3 animate-in fade-in"
                aria-label="Delivery address form"
              >
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="font-bold text-sm text-foreground">Delivery Address</h3>
                  <span className="text-[11px] text-muted-foreground">Step 3 of 7</span>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                    className="w-full bg-primary/10 text-primary border border-primary/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-colors"
                  >
                    <MapPin size={14} />
                    {gettingLocation ? 'Finding your GPS coordinates...' : 'Use my current location'}
                  </button>

                  {locMsg && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      {locMsg}
                    </p>
                  )}

                  <div>
                    <label htmlFor="bot-address" className="block text-xs font-semibold mb-1 text-foreground">
                      Complete Address *
                    </label>
                    <textarea
                      ref={addressRef}
                      id="bot-address"
                      name="address"
                      rows={3}
                      autoComplete="street-address"
                      required
                      value={draft.delivery.address}
                      onChange={e => updateDraft({ delivery: { address: e.target.value, source: 'typed' } })}
                      placeholder="House, Street, Area, Lahore"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Include house number and a nearby landmark.
                    </p>
                  </div>

                  {/* Delivery quote calculation badge */}
                  {distanceKm > 0 && !deliveryError && (
                    <div className="p-2.5 rounded-xl bg-accent/40 border border-border text-xs flex justify-between items-center">
                      <span className="text-muted-foreground">
                        📍 ~{distanceKm.toFixed(1)} km from shop
                      </span>
                      <span className="font-bold text-foreground">
                        Delivery: {totalDeliveryFee === 0 ? 'FREE' : `PKR ${totalDeliveryFee}`}
                      </span>
                    </div>
                  )}

                  {deliveryInputError && (
                    <p className="text-[11px] text-red-600 font-medium">{deliveryInputError}</p>
                  )}
                  {deliveryError && (
                    <p className="text-[11px] text-red-600 font-medium">{deliveryError}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-1/3 bg-accent text-foreground font-semibold py-2.5 rounded-xl text-xs hover:bg-accent/80 transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={!!deliveryError}
                    className="w-2/3 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-all text-xs flex items-center justify-center gap-1 shadow-md shadow-primary/20 disabled:opacity-50"
                  >
                    Continue to Payment <ArrowRight size={12} />
                  </button>
                </div>

                <div className="text-center pt-1">
                  <Link 
                    to="/checkout" 
                    search={{ step: 1 }} 
                    onClick={onClose} 
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-0.5"
                  >
                    Continue on checkout page <ExternalLink size={10} />
                  </Link>
                </div>
              </form>
            )}

            {/* STEP 4: PAYMENT CARD */}
            {step === 4 && (
              <form 
                onSubmit={e => { e.preventDefault(); handlePaymentNext(); }} 
                className="bg-card border border-border rounded-2xl p-3.5 shadow-sm space-y-3 animate-in fade-in"
                aria-label="Payment method form"
              >
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="font-bold text-sm text-foreground">Payment Method</h3>
                  <span className="text-[11px] text-muted-foreground">Step 4 of 7</span>
                </div>

                <div className="space-y-2">
                  <label 
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      draft.payment.method === 'online_transfer' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-slate-50 dark:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bot_payment"
                      value="online_transfer"
                      checked={draft.payment.method === 'online_transfer'}
                      onChange={() => updateDraft({ payment: { method: 'online_transfer', chosen: true } })}
                      className="w-4 h-4 accent-primary shrink-0 mt-0.5"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-foreground">Bank Transfer / EasyPaisa / JazzCash</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Send total amount to {SHOP_PHONE_LOCAL}. Questions?{' '}
                        <a 
                          href={`https://wa.me/${SHOP_WHATSAPP}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline font-semibold"
                        >
                          WhatsApp us
                        </a>
                      </p>
                    </div>
                  </label>

                  <label 
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      draft.payment.method === 'cod' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-slate-50 dark:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bot_payment"
                      value="cod"
                      checked={draft.payment.method === 'cod'}
                      onChange={() => updateDraft({ payment: { method: 'cod', chosen: true } })}
                      className="w-4 h-4 accent-primary shrink-0 mt-0.5"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-foreground">Cash on Delivery</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        +PKR 100 COD fee applies for orders under PKR 1000.
                      </p>
                    </div>
                  </label>

                  {draft.payment.method === 'online_transfer' && (
                    <div className="p-3 bg-accent/30 rounded-xl border border-border space-y-1.5 animate-in fade-in">
                      <label htmlFor="bot-tid" className="block text-xs font-bold text-foreground">
                        Transaction ID (TID) *
                      </label>
                      <input
                        ref={tidRef}
                        id="bot-tid"
                        name="trxId"
                        type="text"
                        autoComplete="off"
                        required
                        value={draft.payment.trxId}
                        onChange={e => updateDraft({ payment: { trxId: e.target.value } })}
                        placeholder="e.g. 123456789012"
                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                      />
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {SHOP_PAYMENT_VERIFICATION_NOTE}
                      </p>
                    </div>
                  )}

                  {paymentError && (
                    <p className="text-[11px] text-red-600 font-medium">{paymentError}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-1/3 bg-accent text-foreground font-semibold py-2.5 rounded-xl text-xs hover:bg-accent/80 transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-all text-xs flex items-center justify-center gap-1 shadow-md shadow-primary/20"
                  >
                    Continue to Review <ArrowRight size={12} />
                  </button>
                </div>

                <div className="text-center pt-1">
                  <Link 
                    to="/checkout" 
                    search={{ step: 2 }} 
                    onClick={onClose} 
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-0.5"
                  >
                    Continue on checkout page <ExternalLink size={10} />
                  </Link>
                </div>
              </form>
            )}

            {/* STEP 5: REVIEW & SUMMARY CARD */}
            {step === 5 && (
              <div className="bg-card border border-border rounded-2xl p-3.5 shadow-sm space-y-3 animate-in fade-in">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="font-bold text-sm text-foreground">Review Your Order</h3>
                  <span className="text-[11px] text-muted-foreground">Step 5 of 7</span>
                </div>

                {/* Items Summary */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">Items ({cartItems.length})</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                    >
                      <Edit2 size={11} /> Edit Cart
                    </button>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-muted-foreground text-[11px]">
                        <span className="truncate pr-2">{item.quantity}x {item.name}</span>
                        <span className="font-semibold text-foreground shrink-0">PKR {lineTotal(item)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact & Delivery Review Block */}
                <div className="p-2.5 rounded-xl bg-accent/30 border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-foreground">Contact</p>
                      <p className="text-[11px] text-muted-foreground">
                        {draft.contact.name} · {draft.contact.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex justify-between items-start pt-1.5 border-t border-border/60">
                    <div className="pr-2">
                      <p className="font-bold text-foreground flex items-center gap-1">
                        Delivery {draft.delivery.lat && '📍'}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {draft.delivery.address}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-[11px] text-primary hover:underline font-semibold shrink-0"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex justify-between items-start pt-1.5 border-t border-border/60">
                    <div>
                      <p className="font-bold text-foreground">Payment</p>
                      <p className="text-[11px] text-muted-foreground">
                        {draft.payment.method === 'cod' 
                          ? 'Cash on Delivery' 
                          : `Online Transfer · TID: ${draft.payment.trxId}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-bold text-foreground">PKR {subtotal}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span className="font-bold text-foreground">
                      {totalDeliveryFee === 0 ? 'FREE' : `PKR ${totalDeliveryFee}`}
                    </span>
                  </div>
                  {codFee > 0 && (
                    <div className="flex justify-between text-[11px] text-muted-foreground pl-2">
                      <span>COD Fee</span>
                      <span>PKR {codFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-border text-sm font-black text-foreground">
                    <span>Total Amount</span>
                    <span className="text-primary text-base font-black">
                      PKR {subtotal + totalDeliveryFee}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                  Estimated Delivery: {SHOP_ESTIMATED_DELIVERY_TIME}
                </p>

                {/* Cancellation Policy Consent Checkbox */}
                <label className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={reviewConsent}
                    onChange={e => setReviewConsent(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded mt-0.5 shrink-0"
                  />
                  <span className="text-red-900 dark:text-red-200 text-[11px] font-medium leading-tight">
                    {SHOP_CANCELLATION_POLICY}
                  </span>
                </label>

                {submitError && (
                  <div className="p-2 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-lg text-xs font-medium">
                    {submitError}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="w-1/3 bg-accent text-foreground font-semibold py-2.5 rounded-xl text-xs hover:bg-accent/80 transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting || !reviewConsent || !shopStatus.open || !isCartValid || !isContactValid || !isDeliveryValid || !isPaymentValid}
                    className="w-2/3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-700/20 disabled:opacity-50 transition-all text-xs flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting 
                      ? 'Placing Order...' 
                      : !shopStatus.open 
                      ? 'Shop Closed Right Now' 
                      : 'Confirm & Place Order'}
                  </button>
                </div>

                <div className="text-center pt-1">
                  <Link 
                    to="/checkout" 
                    search={{ step: 2 }} 
                    onClick={onClose} 
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-0.5"
                  >
                    Continue on checkout page <ExternalLink size={10} />
                  </Link>
                </div>
              </div>
            )}

            {/* STEP 6: SUBMITTING SPINNER */}
            {step === 6 && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3 animate-in fade-in">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <h3 className="font-bold text-sm text-foreground">Placing Your Order...</h3>
                <p className="text-xs text-muted-foreground">
                  Sending details to the kitchen and confirming payment.
                </p>
              </div>
            )}

            {/* STEP 7: ORDER SUCCESS & TRACKING CARD */}
            {step === 7 && (
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center space-y-3 animate-in zoom-in-95">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="font-black text-base text-foreground">Order Placed Successfully!</h3>
                <p className="text-xs text-muted-foreground">
                  Order <span className="font-mono font-bold text-foreground">#{successOrderId.slice(0, 8).toUpperCase()}</span> has been sent to our kitchen.
                </p>

                <div className="p-2.5 bg-accent/40 rounded-xl border border-border text-xs space-y-1">
                  <p className="font-semibold text-foreground">Permanent Tracking Link</p>
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: successOrderId }}
                    onClick={onClose}
                    className="text-primary font-mono text-[11px] break-all hover:underline"
                  >
                    /orders/{successOrderId}
                  </Link>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('openTracker'));
                    }}
                    className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-all text-xs shadow-md"
                  >
                    Track My Order Now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setSuccessOrderId('');
                    }}
                    className="w-full bg-accent text-foreground font-semibold py-2 rounded-xl text-xs hover:bg-accent/80 transition-colors"
                  >
                    Order Something Else
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Input Area */}
        <div className="p-3 bg-card border-t border-border shrink-0">
          <form 
            onSubmit={e => { e.preventDefault(); handleSend(); }} 
            className="flex items-center gap-2"
          >
            <input
              type="text"
              aria-label="Ask AmirBot"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything or add items (e.g. 2 zinger)..."
              disabled={isTyping}
              maxLength={500}
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-border rounded-full px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
            >
              <Send size={16} className={input.trim() && !isTyping ? "translate-x-0.5" : ""} />
            </button>
          </form>
          <div className="flex justify-between items-center px-2 mt-1 text-[10px] text-muted-foreground">
            <span>AmirBot can build your cart & take your order</span>
            <span>{input.length}/500</span>
          </div>
        </div>
      </div>
    </>
  );
}
