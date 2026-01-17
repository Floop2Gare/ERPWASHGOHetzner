import clsx from 'clsx';

type CRMFormLabelProps = {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
};

export const CRMFormLabel = ({ htmlFor, children, required, className }: CRMFormLabelProps) => {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx(
        'mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400',
        className
      )}
    >
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
  );
};

