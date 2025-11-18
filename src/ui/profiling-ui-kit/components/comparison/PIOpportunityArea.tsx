import { Target, TrendingUp } from 'lucide-react';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface OpportunityItem {
  title: string;
  intentionLabel: string;
  actionLabel: string;
  gapPct: number;
  direction: 'positive' | 'negative';
  description: string;
}

interface PIOpportunityAreaProps {
  opportunities: OpportunityItem[];
  clusterALabel: string;
  clusterBLabel: string;
  maxItems?: number;
}

export function PIOpportunityArea({ 
  opportunities, 
  clusterALabel, 
  clusterBLabel,
  maxItems = 5 
}: PIOpportunityAreaProps) {
  const { isDark } = useDarkMode();
  
  // 갭이 큰 순서로 정렬하고 상위 N개만 표시
  const sortedOpportunities = [...opportunities]
    .sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct))
    .slice(0, maxItems);

  return (
    <div
      className="flex flex-col p-6 rounded-2xl relative"
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(34, 197, 94, 0.15) 100%)'
          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(34, 197, 94, 0.05) 100%)',
        border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(16, 185, 129, 0.2)',
      }}
    >
      {/* Gradient Top Line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, #10B981 0%, #22C55E 100%)',
          opacity: 0.5,
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div 
          className="p-2.5 rounded-xl"
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
          }}
        >
          <Target className="w-5 h-5" style={{ color: '#10B981' }} />
        </div>
        <div>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: isDark ? '#F9FAFB' : '#0F172A',
            marginBottom: '2px',
          }}>
            기회 영역
          </h3>
          <p style={{ 
            fontSize: '12px', 
            fontWeight: 400, 
            color: isDark ? '#D1D5DB' : '#64748B',
          }}>
            의향 - 사용 갭 분석
          </p>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-3">
        {sortedOpportunities.map((item, index) => {
          const isPositive = item.gapPct >= 0;
          const absGap = Math.abs(item.gapPct);
          
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
                    ? 'linear-gradient(135deg, #10B981 0%, #22C55E 100%)'
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
                    {item.title}
                  </span>
                  <div className="flex items-center gap-1">
                    <TrendingUp 
                      className="w-4 h-4" 
                      style={{ 
                        color: isPositive ? '#10B981' : '#EF4444',
                        transform: isPositive ? 'none' : 'rotate(180deg)'
                      }} 
                    />
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: 700, 
                      color: isPositive ? '#10B981' : '#EF4444',
                    }}>
                      {isPositive ? '+' : ''}{absGap.toFixed(0)}%p
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: isDark ? '#D1D5DB' : '#64748B', lineHeight: '1.6' }}>
                  <span style={{ fontWeight: 500 }}>
                    {item.intentionLabel} - {item.actionLabel}
                  </span>
                </div>

                <div style={{ 
                  fontSize: '12px', 
                  color: isDark ? '#9CA3AF' : '#94A3B8', 
                  marginTop: '4px',
                  lineHeight: '1.5'
                }}>
                  {clusterALabel}이(가) {clusterBLabel}보다 {absGap.toFixed(0)}%p 높은 전환율
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sortedOpportunities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Target className="w-12 h-12 mb-3" style={{ color: '#94A3B8' }} />
          <p style={{ 
            fontSize: '13px', 
            fontWeight: 400, 
            color: isDark ? '#9CA3AF' : '#94A3B8',
          }}>
            기회 영역 데이터가 없습니다
          </p>
        </div>
      )}
    </div>
  );
}





