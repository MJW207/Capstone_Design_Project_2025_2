import React from 'react';
import { cn } from '../ui/utils';

export type PIButtonVariant = 'primary' | 'secondary' | 'ghost' | 'primary-gradient' | 'outline-glass';
export type PIButtonSize = 'large' | 'medium' | 'small';

interface PIButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PIButtonVariant;
  size?: PIButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const variantStyles: Record<PIButtonVariant, string> = {
  primary: 'bg-[var(--primary-500)] text-white hover:bg-[var(--primary-600)] active:scale-[0.98]',
  'primary-gradient': 'bg-gradient-to-br from-[#1D4ED8] to-[#60A5FA] text-white hover:shadow-[var(--glow)] active:scale-[0.98]',
  secondary: 'bg-[var(--neutral-100)] text-[var(--primary-500)] hover:bg-[var(--neutral-200)] active:scale-[0.98]',
  'outline-glass': 'pi-glass hover:bg-white/80 active:scale-[0.98]',
  ghost: 'bg-transparent hover:bg-[var(--neutral-100)] active:scale-[0.98]',
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
  
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-button)] transition-all duration-[var(--duration-base)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        'whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      style={{ fontSize }}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
