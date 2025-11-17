import React from 'react';
import { cn } from '../base/utils';

export type PIButtonVariant = 'primary' | 'secondary' | 'ghost' | 'primary-gradient' | 'outline-glass';
export type PIButtonSize = 'large' | 'medium' | 'small';

interface PIButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PIButtonVariant;
  size?: PIButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const variantStyles: Record<PIButtonVariant, Record<string, string>> = {
  primary: {
    background: 'var(--primary-500)',
    color: 'white',
    hover: 'var(--primary-600)',
  },
  'primary-gradient': {
    background: 'linear-gradient(to bottom right, #1D4ED8, #60A5FA)',
    color: 'white',
    hover: 'var(--glow)',
  },
  secondary: {
    background: 'var(--surface-2)',
    color: 'var(--text-primary)',
    hover: 'var(--surface-3)',
  },
  'outline-glass': {
    background: 'var(--surface-1)',
    color: 'var(--text-primary)',
    hover: 'var(--surface-2)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-primary)',
    hover: 'var(--surface-2)',
  },
};

const sizeStyles: Record<PIButtonSize, string> = {
  large: 'h-14 px-8 gap-3',
  medium: 'h-10 px-5 gap-2',
  small: 'h-8 px-3 gap-1.5',
};

export function PIButton({
  variant = 'primary',
  size = 'medium',
  icon,
  children,
  className,
  ...props
}: PIButtonProps) {
  const fontSize = size === 'large' ? '16px' : size === 'medium' ? '14px' : '12px';
  
  // variant가 유효하지 않은 경우 기본값 사용
  const actualVariant = variantStyles[variant] ? variant : 'primary';
  const variantStyle = variantStyles[actualVariant];
  
  if (!variantStyle) {
    console.error(`Invalid variant: ${variant}. Using 'primary' as fallback.`);
    return null;
  }
  
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-button)] transition-all duration-[var(--duration-base)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        'whitespace-nowrap',
        'active:scale-[0.98]',
        variant === 'primary-gradient' ? '' : '',
        sizeStyles[size],
        className
      )}
      style={{
        fontSize,
        background: variantStyle.background,
        color: variantStyle.color,
        border: actualVariant === 'outline-glass' ? '1px solid var(--border-primary)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (variantStyle.hover && !e.currentTarget.disabled) {
          e.currentTarget.style.background = actualVariant === 'primary-gradient' 
            ? 'linear-gradient(to bottom right, #1E40AF, #3B82F6)'
            : variantStyle.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!e.currentTarget.disabled) {
          e.currentTarget.style.background = variantStyle.background;
        }
      }}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
