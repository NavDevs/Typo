'use client';

import React, { useEffect, useRef } from 'react';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '👏'];

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
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

  return (
    <div
      ref={ref}
      className="absolute z-50 flex gap-1 p-2 rounded-xl border border-indigo-500/30 bg-[#0d1530]/90 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 animate-in fade-in zoom-in-95 duration-200"
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => { onSelect(emoji); onClose(); }}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-lg hover:bg-white/10 hover:scale-125 active:scale-95 transition-all duration-150"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
