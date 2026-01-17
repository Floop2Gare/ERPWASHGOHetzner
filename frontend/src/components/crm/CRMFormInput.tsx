import clsx from 'clsx';
import { forwardRef } from 'react';

type CRMFormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  className?: string;
};

export const CRMFormInput = forwardRef<HTMLInputElement, CRMFormInputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        className={clsx(
          'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
          error && 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20',
          className
        )}
      />
    );
  }
);

CRMFormInput.displayName = 'CRMFormInput';

