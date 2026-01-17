import React, { useState, useMemo, useEffect, useRef, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Phone, Email, Business, Person, Add, Edit, Note, Call } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppData } from '../../store/useAppData';
import { formatDate } from '../../lib/format';
import { normalisePhone } from '../../lib/phone';
import type { Lead, LeadStatus, SupportType, LeadActivityType } from '../../store/useAppData';
import { LeadService } from '../../api';
import '../mobile.css';
import '../../styles/apple-mobile.css';

const getInitials = (value: string) => {
  const parts = value
    .split(' ')
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (!parts.length) {
    return '??';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

const buildRow = (lead: Lead) => {
  const organization = lead.company || lead.contact || 'Prospect sans nom';
  const contactName = lead.contact || '';
  const email = lead.email || '';
  const phone = lead.phone || '';
  const status = lead.status || 'Nouveau';

  return {
    id: lead.id,
    lead,
    status,
    organization,
    contactName,
    email,
    phone,
    address: lead.address || '',
    tags: lead.tags || [],
    avatarLabel: getInitials(organization),
  };
};

type CreateLeadFormState = {
  company: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  status: LeadStatus;
  source: string;
  supportType: SupportType;
  supportDetail: string;
  clientType: 'company' | 'individual';
  siret: string;
  estimatedValue: string;
  estimatedValueType: 'mensuel' | 'annuel' | 'prestation';
  companyId: string;
  owner: string;
  nextStepDate: string;
  nextStepNote: string;
};

const CREATE_LEAD_DEFAULTS: CreateLeadFormState = {
  company: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  status: 'Nouveau',
  source: 'inconnu',
  supportType: 'Voiture',
  supportDetail: '',
  clientType: 'company',
  siret: '',
  estimatedValue: '',
  estimatedValueType: 'prestation',
  companyId: '',
  owner: '',
  nextStepDate: '',
  nextStepNote: '',
};

const MobileProspectsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const leads = useAppData((state) => state.leads) || [];
  const companies = useAppData((state) => state.companies) || [];
  const authUsers = useAppData((state) => state.authUsers) || [];
  const activeCompanyId = useAppData((state) => state.activeCompanyId);
  const addLead = useAppData((state) => state.addLead);
  const updateLead = useAppData((state) => state.updateLead);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [createLeadForm, setCreateLeadForm] = useState<CreateLeadFormState>(() => ({
    ...CREATE_LEAD_DEFAULTS,
    companyId: activeCompanyId || companies[0]?.id || '',
    owner: authUsers[0]?.fullName || authUsers[0]?.username || '',
  }));
  const [createLeadError, setCreateLeadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [pendingActivities, setPendingActivities] = useState<Array<{ type: LeadActivityType; content: string }>>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteType, setNoteType] = useState<LeadActivityType>('note');
  const recordLeadActivity = useAppData((state) => state.recordLeadActivity);
  const hasLoadedRef = useRef(false);

  const owners = useMemo(() => {
    const uniqueOwners = Array.from(new Set(leads.map((lead) => lead.owner))).sort((a, b) => a.localeCompare(b));
    return uniqueOwners.length > 0 ? uniqueOwners : ['Adrien'];
  }, [leads]);

  const sources = useMemo(() => {
    return Array.from(new Set(leads.map((lead) => lead.source))).sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const defaultOwner = owners[0] ?? 'Adrien';
  const defaultCompanyId = activeCompanyId || companies[0]?.id || '';

  const tableData = useMemo(() => {
    return leads
      .map((lead) => buildRow(lead))
      .sort((a, b) => a.organization.localeCompare(b.organization, 'fr', { sensitivity: 'base' }));
  }, [leads]);

  // Pagination
  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return tableData.slice(startIndex, endIndex);
  }, [tableData, currentPage, itemsPerPage]);

  // Charger les prospects depuis le backend (une seule fois par session)
  useEffect(() => {
    // Protection globale pour éviter les chargements multiples
    if (hasLoadedRef.current || (window as any).__mobileProspectsLoaded) {
      hasLoadedRef.current = true;
      return;
    }

    if (leads.length > 0) {
      hasLoadedRef.current = true;
      (window as any).__mobileProspectsLoaded = true;
      return;
    }

    const loadFromBackend = async () => {
      if (hasLoadedRef.current || (window as any).__mobileProspectsLoaded) {
        return;
      }
      hasLoadedRef.current = true;
      (window as any).__mobileProspectsLoaded = true;

      try {
        setBackendLoading(true);
        setBackendError(null);
        
        const result = await LeadService.getAll();
        if (result.success && Array.isArray(result.data)) {
          const mapped = result.data.map((l: any) => ({
            id: l.id,
            company: l.company ?? l.name ?? '',
            contact: l.contact ?? l.contactName ?? '',
            phone: l.phone ?? '',
            email: l.email ?? '',
            source: l.source ?? 'inconnu',
            segment: l.segment ?? 'général',
            status: (l.status as LeadStatus) ?? 'Nouveau',
            nextStepDate: l.nextStepDate ?? null,
            nextStepNote: l.nextStepNote ?? '',
            estimatedValue: l.estimatedValue ?? 0,
            owner: l.owner ?? '',
            tags: Array.isArray(l.tags) ? l.tags : [],
            address: l.address ?? '',
            companyId: l.companyId ?? activeCompanyId ?? '',
            supportType: (l.supportType as SupportType) ?? 'Voiture',
            supportDetail: l.supportDetail ?? '',
            siret: l.siret ?? '',
            clientType: (l.clientType as 'company' | 'individual') || 'company',
            createdAt: l.createdAt ?? new Date().toISOString(),
            activities: Array.isArray(l.activities) ? l.activities : [],
            lastContact: l.lastContact ?? null,
          }));
          
          useAppData.setState({ leads: mapped });
        } else if (!result.success) {
          setBackendError(result.error || 'Erreur lors du chargement des prospects.');
          hasLoadedRef.current = false;
        }
      } catch (error: any) {
        setBackendError(error?.message || 'Erreur lors du chargement des prospects.');
        hasLoadedRef.current = false;
      } finally {
        setBackendLoading(false);
      }
    };
    
    loadFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timeout = window.setTimeout(() => setSuccessMessage(null), 4000);
      return () => window.clearTimeout(timeout);
    }
  }, [successMessage]);

  // Gérer le paramètre leadId de l'URL pour ouvrir automatiquement la fiche du prospect
  useEffect(() => {
    const leadIdFromUrl = searchParams.get('leadId');
    if (leadIdFromUrl && leads.length > 0) {
      const lead = leads.find((l) => l.id === leadIdFromUrl);
      if (lead) {
        // Trouver sur quelle page se trouve ce prospect
        const leadIndex = tableData.findIndex((row) => row.id === leadIdFromUrl);
        if (leadIndex >= 0) {
          const targetPage = Math.floor(leadIndex / itemsPerPage) + 1;
          if (targetPage !== currentPage) {
            setCurrentPage(targetPage);
          }
          // Attendre que la page soit mise à jour avant d'expandre
          setTimeout(() => {
            setExpandedLeadId(leadIdFromUrl);
            // Nettoyer l'URL pour éviter de réouvrir à chaque fois
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('leadId');
            setSearchParams(newParams, { replace: true });
          }, 100);
        } else {
          // Prospect trouvé mais pas dans tableData (filtre ?), l'expander quand même
          setExpandedLeadId(leadIdFromUrl);
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('leadId');
          setSearchParams(newParams, { replace: true });
        }
      }
    }
  }, [searchParams, leads, tableData, itemsPerPage, currentPage, setSearchParams]);

  // Mettre à jour les valeurs par défaut quand les données sont disponibles
  useEffect(() => {
    if (!showCreateLeadModal && !editingLeadId) {
      setCreateLeadForm((prev) => ({
        ...prev,
        companyId: defaultCompanyId || prev.companyId,
        owner: defaultOwner || prev.owner,
      }));
    }
  }, [defaultCompanyId, defaultOwner, showCreateLeadModal, editingLeadId]);

  const handleCall = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
    }
  };

  const handleEmail = (email: string) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  // Vérification des doublons email/téléphone
  const emailDuplicate = useMemo(() => {
    const value = createLeadForm.email.trim().toLowerCase();
    if (!value) return false;
    return leads.some((lead) => lead.id !== editingLeadId && lead.email.toLowerCase() === value);
  }, [createLeadForm.email, leads, editingLeadId]);

  const phoneDuplicate = useMemo(() => {
    const value = normalisePhone(createLeadForm.phone);
    if (!value) return false;
    return leads.some((lead) => lead.id !== editingLeadId && normalisePhone(lead.phone) === value);
  }, [createLeadForm.phone, leads, editingLeadId]);

  const resetCreateLeadForm = () => {
    setCreateLeadForm({ 
      ...CREATE_LEAD_DEFAULTS,
      companyId: defaultCompanyId,
      owner: defaultOwner,
    });
    setCreateLeadError(null);
    setEditingLeadId(null);
    setPendingActivities([]);
    setNoteDraft('');
    setNoteType('note');
  };

  const openCreateLeadModal = () => {
    resetCreateLeadForm();
    setShowCreateLeadModal(true);
  };

  const openEditLeadModal = (lead: Lead) => {
    setCreateLeadForm({
      company: lead.company || '',
      contact: lead.contact || '',
      phone: lead.phone || '',
      email: lead.email || '',
      address: lead.address || '',
      status: lead.status || 'Nouveau',
      source: lead.source || 'inconnu',
      supportType: lead.supportType || 'Voiture',
      supportDetail: lead.supportDetail || '',
      clientType: lead.clientType || 'company',
      siret: lead.siret || '',
      estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : '',
      estimatedValueType: 'prestation',
      companyId: lead.companyId || defaultCompanyId,
      owner: lead.owner || defaultOwner,
      nextStepDate: lead.nextStepDate ? lead.nextStepDate.slice(0, 10) : '',
      nextStepNote: lead.nextStepNote || '',
    });
    setEditingLeadId(lead.id);
    setShowCreateLeadModal(true);
  };

  const closeCreateLeadModal = () => {
    setShowCreateLeadModal(false);
    resetCreateLeadForm();
  };

  const handleAddPendingActivity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!noteDraft.trim()) {
      return;
    }
    
    setPendingActivities((prev) => [
      ...prev,
      {
        type: noteType,
        content: noteDraft.trim(),
      },
    ]);
    
    setNoteDraft('');
    setNoteType('note');
  };

  const handleSubmitCreateLead = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const company = createLeadForm.company.trim();
    const contact = createLeadForm.contact.trim();
    const email = createLeadForm.email.trim();
    const phone = createLeadForm.phone.trim();
    const address = createLeadForm.address.trim();
    const siret = createLeadForm.clientType === 'company' ? createLeadForm.siret.trim() : '';

    // Validation (identique au desktop)
    if (!contact.trim()) {
      setCreateLeadError("Renseignez le nom du contact.");
      return;
    }
    if (createLeadForm.clientType === 'company' && !company.trim()) {
      setCreateLeadError("Renseignez l'entreprise.");
      return;
    }
    if (emailDuplicate) {
      setCreateLeadError("Un lead utilise déjà cet email.");
      return;
    }
    if (phoneDuplicate) {
      setCreateLeadError("Un lead utilise déjà ce numéro.");
      return;
    }

    const name = company || contact || 'Prospect sans nom';

    const estimatedValue = Number.parseFloat(createLeadForm.estimatedValue);
    const estimatedValueNum = Number.isFinite(estimatedValue) ? estimatedValue : null;

    if (editingLeadId) {
      // Mode édition
      const updated = updateLead(editingLeadId, {
        company: name,
        contact: contact || undefined,
        email: email || undefined,
        phone: phone || undefined,
        source: createLeadForm.source,
        status: createLeadForm.status,
        supportType: createLeadForm.supportType,
        supportDetail: createLeadForm.supportDetail,
        address: address || undefined,
        clientType: createLeadForm.clientType,
        siret: siret || undefined,
        companyId: createLeadForm.companyId || activeCompanyId || undefined,
        estimatedValue: estimatedValueNum,
        owner: createLeadForm.owner || undefined,
        nextStepDate: createLeadForm.nextStepDate || null,
        nextStepNote: createLeadForm.nextStepNote || undefined,
      });

      if (updated) {
        // Ajouter les activités en attente
        pendingActivities.forEach((activity) => {
          recordLeadActivity(updated.id, activity);
        });
        setSuccessMessage(`Prospect « ${updated.company} » modifié avec succès.`);
        closeCreateLeadModal();
      } else {
        setCreateLeadError('Erreur lors de la modification du prospect.');
      }
    } else {
      // Mode création
      const createdLead = addLead({
        company: name,
        contact: contact || undefined,
        email: email || undefined,
        phone: phone || undefined,
        source: createLeadForm.source,
        status: createLeadForm.status,
        supportType: createLeadForm.supportType,
        supportDetail: createLeadForm.supportDetail,
        address: address || undefined,
        clientType: createLeadForm.clientType,
        siret: siret || undefined,
        companyId: createLeadForm.companyId || activeCompanyId || undefined,
        tags: [],
        activities: [],
        estimatedValue: estimatedValueNum || 0,
        owner: createLeadForm.owner || '',
        segment: 'général',
        nextStepDate: createLeadForm.nextStepDate || null,
        nextStepNote: createLeadForm.nextStepNote || undefined,
        createdAt: new Date().toISOString(),
        lastContact: null,
      });

      // Ajouter les activités en attente
      pendingActivities.forEach((activity) => {
        recordLeadActivity(createdLead.id, activity);
      });

      setSuccessMessage(`Prospect « ${createdLead.company} » créé avec succès.`);
      closeCreateLeadModal();
    }
  };

  return (
    <div className="modern-text" style={{ 
      padding: '0 var(--space-md)', 
      width: '100%',
      maxWidth: '700px',
      margin: '0 auto',
      background: 'var(--bg)',
    }}>
      {/* Header */}
      <div style={{ 
        paddingTop: '0', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 'var(--space-md)',
        width: '100%',
      }}>
        <div>
          <h1 className="text-title" style={{ margin: 0, color: 'var(--text)' }}>
            Prospects
          </h1>
          {tableData.length > 0 && (
            <span className="text-caption" style={{ color: 'var(--muted)' }}>
              {tableData.length} prospect(s)
            </span>
          )}
        </div>
        <button
          onClick={openCreateLeadModal}
          className="btn-modern"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            padding: 'var(--space-xs) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <Add style={{ fontSize: '18px' }} />
          Nouveau
        </button>
      </div>

      {/* Messages de feedback */}
      {backendLoading && (
        <div style={{
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
          background: 'rgba(var(--accent-rgb), 0.1)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text)',
          fontSize: '14px',
        }}>
          Synchronisation des prospects avec le serveur…
        </div>
      )}
      {backendError && (
        <div style={{
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 'var(--radius-md)',
          color: '#dc2626',
          fontSize: '14px',
        }}>
          {backendError}
        </div>
      )}
      {successMessage && (
        <div style={{
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: 'var(--radius-md)',
          color: '#10b981',
          fontSize: '14px',
        }}>
          {successMessage}
        </div>
      )}


      {/* Liste des prospects - Design compact optimisé */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        {paginatedLeads.length > 0 ? (
          <>
            {paginatedLeads.map((row) => {
              const isExpanded = expandedLeadId === row.id;
              
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  layout
                  className="card-modern card-interactive"
                  style={{
                    padding: isExpanded ? 'var(--space-md)' : 'var(--space-sm) var(--space-md)',
                    display: 'flex',
                    flexDirection: isExpanded ? 'column' : 'row',
                    alignItems: isExpanded ? 'stretch' : 'center',
                    gap: isExpanded ? 'var(--space-md)' : 'var(--space-sm)',
                    minHeight: isExpanded ? 'auto' : '64px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedLeadId(null);
                    } else {
                      setExpandedLeadId(row.id);
                    }
                  }}
                >
                  {/* Ligne principale - Toujours visible */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--space-sm)',
                    width: '100%',
                  }}>
                    {/* Avatar compact */}
                    <div 
                      className="avatar" 
                      style={{
                        width: isExpanded ? '56px' : '40px',
                        height: isExpanded ? '56px' : '40px',
                        minWidth: isExpanded ? '56px' : '40px',
                        fontSize: isExpanded ? '18px' : '13px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {row.avatarLabel}
                    </div>

                    {/* Informations principales - Layout compact */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        <h3 
                          className="text-body" 
                          style={{ 
                            margin: 0, 
                            color: 'var(--text)',
                            fontSize: isExpanded ? '18px' : '15px',
                            fontWeight: '600',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: isExpanded ? 'normal' : 'nowrap',
                          }}
                        >
                          {row.organization}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        {row.contactName && (
                          <span className="text-caption" style={{ 
                            fontSize: '12px',
                            color: 'var(--muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {row.contactName}
                          </span>
                        )}
                        {row.phone && (
                          <span className="text-caption" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            • {row.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions rapides compactes */}
                    <div 
                      style={{ 
                        display: 'flex', 
                        gap: '4px', 
                        flexShrink: 0,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const lead = leads.find(l => l.id === row.id);
                          if (lead) openEditLeadModal(lead);
                        }}
                        className="btn-icon"
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(var(--accent-rgb), 0.1)',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Edit style={{ fontSize: '16px', color: 'var(--accent)' }} />
                      </motion.button>
                      {row.phone && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleCall(row.phone); 
                          }}
                          className="btn-icon"
                          style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: 'var(--radius-sm)',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Phone style={{ fontSize: '16px', color: 'var(--accent)' }} />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Détails expandés - Animation */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-md)',
                        paddingTop: 'var(--space-md)',
                        borderTop: '1px solid rgba(var(--border-rgb), 0.1)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Badges et tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                        <span className="badge-modern" style={{
                          background: row.status === 'Gagné' 
                            ? 'rgba(16, 185, 129, 0.12)'
                            : row.status === 'Perdu'
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(59, 130, 246, 0.12)',
                          color: row.status === 'Gagné' 
                            ? '#10b981' 
                            : row.status === 'Perdu'
                            ? '#ef4444'
                            : '#3b82f6',
                        }}>
                          {row.status}
                        </span>
                        {row.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="badge-modern badge-neutral"
                          >
                            {tag}
                          </span>
                        ))}
                        {row.tags.length > 5 && (
                          <span className="badge-modern badge-neutral">
                            +{row.tags.length - 5}
                          </span>
                        )}
                      </div>

                      {/* Informations détaillées */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {(row.email || row.phone) && (
                          <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: 'none' }}>
                            <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                              <Email style={{ fontSize: '18px', color: 'var(--accent)' }} />
                            </div>
                            <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                              <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Contact</span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {row.email && (
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEmail(row.email);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 'var(--space-xs)',
                                      padding: 'var(--space-xs)',
                                      background: 'rgba(var(--accent-rgb), 0.05)',
                                      borderRadius: 'var(--radius-sm)',
                                      border: 'none',
                                      color: 'var(--text)',
                                      fontSize: '14px',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <Email style={{ fontSize: '16px', color: 'var(--accent)' }} />
                                    {row.email}
                                  </motion.button>
                                )}
                                {row.phone && (
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCall(row.phone);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 'var(--space-xs)',
                                      padding: 'var(--space-xs)',
                                      background: 'rgba(var(--accent-rgb), 0.05)',
                                      borderRadius: 'var(--radius-sm)',
                                      border: 'none',
                                      color: 'var(--text)',
                                      fontSize: '14px',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <Phone style={{ fontSize: '16px', color: 'var(--accent)' }} />
                                    {row.phone}
                                  </motion.button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {row.address && (
                          <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: 'none' }}>
                            <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                              <Business style={{ fontSize: '18px', color: 'var(--accent)' }} />
                            </div>
                            <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                              <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Adresse</span>
                              <span className="info-row-value" style={{ fontSize: '14px' }}>
                                {row.address}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-md) 0',
                marginTop: 'var(--space-sm)',
              }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: currentPage === 1 ? 'transparent' : 'var(--surface)',
                    color: currentPage === 1 ? 'var(--muted)' : 'var(--text)',
                    fontSize: '14px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  Précédent
                </motion.button>
                <span style={{
                  padding: 'var(--space-xs) var(--space-md)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '500',
                }}>
                  Page {currentPage} / {totalPages}
                </span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: currentPage === totalPages ? 'transparent' : 'var(--surface)',
                    color: currentPage === totalPages ? 'var(--muted)' : 'var(--text)',
                    fontSize: '14px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  Suivant
                </motion.button>
              </div>
            )}

            {/* Info de pagination */}
            {tableData.length > itemsPerPage && (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-sm) 0',
                color: 'var(--muted)',
                fontSize: '12px',
              }}>
                Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, tableData.length)} sur {tableData.length} prospect{tableData.length > 1 ? 's' : ''}
              </div>
            )}
          </>
        ) : (
          <div style={{
            padding: 'var(--space-3xl) var(--space-lg)',
            textAlign: 'center',
            color: 'var(--muted)',
          }}>
            <Person style={{ fontSize: '48px', opacity: 0.3, marginBottom: 'var(--space-md)' }} />
            <p className="text-body-lg" style={{
              margin: 0,
              opacity: 0.7,
            }}>
              Aucun prospect dans l'entreprise.
            </p>
          </div>
        )}
      </div>

      {/* Modale de création de prospect */}
      {showCreateLeadModal && (
        <div
          data-mobile-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 200,
          }}
          onClick={closeCreateLeadModal}
        >
          <div
            style={{
              background: 'var(--surface)',
              width: '100%',
              maxWidth: '100%',
              maxHeight: '90vh',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              paddingBottom: 'var(--space-md)',
              overflowY: 'auto',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmitCreateLead}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '18px', fontWeight: '600' }}>
                  {editingLeadId ? 'Modifier le prospect' : 'Nouveau prospect'}
                </h2>
                <button
                  type="button"
                  onClick={closeCreateLeadModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: 0,
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>

              {createLeadError && (
                <div style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  marginBottom: 'var(--space-sm)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  color: '#dc2626',
                  fontSize: '13px',
                }}>
                  {createLeadError}
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 'var(--space-md)',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}>
                {/* Section: Type de client */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '11px', 
                    fontWeight: '600', 
                    color: 'var(--muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px' 
                  }}>
                    Type de client
                  </label>
                  <div style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    background: 'var(--bg-secondary)', 
                    padding: '4px', 
                    borderRadius: 'var(--radius-md)' 
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateLeadForm((prev) => ({ ...prev, clientType: 'company' }));
                        setCreateLeadError(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: createLeadForm.clientType === 'company' ? 'var(--accent)' : 'transparent',
                        color: createLeadForm.clientType === 'company' ? 'white' : 'var(--text)',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Entreprise
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateLeadForm((prev) => ({ ...prev, clientType: 'individual', siret: '' }));
                        setCreateLeadError(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: createLeadForm.clientType === 'individual' ? 'var(--accent)' : 'transparent',
                        color: createLeadForm.clientType === 'individual' ? 'white' : 'var(--text)',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Particulier
                    </button>
                  </div>
                </div>

                {/* Section: Informations de contact */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: 'var(--space-sm)',
                  }}>
                    <div style={{
                      width: '24px',
                      height: '2px',
                      borderRadius: '2px',
                      background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
                    }} />
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text)' 
                    }}>
                      Informations de contact
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {createLeadForm.clientType === 'company' && (
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: 'var(--muted)' 
                      }}>
                        Entreprise <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={createLeadForm.company}
                        onChange={(e) => {
                          setCreateLeadForm((prev) => ({ ...prev, company: e.target.value }));
                          setCreateLeadError(null);
                        }}
                        placeholder="Nom de l'entreprise"
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '16px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: 'var(--muted)' 
                    }}>
                      Nom du contact <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={createLeadForm.contact}
                      onChange={(e) => {
                        setCreateLeadForm((prev) => ({ ...prev, contact: e.target.value }));
                        setCreateLeadError(null);
                      }}
                      placeholder="Nom complet"
                      autoFocus={createLeadForm.clientType === 'individual'}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {createLeadForm.clientType === 'company' && (
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: 'var(--muted)' 
                      }}>
                        SIRET
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={createLeadForm.siret}
                        onChange={(e) => {
                          setCreateLeadForm((prev) => ({ ...prev, siret: e.target.value }));
                          setCreateLeadError(null);
                        }}
                        placeholder="123 456 789 00000"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: 'var(--muted)' 
                    }}>
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={createLeadForm.phone}
                      onChange={(e) => {
                        setCreateLeadForm((prev) => ({ ...prev, phone: e.target.value }));
                        setCreateLeadError(null);
                      }}
                      placeholder="Téléphone"
                      inputMode="tel"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: phoneDuplicate ? '1px solid #ef4444' : '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    />
                    {phoneDuplicate && (
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '11px',
                        fontWeight: '500',
                        color: '#ef4444',
                      }}>
                        ⚠️ Numéro déjà utilisé
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: 'var(--muted)' 
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={createLeadForm.email}
                      onChange={(e) => {
                        setCreateLeadForm((prev) => ({ ...prev, email: e.target.value }));
                        setCreateLeadError(null);
                      }}
                      placeholder="Email"
                      inputMode="email"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: emailDuplicate ? '1px solid #ef4444' : '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    />
                    {emailDuplicate && (
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '11px',
                        fontWeight: '500',
                        color: '#ef4444',
                      }}>
                        ⚠️ Email déjà utilisé
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: 'var(--muted)' 
                    }}>
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={createLeadForm.address}
                      onChange={(e) => {
                        setCreateLeadForm((prev) => ({ ...prev, address: e.target.value }));
                        setCreateLeadError(null);
                      }}
                      placeholder="Adresse complète"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
                </div>

                {/* Section: Détails commerciaux */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: 'var(--space-sm)',
                  }}>
                    <div style={{
                      width: '24px',
                      height: '2px',
                      borderRadius: '2px',
                      background: 'linear-gradient(to right, #8b5cf6, #a78bfa)',
                    }} />
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text)' 
                    }}>
                      Détails commerciaux
                    </h3>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 'var(--space-sm)',
                    width: '100%',
                    maxWidth: '100%',
                  }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: 'var(--muted)' 
                      }}>
                        Statut
                      </label>
                      <select
                        value={createLeadForm.status}
                        onChange={(e) => {
                          setCreateLeadForm((prev) => ({ ...prev, status: e.target.value as LeadStatus }));
                          setCreateLeadError(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="Nouveau">Nouveau</option>
                        <option value="À contacter">À contacter</option>
                        <option value="En cours">En cours</option>
                        <option value="Devis envoyé">Devis envoyé</option>
                        <option value="Gagné">Gagné</option>
                        <option value="Perdu">Perdu</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: 'var(--muted)' 
                      }}>
                        Source
                      </label>
                      <input
                        type="text"
                        value={createLeadForm.source}
                        onChange={(e) => {
                          setCreateLeadForm((prev) => ({ ...prev, source: e.target.value }));
                          setCreateLeadError(null);
                        }}
                        placeholder="Source"
                        list="sources-list"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          boxSizing: 'border-box',
                        }}
                      />
                      <datalist id="sources-list">
                        {sources.map((source) => (
                          <option key={source} value={source} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: 'var(--muted)' 
                      }}>
                        Support
                      </label>
                      <select
                        value={createLeadForm.supportType}
                        onChange={(e) => {
                          setCreateLeadForm((prev) => ({ ...prev, supportType: e.target.value as SupportType }));
                          setCreateLeadError(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="Voiture">Voiture</option>
                        <option value="Canapé">Canapé</option>
                        <option value="Textile">Textile</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: 'var(--muted)' 
                      }}>
                        Détail support
                      </label>
                      <input
                        type="text"
                        value={createLeadForm.supportDetail}
                        onChange={(e) => {
                          setCreateLeadForm((prev) => ({ ...prev, supportDetail: e.target.value }));
                          setCreateLeadError(null);
                        }}
                        placeholder="Ex: Peugeot 308"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: 'var(--muted)' 
                      }}>
                        Valeur estimée
                      </label>
                      <div style={{ position: 'relative', marginBottom: 'var(--space-sm)' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={createLeadForm.estimatedValue}
                          onChange={(e) => {
                            setCreateLeadForm((prev) => ({ ...prev, estimatedValue: e.target.value }));
                            setCreateLeadError(null);
                          }}
                          placeholder="0.00"
                          style={{
                            width: '100%',
                            padding: '12px 32px 12px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '15px',
                            boxSizing: 'border-box',
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: 'var(--muted)',
                        }}>€</span>
                      </div>
                      <select
                        value={createLeadForm.estimatedValueType}
                        onChange={(e) => {
                          setCreateLeadForm((prev) => ({ ...prev, estimatedValueType: e.target.value as 'mensuel' | 'annuel' | 'prestation' }));
                          setCreateLeadError(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="prestation">À la prestation</option>
                        <option value="mensuel">Mensuel</option>
                        <option value="annuel">Annuel</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: 'var(--muted)' 
                      }}>
                        Société affiliée
                      </label>
                      <select
                        value={createLeadForm.companyId}
                        onChange={(e) => {
                          setCreateLeadForm((prev) => ({ ...prev, companyId: e.target.value }));
                          setCreateLeadError(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="">Aucune</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: 'var(--muted)' 
                      }}>
                        Collaborateur
                      </label>
                      <select
                        value={createLeadForm.owner}
                        onChange={(e) => {
                          setCreateLeadForm((prev) => ({ ...prev, owner: e.target.value }));
                          setCreateLeadError(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="">Aucun</option>
                        {authUsers.map((user) => (
                          <option key={user.id} value={user.fullName || user.username}>
                            {user.fullName || user.username}
                          </option>
                        ))}
                        {owners.filter(owner => !authUsers.some(u => (u.fullName || u.username) === owner)).map((owner) => (
                          <option key={owner} value={owner}>
                            {owner}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Prochaine étape */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: 'var(--space-sm)',
                  }}>
                    <div style={{
                      width: '24px',
                      height: '2px',
                      borderRadius: '2px',
                      background: 'linear-gradient(to right, #10b981, #34d399)',
                    }} />
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text)' 
                    }}>
                      Prochaine étape
                    </h3>
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: 'var(--muted)' 
                    }}>
                      Date de l'action
                    </label>
                    <input
                      type="date"
                      value={createLeadForm.nextStepDate}
                      onChange={(e) => {
                        setCreateLeadForm((prev) => ({ ...prev, nextStepDate: e.target.value }));
                        setCreateLeadError(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: 'var(--muted)' 
                    }}>
                      Action
                    </label>
                    <input
                      type="text"
                      value={createLeadForm.nextStepNote}
                      onChange={(e) => {
                        setCreateLeadForm((prev) => ({ ...prev, nextStepNote: e.target.value }));
                        setCreateLeadError(null);
                      }}
                      placeholder="Ex: Relance téléphonique"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Section: Journal des activités */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: 'var(--space-sm)',
                  }}>
                    <div style={{
                      width: '24px',
                      height: '2px',
                      borderRadius: '2px',
                      background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
                    }} />
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text)' 
                    }}>
                      Suivi de prospection
                    </h3>
                  </div>

                  {/* Liste des activités en attente */}
                  {pendingActivities.length === 0 ? (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--muted)',
                      margin: 'var(--space-sm) 0',
                    }}>
                      Aucune activité pour le moment. Ajoutez des notes ou des appels ci-dessous.
                    </p>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-sm)',
                      marginBottom: 'var(--space-md)',
                      position: 'relative',
                      paddingLeft: '20px',
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: '8px',
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        background: 'var(--border)',
                      }} />
                      {pendingActivities.map((activity, index) => (
                        <div key={index} style={{
                          position: 'relative',
                          padding: 'var(--space-sm)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          display: 'flex',
                          gap: 'var(--space-sm)',
                        }}>
                          <div style={{
                            position: 'absolute',
                            left: '-16px',
                            top: '12px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: '2px solid var(--surface)',
                            background: activity.type === 'call' 
                              ? 'linear-gradient(to bottom right, #3b82f6, #2563eb)' 
                              : 'linear-gradient(to bottom right, #64748b, #475569)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1,
                          }}>
                            {activity.type === 'call' ? (
                              <Call style={{ fontSize: '10px', color: 'white' }} />
                            ) : (
                              <Note style={{ fontSize: '10px', color: 'white' }} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '4px',
                            }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                color: 'var(--muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}>
                                {activity.type === 'call' ? 'Appel téléphonique' : 'Note interne'}
                              </span>
                            </div>
                            <p style={{
                              fontSize: '12px',
                              color: 'var(--text)',
                              margin: 0,
                              lineHeight: '1.4',
                            }}>
                              {activity.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulaire d'ajout d'activité */}
                  <div style={{
                    padding: 'var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: 'var(--space-sm)',
                      marginBottom: 'var(--space-sm)',
                      fontSize: '10px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      color: 'var(--muted)',
                    }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="radio"
                          name="activity-type"
                          value="note"
                          checked={noteType === 'note'}
                          onChange={() => setNoteType('note')}
                          style={{ cursor: 'pointer' }}
                        />
                        <Note style={{ fontSize: '14px' }} />
                        Note
                      </label>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="radio"
                          name="activity-type"
                          value="call"
                          checked={noteType === 'call'}
                          onChange={() => setNoteType('call')}
                          style={{ cursor: 'pointer' }}
                        />
                        <Call style={{ fontSize: '14px' }} />
                        Appel
                      </label>
                    </div>
                    <form onSubmit={handleAddPendingActivity}>
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder={noteType === 'call' ? "Compte-rendu d'appel..." : 'Note interne...'}
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg)',
                          color: 'var(--text)',
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          marginBottom: 'var(--space-sm)',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!noteDraft.trim()}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: noteDraft.trim() ? 'var(--accent)' : 'var(--muted)',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: noteDraft.trim() ? 'pointer' : 'not-allowed',
                          opacity: noteDraft.trim() ? 1 : 0.5,
                        }}
                      >
                        Ajouter
                      </button>
                    </form>
                  </div>
                </div>

                {/* Boutons cachés pour le form et la détection par la navbar */}
                <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
                  <button
                    type="button"
                    data-modal-action="cancel"
                    onClick={closeCreateLeadModal}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    data-modal-action="submit"
                  >
                    {editingLeadId ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileProspectsPage;
