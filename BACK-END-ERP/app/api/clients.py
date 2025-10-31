import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import ValidationError
from datetime import datetime
from sqlalchemy import select, update as sa_update, delete as sa_delete
import sqlalchemy as sa
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.db.models import ClientORM
from app.schemas.erp import (
    ClientCreate, ClientUpdate, ERPResponse, ERPListResponse,
    Contact
)
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

def _to_db_dict(client_data: ClientCreate, client_id: str) -> dict:
    return {
        "id": client_id,
        "type": client_data.type.value,
        "name": client_data.name,
        "company_name": client_data.companyName,
        "first_name": client_data.firstName,
        "last_name": client_data.lastName,
        "siret": client_data.siret,
        "email": client_data.email,
        "phone": client_data.phone,
        "address": client_data.address,
        "city": client_data.city,
        "status": client_data.status.value,
        "tags": client_data.tags,
        "last_service": client_data.lastService,
        "contacts": [contact.model_dump() for contact in client_data.contacts],
    }

@router.post("/", response_model=ERPResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=ERPResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db)
):
    """Crée un nouveau client."""
    try:
        logger.info(f"Création d'un nouveau client: {client_data.name}")
        
        client_id = client_data.id or str(uuid.uuid4())
        payload = _to_db_dict(client_data, client_id)

        db.add(ClientORM(**payload))
        logger.info(f"✅ Client créé avec succès: {client_id}")
        return ERPResponse(success=True, data=payload)
            
    except ValidationError as ve:
        logger.error(f"Erreur de validation: {ve}")
        return ERPResponse(success=False, error=f"Données invalides: {str(ve)}")
    except IntegrityError as ie:
        logger.error(f"Conflit d'unicité (email?): {ie}")
        raise HTTPException(status_code=409, detail="Conflit: données déjà existantes (email)")
    except Exception as e:
        logger.error(f"Erreur lors de la création du client: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/", response_model=ERPListResponse)
@router.get("", response_model=ERPListResponse)
async def get_all_clients(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Récupère tous les clients avec pagination."""
    try:
        logger.info(f"Récupération des clients (limit={limit}, offset={offset})")
        
        rows = db.execute(
            select(ClientORM).order_by(ClientORM.created_at.desc()).offset(offset).limit(limit)
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "type": r.type,
                "name": r.name,
                "company_name": r.company_name,
                "first_name": r.first_name,
                "last_name": r.last_name,
                "siret": r.siret,
                "email": r.email,
                "phone": r.phone,
                "address": r.address,
                "city": r.city,
                "status": r.status,
                "tags": r.tags or [],
                "last_service": r.last_service,
                "contacts": r.contacts or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} clients récupérés")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des clients: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{client_id}", response_model=ERPResponse)
async def get_client(
    client_id: str, 
    db: Session = Depends(get_db)
):
    """Récupère un client par son ID."""
    try:
        logger.info(f"Récupération du client: {client_id}")
        
        r = db.get(ClientORM, client_id)
        if r:
            data = {
                "id": r.id,
                "type": r.type,
                "name": r.name,
                "company_name": r.company_name,
                "first_name": r.first_name,
                "last_name": r.last_name,
                "siret": r.siret,
                "email": r.email,
                "phone": r.phone,
                "address": r.address,
                "city": r.city,
                "status": r.status,
                "tags": r.tags or [],
                "last_service": r.last_service,
                "contacts": r.contacts or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            logger.info(f"✅ Client trouvé: {client_id}")
            return ERPResponse(success=True, data=data)
        else:
            logger.warning(f"Client non trouvé: {client_id}")
            raise HTTPException(status_code=404, detail="Client non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du client {client_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.put("/{client_id}", response_model=ERPResponse)
async def update_client(
    client_id: str,
    client_data: ClientUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour un client existant."""
    try:
        logger.info(f"Mise à jour du client: {client_id}")
        
        db_row = db.get(ClientORM, client_id)
        if not db_row:
            raise HTTPException(status_code=404, detail="Client non trouvé")

        payload = client_data.model_dump(exclude_unset=True)
        if "type" in payload and hasattr(payload["type"], "value"):
            payload["type"] = payload["type"].value
        if "status" in payload and hasattr(payload["status"], "value"):
            payload["status"] = payload["status"].value
        if "contacts" in payload:
            payload["contacts"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in payload["contacts"]]

        # mapping camelCase -> snake_case
        mapping = {
            'companyName': 'company_name',
            'firstName': 'first_name',
            'lastName': 'last_name',
            'lastService': 'last_service',
        }
        for k, v in payload.items():
            setattr(db_row, mapping.get(k, k), v)
        db_row.updated_at = datetime.utcnow()
        logger.info(f"✅ Client mis à jour: {client_id}")
        return ERPResponse(success=True, data={"id": client_id})
            
    except HTTPException:
        raise
    except IntegrityError as ie:
        logger.error(f"Conflit d'unicité (email?): {ie}")
        raise HTTPException(status_code=409, detail="Conflit: données déjà existantes (email)")
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du client {client_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.delete("/{client_id}", response_model=ERPResponse)
async def delete_client(
    client_id: str,
    db: Session = Depends(get_db)
):
    """Supprime un client."""
    try:
        logger.info(f"Suppression du client: {client_id}")
        
        r = db.get(ClientORM, client_id)
        if not r:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        db.delete(r)
        logger.info(f"✅ Client supprimé: {client_id}")
        return ERPResponse(success=True, data={"id": client_id, "message": "Client supprimé avec succès"})
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du client {client_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/search/{search_term}", response_model=ERPListResponse)
async def search_clients(
    search_term: str,
    db: Session = Depends(get_db)
):
    """Recherche des clients par nom, email ou téléphone."""
    try:
        logger.info(f"Recherche de clients avec le terme: {search_term}")
        
        term = f"%{search_term}%"
        rows = db.execute(
            select(ClientORM)
            .where(
                sa.or_(
                    ClientORM.name.ilike(term),
                    ClientORM.email.ilike(term),
                    ClientORM.phone.ilike(term),
                )
            )
            .order_by(ClientORM.created_at.desc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "type": r.type,
                "name": r.name,
                "company_name": r.company_name,
                "first_name": r.first_name,
                "last_name": r.last_name,
                "siret": r.siret,
                "email": r.email,
                "phone": r.phone,
                "address": r.address,
                "city": r.city,
                "status": r.status,
                "tags": r.tags or [],
                "last_service": r.last_service,
                "contacts": r.contacts or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} clients trouvés pour '{search_term}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la recherche de clients avec '{search_term}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/status/{status}", response_model=ERPListResponse)
async def get_clients_by_status(
    status: str,
    db: Session = Depends(get_db)
):
    """Récupère les clients par statut."""
    try:
        logger.info(f"Récupération des clients avec le statut: {status}")
        
        rows = db.execute(
            select(ClientORM).where(ClientORM.status == status).order_by(ClientORM.created_at.desc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "type": r.type,
                "name": r.name,
                "company_name": r.company_name,
                "first_name": r.first_name,
                "last_name": r.last_name,
                "siret": r.siret,
                "email": r.email,
                "phone": r.phone,
                "address": r.address,
                "city": r.city,
                "status": r.status,
                "tags": r.tags or [],
                "last_service": r.last_service,
                "contacts": r.contacts or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} clients trouvés avec le statut '{status}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des clients avec le statut '{status}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")
