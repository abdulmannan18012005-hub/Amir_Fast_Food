import { createOrder } from '../server/order';
import { playSuccessChime } from './sound';
import { clearCart, getCartSubtotal } from './cart';
import { clearDraft, OrderDraft } from './orderDraft';
import { addActiveOrder, markJustOrdered } from './activeOrders';
import { validateName, validatePhone, validateAddress, validateTid, normalizeTid } from './orderValidation';
import { friendlyMessage, ErrorCode } from './errors';
import type { CartItem } from '../types';

export interface SubmitOrderResult {
  success: boolean;
  orderId?: string;
  code?: ErrorCode;
  error?: string;
}

export async function submitOrder(draft: OrderDraft, cart: CartItem[]): Promise<SubmitOrderResult> {
  if (!cart || cart.length === 0) {
    return { success: false, code: 'validation', error: 'Your cart is empty.' };
  }

  const nameVal = validateName(draft.contact.name);
  if (!nameVal.valid) {
    return { success: false, code: 'validation', error: nameVal.error };
  }

  const phoneVal = validatePhone(draft.contact.phone);
  if (!phoneVal.valid) {
    return { success: false, code: 'validation', error: phoneVal.error };
  }

  const addrVal = validateAddress(draft.delivery.address);
  if (!addrVal.valid) {
    return { success: false, code: 'validation', error: addrVal.error };
  }

  if (!draft.payment.method) {
    return { success: false, code: 'validation', error: 'Please select a payment method.' };
  }

  let finalTid = '';
  if (draft.payment.method === 'online_transfer') {
    const tidVal = validateTid(draft.payment.trxId);
    if (!tidVal.valid) {
      return { success: false, code: 'validation', error: tidVal.error };
    }
    finalTid = tidVal.normalized;
  }

  // Honeypot field guard
  const honeypot = (typeof document !== 'undefined'
    ? (document.getElementById('website_honeypot') as HTMLInputElement)?.value
    : '') || '';

  const subtotal = getCartSubtotal(cart);

  try {
    const res = await createOrder({
      data: {
        website: honeypot,
        customerName: nameVal.normalized,
        customerPhone: phoneVal.normalized,
        customerEmail: draft.contact.email.trim(),
        deliveryAddress: addrVal.normalized,
        deliveryLat: draft.delivery.lat,
        deliveryLng: draft.delivery.lng,
        paymentMethod: draft.payment.method,
        paymentTrxId: finalTid,
        items: cart,
        subtotal
      }
    });

    if (!res.success) {
      const code = (res as any).code || 'validation';
      return {
        success: false,
        code,
        error: friendlyMessage(res.error)
      };
    }

    const NIL_UUID = '00000000-0000-0000-0000-000000000000';
    const newOrderId = res.orderId && res.orderId !== NIL_UUID ? res.orderId : '';

    if (typeof window !== 'undefined') {
      playSuccessChime();
      clearCart();
      clearDraft();
      try {
        localStorage.setItem(
          'user_profile',
          JSON.stringify({
            name: nameVal.normalized,
            phone: phoneVal.normalized,
            email: draft.contact.email.trim(),
            address: addrVal.normalized,
          })
        );
      } catch {}

      if (newOrderId) {
        addActiveOrder(newOrderId);
        markJustOrdered(newOrderId);
      }
      window.dispatchEvent(new Event('cartUpdated'));
      window.dispatchEvent(new Event('orderPlaced'));
    }

    return {
      success: true,
      orderId: newOrderId
    };
  } catch (err: any) {
    return {
      success: false,
      code: err?.code || 'validation',
      error: friendlyMessage(err)
    };
  }
}
