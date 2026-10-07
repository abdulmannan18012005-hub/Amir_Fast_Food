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
  const { data } = await supabase.from('menu_items').select('id, price').limit(1);
  console.log(data);
}
run();
