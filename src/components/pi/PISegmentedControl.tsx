import React from 'react';
import { cn } from '../ui/utils';

interface PISegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function PISegmentedControl({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: PISegmentedControlProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center bg-[var(--neutral-100)] rounded-xl gap-1 relative',
        size === 'sm' ? 'p-0.5' : 'p-1',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg transition-all duration-[var(--duration-base)] relative',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
            value === option.value
              ? 'font-semibold text-[var(--primary-500)]'
              : 'text-[var(--neutral-600)] hover:text-[var(--primary-500)]'
          )}
        >
          {/* Glass Pill Indicator with Gradient Border */}
          {value === option.value && (
            <div 
              className="absolute inset-0 rounded-lg transition-all duration-[var(--duration-base)] -z-10"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                border: '1px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, rgba(29, 78, 216, 0.3), rgba(124, 58, 237, 0.3))',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
