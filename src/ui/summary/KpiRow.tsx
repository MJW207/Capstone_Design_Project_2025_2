import React, { useMemo } from 'react';
import { CountUp } from '../base/count-up';
import { KpiCard } from './KpiCard';
import type { SummaryData } from './types';
import { daysSince, getFreshnessTone } from './types';
import { Users, Clock, HardDrive } from 'lucide-react';

interface KpiRowProps {
  data: SummaryData;
}

export function KpiRow({ data }: KpiRowProps) {
  const {
    total,
    qCount,
    wOnlyCount,
    coverage,
    wOnlyRate,
    deltaPercent,
    daysSinceMedian,
    freshnessTone,
    medianDate,
    regionsTop,
  } = useMemo(() => {
    const coverage = data.total > 0 ? Math.round((data.qCount / data.total) * 100) : 0;
    const wOnlyRate = data.total > 0 ? Math.round((data.wOnlyCount / data.total) * 100) : 0;
    const deltaPercent =
      data.previousTotal != null && data.previousTotal > 0
        ? Math.round(((data.total - data.previousTotal) / data.previousTotal) * 100)
        : null;
    const daysSinceMedian = data.medianDate ? daysSince(data.medianDate) : null;
    const freshnessTone = daysSinceMedian != null ? getFreshnessTone(daysSinceMedian) : null;

    return {
      total: data.total,
      qCount: data.qCount,
      wOnlyCount: data.wOnlyCount,
      coverage,
      wOnlyRate,
      deltaPercent,
      daysSinceMedian,
      freshnessTone,
      medianDate: data.medianDate,
      regionsTop: data.regionsTop,
    };
  }, [data]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  const estimatedSize = useMemo(() => {
    if (total === 0) return null;
    const kb = total * 2.5; // 예상 크기 (KB)
    if (kb < 1024) return `${Math.round(kb)}KB`;
    return `${(kb / 1024).toFixed(1)}MB`;
  }, [total]);

  const estimatedTime = useMemo(() => {
    if (total === 0) return null;
    if (total < 100) return '< 1초';
    if (total < 1000) return '< 1초';
    if (total < 5000) return '~ 2초';
    return '~ 5초';
  }, [total]);

  // Priority 결정
  const kpis = useMemo(() => {
    const result: React.ReactNode[] = [];

    // 1. Found (always)
    const deltaText = deltaPercent != null
      ? `${deltaPercent >= 0 ? '↑' : '↓'} ${Math.abs(deltaPercent)}%`
      : null;
    result.push(
      <KpiCard
        key="found"
        title="Found"
        icon={Users}
        iconColor="#3B82F6"
        main={<CountUp end={total} duration={0.8} className="kpi-number" />}
        sub={deltaText ? `vs 이전 ${deltaText}` : undefined}
        tooltip="총 검색 결과 수"
      />
    );

    // 2. Freshness (always)
    if (daysSinceMedian != null && freshnessTone != null) {
      const freshnessColors = {
        zero: '#10B981',
        low: '#F59E0B',
        mid: '#F97316',
        high: '#EF4444'
      };
      result.push(
        <KpiCard
          key="freshness"
          title="Freshness"
          icon={Clock}
          iconColor={freshnessColors[freshnessTone]}
          main={
            <span className={`kpi-number kpi-number--${freshnessTone}`}>
              {daysSinceMedian}일 전
            </span>
          }
          sub={`중앙값 ${formatDate(medianDate) || '최신'}`}
          tooltip="데이터 최신성"
        />
      );
    }

    // 3. Cost (show when estimatedSize exists)
    if (estimatedSize) {
      result.push(
        <KpiCard
          key="cost"
          title="Cost"
          icon={HardDrive}
          iconColor="#8B5CF6"
          main={<span className="kpi-number">{estimatedSize}</span>}
          sub={estimatedTime || undefined}
          tooltip="예상 파일 크기 및 내보내기 시간"
        />
      );
    }

    return result;
  }, [total, coverage, wOnlyCount, wOnlyRate, deltaPercent, daysSinceMedian, freshnessTone, medianDate, regionsTop, estimatedSize, estimatedTime]);

  return (
    <div className="summary-kpi-row">
      {kpis}
    </div>
  );
}

