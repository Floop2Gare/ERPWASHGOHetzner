# Démarrage rapide (Windows)

Ce guide explique comment lancer l'application en monorépo (frontend + backend) sur Windows.

## 1) Prérequis

- Node.js ≥ 18 (vérifier: `node -v`)
- Python 3.13 avec venv (déjà présent dans `BACK-END-ERP/venv`)

## 2) Installation des dépendances

À la racine du dépôt:

```powershell
cd C:\Users\Floop\Desktop\ERPWASHGO
npm run install:all
```

Dépendances Python du backend (si nécessaire):

```powershell
cd C:\Users\Floop\Desktop\ERPWASHGO\BACK-END-ERP
.\venv\Scripts\pip.exe install -r requirements.txt
```

Astuce: si certains paquets Python échouent à s'installer (réseau/proxy), l'API pourra démarrer en mode « dégradé » (endpoints limités). Installe les paquets plus tard pour repasser en état « ok ».

## 3) Lancer en développement

Depuis la racine:

```powershell
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

Lancement individuel:

```powershell
# Front seulement
npm run dev:web

# API seulement
npm run dev:api
```

## 4) Vérifier que tout fonctionne

- Front: ouvrir http://localhost:5173
- API: ouvrir http://localhost:8000/health
  - "status": "ok" si toutes les dépendances sont installées
  - "status": "degraded" si des modules manquent (l'API reste utilisable partiellement)

## 5) Build de production (frontend)

```powershell
npm run build
```

Les fichiers sont produits dans `FRONT-END-ERP/FRONT-END-ERP/dist`.

## 6) Dépannage rapide

- Port déjà utilisé (5173/8000): fermer l'appli qui occupe le port ou changer de port (Vite/uvicorn options).
- Problèmes d'installation Python (`pip`):
  - Vérifier le réseau/proxy
  - Installer un paquet critique manuellement, ex:
    ```powershell
    cd C:\Users\Floop\Desktop\ERPWASHGO\BACK-END-ERP
    .\venv\Scripts\pip.exe install supabase fastapi uvicorn
    ```
- L'API ne démarre pas: tester localement l'import minimal
  ```powershell
  cd C:\Users\Floop\Desktop\ERPWASHGO
  BACK-END-ERP\venv\Scripts\python.exe -c "import sys; sys.path.append('BACK-END-ERP'); import app.main as m; print(hasattr(m,'app'))"
  ```

## 7) Structure monorépo

- `BACK-END-ERP/` — API FastAPI (Python)
- `FRONT-END-ERP/FRONT-END-ERP/` — Front Vite React
- `package.json` (racine) — scripts et workspaces npm
- `.gitignore` (racine) — ignore global pour front/back

Bon démarrage !
