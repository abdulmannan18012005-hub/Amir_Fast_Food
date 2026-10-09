import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../lib/seo';
import React from 'react';

export const Route = createFileRoute('/chat')({
  head: () => seo({ title: 'Chat with AmirBot', description: 'Order via our AI assistant AmirBot.', path: '/chat' }),
  component: ChatPage,
});

function ChatPage() {
  React.useEffect(() => {
    // Dispatch event to open the drawer
    window.dispatchEvent(new Event('toggleAmirBot'));
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-12 sm:py-20 min-h-[70vh] flex flex-col items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <span className="text-4xl">🤖</span>
        </div>
        <h1 className="text-3xl font-bold font-display text-foreground">Ask AmirBot</h1>
        <p className="text-muted-foreground">
          I'm here to help you find the perfect meal, check delivery areas, and answer any questions about our menu!
        </p>
        <button onClick={() => window.dispatchEvent(new Event('toggleAmirBot'))} className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors mt-4">
          Open Chat
        </button>
      </div>
    </div>
  );
}
