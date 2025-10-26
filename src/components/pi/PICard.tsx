import React from 'react';
import { cn } from '../ui/utils';

export type PICardVariant = 'summary' | 'panel' | 'cluster' | 'summary-glow' | 'panel-glass';

interface PICardProps {
  variant?: PICardVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<PICardVariant, string> = {
  summary: 'bg-white border border-[var(--neutral-200)] rounded-[var(--radius-card)] p-5 pi-elevation-1 hover:pi-elevation-2 transition-shadow',
  'summary-glow': 'bg-gradient-to-br from-white to-[var(--neutral-50)] border border-[var(--neutral-200)] rounded-[var(--radius-card)] p-5 pi-elevation-2 relative overflow-hidden',
  panel: 'bg-white border border-[var(--neutral-200)] rounded-[var(--radius-card)] p-4 pi-elevation-1 hover:border-[var(--accent-blue)] hover:-translate-y-0.5 transition-all duration-[var(--duration-base)] cursor-pointer',
  'panel-glass': 'pi-glass-enhanced rounded-[var(--radius-card)] p-4 pi-elevation-1 hover:border-[var(--accent-blue)]/50 hover:-translate-y-0.5 transition-all duration-[var(--duration-base)] cursor-pointer',
  cluster: 'bg-gradient-to-br from-white to-[var(--neutral-50)] border border-[var(--neutral-200)] rounded-[var(--radius-card)] p-5 pi-elevation-2',
};

export function PICard({ variant = 'summary', children, className, onClick }: PICardProps) {
  return (
    <div
      className={cn(variantStyles[variant], className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
