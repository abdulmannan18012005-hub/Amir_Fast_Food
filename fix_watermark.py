import re

with open('src/routes/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<div className="absolute top-0 left-0 w-full h-full overflow-hidden flex flex-col justify-center pointer-events-none select-none z-0">.*?</div>\s*</div>'

replacement = '''<div className="absolute top-0 left-0 w-full lg:w-1/2 h-full overflow-hidden flex flex-col justify-center pointer-events-none select-none z-0 pl-4 lg:pl-16">
          <div className="text-[20vw] lg:text-[10vw] font-black leading-[0.8] tracking-tighter opacity-[0.04] text-stroke text-primary">
            AMIR
          </div>
          <div className="text-[20vw] lg:text-[10vw] font-black leading-[0.8] tracking-tighter opacity-[0.04]">
            FAST<br/>FOOD
          </div>
        </div>'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/routes/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
