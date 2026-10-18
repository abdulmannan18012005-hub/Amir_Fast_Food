import { useSyncExternalStore } from 'react';
import { safeJson } from './storage';

export interface OrderDraftContact {
  name: string;
  phone: string;
  email: string;
}

export interface OrderDraftDelivery {
  address: string;
  lat: number | null;
  lng: number | null;
  source: 'gps' | 'typed' | null;
}

export interface OrderDraftPayment {
  method: 'cod' | 'online_transfer' | null;
  chosen: boolean;
  trxId: string;
}

export interface OrderDraft {
  v: 1;
  updatedAt: number;
  step: number; // 1 to 7
  contact: OrderDraftContact;
  delivery: OrderDraftDelivery;
  payment: OrderDraftPayment;
}

const STORAGE_KEY = 'order_draft';
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getDefaultDraft(): OrderDraft {
  const profile = safeJson<Record<string, string>>('user_profile', {});
  return {
    v: 1,
    updatedAt: Date.now(),
    step: 1,
    contact: {
      name: profile.name || '',
      phone: profile.phone || '',
      email: profile.email || '',
    },
    delivery: {
      address: profile.address || '',
      lat: null,
      lng: null,
      source: null,
    },
    payment: {
      method: null,
      chosen: false,
      trxId: '',
    },
  };
}

export function getDraft(): OrderDraft {
  if (typeof window === 'undefined') return getDefaultDraft();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultDraft();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1 || !parsed.updatedAt) {
      return getDefaultDraft();
    }
    // Check 24-hour expiration
    if (Date.now() - parsed.updatedAt > DRAFT_EXPIRY_MS) {
      clearDraft();
      return getDefaultDraft();
    }
    return {
      v: 1,
      updatedAt: parsed.updatedAt,
      step: typeof parsed.step === 'number' ? parsed.step : 1,
      contact: {
        name: parsed.contact?.name || '',
        phone: parsed.contact?.phone || '',
        email: parsed.contact?.email || '',
      },
      delivery: {
        address: parsed.delivery?.address || '',
        lat: typeof parsed.delivery?.lat === 'number' ? parsed.delivery.lat : null,
        lng: typeof parsed.delivery?.lng === 'number' ? parsed.delivery.lng : null,
        source: parsed.delivery?.source || null,
      },
      payment: {
        method: parsed.payment?.method || null,
        chosen: !!parsed.payment?.chosen,
        trxId: parsed.payment?.trxId || '',
      },
    };
  } catch {
    return getDefaultDraft();
  }
}

export function updateDraft(patch: Partial<{
  step: number;
  contact: Partial<OrderDraftContact>;
  delivery: Partial<OrderDraftDelivery>;
  payment: Partial<OrderDraftPayment>;
}>): OrderDraft {
  if (typeof window === 'undefined') return getDefaultDraft();
  const current = getDraft();
  const next: OrderDraft = {
    v: 1,
    updatedAt: Date.now(),
    step: patch.step !== undefined ? patch.step : current.step,
    contact: {
      ...current.contact,
      ...(patch.contact || {}),
    },
    delivery: {
      ...current.delivery,
      ...(patch.delivery || {}),
    },
    payment: {
      ...current.payment,
      ...(patch.payment || {}),
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('orderDraftUpdated'));
  } catch (e) {
    console.warn('Failed to save order draft to localStorage:', e);
  }

  return next;
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('orderDraftUpdated'));
  } catch (e) {
    console.warn('Failed to clear order draft:', e);
  }
}

// React Hook with useSyncExternalStore
function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('orderDraftUpdated', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('orderDraftUpdated', callback);
    window.removeEventListener('storage', callback);
  };
}

export function useOrderDraft(): [OrderDraft, (patch: Parameters<typeof updateDraft>[0]) => OrderDraft, () => void] {
  const draft = useSyncExternalStore(subscribe, getDraft, getDefaultDraft);
  return [draft, updateDraft, clearDraft];
}
