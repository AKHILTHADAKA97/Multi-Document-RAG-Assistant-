import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, Mock
from io import BytesIO


class TestDocumentsAPI:
    @pytest.mark.asyncio
    async def test_upload_documents_success(self, async_client: AsyncClient):
        pdf_content = b"%PDF-1.4\nTest content"
        files = [
            ("files", ("test1.pdf", BytesIO(pdf_content), "application/pdf")),
            ("files", ("test2.pdf", BytesIO(pdf_content), "application/pdf")),
        ]

        with patch("app.api.v1.endpoints.documents.IngestionService") as mock_service_class:
            mock_service = AsyncMock()
            mock_service.ingest_documents.return_value = [
                {"document_id": "doc_1", "filename": "test1.pdf", "status": "ready"},
                {"document_id": "doc_2", "filename": "test2.pdf", "status": "ready"},
            ]
            mock_service.close = AsyncMock()
            mock_service_class.return_value = mock_service

            response = await async_client.post("/api/v1/documents/upload", files=files)

        assert response.status_code == 201
        data = response.json()
        assert len(data["documents"]) == 2
        assert data["documents"][0]["document_id"] == "doc_1"

    @pytest.mark.asyncio
    async def test_upload_too_many_files(self, async_client: AsyncClient):
        pdf_content = b"%PDF-1.4\nTest content"
        files = [
            ("files", (f"test{i}.pdf", BytesIO(pdf_content), "application/pdf"))
            for i in range(6)
        ]

        response = await async_client.post("/api/v1/documents/upload", files=files)

        assert response.status_code == 400
        assert "Maximum 5 files per request" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_list_documents(self, async_client: AsyncClient):
        with patch("app.api.v1.endpoints.documents.DocumentService") as mock_service_class:
            mock_service = Mock()
            mock_doc = Mock()
            mock_doc.id = "doc_1"
            mock_doc.filename = "test.pdf"
            mock_doc.file_size_bytes = 1000
            mock_doc.page_count = 5
            mock_doc.chunk_count = 10
            mock_doc.status = "ready"
            mock_doc.error_message = None
            mock_doc.created_at = "2024-01-01T00:00:00"
            mock_doc.updated_at = "2024-01-01T00:00:00"

            mock_service.list_documents.return_value = [mock_doc]
            mock_service.count_documents.return_value = 1
            mock_service_class.return_value = mock_service

            response = await async_client.get("/api/v1/documents")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["documents"]) == 1
        assert data["documents"][0]["document_id"] == "doc_1"

    @pytest.mark.asyncio
    async def test_get_document(self, async_client: AsyncClient):
        with patch("app.api.v1.endpoints.documents.DocumentService") as mock_service_class:
            mock_service = Mock()
            mock_doc = Mock()
            mock_doc.id = "doc_1"
            mock_doc.filename = "test.pdf"
            mock_doc.file_size_bytes = 1000
            mock_doc.page_count = 5
            mock_doc.chunk_count = 10
            mock_doc.status = "ready"
            mock_doc.error_message = None
            mock_doc.created_at = "2024-01-01T00:00:00"
            mock_doc.updated_at = "2024-01-01T00:00:00"

            mock_service.get_document.return_value = mock_doc
            mock_service_class.return_value = mock_service

            response = await async_client.get("/api/v1/documents/doc_1")

        assert response.status_code == 200
        data = response.json()
        assert data["document_id"] == "doc_1"

    @pytest.mark.asyncio
    async def test_get_document_not_found(self, async_client: AsyncClient):
        from app.core.exceptions import DocumentNotFoundError

        with patch("app.api.v1.endpoints.documents.DocumentService") as mock_service_class:
            mock_service = Mock()
            mock_service.get_document.side_effect = DocumentNotFoundError("doc_999")
            mock_service_class.return_value = mock_service

            response = await async_client.get("/api/v1/documents/doc_999")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_document(self, async_client: AsyncClient):
        with patch("app.api.v1.endpoints.documents.DocumentService") as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service

            response = await async_client.delete("/api/v1/documents/doc_1")

        assert response.status_code == 200
        data = response.json()
        assert data["document_id"] == "doc_1"
        mock_service.delete_document.assert_called_once_with("doc_1")

    @pytest.mark.asyncio
    async def test_retry_document(self, async_client: AsyncClient):
        with patch("app.api.v1.endpoints.documents.DocumentService") as mock_service_class:
            mock_service = Mock()
            mock_doc = Mock()
            mock_doc.id = "doc_1"
            mock_doc.filename = "test.pdf"
            mock_doc.file_size_bytes = 1000
            mock_doc.page_count = 5
            mock_doc.chunk_count = 10
            mock_doc.status = "ready"
            mock_doc.error_message = None
            mock_doc.created_at = "2024-01-01T00:00:00"
            mock_doc.updated_at = "2024-01-01T00:00:00"

            mock_service.get_document.return_value = mock_doc
            mock_service_class.return_value = mock_service

            response = await async_client.post("/api/v1/documents/doc_1/retry")

        assert response.status_code == 200
        mock_service.retry_document.assert_called_once_with("doc_1")