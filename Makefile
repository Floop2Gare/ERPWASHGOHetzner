# Makefile pour ERP Wash&Go - Validation Locale
# Usage: make <target>

.PHONY: help be-env-sqlite be-env-pg be-install be-run be-migrate fe-install fe-run local-pg-up local-pg-down test-api test-health test-clients test-companies test-services test-all clean-sqlite

# Variables
BACKEND_DIR = BACK-END-ERP
FRONTEND_DIR = FRONT-END-ERP/FRONT-END-ERP
PYTHON = $(BACKEND_DIR)/venv/Scripts/python.exe
PIP = $(BACKEND_DIR)/venv/Scripts/pip.exe
UVICORN = $(BACKEND_DIR)/venv/Scripts/uvicorn.exe
ALEMBIC = $(BACKEND_DIR)/venv/Scripts/alembic.exe
NPM = npm

# Aide
help:
	@echo "Commandes disponibles:"
	@echo "  make be-env-sqlite     - Configurer backend pour SQLite"
	@echo "  make be-env-pg         - Configurer backend pour PostgreSQL"
	@echo "  make be-install        - Installer les dépendances backend"
	@echo "  make be-migrate        - Appliquer les migrations Alembic"
	@echo "  make be-run            - Lancer le backend (port 8000)"
	@echo "  make fe-install        - Installer les dépendances frontend"
	@echo "  make fe-run            - Lancer le frontend (port 5173)"
	@echo "  make local-pg-up       - Démarrer PostgreSQL via Docker"
	@echo "  make local-pg-down     - Arrêter PostgreSQL Docker"
	@echo "  make test-api          - Tester tous les endpoints API"
	@echo "  make test-health       - Tester /health"
	@echo "  make test-clients      - Tester /clients"
	@echo "  make test-companies    - Tester /companies"
	@echo "  make test-services     - Tester /services"
	@echo "  make test-all          - Tests complets de toutes les fonctionnalités"
	@echo "  make clean-sqlite      - Supprimer la base SQLite de test"

# Configuration backend SQLite
be-env-sqlite:
	@echo "Configuration backend pour SQLite..."
	@cd $(BACKEND_DIR) && echo "DB_DIALECT=sqlite" > .env && echo "DATABASE_URL=sqlite:///./test_erp.db" >> .env && echo "ENABLE_DEBUG_ROUTES=false" >> .env
	@echo "✅ Configuration SQLite créée dans $(BACKEND_DIR)/.env"

# Configuration backend PostgreSQL
be-env-pg:
	@echo "Configuration backend pour PostgreSQL..."
	@cd $(BACKEND_DIR) && echo "DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres" > .env && echo "ENABLE_DEBUG_ROUTES=false" >> .env
	@echo "✅ Configuration PostgreSQL créée dans $(BACKEND_DIR)/.env"

# Installation dépendances backend
be-install:
	@echo "Installation des dépendances backend..."
	@cd $(BACKEND_DIR) && $(PIP) install -r requirements.txt
	@echo "✅ Dépendances backend installées"

# Migrations Alembic
be-migrate:
	@echo "Application des migrations Alembic..."
	@cd $(BACKEND_DIR) && $(ALEMBIC) upgrade head
	@echo "✅ Migrations appliquées"

# Lancer le backend
be-run:
	@echo "Démarrage du backend sur http://127.0.0.1:8000..."
	@cd $(BACKEND_DIR) && $(UVICORN) app.main:app --host 127.0.0.1 --port 8000 --reload

# Installation dépendances frontend
fe-install:
	@echo "Installation des dépendances frontend..."
	@cd $(FRONTEND_DIR) && $(NPM) install
	@echo "✅ Dépendances frontend installées"

# Lancer le frontend
fe-run:
	@echo "Démarrage du frontend sur http://localhost:5173..."
	@cd $(FRONTEND_DIR) && $(NPM) run dev

# PostgreSQL Docker (avec volume persistant)
local-pg-up:
	@echo "Démarrage de PostgreSQL via Docker avec persistance..."
	@docker run --name erp_pg_local \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_DB=postgres \
		-p 5433:5432 \
		-v erp_pg_local_data:/var/lib/postgresql/data \
		-d postgres:16 \
		|| echo "⚠️  Docker non disponible ou conteneur déjà existant"
	@echo "✅ PostgreSQL démarré sur le port 5433 avec volume persistant"

local-pg-down:
	@echo "Arrêt de PostgreSQL Docker..."
	@docker stop erp_pg_local || echo "⚠️  Conteneur non trouvé"
	@docker rm erp_pg_local || echo "⚠️  Conteneur non trouvé"
	@echo "✅ PostgreSQL arrêté (les données sont conservées dans le volume)"

# Tests API
test-api: test-health test-clients test-companies test-services
	@echo ""
	@echo "✅ Tous les tests API terminés"

test-health:
	@echo ""
	@echo "=== Test GET /health ==="
	@curl -s -i http://127.0.0.1:8000/health || echo "❌ Erreur: Backend non accessible"

test-clients:
	@echo ""
	@echo "=== Test POST /clients/ ==="
	@curl -s -i -X POST http://127.0.0.1:8000/clients/ \
		-H "Content-Type: application/json" \
		-d '{"type":"individual","name":"Client Test","email":"test@example.com","status":"Actif"}' || echo "❌ Erreur"
	@echo ""
	@echo "=== Test GET /clients/ ==="
	@curl -s -i http://127.0.0.1:8000/clients/ || echo "❌ Erreur"

test-companies:
	@echo ""
	@echo "=== Test POST /companies/ ==="
	@curl -s -i -X POST http://127.0.0.1:8000/companies/ \
		-H "Content-Type: application/json" \
		-d '{"name":"Société Test","email":"company@example.com"}' || echo "❌ Erreur"
	@echo ""
	@echo "=== Test GET /companies/ ==="
	@curl -s -i http://127.0.0.1:8000/companies/ || echo "❌ Erreur"

test-services:
	@echo ""
	@echo "=== Test POST /services/ ==="
	@curl -s -i -X POST http://127.0.0.1:8000/services/ \
		-H "Content-Type: application/json" \
		-d '{"name":"Nettoyage intérieur"}' || echo "❌ Erreur"
	@echo ""
	@echo "=== Test GET /services/ ==="
	@curl -s -i http://127.0.0.1:8000/services/ || echo "❌ Erreur"

# Tests complets de toutes les fonctionnalités
test-all:
	@echo "Tests complets de toutes les fonctionnalités..."
	@if [ -f "scripts/test_all_functionalities.sh" ]; then \
		chmod +x scripts/test_all_functionalities.sh && \
		./scripts/test_all_functionalities.sh; \
	elif [ -f "scripts/test_all_functionalities.ps1" ]; then \
		powershell -ExecutionPolicy Bypass -File scripts/test_all_functionalities.ps1; \
	else \
		echo "❌ Script de test non trouvé"; \
	fi

# Nettoyage
clean-sqlite:
	@echo "Suppression de la base SQLite de test..."
	@rm -f $(BACKEND_DIR)/test_erp.db || del /F $(BACKEND_DIR)\test_erp.db || echo "⚠️  Fichier non trouvé"
	@echo "✅ Base SQLite supprimée"


