import { AlertTriangle } from 'lucide-react';
import { useDarkMode, useThemeColors } from '../../lib/DarkModeSystem';

interface ProfileBannerProps {
  sampleSize: number;
  minRequired?: number;
}

export function ProfileBanner({ sampleSize, minRequired = 100 }: ProfileBannerProps) {
  const { isDark } = useDarkMode();
  const colors = useThemeColors();

  return (
    <div
      className="rounded-2xl p-4 mb-6"
      style={{
        background: isDark 
          ? 'rgba(251, 191, 36, 0.15)' 
          : 'rgba(251, 191, 36, 0.1)',
        border: isDark
          ? '1px solid rgba(251, 191, 36, 0.4)'
          : '1px solid rgba(251, 191, 36, 0.3)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '12px',
            background: isDark
              ? 'rgba(251, 191, 36, 0.25)'
              : 'rgba(251, 191, 36, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          <AlertTriangle size={16} color="#F59E0B" />
        </div>
        <div className="flex-1">
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.text.primary,
              marginBottom: '4px',
            }}
          >
            프로파일링 모드
          </h3>
          <p
            style={{
              fontSize: '13px',
              fontWeight: 400,
              color: colors.text.secondary,
              lineHeight: '1.5',
              marginBottom: '8px',
            }}
          >
            샘플 수가 부족하여 클러스터링 대신 전체 그룹의 통계 정보를 제공합니다.
          </p>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: colors.text.tertiary,
            }}
          >
            현재 샘플: <strong style={{ color: colors.text.primary }}>{sampleSize}개</strong> (클러스터링 최소 요구: {minRequired}개)
          </div>
        </div>
      </div>
    </div>
  );
}

