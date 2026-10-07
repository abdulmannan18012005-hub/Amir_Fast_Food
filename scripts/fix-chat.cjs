const fs = require('fs');
let c = fs.readFileSync('src/server/chat.ts', 'utf8');
c = c.replace(/max_tokens: 500,/g, `max_completion_tokens: 1024,
            ...( (process.env.GROQ_MODEL || 'openai/gpt-oss-20b').startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {} ),`);
c = c.replace(/temperature: 0\.2,/g, 'temperature: 0.4,');
fs.writeFileSync('src/server/chat.ts', c);
console.log('Fixed chat.ts');
