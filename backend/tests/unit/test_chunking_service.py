import pytest
from app.services.chunking_service import ChunkingService
from app.core.config import Settings


class TestChunkingService:
    @pytest.fixture
    def service(self):
        settings = Settings(
            chunk_size=100,
            chunk_overlap=20,
            embedding_model="text-embedding-3-small",
        )
        service = ChunkingService()
        service.settings = settings
        return service

    def test_chunk_pages_simple(self, service):
        pages = [
            {"page_number": 1, "text": "This is a short text."},
            {"page_number": 2, "text": "This is another short text."},
        ]

        chunks = service.chunk_pages(pages, "doc_123")

        assert len(chunks) == 2
        assert chunks[0]["page_number"] == 1
        assert chunks[1]["page_number"] == 2
        assert chunks[0]["chunk_index"] == 0
        assert chunks[1]["chunk_index"] == 1

    def test_chunk_pages_long_text(self, service):
        long_text = " ".join(["word"] * 300)
        pages = [{"page_number": 1, "text": long_text}]

        chunks = service.chunk_pages(pages, "doc_123")

        assert len(chunks) > 1
        assert all(c["page_number"] == 1 for c in chunks)
        assert chunks[0]["chunk_index"] == 0
        assert chunks[-1]["chunk_index"] == len(chunks) - 1

    def test_chunk_pages_empty_page(self, service):
        pages = [
            {"page_number": 1, "text": "Content on page 1"},
            {"page_number": 2, "text": ""},
            {"page_number": 3, "text": "Content on page 3"},
        ]

        chunks = service.chunk_pages(pages, "doc_123")

        assert len(chunks) == 2
        assert chunks[0]["page_number"] == 1
        assert chunks[1]["page_number"] == 3

    def test_chunk_pages_whitespace_only(self, service):
        pages = [
            {"page_number": 1, "text": "   \n\t  "},
            {"page_number": 2, "text": "Real content"},
        ]

        chunks = service.chunk_pages(pages, "doc_123")

        assert len(chunks) == 1
        assert chunks[0]["page_number"] == 2

    def test_chunk_id_format(self, service):
        pages = [{"page_number": 5, "text": "Test content"}]

        chunks = service.chunk_pages(pages, "doc_abc123")

        assert chunks[0]["chunk_id"] == "doc_abc123_p5_c0"
        assert chunks[0]["document_id"] == "doc_abc123"