import { CheckCircle2, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../base/tooltip';

export type ModelStatus = 'synced' | 'outdated' | 'loading' | 'error';

interface PIModelBadgeProps {
  status: ModelStatus;
  version?: string;
}

const statusConfig = {
  synced: {
    icon: CheckCircle2,
    label: '동기화됨',
    color: '#16A34A',
    bg: 'rgba(22, 163, 74, 0.08)',
  },
  outdated: {
    icon: AlertCircle,
    label: '업데이트 필요',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.08)',
  },
  loading: {
    icon: Loader2,
    label: '동기화 중',
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.08)',
  },
  error: {
    icon: XCircle,
    label: '오류',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.08)',
  },
};

export function PIModelBadge({ status, version }: PIModelBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-help"
            style={{
              background: config.bg,
              border: `1px solid ${config.color}40`,
            }}
          >
            <Icon 
              className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin' : ''}`}
              style={{ color: config.color }}
            />
            <span style={{ fontSize: '12px', fontWeight: 600, color: config.color }}>
              {config.label}
            </span>
            {version && (
              <>
                <div
                  className="w-[1px] h-3"
                  style={{ background: `${config.color}40` }}
                />
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', fontFamily: 'monospace' }}>
                  {version}
                </span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p style={{ fontSize: '11px' }}>자세한 정보는 하단 참조</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
