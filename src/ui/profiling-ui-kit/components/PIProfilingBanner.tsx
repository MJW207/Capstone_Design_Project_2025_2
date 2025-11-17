import { AlertTriangle } from 'lucide-react';

interface PIProfilingBannerProps {
  sampleCount: number;
  minimumRequired?: number;
  variant?: 'warning' | 'info';
}

export function PIProfilingBanner({ 
  sampleCount, 
  minimumRequired = 100,
  variant = 'warning',
}: PIProfilingBannerProps) {
  const isWarning = variant === 'warning';
  
  return (
    <div
      className="flex items-start gap-4 p-5 rounded-2xl relative overflow-hidden"
      style={{
        background: isWarning 
          ? 'rgba(251, 191, 36, 0.1)' 
          : 'rgba(37, 99, 235, 0.1)',
        border: isWarning 
          ? '1px solid rgba(251, 191, 36, 0.3)' 
          : '1px solid rgba(37, 99, 235, 0.3)',
        boxShadow: isWarning
          ? '0 2px 8px rgba(251, 191, 36, 0.08)'
          : '0 2px 8px rgba(37, 99, 235, 0.08)',
      }}
    >
      {/* Gradient Accent Line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: isWarning
            ? 'linear-gradient(90deg, #F59E0B 0%, #FCD34D 100%)'
            : 'linear-gradient(90deg, #2563EB 0%, #7C3AED 100%)',
        }}
      />

      {/* Icon */}
      <div 
        className="p-2.5 rounded-xl flex-shrink-0"
        style={{
          background: isWarning 
            ? 'rgba(245, 158, 11, 0.15)' 
            : 'rgba(37, 99, 235, 0.15)',
        }}
      >
        <AlertTriangle 
          className="w-5 h-5" 
          style={{ color: isWarning ? '#F59E0B' : '#2563EB' }} 
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: isWarning ? '#92400E' : '#1E40AF',
          }}>
            프로파일링 모드
          </h3>
        </div>
        
        <p style={{ 
          fontSize: '13px', 
          fontWeight: 400, 
          color: isWarning ? '#78350F' : '#1E3A8A',
          lineHeight: '1.6', 
          marginBottom: '12px',
        }}>
          샘플 수가 부족하여 클러스터링 대신 전체 그룹의 통계 정보를 제공합니다.
        </p>
        
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 500, 
              color: isWarning ? '#A16207' : '#3730A3',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              현재 샘플
            </span>
            <div className="flex items-baseline gap-1">
              <span style={{ 
                fontSize: '20px', 
                fontWeight: 700, 
                color: isWarning ? '#B45309' : '#4338CA',
              }}>
                {sampleCount}
              </span>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 500, 
                color: isWarning ? '#92400E' : '#3730A3',
              }}>
                개
              </span>
            </div>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 500, 
              color: isWarning ? '#A16207' : '#3730A3',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              클러스터링 최소 요구
            </span>
            <div className="flex items-baseline gap-1">
              <span style={{ 
                fontSize: '20px', 
                fontWeight: 700, 
                color: isWarning ? '#92400E' : '#4338CA',
              }}>
                {minimumRequired}
              </span>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 500, 
                color: isWarning ? '#92400E' : '#3730A3',
              }}>
                개
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
