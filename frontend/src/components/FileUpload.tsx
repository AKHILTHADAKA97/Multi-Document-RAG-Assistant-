import { useState, useCallback, useRef } from 'react';
import { cn } from '@/utils/helpers';
import { Button } from './Button';
import { Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  loading?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export function FileUpload({
  onUpload,
  loading,
  maxFiles = 5,
  maxSizeMB = 20,
  acceptedTypes = ['application/pdf'],
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed. Only PDF files are accepted.`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit.`;
    }
    return null;
  }, [acceptedTypes, maxSizeMB]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const newErrors: Record<string, string> = {};
    const validFiles: File[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        newErrors[file.name] = error;
      } else if (files.length + validFiles.length < maxFiles) {
        validFiles.push(file);
      } else {
        newErrors[file.name] = `Maximum ${maxFiles} files allowed.`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, [files.length, maxFiles, validateFile]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[files[index]?.name || ''];
      return next;
    });
  }, [files]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (files.length === 0 || uploading || loading) return;

    setUploading(true);
    try {
      await onUpload(files);
      setFiles([]);
      setErrors({});
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [files, onUpload, uploading, loading]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }, [addFiles]);

  const canUpload = files.length > 0 && !uploading && !loading;

  return (
    <div className="w-full">
      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200',
          dragActive
            ? 'border-brand-500 bg-brand-50'
            : 'border-surface-300 hover:border-brand-400',
          (uploading || loading) && 'opacity-50 pointer-events-none'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading || loading || files.length >= maxFiles}
          aria-label="Upload PDF files"
        />

        <div className="relative z-10">
          <div className="mx-auto w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mb-4">
            <Upload className="h-6 w-6 text-surface-500" />
          </div>
          <p className="text-surface-900 font-medium mb-1">
            {dragActive ? 'Drop PDF files here' : 'Drag & drop PDF files, or click to browse'}
          </p>
          <p className="text-sm text-surface-500 mb-4">
            Up to {maxFiles} files, {maxSizeMB}MB each • PDF only
          </p>

          {files.length > 0 && (
            <div className="mt-4 space-y-2 max-h-48 overflow-auto scrollbar-thin">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-surface-200"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-surface-900 truncate">{file.name}</p>
                    <p className="text-xs text-surface-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {errors[file.name] && (
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" aria-label={errors[file.name]} />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1.5 text-surface-400 hover:text-surface-600 rounded transition-colors flex-shrink-0"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {Object.keys(errors).length > 0 && files.length === 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-sm font-medium text-red-800 mb-1">Some files were rejected:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {Object.entries(errors).map(([name, error]) => (
                  <li key={name} className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{name}: {error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={!canUpload}
            loading={uploading}
          >
            <Loader2 className="h-4 w-4" />
            Upload {files.length} file{files.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}