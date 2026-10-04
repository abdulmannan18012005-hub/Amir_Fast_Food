import os

order_path = "src/server/order.ts"
if os.path.exists(order_path):
    with open(order_path, "r", encoding="utf8") as f:
        code = f.read()

    # Rename getPublicOrderFn to getPublicOrder
    code = code.replace("export const getPublicOrderFn = createServerFn({ method: \"POST\" })", "export const getPublicOrder = createServerFn({ method: \"POST\" })")
    
    # Add getKitchenOrders and getPublicOrders
    additional_code = """
export const getKitchenOrders = createServerFn({ method: "POST" })
  .validator((d: { pin?: string }) => d)
  .handler(async ({ data }) => {
    verifyAdminPin(data.pin);
    const supabase = getSupabaseServer();
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .in('status', ['received', 'preparing', 'out_for_delivery'])
      .order('created_at', { ascending: true });
      
    if (error) throw new Error(error.message);
    return orders;
  });

export const getPublicOrders = createServerFn({ method: "POST" })
  .validator((d: { orderIds: string[] }) => d)
  .handler(async ({ data }) => {
    if (!data.orderIds || data.orderIds.length === 0) return [];
    const validIds = data.orderIds.slice(0, 3).filter(id => id.length === 36); // basic UUID check length
    if (validIds.length === 0) return [];
    
    const supabase = getSupabaseServer();
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, status, created_at, status_changed_at, canceled_at, payment_method, total_amount, delivery_fee, customer_name, delivery_address, rider_name, rider_phone, cancel_reason, order_items(*, menu_items(name))')
      .in('id', validIds);
      
    if (error || !orders) return [];
    
    return orders.map(order => ({
      id: order.id,
      shortCode: order.id.slice(0, 8).toUpperCase(),
      status: order.status as OrderStatus,
      created_at: order.created_at,
      status_changed_at: order.status_changed_at || order.created_at,
      canceled_at: order.canceled_at,
      payment_method: order.payment_method,
      subtotal: order.total_amount,
      delivery_fee: order.delivery_fee,
      total: Number(order.total_amount) + Number(order.delivery_fee),
      customer_name: order.customer_name,
      delivery_address: order.delivery_address,
      rider_name: order.rider_name,
      rider_phone: order.rider_phone,
      cancel_reason: order.cancel_reason,
      items: order.order_items.map((i: any) => ({
        name: i.menu_items?.name || 'Item',
        quantity: i.quantity,
        unit_price: i.unit_price,
        variants: i.selected_variants
      }))
    }));
  });
"""
    code += additional_code
    
    with open(order_path, "w", encoding="utf8") as f:
        f.write(code)

