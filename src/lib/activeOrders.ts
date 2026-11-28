import { getLocal, setLocal, getRawSession, setRawSession, removeSession } from './storage';

export interface ActiveOrder {
  id: string;
  placedAt: number;
  cancellationToken?: string;
  trackingToken?: string;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function getActiveOrders(): ActiveOrder[] {
  const all = getLocal<ActiveOrder[]>('active_orders', []);
  const now = Date.now();
  const valid = all.filter(o => o.placedAt && (now - o.placedAt < SIX_HOURS));
  if (valid.length !== all.length) {
    setLocal('active_orders', valid);
  }
  return valid;
}

export function addActiveOrder(id: string, cancellationToken?: string, trackingToken?: string) {
  const existing = getActiveOrders().find(o => o.id === id);
  const resolvedCancelToken = cancellationToken || existing?.cancellationToken;
  const resolvedTrackingToken = trackingToken || existing?.trackingToken;
  const current = getActiveOrders().filter(o => o.id !== id);
  const updated = [{
    id,
    placedAt: Date.now(),
    cancellationToken: resolvedCancelToken,
    trackingToken: resolvedTrackingToken,
  }, ...current].slice(0, 5);
  setLocal('active_orders', updated);
  if (resolvedCancelToken) {
    try {
      localStorage.setItem(`order_cancel_tok_${id}`, resolvedCancelToken);
    } catch {}
  }
  if (resolvedTrackingToken) {
    try {
      localStorage.setItem(`order_track_tok_${id}`, resolvedTrackingToken);
    } catch {}
  }
  window.dispatchEvent(new Event('storage'));
}

export function getCancellationToken(id: string): string | null {
  try {
    const direct = localStorage.getItem(`order_cancel_tok_${id}`);
    if (direct) return direct;
  } catch {}
  const all = getActiveOrders();
  const found = all.find(o => o.id === id);
  return found?.cancellationToken || null;
}

export function getTrackingToken(id: string): string | null {
  try {
    const direct = localStorage.getItem(`order_track_tok_${id}`);
    if (direct) return direct;
  } catch {}
  const all = getActiveOrders();
  const found = all.find(o => o.id === id);
  return found?.trackingToken || null;
}

export function getTrackingTokensMap(ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ids) {
    const tok = getTrackingToken(id);
    if (tok) out[id] = tok;
  }
  return out;
}

export function removeActiveOrder(id: string): ActiveOrder[] {
  const current = getActiveOrders().filter(o => o.id !== id);
  setLocal('active_orders', current);
  try {
    localStorage.removeItem(`order_cache_${id}`);
    localStorage.removeItem(`order_cancel_tok_${id}`);
    localStorage.removeItem(`order_track_tok_${id}`);
  } catch (e) {}
  window.dispatchEvent(new Event('storage'));
  return current;
}

export function markJustOrdered(id: string) {
  setRawSession('just_ordered', id);
}

export function consumeJustOrdered(): string | null {
  const id = getRawSession('just_ordered');
  if (id) {
    removeSession('just_ordered');
  }
  return id;
}
