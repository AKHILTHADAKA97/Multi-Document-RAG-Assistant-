from typing import List, Dict, Any, Optional
from app.db.vector_store import get_vector_store


class VectorRepository:
    def __init__(self):
        self.vector_store = get_vector_store()

    def upsert_chunks(
        self,
        document_id: str,
        filename: str,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
    ) -> None:
        self.vector_store.upsert_chunks(document_id, filename, chunks, embeddings)

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        document_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        return self.vector_store.search(query_embedding, top_k, document_ids)

    def delete_document(self, document_id: str) -> None:
        self.vector_store.delete_document(document_id)

    def get_chunk_count(self, document_id: str) -> int:
        return self.vector_store.get_document_chunk_count(document_id)

    def health_check(self) -> bool:
        return self.vector_store.health_check()