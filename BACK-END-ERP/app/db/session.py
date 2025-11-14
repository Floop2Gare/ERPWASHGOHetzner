from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from fastapi import HTTPException, status


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback pour développement local avec Docker
    # Utilise les credentials du conteneur PostgreSQL Docker
    POSTGRES_USER = os.getenv("POSTGRES_USER", "erp_user")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "change_me_secure_password")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "erp_washgo")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    # Driver par défaut: psycopg v3 (binaire) pour compatibilité Python >= 3.13
    DATABASE_URL = f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except IntegrityError as ie:
        db.rollback()
        # Conflit d'unicité (ex: email unique)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Conflit d'intégrité: {str(ie)}") from ie
    except SQLAlchemyError as sae:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur base de données: {str(sae)}") from sae
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur serveur: {str(e)}") from e
    finally:
        db.close()


