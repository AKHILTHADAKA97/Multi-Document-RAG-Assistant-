from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

from app.models.document import DocumentStatus


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    status: DocumentStatus


class DocumentsUploadResponse(BaseModel):
    documents: List[DocumentUploadResponse]


class DocumentResponse(BaseModel):
    document_id: str = Field(default="", validation_alias="id")
    filename: str
    file_size_bytes: int
    page_count: Optional[int] = None
    chunk_count: int
    status: DocumentStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class DocumentDeleteResponse(BaseModel):
    message: str
    document_id: str