from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional


@dataclass
class ServiceOption:
    id: str
    label: str
    extra_price: float
    extra_duration: int


@dataclass
class Service:
    id: str
    category: str
    name: str
    description: str
    base_price: float
    base_duration: int
    options: List[ServiceOption] = field(default_factory=list)
    active: bool = True


@dataclass
class Client:
    id: str
    name: str
    email: str
    phone: str
    city: str
    status: str
    tags: List[str]
    last_service: datetime


@dataclass
class Engagement:
    id: str
    client_id: str
    service_id: str
    option_ids: List[str]
    scheduled_at: datetime
    status: str


@dataclass
class Slot:
    id: str
    date: datetime
    start: datetime
    end: datetime
    engagement_id: Optional[str] = None


clients = [
    Client(
        id="c1",
        name="Groupe Horizon",
        email="contact@groupe-horizon.fr",
        phone="+33 5 45 12 32 10",
        city="Bordeaux",
        status="Actif",
        tags=["Premium", "Contrat annuel"],
        last_service=datetime(2024, 4, 8),
    ),
    Client(
        id="c2",
        name="Wash&Go Nord",
        email="support@washandgo-nord.fr",
        phone="+33 3 27 84 90 12",
        city="Lille",
        status="Actif",
        tags=["Industriel"],
        last_service=datetime(2024, 4, 4),
    ),
    Client(
        id="c3",
        name="Textiluxe",
        email="bonjour@textiluxe.fr",
        phone="+33 1 88 91 22 03",
        city="Paris",
        status="Prospect",
        tags=["Retail"],
        last_service=datetime(2024, 3, 30),
    ),
]

services = [
    Service(
        id="s1",
        category="Voiture",
        name="Nettoyage intérieur complet",
        description="Aspiration, dégraissage et protection des surfaces intérieures.",
        base_price=120,
        base_duration=120,
        options=[
            ServiceOption(id="o1", label="Protection tissus", extra_price=35, extra_duration=30),
            ServiceOption(id="o2", label="Traitement désodorisant", extra_price=15, extra_duration=15),
        ],
        active=True,
    ),
    Service(
        id="s2",
        category="Canapé",
        name="Détachage canapé 3 places",
        description="Nettoyage vapeur et traitement anti-taches.",
        base_price=95,
        base_duration=90,
        options=[ServiceOption(id="o3", label="Protection imperméabilisante", extra_price=25, extra_duration=20)],
        active=True,
    ),
    Service(
        id="s3",
        category="Textile",
        name="Nettoyage tapis laine",
        description="Aspiration en profondeur et shampoing doux.",
        base_price=130,
        base_duration=150,
        options=[
            ServiceOption(id="o4", label="Traitement anti-acariens", extra_price=40, extra_duration=25),
            ServiceOption(id="o5", label="Séchage accéléré", extra_price=20, extra_duration=15),
        ],
        active=True,
    ),
]

engagements = [
    Engagement(
        id="e1",
        client_id="c1",
        service_id="s1",
        option_ids=["o1"],
        scheduled_at=datetime(2024, 4, 9, 9, 0),
        status="planifié",
    ),
    Engagement(
        id="e2",
        client_id="c2",
        service_id="s2",
        option_ids=["o3"],
        scheduled_at=datetime(2024, 4, 9, 13, 30),
        status="planifié",
    ),
    Engagement(
        id="e3",
        client_id="c3",
        service_id="s3",
        option_ids=["o4", "o5"],
        scheduled_at=datetime(2024, 4, 8, 17, 30),
        status="réalisé",
    ),
]


def compute_totals(engagement: Engagement) -> tuple[float, int]:
    service = next((service for service in services if service.id == engagement.service_id), None)
    if not service:
        return 0.0, 0
    price = service.base_price
    duration = service.base_duration
    for option in service.options:
        if option.id in engagement.option_ids:
            price += option.extra_price
            duration += option.extra_duration
    return price, duration


def build_slots() -> List[Slot]:
    slot_items: List[Slot] = []
    for engagement in engagements:
        price, duration = compute_totals(engagement)
        _ = price  # unused but keeps parity with frontend totals
        start = engagement.scheduled_at
        end = start + timedelta(minutes=duration)
        slot_items.append(
            Slot(
                id=f"slot-{engagement.id}",
                date=start,
                start=start,
                end=end,
                engagement_id=engagement.id,
            )
        )
    return slot_items


slots = build_slots()
