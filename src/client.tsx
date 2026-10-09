import './index.css';
/// <reference types="@tanstack/start/client" />
import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/start';
import { createRouter } from './router';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection Caught]:', event.reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.error('[Global Error Caught]:', event.error || event.message);
  });
}

const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);
