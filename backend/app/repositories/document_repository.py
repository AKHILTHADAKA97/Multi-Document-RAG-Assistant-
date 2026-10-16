from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.document import Document, IngestionJob, DocumentStatus, IngestionJobStatus


class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, document: Document) -> Document:
        self.db.add(document)
        self.db.flush()
        return document

    def get_by_id(self, document_id: str) -> Optional[Document]:
        return self.db.query(Document).filter(Document.id == document_id).first()

    def get_by_sha256(self, sha256: str) -> Optional[Document]:
        return self.db.query(Document).filter(Document.sha256 == sha256).first()

    def list(self, skip: int = 0, limit: int = 100) -> List[Document]:
        return self.db.query(Document).order_by(Document.created_at.desc()).offset(skip).limit(limit).all()

    def count(self) -> int:
        return self.db.query(Document).count()

    def update_status(
        self,
        document_id: str,
        status: DocumentStatus,
        error_message: Optional[str] = None,
        page_count: Optional[int] = None,
        chunk_count: Optional[int] = None,
    ) -> Optional[Document]:
        doc = self.get_by_id(document_id)
        if doc:
            doc.status = status
            if error_message:
                doc.error_message = error_message
            if page_count is not None:
                doc.page_count = page_count
            if chunk_count is not None:
                doc.chunk_count = chunk_count
        return doc

    def delete(self, document_id: str) -> bool:
        doc = self.get_by_id(document_id)
        if doc:
            self.db.delete(doc)
            return True
        return False


class IngestionJobRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, job: IngestionJob) -> IngestionJob:
        self.db.add(job)
        self.db.flush()
        return job

    def get_by_document_id(self, document_id: str) -> Optional[IngestionJob]:
        return self.db.query(IngestionJob).filter(IngestionJob.document_id == document_id).first()

    def update(
        self,
        document_id: str,
        stage: str = None,
        status: IngestionJobStatus = None,
        error_message: str = None,
    ) -> Optional[IngestionJob]:
        job = self.get_by_document_id(document_id)
        if job:
            if stage:
                job.stage = stage
            if status:
                job.status = status
            if error_message:
                job.error_message = error_message
        return job