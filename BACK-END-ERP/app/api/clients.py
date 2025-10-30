import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import ValidationError
from datetime import datetime
from app.models.supabase_manual import get_manual_supabase_client
from app.schemas.erp import (
    ClientCreate, ClientUpdate, ERPResponse, ERPListResponse,
    Contact
)
# from supabase import Client as SupabaseClient
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

def get_supabase_client_dependency():
    try:
        return get_manual_supabase_client()
    except Exception as e:
        logger.error(f"Erreur initialisation Supabase manuel: {e}")
        raise HTTPException(status_code=500, detail="Erreur de connexion Supabase")

@router.post("/", response_model=ERPResponse)
async def create_client(
    client_data: ClientCreate, 
    supabase = Depends(get_supabase_client_dependency)
):
    """Crée un nouveau client."""
    try:
        logger.info(f"Création d'un nouveau client: {client_data.name}")
        
        # Préparer les données pour Supabase
        client_dict = {
            "id": client_data.id,
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
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insérer en base
        result = supabase.table('clients').insert(client_dict).execute()
        
        if result.data:
            logger.info(f"✅ Client créé avec succès: {client_data.id}")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.error("❌ Erreur lors de la création du client: Aucune donnée retournée")
            return ERPResponse(success=False, error="Erreur lors de la création du client")
            
    except ValidationError as ve:
        logger.error(f"Erreur de validation: {ve}")
        return ERPResponse(success=False, error=f"Données invalides: {str(ve)}")
    except Exception as e:
        logger.error(f"Erreur lors de la création du client: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/", response_model=ERPListResponse)
async def get_all_clients(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    supabase = Depends(get_supabase_client_dependency)
):
    """Récupère tous les clients avec pagination."""
    try:
        logger.info(f"Récupération des clients (limit={limit}, offset={offset})")
        
        result = supabase.table('clients').select('*').order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} clients récupérés")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info("Aucun client trouvé")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des clients: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{client_id}", response_model=ERPResponse)
async def get_client(
    client_id: str, 
    supabase = Depends(get_supabase_client_dependency)
):
    """Récupère un client par son ID."""
    try:
        logger.info(f"Récupération du client: {client_id}")
        
        result = supabase.table('clients').select('*').eq('id', client_id).limit(1).execute()
        
        if result.data:
            logger.info(f"✅ Client trouvé: {client_id}")
            return ERPResponse(success=True, data=result.data[0])
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
    supabase = Depends(get_supabase_client_dependency)
):
    """Met à jour un client existant."""
    try:
        logger.info(f"Mise à jour du client: {client_id}")
        
        # Préparer les données de mise à jour
        update_dict = {}
        for field, value in client_data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field == "type" and hasattr(value, 'value'):
                    update_dict["type"] = value.value
                elif field == "status" and hasattr(value, 'value'):
                    update_dict["status"] = value.value
                elif field == "contacts":
                    update_dict["contacts"] = [contact.model_dump() if hasattr(contact, 'model_dump') else contact for contact in value]
                else:
                    update_dict[field] = value
        
        update_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Mettre à jour en base
        result = supabase.table('clients').update(update_dict).eq('id', client_id).execute()
        
        if result.data:
            logger.info(f"✅ Client mis à jour: {client_id}")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.warning(f"Client non trouvé pour mise à jour: {client_id}")
            raise HTTPException(status_code=404, detail="Client non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du client {client_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.delete("/{client_id}", response_model=ERPResponse)
async def delete_client(
    client_id: str,
    supabase = Depends(get_supabase_client_dependency)
):
    """Supprime un client."""
    try:
        logger.info(f"Suppression du client: {client_id}")
        
        result = supabase.table('clients').delete().eq('id', client_id).execute()
        
        if result.count > 0:
            logger.info(f"✅ Client supprimé: {client_id}")
            return ERPResponse(success=True, data={"id": client_id, "message": "Client supprimé avec succès"})
        else:
            logger.warning(f"Client non trouvé pour suppression: {client_id}")
            raise HTTPException(status_code=404, detail="Client non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du client {client_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/search/{search_term}", response_model=ERPListResponse)
async def search_clients(
    search_term: str,
    supabase = Depends(get_supabase_client_dependency)
):
    """Recherche des clients par nom, email ou téléphone."""
    try:
        logger.info(f"Recherche de clients avec le terme: {search_term}")
        
        result = supabase.table('clients').select('*').or_(
            f'name.ilike.%{search_term}%,email.ilike.%{search_term}%,phone.ilike.%{search_term}%'
        ).order('created_at', desc=True).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} clients trouvés pour '{search_term}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun client trouvé pour '{search_term}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la recherche de clients avec '{search_term}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/status/{status}", response_model=ERPListResponse)
async def get_clients_by_status(
    status: str,
    supabase = Depends(get_supabase_client_dependency)
):
    """Récupère les clients par statut."""
    try:
        logger.info(f"Récupération des clients avec le statut: {status}")
        
        result = supabase.table('clients').select('*').eq('status', status).order('created_at', desc=True).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} clients trouvés avec le statut '{status}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun client trouvé avec le statut '{status}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des clients avec le statut '{status}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")
