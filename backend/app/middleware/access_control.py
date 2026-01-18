"""
Middleware de contrôle d'accès par token secret
Permet de restreindre l'accès à l'application avec un token secret
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import os
from typing import Optional


# Token secret depuis variable d'environnement
ACCESS_TOKEN_SECRET = os.getenv("ACCESS_TOKEN_SECRET", "")


async def access_control_middleware(request: Request, call_next):
    """
    Middleware de contrôle d'accès par token secret
    
    Si ACCESS_TOKEN_SECRET est défini dans .env, toutes les requêtes
    doivent inclure le header X-Access-Token avec ce token.
    
    Exceptions:
    - /health (pour les health checks)
    - /auth/login (pour se connecter)
    """
    # Si pas de token secret configuré, pas de restriction
    if not ACCESS_TOKEN_SECRET:
        return await call_next(request)
    
    # Routes exemptées
    exempt_paths = ["/health", "/auth/login", "/docs", "/openapi.json"]
    if any(request.url.path.startswith(path) for path in exempt_paths):
        return await call_next(request)
    
    # Vérifier le token dans les headers
    access_token = request.headers.get("X-Access-Token") or request.headers.get("x-access-token")
    
    if not access_token or access_token != ACCESS_TOKEN_SECRET:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "detail": "Accès refusé. Token d'accès requis.",
                "hint": "Ajoutez le header X-Access-Token avec le token secret."
            }
        )
    
    return await call_next(request)
