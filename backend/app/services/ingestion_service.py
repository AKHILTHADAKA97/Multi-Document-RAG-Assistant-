import asyncio
from typing import List, BinaryIO
import logging

from app.core.config import get_settings
from app.db.database import get_db_session
from app.services.document_service import DocumentService
from app.models.document import IngestionJob, IngestionJobStatus, IngestionStage

logger = logging.getLogger(__name__)


class IngestionService:
    def __init__(self):
        self.document_service = DocumentService()

    async def ingest_documents(self, files: List[BinaryIO], filenames: List[str]) -> List[dict]:
        results = []

        for file, filename in zip(files, filenames):
            try:
                document_id, stored_path, file_size, sha256 = self.document_service.save_upload(file, filename)

                with get_db_session() as db:
                    doc = self.document_service.create_document_record(
                        db, document_id, filename, stored_path, file_size, sha256
                    )
                    self.document_service.create_ingestion_job(db, document_id)

                await self.document_service.process_document(document_id)

                results.append({
                    "document_id": document_id,
                    "filename": filename,
                    "status": "ready",
                })

            except Exception as e:
                logger.error("Document ingestion failed", extra={"filename": filename, "error": str(e)})
                results.append({
                    "document_id": None,
                    "filename": filename,
                    "status": "failed",
                    "error": str(e),
                })

        return results

    async def close(self):
        await self.document_service.close()