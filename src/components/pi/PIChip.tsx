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
      : 'bg-white border border-[var(--neutral-300)] text-[var(--primary-500)] hover:border-[var(--primary-500)]',
    tag: selected
      ? 'pi-glass border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10'
      : 'bg-[var(--neutral-100)] text-[var(--primary-500)] hover:bg-[var(--neutral-200)]',
    'tag-soft': selected
      ? 'bg-[var(--surface-glass-enhanced)] backdrop-blur-md border border-gradient-to-r from-[var(--accent-blue)]/30 to-[#7C3AED]/30 scale-[1.02]'
      : 'bg-[var(--surface-glass)] backdrop-blur-md border border-[var(--surface-glass-border-subtle)] hover:border-[var(--accent-blue)]/20',
    metric: 'bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue)]/80 text-white',
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
          className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
