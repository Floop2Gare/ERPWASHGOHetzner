import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

type CatalogModalLayoutProps = {
  isOpen: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
};

export const CatalogModalLayout = ({
  isOpen,
  onClose,
  eyebrow,
  title,
  description,
  children,
  footer,
  maxWidth = '2xl',
}: CatalogModalLayoutProps) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-[1200px]', // Modal plus large pour layout 2 colonnes
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={clsx(
          'relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition dark:border-slate-700 dark:bg-slate-900',
          maxWidthClasses[maxWidth],
          'max-h-[90vh] flex flex-col'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex flex-col gap-2 px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="pr-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              {eyebrow}
            </span>
            <h2 className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-4">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {footer}
        </div>
      </div>
    </div>,
    document.body
  );
};
