import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../store/useAppData';
import type { Client } from '../../store/useAppData';
import '../mobile.css';
import '../../styles/apple-mobile.css';

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

const MobileCreateClientPage: React.FC = () => {
  const navigate = useNavigate();
  const addClient = useAppData((state) => state.addClient);

  const [createClientForm, setCreateClientForm] = useState<CreateClientFormState>(() => ({
    ...CREATE_CLIENT_DEFAULTS,
  }));
  const [createClientError, setCreateClientError] = useState<string | null>(null);

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

    navigate('/mobile/clients', { replace: true });
  };

  return (
    <>
      {/* Élément invisible pour la détection par la navbar */}
      <div data-mobile-modal="true" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
        <button
          type="button"
          data-modal-action="cancel"
          onClick={() => navigate('/mobile/clients')}
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

      <form onSubmit={handleSubmitCreateClient} style={{
        width: '100%',
        maxWidth: '100%',
        padding: 'var(--space-md)',
        background: 'var(--bg)',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}>
        {createClientError && (
          <div style={{
            padding: 'var(--space-sm) var(--space-md)',
            marginBottom: 'var(--space-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 'var(--radius-md)',
            color: '#dc2626',
            fontSize: '12px',
          }}>
            {createClientError}
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
                  setCreateClientForm((prev) => ({ ...prev, type: 'company' }));
                  setCreateClientError(null);
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: createClientForm.type === 'company' ? '#9333ea' : 'transparent',
                  color: createClientForm.type === 'company' ? 'white' : 'var(--text)',
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
                  setCreateClientForm((prev) => ({ ...prev, type: 'individual', siret: '' }));
                  setCreateClientError(null);
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: createClientForm.type === 'individual' ? '#3b82f6' : 'transparent',
                  color: createClientForm.type === 'individual' ? 'white' : 'var(--text)',
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

          {/* Section: Informations entreprise */}
          {createClientForm.type === 'company' && (
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
                  background: 'linear-gradient(to right, #9333ea, #a78bfa)',
                }} />
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '11px', 
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
                    marginBottom: '4px', 
                    fontSize: '9px', 
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
          )}

          {/* Section: Informations de contact */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '9px', 
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
          </div>

          {/* Section: Coordonnées */}
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
                Coordonnées
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '9px', 
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
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
                    value={createClientForm.address}
                    onChange={(e) => {
                      setCreateClientForm((prev) => ({ ...prev, address: e.target.value }));
                      setCreateClientError(null);
                    }}
                    placeholder="12 rue des Lavandières"
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
          </div>

          {/* Section: Informations complémentaires */}
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
                background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
              }} />
              <h3 style={{ 
                margin: 0, 
                fontSize: '11px', 
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                />
                <p style={{ 
                  margin: '3px 0 0 0', 
                  fontSize: '9px', 
                  color: 'var(--muted)' 
                }}>
                  Séparez les tags par des virgules.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
};

export default MobileCreateClientPage;
