import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import clsx from 'clsx';

type CRMModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | '7xl' | '9xl' | 'full';
};

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  '9xl': 'max-w-[90rem]',
  'full': 'max-w-[95vw]',
};

export const CRMModal = ({
  isOpen,
  onClose,
  children,
  className,
  maxWidth = '2xl',
}: CRMModalProps) => {
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

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4",
        maxWidth === '9xl' ? 'py-1' : 'py-4'
      )}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={clsx(
          'relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900',
          maxWidthClasses[maxWidth],
          maxWidth === '9xl' ? 'max-h-[98vh]' : 'max-h-[90vh]',
          className
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

