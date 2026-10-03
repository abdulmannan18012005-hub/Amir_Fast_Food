with open('src/components/chat/AmirBotDrawer.tsx', 'r', encoding='utf-8') as f:
    drawer = f.read()

if "const [toast, setToast]" not in drawer:
    drawer = drawer.replace(
        "const [isTyping, setIsTyping] = useState(false);",
        "const [isTyping, setIsTyping] = useState(false);\n  const [toast, setToast] = useState('');"
    )

toast_logic = """
          if (typeof playSuccessChime !== 'undefined') playSuccessChime();
          setToast(`${item.name} added to cart!`);
          setTimeout(() => setToast(''), 3000);
"""
drawer = drawer.replace("if (typeof playSuccessChime !== 'undefined') playSuccessChime();\n          // Show a quick browser native toast or just let the chat say it", toast_logic)

toast_ui = """
        {/* Slide-up Drawer */}
        {toast && (
          <div className="absolute top-20 right-4 z-[100] bg-emerald-500 text-black px-4 py-3 rounded-lg shadow-lg font-bold flex items-center gap-2 animate-in slide-in-from-right-8 fade-in duration-300">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {toast}
          </div>
        )}
        <div className={`fixed bottom-0 right-0 sm:right-6 sm:bottom-6 w-full max-w-full sm:w-96 h-[600px]"""

drawer = drawer.replace("{/* Slide-up Drawer */}\n        <div className={`fixed bottom-0 right-0 sm:right-6 sm:bottom-6 w-full max-w-full sm:w-96 h-[600px]", toast_ui)

with open('src/components/chat/AmirBotDrawer.tsx', 'w', encoding='utf-8') as f:
    f.write(drawer)
