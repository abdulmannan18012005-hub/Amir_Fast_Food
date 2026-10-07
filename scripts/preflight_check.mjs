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

async function check() {
  console.log("--- PREFLIGHT DB CHECK ---");
  
  // 1. Check orders columns
  const expectedOrderCols = [
    'cancel_reason', 'canceled_at', 'rider_name', 'rider_phone', 
    'status_changed_at', 'updated_at', 'payment_trx_id', 
    'delivery_lat', 'delivery_lng', 'distance_km', 'distance_fee', 'cod_fee'
  ];
  
  const { data: orderData, error: orderErr } = await supabase
    .from('orders')
    .select(expectedOrderCols.join(','))
    .limit(1);
    
  if (orderErr) {
    console.log(`❌ Orders columns missing: ${orderErr.message}`);
  } else {
    console.log(`✅ Orders table has all required columns.`);
  }

  // 2. Check push_subscriptions
  const expectedPushCols = ['order_id', 'role', 'endpoint', 'p256dh', 'auth', 'user_agent'];
  const { data: pushData, error: pushErr } = await supabase
    .from('push_subscriptions')
    .select(expectedPushCols.join(','))
    .limit(1);
    
  if (pushErr) {
    console.log(`❌ push_subscriptions table/columns missing: ${pushErr.message}`);
  } else {
    console.log(`✅ push_subscriptions table has all required columns.`);
  }
}

check();
