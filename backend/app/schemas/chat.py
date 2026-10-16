from typing import Optional, List
from pydantic import BaseModel, Field


class SourceReference(BaseModel):
    document_id: str
    filename: str
    page_number: int
    chunk_id: str
    excerpt: str
    similarity: float


class ChatQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    document_ids: Optional[List[str]] = None
    top_k: Optional[int] = Field(default=None, ge=1, le=20)


class ChatQueryResponse(BaseModel):
    answer: str
    grounded: bool
    sources: List[SourceReference]
    request_id: str


class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"


class ReadyResponse(BaseModel):
    ready: bool
    database: bool
    vector_store: bool
    embedding_provider: bool
    llm_provider: bool