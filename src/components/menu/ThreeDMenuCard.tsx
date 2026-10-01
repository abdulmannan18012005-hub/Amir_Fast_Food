import React, { MouseEvent } from 'react';
import type { MenuItem } from '../../types';

interface Props {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export function ThreeDMenuCard({ item, onAddToCart }: Props) {
  const savingsPercent = item.original_price
    ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
    : 0;

  return (
    <div className="w-full max-w-sm mx-auto h-full flex flex-col group">
      <div className="relative bg-card rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-border h-full flex flex-col hover:border-primary/50 overflow-hidden">
        
        {/* Save Badge */}
        {item.original_price && savingsPercent > 0 && (
          <div className="absolute top-3 right-3 z-10 bg-emerald-500 text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
            Save {savingsPercent}%
          </div>
        )}

        <div className="p-5 flex-1 flex flex-col">
          <div className="aspect-square w-full overflow-hidden rounded-xl mb-4 relative">
            <img 
              src={item.image_url} 
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight leading-tight flex-1 mr-2">{item.name}</h3>
              <div className="text-right flex-shrink-0">
                {item.original_price && (
                  <span className="text-muted-foreground line-through text-xs block">
                    PKR {item.original_price.toLocaleString()}
                  </span>
                )}
                <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded text-sm">
                  PKR {item.price.toLocaleString()}
                </span>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {item.description}
            </p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(item); }}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-xl transition-colors shadow-sm mt-auto"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
