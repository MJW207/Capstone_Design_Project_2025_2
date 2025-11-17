import { RefreshCw, AlertCircle } from 'lucide-react';
import { PIBadge } from './PIBadge';
import { PIButton } from './PIButton';

export type ModelStatus = 'synced' | 'outdated' | 'loading' | 'error';
export type UserRole = 'viewer' | 'admin';

interface PIModelStatusCardProps {
  status: ModelStatus;
  userRole?: UserRole;
  modelVersion?: string;
  quickpollCount?: number;
  panelCount?: number;
  clusterCount?: number;
  silhouette?: number;
  lastUpdated?: string;
  onRefresh?: () => void;
  onRequestRetrain?: () => void;
  onViewHistory?: () => void;
}

const statusConfig = {
  synced: {
    label: '동기화됨',
    variant: 'success' as const,
    description: '사전 계산된 결과가 적용되었습니다.',
  },
  outdated: {
    label: '업데이트 필요',
    variant: 'warning' as const,
    description: '새 응답이 많아 모델이 오래되었습니다.',
  },
  loading: {
    label: '학습 중',
    variant: 'info' as const,
    description: '모델을 학습하고 있습니다...',
  },
  error: {
    label: '오류',
    variant: 'error' as const,
    description: '모델 로드 중 오류가 발생했습니다.',
  },
};

export function PIModelStatusCard({
  status,
  userRole = 'viewer',
  modelVersion = 'v2025-10-13 14:30',
  quickpollCount = 8863,
  panelCount = 19000,
  clusterCount = 5,
  silhouette = 0.62,
  lastUpdated = '2시간 전',
  onRefresh,
  onRequestRetrain,
  onViewHistory,
}: PIModelStatusCardProps) {
  const config = statusConfig[status];

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
      <div className="flex items-center justify-between px-6 py-4 border-b relative"
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
          모델 상태
        </h3>
        
        <PIBadge variant={config.variant} size="sm">
          {config.label}
        </PIBadge>
      </div>

      {/* Body - Two Column Grid */}
      <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4">
        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>
            모델 버전
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
            {modelVersion}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>
            학습 데이터
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
            Welcome 1,2 조인 {panelCount.toLocaleString()}명
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>
            군집 수
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
            {clusterCount}개
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>
            Silhouette (원공간)
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: silhouette < 0.05 ? '#EF4444' : '#0F172A' }}>
            {silhouette.toFixed(2)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>
            최신 반영
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
            {lastUpdated}
          </div>
        </div>
      </div>

      {/* Description */}
      {status !== 'synced' && (
        <div className="px-6 pb-4">
          <div className="flex items-start gap-2 p-3 rounded-lg"
            style={{
              background: status === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${status === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" 
              style={{ color: status === 'error' ? '#EF4444' : '#F59E0B' }} 
            />
            <p style={{ fontSize: '12px', fontWeight: 400, color: status === 'error' ? '#DC2626' : '#D97706' }}>
              {config.description}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t flex items-center gap-2"
        style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}
      >
        {userRole === 'viewer' ? (
          <>
            <PIButton variant="ghost" size="sm" onClick={onRefresh} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-1" />
              새로고침
            </PIButton>
          </>
        ) : (
          <>
            <PIButton variant="primary" size="sm" onClick={onRequestRetrain}>
              재학습 요청
            </PIButton>
            <PIButton variant="secondary" size="sm" onClick={onViewHistory}>
              이전 버전 보기
            </PIButton>
          </>
        )}
      </div>
    </div>
  );
}
