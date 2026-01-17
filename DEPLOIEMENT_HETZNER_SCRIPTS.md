# 🚀 Scripts PowerShell pour Déploiement Hetzner

**Guide rapide** : Transférer les fichiers secrets au serveur Hetzner

---

## 📋 Script de Transfert SCP (Windows PowerShell)

### Script `transfer-secrets-to-hetzner.ps1`

```powershell
# Configuration
$HETZNER_IP = "VOTRE_IP_HETZNER"  # Remplacer par votre IP Hetzner
$HETZNER_USER = "root"  # Ou votre utilisateur
$REMOTE_PATH = "/opt/erpwashgo"  # Chemin sur le serveur

# Couleurs pour les messages
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

Write-Info "🔐 Transfert des fichiers secrets vers Hetzner..."
Write-Info "IP du serveur: $HETZNER_IP"
Write-Info "Utilisateur: $HETZNER_USER"
Write-Info ""

# Vérifier que les fichiers existent
$files = @(
    "backend\credentials_adrien.json",
    "backend\credentials_clement.json",
    ".env"
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Error "❌ Fichier introuvable: $file"
    } else {
        Write-Info "✅ Fichier trouvé: $file"
    }
}

Write-Info ""
Write-Info "📤 Démarrage du transfert..."
Write-Info ""

# Transférer les fichiers credentials
Write-Info "Transfert de credentials_adrien.json..."
scp "backend\credentials_adrien.json" "${HETZNER_USER}@${HETZNER_IP}:${REMOTE_PATH}/backend/"

if ($LASTEXITCODE -eq 0) {
    Write-Success "✅ credentials_adrien.json transféré avec succès"
} else {
    Write-Error "❌ Erreur lors du transfert de credentials_adrien.json"
}

Write-Info "Transfert de credentials_clement.json..."
scp "backend\credentials_clement.json" "${HETZNER_USER}@${HETZNER_IP}:${REMOTE_PATH}/backend/"

if ($LASTEXITCODE -eq 0) {
    Write-Success "✅ credentials_clement.json transféré avec succès"
} else {
    Write-Error "❌ Erreur lors du transfert de credentials_clement.json"
}

# Transférer le fichier .env
if (Test-Path ".env") {
    Write-Info "Transfert de .env..."
    scp ".env" "${HETZNER_USER}@${HETZNER_IP}:${REMOTE_PATH}/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ .env transféré avec succès"
    } else {
        Write-Error "❌ Erreur lors du transfert de .env"
    }
} else {
    Write-Info "⚠️  Fichier .env non trouvé (optionnel)"
}

Write-Info ""
Write-Info "🔒 Définition des permissions sur le serveur..."
Write-Info ""

# Définir les permissions via SSH
$sshCommands = @(
    "chmod 600 ${REMOTE_PATH}/backend/credentials_adrien.json",
    "chmod 600 ${REMOTE_PATH}/backend/credentials_clement.json",
    "if [ -f ${REMOTE_PATH}/.env ]; then chmod 600 ${REMOTE_PATH}/.env; fi"
)

$commands = $sshCommands -join " && "
ssh "${HETZNER_USER}@${HETZNER_IP}" $commands

if ($LASTEXITCODE -eq 0) {
    Write-Success "✅ Permissions définies avec succès"
} else {
    Write-Error "❌ Erreur lors de la définition des permissions"
}

Write-Info ""
Write-Success "✅ Transfert terminé !"
Write-Info ""
Write-Info "📋 Prochaines étapes :"
Write-Info "1. Vérifier les fichiers sur le serveur : ssh ${HETZNER_USER}@${HETZNER_IP}"
Write-Info "2. Lancer Docker Compose : docker-compose -f docker-compose.prod.yml up -d"
```

### Utilisation

1. **Éditer le script** : Remplacer `VOTRE_IP_HETZNER` par votre IP Hetzner
2. **Exécuter le script** :
   ```powershell
   .\transfer-secrets-to-hetzner.ps1
   ```

---

## 🔧 Script de Vérification (Post-Déploiement)

### Script `verify-hetzner-secrets.ps1`

```powershell
# Configuration
$HETZNER_IP = "VOTRE_IP_HETZNER"
$HETZNER_USER = "root"
$REMOTE_PATH = "/opt/erpwashgo"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

Write-Info "🔍 Vérification des fichiers secrets sur Hetzner..."
Write-Info ""

# Vérifier l'existence des fichiers
$files = @(
    "${REMOTE_PATH}/backend/credentials_adrien.json",
    "${REMOTE_PATH}/backend/credentials_clement.json",
    "${REMOTE_PATH}/.env"
)

foreach ($file in $files) {
    $result = ssh "${HETZNER_USER}@${HETZNER_IP}" "test -f $file && echo 'EXISTS' || echo 'NOT_FOUND'"
    
    if ($result -match "EXISTS") {
        Write-Success "✅ $file existe"
        
        # Vérifier les permissions
        $perms = ssh "${HETZNER_USER}@${HETZNER_IP}" "stat -c '%a' $file 2>/dev/null || stat -f '%A' $file 2>/dev/null"
        if ($perms -match "600") {
            Write-Success "   Permissions OK: $perms"
        } else {
            Write-Error "   ⚠️  Permissions incorrectes: $perms (devrait être 600)"
        }
    } else {
        Write-Error "❌ $file n'existe pas"
    }
}

Write-Info ""
Write-Info "✅ Vérification terminée"
```

---

## 📝 Notes Importantes

1. **SSH doit être configuré** sur Windows (OpenSSH Client)
2. **Les fichiers ne doivent PAS être trackés par Git** (vérifier avec `git ls-files`)
3. **Les permissions 600** sont essentielles pour la sécurité
4. **Utiliser WinSCP** si SCP ne fonctionne pas (interface graphique)

---

## 🆘 Dépannage

### Erreur "scp: command not found"

**Solution** : Installer OpenSSH Client sur Windows
```powershell
# Dans PowerShell (Admin)
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

### Erreur "Permission denied"

**Solution** : Vérifier les clés SSH ou utiliser un mot de passe
```powershell
# Tester la connexion SSH
ssh ${HETZNER_USER}@${HETZNER_IP}
```

### Utiliser WinSCP (Alternative)

1. Télécharger WinSCP : https://winscp.net/
2. Se connecter au serveur Hetzner
3. Glisser-déposer les fichiers `credentials_*.json` et `.env`
4. Clic droit > Properties > Permissions > 600

---

**✅ Vous êtes prêt pour un déploiement sécurisé ! 🚀**
