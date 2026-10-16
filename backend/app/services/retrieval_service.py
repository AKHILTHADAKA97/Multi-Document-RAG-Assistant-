from typing import List, Optional, Dict, Any
import logging

from app.core.config import get_settings
from app.core.exceptions import NoRelevantContextError
from app.db.vector_store import get_vector_store
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class RetrievalService:
    def __init__(self):
        self.settings = get_settings()
        self.vector_store = get_vector_store()
        self.embedding_service = EmbeddingService()

    async def retrieve(
        self,
        question: str,
        document_ids: Optional[List[str]] = None,
        top_k: Optional[int] = None,
        min_relevance: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        top_k = top_k or self.settings.top_k
        min_relevance = min_relevance if min_relevance is not None else self.settings.min_relevance_score

        query_embedding = await self.embedding_service.generate_query_embedding(question)

        results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            document_ids=document_ids,
        )

        filtered = [r for r in results if r["similarity"] >= min_relevance]

        if not filtered:
            logger.info("No relevant context found", extra={
                "question": question[:100],
                "top_k": top_k,
                "min_relevance": min_relevance,
                "total_results": len(results),
            })
            raise NoRelevantContextError(
                "No relevant context found for the question",
                {"question": question, "min_relevance": min_relevance},
            )

        logger.info("Retrieved relevant chunks", extra={
            "question": question[:100],
            "retrieved_count": len(filtered),
            "top_similarity": filtered[0]["similarity"] if filtered else 0,
        })

        return filtered

    async def close(self):
        await self.embedding_service.close()