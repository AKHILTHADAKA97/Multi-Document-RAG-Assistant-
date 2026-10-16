import { useState, useContext, useRef, ReactNode, createContext } from 'react';
import { cn } from '@/utils/helpers';
import { ChevronLeft, ChevronRight, BookOpen, Github, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useDocuments } from '@/hooks/useDocuments';
import { useToast } from '@/components/Toast';
import { Loader2 } from 'lucide-react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const toggleSidebar = () => setIsCollapsed(prev => !prev);
  
  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  
  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] bg-white border-r border-surface-200 transition-all duration-300 flex flex-col',
          isCollapsed ? 'w-16' : 'w-72'
        )}
        aria-label="Sidebar"
      >
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <nav className="space-y-2" aria-label="Document navigation">
              <div className="flex items-center gap-2 px-2 py-2">
                <BookOpen className="h-5 w-5 text-brand-600 flex-shrink-0" />
                <span className="font-semibold text-surface-900">Documents</span>
              </div>
              <DocumentManagerSidebar />
            </nav>
          </div>
        )}

        <div className="p-3 border-t border-surface-200">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2 flex-1">
                <BookOpen className="h-5 w-5 text-brand-600" />
                <span className="font-medium text-surface-900">RAG Assistant</span>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          </div>
          
          {!isCollapsed && (
            <div className="mt-4 space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-surface-600 hover:bg-surface-100 hover:text-surface-900 transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              </button>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-surface-600 hover:bg-surface-100 hover:text-surface-900 transition-colors"
              >
                <Github className="h-5 w-5" />
                <span>View on GitHub</span>
              </a>
            </div>
          )}
        </div>
      </aside>

      <div
        className={cn(
          'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-1 bg-surface-200 transition-all duration-300',
          isCollapsed ? 'left-16' : 'left-72'
        )}
        onClick={toggleSidebar}
        aria-hidden="true"
      />
    </>
  );
}

function DocumentManagerSidebar() {
  const { documents, total, loading, error, upload, remove, retry, refresh } = useDocuments();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    try {
      await upload(files);
      showToast({ type: 'success', title: 'Upload successful', message: `${files.length} file(s) uploaded` });
    } catch (err) {
      showToast({ type: 'error', title: 'Upload failed', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setUploading(false);
      setFileInputKey(prev => prev + 1);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;
    try {
      await remove(id);
      showToast({ type: 'success', title: 'Document deleted' });
    } catch (err) {
      showToast({ type: 'error', title: 'Delete failed', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await retry(id);
      showToast({ type: 'success', title: 'Retry started', message: 'Document is being reprocessed' });
    } catch (err) {
      showToast({ type: 'error', title: 'Retry failed', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200 cursor-pointer',
          dragActive
            ? 'border-brand-500 bg-brand-50'
            : 'border-surface-300 hover:border-brand-400',
          uploading && 'opacity-50 pointer-events-none'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          key={fileInputKey}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
          aria-label="Upload PDF files"
        />
        <div className="relative z-10">
          <div className="mx-auto w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center mb-3">
            <svg className="h-5 w-5 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-medium text-surface-900 mb-1">
            {dragActive ? 'Drop PDF files here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-surface-500">PDF only • Up to 20MB each</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          <span className="ml-2 text-sm text-surface-500">Loading...</span>
        </div>
      ) : error ? (
        <div className="p-4 text-center">
          <svg className="h-8 w-8 text-red-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-red-600 font-medium mb-1">Failed to load</p>
          <p className="text-xs text-surface-500 mb-3">{error}</p>
          <button
            onClick={refresh}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            Try Again
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div className="py-8 text-center">
          <svg className="h-12 w-12 text-surface-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-surface-500 mb-2">No documents yet</p>
          <p className="text-xs text-surface-400">Upload your first PDF to get started</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
          {documents.map((doc) => (
            <DocumentSidebarItem
              key={doc.document_id}
              document={doc}
              onDelete={handleDelete}
              onRetry={handleRetry}
            />
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-surface-200">
        <p className="text-xs text-surface-500 text-center">
          {total} document{total !== 1 ? 's' : ''} total
        </p>
      </div>
    </div>
  );
}

function DocumentSidebarItem({
  document,
  onDelete,
  onRetry,
}: {
  document: any;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const statusColors: Record<string, string> = {
    ready: 'bg-green-50 text-green-700 border-green-100',
    processing: 'bg-brand-50 text-brand-700 border-brand-100',
    extracting: 'bg-brand-50 text-brand-700 border-brand-100',
    chunking: 'bg-brand-50 text-brand-700 border-brand-100',
    embedding: 'bg-brand-50 text-brand-700 border-brand-100',
    indexing: 'bg-brand-50 text-brand-700 border-brand-100',
    uploaded: 'bg-amber-50 text-amber-700 border-amber-100',
    failed: 'bg-red-50 text-red-700 border-red-100',
    deleted: 'bg-red-50 text-red-700 border-red-100',
  };

  const statusLabels: Record<string, string> = {
    ready: 'Ready',
    processing: 'Processing',
    extracting: 'Extracting',
    chunking: 'Chunking',
    embedding: 'Embedding',
    indexing: 'Indexing',
    uploaded: 'Uploaded',
    failed: 'Failed',
    deleted: 'Deleted',
  };

  const isProcessing = ['processing', 'extracting', 'chunking', 'embedding', 'indexing'].includes(document.status);

  return (
    <div className="rounded-lg border border-surface-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900 truncate">{document.filename}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[document.status] || statusColors.ready}`}>
                {isProcessing && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                {statusLabels[document.status] || document.status}
              </span>
              {document.page_count !== null && (
                <span className="text-xs text-surface-500">{document.page_count} pages</span>
              )}
              <span className="text-xs text-surface-500">{document.chunk_count} chunks</span>
            </div>
            {document.error_message && (
              <p className="mt-2 text-xs text-red-600 truncate">{document.error_message}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          {document.status === 'failed' && (
            <button
              onClick={() => onRetry(document.document_id)}
              className="px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded transition-colors"
              disabled={isProcessing}
            >
              Retry
            </button>
          )}
          <button
            onClick={() => onDelete(document.document_id)}
            className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
            disabled={isProcessing}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}