import { useState } from 'react';
import { formatRelativeTime, cn } from '@/utils/helpers';
import { Badge } from './Badge';
import { Card, CardContent } from './Card';
import { FileText, Copy, ChevronDown } from 'lucide-react';
import type { SourceReference } from '@/types';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceReference[];
  grounded?: boolean;
  timestamp: Date;
  error?: boolean;
  onToggleSource?: (chunkId: string) => void;
  showSource?: boolean;
}

export function ChatMessage({ role, content, sources, grounded, timestamp, error, onToggleSource, showSource }: ChatMessageProps) {
  const isUser = role === 'user';

  if (error) {
    return (
      <div className="flex justify-start">
        <Card variant="outlined" className="max-w-[85%] border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-700 text-sm">{content}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3 animate-in', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%]', isUser ? 'flex flex-col items-end' : '')}>
        <Card
          variant={isUser ? 'default' : 'outlined'}
          className={cn(
            isUser ? 'bg-brand-600 border-brand-600' : 'bg-white border-surface-200'
          )}
        >
          <CardContent className="p-4">
            <p className={cn('text-sm whitespace-pre-wrap', isUser ? 'text-white' : 'text-surface-900')}>
              {content}
            </p>

            {grounded !== undefined && !isUser && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={grounded ? 'success' : 'warning'} size="sm">
                  {grounded ? 'Grounded' : 'Not Grounded'}
                </Badge>
              </div>
            )}

            {sources && sources.length > 0 && !isUser && (
              <SourcesPanel sources={sources} onToggleSource={onToggleSource} showSource={showSource} />
            )}
          </CardContent>
        </Card>

        <p className={cn('mt-1 text-xs text-surface-400', isUser ? 'text-right' : '')}>
          {formatRelativeTime(timestamp.toISOString())}
        </p>
      </div>
    </div>
  );
}

function SourcesPanel({ sources, onToggleSource, showSource }: { sources: SourceReference[]; onToggleSource?: (chunkId: string) => void; showSource?: boolean }) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());
  const shouldShow = showSource === true;

  return (
    <div className="mt-4 border-t border-surface-200 pt-4" data-testid="sources-panel">
      <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-3">
        Sources ({sources.length})
      </p>
      <div className="space-y-3">
        {sources.map((source, index) => (
          <SourceItem
            key={source.chunk_id}
            source={source}
            isOpen={openIndices.has(index) || (shouldShow && index === 0)}
            onToggle={() => {
              setOpenIndices((prev) => {
                const next = new Set(prev);
                if (next.has(index)) next.delete(index);
                else next.add(index);
                return next;
              });
              onToggleSource?.(source.chunk_id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SourceItem({
  source,
  isOpen,
  onToggle,
}: {
  source: SourceReference;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-surface-200 bg-surface-50 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-surface-100 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="h-4 w-4 text-surface-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-900 truncate">{source.filename}</p>
            <p className="text-xs text-surface-500">
              Page {source.page_number} • {Math.round(source.similarity * 100)}% match
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-surface-200 bg-white p-3 animate-in">
          <div className="flex items-start gap-2">
            <pre className="flex-1 text-xs text-surface-700 bg-surface-100 rounded p-3 whitespace-pre-wrap font-mono max-h-40 overflow-auto">
              {source.excerpt}
            </pre>
            <div className="flex flex-col gap-1">
              <button
                className="p-1.5 text-surface-400 hover:text-surface-600 rounded transition-colors"
                aria-label="Copy excerpt"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}