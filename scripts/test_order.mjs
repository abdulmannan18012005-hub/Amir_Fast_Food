import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

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
  console.log("Placing test COD order via API...");
  
  const payload = {
    customerName: 'TEST ORDER - IGNORE',
    customerPhone: '03014265785',
    customerEmail: '',
    deliveryAddress: 'Test Address Lahore',
    paymentMethod: 'cod',
    items: [
      {
        menu_item_id: '1', // Ultimate Crispy Zinger (550 PKR)
        quantity: 1,
        price: 550,
        variants: []
      }
    ],
    subtotal: 550
  };

  // We are calling the built server API directly:
  const res = await fetch('http://localhost:3000/_server', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      serverFnId: 'createOrder',
      serverFnName: 'createOrder',
      payload: { data: payload }
    })
  });
  
  const text = await res.text();
  console.log("API Response:", text);
  
  let orderId = '';
  try {
    const data = JSON.parse(text);
    orderId = data.orderId;
  } catch (e) {
    console.error("Failed to parse order ID");
    return;
  }
  
  if (!orderId || orderId === '00000000-0000-0000-0000-000000000000') {
    console.error("Got nil UUID or empty");
    return;
  }

  console.log(`Checking DB for order ${orderId}...`);
  const { data: items, error } = await supabase
    .from('order_items')
    .select('unit_price, selected_variants')
    .eq('order_id', orderId);
    
  if (error) console.error("DB Error:", error);
  console.log("DB Order Items:", JSON.stringify(items, null, 2));
}

run();
