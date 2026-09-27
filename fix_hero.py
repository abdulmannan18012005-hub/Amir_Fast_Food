import re

with open('src/routes/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

hero_replacement = '''<section className="relative bg-background min-h-[80vh] flex items-center pt-24 sm:pt-28 pb-16 lg:py-0">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden flex flex-col justify-center pointer-events-none select-none z-0">
          <div className="text-[15vw] font-black leading-none transform overflow-hidden opacity-[0.03] text-stroke text-primary whitespace-nowrap">
            AMIR FAST FOOD
          </div>
          <div className="text-[15vw] font-black leading-none transform overflow-hidden opacity-[0.03] whitespace-nowrap">
            AMIR FAST FOOD
          </div>
        </div>

        {/* Right side image - full bleed on desktop */}
        <div className="absolute top-0 right-0 w-full lg:w-1/2 h-full z-0 hidden lg:block">
          <img src="https://amirfastfood.vercel.app/assets/hero-food-DECPAvMU.jpg" alt="Amir Fast Food - Shawarma & Burgers" className="w-full h-full object-cover object-center" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 w-full">
          <div className="flex flex-col lg:w-1/2 lg:pr-12">
            <div className="inline-flex items-center gap-2 mb-6 mt-8 lg:mt-0">
              <div className="h-0.5 w-12 bg-primary"></div>
              <span className="text-xs sm:text-sm font-medium uppercase tracking-wider text-primary">Amir Fast Food</span>
            </div>
            
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.1]">
              The flavor that finds you <span className="text-primary">.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-lg">
              Authentic shawarma, smash burgers and irresistible combos. Restaurants, food trailers & delivery — always near you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="/menu" className="w-full sm:w-auto">
                <button className="w-full inline-flex items-center justify-center whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-bold rounded-full transition-all shadow-lg shadow-primary/30">
                  Order Now
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-5 w-5"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </button>
              </a>
              <a href="/menu" className="w-full sm:w-auto">
                <button className="w-full inline-flex items-center justify-center whitespace-nowrap bg-card border border-border text-foreground hover:bg-accent h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-bold rounded-full transition-all">
                  View Menu
                </button>
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-4 sm:gap-6 text-muted-foreground text-sm font-medium">
              <span className="flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Near you</span>
              <span className="flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Ready in 10 mins</span>
              <span className="flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg> Made fresh</span>
            </div>
          </div>
          
          {/* Mobile Image */}
          <div className="mt-12 w-full lg:hidden rounded-2xl overflow-hidden aspect-[4/3] relative">
            <img src="https://amirfastfood.vercel.app/assets/hero-food-DECPAvMU.jpg" alt="Amir Fast Food - Shawarma & Burgers" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>'''

# Need to replace the whole <section className="relative overflow-hidden bg-background pt-24 sm:pt-28 md:pt-32 lg:pt-40 pb-16 sm:pb-20"> ... </section>
pattern = r'<section className="relative overflow-hidden bg-background pt-24 sm:pt-28 md:pt-32 lg:pt-40 pb-16 sm:pb-20">.*?</section>'
content = re.sub(pattern, hero_replacement, content, flags=re.DOTALL)

with open('src/routes/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
