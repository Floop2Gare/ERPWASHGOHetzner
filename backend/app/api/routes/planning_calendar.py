import base64
import math
import time
from datetime import datetime
from typing import Dict, List, Tuple
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import os

from app.core.calendar_config import get_calendar_settings, CalendarSettings
from app.core.dependencies import get_current_user

# Import du service Google Calendar (si disponible)
try:
    from app.services.google_calendar import GoogleCalendarService
    GOOGLE_CALENDAR_AVAILABLE = True
except ImportError:
    GOOGLE_CALENDAR_AVAILABLE = False
    GoogleCalendarService = None


PARIS_TZ = ZoneInfo("Europe/Paris")
UTC_TZ = ZoneInfo("UTC")
_CACHE_STORE: Dict[str, Dict[str, object]] = {}
_CACHE_TTL_KEYS = ("CACHE_TTL_SECONDS", "CALENDAR_CACHE_TTL_SECONDS")


def _get_cache_ttl() -> int:
    for key in _CACHE_TTL_KEYS:
        value = os.getenv(key)
        if value:
            try:
                ttl = int(value)
                if ttl > 0:
                    return ttl
            except ValueError:
                continue
    return 0


def _cache_get(key: str) -> List[dict] | None:
    ttl = _get_cache_ttl()
    if ttl <= 0:
        return None
    cached = _CACHE_STORE.get(key)
    if not cached:
        return None
    expires_at = cached.get("expires_at", 0)
    if expires_at and expires_at > time.time():
        return cached.get("data")  # type: ignore[return-value]
    _CACHE_STORE.pop(key, None)
    return None


def _cache_set(key: str, data: List[dict]) -> None:
    ttl = _get_cache_ttl()
    if ttl <= 0:
        return
    _CACHE_STORE[key] = {
        "data": data,
        "expires_at": time.time() + ttl,
    }


def _parse_iso_datetime(raw_value: str) -> datetime:
    if raw_value.endswith("Z"):
        raw_value = raw_value[:-1] + "+00:00"
    if len(raw_value) == 10:
        raw_value = f"{raw_value}T00:00:00+00:00"
    if "+" not in raw_value and raw_value.endswith("Z") is False:
        raw_value = f"{raw_value}+00:00"
    return datetime.fromisoformat(raw_value)


def _extract_event_time(payload: dict) -> Tuple[str | None, bool]:
    if not payload:
        return None, False
    if "dateTime" in payload and payload["dateTime"]:
        dt = _parse_iso_datetime(payload["dateTime"])
        return dt.astimezone(PARIS_TZ).isoformat(), False
    if "date" in payload and payload["date"]:
        dt = _parse_iso_datetime(payload["date"])
        return dt.astimezone(PARIS_TZ).isoformat(), True
    return None, False


def _convert_optional_datetime(raw_value: str | None) -> str | None:
    if not raw_value:
        return None
    dt = _parse_iso_datetime(raw_value)
    return dt.astimezone(PARIS_TZ).isoformat()


def _normalize_event(event: dict, alias: str) -> dict:
    start, is_all_day = _extract_event_time(event.get("start", {}))
    end, _ = _extract_event_time(event.get("end", {}))
    attendees = [
        {
            "name": attendee.get("displayName"),
            "email": attendee.get("email"),
            "responseStatus": attendee.get("responseStatus", "needsAction"),
        }
        for attendee in event.get("attendees", []) or []
    ]

    return {
        "id": event.get("id", ""),
        "title": event.get("summary", "Sans titre"),
        "description": event.get("description"),  # Description complète maintenant disponible
        "start": start or "",
        "end": end or start or "",
        "allDay": is_all_day,
        "recurrence": "recurring" if event.get("recurrence") else "none",
        "location": event.get("location"),
        "organizer": (event.get("organizer") or {}).get("email") if event.get("organizer") else None,
        "attendees": attendees,
        "htmlLink": event.get("htmlLink"),
        "hangoutLink": event.get("hangoutLink"),  # Lien Google Meet
        "status": event.get("status", "confirmed"),
        "updatedAt": _convert_optional_datetime(event.get("updated")),
        "createdAt": _convert_optional_datetime(event.get("created")),
        "calendar": alias,
        # Champs supplémentaires disponibles
        "colorId": event.get("colorId"),
        "recurrenceRules": event.get("recurrence", []),
        "recurringEventId": event.get("recurringEventId"),
        "iCalUID": event.get("iCalUID"),
        "transparency": event.get("transparency"),
        "visibility": event.get("visibility"),
        "attachments": event.get("attachments", []),
        "reminders": event.get("reminders", {}),
        "conferenceData": event.get("conferenceData"),
        "extendedProperties": event.get("extendedProperties", {}),
    }


def _deduplicate_events(events: List[dict]) -> List[dict]:
    seen: set[str] = set()
    unique: List[dict] = []
    for event in events:
        key = f"{event.get('id','')}_{event.get('calendar','')}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(event)
    return unique


def _decode_page_token(token: str | None) -> int:
    if not token:
        return 0
    try:
        decoded = base64.b64decode(token).decode()
        index = int(decoded)
        return index if index >= 0 else 0
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Token de pagination invalide") from exc


def _encode_page_token(index: int) -> str:
    return base64.b64encode(str(index).encode()).decode()


def _resolve_requested_calendars(
    service: "GoogleCalendarService",
    calendars_param: str | None,
    settings: CalendarSettings,
) -> Tuple[List[str], List[str]]:
    alias_map: Dict[str, Tuple[str, str]] = {}
    for calendar_id, info in service.services.items():
        display_name = str(info.get("name") or calendar_id)
        alias_key = display_name.lower()
        alias_map[alias_key] = (display_name, calendar_id)

    if not alias_map:
        raise HTTPException(
            status_code=500,
            detail="Aucun calendrier Google n'est configuré.",
        )

    requested_keys: List[str]
    if calendars_param and calendars_param.strip().lower() != "all":
        requested_keys = [
            item.strip().lower()
            for item in calendars_param.split(",")
            if item.strip()
        ]
    else:
        defaults = [
            item.strip().lower()
            for item in (settings.default_calendars or "").split(",")
            if item.strip()
        ]
        requested_keys = defaults or list(alias_map.keys())

    invalid = [alias for alias in requested_keys if alias not in alias_map]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Calendriers inconnus: {', '.join(invalid)}",
        )

    unique_aliases: List[str] = []
    calendar_ids: List[str] = []
    for alias_key in requested_keys:
        display_name, calendar_id = alias_map[alias_key]
        if display_name not in unique_aliases:
            unique_aliases.append(display_name)
            calendar_ids.append(calendar_id)

    return unique_aliases, calendar_ids


router = APIRouter(
    prefix="/planning/calendar",
    tags=["planning-calendar"],
)


class CalendarEvent(BaseModel):
    id: str
    title: str
    description: str | None = None
    start: str
    end: str
    allDay: bool
    recurrence: str
    location: str | None = None
    organizer: str | None = None
    attendees: list[dict] = []
    htmlLink: str | None = None
    status: str
    updatedAt: str
    createdAt: str
    calendar: str


class CalendarEventsResponse(BaseModel):
    success: bool
    events: list[CalendarEvent]
    nextPageToken: str | None = None
    range: dict
    source: dict
    pagination: dict


@router.get("/events", response_model=CalendarEventsResponse)
async def get_calendar_events(
    from_: str = Query(..., alias="from", description="Date ISO début de période"),
    to: str = Query(..., description="Date ISO fin de période"),
    calendars: str | None = Query(
        None,
        description="Liste de calendriers (ex: adrien,clement). Si non fourni, utilise CALENDAR_DEFAULT_CALENDARS.",
    ),
    pageSize: int | None = Query(
        None, ge=1, le=1000, description="Taille de page (max 1000)"
    ),
    pageToken: str | None = Query(
        None, description="Token de pagination renvoyé par l'appel précédent"
    ),
    settings: CalendarSettings = Depends(get_calendar_settings),
    current_user: dict = Depends(get_current_user),
):
    """
    Proxy ERP -> API calendrier Node :
    - Construit un GET vers `${CALENDAR_BASE_URL}/api/calendar?endpoint=events`
    - Récupère la réponse JSON telle quelle
    - La renvoie au frontend ERP
    """
    # Si un service externe est configuré, on continue de proxifier la requête
    if settings.base_url:
        params: dict[str, str] = {
            "endpoint": "events",
            "from": from_,
            "to": to,
        }

        if calendars:
            params["calendars"] = calendars
        else:
            params["calendars"] = settings.default_calendars

        if pageSize is not None:
            params["pageSize"] = str(pageSize)
        if pageToken is not None:
            params["pageToken"] = pageToken

        base_url = settings.base_url.rstrip("/")
        url = f"{base_url}/api/calendar"

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(url, params=params)
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Erreur de connexion au service calendrier: {exc}",
                ) from exc

        if resp.status_code != 200:
            try:
                data = resp.json()
            except Exception:
                data = {"message": resp.text}
            raise HTTPException(status_code=resp.status_code, detail=data)

        data = resp.json()
        return data

    # Sinon, on bascule automatiquement sur l'intégration Google Calendar directe
    if not GOOGLE_CALENDAR_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="Service Google Calendar indisponible et aucun CALENDAR_BASE_URL configuré.",
        )

    service = GoogleCalendarService()
    if not getattr(service, "services", None):
        raise HTTPException(
            status_code=500,
            detail="Aucun calendrier Google n'est configuré sur le serveur.",
        )

    try:
        from_date = _parse_iso_datetime(from_)
        to_date = _parse_iso_datetime(to)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="Format de date invalide. Utilisez un format ISO 8601.",
        ) from exc

    if to_date <= from_date:
        raise HTTPException(
            status_code=400,
            detail="Le paramètre 'to' doit être strictement supérieur à 'from'.",
        )

    max_days = settings.max_range_days or 90
    requested_days = (to_date - from_date).total_seconds() / 86400
    if requested_days > max_days:
        raise HTTPException(
            status_code=400,
            detail=f"Période trop longue. Maximum {max_days} jours autorisés.",
        )

    alias_list, calendar_id_list = _resolve_requested_calendars(service, calendars, settings)
    from_utc = from_date.astimezone(UTC_TZ).replace(tzinfo=None)
    to_utc = to_date.astimezone(UTC_TZ).replace(tzinfo=None)
    calendar_id_to_alias = {
        calendar_id: info.get("name") or calendar_id
        for calendar_id, info in service.services.items()
    }
    # Log pour debug
    import sys
    print(f"[DEBUG] calendar_id_to_alias: {calendar_id_to_alias}", file=sys.stderr, flush=True)

    cache_key = f"{from_date.isoformat()}_{to_date.isoformat()}_{'-'.join(alias_list)}"
    # Désactiver temporairement le cache pour forcer la régénération avec les nouveaux alias
    cached_events = None  # _cache_get(cache_key)
    if cached_events is not None:
        normalized_events = cached_events
        warnings: List[str] = []
    else:
        events, warnings = service.get_events(
            calendar_ids=calendar_id_list or None,
            time_min=from_utc,
            time_max=to_utc,
            max_results=2500,
        )
        normalized_events = []
        for event in events:
            # Utiliser calendarName en priorité (défini dans get_events), sinon utiliser le mapping
            calendar_name = event.get("calendarName")
            calendar_id = event.get("calendar", "")
            # calendarName devrait toujours être présent car il est ajouté dans get_events
            if not calendar_name:
                # Si calendarName n'est pas présent, utiliser le mapping
                calendar_name = calendar_id_to_alias.get(calendar_id, calendar_id)
                import sys
                print(f"[DEBUG] calendarName manquant pour {event.get('id', '')[:20]}..., calendar_id: {calendar_id[:50]}..., alias utilisé: {calendar_name}", file=sys.stderr, flush=True)
            alias = calendar_name
            normalized_events.append(_normalize_event(event, alias))
        normalized_events = _deduplicate_events(normalized_events)
        normalized_events.sort(key=lambda item: item.get("start", ""))
        _cache_set(cache_key, normalized_events)

    total_events = len(normalized_events)
    page_size = min(pageSize or 100, 1000)
    start_index = _decode_page_token(pageToken)
    if start_index > total_events:
        start_index = total_events
    end_index = min(start_index + page_size, total_events)
    paginated_events = normalized_events[start_index:end_index]
    next_page_token = _encode_page_token(end_index) if end_index < total_events else None
    total_pages = max(math.ceil(total_events / page_size), 1)
    current_page = min(total_pages, (start_index // page_size) + 1) if total_events else 1

    response = {
        "success": True,
        "events": paginated_events,
        "nextPageToken": next_page_token,
        "range": {
            "from": from_,
            "to": to,
            "timezone": "Europe/Paris",
        },
        "source": {
            "calendars": alias_list,
            "aggregated": True,
            "lastSync": datetime.utcnow().isoformat() + "Z",
            "warnings": warnings,
        },
        "pagination": {
            "currentPage": current_page,
            "totalPages": total_pages,
            "hasNext": bool(next_page_token),
        },
    }

    return response


@router.get("/google-calendar")
async def get_google_calendar_events(
    user: str | None = Query(None, description="Clé utilisateur (clement, adrien, etc.)"),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupère les événements Google Calendar directement depuis l'API Google.
    
    Utilise les variables d'environnement avec Service Accounts :
    - GOOGLE_SA_ADRIEN_JSON : Service Account JSON pour adrien
    - CALENDAR_ID_ADRIEN : ID du calendrier adrien
    - GOOGLE_SA_CLEMENT_JSON : Service Account JSON pour clement
    - CALENDAR_ID_CLEMENT : ID du calendrier clement
    """
    if not GOOGLE_CALENDAR_AVAILABLE:
        return {
            "events": [],
            "warnings": ["Service Google Calendar non disponible. Vérifiez les dépendances."]
        }
    
    try:
        # Initialiser le service (charge automatiquement les Service Accounts depuis les variables d'environnement)
        service = GoogleCalendarService()
        
        # Filtrer par utilisateur si spécifié
        calendar_ids = None
        if user:
            # Mapper l'utilisateur au calendrier correspondant
            user_lower = user.lower()
            if user_lower == 'adrien':
                calendar_id = os.getenv('CALENDAR_ID_ADRIEN')
                if calendar_id:
                    calendar_ids = [calendar_id]
            elif user_lower == 'clement':
                calendar_id = os.getenv('CALENDAR_ID_CLEMENT')
                if calendar_id:
                    calendar_ids = [calendar_id]
        
        # Récupérer les événements (utilise tous les calendriers configurés si calendar_ids est None)
        events, warnings = service.get_events(calendar_ids)
        
        # Formater les événements pour le frontend
        formatted_events = [service.format_event_for_frontend(event) for event in events]
        
        return {
            "events": formatted_events,
            "warnings": warnings
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"[Google Calendar] Erreur: {error_details}")
        return {
            "events": [],
            "warnings": [f"Erreur lors de la récupération des événements: {str(e)}"]
        }


