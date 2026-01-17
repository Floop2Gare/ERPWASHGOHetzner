import { useState, useMemo, useRef, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Building2, Filter, Search, X, Mail, Phone, Edit2, Trash2, Download, Plus, Users, TrendingUp, FileText } from 'lucide-react';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { IconEdit, IconPlus, IconTrash, IconDocument } from '../../components/icons';
import { useAppData } from '../../store/useAppData';
import { CompanyService } from '../../api';
import { BRAND_NAME } from '../../lib/branding';
import { Copy, Key } from 'lucide-react';
import { buildCompanyForm, type CompanyFormState } from './types';
import type { Company } from '../../store/useAppData';
import {
  CRMFeedback,
  CRMBackendStatus,
  CRMBulkActions,
  CRMEmptyState,
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
  CRMFormSelect,
  CRMSubmitButton,
  CRMCancelButton,
  CRMErrorAlert,
} from '../../components/crm';

const inputClass =
  'rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
const fieldLabelClass =
  'flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500';

export const CompaniesSection = () => {
  const {
    companies,
    addCompany,
    updateCompany,
    removeCompany,
    activeCompanyId,
    setActiveCompany,
    setVatEnabled,
    vatRate,
    setVatRate,
  } = useAppData();

  const [searchParams, setSearchParams] = useSearchParams();

  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [companyFilterActive, setCompanyFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [companyFilterVat, setCompanyFilterVat] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [companyFilterPlanning, setCompanyFilterPlanning] = useState<'all' | 'clement' | 'adrien' | 'tous'>('all');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(() =>
    buildCompanyForm(companies.find((c) => c.id === activeCompanyId) ?? companies[0] ?? null)
  );
  const [companySubmitError, setCompanySubmitError] = useState<string | null>(null);
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [backendLoading, setBackendLoading] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const companyDetailFormRef = useRef<HTMLFormElement | null>(null);
  const companyLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const companyInvoiceLogoFileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch =
        !companySearchQuery ||
        company.name.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
        company.siret?.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
        company.email?.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
        company.city?.toLowerCase().includes(companySearchQuery.toLowerCase());

      const matchesActive =
        companyFilterActive === 'all' ||
        (companyFilterActive === 'active' && activeCompanyId === company.id) ||
        (companyFilterActive === 'inactive' && activeCompanyId !== company.id);

      const matchesVat =
        companyFilterVat === 'all' ||
        (companyFilterVat === 'enabled' && company.vatEnabled) ||
        (companyFilterVat === 'disabled' && !company.vatEnabled);

      const matchesPlanning =
        companyFilterPlanning === 'all' ||
        (companyFilterPlanning === 'clement' && company.planningUser === 'clement') ||
        (companyFilterPlanning === 'adrien' && company.planningUser === 'adrien') ||
        (companyFilterPlanning === 'tous' && !company.planningUser);

      return matchesSearch && matchesActive && matchesVat && matchesPlanning;
    });
  }, [companies, companySearchQuery, companyFilterActive, companyFilterVat, companyFilterPlanning, activeCompanyId]);

  const resetCompanyFilters = () => {
    setCompanySearchQuery('');
    setCompanyFilterActive('all');
    setCompanyFilterVat('all');
    setCompanyFilterPlanning('all');
  };

  const activeFiltersCount = useMemo(
    () => (companySearchQuery ? 1 : 0) + (companyFilterActive !== 'all' ? 1 : 0) + (companyFilterVat !== 'all' ? 1 : 0) + (companyFilterPlanning !== 'all' ? 1 : 0),
    [companySearchQuery, companyFilterActive, companyFilterVat, companyFilterPlanning]
  );

  const toggleRowSelection = (companyId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const allSelected = useMemo(
    () => filteredCompanies.length > 0 && filteredCompanies.every((company) => selectedRows.has(company.id)),
    [filteredCompanies, selectedRows]
  );

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredCompanies.forEach((company) => next.delete(company.id));
        return next;
      });
    } else {
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredCompanies.forEach((company) => next.add(company.id));
        return next;
      });
    }
  };

  const companyKpis = useMemo(() => {
    const totalCompanies = filteredCompanies.length;
    const activeCompanies = filteredCompanies.filter((c) => activeCompanyId === c.id).length;
    const vatEnabledCount = filteredCompanies.filter((c) => c.vatEnabled).length;

    return [
      {
        id: 'total',
        label: 'Entreprises',
        value: totalCompanies.toLocaleString('fr-FR'),
        helper: `${activeCompanies.toLocaleString('fr-FR')} active${activeCompanies > 1 ? 's' : ''}`,
      },
      {
        id: 'vat',
        label: 'TVA activée',
        value: vatEnabledCount.toLocaleString('fr-FR'),
        helper: 'Entreprises avec TVA',
      },
      {
        id: 'default',
        label: 'Entreprise par défaut',
        value: filteredCompanies.find((c) => c.isDefault)?.name || '—',
        helper: 'Utilisée par défaut',
      },
    ];
  }, [filteredCompanies, activeCompanyId]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const openCompanyDetail = useCallback((company: Company | null = null) => {
    setCompanyForm(buildCompanyForm(company));
    setEditingCompanyId(company?.id ?? null);
    setCompanySubmitError(null);
    setNewApiKey(null);
    setShowCompanyModal(true);
  }, []);

  const closeCompanyModal = useCallback(() => {
    setShowCompanyModal(false);
    setEditingCompanyId(null);
    setCompanySubmitError(null);
    setNewApiKey(null);
  }, []);

  const handleCompanyFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;
    setCompanyForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCompanyLogoSelect = () => {
    companyLogoFileInputRef.current?.click();
  };

  const handleCompanyLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setCompanyForm((prev) => ({ ...prev, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleCompanyLogoClear = () => {
    setCompanyForm((prev) => ({ ...prev, logoUrl: '' }));
    if (companyLogoFileInputRef.current) {
      companyLogoFileInputRef.current.value = '';
    }
  };

  const handleCompanyInvoiceLogoSelect = () => {
    companyInvoiceLogoFileInputRef.current?.click();
  };

  const handleCompanyInvoiceLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setCompanyForm((prev) => ({ ...prev, invoiceLogoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Ouvrir automatiquement la fiche d'entreprise depuis l'URL (?companyId=...)
  useEffect(() => {
    const companyIdFromUrl = searchParams.get('companyId');
    if (!companyIdFromUrl) {
      return;
    }

    // Nettoyer le paramètre IMMÉDIATEMENT pour éviter la boucle
    const next = new URLSearchParams(searchParams);
    next.delete('companyId');
    setSearchParams(next, { replace: true });

    const targetId = companyIdFromUrl === 'active' ? activeCompanyId : companyIdFromUrl;
    if (!targetId) {
      return;
    }

    const company = companies.find((c) => c.id === targetId) ?? null;
    if (!company) {
      return;
    }

    // Vérifier si la modale n'est pas déjà ouverte avec cette entreprise
    if (showCompanyModal && editingCompanyId === company.id) {
      return;
    }

    openCompanyDetail(company);
  }, [searchParams, companies, activeCompanyId, openCompanyDetail, setSearchParams, showCompanyModal, editingCompanyId]);

  const handleCompanyInvoiceLogoClear = () => {
    setCompanyForm((prev) => ({ ...prev, invoiceLogoUrl: '' }));
    if (companyInvoiceLogoFileInputRef.current) {
      companyInvoiceLogoFileInputRef.current.value = '';
    }
  };

  const handleCompanySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCompanySubmitError(null);
    setCompanySubmitting(true);

    try {
      const payload = {
        name: companyForm.name.trim(),
        email: companyForm.email.trim(),
        phone: companyForm.phone.trim(),
        address: companyForm.address.trim(),
        postalCode: companyForm.postalCode.trim(),
        city: companyForm.city.trim(),
        country: companyForm.country.trim(),
        siret: companyForm.siret.trim(),
        vatNumber: companyForm.vatNumber.trim(),
        legalNotes: companyForm.legalNotes.trim(),
        vatEnabled: companyForm.vatEnabled,
        website: companyForm.website.trim(),
        isDefault: companyForm.isDefault,
        documentHeaderTitle: companyForm.documentHeaderTitle.trim(),
        documentHeaderSubtitle: companyForm.documentHeaderSubtitle.trim(),
        documentHeaderNote: companyForm.documentHeaderNote.trim(),
        logoUrl: companyForm.logoUrl.trim(),
        invoiceLogoUrl: companyForm.invoiceLogoUrl.trim(),
        bankName: companyForm.bankName.trim(),
        bankAddress: companyForm.bankAddress.trim(),
        iban: companyForm.iban.trim(),
        bic: companyForm.bic.trim(),
        planningUser: companyForm.planningUser || null,
      };

      let result;
      if (editingCompanyId) {
        result = await CompanyService.updateCompany(editingCompanyId, payload);
        if (result.success) {
          updateCompany(editingCompanyId, result.data);
        }
      } else {
        // addCompany() gère déjà la création via l'API et le rechargement depuis le backend
        // Pas besoin d'appeler CompanyService.createCompany() ici pour éviter la duplication
        const newCompany = addCompany(payload);
        // addCompany() retourne l'entreprise créée localement
        // Le rechargement depuis le backend se fera automatiquement dans addCompany()
        result = { success: true, data: newCompany };
      }

      if (result.success) {
        if (result.data.isDefault) {
          setActiveCompany(result.data.id);
          setVatEnabled(result.data.vatEnabled);
        }
        closeCompanyModal();
      } else {
        setCompanySubmitError(result.error || 'Erreur lors de la sauvegarde.');
      }
    } catch (error: any) {
      setCompanySubmitError(error?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setCompanySubmitting(false);
    }
  };

  const handleCompanyVatToggle = (company: Company, enabled: boolean) => {
    const updated = updateCompany(company.id, { vatEnabled: enabled });
    if (updated && activeCompanyId === company.id) {
      setVatEnabled(enabled);
    }
  };

  const handleCompanySetDefault = (company: Company) => {
    const updated = updateCompany(company.id, { isDefault: true });
    if (updated) {
      setActiveCompany(updated.id);
      setVatEnabled(updated.vatEnabled);
    }
  };

  const handleCompanyRemove = (companyId: string) => {
    removeCompany(companyId);
  };

  const handleCompanyPreview = (company: Company) => {
    setEditingCompanyId(company.id);
    setCompanyForm(buildCompanyForm(company));
    setNewApiKey(null);
    setShowCompanyModal(true);
  };

  const handleCall = (company: Company) => {
    if (company.phone) {
      window.location.href = `tel:${company.phone.replace(/\s+/g, '')}`;
    }
  };

  const sendEmail = (company: Company) => {
    if (company.email) {
      window.location.href = `mailto:${company.email}`;
    }
  };

  const [generatingApiKey, setGeneratingApiKey] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const handleGenerateApiKey = async (companyId: string) => {
    setGeneratingApiKey(companyId);
    setNewApiKey(null);
    try {
      const result = await CompanyService.generateApiKey(companyId);
      if (result.success && result.data) {
        setNewApiKey(result.data.apiKey);
        // Mettre à jour l'entreprise dans le store
        const company = companies.find((c) => c.id === companyId);
        if (company) {
          updateCompany(companyId, { apiKey: result.data.apiKey });
        }
        setFeedback('Clé API générée avec succès. Copiez-la avant de fermer cette fenêtre.');
      } else {
        setFeedback('Erreur lors de la génération de la clé API.');
      }
    } catch (error: any) {
      setFeedback('Erreur lors de la génération de la clé API.');
    } finally {
      setGeneratingApiKey(null);
    }
  };

  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setFeedback('Clé API copiée dans le presse-papier.');
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    if (!showCompanyModal) return;
    
    const body = document.body;
    const originalOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCompanyModal();
      }
    };

    window.addEventListener('keydown', handleEscape);
    
    const timer = window.setTimeout(() => {
      const focusable = companyDetailFormRef.current?.querySelector<HTMLElement>('input, select, textarea');
      focusable?.focus({ preventScroll: true });
    }, 150);
    
    return () => {
      body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
      window.clearTimeout(timer);
    };
  }, [showCompanyModal, closeCompanyModal]);

  return (
    <>
      <div className="dashboard-page space-y-10">
        <header className="dashboard-hero">
          <div className="dashboard-hero__content">
            <div className="dashboard-hero__intro">
              <h1 className="dashboard-hero__title">Entreprises</h1>
              <p className="dashboard-hero__subtitle">
                Centralisez vos entités légales, ajustez vos préférences TVA et laissez {BRAND_NAME} générer automatiquement
                les factures selon l&apos;entreprise active.
              </p>
            </div>
          </div>
          <div className="dashboard-hero__glow" aria-hidden />
        </header>

        <CRMFeedback message={feedback} />

        <section className="space-y-4">
          <CRMBackendStatus
            loading={backendLoading}
            error={backendError}
            loadingMessage="Synchronisation des entreprises avec le serveur…"
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {companyKpis.map((kpi, index) => {
              const Icon = [Building2, TrendingUp, FileText][index] ?? Building2;
              return (
                <div key={kpi.label} className="dashboard-kpi group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="dashboard-kpi__eyebrow">{kpi.label}</p>
                      <p className="dashboard-kpi__value">{kpi.value}</p>
                      <p className="dashboard-kpi__description">{kpi.helper}</p>
                    </div>
                    <div className="dashboard-kpi__icon">
                      <Icon />
                    </div>
                  </div>
                  <div className="dashboard-kpi__glow" aria-hidden />
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tout sélectionner</span>
                </div>
                <CRMBulkActions
                  selectedCount={selectedRows.size}
                  actions={[]}
                />
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">TVA (%)</label>
                  <input
                    type="number"
                    value={vatRate}
                    min={0}
                    max={100}
                    onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                    className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                  className={clsx(
                    'relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                    showFilters || activeFiltersCount > 0
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white dark:bg-blue-500">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openCompanyDetail(null)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle entreprise
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Recherche</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={companySearchQuery}
                      onChange={(e) => setCompanySearchQuery(e.target.value)}
                      placeholder="Nom, SIRET, email, ville..."
                      className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Statut</label>
                  <select
                    value={companyFilterActive}
                    onChange={(e) => setCompanyFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">TVA</label>
                  <select
                    value={companyFilterVat}
                    onChange={(e) => setCompanyFilterVat(e.target.value as 'all' | 'enabled' | 'disabled')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="all">Toutes</option>
                    <option value="enabled">Activée</option>
                    <option value="disabled">Désactivée</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Planning</label>
                  <select
                    value={companyFilterPlanning}
                    onChange={(e) => setCompanyFilterPlanning(e.target.value as 'all' | 'clement' | 'adrien' | 'tous')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="all">Tous</option>
                    <option value="clement">Clément</option>
                    <option value="adrien">Adrien</option>
                    <option value="tous">Tous</option>
                  </select>
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetCompanyFilters}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <X className="h-4 w-4" />
                  Effacer les filtres
                </button>
              )}
            </div>
          )}
        </section>

        {filteredCompanies.length > 0 ? (
          <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
            <div className="overflow-x-auto rounded-2xl">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-4 py-4 w-12" />
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Entreprise
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Informations légales
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Adresse
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompanies.map((company) => (
                    <tr
                      key={company.id}
                      className={clsx(
                        'group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer',
                        selectedRows.has(company.id) && 'bg-blue-50/50 dark:bg-blue-500/10'
                      )}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('input[type="checkbox"]') ||
                          target.closest('button') ||
                          target.closest('a')
                        ) {
                          return;
                        }
                        openCompanyDetail(company);
                      }}
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(company.id)}
                          onChange={() => toggleRowSelection(company.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {company.name}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {company.isDefault && (
                                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-800 dark:text-emerald-100">
                                  Par défaut
                                </span>
                              )}
                              {company.vatEnabled && (
                                <span className="rounded bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-800 dark:text-purple-100">
                                  TVA activée
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {company.siret || '—'}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {company.postalCode || ''} {company.country || ''}
                        </p>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {company.address || '—'}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {company.city || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{company.email || '—'}</p>
                          <p>{company.phone || '—'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-start gap-2 opacity-100 transition group-hover:translate-x-[1px] group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => sendEmail(company)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                            title="Email"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCall(company)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-green-100 hover:text-green-700 dark:text-slate-300 dark:hover:bg-green-900/30 dark:hover:text-green-200"
                            title="Appeler"
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCompanyDetail(company);
                            }}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCompanyRemove(company.id)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <CRMEmptyState
            message={companies.length === 0 
              ? "Ajoutez votre première entreprise pour commencer à générer des documents officiels."
              : "Ajustez votre recherche ou vos filtres pour retrouver vos entreprises."}
          />
        )}

        {filteredCompanies.length === 0 && companies.length > 0 && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={resetCompanyFilters}
              className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      <CRMModal isOpen={showCompanyModal} onClose={closeCompanyModal}>
        <form
          ref={companyDetailFormRef}
          onSubmit={handleCompanySubmit}
          className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          <CRMModalHeader
            eyebrow={editingCompanyId ? "MODIFIER L'ENTREPRISE" : 'CRÉER UNE ENTREPRISE'}
            title={companyForm.name || 'Entreprise'}
            description={editingCompanyId
              ? "Consultez et modifiez les informations de l'entreprise."
              : "Renseignez les informations légales, TVA et visuels pour créer une nouvelle entité."}
            onClose={closeCompanyModal}
          />

          <div className="space-y-4">
            <CRMErrorAlert message={companySubmitError} />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <CRMFormLabel htmlFor="company-name" required>
                  Nom de l&apos;entreprise
                </CRMFormLabel>
                <CRMFormInput
                  id="company-name"
                  name="name"
                  type="text"
                  value={companyForm.name}
                  onChange={handleCompanyFormChange}
                  required
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="company-siret">SIRET</CRMFormLabel>
                <CRMFormInput
                  id="company-siret"
                  name="siret"
                  type="text"
                  value={companyForm.siret}
                  onChange={handleCompanyFormChange}
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="company-email">Email</CRMFormLabel>
                <CRMFormInput
                  id="company-email"
                  name="email"
                  type="email"
                  value={companyForm.email}
                  onChange={handleCompanyFormChange}
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="company-phone">Téléphone</CRMFormLabel>
                <CRMFormInput
                  id="company-phone"
                  name="phone"
                  type="tel"
                  value={companyForm.phone}
                  onChange={handleCompanyFormChange}
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="company-address">Adresse</CRMFormLabel>
                <CRMFormInput
                  id="company-address"
                  name="address"
                  type="text"
                  value={companyForm.address}
                  onChange={handleCompanyFormChange}
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="company-postal-code">Code postal</CRMFormLabel>
                <CRMFormInput
                  id="company-postal-code"
                  name="postalCode"
                  type="text"
                  value={companyForm.postalCode}
                  onChange={handleCompanyFormChange}
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="company-city">Ville</CRMFormLabel>
                <CRMFormInput
                  id="company-city"
                  name="city"
                  type="text"
                  value={companyForm.city}
                  onChange={handleCompanyFormChange}
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="company-country">Pays</CRMFormLabel>
                <CRMFormInput
                  id="company-country"
                  name="country"
                  type="text"
                  value={companyForm.country}
                  onChange={handleCompanyFormChange}
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="company-website">Site web</CRMFormLabel>
                <CRMFormInput
                  id="company-website"
                  name="website"
                  type="url"
                  value={companyForm.website}
                  onChange={handleCompanyFormChange}
                  placeholder="https://..."
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="company-planning">Planning</CRMFormLabel>
                <CRMFormSelect
                  id="company-planning"
                  name="planningUser"
                  value={companyForm.planningUser || ''}
                  onChange={handleCompanyFormChange}
                >
                  <option value="">Tous</option>
                  <option value="clement">Clément</option>
                  <option value="adrien">Adrien</option>
                </CRMFormSelect>
              </div>
            </div>

            {/* Section Clé API */}
            {editingCompanyId && (
              <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Clé API pour les webhooks</h3>
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Utilisez cette clé pour connecter votre site web externe et recevoir automatiquement les réservations dans cette entreprise.
                  </p>
                  {(() => {
                    const currentCompany = companies.find((c) => c.id === editingCompanyId);
                    const apiKeyToDisplay = newApiKey ?? currentCompany?.apiKey ?? null;
                    return (
                      <div className="space-y-2">
                        {apiKeyToDisplay ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={apiKeyToDisplay}
                              className="flex-1 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyApiKey(apiKeyToDisplay)}
                              title="Copier la clé"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400 italic">Aucune clé API générée</p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateApiKey(editingCompanyId)}
                          disabled={generatingApiKey === editingCompanyId}
                        >
                          <Key className="mr-2 h-4 w-4" />
                          {generatingApiKey === editingCompanyId
                            ? 'Génération...'
                            : apiKeyToDisplay
                              ? 'Régénérer la clé'
                              : 'Générer une clé API'}
                        </Button>
                        {newApiKey && (
                          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                            <strong>Important :</strong> Copiez cette clé maintenant. Vous ne pourrez plus la voir après avoir fermé cette fenêtre.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Section Options */}
            <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="company-vat-enabled"
                  name="vatEnabled"
                  checked={companyForm.vatEnabled}
                  onChange={handleCompanyFormChange}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="company-vat-enabled" className="text-sm text-slate-600 dark:text-slate-300">
                  TVA activée
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="company-is-default"
                  name="isDefault"
                  checked={companyForm.isDefault}
                  onChange={handleCompanyFormChange}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="company-is-default" className="text-sm text-slate-600 dark:text-slate-300">
                  Entreprise par défaut
                </label>
              </div>
            </div>

                {/* Section Logos */}
                <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Logos</h3>
                  
                  {/* Logo général */}
                  <div className="space-y-2">
                    <label className={fieldLabelClass}>
                      <span>Logo de l&apos;entreprise</span>
                      <div className="flex items-center gap-3">
                        {companyForm.logoUrl ? (
                          <div className="relative">
                            <img
                              src={companyForm.logoUrl}
                              alt="Logo entreprise"
                              className="h-16 w-16 rounded-lg border border-slate-300 object-contain dark:border-slate-700"
                            />
                            <button
                              type="button"
                              onClick={handleCompanyLogoClear}
                              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
                              title="Supprimer le logo"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 dark:border-slate-700">
                            <Building2 className="h-6 w-6" />
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            ref={companyLogoFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCompanyLogoUpload}
                            className="hidden"
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={handleCompanyLogoSelect}>
                            {companyForm.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
                          </Button>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Logo affiché dans la sidebar et la topbar
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Logo factures */}
                  <div className="space-y-2">
                    <label className={fieldLabelClass}>
                      <span>Logo pour les factures</span>
                      <div className="flex items-center gap-3">
                        {companyForm.invoiceLogoUrl ? (
                          <div className="relative">
                            <img
                              src={companyForm.invoiceLogoUrl}
                              alt="Logo factures"
                              className="h-16 w-16 rounded-lg border border-slate-300 object-contain dark:border-slate-700"
                            />
                            <button
                              type="button"
                              onClick={handleCompanyInvoiceLogoClear}
                              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
                              title="Supprimer le logo"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 dark:border-slate-700">
                            <IconDocument className="h-6 w-6" />
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            ref={companyInvoiceLogoFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCompanyInvoiceLogoUpload}
                            className="hidden"
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={handleCompanyInvoiceLogoSelect}>
                            {companyForm.invoiceLogoUrl ? 'Changer le logo' : 'Ajouter un logo'}
                          </Button>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Logo affiché en haut des factures et devis
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

            <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <CRMCancelButton onClick={closeCompanyModal} />
              <CRMSubmitButton type={editingCompanyId ? 'update' : 'create'} disabled={companySubmitting}>
                {companySubmitting ? 'Enregistrement…' : editingCompanyId ? 'Enregistrer' : 'Créer'}
              </CRMSubmitButton>
            </div>
          </div>
        </form>
      </CRMModal>
    </>
  );
};
