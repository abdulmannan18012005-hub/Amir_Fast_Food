export type OrderStatus = 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'canceled';

export const ORDER_STATUSES: OrderStatus[] = ['received', 'preparing', 'out_for_delivery', 'delivered', 'canceled'];

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; emoji: string; customerText: string; isFinal: boolean }> = {
  received: {
    label: 'Received',
    emoji: '📝',
    customerText: 'We have received your order.',
    isFinal: false,
  },
  preparing: {
    label: 'Preparing',
    emoji: '👨‍🍳',
    customerText: 'Your food is being prepared.',
    isFinal: false,
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    emoji: '🛵',
    customerText: 'Rider is on the way!',
    isFinal: false,
  },
  delivered: {
    label: 'Delivered',
    emoji: '🎉',
    customerText: 'Delivered — enjoy!',
    isFinal: true,
  },
  canceled: {
    label: 'Canceled',
    emoji: '❌',
    customerText: 'Order was canceled.',
    isFinal: true,
  }
};

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ['preparing', 'out_for_delivery', 'canceled'],
  preparing: ['out_for_delivery', 'canceled'],
  out_for_delivery: ['delivered', 'canceled'],
  delivered: [],
  canceled: []
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
