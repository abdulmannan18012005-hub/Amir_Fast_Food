import React, { useState, useEffect, useRef } from 'react';
import { chatWithAmirBot } from '../../server/chat';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

export function AmirBotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Hi! I am AmirBot. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleAmirBot', handleToggle);
    return () => window.removeEventListener('toggleAmirBot', handleToggle);
  }, []);

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
        aria-label="Open chat"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-2xl transition-transform transform ${isOpen ? 'scale-0' : 'scale-100'} z-50 shadow-primary/30`}
      >
        <Bot size={28} />
      </button>

      {/* Slide-up Drawer */}
      <div className={`fixed bottom-0 right-0 sm:right-6 sm:bottom-6 w-full sm:w-96 h-[550px] bg-card border border-border sm:rounded-2xl shadow-2xl flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-y-0' : 'translate-y-[150%]'} z-[60]`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-accent/50 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl relative">
              <Bot className="text-primary" size={24} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full animate-pulse"></span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">AmirBot</h3>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                Online
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground p-1 bg-background rounded-full transition-colors border border-border">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none shadow-md' : 'bg-accent border border-border text-foreground rounded-bl-none shadow-sm'}`}>
                {msg.text.split('\n').map((line, idx) => (
                  <React.Fragment key={idx}>
                    {line}
                    {idx < msg.text.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-accent border border-border p-3.5 rounded-2xl rounded-bl-none flex gap-1 shadow-sm">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            <button onClick={() => handleSend("Show Top Burgers")} className="text-xs bg-background hover:bg-accent text-foreground px-3 py-2 rounded-full border border-border transition-colors font-medium">
              🍔 Show Top Burgers
            </button>
            <button onClick={() => handleSend("Best Broast Deals")} className="text-xs bg-background hover:bg-accent text-foreground px-3 py-2 rounded-full border border-border transition-colors font-medium">
              🍗 Best Broast Deals
            </button>
            <button onClick={() => handleSend("Delivery Fee Rules")} className="text-xs bg-background hover:bg-accent text-foreground px-3 py-2 rounded-full border border-border transition-colors font-medium">
              🛵 Delivery Fee Rules
            </button>
            <button onClick={() => handleSend("Where is the shop located?")} className="text-xs bg-background hover:bg-accent text-foreground px-3 py-2 rounded-full border border-border transition-colors font-medium">
              📍 Where is the shop located?
            </button>
          </div>
        )}

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="p-4 border-t border-border bg-background sm:rounded-b-2xl flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..." 
            className="flex-1 bg-accent/50 border border-border text-foreground rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
          />
          <button type="submit" disabled={!input.trim()} className="bg-primary text-primary-foreground w-12 flex items-center justify-center rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md shadow-primary/20">
            <Send size={18} />
          </button>
        </form>

      </div>
    </>
  );
}
