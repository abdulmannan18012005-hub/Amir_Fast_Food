import React, { useState, useRef, MouseEvent } from 'react';
import type { MenuItem } from '../../types';

interface Props {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export function ThreeDMenuCard({ item, onAddToCart }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element
    const y = e.clientY - rect.top; // y position within the element
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Rotate max 15 degrees
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div 
      className="perspective-1000 w-full max-w-sm mx-auto"
      style={{ perspective: '1000px' }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="relative bg-slate-900 rounded-2xl shadow-xl transition-all duration-200 ease-out preserve-3d cursor-pointer border border-slate-800"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Glow Effect */}
        <div 
          className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.15), transparent 70%)',
            opacity: isHovered ? 1 : 0,
            transform: 'translateZ(1px)'
          }}
        />

        <div className="p-5" style={{ transform: 'translateZ(30px)' }}>
          <img 
            src={item.image_url} 
            alt={item.name}
            className="w-full h-48 object-cover rounded-xl shadow-lg mb-4"
            style={{ transform: 'translateZ(45px)' }}
          />
          
          <div style={{ transform: 'translateZ(20px)' }}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-white tracking-tight">{item.name}</h3>
              <span className="text-amber-500 font-semibold bg-amber-500/10 px-2 py-1 rounded text-sm">
                PKR {item.price}
              </span>
            </div>
            
            <p className="text-slate-400 text-sm mb-4 line-clamp-2">
              {item.description}
            </p>
          </div>

          <button
            onClick={() => onAddToCart(item)}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-red-600/20"
            style={{ transform: 'translateZ(40px)' }}
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}
