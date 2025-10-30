from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import json
from datetime import datetime, timedelta
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build

router = APIRouter()

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']


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
        if isinstance(credentials.get('private_key'), str):
            credentials['private_key'] = credentials['private_key'].replace('\\n', '\n')
        return credentials
    except json.JSONDecodeError:
        return None


def fetch_google_calendar_events(user: str, days: int = 365, past_days: int = 365):
    """Récupère les événements Google Calendar pour un utilisateur"""
    config = get_calendar_config(user)
    if not config or not config['calendar_id'] or not config['service_account_json']:
        return [], [f"Configuration manquante pour l'utilisateur: {user}"]
    
    credentials_data = parse_service_account(config['service_account_json'])
    if not credentials_data:
        return [], ["Erreur lors du parsing des credentials"]
    
    try:
        credentials = service_account.Credentials.from_service_account_info(
            credentials_data,
            scopes=SCOPES
        )
        
        service = build('calendar', 'v3', credentials=credentials)
        
        # Calculer la plage de dates
        now = datetime.utcnow()
        time_min = (now - timedelta(days=past_days)).isoformat() + 'Z'
        time_max = (now + timedelta(days=days)).isoformat() + 'Z'
        
        events_result = service.events().list(
            calendarId=config['calendar_id'],
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime',
            maxResults=2500
        ).execute()
        
        events = events_result.get('items', [])
        
        formatted_events = []
        for event in events:
            start = event.get('start', {})
            end = event.get('end', {})
            
            # Gérer les événements sur toute la journée
            if 'date' in start:
                start_str = start['date']
                end_str = end.get('date', start['date'])
            else:
                start_str = start.get('dateTime', '')
                end_str = end.get('dateTime', '')
            
            formatted_events.append(CalendarEvent(
                id=event.get('id', ''),
                summary=event.get('summary', 'Événement sans titre'),
                description=event.get('description'),
                location=event.get('location'),
                start=start_str,
                end=end_str,
                status=event.get('status', 'confirmed'),
                htmlLink=event.get('htmlLink')
            ))
        
        return formatted_events, []
    
    except Exception as e:
        return [], [f"Erreur lors de la récupération des événements: {str(e)}"]


@router.get('/google-calendar', response_model=CalendarResponse)
def get_google_calendar(
    user: Optional[str] = None,
    days: int = 365,
    past_days: int = 365
):
    """
    Récupère les événements Google Calendar
    
    Args:
        user: Nom de l'utilisateur ('adrien' ou 'clement')
        days: Nombre de jours futurs à récupérer (défaut: 365)
        past_days: Nombre de jours passés à récupérer (défaut: 365)
    """
    events = []
    warnings = []
    
    if user:
        # Utilisateur spécifique
        user_events, user_warnings = fetch_google_calendar_events(user, days, past_days)
        events.extend(user_events)
        warnings.extend(user_warnings)
    else:
        # Tous les utilisateurs
        for user_name in ['adrien', 'clement']:
            user_events, user_warnings = fetch_google_calendar_events(user_name, days, past_days)
            events.extend(user_events)
            warnings.extend(user_warnings)
    
    return CalendarResponse(events=events, warnings=warnings)


@router.get('/google-calendar/all', response_model=CalendarResponse)
def get_all_google_calendar_events(
    user: Optional[str] = None,
    max_results: int = 2500
):
    """
    Récupère TOUS les événements Google Calendar (passé et futur)
    
    Args:
        user: Nom de l'utilisateur ('adrien' ou 'clement')
        max_results: Nombre maximum d'événements à récupérer (défaut: 2500)
    """
    events = []
    warnings = []
    
    if user:
        # Utilisateur spécifique - récupérer TOUS les événements
        user_events, user_warnings = fetch_all_google_calendar_events(user, max_results)
        events.extend(user_events)
        warnings.extend(user_warnings)
    else:
        # Tous les utilisateurs
        for user_name in ['adrien', 'clement']:
            user_events, user_warnings = fetch_all_google_calendar_events(user_name, max_results)
            events.extend(user_events)
            warnings.extend(user_warnings)
    
    return CalendarResponse(events=events, warnings=warnings)


def fetch_all_google_calendar_events(user: str, max_results: int = 2500):
    """Récupère TOUS les événements Google Calendar pour un utilisateur"""
    config = get_calendar_config(user)
    if not config or not config['calendar_id'] or not config['service_account_json']:
        return [], [f"Configuration manquante pour l'utilisateur: {user}"]
    
    credentials_data = parse_service_account(config['service_account_json'])
    if not credentials_data:
        return [], ["Erreur lors du parsing des credentials"]
    
    try:
        credentials = service_account.Credentials.from_service_account_info(
            credentials_data,
            scopes=SCOPES
        )
        
        service = build('calendar', 'v3', credentials=credentials)
        
        # Récupérer TOUS les événements (pas de limite de date)
        events_result = service.events().list(
            calendarId=config['calendar_id'],
            singleEvents=True,
            orderBy='startTime',
            maxResults=max_results
        ).execute()
        
        events = events_result.get('items', [])
        
        formatted_events = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            
            formatted_events.append(CalendarEvent(
                id=event.get('id', ''),
                summary=event.get('summary', 'Sans titre'),
                description=event.get('description'),
                location=event.get('location'),
                start=start,
                end=end,
                status=event.get('status', 'confirmed'),
                htmlLink=event.get('htmlLink')
            ))
        
        return formatted_events, []
    
    except Exception as e:
        return [], [f"Erreur lors de la récupération des événements: {str(e)}"]


@router.get('/slots')
def list_slots():
    """Liste les créneaux (legacy endpoint)"""
    return []
