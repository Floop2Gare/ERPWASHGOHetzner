import clsx from 'clsx';

type CRMFeedbackProps = {
  message: string | null;
  type?: 'info' | 'success' | 'error';
  className?: string;
};

export const CRMFeedback = ({ message, type = 'info', className }: CRMFeedbackProps) => {
  if (!message) {
    return null;
  }

  const isInfo = message.startsWith('info:');
  const cleanMessage = isInfo ? message.replace('info:', '') : message;
  const isSuccess =
    message.includes('mis à jour') ||
    message.includes('créé') ||
    message.includes('exporté') ||
    message.includes('Import');

  return (
    <div
      className={clsx(
        'rounded-2xl border px-4 py-3 text-sm shadow-sm',
        isInfo || type === 'info'
          ? 'border-slate-200 bg-transparent text-slate-600 dark:border-slate-700 dark:text-slate-400'
          : isSuccess || type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-200'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/30 dark:text-rose-100',
        className
      )}
    >
      {cleanMessage}
    </div>
  );
};

