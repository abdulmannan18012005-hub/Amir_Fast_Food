import re

with open('src/components/chat/AmirBotDrawer.tsx', 'r', encoding='utf-8') as f:
    drawer = f.read()

# 1. Update initial state and memory logic
drawer = drawer.replace(
    "const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([\n    { role: 'bot', text: 'Hi! I am AmirBot. How can I help you today?' }\n  ]);",
    """const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('amirbot_chat') : null;
    return saved ? JSON.parse(saved) : [{ role: 'bot', text: 'Hi! I am AmirBot. How can I help you today?' }];
  });

  useEffect(() => {
    sessionStorage.setItem('amirbot_chat', JSON.stringify(messages));
  }, [messages]);"""
)

# 2. Update chatWithAmirBot call
old_call = """const res = await chatWithAmirBot({ data: text });"""
new_call = """// Format history for the server
      const history = messages.slice(-50).map(m => ({ 
        role: m.role === 'bot' ? 'assistant' : 'user', 
        content: m.text 
      })) as {role: 'user'|'assistant'|'system', content: string}[];

      const res = await chatWithAmirBot({ data: { text, history } });"""

drawer = drawer.replace(old_call, new_call)

with open('src/components/chat/AmirBotDrawer.tsx', 'w', encoding='utf-8') as f:
    f.write(drawer)
