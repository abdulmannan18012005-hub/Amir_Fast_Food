import { toSafeError, UserFacingError, GENERIC_ERROR } from './errors';
import { calculateDeliveryFee, calculateDistanceKm } from '../lib/pricing';
import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import { sendOrderReceiptEmail } from './email';
import { requireAdmin, verifyAdminPin, getClientIp } from './auth';
import { checkRateLimit } from './rateLimit';
import { isValidTransition, OrderStatus, ORDER_STATUSES } from '../lib/orderStatus';
import { sendOrderPush, sendAdminOrderPush } from './push';
import { getShopStatus } from '../lib/shop';
import { normalizeName, normalizePhone, normalizeAddress, normalizeTid, validateTid } from '../lib/orderValidation';

export interface CreateOrderPayload {
  website?: string; // honeypot
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  paymentMethod: 'cod' | 'online_transfer';
  paymentTrxId?: string;
  items: {
    menu_item_id: string;
    quantity: number;
    price: number; 
    variants: { name: string; price: number }[];
    name?: string;
  }[];
  subtotal: number;
}

export const createOrder = createServerFn({ method: "POST" })
  .validator((d: CreateOrderPayload) => d)
  .handler(async ({ data: payload }): Promise<{ success: boolean; orderId?: string; error?: string }> => {
  try {
    const ip = getClientIp();
    
    // 0. Opening hours check (server authoritative)
    let checkNow = new Date();
    if ((import.meta as any).env?.DEV && process.env.SHOP_NOW_OVERRIDE) {
      checkNow = new Date(process.env.SHOP_NOW_OVERRIDE);
    }
    const shopStatus = getShopStatus(checkNow);
    if (!shopStatus.open) {
      throw new UserFacingError(
        `We're closed right now. We open every day at ${shopStatus.opensAtLabel} (Pakistan time). You can fill your cart now and order when we open.`,
        'shop_closed'
      );
    }

    // 0b. Spam / Honeypot guard
    if (payload.website) {
      // Silently fail if honeypot is filled
      return { success: true, orderId: '00000000-0000-0000-0000-000000000000' };
    }

    const supabase = getSupabaseServer();

    // 1. Validate Payload basics
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new UserFacingError("Cart is empty.", "validation");
    }
    if (payload.items.length > 30) {
      throw new UserFacingError("Too many items in one order.", "validation");
    }

    const nameStr = normalizeName(payload.customerName || '');
    if (nameStr.length < 2 || nameStr.length > 60) {
      throw new UserFacingError("Invalid name.", "validation");
    }

    const phoneNormal = normalizePhone(payload.customerPhone || '');
    const phoneRegex = /^(?:\+923|923|03)\d{9}$/;
    if (!phoneRegex.test(phoneNormal)) {
      throw new UserFacingError("Invalid phone number. Must be a valid Pakistani mobile number.", "validation");
    }

    const addrStr = normalizeAddress(payload.deliveryAddress || '');
    if (addrStr.length < 10 || addrStr.length > 300) {
      throw new UserFacingError("Delivery address must be between 10 and 300 characters.", "validation");
    }

    // Rate limits (3 per phone per 10min, 5 per IP per 10min, 3 per address per 10min)
    if (!(await checkRateLimit(phoneNormal, 'order_phone', 3, 600000))) {
      throw new UserFacingError("Too many orders from this phone number. Please try again later.", "rate_limited");
    }
    if (!(await checkRateLimit(ip, 'order_ip', 5, 600000))) {
      throw new UserFacingError("Too many orders from this IP. Please try again later.", "rate_limited");
    }
    if (!(await checkRateLimit(addrStr.toLowerCase(), 'order_addr', 3, 600000))) {
      throw new UserFacingError("Too many orders for this address. Please try again later.", "rate_limited");
    }

    if (payload.paymentMethod !== 'cod' && payload.paymentMethod !== 'online_transfer') {
      throw new UserFacingError("Invalid payment method.", "validation");
    }

    let normalizedTrx = '';
    if (payload.paymentMethod === 'online_transfer') {
      normalizedTrx = normalizeTid(payload.paymentTrxId || '');
      if (!validateTid(normalizedTrx)) {
        throw new UserFacingError("Please enter the Transaction ID exactly as shown in your EasyPaisa/JazzCash payment confirmation.", "validation");
      }

      // Check duplicate active TID across non-canceled orders
      const { data: existingTrx } = await supabase
        .from('orders')
        .select('id')
        .eq('payment_method', 'online_transfer')
        .neq('status', 'canceled')
        .ilike('payment_trx_id', normalizedTrx)
        .limit(1);

      if (existingTrx && existingTrx.length > 0) {
        throw new UserFacingError(
          "This Transaction ID has already been used for another order. Please check the ID, or call us on 0301 4265785.",
          "tid_duplicate"
        );
      }
    }

    // 2. Fetch prices from DB to prevent client tampering
    const itemIds = payload.items.map(i => i.menu_item_id);
    const { data: menuData, error: menuErr } = await supabase
      .from('menu_items')
      .select('id, name, price, is_available, variants')
      .in('id', itemIds);
    if (menuErr || !menuData) { console.error('[Database Menu Error]:', menuErr); throw new UserFacingError('Failed to verify menu items.'); }
    const menuMap = new Map(menuData.map((m: any) => [m.id, m]));

    let computedSubtotal = 0;
    const dbItems: any[] = [];
    const itemNames: string[] = [];
    for (const item of payload.items) {
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new UserFacingError('Invalid quantity.');
      const dbItem: any = menuMap.get(item.menu_item_id);
      if (!dbItem || !dbItem.is_available) throw new UserFacingError('One or more items are unavailable.');

      const dbVariants: { name: string; price: number }[] = Array.isArray(dbItem.variants) ? dbItem.variants : [];
      const chosen: { name: string; price: number }[] = [];
      for (const v of Array.isArray(item.variants) ? item.variants : []) {
        const match = dbVariants.find(dv => dv.name === v?.name);
        if (!match) throw new UserFacingError(`Option "${String(v?.name ?? '').slice(0, 40)}" is no longer available.`);
        chosen.push({ name: match.name, price: Number(match.price) || 0 });   // DB price only
      }
      const unit = Number(dbItem.price) + chosen.reduce((s, v) => s + v.price, 0);
      computedSubtotal += unit * qty;
      itemNames.push(String(dbItem.name));
      dbItems.push({
        menu_item_id: item.menu_item_id,
        quantity: qty,
        price: unit,               // what process_order reads
        variants: chosen,          // what process_order reads
        unit_price: unit,          // harmless duplicates in case the DB function was changed
        selected_variants: chosen
      });
    }

    // 3. Distance calculation
    let distanceKm: number | null = null;
    let finalDeliveryFee = 0;
    let codFee = 0;
    let distanceFee = 0;
    
    let lat = typeof payload.deliveryLat === 'number' ? payload.deliveryLat : null;
    let lng = typeof payload.deliveryLng === 'number' ? payload.deliveryLng : null;

    if (lat === null || lng === null || !isFinite(lat) || !isFinite(lng)) {
      const { forwardGeocode } = await import('./location');
      const coords = await forwardGeocode(payload.deliveryAddress);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      } else {
        throw new UserFacingError("We couldn't locate your address. Please tap 'Use my current location' or WhatsApp us on 0301 4265785.");
      }
    }
    
    distanceKm = calculateDistanceKm(lat, lng);
    if (distanceKm > 15) {
      throw new UserFacingError("Sorry, your address is beyond our 15 KM delivery area.");
    }
    
    const pricing = calculateDeliveryFee(computedSubtotal, distanceKm, payload.paymentMethod);
    finalDeliveryFee = pricing.totalDeliveryFee;
    codFee = pricing.codFee;
    distanceFee = pricing.distanceFee;

    // Duplicate order guard (within 60s)
    const sixtySecsAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, total_amount, order_items(menu_item_id, quantity, variants)')
      .eq('customer_phone', phoneNormal)
      .gte('created_at', sixtySecsAgo)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (recentOrders && recentOrders.length > 0 && Number(recentOrders[0].total_amount) === computedSubtotal) {
      const recentItems = recentOrders[0].order_items || [];
      const currentItemsStr = [...dbItems].sort((a,b) => a.menu_item_id.localeCompare(b.menu_item_id)).map(i => `${i.menu_item_id}:${i.quantity}:${JSON.stringify(i.variants)}`).join('|');
      const recentItemsStr = [...recentItems].sort((a,b) => a.menu_item_id.localeCompare(b.menu_item_id)).map(i => `${i.menu_item_id}:${i.quantity}:${JSON.stringify(i.variants)}`).join('|');
      
      if (currentItemsStr === recentItemsStr) {
        return { success: true, orderId: recentOrders[0].id };
      }
    }

    // 4. Call RPC
    const p_email = payload.customerEmail?.trim() || '';
    
    const { data: orderId, error } = await supabase.rpc('process_order', {
      p_user_id: null,
      p_total: computedSubtotal,
      p_delivery_fee: finalDeliveryFee,
      p_payment_method: payload.paymentMethod,
      p_name: nameStr,
      p_phone: phoneNormal,
      p_email: p_email,
      p_address: addrStr,
      p_items: dbItems
    });

    if (error) {
      console.error('RPC Error processing order:', error);
      throw new Error(error.message);
    }

    // 5. Update extra fields missing from RPC safely
    const extraFields: any = {
      payment_trx_id: payload.paymentMethod === 'online_transfer' ? normalizedTrx : null,
      delivery_lat: lat,
      delivery_lng: lng,
      distance_km: distanceKm,
      distance_fee: distanceFee,
      cod_fee: codFee
    };
    
    const { error: updateErr } = await supabase
      .from('orders')
      .update(extraFields)
      .eq('id', orderId);
      
    if (updateErr) {
      console.warn("Failed to save extra order fields:", updateErr);
      if (updateErr.code === '23505' || updateErr.message?.includes('orders_unique_active_trx')) {
        await supabase.from('orders').update({ status: 'canceled', cancel_reason: 'Duplicate TID' }).eq('id', orderId);
        throw new UserFacingError("This Transaction ID has already been used for another order. Please check the ID, or call us on 0301 4265785.", "tid_duplicate");
      }
      if (payload.paymentMethod === 'online_transfer') {
        // Must reject if we can't save TID
        await supabase.from('orders').update({ status: 'canceled', cancel_reason: 'System Error: Failed to save TID' }).eq('id', orderId);
        throw new UserFacingError("We couldn't save your transaction ID securely. Your order was not placed. Please try again.", "validation");
      }
    }
    
    // Admin Push Alert
    const adminSummary = `New order #${orderId.slice(0, 8).toUpperCase()} - PKR ${computedSubtotal + finalDeliveryFee} · ${payload.paymentMethod === 'cod' ? 'COD' : 'ONLINE · verify TID'}`;
    await Promise.race([
      sendAdminOrderPush(orderId, adminSummary),
      new Promise(r => setTimeout(r, 4000))
    ]).catch(() => {});

    // 6. Send email (fire and forget with timeout)
    if (p_email) {
      await Promise.race([
          sendOrderReceiptEmail(
            { id: orderId, customer_name: nameStr, customer_phone: phoneNormal, customer_email: p_email, delivery_address: addrStr, payment_method: payload.paymentMethod, delivery_fee: finalDeliveryFee, total_amount: computedSubtotal + finalDeliveryFee } as any,
            dbItems.map((i, idx) => ({ ...i, name: itemNames[idx] })) as any
          ),
        new Promise(r => setTimeout(r, 5000)) // 5s timeout
      ]).catch(e => console.warn("Email error:", e));
    }

    return { success: true, orderId };
  } catch (err: any) {
    return { success: false, error: toSafeError(err) };
  }
});

// Verify Online Payment (Admin)
export const verifyPaymentFn = createServerFn({ method: "POST" })
  .validator((d: { orderId: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);
    const supabase = getSupabaseServer();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('orders')
      .update({ payment_verified_at: nowIso })
      .eq('id', data.orderId)
      .eq('payment_method', 'online_transfer');

    if (error) {
      console.warn('[verifyPaymentFn] DB error:', error.message);
      if (error.code === '42703' || error.message?.includes('payment_verified_at')) {
        return { success: false, code: 'db_migration_needed', message: 'Database update needed for payment verification (ask the developer)' };
      }
      throw new UserFacingError('Failed to verify payment.', 'validation');
    }
    return { success: true };
  });

// Update Order Status (Admin)
export const updateOrderStatus = createServerFn({ method: 'POST' })
  .validator((d: {
    orderId: string; status: OrderStatus; pin?: string; token?: string;
    expectedFrom: OrderStatus; reason?: string; riderName?: string; riderPhone?: string;
  }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);

    if (!ORDER_STATUSES.includes(data.status)) throw new UserFacingError('Invalid status.', 'validation');
    if (!data.expectedFrom || !isValidTransition(data.expectedFrom, data.status)) {
      throw new UserFacingError('That status change is not allowed.', 'validation');
    }

    const supabase = getSupabaseServer();

    // Payment verification gate for online_transfer:
    // refuse received -> preparing (and any other progression) if unverified
    if (data.status !== 'canceled' && data.expectedFrom === 'received') {
      const { data: currentOrder, error: fetchErr } = await supabase
        .from('orders')
        .select('id, payment_method, payment_verified_at')
        .eq('id', data.orderId)
        .maybeSingle();

      if (!fetchErr && currentOrder && currentOrder.payment_method === 'online_transfer') {
        if ('payment_verified_at' in currentOrder && !currentOrder.payment_verified_at) {
          throw new UserFacingError("Please verify the payment first.", "payment_unverified");
        }
      }
    }

    const updates: Record<string, any> = { status: data.status };
    let cancelReason = '';
    let riderName = '';

    if (data.status === 'canceled') {
      cancelReason = String(data.reason ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (cancelReason.length < 5 || cancelReason.length > 200) {
        throw new UserFacingError('Cancellation reason must be 5 to 200 characters.', 'validation');
      }
      updates.cancel_reason = cancelReason;
    }
    if (data.status === 'out_for_delivery') {
      riderName = String(data.riderName ?? '').replace(/<[^>]*>/g, '').trim().slice(0, 40);
      const phone = String(data.riderPhone ?? '').replace(/[\s-]/g, '');
      if (phone && !/^(\+92|0)3\d{9}$/.test(phone)) throw new UserFacingError('Invalid rider phone number.', 'validation');
      if (riderName) updates.rider_name = riderName;
      if (phone) updates.rider_phone = phone;
    }

    const { data: row, error } = await supabase
      .from('orders').update(updates)
      .eq('id', data.orderId).eq('status', data.expectedFrom)
      .select('id').maybeSingle();

    if (error) {
      console.error("[Database Order Update Error]:", error);
      throw new Error("Database update failed");
    }
    if (!row) throw new UserFacingError('This order was already updated by someone else.');

    const code = data.orderId.slice(0, 8).toUpperCase();
    const bodies: Record<string, string> = {
      preparing: 'Your food is being prepared',
      out_for_delivery: `On the way!${riderName ? ' Rider: ' + riderName : ''}`,
      delivered: 'Delivered. Enjoy your meal!',
      canceled: `Order #${code} was canceled - ${cancelReason}`
    };
    // A failed or slow push must never fail the status change
    await Promise.race([
      sendOrderPush(data.orderId, data.status, 'Amir Fast Food', bodies[data.status]),
      new Promise(r => setTimeout(r, 4000))
    ]).catch(() => {});

    return { success: true };
  });

export const getCompletedOrdersFn = createServerFn({ method: "POST" })
  .validator((d: { pin?: string; token?: string; date?: string; search?: string; status?: string; page?: number; pageSize?: number }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);

    const supabase = getSupabaseServer();
    let query = supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))', { count: 'exact' });

    // Handle status filter
    const statusFilter = data.status || 'All';
    if (statusFilter === 'Active') {
      query = query.in('status', ['received', 'preparing', 'out_for_delivery']);
    } else if (statusFilter === 'Delivered') {
      query = query.eq('status', 'delivered');
    } else if (statusFilter === 'Canceled') {
      query = query.eq('status', 'canceled');
    }
    
    // Date filter in PKT (UTC+5) day bounds
    if (data.date) {
      // Business day: 4 AM PKT (UTC+5) to 4 AM PKT next day
      const startIso = new Date(`${data.date}T04:00:00+05:00`).toISOString();
      const endIso = new Date(new Date(`${data.date}T04:00:00+05:00`).getTime() + 86400000).toISOString();
      query = query.gte('created_at', startIso).lt('created_at', endIso);
    }

    if (data.search) {
      const searchStr = data.search.trim().replace(/[,()%*\\]/g, '').slice(0, 50);
      query = query.or(`id.ilike.%${searchStr}%,customer_name.ilike.%${searchStr}%,customer_phone.ilike.%${searchStr}%`);
    }

    const page = data.page || 1;
    const pageSize = data.pageSize || 25;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    
    query = query.order('created_at', { ascending: false }).range(start, end);

    const { data: orders, count, error } = await query;
    if (error) { console.error('[Database Query Error]:', error); throw new UserFacingError(GENERIC_ERROR); }
    
    return { orders, totalCount: count || 0 };
  });

export const getKitchenOrders = createServerFn({ method: "POST" })
  .validator((d: { pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);
    const supabase = getSupabaseServer();
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .in('status', ['received', 'preparing', 'out_for_delivery'])
      .order('created_at', { ascending: true });
      
    if (error) throw new Error(error.message);
    return orders;
  });

export const getPublicOrders = createServerFn({ method: "POST" })
  .validator((d: { orderIds: string[] }) => d)
  .handler(async ({ data }) => {
    if (!data.orderIds || data.orderIds.length === 0) return [];
    const validIds = data.orderIds.slice(0, 3).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)); // basic UUID check length
    if (validIds.length === 0) return [];
    
    const supabase = getSupabaseServer();
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, status, created_at, status_changed_at, canceled_at, payment_method, total_amount, delivery_fee, customer_name, delivery_address, rider_name, rider_phone, cancel_reason, order_items(*, menu_items(name))')
      .in('id', validIds);
      
    if (error || !orders) return [];
    
    return orders.map(order => ({
      id: order.id,
      shortCode: order.id.slice(0, 8).toUpperCase(),
      status: order.status as OrderStatus,
      created_at: order.created_at,
      status_changed_at: order.status_changed_at || order.created_at,
      canceled_at: order.canceled_at,
      payment_method: order.payment_method,
      subtotal: order.total_amount,
      delivery_fee: order.delivery_fee,
      total: Number(order.total_amount) + Number(order.delivery_fee),
      customer_name: order.customer_name?.split(' ')[0] || 'Customer',
      delivery_address: order.delivery_address,
      rider_name: order.rider_name,
      rider_phone: order.rider_phone,
      cancel_reason: order.cancel_reason,
      items: order.order_items.map((i: any) => ({
        name: i.menu_items?.name || 'Item',
        quantity: i.quantity,
        unit_price: i.unit_price,
        variants: i.selected_variants
      }))
    }));
  });
