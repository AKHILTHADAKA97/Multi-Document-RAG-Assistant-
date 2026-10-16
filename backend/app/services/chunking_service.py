from typing import List, Dict, Any
import logging

from app.core.config import get_settings
from app.utils.text_utils import split_by_tokens, count_tokens

logger = logging.getLogger(__name__)


class ChunkingService:
    def __init__(self):
        self.settings = get_settings()

    def chunk_pages(self, pages: List[Dict[str, Any]], document_id: str) -> List[Dict[str, Any]]:
        all_chunks = []
        chunk_index = 0

        for page in pages:
            page_number = page["page_number"]
            text = page["text"]

            if not text.strip():
                continue

            page_chunks = self._chunk_text(text)

            for i, chunk_text in enumerate(page_chunks):
                chunk = {
                    "chunk_id": f"{document_id}_p{page_number}_c{chunk_index}",
                    "document_id": document_id,
                    "page_number": page_number,
                    "chunk_index": chunk_index,
                    "text": chunk_text,
                    "token_count": count_tokens(chunk_text),
                }
                all_chunks.append(chunk)
                chunk_index += 1

        logger.info("Text chunked", extra={
            "document_id": document_id,
            "total_chunks": len(all_chunks),
            "total_pages": len(pages),
        })
        return all_chunks

    def _chunk_text(self, text: str) -> List[str]:
        return split_by_tokens(
            text,
            max_tokens=self.settings.chunk_size,
            overlap_tokens=self.settings.chunk_overlap,
        )