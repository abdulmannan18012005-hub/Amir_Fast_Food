import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { 
  Bot, X, Send, Trash2, Check, ArrowRight, ArrowLeft, 
  RotateCcw, ShoppingBag, MapPin, CreditCard, 
  AlertCircle, CheckCircle2, ExternalLink, Clock, Phone, Loader2
} from 'lucide-react';
import { playSuccessChime } from '../../lib/sound';
import { chatWithAmirBot } from '../../server/chat';
import { reverseGeocodeFn } from '../../server/location';
import { quoteDeliveryFn } from '../../server/pricingApi';
import { 
  addToCart, getCart, removeItem, updateItemQuantity, 
  clearCart, getCartSubtotal, lineTotal, areVariantsEqual 
} from '../../lib/cart';
import { getActiveOrders, getTrackingToken } from '../../lib/activeOrders';
import { useOrderDraft, clearDraft } from '../../lib/orderDraft';
import { submitOrder } from '../../lib/orderSubmit';
import { validateName, validatePhone, validateAddress, validateTid } from '../../lib/orderValidation';
import { useShopStatus } from '../../hooks/useShopStatus';
import { 
  SHOP_PHONE_LOCAL, SHOP_WHATSAPP, 
  SHOP_ESTIMATED_DELIVERY_TIME, SHOP_CANCELLATION_POLICY, 
  SHOP_PAYMENT_VERIFICATION_NOTE, SHOP_COD_THRESHOLD, SHOP_COD_FEE 
} from '../../lib/shop';
import type { CartItem, ItemVariant } from '../../types';

export type Msg = { 
  role: 'user' | 'bot' | 'system'; 
  text: string; 
  time?: string;
  chips?: { label: string; action: () => void; primary?: boolean; destructive?: boolean }[];
};

type ToastInfo = { id: number; msg: string; type: 'success' | 'error' | 'info' };

const STORAGE_KEY = 'amirbot_chat';
const ORDERING_ACTIVE_KEY = 'amirbot_ordering_active';
const STEP_KEY = 'amirbot_active_step';

const STEP_NAMES = [
  'Items & Cart',
  'Contact Details',
  'Delivery Details',
  'Payment',
  'Review Order',
  'Confirm & Place Order'
];

const STEP_PERCENTAGES = [17, 33, 50, 67, 83, 100];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AmirBotDrawer({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const shopStatus = useShopStatus();
  const [draft, updateDraft] = useOrderDraft();
  const quoteSeqRef = useRef(0);

  // Cart State (synced with actual website cart)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') return getCart();
    return [];
  });

  const subtotal = getCartSubtotal(cartItems);

  // Ordering State Machine: strictly 6 steps
  const [isOrderingActive, setIsOrderingActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(ORDERING_ACTIVE_KEY) === 'true';
    }
    return false;
  });

  const [step, setStepState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = parseInt(sessionStorage.getItem(STEP_KEY) || '1', 10);
      return isNaN(saved) || saved < 1 ? 1 : Math.min(6, saved);
    }
    return 1;
  });

  const setStep = (newStep: number) => {
    const clamped = Math.min(6, Math.max(1, newStep));
    setStepState(clamped);
    updateDraft({ step: clamped });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STEP_KEY, String(clamped));
    }
  };

  const startOrdering = () => {
    setIsOrderingActive(true);
    setStep(1);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(ORDERING_ACTIVE_KEY, 'true');
    }
  };

  const stopOrdering = () => {
    setIsOrderingActive(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(ORDERING_ACTIVE_KEY);
      sessionStorage.removeItem(STEP_KEY);
    }
  };

  // Chat message state
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch { /* ignore */ }
    }
    return [
      { 
        role: 'bot', 
        text: 'Hi! I am AmirBot, your AI ordering assistant for Amir Fast Food in Lahore. How can I help you today?' 
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Delivery quote state
  const [distanceKm, setDistanceKm] = useState(0);
  const [codFee, setCodFee] = useState(0);
  const [totalDeliveryFee, setTotalDeliveryFee] = useState(0);
  const [addressLocated, setAddressLocated] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  // Submitting state & order result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState('');
  const [successShortCode, setSuccessShortCode] = useState('');

  // Modals
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClearChat, setConfirmClearChat] = useState(false);

  // Pending Cart Confirmation Queue (AmirBot never mutates cart without explicit confirmation)
  type PendingCartAction = {
    id: string;
    type: 'ADD_ITEM' | 'SET_QTY' | 'REMOVE_ITEM' | 'CLEAR_CART';
    menu_item_id?: string;
    name: string;
    price: number;
    qty: number;
    image_url?: string;
    availableVariants?: ItemVariant[];
    selectedVariants: ItemVariant[];
  };
  const [actionQueue, setActionQueue] = useState<PendingCartAction[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef(0);

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

  // Save messages to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        // Strip non-serializable action closures before saving
        const serializable = messages.map(m => ({
          role: m.role,
          text: m.text,
          time: m.time
        }));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
      } catch { /* ignore */ }
    }
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, actionQueue]);

  // Recalculate delivery quote when address or cart changes
  useEffect(() => {
    if (!draft.delivery.address && !draft.delivery.lat) {
      setDistanceKm(0);
      setTotalDeliveryFee(0);
      setCodFee(0);
      setAddressLocated(false);
      return;
    }

    const seq = ++quoteSeqRef.current;
    quoteDeliveryFn({
      data: {
        address: draft.delivery.address,
        lat: draft.delivery.lat,
        lng: draft.delivery.lng,
        subtotal,
        paymentMethod: draft.payment.method || 'online_transfer',
      }
    }).then(res => {
      if (seq !== quoteSeqRef.current) return;
      if (!res.ok) {
        setDeliveryError(res.error || 'Delivery unavailable to this address.');
        setTotalDeliveryFee(0);
        setAddressLocated(false);
      } else {
        setDeliveryError('');
        setAddressLocated(Boolean((res as any).addressLocated));
        setDistanceKm(res.distanceKm || 0);
        setCodFee(res.codFee || 0);
        setTotalDeliveryFee(res.totalDeliveryFee || 0);
      }
    }).catch(() => {
      if (seq !== quoteSeqRef.current) return;
      setDeliveryError('Could not calculate delivery charges.');
      setAddressLocated(false);
    });
  }, [draft.delivery.address, draft.delivery.lat, draft.delivery.lng, draft.payment.method, subtotal, cartItems.length]);

  const addToast = (msg: string, type: 'success' | 'error' | 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // Clear chat messages (preserves cart & draft)
  const handleClearChat = () => {
    setMessages([
      { 
        role: 'bot', 
        text: 'Hi! I am AmirBot. Chat messages have been cleared. Your cart and draft details are preserved.' 
      }
    ]);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch { /* ignore */ }
    }
    setConfirmClearChat(false);
    addToast('Chat messages cleared. Cart and draft kept.', 'info');
  };

  // Start Over / Reset (clears session, cart, and draft)
  const handleStartOver = () => {
    clearCart();
    clearDraft();
    stopOrdering();
    setSuccessOrderId('');
    setSuccessShortCode('');
    setActionQueue([]);
    setMessages([
      { 
        role: 'bot', 
        text: 'Session reset! Your cart has been emptied. What can I get for you today?' 
      }
    ]);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch { /* ignore */ }
    }
    setConfirmReset(false);
    addToast('Started over with a fresh cart.', 'info');
  };

  // Queue server-directed cart actions for explicit confirmation (never mutate cart automatically)
  const executeActions = (actions: any[]) => {
    if (!actions || !Array.isArray(actions)) return;

    for (const action of actions) {
      switch (action.type) {
        case 'PROPOSE_ADD':
        case 'ADD_ITEM': {
          if (!action.menu_item_id || !action.name) break;
          setActionQueue(prev => {
            const exists = prev.some(
              p => p.type === 'ADD_ITEM' && p.menu_item_id === action.menu_item_id && p.qty === (action.qty || 1)
            );
            if (exists) return prev;
            return [
              ...prev,
              {
                id: `add_${action.menu_item_id}_${Date.now()}`,
                type: 'ADD_ITEM',
                menu_item_id: action.menu_item_id,
                name: action.name,
                price: Number(action.price) || 0,
                qty: action.qty || 1,
                image_url: action.image_url || '/placeholder.webp',
                availableVariants: Array.isArray(action.availableVariants) ? action.availableVariants : [],
                selectedVariants: [],
              }
            ];
          });
          break;
        }
        case 'INVALID_CART_TARGET': {
          if (action.message) {
            setMessages(prev => [...prev, { role: 'bot', text: action.message }]);
          }
          break;
        }
        case 'SET_QTY': {
          if (!action.menu_item_id) break;
          const matches = getCart().filter(i => i.menu_item_id === action.menu_item_id);
          if (matches.length === 0) break;
          const actionVars = Array.isArray(action.variants) ? action.variants : null;
          if (action.ambiguous || (!actionVars && matches.length > 1)) {
            const opts = matches
              .map(m => `• ${m.name}${(m.variants || []).length > 0 ? ` (${m.variants.map(v => v.name).join(', ')})` : ' (Standard)'} × ${m.quantity}`)
              .join('\n');
            setMessages(prev => [
              ...prev,
              {
                role: 'bot',
                text: `You have multiple variants of ${matches[0].name} in your cart:\n${opts}\n\nWhich one would you like to update?`
              }
            ]);
            break;
          }
          const targetedMatches = actionVars
            ? matches.filter(m => areVariantsEqual(m.variants, actionVars))
            : matches;
          if (targetedMatches.length === 0) {
            setMessages(prev => [
              ...prev,
              { role: 'bot', text: `I couldn't find that variant option for ${matches[0].name} in your cart, so nothing was changed.` }
            ]);
            break;
          }
          const toQueue = [targetedMatches[0]];
          setActionQueue(prev => {
            const additions: any[] = [];
            toQueue.forEach((matching, idx) => {
              const dup = prev.some(
                p =>
                  p.type === 'SET_QTY' &&
                  p.menu_item_id === action.menu_item_id &&
                  areVariantsEqual(p.selectedVariants, matching.variants || [])
              );
              if (!dup) {
                const varLabel = (matching.variants || []).length > 0
                  ? ` (${matching.variants.map(v => v.name).join(', ')})`
                  : '';
                additions.push({
                  id: `qty_${action.menu_item_id}_${idx}_${Date.now()}`,
                  type: 'SET_QTY',
                  menu_item_id: action.menu_item_id,
                  name: `${matching.name}${varLabel}`,
                  price: matching.price,
                  qty: action.qty || 1,
                  selectedVariants: matching.variants || [],
                });
              }
            });
            return [...prev, ...additions];
          });
          break;
        }
        case 'REMOVE_ITEM': {
          if (!action.menu_item_id) break;
          const matches = getCart().filter(i => i.menu_item_id === action.menu_item_id);
          if (matches.length === 0) break;
          const actionVars = Array.isArray(action.variants) ? action.variants : null;
          if (action.ambiguous || (!actionVars && matches.length > 1)) {
            const opts = matches
              .map(m => `• ${m.name}${(m.variants || []).length > 0 ? ` (${m.variants.map(v => v.name).join(', ')})` : ' (Standard)'} × ${m.quantity}`)
              .join('\n');
            setMessages(prev => [
              ...prev,
              {
                role: 'bot',
                text: `You have multiple variants of ${matches[0].name} in your cart:\n${opts}\n\nWhich specific one would you like to remove?`
              }
            ]);
            break;
          }
          const targetedMatches = actionVars
            ? matches.filter(m => areVariantsEqual(m.variants, actionVars))
            : matches;
          if (targetedMatches.length === 0) {
            setMessages(prev => [
              ...prev,
              { role: 'bot', text: `I couldn't find that variant option for ${matches[0].name} in your cart, so nothing was removed.` }
            ]);
            break;
          }
          const toQueue = [targetedMatches[0]];
          setActionQueue(prev => {
            const additions: any[] = [];
            toQueue.forEach((matching, idx) => {
              const dup = prev.some(
                p =>
                  p.type === 'REMOVE_ITEM' &&
                  p.menu_item_id === action.menu_item_id &&
                  areVariantsEqual(p.selectedVariants, matching.variants || [])
              );
              if (!dup) {
                const varLabel = (matching.variants || []).length > 0
                  ? ` (${matching.variants.map(v => v.name).join(', ')})`
                  : '';
                additions.push({
                  id: `rm_${action.menu_item_id}_${idx}_${Date.now()}`,
                  type: 'REMOVE_ITEM',
                  menu_item_id: action.menu_item_id,
                  name: `${matching.name}${varLabel}`,
                  price: matching.price,
                  qty: matching.quantity,
                  selectedVariants: matching.variants || [],
                });
              }
            });
            return [...prev, ...additions];
          });
          break;
        }
        case 'CLEAR_CART': {
          if (getCart().length === 0) break;
          setActionQueue(prev => {
            if (prev.some(p => p.type === 'CLEAR_CART')) return prev;
            return [
              ...prev,
              {
                id: `clear_${Date.now()}`,
                type: 'CLEAR_CART',
                name: 'Entire Cart',
                price: 0,
                qty: getCart().length,
                selectedVariants: [],
              }
            ];
          });
          break;
        }
        case 'GO_STEP': {
          if (action.step >= 1 && action.step <= 6) {
            startOrdering();
            setStep(action.step);
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

  const confirmPendingAction = (pendingId: string) => {
    const pending = actionQueue.find(p => p.id === pendingId);
    if (!pending) return;

    setActionQueue(prev => prev.filter(p => p.id !== pendingId));

    if (pending.type === 'ADD_ITEM' && pending.menu_item_id) {
      const item: CartItem = {
        menu_item_id: pending.menu_item_id,
        name: pending.name,
        image_url: pending.image_url || '/placeholder.webp',
        quantity: pending.qty,
        price: pending.price,
        variants: pending.selectedVariants || [],
      };
      addToCart(item);
      const latestCart = getCart();
      const verified = latestCart.find(
        c => c.menu_item_id === pending.menu_item_id && areVariantsEqual(c.variants, pending.selectedVariants)
      );
      if (verified) {
        playSuccessChime();
        addToast(`Added ${pending.qty}x ${pending.name} to cart`, 'success');
        const opts = pending.selectedVariants.length > 0
          ? ` (${pending.selectedVariants.map(v => v.name).join(', ')})`
          : '';
        setMessages(prev => [
          ...prev,
          {
            role: 'bot',
            text: `Confirmed! Added ${pending.qty}x ${pending.name}${opts} to your cart.\nCurrent cart subtotal: PKR ${getCartSubtotal(latestCart)} (${latestCart.length} line item${latestCart.length === 1 ? '' : 's'}).`
          }
        ]);
      } else {
        addToast('Could not verify item in cart. Please try again.', 'error');
      }
    } else if (pending.type === 'SET_QTY' && pending.menu_item_id) {
      updateItemQuantity(pending.menu_item_id, pending.selectedVariants, pending.qty);
      const latestCart = getCart();
      const updated = latestCart.find(
        c => c.menu_item_id === pending.menu_item_id && areVariantsEqual(c.variants, pending.selectedVariants)
      );
      if (updated && updated.quantity === pending.qty) {
        addToast(`Updated ${pending.name} quantity to ${pending.qty}`, 'info');
        setMessages(prev => [
          ...prev,
          { role: 'bot', text: `Updated ${pending.name} quantity to ${pending.qty}. Subtotal is now PKR ${getCartSubtotal(latestCart)}.` }
        ]);
      } else {
        addToast(`Could not update ${pending.name} quantity in cart.`, 'error');
      }
    } else if (pending.type === 'REMOVE_ITEM' && pending.menu_item_id) {
      removeItem(pending.menu_item_id, pending.selectedVariants);
      const latestCart = getCart();
      const stillPresent = latestCart.some(
        c => c.menu_item_id === pending.menu_item_id && areVariantsEqual(c.variants, pending.selectedVariants)
      );
      if (!stillPresent) {
        addToast(`Removed ${pending.name} from cart`, 'info');
        setMessages(prev => [
          ...prev,
          { role: 'bot', text: `Removed ${pending.name} from your cart. Subtotal is now PKR ${getCartSubtotal(latestCart)}.` }
        ]);
      } else {
        addToast(`Could not remove ${pending.name} from cart.`, 'error');
      }
    } else if (pending.type === 'CLEAR_CART') {
      clearCart();
      addToast('Cart cleared', 'info');
      setMessages(prev => [...prev, { role: 'bot', text: 'Your cart has been cleared.' }]);
    }
  };

  const declinePendingAction = (pendingId: string) => {
    const pending = actionQueue.find(p => p.id === pendingId);
    setActionQueue(prev => prev.filter(p => p.id !== pendingId));
    if (pending) {
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: `Okay, I did not change your cart (${pending.name} was not ${pending.type === 'REMOVE_ITEM' ? 'removed' : 'added'}).` }
      ]);
    }
  };

  const togglePendingVariant = (pendingId: string, variant: ItemVariant) => {
    setActionQueue(prev => prev.map(p => {
      if (p.id !== pendingId) return p;
      const exists = p.selectedVariants.some(v => v.name === variant.name);
      return {
        ...p,
        selectedVariants: exists
          ? p.selectedVariants.filter(v => v.name !== variant.name)
          : [...p.selectedVariants, variant]
      };
    }));
  };

  // Geolocation handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      addToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const addr = await reverseGeocodeFn({ data: { lat: latitude, lng: longitude } });
          const resolvedAddr = addr || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          updateDraft({
            delivery: {
              lat: latitude,
              lng: longitude,
              address: resolvedAddr,
              source: 'gps'
            }
          });
          setMessages(prev => [
            ...prev,
            { 
              role: 'bot', 
              text: `📍 Location pinned: ${resolvedAddr}. Delivery charges calculated.` 
            }
          ]);
          addToast('Location pinned successfully!', 'success');
        } catch {
          updateDraft({
            delivery: {
              lat: latitude,
              lng: longitude,
              source: 'gps'
            }
          });
        } finally {
          setGettingLocation(false);
        }
      },
      () => {
        setGettingLocation(false);
        addToast('Could not access GPS. Please type your address.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Order Placement (Step 6)
  const handleConfirmOrder = async () => {
    if (!shopStatus.open) {
      addToast('The restaurant is currently closed.', 'error');
      return;
    }

    if (cartItems.length === 0) {
      addToast('Your cart is empty. Add items first.', 'error');
      setStep(1);
      return;
    }

    const nameVal = validateName(draft.contact.name);
    const phoneVal = validatePhone(draft.contact.phone);
    if (!nameVal.valid || !phoneVal.valid) {
      addToast('Please provide valid contact details.', 'error');
      setStep(2);
      return;
    }

    const addrVal = validateAddress(draft.delivery.address);
    if (!addrVal.valid) {
      addToast('Please provide a valid delivery address.', 'error');
      setStep(3);
      return;
    }

    if (draft.payment.method === 'online_transfer') {
      const tidVal = validateTid(draft.payment.trxId);
      if (!tidVal.valid) {
        addToast(tidVal.error || 'Please enter a valid Transaction ID.', 'error');
        setStep(4);
        return;
      }
    }

    if (deliveryError) {
      addToast(deliveryError, 'error');
      setStep(3);
      return;
    }

    setIsSubmitting(true);
    setStep(6);

    try {
      const res = await submitOrder(draft, cartItems, { expectedSubtotal: subtotal });

      if (!res.success || !res.orderId) {
        throw new Error(res.error || 'Failed to place order. Please try again.');
      }

      const orderId = res.orderId;
      const trackingToken = res.trackingToken || '';
      const trackingPath = `/orders/${orderId}${trackingToken ? `?t=${trackingToken}` : ''}`;
      const shortCode = orderId.slice(0, 8).toUpperCase();
      setSuccessOrderId(orderId);
      setSuccessShortCode(shortCode);

      // Add celebratory confirmation message
      const isOnline = draft.payment.method === 'online_transfer';
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: isOnline
            ? `Order #${shortCode} Placed Successfully!\n\nYour online transfer payment is pending admin review. Our team will verify your transaction and accept the order once confirmed.\n\nPermanent tracking link: ${trackingPath}`
            : `Order #${shortCode} Placed Successfully!\n\nYour Cash on Delivery order has been sent to our kitchen. Estimated delivery is 30–40 minutes, depending on distance and order volume.\n\nPermanent tracking link: ${trackingPath}`,
          chips: [
            {
              label: 'Track Live Order',
              primary: true,
              action: () => {
                onClose();
                navigate({
                  to: '/orders/$orderId',
                  params: { orderId },
                  search: trackingToken ? { t: trackingToken } : {},
                });
              }
            },
            {
              label: 'Order More',
              action: () => handleStartOver()
            }
          ]
        }
      ]);

      stopOrdering();
    } catch (err: any) {
      setStep(5);
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          text: `Order failed: ${err.message || 'Please try again or call 0301-4265785.'}`
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chat message send handler
  const handleSend = async (overrideText?: string) => {
    const txt = (overrideText ?? input).trim();
    if (!txt || isTyping || txt.length > 500) return;

    if (!overrideText) setInput('');
    const userMsg: Msg = { role: 'user', text: txt };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const lower = txt.toLowerCase();

      // 0. If there are pending cart confirmations awaiting user permission, process head of queue sequentially
      if (actionQueue.length >= 1) {
        const isConfirmReply = ['yes', 'y', 'confirm', 'add it', 'haan', 'han', 'ok', 'sure', 'jee', 'do it'].includes(lower);
        const isDeclineReply = ['no', 'n', 'cancel', 'nahi', 'nah', 'dont', "don't", 'skip', 'nope'].includes(lower);
        if (isConfirmReply) {
          confirmPendingAction(actionQueue[0].id);
          if (actionQueue.length > 1) {
            const nextPending = actionQueue[1];
            setMessages(prev => [
              ...prev,
              {
                role: 'bot',
                text: `Next item in your request: confirm ${nextPending.type === 'REMOVE_ITEM' ? 'removing' : nextPending.type === 'SET_QTY' ? 'updating' : 'adding'} ${nextPending.qty}x ${nextPending.name}? (${actionQueue.length - 1} remaining — reply "yes" / "no" or tap the card below.)`,
              }
            ]);
          }
          setIsTyping(false);
          return;
        }
        if (isDeclineReply) {
          declinePendingAction(actionQueue[0].id);
          if (actionQueue.length > 1) {
            const nextPending = actionQueue[1];
            setMessages(prev => [
              ...prev,
              {
                role: 'bot',
                text: `Next item in your request: confirm ${nextPending.type === 'REMOVE_ITEM' ? 'removing' : nextPending.type === 'SET_QTY' ? 'updating' : 'adding'} ${nextPending.qty}x ${nextPending.name}? (${actionQueue.length - 1} remaining — reply "yes" / "no" or tap the card below.)`,
              }
            ]);
          }
          setIsTyping(false);
          return;
        }
      }

      // 1. Order Intent Recognition:
      // If customer asks to place an order or buy food, and ordering flow is not yet active:
      const isTrackOrCancel = ['track', 'status', 'cancel', 'where is my'].some(k => lower.includes(k));
      const intentPhrases = [
        'place order', 'want to order', 'order food', 'i want to order', 
        'can i order', 'order kardo', 'mujhe order karna hai', 'khana chahiye', 'start order'
      ];
      const hasOrderIntent = !isTrackOrCancel && (
        lower === 'order' ||
        lower === 'buy' ||
        intentPhrases.some(p => lower.includes(p))
      );

      if (hasOrderIntent && !isOrderingActive) {
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          {
            role: 'bot',
            text: 'Would you like to place an order? I can guide you through these six simple steps:\n\n1. Items & Cart\n2. Contact Details\n3. Delivery Details\n4. Payment\n5. Review Order\n6. Confirm & Place Order',
            chips: [
              {
                label: 'Yes, start order',
                primary: true,
                action: () => {
                  startOrdering();
                  setMessages(p => [
                    ...p,
                    { role: 'user', text: 'Yes, start order' },
                    { 
                      role: 'bot', 
                      text: 'Step 1 of 6 · Items & Cart\n\nWhat would you like to order today? You can tell me what you crave (e.g. "2 Classic Shawarma and a Zinger Burger") or explore our menu!',
                      chips: [
                        { label: 'View Menu', action: () => { onClose(); navigate({ to: '/menu' }); } }
                      ]
                    }
                  ]);
                }
              },
              {
                label: 'No, just asking',
                action: () => {
                  setMessages(p => [
                    ...p,
                    { role: 'user', text: 'No, just asking' },
                    { role: 'bot', text: 'No problem at all! Feel free to ask me anything about our food, deals, prices, or store hours.' }
                  ]);
                }
              }
            ]
          }
        ]);
        return;
      }

      // Check if user replied YES to start ordering
      if (!isOrderingActive && (lower === 'yes' || lower === 'haan' || lower === 'sure' || lower === 'yes start order')) {
        startOrdering();
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          {
            role: 'bot',
            text: 'Step 1 of 6 · Items & Cart\n\nAwesome! What items would you like to order? You can tell me any dish or deal from our menu.',
            chips: [
              { label: 'View Menu', action: () => { onClose(); navigate({ to: '/menu' }); } }
            ]
          }
        ]);
        return;
      }

      // 2. Active Ordering Step-Specific Natural Inputs:
      if (isOrderingActive) {
        // Step 2: Contact input parsing
        if (step === 2) {
          const phoneMatch = txt.match(/(03\d{2}[-\s]?\d{7})/);
          if (phoneMatch) {
            const rawPhone = phoneMatch[1];
            const cleanName = txt.replace(phoneMatch[0], '').replace(/[,.-]/g, '').trim();
            const phoneVal = validatePhone(rawPhone);
            const nameVal = cleanName.length >= 2 ? validateName(cleanName) : { valid: true, normalized: draft.contact.name || cleanName };

            if (phoneVal.valid) {
              updateDraft({
                contact: {
                  name: nameVal.valid && nameVal.normalized ? nameVal.normalized : (draft.contact.name || 'Valued Customer'),
                  phone: phoneVal.normalized,
                  email: draft.contact.email
                }
              });
              setStep(3);
              setIsTyping(false);
              setMessages(prev => [
                ...prev,
                {
                  role: 'bot',
                  text: `Step 2 Complete! Saved contact: ${nameVal.normalized || draft.contact.name || 'Customer'} (${phoneVal.normalized}).\n\nStep 3 of 6 · Delivery Details\n\nWhere in Lahore should we deliver your order? You can type your complete street address or share your GPS location below:`,
                  chips: [
                    { label: '📍 Use GPS Location', action: handleGetLocation }
                  ]
                }
              ]);
              return;
            }
          }
        }

        // Step 3: Delivery address parsing
        const looksLikeQuestion = txt.includes('?') || /^(how|what|why|when|where|kitna|kya|menu|cart|cancel)/i.test(lower);
        if (step === 3 && txt.length >= 10 && !looksLikeQuestion) {
          const addrVal = validateAddress(txt);
          if (addrVal.valid) {
            updateDraft({
              delivery: {
                address: addrVal.normalized,
                source: 'typed'
              }
            });
            setStep(4);
            setIsTyping(false);
            setMessages(prev => [
              ...prev,
              {
                role: 'bot',
                text: `Step 3 Complete! Delivery address set to:\n${addrVal.normalized}\n\nStep 4 of 6 · Payment\n\nHow would you like to pay?`,
                chips: [
                  { 
                    label: '💵 Cash on Delivery', 
                    action: () => {
                      updateDraft({ payment: { method: 'cod', chosen: true } });
                      setStep(5);
                      setMessages(p => [
                        ...p,
                        { role: 'user', text: 'Cash on Delivery' },
                        { 
                          role: 'bot', 
                          text: `Step 4 Complete! Payment set to Cash on Delivery.\n(COD fee: ${subtotal < SHOP_COD_THRESHOLD ? `PKR ${SHOP_COD_FEE}` : 'FREE'}).\n\nMoving to Step 5: Review Order.`,
                          chips: [
                            { label: 'Review Order Now', primary: true, action: () => setStep(5) }
                          ]
                        }
                      ]);
                    } 
                  },
                  { 
                    label: '💳 Online Transfer', 
                    action: () => {
                      updateDraft({ payment: { method: 'online_transfer', chosen: true } });
                      setMessages(p => [
                        ...p,
                        { role: 'user', text: 'Online Transfer' },
                        { 
                          role: 'bot', 
                          text: `Please transfer PKR ${subtotal + totalDeliveryFee} via EasyPaisa / JazzCash to:\n• Account Number: ${SHOP_PHONE_LOCAL}\n\nOnce transferred, please type your Transaction ID (TID) here:`
                        }
                      ]);
                    } 
                  }
                ]
              }
            ]);
            return;
          }
        }

        // Step 4: TID input parsing for online transfer
        if (step === 4 && draft.payment.method === 'online_transfer') {
          const tidVal = validateTid(txt);
          if (tidVal.valid) {
            updateDraft({
              payment: {
                method: 'online_transfer',
                chosen: true,
                trxId: tidVal.normalized
              }
            });
            setStep(5);
            setIsTyping(false);
            setMessages(prev => [
              ...prev,
              {
                role: 'bot',
                text: `Step 4 Complete! Transaction ID recorded: ${tidVal.normalized}.\n\nMoving to Step 5: Review Order.`,
                chips: [
                  { label: 'Review Order Now', primary: true, action: () => setStep(5) }
                ]
              }
            ]);
            return;
          }
        }
      }

      // Normal Chat via Groq LLM
      const cart = getCart();
      const cartSummary = cart.length > 0
        ? cart.map(i => `${i.quantity}x ${i.name}${i.variants?.length ? ` [${i.variants.map(v => v.name).join(', ')}]` : ''} (PKR ${lineTotal(i)})`).join(', ') + ` | Subtotal: PKR ${getCartSubtotal(cart)}`
        : 'Empty';
      const cartItemsPayload = cart.map(i => ({
        menu_item_id: i.menu_item_id,
        name: i.name,
        variants: (i.variants || []).map(v => v.name),
        quantity: i.quantity,
      }));

      const history = messages
        .filter(m => m.role === 'user' || m.role === 'bot')
        .slice(-10)
        .map(m => ({
          role: (m.role === 'bot' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.text.substring(0, 500),
        }));

      const flowContext = {
        step,
        stepName: STEP_NAMES[step - 1] || 'Cart',
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

      const activeOrders = getActiveOrders();
      const latestActiveOrderId = activeOrders[0]?.id || successOrderId || undefined;
      const latestActiveTrackingToken = latestActiveOrderId ? (getTrackingToken(latestActiveOrderId) || undefined) : undefined;

      const res = await chatWithAmirBot({
        data: {
          text: txt,
          history,
          cartSummary,
          cartItems: cartItemsPayload,
          activeOrderId: latestActiveOrderId,
          activeOrderTrackingToken: latestActiveTrackingToken,
          flowContext,
        }
      });

      if (res.actions && res.actions.length > 0) {
        executeActions(res.actions);
      }

      if (res.reply) {
        setMessages(prev => [...prev, { role: 'bot', text: res.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'system',
        text: 'Sorry, I had trouble with that message. Please call us directly at 0301-4265785.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const currentPercent = STEP_PERCENTAGES[step - 1] || 17;

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
        {/* Floating Toasts */}
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

        {/* Top Header */}
        <div className="p-3.5 bg-primary text-primary-foreground flex justify-between items-center sm:rounded-tl-3xl rounded-t-3xl shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight flex items-center gap-1.5">
                AmirBot
                <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  AI Assistant
                </span>
              </h2>
              <p className="text-[11px] text-primary-foreground/80 leading-none mt-0.5">
                Conversational Ordering · Lahore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              type="button"
              onClick={() => {
                if (messages.length > 1) {
                  setConfirmClearChat(true);
                } else {
                  handleClearChat();
                }
              }} 
              aria-label="Clear Chat (keeps cart and draft)" 
              className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-full transition-colors text-white text-[11px] font-semibold flex items-center gap-1"
              title="Clear Chat — removes messages only, keeps your cart & draft"
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>Clear Chat</span>
            </button>
            <button 
              type="button"
              onClick={() => setConfirmReset(true)} 
              aria-label="Start Over (resets session, draft, and cart)" 
              className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-full transition-colors text-white text-[11px] font-semibold flex items-center gap-1"
              title="Start Over — clears chat, order draft, and empties your cart"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Start Over</span>
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white" 
              aria-label="Close AmirBot assistant"
              title="Close AmirBot"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Strictly 6-Step Progress Bar (Shown ONLY during active ordering) */}
        {isOrderingActive && (
          <div className="px-4 py-2 bg-accent/60 border-b border-border shrink-0 animate-in fade-in">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-foreground">
                Step {step} of 6 · {STEP_NAMES[step - 1]}
              </span>
              <span className="text-[11px] font-semibold text-primary">
                {step}/6 — {currentPercent}%
              </span>
            </div>

            {/* 6 Horizontal Segments */}
            <div className="flex gap-1.5" role="progressbar" aria-valuenow={currentPercent} aria-valuemin={0} aria-valuemax={100}>
              {[1, 2, 3, 4, 5, 6].map(i => {
                const isCurrent = step === i;
                const isPassed = step > i;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      // Allow going back to previous steps
                      if (i < step) setStep(i);
                    }}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      isCurrent
                        ? 'bg-primary ring-2 ring-primary/30'
                        : isPassed
                        ? 'bg-emerald-600 cursor-pointer hover:opacity-80'
                        : 'bg-muted-foreground/20'
                    }`}
                    title={`Step ${i}: ${STEP_NAMES[i - 1]}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Clear Chat Confirmation Modal */}
        {confirmClearChat && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border p-5 rounded-2xl max-w-xs w-full shadow-2xl text-center space-y-3">
              <Trash2 size={32} className="text-primary mx-auto" />
              <h3 className="font-bold text-base text-foreground">Clear Chat?</h3>
              <p className="text-xs text-muted-foreground">
                This will clear conversation messages only. Your cart items and order draft will remain intact.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmClearChat(false)}
                  className="flex-1 bg-accent text-foreground font-semibold py-2 rounded-xl text-xs hover:bg-accent/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="flex-1 bg-primary text-primary-foreground font-semibold py-2 rounded-xl text-xs hover:bg-primary/90"
                >
                  Clear Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Start Over Confirmation Modal */}
        {confirmReset && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border p-5 rounded-2xl max-w-xs w-full shadow-2xl text-center space-y-3">
              <AlertCircle size={32} className="text-amber-500 mx-auto" />
              <h3 className="font-bold text-base text-foreground">Start Over?</h3>
              <p className="text-xs text-muted-foreground">
                This will empty your cart and clear all order details.
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

        {/* Chat History View (Pure Conversational) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
          {/* Closed Banner */}
          {!shopStatus.open && (
            <div role="alert" className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-medium leading-relaxed">
              {shopStatus.closedMessage}
            </div>
          )}

          {/* Messages */}
          <div role="log" aria-live="polite" className="space-y-3">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1`}
              >
                <div 
                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 shadow-sm text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm font-medium'
                      : msg.role === 'system'
                      ? 'bg-destructive/10 text-destructive border border-destructive/20 text-center mx-auto'
                      : 'bg-card border border-border text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Inline Action Chips */}
                {msg.chips && msg.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[88%]">
                    {msg.chips.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={chip.action}
                        className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm transition-all ${
                          chip.primary
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : chip.destructive
                            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            : 'bg-card border border-border text-foreground hover:border-primary/50 hover:bg-accent'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
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

          {/* Pending Cart Action Confirmation Cards (Explicit Permission Required) */}
          {actionQueue.length > 0 && (
            <div className="space-y-2.5 pt-2">
              {actionQueue.map(pending => {
                const varsTotal = pending.selectedVariants.reduce((s, v) => s + (Number(v.price) || 0), 0);
                const estimatedTotal = (pending.price + varsTotal) * pending.qty;
                return (
                  <div key={pending.id} role="region" aria-label={`Confirm action for ${pending.name}`} className="p-3 bg-card border-2 border-primary/40 rounded-2xl shadow-md space-y-2.5 text-xs animate-in fade-in">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-foreground">
                          {pending.type === 'ADD_ITEM' && `Add ${pending.qty}x ${pending.name} to cart?`}
                          {pending.type === 'SET_QTY' && `Update ${pending.name} quantity to ${pending.qty}?`}
                          {pending.type === 'REMOVE_ITEM' && `Remove ${pending.name} from cart?`}
                          {pending.type === 'CLEAR_CART' && `Clear all ${pending.qty} item(s) from cart?`}
                        </p>
                        {pending.type === 'ADD_ITEM' && (
                          <p className="text-[11px] text-primary font-bold mt-0.5">
                            Total: PKR {estimatedTotal.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {pending.type === 'ADD_ITEM' && pending.availableVariants && pending.availableVariants.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground font-semibold">Optional add-ons / variants:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pending.availableVariants.map(v => {
                            const selected = pending.selectedVariants.some(sv => sv.name === v.name);
                            return (
                              <button
                                key={v.name}
                                type="button"
                                onClick={() => togglePendingVariant(pending.id, v)}
                                className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                                  selected
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-accent/50 text-foreground border-border hover:border-primary/50'
                                }`}
                              >
                                {v.name}{v.price > 0 ? ` (+PKR ${v.price})` : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => declinePendingAction(pending.id)}
                        className="flex-1 py-2 rounded-xl bg-accent hover:bg-accent/80 text-foreground font-bold text-xs transition-colors"
                      >
                        No, Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmPendingAction(pending.id)}
                        className={`flex-1 py-2 rounded-xl font-bold text-xs text-white transition-colors ${
                          pending.type === 'REMOVE_ITEM' || pending.type === 'CLEAR_CART'
                            ? 'bg-rose-600 hover:bg-rose-500'
                            : 'bg-emerald-700 hover:bg-emerald-600'
                        }`}
                      >
                        {pending.type === 'ADD_ITEM'
                          ? 'Yes, Add to Cart'
                          : pending.type === 'SET_QTY'
                          ? 'Yes, Update'
                          : 'Yes, Confirm'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Step Quick Action Widget (Conversational Companion) */}
          {isOrderingActive && (
            <div className="pt-2 animate-in fade-in">
              {/* Step 1: Cart Quick Summary */}
              {step === 1 && (
                <div className="p-3 bg-card border border-border rounded-2xl shadow-sm space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag size={14} className="text-primary" />
                      Cart ({cartItems.length} items)
                    </span>
                    <span className="text-primary font-black">PKR {subtotal}</span>
                  </div>
                  {cartItems.length > 0 ? (
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {cartItems.map((item, i) => (
                        <div key={i} className="flex justify-between text-muted-foreground text-[11px]">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-semibold text-foreground">PKR {lineTotal(item)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Your cart is empty. What would you like to add?</p>
                  )}
                  <div className="flex gap-2 pt-1 border-t border-border">
                    <button
                      type="button"
                      onClick={() => { onClose(); navigate({ to: '/menu' }); }}
                      className="flex-1 py-1.5 bg-accent hover:bg-accent/80 rounded-xl font-semibold text-foreground text-[11px]"
                    >
                      + Browse Menu
                    </button>
                    {cartItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setStep(2);
                          setMessages(p => [
                            ...p,
                            { role: 'user', text: 'Proceed to Contact Details' },
                            { 
                              role: 'bot', 
                              text: `Step 2 of 6 · Contact Details\n\nPlease share your Full Name and Phone Number (e.g. Ali Khan, 0300 1234567):`,
                              chips: draft.contact.name && draft.contact.phone ? [
                                {
                                  label: `Use saved: ${draft.contact.name} (${draft.contact.phone})`,
                                  primary: true,
                                  action: () => {
                                    setStep(3);
                                    setMessages(p2 => [
                                      ...p2,
                                      { role: 'user', text: `Use saved contact: ${draft.contact.name}` },
                                      {
                                        role: 'bot',
                                        text: `Step 2 Complete!\n\nStep 3 of 6 · Delivery Details\n\nWhere should we deliver your order in Lahore? You can type your street address or tap the location button below:`,
                                        chips: [{ label: '📍 Use GPS Location', action: handleGetLocation }]
                                      }
                                    ]);
                                  }
                                }
                              ] : []
                            }
                          ]);
                        }}
                        className="flex-1 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1"
                      >
                        Proceed to Contact <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Contact Details Helper */}
              {step === 2 && (
                <div className="p-3 bg-card border border-border rounded-2xl shadow-sm text-xs space-y-2">
                  <p className="font-bold text-foreground">Step 2: Enter Contact Details</p>
                  <p className="text-muted-foreground text-[11px]">
                    Type your name and 11-digit phone number in the message box below (e.g. "Ahmed, 0300-1234567").
                  </p>
                  {draft.contact.name && draft.contact.phone && (
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-bold text-xs"
                    >
                      Continue with {draft.contact.name} ({draft.contact.phone}) →
                    </button>
                  )}
                </div>
              )}

              {/* Step 3: Delivery Location Helper */}
              {step === 3 && (
                <div className="p-3 bg-card border border-border rounded-2xl shadow-sm text-xs space-y-2">
                  <p className="font-bold text-foreground">Step 3: Delivery Location</p>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                    className="w-full py-2 bg-primary/10 text-primary border border-primary/30 rounded-xl font-bold flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-colors"
                  >
                    <MapPin size={14} />
                    {gettingLocation ? 'Acquiring GPS location...' : 'Pin Current Location (GPS)'}
                  </button>
                  {draft.delivery.address && (
                    <div className="p-2 bg-muted rounded-xl space-y-1 text-[11px]">
                      <p className="font-semibold text-foreground truncate">📍 {draft.delivery.address}</p>
                      {deliveryError ? (
                        <p className="text-destructive font-semibold">{deliveryError}</p>
                      ) : addressLocated ? (
                        <p className="text-muted-foreground">
                          Distance: ~{distanceKm.toFixed(1)} km | Fee: {totalDeliveryFee === 0 ? 'FREE' : `PKR ${totalDeliveryFee}`}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">
                          Tap GPS pin above (or fee is calculated once address is located)
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={!!deliveryError}
                        onClick={() => setStep(4)}
                        className="w-full py-1.5 mt-1 bg-primary text-primary-foreground rounded-lg font-bold disabled:opacity-50"
                      >
                        Continue to Payment →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Payment Choices Helper */}
              {step === 4 && (
                <div className="p-3 bg-card border border-border rounded-2xl shadow-sm text-xs space-y-2">
                  <p className="font-bold text-foreground">Step 4: Choose Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateDraft({ payment: { method: 'cod', chosen: true } });
                        setStep(5);
                      }}
                      className={`p-2 rounded-xl border text-left font-semibold transition-all ${
                        draft.payment.method === 'cod' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                      }`}
                    >
                      💵 Cash on Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraft({ payment: { method: 'online_transfer', chosen: true } })}
                      className={`p-2 rounded-xl border text-left font-semibold transition-all ${
                        draft.payment.method === 'online_transfer' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                      }`}
                    >
                      💳 Online Transfer
                    </button>
                  </div>
                  {draft.payment.method === 'online_transfer' && (
                    <div className="p-2 bg-muted rounded-xl space-y-1.5 text-[11px]">
                      <p className="font-semibold text-foreground">Send payment to 0301-4265785</p>
                      <input
                        type="text"
                        placeholder="Enter Transaction ID (TID)"
                        value={draft.payment.trxId}
                        onChange={(e) => updateDraft({ payment: { trxId: e.target.value } })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs font-mono"
                      />
                      {validateTid(draft.payment.trxId).valid && (
                        <button
                          type="button"
                          onClick={() => setStep(5)}
                          className="w-full py-1.5 bg-primary text-primary-foreground rounded-lg font-bold mt-1"
                        >
                          Confirm TID & Proceed →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Order Review Card */}
              {step === 5 && (
                <div className="p-3 bg-card border border-border rounded-2xl shadow-sm text-xs space-y-2.5">
                  <div className="flex justify-between items-center border-b border-border pb-1.5">
                    <span className="font-black text-sm text-foreground">Review Your Order</span>
                    <span className="font-black text-primary text-sm">PKR {subtotal + totalDeliveryFee}</span>
                  </div>
                  <div className="space-y-1 text-muted-foreground text-[11px]">
                    <div className="flex justify-between">
                      <span>Items:</span>
                      <span className="font-semibold text-foreground">{cartItems.length} items (PKR {subtotal})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span className="font-semibold text-foreground">
                        {!addressLocated ? 'Calculated at order' : totalDeliveryFee === 0 ? 'FREE' : `PKR ${totalDeliveryFee}`}
                      </span>
                    </div>
                    {codFee > 0 && (
                      <div className="flex justify-between">
                        <span>COD Fee:</span>
                        <span className="font-semibold text-foreground">PKR {codFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span className="font-semibold text-foreground">{draft.contact.name} ({draft.contact.phone})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Address:</span>
                      <span className="font-semibold text-foreground truncate max-w-[200px]">{draft.delivery.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment:</span>
                      <span className="font-semibold text-foreground">
                        {draft.payment.method === 'cod' ? 'Cash on Delivery' : `Online Transfer (${draft.payment.trxId})`}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isSubmitting || !shopStatus.open || !!deliveryError}
                      onClick={handleConfirmOrder}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Placing Order...</span>
                        </>
                      ) : !shopStatus.open ? (
                        <span>Closed right now (Opens {shopStatus.opensAtLabel})</span>
                      ) : (
                        <span>Confirm & Place Order (PKR {subtotal + totalDeliveryFee})</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Input Area */}
        <div className="p-3 bg-card border-t border-border shrink-0">
          <form 
            onSubmit={e => { e.preventDefault(); handleSend(); }} 
            className="flex items-center gap-2"
          >
            <input
              type="text"
              aria-label="Ask AmirBot or type your order"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={
                isOrderingActive
                  ? step === 2
                    ? 'Type your name and phone (e.g. Ali, 03001234567)...'
                    : step === 3
                    ? 'Type your delivery street address...'
                    : step === 4 && draft.payment.method === 'online_transfer'
                    ? 'Type your Transaction ID (TID)...'
                    : 'Type a message or instruction...'
                  : 'Ask anything or say "I want to order"...'
              }
              disabled={isTyping || isSubmitting}
              maxLength={500}
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-border rounded-full px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || isTyping || isSubmitting}
              className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
            >
              <Send size={16} className={input.trim() && !isTyping ? "translate-x-0.5" : ""} />
            </button>
          </form>
          <div className="flex justify-between items-center px-2 mt-1 text-[10px] text-muted-foreground">
            <span>AmirBot 6-Step Conversational Order Guide</span>
            <span>{input.length}/500</span>
          </div>
        </div>
      </div>
    </>
  );
}
