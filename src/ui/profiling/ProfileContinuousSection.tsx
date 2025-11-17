import { useDarkMode, useThemeColors } from '../../lib/DarkModeSystem';

interface ProfileContinuousSectionProps {
  title: string;
  mean: number;
  std?: number;
  min?: number;
  max?: number;
  unit?: string;
}

export function ProfileContinuousSection({
  title,
  mean,
  std,
  min,
  max,
  unit = '',
}: ProfileContinuousSectionProps) {
  const { isDark } = useDarkMode();
  const colors = useThemeColors();

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: isDark
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: isDark
          ? '1px solid rgba(255, 255, 255, 0.1)'
          : '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: isDark
          ? '0 6px 16px rgba(0, 0, 0, 0.3)'
          : '0 6px 16px rgba(0, 0, 0, 0.08)',
      }}
    >
      <h3
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: colors.text.primary,
          marginBottom: '16px',
        }}
      >
        {title}
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: colors.text.tertiary,
            }}
          >
            평균
          </span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: colors.text.primary,
            }}
          >
            {mean.toFixed(1)}{unit}
          </span>
        </div>
        {std !== undefined && (
          <div className="flex items-center justify-between">
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: colors.text.tertiary,
              }}
            >
              표준편차
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: colors.text.secondary,
              }}
            >
              ±{std.toFixed(1)}{unit}
            </span>
          </div>
        )}
        {min !== undefined && max !== undefined && (
          <div className="flex items-center justify-between">
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: colors.text.tertiary,
              }}
            >
              범위
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: colors.text.secondary,
              }}
            >
              {min.toFixed(1)}{unit} ~ {max.toFixed(1)}{unit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

