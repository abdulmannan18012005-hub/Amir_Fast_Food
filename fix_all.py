import os
import re

# 1. Update AmirBotDrawer
drawer_path = "src/components/chat/AmirBotDrawer.tsx"
with open(drawer_path, "r", encoding="utf8") as f:
    drawer = f.read()

drawer = drawer.replace("import { MessageCircle, X, Send, Bot } from 'lucide-react';", "import { MessageCircle, X, Send, Bot } from 'lucide-react';\nimport { addToCart } from '../../lib/cart';")
drawer = drawer.replace("const [toast, setToast] = useState('');", "const [toast, setToast] = useState('');\n  const navigate = useNavigate();")
drawer = drawer.replace("const res = await chatWithAmirBot({ data: { text, history } });\n      setMessages(prev => [...prev, { role: 'bot', text: res.reply }]);", """const res = await chatWithAmirBot({ data: { text, history } });
      let replyText = res.reply || '';

      let redirectCheckout = false;
      if (replyText.includes('[ACTION:CHECKOUT]')) {
        replyText = replyText.replace(/\\[ACTION:CHECKOUT\\]/g, '').trim();
        redirectCheckout = true;
      }

      const cartMatch = replyText.match(/\\[ACTION:ADD_CART:(.*?)\\]/);
      if (cartMatch) {
        const itemName = cartMatch[1].trim();
        replyText = replyText.replace(/\\[ACTION:ADD_CART:.*?\\]/g, '').trim();
        
        const { data: item } = await supabaseBrowser
          .from('menu_items')
          .select('*')
          .ilike('name', itemName)
          .eq('is_available', true)
          .limit(1)
          .single();

        if (item) {
          if (item.variants && item.variants.length > 0) {
            setToast('Please choose options for ' + item.name + ' on the menu page.');
            setTimeout(() => setToast(''), 3000);
          } else {
            addToCart({
              menu_item_id: item.id,
              quantity: 1,
              price: item.price,
              variants: []
            }, true);
            setToast(item.name + ' added to cart!');
            setTimeout(() => setToast(''), 3000);
          }
        } else {
          setToast('Item not found.');
          setTimeout(() => setToast(''), 3000);
        }
      }

      setMessages(prev => [...prev, { role: 'bot', text: replyText }]);

      if (redirectCheckout) {
        sessionStorage.setItem('amirbot_chat', JSON.stringify([...messages, { role: 'user', text }, { role: 'bot', text: replyText }]));
        navigate({ to: '/checkout' });
        setIsOpen(false);
      }""")
drawer = drawer.replace("{/* Slide-up Drawer */}", """{/* Toast */}
      {toast && (
        <div role="status" className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium text-sm animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      {/* Slide-up Drawer */}""")
with open(drawer_path, "w", encoding="utf8") as f:
    f.write(drawer)


# 2. Update chat.ts
chat_path = "src/server/chat.ts"
with open(chat_path, "r", encoding="utf8") as f:
    chat = f.read()

chat = chat.replace("export const chatWithAmirBot = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { text: string, history?: {role: 'user'|'assistant'|'system', content: string}[] } }) => {", """export const chatWithAmirBot = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { text: string, history?: {role: 'user'|'assistant'|'system', content: string}[] } }) => {
  if (!data.text || data.text.length < 1 || data.text.length > 500) {
    throw new Error('Message must be between 1 and 500 characters.');
  }
  
  const safeHistory = (data.history || [])
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .map(m => ({ ...m, content: m.content.substring(0, 500) }));
""")
chat = chat.replace("messages: [\n        systemMsg,\n        ...(data.history || [])", "messages: [\n        systemMsg,\n        ...safeHistory")
with open(chat_path, "w", encoding="utf8") as f:
    f.write(chat)

