const fs = require('fs');
let code = fs.readFileSync('src/routes/admin/kitchen.tsx', 'utf8');

const target = `              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded">#{order.id.slice(0, 8)}</span>
                {order.payment_method !== 'cod' && (
                  <span className="text-[10px] bg-green-900/50 text-green-400 font-bold px-1.5 py-0.5 rounded uppercase">Paid</span>
                )}
              </div>
              <h3 className="font-bold text-white mt-1">{order.customer_name}</h3>`;

const replacement = `              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded">#{order.id.slice(0, 8)}</span>
                <span className={\`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase \${order.payment_method === 'cod' ? 'bg-orange-900/50 text-orange-400' : 'bg-green-900/50 text-green-400'}\`}>
                  {order.payment_method === 'cod' ? 'COD' : 'Paid'}
                </span>
              </div>
              <h3 className="font-bold text-white mt-1">{order.customer_name} <span className="text-sm font-normal text-slate-400">({order.customer_phone})</span></h3>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/routes/admin/kitchen.tsx', code);
