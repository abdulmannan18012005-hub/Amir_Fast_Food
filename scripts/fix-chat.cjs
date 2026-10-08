const fs = require('fs');
let code = fs.readFileSync('src/server/chat.ts', 'utf8');

// 1. Change menu query to fetch ID and inject it in system prompt
code = code.replace(/.select\('name, price, is_available, category_id, description, variants'\);/, ".select('id, name, price, is_available, category_id, description, variants');");
code = code.replace(/return \`- \$\{item\.name\}/, "return `- ID: ${item.id} | ${item.name}");

code = code.replace(/If they ask to add an item, append exactly: \[ACTION:ADD_CART:Item Name\] or \[ACTION:ADD_CART:Item Name\|2\] for multiple\./, "If they ask to add an item, append exactly: [ACTION:ADD_CART:ID] or [ACTION:ADD_CART:ID|2] for multiple (use the exact UUID from the LIVE MENU).");

// 2. Change GROQ_MODEL fallback and handle decommissioning logic
code = code.replace(/model: process\.env\.GROQ_MODEL \|\| 'openai\/gpt-oss-20b',/, "model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',");
code = code.replace(/\.\.\.\( \(process\.env\.GROQ_MODEL \|\| 'openai\/gpt-oss-20b'\)\.startsWith\('openai\/gpt-oss'\) \? \{ reasoning_effort: 'low' \} : \{\} \),/, ""); // Delete reasoning_effort

// Rewrite fetchCompletion to handle decommissioning and return resolved cart actions
const newFetchCompletion = `
    const fetchCompletion = async (fallbackModel?: string) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await openai.chat.completions.create({
          model: fallbackModel || process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          max_tokens: 1024,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            ...safeHistory,
            { role: 'user', content: trimmedText }
          ],
        }, { signal: controller.signal as any });
        clearTimeout(id);
        return res;
      } catch (err: any) {
        clearTimeout(id);
        // Groq API limits / decommissioning fallback
        if (err.status === 429 || err.message?.includes('rate limit') || err.message?.includes('decommissioned') || err.message?.includes('does not exist')) {
          if (!fallbackModel) return await fetchCompletion('llama3-8b-8192');
        }
        throw err;
      }
    };

    let completion;
    try {
      completion = await fetchCompletion();
    } catch (err: any) {
      completion = await fetchCompletion('llama3-8b-8192');
    }
    
    let text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty model reply');

    // Server-side action resolution
    const resolvedActions: any[] = [];
    const tagRegex = /\\[ACTION:([A-Z_]+)(?::([^\\]]+))?\\]/g;
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      const type = match[1];
      const payload = match[2];
      if (type === 'ADD_CART' && payload) {
        const parts = payload.split('|');
        const id = parts[0].trim();
        const qty = parts.length > 1 ? parseInt(parts[1], 10) : 1;
        const validQty = isNaN(qty) || qty < 1 ? 1 : Math.min(qty, 20);
        
        const { data: item } = await supabase.from('menu_items').select('*').eq('id', id).single();
        if (item) {
          resolvedActions.push({ type: 'ADD_CART', payload: id, item, qty: validQty });
        } else {
          resolvedActions.push({ type: 'NOT_FOUND', payload: id });
        }
      } else {
        resolvedActions.push({ type, payload });
      }
    }

    text = text.replace(/\\[ACTION:([A-Z_]+)(?::([^\\]]+))?\\]/g, '').trim();

    return { reply: text, resolvedActions };
`;

code = code.replace(/const fetchCompletion = async \(\) => \{[\s\S]*?return \{ reply: text \};/, newFetchCompletion);

fs.writeFileSync('src/server/chat.ts', code);
