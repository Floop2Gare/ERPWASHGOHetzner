import { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  tone?: 'surface' | 'tint' | 'accent';
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
  children: ReactNode;
}

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'p-3 sm:p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

const toneClassMap: Record<NonNullable<CardProps['tone']>, string> = {
  surface: 'card',
  tint: 'card card--tint',
  accent: 'card card--accent',
};

const titleClass = 'card__title text-sm font-semibold';
const descriptionClass = 'card__description mt-1 text-[12px]';
const actionClass = 'card__action text-sm';

export const Card = ({
  title,
  description,
  action,
  children,
  padding = 'md',
  tone = 'surface',
  className,
  onClick,
  style,
}: CardProps) => {
  const containerClasses = clsx(
    toneClassMap[tone],
    paddingMap[padding],
    'rounded-2xl transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
    onClick && 'cursor-pointer hover:-translate-y-0.5',
    className
  );

  const resolvedTitle =
    typeof title === 'string' ? <h2 className={titleClass}>{title}</h2> : title;
  const resolvedDescription =
    typeof description === 'string' ? <p className={descriptionClass}>{description}</p> : description;
  const resolvedAction =
    typeof action === 'string' ? <span className={actionClass}>{action}</span> : action;

  return (
    <section
      className={containerClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={style}
    >
      {(title || description || action) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && resolvedTitle}
            {description && resolvedDescription}
          </div>
          {resolvedAction && <div className="flex-shrink-0 text-right">{resolvedAction}</div>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
};
