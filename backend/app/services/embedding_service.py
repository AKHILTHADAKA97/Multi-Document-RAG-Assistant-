import httpx
from typing import List
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import get_settings
from app.core.exceptions import EmbeddingProviderError

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        self.settings = get_settings()
        self.client = httpx.AsyncClient(timeout=30.0)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError)),
    )
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        api_key = self.settings.embedding_api_key or self.settings.llm_api_key
        if not api_key:
            logger.info("No embedding API key provided; generating local normalized embeddings")
            return self._generate_local_embeddings(texts)

        if self.settings.llm_provider == "openai":
            return await self._generate_openai_embeddings(texts)
        else:
            return self._generate_local_embeddings(texts)

    def _generate_local_embeddings(self, texts: List[str]) -> List[List[float]]:
        import hashlib
        import math
        dim = 1536
        results = []
        for text in texts:
            vec = [0.0] * dim
            tokens = text.lower().split()
            for token in tokens:
                h = int(hashlib.md5(token.encode('utf-8')).hexdigest()[:8], 16) % dim
                vec[h] += 1.0
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            results.append([x / norm for x in vec])
        return results

    async def _generate_openai_embeddings(self, texts: List[str]) -> List[List[float]]:
        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {self.settings.embedding_api_key or self.settings.llm_api_key}",
            "Content-Type": "application/json",
        }

        all_embeddings = []
        batch_size = self.settings.embedding_batch_size

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            payload = {
                "model": self.settings.embedding_model,
                "input": batch,
            }

            try:
                response = await self.client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                embeddings = [item["embedding"] for item in data["data"]]
                all_embeddings.extend(embeddings)
            except httpx.HTTPStatusError as e:
                logger.error("OpenAI embedding API error", extra={"status": e.response.status_code, "response": e.response.text})
                raise EmbeddingProviderError(f"Embedding API error: {e.response.status_code}")
            except Exception as e:
                logger.error("Embedding generation failed", extra={"error": str(e)})
                raise EmbeddingProviderError(f"Failed to generate embeddings: {str(e)}")

        if len(all_embeddings) != len(texts):
            raise EmbeddingProviderError("Embedding count mismatch")

        return all_embeddings

    async def generate_query_embedding(self, query: str) -> List[float]:
        embeddings = await self.generate_embeddings([query])
        return embeddings[0]

    async def close(self):
        await self.client.aclose()