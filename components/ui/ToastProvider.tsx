'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Toast = {
  id: string;
  message: string;
  type?: 'success' | 'error';
};

interface ToastContextType {
  toast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-[280px] max-w-sm px-5 py-4 rounded-xl border shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 fade-in duration-300 ${
              t.type === 'error' 
                ? 'bg-red-950/40 border-red-500/30 text-red-100' 
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 text-sm font-medium tracking-wide">
                {t.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
