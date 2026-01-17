type IconProps = {
  className?: string;
};

export const IconEdit = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M4 13.5V16h2.5L15 7.5 12.5 5 4 13.5z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 5.5l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconNote = ({ className }: IconProps) => (
  <svg viewBox="0 0 20 20" className={className ?? 'h-4 w-4'} fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M5 4h10a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1H9l-3 2.5V5a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 7h5" strokeLinecap="round" />
    <path d="M7.5 10h5" strokeLinecap="round" />
  </svg>
);

export const IconCall = ({ className }: IconProps) => (
  <svg viewBox="0 0 20 20" className={className ?? 'h-4 w-4'} fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path
      d="M6.5 4.5c.5-1 1.5-1 2 0l1 2c.3.6.1 1.3-.4 1.7l-.8.6c.8 1.5 2 2.7 3.5 3.5l.6-.8c.4-.5 1.1-.7 1.7-.4l2 1c1 .5 1 1.5 0 2l-1.2.6c-.6.3-1.3.4-1.9.2-3.3-1.1-5.9-3.7-7-7-.2-.6-.1-1.3.2-1.9l.6-1.2z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconDocument = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M6 3.5h5.5L15.5 7v9.5H6a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11.5 3.5V7H15.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 10.5h5" strokeLinecap="round" />
    <path d="M7.5 13.5h3" strokeLinecap="round" />
  </svg>
);

export const IconService = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path
      d="M11 4.5a2.5 2.5 0 1 1-4.1 1.8L4.5 8.7v2.1l2.7.7a2.5 2.5 0 1 1-.2 1.4L4.5 13.7v-1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M13.5 4.5l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15.5 6.5H10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconClock = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <circle cx="10" cy="10" r="6.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 6.5v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconConvert = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M5.5 6.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.5 16.5c.3-2.4 2.4-4.2 5-4.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 12.3h4m0 0-1.5-1.5M15 12.3l-1.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconTrash = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M4.5 5.5h11" strokeLinecap="round" />
    <path d="M8 5.5V4.5c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 5.5V15a1 1 0 0 0 1 1H12a1 1 0 0 0 1-1V5.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.5 8.5V13" strokeLinecap="round" />
    <path d="M11.5 8.5V13" strokeLinecap="round" />
  </svg>
);

export const IconMail = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M3.5 5.5h13a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 6l6.5 5L17 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconPhone = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path
      d="M6 2.5h2.5a1 1 0 0 1 1 1V5a1 1 0 0 1-.3.7L8 6.9c.6 1.6 1.9 3 3.5 3.5l1.2-1.2A1 1 0 0 1 13.5 9h1.5a1 1 0 0 1 1 1v2.5a1 1 0 0 1-1 1A11.5 11.5 0 0 1 3.5 5a1 1 0 0 1 1-1h1.5z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconArchive = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M4.5 4.5h11l1 2v1h-13l1-3z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 8.5h9v6a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-6z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.5 11.5h3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconPlus = ({ className }: IconProps) => (
  <svg viewBox="0 0 20 20" className={className ?? 'h-4 w-4'} fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M10 4.5v11" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 10h11" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconDuplicate = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M7 5.5h8v8h-8z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 7.5v8h8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconReceipt = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path
      d="M6 3.5h8l1.5 2v10l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1v-12z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 7h5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 10h5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 13h3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconPrinter = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M6 5.5v-2h8v2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 7.5h10a1 1 0 0 1 1 1v4h-2v3H6v-3H4v-4a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 12.5h6" strokeLinecap="round" />
  </svg>
);

export const IconPaperPlane = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path d="M3.5 9.5 16.5 3.5l-4 13-3-5-5-2z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 11.5 16.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type IconRefreshProps = IconProps & {
  isSpinning?: boolean;
};

export const IconRefresh = ({ className, isSpinning = false }: IconRefreshProps) => (
  <svg
    viewBox="0 0 20 20"
    className={`${className ?? 'h-4 w-4'} ${isSpinning ? 'animate-spin' : ''}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.4}
  >
    <path
      d="M3.5 10a6.5 6.5 0 0 1 11.2-4.5M16.5 10a6.5 6.5 0 0 1-11.2 4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M3.5 6.5v4h4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.5 13.5v-4h-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
