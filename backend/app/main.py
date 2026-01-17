from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime
import psycopg
import secrets

# Charger les variables d'environnement en local
if os.path.exists('.env'):
    from dotenv import load_dotenv
    load_dotenv()

# Importer la configuration centralisée
from app.core.config import settings
from app.api import api_router
from app.core.dependencies import get_current_user, require_role, get_db_connection

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API Backend pour ERP Wash&Go - Version refaite"
)

# Middleware de rate limiting (doit être avant CORS)
from app.middleware.rate_limit import rate_limit_middleware
app.middleware("http")(rate_limit_middleware)

# Middleware de contrôle d'accès par token secret (optionnel)
from app.middleware.access_control import access_control_middleware
app.middleware("http")(access_control_middleware)

# Configuration CORS pour permettre les requêtes depuis le front-end
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    # Autoriser localhost ET les adresses IP locales (192.168.x.x, 172.x.x.x, 10.x.x.x) pour l'accès mobile
    allow_origin_regex=r"^(http://localhost:\d+|http://192\.168\.\d+\.\d+:\d+|http://172\.\d+\.\d+\.\d+:\d+|http://10\.\d+\.\d+\.\d+:\d+)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def init_db():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS clients (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Services table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS services (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Categories table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS categories (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Leads table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS leads (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Trigger updated_at - Fonction
                cur.execute(
                    """
                        CREATE OR REPLACE FUNCTION set_updated_at()
                        RETURNS TRIGGER AS $$
                        BEGIN
                          NEW.updated_at = NOW();
                          RETURN NEW;
                        END;
                        $$ LANGUAGE plpgsql;
                    """
                )
                # Trigger updated_at - Trigger pour clients
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_clients_set_updated_at ON clients;
                        CREATE TRIGGER trg_clients_set_updated_at
                        BEFORE UPDATE ON clients
                        FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Trigger updated_at - Trigger pour leads
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_leads_set_updated_at ON leads;
                    CREATE TRIGGER trg_leads_set_updated_at
                    BEFORE UPDATE ON leads
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Trigger updated_at - Trigger pour services
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_services_set_updated_at ON services;
                    CREATE TRIGGER trg_services_set_updated_at
                    BEFORE UPDATE ON services
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Trigger updated_at - Trigger pour categories
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_categories_set_updated_at ON categories;
                    CREATE TRIGGER trg_categories_set_updated_at
                    BEFORE UPDATE ON categories
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Companies table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS companies (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Trigger updated_at - Trigger pour companies
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_companies_set_updated_at ON companies;
                    CREATE TRIGGER trg_companies_set_updated_at
                    BEFORE UPDATE ON companies
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Users table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Project members table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS project_members (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Trigger updated_at - Trigger pour project_members
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_project_members_set_updated_at ON project_members;
                    CREATE TRIGGER trg_project_members_set_updated_at
                    BEFORE UPDATE ON project_members
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Vendor invoices table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS vendor_invoices (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Trigger updated_at - Trigger pour vendor_invoices
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_vendor_invoices_set_updated_at ON vendor_invoices;
                    CREATE TRIGGER trg_vendor_invoices_set_updated_at
                    BEFORE UPDATE ON vendor_invoices
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Client invoices table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS client_invoices (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Trigger updated_at - Trigger pour client_invoices
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_client_invoices_set_updated_at ON client_invoices;
                    CREATE TRIGGER trg_client_invoices_set_updated_at
                    BEFORE UPDATE ON client_invoices
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Purchases table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS purchases (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Trigger updated_at - Trigger pour purchases
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_purchases_set_updated_at ON purchases;
                    CREATE TRIGGER trg_purchases_set_updated_at
                    BEFORE UPDATE ON purchases
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Documents table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS documents (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Trigger updated_at - Trigger pour documents
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_documents_set_updated_at ON documents;
                    CREATE TRIGGER trg_documents_set_updated_at
                    BEFORE UPDATE ON documents
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Subscriptions table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS subscriptions (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Trigger updated_at - Trigger pour subscriptions
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_subscriptions_set_updated_at ON subscriptions;
                    CREATE TRIGGER trg_subscriptions_set_updated_at
                    BEFORE UPDATE ON subscriptions
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Trigger updated_at - Trigger pour users
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
                    CREATE TRIGGER trg_users_set_updated_at
                    BEFORE UPDATE ON users
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
                # Appointments table (engagements/devis)
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS appointments (
                      id TEXT PRIMARY KEY,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """
                )
                # Trigger updated_at - Trigger pour appointments
                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS trg_appointments_set_updated_at ON appointments;
                    CREATE TRIGGER trg_appointments_set_updated_at
                    BEFORE UPDATE ON appointments
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();
                    """
                )
    except Exception as e:
        # En environnement dev, on logge l'erreur
        print(f"[DB] Init error: {e}")


@app.on_event("startup")
def on_startup():
    """Initialise la base de données et crée l'utilisateur admin unique par défaut"""
    init_db()
    
    # Créer l'admin unique par défaut (supprime tous les autres utilisateurs)
    try:
        import sys
        import os
        # Ajouter le répertoire parent au path pour importer create_admin_user
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        
        from create_admin_user import create_admin_user
        print("[Startup] Création de l'utilisateur admin unique...")
        create_admin_user()
    except Exception as e:
        print(f"[Startup] Erreur lors de la création de l'admin: {e}")
        import traceback
        traceback.print_exc()
    
    # DÉSACTIVÉ: Synchronisation des profils Docker (on ne veut qu'un seul profil admin)
    # try:
    #     from app.utils.sync_profiles import refresh_all_profiles
    #     print("[Startup] Synchronisation des profils Docker...")
    #     refresh_all_profiles()
    # except Exception as e:
    #     print(f"[Startup] Erreur lors de la synchronisation des profils: {e}")
    #     import traceback
    #     traceback.print_exc()

app.include_router(api_router)


# ------- Webhook pour les réservations externes (sans authentification utilisateur) -------

@app.post("/api/webhooks/reservations", status_code=201)
def webhook_create_reservation(
    payload: Dict[str, Any],
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> Dict[str, Any]:
    """
    Endpoint webhook pour recevoir les réservations depuis le site externe.
    Authentification via header X-API-Key contenant la clé API de l'entreprise.
    """
    # Vérifier que la clé API est fournie
    api_key = x_api_key
    if not api_key:
        raise HTTPException(status_code=401, detail="Clé API manquante (header X-API-Key requis)")
    
    # Trouver l'entreprise correspondant à cette clé API
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM companies WHERE data->>'apiKey' = %s;",
            (api_key,)
        )
        row = cur.fetchone()
        
        if not row:
            raise HTTPException(status_code=401, detail="Clé API invalide")
        
        company_id = row[0]
        company_data = row[1]
        
        # Créer un lead depuis les données de réservation
        # Le payload doit contenir au minimum: contact, email, phone, company (optionnel), address (optionnel)
        lead_id = payload.get("id") or uuid.uuid4().hex
        
        # Construire les données du lead depuis le payload
        lead_data = {
            "id": lead_id,
            "companyId": company_id,
            "contact": payload.get("contact", ""),
            "company": payload.get("company", ""),
            "email": payload.get("email", ""),
            "phone": payload.get("phone", ""),
            "address": payload.get("address", ""),
            "status": payload.get("status", "Nouveau"),
            "source": payload.get("source", "Site web"),
            "segment": payload.get("segment", "général"),
            "nextStepDate": payload.get("nextStepDate"),
            "nextStepNote": payload.get("nextStepNote", ""),
            "estimatedValue": payload.get("estimatedValue", 0),
            "tags": payload.get("tags", []),
            "clientType": payload.get("clientType", "company"),
            "siret": payload.get("siret"),
            "supportType": payload.get("supportType"),
            "supportDetail": payload.get("supportDetail", ""),
            "activities": payload.get("activities", []),
            "createdAt": datetime.now().isoformat(),
        }
        
        # Créer le lead
        cur.execute(
            """
            INSERT INTO leads (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (lead_id, psycopg.types.json.Json(lead_data)),
        )
        lead_row = cur.fetchone()
        lead_item = {**lead_row[1], "id": lead_row[0]}
        
        return {
            "success": True,
            "data": lead_item,
            "message": "Réservation créée avec succès"
        }


@app.get("/")
def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": settings.APP_NAME,
        "status": "running",
        "version": settings.APP_VERSION
    }


@app.get("/health")
def health() -> dict[str, str]:
    """Healthcheck endpoint."""
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "database": "ready"
    }


@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight requests."""
    return {"message": "CORS preflight handled"}


# ------- Clients minimal CRUD (stockage JSONB) -------

@app.get("/clients")
def list_clients(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM clients WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}


@app.post("/clients", status_code=201)
def create_client(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    user_role = current_user.get("role")
    
    # Permettre aux superAdmin de créer des clients sans entreprise
    if not company_id and user_role != "superAdmin":
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    client_id = payload.get("id") or uuid.uuid4().hex
    # S'assurer que l'id est dans le JSON stocké et assigner companyId
    data = {**payload, "id": client_id}
    if company_id:
        data["companyId"] = company_id
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO clients (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (client_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.get("/clients/{client_id}/pricing-grid")
def get_client_pricing_grid(client_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Récupère la grille tarifaire d'un client"""
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que le client existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM clients WHERE id = %s AND data->>'companyId' = %s;",
                (client_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM clients WHERE id = %s;", (client_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        client_data = row[1]
        if company_id and client_data.get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        # Récupérer la grille tarifaire (peut être None)
        pricing_grid = client_data.get("pricingGrid")
        
        return {
            "success": True,
            "data": pricing_grid if pricing_grid else {"pricingItems": []}
        }


@app.put("/clients/{client_id}/pricing-grid")
def update_client_pricing_grid(
    client_id: str,
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Met à jour la grille tarifaire d'un client"""
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que le client existe et appartient à l'entreprise
        cur.execute(
            "SELECT id, data FROM clients WHERE id = %s AND data->>'companyId' = %s;",
            (client_id, company_id)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        client_data = row[1]
        
        # Valider le payload
        pricing_items = payload.get("pricingItems", [])
        if not isinstance(pricing_items, list):
            raise HTTPException(status_code=400, detail="pricingItems doit être un tableau")
        
        # Construire la grille tarifaire
        pricing_grid = {
            "pricingItems": pricing_items,
            "lastModifiedAt": datetime.now().isoformat(),
            "lastModifiedBy": current_user.get("id"),
        }
        
        # Mettre à jour le client avec la nouvelle grille tarifaire
        updated_data = {**client_data, "pricingGrid": pricing_grid}
        
        cur.execute(
            """
            UPDATE clients
            SET data = %s::jsonb, updated_at = NOW()
            WHERE id = %s
            RETURNING id, data;
            """,
            (psycopg.types.json.Json(updated_data), client_id)
        )
        
        updated_row = cur.fetchone()
        item = {**updated_row[1], "id": updated_row[0]}
        
        return {"success": True, "data": item}


@app.get("/clients/{client_id}/pricing/{service_id}/{option_id}")
def get_client_pricing_for_option(
    client_id: str,
    service_id: str,
    option_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Récupère le prix applicable pour un service/option pour un client donné"""
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Récupérer le client
        if company_id:
            cur.execute(
                "SELECT id, data FROM clients WHERE id = %s AND data->>'companyId' = %s;",
                (client_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM clients WHERE id = %s;", (client_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        client_data = row[1]
        if company_id and client_data.get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        # Récupérer le service pour obtenir le prix par défaut
        cur.execute("SELECT id, data FROM services WHERE id = %s AND data->>'companyId' = %s;", (service_id, company_id))
        service_row = cur.fetchone()
        if not service_row:
            raise HTTPException(status_code=404, detail="Service non trouvé")
        
        service_data = service_row[1]
        service_options = service_data.get("options", [])
        option = next((opt for opt in service_options if opt.get("id") == option_id), None)
        
        if not option:
            raise HTTPException(status_code=404, detail="Option de service non trouvée")
        
        default_price = option.get("unitPriceHT", 0)
        
        # Chercher le prix personnalisé dans la grille tarifaire
        pricing_grid = client_data.get("pricingGrid")
        custom_price = None
        comment = None
        
        if pricing_grid and pricing_grid.get("pricingItems"):
            pricing_item = next(
                (
                    item
                    for item in pricing_grid["pricingItems"]
                    if item.get("serviceId") == service_id and item.get("serviceOptionId") == option_id
                ),
                None
            )
            if pricing_item:
                custom_price = pricing_item.get("customPriceHT")
                comment = pricing_item.get("comment")
        
        applicable_price = custom_price if custom_price is not None else default_price
        
        return {
            "success": True,
            "data": {
                "defaultPriceHT": default_price,
                "customPriceHT": custom_price,
                "applicablePriceHT": applicable_price,
                "comment": comment,
                "isCustom": custom_price is not None,
            }
        }


@app.put("/clients/{client_id}")
def update_client(client_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM clients WHERE id = %s AND data->>'companyId' = %s;",
                (client_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM clients WHERE id = %s;", (client_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        # S'assurer que le companyId n'est pas modifié
        data = {**payload, "id": client_id}
        if company_id:
            data["companyId"] = company_id
        
        cur.execute(
            "UPDATE clients SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), client_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.get("/clients/{client_id}")
def get_client(client_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM clients WHERE id = %s AND data->>'companyId' = %s;",
                (client_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM clients WHERE id = %s;", (client_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        # Vérification supplémentaire
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

@app.delete("/clients/{client_id}", status_code=200)
def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM clients WHERE id = %s AND data->>'companyId' = %s;",
                (client_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM clients WHERE id = %s;", (client_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        cur.execute("DELETE FROM clients WHERE id = %s;", (client_id,))
        return {"success": True}


@app.post("/clients/{client_id}/transfer", status_code=200)
def transfer_client(client_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Transfère un client d'une entreprise vers une autre.
    Nécessite que l'utilisateur ait accès au client actuel et à l'entreprise de destination.
    """
    company_id = current_user.get("companyId")
    target_company_id = payload.get("targetCompanyId")
    
    if not target_company_id:
        raise HTTPException(status_code=400, detail="targetCompanyId est requis")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que le client existe et appartient à l'entreprise actuelle
        if company_id:
            cur.execute(
                "SELECT id, data FROM clients WHERE id = %s AND data->>'companyId' = %s;",
                (client_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM clients WHERE id = %s;", (client_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        # Vérifier que l'entreprise de destination existe
        cur.execute("SELECT id FROM companies WHERE id = %s;", (target_company_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Entreprise de destination non trouvée")
        
        # Mettre à jour le companyId du client
        client_data = existing[1]
        client_data["companyId"] = target_company_id
        
        cur.execute(
            "UPDATE clients SET data = %s::jsonb, updated_at = NOW() WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(client_data), client_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

# Trailing slash variants for frontend compatibility
@app.get("/clients/")
def list_clients_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_clients(current_user)

@app.post("/clients/", status_code=201)
def create_client_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_client(payload, current_user)

# ------- Leads minimal CRUD (stockage JSONB) -------

@app.get("/leads")
def list_leads(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM leads WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}

@app.post("/leads", status_code=201)
def create_lead(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    lead_id = payload.get("id") or uuid.uuid4().hex
    data = {**payload, "id": lead_id, "companyId": company_id}
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO leads (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (lead_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

# Trailing slash variants for frontend compatibility (DOIT être avant les routes avec paramètres)
@app.get("/leads/")
def list_leads_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_leads(current_user)

@app.post("/leads/", status_code=201)
def create_lead_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_lead(payload, current_user)

@app.get("/leads/{lead_id}")
def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM leads WHERE id = %s AND data->>'companyId' = %s;",
                (lead_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM leads WHERE id = %s;", (lead_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Lead non trouvé")
        
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

@app.put("/leads/{lead_id}")
def update_lead(lead_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM leads WHERE id = %s AND data->>'companyId' = %s;",
                (lead_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM leads WHERE id = %s;", (lead_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Lead non trouvé")
        
        # S'assurer que le companyId n'est pas modifié
        data = {**payload, "id": lead_id}
        if company_id:
            data["companyId"] = company_id
        
        cur.execute(
            "UPDATE leads SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), lead_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

@app.delete("/leads/{lead_id}", status_code=200)
def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM leads WHERE id = %s AND data->>'companyId' = %s;",
                (lead_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM leads WHERE id = %s;", (lead_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Lead non trouvé")
        
        cur.execute("DELETE FROM leads WHERE id = %s;", (lead_id,))
        return {"success": True}


@app.post("/leads/{lead_id}/transfer", status_code=200)
def transfer_lead(lead_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Transfère un lead (prospect) d'une entreprise vers une autre.
    Nécessite que l'utilisateur ait accès au lead actuel et à l'entreprise de destination.
    """
    company_id = current_user.get("companyId")
    target_company_id = payload.get("targetCompanyId")
    
    if not target_company_id:
        raise HTTPException(status_code=400, detail="targetCompanyId est requis")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que le lead existe et appartient à l'entreprise actuelle
        if company_id:
            cur.execute(
                "SELECT id, data FROM leads WHERE id = %s AND data->>'companyId' = %s;",
                (lead_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM leads WHERE id = %s;", (lead_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Lead non trouvé")
        
        # Vérifier que l'entreprise de destination existe
        cur.execute("SELECT id FROM companies WHERE id = %s;", (target_company_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Entreprise de destination non trouvée")
        
        # Mettre à jour le companyId du lead
        lead_data = existing[1]
        lead_data["companyId"] = target_company_id
        
        cur.execute(
            "UPDATE leads SET data = %s::jsonb, updated_at = NOW() WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(lead_data), lead_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

# ------- Services minimal CRUD (stockage JSONB) -------

@app.get("/services")
def list_services(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM services WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}

@app.post("/services", status_code=201)
def create_service(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    service_id = payload.get("id") or uuid.uuid4().hex
    data = {**payload, "id": service_id, "companyId": company_id}
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO services (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (service_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

# Trailing slash variants for frontend compatibility (DOIT être avant les routes avec paramètres)
@app.get("/services/")
def list_services_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_services(current_user)

@app.post("/services/", status_code=201)
def create_service_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_service(payload, current_user)

@app.get("/services/{service_id}")
def get_service(service_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM services WHERE id = %s AND data->>'companyId' = %s;",
                (service_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM services WHERE id = %s;", (service_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Service non trouvé")
        
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

@app.put("/services/{service_id}")
def update_service(service_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM services WHERE id = %s AND data->>'companyId' = %s;",
                (service_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM services WHERE id = %s;", (service_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Service non trouvé")
        
        # S'assurer que le companyId n'est pas modifié
        # Le payload remplace complètement les données existantes (sauf companyId)
        data = {**payload, "id": service_id}
        if company_id:
            # Préserver le companyId existant si présent, sinon utiliser celui de l'utilisateur
            existing_data = existing[1] if existing else {}
            data["companyId"] = existing_data.get("companyId") or company_id
        
        cur.execute(
            "UPDATE services SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), service_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

@app.delete("/services/{service_id}", status_code=200)
def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM services WHERE id = %s AND data->>'companyId' = %s;",
                (service_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM services WHERE id = %s;", (service_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Service non trouvé")
        
        cur.execute("DELETE FROM services WHERE id = %s;", (service_id,))
        return {"success": True}

# ------- Categories CRUD (stockage JSONB) -------

@app.get("/categories")
def list_categories(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM categories WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}

@app.post("/categories", status_code=201)
def create_category(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    category_id = payload.get("id") or uuid.uuid4().hex
    data = {**payload, "id": category_id, "companyId": company_id}
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO categories (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (category_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

# Trailing slash variants for frontend compatibility (DOIT être avant les routes avec paramètres)
@app.get("/categories/")
def list_categories_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_categories(current_user)

@app.post("/categories/", status_code=201)
def create_category_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_category(payload, current_user)

@app.get("/categories/{category_id}")
def get_category(category_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM categories WHERE id = %s AND data->>'companyId' = %s;",
                (category_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM categories WHERE id = %s;", (category_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Catégorie non trouvée")
        
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

@app.put("/categories/{category_id}")
def update_category(category_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM categories WHERE id = %s AND data->>'companyId' = %s;",
                (category_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM categories WHERE id = %s;", (category_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Catégorie non trouvée")
        
        # S'assurer que le companyId n'est pas modifié
        data = {**payload, "id": category_id}
        if company_id:
            data["companyId"] = company_id
        
        cur.execute(
            "UPDATE categories SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), category_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

@app.delete("/categories/{category_id}", status_code=200)
def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM categories WHERE id = %s AND data->>'companyId' = %s;",
                (category_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM categories WHERE id = %s;", (category_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Catégorie non trouvée")
        
        cur.execute("DELETE FROM categories WHERE id = %s;", (category_id,))
        return {"success": True}

# ------- Companies minimal CRUD (stockage JSONB) -------

@app.get("/companies")
def list_companies(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, data FROM companies ORDER BY created_at DESC;")
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}


@app.post("/companies", status_code=201)
def create_company(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = payload.get("id") or uuid.uuid4().hex
    data = {**payload, "id": company_id}
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO companies (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (company_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


# Trailing slash variants for frontend compatibility (DOIT être avant les routes avec paramètres)
@app.get("/companies/")
def list_companies_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_companies(current_user)

@app.post("/companies/", status_code=201)
def create_company_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_company(payload, current_user)

@app.get("/companies/{company_id}")
def get_company(company_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, data FROM companies WHERE id = %s;", (company_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

@app.put("/companies/{company_id}")
def update_company(company_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db_connection() as conn, conn.cursor() as cur:
        data = {**payload, "id": company_id}
        cur.execute(
            "UPDATE companies SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), company_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

@app.delete("/companies/{company_id}", status_code=200)
def delete_company(company_id: str, current_user: dict = Depends(get_current_user)):
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier si l'entreprise existe avant de supprimer
        cur.execute("SELECT id FROM companies WHERE id = %s;", (company_id,))
        if not cur.fetchone():
            print(f"[DELETE /companies/{company_id}] Entreprise non trouvée")
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        
        # Supprimer l'entreprise
        cur.execute("DELETE FROM companies WHERE id = %s;", (company_id,))
        deleted_count = cur.rowcount
        conn.commit()  # S'assurer que la transaction est commitée
        print(f"[DELETE /companies/{company_id}] Entreprise supprimée (rowcount: {deleted_count})")
        return {"success": True}

@app.post("/companies/{company_id}/generate-api-key", status_code=200)
def generate_company_api_key(company_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Génère ou régénère une clé API pour une entreprise"""
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que l'entreprise existe
        cur.execute("SELECT id, data FROM companies WHERE id = %s;", (company_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        
        # Générer une nouvelle clé API (format simple: sk_ + 32 caractères aléatoires)
        new_api_key = f"sk_{secrets.token_urlsafe(32)}"
        
        # Mettre à jour l'entreprise avec la nouvelle clé
        company_data = row[1]
        company_data["apiKey"] = new_api_key
        cur.execute(
            "UPDATE companies SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(company_data), company_id),
        )
        updated_row = cur.fetchone()
        item = {**updated_row[1], "id": updated_row[0]}
        return {"success": True, "data": item, "apiKey": new_api_key}

# ------- Users minimal CRUD (stockage JSONB) -------

@app.get("/users")
def list_users(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, data, created_at, updated_at FROM users ORDER BY created_at DESC;")
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0], "created_at": row[2].isoformat() if row[2] else None, "updated_at": row[3].isoformat() if row[3] else None} for row in rows]
        return {"success": True, "data": items, "count": len(items)}


@app.post("/users", status_code=201)
def create_user(payload: Dict[str, Any], current_user: dict = Depends(require_role(["superAdmin"]))) -> Dict[str, Any]:
    user_id = payload.get("id") or uuid.uuid4().hex
    
    # Si un mot de passe est fourni, le hasher
    if "password" in payload and payload["password"]:
        from app.core.security import get_password_hash
        hashed_password = get_password_hash(payload["password"])
        # Remplacer password par passwordHash et supprimer password
        payload = {**payload}
        payload["passwordHash"] = hashed_password
        if "password" in payload:
            del payload["password"]
    
    # S'assurer que l'id est dans le JSON stocké
    data = {**payload, "id": user_id}
    
    # Marquer automatiquement comme lié à Docker (sauf si c'est l'admin)
    username = data.get("username", "").strip()
    if username.lower() != "admin":
        data["isDockerLinked"] = True
    
    # Vérifier si l'utilisateur existe déjà (évite les doublons)
    with get_db_connection() as conn, conn.cursor() as cur:
        if username:
            # Normaliser le nom d'utilisateur (trim et lowercase)
            normalized_username = username.strip().lower()
            # Vérification insensible à la casse et aux espaces pour éviter les doublons
            cur.execute("""
                SELECT id, data->>'username' as existing_username 
                FROM users 
                WHERE LOWER(TRIM(data->>'username')) = %s;
            """, (normalized_username,))
            existing = cur.fetchone()
            if existing:
                existing_id, existing_username = existing
                print(f"[CREATE USER] Conflit détecté: '{username}' existe déjà (ID: {existing_id}, Username: '{existing_username}')")
                raise HTTPException(status_code=409, detail="Ce nom d'utilisateur est déjà utilisé")
        
        cur.execute(
            """
            INSERT INTO users (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (user_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.put("/users/{user_id}")
def update_user(user_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db_connection() as conn, conn.cursor() as cur:
        # Récupérer l'utilisateur existant pour préserver les données non fournies
        cur.execute("SELECT data FROM users WHERE id = %s;", (user_id,))
        existing_row = cur.fetchone()
        if not existing_row:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        existing_data = existing_row[0] or {}
        
        # Fusionner les données existantes avec les nouvelles données
        # Cela préserve les champs non fournis dans le payload
        merged_data = {**existing_data, **payload, "id": user_id}
        
        # Si un profil est fourni, fusionner avec le profil existant pour préserver l'avatarUrl
        if "profile" in payload and isinstance(payload["profile"], dict):
            existing_profile = existing_data.get("profile", {})
            merged_data["profile"] = {**existing_profile, **payload["profile"]}
        
        cur.execute(
            "UPDATE users SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(merged_data), user_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.post("/users/{user_id}/change-password")
def change_user_password(
    user_id: str,
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Permet à un utilisateur de changer son propre mot de passe.
    L'utilisateur doit fournir son ancien mot de passe pour vérification.
    Le nouveau mot de passe est stocké en clair dans profile.password pour le super admin.
    """
    old_password = payload.get("oldPassword", "")
    new_password = payload.get("newPassword", "")
    
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Ancien et nouveau mot de passe requis")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Récupérer l'utilisateur
        cur.execute("SELECT id, data FROM users WHERE id = %s;", (user_id,))
        user_row = cur.fetchone()
        
        if not user_row:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        user_data = user_row[1]
        current_user_id = current_user.get("id")
        current_user_role = current_user.get("role")
        
        # Vérifier les permissions : l'utilisateur peut changer son propre mot de passe, ou le super admin peut changer n'importe quel mot de passe
        if user_id != current_user_id and current_user_role != "superAdmin":
            raise HTTPException(status_code=403, detail="Vous ne pouvez changer que votre propre mot de passe")
        
        # Si ce n'est pas le super admin, vérifier l'ancien mot de passe
        if current_user_role != "superAdmin":
            password_hash = user_data.get("passwordHash")
            if not password_hash:
                raise HTTPException(status_code=401, detail="Mot de passe non configuré")
            
            if not verify_password(old_password, password_hash):
                raise HTTPException(status_code=401, detail="Ancien mot de passe incorrect")
        
        # Hasher le nouveau mot de passe
        from app.core.security import get_password_hash
        new_password_hash = get_password_hash(new_password)
        
        # Mettre à jour le mot de passe hashé pour l'authentification
        user_data["passwordHash"] = new_password_hash
        
        # Stocker le mot de passe en clair dans profile.password pour le super admin
        if "profile" not in user_data:
            user_data["profile"] = {}
        user_data["profile"]["password"] = new_password
        
        # Mettre à jour dans la base de données
        cur.execute(
            "UPDATE users SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(user_data), user_id),
        )
        updated_row = cur.fetchone()
        
        if not updated_row:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        item = {**updated_row[1], "id": updated_row[0]}
        # Ne pas retourner le mot de passe en clair dans la réponse
        if "profile" in item and "password" in item["profile"]:
            item["profile"]["password"] = "***"
        
        return {"success": True, "data": item, "message": "Mot de passe modifié avec succès"}


@app.get("/users/{user_id}")
def get_user(user_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, data FROM users WHERE id = %s;", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

@app.delete("/users/{user_id}", status_code=200)
def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier si l'utilisateur existe avant de supprimer
        cur.execute("SELECT id FROM users WHERE id = %s;", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        # Supprimer l'utilisateur
        cur.execute("DELETE FROM users WHERE id = %s;", (user_id,))
        deleted_count = cur.rowcount
        conn.commit()  # S'assurer que la transaction est commitée
        
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé ou déjà supprimé")
        
        print(f"[DELETE /users/{user_id}] Utilisateur supprimé (rowcount: {deleted_count})")
        return {"success": True, "deleted": deleted_count}

# Endpoint de diagnostic pour voir tous les utilisateurs (y compris les détails)
@app.get("/users/debug")
def debug_users(current_user: dict = Depends(require_role(["superAdmin"]))) -> Dict[str, Any]:
    """Endpoint de diagnostic pour voir tous les utilisateurs avec leurs détails complets"""
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT 
                id, 
                data, 
                created_at, 
                updated_at,
                data->>'username' as username,
                LOWER(TRIM(data->>'username')) as normalized_username
            FROM users 
            ORDER BY created_at DESC;
        """)
        rows = cur.fetchall()
        
        users_list = []
        for row in rows:
            user_id, data, created_at, updated_at, username, normalized_username = row
            users_list.append({
                "id": user_id,
                "username": username,
                "normalized_username": normalized_username,
                "full_data": {**data, "id": user_id},
                "created_at": created_at.isoformat() if created_at else None,
                "updated_at": updated_at.isoformat() if updated_at else None,
            })
        
        # Vérifier les doublons
        cur.execute("""
            SELECT 
                LOWER(TRIM(data->>'username')) as normalized_username,
                COUNT(*) as count,
                array_agg(id) as user_ids,
                array_agg(data->>'username') as usernames
            FROM users 
            WHERE data->>'username' IS NOT NULL
            GROUP BY LOWER(TRIM(data->>'username'))
            HAVING COUNT(*) > 1;
        """)
        duplicates = cur.fetchall()
        
        return {
            "success": True,
            "total_count": len(users_list),
            "users": users_list,
            "duplicates": [
                {
                    "normalized_username": dup[0],
                    "count": dup[1],
                    "user_ids": list(dup[2]),
                    "usernames": list(dup[3])
                }
                for dup in duplicates
            ]
        }

# Trailing slash variants for frontend compatibility
@app.get("/users/")
def list_users_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_users(current_user)

@app.post("/users/", status_code=201)
def create_user_slash(payload: Dict[str, Any], current_user: dict = Depends(require_role(["superAdmin"]))) -> Dict[str, Any]:
    return create_user(payload, current_user)

# ------- Project Members CRUD (stockage JSONB) -------

@app.get("/project-members")
def list_project_members(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM project_members WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}


@app.post("/project-members", status_code=201)
def create_project_member(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    member_id = payload.get("id") or uuid.uuid4().hex
    # S'assurer que l'id est dans le JSON stocké et assigner companyId
    data = {**payload, "id": member_id, "companyId": company_id}
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO project_members (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (member_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.put("/project-members/{member_id}")
def update_project_member(member_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM project_members WHERE id = %s AND data->>'companyId' = %s;",
                (member_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM project_members WHERE id = %s;", (member_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Membre non trouvé")
        
        # S'assurer que le companyId n'est pas modifié
        data = {**payload, "id": member_id}
        if company_id:
            data["companyId"] = company_id
        
        cur.execute(
            "UPDATE project_members SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), member_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.get("/project-members/{member_id}")
def get_project_member(member_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM project_members WHERE id = %s AND data->>'companyId' = %s;",
                (member_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM project_members WHERE id = %s;", (member_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Membre non trouvé")
        
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.delete("/project-members/{member_id}", status_code=200)
def delete_project_member(member_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM project_members WHERE id = %s AND data->>'companyId' = %s;",
                (member_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM project_members WHERE id = %s;", (member_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Membre non trouvé")
        
        cur.execute("DELETE FROM project_members WHERE id = %s;", (member_id,))
        return {"success": True}

# Trailing slash variants for frontend compatibility
@app.get("/project-members/")
def list_project_members_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_project_members(current_user)

@app.post("/project-members/", status_code=201)
def create_project_member_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_project_member(payload, current_user)

# ------- Vendor Invoices CRUD (stockage JSONB) -------

@app.get("/vendor-invoices")
def list_vendor_invoices(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM vendor_invoices WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}


@app.post("/vendor-invoices", status_code=201)
def create_vendor_invoice(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    invoice_id = payload.get("id") or uuid.uuid4().hex
    # S'assurer que l'id est dans le JSON stocké et assigner companyId
    data = {**payload, "id": invoice_id, "companyId": company_id}
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO vendor_invoices (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (invoice_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.put("/vendor-invoices/{invoice_id}")
def update_vendor_invoice(invoice_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM vendor_invoices WHERE id = %s AND data->>'companyId' = %s;",
                (invoice_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM vendor_invoices WHERE id = %s;", (invoice_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Facture fournisseur non trouvée")
        
        # S'assurer que le companyId n'est pas modifié
        data = {**payload, "id": invoice_id}
        if company_id:
            data["companyId"] = company_id
        
        cur.execute(
            "UPDATE vendor_invoices SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), invoice_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.get("/vendor-invoices/{invoice_id}")
def get_vendor_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM vendor_invoices WHERE id = %s AND data->>'companyId' = %s;",
                (invoice_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM vendor_invoices WHERE id = %s;", (invoice_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Facture fournisseur non trouvée")
        
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.delete("/vendor-invoices/{invoice_id}", status_code=200)
def delete_vendor_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM vendor_invoices WHERE id = %s AND data->>'companyId' = %s;",
                (invoice_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM vendor_invoices WHERE id = %s;", (invoice_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Facture fournisseur non trouvée")
        
        cur.execute("DELETE FROM vendor_invoices WHERE id = %s;", (invoice_id,))
        return {"success": True}

# Trailing slash variants for frontend compatibility
@app.get("/vendor-invoices/")
def list_vendor_invoices_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_vendor_invoices(current_user)

@app.post("/vendor-invoices/", status_code=201)
def create_vendor_invoice_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_vendor_invoice(payload, current_user)

# ------- Client Invoices CRUD (stockage JSONB) -------

@app.get("/client-invoices")
def list_client_invoices(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM client_invoices WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}


@app.post("/client-invoices", status_code=201)
def create_client_invoice(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    invoice_id = payload.get("id") or uuid.uuid4().hex
    # S'assurer que l'id est dans le JSON stocké et assigner companyId
    data = {**payload, "id": invoice_id, "companyId": company_id}
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO client_invoices (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (invoice_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.put("/client-invoices/{invoice_id}")
def update_client_invoice(invoice_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM client_invoices WHERE id = %s AND data->>'companyId' = %s;",
                (invoice_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM client_invoices WHERE id = %s;", (invoice_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Facture client non trouvée")
        
        # S'assurer que le companyId n'est pas modifié
        data = {**payload, "id": invoice_id}
        if company_id:
            data["companyId"] = company_id
        
        cur.execute(
            "UPDATE client_invoices SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), invoice_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.get("/client-invoices/{invoice_id}")
def get_client_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM client_invoices WHERE id = %s AND data->>'companyId' = %s;",
                (invoice_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM client_invoices WHERE id = %s;", (invoice_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Facture client non trouvée")
        
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.delete("/client-invoices/{invoice_id}", status_code=200)
def delete_client_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM client_invoices WHERE id = %s AND data->>'companyId' = %s;",
                (invoice_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM client_invoices WHERE id = %s;", (invoice_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Facture client non trouvée")
        
        cur.execute("DELETE FROM client_invoices WHERE id = %s;", (invoice_id,))
        return {"success": True}

# Trailing slash variants for frontend compatibility
@app.get("/client-invoices/")
def list_client_invoices_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_client_invoices(current_user)

@app.post("/client-invoices/", status_code=201)
def create_client_invoice_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_client_invoice(payload, current_user)

# ------- Purchases minimal CRUD (stockage JSONB) -------

@app.get("/purchases")
def list_purchases(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM purchases WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}


@app.post("/purchases", status_code=201)
def create_purchase(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    purchase_id = payload.get("id") or uuid.uuid4().hex
    data = {**payload, "id": purchase_id, "companyId": company_id}
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO purchases (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (purchase_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.put("/purchases/{purchase_id}")
def update_purchase(purchase_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM purchases WHERE id = %s AND data->>'companyId' = %s;",
                (purchase_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM purchases WHERE id = %s;", (purchase_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Achat non trouvé")
        
        # S'assurer que le companyId n'est pas modifié
        data = {**payload, "id": purchase_id}
        if company_id:
            data["companyId"] = company_id
        
        cur.execute(
            "UPDATE purchases SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), purchase_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.get("/purchases/{purchase_id}")
def get_purchase(purchase_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM purchases WHERE id = %s AND data->>'companyId' = %s;",
                (purchase_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM purchases WHERE id = %s;", (purchase_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Achat non trouvé")
        
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.delete("/purchases/{purchase_id}", status_code=200)
def delete_purchase(purchase_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM purchases WHERE id = %s AND data->>'companyId' = %s;",
                (purchase_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM purchases WHERE id = %s;", (purchase_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Achat non trouvé")
        
        cur.execute("DELETE FROM purchases WHERE id = %s;", (purchase_id,))
        return {"success": True}


# Trailing slash variants for frontend compatibility
@app.get("/purchases/")
def list_purchases_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_purchases(current_user)


@app.post("/purchases/", status_code=201)
def create_purchase_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_purchase(payload, current_user)

# ------- Documents CRUD (stockage JSONB) -------

@app.get("/documents")
def list_documents(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM documents WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}


@app.post("/documents", status_code=201)
def create_document(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    document_id = payload.get("id") or uuid.uuid4().hex
    data = {**payload, "id": document_id, "companyId": company_id}
    # S'assurer que updatedAt est défini
    if "updatedAt" not in data:
        from datetime import datetime
        data["updatedAt"] = datetime.now().isoformat()
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO documents (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (document_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.put("/documents/{document_id}")
def update_document(document_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM documents WHERE id = %s AND data->>'companyId' = %s;",
                (document_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM documents WHERE id = %s;", (document_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        # S'assurer que le companyId n'est pas modifié
        data = {**payload, "id": document_id}
        if company_id:
            data["companyId"] = company_id
        
        # Mettre à jour updatedAt
        from datetime import datetime
        data["updatedAt"] = datetime.now().isoformat()
        
        cur.execute(
            "UPDATE documents SET data = %s::jsonb, updated_at = NOW() WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), document_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.get("/documents/{document_id}")
def get_document(document_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM documents WHERE id = %s AND data->>'companyId' = %s;",
                (document_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM documents WHERE id = %s;", (document_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.delete("/documents/{document_id}", status_code=200)
def delete_document(document_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM documents WHERE id = %s AND data->>'companyId' = %s;",
                (document_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM documents WHERE id = %s;", (document_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        cur.execute("DELETE FROM documents WHERE id = %s;", (document_id,))
        return {"success": True}

# Trailing slash variants for frontend compatibility
@app.get("/documents/")
def list_documents_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_documents(current_user)

@app.post("/documents/", status_code=201)
def create_document_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_document(payload, current_user)

# ------- Subscriptions CRUD (stockage JSONB) -------

@app.get("/subscriptions")
def list_subscriptions(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM subscriptions WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}


@app.post("/subscriptions", status_code=201)
def create_subscription(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    subscription_id = payload.get("id") or uuid.uuid4().hex
    data = {**payload, "id": subscription_id, "companyId": company_id}
    # S'assurer que createdAt et updatedAt sont définis
    from datetime import datetime
    if "createdAt" not in data:
        data["createdAt"] = datetime.now().isoformat()
    if "updatedAt" not in data:
        data["updatedAt"] = datetime.now().isoformat()
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO subscriptions (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (subscription_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


# Trailing slash variants for frontend compatibility (DOIT être avant les routes avec paramètres)
@app.get("/subscriptions/")
def list_subscriptions_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_subscriptions(current_user)

@app.post("/subscriptions/", status_code=201)
def create_subscription_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_subscription(payload, current_user)

@app.get("/subscriptions/{subscription_id}")
def get_subscription(subscription_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM subscriptions WHERE id = %s AND data->>'companyId' = %s;",
                (subscription_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM subscriptions WHERE id = %s;", (subscription_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Abonnement non trouvé")
        
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.put("/subscriptions/{subscription_id}")
def update_subscription(subscription_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM subscriptions WHERE id = %s AND data->>'companyId' = %s;",
                (subscription_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM subscriptions WHERE id = %s;", (subscription_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Abonnement non trouvé")
        
        # S'assurer que le companyId n'est pas modifié
        data = {**payload, "id": subscription_id}
        if company_id:
            data["companyId"] = company_id
        
        # Mettre à jour updatedAt
        from datetime import datetime
        data["updatedAt"] = datetime.now().isoformat()
        
        cur.execute(
            "UPDATE subscriptions SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(data), subscription_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.delete("/subscriptions/{subscription_id}", status_code=200)
def delete_subscription(subscription_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM subscriptions WHERE id = %s AND data->>'companyId' = %s;",
                (subscription_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM subscriptions WHERE id = %s;", (subscription_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Abonnement non trouvé")
        
        cur.execute("DELETE FROM subscriptions WHERE id = %s;", (subscription_id,))
        conn.commit()
        return {"success": True}


@app.post("/subscriptions/{subscription_id}/transfer", status_code=200)
def transfer_subscription(subscription_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Transfère un abonnement d'une entreprise vers une autre.
    """
    company_id = current_user.get("companyId")
    target_company_id = payload.get("targetCompanyId")
    
    if not target_company_id:
        raise HTTPException(status_code=400, detail="targetCompanyId est requis")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que l'abonnement existe et appartient à l'entreprise actuelle
        if company_id:
            cur.execute(
                "SELECT id, data FROM subscriptions WHERE id = %s AND data->>'companyId' = %s;",
                (subscription_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM subscriptions WHERE id = %s;", (subscription_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Abonnement non trouvé")
        
        # Vérifier que l'entreprise de destination existe
        cur.execute("SELECT id FROM companies WHERE id = %s;", (target_company_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Entreprise de destination non trouvée")
        
        # Mettre à jour le companyId de l'abonnement
        subscription_data = existing[1]
        subscription_data["companyId"] = target_company_id
        
        cur.execute(
            "UPDATE subscriptions SET data = %s::jsonb, updated_at = NOW() WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(subscription_data), subscription_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}

# ------- Appointments CRUD (engagements/devis) (stockage JSONB) -------

@app.get("/appointments")
def list_appointments(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        return {"success": True, "data": []}
    
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data FROM appointments WHERE data->>'companyId' = %s ORDER BY created_at DESC;",
            (company_id,)
        )
        rows = cur.fetchall()
        items = [{**row[1], "id": row[0]} for row in rows]
        return {"success": True, "data": items}


@app.post("/appointments", status_code=201)
def create_appointment(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    appointment_id = payload.get("id") or uuid.uuid4().hex
    data = {**payload, "id": appointment_id, "companyId": company_id}
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO appointments (id, data)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
            RETURNING id, data;
            """,
            (appointment_id, psycopg.types.json.Json(data)),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.put("/appointments/{appointment_id}")
def update_appointment(appointment_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id, data FROM appointments WHERE id = %s AND data->>'companyId' = %s;",
                (appointment_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM appointments WHERE id = %s;", (appointment_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")
        
        # Récupérer les données existantes pour fusionner avec le payload
        existing_data = existing[1] if existing else {}
        
        # Fusionner les données existantes avec les nouvelles données
        # Cela préserve les champs non fournis dans le payload
        merged_data = {**existing_data, **payload, "id": appointment_id}
        
        # S'assurer que le companyId n'est pas modifié
        if company_id:
            merged_data["companyId"] = company_id
        
        cur.execute(
            "UPDATE appointments SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(merged_data), appointment_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.get("/appointments/{appointment_id}")
def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        if company_id:
            cur.execute(
                "SELECT id, data FROM appointments WHERE id = %s AND data->>'companyId' = %s;",
                (appointment_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM appointments WHERE id = %s;", (appointment_id,))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")
        
        if company_id and row[1].get("companyId") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


@app.delete("/appointments/{appointment_id}", status_code=200)
def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("companyId")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que la ressource existe et appartient à l'entreprise
        if company_id:
            cur.execute(
                "SELECT id FROM appointments WHERE id = %s AND data->>'companyId' = %s;",
                (appointment_id, company_id)
            )
        else:
            cur.execute("SELECT id FROM appointments WHERE id = %s;", (appointment_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")
        
        cur.execute("DELETE FROM appointments WHERE id = %s;", (appointment_id,))
        return {"success": True}


@app.post("/appointments/{appointment_id}/transfer", status_code=200)
def transfer_appointment(appointment_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Transfère un engagement (prestation) d'une entreprise vers une autre.
    """
    company_id = current_user.get("companyId")
    target_company_id = payload.get("targetCompanyId")
    
    if not target_company_id:
        raise HTTPException(status_code=400, detail="targetCompanyId est requis")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Vérifier que l'engagement existe et appartient à l'entreprise actuelle
        if company_id:
            cur.execute(
                "SELECT id, data FROM appointments WHERE id = %s AND data->>'companyId' = %s;",
                (appointment_id, company_id)
            )
        else:
            cur.execute("SELECT id, data FROM appointments WHERE id = %s;", (appointment_id,))
        
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Engagement non trouvé")
        
        # Vérifier que l'entreprise de destination existe
        cur.execute("SELECT id FROM companies WHERE id = %s;", (target_company_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Entreprise de destination non trouvée")
        
        # Mettre à jour le companyId de l'engagement
        appointment_data = existing[1]
        appointment_data["companyId"] = target_company_id
        
        cur.execute(
            "UPDATE appointments SET data = %s::jsonb, updated_at = NOW() WHERE id = %s RETURNING id, data;",
            (psycopg.types.json.Json(appointment_data), appointment_id),
        )
        row = cur.fetchone()
        item = {**row[1], "id": row[0]}
        return {"success": True, "data": item}


# Trailing slash variants for frontend compatibility
@app.get("/appointments/")
def list_appointments_slash(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return list_appointments(current_user)

@app.post("/appointments/", status_code=201)
def create_appointment_slash(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    return create_appointment(payload, current_user)

# ------- Accounting Dashboard -------

@app.get("/accounting/dashboard")
def get_accounting_dashboard(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Calcule les KPIs du dashboard comptable en agrégeant les factures clients et fournisseurs.
    """
    with get_db_connection() as conn, conn.cursor() as cur:
        # Récupérer toutes les factures clients
        cur.execute("SELECT id, data FROM client_invoices ORDER BY created_at DESC;")
        client_invoice_rows = cur.fetchall()
        client_invoices = [{**row[1], "id": row[0]} for row in client_invoice_rows]
        
        # Récupérer toutes les factures fournisseurs
        cur.execute("SELECT id, data FROM vendor_invoices ORDER BY created_at DESC;")
        vendor_invoice_rows = cur.fetchall()
        vendor_invoices = [{**row[1], "id": row[0]} for row in vendor_invoice_rows]
        
        # Calculer les totaux
        total_revenue = sum(inv.get("amountTtc", 0) or 0 for inv in client_invoices)
        total_expenses = sum(inv.get("amountTtc", 0) or 0 for inv in vendor_invoices)
        total_profit = total_revenue - total_expenses
        
        # Calculer la TVA
        vat_collected = sum(
            inv.get("vatAmount", 0) or 0 
            for inv in client_invoices 
            if inv.get("vatEnabled", False)
        )
        vat_deductible = sum(
            inv.get("vatAmount", 0) or 0 
            for inv in vendor_invoices 
            if inv.get("vatEnabled", False)
        )
        net_vat = vat_collected - vat_deductible
        
        # Calculer les tendances sur 6 mois
        from datetime import datetime, timedelta
        from collections import defaultdict
        
        six_months_ago = datetime.now() - timedelta(days=180)
        revenue_by_month = defaultdict(float)
        expenses_by_month = defaultdict(float)
        
        for inv in client_invoices:
            issue_date_str = inv.get("issueDate")
            if issue_date_str:
                try:
                    issue_date = datetime.fromisoformat(issue_date_str.replace('Z', '+00:00'))
                    if issue_date >= six_months_ago:
                        month_key = issue_date.strftime("%Y-%m")
                        revenue_by_month[month_key] += inv.get("amountTtc", 0) or 0
                except (ValueError, AttributeError):
                    pass
        
        for inv in vendor_invoices:
            issue_date_str = inv.get("issueDate")
            if issue_date_str:
                try:
                    issue_date = datetime.fromisoformat(issue_date_str.replace('Z', '+00:00'))
                    if issue_date >= six_months_ago:
                        month_key = issue_date.strftime("%Y-%m")
                        expenses_by_month[month_key] += inv.get("amountTtc", 0) or 0
                except (ValueError, AttributeError):
                    pass
        
        # Générer les 6 derniers mois
        chart_points = []
        for i in range(5, -1, -1):
            month_date = datetime.now() - timedelta(days=30 * i)
            month_key = month_date.strftime("%Y-%m")
            month_label = month_date.strftime("%b %Y")
            chart_points.append({
                "label": month_label,
                "revenue": revenue_by_month.get(month_key, 0),
                "expenses": expenses_by_month.get(month_key, 0),
            })
        
        # Calculer les tendances (comparaison avec le mois précédent)
        current_month = datetime.now().strftime("%Y-%m")
        previous_month = (datetime.now() - timedelta(days=30)).strftime("%Y-%m")
        
        current_revenue = revenue_by_month.get(current_month, 0)
        previous_revenue = revenue_by_month.get(previous_month, 0)
        revenue_trend = ((current_revenue - previous_revenue) / previous_revenue * 100) if previous_revenue > 0 else 0
        
        current_expenses = expenses_by_month.get(current_month, 0)
        previous_expenses = expenses_by_month.get(previous_month, 0)
        expenses_trend = ((current_expenses - previous_expenses) / previous_expenses * 100) if previous_expenses > 0 else 0
        
        profit_trend = revenue_trend - expenses_trend if revenue_trend and expenses_trend else 0
        
        return {
            "success": True,
            "data": {
                "kpis": {
                    "revenue": {
                        "id": "revenue",
                        "label": "Chiffre d'affaires",
                        "value": total_revenue,
                        "trend": revenue_trend,
                        "trendLabel": "vs mois précédent"
                    },
                    "expenses": {
                        "id": "expenses",
                        "label": "Dépenses",
                        "value": total_expenses,
                        "trend": expenses_trend,
                        "trendLabel": "vs mois précédent"
                    },
                    "profit": {
                        "id": "profit",
                        "label": "Bénéfice net",
                        "value": total_profit,
                        "trend": profit_trend,
                        "trendLabel": "vs mois précédent"
                    },
                    "vat": {
                        "id": "vat",
                        "label": "TVA nette",
                        "value": net_vat,
                        "trend": 0,
                        "trendLabel": ""
                    }
                },
                "charts": {
                    "revenueExpenses": chart_points,
                    "profit": [
                        {
                            "label": point["label"],
                            "value": point["revenue"] - point["expenses"]
                        }
                        for point in chart_points
                    ]
                },
                "summary": {
                    "totalInvoices": len(client_invoices),
                    "totalVendorInvoices": len(vendor_invoices),
                    "vatCollected": vat_collected,
                    "vatDeductible": vat_deductible
                }
            }
        }

@app.get("/accounting/vat")
def get_accounting_vat(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Calcule les données TVA : snapshot de la période actuelle et historique sur 4 périodes.
    """
    with get_db_connection() as conn, conn.cursor() as cur:
        # Récupérer toutes les factures clients
        cur.execute("SELECT id, data FROM client_invoices ORDER BY created_at DESC;")
        client_invoice_rows = cur.fetchall()
        client_invoices = [{**row[1], "id": row[0]} for row in client_invoice_rows]
        
        # Récupérer toutes les factures fournisseurs
        cur.execute("SELECT id, data FROM vendor_invoices ORDER BY created_at DESC;")
        vendor_invoice_rows = cur.fetchall()
        vendor_invoices = [{**row[1], "id": row[0]} for row in vendor_invoice_rows]
        
        from datetime import datetime, timedelta
        from collections import defaultdict
        
        # Déterminer la période actuelle (mois ou trimestre)
        now = datetime.now()
        current_month = now.strftime("%Y-%m")
        current_year = now.year
        current_quarter = (now.month - 1) // 3 + 1
        current_quarter_key = f"{current_year}-T{current_quarter}"
        
        # Par défaut, on utilise la fréquence mensuelle
        declaration_frequency = "Mensuelle"
        period_label = now.strftime("%B %Y")
        period_key = current_month
        
        # Calculer les dates de déclaration (mensuelle : fin du mois suivant)
        next_declaration = now.replace(day=1) + timedelta(days=32)
        next_declaration = next_declaration.replace(day=1) + timedelta(days=14)  # ~15 du mois suivant
        payment_deadline = next_declaration + timedelta(days=15)  # ~30 jours après déclaration
        
        last_declaration = now.replace(day=1) - timedelta(days=1)
        last_declaration = last_declaration.replace(day=15)
        
        # Calculer la TVA pour la période actuelle
        current_collected = 0
        current_deductible = 0
        
        for inv in client_invoices:
            issue_date_str = inv.get("issueDate")
            if issue_date_str and inv.get("vatEnabled", False):
                try:
                    issue_date = datetime.fromisoformat(issue_date_str.replace('Z', '+00:00'))
                    if issue_date.strftime("%Y-%m") == current_month:
                        current_collected += inv.get("vatAmount", 0) or 0
                except (ValueError, AttributeError):
                    pass
        
        for inv in vendor_invoices:
            issue_date_str = inv.get("issueDate")
            if issue_date_str and inv.get("vatEnabled", False):
                try:
                    issue_date = datetime.fromisoformat(issue_date_str.replace('Z', '+00:00'))
                    if issue_date.strftime("%Y-%m") == current_month:
                        current_deductible += inv.get("vatAmount", 0) or 0
                except (ValueError, AttributeError):
                    pass
        
        # Calculer l'historique sur 4 périodes (4 derniers mois)
        history = []
        for i in range(3, -1, -1):
            month_date = now - timedelta(days=30 * i)
            month_key = month_date.strftime("%Y-%m")
            month_label = month_date.strftime("%B %Y")
            
            period_collected = 0
            period_deductible = 0
            
            for inv in client_invoices:
                issue_date_str = inv.get("issueDate")
                if issue_date_str and inv.get("vatEnabled", False):
                    try:
                        issue_date = datetime.fromisoformat(issue_date_str.replace('Z', '+00:00'))
                        if issue_date.strftime("%Y-%m") == month_key:
                            period_collected += inv.get("vatAmount", 0) or 0
                    except (ValueError, AttributeError):
                        pass
            
            for inv in vendor_invoices:
                issue_date_str = inv.get("issueDate")
                if issue_date_str and inv.get("vatEnabled", False):
                    try:
                        issue_date = datetime.fromisoformat(issue_date_str.replace('Z', '+00:00'))
                        if issue_date.strftime("%Y-%m") == month_key:
                            period_deductible += inv.get("vatAmount", 0) or 0
                    except (ValueError, AttributeError):
                        pass
            
            history.append({
                "period": month_label,
                "collected": period_collected,
                "deductible": period_deductible,
            })
        
        return {
            "success": True,
            "data": {
                "snapshot": {
                    "periodLabel": period_label,
                    "collected": current_collected,
                    "deductible": current_deductible,
                    "declarationFrequency": declaration_frequency,
                    "nextDeclarationDate": next_declaration.isoformat(),
                    "lastDeclarationDate": last_declaration.isoformat(),
                    "paymentDeadline": payment_deadline.isoformat(),
                },
                "history": history,
            }
        }


# ------- Stats Overview -------

@app.get("/stats/overview")
def get_stats_overview(
    current_user: dict = Depends(get_current_user),
    start: Optional[str] = None,
    end: Optional[str] = None,
    category: Optional[str] = None,
    city: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Calcule les statistiques d'activité à partir des factures clients, services et clients.
    
    Paramètres:
    - start: Date de début (format ISO: YYYY-MM-DD)
    - end: Date de fin (format ISO: YYYY-MM-DD)
    - category: Filtre par catégorie de service (optionnel)
    - city: Filtre par ville (optionnel)
    """
    from datetime import datetime, timedelta
    
    # Dates par défaut : trimestre en cours
    now = datetime.now()
    if not start:
        # Début du trimestre
        quarter_start_month = ((now.month - 1) // 3) * 3 + 1
        start_date = datetime(now.year, quarter_start_month, 1)
        start = start_date.strftime("%Y-%m-%d")
    else:
        try:
            start_date = datetime.strptime(start, "%Y-%m-%d")
        except:
            start_date = datetime(now.year, now.month, 1)
            start = start_date.strftime("%Y-%m-%d")
    
    if not end:
        # Fin du trimestre
        quarter_end_month = ((now.month - 1) // 3 + 1) * 3
        if quarter_end_month > 12:
            quarter_end_month = 12
            end_date = datetime(now.year + 1, 1, 1) - timedelta(days=1)
        else:
            if quarter_end_month in [1, 3, 5, 7, 8, 10, 12]:
                last_day = 31
            elif quarter_end_month in [4, 6, 9, 11]:
                last_day = 30
            else:
                # Février
                if now.year % 4 == 0 and (now.year % 100 != 0 or now.year % 400 == 0):
                    last_day = 29
                else:
                    last_day = 28
            end_date = datetime(now.year, quarter_end_month, last_day, 23, 59, 59)
        end = end_date.strftime("%Y-%m-%d")
    else:
        try:
            end_date = datetime.strptime(end, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999)
        except:
            end_date = now
            end = end_date.strftime("%Y-%m-%d")
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Récupérer toutes les factures clients
        cur.execute("SELECT id, data FROM client_invoices;")
        invoice_rows = cur.fetchall()
        invoices = [{**row[1], "id": row[0]} for row in invoice_rows]
        
        # Récupérer tous les services
        cur.execute("SELECT id, data FROM services;")
        service_rows = cur.fetchall()
        services = {row[0]: row[1] for row in service_rows}
        
        # Récupérer tous les clients
        cur.execute("SELECT id, data FROM clients;")
        client_rows = cur.fetchall()
        clients = {row[0]: row[1] for row in client_rows}
        
        # Filtrer les factures selon les critères
        filtered_invoices = []
        for inv in invoices:
            # Filtrer par date
            issue_date_str = inv.get("issueDate")
            if not issue_date_str:
                continue
            try:
                # Supprimer le timezone si présent
                issue_date_str_clean = issue_date_str.split('T')[0] if 'T' in issue_date_str else issue_date_str
                issue_date = datetime.strptime(issue_date_str_clean, "%Y-%m-%d")
                if issue_date < start_date or issue_date > end_date:
                    continue
            except:
                continue
            
            # Filtrer par catégorie
            if category and category != "all":
                service_id = inv.get("serviceId")
                if service_id:
                    service = services.get(service_id, {})
                    if service.get("category") != category:
                        continue
            
            # Filtrer par ville
            if city and city != "all":
                client_id = inv.get("clientId")
                if client_id:
                    client = clients.get(client_id, {})
                    if client.get("city") != city:
                        continue
            
            # Exclure les factures annulées
            status = inv.get("status")
            if status in ["annulé", "refusé"]:
                continue
            
            filtered_invoices.append(inv)
        
        # Calculer les KPIs
        total_revenue = sum(inv.get("amountHt", 0) or 0 for inv in filtered_invoices)
        total_volume = len(filtered_invoices)
        average_ticket = total_revenue / total_volume if total_volume > 0 else 0
        
        # Calculer la durée totale (approximation basée sur les services)
        total_duration = 0
        for inv in filtered_invoices:
            service_id = inv.get("serviceId")
            if service_id:
                service = services.get(service_id, {})
                options = service.get("options", [])
                # Estimation : prendre la durée par défaut de la première option
                if options and len(options) > 0:
                    total_duration += options[0].get("defaultDurationMin", 0) or 0
        
        revenue_per_hour = total_revenue / (total_duration / 60) if (total_duration / 60) > 0 else 0
        
        # Clients uniques
        unique_client_ids = set(inv.get("clientId") for inv in filtered_invoices if inv.get("clientId"))
        unique_clients = len(unique_client_ids)
        
        # Répartition par catégorie
        category_breakdown = {}
        for inv in filtered_invoices:
            service_id = inv.get("serviceId")
            if service_id:
                service = services.get(service_id, {})
                cat = service.get("category", "Autre")
                if cat not in category_breakdown:
                    category_breakdown[cat] = {"revenue": 0, "volume": 0, "duration": 0}
                category_breakdown[cat]["revenue"] += inv.get("amountHt", 0) or 0
                category_breakdown[cat]["volume"] += 1
                options = service.get("options", [])
                if options and len(options) > 0:
                    category_breakdown[cat]["duration"] += options[0].get("defaultDurationMin", 0) or 0
        
        category_data = [
            {"category": cat, **data}
            for cat, data in category_breakdown.items()
        ]
        category_data.sort(key=lambda x: x["revenue"], reverse=True)
        
        # Statistiques par ville
        city_stats = {}
        for inv in filtered_invoices:
            client_id = inv.get("clientId")
            if client_id:
                client = clients.get(client_id, {})
                city_name = client.get("city", "Non renseigné")
                if city_name not in city_stats:
                    city_stats[city_name] = {"interventions": 0, "revenue": 0, "duration": 0}
                city_stats[city_name]["interventions"] += 1
                city_stats[city_name]["revenue"] += inv.get("amountHt", 0) or 0
                service_id = inv.get("serviceId")
                if service_id:
                    service = services.get(service_id, {})
                    options = service.get("options", [])
                    if options and len(options) > 0:
                        city_stats[city_name]["duration"] += options[0].get("defaultDurationMin", 0) or 0
        
        city_data = [
            {"city": city_name, **data}
            for city_name, data in city_stats.items()
        ]
        city_data.sort(key=lambda x: x["revenue"], reverse=True)
        top_cities = city_data[:5]
        
        # Données de tendance temporelle (par jour/semaine/mois selon la période)
        days_diff = (end_date - start_date).days
        if days_diff <= 14:
            bucket_mode = "day"
        elif days_diff <= 90:
            bucket_mode = "week"
        else:
            bucket_mode = "month"
        
        # Construire les buckets temporels
        trend_data = []
        current = start_date
        while current <= end_date:
            if bucket_mode == "day":
                bucket_end = current.replace(hour=23, minute=59, second=59)
                label = current.strftime("%d %b")
                next_date = current + timedelta(days=1)
            elif bucket_mode == "week":
                # Semaine du lundi au dimanche
                days_to_monday = (current.weekday()) % 7
                week_start = current - timedelta(days=days_to_monday)
                bucket_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
                if bucket_end > end_date:
                    bucket_end = end_date
                label = f"Sem. {week_start.strftime('%U')}"
                next_date = week_start + timedelta(days=7)
            else:  # month
                # Premier jour du mois
                month_start = current.replace(day=1)
                # Dernier jour du mois
                if month_start.month == 12:
                    month_end = datetime(month_start.year + 1, 1, 1) - timedelta(days=1)
                else:
                    month_end = datetime(month_start.year, month_start.month + 1, 1) - timedelta(days=1)
                bucket_end = month_end.replace(hour=23, minute=59, second=59)
                if bucket_end > end_date:
                    bucket_end = end_date
                label = month_start.strftime("%b %Y")
                next_date = month_end + timedelta(days=1)
            
            # Calculer les stats pour ce bucket
            bucket_invoices = []
            for inv in filtered_invoices:
                issue_date_str = inv.get("issueDate")
                if not issue_date_str:
                    continue
                try:
                    issue_date_str_clean = issue_date_str.split('T')[0] if 'T' in issue_date_str else issue_date_str
                    issue_date = datetime.strptime(issue_date_str_clean, "%Y-%m-%d")
                    if issue_date >= current and issue_date <= bucket_end:
                        bucket_invoices.append(inv)
                except:
                    continue
            
            bucket_revenue = sum(inv.get("amountHt", 0) or 0 for inv in bucket_invoices)
            bucket_volume = len(bucket_invoices)
            bucket_duration = 0
            for inv in bucket_invoices:
                service_id = inv.get("serviceId")
                if service_id:
                    service = services.get(service_id, {})
                    options = service.get("options", [])
                    if options and len(options) > 0:
                        bucket_duration += options[0].get("defaultDurationMin", 0) or 0
            bucket_average_ticket = bucket_revenue / bucket_volume if bucket_volume > 0 else 0
            
            trend_data.append({
                "label": label,
                "start": current.isoformat(),
                "end": bucket_end.isoformat(),
                "revenue": bucket_revenue,
                "volume": bucket_volume,
                "duration": bucket_duration,
                "averageTicket": bucket_average_ticket,
            })
            
            current = next_date
            if current > end_date:
                break
        
        # Villes disponibles pour le filtre
        available_cities = sorted(set(
            clients.get(inv.get("clientId", ""), {}).get("city", "Non renseigné")
            for inv in invoices
            if inv.get("clientId")
        ))
        
        return {
            "success": True,
            "data": {
                "period": {
                    "start": start,
                    "end": end,
                },
                "kpis": {
                    "totalVolume": total_volume,
                    "totalRevenue": total_revenue,
                    "averageTicket": average_ticket,
                    "totalDuration": total_duration,
                    "revenuePerHour": revenue_per_hour,
                    "uniqueClients": unique_clients,
                },
                "trendData": trend_data,
                "categoryBreakdown": category_data,
                "cityStats": top_cities,
                "availableCities": available_cities,
            }
        }


# ------- Administratif Overview -------

@app.get("/administratif/overview")
def get_administratif_overview(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Calcule les statistiques et données pour la vue d'ensemble administrative.
    """
    from datetime import datetime, timedelta
    from collections import defaultdict
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Récupérer tous les utilisateurs
        cur.execute("SELECT id, data FROM users;")
        user_rows = cur.fetchall()
        users = [{**row[1], "id": row[0]} for row in user_rows]
        
        # Récupérer tous les achats
        cur.execute("SELECT id, data FROM purchases;")
        purchase_rows = cur.fetchall()
        purchases = [{**row[1], "id": row[0]} for row in purchase_rows]
        
        # Récupérer toutes les companies
        cur.execute("SELECT id, data FROM companies;")
        company_rows = cur.fetchall()
        companies = [{**row[1], "id": row[0]} for row in company_rows]
        
        # Calculer les statistiques
        active_users = [u for u in users if u.get("active", True)]
        active_collaborators = len(active_users)
        unique_roles = len(set(u.get("role", "") for u in users if u.get("role")))
        
        # Pour les documents, on retourne 0 pour l'instant car ils ne sont pas encore en base
        total_documents = 0
        documents_to_review = 0
        
        # Fournisseurs uniques
        unique_vendors = len(set(p.get("vendor", "") for p in purchases if p.get("vendor")))
        
        stats = [
            {
                "label": "Collaborateurs actifs",
                "value": str(active_collaborators),
                "hint": f"{unique_roles} rôle(s) représenté(s)",
            },
            {
                "label": "Documents",
                "value": str(total_documents),
                "hint": f"{documents_to_review} révision(s) à planifier",
            },
            {
                "label": "Fournisseurs référencés",
                "value": str(unique_vendors),
                "hint": f"{len(purchases)} achats suivis",
            },
            {
                "label": "Sites / Structures",
                "value": str(len(companies)),
                "hint": "Actifs dans la base légale",
            },
        ]
        
        # Échéances prioritaires (vide pour l'instant, documents pas en base)
        upcoming_deadlines = []
        
        # Flux fournisseurs (top 5)
        vendor_map = defaultdict(lambda: {
            "vendor": "",
            "purchaseCount": 0,
            "totalTtc": 0.0,
            "lastPurchase": None,
            "categories": set(),
        })
        
        for purchase in purchases:
            vendor_name = purchase.get("vendor", "Non renseigné")
            vendor_data = vendor_map[vendor_name]
            vendor_data["vendor"] = vendor_name
            vendor_data["purchaseCount"] += 1
            vendor_data["totalTtc"] += purchase.get("amountTtc", 0) or 0
            
            purchase_date = purchase.get("date")
            if purchase_date:
                if not vendor_data["lastPurchase"]:
                    vendor_data["lastPurchase"] = purchase_date
                else:
                    try:
                        current_last = datetime.fromisoformat(vendor_data["lastPurchase"].replace('Z', '+00:00'))
                        new_date = datetime.fromisoformat(purchase_date.replace('Z', '+00:00'))
                        if new_date > current_last:
                            vendor_data["lastPurchase"] = purchase_date
                    except:
                        pass
            
            category = purchase.get("category", "")
            if category:
                vendor_data["categories"].add(category)
        
        supplier_highlights = sorted(
            [
                {
                    "vendor": data["vendor"],
                    "purchaseCount": data["purchaseCount"],
                    "totalTtc": data["totalTtc"],
                    "lastPurchase": data["lastPurchase"],
                    "categories": list(data["categories"]),
                }
                for data in vendor_map.values()
            ],
            key=lambda x: x["totalTtc"],
            reverse=True
        )[:5]
        
        # Focus RH (collaborateurs actifs)
        hr_focus = []
        for user in active_users:
            profile = user.get("profile", {})
            hr_focus.append({
                "id": user.get("id", ""),
                "name": user.get("fullName", "Non renseigné"),
                "role": user.get("role", ""),
                "email": profile.get("email", ""),
                "phone": profile.get("phone", ""),
                "lastPasswordUpdate": profile.get("emailSignatureUpdatedAt"),
            })
        
        return {
            "success": True,
            "data": {
                "stats": stats,
                "upcomingDeadlines": upcoming_deadlines,
                "supplierHighlights": supplier_highlights,
                "hrFocus": hr_focus,
            }
        }


# ------- Authentification -------

from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from datetime import timedelta

@app.post("/auth/login")
def login(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Authentifie l'utilisateur avec son nom d'utilisateur et mot de passe depuis la base de données
    """
    username = payload.get("username", "").strip()
    password = payload.get("password", "")

    if not username or not password:
        raise HTTPException(status_code=401, detail="Nom d'utilisateur et mot de passe requis")

    # Rechercher l'utilisateur dans la base de données
    with get_db_connection() as conn, conn.cursor() as cur:
        # Rechercher par username (insensible à la casse)
        cur.execute(
            "SELECT id, data FROM users WHERE LOWER(data->>'username') = LOWER(%s);",
            (username,)
        )
        row = cur.fetchone()
        
        if not row:
            raise HTTPException(status_code=401, detail="Identifiants invalides")
        
        user_id, user_data = row[0], row[1]
        
        # Vérifier si l'utilisateur est actif
        if not user_data.get("active", True):
            raise HTTPException(status_code=403, detail="Compte désactivé")
        
        # Vérifier le mot de passe
        password_hash = user_data.get("passwordHash")
        if not password_hash:
            raise HTTPException(status_code=401, detail="Mot de passe non configuré")
        
        if not verify_password(password, password_hash):
            raise HTTPException(status_code=401, detail="Identifiants invalides")

    # Créer le token JWT (valide 1 an)
    access_token = create_access_token(
        data={"sub": user_id, "username": user_data.get("username", username)},
        expires_delta=timedelta(days=365),
    )

    # Retourner les informations utilisateur (sans le mot de passe)
    user_response = {
        "id": user_id,
        "username": user_data.get("username", username),
        "fullName": user_data.get("fullName", ""),
        "role": user_data.get("role", "agent"),
        "active": user_data.get("active", True),
        "pages": user_data.get("pages", []),
        "permissions": user_data.get("permissions", []),
        "companyId": user_data.get("companyId"),
        "profile": user_data.get("profile", {}),
        "notificationPreferences": user_data.get("notificationPreferences", {}),
    }

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response,
        },
    }


# Endpoint /auth/register supprimé - La création d'utilisateurs se fait uniquement
# depuis la page administrateur via POST /users/




@app.get("/auth/me")
def get_current_user_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Récupère les informations de l'utilisateur actuellement authentifié
    Utilise la dépendance get_current_user qui gère déjà l'authentification
    """
    # L'utilisateur est déjà authentifié et chargé par get_current_user
    # Retourner les données complètes de l'utilisateur depuis la base de données
    user_id = current_user["id"]
    with get_db_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, data FROM users WHERE id = %s;", (user_id,))
        row = cur.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        user_data = row[1]
        
        # Retourner les informations (sans le mot de passe)
        return {
            "success": True,
            "data": {
                "id": row[0],
                "username": user_data.get("username", ""),
                "fullName": user_data.get("fullName", ""),
                "role": user_data.get("role", "agent"),
                "active": user_data.get("active", True),
                "pages": user_data.get("pages", ["*"]),
                "permissions": user_data.get("permissions", ["*"]),
                "companyId": user_data.get("companyId"),
                "profile": user_data.get("profile", {}),
                "notificationPreferences": user_data.get("notificationPreferences", {}),
            }
        }


@app.get("/user/backpack")
def get_user_backpack(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Charge toutes les données essentielles pour l'utilisateur (backpack)
    Retourne: user, company, companies, settings, stats
    """
    user_id = current_user["id"]
    
    with get_db_connection() as conn, conn.cursor() as cur:
        # Récupérer l'utilisateur
        cur.execute("SELECT id, data FROM users WHERE id = %s;", (user_id,))
        user_row = cur.fetchone()
        
        if not user_row:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        user_data = user_row[1]
        user_company_id = user_data.get("companyId")
        
        # Récupérer toutes les entreprises
        cur.execute("SELECT id, data FROM companies ORDER BY created_at DESC;")
        company_rows = cur.fetchall()
        all_companies = [{**row[1], "id": row[0]} for row in company_rows]
        
        # Trouver l'entreprise de l'utilisateur ou l'entreprise par défaut
        user_company = None
        if user_company_id:
            user_company = next((c for c in all_companies if c.get("id") == user_company_id), None)
        
        if not user_company:
            user_company = next((c for c in all_companies if c.get("isDefault")), None) or (all_companies[0] if all_companies else None)
        
        # Récupérer les statistiques de base
        cur.execute("SELECT COUNT(*) FROM clients;")
        total_clients = cur.fetchone()[0] or 0
        
        cur.execute("SELECT COUNT(*) FROM client_invoices;")
        total_client_invoices = cur.fetchone()[0] or 0
        
        cur.execute("SELECT COUNT(*) FROM vendor_invoices;")
        total_vendor_invoices = cur.fetchone()[0] or 0
        
        cur.execute("SELECT COUNT(*) FROM purchases;")
        total_purchases = cur.fetchone()[0] or 0
        
        cur.execute("SELECT COUNT(*) FROM services;")
        total_services = cur.fetchone()[0] or 0
        
        # Settings depuis l'entreprise ou valeurs par défaut
        vat_enabled = user_company.get("vatEnabled", False) if user_company else False
        vat_rate = user_company.get("vatRate", 20.0) if user_company else 20.0
        
        return {
            "success": True,
            "data": {
                "user": {
                    "id": user_row[0],
                    "username": user_data.get("username", ""),
                    "fullName": user_data.get("fullName", ""),
                    "role": user_data.get("role", "agent"),
                    "active": user_data.get("active", True),
                    "pages": user_data.get("pages", ["*"]),
                    "permissions": user_data.get("permissions", ["*"]),
                    "companyId": user_company_id,
                    "profile": user_data.get("profile", {}),
                    "notificationPreferences": user_data.get("notificationPreferences", {}),
                },
                "company": user_company,
                "companies": all_companies,
                "settings": {
                    "vatEnabled": vat_enabled,
                    "vatRate": vat_rate,
                },
                "stats": {
                    "totalClients": total_clients,
                    "totalClientInvoices": total_client_invoices,
                    "totalVendorInvoices": total_vendor_invoices,
                    "totalPurchases": total_purchases,
                    "totalServices": total_services,
                },
            }
        }
