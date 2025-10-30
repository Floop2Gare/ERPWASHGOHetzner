import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import ValidationError
from datetime import datetime
from app.models.supabase_client import get_supabase_client
from app.schemas.erp import (
    LeadCreate, LeadUpdate, ERPResponse, ERPListResponse,
    Activity
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
async def create_lead(
    lead_data: LeadCreate,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Crée un nouveau lead."""
    try:
        # Générer un ID unique côté serveur
        new_id = str(uuid.uuid4())
        
        logger.info(f"Création d'un nouveau lead: {lead_data.name}")
        
        # Préparer les données pour Supabase
        lead_dict = {
            "id": new_id,
            "name": lead_data.name,
            "email": lead_data.email,
            "phone": lead_data.phone,
            "company": lead_data.company,
            "source": lead_data.source,
            "status": lead_data.status.value,
            "owner": lead_data.owner,
            "segment": lead_data.segment,
            "tags": lead_data.tags,
            "address": lead_data.address,
            "city": lead_data.city,
            "notes": lead_data.notes,
            "activities": [activity.model_dump() for activity in lead_data.activities],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insérer en base
        result = supabase.table('leads').insert(lead_dict).execute()
        
        if result.data:
            logger.info(f"✅ Lead créé avec succès: {new_id}")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.error("❌ Erreur lors de la création du lead: Aucune donnée retournée")
            return ERPResponse(success=False, error="Erreur lors de la création du lead")
            
    except ValidationError as ve:
        logger.error(f"Erreur de validation: {ve}")
        return ERPResponse(success=False, error=f"Données invalides: {str(ve)}")
    except Exception as e:
        logger.error(f"Erreur lors de la création du lead: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/", response_model=ERPListResponse)
async def get_all_leads(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère tous les leads avec pagination."""
    try:
        logger.info(f"Récupération des leads (limit={limit}, offset={offset})")
        
        result = supabase.table('leads').select('*').order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} leads récupérés")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info("Aucun lead trouvé")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des leads: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{lead_id}", response_model=ERPResponse)
async def get_lead(
    lead_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère un lead par son ID."""
    try:
        logger.info(f"Récupération du lead: {lead_id}")
        
        result = supabase.table('leads').select('*').eq('id', lead_id).limit(1).execute()
        
        if result.data:
            logger.info(f"✅ Lead trouvé: {lead_id}")
            return ERPResponse(success=True, data=result.data[0])
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
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Met à jour un lead existant."""
    try:
        logger.info(f"Mise à jour du lead: {lead_id}")
        
        # Préparer les données de mise à jour
        update_dict = {}
        for field, value in lead_data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field == "status" and hasattr(value, 'value'):
                    update_dict["status"] = value.value
                elif field == "activities":
                    update_dict["activities"] = [activity.model_dump() if hasattr(activity, 'model_dump') else activity for activity in value]
                else:
                    update_dict[field] = value
        
        update_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Mettre à jour en base
        result = supabase.table('leads').update(update_dict).eq('id', lead_id).execute()
        
        if result.data:
            logger.info(f"✅ Lead mis à jour: {lead_id}")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.warning(f"Lead non trouvé pour mise à jour: {lead_id}")
            raise HTTPException(status_code=404, detail="Lead non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du lead {lead_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.delete("/{lead_id}", response_model=ERPResponse)
async def delete_lead(
    lead_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Supprime un lead."""
    try:
        logger.info(f"Suppression du lead: {lead_id}")
        
        result = supabase.table('leads').delete().eq('id', lead_id).execute()
        
        # Vérifier si la suppression a réussi (result.count peut être None)
        if result.count is not None and result.count > 0:
            logger.info(f"✅ Lead supprimé: {lead_id}")
            return ERPResponse(success=True, data={"id": lead_id, "message": "Lead supprimé avec succès"})
        else:
            logger.warning(f"Lead non trouvé pour suppression: {lead_id}")
            raise HTTPException(status_code=404, detail="Lead non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du lead {lead_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/search/{search_term}", response_model=ERPListResponse)
async def search_leads(
    search_term: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Recherche des leads par nom, email, téléphone ou entreprise."""
    try:
        logger.info(f"Recherche de leads avec le terme: {search_term}")
        
        result = supabase.table('leads').select('*').or_(
            f'name.ilike.%{search_term}%,email.ilike.%{search_term}%,phone.ilike.%{search_term}%,company.ilike.%{search_term}%'
        ).order('created_at', desc=True).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} leads trouvés pour '{search_term}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun lead trouvé pour '{search_term}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la recherche de leads avec '{search_term}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/status/{status}", response_model=ERPListResponse)
async def get_leads_by_status(
    status: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère les leads par statut."""
    try:
        logger.info(f"Récupération des leads avec le statut: {status}")
        
        result = supabase.table('leads').select('*').eq('status', status).order('created_at', desc=True).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} leads trouvés avec le statut '{status}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun lead trouvé avec le statut '{status}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des leads avec le statut '{status}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/owner/{owner}", response_model=ERPListResponse)
async def get_leads_by_owner(
    owner: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère les leads par propriétaire."""
    try:
        logger.info(f"Récupération des leads du propriétaire: {owner}")
        
        result = supabase.table('leads').select('*').eq('owner', owner).order('created_at', desc=True).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} leads trouvés pour le propriétaire '{owner}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun lead trouvé pour le propriétaire '{owner}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des leads du propriétaire '{owner}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/source/{source}", response_model=ERPListResponse)
async def get_leads_by_source(
    source: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère les leads par source."""
    try:
        logger.info(f"Récupération des leads de la source: {source}")
        
        result = supabase.table('leads').select('*').eq('source', source).order('created_at', desc=True).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} leads trouvés pour la source '{source}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun lead trouvé pour la source '{source}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des leads de la source '{source}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.post("/{lead_id}/convert", response_model=ERPResponse)
async def convert_lead_to_client(
    lead_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Convertit un lead en client."""
    try:
        logger.info(f"Conversion du lead en client: {lead_id}")
        
        # Récupérer le lead
        lead_result = supabase.table('leads').select('*').eq('id', lead_id).limit(1).execute()
        
        if not lead_result.data:
            raise HTTPException(status_code=404, detail="Lead non trouvé")
        
        lead = lead_result.data[0]
        
        # Créer un nouveau client à partir du lead
        client_id = str(uuid.uuid4())
        client_dict = {
            "id": client_id,
            "type": "company" if lead.get('company') else "individual",
            "name": lead['name'],
            "company_name": lead.get('company'),
            "email": lead.get('email'),
            "phone": lead.get('phone'),
            "address": lead.get('address'),
            "city": lead.get('city'),
            "status": "Actif",
            "tags": lead.get('tags', []),
            "contacts": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insérer le client
        client_result = supabase.table('clients').insert(client_dict).execute()
        
        if client_result.data:
            # Mettre à jour le statut du lead
            supabase.table('leads').update({
                "status": "Converti",
                "updated_at": datetime.utcnow().isoformat()
            }).eq('id', lead_id).execute()
            
            logger.info(f"✅ Lead converti en client: {lead_id} -> {client_id}")
            return ERPResponse(success=True, data={
                "lead_id": lead_id,
                "client_id": client_id,
                "message": "Lead converti en client avec succès"
            })
        else:
            logger.error("❌ Erreur lors de la création du client à partir du lead")
            return ERPResponse(success=False, error="Erreur lors de la conversion du lead")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la conversion du lead {lead_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")
