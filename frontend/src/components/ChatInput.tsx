import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/utils/helpers';
import { Button } from './Button';
import { Send, Paperclip } from 'lucide-react';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import type { Document } from '@/types';

interface ChatInputProps {
  onSend: (question: string, documentIds: string[]) => void;
  loading?: boolean;
  documents?: Document[];
  selectedDocumentIds?: string[];
  onDocumentSelectionChange?: (ids: string[]) => void;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  loading,
  documents = [],
  selectedDocumentIds = [],
  onDocumentSelectionChange,
  disabled = false,
}: ChatInputProps) {
  const [question, setQuestion] = useState('');
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [question]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading || disabled) return;
    onSend(question.trim(), selectedDocumentIds);
    setQuestion('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasSelection = selectedDocumentIds.length > 0;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {documents.length > 0 && (
        <div className="mb-3">
          <MultiSelectDropdown
            options={documents}
            selected={selectedDocumentIds}
            onChange={onDocumentSelectionChange || (() => {})}
            placeholder="Search all documents..."
            disabled={loading || disabled}
          />
        </div>
      )}

      <div className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasSelection ? `Ask about ${selectedDocumentIds.length} selected document(s)...` : 'Ask a question about your documents...'}
            disabled={loading || disabled}
            rows={1}
            className={cn(
              'w-full bg-white border rounded-xl px-4 py-3 pr-14 text-sm text-surface-900 placeholder-surface-400',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500',
              'resize-none transition-colors duration-200',
              'min-h-[48px] max-h-[160px]',
              loading ? 'opacity-50' : '',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
              hasSelection ? 'border-brand-300 bg-brand-50' : 'border-surface-300'
            )}
            aria-label="Ask a question"
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
            {documents.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDocumentPicker(!showDocumentPicker)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  hasSelection ? 'bg-brand-100 text-brand-600' : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100',
                  loading && 'opacity-50 pointer-events-none'
                )}
                aria-label={hasSelection ? 'Change document selection' : 'Select documents'}
                aria-expanded={showDocumentPicker}
              >
                <Paperclip className="h-5 w-5" />
              </button>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
              disabled={!question.trim() || loading || disabled}
              className="p-2"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {hasSelection && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-surface-500">Searching in:</span>
            <div className="flex flex-wrap gap-1.5">
              {documents
                .filter((d) => selectedDocumentIds.includes(d.document_id))
                .map((doc) => (
                  <span
                    key={doc.document_id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-brand-100 text-brand-700"
                  >
                    {doc.filename}
                    <button
                      type="button"
                      onClick={() => onDocumentSelectionChange?.(selectedDocumentIds.filter((id) => id !== doc.document_id))}
                      className="p-0.5 hover:bg-brand-200 rounded transition-colors"
                      aria-label={`Remove ${doc.filename}`}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-surface-400 text-center">
        Press <kbd className="px-1.5 py-0.5 bg-surface-100 rounded text-surface-600 font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-surface-100 rounded text-surface-600 font-mono">Shift+Enter</kbd> for new line
      </p>
    </form>
  );
}