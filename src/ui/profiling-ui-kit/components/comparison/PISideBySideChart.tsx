import { ContinuousComparison, BinaryComparison } from './types';
import { getFeatureDisplayName } from './utils';
import { prepareSideBySideData } from './dataPrep';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface PISideBySideChartProps {
  data: (ContinuousComparison | BinaryComparison)[];
  groupALabel: string;
  groupBLabel: string;
  maxItems?: number;
  showOnlyMeaningful?: boolean;
}

export function PISideBySideChart({ 
  data, 
  groupALabel, 
  groupBLabel,
  maxItems = 10,
  showOnlyMeaningful = true
}: PISideBySideChartProps) {
  const { isDark } = useDarkMode();
  
  // 새로운 데이터 준비 함수 사용
  const preparedData = prepareSideBySideData(data);
  
  // 연속형과 이진형만 필터링 (범주형 제외)
  const numericData = preparedData.filter(
    item => item.type === 'continuous' || item.type === 'binary'
  ) as (ContinuousComparison | BinaryComparison)[];
  
  // "의미 있는 차이만 보기" 필터링
  const filteredData = showOnlyMeaningful
    ? numericData.filter(item => {
        if (item.type === 'continuous') {
          return Math.abs(item.cohens_d ?? 0) >= 0.3;
        } else {
          const absDiff = Math.abs(item.abs_diff_pct ?? 0);
          const absLift = Math.abs(item.lift_pct ?? 0);
          return absDiff >= 3 || absLift >= 20;
        }
      })
    : numericData;
  
  // 최대 개수 제한
  const sortedData = filteredData.slice(0, maxItems);

  // 데이터가 없으면 빈 상태 표시 (정말 데이터가 전혀 없는 경우만)
  if (sortedData.length === 0) {
    return (
      <div
        className="flex flex-col p-6 rounded-2xl relative"
        style={{
          background: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(16px)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(17, 24, 39, 0.10)',
          boxShadow: isDark ? '0 6px 16px rgba(0, 0, 0, 0.3)' : '0 6px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div className="text-center py-12">
          <p style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#D1D5DB' : '#64748B' }}>
            비교 데이터가 없습니다.
          </p>
        </div>
      </div>
    );
  }

  // Find max value for scaling
  const maxValue = Math.max(
    ...sortedData.flatMap(item => {
      if (item.type === 'continuous') {
        return [item.group_a_mean, item.group_b_mean];
      } else {
        return [item.group_a_ratio, item.group_b_ratio];
      }
    })
  );

  return (
    <div
      className="flex flex-col p-6 rounded-2xl relative"
      style={{
        background: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: isDark ? '0 6px 16px rgba(0, 0, 0, 0.3)' : '0 6px 16px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Gradient Hairline */}
      <div 
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
          opacity: 0.5,
        }}
      />

      {/* Header */}
      <div className="mb-6">
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: isDark ? '#F9FAFB' : '#0F172A',
          marginBottom: '8px',
        }}>
          변수별 비교 (나란히)
        </h3>
        
        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: '#2563EB' }} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#D1D5DB' : '#64748B' }}>
              {groupALabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: '#16A34A' }} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#D1D5DB' : '#64748B' }}>
              {groupBLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-6">
        {sortedData.map((item, index) => {
          // 원본 값 우선 사용 (연속형)
          const valueA = item.type === 'continuous' 
            ? (item.original_group_a_mean ?? item.group_a_mean)
            : item.group_a_ratio;
          const valueB = item.type === 'continuous'
            ? (item.original_group_b_mean ?? item.group_b_mean)
            : item.group_b_ratio;
          const widthA = (valueA / maxValue) * 100;
          const widthB = (valueB / maxValue) * 100;
          
          const formatValue = (val: number) => {
            if (item.type === 'binary') {
              return `${(val * 100).toFixed(1)}%`;
            } else {
              // 원본 값이 있으면 소수점 1자리, 없으면 2자리
              return item.original_group_a_mean !== undefined ? val.toFixed(1) : val.toFixed(2);
            }
          };
          
          // 차이 표시 (연속형은 원본 차이, 이진형은 %p 차이)
          const diffDisplay = item.type === 'continuous'
            ? (item.original_difference ?? item.difference)
            : (item.abs_diff_pct ?? Math.abs(item.difference) * 100);
          const diffLabel = item.type === 'continuous' 
            ? (item.original_difference !== undefined ? '차이' : '차이 (정규화)')
            : '차이';

          return (
            <div key={index} className="group">
              {/* Feature Label */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 500, 
                    color: isDark ? '#F9FAFB' : '#0F172A',
                  }}>
                    {getFeatureDisplayName(item.feature, (item as any).feature_name_kr)}
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
                <div className="flex items-center gap-2">
                  {item.type === 'continuous' && item.cohens_d !== undefined && (
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 500, 
                      color: isDark ? '#9CA3AF' : '#64748B',
                    }}>
                      d={item.cohens_d.toFixed(2)}
                    </span>
                  )}
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500, 
                    color: item.lift_pct >= 0 ? '#16A34A' : '#EF4444',
                  }}>
                    {item.lift_pct >= 0 ? '+' : ''}{item.lift_pct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Group A Bar */}
              <div className="mb-2">
                <div className="flex items-center gap-3">
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 500, 
                    color: isDark ? '#D1D5DB' : '#64748B',
                    minWidth: '80px',
                  }}>
                    {groupALabel}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div 
                      className="h-8 rounded-lg transition-all duration-300 group-hover:scale-x-105 origin-left"
                      style={{
                        width: `${widthA}%`,
                        background: 'linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                      }}
                    />
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: '#2563EB',
                      minWidth: '60px',
                    }}>
                      {formatValue(valueA)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group B Bar */}
              <div>
                <div className="flex items-center gap-3">
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 500, 
                    color: isDark ? '#D1D5DB' : '#64748B',
                    minWidth: '80px',
                  }}>
                    {groupBLabel}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div 
                      className="h-8 rounded-lg transition-all duration-300 group-hover:scale-x-105 origin-left"
                      style={{
                        width: `${widthB}%`,
                        background: 'linear-gradient(90deg, #16A34A 0%, #22C55E 100%)',
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                      }}
                    />
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: '#16A34A',
                      minWidth: '60px',
                    }}>
                      {formatValue(valueB)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 차이 표시 */}
              <div className="mt-2 flex items-center justify-end gap-2" style={{ fontSize: '11px', color: isDark ? '#9CA3AF' : '#64748B' }}>
                <span>{diffLabel}:</span>
                <span style={{ fontWeight: 600 }}>
                  {item.type === 'continuous' 
                    ? `${diffDisplay >= 0 ? '+' : ''}${diffDisplay.toFixed(1)}`
                    : `${diffDisplay.toFixed(1)}%p`
                  }
                </span>
                {item.type === 'binary' && item.index_a !== undefined && item.index_b !== undefined && (
                  <span style={{ marginLeft: '8px', fontSize: '10px', opacity: 0.7 }}>
                    (Index: {item.index_a.toFixed(0)} vs {item.index_b.toFixed(0)})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sortedData.length === 0 && (
        <div className="text-center py-12">
          <p style={{ 
            fontSize: '13px', 
            fontWeight: 400, 
            color: isDark ? '#9CA3AF' : '#94A3B8',
          }}>
            비교 데이터가 없습니다
          </p>
        </div>
      )}

      {/* Footer Note */}
      {sortedData.some(item => item.significant) && (
        <div className="mt-6 pt-6 border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.08)' }}>
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
