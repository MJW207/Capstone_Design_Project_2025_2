import { BinaryComparison, ContinuousComparison } from './types';
import { getFeatureDisplayName } from './utils';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface PIIndexDotPlotProps {
  data: (BinaryComparison | ContinuousComparison)[];
  clusterLabels: string[];
  baselineValue?: number;
  maxFeatures?: number;
  showOnlyMeaningful?: boolean;
  hasSelectedFeatures?: boolean; // 사용자가 변수를 선택했는지 여부
}

export function PIIndexDotPlot({ 
  data, 
  clusterLabels,
  baselineValue = 0.5, // Overall average
  maxFeatures = 10,
  showOnlyMeaningful = true,
  hasSelectedFeatures = false
}: PIIndexDotPlotProps) {
  const { isDark } = useDarkMode();
  
  // 전달받은 데이터를 그대로 사용 (이미 필터링 및 정렬 완료)
  // prepareIndexDotData를 호출하지 않음 (사용자가 선택한 변수를 유지하기 위해)
  
  // 이진형과 연속형 모두 처리
  const indexData = data.map(item => {
    let indexA: number;
    let indexB: number;
    
    if (item.type === 'binary') {
      const binaryItem = item as BinaryComparison;
      // 이진형: index_a, index_b가 있으면 사용, 없으면 계산
      if (binaryItem.index_a !== undefined && binaryItem.index_a !== null) {
        indexA = binaryItem.index_a;
      } else {
        indexA = binaryItem.group_a_ratio ? ((binaryItem.group_a_ratio / baselineValue) * 100) : 100;
      }
      if (binaryItem.index_b !== undefined && binaryItem.index_b !== null) {
        indexB = binaryItem.index_b;
      } else {
        indexB = binaryItem.group_b_ratio ? ((binaryItem.group_b_ratio / baselineValue) * 100) : 100;
      }
    } else {
      // 연속형: index_a, index_b가 있으면 사용, 없으면 계산
      const continuousItem = item as ContinuousComparison;
      if (continuousItem.index_a !== undefined && continuousItem.index_a !== null) {
        indexA = continuousItem.index_a;
      } else {
        indexA = continuousItem.group_a_mean ? ((continuousItem.group_a_mean / baselineValue) * 100) : 100;
      }
      if (continuousItem.index_b !== undefined && continuousItem.index_b !== null) {
        indexB = continuousItem.index_b;
      } else {
        indexB = continuousItem.group_b_mean ? ((continuousItem.group_b_mean / baselineValue) * 100) : 100;
      }
    }
    
    const maxIndex = Math.max(indexA, indexB);
    const maxDeviation = Math.max(
      Math.abs(indexA - 100),
      Math.abs(indexB - 100)
    );
    
    return {
      feature: item.feature,
      indices: [
        { cluster: clusterLabels[0], value: indexA, color: '#2563EB' },
        { cluster: clusterLabels[1], value: indexB, color: '#16A34A' }
      ],
      maxIndex,
      maxDeviation,
      significant: item.significant,
      type: item.type
    };
  });
  
  // 필터링: 사용자가 변수를 선택했으면 필터링 건너뛰기
  let meaningfulData = indexData;
  if (!hasSelectedFeatures && showOnlyMeaningful) {
    // 사용자가 변수를 선택하지 않았을 때만 의미있는 차이만 필터링
    meaningfulData = indexData.filter(item => {
      return item.maxIndex >= 120 || item.maxIndex <= 80;
    });
  }

  // 정렬: 항상 정렬 수행
  const sortedData = meaningfulData.sort((a, b) => {
    // 사용자가 변수를 선택했으면 선택한 순서 유지, 아니면 편차 기준 정렬
    if (hasSelectedFeatures) {
      // 선택한 순서는 이미 filteredIndexData에서 정렬되어 있으므로 그대로 유지
      return 0; // 순서 유지
    } else {
      // 편차 기준 정렬
      return b.maxDeviation - a.maxDeviation;
    }
  });

  // 제한: 사용자가 변수를 선택했으면 모든 변수 표시, 아니면 maxFeatures만큼만
  const finalData = hasSelectedFeatures 
    ? sortedData 
    : sortedData.slice(0, maxFeatures);

  // 데이터가 없으면 빈 상태 표시
  if (finalData.length === 0) {
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

  // Find range for x-axis
  const maxIndex = Math.max(...finalData.flatMap(d => d.indices.map(i => i.value)));
  const xMax = Math.ceil(maxIndex / 50) * 50; // Round to nearest 50

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>
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
          marginBottom: '6px',
        }}>
          Penetration Index 차트
        </h3>
        <p style={{ 
          fontSize: '12px', 
          fontWeight: 400, 
          color: isDark ? '#D1D5DB' : '#64748B',
        }}>
          전체 평균 대비 클러스터별 비율 (100 = 전체 평균)
        </p>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', paddingLeft: '160px', paddingTop: '20px', paddingBottom: '40px' }}>
        {/* Y-axis labels */}
        <div style={{ position: 'absolute', left: 0, top: '20px', width: '160px' }}>
          {finalData.map((item, idx) => (
            <div 
              key={idx}
              style={{
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '16px',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: 500, 
                  color: isDark ? '#F9FAFB' : '#0F172A',
                  textAlign: 'right',
                }}>
                  {getFeatureDisplayName(item.feature, (item as any).feature_name_kr)}
                </span>
                {item.significant && (
                  <span style={{ fontSize: '12px', color: '#F59E0B' }}>⭐</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ position: 'relative', minHeight: `${finalData.length * 60}px` }}>
          {/* Baseline (100) */}
          <div 
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '2px',
              background: isDark ? 'rgba(255, 255, 255, 0.2)' : '#9CA3AF',
              opacity: 0.5,
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
                fontSize: '11px',
                fontWeight: 600,
                color: isDark ? '#9CA3AF' : '#9CA3AF',
                whiteSpace: 'nowrap',
              }}>
                Baseline (100)
              </div>
          </div>

          {/* Grid lines */}
          {[0, 50, 150, 200].filter(v => v <= xMax).map((value, idx) => (
            <div 
              key={idx}
              style={{
                position: 'absolute',
                left: `${(value / xMax) * 100}%`,
                top: 0,
                bottom: 0,
                width: '1px',
                background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                opacity: 0.5,
              }}
            />
          ))}

          {/* Data points */}
          {sortedData.map((item, rowIdx) => (
            <div 
              key={rowIdx}
              style={{
                position: 'absolute',
                top: `${rowIdx * 60 + 20}px`,
                left: 0,
                right: 0,
                height: '20px',
              }}
            >
              {item.indices.map((point, pointIdx) => {
                const featureNameKr = getFeatureDisplayName(item.feature, (item as any).feature_name_kr);
                const isHighIndex = point.value >= 120;
                const isLowIndex = point.value <= 80;
                
                return (
                  <div
                    key={pointIdx}
                    className="group relative cursor-pointer transition-all duration-200 hover:scale-125"
                    style={{
                      position: 'absolute',
                      left: `${(point.value / xMax) * 100}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: isHighIndex ? '18px' : '14px',
                      height: isHighIndex ? '18px' : '14px',
                      borderRadius: '50%',
                      background: isHighIndex ? '#10B981' : (isLowIndex ? '#EF4444' : point.color),
                      border: isHighIndex ? '3px solid #FFFFFF' : '2px solid #FFFFFF',
                      boxShadow: isHighIndex 
                        ? `0 4px 12px rgba(16, 185, 129, 0.6), 0 0 0 2px ${point.color}40`
                        : `0 2px 8px ${point.color}60`,
                      zIndex: isHighIndex ? 2 : 1,
                      animation: isHighIndex ? 'pulse 2s infinite' : 'none',
                    }}
                  >
                    {/* Tooltip on hover - 점 위쪽에 표시하되 점을 가리지 않도록 */}
                    <div 
                      className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"
                      style={{
                        bottom: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '6px 10px',
                        background: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(31, 41, 55, 0.95)',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 500,
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        zIndex: 20,
                        minWidth: '140px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                        {point.cluster}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.9 }}>
                        {featureNameKr}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                        Index: {point.value.toFixed(0)} (전체의 {(point.value / 100).toFixed(2)}배)
                      </div>
                      {/* 화살표 */}
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '-4px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '4px solid transparent',
                          borderRight: '4px solid transparent',
                          borderTop: isDark ? '4px solid rgba(17, 24, 39, 0.95)' : '4px solid rgba(31, 41, 55, 0.95)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* X-axis */}
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '30px',
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E5E7EB',
          }}
        >
          {[0, 50, 100, 150, 200].filter(v => v <= xMax).map((value, idx) => (
            <div 
              key={idx}
              style={{
                position: 'absolute',
                left: `${(value / xMax) * 100}%`,
                top: '8px',
                transform: 'translateX(-50%)',
                fontSize: '11px',
                fontWeight: 500,
                color: '#64748B',
              }}
            >
              {value}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.08)' }}>
        <div className="flex items-center gap-6">
          {clusterLabels.map((label, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ 
                  background: idx === 0 ? '#2563EB' : '#16A34A',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              />
              <span style={{ 
                fontSize: '12px', 
                fontWeight: 500, 
                color: isDark ? '#D1D5DB' : '#64748B',
              }}>
                {label}
              </span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: '11px', color: isDark ? '#D1D5DB' : '#64748B' }}>
            ⭐ 통계적으로 유의한 차이
          </div>
        </div>
      </div>

      {/* Empty State */}
      {finalData.length === 0 && (
        <div className="text-center py-12">
          <p style={{ 
            fontSize: '13px', 
            fontWeight: 400, 
            color: isDark ? '#9CA3AF' : '#94A3B8',
          }}>
            인덱스 데이터가 없습니다
          </p>
        </div>
      )}
    </div>
    </>
  );
}
