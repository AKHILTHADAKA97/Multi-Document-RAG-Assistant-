import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.services.retrieval_service import RetrievalService
from app.core.exceptions import NoRelevantContextError
from app.core.config import Settings


class TestRetrievalService:
    @pytest.fixture
    def service(self):
        settings = Settings(
            top_k=5,
            min_relevance_score=0.5,
        )
        service = RetrievalService()
        service.settings = settings
        service.vector_store = Mock()
        service.embedding_service = AsyncMock()
        return service

    @pytest.mark.asyncio
    async def test_retrieve_success(self, service):
        service.embedding_service.generate_query_embedding = AsyncMock(
            return_value=[0.1] * 1536
        )
        service.vector_store.search.return_value = [
            {
                "chunk_id": "doc_123_p1_c0",
                "text": "Relevant content",
                "metadata": {
                    "document_id": "doc_123",
                    "filename": "test.pdf",
                    "page_number": 1,
                    "chunk_index": 0,
                },
                "similarity": 0.8,
                "distance": 0.2,
            }
        ]

        results = await service.retrieve("test question")

        assert len(results) == 1
        assert results[0]["similarity"] == 0.8
        assert results[0]["metadata"]["document_id"] == "doc_123"

    @pytest.mark.asyncio
    async def test_retrieve_filters_by_relevance(self, service):
        service.embedding_service.generate_query_embedding = AsyncMock(
            return_value=[0.1] * 1536
        )
        service.vector_store.search.return_value = [
            {"similarity": 0.8, "metadata": {}, "text": "high"},
            {"similarity": 0.3, "metadata": {}, "text": "low"},
        ]

        results = await service.retrieve("test question", min_relevance=0.5)

        assert len(results) == 1
        assert results[0]["similarity"] == 0.8

    @pytest.mark.asyncio
    async def test_retrieve_no_relevant_context(self, service):
        service.embedding_service.generate_query_embedding = AsyncMock(
            return_value=[0.1] * 1536
        )
        service.vector_store.search.return_value = [
            {"similarity": 0.3, "metadata": {}, "text": "low"},
        ]

        with pytest.raises(NoRelevantContextError):
            await service.retrieve("test question", min_relevance=0.5)

    @pytest.mark.asyncio
    async def test_retrieve_empty_results(self, service):
        service.embedding_service.generate_query_embedding = AsyncMock(
            return_value=[0.1] * 1536
        )
        service.vector_store.search.return_value = []

        with pytest.raises(NoRelevantContextError):
            await service.retrieve("test question")

    @pytest.mark.asyncio
    async def test_retrieve_with_document_filter(self, service):
        service.embedding_service.generate_query_embedding = AsyncMock(
            return_value=[0.1] * 1536
        )
        service.vector_store.search.return_value = []

        await service.retrieve("test question", document_ids=["doc_1", "doc_2"])

        service.vector_store.search.assert_called_once()
        call_args = service.vector_store.search.call_args
        assert call_args.kwargs["document_ids"] == ["doc_1", "doc_2"]