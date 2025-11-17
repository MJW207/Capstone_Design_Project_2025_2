import { ClusterGroup } from './types';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface PIComparisonHeaderProps {
  groupA: ClusterGroup;
  groupB: ClusterGroup;
}

export function PIComparisonHeader({ groupA, groupB }: PIComparisonHeaderProps) {
  const { isDark } = useDarkMode();
  
  return (
    <div
      className="flex items-center justify-between p-6 rounded-2xl relative overflow-hidden"
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

      {/* Title */}
      <div>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 700, 
          color: isDark ? '#F9FAFB' : '#0F172A',
          marginBottom: '6px',
        }}>
          클러스터 비교 분석
        </h2>
        <p style={{ 
          fontSize: '13px', 
          fontWeight: 400, 
          color: isDark ? '#D1D5DB' : '#64748B',
        }}>
          두 클러스터 간 주요 차이점을 분석합니다
        </p>
      </div>

      {/* Cluster Badges */}
      <div className="flex items-center gap-4">
        {/* Group A */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl" style={{
          background: 'rgba(37, 99, 235, 0.1)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
        }}>
          <div className="w-4 h-4 rounded" style={{ background: '#2563EB' }} />
          <div>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 500, 
              color: isDark ? '#D1D5DB' : '#64748B',
              marginBottom: '2px',
            }}>
              {groupA.label || `Cluster ${groupA.id}`}
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              color: '#2563EB',
            }}>
              {groupA.count}명 ({groupA.percentage.toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* VS */}
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 600, 
          color: isDark ? '#9CA3AF' : '#94A3B8',
        }}>
          VS
        </div>

        {/* Group B */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl" style={{
          background: 'rgba(22, 163, 74, 0.1)',
          border: '1px solid rgba(22, 163, 74, 0.2)',
        }}>
          <div className="w-4 h-4 rounded" style={{ background: '#16A34A' }} />
          <div>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 500, 
              color: isDark ? '#D1D5DB' : '#64748B',
              marginBottom: '2px',
            }}>
              {groupB.label || `Cluster ${groupB.id}`}
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              color: '#16A34A',
            }}>
              {groupB.count}명 ({groupB.percentage.toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
