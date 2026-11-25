import React from 'react';
import type { MenuItem } from '../../types';

interface Props {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
  priority?: boolean;
}

export function ThreeDMenuCard({ item, onAddToCart, priority = false }: Props) {
  const isAvailable = item.is_available !== false;
  const savingsPercent = item.original_price && item.original_price > item.price
    ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
    : 0;

  return (
    <div className="w-full max-w-md mx-auto md:max-w-none h-full flex flex-col group">
      <div className="relative bg-card rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-border h-full flex flex-col hover:border-primary/50 overflow-hidden">
        
        {/* Save Badge */}
        {item.original_price && savingsPercent > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10 bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
            Save {savingsPercent}%
          </div>
        )}

        <div className="p-3.5 md:p-4 flex-1 flex flex-col">
          <div className="h-40 sm:h-44 md:h-auto md:aspect-[4/3] w-full overflow-hidden rounded-xl mb-2.5 md:mb-3 relative bg-muted shrink-0">
            <img 
              src={item.image_url || '/placeholder.webp'} 
              alt={item.name}
              width={400}
              height={300}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-1.5 gap-2">
              <h3 className="text-base md:text-lg font-bold text-foreground tracking-tight leading-snug flex-1">
                {item.name}
              </h3>
              <div className="text-right flex-shrink-0">
                {item.original_price && item.original_price > item.price && (
                  <span className="text-muted-foreground line-through text-[11px] block leading-none mb-0.5">
                    PKR {item.original_price.toLocaleString()}
                  </span>
                )}
                <span className="font-bold text-foreground bg-muted border border-border/80 px-2 py-0.5 rounded text-xs md:text-sm inline-block whitespace-nowrap">
                  PKR {item.price.toLocaleString()}
                </span>
              </div>
            </div>
            
            {item.description && (
              <p className="text-muted-foreground text-xs md:text-sm mb-3 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={!isAvailable}
            onClick={() => isAvailable && onAddToCart(item)}
            aria-label={isAvailable ? `Add to Cart, ${item.name}` : `${item.name} is currently unavailable`}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 px-3.5 text-sm rounded-xl transition-colors shadow-sm mt-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAvailable ? 'Add to Cart' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
}