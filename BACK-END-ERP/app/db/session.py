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
    # Fallback explicite pour éviter un crash si non configuré
    # L’intégration Postgres doit fournir cette variable en prod.
    DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/postgres"

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
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conflit d'intégrité") from ie
    except SQLAlchemyError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


