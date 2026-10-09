import dotenv from 'dotenv';
dotenv.config();

console.log('=== AmirBot V9 Verification Test ===\n');

// 1. Verify code has no references to dead models
import fs from 'fs';
const chatSource = fs.readFileSync('src/server/chat.ts', 'utf8');

const deadModels = ['llama3-8b-8192', 'llama-3.1-8b-instant'];
let deadFound = false;
for (const dead of deadModels) {
  if (chatSource.includes(dead)) {
    console.error(`❌ FAILED: Dead model "${dead}" is still referenced in src/server/chat.ts`);
    deadFound = true;
  }
}
if (!deadFound) {
  console.log('✅ PASS: No dead models found in src/server/chat.ts');
}

// 2. Verify primary model is openai/gpt-oss-20b
if (chatSource.includes("'openai/gpt-oss-20b'")) {
  console.log('✅ PASS: Primary model is set to openai/gpt-oss-20b');
} else {
  console.error('❌ FAILED: Primary model is NOT openai/gpt-oss-20b');
}

// 3. Verify client drawer does not query supabaseBrowser for actions
const drawerSource = fs.readFileSync('src/components/chat/AmirBotDrawer.tsx', 'utf8');
if (drawerSource.includes('supabaseBrowser') || drawerSource.includes('.ilike(')) {
  console.error('❌ FAILED: AmirBotDrawer still has client-side Supabase queries');
} else {
  console.log('✅ PASS: AmirBotDrawer uses server-resolved actions only (no client-side Supabase query)');
}

// 4. Verify Groq API call if key is present
const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.log('⚠️ GROQ_API_KEY not found in local env. Skipping live Groq completion test.');
} else {
  console.log('\nTesting live Groq API with model openai/gpt-oss-20b...');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        max_completion_tokens: 100,
        messages: [
          { role: 'system', content: 'You are AmirBot. Reply in plain text only.' },
          { role: 'user', content: 'Where is your shop located?' }
        ]
      })
    });

    if (res.ok) {
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      console.log('✅ PASS: Groq API responded successfully!');
      console.log('Sample response:', reply?.trim());
    } else {
      const errText = await res.text();
      console.log(`⚠️ Groq API responded with status ${res.status}:`, errText);
    }
  } catch (err) {
    console.log('⚠️ Network call to Groq failed:', err.message);
  }
}

console.log('\n=== Test Complete ===');
