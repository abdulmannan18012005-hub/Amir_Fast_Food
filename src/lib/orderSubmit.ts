import { createOrder } from '../server/order';
import { playSuccessChime } from './sound';
import { clearCart, getCartSubtotal } from './cart';
import { clearDraft, getOrCreateDraftIdempotencyKey, rotateDraftIdempotencyKey, OrderDraft } from './orderDraft';
import { addActiveOrder, markJustOrdered } from './activeOrders';
import { validateName, validatePhone, validateAddress, validateTid } from './orderValidation';
import { friendlyMessage, ErrorCode } from './errors';
import type { CartItem } from '../types';

export interface SubmitOrderResult {
  success: boolean;
  orderId?: string;
  cancellationToken?: string;
  trackingToken?: string;
  paymentMethod?: 'cod' | 'online_transfer';
  code?: ErrorCode;
  error?: string;
  currentSubtotal?: number;
}

export async function submitOrder(
  draft: OrderDraft,
  cart: CartItem[],
  options?: { expectedSubtotal?: number }
): Promise<SubmitOrderResult> {
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
  const expectedSubtotal = options?.expectedSubtotal ?? subtotal;

  // Persist and reuse client-side idempotency key across retries / double-clicks
  const idempotencyKey = draft.idempotencyKey || getOrCreateDraftIdempotencyKey();

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
        idempotencyKey,
        expectedSubtotal,
        items: cart,
        subtotal
      }
    });

    if (!res.success) {
      const code = ((res as any).code || 'validation') as ErrorCode;
      if (code === 'idempotency_conflict') {
        rotateDraftIdempotencyKey();
      }
      return {
        success: false,
        paymentMethod: draft.payment.method,
        code,
        currentSubtotal: (res as any).currentSubtotal,
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
        addActiveOrder(newOrderId, res.cancellationToken, (res as any).trackingToken);
        markJustOrdered(newOrderId);
      }
      window.dispatchEvent(new Event('cartUpdated'));
      window.dispatchEvent(new Event('orderPlaced'));
      if (newOrderId) {
        window.dispatchEvent(new CustomEvent('orderCompleted', { detail: { orderId: newOrderId } }));
      }
    }

    return {
      success: true,
      orderId: newOrderId,
      cancellationToken: res.cancellationToken,
      trackingToken: (res as any).trackingToken,
      paymentMethod: draft.payment.method
    };
  } catch (err: any) {
    return {
      success: false,
      code: err?.code || 'validation',
      error: friendlyMessage(err)
    };
  }
}
