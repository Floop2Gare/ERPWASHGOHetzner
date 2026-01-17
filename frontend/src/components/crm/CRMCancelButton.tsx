import clsx from 'clsx';

type CRMCancelButtonProps = {
  onClick: () => void;
  children?: React.ReactNode;
  className?: string;
};

export const CRMCancelButton = ({ onClick, children = 'Annuler', className }: CRMCancelButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
        className
      )}
    >
      {children}
    </button>
  );
};









