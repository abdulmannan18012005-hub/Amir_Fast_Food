const fs = require('fs');
let content = fs.readFileSync('src/routes/__root.tsx', 'utf8');

if (!content.includes('CartDrawer')) {
  content = content.replace(
    'import { AmirBotDrawer } from \'../components/chat/AmirBotDrawer\';',
    'import { AmirBotDrawer } from \'../components/chat/AmirBotDrawer\';\nimport { CartDrawer } from \'../components/cart/CartDrawer\';'
  );
}

const stateRegex = /const \[cartCount, setCartCount\] = React\.useState\(0\);[\s\S]*?\}, \[\]\);/;
const newState = `
  const [cartCount, setCartCount] = React.useState(0);
  const [cartTotal, setCartTotal] = React.useState(0);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [cartItems, setCartItems] = React.useState([]);

  React.useEffect(() => {
    const handleStorage = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartItems(cart);
      setCartCount(cart.reduce((acc, item) => acc + item.quantity, 0));
      setCartTotal(cart.reduce((acc, item) => {
        const varsTotal = item.variants?.reduce((vSum, v) => vSum + (v.price || 0), 0) || 0;
        return acc + ((item.price || 0) + varsTotal) * item.quantity;
      }, 0));
    };
    handleStorage();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('cartUpdated', handleStorage);
    const handleOpenCart = () => setIsCartOpen(true);
    window.addEventListener('openCart', handleOpenCart);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('cartUpdated', handleStorage);
      window.removeEventListener('openCart', handleOpenCart);
    };
  }, []);

  const handleUpdateQuantity = (id, delta) => {
    const updated = cartItems.map(item => {
      if (item.menu_item_id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleRemoveItem = (id) => {
    const updated = cartItems.filter(item => item.menu_item_id !== id);
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleClearCart = () => {
    localStorage.setItem('cart', JSON.stringify([]));
    window.dispatchEvent(new Event('cartUpdated'));
    setIsCartOpen(false);
  };
`;

content = content.replace(stateRegex, newState);

content = content.replace(
  '<AmirBotDrawer />',
  '<AmirBotDrawer />\n        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} onClearCart={handleClearCart} />'
);

content = content.replace(
  '<a href="/checkout" onClick={(e) => {\n                if (cartCount === 0) {\n                  e.preventDefault();\n                  alert(\'Your cart is empty. Add your favorite meal first!\');\n                  window.location.href = \'/menu\';\n                }\n              }}>',
  '<a href="/checkout" onClick={(e) => {\n                e.preventDefault();\n                if (cartCount === 0) {\n                  alert(\'Your cart is empty. Add your favorite meal first!\');\n                  window.location.href = \'/menu\';\n                } else {\n                  setIsCartOpen(true);\n                }\n              }}>'
);

content = content.replace(
  "onOpenCart={() => window.location.href = '/checkout'}",
  "onOpenCart={() => { if(cartCount === 0) { alert('Your cart is empty!'); } else { setIsCartOpen(true); } }}"
);

fs.writeFileSync('src/routes/__root.tsx', content);
