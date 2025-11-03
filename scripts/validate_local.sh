#!/bin/bash
# Script de validation locale ERP Wash&Go
# Usage: ./scripts/validate_local.sh [sqlite|postgres]

set -e

DB_TYPE="${1:-sqlite}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/BACK-END-ERP"
FRONTEND_DIR="$PROJECT_ROOT/FRONT-END-ERP/FRONT-END-ERP"
LOG_FILE="$PROJECT_ROOT/docs/BUGFIX_LOCAL_VALIDATION.md"

cd "$PROJECT_ROOT"

echo "=== Validation locale ERP Wash&Go ==="
echo "Type de base: $DB_TYPE"
echo ""

# Fonction pour logger les erreurs
log_error() {
    local symptom="$1"
    local logs="$2"
    local cause="$3"
    local fix="$4"
    local files="$5"
    local result="$6"
    
    cat >> "$LOG_FILE" << EOF

## Problème $(date +%s) — $symptom
- **Symptôme**: $symptom
- **Endpoint/page impactée**: Voir logs
- **Logs console/backend**: 
  $logs
- **Cause racine**: $cause
- **Correction effectuée**: $fix
- **Fichier**: $files
- **Résultat après fix**: $result
EOF
}

# Configuration backend
if [ "$DB_TYPE" = "sqlite" ]; then
    echo "📝 Configuration SQLite..."
    cd "$BACKEND_DIR"
    cat > .env << EOF
DB_DIALECT=sqlite
DATABASE_URL=sqlite:///./test_erp.db
ENABLE_DEBUG_ROUTES=false
EOF
    echo "✅ Configuration SQLite créée"
    
    # Créer le schéma
    echo "📦 Création du schéma SQLite..."
    "$BACKEND_DIR/venv/Scripts/python.exe" -c "
import os
os.environ['DB_DIALECT'] = 'sqlite'
os.environ['DATABASE_URL'] = 'sqlite:///./test_erp.db'
from app.db.models import Base
from app.db.session import engine
Base.metadata.create_all(bind=engine)
print('✅ Schéma SQLite créé')
" || echo "⚠️ Erreur création schéma"
    
elif [ "$DB_TYPE" = "postgres" ]; then
    echo "📝 Configuration PostgreSQL..."
    cd "$BACKEND_DIR"
    cat > .env << EOF
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres
ENABLE_DEBUG_ROUTES=false
EOF
    echo "✅ Configuration PostgreSQL créée"
    
    # Migrations
    echo "📦 Application des migrations Alembic..."
    cd "$BACKEND_DIR"
    "$BACKEND_DIR/venv/Scripts/alembic.exe" upgrade head || echo "⚠️ Erreur migrations"
fi

# Démarrer le backend
echo "🚀 Démarrage du backend..."
cd "$BACKEND_DIR"
"$BACKEND_DIR/venv/Scripts/uvicorn.exe" app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
sleep 5

# Tests
echo ""
echo "=== Tests API ==="

# Test /health
echo "1. Test GET /health"
HEALTH_RESPONSE=$(curl -s http://127.0.0.1:8000/health || echo "ERROR")
if echo "$HEALTH_RESPONSE" | grep -q "status"; then
    echo "   ✅ /health OK"
else
    echo "   ❌ /health FAILED"
    log_error "GET /health échoue" "$HEALTH_RESPONSE" "Backend non démarré" "Vérifier logs backend" "BACK-END-ERP" "EN COURS"
fi

# Test POST /clients/
echo "2. Test POST /clients/"
CLIENT_RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/clients/ \
    -H "Content-Type: application/json" \
    -d '{"type":"individual","name":"Client Test","email":"test@example.com","status":"Actif"}' || echo "ERROR")
if echo "$CLIENT_RESPONSE" | grep -q "\"success\":true"; then
    echo "   ✅ POST /clients/ OK"
else
    echo "   ❌ POST /clients/ FAILED"
    echo "   Response: $CLIENT_RESPONSE"
    log_error "POST /clients/ échoue" "$CLIENT_RESPONSE" "À investiguer" "Corriger selon erreur" "BACK-END-ERP/app/api/clients.py" "EN COURS"
fi

# Test GET /clients/
echo "3. Test GET /clients/"
GET_CLIENTS=$(curl -s http://127.0.0.1:8000/clients/ || echo "ERROR")
if echo "$GET_CLIENTS" | grep -q "\"success\":true"; then
    echo "   ✅ GET /clients/ OK"
else
    echo "   ❌ GET /clients/ FAILED"
fi

# Test POST /companies/
echo "4. Test POST /companies/"
COMPANY_RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/companies/ \
    -H "Content-Type: application/json" \
    -d '{"name":"Société Test","email":"company@example.com"}' || echo "ERROR")
if echo "$COMPANY_RESPONSE" | grep -q "\"success\":true"; then
    echo "   ✅ POST /companies/ OK"
else
    echo "   ❌ POST /companies/ FAILED"
    echo "   Response: $COMPANY_RESPONSE"
fi

# Test POST /services/
echo "5. Test POST /services/"
SERVICE_RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/services/ \
    -H "Content-Type: application/json" \
    -d '{"name":"Nettoyage intérieur"}' || echo "ERROR")
if echo "$SERVICE_RESPONSE" | grep -q "\"success\":true"; then
    echo "   ✅ POST /services/ OK"
else
    echo "   ❌ POST /services/ FAILED"
    echo "   Response: $SERVICE_RESPONSE"
fi

# Arrêter le backend
echo ""
echo "🛑 Arrêt du backend..."
kill $BACKEND_PID 2>/dev/null || true
sleep 2

echo ""
echo "=== Validation $DB_TYPE terminée ==="

