import { useState, useEffect } from 'react';
import { getShopStatus, ShopStatus } from '../lib/shop';
import { getShopStatusFn } from '../server/shopApi';

const DETERMINISTIC_INITIAL_STATUS: ShopStatus = {
  open: false,
  opensAtLabel: '6:00 PM',
  closesAtLabel: '2:00 AM',
};

function getMsUntilNextPktBoundary(now: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find(p => p.type === 'hour')?.value || 0) % 24;
  const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
  const second = Number(parts.find(p => p.type === 'second')?.value || 0);
  const secOfDay = hour * 3600 + minute * 60 + second;

  const openSec = 18 * 3600; // 18:00 PKT
  const closeSec = 2 * 3600; // 02:00 PKT
  let deltaSec = 60;
  if (secOfDay < closeSec) {
    deltaSec = closeSec - secOfDay;
  } else if (secOfDay < openSec) {
    deltaSec = openSec - secOfDay;
  } else {
    deltaSec = 24 * 3600 - secOfDay + closeSec;
  }
  return Math.max(1000, Math.min(deltaSec * 1000 + 250, 60 * 60 * 1000));
}

export function useShopStatus() {
  // Deterministic initial value prevents SSR vs browser clock hydration mismatch (#418)
  const [status, setStatus] = useState<ShopStatus>(DETERMINISTIC_INITIAL_STATUS);

  useEffect(() => {
    let mounted = true;
    let boundaryTimer: ReturnType<typeof setTimeout> | null = null;

    const refresh = async () => {
      if (mounted) {
        setStatus(getShopStatus());
      }
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
        if (mounted) {
          setStatus(getShopStatus());
        }
      }
    };

    const scheduleBoundaryRefresh = () => {
      if (boundaryTimer) clearTimeout(boundaryTimer);
      boundaryTimer = setTimeout(() => {
        if (!mounted) return;
        refresh().finally(scheduleBoundaryRefresh);
      }, getMsUntilNextPktBoundary());
    };

    refresh().finally(scheduleBoundaryRefresh);

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
      if (boundaryTimer) clearTimeout(boundaryTimer);
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
