import re

with open('src/routes/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix cat_specials image URL
content = content.replace(
    "'https://images.unsplash.com/photo-1544025162-811114215b80?auto=format&fit=crop&w=300&q=80'",
    "'https://images.unsplash.com/photo-1594221708734-ea4b0e4d45c0?auto=format&fit=crop&w=300&q=80'"
)

# 2. Remove watermark div
# It looks like:
# <div className="absolute top-0 right-0 w-full lg:w-1/2 h-full overflow-hidden flex flex-col justify-center items-end pointer-events-none select-none z-10 pr-4 lg:pr-16 text-right">
#   <div className="text-[20vw] lg:text-[10vw] font-black leading-[0.8] tracking-tighter opacity-[0.04] text-stroke text-primary">
#     AMIR
#   </div>
#   <div className="text-[20vw] lg:text-[10vw] font-black leading-[0.8] tracking-tighter opacity-[0.04]">
#     FAST<br/>FOOD
#   </div>
# </div>
watermark_pattern = r'<div className="absolute top-0 right-0 w-full lg:w-1/2 h-full overflow-hidden flex flex-col justify-center items-end pointer-events-none select-none z-10 pr-4 lg:pr-16 text-right">.*?FAST<br/>FOOD\s*</div>\s*</div>'
content = re.sub(watermark_pattern, '', content, flags=re.DOTALL)

with open('src/routes/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
