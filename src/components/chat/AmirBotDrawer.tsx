import React, { useState, useEffect, useRef } from 'react';
import { chatWithAmirBot } from '../../server/chat';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

export function AmirBotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Hi! I am AmirBot. How can I help you today? 🍔' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await chatWithAmirBot({ data: text });
      setMessages(prev => [...prev, { role: 'bot', text: res.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting to the kitchen right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-2xl transition-transform transform ${isOpen ? 'scale-0' : 'scale-100'} z-50`}
      >
        <Bot size={28} />
      </button>

      {/* Slide-up Drawer */}
      <div className={`fixed bottom-0 right-0 sm:right-6 sm:bottom-6 w-full sm:w-96 h-[500px] bg-slate-900 border border-slate-700 sm:rounded-2xl shadow-2xl flex flex-col transition-transform transform ${isOpen ? 'translate-y-0' : 'translate-y-[150%]'} z-50`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800 sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="bg-red-500/20 p-2 rounded-lg">
              <Bot className="text-red-500" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white">AmirBot</h3>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400"></span> Online
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-red-600 text-white rounded-br-none' : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-bl-none flex gap-1">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            <button onClick={() => handleSend("What are your best-selling burgers?")} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-colors">
              🍔 Best-selling burgers?
            </button>
            <button onClick={() => handleSend("How does the PKR 10,000 wallet bonus work?")} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-colors">
              💰 PKR 10,000 Bonus?
            </button>
            <button onClick={() => handleSend("What are your delivery fees?")} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-colors">
              🛵 Delivery fees?
            </button>
          </div>
        )}

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="p-4 border-t border-slate-700 bg-slate-800 sm:rounded-b-2xl flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask AmirBot..." 
            className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-red-500"
          />
          <button type="submit" disabled={!input.trim()} className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors">
            <Send size={20} />
          </button>
        </form>

      </div>
    </>
  );
}
