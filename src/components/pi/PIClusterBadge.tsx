import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export type ClusterType = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'Noise' | 'Unknown';

interface PIClusterBadgeProps {
  type: ClusterType;
  probability?: number;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

const clusterConfig = {
  C1: { color: '#2563EB', label: 'C1' },
  C2: { color: '#16A34A', label: 'C2' },
  C3: { color: '#F59E0B', label: 'C3' },
  C4: { color: '#EF4444', label: 'C4' },
  C5: { color: '#8B5CF6', label: 'C5' },
  Noise: { color: '#94A3B8', label: 'Noise' },
  Unknown: { color: '#64748B', label: 'Unknown' },
};

export function PIClusterBadge({ type, probability, size = 'md', showTooltip = true }: PIClusterBadgeProps) {
  const config = clusterConfig[type];
  const isSmall = size === 'sm';

  const badge = (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all duration-150 hover:opacity-90"
      style={{
        background: `${config.color}15`,
        border: `1px solid ${config.color}40`,
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 600,
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: config.color }}
      />
      <span style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  );

  if (!showTooltip) return badge;

  const tooltipContent = type === 'Noise' 
    ? '어느 그룹에도 속하지 않음 (노이즈) — 해석 주의'
    : type === 'Unknown'
    ? 'Quickpoll 응답 필요'
    : probability
    ? `소속 확률: ${(probability * 100).toFixed(0)}%`
    : config.label;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p style={{ fontSize: '11px' }}>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
