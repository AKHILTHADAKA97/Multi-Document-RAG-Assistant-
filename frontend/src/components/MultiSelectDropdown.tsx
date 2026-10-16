import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/utils/helpers';
import { Check, ChevronDown, X } from 'lucide-react';
import type { Document } from '@/types';

interface MultiSelectDropdownProps {
  options: Document[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDisplay?: number;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = 'Select documents...',
  disabled = false,
  maxDisplay = 3,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = useCallback(() => {
    if (!disabled) setOpen((prev) => !prev);
  }, [disabled]);

  const handleSelect = useCallback(
    (id: string) => {
      onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    },
    [selected, onChange]
  );

  const handleClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const displayText = selected.length === 0
    ? placeholder
    : selected.length <= maxDisplay
    ? options.filter((o) => selected.includes(o.document_id)).map((o) => o.filename).join(', ')
    : `${selected.length} documents selected`;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2.5 text-sm text-left transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          disabled
            ? 'border-surface-200 text-surface-400 cursor-not-allowed'
            : 'border-surface-300 hover:border-brand-400 focus:border-brand-500',
          open && 'border-brand-500 ring-2 ring-brand-500/20'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={cn('truncate', selected.length > 0 ? 'text-surface-900' : 'text-surface-400')}>
          {displayText}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-surface-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-10 mt-1.5 w-full max-h-60 overflow-auto rounded-lg border border-surface-200 bg-white shadow-lg scrollbar-thin">
          {options.length === 0 ? (
            <p className="px-3 py-4 text-sm text-surface-500 text-center">No documents available</p>
          ) : (
            <>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 border-b border-surface-100"
                >
                  <span>Clear all</span>
                  <X className="h-4 w-4" />
                </button>
              )}
              <ul role="listbox" aria-multiselectable="true">
                {options.map((option) => (
                  <li key={option.document_id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected.includes(option.document_id)}
                      onClick={() => handleSelect(option.document_id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors',
                        'hover:bg-surface-50 focus:outline-none focus:bg-surface-50',
                        selected.includes(option.document_id) && 'bg-brand-50 text-brand-700'
                      )}
                    >
                      <div className="flex-1 min-w-0 truncate">{option.filename}</div>
                      {selected.includes(option.document_id) && (
                        <Check className="h-4 w-4 text-brand-600 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}