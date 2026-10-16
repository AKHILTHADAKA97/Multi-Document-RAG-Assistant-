# Multi-Document RAG Assistant

An AI-powered document question-answering system built with Python, FastAPI, embeddings, ChromaDB, and an LLM API. Upload multiple PDFs, perform semantic search, generate evidence-grounded answers, and trace responses to their original source documents and pages.

## Features

- **Multi-PDF Upload**: Upload multiple PDF documents with validation
- **Semantic Search**: Vector-based retrieval using ChromaDB
- **Grounded Answers**: LLM responses based only on retrieved document context
- **Source Citations**: Every answer includes document, page, and excerpt references
- **Document Management**: List, inspect, retry, and delete documents
- **Modern Frontend**: React + TypeScript + Tailwind CSS interface
- **Production Ready**: Docker, health checks, structured logging, error handling

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   FastAPI   │────▶│  ChromaDB   │
│  (React)    │     │   Backend   │     │ (Vectors)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌─────────┐   ┌─────────┐
              │ SQLite  │   │  LLM    │
              │ (Meta)  │   │ Provider│
              └─────────┘   └─────────┘
```

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- OpenAI API key (or compatible provider)

### Backend Setup

```bash
# Clone and navigate
cd multi-document-rag-assistant

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run the API server
python -m uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Docker Deployment

```bash
# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Build and run
docker compose up --build
```

## Configuration

Key environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_API_KEY` | OpenAI API key | Required |
| `EMBEDDING_API_KEY` | Embedding API key | Same as LLM |
| `CHUNK_SIZE` | Token chunk size | 800 |
| `CHUNK_OVERLAP` | Token overlap | 120 |
| `TOP_K` | Retrieval count | 5 |
| `MIN_RELEVANCE_SCORE` | Similarity threshold | 0.5 |

## API Endpoints

### Health
- `GET /api/v1/health` - Liveness check
- `GET /api/v1/ready` - Readiness check

### Documents
- `POST /api/v1/documents/upload` - Upload PDFs
- `GET /api/v1/documents` - List documents
- `GET /api/v1/documents/{id}` - Get document details
- `DELETE /api/v1/documents/{id}` - Delete document
- `POST /api/v1/documents/{id}/retry` - Retry failed ingestion

### Chat
- `POST /api/v1/chat/query` - Ask a question

### Example Chat Request

```json
{
  "question": "What is the annual leave policy?",
  "document_ids": ["doc_123"],
  "top_k": 5
}
```

### Example Chat Response

```json
{
  "answer": "Employees receive 18 days of annual leave per year.",
  "grounded": true,
  "sources": [
    {
      "document_id": "doc_123",
      "filename": "employee_handbook.pdf",
      "page_number": 12,
      "chunk_id": "doc_123_p12_c0",
      "excerpt": "Eligible employees receive 18 days...",
      "similarity": 0.87
    }
  ],
  "request_id": "req_abc123"
}
```

## Project Structure

```
multi-document-rag-assistant/
├── app/
│   ├── api/v1/endpoints/    # API routes
│   ├── core/                # Config, logging, exceptions
│   ├── db/                  # Database & vector store
│   ├── models/              # SQLAlchemy models
│   ├── repositories/        # Data access layer
│   ├── schemas/             # Pydantic models
│   ├── services/            # Business logic
│   ├── utils/               # Utilities
│   └── main.py              # FastAPI app
├── frontend/                # React + TypeScript app
├── tests/                   # Unit, integration, API tests
├── storage/                 # Local data (gitignored)
├── requirements.txt
├── Dockerfile
├── compose.yaml
└── README.md
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=term-missing

# Run specific test suites
pytest tests/unit/
pytest tests/api/
pytest tests/integration/
```

## Evaluation

Run evaluation against a golden dataset:

```bash
# Via API
curl -X POST http://localhost:8000/api/v1/evaluation/run

# Or programmatically
python scripts/run_evaluation.py
```

## Security Considerations

- File validation (MIME type, PDF signature, size limits)
- Path traversal prevention
- No secrets in frontend code
- Structured error responses (no stack traces)
- Rate limiting ready (add middleware)
- Authentication required for production use

## Roadmap

- [ ] Hybrid search (BM25 + vector)
- [ ] Reranking with cross-encoder
- [ ] OCR for scanned PDFs
- [ ] Multi-user with authentication
- [ ] WebSocket streaming responses
- [ ] Document preview with highlights
- [ ] Export chat history

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/)
- [ChromaDB](https://www.trychroma.com/)
- [PyMuPDF](https://pymupdf.readthedocs.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)