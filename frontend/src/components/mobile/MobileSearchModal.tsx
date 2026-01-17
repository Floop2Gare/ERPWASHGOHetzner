import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, Users, TrendingUp, Building2 } from 'lucide-react';
import { useAppData } from '../../store/useAppData';
import { formatCurrency, formatDate } from '../../lib/format';

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ResultItem = {
  id: string;
  title: string;
  subtitle: string;
  kind: 'client' | 'lead' | 'engagement';
  badge?: string;
};

export const MobileSearchModal: React.FC<MobileSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { clients, leads, engagements, services, computeEngagementTotals } = useAppData();
  
  const serviceById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const trimmedQuery = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!trimmedQuery) {
      return [] as { label: string; items: ResultItem[]; icon: React.ComponentType<any> }[];
    }

    const matchText = (value: string | undefined | null) =>
      value ? value.toLowerCase().includes(trimmedQuery) : false;

    const clientItems: ResultItem[] = clients
      .filter((client) => {
        const contactMatch = client.contacts.some((contact) => {
          if (!contact.active) {
            return false;
          }
          const fullName = `${contact.firstName} ${contact.lastName}`.trim();
          return (
            matchText(fullName) ||
            matchText(contact.email) ||
            matchText(contact.mobile) ||
            contact.roles.some((role) => matchText(role))
          );
        });
        return (
          matchText(client.name) ||
          matchText(client.email) ||
          matchText(client.city) ||
          matchText(client.siret) ||
          client.tags.some((tag) => matchText(tag)) ||
          contactMatch
        );
      })
      .slice(0, 6)
      .map((client) => {
        const billingContact = client.contacts.find((contact) => contact.active && contact.isBillingDefault);
        const fallbackContact =
          billingContact ?? client.contacts.find((contact) => contact.active);
        const subtitleParts = [
          client.city || undefined,
          fallbackContact ? `${fallbackContact.firstName} ${fallbackContact.lastName}`.trim() : undefined,
          fallbackContact?.email,
        ].filter(Boolean);
        return {
          id: client.id,
          kind: 'client' as const,
          title: client.name,
          subtitle: subtitleParts.join(' • '),
        } satisfies ResultItem;
      });

    const leadItems: ResultItem[] = leads
      .filter((lead) => matchText(lead.company) || matchText(lead.contact) || matchText(lead.email))
      .slice(0, 6)
      .map((lead) => ({
        id: lead.id,
        kind: 'lead' as const,
        title: lead.company || lead.contact,
        subtitle: [lead.contact || undefined, lead.email].filter(Boolean).join(' • '),
        badge: lead.status,
      }));

    const engagementItems: ResultItem[] = engagements
      .filter((engagement) => {
        const client = clientById.get(engagement.clientId);
        const service = serviceById.get(engagement.serviceId);
        const optionMatch = service?.options.some((option) => matchText(option.label));
        return (
          matchText(client?.name) ||
          matchText(service?.name) ||
          optionMatch ||
          matchText(engagement.kind === 'facture' ? 'facture' : engagement.kind === 'devis' ? 'devis' : 'service')
        );
      })
      .slice(0, 6)
      .map((engagement) => {
        const client = clientById.get(engagement.clientId);
        const service = serviceById.get(engagement.serviceId);
        const totals = computeEngagementTotals(engagement);
        const kindLabel = engagement.kind === 'facture' ? 'Facture' : engagement.kind === 'devis' ? 'Devis' : 'Service';
        return {
          id: engagement.id,
          kind: 'engagement' as const,
          title: `${kindLabel} · ${client?.name ?? 'Client'}`,
          subtitle: [service?.name, formatDate(engagement.scheduledAt), formatCurrency(totals.price + totals.surcharge)]
            .filter(Boolean)
            .join(' • '),
          badge: engagement.status,
        } satisfies ResultItem;
      });

    const nextGroups: { label: string; items: ResultItem[]; icon: React.ComponentType<any> }[] = [];
    if (clientItems.length) {
      nextGroups.push({ label: 'Clients', items: clientItems, icon: Building2 });
    }
    if (leadItems.length) {
      nextGroups.push({ label: 'Prospects', items: leadItems, icon: TrendingUp });
    }
    if (engagementItems.length) {
      nextGroups.push({ label: 'Devis', items: engagementItems, icon: FileText });
    }
    return nextGroups;
  }, [
    clients,
    leads,
    engagements,
    clientById,
    serviceById,
    computeEngagementTotals,
    trimmedQuery,
  ]);

  const flatResults = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSelect = (item: ResultItem) => {
    setQuery('');
    onClose();
    if (item.kind === 'client') {
      navigate(`/mobile/clients?clientId=${item.id}`);
    } else if (item.kind === 'lead') {
      navigate(`/mobile/prospects?leadId=${item.id}`);
    } else if (item.kind === 'engagement') {
      navigate(`/mobile/devis?engagementId=${item.id}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (flatResults.length > 0) {
      handleSelect(flatResults[0]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              backdropFilter: 'blur(4px)',
            }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 'env(safe-area-inset-top, 0px)',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: 'var(--space-md)',
                paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top, 0px))',
                borderBottom: '1px solid rgba(var(--border-rgb), 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
              }}
            >
              <form onSubmit={handleSubmit} style={{ flex: 1 }}>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(var(--border-rgb), 0.1)',
                    padding: 'var(--space-xs) var(--space-sm)',
                  }}
                >
                  <Search style={{ fontSize: '18px', color: 'var(--muted)', flexShrink: 0 }} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder="Rechercher un devis, prospect ou client..."
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '16px',
                      color: 'var(--text)',
                    }}
                    autoComplete="off"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--muted)',
                      }}
                    >
                      <X style={{ fontSize: '16px' }} />
                    </button>
                  )}
                </div>
              </form>
              <button
                onClick={onClose}
                style={{
                  border: 'none',
                  background: 'transparent',
                  borderRadius: 'var(--radius-md)',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  flexShrink: 0,
                }}
              >
                <X style={{ fontSize: '20px' }} />
              </button>
            </div>

            {/* Results */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'var(--space-sm)',
              }}
            >
              {trimmedQuery ? (
                flatResults.length === 0 ? (
                  <div
                    style={{
                      padding: 'var(--space-xl)',
                      textAlign: 'center',
                      color: 'var(--muted)',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '14px' }}>Aucun résultat</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {groups.map((group) => {
                      const Icon = group.icon;
                      return (
                        <div key={group.label}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-xs)',
                              marginBottom: 'var(--space-sm)',
                              padding: '0 var(--space-xs)',
                            }}
                          >
                            <Icon style={{ fontSize: '14px', color: 'var(--muted)' }} />
                            <p
                              style={{
                                margin: 0,
                                fontSize: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: 'var(--muted)',
                              }}
                            >
                              {group.label}
                            </p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {group.items.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelect(item)}
                                style={{
                                  border: 'none',
                                  background: 'var(--surface)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: 'var(--space-sm) var(--space-md)',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                }}
                                onMouseDown={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(var(--accent-rgb), 0.1)';
                                }}
                                onMouseUp={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--surface)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--surface)';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
                                  <span
                                    style={{
                                      fontSize: '15px',
                                      fontWeight: '600',
                                      color: 'var(--text)',
                                      flex: 1,
                                    }}
                                  >
                                    {item.title}
                                  </span>
                                  {item.badge && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'rgba(var(--accent-rgb), 0.1)',
                                        color: 'var(--accent)',
                                      }}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                {item.subtitle && (
                                  <span
                                    style={{
                                      fontSize: '13px',
                                      color: 'var(--muted)',
                                    }}
                                  >
                                    {item.subtitle}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div
                  style={{
                    padding: 'var(--space-xl)',
                    textAlign: 'center',
                    color: 'var(--muted)',
                  }}
                >
                  <Search style={{ fontSize: '48px', margin: '0 auto var(--space-md)', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>Recherchez un devis, prospect ou client</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
