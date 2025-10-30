from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/debug-supabase")
def debug_supabase():
    """Vérification minimale de configuration Supabase (assainie)."""
    try:
        has_url = bool(os.getenv('SUPABASE_URL'))
        has_key = bool(os.getenv('SUPABASE_ANON_KEY'))

        return {
            "success": True,
            "supabase": {
                "url_present": has_url,
                "anon_key_present": has_key,
            }
        }
    except Exception:
        return {
            "success": False,
            "error": "configuration_check_failed",
        }
