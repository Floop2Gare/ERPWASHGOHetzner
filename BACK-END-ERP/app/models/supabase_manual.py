import os
import logging
import requests
import json
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class ManualSupabaseClient:
    """
    Client Supabase manuel utilisant requests directement
    pour éviter les problèmes de compatibilité httpx
    """
    
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_ANON_KEY')
        
        if not self.url or not self.key:
            raise ValueError("Variables d'environnement Supabase manquantes")
        
        # Nettoyer l'URL pour éviter les doubles slashes
        self.url = self.url.rstrip('/')
        self.base_url = f"{self.url}/rest/v1"
        
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        
        logger.info(f"✅ Client Supabase manuel initialisé avec URL: {self.url}")
    
    def table(self, table_name: str):
        """Retourne un objet Table pour les opérations CRUD"""
        return SupabaseTable(self.base_url, self.headers, table_name)
    
    def test_connection(self) -> bool:
        """Test de connexion simple"""
        try:
            response = requests.get(f"{self.base_url}/", headers=self.headers, timeout=10)
            return response.status_code in [200, 404]  # 404 est OK pour l'endpoint racine
        except Exception as e:
            logger.error(f"Erreur de connexion Supabase manuel: {e}")
            return False

class SupabaseTable:
    """Classe pour les opérations sur une table Supabase"""
    
    def __init__(self, base_url: str, headers: Dict[str, str], table_name: str):
        self.base_url = base_url
        self.headers = headers
        self.table_name = table_name
        self.table_url = f"{base_url}/{table_name}"
    
    def select(self, columns: str = "*"):
        """Sélection de données"""
        return SupabaseQuery(self.table_url, self.headers, "GET", {"select": columns})
    
    def insert(self, data: Dict[str, Any] | list[Dict[str, Any]]):
        """Insertion de données"""
        return SupabaseQuery(self.table_url, self.headers, "POST", data)
    
    def update(self, data: Dict[str, Any]):
        """Mise à jour de données"""
        return SupabaseQuery(self.table_url, self.headers, "PATCH", data)
    
    def delete(self):
        """Suppression de données"""
        return SupabaseQuery(self.table_url, self.headers, "DELETE")

class SupabaseQuery:
    """Classe pour exécuter les requêtes Supabase"""
    
    def __init__(self, url: str, headers: Dict[str, str], method: str, data=None, params=None):
        self.url = url
        self.headers = headers
        self.method = method
        self.data = data
        self.params = params or {}
    
    def limit(self, count: int):
        """Ajouter une limite"""
        self.params['limit'] = str(count)
        return self
    
    def eq(self, column: str, value: str):
        """Ajouter une condition d'égalité"""
        self.params[f"{column}"] = f"eq.{value}"
        return self
    
    def order(self, column: str, desc: bool = False):
        """Ajouter un tri"""
        order_type = "desc" if desc else "asc"
        self.params['order'] = f"{column}.{order_type}"
        return self
    
    def range(self, from_: int, to: int):
        """Ajouter une plage de résultats"""
        self.params['offset'] = str(from_)
        self.params['limit'] = str(to - from_ + 1)
        return self
    
    def execute(self):
        """Exécuter la requête"""
        try:
            if self.method == "GET":
                response = requests.get(self.url, headers=self.headers, params=self.params, timeout=30)
            elif self.method == "POST":
                response = requests.post(self.url, headers=self.headers, json=self.data, params=self.params, timeout=30)
            elif self.method == "PATCH":
                response = requests.patch(self.url, headers=self.headers, json=self.data, params=self.params, timeout=30)
            elif self.method == "DELETE":
                response = requests.delete(self.url, headers=self.headers, params=self.params, timeout=30)
            else:
                raise ValueError(f"Méthode HTTP non supportée: {self.method}")
            
            response.raise_for_status()
            
            # Retourner un objet similaire à celui de Supabase
            return SupabaseResponse(response.json() if response.content else [])
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur requête Supabase manuel: {e}")
            raise Exception(f"Erreur requête Supabase: {e}")
        except json.JSONDecodeError as e:
            logger.error(f"Erreur parsing JSON Supabase: {e}")
            raise Exception(f"Erreur parsing JSON: {e}")

class SupabaseResponse:
    """Classe pour simuler la réponse Supabase"""
    
    def __init__(self, data):
        self.data = data

# Instance globale
_manual_supabase_client = None

def get_manual_supabase_client():
    global _manual_supabase_client
    if _manual_supabase_client is None:
        _manual_supabase_client = ManualSupabaseClient()
    return _manual_supabase_client
