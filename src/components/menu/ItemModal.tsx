import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import type { MenuItem, CartItem, ItemVariant } from '../../types';

interface Props {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export function ItemModal({ item, isOpen, onClose, onAddToCart }: Props) {
  const [selectedVariants, setSelectedVariants] = useState<ItemVariant[]>([]);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedVariants([]);
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, item, onClose]);

  if (!isOpen || !item) return null;

  const dbVariants: ItemVariant[] = Array.isArray(item.variants)
    ? item.variants
        .filter(v => v && typeof v.name === 'string' && v.name.trim().length > 0)
        .map(v => ({ name: v.name.trim(), price: Number(v.price) || 0 }))
    : [];

  const toggleVariant = (variant: ItemVariant) => {
    setSelectedVariants(prev =>
      prev.some(x => x.name === variant.name)
        ? prev.filter(x => x.name !== variant.name)
        : [...prev, variant]
    );
  };

  const handleComplete = () => {
    onAddToCart({
      menu_item_id: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      quantity: 1,
      image_url: item.image_url || '/placeholder.webp',
      variants: selectedVariants,
    });
    onClose();
  };

  const basePrice = Number(item.price) || 0;
  const variantTotal = selectedVariants.reduce((s, u) => s + (Number(u.price) || 0), 0);
  const total = basePrice + variantTotal;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-item-title"
        className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-44 sm:h-48 overflow-hidden relative shrink-0 bg-muted">
          <img
            src={item.image_url || '/placeholder.webp'}
            alt={item.name}
            onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-5">
            <div>
              <h2 id="modal-item-title" className="text-xl sm:text-2xl font-bold text-white">{item.name}</h2>
              <p className="text-xs sm:text-sm text-white/85 font-semibold mt-0.5">Base price: PKR {basePrice.toLocaleString()}</p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close customizer"
            className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {item.description && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          )}

          {dbVariants.length > 0 ? (
            <div className="space-y-2.5">
              <h3 className="font-bold text-sm sm:text-base text-foreground">Available Options &amp; Variants</h3>
              <p className="text-xs text-muted-foreground">Select any options you would like to include.</p>
              <div className="space-y-2">
                {dbVariants.map((variant) => {
                  const checked = selectedVariants.some(x => x.name === variant.name);
                  return (
                    <label
                      key={variant.name}
                      className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer border transition-colors ${
                        checked ? 'bg-primary/10 border-primary' : 'bg-accent/40 hover:bg-accent border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleVariant(variant)}
                          className="w-5 h-5 rounded text-primary accent-primary shrink-0"
                        />
                        <span className="text-foreground font-medium text-sm sm:text-base truncate">{variant.name}</span>
                      </div>
                      <span className="text-primary font-bold text-xs sm:text-sm whitespace-nowrap ml-2">
                        {variant.price > 0 ? `+PKR ${variant.price.toLocaleString()}` : 'Included'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs sm:text-sm text-muted-foreground">
              Standard menu preparation at PKR {basePrice.toLocaleString()}.
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 bg-accent text-foreground font-bold py-3 rounded-xl hover:bg-accent/80 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="w-2/3 bg-emerald-700 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 shadow-md transition-colors text-sm flex items-center justify-center gap-1.5"
            >
              <Check size={16} />
              <span>Add to Cart - PKR {total.toLocaleString()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
