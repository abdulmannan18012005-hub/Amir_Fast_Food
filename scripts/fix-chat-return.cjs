const fs = require('fs');
let c = fs.readFileSync('src/server/chat.ts', 'utf8');
c = c.replace(/return \{\s*reply: completion\.choices\[0\]\?.message\?.content \|\| \"I couldn\'t process that\. Try asking about our Crispy Zinger!\"\s*\};/g, `const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty model reply');
    return { reply: text };`);
fs.writeFileSync('src/server/chat.ts', c);
console.log('Fixed chat.ts return');
