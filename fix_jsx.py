with open('src/routes/admin/menu.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad = """          <button onClick={handleSaveCategory} className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
            <Check size={20} /> Save All Category Pictures
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Edit Home Page Highlights</h2>"""

good = """          <button onClick={handleSaveCategory} className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
            <Check size={20} /> Save All Category Pictures
          </button>
        </div>
      ) : activeTab === 'categories' ? (
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Edit Home Page Categories</h2>
          <div className="space-y-4">
            {Object.entries(categoryImages).map(([key, url]) => (
              <div key={key} className="flex flex-col md:flex-row gap-4 items-start md:items-center border-b pb-4">
                <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                  <img src={url as string} alt={key} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-sm font-bold text-slate-700 block mb-1">{key.replace('cat_', '').toUpperCase()}</label>
                  <input 
                    type="text" 
                    value={url as string} 
                    onChange={e => setCategoryImages(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-slate-300 rounded p-2 text-sm" 
                  />
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSaveCategory} className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
            <Check size={20} /> Save All Category Pictures
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Edit Home Page Highlights</h2>"""

content = content.replace(bad, good)

with open('src/routes/admin/menu.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
