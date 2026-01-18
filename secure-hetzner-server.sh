#!/bin/bash
# Script de sécurisation du serveur Hetzner
# À exécuter sur le serveur

set -e

echo "=== Configuration de la sécurité du serveur ==="

# 1. Installation des outils de sécurité
echo "1. Installation des outils de sécurité..."
apt-get update
apt-get install -y ufw fail2ban unattended-upgrades

# 2. Configuration du firewall UFW
echo "2. Configuration du firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Autoriser SSH (important de ne pas se bloquer !)
ufw allow 22/tcp comment 'SSH'

# Autoriser HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 5173/tcp comment 'Frontend HTTPS'

# Autoriser le backend (optionnel, peut être restreint)
ufw allow 8000/tcp comment 'Backend API'

# Activer le firewall
ufw --force enable

# 3. Configuration Fail2ban
echo "3. Configuration Fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = root@localhost
sendername = Fail2Ban
action = %(action_)s

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# 4. Configuration des mises à jour automatiques de sécurité
echo "4. Configuration des mises à jour automatiques..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
EOF

# 5. Sécurisation SSH
echo "5. Sécurisation SSH..."
if ! grep -q "PermitRootLogin prohibit-password" /etc/ssh/sshd_config; then
    sed -i 's/#PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
fi
if ! grep -q "PasswordAuthentication no" /etc/ssh/sshd_config; then
    sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
fi
if ! grep -q "PubkeyAuthentication yes" /etc/ssh/sshd_config; then
    sed -i 's/#PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
fi

systemctl restart sshd

# 6. Configuration des limites système
echo "6. Configuration des limites système..."
cat >> /etc/security/limits.conf <<EOF
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
EOF

# 7. Désactivation des services inutiles
echo "7. Désactivation des services inutiles..."
systemctl disable snapd 2>/dev/null || true
systemctl stop snapd 2>/dev/null || true

echo ""
echo "=== Sécurisation terminée ==="
echo "Firewall: $(ufw status | head -1)"
echo "Fail2ban: $(systemctl is-active fail2ban)"
echo ""
echo "IMPORTANT: Vérifiez que vous pouvez toujours vous connecter en SSH !"
