import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../ui/utils';

export type PIChipType = 'filter' | 'tag' | 'metric' | 'tag-soft';

interface PIChipProps {
  type?: PIChipType;
  selected?: boolean;
  disabled?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function PIChip({
  type = 'tag',
  selected = false,
  disabled = false,
  onRemove,
  onClick,
  children,
  className,
}: PIChipProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-chip)] transition-all duration-[var(--duration-fast)] text-sm';
  
  const typeStyles = {
    filter: selected
      ? 'bg-[var(--primary-500)] text-white border border-[var(--primary-500)]'
      : 'bg-[var(--surface-2)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-accent)]',
    tag: selected
      ? 'bg-[rgba(37,99,235,0.15)] border border-[rgba(37,99,235,0.3)] text-[var(--brand-blue-300)]'
      : 'bg-[var(--surface-2)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:border-[var(--border-accent)]',
    'tag-soft': selected
      ? 'bg-[rgba(37,99,235,0.1)] backdrop-blur-md border border-[rgba(37,99,235,0.3)] scale-[1.02] text-[var(--brand-blue-300)]'
      : 'bg-[var(--surface-2)] backdrop-blur-md border border-[var(--border-primary)] hover:border-[rgba(37,99,235,0.2)] text-[var(--text-secondary)]',
    metric: 'bg-gradient-to-r from-[var(--brand-blue-500)] to-[var(--brand-purple-600)] text-white',
  };

  return (
    <span
      className={cn(
        baseStyles,
        typeStyles[type],
        disabled && 'opacity-50 pointer-events-none',
        (onClick || onRemove) && 'cursor-pointer',
        selected && 'scale-105',
        className
      )}
      onClick={onClick}
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-[rgba(255,255,255,0.1)] rounded-full p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
