import React, { useMemo } from 'react';
import { X, Mail, Phone, MapPin, FileCheck, Calendar, Euro } from 'lucide-react';
import clsx from 'clsx';
import { CRMModal, CRMModalHeader } from './crm';
import type { Lead, Client, Engagement, Service } from '../store/useAppData';
import { formatCurrency, formatDate } from '../lib/format';
import { computeEngagementTotals } from '../pages/service/utils';

type LeadDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  clients: Client[];
  engagements: Engagement[];
  services: Service[];
  computeEngagementTotals: (engagement: Engagement) => { price: number; surcharge: number; duration: number };
};

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  lead,
  clients,
  engagements,
  services,
  computeEngagementTotals,
}) => {
  // Trouver le client correspondant au lead (par email ou téléphone)
  const relatedClient = useMemo(() => {
    if (!lead) return null;

    const normalizedEmail = lead.email.trim().toLowerCase();
    const normalizedPhone = lead.phone?.trim().toLowerCase() || '';

    // Chercher par email
    if (normalizedEmail) {
      const clientByEmail = clients.find((client) => {
        if (client.email?.toLowerCase() === normalizedEmail) return true;
        return client.contacts.some((contact) => contact.email.toLowerCase() === normalizedEmail);
      });
      if (clientByEmail) return clientByEmail;
    }

    // Chercher par téléphone
    if (normalizedPhone) {
      const clientByPhone = clients.find((client) => {
        if (client.phone?.toLowerCase().includes(normalizedPhone)) return true;
        return client.contacts.some((contact) => contact.mobile.toLowerCase().includes(normalizedPhone));
      });
      if (clientByPhone) return clientByPhone;
    }

    return null;
  }, [lead, clients]);

  // Trouver les devis du client lié
  const leadQuotes = useMemo(() => {
    if (!relatedClient) return [];

    return engagements
      .filter((engagement) => engagement.clientId === relatedClient.id && engagement.kind === 'devis')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }, [relatedClient, engagements]);

  if (!lead) return null;

  return (
    <CRMModal isOpen={isOpen} onClose={onClose} maxWidth="3xl">
      <div className="flex flex-col bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-hidden">
        <CRMModalHeader
          eyebrow="DÉTAILS DU PROSPECT"
          title={lead.company || lead.contact || 'Prospect'}
          description="Informations du prospect et historique des devis"
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Informations du prospect */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                Informations
              </h3>

              <div className="space-y-3">
                {lead.company && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">
                      Entreprise
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.company}</p>
                  </div>
                )}

                {lead.contact && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">
                      Contact
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.contact}</p>
                  </div>
                )}

                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">
                        E-mail
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.email}</p>
                    </div>
                  </div>
                )}

                {lead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">
                        Téléphone
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.phone}</p>
                    </div>
                  </div>
                )}

                {lead.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">
                        Adresse
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.address}</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">
                    Statut
                  </p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {lead.status}
                  </span>
                </div>

                {lead.estimatedValue !== null && lead.estimatedValue !== undefined && (
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">
                        Valeur estimée
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(lead.estimatedValue)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Devis existants */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                Devis existants
              </h3>

              {!relatedClient ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileCheck className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Aucun client associé
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Ce prospect n'a pas encore été converti en client
                  </p>
                </div>
              ) : leadQuotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileCheck className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Aucun devis enregistré
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Les devis créés apparaîtront ici
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leadQuotes.map((engagement) => {
                    const service = services.find((s) => s.id === engagement.serviceId);
                    const quoteStatus = engagement.quoteStatus || 'brouillon';
                    const statusConfig: Record<string, { color: string; bg: string }> = {
                      accepté: { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                      refusé: { color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                      en_attente: { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                      brouillon: { color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50' },
                    };
                    const statusInfo = statusConfig[quoteStatus] || statusConfig.brouillon;

                    return (
                      <div
                        key={engagement.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <FileCheck className="h-4 w-4 text-purple-500" />
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {service?.name || 'Service inconnu'}
                              </p>
                            </div>
                            {engagement.quoteNumber && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                Devis n° {engagement.quoteNumber}
                              </p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatDate(engagement.scheduledAt)}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                              <span
                                className={clsx(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                  statusInfo.bg,
                                  statusInfo.color
                                )}
                              >
                                {quoteStatus}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {formatCurrency((() => {
                                const totals = computeEngagementTotals(engagement);
                                return totals.price + totals.surcharge;
                              })())}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CRMModal>
  );
};

