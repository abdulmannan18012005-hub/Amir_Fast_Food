const fs = require('fs');
let code = fs.readFileSync('src/routes/admin/history.tsx', 'utf8');

// Inject Polling
code = code.replace(/  useEffect\(\(\) => \{\s*fetchOrders\(\);\s*\}, \[dateFilter, statusFilter, page\]\);/,
`  useEffect(() => {
    fetchOrders();
  }, [dateFilter, statusFilter, page]);

  useEffect(() => {
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible' && page === 1) fetchOrders();
    }, 15000);
    const onVis = () => {
      if (document.visibilityState === 'visible' && page === 1) fetchOrders();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [dateFilter, statusFilter, page, searchQuery]);`);

// Inject Revenue Summary
// We want to calculate revenue only for Delivered orders that are currently fetched
const summaryBlock = `
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center text-sm">
          <span className="font-bold text-slate-700">Daily Summary (Page {page})</span>
          <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full">
            Revenue: PKR {orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_amount) + Number(o.delivery_fee), 0)}
          </span>
        </div>`;

// Insert it right after the header
code = code.replace(/(<\/header>)/, "$1" + summaryBlock);

fs.writeFileSync('src/routes/admin/history.tsx', code);
