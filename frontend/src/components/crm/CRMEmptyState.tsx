import { Search } from 'lucide-react';
import clsx from 'clsx';

type CRMEmptyStateProps = {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  className?: string;
};

export const CRMEmptyState = ({
  icon,
  title = 'Aucun résultat trouvé',
  message = 'Ajustez votre recherche ou vos filtres pour retrouver vos résultats.',
  className,
}: CRMEmptyStateProps) => {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className
      )}
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        {icon || <Search className="h-8 w-8 text-slate-400 dark:text-slate-500" />}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
};

