from fastapi import APIRouter

from ..schemas.base import StatsSummary

router = APIRouter()


@router.get('/summary', response_model=StatsSummary)
def summary() -> StatsSummary:
    return StatsSummary(
        revenue_series=[
            {'label': 'Semaine 12', 'value': 3200},
            {'label': 'Semaine 13', 'value': 3450},
            {'label': 'Semaine 14', 'value': 3120},
            {'label': 'Semaine 15', 'value': 3680},
        ],
        volume_series=[
            {'label': 'Janvier', 'value': 54},
            {'label': 'Février', 'value': 48},
            {'label': 'Mars', 'value': 62},
            {'label': 'Avril', 'value': 35},
        ],
        top_services=[
            {'name': 'Nettoyage intérieur complet', 'count': 155, 'revenue': 18600},
            {'name': 'Détachage canapé 3 places', 'count': 132, 'revenue': 14200},
            {'name': 'Nettoyage tapis laine', 'count': 84, 'revenue': 12540},
        ],
        average_duration=118,
        cities=[
            {'city': 'Bordeaux', 'count': 42},
            {'city': 'Paris', 'count': 33},
            {'city': 'Lille', 'count': 27},
            {'city': 'Lyon', 'count': 21},
        ],
    )
