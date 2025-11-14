# ERPWASHGO Monorepo

Ce dépôt regroupe le front-end (Vite/React/TS) et le back-end (FastAPI/Python) dans un monorépo.

## Structure

- `BACK-END-ERP/` — API FastAPI (Python)
- `FRONT-END-ERP/` — Front Vite React

## Prérequis

- Node.js ≥ 18
- Python 3.13 (un venv est présent dans `BACK-END-ERP/venv`)

## Installation

- Installer les dépendances front via workspaces:

```bash
npm run install:all
```

- Installer les dépendances Python si besoin:

```bash
cd BACK-END-ERP
venv/Scripts/pip.exe install -r requirements.txt
```

## Développement

- Lancer API + Front ensemble:

```bash
npm run dev
```

- Lancer uniquement l'API:

```bash
npm run dev:api
```

- Lancer uniquement le Front:

```bash
npm run dev:web
```

Par défaut:
- API: `http://localhost:8000`
- Front: `http://localhost:5173`

## Build Front

```bash
npm run build
```

## Preview Front

```bash
npm run preview
```

Notes: Le monorépo utilise npm workspaces pour le front. Le back reste Python isolé mais orchestré au niveau racine via des scripts communs.
