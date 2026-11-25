import { useState, useEffect } from 'react';
import { getShopStatus, ShopStatus } from '../lib/shop';
import { getShopStatusFn } from '../server/shopApi';

export function useShopStatus() {
  const [status, setStatus] = useState<ShopStatus>(() => getShopStatus());

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const res = await getShopStatusFn();
        if (mounted && res) {
          setStatus({
            open: res.open,
            opensAtLabel: res.opensAtLabel,
            closesAtLabel: res.closesAtLabel,
          });
        }
      } catch {
        // Fall back gracefully to local evaluation
        if (mounted) {
          setStatus(getShopStatus());
        }
      }
    };

    // Initial server fetch
    refresh();

    // Refresh every 60s if visible
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refresh();
      }
    }, 60000);

    const onFocus = () => {
      refresh();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const closedMessage = `Ordering is open daily from ${status.opensAtLabel} to ${status.closesAtLabel} (Pakistan Time). We're closed right now — you can still browse the menu and save items to your cart.`;

  return {
    ...status,
    closedMessage,
  };
}
