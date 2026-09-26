const fs = require('fs');
let content = fs.readFileSync('src/routes/admin/kitchen.tsx', 'utf8');

const authLogic = \
  const [orders, setOrders] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
          <ChefHat className="text-red-500 w-16 h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Kitchen Access</h1>
          <p className="text-slate-400 mb-6 text-sm">Enter the super-secret admin PIN to access the KDS.</p>
          <input 
            type="password" 
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-slate-950 border border-slate-700 text-white text-center text-xl tracking-[0.5em] rounded-xl py-3 mb-4 focus:outline-none focus:border-red-500"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pin === '7860') setIsAuthenticated(true);
                else alert('Incorrect PIN!');
              }
            }}
          />
          <button 
            onClick={() => {
              if (pin === '7860') setIsAuthenticated(true);
              else alert('Incorrect PIN!');
            }}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Unlock KDS
          </button>
        </div>
      </div>
    );
  }
\;

content = content.replace('const [orders, setOrders] = useState<any[]>([]);', authLogic);

fs.writeFileSync('src/routes/admin/kitchen.tsx', content);
