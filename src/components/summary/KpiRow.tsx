import React, { useMemo } from 'react';
import { CountUp } from '../ui/count-up';
import { KpiCard } from './KpiCard';
import type { SummaryData } from './types';
import { daysSince, getFreshnessTone } from './types';

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
    if (total < 500) return null;
    const kb = total * 2.5; // 예상 크기 (KB)
    if (kb < 1024) return `${Math.round(kb)}KB`;
    return `${(kb / 1024).toFixed(1)}MB`;
  }, [total]);

  const estimatedTime = useMemo(() => {
    if (total < 500) return null;
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
        main={<CountUp end={total} duration={0.8} className="kpi-number" />}
        sub={deltaText ? `vs 이전 ${deltaText}` : undefined}
        tooltip="총 검색 결과 수"
      />
    );

    // 2. Coverage (show when coverage < 100% or always)
    if (total >= 50) {
      const wOnlyBadge = wOnlyCount > 0 ? (
        <span className="kpi-badge kpi-badge--w">W-only {wOnlyRate}%</span>
      ) : null;
      result.push(
        <KpiCard
          key="coverage"
          title="Coverage"
          main={<span className="kpi-number">{coverage}%</span>}
          sub={`Q 응답 (vs 65%)`}
          badge={wOnlyBadge}
          tooltip="Quick 응답률 (기준: 65%)"
        />
      );
    }

    // 3. Freshness (always)
    if (daysSinceMedian != null && freshnessTone != null) {
      result.push(
        <KpiCard
          key="freshness"
          title="Freshness"
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

    // 4. Diversity (optional, show when total >= 500)
    if (total >= 500 && regionsTop && regionsTop.length > 0) {
      const top1Rate = regionsTop[0]?.rate || 0;
      const warnBadge = top1Rate >= 60 ? (
        <span className="kpi-badge kpi-badge--warn">
          {regionsTop[0]?.name} 집중 {top1Rate}%
        </span>
      ) : null;
      // TODO: HHI 계산은 추후 구현
      result.push(
        <KpiCard
          key="diversity"
          title="Diversity"
          main={<span className="kpi-number">보통</span>}
          sub="HHI 0.xx"
          badge={warnBadge}
          tooltip="지역 다양성 지수 (HHI)"
        />
      );
    }

    // 5. Cost (show only when total >= 500)
    if (total >= 500 && estimatedSize) {
      result.push(
        <KpiCard
          key="cost"
          title="Cost"
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

