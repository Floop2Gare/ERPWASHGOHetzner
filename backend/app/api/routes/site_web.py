"""
Routes API pour l'intégration Site Web / ERP
Gestion des clients provenant du site web Wash&Go
"""

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal
import uuid
import psycopg
import psycopg.types.json

from app.core.dependencies import verify_api_key, verify_api_key_or_jwt, get_current_user, get_db_connection
from app.schemas.site_web import (
    SiteWebUserCreate,
    SiteWebUserUpdate,
    SiteWebOrderCreate,
    SiteWebOrderUpdate,
    SiteWebReferralCreate,
    SiteWebCreditCreate,
    SiteWebUserResponse,
    SiteWebListResponse,
    OrderStatus,
    ReferralStatus,
)

router = APIRouter(
    prefix="/site-web",
    tags=["site-web"],
)


def generate_user_id() -> str:
    """Génère un ID unique pour un utilisateur site web"""
    return f"SW{uuid.uuid4().hex[:12].upper()}"


def generate_order_id() -> str:
    """Génère un ID unique pour une commande"""
    return f"ORDER-{uuid.uuid4().hex[:12].upper()}"


def link_to_existing_crm_client(email: str, company_id: str) -> Optional[str]:
    """
    Recherche un client CRM existant par email et retourne son ID si trouvé.
    Utilisé pour la liaison automatique.
    """
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Rechercher un client CRM avec le même email
            # Vérifier dans les contacts des clients
            cur.execute("""
                SELECT id FROM clients 
                WHERE data->>'companyId' = %s 
                AND (
                    data->>'email' = %s 
                    OR EXISTS (
                        SELECT 1 FROM jsonb_array_elements(data->'contacts') AS contact
                        WHERE contact->>'email' = %s
                    )
                )
                LIMIT 1;
            """, (company_id, email, email))
            
            row = cur.fetchone()
            if row:
                return row[0]
            return None
    except Exception as e:
        print(f"[link_to_existing_crm_client] Erreur: {e}")
        return None


# ============================================================================
# ENDPOINTS GESTION DES UTILISATEURS
# ============================================================================

@router.post("/users", status_code=201, response_model=SiteWebUserResponse)
def create_site_web_user(
    payload: SiteWebUserCreate,
    company_id: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """
    Crée un nouveau client site web.
    Si un email existe déjà, met à jour l'enregistrement existant.
    """
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Vérifier si un utilisateur existe déjà avec cet email
            cur.execute(
                "SELECT id, data FROM site_web_users WHERE data->>'email' = %s;",
                (payload.email,)
            )
            existing_row = cur.fetchone()
            
            # Préparer les données utilisateur
            user_id = payload.user_id or generate_user_id()
            now = datetime.now()
            
            # Générer le nom complet si non fourni
            name = payload.name or f"{payload.prenom} {payload.nom}".strip()
            
            # Vérifier la liaison avec un client CRM existant
            linked_crm_client_id = link_to_existing_crm_client(payload.email, company_id)
            
            user_data = {
                "id": user_id,
                "user_id": user_id,
                "email": payload.email,
                "password_hash": payload.password_hash,
                "auth_provider": payload.auth_provider.value,
                "provider_user_id": payload.provider_user_id,
                
                # Informations personnelles
                "prenom": payload.prenom,
                "nom": payload.nom,
                "name": name,
                "phone": payload.phone,
                "profile_photo_url": payload.profile_photo_url,
                
                # Adresse
                "address_full": payload.address_full,
                "address_street": payload.address_street,
                "address_city": payload.address_city,
                "address_postal_code": payload.address_postal_code,
                "address_complement": payload.address_complement,
                "address_latitude": payload.address_latitude,
                "address_longitude": payload.address_longitude,
                "address_verified": payload.address_verified,
                
                # OAuth
                "oauth_google_id": payload.oauth_google_id,
                "oauth_apple_id": payload.oauth_apple_id,
                "oauth_microsoft_id": payload.oauth_microsoft_id,
                "oauth_email_from_provider": payload.oauth_email_from_provider,
                "oauth_name_from_provider": payload.oauth_name_from_provider,
                
                # Dates
                "account_created_at": (payload.account_created_at or now).isoformat(),
                "last_login_at": None,
                "account_status": payload.account_status.value,
                "email_verified": payload.email_verified,
                "profile_completed": payload.profile_completed,
                
                # Parrainage
                "referral_code": payload.referral_code,
                "referral_code_generated_at": now.isoformat(),
                "referral_count": 0,
                "referral_pending_count": 0,
                "referral_total_earned": 0.0,
                "referral_credit_balance": 0.0,
                "referral_history": [],
                "referred_by_code": payload.referred_by_code,
                "referred_by_user_id": None,
                "referral_status": None,
                "referral_validated_at": None,
                
                # Fidélité
                "loyalty_cleanings_count": 0,
                "loyalty_eligible_cleanings": 0,
                "loyalty_credit_earned": 0.0,
                "loyalty_credit_balance": 0.0,
                "loyalty_threshold": 5,
                "loyalty_reward_amount": 50.0,
                
                # Commandes
                "total_orders_count": 0,
                "total_orders_amount": 0.0,
                "average_order_amount": 0.0,
                "last_order_at": None,
                "first_order_at": None,
                
                # Crédits
                "total_credit_balance": 0.0,
                "credit_transactions": [],
                
                # Contact
                "contact_preference": None,
                "newsletter_subscribed": False,
                "marketing_consent": False,
                "sms_notifications_enabled": False,
                "email_notifications_enabled": True,
                "contact_history": [],
                
                # RGPD
                "rgpd_consent_date": None,
                "rgpd_consent_version": None,
                "data_retention_until": None,
                "right_to_be_forgotten": False,
                "data_deleted_at": None,
                
                # Métadonnées
                "registration_source": payload.registration_source.value if payload.registration_source else "website",
                "registration_ip": payload.registration_ip,
                "last_login_ip": None,
                "user_agent": None,
                "language_preference": None,
                "total_login_count": 0,
                "total_session_duration": 0,
                "last_activity_at": None,
                "account_activity_score": None,
                
                # Liaison CRM
                "linked_crm_client_id": linked_crm_client_id,
            }
            
            if existing_row:
                # Mise à jour de l'enregistrement existant
                existing_id = existing_row[0]
                existing_data = existing_row[1]
                
                # Conserver les données importantes (statistiques, historique)
                user_data["referral_code"] = existing_data.get("referral_code", payload.referral_code)
                user_data["referral_count"] = existing_data.get("referral_count", 0)
                user_data["referral_pending_count"] = existing_data.get("referral_pending_count", 0)
                user_data["referral_total_earned"] = existing_data.get("referral_total_earned", 0.0)
                user_data["referral_credit_balance"] = existing_data.get("referral_credit_balance", 0.0)
                user_data["referral_history"] = existing_data.get("referral_history", [])
                user_data["loyalty_cleanings_count"] = existing_data.get("loyalty_cleanings_count", 0)
                user_data["loyalty_eligible_cleanings"] = existing_data.get("loyalty_eligible_cleanings", 0)
                user_data["loyalty_credit_earned"] = existing_data.get("loyalty_credit_earned", 0.0)
                user_data["loyalty_credit_balance"] = existing_data.get("loyalty_credit_balance", 0.0)
                user_data["total_orders_count"] = existing_data.get("total_orders_count", 0)
                user_data["total_orders_amount"] = existing_data.get("total_orders_amount", 0.0)
                user_data["total_credit_balance"] = existing_data.get("total_credit_balance", 0.0)
                user_data["credit_transactions"] = existing_data.get("credit_transactions", [])
                user_data["account_created_at"] = existing_data.get("account_created_at", now.isoformat())
                
                # Mettre à jour les champs modifiables
                user_data["last_login_at"] = now.isoformat()
                user_data["last_activity_at"] = now.isoformat()
                user_data["updated_via_api_at"] = now.isoformat()
                
                cur.execute(
                    "UPDATE site_web_users SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
                    (psycopg.types.json.Json(user_data), existing_id)
                )
                updated_row = cur.fetchone()
                item = {**updated_row[1], "id": updated_row[0]}
                
                return {"success": True, "data": item}
            else:
                # Création d'un nouvel enregistrement
                cur.execute(
                    "INSERT INTO site_web_users (id, data) VALUES (%s, %s::jsonb) RETURNING id, data;",
                    (user_id, psycopg.types.json.Json(user_data))
                )
                new_row = cur.fetchone()
                item = {**new_row[1], "id": new_row[0]}
                
                return {"success": True, "data": item}
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la création/mise à jour du client: {str(e)}"
        )


@router.get("/users/{user_id}", response_model=SiteWebUserResponse)
def get_site_web_user(
    request: Request,
    user_id: str = Path(..., description="ID du client (user_id ou id)"),
    company_id: str = Depends(verify_api_key_or_jwt)
) -> Dict[str, Any]:
    """Récupère les données d'un client site web"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Chercher par user_id (dans data) ou par id
            cur.execute(
                "SELECT id, data FROM site_web_users WHERE id = %s OR data->>'user_id' = %s;",
                (user_id, user_id)
            )
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Client non trouvé")
            
            item = {**row[1], "id": row[0]}
            return {"success": True, "data": item}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")


@router.put("/users/{user_id}", response_model=SiteWebUserResponse)
def update_site_web_user(
    user_id: str = Path(..., description="ID du client"),
    payload: SiteWebUserUpdate = ...,
    company_id: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """Met à jour les données d'un client site web"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Récupérer l'utilisateur existant
            cur.execute(
                "SELECT id, data FROM site_web_users WHERE id = %s OR data->>'user_id' = %s;",
                (user_id, user_id)
            )
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Client non trouvé")
            
            existing_data = row[1]
            
            # Mettre à jour uniquement les champs fournis
            update_data = dict(existing_data)
            
            # Mapper les champs du payload vers les clés JSON
            payload_dict = payload.dict(exclude_unset=True)
            for key, value in payload_dict.items():
                # Convertir les enums en strings
                if hasattr(value, 'value'):
                    value = value.value
                if value is not None:
                    update_data[key] = value
            
            # Mettre à jour updated_via_api_at
            update_data["updated_via_api_at"] = datetime.now().isoformat()
            
            cur.execute(
                "UPDATE site_web_users SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
                (psycopg.types.json.Json(update_data), row[0])
            )
            updated_row = cur.fetchone()
            item = {**updated_row[1], "id": updated_row[0]}
            
            return {"success": True, "data": item}
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")


@router.get("/users", response_model=SiteWebListResponse)
def list_site_web_users(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Recherche par email, nom ou code parrainage"),
    company_id: str = Depends(verify_api_key_or_jwt)
) -> Dict[str, Any]:
    """Liste les clients site web avec pagination et recherche"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Construire la requête avec recherche optionnelle
            query = "SELECT id, data FROM site_web_users"
            params = []
            
            if search:
                # Recherche full-text sur email, nom, prénom, code parrainage
                query += """
                    WHERE to_tsvector('french', 
                        COALESCE(data->>'email', '') || ' ' || 
                        COALESCE(data->>'name', '') || ' ' || 
                        COALESCE(data->>'prenom', '') || ' ' || 
                        COALESCE(data->>'nom', '') || ' ' ||
                        COALESCE(data->>'referral_code', '')
                    ) @@ plainto_tsquery('french', %s)
                """
                params.append(search)
            
            # Ajouter pagination
            query += f" ORDER BY created_at DESC LIMIT %s OFFSET %s;"
            params.extend([limit, skip])
            
            cur.execute(query, params)
            rows = cur.fetchall()
            
            items = [{**row[1], "id": row[0]} for row in rows]
            
            # Compter le total (sans pagination)
            count_query = "SELECT COUNT(*) FROM site_web_users"
            if search:
                count_query += """
                    WHERE to_tsvector('french', 
                        COALESCE(data->>'email', '') || ' ' || 
                        COALESCE(data->>'name', '') || ' ' || 
                        COALESCE(data->>'prenom', '') || ' ' || 
                        COALESCE(data->>'nom', '') || ' ' ||
                        COALESCE(data->>'referral_code', '')
                    ) @@ plainto_tsquery('french', %s)
                """
                cur.execute(count_query, (search,))
            else:
                cur.execute(count_query)
            
            total = cur.fetchone()[0]
            
            return {"success": True, "data": items, "count": total}
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")


# ============================================================================
# ENDPOINTS GESTION DES COMMANDES
# ============================================================================

@router.post("/orders", status_code=201, response_model=SiteWebUserResponse)
def create_site_web_order(
    payload: SiteWebOrderCreate,
    company_id: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """Crée une nouvelle commande site web"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Vérifier que l'utilisateur existe
            cur.execute(
                "SELECT id, data FROM site_web_users WHERE id = %s OR data->>'user_id' = %s;",
                (payload.user_id, payload.user_id)
            )
            user_row = cur.fetchone()
            
            if not user_row:
                raise HTTPException(status_code=404, detail="Client non trouvé")
            
            user_data = user_row[1]
            user_table_id = user_row[0]
            
            # Préparer les données de commande
            order_id = payload.order_id or generate_order_id()
            now = payload.order_date or datetime.now()
            
            order_data = {
                "id": order_id,
                "order_id": order_id,
                "user_id": payload.user_id,
                "order_date": now.isoformat() if isinstance(now, datetime) else now,
                "service_type": payload.service_type.value,
                "service_title": payload.service_title,
                "service_formula": payload.service_formula,
                "service_selections": [s.dict() for s in (payload.service_selections or [])],
                "order_price": float(payload.order_price),
                "order_time_estimated": payload.order_time_estimated,
                "order_location": payload.order_location,
                "order_status": payload.order_status.value,
                "order_loyalty_eligible": payload.order_loyalty_eligible,
                "credits_used": float(payload.credits_used),
                "credits_earned": float(payload.credits_earned),
                "invoice_number": payload.invoice_number,
            }
            
            # Insérer la commande
            cur.execute(
                "INSERT INTO site_web_orders (id, user_id, data) VALUES (%s, %s, %s::jsonb) RETURNING id, data;",
                (order_id, user_table_id, psycopg.types.json.Json(order_data))
            )
            order_row = cur.fetchone()
            order_item = {**order_row[1], "id": order_row[0]}
            
            # Mettre à jour les statistiques du client
            total_orders = user_data.get("total_orders_count", 0) + 1
            total_amount = user_data.get("total_orders_amount", 0.0) + float(payload.order_price)
            avg_amount = total_amount / total_orders if total_orders > 0 else 0.0
            
            user_data["total_orders_count"] = total_orders
            user_data["total_orders_amount"] = total_amount
            user_data["average_order_amount"] = avg_amount
            user_data["last_order_at"] = order_data["order_date"]
            
            if not user_data.get("first_order_at"):
                user_data["first_order_at"] = order_data["order_date"]
            
            # Si la commande est éligible à la fidélité, incrémenter
            if payload.order_loyalty_eligible:
                user_data["loyalty_eligible_cleanings"] = user_data.get("loyalty_eligible_cleanings", 0) + 1
            
            cur.execute(
                "UPDATE site_web_users SET data = %s::jsonb WHERE id = %s;",
                (psycopg.types.json.Json(user_data), user_table_id)
            )
            
            return {"success": True, "data": order_item}
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de la commande: {str(e)}")


@router.put("/orders/{order_id}", response_model=SiteWebUserResponse)
def update_site_web_order(
    order_id: str = Path(..., description="ID de la commande"),
    payload: SiteWebOrderUpdate = ...,
    company_id: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """Met à jour le statut d'une commande"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT id, user_id, data FROM site_web_orders WHERE id = %s;",
                (order_id,)
            )
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Commande non trouvée")
            
            order_data = row[2]
            user_table_id = row[1]
            
            # Mettre à jour les champs fournis
            payload_dict = payload.dict(exclude_unset=True)
            for key, value in payload_dict.items():
                if hasattr(value, 'value'):  # Enum
                    value = value.value
                if value is not None:
                    order_data[key] = value
            
            cur.execute(
                "UPDATE site_web_orders SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
                (psycopg.types.json.Json(order_data), order_id)
            )
            updated_row = cur.fetchone()
            item = {**updated_row[1], "id": updated_row[0]}
            
            # Si la commande passe à "completed", vérifier le parrainage
            if payload.order_status == OrderStatus.COMPLETED:
                # Récupérer les données utilisateur
                cur.execute("SELECT data FROM site_web_users WHERE id = %s;", (user_table_id,))
                user_row = cur.fetchone()
                if user_row:
                    user_data = user_row[0]
                    referral_status = user_data.get("referral_status")
                    
                    # Si parrainage pending et commande >= 50€, valider automatiquement
                    if referral_status == "pending" and order_data.get("order_price", 0) >= 50:
                        # Validation automatique du parrainage (logique à compléter)
                        pass
            
            return {"success": True, "data": item}
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")


@router.get("/users/{user_id}/orders", response_model=SiteWebListResponse)
def get_user_orders(
    request: Request,
    user_id: str = Path(..., description="ID du client"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    company_id: str = Depends(verify_api_key_or_jwt)
) -> Dict[str, Any]:
    """Récupère l'historique des commandes d'un client"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Trouver l'ID de la table pour l'utilisateur
            cur.execute(
                "SELECT id FROM site_web_users WHERE id = %s OR data->>'user_id' = %s;",
                (user_id, user_id)
            )
            user_row = cur.fetchone()
            
            if not user_row:
                raise HTTPException(status_code=404, detail="Client non trouvé")
            
            user_table_id = user_row[0]
            
            # Récupérer les commandes
            cur.execute(
                """
                SELECT id, data FROM site_web_orders 
                WHERE user_id = %s 
                ORDER BY (data->>'order_date') DESC 
                LIMIT %s OFFSET %s;
                """,
                (user_table_id, limit, skip)
            )
            rows = cur.fetchall()
            
            items = [{**row[1], "id": row[0]} for row in rows]
            
            # Compter le total
            cur.execute("SELECT COUNT(*) FROM site_web_orders WHERE user_id = %s;", (user_table_id,))
            total = cur.fetchone()[0]
            
            return {"success": True, "data": items, "count": total}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")


@router.get("/orders/{order_id}", response_model=SiteWebUserResponse)
def get_site_web_order(
    order_id: str = Path(..., description="ID de la commande"),
    company_id: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """Récupère les détails d'une commande"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT id, data FROM site_web_orders WHERE id = %s;",
                (order_id,)
            )
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Commande non trouvée")
            
            item = {**row[1], "id": row[0]}
            return {"success": True, "data": item}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")


# ============================================================================
# ENDPOINTS GESTION DU PARRAINAGE
# ============================================================================

@router.post("/referrals", status_code=201, response_model=SiteWebUserResponse)
def create_referral(
    payload: SiteWebReferralCreate,
    company_id: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """Enregistre un parrainage"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Trouver le client parrainé
            cur.execute(
                "SELECT id, data FROM site_web_users WHERE id = %s OR data->>'user_id' = %s;",
                (payload.user_id, payload.user_id)
            )
            user_row = cur.fetchone()
            
            if not user_row:
                raise HTTPException(status_code=404, detail="Client parrainé non trouvé")
            
            user_data = user_row[1]
            
            # Trouver le client parrain par son code
            cur.execute(
                "SELECT id, data FROM site_web_users WHERE data->>'referral_code' = %s;",
                (payload.referred_by_code,)
            )
            referrer_row = cur.fetchone()
            
            if not referrer_row:
                raise HTTPException(status_code=404, detail="Code de parrainage invalide")
            
            referrer_data = referrer_row[1]
            referrer_id = referrer_row[0]
            
            # Vérifier que l'utilisateur n'a pas déjà un parrainage
            if user_data.get("referred_by_code"):
                raise HTTPException(status_code=400, detail="Ce client a déjà un parrainage actif")
            
            # Mettre à jour le client parrainé
            user_data["referred_by_code"] = payload.referred_by_code
            user_data["referred_by_user_id"] = referrer_data.get("user_id")
            user_data["referral_status"] = payload.referral_status.value
            
            if payload.referral_status == ReferralStatus.VALIDATED:
                user_data["referral_validated_at"] = datetime.now().isoformat()
            
            cur.execute(
                "UPDATE site_web_users SET data = %s::jsonb WHERE id = %s;",
                (psycopg.types.json.Json(user_data), user_row[0])
            )
            
            # Mettre à jour les statistiques du parrain
            referral_pending = referrer_data.get("referral_pending_count", 0) + 1
            referrer_data["referral_pending_count"] = referral_pending
            
            # Ajouter à l'historique
            referral_history = referrer_data.get("referral_history", [])
            referral_history.append({
                "referred_email": user_data.get("email"),
                "referred_name": user_data.get("name"),
                "status": payload.referral_status.value,
                "validated_at": user_data.get("referral_validated_at"),
                "reward_earned": 0.0
            })
            referrer_data["referral_history"] = referral_history
            
            cur.execute(
                "UPDATE site_web_users SET data = %s::jsonb WHERE id = %s;",
                (psycopg.types.json.Json(referrer_data), referrer_id)
            )
            
            return {"success": True, "data": user_data}
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du parrainage: {str(e)}")


@router.get("/referrals/{user_id}", response_model=SiteWebUserResponse)
def get_referral_stats(
    request: Request,
    user_id: str = Path(..., description="ID du client"),
    company_id: str = Depends(verify_api_key_or_jwt)
) -> Dict[str, Any]:
    """Récupère les statistiques de parrainage d'un client"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT id, data FROM site_web_users WHERE id = %s OR data->>'user_id' = %s;",
                (user_id, user_id)
            )
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Client non trouvé")
            
            user_data = row[1]
            
            # Extraire les données de parrainage
            referral_stats = {
                "referral_code": user_data.get("referral_code"),
                "referral_count": user_data.get("referral_count", 0),
                "referral_pending_count": user_data.get("referral_pending_count", 0),
                "referral_total_earned": user_data.get("referral_total_earned", 0.0),
                "referral_credit_balance": user_data.get("referral_credit_balance", 0.0),
                "referral_history": user_data.get("referral_history", []),
                "referred_by_code": user_data.get("referred_by_code"),
                "referral_status": user_data.get("referral_status"),
            }
            
            return {"success": True, "data": referral_stats}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")


# ============================================================================
# ENDPOINTS GESTION DES CRÉDITS
# ============================================================================

@router.post("/credits", status_code=201, response_model=SiteWebUserResponse)
def create_credit_transaction(
    payload: SiteWebCreditCreate,
    company_id: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """Enregistre une transaction de crédit (gain ou utilisation)"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Récupérer le client
            cur.execute(
                "SELECT id, data FROM site_web_users WHERE id = %s OR data->>'user_id' = %s;",
                (payload.user_id, payload.user_id)
            )
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Client non trouvé")
            
            user_data = row[1]
            user_table_id = row[0]
            
            # Préparer la transaction
            transaction = {
                "type": payload.type.value,
                "source": payload.source.value,
                "amount": float(payload.amount),
                "description": payload.description,
                "order_id": payload.order_id,
                "transaction_date": (payload.transaction_date or datetime.now()).isoformat(),
            }
            
            # Ajouter à l'historique
            credit_transactions = user_data.get("credit_transactions", [])
            credit_transactions.append(transaction)
            user_data["credit_transactions"] = credit_transactions
            
            # Mettre à jour les soldes selon le type de transaction
            current_balance = user_data.get("total_credit_balance", 0.0)
            
            if payload.type.value == "earned":
                # Crédit gagné
                new_balance = current_balance + float(payload.amount)
                user_data["total_credit_balance"] = new_balance
                
                # Mettre à jour aussi les soldes spécifiques
                if payload.source.value == "referral":
                    user_data["referral_credit_balance"] = user_data.get("referral_credit_balance", 0.0) + float(payload.amount)
                    user_data["referral_total_earned"] = user_data.get("referral_total_earned", 0.0) + float(payload.amount)
                elif payload.source.value == "loyalty":
                    user_data["loyalty_credit_balance"] = user_data.get("loyalty_credit_balance", 0.0) + float(payload.amount)
                    user_data["loyalty_credit_earned"] = user_data.get("loyalty_credit_earned", 0.0) + float(payload.amount)
                    
            elif payload.type.value == "used":
                # Crédit utilisé
                new_balance = max(0.0, current_balance - float(payload.amount))
                user_data["total_credit_balance"] = new_balance
                
                # Décrémenter aussi les soldes spécifiques (proportionnellement ou depuis loyalty en premier)
                if payload.source.value == "loyalty":
                    loyalty_balance = user_data.get("loyalty_credit_balance", 0.0)
                    used_from_loyalty = min(float(payload.amount), loyalty_balance)
                    user_data["loyalty_credit_balance"] = loyalty_balance - used_from_loyalty
                    
                    remaining = float(payload.amount) - used_from_loyalty
                    if remaining > 0:
                        referral_balance = user_data.get("referral_credit_balance", 0.0)
                        user_data["referral_credit_balance"] = max(0.0, referral_balance - remaining)
                        
            elif payload.type.value == "expired":
                # Crédit expiré
                new_balance = max(0.0, current_balance - float(payload.amount))
                user_data["total_credit_balance"] = new_balance
            
            user_data["credit_last_update_at"] = datetime.now().isoformat()
            
            cur.execute(
                "UPDATE site_web_users SET data = %s::jsonb WHERE id = %s RETURNING id, data;",
                (psycopg.types.json.Json(user_data), user_table_id)
            )
            updated_row = cur.fetchone()
            item = {**updated_row[1], "id": updated_row[0]}
            
            return {"success": True, "data": item}
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de la transaction: {str(e)}")


@router.get("/users/{user_id}/credits", response_model=SiteWebUserResponse)
def get_user_credits(
    request: Request,
    user_id: str = Path(..., description="ID du client"),
    company_id: str = Depends(verify_api_key_or_jwt)
) -> Dict[str, Any]:
    """Récupère le solde et l'historique des crédits d'un client"""
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT id, data FROM site_web_users WHERE id = %s OR data->>'user_id' = %s;",
                (user_id, user_id)
            )
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Client non trouvé")
            
            user_data = row[1]
            
            # Extraire les données de crédits
            credit_data = {
                "total_credit_balance": user_data.get("total_credit_balance", 0.0),
                "referral_credit_balance": user_data.get("referral_credit_balance", 0.0),
                "loyalty_credit_balance": user_data.get("loyalty_credit_balance", 0.0),
                "credit_transactions": user_data.get("credit_transactions", []),
                "credit_last_update_at": user_data.get("credit_last_update_at"),
            }
            
            return {"success": True, "data": credit_data}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")
