"""
API pour la création et gestion des événements Google Calendar
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import os
import json
import logging
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

router = APIRouter()
logger = logging.getLogger(__name__)

# Scopes pour Google Calendar
SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
]

# Modèles Pydantic
class CalendarEventRequest(BaseModel):
    planning_user: str  # 'clement' ou 'adrien'
    title: str
    description: str
    start_time: str  # Format ISO: 2024-01-15T09:00:00Z
    end_time: str    # Format ISO: 2024-01-15T11:30:00Z
    location: Optional[str] = None

class CalendarEventResponse(BaseModel):
    success: bool
    event_id: Optional[str] = None
    event_link: Optional[str] = None
    error: Optional[str] = None

def get_calendar_config(user: str):
    """Récupère la configuration du calendrier pour un utilisateur"""
    configs = {
        'adrien': {
            'calendar_id': os.getenv('CALENDAR_ID_ADRIEN'),
            'service_account_json': os.getenv('GOOGLE_SA_ADRIEN_JSON'),
        },
        'clement': {
            'calendar_id': os.getenv('CALENDAR_ID_CLEMENT'),
            'service_account_json': os.getenv('GOOGLE_SA_CLEMENT_JSON'),
        },
    }
    return configs.get(user.lower())

def parse_service_account(json_str: str):
    """Parse le JSON du compte de service"""
    try:
        credentials = json.loads(json_str)
        return credentials
    except json.JSONDecodeError:
        return None

def validate_and_format_dates(start_time: str, end_time: str):
    """
    Valide et formate les dates pour Google Calendar API
    """
    import re
    from datetime import datetime
    
    # Vérifier le format ISO
    iso_pattern = r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
    
    if not re.match(iso_pattern, start_time):
        raise ValueError(f"Format de date invalide pour start_time: {start_time}")
    
    if not re.match(iso_pattern, end_time):
        raise ValueError(f"Format de date invalide pour end_time: {end_time}")
    
    # S'assurer qu'il y a un timezone
    if not start_time.endswith('Z') and '+' not in start_time and 'Z' not in start_time:
        start_time += '+01:00'  # Timezone par défaut Europe/Paris
    
    if not end_time.endswith('Z') and '+' not in end_time and 'Z' not in end_time:
        end_time += '+01:00'
    
    return start_time, end_time

def get_valid_calendar_id(service, planning_user: str):
    """
    Récupère un calendar ID valide
    """
    try:
        # Essayer d'abord avec 'primary' (plus fiable)
        calendar = service.calendars().get(calendarId='primary').execute()
        logger.info(f"✅ Utilisation du calendrier principal: {calendar.get('summary', 'Primary')}")
        return 'primary'
    except HttpError as e:
        logger.warning(f"❌ Erreur avec le calendrier principal: {e}")
        
        # Lister les calendriers disponibles
        try:
            calendar_list = service.calendarList().list().execute()
            calendars = calendar_list.get('items', [])
            
            logger.info("📅 Calendriers disponibles:")
            for cal in calendars:
                logger.info(f"  - {cal['id']}: {cal.get('summary', 'Sans nom')}")
            
            # Utiliser le premier calendrier disponible
            if calendars:
                calendar_id = calendars[0]['id']
                logger.info(f"✅ Utilisation du calendrier: {calendar_id}")
                return calendar_id
            else:
                raise Exception("Aucun calendrier accessible")
                
        except Exception as e:
            logger.error(f"❌ Erreur lors de la récupération des calendriers: {e}")
            raise Exception("Impossible d'accéder aux calendriers")

async def create_google_calendar_event(
    planning_user: str,
    title: str,
    description: str,
    start_time: str,
    end_time: str,
    location: str = None
) -> Dict[str, Any]:
    """
    Crée un événement dans Google Calendar (version améliorée)
    """
    try:
        # 1. Valider les données d'entrée
        if not title:
            raise ValueError("Le champ title est requis")
        if not start_time:
            raise ValueError("Le champ start_time est requis")
        if not end_time:
            raise ValueError("Le champ end_time est requis")
        
        # 2. Valider et formater les dates
        start_time, end_time = validate_and_format_dates(start_time, end_time)
        
        # 3. Vérifier que start_time < end_time
        from datetime import datetime
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        
        if start_dt >= end_dt:
            raise ValueError("L'heure de début doit être antérieure à l'heure de fin")
        
        # 4. Récupérer la configuration pour l'utilisateur
        config = get_calendar_config(planning_user)
        if not config or not config['service_account_json']:
            raise Exception(f"Configuration manquante pour l'utilisateur: {planning_user}")
        
        # 5. Parser les credentials
        credentials_data = parse_service_account(config['service_account_json'])
        if not credentials_data:
            raise Exception("Erreur lors du parsing des credentials")
        
        # 6. Créer les credentials
        credentials = service_account.Credentials.from_service_account_info(
            credentials_data,
            scopes=SCOPES
        )
        
        # 7. Construire le service Google Calendar
        service = build('calendar', 'v3', credentials=credentials)
        
        # 8. Construire l'événement
        event = {
            'summary': title,
            'description': description or '',
            'start': {
                'dateTime': start_time,
                'timeZone': 'Europe/Paris'
            },
            'end': {
                'dateTime': end_time,
                'timeZone': 'Europe/Paris'
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},  # 24h avant
                    {'method': 'popup', 'minutes': 30}        # 30min avant
                ]
            }
        }
        
        # Ajouter la localisation si fournie
        if location:
            event['location'] = location
        
        # 9. Récupérer un calendar ID valide
        calendar_id = get_valid_calendar_id(service, planning_user)
        
        # 10. Créer l'événement avec gestion d'erreurs détaillée
        logger.info(f"🔄 Création de l'événement dans le calendrier: {calendar_id}")
        logger.info(f"📅 Événement: {event}")
        
        created_event = service.events().insert(
            calendarId=calendar_id,
            body=event
        ).execute()
        
        logger.info(f"✅ Événement créé avec succès: {created_event['id']}")
        return created_event
        
    except HttpError as e:
        logger.error(f"❌ Erreur Google Calendar API:")
        logger.error(f"   Code: {e.resp.status}")
        logger.error(f"   Détails: {e.error_details}")
        logger.error(f"   Message: {e}")
        
        # Analyser l'erreur spécifique
        if e.resp.status == 400:
            logger.error("🔍 Erreur 400 - Données mal formatées")
            logger.error("   Vérifiez le format des dates et des champs requis")
        elif e.resp.status == 403:
            logger.error("🔍 Erreur 403 - Permissions insuffisantes")
            logger.error("   Vérifiez les scopes et les permissions du calendrier")
        elif e.resp.status == 404:
            logger.error("🔍 Erreur 404 - Calendrier non trouvé")
            logger.error("   Vérifiez l'ID du calendrier")
        
        raise Exception(f"Erreur Google Calendar API: {e}")
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la création de l'événement: {e}")
        raise

@router.post("/create-event", response_model=CalendarEventResponse)
async def create_calendar_event(event_data: CalendarEventRequest):
    """
    Crée un événement Google Calendar
    """
    try:
        # Créer l'événement Google Calendar
        calendar_event = await create_google_calendar_event(
            planning_user=event_data.planning_user,
            title=event_data.title,
            description=event_data.description,
            start_time=event_data.start_time,
            end_time=event_data.end_time,
            location=event_data.location
        )
        
        return CalendarEventResponse(
            success=True,
            event_id=calendar_event.get('id'),
            event_link=calendar_event.get('htmlLink')
        )
        
    except Exception as e:
        logger.error(f"Erreur lors de la création de l'événement: {str(e)}")
        return CalendarEventResponse(
            success=False,
            error=str(e)
        )

@router.get("/test-connection/{user}")
async def test_calendar_connection(user: str):
    """
    Teste la connexion Google Calendar pour un utilisateur
    """
    try:
        config = get_calendar_config(user)
        if not config:
            return {"success": False, "error": f"Configuration non trouvée pour {user}"}
        
        credentials_data = parse_service_account(config['service_account_json'])
        if not credentials_data:
            return {"success": False, "error": "Erreur de parsing des credentials"}
        
        credentials = service_account.Credentials.from_service_account_info(
            credentials_data,
            scopes=SCOPES
        )
        
        service = build('calendar', 'v3', credentials=credentials)
        
        # Test simple de connexion
        calendar = service.calendars().get(calendarId=config['calendar_id']).execute()
        
        return {
            "success": True,
            "calendar_name": calendar.get('summary', 'Sans nom'),
            "calendar_id": config['calendar_id']
        }
        
    except Exception as e:
        logger.error(f"Erreur de test de connexion: {e}")
        return {"success": False, "error": str(e)}

@router.delete("/delete-event/{user}/{event_id}")
async def delete_calendar_event(user: str, event_id: str):
    """
    Supprime un événement Google Calendar
    """
    try:
        config = get_calendar_config(user)
        if not config:
            raise HTTPException(status_code=404, detail=f"Configuration non trouvée pour {user}")
        
        credentials_data = parse_service_account(config['service_account_json'])
        if not credentials_data:
            raise HTTPException(status_code=500, detail="Erreur de parsing des credentials")
        
        credentials = service_account.Credentials.from_service_account_info(
            credentials_data,
            scopes=SCOPES
        )
        
        service = build('calendar', 'v3', credentials=credentials)
        
        # Supprimer l'événement
        service.events().delete(
            calendarId=config['calendar_id'],
            eventId=event_id
        ).execute()
        
        return {"success": True, "message": "Événement supprimé avec succès"}
        
    except HttpError as e:
        if e.resp.status == 404:
            return {"success": False, "error": "Événement non trouvé"}
        else:
            return {"success": False, "error": f"Erreur Google Calendar: {e}"}
    except Exception as e:
        logger.error(f"Erreur lors de la suppression: {e}")
        return {"success": False, "error": str(e)}

@router.post("/debug-create-event")
async def debug_create_event(event_data: dict):
    """
    Endpoint de debug pour tester la création d'événement
    """
    try:
        logger.info("🔍 Debug - Données reçues:")
        logger.info(f"   planning_user: {event_data.get('planning_user')}")
        logger.info(f"   title: {event_data.get('title')}")
        logger.info(f"   start_time: {event_data.get('start_time')}")
        logger.info(f"   end_time: {event_data.get('end_time')}")
        logger.info(f"   location: {event_data.get('location')}")
        
        # Valider les données
        if not event_data.get('planning_user'):
            return {"success": False, "error": "planning_user requis"}
        
        if not event_data.get('title'):
            return {"success": False, "error": "title requis"}
        
        if not event_data.get('start_time'):
            return {"success": False, "error": "start_time requis"}
        
        if not event_data.get('end_time'):
            return {"success": False, "error": "end_time requis"}
        
        # Tester la création
        result = await create_google_calendar_event(
            planning_user=event_data['planning_user'],
            title=event_data['title'],
            description=event_data.get('description', ''),
            start_time=event_data['start_time'],
            end_time=event_data['end_time'],
            location=event_data.get('location')
        )
        
        return {
            "success": True,
            "event_id": result['id'],
            "event_link": result.get('htmlLink'),
            "debug_info": {
                "calendar_id": result.get('organizer', {}).get('email'),
                "created_time": result.get('created'),
                "start_time": result.get('start'),
                "end_time": result.get('end')
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur debug: {e}")
        return {"success": False, "error": str(e)}

@router.get("/list-events/{user}")
async def list_user_events(user: str, max_results: int = 10):
    """
    Liste les événements d'un utilisateur
    """
    try:
        config = get_calendar_config(user)
        if not config:
            raise HTTPException(status_code=404, detail=f"Configuration non trouvée pour {user}")
        
        credentials_data = parse_service_account(config['service_account_json'])
        if not credentials_data:
            raise HTTPException(status_code=500, detail="Erreur de parsing des credentials")
        
        credentials = service_account.Credentials.from_service_account_info(
            credentials_data,
            scopes=SCOPES
        )
        
        service = build('calendar', 'v3', credentials=credentials)
        
        # Utiliser le calendar ID valide
        calendar_id = get_valid_calendar_id(service, user)
        
        # Récupérer les événements
        events_result = service.events().list(
            calendarId=calendar_id,
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        formatted_events = []
        for event in events:
            formatted_events.append({
                'id': event.get('id'),
                'summary': event.get('summary'),
                'start': event.get('start', {}).get('dateTime', event.get('start', {}).get('date')),
                'end': event.get('end', {}).get('dateTime', event.get('end', {}).get('date')),
                'description': event.get('description'),
                'location': event.get('location'),
                'htmlLink': event.get('htmlLink')
            })
        
        return {"events": formatted_events, "count": len(formatted_events)}
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des événements: {e}")
        raise HTTPException(status_code=500, detail=str(e))
