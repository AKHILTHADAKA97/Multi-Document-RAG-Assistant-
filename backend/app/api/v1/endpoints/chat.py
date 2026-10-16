from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.rag_service import RAGService
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse

router = APIRouter()


@router.post("/chat/query", response_model=ChatQueryResponse)
async def query_chat(
    request: Request,
    query: ChatQueryRequest,
    db: Session = Depends(get_db),
):
    request_id = getattr(request.state, "request_id", "unknown")

    rag_service = RAGService()
    try:
        result = await rag_service.answer_question(
            question=query.question,
            document_ids=query.document_ids,
            top_k=query.top_k,
        )
    finally:
        await rag_service.close()

    return ChatQueryResponse(
        answer=result["answer"],
        grounded=result["grounded"],
        sources=result["sources"],
        request_id=request_id,
    )