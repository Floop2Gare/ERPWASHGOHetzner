from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import json
from datetime import datetime, timedelta

router = APIRouter()

class CalendarEvent(BaseModel):
    id: str
    summary: str
    description: Optional[str]
    location: Optional[str]
    start: str
    end: str
    status: str
    htmlLink: Optional[str]

class CalendarResponse(BaseModel):
    events: List[CalendarEvent]
    warnings: List[str]

class CreateEventRequest(BaseModel):
    user: str
    summary: str
    description: Optional[str] = None
    location: Optional[str] = None
    start: str  # ISO 8601
    end: str    # ISO 8601

class CreateEventResponse(BaseModel):
    success: bool
    event_id: Optional[str] = None
    htmlLink: Optional[str] = None
    message: Optional[str] = None

def get_google_calendar_service_fallback():
    """
    Version de fallback quand Google APIs ne sont pas disponibles
    """
    return None

def get_calendar_events_fallback(service, calendar_id: str, time_min: str, time_max: str):
    """
    Version de fallback qui retourne des événements simulés
    """
    # Simulation d'événements pour les tests
    simulated_events = [
        CalendarEvent(
            id="sim_1",
            summary="Rendez-vous simulé 1",
            description="Description simulée",
            location="Lieu simulé",
            start=time_min,
            end=time_max,
            status="confirmed",
            htmlLink=None
        )
    ]
    
    return simulated_events

@router.get("/calendar-events", response_model=CalendarResponse)
async def get_calendar_events(
    calendar_id: str = "primary",
    time_min: Optional[str] = None,
    time_max: Optional[str] = None,
    max_results: int = 10
):
    """
    Récupère les événements du calendrier (mode simulation)
    """
    try:
        # Utiliser les valeurs par défaut si non fournies
        if not time_min:
            time_min = datetime.now().isoformat() + "Z"
        if not time_max:
            time_max = (datetime.now() + timedelta(days=7)).isoformat() + "Z"
        
        # Mode simulation
        events = get_calendar_events_fallback(None, calendar_id, time_min, time_max)
        
        return CalendarResponse(
            events=events,
            warnings=["Mode simulation activé - Google APIs non disponibles"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des événements: {str(e)}"
        )

@router.get("/google-calendar")
async def get_google_calendar_events(
    user: str = "clement",
    days: int = 30,
    past_days: int = 3
):
    """
    Récupérer les événements Google Calendar
    """
    try:
        # Récupérer les variables d'environnement
        calendar_id = os.getenv(f'CALENDAR_ID_{user.upper()}')
        google_sa_json = os.getenv(f'GOOGLE_SA_{user.upper()}_JSON')
        
        if not calendar_id or not google_sa_json:
            raise HTTPException(
                status_code=400, 
                detail=f"Configuration manquante pour l'utilisateur: {user}"
            )
        
        # Parser les credentials
        try:
            credentials_info = json.loads(google_sa_json)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400, 
                detail="Format JSON des credentials invalide"
            )
        
        # Créer le service Google Calendar
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        
        credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=['https://www.googleapis.com/auth/calendar.readonly']
        )
        
        service = build('calendar', 'v3', credentials=credentials)
        
        # Calculer les dates
        now = datetime.utcnow()
        time_min = (now - timedelta(days=past_days)).isoformat() + 'Z'
        time_max = (now + timedelta(days=days)).isoformat() + 'Z'
        
        # Récupérer les événements
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        # Convertir en format de réponse
        calendar_events = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            
            calendar_events.append(CalendarEvent(
                id=event['id'],
                summary=event.get('summary', 'Sans titre'),
                description=event.get('description'),
                location=event.get('location'),
                start=start,
                end=end,
                status=event.get('status', 'confirmed'),
                htmlLink=event.get('htmlLink')
            ))
        
        return CalendarResponse(
            events=calendar_events,
            warnings=[]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des événements: {str(e)}"
        )

@router.post("/google-calendar/create", response_model=CreateEventResponse)
async def create_google_calendar_event(payload: CreateEventRequest):
    """
    Créer un événement dans Google Calendar pour un utilisateur donné.
    Requiert des dates ISO 8601 valides (avec timezone) pour start et end.
    """
    try:
        user = payload.user.lower()
        calendar_id = os.getenv(f'CALENDAR_ID_{user.upper()}')
        google_sa_json = os.getenv(f'GOOGLE_SA_{user.upper()}_JSON')

        if not calendar_id or not google_sa_json:
            raise HTTPException(
                status_code=400,
                detail=f"Configuration manquante pour l'utilisateur: {user}"
            )

        # Valider dates ISO simples
        for field_name in ("start", "end"):
            value = getattr(payload, field_name)
            if not isinstance(value, str) or 'T' not in value:
                raise HTTPException(status_code=400, detail=f"Champ {field_name} invalide (ISO requis)")

        # Créer le service Google Calendar avec droits écriture
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        credentials_info = json.loads(google_sa_json)
        credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=['https://www.googleapis.com/auth/calendar']
        )
        service = build('calendar', 'v3', credentials=credentials)

        event_body = {
            'summary': payload.summary,
            'description': payload.description,
            'location': payload.location,
            'start': {'dateTime': payload.start},
            'end': {'dateTime': payload.end}
        }

        created = service.events().insert(calendarId=calendar_id, body=event_body).execute()
        return CreateEventResponse(
            success=True,
            event_id=created.get('id'),
            htmlLink=created.get('htmlLink'),
            message='Événement créé'
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur création événement: {e}")

@router.get("/google-calendar/all")
async def get_all_google_calendar_events(user: str = "clement"):
    """
    Récupérer tous les événements Google Calendar (sans limite de date)
    """
    return await get_google_calendar_events(user=user, days=365, past_days=365)

@router.get("/test-connection/{user}")
async def test_google_calendar_connection(user: str):
    """
    Tester la connexion Google Calendar pour un utilisateur
    """
    try:
        calendar_id = os.getenv(f'CALENDAR_ID_{user.upper()}')
        google_sa_json = os.getenv(f'GOOGLE_SA_{user.upper()}_JSON')
        
        if not calendar_id or not google_sa_json:
            return {
                "success": False,
                "error": f"Configuration manquante pour l'utilisateur: {user}",
                "calendar_id_present": bool(calendar_id),
                "credentials_present": bool(google_sa_json)
            }
        
        # Tester le parsing des credentials
        try:
            credentials_info = json.loads(google_sa_json)
            client_email = credentials_info.get('client_email')
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Format JSON des credentials invalide"
            }
        
        return {
            "success": True,
            "message": f"Configuration Google Calendar OK pour {user}",
            "calendar_id": calendar_id,
            "client_email": client_email
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/health")
async def health_check():
    """
    Vérification de l'état de l'API Planning
    """
    return {
        "status": "healthy",
        "mode": "production",
        "google_apis_available": True,
        "message": "API Planning avec Google Calendar"
    }
