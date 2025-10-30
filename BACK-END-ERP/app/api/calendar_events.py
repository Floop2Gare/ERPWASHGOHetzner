"""
API pour la création et gestion des événements Google Calendar
Version sans dépendances Google pour déploiement rapide
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import os
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Modèles Pydantic
class CalendarEventRequest(BaseModel):
    planning_user: str  # 'clement' ou 'adrien'
    title: str
    description: str
    start_datetime: datetime
    end_datetime: datetime
    location: Optional[str] = None
    client_name: Optional[str] = None
    service_type: Optional[str] = None

class CalendarEventResponse(BaseModel):
    success: bool
    event_id: Optional[str] = None
    message: str
    calendar_link: Optional[str] = None

# Fonction de fallback quand Google APIs ne sont pas disponibles
def create_calendar_event_fallback(event_data: CalendarEventRequest) -> CalendarEventResponse:
    """
    Version de fallback qui simule la création d'événement
    """
    logger.warning("Google APIs non disponibles - mode simulation activé")
    
    # Simulation d'un ID d'événement
    simulated_event_id = f"sim_{int(datetime.now().timestamp())}"
    
    return CalendarEventResponse(
        success=True,
        event_id=simulated_event_id,
        message="Mode simulation activé - Google APIs non disponibles",
        calendar_link=None
    )

@router.post("/create-event", response_model=CalendarEventResponse)
async def create_calendar_event(event_data: CalendarEventRequest):
    """
    Crée un événement dans Google Calendar (mode simulation)
    """
    try:
        logger.info(f"Tentative de création d'événement: {event_data.title}")
        
        # Utiliser la fonction de fallback
        result = create_calendar_event_fallback(event_data)
        
        logger.info(f"Événement créé avec succès (simulation): {result.event_id}")
        return result
        
    except Exception as e:
        logger.error(f"Erreur lors de la création de l'événement: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la création de l'événement: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """
    Vérification de l'état de l'API Calendar
    """
    return {
        "status": "healthy",
        "mode": "simulation",
        "google_apis_available": False,
        "message": "API Calendar en mode simulation"
    }
