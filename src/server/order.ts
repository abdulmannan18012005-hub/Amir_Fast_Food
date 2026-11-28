import { toSafeError, UserFacingError, GENERIC_ERROR } from './errors';
import { calculateDeliveryFee, calculateDistanceKm } from '../lib/pricing';
import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import { sendOrderReceiptEmail } from './email';
import { requireAdmin, verifyAdminPin, getClientIp, timingSafeCompare } from './auth';
import { checkRateLimit } from './rateLimit';
import { isValidTransition, OrderStatus, ORDER_STATUSES } from '../lib/orderStatus';
import { sendOrderPush, sendAdminOrderPush } from './push';
import { getShopStatus } from '../lib/shop';
import { normalizeName, normalizePhone, normalizeAddress, normalizeTid, validateTid } from '../lib/orderValidation';
import crypto from 'crypto';

function verifyTokenHash(rawToken: string | undefined, storedHash: string | null | undefined): boolean {
  if (!rawToken || !storedHash || typeof rawToken !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  try {
    const computed = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    return timingSafeCompare(computed, storedHash.trim());
  } catch {
    return false;
  }
}

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
  expectedSubtotal?: number;
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
  .handler(async ({ data: payload }): Promise<{
    success: boolean;
    orderId?: string;
    cancellationToken?: string;
    trackingToken?: string;
    code?: string;
    currentSubtotal?: number;
    error?: string;
  }> => {
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
        `Ordering is available daily from ${shopStatus.opensAtLabel} to ${shopStatus.closesAtLabel} (Pakistan Time). We're closed right now — please try again after ${shopStatus.opensAtLabel}.`,
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

    // Balanced NAT-friendly rate limits (3 per phone per 10min, 12 per shared-NAT IP per 10min, 4 per hashed address per 10min)
    const addrHash = crypto.createHash('sha256').update(addrStr.toLowerCase()).digest('hex').slice(0, 24);
    if (!(await checkRateLimit(phoneNormal, 'order_phone', 3, 600000))) {
      throw new UserFacingError("Too many orders from this phone number. Please try again later.", "rate_limited");
    }
    if (!(await checkRateLimit(ip, 'order_ip', 12, 600000))) {
      throw new UserFacingError("Too many orders from this network. Please try again in a few minutes.", "rate_limited");
    }
    if (!(await checkRateLimit(addrHash, 'order_addr', 4, 600000))) {
      throw new UserFacingError("Too many orders for this address. Please try again later.", "rate_limited");
    }

    if (payload.paymentMethod !== 'cod' && payload.paymentMethod !== 'online_transfer') {
      throw new UserFacingError("Invalid payment method.", "validation");
    }

    let normalizedTrx = '';
    if (payload.paymentMethod === 'online_transfer') {
      normalizedTrx = normalizeTid(payload.paymentTrxId || '');
      if (!validateTid(normalizedTrx).valid) {
        throw new UserFacingError("Please enter the Transaction ID exactly as shown in your EasyPaisa/JazzCash payment confirmation.", "validation");
      }

      // Check duplicate active TID across non-canceled orders (allowing same-idempotencyKey retries to hit process_order_v2 cleanly)
      const trimmedIdemp = payload.idempotencyKey?.trim() || null;
      const { data: existingTrx } = await supabase
        .from('orders')
        .select('id, idempotency_key')
        .eq('payment_method', 'online_transfer')
        .neq('status', 'canceled')
        .ilike('payment_trx_id', normalizedTrx)
        .limit(3);

      const hasConflictTid = (existingTrx || []).some(
        (row: any) => !trimmedIdemp || row.idempotency_key !== trimmedIdemp
      );
      if (hasConflictTid) {
        throw new UserFacingError(
          "This Transaction ID has already been used for another order. Please check the ID, or call us on 0301 4265785.",
          "tid_duplicate"
        );
      }
    }

    // 2. Fetch prices from DB to prevent client tampering & verify snapshot
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
      if (!dbItem || !dbItem.is_available) throw new UserFacingError('One or more items in your cart are currently unavailable.');

      const dbVariants: { name: string; price: number }[] = Array.isArray(dbItem.variants) ? dbItem.variants : [];
      const chosen: { name: string; price: number }[] = [];
      for (const v of Array.isArray(item.variants) ? item.variants : []) {
        const match = dbVariants.find(dv => dv.name === v?.name);
        if (!match) throw new UserFacingError(`Option "${String(v?.name ?? '').slice(0, 40)}" is no longer available.`);
        chosen.push({ name: match.name, price: Number(match.price) || 0 });
      }
      const unit = Math.round(Number(dbItem.price) + chosen.reduce((s, v) => s + v.price, 0));
      computedSubtotal += unit * qty;
      itemNames.push(String(dbItem.name));
      dbItems.push({
        menu_item_id: item.menu_item_id,
        quantity: qty,
        price: unit,
        variants: chosen,
        unit_price: unit,
        selected_variants: chosen
      });
    }

    if (
      typeof payload.expectedSubtotal === 'number' &&
      isFinite(payload.expectedSubtotal) &&
      Math.round(payload.expectedSubtotal) !== computedSubtotal
    ) {
      return {
        success: false,
        code: 'price_changed',
        currentSubtotal: computedSubtotal,
        error: `Menu prices were updated while you were checking out. Your new item total is PKR ${computedSubtotal}. Please review your cart before confirming.`,
      };
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

    // 3b. Derive deterministic capability tokens when high-entropy idempotencyKey is provided,
    // allowing legitimate idempotent retry after a dropped response to recover the EXACT original tokens
    // without storing plaintext tokens in PostgreSQL.
    const idempotencyKey = payload.idempotencyKey?.trim() || null;
    const canonicalPayload = {
      items: dbItems.map(i => ({
        id: i.menu_item_id,
        qty: i.quantity,
        unit: i.unit_price,
        variants: [...i.selected_variants].map((v: any) => `${v.name}:${v.price}`).sort(),
      })),
      subtotal: computedSubtotal,
      deliveryFee: finalDeliveryFee,
      paymentMethod: payload.paymentMethod,
      trx: normalizedTrx,
      phone: phoneNormal,
      addr: addrStr.toLowerCase(),
    };
    const requestFingerprint = crypto.createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');

    const tokenSecret = (process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const supportsDeterministicRecovery = Boolean(tokenSecret && idempotencyKey && idempotencyKey.length >= 16);
    const rawCancellationToken = supportsDeterministicRecovery
      ? crypto.createHmac('sha256', tokenSecret).update(`cancel:${idempotencyKey}:${requestFingerprint}`).digest('hex')
      : crypto.randomBytes(32).toString('hex');
    const cancellationTokenHash = crypto.createHash('sha256').update(rawCancellationToken).digest('hex');
    const rawTrackingToken = supportsDeterministicRecovery
      ? crypto.createHmac('sha256', tokenSecret).update(`track:${idempotencyKey}:${requestFingerprint}`).digest('hex')
      : crypto.randomBytes(32).toString('hex');
    const trackingTokenHash = crypto.createHash('sha256').update(rawTrackingToken).digest('hex');

    // 4. Atomic all-or-nothing order creation via process_order_v2
    const p_email = payload.customerEmail?.trim() || '';
    const paymentReviewStatus = payload.paymentMethod === 'online_transfer' ? 'pending' : 'not_required';

    const { data: rpcResult, error: rpcErr } = await supabase.rpc('process_order_v2', {
      p_user_id: null,
      p_total: computedSubtotal,
      p_delivery_fee: finalDeliveryFee,
      p_payment_method: payload.paymentMethod,
      p_payment_trx_id: payload.paymentMethod === 'online_transfer' ? normalizedTrx : null,
      p_payment_review_status: paymentReviewStatus,
      p_idempotency_key: idempotencyKey,
      p_request_fingerprint: requestFingerprint,
      p_cancellation_token_hash: cancellationTokenHash,
      p_tracking_token_hash: trackingTokenHash,
      p_cancellation_source: null,
      p_refund_status: 'not_required',
      p_delivery_lat: lat,
      p_delivery_lng: lng,
      p_distance_km: distanceKm,
      p_distance_fee: distanceFee,
      p_cod_fee: codFee,
      p_name: nameStr,
      p_phone: phoneNormal,
      p_email: p_email,
      p_address: addrStr,
      p_items: dbItems
    });

    if (rpcErr) {
      console.error('[createOrder] process_order_v2 error:', rpcErr);
      const errCode = String(rpcErr.code || '');
      const errMsg = String(rpcErr.message || '').toLowerCase();
      if (errCode === '42883' || errCode === 'PGRST202' || errMsg.includes('process_order_v2')) {
        throw new UserFacingError(
          'Database order migration is required. Please apply the latest process_order_v2 migration in Supabase.',
          'db_migration_needed'
        );
      }
      throw new UserFacingError('Failed to process order due to a database error. Please try again.');
    }

    const rpcStatus = (rpcResult as any)?.status;
    if (rpcStatus === 'tid_duplicate') {
      throw new UserFacingError(
        "This Transaction ID has already been used for another order. Please check the ID, or call us on 0301 4265785.",
        "tid_duplicate"
      );
    }
    if (rpcStatus === 'idempotency_conflict') {
      throw new UserFacingError(
        "Your order details changed since the previous submission attempt. Please review and confirm your order again.",
        "idempotency_conflict"
      );
    }
    if (rpcStatus === 'idempotent_hit' && (rpcResult as any)?.order_id) {
      const existingOrderId = String((rpcResult as any).order_id);
      if (supportsDeterministicRecovery) {
        const { data: existingOrd } = await supabase
          .from('orders')
          .select('id, tracking_token_hash, cancellation_token_hash, request_fingerprint')
          .eq('id', existingOrderId)
          .maybeSingle();

        const hashesMatch = Boolean(
          existingOrd &&
          timingSafeCompare(requestFingerprint, String(existingOrd.request_fingerprint || '')) &&
          verifyTokenHash(rawTrackingToken, existingOrd.tracking_token_hash) &&
          verifyTokenHash(rawCancellationToken, existingOrd.cancellation_token_hash)
        );
        if (hashesMatch) {
          return {
            success: true,
            orderId: existingOrderId,
            cancellationToken: rawCancellationToken,
            trackingToken: rawTrackingToken,
          };
        }
      }
      // Idempotent replay without high-entropy recovery match: return existing orderId without exposing capabilities
      return { success: true, orderId: existingOrderId };
    }
    if (rpcStatus !== 'created' || !(rpcResult as any)?.order_id) {
      throw new UserFacingError(
        (rpcResult as any)?.message || 'Unable to create order cleanly. No partial order was created.',
        'validation'
      );
    }

    const orderId = String((rpcResult as any).order_id);

    // 5. Side effects (strictly only for newly created orders)
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

    return {
      success: true,
      orderId,
      cancellationToken: rawCancellationToken,
      trackingToken: rawTrackingToken
    };
  } catch (err: any) {
    const code = err instanceof UserFacingError ? err.code : 'validation';
    return { success: false, code, error: toSafeError(err) };
  }
});

// Approve Online Payment (Admin)
export const approvePaymentFn = createServerFn({ method: "POST" })
  .validator((d: { orderId: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token || data.pin);
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

    const { data: updatedRow, error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', data.orderId)
      .eq('payment_method', 'online_transfer')
      .neq('status', 'canceled')
      .in('payment_review_status', ['pending', 'pending_review'])
      .select('id')
      .maybeSingle();

    if (updateErr) {
      console.error('[approvePaymentFn] DB error:', updateErr);
      throw new UserFacingError("Failed to approve payment. Please try again.", "validation");
    }

    if (!updatedRow) {
      const { data: latest } = await supabase
        .from('orders')
        .select('status, payment_review_status, payment_verified_at')
        .eq('id', data.orderId)
        .maybeSingle();

      if (latest?.payment_review_status === 'approved' || latest?.payment_verified_at) {
        return { success: true, alreadyApproved: true };
      }
      throw new UserFacingError("Order payment status changed concurrently (it may have been rejected or canceled). Please refresh.", "validation");
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
    await requireAdmin(data.token || data.pin);
    const reason = String(data.reason || '').trim().replace(/<[^>]*>/g, '');
    if (reason.length < 5 || reason.length > 250) {
      throw new UserFacingError("Rejection reason must be between 5 and 250 characters.", "validation");
    }

    const supabase = getSupabaseServer();
    const { data: currentOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('id, payment_method, payment_review_status, status')
      .eq('id', data.orderId)
      .maybeSingle();

    if (fetchErr || !currentOrder) {
      throw new UserFacingError("Order not found.", "validation");
    }
    if (currentOrder.payment_method !== 'online_transfer') {
      throw new UserFacingError("Payment rejection only applies to online transfer orders.", "validation");
    }
    if (currentOrder.status === 'canceled') {
      throw new UserFacingError("This order is already canceled.", "validation");
    }
    if (currentOrder.payment_review_status === 'approved') {
      throw new UserFacingError("Cannot reject a payment that has already been approved.", "validation");
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

    const { data: updatedRow, error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', data.orderId)
      .eq('payment_method', 'online_transfer')
      .eq('status', 'received')
      .in('payment_review_status', ['pending', 'pending_review'])
      .select('id')
      .maybeSingle();

    if (updateErr) {
      console.error('[rejectPaymentFn] DB error:', updateErr);
      throw new UserFacingError("Failed to reject payment. Please try again.", "validation");
    }

    if (!updatedRow) {
      throw new UserFacingError(
        "Order can no longer be payment-rejected (it may already be approved, in kitchen preparation, or canceled).",
        "validation"
      );
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

// Update Order Status (Admin)
export const updateOrderStatus = createServerFn({ method: 'POST' })
  .validator((d: {
    orderId: string; status: OrderStatus; pin?: string; token?: string;
    expectedFrom: OrderStatus; reason?: string; riderName?: string; riderPhone?: string;
  }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token || data.pin);

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
    await requireAdmin(data.token || data.pin);

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
    let startIso: string | null = null;
    let endIso: string | null = null;
    if (data.date) {
      startIso = new Date(`${data.date}T04:00:00+05:00`).toISOString();
      endIso = new Date(new Date(`${data.date}T04:00:00+05:00`).getTime() + 86400000).toISOString();
      query = query.gte('created_at', startIso).lt('created_at', endIso);
    }

    const searchStr = data.search ? data.search.trim().replace(/[,()%\*'\\"]/g, '').slice(0, 50) : '';
    if (searchStr) {
      query = query.or(`id.ilike.%${searchStr}%,customer_name.ilike.%${searchStr}%,customer_phone.ilike.%${searchStr}%`);
    }

    const page = data.page || 1;
    const pageSize = data.pageSize || 25;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(start, end);

    const [{ data: orders, count, error }, rpcSummaryRes] = await Promise.all([
      query,
      supabase.rpc('get_orders_summary_metrics', {
        p_status: statusFilter,
        p_start: startIso,
        p_end: endIso,
        p_search: searchStr || null,
      }),
    ]);

    if (error) { console.error('[Database Query Error]:', error); throw new UserFacingError(GENERIC_ERROR); }

    let deliveredCount = 0;
    let deliveredRevenue = 0;
    if (!rpcSummaryRes.error && rpcSummaryRes.data) {
      deliveredCount = Number((rpcSummaryRes.data as any).delivered_count || 0);
      deliveredRevenue = Number((rpcSummaryRes.data as any).delivered_revenue || 0);
    } else {
      // Exact fallback aggregate over all matching delivered rows if RPC not yet applied
      let aggQuery = supabase
        .from('orders')
        .select('total_amount, delivery_fee')
        .eq('status', 'delivered');
      if (statusFilter === 'Active' || statusFilter === 'Canceled') {
        deliveredCount = 0;
        deliveredRevenue = 0;
      } else {
        if (startIso && endIso) {
          aggQuery = aggQuery.gte('created_at', startIso).lt('created_at', endIso);
        }
        if (searchStr) {
          aggQuery = aggQuery.or(`id.ilike.%${searchStr}%,customer_name.ilike.%${searchStr}%,customer_phone.ilike.%${searchStr}%`);
        }
        const { data: aggRows } = await aggQuery.limit(5000);
        if (Array.isArray(aggRows)) {
          deliveredCount = aggRows.length;
          deliveredRevenue = aggRows.reduce((s, o: any) => s + Number(o.total_amount || 0) + Number(o.delivery_fee || 0), 0);
        }
      }
    }

    return {
      orders,
      totalCount: count || 0,
      summary: {
        totalCount: count || 0,
        deliveredCount,
        deliveredRevenue,
      },
    };
  });

export const getKitchenOrders = createServerFn({ method: "POST" })
  .validator((d: { pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token || data.pin);
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
  .validator((d: { orderIds: string[]; tokens?: Record<string, string>; trackingToken?: string }) => d)
  .handler(async ({ data }) => {
    if (!data.orderIds || data.orderIds.length === 0) return [];
    const validIds = data.orderIds.slice(0, 5).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
    if (validIds.length === 0) return [];

    let isAdminViewer = false;
    try {
      await requireAdmin();
      isAdminViewer = true;
    } catch {}

    const supabase = getSupabaseServer();
    let orders: any[] | null = null;

    const { data: fullOrders, error } = await supabase
      .from('orders')
      .select('id, status, created_at, status_changed_at, canceled_at, cancellation_source, cancellation_token_hash, tracking_token_hash, refund_status, refund_proof_path, refund_reviewed_at, refund_paid_at, refund_trx_ref, refund_admin_note, payment_method, payment_review_status, payment_verified_at, payment_trx_id, total_amount, delivery_fee, customer_name, delivery_address, rider_name, rider_phone, cancel_reason, order_items(*, menu_items(name))')
      .in('id', validIds);

    if (error && (error.code === '42703' || error.message?.includes('tracking_token_hash') || error.message?.includes('refund_status') || error.message?.includes('cancellation_source') || error.message?.includes('payment_review_status'))) {
      const fallback = await supabase
        .from('orders')
        .select('id, status, created_at, status_changed_at, canceled_at, cancellation_token_hash, payment_method, payment_verified_at, payment_trx_id, total_amount, delivery_fee, customer_name, delivery_address, rider_name, rider_phone, cancel_reason, order_items(*, menu_items(name))')
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

      const providedToken = data.tokens?.[order.id] || (validIds.length === 1 ? data.trackingToken : undefined);
      const isAuthorized = Boolean(
        isAdminViewer ||
        verifyTokenHash(providedToken, order.tracking_token_hash) ||
        verifyTokenHash(providedToken, order.cancellation_token_hash)
      );

      if (!isAuthorized) {
        return {
          id: order.id,
          shortCode: order.id.slice(0, 8).toUpperCase(),
          authorized: false,
          status: order.status as OrderStatus,
          payment_review_status: computedReviewStatus,
          payment_verified_at: order.payment_verified_at || null,
          payment_trx_id_masked: null,
          created_at: order.created_at,
          status_changed_at: order.status_changed_at || order.created_at,
          canceled_at: order.canceled_at,
          cancellation_source: null,
          refund_status: order.refund_status || 'not_required',
          refund_proof_path: null,
          refund_reviewed_at: null,
          refund_paid_at: null,
          refund_trx_ref: null,
          refund_admin_note: null,
          payment_method: order.payment_method,
          subtotal: order.total_amount,
          delivery_fee: order.delivery_fee,
          total: Number(order.total_amount) + Number(order.delivery_fee),
          customer_name: 'Customer',
          delivery_address: null,
          rider_name: null,
          rider_phone: null,
          cancel_reason: null,
          items: []
        };
      }

      const maskedTid = order.payment_trx_id
        ? (order.payment_trx_id.length > 4 ? `****${order.payment_trx_id.slice(-4)}` : '****')
        : null;

      return {
        id: order.id,
        shortCode: order.id.slice(0, 8).toUpperCase(),
        authorized: true,
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
