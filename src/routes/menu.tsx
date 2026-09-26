import { createFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';
import { ThreeDMenuCard } from '../components/menu/ThreeDMenuCard';
import type { MenuItem } from '../types';

export const Route = createFileRoute('/menu')({
  component: MenuPage,
});

function MenuPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Placeholder static data for scaffold
  const items: MenuItem[] = [
    {
      id: '1', category_id: 'cat_burgers', sub_category: 'Crispy Zingers',
      name: 'Ultimate Crispy Zinger', description: 'Crispy fillet, iceberg lettuce, signature mayo.',
      price: 550, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      is_available: true, variants: [], created_at: new Date().toISOString()
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Our Menu</h1>
          <p className="text-muted-foreground mt-2">Discover 3D interactive flavors.</p>
        </div>
        
        <div className="w-full md:w-auto relative">
          <input 
            type="text" 
            placeholder="Search burgers, pizzas..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-80 bg-card border border-border text-foreground rounded-full py-3 px-6 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
          />
        </div>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4 mb-8 scrollbar-hide">
        <button className="whitespace-nowrap px-6 py-2 rounded-full bg-primary text-foreground font-bold">All Items</button>
        <button className="whitespace-nowrap px-6 py-2 rounded-full bg-card text-muted-foreground font-medium hover:bg-muted">Burgers</button>
        <button className="whitespace-nowrap px-6 py-2 rounded-full bg-card text-muted-foreground font-medium hover:bg-muted">Broast</button>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {items.map(item => (
          <ThreeDMenuCard 
            key={item.id} 
            item={item} 
            onAddToCart={(i) => console.log('Added:', i.name)} 
          />
        ))}
      </section>
    </div>
  );
}
