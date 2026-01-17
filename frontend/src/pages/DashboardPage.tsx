import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle,
  Clock,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Plus,
  UserPlus,
  Activity,
  ExternalLink,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';

import { useAppData } from '../store/useAppData';
import { formatCurrency, formatDuration } from '../lib/format';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { PieChart } from '../components/charts/PieChart';
import { Card } from '../components/Card';
import {
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
  CRMSubmitButton,
  CRMCancelButton,
} from '../components/crm';


const DashboardPage = () => {
  const navigate = useNavigate();
  const {
    engagements,
    computeEngagementTotals,
    leads,
    clients,
    services,
    userProfile,
  } = useAppData();

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Calculs des données pour le dashboard
  const completedEngagements = engagements.filter((e) => e.status === 'réalisé');
  const monthlyEngagements = completedEngagements.filter((e) => {
    const date = new Date(e.scheduledAt);
    return date >= monthStart && date <= monthEnd;
  });

  // 1. ACTIONS PRIORITAIRES
  // Actions à réaliser pour les clients (dans les 7 prochains jours)
  const clientActions = useMemo(() => {
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    return clients
      .filter((client) => {
        if (!client.nextActionDate) return false;
        const actionDate = new Date(client.nextActionDate);
        // Inclure les actions dans les 7 prochains jours (y compris aujourd'hui)
        return actionDate >= today && actionDate <= sevenDaysFromNow;
      })
      .map((client) => {
        const actionDate = new Date(client.nextActionDate!);
        const daysUntil = differenceInCalendarDays(actionDate, today);
        return { client, actionDate, daysUntil };
      })
      .sort((a, b) => a.actionDate.getTime() - b.actionDate.getTime()) // Trier par date croissante
      .slice(0, 6);
  }, [clients, today]);

  // Actions à réaliser pour les prospects (dans les 7 prochains jours)
  const prospectActions = useMemo(() => {
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    return leads
      .filter((lead) => {
        if (!lead.nextStepDate) return false;
        const actionDate = new Date(lead.nextStepDate);
        // Inclure les actions dans les 7 prochains jours (y compris aujourd'hui)
        return actionDate >= today && actionDate <= sevenDaysFromNow;
      })
      .map((lead) => {
        const actionDate = new Date(lead.nextStepDate!);
        const daysUntil = differenceInCalendarDays(actionDate, today);
        return { lead, actionDate, daysUntil };
      })
      .sort((a, b) => a.actionDate.getTime() - b.actionDate.getTime()) // Trier par date croissante
      .slice(0, 6);
  }, [leads, today]);


  // Statistiques des devis
  const quotesStats = useMemo(() => {
    const allQuotes = engagements.filter((e) => e.kind === 'devis');
    const total = allQuotes.length;
    const brouillon = allQuotes.filter((q) => !q.quoteStatus || q.quoteStatus === 'brouillon').length;
    const envoye = allQuotes.filter((q) => q.quoteStatus === 'envoyé').length;
    const accepte = allQuotes.filter((q) => q.quoteStatus === 'accepté').length;
    const refuse = allQuotes.filter((q) => q.quoteStatus === 'refusé').length;
    
    const totalAmount = allQuotes.reduce((sum, q) => {
      const totals = computeEngagementTotals(q);
      return sum + totals.price + totals.surcharge;
    }, 0);

    const accepteAmount = allQuotes
      .filter((q) => q.quoteStatus === 'accepté')
      .reduce((sum, q) => {
        const totals = computeEngagementTotals(q);
        return sum + totals.price + totals.surcharge;
      }, 0);

    const envoyeAmount = allQuotes
      .filter((q) => q.quoteStatus === 'envoyé')
      .reduce((sum, q) => {
        const totals = computeEngagementTotals(q);
        return sum + totals.price + totals.surcharge;
      }, 0);

    const tauxAcceptation = envoye > 0 ? Math.round((accepte / envoye) * 100) : 0;
    const tauxRefus = envoye > 0 ? Math.round((refuse / envoye) * 100) : 0;

    return {
      total,
      brouillon,
      envoye,
      accepte,
      refuse,
      totalAmount,
      accepteAmount,
      envoyeAmount,
      tauxAcceptation,
      tauxRefus,
    };
  }, [engagements, computeEngagementTotals]);

  // 2. OBJECTIFS & PROGRESSION
  const monthlyRevenue = useMemo(() => {
    return monthlyEngagements.reduce((sum, e) => {
      const totals = computeEngagementTotals(e);
      return sum + totals.price + totals.surcharge;
    }, 0);
  }, [monthlyEngagements, computeEngagementTotals]);

  // Charger les objectifs depuis localStorage ou utiliser les valeurs par défaut
  const [monthlyGoalTargets, setMonthlyGoalTargets] = useState({
    revenue: 50000,
    prestations: 120,
    averageDurationMinutes: 110,
  });

  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [goalsFormData, setGoalsFormData] = useState(monthlyGoalTargets);

  // Charger les objectifs depuis localStorage au montage
  useEffect(() => {
    const savedGoals = localStorage.getItem('dashboard-goals');
    if (savedGoals) {
      try {
        const parsed = JSON.parse(savedGoals);
        setMonthlyGoalTargets(parsed);
        setGoalsFormData(parsed);
      } catch (e) {
        console.error('Erreur lors du chargement des objectifs:', e);
      }
    }
  }, []);

  // Ouvrir le modal avec les valeurs actuelles
  const handleOpenGoalsModal = () => {
    setGoalsFormData(monthlyGoalTargets);
    setIsGoalsModalOpen(true);
  };

  // Sauvegarder les objectifs
  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    setMonthlyGoalTargets(goalsFormData);
    localStorage.setItem('dashboard-goals', JSON.stringify(goalsFormData));
    setIsGoalsModalOpen(false);
  };

  const monthlyPrestations = monthlyEngagements.length;
  const averageDuration = useMemo(() => {
    if (monthlyEngagements.length === 0) return 0;
    const totalMinutes = monthlyEngagements.reduce((sum, e) => {
      const totals = computeEngagementTotals(e);
      return sum + totals.duration;
    }, 0);
    return Math.round(totalMinutes / monthlyEngagements.length);
  }, [monthlyEngagements, computeEngagementTotals]);

  // 3. ANALYSE & GRAPHIQUES
  // MRR mensuel (line chart) - données vides
  const mrrData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        label: format(date, 'MMM', { locale: fr }),
        value: 0,
      });
    }
    return months;
  }, [today]);

  // Répartition des prestations (donut chart)
  const serviceDistribution = useMemo(() => {
    const categoryMap = new Map<string, number>();
    monthlyEngagements.forEach((e) => {
      const service = services.find((s) => s.id === e.serviceId);
      const category = service?.category || 'Autre';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    return Array.from(categoryMap.entries()).map(([label, value]) => ({
      label,
      value,
    }));
  }, [monthlyEngagements, services]);

  // CA mensuel total (bar chart)
  const revenueData = useMemo(() => {
    const weeks = [];
    const start = new Date(monthStart);
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekRevenue = monthlyEngagements
        .filter((e) => {
          const date = new Date(e.scheduledAt);
          return date >= weekStart && date <= weekEnd;
        })
        .reduce((sum, e) => {
          const totals = computeEngagementTotals(e);
          return sum + totals.price + totals.surcharge;
        }, 0);

      weeks.push({
        label: `S${i + 1}`,
        value: weekRevenue,
      });
    }
    return weeks;
  }, [monthStart, monthlyEngagements, computeEngagementTotals]);

  // 4. TOP CLIENTS
  const topClients = useMemo(() => {
    const clientStats = new Map<
      string,
      { client: typeof clients[0]; revenue: number; frequency: number; lastDate: Date | null }
    >();

    completedEngagements.forEach((e) => {
      const date = new Date(e.scheduledAt);
      const totals = computeEngagementTotals(e);
      const revenue = totals.price + totals.surcharge;

      const existing = clientStats.get(e.clientId) || {
        client: clients.find((c) => c.id === e.clientId)!,
        revenue: 0,
        frequency: 0,
        lastDate: null,
      };

      existing.revenue += revenue;
      existing.frequency += 1;
      if (!existing.lastDate || date > existing.lastDate) {
        existing.lastDate = date;
      }

      clientStats.set(e.clientId, existing);
    });

    return Array.from(clientStats.values())
      .filter((s) => s.client)
      .sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        if (b.frequency !== a.frequency) return b.frequency - a.frequency;
        if (!a.lastDate || !b.lastDate) return 0;
        return b.lastDate.getTime() - a.lastDate.getTime();
      })
      .slice(0, 10);
  }, [completedEngagements, clients, computeEngagementTotals]);

  const firstName =
    [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ').trim() || 'Wash&Go';
  const todayLabel = format(today, "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="dashboard-page space-y-8 sm:space-y-10">
      {/* Header - Style dashboard comptabilité */}
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Tableau de bord</p>
            <h1 className="dashboard-hero__title">Bonjour {firstName}</h1>
            <p className="dashboard-hero__subtitle">
              Nous sommes le {todayLabel}. Visualisez vos priorités du jour et pilotez vos opérations en un coup d'œil.
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      {/* Accès rapides */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: 'Créer un client', icon: UserPlus, action: () => navigate('/workspace/crm/clients') },
            { label: 'Créer un prospect', icon: Users, action: () => navigate('/workspace/crm/leads') },
            { label: 'Créer un devis', icon: FileText, action: () => navigate('/workspace/crm/devis?new=true') },
            { label: 'Voir les prestations', icon: Plus, action: () => navigate('/workspace/crm/services') },
            { label: 'Voir les statistiques', icon: BarChart3, action: () => navigate('/workspace/crm/statistiques') },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all hover:shadow-md hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-700 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700"
            >
              <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Actions prioritaires + Objectifs côte à côte */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Actions prioritaires - colonne gauche élargie */}
        <section className="lg:col-span-3 space-y-4">
          <div>
            <h2 className="dashboard-section-title">Actions prioritaires</h2>
            <p className="dashboard-section-subtitle">Tâches urgentes nécessitant votre attention</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Actions à réaliser - Clients */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Actions à réaliser</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Clients ({clientActions.length})</p>
                  </div>
                </div>
                {clientActions.length > 0 && (
                  <Link to="/workspace/crm/clients" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              {clientActions.length > 0 ? (
                <ul className="space-y-2">
                  {clientActions.map(({ client, daysUntil }) => (
                    <li key={client.id}>
                      <Link
                        to={`/workspace/crm/clients?clientId=${client.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg p-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{client.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {client.nextActionNote || 'Action à faire'} — {daysUntil === 0 ? 'Aujourd\'hui' : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg bg-white p-3 dark:bg-slate-800/70">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Aucune action prévue</p>
                </div>
              )}
            </div>

            {/* Actions à réaliser - Prospects */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Actions à réaliser</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Prospects ({prospectActions.length})</p>
                  </div>
                </div>
                {prospectActions.length > 0 && (
                  <Link to="/workspace/crm/leads" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              {prospectActions.length > 0 ? (
                <ul className="space-y-2">
                  {prospectActions.map(({ lead, daysUntil }) => (
                    <li key={lead.id}>
                      <Link
                        to={`/workspace/crm/leads?leadId=${lead.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg p-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{lead.company || lead.email}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {lead.nextStepNote || 'Action à faire'} — {daysUntil === 0 ? 'Aujourd\'hui' : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg bg-white p-3 dark:bg-slate-800/70">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Aucune action prévue</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Objectifs & progression - colonne droite */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="dashboard-section-title">Objectifs & progression</h2>
              <p className="dashboard-section-subtitle">Indicateurs clés de performance</p>
            </div>
            <button
              onClick={handleOpenGoalsModal}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Objectifs</span>
            </button>
          </div>
          <div className="flex gap-3">
            {/* Colonne 1 : 3 KPIs */}
            <div className="flex-1 space-y-3">
              {[
                {
                  label: 'CA mensuel',
                  value: formatCurrency(monthlyRevenue),
                  pct: Math.round((monthlyRevenue / monthlyGoalTargets.revenue) * 100),
                  target: formatCurrency(monthlyGoalTargets.revenue),
                  icon: TrendingUp,
                  helper: `Objectif: ${formatCurrency(monthlyGoalTargets.revenue)}`,
                },
              ].map(({ label, value, pct, helper, icon: Icon }, index) => {
                const iconColors = [
                  { 
                    bg: 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700', 
                    text: 'text-white', 
                    border: 'border-blue-400 dark:border-blue-500', 
                    bar: 'bg-blue-500',
                    badge: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                  },
                  { 
                    bg: 'bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700', 
                    text: 'text-white', 
                    border: 'border-purple-400 dark:border-purple-500', 
                    bar: 'bg-purple-500',
                    badge: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700'
                  },
                  { 
                    bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700', 
                    text: 'text-white', 
                    border: 'border-emerald-400 dark:border-emerald-500', 
                    bar: 'bg-emerald-500',
                    badge: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                  },
                ];
                const colors = iconColors[index % iconColors.length];
                const percentage = Math.min(pct, 100);
                const isOver100 = pct > 100;
                return (
                  <div key={label} className="group bg-white dark:bg-slate-800 rounded-lg p-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`flex-shrink-0 flex items-center justify-center rounded-md ${colors.bg}`} style={{ width: '1.5rem', height: '1.5rem' }}>
                          <Icon className={colors.text} style={{ width: '0.75rem', height: '0.75rem' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate">{label}</p>
                            <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-semibold flex-shrink-0 ${
                              isOver100 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                : percentage >= 80
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : percentage >= 50
                                ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
                      <div className="space-y-1">
                        <div className="relative h-2.5 overflow-hidden rounded-full bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-600">
                          <div
                            className="h-full rounded-full bg-blue-300 dark:bg-blue-400 transition-all duration-500 ease-out"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{helper}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Colonne 2 : 2 KPIs */}
            <div className="flex-1 space-y-3">
              {[
                {
                  label: 'Prestations',
                  value: monthlyPrestations.toString(),
                  pct: Math.round((monthlyPrestations / monthlyGoalTargets.prestations) * 100),
                  target: monthlyGoalTargets.prestations.toString(),
                  icon: Activity,
                  helper: `Objectif: ${monthlyGoalTargets.prestations}`,
                },
                {
                  label: 'Temps moyen',
                  value: formatDuration(averageDuration),
                  pct: Math.round((averageDuration / monthlyGoalTargets.averageDurationMinutes) * 100),
                  target: formatDuration(monthlyGoalTargets.averageDurationMinutes),
                  icon: Clock,
                  helper: `Objectif: ${formatDuration(monthlyGoalTargets.averageDurationMinutes)}`,
                },
              ].map(({ label, value, pct, helper, icon: Icon }, index) => {
                const iconColors = [
                  { 
                    bg: 'bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700', 
                    text: 'text-white', 
                    border: 'border-orange-400 dark:border-orange-500', 
                    bar: 'bg-orange-500',
                    badge: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                  },
                  { 
                    bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700', 
                    text: 'text-white', 
                    border: 'border-indigo-400 dark:border-indigo-500', 
                    bar: 'bg-indigo-500',
                    badge: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700'
                  },
                ];
                const colors = iconColors[index % iconColors.length];
                const percentage = Math.min(pct, 100);
                const isOver100 = pct > 100;
                return (
                  <div key={label} className="group bg-white dark:bg-slate-800 rounded-lg p-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`flex-shrink-0 flex items-center justify-center rounded-md ${colors.bg}`} style={{ width: '1.5rem', height: '1.5rem' }}>
                          <Icon className={colors.text} style={{ width: '0.75rem', height: '0.75rem' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate">{label}</p>
                            <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-semibold flex-shrink-0 ${
                              isOver100 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                : percentage >= 80
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : percentage >= 50
                                ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
                      <div className="space-y-1">
                        <div className="relative h-2.5 overflow-hidden rounded-full bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-600">
                          <div
                            className="h-full rounded-full bg-blue-300 dark:bg-blue-400 transition-all duration-500 ease-out"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{helper}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        </div>

      {/* 3. ANALYSE & GRAPHIQUES */}
      <section className="space-y-4">
        <div>
          <h2 className="dashboard-section-title">Analyse & graphiques</h2>
          <p className="dashboard-section-subtitle">Évolution et répartition</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* MRR mensuel */}
          <Card
            padding="lg"
            title={
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  MRR mensuel
                </span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">6 derniers mois</span>
              </div>
            }
          >
            <LineChart
              data={mrrData}
              className="mt-6"
              variant="ultraThin"
              height={180}
            />
          </Card>

          {/* Répartition des prestations */}
          <Card
            padding="lg"
            title={
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Répartition des prestations
                </span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Ce mois</span>
              </div>
            }
          >
            <PieChart data={serviceDistribution} className="mt-6" height={180} />
          </Card>

          {/* CA mensuel total */}
          <Card
            padding="lg"
            title={
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  CA mensuel
                </span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Par semaine</span>
              </div>
            }
          >
            <BarChart data={revenueData} className="mt-6" height={180} />
          </Card>
        </div>
      </section>

      {/* 3.5. STATISTIQUES DEVIS */}
      <section className="space-y-4">
        <div>
          <h2 className="dashboard-section-title">Statistiques des devis</h2>
          <p className="dashboard-section-subtitle">Suivi des devis et taux d'acceptation</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Total devis</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{quotesStats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {quotesStats.brouillon} brouillon{quotesStats.brouillon > 1 ? 's' : ''}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {quotesStats.envoye} envoyé{quotesStats.envoye > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Montant total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(quotesStats.totalAmount)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {quotesStats.envoyeAmount > 0 && (
                <span>{formatCurrency(quotesStats.envoyeAmount)} en attente</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Taux d'acceptation</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {quotesStats.tauxAcceptation}%
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400">
                {quotesStats.accepte} accepté{quotesStats.accepte > 1 ? 's' : ''}
              </span>
              <span className="text-red-600 dark:text-red-400">
                {quotesStats.refuse} refusé{quotesStats.refuse > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">CA accepté</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(quotesStats.accepteAmount)}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {quotesStats.envoye > 0 && (
                <span>
                  {Math.round((quotesStats.accepteAmount / quotesStats.totalAmount) * 100)}% du total
                </span>
              )}
            </div>
          </div>
        </div>
        {quotesStats.envoye > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Performance des devis</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sur {quotesStats.envoye} devis envoyés, {quotesStats.accepte} ont été acceptés ({quotesStats.tauxAcceptation}%) 
                  et {quotesStats.refuse} ont été refusés ({quotesStats.tauxRefus}%)
                </p>
              </div>
              <Link
                to="/workspace/crm/devis"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <FileText className="h-4 w-4" />
                Voir tous les devis
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 4. TOP CLIENTS */}
      <section className="space-y-4">
        <div>
          <h2 className="dashboard-section-title">Top clients</h2>
          <p className="dashboard-section-subtitle">Meilleurs clients par CA cumulé</p>
        </div>
        <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800 lg:block">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Rang
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    CA cumulé
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Fréquence
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                      Aucun client trouvé
                    </td>
                  </tr>
                ) : (
                  topClients.map((stat, index) => (
                    <tr
                      key={stat.client.id}
                      className="group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer"
                    >
                      {/* Colonne Rang */}
                      <td className="px-6 py-5 align-middle">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 shadow-lg ${
                          index === 0 
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 dark:from-yellow-500 dark:to-yellow-600 border-yellow-300 dark:border-yellow-400'
                            : index === 1
                            ? 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600 border-slate-200 dark:border-slate-400'
                            : index === 2
                            ? 'bg-gradient-to-br from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800 border-amber-500 dark:border-amber-600'
                            : 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 border-blue-400 dark:border-blue-500'
                        }`}>
                          <span className="text-sm font-bold text-white">
                            {index + 1}
                          </span>
                        </div>
                      </td>

                      {/* Colonne Client */}
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-md">
                            <span className="text-sm font-bold text-white">
                              {stat.client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {stat.client.name}
                            </p>
                            {stat.client.email && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {stat.client.email}
                              </p>
                            )}
                          </div>
                    </div>
                      </td>

                      {/* Colonne Statut */}
                      <td className="px-6 py-5 align-middle">
                        {(() => {
                          const clientStatus = stat.client.status || 'Actif';
                          const statusConfig = {
                            'Actif': {
                              className: 'bg-emerald-200 text-emerald-800 border-emerald-300 dark:bg-emerald-500 dark:text-white dark:border-emerald-600',
                            },
                            'Non actif': {
                              className: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500',
                            },
                            'À appeler': {
                              className: 'bg-orange-200 text-orange-800 border-orange-300 dark:bg-orange-500 dark:text-white dark:border-orange-600',
                            },
                            'À contacter': {
                              className: 'bg-blue-200 text-blue-800 border-blue-300 dark:bg-blue-500 dark:text-white dark:border-blue-600',
                            },
                          };
                          const config = statusConfig[clientStatus as keyof typeof statusConfig] || statusConfig['Actif'];
                          return (
                            <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border shadow-[0_1px_0_rgba(0,0,0,0.05)] ${config.className}`}>
                              {clientStatus}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Colonne CA cumulé */}
                      <td className="px-6 py-5 align-middle">
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                            {formatCurrency(stat.revenue)}
                          </p>
                        </div>
                      </td>

                      {/* Colonne Fréquence */}
                      <td className="px-6 py-5 align-middle">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {stat.frequency} prestation{stat.frequency > 1 ? 's' : ''}
                          </p>
                        </div>
                      </td>

                      {/* Colonne Actions */}
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center justify-start gap-2">
                          <Link
                            to={`/workspace/crm/clients?clientId=${stat.client.id}`}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            title="Voir la fiche"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal pour modifier les objectifs */}
      <CRMModal isOpen={isGoalsModalOpen} onClose={() => setIsGoalsModalOpen(false)}>
        <form
          onSubmit={handleSaveGoals}
          className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          <CRMModalHeader
            eyebrow="OBJECTIFS MENSUELS"
            title="Modifier les objectifs"
            description="Définissez vos objectifs mensuels pour suivre vos performances et mesurer votre progression."
            onClose={() => setIsGoalsModalOpen(false)}
          />

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1">
              <div>
                <label
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                  htmlFor="goal-revenue"
                >
                  CA mensuel (€) *
                </label>
                <input
                  id="goal-revenue"
                  type="number"
                  value={goalsFormData.revenue}
                  onChange={(e) =>
                    setGoalsFormData({ ...goalsFormData, revenue: Number(e.target.value) || 0 })
                  }
                  min="0"
                  step="any"
                  placeholder="50000"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                  htmlFor="goal-prestations"
                >
                  Nombre de prestations *
                </label>
                <input
                  id="goal-prestations"
                  type="number"
                  value={goalsFormData.prestations}
                  onChange={(e) =>
                    setGoalsFormData({ ...goalsFormData, prestations: Number(e.target.value) || 0 })
                  }
                  min="0"
                  step="any"
                  placeholder="120"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                  htmlFor="goal-duration"
                >
                  Temps moyen (minutes) *
                </label>
                <input
                  id="goal-duration"
                  type="number"
                  value={goalsFormData.averageDurationMinutes}
                  onChange={(e) =>
                    setGoalsFormData({
                      ...goalsFormData,
                      averageDurationMinutes: Number(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="any"
                  placeholder="110"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsGoalsModalOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Settings className="h-4 w-4" />
              Enregistrer les objectifs
            </button>
          </div>
        </form>
      </CRMModal>
    </div>
  );
};

export default DashboardPage;
