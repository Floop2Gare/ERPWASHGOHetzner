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
    CompanyCreate, CompanyUpdate, ERPResponse, ERPListResponse
)
from app.db.session import get_db
from app.db.models import CompanyORM, ClientORM, AppointmentORM, ServiceORM
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=ERPResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    db: Session = Depends(get_db)
):
    """Crée une nouvelle entreprise."""
    try:
        new_id = company_data.id or str(uuid.uuid4())

        logger.info(f"Création d'une nouvelle entreprise: {company_data.name}")

        # Les timestamps created_at/updated_at sont maintenant gérés par les defaults du modèle ORM
        # Le status a un default "Actif" dans le modèle
        payload = {
            "id": new_id,
            "name": company_data.name,
            "email": company_data.email,
            "phone": company_data.phone,
            "address": company_data.address,
            "postal_code": company_data.postalCode,
            "city": company_data.city,
            "siret": company_data.siret,
            "vat_number": company_data.vatNumber,
            "legal_notes": company_data.legalNotes,
            "vat_enabled": company_data.vatEnabled,
            "website": company_data.website,
            "is_default": company_data.isDefault,
            "document_header_title": company_data.documentHeaderTitle,
            "logo_url": company_data.logoUrl,
            "invoice_logo_url": company_data.invoiceLogoUrl,
            "bank_name": company_data.bankName,
            "bank_address": company_data.bankAddress,
            "iban": company_data.iban,
            "bic": company_data.bic,
            "planning_user": company_data.planningUser,
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
        
        company_orm = CompanyORM(**payload)
        db.add(company_orm)
        db.flush()
        logger.info(f"✅ Entreprise créée avec succès: {new_id}")
        # Construire la réponse avec les données de l'ORM (incluant les timestamps)
        # Convertir l'ID UUID en string pour la réponse JSON
        company_id_str = str(company_orm.id) if company_orm.id else new_id
        response_data = {
            "id": company_id_str,
            "name": company_orm.name,
            "email": company_orm.email,
            "phone": company_orm.phone,
            "address": company_orm.address,
            "postal_code": company_orm.postal_code,
            "city": company_orm.city,
            "siret": company_orm.siret,
            "vat_number": company_orm.vat_number,
            "legal_notes": company_orm.legal_notes,
            "vat_enabled": company_orm.vat_enabled,
            "website": company_orm.website,
            "is_default": company_orm.is_default,
            "document_header_title": company_orm.document_header_title,
            "logo_url": company_orm.logo_url,
            "invoice_logo_url": company_orm.invoice_logo_url,
            "bank_name": company_orm.bank_name,
            "bank_address": company_orm.bank_address,
            "iban": company_orm.iban,
            "bic": company_orm.bic,
            "planning_user": company_orm.planning_user,
            "created_at": company_orm.created_at.isoformat() if company_orm.created_at else None,
            "updated_at": company_orm.updated_at.isoformat() if company_orm.updated_at else None,
        }
        return ERPResponse(success=True, data=response_data)
            
    except ValidationError as ve:
        logger.error(f"Erreur de validation: {ve}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Données invalides")
    except IntegrityError as ie:
        logger.error(f"Conflit d'unicité (name/email?): {ie}")
        raise HTTPException(status_code=409, detail="Conflit: données déjà existantes (name/email)")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la création de l'entreprise: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur serveur: {str(e)}")

@router.get("/", response_model=ERPListResponse)
async def get_all_companies(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Récupère toutes les entreprises avec pagination."""
    try:
        logger.info(f"Récupération des entreprises (limit={limit}, offset={offset})")
        
        rows = db.execute(
            select(CompanyORM).order_by(CompanyORM.created_at.desc()).offset(offset).limit(limit)
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "address": r.address,
                "postal_code": r.postal_code,
                "city": r.city,
                "siret": r.siret,
                "status": r.status,
                "tags": r.tags or [],
                "notes": r.notes or {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} entreprises récupérées")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des entreprises: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{company_id}", response_model=ERPResponse)
async def get_company(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Récupère une entreprise par son ID."""
    try:
        logger.info(f"Récupération de l'entreprise: {company_id}")
        
        r = db.get(CompanyORM, company_id)
        if r:
            data = {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "address": r.address,
                "postal_code": r.postal_code,
                "city": r.city,
                "siret": r.siret,
                "status": r.status,
                "tags": r.tags or [],
                "notes": r.notes or {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            logger.info(f"✅ Entreprise trouvée: {company_id}")
            return ERPResponse(success=True, data=data)
        else:
            logger.warning(f"Entreprise non trouvée: {company_id}")
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'entreprise {company_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.put("/{company_id}", response_model=ERPResponse)
async def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour une entreprise existante."""
    try:
        logger.info(f"Mise à jour de l'entreprise: {company_id}")
        
        row = db.get(CompanyORM, company_id)
        if not row:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")

        payload = company_data.model_dump(exclude_unset=True)
        mapping = {
            'postalCode': 'postal_code',
            'vatNumber': 'vat_number',
            'legalNotes': 'legal_notes',
            'vatEnabled': 'vat_enabled',
            'isDefault': 'is_default',
            'documentHeaderTitle': 'document_header_title',
            'logoUrl': 'logo_url',
            'invoiceLogoUrl': 'invoice_logo_url',
            'bankName': 'bank_name',
            'bankAddress': 'bank_address',
            'planningUser': 'planning_user',
        }
        for k, v in payload.items():
            setattr(row, mapping.get(k, k), v)
        row.updated_at = datetime.utcnow()
        logger.info(f"✅ Entreprise mise à jour: {company_id}")
        return ERPResponse(success=True, data={"id": company_id})
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de l'entreprise {company_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.delete("/{company_id}", response_model=ERPResponse)
async def delete_company(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Supprime une entreprise."""
    try:
        logger.info(f"Suppression de l'entreprise: {company_id}")
        
        r = db.get(CompanyORM, company_id)
        if not r:
            logger.warning(f"Entreprise non trouvée pour suppression: {company_id}")
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        db.delete(r)
        logger.info(f"✅ Entreprise supprimée: {company_id}")
        return ERPResponse(success=True, data={"id": company_id, "message": "Entreprise supprimée avec succès"})
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression de l'entreprise {company_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{company_id}/stats", response_model=ERPResponse)
async def get_company_stats(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Récupère des statistiques pour une entreprise."""
    try:
        logger.info(f"Récupération des statistiques pour l'entreprise: {company_id}")
        
        r_company = db.get(CompanyORM, company_id)
        if not r_company:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")

        client_rows = db.execute(
            select(ClientORM.id).where(ClientORM.company_name == r_company.name)
        ).all()
        client_ids = [row[0] for row in client_rows]

        num_clients = len(client_ids)
        num_services = db.execute(select(sa.func.count(ServiceORM.id))).scalar_one()
        num_appointments = 0
        if client_ids:
            num_appointments = db.execute(
                select(sa.func.count(AppointmentORM.id)).where(AppointmentORM.client_id.in_(client_ids))
            ).scalar_one()
        
        stats = {
            "company_id": company_id,
            "num_clients": num_clients,
            "num_services": num_services,
            "num_appointments": num_appointments,
        }
        
        logger.info(f"✅ Statistiques récupérées pour l'entreprise {company_id}")
        return ERPResponse(success=True, data=stats)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des statistiques pour l'entreprise {company_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{company_id}/clients", response_model=ERPListResponse)
async def get_company_clients(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Récupère la liste des clients associés à une entreprise."""
    try:
        logger.info(f"Récupération des clients pour l'entreprise: {company_id}")
        
        r_company = db.get(CompanyORM, company_id)
        if not r_company:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")

        rows = db.execute(
            select(ClientORM).where(ClientORM.company_name == r_company.name).order_by(ClientORM.name.asc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "address": r.address,
                "city": r.city,
                "status": r.status,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} clients trouvés pour l'entreprise '{company_id}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des clients pour l'entreprise {company_id}: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{company_id}/appointments", response_model=ERPListResponse)
async def get_company_appointments(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Récupère la liste des rendez-vous associés aux clients d'une entreprise."""
    try:
        logger.info(f"Récupération des rendez-vous pour l'entreprise: {company_id}")
        
        r_company = db.get(CompanyORM, company_id)
        if not r_company:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")

        client_rows = db.execute(
            select(ClientORM.id).where(ClientORM.company_name == r_company.name)
        ).all()
        client_ids = [row[0] for row in client_rows]
        if not client_ids:
            logger.info(f"Aucun client trouvé pour l'entreprise '{company_id}', donc aucun rendez-vous")
            return ERPListResponse(success=True, data=[], count=0)

        rows = db.execute(
            select(AppointmentORM).where(AppointmentORM.client_id.in_(client_ids)).order_by(AppointmentORM.start_at.desc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "client_id": r.client_id,
                "service_id": r.service_id,
                "scheduled_at": r.start_at.isoformat() if r.start_at else None,
                "start_time": r.end_at.isoformat() if r.end_at else None,
                "status": r.status,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} rendez-vous trouvés pour l'entreprise '{company_id}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rendez-vous pour l'entreprise {company_id}: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/default", response_model=ERPResponse)
async def get_default_company(
    db: Session = Depends(get_db)
):
    """Récupère l'entreprise par défaut."""
    try:
        logger.info("Récupération de l'entreprise par défaut")
        
        row = db.execute(select(CompanyORM).where(CompanyORM.is_default.is_(True)).limit(1)).scalars().first()
        if row:
            data = {
                "id": row.id,
                "name": row.name,
                "email": row.email,
                "phone": row.phone,
                "address": row.address,
                "postal_code": row.postal_code,
                "city": row.city,
                "siret": row.siret,
                "status": row.status,
            }
            logger.info("✅ Entreprise par défaut trouvée")
            return ERPResponse(success=True, data=data)
        else:
            logger.warning("Aucune entreprise par défaut trouvée")
            raise HTTPException(status_code=404, detail="Aucune entreprise par défaut trouvée")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'entreprise par défaut: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")
