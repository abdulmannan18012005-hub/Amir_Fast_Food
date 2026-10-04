import React, { useState, useEffect, useRef } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { playSuccessChime } from '../../lib/sound';
import { useNavigate } from '@tanstack/react-router';
import { chatWithAmirBot } from '../../server/chat';
import { MessageCircle, X, Send, Bot, Trash2 } from 'lucide-react';
import { addToCart, getCart, removeItem, clearCart, getCartSubtotal, buildCartItem } from '../../lib/cart';
import { safeJson } from '../../lib/storage';
import { getActiveOrders } from '../../lib/activeOrders';

type ToastInfo = { id: number; msg: string; type: 'success' | 'error' | 'info' };

export function AmirBotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot' | 'system', text: string }[]>(() => {
    const saved = safeJson('amirbot_chat', [{ role: 'bot', text: 'Hi! I am AmirBot. How can I help you today?' }]);
    return saved;
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('amirbot_chat', JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleAmirBot', handleToggle);
    return () => window.removeEventListener('toggleAmirBot', handleToggle);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  const addToast = (msg: string, type: 'success' | 'error' | 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const processActionTags = async (text: string) => {
    const tagRegex = /\[ACTION:([A-Z_]+)(?::([^\]]+))?\]/g;
    let match;
    const actions: { type: string, payload?: string }[] = [];
    
    while ((match = tagRegex.exec(text)) !== null) {
      actions.push({ type: match[1], payload: match[2] });
    }
    
    for (const action of actions) {
      if (action.type === 'ADD_CART' && action.payload) {
        const parts = action.payload.split('|');
        const itemName = parts[0].trim();
        const qty = parts.length > 1 ? parseInt(parts[1], 10) : 1;
        const validQty = isNaN(qty) || qty < 1 ? 1 : Math.min(qty, 20);

        try {
          const { data, error } = await supabaseBrowser
            .from('menu_items')
            .select('*')
            .ilike('name', itemName.replace(/[%_]/g, '\\\\$&'))
            .eq('is_available', true)
            .maybeSingle();

          if (error || !data) {
            addToast(`Couldn't find '${itemName}'`, 'error');
          } else if (data.variants && data.variants.length > 0) {
            addToast(`'${itemName}' requires options. Please choose on the menu.`, 'info');
            navigate({ to: '/menu' });
          } else {
            addToCart(buildCartItem(data as any, [], validQty));
            playSuccessChime();
            addToast(`Added ${itemName} to cart`, 'success');
          }
        } catch(e) {
           addToast(`Error finding '${itemName}'`, 'error');
        }
      } else if (action.type === 'REMOVE_CART' && action.payload) {
         const itemName = action.payload.trim();
         // Basic removal (assuming no variants)
         const cart = getCart();
         const item = cart.find(i => i.name.toLowerCase() === itemName.toLowerCase());
         if (item) {
           removeItem(item.menu_item_id, item.variants);
           addToast(`Removed ${itemName}`, 'info');
         }
      } else if (action.type === 'CLEAR_CART') {
         clearCart();
         addToast('Cart cleared', 'info');
      } else if (action.type === 'CHECKOUT') {
         const cart = getCart();
         if (cart.length > 0) {
           setIsOpen(false);
           navigate({ to: '/checkout' });
         }
      } else if (action.type === 'OPEN_MENU') {
         setIsOpen(false);
         navigate({ to: '/menu' });
      } else if (action.type === 'TRACK_ORDER') {
         setIsOpen(false);
         // Open tracker if possible
      }
    }
  };

  const handleSend = async () => {
    const txt = input.trim();
    if (!txt || isTyping || txt.length > 500) return;

    setInput('');
    const newMessages = [...messages, { role: 'user' as const, text: txt }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const cart = getCart();
      const cartSummary = cart.length > 0 ? `${cart.length} items, subtotal PKR ${getCartSubtotal(cart)}` : 'Empty';
      const activeOrderId = getActiveOrders()[0]?.id || safeJson('just_ordered', '');

      // Send to backend
      const res = await chatWithAmirBot({ data: { 
        text: txt, 
        history: newMessages.filter(m => m.role !== 'system') as any,
        cartSummary,
        activeOrderId
      }});
      
      const replyRaw = res.reply;
      await processActionTags(replyRaw);
      
      const replyClean = replyRaw.replace(/\[ACTION:([A-Z_]+)(?::([^\]]+))?\]/g, '').trim();
      if (replyClean) {
        setMessages(prev => [...prev, { role: 'bot', text: replyClean }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', text: 'Error connecting to AmirBot.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)} />
      
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
              <h2 className="font-bold text-lg leading-tight">AmirBot v2</h2>
              <p className="text-xs text-primary-foreground/80">Always here to help</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMessages([{ role: 'bot', text: 'Chat cleared! How can I help?' }])} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Clear Chat">
              <Trash2 size={20} />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
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
