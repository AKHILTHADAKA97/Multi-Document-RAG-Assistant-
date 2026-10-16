import os
import shutil
from pathlib import Path
from typing import Optional, List
import logging

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import DocumentNotFoundError, DocumentProcessingError
from app.db.database import get_db_session
from app.db.vector_store import get_vector_store
from app.models.document import Document, DocumentStatus, IngestionJob, IngestionJobStatus, IngestionStage
from app.schemas.document import DocumentResponse
from app.services.pdf_service import PDFService
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.utils.file_validation import validate_upload_file, compute_sha256, generate_safe_filename
from app.utils.request_ids import generate_document_id

logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(self):
        self.settings = get_settings()
        self.pdf_service = PDFService()
        self.chunking_service = ChunkingService()
        self.embedding_service = EmbeddingService()
        self.vector_store = get_vector_store()
        self.upload_dir = self.settings.upload_path
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def save_upload(self, file, filename: str) -> tuple[str, str, int, str]:
        validate_upload_file(file, filename)

        document_id = generate_document_id()
        safe_filename = generate_safe_filename(filename, document_id)
        stored_path = self.upload_dir / safe_filename

        file.seek(0)
        with open(stored_path, "wb") as f:
            shutil.copyfileobj(file, f)

        file.seek(0)
        sha256 = compute_sha256(file)
        file_size = stored_path.stat().st_size

        return document_id, str(stored_path), file_size, sha256

    def create_document_record(
        self,
        db: Session,
        document_id: str,
        filename: str,
        stored_path: str,
        file_size: int,
        sha256: str,
    ) -> Document:
        existing = db.query(Document).filter(Document.sha256 == sha256).first()
        if existing:
            logger.info("Document already exists", extra={"document_id": existing.id, "sha256": sha256})
            return existing

        doc = Document(
            id=document_id,
            filename=filename,
            stored_path=stored_path,
            file_size_bytes=file_size,
            sha256=sha256,
            status=DocumentStatus.UPLOADED,
        )
        db.add(doc)
        db.flush()
        return doc

    def create_ingestion_job(self, db: Session, document_id: str) -> IngestionJob:
        job = IngestionJob(
            id=f"job_{document_id}",
            document_id=document_id,
            stage=IngestionStage.QUEUED,
            status=IngestionJobStatus.PENDING,
        )
        db.add(job)
        return job

    def get_document(self, db: Session, document_id: str) -> Document:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise DocumentNotFoundError(document_id)
        return doc

    def list_documents(self, db: Session, skip: int = 0, limit: int = 100) -> List[Document]:
        return (
            db.query(Document)
            .filter(Document.status != DocumentStatus.DELETED)
            .order_by(Document.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_documents(self, db: Session) -> int:
        return db.query(Document).filter(Document.status != DocumentStatus.DELETED).count()

    def update_document_status(
        self,
        db: Session,
        document_id: str,
        status: DocumentStatus,
        error_message: Optional[str] = None,
        page_count: Optional[int] = None,
        chunk_count: Optional[int] = None,
    ) -> Document:
        doc = self.get_document(db, document_id)
        doc.status = status
        if error_message:
            doc.error_message = error_message
        if page_count is not None:
            doc.page_count = page_count
        if chunk_count is not None:
            doc.chunk_count = chunk_count
        return doc

    def update_ingestion_job(
        self,
        db: Session,
        document_id: str,
        stage: IngestionStage,
        status: IngestionJobStatus,
        error_message: Optional[str] = None,
    ) -> IngestionJob:
        job = db.query(IngestionJob).filter(IngestionJob.document_id == document_id).first()
        if job:
            job.stage = stage
            job.status = status
            if error_message:
                job.error_message = error_message
            if status == IngestionJobStatus.PROCESSING and not job.started_at:
                from datetime import datetime
                job.started_at = datetime.utcnow()
            if status in (IngestionJobStatus.COMPLETED, IngestionJobStatus.FAILED):
                from datetime import datetime
                job.completed_at = datetime.utcnow()
        return job

    async def process_document(self, document_id: str) -> None:
        with get_db_session() as db:
            doc = self.get_document(db, document_id)
            self.update_document_status(db, document_id, DocumentStatus.PROCESSING)
            self.update_ingestion_job(db, document_id, IngestionStage.EXTRACTING, IngestionJobStatus.PROCESSING)

            try:
                pages = self.pdf_service.extract_text(doc.stored_path)
                self.update_document_status(db, document_id, DocumentStatus.EXTRACTING, page_count=len(pages))
                self.update_ingestion_job(db, document_id, IngestionStage.CHUNKING, IngestionJobStatus.PROCESSING)

                chunks = self.chunking_service.chunk_pages(pages, document_id)
                self.update_document_status(db, document_id, DocumentStatus.CHUNKING, chunk_count=len(chunks))
                self.update_ingestion_job(db, document_id, IngestionStage.EMBEDDING, IngestionJobStatus.PROCESSING)

                texts = [c["text"] for c in chunks]
                embeddings = await self.embedding_service.generate_embeddings(texts)

                self.update_ingestion_job(db, document_id, IngestionStage.INDEXING, IngestionJobStatus.PROCESSING)
                self.vector_store.upsert_chunks(document_id, doc.filename, chunks, embeddings)

                self.update_document_status(db, document_id, DocumentStatus.READY, chunk_count=len(chunks))
                self.update_ingestion_job(db, document_id, IngestionStage.INDEXING, IngestionJobStatus.COMPLETED)

                logger.info("Document processed successfully", extra={"document_id": document_id, "chunks": len(chunks)})

            except Exception as e:
                logger.exception("Document processing failed", extra={"document_id": document_id})
                self.update_document_status(db, document_id, DocumentStatus.FAILED, error_message=str(e))
                self.update_ingestion_job(db, document_id, IngestionStage.INDEXING, IngestionJobStatus.FAILED, str(e))
                self._cleanup_failed_document(document_id)
                raise DocumentProcessingError(f"Failed to process document: {str(e)}")

    def _cleanup_failed_document(self, document_id: str) -> None:
        try:
            self.vector_store.delete_document(document_id)
        except Exception as e:
            logger.warning("Failed to clean up vectors", extra={"document_id": document_id, "error": str(e)})

    def delete_document(self, document_id: str) -> None:
        with get_db_session() as db:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if not doc:
                return

            try:
                self.vector_store.delete_document(document_id)
            except Exception as e:
                logger.warning("Failed to delete vectors", extra={"document_id": document_id, "error": str(e)})

            try:
                if doc.stored_path:
                    stored_file = Path(doc.stored_path)
                    if stored_file.exists():
                        stored_file.unlink(missing_ok=True)
            except Exception as e:
                logger.warning("Failed to delete file", extra={"document_id": document_id, "error": str(e)})

            try:
                db.query(IngestionJob).filter(IngestionJob.document_id == document_id).delete()
            except Exception:
                pass

            db.delete(doc)

    async def retry_document(self, document_id: str) -> None:
        with get_db_session() as db:
            doc = self.get_document(db, document_id)
            if doc.status not in (DocumentStatus.FAILED, DocumentStatus.UPLOADED):
                raise DocumentProcessingError("Only failed or uploaded documents can be retried")

            self._cleanup_failed_document(document_id)
            self.update_document_status(db, document_id, DocumentStatus.UPLOADED, error_message=None, chunk_count=0)
            self.update_ingestion_job(db, document_id, IngestionStage.QUEUED, IngestionJobStatus.PENDING)

        await self.process_document(document_id)

    async def close(self):
        await self.embedding_service.close()