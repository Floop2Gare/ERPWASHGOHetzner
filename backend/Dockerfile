# Dockerfile optimisé pour le backend FastAPI
# Multi-stage build pour réduire la taille de l'image

# Stage 1: Build
FROM python:3.12-slim as builder

WORKDIR /app

# Installer les dépendances système nécessaires pour la compilation
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copier le fichier requirements
COPY requirements.txt .

# Installer les dépendances Python dans un virtualenv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app

# Installer uniquement les dépendances runtime
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copier le virtualenv depuis le stage builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copier le code de l'application
COPY app/ ./app/
# Copier le script de création du superadmin
COPY create_admin_user.py ./create_admin_user.py

# Créer un répertoire pour les logs
RUN mkdir -p /app/logs

# Créer un utilisateur non-root pour la sécurité
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Exposer le port
EXPOSE 8000

# Variables d'environnement par défaut
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Commande par défaut
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
