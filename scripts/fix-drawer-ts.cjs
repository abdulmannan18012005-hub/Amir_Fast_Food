const fs = require('fs');
let code = fs.readFileSync('src/components/chat/AmirBotDrawer.tsx', 'utf8');

code = code.replace(/return saved;/, "return saved as { role: 'user' | 'bot' | 'system', text: string }[];");
fs.writeFileSync('src/components/chat/AmirBotDrawer.tsx', code);
