import { PIBadge } from './PIBadge';
import { PIHashtag, getHashtagColor } from './PIHashtag';
import { useDarkMode, useThemeColors } from '../../lib/DarkModeSystem';

interface PIClusterProfileCardProps {
  id: string;
  color: string;
  name: string;
  description: string;
  tags: string[];
  snippets: string[];
  size?: number;
  silhouette?: number;
}

export function PIClusterProfileCard({
  id,
  color,
  name,
  description,
  tags,
  snippets,
  size,
  silhouette,
}: PIClusterProfileCardProps) {
  const { isDark } = useDarkMode();
  const colors = useThemeColors();
  
  return (
    <div
      className="flex flex-col rounded-2xl h-full"
      style={{
        background: isDark 
          ? 'rgba(30, 41, 59, 0.8)' 
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
      {/* Header */}
      <div className="px-5 py-4 border-b relative"
        style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(17, 24, 39, 0.08)' }}
      >
        <div 
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: `linear-gradient(90deg, ${color}40 0%, ${color}80 50%, ${color}40 100%)`,
            opacity: 0.6,
          }}
        />
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            <PIBadge kind="cluster">{id}</PIBadge>
            {size && (
              <span style={{ fontSize: '12px', fontWeight: 500, color: colors.text.secondary }}>
                {size}명
              </span>
            )}
          </div>
          
          {/* Silhouette Score */}
          {silhouette !== undefined && silhouette !== null && !isNaN(silhouette) && (
            <div className="flex items-center gap-1.5">
              <div className="text-right">
                <div className="text-xs text-[var(--neutral-500)]">실루엣</div>
                <div className="text-sm font-bold text-[var(--primary-500)]">
                  {silhouette.toFixed(3)}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                silhouette >= 0.7 ? 'bg-green-500' :
                silhouette >= 0.5 ? 'bg-yellow-500' :
                'bg-red-500'
              }`} />
            </div>
          )}
        </div>
        
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.text.primary, marginBottom: '4px' }}>
          {name}
        </h3>
        <p style={{ fontSize: '12px', fontWeight: 400, color: colors.text.secondary, lineHeight: '1.4' }}>
          {description}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 space-y-4">
        {/* Tags */}
        <div>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            color: isDark ? colors.text.primary : colors.text.secondary, 
            marginBottom: '8px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em' 
          }}>
            주요 특성
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, idx) => (
              <PIHashtag key={idx} color={getHashtagColor(tag)}>
                {tag}
              </PIHashtag>
            ))}
          </div>
        </div>

        {/* Snippets */}
        <div>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            color: isDark ? colors.text.primary : colors.text.secondary, 
            marginBottom: '8px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em' 
          }}>
            대표 인사이트
          </div>
          <div className="space-y-2">
            {snippets.slice(0, 3).map((snippet, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg"
                style={{
                  background: isDark 
                    ? 'rgba(30, 41, 59, 0.5)' 
                    : 'rgba(241, 245, 249, 0.6)',
                  border: isDark
                    ? '1px solid rgba(255, 255, 255, 0.05)'
                    : '1px solid rgba(17, 24, 39, 0.06)',
                }}
              >
                <p style={{ 
                  fontSize: '11px', 
                  fontWeight: 400, 
                  color: isDark ? colors.text.primary : colors.text.secondary, 
                  lineHeight: '1.4' 
                }}>
                  - {snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
