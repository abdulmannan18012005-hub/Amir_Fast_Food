with open('src/server/chat.ts', 'r', encoding='utf-8') as f:
    chatTs = f.read()

new_system_prompt = """
CASE 4: ADDING TO CART OR CHECKOUT
If the user explicitly asks you to add a specific item to their cart, reply nicely and append exactly `[ACTION:ADD_CART:Item Name]` at the very end of your response. Use the exact 'Item Name' from the live menu data.
If the user says they are ready to checkout, pay, or proceed to address details, reply nicely and append exactly `[ACTION:CHECKOUT]` at the very end.

DELIVERY POLICIES:"""

chatTs = chatTs.replace("DELIVERY POLICIES:", new_system_prompt)

with open('src/server/chat.ts', 'w', encoding='utf-8') as f:
    f.write(chatTs)
