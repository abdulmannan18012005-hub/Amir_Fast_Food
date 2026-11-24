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
  idempotencyKey?: string;
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
  .handler(async ({ data: payload }): Promise<{ success: boolean; orderId?: string; cancellationToken?: string; error?: string }> => {
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

    // 3b. Generate cryptographically secure per-order cancellation token
    const cryptoMod = await import('crypto');
    const rawCancellationToken = cryptoMod.randomBytes(32).toString('hex');
    const cancellationTokenHash = cryptoMod.createHash('sha256').update(rawCancellationToken).digest('hex');

    // Idempotency guard: Prevent double-click or network retry duplicate orders
    const idempotencyKey = payload.idempotencyKey?.trim() || null;
    if (idempotencyKey) {
      const { data: existingByKey } = await supabase
        .from('orders')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingByKey?.id) {
        return { success: true, orderId: existingByKey.id };
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
    const paymentReviewStatus = payload.paymentMethod === 'online_transfer' ? 'pending' : 'not_required';
    const extraFields: any = {
      payment_trx_id: payload.paymentMethod === 'online_transfer' ? normalizedTrx : null,
      payment_review_status: paymentReviewStatus,
      idempotency_key: idempotencyKey,
      cancellation_token_hash: cancellationTokenHash,
      cancellation_source: null,
      refund_status: 'not_required',
      delivery_lat: lat,
      delivery_lng: lng,
      distance_km: distanceKm,
      distance_fee: distanceFee,
      cod_fee: codFee
    };
    
    let { error: updateErr } = await supabase
      .from('orders')
      .update(extraFields)
      .eq('id', orderId);
      
    if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('cancellation_token_hash') || updateErr.message?.includes('refund_status'))) {
      // Fallback if cancellation/refund migration columns are not yet applied in DB
      const fallbackFields: any = {
        payment_trx_id: payload.paymentMethod === 'online_transfer' ? normalizedTrx : null,
        payment_review_status: paymentReviewStatus,
        idempotency_key: idempotencyKey,
        delivery_lat: lat,
        delivery_lng: lng,
        distance_km: distanceKm,
        distance_fee: distanceFee,
        cod_fee: codFee
      };
      const res = await supabase.from('orders').update(fallbackFields).eq('id', orderId);
      updateErr = res.error;
    }

    if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('payment_review_status') || updateErr.message?.includes('idempotency_key'))) {
      // Safe fallback if payment_review_status/idempotency columns are not yet applied
      const basicFallback = {
        payment_trx_id: payload.paymentMethod === 'online_transfer' ? normalizedTrx : null,
        delivery_lat: lat,
        delivery_lng: lng,
        distance_km: distanceKm,
        distance_fee: distanceFee,
        cod_fee: codFee
      };
      const res = await supabase.from('orders').update(basicFallback).eq('id', orderId);
      updateErr = res.error;
    }

    if (updateErr) {
      console.warn("Failed to save extra order fields:", updateErr);
      if (updateErr.code === '23505' || updateErr.message?.includes('orders_unique_active_trx')) {
        // Clean up orphan order row so no duplicate is left behind
        try {
          await supabase.from('order_items').delete().eq('order_id', orderId);
          await supabase.from('orders').delete().eq('id', orderId);
        } catch {
          await supabase.from('orders').update({ status: 'canceled', cancel_reason: 'Duplicate TID' }).eq('id', orderId);
        }
        throw new UserFacingError("This Transaction ID has already been used for another order. Please check the ID, or call us on 0301 4265785.", "tid_duplicate");
      }
      if (updateErr.code === '23505' && (updateErr.message?.includes('orders_unique_idempotency_key') || updateErr.message?.includes('idempotency_key'))) {
        // Clean up the duplicate collided order row immediately
        try {
          await supabase.from('order_items').delete().eq('order_id', orderId);
          await supabase.from('orders').delete().eq('id', orderId);
        } catch {}
        if (idempotencyKey) {
          const { data: collided } = await supabase.from('orders').select('id').eq('idempotency_key', idempotencyKey).maybeSingle();
          if (collided?.id) return { success: true, orderId: collided.id };
        }
      }
      if (payload.paymentMethod === 'online_transfer') {
        // Must reject and clean up if we can't save TID securely
        try {
          await supabase.from('order_items').delete().eq('order_id', orderId);
          await supabase.from('orders').delete().eq('id', orderId);
        } catch {
          await supabase.from('orders').update({ status: 'canceled', cancel_reason: 'System Error: Failed to save TID' }).eq('id', orderId);
        }
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

    return { success: true, orderId, cancellationToken: rawCancellationToken };
  } catch (err: any) {
    return { success: false, error: toSafeError(err) };
  }
});

// Approve Online Payment (Admin)
export const approvePaymentFn = createServerFn({ method: "POST" })
  .validator((d: { orderId: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);
    const supabase = getSupabaseServer();

    const { data: currentOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('id, payment_method, payment_review_status, payment_verified_at, status')
      .eq('id', data.orderId)
      .maybeSingle();

    if (fetchErr || !currentOrder) {
      throw new UserFacingError("Order not found.", "validation");
    }
    if (currentOrder.payment_method !== 'online_transfer') {
      throw new UserFacingError("This is a COD order. Payment approval is not applicable.", "validation");
    }
    if (currentOrder.status === 'canceled') {
      throw new UserFacingError("This order has already been canceled.", "validation");
    }
    if (currentOrder.payment_review_status === 'approved' || currentOrder.payment_verified_at) {
      return { success: true, alreadyApproved: true };
    }

    const nowIso = new Date().toISOString();
    const updates: any = {
      payment_verified_at: nowIso,
      payment_review_status: 'approved'
    };

    let { error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', data.orderId);

    if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('payment_review_status'))) {
      const fallback = await supabase
        .from('orders')
        .update({ payment_verified_at: nowIso })
        .eq('id', data.orderId);
      updateErr = fallback.error;
    }

    if (updateErr) {
      console.error('[approvePaymentFn] DB error:', updateErr);
      throw new UserFacingError("Failed to approve payment. Please try again.", "validation");
    }

    // Customer push notification
    const code = data.orderId.slice(0, 8).toUpperCase();
    await Promise.race([
      sendOrderPush(
        data.orderId,
        'received',
        'Amir Fast Food',
        `Payment Verified! Your order #${code} has been approved and accepted by our kitchen.`
      ),
      new Promise(r => setTimeout(r, 4000))
    ]).catch(() => {});

    return { success: true };
  });

// Reject Online Payment & Cancel Order (Admin)
export const rejectPaymentFn = createServerFn({ method: "POST" })
  .validator((d: { orderId: string; reason: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);
    const reason = String(data.reason || '').trim().replace(/<[^>]*>/g, '');
    if (reason.length < 5 || reason.length > 250) {
      throw new UserFacingError("Rejection reason must be between 5 and 250 characters.", "validation");
    }

    const supabase = getSupabaseServer();
    const { data: currentOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('id, payment_method, status')
      .eq('id', data.orderId)
      .maybeSingle();

    if (fetchErr || !currentOrder) {
      throw new UserFacingError("Order not found.", "validation");
    }
    if (currentOrder.status === 'canceled') {
      throw new UserFacingError("This order is already canceled.", "validation");
    }

    const nowIso = new Date().toISOString();
    const cancelText = `Payment rejected: ${reason}`;
    const updates: any = {
      status: 'canceled',
      payment_review_status: 'rejected',
      cancel_reason: cancelText,
      canceled_at: nowIso,
      status_changed_at: nowIso
    };

    let { error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', data.orderId);

    if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('payment_review_status'))) {
      const fallback = await supabase
        .from('orders')
        .update({
          status: 'canceled',
          cancel_reason: cancelText,
          canceled_at: nowIso,
          status_changed_at: nowIso
        })
        .eq('id', data.orderId);
      updateErr = fallback.error;
    }

    if (updateErr) {
      console.error('[rejectPaymentFn] DB error:', updateErr);
      throw new UserFacingError("Failed to reject payment. Please try again.", "validation");
    }

    // Customer push notification
    const code = data.orderId.slice(0, 8).toUpperCase();
    await Promise.race([
      sendOrderPush(
        data.orderId,
        'canceled',
        'Amir Fast Food',
        `Payment Could Not Be Verified: Order #${code} was canceled (${reason}). Call 0301-4265785 for assistance.`
      ),
      new Promise(r => setTimeout(r, 4000))
    ]).catch(() => {});

    return { success: true };
  });

// Verify Online Payment (Admin - Legacy compatibility)
export const verifyPaymentFn = createServerFn({ method: "POST" })
  .validator((d: { orderId: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);
    const supabase = getSupabaseServer();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('orders')
      .update({ payment_verified_at: nowIso, payment_review_status: 'approved' })
      .eq('id', data.orderId)
      .eq('payment_method', 'online_transfer');

    if (error) {
      console.warn('[verifyPaymentFn] DB error:', error.message);
      if (error.code === '42703' || error.message?.includes('payment_review_status')) {
        const fallback = await supabase
          .from('orders')
          .update({ payment_verified_at: nowIso })
          .eq('id', data.orderId)
          .eq('payment_method', 'online_transfer');
        if (fallback.error) {
          return { success: false, code: 'db_migration_needed', message: 'Database update needed for payment verification (ask the developer)' };
        }
        return { success: true };
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
    // Strictly fail-closed: refuse received -> preparing (and any other progression) if unverified
    // or if the verification lookup fails.
    if (data.status !== 'canceled' && data.expectedFrom === 'received') {
      const { data: currentOrder, error: fetchErr } = await supabase
        .from('orders')
        .select('id, payment_method, payment_review_status, payment_verified_at')
        .eq('id', data.orderId)
        .maybeSingle();

      if (fetchErr || !currentOrder) {
        console.error('[updateOrderStatus] Failed to fetch current order for verification:', fetchErr);
        throw new UserFacingError("Could not verify order payment status. Please try again.", "validation");
      }

      if (currentOrder.payment_method === 'online_transfer') {
        const isApproved = currentOrder.payment_review_status === 'approved' || Boolean(currentOrder.payment_verified_at);
        if (!isApproved) {
          throw new UserFacingError("Please verify the payment first.", "payment_unverified");
        }
      }
    }

    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = { 
      status: data.status,
      status_changed_at: nowIso,
    };
    let cancelReason = '';
    let riderName = '';

    if (data.status === 'canceled') {
      cancelReason = String(data.reason ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (cancelReason.length < 5 || cancelReason.length > 200) {
        throw new UserFacingError('Cancellation reason must be 5 to 200 characters.', 'validation');
      }
      updates.cancel_reason = cancelReason;
      updates.canceled_at = nowIso;
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
    let orders: any[] | null = null;
    
    const { data: fullOrders, error } = await supabase
      .from('orders')
      .select('id, status, created_at, status_changed_at, canceled_at, cancellation_source, refund_status, refund_proof_path, refund_reviewed_at, refund_paid_at, refund_trx_ref, refund_admin_note, payment_method, payment_review_status, payment_verified_at, payment_trx_id, total_amount, delivery_fee, customer_name, delivery_address, rider_name, rider_phone, cancel_reason, order_items(*, menu_items(name))')
      .in('id', validIds);

    if (error && (error.code === '42703' || error.message?.includes('refund_status') || error.message?.includes('cancellation_source') || error.message?.includes('payment_review_status'))) {
      const fallback = await supabase
        .from('orders')
        .select('id, status, created_at, status_changed_at, canceled_at, payment_method, payment_verified_at, payment_trx_id, total_amount, delivery_fee, customer_name, delivery_address, rider_name, rider_phone, cancel_reason, order_items(*, menu_items(name))')
        .in('id', validIds);
      if (fallback.error) {
        console.error("[Database getPublicOrders Error]:", fallback.error);
        throw new UserFacingError("Unable to load order status due to a server error. Please check your connection.");
      }
      orders = fallback.data;
    } else if (error) {
      console.error("[Database getPublicOrders Error]:", error);
      throw new UserFacingError("Unable to load order status due to a server error. Please check your connection.");
    } else {
      orders = fullOrders;
    }

    if (!orders) return [];
    
    return orders.map(order => {
      const computedReviewStatus = (order.payment_review_status as ('not_required' | 'pending' | 'approved' | 'rejected') | undefined) || (
        order.payment_method === 'online_transfer'
          ? (order.status === 'canceled' && order.cancel_reason?.toLowerCase().includes('payment')
              ? 'rejected'
              : (order.payment_verified_at ? 'approved' : 'pending'))
          : 'not_required'
      );
      const maskedTid = order.payment_trx_id
        ? (order.payment_trx_id.length > 4 ? `****${order.payment_trx_id.slice(-4)}` : '****')
        : null;

      return {
        id: order.id,
        shortCode: order.id.slice(0, 8).toUpperCase(),
        status: order.status as OrderStatus,
        payment_review_status: computedReviewStatus,
        payment_verified_at: order.payment_verified_at || null,
        payment_trx_id_masked: maskedTid,
        created_at: order.created_at,
        status_changed_at: order.status_changed_at || order.created_at,
        canceled_at: order.canceled_at,
        cancellation_source: order.cancellation_source || null,
        refund_status: order.refund_status || 'not_required',
        refund_proof_path: order.refund_proof_path || null,
        refund_reviewed_at: order.refund_reviewed_at || null,
        refund_paid_at: order.refund_paid_at || null,
        refund_trx_ref: order.refund_trx_ref || null,
        refund_admin_note: order.refund_admin_note || null,
        payment_method: order.payment_method,
        subtotal: order.total_amount,
        delivery_fee: order.delivery_fee,
        total: Number(order.total_amount) + Number(order.delivery_fee),
        customer_name: order.customer_name?.split(' ')[0] || 'Customer',
        delivery_address: order.delivery_address,
        rider_name: order.rider_name,
        rider_phone: order.rider_phone,
        cancel_reason: order.cancel_reason,
        items: (order.order_items || []).map((i: any) => ({
          name: i.menu_items?.name || 'Item',
          quantity: i.quantity,
          unit_price: i.unit_price,
          variants: i.selected_variants
        }))
      };
    });
  });
