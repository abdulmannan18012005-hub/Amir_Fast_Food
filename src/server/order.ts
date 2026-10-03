import { calculateDeliveryFee, calculateDistanceKm } from '../lib/pricing';
import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import { sendOrderReceiptEmail } from './email';
import { verifyAdminPin } from './auth';

export interface CreateOrderPayload {
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  paymentMethod: 'cod' | 'online_transfer';
  paymentTrxId?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  distanceKm?: number;
  items: {
    menu_item_id: string;
    quantity: number;
    price: number; // Ignored on server
    variants: { name: string; price: number }[];
    name?: string;
  }[];
  subtotal: number; // Ignored on server
}

export const createOrder = createServerFn({ method: "POST" })
  .validator((d: CreateOrderPayload) => d)
  .handler(async ({ data: payload }): Promise<{ success: boolean; orderId?: string; error?: string }> => {
  try {
    const supabase = getSupabaseServer();

    // 1. Validate Payload basics
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error("Cart is empty");
    }
    if (payload.items.length > 30) {
      throw new Error("Too many items in one order");
    }
    if (!payload.customerName || payload.customerName.length < 2) {
      throw new Error("Invalid name");
    }
    if (!payload.customerPhone || payload.customerPhone.length < 10) {
      throw new Error("Invalid phone number");
    }
    if (!payload.deliveryAddress || payload.deliveryAddress.length < 10) {
      throw new Error("Delivery address is too short");
    }
    if (payload.paymentMethod === 'online_transfer' && (!payload.paymentTrxId || payload.paymentTrxId.trim() === '')) {
      throw new Error("Transaction ID is required for online transfer");
    }

    // 2. Fetch prices from DB and validate items
    const itemIds = payload.items.map(i => i.menu_item_id);
    const { data: menuItems, error: menuErr } = await supabase
      .from('menu_items')
      .select('id, name, price, is_available, variants')
      .in('id', itemIds);

    if (menuErr) throw new Error(menuErr.message);
    if (!menuItems || menuItems.length === 0) throw new Error("Items not found in menu");

    let computedSubtotal = 0;
    const dbItems = [];
    const emailItems = [];

    for (const clientItem of payload.items) {
      if (clientItem.quantity < 1 || clientItem.quantity > 20) {
        throw new Error("Invalid quantity");
      }
      const dbItem = menuItems.find(m => m.id === clientItem.menu_item_id);
      if (!dbItem) {
        throw new Error(`Item ${clientItem.name || 'Unknown'} not found`);
      }
      if (!dbItem.is_available) {
        throw new Error(`Item ${dbItem.name} is currently unavailable`);
      }

      // Base price
      let unitPrice = Number(dbItem.price) || 0;
      let selectedVariants = [];

      // Validate variants and add their prices
      if (clientItem.variants && Array.isArray(clientItem.variants)) {
        const dbVariants = Array.isArray(dbItem.variants) ? dbItem.variants : [];
        for (const cv of clientItem.variants) {
          const matchedVariant = dbVariants.find((dv: any) => dv.name === cv.name);
          if (matchedVariant) {
            unitPrice += Number(matchedVariant.price) || 0;
            selectedVariants.push({ name: matchedVariant.name, price: Number(matchedVariant.price) });
          }
        }
      }

      computedSubtotal += unitPrice * clientItem.quantity;
      
      dbItems.push({
        menu_item_id: dbItem.id,
        quantity: clientItem.quantity,
        price: unitPrice,
        variants: selectedVariants
      });

      emailItems.push({
        name: dbItem.name,
        quantity: clientItem.quantity,
        unit_price: unitPrice,
        selected_variants: selectedVariants
      });
    }

    // 3. Delivery logic & Pricing rules
        const pricing = calculateDeliveryFee(computedSubtotal, payload.distanceKm || 0, payload.paymentMethod);
    const finalDeliveryFee = pricing.totalDeliveryFee;
    
    const userId = payload.userId || null;

    // 4. Call RPC (which creates the order and order_items)
    const { data: orderId, error } = await supabase.rpc('process_order', {
      p_user_id: userId,
      p_total: computedSubtotal,
      p_delivery_fee: finalDeliveryFee,
      p_payment_method: payload.paymentMethod,
      p_name: payload.customerName,
      p_phone: payload.customerPhone,
      p_email: payload.customerEmail || null,
      p_address: payload.deliveryAddress,
      p_items: dbItems
    });

    if (error) {
      console.error('RPC Error processing order:', error);
      return { success: false, error: error.message };
    }

    // 5. Update extra fields (payment_trx_id) missing from RPC
    if (payload.paymentTrxId) {
      await supabase.from('orders').update({
        // We assume payment_trx_id exists in the database. If it doesn't, this will fail safely or we ignore error
      } as any).eq('id', orderId).catch(() => {});
      // We will create a migration to add these columns.
      await supabase.from('orders').update({
        payment_trx_id: payload.paymentTrxId,
      }).eq('id', orderId);
    }

    // 6. Send Email Receipt
    const mockOrderDetails = {
      id: orderId,
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
      customer_email: payload.customerEmail,
      delivery_address: payload.deliveryAddress,
      payment_method: payload.paymentMethod,
      total_amount: computedSubtotal + finalDeliveryFee,
      delivery_fee: finalDeliveryFee,
    };
    
    if (payload.customerEmail) {
      sendOrderReceiptEmail(mockOrderDetails, emailItems).catch(err => {
        console.error('Failed to send receipt email:', err);
      });
    }

    return { success: true, orderId };
  } catch (err: any) {
    console.error('Server error creating order:', err);
    return { success: false, error: err.message || 'Unknown error occurred.' };
  }
});

// We need server side PIN validation for admin functions
export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator((d: { orderId: string, status: string, pin?: string }) => d)
  .handler(async ({ data }) => {
    // Basic PIN check
    verifyAdminPin(data.pin);

    const supabase = getSupabaseServer();
    const { error } = await supabase.from('orders').update({ status: data.status }).eq('id', data.orderId);
    if (error) throw new Error(error.message);
    return { success: true };
});


// Public function to fetch a single order safely without exposing other users' data
export const getPublicOrder = createServerFn({ method: "GET" })
  .validator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServer();
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, created_at, payment_method, rider_name, rider_phone, total_amount, delivery_fee')
      .eq('id', data.orderId)
      .maybeSingle();
      
    if (error || !order) return null;
    
    // Also fetch items safely
    const { data: items } = await supabase
      .from('order_items')
      .select('menu_item_id, quantity, unit_price, selected_variants')
      .eq('order_id', order.id);
      
    return { ...order, items: items || [] };
  });

// Protected function for KDS to fetch all active orders
export const getKitchenOrders = createServerFn({ method: "GET" })
  .validator((d: { pin?: string }) => d)
  .handler(async ({ data }) => {
    verifyAdminPin(data.pin);

    const supabase = getSupabaseServer();
    // Fetch received, preparing, and out_for_delivery
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .in('status', ['received', 'preparing', 'out_for_delivery'])
      .order('created_at', { ascending: true });
      
    if (error) throw new Error(error.message);
    return orders || [];
  });


export const getCompletedOrdersFn = createServerFn({ method: "POST" })
  .validator((d: { pin?: string, date?: string, search?: string }) => d)
  .handler(async ({ data }) => {
    verifyAdminPin(data.pin);

    const supabase = getSupabaseServer();
    let query = supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .in('status', ['delivered', 'canceled'])
      .order('created_at', { ascending: false });

    if (data.date) {
      // Filter by a specific day (YYYY-MM-DD)
      const startOfDay = new Date(data.date + 'T00:00:00.000Z');
      const endOfDay = new Date(data.date + 'T23:59:59.999Z');
      query = query.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
    } else {
      // Default to last 50 limit if no date
      query = query.limit(50);
    }

    if (data.search) {
      // Search by ID or name
      const searchStr = data.search.trim();
      query = query.or(`id.ilike.%${searchStr}%,customer_name.ilike.%${searchStr}%`);
    }

    const { data: orders, error } = await query;
    if (error) throw new Error(error.message);
    return orders;
  });
