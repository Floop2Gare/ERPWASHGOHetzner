import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import ValidationError
from datetime import datetime
import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.schemas.erp import (
    ServiceCreate, ServiceUpdate, ERPResponse, ERPListResponse,
    ServiceOption
)
from app.db.session import get_db
from app.db.models import ServiceORM
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=ERPResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    db: Session = Depends(get_db)
):
    """Crée un nouveau service."""
    try:
        logger.info(f"Création d'un nouveau service: {service_data.name}")
        
        # Générer un ID unique côté serveur si absent
        new_id = service_data.id or str(uuid.uuid4())

        # Les timestamps created_at/updated_at sont maintenant gérés par les defaults du modèle ORM
        payload = {
            "id": new_id,
            "name": service_data.name,
            "description": service_data.description,
            "category": service_data.category,
            "active": service_data.active,
            "options": [option.model_dump() for option in service_data.options],
        }
        
        # Pour PostgreSQL, convertir l'ID string en UUID Python pour l'ORM
        # Détecter PostgreSQL depuis l'engine de la session
        import os
        from app.db.session import engine
        DB_DIALECT = os.getenv("DB_DIALECT", "").lower()
        if not DB_DIALECT:
            # Détecter depuis l'URL de l'engine
            engine_url = str(engine.url)
            if "postgresql" in engine_url.lower():
                DB_DIALECT = "postgresql"
            else:
                DATABASE_URL = os.getenv("DATABASE_URL", "")
                if DATABASE_URL and "postgresql" in DATABASE_URL.lower():
                    DB_DIALECT = "postgresql"
        if DB_DIALECT == "postgresql" and "id" in payload:
            try:
                payload["id"] = uuid.UUID(payload["id"])
            except (ValueError, AttributeError, TypeError):
                pass  # Si conversion impossible, garder tel quel

        service_orm = ServiceORM(**payload)
        db.add(service_orm)
        db.flush()
        logger.info(f"✅ Service créé avec succès: {new_id}")
        # Construire la réponse avec les données de l'ORM (incluant les timestamps)
        # Convertir l'ID UUID en string pour la réponse JSON
        service_id_str = str(service_orm.id) if service_orm.id else new_id
        response_data = {
            "id": service_id_str,
            "name": service_orm.name,
            "description": service_orm.description,
            "category": service_orm.category,
            "active": service_orm.active,
            "options": service_orm.options or [],
            "created_at": service_orm.created_at.isoformat() if service_orm.created_at else None,
            "updated_at": service_orm.updated_at.isoformat() if service_orm.updated_at else None,
        }
        return ERPResponse(success=True, data=response_data)
            
    except ValidationError as ve:
        logger.error(f"Erreur de validation: {ve}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Données invalides")
    except IntegrityError as ie:
        logger.error(f"Conflit d'unicité (name?): {ie}")
        raise HTTPException(status_code=409, detail="Conflit: données déjà existantes (name)")
    except Exception as e:
        logger.error(f"Erreur lors de la création du service: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/", response_model=ERPListResponse)
async def get_all_services(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    active_only: Optional[bool] = Query(False),
    db: Session = Depends(get_db)
):
    """Récupère tous les services avec pagination."""
    try:
        logger.info(f"Récupération des services (limit={limit}, offset={offset}, active_only={active_only})")
        stmt = select(ServiceORM)
        if active_only:
            stmt = stmt.where(ServiceORM.active.is_(True))
        rows = db.execute(
            stmt.order_by(ServiceORM.created_at.desc()).offset(offset).limit(limit)
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "category": r.category,
                "active": r.active,
                "options": r.options or [],
                "base_price": float(r.base_price) if r.base_price is not None else 0.0,
                "base_duration": r.base_duration,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} services récupérés")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des services: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{service_id}", response_model=ERPResponse)
async def get_service(
    service_id: str,
    db: Session = Depends(get_db)
):
    """Récupère un service par son ID."""
    try:
        logger.info(f"Récupération du service: {service_id}")
        r = db.get(ServiceORM, service_id)
        if r:
            data = {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "category": r.category,
                "active": r.active,
                "options": r.options or [],
                "base_price": float(r.base_price) if r.base_price is not None else 0.0,
                "base_duration": r.base_duration,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            logger.info(f"✅ Service trouvé: {service_id}")
            return ERPResponse(success=True, data=data)
        else:
            logger.warning(f"Service non trouvé: {service_id}")
            raise HTTPException(status_code=404, detail="Service non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du service {service_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.put("/{service_id}", response_model=ERPResponse)
async def update_service(
    service_id: str,
    service_data: ServiceUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour un service existant."""
    try:
        logger.info(f"Mise à jour du service: {service_id}")
        row = db.get(ServiceORM, service_id)
        if not row:
            raise HTTPException(status_code=404, detail="Service non trouvé")

        payload = service_data.model_dump(exclude_unset=True)
        if "options" in payload and payload["options"] is not None:
            payload["options"] = [o.model_dump() if hasattr(o, 'model_dump') else o for o in payload["options"]]
        for k, v in payload.items():
            setattr(row, k, v)
        row.updated_at = datetime.utcnow()
        logger.info(f"✅ Service mis à jour: {service_id}")
        return ERPResponse(success=True, data={"id": service_id})
            
    except HTTPException:
        raise
    except IntegrityError as ie:
        logger.error(f"Conflit d'unicité (name?): {ie}")
        raise HTTPException(status_code=409, detail="Conflit: données déjà existantes (name)")
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du service {service_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.delete("/{service_id}", response_model=ERPResponse)
async def delete_service(
    service_id: str,
    db: Session = Depends(get_db)
):
    """Supprime un service."""
    try:
        logger.info(f"Suppression du service: {service_id}")
        row = db.get(ServiceORM, service_id)
        if not row:
            raise HTTPException(status_code=404, detail="Service non trouvé")
        db.delete(row)
        logger.info(f"✅ Service supprimé: {service_id}")
        return ERPResponse(success=True, data={"id": service_id, "message": "Service supprimé avec succès"})
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du service {service_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/search/{search_term}", response_model=ERPListResponse)
async def search_services(
    search_term: str,
    db: Session = Depends(get_db)
):
    """Recherche des services par nom ou description."""
    try:
        logger.info(f"Recherche de services avec le terme: {search_term}")
        term = f"%{search_term}%"
        rows = db.execute(
            select(ServiceORM).where(
                sa.or_(
                    ServiceORM.name.ilike(term),
                    ServiceORM.description.ilike(term),
                )
            ).order_by(ServiceORM.created_at.desc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "category": r.category,
                "active": r.active,
                "options": r.options or [],
                "base_price": float(r.base_price) if r.base_price is not None else 0.0,
                "base_duration": r.base_duration,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} services trouvés pour '{search_term}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la recherche de services avec '{search_term}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/categories", response_model=ERPListResponse)
async def get_service_categories(
    db: Session = Depends(get_db)
):
    """Récupère toutes les catégories de services uniques."""
    try:
        logger.info("Récupération des catégories de services")
        rows = db.execute(sa.text("SELECT DISTINCT category FROM services WHERE category IS NOT NULL"))
        categories = sorted([r[0] for r in rows if r[0] is not None])
        logger.info(f"✅ {len(categories)} catégories trouvées")
        return ERPListResponse(success=True, data=categories, count=len(categories))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des catégories de services: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/category/{category}", response_model=ERPListResponse)
async def get_services_by_category(
    category: str,
    db: Session = Depends(get_db)
):
    """Récupère les services par catégorie."""
    try:
        logger.info(f"Récupération des services de la catégorie: {category}")
        rows = db.execute(
            select(ServiceORM).where(ServiceORM.category == category).order_by(ServiceORM.name.asc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "category": r.category,
                "active": r.active,
                "options": r.options or [],
                "base_price": float(r.base_price) if r.base_price is not None else 0.0,
                "base_duration": r.base_duration,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} services trouvés pour la catégorie '{category}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des services de la catégorie '{category}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")
