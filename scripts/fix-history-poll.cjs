const fs = require('fs');
let code = fs.readFileSync('src/routes/admin/history.tsx', 'utf8');

const target = `  useEffect(() => {
    fetchOrders();
  }, [dateFilter, statusFilter, page]);`;

const replacement = `  useEffect(() => {
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
  }, [dateFilter, statusFilter, page, searchQuery]);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/routes/admin/history.tsx', code);
