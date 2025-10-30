"""
🔍 Utilitaires de Traçabilité - ERP Wash&Go
Date : 22 janvier 2025
Status : CRITIQUE - Sécurité et monitoring
"""

import uuid
import logging
import re
from datetime import datetime
from typing import Optional, Dict, Any
from contextvars import ContextVar

# Context variables pour le tracing
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
event_id_var: ContextVar[Optional[str]] = ContextVar('event_id', default=None)

logger = logging.getLogger(__name__)

def generate_request_id() -> str:
    """Génère un ID unique pour chaque requête."""
    return f"req_{uuid.uuid4().hex[:12]}"

def generate_event_id() -> str:
    """Génère un ID unique pour chaque événement (ex: Google Calendar)."""
    return f"evt_{uuid.uuid4().hex[:12]}"

def set_request_context(request_id: str, event_id: Optional[str] = None):
    """Définit le contexte de traçabilité pour la requête."""
    request_id_var.set(request_id)
    if event_id:
        event_id_var.set(event_id)

def get_request_id() -> Optional[str]:
    """Récupère l'ID de la requête courante."""
    return request_id_var.get()

def get_event_id() -> Optional[str]:
    """Récupère l'ID de l'événement courant."""
    return event_id_var.get()

def mask_sensitive_data(data: str) -> str:
    """Masque les données sensibles dans les logs."""
    if not data:
        return ""
    
    # Masquer les emails
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    data = re.sub(email_pattern, lambda m: f"{m.group(0)[:2]}***@{m.group(0).split('@')[1]}", data)
    
    # Masquer les téléphones
    phone_pattern = r'(\+?[0-9]{2,3}[-.\s]?)?[0-9]{2,3}[-.\s]?[0-9]{2,3}[-.\s]?[0-9]{2,3}[-.\s]?[0-9]{2,3}'
    data = re.sub(phone_pattern, lambda m: f"{m.group(0)[:2]}***{m.group(0)[-2:]}", data)
    
    # Masquer les SIRET
    siret_pattern = r'\b[0-9]{14}\b'
    data = re.sub(siret_pattern, lambda m: f"{m.group(0)[:4]}***{m.group(0)[-4:]}", data)
    
    return data

def log_operation(
    operation: str,
    resource: str,
    resource_id: Optional[str] = None,
    user_id: Optional[str] = None,
    additional_data: Optional[Dict[str, Any]] = None,
    level: str = "info"
):
    """Log une opération avec traçabilité complète."""
    request_id = get_request_id()
    event_id = get_event_id()
    
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": request_id,
        "event_id": event_id,
        "operation": operation,
        "resource": resource,
        "resource_id": resource_id,
        "user_id": user_id,
        "additional_data": additional_data
    }
    
    # Masquer les données sensibles
    log_message = f"[{request_id}] {operation.upper()} {resource}"
    if resource_id:
        log_message += f" (ID: {resource_id[:8]}...)"
    if event_id:
        log_message += f" [Event: {event_id[:8]}...]"
    
    # Log avec le niveau approprié
    if level == "error":
        logger.error(log_message, extra=log_data)
    elif level == "warning":
        logger.warning(log_message, extra=log_data)
    elif level == "debug":
        logger.debug(log_message, extra=log_data)
    else:
        logger.info(log_message, extra=log_data)

def log_api_call(
    method: str,
    endpoint: str,
    status_code: int,
    duration_ms: float,
    user_id: Optional[str] = None,
    error: Optional[str] = None
):
    """Log un appel API avec métriques."""
    request_id = get_request_id()
    
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": request_id,
        "method": method,
        "endpoint": endpoint,
        "status_code": status_code,
        "duration_ms": duration_ms,
        "user_id": user_id,
        "error": error
    }
    
    level = "error" if status_code >= 400 else "info"
    log_message = f"[{request_id}] {method} {endpoint} → {status_code} ({duration_ms:.2f}ms)"
    
    if error:
        log_message += f" - Error: {mask_sensitive_data(error)}"
    
    if level == "error":
        logger.error(log_message, extra=log_data)
    else:
        logger.info(log_message, extra=log_data)

def log_database_operation(
    operation: str,
    table: str,
    record_id: Optional[str] = None,
    success: bool = True,
    error: Optional[str] = None
):
    """Log une opération base de données."""
    request_id = get_request_id()
    event_id = get_event_id()
    
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": request_id,
        "event_id": event_id,
        "operation": operation,
        "table": table,
        "record_id": record_id,
        "success": success,
        "error": error
    }
    
    level = "error" if not success else "info"
    log_message = f"[{request_id}] DB {operation.upper()} {table}"
    if record_id:
        log_message += f" (ID: {record_id[:8]}...)"
    if event_id:
        log_message += f" [Event: {event_id[:8]}...]"
    
    if not success and error:
        log_message += f" - Error: {mask_sensitive_data(error)}"
    
    if level == "error":
        logger.error(log_message, extra=log_data)
    else:
        logger.info(log_message, extra=log_data)

def log_google_calendar_event(
    event_id: str,
    operation: str,
    calendar_id: str,
    success: bool = True,
    error: Optional[str] = None
):
    """Log une opération Google Calendar."""
    request_id = get_request_id()
    
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": request_id,
        "event_id": event_id,
        "operation": operation,
        "calendar_id": calendar_id,
        "success": success,
        "error": error
    }
    
    level = "error" if not success else "info"
    log_message = f"[{request_id}] GCAL {operation.upper()} Event {event_id[:8]}... in {calendar_id}"
    
    if not success and error:
        log_message += f" - Error: {mask_sensitive_data(error)}"
    
    if level == "error":
        logger.error(log_message, extra=log_data)
    else:
        logger.info(log_message, extra=log_data)

def create_trace_context() -> Dict[str, str]:
    """Crée un contexte de traçabilité pour les réponses API."""
    return {
        "request_id": get_request_id() or "unknown",
        "event_id": get_event_id() or "none",
        "timestamp": datetime.utcnow().isoformat()
    }

