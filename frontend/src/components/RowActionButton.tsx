import { ReactNode } from 'react';
import clsx from 'clsx';

interface RowActionButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export const RowActionButton = ({ label, onClick, children, tone = 'default', disabled = false }: RowActionButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) {
          return;
        }
        onClick();
      }}
      disabled={disabled}
      className={clsx(
        'row-action-button group relative inline-flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition sm:h-8 sm:w-8',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        tone === 'danger' ? 'row-action-button--danger' : undefined,
        disabled ? 'row-action-button--disabled' : undefined
      )}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden className="inline-flex items-center justify-center">
        {children}
      </span>
      <span
        role="tooltip"
        className="row-action-button__tooltip pointer-events-none absolute right-1/2 top-full z-20 mt-1 hidden min-w-[6rem] translate-x-1/2 rounded-md bg-slate-900/95 px-2 py-1 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-white opacity-0 transition group-hover:flex group-hover:opacity-100"
      >
        {label}
      </span>
    </button>
  );
};
