const fs = require('fs');
let content = fs.readFileSync('src/routes/__root.tsx', 'utf8');

const target = '<a href="/locations" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Locations</a>';
const replacement = target + `
                <button 
                  onClick={() => {
                    const current = localStorage.getItem('fulfillment') || 'delivery';
                    const next = current === 'delivery' ? 'takeaway' : 'delivery';
                    localStorage.setItem('fulfillment', next);
                    window.dispatchEvent(new Event('fulfillmentUpdated'));
                    window.dispatchEvent(new Event('cartUpdated')); // Force total refresh if needed
                  }}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground text-xs font-bold rounded-full hover:bg-accent/80 transition-colors border border-border"
                  title="Toggle Delivery / Takeaway"
                >
                  <span id="fulfillmentLabel">Delivery 🛵</span>
                </button>`;

content = content.replace(target, replacement);

const scriptToAdd = `
  React.useEffect(() => {
    const updateLabel = () => {
      const label = document.getElementById('fulfillmentLabel');
      if (label) {
        label.innerText = (localStorage.getItem('fulfillment') || 'delivery') === 'takeaway' ? 'Takeaway 🏪' : 'Delivery 🛵';
      }
    };
    updateLabel();
    window.addEventListener('fulfillmentUpdated', updateLabel);
    return () => window.removeEventListener('fulfillmentUpdated', updateLabel);
  }, []);
`;

content = content.replace('React.useEffect(() => {\n    const handleStorage = () => {', scriptToAdd + '\n  React.useEffect(() => {\n    const handleStorage = () => {');

fs.writeFileSync('src/routes/__root.tsx', content);
