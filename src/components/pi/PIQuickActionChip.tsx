import { Zap, Bookmark, Command } from 'lucide-react';

type QuickActionType = 'preset' | 'bookmark' | 'command';

interface PIQuickActionChipProps {
  type: QuickActionType;
  onClick?: () => void;
  disabled?: boolean;
}

export function PIQuickActionChip({ type, onClick, disabled = false }: PIQuickActionChipProps) {
  const config = {
    preset: {
      icon: Zap,
      label: '프리셋',
      ariaLabel: '프리셋 열기',
    },
    bookmark: {
      icon: Bookmark,
      label: '북마크',
      ariaLabel: '북마크 열기',
    },
    command: {
      icon: Command,
      label: '⌘K',
      ariaLabel: '커맨드 팔레트 열기',
    },
  };

  const { icon: Icon, label, ariaLabel } = config[type];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="group relative h-8 flex items-center gap-2 px-3 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
      style={{
        background: 'rgba(255, 255, 255, 0.70)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(17, 24, 39, 0.10)',
        transitionDuration: '120ms',
        transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)';
          e.currentTarget.style.borderColor = 'rgba(17, 24, 39, 0.16)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.70)';
          e.currentTarget.style.borderColor = 'rgba(17, 24, 39, 0.10)';
        }
      }}
    >
      <Icon 
        className="w-4 h-4 transition-colors" 
        style={{ 
          color: '#0F172A',
          strokeWidth: 2,
        }} 
      />
      <span 
        className="text-sm transition-colors"
        style={{
          color: '#0F172A',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </button>
  );
}
