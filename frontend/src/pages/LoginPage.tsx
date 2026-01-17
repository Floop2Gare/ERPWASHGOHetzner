import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../store/useAppData';
import { BRAND_FULL_TITLE } from '../lib/branding';
import { AuthService } from '../api';

const REMEMBER_USERNAME_KEY = 'washandgo-remember-username';
const LEGACY_REMEMBER_USERNAME_KEYS = ['washingo-remember-username', 'washango-remember-username'];
const REMEMBER_CHOICE_KEY = 'washandgo-remember-choice';
const LEGACY_REMEMBER_CHOICE_KEYS = ['washingo-remember-choice', 'washango-remember-choice'];

const readStorage = (keys: string | string[]) => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const resolvedKeys = Array.isArray(keys) ? keys : [keys];
    for (const key of resolvedKeys) {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        return value;
      }
    }
    return null;
  } catch (error) {
    console.warn('Unable to read from localStorage', error);
    return null;
  }
};

const LoginPage = () => {
  const [username, setUsername] = useState(
    () => readStorage([REMEMBER_USERNAME_KEY, ...LEGACY_REMEMBER_USERNAME_KEYS]) ?? ''
  );
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(
    () => readStorage([REMEMBER_CHOICE_KEY, ...LEGACY_REMEMBER_CHOICE_KEYS]) === 'true'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<{ username: boolean; password: boolean }>(
    () => ({ username: false, password: false })
  );

  const navigate = useNavigate();

  const usernameError = useMemo(() => {
    if (!touchedFields.username) {
      return null;
    }
    return username.trim() ? null : 'Le nom d’utilisateur est requis.';
  }, [touchedFields.username, username]);

  const passwordError = useMemo(() => {
    if (!touchedFields.password) {
      return null;
    }
    return password ? null : 'Le mot de passe est requis.';
  }, [password, touchedFields.password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    const nextUsernameError = trimmedUsername ? null : "Le nom d'utilisateur est requis.";
    const nextPasswordError = password ? null : 'Le mot de passe est requis.';

    setTouchedFields({ username: true, password: true });
    setSubmitError(null);

    if (nextUsernameError || nextPasswordError) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await AuthService.login({
        username: trimmedUsername,
        password: password,
      });

      if (result.success && result.data) {
        // Le token et l'utilisateur sont déjà stockés par AuthService.login()
        const userData = result.data.user;
        
        // S'assurer que l'utilisateur existe dans authUsers
        const currentState = useAppData.getState();
        const existingUser = currentState.authUsers.find(u => u.id === userData.id);
        
        if (!existingUser) {
          // Ajouter l'utilisateur à authUsers s'il n'existe pas
          const newUser = {
            id: userData.id,
            username: userData.username,
            fullName: userData.fullName || userData.username,
            passwordHash: '', // Pas besoin du hash après connexion
            role: userData.role || 'agent',
            pages: userData.pages || ['*'],
            permissions: userData.permissions || ['*'],
            active: true,
            profile: userData.profile || {
              id: `user-${userData.id}`,
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              role: userData.role || 'agent',
              avatarUrl: undefined,
              password: '',
              emailSignatureHtml: '',
              emailSignatureUseDefault: true,
            },
            notificationPreferences: userData.notificationPreferences || {
              emailAlerts: true,
              internalAlerts: true,
              smsAlerts: false,
            },
            companyId: userData.companyId || null,
          };
          
          useAppData.setState({
            authUsers: [...currentState.authUsers, newUser],
            currentUserId: userData.id,
          });
        } else {
          // Mettre à jour l'utilisateur existant avec les données du backend (pages, permissions, etc.)
          const updatedUser = {
            ...existingUser,
            username: userData.username || existingUser.username,
            fullName: userData.fullName || existingUser.fullName,
            role: userData.role || existingUser.role,
            pages: userData.pages || existingUser.pages || ['*'],
            permissions: userData.permissions || existingUser.permissions || ['*'],
            active: userData.active !== undefined ? userData.active : existingUser.active,
            companyId: userData.companyId !== undefined ? userData.companyId : existingUser.companyId,
            profile: userData.profile || existingUser.profile,
            notificationPreferences: userData.notificationPreferences || existingUser.notificationPreferences,
          };
          
          // Mettre à jour l'utilisateur dans authUsers
          const updatedAuthUsers = currentState.authUsers.map(u => 
            u.id === userData.id ? updatedUser : u
          );
          
          useAppData.setState({ 
            authUsers: updatedAuthUsers,
            currentUserId: userData.id 
          });
        }
        
        // Sauvegarder le choix "Se souvenir"
        if (typeof window !== 'undefined') {
          if (rememberMe) {
            window.localStorage.setItem(REMEMBER_USERNAME_KEY, username.trim());
            window.localStorage.setItem(REMEMBER_CHOICE_KEY, 'true');
            LEGACY_REMEMBER_USERNAME_KEYS.forEach((key) => window.localStorage.removeItem(key));
            LEGACY_REMEMBER_CHOICE_KEYS.forEach((key) => window.localStorage.removeItem(key));
          } else {
            window.localStorage.removeItem(REMEMBER_USERNAME_KEY);
            window.localStorage.removeItem(REMEMBER_CHOICE_KEY);
            LEGACY_REMEMBER_USERNAME_KEYS.forEach((key) => window.localStorage.removeItem(key));
            LEGACY_REMEMBER_CHOICE_KEYS.forEach((key) => window.localStorage.removeItem(key));
          }
        }
        
        // Attendre un peu pour que le token soit bien stocké et disponible
        // puis rediriger
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } else {
        setSubmitError(result.error || 'Identifiants incorrects.');
        setIsSubmitting(false);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erreur lors de la connexion.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0">
        <img
          src="/fuveau.jpg"
          alt="Village de Fuveau avec montagnes"
          className="h-full w-full object-cover transition-opacity"
          style={{ filter: 'brightness(0.5)' }}
        />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-lg transition-all"
            style={{ 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="space-y-3 text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 shadow-sm mb-2">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-slate-900">Connexion</h1>
              <p className="text-sm leading-6 text-slate-600">
                Bonjour, veuillez vous connecter à votre espace <span className="font-medium text-slate-900">{BRAND_FULL_TITLE}</span>.
              </p>
            </div>
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-medium text-slate-600"
              >
                Nom d'utilisateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  id="username"
                  name="username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    if (submitError) {
                      setSubmitError(null);
                    }
                  }}
                  onBlur={() => setTouchedFields((prev) => ({ ...prev, username: true }))}
                  autoComplete="username"
                  required
                  aria-invalid={Boolean(usernameError)}
                  aria-describedby={usernameError ? 'username-error' : undefined}
                  className={`w-full rounded-lg border bg-white pl-9 pr-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 ${
                    usernameError
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10'
                      : 'border-slate-300'
                  }`}
                  placeholder="Entrez votre nom d'utilisateur"
                />
              </div>
              {usernameError && (
                <p id="username-error" className="text-xs font-medium text-red-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {usernameError}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-600"
                >
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-xs font-medium text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 rounded px-1.5 py-0.5"
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (submitError) {
                      setSubmitError(null);
                    }
                  }}
                  onBlur={() => setTouchedFields((prev) => ({ ...prev, password: true }))}
                  autoComplete="current-password"
                  required
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className={`w-full rounded-lg border bg-white pl-9 pr-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 ${
                    passwordError
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10'
                      : 'border-slate-300'
                  }`}
                  placeholder="Entrez votre mot de passe"
                />
              </div>
              {passwordError && (
                <p id="password-error" className="text-xs font-medium text-red-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {passwordError}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer group">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 transition cursor-pointer"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span className="group-hover:text-slate-700 transition">Se souvenir de moi</span>
              </label>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Accès sécurisé</span>
              </div>
            </div>
            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-3" role="alert" aria-live="assertive">
                <div className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs font-medium text-red-700">{submitError}</p>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="relative inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-blue-400 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {isSubmitting ? (
                <>
                  <span
                    className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden="true"
                  />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
