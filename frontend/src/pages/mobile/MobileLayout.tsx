import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  CalendarTodayRounded as PrestationsIcon,
  DescriptionRounded as DevisIcon,
  ContactsRounded as ClientsIcon,
  TrendingUp as ProspectsIcon,
  HomeRounded as HomeIcon,
  Business,
  LightMode,
  DarkMode,
  Settings,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Search as SearchIcon,
  Close as CloseIcon,
  DescriptionOutlined as FacturesIcon,
} from '@mui/icons-material';
import { useAppData } from '../../store/useAppData';
import { formatCurrency, formatDate } from '../../lib/format';
import { motion, AnimatePresence } from 'framer-motion';
import '../mobile.css';
import '../../styles/apple-mobile.css';

interface Tab {
  icon: React.ComponentType<any>;
  path: string;
  label: string;
  color: string;
}

const tabs: Tab[] = [
  { icon: PrestationsIcon, path: '/mobile/prestations', label: 'Prestations', color: '#3b82f6' },
  { icon: DevisIcon, path: '/mobile/devis', label: 'Devis', color: '#10b981' },
  { icon: ProspectsIcon, path: '/mobile/prospects', label: 'Prospects', color: '#f59e0b' },
  { icon: ClientsIcon, path: '/mobile/clients', label: 'Clients', color: '#8b5cf6' },
];

const MobileLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userProfile = useAppData((state) => state.userProfile);
  const currentUser = useAppData((state) => state.getCurrentUser());
  const companies = useAppData((state) => state.companies) || [];
  const activeCompanyId = useAppData((state) => state.activeCompanyId);
  const theme = useAppData((state) => state.theme);
  const toggleTheme = useAppData((state) => state.toggleTheme);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { clients, leads, engagements, services, computeEngagementTotals } = useAppData();
  
  const serviceById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  
  // Logique de recherche
  type ResultItem = {
    id: string;
    title: string;
    subtitle: string;
    kind: 'client' | 'lead' | 'engagement';
    badge?: string;
  };
  
  const trimmedQuery = searchQuery.trim().toLowerCase();
  
  const searchResults = useMemo(() => {
    if (!trimmedQuery) {
      return [] as ResultItem[];
    }
    
    const matchText = (value: string | undefined | null) =>
      value ? value.toLowerCase().includes(trimmedQuery) : false;
    
    const results: ResultItem[] = [];
    
    // Clients
    clients
      .filter((client) => {
        const contactMatch = client.contacts.some((contact) => {
          if (!contact.active) return false;
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
      .slice(0, 4)
      .forEach((client) => {
        const billingContact = client.contacts.find((contact) => contact.active && contact.isBillingDefault);
        const fallbackContact = billingContact ?? client.contacts.find((contact) => contact.active);
        const subtitleParts = [
          client.city || undefined,
          fallbackContact ? `${fallbackContact.firstName} ${fallbackContact.lastName}`.trim() : undefined,
        ].filter(Boolean);
        results.push({
          id: client.id,
          kind: 'client',
          title: client.name,
          subtitle: subtitleParts.join(' • '),
        });
      });
    
    // Prospects
    leads
      .filter((lead) => matchText(lead.company) || matchText(lead.contact) || matchText(lead.email))
      .slice(0, 4)
      .forEach((lead) => {
        results.push({
          id: lead.id,
          kind: 'lead',
          title: lead.company || lead.contact,
          subtitle: [lead.contact || undefined, lead.email].filter(Boolean).join(' • '),
          badge: lead.status,
        });
      });
    
    // Devis
    engagements
      .filter((engagement) => {
        const client = clientById.get(engagement.clientId);
        const service = serviceById.get(engagement.serviceId);
        const optionMatch = service?.options.some((option) => matchText(option.label));
        return (
          matchText(client?.name) ||
          matchText(service?.name) ||
          optionMatch ||
          matchText(engagement.kind === 'devis' ? 'devis' : '')
        );
      })
      .slice(0, 4)
      .forEach((engagement) => {
        const client = clientById.get(engagement.clientId);
        const service = serviceById.get(engagement.serviceId);
        const totals = computeEngagementTotals(engagement);
        const kindLabel = engagement.kind === 'devis' ? 'Devis' : 'Service';
        results.push({
          id: engagement.id,
          kind: 'engagement',
          title: `${kindLabel} · ${client?.name ?? 'Client'}`,
          subtitle: [service?.name, formatCurrency(totals.price + totals.surcharge)].filter(Boolean).join(' • '),
          badge: engagement.status,
        });
      });
    
    return results;
  }, [clients, leads, engagements, clientById, serviceById, computeEngagementTotals, trimmedQuery]);
  
  const handleSearchClick = () => {
    setIsSearchExpanded(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };
  
  const handleSearchClose = () => {
    setIsSearchExpanded(false);
    setSearchQuery('');
  };
  
  const handleResultSelect = (item: ResultItem) => {
    setSearchQuery('');
    setIsSearchExpanded(false);
    if (item.kind === 'client') {
      navigate(`/mobile/clients?clientId=${item.id}`);
    } else if (item.kind === 'lead') {
      navigate(`/mobile/prospects?leadId=${item.id}`);
    } else if (item.kind === 'engagement') {
      navigate(`/mobile/devis?engagementId=${item.id}`);
    }
  };
  
  useEffect(() => {
    if (isSearchExpanded) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleSearchClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isSearchExpanded]);

  // Détecter les modales ouvertes et récupérer les actions
  const [modalActions, setModalActions] = useState<{
    onCancel: () => void;
    onSubmit: () => void;
    submitLabel: string;
    cancelLabel: string;
  } | null>(null);

  useEffect(() => {
    const checkForModals = () => {
      // Chercher les modales avec l'attribut data-mobile-modal
      const modal = document.querySelector('[data-mobile-modal="true"]');
      if (modal) {
        const cancelBtn = modal.querySelector('[data-modal-action="cancel"]') as HTMLButtonElement;
        const submitBtn = modal.querySelector('[data-modal-action="submit"]') as HTMLButtonElement;
        
        if (cancelBtn && submitBtn) {
          setModalActions({
            onCancel: () => cancelBtn.click(),
            onSubmit: () => submitBtn.click(),
            submitLabel: submitBtn.textContent || 'Créer',
            cancelLabel: cancelBtn.textContent || 'Annuler',
          });
        }
      } else {
        setModalActions(null);
      }
    };

    // Vérifier immédiatement
    checkForModals();

    // Observer les changements dans le DOM
    const observer = new MutationObserver(checkForModals);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-mobile-modal', 'data-modal-action'],
    });

    return () => observer.disconnect();
  }, []);

  // Trouver l'index de l'onglet actif (mémorisé)
  const activeIndex = useMemo(() => {
    return tabs.findIndex(tab => location.pathname.startsWith(tab.path));
  }, [location.pathname]);

  // Vérifier si on est sur le dashboard
  const isDashboard = location.pathname === '/mobile' || location.pathname === '/mobile/dashboard';

  const handleNavigate = useCallback((path: string) => {
    // Navigation immédiate sans délai
    navigate(path, { replace: false });
  }, [navigate]);

  // Trouver l'entreprise active
  const activeCompany = React.useMemo(() => {
    if (activeCompanyId) {
      return companies.find((c) => c.id === activeCompanyId);
    }
    return companies.find((c) => c.isDefault) || companies[0];
  }, [companies, activeCompanyId]);

  // Initiales pour l'avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="mobile-app modern-text" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <header
        className="header-top safe-top"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: 'var(--space-md) var(--space-lg)',
          paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top, 0px))',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        <div className="header-top-inner" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1, minWidth: 0 }}>
            {/* Avatar utilisateur */}
            {currentUser && (
              <button
                onClick={() => navigate('/mobile/profil')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'transform 0.15s',
                  willChange: 'transform',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={`${userProfile.firstName} ${userProfile.lastName}`}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      objectFit: 'cover',
                      border: '1.5px solid rgba(var(--accent-rgb), 0.15)',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div 
                    className="avatar" 
                    style={{
                      width: '32px',
                      height: '32px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    {userProfile.firstName || userProfile.lastName
                      ? getInitials(userProfile.firstName, userProfile.lastName)
                      : currentUser?.fullName?.charAt(0).toUpperCase() || 'A'}
                  </div>
                )}
              </button>
            )}
            
            {/* Nom utilisateur et société */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {currentUser && (
                <h1 
                  className="text-body" 
                  style={{ 
                    margin: 0, 
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontWeight: '600',
                    lineHeight: '1.3',
                  }}
                >
                  {userProfile.firstName && userProfile.lastName
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : userProfile.firstName || userProfile.lastName || currentUser.fullName || 'Utilisateur'}
                </h1>
              )}
              {activeCompany && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Business style={{ fontSize: '10px', color: 'var(--muted)' }} />
                  <p 
                    className="text-footnote" 
                    style={{ 
                      margin: 0, 
                      color: 'var(--muted)',
                      fontSize: '11px',
                    }}
                  >
                    {activeCompany.name}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Barre de recherche ou boutons actions */}
          <AnimatePresence mode="wait">
            {isSearchExpanded ? (
              <motion.div
                key="search-expanded"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100%' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  padding: '0 var(--space-md)',
                  background: 'var(--bg)',
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(var(--border-rgb), 0.1)',
                    padding: '6px 12px',
                  }}
                >
                  <SearchIcon sx={{ fontSize: 16, color: 'var(--muted)', flexShrink: 0 }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '14px',
                      color: 'var(--text)',
                    }}
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--muted)',
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </button>
                  )}
                  
                  {/* Dropdown des résultats */}
                  {trimmedQuery && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(var(--border-rgb), 0.1)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        zIndex: 1000,
                      }}
                    >
                      <div style={{ padding: 'var(--space-xs)' }}>
                        {searchResults.map((item) => (
                          <button
                            key={`${item.kind}-${item.id}`}
                            type="button"
                            onClick={() => handleResultSelect(item)}
                            style={{
                              width: '100%',
                              border: 'none',
                              background: 'transparent',
                              borderRadius: 'var(--radius-md)',
                              padding: 'var(--space-sm) var(--space-md)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              transition: 'background-color 0.15s',
                            }}
                            onMouseDown={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(var(--accent-rgb), 0.1)';
                            }}
                            onMouseUp={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
                              <span
                                style={{
                                  fontSize: '14px',
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
                                    padding: '2px 6px',
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
                                  fontSize: '12px',
                                  color: 'var(--muted)',
                                }}
                              >
                                {item.subtitle}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
                <button
                  onClick={handleSearchClose}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 'var(--radius-md)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    color: 'var(--text)',
                  }}
                  aria-label="Fermer la recherche"
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="search-collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
              >
                {/* Actions principales : Recherche et Factures */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingRight: 'var(--space-xs)', borderRight: '1px solid rgba(var(--border-rgb), 0.15)' }}>
                  {/* Bouton recherche */}
                  <button
                    onClick={handleSearchClick}
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
                      flexShrink: 0,
                      transition: 'transform 0.15s, background-color 0.15s',
                      willChange: 'transform',
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.95)';
                      e.currentTarget.style.backgroundColor = 'rgba(var(--accent-rgb), 0.08)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    aria-label="Rechercher"
                  >
                    <SearchIcon sx={{ fontSize: 18, color: 'var(--text)' }} />
                  </button>

                  {/* Bouton factures */}
                  <button
                    onClick={() => navigate('/mobile/factures')}
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
                      flexShrink: 0,
                      transition: 'transform 0.15s, background-color 0.15s',
                      willChange: 'transform',
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.95)';
                      e.currentTarget.style.backgroundColor = 'rgba(var(--accent-rgb), 0.08)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    aria-label="Factures"
                  >
                    <FacturesIcon sx={{ fontSize: 18, color: 'var(--text)' }} />
                  </button>
                </div>

                {/* Paramètres système : Paramètres et Thème */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Bouton paramètres */}
                  <button
                    onClick={() => navigate('/mobile/profil')}
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
                      flexShrink: 0,
                      transition: 'transform 0.15s, background-color 0.15s',
                      willChange: 'transform',
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.95)';
                      e.currentTarget.style.backgroundColor = 'rgba(var(--accent-rgb), 0.08)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    aria-label="Paramètres"
                  >
                    <Settings sx={{ fontSize: 18, color: 'var(--text)' }} />
                  </button>
                
                  {/* Bouton de basculement thème */}
                  <button
                    onClick={toggleTheme}
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
                      flexShrink: 0,
                      transition: 'transform 0.15s, background-color 0.15s',
                      willChange: 'transform',
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.95)';
                      e.currentTarget.style.backgroundColor = 'rgba(var(--accent-rgb), 0.08)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
                  >
                    {theme === 'dark' ? (
                      <LightMode sx={{ fontSize: 18, color: 'var(--text)' }} />
                    ) : (
                      <DarkMode sx={{ fontSize: 18, color: 'var(--text)' }} />
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main 
        className="mobile-app__main modern-text" 
        style={{ 
          paddingBottom: modalActions
            ? 'calc(120px + env(safe-area-inset-bottom, 0px))'
            : 'calc(72px + env(safe-area-inset-bottom, 0px))',
          paddingTop: 'var(--space-md)',
          background: 'var(--bg)',
          minHeight: 'calc(100vh - 60px)',
          position: 'relative',
          transition: 'padding-bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Outlet />
      </main>

      {/* Navbar fine et ovale flottante */}
      <nav
        style={{
          position: 'fixed',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(var(--surface-rgb), 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '0.5px solid rgba(var(--border-rgb), 0.1)',
          borderRadius: 'var(--radius-2xl)',
          padding: modalActions ? '10px 8px 6px 8px' : '6px 8px',
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: modalActions ? 'column' : 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: modalActions ? '6px' : '4px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
          width: 'auto',
          minWidth: 'fit-content',
          maxWidth: 'calc(100% - 24px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Boutons de modale intégrés dans la navbar - Section supérieure */}
        {modalActions && (
          <div style={{
            display: 'flex',
            gap: '6px',
            width: '100%',
            paddingBottom: '4px',
            borderBottom: '0.5px solid rgba(var(--border-rgb), 0.1)',
            marginBottom: '2px',
          }}>
            <button
              onClick={modalActions.onCancel}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-lg)',
                border: '0.5px solid rgba(var(--border-rgb), 0.1)',
                background: 'rgba(var(--surface-rgb), 0.8)',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '1';
              }}
            >
              {modalActions.cancelLabel}
            </button>
            <button
              onClick={modalActions.onSubmit}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: 'var(--accent)',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(var(--accent-rgb), 0.3)',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '1';
              }}
            >
              {modalActions.submitLabel}
            </button>
          </div>
        )}
        
        {/* Section des onglets */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '4px',
        }}>

        {/* Première moitié des onglets */}
        {tabs.slice(0, 2).map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeIndex === index;
          
          return (
            <button
              key={tab.path}
              onClick={() => handleNavigate(tab.path)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                minWidth: '48px',
                transition: 'all 0.2s ease-out',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {/* Fond animé pour l'état actif */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `${tab.color}12`,
                    borderRadius: 'var(--radius-lg)',
                    transition: 'all 0.2s ease-out',
                  }}
                />
              )}
              
              {/* Icône */}
              <Icon
                style={{
                  fontSize: isActive ? '20px' : '18px',
                  width: isActive ? '20px' : '18px',
                  height: isActive ? '20px' : '18px',
                  color: isActive ? tab.color : 'var(--muted)',
                  transition: 'all 0.2s ease-out',
                }}
              />
              
              {/* Label */}
              <span
                style={{
                  position: 'relative',
                  fontSize: '9px',
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? tab.color : 'var(--muted)',
                  transition: 'all 0.2s ease-out',
                  lineHeight: '1',
                  opacity: isActive ? 1 : 0.65,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Bouton central rond - Dashboard */}
        <button
          onClick={() => handleNavigate('/mobile/dashboard')}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: isDashboard 
              ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent)dd 100%)'
              : 'var(--surface)',
            cursor: 'pointer',
            boxShadow: isDashboard
              ? '0 4px 16px rgba(var(--accent-rgb), 0.35), 0 2px 8px rgba(var(--accent-rgb), 0.25)'
              : '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.25s ease-out',
            WebkitTapHighlightColor: 'transparent',
            transform: isDashboard ? 'scale(1.05)' : 'scale(1)',
            margin: '0 4px',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = isDashboard ? 'scale(1.02)' : 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = isDashboard ? 'scale(1.05)' : 'scale(1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = isDashboard ? 'scale(1.05)' : 'scale(1)';
          }}
        >
          <HomeIcon
            style={{
              fontSize: '22px',
              width: '22px',
              height: '22px',
              color: isDashboard ? 'white' : 'var(--accent)',
              transition: 'all 0.25s ease-out',
            }}
          />
        </button>

        {/* Deuxième moitié des onglets */}
        {tabs.slice(2, 4).map((tab, index) => {
          const Icon = tab.icon;
          const actualIndex = index + 2;
          const isActive = activeIndex === actualIndex;
          
          return (
            <button
              key={tab.path}
              onClick={() => handleNavigate(tab.path)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                minWidth: '48px',
                transition: 'all 0.2s ease-out',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {/* Fond animé pour l'état actif */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `${tab.color}12`,
                    borderRadius: 'var(--radius-lg)',
                    transition: 'all 0.2s ease-out',
                  }}
                />
              )}
              
              {/* Icône */}
              <Icon
                style={{
                  fontSize: isActive ? '20px' : '18px',
                  width: isActive ? '20px' : '18px',
                  height: isActive ? '20px' : '18px',
                  color: isActive ? tab.color : 'var(--muted)',
                  transition: 'all 0.2s ease-out',
                }}
              />
              
              {/* Label */}
              <span
                style={{
                  position: 'relative',
                  fontSize: '9px',
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? tab.color : 'var(--muted)',
                  transition: 'all 0.2s ease-out',
                  lineHeight: '1',
                  opacity: isActive ? 1 : 0.65,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;

