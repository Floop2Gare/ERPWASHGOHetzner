import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Receipt, CheckCircle, Description } from '@mui/icons-material';
import { useAppData, type Engagement, type CommercialDocumentStatus } from '../../store/useAppData';
import { formatCurrency, formatDate } from '../../lib/format';
import '../mobile.css';
import '../../styles/apple-mobile.css';

const ITEMS_PER_PAGE = 20;

const STATUS_CONFIG: Record<CommercialDocumentStatus, { label: string; color: string; bgColor: string }> = {
  brouillon: { label: 'Brouillon', color: '#475569', bgColor: '#f1f5f9' },
  envoyé: { label: 'Envoyée', color: '#2563eb', bgColor: '#dbeafe' },
  accepté: { label: 'Acceptée', color: '#059669', bgColor: '#d1fae5' },
  refusé: { label: 'Refusée', color: '#dc2626', bgColor: '#fee2e2' },
  payé: { label: 'Payée', color: '#059669', bgColor: '#d1fae5' },
};

const MobileFacturesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    engagements,
    clients,
    companies,
    activeCompanyId,
    computeEngagementTotals,
    vatEnabled,
    vatRate,
  } = useAppData();

  const [statusFilter, setStatusFilter] = useState<CommercialDocumentStatus | 'Tous'>('Tous');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Créer des maps pour accès rapide
  const clientsById = useMemo(() => {
    const map = new Map<string, typeof clients[0]>();
    clients.forEach((client) => map.set(client.id, client));
    return map;
  }, [clients]);

  const companiesById = useMemo(() => {
    const map = new Map<string, typeof companies[0]>();
    companies.forEach((company) => map.set(company.id, company));
    return map;
  }, [companies]);

  // Normaliser le statut d'un engagement en statut de facture
  const normalizeStatus = (status: string): CommercialDocumentStatus => {
    switch (status) {
      case 'réalisé':
        return 'payé';
      case 'envoyé':
        return 'envoyé';
      case 'brouillon':
        return 'brouillon';
      case 'planifié':
        return 'brouillon';
      default:
        return 'brouillon';
    }
  };

  // Filtrer les factures
  const filteredInvoices = useMemo(() => {
    const invoices = engagements.filter((engagement) => {
      if (engagement.kind !== 'facture') return false;
      const status = normalizeStatus(engagement.status);
      const matchesStatus = statusFilter === 'Tous' || status === statusFilter;
      const matchesCompany = !activeCompanyId || !engagement.companyId || engagement.companyId === activeCompanyId;
      return matchesStatus && matchesCompany;
    });

    // Trier par date (plus récent en premier)
    return invoices.sort((a, b) => {
      const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [engagements, statusFilter, activeCompanyId]);

  // Pagination
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  // Reset page quand filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Gérer le paramètre engagementId de l'URL
  useEffect(() => {
    const engagementIdFromUrl = searchParams.get('engagementId');
    if (engagementIdFromUrl && filteredInvoices.length > 0) {
      const engagement = filteredInvoices.find((e) => e.id === engagementIdFromUrl);
      if (engagement) {
        const engagementIndex = filteredInvoices.findIndex((e) => e.id === engagementIdFromUrl);
        if (engagementIndex >= 0) {
          const targetPage = Math.floor(engagementIndex / ITEMS_PER_PAGE) + 1;
          if (targetPage !== currentPage) {
            setCurrentPage(targetPage);
          }
          setTimeout(() => {
            setExpandedInvoiceId(engagementIdFromUrl);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('engagementId');
            setSearchParams(newParams, { replace: true });
          }, 100);
        } else {
          setExpandedInvoiceId(engagementIdFromUrl);
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('engagementId');
          setSearchParams(newParams, { replace: true });
        }
      }
    }
  }, [searchParams, filteredInvoices, currentPage, setSearchParams]);

  const toggleExpand = (invoiceId: string) => {
    setExpandedInvoiceId(expandedInvoiceId === invoiceId ? null : invoiceId);
  };

  return (
    <div className="modern-text" style={{ 
      padding: '0 var(--space-xl)', 
      width: '100%', 
      background: 'var(--bg)',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{ 
        paddingTop: 'var(--space-md)', 
        paddingBottom: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
      }}>
        <h1 className="text-headline" style={{ 
          margin: '0 0 var(--space-sm) 0', 
          color: 'var(--text)', 
          fontSize: '24px', 
          fontWeight: '700',
          lineHeight: '1.2',
        }}>
          Factures
        </h1>
        
        {/* Filtres de statut */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-xs)', 
          overflowX: 'auto',
          paddingBottom: 'var(--space-xs)',
          marginTop: 'var(--space-sm)',
        }}>
          {(['Tous', 'brouillon', 'envoyé', 'payé'] as const).map((status) => {
            const isActive = statusFilter === status;
            const config = status === 'Tous' 
              ? { label: 'Tous', color: '#000000', bgColor: '#f3f4f6' }
              : STATUS_CONFIG[status];
            
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-lg)',
                  border: 'none',
                  background: isActive ? config.bgColor : 'transparent',
                  color: isActive ? config.color : 'var(--muted)',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste des factures */}
      {paginatedInvoices.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--space-xl) 0',
          color: 'var(--muted)',
        }}>
          <Receipt style={{ fontSize: '48px', marginBottom: 'var(--space-md)', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '14px' }}>
            {statusFilter === 'Tous' 
              ? 'Aucune facture disponible'
              : `Aucune facture avec le statut "${STATUS_CONFIG[statusFilter]?.label || statusFilter}"`
            }
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {paginatedInvoices.map((invoice) => {
              const client = clientsById.get(invoice.clientId);
              const company = invoice.companyId ? companiesById.get(invoice.companyId) : null;
              const totals = computeEngagementTotals(invoice);
              const vatEnabledForRow = invoice.invoiceVatEnabled ?? company?.vatEnabled ?? vatEnabled;
              const effectiveVatRate = vatRate ?? 0;
              const subtotalHt = totals.price + totals.surcharge;
              const vatAmount = vatEnabledForRow ? Math.round(subtotalHt * effectiveVatRate * 100) / 100 : 0;
              const totalTtc = subtotalHt + vatAmount;
              const status = normalizeStatus(invoice.status);
              const statusConfig = STATUS_CONFIG[status];
              const isExpanded = expandedInvoiceId === invoice.id;

              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(var(--border-rgb), 0.1)',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <button
                    onClick={() => toggleExpand(invoice.id)}
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-sm)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: '4px' }}>
                        <Receipt style={{ fontSize: '18px', color: 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ 
                          fontSize: '15px', 
                          fontWeight: '600', 
                          color: 'var(--text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {invoice.invoiceNumber || `FAC-${invoice.id.slice(-6)}`}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: statusConfig.bgColor,
                          color: statusConfig.color,
                          flexShrink: 0,
                        }}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p style={{ 
                        margin: '4px 0 0 0', 
                        fontSize: '13px', 
                        color: 'var(--muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {client?.name || 'Client inconnu'}
                      </p>
                      {invoice.scheduledAt && (
                        <p style={{ 
                          margin: '4px 0 0 0', 
                          fontSize: '12px', 
                          color: 'var(--muted)',
                        }}>
                          {format(parseISO(invoice.scheduledAt), 'd MMMM yyyy', { locale: fr })}
                        </p>
                      )}
                      <p style={{ 
                        margin: '8px 0 0 0', 
                        fontSize: '16px', 
                        fontWeight: '700', 
                        color: 'var(--text)',
                      }}>
                        {formatCurrency(totalTtc)}
                      </p>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-lg)',
              paddingBottom: 'var(--space-md)',
            }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(var(--border-rgb), 0.2)',
                  background: currentPage === 1 ? 'transparent' : 'var(--surface)',
                  color: currentPage === 1 ? 'var(--muted)' : 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                Précédent
              </button>
              <span style={{ 
                fontSize: '14px', 
                color: 'var(--muted)',
                minWidth: '60px',
                textAlign: 'center',
              }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(var(--border-rgb), 0.2)',
                  background: currentPage === totalPages ? 'transparent' : 'var(--surface)',
                  color: currentPage === totalPages ? 'var(--muted)' : 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MobileFacturesPage;
