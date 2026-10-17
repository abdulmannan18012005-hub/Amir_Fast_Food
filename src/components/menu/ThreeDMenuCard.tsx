import React from 'react';
import type { MenuItem } from '../../types';

interface Props {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
  priority?: boolean;
}

export function ThreeDMenuCard({ item, onAddToCart, priority = false }: Props) {
  const savingsPercent = item.original_price
    ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
    : 0;

  return (
    <div className="w-full max-w-sm mx-auto h-full flex flex-col group">
      <div className="relative bg-card rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-border h-full flex flex-col hover:border-primary/50 overflow-hidden">
        
        {/* Save Badge */}
        {item.original_price && savingsPercent > 0 && (
          <div className="absolute top-3 right-3 z-10 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
            Save {savingsPercent}%
          </div>
        )}

        <div className="p-5 flex-1 flex flex-col">
          <div className="aspect-square w-full overflow-hidden rounded-xl mb-4 relative bg-muted">
            <img 
              src={item.image_url || '/placeholder.webp'} 
              alt={item.name}
              width={300}
              height={300}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-2 gap-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight leading-tight flex-1">{item.name}</h3>
              <div className="text-right flex-shrink-0">
                {item.original_price && (
                  <span className="text-muted-foreground line-through text-xs block">
                    PKR {item.original_price.toLocaleString()}
                  </span>
                )}
                <span className="font-bold text-foreground bg-muted border border-border/80 px-2 py-1 rounded text-sm inline-block">
                  PKR {item.price.toLocaleString()}
                </span>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {item.description}
            </p>
          </div>

          <button
            onClick={() => onAddToCart(item)}
            aria-label={`Add ${item.name} to cart`}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-xl transition-colors shadow-sm mt-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
