type CRMErrorAlertProps = {
  message: string | null;
  className?: string;
};

export const CRMErrorAlert = ({ message, className }: CRMErrorAlertProps) => {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-800 shadow-sm dark:border-rose-800 dark:bg-rose-900/80 dark:text-rose-100 ${className || ''}`}
    >
      {message}
    </div>
  );
};









