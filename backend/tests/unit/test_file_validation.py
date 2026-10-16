import pytest
from io import BytesIO
from app.utils.file_validation import (
    validate_file_extension,
    validate_mime_type,
    validate_file_size,
    compute_sha256,
    sanitize_filename,
    generate_safe_filename,
    validate_upload_file,
)
from app.core.exceptions import (
    UnsupportedFileTypeError,
    FileTooLargeError,
    InvalidPDFError,
)


class TestFileValidation:
    def test_validate_file_extension_valid(self):
        validate_file_extension("test.pdf")
        validate_file_extension("document.PDF")

    def test_validate_file_extension_invalid(self):
        with pytest.raises(UnsupportedFileTypeError):
            validate_file_extension("test.txt")
        with pytest.raises(UnsupportedFileTypeError):
            validate_file_extension("test.docx")

    def test_validate_mime_type_valid(self):
        pdf_content = b"%PDF-1.4\n%test content"
        file = BytesIO(pdf_content)
        validate_mime_type(file)

    def test_validate_mime_type_invalid(self):
        file = BytesIO(b"not a pdf")
        with pytest.raises(UnsupportedFileTypeError):
            validate_mime_type(file)

    def test_validate_file_size_valid(self):
        file = BytesIO(b"x" * 1000)
        validate_file_size(file, 2000)

    def test_validate_file_size_too_large(self):
        file = BytesIO(b"x" * 3000)
        with pytest.raises(FileTooLargeError):
            validate_file_size(file, 2000)

    def test_validate_file_size_empty(self):
        file = BytesIO(b"")
        with pytest.raises(InvalidPDFError, match="empty"):
            validate_file_size(file, 2000)

    def test_compute_sha256(self):
        content = b"test content"
        file = BytesIO(content)
        hash_value = compute_sha256(file)
        assert len(hash_value) == 64
        assert hash_value == compute_sha256(BytesIO(content))

    def test_sanitize_filename(self):
        assert sanitize_filename("normal.pdf") == "normal.pdf"
        assert sanitize_filename("file with spaces.pdf") == "file with spaces.pdf"
        assert sanitize_filename("file<script>.pdf") == "filescript.pdf"
        assert sanitize_filename("../../../etc/passwd.pdf") == "etcpasswd.pdf"

    def test_generate_safe_filename(self):
        result = generate_safe_filename("test.pdf", "doc_abc123")
        assert result.startswith("doc_abc123_")
        assert result.endswith(".pdf")

    def test_validate_upload_file_valid(self):
        pdf_content = b"%PDF-1.4\ncontent"
        file = BytesIO(pdf_content)
        validate_upload_file(file, "test.pdf")

    def test_validate_upload_file_invalid_extension(self):
        file = BytesIO(b"%PDF content")
        with pytest.raises(UnsupportedFileTypeError):
            validate_upload_file(file, "test.txt")

    def test_validate_upload_file_invalid_mime(self):
        file = BytesIO(b"not pdf")
        with pytest.raises(UnsupportedFileTypeError):
            validate_upload_file(file, "test.pdf")