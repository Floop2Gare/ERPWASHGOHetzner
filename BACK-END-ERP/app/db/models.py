from __future__ import annotations

import os
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Text, DateTime, Boolean, Numeric, Integer, ForeignKey, JSON
try:
    from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY, UUID as PG_UUID, JSONB as PG_JSONB
except Exception:  # pragma: no cover - fallback when PG dialect not available
    PG_ARRAY = None
    PG_UUID = None
    PG_JSONB = None

# Définir des types compatibles selon le dialecte
DB_DIALECT = os.getenv("DB_DIALECT", "postgresql").lower()

if DB_DIALECT == "postgresql" and PG_ARRAY and PG_UUID and PG_JSONB:
    TYPE_UUID = PG_UUID
    TYPE_JSON = PG_JSONB
    def TYPE_ARRAY(inner_type):
        return PG_ARRAY(inner_type)
else:
    # Fallback générique pour SQLite/Tests: UUID -> String(36), JSONB/ARRAY -> JSON
    TYPE_UUID = lambda **kwargs: String(36)  # type: ignore
    TYPE_JSON = JSON
    def TYPE_ARRAY(_inner_type):
        return JSON
from datetime import datetime


class Base(DeclarativeBase):
    pass


class ClientORM(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(TYPE_UUID(as_uuid=False) if DB_DIALECT == "postgresql" else TYPE_UUID(), primary_key=True)
    type: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(255))
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    siret: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20))
    tags: Mapped[list[str]] = mapped_column(TYPE_ARRAY(Text), default=list)
    last_service: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contacts: Mapped[list[dict]] = mapped_column(TYPE_JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ServiceORM(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(TYPE_UUID(as_uuid=False) if DB_DIALECT == "postgresql" else TYPE_UUID(), primary_key=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_price: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    base_duration: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    options: Mapped[list[dict]] = mapped_column(TYPE_JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AppointmentORM(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(TYPE_UUID(as_uuid=False) if DB_DIALECT == "postgresql" else TYPE_UUID(), primary_key=True)
    client_id: Mapped[str] = mapped_column(TYPE_UUID(as_uuid=False) if DB_DIALECT == "postgresql" else TYPE_UUID(), ForeignKey("clients.id", ondelete="CASCADE"))
    service_id: Mapped[str] = mapped_column(TYPE_UUID(as_uuid=False) if DB_DIALECT == "postgresql" else TYPE_UUID(), ForeignKey("services.id", ondelete="CASCADE"))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[dict] = mapped_column(TYPE_JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class CompanyORM(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(TYPE_UUID(as_uuid=False) if DB_DIALECT == "postgresql" else TYPE_UUID(), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    siret: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20))
    notes: Mapped[dict] = mapped_column(TYPE_JSON, default=dict)
    tags: Mapped[list[str]] = mapped_column(TYPE_ARRAY(String), default=list)
    postal_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    vat_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    legal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    vat_enabled: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_default: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    document_header_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    invoice_logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    iban: Mapped[str | None] = mapped_column(String(34), nullable=True)
    bic: Mapped[str | None] = mapped_column(String(11), nullable=True)
    planning_user: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company_id: Mapped[str | None] = mapped_column(TYPE_UUID(as_uuid=False) if DB_DIALECT == "postgresql" else TYPE_UUID(), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class LeadORM(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(TYPE_UUID(as_uuid=False) if DB_DIALECT == "postgresql" else TYPE_UUID(), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    interest_level: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[dict] = mapped_column(TYPE_JSON, default=dict)
    tags: Mapped[list[str]] = mapped_column(TYPE_ARRAY(String), default=list)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner: Mapped[str | None] = mapped_column(String(100), nullable=True)
    segment: Mapped[str | None] = mapped_column(String(100), nullable=True)
    activities: Mapped[list[dict]] = mapped_column(TYPE_JSON, default=list)
    client_id: Mapped[str | None] = mapped_column(TYPE_UUID(as_uuid=False) if DB_DIALECT == "postgresql" else TYPE_UUID(), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    company_id: Mapped[str | None] = mapped_column(TYPE_UUID(as_uuid=False) if DB_DIALECT == "postgresql" else TYPE_UUID(), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

