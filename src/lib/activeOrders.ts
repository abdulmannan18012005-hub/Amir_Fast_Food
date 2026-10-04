import { getLocal, setLocal, getRawSession, setRawSession, removeSession } from './storage';

export interface ActiveOrder {
  id: string;
  placedAt: number;
}

export function getActiveOrders(): ActiveOrder[] {
  return getLocal<ActiveOrder[]>('active_orders', []);
}

export function addActiveOrder(id: string) {
  const current = getActiveOrders().filter(o => o.id !== id);
  const updated = [{ id, placedAt: Date.now() }, ...current].slice(0, 3);
  setLocal('active_orders', updated);
}

export function removeActiveOrder(id: string) {
  const updated = getActiveOrders().filter(o => o.id !== id);
  setLocal('active_orders', updated);
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
