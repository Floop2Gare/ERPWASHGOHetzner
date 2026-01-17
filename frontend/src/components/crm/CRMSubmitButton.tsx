import clsx from 'clsx';
import { Plus, Edit2 } from 'lucide-react';

type CRMSubmitButtonProps = {
  children: React.ReactNode;
  type?: 'create' | 'update';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

export const CRMSubmitButton = ({
  children,
  type = 'create',
  disabled,
  onClick,
  className,
}: CRMSubmitButtonProps) => {
  const Icon = type === 'create' ? Plus : Edit2;

  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
};

