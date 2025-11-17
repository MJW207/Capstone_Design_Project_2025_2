import { KpiRow } from './KpiRow';
import { DistributionRow } from './DistributionRow';
import { QuickStats } from './QuickStats';
import type { SummaryData } from './types';

interface SummaryBarProps {
  data: SummaryData;
  onFilterClick?: () => void;
}

export function SummaryBar({
  data,
  onFilterClick,
}: SummaryBarProps) {
  const { total } = data;

  if (total === 0) {
    return null;
  }

  return (
    <section className="summary-bar">
      {/* Row A: Quick Stats - 핵심 통계 한눈에 */}
      <QuickStats data={data} />

      {/* Row B: KPI micro cards */}
      <KpiRow data={data} />

      {/* Row C: DistributionRow - 도넛 차트 형태 (성비, 지역, 연령대) */}
      <DistributionRow data={data} />
    </section>
  );
}

