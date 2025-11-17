import { SearchX } from 'lucide-react';

export function PIProfilingEmptyState() {
  return (
    <div 
      className="flex flex-col items-center justify-center py-24 px-6 rounded-2xl"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Icon */}
      <div 
        className="p-8 rounded-2xl mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(203, 213, 225, 0.15) 100%)',
        }}
      >
        <SearchX className="w-16 h-16" style={{ color: '#94A3B8' }} />
      </div>

      {/* Title */}
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: 600, 
        color: '#0F172A', 
        marginBottom: '12px',
      }}>
        검색 결과가 없습니다
      </h3>

      {/* Description */}
      <p style={{ 
        fontSize: '14px', 
        fontWeight: 400, 
        color: '#64748B', 
        textAlign: 'center', 
        maxWidth: '420px', 
        lineHeight: '1.6',
      }}>
        검색을 수행하여 패널을 찾아주세요.<br />
        필터 조건을 완화하면 더 많은 결과를 확인할 수 있습니다.
      </p>
    </div>
  );
}
