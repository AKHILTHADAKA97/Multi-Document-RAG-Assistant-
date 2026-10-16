import { formatFileSize, formatRelativeTime, getStatusColor, getStatusLabel } from '@/utils/helpers';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card, CardContent, CardFooter } from './Card';
import { Trash2, RefreshCw, FileText, Loader2 } from 'lucide-react';
import type { Document } from '@/types';

interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  deleting?: boolean;
  retrying?: boolean;
}

export function DocumentCard({ document, onDelete, onRetry, deleting, retrying }: DocumentCardProps) {
  const statusColor = getStatusColor(document.status);
  const statusLabel = getStatusLabel(document.status);
  const isProcessing = ['processing', 'extracting', 'chunking', 'embedding', 'indexing'].includes(document.status);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-surface-100 flex items-center justify-center">
            <FileText className="h-6 w-6 text-surface-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-surface-900 truncate">{document.filename}</h3>
              <Badge variant={statusColor as any}>{statusLabel}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-surface-500">
              <span>{formatFileSize(document.file_size_bytes)}</span>
              {document.page_count !== null && <span>{document.page_count} pages</span>}
              <span>{document.chunk_count} chunks</span>
              <span>{formatRelativeTime(document.created_at)}</span>
            </div>
            {document.error_message && (
              <p className="mt-2 text-sm text-red-600 truncate">{document.error_message}</p>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="mt-4 flex items-center gap-2 text-sm text-brand-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing document...</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {document.status === 'failed' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRetry(document.document_id)}
              disabled={retrying}
              loading={retrying}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(document.document_id)}
            disabled={deleting}
            loading={deleting}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}