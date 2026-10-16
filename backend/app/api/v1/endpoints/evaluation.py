from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
import time
import logging

from app.db.database import get_db
from app.services.rag_service import RAGService
from app.schemas.source import EvaluationItem, EvaluationResult, SourceSchema

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/evaluation/run", response_model=List[EvaluationResult])
async def run_evaluation(
    dataset_path: str = "tests/evaluation/dataset.json",
    db: Session = Depends(get_db),
):
    try:
        with open(dataset_path, "r") as f:
            dataset = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Evaluation dataset not found at {dataset_path}")

    rag_service = RAGService()
    results = []

    for item in dataset:
        start_time = time.time()

        try:
            rag_result = await rag_service.answer_question(
                question=item["question"],
                document_ids=[item["document_id"]] if item.get("document_id") else None,
            )
        except Exception as e:
            logger.error("Evaluation query failed", extra={"question": item["question"], "error": str(e)})
            rag_result = {
                "answer": f"Error: {str(e)}",
                "grounded": False,
                "sources": [],
            }

        latency_ms = (time.time() - start_time) * 1000

        sources = [
            SourceSchema(
                document_id=s["document_id"],
                filename=s["filename"],
                page_number=s["page_number"],
                chunk_id=s["chunk_id"],
                text=s["excerpt"],
                similarity=s["similarity"],
            )
            for s in rag_result["sources"]
        ]

        retrieval_metrics = {
            "retrieved_count": len(sources),
            "top_similarity": sources[0].similarity if sources else 0,
        }

        results.append(EvaluationResult(
            question=item["question"],
            answer=rag_result["answer"],
            expected_answer=item["expected_answer"],
            grounded=rag_result["grounded"],
            sources=sources,
            retrieval_metrics=retrieval_metrics,
            latency_ms=latency_ms,
        ))

    await rag_service.close()
    return results