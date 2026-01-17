# Schémas Pydantic pour la validation des données
# Exporte les schémas depuis base.py et erp.py

# Schémas de base (simples)
from .base import (
    ClientBase,
    ClientCreate as ClientCreateBase,
    Client as ClientBaseModel,
    ServiceOption as ServiceOptionBase,
    ServiceBase,
    Service as ServiceBaseModel,
    EngagementBase,
    Engagement,
    Slot,
    AuthPayload,
    LoginRequest,
    StatsSummary,
)

# Schémas ERP (complets avec enums)
from .erp import (
    # Enums
    ClientType,
    ClientStatus,
    AppointmentStatus,
    SupportType,
    AppointmentKind,
    LeadStatus,
    # Modèles
    Contact,
    ServiceOption,
    Activity,
    ClientCreate,
    ClientUpdate,
    ServiceCreate,
    ServiceUpdate,
    AppointmentCreate,
    AppointmentUpdate,
    CompanyCreate,
    CompanyUpdate,
    LeadCreate,
    LeadUpdate,
    UserCreate,
    UserUpdate,
    UserPasswordUpdate,
    UserResponse,
    # Réponses API
    ERPResponse,
    ERPListResponse,
)

__all__ = [
    # Base schemas
    "ClientBase",
    "ClientCreateBase",
    "ClientBaseModel",
    "ServiceOptionBase",
    "ServiceBase",
    "ServiceBaseModel",
    "EngagementBase",
    "Engagement",
    "Slot",
    "AuthPayload",
    "LoginRequest",
    "StatsSummary",
    # ERP enums
    "ClientType",
    "ClientStatus",
    "AppointmentStatus",
    "SupportType",
    "AppointmentKind",
    "LeadStatus",
    # ERP models
    "Contact",
    "ServiceOption",
    "Activity",
    "ClientCreate",
    "ClientUpdate",
    "ServiceCreate",
    "ServiceUpdate",
    "AppointmentCreate",
    "AppointmentUpdate",
    "CompanyCreate",
    "CompanyUpdate",
    "LeadCreate",
    "LeadUpdate",
    "UserCreate",
    "UserUpdate",
    "UserPasswordUpdate",
    "UserResponse",
    "ERPResponse",
    "ERPListResponse",
]
