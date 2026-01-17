from fastapi import APIRouter

from app.api.routes import planning_calendar
from app.api.routes.user_backpack import router as user_backpack_router
from app.api.routes.company_backpack import router as company_backpack_router

api_router = APIRouter()

api_router.include_router(planning_calendar.router)
api_router.include_router(user_backpack_router)
api_router.include_router(company_backpack_router)


