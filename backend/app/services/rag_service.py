import httpx
from typing import List, Dict, Any, Optional
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import get_settings
from app.core.exceptions import LLMProviderError
from app.services.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a document question-answering assistant. Answer the user's question using only the supplied document context. Do not invent facts, citations, page numbers, or source material. If the evidence is insufficient, clearly say that the uploaded documents do not provide enough information. Distinguish direct evidence from reasonable inferences. Cite supporting sources using the provided source identifiers in square brackets (e.g., [S1], [S2])."""


class RAGService:
    def __init__(self):
        self.settings = get_settings()
        self.retrieval_service = RetrievalService()
        self.client = httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds)

    async def answer_question(
        self,
        question: str,
        document_ids: Optional[List[str]] = None,
        top_k: Optional[int] = None,
    ) -> Dict[str, Any]:
        try:
            chunks = await self.retrieval_service.retrieve(question, document_ids, top_k)
        except Exception as e:
            logger.warning("Retrieval failed", extra={"question": question[:100], "error": str(e)})
            raise

        context_parts = []
        sources = []

        for i, chunk in enumerate(chunks):
            source_id = f"S{i+1}"
            context_parts.append(f"[{source_id}] {chunk['text']}")
            sources.append({
                "source_id": source_id,
                "document_id": chunk["metadata"]["document_id"],
                "filename": chunk["metadata"]["filename"],
                "page_number": chunk["metadata"]["page_number"],
                "chunk_id": chunk["metadata"]["chunk_id"],
                "excerpt": chunk["text"][:200] + ("..." if len(chunk["text"]) > 200 else ""),
                "similarity": chunk["similarity"],
            })

        if not self.settings.llm_api_key:
            if not chunks:
                return {
                    "answer": "The uploaded documents do not contain information related to this question.",
                    "grounded": False,
                    "sources": [],
                }
            top_sources = sources[:min(3, len(sources))]
            top_chunk = chunks[0]
            answer_parts = [
                f"Based on <b>{top_chunk['metadata']['filename']}</b> (Page {top_chunk['metadata']['page_number']}):\n",
                f"[S1] {top_chunk['text'].strip()}",
            ]
            if len(chunks) > 1:
                answer_parts.append(f"\n[S2] {chunks[1]['text'].strip()}")
            return {
                "answer": "\n\n".join(answer_parts),
                "grounded": True,
                "sources": top_sources,
            }

        context = "\n\n".join(context_parts)
        prompt = self._build_prompt(question, context)

        answer = await self._generate_answer(prompt)

        validated_sources = self._validate_citations(answer, sources)

        return {
            "answer": answer,
            "grounded": len(validated_sources) > 0,
            "sources": validated_sources,
        }

    def _build_prompt(self, question: str, context: str) -> str:
        return f"{SYSTEM_PROMPT}\n\nContext:\n{context}\n\nQuestion: {question}\n\nAnswer:"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError)),
    )
    async def _generate_answer(self, prompt: str) -> str:
        if self.settings.llm_provider == "openai":
            return await self._generate_openai_answer(prompt)
        else:
            raise LLMProviderError(f"Unsupported LLM provider: {self.settings.llm_provider}")

    async def _generate_openai_answer(self, prompt: str) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.settings.llm_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.settings.llm_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 1000,
        }

        try:
            response = await self.client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        except httpx.HTTPStatusError as e:
            logger.error("OpenAI LLM API error", extra={"status": e.response.status_code, "response": e.response.text})
            raise LLMProviderError(f"LLM API error: {e.response.status_code}")
        except Exception as e:
            logger.error("LLM generation failed", extra={"error": str(e)})
            raise LLMProviderError(f"Failed to generate answer: {str(e)}")

    def _validate_citations(self, answer: str, sources: List[Dict]) -> List[Dict]:
        validated = []
        for source in sources:
            source_id = source["source_id"]
            if f"[{source_id}]" in answer:
                validated.append({
                    "document_id": source["document_id"],
                    "filename": source["filename"],
                    "page_number": source["page_number"],
                    "chunk_id": source["chunk_id"],
                    "excerpt": source["excerpt"],
                    "similarity": source["similarity"],
                })
        return validated

    async def close(self):
        await self.retrieval_service.close()
        await self.client.aclose()