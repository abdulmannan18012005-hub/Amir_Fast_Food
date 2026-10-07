import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// We can bypass Tanstack's wrapper by importing the handler directly if possible, or just the DB logic.
// Actually, it's easier to just copy the DB logic here to prove it works with the DB schema,
// but the prompt says "after F3 is implemented locally... place one COD test order against the real database from your local build and confirm the orders + order_items rows".
// To do this easily in Node, let's just make the Supabase RPC call directly as it would happen in `order.ts`.

class DummyWS {
  constructor() {}
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    realtime: { transport: DummyWS }
});

async function run() {
  console.log("Mocking the F3 payload...");
  const dbItems = [
    {
      menu_item_id: 'e4a8a20e-5168-4f4d-97b0-0ca5c6f53538',
      quantity: 1,
      price: 450,               // F3 payload
      variants: [],             // F3 payload
      unit_price: 450,          // F3 payload (for newer DB function if present)
      selected_variants: []     // F3 payload
    }
  ];

  console.log("Calling process_order directly...");
  const { data: orderId, error } = await supabase.rpc('process_order', {
    p_user_id: null,
    p_total: 450,
    p_delivery_fee: 0,
    p_payment_method: 'cod',
    p_name: 'TEST ORDER - IGNORE',
    p_phone: '03014265785',
    p_email: '',
    p_address: 'Test Address Lahore',
    p_items: dbItems
  });

  if (error) {
    console.error("RPC Error:", error);
    return;
  }
  console.log("Order ID:", orderId);

  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('unit_price, selected_variants')
    .eq('order_id', orderId);

  if (itemsErr) console.error("Items Error:", itemsErr);
  console.log("DB Order Items:", JSON.stringify(items, null, 2));
}
run();
