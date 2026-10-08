import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import { getClientIp, verifyAdminPin } from './auth';

export const getVapidPublicKeyFn = createServerFn({ method: "POST" })
  .handler(async () => {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || '' };
  });

export const subscribeToPushFn = createServerFn({ method: "POST" })
  .validator((d: { subscription: any, orderId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    
    // Validate order exists and not final
    const { data: order } = await supabase.from('orders').select('status').eq('id', data.orderId).single();
    if (!order || order.status === 'canceled' || order.status === 'delivered') {
      return { success: false, error: 'Order is not active' };
    }

    const { endpoint, keys } = data.subscription;
    if (!endpoint || !keys?.p256dh || !keys?.auth) return { success: false };

    // Select then insert due to partial unique indexes in DB schema
    const { data: existing } = await supabase.from('push_subscriptions')
      .select('id').eq('order_id', data.orderId).eq('endpoint', endpoint).maybeSingle();
      
    if (!existing) {
       // Check max 5 subscriptions per order
       const { count } = await supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('order_id', data.orderId);
       if ((count || 0) >= 5) return { success: false, error: 'Max subscriptions reached' };
       
       await supabase.from('push_subscriptions').insert({
         order_id: data.orderId,
         role: 'customer',
         endpoint,
         p256dh: keys.p256dh,
         auth: keys.auth,
         user_agent: 'web'
       });
    }

    return { success: true };
  });

export async function sendOrderPush(orderId: string, status: string, title?: string, body?: string) {
  try {
    const webpush = (await import('web-push')).default;
    
    const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@amirfastfood.com';
    
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      console.warn("Skipping push: VAPID keys missing.");
      return;
    }
    
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    const supabase = getSupabaseServer();
    
    // Select ONLY subscriptions for THIS order_id
    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('order_id', orderId);
    if (!subs || subs.length === 0) return;
    
    const statusMessages: Record<string, string> = {
      received: "✅ Order confirmed — we've got your order",
      preparing: "👨‍🍳 Your food is being prepared",
      out_for_delivery: "🛵 On the way!",
      delivered: "🎉 Delivered. Enjoy your meal!",
      canceled: "❌ Order was canceled"
    };
    
    const payload = JSON.stringify({
      title: title || `Order Update`,
      body: body || statusMessages[status] || `Order #${orderId.slice(0,8)} is ${status}`,
      tag: `order-${orderId}`,
      data: { url: `/orders/${orderId}`, orderId, status }
    });
    
    for (const sub of subs) {
      try {
         await webpush.sendNotification({
           endpoint: sub.endpoint,
           keys: { p256dh: sub.p256dh, auth: sub.auth }
         }, payload, { TTL: 3600, urgency: 'high' });
      } catch (err: any) {
        console.error('Push delivery failed for endpoint ' + sub.endpoint, err);
        if (err.statusCode === 410 || err.statusCode === 404) {
           await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
         }
      }
    }
  } catch (e) {
    console.error('Push Notification Error (Customer):', e instanceof Error ? e.stack : e);
  }
}


export const subscribeAdminPushFn = createServerFn({ method: "POST" })
  .validator((d: { subscription: any, pin: string }) => d)
  .handler(async ({ data }) => {
    verifyAdminPin(data.pin);
    const supabase = getSupabaseServer();
    
    const { endpoint, keys } = data.subscription;
    if (!endpoint || !keys?.p256dh || !keys?.auth) return { success: false, error: 'Invalid subscription' };

    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      role: 'admin'
    }, { onConflict: 'endpoint' });
    
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

export async function sendAdminOrderPush(orderId: string, summary: string) {
  try {
    const webpush = (await import('web-push')).default;
    const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@amirfastfood.com';
    
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const supabase = getSupabaseServer();
    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('role', 'admin');
    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({
      title: 'Amir Fast Food - New Order',
      body: summary,
      data: { url: '/admin/kitchen' }
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, payload);
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410 || err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 400) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }
  } catch (e) {
    console.error('Push Notification Error (Admin):', e instanceof Error ? e.stack : e);
  }
}

export const sendTestAdminPushFn = createServerFn({ method: "POST" })
  .validator((d: { pin: string }) => d)
  .handler(async ({ data }) => {
    verifyAdminPin(data.pin);
    await sendAdminOrderPush('TEST', 'Test Alert: Notifications are working! 🚀');
    return { success: true };
  });
