import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ChatQueryRequest, ChatQueryResponse, Document, DocumentListResponse, DocumentsUploadResponse, HealthResponse, ReadyResponse } from '@/types';

interface ApiErrorResponse {
  error?: {
    code: string;
    message: string;
    request_id?: string;
    details?: unknown;
  };
}

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  config.headers['X-Request-ID'] = requestId;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const message = error.response?.data?.error?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export const healthApi = {
  check: () => api.get<HealthResponse>('/health').then((r) => r.data),
  ready: () => api.get<ReadyResponse>('/ready').then((r) => r.data),
};

export const documentApi = {
  upload: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post<DocumentsUploadResponse>('/documents/upload', formData).then((r) => r.data);
  },
  list: (skip = 0, limit = 100) =>
    api.get<DocumentListResponse>(`/documents?skip=${skip}&limit=${limit}`).then((r) => r.data),
  get: (id: string) => api.get<Document>(`/documents/${id}`).then((r) => r.data),
  delete: (id: string) => api.delete(`/documents/${id}`).then((r) => r.data),
  retry: (id: string) => api.post<Document>(`/documents/${id}/retry`).then((r) => r.data),
  fileUrl: (id: string) => `/api/v1/documents/${id}/file`,
};

export const chatApi = {
  query: (payload: ChatQueryRequest) =>
    api.post<ChatQueryResponse>('/chat/query', payload).then((r) => r.data),
};

export default api;