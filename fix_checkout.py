with open('src/routes/checkout.tsx', 'r', encoding='utf-8') as f:
    checkout = f.read()

# Pre-fill states from user_profile
checkout = checkout.replace(
    "const [name, setName] = useState('');",
    "const [name, setName] = useState(() => JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user_profile') || '{}' : '{}').name || '');"
)
checkout = checkout.replace(
    "const [phone, setPhone] = useState('');",
    "const [phone, setPhone] = useState(() => JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user_profile') || '{}' : '{}').phone || '');"
)
checkout = checkout.replace(
    "const [email, setEmail] = useState('');",
    "const [email, setEmail] = useState(() => JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user_profile') || '{}' : '{}').email || '');"
)
checkout = checkout.replace(
    "const [address, setAddress] = useState('');",
    "const [address, setAddress] = useState(() => JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user_profile') || '{}' : '{}').address || '');"
)

# Add consent state
checkout = checkout.replace(
    "const [trxId, setTrxId] = useState('');",
    "const [trxId, setTrxId] = useState('');\n  const [consent, setConsent] = useState(false);"
)

# Save profile on success and save orderId for tracking
checkout = checkout.replace(
    """      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cartUpdated'));
      
      playSuccessChime();""",
    """      localStorage.removeItem('cart');
      localStorage.setItem('user_profile', JSON.stringify({ name, phone, email, address }));
      localStorage.setItem('active_order', order.id);
      window.dispatchEvent(new Event('cartUpdated'));
      
      playSuccessChime();"""
)

# Render consent checkbox in step 2 before submit button
# First let's find the Place Order button
checkout = checkout.replace(
    """<button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg transition-all text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >""",
    """<label className="flex items-start gap-3 mb-6 p-4 bg-red-50 text-red-900 border border-red-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-5 h-5 accent-red-600 rounded" />
                <span className="text-sm font-medium">Orders once confirmed cannot be cancelled as preparation begins immediately. I agree and wish to place my order.</span>
              </label>

              <button
              onClick={handlePlaceOrder}
              disabled={loading || !consent}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg transition-all text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >"""
)

with open('src/routes/checkout.tsx', 'w', encoding='utf-8') as f:
    f.write(checkout)
