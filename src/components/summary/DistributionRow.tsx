import React from 'react';
import type { SummaryData } from './types';

interface DistributionRowProps {
  data: SummaryData;
}

export function DistributionRow({ data }: DistributionRowProps) {
  const { total, qCount, wOnlyCount, femaleRate, avgAge, regionsTop, tagsTop } = data;

  // wOnlyCount === 0이면 W-only 관련 모든 표시 숨김
  const showWOnly = wOnlyCount > 0;

  const qRate = total > 0 ? Math.round((qCount / total) * 100) : 0;
  const wRate = total > 0 ? Math.round((wOnlyCount / total) * 100) : 0;

  return (
    <div className="summary-distribution-row">
      {/* 응답 구성 (Q vs W stacked bar) */}
      {showWOnly && (
        <div className="distribution-block distribution-block--coverage">
          <h6 className="distribution-label">응답 구성</h6>
          <div className="stacked-bar">
            <div
              className="stacked-bar__segment stacked-bar__segment--q"
              style={{ width: `${qRate}%` }}
            >
              <span className="stacked-bar__label">Q {qRate}%</span>
            </div>
            {wOnlyCount > 0 && (
              <div
                className="stacked-bar__segment stacked-bar__segment--w"
                style={{ width: `${wRate}%` }}
              >
                <span className="stacked-bar__label">W {wRate}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 인구통계 (성별/연령) */}
      {(femaleRate != null || avgAge != null) && (
        <div className="distribution-block distribution-block--demographics">
          <h6 className="distribution-label">인구통계</h6>
          <div className="demographics-visual">
            {femaleRate != null && (
              <div className="donut-container">
                <svg width="50" height="50" viewBox="0 0 50 50" className="donut">
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="6"
                  />
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="url(#pinkGradient)"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 20 * femaleRate} ${2 * Math.PI * 20}`}
                    strokeDashoffset={-2 * Math.PI * 20 * 0.25}
                    transform="rotate(-90 25 25)"
                  />
                  <defs>
                    <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#EC4899" />
                      <stop offset="100%" stopColor="#F472B6" />
                    </linearGradient>
                  </defs>
                  <text
                    x="25"
                    y="25"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="donut-text"
                  >
                    {Math.round(femaleRate * 100)}%
                  </text>
                </svg>
              </div>
            )}
            <div className="demographics-text">
              {femaleRate != null && <span>여성 {Math.round(femaleRate * 100)}%</span>}
              {femaleRate != null && avgAge != null && <span> · </span>}
              {avgAge != null && <span>{avgAge}세</span>}
            </div>
          </div>
        </div>
      )}

      {/* 지역 Top3 chips */}
      {regionsTop && regionsTop.length > 0 && (
        <div className="distribution-block distribution-block--regions">
          <h6 className="distribution-label">지역 Top3</h6>
          <div className="region-chips">
            {regionsTop.slice(0, 3).map((region, i) => (
              <span
                key={region.name}
                className={`region-chip region-chip--rank-${i + 1}`}
              >
                {i === 0 ? '🔷' : i === 1 ? '🔶' : '⚪'} {region.name} {region.count}명
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 관심사 Top5 chips */}
      {tagsTop && tagsTop.length > 0 && (
        <div className="distribution-block distribution-block--tags">
          <h6 className="distribution-label">관심사 Top5</h6>
          <div className="tag-chips">
            {tagsTop.slice(0, 5).map((tag) => (
              <span key={tag} className="tag-chip">
                #{tag}
              </span>
            ))}
            {tagsTop.length > 5 && (
              <span className="tag-chip tag-chip--more">
                +{tagsTop.length - 5}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

