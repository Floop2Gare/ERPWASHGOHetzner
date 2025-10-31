import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import ValidationError
from datetime import datetime, date
import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.schemas.erp import (
    AppointmentCreate, AppointmentUpdate, ERPResponse, ERPListResponse
)
from app.db.session import get_db
from app.db.models import AppointmentORM
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=ERPResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db)
):
    """Crée un nouveau rendez-vous."""
    try:
        # Générer un ID unique côté serveur
        new_id = appointment_data.id or str(uuid.uuid4())

        logger.info(f"Création d'un nouveau rendez-vous: {new_id}")

        start_at = appointment_data.startTime or appointment_data.scheduledAt
        end_at = None
        status_val = appointment_data.status.value if getattr(appointment_data, 'status', None) else None

        row = AppointmentORM(
            id=new_id,
            client_id=appointment_data.clientId,
            service_id=appointment_data.serviceId,
            start_at=start_at,
            end_at=end_at,
            status=status_val,
            notes={},
        )
        db.add(row)
        payload = {
            "id": new_id,
            "client_id": row.client_id,
            "service_id": row.service_id,
            "scheduled_at": row.start_at.isoformat() if row.start_at else None,
            "start_time": row.end_at.isoformat() if row.end_at else None,
            "scheduledAt": row.start_at.isoformat() if row.start_at else None,
            "status": row.status,
            "notes": row.notes,
            "created_at": row.created_at.isoformat() if getattr(row, 'created_at', None) else None,
            "updated_at": row.updated_at.isoformat() if getattr(row, 'updated_at', None) else None,
        }
        logger.info(f"✅ Rendez-vous créé avec succès: {new_id}")
        return ERPResponse(success=True, data=payload)
            
    except HTTPException:
        raise
    except ValidationError as ve:
        logger.error(f"Erreur de validation: {ve}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Données invalides")
    except Exception as e:
        logger.error(f"Erreur lors de la création du rendez-vous: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/", response_model=ERPListResponse)
async def get_all_appointments(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Récupère tous les rendez-vous avec pagination."""
    try:
        logger.info(f"Récupération des rendez-vous (limit={limit}, offset={offset})")
        
        rows = db.execute(
            select(AppointmentORM).order_by(AppointmentORM.start_at.desc()).offset(offset).limit(limit)
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "client_id": r.client_id,
                "service_id": r.service_id,
                "scheduled_at": r.start_at.isoformat() if r.start_at else None,
                "start_time": r.end_at.isoformat() if r.end_at else None,
                "scheduledAt": r.start_at.isoformat() if r.start_at else None,
                "status": r.status,
                "notes": r.notes or {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} rendez-vous récupérés")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rendez-vous: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{appointment_id}", response_model=ERPResponse)
async def get_appointment(
    appointment_id: str,
    db: Session = Depends(get_db)
):
    """Récupère un rendez-vous par son ID."""
    try:
        logger.info(f"Récupération du rendez-vous: {appointment_id}")
        
        r = db.get(AppointmentORM, appointment_id)
        if r:
            data = {
                "id": r.id,
                "client_id": r.client_id,
                "service_id": r.service_id,
                "scheduled_at": r.start_at.isoformat() if r.start_at else None,
                "start_time": r.end_at.isoformat() if r.end_at else None,
                "scheduledAt": r.start_at.isoformat() if r.start_at else None,
                "status": r.status,
                "notes": r.notes or {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            logger.info(f"✅ Rendez-vous trouvé: {appointment_id}")
            return ERPResponse(success=True, data=data)
        else:
            logger.warning(f"Rendez-vous non trouvé: {appointment_id}")
            raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du rendez-vous {appointment_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.put("/{appointment_id}", response_model=ERPResponse)
async def update_appointment(
    appointment_id: str,
    appointment_data: AppointmentUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour un rendez-vous existant."""
    try:
        logger.info(f"Mise à jour du rendez-vous: {appointment_id}")
        
        row = db.get(AppointmentORM, appointment_id)
        if not row:
            raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")

        payload = appointment_data.model_dump(exclude_unset=True)
        if "status" in payload and hasattr(payload["status"], "value"):
            payload["status"] = payload["status"].value
        if "scheduledAt" in payload:
            payload_start = payload.pop("scheduledAt")
            if payload_start is not None:
                row.start_at = payload_start
        if "startTime" in payload:
            payload_end = payload.pop("startTime")
            if payload_end is not None:
                row.end_at = payload_end
        if "clientId" in payload:
            row.client_id = payload.pop("clientId")
        if "serviceId" in payload:
            row.service_id = payload.pop("serviceId")
        if "notes" in payload:
            row.notes = payload.pop("notes") or {}
        for k, v in payload.items():
            setattr(row, k, v)
        row.updated_at = datetime.utcnow()
        logger.info(f"✅ Rendez-vous mis à jour: {appointment_id}")
        return ERPResponse(success=True, data={"id": appointment_id})
            
    except HTTPException:
        raise
    except IntegrityError as ie:
        logger.error(f"Conflit d'intégrité (FK?): {ie}")
        raise HTTPException(status_code=409, detail="Conflit d'intégrité")
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du rendez-vous {appointment_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.delete("/{appointment_id}", response_model=ERPResponse)
async def delete_appointment(
    appointment_id: str,
    db: Session = Depends(get_db)
):
    """Supprime un rendez-vous."""
    try:
        logger.info(f"Suppression du rendez-vous: {appointment_id}")
        
        r = db.get(AppointmentORM, appointment_id)
        if not r:
            logger.warning(f"Rendez-vous non trouvé pour suppression: {appointment_id}")
            raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")
        db.delete(r)
        logger.info(f"✅ Rendez-vous supprimé: {appointment_id}")
        return ERPResponse(success=True, data={"id": appointment_id, "message": "Rendez-vous supprimé avec succès"})
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du rendez-vous {appointment_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/calendar/{date_str}", response_model=ERPListResponse)
async def get_appointments_by_date(
    date_str: str,
    db: Session = Depends(get_db)
):
    """Récupère les rendez-vous pour une date spécifique (format YYYY-MM-DD)."""
    try:
        logger.info(f"Récupération des rendez-vous pour la date: {date_str}")
        
        # Valider le format de date
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Format de date invalide. Utilisez YYYY-MM-DD.")
        
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())
        
        rows = db.execute(
            select(AppointmentORM)
            .where(AppointmentORM.start_at >= start_of_day)
            .where(AppointmentORM.start_at <= end_of_day)
            .order_by(AppointmentORM.start_at.asc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "client_id": r.client_id,
                "service_id": r.service_id,
                "scheduled_at": r.start_at.isoformat() if r.start_at else None,
                "start_time": r.end_at.isoformat() if r.end_at else None,
                "scheduledAt": r.start_at.isoformat() if r.start_at else None,
                "status": r.status,
                "notes": r.notes or {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} rendez-vous trouvés pour le {date_str}")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rendez-vous pour la date {date_str}: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/status/{status}", response_model=ERPListResponse)
async def get_appointments_by_status(
    status: str,
    db: Session = Depends(get_db)
):
    """Récupère les rendez-vous par statut."""
    try:
        logger.info(f"Récupération des rendez-vous avec le statut: {status}")
        
        rows = db.execute(
            select(AppointmentORM).where(AppointmentORM.status == status).order_by(AppointmentORM.start_at.desc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "client_id": r.client_id,
                "service_id": r.service_id,
                "scheduled_at": r.start_at.isoformat() if r.start_at else None,
                "start_time": r.end_at.isoformat() if r.end_at else None,
                "scheduledAt": r.start_at.isoformat() if r.start_at else None,
                "status": r.status,
                "notes": r.notes or {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} rendez-vous trouvés avec le statut '{status}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rendez-vous avec le statut '{status}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/client/{client_id}", response_model=ERPListResponse)
async def get_appointments_by_client(
    client_id: str,
    db: Session = Depends(get_db)
):
    """Récupère les rendez-vous d'un client spécifique."""
    try:
        logger.info(f"Récupération des rendez-vous du client: {client_id}")
        
        rows = db.execute(
            select(AppointmentORM).where(AppointmentORM.client_id == client_id).order_by(AppointmentORM.start_at.desc())
        ).scalars().all()
        data = [
            {
                "id": r.id,
                "client_id": r.client_id,
                "service_id": r.service_id,
                "scheduled_at": r.start_at.isoformat() if r.start_at else None,
                "start_time": r.end_at.isoformat() if r.end_at else None,
                "scheduledAt": r.start_at.isoformat() if r.start_at else None,
                "status": r.status,
                "notes": r.notes or {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        logger.info(f"✅ {len(data)} rendez-vous trouvés pour le client '{client_id}'")
        return ERPListResponse(success=True, data=data, count=len(data))
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rendez-vous du client '{client_id}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")
