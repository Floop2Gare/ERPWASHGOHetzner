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
    LeadCreate, LeadUpdate, ERPResponse, ERPListResponse,
    Activity
)
from app.db.session import get_db
from app.db.models import LeadORM, ClientORM
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

def _normalize_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return phone
    p = phone.replace(" ", "").replace("-", "").replace(".", "")
    if p.startswith("+"):
        return p
    if p.startswith("0"):
        return "+33" + p[1:]
    return p

@router.post("/", response_model=ERPResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=ERPResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db)
):
    """Crée un nouveau lead."""
    try:
        new_id = lead_data.id or str(uuid.uuid4())

        logger.info(f"Création d'un nouveau lead: {lead_data.name}")

        payload = {
            "id": new_id,
            "name": lead_data.name,
            "email": lead_data.email,
            "phone": _normalize_phone(lead_data.phone),
            "company": lead_data.company,
            "source": lead_data.source,
            "status": lead_data.status.value if getattr(lead_data, 'status', None) else None,
            "owner": lead_data.owner,
            "segment": lead_data.segment,
            "tags": lead_data.tags,
            "address": lead_data.address,
            "city": lead_data.city,
            "notes": lead_data.notes or {},
            "activities": [activity.model_dump() for activity in lead_data.activities],
        }
        db.add(LeadORM(**payload))
        logger.info(f"✅ Lead créé avec succès: {new_id}")
        return ERPResponse(success=True, data=payload)
            
    except ValidationError as ve:
        logger.error(f"Erreur de validation: {ve}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Données invalides")
    except IntegrityError as ie:
        logger.error(f"Conflit d'unicité (email?): {ie}")
        raise HTTPException(status_code=409, detail="Conflit: données déjà existantes (email)")
    except Exception as e:
        logger.error(f"Erreur lors de la création du lead: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/", response_model=ERPListResponse)
@router.get("", response_model=ERPListResponse)
async def get_all_leads(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Récupère tous les leads avec pagination."""
    try:
        logger.info(f"Récupération des leads (limit={limit}, offset={offset})")
        
        rows = db.execute(
            select(LeadORM).order_by(LeadORM.created_at.desc()).offset(offset).limit(limit)
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "company": r.company,
                "source": r.source,
                "status": r.status,
                "stage": r.stage,
                "interest_level": r.interest_level,
                "owner": r.owner,
                "segment": r.segment,
                "tags": r.tags or [],
                "address": r.address,
                "city": r.city,
                "notes": r.notes or {},
                "activities": r.activities or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} leads récupérés")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des leads: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{lead_id}", response_model=ERPResponse)
async def get_lead(
    lead_id: str,
    db: Session = Depends(get_db)
):
    """Récupère un lead par son ID."""
    try:
        logger.info(f"Récupération du lead: {lead_id}")
        
        r = db.get(LeadORM, lead_id)
        if r:
            data = {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "company": r.company,
                "source": r.source,
                "status": r.status,
                "stage": r.stage,
                "interest_level": r.interest_level,
                "owner": r.owner,
                "segment": r.segment,
                "tags": r.tags or [],
                "address": r.address,
                "city": r.city,
                "notes": r.notes or {},
                "activities": r.activities or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            logger.info(f"✅ Lead trouvé: {lead_id}")
            return ERPResponse(success=True, data=data)
        else:
            logger.warning(f"Lead non trouvé: {lead_id}")
            raise HTTPException(status_code=404, detail="Lead non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du lead {lead_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.put("/{lead_id}", response_model=ERPResponse)
async def update_lead(
    lead_id: str,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour un lead existant."""
    try:
        logger.info(f"Mise à jour du lead: {lead_id}")
        
        row = db.get(LeadORM, lead_id)
        if not row:
            raise HTTPException(status_code=404, detail="Lead non trouvé")

        payload = lead_data.model_dump(exclude_unset=True)
        if "status" in payload and hasattr(payload["status"], "value"):
            payload["status"] = payload["status"].value
        if "phone" in payload:
            payload["phone"] = _normalize_phone(payload["phone"]) if payload["phone"] is not None else None
        if "activities" in payload and payload["activities"] is not None:
            payload["activities"] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in payload["activities"]]
        for k, v in payload.items():
            setattr(row, k, v)
        row.updated_at = datetime.utcnow()
        logger.info(f"✅ Lead mis à jour: {lead_id}")
        return ERPResponse(success=True, data={"id": lead_id})
            
    except HTTPException:
        raise
    except IntegrityError as ie:
        logger.error(f"Conflit d'unicité/FK lors de la mise à jour du lead {lead_id}: {ie}")
        raise HTTPException(status_code=409, detail="Conflit d'intégrité")
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du lead {lead_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.delete("/{lead_id}", response_model=ERPResponse)
async def delete_lead(
    lead_id: str,
    db: Session = Depends(get_db)
):
    """Supprime un lead."""
    try:
        logger.info(f"Suppression du lead: {lead_id}")
        
        r = db.get(LeadORM, lead_id)
        if not r:
            logger.warning(f"Lead non trouvé pour suppression: {lead_id}")
            raise HTTPException(status_code=404, detail="Lead non trouvé")
        db.delete(r)
        logger.info(f"✅ Lead supprimé: {lead_id}")
        return ERPResponse(success=True, data={"id": lead_id, "message": "Lead supprimé avec succès"})
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du lead {lead_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/search/{search_term}", response_model=ERPListResponse)
async def search_leads(
    search_term: str,
    db: Session = Depends(get_db)
):
    """Recherche des leads par nom, email, téléphone ou entreprise."""
    try:
        logger.info(f"Recherche de leads avec le terme: {search_term}")
        
        term = f"%{search_term}%"
        rows = db.execute(
            select(LeadORM).where(
                sa.or_(
                    LeadORM.name.ilike(term),
                    LeadORM.email.ilike(term),
                    LeadORM.phone.ilike(term),
                    LeadORM.company.ilike(term),
                )
            ).order_by(LeadORM.created_at.desc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "company": r.company,
                "source": r.source,
                "status": r.status,
                "stage": r.stage,
                "interest_level": r.interest_level,
                "owner": r.owner,
                "segment": r.segment,
                "tags": r.tags or [],
                "address": r.address,
                "city": r.city,
                "notes": r.notes or {},
                "activities": r.activities or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} leads trouvés pour '{search_term}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la recherche de leads avec '{search_term}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/status/{status}", response_model=ERPListResponse)
async def get_leads_by_status(
    status: str,
    db: Session = Depends(get_db)
):
    """Récupère les leads par statut."""
    try:
        logger.info(f"Récupération des leads avec le statut: {status}")
        
        rows = db.execute(
            select(LeadORM).where(LeadORM.status == status).order_by(LeadORM.created_at.desc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "company": r.company,
                "source": r.source,
                "status": r.status,
                "stage": r.stage,
                "interest_level": r.interest_level,
                "owner": r.owner,
                "segment": r.segment,
                "tags": r.tags or [],
                "address": r.address,
                "city": r.city,
                "notes": r.notes or {},
                "activities": r.activities or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} leads trouvés avec le statut '{status}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des leads avec le statut '{status}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/owner/{owner}", response_model=ERPListResponse)
async def get_leads_by_owner(
    owner: str,
    db: Session = Depends(get_db)
):
    """Récupère les leads par propriétaire."""
    try:
        logger.info(f"Récupération des leads du propriétaire: {owner}")
        
        rows = db.execute(
            select(LeadORM).where(LeadORM.owner == owner).order_by(LeadORM.created_at.desc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "company": r.company,
                "source": r.source,
                "status": r.status,
                "stage": r.stage,
                "interest_level": r.interest_level,
                "owner": r.owner,
                "segment": r.segment,
                "tags": r.tags or [],
                "address": r.address,
                "city": r.city,
                "notes": r.notes or {},
                "activities": r.activities or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} leads trouvés pour le propriétaire '{owner}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des leads du propriétaire '{owner}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/source/{source}", response_model=ERPListResponse)
async def get_leads_by_source(
    source: str,
    db: Session = Depends(get_db)
):
    """Récupère les leads par source."""
    try:
        logger.info(f"Récupération des leads de la source: {source}")
        
        rows = db.execute(
            select(LeadORM).where(LeadORM.source == source).order_by(LeadORM.created_at.desc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "company": r.company,
                "source": r.source,
                "status": r.status,
                "stage": r.stage,
                "interest_level": r.interest_level,
                "owner": r.owner,
                "segment": r.segment,
                "tags": r.tags or [],
                "address": r.address,
                "city": r.city,
                "notes": r.notes or {},
                "activities": r.activities or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} leads trouvés pour la source '{source}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des leads de la source '{source}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.post("/{lead_id}/convert", response_model=ERPResponse)
async def convert_lead_to_client(
    lead_id: str,
    db: Session = Depends(get_db)
):
    """Convertit un lead en client (implémentation ORM, sans Supabase)."""
    try:
        logger.info(f"Conversion du lead en client: {lead_id}")

        lead = db.get(LeadORM, lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead non trouvé")

        client_id = str(uuid.uuid4())
        client_dict = {
            "id": client_id,
            "type": "company" if lead.company else "individual",
            "name": lead.name,
            "company_name": lead.company,
            "email": lead.email,
            "phone": lead.phone,
            "address": lead.address,
            "city": lead.city,
            "status": "Actif",
            "tags": lead.tags or [],
            "contacts": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        db.add(ClientORM(**client_dict))

        # Mettre à jour le statut du lead
        lead.status = "Converti"
        lead.updated_at = datetime.utcnow()

        logger.info(f"✅ Lead converti en client: {lead_id} -> {client_id}")
        return ERPResponse(success=True, data={
            "lead_id": lead_id,
            "client_id": client_id,
            "message": "Lead converti en client avec succès"
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la conversion du lead {lead_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")
