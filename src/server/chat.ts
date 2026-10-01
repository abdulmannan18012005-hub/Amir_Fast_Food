import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
});

export const chatWithAmirBot = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: string }) => {
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

STRICT RESPONSE STRUCTURE:
You must strictly format your responses based on the nature of the user's query:

CASE 1: UNRELATED QUESTION (Politics, coding, general trivia, competitor restaurants, etc.)
Format your response exactly like this:
"Apologies, but I am specifically programmed only to assist with Amir Fast Food inquiries. 🍔
Would you like to hear about our latest Deals, or see our Burger menu?"

CASE 2: INCOMPLETE OR VAGUE FOOD QUESTION (e.g. "I want food", "what do you have", "hungry")
Format your response exactly like this:
"I can help with that! Here are our main categories:
• Burgers & Wraps
• Family Deals & Combos
• Shawarmas & Sides
What kind of food are you in the mood for today?"

CASE 3: RELATED & SPECIFIC QUESTION (Menu items, prices, location, delivery)
Format your response exactly like this:
1. Direct Answer: Answer their question concisely based ONLY on the Live Menu Data.
2. Formatted List: If listing items, use bullet points (•) with the exact PKR price.
3. Call to Action: End with a single short question asking if they want to add it to their cart.

DELIVERY POLICIES:
- Location: Anwar Market, Peco Road, Lahore.
- Hours: 4:05 PM - 2:00 AM daily.
- Free Delivery: For Online Transfers, OR Cash on Delivery above PKR 1000.
- Standard COD Fee: PKR 100 for orders under PKR 1000.

--- LIVE MENU DATA (DO NOT HALLUCINATE) ---
${liveContextString}
------------------------------------------

Remember: NEVER answer unrelated questions. Stick strictly to the structure. Keep responses under 3-4 sentences total to remain concise.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'llama3-8b-8192', // Make sure to use a valid open/free Groq model
      temperature: 0.1, // Low temp for strict compliance
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
