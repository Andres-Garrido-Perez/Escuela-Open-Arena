import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog container: bottom-sheet on mobile, centered modal on desktop */}
      <div
        className={`relative w-full ${maxWidth} bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all z-10 max-h-[92dvh] sm:max-h-[85vh] flex flex-col my-0 sm:my-8`}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header (rendered only when title or subtitle is provided) */}
        {(title || subtitle) ? (
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 sm:p-1.5 rounded-xl transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Content with dynamic scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
