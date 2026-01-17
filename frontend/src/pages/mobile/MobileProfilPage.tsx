import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit, Save, Cancel, Logout, Business, Person, Email, Phone, Badge, CheckCircle, Description, Lock } from '@mui/icons-material';
import { useAppData } from '../../store/useAppData';
import { AuthService, UserService } from '../../api';
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordError(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Veuillez remplir tous les champs.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    if (!currentUser?.id) {
      setPasswordError('Utilisateur non trouvé.');
      return;
    }

    setPasswordSubmitting(true);

    try {
      const result = await UserService.changePassword(
        currentUser.id,
        passwordForm.oldPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        setShowPasswordModal(false);
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        alert('Mot de passe modifié avec succès.');
      } else {
        setPasswordError(result.error || 'Erreur lors du changement de mot de passe.');
      }
    } catch (error: any) {
      setPasswordError(error?.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setPasswordSubmitting(false);
    }
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
          onClick={() => {
            // Utiliser navigate avec state pour forcer le re-render même si on est déjà sur la route
            navigate('/mobile/devis?create=true', { replace: false, state: { forceOpenCreate: true } });
          }}
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
        <button
          onClick={() => setShowPasswordModal(true)}
          className="btn-base btn-secondary"
          style={{
            width: '100%',
            fontSize: '15px',
            padding: 'var(--space-md) var(--space-xl)',
            marginBottom: 'var(--space-md)',
          }}
        >
          <Lock style={{ fontSize: '18px' }} />
          Changer le mot de passe
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

      {/* Modale de changement de mot de passe */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => !passwordSubmitting && setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="mobile-card"
              style={{ maxWidth: '400px', width: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-card__header">
                <h2 className="mobile-card__title">Changer le mot de passe</h2>
                <button
                  type="button"
                  onClick={() => !passwordSubmitting && setShowPasswordModal(false)}
                  className="mobile-icon-button"
                  disabled={passwordSubmitting}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit} className="mobile-card__section">
                {passwordError && (
                  <div
                    style={{
                      padding: 'var(--space-md)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-md)',
                      color: '#ef4444',
                      fontSize: '14px',
                    }}
                  >
                    {passwordError}
                  </div>
                )}

                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <label
                    htmlFor="mobile-password-old"
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--text)',
                    }}
                  >
                    Ancien mot de passe *
                  </label>
                  <input
                    id="mobile-password-old"
                    name="oldPassword"
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={handlePasswordChange}
                    required
                    className="input-modern"
                    style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <label
                    htmlFor="mobile-password-new"
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--text)',
                    }}
                  >
                    Nouveau mot de passe *
                  </label>
                  <input
                    id="mobile-password-new"
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="input-modern"
                    style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                  />
                  <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--muted)' }}>
                    Minimum 6 caractères
                  </p>
                </div>

                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <label
                    htmlFor="mobile-password-confirm"
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--text)',
                    }}
                  >
                    Confirmer le nouveau mot de passe *
                  </label>
                  <input
                    id="mobile-password-confirm"
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="input-modern"
                    style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => !passwordSubmitting && setShowPasswordModal(false)}
                    className="mobile-button"
                    style={{ flex: 1 }}
                    disabled={passwordSubmitting}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="mobile-button mobile-button--primary"
                    style={{ flex: 1 }}
                    disabled={passwordSubmitting}
                  >
                    {passwordSubmitting ? 'Changement…' : 'Changer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileProfilPage;

