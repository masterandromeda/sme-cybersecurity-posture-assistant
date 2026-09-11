"""API v1 root router."""
from fastapi import APIRouter
from app.api.v1.endpoints import assessments, contact, copilot, findings, support

api_router = APIRouter()
api_router.include_router(assessments.router, prefix="/assessments", tags=["assessments"])
api_router.include_router(findings.router,    prefix="/findings",    tags=["findings"])
api_router.include_router(copilot.router,     prefix="/copilot",     tags=["copilot"])
api_router.include_router(support.router,     prefix="/support",     tags=["support"])
api_router.include_router(contact.router,     prefix="/contact",     tags=["contact"])
