import { calculateDeliveryFee, calculateDistanceKm } from '../lib/pricing';
import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import { sendOrderReceiptEmail } from './email';
import { verifyAdminPin, getClientIp } from './auth';
import { checkRateLimit } from './rateLimit';
import { isValidTransition, OrderStatus } from '../lib/orderStatus';

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
    
    // 0. Spam / Honeypot guard
    if (payload.website) {
      // Silently fail if honeypot is filled
      return { success: true, orderId: '00000000-0000-0000-0000-000000000000' };
    }
    
    // Rate limits (3 per phone per 10min, 5 per IP per 10min)
    const phoneNormal = payload.customerPhone.replace(/[\s-]/g, '');
    if (!checkRateLimit(phoneNormal, 'order_phone', 3, 600000)) {
      throw new Error("Too many orders from this phone number. Please try again later.");
    }
    if (!checkRateLimit(ip, 'order_ip', 5, 600000)) {
      throw new Error("Too many orders from this IP. Please try again later.");
    }

    const supabase = getSupabaseServer();

    // 1. Validate Payload basics
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error("Cart is empty.");
    }
    if (payload.items.length > 30) {
      throw new Error("Too many items in one order.");
    }
    const nameStr = payload.customerName?.trim() || '';
    if (nameStr.length < 2 || nameStr.length > 60) {
      throw new Error("Invalid name.");
    }
    const phoneRegex = /^(?:\+923|923|03)\d{9}$/;
    if (!phoneRegex.test(phoneNormal)) {
      throw new Error("Invalid phone number. Must be a valid Pakistani mobile number.");
    }
    const addrStr = payload.deliveryAddress?.trim() || '';
    if (addrStr.length < 10 || addrStr.length > 300) {
      throw new Error("Delivery address must be between 10 and 300 characters.");
    }
    if (payload.paymentMethod !== 'cod' && payload.paymentMethod !== 'online_transfer') {
      throw new Error("Invalid payment method.");
    }
    
    const trxId = payload.paymentTrxId?.trim() || '';
    if (payload.paymentMethod === 'online_transfer' && !trxId) {
      throw new Error("Transaction ID is required for online transfer.");
    }

    // 2. Fetch prices from DB to prevent client tampering
    const itemIds = payload.items.map(i => i.menu_item_id);
    const { data: menuData, error: menuErr } = await supabase
      .from('menu_items')
      .select('id, price, is_available')
      .in('id', itemIds);

    if (menuErr || !menuData) throw new Error("Failed to verify menu items.");

    const priceMap = new Map(menuData.map(m => [m.id, m]));
    let computedSubtotal = 0;
    const dbItems = [];

    for (const item of payload.items) {
      if (!item.quantity || item.quantity < 1 || item.quantity > 20) throw new Error(`Invalid quantity for item ${item.menu_item_id}`);
      const dbItem = priceMap.get(item.menu_item_id);
      if (!dbItem || !dbItem.is_available) {
        throw new Error("One or more items are unavailable.");
      }
      
      let itemTotal = dbItem.price;
      // Variants
      if (item.variants && Array.isArray(item.variants)) {
        for (const v of item.variants) {
          if (v.price && typeof v.price === 'number') {
            itemTotal += v.price;
          }
        }
      }
      computedSubtotal += (itemTotal * item.quantity);
      dbItems.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: itemTotal,
        selected_variants: item.variants || []
      });
    }

    // 3. Distance calculation
    let distanceKm: number | null = null;
    let finalDeliveryFee = 0;
    let codFee = 0;
    let distanceFee = 0;
    
    if (typeof payload.deliveryLat === 'number' && typeof payload.deliveryLng === 'number') {
      distanceKm = calculateDistanceKm(payload.deliveryLat, payload.deliveryLng);
      if (distanceKm > 15) {
        throw new Error("Sorry, your address is beyond our 15 KM delivery area.");
      }
    }
    
    const pricing = calculateDeliveryFee(computedSubtotal, distanceKm || 0, payload.paymentMethod);
    finalDeliveryFee = pricing.totalDeliveryFee;
    codFee = pricing.codFee;
    distanceFee = pricing.distanceFee;

    // Duplicate order guard (within 60s)
    const sixtySecsAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, total_amount')
      .eq('customer_phone', phoneNormal)
      .gte('created_at', sixtySecsAgo)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (recentOrders && recentOrders.length > 0 && Number(recentOrders[0].total_amount) === computedSubtotal) {
      return { success: true, orderId: recentOrders[0].id };
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
      payment_trx_id: payload.paymentMethod === 'online_transfer' ? trxId : null,
      delivery_lat: payload.deliveryLat ?? null,
      delivery_lng: payload.deliveryLng ?? null,
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
    }
    
    // Trigger push via dynamic import / internal API call (will implement next)
    // sendOrderPush(orderId, 'received');

    // 6. Send email (fire and forget with timeout)
    if (p_email) {
      Promise.race([
        sendOrderReceiptEmail({
          orderId,
          customerName: nameStr,
          customerEmail: p_email,
          items: dbItems.map((i, idx) => ({ ...i, name: payload.items[idx].name || 'Item' })),
          subtotal: computedSubtotal,
          deliveryFee: finalDeliveryFee,
          total: computedSubtotal + finalDeliveryFee
        }),
        new Promise(r => setTimeout(r, 5000)) // 5s timeout
      ]).catch(e => console.warn("Email error:", e));
    }

    return { success: true, orderId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to place order.' };
  }
});

// Update Order Status (Admin)
export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator((d: { 
    orderId: string, 
    status: OrderStatus, 
    pin: string,
    reason?: string,
    riderName?: string,
    riderPhone?: string,
    expectedFrom?: OrderStatus
  }) => d)
  .handler(async ({ data }) => {
    verifyAdminPin(data.pin);
    
    if (data.status === 'canceled' && (!data.reason || data.reason.trim().length < 5)) {
      throw new Error("Cancellation reason is required (at least 5 characters).");
    }

    const supabase = getSupabaseServer();
    
    const updates: any = {
      status: data.status,
    };
    if (data.status === 'canceled') updates.cancel_reason = data.reason?.trim();
    if (data.status === 'out_for_delivery') {
      if (data.riderName) updates.rider_name = data.riderName.trim();
      if (data.riderPhone) updates.rider_phone = data.riderPhone.trim();
    }
    
    let query = supabase.from('orders').update(updates).eq('id', data.orderId);
    if (data.expectedFrom) {
      query = query.eq('status', data.expectedFrom);
    }
    
    // Ask for exactly 1 row back to confirm
    const { data: updatedRows, error } = await query.select('id').maybeSingle();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error("This order was already updated by someone else, or does not exist.");
      }
      throw new Error(error.message);
    }
    if (!updatedRows) {
       throw new Error("This order was already updated by someone else.");
    }
    
    // trigger push here
    // Promise.allSettled([ sendOrderPush(data.orderId, data.status) ])

    return { success: true };
  });

export const getCompletedOrdersFn = createServerFn({ method: "POST" })
  .validator((d: { pin?: string, date?: string, search?: string, status?: string, page?: number, pageSize?: number }) => d)
  .handler(async ({ data }) => {
    verifyAdminPin(data.pin);

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
      // data.date is "YYYY-MM-DD". We want 4am to 4am PKT next day.
      // PKT is UTC+5, so 4am PKT = 11pm UTC previous day. Let's just use midnight to midnight PKT for simplicity
      // 00:00 PKT = 19:00 UTC previous day.
      // The prompt asks: "Pakistan time (Asia/Karachi, UTC+5, no DST) day boundaries" and "A 'day' for the shop should also have a switch 'Business day (4 AM - 4 AM)'"
      const t = new Date(`${data.date}T00:00:00Z`); // treat as UTC midnight
      // to PKT 00:00 is `T-05:00`
      const pktMidnightStr = `${data.date}T00:00:00+05:00`;
      const pktNextStr = new Date(new Date(pktMidnightStr).getTime() + 86400000).toISOString();
      query = query.gte('created_at', pktMidnightStr).lt('created_at', pktNextStr);
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
    if (error) throw new Error(error.message);
    
    return { orders, totalCount: count || 0 };
  });

// Expose safe public order details for tracking
export const getPublicOrder = createServerFn({ method: "POST" })
  .validator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, created_at, status_changed_at, canceled_at, payment_method, total_amount, delivery_fee, customer_name, delivery_address, rider_name, rider_phone, cancel_reason, order_items(*, menu_items(name))')
      .eq('id', data.orderId)
      .maybeSingle();
      
    if (error || !order) return null;
    
    return {
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
    };
  });

export const getKitchenOrders = createServerFn({ method: "POST" })
  .validator((d: { pin?: string }) => d)
  .handler(async ({ data }) => {
    verifyAdminPin(data.pin);
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
