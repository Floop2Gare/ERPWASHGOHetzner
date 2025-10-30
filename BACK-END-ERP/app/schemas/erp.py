from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# Enums pour les statuts
class ClientType(str, Enum):
    COMPANY = "company"
    INDIVIDUAL = "individual"

class ClientStatus(str, Enum):
    ACTIF = "Actif"
    PROSPECT = "Prospect"

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class SupportType(str, Enum):
    MOBILE = "mobile"
    STATIONARY = "stationary"

class AppointmentKind(str, Enum):
    SERVICE = "service"
    QUOTE = "quote"
    MAINTENANCE = "maintenance"

class LeadStatus(str, Enum):
    NOUVEAU = "Nouveau"
    EN_COURS = "En cours"
    CONVERTI = "Converti"
    PERDU = "Perdu"

# Modèles de base
class Contact(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: Optional[str] = None
    mobile: Optional[str] = None
    roles: List[str] = []
    isBillingDefault: bool = False
    active: bool = True

class ServiceOption(BaseModel):
    id: str
    name: str
    price: float
    duration: int  # en minutes
    active: bool = True

class Activity(BaseModel):
    id: str
    type: str
    description: str
    date: datetime
    user: str

# Modèles pour les requêtes
class ClientCreate(BaseModel):
    id: str
    type: ClientType
    name: str
    companyName: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    siret: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    status: ClientStatus = ClientStatus.ACTIF
    tags: List[str] = []
    lastService: Optional[str] = None
    contacts: List[Contact] = []

class ClientUpdate(BaseModel):
    type: Optional[ClientType] = None
    name: Optional[str] = None
    companyName: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    siret: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    status: Optional[ClientStatus] = None
    tags: Optional[List[str]] = None
    lastService: Optional[str] = None
    contacts: Optional[List[Contact]] = None

class ServiceCreate(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    active: bool = True
    options: List[ServiceOption] = []

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    active: Optional[bool] = None
    options: Optional[List[ServiceOption]] = None

class AppointmentCreate(BaseModel):
    id: str
    clientId: str
    serviceId: str
    optionIds: List[str] = []
    scheduledAt: datetime
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    companyId: Optional[str] = None
    kind: AppointmentKind = AppointmentKind.SERVICE
    supportType: Optional[SupportType] = None
    supportDetail: Optional[str] = None
    additionalCharge: float = 0.0
    contactIds: List[str] = []
    assignedUserIds: List[str] = []
    sendHistory: List[Dict[str, Any]] = []
    invoiceNumber: Optional[str] = None
    invoiceVatEnabled: bool = True
    quoteNumber: Optional[str] = None
    quoteStatus: Optional[str] = None
    mobileDurationMinutes: Optional[int] = None
    mobileCompletionComment: Optional[str] = None
    planningUser: str
    startTime: datetime

class AppointmentUpdate(BaseModel):
    clientId: Optional[str] = None
    serviceId: Optional[str] = None
    optionIds: Optional[List[str]] = None
    scheduledAt: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    companyId: Optional[str] = None
    kind: Optional[AppointmentKind] = None
    supportType: Optional[SupportType] = None
    supportDetail: Optional[str] = None
    additionalCharge: Optional[float] = None
    contactIds: Optional[List[str]] = None
    assignedUserIds: Optional[List[str]] = None
    sendHistory: Optional[List[Dict[str, Any]]] = None
    invoiceNumber: Optional[str] = None
    invoiceVatEnabled: Optional[bool] = None
    quoteNumber: Optional[str] = None
    quoteStatus: Optional[str] = None
    mobileDurationMinutes: Optional[int] = None
    mobileCompletionComment: Optional[str] = None
    planningUser: Optional[str] = None
    startTime: Optional[datetime] = None

class CompanyCreate(BaseModel):
    id: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    postalCode: Optional[str] = None
    city: Optional[str] = None
    siret: Optional[str] = None
    vatNumber: Optional[str] = None
    legalNotes: Optional[str] = None
    vatEnabled: bool = True
    website: Optional[str] = None
    isDefault: bool = False
    documentHeaderTitle: Optional[str] = None
    logoUrl: Optional[str] = None
    invoiceLogoUrl: Optional[str] = None
    bankName: Optional[str] = None
    bankAddress: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None
    planningUser: Optional[str] = None

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    postalCode: Optional[str] = None
    city: Optional[str] = None
    siret: Optional[str] = None
    vatNumber: Optional[str] = None
    legalNotes: Optional[str] = None
    vatEnabled: Optional[bool] = None
    website: Optional[str] = None
    isDefault: Optional[bool] = None
    documentHeaderTitle: Optional[str] = None
    logoUrl: Optional[str] = None
    invoiceLogoUrl: Optional[str] = None
    bankName: Optional[str] = None
    bankAddress: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None
    planningUser: Optional[str] = None

class LeadCreate(BaseModel):
    id: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    status: LeadStatus = LeadStatus.NOUVEAU
    owner: Optional[str] = None
    segment: Optional[str] = None
    tags: List[str] = []
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    activities: List[Activity] = []

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    status: Optional[LeadStatus] = None
    owner: Optional[str] = None
    segment: Optional[str] = None
    tags: Optional[List[str]] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    activities: Optional[List[Activity]] = None

# Modèles de réponse
class ERPResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ERPListResponse(BaseModel):
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    count: Optional[int] = None
