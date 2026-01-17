"""
Service Google Calendar pour récupérer les événements de plusieurs calendriers
Support pour Service Accounts (recommandé pour serveurs)
"""
import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Scopes nécessaires pour lire les calendriers
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']


class GoogleCalendarService:
    """Service pour interagir avec Google Calendar API via Service Accounts"""
    
    def __init__(self):
        """Initialise le service Google Calendar avec Service Accounts"""
        self.services: Dict[str, Any] = {}  # Cache des services par calendrier
        self._initialize_services()
    
    def _initialize_services(self):
        """Initialise les services pour chaque calendrier avec leur Service Account"""
        # Essayer d'abord les fichiers JSON, puis les variables d'environnement
        # Configuration pour adrien
        adrien_calendar_id = os.getenv('CALENDAR_ID_ADRIEN')
        adrien_sa_json = None
        
        # Essayer de charger depuis un fichier
        adrien_file = os.getenv('GOOGLE_SA_ADRIEN_FILE', '/app/credentials_adrien.json')
        if os.path.exists(adrien_file):
            try:
                with open(adrien_file, 'r') as f:
                    adrien_sa_json = json.dumps(json.load(f))
                    print(f"[Google Calendar] ✅ Fichier Service Account adrien chargé: {adrien_file}")
            except Exception as e:
                print(f"[Google Calendar] ⚠️ Erreur lors du chargement du fichier {adrien_file}: {e}")
        
        # Sinon, essayer depuis la variable d'environnement
        if not adrien_sa_json:
            adrien_sa_json = (
                os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON_ADRIEN')
                or os.getenv('GOOGLE_SA_ADRIEN_JSON')
                or os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON')
            )
        
        # Configuration pour clement
        clement_calendar_id = os.getenv('CALENDAR_ID_CLEMENT')
        clement_sa_json = None
        
        # Essayer de charger depuis un fichier
        clement_file = os.getenv('GOOGLE_SA_CLEMENT_FILE', '/app/credentials_clement.json')
        if os.path.exists(clement_file):
            try:
                with open(clement_file, 'r') as f:
                    clement_sa_json = json.dumps(json.load(f))
                    print(f"[Google Calendar] ✅ Fichier Service Account clement chargé: {clement_file}")
            except Exception as e:
                print(f"[Google Calendar] ⚠️ Erreur lors du chargement du fichier {clement_file}: {e}")
        
        # Sinon, essayer depuis la variable d'environnement
        if not clement_sa_json:
            clement_sa_json = (
                os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON_CLEMENT')
                or os.getenv('GOOGLE_SA_CLEMENT_JSON')
                or os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON')
            )
        
        # Créer un service pour chaque Service Account
        if adrien_sa_json and adrien_calendar_id:
            try:
                # Nettoyer le JSON
                cleaned_json = adrien_sa_json.strip().strip("'").strip('"')
                
                # Essayer de parser directement
                try:
                    sa_info = json.loads(cleaned_json)
                except json.JSONDecodeError:
                    # Si ça échoue, reconstruire le JSON proprement
                    import re
                    # Extraire tous les champs du JSON
                    fields = {}
                    
                    # Extraire chaque champ individuellement
                    for field in ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 
                                 'client_id', 'auth_uri', 'token_uri', 'auth_provider_x509_cert_url', 
                                 'client_x509_cert_url', 'universe_domain']:
                        pattern = f'"{field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"'
                        match = re.search(pattern, cleaned_json)
                        if match:
                            value = match.group(1)
                            # Décoder les échappements
                            value = value.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                            fields[field] = value
                        else:
                            # Essayer sans guillemets
                            pattern = f'"{field}"\\s*:\\s*([^,}}]+)'
                            match = re.search(pattern, cleaned_json)
                            if match:
                                value = match.group(1).strip().strip('"').strip("'")
                                fields[field] = value
                    
                    # Reconstruire le JSON proprement
                    sa_info = {}
                    for key, value in fields.items():
                        if key == 'private_key':
                            # La clé privée doit garder ses retours à la ligne
                            sa_info[key] = value
                        else:
                            sa_info[key] = value
                    
                    # Si on n'a pas réussi à extraire tous les champs, essayer une autre méthode
                    if not sa_info.get('type'):
                        # Dernière tentative : remplacer tous les retours à la ligne par des espaces
                        cleaned_json = cleaned_json.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ')
                        cleaned_json = ' '.join(cleaned_json.split())
                        # Remplacer les \n échappés dans private_key
                        cleaned_json = re.sub(
                            r'"private_key"\s*:\s*"([^"]*)"',
                            lambda m: f'"private_key":"{m.group(1).replace(" ", "\\n")}"',
                            cleaned_json
                        )
                        sa_info = json.loads(cleaned_json)
                credentials = service_account.Credentials.from_service_account_info(
                    sa_info, scopes=SCOPES
                )
                service = build('calendar', 'v3', credentials=credentials)
                self.services[adrien_calendar_id] = {
                    'service': service,
                    'name': 'adrien'
                }
                print(f"[Google Calendar] ✅ Service Account 'adrien' initialisé pour calendrier {adrien_calendar_id[:30]}...")
            except json.JSONDecodeError as e:
                print(f"[Google Calendar] ❌ Erreur JSON pour adrien: {e}")
                print(f"[Google Calendar] JSON reçu (50 premiers caractères): {adrien_sa_json[:50]}...")
            except Exception as e:
                import traceback
                print(f"[Google Calendar] ❌ Erreur lors de l'initialisation du Service Account adrien: {e}")
                print(f"[Google Calendar] Traceback: {traceback.format_exc()}")
        
        if clement_sa_json and clement_calendar_id:
            try:
                # Nettoyer le JSON
                cleaned_json = clement_sa_json.strip().strip("'").strip('"')
                
                # Essayer de parser directement
                try:
                    sa_info = json.loads(cleaned_json)
                except json.JSONDecodeError:
                    # Si ça échoue, reconstruire le JSON proprement
                    import re
                    # Extraire tous les champs du JSON
                    fields = {}
                    
                    # Extraire chaque champ individuellement
                    for field in ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 
                                 'client_id', 'auth_uri', 'token_uri', 'auth_provider_x509_cert_url', 
                                 'client_x509_cert_url', 'universe_domain']:
                        pattern = f'"{field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"'
                        match = re.search(pattern, cleaned_json)
                        if match:
                            value = match.group(1)
                            # Décoder les échappements
                            value = value.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                            fields[field] = value
                        else:
                            # Essayer sans guillemets
                            pattern = f'"{field}"\\s*:\\s*([^,}}]+)'
                            match = re.search(pattern, cleaned_json)
                            if match:
                                value = match.group(1).strip().strip('"').strip("'")
                                fields[field] = value
                    
                    # Reconstruire le JSON proprement
                    sa_info = {}
                    for key, value in fields.items():
                        if key == 'private_key':
                            # La clé privée doit garder ses retours à la ligne
                            sa_info[key] = value
                        else:
                            sa_info[key] = value
                    
                    # Si on n'a pas réussi à extraire tous les champs, essayer une autre méthode
                    if not sa_info.get('type'):
                        # Dernière tentative : remplacer tous les retours à la ligne par des espaces
                        cleaned_json = cleaned_json.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ')
                        cleaned_json = ' '.join(cleaned_json.split())
                        # Remplacer les \n échappés dans private_key
                        cleaned_json = re.sub(
                            r'"private_key"\s*:\s*"([^"]*)"',
                            lambda m: f'"private_key":"{m.group(1).replace(" ", "\\n")}"',
                            cleaned_json
                        )
                        sa_info = json.loads(cleaned_json)
                credentials = service_account.Credentials.from_service_account_info(
                    sa_info, scopes=SCOPES
                )
                service = build('calendar', 'v3', credentials=credentials)
                self.services[clement_calendar_id] = {
                    'service': service,
                    'name': 'clement'
                }
                print(f"[Google Calendar] ✅ Service Account 'clement' initialisé pour calendrier {clement_calendar_id[:30]}...")
            except json.JSONDecodeError as e:
                print(f"[Google Calendar] ❌ Erreur JSON pour clement: {e}")
                print(f"[Google Calendar] JSON reçu (50 premiers caractères): {clement_sa_json[:50]}...")
            except Exception as e:
                import traceback
                print(f"[Google Calendar] ❌ Erreur lors de l'initialisation du Service Account clement: {e}")
                print(f"[Google Calendar] Traceback: {traceback.format_exc()}")
        
        if not self.services:
            print("[Google Calendar] Aucun Service Account configuré. Vérifiez les variables d'environnement.")
    
    def get_events(
        self,
        calendar_ids: Optional[List[str]] = None,
        time_min: Optional[datetime] = None,
        time_max: Optional[datetime] = None,
        max_results: int = 2500
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Récupère les événements de plusieurs calendriers
        
        Args:
            calendar_ids: Liste des IDs de calendriers (optionnel, utilise tous les calendriers configurés si None)
            time_min: Date de début (par défaut: 30 jours dans le passé)
            time_max: Date de fin (par défaut: 365 jours dans le futur)
            max_results: Nombre maximum de résultats par calendrier
        
        Returns:
            Tuple (liste des événements, liste des warnings)
        """
        if not self.services:
            return [], ["Aucun Service Account configuré"]
        
        # Utiliser tous les calendriers configurés si aucun n'est spécifié
        if calendar_ids is None:
            calendar_ids = list(self.services.keys())
        
        if not calendar_ids:
            return [], []
        
        # Dates par défaut
        if time_min is None:
            time_min = datetime.utcnow() - timedelta(days=30)
        if time_max is None:
            time_max = datetime.utcnow() + timedelta(days=365)
        
        all_events = []
        warnings = []
        
        for calendar_id in calendar_ids:
            # Trouver le service correspondant à ce calendrier
            service_info = self.services.get(calendar_id)
            if not service_info:
                warning = f"Calendrier {calendar_id} non configuré. Service Account manquant."
                warnings.append(warning)
                print(f"[Google Calendar] {warning}")
                continue
            
            service = service_info['service']
            calendar_name = service_info['name']
            
            try:
                # Demander tous les champs disponibles pour obtenir plus de détails
                # Vous pouvez aussi spécifier des champs précis comme :
                # fields='items(id,summary,description,location,start,end,attendees,organizer,htmlLink,created,updated,recurrence,attachments,conferenceData,reminders,colorId,status,extendedProperties)'
                events_result = service.events().list(
                    calendarId=calendar_id,
                    timeMin=time_min.isoformat() + 'Z',
                    timeMax=time_max.isoformat() + 'Z',
                    maxResults=max_results,
                    singleEvents=True,
                    orderBy='startTime',
                    fields='items(id,summary,description,location,start,end,attendees,organizer,htmlLink,created,updated,recurrence,attachments,conferenceData,reminders,colorId,status,extendedProperties,hangoutLink,source,transparency,visibility,iCalUID,recurringEventId),nextPageToken'
                ).execute()
                
                events = events_result.get('items', [])
                
                # Ajouter le champ 'calendar' et 'calendarName' à chaque événement
                for event in events:
                    event['calendar'] = calendar_id
                    event['calendarName'] = calendar_name
                    all_events.append(event)
                
                print(f"[Google Calendar] {len(events)} événements récupérés du calendrier {calendar_name}")
                
            except HttpError as error:
                warning = f"Erreur HTTP pour le calendrier {calendar_name} ({calendar_id[:20]}...): {error}"
                warnings.append(warning)
                print(f"[Google Calendar] {warning}")
            except Exception as e:
                warning = f"Erreur inattendue pour le calendrier {calendar_name}: {e}"
                warnings.append(warning)
                print(f"[Google Calendar] {warning}")
        
        # Trier par date de début
        all_events.sort(key=lambda x: x.get('start', {}).get('dateTime') or x.get('start', {}).get('date', ''))
        
        return all_events, warnings
    
    def format_event_for_frontend(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Formate un événement Google Calendar pour le frontend
        
        Args:
            event: Événement brut de Google Calendar API
        
        Returns:
            Événement formaté pour le frontend
        """
        start = event.get('start', {})
        end = event.get('end', {})
        
        # Déterminer si c'est un événement toute la journée
        is_all_day = 'date' in start and 'date' in end
        
        # Extraire les dates/heures
        start_str = start.get('dateTime') or start.get('date', '')
        end_str = end.get('dateTime') or end.get('date', '')
        
        # Formater pour le frontend avec tous les détails disponibles
        formatted = {
            'id': event.get('id', ''),
            'summary': event.get('summary', 'Sans titre'),
            'description': event.get('description'),  # Description complète maintenant disponible
            'location': event.get('location'),
            'start': start_str,
            'end': end_str,
            'allDay': is_all_day,
            'status': event.get('status', 'confirmed'),
            'htmlLink': event.get('htmlLink'),
            'hangoutLink': event.get('hangoutLink'),  # Lien Google Meet si présent
            'calendar': event.get('calendar', ''),
            'created': event.get('created'),
            'updated': event.get('updated'),
            'organizer': event.get('organizer', {}).get('email') if event.get('organizer') else None,
            'colorId': event.get('colorId'),  # ID de couleur du calendrier
            'recurrence': event.get('recurrence', []),  # Règles de récurrence
            'recurringEventId': event.get('recurringEventId'),  # ID de l'événement récurrent parent
            'iCalUID': event.get('iCalUID'),  # Identifiant iCal unique
            'transparency': event.get('transparency'),  # 'opaque' ou 'transparent'
            'visibility': event.get('visibility'),  # 'default', 'public', 'private', 'confidential'
            'attendees': [
                {
                    'email': att.get('email'),
                    'displayName': att.get('displayName'),
                    'responseStatus': att.get('responseStatus'),
                    'organizer': att.get('organizer', False),
                    'optional': att.get('optional', False),
                    'resource': att.get('resource', False),
                    'comment': att.get('comment'),  # Commentaire de l'invité
                }
                for att in event.get('attendees', [])
            ],
            'attachments': [
                {
                    'fileUrl': att.get('fileUrl'),
                    'title': att.get('title'),
                    'mimeType': att.get('mimeType'),
                    'iconLink': att.get('iconLink'),
                    'fileId': att.get('fileId'),
                }
                for att in event.get('attachments', [])
            ],
            'reminders': {
                'useDefault': event.get('reminders', {}).get('useDefault', False),
                'overrides': [
                    {
                        'method': rem.get('method'),  # 'email', 'popup', 'sms'
                        'minutes': rem.get('minutes'),
                    }
                    for rem in event.get('reminders', {}).get('overrides', [])
                ],
            },
            'conferenceData': event.get('conferenceData'),  # Données de conférence (Google Meet, etc.)
            'extendedProperties': event.get('extendedProperties', {}),  # Propriétés étendues personnalisées
            'source': event.get('source', {}),  # Source de l'événement (si importé)
        }
        
        return formatted

