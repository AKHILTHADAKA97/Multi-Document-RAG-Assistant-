import hashlib
import magic
from pathlib import Path
from typing import BinaryIO

from app.core.config import get_settings
from app.core.exceptions import (
    FileTooLargeError,
    InvalidPDFError,
    UnsupportedFileTypeError,
)

ALLOWED_MIME_TYPES = {"application/pdf"}
ALLOWED_EXTENSIONS = {".pdf"}
PDF_SIGNATURE = b"%PDF"


def validate_file_extension(filename: str) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UnsupportedFileTypeError(
            f"File extension '{ext}' is not supported. Allowed: {ALLOWED_EXTENSIONS}"
        )


def validate_mime_type(file: BinaryIO) -> None:
    file.seek(0)
    header = file.read(2048)
    file.seek(0)

    mime = magic.from_buffer(header, mime=True)
    if mime not in ALLOWED_MIME_TYPES:
        raise UnsupportedFileTypeError(
            f"MIME type '{mime}' is not supported. Allowed: {ALLOWED_MIME_TYPES}"
        )

    if not header.startswith(PDF_SIGNATURE):
        raise InvalidPDFError("File does not have a valid PDF signature")


def validate_file_size(file: BinaryIO, max_size: int) -> None:
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)

    if size > max_size:
        raise FileTooLargeError(
            f"File size {size} bytes exceeds maximum {max_size} bytes",
            {"file_size": size, "max_size": max_size},
        )
    if size == 0:
        raise InvalidPDFError("File is empty")


def compute_sha256(file: BinaryIO) -> str:
    file.seek(0)
    sha256_hash = hashlib.sha256()
    for chunk in iter(lambda: file.read(8192), b""):
        sha256_hash.update(chunk)
    file.seek(0)
    return sha256_hash.hexdigest()


def sanitize_filename(filename: str) -> str:
    name = Path(filename).name
    name = "".join(c for c in name if c.isalnum() or c in "._- ")
    return name[:255]


def generate_safe_filename(original_filename: str, document_id: str) -> str:
    ext = Path(original_filename).suffix.lower()
    safe_name = sanitize_filename(original_filename)
    return f"{document_id}_{safe_name}"


def validate_upload_file(file: BinaryIO, filename: str) -> None:
    settings = get_settings()
    validate_file_extension(filename)
    validate_mime_type(file)
    validate_file_size(file, settings.max_upload_size_bytes)