from fastapi import APIRouter, HTTPException

from ..models import database
from ..schemas.base import Engagement, EngagementBase

router = APIRouter()


@router.get('/', response_model=list[Engagement])
def list_engagements(status: str | None = None) -> list[Engagement]:
    items = database.engagements
    if status:
        items = [engagement for engagement in items if engagement.status == status]
    return [Engagement.model_validate(item) for item in items]


@router.post('/', response_model=Engagement, status_code=201)
def create_engagement(payload: EngagementBase) -> Engagement:
    identifier = f"e{len(database.engagements) + 1}"
    engagement = database.Engagement(
        id=identifier,
        client_id=payload.client_id,
        service_id=payload.service_id,
        option_ids=payload.option_ids,
        scheduled_at=payload.scheduled_at,
        status=payload.status,
    )
    database.engagements.append(engagement)
    database.slots = database.build_slots()
    return Engagement.model_validate(engagement)


@router.get('/{engagement_id}', response_model=Engagement)
def get_engagement(engagement_id: str) -> Engagement:
    engagement = next((item for item in database.engagements if item.id == engagement_id), None)
    if not engagement:
        raise HTTPException(status_code=404, detail='Prestation introuvable')
    return Engagement.model_validate(engagement)


@router.put('/{engagement_id}', response_model=Engagement)
def update_engagement(engagement_id: str, payload: EngagementBase) -> Engagement:
    engagement = next((item for item in database.engagements if item.id == engagement_id), None)
    if not engagement:
        raise HTTPException(status_code=404, detail='Prestation introuvable')
    engagement.client_id = payload.client_id
    engagement.service_id = payload.service_id
    engagement.option_ids = payload.option_ids
    engagement.scheduled_at = payload.scheduled_at
    engagement.status = payload.status
    database.slots = database.build_slots()
    return Engagement.model_validate(engagement)
