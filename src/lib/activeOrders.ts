import { getLocal, setLocal, getRawSession, setRawSession, removeSession } from './storage';

export interface ActiveOrder {
  id: string;
  placedAt: number;
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

export function addActiveOrder(id: string) {
  const current = getActiveOrders().filter(o => o.id !== id);
  const updated = [{ id, placedAt: Date.now() }, ...current].slice(0, 3);
  setLocal('active_orders', updated);
  window.dispatchEvent(new Event('storage'));
}

export function removeActiveOrder(id: string): ActiveOrder[] {
  const current = getActiveOrders().filter(o => o.id !== id);
  setLocal('active_orders', current);
  try {
    localStorage.removeItem(`order_cache_${id}`);
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
