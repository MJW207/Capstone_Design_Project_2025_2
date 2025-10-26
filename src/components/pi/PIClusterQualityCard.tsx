import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { PIBadge } from './PIBadge';

interface ClusterInfo {
  id: string;
  name: string;
  size: number;
  color: string;
}

interface PIClusterQualityCardProps {
  clusters?: ClusterInfo[];
  avgSilhouette?: number;
  noiseCount?: number;
  totalCount?: number;
}

const defaultClusters: ClusterInfo[] = [
  { id: 'C1', name: '디지털 얼리어답터', size: 542, color: '#2563EB' },
  { id: 'C2', name: '뷰티 케어 중심', size: 398, color: '#16A34A' },
  { id: 'C3', name: '라이프스타일 탐험가', size: 467, color: '#F59E0B' },
  { id: 'C4', name: '실속파 소비자', size: 321, color: '#EF4444' },
  { id: 'C5', name: '프리미엄 추구', size: 230, color: '#8B5CF6' },
];

export function PIClusterQualityCard({
  clusters = defaultClusters,
  avgSilhouette = 0.62,
  noiseCount = 182,
  totalCount = 2140,
}: PIClusterQualityCardProps) {
  const noiseRatio = (noiseCount / totalCount) * 100;
  const hasWarning = avgSilhouette < 0.5 || noiseRatio > 15;

  return (
    <div
      className="flex flex-col rounded-2xl h-full"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b relative"
        style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}
      >
        <div 
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
            opacity: 0.5,
          }}
        />
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
          군집 품질
        </h3>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 space-y-5">
        {/* Average Silhouette */}
        <div className="p-4 rounded-xl" style={{ background: 'rgba(241, 245, 249, 0.6)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
              평균 실루엣
            </span>
            {avgSilhouette >= 0.7 ? (
              <CheckCircle2 className="w-4 h-4" style={{ color: '#16A34A' }} />
            ) : avgSilhouette >= 0.5 ? (
              <Info className="w-4 h-4" style={{ color: '#2563EB' }} />
            ) : (
              <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
            )}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
            {avgSilhouette.toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 400, color: '#64748B' }}>
            {avgSilhouette >= 0.7 ? '우수' : avgSilhouette >= 0.5 ? '양호' : '주의 필요'}
          </div>
        </div>

        {/* Cluster Sizes */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            군집별 크기
          </div>
          <div className="space-y-2">
            {clusters.map((cluster) => (
              <div key={cluster.id} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: cluster.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#0F172A' }}>
                      {cluster.id}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                      {cluster.size}명
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(17, 24, 39, 0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(cluster.size / totalCount) * 100}%`,
                        background: cluster.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Noise Info */}
        <div className="p-4 rounded-xl" style={{ 
          background: noiseRatio > 15 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(241, 245, 249, 0.6)',
          border: noiseRatio > 15 ? '1px solid rgba(245, 158, 11, 0.2)' : 'none'
        }}>
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
              노이즈
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              {noiseCount}명 ({noiseRatio.toFixed(1)}%)
            </span>
          </div>
          {noiseRatio > 15 && (
            <p style={{ fontSize: '11px', fontWeight: 400, color: '#D97706', marginTop: '4px' }}>
              노이즈 비율이 높습니다
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      {hasWarning && (
        <div className="px-5 py-3 border-t" style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
            <p style={{ fontSize: '11px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
              일부 지표가 낮습니다. 결과 해석에 주의하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
