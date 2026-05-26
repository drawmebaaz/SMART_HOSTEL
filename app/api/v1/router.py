from fastapi import APIRouter

from app.api.v1.routes import admin, auth, complaints, health

router = APIRouter()
router.include_router(health.router)
router.include_router(auth.router)
router.include_router(complaints.router)
router.include_router(admin.router)
