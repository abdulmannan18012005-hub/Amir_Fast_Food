import os

kitchen_path = "src/routes/admin/kitchen.tsx"
with open(kitchen_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace button labels and logics
old_buttons = """        <div className="flex gap-2 mt-2 pt-3 border-t border-slate-700">
          <button 
             onClick={() => handlePrint(order)}
             className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
             <Printer size={16} /> Print
          </button>
          
          {currentStatus === 'received' && (
            <button 
              onClick={() => handleStatusUpdate(order.id, 'preparing', undefined, undefined, undefined, 'received')}
              className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <ChefHat size={16} /> Accept
            </button>
          )}

          {currentStatus === 'preparing' && (
            <button 
              onClick={() => setDispatchModalOpen({ id: order.id, expected: 'preparing' })}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Truck size={16} /> Dispatch
            </button>
          )}

          {currentStatus === 'out_for_delivery' && (
            <button 
              onClick={() => handleStatusUpdate(order.id, 'delivered', undefined, undefined, undefined, 'out_for_delivery')}
              className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle size={16} /> Delivered
            </button>
          )}

          {(currentStatus === 'received' || currentStatus === 'preparing') && (
             <button 
               onClick={() => setCancelModalOpen({ id: order.id, expected: currentStatus })}
               className="bg-slate-700 hover:bg-red-900/50 text-red-400 hover:text-red-300 py-2 px-3 rounded-lg transition-colors"
               title="Cancel Order"
             >
               <XCircle size={16} />
             </button>
          )}
        </div>"""

new_buttons = """        <div className="flex gap-2 mt-2 pt-3 border-t border-slate-700 flex-wrap">
          <button 
             onClick={() => handlePrint(order)}
             className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
             <Printer size={16} />
          </button>
          
          {currentStatus === 'received' && (
            <>
              <button 
                onClick={() => handleStatusUpdate(order.id, 'preparing', undefined, undefined, undefined, 'received')}
                className="flex-[1] bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-2 rounded-lg text-sm transition-colors"
              >
                Prep Food
              </button>
              <button 
                onClick={() => setDispatchModalOpen({ id: order.id, expected: 'received' })}
                className="flex-[1] bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-2 rounded-lg text-sm transition-colors"
              >
                Skip to Delivery
              </button>
            </>
          )}

          {currentStatus === 'preparing' && (
            <button 
              onClick={() => setDispatchModalOpen({ id: order.id, expected: 'preparing' })}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors"
            >
              Dispatch
            </button>
          )}

          {currentStatus === 'out_for_delivery' && (
            <button 
              onClick={() => handleStatusUpdate(order.id, 'delivered', undefined, undefined, undefined, 'out_for_delivery')}
              className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors"
            >
              Mark Completed
            </button>
          )}

          <button 
            onClick={() => setCancelModalOpen({ id: order.id, expected: currentStatus })}
            className="bg-slate-700 hover:bg-red-900/50 text-red-400 hover:text-red-300 py-2 px-3 rounded-lg transition-colors"
            title="Cancel"
          >
            <XCircle size={16} />
          </button>
        </div>"""

code = code.replace(old_buttons, new_buttons)

# Also fix dispatch modal check to make rider optional
old_dispatch = """if (!riderName.trim()) return alert("Rider Name is required.");"""
new_dispatch = """// Rider name optional"""
code = code.replace(old_dispatch, new_dispatch)

with open(kitchen_path, "w", encoding="utf-8") as f:
    f.write(code)
