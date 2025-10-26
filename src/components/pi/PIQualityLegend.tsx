import { AlertTriangle } from 'lucide-react';

interface QualityMetric {
  label: string;
  value: number;
  max: number;
  min?: number;
  warningThreshold?: number;
  format?: (val: number) => string;
}

interface PIQualityLegendProps {
  silhouette?: number;
  noiseRatio?: number;
  balanceScore?: number;
}

export function PIQualityLegend({
  silhouette = 0.62,
  noiseRatio = 8.5,
  balanceScore = 0.78,
}: PIQualityLegendProps) {
  const metrics: QualityMetric[] = [
    {
      label: 'Silhouette 평균',
      value: silhouette,
      min: -1,
      max: 1,
      warningThreshold: 0.05,
      format: (v) => v.toFixed(2),
    },
    {
      label: '노이즈 비율',
      value: noiseRatio,
      min: 0,
      max: 100,
      warningThreshold: 50,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      label: '클러스터 균형도',
      value: balanceScore,
      min: 0,
      max: 1,
      warningThreshold: 0.3,
      format: (v) => v.toFixed(2),
    },
  ];

  const getBarColor = (metric: QualityMetric) => {
    if (!metric.warningThreshold) return '#2563EB';
    
    // For metrics where lower is better (noise ratio)
    if (metric.label.includes('노이즈')) {
      return metric.value > metric.warningThreshold ? '#F59E0B' : '#16A34A';
    }
    
    // For metrics where higher is better
    return metric.value < metric.warningThreshold ? '#F59E0B' : '#16A34A';
  };

  const getBarWidth = (metric: QualityMetric) => {
    const min = metric.min ?? 0;
    const range = metric.max - min;
    const normalized = ((metric.value - min) / range) * 100;
    return Math.max(0, Math.min(100, normalized));
  };

  const hasWarnings = metrics.some(m => {
    if (!m.warningThreshold) return false;
    if (m.label.includes('노이즈')) {
      return m.value > m.warningThreshold;
    }
    return m.value < m.warningThreshold;
  });

  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b relative"
        style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}
      >
        {/* Gradient Hairline */}
        <div 
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
            opacity: 0.5,
          }}
        />
        
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
          품질 지표
        </h3>
      </div>

      {/* Body - Metrics */}
      <div className="px-6 py-5 space-y-5">
        {metrics.map((metric, idx) => {
          const barWidth = getBarWidth(metric);
          const barColor = getBarColor(metric);
          
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                  {metric.label}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  {metric.format?.(metric.value) ?? metric.value}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div 
                className="relative h-2 rounded-full overflow-hidden"
                style={{
                  background: 'rgba(17, 24, 39, 0.06)',
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  style={{
                    width: `${barWidth}%`,
                    background: barColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning */}
      {hasWarnings && (
        <div className="px-6 pb-5">
          <div className="flex items-start gap-2 p-3 rounded-lg"
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
            <p style={{ fontSize: '12px', fontWeight: 400, color: '#D97706' }}>
              노이즈가 높습니다. 해석 시 주의하세요.
            </p>
          </div>
        </div>
      )}

      {/* Footer Caption */}
      <div className="px-6 py-3 border-t"
        style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}
      >
        <p style={{ fontSize: '11px', fontWeight: 400, color: '#94A3B8' }}>
          지표는 사전 계산 결과입니다.
        </p>
      </div>
    </div>
  );
}
