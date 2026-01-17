from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import psycopg
import os
from app.core.config import settings
from app.core.dependencies import get_current_user, verify_company_access, get_db_connection

router = APIRouter(
    prefix="/company",
    tags=["company"],
)


@router.get("/backpack")
def get_company_backpack(
    companyId: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Charge toutes les données essentielles d'une entreprise.
    Inclut : entreprise, statistiques pour toutes les pages, paramètres, préférences.
    """
    user_id = current_user["id"]
    
    # Vérifier l'accès
    if not verify_company_access(user_id, companyId):
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette entreprise")
    
    company = None
    stats = {}
    
    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            # Charger l'entreprise
            cur.execute("SELECT id, data FROM companies WHERE id = %s;", (companyId,))
            row = cur.fetchone()
            if row:
                company = {**row[1], "id": row[0]}
            
            if not company:
                raise HTTPException(status_code=404, detail="Entreprise non trouvée")
            
            # Statistiques pour TOUTES les pages du projet
            tables_stats = {
                "totalClients": "clients",
                "totalLeads": "leads",
                "totalServices": "services",
                "totalCategories": "categories",
                "totalProjectMembers": "project_members",
                "totalVendorInvoices": "vendor_invoices",
                "totalClientInvoices": "client_invoices",
                "totalPurchases": "purchases",
                "totalDocuments": "documents",
                "totalSubscriptions": "subscriptions",
            }
            
            for stat_name, table_name in tables_stats.items():
                try:
                    cur.execute(
                        f"SELECT COUNT(*) FROM {table_name} WHERE data->>'companyId' = %s;",
                        (companyId,)
                    )
                    stats[stat_name] = cur.fetchone()[0] or 0
                except Exception as e:
                    print(f"[Company Backpack] Erreur pour {table_name}: {e}")
                    stats[stat_name] = 0
            
            # Paramètres de l'entreprise
            settings_data = {
                "vatEnabled": company.get("vatEnabled", False),
                "vatRate": company.get("vatRate", 20),
            }
            
            # Préférences (à implémenter plus tard dans une table dédiée)
            preferences = {}
            
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[Company Backpack] Erreur lors du chargement: {exc}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erreur lors du chargement des données de l'entreprise")
    
    return {
        "success": True,
        "data": {
            "company": company,
            "stats": stats,
            "settings": settings_data,
            "preferences": preferences
        }
    }
