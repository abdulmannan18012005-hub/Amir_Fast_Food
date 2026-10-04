import os
import glob

def replace_in_file(filepath, old, new):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

src_files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

for file in src_files:
    if file.endswith('storage.ts'):
        continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    changed = False
    if "safeJson('admin_pin', '')" in content:
        content = content.replace("safeJson('admin_pin', '')", "getRawSession('admin_pin') || ''")
        changed = True
        
    if "import { safeJson } from" in content:
        # We need to see if it needs getRawSession
        if changed and "getRawSession" not in content:
            content = content.replace("import { safeJson } from", "import { safeJson, getRawSession } from")
            
    if "safeJson('active_order', '')" in content:
        # Will completely rewrite OrderTracker and AmirBotDrawer anyway.
        pass
        
    if changed:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
