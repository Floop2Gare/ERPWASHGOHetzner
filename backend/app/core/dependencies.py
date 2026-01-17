"""
Dépendances FastAPI pour l'authentification
"""

from fastapi import Depends, HTTPException, Header, status, Request
from typing import Optional, List, Dict, Any
from app.core.security import decode_access_token
import os
import psycopg


def get_db_connection():
    """Connexion à la base de données"""
    from app.core.config import settings
    dsn = os.getenv("DATABASE_URL", settings.DATABASE_URL)
    return psycopg.connect(dsn, autocommit=True)


async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Dépendance FastAPI pour récupérer l'utilisateur actuellement authentifié.
    Récupère les données complètes de l'utilisateur depuis la base de données.
    
    Priorité pour companyId:
    1. Header X-Active-Company-Id (entreprise active sélectionnée par l'utilisateur)
    2. companyId de l'utilisateur dans la base de données
    
    Utilisation: 
        @app.get("/protected")
        def protected_route(current_user: dict = Depends(get_current_user)):
            ...
    """
    # Récupérer le header Authorization directement depuis la requête
    authorization = request.headers.get("Authorization") or request.headers.get("authorization")
    
    # Debug: afficher ce qui est reçu
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"[get_current_user] Authorization header reçu: {authorization is not None}, valeur: {authorization[:50] if authorization else 'None'}...")
    logger.warning(f"[get_current_user] Tous les headers: {dict(request.headers)}")
    
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token manquant",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extraire le token du header "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Format d'authentification invalide",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Format d'authentification invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Décoder le token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Récupérer l'ID de l'entreprise active depuis le header (priorité)
    active_company_id = request.headers.get("X-Active-Company-Id") or request.headers.get("x-active-company-id")
    
    # Récupérer l'utilisateur depuis la base de données
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT id, data FROM users WHERE id = %s;", (user_id,))
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )
            
            user_data = row[1]
            
            # Vérifier si l'utilisateur est actif
            if not user_data.get("active", True):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Compte désactivé",
                )
            
            # Déterminer le companyId à utiliser
            # Priorité: 1) Header X-Active-Company-Id, 2) companyId de l'utilisateur
            user_company_id = user_data.get("companyId")
            final_company_id = active_company_id if active_company_id else user_company_id
            
            # Retourner les données complètes de l'utilisateur
            return {
                "id": row[0],
                "username": user_data.get("username", ""),
                "fullName": user_data.get("fullName", ""),
                "role": user_data.get("role", "agent"),
                "active": user_data.get("active", True),
                "pages": user_data.get("pages", []),
                "permissions": user_data.get("permissions", []),
                "companyId": final_company_id,  # Utiliser le companyId déterminé
                "profile": user_data.get("profile", {}),
                "notificationPreferences": user_data.get("notificationPreferences", {}),
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Auth] Erreur lors de la récupération de l'utilisateur: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération de l'utilisateur",
        )


def require_role(allowed_roles: List[str]):
    """
    Dépendance pour vérifier que l'utilisateur a un des rôles autorisés.
    
    Utilisation:
        @app.post("/admin-only")
        def admin_route(current_user: dict = Depends(require_role(["superAdmin", "admin"]))):
            ...
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès refusé. Rôles autorisés: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker


def verify_company_access(user_id: str, company_id: str) -> bool:
    """
    Vérifie qu'un utilisateur a accès à une entreprise.
    Pour l'instant, vérifie si l'utilisateur a cette entreprise dans son companyId.
    Plus tard, on pourra ajouter une table de liaison pour multi-entreprises.
    
    Args:
        user_id: ID de l'utilisateur
        company_id: ID de l'entreprise à vérifier
    
    Returns:
        True si l'utilisateur a accès, False sinon
    """
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Récupérer l'utilisateur
            cur.execute("SELECT data FROM users WHERE id = %s;", (user_id,))
            user_row = cur.fetchone()
            if not user_row:
                return False
            
            user_data = user_row[0]
            user_company_id = user_data.get("companyId")
            
            # Vérifier si l'entreprise correspond
            if user_company_id == company_id:
                return True
            
            # Si l'utilisateur n'a pas de companyId (admin), vérifier que l'entreprise existe
            if user_company_id is None:
                cur.execute("SELECT id FROM companies WHERE id = %s;", (company_id,))
                return cur.fetchone() is not None
            
            return False
    except Exception as e:
        print(f"[verify_company_access] Erreur: {e}")
        return False

