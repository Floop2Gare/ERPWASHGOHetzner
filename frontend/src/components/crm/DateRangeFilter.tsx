import { useEffect } from 'react';
import clsx from 'clsx';

type DateRangeFilterProps = {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  className?: string;
};

/**
 * Composant de filtre de période avec sélection de dates
 * Par défaut, affiche le mois en cours (du 1er au dernier jour)
 * Permet de choisir n'importe quelle période (1 jour, 3 jours, 1 an, etc.)
 */
export const DateRangeFilter = ({ startDate, endDate, onChange, className }: DateRangeFilterProps) => {
  // Fonction pour obtenir le premier et dernier jour du mois en cours
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      start: formatDate(firstDay),
      end: formatDate(lastDay),
    };
  };

  // Initialiser avec le mois en cours si les dates ne sont pas définies
  useEffect(() => {
    if (!startDate || !endDate) {
      const { start, end } = getCurrentMonthRange();
      onChange(start, end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            const newStartDate = e.target.value;
            if (newStartDate && endDate && newStartDate > endDate) {
              // Si la date de début est après la date de fin, ajuster la date de fin
              onChange(newStartDate, newStartDate);
            } else {
              onChange(newStartDate, endDate);
            }
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <span className="text-xs text-slate-500 dark:text-slate-400">au</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            const newEndDate = e.target.value;
            if (startDate && newEndDate && startDate > newEndDate) {
              // Si la date de fin est avant la date de début, ajuster la date de début
              onChange(newEndDate, newEndDate);
            } else {
              onChange(startDate, newEndDate);
            }
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
    </div>
  );
};

