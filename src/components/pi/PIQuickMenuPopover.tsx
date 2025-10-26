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
}

export function PIQuickMenuPopover({
  isOpen,
  onClose,
  title,
  headerRight,
  children,
  footer,
  width = 380,
}: PIQuickMenuPopoverProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{
          background: 'rgba(0, 0, 0, 0.20)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Popover */}
      <div
        className="fixed z-50 flex flex-col animate-in fade-in slide-in-from-bottom-2"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${width}px`,
          maxHeight: '600px',
          background: 'rgba(255, 255, 255, 0.70)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
          animationDuration: '180ms',
          animationTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            borderImage: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%) 1',
          }}
        >
          <div className="flex items-center gap-3 flex-1">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
              {title}
            </h3>
            {headerRight}
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            style={{
              color: '#64748B',
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
          }}
        >
          <div className="flex flex-col gap-2">
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-between px-4 py-3 border-t"
            style={{
              borderColor: 'rgba(17, 24, 39, 0.08)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
