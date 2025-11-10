import logging
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import uuid
import hashlib
from app.db.session import get_db
from app.db.models import UserORM
from app.schemas.erp import (
    UserCreate, UserUpdate, UserPasswordUpdate, UserResponse,
    ERPResponse, ERPListResponse
)

# Détection du dialecte de base de données
DB_DIALECT = os.getenv("DB_DIALECT", "").lower()
if not DB_DIALECT:
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    if DATABASE_URL and "postgresql" in DATABASE_URL.lower():
        DB_DIALECT = "postgresql"
    else:
        DB_DIALECT = "sqlite"

router = APIRouter()
logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash un mot de passe avec SHA-256 (simple, pour production utiliser bcrypt)."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    """Vérifie un mot de passe."""
    return hash_password(password) == password_hash


@router.post("/", response_model=ERPResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Crée un nouvel utilisateur."""
    try:
        logger.info(f"Création d'un nouvel utilisateur: {user_data.username}")
        
        # Vérifier si l'utilisateur existe déjà
        existing_user = db.execute(
            select(UserORM).where(UserORM.username == user_data.username)
        ).scalar_one_or_none()
        
        if existing_user:
            return ERPResponse(
                success=False,
                error=f"Un utilisateur avec le nom '{user_data.username}' existe déjà"
            )
        
        # Générer un ID
        if DB_DIALECT == "postgresql":
            user_id = str(uuid.uuid4())
        else:
            user_id = str(uuid.uuid4())
        
        # Hasher le mot de passe
        password_hash = hash_password(user_data.password)
        
        # Créer l'utilisateur
        new_user = UserORM(
            id=user_id,
            username=user_data.username,
            full_name=user_data.full_name or user_data.username,
            password_hash=password_hash,
            role=user_data.role,
            pages=user_data.pages or ["*"],
            permissions=user_data.permissions or ["*"],
            active=user_data.active
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"Utilisateur créé avec succès: {user_data.username} (ID: {user_id})")
        
        return ERPResponse(
            success=True,
            data={
                "id": new_user.id,
                "username": new_user.username,
                "full_name": new_user.full_name,
                "role": new_user.role,
                "pages": new_user.pages if isinstance(new_user.pages, list) else [],
                "permissions": new_user.permissions if isinstance(new_user.permissions, list) else [],
                "active": new_user.active,
                "created_at": new_user.created_at.isoformat() if new_user.created_at else None,
                "updated_at": new_user.updated_at.isoformat() if new_user.updated_at else None,
            }
        )
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Erreur d'intégrité lors de la création de l'utilisateur: {e}")
        return ERPResponse(
            success=False,
            error=f"Erreur: un utilisateur avec ce nom existe peut-être déjà"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la création de l'utilisateur: {e}")
        return ERPResponse(
            success=False,
            error=f"Erreur serveur: {str(e)}"
        )


@router.get("/", response_model=ERPListResponse)
async def get_all_users(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    active_only: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Récupère tous les utilisateurs avec pagination."""
    try:
        logger.info(f"Récupération des utilisateurs (limit={limit}, offset={offset})")
        
        stmt = select(UserORM)
        if active_only is True:
            stmt = stmt.where(UserORM.active.is_(True))
        elif active_only is False:
            stmt = stmt.where(UserORM.active.is_(False))
        
        rows = db.execute(
            stmt.order_by(UserORM.created_at.desc()).offset(offset).limit(limit)
        ).scalars().all()
        
        data = []
        for r in rows:
            data.append({
                "id": r.id,
                "username": r.username,
                "full_name": r.full_name,
                "role": r.role,
                "pages": r.pages if isinstance(r.pages, list) else [],
                "permissions": r.permissions if isinstance(r.permissions, list) else [],
                "active": r.active,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            })
        
        logger.info(f"{len(data)} utilisateurs récupérés")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des utilisateurs: {e}")
        return ERPListResponse(
            success=False,
            error=f"Erreur serveur: {str(e)}"
        )


@router.get("/{user_id}", response_model=ERPResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Récupère un utilisateur par son ID."""
    try:
        user = db.execute(
            select(UserORM).where(UserORM.id == user_id)
        ).scalar_one_or_none()
        
        if not user:
            return ERPResponse(
                success=False,
                error=f"Utilisateur avec l'ID '{user_id}' non trouvé"
            )
        
        return ERPResponse(
            success=True,
            data={
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "pages": user.pages if isinstance(user.pages, list) else [],
                "permissions": user.permissions if isinstance(user.permissions, list) else [],
                "active": user.active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            }
        )
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'utilisateur: {e}")
        return ERPResponse(
            success=False,
            error=f"Erreur serveur: {str(e)}"
        )


@router.put("/{user_id}", response_model=ERPResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour un utilisateur."""
    try:
        user = db.execute(
            select(UserORM).where(UserORM.id == user_id)
        ).scalar_one_or_none()
        
        if not user:
            return ERPResponse(
                success=False,
                error=f"Utilisateur avec l'ID '{user_id}' non trouvé"
            )
        
        # Mettre à jour les champs
        if user_data.username is not None:
            # Vérifier que le nouveau username n'existe pas déjà
            existing = db.execute(
                select(UserORM).where(
                    UserORM.username == user_data.username,
                    UserORM.id != user_id
                )
            ).scalar_one_or_none()
            if existing:
                return ERPResponse(
                    success=False,
                    error=f"Un utilisateur avec le nom '{user_data.username}' existe déjà"
                )
            user.username = user_data.username
        
        if user_data.full_name is not None:
            user.full_name = user_data.full_name
        
        if user_data.role is not None:
            user.role = user_data.role
        
        if user_data.pages is not None:
            user.pages = user_data.pages
        
        if user_data.permissions is not None:
            user.permissions = user_data.permissions
        
        if user_data.active is not None:
            user.active = user_data.active
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"Utilisateur mis à jour: {user.username} (ID: {user_id})")
        
        return ERPResponse(
            success=True,
            data={
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "pages": user.pages if isinstance(user.pages, list) else [],
                "permissions": user.permissions if isinstance(user.permissions, list) else [],
                "active": user.active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            }
        )
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Erreur d'intégrité lors de la mise à jour: {e}")
        return ERPResponse(
            success=False,
            error=f"Erreur: un utilisateur avec ce nom existe peut-être déjà"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la mise à jour de l'utilisateur: {e}")
        return ERPResponse(
            success=False,
            error=f"Erreur serveur: {str(e)}"
        )


@router.patch("/{user_id}/password", response_model=ERPResponse)
async def update_user_password(
    user_id: str,
    password_data: UserPasswordUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour le mot de passe d'un utilisateur."""
    try:
        user = db.execute(
            select(UserORM).where(UserORM.id == user_id)
        ).scalar_one_or_none()
        
        if not user:
            return ERPResponse(
                success=False,
                error=f"Utilisateur avec l'ID '{user_id}' non trouvé"
            )
        
        # Hasher le nouveau mot de passe
        user.password_hash = hash_password(password_data.password)
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"Mot de passe mis à jour pour l'utilisateur: {user.username} (ID: {user_id})")
        
        return ERPResponse(
            success=True,
            data={"message": "Mot de passe mis à jour avec succès"}
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la mise à jour du mot de passe: {e}")
        return ERPResponse(
            success=False,
            error=f"Erreur serveur: {str(e)}"
        )


@router.patch("/{user_id}/toggle-active", response_model=ERPResponse)
async def toggle_user_active(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Active ou désactive un utilisateur."""
    try:
        user = db.execute(
            select(UserORM).where(UserORM.id == user_id)
        ).scalar_one_or_none()
        
        if not user:
            return ERPResponse(
                success=False,
                error=f"Utilisateur avec l'ID '{user_id}' non trouvé"
            )
        
        user.active = not user.active
        db.commit()
        db.refresh(user)
        
        status_text = "activé" if user.active else "désactivé"
        logger.info(f"Utilisateur {status_text}: {user.username} (ID: {user_id})")
        
        return ERPResponse(
            success=True,
            data={
                "id": user.id,
                "username": user.username,
                "active": user.active,
                "message": f"Utilisateur {status_text} avec succès"
            }
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors du changement d'état: {e}")
        return ERPResponse(
            success=False,
            error=f"Erreur serveur: {str(e)}"
        )


@router.delete("/{user_id}", response_model=ERPResponse)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Supprime un utilisateur."""
    try:
        logger.info(f"Suppression de l'utilisateur: {user_id}")
        
        user = db.execute(
            select(UserORM).where(UserORM.id == user_id)
        ).scalar_one_or_none()
        
        if not user:
            logger.warning(f"Utilisateur non trouvé pour suppression: {user_id}")
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        db.delete(user)
        db.commit()
        
        logger.info(f"Utilisateur supprimé: {user.username} (ID: {user_id})")
        
        return ERPResponse(
            success=True,
            data={
                "id": user_id,
                "message": "Utilisateur supprimé avec succès"
            }
        )
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la suppression de l'utilisateur {user_id}: {e}")
        return ERPResponse(
            success=False,
            error=f"Erreur serveur: {str(e)}"
        )
