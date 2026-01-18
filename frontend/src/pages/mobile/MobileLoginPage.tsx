import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Visibility, VisibilityOff, Lock, Person, CheckCircle, ErrorOutline } from '@mui/icons-material';
import { useAppData } from '../../store/useAppData';
import { AuthService } from '../../api';
import { UserBackpackService } from '../../api/services/userBackpack';
import { BRAND_FULL_TITLE } from '../../lib/branding';
import '../mobile.css';
import '../../styles/apple-mobile.css';

const MobileLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const login = useAppData((state) => state.login);
  const navigate = useNavigate();

  React.useEffect(() => {
    const isAuth = AuthService.isAuthenticated();
    if (isAuth && !window.location.pathname.includes('/mobile/prestations')) {
      navigate('/mobile/prestations', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!username.trim() || !password) {
      setSubmitError('Veuillez remplir tous les champs.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Utiliser AuthService pour l'authentification avec le backend
      const result = await AuthService.login({
        username: username.trim(),
        password: password,
      });

      if (result.success && result.data) {
        // Mettre à jour le store avec l'ID utilisateur du backend
        const userId = result.data.user.id;
        const userData = result.data.user;
        
        console.log('[MobileLogin] Connexion réussie, userId:', userId, 'userData:', userData);
        
        // Mettre à jour immédiatement currentUserId pour que les routes mobiles fonctionnent
        useAppData.setState({ 
          currentUserId: userId,
        });
        
        // Essayer aussi la connexion locale pour la compatibilité (si l'utilisateur existe localement)
        try {
          login(username.trim(), password);
        } catch (e) {
          // Ignorer les erreurs de connexion locale, on utilise le backend
          console.log('[MobileLogin] Connexion locale ignorée, utilisation du backend uniquement');
        }
        
        // Forcer le rechargement du backpack utilisateur pour charger toutes les données
        console.log('[MobileLogin] Chargement du backpack utilisateur...');
        
        // Réinitialiser les flags pour forcer le rechargement
        (window as any).__userBackpackLoaded = false;
        (window as any).__loadingUserBackpack = false;
        
        // Charger le backpack et attendre qu'il soit complètement chargé
        try {
          const hydrateBackpack = useAppData.getState().hydrateFromBackpack;
          const backpackResult = await UserBackpackService.loadBackpack();
          
          if (backpackResult.success && backpackResult.data) {
            console.log('[MobileLogin] Backpack chargé avec succès:', backpackResult.data);
            // Hydrater le store avec toutes les données (utilisateur, entreprise, etc.)
            hydrateBackpack(backpackResult.data);
            
            // Attendre un peu pour que le store soit complètement mis à jour
            await new Promise(resolve => setTimeout(resolve, 300));
          } else {
            console.warn('[MobileLogin] Erreur lors du chargement du backpack:', backpackResult.error);
          }
        } catch (error) {
          console.error('[MobileLogin] Erreur lors du chargement du backpack:', error);
        }
        
        // Naviguer vers prestations sans recharger la page (pour rester en mode PWA standalone)
        navigate('/mobile/prestations', { replace: true });
        return;
      }
      
      // Si on arrive ici, l'authentification a échoué
      setSubmitError(result.error || 'Identifiants incorrects. Veuillez réessayer.');
    } catch (error: any) {
      console.error('[MobileLogin] Erreur de connexion:', error);
      setSubmitError(error.message || 'Erreur de connexion au serveur. Vérifiez votre connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="mobile-app mobile-app--auth" 
      style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: 'var(--bg)',
        position: 'relative',
      }}
    >
      <style>{`
        .login-input {
          width: 100%;
          padding: 18px 20px;
          padding-left: 56px;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          font-size: 16px;
          background: var(--surface);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          color: var(--text);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .login-input::placeholder {
          color: var(--muted);
          font-weight: 400;
        }
        
        .login-input:focus {
          border-color: #3b82f6;
          border-width: 2px;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05);
          transform: translateY(-1px);
        }
        
        .login-input-group {
          position: relative;
          margin-bottom: 20px;
        }
        
        .login-input-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          transition: color 0.3s;
          pointer-events: none;
          z-index: 1;
        }
        
        .login-input:focus ~ .login-input-icon {
          color: #3b82f6;
        }
        
        .login-button {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 12px;
          font-size: 17px;
          font-weight: 600;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 12px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          position: relative;
          overflow: hidden;
        }
        
        .login-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        
        .login-button:hover:not(:disabled)::before {
          width: 300px;
          height: 300px;
        }
        
        .login-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          transform: translateY(-2px);
        }
        
        .login-button:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }
        
        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        
        .error-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #dc2626;
          font-size: 14px;
          margin-bottom: 8px;
        }
        
        .password-toggle {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
          z-index: 2;
        }
        
        .password-toggle:hover {
          color: #3b82f6;
          background: var(--surface-tint);
        }
        
        .password-toggle:active {
          transform: translateY(-50%) scale(0.95);
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          style={{ textAlign: 'center', marginBottom: '56px' }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 28px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Lock sx={{ fontSize: 40, color: 'white' }} />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              margin: 0,
              marginBottom: '10px',
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.5px',
            }}
          >
            Connexion
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              margin: 0,
              fontSize: '15px',
              color: 'var(--muted)',
              fontWeight: 400,
            }}
          >
            {BRAND_FULL_TITLE}
          </motion.p>
        </motion.div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Champ Username */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <label 
              htmlFor="mobile-username"
              style={{ 
                display: 'block', 
                marginBottom: '10px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              Identifiant
            </label>
            <div className="login-input-group">
              <input
                id="mobile-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setSubmitError(null);
                }}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoComplete="username"
                required
                placeholder="Email ou nom d'utilisateur"
                className="login-input"
              />
              <Person className="login-input-icon" sx={{ fontSize: 22 }} />
            </div>
          </motion.div>

          {/* Champ Password */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <label 
              htmlFor="mobile-password"
              style={{ 
                display: 'block', 
                marginBottom: '10px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              Mot de passe
            </label>
            <div className="login-input-group">
              <input
                id="mobile-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSubmitError(null);
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                autoComplete="current-password"
                required
                placeholder="Votre mot de passe"
                className="login-input"
                style={{ paddingRight: '56px' }}
              />
              <Lock className="login-input-icon" sx={{ fontSize: 22 }} />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                className="password-toggle"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <VisibilityOff sx={{ fontSize: 22 }} /> : <Visibility sx={{ fontSize: 22 }} />}
              </button>
            </div>
          </motion.div>

          {/* Message d'erreur */}
          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="error-message"
                role="alert"
              >
                <ErrorOutline sx={{ fontSize: 20, flexShrink: 0 }} />
                <span style={{ lineHeight: '1.5' }}>{submitError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton de connexion */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            type="submit"
            disabled={isSubmitting}
            className="login-button"
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2.5px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                  }}
                />
                <span>Connexion en cours...</span>
              </span>
            ) : (
              'Se connecter'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default MobileLoginPage;

