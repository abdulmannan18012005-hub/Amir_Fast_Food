import React, { useState, useEffect, useRef } from 'react';
import { playSuccessChime } from '../../lib/sound';
import { useNavigate } from '@tanstack/react-router';
import { chatWithAmirBot } from '../../server/chat';
import { Bot, X, Send, Trash2 } from 'lucide-react';
import { addToCart, getCart, removeItem, clearCart, getCartSubtotal } from '../../lib/cart';
import { getActiveOrders } from '../../lib/activeOrders';
import { CartItem } from '../../types';

type Msg = { role: 'user' | 'bot' | 'system'; text: string };
type ToastInfo = { id: number; msg: string; type: 'success' | 'error' | 'info' };

const STORAGE_KEY = 'amirbot_chat';
const DEFAULT_MSG: Msg[] = [{ role: 'bot', text: 'Hi! I am AmirBot. How can I help you today?' }];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AmirBotDrawer({ isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<Msg[]>(DEFAULT_MSG);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef(0);

  // Hydrate from sessionStorage in useEffect (not useState initializer) to avoid SSR mismatch
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

  // Persist to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  const addToast = (msg: string, type: 'success' | 'error' | 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const executeActions = (actions: any[]) => {
    if (!actions || !Array.isArray(actions)) return;

    for (const action of actions.slice(0, 5)) {
      switch (action.type) {
        case 'ADD_CART': {
          if (action.hasVariants) {
            addToast(`"${action.name}" has options. Choose them on the menu.`, 'info');
            navigate({ to: '/menu' });
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
        case 'NOT_FOUND': {
          const suggestions = action.suggestions;
          if (suggestions && suggestions.length > 0) {
            addToast(`Item not found. Did you mean: ${suggestions.join(', ')}?`, 'info');
          } else {
            addToast("I couldn't find that item. Could you check the menu?", 'error');
          }
          break;
        }
        case 'REMOVE_CART': {
          const cart = getCart();
          const item = cart.find(i => i.menu_item_id === action.menu_item_id);
          if (item) {
            removeItem(item.menu_item_id, item.variants);
            addToast(`Removed ${action.name || 'item'}`, 'info');
          } else {
            addToast('That item is not in your cart.', 'info');
          }
          break;
        }
        case 'CLEAR_CART':
          clearCart();
          addToast('Cart cleared.', 'info');
          break;
        case 'CHECKOUT': {
          const cart = getCart();
          if (cart.length > 0) {
            onClose();
            navigate({ to: '/checkout' });
          } else {
            addToast('Your cart is empty. Add items first!', 'info');
          }
          break;
        }
        case 'OPEN_MENU':
          onClose();
          navigate({ to: '/menu' });
          break;
        case 'TRACK_ORDER':
          window.dispatchEvent(new CustomEvent('openTracker'));
          break;
      }
    }
  };

  const handleSend = async () => {
    const txt = input.trim();
    if (!txt || isTyping || txt.length > 500) return;

    setInput('');
    const userMsg: Msg = { role: 'user', text: txt };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const cart = getCart();
      const cartSummary = cart.length > 0 ? `${cart.length} items, subtotal PKR ${getCartSubtotal(cart)}` : 'Empty';
      const activeOrderId = getActiveOrders()[0]?.id || null;

      // Build history BEFORE the new message, map bot -> assistant
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'bot')
        .slice(-10)
        .map(m => ({
          role: (m.role === 'bot' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.text.substring(0, 500),
        }));

      const res = await chatWithAmirBot({ data: {
        text: txt,
        history,
        cartSummary,
        activeOrderId,
      }});

      // Execute server-resolved actions
      if (res.actions && res.actions.length > 0) {
        executeActions(res.actions);
      }

      // Show reply
      if (res.reply) {
        setMessages(prev => [...prev, { role: 'bot', text: res.reply }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'system',
        text: 'Sorry, something went wrong. Please try again or call us at 0301-4265785.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed bottom-0 right-0 w-full md:w-[400px] h-[85vh] md:h-screen md:max-h-[800px] bg-white md:rounded-l-3xl rounded-t-3xl shadow-2xl z-50 flex flex-col transform transition-transform duration-300">

        {/* Toasts Stack */}
        <div className="absolute top-0 left-0 right-0 -mt-16 flex flex-col items-center gap-2 pointer-events-none z-50">
          {toasts.map(t => (
            <div key={t.id} role="status" aria-live="polite" className={`px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg pointer-events-auto transition-all ${
              t.type === 'success' ? 'bg-green-500' : t.type === 'error' ? 'bg-red-500' : 'bg-slate-700'
            }`}>
              {t.msg}
            </div>
          ))}
        </div>

        <div className="p-4 bg-primary text-primary-foreground flex justify-between items-center md:rounded-tl-3xl rounded-t-3xl shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">AmirBot</h2>
              <p className="text-xs text-primary-foreground/80">Always here to help</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMessages(DEFAULT_MSG)} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Clear Chat">
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Close chat">
              <X size={24} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : msg.role === 'system'
                  ? 'bg-red-100 text-red-700 mx-auto text-xs'
                  : 'bg-white border border-border text-slate-800 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-border">
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything or add items..."
              className="flex-1 bg-slate-50 border border-border rounded-full px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={isTyping}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
            >
              <Send size={20} className={input.trim() && !isTyping ? "translate-x-0.5" : ""} />
            </button>
          </form>
          <div className="text-right mt-1 px-2 text-[10px] text-slate-400">
            {input.length}/500
          </div>
        </div>
      </div>
    </>
  );
}
