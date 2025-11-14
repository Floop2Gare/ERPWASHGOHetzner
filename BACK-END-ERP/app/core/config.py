"""
Configuration centralisée de l'application
Gère les variables d'environnement et la configuration
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuration de l'application"""
    
    # Base de données
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/erp_washgo"
    )
    db_dialect: str = os.getenv("DB_DIALECT", "postgresql")
    
    # Application
    app_name: str = "ERP Wash&Go API"
    app_version: str = "2.2.1"
    debug: bool = os.getenv("ENABLE_DEBUG_ROUTES", "false").lower() == "true"
    
    # CORS
    cors_origins: list[str] = [
        "https://front-end-erp.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
    ]
    
    # Security
    secret_key: Optional[str] = os.getenv("SECRET_KEY")
    access_token_expire_minutes: int = 30
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Instance globale de la configuration
settings = Settings()

