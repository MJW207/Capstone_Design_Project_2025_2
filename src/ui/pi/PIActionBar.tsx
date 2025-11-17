import { Download } from 'lucide-react';
import { PIButton } from './PIButton';

interface PIActionBarProps {
  filterSummary?: string;
  selectedCount?: number;
  onExport?: () => void;
}

export function PIActionBar({
  filterSummary = '전체 결과',
  selectedCount = 5,
  onExport,
}: PIActionBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(17, 24, 39, 0.08)',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div className="px-20 py-3 flex items-center justify-between">
        {/* Left: Summary */}
        <div className="flex items-center gap-4">
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
            {filterSummary}
          </span>
          <div
            className="h-4 w-[1px]"
            style={{ background: 'rgba(17, 24, 39, 0.1)' }}
          />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
            군집 {selectedCount}개
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <PIButton variant="secondary" size="small" onClick={onExport}>
            <Download className="w-4 h-4 mr-1" />
            PNG 내보내기
          </PIButton>
        </div>
      </div>
    </div>
  );
}
