import React from 'react';
import { Link } from '@tanstack/react-router';
import { ChefHat, ListMenu, Clock, Lock } from 'lucide-react';

export function AdminNav() {
  const handleLock = () => {
    sessionStorage.removeItem('admin_pin');
    window.location.reload();
  };

  return (
    <div className="bg-slate-900 border-b border-slate-700 text-white p-4 flex justify-between items-center">
      <div className="flex gap-4 items-center">
        <div className="font-bold text-xl flex items-center gap-2 text-primary">
          <ChefHat /> Admin
        </div>
        <Link to="/admin/kitchen" className="[&.active]:text-primary hover:text-primary transition-colors">Kitchen</Link>
        <Link to="/admin/menu" className="[&.active]:text-primary hover:text-primary transition-colors">Menu</Link>
        <Link to="/admin/history" className="[&.active]:text-primary hover:text-primary transition-colors">History</Link>
      </div>
      <button onClick={handleLock} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors">
        <Lock size={16} /> Lock
      </button>
    </div>
  );
}
