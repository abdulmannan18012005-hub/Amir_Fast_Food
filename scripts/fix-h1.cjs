const fs = require('fs');
let code = fs.readFileSync('src/routes/__root.tsx', 'utf8');
code = code.replace(/<h1 className="sr-only">Amir Fast Food<\/h1>/, "<span className=\"sr-only\">Amir Fast Food</span>");
fs.writeFileSync('src/routes/__root.tsx', code);
