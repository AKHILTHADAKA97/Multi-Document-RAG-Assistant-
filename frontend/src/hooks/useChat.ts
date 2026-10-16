import { useState, useCallback } from 'react';
import { chatApi } from '@/utils/api';
import type { ChatQueryRequest, ChatQueryResponse, SourceReference } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceReference[];
  grounded?: boolean;
  timestamp: Date;
  error?: boolean;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const request: ChatQueryRequest = {
        question,
        document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
      };

      const response: ChatQueryResponse = await chatApi.query(request);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        grounded: response.grounded,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Failed to get response',
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [loading, selectedDocumentIds]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const toggleDocumentSelection = useCallback((documentId: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    );
  }, []);

  const clearDocumentSelection = useCallback(() => {
    setSelectedDocumentIds([]);
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    clearMessages,
    selectedDocumentIds,
    setSelectedDocumentIds,
    toggleDocumentSelection,
    clearDocumentSelection,
  };
}