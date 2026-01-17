import { ButtonHTMLAttributes, DetailedHTMLProps } from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'subtle';
type ButtonSize = 'xs' | 'sm' | 'md';

type ButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'border-primary bg-primary text-white hover:bg-primary/90',
  secondary:
    'border-slate-300/80 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900',
  ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100/70',
  outline:
    'border-slate-300 bg-transparent text-slate-700 hover:border-slate-400 hover:text-slate-900',
  subtle: 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200/70',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-3 py-1 text-[11px] uppercase tracking-[0.18em]',
  sm: 'px-3 py-1.5 text-xs font-semibold',
  md: 'px-4 py-2 text-sm font-semibold',
};

export const Button = ({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) => {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-soft border transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
};
