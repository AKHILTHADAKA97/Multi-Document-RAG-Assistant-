from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.engine import Engine
import logging

from app.db.database import get_db, engine
from app.db.vector_store import get_vector_store
from app.schemas.chat import HealthResponse, ReadyResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy")


@router.get("/ready", response_model=ReadyResponse)
async def readiness_check(db: Session = Depends(get_db)):
    vector_store = get_vector_store()

    # Test with raw engine connection
    db_ready = False
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            row = result.fetchone()
            logger.info(f"DB check (engine) successful: {row}")
            db_ready = True
    except Exception as e:
        logger.error(f"DB check (engine) failed: {type(e).__name__}: {e}")
        pass

    # Also test with session
    try:
        result = db.execute(text("SELECT 1"))
        row = result.fetchone()
        logger.info(f"DB check (session) successful: {row}")
        if not db_ready:
            db_ready = True
    except Exception as e:
        logger.error(f"DB check (session) failed: {type(e).__name__}: {e}")
        pass

    vector_ready = vector_store.health_check()
    logger.info(f"Vector store health: {vector_ready}")

    logger.info(f"Readiness: db={db_ready}, vector={vector_ready}")

    return ReadyResponse(
        ready=db_ready and vector_ready,
        database=db_ready,
        vector_store=vector_ready,
        embedding_provider=True,
        llm_provider=True,
    )