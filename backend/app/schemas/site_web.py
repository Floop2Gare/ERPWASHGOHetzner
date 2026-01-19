"""
Schémas Pydantic pour l'API Site Web
Validation des données provenant du site web Wash&Go
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum
from decimal import Decimal


# Enums pour les statuts
class AuthProvider(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"
    APPLE = "apple"
    MICROSOFT = "microsoft"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class ServiceType(str, Enum):
    VOITURE = "voiture"
    CANAPE = "canape"
    TEXTILE = "textile"
    VITRES = "vitres"
    IMMOBILIER = "immobilier"
    BATIMENT = "batiment"


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ReferralStatus(str, Enum):
    PENDING = "pending"
    VALIDATED = "validated"
    REJECTED = "rejected"
    EXPIRED = "expired"


class CreditTransactionType(str, Enum):
    EARNED = "earned"
    USED = "used"
    EXPIRED = "expired"


class CreditSource(str, Enum):
    REFERRAL = "referral"
    LOYALTY = "loyalty"


class ContactPreference(str, Enum):
    EMAIL = "email"
    PHONE = "phone"
    SMS = "sms"
    WHATSAPP = "whatsapp"


class RegistrationSource(str, Enum):
    WEBSITE = "website"
    MOBILE_APP = "mobile_app"
    ADMIN = "admin"
    API = "api"


# Modèles pour les données imbriquées
class ServiceSelection(BaseModel):
    step: str
    value: str


class ReferralHistoryItem(BaseModel):
    referred_email: str
    referred_name: str
    status: ReferralStatus
    validated_at: Optional[datetime] = None
    reward_earned: Decimal = Decimal("0.00")


class CreditTransactionItem(BaseModel):
    type: CreditTransactionType
    source: CreditSource
    amount: Decimal
    description: str
    order_id: Optional[str] = None
    transaction_date: datetime


class ContactHistoryItem(BaseModel):
    type: Literal["email", "phone", "sms"]
    subject: str
    sent_at: datetime
    status: Literal["sent", "delivered", "read", "failed"]


# Modèles principaux pour les requêtes API
class SiteWebUserCreate(BaseModel):
    user_id: str = Field(..., description="Identifiant unique du client")
    email: EmailStr = Field(..., description="Email du client (unique)")
    password_hash: Optional[str] = Field(None, description="Hash du mot de passe (si compte email/password)")
    auth_provider: AuthProvider = Field(..., description="Provider d'authentification")
    provider_user_id: Optional[str] = Field(None, description="ID utilisateur du provider OAuth")
    
    # Informations personnelles
    prenom: str = Field(..., description="Prénom du client")
    nom: str = Field(..., description="Nom du client")
    name: Optional[str] = Field(None, description="Nom complet")
    phone: Optional[str] = Field(None, description="Numéro de téléphone")
    profile_photo_url: Optional[str] = Field(None, description="URL de la photo de profil")
    
    # Adresse
    address_full: Optional[str] = Field(None, description="Adresse complète")
    address_street: Optional[str] = Field(None, description="Rue et numéro")
    address_city: Optional[str] = Field(None, description="Ville")
    address_postal_code: Optional[str] = Field(None, description="Code postal")
    address_complement: Optional[str] = Field(None, description="Complément d'adresse")
    address_latitude: Optional[float] = Field(None, description="Latitude")
    address_longitude: Optional[float] = Field(None, description="Longitude")
    address_verified: bool = Field(False, description="Adresse vérifiée")
    
    # OAuth spécifique
    oauth_google_id: Optional[str] = None
    oauth_apple_id: Optional[str] = None
    oauth_microsoft_id: Optional[str] = None
    oauth_email_from_provider: Optional[str] = None
    oauth_name_from_provider: Optional[str] = None
    
    # Parrainage
    referral_code: str = Field(..., description="Code de parrainage unique")
    referred_by_code: Optional[str] = Field(None, description="Code de parrainage utilisé")
    
    # Dates
    account_created_at: Optional[datetime] = None
    registration_source: Optional[RegistrationSource] = RegistrationSource.WEBSITE
    registration_ip: Optional[str] = None
    
    # Valeurs par défaut
    account_status: AccountStatus = AccountStatus.ACTIVE
    email_verified: bool = False
    profile_completed: bool = False
    
    @validator('account_created_at', pre=True, always=True)
    def set_account_created_at(cls, v):
        return v or datetime.now()


class SiteWebUserUpdate(BaseModel):
    # Tous les champs sont optionnels pour la mise à jour
    email: Optional[EmailStr] = None
    password_hash: Optional[str] = None
    auth_provider: Optional[AuthProvider] = None
    provider_user_id: Optional[str] = None
    
    prenom: Optional[str] = None
    nom: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo_url: Optional[str] = None
    
    address_full: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_complement: Optional[str] = None
    address_latitude: Optional[float] = None
    address_longitude: Optional[float] = None
    address_verified: Optional[bool] = None
    
    oauth_google_id: Optional[str] = None
    oauth_apple_id: Optional[str] = None
    oauth_microsoft_id: Optional[str] = None
    
    last_login_at: Optional[datetime] = None
    account_status: Optional[AccountStatus] = None
    email_verified: Optional[bool] = None
    profile_completed: Optional[bool] = None
    
    # Parrainage (mise à jour des stats)
    referral_count: Optional[int] = None
    referral_pending_count: Optional[int] = None
    referral_total_earned: Optional[Decimal] = None
    referral_credit_balance: Optional[Decimal] = None
    
    # Fidélité (mise à jour des stats)
    loyalty_cleanings_count: Optional[int] = None
    loyalty_eligible_cleanings: Optional[int] = None
    loyalty_credit_earned: Optional[Decimal] = None
    loyalty_credit_balance: Optional[Decimal] = None
    
    # Commandes (mise à jour des stats)
    total_orders_count: Optional[int] = None
    total_orders_amount: Optional[Decimal] = None
    average_order_amount: Optional[Decimal] = None
    last_order_at: Optional[datetime] = None
    
    # Crédits
    total_credit_balance: Optional[Decimal] = None
    
    # Contact
    contact_preference: Optional[ContactPreference] = None
    newsletter_subscribed: Optional[bool] = None
    marketing_consent: Optional[bool] = None
    sms_notifications_enabled: Optional[bool] = None
    email_notifications_enabled: Optional[bool] = None
    
    # Métadonnées
    last_login_ip: Optional[str] = None
    last_activity_at: Optional[datetime] = None
    total_login_count: Optional[int] = None


class SiteWebOrderCreate(BaseModel):
    order_id: str = Field(..., description="Identifiant unique de la commande")
    user_id: str = Field(..., description="ID du client")
    order_date: datetime = Field(default_factory=datetime.now, description="Date et heure de la commande")
    
    service_type: ServiceType = Field(..., description="Type de service")
    service_title: str = Field(..., description="Titre du service")
    service_formula: Optional[str] = Field(None, description="Formule choisie")
    service_selections: Optional[List[ServiceSelection]] = Field(default_factory=list, description="Détails de la sélection")
    
    order_price: Decimal = Field(..., ge=0, description="Prix de la commande en euros")
    order_time_estimated: Optional[int] = Field(None, description="Durée estimée en minutes")
    order_location: Optional[str] = Field(None, description="Adresse de la prestation")
    order_status: OrderStatus = Field(OrderStatus.PENDING, description="Statut de la commande")
    
    order_loyalty_eligible: bool = Field(False, description="Commande éligible pour la fidélité (>= 50€)")
    credits_used: Decimal = Field(Decimal("0.00"), ge=0, description="Crédits utilisés")
    credits_earned: Decimal = Field(Decimal("0.00"), ge=0, description="Crédits gagnés")
    invoice_number: Optional[str] = Field(None, description="Numéro de facture")


class SiteWebOrderUpdate(BaseModel):
    order_status: Optional[OrderStatus] = None
    order_price: Optional[Decimal] = None
    credits_used: Optional[Decimal] = None
    credits_earned: Optional[Decimal] = None
    invoice_number: Optional[str] = None
    order_time_estimated: Optional[int] = None


class SiteWebReferralCreate(BaseModel):
    user_id: str = Field(..., description="ID du client parrainé")
    referred_by_code: str = Field(..., description="Code de parrainage utilisé")
    referral_status: ReferralStatus = Field(ReferralStatus.PENDING, description="Statut du parrainage")


class SiteWebCreditCreate(BaseModel):
    user_id: str = Field(..., description="ID du client")
    type: CreditTransactionType = Field(..., description="Type de transaction")
    source: CreditSource = Field(..., description="Source du crédit")
    amount: Decimal = Field(..., ge=0, description="Montant en euros")
    description: str = Field(..., description="Description de la transaction")
    order_id: Optional[str] = Field(None, description="ID de la commande associée")
    transaction_date: Optional[datetime] = Field(default_factory=datetime.now, description="Date de la transaction")


# Modèles de réponse
class SiteWebUserResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class SiteWebListResponse(BaseModel):
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    count: Optional[int] = None
    error: Optional[str] = None
