# Amir Fast Food
A real-time, serverless food ordering application for Amir Fast Food in Lahore, Pakistan.

## Tech Stack
- **Framework**: React 19 + TanStack Start (SSR + Server Functions)
- **Styling**: Tailwind CSS v3
- **Database**: Supabase (PostgreSQL) + Realtime
- **Hosting**: Vercel (Edge/Node Serverless)
- **Maps**: Nominatim OpenStreetMap (Reverse & Forward Geocoding)
- **Push**: Web Push API with VAPID
- **AI**: OpenAI / Groq (AmirBot)

## Features
- **Client App**: PWA, Offline support, Geofenced delivery calculation, Push notifications for order status, Real-time tracking polling.
- **Admin App**: PIN-gated (`/admin/*`), Live kitchen board (auto-refreshes every 5s), Menu editor with availability toggles, Order history with PKT day bounds.

## Limitations
- No true virtual wallet (payment is COD or generic Online Transfer via TID).
- No CSV export or multi-branch features.
- No image upload (images are linked via URL in the menu editor).

## Development
```bash
npm install
npm run dev
```

## Database Requirements
The backend relies on Supabase PostgreSQL with strict Row Level Security (RLS):

- **Private Tables (RLS enabled, zero anon/authenticated policies; service role only):**
  - `orders`: `id`, `user_id`, `total_amount`, `delivery_fee`, `payment_method`, `payment_trx_id`, `payment_verified_at`, `status`, `delivery_address`, `customer_name`, `customer_phone`, `customer_email`, `cancel_reason`, `created_at`, `status_changed_at`.
  - `order_items`: `id`, `order_id`, `menu_item_id`, `quantity`, `unit_price`, `selected_variants`.
  - `push_subscriptions`: `id`, `order_id`, `role`, `endpoint`, `p256dh`, `auth`, `user_agent`, `created_at`.
  - `restaurant_knowledge`: `id`, `title`, `content`, `embedding`.
  - `rate_limits`: `key`, `count`, `window_start`.
  - `app_settings`: `key`, `value`, `updated_at`.

- **Publicly Readable Tables (RLS enabled, SELECT policy for anon/authenticated, write-blocked):**
  - `menu_items`: `id`, `category_id`, `sub_category`, `name`, `description`, `price`, `image_url`, `is_available`, `variants`.
  - `categories`: `id`, `name`, `slug`, `sort_order`.

- **Protected Database Functions (REVOKE EXECUTE from public, anon, authenticated):**
  - `process_order` (atomic checkout processor; executed by service role only).
  - `rate_limit_hit` (distributed sliding-window rate limiter; executed by service role only).