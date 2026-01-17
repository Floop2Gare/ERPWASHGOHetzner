import clsx from 'clsx';

type CRMBackendStatusProps = {
  loading: boolean;
  error: string | null;
  loadingMessage?: string;
  className?: string;
};

export const CRMBackendStatus = ({
  loading,
  error,
  loadingMessage = 'Synchronisation avec le serveur…',
  className,
}: CRMBackendStatusProps) => {
  if (!loading && !error) {
    return null;
  }

  return (
    <div
      className={clsx(
        'rounded-2xl border px-4 py-3 text-sm shadow-sm',
        loading
          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/30 dark:text-rose-100',
        className
      )}
    >
      {loading ? loadingMessage : error}
    </div>
  );
};

