import { useState } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { useToast } from '@/components/Toast';
import { DocumentCard } from '@/components/DocumentCard';
import { FileUpload } from '@/components/FileUpload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/Card';
import { Button } from '@/components/Button';
import { Loader2, RefreshCw } from 'lucide-react';

export function DocumentsPage() {
  const { documents, total, loading, error, upload, remove, retry, refresh } = useDocuments();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    try {
      await upload(files);
      showToast({ type: 'success', title: 'Upload successful', message: `${files.length} file(s) uploaded` });
    } catch (err) {
      showToast({ type: 'error', title: 'Upload failed', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setUploading(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 mb-2">Documents</h1>
        <p className="text-surface-500">Manage your uploaded PDF documents</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Documents
              </CardTitle>
              <CardDescription>Upload PDF files to add them to your knowledge base</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload onUpload={handleUpload} loading={uploading} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Your Documents</CardTitle>
                <CardDescription>{total} document{total !== 1 ? 's' : ''} in total</CardDescription>
              </div>
              <Button variant="secondary" size="sm" onClick={refresh} loading={loading}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-3" />
                  <p className="text-surface-500">Loading documents...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <svg className="h-12 w-12 text-red-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-red-600 font-medium mb-1">Failed to load documents</p>
                  <p className="text-sm text-surface-500 mb-4">{error}</p>
                  <Button variant="primary" size="sm" onClick={refresh}>
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-12 text-center">
                  <svg className="h-16 w-16 text-surface-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-surface-500 mb-4">No documents yet</p>
                  <p className="text-sm text-surface-400 mb-6">Upload your first PDF to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-200">
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc.document_id}
                      document={doc}
                      onDelete={handleDelete}
                      onRetry={handleRetry}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}