'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StyledSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function StyledSelect({ value, onChange, options, placeholder, className, disabled }: StyledSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm',
          'hover:bg-muted transition-colors disabled:opacity-50',
          className
        )}
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected?.label || placeholder || 'Seleccionar...'}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-xl max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors text-left',
                option.value === value
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              )}
            >
              <span className="flex-1">{option.label}</span>
              {option.value === value && <Check className="size-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
