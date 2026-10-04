import os

path = "src/components/chat/AmirBotDrawer.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

bad_regex = r"/\\[ACTION:([A-Z_]+)(?::([^\\]]+))?\\]/g"
good_regex = r"/\[ACTION:([A-Z_]+)(?::([^\]]+))?\]/g"

code = code.replace(bad_regex, good_regex)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)
