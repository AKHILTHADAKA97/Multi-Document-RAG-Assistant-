import { useState, useRef, useEffect, type FormEvent } from 'react';
import { chatApi } from '@/utils/api';
import { useDocuments } from '@/hooks/useDocuments';
import { useToast } from '@/components/Toast';
import type { SourceReference } from '@/types';
import { FileText, Upload, ChevronDown, ChevronUp, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
import { ragStateStore } from '@/utils/ragState';

export interface BotMessageItem {
  text: string;
}

export interface UserMessageState {
  thread_id: string;
  text: string;
  channel: string;
  context: Record<string, unknown>;
}

export interface NLUState {
  entities: Record<string, string>;
  intent: {
    intent: string;
    confidence: number;
  };
}

export interface ContextState {
  result?: Record<string, unknown>;
  username?: string;
  grounded?: boolean;
  sources?: SourceReference[];
  sources_count?: number;
  active_documents?: string[];
  documents_count?: number;
  error?: string;
  [key: string]: unknown;
}

export interface CurrentStateData {
  thread_id: string;
  user_message: UserMessageState | null;
  bot_message: BotMessageItem[];
  nlu: NLUState;
  context: ContextState;
}

export interface MessageBubble {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  sources?: SourceReference[];
  grounded?: boolean;
  error?: boolean;
  timestamp: string;
}

interface ChatInterfaceProps {
  backendHealthy?: boolean;
}

export function ChatInterface({ backendHealthy }: ChatInterfaceProps) {
  const { documents, total, loading: docsLoading, upload, refresh } = useDocuments();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<MessageBubble[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial clean state reflecting actual document status
  const [currentState, setCurrentState] = useState<CurrentStateData>(() => ({
    thread_id: 'rag-session-1',
    user_message: null,
    bot_message: [],
    nlu: {
      entities: {},
      intent: {
        intent: 'awaiting_document_query',
        confidence: 1.0,
      },
    },
    context: {
      status: 'ready',
      documents_count: 0,
      active_documents: [],
      grounded: false,
      backend_connected: backendHealthy ?? false,
    },
  }));

  // Keep state updated when documents list changes
  useEffect(() => {
    setCurrentState((prev) => ({
      ...prev,
      context: {
        ...prev.context,
        documents_count: total,
        active_documents: documents.map((d) => d.filename),
      },
    }));
  }, [documents, total]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleFileUpload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      await upload(files);
      showToast({
        type: 'success',
        title: 'Upload Successful',
        message: `${files.length} document(s) uploaded and indexed for Q&A.`,
      });
      refresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Upload Failed',
        message: err instanceof Error ? err.message : 'Failed to upload document',
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleSourceView = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || loading) return;

    setInputText('');

    const userMsg: MessageBubble = {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const startTime = performance.now();

    // CASE 1: No documents uploaded yet
    if (documents.length === 0) {
      setTimeout(() => {
        const botReply =
          '⚠️ <b>No documents uploaded yet.</b><br/>Please upload one or more PDF documents first. I am programmed to answer questions <b>strictly based on the content of your uploaded documents</b>.';

        const botMsg: MessageBubble = {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: botReply,
          grounded: false,
          error: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, botMsg]);
        setCurrentState({
          thread_id: 'rag-session-1',
          user_message: {
            thread_id: 'rag-session-1',
            text,
            channel: 'web-portal',
            context: { documents_count: 0 },
          },
          bot_message: [
            {
              text: 'No documents uploaded yet. Please upload PDF documents first to enable document-grounded Q&A.',
            },
          ],
          nlu: {
            entities: {},
            intent: {
              intent: 'no_document_context',
              confidence: 1.0,
            },
          },
          context: {
            grounded: false,
            documents_count: 0,
            active_documents: [],
            error: 'MISSING_DOCUMENT_CONTEXT',
          },
        });

        ragStateStore.addLog({
          query: text,
          intent: 'no_document_context',
          confidence: 1.0,
          grounded: false,
          documentCount: 0,
          sourcesCount: 0,
          latencyMs: Math.round(performance.now() - startTime),
          status: '404 Not Found',
          answerExcerpt: 'No documents uploaded yet. Please upload PDF documents first.',
        });

        setLoading(false);
      }, 350);
      return;
    }

    // Classify intent based on semantic structure
    const lower = text.toLowerCase();
    let detectedIntent = 'document_qa';
    let intentConfidence = 0.94;
    if (lower.includes('summar') || lower.includes('overview') || lower.includes('takeaway')) {
      detectedIntent = 'document_summarization';
      intentConfidence = 0.96;
    } else if (lower.includes('extract') || lower.includes('list') || lower.includes('clause') || lower.includes('table')) {
      detectedIntent = 'data_extraction';
      intentConfidence = 0.92;
    } else if (lower.includes('find') || lower.includes('where') || lower.includes('cite') || lower.includes('page')) {
      detectedIntent = 'semantic_search';
      intentConfidence = 0.95;
    } else if (lower.includes('compare') || lower.includes('difference') || lower.includes('versus') || lower.includes('vs')) {
      detectedIntent = 'comparative_analysis';
      intentConfidence = 0.91;
    }

    // CASE 2: Documents exist -> Query RAG backend
    try {
      const activeDocFilter = selectedDocIds.length > 0 ? selectedDocIds : undefined;
      const response = await chatApi.query({
        question: text,
        document_ids: activeDocFilter,
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const botReply = response.answer;
      const botMsg: MessageBubble = {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: botReply,
        sources: response.sources || [],
        grounded: response.grounded,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Extract entities / keywords from query
      const words = text.split(/\s+/).filter((w) => w.length > 3);
      const entities: Record<string, string> = {};
      if (words.length > 0) {
        entities['query_topic'] = words.slice(0, 3).join(' ');
      }
      const pageMatch = text.match(/(?:page|p\.)\s*(\d+)/i);
      if (pageMatch) {
        entities['target_page'] = pageMatch[1];
      }
      if (selectedDocIds.length > 0) {
        entities['filter_document_id'] = selectedDocIds.join(', ');
      }

      setCurrentState({
        thread_id: 'rag-session-1',
        user_message: {
          thread_id: 'rag-session-1',
          text,
          channel: 'web-portal',
          context: {
            selected_document_ids: selectedDocIds.length > 0 ? selectedDocIds : 'all',
            documents_available: documents.length,
          },
        },
        bot_message: [
          {
            text: response.answer,
          },
        ],
        nlu: {
          entities,
          intent: {
            intent: detectedIntent,
            confidence: response.grounded ? intentConfidence : 0.65,
          },
        },
        context: {
          grounded: response.grounded,
          sources_count: response.sources?.length || 0,
          sources: response.sources || [],
          active_documents: documents.map((d) => d.filename),
          request_id: response.request_id,
        },
      });

      ragStateStore.addLog({
        query: text,
        intent: detectedIntent,
        confidence: response.grounded ? intentConfidence : 0.65,
        grounded: response.grounded,
        documentCount: documents.length,
        sourcesCount: response.sources?.length || 0,
        topSource: response.sources?.[0]?.filename,
        latencyMs,
        status: '200 OK',
        answerExcerpt: response.answer.slice(0, 160) + (response.answer.length > 160 ? '...' : ''),
      });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startTime);
      const errorText = err instanceof Error ? err.message : 'Unknown retrieval error occurred';
      const botMsg: MessageBubble = {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: `⚠️ <b>Document Retrieval Notice:</b><br/>Could not retrieve an answer from the uploaded documents. Reason: <i>${errorText}</i>.<br/><br/>Please make sure your backend server is running and your document is indexed.`,
        error: true,
        grounded: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      setCurrentState({
        thread_id: 'rag-session-1',
        user_message: {
          thread_id: 'rag-session-1',
          text,
          channel: 'web-portal',
          context: {
            error: errorText,
          },
        },
        bot_message: [
          {
            text: `Failed to answer from uploaded documents: ${errorText}`,
          },
        ],
        nlu: {
          entities: {},
          intent: {
            intent: 'document_qa_error',
            confidence: 0.0,
          },
        },
        context: {
          grounded: false,
          error: errorText,
          active_documents: documents.map((d) => d.filename),
        },
      });

      ragStateStore.addLog({
        query: text,
        intent: 'document_qa_error',
        confidence: 0.0,
        grounded: false,
        documentCount: documents.length,
        sourcesCount: 0,
        latencyMs,
        status: '500 Error',
        answerExcerpt: errorText,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 p-8 pt-6 overflow-y-auto">
      {/* Title Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Chat Interface</h1>
          <p className="text-sm text-gray-500 mt-1">
            Answers are generated strictly based on your uploaded documents
          </p>
        </div>

        {/* Document Status Pill & Quick Upload */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 hover:border-emerald-500 hover:text-emerald-700 text-gray-700 px-3 py-1.5 rounded-lg shadow-sm font-medium transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{uploading ? 'Indexing PDF...' : 'Upload PDF'}</span>
          </button>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              documents.length > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                documents.length > 0 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>
              {docsLoading
                ? 'Checking documents...'
                : documents.length > 0
                ? `${documents.length} Document${documents.length > 1 ? 's' : ''} Indexed`
                : 'No Documents Indexed'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Document Selector Bar (if documents exist) */}
      {documents.length > 0 && (
        <div className="mb-4 bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-gray-600 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="font-semibold text-gray-500 flex-shrink-0">Active Source:</span>
            <button
              onClick={() => setSelectedDocIds([])}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex-shrink-0 ${
                selectedDocIds.length === 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Documents ({documents.length})
            </button>
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.document_id);
              return (
                <button
                  key={doc.document_id}
                  onClick={() => {
                    setSelectedDocIds((prev) =>
                      prev.includes(doc.document_id)
                        ? prev.filter((id) => id !== doc.document_id)
                        : [...prev, doc.document_id]
                    );
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors truncate max-w-[200px] flex-shrink-0 ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={doc.filename}
                >
                  <FileText className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{doc.filename}</span>
                </button>
              );
            })}
          </div>

          {selectedDocIds.length > 0 && (
            <button
              onClick={() => setSelectedDocIds([])}
              className="text-gray-400 hover:text-gray-600 ml-2"
              title="Reset selection to all documents"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Two Column Layout matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Chat Window */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-[640px]">
          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                {documents.length > 0 ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                      Ready for Document Questions
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm mb-4">
                      Ask questions about your {documents.length} uploaded PDF document(s). Answers will
                      be formulated strictly using verified context from the text.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-md">
                      <button
                        onClick={() => {
                          setInputText('What are the key points discussed in the document?');
                        }}
                        className="text-xs bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        "What are the key points in this document?"
                      </button>
                      <button
                        onClick={() => {
                          setInputText('Can you summarize the main conclusions?');
                        }}
                        className="text-xs bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        "Summarize the main conclusions"
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                      <FileText className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                      No Documents Uploaded
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm mb-5">
                      To begin, upload one or more PDF files. The assistant will answer your queries
                      based solely on the uploaded documents.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Your First PDF</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#4379ee] text-white rounded-2xl'
                          : msg.error
                          ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl'
                          : 'bg-[#f1f3f5] text-gray-800 rounded-2xl'
                      }`}
                      dangerouslySetInnerHTML={{ __html: msg.text }}
                    />

                    {/* Sources Collapsible */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 max-w-[85%] w-full">
                        <button
                          onClick={() => toggleSourceView(msg.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {msg.sources.length} Verified Document Source
                            {msg.sources.length > 1 ? 's' : ''}
                          </span>
                          {expandedSources[msg.id] ? (
                            <ChevronUp className="w-3 h-3 ml-1" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-1" />
                          )}
                        </button>

                        {expandedSources[msg.id] && (
                          <div className="mt-1.5 space-y-1.5 bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs">
                            {msg.sources.map((src, i) => (
                              <div
                                key={src.chunk_id || i}
                                className="bg-white border border-gray-100 rounded-lg p-2 shadow-none"
                              >
                                <div className="flex items-center justify-between font-medium text-gray-800 mb-1">
                                  <span className="truncate flex items-center gap-1 text-emerald-800">
                                    <FileText className="w-3 h-3" />
                                    {src.filename} (Page {src.page_number})
                                  </span>
                                  <span className="text-[11px] text-gray-400 font-mono">
                                    {Math.round(src.similarity * 100)}% match
                                  </span>
                                </div>
                                <p className="text-gray-600 text-[11px] line-clamp-3 italic">
                                  "{src.excerpt}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                );
              })
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#f1f3f5] text-gray-500 rounded-2xl px-4 py-2.5 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Searching document context and generating answer...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom input bar */}
          <form onSubmit={handleSendMessage} className="mt-4 pt-3 flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                documents.length > 0
                  ? 'Ask a question about the uploaded documents...'
                  : 'Upload a document to ask questions...'
              }
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="bg-[#38a169] hover:bg-[#2f855a] disabled:opacity-50 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors shadow-none flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
            </button>
          </form>
        </div>

        {/* Right Column: Current State */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-[640px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Current State</h2>
            <span className="text-xs font-mono text-gray-400">
              {currentState.nlu.intent.intent}
            </span>
          </div>
          <div className="flex-1 overflow-auto bg-[#f8fafc] rounded-xl p-4 border border-gray-100/80">
            <pre className="font-mono text-xs text-gray-800 leading-relaxed whitespace-pre font-medium">
              {JSON.stringify(currentState, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
