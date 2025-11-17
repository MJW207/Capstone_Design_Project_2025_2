import { cn } from '../base/utils';

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
        'inline-flex items-center rounded-xl gap-1 relative',
        size === 'sm' ? 'p-0.5' : 'p-1',
        className
      )}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-primary)',
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg transition-all duration-[var(--duration-base)] relative',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
            value === option.value
              ? 'font-semibold'
              : ''
          )}
          style={{
            color: value === option.value ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {/* Glass Pill Indicator with Gradient Border */}
          {value === option.value && (
            <div 
              className="absolute inset-0 rounded-lg transition-all duration-[var(--duration-base)] -z-10"
              style={{
                background: 'var(--surface-1)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-primary)',
                boxShadow: 'var(--shadow-1)',
              }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
