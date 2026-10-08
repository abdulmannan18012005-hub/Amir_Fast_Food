const fs = require('fs');
let code = fs.readFileSync('src/server/push.ts', 'utf8');

if (!code.includes('subscribeAdminPushFn')) {
  // Add verifyAdminPin import if not present
  if (!code.includes('verifyAdminPin')) {
    code = code.replace(/import \{ getClientIp \} from '.\/auth';/, "import { getClientIp, verifyAdminPin } from './auth';");
  }

  const adminPushFns = `
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
    console.warn('Admin push error:', e);
  }
}

export const sendTestAdminPushFn = createServerFn({ method: "POST" })
  .validator((d: { pin: string }) => d)
  .handler(async ({ data }) => {
    verifyAdminPin(data.pin);
    await sendAdminOrderPush('TEST', 'Test Alert: Notifications are working! 🚀');
    return { success: true };
  });
`;

  code += '\n' + adminPushFns;
  fs.writeFileSync('src/server/push.ts', code);
}
