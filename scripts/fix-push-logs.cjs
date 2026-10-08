const fs = require('fs');
let code = fs.readFileSync('src/server/push.ts', 'utf8');

code = code.replace(/console\.warn\("Error sending push:", e\);/g, "console.error('Push Notification Error (Customer):', e instanceof Error ? e.stack : e);");
code = code.replace(/console\.warn\('Admin push error:', e\);/g, "console.error('Push Notification Error (Admin):', e instanceof Error ? e.stack : e);");
code = code.replace(/} catch \(err: any\) \{\s*if \(err\.statusCode === 410/g, "} catch (err: any) {\n        console.error('Push delivery failed for endpoint ' + sub.endpoint, err);\n        if (err.statusCode === 410");

fs.writeFileSync('src/server/push.ts', code);
