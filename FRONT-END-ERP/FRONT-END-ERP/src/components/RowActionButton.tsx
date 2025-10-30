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
      title={label}
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
        'row-action-button inline-flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition sm:h-9 sm:w-9',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        tone === 'danger' ? 'row-action-button--danger' : undefined,
        disabled ? 'row-action-button--disabled' : undefined
      )}
    >
      {children}
    </button>
  );
};
