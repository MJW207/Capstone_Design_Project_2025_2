import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { SummaryData } from './types';

interface InsightBlockProps {
  data: SummaryData;
}

export function InsightBlock({ data }: InsightBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { total, femaleRate, regionsTop } = data;

  // Small sample warning
  const isSmallSample = total > 0 && total < 50;

  // Compute insights
  const insights = React.useMemo(() => {
    const result: string[] = [];

    if (femaleRate != null) {
      const baseline = 0.5; // 50%
      const lift = femaleRate > baseline
        ? `+${Math.round((femaleRate - baseline) * 100)}%`
        : `${Math.round((femaleRate - baseline) * 100)}%`;
      const ratio = (femaleRate / baseline).toFixed(1);
      result.push(`여성 ${lift} · ${ratio}×`);
    }

    if (regionsTop && regionsTop.length > 0) {
      const top1 = regionsTop[0];
      if (top1 && top1.rate > 40) {
        const baseline = 0.1; // 10% (가정)
        const lift = ((top1.rate / 100 - baseline) / baseline).toFixed(1);
        result.push(`${top1.name} ${lift}×`);
      }
    }

    // Confidence 계산 (샘플 크기 기반)
    let confidence: 'Low' | 'Med' | 'High' = 'Med';
    if (total < 50) confidence = 'Low';
    else if (total >= 200) confidence = 'High';

    result.push(`신뢰도 ${confidence === 'Low' ? '낮음' : confidence === 'Med' ? '보통' : '높음'}`);

    return { items: result, confidence };
  }, [total, femaleRate, regionsTop]);

  // Alerts/Recommendations
  const alerts = React.useMemo(() => {
    const result: string[] = [];

    if (data.wOnlyCount === 0 && data.total > 0) {
      result.push('모든 패널이 Quick 응답을 보유합니다.');
    }

    if (regionsTop && regionsTop.length > 0) {
      const top1Rate = regionsTop[0]?.rate || 0;
      if (top1Rate >= 60) {
        result.push(`${regionsTop[0].name} 지역 편중 (${top1Rate}%)`);
      }
    }

    // TODO: recency 체크

    return result;
  }, [data.wOnlyCount, data.total, regionsTop]);

  if (isSmallSample) {
    return (
      <div className="summary-insight-block summary-insight-block--warning">
        <AlertTriangle size={16} />
        <span>소표본 — 통계적 해석 제한</span>
      </div>
    );
  }

  return (
    <div className={`summary-insight-block ${isExpanded ? 'is-expanded' : ''}`}>
      <button
        className="summary-insight-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="summary-insight-title">
          <Sparkles size={16} />
          <span>AI 인사이트</span>
          {!isExpanded && (
            <span className="summary-insight-summary">
              {insights.items.join(' · ')}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="summary-insight-body">
          {/* Section Lift vs baseline */}
          <section className="insight-section">
            <h6>Baseline 대비 변화</h6>
            <ul className="insight-list">
              {insights.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Confidence gauge */}
          <section className="insight-section">
            <h6>신뢰도</h6>
            <div className="confidence-gauge">
              <div className="confidence-dots">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`confidence-dot ${
                      i < (insights.confidence === 'Low' ? 2 : insights.confidence === 'Med' ? 3 : 5)
                        ? 'is-active'
                        : ''
                    }`}
                  />
                ))}
              </div>
              <span className="confidence-label">
                {insights.confidence === 'Low'
                  ? '낮음'
                  : insights.confidence === 'Med'
                    ? '보통'
                    : '높음'}
              </span>
            </div>
            <p className="insight-note">
              샘플 크기 {total.toLocaleString()}명 기준
            </p>
          </section>

          {/* Alerts/Recommendations */}
          {alerts.length > 0 && (
            <section className="insight-section">
              <h6>알림/권장사항</h6>
              <ul className="insight-alerts">
                {alerts.map((alert, i) => (
                  <li key={i}>{alert}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Sampling hint for large samples */}
          {total >= 500 && (
            <section className="insight-section">
              <p className="insight-note">
                대용량 데이터셋: 샘플링을 고려하세요
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

