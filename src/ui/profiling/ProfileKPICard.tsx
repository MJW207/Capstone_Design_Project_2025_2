import { LucideIcon } from 'lucide-react';
import { useThemeColors } from '../../lib/DarkModeSystem';

interface ProfileKPICardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  iconColor?: string;
}

export function ProfileKPICard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconColor = '#2563EB',
}: ProfileKPICardProps) {
  const { isDark } = useDarkMode();
  const colors = useThemeColors();

  return (
    <div
      className="rounded-2xl p-4 flex flex-col"
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
      <div className="flex items-center gap-3 mb-3">
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: isDark
              ? `${iconColor}20`
              : `${iconColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={iconColor} />
        </div>
        <div className="flex-1">
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: colors.text.tertiary,
              marginBottom: '2px',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: colors.text.primary,
            }}
          >
            {value}
          </div>
        </div>
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: '11px',
            fontWeight: 400,
            color: colors.text.tertiary,
            marginTop: '4px',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

