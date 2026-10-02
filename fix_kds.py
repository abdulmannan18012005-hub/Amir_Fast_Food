with open('src/routes/admin/kitchen.tsx', 'r', encoding='utf-8') as f:
    kitchen = f.read()

# Make it show all active stages (not just received/preparing)
kitchen = kitchen.replace(
    """if (!['received', 'preparing'].includes(updated.status)) {
              return prev.filter(o => o.id !== updated.id);
            }""",
    """if (updated.status === 'delivered' || updated.status === 'canceled') {
              return prev.filter(o => o.id !== updated.id);
            }"""
)

# Update the handleBump signatures
kitchen = kitchen.replace(
    """<button
                  onClick={() => handleBump(order.id, 'preparing')}
                  className="w-full mt-4 bg-primary text-primary-foreground font-bold py-3 rounded-lg shadow hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <ChefHat size={18} /> Send to Kitchen (Prepare)
                </button>""",
    """<button
                  onClick={() => handleBump(order.id, 'preparing')}
                  className="w-full mt-4 bg-primary text-primary-foreground font-bold py-3 rounded-lg shadow hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <ChefHat size={18} /> Prep Food
                </button>
                <button
                  onClick={() => handleBump(order.id, 'out_for_delivery')}
                  className="w-full mt-2 bg-blue-600 text-white font-bold py-3 rounded-lg shadow hover:opacity-90 flex items-center justify-center gap-2"
                >
                  🚀 Skip to Delivery
                </button>"""
)

kitchen = kitchen.replace(
    """<button
                  onClick={() => handleBump(order.id, 'out_for_delivery')}
                  className="w-full mt-4 bg-green-600 text-white font-bold py-3 rounded-lg shadow hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Mark Ready & Dispatch
                </button>""",
    """<button
                  onClick={() => handleBump(order.id, 'out_for_delivery')}
                  className="w-full mt-4 bg-green-600 text-white font-bold py-3 rounded-lg shadow hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Dispatch / Out for Delivery
                </button>
                <button
                  onClick={() => handleBump(order.id, 'delivered')}
                  className="w-full mt-2 bg-gray-600 text-white font-bold py-3 rounded-lg shadow hover:opacity-90 flex items-center justify-center gap-2"
                >
                  ✅ Mark Delivered
                </button>"""
)

# Render third column: Out for delivery
out_for_delivery_col = """
        {/* Out For Delivery Column */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col max-h-[85vh]">
          <div className="flex items-center gap-3 mb-6 bg-blue-600/10 p-3 rounded-lg border border-blue-600/20 text-blue-600">
            <CheckCircle className="w-6 h-6" />
            <h2 className="text-xl font-black uppercase tracking-wider">Out for Delivery</h2>
            <span className="ml-auto bg-blue-600 text-white text-sm py-1 px-3 rounded-full font-bold">
              {orders.filter((o) => o.status === 'out_for_delivery').length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {orders
              .filter((o) => o.status === 'out_for_delivery')
              .map((order) => (
                <div key={order.id} className="bg-muted p-4 rounded-xl border border-border flex flex-col relative overflow-hidden shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-sm bg-background px-2 py-1 rounded font-bold border border-border">
                      #{order.id.slice(0, 5).toUpperCase()}
                    </span>
                    <div className="flex gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${order.payment_method === 'cod' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                        {order.payment_method === 'cod' ? 'CASH ON DELIVERY' : 'ONLINE PAID'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm bg-background p-3 rounded-md mb-4 border border-border">
                    <p className="font-bold">{order.customer_name} - {order.customer_phone}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{order.delivery_address}</p>
                    <p className="text-xs font-semibold text-primary mt-2">Distance Check: Pending (+PKR 0)</p>
                  </div>

                  <ul className="space-y-3 mb-4">
                    {order.order_items.map((item: any) => (
                      <li key={item.id} className="flex gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                        <span className="font-black text-primary bg-primary/10 px-2 py-1 rounded h-fit">{item.quantity}x</span>
                        <span className="font-bold text-foreground mt-1">{item.menu_items.name}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleBump(order.id, 'delivered')}
                    className="w-full mt-auto bg-gray-800 text-white font-bold py-3 rounded-lg shadow hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    ✅ Mark Completed
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>"""

# Replace the closing div of the grid to insert the 3rd column
kitchen = kitchen.replace(
    "</div>\n    </div>",
    out_for_delivery_col + "\n    </div>"
)

# And update the grid layout class
kitchen = kitchen.replace(
    "className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\"",
    "className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\""
)

# Add customer info to existing columns
customer_info_html = """
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-sm bg-background px-2 py-1 rounded font-bold border border-border">
                      #{order.id.slice(0, 5).toUpperCase()}
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${order.payment_method === 'cod' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                      {order.payment_method === 'cod' ? 'COD' : 'PAID'}
                    </span>
                  </div>
                  
                  <div className="text-sm bg-background p-3 rounded-md mb-4 border border-border">
                    <p className="font-bold">{order.customer_name} - {order.customer_phone}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{order.delivery_address}</p>
                  </div>"""

kitchen = kitchen.replace(
    """<div className="flex justify-between items-center mb-4">
                    <span className="font-mono text-sm bg-background px-2 py-1 rounded font-bold border border-border">
                      #{order.id.slice(0, 5).toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>""",
    customer_info_html
)

with open('src/routes/admin/kitchen.tsx', 'w', encoding='utf-8') as f:
    f.write(kitchen)
