import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import ValidationError
from datetime import datetime, date
from app.models.supabase_client import get_supabase_client
from app.schemas.erp import (
    AppointmentCreate, AppointmentUpdate, ERPResponse, ERPListResponse
)
from supabase import Client as SupabaseClient
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

def get_supabase_client_dependency() -> SupabaseClient:
    try:
        logger.info("Tentative d'obtention du client Supabase...")
        client_instance = get_supabase_client()
        logger.info("Client Supabase obtenu avec succès")
        return client_instance.get_client()
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation Supabase: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur de connexion Supabase: {str(e)}")

@router.post("/", response_model=ERPResponse)
async def create_appointment(
    appointment_data: AppointmentCreate,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Crée un nouveau rendez-vous."""
    try:
        # Générer un ID unique côté serveur
        new_id = str(uuid.uuid4())
        
        logger.info(f"Création d'un nouveau rendez-vous: {new_id}")
        
        # Vérifier que le client existe
        client_result = supabase.table('clients').select('id').eq('id', appointment_data.clientId).limit(1).execute()
        if not client_result.data:
            raise HTTPException(status_code=404, detail=f"Client avec l'ID {appointment_data.clientId} non trouvé")
        
        # Vérifier que le service existe
        service_result = supabase.table('services').select('id').eq('id', appointment_data.serviceId).limit(1).execute()
        if not service_result.data:
            raise HTTPException(status_code=404, detail=f"Service avec l'ID {appointment_data.serviceId} non trouvé")
        
        # Préparer les données pour Supabase
        appointment_dict = {
            "id": new_id,
            "client_id": appointment_data.clientId,
            "service_id": appointment_data.serviceId,
            "option_ids": appointment_data.optionIds,
            "scheduled_at": appointment_data.scheduledAt.isoformat(),
            "status": appointment_data.status.value,
            "company_id": appointment_data.companyId,
            "kind": appointment_data.kind.value,
            "support_type": appointment_data.supportType.value if appointment_data.supportType else None,
            "support_detail": appointment_data.supportDetail,
            "additional_charge": appointment_data.additionalCharge,
            "contact_ids": appointment_data.contactIds,
            "assigned_user_ids": appointment_data.assignedUserIds,
            "send_history": appointment_data.sendHistory,
            "invoice_number": appointment_data.invoiceNumber,
            "invoice_vat_enabled": appointment_data.invoiceVatEnabled,
            "quote_number": appointment_data.quoteNumber,
            "quote_status": appointment_data.quoteStatus,
            "mobile_duration_minutes": appointment_data.mobileDurationMinutes,
            "mobile_completion_comment": appointment_data.mobileCompletionComment,
            "planning_user": appointment_data.planningUser,
            "start_time": appointment_data.startTime.isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insérer en base
        result = supabase.table('engagements').insert(appointment_dict).execute()
        
        if result.data:
            logger.info(f"✅ Rendez-vous créé avec succès: {new_id}")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.error("❌ Erreur lors de la création du rendez-vous: Aucune donnée retournée")
            return ERPResponse(success=False, error="Erreur lors de la création du rendez-vous")
            
    except HTTPException:
        raise
    except ValidationError as ve:
        logger.error(f"Erreur de validation: {ve}")
        return ERPResponse(success=False, error=f"Données invalides: {str(ve)}")
    except Exception as e:
        logger.error(f"Erreur lors de la création du rendez-vous: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/", response_model=ERPListResponse)
async def get_all_appointments(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère tous les rendez-vous avec pagination."""
    try:
        logger.info(f"Récupération des rendez-vous (limit={limit}, offset={offset})")
        
        result = supabase.table('engagements').select('*').order('scheduled_at', desc=True).range(offset, offset + limit - 1).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} rendez-vous récupérés")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info("Aucun rendez-vous trouvé")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rendez-vous: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{appointment_id}", response_model=ERPResponse)
async def get_appointment(
    appointment_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère un rendez-vous par son ID."""
    try:
        logger.info(f"Récupération du rendez-vous: {appointment_id}")
        
        result = supabase.table('engagements').select('*').eq('id', appointment_id).limit(1).execute()
        
        if result.data:
            logger.info(f"✅ Rendez-vous trouvé: {appointment_id}")
            return ERPResponse(success=True, data=result.data[0])
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
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Met à jour un rendez-vous existant."""
    try:
        logger.info(f"Mise à jour du rendez-vous: {appointment_id}")
        
        # Vérifier que le client existe si clientId est fourni
        if appointment_data.clientId:
            client_result = supabase.table('clients').select('id').eq('id', appointment_data.clientId).limit(1).execute()
            if not client_result.data:
                raise HTTPException(status_code=404, detail=f"Client avec l'ID {appointment_data.clientId} non trouvé")
        
        # Vérifier que le service existe si serviceId est fourni
        if appointment_data.serviceId:
            service_result = supabase.table('services').select('id').eq('id', appointment_data.serviceId).limit(1).execute()
            if not service_result.data:
                raise HTTPException(status_code=404, detail=f"Service avec l'ID {appointment_data.serviceId} non trouvé")
        
        # Préparer les données de mise à jour
        update_dict = {}
        for field, value in appointment_data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field == "status" and hasattr(value, 'value'):
                    update_dict["status"] = value.value
                elif field == "kind" and hasattr(value, 'value'):
                    update_dict["kind"] = value.value
                elif field == "supportType" and hasattr(value, 'value'):
                    update_dict["support_type"] = value.value
                elif field == "scheduledAt":
                    update_dict["scheduled_at"] = value.isoformat()
                elif field == "startTime":
                    update_dict["start_time"] = value.isoformat()
                elif field == "clientId":
                    update_dict["client_id"] = value
                elif field == "serviceId":
                    update_dict["service_id"] = value
                elif field == "optionIds":
                    update_dict["option_ids"] = value
                elif field == "companyId":
                    update_dict["company_id"] = value
                elif field == "supportDetail":
                    update_dict["support_detail"] = value
                elif field == "additionalCharge":
                    update_dict["additional_charge"] = value
                elif field == "contactIds":
                    update_dict["contact_ids"] = value
                elif field == "assignedUserIds":
                    update_dict["assigned_user_ids"] = value
                elif field == "sendHistory":
                    update_dict["send_history"] = value
                elif field == "invoiceNumber":
                    update_dict["invoice_number"] = value
                elif field == "invoiceVatEnabled":
                    update_dict["invoice_vat_enabled"] = value
                elif field == "quoteNumber":
                    update_dict["quote_number"] = value
                elif field == "quoteStatus":
                    update_dict["quote_status"] = value
                elif field == "mobileDurationMinutes":
                    update_dict["mobile_duration_minutes"] = value
                elif field == "mobileCompletionComment":
                    update_dict["mobile_completion_comment"] = value
                elif field == "planningUser":
                    update_dict["planning_user"] = value
                else:
                    update_dict[field] = value
        
        update_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Mettre à jour en base
        result = supabase.table('engagements').update(update_dict).eq('id', appointment_id).execute()
        
        if result.data:
            logger.info(f"✅ Rendez-vous mis à jour: {appointment_id}")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.warning(f"Rendez-vous non trouvé pour mise à jour: {appointment_id}")
            raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du rendez-vous {appointment_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.delete("/{appointment_id}", response_model=ERPResponse)
async def delete_appointment(
    appointment_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Supprime un rendez-vous."""
    try:
        logger.info(f"Suppression du rendez-vous: {appointment_id}")
        
        result = supabase.table('engagements').delete().eq('id', appointment_id).execute()
        
        # Vérifier si la suppression a réussi (result.count peut être None)
        if result.count is not None and result.count > 0:
            logger.info(f"✅ Rendez-vous supprimé: {appointment_id}")
            return ERPResponse(success=True, data={"id": appointment_id, "message": "Rendez-vous supprimé avec succès"})
        else:
            logger.warning(f"Rendez-vous non trouvé pour suppression: {appointment_id}")
            raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du rendez-vous {appointment_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/calendar/{date_str}", response_model=ERPListResponse)
async def get_appointments_by_date(
    date_str: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
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
        
        result = supabase.table('engagements').select('*').gte('scheduled_at', start_of_day.isoformat()).lte('scheduled_at', end_of_day.isoformat()).order('scheduled_at', desc=False).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} rendez-vous trouvés pour le {date_str}")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun rendez-vous trouvé pour le {date_str}")
            return ERPListResponse(success=True, data=[], count=0)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rendez-vous pour la date {date_str}: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/status/{status}", response_model=ERPListResponse)
async def get_appointments_by_status(
    status: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère les rendez-vous par statut."""
    try:
        logger.info(f"Récupération des rendez-vous avec le statut: {status}")
        
        result = supabase.table('engagements').select('*').eq('status', status).order('scheduled_at', desc=True).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} rendez-vous trouvés avec le statut '{status}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun rendez-vous trouvé avec le statut '{status}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rendez-vous avec le statut '{status}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/client/{client_id}", response_model=ERPListResponse)
async def get_appointments_by_client(
    client_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère les rendez-vous d'un client spécifique."""
    try:
        logger.info(f"Récupération des rendez-vous du client: {client_id}")
        
        result = supabase.table('engagements').select('*').eq('client_id', client_id).order('scheduled_at', desc=True).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} rendez-vous trouvés pour le client '{client_id}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun rendez-vous trouvé pour le client '{client_id}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rendez-vous du client '{client_id}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")
