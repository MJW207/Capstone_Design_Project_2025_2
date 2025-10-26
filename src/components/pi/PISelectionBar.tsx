import { Download, Sparkles, MapPin, X } from 'lucide-react';
import { PIButton } from './PIButton';

interface ClusterDistribution {
  cluster: string;
  count: number;
  percentage: number;
  color: string;
}

interface PISelectionBarProps {
  selectedCount: number;
  clusterDistribution?: ClusterDistribution[];
  onHighlightAll?: () => void;
  onSendToCompare?: () => void;
  onExportCSV?: () => void;
  onClear?: () => void;
}

export function PISelectionBar({
  selectedCount,
  clusterDistribution = [
    { cluster: 'C1', count: 210, percentage: 42, color: '#2563EB' },
    { cluster: 'C2', count: 150, percentage: 30, color: '#16A34A' },
    { cluster: 'C3', count: 90, percentage: 18, color: '#F59E0B' },
    { cluster: 'Noise', count: 50, percentage: 10, color: '#94A3B8' },
  ],
  onHighlightAll,
  onSendToCompare,
  onExportCSV,
  onClear,
}: PISelectionBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 animate-in slide-in-from-bottom-2"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(17, 24, 39, 0.08)',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
        animationDuration: '180ms',
      }}
    >
      <div className="px-20 py-3 flex items-center justify-between">
        {/* Left: Summary */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
              선택됨 {selectedCount.toLocaleString()}명
            </span>
            <button
              onClick={onClear}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
              style={{ color: '#64748B' }}
              title="선택 해제"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mini Distribution Bar */}
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
              군집 분포:
            </span>
            <div className="flex items-center gap-1">
              {clusterDistribution.map((dist, idx) => (
                <div
                  key={idx}
                  className="group relative"
                >
                  <div
                    className="h-6 rounded transition-all hover:opacity-80 cursor-help"
                    style={{
                      width: `${Math.max(dist.percentage * 1.5, 20)}px`,
                      background: dist.color,
                      opacity: 0.8,
                    }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-black/90 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {dist.cluster}: {dist.percentage}% ({dist.count}명)
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: '11px', fontWeight: 400, color: '#94A3B8' }}>
            분포로 상대적 소속을 확인하세요
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <PIButton variant="secondary" size="small" onClick={onHighlightAll}>
            <MapPin className="w-4 h-4 mr-1" />
            모두 지도에서 강조
          </PIButton>
          
          <PIButton variant="secondary" size="small" onClick={onSendToCompare}>
            <Sparkles className="w-4 h-4 mr-1" />
            비교 보드로
          </PIButton>

          <PIButton variant="ghost" size="small" onClick={onExportCSV}>
            <Download className="w-4 h-4 mr-1" />
            CSV
          </PIButton>
        </div>
      </div>
    </div>
  );
}
