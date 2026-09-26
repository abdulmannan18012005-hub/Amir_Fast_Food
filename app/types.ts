export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: 'customer' | 'kitchen_staff' | 'admin';
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: 'signup_grant' | 'order_payment' | 'refund' | 'topup';
  description: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface ItemVariant {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  sub_category: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string;
  is_available: boolean;
  variants: ItemVariant[];
  created_at: string;
}

export type OrderStatus = 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'canceled';

export interface Order {
  id: string;
  user_id: string | null;
  total_amount: number;
  delivery_fee: number;
  payment_method: 'wallet' | 'cod' | 'online_transfer';
  status: OrderStatus;
  delivery_address: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  selected_variants: ItemVariant[];
}

export interface CartItem {
  menu_item_id: string;
  quantity: number;
  price: number;
  variants: ItemVariant[];
}
