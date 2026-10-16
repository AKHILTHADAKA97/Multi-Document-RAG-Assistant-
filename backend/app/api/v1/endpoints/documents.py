from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.services.document_service import DocumentService
from app.services.ingestion_service import IngestionService
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentsUploadResponse,
    DocumentResponse,
    DocumentListResponse,
    DocumentDeleteResponse,
)

router = APIRouter()
settings = get_settings()


@router.post("/documents/upload", response_model=DocumentsUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_documents(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    if len(files) > settings.max_files_per_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {settings.max_files_per_request} files per request",
        )

    document_service = DocumentService()
    ingestion_service = IngestionService()

    file_objects = [f.file for f in files]
    filenames = [f.filename for f in files]

    try:
        results = await ingestion_service.ingest_documents(file_objects, filenames)
    finally:
        await ingestion_service.close()

    return DocumentsUploadResponse(
        documents=[
            DocumentUploadResponse(
                document_id=r["document_id"],
                filename=r["filename"],
                status=r["status"],
            )
            for r in results
        ]
    )


def doc_to_response(doc) -> DocumentResponse:
    return DocumentResponse(
        document_id=doc.id,
        filename=doc.filename,
        file_size_bytes=doc.file_size_bytes,
        page_count=doc.page_count,
        chunk_count=doc.chunk_count,
        status=doc.status,
        error_message=doc.error_message,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    document_service = DocumentService()
    documents = document_service.list_documents(db, skip, limit)
    total = document_service.count_documents(db)

    return DocumentListResponse(
        documents=[doc_to_response(doc) for doc in documents],
        total=total,
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    document_service = DocumentService()
    doc = document_service.get_document(db, document_id)
    return doc_to_response(doc)


from fastapi.responses import FileResponse
from pathlib import Path

@router.delete("/documents/{document_id}", response_model=DocumentDeleteResponse)
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    document_service = DocumentService()
    document_service.delete_document(document_id)
    return DocumentDeleteResponse(message="Document deleted successfully", document_id=document_id)


@router.get("/documents/{document_id}/file")
@router.get("/documents/{document_id}/download")
async def get_document_file(
    document_id: str,
    db: Session = Depends(get_db),
):
    document_service = DocumentService()
    doc = document_service.get_document(db, document_id)
    file_path = Path(doc.stored_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document file not found on disk")
    return FileResponse(
        path=str(file_path),
        filename=doc.filename,
        media_type="application/pdf",
    )


@router.post("/documents/{document_id}/retry", response_model=DocumentResponse)
async def retry_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    document_service = DocumentService()
    try:
        await document_service.retry_document(document_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    doc = document_service.get_document(db, document_id)
    return DocumentResponse.model_validate(doc)