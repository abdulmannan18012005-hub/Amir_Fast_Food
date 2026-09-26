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
  
  // Example RAG flow:
  // 1. Get embedding for query (if supported/needed, skipping for direct completion for now)
  // 2. Query public.restaurant_knowledge using pgvector
  // 3. Generate response using Groq gpt-oss-20b
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'You are AmirBot, an AI assistant for Amir Fast Food.' },
        { role: 'user', content: data }
      ],
    });
    
    return {
      reply: completion.choices[0]?.message?.content || `I received your query: "${data}", but couldn't generate a response.`
    };
  } catch (error: any) {
    console.error('Groq API Error:', error);
    throw new Error('Failed to communicate with AI Assistant.');
  }
});
