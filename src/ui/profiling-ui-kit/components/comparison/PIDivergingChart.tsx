import { ContinuousComparison, BinaryComparison } from './types';

interface PIDivergingChartProps {
  data: (ContinuousComparison | BinaryComparison)[];
  maxItems?: number;
}

export function PIDivergingChart({ data, maxItems = 10 }: PIDivergingChartProps) {
  // Filter and sort by absolute difference
  const sortedData = [...data]
    .filter(item => item.type === 'continuous' || item.type === 'binary')
    .sort((a, b) => {
      // Significant items first
      if (a.significant && !b.significant) return -1;
      if (!a.significant && b.significant) return 1;
      // Then by absolute difference
      return Math.abs(b.difference) - Math.abs(a.difference);
    })
    .slice(0, maxItems);

  // Find max absolute difference for scaling
  const maxDifference = Math.max(...sortedData.map(item => Math.abs(item.difference)));

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
          클러스터 간 차이 (발산형)
        </h3>
        <p style={{ 
          fontSize: '12px', 
          fontWeight: 400, 
          color: '#64748B',
        }}>
          양수: Cluster A가 높음 / 음수: Cluster B가 높음
        </p>
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {sortedData.map((item, index) => {
          const difference = item.difference;
          const isPositive = difference >= 0;
          const width = (Math.abs(difference) / maxDifference) * 50; // Max 50% on each side
          const formatDifference = (diff: number) => 
            item.type === 'binary' 
              ? `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}%`
              : `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;

          return (
            <div key={index} className="group">
              {/* Feature Label and Values */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 500, 
                    color: '#0F172A',
                  }}>
                    {item.feature}
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
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 700, 
                    color: isPositive ? '#2563EB' : '#EF4444',
                  }}>
                    {formatDifference(difference)}
                  </span>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 500, 
                    color: '#64748B',
                  }}>
                    ({item.lift_pct >= 0 ? '+' : ''}{item.lift_pct.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Diverging Bar */}
              <div className="flex items-center h-10">
                {/* Left side (negative) */}
                <div className="flex-1 flex justify-end pr-2">
                  {!isPositive && (
                    <div 
                      className="h-8 rounded-lg transition-all duration-300 group-hover:scale-x-105 origin-right"
                      style={{
                        width: `${width}%`,
                        background: 'linear-gradient(90deg, #DC2626 0%, #EF4444 100%)',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                      }}
                    />
                  )}
                </div>

                {/* Center line */}
                <div 
                  className="w-0.5 h-10"
                  style={{
                    background: 'linear-gradient(180deg, #94A3B8 0%, #CBD5E1 100%)',
                  }}
                />

                {/* Right side (positive) */}
                <div className="flex-1 pl-2">
                  {isPositive && (
                    <div 
                      className="h-8 rounded-lg transition-all duration-300 group-hover:scale-x-105 origin-left"
                      style={{
                        width: `${width}%`,
                        background: 'linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                      }}
                    />
                  )}
                </div>
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
            color: '#94A3B8',
          }}>
            비교 데이터가 없습니다
          </p>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#EF4444' }} />
            <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748B' }}>
              Cluster B 우세
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#2563EB' }} />
            <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748B' }}>
              Cluster A 우세
            </span>
          </div>
        </div>
        {sortedData.some(item => item.significant) && (
          <p style={{ 
            fontSize: '11px', 
            fontWeight: 400, 
            color: '#64748B',
            marginTop: '8px',
          }}>
            ⭐ 통계적으로 유의한 차이 (p {'<'} 0.05)
          </p>
        )}
      </div>
    </div>
  );
}
