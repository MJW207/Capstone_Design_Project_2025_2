import React from 'react';
import { cn } from '../ui/utils';

export type PIBadgeKind = 'coverage-qw' | 'coverage-w' | 'cluster' | 'new' | 'info';
export type PIBadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent' | 'secondary' | 'outline';
export type PIBadgeSize = 'sm' | 'md';

interface PIBadgeProps {
  kind?: PIBadgeKind;
  variant?: PIBadgeVariant;
  size?: PIBadgeSize;
  children: React.ReactNode;
  className?: string;
}

const kindStyles: Record<PIBadgeKind, string> = {
  'coverage-qw': 'bg-[var(--accent-blue)] text-white',
  'coverage-w': 'bg-[var(--accent-amber)] text-white',
  cluster: 'bg-gradient-to-r from-[var(--accent-blue)] to-[#8B5CF6] text-white',
  new: 'bg-[var(--accent-green)] text-white',
  info: 'bg-[var(--neutral-200)] text-[var(--primary-500)]',
};

const variantStyles: Record<PIBadgeVariant, string> = {
  default: 'bg-[var(--neutral-100)] text-[var(--neutral-600)] border-[var(--neutral-200)]',
  success: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20',
  warning: 'bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] border-[var(--accent-amber)]/20',
  error: 'bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-[var(--accent-red)]/20',
  info: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20',
  accent: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20',
  secondary: 'bg-[var(--neutral-100)] text-[var(--neutral-600)] border-[var(--neutral-200)]',
  outline: 'bg-white/50 text-[var(--neutral-600)] border-[var(--neutral-200)]',
};

const sizeStyles: Record<PIBadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
};

export function PIBadge({ kind, variant, size = 'md', children, className }: PIBadgeProps) {
  // Use kind if provided (legacy), otherwise use variant
  const style = kind ? kindStyles[kind] : (variant ? variantStyles[variant] : variantStyles.default);
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        style,
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}
