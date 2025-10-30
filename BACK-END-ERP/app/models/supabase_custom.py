import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class CustomSupabaseClient:
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_ANON_KEY')
        
        if not self.url or not self.key:
            raise ValueError("Variables d'environnement Supabase manquantes")
        
        # Import lazy pour éviter les erreurs au démarrage
        try:
            from supabase import create_client, Client
            # Créer le client sans proxy
            self.client: Client = create_client(self.url, self.key)
            logger.info(f"✅ Client Supabase personnalisé initialisé avec URL: {self.url}")
        except Exception as e:
            logger.error(f"Erreur lors de la création du client Supabase personnalisé: {e}")
            raise Exception(f"Impossible d'initialiser Supabase: {e}")
    
    def get_client(self):
        return self.client
    
    def test_connection(self) -> bool:
        try:
            # Test simple de connexion
            result = self.client.table('_test').select('*').limit(1).execute()
            return True
        except Exception as e:
            logger.error(f"Erreur de connexion Supabase: {e}")
            return False

# Instance globale avec lazy loading
_custom_supabase_client = None

def get_custom_supabase_client():
    global _custom_supabase_client
    if _custom_supabase_client is None:
        _custom_supabase_client = CustomSupabaseClient()
    return _custom_supabase_client
