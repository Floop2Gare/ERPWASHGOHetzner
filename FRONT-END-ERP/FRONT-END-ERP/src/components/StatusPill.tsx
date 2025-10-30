import clsx from 'clsx';

type Status = 'brouillon' | 'envoyé' | 'planifié' | 'réalisé' | 'annulé' | 'actif' | 'inactif';

interface StatusPillProps {
  status: Status;
}

const STATUS_CLASSNAME: Record<Status, string | undefined> = {
  brouillon: undefined,
  inactif: undefined,
  planifié: 'status-pill--primary',
  envoyé: 'status-pill--primary',
  actif: 'status-pill--primary',
  réalisé: 'status-pill--success',
  annulé: 'status-pill--danger',
};

export const StatusPill = ({ status }: StatusPillProps) => (
  <span
    className={clsx(
      'status-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize',
      STATUS_CLASSNAME[status]
    )}
  >
    {status}
  </span>
);
