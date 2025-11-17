import { TrendingUp, BarChart3, ArrowRight } from 'lucide-react';
import { PIButton } from '../../ui/pi/PIButton';

interface ComparePageEmptyStateProps {
  onNavigateToClusterLab?: () => void;
}

export function ComparePageEmptyState({ onNavigateToClusterLab }: ComparePageEmptyStateProps) {
  const handleGoToClusterLab = () => {
    if (onNavigateToClusterLab) {
      onNavigateToClusterLab();
    } else {
      // 기본 동작: 현재 페이지에서 클러스터 분석 탭으로 이동
      // 실제 라우팅이 필요한 경우 window.location 또는 라우터 사용
      window.location.hash = '#cluster-lab';
      // 또는 탭 전환 로직이 있다면 해당 함수 호출
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-12">
      <div
        className="flex flex-col items-center max-w-2xl w-full p-12 rounded-2xl relative overflow-hidden"
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

        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
          }}
        >
          <BarChart3 className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#0F172A',
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          비교 분석을 시작하려면
          <br />
          먼저 군집 분석을 진행해주세요
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#64748B',
            textAlign: 'center',
            lineHeight: '1.6',
            marginBottom: '32px',
          }}
        >
          군집 분석을 통해 패널을 그룹화한 후,
          <br />
          각 군집 간의 특성을 비교할 수 있습니다.
        </p>

        {/* Steps */}
        <div className="w-full space-y-4 mb-8">
          <div className="flex items-start gap-4 p-4 rounded-xl"
            style={{
              background: 'rgba(37, 99, 235, 0.05)',
              border: '1px solid rgba(37, 99, 235, 0.1)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              1
            </div>
            <div className="flex-1">
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                군집 분석 실행
              </h3>
              <p style={{ fontSize: '13px', fontWeight: 400, color: '#64748B', lineHeight: '1.5' }}>
                군집 분석 탭에서 패널 데이터를 클러스터링하여 그룹을 생성합니다.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl"
            style={{
              background: 'rgba(124, 58, 237, 0.05)',
              border: '1px solid rgba(124, 58, 237, 0.1)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              2
            </div>
            <div className="flex-1">
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                군집 결과 확인
              </h3>
              <p style={{ fontSize: '13px', fontWeight: 400, color: '#64748B', lineHeight: '1.5' }}>
                생성된 군집의 프로파일과 특성을 확인하고 분석합니다.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl"
            style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.1)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              3
            </div>
            <div className="flex-1">
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                비교 분석 시작
              </h3>
              <p style={{ fontSize: '13px', fontWeight: 400, color: '#64748B', lineHeight: '1.5' }}>
                두 군집을 선택하여 레이더 차트, 박스 플롯 등으로 상세 비교합니다.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <PIButton
          onClick={handleGoToClusterLab}
          variant="primary"
          size="large"
          className="w-full max-w-sm"
        >
          <TrendingUp className="w-5 h-5 mr-2" />
          군집 분석으로 이동
          <ArrowRight className="w-5 h-5 ml-2" />
        </PIButton>

        {/* Footer Note */}
        <p
          style={{
            fontSize: '12px',
            fontWeight: 400,
            color: '#94A3B8',
            textAlign: 'center',
            marginTop: '24px',
          }}
        >
          이미 군집 분석을 완료했다면 페이지를 새로고침해주세요
        </p>
      </div>
    </div>
  );
}

