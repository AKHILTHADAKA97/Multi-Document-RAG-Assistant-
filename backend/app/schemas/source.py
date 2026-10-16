from typing import Optional, List
from pydantic import BaseModel


class SourceSchema(BaseModel):
    document_id: str
    filename: str
    page_number: int
    chunk_id: str
    text: str
    similarity: float


class EvaluationItem(BaseModel):
    question: str
    document_id: Optional[str] = None
    expected_answer: str
    expected_pages: List[int] = []


class EvaluationResult(BaseModel):
    question: str
    answer: str
    expected_answer: str
    grounded: bool
    sources: List[SourceSchema]
    retrieval_metrics: dict
    latency_ms: float