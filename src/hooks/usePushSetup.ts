import { useEffect, useState } from 'react';
import { subscribeToPushFn, getVapidPublicKeyFn } from '../server/push';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSetup() {
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermissionState(Notification.permission);
      
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    }
  }, []);

  const enableOrderNotifications = async (orderId: string) => {
    if (!isSupported) return false;
    
    try {
      let perm = Notification.permission;
      if (perm !== 'granted') {
        perm = await Notification.requestPermission();
        setPermissionState(perm);
      }
      if (perm !== 'granted') return false;

      const sw = await navigator.serviceWorker.ready;
      
      const { publicKey } = await getVapidPublicKeyFn();
      if (!publicKey) return false;

      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await subscribeToPushFn({ data: { subscription: subscription.toJSON(), orderId } });
      return true;
    } catch (err) {
      console.warn('Failed to subscribe:', err);
      return false;
    }
  };

  // If already granted, silently attach to new orders
  const silentlyAttach = async (orderId: string, retry = 1) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
         const success = await enableOrderNotifications(orderId);
         if (!success && retry > 0) {
           setTimeout(() => silentlyAttach(orderId, retry - 1), 3000);
         }
      } else if ('Notification' in window && Notification.permission === 'default' && retry > 0) {
         // Maybe the user is still thinking about the prompt. Retry in 3s.
         setTimeout(() => silentlyAttach(orderId, retry - 1), 3000);
      }
    } catch (err) {
      console.warn('Silent attach failed:', err);
    }
  };

  return { isSupported, permissionState, enableOrderNotifications, silentlyAttach };
}
