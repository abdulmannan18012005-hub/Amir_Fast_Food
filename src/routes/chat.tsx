import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../lib/seo';
import { usePublishedLayout } from '../lib/layoutContext';
import React from 'react';

export const Route = createFileRoute('/chat')({
  head: () => seo({ title: 'Chat with AmirBot', description: 'Order via our AI assistant AmirBot.', path: '/chat' }),
  component: ChatPage,
});

function ChatPage() {
  const cartCopy = usePublishedLayout().cart;

  React.useEffect(() => {
    window.dispatchEvent(new Event('openAmirBot'));
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 sm:py-20 min-h-[70vh] flex flex-col items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <span className="text-4xl" role="img" aria-label="Robot assistant">🤖</span>
        </div>
        <h1 className="text-3xl font-bold font-display text-foreground">{cartCopy.chatHeading}</h1>
        <p className="text-muted-foreground">
          {cartCopy.chatSubheading}
        </p>
        <button onClick={() => window.dispatchEvent(new Event('openAmirBot'))} className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors mt-4">
          {cartCopy.chatButtonLabel}
        </button>
      </div>
    </div>
  );
}
