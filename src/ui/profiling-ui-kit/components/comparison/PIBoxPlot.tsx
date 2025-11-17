import { BoxPlot, BoxPlotChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { ComparisonItem } from './types';
import { getFeatureDisplayName } from './utils';

interface PIBoxPlotProps {
  data: ComparisonItem[];
  groupALabel: string;
  groupBLabel: string;
  maxItems?: number;
}

// Box plot 데이터 구조 (recharts는 BoxPlot을 직접 지원하지 않으므로 커스텀 구현)
interface BoxPlotData {
  feature: string;
  groupA: {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    mean: number;
  };
  groupB: {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    mean: number;
  };
}

export function PIBoxPlot({ 
  data, 
  groupALabel, 
  groupBLabel,
  maxItems = 10 
}: PIBoxPlotProps) {
  // 연속형 데이터만 필터링
  const continuousData = data
    .filter(item => item.type === 'continuous')
    .slice(0, maxItems);

  if (continuousData.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(17, 24, 39, 0.10)',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        <p style={{ 
          fontSize: '14px', 
          fontWeight: 500, 
          color: '#64748B',
        }}>
          박스 플롯을 표시할 연속형 데이터가 없습니다
        </p>
      </div>
    );
  }

  // 실제 분포 데이터가 없으므로 평균값을 기준으로 시뮬레이션
  // 실제로는 백엔드에서 분포 데이터를 제공해야 함
  const boxPlotData = continuousData.map(item => {
    if (item.type === 'continuous') {
      const contItem = item as ContinuousComparison;
      // 원본 값이 있으면 원본 사용
      const meanA = contItem.original_group_a_mean !== undefined && contItem.original_group_a_mean !== null
        ? contItem.original_group_a_mean
        : item.group_a_mean;
      const meanB = contItem.original_group_b_mean !== undefined && contItem.original_group_b_mean !== null
        ? contItem.original_group_b_mean
        : item.group_b_mean;
      const stdA = Math.abs(meanA) * 0.2; // 표준편차 추정 (평균의 20%)
      const stdB = Math.abs(meanB) * 0.2;
      
      return {
        feature: (() => {
          const displayName = (item as any).feature_name_kr || getFeatureDisplayName(item.feature);
          return displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName;
        })(),
        fullFeature: (item as any).feature_name_kr || getFeatureDisplayName(item.feature),
        [`${groupALabel}_min`]: meanA - stdA * 1.5,
        [`${groupALabel}_q1`]: meanA - stdA * 0.5,
        [`${groupALabel}_median`]: meanA,
        [`${groupALabel}_q3`]: meanA + stdA * 0.5,
        [`${groupALabel}_max`]: meanA + stdA * 1.5,
        [`${groupALabel}_mean`]: meanA,
        [`${groupBLabel}_min`]: meanB - stdB * 1.5,
        [`${groupBLabel}_q1`]: meanB - stdB * 0.5,
        [`${groupBLabel}_median`]: meanB,
        [`${groupBLabel}_q3`]: meanB + stdB * 0.5,
        [`${groupBLabel}_max`]: meanB + stdB * 1.5,
        [`${groupBLabel}_mean`]: meanB,
      };
    }
    return null;
  }).filter(Boolean);

  return (
    <div
      className="flex flex-col p-6 rounded-2xl relative"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
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
          color: '#0F172A',
          marginBottom: '6px',
        }}>
          박스 플롯 비교
        </h3>
        <p style={{ 
          fontSize: '12px', 
          fontWeight: 400, 
          color: '#64748B',
        }}>
          분포 및 중앙값 비교 (시뮬레이션 데이터)
        </p>
      </div>

      {/* Chart - 커스텀 박스 플롯 구현 */}
      <div style={{ width: '100%', height: '500px', overflowX: 'auto' }}>
        <div className="space-y-4">
          {boxPlotData.map((item, idx) => {
            if (!item) return null;
            
            const aMin = item[`${groupALabel}_min` as keyof typeof item] as number;
            const aQ1 = item[`${groupALabel}_q1` as keyof typeof item] as number;
            const aMedian = item[`${groupALabel}_median` as keyof typeof item] as number;
            const aQ3 = item[`${groupALabel}_q3` as keyof typeof item] as number;
            const aMax = item[`${groupALabel}_max` as keyof typeof item] as number;
            const aMean = item[`${groupALabel}_mean` as keyof typeof item] as number;
            
            const bMin = item[`${groupBLabel}_min` as keyof typeof item] as number;
            const bQ1 = item[`${groupBLabel}_q1` as keyof typeof item] as number;
            const bMedian = item[`${groupBLabel}_median` as keyof typeof item] as number;
            const bQ3 = item[`${groupBLabel}_q3` as keyof typeof item] as number;
            const bMax = item[`${groupBLabel}_max` as keyof typeof item] as number;
            const bMean = item[`${groupBLabel}_mean` as keyof typeof item] as number;
            
            const allValues = [aMin, aMax, bMin, bMax];
            const minVal = Math.min(...allValues);
            const maxVal = Math.max(...allValues);
            const range = maxVal - minVal || 1;
            
            // 0-100 스케일로 정규화
            const normalize = (val: number) => ((val - minVal) / range) * 100;
            
            return (
              <div key={idx} className="space-y-2">
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#0F172A', marginBottom: '8px' }}>
                  {item.fullFeature || item.feature}
                </div>
                <div className="flex items-center gap-4" style={{ height: '60px', position: 'relative' }}>
                  {/* Group A Box Plot */}
                  <div className="flex-1" style={{ position: 'relative', height: '100%' }}>
                    <div style={{ fontSize: '10px', color: '#2563EB', marginBottom: '4px' }}>
                      {groupALabel}
                    </div>
                    <div style={{ position: 'relative', height: '40px', borderLeft: '2px solid #2563EB' }}>
                      {/* Whisker (min to q1) */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: `${100 - normalize(aQ1)}%`,
                          width: '1px',
                          height: `${normalize(aQ1) - normalize(aMin)}%`,
                          background: '#2563EB',
                        }}
                      />
                      {/* Box (q1 to q3) */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '45%',
                          top: `${100 - normalize(aQ3)}%`,
                          width: '10%',
                          height: `${normalize(aQ3) - normalize(aQ1)}%`,
                          background: 'rgba(37, 99, 235, 0.2)',
                          border: '1px solid #2563EB',
                        }}
                      />
                      {/* Median line */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '45%',
                          top: `${100 - normalize(aMedian)}%`,
                          width: '10%',
                          height: '1px',
                          background: '#2563EB',
                        }}
                      />
                      {/* Mean marker */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: `${100 - normalize(aMean)}%`,
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#2563EB',
                          transform: 'translateX(-50%)',
                        }}
                      />
                      {/* Whisker (q3 to max) */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: `${100 - normalize(aMax)}%`,
                          width: '1px',
                          height: `${normalize(aMax) - normalize(aQ3)}%`,
                          background: '#2563EB',
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Group B Box Plot */}
                  <div className="flex-1" style={{ position: 'relative', height: '100%' }}>
                    <div style={{ fontSize: '10px', color: '#7C3AED', marginBottom: '4px' }}>
                      {groupBLabel}
                    </div>
                    <div style={{ position: 'relative', height: '40px', borderLeft: '2px solid #7C3AED' }}>
                      {/* Whisker (min to q1) */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: `${100 - normalize(bQ1)}%`,
                          width: '1px',
                          height: `${normalize(bQ1) - normalize(bMin)}%`,
                          background: '#7C3AED',
                        }}
                      />
                      {/* Box (q1 to q3) */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '45%',
                          top: `${100 - normalize(bQ3)}%`,
                          width: '10%',
                          height: `${normalize(bQ3) - normalize(bQ1)}%`,
                          background: 'rgba(124, 58, 237, 0.2)',
                          border: '1px solid #7C3AED',
                        }}
                      />
                      {/* Median line */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '45%',
                          top: `${100 - normalize(bMedian)}%`,
                          width: '10%',
                          height: '1px',
                          background: '#7C3AED',
                        }}
                      />
                      {/* Mean marker */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: `${100 - normalize(bMean)}%`,
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#7C3AED',
                          transform: 'translateX(-50%)',
                        }}
                      />
                      {/* Whisker (q3 to max) */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: `${100 - normalize(bMax)}%`,
                          width: '1px',
                          height: `${normalize(bMax) - normalize(bQ3)}%`,
                          background: '#7C3AED',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-[var(--neutral-200)]">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', background: 'rgba(37, 99, 235, 0.2)', border: '1px solid #2563EB' }} />
            <span style={{ color: '#64748B' }}>IQR (Q1-Q3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '1px', height: '12px', background: '#2563EB' }} />
            <span style={{ color: '#64748B' }}>Whisker (Min-Max)</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '1px', background: '#2563EB' }} />
            <span style={{ color: '#64748B' }}>Median</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }} />
            <span style={{ color: '#64748B' }}>Mean</span>
          </div>
        </div>
      </div>
    </div>
  );
}

