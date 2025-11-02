import React from 'react';
import { HeaderStrip } from './HeaderStrip';
import { KpiRow } from './KpiRow';
import { DistributionRow } from './DistributionRow';
import { InsightBlock } from './InsightBlock';
import type { SummaryData } from './types';

interface SummaryBarProps {
  data: SummaryData;
  onFilterClick?: () => void;
  onExportClick?: () => void;
  onPresetClick?: () => void;
  onCompareClick?: () => void;
  filterCount?: number;
}

export function SummaryBar({
  data,
  onFilterClick,
  onExportClick,
  onPresetClick,
  onCompareClick,
  filterCount = 0,
}: SummaryBarProps) {
  const { total } = data;

  // Empty state
  if (total === 0) {
    return (
      <div className="summary-empty">
        <p className="summary-empty__title">검색 결과가 없습니다</p>
        <div className="summary-empty__actions">
          <button onClick={onFilterClick} className="summary-empty__btn summary-empty__btn--primary">
            필터 조정
          </button>
          <button onClick={() => {}} className="summary-empty__btn">
            검색어 변경
          </button>
          <button onClick={onPresetClick} className="summary-empty__btn">
            프리셋 불러오기
          </button>
        </div>
      </div>
    );
  }

  // Small sample (1-49): show only Header + 2 KPIs; hide Distribution
  const isSmallSample = total > 0 && total < 50;

  return (
    <section className="summary-bar">
      {/* Row A: HeaderStrip (56px) */}
      <HeaderStrip
        data={data}
        onFilterClick={onFilterClick}
        onExportClick={onExportClick}
        onPresetClick={onPresetClick}
        onCompareClick={onCompareClick}
        filterCount={filterCount}
      />

      {/* Row B: KPI micro cards (88px) */}
      <KpiRow data={data} />

      {/* Row C: DistributionRow (120px) - hide for small samples */}
      {!isSmallSample && <DistributionRow data={data} />}

      {/* Row D: InsightBlock (collapsible: 56px/160px) */}
      <InsightBlock data={data} />
    </section>
  );
}

