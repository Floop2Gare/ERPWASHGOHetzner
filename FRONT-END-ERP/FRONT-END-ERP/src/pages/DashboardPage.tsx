import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  format,
  isWithinInterval,
  startOfWeek,
  subDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';

import { useAppData } from '../store/useAppData';
import { formatCurrency, formatDuration } from '../lib/format';

const PrestationsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M20 6 10 16l-4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 20h12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RevenueIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path
      d="M12 3v18m4-14H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DurationIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const QuoteIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M6 4h9l3 3v13H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 4v3h3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ServicesIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 12h8M8 16h8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PurchasesIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path
      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM20 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DocumentsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LeadsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClientsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlanningIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StatsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 21h18" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="14" r="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="2" r="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="18" cy="10" r="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8.5" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 8v6M23 11l-3 3-3-3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="m3 10 14-7-4 7 4 7-14-7Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPhone = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path
      d="M6 3h-.5a1.5 1.5 0 0 0-1.5 1.6 14.5 14.5 0 0 0 12.4 12.4A1.5 1.5 0 0 0 17 15.5V15a2 2 0 0 0-1.7-2L12.5 12a1 1 0 0 0-1 .3L10 13a11 11 0 0 1-3-3l0 0 1-1.5a1 1 0 0 0 .1-1l-1-2.8A2 2 0 0 0 6 3Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconMail = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M3 5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    <path d="m3 6 7 5 7-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const followUpThresholdDays = 7;

type QuickLinkThemeVars = CSSProperties & {
  '--ql-bg': string;
  '--ql-border': string;
  '--ql-border-hover': string;
  '--ql-icon-bg': string;
  '--ql-icon-color': string;
  '--ql-text': string;
  '--ql-text-rgb'?: string;
  '--ql-shadow': string;
};

type QuickLinkPalette = {
  accentBg: string;
  accentBorder: string;
  accentHover: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  shadow: string;
};

type QuickLinkDefinition = {
  label: string;
  to: string;
  description: string;
  icon: JSX.Element;
  palette: {
    light: QuickLinkPalette;
    dark: QuickLinkPalette;
  };
};

const colorToRgbChannels = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }

    if (hex.length === 6) {
      const bigint = Number.parseInt(hex, 16);
      if (Number.isFinite(bigint)) {
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `${r} ${g} ${b}`;
      }
    }
  }

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(',')
      .map((part) => Number.parseFloat(part.trim()))
      .slice(0, 3);

    if (parts.every((part) => Number.isFinite(part))) {
      return parts.map((part) => Math.round(part)).join(' ');
    }
  }

  return undefined;
};

const DashboardPage = () => {
  const {
    engagements,
    computeEngagementTotals,
    leads,
    recordEngagementSend,
    updateEngagement,
    clients,
    services,
    recordLeadActivity,
    updateLead,
    userProfile,
    theme,
  } = useAppData();

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const servicesById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);

  const completedEngagements = engagements.filter((engagement) => engagement.status === 'réalisé');
  const totalPrestations = completedEngagements.length;
  const totalRevenue = completedEngagements.reduce((sum, engagement) => {
    const totals = computeEngagementTotals(engagement);
    return sum + totals.price + totals.surcharge;
  }, 0);
  const totalDurationMinutes = completedEngagements.reduce((sum, engagement) => {
    const totals = computeEngagementTotals(engagement);
    return sum + totals.duration;
  }, 0);

  const quotesToSend = engagements
    .filter(
      (engagement) =>
        engagement.kind === 'devis' &&
        engagement.status !== 'envoyé' &&
        engagement.status !== 'annulé' &&
        engagement.sendHistory.length === 0
    )
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .map((engagement) => {
      const totals = computeEngagementTotals(engagement);
      const client = clientsById.get(engagement.clientId);
      const service = servicesById.get(engagement.serviceId);
      return {
        id: engagement.id,
        clientName: client?.name ?? 'Client',
        serviceName: service?.name ?? 'Prestation',
        scheduledAt: engagement.scheduledAt,
        amount: totals.price + totals.surcharge,
        contactIds: engagement.contactIds,
      };
    });

  const pendingQuotesTotal = quotesToSend.reduce((sum, quote) => sum + quote.amount, 0);

  const today = new Date();
  const thresholdDate = subDays(today, followUpThresholdDays);

  const leadsToContact = leads
    .filter((lead) => {
      const lastContactDate = lead.lastContact ? new Date(lead.lastContact) : null;
      const needsFollowUp =
        !lastContactDate || differenceInCalendarDays(today, lastContactDate) >= followUpThresholdDays;
      const nextStepDate = lead.nextStepDate ? new Date(lead.nextStepDate) : null;
      const nextStepPassed = nextStepDate ? nextStepDate < today : false;
      return lead.status === 'À contacter' || needsFollowUp || nextStepPassed;
    })
    .sort((a, b) => {
      const priority = (leadStatus: string | undefined) => (leadStatus === 'À contacter' ? 0 : 1);
      const diff = priority(a.status) - priority(b.status);
      if (diff !== 0) {
        return diff;
      }
      const aDate = a.lastContact ? new Date(a.lastContact) : thresholdDate;
      const bDate = b.lastContact ? new Date(b.lastContact) : thresholdDate;
      return aDate.getTime() - bDate.getTime();
    })
    .map((lead) => ({
      id: lead.id,
      company: lead.company || lead.contact || 'Lead',
      contact: lead.contact,
      phone: lead.phone,
      email: lead.email,
      lastContact: lead.lastContact,
      nextStepDate: lead.nextStepDate,
    }));

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const weeklyEngagements = engagements.filter((engagement) => {
    if (engagement.status === 'annulé') {
      return false;
    }
    const start = new Date(engagement.scheduledAt);
    return isWithinInterval(start, { start: weekStart, end: weekEnd });
  });

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const isoDate = format(date, 'yyyy-MM-dd');
    const events = weeklyEngagements
      .filter((engagement) => engagement.scheduledAt.startsWith(isoDate))
      .map((engagement) => {
        const start = new Date(engagement.scheduledAt);
        const totals = computeEngagementTotals(engagement);
        const end = addMinutes(start, totals.duration);
        const client = clientsById.get(engagement.clientId);
        const service = servicesById.get(engagement.serviceId);
        return {
          id: engagement.id,
          clientName: client?.name ?? 'Client',
          serviceName: service?.name ?? 'Prestation',
          timeRange: `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
        };
      });
    return {
      date,
      label: format(date, 'EEEE', { locale: fr }),
      shortLabel: format(date, 'd MMM', { locale: fr }),
      events,
    };
  });

  const handleSendQuote = (engagementId: string) => {
    const engagement = engagements.find((item) => item.id === engagementId);
    if (!engagement) {
      return;
    }
    if (engagement.contactIds.length > 0) {
      recordEngagementSend(engagementId, { contactIds: engagement.contactIds });
    }
    updateEngagement(engagementId, { status: 'envoyé' });
  };

  const handleCallLead = (leadId: string, phone: string) => {
    recordLeadActivity(leadId, { type: 'call', content: 'Appel depuis le tableau de bord' });
    updateLead(leadId, { lastContact: new Date().toISOString() });
    if (typeof window !== 'undefined') {
      window.open(`tel:${phone}`, '_self');
    }
  };

  const handleEmailLead = (leadId: string, email: string) => {
    updateLead(leadId, { lastContact: new Date().toISOString() });
    if (typeof window !== 'undefined') {
      window.open(`mailto:${email}`, '_self');
    }
  };

  const kpiCards = [
    {
      label: 'Prestations totales',
      value: new Intl.NumberFormat('fr-FR').format(totalPrestations),
      description: 'Interventions finalisées',
      icon: <PrestationsIcon />,
    },
    {
      label: 'Chiffre d’affaires total',
      value: formatCurrency(totalRevenue),
      description: 'Prestations réalisées',
      icon: <RevenueIcon />,
    },
    {
      label: 'Durée totale',
      value: formatDuration(totalDurationMinutes),
      description: 'Temps passé en intervention',
      icon: <DurationIcon />,
    },
    {
      label: 'Devis en attente',
      value: new Intl.NumberFormat('fr-FR').format(quotesToSend.length),
      description: `${formatCurrency(pendingQuotesTotal)} à relancer`,
      icon: <QuoteIcon />,
    },
  ];

  const quickLinks: QuickLinkDefinition[] = [
    {
      label: 'Services',
      to: '/service',
      description: 'Construire une prestation',
      icon: <ServicesIcon />,
      palette: {
        light: {
          accentBg: '#f4f6ff',
          accentBorder: '#d8dffe',
          accentHover: '#c3d0fd',
          iconBg: 'rgba(79, 70, 229, 0.12)',
          iconColor: '#4338ca',
          textColor: '#1e1b4b',
          shadow: 'rgba(79, 70, 229, 0.15)',
        },
        dark: {
          accentBg: 'rgba(67, 56, 202, 0.22)',
          accentBorder: 'rgba(129, 140, 248, 0.4)',
          accentHover: 'rgba(129, 140, 248, 0.55)',
          iconBg: 'rgba(129, 140, 248, 0.24)',
          iconColor: '#c7d2fe',
          textColor: '#e0e7ff',
          shadow: 'rgba(67, 56, 202, 0.45)',
        },
      },
    },
    {
      label: 'Leads',
      to: '/lead',
      description: 'Relancer vos prospects',
      icon: <LeadsIcon />,
      palette: {
        light: {
          accentBg: '#f8f5ff',
          accentBorder: '#e0d8fc',
          accentHover: '#cabcf9',
          iconBg: 'rgba(124, 58, 237, 0.12)',
          iconColor: '#6d28d9',
          textColor: '#4c1d95',
          shadow: 'rgba(139, 92, 246, 0.18)',
        },
        dark: {
          accentBg: 'rgba(124, 58, 237, 0.22)',
          accentBorder: 'rgba(167, 139, 250, 0.42)',
          accentHover: 'rgba(167, 139, 250, 0.6)',
          iconBg: 'rgba(167, 139, 250, 0.24)',
          iconColor: '#ddd6fe',
          textColor: '#ede9fe',
          shadow: 'rgba(124, 58, 237, 0.45)',
        },
      },
    },
    {
      label: 'Clients',
      to: '/clients',
      description: 'Fiches et historiques',
      icon: <ClientsIcon />,
      palette: {
        light: {
          accentBg: '#f6f9ff',
          accentBorder: '#cfdef9',
          accentHover: '#b9d1f9',
          iconBg: 'rgba(59, 130, 246, 0.12)',
          iconColor: '#2563eb',
          textColor: '#1e3a8a',
          shadow: 'rgba(59, 130, 246, 0.15)',
        },
        dark: {
          accentBg: 'rgba(37, 99, 235, 0.22)',
          accentBorder: 'rgba(96, 165, 250, 0.45)',
          accentHover: 'rgba(96, 165, 250, 0.65)',
          iconBg: 'rgba(96, 165, 250, 0.25)',
          iconColor: '#bfdbfe',
          textColor: '#e0f2fe',
          shadow: 'rgba(37, 99, 235, 0.45)',
        },
      },
    },
    {
      label: 'Planning',
      to: '/planning',
      description: 'Vue hebdomadaire complète',
      icon: <PlanningIcon />,
      palette: {
        light: {
          accentBg: '#fff7ed',
          accentBorder: '#fed7aa',
          accentHover: '#fdba74',
          iconBg: 'rgba(249, 115, 22, 0.12)',
          iconColor: '#ea580c',
          textColor: '#9a3412',
          shadow: 'rgba(249, 115, 22, 0.15)',
        },
        dark: {
          accentBg: 'rgba(249, 115, 22, 0.22)',
          accentBorder: 'rgba(253, 186, 116, 0.45)',
          accentHover: 'rgba(253, 186, 116, 0.65)',
          iconBg: 'rgba(253, 186, 116, 0.24)',
          iconColor: '#fed7aa',
          textColor: '#ffedd5',
          shadow: 'rgba(249, 115, 22, 0.45)',
        },
      },
    },
    {
      label: 'Statistiques',
      to: '/stats',
      description: 'Indicateurs détaillés',
      icon: <StatsIcon />,
      palette: {
        light: {
          accentBg: '#f4f5f9',
          accentBorder: '#d6d7df',
          accentHover: '#c5c7d4',
          iconBg: 'rgba(107, 114, 128, 0.12)',
          iconColor: '#374151',
          textColor: '#111827',
          shadow: 'rgba(107, 114, 128, 0.12)',
        },
        dark: {
          accentBg: 'rgba(148, 163, 184, 0.22)',
          accentBorder: 'rgba(148, 163, 184, 0.38)',
          accentHover: 'rgba(203, 213, 225, 0.6)',
          iconBg: 'rgba(148, 163, 184, 0.24)',
          iconColor: '#e2e8f0',
          textColor: '#f8fafc',
          shadow: 'rgba(30, 41, 59, 0.45)',
        },
      },
    },
  ];

  const firstName =
    [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ').trim() || 'Wash&Go';
  const todayLabel = format(today, "EEEE d MMMM yyyy", { locale: fr });
  const quickLinkStyle = (link: QuickLinkDefinition): QuickLinkThemeVars => {
    const palette = theme === 'dark' ? link.palette.dark : link.palette.light;
    return {
      '--ql-bg': palette.accentBg,
      '--ql-border': palette.accentBorder,
      '--ql-border-hover': palette.accentHover,
      '--ql-icon-bg': palette.iconBg,
      '--ql-icon-color': palette.iconColor,
      '--ql-text': palette.textColor,
      '--ql-text-rgb': colorToRgbChannels(palette.textColor),
      '--ql-shadow': palette.shadow,
    };
  };

  return (
    <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Tableau de bord</p>
            <h1 className="dashboard-hero__title">Bonjour {firstName},</h1>
            <p className="dashboard-hero__subtitle">
              Nous sommes le {todayLabel}. Visualisez vos priorités du jour et pilotez vos opérations en un coup d’œil.
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="dashboard-section-title">Accès rapides</h2>
            <p className="dashboard-section-subtitle">Retrouvez vos espaces de travail en un clic.</p>
          </div>
        </div>
        <div className="dashboard-quick-links-grid">
          {quickLinks.map((link) => {
            const style = quickLinkStyle(link);
            return (
              <Link
                key={link.to}
                to={link.to}
                className="dashboard-quick-link group focus-visible:outline-none"
                style={style}
              >
                <span className="dashboard-quick-link__icon">
                  <span className="dashboard-quick-link__icon-surface">{link.icon}</span>
                </span>
                <div className="dashboard-quick-link__body">
                  <p className="dashboard-quick-link__label">{link.label}</p>
                  <p className="dashboard-quick-link__description">{link.description}</p>
                </div>
                <span className="dashboard-quick-link__cta">
                  Ouvrir
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M6 3l5 5-5 5M3 8h8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="dashboard-section-title">Chiffres clés</h2>
          <p className="dashboard-section-subtitle">Suivez vos indicateurs consolidés.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <div key={card.label} className="dashboard-kpi group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="dashboard-kpi__eyebrow">{card.label}</p>
                  <p className="dashboard-kpi__value">{card.value}</p>
                  <p className="dashboard-kpi__description">{card.description}</p>
                </div>
                <div className="dashboard-kpi__icon">{card.icon}</div>
              </div>
              <div className="dashboard-kpi__glow" aria-hidden />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="dashboard-section-title">À traiter</h2>
            <p className="dashboard-section-subtitle">Vos actions prioritaires du moment.</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 rounded-full bg-primary"></div>
              <h3 className="text-sm font-semibold text-text uppercase tracking-wide">Devis non envoyés</h3>
            </div>
            {quotesToSend.length === 0 ? (
              <div className="empty-state rounded-xl border border-dashed border-border px-6 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <QuoteIcon />
                </div>
                <p className="text-sm font-medium text-text">Tous les devis sont à jour</p>
                <p className="mt-1 text-xs text-muted">Aucune action requise pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quotesToSend.map((quote) => (
                  <div
                    key={quote.id}
                    className="action-card group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text">{quote.clientName}</p>
                      <p className="mt-1 text-xs text-muted">
                        {quote.serviceName} · {format(new Date(quote.scheduledAt), 'd MMM', { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-text">{formatCurrency(quote.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleSendQuote(quote.id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold transition-all duration-200 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        style={{ color: 'var(--inverse-text)' }}
                      >
                        <IconSend />
                        Envoyer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 rounded-full bg-primary"></div>
              <h3 className="text-sm font-semibold text-text uppercase tracking-wide">Prospects à contacter</h3>
            </div>
            {leadsToContact.length === 0 ? (
              <div className="empty-state rounded-xl border border-dashed border-border px-6 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <LeadsIcon />
                </div>
                <p className="text-sm font-medium text-text">Aucun prospect en attente</p>
                <p className="mt-1 text-xs text-muted">Tous vos leads sont à jour</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leadsToContact.map((lead) => (
                  <div
                    key={lead.id}
                    className="action-card group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text">{lead.company}</p>
                      <p className="mt-1 text-xs text-muted">
                        {lead.contact ? `${lead.contact} · ` : ''}
                        {lead.lastContact
                          ? `Dernier contact le ${format(new Date(lead.lastContact), 'd MMM', { locale: fr })}`
                          : 'Aucun contact enregistré'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCallLead(lead.id, lead.phone)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <IconPhone />
                        Appeler
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEmailLead(lead.id, lead.email)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <IconMail />
                        Email
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="dashboard-section-title">Planning de la semaine</h2>
            <p className="dashboard-section-subtitle">Vue synthétique des interventions du lundi au dimanche.</p>
          </div>
          <Link
            to="/planning"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <PlanningIcon />
            Ouvrir le planning
          </Link>
        </div>
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weekDays.map((day) => (
              <div
                key={day.shortLabel}
                className="planning-day-card group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 hover:border-primary/30"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold uppercase tracking-wide text-text">
                    {day.label.charAt(0).toUpperCase() + day.label.slice(1)}
                  </p>
                  <span className="text-xs font-medium text-primary">{day.shortLabel}</span>
                </div>
                {day.events.length === 0 ? (
                  <div className="mt-4 text-center">
                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted/10">
                      <PlanningIcon />
                    </div>
                    <p className="text-xs text-muted">Aucun rendez-vous</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {day.events.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-border bg-surface-tint p-3 transition-colors duration-200 group-hover:border-primary/20"
                      >
                        <p className="text-xs font-semibold text-text">{event.clientName}</p>
                        <p className="mt-1 text-[11px] text-muted">{event.serviceName}</p>
                        <p className="mt-1 text-[11px] font-medium text-primary">{event.timeRange}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="absolute -right-1 -top-1 h-8 w-8 rounded-full bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;


