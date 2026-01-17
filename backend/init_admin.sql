-- Script SQL pour créer l'utilisateur admin unique directement dans la base de données
-- Usage: docker exec -i erp_postgres psql -U postgres -d erp_washgo < init_admin.sql
-- ATTENTION: Ce script supprime TOUS les utilisateurs existants et crée uniquement l'admin

-- Supprimer TOUS les utilisateurs existants
DELETE FROM users;

-- Créer l'utilisateur admin unique avec toutes les permissions
-- Mot de passe: admin1* (hash bcrypt)
-- NOTE: Le hash sera généré automatiquement par le script Python create_admin_user.py
-- Pour générer manuellement le hash: python -c "import sys; sys.path.insert(0, 'app'); from app.core.security import get_password_hash; print(get_password_hash('admin1*'))"
-- Le hash ci-dessous est un exemple et sera remplacé par le script Python au démarrage
INSERT INTO users (id, data) VALUES (
  'admin-default-user',
  '{
    "id": "admin-default-user",
    "username": "admin",
    "fullName": "Administrateur",
    "passwordHash": "$2b$12$m2JbzsvXEwEEIBkkjGRHsuxUnUpFv9fv4M1GW.5L5yY/i9aMu7RdW",
    "role": "superAdmin",
    "active": true,
    "pages": ["*"],
    "permissions": ["*"],
    "isDockerLinked": false,
    "profile": {
      "id": "user-admin",
      "firstName": "Admin",
      "lastName": "",
      "email": "",
      "phone": "",
      "role": "superAdmin",
      "avatarUrl": null,
      "password": "",
      "emailSignatureHtml": "",
      "emailSignatureUseDefault": true,
      "emailSignatureUpdatedAt": "2025-01-01T00:00:00Z"
    },
    "notificationPreferences": {
      "emailAlerts": true,
      "internalAlerts": true,
      "smsAlerts": false
    },
    "companyId": null
  }'::jsonb
);

-- Vérifier qu'il n'y a qu'un seul utilisateur
SELECT COUNT(*) as total_users FROM users;

-- Vérifier que l'utilisateur admin a été créé
SELECT id, data->>'username' as username, data->>'role' as role, data->>'active' as active 
FROM users 
WHERE data->>'username' = 'admin';

