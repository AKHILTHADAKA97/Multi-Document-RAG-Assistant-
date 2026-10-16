import json
import time
import logging
from pathlib import Path
from typing import List, Dict, Any

from app.services.rag_service import RAGService
from app.schemas.source import EvaluationItem, EvaluationResult

logger = logging.getLogger(__name__)


class EvaluationService:
    def __init__(self, dataset_path: str = "tests/evaluation/dataset.json"):
        self.dataset_path = Path(dataset_path)
        self.rag_service = RAGService()

    def load_dataset(self) -> List[EvaluationItem]:
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset not found at {self.dataset_path}")

        with open(self.dataset_path, "r") as f:
            data = json.load(f)

        return [EvaluationItem(**item) for item in data]

    async def run_evaluation(self) -> List[EvaluationResult]:
        dataset = self.load_dataset()
        results = []

        logger.info("Starting evaluation", extra={"dataset_size": len(dataset)})

        for item in dataset:
            start_time = time.time()

            try:
                rag_result = await self.rag_service.answer_question(
                    question=item.question,
                    document_ids=[item.document_id] if item.document_id else None,
                )
            except Exception as e:
                logger.error("Evaluation query failed", extra={"question": item.question, "error": str(e)})
                rag_result = {
                    "answer": f"Error: {str(e)}",
                    "grounded": False,
                    "sources": [],
                }

            latency_ms = (time.time() - start_time) * 1000

            sources = [
                {
                    "document_id": s["document_id"],
                    "filename": s["filename"],
                    "page_number": s["page_number"],
                    "chunk_id": s["chunk_id"],
                    "text": s["excerpt"],
                    "similarity": s["similarity"],
                }
                for s in rag_result["sources"]
            ]

            retrieval_metrics = {
                "retrieved_count": len(sources),
                "top_similarity": sources[0]["similarity"] if sources else 0,
            }

            results.append(EvaluationResult(
                question=item.question,
                answer=rag_result["answer"],
                expected_answer=item.expected_answer,
                grounded=rag_result["grounded"],
                sources=sources,
                retrieval_metrics=retrieval_metrics,
                latency_ms=latency_ms,
            ))

        await self.rag_service.close()

        logger.info("Evaluation completed", extra={
            "total_questions": len(results),
            "grounded_count": sum(1 for r in results if r.grounded),
            "avg_latency_ms": sum(r.latency_ms for r in results) / len(results) if results else 0,
        })

        return results

    def print_results(self, results: List[EvaluationResult]) -> None:
        print("\n" + "=" * 80)
        print("EVALUATION RESULTS")
        print("=" * 80)

        for i, result in enumerate(results, 1):
            print(f"\n--- Question {i} ---")
            print(f"Q: {result.question}")
            print(f"A: {result.answer}")
            print(f"Expected: {result.expected_answer}")
            print(f"Grounded: {result.grounded}")
            print(f"Latency: {result.latency_ms:.1f}ms")
            print(f"Sources: {result.retrieval_metrics['retrieved_count']}")

            if result.sources:
                for src in result.sources:
                    print(f"  - {src['filename']} p.{src['page_number']} ({src['similarity']:.2f})")

        # Summary
        total = len(results)
        grounded = sum(1 for r in results if r.grounded)
        avg_latency = sum(r.latency_ms for r in results) / total if total > 0 else 0

        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Total Questions: {total}")
        print(f"Grounded Answers: {grounded}/{total} ({grounded/total*100:.1f}%)")
        print(f"Avg Latency: {avg_latency:.1f}ms")