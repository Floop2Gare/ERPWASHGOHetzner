from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.dependencies import get_current_user, get_db_connection

router = APIRouter(
    prefix="/user",
    tags=["user"],
)


@router.get("/backpack")
def get_user_backpack(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Charge toutes les données essentielles pour l'utilisateur au démarrage.
    Inclut : entreprise, paramètres, statistiques légères.
    Exclut : services (chargés à la demande), clients (trop lourd).
    """
    user_id = current_user["id"]
    detailed_user = None
    company = None
    companies_list = []
    stats = {}
    company_id = current_user.get("companyId")
    
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Récupérer les informations complètes de l'utilisateur
            cur.execute("SELECT id, data FROM users WHERE id = %s;", (user_id,))
            user_row = cur.fetchone()
            if user_row:
                user_data = user_row[1]
                company_id = user_data.get("companyId")
                detailed_user = {
                    "id": user_row[0],
                    "username": user_data.get("username", ""),
                    "fullName": user_data.get("fullName", ""),
                    "role": user_data.get("role", "agent"),
                    "active": user_data.get("active", True),
                    "pages": user_data.get("pages", []),
                    "permissions": user_data.get("permissions", []),
                    "companyId": company_id,
                    "profile": user_data.get("profile", {}),
                    "notificationPreferences": user_data.get("notificationPreferences", {}),
                }
            
            # Charger l'entreprise principale
            if company_id:
                cur.execute("SELECT id, data FROM companies WHERE id = %s;", (company_id,))
                row = cur.fetchone()
                if row:
                    company = {**row[1], "id": row[0]}
            
            # Charger toutes les entreprises disponibles
            cur.execute("SELECT id, data FROM companies ORDER BY created_at DESC;")
            for row in cur.fetchall():
                companies_list.append({**row[1], "id": row[0]})
            
            # Statistiques légères
            if company_id:
                cur.execute("SELECT COUNT(*) FROM clients WHERE data->>'companyId' = %s;", (company_id,))
                stats["totalClients"] = cur.fetchone()[0] or 0
                
                cur.execute("SELECT COUNT(*) FROM client_invoices WHERE data->>'companyId' = %s;", (company_id,))
                stats["totalClientInvoices"] = cur.fetchone()[0] or 0
                
                cur.execute("SELECT COUNT(*) FROM vendor_invoices WHERE data->>'companyId' = %s;", (company_id,))
                stats["totalVendorInvoices"] = cur.fetchone()[0] or 0
                
                cur.execute("SELECT COUNT(*) FROM purchases WHERE data->>'companyId' = %s;", (company_id,))
                stats["totalPurchases"] = cur.fetchone()[0] or 0
                
                cur.execute("SELECT COUNT(*) FROM services WHERE data->>'companyId' = %s;", (company_id,))
                stats["totalServices"] = cur.fetchone()[0] or 0
    except Exception as exc:
        print(f"[Backpack] Erreur lors du chargement des données: {exc}")
    
    # Fallback si on n'a pas réussi à charger l'utilisateur complet
    if not detailed_user:
        detailed_user = {
            **current_user,
            "profile": current_user.get("profile", {}),
            "notificationPreferences": current_user.get("notificationPreferences", {}),
        }
    
    # Paramètres (TVA, etc.)
    settings_data = {
        "vatEnabled": company.get("vatEnabled", False) if company else False,
        "vatRate": company.get("vatRate", 20) if company else 20,
    }
    
    return {
        "success": True,
        "data": {
            "user": detailed_user,
            "company": company,
            "companies": companies_list,
            "settings": settings_data,
            "stats": stats
        }
    }

