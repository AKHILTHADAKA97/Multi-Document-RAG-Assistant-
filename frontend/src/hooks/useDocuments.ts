import { useState, useEffect, useCallback } from 'react';
import { documentApi } from '@/utils/api';
import type { Document, DocumentListResponse } from '@/types';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: DocumentListResponse = await documentApi.list();
      setDocuments(response.documents);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const upload = async (files: File[]) => {
    const response = await documentApi.upload(files);
    await fetchDocuments();
    return response;
  };

  const remove = async (id: string) => {
    await documentApi.delete(id);
    setDocuments((prev) => prev.filter((d) => d.document_id !== id));
    setTotal((prev) => prev - 1);
  };

  const retry = async (id: string) => {
    const updated = await documentApi.retry(id);
    setDocuments((prev) => prev.map((d) => (d.document_id === id ? updated : d)));
    return updated;
  };

  return { documents, total, loading, error, upload, remove, retry, refresh: fetchDocuments };
}