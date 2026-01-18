#!/usr/bin/env python3
"""
Script pour créer un utilisateur admin unique par défaut directement dans la base de données
Supprime tous les autres utilisateurs et crée uniquement l'admin avec username: admin, password: admin1*
Usage: python create_admin_user.py
"""
import psycopg
import json
import os
import sys

# Ajouter le répertoire app au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.core.security import get_password_hash

# Configuration de la base de données depuis les variables d'environnement
def get_database_url():
    """Récupère l'URL de la base de données depuis les variables d'environnement"""
    return os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@postgres:5432/erp_washgo"
    )

def create_admin_user():
    """Crée l'utilisateur admin s'il n'existe pas (ne supprime PAS les autres utilisateurs)"""
    try:
        database_url = get_database_url()
        with psycopg.connect(database_url) as conn, conn.cursor() as cur:
            # Vérifier si l'admin existe déjà
            cur.execute("SELECT id FROM users WHERE data->>'username' = %s;", ('admin',))
            existing = cur.fetchone()
            
            # Créer l'utilisateur admin uniquement s'il n'existe pas
            admin_id = "admin-default-user"
            admin_data = {
                "id": admin_id,
                "username": "admin",
                "fullName": "Administrateur",
                "passwordHash": get_password_hash("admin1*"),
                "role": "superAdmin",
                "active": True,
                "pages": ["*"],
                "permissions": ["*"],
                "isDockerLinked": False,
                "profile": {
                    "id": "user-admin",
                    "firstName": "Admin",
                    "lastName": "",
                    "email": "",
                    "phone": "",
                    "role": "superAdmin",
                    "avatarUrl": None,
                    "password": "",
                    "emailSignatureHtml": "",
                    "emailSignatureUseDefault": True,
                    "emailSignatureUpdatedAt": "2025-01-01T00:00:00Z",
                },
                "notificationPreferences": {
                    "emailAlerts": True,
                    "internalAlerts": True,
                    "smsAlerts": False,
                },
                "companyId": None,
            }
            
            if existing:
                # Mettre à jour l'utilisateur existant
                cur.execute(
                    """
                    UPDATE users 
                    SET data = %s::jsonb, updated_at = NOW()
                    WHERE id = %s
                    RETURNING id;
                    """,
                    (psycopg.types.json.Json(admin_data), existing[0]),
                )
                result = (existing[0],)
                print("✅ Utilisateur admin existant mis à jour")
            else:
                # Créer le nouvel utilisateur admin
                cur.execute(
                    """
                    INSERT INTO users (id, data)
                    VALUES (%s, %s::jsonb)
                    RETURNING id;
                    """,
                    (admin_id, psycopg.types.json.Json(admin_data)),
                )
                result = cur.fetchone()
                print("✅ Utilisateur admin créé avec succès!")
            
            conn.commit()
            
            if result:
                # Compter le nombre total d'utilisateurs (incluant l'admin et les autres)
                cur.execute("SELECT COUNT(*) FROM users;")
                total_users = cur.fetchone()[0]
                
                print(f"✅ Vérification: {total_users} utilisateur(s) dans la base (incluant l'admin)")
                
                print(f"   ID: {result[0]}")
                print(f"   Username: admin")
                print(f"   Password: admin1*")
                print(f"   Role: superAdmin")
                return result[0]
            else:
                print("❌ Erreur lors de la création de l'utilisateur admin")
                return None
                
    except Exception as e:
        print(f"❌ Erreur lors de la création de l'admin: {e}")
        import traceback
        traceback.print_exc()
        return None

# Alias pour compatibilité avec l'ancien code
def create_superadmin_user():
    """Alias pour create_admin_user() pour compatibilité"""
    return create_admin_user()

if __name__ == "__main__":
    create_admin_user()

