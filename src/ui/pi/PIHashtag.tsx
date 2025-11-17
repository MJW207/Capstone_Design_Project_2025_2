import { cn } from '../base/utils';

export type HashtagColor = 
  | 'T1' | 'T2' | 'T3' | 'T4' 
  | 'T5' | 'T6' | 'T7' | 'T8' 
  | 'T9' | 'T10' | 'T11' | 'T12';

interface PIHashtagProps {
  color: HashtagColor;
  children: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const colorStyles: Record<HashtagColor, { bg: string; text: string; border: string }> = {
  T1: { 
    bg: 'rgba(37, 99, 235, 0.12)', 
    text: '#1D4ED8', 
    border: 'linear-gradient(180deg, rgba(37, 99, 235, 0.3) 0%, rgba(37, 99, 235, 0.1) 100%)' 
  },
  T2: { 
    bg: 'rgba(99, 102, 241, 0.12)', 
    text: '#4F46E5', 
    border: 'linear-gradient(180deg, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0.1) 100%)' 
  },
  T3: { 
    bg: 'rgba(6, 182, 212, 0.12)', 
    text: '#0891B2', 
    border: 'linear-gradient(180deg, rgba(6, 182, 212, 0.3) 0%, rgba(6, 182, 212, 0.1) 100%)' 
  },
  T4: { 
    bg: 'rgba(20, 184, 166, 0.12)', 
    text: '#0F766E', 
    border: 'linear-gradient(180deg, rgba(20, 184, 166, 0.3) 0%, rgba(20, 184, 166, 0.1) 100%)' 
  },
  T5: { 
    bg: 'rgba(22, 163, 74, 0.12)', 
    text: '#15803D', 
    border: 'linear-gradient(180deg, rgba(22, 163, 74, 0.3) 0%, rgba(22, 163, 74, 0.1) 100%)' 
  },
  T6: { 
    bg: 'rgba(101, 163, 13, 0.12)', 
    text: '#4D7C0F', 
    border: 'linear-gradient(180deg, rgba(101, 163, 13, 0.3) 0%, rgba(101, 163, 13, 0.1) 100%)' 
  },
  T7: { 
    bg: 'rgba(245, 158, 11, 0.12)', 
    text: '#D97706', 
    border: 'linear-gradient(180deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.1) 100%)' 
  },
  T8: { 
    bg: 'rgba(251, 146, 60, 0.12)', 
    text: '#EA580C', 
    border: 'linear-gradient(180deg, rgba(251, 146, 60, 0.3) 0%, rgba(251, 146, 60, 0.1) 100%)' 
  },
  T9: { 
    bg: 'rgba(239, 68, 68, 0.12)', 
    text: '#DC2626', 
    border: 'linear-gradient(180deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.1) 100%)' 
  },
  T10: { 
    bg: 'rgba(236, 72, 153, 0.12)', 
    text: '#DB2777', 
    border: 'linear-gradient(180deg, rgba(236, 72, 153, 0.3) 0%, rgba(236, 72, 153, 0.1) 100%)' 
  },
  T11: { 
    bg: 'rgba(124, 58, 237, 0.12)', 
    text: '#7C3AED', 
    border: 'linear-gradient(180deg, rgba(124, 58, 237, 0.3) 0%, rgba(124, 58, 237, 0.1) 100%)' 
  },
  T12: { 
    bg: 'rgba(71, 85, 105, 0.12)', 
    text: '#334155', 
    border: 'linear-gradient(180deg, rgba(71, 85, 105, 0.3) 0%, rgba(71, 85, 105, 0.1) 100%)' 
  },
};

export function PIHashtag({ color, children, onClick, disabled = false, className }: PIHashtagProps) {
  const style = colorStyles[color];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center h-7 px-2.5 rounded-full transition-all duration-[120ms] ease-[cubic-bezier(0.33,1,0.68,1)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]',
        className
      )}
      style={{
        background: style.bg,
        color: style.text,
        border: '1px solid transparent',
        backgroundImage: `linear-gradient(${style.bg}, ${style.bg}), ${style.border}`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          const currentBg = style.bg.replace('0.12', '0.16');
          e.currentTarget.style.backgroundImage = `linear-gradient(${currentBg}, ${currentBg}), ${style.border}`;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundImage = `linear-gradient(${style.bg}, ${style.bg}), ${style.border}`;
        }
      }}
    >
      <span style={{ fontSize: '12px', fontWeight: 500 }}>
        #{children}
      </span>
    </button>
  );
}

// Helper function to get color from tag name (consistent hashing)
export function getHashtagColor(tag: string): HashtagColor {
  const colors: HashtagColor[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}
