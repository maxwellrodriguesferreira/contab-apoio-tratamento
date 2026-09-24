import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', title?: string, duration: number = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastMessage = { id, type, title, message, duration };
      
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-modal border transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-top-4 ${
              t.type === 'success'
                ? 'bg-surface-container-lowest border-emerald-500/30 text-on-surface'
                : t.type === 'error'
                ? 'bg-surface-container-lowest border-rose-500/40 text-on-surface'
                : t.type === 'warning'
                ? 'bg-surface-container-lowest border-amber-500/40 text-on-surface'
                : 'bg-surface-container-lowest border-sky-500/40 text-on-surface'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${
                t.type === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : t.type === 'error'
                  ? 'bg-rose-100 text-rose-700'
                  : t.type === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-sky-100 text-sky-700'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {t.type === 'success'
                  ? 'check_circle'
                  : t.type === 'error'
                  ? 'error'
                  : t.type === 'warning'
                  ? 'warning'
                  : 'info'}
              </span>
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              {t.title && <span className="font-bold text-sm text-on-surface">{t.title}</span>}
              <span className="text-sm text-on-surface-variant break-words">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-outline hover:text-on-surface p-1 rounded transition-colors"
              aria-label="Fechar notificação"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
