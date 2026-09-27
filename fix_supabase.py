import re
import os

files = ['src/server/menu.ts', 'src/server/chat.ts']

for file in files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = content.replace('supabaseBrowser()', 'supabaseBrowser')
        content = content.replace("import { getSupabaseServer } from '../lib/supabase'", "import { supabaseBrowser } from '../lib/supabase'")
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
