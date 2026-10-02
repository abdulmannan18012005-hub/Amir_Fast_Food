with open('src/components/cart/CartDrawer.tsx', 'r', encoding='utf-8') as f:
    drawer = f.read()

# Add edit address block
edit_block = """
              {items.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-xl mt-4 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm">Delivery Details</h4>
                    <a href="/checkout" className="text-xs text-primary font-bold hover:underline">Edit</a>
                  </div>
                  {typeof window !== 'undefined' && localStorage.getItem('user_profile') ? (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{JSON.parse(localStorage.getItem('user_profile')!).name}</p>
                      <p>{JSON.parse(localStorage.getItem('user_profile')!).phone}</p>
                      <p className="truncate">{JSON.parse(localStorage.getItem('user_profile')!).address}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No address saved yet. We'll ask at checkout.</p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border p-4 sm:p-6 bg-muted/30">"""

drawer = drawer.replace("</div>\n\n            <div className=\"border-t border-border p-4 sm:p-6 bg-muted/30\">", edit_block)

with open('src/components/cart/CartDrawer.tsx', 'w', encoding='utf-8') as f:
    f.write(drawer)
