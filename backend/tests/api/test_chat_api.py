import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, Mock


class TestChatAPI:
    @pytest.mark.asyncio
    async def test_query_chat_success(self, async_client: AsyncClient):
        with patch("app.api.v1.endpoints.chat.RAGService") as mock_service_class:
            mock_service = AsyncMock()
            mock_service.answer_question.return_value = {
                "answer": "Employees receive 18 days of annual leave.",
                "grounded": True,
                "sources": [
                    {
                        "document_id": "doc_1",
                        "filename": "handbook.pdf",
                        "page_number": 12,
                        "chunk_id": "doc_1_p12_c0",
                        "excerpt": "Employees receive 18 days...",
                        "similarity": 0.85,
                    }
                ],
            }
            mock_service.close = AsyncMock()
            mock_service_class.return_value = mock_service

            response = await async_client.post(
                "/api/v1/chat/query",
                json={"question": "What is the annual leave policy?"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["answer"] == "Employees receive 18 days of annual leave."
        assert data["grounded"] is True
        assert len(data["sources"]) == 1
        assert data["sources"][0]["page_number"] == 12

    @pytest.mark.asyncio
    async def test_query_chat_with_document_filter(self, async_client: AsyncClient):
        with patch("app.api.v1.endpoints.chat.RAGService") as mock_service_class:
            mock_service = AsyncMock()
            mock_service.answer_question.return_value = {
                "answer": "Answer from specific doc",
                "grounded": True,
                "sources": [],
            }
            mock_service.close = AsyncMock()
            mock_service_class.return_value = mock_service

            response = await async_client.post(
                "/api/v1/chat/query",
                json={"question": "Test", "document_ids": ["doc_1", "doc_2"]},
            )

        assert response.status_code == 200
        mock_service.answer_question.assert_called_once()
        call_args = mock_service.answer_question.call_args
        assert call_args.kwargs["document_ids"] == ["doc_1", "doc_2"]

    @pytest.mark.asyncio
    async def test_query_chat_empty_question(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/v1/chat/query",
            json={"question": ""},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_query_chat_no_context(self, async_client: AsyncClient):
        from app.core.exceptions import NoRelevantContextError

        with patch("app.api.v1.endpoints.chat.RAGService") as mock_service_class:
            mock_service = AsyncMock()
            mock_service.answer_question.side_effect = NoRelevantContextError("No context")
            mock_service.close = AsyncMock()
            mock_service_class.return_value = mock_service

            response = await async_client.post(
                "/api/v1/chat/query",
                json={"question": "Unknown question"},
            )

        assert response.status_code == 404