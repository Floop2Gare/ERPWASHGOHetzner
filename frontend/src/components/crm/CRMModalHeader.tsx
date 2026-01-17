import { X } from 'lucide-react';
import clsx from 'clsx';

type CRMModalHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  onClose: () => void;
  className?: string;
};

export const CRMModalHeader = ({ eyebrow, title, description, onClose, className }: CRMModalHeaderProps) => {
  return (
    <div className={clsx('relative flex flex-col gap-1.5 pb-3 mb-0.5 border-b border-slate-200 dark:border-slate-700', className)}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-0 right-0 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="space-y-1 pr-10">
        {eyebrow && (
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">{eyebrow}</span>
        )}
        <h2 className={clsx("text-xl font-bold", (title === 'Nouvel utilisateur' || title === 'Nouveau prospect' || title.toLowerCase().includes('nouveau prospect') || title === 'Nouvel achat' || title === 'Modifier un achat' || title.toLowerCase().includes('achat')) ? 'text-slate-900 dark:text-slate-100' : 'text-blue-700 dark:text-blue-300')}>{title}</h2>
        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
};

