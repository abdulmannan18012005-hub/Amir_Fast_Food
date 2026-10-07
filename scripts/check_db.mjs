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
  console.log("Checking DB schema...");
  
  // check push_subscriptions
  const { data: ps, error: psErr } = await supabase.from('push_subscriptions').select('id').limit(1);
  console.log('push_subscriptions table:', psErr ? `Missing (${psErr.message})` : 'Exists');

  // check orders columns
  const { data: orders, error: oErr } = await supabase.from('orders').select('cancel_reason, rider_name, status_changed_at').limit(1);
  console.log('orders new columns:', oErr ? `Missing (${oErr.message})` : 'Exist');
}

check();
