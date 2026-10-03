with open('src/server/chat.ts', 'r', encoding='utf-8') as f:
    chatTs = f.read()

chatTs = chatTs.replace("exactly `[ACTION:ADD_CART:Item Name]`", "exactly [ACTION:ADD_CART:Item Name]")
chatTs = chatTs.replace("exactly `[ACTION:CHECKOUT]`", "exactly [ACTION:CHECKOUT]")

with open('src/server/chat.ts', 'w', encoding='utf-8') as f:
    f.write(chatTs)
