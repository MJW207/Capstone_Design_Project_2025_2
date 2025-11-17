import { useThemeColors } from '../../lib/DarkModeSystem';

interface DistributionData {
  [key: string]: number;
}

interface ProfileCategoricalSectionProps {
  title: string;
  distribution: DistributionData;
  total?: number;
}

export function ProfileCategoricalSection({
  title,
  distribution,
  total,
}: ProfileCategoricalSectionProps) {
  const { isDark } = useDarkMode();
  const colors = useThemeColors();

  // 비율 계산
  const entries = Object.entries(distribution).map(([key, value]) => ({
    label: key,
    count: value,
    percentage: total ? (value / total) * 100 : 0,
  }));

  // 비율 순으로 정렬
  entries.sort((a, b) => b.percentage - a.percentage);

  const maxPercentage = Math.max(...entries.map(e => e.percentage));

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
        {entries.map((entry, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-1">
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: colors.text.secondary,
                }}
              >
                {entry.label}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: colors.text.tertiary,
                }}
              >
                {entry.percentage.toFixed(1)}% ({entry.count}명)
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(241, 245, 249, 0.8)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${entry.percentage}%`,
                  height: '100%',
                  borderRadius: '4px',
                  background: `linear-gradient(90deg, #2563EB 0%, #7C3AED 100%)`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

