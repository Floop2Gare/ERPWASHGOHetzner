"""
Middleware de rate limiting pour protéger l'API contre les attaques
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timedelta
import time
from typing import Dict, Tuple


class RateLimiter:
    """Rate limiter simple en mémoire (pour production, utiliser Redis)"""
    
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self.cleanup_interval = 300  # Nettoyer toutes les 5 minutes
        self.last_cleanup = time.time()
    
    def is_allowed(
        self, 
        key: str, 
        max_requests: int = 60, 
        window_seconds: int = 60
    ) -> Tuple[bool, int]:
        """
        Vérifie si une requête est autorisée
        
        Args:
            key: Identifiant unique (IP, user_id, etc.)
            max_requests: Nombre maximum de requêtes
            window_seconds: Fenêtre de temps en secondes
            
        Returns:
            (is_allowed, remaining_requests)
        """
        now = time.time()
        
        # Nettoyage périodique
        if now - self.last_cleanup > self.cleanup_interval:
            self._cleanup(now)
            self.last_cleanup = now
        
        # Nettoyer les requêtes expirées pour cette clé
        cutoff = now - window_seconds
        self.requests[key] = [
            req_time for req_time in self.requests[key] 
            if req_time > cutoff
        ]
        
        # Vérifier la limite
        if len(self.requests[key]) >= max_requests:
            remaining = 0
            return False, remaining
        
        # Ajouter la requête actuelle
        self.requests[key].append(now)
        remaining = max_requests - len(self.requests[key])
        
        return True, remaining
    
    def _cleanup(self, now: float):
        """Nettoie les entrées expirées"""
        cutoff = now - 3600  # Garder seulement la dernière heure
        keys_to_remove = []
        
        for key, requests in self.requests.items():
            self.requests[key] = [
                req_time for req_time in requests 
                if req_time > cutoff
            ]
            if not self.requests[key]:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.requests[key]


# Instance globale
rate_limiter = RateLimiter()


async def rate_limit_middleware(request: Request, call_next):
    """
    Middleware de rate limiting
    """
    # Ignorer pour les health checks
    if request.url.path == "/health":
        return await call_next(request)
    
    # Récupérer l'IP du client
    client_ip = request.client.host if request.client else "unknown"
    
    # Limites différentes selon le type de requête
    if request.url.path.startswith("/auth/login"):
        # Limite plus permissive pour les tentatives de login (éviter les blocages lors de connexions rapides)
        max_requests = 20
        window = 60  # 1 minute
    elif request.url.path.startswith("/api"):
        # Limite normale pour l'API
        max_requests = 60
        window = 60  # 1 minute
    else:
        # Limite générale
        max_requests = 100
        window = 60
    
    # Vérifier la limite
    is_allowed, remaining = rate_limiter.is_allowed(
        key=client_ip,
        max_requests=max_requests,
        window_seconds=window
    )
    
    if not is_allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": "Trop de requêtes. Veuillez réessayer plus tard.",
                "retry_after": window
            },
            headers={
                "X-RateLimit-Limit": str(max_requests),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time()) + window),
                "Retry-After": str(window)
            }
        )
    
    # Ajouter les headers de rate limit
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(max_requests)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window)
    
    return response
