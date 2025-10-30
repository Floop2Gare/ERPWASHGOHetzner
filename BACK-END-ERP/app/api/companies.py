import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import ValidationError
from datetime import datetime
from app.models.supabase_client import get_supabase_client
from app.schemas.erp import (
    CompanyCreate, CompanyUpdate, ERPResponse, ERPListResponse
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
async def create_company(
    company_data: CompanyCreate,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Crée une nouvelle entreprise."""
    try:
        # Générer un ID unique côté serveur
        new_id = str(uuid.uuid4())
        
        logger.info(f"Création d'une nouvelle entreprise: {company_data.name}")
        
        # Préparer les données pour Supabase
        company_dict = {
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
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insérer en base
        result = supabase.table('companies').insert(company_dict).execute()
        
        if result.data:
            logger.info(f"✅ Entreprise créée avec succès: {new_id}")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.error("❌ Erreur lors de la création de l'entreprise: Aucune donnée retournée")
            return ERPResponse(success=False, error="Erreur lors de la création de l'entreprise")
            
    except ValidationError as ve:
        logger.error(f"Erreur de validation: {ve}")
        return ERPResponse(success=False, error=f"Données invalides: {str(ve)}")
    except Exception as e:
        logger.error(f"Erreur lors de la création de l'entreprise: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/", response_model=ERPListResponse)
async def get_all_companies(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère toutes les entreprises avec pagination."""
    try:
        logger.info(f"Récupération des entreprises (limit={limit}, offset={offset})")
        
        result = supabase.table('companies').select('*').order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} entreprises récupérées")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info("Aucune entreprise trouvée")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des entreprises: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{company_id}", response_model=ERPResponse)
async def get_company(
    company_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère une entreprise par son ID."""
    try:
        logger.info(f"Récupération de l'entreprise: {company_id}")
        
        result = supabase.table('companies').select('*').eq('id', company_id).limit(1).execute()
        
        if result.data:
            logger.info(f"✅ Entreprise trouvée: {company_id}")
            return ERPResponse(success=True, data=result.data[0])
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
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Met à jour une entreprise existante."""
    try:
        logger.info(f"Mise à jour de l'entreprise: {company_id}")
        
        # Préparer les données de mise à jour
        update_dict = {}
        for field, value in company_data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field == "postalCode":
                    update_dict["postal_code"] = value
                elif field == "vatNumber":
                    update_dict["vat_number"] = value
                elif field == "legalNotes":
                    update_dict["legal_notes"] = value
                elif field == "vatEnabled":
                    update_dict["vat_enabled"] = value
                elif field == "isDefault":
                    update_dict["is_default"] = value
                elif field == "documentHeaderTitle":
                    update_dict["document_header_title"] = value
                elif field == "logoUrl":
                    update_dict["logo_url"] = value
                elif field == "invoiceLogoUrl":
                    update_dict["invoice_logo_url"] = value
                elif field == "bankName":
                    update_dict["bank_name"] = value
                elif field == "bankAddress":
                    update_dict["bank_address"] = value
                elif field == "planningUser":
                    update_dict["planning_user"] = value
                else:
                    update_dict[field] = value
        
        update_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Mettre à jour en base
        result = supabase.table('companies').update(update_dict).eq('id', company_id).execute()
        
        if result.data:
            logger.info(f"✅ Entreprise mise à jour: {company_id}")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.warning(f"Entreprise non trouvée pour mise à jour: {company_id}")
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de l'entreprise {company_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.delete("/{company_id}", response_model=ERPResponse)
async def delete_company(
    company_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Supprime une entreprise."""
    try:
        logger.info(f"Suppression de l'entreprise: {company_id}")
        
        result = supabase.table('companies').delete().eq('id', company_id).execute()
        
        # Vérifier si la suppression a réussi (result.count peut être None)
        if result.count is not None and result.count > 0:
            logger.info(f"✅ Entreprise supprimée: {company_id}")
            return ERPResponse(success=True, data={"id": company_id, "message": "Entreprise supprimée avec succès"})
        else:
            logger.warning(f"Entreprise non trouvée pour suppression: {company_id}")
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression de l'entreprise {company_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{company_id}/stats", response_model=ERPResponse)
async def get_company_stats(
    company_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère des statistiques pour une entreprise."""
    try:
        logger.info(f"Récupération des statistiques pour l'entreprise: {company_id}")
        
        # Vérifier si l'entreprise existe
        company_result = supabase.table('companies').select('id').eq('id', company_id).limit(1).execute()
        if not company_result.data:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        
        # Compter les clients liés à cette entreprise
        clients_result = supabase.table('clients').select('id', count='exact').eq('company_id', company_id).execute()
        num_clients = clients_result.count if clients_result.count else 0
        
        # Compter les services (tous les services pour l'exemple)
        services_result = supabase.table('services').select('id', count='exact').execute()
        num_services = services_result.count if services_result.count else 0
        
        # Compter les rendez-vous liés aux clients de cette entreprise
        appointments_result = supabase.table('engagements').select('id', count='exact').execute()
        num_appointments = appointments_result.count if appointments_result.count else 0
        
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
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère la liste des clients associés à une entreprise."""
    try:
        logger.info(f"Récupération des clients pour l'entreprise: {company_id}")
        
        # Vérifier si l'entreprise existe
        company_result = supabase.table('companies').select('id').eq('id', company_id).limit(1).execute()
        if not company_result.data:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        
        result = supabase.table('clients').select('*').eq('company_id', company_id).order('name', desc=False).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} clients trouvés pour l'entreprise '{company_id}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun client trouvé pour l'entreprise '{company_id}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des clients pour l'entreprise {company_id}: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{company_id}/appointments", response_model=ERPListResponse)
async def get_company_appointments(
    company_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère la liste des rendez-vous associés aux clients d'une entreprise."""
    try:
        logger.info(f"Récupération des rendez-vous pour l'entreprise: {company_id}")
        
        # Vérifier si l'entreprise existe
        company_result = supabase.table('companies').select('id').eq('id', company_id).limit(1).execute()
        if not company_result.data:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        
        # Récupérer les IDs des clients de cette entreprise
        clients_result = supabase.table('clients').select('id').eq('company_id', company_id).execute()
        client_ids = [client['id'] for client in clients_result.data] if clients_result.data else []
        
        if not client_ids:
            logger.info(f"Aucun client trouvé pour l'entreprise '{company_id}', donc aucun rendez-vous")
            return ERPListResponse(success=True, data=[], count=0)
        
        # Récupérer les rendez-vous pour ces clients
        result = supabase.table('engagements').select('*').in_('client_id', client_ids).order('scheduled_at', desc=True).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} rendez-vous trouvés pour l'entreprise '{company_id}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun rendez-vous trouvé pour l'entreprise '{company_id}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rendez-vous pour l'entreprise {company_id}: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/default", response_model=ERPResponse)
async def get_default_company(
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère l'entreprise par défaut."""
    try:
        logger.info("Récupération de l'entreprise par défaut")
        
        result = supabase.table('companies').select('*').eq('is_default', True).limit(1).execute()
        
        if result.data:
            logger.info("✅ Entreprise par défaut trouvée")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.warning("Aucune entreprise par défaut trouvée")
            raise HTTPException(status_code=404, detail="Aucune entreprise par défaut trouvée")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'entreprise par défaut: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")
