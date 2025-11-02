import { Star } from 'lucide-react';
import { motion } from 'motion/react';

interface PIBookmarkButtonProps {
  onClick: () => void;
  bookmarkCount?: number;
  variant?: 'default' | 'chip'; // chip variant는 QuickActionChip과 같은 스타일
}

export function PIBookmarkButton({ onClick, bookmarkCount = 0, variant = 'default' }: PIBookmarkButtonProps) {
  if (variant === 'chip') {
    // QuickActionChip과 동일한 스타일
    return (
      <button
        onClick={onClick}
        aria-label="북마크 열기"
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
        <Star
          className="w-4 h-4 transition-colors"
          style={{
            color: 'var(--text-primary)',
            strokeWidth: 2,
            fill: bookmarkCount > 0 ? '#F59E0B' : 'none',
          }}
        />
        <span
          className="text-sm transition-colors"
          style={{
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}
        >
          북마크
          {bookmarkCount > 0 && (
            <span
              style={{
                marginLeft: '4px',
                padding: '1px 4px',
                borderRadius: '999px',
                background: '#F59E0B',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              {bookmarkCount}
            </span>
          )}
        </span>
      </button>
    );
  }

  // 기본 버튼 스타일 (검색 화면용) - 통합된 디자인 (borderless)
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="h-full"
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        background: 'transparent',
        color: 'var(--text-secondary)',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        position: 'relative',
        transition: 'all 150ms ease',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      title="북마크한 패널 보기"
    >
      <Star size={14} fill="#F59E0B" stroke="#F59E0B" />
      북마크
      {bookmarkCount > 0 && (
        <span
          style={{
            padding: '2px 5px',
            borderRadius: '999px',
            background: '#F59E0B',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
          }}
        >
          {bookmarkCount}
        </span>
      )}
    </motion.button>
  );
}
