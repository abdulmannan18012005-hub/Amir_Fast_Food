with open('src/server/chat.ts', 'r', encoding='utf-8') as f:
    chatTs = f.read()

# Change signature
chatTs = chatTs.replace(
    "handler(async ({ data }: { data: string }) => {",
    "handler(async ({ data }: { data: { text: string, history?: {role: 'user'|'assistant'|'system', content: string}[] } }) => {"
)

interceptor = """  // Token Saving LRU / Interceptor
  const inputLower = data.text.toLowerCase();
  if (inputLower.includes('where is the shop') || inputLower.includes('location')) {
    return { reply: "We are located at Anwar Market, Peco Road, Lahore. 📍 Drop by or order online!" };
  }
  if (inputLower.includes('delivery fee') || inputLower.includes('delivery charges')) {
    return { reply: "Delivery is FREE for orders over PKR 1000! For smaller orders, it's PKR 100. Note: We only deliver within a 5 KM radius. Beyond 5 KM, it's +PKR 100 per extra KM. 🛵" };
  }
"""
chatTs = chatTs.replace("if (!process.env.GROQ_API_KEY) {", interceptor + "\n  if (!process.env.GROQ_API_KEY) {")

chatTs = chatTs.replace(
    "- Standard COD Fee: PKR 100 for orders under PKR 1000.",
    "- Standard COD Fee: PKR 100 for orders under PKR 1000.\n- Delivery Radius: Strictly limited to a 5 KM radius. Any distance beyond 5 KM incurs a fee of PKR 100 per additional KM."
)

chatTs = chatTs.replace(
    """messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: data }
      ],""",
    """messages: [
        { role: 'system', content: systemPrompt },
        ...(data.history || []),
        { role: 'user', content: data.text }
      ],"""
)

with open('src/server/chat.ts', 'w', encoding='utf-8') as f:
    f.write(chatTs)
