import React from 'react';
import { cn } from '../base/utils';

export type PICardVariant = 'summary' | 'panel' | 'cluster' | 'summary-glow' | 'panel-glass';

interface PICardProps {
  variant?: PICardVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<PICardVariant, string> = {
  summary: 'border rounded-[var(--radius-card)] p-5 pi-elevation-1 hover:pi-elevation-2 transition-shadow',
  'summary-glow': 'border rounded-[var(--radius-card)] p-5 pi-elevation-2 relative overflow-hidden',
  panel: 'border rounded-[var(--radius-card)] p-4 pi-elevation-1 hover:border-[var(--brand-blue-500)] hover:-translate-y-0.5 transition-all duration-[var(--duration-base)] cursor-pointer',
  'panel-glass': 'pi-glass-enhanced rounded-[var(--radius-card)] p-4 pi-elevation-1 hover:border-[var(--brand-blue-500)] hover:-translate-y-0.5 transition-all duration-[var(--duration-base)] cursor-pointer',
  cluster: 'border rounded-[var(--radius-card)] p-5 pi-elevation-2',
};

export function PICard({ variant = 'summary', children, className, onClick }: PICardProps) {
  // 다크 모드를 위한 동적 스타일
  const getCardStyle = () => {
    const baseStyle: React.CSSProperties = {
      background: 'var(--surface-1)',
      borderColor: 'var(--border-primary)',
      color: 'var(--text-secondary)',
    };

    if (variant === 'summary-glow') {
      return {
        ...baseStyle,
        background: 'var(--surface-1)',
      };
    }
    
    if (variant === 'cluster') {
      return {
        ...baseStyle,
        background: 'var(--surface-1)',
      };
    }

    return baseStyle;
  };

  return (
    <div
      className={cn(variantStyles[variant], className)}
      style={getCardStyle()}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
