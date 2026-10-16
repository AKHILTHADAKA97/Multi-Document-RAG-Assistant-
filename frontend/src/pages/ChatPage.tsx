import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useDocuments } from '@/hooks/useDocuments';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Card, CardContent } from '@/components/Card';
import { Loader2, Sparkles } from 'lucide-react';

export function ChatPage() {
  const { messages, loading, sendMessage, clearMessages, selectedDocumentIds, setSelectedDocumentIds, clearDocumentSelection } = useChat();
  const { documents } = useDocuments();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (question: string) => {
    sendMessage(question);
  };

  const handleClear = () => {
    if (messages.length > 0 && window.confirm('Clear all messages?')) {
      clearMessages();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-surface-900 mb-2 flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-brand-600" />
          Chat with Documents
        </h1>
        <p className="text-surface-500">
          Ask questions about your uploaded PDFs. Select specific documents to narrow the search.
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-brand-600" />
                </div>
                <h2 className="text-xl font-semibold text-surface-900 mb-2">Start a conversation</h2>
                <p className="text-surface-500 max-w-md">
                  Ask questions about your documents. The AI will search through your PDFs and provide answers with source citations.
                </p>
                {documents.length === 0 && (
                  <p className="mt-4 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                    No documents uploaded yet. Go to the Documents page to upload PDFs first.
                  </p>
                )}
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} {...message} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <Card variant="outlined">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                        <span className="text-surface-600">Thinking...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>

          <div className="border-t border-surface-200 p-4">
            <ChatInput
              onSend={handleSend}
              loading={loading}
              documents={documents}
              selectedDocumentIds={selectedDocumentIds}
              onDocumentSelectionChange={setSelectedDocumentIds}
              disabled={documents.length === 0}
            />

            {(messages.length > 0 || selectedDocumentIds.length > 0) && (
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedDocumentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearDocumentSelection}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-surface-500 hover:text-surface-700 font-medium"
                  disabled={messages.length === 0}
                >
                  Clear chat
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}