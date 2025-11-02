import React from 'react';
import { Filter, FileText, Settings, MoreVertical } from 'lucide-react';
import type { SummaryData } from './types';

interface HeaderStripProps {
  data: SummaryData;
  onFilterClick?: () => void;
  onExportClick?: () => void;
  onPresetClick?: () => void;
  onCompareClick?: () => void;
  filterCount?: number;
}

export function HeaderStrip({
  data,
  onFilterClick,
  onExportClick,
  onPresetClick,
  onCompareClick,
  filterCount = 0,
}: HeaderStripProps) {
  const { total, qCount, femaleRate, regionsTop, latestDate } = data;

  const coverage = total > 0 ? Math.round((qCount / total) * 100) : 0;
  const femalePercent = femaleRate != null ? Math.round(femaleRate * 100) : null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="summary-header-strip">
      {/* Left: Summary Chips */}
      <div className="summary-chips">
        {total > 0 && (
          <button
            className="summary-chip"
            onClick={onFilterClick}
            title="총 결과 수"
          >
            총 {total.toLocaleString()}명
          </button>
        )}

        {coverage > 0 && (
          <button
            className="summary-chip"
            onClick={onFilterClick}
            title="Quick 응답률"
          >
            Q {coverage}%
          </button>
        )}

        {femalePercent != null && femalePercent > 0 && (
          <button
            className="summary-chip"
            onClick={onFilterClick}
            title="여성 비율"
          >
            여성 {femalePercent}%
          </button>
        )}

        {regionsTop && regionsTop.length >= 2 && (
          <button
            className="summary-chip"
            onClick={onFilterClick}
            title="주요 지역"
          >
            {regionsTop[0]?.name}/{regionsTop[1]?.name}
          </button>
        )}

        {latestDate && (
          <button
            className="summary-chip"
            onClick={onFilterClick}
            title="최신 데이터 날짜"
          >
            최신 {formatDate(latestDate)}
          </button>
        )}
      </div>

      {/* Right: Quick Actions */}
      <div className="summary-actions">
        <button
          className="summary-action"
          onClick={onFilterClick}
          title="필터"
        >
          <Filter size={16} />
          {filterCount > 0 && (
            <span className="summary-action-badge">{filterCount}</span>
          )}
        </button>

        <button
          className="summary-action"
          onClick={onCompareClick}
          title="비교"
        >
          <FileText size={16} />
        </button>

        <button
          className="summary-action"
          onClick={onExportClick}
          title="내보내기"
        >
          <FileText size={16} />
        </button>

        <button
          className="summary-action"
          onClick={onPresetClick}
          title="프리셋"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}

