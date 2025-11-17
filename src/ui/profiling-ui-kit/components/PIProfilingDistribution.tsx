import { DistributionItem } from '../types';

interface PIProfilingDistributionProps {
  title: string;
  data: DistributionItem[];
  totalCount: number;
  showPercentage?: boolean;
}

export function PIProfilingDistribution({ 
  title, 
  data,
  totalCount,
  showPercentage = true
}: PIProfilingDistributionProps) {
  const colors = [
    '#2563EB', // Blue
    '#7C3AED', // Purple
    '#DB2777', // Pink
    '#DC2626', // Red
    '#EA580C', // Orange
    '#F59E0B', // Amber
    '#16A34A', // Green
    '#0891B2', // Cyan
    '#8B5CF6', // Violet
    '#059669', // Emerald
  ];

  // Calculate percentages
  const itemsWithPercentage = data.map((item, index) => ({
    ...item,
    percentage: totalCount > 0 ? (item.value / totalCount) * 100 : 0,
    color: colors[index % colors.length],
  }));

  // Sort by value descending
  const sortedItems = [...itemsWithPercentage].sort((a, b) => b.value - a.value);

  return (
    <div
      className="flex flex-col p-6 rounded-2xl relative transition-all duration-300 hover:shadow-xl"
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
          {title}
        </h3>
        <p style={{ 
          fontSize: '12px', 
          fontWeight: 500, 
          color: '#64748B',
        }}>
          총 {totalCount.toLocaleString()}개 샘플
        </p>
      </div>

      {/* Distribution Bars */}
      <div className="space-y-4">
        {sortedItems.map((item, index) => (
          <div key={index} className="group">
            {/* Label and Value */}
            <div className="flex items-center justify-between mb-2">
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 500, 
                color: '#0F172A',
              }}>
                {item.label}
              </span>
              <div className="flex items-center gap-3">
                {showPercentage && (
                  <span 
                    style={{ 
                      fontSize: '14px', 
                      fontWeight: 700, 
                      color: item.color,
                      minWidth: '56px',
                      textAlign: 'right',
                    }}
                  >
                    {item.percentage.toFixed(1)}%
                  </span>
                )}
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 500, 
                  color: '#64748B',
                }}>
                  (n={item.value.toLocaleString()})
                </span>
              </div>
            </div>
            
            {/* Progress Bar with Gradient */}
            <div 
              className="h-3 rounded-full overflow-hidden"
              style={{
                background: 'rgba(226, 232, 240, 0.6)',
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 group-hover:scale-x-105 origin-left"
                style={{
                  width: `${item.percentage}%`,
                  background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}DD 100%)`,
                  boxShadow: `0 2px 8px ${item.color}40`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedItems.length === 0 && (
        <div className="text-center py-12">
          <p style={{ 
            fontSize: '13px', 
            fontWeight: 400, 
            color: '#94A3B8',
          }}>
            분포 데이터가 없습니다
          </p>
        </div>
      )}
    </div>
  );
}