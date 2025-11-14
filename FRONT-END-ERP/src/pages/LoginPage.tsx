import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../store/useAppData';
import { BRAND_FULL_TITLE } from '../lib/branding';

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

  const login = useAppData((state) => state.login);
  const theme = useAppData((state) => state.theme);
  const setTheme = useAppData((state) => state.setTheme);
  const isAuthenticated = useAppData((state) => state.currentUserId !== null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    const nextUsernameError = trimmedUsername ? null : 'Le nom d’utilisateur est requis.';
    const nextPasswordError = password ? null : 'Le mot de passe est requis.';

    setTouchedFields({ username: true, password: true });
    setSubmitError(null);

    if (nextUsernameError || nextPasswordError) {
      return;
    }

    setIsSubmitting(true);
    const success = login(trimmedUsername, password);

    if (success) {
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
      navigate('/', { replace: true });
    } else {
      setSubmitError('Identifiants incorrects.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/fuveau.jpg"
          alt="Village de Fuveau avec montagnes"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/45 mix-blend-multiply" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-900/25 via-slate-900/35 to-slate-900/45 dark:from-slate-950/55 dark:via-slate-950/65 dark:to-slate-950/75"
          aria-hidden="true"
        />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex justify-end px-6 pt-6">
          <button
            type="button"
            aria-pressed={theme === 'dark'}
            aria-label={`Basculer en mode ${theme === 'dark' ? 'clair' : 'sombre'}`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            style={{ color: 'var(--accent)', background: 'var(--surface)' }}
          >
            <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span>{theme === 'dark' ? 'Sombre' : 'Clair'}</span>
          </button>
        </div>
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div
            className="w-full max-w-md rounded-2xl border px-8 py-10 shadow-lg"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="space-y-2 text-center">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Connexion</h1>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Bonjour, veuillez vous connecter à votre espace {BRAND_FULL_TITLE}.
              </p>
            </div>
            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300"
              >
                Nom d’utilisateur
              </label>
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
                className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-primary"
              />
              {usernameError && (
                <p id="username-error" className="text-xs font-medium text-red-600">
                  {usernameError}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300"
                >
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-xs font-semibold text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
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
                className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-primary"
              />
              {passwordError && (
                <p id="password-error" className="text-xs font-medium text-red-600">
                  {passwordError}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="table-checkbox h-3.5 w-3.5 rounded focus:ring-primary/40"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Se souvenir de moi
              </label>
              <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Accès sécurisé
              </span>
            </div>
            {submitError && (
              <p className="text-xs font-medium text-red-600" role="alert" aria-live="assertive">
                {submitError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="relative inline-flex w-full items-center justify-center gap-2 rounded-soft border border-primary bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:border-primary/50 disabled:bg-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {isSubmitting && (
                <span
                  className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border border-white/40 border-t-white"
                  aria-hidden="true"
                />
              )}
              <span>Se connecter</span>
            </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
