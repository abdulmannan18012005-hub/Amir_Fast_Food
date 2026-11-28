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
  image_url?: string;
}

export interface HighlightItem {
  id: string;
  title: string;
  description: string;
  offer_badge?: string;
  image_url: string;
  is_available: boolean;
  sort_order: number;
  created_at: string;
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
  original_price?: number | null;
  sort_order?: number;
  image_url: string;
  is_available: boolean;
  variants: ItemVariant[];
  created_at: string;
}

export type OrderStatus = 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'canceled';
export type RefundStatus = 'not_required' | 'pending_review' | 'approved' | 'paid' | 'rejected';
export type CancellationSource = 'customer' | 'admin' | 'system';

export interface Order {
  id: string;
  user_id: string | null;
  total_amount: number;
  delivery_fee: number;
  payment_method: 'wallet' | 'cod' | 'online_transfer';
  payment_trx_id?: string | null;
  payment_verified_at?: string | null;
  payment_review_status?: 'not_required' | 'pending' | 'approved' | 'rejected' | null;
  status: OrderStatus;
  delivery_address: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  created_at: string;
  cancel_reason?: string | null;
  canceled_at?: string | null;
  cancellation_source?: CancellationSource | null;
  cancellation_token_hash?: string | null;
  refund_status?: RefundStatus | null;
  refund_proof_path?: string | null;
  refund_reviewed_at?: string | null;
  refund_paid_at?: string | null;
  refund_trx_ref?: string | null;
  refund_admin_note?: string | null;
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
  name: string;
  image_url: string;
  quantity: number;
  price: number;
  original_price?: number | null;
  variants: ItemVariant[];
}
