import React, { useState, useMemo, useEffect, useRef, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Phone, Email, Business, Person, Add, Edit } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppData } from '../../store/useAppData';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Client, ClientContact } from '../../store/useAppData';
import { ClientService } from '../../api';
import '../mobile.css';
import '../../styles/apple-mobile.css';

type TableRowStatus = 'Actif' | 'Inactif';

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

const buildRow = (client: Client, revenue: number) => {
  const activeContacts = client.contacts.filter((contact) => contact.active);
  const primaryContact =
    activeContacts.find((contact) => contact.isBillingDefault) ?? activeContacts[0] ?? null;
  const hasActiveContacts = activeContacts.length > 0;
  // Un client est actif s'il a des contacts actifs et que son statut est 'Actif'
  const status: TableRowStatus = hasActiveContacts && client.status === 'Actif' ? 'Actif' : 'Inactif';

  const email = primaryContact?.email || client.email || '';
  const phone = primaryContact?.mobile || client.phone || '';
  const organization = client.name;
  const contactName = primaryContact
    ? `${primaryContact.firstName} ${primaryContact.lastName}`.trim()
    : '';

  return {
    id: client.id,
    client,
    contact: primaryContact,
    status,
    organization,
    contactName,
    email,
    phone,
    city: client.city ?? '',
    lastService: client.lastService || null,
    revenue,
    segment: client.type === 'company' ? 'Entreprise' : 'Particulier',
    tags: client.tags,
    avatarLabel: primaryContact
      ? getInitials(`${primaryContact.firstName} ${primaryContact.lastName}`)
      : getInitials(client.name),
  };
};

type CreateClientFormState = {
  type: Client['type'];
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  siret: string;
  tags: string;
  status: Client['status'];
};

const CREATE_CLIENT_DEFAULTS: CreateClientFormState = {
  type: 'company',
  companyName: '',
  contactFirstName: '',
  contactLastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  siret: '',
  tags: '',
  status: 'Actif',
};

const MobileClientsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const clients = useAppData((state) => state.clients) || [];
  const getClientRevenue = useAppData((state) => state.getClientRevenue);
  const addClient = useAppData((state) => state.addClient);
  const updateClient = useAppData((state) => state.updateClient);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [createClientForm, setCreateClientForm] = useState<CreateClientFormState>(() => ({
    ...CREATE_CLIENT_DEFAULTS,
  }));
  const [createClientError, setCreateClientError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const tableData = useMemo(() => {
    return clients
      .map((client) => buildRow(client, getClientRevenue(client.id) ?? 0))
      .sort((a, b) => a.organization.localeCompare(b.organization, 'fr', { sensitivity: 'base' }));
  }, [clients, getClientRevenue]);

  // Pagination
  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return tableData.slice(startIndex, endIndex);
  }, [tableData, currentPage, itemsPerPage]);

  // Charger les clients depuis le backend (une seule fois par session)
  useEffect(() => {
    // Protection globale pour éviter les chargements multiples
    if (hasLoadedRef.current || (window as any).__mobileClientsLoaded) {
      hasLoadedRef.current = true;
      return;
    }

    // Si on a déjà des clients, ne pas recharger
    if (clients.length > 0) {
      hasLoadedRef.current = true;
      (window as any).__mobileClientsLoaded = true;
      (window as any).__loadingClients = false;
      return;
    }

    const loadFromBackend = async () => {
      // Marquer comme en cours de chargement pour éviter les appels multiples
      if (hasLoadedRef.current || (window as any).__mobileClientsLoaded) {
        return;
      }
      hasLoadedRef.current = true;
      (window as any).__loadingClients = true;
      (window as any).__mobileClientsLoaded = false; // Pas encore chargé

      try {
        setBackendLoading(true);
        setBackendError(null);
        
        const result = await ClientService.getClients();
        if (result.success && Array.isArray(result.data)) {
          const mapped: Client[] = result.data.map((c: any) => ({
            id: c.id,
            type: c.type ?? 'company',
            name: c.name ?? '',
            companyName: c.type === 'company' ? (c.companyName ?? c.name ?? '') : null,
            firstName: c.type === 'individual' ? (c.firstName ?? null) : null,
            lastName: c.type === 'individual' ? (c.lastName ?? null) : null,
            siret: c.siret ?? '',
            email: c.email ?? '',
            phone: c.phone ?? '',
            address: c.address ?? '',
            city: c.city ?? '',
            status: c.status ?? 'Actif',
            tags: Array.isArray(c.tags) ? c.tags : [],
            lastService: c.lastService ?? null,
            contacts: Array.isArray(c.contacts) ? c.contacts : [],
          }));
          
          // Mettre à jour le store de manière sûre
          useAppData.setState({ clients: mapped });
          (window as any).__mobileClientsLoaded = true;
        } else if (!result.success) {
          setBackendError(result.error || 'Erreur lors du chargement des clients.');
          hasLoadedRef.current = false; // Permettre de réessayer en cas d'erreur
          (window as any).__mobileClientsLoaded = false;
        }
      } catch (error: any) {
        setBackendError(error?.message || 'Erreur lors du chargement des clients.');
        hasLoadedRef.current = false; // Permettre de réessayer en cas d'erreur
        (window as any).__mobileClientsLoaded = false;
      } finally {
        setBackendLoading(false);
        (window as any).__loadingClients = false;
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

  // Gérer le paramètre clientId de l'URL pour ouvrir automatiquement la fiche du client
  useEffect(() => {
    const clientIdFromUrl = searchParams.get('clientId');
    if (clientIdFromUrl && clients.length > 0) {
      const client = clients.find((c) => c.id === clientIdFromUrl);
      if (client) {
        // Trouver sur quelle page se trouve ce client
        const clientIndex = tableData.findIndex((row) => row.id === clientIdFromUrl);
        if (clientIndex >= 0) {
          const targetPage = Math.floor(clientIndex / itemsPerPage) + 1;
          if (targetPage !== currentPage) {
            setCurrentPage(targetPage);
          }
          // Attendre que la page soit mise à jour avant d'expandre
          setTimeout(() => {
            setExpandedClientId(clientIdFromUrl);
            // Nettoyer l'URL pour éviter de réouvrir à chaque fois
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('clientId');
            setSearchParams(newParams, { replace: true });
          }, 100);
        } else {
          // Client trouvé mais pas dans tableData (filtre ?), l'expander quand même
          setExpandedClientId(clientIdFromUrl);
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('clientId');
          setSearchParams(newParams, { replace: true });
        }
      }
    }
  }, [searchParams, clients, tableData, itemsPerPage, currentPage, setSearchParams]);

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

  const resetCreateClientForm = () => {
    setCreateClientForm({ ...CREATE_CLIENT_DEFAULTS });
    setCreateClientError(null);
    setEditingClientId(null);
  };

  const openCreateClientModal = () => {
    resetCreateClientForm();
    setShowCreateClientModal(true);
  };

  const openEditClientModal = (client: Client) => {
    const primaryContact = client.contacts.find((c) => c.active && c.isBillingDefault) || 
                          client.contacts.find((c) => c.active) || 
                          null;
    
    setCreateClientForm({
      type: client.type,
      companyName: client.companyName || (client.type === 'company' ? client.name : '') || '',
      contactFirstName: primaryContact?.firstName || client.firstName || '',
      contactLastName: primaryContact?.lastName || client.lastName || '',
      email: primaryContact?.email || client.email || '',
      phone: primaryContact?.mobile || client.phone || '',
      address: client.address || '',
      city: client.city || '',
      siret: client.siret || '',
      tags: client.tags.join(', '),
      status: client.status,
    });
    setEditingClientId(client.id);
    setShowCreateClientModal(true);
  };

  const closeCreateClientModal = () => {
    setShowCreateClientModal(false);
    resetCreateClientForm();
  };

  const handleSubmitCreateClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const companyName = createClientForm.companyName.trim();
    const firstName = createClientForm.contactFirstName.trim();
    const lastName = createClientForm.contactLastName.trim();
    const email = createClientForm.email.trim();
    const phone = createClientForm.phone.trim();
    const address = createClientForm.address.trim();
    const city = createClientForm.city.trim();
    const siret = createClientForm.type === 'company' ? createClientForm.siret.trim() : '';
    const tags = createClientForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    // Validation minimale : au moins un nom
    const hasName = companyName || firstName || lastName || createClientForm.companyName.trim();
    if (!hasName) {
      setCreateClientError('Renseignez au moins un nom pour le client.');
      return;
    }

    const displayName =
      createClientForm.type === 'company'
        ? companyName || [firstName, lastName].filter(Boolean).join(' ') || 'Client sans nom'
        : [firstName, lastName].filter(Boolean).join(' ') || companyName || 'Client sans nom';

    const hasContactDetails = Boolean(firstName || lastName || email || phone);

    if (editingClientId) {
      // Mode édition
      const updated = updateClient(editingClientId, {
        type: createClientForm.type,
        name: displayName,
        companyName: createClientForm.type === 'company' ? companyName : null,
        firstName: firstName || null,
        lastName: lastName || null,
        siret,
        email,
        phone,
        address,
        city,
        status: createClientForm.status,
        tags,
      });

      if (updated) {
        setSuccessMessage(`Client « ${updated.name} » modifié avec succès.`);
        closeCreateClientModal();
      } else {
        setCreateClientError('Erreur lors de la modification du client.');
      }
    } else {
      // Mode création
      const createdClient = addClient({
        type: createClientForm.type,
        name: displayName,
        companyName: createClientForm.type === 'company' ? companyName : null,
        firstName: firstName || null,
        lastName: lastName || null,
        siret,
        email,
        phone,
        address,
        city,
        status: createClientForm.status,
        tags,
        contacts: hasContactDetails
          ? [
              {
                id: `ct-temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                firstName: firstName || '',
                lastName: lastName || '',
                email,
                mobile: phone,
                roles: ['facturation'],
                isBillingDefault: true,
                active: true,
              },
            ]
          : [],
      });

      setSuccessMessage(`Client « ${createdClient.name} » créé avec succès.`);
      closeCreateClientModal();
    }
  };

  return (
    <div className="modern-text" style={{ 
      padding: '0 var(--space-xl)', 
      width: '100%', 
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
            Clients
          </h1>
          {tableData.length > 0 && (
            <span className="text-caption" style={{ color: 'var(--muted)' }}>
              {tableData.length} client(s)
            </span>
          )}
        </div>
        <button
          onClick={openCreateClientModal}
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
          Synchronisation des clients avec le serveur…
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


      {/* Liste des clients - Design compact optimisé */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        {paginatedClients.length > 0 ? (
          <>
            {paginatedClients.map((row) => {
              const isExpanded = expandedClientId === row.id;
              
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
                      setExpandedClientId(null);
                    } else {
                      setExpandedClientId(row.id);
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
                        {!isExpanded && row.revenue > 0 && (
                          <span className="text-caption" style={{ 
                            fontSize: '12px', 
                            color: 'var(--accent)',
                            fontWeight: '600',
                            marginLeft: 'auto',
                          }}>
                            {formatCurrency(row.revenue)}
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
                          const client = clients.find(c => c.id === row.id);
                          if (client) openEditClientModal(client);
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
                          background: row.segment === 'Entreprise' 
                            ? 'rgba(147, 51, 234, 0.12)'
                            : 'rgba(59, 130, 246, 0.12)',
                          color: row.segment === 'Entreprise' 
                            ? '#9333ea' 
                            : '#3b82f6',
                        }}>
                          {row.segment === 'Entreprise' ? 'Professionnel' : 'Particulier'}
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
                        <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid rgba(var(--border-rgb), 0.04)' }}>
                          <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                            <Business style={{ fontSize: '18px', color: 'var(--accent)' }} />
                          </div>
                          <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                            <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Chiffre d'affaires</span>
                            <span className="info-row-value" style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent)' }}>
                              {formatCurrency(row.revenue)}
                            </span>
                          </div>
                        </div>
                        {row.lastService && (
                          <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid rgba(var(--border-rgb), 0.04)' }}>
                            <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                              <Person style={{ fontSize: '18px', color: 'var(--accent)' }} />
                            </div>
                            <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                              <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Dernière prestation</span>
                              <span className="info-row-value" style={{ fontSize: '14px' }}>
                                {formatDate(row.lastService)}
                              </span>
                            </div>
                          </div>
                        )}
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
                        {row.city && (
                          <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: 'none' }}>
                            <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                              <Business style={{ fontSize: '18px', color: 'var(--accent)' }} />
                            </div>
                            <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                              <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Ville</span>
                              <span className="info-row-value" style={{ fontSize: '14px' }}>
                                {row.city}
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
                Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, tableData.length)} sur {tableData.length} client{tableData.length > 1 ? 's' : ''}
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
              Aucun client dans l'entreprise.
            </p>
          </div>
        )}
      </div>

      {/* Modale de création de client */}
      {showCreateClientModal && (
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
          onClick={closeCreateClientModal}
        >
          <div
            style={{
              background: 'var(--surface)',
              width: '100%',
              maxHeight: '90vh',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              paddingBottom: 'var(--space-lg)',
              overflowY: 'auto',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmitCreateClient}>
              {/* Header compact */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '18px', fontWeight: '600' }}>
                  {editingClientId ? 'Modifier le client' : 'Nouveau client'}
                </h2>
                <button
                  type="button"
                  onClick={closeCreateClientModal}
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

              {createClientError && (
                <div style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  marginBottom: 'var(--space-sm)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  color: '#dc2626',
                  fontSize: '13px',
                }}>
                  {createClientError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* Type de client */}
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
                        setCreateClientForm((prev) => ({ ...prev, type: 'company' }));
                        setCreateClientError(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: createClientForm.type === 'company' ? '#9333ea' : 'transparent',
                        color: createClientForm.type === 'company' ? 'white' : 'var(--text)',
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
                        setCreateClientForm((prev) => ({ ...prev, type: 'individual', siret: '' }));
                        setCreateClientError(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: createClientForm.type === 'individual' ? '#3b82f6' : 'transparent',
                        color: createClientForm.type === 'individual' ? 'white' : 'var(--text)',
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

                {/* Section: Informations entreprise */}
                {createClientForm.type === 'company' && (
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
                        background: 'linear-gradient(to right, #9333ea, #a78bfa)',
                      }} />
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        color: 'var(--text)' 
                      }}>
                        Informations entreprise
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>

                      <div>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '6px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: 'var(--muted)' 
                        }}>
                          Raison sociale <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={createClientForm.companyName}
                          onChange={(e) => {
                            setCreateClientForm((prev) => ({ ...prev, companyName: e.target.value }));
                            setCreateClientError(null);
                          }}
                          placeholder="Ex : WashGo Services"
                          autoFocus
                          required
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '15px',
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
                          Numéro SIRET
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={createClientForm.siret}
                          onChange={(e) => {
                            setCreateClientForm((prev) => ({ ...prev, siret: e.target.value }));
                            setCreateClientError(null);
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
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '6px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: 'var(--muted)' 
                        }}>
                          Prénom {createClientForm.type === 'individual' && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>
                        <input
                          type="text"
                          value={createClientForm.contactFirstName}
                          onChange={(e) => {
                            setCreateClientForm((prev) => ({ ...prev, contactFirstName: e.target.value }));
                            setCreateClientError(null);
                          }}
                          placeholder="Ex : Jeanne"
                          autoFocus={createClientForm.type === 'individual'}
                          required={createClientForm.type === 'individual' && !createClientForm.contactLastName}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '15px',
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
                          Nom {createClientForm.type === 'individual' && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>
                        <input
                          type="text"
                          value={createClientForm.contactLastName}
                          onChange={(e) => {
                            setCreateClientForm((prev) => ({ ...prev, contactLastName: e.target.value }));
                            setCreateClientError(null);
                          }}
                          placeholder="Ex : Martin"
                          required={createClientForm.type === 'individual' && !createClientForm.contactFirstName}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '15px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Coordonnées */}
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
                      Coordonnées
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '6px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: 'var(--muted)' 
                        }}>
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={createClientForm.email}
                          onChange={(e) => {
                            setCreateClientForm((prev) => ({ ...prev, email: e.target.value }));
                            setCreateClientError(null);
                          }}
                          placeholder="contact@entreprise.fr"
                          inputMode="email"
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '15px',
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
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={createClientForm.phone}
                          onChange={(e) => {
                            setCreateClientForm((prev) => ({ ...prev, phone: e.target.value }));
                            setCreateClientError(null);
                          }}
                          placeholder="06 12 34 56 78"
                          inputMode="tel"
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '15px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
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
                          value={createClientForm.address}
                          onChange={(e) => {
                            setCreateClientForm((prev) => ({ ...prev, address: e.target.value }));
                            setCreateClientError(null);
                          }}
                          placeholder="12 rue des Lavandières"
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '15px',
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
                          Ville
                        </label>
                        <input
                          type="text"
                          value={createClientForm.city}
                          onChange={(e) => {
                            setCreateClientForm((prev) => ({ ...prev, city: e.target.value }));
                            setCreateClientError(null);
                          }}
                          placeholder="Paris"
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '15px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Informations complémentaires */}
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
                      background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
                    }} />
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: 'var(--text)' 
                    }}>
                      Informations complémentaires
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
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
                        value={createClientForm.status}
                        onChange={(e) => {
                          setCreateClientForm((prev) => ({ ...prev, status: e.target.value as Client['status'] }));
                          setCreateClientError(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="Actif">Actif</option>
                        <option value="Non actif">Non actif</option>
                        <option value="À appeler">À appeler</option>
                        <option value="À contacter">À contacter</option>
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
                        Tags
                      </label>
                      <input
                        type="text"
                        value={createClientForm.tags}
                        onChange={(e) => {
                          setCreateClientForm((prev) => ({ ...prev, tags: e.target.value }));
                          setCreateClientError(null);
                        }}
                        placeholder="premium, lavage auto, fidélité"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                        }}
                      />
                      <p style={{ 
                        margin: '4px 0 0 0', 
                        fontSize: '11px', 
                        color: 'var(--muted)' 
                      }}>
                        Séparez les tags par des virgules.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Boutons */}
                {/* Boutons cachés pour le form et la détection par la navbar */}
                <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
                  <button
                    type="button"
                    data-modal-action="cancel"
                    onClick={closeCreateClientModal}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    data-modal-action="submit"
                  >
                    {editingClientId ? 'Modifier' : 'Créer'}
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

export default MobileClientsPage;
