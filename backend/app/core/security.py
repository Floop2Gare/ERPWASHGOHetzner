"""
Utilitaires de sécurité pour l'authentification
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe en clair contre un hash"""
    try:
        # bcrypt limite à 72 bytes, on tronque si nécessaire
        if len(plain_password.encode('utf-8')) > 72:
            plain_password = plain_password[:72]
        # Vérifier le mot de passe
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"[Auth] Erreur lors de la vérification du mot de passe: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Hash un mot de passe"""
    # bcrypt limite à 72 bytes, on tronque si nécessaire
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    # Générer le salt et hasher le mot de passe
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crée un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Décode et valide un token JWT"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

