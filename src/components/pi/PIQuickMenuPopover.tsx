import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface PIQuickMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  anchorPosition?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function PIQuickMenuPopover({
  isOpen,
  onClose,
  title,
  headerRight,
  children,
  footer,
  width = 380,
  anchorPosition = 'center',
}: PIQuickMenuPopoverProps) {
  if (!isOpen) return null;

  // Position styles based on anchorPosition
  const getPositionStyles = () => {
    switch (anchorPosition) {
      case 'bottom-right':
        return {
          position: 'absolute' as const,
          top: 'calc(100% + 8px)',
          right: 0,
          transform: 'none',
        };
      case 'bottom-left':
        return {
          position: 'absolute' as const,
          top: 'calc(100% + 8px)',
          left: 0,
          transform: 'none',
        };
      case 'top-right':
        return {
          position: 'absolute' as const,
          bottom: 'calc(100% + 8px)',
          right: 0,
          transform: 'none',
        };
      case 'top-left':
        return {
          position: 'absolute' as const,
          bottom: 'calc(100% + 8px)',
          left: 0,
          transform: 'none',
        };
      default: // center
        return {
          position: 'fixed' as const,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  const positionStyles = getPositionStyles();

  return (
    <>
      {/* Backdrop - only show for center positioning */}
      {anchorPosition === 'center' && (
        <div
          className="fixed inset-0 z-50 modal-backdrop"
          onClick={onClose}
        />
      )}

      {/* Popover */}
      <div
        className={`${anchorPosition === 'center' ? 'fixed' : ''} z-50 flex flex-col animate-in fade-in slide-in-from-bottom-2 modal-content`}
        style={{
          ...positionStyles,
          width: `${width}px`,
          maxWidth: anchorPosition !== 'center' ? 'calc(100vw - 32px)' : 'calc(100vw - 32px)',
          maxHeight: '600px',
          background: 'var(--surface-1)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-primary)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-2)',
          animationDuration: '180ms',
          animationTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
          color: 'var(--text-secondary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b drawer-header"
          style={{
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="flex items-center gap-3 flex-1">
            <h3 
              style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                color: 'var(--text-primary)' 
              }}
            >
              {title}
            </h3>
            {headerRight}
          </div>
          <button
            onClick={onClose}
            className="btn--ghost w-6 h-6 flex items-center justify-center rounded-lg transition-fast"
            style={{
              color: 'var(--muted-foreground)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div 
          className="flex-1 overflow-y-auto p-3"
          style={{
            maxHeight: '360px',
            background: 'var(--surface-1)',
          }}
        >
          <div className="flex flex-col gap-2">
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div 
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{
              borderColor: 'var(--border-primary)',
              background: 'var(--bg-0)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
