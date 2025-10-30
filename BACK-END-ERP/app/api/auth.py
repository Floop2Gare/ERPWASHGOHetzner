from fastapi import APIRouter, HTTPException
import os

from ..schemas.base import AuthPayload, LoginRequest

router = APIRouter()


@router.post('/login', response_model=AuthPayload)
def login(payload: LoginRequest) -> AuthPayload:
    expected_email = os.getenv('DEMO_AUTH_EMAIL', 'demo@example.com')
    expected_password = os.getenv('DEMO_AUTH_PASSWORD', 'demo')

    if payload.email != expected_email or payload.password != expected_password:
        raise HTTPException(status_code=401, detail='Identifiants invalides')
    return AuthPayload(access_token='demo-token')


@router.get('/me', response_model=dict[str, str])
def me() -> dict[str, str]:
    return {
        'id': 'user-1',
        'name': os.getenv('DEMO_AUTH_NAME', 'Utilisateur Démo'),
        'email': os.getenv('DEMO_AUTH_EMAIL', 'demo@example.com'),
        'role': os.getenv('DEMO_AUTH_ROLE', 'Administrateur'),
    }
