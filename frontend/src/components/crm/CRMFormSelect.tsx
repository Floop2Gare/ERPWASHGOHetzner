import clsx from 'clsx';
import { forwardRef } from 'react';

type CRMFormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  className?: string;
};

export const CRMFormSelect = forwardRef<HTMLSelectElement, CRMFormSelectProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        {...props}
        className={clsx(
          'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
          error && 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20',
          className
        )}
      />
    );
  }
);

CRMFormSelect.displayName = 'CRMFormSelect';

