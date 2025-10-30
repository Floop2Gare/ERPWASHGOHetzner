import { useMemo } from 'react';
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
import { BRAND_NAME } from '../lib/branding';

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
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 12h8M8 16h8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PurchasesIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM20 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" strokeLinecap="round" strokeLinejoin="round" />
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
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
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

  const quickLinks = [
    {
      label: 'Services',
      to: '/service',
      description: 'Construire une prestation',
      icon: <ServicesIcon />,
    },
    {
      label: 'Achats',
      to: '/achats',
      description: 'Suivi des dépenses',
      icon: <PurchasesIcon />,
    },
    {
      label: 'Documents',
      to: '/documents',
      description: 'Bibliothèque et modèles',
      icon: <DocumentsIcon />,
    },
    {
      label: 'Leads',
      to: '/lead',
      description: 'Relancer vos prospects',
      icon: <LeadsIcon />,
    },
    {
      label: 'Clients',
      to: '/clients',
      description: 'Fiches et historiques',
      icon: <ClientsIcon />,
    },
    {
      label: 'Planning',
      to: '/planning',
      description: 'Vue hebdomadaire complète',
      icon: <PlanningIcon />,
    },
    {
      label: 'Statistiques',
      to: '/stats',
      description: 'Indicateurs détaillés',
      icon: <StatsIcon />,
    },
    {
      label: 'Paramètres',
      to: '/parametres',
      description: 'Personnaliser Wash&Go',
      icon: <SettingsIcon />,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="dashboard-header-gradient relative overflow-hidden rounded-2xl border border-border p-8">
        <div className="relative z-10 space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Vue d'ensemble</p>
            <h1 className="text-3xl font-bold text-text">Tableau de bord</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Surveillez vos indicateurs clés et accédez rapidement aux modules essentiels de {BRAND_NAME}.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/10 to-primary/5"></div>
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-gradient-to-tr from-primary/8 to-transparent"></div>
      </header>

      {/* Section de diagnostic supprimée */}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">Accès rapides</h2>
            <p className="mt-1 text-sm text-muted">Retrouvez vos espaces de travail en un clic.</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:mx-auto lg:max-w-7xl">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="quick-link-enhanced quick-link group flex h-full flex-col gap-3 px-4 py-4 text-left focus-visible:outline-none"
            >
              <span className="quick-link__icon text-primary/60 group-hover:text-primary transition-colors duration-200">{link.icon}</span>
              <div className="space-y-1">
                <p className="quick-link__label text-sm font-semibold">{link.label}</p>
                <p className="text-xs text-muted leading-relaxed">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Chiffres clés</h2>
          <p className="mt-1 text-sm text-muted">Suivez vos indicateurs consolidés.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <div key={card.label} className="kpi-card-hover group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 hover:border-primary/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-text">{card.value}</p>
                  <p className="mt-2 text-xs text-muted leading-relaxed">{card.description}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary/15">
                  {card.icon}
                </div>
              </div>
              <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"></div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="text-lg font-semibold text-text">À traiter</h2>
            <p className="mt-1 text-sm text-muted">Vos actions prioritaires du moment.</p>
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
            <h2 className="text-lg font-semibold text-text">Planning de la semaine</h2>
            <p className="mt-1 text-sm text-muted">Vue synthétique des interventions du lundi au dimanche.</p>
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
              <div key={day.shortLabel} className="planning-day-card group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 hover:border-primary/30">
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
                      <div key={event.id} className="rounded-lg border border-border bg-surface-tint p-3 transition-colors duration-200 group-hover:border-primary/20">
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

