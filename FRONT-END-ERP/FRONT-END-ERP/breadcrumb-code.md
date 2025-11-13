# Code du Fil d'Ariane (Breadcrumb)

Ce document contient tout le code nécessaire pour le composant de fil d'Ariane utilisé dans l'application ERP Wash&Go.

## 1. Logique TypeScript/React (Topbar.tsx)

### Configuration et utilitaires

```typescript
const BREADCRUMB_LABEL_OVERRIDES = new Map<string, string>([
  ['crm', 'CRM'],
  ['hub', 'Accueil'],
  ['accueil', 'Accueil'],
  ['parametres', 'Paramètres'],
  ['parametres general', 'Paramètres généraux'],
  ['tableau de bord', 'Tableau de bord'],
  ['tableau-de-bord', 'Tableau de bord'],
  ['clients', 'Clients'],
  ['leads', 'Leads'],
  ['services', 'Services'],
  ['documents', 'Documents'],
  ['planning', 'Planning'],
  ['stats', 'Statistiques'],
]);

const formatBreadcrumbLabel = (segment: string) => {
  const cleaned = segment.replace(/[-_]+/g, ' ').trim();
  if (!cleaned) {
    return segment;
  }

  const normalized = cleaned.toLowerCase();
  if (BREADCRUMB_LABEL_OVERRIDES.has(normalized)) {
    return BREADCRUMB_LABEL_OVERRIDES.get(normalized)!;
  }

  if (BREADCRUMB_LABEL_OVERRIDES.has(segment.toLowerCase())) {
    return BREADCRUMB_LABEL_OVERRIDES.get(segment.toLowerCase())!;
  }

  return cleaned.replace(/\b\p{L}/gu, (char) => char.toLocaleUpperCase());
};
```

### Logique de génération du fil d'Ariane

```typescript
const normalizedPath = useMemo(() => {
  if (!location.pathname) {
    return '/';
  }
  if (location.pathname.length > 1 && location.pathname.endsWith('/')) {
    return location.pathname.slice(0, -1);
  }
  return location.pathname;
}, [location.pathname]);

const breadcrumbItems = useMemo(() => {
  const items: { label: string; to: string | null }[] = [
    { label: 'Accueil', to: normalizedPath === '/' ? null : '/' },
  ];

  if (normalizedPath === '/' || normalizedPath === '') {
    return items;
  }

  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments[0] === 'workspace') {
    const moduleId = segments[1] as WorkspaceModuleId | undefined;
    const module = moduleId ? getWorkspaceModule(moduleId) : undefined;
    if (module) {
      const moduleNavItems = module.nav.flatMap((section) => section.items);
      const isModuleRoot = segments.length <= 2;
      items.push({
        label: module.name,
        to: isModuleRoot ? null : module.basePath,
      });

      if (!isModuleRoot) {
        let cumulative = module.basePath;
        const detailSegments = segments.slice(2);
        detailSegments.forEach((segment, index) => {
          cumulative += `/${segment}`;
          const match = moduleNavItems.find((item) => item.to === cumulative);
          const label = match?.label ?? formatBreadcrumbLabel(segment);
          const isLast = index === detailSegments.length - 1;
          items.push({
            label,
            to: isLast ? null : match?.to ?? cumulative,
          });
        });
      }

      return items;
    }
  }

  let cumulative = '';
  segments.forEach((segment, index) => {
    cumulative += `/${segment}`;
    const isLast = index === segments.length - 1;
    items.push({
      label: formatBreadcrumbLabel(segment),
      to: isLast ? null : cumulative,
    });
  });

  return items;
}, [normalizedPath]);
```

### Rendu JSX

```tsx
<nav className="topbar__breadcrumbs lg:flex lg:items-center lg:justify-center" aria-label="Fil d'Ariane">
  <ol className="lg:flex lg:items-center lg:justify-center lg:gap-2">
    {breadcrumbItems.map((item, index) => {
      const isLast = index === breadcrumbItems.length - 1;
      return (
        <li
          key={`${item.label}-${index}`}
          className="topbar__breadcrumb-item"
          aria-current={isLast ? 'page' : undefined}
        >
          {index !== 0 && <span className="topbar__breadcrumb-separator">/</span>}
          {item.to && !isLast ? (
            <Link to={item.to} className="topbar__breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="topbar__breadcrumb-current">{item.label}</span>
          )}
        </li>
      );
    })}
  </ol>
</nav>
```

## 2. Styles CSS (index.css)

```css
/* ===== Fil d'Ariane (Breadcrumb) - Style compact premium ===== */

.topbar__breadcrumbs {
  display: flex;
  align-items: center;
  font-size: 0.7rem;
  letter-spacing: 0.03em;
  padding: 0.4rem 0.6rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, rgba(var(--accent-rgb) / 0.02) 0%, rgba(var(--accent-rgb) / 0.005) 100%);
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(var(--accent-rgb) / 0.05);
}

.topbar__breadcrumbs ol {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  flex-wrap: wrap;
  text-transform: inherit;
}

.topbar__breadcrumb-item {
  display: inline-flex;
  align-items: center;
  position: relative;
  animation: slideInCompact 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  opacity: 0;
}

.topbar__breadcrumb-item:nth-child(1) { animation-delay: 0.03s; }
.topbar__breadcrumb-item:nth-child(2) { animation-delay: 0.06s; }
.topbar__breadcrumb-item:nth-child(3) { animation-delay: 0.09s; }
.topbar__breadcrumb-item:nth-child(4) { animation-delay: 0.12s; }
.topbar__breadcrumb-item:nth-child(5) { animation-delay: 0.15s; }

.topbar__breadcrumb-item:first-child .topbar__breadcrumb-link,
.topbar__breadcrumb-item:first-child .topbar__breadcrumb-current {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: rgba(var(--accent-rgb) / 0.9);
  font-size: 0.65rem;
  background: linear-gradient(135deg, rgba(var(--accent-rgb) / 0.08) 0%, rgba(var(--accent-rgb) / 0.04) 100%);
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px rgba(var(--accent-rgb) / 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(var(--accent-rgb) / 0.1);
}

.topbar__breadcrumb-link {
  color: rgba(var(--txt-muted-rgb) / 0.7);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  letter-spacing: 0.015em;
  position: relative;
  padding: 0.2rem 0.4rem;
  border-radius: 0.3rem;
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(var(--txt-muted-rgb) / 0.08);
  overflow: hidden;
}

.topbar__breadcrumb-link::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(var(--accent-rgb) / 0.05) 0%, rgba(var(--accent-rgb) / 0.02) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: inherit;
}

.topbar__breadcrumb-link:hover,
.topbar__breadcrumb-link:focus-visible {
  color: rgba(var(--accent-rgb) / 0.9);
  transform: translateY(-0.5px);
  box-shadow: 0 2px 4px rgba(var(--accent-rgb) / 0.1), 0 1px 2px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border-color: rgba(var(--accent-rgb) / 0.15);
  outline: none;
}

.topbar__breadcrumb-link:hover::before,
.topbar__breadcrumb-link:focus-visible::before {
  opacity: 1;
}

.topbar__breadcrumb-current {
  color: rgba(var(--txt-primary-rgb) / 0.95);
  font-weight: 600;
  letter-spacing: 0.015em;
  padding: 0.25rem 0.45rem;
  border-radius: 0.3rem;
  background: linear-gradient(135deg, rgba(var(--accent-rgb) / 0.1) 0%, rgba(var(--accent-rgb) / 0.05) 100%);
  box-shadow: 0 1px 3px rgba(var(--accent-rgb) / 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(var(--accent-rgb) / 0.12);
  position: relative;
  overflow: hidden;
}

.topbar__breadcrumb-current::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
  animation: shimmerBreadcrumb 4s infinite;
}

@keyframes shimmerBreadcrumb {
  0% { left: -100%; }
  100% { left: 100%; }
}

.topbar__breadcrumb-separator {
  color: rgba(var(--txt-muted-rgb) / 0.35);
  font-size: 0.6rem;
  font-weight: 400;
  margin: 0 0.1rem;
  display: inline-flex;
  align-items: center;
  padding: 0.15rem;
  border-radius: 9999px;
  background: rgba(var(--txt-muted-rgb) / 0.03);
  transition: all 0.3s ease;
}

.topbar__breadcrumb-separator:hover {
  color: rgba(var(--txt-muted-rgb) / 0.5);
  background: rgba(var(--txt-muted-rgb) / 0.06);
  transform: scale(1.05);
}

.dark .topbar__breadcrumbs {
  background: linear-gradient(135deg, rgba(var(--accent-rgb) / 0.03) 0%, rgba(var(--accent-rgb) / 0.01) 100%);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.03);
  border-color: rgba(var(--accent-rgb) / 0.08);
}

.dark .topbar__breadcrumb-link {
  background: rgba(0, 0, 0, 0.15);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
}

.dark .topbar__breadcrumb-link:hover,
.dark .topbar__breadcrumb-link:focus-visible {
  box-shadow: 0 2px 6px rgba(var(--accent-rgb) / 0.15), 0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border-color: rgba(var(--accent-rgb) / 0.2);
}

.dark .topbar__breadcrumb-current {
  background: linear-gradient(135deg, rgba(var(--accent-rgb) / 0.12) 0%, rgba(var(--accent-rgb) / 0.06) 100%);
  box-shadow: 0 1px 4px rgba(var(--accent-rgb) / 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  border-color: rgba(var(--accent-rgb) / 0.15);
}

.dark .topbar__breadcrumb-separator {
  background: rgba(255, 255, 255, 0.03);
}

@media (hover: none) {
  .topbar__breadcrumb-link,
  .topbar__breadcrumb-current {
    padding: 0.25rem 0.5rem;
  }

  .topbar__breadcrumb-link::before {
    display: none;
  }
}

@keyframes slideInCompact {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 768px) {
  .topbar__breadcrumbs {
    padding: 0.3rem 0.4rem;
    border-radius: 0.375rem;
  }

  .topbar__breadcrumb-link,
  .topbar__breadcrumb-current {
    padding: 0.2rem 0.35rem;
    font-size: 0.65rem;
  }
}
```

## 3. Dépendances nécessaires

### Imports requis dans Topbar.tsx

```typescript
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getWorkspaceModule, type WorkspaceModuleId } from '../workspace/modules';
```

### Variables CSS utilisées

Le code utilise des variables CSS personnalisées :
- `--accent-rgb` : Couleur d'accent (RGB)
- `--txt-muted-rgb` : Couleur de texte secondaire (RGB)
- `--txt-primary-rgb` : Couleur de texte principal (RGB)

## 4. Fonctionnalités

- **Génération automatique** : Le fil d'Ariane est généré automatiquement à partir de l'URL actuelle
- **Support des modules workspace** : Gestion spéciale pour les routes `/workspace/[module]/...`
- **Labels personnalisés** : Mapping des segments d'URL vers des labels lisibles
- **Navigation** : Les éléments non-terminaux sont cliquables pour naviguer
- **Animations** : Animations d'apparition et effet shimmer sur l'élément actif
- **Mode sombre** : Styles adaptés pour le thème sombre
- **Responsive** : Adaptation pour les écrans mobiles
- **Accessibilité** : Attributs ARIA appropriés (`aria-label`, `aria-current`)

## 5. Structure des données

### Type BreadcrumbItem

```typescript
type BreadcrumbItem = {
  label: string;    // Texte affiché
  to: string | null; // URL de navigation (null pour l'élément actif)
};
```

### Exemple de résultat

Pour l'URL `/workspace/crm/clients`, le fil d'Ariane génère :
```typescript
[
  { label: 'Accueil', to: '/' },
  { label: 'CRM', to: '/workspace/crm' },
  { label: 'Clients', to: null }
]
```

