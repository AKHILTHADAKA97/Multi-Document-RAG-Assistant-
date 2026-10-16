import pytest
from unittest.mock import Mock, patch, MagicMock
import fitz

from app.services.pdf_service import PDFService
from app.core.exceptions import InvalidPDFError, EmptyDocumentError


class TestPDFService:
    def test_extract_text_success(self):
        service = PDFService()

        mock_page = Mock()
        mock_page.get_text.return_value = "Page 1 content"

        mock_doc = Mock()
        mock_doc.page_count = 1
        mock_doc.is_encrypted = False
        mock_doc.__getitem__ = Mock(return_value=mock_page)
        mock_doc.__enter__ = Mock(return_value=mock_doc)
        mock_doc.__exit__ = Mock(return_value=False)
        mock_doc.close = Mock()

        with patch("fitz.open", return_value=mock_doc):
            pages = service.extract_text("test.pdf")

        assert len(pages) == 1
        assert pages[0]["page_number"] == 1
        assert pages[0]["text"] == "Page 1 content"

    def test_extract_text_encrypted_pdf(self):
        service = PDFService()

        mock_doc = Mock()
        mock_doc.is_encrypted = True
        mock_doc.close = Mock()

        with patch("fitz.open", return_value=mock_doc):
            with pytest.raises(InvalidPDFError, match="password-protected"):
                service.extract_text("test.pdf")

    def test_extract_text_no_pages(self):
        service = PDFService()

        mock_doc = Mock()
        mock_doc.page_count = 0
        mock_doc.is_encrypted = False
        mock_doc.close = Mock()

        with patch("fitz.open", return_value=mock_doc):
            with pytest.raises(EmptyDocumentError, match="no pages"):
                service.extract_text("test.pdf")

    def test_extract_text_no_extractable_text(self):
        service = PDFService()

        mock_page = Mock()
        mock_page.get_text.return_value = ""

        mock_doc = Mock()
        mock_doc.page_count = 2
        mock_doc.is_encrypted = False
        mock_doc.__getitem__ = Mock(return_value=mock_page)
        mock_doc.__enter__ = Mock(return_value=mock_doc)
        mock_doc.__exit__ = Mock(return_value=False)
        mock_doc.close = Mock()

        with patch("fitz.open", return_value=mock_doc):
            with pytest.raises(EmptyDocumentError, match="no extractable text"):
                service.extract_text("test.pdf")

    def test_get_page_count(self):
        service = PDFService()

        mock_doc = Mock()
        mock_doc.page_count = 5
        mock_doc.close = Mock()

        with patch("fitz.open", return_value=mock_doc):
            count = service.get_page_count("test.pdf")

        assert count == 5

    def test_is_scanned_pdf_true(self):
        service = PDFService()

        mock_page = Mock()
        mock_page.get_text.return_value = ""

        mock_doc = Mock()
        mock_doc.page_count = 3
        mock_doc.__getitem__ = Mock(return_value=mock_page)
        mock_doc.close = Mock()

        with patch("fitz.open", return_value=mock_doc):
            result = service.is_scanned_pdf("test.pdf")

        assert result is True

    def test_is_scanned_pdf_false(self):
        service = PDFService()

        mock_page = Mock()
        mock_page.get_text.return_value = "Some text"

        mock_doc = Mock()
        mock_doc.page_count = 3
        mock_doc.__getitem__ = Mock(return_value=mock_page)
        mock_doc.close = Mock()

        with patch("fitz.open", return_value=mock_doc):
            result = service.is_scanned_pdf("test.pdf")

        assert result is False