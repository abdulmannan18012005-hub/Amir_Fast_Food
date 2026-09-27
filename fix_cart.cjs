const fs = require('fs');
let content = fs.readFileSync('src/components/cart/CartDrawer.tsx', 'utf8');

const replacement = `
  const [fulfillment, setFulfillment] = React.useState('delivery');
  React.useEffect(() => {
    const updateF = () => setFulfillment(localStorage.getItem('fulfillment') || 'delivery');
    updateF();
    window.addEventListener('fulfillmentUpdated', updateF);
    return () => window.removeEventListener('fulfillmentUpdated', updateF);
  }, []);

  const deliveryFee = fulfillment === 'takeaway' ? 0 : (subtotal < 1000 && subtotal > 0 ? 100 : 0);
`;

content = content.replace('const deliveryFee = subtotal < 1000 && subtotal > 0 ? 100 : 0;', replacement);
fs.writeFileSync('src/components/cart/CartDrawer.tsx', content);
