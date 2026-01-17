import { Trash2, Send, Printer, X } from 'lucide-react';
import clsx from 'clsx';

type BulkAction = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  className?: string;
};

type CRMBulkActionsProps = {
  selectedCount: number;
  actions: BulkAction[];
  onClearFilters?: () => void;
  className?: string;
};

export const CRMBulkActions = ({
  selectedCount,
  actions,
  onClearFilters,
  className,
}: CRMBulkActionsProps) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={clsx('flex flex-wrap items-center gap-2 border-l border-slate-200 pl-4 dark:border-slate-700', className)}>
      <span className="text-sm text-slate-600 dark:text-slate-400">{selectedCount} sélectionné(s)</span>
      {actions.map((action, index) => {
        const Icon = action.icon;
        const isDanger = action.variant === 'danger';
        return (
          <button
            key={index}
            type="button"
            onClick={action.onClick}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
              isDanger
                ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30'
                : 'text-slate-700 hover:bg-white hover:border hover:border-slate-200 dark:text-slate-200 dark:hover:bg-white dark:hover:text-slate-700',
              action.className
            )}
          >
            {Icon && <span className="h-4 w-4">{Icon}</span>}
            {action.label}
          </button>
        );
      })}
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <X className="h-4 w-4" />
          Effacer les filtres
        </button>
      )}
    </div>
  );
};

