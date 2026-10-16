export interface Document {
  document_id: string;
  filename: string;
  file_size_bytes: number;
  page_count: number | null;
  chunk_count: number;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentStatus =
  | 'uploaded'
  | 'processing'
  | 'extracting'
  | 'chunking'
  | 'embedding'
  | 'indexing'
  | 'ready'
  | 'failed'
  | 'deleted';

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  status: DocumentStatus;
}

export interface DocumentsUploadResponse {
  documents: DocumentUploadResponse[];
}

export interface SourceReference {
  document_id: string;
  filename: string;
  page_number: number;
  chunk_id: string;
  excerpt: string;
  similarity: number;
}

export interface ChatQueryRequest {
  question: string;
  document_ids?: string[];
  top_k?: number;
}

export interface ChatQueryResponse {
  answer: string;
  grounded: boolean;
  sources: SourceReference[];
  request_id: string;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface ReadyResponse {
  ready: boolean;
  database: boolean;
  vector_store: boolean;
  embedding_provider: boolean;
  llm_provider: boolean;
}