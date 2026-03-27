'use client';

import React, { useEffect, useRef } from 'react';
import { Pencil, Trash2, Reply, SmilePlus } from 'lucide-react';

type ContextMenuItem = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
};

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        ref.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        ref.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: x, top: y }}
      className="z-[80] min-w-[160px] rounded-xl border border-white/10 bg-[#0d1530]/95 backdrop-blur-xl shadow-2xl shadow-black/40 p-1.5 animate-in fade-in zoom-in-95 duration-150"
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => { item.onClick(); onClose(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            item.variant === 'danger'
              ? 'text-white/70 hover:text-rose-400 hover:bg-rose-500/10'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
