"""
Configuration centralisée de l'application
Gère les variables d'environnement et la configuration
"""

import os
from typing import Optional


class Settings:
    """Configuration de l'application"""
    
    # Base de données
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/erp_washgo"
    )
    DB_DIALECT: str = os.getenv("DB_DIALECT", "postgresql")
    
    # Application
    APP_NAME: str = "ERP Wash&Go API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = os.getenv("ENABLE_DEBUG_ROUTES", "false").lower() == "true"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "https://front-end-erp.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://erpwashgo.fr",        # Frontend sur domaine (HTTPS)
        "https://www.erpwashgo.fr",    # Frontend www (HTTPS)
        "http://erpwashgo.fr",         # Frontend (HTTP - redirection)
        "https://65.21.240.234:5173",  # Frontend sur Hetzner IP (HTTPS)
        "http://65.21.240.234:5173",   # Frontend sur Hetzner (HTTP - redirection)
        "http://65.21.240.234:8000",   # Backend sur Hetzner (si nécessaire)
    ]
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-min-32-chars")
    # Augmenter la durée d'expiration du token à 7 jours (10080 minutes) pour améliorer l'expérience utilisateur
    # L'utilisateur peut toujours se déconnecter manuellement
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 jours par défaut
    ALGORITHM: str = "HS256"
    
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


# Instance globale de la configuration
settings = Settings()
