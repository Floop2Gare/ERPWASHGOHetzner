# 📂 Architecture des Scripts PowerShell - ERP Wash&Go

**Explication** : Pourquoi il y a un dossier `scripts/` ET des scripts à la racine ?

---

## 🎯 Architecture en 2 Niveaux

Votre projet utilise une **architecture en 2 niveaux** pour faciliter l'utilisation :

### 📁 Niveau 1 : Racine du Projet (Scripts "Wrappers")

**Objectif** : Interface utilisateur **simple et rapide**

```
/ERPWASHGO/
├── start.ps1              ← Wrapper simple
├── stop.ps1               ← Wrapper simple
├── restart.ps1            ← Wrapper simple
├── update.ps1             ← Wrapper simple
├── rebuild.ps1            ← Wrapper simple
├── restart-frontend.ps1   ← Script spécial (mobile)
├── DEMARRER-ET-TESTER.ps1 ← Script spécial (test mobile)
└── setup-mobile-access.ps1 ← Script spécial (config mobile)
```

**Ces scripts sont des "raccourcis"** qui appellent les scripts dans `scripts/`

### 📁 Niveau 2 : Dossier `scripts/` (Scripts Détaillés)

**Objectif** : Logique centralisée et organisée par catégorie

```
/ERPWASHGO/scripts/
├── start/
│   ├── all.ps1          ← Script principal de démarrage
│   ├── backend.ps1      ← Démarrage backend uniquement
│   └── frontend.ps1     ← Démarrage frontend uniquement
├── restart/
│   ├── all.ps1          ← Redémarrage complet
│   ├── backend.ps1      ← Redémarrage backend uniquement
│   └── frontend.ps1     ← Redémarrage frontend uniquement
├── stop/
│   └── all.ps1          ← Arrêt complet
└── update/
    ├── quick.ps1        ← Mise à jour rapide (avec cache)
    └── rebuild.ps1      ← Reconstruction complète (sans cache)
```

---

## 🔍 Exemple : Comment ça Fonctionne

### Quand vous exécutez `.\start.ps1`

```powershell
# Fichier : start.ps1 (à la racine)
# Ligne 6-13

$scriptPath = Join-Path $PSScriptRoot 'scripts\start\all.ps1'
& $scriptPath  # ← Appelle scripts/start/all.ps1
```

**Flux d'exécution** :
```
Utilisateur tape : .\start.ps1
                ↓
          start.ps1 (racine)
                ↓
    scripts/start/all.ps1 (scripts/)
                ↓
       Logique complète ici
```

---

## ✅ Avantages de cette Architecture

### 1. **Facilité d'Utilisation pour l'Utilisateur**

**À la racine** : Commandes simples
```powershell
.\start.ps1      # ← Facile à retenir
.\stop.ps1       # ← Facile à retenir
.\restart.ps1    # ← Facile à retenir
```

**Dans `scripts/`** : Commandes détaillées (pour Auto ou usage avancé)
```powershell
.\scripts\start\backend.ps1   # ← Démarrer uniquement le backend
.\scripts\restart\frontend.ps1 # ← Redémarrer uniquement le frontend
```

### 2. **Organisation Claire**

- **Racine** : Point d'entrée principal (5 wrappers + 3 scripts spéciaux)
- **scripts/** : Logique organisée par catégorie (start, stop, restart, update)

### 3. **Pas de Duplication de Code**

Les scripts à la racine ne font **que** appeler les scripts dans `scripts/`.  
La logique complète est **centralisée** dans `scripts/`.

---

## 📋 Tableau des Correspondances

| Script Racine | Script Appelé (dans scripts/) | Description |
|---------------|-------------------------------|-------------|
| `start.ps1` | `scripts/start/all.ps1` | Démarrage complet |
| `stop.ps1` | `scripts/stop/all.ps1` | Arrêt complet |
| `restart.ps1` | `scripts/restart/all.ps1` | Redémarrage complet |
| `update.ps1` | `scripts/update/quick.ps1` | Mise à jour rapide |
| `rebuild.ps1` | `scripts/update/rebuild.ps1` | Reconstruction complète |

---

## 🔧 Scripts "Spéciaux" à la Racine

Ces scripts **ne sont PAS** des wrappers, mais des scripts uniques :

### 1. `setup-mobile-access.ps1`
- **Fonction** : Configure l'accès mobile (`.env.local`, firewall)
- **Usage** : Appelé par d'autres scripts ou manuellement
- **GARDER** ✅

### 2. `restart-frontend.ps1`
- **Fonction** : Redémarrage frontend **avec configuration mobile**
- **Différence avec `scripts/restart/frontend.ps1`** :
  - ✅ Plus complet (4 étapes)
  - ✅ Vérifie `.env.local`
  - ✅ Affiche IP locale pour mobile
  - ✅ Version "utilisateur" (mieux adaptée mobile)
- **GARDER** ✅

### 3. `DEMARRER-ET-TESTER.ps1`
- **Fonction** : Démarrage complet **avec tests** (mobile, firewall, health checks)
- **Usage** : Script de test/débogage complet
- **GARDER** ✅

---

## ❌ Fichier Redondant (Déjà Supprimé)

### `frontend-start.ps1` (Supprimé ✅)

**Problème** : Ce fichier était **écrasé à chaque exécution** de `start.ps1`

**Raison** : `scripts/start/all.ps1` le **re-génère dynamiquement** (ligne 37) :
```powershell
$frontendScript | Out-File -FilePath $scriptPath -Encoding UTF8
```

**Action** : Fichier supprimé (déjà fait lors d'un audit précédent)

---

## 📖 Comment Utiliser

### Pour l'Utilisateur Final (Recommandé)

**Utilisez les scripts à la racine** :
```powershell
.\start.ps1        # Démarrer tout
.\stop.ps1         # Arrêter tout
.\restart.ps1      # Redémarrer tout
.\update.ps1       # Mise à jour rapide
.\rebuild.ps1      # Reconstruction complète
```

### Pour les Scripts Automatisés ou Usage Avancé

**Utilisez les scripts dans `scripts/`** :
```powershell
.\scripts\start\backend.ps1        # Démarrer uniquement le backend
.\scripts\restart\frontend.ps1     # Redémarrer uniquement le frontend
.\scripts\update\rebuild.ps1       # Reconstruction (sans wrapper)
```

### Pour l'Accès Mobile

**Utilisez les scripts spéciaux** :
```powershell
.\DEMARRER-ET-TESTER.ps1      # Démarrage avec tests mobiles
.\restart-frontend.ps1        # Redémarrage frontend avec config mobile
.\setup-mobile-access.ps1     # Configuration manuelle de l'accès mobile
```

---

## 🎯 Résumé

### Pourquoi cette Organisation ?

1. **Racine** : Scripts simples pour **usage quotidien** (wrappers + scripts spéciaux)
2. **scripts/** : Logique **centralisée et organisée** par catégorie
3. **Avantage** : Facilité d'utilisation + organisation claire du code

### Est-ce que c'est une Duplication ?

**NON** ❌ Les scripts à la racine sont des **wrappers** qui appellent les scripts dans `scripts/`.  
Il n'y a **pas de duplication de logique**, seulement une **organisation en 2 niveaux**.

### Y a-t-il des Fichiers en Double ?

**OUI** ✅ Mais déjà corrigé :
- ❌ `frontend-start.ps1` : Supprimé (écrasé automatiquement)

**Les autres "doublons" apparents** :
- `restart-frontend.ps1` vs `scripts/restart/frontend.ps1` : **Deux versions différentes** (mobile vs simple)
- Scripts wrappers : **Architecture intentionnelle** (pas une duplication)

---

## ✅ Conclusion

**Votre architecture est correcte et bien pensée !** 🎉

- ✅ Scripts simples à la racine pour l'utilisateur
- ✅ Logique centralisée dans `scripts/`
- ✅ Pas de duplication de code
- ✅ Organisation claire par catégorie

**La seule action nécessaire** était de supprimer `frontend-start.ps1` (déjà fait ✅).

---

**🎯 Vous pouvez continuer à utiliser vos scripts normalement !**
