import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note, Call } from '@mui/icons-material';
import { useAppData } from '../../store/useAppData';
import { normalisePhone } from '../../lib/phone';
import type { LeadStatus, SupportType, LeadActivityType } from '../../store/useAppData';
import '../mobile.css';
import '../../styles/apple-mobile.css';

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

const MobileCreateProspectPage: React.FC = () => {
  const navigate = useNavigate();
  const leads = useAppData((state) => state.leads) || [];
  const companies = useAppData((state) => state.companies) || [];
  const authUsers = useAppData((state) => state.authUsers) || [];
  const activeCompanyId = useAppData((state) => state.activeCompanyId);
  const addLead = useAppData((state) => state.addLead);
  const recordLeadActivity = useAppData((state) => state.recordLeadActivity);

  const [createLeadForm, setCreateLeadForm] = useState<CreateLeadFormState>(() => ({
    ...CREATE_LEAD_DEFAULTS,
    companyId: activeCompanyId || companies[0]?.id || '',
    owner: authUsers[0]?.fullName || authUsers[0]?.username || '',
  }));
  const [createLeadError, setCreateLeadError] = useState<string | null>(null);
  const [pendingActivities, setPendingActivities] = useState<Array<{ type: LeadActivityType; content: string }>>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteType, setNoteType] = useState<LeadActivityType>('note');

  const owners = useMemo(() => {
    const uniqueOwners = Array.from(new Set(leads.map((lead) => lead.owner))).sort((a, b) => a.localeCompare(b));
    return uniqueOwners.length > 0 ? uniqueOwners : ['Adrien'];
  }, [leads]);

  const sources = useMemo(() => {
    return Array.from(new Set(leads.map((lead) => lead.source))).sort((a, b) => a.localeCompare(b));
  }, [leads]);

  // Vérification des doublons email/téléphone
  const emailDuplicate = useMemo(() => {
    const value = createLeadForm.email.trim().toLowerCase();
    if (!value) return false;
    return leads.some((lead) => lead.email.toLowerCase() === value);
  }, [createLeadForm.email, leads]);

  const phoneDuplicate = useMemo(() => {
    const value = normalisePhone(createLeadForm.phone);
    if (!value) return false;
    return leads.some((lead) => normalisePhone(lead.phone) === value);
  }, [createLeadForm.phone, leads]);

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

    // Validation
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

    navigate('/mobile/prospects', { replace: true });
  };

  return (
    <>
      {/* Élément invisible pour la détection par la navbar */}
      <div data-mobile-modal="true" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
        <button
          type="button"
          data-modal-action="cancel"
          onClick={() => navigate('/mobile/prospects')}
        >
          Annuler
        </button>
        <button
          type="button"
          data-modal-action="submit"
          onClick={(e) => {
            e.preventDefault();
            const form = document.querySelector('form');
            if (form) {
              form.requestSubmit();
            }
          }}
        >
          Créer
        </button>
      </div>

      <form onSubmit={handleSubmitCreateLead} style={{
        width: '100%',
        maxWidth: '100%',
        padding: 'var(--space-md)',
        background: 'var(--bg)',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}>
        {createLeadError && (
          <div style={{
            padding: 'var(--space-sm) var(--space-md)',
            marginBottom: 'var(--space-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 'var(--radius-md)',
            color: '#dc2626',
            fontSize: '12px',
          }}>
            {createLeadError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Type de client */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '9px', 
              fontWeight: '600', 
              color: 'var(--muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Type de client
            </label>
            <div style={{ 
              display: 'flex', 
              gap: '4px', 
              background: 'var(--bg-secondary)', 
              padding: '3px', 
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
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: createLeadForm.clientType === 'company' ? 'var(--accent)' : 'transparent',
                  color: createLeadForm.clientType === 'company' ? 'white' : 'var(--text)',
                  fontSize: '13px',
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
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: createLeadForm.clientType === 'individual' ? 'var(--accent)' : 'transparent',
                  color: createLeadForm.clientType === 'individual' ? 'white' : 'var(--text)',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Particulier
              </button>
            </div>
          </div>

          {/* Informations de contact */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: 'var(--space-sm)',
            }}>
              <div style={{
                width: '20px',
                height: '2px',
                borderRadius: '2px',
                background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
              }} />
              <h3 style={{ 
                margin: 0, 
                fontSize: '11px', 
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
                    marginBottom: '4px', 
                    fontSize: '9px', 
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
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                />
              </div>

              {createLeadForm.clientType === 'company' && (
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '9px', 
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
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: phoneDuplicate ? '1px solid #ef4444' : '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                />
                {phoneDuplicate && (
                  <p style={{
                    margin: '3px 0 0 0',
                    fontSize: '10px',
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: emailDuplicate ? '1px solid #ef4444' : '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                />
                {emailDuplicate && (
                  <p style={{
                    margin: '3px 0 0 0',
                    fontSize: '10px',
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Détails commerciaux */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: 'var(--space-sm)',
            }}>
              <div style={{
                width: '20px',
                height: '2px',
                borderRadius: '2px',
                background: 'linear-gradient(to right, #8b5cf6, #a78bfa)',
              }} />
              <h3 style={{ 
                margin: 0, 
                fontSize: '11px', 
                fontWeight: '600', 
                color: 'var(--text)' 
              }}>
                Détails commerciaux
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '4px', 
                  fontSize: '9px', 
                  fontWeight: '600', 
                  color: 'var(--muted)' 
                }}>
                  Valeur estimée
                </label>
                <div style={{ position: 'relative', marginBottom: 'var(--space-xs)' }}>
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
                      padding: '8px 28px 8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '13px',
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '12px',
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
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

          {/* Prochaine étape */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: 'var(--space-sm)',
            }}>
              <div style={{
                width: '20px',
                height: '2px',
                borderRadius: '2px',
                background: 'linear-gradient(to right, #10b981, #34d399)',
              }} />
              <h3 style={{ 
                margin: 0, 
                fontSize: '11px', 
                fontWeight: '600', 
                color: 'var(--text)' 
              }}>
                Prochaine étape
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Journal des activités */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: 'var(--space-sm)',
            }}>
              <div style={{
                width: '20px',
                height: '2px',
                borderRadius: '2px',
                background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
              }} />
              <h3 style={{ 
                margin: 0, 
                fontSize: '11px', 
                fontWeight: '600', 
                color: 'var(--text)' 
              }}>
                Suivi de prospection
              </h3>
            </div>

            {pendingActivities.length === 0 ? (
              <p style={{
                fontSize: '11px',
                color: 'var(--muted)',
                margin: 'var(--space-sm) 0',
              }}>
                Aucune activité pour le moment. Ajoutez des notes ou des appels ci-dessous.
              </p>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-xs)',
                marginBottom: 'var(--space-md)',
                position: 'relative',
                paddingLeft: '16px',
              }}>
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: 'var(--border)',
                }} />
                {pendingActivities.map((activity, index) => (
                  <div key={index} style={{
                    position: 'relative',
                    padding: 'var(--space-xs)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    display: 'flex',
                    gap: 'var(--space-xs)',
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: '-12px',
                      top: '8px',
                      width: '12px',
                      height: '12px',
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
                        <Call style={{ fontSize: '8px', color: 'white' }} />
                      ) : (
                        <Note style={{ fontSize: '8px', color: 'white' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginBottom: '3px',
                      }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '600',
                          color: 'var(--muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          {activity.type === 'call' ? 'Appel téléphonique' : 'Note interne'}
                        </span>
                      </div>
                      <p style={{
                        fontSize: '11px',
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
                marginBottom: 'var(--space-xs)',
                fontSize: '9px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'var(--muted)',
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="radio"
                    name="activity-type"
                    value="note"
                    checked={noteType === 'note'}
                    onChange={() => setNoteType('note')}
                    style={{ cursor: 'pointer', width: '12px', height: '12px' }}
                  />
                  <Note style={{ fontSize: '12px' }} />
                  Note
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="radio"
                    name="activity-type"
                    value="call"
                    checked={noteType === 'call'}
                    onChange={() => setNoteType('call')}
                    style={{ cursor: 'pointer', width: '12px', height: '12px' }}
                  />
                  <Call style={{ fontSize: '12px' }} />
                  Appel
                </label>
              </div>
              <form onSubmit={handleAddPendingActivity}>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder={noteType === 'call' ? "Compte-rendu d'appel..." : 'Note interne...'}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    marginBottom: 'var(--space-xs)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!noteDraft.trim()}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: noteDraft.trim() ? 'var(--accent)' : 'var(--muted)',
                    color: 'white',
                    fontSize: '12px',
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
        </div>
      </form>
    </>
  );
};

export default MobileCreateProspectPage;
