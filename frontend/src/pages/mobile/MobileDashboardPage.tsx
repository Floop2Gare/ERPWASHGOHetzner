import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DescriptionRounded,
  ContactsRounded,
  CalendarTodayRounded,
  AttachMoney,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { useAppData } from '../../store/useAppData';
import { formatCurrency, formatDuration } from '../../lib/format';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import '../mobile.css';
import '../../styles/apple-mobile.css';

const MobileDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useAppData((state) => state.theme);
  const engagements = useAppData((state) => state.engagements) || [];
  const clients = useAppData((state) => state.clients) || [];
  const leads = useAppData((state) => state.leads) || [];
  const companies = useAppData((state) => state.companies) || [];
  const activeCompanyId = useAppData((state) => state.activeCompanyId);
  const computeEngagementTotals = useAppData((state) => state.computeEngagementTotals);
  
  // Couleurs adaptées au thème
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const textSecondary = isDark ? '#a0a0a0' : '#666666';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const cardBg = isDark ? '#242424' : '#ffffff';
  const shadowColor = isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.08)';

  const activeCompany = useMemo(() => {
    if (activeCompanyId) {
      return companies.find((c) => c.id === activeCompanyId);
    }
    return companies.find((c) => c.isDefault) || companies[0];
  }, [companies, activeCompanyId]);

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Filtrer les engagements réalisés du mois en cours (même logique que DashboardPage)
    const completedEngagements = engagements.filter((e) => e.status === 'réalisé');
    const monthlyEngagements = completedEngagements.filter((e) => {
      if (!e.scheduledAt) return false;
      const date = new Date(e.scheduledAt);
      return date >= monthStart && date <= monthEnd;
    });

    let totalRevenue = 0;
    let totalDuration = 0;
    
    // Calculer le CA et la durée totale (même logique que DashboardPage avec surcharge)
    monthlyEngagements.forEach((e) => {
      try {
        const totals = computeEngagementTotals(e);
        totalRevenue += (totals.price || 0) + (totals.surcharge || 0);
        totalDuration += totals.duration || 0;
      } catch (error) {
        const totals = e.totals || {};
        totalRevenue += (totals.price || totals.total || 0) + (totals.surcharge || 0);
        totalDuration += totals.duration || 0;
      }
    });

    const services = monthlyEngagements;

    // Compter les devis (engagements de type devis)
    const monthQuotes = monthlyEngagements.filter((e) => e.kind === 'devis');
    
    // Compter les leads créés ce mois-ci
    const monthLeads = leads.filter((l) => {
      if (!l.createdAt) return false;
      const leadDate = parseISO(l.createdAt);
      return isWithinInterval(leadDate, { start: monthStart, end: monthEnd });
    });

    // Compter les devis en attente (devis avec status planifié ou brouillon, ou quoteStatus envoyé)
    const allQuotes = engagements.filter((e) => e.kind === 'devis');
    const pendingQuotes = allQuotes.filter((q) => {
      const isPending = q.status === 'planifié' || q.status === 'brouillon';
      const isSent = q.quoteStatus === 'envoyé';
      return isPending || isSent;
    }).length;

    // Compter les leads actifs
    const activeLeads = leads.filter((l) => l.status !== 'perdu' && l.status !== 'converti').length;

    return {
      revenue: totalRevenue,
      servicesCount: services.length,
      quotesCount: monthQuotes.length,
      leadsCount: monthLeads.length,
      duration: totalDuration,
      pendingQuotes,
      activeLeads,
    };
  }, [engagements, leads, computeEngagementTotals]);

  const previousMonthStats = useMemo(() => {
    const now = new Date();
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    // Filtrer les engagements réalisés du mois précédent (même logique que DashboardPage)
    const completedEngagements = engagements.filter((e) => e.status === 'réalisé');
    const monthEngagements = completedEngagements.filter((e) => {
      if (!e.scheduledAt) return false;
      const date = new Date(e.scheduledAt);
      return date >= prevMonthStart && date <= prevMonthEnd;
    });
    
    let totalRevenue = 0;
    
    // Calculer le CA avec surcharge (même logique que DashboardPage)
    monthEngagements.forEach((e) => {
      try {
        const totals = computeEngagementTotals(e);
        totalRevenue += (totals.price || 0) + (totals.surcharge || 0);
      } catch (error) {
        const totals = e.totals || {};
        totalRevenue += (totals.price || totals.total || 0) + (totals.surcharge || 0);
      }
    });

    return {
      revenue: totalRevenue,
      servicesCount: monthEngagements.length,
    };
  }, [engagements, computeEngagementTotals]);

  const stats = useMemo(() => {
    const revenueChange = previousMonthStats.revenue > 0
      ? ((currentMonthStats.revenue - previousMonthStats.revenue) / previousMonthStats.revenue) * 100
      : currentMonthStats.revenue > 0 ? 100 : 0;

    // Ne pas mettre d'objectif de CA (comme demandé par l'utilisateur)
    // Ou charger depuis localStorage comme desktop (désactivé pour l'instant)
    const revenueGoal = null; // Pas d'objectif de CA mensuel
    const revenueProgress = 0; // Pas de progression si pas d'objectif

    return {
      ...currentMonthStats,
      revenueChange,
      revenueGoal,
      revenueProgress,
      clientsCount: clients.length,
    };
  }, [currentMonthStats, previousMonthStats, clients.length]);

  return (
    <div className="modern-text" style={{ 
      padding: '0 var(--space-xl)', 
      width: '100%', 
      background: bgColor,
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{ 
        paddingTop: 'var(--space-md)', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 'var(--space-lg)',
        width: '100%',
        textAlign: 'center',
      }}>
        <h1 className="text-title" style={{ margin: 0, color: textColor, fontSize: '24px', fontWeight: '700' }}>
            Tableau de bord
          </h1>
          {activeCompany && (
          <span className="text-caption" style={{ color: textSecondary, fontSize: '14px', marginTop: '4px' }}>
              {activeCompany.name}
            </span>
          )}
      </div>

      {/* Carte principale - Revenus */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: cardBg,
          border: `2px solid ${borderColor}`,
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-lg)',
          marginBottom: 'var(--space-md)',
          boxShadow: `0 2px 8px ${shadowColor}`,
          textAlign: 'center',
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          marginBottom: 'var(--space-sm)' 
        }}>
            <p style={{ 
              margin: 0, 
              marginBottom: 'var(--space-xs)', 
            color: textSecondary, 
              fontSize: '13px', 
              fontWeight: '500',
              lineHeight: '1.3',
            }}>
              Chiffre d'affaires du mois
            </p>
            <h2 style={{ 
              margin: 0, 
            color: textColor, 
            fontSize: '32px', 
              fontWeight: '700', 
              letterSpacing: '-0.01em',
              lineHeight: '1.2',
            }}>
              {formatCurrency(stats.revenue)}
            </h2>
          {stats.revenueChange !== 0 && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '4px', 
              padding: '4px 12px', 
              borderRadius: 'var(--radius-sm)', 
              background: stats.revenueChange > 0 ? '#10b98115' : '#ef444415',
              marginTop: 'var(--space-xs)',
            }}>
              {stats.revenueChange > 0 ? (
                <TrendingUp style={{ fontSize: '14px', color: stats.revenueChange > 0 ? '#10b981' : '#ef4444' }} />
              ) : (
                <TrendingDown style={{ fontSize: '14px', color: '#ef4444' }} />
              )}
              <span style={{ color: stats.revenueChange > 0 ? '#10b981' : '#ef4444', fontSize: '12px', fontWeight: '600' }}>
                {Math.abs(stats.revenueChange).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

      </motion.div>

      {/* Cartes de métriques */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 'var(--space-sm)',
          justifyContent: 'center',
        }}>
          {/* CA mensuel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              boxShadow: `0 1px 3px ${shadowColor}`,
              textAlign: 'center',
            }}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 'var(--space-xs)', 
              marginBottom: 'var(--space-xs)' 
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: 'var(--radius-md)', 
                background: '#10b98115', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
              }}>
                <AttachMoney style={{ fontSize: '20px', color: '#10b981' }} />
              </div>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '11px', 
              color: textSecondary, 
              marginBottom: 'var(--space-xs)',
              lineHeight: '1.3',
            }}>
              CA mensuel
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: '700', 
              color: textColor,
              lineHeight: '1.2',
            }}>
              {formatCurrency(stats.revenue)}
            </p>
          </motion.div>

          {/* Prestations */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              boxShadow: `0 1px 3px ${shadowColor}`,
              textAlign: 'center',
            }}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 'var(--space-xs)', 
              marginBottom: 'var(--space-xs)' 
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: 'var(--radius-md)', 
                background: '#3b82f615', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
              }}>
                <CheckCircle style={{ fontSize: '20px', color: '#3b82f6' }} />
              </div>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '11px', 
              color: textSecondary, 
              marginBottom: 'var(--space-xs)',
              lineHeight: '1.3',
            }}>
              Prestations
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: '700', 
              color: textColor,
              lineHeight: '1.2',
            }}>
              {stats.servicesCount}
            </p>
          </motion.div>

          {/* Devis */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.2 }}
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              boxShadow: `0 1px 3px ${shadowColor}`,
              textAlign: 'center',
            }}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 'var(--space-xs)', 
              marginBottom: 'var(--space-xs)' 
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: 'var(--radius-md)', 
                background: '#f59e0b15', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
              }}>
                <DescriptionRounded style={{ fontSize: '20px', color: '#f59e0b' }} />
              </div>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '11px', 
              color: textSecondary, 
              marginBottom: 'var(--space-xs)',
              lineHeight: '1.3',
            }}>
              Devis
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: '700', 
              color: textColor,
              lineHeight: '1.2',
            }}>
              {stats.quotesCount}
            </p>
          </motion.div>

          {/* Durée totale */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.25 }}
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              boxShadow: `0 1px 3px ${shadowColor}`,
              textAlign: 'center',
            }}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 'var(--space-xs)', 
              marginBottom: 'var(--space-xs)' 
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: 'var(--radius-md)', 
                background: '#8b5cf615', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
              }}>
                <Schedule style={{ fontSize: '20px', color: '#8b5cf6' }} />
              </div>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '11px', 
              color: textSecondary, 
              marginBottom: 'var(--space-xs)',
              lineHeight: '1.3',
            }}>
              Durée totale
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: '700', 
              color: textColor,
              lineHeight: '1.2',
            }}>
              {formatDuration(stats.duration)}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Actions rapides */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <h3 className="text-headline" style={{ 
          margin: '0 0 var(--space-md) 0', 
          color: textColor, 
          fontSize: '18px', 
          fontWeight: '700',
          lineHeight: '1.2',
          textAlign: 'center',
        }}>
          Accès rapide
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 'var(--space-sm)' 
        }}>
          {/* Prestations */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.3 }}
            onClick={() => navigate('/mobile/prestations')}
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              cursor: 'pointer',
              transition: 'all 0.15s ease-out',
              boxShadow: `0 1px 3px ${shadowColor}`,
              textAlign: 'center',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: 'var(--radius-md)', 
              background: '#3b82f615', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
            }}>
              <CalendarTodayRounded style={{ fontSize: '18px', color: '#3b82f6' }} />
            </div>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                fontWeight: '600', 
                color: textColor, 
                lineHeight: '1.3',
              }}>
                Prestations
              </p>
            </div>
          </motion.button>

          {/* Devis */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.35 }}
            onClick={() => navigate('/mobile/devis')}
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              cursor: 'pointer',
              transition: 'all 0.15s ease-out',
              boxShadow: `0 1px 3px ${shadowColor}`,
              textAlign: 'center',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: 'var(--radius-md)', 
              background: '#10b98115', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
            }}>
              <DescriptionRounded style={{ fontSize: '18px', color: '#10b981' }} />
            </div>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                fontWeight: '600', 
                color: textColor, 
                lineHeight: '1.3',
              }}>
                Devis
              </p>
            </div>
          </motion.button>

          {/* Prospects */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.4 }}
            onClick={() => navigate('/mobile/prospects')}
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              cursor: 'pointer',
              transition: 'all 0.15s ease-out',
              boxShadow: `0 1px 3px ${shadowColor}`,
              textAlign: 'center',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: 'var(--radius-md)', 
              background: '#f59e0b15', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
            }}>
              <TrendingUp style={{ fontSize: '18px', color: '#f59e0b' }} />
            </div>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                fontWeight: '600', 
                color: textColor, 
                lineHeight: '1.3',
              }}>
                Prospects
              </p>
            </div>
          </motion.button>

          {/* Clients */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.45 }}
            onClick={() => navigate('/mobile/clients')}
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              cursor: 'pointer',
              transition: 'all 0.15s ease-out',
              boxShadow: `0 1px 3px ${shadowColor}`,
              textAlign: 'center',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: 'var(--radius-md)', 
              background: '#8b5cf615', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
            }}>
              <ContactsRounded style={{ fontSize: '18px', color: '#8b5cf6' }} />
            </div>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                fontWeight: '600', 
                color: textColor, 
                lineHeight: '1.3',
              }}>
                Clients
              </p>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboardPage;
