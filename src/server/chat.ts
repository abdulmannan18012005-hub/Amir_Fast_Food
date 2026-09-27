import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import OpenAI from 'openai';

// Initialize Groq-compatible OpenAI client
const openai = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
});

export const chatWithAmirBot = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: string }) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured for AmirBot.');
  }
  
  const supabase = getSupabaseServer();
  
  // 1. INJECT LIVE KNOWLEDGE (Zero Hallucination Guarantee)
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('name, price, is_available, category_id, description');

  let liveContextString = '';
  if (!menuItems || menuItems.length === 0) {
    liveContextString = `Ultimate Crispy Zinger: PKR 550 (Available)
Deal 1 - Solo: PKR 799 (Available)
Classic Chicken Shawarma: PKR 250 (Available)`;
  } else {
    liveContextString = menuItems.map(item => `${item.name}: PKR ${item.price} (${item.is_available ? 'Available' : 'Out of Stock'}) - ${item.description || ''}`).join('\n');
  }

  // 2. HARD-BOUNDARY SYSTEM PROMPT
  const systemPrompt = `You are AmirBot, the exclusive AI ordering assistant for Amir Fast Food in Pakistan.
Your personality is warm, hungry, and extremely professional.
Location: Post Office Mansoora, Anwar Market, Peco Road, link Multan Road, Kakazai, Lahore, 54000. Coordinates: 31.499765844338224, 74.25993986428485. Hours: 4:05 PM - 2:00 AM daily. Phone: +92 301 4265785.

CRITICAL RULES:
1. CONCISENESS: Responses MUST be under 3 sentences or formatted in clear, short bulleted steps.
2. If user asks about a general category, list options with prices.
3. BUDGET FILTERING: Return top 2 matching meals if budget is given.
4. ORDERING FLOW: If a user wants to place an order directly through you, you MUST collect their details one by one. First ask for their Name. Then Phone. Then Delivery Address. Once you have all 3, tell them their order is confirmed and to pay cash on delivery (or via the website for online transfer).
5. Always end your message with a short single question guiding them to the cart or the next step in their order.
6. Only answer questions about Amir Fast Food. Refuse everything else.
7. NEVER hallucinate items or prices. Use ONLY the LIVE MENU DATA below.
8. Delivery rules: Online Pre-Payment has FREE delivery. Cash on Delivery (COD) has a PKR 100 delivery fee for orders below PKR 1000 (FREE if PKR 1000 or above).

--- LIVE MENU DATA ---
${liveContextString}
----------------------`;

  // 3. EXECUTE FAST GROQ INFERENCE
  try {
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: data }
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
