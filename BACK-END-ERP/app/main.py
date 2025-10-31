from fastapi import FastAPI
from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import Any
from contextlib import suppress

# Charger les variables d'environnement uniquement en local
# Vercel utilise automatiquement les variables d'environnement configurées
if os.path.exists('.env'):
    from dotenv import load_dotenv
    load_dotenv()

disabled_modules: list[str] = []

def _safe_import(module: str, attr: str):
    try:
        mod = __import__(module, fromlist=[attr])
        value = getattr(mod, attr)
        return type("Wrap", (), {"router": value})
    except Exception as exc:  # noqa: BLE001 - on veut capturer toute erreur d'import
        disabled_modules.append(f"{module}: {exc.__class__.__name__}")
        # Router de secours qui répond 503 indisponible
        router = APIRouter()
        @router.get("/", tags=[module.split(".")[-1]])
        def _stub_root():
            return {"error": "module_not_available", "module": module}
        return type("Stub", (), {"router": router})

auth = _safe_import("app.api.auth", "router")
engagements = _safe_import("app.api.engagements", "router")
planning = _safe_import("app.api.planning", "router")
stats = _safe_import("app.api.stats", "router")
calendar_events = _safe_import("app.api.calendar_events", "router")
clients = _safe_import("app.api.clients", "router")
services = _safe_import("app.api.services", "router")
appointments = _safe_import("app.api.appointments", "router")
companies = _safe_import("app.api.companies", "router")
leads = _safe_import("app.api.leads", "router")
debug_google = _safe_import("app.api.debug_google", "router")

app = FastAPI(
    title="ERP Wash&Go API",
    version="1.0.0",
    description="API Backend pour ERP Wash&Go"
)

# Configuration CORS pour permettre les requêtes depuis le front-end
allowed_origins = [
    "https://front-end-erp.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "ERP Wash&Go API", "status": "running"}


@app.get("/health")
def health() -> dict[str, Any]:
    """Simple healthcheck endpoint."""
    return {
        "status": "ok" if not disabled_modules else "degraded",
        "version": "2.2.1",
        "endpoints": "ERP ready",
        "disabled_modules": disabled_modules,
    }

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(engagements.router, prefix="/prestations", tags=["prestations"])
app.include_router(planning.router, prefix="/planning", tags=["planning"])
app.include_router(stats.router, prefix="/stats", tags=["stats"])
app.include_router(calendar_events.router, prefix="/calendar", tags=["calendar"])
app.include_router(clients.router, prefix="/clients", tags=["clients"])
app.include_router(services.router, prefix="/services", tags=["services"])
app.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
app.include_router(companies.router, prefix="/companies", tags=["companies"])
app.include_router(leads.router, prefix="/leads", tags=["leads"])
if os.getenv('ENABLE_DEBUG_ROUTES', 'false').lower() == 'true':
    app.include_router(debug_google.router, prefix="/debug", tags=["debug"])

# Fallback DB (SQLite) – création du schéma ORM si DB_DIALECT != postgresql (tests internes uniquement)
@app.on_event("startup")
def _init_sqlite_schema() -> None:
    if os.getenv("DB_DIALECT", "postgresql").lower() != "postgresql":
        with suppress(Exception):
            from app.db.models import Base  # type: ignore
            from app.db.session import engine  # type: ignore
            Base.metadata.create_all(bind=engine)

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight requests."""
    return {"message": "CORS preflight handled"}
