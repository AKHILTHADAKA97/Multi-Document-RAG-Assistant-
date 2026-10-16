from fastapi import APIRouter

from app.api.v1.endpoints import health, documents, chat, evaluation

router = APIRouter()

router.include_router(health.router, tags=["health"])
router.include_router(documents.router, tags=["documents"])
router.include_router(chat.router, tags=["chat"])
router.include_router(evaluation.router, tags=["evaluation"])