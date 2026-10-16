from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Multi-Document RAG Assistant"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    log_level: str = "INFO"

    database_url: str = "sqlite:///./storage/app.db"
    upload_dir: str = "./storage/uploads"
    max_upload_size_mb: int = 20
    max_files_per_request: int = 5

    chroma_persist_dir: str = "./storage/chroma"
    chroma_collection: str = "rag_documents"

    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_api_key: str = ""

    chunk_size: int = 800
    chunk_overlap: int = 120
    top_k: int = 5
    min_relevance_score: float = 0.5
    llm_timeout_seconds: int = 30
    embedding_batch_size: int = 64

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def backend_dir(self) -> Path:
        return Path(__file__).resolve().parent.parent.parent

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir)
        if not p.is_absolute():
            clean = str(self.upload_dir).lstrip("./")
            target = self.backend_dir / clean
        else:
            target = p
        target.mkdir(parents=True, exist_ok=True)
        return target

    @property
    def chroma_path(self) -> Path:
        p = Path(self.chroma_persist_dir)
        if not p.is_absolute():
            clean = str(self.chroma_persist_dir).lstrip("./")
            target = self.backend_dir / clean
        else:
            target = p
        target.mkdir(parents=True, exist_ok=True)
        return target

    @property
    def resolved_database_url(self) -> str:
        if self.database_url.startswith("sqlite:///./"):
            clean = self.database_url.replace("sqlite:///./", "")
            db_path = self.backend_dir / clean
            db_path.parent.mkdir(parents=True, exist_ok=True)
            return f"sqlite:///{db_path}"
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()