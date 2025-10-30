from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/debug-google")
def debug_google_config():
    """Vérification minimale de configuration Google (assainie)."""
    try:
        has_calendar_clement = bool(os.getenv('CALENDAR_ID_CLEMENT'))
        has_calendar_adrien = bool(os.getenv('CALENDAR_ID_ADRIEN'))
        has_sa_clement = bool(os.getenv('GOOGLE_SA_CLEMENT_JSON'))
        has_sa_adrien = bool(os.getenv('GOOGLE_SA_ADRIEN_JSON'))

        return {
            "success": True,
            "google_config": {
                "calendar_clement_present": has_calendar_clement,
                "calendar_adrien_present": has_calendar_adrien,
                "service_account_clement_present": has_sa_clement,
                "service_account_adrien_present": has_sa_adrien,
            },
            "message": "Configuration Google: présence vérifiée"
        }
    except Exception as e:
        return {
            "success": False,
            "error": "configuration_check_failed",
        }
