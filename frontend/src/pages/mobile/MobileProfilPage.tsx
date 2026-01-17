import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Save, Cancel, Logout, Business, Person, Email, Phone, Badge, CheckCircle, Description } from '@mui/icons-material';
import { useAppData } from '../../store/useAppData';
import { AuthService } from '../../api';
import '../mobile.css';
import '../../styles/apple-mobile.css';

const MobileProfilPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppData((state) => state.getCurrentUser());
  const userProfile = useAppData((state) => state.userProfile);
  const companies = useAppData((state) => state.companies) || [];
  const activeCompanyId = useAppData((state) => state.activeCompanyId);
  const setActiveCompany = useAppData((state) => state.setActiveCompany);
  const updateUserProfile = useAppData((state) => state.updateUserProfile);
  const logout = useAppData((state) => state.logout);

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    firstName: userProfile.firstName,
    lastName: userProfile.lastName,
    email: userProfile.email,
    phone: userProfile.phone || '',
  });

  const handleLogout = () => {
    // Déconnexion du backend (supprime le token JWT)
    AuthService.logout();
    // Déconnexion du store local
    logout();
    // Naviguer vers la page de connexion sans recharger (pour rester en mode PWA standalone)
    navigate('/mobile/login', { replace: true });
  };

  const handleSave = () => {
    updateUserProfile({
      firstName: editedProfile.firstName,
      lastName: editedProfile.lastName,
      email: editedProfile.email,
      phone: editedProfile.phone,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile({
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      email: userProfile.email,
      phone: userProfile.phone || '',
    });
    setIsEditing(false);
  };

  // Vérifier l'authentification après tous les hooks
  if (!currentUser) {
    // Rediriger vers la page de connexion si pas d'utilisateur
    React.useEffect(() => {
      if (!AuthService.isAuthenticated()) {
        navigate('/mobile/login', { replace: true });
      }
    }, [navigate]);
    
    return (
      <div className="modern-text" style={{ padding: '0 var(--space-xl)', width: '100%' }}>
        <div className="card-modern" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <p className="text-caption" style={{ margin: 0, color: 'var(--muted)' }}>
            Utilisateur non connecté
          </p>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    superAdmin: 'Super Admin',
    admin: 'Admin',
    user: 'Utilisateur',
    viewer: 'Observateur',
  };

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

  const handleCompanyChange = (companyId: string) => {
    setActiveCompany(companyId);
  };

  return (
    <div className="modern-text" style={{ padding: '0 var(--space-xl)', width: '100%' }}>
      {/* Header avec avatar */}
      <div className="card-modern" style={{ 
        marginTop: 'var(--space-md)',
        marginBottom: 'var(--space-xl)',
        padding: 'var(--space-2xl)',
        textAlign: 'center',
      }}>
        {userProfile.avatarUrl ? (
          <img
            src={userProfile.avatarUrl}
            alt={`${userProfile.firstName} ${userProfile.lastName}`}
            style={{ 
              margin: '0 auto var(--space-md)',
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
              border: '3px solid rgba(var(--accent-rgb), 0.2)',
              boxShadow: '0 4px 16px rgba(var(--accent-rgb), 0.25)',
              display: 'block',
            }}
          />
        ) : (
          <div className="avatar avatar-xl" style={{ 
            margin: '0 auto var(--space-md)',
            width: '80px',
            height: '80px',
            fontSize: '28px',
          }}>
            {getInitials(userProfile.firstName, userProfile.lastName)}
          </div>
        )}
        <h1 className="text-title" style={{ margin: 0, marginBottom: 'var(--space-xs)', color: 'var(--text)' }}>
          {userProfile.firstName} {userProfile.lastName}
        </h1>
        <div className="badge-modern badge-primary" style={{ 
          display: 'inline-flex',
          marginTop: 'var(--space-xs)',
        }}>
          {roleLabels[currentUser.role] || currentUser.role}
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-base btn-secondary btn-compact"
            style={{
              marginTop: 'var(--space-lg)',
              padding: 'var(--space-sm) var(--space-lg)',
            }}
          >
            <Edit style={{ fontSize: '16px' }} />
            Modifier le profil
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)', justifyContent: 'center' }}>
            <button
              onClick={handleSave}
              className="btn-base btn-primary btn-compact"
              style={{
                padding: 'var(--space-sm) var(--space-lg)',
              }}
            >
              <Save style={{ fontSize: '16px' }} />
              Enregistrer
            </button>
            <button
              onClick={handleCancel}
              className="btn-base btn-secondary btn-compact"
              style={{
                padding: 'var(--space-sm) var(--space-lg)',
              }}
            >
              <Cancel style={{ fontSize: '16px' }} />
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Section Informations personnelles */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 className="text-headline" style={{ 
          margin: 0, 
          marginBottom: 'var(--space-md)',
          color: 'var(--text)',
          paddingLeft: 'var(--space-sm)',
        }}>
          Informations personnelles
        </h2>
        
        <div className="card-modern" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Prénom */}
          <div className="info-row" style={{ padding: 'var(--space-lg)' }}>
            <div className="info-row-icon">
              <Person style={{ fontSize: '18px' }} />
            </div>
            <div className="info-row-content">
              <span className="info-row-label">Prénom</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.firstName}
                  onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                  className="input-modern"
                  style={{ 
                    padding: 'var(--space-sm) var(--space-md)',
                    fontSize: '14px',
                    marginTop: 'var(--space-xs)',
                  }}
                />
              ) : (
                <span className="info-row-value">{userProfile.firstName}</span>
              )}
            </div>
          </div>

          {/* Nom */}
          <div className="info-row" style={{ padding: 'var(--space-lg)' }}>
            <div className="info-row-icon">
              <Person style={{ fontSize: '18px' }} />
            </div>
            <div className="info-row-content">
              <span className="info-row-label">Nom</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.lastName}
                  onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                  className="input-modern"
                  style={{ 
                    padding: 'var(--space-sm) var(--space-md)',
                    fontSize: '14px',
                    marginTop: 'var(--space-xs)',
                  }}
                />
              ) : (
                <span className="info-row-value">{userProfile.lastName}</span>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="info-row" style={{ padding: 'var(--space-lg)', borderBottom: 'none' }}>
            <div className="info-row-icon">
              <Email style={{ fontSize: '18px' }} />
            </div>
            <div className="info-row-content">
              <span className="info-row-label">Email</span>
              {isEditing ? (
                <input
                  type="email"
                  value={editedProfile.email}
                  onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                  className="input-modern"
                  style={{ 
                    padding: 'var(--space-sm) var(--space-md)',
                    fontSize: '14px',
                    marginTop: 'var(--space-xs)',
                  }}
                />
              ) : (
                <span className="info-row-value">{userProfile.email}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section Contact */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 className="text-headline" style={{ 
          margin: 0, 
          marginBottom: 'var(--space-md)',
          color: 'var(--text)',
          paddingLeft: 'var(--space-sm)',
        }}>
          Contact
        </h2>
        
        <div className="card-modern" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Téléphone */}
          <div className="info-row" style={{ padding: 'var(--space-lg)', borderBottom: 'none' }}>
            <div className="info-row-icon">
              <Phone style={{ fontSize: '18px' }} />
            </div>
            <div className="info-row-content">
              <span className="info-row-label">Téléphone</span>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedProfile.phone}
                  onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                  placeholder="Non renseigné"
                  className="input-modern"
                  style={{ 
                    padding: 'var(--space-sm) var(--space-md)',
                    fontSize: '14px',
                    marginTop: 'var(--space-xs)',
                  }}
                />
              ) : (
                <span className="info-row-value" style={{ 
                  color: userProfile.phone ? 'var(--text)' : 'var(--muted)' 
                }}>
                  {userProfile.phone || 'Non renseigné'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section Entreprise */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 className="text-headline" style={{ 
          margin: 0, 
          marginBottom: 'var(--space-md)',
          color: 'var(--text)',
          paddingLeft: 'var(--space-sm)',
        }}>
          Entreprise
        </h2>
        
        {companies.length === 0 ? (
          <div className="card-modern" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
            <p className="text-caption" style={{ margin: 0, color: 'var(--muted)' }}>
              Aucune entreprise disponible
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {companies.map((company) => {
              const isActive = activeCompanyId === company.id || (!activeCompanyId && company.isDefault);
              
              return (
                <button
                  key={company.id}
                  onClick={() => handleCompanyChange(company.id)}
                  className="card-modern card-interactive"
                  style={{
                    padding: 'var(--space-lg)',
                    textAlign: 'left',
                    border: isActive 
                      ? '2px solid var(--accent)' 
                      : '1px solid rgba(var(--border-rgb), 0.08)',
                    background: isActive 
                      ? 'rgba(var(--accent-rgb), 0.05)' 
                      : 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)', width: '100%' }}>
                    <div className="info-row-icon" style={{ 
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <Business style={{ fontSize: '20px' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                        <h3 className="text-body-lg" style={{ 
                          margin: 0,
                          fontWeight: 600,
                          color: 'var(--text)',
                        }}>
                          {company.name}
                        </h3>
                        {isActive && (
                          <CheckCircle style={{ 
                            fontSize: '18px', 
                            color: 'var(--accent)',
                            flexShrink: 0,
                          }} />
                        )}
                      </div>
                      {company.address && (
                        <p className="text-caption" style={{ margin: 0 }}>
                          {company.address}
                          {company.postalCode && `, ${company.postalCode}`}
                          {company.city && ` ${company.city}`}
                        </p>
                      )}
                      {isActive && (
                        <span className="badge-modern badge-primary" style={{
                          marginTop: 'var(--space-xs)',
                          display: 'inline-flex',
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Section Compte */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 className="text-headline" style={{ 
          margin: 0, 
          marginBottom: 'var(--space-md)',
          color: 'var(--text)',
          paddingLeft: 'var(--space-sm)',
        }}>
          Compte
        </h2>
        
        <div className="card-modern" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="info-row" style={{ padding: 'var(--space-lg)', borderBottom: 'none' }}>
            <div className="info-row-icon">
              <Badge style={{ fontSize: '18px' }} />
            </div>
            <div className="info-row-content">
              <span className="info-row-label">Identifiant</span>
              <span className="info-row-value">{currentUser.username}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div style={{ marginTop: 'var(--space-2xl)', marginBottom: 'var(--space-xl)' }}>
        <button
          onClick={() => navigate('/mobile/devis?create=true')}
          className="btn-base btn-primary"
          style={{
            width: '100%',
            fontSize: '15px',
            padding: 'var(--space-md) var(--space-xl)',
            marginBottom: 'var(--space-md)',
          }}
        >
          <Description style={{ fontSize: '18px' }} />
          Créer un devis
        </button>
      </div>

      {/* Déconnexion */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <button
          onClick={handleLogout}
          className="btn-base btn-secondary"
          style={{
            width: '100%',
            color: '#ff3b30',
            fontSize: '15px',
            padding: 'var(--space-md) var(--space-xl)',
          }}
        >
          <Logout style={{ fontSize: '18px' }} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default MobileProfilPage;

