import { Pin, Eye } from 'lucide-react';

type BadgeType = 'coverage' | 'cluster' | 'pinned';

interface PISheetBadgeProps {
  type: BadgeType;
  value?: string;
  isPinned?: boolean;
}

export function PISheetBadge({ type, value, isPinned = false }: PISheetBadgeProps) {
  if (type === 'coverage') {
    const isQuickpoll = value === 'Q+W';
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          background: isQuickpoll ? 'rgba(22, 163, 74, 0.1)' : 'rgba(100, 116, 139, 0.1)',
          color: isQuickpoll ? '#16A34A' : '#64748B',
          border: `1px solid ${isQuickpoll ? 'rgba(22, 163, 74, 0.2)' : 'rgba(100, 116, 139, 0.2)'}`,
        }}
      >
        {value}
      </span>
    );
  }

  if (type === 'cluster') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          background: 'rgba(37, 99, 235, 0.1)',
          color: '#2563EB',
          border: '1px solid rgba(37, 99, 235, 0.2)',
        }}
      >
        {value}
      </span>
    );
  }

  if (type === 'pinned' && isPinned) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          background: 'rgba(37, 99, 235, 0.1)',
          color: '#2563EB',
          border: '1px solid rgba(37, 99, 235, 0.2)',
        }}
      >
        <Pin className="w-3 h-3" style={{ fill: '#2563EB' }} />
        고정됨
      </span>
    );
  }

  return null;
}
