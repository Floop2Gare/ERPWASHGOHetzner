# Dockerfile pour le backend FastAPI
FROM python:3.13-slim

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copier le fichier requirements
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Installer Alembic globalement (pour les migrations)
RUN pip install alembic

# Copier le code de l'application
COPY . .

# Créer un répertoire pour les logs
RUN mkdir -p /app/logs

# Exposer le port
EXPOSE 8000

# Commande par défaut (peut être surchargée par docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

