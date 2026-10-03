with open('src/components/chat/AmirBotDrawer.tsx', 'r', encoding='utf-8') as f:
    drawer = f.read()

# Make sure supabaseBrowser, playSuccessChime, useNavigate are imported
if "supabaseBrowser" not in drawer:
    drawer = drawer.replace("import React, { useState, useEffect, useRef } from 'react';", "import React, { useState, useEffect, useRef } from 'react';\nimport { supabaseBrowser } from '../../lib/supabase';\nimport { playSuccessChime } from '../../lib/sound';\nimport { useNavigate } from '@tanstack/react-router';")

if "useNavigate" not in drawer:
    drawer = drawer.replace("import { MessageSquare, X, Send } from 'lucide-react';", "import { MessageSquare, X, Send } from 'lucide-react';\nimport { useNavigate } from '@tanstack/react-router';")

action_logic = """
      const res = await chatWithAmirBot({ data: { text, history } });
      let replyText = res.reply;

      // Check for Checkout Redirect
      if (replyText.includes('[ACTION:CHECKOUT]')) {
        replyText = replyText.replace('[ACTION:CHECKOUT]', '').trim();
        window.location.href = '/checkout';
      }

      // Check for Add to Cart
      const cartMatch = replyText.match(/\\[ACTION:ADD_CART:(.+?)\\]/);
      if (cartMatch) {
        const itemName = cartMatch[1].trim();
        replyText = replyText.replace(cartMatch[0], '').trim();
        
        // Fetch item from supabase
        const { data: item } = await supabaseBrowser
          .from('menu_items')
          .select('*')
          .ilike('name', itemName)
          .single();
          
        if (item) {
          const cart = JSON.parse(localStorage.getItem('cart') || '[]');
          const existing = cart.find((i: any) => i.menu_item_id === item.id);
          if (existing) {
            existing.quantity += 1;
          } else {
            cart.push({
              menu_item_id: item.id,
              name: item.name,
              price: item.price,
              quantity: 1,
              variants: []
            });
          }
          localStorage.setItem('cart', JSON.stringify(cart));
          window.dispatchEvent(new Event('cartUpdated'));
          if (typeof playSuccessChime !== 'undefined') playSuccessChime();
          // Show a quick browser native toast or just let the chat say it
        }
      }

      setMessages(prev => [...prev, { role: 'bot', text: replyText }]);
"""

drawer = drawer.replace(
    "const res = await chatWithAmirBot({ data: { text, history } });\n        setMessages(prev => [...prev, { role: 'bot', text: res.reply }]);",
    action_logic
)

with open('src/components/chat/AmirBotDrawer.tsx', 'w', encoding='utf-8') as f:
    f.write(drawer)
