import { ReactNode } from 'react';
import clsx from 'clsx';
import { useWorkspaceModule } from '../../workspace/WorkspaceLayout';

type AccountingPageLayoutProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  heroChips?: HeroChip[];
  children: ReactNode;
};

type HeroChip = {
  id: string;
  label: string;
  value: ReactNode;
};

export const AccountingPageLayout = ({ title, description, actions, heroChips, children }: AccountingPageLayoutProps) => {
  const module = useWorkspaceModule();
  const resolvedDescription = description ?? module.description;

  return (
    <div className="dashboard-page space-y-8 sm:space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content lg:flex lg:items-start lg:justify-between lg:gap-6">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">
              {module.name}
            </p>
            <h1 className="dashboard-hero__title">{title}</h1>
            {resolvedDescription ? (
              <p className="dashboard-hero__subtitle">{resolvedDescription}</p>
            ) : null}
          </div>
          {actions ? (
            <div
              className={clsx(
                'mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-row sm:justify-end',
                'md:max-w-sm'
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      {heroChips?.length ? (
        <nav className="dashboard-secondary-bar">
          <div className="dashboard-secondary-bar__content">
            <div className="dashboard-secondary-bar__left">
              <span className="dashboard-secondary-bar__label">Indicateurs</span>
            </div>
            <div className="dashboard-secondary-bar__chips">
              {heroChips.map((chip) => (
                <span key={chip.id} className="dashboard-secondary-bar__chip">
                  <span className="dashboard-secondary-bar__chip-value">{chip.value}</span>
                  <span className="dashboard-secondary-bar__chip-label">{chip.label}</span>
                </span>
              ))}
            </div>
          </div>
        </nav>
      ) : null}

      <div className="space-y-6 sm:space-y-8">{children}</div>
    </div>
  );
};



