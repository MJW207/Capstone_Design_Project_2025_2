import { PIBadge } from './PIBadge';
import { PIHashtag, getHashtagColor } from './PIHashtag';
import { PIButton } from './PIButton';
import { Save } from 'lucide-react';

interface PIClusterProfileCardProps {
  id: string;
  color: string;
  name: string;
  description: string;
  tags: string[];
  snippets: string[];
  size?: number;
  onSave?: () => void;
}

export function PIClusterProfileCard({
  id,
  color,
  name,
  description,
  tags,
  snippets,
  size,
  onSave,
}: PIClusterProfileCardProps) {
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
            background: `linear-gradient(90deg, ${color}40 0%, ${color}80 50%, ${color}40 100%)`,
            opacity: 0.6,
          }}
        />
        
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <PIBadge kind="cluster">{id}</PIBadge>
          {size && (
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
              {size}명
            </span>
          )}
        </div>
        
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
          {name}
        </h3>
        <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
          {description}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 space-y-4">
        {/* Tags */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            대표 인사이트
          </div>
          <div className="space-y-2">
            {snippets.slice(0, 3).map((snippet, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg"
                style={{
                  background: 'rgba(241, 245, 249, 0.6)',
                  border: '1px solid rgba(17, 24, 39, 0.06)',
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: 400, color: '#475569', lineHeight: '1.4' }}>
                  - {snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t" style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}>
        <PIButton variant="ghost" size="small" onClick={onSave} className="w-full">
          <Save className="w-3 h-3 mr-1" />
          라벨 저장
        </PIButton>
      </div>
    </div>
  );
}
