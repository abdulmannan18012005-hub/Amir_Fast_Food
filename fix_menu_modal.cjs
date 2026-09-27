const fs = require('fs');
let content = fs.readFileSync('src/routes/menu.tsx', 'utf8');

const replacement = `function ItemModal({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: (i: CartItem) => void }) {
  const [step, setStep] = useState(1);
  const [drink, setDrink] = useState('Pepsi');
  const [side, setSide] = useState('Regular Fries');
  const [upgrades, setUpgrades] = useState<{name: string, price: number}[]>([]);
  
  const handleComplete = () => {
    onAdd({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image_url: item.image_url,
      variants: [
        { name: \`Drink: \${drink}\`, price: 0 },
        { name: \`Side: \${side}\`, price: 0 },
        ...upgrades
      ]
    });
    onClose();
  };

  const toggleUpgrade = (name: string, price: number) => {
    setUpgrades(prev => 
      prev.find(u => u.name === name) 
        ? prev.filter(u => u.name !== name)
        : [...prev, { name, price }]
    );
  };

  const total = item.price + upgrades.reduce((s, u) => s + u.price, 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="h-48 overflow-hidden relative shrink-0">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
            <h2 className="text-2xl font-bold text-white">{item.name}</h2>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="font-bold text-lg text-foreground">1. Choose your Drink</h3>
              {['Pepsi', '7Up', 'Mirinda', 'Mountain Dew', 'Diet Pepsi'].map(d => (
                <label key={d} className="flex items-center gap-3 p-4 bg-accent/50 rounded-xl cursor-pointer hover:bg-accent border border-border">
                  <input type="radio" name="drink" checked={drink === d} onChange={() => setDrink(d)} className="w-5 h-5 text-primary" />
                  <span className="text-foreground font-medium">{d}</span>
                </label>
              ))}
              <button onClick={() => setStep(2)} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 mt-4">Next Step</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="font-bold text-lg text-foreground">2. Choose your Side</h3>
              {['Regular Fries', 'Masala Fries', 'Coleslaw', 'Garlic Mayo Dip'].map(s => (
                <label key={s} className="flex items-center gap-3 p-4 bg-accent/50 rounded-xl cursor-pointer hover:bg-accent border border-border">
                  <input type="radio" name="side" checked={side === s} onChange={() => setSide(s)} className="w-5 h-5 text-primary" />
                  <span className="text-foreground font-medium">{s}</span>
                </label>
              ))}
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(1)} className="w-1/3 bg-accent text-foreground font-bold py-3.5 rounded-xl hover:bg-accent/80">Back</button>
                <button onClick={() => setStep(3)} className="w-2/3 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90">Next Step</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="font-bold text-lg text-foreground">3. Premium Upgrades</h3>
              {[
                { name: 'Extra Cheese', price: 60 },
                { name: 'Extra Dip', price: 50 },
                { name: 'Jalapenos', price: 40 }
              ].map(u => {
                const checked = upgrades.some(x => x.name === u.name);
                return (
                  <label key={u.name} className="flex items-center justify-between p-4 bg-accent/50 rounded-xl cursor-pointer hover:bg-accent border border-border">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={checked} onChange={() => toggleUpgrade(u.name, u.price)} className="w-5 h-5 rounded text-primary" />
                      <span className="text-foreground font-medium">{u.name}</span>
                    </div>
                    <span className="text-primary font-bold">+PKR {u.price}</span>
                  </label>
                );
              })}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="w-1/3 bg-accent text-foreground font-bold py-3.5 rounded-xl hover:bg-accent/80">Back</button>
                <button onClick={handleComplete} className="w-2/3 bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-600/30">
                  Add - PKR {total}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 backdrop-blur-md z-50">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
  );
}`;

content = content.replace(/function ItemModal\([\s\S]*?return \([\s\S]*?<\/div>\s*\);\s*\}/, replacement);
fs.writeFileSync('src/routes/menu.tsx', content);
