from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class InvalidPDFError(AppException):
    def __init__(self, message: str = "Invalid or corrupt PDF file", details: Optional[Dict] = None):
        super().__init__("INVALID_PDF", message, status.HTTP_400_BAD_REQUEST, details)


class FileTooLargeError(AppException):
    def __init__(self, message: str = "File size exceeds limit", details: Optional[Dict] = None):
        super().__init__("FILE_TOO_LARGE", message, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, details)


class UnsupportedFileTypeError(AppException):
    def __init__(self, message: str = "Unsupported file type", details: Optional[Dict] = None):
        super().__init__("UNSUPPORTED_FILE_TYPE", message, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, details)


class DocumentNotFoundError(AppException):
    def __init__(self, document_id: str):
        super().__init__(
            "DOCUMENT_NOT_FOUND",
            f"Document with ID '{document_id}' not found",
            status.HTTP_404_NOT_FOUND,
            {"document_id": document_id},
        )


class DocumentProcessingError(AppException):
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__("DOCUMENT_PROCESSING_ERROR", message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)


class EmbeddingProviderError(AppException):
    def __init__(self, message: str = "Embedding provider error", details: Optional[Dict] = None):
        super().__init__("EMBEDDING_PROVIDER_ERROR", message, status.HTTP_503_SERVICE_UNAVAILABLE, details)


class LLMProviderError(AppException):
    def __init__(self, message: str = "LLM provider error", details: Optional[Dict] = None):
        super().__init__("LLM_PROVIDER_ERROR", message, status.HTTP_503_SERVICE_UNAVAILABLE, details)


class VectorStoreError(AppException):
    def __init__(self, message: str = "Vector store error", details: Optional[Dict] = None):
        super().__init__("VECTOR_STORE_ERROR", message, status.HTTP_503_SERVICE_UNAVAILABLE, details)


class RateLimitError(AppException):
    def __init__(self, message: str = "Rate limit exceeded", details: Optional[Dict] = None):
        super().__init__("RATE_LIMIT_EXCEEDED", message, status.HTTP_429_TOO_MANY_REQUESTS, details)


class EmptyDocumentError(AppException):
    def __init__(self, message: str = "Document contains no extractable text", details: Optional[Dict] = None):
        super().__init__("EMPTY_DOCUMENT", message, status.HTTP_400_BAD_REQUEST, details)


class NoRelevantContextError(AppException):
    def __init__(self, message: str = "No relevant context found for the question", details: Optional[Dict] = None):
        super().__init__("NO_RELEVANT_CONTEXT", message, status.HTTP_404_NOT_FOUND, details)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.warning(
        "Application error",
        extra={
            "code": exc.code,
            "message": exc.message,
            "status_code": exc.status_code,
            "request_id": request_id,
            "details": exc.details,
        },
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "request_id": request_id,
                **({"details": exc.details} if exc.details else {}),
            }
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.warning(
        "Validation error",
        extra={"errors": exc.errors(), "request_id": request_id},
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request data",
                "request_id": request_id,
                "details": exc.errors(),
            }
        },
    )


async def pydantic_validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid data",
                "request_id": request_id,
                "details": exc.errors(),
            }
        },
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
                "request_id": request_id,
            }
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    settings = get_settings()
    logger.exception(
        "Unhandled exception",
        extra={"request_id": request_id, "error_type": type(exc).__name__},
    )
    if settings.app_env == "development":
        detail = f"{type(exc).__name__}: {str(exc)}"
    else:
        detail = "An unexpected error occurred"
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": detail,
                "request_id": request_id,
            }
        },
    )