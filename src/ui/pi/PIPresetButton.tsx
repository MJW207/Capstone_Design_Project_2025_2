import { FolderOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface PIPresetButtonProps {
  onClick: () => void;
  presetCount?: number;
  variant?: 'default' | 'chip';
}

export function PIPresetButton({ onClick, presetCount = 0, variant = 'default' }: PIPresetButtonProps) {
  if (variant === 'chip') {
    // QuickActionChip과 동일한 스타일
    return (
      <button
        onClick={onClick}
        aria-label="프리셋 열기"
        className="group relative h-8 flex items-center gap-2 px-3 rounded-full transition-all active:scale-[0.98]"
        style={{
          background: 'var(--surface-2)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-primary)',
          transitionDuration: '120ms',
          transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface-3)';
          e.currentTarget.style.borderColor = 'var(--border-accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--surface-2)';
          e.currentTarget.style.borderColor = 'var(--border-primary)';
        }}
      >
        <FolderOpen
          className="w-4 h-4 transition-colors"
          style={{
            color: 'var(--text-primary)',
            strokeWidth: 2,
          }}
        />
        <span
          className="text-sm transition-colors"
          style={{
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}
        >
          프리셋
          {presetCount > 0 && (
            <span
              style={{
                marginLeft: '4px',
                padding: '1px 4px',
                borderRadius: '999px',
                background: 'var(--primary-500)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              {presetCount}
            </span>
          )}
        </span>
      </button>
    );
  }

  // 기본 버튼 스타일 (검색 화면용)
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        background: 'white',
        color: '#374151',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        position: 'relative',
      }}
      title="프리셋 불러오기"
    >
      <FolderOpen size={14} />
      프리셋
      {presetCount > 0 && (
        <span
          style={{
            padding: '2px 5px',
            borderRadius: '999px',
            background: '#3B82F6',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
          }}
        >
          {presetCount}
        </span>
      )}
    </motion.button>
  );
}

