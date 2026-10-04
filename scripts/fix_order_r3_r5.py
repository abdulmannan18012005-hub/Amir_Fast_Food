import os

order_path = "src/server/order.ts"
with open(order_path, "r", encoding="utf-8") as f:
    code = f.read()

old_query = """      const { data: menuData, error: menuErr } = await supabase
        .from('menu_items')
        .select('id, price, is_available')
        .in('id', itemIds);"""

new_query = """      const { data: menuData, error: menuErr } = await supabase
        .from('menu_items')
        .select('id, price, is_available, variants')
        .in('id', itemIds);"""
code = code.replace(old_query, new_query)

old_loop = """        let itemTotal = dbItem.price;
        // Variants
        if (item.variants && Array.isArray(item.variants)) {
          for (const v of item.variants) {
            if (v.price && typeof v.price === 'number') {
              itemTotal += v.price;
            }
          }
        }
        computedSubtotal += (itemTotal * item.quantity);
        dbItems.push({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: itemTotal,
          selected_variants: item.variants || []
        });"""

new_loop = """        let itemTotal = dbItem.price;
        const validVariants = [];
        // Variants
        if (item.variants && Array.isArray(item.variants)) {
          for (const v of item.variants) {
            // Validate variant against dbItem.variants
            const dbVarGroup = (dbItem.variants || []).find((g: any) => g.name === v.group);
            if (dbVarGroup) {
               const dbVarOption = (dbVarGroup.options || []).find((o: any) => o.name === v.name);
               if (dbVarOption) {
                 itemTotal += dbVarOption.price || 0;
                 validVariants.push({ group: dbVarGroup.name, name: dbVarOption.name, price: dbVarOption.price || 0 });
               }
            }
          }
        }
        computedSubtotal += (itemTotal * item.quantity);
        dbItems.push({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: itemTotal,
          price: itemTotal, // Backward compatibility for process_order
          selected_variants: validVariants,
          variants: validVariants // Backward compatibility for process_order
        });"""
code = code.replace(old_loop, new_loop)

# Also update updateOrderStatus to enforce FSM and push timeouts
old_update = """    const { data: order, error: fetchErr } = await supabase.from('orders').select('status').eq('id', data.orderId).single();
    if (fetchErr || !order) throw new Error("Order not found");
    
    // In strict mode, enforce transitions here.
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: data.status,
        status_changed_at: new Date().toISOString(),
        ...(data.status === 'canceled' ? { 
          canceled_at: new Date().toISOString(),
          cancel_reason: data.reason || 'Canceled by admin'
        } : {}),
        ...(data.riderName ? { rider_name: data.riderName } : {}),
        ...(data.riderPhone ? { rider_phone: data.riderPhone } : {})
      })
      .eq('id', data.orderId);
      
    if (error) {
      console.error("Error updating order status:", error);
      throw new Error("Database error updating status");
    }
    
    import { sendOrderPush } from './push';
    sendOrderPush(data.orderId, data.status).catch(e => console.error(e));"""

new_update = """    const { data: order, error: fetchErr } = await supabase.from('orders').select('status').eq('id', data.orderId).single();
    if (fetchErr || !order) throw new Error("Order not found");
    
    const validTransitions: Record<string, string[]> = {
      'received': ['preparing', 'out_for_delivery', 'canceled'],
      'preparing': ['out_for_delivery', 'canceled'],
      'out_for_delivery': ['delivered', 'canceled'],
      'delivered': [],
      'canceled': []
    };
    
    if (!validTransitions[order.status]?.includes(data.status)) {
       throw new Error(`Invalid transition from ${order.status} to ${data.status}`);
    }
    
    const cleanReason = data.reason ? data.reason.replace(/<[^>]*>?/gm, '').slice(0, 200) : null;
    if (data.status === 'canceled' && (!cleanReason || cleanReason.length < 5)) {
      throw new Error("Valid cancel reason required (5-200 chars)");
    }
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: data.status,
        status_changed_at: new Date().toISOString(),
        ...(data.status === 'canceled' ? { 
          canceled_at: new Date().toISOString(),
          cancel_reason: cleanReason
        } : {}),
        ...(data.riderName ? { rider_name: data.riderName } : {}),
        ...(data.riderPhone ? { rider_phone: data.riderPhone } : {})
      })
      .eq('id', data.orderId);
      
    if (error) {
      if (error.message.includes('cancel_reason')) {
        throw new Error("Database update needed: run supabase/migrations/20261005_webapp_v3.sql");
      }
      throw new Error("Database error updating status");
    }
    
    import { sendOrderPush } from './push';
    await Promise.allSettled([
      Promise.race([
        sendOrderPush(data.orderId, data.status, undefined, data.status === 'canceled' ? `Canceled: ${cleanReason}` : undefined),
        new Promise(r => setTimeout(r, 4000))
      ])
    ]);"""
code = code.replace(old_update, new_update)


with open(order_path, "w", encoding="utf-8") as f:
    f.write(code)
