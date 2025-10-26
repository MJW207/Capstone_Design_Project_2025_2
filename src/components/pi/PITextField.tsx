import React from 'react';
import { cn } from '../ui/utils';

interface PITextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcons?: React.ReactNode[];
  large?: boolean;
}

export function PITextField({
  label,
  helperText,
  error,
  leadingIcon,
  trailingIcons,
  large = false,
  className,
  ...props
}: PITextFieldProps) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-[var(--primary-500)]">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leadingIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-600)]">
            {leadingIcon}
          </div>
        )}
        
        <input
          className={cn(
            'w-full rounded-xl border bg-[var(--neutral-50)] px-4 transition-all duration-[var(--duration-base)]',
            'placeholder:text-[var(--neutral-600)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)]',
            error && 'border-[var(--accent-red)] focus:ring-[var(--accent-red)]',
            !error && 'border-[var(--neutral-200)]',
            leadingIcon && 'pl-10',
            trailingIcons && trailingIcons.length > 0 && 'pr-24',
            large ? 'h-14 text-base' : 'h-10 text-sm',
            className
          )}
          {...props}
        />
        
        {trailingIcons && trailingIcons.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {trailingIcons.map((icon, index) => (
              <button
                key={index}
                type="button"
                className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors"
              >
                {icon}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {(helperText || error) && (
        <p className={cn(
          'text-xs',
          error ? 'text-[var(--accent-red)]' : 'text-[var(--neutral-600)]'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}
