import { TrendingUp, AlertCircle } from 'lucide-react';
import { ContinuousComparison, BinaryComparison } from './types';
import { getFeatureDisplayName } from './utils';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface PIComparisonHighlightsProps {
  continuousTop: ContinuousComparison[];
  binaryTop: BinaryComparison[];
  maxItems?: number;
}

export function PIComparisonHighlights({ 
  continuousTop, 
  binaryTop,
  maxItems = 5 
}: PIComparisonHighlightsProps) {
  const { isDark } = useDarkMode();
  
  const allHighlights = [
    ...continuousTop.slice(0, maxItems),
    ...binaryTop.slice(0, maxItems)
  ]
    .sort((a, b) => Math.abs(b.lift_pct) - Math.abs(a.lift_pct))
    .slice(0, maxItems);

  return (
    <div
      className="flex flex-col p-6 rounded-2xl relative"
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)'
          : 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)',
        border: isDark ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid rgba(37, 99, 235, 0.2)',
      }}
    >
      {/* Gradient Top Line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, #2563EB 0%, #7C3AED 100%)',
          opacity: 0.5,
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div 
          className="p-2.5 rounded-xl"
          style={{
            background: 'rgba(37, 99, 235, 0.12)',
          }}
        >
          <TrendingUp className="w-5 h-5" style={{ color: '#2563EB' }} />
        </div>
        <div>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: isDark ? '#F9FAFB' : '#0F172A',
            marginBottom: '2px',
          }}>
            주요 차이점 하이라이트
          </h3>
          <p style={{ 
            fontSize: '12px', 
            fontWeight: 400, 
            color: isDark ? '#D1D5DB' : '#64748B',
          }}>
            가장 큰 차이를 보이는 변수들
          </p>
        </div>
      </div>

      {/* Highlights List */}
      <div className="space-y-3">
        {allHighlights.map((item, index) => {
          const isPositive = item.lift_pct >= 0;
          const featureNameKr = getFeatureDisplayName(item.feature, (item as any).feature_name_kr);
          
          // 연속형: 원본 값 표시
          if (item.type === 'continuous') {
            const origA = (item as any).original_group_a_mean;
            const origB = (item as any).original_group_b_mean;
            const origDiff = (item as any).original_difference;
            
            return (
              <div 
                key={index}
                className="flex items-start gap-3 p-4 rounded-xl transition-all duration-200 hover:shadow-md"
                style={{
                  background: isDark ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(17, 24, 39, 0.08)',
                }}
              >
                {/* Rank Badge */}
                <div 
                  className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0"
                  style={{
                    background: index < 3 
                      ? 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)'
                      : 'rgba(148, 163, 184, 0.2)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: index < 3 ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      color: isDark ? '#F9FAFB' : '#0F172A',
                    }}>
                      {featureNameKr}
                    </span>
                    {item.significant && (
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: 600, 
                        color: '#F59E0B',
                      }}>
                        ⭐
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: isDark ? '#D1D5DB' : '#64748B', lineHeight: '1.6' }}>
                    {origA !== undefined && origA !== null && origB !== undefined && origB !== null ? (
                      <>
                        <span style={{ fontWeight: 600 }}>A: {origA.toFixed(1)}</span>
                        {' vs '}
                        <span style={{ fontWeight: 600 }}>B: {origB.toFixed(1)}</span>
                        {origDiff !== undefined && origDiff !== null && (
                          <>
                            {' '}
                            <span style={{ color: isPositive ? '#16A34A' : '#EF4444', fontWeight: 600 }}>
                              (차이 {origDiff >= 0 ? '+' : ''}{origDiff.toFixed(1)})
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight: 600 }}>A: {item.group_a_mean !== null && item.group_a_mean !== undefined ? item.group_a_mean.toFixed(1) : 'N/A'}</span>
                        {' vs '}
                        <span style={{ fontWeight: 600 }}>B: {item.group_b_mean !== null && item.group_b_mean !== undefined ? item.group_b_mean.toFixed(1) : 'N/A'}</span>
                        {item.difference !== null && item.difference !== undefined && (
                          <>
                            {' '}
                            <span style={{ color: isPositive ? '#16A34A' : '#EF4444', fontWeight: 600 }}>
                              (차이 {item.difference >= 0 ? '+' : ''}{item.difference.toFixed(1)})
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          
          // 이진형: %p 차이 표시
          const absDiffPct = (item as any).abs_diff_pct ?? Math.abs(item.difference) * 100;
          
          return (
            <div 
              key={index}
              className="flex items-start gap-3 p-4 rounded-xl transition-all duration-200 hover:shadow-md"
              style={{
                background: isDark ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(17, 24, 39, 0.08)',
              }}
            >
              {/* Rank Badge */}
              <div 
                className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0"
                style={{
                  background: index < 3 
                    ? 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)'
                    : 'rgba(148, 163, 184, 0.2)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: index < 3 ? '#FFFFFF' : '#64748B',
                }}
              >
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: isDark ? '#F9FAFB' : '#0F172A',
                  }}>
                    {featureNameKr}
                  </span>
                  {item.significant && (
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: '#F59E0B',
                    }}>
                      ⭐
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: isDark ? '#D1D5DB' : '#64748B', lineHeight: '1.6' }}>
                  <span style={{ fontWeight: 600 }}>
                    A: {item.group_a_ratio !== null && item.group_a_ratio !== undefined ? (item.group_a_ratio * 100).toFixed(1) : 'N/A'}%
                  </span>
                  {' vs '}
                  <span style={{ fontWeight: 600 }}>
                    B: {item.group_b_ratio !== null && item.group_b_ratio !== undefined ? (item.group_b_ratio * 100).toFixed(1) : 'N/A'}%
                  </span>
                  {' '}
                  <span style={{ color: isPositive ? '#16A34A' : '#EF4444', fontWeight: 600 }}>
                    (차이 {absDiffPct !== null && absDiffPct !== undefined ? absDiffPct.toFixed(1) : 'N/A'}%p)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {allHighlights.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 mb-3" style={{ color: '#94A3B8' }} />
          <p style={{ 
            fontSize: '13px', 
            fontWeight: 400, 
            color: isDark ? '#9CA3AF' : '#94A3B8',
          }}>
            주요 차이점이 없습니다
          </p>
        </div>
      )}

      {/* Footer Note */}
      {allHighlights.some(item => item.significant) && (
        <div className="mt-5 pt-5 border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.08)' }}>
          <p style={{ 
            fontSize: '11px', 
            fontWeight: 400, 
            color: isDark ? '#D1D5DB' : '#64748B',
          }}>
            ⭐ 통계적으로 유의한 차이 (p {'<'} 0.05)
          </p>
        </div>
      )}
    </div>
  );
}
