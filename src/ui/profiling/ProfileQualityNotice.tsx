import { Info } from 'lucide-react';
import { useDarkMode, useThemeColors } from '../../lib/DarkModeSystem';

export function ProfileQualityNotice() {
  const { isDark } = useDarkMode();
  const colors = useThemeColors();

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: isDark
          ? 'rgba(37, 99, 235, 0.15)'
          : 'rgba(37, 99, 235, 0.1)',
        border: isDark
          ? '1px solid rgba(37, 99, 235, 0.4)'
          : '1px solid rgba(37, 99, 235, 0.3)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '12px',
            background: isDark
              ? 'rgba(37, 99, 235, 0.25)'
              : 'rgba(37, 99, 235, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          <Info size={16} color="#2563EB" />
        </div>
        <div className="flex-1">
          <h4
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: colors.text.primary,
              marginBottom: '6px',
            }}
          >
            참고
          </h4>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: colors.text.secondary,
              lineHeight: '1.5',
            }}
          >
            이 프로파일은 클러스터링이 불가능한 소규모 샘플에 대한 요약 통계입니다.
            더 정확한 분석을 원하시면 검색 조건을 완화하여 더 많은 패널을 포함해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

