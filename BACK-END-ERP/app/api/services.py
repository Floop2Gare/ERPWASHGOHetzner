import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import ValidationError
from datetime import datetime
from app.models.supabase_client import get_supabase_client
from app.schemas.erp import (
    ServiceCreate, ServiceUpdate, ERPResponse, ERPListResponse,
    ServiceOption
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
async def create_service(
    service_data: ServiceCreate,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Crée un nouveau service."""
    try:
        logger.info(f"Création d'un nouveau service: {service_data.name}")
        
        # Générer un ID unique côté serveur
        new_id = str(uuid.uuid4())
        
        # Préparer les données pour Supabase
        service_dict = {
            "id": new_id,
            "name": service_data.name,
            "description": service_data.description,
            "category": service_data.category,
            "active": service_data.active,
            "options": [option.model_dump() for option in service_data.options],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insérer en base
        result = supabase.table('services').insert(service_dict).execute()
        
        if result.data:
            logger.info(f"✅ Service créé avec succès: {new_id}")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.error("❌ Erreur lors de la création du service: Aucune donnée retournée")
            return ERPResponse(success=False, error="Erreur lors de la création du service")
            
    except ValidationError as ve:
        logger.error(f"Erreur de validation: {ve}")
        return ERPResponse(success=False, error=f"Données invalides: {str(ve)}")
    except Exception as e:
        logger.error(f"Erreur lors de la création du service: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/", response_model=ERPListResponse)
async def get_all_services(
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
    active_only: Optional[bool] = Query(False),
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère tous les services avec pagination."""
    try:
        logger.info(f"Récupération des services (limit={limit}, offset={offset}, active_only={active_only})")
        
        query = supabase.table('services').select('*')
        
        if active_only:
            query = query.eq('active', True)
        
        result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} services récupérés")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info("Aucun service trouvé")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des services: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/{service_id}", response_model=ERPResponse)
async def get_service(
    service_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère un service par son ID."""
    try:
        logger.info(f"Récupération du service: {service_id}")
        
        result = supabase.table('services').select('*').eq('id', service_id).limit(1).execute()
        
        if result.data:
            logger.info(f"✅ Service trouvé: {service_id}")
            return ERPResponse(success=True, data=result.data[0])
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
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Met à jour un service existant."""
    try:
        logger.info(f"Mise à jour du service: {service_id}")
        
        # Préparer les données de mise à jour
        update_dict = {}
        for field, value in service_data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field == "options":
                    update_dict["options"] = [option.model_dump() if hasattr(option, 'model_dump') else option for option in value]
                else:
                    update_dict[field] = value
        
        update_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Mettre à jour en base
        result = supabase.table('services').update(update_dict).eq('id', service_id).execute()
        
        if result.data:
            logger.info(f"✅ Service mis à jour: {service_id}")
            return ERPResponse(success=True, data=result.data[0])
        else:
            logger.warning(f"Service non trouvé pour mise à jour: {service_id}")
            raise HTTPException(status_code=404, detail="Service non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du service {service_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.delete("/{service_id}", response_model=ERPResponse)
async def delete_service(
    service_id: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Supprime un service."""
    try:
        logger.info(f"Suppression du service: {service_id}")
        
        result = supabase.table('services').delete().eq('id', service_id).execute()
        
        # Vérifier si la suppression a réussi (result.count peut être None)
        if result.count is not None and result.count > 0:
            logger.info(f"✅ Service supprimé: {service_id}")
            return ERPResponse(success=True, data={"id": service_id, "message": "Service supprimé avec succès"})
        else:
            logger.warning(f"Service non trouvé pour suppression: {service_id}")
            raise HTTPException(status_code=404, detail="Service non trouvé")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du service {service_id}: {e}")
        return ERPResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/search/{search_term}", response_model=ERPListResponse)
async def search_services(
    search_term: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Recherche des services par nom ou description."""
    try:
        logger.info(f"Recherche de services avec le terme: {search_term}")
        
        result = supabase.table('services').select('*').or_(
            f'name.ilike.%{search_term}%,description.ilike.%{search_term}%'
        ).order('created_at', desc=True).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} services trouvés pour '{search_term}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun service trouvé pour '{search_term}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la recherche de services avec '{search_term}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/categories", response_model=ERPListResponse)
async def get_service_categories(
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère toutes les catégories de services uniques."""
    try:
        logger.info("Récupération des catégories de services")
        
        result = supabase.table('services').select('category').execute()
        
        if result.data:
            categories = sorted(list(set([item['category'] for item in result.data if item['category']])))
            logger.info(f"✅ {len(categories)} catégories trouvées")
            return ERPListResponse(success=True, data=categories, count=len(categories))
        else:
            logger.info("Aucune catégorie trouvée")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des catégories de services: {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")

@router.get("/category/{category}", response_model=ERPListResponse)
async def get_services_by_category(
    category: str,
    supabase: SupabaseClient = Depends(get_supabase_client_dependency)
):
    """Récupère les services par catégorie."""
    try:
        logger.info(f"Récupération des services de la catégorie: {category}")
        
        result = supabase.table('services').select('*').eq('category', category).order('name', desc=False).execute()
        
        if result.data:
            logger.info(f"✅ {len(result.data)} services trouvés pour la catégorie '{category}'")
            return ERPListResponse(success=True, data=result.data, count=len(result.data))
        else:
            logger.info(f"Aucun service trouvé pour la catégorie '{category}'")
            return ERPListResponse(success=True, data=[], count=0)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des services de la catégorie '{category}': {e}")
        return ERPListResponse(success=False, error=f"Erreur serveur: {str(e)}")
