import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import { sendOrderReceiptEmail } from './email';

export interface CreateOrderPayload {
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  paymentMethod: 'cod' | 'online_transfer';
  items: {
    menu_item_id: string;
    quantity: number;
    price: number;
    variants: any[];
    name?: string;
  }[];
  subtotal: number;
}

export const createOrder = createServerFn("POST", async (payload: CreateOrderPayload): Promise<{ success: boolean; orderId?: string; error?: string }> => {
  try {
    const supabase = getSupabaseServer();
    
    // Delivery fee rule:
    const deliveryFee = payload.paymentMethod === 'cod' && payload.subtotal < 100 ? 100 : 0;
    
    // Default system user if no userId provided (for guests)
    const userId = payload.userId || null;
    
    // Strip name from items for the database RPC, but keep it for email
    const dbItems = payload.items.map(item => ({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      price: item.price,
      variants: item.variants
    }));

    const { data: orderId, error } = await supabase.rpc('process_order', {
      p_user_id: userId,
      p_total: payload.subtotal,
      p_delivery_fee: deliveryFee,
      p_payment_method: payload.paymentMethod,
      p_name: payload.customerName,
      p_phone: payload.customerPhone,
      p_email: payload.customerEmail,
      p_address: payload.deliveryAddress,
      p_items: dbItems
    });

    if (error) {
      console.error('RPC Error processing order:', error);
      return { success: false, error: error.message };
    }

    // Post-Order Triggers
    
    // 1. Send Email Receipt
    const mockOrderDetails = {
      id: orderId,
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
      customer_email: payload.customerEmail,
      delivery_address: payload.deliveryAddress,
      payment_method: payload.paymentMethod,
      total_amount: payload.subtotal + deliveryFee,
      delivery_fee: deliveryFee,
    } as any;
    
    const emailItems = payload.items.map(i => ({
      ...i,
      unit_price: i.price,
      selected_variants: i.variants,
      name: i.name || 'Menu Item'
    })) as any[];
    
    // Fire and forget (don't await so we don't block the client response)
    sendOrderReceiptEmail(mockOrderDetails, emailItems).catch(err => {
      console.error('Failed to send receipt email:', err);
    });
    
    // 2. WhatsApp Trigger (Placeholder)
    console.log(`[WHATSAPP WEBHOOK] Dispatched order #${orderId} for ${payload.customerPhone}. Track: /orders/${orderId}`);

    return { success: true, orderId };
  } catch (err: any) {
    console.error('Server error creating order:', err);
    return { success: false, error: err.message || 'Unknown error occurred.' };
  }
});

export const updateOrderStatus = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { orderId: string, status: string } }) => {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from('orders').update({ status: data.status }).eq('id', data.orderId);
  if (error) throw new Error(error.message);
  return { success: true };
});

