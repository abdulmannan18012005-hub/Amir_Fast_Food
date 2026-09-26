import { createRootRoute, Outlet } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase';
import { AuthModal } from '../components/auth/AuthModal';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [balance, setBalance] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [balanceBounce, setBalanceBounce] = useState(false);

  useEffect(() => {
    // Initial fetch
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchBalance(session.user.id);
      }
    });

    // Listen to auth changes
    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
      if (session?.user) {
        fetchBalance(session.user.id);
      } else {
        setBalance(0);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchBalance = async (uid: string) => {
    const { data } = await supabaseBrowser
      .from('wallets')
      .select('balance')
      .eq('user_id', uid)
      .single();
    if (data) {
      setBalance(data.balance);
    }
  };

  useEffect(() => {
    if (!userId) return;

    // Supabase Realtime Subscription for Wallets
    const channel = supabaseBrowser
      .channel('wallet_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setBalance(payload.new.balance);
          setBalanceBounce(true);
          setTimeout(() => setBalanceBounce(false), 500);
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId]);

  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Amir Fast Food - 3D Digital Ordering</title>
        <meta property="og:title" content="Amir Fast Food - 3D Digital Ordering" />
        <meta property="og:description" content="Order your favorite fast food with our interactive 3D digital ordering experience." />
        <meta property="og:type" content="website" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          body { background-color: #0F172A; color: #F8FAFC; }
          .preserve-3d { transform-style: preserve-3d; }
          .perspective-1000 { perspective: 1000px; }
          @keyframes pop {
            0% { transform: scale(1); }
            50% { transform: scale(1.15); color: #10B981; }
            100% { transform: scale(1); }
          }
          .animate-pop { animation: pop 0.5s ease-out; }
        `}</style>
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className="text-2xl font-extrabold text-red-600 tracking-tight">AMIR<span className="text-white">FASTFOOD</span></span>
              </div>
              <nav className="hidden md:flex space-x-8">
                <a href="/" className="text-slate-300 hover:text-white px-3 py-2 text-sm font-medium">Home</a>
                <a href="/menu" className="text-slate-300 hover:text-white px-3 py-2 text-sm font-medium">Menu</a>
                <a href="/checkout" className="text-slate-300 hover:text-white px-3 py-2 text-sm font-medium">Checkout</a>
              </nav>
              <div className="flex items-center gap-4">
                {userId ? (
                  <>
                    <div className="bg-slate-800 px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className={`text-sm font-semibold transition-all ${balanceBounce ? 'animate-pop text-emerald-300' : 'text-emerald-400'}`}>
                        Wallet: Rs. {balance.toLocaleString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => supabaseBrowser.auth.signOut()}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsAuthOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-sm font-semibold px-4 py-2 rounded-full border border-slate-700 text-white transition-colors"
                  >
                    Login / Sign Up
                  </button>
                )}
                
                <button className="relative bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">0</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow flex flex-col">
          <Outlet />
        </main>

        <footer className="bg-slate-900 border-t border-slate-800 py-12 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <span className="text-xl font-extrabold text-red-600 tracking-tight">AMIR<span className="text-white">FASTFOOD</span></span>
              <p className="text-slate-500 text-sm mt-2">© 2026 Amir Fast Food. All rights reserved.</p>
            </div>
            <div className="flex space-x-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="/admin/kitchen" className="hover:text-amber-500 transition-colors">Staff KDS</a>
            </div>
          </div>
        </footer>

        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        <AmirBotDrawer />
      </body>
    </html>
  );
}
