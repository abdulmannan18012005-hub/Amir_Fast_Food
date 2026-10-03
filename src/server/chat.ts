import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
});

export const chatWithAmirBot = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { text: string, history?: {role: 'user'|'assistant'|'system', content: string}[] } }) => {
    // Token Saving LRU / Interceptor
  const inputLower = data.text.toLowerCase();
  if (inputLower.includes('where is the shop') || inputLower.includes('location')) {
    return { reply: "We are located at Anwar Market, Peco Road, Lahore. 📍 Drop by or order online!" };
  }
  if (inputLower.includes('delivery fee') || inputLower.includes('delivery charges')) {
    return { reply: "Delivery is FREE for orders over PKR 1000! For smaller orders, it's PKR 100. Note: We only deliver within a 5 KM radius. Beyond 5 KM, it's +PKR 100 per extra KM. 🛵" };
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured for AmirBot.');
  }
  
  const supabase = getSupabaseServer();
  
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('name, price, is_available, category_id, description');

  let liveContextString = '';
  if (!menuItems || menuItems.length === 0) {
    liveContextString = `Ultimate Crispy Zinger: PKR 550
Deal 1 - Solo: PKR 799
Classic Chicken Shawarma: PKR 250`;
  } else {
    liveContextString = menuItems.map(item => `- ${item.name}: PKR ${item.price} (${item.is_available ? 'Available' : 'Out of Stock'})`).join('\n');
  }

    const systemPrompt = `You are AmirBot, the exclusive AI ordering assistant for Amir Fast Food in Lahore, Pakistan.
  
  Your ONLY purpose is to assist customers with ordering from Amir Fast Food, answering questions about the menu, location, and delivery policies.
  
  LIVE MENU KNOWLEDGE:
  ${liveContextString}
  
  DELIVERY RULES:
  - Delivery is FREE for orders over PKR 1000! For smaller orders, it's PKR 100.
  - We deliver within a 5 KM radius. Beyond 5 KM, it is +PKR 100 per extra KM.

  STRICT RULES (Zero Hallucination):
  1. Only quote items and prices present in the Live Menu Knowledge above. Do NOT make up items.
  2. Keep answers strictly concise (3 to 4 sentences maximum or structured numbered lists).
  3. If they want to add an item to their cart, you MUST append EXACTLY this string at the very end of your response on a new line: [ACTION:ADD_CART:Item Name]
  4. If they want to checkout or pay, you MUST append EXACTLY this string at the very end of your response on a new line: [ACTION:CHECKOUT]
  5. If the question is unrelated (Politics, coding, etc.), reply ONLY with: "Apologies, but I am specifically programmed only to assist with Amir Fast Food inquiries."
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-oss-120b', // Use working model
      temperature: 0.2, // Low temp for strict compliance
      messages: [
        { role: 'system', content: systemPrompt },
        ...(data.history || []),
        { role: 'user', content: data.text }
      ],
    });
    
    return {
      reply: completion.choices[0]?.message?.content || "I couldn't process that. Try asking about our Crispy Zinger!"
    };
  } catch (error: any) {
    console.error('Groq API Error:', error);
    throw new Error('Failed to communicate with AI Assistant.');
  }
});
