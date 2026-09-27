import re

with open('src/routes/menu.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Refactor the MenuPage component
new_menu_page = '''function MenuPage() {
  const { categories, items } = useLoaderData({ from: '/menu' });
  const [activeCategory, setActiveCategory] = useState('cat_burgers');
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    // Check URL for cat parameter
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace('#', '');
    const cat = params.get('cat') || hash;
    if (cat && categories.find(c => c.id === cat)) {
      setActiveCategory(cat);
    }
  }, [categories]);

  const handleAddToCart = (item: MenuItem) => {
    if (item.category_id === 'cat_deals') {
      setModalItem(item);
      return;
    }
    
    // Add standalone item to cart
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((i: CartItem) => i.menu_item_id === item.id && (!i.variants || i.variants.length === 0));
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image_url: item.image_url,
        variants: []
      });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    playSuccessChime();
  };

  const handleModalAdd = (cartItem: CartItem) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.push(cartItem);
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    playSuccessChime();
  };

  const activeCatObj = categories.find(c => c.id === activeCategory) || categories[0];
  const activeItems = items.filter(i => i.category_id === activeCategory);

  return (
    <div className="w-full relative">
      {modalItem && <ItemModal item={modalItem} onClose={() => setModalItem(null)} onAdd={handleModalAdd} />}
      
      <div className="w-full bg-background border-b border-border/40 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <header className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Our Menu</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Crispy Broast, Gourmet Smash Burgers & Loaded Deals.</p>
          </header>

          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                  activeCategory === cat.id 
                    ? 'bg-primary text-primary-foreground shadow-primary/20 scale-105' 
                    : 'bg-card text-muted-foreground border border-border hover:bg-accent hover:text-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[50vh]">
        {activeCatObj && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex items-baseline gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{activeCatObj.name}</h2>
              <div className="h-px bg-border flex-1"></div>
            </div>
            
            {activeItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No items available in this category yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                {activeItems.map(item => (
                  <ThreeDMenuCard 
                    key={item.id} 
                    item={item} 
                    onAddToCart={handleAddToCart} 
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}'''

# Replace the entire MenuPage function
content = re.sub(r'function MenuPage\(\) \{.*', new_menu_page, content, flags=re.DOTALL)

with open('src/routes/menu.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
