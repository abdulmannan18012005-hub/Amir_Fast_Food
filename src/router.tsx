import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import React from 'react';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <h1 className="text-4xl font-black text-slate-900 mb-4">404 - Page Not Found</h1>
      <p className="text-slate-600 mb-8 max-w-md">Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.</p>
      <div className="flex gap-4">
        <a href="/" className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 transition-colors">Go Home</a>
        <a href="/menu" className="px-6 py-3 bg-slate-100 text-slate-800 font-bold rounded-xl hover:bg-slate-200 transition-colors">View Menu</a>
      </div>
    </div>
  );
}

function ErrorComponent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <h1 className="text-2xl font-black text-slate-900 mb-3">Something went wrong</h1>
      <p className="text-slate-600 mb-6 max-w-md">We're having trouble loading this page. Please refresh or call us directly at 0301-4265785.</p>
      <div className="flex gap-4">
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors">
          Try Again
        </button>
        <a href="/" className="px-6 py-3 bg-slate-100 text-slate-800 font-bold rounded-xl hover:bg-slate-200 transition-colors">
          Go Home
        </a>
      </div>
    </div>
  );
}

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ErrorComponent
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

let routerInstance: ReturnType<typeof createRouter>; 
export function getRouter() { if (!routerInstance) routerInstance = createRouter(); return routerInstance; }