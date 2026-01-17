# Dockerfile pour le frontend en développement
# Utilise Node.js pour lancer Vite avec hot reload

FROM node:20-alpine

WORKDIR /app

# Installer les dépendances système nécessaires
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installer les dépendances npm
# Utiliser npm install au lieu de npm ci pour plus de flexibilité
RUN npm install

# Copier le reste du code de l'application
COPY . .

# Exposer le port Vite
EXPOSE 5173

# Commande pour lancer Vite en mode développement
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

