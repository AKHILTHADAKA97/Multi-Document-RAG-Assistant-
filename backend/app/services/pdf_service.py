import fitz
from typing import List, Dict, Any
import logging

from app.core.exceptions import InvalidPDFError, EmptyDocumentError
from app.utils.text_utils import clean_text

logger = logging.getLogger(__name__)


class PDFService:
    def __init__(self):
        pass

    def extract_text(self, file_path: str) -> List[Dict[str, Any]]:
        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise InvalidPDFError(f"Failed to open PDF: {str(e)}")

        if doc.is_encrypted:
            doc.close()
            raise InvalidPDFError("PDF is password-protected")

        page_count = doc.page_count
        if page_count == 0:
            doc.close()
            raise EmptyDocumentError("PDF has no pages")

        pages = []
        has_text = False

        for page_num in range(page_count):
            page = doc[page_num]
            text = page.get_text("text")
            cleaned_text = clean_text(text)

            pages.append({
                "page_number": page_num + 1,
                "text": cleaned_text,
                "char_count": len(cleaned_text),
            })

            if cleaned_text.strip():
                has_text = True

        doc.close()

        if not has_text:
            logger.warning("PDF contains no extractable text", extra={"file_path": file_path})
            raise EmptyDocumentError("PDF contains no extractable text (may be scanned)")

        logger.info("PDF text extracted", extra={"file_path": file_path, "page_count": page_count})
        return pages

    def get_page_count(self, file_path: str) -> int:
        try:
            doc = fitz.open(file_path)
            count = doc.page_count
            doc.close()
            return count
        except Exception as e:
            raise InvalidPDFError(f"Failed to get page count: {str(e)}")

    def is_scanned_pdf(self, file_path: str) -> bool:
        try:
            doc = fitz.open(file_path)
            for page_num in range(min(doc.page_count, 5)):
                page = doc[page_num]
                text = page.get_text("text")
                if text.strip():
                    doc.close()
                    return False
            doc.close()
            return True
        except Exception:
            return False