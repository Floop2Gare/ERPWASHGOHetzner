from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Literal


class ClientBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    city: str
    status: Literal["Actif", "Prospect"] = "Actif"
    tags: list[str] = []


class ClientCreate(ClientBase):
    pass


class Client(ClientBase):
    id: str
    last_service: datetime

    class Config:
        from_attributes = True


class ServiceOption(BaseModel):
    id: str
    label: str
    extra_price: float
    extra_duration: int


class ServiceBase(BaseModel):
    category: str
    name: str
    description: str
    base_price: float
    base_duration: int
    options: list[ServiceOption] = []
    active: bool = True


class Service(ServiceBase):
    id: str

    class Config:
        from_attributes = True


class EngagementBase(BaseModel):
    client_id: str
    service_id: str
    option_ids: list[str] = []
    scheduled_at: datetime
    status: str


class Engagement(EngagementBase):
    id: str

    class Config:
        from_attributes = True


class Slot(BaseModel):
    id: str
    date: datetime
    start: datetime
    end: datetime
    engagement_id: str | None = None

    class Config:
        from_attributes = True


class AuthPayload(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class StatsSummary(BaseModel):
    revenue_series: list[dict[str, float | str]]
    volume_series: list[dict[str, float | str]]
    top_services: list[dict[str, float | str]]
    average_duration: int
    cities: list[dict[str, float | str]]
